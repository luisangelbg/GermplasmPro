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
    /* los decimales que pide la marca más fina del eje (0.25 lleva dos; antes salía «0.3») */
    const dy = tickDecimals(yt), dx = tickDecimals(xt);
    yt.forEach(t => {
      parts.push(`<line x1="${f.p.l}" y1="${Y(t).toFixed(1)}" x2="${f.W - f.p.r}" y2="${Y(t).toFixed(1)}" stroke="${cv('--grid')}"/>`);
      parts.push(`<text x="${f.p.l - 6}" y="${(Y(t) + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${cv('--text-muted')}">${fmt(t, dy)}</text>`);
    });
    xt.forEach(t => parts.push(`<text x="${X(t).toFixed(1)}" y="${f.H - f.p.b + 14}" text-anchor="middle" font-size="9.5" fill="${cv('--text-muted')}">${fmt(t, dx)}</text>`));
    parts.push(`<line x1="${f.p.l}" y1="${f.H - f.p.b}" x2="${f.W - f.p.r}" y2="${f.H - f.p.b}" stroke="${cv('--border-strong')}"/>`);
    parts.push(`<line x1="${f.p.l}" y1="${f.p.t}" x2="${f.p.l}" y2="${f.H - f.p.b}" stroke="${cv('--border-strong')}"/>`);
    if (xlab) parts.push(`<text x="${(f.p.l + f.W - f.p.r) / 2}" y="${f.H - 4}" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${esc(xlab)}</text>`);
    if (ylab) parts.push(`<text transform="translate(12,${(f.p.t + f.H - f.p.b) / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${esc(ylab)}</text>`);
    return { X, Y, parts };
  }

  /* el menor número de decimales con el que todas las marcas de un eje se escriben exactas */
  function tickDecimals(ticks) {
    for (let d = 0; d <= 4; d++) {
      const k = Math.pow(10, d);
      if (ticks.every(t => Math.abs(Math.round(t * k) - t * k) < 1e-6)) return d;
    }
    return 4;
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
    /* los rótulos de dos estimadores casi iguales no se enciman: el de abajo baja lo necesario */
    let lastY = -Infinity;
    est.slice().sort((a, b) => b.v - a.v).forEach(e => {
      g.push(`<line x1="${f.p.l}" y1="${ax.Y(e.v).toFixed(1)}" x2="${f.W - f.p.r}" y2="${ax.Y(e.v).toFixed(1)}" stroke="${cv(e.c)}" stroke-width="1.3" stroke-dasharray="5 4"/>`);
      const ly = ax.Y(e.v);
      const ty = ly - 4 >= lastY + 11 ? ly - 4 : Math.max(ly + 11, lastY + 11);   /* si no cabe encima de su línea, va debajo */
      lastY = ty;
      g.push(`<text x="${f.W - f.p.r - 4}" y="${ty.toFixed(1)}" text-anchor="end" font-size="9.5" fill="${cv(e.c)}">${e.es} ${fmt(e.v, 0)}</text>`);
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
    const busy = [];   /* lo que ya ocupa el lienzo y las etiquetas deben evitar */
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
        busy.push({ x0: f.W - f.p.r - 56, x1: f.W - f.p.r, y0: f.p.t + 2, y1: f.p.t + 15 });
      }
    }
    data.forEach(d => {
      g.push(`<circle cx="${ax.X(d.x).toFixed(1)}" cy="${ax.Y(d.y).toFixed(1)}" r="${d.r || 4.2}" fill="${d.color || cv('--s1')}" fill-opacity="0.85" stroke="${cv('--card-bg')}"><title>${esc(d.label || '')}</title></circle>`);
    });
    if (o.label) g.push(...scatterLabels(data, ax, f, busy));
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* etiquetas de la dispersión: a la derecha del punto o, si se salen del marco, a la izquierda;
     si chocan con otra ya puesta, arriba o abajo; y si no caben en ningún lado, se omiten (el
     nombre sigue al pasar el ratón por el punto) */
  function scatterLabels(data, ax, f, busy) {
    const placed = (busy || []).slice(), out = [];
    const hit = b => placed.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    data.filter(d => d.label).forEach(d => {
      const txt = String(d.label).slice(0, 14);
      const w = txt.length * 4.9 + 2, cx = ax.X(d.x), cy = ax.Y(d.y);
      const tries = [[6, -5, 'start'], [-6, -5, 'end'], [6, 12, 'start'], [-6, 12, 'end'], [6, -15, 'start'], [-6, -15, 'end']];
      for (const [dx, dy, anchor] of tries) {
        const x = cx + dx, y = cy + dy;
        const b = { x0: anchor === 'start' ? x : x - w, x1: anchor === 'start' ? x + w : x, y0: y - 8, y1: y + 2 };
        if (b.x0 < f.p.l + 2 || b.x1 > f.W - 2 || b.y0 < 2 || b.y1 > f.H - f.p.b - 2) continue;
        /* tampoco encima de otro punto */
        if (hit(b) || data.some(e => e !== d && ax.X(e.x) > b.x0 - 3 && ax.X(e.x) < b.x1 + 3 && ax.Y(e.y) > b.y0 - 3 && ax.Y(e.y) < b.y1 + 3)) continue;
        placed.push(b);
        out.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="9" fill="${cv('--text-muted')}">${esc(txt)}</text>`);
        break;
      }
    });
    return out;
  }

  /* mapa de calor de composición, ordenado por el dendrograma, con el árbol arriba */
  function heatmap(W) {
    if (!A.D || A.big.length < 3) return `<div class="sim-empty">${T('hacen falta al menos tres unidades con dos accesiones cada una', 'at least three units with two accessions each are needed')}</div>`;
    const ord = A.order && A.order.length === A.big.length ? A.order : A.big.map((_, i) => i);
    const n = ord.length;
    const labW = 118, treeH = Math.min(120, 26 + n * 4), cell = Math.max(10, Math.min(26, (W - labW - 24) / n));
    /* debajo de los nombres girados (55°) va la leyenda de color: se deja el alto que ocupa el más largo */
    const longest = Math.max(...ord.map(m => Math.min(18, A.big[m].label.length)));
    const ly = treeH + 6 + n * cell + 14 + Math.round(longest * 5.4 * Math.sin(55 * Math.PI / 180));
    const H = ly + 30;
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
    /* la leyenda de color, dentro de la figura para que viaje con el SVG exportado */
    const lw = Math.min(220, W - x0 - 20), steps = 10;
    for (let k = 0; k < steps; k++) {
      g.push(`<rect x="${(x0 + k * lw / steps).toFixed(1)}" y="${ly}" width="${(lw / steps + 0.4).toFixed(1)}" height="9" fill="${ramp((k + 0.5) / steps)}"/>`);
    }
    g.push(`<rect x="${x0}" y="${ly}" width="${lw.toFixed(1)}" height="9" fill="none" stroke="${cv('--border-strong')}" stroke-width="0.6"/>`);
    g.push(`<text x="${x0 - 6}" y="${ly + 8}" text-anchor="end" font-size="9.5" fill="${cv('--text-muted')}">${esc(T('composición compartida', 'shared composition'))}</text>`);
    g.push(`<text x="${x0}" y="${ly + 21}" font-size="9" fill="${cv('--text-muted')}">0 %</text>`);
    g.push(`<text x="${(x0 + lw / 2).toFixed(1)}" y="${ly + 21}" text-anchor="middle" font-size="9" fill="${cv('--text-muted')}">50 %</text>`);
    g.push(`<text x="${(x0 + lw).toFixed(1)}" y="${ly + 21}" text-anchor="end" font-size="9" fill="${cv('--text-muted')}">100 %</text>`);
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
      { k: T('Accesiones analizadas', 'Accessions analysed'), v: fmtInt(A.nIn), d: T(`de ${fmtInt(A.nPoints)} con coordenadas, en ${A.units.length} unidades`, `of ${fmtInt(A.nPoints)} with coordinates, in ${A.units.length} units`), c: 'var(--s1)' },
      { k: T('Tipos observados', 'Observed types'), v: fmtInt(t.S), d: T('tipos distintos en la colección: ' + clsLabel(), 'distinct types in the collection: ' + clsLabel()), c: 'var(--s3)' },
      { k: T('Riqueza estimada (Chao1)', 'Estimated richness (Chao1)'), v: fmt(A.chao1.est, 1), d: T(`faltarían ${fmt(falta, 1)} por colectar`, `${fmt(falta, 1)} still to be collected`), c: 'var(--s2)' },
      { k: T('Cobertura de la muestra', 'Sample coverage'), v: fmt(100 * t.coverage, 1) + ' %', d: T('Good-Turing: 1 − f₁/n', 'Good-Turing: 1 − f₁/n'), c: 'var(--s4)' },
      { k: T('Recambio entre unidades (<span class="nt">β</span>)', 'Turnover between units (<span class="nt">β</span>)'), v: fmt(A.beta, 2), d: T(`γ = ${fmtInt(t.S)} tipos, α media = ${fmt(A.alphaBar, 1)}`, `γ = ${fmtInt(t.S)} types, mean α = ${fmt(A.alphaBar, 1)}`), c: 'var(--s6)' },
      { k: T('Diversidad efectiva', 'Effective diversity'), v: fmt(t.q1, 1), d: T('tipos efectivos (Hill q=1)', 'effective types (Hill q=1)'), c: 'var(--s7)' },
    ].map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');

    const idxDef = INDICES.find(i => i.k === view.index) || INDICES[1];
    const sorted = sortUnits(A.units, view.sort.k, view.sort.dir);

    /* los encabezados van en HTML: «q1» y «J′» no deben pasar a mayúsculas */
    const cols = [
      ['label', esc(T('Unidad', 'Unit'))], ['N', esc(T('Accesiones', 'Accessions'))], ['S', esc(T('Riqueza S', 'Richness S'))],
      ['rare', esc(T(`Rarificada a ${A.nCommon}`, `Rarefied to ${A.nCommon}`))], ['H', 'H′'], ['simpson', '1 − D'],
      ['pielou', 'J′'], ['q1', 'Hill <span class="nt">q1</span>'], ['exclusive', esc(T('Exclusivos', 'Exclusive'))],
      ['meanElev', esc(T('Altitud media', 'Mean elevation'))],
    ];
    const plural = (n, uno, varios) => (n === 1 ? uno : varios);

    const mant = A.mantel;
    const bandChart = view.unit === 'band' ? '' : bandSection();

    const motivo = {
      state: T('caen fuera de México', 'fall outside Mexico'),
      country: T('no caen en ningún país ni traen país de origen', 'fall in no country and carry no country of origin'),
      grid: '', band: T(`no tienen altitud válida (${[A.elevMissing ? `${A.elevMissing} sin dato` : '', A.elevOdd ? `${A.elevOdd} fuera de ${fmtInt(GEO.ELEV_MIN).replace("-", "−")} a ${fmtInt(GEO.ELEV_MAX)} m` : ''].filter(Boolean).join(' y ')})`,
        `have no valid elevation (${[A.elevMissing ? `${A.elevMissing} missing` : '', A.elevOdd ? `${A.elevOdd} outside ${fmtInt(GEO.ELEV_MIN).replace("-", "−")} to ${fmtInt(GEO.ELEV_MAX)} m` : ''].filter(Boolean).join(' and ')})`),
    }[view.unit] || '';
    /* una sola accesión fuera: «queda fuera 1 … porque no tiene» */
    const uno = A.nOut === 1;
    const motivoUno = motivo.replace(/^caen /, 'cae ').replace(/^no caen /, 'no cae ').replace(/ ni traen /, ' ni trae ').replace(/^no tienen /, 'no tiene ')
      .replace(/^fall /, 'falls ').replace(/ carry /, ' carries ').replace(/^have /, 'has ');
    el('b5Body').innerHTML = `
      <p class="hint">${T(`Todos los totales —riqueza γ, α media, β, Chao1, Chao2, jackknife y la curva— se calculan sobre las mismas <b>${fmtInt(A.nIn)} accesiones</b>: las que quedan dentro de alguna unidad.`,
        `Every total —γ richness, mean α, β, Chao1, Chao2, jackknife and the curve— is computed on the same <b>${fmtInt(A.nIn)} accessions</b>: those that fall inside some unit.`)}${A.nOut ? T(` ${uno ? 'Queda' : 'Quedan'} fuera ${fmtInt(A.nOut)} de las ${fmtInt(A.nPoints)} con coordenadas, porque ${uno ? motivoUno : motivo}.`, ` ${fmtInt(A.nOut)} of the ${fmtInt(A.nPoints)} with coordinates ${uno ? 'is' : 'are'} left out because ${uno ? 'it' : 'they'} ${uno ? motivoUno : motivo}.`) : ''}</p>
      ${!A.chao1.reliable ? `<div class="note-warn">${T(
        `<b>Cuidado con Chao1 en esta colección.</b> De ${fmtInt(A.total.S)} tipos, ${A.chao1.f1} ${plural(A.chao1.f1, 'aparece', 'aparecen')} una sola vez y ${A.chao1.f2 === 0 ? 'ninguno aparece' : `sólo ${A.chao1.f2} ${plural(A.chao1.f2, 'aparece', 'aparecen')}`} dos veces; con tan pocos dobletones la fórmula f₁²/(2f₂) se dispara y da ${fmt(A.chao1.est, 0)}. En un caso así conviene leer los estimadores de presencias —jackknife 1 (${fmt(A.inc.jack1, 1)}) y Chao2 (${fmt(A.inc.chao2, 1)})—, que son más estables, y sobre todo entender el mensaje de fondo: la colección está lejos de saturarse.`,
        `<b>Careful with Chao1 in this collection.</b> Of ${fmtInt(A.total.S)} types, ${A.chao1.f1} ${plural(A.chao1.f1, 'appears', 'appear')} only once and ${A.chao1.f2 === 0 ? 'none appears' : `just ${A.chao1.f2} ${plural(A.chao1.f2, 'appears', 'appear')}`} twice; with so few doubletons the f₁²/(2f₂) formula explodes and returns ${fmt(A.chao1.est, 0)}. In such a case read the incidence estimators —jackknife 1 (${fmt(A.inc.jack1, 1)}) and Chao2 (${fmt(A.inc.chao2, 1)})—, which are steadier, and above all take the underlying message: the collection is far from saturated.`)}</div>` : ''}

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
          ${cols.map(([k, t2]) => `<th class="${k === 'label' ? '' : 'num'}"${view.sort.k === k ? ` aria-sort="${view.sort.dir > 0 ? 'ascending' : 'descending'}"` : ''}><button class="th-btn${view.sort.k === k ? ' on' : ''}" data-s5sort="${k}">${t2}${view.sort.k === k ? (view.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}
        </tr></thead><tbody>
          ${sorted.map(u => `<tr>
            <td>${esc(u.label)}</td>
            <td class="num">${u.N}</td><td class="num">${u.S}</td>
            <td class="num">${isFinite(u.rare) ? fmt(u.rare, 2) : '—'}</td>
            <td class="num">${fmt(u.H, 2)}</td><td class="num">${fmt(u.simpson, 3)}</td>
            <td class="num">${isFinite(u.pielou) ? fmt(u.pielou, 2) : '—'}</td><td class="num">${fmt(u.q1, 2)}</td>
            <td class="num">${u.exclusive || 0}</td>
            <td class="num">${isFinite(u.meanElev) ? fmtInt(u.meanElev) + ' m' : '—'}</td>
          </tr>`).join('')}
        </tbody></table></div>
        <p class="hint">${T(`La columna rarificada compara todas las unidades al mismo esfuerzo (${A.nCommon} accesiones); las que tienen menos aparecen vacías porque rarificar hacia arriba sería inventar. «Exclusivos» son los tipos —${clsLabel()}— que no están en ninguna otra unidad: si esa unidad se pierde, se pierden con ella.`,
          `The rarefied column compares every unit at the same effort (${A.nCommon} accessions); units with fewer are left blank because rarefying upwards would be making things up. "Exclusive" counts the types —${clsLabel()}— found in no other unit: if that unit is lost, they go with it.`)}
          ${T(' J′ queda en «—» cuando la unidad tiene un solo tipo: con uno no hay reparto que medir.', ' J′ shows «—» when the unit holds a single type: with one there is no spread to measure.')}</p>
      </div>

      ${indexMap(900, 420) ? `<div class="card" style="margin-top:14px">
        <div class="imp-row"><label class="inline-label">${T('Mapa del índice', 'Index map')}<select class="sel" id="b5Index"></select></label>
        <span class="hint">${esc(T(idxDef.d.es, idxDef.d.en))}</span></div>
        <div class="map-wrap">${indexMap(900, 420)}</div>
        <div class="map-legends"><div class="map-legend"><b>${esc(T(idxDef.es, idxDef.en))}</b>
          <div class="legend-scale"><div class="legend-ramp">${[...Array(6)].map((_, i) => `<i style="background:${ramp(0.12 + 0.88 * i / 5)}"></i>`).join('')}</div>
          <div class="legend-ends">${indexRange()}</div></div></div></div>
      </div>` : ''}

      <h3 class="section-title">${T('3 · ¿Se parecen las regiones?', '3 · Do the regions resemble each other?')}</h3>
      <p class="section-sub">${T(
        'El mapa de calor muestra cuánto comparten dos unidades: cuanto más oscuro, más parecida es su composición. El árbol de arriba las agrupa por ese parecido (UPGMA). La prueba de Mantel pregunta si las unidades cercanas se parecen más que las lejanas, comparando la matriz de distancias en kilómetros con la de composición.',
        'The heat map shows how much two units share: the darker, the more alike their composition. The tree above groups them by that resemblance (UPGMA). The Mantel test asks whether nearby units resemble each other more than distant ones, comparing the matrix of distances in kilometres with the compositional one.')}${A.mantelDist === 'elev' ? T(
        ' Con franjas de altitud como unidades no hay kilómetros que medir: la distancia entre dos franjas es la diferencia de altitud entre sus centros, y la prueba pregunta si las franjas de altitud parecida se parecen en composición.',
        ' With elevation belts as units there are no kilometres to measure: the distance between two belts is the elevation difference between their centres, and the test asks whether belts at similar elevations are alike in composition.') : ''}</p>
      <div class="card"><div class="sum-grid">
        <div class="pg-pane"><div class="pg-title">${T('Composición compartida y agrupamiento', 'Shared composition and clustering')}</div>${heatmap(540)}</div>
        <div class="pg-pane"><div class="pg-title">${A.mantelDist === 'elev' ? T('Diferencia de altitud contra disimilitud', 'Elevation difference against dissimilarity') : T('Distancia geográfica contra disimilitud', 'Geographic distance against dissimilarity')}</div>
          ${mantelPlot(520, 320)}
          <p class="hint">${mantelText()}</p></div>
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
    if (!A.mantel || !A.D || A.big.length < 4) return `<div class="sim-empty">${T('hacen falta al menos cuatro unidades con dos accesiones o más', 'at least four units with two or more accessions are needed')}</div>`;
    const data = [];
    for (let i = 0; i < A.big.length; i++) {
      for (let j = i + 1; j < A.big.length; j++) {
        data.push({ x: A.mantel.G[i][j], y: A.D[i][j], label: `${A.big[i].label} ↔ ${A.big[j].label}`, r: 3.2 });
      }
    }
    const xlab = A.mantelDist === 'elev'
      ? T('diferencia de altitud entre centros de franja (m)', 'elevation difference between belt centres (m)')
      : T('distancia entre unidades (km)', 'distance between units (km)');
    return scatter(W, H, data, xlab, T('disimilitud de composición', 'compositional dissimilarity'), { line: true });
  }

  /* el resultado de Mantel o, si no se pudo calcular, la causa verdadera */
  function mantelText() {
    const mant = A.mantel, nBig = A.big.length;
    const elev = A.mantelDist === 'elev';
    if (mant && isFinite(mant.r)) {
      return T(`Mantel${elev ? ' (contra la diferencia de altitud)' : ''}: r = ${fmt(mant.r, 3)}, p = ${fmt(mant.p, 3)} con ${mant.perms} permutaciones y ${mant.n} unidades. ${mant.p < 0.05 ? (elev ? 'Hay estructura altitudinal: las franjas de altitud parecida se parecen.' : 'Hay estructura geográfica: lo cercano se parece.') : (elev ? 'No hay evidencia de estructura altitudinal con estas franjas.' : 'No hay evidencia de estructura geográfica en esta escala.')}`,
        `Mantel${elev ? ' (against elevation difference)' : ''}: r = ${fmt(mant.r, 3)}, p = ${fmt(mant.p, 3)} with ${mant.perms} permutations and ${mant.n} units. ${mant.p < 0.05 ? (elev ? 'There is elevational structure: belts at similar elevations are alike.' : 'There is geographic structure: what is close is alike.') : (elev ? 'No evidence of elevational structure with these belts.' : 'No evidence of geographic structure at this scale.')}`);
    }
    const why = A.mantelWhy;
    if (why === 'few') {
      return T(`La prueba de Mantel necesita al menos cuatro unidades con dos accesiones o más, y aquí ${nBig === 1 ? 'sólo hay una' : nBig === 0 ? 'no hay ninguna' : `sólo hay ${nBig}`} (de ${A.units.length} unidades con datos; las de una sola accesión no tienen composición que comparar). ${A.unitMode === 'country' ? 'Con esta colección conviene usar entidades, celdas de rejilla o franjas de altitud.' : 'Prueba con unidades que reúnan más accesiones: celdas de más grados o franjas más anchas.'}`,
        `The Mantel test needs at least four units with two or more accessions, and here there ${nBig === 1 ? 'is only one' : nBig === 0 ? 'are none' : `are only ${nBig}`} (out of ${A.units.length} units with data; single-accession units have no composition to compare). ${A.unitMode === 'country' ? 'With this collection, use states, grid cells or elevation belts instead.' : 'Try units that gather more accessions: larger cells or wider belts.'}`);
    }
    if (why === 'flatD') {
      return T(`No se puede calcular la correlación de Mantel: las ${nBig} unidades tienen todas la misma disimilitud entre sí (por ejemplo, ningún par comparte tipos), así que no hay variación que correlacionar.`,
        `The Mantel correlation cannot be computed: all ${nBig} units have the same dissimilarity to one another (for example, no pair shares any type), so there is no variation to correlate.`);
    }
    if (why === 'flatG') {
      return T(`No se puede calcular la correlación de Mantel: las ${nBig} unidades están todas a la misma distancia entre sí, así que no hay variación que correlacionar.`,
        `The Mantel correlation cannot be computed: all ${nBig} units are the same distance apart, so there is no variation to correlate.`);
    }
    if (why === 'nogeo') {
      return T('No se puede calcular la prueba de Mantel: alguna unidad no tiene posición con la que medir distancias.', 'The Mantel test cannot be computed: some unit has no position to measure distances from.');
    }
    return T('No se pudo calcular la correlación de Mantel con estos datos.', 'The Mantel correlation could not be computed with these data.');
  }

  /* los extremos de la rampa del mapa del índice, con sus números */
  function indexRange() {
    const vals = A.units.map(u => Number(u[view.index])).filter(v => isFinite(v));
    if (!vals.length) return '';
    const d = ['N', 'S', 'exclusive'].includes(view.index) ? 0 : 2;
    return `<span>${fmt(Math.min(...vals), d)}</span><span>${fmt(Math.max(...vals), d)}</span>`;
  }

  /* orden de la tabla: los números como números y las celdas sin valor («—», NaN) siempre al
     final, se ordene hacia arriba o hacia abajo */
  function sortUnits(units, k, dir) {
    return units.slice().sort((a, b) => {
      if (k === 'label') return String(a.label ?? '').localeCompare(String(b.label ?? ''), 'es') * dir;
      const x = Number(a[k]), y = Number(b[k]);
      const fx = isFinite(x), fy = isFinite(y);
      if (fx && fy) return (x - y) * dir;
      if (fx !== fy) return fx ? -1 : 1;
      return 0;
    });
  }

  /* reparto por franja altitudinal, aunque la unidad activa sea otra */
  function bandSection() {
    /* todas las franjas entre la más baja y la más alta, también las vacías (con cero): son las
       que importan. Las altitudes imposibles (fuera de −500 a 7000 m) se dejan fuera y se dice. */
    const ser = DIV.bandSeries(GEO.pointsOf(state.acc), view.cls, view.band);
    if (ser.used < 4) return '';
    const bands = ser.bands;
    if (!bands.length) return '';
    const maxN = Math.max(...bands.map(b => b.N));
    const W = 900, rowH = 24, H = bands.length * rowH + 30;
    const g = [];
    bands.slice().reverse().forEach((b, i) => {
      const y = 10 + i * rowH;
      const wN = (W - 210) * b.N / maxN, wS = (W - 210) * b.S / maxN;
      g.push(`<text x="96" y="${y + 13}" text-anchor="end" font-size="10" fill="${cv(b.N ? '--text' : '--text-muted')}">${esc(b.label)}</text>`);
      if (!b.N) {
        /* franja vacía: una raya punteada y el cero, para que el hueco se vea */
        g.push(`<text x="110" y="${y + 15}" font-size="9.5" fill="${cv('--text-muted')}">0 · 0 — ${esc(T('sin colectas en esta franja', 'no collections in this belt'))}</text>`);
        g.push(`<line x1="262" y1="${y + 11.5}" x2="${W - 106}" y2="${y + 11.5}" stroke="${cv('--border-strong')}" stroke-dasharray="2 4"/>`);
        return;
      }
      g.push(`<rect x="104" y="${y + 3}" width="${Math.max(1, wN).toFixed(1)}" height="8" rx="3" fill="${cv('--s1')}" opacity=".85"><title>${b.N} ${T('accesiones', 'accessions')}</title></rect>`);
      g.push(`<rect x="104" y="${y + 12}" width="${Math.max(1, wS).toFixed(1)}" height="8" rx="3" fill="${cv('--s3')}" opacity=".85"><title>${b.S} ${T('tipos', 'types')}</title></rect>`);
      g.push(`<text x="${(110 + Math.max(wN, wS)).toFixed(1)}" y="${y + 15}" font-size="9.5" fill="${cv('--text-muted')}">${b.N} · ${b.S}</text>`);
    });
    const vacias = bands.filter(b => !b.N).length;
    const notas = [];
    if (vacias) notas.push(T(`${vacias} ${vacias === 1 ? 'franja vacía' : 'franjas vacías'} dentro del intervalo colectado.`, `${vacias} empty ${vacias === 1 ? 'belt' : 'belts'} within the collected range.`));
    if (ser.fuera) notas.push(T(`${ser.fuera} ${ser.fuera === 1 ? 'accesión trae una altitud imposible y queda fuera' : 'accesiones traen altitudes imposibles y quedan fuera'} (se aceptan de ${fmtInt(GEO.ELEV_MIN).replace("-", "−")} a ${fmtInt(GEO.ELEV_MAX)} m; ${ser.fuera === 1 ? 'corrígela' : 'corrígelas'} en la ficha de la accesión, en el Bloque 2).`,
      `${ser.fuera} ${ser.fuera === 1 ? 'accession has an impossible elevation and is left out' : 'accessions have impossible elevations and are left out'} (accepted range ${fmtInt(GEO.ELEV_MIN).replace("-", "−")} to ${fmtInt(GEO.ELEV_MAX)} m; fix ${ser.fuera === 1 ? 'it' : 'them'} in the accession record, in Block 2).`));
    if (ser.sinDato) notas.push(T(`${ser.sinDato} sin altitud.`, `${ser.sinDato} without elevation.`));
    return `<h3 class="section-title">${T('4 · El gradiente altitudinal', '4 · The elevation gradient')}</h3>
      <p class="section-sub">${T(`Accesiones (barra superior) y tipos distintos —${clsLabel()}— (barra inferior) por franja de ${view.band} m. En un país de montaña la altitud ordena el germoplasma mejor que casi cualquier otra variable: las franjas vacías son ambientes que la colección no representa.`,
        `Accessions (upper bar) and distinct types —${clsLabel()}— (lower bar) per ${view.band} m belt. In a mountainous country, elevation sorts germplasm better than almost any other variable: empty belts are environments the collection does not represent.`)}</p>
      <div class="card"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>
      <div class="map-legends"><div class="map-legend">
        <span class="lg-item"><i style="background:${cv('--s1')}"></i>${T('accesiones', 'accessions')}</span>
        <span class="lg-item"><i style="background:${cv('--s3')}"></i>${T('tipos distintos', 'distinct types')}</span></div></div>
      <p class="hint">${T(`Entran ${fmtInt(ser.used)} accesiones con altitud válida.`, `${fmtInt(ser.used)} accessions with a valid elevation are included.`)} ${notas.join(' ')}</p></div>`;
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
      pielou: isFinite(u.pielou) ? Math.round(u.pielou * 1000) / 1000 : '', hill_q1: Math.round(u.q1 * 1000) / 1000,
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

  window.B5 = { run, view, analysis: () => A, curvePlot, heatmap, scatter, indexMap, sortUnits, tickDecimals, mantelText, bandSection, UNITS, CLASSES, INDICES };
})();
