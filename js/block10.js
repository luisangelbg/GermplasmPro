/* GermplasmPro — Bloque 10: el informe.

   La vista previa no es un dibujo aproximado de lo que se va a descargar: es
   el archivo mismo, metido en un marco. Lo que se ve es lo que se guarda y lo
   que se imprime. */

(function () {

  const view = {
    title: '', bank: '', author: '',
    pick: null,            /* null = todas las secciones */
    figures: true,
    annex: true,
    lang: null,            /* null = el idioma de la app */
  };
  let D = null, html = '';

  /* ============ armar ============ */
  function build(run) {
    D = REPORT.gather({ run: run !== false });
    const lang = view.lang || I18N.lang;
    html = REPORT.buildHTML(D, {
      lang, title: view.title, bank: view.bank, author: view.author,
      pick: view.pick, figures: view.figures, annex: view.annex, dwc: false,
    });
    return html;
  }

  function run() {
    if (!el('panel-10')) return null;
    render();
    return D;
  }

  function render() {
    if (!state.acc.length) {
      el('b10Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      return;
    }
    build(true);
    const lang = view.lang || I18N.lang;
    const hechos = {
      quality: !!D.quality, map: !!D.hasMap, diversity: !!D.diversity,
      gaps: !!D.gaps, charac: !!D.charac, manage: !!D.manage,
      summary: true, passport: true, methods: true, refs: true, annex: true,
    };

    el('b10Body').innerHTML = `
      <h3 class="section-title">${T('1 · Qué lleva el informe', '1 · What goes into the report')}</h3>
      <div class="card">
        <div class="imp-row">
          <label class="inline-label">${T('Título', 'Title')}<input class="inp" id="b10Title" value="${esc(view.title)}"
            data-es-ph="Informe de la colección" data-en-ph="Collection report" style="min-width:220px"></label>
          <label class="inline-label">${T('Banco o institución', 'Genebank or institution')}<input class="inp" id="b10Bank" value="${esc(view.bank)}" style="min-width:200px"></label>
          <label class="inline-label">${T('Quien firma', 'Signed by')}<input class="inp" id="b10Author" value="${esc(view.author)}" style="min-width:170px"></label>
          <label class="inline-label">${T('Idioma del informe', 'Report language')}<select class="sel" id="b10Lang">
            <option value="">${T('el de la app', 'the app\'s')}</option>
            <option value="es"${view.lang === 'es' ? ' selected' : ''}>español</option>
            <option value="en"${view.lang === 'en' ? ' selected' : ''}>English</option>
          </select></label>
        </div>

        <div class="chips" style="margin-top:10px">
          ${REPORT.SECTIONS.map(s => {
            const on = !view.pick || view.pick.includes(s.id);
            const hay = hechos[s.id];
            return `<button class="chip${on && hay ? ' on' : ''}" data-sec="${s.id}"${hay ? '' : ' disabled title="' + esc(T('ese bloque no se ha corrido', 'that block has not been run')) + '"'}>${esc(T(s.es, s.en))}</button>`;
          }).join('')}
          <button class="chip${view.figures ? ' on' : ''}" id="b10Figs">${T('figuras', 'figures')}</button>
        </div>

        <div class="imp-row" style="margin-top:12px">
          <button class="btn btn-primary btn-sm" id="b10Print">${T('Imprimir o guardar en PDF', 'Print or save as PDF')}</button>
          <button class="btn btn-ghost btn-sm" id="b10HTML">${T('Descargar el informe (HTML)', 'Download the report (HTML)')}</button>
          <button class="btn btn-ghost btn-sm" id="b10Zip">${T('Descargar todo (ZIP)', 'Download everything (ZIP)')}</button>
          <button class="btn btn-ghost btn-sm" id="b10Dwc">${T('Pasaporte en Darwin Core', 'Passport in Darwin Core')}</button>
          <button class="btn btn-ghost btn-sm" id="b10Mcpd">${T('Pasaporte en MCPD', 'Passport in MCPD')}</button>
          <span class="hint" id="b10Msg"></span>
        </div>
      </div>

      <h3 class="section-title">${T('2 · El informe, tal como sale', '2 · The report, as it comes out')}</h3>
      <div class="rep-frame"><iframe id="b10Frame" title="${esc(T('vista previa del informe', 'report preview'))}"></iframe></div>`;

    paint();

    el('b10Title').addEventListener('input', () => { view.title = el('b10Title').value; Prefs.set('repTitle', view.title); refresh(); });
    el('b10Bank').addEventListener('input', () => { view.bank = el('b10Bank').value; Prefs.set('repBank', view.bank); refresh(); });
    el('b10Author').addEventListener('input', () => { view.author = el('b10Author').value; Prefs.set('repAuthor', view.author); refresh(); });
    el('b10Lang').addEventListener('change', () => { view.lang = el('b10Lang').value || null; inWork(render); });
    el('b10Figs').addEventListener('click', () => { view.figures = !view.figures; inWork(render); });
    els('[data-sec]', el('b10Body')).forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      const all = REPORT.SECTIONS.filter(s => hechos[s.id]).map(s => s.id);
      const cur = view.pick ? view.pick.slice() : all.slice();
      const i = cur.indexOf(b.dataset.sec);
      if (i >= 0) cur.splice(i, 1); else cur.push(b.dataset.sec);
      view.pick = cur.length === all.length ? null : cur;
      view.annex = !view.pick || view.pick.includes('annex');
      inWork(render);
    }));
    el('b10Print').addEventListener('click', printReport);
    el('b10HTML').addEventListener('click', e => gpBusy(e.currentTarget, () => {
      download(html, fileName('informe', 'html'), 'text/html;charset=utf-8');
      say(T('Informe descargado.', 'Report downloaded.'));
    }));
    el('b10Zip').addEventListener('click', e => gpBusy(e.currentTarget, downloadZip));
    el('b10Dwc').addEventListener('click', e => gpBusy(e.currentTarget, () => {
      const rows = REPORT.darwinCore(state.acc);
      download(IO.toCSV(rows, REPORT.DWC_COLUMNS), fileName('darwin-core', 'csv'), 'text/csv;charset=utf-8');
      say(T(`${rows.length} registros en Darwin Core.`, `${rows.length} records in Darwin Core.`));
    }));
    el('b10Mcpd').addEventListener('click', e => gpBusy(e.currentTarget, () => {
      const cols = MCPD.MCPD_FIELDS.map(f => f.k);
      download(IO.toCSV(state.acc, cols), fileName('pasaporte-mcpd', 'csv'), 'text/csv;charset=utf-8');
      say(T(`${state.acc.length} accesiones en MCPD v2.1.`, `${state.acc.length} accessions in MCPD v2.1.`));
    }));
    I18N.apply(el('b10Body'));
  }

  /* vuelve a armar el documento sin rehacer los análisis */
  function refresh() {
    build(false);
    paint();
  }
  function paint() {
    const f = el('b10Frame');
    if (!f) return;
    f.srcdoc = html;
    f.onload = () => {
      try {
        const doc = f.contentDocument;
        f.style.height = Math.max(400, doc.documentElement.scrollHeight + 24) + 'px';
      } catch (e) { f.style.height = '900px'; }
    };
  }
  function say(msg) {
    const n = el('b10Msg');
    if (!n) return;
    n.textContent = msg;
    setTimeout(() => { if (n.textContent === msg) n.textContent = ''; }, 4000);
  }
  function fileName(base, ext) {
    const d = D && D.date ? D.date : new Date();
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${base}-${s}.${ext}`;
  }

  /* Imprime el marco, no la página: así sale el informe solo, sin la app.
     Abriendo el archivo con doble clic (file://) el navegador puede negarle al
     documento de arriba el permiso de tocar el de adentro; en ese caso el
     informe se abre en una pestaña aparte y se imprime desde ahí, que para
     quien lo usa da lo mismo. */
  function printReport() {
    const f = el('b10Frame');
    try {
      if (!f || !f.contentWindow) throw new Error('sin marco');
      f.contentWindow.focus();
      f.contentWindow.print();
      return;
    } catch (e) { /* abajo va el camino alterno */ }
    const w = window.open('', '_blank');
    if (!w) {
      say(T('El navegador bloqueó la ventana; descarga el informe y ábrelo con doble clic.',
        'The browser blocked the window; download the report and open it with a double click.'));
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  /* ============ el paquete completo ============ */
  async function downloadZip() {
    say(T('Armando el paquete…', 'Building the package…'));
    const files = [{ name: 'informe.html', data: html }];
    const cols = MCPD.MCPD_FIELDS.map(f => f.k);
    files.push({ name: 'datos/pasaporte-mcpd.csv', data: IO.toCSV(state.acc, cols) });
    files.push({ name: 'datos/pasaporte-completo.csv', data: IO.toCSV(state.acc, MCPD.FIELDS.map(f => f.k)) });
    files.push({ name: 'datos/darwin-core.csv', data: IO.toCSV(REPORT.darwinCore(state.acc), REPORT.DWC_COLUMNS) });

    if (D.quality) {
      const q = D.quality, filas = [];
      q.geo.forEach(p => filas.push({ tipo: 'geografia', nivel: p.level, accesion: state.acc[p.i].ACCENUMB, campo: p.field, detalle: p.msg.es }));
      q.consistency.forEach(c => filas.push({ tipo: 'consistencia', nivel: c.level, accesion: c.items.map(i => state.acc[i].ACCENUMB).join(' '), campo: c.code, detalle: c.msg.es }));
      q.dup.pairs.forEach(p => filas.push({
        tipo: 'duplicado', nivel: String(Math.round(p.score)),
        accesion: `${state.acc[p.i].ACCENUMB} + ${state.acc[p.j].ACCENUMB}`,
        campo: p.dist != null ? `${fmt(p.dist, 1)} km` : '', detalle: p.reasons.map(r => r.es).join('; '),
      }));
      if (filas.length) files.push({ name: 'datos/calidad.csv', data: IO.toCSV(filas, ['tipo', 'nivel', 'accesion', 'campo', 'detalle']) });
    }
    if (D.manage) {
      const plan = [];
      D.manage.lots.forEach(l => l.st.alerts.forEach(a => plan.push({
        accesion: l.row.ACCENUMB, taxon: MANAGE.taxonOf(l.row), ruta: l.st.route,
        nivel: a.level, alerta: a.code, detalle: a.msg.es,
      })));
      if (plan.length) files.push({ name: 'datos/plan-de-trabajo.csv', data: IO.toCSV(plan, ['accesion', 'taxon', 'ruta', 'nivel', 'alerta', 'detalle']) });
    }

    /* las figuras, sueltas y en SVG, para meterlas en otro documento */
    if (view.figures) {
      const W = 900;
      const add = (name, fn, h) => {
        const svg = REPORT.inLight(() => REPORT.figure(fn, W, h));
        if (svg) files.push({ name: `figuras/${name}.svg`, data: svg });
      };
      if (D.hasMap) add('mapa-de-colecta', B4.drawMap, 560);
      if (D.diversity) { add('curva-de-acumulacion', B5.curvePlot, 300); add('mapa-de-diversidad', B5.indexMap, 560); }
      if (D.gaps) { add('vacios-de-colecta', B6.gapMap, 560); add('curva-de-complementariedad', B6.compCurve, 300); }
      if (D.charac) { add('coordenadas-principales', B7.pcoaPlot, 400); add('dendrograma', B7.dendroPlot, 500); }
      if (D.manage) add('carga-de-trabajo', B8.workPlot, 280);
    }

    files.push({ name: 'LEEME.txt', data: leeme(files) });

    const blob = await ZIP.build(files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName('germplasmpro', 'zip');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    say(T(`${files.length} archivos en el paquete.`, `${files.length} files in the package.`));
  }

  function leeme(files) {
    const d = (D && D.date ? D.date : new Date()).toLocaleString('es-MX');
    return `GermplasmPro — paquete de la colección
Generado el ${d} con ${state.acc.length} accesiones.

Qué trae:

  informe.html          el informe completo; se abre con doble clic en cualquier navegador
  datos/                el pasaporte en los dos formatos estándar y las tablas de trabajo
  figuras/              cada figura suelta en SVG, para meterla en otro documento

Sobre los dos formatos del pasaporte:

  pasaporte-mcpd.csv    los 42 descriptores multicultivo de pasaporte (MCPD v2.1) tal cual,
                        que es el formato con el que hablan los bancos entre sí.
  pasaporte-completo.csv lo mismo más los siete campos de extensión de esta app (GP_*), que
                        guardan la ruta de conservación activa, el sitio in situ, la persona
                        custodia, las existencias y las fechas de germinación y regeneración.
  darwin-core.csv       la traducción a los términos de Darwin Core, que es como habla GBIF.
                        Lo que MCPD guarda y Darwin Core no tiene dónde poner (SAMPSTAT,
                        STORAGE, MLSSTAT, DUPLSITE y los GP_*) no se pierde: viaja en la
                        columna dynamicProperties, con su nombre original. Entre las columnas de
                        Darwin Core y esa, está el pasaporte completo: no se pierde ni un campo.

Archivos: ${files.length}.
Todo se calculó en tu navegador; nada de esto salió de tu computadora.
`;
  }

  /* ============ arranque ============ */
  function init() {
    if (!el('panel-10')) return;
    view.title = Prefs.get('repTitle', '') || '';
    view.bank = Prefs.get('repBank', '') || '';
    view.author = Prefs.get('repAuthor', '') || '';
  }

  document.addEventListener('DOMContentLoaded', init);
  /* rehacer el informe vuelve a correr los análisis de los bloques 3 a 9:
     desde la interfaz va en la ventana de trabajo */
  function inWork(f) {
    return gpAfterPaint(() => { f(); }, gpWork('Armando el informe', 'Building the report'));
  }

  document.addEventListener('stepchange', e => { if (e.detail.step === 10) inWork(run); });
  document.addEventListener('langchange', () => { if (el('panel-10') && el('b10Body') && el('b10Body').children.length) run(); });

  window.B10 = { run, build, view, data: () => D, htmlOf: () => html, downloadZip, leeme };
})();
