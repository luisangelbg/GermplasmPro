/* GermplasmPro — el motor del Bloque 6: qué falta por colectar y qué está en
   riesgo de perderse.

   Un análisis de vacíos responde a tres preguntas distintas, y conviene no
   confundirlas:

     1. VACÍOS GEOGRÁFICOS. ¿Qué parte del territorio no tiene ninguna colecta?
        Se tira una rejilla sobre el área de interés, se descartan las celdas
        que caen en el mar y se mira cuáles quedaron vacías y a qué distancia
        está de ellas la colecta más cercana.

     2. PRIORIDADES DE COLECTA. No todas las celdas vacías valen lo mismo. La
        app las ordena con un índice explícito que combina cuatro cosas: lo
        lejos que está la colecta más cercana, la riqueza que hay en las celdas
        vecinas, lo poco representada que está la entidad, y si por ahí cerca
        hay tipos que no están en ninguna otra parte. Los pesos se ven y se
        pueden cambiar: el índice no es una caja negra.

     3. VACÍOS DE LA COLECCIÓN. Aparte del mapa, hay huecos que no son
        geográficos: tipos con una sola accesión, tipos sin duplicado de
        seguridad, material que sólo existe en banco de campo (la ruta más
        frágil), poblaciones que sólo están in situ sin respaldo ex situ, y
        franjas altitudinales intermedias sin nada.

   LÍMITE HONESTO. Esto no es un análisis ecogeográfico completo: para saber
   qué combinaciones de clima y suelo faltan hacen falta capas ambientales, y
   GermplasmPro no las trae ni las descarga. Lo que sí hace es todo lo que se
   puede hacer con el pasaporte y con la geografía, que es bastante, y decirlo
   con claridad en vez de disfrazarlo. */

(function () {

  /* ---------- la rejilla del área de interés ---------- */
  /* scope: 'mx' (celdas cuyo centro cae en alguna entidad) | 'world' (en tierra) */
  function areaGrid(size, scope, bbox) {
    const out = [];
    const b = bbox || (scope === 'world' ? GEO.WORLD_BBOX : GEO.MX_BBOX);
    const i0 = Math.floor(b[0] / size), i1 = Math.floor(b[2] / size);
    const j0 = Math.floor(b[1] / size), j1 = Math.floor(b[3] / size);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const lon = (i + 0.5) * size, lat = (j + 0.5) * size;
        let land = null, stateCode = '', countryCode = '';
        if (scope === 'world') {
          land = GEO.countryOf(lon, lat);
          if (!land) continue;
          countryCode = land.a3 || land.a2;
          const s = GEO.stateOf(lon, lat);
          if (s) stateCode = s.code;
        } else {
          land = GEO.stateOf(lon, lat);
          if (!land) continue;
          stateCode = land.code;
          countryCode = 'MEX';
        }
        out.push({ key: `${i}|${j}`, i, j, lon, lat, size, stateCode, countryCode, n: 0, items: [], types: new Set() });
      }
    }
    return out;
  }

  /* reparte los puntos en las celdas de la rejilla */
  function fillCells(cells, points, classMode) {
    const byKey = new Map(cells.map(c => [c.key, c]));
    const orphan = [];
    points.forEach(p => {
      const k = GEO.cellKey(p.lon, p.lat, cells.length ? cells[0].size : 1);
      const c = byKey.get(k);
      if (!c) { orphan.push(p); return; }
      c.n++; c.items.push(p);
      c.types.add(DIV.classOf(p.row, classMode));
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

  /* riqueza y exclusividad en el vecindario de cada celda */
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

  function priorities(cells, ctx, weights) {
    const W = Object.assign({}, DEFAULT_WEIGHTS, weights || {});
    const empty = cells.filter(c => c.n === 0);
    if (!empty.length) return [];
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
      /* 3. el déficit de la entidad: accesiones por celda de esa entidad */
      const st = ctx.stateDeficit.get(c.stateCode);
      const sState = st == null ? 0.5 : st;
      /* 4. tipos exclusivos cerca: zonas con material que no está en ninguna otra parte */
      const sExcl = (c.nbExclusive || 0) / maxExcl;
      c.score = W.distance * sDist + W.richness * sRich + W.state * sState + W.exclusive * sExcl;
      c.parts = { dist: W.distance * sDist, rich: W.richness * sRich, state: W.state * sState, excl: W.exclusive * sExcl };
    });
    return empty.slice().sort((a, b) => b.score - a.score);
  }

  /* déficit por entidad: 0 = la mejor cubierta, 1 = la peor */
  function stateDeficits(cells) {
    const per = new Map();
    cells.forEach(c => {
      if (!c.stateCode) return;
      if (!per.has(c.stateCode)) per.set(c.stateCode, { cells: 0, n: 0, filled: 0 });
      const e = per.get(c.stateCode);
      e.cells++; e.n += c.n; if (c.n > 0) e.filled++;
    });
    const dens = [...per.entries()].map(([k, e]) => [k, e.n / Math.max(1, e.cells)]);
    const maxD = Math.max(...dens.map(d => d[1]), 1e-9);
    const out = new Map(dens.map(([k, d]) => [k, 1 - d / maxD]));
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
      if (String(r.DUPLSITE || '').trim()) e.dupl++;
      const lon = Number(r.DECLONGITUDE), lat = Number(r.DECLATITUDE);
      if (isFinite(lon) && isFinite(lat) && !(lon === 0 && lat === 0)) {
        e.coords++;
        const s = GEO.stateOf(lon, lat);
        if (s) e.sites.add(s.code);
      }
    });

    const risks = [];
    for (const e of byType.values()) {
      const n = e.rows.length;
      const exSitu = [...e.routes].filter(r => !['insitu', 'onfarm'].includes(r));
      const onlyField = exSitu.length === 1 && exSitu[0] === 'field';
      const onlyInSitu = exSitu.length === 0 && e.routes.size > 0;
      const flags = [];
      if (n === 1) flags.push('single');
      if (!e.dupl) flags.push('noDuplicate');
      if (onlyField) flags.push('onlyField');
      if (onlyInSitu) flags.push('onlyInSitu');
      if (e.coords === 0) flags.push('noCoords');
      if (e.sites.size === 1 && n > 1) flags.push('oneSite');
      /* el riesgo pesa: perderlo todo de una vez es peor que tenerlo incompleto */
      const weight = (flags.includes('single') ? 3 : 0) + (flags.includes('noDuplicate') ? 2 : 0)
        + (flags.includes('onlyField') ? 2 : 0) + (flags.includes('onlyInSitu') ? 3 : 0)
        + (flags.includes('noCoords') ? 1 : 0) + (flags.includes('oneSite') ? 1 : 0);
      risks.push({ type: e.type, n, routes: [...e.routes], dupl: e.dupl, sites: e.sites.size, coords: e.coords, flags, weight, rows: e.rows });
    }
    risks.sort((a, b) => b.weight - a.weight || a.n - b.n);
    return risks;
  }

  /* franjas altitudinales intermedias sin ninguna accesión.
     Las altitudes imposibles se dejan fuera: una sola accesión con 25 000 m
     inventaría cuarenta franjas vacías que no existen. */
  function elevationGaps(points, band) {
    const b = band || 500;
    const raw = points.map(p => Number(p.row.ELEVATION)).filter(v => isFinite(v));
    const els = raw.filter(v => v >= -430 && v <= 6500);
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
      distCap: 250, radius: 2, band: 500, topN: 25,
    }, opts || {});

    const points = GEO.pointsOf(rows);
    const cells = areaGrid(o.size, o.scope);
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
    neighbourhood(cells, o.radius);
    const { deficit, per } = stateDeficits(cells);
    const prio = priorities(cells, { stateDeficit: deficit, distCap: o.distCap }, o.weights);

    const filled = cells.filter(c => c.n > 0);
    const units = filled.map(c => ({ key: c.key, label: `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)}`, set: c.types, cell: c }));
    const comp = complementarity(units);

    return {
      opts: o, points, cells, filled, empty: cells.filter(c => c.n === 0), orphan,
      coverage: cells.length ? 100 * filled.length / cells.length : 0,
      priorities: prio.slice(0, o.topN), allPriorities: prio,
      stateStats: per, stateDeficit: deficit,
      complementarity: comp,
      risks: collectionGaps(rows, o.classMode),
      elevation: elevationGaps(points, o.band),
      exclusive,
    };
  }

  window.GAPS = {
    DEFAULT_WEIGHTS, areaGrid, fillCells, nearestDistance, neighbourhood,
    stateDeficits, priorities, complementarity, collectionGaps, elevationGaps, analyse,
  };
})();
