/* GermplasmPro — el motor del Bloque 6: qué falta por colectar y qué está en
   riesgo de perderse.

   Un análisis de vacíos responde a tres preguntas distintas, y conviene no
   confundirlas:

     1. VACÍOS GEOGRÁFICOS. ¿Qué parte del territorio no tiene ninguna colecta?
        Se tira una rejilla sobre el área de interés, se descartan las celdas
        que no tocan tierra (ni tienen accesiones) y se mira cuáles quedaron
        vacías y a qué distancia está de ellas la colecta más cercana.

     2. PRIORIDADES DE COLECTA. No todas las celdas vacías valen lo mismo. La
        app las ordena con un índice explícito que combina cuatro cosas: lo
        lejos que está la colecta más cercana, la riqueza que hay en las celdas
        vecinas, lo poco representada que está la entidad, y si por ahí cerca
        hay tipos que no están en ninguna otra parte. Los pesos se ven y se
        pueden cambiar: el índice no es una caja negra.

     3. VACÍOS DE LA COLECCIÓN. Aparte del mapa, hay huecos que no son
        geográficos: tipos con una sola accesión, tipos sin duplicado de
        seguridad, material que sólo existe en banco de campo (la ruta más
        frágil), poblaciones que sólo están in situ sin respaldo ex situ, tipos
        guardados sólo como ADN (que no regenera planta), y franjas
        altitudinales intermedias sin nada.

   LÍMITE HONESTO. Esto no es un análisis ecogeográfico completo: para saber
   qué combinaciones de clima y suelo faltan hacen falta capas ambientales, y
   GermplasmPro no las trae ni las descarga. Lo que sí hace es todo lo que se
   puede hacer con el pasaporte y con la geografía, que es bastante, y decirlo
   con claridad en vez de disfrazarlo. */

(function () {

  /* ---------- las unidades del territorio: entidades de México o países ----------
     Cada unidad lleva sus anillos con un índice por franjas de latitud, para que
     probar muchos puntos (varios por celda) no cueste una eternidad, su
     superficie en km² y un punto interior para cuando la rejilla es tan gruesa
     que ninguna muestra cae dentro de ella. */
  const UNITS = {};
  const BUCKETS = 48;
  function indexRing(r) {
    const b = GEO.ringsBBox([r]);
    const dy = Math.max(1e-9, (b[3] - b[1]) / BUCKETS);
    const buckets = [...Array(BUCKETS)].map(() => []);
    const n = r.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ya = r[2 * j + 1], yb = r[2 * i + 1];
      const lo = Math.max(0, Math.floor((Math.min(ya, yb) - b[1]) / dy));
      const hi = Math.min(BUCKETS - 1, Math.floor((Math.max(ya, yb) - b[1]) / dy));
      for (let k = lo; k <= hi; k++) buckets[k].push(j, i);
    }
    return { r, b, dy, buckets };
  }
  /* regla par-impar, igual que GEO.pointInRings, pero mirando sólo las aristas de la franja */
  function inIndexed(u, lon, lat) {
    if (!GEO.inBBox(u.bbox, lon, lat)) return false;
    let inside = false;
    for (const x of u.idx) {
      if (lon < x.b[0] || lon > x.b[2] || lat < x.b[1] || lat > x.b[3]) continue;
      const k = Math.min(BUCKETS - 1, Math.floor((lat - x.b[1]) / x.dy));
      const e = x.buckets[k], r = x.r;
      let c = false;
      for (let q = 0; q < e.length; q += 2) {
        const j = e[q], i = e[q + 1];
        const xi = r[2 * i], yi = r[2 * i + 1], xj = r[2 * j], yj = r[2 * j + 1];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) c = !c;
      }
      if (c) inside = !inside;
    }
    return inside;
  }
  /* superficie de un anillo en km² (aproximación equirrectangular a su latitud media) */
  function ringKm2(r) {
    const b = GEO.ringsBBox([r]);
    return GEO.ringArea(r) * 111.32 * 111.32 * Math.cos((b[1] + b[3]) / 2 * Math.PI / 180);
  }
  function unitsOf(scope) {
    const key = scope === 'world' ? 'world' : 'mx';
    if (UNITS[key]) return UNITS[key];
    const src = key === 'world'
      ? GEO.WORLD.map(c => ({ code: c.a3 || c.a2, rings: c.rings, bbox: c.bbox }))
      : GEO.MX.map(s => ({ code: s.code, rings: s.rings, bbox: s.bbox, name: s.name }));
    src.forEach(u => {
      u.idx = u.rings.filter(r => r.length >= 6).map(indexRing);
      /* un anillo dentro de otro de la misma unidad es un hueco y resta */
      const km = u.idx.map(x => ringKm2(x.r));
      u.km2 = Math.max(1, u.idx.reduce((a, x, n) => {
        const hole = u.idx.some((y, m) => m !== n && km[m] > km[n] && GEO.inBBox(y.b, x.r[0], x.r[1]) && GEO.pointInRing(y.r, x.r[0], x.r[1]));
        return a + (hole ? -1 : 1) * km[n];
      }, 0));
    });
    UNITS[key] = { list: src, byCode: new Map(src.map(u => [u.code, u])) };
    return UNITS[key];
  }
  /* la unidad donde cae un punto (null si cae en el mar o fuera del territorio) */
  function unitAt(scope, lon, lat) {
    for (const u of unitsOf(scope).list) if (inIndexed(u, lon, lat)) return u;
    return null;
  }
  function anchorOf(u) {
    if (!u.anchor) u.anchor = GEO.labelPoint(u.rings) || [(u.bbox[0] + u.bbox[2]) / 2, (u.bbox[1] + u.bbox[3]) / 2];
    return u.anchor;
  }

  /* ---------- la rejilla del área de interés ----------
     scope: 'mx' (entidades de México) | 'world' (países).
     Una celda pertenece al área si TOCA tierra de forma relevante, no sólo si
     su centro cae en tierra: se prueban k × k puntos repartidos en la celda y
     cada unidad se queda con la fracción de muestras que caen en ella. Así una
     celda de costa cuyo centro cae en el mar sigue existiendo, y una entidad
     chica (Tlaxcala, la Ciudad de México) aparece aunque ningún centro la toque.
     Si ni siquiera una muestra la toca, su punto interior la ancla a la celda
     que lo contiene: toda entidad tiene al menos una celda.
     extra: puntos [{lon, lat}] cuya celda debe existir aunque no tenga tierra. */
  function areaGrid(size, scope, bbox, extra) {
    const sc = scope === 'world' ? 'world' : 'mx';
    const U = unitsOf(sc);
    const b = bbox || (sc === 'world' ? GEO.WORLD_BBOX : GEO.MX_BBOX);
    const k = sc === 'world' ? (size >= 1 ? 3 : 2) : 5;
    const i0 = Math.floor(b[0] / size), i1 = Math.floor(b[2] / size);
    const j0 = Math.floor(b[1] / size), j1 = Math.floor(b[3] / size);
    const byKey = new Map();
    const make = (i, j) => ({
      key: `${i}|${j}`, i, j, lon: (i + 0.5) * size, lat: (j + 0.5) * size, size, scope: sc,
      shares: new Map(), land: 0, stateCode: '', countryCode: '', unitCode: '',
      n: 0, items: [], types: new Set(), unitCounts: new Map(),
    });
    for (let i = i0; i <= i1; i++) {
      const x0 = i * size, x1 = x0 + size;
      const col = U.list.filter(u => u.bbox[0] <= x1 && u.bbox[2] >= x0);
      if (!col.length) continue;
      for (let j = j0; j <= j1; j++) {
        const y0 = j * size, y1 = y0 + size;
        const cand = col.filter(u => u.bbox[1] <= y1 && u.bbox[3] >= y0);
        if (!cand.length) continue;
        const hits = new Map();
        let land = 0;
        for (let a = 0; a < k; a++) {
          const lon = x0 + (a + 0.5) * size / k;
          for (let c = 0; c < k; c++) {
            const lat = y0 + (c + 0.5) * size / k;
            for (const u of cand) {
              if (inIndexed(u, lon, lat)) { hits.set(u.code, (hits.get(u.code) || 0) + 1); land++; break; }
            }
          }
        }
        if (!land) continue;
        const cell = make(i, j);
        hits.forEach((v, code) => cell.shares.set(code, v / (k * k)));
        cell.land = land / (k * k);
        byKey.set(cell.key, cell);
      }
    }
    /* las unidades que ninguna muestra tocó se anclan por su punto interior */
    const touched = new Set();
    byKey.forEach(c => c.shares.forEach((_, code) => touched.add(code)));
    U.list.forEach(u => {
      if (touched.has(u.code)) return;
      const [lon, lat] = anchorOf(u);
      if (!GEO.inBBox(b, lon, lat)) return;
      const i = Math.floor(lon / size), j = Math.floor(lat / size);
      let cell = byKey.get(`${i}|${j}`);
      if (!cell) { cell = make(i, j); byKey.set(cell.key, cell); }
      const tiny = 0.5 / (k * k);
      cell.shares.set(u.code, tiny);
      cell.land = Math.min(1, cell.land + tiny);
    });
    /* las celdas de las accesiones que caen en el mar, pegadas a la costa */
    (extra || []).forEach(p => {
      if (!GEO.inBBox(b, p.lon, p.lat)) return;
      const i = Math.floor(p.lon / size), j = Math.floor(p.lat / size);
      if (!byKey.has(`${i}|${j}`)) byKey.set(`${i}|${j}`, make(i, j));
    });
    const out = [...byKey.values()].sort((a, c) => a.i - c.i || a.j - c.j);
    out.forEach(c => {
      let best = '', bv = -1;
      c.shares.forEach((v, code) => { if (v > bv) { bv = v; best = code; } });
      c.unitCode = best;
      if (sc === 'world') {
        c.countryCode = best;
        /* en México se dice también la entidad: la que más tierra tiene en la celda */
        if (best === 'MEX') {
          const MXU = unitsOf('mx'), hit = new Map();
          for (let a = 0; a < 3; a++) for (let q = 0; q < 3; q++) {
            const u = unitAt('mx', (c.i + (a + 0.5) / 3) * size, (c.j + (q + 0.5) / 3) * size);
            if (u) hit.set(u.code, (hit.get(u.code) || 0) + 1);
          }
          let sb = '', sv = 0;
          hit.forEach((v, code) => { if (v > sv) { sv = v; sb = code; } });
          c.stateCode = sb && MXU.byCode.has(sb) ? sb : '';
        }
      } else {
        c.stateCode = best;
        c.countryCode = 'MEX';
      }
    });
    return out;
  }

  /* ¿dónde cae cada accesión? En su PROPIO punto, no en el centro de su celda:
     una accesión de Puebla cuenta para Puebla aunque su celda la comparta con
     Tlaxcala. Con México como territorio, un punto en otro país queda fuera del
     área; uno en el mar, pegado a la costa, cuenta en su celda si la celda
     existe y se asigna a la entidad con más tierra en ella. */
  function placePoint(p, scope) {
    const u = unitAt(scope, p.lon, p.lat);
    if (u) return { code: u.code, outside: false };
    if (scope !== 'world' && GEO.countryOf(p.lon, p.lat)) return { code: '', outside: true };
    return { code: '', outside: false };
  }

  /* reparte los puntos en las celdas de la rejilla */
  function fillCells(cells, points, classMode) {
    const byKey = new Map(cells.map(c => [c.key, c]));
    const scope = cells.length ? cells[0].scope : 'mx';
    const orphan = [];
    points.forEach(p => {
      const k = GEO.cellKey(p.lon, p.lat, cells.length ? cells[0].size : 1);
      const c = byKey.get(k);
      const where = placePoint(p, scope);
      if (!c || where.outside) { orphan.push(p); return; }
      const code = where.code || c.unitCode;
      p.unit = code;
      c.n++; c.items.push(p);
      if (code) {
        c.unitCounts.set(code, (c.unitCounts.get(code) || 0) + 1);
        /* si el punto cae en una unidad que las muestras no vieron, esa unidad también toca la celda */
        if (c.shares && !c.shares.has(code)) c.shares.set(code, 0.02);
      }
      const t = DIV.classOf(p.row, classMode);
      /* el tipo vacío («—») no es un tipo: no suma riqueza ni exclusividad */
      if (t && t !== '—') c.types.add(t);
    });
    return { byKey, orphan };
  }

  /* distancia de cada celda vacía a la colecta más cercana */
  function nearestDistance(cells, points) {
    cells.forEach(c => {
      if (c.n > 0) { c.dist = 0; c.nearest = null; return; }
      let best = Infinity, who = null;
      for (const p of points) {
        const d = haversine(c.lat, c.lon, p.lat, p.lon);
        if (d < best) { best = d; who = p; }
      }
      c.dist = isFinite(best) ? best : NaN;
      c.nearest = who;
    });
    return cells;
  }

  /* el vecindario se mide en kilómetros, no en celdas: con un radio fijo de dos
     celdas, al pasar a 0.5° el vecindario se encoge a la cuarta parte y casi
     ninguna celda vacía alcanza a ver riqueza alrededor (cientos empatan); con
     2° se cuadruplica. 220 km son las dos celdas de siempre con 1°; con 0.5°
     son cuatro y con 2°, una. */
  const NEIGHBOUR_KM = 220;
  function radiusCells(km, size) {
    const s = size > 0 ? size : 1;
    return Math.max(1, Math.round((km == null ? NEIGHBOUR_KM : km) / (111.32 * s)));
  }

  /* riqueza y exclusividad en el vecindario de cada celda (radio en celdas) */
  function neighbourhood(cells, radiusCells) {
    const r = radiusCells == null ? 2 : radiusCells;
    const byIJ = new Map(cells.map(c => [c.i + '|' + c.j, c]));
    cells.forEach(c => {
      const types = new Set();
      let n = 0, excl = 0;
      for (let di = -r; di <= r; di++) {
        for (let dj = -r; dj <= r; dj++) {
          const o = byIJ.get((c.i + di) + '|' + (c.j + dj));
          if (!o) continue;
          n += o.n;
          o.types.forEach(t => types.add(t));
          excl += o.exclusiveTypes || 0;
        }
      }
      c.nbRichness = types.size;
      c.nbAccessions = n;
      c.nbExclusive = excl;
    });
    return cells;
  }

  /* ---------- índice de prioridad de colecta ---------- */
  const DEFAULT_WEIGHTS = { distance: 40, richness: 25, state: 20, exclusive: 15 };

  /* el déficit del territorio de una celda: el de sus unidades, pesado por la
     tierra que cada una ocupa en ella; sin unidad, el déficit medio (neutro e
     igual para todas las celdas en esa situación) */
  function cellDeficit(c, deficit) {
    let s = 0, w = 0;
    (c.shares || new Map()).forEach((v, code) => {
      const d = deficit.get(code);
      if (d == null) return;
      s += v * d; w += v;
    });
    if (w > 0) return s / w;
    const d = deficit.get(c.stateCode || c.unitCode);
    if (d != null) return d;
    const all = [...deficit.values()];
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0.5;
  }

  function priorities(cells, ctx, weights) {
    const W = Object.assign({}, DEFAULT_WEIGHTS, weights || {});
    const sumW = W.distance + W.richness + W.state + W.exclusive;
    const empty = cells.filter(c => c.n === 0);
    /* con todos los pesos en cero no hay índice que ordenar: no se inventa un ranking */
    if (!empty.length || !(sumW > 0)) return [];
    const maxDist = Math.max(...empty.map(c => c.dist).filter(isFinite), 1);
    const maxRich = Math.max(...cells.map(c => c.nbRichness || 0), 1);
    const maxExcl = Math.max(...cells.map(c => c.nbExclusive || 0), 1);

    empty.forEach(c => {
      /* 1. lo lejos que queda la colecta más cercana, con techo: más allá de
         cierta distancia el territorio es igual de desconocido */
      const dTop = Math.min(c.dist, ctx.distCap || 250);
      const sDist = dTop / Math.min(maxDist, ctx.distCap || 250);
      /* 2. la riqueza que hay alrededor: donde el vecindario es diverso, es
         razonable esperar que aquí también lo sea */
      const sRich = (c.nbRichness || 0) / maxRich;
      /* 3. el déficit de la entidad (o del país, con el mundo como territorio) */
      const sState = cellDeficit(c, ctx.stateDeficit);
      /* 4. tipos exclusivos cerca: zonas con material que no está en ninguna otra parte */
      const sExcl = (c.nbExclusive || 0) / maxExcl;
      c.score = W.distance * sDist + W.richness * sRich + W.state * sState + W.exclusive * sExcl;
      c.parts = { dist: W.distance * sDist, rich: W.richness * sRich, state: W.state * sState, excl: W.exclusive * sExcl };
    });
    /* desempate documentado: a igual puntaje, primero la de más riqueza en el
       vecindario, luego la más lejana, luego la más al norte y la más al oeste */
    return empty.slice().sort((a, b) => (b.score - a.score) || ((b.nbRichness || 0) - (a.nbRichness || 0))
      || ((isFinite(b.dist) ? b.dist : -1) - (isFinite(a.dist) ? a.dist : -1)) || (b.lat - a.lat) || (a.lon - b.lon));
  }

  /* déficit por entidad (o por país): 0 = la mejor cubierta, 1 = la peor.
     Densidad = accesiones cuyo PROPIO punto cae en la unidad ÷ su superficie.
     De paso se informa cuántas celdas toca cada unidad y a cuántas celdas
     completas equivale su superficie. */
  function stateDeficits(cells) {
    const scope = cells.length ? cells[0].scope || 'mx' : 'mx';
    const U = unitsOf(scope);
    const per = new Map();
    const entry = code => {
      if (!per.has(code)) {
        const u = U.byCode.get(code);
        per.set(code, { cells: 0, n: 0, filled: 0, km2: u ? u.km2 : NaN, cellEq: 0 });
      }
      return per.get(code);
    };
    cells.forEach(c => {
      (c.shares || new Map()).forEach((v, code) => {
        const e = entry(code);
        e.cells++;
        if ((c.unitCounts && c.unitCounts.get(code)) > 0) e.filled++;
      });
      (c.unitCounts || new Map()).forEach((v, code) => { entry(code).n += v; });
    });
    /* celdas equivalentes: superficie de la unidad entre la de una celda a su latitud */
    per.forEach((e, code) => {
      const u = U.byCode.get(code);
      const lat = u ? anchorOf(u)[1] : 0;
      const size = cells.length ? cells[0].size : 1;
      e.cellEq = e.km2 / (size * size * 111.32 * 111.32 * Math.max(0.05, Math.cos(lat * Math.PI / 180)));
      e.density = isFinite(e.km2) && e.km2 > 0 ? 1e4 * e.n / e.km2 : 0;   /* accesiones por 10 000 km² */
    });
    const maxD = Math.max(...[...per.values()].map(e => e.density), 1e-12);
    const out = new Map([...per.entries()].map(([k, e]) => [k, 1 - e.density / maxD]));
    return { deficit: out, per };
  }

  /* ---------- complementariedad: el conjunto mínimo que captura todo ---------- */
  /* units: [{key,label,set}] → orden voraz y curva de cuántos tipos se acumulan */
  function complementarity(units) {
    const remaining = new Set();
    units.forEach(u => u.set.forEach(t => remaining.add(t)));
    const total = remaining.size;
    const left = units.slice();
    const order = [];
    while (remaining.size && left.length) {
      let best = null, bestGain = -1;
      for (const u of left) {
        const gain = [...u.set].filter(t => remaining.has(t)).length;
        if (gain > bestGain || (gain === bestGain && best && u.set.size > best.set.size)) { best = u; bestGain = gain; }
      }
      if (!best || bestGain <= 0) break;
      best.set.forEach(t => remaining.delete(t));
      order.push({ unit: best, gain: bestGain, cum: total - remaining.size, pct: 100 * (total - remaining.size) / total });
      left.splice(left.indexOf(best), 1);
    }
    return { order, total, covered: total - remaining.size, missing: [...remaining] };
  }

  /* ---------- vacíos que no son geográficos ---------- */
  /* la unidad geográfica de una accesión: su entidad si cae en México, su país
     si cae en otro lado (por el punto o, si cae en el mar, por ORIGCTY). Las
     claves llevan prefijo para que «MEX» (Estado de México) no choque con
     «MEX» (el país). */
  function siteOf(lon, lat, row) {
    const s = GEO.stateOf(lon, lat);
    if (s) return 'st:' + s.code;
    const c = GEO.countryOf(lon, lat);
    const a3 = c ? (c.a3 || c.a2) : String((row && row.ORIGCTY) || '').trim().toUpperCase();
    return a3 ? 'ct:' + a3 : '';
  }
  /* rutas que regeneran planta: el ADN es respaldo de información, no de germoplasma vivo */
  const NOT_LIVING = ['insitu', 'onfarm', 'dna'];

  function collectionGaps(rows, classMode) {
    const byType = new Map();
    rows.forEach((r, i) => {
      const t = DIV.classOf(r, classMode);
      if (!t || t === '—') return;
      if (!byType.has(t)) byType.set(t, { type: t, rows: [], routes: new Set(), dupl: 0, sites: new Set(), coords: 0 });
      const e = byType.get(t);
      e.rows.push(i);
      const route = MCPD.consRoute(r);
      if (route) e.routes.add(route);
      if (MCPD.hasSafetyDup(r)) e.dupl++;
      const lon = Number(r.DECLONGITUDE), lat = Number(r.DECLATITUDE);
      if (String(r.DECLONGITUDE ?? '').trim() !== '' && String(r.DECLATITUDE ?? '').trim() !== ''
        && isFinite(lon) && isFinite(lat) && !(lon === 0 && lat === 0)) {
        e.coords++;
        const s = siteOf(lon, lat, r);
        if (s) e.sites.add(s);
      }
    });

    const risks = [];
    for (const e of byType.values()) {
      const n = e.rows.length;
      const routes = [...e.routes];
      const exSitu = routes.filter(r => !['insitu', 'onfarm'].includes(r));
      const living = routes.filter(r => !NOT_LIVING.includes(r));
      const onlyField = living.length === 1 && living[0] === 'field';
      const onlyInSitu = exSitu.length === 0 && routes.length > 0;
      /* guardado sólo como ADN (con o sin in situ): no hay de dónde regenerar planta */
      const onlyDNA = routes.includes('dna') && living.length === 0;
      const flags = [];
      if (n === 1) flags.push('single');
      if (!e.dupl) flags.push('noDuplicate');
      if (onlyField) flags.push('onlyField');
      if (onlyInSitu) flags.push('onlyInSitu');
      if (onlyDNA) flags.push('onlyDNA');
      if (e.coords === 0) flags.push('noCoords');
      if (e.sites.size === 1 && n > 1) flags.push('oneSite');
      /* el riesgo pesa: perderlo todo de una vez es peor que tenerlo incompleto */
      const weight = (flags.includes('single') ? 3 : 0) + (flags.includes('noDuplicate') ? 2 : 0)
        + (flags.includes('onlyField') ? 2 : 0) + (flags.includes('onlyInSitu') ? 3 : 0)
        + (flags.includes('onlyDNA') ? 3 : 0)
        + (flags.includes('noCoords') ? 1 : 0) + (flags.includes('oneSite') ? 1 : 0);
      risks.push({ type: e.type, n, routes, dupl: e.dupl, sites: e.sites.size, siteKeys: [...e.sites], coords: e.coords, flags, weight, rows: e.rows });
    }
    risks.sort((a, b) => b.weight - a.weight || a.n - b.n || String(a.type).localeCompare(String(b.type)));
    return risks;
  }

  /* franjas altitudinales intermedias sin ninguna accesión.
     Las altitudes imposibles se dejan fuera: una sola accesión con 25 000 m
     inventaría cuarenta franjas vacías que no existen. */
  function elevationGaps(points, band) {
    const b = band || 500;
    const raw = points.map(p => Number(p.row.ELEVATION)).filter(v => isFinite(v));
    const els = raw.filter(v => GEO.elevPlausible(v));
    const dropped = raw.length - els.length;
    if (els.length < 3) return { bands: [], gaps: [], dropped };
    const lo = Math.floor(Math.min(...els) / b) * b, hi = Math.floor(Math.max(...els) / b) * b;
    const counts = new Map();
    els.forEach(v => { const k = Math.floor(v / b) * b; counts.set(k, (counts.get(k) || 0) + 1); });
    const bands = [];
    for (let v = lo; v <= hi; v += b) bands.push({ from: v, to: v + b, n: counts.get(v) || 0 });
    return { bands, gaps: bands.filter(x => x.n === 0), dropped };
  }

  /* ---------- el análisis completo ---------- */
  function analyse(rows, opts) {
    const o = Object.assign({
      size: 1, scope: 'mx', classMode: 'species', weights: null,
      distCap: 250, radiusKm: NEIGHBOUR_KM, radius: null, band: 500, topN: 25,
    }, opts || {});

    const points = GEO.pointsOf(rows);
    /* las accesiones del territorio que caen en el mar también tienen su celda */
    const sea = points.filter(p => !placePoint(p, o.scope).outside && !unitAt(o.scope, p.lon, p.lat));
    const cells = areaGrid(o.size, o.scope, null, sea);
    const { orphan } = fillCells(cells, points, o.classMode);

    /* tipos exclusivos: los que sólo viven en una celda */
    const where = new Map();
    cells.forEach(c => c.types.forEach(t => {
      if (!where.has(t)) where.set(t, []);
      where.get(t).push(c.key);
    }));
    const exclusive = new Set([...where.entries()].filter(([, v]) => v.length === 1).map(([t]) => t));
    cells.forEach(c => { c.exclusiveTypes = [...c.types].filter(t => exclusive.has(t)).length; });

    nearestDistance(cells, points);
    /* radio en celdas: el que se pida explícitamente o el equivalente a radiusKm */
    o.radius = o.radius != null ? o.radius : radiusCells(o.radiusKm, o.size);
    neighbourhood(cells, o.radius);
    const { deficit, per } = stateDeficits(cells);
    const W = Object.assign({}, DEFAULT_WEIGHTS, o.weights || {});
    const weightsZero = !(W.distance + W.richness + W.state + W.exclusive > 0);
    const prio = priorities(cells, { stateDeficit: deficit, distCap: o.distCap }, o.weights);

    const filled = cells.filter(c => c.n > 0);
    const units = filled.map(c => ({ key: c.key, label: `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)}`, set: c.types, cell: c }));
    const comp = complementarity(units);

    return {
      opts: o, points, cells, filled, empty: cells.filter(c => c.n === 0), orphan,
      coverage: cells.length ? 100 * filled.length / cells.length : 0,
      priorities: prio.slice(0, o.topN), allPriorities: prio, weightsZero,
      stateStats: per, stateDeficit: deficit,
      complementarity: comp,
      risks: collectionGaps(rows, o.classMode),
      elevation: elevationGaps(points, o.band),
      exclusive,
    };
  }

  window.GAPS = {
    DEFAULT_WEIGHTS, NEIGHBOUR_KM, radiusCells, areaGrid, fillCells, nearestDistance, neighbourhood,
    stateDeficits, priorities, cellDeficit, complementarity, collectionGaps, elevationGaps, analyse,
    unitsOf, unitAt, placePoint, siteOf,
  };
})();
