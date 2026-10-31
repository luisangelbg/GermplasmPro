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
    plantsEdited: false, /* mientras no se toque, las plantas son las del Bloque 8 */
  };
  let rows = [];

  const pl = (n, uno, varios) => (n === 1 ? uno : varios);
  const shorten = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));

  /* ============ qué accesiones se etiquetan ============ */
  /* el núcleo del Bloque 7 y los lotes en apuros del Bloque 8, si los hay */
  function coreAnalysis() { return window.B7 && B7.analysis() ? B7.analysis() : null; }
  function workAnalysis() {
    if (!window.B8) return null;
    return B8.analysis() || (state.acc.length ? B8.run() : null);
  }
  const enApuros = M => M.lots.filter(l => l.st.alerts.some(a => a.level === 'crit')).map(l => l.row);

  function pickRows() {
    if (view.which === 'core') {
      /* sin núcleo calculado no hay nada que imprimir: no se cae en silencio a la colección entera */
      const A = coreAnalysis();
      return A ? A.core.core.map(i => A.pairs[i].acc) : [];
    }
    if (view.which === 'work') {
      const M = workAnalysis();
      return M ? enApuros(M) : [];
    }
    if (view.which === 'selection') {
      return state.acc.filter(r => view.selection.has(r.ACCENUMB));
    }
    return state.acc.slice();
  }

  /* las plantas por accesión de la lista de siembra: las de una regeneración
     en los supuestos del Bloque 8, mientras no se cambien aquí */
  function plants() {
    if (view.plantsEdited) return view.plants;
    const c = window.B8 && B8.cfg ? B8.cfg() : null;
    return c && c.seed && c.seed.regenPlants ? c.seed.regenPlants : view.plants;
  }

  /* ============ el foco no se pierde al redibujar ============ */
  let lastFocus = null;
  function focusKey(n) {
    const body = el('b9Body');
    if (!n || !body || !body.contains(n)) return null;
    if (n.id) return '#' + n.id;
    for (const a of ['data-field', 'data-pick']) if (n.hasAttribute(a)) return `[${a}="${CSS.escape(n.getAttribute(a))}"]`;
    return null;
  }
  /* redibuja con fn y devuelve el foco (y el cursor de un campo de texto) al
     control equivalente, si el que lo tenía desapareció con el redibujo */
  function keepFocus(fn) {
    const a = document.activeElement;
    const key = focusKey(a) || lastFocus;
    let sel = null;
    try { if (a && a.selectionStart != null) sel = [a.selectionStart, a.selectionEnd]; } catch (e) { sel = null; }
    fn();
    if (!key || !el('b9Body')) return;
    const cur = document.activeElement;
    const lost = !cur || cur === document.body || !document.body.contains(a) || cur === a;
    if (!lost) return;
    const n = el('b9Body').querySelector(key);
    if (!n || n === cur) return;
    n.focus({ preventScroll: true });
    if (sel) { try { n.setSelectionRange(sel[0], sel[1]); } catch (e) { /* number, select… */ } }
  }

  /* ============ interfaz ============ */
  function run() {
    rows = pickRows();
    if (el('panel-9')) keepFocus(render);
    return rows;
  }

  function render() {
    if (!state.acc.length) {
      el('b9Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      return;
    }
    const s = LABELS.sheet(rows, view.fmt, view.page);
    const lang = I18N.lang;
    /* el número de lotes en apuros se sabe aunque todavía no se haya visitado
       el Bloque 8: si no hay análisis, se corre aquí */
    const A = coreAnalysis(), M = workAnalysis();
    const nCore = A ? A.core.core.length : null, nWork = M ? enApuros(M).length : null;
    const nAll = state.acc.length, nSel = view.selection.size;
    const opciones = [
      ['all', T(`toda la colección (${nAll})`, `the whole collection (${nAll})`)],
      ['core', nCore != null ? T(`la colección núcleo del Bloque 7 (${nCore})`, `the core collection from Block 7 (${nCore})`)
        : T('la colección núcleo del Bloque 7 (aún no calculada)', 'the core collection from Block 7 (not built yet)'), nCore == null && view.which !== 'core'],
      ['work', nWork != null ? T(`los lotes en apuros del Bloque 8 (${nWork})`, `the lots in trouble from Block 8 (${nWork})`)
        : T('los lotes en apuros del Bloque 8', 'the lots in trouble from Block 8')],
      ['selection', T(`mi selección (${nSel})`, `my selection (${nSel})`)]];

    el('b9Body').innerHTML = `
      <h3 class="section-title no-print">${T('1 · Qué se imprime y en qué formato', '1 · What gets printed and in which format')}</h3>
      <div class="card no-print">
        <div class="imp-row">
          <label class="inline-label">${T('Qué imprimir', 'What to print')}<select class="sel" id="b9Which">
            ${opciones.map(([v, t, off]) => `<option value="${v}"${view.which === v ? ' selected' : ''}${off ? ' disabled' : ''}>${esc(t)}</option>`).join('')}
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
          </select></label>` : ''}
          <label class="inline-label">${T('Encabezado', 'Header')}<input class="inp b9-header" id="b9Header" value="${esc(view.header)}" data-es-ph="Nombre del banco (opcional)" data-en-ph="Genebank name (optional)"></label>
          ${view.sheet === 'labels' ? `
          <label class="inline-label">${T('Código', 'Code')}<select class="sel" id="b9Cod">
            ${[['barras', T('de barras (Code 128)', 'barcode (Code 128)')], ['qr', T('QR', 'QR')], ['', T('sin código', 'no code')]]
              .map(([v, t]) => `<option value="${v}"${(view.barcode ? view.codigo : '') === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}
          </select></label>
          ${view.barcode && view.codigo === 'qr' ? `<button class="chip${view.logo ? ' on' : ''}" id="b9Logo" aria-pressed="${view.logo}">${T('chayote en el centro', 'chayote in the middle')}</button>` : ''}` : ''}
          <button class="btn btn-primary btn-sm" id="b9Print"${rows.length ? '' : ' disabled'}>${T('Imprimir', 'Print')}</button>
        </div>

        ${view.which === 'core' && nCore == null ? `<div class="note-warn" style="margin-top:10px">${T(
          '<b>Aún no hay núcleo: calcúlalo en el Bloque 7.</b> El núcleo sale de la caracterización; mientras no exista, esta opción no tiene accesiones que imprimir.',
          '<b>There is no core yet: build it in Block 7.</b> The core comes from the characterization; until it exists, this option has no accessions to print.')}</div>` : ''}

        ${view.sheet === 'labels' ? `
        <div class="chips" style="margin-top:10px" role="group" aria-label="${esc(T('Campos de la etiqueta', 'Label fields'))}">
          ${LABELS.FIELDS.filter(x => x.k !== 'ACCENUMB').map(x => `<button class="chip${view.fields.includes(x.k) ? ' on' : ''}" data-field="${x.k}" aria-pressed="${view.fields.includes(x.k)}">${esc(T(x.es, x.en))}</button>`).join('')}
        </div>
        <p class="hint" style="margin-bottom:0">${T(
          `Caben <b>${s.cols} × ${s.rowsPerPage} = ${s.perPage}</b> etiquetas por hoja, y para ${rows.length} ${pl(rows.length, 'accesión', 'accesiones')} ${pl(s.pages.length, 'hace', 'hacen')} falta <b>${s.pages.length}</b> ${pl(s.pages.length, 'hoja', 'hojas')}. El número de accesión va siempre; los demás campos se ponen y se quitan aquí, y sólo caben los que quepan. Imprime al 100 % (sin «ajustar a la página»): la hoja ya trae sus márgenes.`,
          `<b>${s.cols} × ${s.rowsPerPage} = ${s.perPage}</b> labels fit per sheet, and ${rows.length} ${pl(rows.length, 'accession needs', 'accessions need')} <b>${s.pages.length}</b> ${pl(s.pages.length, 'sheet', 'sheets')}. The accession number is always printed; the other fields are switched on and off here, and only those that fit will show. Print at 100% (no “fit to page”): the sheet already carries its margins.`)}</p>`
        : ''}
        <div id="b9Notes">${notes()}</div>
      </div>

      ${view.which === 'selection' ? picker() : ''}

      <h3 class="section-title no-print">${T('2 · La hoja, tal como saldrá impresa', '2 · The sheet, exactly as it will print')}</h3>
      <div id="b9Preview">${preview(lang, s)}</div>`;

    /* eventos */
    const bind = (id, fn) => { const nEl = el(id); if (nEl) nEl.addEventListener('change', fn); };
    bind('b9Which', () => { view.which = el('b9Which').value; inWork(run); });
    bind('b9Sheet', () => { view.sheet = el('b9Sheet').value; inWork(() => keepFocus(render)); });
    bind('b9Fmt', () => { view.fmt = el('b9Fmt').value; inWork(() => keepFocus(render)); });
    bind('b9Page', () => { view.page = el('b9Page').value; inWork(() => keepFocus(render)); });
    const h = el('b9Header');
    /* el encabezado sólo cambia la vista previa y los avisos: el campo no se rehace */
    if (h) h.addEventListener('input', () => { view.header = h.value; Prefs.set('labelHeader', h.value); refreshPreview(); });
    const b = el('b9Cod');
    if (b) b.addEventListener('change', () => {
      view.barcode = b.value !== '';
      if (b.value) view.codigo = b.value;
      Prefs.set('labelCodigo', view.codigo);
      Prefs.set('labelBarcode', view.barcode);
      inWork(() => keepFocus(render));
    });
    const lg = el('b9Logo');
    if (lg) lg.addEventListener('click', () => { view.logo = !view.logo; Prefs.set('labelLogo', view.logo); inWork(() => keepFocus(render)); });
    els('[data-field]', el('b9Body')).forEach(x => x.addEventListener('click', () => {
      const k = x.dataset.field;
      view.fields = view.fields.includes(k) ? view.fields.filter(v => v !== k) : view.fields.concat([k]);
      Prefs.set('labelFields', view.fields);
      keepFocus(render);
    }));
    el('b9Print').addEventListener('click', printNow);
    if (el('b9Picker')) {
      el('b9Q').addEventListener('input', () => { view.q = el('b9Q').value; keepFocus(render); });
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

  function preview(lang, s) {
    return view.sheet === 'labels' ? labelsPreview(s || LABELS.sheet(rows, view.fmt, view.page), lang || I18N.lang) : workSheet();
  }
  /* rehace sólo la vista previa y los avisos, sin tocar los controles */
  function refreshPreview() {
    keepFocus(() => {
      const p = el('b9Preview'); if (p) p.innerHTML = preview();
      const nt = el('b9Notes'); if (nt) nt.innerHTML = notes();
    });
  }

  /* ============ avisos antes de imprimir ============ */
  function notes() {
    if (view.sheet !== 'labels' || !rows.length) return '';
    return [avisoQR(), avisoBarras(), avisoCampos()].join('');
  }

  /* Un QR sólo se lee si sus módulos son bastante grandes. En una etiqueta
     chica pueden quedar por debajo de lo que resuelven la impresora y la
     cámara, y más vale decirlo antes de imprimir cien que después. */
  function avisoQR() {
    if (!view.barcode || view.codigo !== 'qr') return '';
    const largo = rows.reduce((a, r) => (String(r.ACCENUMB || '').length > String(a).length ? r.ACCENUMB : a), 'MEX-0000');
    const m = LABELS.qrModulo(view.fmt, largo);
    if (!m) return '';
    const mm = fmt(m.mm, 2);
    if (m.suficiente) {
      return `<p class="hint" style="margin:6px 0 0">${T(
        `Cada módulo del QR mide <b>${mm} mm</b> en este formato, de sobra para cualquier lector. Versión ${m.version}, nivel H, con la zona en blanco de ${m.quiet} módulos por lado que pide la norma.`,
        `Each QR module is <b>${mm} mm</b> in this format, plenty for any reader. Version ${m.version}, level H, with the ${m.quiet}-module quiet zone on each side the standard asks for.`)}</p>`;
    }
    return `<div class="paste-warn warn" style="margin-top:8px">${T(
      `En esta etiqueta cada módulo del QR queda en <b>${mm} mm</b>, por debajo de los ${fmt(LABELS.QR_MIN_MODULO, 1)} mm que una impresora láser y la cámara de un teléfono resuelven con holgura (ya con la zona en blanco de ${m.quiet} módulos por lado). Imprime una y pruébala antes de hacer el resto; si no lee, usa el código de barras, que en tan poco espacio aguanta mejor.`,
      `On this label each QR module is <b>${mm} mm</b>, below the ${fmt(LABELS.QR_MIN_MODULO, 1)} mm that a laser printer and a phone camera resolve comfortably (already with the ${m.quiet}-module quiet zone on each side). Print one and test it before doing the rest; if it does not read, use the barcode, which copes better in so little space.`)}</div>`;
  }

  /* El Code 128 sólo admite ASCII, y su barra más delgada tiene un mínimo
     imprimible: las dos cosas se dicen antes de imprimir. */
  function avisoBarras() {
    if (!view.barcode || view.codigo !== 'barras') return '';
    const out = [];
    const malos = rows.filter(r => r.ACCENUMB && !LABELS.encode128(r.ACCENUMB)).map(r => r.ACCENUMB);
    if (malos.length) {
      const lista = malos.slice(0, 5).join(', ') + (malos.length > 5 ? '…' : '');
      out.push(`<div class="paste-warn warn" style="margin-top:8px">${T(
        `<b>${malos.length} ${pl(malos.length, 'etiqueta sale', 'etiquetas salen')} sin código de barras</b> (${esc(lista)}): ${pl(malos.length, 'su número tiene', 'sus números tienen')} letras fuera de ASCII (acentos, ñ…), que Code 128 no admite. En la vista previa ${pl(malos.length, 'va marcada', 'van marcadas')} con un borde rojo. Usa el código QR, que sí las lleva, o corrige el número en el Bloque 2.`,
        `<b>${malos.length} ${pl(malos.length, 'label comes', 'labels come')} out without a barcode</b> (${esc(lista)}): ${pl(malos.length, 'its number has', 'their numbers have')} characters outside ASCII (accents, ñ…), which Code 128 does not support. In the preview ${pl(malos.length, 'it is', 'they are')} outlined in red. Use the QR code, which handles them, or fix the number in Block 2.`)}</div>`);
    }
    /* el módulo más delgado sale con el número más largo */
    let peor = null;
    rows.forEach(r => {
      const m = r.ACCENUMB ? LABELS.barModulo(view.fmt, r.ACCENUMB) : null;
      if (m && (!peor || m.mm < peor.mm)) peor = Object.assign({ num: r.ACCENUMB }, m);
    });
    if (peor && !peor.suficiente) {
      out.push(`<div class="paste-warn warn" style="margin-top:8px">${T(
        `En este formato la barra más delgada del código queda en <b>${fmt(peor.mm, 3)} mm</b> (con ${esc(peor.num)}), por debajo de los ${fmt(LABELS.BAR_MIN_MODULO, 2)} mm que una impresora de oficina dibuja parejo y un lector de mano separa; de ${fmt(LABELS.BAR_OK_MODULO, 2)} mm para arriba lee cualquiera. Imprime una y pruébala, usa un formato más ancho o un número más corto.`,
        `In this format the narrowest bar of the code is <b>${fmt(peor.mm, 3)} mm</b> (with ${esc(peor.num)}), below the ${fmt(LABELS.BAR_MIN_MODULO, 2)} mm an office printer draws evenly and a handheld reader resolves; from ${fmt(LABELS.BAR_OK_MODULO, 2)} mm up any reader copes. Print one and test it, use a wider format or a shorter number.`)}</div>`);
    } else if (peor) {
      out.push(`<p class="hint" style="margin:6px 0 0">${T(
        `La barra más delgada del código mide <b>${fmt(peor.mm, 3)} mm</b> en este formato${peor.holgado ? ', de sobra para cualquier lector' : `: imprimible, aunque por debajo de los ${fmt(LABELS.BAR_OK_MODULO, 2)} mm que lee cualquiera; prueba una antes de imprimir el resto`}.`,
        `The narrowest bar of the code is <b>${fmt(peor.mm, 3)} mm</b> in this format${peor.holgado ? ', plenty for any reader' : `: printable, though below the ${fmt(LABELS.BAR_OK_MODULO, 2)} mm any reader handles; test one before printing the rest`}.`)}</p>`);
    }
    return out.join('');
  }

  /* los campos que no caben no desaparecen en silencio */
  function avisoCampos() {
    const fit = LABELS.fieldFit(view.fmt, { fields: view.fields, barcode: view.barcode, codigo: view.codigo, header: view.header });
    if (!fit.dropped.length) return '';
    const name = k => { const x = LABELS.FIELDS.find(y => y.k === k); return x ? T(x.es, x.en) : k; };
    const fmtName = T(LABELS.FORMATS[view.fmt].es, LABELS.FORMATS[view.fmt].en);
    const lista = fit.dropped.map(name).join(', ');
    return `<div class="paste-warn warn" style="margin-top:8px">${T(
      `<b>${fit.dropped.length === 1 ? 'Un campo no cabe' : `${fit.dropped.length} campos no caben`}</b> en «${esc(fmtName)}»${view.header ? ' con el encabezado' : ''}: ${fit.slots ? `${pl(fit.slots, 'cabe', 'caben')} ${fit.slots} ${pl(fit.slots, 'renglón', 'renglones')} además del número` : 'no cabe ningún renglón además del número'}, y ${pl(fit.dropped.length, 'queda', 'quedan')} fuera ${esc(lista)} (salvo en las etiquetas donde un campo anterior venga vacío). Quita campos${view.header ? ' o el encabezado' : ''}, o usa un formato más grande.`,
      `<b>${fit.dropped.length === 1 ? 'One field does not fit' : `${fit.dropped.length} fields do not fit`}</b> on “${esc(fmtName)}”${view.header ? ' with the header' : ''}: ${fit.slots ? `${fit.slots} ${pl(fit.slots, 'line fits', 'lines fit')} besides the number` : 'no line fits besides the number'}, so ${esc(lista)} ${pl(fit.dropped.length, 'is', 'are')} left out (except on labels where an earlier field is empty). Remove fields${view.header ? ' or the header' : ''}, or use a larger format.`)}</div>`;
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
    const n = list.length, m = view.selection.size;
    return `<div class="card no-print" id="b9Picker">
      <div class="imp-row">
        <label class="inline-label">${T('Buscar', 'Search')}<input class="inp" id="b9Q" value="${esc(view.q || '')}" data-es-ph="número, nombre, especie o sitio" data-en-ph="number, name, species or site"></label>
        <button class="btn btn-ghost btn-sm" id="b9All">${T(n === 1 ? 'marcar la de la lista' : `marcar las ${n} de la lista`, n === 1 ? 'tick the one listed' : `tick the ${n} listed`)}</button>
        <button class="btn btn-ghost btn-sm" id="b9None">${T('desmarcar todo', 'untick all')}</button>
        <span class="hint">${T(`${m} ${pl(m, 'marcada', 'marcadas')}`, `${m} ticked`)}</span>
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
  /* Cada hoja mide exactamente el papel (ancho y alto) y trae sus propios
     márgenes como relleno: al imprimir, la página no lleva margen (@page con
     margin 0) y nada se escala. */
  function labelsPreview(s, lang) {
    if (!rows.length) return `<div class="sim-empty">${T('No hay accesiones en esta selección.', 'No accessions in this selection.')}</div>`;
    const opts = { fields: view.fields, barcode: view.barcode, codigo: view.codigo, logo: view.logo, header: view.header, lang };
    return s.pages.map((page, pi) => `
      <div class="print-sheet label-sheet" style="width:${s.page.w}mm;height:${s.page.h}mm;padding:${s.margin}mm">
        <div class="label-grid" style="grid-template-columns:repeat(${s.cols}, ${s.format.w}mm);gap:${s.gap}mm">
          ${page.map(r => LABELS.labelSVG(r, view.fmt, opts)).join('')}
        </div>
        <div class="sheet-foot no-print">${T(`hoja ${pi + 1} de ${s.pages.length}`, `sheet ${pi + 1} of ${s.pages.length}`)}</div>
      </div>`).join('');
  }

  /* ---------- impresión de las etiquetas a escala exacta ----------
     Las hojas se copian a un contenedor propio, hijo directo de <body>, y todo
     lo demás se oculta; la página se declara del tamaño del papel y sin margen.
     Así el navegador no encoge nada y no queda una hoja en blanco al final. */
  function preparePrint() {
    endPrint();
    if (view.sheet !== 'labels' || !rows.length || !el('b9Preview')) return false;
    const s = LABELS.sheet(rows, view.fmt, view.page);
    const root = document.createElement('div');
    root.id = 'b9PrintRoot';
    root.innerHTML = els('.label-sheet', el('b9Preview')).map(n => n.outerHTML).join('');
    document.body.appendChild(root);
    const st = document.createElement('style');
    st.id = 'b9PageStyle';
    st.textContent = `@page { size: ${s.page.w}mm ${s.page.h}mm; margin: 0; }`;
    document.head.appendChild(st);
    document.body.classList.add('b9-print-labels');
    return true;
  }
  function endPrint() {
    ['b9PrintRoot', 'b9PageStyle'].forEach(id => { const n = el(id); if (n) n.remove(); });
    document.body.classList.remove('b9-print-labels');
  }
  function printNow() {
    preparePrint();
    try { window.print(); } finally { endPrint(); }
  }

  /* ---------- hojas de trabajo ---------- */
  function workSheet() {
    const today = new Date().toLocaleDateString(I18N.lang === 'en' ? 'en-US' : 'es-MX');
    const head = (title, sub) => `<div class="ws-head">
      <div><h3>${esc(title)}</h3><p class="hint">${esc(sub)}</p></div>
      <div class="ws-meta">${esc(view.header || '')}<br>${today}</div></div>`;
    const n = rows.length;

    if (view.sheet === 'sowing') {
      const lots = rows.map(r => ({ row: r }));
      const np = plants();
      const supuesto = Prefs.get('calcG', 85);
      const list = LABELS.sowingSheet(lots, { plants: np, germ: supuesto });
      const nSup = list.filter(x => x.germinacion_supuesta).length;
      const ceros = list.filter(x => x.semillas == null);
      return `<div class="print-sheet ws">
        ${head(T('Lista de siembra para regeneración', 'Sowing list for regeneration'),
          T(`${list.length} ${pl(list.length, 'accesión', 'accesiones')} · ${np} ${pl(np, 'planta', 'plantas')} por accesión · las semillas a sembrar salen de la germinación de cada lote`,
            `${list.length} ${pl(list.length, 'accession', 'accessions')} · ${np} ${pl(np, 'plant', 'plants')} each · seeds to sow follow from each lot's germination`))}
        <table class="tbl ws-tbl"><thead><tr>
          <th>${T('Accesión', 'Accession')}</th><th>${T('Nombre', 'Name')}</th><th>${T('Especie', 'Species')}</th>
          <th class="num">${T('Germ.', 'Germ.')}</th><th class="num">${T('Semillas', 'Seeds')}</th>
          <th>${T('Parcela', 'Plot')}</th><th>${T('Fecha', 'Date')}</th><th>${T('Observaciones', 'Notes')}</th>
        </tr></thead><tbody>
        ${list.map(x => `<tr>
          <td class="mono">${esc(x.ACCENUMB || '')}</td><td>${esc(shorten(x.nombre || '', 26))}</td>
          <td><i>${esc(x.taxon)}</i></td><td class="num">${fmt(x.germinacion, 0)} %${x.germinacion_supuesta ? '*' : ''}</td>
          <td class="num">${x.semillas != null ? `<b>${fmtInt(x.semillas)}</b>` : '—'}</td><td class="ws-blank"></td><td class="ws-blank"></td><td class="ws-blank"></td>
        </tr>`).join('')}
        </tbody></table>
        ${nSup ? `<p class="ws-note">${T(
          `* Supuesto: ${nSup === 1 ? 'esta accesión no tiene' : `estas ${nSup} accesiones no tienen`} prueba de germinación registrada; se usa el ${fmt(supuesto, 0)} % de la calculadora del Bloque 8. Prueba la germinación antes de sembrar si puedes.`,
          `* Assumed: ${nSup === 1 ? 'this accession has' : `these ${nSup} accessions have`} no germination test recorded; the ${fmt(supuesto, 0)}% from the Block 8 calculator is used. Test germination before sowing if you can.`)}</p>` : ''}
        ${ceros.length ? `<p class="ws-note ws-warn">${T(
          `<b>${ceros.length === 1 ? 'Un lote tiene' : `${ceros.length} lotes tienen`} 0 % de germinación medida</b> (${esc(ceros.map(x => x.ACCENUMB).join(', '))}): no ${pl(ceros.length, 'tiene', 'tienen')} semilla viable y no se ${pl(ceros.length, 'le calculan', 'les calculan')} semillas a sembrar. Recurre al duplicado de seguridad o vuelve a colectar.`,
          `<b>${ceros.length === 1 ? 'One lot has' : `${ceros.length} lots have`} a measured germination of 0%</b> (${esc(ceros.map(x => x.ACCENUMB).join(', '))}): no viable seed, so no seeds to sow are computed. Turn to the safety duplicate or collect again.`)}</p>` : ''}
        <div class="imp-row no-print" style="margin-top:10px">
          <label class="inline-label">${T('Plantas por accesión', 'Plants per accession')}
            <input class="inp" type="number" id="b9Plants" min="10" max="500" step="10" value="${np}" style="width:90px"></label>
          <span class="hint">${view.plantsEdited ? '' : T('las de una regeneración en los supuestos del Bloque 8', 'those of one regeneration in the Block 8 assumptions')}</span>
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
          <td class="mono">${esc(r.ACCENUMB || '')}</td><td>${esc(shorten(r.ACCENAME || '', 24))}</td>
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
        T(`${n} ${pl(n, 'accesión', 'accesiones')} al ${today}`, `${n} ${pl(n, 'accession', 'accessions')} as of ${today}`))}
      ${[...byRoute.entries()].map(([route, list]) => {
        const c = MCPD.GPCONS.find(x => x.c === route);
        return `<h4 class="ws-sub">${esc(c ? T(c.es, c.en) : T('sin declarar', 'not declared'))} · ${list.length}</h4>
        <table class="tbl ws-tbl"><thead><tr>
          <th>${T('Accesión', 'Accession')}</th><th>${T('Nombre', 'Name')}</th><th>${T('Especie', 'Species')}</th>
          <th>${T('Sitio', 'Site')}</th><th class="num">${T('Ingreso', 'Acquired')}</th>
          <th class="num">${T('Existencias', 'Stock')}</th><th class="num">${T('Últ. germ.', 'Last germ.')}</th><th>${T('Respaldo', 'Backup')}</th>
        </tr></thead><tbody>
        ${list.map(r => `<tr>
          <td class="mono">${esc(r.ACCENUMB || '')}</td><td>${esc(shorten(r.ACCENAME || '', 22))}</td>
          <td><i>${esc([r.GENUS, r.SPECIES].filter(Boolean).join(' '))}</i></td>
          <td>${esc(shorten(r.COLLSITE || '', 26))}</td>
          <td class="num">${esc(LABELS.valueOf(r, 'ACQDATE', I18N.lang))}</td>
          <td class="num">${MANAGE.optNum(r.GP_STOCK) != null ? fmtInt(MANAGE.optNum(r.GP_STOCK)) : ''}</td>
          <td class="num">${MANAGE.optNum(r.GP_GERMPCT) != null ? esc(fmt(MANAGE.optNum(r.GP_GERMPCT), 0) + ' %') : ''}</td>
          <td>${esc(r.DUPLSITE || '—')}</td>
        </tr>`).join('')}
        </tbody></table>`;
      }).join('')}
    </div>`;
  }

  /* ============ arranque ============ */
  /* lo que se guardó de la última vez: encabezado, campos, código y chayote */
  function loadPrefs() {
    view.header = Prefs.get('labelHeader', '') || '';
    const f = Prefs.get('labelFields', null);
    if (Array.isArray(f) && f.length) view.fields = f;
    /* el código y el chayote también se recuerdan entre sesiones */
    const cod = Prefs.get('labelCodigo', null);
    if (cod === 'barras' || cod === 'qr') view.codigo = cod;
    const bar = Prefs.get('labelBarcode', null);
    if (typeof bar === 'boolean') view.barcode = bar;
    const logo = Prefs.get('labelLogo', null);
    if (typeof logo === 'boolean') view.logo = logo;
  }

  function init() {
    if (!el('panel-9')) return;
    loadPrefs();
    run();
    const body = el('b9Body');
    /* el último control con foco dentro del bloque, para devolvérselo al redibujar */
    body.addEventListener('focusin', e => { const k = focusKey(e.target); if (k) lastFocus = k; });
    document.addEventListener('focusin', e => { if (!body.contains(e.target)) lastFocus = null; });
    /* los controles que viven dentro de las hojas de trabajo se enlazan al vuelo */
    body.addEventListener('input', e => {
      if (e.target && e.target.id === 'b9Plants') {
        const v = Number(e.target.value);
        if (!isFinite(v) || String(e.target.value).trim() === '') return;
        view.plants = clamp(v, 10, 500);
        view.plantsEdited = true;
        refreshPreview();
      }
    });
    body.addEventListener('click', e => {
      if (e.target && e.target.id === 'b9SowCSV') gpBusy(e.target, () => {
        const list = LABELS.sowingSheet(rows.map(r => ({ row: r })), { plants: plants(), germ: Prefs.get('calcG', 85) })
          .map(x => Object.assign({}, x, {
            semillas: x.semillas == null ? '' : x.semillas,
            germinacion_supuesta: x.germinacion_supuesta ? T('sí', 'yes') : '',
          }));
        download(IO.toCSV(list, Object.keys(list[0] || { ACCENUMB: '' })), 'lista-de-siembra.csv', 'text/csv;charset=utf-8');
      });
    });
    /* también con Ctrl+P: la hoja de etiquetas se imprime a escala exacta */
    window.addEventListener('beforeprint', () => {
      const p = el('panel-9');
      if (p && p.classList.contains('active') && !el('b9PrintRoot')) preparePrint();
    });
    window.addEventListener('afterprint', endPrint);
  }

  /* hojas con muchas etiquetas (y un código QR o de barras en cada una) se
     arman dentro de la ventana de trabajo */
  function inWork(f) {
    /* la ventana de espera se lleva el foco y, al cerrarse, quiere devolverlo
       al control que ya no existe: se devuelve aquí al que lo sustituyó */
    const key = focusKey(document.activeElement) || lastFocus;
    return gpAfterPaint(() => { f(); }, gpWork('Preparando las etiquetas', 'Preparing the labels')).then(() => backFocus(key, 0));
  }
  function backFocus(key, n) {
    if (!key) return;
    if (document.querySelector('.lfx-layer, .lw-backdrop') && n < 40) { setTimeout(() => backFocus(key, n + 1), 100); return; }
    const cur = document.activeElement;
    if (cur && cur !== document.body && document.body.contains(cur)) return;
    const e = el('b9Body') && el('b9Body').querySelector(key);
    if (e) e.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('stepchange', e => { if (e.detail.step === 9) inWork(run); });
  document.addEventListener('langchange', () => { if (el('panel-9')) run(); });

  window.B9 = { run, view, labelsPreview, workSheet, pickRows, search, preparePrint, endPrint, plants, notes, loadPrefs };
})();
