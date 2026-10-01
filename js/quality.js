/* GermplasmPro — el motor del Bloque 3: control de calidad y duplicados.

   El Bloque 2 revisa cada dato por separado (¿es una fecha?, ¿es un código de
   la lista?). Aquí se revisa lo que sólo se ve mirando el conjunto:

     · GEOGRAFÍA. ¿El punto cae dentro del país que dice la accesión? Cuando no
       cae, casi siempre es una de tres cosas: la longitud perdió el signo al
       pasar por una hoja de cálculo, alguien intercambió latitud y longitud, o el punto es
       el (0, 0) que deja un campo vacío. La app lo diagnostica probando esas
       tres correcciones y proponiendo la que sí cae dentro del país.

     · TAXONOMÍA Y CATÁLOGOS. El mismo género escrito de dos maneras, el mismo
       sitio con tres ortografías, un epíteto con mayúscula, el nombre del
       cultivo cambiando entre accesiones de la misma especie.

     · DUPLICADOS. La misma colecta entrada dos veces en el catálogo, o la
       misma accesión conservada en dos bancos. Se comparan por número de
       colecta, por los números del donante y de otras colecciones, por nombre
       (con una medida de parecido entre cadenas), por taxón, por distancia
       geográfica y por fecha; cada coincidencia suma puntos y el total decide
       si el par se propone como duplicado.

   Ninguna corrección se aplica sola: la app propone y quien cura decide.

   Sobre las cajas de países: son rectángulos envolventes aproximados, no
   fronteras. Sirven para detectar un error de signo o un intercambio de
   coordenadas, que es para lo que se usan aquí, y por eso todo lo que sale de
   ellas es un AVISO, nunca un error. Los países que no están en la tabla no se
   revisan; se dice en pantalla. */

(function () {

  /* ---------- cajas envolventes aproximadas [latMin, latMax, lonMin, lonMax] ---------- */
  const BBOX = {
    MEX: [14.3, 32.8, -118.5, -86.6], GTM: [13.7, 17.9, -92.3, -88.2], BLZ: [15.8, 18.5, -89.3, -87.4],
    HND: [12.9, 16.6, -89.4, -83.1], SLV: [13.1, 14.5, -90.2, -87.6], NIC: [10.7, 15.1, -87.7, -82.6],
    CRI: [8.0, 11.3, -85.9, -82.5], PAN: [7.1, 9.7, -83.1, -77.1], CUB: [19.8, 23.3, -85.0, -74.1],
    DOM: [17.5, 20.0, -72.1, -68.3], HTI: [18.0, 20.1, -74.5, -71.6], JAM: [17.7, 18.6, -78.4, -76.2],
    PRI: [17.9, 18.6, -67.3, -65.2], TTO: [10.0, 11.4, -61.9, -60.5],
    COL: [-4.3, 13.4, -81.8, -66.8], VEN: [0.6, 12.2, -73.4, -59.8], ECU: [-5.0, 1.5, -81.1, -75.2],
    PER: [-18.4, 0.0, -81.4, -68.6], BOL: [-22.9, -9.6, -69.7, -57.4], CHL: [-56.0, -17.5, -75.8, -66.4],
    ARG: [-55.1, -21.8, -73.6, -53.6], URY: [-35.0, -30.0, -58.5, -53.0], PRY: [-27.6, -19.3, -62.7, -54.2],
    BRA: [-33.8, 5.3, -74.0, -34.8], GUY: [1.2, 8.6, -61.4, -56.5], SUR: [1.8, 6.0, -58.1, -53.9],
    USA: [18.9, 71.5, -179.2, -66.9], CAN: [41.7, 83.1, -141.0, -52.6],
    ESP: [27.6, 43.8, -18.2, 4.3], PRT: [32.4, 42.2, -31.3, -6.2], FRA: [41.3, 51.1, -5.2, 9.6],
    ITA: [35.5, 47.1, 6.6, 18.5], DEU: [47.3, 55.1, 5.9, 15.0], NLD: [50.7, 53.6, 3.4, 7.2],
    BEL: [49.5, 51.5, 2.5, 6.4], CHE: [45.8, 47.8, 5.9, 10.5], AUT: [46.4, 49.0, 9.5, 17.2],
    GBR: [49.9, 60.9, -8.6, 1.8], IRL: [51.4, 55.4, -10.5, -6.0], NOR: [57.9, 71.2, 4.6, 31.1],
    SWE: [55.3, 69.1, 11.1, 24.2], FIN: [59.8, 70.1, 20.6, 31.6], DNK: [54.6, 57.8, 8.1, 15.2],
    POL: [49.0, 54.8, 14.1, 24.2], CZE: [48.6, 51.1, 12.1, 18.9], HUN: [45.7, 48.6, 16.1, 22.9],
    ROU: [43.6, 48.3, 20.3, 29.7], BGR: [41.2, 44.2, 22.4, 28.6], GRC: [34.8, 41.8, 19.4, 28.3],
    TUR: [35.8, 42.1, 25.7, 44.8], RUS: [41.2, 81.9, 19.6, 180.0], UKR: [44.4, 52.4, 22.1, 40.2],
    GEO: [41.0, 43.6, 40.0, 46.7], ARM: [38.8, 41.3, 43.4, 46.6], AZE: [38.4, 41.9, 44.8, 50.4],
    KAZ: [40.6, 55.4, 46.5, 87.3], UZB: [37.2, 45.6, 55.9, 73.2], TJK: [36.7, 41.0, 67.3, 75.2],
    IRN: [25.1, 39.8, 44.0, 63.3], IRQ: [29.1, 37.4, 38.8, 48.6], SYR: [32.3, 37.3, 35.7, 42.4],
    LBN: [33.0, 34.7, 35.1, 36.6], ISR: [29.5, 33.3, 34.3, 35.9], JOR: [29.2, 33.4, 34.9, 39.3],
    SAU: [16.4, 32.2, 34.5, 55.7], YEM: [12.1, 19.0, 42.5, 54.5],
    EGY: [22.0, 31.7, 24.7, 36.9], MAR: [27.7, 35.9, -13.2, -1.0], DZA: [19.0, 37.1, -8.7, 12.0],
    TUN: [30.2, 37.5, 7.5, 11.6], LBY: [19.5, 33.2, 9.3, 25.2], SDN: [8.7, 22.2, 21.8, 38.6],
    ETH: [3.4, 14.9, 32.9, 48.0], ERI: [12.4, 18.0, 36.4, 43.1], KEN: [-4.7, 5.0, 33.9, 41.9],
    UGA: [-1.5, 4.2, 29.5, 35.0], TZA: [-11.8, -0.9, 29.3, 40.5], RWA: [-2.9, -1.0, 28.8, 30.9],
    BDI: [-4.5, -2.3, 29.0, 30.9], COD: [-13.5, 5.4, 12.2, 31.3], CMR: [1.7, 13.1, 8.5, 16.2],
    NGA: [4.2, 13.9, 2.7, 14.7], GHA: [4.7, 11.2, -3.3, 1.2], CIV: [4.3, 10.7, -8.6, -2.5],
    SEN: [12.3, 16.7, -17.6, -11.4], MLI: [10.1, 25.0, -12.3, 4.3], BFA: [9.4, 15.1, -5.6, 2.4],
    NER: [11.7, 23.5, 0.2, 16.0], TCD: [7.4, 23.5, 13.5, 24.0], ZAF: [-34.9, -22.1, 16.3, 32.9],
    ZWE: [-22.4, -15.6, 25.2, 33.1], ZMB: [-18.1, -8.2, 21.9, 33.7], MOZ: [-26.9, -10.5, 30.2, 40.8],
    MWI: [-17.1, -9.4, 32.7, 35.9], MDG: [-25.6, -11.9, 43.2, 50.5], AGO: [-18.0, -4.4, 11.7, 24.1],
    IND: [6.7, 35.7, 68.1, 97.4], PAK: [23.7, 37.1, 60.9, 77.8], BGD: [20.7, 26.6, 88.0, 92.7],
    NPL: [26.3, 30.4, 80.1, 88.2], LKA: [5.9, 9.9, 79.6, 81.9], MMR: [9.8, 28.5, 92.2, 101.2],
    THA: [5.6, 20.5, 97.3, 105.6], VNM: [8.2, 23.4, 102.1, 109.5], LAO: [13.9, 22.5, 100.1, 107.7],
    KHM: [10.4, 14.7, 102.3, 107.6], MYS: [0.8, 7.4, 99.6, 119.3], IDN: [-11.0, 6.1, 95.0, 141.0],
    PHL: [4.6, 21.1, 116.9, 126.6], CHN: [18.2, 53.6, 73.5, 134.8], JPN: [24.0, 45.5, 122.9, 145.8],
    KOR: [33.1, 38.6, 125.1, 129.6], PRK: [37.7, 43.0, 124.2, 130.7], MNG: [41.6, 52.1, 87.8, 119.9],
    AFG: [29.4, 38.5, 60.5, 74.9], AUS: [-43.6, -10.1, 112.9, 153.6], NZL: [-47.3, -34.4, 166.4, 178.6],
    PNG: [-11.6, -1.3, 140.8, 155.9], FJI: [-19.2, -16.1, 177.0, 180.0],
  };
  /* códigos de dos letras que la gente escribe por costumbre */
  const ALPHA2 = {
    MX: 'MEX', GT: 'GTM', BZ: 'BLZ', HN: 'HND', SV: 'SLV', NI: 'NIC', CR: 'CRI', PA: 'PAN',
    CU: 'CUB', DO: 'DOM', HT: 'HTI', JM: 'JAM', PR: 'PRI', TT: 'TTO', CO: 'COL', VE: 'VEN',
    EC: 'ECU', PE: 'PER', BO: 'BOL', CL: 'CHL', AR: 'ARG', UY: 'URY', PY: 'PRY', BR: 'BRA',
    US: 'USA', CA: 'CAN', ES: 'ESP', PT: 'PRT', FR: 'FRA', IT: 'ITA', DE: 'DEU', NL: 'NLD',
    GB: 'GBR', UK: 'GBR', IE: 'IRL', TR: 'TUR', RU: 'RUS', IN: 'IND', CN: 'CHN', JP: 'JPN',
    ET: 'ETH', KE: 'KEN', ZA: 'ZAF', NG: 'NGA', PH: 'PHL', ID: 'IDN', VN: 'VNM', TH: 'THA',
    AU: 'AUS', NZ: 'NZL', EG: 'EGY', MA: 'MAR', PK: 'PAK', BD: 'BGD', NP: 'NPL', LK: 'LKA',
  };

  function inBox(box, lat, lon, margin) {
    if (!box) return null;
    const m = margin == null ? 1.0 : margin;
    return lat >= box[0] - m && lat <= box[1] + m && lon >= box[2] - m && lon <= box[3] + m;
  }

  /* ---------- 1. revisión geográfica de una accesión ----------
     Devuelve avisos y, cuando puede, la corrección que haría cuadrar el punto
     con el país declarado. */
  function geoCheck(row) {
    const out = [];
    const latS = String(row.DECLATITUDE ?? '').trim(), lonS = String(row.DECLONGITUDE ?? '').trim();
    if (!latS || !lonS) return out;
    const lat = Number(latS), lon = Number(lonS);
    if (!isFinite(lat) || !isFinite(lon)) return out;

    if (lat === 0 && lon === 0) {
      out.push({ code: 'zerozero', level: 'error', field: 'DECLATITUDE',
        msg: { es: 'El punto (0, 0) está en el golfo de Guinea: es un campo vacío escrito como cero.', en: 'The point (0, 0) is in the Gulf of Guinea: it is an empty field written as zero.' } });
      return out;
    }
    if (lat === lon) {
      out.push({ code: 'lateqlon', level: 'warn', field: 'DECLATITUDE',
        msg: { es: 'La latitud y la longitud son idénticas: revisa si se copió una sobre la otra.', en: 'Latitude and longitude are identical: check whether one was copied over the other.' } });
    }
    if (Number.isInteger(lat) && Number.isInteger(lon)) {
      out.push({ code: 'rounded', level: 'warn', field: 'DECLATITUDE',
        msg: { es: 'Coordenadas redondeadas a grados enteros: el sitio queda con más de 50 km de incertidumbre.', en: 'Coordinates rounded to whole degrees: the site carries more than 50 km of uncertainty.' } });
    }

    const cty = String(row.ORIGCTY || '').trim().toUpperCase();
    const box = BBOX[cty];
    if (!cty) return out;
    if (!box) {
      out.push({ code: 'nobox', level: 'info', field: 'ORIGCTY',
        msg: { es: `La app no trae el contorno de ${cty}: las coordenadas no se pudieron comparar con el país.`, en: `The app does not bundle the outline of ${cty}: coordinates could not be checked against the country.` } });
      return out;
    }
    if (inBox(box, lat, lon)) return out;

    /* el punto no cae en el país: se prueban las tres equivocaciones clásicas */
    const tries = [
      { fix: { DECLONGITUDE: String(-lon) }, lat, lon: -lon, code: 'lonsign',
        msg: { es: 'La longitud perdió el signo negativo: con el signo corregido el punto sí cae en el país.', en: 'The longitude lost its minus sign: with the sign fixed the point does fall inside the country.' } },
      { fix: { DECLATITUDE: String(-lat) }, lat: -lat, lon, code: 'latsign',
        msg: { es: 'La latitud tiene el signo cambiado: con el signo corregido el punto sí cae en el país.', en: 'The latitude has the wrong sign: with the sign fixed the point does fall inside the country.' } },
      { fix: { DECLATITUDE: lonS, DECLONGITUDE: latS }, lat: lon, lon: lat, code: 'swapped',
        msg: { es: 'Latitud y longitud están intercambiadas: al cambiarlas de lugar el punto cae en el país.', en: 'Latitude and longitude are swapped: exchanging them puts the point inside the country.' } },
      { fix: { DECLATITUDE: String(-lon), DECLONGITUDE: String(-lat) }, lat: -lon, lon: -lat, code: 'swapsign',
        msg: { es: 'Las coordenadas están intercambiadas y con el signo cambiado.', en: 'The coordinates are swapped and sign-flipped.' } },
    ];
    for (const t of tries) {
      if (Math.abs(t.lat) <= 90 && Math.abs(t.lon) <= 180 && inBox(box, t.lat, t.lon)) {
        out.push({ code: t.code, level: 'error', field: 'DECLONGITUDE', msg: t.msg, fix: t.fix });
        return out;
      }
    }
    out.push({ code: 'outside', level: 'warn', field: 'DECLONGITUDE',
      msg: { es: `El punto cae fuera de ${cty} y ninguna corrección simple lo arregla: revisa las coordenadas o el país.`, en: `The point falls outside ${cty} and no simple fix repairs it: check the coordinates or the country.` } });
    return out;
  }

  /* ---------- 2. parecido entre cadenas ---------- */
  function normStr(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  /* distancia de edición de Levenshtein */
  function levenshtein(a, b) {
    a = String(a); b = String(b);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  /* similitud de Jaro y de Jaro-Winkler (la que mejor se porta con nombres) */
  function jaro(a, b) {
    a = String(a); b = String(b);
    if (!a.length && !b.length) return 1;
    if (!a.length || !b.length) return 0;
    if (a === b) return 1;
    const win = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
    const ma = new Array(a.length).fill(false), mb = new Array(b.length).fill(false);
    let m = 0;
    for (let i = 0; i < a.length; i++) {
      const lo = Math.max(0, i - win), hi = Math.min(b.length - 1, i + win);
      for (let j = lo; j <= hi; j++) {
        if (mb[j] || a[i] !== b[j]) continue;
        ma[i] = mb[j] = true; m++; break;
      }
    }
    if (!m) return 0;
    let t = 0, k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!ma[i]) continue;
      while (!mb[k]) k++;
      if (a[i] !== b[k]) t++;
      k++;
    }
    t /= 2;
    return (m / a.length + m / b.length + (m - t) / m) / 3;
  }
  function jaroWinkler(a, b, p) {
    const j = jaro(a, b);
    if (j < 0.7) return j;                 /* el ajuste del prefijo sólo se aplica a cadenas ya parecidas */
    let l = 0;
    while (l < 4 && l < a.length && l < b.length && a[l] === b[l]) l++;
    return j + l * (p == null ? 0.1 : p) * (1 - j);
  }
  /* parecido entre nombres, ya normalizados y comparando también palabra por palabra */
  function nameSim(a, b) {
    const x = normStr(a), y = normStr(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
    const jw = jaroWinkler(x, y);
    const wx = new Set(x.split(' ')), wy = new Set(y.split(' '));
    const inter = [...wx].filter(w => wy.has(w)).length;
    const jacc = inter / (wx.size + wy.size - inter);
    return Math.max(jw, 0.55 + 0.45 * jacc * (inter >= 1 ? 1 : 0));
  }

  /* ---------- 3. duplicados ---------- */
  const DEFAULT_W = {
    collnumb: 40,     /* el mismo número de colecta */
    othernumb: 35,    /* números del donante o de otras colecciones que coinciden */
    name: 25,         /* nombre de la accesión muy parecido */
    nameSoft: 12,     /* nombre parecido sin llegar a casi idéntico */
    taxon: 10,        /* mismo género y especie */
    near1: 20,        /* a menos de 1 km */
    near5: 12,        /* a menos de 5 km */
    near25: 5,        /* a menos de 25 km */
    date: 15,         /* misma fecha exacta de colecta */
    year: 5,          /* mismo año de colecta */
    mission: 5,       /* misma misión de colecta */
    genusPenalty: -35,/* géneros distintos: casi seguro no son la misma cosa */
  };

  function ids(row) {
    const raw = [row.OTHERNUMB, row.DONORNUMB, row.COLLNUMB].join(';');
    return new Set(raw.split(';').map(s => normStr(s).replace(/\s+/g, '')).filter(s => s.length >= 3));
  }
  function taxonOf(row) { return normStr([row.GENUS, row.SPECIES].join(' ')); }
  function coordsOf(row) {
    const la = Number(row.DECLATITUDE), lo = Number(row.DECLONGITUDE);
    return (isFinite(la) && isFinite(lo) && !(la === 0 && lo === 0)) ? [la, lo] : null;
  }

  /* claves de bloqueo: sólo se comparan pares que comparten alguna, para que
     una colección de miles de accesiones no necesite comparar todos los pares */
  function blockKeys(row) {
    const keys = [];
    const cn = normStr(row.COLLNUMB).replace(/\s+/g, '');
    if (cn.length >= 3) keys.push('c:' + cn);
    ids(row).forEach(v => keys.push('i:' + v));
    const g = normStr(row.GENUS).slice(0, 4);
    const nm = normStr(row.ACCENAME).replace(/\s+/g, '');
    if (nm.length >= 4) keys.push('n:' + nm.slice(0, 5));
    const c = coordsOf(row);
    if (c) {
      const cell = `${Math.round(c[0] * 2) / 2}_${Math.round(c[1] * 2) / 2}`;   /* medio grado */
      keys.push('g:' + g + cell);
    }
    if (g) keys.push('t:' + taxonOf(row) + ':' + String(row.COLLDATE || '').slice(0, 6));
    return [...new Set(keys)];
  }

  function scorePair(a, b, w) {
    const W = Object.assign({}, DEFAULT_W, w || {});
    const reasons = [];
    let score = 0;

    const ga = normStr(a.GENUS), gb = normStr(b.GENUS);
    if (ga && gb && ga !== gb) {
      score += W.genusPenalty;
      reasons.push({ k: 'genus', pts: W.genusPenalty, es: 'géneros distintos', en: 'different genera' });
    } else if (taxonOf(a) && taxonOf(a) === taxonOf(b)) {
      score += W.taxon;
      reasons.push({ k: 'taxon', pts: W.taxon, es: 'el mismo taxón', en: 'the same taxon' });
    }

    const cna = normStr(a.COLLNUMB).replace(/\s+/g, ''), cnb = normStr(b.COLLNUMB).replace(/\s+/g, '');
    if (cna && cna === cnb) {
      score += W.collnumb;
      reasons.push({ k: 'collnumb', pts: W.collnumb, es: `el mismo número de colecta (${a.COLLNUMB})`, en: `the same collecting number (${a.COLLNUMB})` });
    }

    const ia = ids(a), ib = ids(b);
    const shared = [...ia].filter(v => ib.has(v) && v !== cna);
    if (shared.length) {
      score += W.othernumb;
      reasons.push({ k: 'othernumb', pts: W.othernumb, es: 'comparten un número de donante o de otra colección', en: 'they share a donor or other-collection number' });
    }

    const sim = nameSim(a.ACCENAME, b.ACCENAME);
    if (sim >= 0.92) {
      score += W.name;
      reasons.push({ k: 'name', pts: W.name, es: `nombres casi idénticos (${fmt(100 * sim, 0)} %)`, en: `nearly identical names (${fmt(100 * sim, 0)}%)` });
    } else if (sim >= 0.82) {
      score += W.nameSoft;
      reasons.push({ k: 'nameSoft', pts: W.nameSoft, es: `nombres parecidos (${fmt(100 * sim, 0)} %)`, en: `similar names (${fmt(100 * sim, 0)}%)` });
    }

    const ca = coordsOf(a), cb = coordsOf(b);
    let dist = null;
    if (ca && cb) {
      dist = haversine(ca[0], ca[1], cb[0], cb[1]);
      if (dist <= 1) { score += W.near1; reasons.push({ k: 'near', pts: W.near1, es: `a ${fmt(dist * 1000, 0)} m una de otra`, en: `${fmt(dist * 1000, 0)} m apart` }); }
      else if (dist <= 5) { score += W.near5; reasons.push({ k: 'near', pts: W.near5, es: `a ${fmt(dist, 1)} km una de otra`, en: `${fmt(dist, 1)} km apart` }); }
      else if (dist <= 25) { score += W.near25; reasons.push({ k: 'near', pts: W.near25, es: `a ${fmt(dist, 0)} km una de otra`, en: `${fmt(dist, 0)} km apart` }); }
    }

    const da = String(a.COLLDATE || ''), db = String(b.COLLDATE || '');
    if (da && da === db && /^\d{8}$/.test(da)) {
      score += W.date;
      reasons.push({ k: 'date', pts: W.date, es: 'la misma fecha de colecta', en: 'the same collecting date' });
    } else if (da.slice(0, 4) && da.slice(0, 4) === db.slice(0, 4)) {
      score += W.year;
      reasons.push({ k: 'year', pts: W.year, es: 'el mismo año de colecta', en: 'the same collecting year' });
    }

    const ma = normStr(a.COLLMISSID), mb = normStr(b.COLLMISSID);
    if (ma && ma === mb) {
      score += W.mission;
      reasons.push({ k: 'mission', pts: W.mission, es: 'la misma misión de colecta', en: 'the same collecting mission' });
    }

    return { score: Math.max(0, Math.min(100, score)), reasons, dist, nameSim: sim };
  }

  /* encuentra los pares candidatos y los agrupa */
  function findDuplicates(rows, opts) {
    const o = Object.assign({ threshold: 50, weights: null, dismissed: [] }, opts || {});
    const dismissed = new Set((o.dismissed || []).map(p => p.join('|')));

    /* accesiones con el mismo número: eso no es un candidato, es un error */
    const byAcc = new Map();
    const sameNumber = [];
    rows.forEach((r, i) => {
      const k = normStr(r.ACCENUMB).replace(/\s+/g, '');
      if (!k) return;
      if (byAcc.has(k)) sameNumber.push([byAcc.get(k), i]); else byAcc.set(k, i);
    });

    /* bloqueo: se comparan sólo los pares que comparten alguna clave */
    const blocks = new Map();
    rows.forEach((r, i) => blockKeys(r).forEach(k => {
      if (!blocks.has(k)) blocks.set(k, []);
      blocks.get(k).push(i);
    }));
    const candidates = new Set();
    for (const list of blocks.values()) {
      if (list.length < 2 || list.length > 400) continue;     /* un bloque gigantesco no discrimina nada */
      for (let x = 0; x < list.length; x++) {
        for (let y = x + 1; y < list.length; y++) {
          const i = Math.min(list[x], list[y]), j = Math.max(list[x], list[y]);
          candidates.add(i + '|' + j);
        }
      }
    }

    const pairs = [];
    for (const key of candidates) {
      if (dismissed.has(key)) continue;
      const [i, j] = key.split('|').map(Number);
      const s = scorePair(rows[i], rows[j], o.weights);
      if (s.score >= o.threshold) pairs.push(Object.assign({ i, j }, s));
    }
    pairs.sort((a, b) => b.score - a.score);

    /* grupos: si A es duplicado de B y B de C, los tres son el mismo material */
    const parent = new Map();
    const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const union = (x, y) => { parent.set(find(x), find(y)); };
    pairs.forEach(p => { [p.i, p.j].forEach(x => { if (!parent.has(x)) parent.set(x, x); }); union(p.i, p.j); });
    const groupsMap = new Map();
    [...parent.keys()].forEach(x => {
      const root = find(x);
      if (!groupsMap.has(root)) groupsMap.set(root, []);
      groupsMap.get(root).push(x);
    });
    const groups = [...groupsMap.values()].map(members => {
      members.sort((a, b) => a - b);
      const inner = pairs.filter(p => members.includes(p.i) && members.includes(p.j));
      return { members, pairs: inner, score: Math.max(...inner.map(p => p.score)) };
    }).sort((a, b) => b.score - a.score);

    return { pairs, groups, sameNumber, candidates: candidates.size, comparisons: candidates.size };
  }

  /* fusión: la accesión maestra manda; de la otra se toma lo que falte */
  function mergeRows(master, other, keepOtherNumb) {
    const out = Object.assign({}, master);
    for (const f of MCPD.FIELDS) {
      const k = f.k;
      if (String(out[k] ?? '').trim() === '' && String(other[k] ?? '').trim() !== '') out[k] = other[k];
    }
    if (keepOtherNumb !== false && other.ACCENUMB && other.ACCENUMB !== master.ACCENUMB) {
      const prev = String(out.OTHERNUMB || '').split(';').map(s => s.trim()).filter(Boolean);
      if (!prev.includes(other.ACCENUMB)) prev.push(other.ACCENUMB);
      out.OTHERNUMB = prev.join('; ');
    }
    /* las existencias se suman, porque son dos sobres del mismo material */
    const sa = Number(master.GP_STOCK), sb = Number(other.GP_STOCK);
    if (isFinite(sa) && isFinite(sb)) out.GP_STOCK = String(sa + sb);
    return out;
  }

  /* ---------- 4. consistencia de taxonomía y de catálogos ---------- */
  function consistency(rows) {
    const out = [];
    const add = (code, level, es, en, items) => out.push({ code, level, msg: { es, en }, items });

    /* formato de los nombres científicos */
    const badGenus = [], badSpecies = [], withAuthor = [];
    rows.forEach((r, i) => {
      const g = String(r.GENUS || '').trim(), s = String(r.SPECIES || '').trim();
      if (g && g !== g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()) badGenus.push(i);
      if (s && s !== s.toLowerCase()) badSpecies.push(i);
      if (s && /\s|[A-Z]\./.test(s)) withAuthor.push(i);
    });
    if (badGenus.length) add('genusCase', 'warn', 'El género debe ir con mayúscula inicial y el resto en minúsculas.', 'The genus must start with a capital letter and continue in lower case.', badGenus);
    if (badSpecies.length) add('speciesCase', 'warn', 'El epíteto específico se escribe todo en minúsculas.', 'The specific epithet is written entirely in lower case.', badSpecies);
    if (withAuthor.length) add('speciesAuthor', 'warn', 'El epíteto trae algo más que el epíteto: la autoridad va en SPAUTHOR y el infraespecífico en SUBTAXA.', 'The epithet carries more than the epithet: the authority belongs in SPAUTHOR and the infraspecific rank in SUBTAXA.', withAuthor);

    /* géneros que se parecen demasiado entre sí: casi siempre es un dedazo */
    const genera = [...new Set(rows.map(r => String(r.GENUS || '').trim()).filter(Boolean))];
    const pairsG = [];
    for (let x = 0; x < genera.length; x++) {
      for (let y = x + 1; y < genera.length; y++) {
        const d = levenshtein(normStr(genera[x]), normStr(genera[y]));
        if (d > 0 && d <= 2 && Math.max(genera[x].length, genera[y].length) >= 5) pairsG.push([genera[x], genera[y]]);
      }
    }
    pairsG.forEach(([a, b]) => add('genusTypo', 'warn',
      `«${a}» y «${b}» se parecen demasiado para ser dos géneros distintos.`,
      `"${a}" and "${b}" are too similar to be two different genera.`,
      rows.map((r, i) => (r.GENUS === a || r.GENUS === b) ? i : -1).filter(i => i >= 0)));

    /* un mismo taxón con nombres de cultivo distintos */
    const cropByTaxon = new Map();
    rows.forEach((r, i) => {
      const t = taxonOf(r), c = normStr(r.CROPNAME);
      if (!t || !c) return;
      if (!cropByTaxon.has(t)) cropByTaxon.set(t, new Map());
      const m = cropByTaxon.get(t);
      if (!m.has(c)) m.set(c, []);
      m.get(c).push(i);
    });
    for (const [t, m] of cropByTaxon) {
      if (m.size > 1) {
        const names = [...m.keys()];
        add('cropName', 'warn',
          `El mismo taxón (${t}) aparece con ${m.size} nombres de cultivo distintos: ${names.join(', ')}.`,
          `The same taxon (${t}) appears under ${m.size} different crop names: ${names.join(', ')}.`,
          [].concat(...m.values()));
      }
    }

    /* sitios de colecta escritos de varias maneras */
    const sites = new Map();
    rows.forEach((r, i) => {
      const s = String(r.COLLSITE || '').trim();
      if (!s) return;
      const n = normStr(s);
      if (!sites.has(n)) sites.set(n, { forms: new Set(), rows: [] });
      sites.get(n).forms.add(s);
      sites.get(n).rows.push(i);
    });
    for (const [, v] of sites) {
      if (v.forms.size > 1) {
        const forms = [...v.forms];
        add('siteSpelling', 'info',
          `El mismo sitio está escrito de ${forms.length} maneras: ${forms.map(f => `«${f}»`).join(', ')}.`,
          `The same site is spelled ${forms.length} ways: ${forms.map(f => `"${f}"`).join(', ')}.`,
          v.rows);
      }
    }

    /* coordenadas exactamente iguales en accesiones de sitios distintos */
    const coordMap = new Map();
    rows.forEach((r, i) => {
      const c = coordsOf(r);
      if (!c) return;
      const k = c[0].toFixed(4) + ',' + c[1].toFixed(4);
      if (!coordMap.has(k)) coordMap.set(k, []);
      coordMap.get(k).push(i);
    });
    for (const [k, list] of coordMap) {
      if (list.length < 2) continue;
      const distintos = new Set(list.map(i => normStr(rows[i].COLLSITE)));
      if (distintos.size > 1) add('sameCoords', 'warn',
        `${list.length} accesiones comparten exactamente las coordenadas ${k} pero declaran sitios distintos.`,
        `${list.length} accessions share exactly the coordinates ${k} but declare different sites.`, list);
    }
    return out;
  }

  /* ---------- 5. correcciones que la app puede proponer ---------- */
  function proposeFixes(rows) {
    const fixes = [];
    rows.forEach((r, i) => {
      /* país en dos letras */
      const cty = String(r.ORIGCTY || '').trim().toUpperCase();
      if (cty.length === 2 && ALPHA2[cty]) {
        fixes.push({ i, code: 'alpha2', field: 'ORIGCTY', from: r.ORIGCTY, to: ALPHA2[cty],
          msg: { es: `«${cty}» es el código de dos letras; el estándar pide el de tres.`, en: `"${cty}" is the two-letter code; the standard asks for the three-letter one.` } });
      }
      /* espacios de sobra y mayúsculas gritadas en los nombres: una sola
         corrección hace las dos cosas, para no tener que pasar dos veces */
      ['ACCENAME', 'COLLSITE', 'CROPNAME'].forEach(k => {
        const v = String(r[k] ?? '');
        let t = v.replace(/\s+/g, ' ').trim();
        if (!t) return;
        const gritado = t.length > 3 && t === t.toUpperCase() && /\p{Lu}{4,}/u.test(t);
        if (gritado) t = t.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m0, s, c) => s + c.toUpperCase());
        if (t === v) return;
        fixes.push({ i, code: gritado ? 'upper' : 'spaces', field: k, from: v, to: t,
          msg: gritado
            ? { es: 'Todo en mayúsculas: se propone dejarlo en formato de nombre (y de paso quitar los espacios de más).', en: 'All caps: proposed as normal name case (extra spaces removed too).' }
            : { es: 'Espacios de más al principio, al final o entre palabras.', en: 'Extra spaces at the start, at the end or between words.' } });
      });
      /* género y epíteto */
      const g = String(r.GENUS || '').trim();
      if (g) {
        const nice = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
        if (g !== nice) fixes.push({ i, code: 'genusCase', field: 'GENUS', from: g, to: nice,
          msg: { es: 'El género va con mayúscula inicial.', en: 'The genus takes an initial capital.' } });
      }
      const sp = String(r.SPECIES || '').trim();
      if (sp && sp !== sp.toLowerCase() && !/\s/.test(sp)) {
        fixes.push({ i, code: 'speciesCase', field: 'SPECIES', from: sp, to: sp.toLowerCase(),
          msg: { es: 'El epíteto específico va en minúsculas.', en: 'The specific epithet is lower case.' } });
      }
      /* coordenadas que el país desmiente */
      geoCheck(r).forEach(p => {
        if (!p.fix) return;
        Object.keys(p.fix).forEach(k => fixes.push({ i, code: p.code, field: k, from: r[k], to: p.fix[k], msg: p.msg }));
      });
      /* la ruta de conservación se puede deducir del almacenamiento */
      if (!String(r.GP_CONS || '').trim()) {
        const route = MCPD.consRoute(r);
        if (route) fixes.push({ i, code: 'route', field: 'GP_CONS', from: '', to: route,
          msg: { es: 'La ruta de conservación se deduce del tipo de almacenamiento.', en: 'The conservation route follows from the storage type.' } });
      }
      /* coordenadas decimales que se pueden calcular del formato antiguo */
      if (!String(r.DECLATITUDE || '').trim() && String(r.LATITUDE || '').trim()) {
        const d = MCPD.dmsToDec(r.LATITUDE);
        if (d != null) fixes.push({ i, code: 'fromDms', field: 'DECLATITUDE', from: '', to: String(Math.round(d * 1e6) / 1e6),
          msg: { es: 'Hay latitud en grados-minutos-segundos: se puede calcular la decimal.', en: 'There is a latitude in degrees-minutes-seconds: the decimal one can be computed.' } });
      }
      if (!String(r.DECLONGITUDE || '').trim() && String(r.LONGITUDE || '').trim()) {
        const d = MCPD.dmsToDec(r.LONGITUDE);
        if (d != null) fixes.push({ i, code: 'fromDms', field: 'DECLONGITUDE', from: '', to: String(Math.round(d * 1e6) / 1e6),
          msg: { es: 'Hay longitud en grados-minutos-segundos: se puede calcular la decimal.', en: 'There is a longitude in degrees-minutes-seconds: the decimal one can be computed.' } });
      }
    });
    return fixes;
  }

  function applyFixes(rows, fixes) {
    let n = 0;
    fixes.forEach(f => {
      if (!rows[f.i]) return;
      rows[f.i][f.field] = f.to;
      n++;
    });
    return n;
  }

  /* ---------- resumen del bloque ---------- */
  function audit(rows, opts) {
    const geo = [];
    rows.forEach((r, i) => geoCheck(r).forEach(p => geo.push(Object.assign({ i }, p))));
    const cons = consistency(rows);
    const fixes = proposeFixes(rows);
    const dup = findDuplicates(rows, opts);
    return { geo, consistency: cons, fixes, dup };
  }

  window.QC = {
    BBOX, ALPHA2, inBox, geoCheck, normStr, levenshtein, jaro, jaroWinkler, nameSim,
    DEFAULT_W, ids, blockKeys, scorePair, findDuplicates, mergeRows, consistency,
    proposeFixes, applyFixes, audit, coordsOf, taxonOf,
  };
})();
