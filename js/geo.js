/* GermplasmPro — la caja de herramientas del mapa, sin internet y sin
   bibliotecas: proyección, recorte, punto en polígono, rejillas y escala.

   Los contornos vienen de Natural Earth (dominio público):
     · data/mexico-states.js — las 32 entidades federativas de México, del
       conjunto admin-1 a 1:10 millones, simplificadas a 0.004°. Es el mismo
       archivo que usa BioModellingPro, para que las dos apps dibujen México
       igual.
     · data/world.js — los países del mundo, del conjunto admin-0 a 1:110
       millones, simplificados a dos decimales y sin la Antártida. El mismo de
       SciMetricsPro.

   Los anillos son listas planas [lon, lat, lon, lat, …]. México se dibuja con
   detalle estatal; el resto del mundo, con el contorno grueso que corresponde
   a la escala de 1:110 millones: sirve para situar una colecta en su país, no
   para verificar un límite municipal.

   La proyección es una equirrectangular (plate carrée) con el ancho corregido
   por el coseno de la latitud central, que es lo razonable para un mapa
   temático de un país o de una región: conserva la forma cerca de esa latitud
   y no necesita ninguna biblioteca. */

(function () {

  /* ---------- códigos de país: el pasaporte usa tres letras y el mapa dos ---------- */
  const A3_TO_A2 = {
    MEX: 'MX', GTM: 'GT', BLZ: 'BZ', HND: 'HN', SLV: 'SV', NIC: 'NI', CRI: 'CR', PAN: 'PA',
    CUB: 'CU', DOM: 'DO', HTI: 'HT', JAM: 'JM', PRI: 'PR', TTO: 'TT', COL: 'CO', VEN: 'VE',
    ECU: 'EC', PER: 'PE', BOL: 'BO', CHL: 'CL', ARG: 'AR', URY: 'UY', PRY: 'PY', BRA: 'BR',
    GUY: 'GY', SUR: 'SR', USA: 'US', CAN: 'CA', ESP: 'ES', PRT: 'PT', FRA: 'FR', ITA: 'IT',
    DEU: 'DE', NLD: 'NL', BEL: 'BE', CHE: 'CH', AUT: 'AT', GBR: 'GB', IRL: 'IE', NOR: 'NO',
    SWE: 'SE', FIN: 'FI', DNK: 'DK', POL: 'PL', CZE: 'CZ', HUN: 'HU', ROU: 'RO', BGR: 'BG',
    GRC: 'GR', TUR: 'TR', RUS: 'RU', UKR: 'UA', GEO: 'GE', ARM: 'AM', AZE: 'AZ', KAZ: 'KZ',
    UZB: 'UZ', TJK: 'TJ', IRN: 'IR', IRQ: 'IQ', SYR: 'SY', LBN: 'LB', ISR: 'IL', JOR: 'JO',
    SAU: 'SA', YEM: 'YE', EGY: 'EG', MAR: 'MA', DZA: 'DZ', TUN: 'TN', LBY: 'LY', SDN: 'SD',
    ETH: 'ET', ERI: 'ER', KEN: 'KE', UGA: 'UG', TZA: 'TZ', RWA: 'RW', BDI: 'BI', COD: 'CD',
    CMR: 'CM', NGA: 'NG', GHA: 'GH', CIV: 'CI', SEN: 'SN', MLI: 'ML', BFA: 'BF', NER: 'NE',
    TCD: 'TD', ZAF: 'ZA', ZWE: 'ZW', ZMB: 'ZM', MOZ: 'MZ', MWI: 'MW', MDG: 'MG', AGO: 'AO',
    IND: 'IN', PAK: 'PK', BGD: 'BD', NPL: 'NP', LKA: 'LK', MMR: 'MM', THA: 'TH', VNM: 'VN',
    LAO: 'LA', KHM: 'KH', MYS: 'MY', IDN: 'ID', PHL: 'PH', CHN: 'CN', JPN: 'JP', KOR: 'KR',
    PRK: 'KP', MNG: 'MN', AFG: 'AF', AUS: 'AU', NZL: 'NZ', PNG: 'PG', FJI: 'FJ',
  };
  const A2_TO_A3 = Object.fromEntries(Object.entries(A3_TO_A2).map(([a3, a2]) => [a2, a3]));

  /* ---------- las geometrías, ya normalizadas ---------- */
  /* estado: { name, code, bbox:[minLon,minLat,maxLon,maxLat], rings:[flat, …] } */
  const MX = (window.MX_STATE_GEOM && window.MX_STATE_GEOM.states ? window.MX_STATE_GEOM.states : []).map(s => ({
    name: s.n, code: s.c, bbox: s.b,
    rings: [].concat(...s.p),
  }));
  const MX_BY_CODE = Object.fromEntries(MX.map(s => [s.code, s]));

  /* país: { a2, a3, rings, bbox } */
  const WORLD = (window.WORLD_MAP || []).map(([a2, polys]) => {
    const rings = [].concat(...polys);
    return { a2, a3: A2_TO_A3[a2] || '', rings, bbox: ringsBBox(rings) };
  });
  const WORLD_BY_A2 = Object.fromEntries(WORLD.map(c => [c.a2, c]));

  function ringsBBox(rings) {
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
    for (const r of rings) {
      for (let i = 0; i < r.length; i += 2) {
        if (r[i] < x0) x0 = r[i];
        if (r[i] > x1) x1 = r[i];
        if (r[i + 1] < y0) y0 = r[i + 1];
        if (r[i + 1] > y1) y1 = r[i + 1];
      }
    }
    return [x0, y0, x1, y1];
  }

  /* ---------- punto en polígono (regla par-impar, que respeta los huecos) ---------- */
  function pointInRing(ring, lon, lat) {
    let inside = false;
    const n = ring.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = ring[2 * i], yi = ring[2 * i + 1];
      const xj = ring[2 * j], yj = ring[2 * j + 1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function pointInRings(rings, lon, lat) {
    let inside = false;
    for (const r of rings) if (pointInRing(r, lon, lat)) inside = !inside;
    return inside;
  }
  function inBBox(b, lon, lat) { return lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]; }

  /* ¿en qué entidad de México cae este punto? */
  function stateOf(lon, lat) {
    for (const s of MX) {
      if (!inBBox(s.bbox, lon, lat)) continue;
      if (pointInRings(s.rings, lon, lat)) return s;
    }
    return null;
  }
  /* ¿en qué país cae? (devuelve el registro del mapa mundial) */
  function countryOf(lon, lat) {
    for (const c of WORLD) {
      if (!inBBox(c.bbox, lon, lat)) continue;
      if (pointInRings(c.rings, lon, lat)) return c;
    }
    return null;
  }

  /* ---------- proyección ----------
     bbox en grados → pixeles del lienzo, con el ancho corregido por el coseno
     de la latitud central y el norte hacia arriba. */
  function projection(bbox, width, height, pad) {
    const p = pad == null ? 12 : pad;
    const [x0, y0, x1, y1] = bbox;
    const latMid = (y0 + y1) / 2;
    const kx = Math.max(0.15, Math.cos(latMid * Math.PI / 180));
    const spanX = Math.max(1e-6, (x1 - x0) * kx), spanY = Math.max(1e-6, y1 - y0);
    const s = Math.min((width - 2 * p) / spanX, (height - 2 * p) / spanY);
    const w = spanX * s, h = spanY * s;
    const ox = p + (width - 2 * p - w) / 2, oy = p + (height - 2 * p - h) / 2;
    const X = lon => ox + (lon - x0) * kx * s;
    const Y = lat => oy + (y1 - lat) * s;
    return {
      X, Y, scale: s, kx, bbox, width, height,
      lonOf: px => (px - ox) / (kx * s) + x0,
      latOf: py => y1 - (py - oy) / s,
      /* kilómetros por pixel en el centro del mapa */
      kmPerPx: haversine(latMid, 0, latMid, 1) / (kx * s),
    };
  }

  /* un bbox que contenga los puntos dados, con un margen relativo */
  function bboxOfPoints(pts, margin) {
    if (!pts.length) return [-118, 14, -86, 33];
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
    pts.forEach(([lon, lat]) => {
      if (lon < x0) x0 = lon; if (lon > x1) x1 = lon;
      if (lat < y0) y0 = lat; if (lat > y1) y1 = lat;
    });
    const m = margin == null ? 0.12 : margin;
    const dx = Math.max(0.4, (x1 - x0) * m), dy = Math.max(0.4, (y1 - y0) * m);
    return [
      Math.max(-180, x0 - dx), Math.max(-90, y0 - dy),
      Math.min(180, x1 + dx), Math.min(90, y1 + dy),
    ];
  }
  function unionBBox(a, b) {
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  }

  /* ---------- de anillos a una ruta SVG ----------
     Se descartan los anillos que caen del todo fuera del recuadro, que es lo
     que hace ligero el dibujo del mundo entero. */
  function ringsToPath(rings, proj, bbox) {
    const parts = [];
    for (const r of rings) {
      if (bbox) {
        const b = ringsBBox([r]);
        if (b[2] < bbox[0] || b[0] > bbox[2] || b[3] < bbox[1] || b[1] > bbox[3]) continue;
      }
      if (r.length < 6) continue;
      let d = '';
      for (let i = 0; i < r.length; i += 2) {
        const x = proj.X(r[i]).toFixed(1), y = proj.Y(r[i + 1]).toFixed(1);
        d += (i ? 'L' : 'M') + x + ' ' + y;
      }
      parts.push(d + 'Z');
    }
    return parts.join('');
  }

  /* ---------- rejilla de celdas ---------- */
  function cellKey(lon, lat, size) {
    return `${Math.floor(lon / size)}|${Math.floor(lat / size)}`;
  }
  function cellBBox(key, size) {
    const [i, j] = key.split('|').map(Number);
    return [i * size, j * size, (i + 1) * size, (j + 1) * size];
  }
  /* agrupa puntos {lon, lat, …} en celdas de `size` grados */
  function gridCount(points, size) {
    const m = new Map();
    points.forEach(p => {
      const k = cellKey(p.lon, p.lat, size);
      if (!m.has(k)) m.set(k, { key: k, n: 0, items: [] });
      const c = m.get(k);
      c.n++; c.items.push(p);
    });
    return [...m.values()];
  }

  /* ---------- barra de escala: elige una distancia redonda ---------- */
  function scaleBar(proj, maxPx) {
    const nice = [1, 2, 5, 10, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
    const maxKm = (maxPx || 120) * proj.kmPerPx;
    let km = nice[0];
    for (const v of nice) if (v <= maxKm) km = v;
    return { km, px: km / proj.kmPerPx };
  }

  /* ---------- puntos utilizables de una colección ---------- */
  function pointsOf(rows) {
    const out = [];
    rows.forEach((r, i) => {
      const lon = Number(r.DECLONGITUDE), lat = Number(r.DECLATITUDE);
      if (!isFinite(lon) || !isFinite(lat)) return;
      if (lon === 0 && lat === 0) return;
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
      out.push({ i, row: r, lon, lat });
    });
    return out;
  }

  /* cuenta accesiones por entidad de México; usa el punto y, si no hay, nada */
  function countByState(points) {
    const m = new Map();
    points.forEach(p => {
      const s = stateOf(p.lon, p.lat);
      if (!s) return;
      if (!m.has(s.code)) m.set(s.code, { code: s.code, name: s.name, n: 0, items: [] });
      const e = m.get(s.code);
      e.n++; e.items.push(p);
      p.state = s.code;
    });
    return m;
  }
  /* cuenta por país, con el código del pasaporte cuando el punto no cae en tierra */
  function countByCountry(points) {
    const m = new Map();
    points.forEach(p => {
      const c = countryOf(p.lon, p.lat);
      const a3 = c ? (c.a3 || '') : String(p.row.ORIGCTY || '').toUpperCase();
      if (!a3) return;
      if (!m.has(a3)) m.set(a3, { a3, a2: A3_TO_A2[a3] || '', n: 0, items: [] });
      const e = m.get(a3);
      e.n++; e.items.push(p);
      p.country = a3;
    });
    return m;
  }

  window.GEO = {
    A3_TO_A2, A2_TO_A3, MX, MX_BY_CODE, WORLD, WORLD_BY_A2,
    ringsBBox, pointInRing, pointInRings, inBBox, stateOf, countryOf,
    projection, bboxOfPoints, unionBBox, ringsToPath,
    cellKey, cellBBox, gridCount, scaleBar, pointsOf, countByState, countByCountry,
    MX_BBOX: [-118.5, 14.3, -86.6, 32.8],
    WORLD_BBOX: [-180, -60, 180, 84],
  };
})();
