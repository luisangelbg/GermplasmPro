/* GermplasmPro — Bloque 8: el manejo del banco.

   Lo que hay que hacer esta temporada, accesión por accesión, y con qué
   números respaldarlo:
     1. El tablero: cuántos lotes están al día, cuántos piden atención y
        cuántos están en apuros.
     2. Las condiciones del banco y las constantes de viabilidad, que son los
        supuestos con los que se hacen todas las cuentas.
     3. La lista de tareas, ordenada por urgencia, con el botón para registrar
        la prueba de germinación o la regeneración cuando se hagan.
     4. Las calculadoras: cuántas plantas hacen falta para regenerar sin perder
        los alelos raros y cuántas semillas hay que sembrar para lograrlas.
     5. La carga de trabajo de los próximos veinticinco años. */

(function () {

  const view = { filter: 'all', route: '', sort: 'score', horizon: 25 };
  let cfg = null, viab = null, A = null;

  const cv = n => B4.paint(n);   /* referencias al tema: la figura cambia sola con él */

  function loadCfg() {
    cfg = MANAGE.config(Prefs.get('bankConfig', null));
    viab = MANAGE.viabilityTable(Prefs.get('viability', null));
  }
  function saveCfg() {
    Prefs.set('bankConfig', cfg);
    const custom = {};
    Object.keys(viab).forEach(k => { if (k !== 'Zea mays') custom[k] = viab[k]; });
    Prefs.set('viability', custom);
  }

  function run() {
    if (!cfg) loadCfg();
    A = state.acc.length ? MANAGE.analyse(state.acc, cfg, viab) : null;
    if (el('panel-8')) render();
    return A;
  }

  const LEVELS = {
    crit: { es: 'en apuros', en: 'in trouble', c: 'bad' },
    warn: { es: 'pide atención', en: 'needs attention', c: 'warn' },
    info: { es: 'falta un dato', en: 'a datum is missing', c: 'new' },
    ok: { es: 'al día', en: 'up to date', c: 'ok' },
  };

  function render() {
    if (!state.acc.length) {
      el('b8Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      el('b8Stats').innerHTML = '';
      return;
    }
    const n = A.lots.length;
    const crit = A.byLevel.crit.length, warn = A.byLevel.warn.length;
    const stockTotal = A.lots.reduce((a, l) => a + (isFinite(l.st.stock) ? l.st.stock : 0), 0);
    const sinRespaldo = A.lots.filter(l => l.st.alerts.some(x => x.code === 'noBackup')).length;
    const proyectables = A.lots.filter(l => l.st.projected != null).length;

    el('b8Stats').innerHTML = [
      { k: T('Lotes en apuros', 'Lots in trouble'), v: fmtInt(crit), d: T('piden acción esta temporada', 'need action this season'), c: crit ? 'var(--danger)' : 'var(--s3)' },
      { k: T('Piden atención', 'Need attention'), v: fmtInt(warn), d: T('prueba vencida, poco stock o sin respaldo', 'test due, low stock or no backup'), c: warn ? 'var(--stWarn)' : 'var(--s3)' },
      { k: T('Al día', 'Up to date'), v: fmtInt(A.byLevel.ok.length), d: T(`de ${n} accesiones`, `of ${n} accessions`), c: 'var(--s3)' },
      { k: T('Con proyección de viabilidad', 'With viability projection'), v: fmtInt(proyectables), d: T('el resto no tiene constantes o prueba', 'the rest lack constants or a test'), c: 'var(--s1)' },
      { k: T('Sin duplicado de seguridad', 'Without safety duplicate'), v: fmtInt(sinRespaldo), d: T('dependen de una sola instalación', 'depend on a single facility'), c: sinRespaldo ? 'var(--stWarn)' : 'var(--s3)' },
      { k: T('Existencias registradas', 'Recorded stock'), v: fmtInt(stockTotal), d: T('semillas, plantas, frascos o criotubos', 'seeds, plants, jars or cryovials'), c: 'var(--s6)' },
    ].map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');

    /* --- lista de tareas --- */
    let lots = A.lots.slice();
    if (view.filter !== 'all') lots = lots.filter(l => l.st.levelName === view.filter);
    if (view.route) lots = lots.filter(l => l.st.route === view.route);
    lots.sort((a, b) => view.sort === 'score' ? b.st.score - a.st.score || b.st.level - a.st.level
      : String(a.row.ACCENUMB).localeCompare(String(b.row.ACCENUMB), 'es'));

    const routeName = c => { const h = MCPD.GPCONS.find(x => x.c === c); return h ? T(h.es, h.en) : T('sin declarar', 'not declared'); };

    el('b8Body').innerHTML = `
      <h3 class="section-title">${T('1 · Los supuestos con los que se hacen las cuentas', '1 · The assumptions behind every figure')}</h3>
      <p class="section-sub">${T(
        'Las condiciones de tu cámara y los intervalos de trabajo del banco. Todo lo que ves más abajo sale de aquí, así que vale la pena que reflejen la realidad de tu instalación y no un valor de catálogo.',
        'Your store conditions and the genebank working intervals. Everything below follows from these, so it is worth making them reflect your actual facility rather than a catalogue value.')}</p>
      <div class="card"><div class="field-grid">
        ${[['seed', 'temp', T('Temperatura de la cámara (°C)', 'Store temperature (°C)'), -20, 25, 1],
           ['seed', 'moisture', T('Humedad de la semilla (%)', 'Seed moisture (%)'), 3, 14, 0.5],
           ['seed', 'threshold', T('Umbral de regeneración (%)', 'Regeneration threshold (%)'), 50, 95, 5],
           ['seed', 'testInterval', T('Años entre pruebas de germinación', 'Years between germination tests'), 1, 20, 1],
           ['seed', 'minStock', T('Mínimo de semillas en el frasco', 'Minimum seeds in the jar'), 50, 2000, 50],
           ['seed', 'regenPlants', T('Plantas por regeneración', 'Plants per regeneration'), 20, 300, 10],
           ['field', 'cycle', T('Años entre resiembras (campo)', 'Years between replantings (field)'), 1, 30, 1],
           ['invitro', 'subMonths', T('Meses entre subcultivos', 'Months between subcultures'), 2, 24, 1]].map(([grp, k, lab, mn, mx, stp]) => `
          <div class="slider-row"><label>${esc(lab)}</label>
            <input type="range" data-cfg="${grp}.${k}" min="${mn}" max="${mx}" step="${stp}" value="${cfg[grp][k]}">
            <span class="range-val">${cfg[grp][k]}</span></div>`).join('')}
      </div>
      <div class="imp-row" style="margin-top:10px">
        <span class="hint">${T('Constantes de viabilidad cargadas:', 'Viability constants loaded:')} <b>${Object.keys(viab).length}</b> ${T('taxones', 'taxa')} — ${esc(Object.keys(viab).slice(0, 4).join(', '))}</span>
        <button class="btn btn-secondary btn-sm" id="b8AddK">${T('Añadir constantes de una especie', 'Add constants for a species')}</button>
      </div>
      <p class="hint" style="margin-bottom:0">${T(
        'Sin constantes para una especie, la app no proyecta su viabilidad: te dice la fecha de la última prueba y nada más. Es preferible a inventar un número. Las del maíz vienen publicadas; las demás tómalas de la Seed Information Database de Kew y anótalas con su fuente.',
        'Without constants for a species, the app does not project its viability: it gives you the date of the last test and nothing else. That is better than making a number up. The maize ones are published; take the others from Kew’s Seed Information Database and record them with their source.')}</p>
      </div>

      <h3 class="section-title">${T('2 · Qué hay que hacer', '2 · What needs doing')}</h3>
      <div class="card">
        <div class="imp-row">
          <label class="inline-label">${T('Mostrar', 'Show')}<select class="sel" id="b8Filter">
            ${[['all', T('todo', 'everything')], ['crit', T('en apuros', 'in trouble')], ['warn', T('piden atención', 'need attention')], ['info', T('faltan datos', 'missing data')], ['ok', T('al día', 'up to date')]]
              .map(([v2, t2]) => `<option value="${v2}"${view.filter === v2 ? ' selected' : ''}>${esc(t2)}</option>`).join('')}
          </select></label>
          <label class="inline-label">${T('Ruta', 'Route')}<select class="sel" id="b8Route">
            <option value="">${T('todas', 'all')}</option>
            ${A.byRoute.map(r => `<option value="${esc(r.route)}"${view.route === r.route ? ' selected' : ''}>${esc(routeName(r.route))} (${r.n})</option>`).join('')}
          </select></label>
          <button class="btn btn-secondary btn-sm" id="b8Plan">${T('Plan de trabajo en CSV', 'Work plan as CSV')}</button>
        </div>
        <div class="table-wrap" style="max-height:520px;overflow:auto;margin-top:10px">
          <table class="tbl"><thead><tr>
            <th>${T('Accesión', 'Accession')}</th><th>${T('Ruta', 'Route')}</th>
            <th class="num">${T('Existencias', 'Stock')}</th><th class="num">${T('Germinación', 'Germination')}</th>
            <th>${T('Qué pasa', 'What is going on')}</th><th></th>
          </tr></thead><tbody>
          ${lots.slice(0, 200).map(l => {
            const st = l.st;
            const lv = LEVELS[st.levelName];
            const germ = isFinite(st.germ)
              ? `${fmt(st.germ, 0)} %${st.projected != null ? ` <span class="muted">→ ${fmt(st.projected, 0)} %</span>` : ''}`
              : '—';
            return `<tr>
              <td><b class="mono">${esc(l.row.ACCENUMB || '')}</b><div class="hint">${esc(String(l.row.ACCENAME || '').slice(0, 24))}</div></td>
              <td><span class="tag ${lv.c}">${esc(routeName(st.route))}</span></td>
              <td class="num">${isFinite(st.stock) ? fmtInt(st.stock) : '—'}</td>
              <td class="num">${germ}<div class="hint">${st.yearsSinceTest != null ? T(`hace ${fmt(st.yearsSinceTest, 1)} a`, `${fmt(st.yearsSinceTest, 1)} y ago`) : ''}</div></td>
              <td>${st.alerts.length
                ? st.alerts.map(a => `<div class="alert-line ${a.level}">${esc(T(a.msg.es, a.msg.en))}</div>`).join('')
                : `<span class="tag ok">${T('al día', 'up to date')}</span>`}</td>
              <td class="qc-act">
                <button class="btn btn-ghost btn-sm" data-test="${l.i}">${T('Registrar prueba', 'Record test')}</button>
                ${['seed', 'field', 'invitro'].includes(st.route) ? `<button class="btn btn-ghost btn-sm" data-regen="${l.i}">${st.route === 'invitro' ? T('Subcultivo', 'Subculture') : T('Regeneración', 'Regeneration')}</button>` : ''}
              </td>
            </tr>`;
          }).join('')}
          </tbody></table>
        </div>
        ${lots.length > 200 ? `<p class="hint">${T(`Se muestran las primeras 200 de ${lots.length}.`, `Showing the first 200 of ${lots.length}.`)}</p>` : ''}
      </div>

      <h3 class="section-title">${T('3 · Cuántas plantas y cuántas semillas', '3 · How many plants and how many seeds')}</h3>
      <p class="section-sub">${T(
        'Regenerar con pocas plantas es la forma más rápida de perder los alelos raros, que son justamente los que hacen valiosa a una población. La cuenta es directa: con n plantas de una especie alógama se muestrean 2n gametos, así que la probabilidad de conservar un alelo de frecuencia p es 1 − (1 − p)²ⁿ. Ajusta la frecuencia que quieras proteger y la seguridad con la que quieres hacerlo.',
        'Regenerating with few plants is the fastest way to lose rare alleles, which are exactly what makes a population valuable. The arithmetic is direct: n plants of an outcrossing species sample 2n gametes, so the probability of keeping an allele of frequency p is 1 − (1 − p)²ⁿ. Set the frequency you want to protect and how sure you want to be.')}</p>
      <div class="card"><div class="sum-grid">
        <div class="pg-pane"><div class="pg-title">${T('Plantas necesarias', 'Plants needed')}</div>
          <div class="field-grid">
            <div class="slider-row"><label>${T('Frecuencia del alelo a conservar', 'Frequency of the allele to keep')}</label>
              <input type="range" id="b8p" min="1" max="20" step="1" value="${Prefs.get('calcP', 5)}"><span class="range-val" id="b8pv">${Prefs.get('calcP', 5)} %</span></div>
            <div class="slider-row"><label>${T('Seguridad deseada', 'Desired certainty')}</label>
              <input type="range" id="b8P" min="80" max="99" step="1" value="${Prefs.get('calcPP', 95)}"><span class="range-val" id="b8Pv">${Prefs.get('calcPP', 95)} %</span></div>
            <div class="slider-row"><label>${T('Germinación del lote (%)', 'Lot germination (%)')}</label>
              <input type="range" id="b8g" min="20" max="100" step="5" value="${Prefs.get('calcG', 85)}"><span class="range-val" id="b8gv">${Prefs.get('calcG', 85)} %</span></div>
          </div>
          <div id="b8Calc" class="calc-out"></div>
        </div>
        <div class="pg-pane"><div class="pg-title">${T('Carga de trabajo de los próximos 25 años', 'Workload for the next 25 years')}</div>
          ${workPlot(520, 300)}
          <p class="hint">${T(
            'Pruebas de germinación y regeneraciones que tocarían cada año si se mantienen los intervalos de arriba. Los picos son los que hay que repartir: si un año se junta el trabajo de veinte lotes, conviene adelantar o atrasar algunos.',
            'Germination tests and regenerations that would fall due each year if the intervals above are kept. The peaks are what needs spreading out: if twenty lots pile up in one year, some are better brought forward or pushed back.')}</p>
        </div>
      </div></div>

      <h3 class="section-title">${T('4 · El banco por rutas', '4 · The genebank by route')}</h3>
      <div class="card"><div class="table-wrap"><table class="tbl"><thead><tr>
        <th>${T('Ruta', 'Route')}</th><th class="num">${T('Accesiones', 'Accessions')}</th>
        <th class="num">${T('En apuros', 'In trouble')}</th><th class="num">${T('Piden atención', 'Need attention')}</th>
        <th class="num">${T('Existencias', 'Stock')}</th>
      </tr></thead><tbody>
        ${A.byRoute.map(r => `<tr>
          <td>${esc(routeName(r.route))}</td><td class="num">${r.n}</td>
          <td class="num">${r.crit ? `<span class="tag bad">${r.crit}</span>` : '0'}</td>
          <td class="num">${r.warn ? `<span class="tag warn">${r.warn}</span>` : '0'}</td>
          <td class="num">${fmtInt(r.stock)}</td>
        </tr>`).join('')}
      </tbody></table></div></div>`;

    /* eventos */
    els('[data-cfg]', el('b8Body')).forEach(s => {
      s.addEventListener('input', () => { s.nextElementSibling.textContent = s.value; });
      s.addEventListener('change', () => {
        const [g, k] = s.dataset.cfg.split('.');
        cfg[g][k] = Number(s.value);
        saveCfg(); run();
      });
    });
    ['b8Filter', 'b8Route'].forEach(id => {
      const nEl = el(id);
      if (nEl) nEl.addEventListener('change', () => {
        if (id === 'b8Filter') view.filter = nEl.value; else view.route = nEl.value;
        render();
      });
    });
    el('b8Plan').addEventListener('click', exportPlan);
    el('b8AddK').addEventListener('click', addConstants);
    els('[data-test]', el('b8Body')).forEach(b => b.addEventListener('click', () => recordTest(Number(b.dataset.test))));
    els('[data-regen]', el('b8Body')).forEach(b => b.addEventListener('click', () => recordRegen(Number(b.dataset.regen))));
    ['b8p', 'b8P', 'b8g'].forEach(id => {
      const s = el(id);
      if (s) s.addEventListener('input', () => { updateCalc(); });
    });
    updateCalc();
  }

  /* ---------- calculadora de tamaño de muestra ---------- */
  function updateCalc() {
    const p = Number(el('b8p').value) / 100, P = Number(el('b8P').value) / 100, g = Number(el('b8g').value);
    el('b8pv').textContent = el('b8p').value + ' %';
    el('b8Pv').textContent = el('b8P').value + ' %';
    el('b8gv').textContent = el('b8g').value + ' %';
    Prefs.set('calcP', Number(el('b8p').value));
    Prefs.set('calcPP', Number(el('b8P').value));
    Prefs.set('calcG', g);
    const alo = MANAGE.plantsNeeded(p, P, true), auto = MANAGE.plantsNeeded(p, P, false);
    const semAlo = MANAGE.seedsToSow(alo, g), semAuto = MANAGE.seedsToSow(auto, g);
    const conFAO = MANAGE.retentionProb(p, 100, true);
    el('b8Calc').innerHTML = `
      <table class="tbl"><tbody>
        <tr><td>${T('Especie alógama (polinización cruzada)', 'Outcrossing species')}</td>
          <td class="num"><b>${fmtInt(alo)}</b> ${T('plantas', 'plants')}</td>
          <td class="num">${fmtInt(semAlo)} ${T('semillas a sembrar', 'seeds to sow')}</td></tr>
        <tr><td>${T('Especie autógama', 'Self-pollinating species')}</td>
          <td class="num"><b>${fmtInt(auto)}</b> ${T('plantas', 'plants')}</td>
          <td class="num">${fmtInt(semAuto)} ${T('semillas a sembrar', 'seeds to sow')}</td></tr>
      </tbody></table>
      <p class="hint">${T(
        `Con las 100 plantas que recomienda FAO para una alógama, la probabilidad de conservar un alelo de esa frecuencia es de ${fmt(100 * conFAO, 2)} %. Las semillas a sembrar salen de dividir las plantas entre la germinación (${g} %) y un 90 % de establecimiento en campo.`,
        `With the 100 plants FAO recommends for an outcrosser, the probability of keeping an allele of that frequency is ${fmt(100 * conFAO, 2)}%. Seeds to sow come from dividing the plants by germination (${g}%) and a 90% field establishment.`)}</p>`;
  }

  /* ---------- gráfica de carga de trabajo ---------- */
  function workPlot(W, H) {
    if (!A) return '';
    const w = A.work.slice(0, 26);
    const maxV = Math.max(1, ...w.map(x => x.tests + x.regen + x.replant));
    const pad = { l: 38, r: 12, t: 12, b: 28 };
    const bw = (W - pad.l - pad.r) / w.length;
    const g = [];
    [0, 0.5, 1].forEach(f => {
      const y = H - pad.b - f * (H - pad.t - pad.b);
      g.push(`<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W - pad.r}" y2="${y.toFixed(1)}" stroke="${cv('--grid')}"/>`);
      g.push(`<text x="${pad.l - 5}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${cv('--text-muted')}">${Math.round(f * maxV)}</text>`);
    });
    w.forEach((x, i) => {
      const x0 = pad.l + i * bw;
      let acc = 0;
      [['tests', '--s1'], ['regen', '--s2'], ['replant', '--s5']].forEach(([k, col]) => {
        const v = x[k];
        if (!v) return;
        const h = (H - pad.t - pad.b) * v / maxV;
        const y = H - pad.b - acc - h;
        g.push(`<rect x="${(x0 + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${cv(col)}" opacity="0.88"><title>${T('año', 'year')} +${i}: ${v} ${k}</title></rect>`);
        acc += h;
      });
      if (i % 5 === 0) g.push(`<text x="${(x0 + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="${cv('--text-muted')}">+${i}</text>`);
    });
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>
      <div class="map-legend" style="margin-top:6px">
        <span class="lg-item"><i style="background:${cv('--s1')}"></i>${T('pruebas de germinación', 'germination tests')}</span>
        <span class="lg-item"><i style="background:${cv('--s2')}"></i>${T('regeneraciones', 'regenerations')}</span>
        <span class="lg-item"><i style="background:${cv('--s5')}"></i>${T('resiembras de campo', 'field replantings')}</span>
      </div>`;
  }

  /* ---------- registrar trabajo hecho ---------- */
  function recordTest(i) {
    const r = state.acc[i];
    const pct = prompt(T(`Resultado de la prueba de germinación de ${r.ACCENUMB} (%)`, `Germination test result for ${r.ACCENUMB} (%)`), r.GP_GERMPCT || '90');
    if (pct == null) return;
    const v = Number(String(pct).replace(',', '.'));
    if (!isFinite(v) || v < 0 || v > 100) { alert(T('Ese porcentaje no es válido.', 'That percentage is not valid.')); return; }
    const used = Number(prompt(T('¿Cuántas semillas se usaron en la prueba? (0 si no descuentas)', 'How many seeds were used for the test? (0 for no deduction)'), String(cfg.seed.testSeeds)) || 0);
    MANAGE.recordTest(r, v, MANAGE.todayStamp(), isFinite(used) ? used : 0);
    persist();
  }
  function recordRegen(i) {
    const r = state.acc[i];
    const route = MCPD.consRoute(r);
    const label = route === 'invitro' ? T('subcultivo', 'subculture') : T('regeneración', 'regeneration');
    const stock = prompt(T(`Existencias después de la ${label} de ${r.ACCENUMB}`, `Stock after the ${label} of ${r.ACCENUMB}`), r.GP_STOCK || '');
    if (stock == null) return;
    let germ = NaN;
    if (route === 'seed') {
      const g = prompt(T('Germinación del lote nuevo (%), o vacío si todavía no se prueba', 'Germination of the new lot (%), or blank if not tested yet'), '96');
      if (g != null && String(g).trim() !== '') germ = Number(String(g).replace(',', '.'));
    }
    MANAGE.recordRegeneration(r, MANAGE.todayStamp(), Number(stock), germ);
    persist();
  }
  function persist() {
    Prefs.set('acc', state.acc);
    if (window.B2) B2.refresh();
    run();
  }

  /* ---------- constantes de viabilidad ---------- */
  function addConstants() {
    const taxa = [...new Set(state.acc.map(r => MANAGE.taxonOf(r)).filter(Boolean))].sort();
    const taxon = prompt(T(`¿Para qué taxón? Los de tu colección: ${taxa.slice(0, 8).join(', ')}…`, `Which taxon? Yours: ${taxa.slice(0, 8).join(', ')}…`), taxa[0] || '');
    if (!taxon) return;
    const KE = Number(prompt('K_E', '6.474'));
    const CW = Number(prompt('C_W', '2.115'));
    if (!isFinite(KE) || !isFinite(CW)) { alert(T('Las constantes deben ser números.', 'The constants must be numbers.')); return; }
    const source = prompt(T('¿De dónde salen? (fuente)', 'Where do they come from? (source)'), 'Seed Information Database (Kew)') || '';
    viab[taxon] = { KE, CW, CH: 0.0329, CQ: 0.000478, source };
    saveCfg();
    run();
  }

  /* ---------- plan de trabajo ---------- */
  function exportPlan() {
    const rows = A.lots.filter(l => l.st.alerts.length).map(l => ({
      ACCENUMB: l.row.ACCENUMB, ACCENAME: l.row.ACCENAME,
      TAXON: MANAGE.taxonOf(l.row), ruta: l.st.route,
      urgencia: l.st.levelName, existencias: isFinite(l.st.stock) ? l.st.stock : '',
      germinacion_ultima: isFinite(l.st.germ) ? l.st.germ : '',
      germinacion_proyectada: l.st.projected != null ? Math.round(l.st.projected * 10) / 10 : '',
      anios_desde_prueba: l.st.yearsSinceTest != null ? Math.round(l.st.yearsSinceTest * 10) / 10 : '',
      anios_al_umbral: l.st.yearsToThreshold != null ? Math.round(l.st.yearsToThreshold * 10) / 10 : '',
      acciones: l.st.alerts.map(a => a.msg.es).join(' | '),
    }));
    if (!rows.length) { alert(T('No hay nada pendiente: toda la colección está al día.', 'Nothing pending: the whole collection is up to date.')); return; }
    download(IO.toCSV(rows, Object.keys(rows[0])), 'plan-de-trabajo.csv', 'text/csv;charset=utf-8');
  }

  function init() {
    if (!el('panel-8')) return;
    loadCfg();
    run();
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('stepchange', e => { if (e.detail.step === 8) run(); });
  document.addEventListener('langchange', () => { if (el('panel-8')) run(); });
  document.addEventListener('themechange', () => { if (el('panel-8') && A) render(); });

  window.B8 = { run, view, analysis: () => A, cfg: () => cfg, viab: () => viab, workPlot };
})();
