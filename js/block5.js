/* GermplasmPro — Bloque 5: la diversidad geográfica de la colección.

   Cuatro preguntas, en este orden:
     1. ¿Cuánto tengo y cuánto me falta? Riqueza observada, estimadores de lo
        que no se ha colectado y la curva de acumulación.
     2. ¿Dónde está esa diversidad? Tabla e índices por unidad geográfica, con
        rarefacción a esfuerzo común para que la comparación sea justa.
     3. ¿Se parecen las regiones entre sí? Mapa de calor de composición,
        agrupamiento UPGMA y prueba de Mantel contra la distancia geográfica.
     4. ¿Cómo se reparte en el gradiente? Riqueza y accesiones por franja
        altitudinal.

   Las figuras se dibujan con colores literales para que el SVG exportado se
   vea igual fuera de la app. */

(function () {

  const view = {
    unit: 'state',      /* state | country | grid | band */
    cls: 'species',     /* species | crop | genus | name */
    grid: 1,
    band: 500,
    dist: 'jaccard',
    perms: 999,
    effort: 'q1',       /* esfuerzo al que se rarifica: q1, median, min o un número */
    index: 'S',         /* índice que colorea el mapa y ordena la tabla */
    sort: { k: 'N', dir: -1 },
  };
  let A = null;

  const cv = n => B4.paint(n);   /* referencias al tema: la figura cambia sola con él */
  const ramp = t => B4.ramp(t);

  const UNITS = [
    { k: 'state', es: 'Entidad de México', en: 'Mexican state' },
    { k: 'country', es: 'País', en: 'Country' },
    { k: 'grid', es: 'Celda de rejilla', en: 'Grid cell' },
    { k: 'band', es: 'Franja altitudinal', en: 'Elevation belt' },
  ];
  const CLASSES = [
    { k: 'species', es: 'Especie (género + epíteto)', en: 'Species (genus + epithet)', pl: 'especies', pln: 'species' },
    { k: 'crop', es: 'Cultivo', en: 'Crop', pl: 'cultivos', pln: 'crops' },
    { k: 'genus', es: 'Género', en: 'Genus', pl: 'géneros', pln: 'genera' },
    { k: 'name', es: 'Nombre de la accesión', en: 'Accession name', pl: 'nombres de accesión', pln: 'accession names' },
  ];
  const INDICES = [
    { k: 'N', es: 'Accesiones', en: 'Accessions', d: { es: 'cuántos sobres, frascos o parcelas hay en la unidad', en: 'how many envelopes, jars or plots the unit holds' } },
    { k: 'S', es: 'Riqueza observada (S)', en: 'Observed richness (S)', d: { es: 'cuántos tipos distintos se han colectado ahí', en: 'how many different types have been collected there' } },
    { k: 'rare', es: 'Riqueza rarificada', en: 'Rarefied richness', d: { es: 'los tipos que se esperarían con el mismo esfuerzo en todas las unidades', en: 'the types expected at the same effort in every unit' } },
    { k: 'H', es: 'Shannon (H′)', en: 'Shannon (H′)', d: { es: 'combina cuántos tipos hay y qué tan parejos están', en: 'combines how many types there are and how even they are' } },
    { k: 'simpson', es: 'Gini-Simpson (1 − D)', en: 'Gini-Simpson (1 − D)', d: { es: 'probabilidad de que dos accesiones al azar sean de tipos distintos', en: 'probability that two random accessions are of different types' } },
    { k: 'pielou', es: 'Equitatividad (J′)', en: 'Evenness (J′)', d: { es: 'qué tan repartidas están las accesiones entre los tipos', en: 'how evenly accessions are spread across types' } },
    { k: 'q1', es: 'Tipos efectivos (Hill q=1)', en: 'Effective types (Hill q=1)', d: { es: 'Shannon expresado en número de tipos', en: 'Shannon expressed as a number of types' } },
    { k: 'exclusive', es: 'Exclusivos', en: 'Exclusive types', d: { es: 'tipos que no están en ninguna otra unidad', en: 'types found in no other unit' } },
  ];

  /* ============ figuras ============ */
  function frame(W, H, pad) {
    const p = Object.assign({ l: 46, r: 14, t: 12, b: 34 }, pad);
    return { W, H, p, iw: W - p.l - p.r, ih: H - p.t - p.b };
  }
  function axes(f, xd, yd, xlab, ylab) {
    const X = v => f.p.l + (v - xd[0]) / (xd[1] - xd[0] || 1) * f.iw;
    const Y = v => f.H - f.p.b - (v - yd[0]) / (yd[1] - yd[0] || 1) * f.ih;
    const parts = [];
    const xt = HOME.niceTicks(xd[0], xd[1], 5), yt = HOME.niceTicks(yd[0], yd[1], 5);
    yt.forEach(t => {
      parts.push(`<line x1="${f.p.l}" y1="${Y(t).toFixed(1)}" x2="${f.W - f.p.r}" y2="${Y(t).toFixed(1)}" stroke="${cv('--grid')}"/>`);
      parts.push(`<text x="${f.p.l - 6}" y="${(Y(t) + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${cv('--text-muted')}">${fmt(t, Math.abs(t) < 10 && t % 1 !== 0 ? 1 : 0)}</text>`);
    });
    xt.forEach(t => parts.push(`<text x="${X(t).toFixed(1)}" y="${f.H - f.p.b + 14}" text-anchor="middle" font-size="9.5" fill="${cv('--text-muted')}">${fmt(t, Math.abs(t) < 10 && t % 1 !== 0 ? 1 : 0)}</text>`));
    parts.push(`<line x1="${f.p.l}" y1="${f.H - f.p.b}" x2="${f.W - f.p.r}" y2="${f.H - f.p.b}" stroke="${cv('--border-strong')}"/>`);
    parts.push(`<line x1="${f.p.l}" y1="${f.p.t}" x2="${f.p.l}" y2="${f.H - f.p.b}" stroke="${cv('--border-strong')}"/>`);
    if (xlab) parts.push(`<text x="${(f.p.l + f.W - f.p.r) / 2}" y="${f.H - 4}" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${esc(xlab)}</text>`);
    if (ylab) parts.push(`<text transform="translate(12,${(f.p.t + f.H - f.p.b) / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${esc(ylab)}</text>`);
    return { X, Y, parts };
  }

  /* curva de acumulación con su banda de confianza y los estimadores */
  function curvePlot(W, H) {
    const c = A.curve;
    if (c.length < 2) return `<div class="sim-empty">${T('hacen falta más accesiones', 'more accessions are needed')}</div>`;
    const est = [
      { v: A.chao1.est, es: 'Chao1', c: '--s2' },
      { v: A.inc.chao2, es: 'Chao2', c: '--s3' },
      { v: A.inc.jack1, es: 'Jackknife 1', c: '--s4' },
      { v: A.inc.jack2, es: 'Jackknife 2', c: '--s6' },
    ].filter(e => isFinite(e.v));
    const yMax = Math.max(...c.map(p => p.S + 1.96 * p.sd), ...est.map(e => e.v)) * 1.05;
    const f = frame(W, H);
    const ax = axes(f, [0, c[c.length - 1].n], [0, yMax],
      T('accesiones examinadas', 'accessions examined'), T('tipos esperados', 'expected types'));
    const g = ax.parts.slice();
    const band = c.map(p => `${ax.X(p.n).toFixed(1)},${ax.Y(p.S + 1.96 * p.sd).toFixed(1)}`)
      .concat(c.slice().reverse().map(p => `${ax.X(p.n).toFixed(1)},${ax.Y(Math.max(0, p.S - 1.96 * p.sd)).toFixed(1)}`));
    g.push(`<polygon points="${band.join(' ')}" fill="${cv('--s1')}" fill-opacity="0.16"/>`);
    est.forEach(e => {
      g.push(`<line x1="${f.p.l}" y1="${ax.Y(e.v).toFixed(1)}" x2="${f.W - f.p.r}" y2="${ax.Y(e.v).toFixed(1)}" stroke="${cv(e.c)}" stroke-width="1.3" stroke-dasharray="5 4"/>`);
      g.push(`<text x="${f.W - f.p.r - 4}" y="${(ax.Y(e.v) - 4).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${cv(e.c)}">${e.es} ${fmt(e.v, 0)}</text>`);
    });
    g.push(`<path d="${c.map((p, i) => `${i ? 'L' : 'M'}${ax.X(p.n).toFixed(1)} ${ax.Y(p.S).toFixed(1)}`).join('')}" fill="none" stroke="${cv('--s1')}" stroke-width="2.2"/>`);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* dispersión con etiquetas opcionales */
  function scatter(W, H, data, xlab, ylab, opts) {
    const o = Object.assign({ label: false, line: false }, opts || {});
    if (data.length < 2) return `<div class="sim-empty">${T('hacen falta más unidades', 'more units are needed')}</div>`;
    const xs = data.map(d => d.x), ys = data.map(d => d.y);
    const f = frame(W, H);
    const xd = [Math.min(...xs), Math.max(...xs)], yd = [0, Math.max(...ys) * 1.08 || 1];
    if (xd[0] === xd[1]) { xd[0] -= 1; xd[1] += 1; }
    const ax = axes(f, xd, yd, xlab, ylab);
    const g = ax.parts.slice();
    if (o.line) {
      /* recta de mínimos cuadrados, sólo como ayuda visual */
      const n = data.length, mx = mean(xs), my = mean(ys);
      let sxy = 0, sxx = 0;
      data.forEach(d => { sxy += (d.x - mx) * (d.y - my); sxx += (d.x - mx) ** 2; });
      if (sxx > 0) {
        const b = sxy / sxx, a = my - b * mx;
        g.push(`<line x1="${ax.X(xd[0]).toFixed(1)}" y1="${ax.Y(a + b * xd[0]).toFixed(1)}" x2="${ax.X(xd[1]).toFixed(1)}" y2="${ax.Y(a + b * xd[1]).toFixed(1)}" stroke="${cv('--s5')}" stroke-width="1.4" stroke-dasharray="6 4"/>`);
        const r = DIV.pearson(xs, ys);
        g.push(`<text x="${f.W - f.p.r - 4}" y="${f.p.t + 12}" text-anchor="end" font-size="10" fill="${cv('--s5')}">r = ${fmt(r, 2)}</text>`);
      }
    }
    data.forEach(d => {
      g.push(`<circle cx="${ax.X(d.x).toFixed(1)}" cy="${ax.Y(d.y).toFixed(1)}" r="${d.r || 4.2}" fill="${d.color || cv('--s1')}" fill-opacity="0.85" stroke="${cv('--card-bg')}"><title>${esc(d.label || '')}</title></circle>`);
      if (o.label && d.label) g.push(`<text x="${(ax.X(d.x) + 6).toFixed(1)}" y="${(ax.Y(d.y) - 5).toFixed(1)}" font-size="9" fill="${cv('--text-muted')}">${esc(String(d.label).slice(0, 14))}</text>`);
    });
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* mapa de calor de composición, ordenado por el dendrograma, con el árbol arriba */
  function heatmap(W) {
    if (!A.D || A.big.length < 3) return `<div class="sim-empty">${T('hacen falta al menos tres unidades con dos accesiones cada una', 'at least three units with two accessions each are needed')}</div>`;
    const ord = A.order && A.order.length === A.big.length ? A.order : A.big.map((_, i) => i);
    const n = ord.length;
    const labW = 118, treeH = Math.min(120, 26 + n * 4), cell = Math.max(10, Math.min(26, (W - labW - 24) / n));
    const H = treeH + labW + n * cell + 26;
    const g = [];
    const x0 = labW, y0 = treeH + 6;

    /* el dendrograma, dibujado sobre las columnas */
    const pos = {};
    ord.forEach((m, i) => { pos[m] = x0 + i * cell + cell / 2; });
    const maxH = Math.max(1e-9, A.tree.height);
    const drawNode = node => {
      if (!node.children) return { x: pos[node.members[0]], y: treeH };
      const a = drawNode(node.children[0]), b = drawNode(node.children[1]);
      const y = treeH - (node.height / maxH) * (treeH - 8);
      g.push(`<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${a.x.toFixed(1)} ${y.toFixed(1)} L${b.x.toFixed(1)} ${y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="${cv('--text-muted')}" stroke-width="1.2"/>`);
      return { x: (a.x + b.x) / 2, y };
    };
    drawNode(A.tree);

    /* las celdas */
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const d = A.D[ord[i]][ord[j]];
        const sim = 1 - d;
        g.push(`<rect x="${(x0 + j * cell).toFixed(1)}" y="${(y0 + i * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="${ramp(sim)}" stroke="${cv('--card-bg')}" stroke-width="0.5"><title>${esc(A.big[ord[i]].label)} ↔ ${esc(A.big[ord[j]].label)}: ${fmt(100 * sim, 0)} %</title></rect>`);
      }
      const lab = A.big[ord[i]].label.slice(0, 18);
      g.push(`<text x="${x0 - 6}" y="${(y0 + i * cell + cell / 2 + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${cv('--text')}">${esc(lab)}</text>`);
      g.push(`<text transform="translate(${(x0 + i * cell + cell / 2).toFixed(1)},${(y0 + n * cell + 6).toFixed(1)}) rotate(55)" font-size="9.5" fill="${cv('--text')}">${esc(lab)}</text>`);
    }
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* mini mapa coroplético del índice elegido */
  function indexMap(W, H) {
    if (!['state', 'country', 'grid'].includes(view.unit)) return '';
    const byKey = new Map(A.units.map(u => [u.key, u]));
    const vals = A.units.map(u => Number(u[view.index])).filter(v => isFinite(v));
    if (!vals.length) return '';
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const bbox = view.unit === 'country' ? GEO.WORLD_BBOX : GEO.MX_BBOX;
    const proj = GEO.projection(bbox, W, H, 10);
    const g = [`<rect x="0" y="0" width="${W}" height="${H}" fill="${cv('--bg-soft')}"/>`];
    const col = v => isFinite(v) ? ramp(hi > lo ? 0.12 + 0.88 * (v - lo) / (hi - lo) : 0.6) : cv('--card-bg');

    if (view.unit === 'country') {
      GEO.WORLD.forEach(c => {
        const u = byKey.get(c.a3);
        const d = GEO.ringsToPath(c.rings, proj, bbox);
        if (!d) return;
        g.push(`<path d="${d}" fill="${u ? col(Number(u[view.index])) : cv('--card-bg')}" stroke="${cv('--border-strong')}" stroke-width="0.5" fill-rule="evenodd"><title>${esc(u ? u.label + ': ' + fmt(u[view.index], 2) : '')}</title></path>`);
      });
    } else {
      GEO.MX.forEach(s => {
        const u = byKey.get(s.code);
        const d = GEO.ringsToPath(s.rings, proj, bbox);
        if (!d) return;
        g.push(`<path d="${d}" fill="${u ? col(Number(u[view.index])) : cv('--card-bg')}" stroke="${cv('--border-strong')}" stroke-width="0.6" fill-rule="evenodd"><title>${esc(u ? u.label + ': ' + fmt(u[view.index], 2) : s.name)}</title></path>`);
      });
      if (view.unit === 'grid') {
        A.units.forEach(u => {
          const b = GEO.cellBBox(u.key, view.grid);
          const x = proj.X(b[0]), y = proj.Y(b[3]);
          g.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.abs(proj.X(b[2]) - x).toFixed(1)}" height="${Math.abs(proj.Y(b[1]) - y).toFixed(1)}" fill="${col(Number(u[view.index]))}" fill-opacity="0.8" stroke="${cv('--border-strong')}" stroke-width="0.4"><title>${esc(u.label)}: ${fmt(u[view.index], 2)}</title></rect>`);
        });
      }
    }
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* ============ interfaz ============ */
  function run() {
    /* el cálculo no depende de la interfaz: así la suite de pruebas puede
       pedir el análisis sin que exista el panel */
    const pts = GEO.pointsOf(state.acc);
    A = DIV.analyse(pts, view.unit, view.cls, { grid: view.grid, band: view.band, dist: view.dist, perms: view.perms, effort: view.effort });
    if (el('panel-5')) render(pts);
    return A;
  }

  function render(pts) {
    if (!state.acc.length) {
      el('b5Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      el('b5Stats').innerHTML = '';
      return;
    }
    const t = A.total, inc = A.inc;
    const falta = Math.max(0, A.chao1.est - t.S);
    el('b5Stats').innerHTML = [
      { k: T('Accesiones mapeadas', 'Mapped accessions'), v: fmtInt(t.N), d: T(`${A.units.length} unidades con datos`, `${A.units.length} units with data`), c: 'var(--s1)' },
      { k: T('Tipos observados', 'Observed types'), v: fmtInt(t.S), d: T('tipos distintos en la colección: ' + clsLabel(), 'distinct types in the collection: ' + clsLabel()), c: 'var(--s3)' },
      { k: T('Riqueza estimada (Chao1)', 'Estimated richness (Chao1)'), v: fmt(A.chao1.est, 1), d: T(`faltarían ${fmt(falta, 1)} por colectar`, `${fmt(falta, 1)} still to be collected`), c: 'var(--s2)' },
      { k: T('Cobertura de la muestra', 'Sample coverage'), v: fmt(100 * t.coverage, 1) + ' %', d: T('Good-Turing: 1 − f₁/n', 'Good-Turing: 1 − f₁/n'), c: 'var(--s4)' },
      { k: T('Recambio entre unidades (β)', 'Turnover between units (β)'), v: fmt(A.beta, 2), d: T(`α media = ${fmt(A.alphaBar, 1)}`, `mean α = ${fmt(A.alphaBar, 1)}`), c: 'var(--s6)' },
      { k: T('Diversidad efectiva', 'Effective diversity'), v: fmt(t.q1, 1), d: T('tipos efectivos (Hill q=1)', 'effective types (Hill q=1)'), c: 'var(--s7)' },
    ].map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');

    const idxDef = INDICES.find(i => i.k === view.index) || INDICES[1];
    const sorted = A.units.slice().sort((a, b) => {
      const k = view.sort.k, dir = view.sort.dir;
      const x = Number(a[k]), y = Number(b[k]);
      if (isFinite(x) && isFinite(y)) return (x - y) * dir;
      return String(a[k] ?? '').localeCompare(String(b[k] ?? ''), 'es') * dir;
    });

    const cols = [
      ['label', T('Unidad', 'Unit')], ['N', T('Accesiones', 'Accessions')], ['S', T('Riqueza S', 'Richness S')],
      ['rare', T(`Rarificada a ${A.nCommon}`, `Rarefied to ${A.nCommon}`)], ['H', 'H′'], ['simpson', '1 − D'],
      ['pielou', 'J′'], ['q1', T('Hill q1', 'Hill q1')], ['exclusive', T('Exclusivos', 'Exclusive')],
      ['meanElev', T('Altitud media', 'Mean elevation')],
    ];

    const mant = A.mantel;
    const bandChart = view.unit === 'band' ? '' : bandSection();

    el('b5Body').innerHTML = `
      ${!A.chao1.reliable ? `<div class="note-warn">${T(
        `<b>Cuidado con Chao1 en esta colección.</b> De ${fmtInt(A.total.S)} tipos, ${A.chao1.f1} aparecen una sola vez y sólo ${A.chao1.f2} aparecen dos veces; con tan pocos dobletones la fórmula f₁²/(2f₂) se dispara y da ${fmt(A.chao1.est, 0)}. En un caso así conviene leer los estimadores de presencias —jackknife 1 (${fmt(A.inc.jack1, 1)}) y Chao2 (${fmt(A.inc.chao2, 1)})—, que son más estables, y sobre todo entender el mensaje de fondo: la colección está lejos de saturarse.`,
        `<b>Careful with Chao1 in this collection.</b> Of ${fmtInt(A.total.S)} types, ${A.chao1.f1} appear only once and just ${A.chao1.f2} appear twice; with so few doubletons the f₁²/(2f₂) formula explodes and returns ${fmt(A.chao1.est, 0)}. In such a case read the incidence estimators —jackknife 1 (${fmt(A.inc.jack1, 1)}) and Chao2 (${fmt(A.inc.chao2, 1)})—, which are steadier, and above all take the underlying message: the collection is far from saturated.`)}</div>` : ''}

      <h3 class="section-title">${T('1 · ¿Cuánto hay y cuánto falta?', '1 · How much is there and how much is missing?')}</h3>
      <p class="section-sub">${T(
        `La curva dice cuántos tipos distintos —${clsLabel()}— se esperarían al examinar un número dado de accesiones; la banda es su intervalo del 95 %. Las líneas punteadas son cuatro estimadores de la riqueza total: si están muy por encima de donde termina la curva, la colección todavía tiene material por encontrar en el campo.`,
        `The curve says how many distinct types —${clsLabel()}— would be expected when examining a given number of accessions; the band is its 95% interval. The dashed lines are four estimators of total richness: if they sit well above where the curve ends, there is still material to find in the field.`)}</p>
      <div class="card"><div class="sum-grid">
        <div class="pg-pane"><div class="pg-title">${T('Curva de acumulación y estimadores', 'Accumulation curve and estimators')}</div>${curvePlot(520, 320)}</div>
        <div class="pg-pane"><div class="pg-title">${T('Riqueza contra esfuerzo, unidad por unidad', 'Richness against effort, unit by unit')}</div>
          ${scatter(520, 320, A.units.map(u => ({ x: u.N, y: u.S, label: u.label, color: cv('--s1') })),
            T('accesiones en la unidad', 'accessions in the unit'), T('tipos observados', 'observed types'), { label: A.units.length <= 18, line: true })}
          <p class="hint">${T('Si la nube sube pegada a la recta, lo que mide tu riqueza es el esfuerzo de colecta, no la diversidad del territorio: por eso la tabla de abajo trae la columna rarificada.', 'If the cloud hugs the line, what your richness measures is collecting effort, not the diversity of the territory: hence the rarefied column in the table below.')}</p></div>
      </div></div>

      <h3 class="section-title">${T('2 · ¿Dónde está?', '2 · Where is it?')}</h3>
      <div class="card">
        <div class="table-wrap"><table class="tbl"><thead><tr>
          ${cols.map(([k, t2]) => `<th class="${k === 'label' ? '' : 'num'}"><button class="th-btn${view.sort.k === k ? ' on' : ''}" data-s5sort="${k}">${esc(t2)}${view.sort.k === k ? (view.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}
        </tr></thead><tbody>
          ${sorted.map(u => `<tr>
            <td>${esc(u.label)}</td>
            <td class="num">${u.N}</td><td class="num">${u.S}</td>
            <td class="num">${isFinite(u.rare) ? fmt(u.rare, 2) : '—'}</td>
            <td class="num">${fmt(u.H, 2)}</td><td class="num">${fmt(u.simpson, 3)}</td>
            <td class="num">${fmt(u.pielou, 2)}</td><td class="num">${fmt(u.q1, 2)}</td>
            <td class="num">${u.exclusive || 0}</td>
            <td class="num">${isFinite(u.meanElev) ? fmtInt(u.meanElev) + ' m' : '—'}</td>
          </tr>`).join('')}
        </tbody></table></div>
        <p class="hint">${T(`La columna rarificada compara todas las unidades al mismo esfuerzo (${A.nCommon} accesiones); las que tienen menos aparecen vacías porque rarificar hacia arriba sería inventar. «Exclusivos» son los tipos —${clsLabel()}— que no están en ninguna otra unidad: si esa unidad se pierde, se pierden con ella.`,
          `The rarefied column compares every unit at the same effort (${A.nCommon} accessions); units with fewer are left blank because rarefying upwards would be making things up. "Exclusive" counts the types —${clsLabel()}— found in no other unit: if that unit is lost, they go with it.`)}</p>
      </div>

      ${indexMap(900, 420) ? `<div class="card" style="margin-top:14px">
        <div class="imp-row"><label class="inline-label">${T('Mapa del índice', 'Index map')}<select class="sel" id="b5Index"></select></label>
        <span class="hint">${esc(T(idxDef.d.es, idxDef.d.en))}</span></div>
        <div class="map-wrap">${indexMap(900, 420)}</div>
        <div class="map-legends"><div class="map-legend"><b>${esc(T(idxDef.es, idxDef.en))}</b>
          <div class="legend-ramp">${[...Array(6)].map((_, i) => `<i style="background:${ramp(0.12 + 0.88 * i / 5)}"></i>`).join('')}</div>
          <div class="legend-ends"><span>${T('menos', 'less')}</span><span>${T('más', 'more')}</span></div></div></div>
      </div>` : ''}

      <h3 class="section-title">${T('3 · ¿Se parecen las regiones?', '3 · Do the regions resemble each other?')}</h3>
      <p class="section-sub">${T(
        'El mapa de calor muestra cuánto comparten dos unidades: cuanto más oscuro, más parecida es su composición. El árbol de arriba las agrupa por ese parecido (UPGMA). La prueba de Mantel pregunta si las unidades cercanas se parecen más que las lejanas, comparando la matriz de distancias en kilómetros con la de composición.',
        'The heat map shows how much two units share: the darker, the more alike their composition. The tree above groups them by that resemblance (UPGMA). The Mantel test asks whether nearby units resemble each other more than distant ones, comparing the matrix of distances in kilometres with the compositional one.')}</p>
      <div class="card"><div class="sum-grid">
        <div class="pg-pane"><div class="pg-title">${T('Composición compartida y agrupamiento', 'Shared composition and clustering')}</div>${heatmap(540)}</div>
        <div class="pg-pane"><div class="pg-title">${T('Distancia geográfica contra disimilitud', 'Geographic distance against dissimilarity')}</div>
          ${mantelPlot(520, 320)}
          <p class="hint">${mant && isFinite(mant.r)
            ? T(`Mantel: r = ${fmt(mant.r, 3)}, p = ${fmt(mant.p, 3)} con ${mant.perms} permutaciones y ${mant.n} unidades. ${mant.p < 0.05 ? 'Hay estructura geográfica: lo cercano se parece.' : 'No hay evidencia de estructura geográfica en esta escala.'}`,
                `Mantel: r = ${fmt(mant.r, 3)}, p = ${fmt(mant.p, 3)} with ${mant.perms} permutations and ${mant.n} units. ${mant.p < 0.05 ? 'There is geographic structure: what is close is alike.' : 'No evidence of geographic structure at this scale.'}`)
            : T('Hacen falta al menos cuatro unidades con coordenadas para la prueba de Mantel.', 'At least four units with coordinates are needed for the Mantel test.')}</p></div>
      </div></div>

      ${bandChart}

      <div class="imp-row" style="margin-top:16px">
        <button class="btn btn-secondary btn-sm" id="b5CSV">${T('Tabla en CSV', 'Table as CSV')}</button>
        <button class="btn btn-ghost btn-sm" id="b5SVG">${T('Curva en SVG', 'Curve as SVG')}</button>
        <button class="btn btn-ghost btn-sm" id="b5SVG2">${T('Mapa de calor en SVG', 'Heat map as SVG')}</button>
      </div>`;

    /* eventos */
    els('[data-s5sort]', el('b5Body')).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.s5sort;
      if (view.sort.k === k) view.sort.dir *= -1; else view.sort = { k, dir: k === 'label' ? 1 : -1 };
      render(pts);
    }));
    const ix = el('b5Index');
    if (ix) {
      ix.innerHTML = INDICES.map(i => `<option value="${i.k}">${esc(T(i.es, i.en))}</option>`).join('');
      ix.value = view.index;
      ix.addEventListener('change', () => { view.index = ix.value; render(pts); });
    }
    el('b5CSV').addEventListener('click', exportCSV);
    el('b5SVG').addEventListener('click', () => download(B4.forFile(() => curvePlot(700, 440)), 'curva-acumulacion.svg', 'image/svg+xml'));
    el('b5SVG2').addEventListener('click', () => download(B4.forFile(() => heatmap(700)), 'similitud-composicion.svg', 'image/svg+xml'));
  }

  function mantelPlot(W, H) {
    if (!A.mantel || !A.D || A.big.length < 4) return `<div class="sim-empty">${T('hacen falta al menos cuatro unidades', 'at least four units are needed')}</div>`;
    const data = [];
    for (let i = 0; i < A.big.length; i++) {
      for (let j = i + 1; j < A.big.length; j++) {
        data.push({ x: haversine(A.big[i].lat, A.big[i].lon, A.big[j].lat, A.big[j].lon), y: A.D[i][j], label: `${A.big[i].label} ↔ ${A.big[j].label}`, r: 3.2 });
      }
    }
    return scatter(W, H, data, T('distancia entre unidades (km)', 'distance between units (km)'), T('disimilitud de composición', 'compositional dissimilarity'), { line: true });
  }

  /* reparto por franja altitudinal, aunque la unidad activa sea otra */
  function bandSection() {
    const pts = GEO.pointsOf(state.acc).filter(p => isFinite(Number(p.row.ELEVATION)));
    if (pts.length < 4) return '';
    const bands = DIV.buildUnits(pts, 'band', view.cls, { band: view.band });
    if (!bands.length) return '';
    const maxN = Math.max(...bands.map(b => b.N));
    const W = 900, rowH = 24, H = bands.length * rowH + 30;
    const g = [];
    bands.slice().reverse().forEach((b, i) => {
      const y = 10 + i * rowH;
      const wN = (W - 210) * b.N / maxN, wS = (W - 210) * b.S / maxN;
      g.push(`<text x="96" y="${y + 13}" text-anchor="end" font-size="10" fill="${cv('--text')}">${esc(b.label)}</text>`);
      g.push(`<rect x="104" y="${y + 3}" width="${Math.max(1, wN).toFixed(1)}" height="8" rx="3" fill="${cv('--s1')}" opacity=".85"><title>${b.N} ${T('accesiones', 'accessions')}</title></rect>`);
      g.push(`<rect x="104" y="${y + 12}" width="${Math.max(1, wS).toFixed(1)}" height="8" rx="3" fill="${cv('--s3')}" opacity=".85"><title>${b.S} ${T('tipos', 'types')}</title></rect>`);
      g.push(`<text x="${(110 + Math.max(wN, wS)).toFixed(1)}" y="${y + 15}" font-size="9.5" fill="${cv('--text-muted')}">${b.N} · ${b.S}</text>`);
    });
    return `<h3 class="section-title">${T('4 · El gradiente altitudinal', '4 · The elevation gradient')}</h3>
      <p class="section-sub">${T(`Accesiones (barra superior) y tipos distintos —${clsLabel()}— (barra inferior) por franja de ${view.band} m. En un país de montaña la altitud ordena el germoplasma mejor que casi cualquier otra variable: las franjas vacías son ambientes que la colección no representa.`,
        `Accessions (upper bar) and distinct types —${clsLabel()}— (lower bar) per ${view.band} m belt. In a mountainous country, elevation sorts germplasm better than almost any other variable: empty belts are environments the collection does not represent.`)}</p>
      <div class="card"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>
      <div class="map-legends"><div class="map-legend">
        <span class="lg-item"><i style="background:${cv('--s1')}"></i>${T('accesiones', 'accessions')}</span>
        <span class="lg-item"><i style="background:${cv('--s3')}"></i>${T('tipos distintos', 'distinct types')}</span></div></div></div>`;
  }

  /* el plural del tipo elegido; las frases lo usan siempre entre paréntesis,
     detrás de «tipos», para que concuerden en los dos idiomas */
  function clsLabel() {
    const c = CLASSES.find(x => x.k === view.cls) || CLASSES[0];
    return T(c.pl, c.pln);
  }

  function exportCSV() {
    const rows = A.units.map(u => ({
      unidad: u.label, clave: u.key, accesiones: u.N, riqueza: u.S,
      rarificada: isFinite(u.rare) ? Math.round(u.rare * 1000) / 1000 : '',
      shannon: Math.round(u.H * 1000) / 1000, gini_simpson: Math.round(u.simpson * 1000) / 1000,
      pielou: Math.round(u.pielou * 1000) / 1000, hill_q1: Math.round(u.q1 * 1000) / 1000,
      exclusivos: u.exclusive || 0, altitud_media: isFinite(u.meanElev) ? Math.round(u.meanElev) : '',
      lat: isFinite(u.lat) ? Math.round(u.lat * 1e4) / 1e4 : '', lon: isFinite(u.lon) ? Math.round(u.lon * 1e4) / 1e4 : '',
    }));
    download(IO.toCSV(rows, Object.keys(rows[0] || { unidad: '' })), 'diversidad-geografica.csv', 'text/csv;charset=utf-8');
  }

  function syncControls() {
    const set = (id, list, cur) => {
      const s = el(id);
      if (!s) return;
      s.innerHTML = list.map(o => `<option value="${o.k}">${esc(T(o.es, o.en))}</option>`).join('');
      s.value = cur;
    };
    set('b5Unit', UNITS, view.unit);
    set('b5Class', CLASSES, view.cls);
    const ef = el('b5Effort');
    if (ef) {
      ef.innerHTML = [
        ['q1', T('al primer cuartil (recomendado)', 'at the first quartile (recommended)')],
        ['median', T('a la mediana', 'at the median')],
        ['min', T('a la unidad más pequeña', 'at the smallest unit')],
        ['5', T('a 5 accesiones', 'at 5 accessions')],
        ['10', T('a 10 accesiones', 'at 10 accessions')],
        ['20', T('a 20 accesiones', 'at 20 accessions')],
      ].map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
      ef.value = String(view.effort);
    }
    const d = el('b5Dist');
    if (d) {
      d.innerHTML = [['jaccard', 'Jaccard'], ['sorensen', 'Sørensen'], ['bray', 'Bray-Curtis']]
        .map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
      d.value = view.dist;
    }
    const g = el('b5Grid');
    if (g) {
      g.innerHTML = [0.25, 0.5, 1, 2].map(v => `<option value="${v}">${v}°</option>`).join('');
      g.value = String(view.grid);
      g.parentElement.style.display = view.unit === 'grid' ? '' : 'none';
    }
    const b = el('b5Band');
    if (b) {
      b.innerHTML = [100, 250, 500, 1000].map(v => `<option value="${v}">${v} m</option>`).join('');
      b.value = String(view.band);
    }
  }

  function init() {
    if (!el('panel-5')) return;
    syncControls();
    ['b5Unit', 'b5Class', 'b5Dist', 'b5Grid', 'b5Band', 'b5Effort'].forEach(id => {
      const n = el(id);
      if (!n) return;
      n.addEventListener('change', () => {
        if (id === 'b5Unit') view.unit = n.value;
        if (id === 'b5Class') view.cls = n.value;
        if (id === 'b5Dist') view.dist = n.value;
        if (id === 'b5Grid') view.grid = Number(n.value);
        if (id === 'b5Band') view.band = Number(n.value);
        if (id === 'b5Effort') view.effort = n.value;
        syncControls();
        runUI();
      });
    });
    run();
  }
  /* desde la interfaz, el cálculo (con las 999 permutaciones de Mantel) va
     en la ventana de trabajo; run() sigue síncrona para las pruebas */
  function runUI() {
    return gpAfterPaint(() => { run(); }, gpWork('Calculando la diversidad y la prueba de Mantel', 'Computing diversity and the Mantel test'));
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('stepchange', e => { if (e.detail.step === 5) { syncControls(); runUI(); } });
  document.addEventListener('langchange', () => { if (el('panel-5')) { syncControls(); run(); } });
  document.addEventListener('themechange', () => { if (el('panel-5') && A) run(); });

  window.B5 = { run, view, analysis: () => A, curvePlot, heatmap, scatter, indexMap, UNITS, CLASSES, INDICES };
})();
