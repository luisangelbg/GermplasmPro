/* GermplasmPro — Bloque 7: caracterización y colección núcleo.

   Cuatro pasos:
     1. Traer los datos de caracterización y decir qué es cada carácter
        (cuantitativo, ordinal o cualitativo) y cuánto pesa.
     2. Ver la variación descriptor por descriptor.
     3. Poner las accesiones en un mapa de parecido: distancia de Gower,
        coordenadas principales y agrupamiento con su silueta.
     4. Armar la colección núcleo y comprobar, con los criterios de Hu et al.,
        que de verdad representa a la colección entera.

   Los datos de caracterización se unen a las accesiones por su número de
   accesión (ACCENUMB), que es la llave del Bloque 2. */

(function () {

  const view = {
    k: 4,                 /* grupos del agrupamiento */
    tree: 'ward',         /* ward | upgma */
    pct: 10,              /* tamaño del núcleo, en % */
    strata: 'group',      /* group | state | crop | taxon | none */
    alloc: 'L',
    pick: 'distance',
    method: 'strata',     /* strata | M */
    seed: 20260923,
    colorBy: 'group',     /* group | crop | taxon | core */
  };
  let defs = [];          /* [{k, type, weight, use}] */
  let A = null;           /* resultados */

  const cv = n => B4.paint(n);   /* referencias al tema: la figura cambia sola con él */
  const ramp = t => B4.ramp(t);
  const CATC = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8'];

  /* ============ datos ============ */
  function rowsWithTraits() {
    const byNum = new Map();
    (state.traits || []).forEach(t => {
      const k = String(t.ACCENUMB || '').trim();
      if (k) byNum.set(k, t);
    });
    const out = [];
    state.acc.forEach((r, i) => {
      const t = byNum.get(String(r.ACCENUMB || '').trim());
      if (!t) return;
      out.push({ i, acc: r, t });
    });
    return out;
  }

  function buildDefs(traits) {
    const keys = [...new Set([].concat(...traits.map(t => Object.keys(t))))].filter(k => k !== 'ACCENUMB');
    const prev = Object.fromEntries(defs.map(d => [d.k, d]));
    defs = keys.map(k => {
      const values = traits.map(t => t[k]);
      const type = prev[k] ? prev[k].type : CHAR.detectType(values);
      return { k, type, weight: prev[k] ? prev[k].weight : 1, use: prev[k] ? prev[k].use : type !== 'empty' };
    });
    return defs;
  }

  /* ============ cálculo ============ */
  function run() {
    const pairs = rowsWithTraits();
    if (!pairs.length) { A = null; if (el('panel-7')) render(pairs); return null; }
    const traits = pairs.map(p => p.t);
    buildDefs(traits);
    const used = defs.filter(d => d.use && d.type !== 'empty');

    const { D } = CHAR.gowerMatrix(traits, used);
    const labels = pairs.map(p => p.acc.ACCENUMB || ('#' + (p.i + 1)));
    const tree = view.tree === 'upgma' ? DIV.upgma(D, labels) : CHAR.wardTree(D, labels);
    const groups = tree ? CHAR.cutTree(tree, clamp(view.k, 2, Math.min(12, pairs.length))) : pairs.map(() => 0);
    const sil = CHAR.silhouette(D, groups);
    const ord = CHAR.pcoa(D, 3);

    /* estratos para el núcleo */
    const strata = pairs.map((p, idx) => {
      if (view.strata === 'group') return 'G' + (groups[idx] + 1);
      if (view.strata === 'state') { const s = GEO.stateOf(Number(p.acc.DECLONGITUDE), Number(p.acc.DECLATITUDE)); return s ? s.code : (p.acc.ORIGCTY || '—'); }
      if (view.strata === 'crop') return p.acc.CROPNAME || '—';
      if (view.strata === 'taxon') return [p.acc.GENUS, p.acc.SPECIES].filter(Boolean).join(' ') || '—';
      return 'todo';
    });

    const core = CHAR.buildCore(traits, used, {
      pct: view.pct, strata: view.method === 'M' ? null : strata,
      allocation: view.alloc, pick: view.pick, method: view.method, D, seed: view.seed,
    });
    const val = CHAR.validateCore(traits, used, core.core);

    A = { pairs, traits, used, D, tree, groups, sil, ord, strata, core, val, labels };
    if (el('panel-7')) render(pairs);
    return A;
  }

  /* ============ figuras ============ */
  function pcoaPlot(W, H) {
    if (!A || !A.ord.coords.length) return `<div class="sim-empty">${T('hacen falta al menos tres accesiones caracterizadas', 'at least three characterized accessions are needed')}</div>`;
    const xs = A.ord.coords.map(c => c[0]), ys = A.ord.coords.map(c => c[1]);
    const pad = { l: 44, r: 14, t: 14, b: 34 };
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const X = v => pad.l + (v - x0) / ((x1 - x0) || 1) * (W - pad.l - pad.r);
    const Y = v => H - pad.b - (v - y0) / ((y1 - y0) || 1) * (H - pad.t - pad.b);
    const g = [];
    g.push(`<line x1="${X(0).toFixed(1)}" y1="${pad.t}" x2="${X(0).toFixed(1)}" y2="${H - pad.b}" stroke="${cv('--grid')}"/>`);
    g.push(`<line x1="${pad.l}" y1="${Y(0).toFixed(1)}" x2="${W - pad.r}" y2="${Y(0).toFixed(1)}" stroke="${cv('--grid')}"/>`);
    const inCore = new Set(A.core.core);
    const catKey = i => {
      const p = A.pairs[i];
      if (view.colorBy === 'group') return 'G' + (A.groups[i] + 1);
      if (view.colorBy === 'crop') return p.acc.CROPNAME || '—';
      if (view.colorBy === 'taxon') return [p.acc.GENUS, p.acc.SPECIES].filter(Boolean).join(' ') || '—';
      return inCore.has(i) ? T('núcleo', 'core') : T('resto', 'rest');
    };
    const cats = [...new Set(A.pairs.map((_, i) => catKey(i)))];
    A.ord.coords.forEach((c, i) => {
      const col = cv(CATC[cats.indexOf(catKey(i)) % CATC.length]);
      const isCore = inCore.has(i);
      g.push(`<circle cx="${X(c[0]).toFixed(1)}" cy="${Y(c[1]).toFixed(1)}" r="${isCore ? 6 : 4}" fill="${col}" fill-opacity="${isCore ? 0.95 : 0.6}" stroke="${isCore ? cv('--text') : cv('--card-bg')}" stroke-width="${isCore ? 1.6 : 0.8}"><title>${esc(A.labels[i])}${isCore ? ' · ' + T('núcleo', 'core') : ''}</title></circle>`);
    });
    g.push(`<text x="${(pad.l + W - pad.r) / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${T('eje 1', 'axis 1')} (${fmt(A.ord.explained[0], 1)} %)</text>`);
    g.push(`<text transform="translate(12,${(pad.t + H - pad.b) / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${T('eje 2', 'axis 2')} (${fmt(A.ord.explained[1], 1)} %)</text>`);
    const leg = cats.map((c, i) => `<span class="lg-item"><i style="background:${cv(CATC[i % CATC.length])}"></i>${esc(c)}</span>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>
      <div class="map-legend" style="margin-top:6px">${leg}<span class="lg-item">○ ${T('círculo grande y con borde = está en el núcleo', 'large outlined circle = in the core')}</span></div>`;
  }

  function dendroPlot(W) {
    if (!A || !A.tree) return `<div class="sim-empty">${T('sin árbol', 'no tree')}</div>`;
    const n = A.pairs.length;
    const leafH = Math.max(11, Math.min(20, 620 / n));
    const H = n * leafH + 40, labW = 150;
    const maxH = Math.max(1e-9, A.tree.height);
    const g = [];
    const order = DIV.leafOrder(A.tree);
    const ypos = {};
    order.forEach((m, idx) => { ypos[m] = 16 + idx * leafH; });
    const X = h => labW + (1 - h / maxH) * (W - labW - 24);
    const draw = node => {
      if (!node.children) {
        const y = ypos[node.members[0]];
        const gi = A.groups[node.members[0]];
        g.push(`<text x="${labW - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="${cv(CATC[gi % CATC.length])}">${esc(A.labels[node.members[0]])}</text>`);
        return { x: X(0), y };
      }
      const a = draw(node.children[0]), b = draw(node.children[1]);
      const x = X(node.height);
      g.push(`<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${x.toFixed(1)} ${a.y.toFixed(1)} L${x.toFixed(1)} ${b.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="${cv('--text-muted')}" stroke-width="1.1"/>`);
      return { x, y: (a.y + b.y) / 2 };
    };
    draw(A.tree);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* ============ interfaz ============ */
  function render(pairs) {
    const total = state.acc.length;
    if (!total) {
      el('b7Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      el('b7Stats').innerHTML = '';
      return;
    }
    if (!pairs.length || !A) {
      el('b7Body').innerHTML = `<div class="sim-empty">${T('Todavía no hay datos de caracterización: cárgalos o abre los del ejemplo con el botón de arriba.', 'No characterization data yet: load yours or open the example ones with the button above.')}</div>`;
      el('b7Stats').innerHTML = '';
      return;
    }

    const v = A.val;
    const semaf = (ok) => ok ? 'ok' : 'warn';
    el('b7Stats').innerHTML = [
      { k: T('Accesiones caracterizadas', 'Characterized accessions'), v: fmtInt(A.pairs.length), d: T(`de ${total} en la colección · ${A.used.length} caracteres`, `of ${total} in the collection · ${A.used.length} traits`), c: 'var(--s1)' },
      { k: T('Grupos', 'Groups'), v: fmtInt(view.k), d: T(`silueta media ${fmt(A.sil.mean, 2)}`, `mean silhouette ${fmt(A.sil.mean, 2)}`), c: A.sil.mean > 0.25 ? 'var(--s3)' : 'var(--stWarn)' },
      { k: T('Núcleo', 'Core'), v: fmtInt(A.core.core.length), d: T(`${fmt(v.pct, 1)} % de las caracterizadas`, `${fmt(v.pct, 1)}% of the characterized ones`), c: 'var(--s2)' },
      { k: 'MD%', v: fmt(v.MD, 1), d: T('medias que difieren (bueno: < 20)', 'means that differ (good: < 20)'), c: v.MD < 20 ? 'var(--s3)' : 'var(--danger)' },
      { k: 'CR%', v: fmt(v.CR, 1), d: T('rango conservado (bueno: > 80)', 'range retained (good: > 80)'), c: v.CR > 80 ? 'var(--s3)' : 'var(--danger)' },
      { k: 'VR%', v: fmt(v.VR, 1), d: T('variación conservada (bueno: ≥ 100)', 'variation retained (good: ≥ 100)'), c: v.VR >= 95 ? 'var(--s3)' : 'var(--stWarn)' },
    ].map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');

    /* descriptiva por carácter */
    const desc = defs.map(d => ({ d, s: CHAR.describe(A.traits.map(t => t[d.k]), d.type) }));

    el('b7Body').innerHTML = `
      <h3 class="section-title">${T('1 · Los caracteres', '1 · The traits')}</h3>
      <p class="section-sub">${T(
        'La app propone el tipo de cada columna mirando sus valores; corrígelo si hace falta y quita los que no quieras usar. El peso entra en la distancia de Gower: si dos caracteres miden casi lo mismo, bajarle el peso a uno evita contarlo dos veces.',
        'The app proposes the type of each column by looking at its values; correct it if needed and switch off the ones you do not want. The weight enters the Gower distance: if two traits measure nearly the same thing, lowering one avoids counting it twice.')}</p>
      <div class="card"><div class="table-wrap"><table class="tbl"><thead><tr>
        <th>${T('Carácter', 'Trait')}</th><th>${T('Tipo', 'Type')}</th><th>${T('Peso', 'Weight')}</th>
        <th class="num">n</th><th class="num">${T('Faltan', 'Missing')}</th><th>${T('Resumen', 'Summary')}</th>
      </tr></thead><tbody>
      ${desc.map(({ d, s }) => `<tr>
        <td><label><input type="checkbox" data-use="${esc(d.k)}" ${d.use ? 'checked' : ''}> ${esc(d.k)}</label></td>
        <td><select class="sel" data-type="${esc(d.k)}">
          ${[['num', T('cuantitativo', 'quantitative')], ['ord', T('ordinal', 'ordinal')], ['cat', T('cualitativo', 'qualitative')]]
            .map(([v2, t2]) => `<option value="${v2}"${d.type === v2 ? ' selected' : ''}>${esc(t2)}</option>`).join('')}
        </select></td>
        <td><input class="inp" type="number" min="0" max="5" step="0.5" style="width:70px" data-w="${esc(d.k)}" value="${d.weight}"></td>
        <td class="num">${s.n || 0}</td><td class="num">${s.missing || 0}</td>
        <td>${s.type === 'cat'
          ? `${s.classes} ${T('clases', 'classes')} · H′ = ${fmt(s.H, 2)} · ${T('equitatividad', 'evenness')} ${fmt(s.evenness, 2)} · ${esc(s.counts.slice(0, 3).map(c => c[0] + ' (' + c[1] + ')').join(', '))}`
          : s.n ? `${T('media', 'mean')} ${fmt(s.mean, 2)} ± ${fmt(s.sd, 2)} · CV ${fmt(s.cv, 1)} % · ${T('rango', 'range')} ${fmt(s.min, 2)}–${fmt(s.max, 2)}` : '—'}</td>
      </tr>`).join('')}
      </tbody></table></div></div>

      <h3 class="section-title">${T('2 · El mapa de parecido', '2 · The map of resemblance')}</h3>
      <p class="section-sub">${T(
        'La distancia de Gower compara accesiones con caracteres mixtos y datos faltantes: cada carácter aporta su diferencia relativa y se promedia sólo sobre lo que ambas tienen medido. Las coordenadas principales proyectan esa matriz en dos ejes, y el árbol agrupa por lo mismo. La silueta media dice si los grupos son reales: por encima de 0.25 hay estructura, cerca de cero el corte es arbitrario.',
        'Gower distance compares accessions with mixed traits and missing data: each trait contributes its relative difference and the average is taken only over what both have measured. Principal coordinates project that matrix onto two axes, and the tree groups by the same thing. The mean silhouette says whether the groups are real: above 0.25 there is structure, near zero the cut is arbitrary.')}</p>
      <div class="card">
        <div class="imp-row">
          <label class="inline-label">${T('Árbol', 'Tree')}<select class="sel" id="b7Tree">
            <option value="ward"${view.tree === 'ward' ? ' selected' : ''}>Ward.D2</option>
            <option value="upgma"${view.tree === 'upgma' ? ' selected' : ''}>UPGMA</option></select></label>
          <label class="inline-label">${T('Grupos', 'Groups')}<select class="sel" id="b7K">
            ${[2, 3, 4, 5, 6, 7, 8].map(k => `<option value="${k}"${view.k === k ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
          <label class="inline-label">${T('Colorear por', 'Colour by')}<select class="sel" id="b7Color">
            ${[['group', T('grupo', 'group')], ['crop', T('cultivo', 'crop')], ['taxon', T('especie', 'species')], ['core', T('núcleo', 'core')]]
              .map(([v2, t2]) => `<option value="${v2}"${view.colorBy === v2 ? ' selected' : ''}>${esc(t2)}</option>`).join('')}</select></label>
          <span class="hint">${T(`El eje 1 explica ${fmt(A.ord.explained[0], 1)} % y el eje 2 ${fmt(A.ord.explained[1], 1)} % de la variación.`, `Axis 1 explains ${fmt(A.ord.explained[0], 1)}% and axis 2 ${fmt(A.ord.explained[1], 1)}% of the variation.`)}</span>
        </div>
        <div class="sum-grid">
          <div class="pg-pane"><div class="pg-title">${T('Coordenadas principales (PCoA sobre Gower)', 'Principal coordinates (PCoA on Gower)')}</div>${pcoaPlot(520, 380)}</div>
          <div class="pg-pane"><div class="pg-title">${T('Agrupamiento', 'Clustering')}</div><div style="max-height:420px;overflow:auto">${dendroPlot(520)}</div></div>
        </div>
      </div>

      <h3 class="section-title">${T('3 · La colección núcleo', '3 · The core collection')}</h3>
      <p class="section-sub">${T(
        'Un núcleo es el subconjunto pequeño que representa a la colección entera: sirve para caracterizar a fondo, para evaluar en campo o para atender pedidos sin tocar todo el banco. Se arma repartiendo el tamaño objetivo entre estratos —los grupos del agrupamiento, la entidad, el cultivo o la especie— con una de las cuatro reglas clásicas, y eligiendo dentro de cada estrato al azar o las accesiones más distintas entre sí. El método M, en cambio, no estratifica: va tomando la accesión que más clases nuevas aporta.',
        'A core is the small subset that represents the whole collection: it is what you characterize in depth, evaluate in the field or use to serve requests without touching the entire genebank. It is built by splitting the target size among strata —clusters, state, crop or species— with one of the four classic rules, picking inside each stratum at random or the most distinct accessions. Method M does not stratify: it keeps taking the accession that adds the most new classes.')}</p>
      <div class="card">
        <div class="imp-row">
          <label class="inline-label">${T('Tamaño', 'Size')}<select class="sel" id="b7Pct">
            ${[5, 10, 15, 20, 25, 30].map(p => `<option value="${p}"${view.pct === p ? ' selected' : ''}>${p} %</option>`).join('')}</select></label>
          <label class="inline-label">${T('Método', 'Method')}<select class="sel" id="b7Method">
            <option value="strata"${view.method === 'strata' ? ' selected' : ''}>${T('por estratos', 'by strata')}</option>
            <option value="M"${view.method === 'M' ? ' selected' : ''}>${T('método M (máximas clases)', 'method M (maximum classes)')}</option></select></label>
          <label class="inline-label">${T('Estratos', 'Strata')}<select class="sel" id="b7Strata">
            ${[['group', T('grupos del agrupamiento', 'clusters')], ['state', T('entidad o país', 'state or country')], ['crop', T('cultivo', 'crop')], ['taxon', T('especie', 'species')], ['none', T('sin estratificar', 'no strata')]]
              .map(([v2, t2]) => `<option value="${v2}"${view.strata === v2 ? ' selected' : ''}>${esc(t2)}</option>`).join('')}</select></label>
          <label class="inline-label">${T('Reparto', 'Allocation')}<select class="sel" id="b7Alloc">
            ${Object.keys(CHAR.ALLOCATIONS).map(a => `<option value="${a}"${view.alloc === a ? ' selected' : ''}>${esc(T(CHAR.ALLOCATIONS[a].es, CHAR.ALLOCATIONS[a].en))}</option>`).join('')}</select></label>
          <label class="inline-label">${T('Dentro del estrato', 'Within stratum')}<select class="sel" id="b7Pick">
            <option value="distance"${view.pick === 'distance' ? ' selected' : ''}>${T('las más distintas', 'the most distinct')}</option>
            <option value="random"${view.pick === 'random' ? ' selected' : ''}>${T('al azar', 'at random')}</option></select></label>
          <button class="btn btn-ghost btn-sm" id="b7Seed">${T('otra selección al azar ↻', 'another random draw ↻')}</button>
        </div>

        ${A.core.core.length < 10 ? `<div class="note-warn" style="margin-top:12px">${T(
          `<b>El núcleo es demasiado pequeño para juzgarlo con estas cifras.</b> Con ${A.core.core.length} accesiones, las pruebas t y F casi no tienen potencia y es normal que VD% se dispare y que CR% se quede corto: no es que el núcleo esté mal armado, es que no hay con qué medirlo. Sube el porcentaje a 20 o 25 %, o trabaja con una colección más grande, antes de tomar estas cifras en serio.`,
          `<b>The core is too small to be judged by these figures.</b> With ${A.core.core.length} accessions, the t and F tests have almost no power and it is normal for VD% to shoot up and CR% to fall short: it is not that the core is badly built, it is that there is nothing to measure it with. Raise the percentage to 20 or 25%, or work with a larger collection, before taking these numbers seriously.`)}</div>` : ''}

        <div class="sum-grid" style="margin-top:12px">
          <div class="pg-pane"><div class="pg-title">${T('¿Representa bien? Criterios de Hu et al. (2000)', 'Does it represent well? Hu et al. (2000) criteria')}</div>
            <table class="tbl"><tbody>
              <tr><td>MD% · ${T('medias que difieren', 'means that differ')}</td><td class="num"><b>${fmt(v.MD, 1)}</b></td><td><span class="tag ${semaf(v.MD < 20)}">${v.MD < 20 ? T('bien', 'good') : T('revisar', 'check')}</span></td></tr>
              <tr><td>VD% · ${T('varianzas que difieren', 'variances that differ')}</td><td class="num"><b>${fmt(v.VD, 1)}</b></td><td><span class="tag ${semaf(v.VD < 20)}">${v.VD < 20 ? T('bien', 'good') : T('revisar', 'check')}</span></td></tr>
              <tr><td>CR% · ${T('rango conservado', 'range retained')}</td><td class="num"><b>${fmt(v.CR, 1)}</b></td><td><span class="tag ${semaf(v.CR > 80)}">${v.CR > 80 ? T('bien', 'good') : T('revisar', 'check')}</span></td></tr>
              <tr><td>VR% · ${T('coeficiente de variación', 'coefficient of variation')}</td><td class="num"><b>${fmt(v.VR, 1)}</b></td><td><span class="tag ${semaf(v.VR >= 95)}">${v.VR >= 95 ? T('bien', 'good') : T('revisar', 'check')}</span></td></tr>
              <tr><td>${T('clases cualitativas capturadas', 'qualitative classes captured')}</td><td class="num"><b>${fmt(v.classCoverage, 1)} %</b></td><td><span class="tag ${semaf(v.classCoverage > 80)}">${v.classCoverage > 80 ? T('bien', 'good') : T('revisar', 'check')}</span></td></tr>
            </tbody></table>
            <p class="hint">${T(
              `MD% y VD% se calculan con pruebas t y F carácter por carácter (${v.nUsable} caracteres utilizables): un núcleo fiel no cambia las medias, conserva casi todo el rango y mantiene o aumenta la variación relativa.`,
              `MD% and VD% come from t and F tests trait by trait (${v.nUsable} usable traits): a faithful core does not shift the means, keeps nearly the whole range and maintains or increases relative variation.`)}
              ${v.VD > 20 && v.VR >= 95 && v.CR > 80 ? `<br><b>${T('Sobre el VD% alto de este núcleo:', 'About this core’s high VD%:')}</b> ${T(
                'al elegir las accesiones más distintas entre sí, el núcleo sale más variable que la colección, y la prueba F lo detecta como diferencia. Con el rango conservado y VR% cerca o por encima de 100, eso no es un defecto: es exactamente lo que se busca. VD% alto sólo debe preocupar cuando viene acompañado de VR% bajo.',
                'by picking the most distinct accessions, the core ends up more variable than the collection, and the F test flags that as a difference. With the range retained and VR% at or above 100, that is not a flaw: it is exactly the point. A high VD% is only worrying when it comes with a low VR%.')}` : ''}</p>
          </div>
          <div class="pg-pane"><div class="pg-title">${T('Reparto por estrato', 'Allocation per stratum')}</div>
            ${A.core.strata ? `<div class="table-wrap" style="max-height:300px;overflow:auto"><table class="tbl"><thead><tr>
              <th>${T('Estrato', 'Stratum')}</th><th class="num">${T('Tiene', 'Holds')}</th><th class="num">${T('Al núcleo', 'To core')}</th><th class="num">%</th>
            </tr></thead><tbody>
            ${A.core.strata.map(s => `<tr><td>${esc(s.key)}</td><td class="num">${s.size}</td><td class="num">${s.taken}</td><td class="num">${fmt(100 * s.taken / s.size, 0)}</td></tr>`).join('')}
            </tbody></table></div>`
            : `<p class="hint">${T(`Método M: se eligieron ${A.core.core.length} accesiones maximizando las clases capturadas. Quedaron fuera ${A.core.missingClasses.length} clases.`, `Method M: ${A.core.core.length} accessions chosen maximizing captured classes. ${A.core.missingClasses.length} classes were left out.`)}</p>`}
          </div>
        </div>

        <div class="table-wrap" style="max-height:360px;overflow:auto;margin-top:12px">
          <table class="tbl"><thead><tr>
            <th>${T('Accesión', 'Accession')}</th><th>${T('Nombre', 'Name')}</th><th>${T('Especie', 'Species')}</th>
            <th>${T('Grupo', 'Group')}</th><th>${T('Estrato', 'Stratum')}</th>
          </tr></thead><tbody>
          ${A.core.core.map(i => {
            const p = A.pairs[i];
            return `<tr>
              <td class="mono">${esc(p.acc.ACCENUMB || '')}</td>
              <td>${esc(String(p.acc.ACCENAME || '').slice(0, 30))}</td>
              <td><i class="sci">${esc([p.acc.GENUS, p.acc.SPECIES].filter(Boolean).join(' '))}</i></td>
              <td><span class="tag" style="color:${cv(CATC[A.groups[i] % CATC.length])};border-color:${cv(CATC[A.groups[i] % CATC.length])}">G${A.groups[i] + 1}</span></td>
              <td>${esc(A.strata[i])}</td>
            </tr>`;
          }).join('')}
          </tbody></table>
        </div>

        <div class="imp-row" style="margin-top:12px">
          <button class="btn btn-primary btn-sm" id="b7Export">${T('Exportar el núcleo en CSV', 'Export the core as CSV')}</button>
          <button class="btn btn-secondary btn-sm" id="b7ExportAll">${T('Caracterización + grupo + núcleo', 'Characterization + group + core')}</button>
          <button class="btn btn-ghost btn-sm" id="b7ExportD">${T('Matriz de distancias', 'Distance matrix')}</button>
          <button class="btn btn-ghost btn-sm" id="b7SVG">${T('PCoA en SVG', 'PCoA as SVG')}</button>
        </div>
      </div>`;

    /* eventos */
    els('[data-use]', el('b7Body')).forEach(c => c.addEventListener('change', () => {
      const d = defs.find(x => x.k === c.dataset.use);
      if (d) d.use = c.checked;
      runUI();
    }));
    els('[data-type]', el('b7Body')).forEach(s => s.addEventListener('change', () => {
      const d = defs.find(x => x.k === s.dataset.type);
      if (d) d.type = s.value;
      runUI();
    }));
    els('[data-w]', el('b7Body')).forEach(inp => inp.addEventListener('change', () => {
      const d = defs.find(x => x.k === inp.dataset.w);
      if (d) d.weight = Math.max(0, Number(inp.value) || 0);
      runUI();
    }));
    const bind = (id, key, num) => {
      const n = el(id);
      if (n) n.addEventListener('change', () => { view[key] = num ? Number(n.value) : n.value; runUI(); });
    };
    bind('b7Tree', 'tree'); bind('b7K', 'k', true); bind('b7Color', 'colorBy');
    bind('b7Pct', 'pct', true); bind('b7Method', 'method'); bind('b7Strata', 'strata');
    bind('b7Alloc', 'alloc'); bind('b7Pick', 'pick');
    el('b7Seed').addEventListener('click', () => { view.seed = Math.floor(Math.random() * 1e9); runUI(); });
    el('b7Export').addEventListener('click', () => exportCore(false));
    el('b7ExportAll').addEventListener('click', () => exportCore(true));
    el('b7ExportD').addEventListener('click', exportD);
    el('b7SVG').addEventListener('click', () => download(B4.forFile(() => pcoaPlot(700, 500)).split('</svg>')[0] + '</svg>', 'pcoa-gower.svg', 'image/svg+xml'));
  }

  function exportCore(all) {
    const inCore = new Set(A.core.core);
    const rows = A.pairs.map((p, i) => {
      if (!all && !inCore.has(i)) return null;
      const base = {
        ACCENUMB: p.acc.ACCENUMB, ACCENAME: p.acc.ACCENAME,
        TAXON: [p.acc.GENUS, p.acc.SPECIES].filter(Boolean).join(' '), CROPNAME: p.acc.CROPNAME,
        grupo: 'G' + (A.groups[i] + 1), estrato: A.strata[i], nucleo: inCore.has(i) ? 'sí' : 'no',
        pcoa1: Math.round((A.ord.coords[i] ? A.ord.coords[i][0] : 0) * 1e4) / 1e4,
        pcoa2: Math.round((A.ord.coords[i] ? A.ord.coords[i][1] : 0) * 1e4) / 1e4,
      };
      if (all) defs.filter(d => d.use).forEach(d => { base[d.k] = p.t[d.k]; });
      return base;
    }).filter(Boolean);
    download(IO.toCSV(rows, Object.keys(rows[0] || { ACCENUMB: '' })), all ? 'caracterizacion-completa.csv' : 'coleccion-nucleo.csv', 'text/csv;charset=utf-8');
  }
  function exportD() {
    const head = ['accesion'].concat(A.labels);
    const rows = A.D.map((r, i) => {
      const o = { accesion: A.labels[i] };
      r.forEach((d, j) => { o[A.labels[j]] = isFinite(d) ? Math.round(d * 1e4) / 1e4 : ''; });
      return o;
    });
    download(IO.toCSV(rows, head), 'distancias-gower.csv', 'text/csv;charset=utf-8');
  }

  /* ============ traer los datos de caracterización ============ */
  function loadExample() {
    state.traits = EXAMPLES.buildTraits(state.acc);
    Prefs.set('traits', state.traits);
    defs = [];
    run();
  }
  /* ============ traer una caracterización ============

     Una tabla de caracterización sólo sirve si se une con la colección, y se
     une por el número de accesión. Por eso, antes de aceptarla, la app enseña
     lo único que de verdad importa: cuántas de sus filas encuentran su
     accesión y cuáles no. Si la columna elegida no era la buena, se cambia
     aquí y la cuenta se rehace al instante. */
  let pendTraits = null;      /* { parsed, name, key } */

  function importTraits(text, name, opts) {
    const o = opts || {};
    const parsed = IO.parseDelimited(text, o.delim || null, o.header === false ? { header: false } : undefined);
    if (!parsed.rows.length) { if (window.gpWorkFail) gpWorkFail(); alert(T('No se pudieron leer filas.', 'No rows could be read.')); return; }
    const key = parsed.headers.find(h => /accenumb|accesion|accession/i.test(MCPD.norm(h))) || parsed.headers[0];
    pendTraits = { parsed, name: name || '', key };
    if (!el('b7MapCard')) return;        /* fuera de la app (suite de pruebas) no hay nada que dibujar */
    renderTraitMap();
    el('b7MapCard').style.display = '';
    el('b7MapCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* cuántas filas encuentran su accesión con la columna elegida */
  function matchWith(key) {
    const enColeccion = new Set(state.acc.map(r => String(r.ACCENUMB || '').trim()).filter(Boolean));
    const vistos = new Set();
    let unidas = 0, repetidas = 0;
    const huerfanas = [];
    pendTraits.parsed.rows.forEach(r => {
      const v = String(r[key] ?? '').trim();
      if (!v) { huerfanas.push(''); return; }
      if (enColeccion.has(v)) {
        if (vistos.has(v)) repetidas++; else { unidas++; vistos.add(v); }
      } else huerfanas.push(v);
    });
    return { unidas, repetidas, huerfanas, total: pendTraits.parsed.rows.length, enColeccion: enColeccion.size };
  }

  const TIPO_NOMBRE = {
    num: ['cuantitativo', 'quantitative'], ord: ['ordinal', 'ordinal'],
    cat: ['cualitativo', 'qualitative'], empty: ['vacía', 'empty'],
  };

  function renderTraitMap() {
    if (!pendTraits || !el('b7MapCard')) return;
    const { parsed, key } = pendTraits;
    el('b7MapKey').innerHTML = parsed.headers.map(h =>
      `<option value="${esc(h)}"${h === key ? ' selected' : ''}>${esc(h)}</option>`).join('');

    const m = matchWith(key);
    const nf = parsed.rows.length, nc = parsed.headers.length;
    el('b7MapInfo').innerHTML = T(
      `Se ${nf === 1 ? 'leyó' : 'leyeron'} <b>${nf}</b> ${nf === 1 ? 'fila' : 'filas'} y <b>${nc}</b> ${nc === 1 ? 'columna' : 'columnas'}${pendTraits.name ? ` de <b>${esc(pendTraits.name)}</b>` : ''}. Tu colección tiene <b>${m.enColeccion}</b> ${m.enColeccion === 1 ? 'accesión' : 'accesiones'}.`,
      `Read <b>${nf}</b> ${nf === 1 ? 'row' : 'rows'} and <b>${nc}</b> ${nc === 1 ? 'column' : 'columns'}${pendTraits.name ? ` from <b>${esc(pendTraits.name)}</b>` : ''}. Your collection has <b>${m.enColeccion}</b> ${m.enColeccion === 1 ? 'accession' : 'accessions'}.`);

    const nivel = m.unidas === 0 ? 'error' : (m.huerfanas.length ? 'warn' : 'info');
    const muestra = m.huerfanas.filter(Boolean).slice(0, 6);
    el('b7MapMatch').innerHTML = `
      <div class="paste-stats">
        <div class="pstat"><b>${fmtInt(m.unidas)}</b><span>${T('se unen con una accesión', 'match an accession')}</span></div>
        <div class="pstat"><b>${fmtInt(m.huerfanas.length)}</b><span>${T('no encuentran accesión', 'find no accession')}</span></div>
        <div class="pstat"><b>${fmtInt(m.enColeccion - m.unidas)}</b><span>${T('accesiones se quedan sin datos', 'accessions left without data')}</span></div>
      </div>
      ${m.unidas === 0 ? `<div class="paste-warn error">${T(
        'Ninguna fila encuentra su accesión. Casi seguro la columna del número no es ésa: cámbiala arriba.',
        'No row finds its accession. Almost certainly the number column is not that one: change it above.')}</div>`
      : m.huerfanas.length ? `<div class="paste-warn ${nivel}">${T(
        `${m.huerfanas.length} ${m.huerfanas.length === 1 ? 'fila no encuentra' : 'filas no encuentran'} su accesión${muestra.length ? `: ${muestra.map(x => `<code>${esc(x)}</code>`).join(', ')}${m.huerfanas.length > muestra.length ? '…' : ''}` : ''}. Se importan igual, pero no entran en el análisis hasta que su número coincida.`,
        `${m.huerfanas.length} ${m.huerfanas.length === 1 ? 'row finds' : 'rows find'} no accession${muestra.length ? `: ${muestra.map(x => `<code>${esc(x)}</code>`).join(', ')}${m.huerfanas.length > muestra.length ? '…' : ''}` : ''}. They are imported anyway, but they stay out of the analysis until their number matches.`)}</div>` : ''}
      ${m.repetidas ? `<div class="paste-warn warn">${T(
        `${m.repetidas} filas repiten un número de accesión ya usado; se queda la última.`,
        `${m.repetidas} rows repeat an accession number already used; the last one wins.`)}</div>` : ''}`;

    el('b7MapBody').innerHTML = parsed.headers.filter(h => h !== key).map(h => {
      const vals = parsed.rows.map(r => String(r[h] ?? '').trim());
      const llenos = vals.filter(v => v !== '');
      const t = CHAR.detectType(vals);
      const ejemplo = [...new Set(llenos)].slice(0, 4).join(' · ');
      return `<tr>
        <td><b>${esc(h)}</b></td>
        <td><span class="tag ${t === 'empty' ? 'muted' : 'ok'}">${esc(T(TIPO_NOMBRE[t][0], TIPO_NOMBRE[t][1]))}</span></td>
        <td>${llenos.length ? `${fmtInt(llenos.length)} / ${fmtInt(vals.length)}` : `<span class="muted">—</span>`}</td>
        <td class="hint">${esc(ejemplo.slice(0, 60)) || '—'}</td>
      </tr>`;
    }).join('');
  }

  function applyTraits() {
    if (!pendTraits) return;
    const { parsed, key } = pendTraits;
    state.traits = parsed.rows.map(r => Object.assign({}, r, { ACCENUMB: String(r[key] ?? '').trim() }));
    Prefs.set('traits', state.traits);
    pendTraits = null;
    if (el('b7MapCard')) el('b7MapCard').style.display = 'none';
    defs = [];
    run();
  }
  function exportTemplate() {
    const cols = ['ACCENUMB', 'dias_floracion', 'altura_planta_cm', 'largo_fruto_cm', 'color_principal', 'forma', 'habito'];
    const rows = state.acc.slice(0, 200).map(r => {
      const o = {}; cols.forEach(c => o[c] = '');
      o.ACCENUMB = r.ACCENUMB;
      return o;
    });
    download(IO.toCSV(rows.length ? rows : [Object.fromEntries(cols.map(c => [c, '']))], cols), 'plantilla-caracterizacion.csv', 'text/csv;charset=utf-8');
  }

  function init() {
    if (!el('panel-7')) return;
    const saved = Prefs.get('traits', null);
    if (Array.isArray(saved) && saved.length) state.traits = saved;
    el('b7File').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      await gpAfterPaint(async () => importTraits(await IO.readFile(f), f.name), gpWork('Leyendo el archivo', 'Reading the file'));
      e.target.value = '';
    });
    el('b7Paste').addEventListener('click', () => PASTE.open({
      titulo: ['Pega tu caracterización', 'Paste your characterization'],
      ayuda: ['Una fila por accesión y una columna por descriptor. La primera columna suele ser el número de accesión, que es lo que une la tabla con tu colección.',
        'One row per accession and one column per descriptor. The first column is usually the accession number, which is what joins the table to your collection.'],
      onLeer: (texto, o) => importTraits(texto, T('texto pegado', 'pasted text'), o),
    }));
    el('b7MapKey').addEventListener('change', () => {
      if (!pendTraits) return;
      pendTraits.key = el('b7MapKey').value;
      renderTraitMap();
    });
    el('b7MapApply').addEventListener('click', () => gpAfterPaint(applyTraits, gpWork('Calculando la caracterización y el núcleo', 'Computing characterization and core')));
    el('b7MapCancel').addEventListener('click', () => {
      pendTraits = null;
      el('b7MapCard').style.display = 'none';
    });
    el('b7Example').addEventListener('click', () => gpAfterPaint(loadExample, gpWork('Calculando la caracterización y el núcleo', 'Computing characterization and core')));
    el('b7Template').addEventListener('click', exportTemplate);
    el('b7Clear').addEventListener('click', () => {
      state.traits = []; Prefs.set('traits', []); defs = []; A = null; run();
    });
    run();
  }

  /* desde la interfaz, Gower, árbol, PCoA, núcleo y su validación van en la
     ventana de trabajo; run() sigue síncrona para las pruebas */
  function runUI() {
    return gpAfterPaint(() => { run(); }, gpWork('Calculando la caracterización y el núcleo', 'Computing characterization and core'));
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('stepchange', e => { if (e.detail.step === 7) runUI(); });
  document.addEventListener('langchange', () => { if (el('panel-7')) run(); });
  document.addEventListener('themechange', () => { if (el('panel-7') && A) render(A.pairs); });

  window.B7 = { run, view, defs: () => defs, analysis: () => A, pcoaPlot, dendroPlot, loadExample, importTraits, applyTraits, matchWith, pending: () => pendTraits };
})();
