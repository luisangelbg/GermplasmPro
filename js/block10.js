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
      pick: view.pick, figures: view.figures, annex: view.annex,
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
            const hay = hechos[s.id];
            /* las secciones «always» (resumen, la colección, métodos y
               referencias) van siempre: su botón se ve encendido y no se apaga */
            const on = hay && (s.always || !view.pick || view.pick.includes(s.id));
            const why = !hay ? T('ese bloque no se ha corrido', 'that block has not been run')
              : s.always ? T('esta sección va siempre en el informe', 'this section is always in the report') : '';
            return `<button class="chip${on ? ' on' : ''}" data-sec="${s.id}" aria-pressed="${on}"${s.always && hay ? ' aria-disabled="true"' : ''}${hay ? '' : ' disabled'}${why ? ` title="${esc(why)}"` : ''}>${esc(T(s.es, s.en))}</button>`;
          }).join('')}
          <button class="chip${view.figures ? ' on' : ''}" id="b10Figs" aria-pressed="${view.figures}">${T('figuras', 'figures')}</button>
        </div>

        <div class="imp-row" style="margin-top:12px">
          <button class="btn btn-primary btn-sm" id="b10Print">${T('Imprimir o guardar en PDF', 'Print or save as PDF')}</button>
          <button class="btn btn-ghost btn-sm" id="b10HTML">${T('Descargar el informe (HTML)', 'Download the report (HTML)')}</button>
          <button class="btn btn-ghost btn-sm" id="b10Zip">${T('Descargar todo (ZIP)', 'Download everything (ZIP)')}</button>
          <button class="btn btn-ghost btn-sm" id="b10Dwc">${T('Pasaporte en Darwin Core', 'Passport in Darwin Core')}</button>
          <button class="btn btn-ghost btn-sm" id="b10Mcpd">${T('Pasaporte en MCPD', 'Passport in MCPD')}</button>
          <span class="hint" id="b10Msg" role="status" aria-live="polite"></span>
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
      const sec = REPORT.SECTIONS.find(s => s.id === b.dataset.sec);
      if (!sec || sec.always) return;
      const all = REPORT.SECTIONS.filter(s => hechos[s.id]).map(s => s.id);
      const cur = view.pick ? view.pick.slice() : all.slice();
      const i = cur.indexOf(b.dataset.sec);
      if (i >= 0) cur.splice(i, 1); else cur.push(b.dataset.sec);
      REPORT.SECTIONS.forEach(s => { if (s.always && !cur.includes(s.id)) cur.push(s.id); });
      view.pick = cur.length === all.length ? null : cur;
      view.annex = !view.pick || view.pick.includes('annex');
      inWork(render);
    }));
    el('b10Print').addEventListener('click', printReport);
    el('b10HTML').addEventListener('click', e => gpBusy(e.currentTarget, () => {
      download(html, fileName(T('informe', 'report'), 'html'), 'text/html;charset=utf-8');
      say(T('Informe descargado.', 'Report downloaded.'));
    }));
    el('b10Zip').addEventListener('click', e => gpBusy(e.currentTarget, downloadZip));
    el('b10Dwc').addEventListener('click', e => gpBusy(e.currentTarget, () => {
      const rows = REPORT.darwinCore(state.acc, view.lang || I18N.lang);
      download(IO.toCSV(rows, REPORT.DWC_COLUMNS), fileName('darwin-core', 'csv'), 'text/csv;charset=utf-8');
      say(T(`${rows.length} registros en Darwin Core.`, `${rows.length} records in Darwin Core.`));
    }));
    el('b10Mcpd').addEventListener('click', e => gpBusy(e.currentTarget, () => {
      const cols = MCPD.MCPD_FIELDS.map(f => f.k);
      download(IO.toCSV(state.acc, cols), fileName(T('pasaporte-mcpd', 'passport-mcpd'), 'csv'), 'text/csv;charset=utf-8');
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

  /* datos/calidad.csv es el mismo archivo que «Descargar el informe» del
     Bloque 3 (informe-calidad.csv): sale de la misma función, con las
     correcciones propuestas y los avisos del pasaporte. Sin filas, no va.
     Con el informe en inglés, en inglés (data/quality.csv). */
  function qualityCSV(D, lang) {
    if (!D || !D.quality || !window.B3 || !B3.qualityRows) return null;
    const rows = B3.qualityRows(D.quality, D.rows || state.acc, D.issues || [], lang);
    return rows.length ? B3.qualityCSV(D.quality, D.rows || state.acc, D.issues || [], lang) : null;
  }

  /* los nombres de los archivos y carpetas del paquete, en el idioma del informe */
  const ZIP_NAMES = {
    es: { report: 'informe.html', data: 'datos/', figs: 'figuras/', mcpd: 'pasaporte-mcpd.csv', full: 'pasaporte-completo.csv',
      dwc: 'darwin-core.csv', quality: 'calidad.csv', plan: 'plan-de-trabajo.csv', readme: 'LEEME.txt',
      fig: { map: 'mapa-de-colecta', curve: 'curva-de-acumulacion', divmap: 'mapa-de-diversidad', gaps: 'vacios-de-colecta',
        comp: 'curva-de-complementariedad', pcoa: 'coordenadas-principales', dendro: 'dendrograma', work: 'carga-de-trabajo' } },
    en: { report: 'report.html', data: 'data/', figs: 'figures/', mcpd: 'passport-mcpd.csv', full: 'passport-full.csv',
      dwc: 'darwin-core.csv', quality: 'quality.csv', plan: 'work-plan.csv', readme: 'README.txt',
      fig: { map: 'collecting-map', curve: 'accumulation-curve', divmap: 'diversity-map', gaps: 'collecting-gaps',
        comp: 'complementarity-curve', pcoa: 'principal-coordinates', dendro: 'dendrogram', work: 'workload' } },
  };
  const PLAN_COLS = { es: ['accesion', 'taxon', 'ruta', 'nivel', 'alerta', 'detalle'], en: ['accession', 'taxon', 'route', 'level', 'alert', 'detail'] };

  /* ============ el paquete completo ============ */
  /* la lista de archivos del paquete, sin comprimir (las pruebas la leen tal cual) */
  function zipFiles() {
    const lang = view.lang || I18N.lang, en = lang === 'en', N = ZIP_NAMES[en ? 'en' : 'es'];
    const files = [{ name: N.report, data: html }];
    const cols = MCPD.MCPD_FIELDS.map(f => f.k);
    files.push({ name: N.data + N.mcpd, data: IO.toCSV(state.acc, cols) });
    files.push({ name: N.data + N.full, data: IO.toCSV(state.acc, MCPD.FIELDS.map(f => f.k)) });
    files.push({ name: N.data + N.dwc, data: IO.toCSV(REPORT.darwinCore(state.acc, lang), REPORT.DWC_COLUMNS) });

    const cal = qualityCSV(D, lang);
    if (cal) files.push({ name: N.data + N.quality, data: cal });
    if (D.manage) {
      const plan = [];
      const [c0, c1, c2, c3, c4, c5] = PLAN_COLS[en ? 'en' : 'es'];
      D.manage.lots.forEach(l => l.st.alerts.forEach(a => plan.push({
        [c0]: l.row.ACCENUMB, [c1]: MANAGE.taxonOf(l.row), [c2]: l.st.route,
        [c3]: a.level, [c4]: a.code, [c5]: en ? (a.msg.en ?? a.msg.es) : a.msg.es,
      })));
      if (plan.length) files.push({ name: N.data + N.plan, data: IO.toCSV(plan, PLAN_COLS[en ? 'en' : 'es']) });
    }

    /* las figuras, sueltas y en SVG, para meterlas en otro documento: en el
       idioma del informe, y sólo el <svg> (la leyenda en HTML de algunas no
       es SVG y dejaría el archivo inservible) */
    if (view.figures) {
      const W = 900;
      const add = (k, fn, h) => {
        const svg = REPORT.svgOnly(REPORT.inLang(lang, () => REPORT.inLight(() => REPORT.figure(fn, W, h))));
        if (svg) files.push({ name: `${N.figs}${N.fig[k]}.svg`, data: svg });
      };
      if (D.hasMap) add('map', B4.drawMap, 560);
      if (D.diversity) { add('curve', B5.curvePlot, 300); add('divmap', B5.indexMap, 560); }
      if (D.gaps) { add('gaps', B6.gapMap, 560); add('comp', B6.compCurve, 300); }
      if (D.charac) { add('pcoa', B7.pcoaPlot, 400); add('dendro', B7.dendroPlot, 500); }
      if (D.manage) add('work', B8.workPlot, 280);
    }

    files.push({ name: N.readme, data: leeme(files, lang) });
    return files;
  }
  async function downloadZip() {
    say(T('Armando el paquete…', 'Building the package…'));
    const files = zipFiles();
    const blob = await ZIP.build(files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName('germplasmpro', 'zip');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    say(T(`${files.length} archivos en el paquete.`, `${files.length} files in the package.`));
  }

  /* el LEEME.txt (README.txt con el informe en inglés) */
  function leeme(files, lang) {
    const date = D && D.date ? D.date : new Date();
    if ((lang || view.lang || I18N.lang) === 'en') {
      const d = `${LABELS.fmtDate(date, 'en')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      return `GermplasmPro — collection package
Generated on ${d} with ${state.acc.length} accessions.

What it contains:

  report.html           the full report; it opens with a double click in any browser
  data/                 the passport in the two standard formats and the working tables
  figures/              each figure on its own as SVG, to drop into another document

About the two passport formats:

  passport-mcpd.csv     the 42 multi-crop passport descriptors (MCPD v2.1) as they are,
                        the format genebanks use to talk to each other.
  passport-full.csv     the same plus this app's seven extension fields (GP_*), which
                        keep the active conservation route, the in-situ site, the custodian,
                        the stock, the percentage of the last germination test and
                        the dates of the last germination test and the last regeneration.
  darwin-core.csv       the translation into Darwin Core terms, the language GBIF speaks.
                        What MCPD keeps and Darwin Core has no place for (SAMPSTAT,
                        STORAGE, MLSSTAT, DUPLSITE and the GP_* fields) is not lost: it travels
                        in the dynamicProperties column, under its original name. Between the
                        Darwin Core columns and that one, the whole passport is there: not a
                        single field is lost.

Files: ${files.length}.
Everything was computed in your browser; none of this left your computer.
`;
    }
    const d = date.toLocaleString('es-MX');
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
                        custodia, las existencias, el porcentaje de la última germinación y
                        las fechas de la última germinación y la última regeneración.
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

  window.B10 = { run, build, view, data: () => D, htmlOf: () => html, downloadZip, zipFiles, leeme, qualityCSV, ZIP_NAMES };
})();
