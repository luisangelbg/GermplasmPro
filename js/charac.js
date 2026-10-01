/* GermplasmPro — el motor del Bloque 7: caracterización y colección núcleo.

   Lo que un banco mide de cada accesión no es homogéneo: días a floración y
   altura de planta son números, el color del grano y el hábito de crecimiento
   son categorías, y la mitad de las celdas suelen estar vacías. Todo lo que
   sigue está hecho para esa mezcla:

     · DESCRIPTIVA POR CARÁCTER. Media, desviación, coeficiente de variación y
       rango en los cuantitativos; frecuencias y diversidad de Shannon en los
       cualitativos, que es como se mide la diversidad fenotípica de una
       colección descriptor por descriptor.

     · DISTANCIA DE GOWER (1971). La que admite variables mixtas y datos
       faltantes: cada carácter aporta su diferencia relativa (|xi − xj| / rango
       en los cuantitativos, 0 ó 1 en los cualitativos) y se promedia sólo
       sobre los caracteres que ambas accesiones tienen medidos.

     · PCoA (Gower 1966). Las coordenadas principales de esa matriz de
       distancias, con la descomposición espectral resuelta por el método de
       Jacobi, para ver la colección en dos ejes.

     · AGRUPAMIENTO UPGMA o Ward, corte en k grupos y silueta media, que dice
       si los grupos son reales o los inventó el algoritmo.

     · COLECCIÓN NÚCLEO. El subconjunto pequeño que representa a la colección
       entera. Se ofrecen las cuatro estrategias de asignación clásicas
       (constante, proporcional, logarítmica y raíz cuadrada, Brown 1989) y el
       método M de maximización, más la elección dentro de cada estrato al azar
       o por máxima distancia.

     · VALIDACIÓN del núcleo con los criterios de Hu et al. (2000): MD% (medias
       que difieren), VD% (varianzas que difieren), CR% (rangos conservados) y
       VR% (coeficientes de variación), además de la cobertura de clases
       cualitativas y la comparación de Shannon. Un buen núcleo tiene MD% < 20,
       CR% > 80 y VR% cercano o superior a 100. */

(function () {

  /* ================= distribuciones, para las pruebas t y F ================= */
  /* función beta incompleta regularizada por fracción continua */
  function betacf(a, b, x) {
    const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const lbeta = DIV.lgamma(a + b) - DIV.lgamma(a) - DIV.lgamma(b);
    const front = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2)
      ? front * betacf(a, b, x) / a
      : 1 - front * betacf(b, a, 1 - x) / b;
  }
  /* p a dos colas de la t de Student */
  function tTest2(x, y) {
    const n1 = x.length, n2 = y.length;
    if (n1 < 2 || n2 < 2) return { t: NaN, df: NaN, p: NaN };
    const m1 = mean(x), m2 = mean(y);
    const v1 = x.reduce((a, v) => a + (v - m1) ** 2, 0) / (n1 - 1);
    const v2 = y.reduce((a, v) => a + (v - m2) ** 2, 0) / (n2 - 1);
    const se2 = v1 / n1 + v2 / n2;
    if (se2 <= 0) return { t: 0, df: n1 + n2 - 2, p: 1 };
    const t = (m1 - m2) / Math.sqrt(se2);
    /* grados de libertad de Welch-Satterthwaite */
    const df = (se2 * se2) / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
    const p = ibeta(df / (df + t * t), df / 2, 0.5);
    return { t, df, p: clamp(p, 0, 1), m1, m2, v1, v2 };
  }
  /* p a dos colas de la F para comparar dos varianzas */
  function fTestVar(x, y) {
    const n1 = x.length, n2 = y.length;
    if (n1 < 2 || n2 < 2) return { F: NaN, p: NaN };
    const m1 = mean(x), m2 = mean(y);
    const v1 = x.reduce((a, v) => a + (v - m1) ** 2, 0) / (n1 - 1);
    const v2 = y.reduce((a, v) => a + (v - m2) ** 2, 0) / (n2 - 1);
    if (v1 <= 0 || v2 <= 0) return { F: NaN, p: NaN };
    const big = v1 >= v2, F = big ? v1 / v2 : v2 / v1;
    const d1 = big ? n1 - 1 : n2 - 1, d2 = big ? n2 - 1 : n1 - 1;
    const p = 2 * (1 - ibeta(d1 * F / (d1 * F + d2), d1 / 2, d2 / 2));
    return { F, d1, d2, p: clamp(p, 0, 1), v1, v2 };
  }

  /* ================= los caracteres ================= */
  /* Detecta el tipo de cada columna: cuantitativa si casi todo son números y
     hay suficientes valores distintos; cualitativa en los demás casos. */
  function detectType(values) {
    const v = values.map(x => String(x ?? '').trim()).filter(x => x !== '');
    if (!v.length) return 'empty';
    const nums = v.filter(x => /^[-+]?\d+([.,]\d+)?$/.test(x));
    const uniq = new Set(v.map(x => x.toLowerCase()));
    if (nums.length / v.length > 0.9 && uniq.size > 6) return 'num';
    if (nums.length / v.length > 0.9 && uniq.size <= 6) return 'ord';
    return 'cat';
  }
  function numOf(v) {
    const s = String(v ?? '').trim().replace(',', '.');
    if (s === '') return NaN;
    const x = Number(s);
    return isFinite(x) ? x : NaN;
  }

  /* estadística descriptiva de un carácter */
  function describe(values, type) {
    if (type === 'cat') {
      const counts = new Map();
      values.forEach(v => {
        const s = String(v ?? '').trim();
        if (!s) return;
        counts.set(s, (counts.get(s) || 0) + 1);
      });
      const arr = [...counts.values()];
      const n = arr.reduce((a, b) => a + b, 0);
      const idx = DIV.indices(arr);
      return {
        type, n, classes: counts.size, counts: [...counts.entries()].sort((a, b) => b[1] - a[1]),
        H: idx.H, Hmax: counts.size > 1 ? Math.log(counts.size) : 0,
        evenness: counts.size > 1 ? idx.H / Math.log(counts.size) : (counts.size === 1 ? 1 : 0),
        missing: values.length - n,
      };
    }
    const x = values.map(numOf).filter(v => isFinite(v));
    const n = x.length;
    if (!n) return { type, n: 0, missing: values.length };
    const m = mean(x);
    const sd = n > 1 ? Math.sqrt(x.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1)) : 0;
    const sorted = x.slice().sort((a, b) => a - b);
    return {
      type, n, mean: m, sd, cv: m !== 0 ? 100 * sd / Math.abs(m) : NaN,
      min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0],
      median: n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
      missing: values.length - n, values: x,
    };
  }

  /* ================= distancia de Gower ================= */
  /* rows: objetos; traits: [{k, type, weight}] */
  function gowerMatrix(rows, traits) {
    const n = rows.length;
    const cols = traits.filter(t => t.type === 'num' || t.type === 'ord' || t.type === 'cat');
    /* rangos de los cuantitativos, para normalizar */
    const ranges = {};
    cols.forEach(t => {
      if (t.type === 'cat') return;
      const v = rows.map(r => numOf(r[t.k])).filter(x => isFinite(x));
      const r = v.length ? Math.max(...v) - Math.min(...v) : 0;
      ranges[t.k] = r > 0 ? r : 1;
    });
    const D = [...Array(n)].map(() => new Array(n).fill(0));
    const used = [...Array(n)].map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let num = 0, den = 0;
        for (const t of cols) {
          const w = t.weight == null ? 1 : t.weight;
          if (w <= 0) continue;
          const a = rows[i][t.k], b = rows[j][t.k];
          if (t.type === 'cat') {
            const sa = String(a ?? '').trim(), sb = String(b ?? '').trim();
            if (!sa || !sb) continue;
            num += w * (sa.toLowerCase() === sb.toLowerCase() ? 0 : 1);
            den += w;
          } else {
            const xa = numOf(a), xb = numOf(b);
            if (!isFinite(xa) || !isFinite(xb)) continue;
            num += w * Math.abs(xa - xb) / ranges[t.k];
            den += w;
          }
        }
        const d = den > 0 ? num / den : NaN;
        D[i][j] = D[j][i] = d;
        used[i][j] = used[j][i] = den;
      }
    }
    return { D, used, ranges, cols };
  }

  /* ================= descomposición espectral (Jacobi) y PCoA ================= */
  function jacobiEigen(Min, maxSweeps) {
    const n = Min.length;
    const a = Min.map(r => r.slice());
    let v = [...Array(n)].map((_, i) => [...Array(n)].map((__, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < (maxSweeps || 100); sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-16) break;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(a[p][q]) < 1e-18) continue;
          const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = a[k][p], akq = a[k][q];
            a[k][p] = c * akp - s * akq;
            a[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = a[p][k], aqk = a[q][k];
            a[p][k] = c * apk - s * aqk;
            a[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) {
            const vkp = v[k][p], vkq = v[k][q];
            v[k][p] = c * vkp - s * vkq;
            v[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    const pairs = [...Array(n)].map((_, i) => ({ value: a[i][i], vector: v.map(r => r[i]) }));
    pairs.sort((x, y) => y.value - x.value);
    return pairs;
  }

  /* coordenadas principales de una matriz de distancias */
  function pcoa(D, dims) {
    const n = D.length;
    if (n < 3) return { coords: [], values: [], explained: [] };
    /* doble centrado de −d²/2 */
    const A = D.map(row => row.map(d => -0.5 * (isFinite(d) ? d * d : 0)));
    const rowM = A.map(r => mean(r));
    const grand = mean(rowM);
    const B = A.map((r, i) => r.map((v, j) => v - rowM[i] - rowM[j] + grand));
    const eig = jacobiEigen(B);
    const k = Math.min(dims || 3, n - 1);
    const pos = eig.filter(e => e.value > 1e-9);
    const totalPos = pos.reduce((a, e) => a + e.value, 0) || 1;
    const coords = [...Array(n)].map((_, i) =>
      eig.slice(0, k).map(e => (e.value > 0 ? e.vector[i] * Math.sqrt(e.value) : 0)));
    return {
      coords, values: eig.slice(0, k).map(e => e.value),
      explained: eig.slice(0, k).map(e => 100 * Math.max(0, e.value) / totalPos),
      totalPositive: totalPos, all: eig.map(e => e.value),
    };
  }

  /* ================= agrupamiento y silueta ================= */
  /* Ward.D2 sobre una matriz de distancias (Lance-Williams) */
  function wardTree(D, labels) {
    const n = D.length;
    if (n < 2) return null;
    let clusters = labels.map((l, i) => ({ id: i, label: l, members: [i], size: 1, height: 0, children: null }));
    let dist = D.map(r => r.map(v => v * v));     /* Ward.D2 trabaja con cuadrados */
    let next = n;
    while (clusters.length > 1) {
      let bi = 0, bj = 1, best = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) if (dist[i][j] < best) { best = dist[i][j]; bi = i; bj = j; }
      }
      const A2 = clusters[bi], B2 = clusters[bj];
      const node = { id: next++, label: '', members: A2.members.concat(B2.members), size: A2.size + B2.size, height: Math.sqrt(best), children: [A2, B2] };
      const keep = clusters.filter((_, k) => k !== bi && k !== bj);
      const nd = keep.map(c => {
        const k = clusters.indexOf(c);
        const ni = A2.size, nj = B2.size, nk = c.size, nt = ni + nj + nk;
        return ((ni + nk) * dist[bi][k] + (nj + nk) * dist[bj][k] - nk * dist[bi][bj]) / nt;
      });
      const newDist = keep.map((c, x) => {
        const row = keep.map((c2, y) => dist[clusters.indexOf(c)][clusters.indexOf(c2)]);
        row.push(nd[x]);
        return row;
      });
      newDist.push(nd.concat([0]));
      clusters = keep.concat([node]);
      dist = newDist;
    }
    return clusters[0];
  }

  /* corta un árbol en k grupos */
  function cutTree(tree, k) {
    if (!tree) return [];
    let nodes = [tree];
    while (nodes.length < k) {
      nodes.sort((a, b) => b.height - a.height);
      const top = nodes.shift();
      if (!top || !top.children) { nodes.push(top); break; }
      nodes = nodes.concat(top.children);
    }
    const labels = [];
    nodes.forEach((nd, gi) => nd.members.forEach(m => { labels[m] = gi; }));
    return labels;
  }

  /* silueta media: ¿los grupos están de verdad separados? */
  function silhouette(D, groups) {
    const n = D.length;
    const byGroup = new Map();
    groups.forEach((g, i) => {
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(i);
    });
    if (byGroup.size < 2) return { mean: NaN, values: [] };
    const values = [];
    for (let i = 0; i < n; i++) {
      const own = byGroup.get(groups[i]).filter(j => j !== i);
      const a = own.length ? mean(own.map(j => D[i][j])) : 0;
      let b = Infinity;
      for (const [g, list] of byGroup) {
        if (g === groups[i]) continue;
        const d = mean(list.map(j => D[i][j]));
        if (d < b) b = d;
      }
      values.push(own.length ? (b - a) / Math.max(a, b) : 0);
    }
    return { mean: mean(values), values };
  }

  /* ================= colección núcleo ================= */
  const ALLOCATIONS = {
    C: { es: 'Constante', en: 'Constant' },
    P: { es: 'Proporcional', en: 'Proportional' },
    L: { es: 'Logarítmica', en: 'Logarithmic' },
    S: { es: 'Raíz cuadrada', en: 'Square root' },
  };

  /* cuántas accesiones toca a cada estrato */
  function allocate(sizes, target, method) {
    const k = sizes.length;
    if (!k) return [];
    let w;
    if (method === 'C') w = sizes.map(() => 1);
    else if (method === 'L') w = sizes.map(s => Math.log(s + 1));
    else if (method === 'S') w = sizes.map(s => Math.sqrt(s));
    else w = sizes.slice();
    const sw = w.reduce((a, b) => a + b, 0) || 1;
    let alloc = w.map((v, i) => Math.min(sizes[i], Math.max(1, Math.round(target * v / sw))));
    /* se ajusta el redondeo hasta cuadrar con el tamaño pedido */
    const fix = () => alloc.reduce((a, b) => a + b, 0) - target;
    let guard = 0;
    while (fix() !== 0 && guard++ < 1000) {
      const over = fix() > 0;
      let idx = -1, best = over ? -Infinity : Infinity;
      for (let i = 0; i < k; i++) {
        if (over && alloc[i] <= 1) continue;
        if (!over && alloc[i] >= sizes[i]) continue;
        const ratio = alloc[i] / Math.max(1, sizes[i]);
        if (over ? ratio > best : ratio < best) { best = ratio; idx = i; }
      }
      if (idx < 0) break;
      alloc[idx] += over ? -1 : 1;
    }
    return alloc;
  }

  /* elige `m` accesiones del estrato: al azar o las más distintas entre sí */
  function pickFromStratum(members, m, D, mode, rnd) {
    if (m >= members.length) return members.slice();
    if (mode === 'random') {
      const pool = members.slice();
      const out = [];
      while (out.length < m && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      return out;
    }
    /* máxima distancia: se empieza por el par más lejano y se añade el que
       más lejos esté de lo ya elegido */
    let bi = members[0], bj = members[1 % members.length], best = -1;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const d = D[members[i]][members[j]];
        if (isFinite(d) && d > best) { best = d; bi = members[i]; bj = members[j]; }
      }
    }
    const out = [bi, bj].slice(0, m);
    while (out.length < m) {
      let cand = -1, candD = -1;
      for (const x of members) {
        if (out.includes(x)) continue;
        const d = Math.min(...out.map(o => (isFinite(D[x][o]) ? D[x][o] : 0)));
        if (d > candD) { candD = d; cand = x; }
      }
      if (cand < 0) break;
      out.push(cand);
    }
    return out;
  }

  /* método M: maximiza las clases de descriptores capturadas (voraz) */
  function methodM(rows, traits, target, prefer) {
    const cats = traits.filter(t => t.type === 'cat' || t.type === 'ord');
    const classesOf = i => {
      const s = new Set();
      cats.forEach(t => {
        const v = String(rows[i][t.k] ?? '').trim();
        if (v) s.add(t.k + '=' + v.toLowerCase());
      });
      return s;
    };
    const all = rows.map((_, i) => i);
    const sets = all.map(classesOf);
    const remaining = new Set();
    sets.forEach(s => s.forEach(c => remaining.add(c)));
    const chosen = [];
    const left = new Set(all);
    while (chosen.length < target && left.size) {
      let best = -1, bestGain = -1;
      for (const i of left) {
        const gain = [...sets[i]].filter(c => remaining.has(c)).length;
        if (gain > bestGain || (gain === bestGain && prefer && prefer(i, best))) { best = i; bestGain = gain; }
      }
      if (best < 0) break;
      sets[best].forEach(c => remaining.delete(c));
      chosen.push(best);
      left.delete(best);
      if (bestGain === 0) {
        /* ya no queda nada nuevo: se completa con los que más clases tienen */
        const rest = [...left].sort((a, b) => sets[b].size - sets[a].size);
        for (const r of rest) {
          if (chosen.length >= target) break;
          chosen.push(r); left.delete(r);
        }
        break;
      }
    }
    return { chosen, missingClasses: [...remaining] };
  }

  /* arma el núcleo completo */
  function buildCore(rows, traits, opts) {
    const o = Object.assign({
      pct: 10, strata: null, allocation: 'L', pick: 'distance', method: 'strata',
      D: null, seed: 20260923, minPerStratum: 1,
    }, opts || {});
    const n = rows.length;
    const target = clamp(Math.round(n * o.pct / 100), 1, n);
    const rnd = mulberry32(o.seed);

    if (o.method === 'M') {
      const m = methodM(rows, traits, target);
      return { core: m.chosen.sort((a, b) => a - b), target, method: 'M', missingClasses: m.missingClasses, strata: null };
    }
    /* estratos: por el vector dado (grupos, entidad, cultivo…) o uno solo */
    const strata = new Map();
    rows.forEach((r, i) => {
      const k = o.strata ? String(o.strata[i] ?? '—') : 'todo';
      if (!strata.has(k)) strata.set(k, []);
      strata.get(k).push(i);
    });
    const keys = [...strata.keys()];
    const sizes = keys.map(k => strata.get(k).length);
    const alloc = allocate(sizes, target, o.allocation);
    const core = [];
    keys.forEach((k, idx) => {
      const chosen = pickFromStratum(strata.get(k), alloc[idx], o.D, o.pick, rnd);
      chosen.forEach(c => core.push(c));
    });
    return {
      core: core.sort((a, b) => a - b), target, method: o.allocation, pick: o.pick,
      strata: keys.map((k, i) => ({ key: k, size: sizes[i], taken: alloc[i] })),
    };
  }

  /* ================= validación del núcleo ================= */
  function validateCore(rows, traits, coreIdx) {
    const inCore = new Set(coreIdx);
    const nums = traits.filter(t => t.type === 'num' || t.type === 'ord');
    const cats = traits.filter(t => t.type === 'cat');
    const perTrait = [];
    let mdCount = 0, vdCount = 0, crSum = 0, vrSum = 0, nUsable = 0;

    nums.forEach(t => {
      const all = [], core = [];
      rows.forEach((r, i) => {
        const v = numOf(r[t.k]);
        if (!isFinite(v)) return;
        all.push(v);
        if (inCore.has(i)) core.push(v);
      });
      if (all.length < 3 || core.length < 2) { perTrait.push({ k: t.k, type: t.type, usable: false }); return; }
      const tt = tTest2(core, all), ff = fTestVar(core, all);
      const rangeAll = Math.max(...all) - Math.min(...all);
      const rangeCore = Math.max(...core) - Math.min(...core);
      const cr = rangeAll > 0 ? 100 * rangeCore / rangeAll : 100;
      const cvAll = mean(all) !== 0 ? 100 * Math.sqrt(all.reduce((a, v) => a + (v - mean(all)) ** 2, 0) / (all.length - 1)) / Math.abs(mean(all)) : NaN;
      const cvCore = mean(core) !== 0 ? 100 * Math.sqrt(core.reduce((a, v) => a + (v - mean(core)) ** 2, 0) / (core.length - 1)) / Math.abs(mean(core)) : NaN;
      const vr = isFinite(cvAll) && cvAll > 0 ? 100 * cvCore / cvAll : NaN;
      const mdSig = isFinite(tt.p) && tt.p < 0.05;
      const vdSig = isFinite(ff.p) && ff.p < 0.05;
      if (mdSig) mdCount++;
      if (vdSig) vdCount++;
      crSum += cr; if (isFinite(vr)) vrSum += vr;
      nUsable++;
      perTrait.push({
        k: t.k, type: t.type, usable: true, meanAll: mean(all), meanCore: mean(core),
        t: tt.t, pMean: tt.p, F: ff.F, pVar: ff.p, cr, vr, cvAll, cvCore, rangeAll, rangeCore, mdSig, vdSig,
      });
    });

    /* cobertura de clases cualitativas */
    let classesAll = 0, classesCore = 0;
    const catDetail = cats.map(t => {
      const sAll = new Set(), sCore = new Set();
      rows.forEach((r, i) => {
        const v = String(r[t.k] ?? '').trim().toLowerCase();
        if (!v) return;
        sAll.add(v);
        if (inCore.has(i)) sCore.add(v);
      });
      classesAll += sAll.size; classesCore += sCore.size;
      const hAll = DIV.indices([...countMap(rows, t.k, null).values()]).H;
      const hCore = DIV.indices([...countMap(rows, t.k, inCore).values()]).H;
      return { k: t.k, classesAll: sAll.size, classesCore: sCore.size, pct: sAll.size ? 100 * sCore.size / sAll.size : 100, hAll, hCore };
    });

    return {
      n: rows.length, nCore: coreIdx.length, pct: 100 * coreIdx.length / Math.max(1, rows.length),
      MD: nUsable ? 100 * mdCount / nUsable : NaN,
      VD: nUsable ? 100 * vdCount / nUsable : NaN,
      CR: nUsable ? crSum / nUsable : NaN,
      VR: nUsable ? vrSum / nUsable : NaN,
      classCoverage: classesAll ? 100 * classesCore / classesAll : NaN,
      perTrait, catDetail, nUsable,
    };
  }
  function countMap(rows, key, filterSet) {
    const m = new Map();
    rows.forEach((r, i) => {
      if (filterSet && !filterSet.has(i)) return;
      const v = String(r[key] ?? '').trim().toLowerCase();
      if (!v) return;
      m.set(v, (m.get(v) || 0) + 1);
    });
    return m;
  }

  window.CHAR = {
    ibeta, betacf, tTest2, fTestVar,
    detectType, numOf, describe, gowerMatrix, jacobiEigen, pcoa,
    wardTree, cutTree, silhouette,
    ALLOCATIONS, allocate, pickFromStratum, methodM, buildCore, validateCore, countMap,
  };
})();
