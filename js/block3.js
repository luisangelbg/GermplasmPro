/* GermplasmPro — Bloque 3: calidad y duplicados.

   Cuatro pantallas, en el orden en que conviene trabajar:
     1. Correcciones propuestas: lo que la app puede arreglar sola si tú lo
        autorizas (signos de longitud, países en dos letras, mayúsculas
        gritadas, géneros mal escritos, rutas que se deducen).
     2. Geografía: los puntos que no cuadran con el país declarado, con el
        diagnóstico de qué pasó.
     3. Consistencia: el mismo género escrito de dos formas, el mismo sitio con
        tres ortografías, coordenadas repetidas entre sitios distintos.
     4. Duplicados: grupos de accesiones que parecen el mismo material, con el
        detalle de por qué y la opción de fusionarlas.

   Nada se toca sin que alguien lo apruebe. */

(function () {

  const ui = {
    threshold: 50,
    open: {},            /* grupos de duplicados desplegados */
    dismissed: [],       /* pares que la curadora descartó */
    lastAudit: null,
  };

  function saveState() {
    Prefs.set('dismissed', ui.dismissed);
    Prefs.set('dupThreshold', ui.threshold);
  }
  function loadState() {
    ui.dismissed = Prefs.get('dismissed', []) || [];
    ui.threshold = Prefs.get('dupThreshold', 50);
  }

  /* ============ recálculo ============ */
  function run() {
    if (!el('panel-3')) return null;
    ui.lastAudit = QC.audit(state.acc, { threshold: ui.threshold, dismissed: ui.dismissed });
    render();
    return ui.lastAudit;
  }

  function render() {
    const a = ui.lastAudit;
    if (!a) return;
    if (!state.acc.length) {
      el('b3Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}
        <button class="btn btn-secondary btn-sm" data-go3="2">${T('Ir al pasaporte', 'Go to the passport')}</button></div>`;
      els('[data-go3]', el('b3Body')).forEach(b => b.addEventListener('click', () => goStep(2)));
      el('b3Stats').innerHTML = '';
      return;
    }
    renderStats(a);
    el('b3Body').innerHTML = '';
    renderFixes(a);
    renderGeo(a);
    renderConsistency(a);
    renderDuplicates(a);
  }

  function renderStats(a) {
    const geoErr = a.geo.filter(p => p.level === 'error').length;
    const stats = [
      { k: T('Accesiones revisadas', 'Accessions checked'), v: fmtInt(state.acc.length), d: T(`${a.dup.comparisons} pares comparados`, `${a.dup.comparisons} pairs compared`), c: 'var(--s1)' },
      { k: T('Problemas de ubicación', 'Location problems'), v: fmtInt(a.geo.filter(p => p.level !== 'info').length), d: T(`${geoErr} con diagnóstico claro`, `${geoErr} with a clear diagnosis`), c: geoErr ? 'var(--danger)' : 'var(--s3)' },
      { k: T('Correcciones propuestas', 'Proposed fixes'), v: fmtInt(a.fixes.length), d: T('ninguna se aplica sin tu visto bueno', 'none is applied without your approval'), c: 'var(--s2)' },
      { k: T('Grupos de duplicados', 'Duplicate groups'), v: fmtInt(a.dup.groups.length), d: T(`${a.dup.pairs.length} pares por encima del umbral`, `${a.dup.pairs.length} pairs above the threshold`), c: a.dup.groups.length ? 'var(--stDup)' : 'var(--s3)' },
      { k: T('Avisos de consistencia', 'Consistency warnings'), v: fmtInt(a.consistency.length), d: T('nombres y catálogos', 'names and catalogues'), c: 'var(--s6)' },
    ];
    el('b3Stats').innerHTML = stats.map(x =>
      `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');
  }

  function section(title, sub, inner, id) {
    const d = mk('div', { class: 'qc-section', id: id || '' });
    d.innerHTML = `<h3 class="section-title" style="margin-top:28px">${title}</h3>
      ${sub ? `<p class="section-sub">${sub}</p>` : ''}
      <div class="card">${inner}</div>`;
    el('b3Body').appendChild(d);
    return d;
  }

  /* ============ 1. correcciones propuestas ============ */
  function renderFixes(a) {
    const groups = new Map();
    a.fixes.forEach(f => {
      const key = f.code + '|' + f.field;
      if (!groups.has(key)) groups.set(key, { code: f.code, field: f.field, msg: f.msg, items: [] });
      groups.get(key).items.push(f);
    });
    const list = [...groups.values()].sort((x, y) => y.items.length - x.items.length);

    const inner = list.length ? `
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>${T('Descriptor', 'Descriptor')}</th><th>${T('Qué se propone', 'What is proposed')}</th>
        <th>${T('Ejemplo', 'Example')}</th><th class="num">${T('Casos', 'Cases')}</th><th></th>
      </tr></thead><tbody>
      ${list.map((g, gi) => {
        const ex = g.items[0];
        return `<tr>
          <td><span class="tag ok">${g.field}</span></td>
          <td>${esc(T(g.msg.es, g.msg.en))}</td>
          <td class="qc-diff"><span class="qc-from">${esc(String(ex.from || '—').slice(0, 30))}</span> → <span class="qc-to">${esc(String(ex.to).slice(0, 30))}</span></td>
          <td class="num">${g.items.length}</td>
          <td><button class="btn btn-secondary btn-sm" data-fixgroup="${gi}">${T('Aplicar', 'Apply')}</button></td>
        </tr>`;
      }).join('')}
      </tbody></table></div>
      <div class="imp-row" style="margin-top:12px">
        <button class="btn btn-primary" id="b3FixAll">${T('Aplicar todas las correcciones', 'Apply every fix')} (${a.fixes.length})</button>
        <span class="hint">${T('Puedes deshacerlas editando la accesión en el Bloque 2.', 'You can undo them by editing the accession in Block 2.')}</span>
      </div>`
      : `<div class="note-ok">${T('No hay nada que corregir automáticamente.', 'There is nothing to fix automatically.')}</div>`;

    const sec = section(
      T('1 · Correcciones que la app puede hacer por ti', '1 · Fixes the app can make for you'),
      T('Cada una se propone con el valor original y el propuesto a la vista. Se aplican sólo cuando tú lo dices, por tipo o todas juntas.',
        'Each one is proposed with the original and the new value in sight. They are applied only when you say so, by type or all at once.'),
      inner, 'b3Fixes');

    els('[data-fixgroup]', sec).forEach(b => b.addEventListener('click', () => {
      const g = list[Number(b.dataset.fixgroup)];
      QC.applyFixes(state.acc, g.items);
      afterChange(T(`${g.items.length} correcciones aplicadas en ${g.field}.`, `${g.items.length} fixes applied to ${g.field}.`));
    }));
    const all = el('b3FixAll');
    if (all) all.addEventListener('click', () => {
      const n = QC.applyFixes(state.acc, a.fixes);
      afterChange(T(`${n} correcciones aplicadas.`, `${n} fixes applied.`));
    });
  }

  /* ============ 2. geografía ============ */
  function renderGeo(a) {
    const rows = a.geo.filter(p => p.level !== 'info');
    const info = a.geo.filter(p => p.level === 'info');
    const inner = rows.length ? `
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>${T('Accesión', 'Accession')}</th><th>${T('País', 'Country')}</th><th>${T('Coordenadas', 'Coordinates')}</th>
        <th>${T('Diagnóstico', 'Diagnosis')}</th><th></th>
      </tr></thead><tbody>
      ${rows.map((p, pi) => {
        const r = state.acc[p.i];
        return `<tr>
          <td><b>${esc(r.ACCENUMB || '—')}</b><div class="hint">${esc(String(r.ACCENAME || '').slice(0, 28))}</div></td>
          <td>${esc(r.ORIGCTY || '—')}</td>
          <td class="mono">${esc(r.DECLATITUDE)}, ${esc(r.DECLONGITUDE)}</td>
          <td><span class="tag ${p.level === 'error' ? 'bad' : 'warn'}">${p.code}</span> ${esc(T(p.msg.es, p.msg.en))}</td>
          <td class="qc-act">
            ${p.fix ? `<button class="btn btn-secondary btn-sm" data-geofix="${pi}">${T('Corregir', 'Fix')}</button>` : ''}
            <button class="btn btn-ghost btn-sm" data-geoficha="${p.i}">${T('Ficha', 'Record')}</button>
          </td>
        </tr>`;
      }).join('')}
      </tbody></table></div>`
      : `<div class="note-ok">${T('Todas las coordenadas caen dentro del país que declara cada accesión.', 'Every coordinate falls inside the country each accession declares.')}</div>`;

    const nota = info.length
      ? `<p class="hint" style="margin-top:10px">${T(`En ${info.length} accesiones no se pudo comparar la coordenada con el país porque la app no trae el contorno de ese país. Las cajas incluidas cubren ${Object.keys(QC.BBOX).length} países.`, `In ${info.length} accessions the coordinate could not be checked against the country because the app does not bundle that country's outline. The bundled boxes cover ${Object.keys(QC.BBOX).length} countries.`)}</p>`
      : '';

    const sec = section(
      T('2 · ¿El punto cae donde dice?', '2 · Does the point fall where it says?'),
      T('La app compara cada coordenada con un rectángulo que envuelve al país declarado. Cuando el punto se sale, prueba las tres equivocaciones clásicas —longitud sin signo, latitud con el signo cambiado, latitud y longitud intercambiadas— y propone la que hace que el punto caiga dentro. Son rectángulos, no fronteras: sirven para cazar errores gruesos, no para verificar un municipio.',
        'The app compares each coordinate with a rectangle enclosing the declared country. When the point falls outside, it tries the three classic mistakes —longitude without its sign, latitude sign flipped, latitude and longitude swapped— and proposes the one that brings the point inside. These are rectangles, not borders: they catch gross errors, not municipality-level ones.'),
      inner + nota, 'b3Geo');

    els('[data-geofix]', sec).forEach(b => b.addEventListener('click', () => {
      const p = rows[Number(b.dataset.geofix)];
      Object.keys(p.fix).forEach(k => { state.acc[p.i][k] = p.fix[k]; });
      afterChange(T('Coordenada corregida.', 'Coordinate fixed.'));
    }));
    els('[data-geoficha]', sec).forEach(b => b.addEventListener('click', () => {
      goStep(2); setTimeout(() => B2.openFicha(Number(b.dataset.geoficha)), 250);
    }));
  }

  /* ============ 3. consistencia ============ */
  function renderConsistency(a) {
    const inner = a.consistency.length ? `
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>${T('Tipo', 'Type')}</th><th>${T('Hallazgo', 'Finding')}</th><th class="num">${T('Accesiones', 'Accessions')}</th><th></th>
      </tr></thead><tbody>
      ${a.consistency.map((c, ci) => `<tr>
        <td><span class="tag ${c.level === 'warn' ? 'warn' : 'new'}">${c.code}</span></td>
        <td>${esc(T(c.msg.es, c.msg.en))}</td>
        <td class="num">${c.items.length}</td>
        <td><button class="btn btn-ghost btn-sm" data-consshow="${ci}">${T('ver', 'show')}</button></td>
      </tr>`).join('')}
      </tbody></table></div>
      <div id="b3ConsDetail"></div>`
      : `<div class="note-ok">${T('Los nombres científicos, los de cultivo y los sitios están escritos de manera uniforme.', 'Scientific names, crop names and sites are spelled consistently.')}</div>`;

    const sec = section(
      T('3 · Nombres y catálogos', '3 · Names and catalogues'),
      T('Lo que no es un error de formato pero desordena la colección: el mismo género escrito de dos maneras, un epíteto con mayúscula, el mismo taxón con dos nombres de cultivo, el mismo sitio con tres ortografías o coordenadas repetidas entre sitios distintos.',
        'What is not a format error but still messes up a collection: the same genus spelled two ways, a capitalized epithet, one taxon under two crop names, one site with three spellings, or identical coordinates across different sites.'),
      inner, 'b3Cons');

    els('[data-consshow]', sec).forEach(b => b.addEventListener('click', () => {
      const c = a.consistency[Number(b.dataset.consshow)];
      el('b3ConsDetail').innerHTML = `<div class="qc-detail"><b>${esc(T(c.msg.es, c.msg.en))}</b>
        <div class="chips" style="margin-top:8px">${c.items.slice(0, 40).map(i =>
          `<button class="chip" data-consficha="${i}">${esc(state.acc[i].ACCENUMB || '#' + (i + 1))}</button>`).join('')}</div></div>`;
      els('[data-consficha]', el('b3ConsDetail')).forEach(x => x.addEventListener('click', () => {
        goStep(2); setTimeout(() => B2.openFicha(Number(x.dataset.consficha)), 250);
      }));
    }));
  }

  /* ============ 4. duplicados ============ */
  const CMP_FIELDS = ['ACCENUMB', 'ACCENAME', 'GENUS', 'SPECIES', 'COLLNUMB', 'COLLDATE', 'COLLSITE', 'DECLATITUDE', 'DECLONGITUDE', 'ELEVATION', 'INSTCODE', 'GP_CONS', 'GP_STOCK', 'OTHERNUMB', 'DONORNUMB'];

  function renderDuplicates(a) {
    const d = a.dup;
    const same = d.sameNumber.length ? `<div class="note-warn"><b>${T('Números de accesión repetidos', 'Repeated accession numbers')}:</b>
      ${d.sameNumber.map(([i, j]) => `${esc(state.acc[i].ACCENUMB)} (${T('filas', 'rows')} ${i + 1} ${T('y', 'and')} ${j + 1})`).join(' · ')}.
      ${T('Un número de accesión no se repite nunca, ni siquiera cuando el material sí es el mismo.', 'An accession number is never repeated, not even when the material really is the same.')}</div>` : '';

    const ctrl = `<div class="imp-row">
      <label class="inline-label" style="flex:1;max-width:360px">
        <span>${T('Umbral para proponer un duplicado', 'Threshold to propose a duplicate')}: <b id="b3ThVal">${ui.threshold}</b> ${T('puntos', 'points')}</span>
        <input type="range" id="b3Th" min="25" max="95" step="5" value="${ui.threshold}">
      </label>
      <button class="btn btn-ghost btn-sm" id="b3Reset">${T('Volver a proponer los descartados', 'Bring dismissed pairs back')} (${ui.dismissed.length})</button>
      <span class="hint">${T('Bajar el umbral propone más pares y acierta menos; subirlo, al revés.', 'Lowering the threshold proposes more pairs and gets more of them wrong; raising it does the opposite.')}</span>
    </div>`;

    const groups = d.groups.map((g, gi) => {
      const open = !!ui.open[gi];
      const members = g.members;
      const head = `<div class="dup-head">
        <span class="tag dup">${fmt(g.score, 0)} ${T('pts', 'pts')}</span>
        <b>${members.map(i => esc(state.acc[i].ACCENUMB || '#' + (i + 1))).join('  ·  ')}</b>
        <span class="hint">${esc(String(state.acc[members[0]].ACCENAME || '').slice(0, 40))}</span>
        <button class="btn btn-ghost btn-sm" data-dupopen="${gi}">${open ? T('ocultar', 'hide') : T('comparar', 'compare')}</button>
      </div>`;
      if (!open) return `<div class="dup-card">${head}</div>`;

      const cmp = `<div class="table-wrap"><table class="tbl dup-tbl"><thead><tr><th>${T('Descriptor', 'Descriptor')}</th>
        ${members.map((i, k) => `<th>${k === 0 ? `<span class="tag ok">${T('maestra', 'master')}</span> ` : ''}${esc(state.acc[i].ACCENUMB || '#' + (i + 1))}</th>`).join('')}</tr></thead><tbody>
        ${CMP_FIELDS.map(f => {
          const vals = members.map(i => String(state.acc[i][f] ?? '').trim());
          const differ = new Set(vals.filter(Boolean)).size > 1;
          if (!vals.some(Boolean)) return '';
          return `<tr class="${differ ? 'dup-differ' : ''}"><td>${esc(T(MCPD.FIELD_MAP[f].es, MCPD.FIELD_MAP[f].en))}</td>
            ${vals.map(v => `<td>${esc(v || '—')}</td>`).join('')}</tr>`;
        }).join('')}
      </tbody></table></div>`;

      const why = g.pairs.map(p => `<div class="dup-why">
        <b>${esc(state.acc[p.i].ACCENUMB)} ↔ ${esc(state.acc[p.j].ACCENUMB)}</b> · ${fmt(p.score, 0)} ${T('pts', 'pts')}
        ${p.dist != null ? ` · ${fmt(p.dist, p.dist < 10 ? 2 : 0)} km` : ''}
        <ul>${p.reasons.map(r => `<li>${esc(T(r.es, r.en))} <span class="muted">(${r.pts > 0 ? '+' : ''}${r.pts})</span></li>`).join('')}</ul>
        <div class="imp-row">
          <button class="btn btn-secondary btn-sm" data-merge="${p.i}|${p.j}">${T('Fusionar en la primera', 'Merge into the first')}</button>
          <button class="btn btn-ghost btn-sm" data-mark="${p.i}|${p.j}">${T('Anotar como duplicado sin fusionar', 'Note as duplicate without merging')}</button>
          <button class="btn btn-ghost btn-sm" data-dismiss="${p.i}|${p.j}">${T('No son duplicados', 'Not duplicates')}</button>
        </div>
      </div>`).join('');

      return `<div class="dup-card open">${head}${cmp}${why}</div>`;
    }).join('');

    const inner = same + ctrl + (d.groups.length
      ? `<div class="dup-list">${groups}</div>`
      : `<div class="note-ok" style="margin-top:12px">${T('Ningún par supera el umbral: no hay duplicados que proponer.', 'No pair passes the threshold: there are no duplicates to propose.')}</div>`);

    const sec = section(
      T('4 · ¿Es la misma colecta dos veces?', '4 · Is it the same collection twice?'),
      T('Se comparan sólo los pares que comparten algo —número de colecta, número de donante, nombre parecido, taxón y fecha, o la misma celda de medio grado—, y cada coincidencia suma puntos: el mismo número de colecta pesa más que estar cerca, y dos géneros distintos restan. Los grupos reúnen a las accesiones encadenadas: si A es duplicada de B y B de C, las tres son el mismo material.',
        'Only pairs that share something are compared —collecting number, donor number, similar name, taxon and date, or the same half-degree cell—, and each match adds points: the same collecting number weighs more than mere proximity, and two different genera subtract. Groups gather chained accessions: if A duplicates B and B duplicates C, all three are the same material.'),
      inner, 'b3Dup');

    const th = el('b3Th');
    if (th) {
      th.addEventListener('input', () => { el('b3ThVal').textContent = th.value; });
      th.addEventListener('change', () => { ui.threshold = Number(th.value); saveState(); runUI(); });
    }
    const rs = el('b3Reset');
    if (rs) rs.addEventListener('click', () => { ui.dismissed = []; saveState(); run(); });

    els('[data-dupopen]', sec).forEach(b => b.addEventListener('click', () => {
      const gi = Number(b.dataset.dupopen);
      ui.open[gi] = !ui.open[gi];
      render();
    }));
    els('[data-merge]', sec).forEach(b => b.addEventListener('click', () => {
      const [i, j] = b.dataset.merge.split('|').map(Number);
      const merged = QC.mergeRows(state.acc[i], state.acc[j]);
      if (!confirm(T(`Se fusionará ${state.acc[j].ACCENUMB} dentro de ${state.acc[i].ACCENUMB} y la segunda desaparecerá del catálogo. ¿Seguir?`,
        `${state.acc[j].ACCENUMB} will be merged into ${state.acc[i].ACCENUMB} and the second will disappear from the catalogue. Continue?`))) return;
      state.acc[i] = merged;
      state.acc.splice(j, 1);
      ui.dismissed = ui.dismissed.filter(p => !p.includes(j)).map(p => p.map(x => (x > j ? x - 1 : x)));
      ui.open = {};
      afterChange(T('Accesiones fusionadas.', 'Accessions merged.'));
    }));
    els('[data-mark]', sec).forEach(b => b.addEventListener('click', () => {
      const [i, j] = b.dataset.mark.split('|').map(Number);
      const A = state.acc[i], B = state.acc[j];
      [[A, B], [B, A]].forEach(([x, y]) => {
        const prev = String(x.OTHERNUMB || '').split(';').map(s => s.trim()).filter(Boolean);
        if (y.ACCENUMB && !prev.includes(y.ACCENUMB)) prev.push(y.ACCENUMB);
        x.OTHERNUMB = prev.join('; ');
        const note = T(`Duplicado declarado de ${y.ACCENUMB}.`, `Declared duplicate of ${y.ACCENUMB}.`);
        if (!String(x.REMARKS || '').includes(note)) x.REMARKS = [String(x.REMARKS || '').trim(), note].filter(Boolean).join(' ');
      });
      ui.dismissed.push([i, j]);
      saveState();
      afterChange(T('Anotado en las dos accesiones.', 'Noted in both accessions.'));
    }));
    els('[data-dismiss]', sec).forEach(b => b.addEventListener('click', () => {
      const [i, j] = b.dataset.dismiss.split('|').map(Number);
      ui.dismissed.push([i, j]);
      saveState();
      run();
    }));
  }

  /* ============ informe ============ */
  function report() {
    const a = ui.lastAudit || QC.audit(state.acc, { threshold: ui.threshold, dismissed: ui.dismissed });
    const rows = [];
    a.geo.forEach(p => rows.push({ tipo: 'geografia', nivel: p.level, accesion: state.acc[p.i].ACCENUMB, campo: p.field, detalle: p.msg.es }));
    a.consistency.forEach(c => rows.push({ tipo: 'consistencia', nivel: c.level, accesion: c.items.map(i => state.acc[i].ACCENUMB).join(' '), campo: c.code, detalle: c.msg.es }));
    a.fixes.forEach(f => rows.push({ tipo: 'correccion', nivel: 'fix', accesion: state.acc[f.i].ACCENUMB, campo: f.field, detalle: `${f.from} → ${f.to} · ${f.msg.es}` }));
    a.dup.pairs.forEach(p => rows.push({
      tipo: 'duplicado', nivel: String(Math.round(p.score)), accesion: `${state.acc[p.i].ACCENUMB} + ${state.acc[p.j].ACCENUMB}`,
      campo: p.dist != null ? `${Math.round(p.dist * 10) / 10} km` : '', detalle: p.reasons.map(r => r.es).join('; '),
    }));
    (state.issues || []).forEach(p => rows.push({ tipo: 'pasaporte', nivel: p.level, accesion: state.acc[p.i].ACCENUMB, campo: p.field, detalle: p.msg.es }));
    download(IO.toCSV(rows, ['tipo', 'nivel', 'accesion', 'campo', 'detalle']), 'informe-calidad.csv', 'text/csv;charset=utf-8');
  }

  /* ============ utilidades ============ */
  function afterChange(msg) {
    if (window.B2) B2.refresh();
    Prefs.set('acc', state.acc);
    run();
    const n = el('b3Msg');
    if (n && msg) {
      n.textContent = msg;
      n.style.display = '';
      setTimeout(() => { n.style.display = 'none'; }, 3500);
    }
  }

  function init() {
    if (!el('panel-3')) return;
    loadState();
    el('b3Run').addEventListener('click', () => runUI());
    el('b3Report').addEventListener('click', e => gpBusy(e.currentTarget, report));
    run();
  }

  document.addEventListener('DOMContentLoaded', init);
  /* desde la interfaz, la auditoría (con la búsqueda de duplicados por pares)
     va en la ventana de trabajo; run() sigue síncrona para las pruebas */
  function runUI() {
    return gpAfterPaint(() => { run(); }, gpWork('Revisando la calidad y los duplicados', 'Checking quality and duplicates'));
  }

  document.addEventListener('stepchange', e => { if (e.detail.step === 3) runUI(); });
  document.addEventListener('langchange', () => { if (el('panel-3') && ui.lastAudit) render(); });

  window.B3 = { run, report, ui, render };
})();
