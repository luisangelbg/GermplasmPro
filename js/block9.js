/* GermplasmPro — Bloque 9: etiquetas y registro.

   Lo que se imprime y se pega: etiquetas de sobre, frasco, estaca, criotubo y
   envío, con código de barras Code 128 legible por cualquier lector; y las
   hojas de trabajo que acompañan al material: lista de siembra, vale de
   distribución y libro de registro.

   Todo sale en milímetros y con su propia hoja de impresión, para que lo que
   se ve en pantalla sea del tamaño que sale de la impresora. */

(function () {

  const view = {
    fmt: 'envelope',
    page: 'letter',
    fields: ['ACCENAME', 'TAXON', 'COLLSITE'],
    barcode: true,
    codigo: 'barras',      /* barras | qr */
    logo: true,            /* el chayote en el centro del QR */
    header: '',
    which: 'all',        /* all | core | work | selection */
    selection: new Set(),
    sheet: 'labels',     /* labels | sowing | register | delivery */
    plants: 100,
  };
  let rows = [];

  /* ============ qué accesiones se etiquetan ============ */
  function pickRows() {
    if (view.which === 'core' && window.B7 && B7.analysis()) {
      const A = B7.analysis();
      return A.core.core.map(i => A.pairs[i].acc);
    }
    if (view.which === 'work' && window.B8 && B8.analysis()) {
      return B8.analysis().lots.filter(l => l.st.alerts.some(a => a.level === 'crit')).map(l => l.row);
    }
    if (view.which === 'selection') {
      return state.acc.filter(r => view.selection.has(r.ACCENUMB));
    }
    return state.acc.slice();
  }

  /* ============ interfaz ============ */
  function run() {
    rows = pickRows();
    if (el('panel-9')) render();
    return rows;
  }

  function render() {
    if (!state.acc.length) {
      el('b9Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      return;
    }
    const f = LABELS.FORMATS[view.fmt];
    const s = LABELS.sheet(rows, view.fmt, view.page);
    const lang = I18N.lang;

    el('b9Body').innerHTML = `
      <h3 class="section-title no-print">${T('1 · Qué se imprime y en qué formato', '1 · What gets printed and in which format')}</h3>
      <div class="card no-print">
        <div class="imp-row">
          <label class="inline-label">${T('Qué imprimir', 'What to print')}<select class="sel" id="b9Which">
            ${[['all', T(`toda la colección (${state.acc.length})`, `the whole collection (${state.acc.length})`)],
               ['core', T('la colección núcleo del Bloque 7', 'the core collection from Block 7')],
               ['work', T('los lotes en apuros del Bloque 8', 'the lots in trouble from Block 8')],
               ['selection', T(`mi selección (${view.selection.size})`, `my selection (${view.selection.size})`)]]
              .map(([v, t]) => `<option value="${v}"${view.which === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}
          </select></label>
          <label class="inline-label">${T('Hoja', 'Sheet')}<select class="sel" id="b9Sheet">
            ${[['labels', T('etiquetas', 'labels')], ['sowing', T('lista de siembra', 'sowing list')],
               ['delivery', T('vale de distribución', 'delivery note')], ['register', T('libro de registro', 'register book')]]
              .map(([v, t]) => `<option value="${v}"${view.sheet === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}
          </select></label>
          ${view.sheet === 'labels' ? `
          <label class="inline-label">${T('Formato', 'Format')}<select class="sel" id="b9Fmt">
            ${Object.keys(LABELS.FORMATS).map(k => `<option value="${k}"${view.fmt === k ? ' selected' : ''}>${esc(T(LABELS.FORMATS[k].es, LABELS.FORMATS[k].en))} · ${LABELS.FORMATS[k].w}×${LABELS.FORMATS[k].h} mm</option>`).join('')}
          </select></label>
          <label class="inline-label">${T('Papel', 'Paper')}<select class="sel" id="b9Page">
            ${Object.keys(LABELS.PAGES).map(k => `<option value="${k}"${view.page === k ? ' selected' : ''}>${esc(T(LABELS.PAGES[k].es, LABELS.PAGES[k].en))}</option>`).join('')}
          </select></label>
          <label class="inline-label">${T('Encabezado', 'Header')}<input class="inp" id="b9Header" value="${esc(view.header)}" data-es-ph="Nombre del banco (opcional)" data-en-ph="Genebank name (optional)"></label>
          <label class="inline-label">${T('Código', 'Code')}<select class="sel" id="b9Cod">
            ${[['barras', T('de barras (Code 128)', 'barcode (Code 128)')], ['qr', T('QR', 'QR')], ['', T('sin código', 'no code')]]
              .map(([v, t]) => `<option value="${v}"${(view.barcode ? view.codigo : '') === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}
          </select></label>
          ${view.barcode && view.codigo === 'qr' ? `<button class="chip${view.logo ? ' on' : ''}" id="b9Logo">${T('chayote en el centro', 'chayote in the middle')}</button>` : ''}` : ''}
          <button class="btn btn-primary btn-sm" id="b9Print">${T('Imprimir', 'Print')}</button>
        </div>

        ${view.sheet === 'labels' ? `
        <div class="chips" style="margin-top:10px">
          ${LABELS.FIELDS.filter(x => x.k !== 'ACCENUMB').map(x => `<button class="chip${view.fields.includes(x.k) ? ' on' : ''}" data-field="${x.k}">${esc(T(x.es, x.en))}</button>`).join('')}
        </div>
        <p class="hint" style="margin-bottom:0">${T(
          `Caben <b>${s.cols} × ${s.rowsPerPage} = ${s.perPage}</b> etiquetas por hoja, y para ${rows.length} accesiones hacen falta <b>${s.pages.length}</b> ${s.pages.length === 1 ? 'hoja' : 'hojas'}. El número de accesión va siempre; los demás campos se ponen y se quitan aquí, y sólo caben los que quepan.`,
          `<b>${s.cols} × ${s.rowsPerPage} = ${s.perPage}</b> labels fit per sheet, and ${rows.length} accessions need <b>${s.pages.length}</b> ${s.pages.length === 1 ? 'sheet' : 'sheets'}. The accession number is always printed; the other fields are switched on and off here, and only those that fit will show.`)}</p>
        ${avisoQR()}`
        : ''}
      </div>

      ${view.which === 'selection' ? picker() : ''}

      <h3 class="section-title no-print">${T('2 · La hoja, tal como saldrá impresa', '2 · The sheet, exactly as it will print')}</h3>
      <div id="b9Preview">${view.sheet === 'labels' ? labelsPreview(s, lang) : workSheet()}</div>`;

    /* eventos */
    const bind = (id, fn) => { const nEl = el(id); if (nEl) nEl.addEventListener('change', fn); };
    bind('b9Which', () => { view.which = el('b9Which').value; inWork(run); });
    bind('b9Sheet', () => { view.sheet = el('b9Sheet').value; inWork(render); });
    bind('b9Fmt', () => { view.fmt = el('b9Fmt').value; inWork(render); });
    bind('b9Page', () => { view.page = el('b9Page').value; inWork(render); });
    const h = el('b9Header');
    if (h) h.addEventListener('input', () => { view.header = h.value; Prefs.set('labelHeader', h.value); render(); });
    const b = el('b9Cod');
    if (b) b.addEventListener('change', () => {
      view.barcode = b.value !== '';
      if (b.value) view.codigo = b.value;
      Prefs.set('labelCodigo', view.codigo);
      inWork(render);
    });
    const lg = el('b9Logo');
    if (lg) lg.addEventListener('click', () => { view.logo = !view.logo; Prefs.set('labelLogo', view.logo); inWork(render); });
    els('[data-field]', el('b9Body')).forEach(x => x.addEventListener('click', () => {
      const k = x.dataset.field;
      view.fields = view.fields.includes(k) ? view.fields.filter(v => v !== k) : view.fields.concat([k]);
      Prefs.set('labelFields', view.fields);
      render();
    }));
    el('b9Print').addEventListener('click', () => window.print());
    if (el('b9Picker')) {
      el('b9Q').addEventListener('input', () => { view.q = el('b9Q').value; render(); el('b9Q').focus(); });
      el('b9All').addEventListener('click', () => {
        els('[data-pick]', el('b9Picker')).forEach(c => view.selection.add(c.dataset.pick));
        run();
      });
      el('b9None').addEventListener('click', () => { view.selection.clear(); run(); });
      els('[data-pick]', el('b9Picker')).forEach(c => c.addEventListener('change', () => {
        if (c.checked) view.selection.add(c.dataset.pick); else view.selection.delete(c.dataset.pick);
        run();
      }));
    }
    I18N.apply(el('b9Body'));
  }

  /* Un QR sólo se lee si sus módulos son bastante grandes. En una etiqueta
     chica pueden quedar por debajo de lo que resuelven la impresora y la
     cámara, y más vale decirlo antes de imprimir cien que después. */
  function avisoQR() {
    if (!view.barcode || view.codigo !== 'qr') return '';
    const m = LABELS.qrModulo(view.fmt, (rows[0] || {}).ACCENUMB || 'MEX-0000');
    if (!m) return '';
    const mm = fmt(m.mm, 2);
    if (m.suficiente) {
      return `<p class="hint" style="margin:6px 0 0">${T(
        `Cada módulo del QR mide <b>${mm} mm</b> en este formato, de sobra para cualquier lector. Versión ${m.version}, nivel H.`,
        `Each QR module is <b>${mm} mm</b> in this format, plenty for any reader. Version ${m.version}, level H.`)}</p>`;
    }
    return `<div class="paste-warn warn" style="margin-top:8px">${T(
      `En esta etiqueta cada módulo del QR queda en <b>${mm} mm</b>, por debajo de los ${fmt(LABELS.QR_MIN_MODULO, 1)} mm que una impresora láser y la cámara de un teléfono resuelven con holgura. Imprime una y pruébala antes de hacer el resto; si no lee, usa el código de barras, que en tan poco espacio aguanta mejor.`,
      `On this label each QR module is <b>${mm} mm</b>, below the ${fmt(LABELS.QR_MIN_MODULO, 1)} mm that a laser printer and a phone camera resolve comfortably. Print one and test it before doing the rest; if it does not read, use the barcode, which copes better in so little space.`)}</div>`;
  }

  /* ---------- escoger accesiones a mano ---------- */
  /* No siempre se imprime la colección entera: a veces son las diez que van a
     un envío. Aquí se marcan una por una, con un buscador para no perderse. */
  function search(q) {
    const s = String(q || '').trim().toLowerCase();
    return state.acc.filter(r => !s || [r.ACCENUMB, r.ACCENAME, r.GENUS, r.SPECIES, r.COLLSITE]
      .some(v => String(v || '').toLowerCase().includes(s)));
  }

  function picker() {
    const list = search(view.q);
    return `<div class="card no-print" id="b9Picker">
      <div class="imp-row">
        <label class="inline-label">${T('Buscar', 'Search')}<input class="inp" id="b9Q" value="${esc(view.q || '')}" data-es-ph="número, nombre, especie o sitio" data-en-ph="number, name, species or site"></label>
        <button class="btn btn-ghost btn-sm" id="b9All">${T(`marcar las ${list.length} de la lista`, `tick the ${list.length} listed`)}</button>
        <button class="btn btn-ghost btn-sm" id="b9None">${T('desmarcar todo', 'untick all')}</button>
        <span class="hint">${T(`${view.selection.size} marcadas`, `${view.selection.size} ticked`)}</span>
      </div>
      <div class="pick-list">
        ${list.slice(0, 400).map(r => `<label class="pick-item${view.selection.has(r.ACCENUMB) ? ' on' : ''}">
          <input type="checkbox" data-pick="${esc(r.ACCENUMB)}"${view.selection.has(r.ACCENUMB) ? ' checked' : ''}>
          <span class="mono">${esc(r.ACCENUMB || '')}</span>
          <span>${esc(String(r.ACCENAME || '').slice(0, 28))}</span>
          <i>${esc([r.GENUS, r.SPECIES].filter(Boolean).join(' '))}</i>
        </label>`).join('')}
      </div>
      ${list.length > 400 ? `<p class="hint">${T('Se enseñan las primeras 400; afina la búsqueda para ver el resto.', 'The first 400 are listed; narrow the search to see the rest.')}</p>` : ''}
    </div>`;
  }

  /* ---------- vista previa de las hojas de etiquetas ---------- */
  function labelsPreview(s, lang) {
    if (!rows.length) return `<div class="sim-empty">${T('No hay accesiones en esta selección.', 'No accessions in this selection.')}</div>`;
    const opts = { fields: view.fields, barcode: view.barcode, codigo: view.codigo, logo: view.logo, header: view.header, lang };
    return s.pages.map((page, pi) => `
      <div class="print-sheet label-sheet" style="width:${s.page.w}mm;min-height:${s.page.h}mm;padding:${s.margin}mm">
        <div class="label-grid" style="grid-template-columns:repeat(${s.cols}, ${s.format.w}mm);gap:${s.gap}mm">
          ${page.map(r => LABELS.labelSVG(r, view.fmt, opts)).join('')}
        </div>
        <div class="sheet-foot no-print">${T(`hoja ${pi + 1} de ${s.pages.length}`, `sheet ${pi + 1} of ${s.pages.length}`)}</div>
      </div>`).join('');
  }

  /* ---------- hojas de trabajo ---------- */
  function workSheet() {
    const today = new Date().toLocaleDateString(I18N.lang === 'en' ? 'en-US' : 'es-MX');
    const head = (title, sub) => `<div class="ws-head">
      <div><h3>${esc(title)}</h3><p class="hint">${esc(sub)}</p></div>
      <div class="ws-meta">${esc(view.header || '')}<br>${today}</div></div>`;

    if (view.sheet === 'sowing') {
      const lots = rows.map(r => ({ row: r }));
      const list = LABELS.sowingSheet(lots, { plants: view.plants });
      return `<div class="print-sheet ws">
        ${head(T('Lista de siembra para regeneración', 'Sowing list for regeneration'),
          T(`${list.length} accesiones · ${view.plants} plantas por accesión · las semillas a sembrar salen de la germinación de cada lote`,
            `${list.length} accessions · ${view.plants} plants each · seeds to sow follow from each lot's germination`))}
        <table class="tbl ws-tbl"><thead><tr>
          <th>${T('Accesión', 'Accession')}</th><th>${T('Nombre', 'Name')}</th><th>${T('Especie', 'Species')}</th>
          <th class="num">${T('Germ.', 'Germ.')}</th><th class="num">${T('Semillas', 'Seeds')}</th>
          <th>${T('Parcela', 'Plot')}</th><th>${T('Fecha', 'Date')}</th><th>${T('Observaciones', 'Notes')}</th>
        </tr></thead><tbody>
        ${list.map(x => `<tr>
          <td class="mono">${esc(x.ACCENUMB || '')}</td><td>${esc(String(x.nombre || '').slice(0, 26))}</td>
          <td><i>${esc(x.taxon)}</i></td><td class="num">${fmt(x.germinacion, 0)} %</td>
          <td class="num"><b>${fmtInt(x.semillas)}</b></td><td class="ws-blank"></td><td class="ws-blank"></td><td class="ws-blank"></td>
        </tr>`).join('')}
        </tbody></table>
        <div class="imp-row no-print" style="margin-top:10px">
          <label class="inline-label">${T('Plantas por accesión', 'Plants per accession')}
            <input class="inp" type="number" id="b9Plants" min="10" max="500" step="10" value="${view.plants}" style="width:90px"></label>
          <button class="btn btn-ghost btn-sm" id="b9SowCSV">${T('Descargar en CSV', 'Download as CSV')}</button>
        </div>
      </div>`;
    }

    if (view.sheet === 'delivery') {
      return `<div class="print-sheet ws">
        ${head(T('Vale de distribución de germoplasma', 'Germplasm delivery note'),
          T('Este material se entrega con las condiciones del Tratado Internacional cuando la accesión está en el Sistema Multilateral (MLSSTAT = 1).',
            'This material is supplied under the International Treaty terms when the accession is in the Multilateral System (MLSSTAT = 1).'))}
        <div class="ws-fields">
          <div><b>${T('Solicitante', 'Requester')}:</b> <span class="ws-line"></span></div>
          <div><b>${T('Institución', 'Institution')}:</b> <span class="ws-line"></span></div>
          <div><b>${T('Uso previsto', 'Intended use')}:</b> <span class="ws-line"></span></div>
          <div><b>${T('Fecha de envío', 'Shipping date')}:</b> <span class="ws-line"></span></div>
        </div>
        <table class="tbl ws-tbl"><thead><tr>
          <th>${T('Accesión', 'Accession')}</th><th>${T('Nombre', 'Name')}</th><th>${T('Especie', 'Species')}</th>
          <th>${T('Origen', 'Origin')}</th><th class="num">${T('Cantidad', 'Quantity')}</th><th>${T('SMTA', 'SMTA')}</th>
        </tr></thead><tbody>
        ${rows.map(r => `<tr>
          <td class="mono">${esc(r.ACCENUMB || '')}</td><td>${esc(String(r.ACCENAME || '').slice(0, 24))}</td>
          <td><i>${esc([r.GENUS, r.SPECIES].filter(Boolean).join(' '))}</i></td>
          <td>${esc(LABELS.valueOf(r, 'ORIGCTY', I18N.lang))}</td>
          <td class="ws-blank"></td>
          <td>${String(r.MLSSTAT) === '1' ? T('sí', 'yes') : String(r.MLSSTAT) === '0' ? T('no', 'no') : '—'}</td>
        </tr>`).join('')}
        </tbody></table>
        <div class="ws-sign">
          <div>${T('Entrega (nombre y firma)', 'Released by (name and signature)')}<span class="ws-line long"></span></div>
          <div>${T('Recibe (nombre y firma)', 'Received by (name and signature)')}<span class="ws-line long"></span></div>
        </div>
      </div>`;
    }

    /* libro de registro */
    const byRoute = new Map();
    rows.forEach(r => {
      const k = MCPD.consRoute(r) || '—';
      if (!byRoute.has(k)) byRoute.set(k, []);
      byRoute.get(k).push(r);
    });
    return `<div class="print-sheet ws">
      ${head(T('Libro de registro de la colección', 'Collection register book'),
        T(`${rows.length} accesiones al ${today}`, `${rows.length} accessions as of ${today}`))}
      ${[...byRoute.entries()].map(([route, list]) => {
        const c = MCPD.GPCONS.find(x => x.c === route);
        return `<h4 class="ws-sub">${esc(c ? T(c.es, c.en) : T('sin declarar', 'not declared'))} · ${list.length}</h4>
        <table class="tbl ws-tbl"><thead><tr>
          <th>${T('Accesión', 'Accession')}</th><th>${T('Nombre', 'Name')}</th><th>${T('Especie', 'Species')}</th>
          <th>${T('Sitio', 'Site')}</th><th class="num">${T('Ingreso', 'Acquired')}</th>
          <th class="num">${T('Existencias', 'Stock')}</th><th class="num">${T('Últ. germ.', 'Last germ.')}</th><th>${T('Respaldo', 'Backup')}</th>
        </tr></thead><tbody>
        ${list.map(r => `<tr>
          <td class="mono">${esc(r.ACCENUMB || '')}</td><td>${esc(String(r.ACCENAME || '').slice(0, 22))}</td>
          <td><i>${esc([r.GENUS, r.SPECIES].filter(Boolean).join(' '))}</i></td>
          <td>${esc(String(r.COLLSITE || '').slice(0, 26))}</td>
          <td class="num">${esc(LABELS.valueOf(r, 'ACQDATE', I18N.lang))}</td>
          <td class="num">${esc(r.GP_STOCK || '')}</td>
          <td class="num">${esc(r.GP_GERMPCT ? r.GP_GERMPCT + ' %' : '')}</td>
          <td>${esc(r.DUPLSITE || '—')}</td>
        </tr>`).join('')}
        </tbody></table>`;
      }).join('')}
    </div>`;
  }

  /* ============ arranque ============ */
  function init() {
    if (!el('panel-9')) return;
    view.header = Prefs.get('labelHeader', '') || '';
    const f = Prefs.get('labelFields', null);
    if (Array.isArray(f) && f.length) view.fields = f;
    run();
    /* los controles que viven dentro de las hojas de trabajo se enlazan al vuelo */
    el('b9Body').addEventListener('input', e => {
      if (e.target && e.target.id === 'b9Plants') {
        view.plants = clamp(Number(e.target.value) || 100, 10, 500);
        const prev = el('b9Preview');
        if (prev) prev.innerHTML = workSheet();
      }
    });
    el('b9Body').addEventListener('click', e => {
      if (e.target && e.target.id === 'b9SowCSV') gpBusy(e.target, () => {
        const list = LABELS.sowingSheet(rows.map(r => ({ row: r })), { plants: view.plants });
        download(IO.toCSV(list, Object.keys(list[0] || { ACCENUMB: '' })), 'lista-de-siembra.csv', 'text/csv;charset=utf-8');
      });
    });
  }

  /* hojas con muchas etiquetas (y un código QR o de barras en cada una) se
     arman dentro de la ventana de trabajo */
  function inWork(f) {
    return gpAfterPaint(() => { f(); }, gpWork('Preparando las etiquetas', 'Preparing the labels'));
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('stepchange', e => { if (e.detail.step === 9) inWork(run); });
  document.addEventListener('langchange', () => { if (el('panel-9')) run(); });

  window.B9 = { run, view, labelsPreview, workSheet, pickRows, search };
})();
