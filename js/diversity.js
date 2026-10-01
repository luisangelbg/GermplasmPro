/* GermplasmPro — el motor del Bloque 5: cuánta diversidad hay y dónde está.

   Una colección no se mide por cuántos sobres tiene, sino por cuántas cosas
   distintas guarda y por lo repartidas que están. Esto calcula, para cualquier
   unidad geográfica (entidad de México, país, celda de rejilla o franja
   altitudinal), lo que se usa en la literatura de recursos fitogenéticos:

     · Riqueza observada S y número de accesiones N.
     · Shannon H' = −Σ p ln p, Gini-Simpson 1 − Σ p², equitatividad de Pielou
       J' = H'/ln S y los números de Hill (q = 0, 1 y 2), que son las tres
       medidas anteriores expresadas en «especies efectivas» y por eso
       comparables entre sí.
     · Rarefacción de Hurlbert: cuántos tipos esperaría encontrar cada unidad
       si de todas se hubiera tomado el mismo número de accesiones. Sin esto,
       comparar la riqueza de un estado con 30 colectas contra otro con 3 es
       comparar el esfuerzo, no la diversidad.
     · Estimadores de lo que falta por colectar: Chao1 (con abundancias),
       Chao2, jackknife de primer y segundo orden (con presencias por unidad) y
       la cobertura de muestreo de Good-Turing, C = 1 − f1/n.
     · Composición entre unidades: Jaccard, Sørensen y Bray-Curtis, el
       agrupamiento UPGMA que resume esas distancias, y la prueba de Mantel
       entre distancia geográfica y disimilitud de composición, que es la forma
       estándar de preguntar si «lo cercano se parece».

   Todo se calcula aquí, sin dependencias, y el Bloque 5 sólo lo dibuja. */

(function () {

  /* ---------- logaritmo de la función gamma (Lanczos), para los binomiales ---------- */
  const LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1;
    let x = 0.99999999999980993;
    for (let i = 0; i < LG.length; i++) x += LG[i] / (z + i + 1);
    const t = z + LG.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  const lchoose = (n, k) => (k < 0 || k > n) ? -Infinity : lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

  /* ---------- índices sobre un vector de abundancias ---------- */
  function indices(counts) {
    const c = counts.filter(v => v > 0);
    const N = c.reduce((a, v) => a + v, 0);
    const S = c.length;
    if (!N) return { N: 0, S: 0, H: 0, simpson: 0, invSimpson: 0, pielou: 0, q0: 0, q1: 0, q2: 0, f1: 0, f2: 0, coverage: NaN, singletons: 0 };
    let H = 0, D = 0;
    for (const v of c) { const p = v / N; H -= p * Math.log(p); D += p * p; }
    const f1 = c.filter(v => v === 1).length, f2 = c.filter(v => v === 2).length;
    return {
      N, S, H,
      simpson: 1 - D,
      invSimpson: D > 0 ? 1 / D : 0,
      pielou: S > 1 ? H / Math.log(S) : (S === 1 ? 1 : 0),
      q0: S, q1: Math.exp(H), q2: D > 0 ? 1 / D : 0,
      f1, f2,
      coverage: N > 0 ? 1 - f1 / N : NaN,
      singletons: f1,
    };
  }

  /* ---------- rarefacción de Hurlbert: E[S] al tomar n de N ---------- */
  function rarefy(counts, n) {
    const c = counts.filter(v => v > 0);
    const N = c.reduce((a, v) => a + v, 0);
    if (!N || n <= 0) return 0;
    if (n >= N) return c.length;
    const lcN = lchoose(N, n);
    let s = 0;
    for (const Ni of c) {
      const l = lchoose(N - Ni, n);
      s += l === -Infinity ? 1 : 1 - Math.exp(l - lcN);
    }
    return s;
  }
  /* varianza de la rarefacción (Heck, van Belle y Simberloff, 1975) */
  function rarefyVar(counts, n) {
    const c = counts.filter(v => v > 0);
    const N = c.reduce((a, v) => a + v, 0);
    if (!N || n <= 0 || n >= N) return 0;
    const lcN = lchoose(N, n);
    const pi = c.map(Ni => {
      const l = lchoose(N - Ni, n);
      return l === -Infinity ? 0 : Math.exp(l - lcN);      /* prob. de NO ver el tipo i */
    });
    let v = 0;
    for (let i = 0; i < c.length; i++) v += pi[i] * (1 - pi[i]);
    for (let i = 0; i < c.length; i++) {
      for (let j = i + 1; j < c.length; j++) {
        const lij = lchoose(N - c[i] - c[j], n);
        const pij = lij === -Infinity ? 0 : Math.exp(lij - lcN);
        v += 2 * (pij - pi[i] * pi[j]);
      }
    }
    return Math.max(0, v);
  }
  /* curva de acumulación: E[S] para n = 1, 2, … N */
  function accumulationCurve(counts, maxPoints) {
    const N = counts.filter(v => v > 0).reduce((a, v) => a + v, 0);
    if (!N) return [];
    const step = Math.max(1, Math.ceil(N / (maxPoints || 60)));
    const out = [];
    for (let n = 1; n <= N; n += step) out.push({ n, S: rarefy(counts, n), sd: Math.sqrt(rarefyVar(counts, n)) });
    if (out[out.length - 1].n !== N) out.push({ n: N, S: rarefy(counts, N), sd: 0 });
    return out;
  }

  /* ---------- lo que falta por colectar ---------- */
  /* Chao1, con abundancias (corrección para f2 = 0 incluida) */
  function chao1(counts) {
    const c = counts.filter(v => v > 0);
    const S = c.length;
    const f1 = c.filter(v => v === 1).length, f2 = c.filter(v => v === 2).length;
    const est = f2 > 0 ? S + (f1 * f1) / (2 * f2) : S + (f1 * (f1 - 1)) / 2;
    /* varianza aproximada (Chao 1987) */
    let varEst = 0;
    if (f2 > 0) {
      const r = f1 / f2;
      varEst = f2 * (0.5 * r * r + r * r * r + 0.25 * Math.pow(r, 4));
    } else if (f1 > 0) {
      varEst = 0.5 * f1 * (f1 - 1) + 0.25 * f1 * (2 * f1 - 1) * (2 * f1 - 1) - Math.pow(f1, 4) / (4 * est);
    }
    /* con uno o ningún dobletón, Chao1 se dispara: hay que decirlo */
    const reliable = f2 >= 3;
    return { S, est, sd: Math.sqrt(Math.max(0, varEst)), f1, f2, reliable };
  }
  /* Chao2 y jackknife, con la matriz de presencias: unidades × tipos */
  function incidenceEstimators(units) {
    /* units: array de Set (los tipos presentes en cada unidad) */
    const m = units.length;
    if (!m) return { S: 0, chao2: 0, jack1: 0, jack2: 0, q1: 0, q2: 0, m: 0 };
    const freq = new Map();
    units.forEach(set => set.forEach(t => freq.set(t, (freq.get(t) || 0) + 1)));
    const S = freq.size;
    const vals = [...freq.values()];
    const q1 = vals.filter(v => v === 1).length, q2 = vals.filter(v => v === 2).length;
    const corr = (m - 1) / m;
    const chao2 = q2 > 0 ? S + corr * (q1 * q1) / (2 * q2) : S + corr * (q1 * (q1 - 1)) / 2;
    const jack1 = S + q1 * corr;
    const jack2 = m > 2 ? S + q1 * (2 * m - 3) / m - q2 * Math.pow(m - 2, 2) / (m * (m - 1)) : jack1;
    return { S, chao2, jack1, jack2, q1, q2, m };
  }

  /* ---------- composición entre unidades ---------- */
  function jaccard(a, b) {
    const inter = [...a].filter(x => b.has(x)).length;
    const uni = new Set([...a, ...b]).size;
    return uni ? inter / uni : 0;
  }
  function sorensen(a, b) {
    const inter = [...a].filter(x => b.has(x)).length;
    return (a.size + b.size) ? 2 * inter / (a.size + b.size) : 0;
  }
  function brayCurtis( va, vb) {
    let num = 0, den = 0;
    const keys = new Set([...Object.keys(va), ...Object.keys(vb)]);
    keys.forEach(k => {
      const x = va[k] || 0, y = vb[k] || 0;
      num += Math.abs(x - y); den += x + y;
    });
    return den ? num / den : 0;
  }
  /* matriz de disimilitud entre unidades: 1 − similitud */
  function distanceMatrix(units, method) {
    const n = units.length;
    const D = [...Array(n)].map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let d;
        if (method === 'bray') d = brayCurtis(units[i].counts, units[j].counts);
        else if (method === 'sorensen') d = 1 - sorensen(units[i].set, units[j].set);
        else d = 1 - jaccard(units[i].set, units[j].set);
        D[i][j] = D[j][i] = d;
      }
    }
    return D;
  }

  /* UPGMA: agrupamiento por promedios no ponderados */
  function upgma(D, labels) {
    const n = D.length;
    if (n < 2) return null;
    let clusters = labels.map((l, i) => ({ id: i, label: l, members: [i], size: 1, height: 0, children: null }));
    let dist = D.map(r => r.slice());
    let next = n;
    while (clusters.length > 1) {
      let bi = 0, bj = 1, best = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          if (dist[i][j] < best) { best = dist[i][j]; bi = i; bj = j; }
        }
      }
      const A = clusters[bi], B = clusters[bj];
      const node = {
        id: next++, label: '', members: A.members.concat(B.members),
        size: A.size + B.size, height: best / 2, children: [A, B],
      };
      /* nuevas distancias: promedio ponderado por tamaño */
      const nd = [];
      for (let k = 0; k < clusters.length; k++) {
        if (k === bi || k === bj) continue;
        nd.push((dist[bi][k] * A.size + dist[bj][k] * B.size) / (A.size + B.size));
      }
      const keep = clusters.filter((_, k) => k !== bi && k !== bj);
      const newDist = [];
      for (let x = 0; x < keep.length; x++) {
        const row = [];
        for (let y = 0; y < keep.length; y++) {
          const ox = clusters.indexOf(keep[x]), oy = clusters.indexOf(keep[y]);
          row.push(dist[ox][oy]);
        }
        row.push(nd[x]);
        newDist.push(row);
      }
      newDist.push(nd.concat([0]));
      clusters = keep.concat([node]);
      dist = newDist;
    }
    return clusters[0];
  }
  /* hojas en el orden en que cuelgan del árbol, para ordenar el mapa de calor */
  function leafOrder(node, out) {
    out = out || [];
    if (!node) return out;
    if (!node.children) { out.push(node.members[0]); return out; }
    leafOrder(node.children[0], out);
    leafOrder(node.children[1], out);
    return out;
  }

  /* ---------- prueba de Mantel ---------- */
  function pearson(x, y) {
    const n = x.length;
    if (n < 3) return NaN;
    const mx = x.reduce((a, v) => a + v, 0) / n, my = y.reduce((a, v) => a + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    return (sxx > 0 && syy > 0) ? sxy / Math.sqrt(sxx * syy) : NaN;
  }
  function lowerTriangle(M, order) {
    const out = [];
    const n = M.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push(M[order ? order[i] : i][order ? order[j] : j]);
    return out;
  }
  /* correlación entre dos matrices de distancia, con permutaciones */
  function mantel(A, B, perms, seed) {
    const n = A.length;
    if (n < 4) return { r: NaN, p: NaN, n, perms: 0 };
    const a = lowerTriangle(A), b = lowerTriangle(B);
    const r = pearson(a, b);
    const P = perms == null ? 999 : perms;
    if (!isFinite(r) || P <= 0) return { r, p: NaN, n, perms: 0 };
    const rnd = mulberry32(seed || 20260923);
    let ge = 0;
    const idx = [...Array(n).keys()];
    for (let k = 0; k < P; k++) {
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      const rp = pearson(lowerTriangle(A, idx), b);
      if (isFinite(rp) && Math.abs(rp) >= Math.abs(r)) ge++;
    }
    return { r, p: (ge + 1) / (P + 1), n, perms: P };
  }

  /* ---------- armar las unidades geográficas ---------- */
  /* classOf: qué cuenta como «tipo» (especie, cultivo, taxón + nombre) */
  function classOf(row, mode) {
    if (mode === 'crop') return String(row.CROPNAME || '').trim() || '—';
    if (mode === 'name') return String(row.ACCENAME || '').trim() || '—';
    if (mode === 'genus') return String(row.GENUS || '').trim() || '—';
    return [row.GENUS, row.SPECIES].filter(Boolean).join(' ').trim() || '—';
  }

  /* agrupa los puntos en unidades; devuelve [{key, label, lat, lon, items, counts, set, idx}] */
  function buildUnits(points, unitMode, classMode, opts) {
    const o = Object.assign({ grid: 1, band: 500 }, opts || {});
    const map = new Map();
    points.forEach(p => {
      let key = '', label = '', lat = p.lat, lon = p.lon;
      if (unitMode === 'state') {
        const s = GEO.stateOf(p.lon, p.lat);
        if (!s) return;
        key = s.code; label = s.name;
        lat = (s.bbox[1] + s.bbox[3]) / 2; lon = (s.bbox[0] + s.bbox[2]) / 2;
      } else if (unitMode === 'country') {
        const c = GEO.countryOf(p.lon, p.lat);
        const a3 = c ? (c.a3 || c.a2) : String(p.row.ORIGCTY || '').toUpperCase();
        if (!a3) return;
        key = a3;
        const hit = MCPD.COUNTRY_MAP[a3];
        label = hit ? T(hit.es, hit.en) : a3;
        if (c) { lat = (c.bbox[1] + c.bbox[3]) / 2; lon = (c.bbox[0] + c.bbox[2]) / 2; }
      } else if (unitMode === 'grid') {
        key = GEO.cellKey(p.lon, p.lat, o.grid);
        const b = GEO.cellBBox(key, o.grid);
        label = `${fmt((b[1] + b[3]) / 2, 2)}, ${fmt((b[0] + b[2]) / 2, 2)}`;
        lat = (b[1] + b[3]) / 2; lon = (b[0] + b[2]) / 2;
      } else {              /* franja altitudinal */
        const e = Number(p.row.ELEVATION);
        if (!isFinite(e)) return;
        const band = Math.floor(e / o.band) * o.band;
        key = String(band);
        label = `${fmtInt(band)}–${fmtInt(band + o.band)} m`;
      }
      if (!map.has(key)) map.set(key, { key, label, lat, lon, items: [], counts: {}, set: new Set() });
      const u = map.get(key);
      u.items.push(p);
      const cls = classOf(p.row, classMode);
      u.counts[cls] = (u.counts[cls] || 0) + 1;
      u.set.add(cls);
    });
    const units = [...map.values()];
    units.forEach(u => {
      u.abund = Object.values(u.counts);
      Object.assign(u, indices(u.abund));
      u.elev = u.items.map(p => Number(p.row.ELEVATION)).filter(v => isFinite(v));
      u.meanElev = u.elev.length ? mean(u.elev) : NaN;
    });
    if (unitMode === 'band') units.sort((a, b) => Number(a.key) - Number(b.key));
    else units.sort((a, b) => b.N - a.N);
    return units;
  }

  /* los tipos que sólo viven en una unidad: lo que se perdería si se pierde */
  function exclusives(units) {
    const where = new Map();
    units.forEach(u => u.set.forEach(t => {
      if (!where.has(t)) where.set(t, []);
      where.get(t).push(u.key);
    }));
    const out = new Map();
    for (const [t, ks] of where) if (ks.length === 1) {
      if (!out.has(ks[0])) out.set(ks[0], []);
      out.get(ks[0]).push(t);
    }
    return out;
  }

  /* el retrato completo que consume el Bloque 5 */
  function analyse(points, unitMode, classMode, opts) {
    const o = Object.assign({ grid: 1, band: 500, dist: 'jaccard', perms: 999 }, opts || {});
    const units = buildUnits(points, unitMode, classMode, o);
    const all = {};
    points.forEach(p => { const c = classOf(p.row, classMode); all[c] = (all[c] || 0) + 1; });
    const total = indices(Object.values(all));
    const inc = incidenceEstimators(units.map(u => u.set));
    const ch1 = chao1(Object.values(all));
    const excl = exclusives(units);
    units.forEach(u => { u.exclusive = (excl.get(u.key) || []).length; });

    /* rarefacción a un esfuerzo común. Por omisión, el primer cuartil de los N
       de las unidades: un valor al que llegan tres de cada cuatro. */
    const ns = units.map(u => u.N).filter(n => n > 0).sort((a, b) => a - b);
    let nCommon = ns.length ? Math.max(2, ns[Math.floor(ns.length * 0.25)]) : 0;
    if (o.effort === 'median' && ns.length) nCommon = Math.max(2, ns[Math.floor(ns.length * 0.5)]);
    else if (o.effort === 'min' && ns.length) nCommon = Math.max(2, ns[0]);
    else if (isFinite(Number(o.effort)) && Number(o.effort) >= 2) nCommon = Math.round(Number(o.effort));
    units.forEach(u => { u.rare = u.N >= nCommon ? rarefy(u.abund, nCommon) : NaN; });

    /* composición entre las unidades con suficientes accesiones */
    const big = units.filter(u => u.N >= 2);
    let D = null, tree = null, order = null, mant = null;
    if (big.length >= 3) {
      D = distanceMatrix(big, o.dist);
      tree = upgma(D, big.map(u => u.label));
      order = leafOrder(tree);
      const geoOK = big.every(u => isFinite(u.lat) && isFinite(u.lon));
      if (geoOK && big.length >= 4) {
        const G = big.map(a => big.map(b => haversine(a.lat, a.lon, b.lat, b.lon)));
        mant = mantel(G, D, o.perms);
      }
    }

    /* beta de Whittaker: cuántas «unidades de recambio» hay en la colección */
    const alphaBar = units.length ? mean(units.map(u => u.S)) : 0;
    const beta = alphaBar > 0 ? total.S / alphaBar - 1 : 0;

    return {
      units, total, inc, chao1: ch1, nCommon, big, D, tree, order, mantel: mant,
      beta, alphaBar, classMode, unitMode, opts: o,
      curve: accumulationCurve(Object.values(all)),
      exclusives: excl,
    };
  }

  window.DIV = {
    lgamma, lchoose, indices, rarefy, rarefyVar, accumulationCurve,
    chao1, incidenceEstimators, jaccard, sorensen, brayCurtis, distanceMatrix,
    upgma, leafOrder, pearson, lowerTriangle, mantel,
    classOf, buildUnits, exclusives, analyse,
  };
})();
