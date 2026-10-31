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
    /* el resto de los países que dibuja data/world.js: sin ellos, un punto que caía en
       Botsuana o en Croacia se quedaba sin país y no contaba en la tabla ni en la coropleta */
    ARE: 'AE', ALB: 'AL', BIH: 'BA', BEN: 'BJ', BRN: 'BN', BHS: 'BS', BTN: 'BT', BWA: 'BW',
    BLR: 'BY', CAF: 'CF', COG: 'CG', CYP: 'CY', DJI: 'DJ', EST: 'EE', ESH: 'EH', FLK: 'FK',
    GAB: 'GA', GRL: 'GL', GMB: 'GM', GIN: 'GN', GNQ: 'GQ', GNB: 'GW', HRV: 'HR', ISL: 'IS',
    KGZ: 'KG', KWT: 'KW', LBR: 'LR', LSO: 'LS', LTU: 'LT', LUX: 'LU', LVA: 'LV', MDA: 'MD',
    MNE: 'ME', MKD: 'MK', MRT: 'MR', NAM: 'NA', NCL: 'NC', OMN: 'OM', PSE: 'PS', QAT: 'QA',
    SRB: 'RS', SLB: 'SB', SVN: 'SI', SVK: 'SK', SLE: 'SL', SOM: 'SO', SSD: 'SS', SWZ: 'SZ',
    ATF: 'TF', TGO: 'TG', TLS: 'TL', TKM: 'TM', TWN: 'TW', VUT: 'VU', XKX: 'XK',
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
  /* En esta proyección (equirrectangular corregida por la latitud central) la
     escala norte-sur es la misma en todo el mapa, pero la este-oeste sólo es
     exacta en la latitud central: a la latitud φ un pixel horizontal mide
     cos φ / cos φ0 veces lo que dice la barra. `spread` es el mayor error
     relativo dentro del encuadre y `mode` dice qué barra es honesta:
       'plain' (≤ 10 %): la barra sola, como en México o una entidad;
       'lat'   (≤ 35 %): la barra con la latitud en la que vale;
       'none'  (más, como el mundo entero): sin barra, porque cualquier
               distancia que dijera sería falsa en casi todo el mapa. */
  function scaleBar(proj, maxPx) {
    const nice = [1, 2, 5, 10, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
    const maxKm = (maxPx || 120) * proj.kmPerPx;
    let km = nice[0];
    for (const v of nice) if (v <= maxKm) km = v;
    const bb = proj.bbox || [0, 0, 0, 0];
    const lat = (bb[1] + bb[3]) / 2;
    const cos = l => Math.cos(clampLat(l) * Math.PI / 180);
    const c0 = Math.max(1e-6, cos(lat));
    const lats = [bb[1], bb[3]];
    if (bb[1] < 0 && bb[3] > 0) lats.push(0);
    const spread = Math.max(...lats.map(l => Math.abs(cos(l) - c0) / c0));
    const mode = spread <= 0.10 ? 'plain' : (spread <= 0.35 ? 'lat' : 'none');
    return { km, px: km / proj.kmPerPx, lat, spread, mode };
  }
  function clampLat(l) { return Math.max(-89.9, Math.min(89.9, l)); }
  /* el texto de la barra: «500 km», «500 km a 40° N» o, sin barra, el aviso */
  function scaleLabel(sb, t) {
    const T2 = t || ((es) => es);
    const deg = Math.round(Math.abs(sb.lat));
    const hemi = deg === 0 ? '' : (sb.lat > 0 ? ' N' : ' S');
    if (sb.mode === 'lat') return T2(`${fmtInt(sb.km)} km a ${deg}°${hemi}`, `${fmtInt(sb.km)} km at ${deg}°${hemi}`);
    if (sb.mode === 'none') return T2('Sin barra de escala: varía con la latitud', 'No scale bar: it varies with latitude');
    return T2(`${fmtInt(sb.km)} km`, `${fmtInt(sb.km)} km`);
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
      /* un país del mapa sin equivalencia de tres letras cuenta con su código de dos, no se pierde */
      const a3 = c ? (c.a3 || c.a2) : String(p.row.ORIGCTY || '').toUpperCase();
      if (!a3) return;
      if (!m.has(a3)) m.set(a3, { a3, a2: A3_TO_A2[a3] || '', n: 0, items: [] });
      const e = m.get(a3);
      e.n++; e.items.push(p);
      p.country = a3;
    });
    return m;
  }

  /* ---------- la altitud del pasaporte ----------
     Un campo vacío no es «0 m»: Number('') da 0 y pintaba la accesión al nivel
     del mar. Y una altitud fuera de lo posible en tierra (25 000 m es un error
     de captura) no debe estirar ninguna escala. */
  const ELEV_MIN = -500, ELEV_MAX = 7000;
  function elevOf(row) {
    const s = String(row && row.ELEVATION != null ? row.ELEVATION : '').trim();
    if (!s) return NaN;
    const v = Number(s.replace(',', '.'));
    return isFinite(v) ? v : NaN;
  }
  function elevPlausible(v) { return isFinite(v) && v >= ELEV_MIN && v <= ELEV_MAX; }

  /* ---------- dónde poner el nombre de un polígono ----------
     El centro de la caja envolvente puede caer en el mar (Colima, con sus islas
     Revillagigedo, o cualquier entidad en forma de media luna). Se usa el polo de
     inaccesibilidad del anillo más grande: el punto interior más alejado de la
     orilla (el algoritmo de celdas de Mapbox «polylabel», escrito de nuevo). */
  function ringArea(r) {
    let a = 0;
    for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) a += (r[2 * j] - r[2 * i]) * (r[2 * j + 1] + r[2 * i + 1]);
    return Math.abs(a / 2);
  }
  function distToRing(r, x, y) {
    let best = Infinity;
    for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
      const ax = r[2 * j], ay = r[2 * j + 1], bx = r[2 * i], by = r[2 * i + 1];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = L ? clamp01(((x - ax) * dx + (y - ay) * dy) / L) : 0;
      const ex = ax + t * dx - x, ey = ay + t * dy - y;
      const d = ex * ex + ey * ey;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  function clamp01(t) { return t < 0 ? 0 : (t > 1 ? 1 : t); }
  function labelPoint(rings, precision) {
    if (!rings || !rings.length) return null;
    let big = rings[0], aBig = -1;
    for (const r of rings) { const a = ringArea(r); if (a > aBig) { aBig = a; big = r; } }
    const [x0, y0, x1, y1] = ringsBBox([big]);
    const size = Math.min(x1 - x0, y1 - y0);
    const prec = precision || Math.max(1e-4, size / 200);
    if (!(size > 0)) return [(x0 + x1) / 2, (y0 + y1) / 2];
    const cell = (x, y, h) => {
      const d = (pointInRing(big, x, y) ? 1 : -1) * distToRing(big, x, y);
      return { x, y, h, d, max: d + h * Math.SQRT2 };
    };
    const queue = [];
    for (let x = x0; x < x1; x += size) for (let y = y0; y < y1; y += size) queue.push(cell(x + size / 2, y + size / 2, size / 2));
    /* primera apuesta: el centroide del anillo, que casi siempre es bueno */
    let A = 0, cx = 0, cy = 0;
    for (let i = 0, n = big.length / 2, j = n - 1; i < n; j = i++) {
      const f = big[2 * i] * big[2 * j + 1] - big[2 * j] * big[2 * i + 1];
      cx += (big[2 * i] + big[2 * j]) * f; cy += (big[2 * i + 1] + big[2 * j + 1]) * f; A += f * 3;
    }
    let best = A ? cell(cx / A, cy / A, 0) : cell((x0 + x1) / 2, (y0 + y1) / 2, 0);
    const mid = cell((x0 + x1) / 2, (y0 + y1) / 2, 0);
    if (mid.d > best.d) best = mid;
    let guard = 0;
    while (queue.length && guard++ < 4000) {
      /* la celda más prometedora primero */
      let k = 0;
      for (let i = 1; i < queue.length; i++) if (queue[i].max > queue[k].max) k = i;
      const c = queue.splice(k, 1)[0];
      if (c.d > best.d) best = c;
      if (c.max - best.d <= prec) continue;
      const h = c.h / 2;
      queue.push(cell(c.x - h, c.y - h, h), cell(c.x + h, c.y - h, h), cell(c.x - h, c.y + h, h), cell(c.x + h, c.y + h, h));
    }
    return [best.x, best.y];
  }

  window.GEO = {
    A3_TO_A2, A2_TO_A3, MX, MX_BY_CODE, WORLD, WORLD_BY_A2,
    ringsBBox, pointInRing, pointInRings, inBBox, stateOf, countryOf,
    projection, bboxOfPoints, unionBBox, ringsToPath,
    cellKey, cellBBox, gridCount, scaleBar, scaleLabel, pointsOf, countByState, countByCountry,
    ELEV_MIN, ELEV_MAX, elevOf, elevPlausible, ringArea, labelPoint,
    MX_BBOX: [-118.5, 14.3, -86.6, 32.8],
    WORLD_BBOX: [-180, -60, 180, 84],
  };
})();
