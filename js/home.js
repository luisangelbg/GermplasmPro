/* GermplasmPro — Bloque 1: la portada.
   Dibuja la ilustración, arma la rejilla de bloques y mueve el simulador
   "la vida de una accesión", que llama al motor de genebank.js. El simulador
   cubre los cinco caminos de conservación (banco de semillas, banco de campo,
   in vitro, criopreservación e in situ) para cualquier especie, y avisa cuando
   el camino elegido no le queda a la especie elegida. Todo lo que se ve aquí
   se vuelve a dibujar cuando cambia el idioma o el tema. */

(function () {

  /* ============ un graficador mínimo de líneas ============
     Devuelve el SVG completo como texto: no hay biblioteca de gráficas, y así
     la figura hereda los colores del tema sin repintar nada a mano. */
  function linePlot(cfg) {
    const W = cfg.w || 460, H = cfg.h || 280;
    const pad = Object.assign({ l: 44, r: 12, t: 12, b: 30 }, cfg.pad);
    const xd = cfg.xdom, yd = cfg.ydom;
    const X = v => pad.l + (v - xd[0]) / (xd[1] - xd[0] || 1) * (W - pad.l - pad.r);
    const Y = v => H - pad.b - (v - yd[0]) / (yd[1] - yd[0] || 1) * (H - pad.t - pad.b);
    const p = [];

    /* rejilla y marcas */
    const xt = cfg.xticks || niceTicks(xd[0], xd[1], 5);
    const yt = cfg.yticks || niceTicks(yd[0], yd[1], 5);
    for (const t of yt) {
      p.push(`<line x1="${pad.l}" y1="${Y(t).toFixed(1)}" x2="${W - pad.r}" y2="${Y(t).toFixed(1)}" stroke="var(--grid)" stroke-width="1"/>`);
      p.push(`<text x="${pad.l - 6}" y="${(Y(t) + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="var(--text-muted)">${t}</text>`);
    }
    for (const t of xt) {
      p.push(`<text x="${X(t).toFixed(1)}" y="${H - pad.b + 14}" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">${t}</text>`);
    }
    p.push(`<line x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}" stroke="var(--border-strong)" stroke-width="1"/>`);
    p.push(`<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H - pad.b}" stroke="var(--border-strong)" stroke-width="1"/>`);

    /* bandas verticales (por ejemplo, los años de regeneración) */
    for (const v of (cfg.vlines || [])) {
      p.push(`<line x1="${X(v.x).toFixed(1)}" y1="${pad.t}" x2="${X(v.x).toFixed(1)}" y2="${H - pad.b}" stroke="${v.color || 'var(--s3)'}" stroke-width="${v.width || 1.4}" stroke-dasharray="${v.dash || '3 3'}" opacity="${v.opacity || .7}"/>`);
    }
    /* línea horizontal de referencia (el umbral de regeneración) */
    for (const h of (cfg.hlines || [])) {
      p.push(`<line x1="${pad.l}" y1="${Y(h.y).toFixed(1)}" x2="${W - pad.r}" y2="${Y(h.y).toFixed(1)}" stroke="${h.color || 'var(--danger)'}" stroke-width="1.4" stroke-dasharray="5 4"/>`);
      if (h.label) p.push(`<text x="${W - pad.r - 3}" y="${(Y(h.y) - 4).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${h.color || 'var(--danger)'}">${esc(h.label)}</text>`);
    }
    /* series */
    for (const s of (cfg.series || [])) {
      if (!s.pts || s.pts.length < 2) continue;
      const d = s.pts.map((q, i) => `${i ? 'L' : 'M'} ${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join(' ');
      p.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" stroke-dasharray="${s.dash || ''}" stroke-linejoin="round" stroke-linecap="round"/>`);
    }
    /* puntos sueltos (las pruebas de germinación) */
    for (const q of (cfg.points || [])) {
      p.push(`<circle cx="${X(q.x).toFixed(1)}" cy="${Y(q.y).toFixed(1)}" r="${q.r || 3}" fill="${q.color || 'var(--s2)'}" stroke="var(--card-bg)" stroke-width="1"/>`);
    }
    /* títulos de los ejes */
    if (cfg.xlab) p.push(`<text x="${(pad.l + W - pad.r) / 2}" y="${H - 2}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${esc(cfg.xlab)}</text>`);
    if (cfg.ylab) p.push(`<text transform="translate(11,${(pad.t + H - pad.b) / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="var(--text-muted)">${esc(cfg.ylab)}</text>`);

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${p.join('')}</svg>`;
  }
  function niceTicks(lo, hi, n) {
    const span = hi - lo || 1;
    const raw = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || mag * 10;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
    return out;
  }

  /* ============ escenarios listos ============ */
  const PRESETS = {
    'seed-fao': { m: 'seed', es: 'Semillas · banco de largo plazo (norma FAO: −18 °C, 6 %)', en: 'Seed · long-term genebank (FAO standard: −18 °C, 6%)',
      v: { species: 'maiz', method: 'seed', temp: -18, moisture: 6, interval: 5, sown: 100, threshold: 85, years: 100 } },
    'seed-fria': { m: 'seed', es: 'Semillas · cámara de mediano plazo (5 °C, 8 %)', en: 'Seed · medium-term cold room (5 °C, 8%)',
      v: { species: 'trigo', method: 'seed', temp: 5, moisture: 8, interval: 5, sown: 100, threshold: 85, years: 200 } },
    'seed-comunitario': { m: 'seed', es: 'Semillas · banco comunitario sin cámara (20 °C, 12 %)', en: 'Seed · community seed bank, no cold room (20 °C, 12%)',
      v: { species: 'maiz', method: 'seed', temp: 20, moisture: 12, interval: 3, sown: 60, threshold: 85, years: 100 } },
    'seed-sinmonitoreo': { m: 'seed', es: 'Semillas · el mismo banco comunitario sin probar germinación en 15 años', en: 'Seed · the same community bank with no germination test for 15 years',
      v: { species: 'maiz', method: 'seed', temp: 20, moisture: 12, interval: 15, sown: 60, threshold: 85, years: 100 } },
    'seed-pocas': { m: 'seed', es: 'Semillas · buena cámara, pero se regenera con 25 plantas', en: 'Seed · good cold room, but regenerated with 25 plants',
      v: { species: 'maiz', method: 'seed', temp: 5, moisture: 8, interval: 5, sown: 25, threshold: 85, years: 200 } },
    'field-chayote': { m: 'field', es: 'Campo · chayote, recalcitrante, resiembra cada 3 años', en: 'Field · chayote, recalcitrant, replanted every 3 years',
      v: { species: 'chayote', method: 'field', interval: 3, sown: 60, hazard: 2, years: 100 } },
    'field-cacao': { m: 'field', es: 'Campo · colección de árboles de cacao, renovada cada 25 años', en: 'Field · cacao tree collection, renewed every 25 years',
      v: { species: 'cacao', method: 'field', interval: 25, sown: 40, hazard: 3, years: 100 } },
    'invitro-papa': { m: 'invitro', es: 'In vitro · papa en crecimiento lento, subcultivo cada 12 meses', en: 'In vitro · potato under slow growth, subcultured every 12 months',
      v: { species: 'papa', method: 'invitro', subMonths: 12, lines: 20, contam: 2, years: 50 } },
    'invitro-rapido': { m: 'invitro', es: 'In vitro · la misma papa, pero subcultivada cada 3 meses', en: 'In vitro · the same potato, but subcultured every 3 months',
      v: { species: 'papa', method: 'invitro', subMonths: 3, lines: 20, contam: 2, years: 50 } },
    'cryo-papa': { m: 'cryo', es: 'Crio · ápices de papa en nitrógeno líquido', en: 'Cryo · potato shoot tips in liquid nitrogen',
      v: { species: 'papa', method: 'cryo', explants: 200, recovery: 50, failure: 2, years: 100 } },
    'cryo-pocos': { m: 'cryo', es: 'Crio · la misma papa, pero con sólo 30 explantes congelados', en: 'Cryo · the same potato, but with only 30 explants frozen',
      v: { species: 'papa', method: 'cryo', explants: 30, recovery: 40, failure: 2, years: 100 } },
    'insitu-milpa': { m: 'insitu', es: 'In situ · maíz criollo en la milpa (on-farm)', en: 'In situ · maize landrace in the farmer’s field (on-farm)',
      v: { species: 'maiz', method: 'insitu', census: 500, neRatio: 30, migration: 5, siteRisk: 1, years: 100 } },
    'insitu-aislada': { m: 'insitu', es: 'In situ · la misma milpa, aislada y con poca semilla (sin flujo génico)', en: 'In situ · the same field, isolated and short of seed (no gene flow)',
      v: { species: 'maiz', method: 'insitu', census: 80, neRatio: 25, migration: 0, siteRisk: 2, years: 100 } },
    'insitu-reserva': { m: 'insitu', es: 'In situ · encinos de una reserva de parientes silvestres', en: 'In situ · oaks in a crop-wild-relative reserve',
      v: { species: 'encino', method: 'insitu', census: 2000, neRatio: 40, migration: 8, siteRisk: 1, years: 100 } },
  };

  /* ============ los controles, uno por parámetro ============ */
  const SLIDERS = {
    temp: { es: 'Temperatura de la cámara (°C)', en: 'Store temperature (°C)', min: -20, max: 25, step: 1, fmt: v => v + ' °C' },
    moisture: { es: 'Humedad de la semilla (%)', en: 'Seed moisture content (%)', min: 3, max: 14, step: 0.5, fmt: v => v + ' %' },
    threshold: { es: 'Umbral para regenerar (% germinación)', en: 'Regeneration threshold (% germination)', min: 50, max: 95, step: 5, fmt: v => v + ' %' },
    interval: {
      es: 'Cada cuántos años se revisa', en: 'Years between checks', min: 1, max: 30, step: 1, fmt: v => v + ' a',
      labels: { field: { es: 'Años entre resiembras', en: 'Years between replantings' } },
    },
    sown: {
      es: 'Plantas con las que se regenera', en: 'Plants used to regenerate', min: 10, max: 300, step: 5, fmt: v => String(v),
      labels: { field: { es: 'Plantas que mantiene la colección', en: 'Plants kept in the collection' } },
    },
    hazard: { es: 'Riesgo anual de sequía, plaga o huracán (%)', en: 'Annual risk of drought, pest or hurricane (%)', min: 0, max: 15, step: 0.5, fmt: v => v + ' %' },
    subMonths: { es: 'Meses entre subcultivos', en: 'Months between subcultures', min: 2, max: 24, step: 1, fmt: v => v + ' m' },
    lines: { es: 'Frascos (líneas) por accesión', en: 'Jars (lines) per accession', min: 5, max: 60, step: 1, fmt: v => String(v) },
    contam: { es: 'Frascos que se pierden por subcultivo (%)', en: 'Jars lost per subculture (%)', min: 0, max: 20, step: 0.5, fmt: v => v + ' %' },
    explants: { es: 'Explantes que se congelan', en: 'Explants frozen', min: 10, max: 500, step: 10, fmt: v => String(v) },
    recovery: { es: 'Recuperación al descongelar (%)', en: 'Recovery after thawing (%)', min: 5, max: 95, step: 5, fmt: v => v + ' %' },
    failure: { es: 'Riesgo de fallo del tanque (por mil años)', en: 'Tank failure risk (per thousand years)', min: 0, max: 20, step: 1, fmt: v => v + ' ‰' },
    census: { es: 'Individuos de la población', en: 'Individuals in the population', min: 20, max: 3000, step: 20, fmt: v => String(v) },
    neRatio: { es: 'Tamaño efectivo (Ne como % del censo)', en: 'Effective size (Ne as % of the census)', min: 5, max: 100, step: 5, fmt: v => v + ' %' },
    migration: { es: 'Flujo génico de las poblaciones vecinas (%)', en: 'Gene flow from neighbouring populations (%)', min: 0, max: 30, step: 1, fmt: v => v + ' %' },
    siteRisk: { es: 'Riesgo anual de perder el sitio (%)', en: 'Annual risk of losing the site (%)', min: 0, max: 10, step: 0.5, fmt: v => v + ' %' },
    years: { es: 'Horizonte de la simulación (años)', en: 'Simulation horizon (years)', min: 30, max: 200, step: 10, fmt: v => v + ' a' },
  };

  const cur = Object.assign({}, GB.DEFAULTS, PRESETS['seed-fao'].v);
  let lastRun = null;

  /* ---------- armado de los selectores ---------- */
  function buildControls() {
    if (!el('simSliders')) return;   /* la página de pruebas no trae el simulador */

    const me = el('simMethod');
    const groups = { 'ex situ': [], 'in situ': [] };
    Object.keys(GB.METHODS).forEach(k => groups[GB.METHODS[k].kind].push(k));
    me.innerHTML = Object.keys(groups).map(g =>
      `<optgroup label="${g === 'ex situ' ? 'Ex situ' : 'In situ'}">` +
      groups[g].map(k => `<option value="${k}" data-es="${esc(GB.METHODS[k].es)}" data-en="${esc(GB.METHODS[k].en)}">${esc(GB.METHODS[k].es)}</option>`).join('') +
      `</optgroup>`).join('');
    me.addEventListener('change', () => { cur.method = me.value; syncControls(); run(); });

    const sp = el('simSpecies');
    sp.innerHTML = Object.keys(GB.SPECIES).map(k => {
      const s = GB.SPECIES[k];
      const name = n => s.sci ? `${s[n]} (${s.sci})` : s[n];
      return `<option value="${k}" data-es="${esc(name('es'))}" data-en="${esc(name('en'))}">${esc(name('es'))}</option>`;
    }).join('');
    sp.addEventListener('change', () => { cur.species = sp.value; cur.behaviour = null; syncControls(); run(); });

    const be = el('simBehaviour');
    be.innerHTML = Object.keys(GB.BEHAVIOUR).map(k =>
      `<option value="${k}" data-es="${esc(GB.BEHAVIOUR[k].es)}" data-en="${esc(GB.BEHAVIOUR[k].en)}">${esc(GB.BEHAVIOUR[k].es)}</option>`).join('');
    be.addEventListener('change', () => { cur.behaviour = be.value; syncControls(); run(); });

    ['KE', 'CW'].forEach(k => {
      el('sim' + k).addEventListener('input', () => {
        const v = Number(el('sim' + k).value);
        if (isFinite(v) && v > 0) { cur[k] = v; run(); }
      });
    });

    const pr = el('simPreset');
    pr.innerHTML = Object.keys(PRESETS).map(k =>
      `<option value="${k}" data-es="${esc(PRESETS[k].es)}" data-en="${esc(PRESETS[k].en)}">${esc(PRESETS[k].es)}</option>`).join('');
    pr.addEventListener('change', () => { Object.assign(cur, PRESETS[pr.value].v); cur.behaviour = null; syncControls(); run(); });

    el('simSeed').addEventListener('click', () => { cur.seed = Math.floor(Math.random() * 1e9); run(); });
  }

  /* ---------- los deslizadores que pide el método activo ---------- */
  function buildSliders() {
    const box = el('simSliders');
    if (!box) return;
    const keys = GB.METHODS[cur.method].sliders;
    box.innerHTML = keys.map(k => {
      const s = SLIDERS[k];
      const lab = (s.labels && s.labels[cur.method]) || s;
      return `<div class="slider-row" data-k="${k}">
        <label for="sl_${k}">${L2(lab.es, lab.en)}</label>
        <input type="range" id="sl_${k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${clamp(cur[k], s.min, s.max)}">
        <span class="range-val" id="slv_${k}">${s.fmt(clamp(cur[k], s.min, s.max))}</span>
      </div>`;
    }).join('');
    keys.forEach(k => {
      const s = SLIDERS[k], inp = el('sl_' + k);
      cur[k] = Number(inp.value);
      inp.addEventListener('input', () => {
        cur[k] = Number(inp.value);
        el('slv_' + k).textContent = s.fmt(cur[k]);
        run();
      });
    });
    I18N.apply(box);
  }

  /* pone los selectores al día tras un escenario o un cambio de especie */
  function syncControls() {
    if (!el('simSliders')) return;
    const spec = GB.SPECIES[cur.species] || GB.SPECIES.generica;
    const beh = cur.behaviour || spec.behaviour;
    if (el('simMethod')) el('simMethod').value = cur.method;
    if (el('simSpecies')) el('simSpecies').value = cur.species;
    /* el comportamiento sólo se elige en la especie genérica */
    const bw = el('wrapBehaviour');
    if (bw) bw.style.display = spec.pickBehaviour ? '' : 'none';
    if (el('simBehaviour')) el('simBehaviour').value = beh;
    /* K_E y C_W: sólo en banco de semillas y cuando no hay constantes publicadas */
    const needConst = cur.method === 'seed' && spec.editable;
    if (!spec.editable) { delete cur.KE; delete cur.CW; }
    else {
      if (cur.KE == null) cur.KE = spec.KE;
      if (cur.CW == null) cur.CW = spec.CW;
      if (el('simKE')) el('simKE').value = cur.KE;
      if (el('simCW')) el('simCW').value = cur.CW;
    }
    ['KE', 'CW'].forEach(k => { const w = el('wrap' + k); if (w) w.style.display = needConst ? '' : 'none'; });
    buildSliders();
  }

  /* ============ correr y dibujar ============ */
  function run() {
    if (!el('simViab')) return null;
    lastRun = GB.simulate(cur);
    draw(lastRun);
    return lastRun;
  }

  /* el veredicto de compatibilidad, arriba de las gráficas */
  function verdictBox(r) {
    const spec = r.species, beh = r.behaviour, m = GB.METHODS[r.method];
    const bh = GB.BEHAVIOUR[beh];
    const name = T(spec.es, spec.en) + (spec.sci ? ` (<i class="sci">${spec.sci}</i>)` : '');
    const head = beh === 'clonal'
      ? T(`${name} es <b>de propagación vegetativa</b>: ${bh.d.es}`, `${name} is <b>vegetatively propagated</b>: ${bh.d.en}`)
      : T(`${name} tiene semilla <b>${bh.es}</b>: ${bh.d.es}`, `${name} has <b>${bh.en}</b> seed: ${bh.d.en}`);
    if (r.fit === 'no') {
      const why = m.why && m.why.no ? T(m.why.no.es, m.why.no.en) : '';
      return `<div class="note-warn"><b>${T('Este camino no le queda a esta especie.', 'This route does not suit this species.')}</b> ${head} ${why}</div>`;
    }
    if (r.fit === 'warn') {
      const why = m.why && m.why.warn ? T(m.why.warn.es, m.why.warn.en) : '';
      return `<div class="note-warn"><b>${T('Se puede, pero con reservas.', 'Possible, but with caveats.')}</b> ${head} ${why}</div>`;
    }
    return `<div class="note-ok">${head} ${T('El método elegido es adecuado para ella.', 'The chosen method suits it.')}</div>`;
  }

  function draw(r) {
    el('simVerdict').innerHTML = verdictBox(r);

    if (r.blocked) {
      const alt = Object.keys(GB.METHODS).filter(k => GB.fit(r.opts.species, k, r.behaviour) === 'ok');
      el('simViab').innerHTML = `<div class="sim-empty">${T('Sin simulación: este material no se conserva así.', 'No simulation: this material is not conserved this way.')}</div>`;
      el('simDiv').innerHTML = `<div class="sim-empty">${T('Prueba con:', 'Try instead:')} ${alt.map(k => `<button class="chip" data-method="${k}">${esc(T(GB.METHODS[k].es, GB.METHODS[k].en))}</button>`).join(' ')}</div>`;
      el('simDivLegend').innerHTML = '';
      el('simStats').innerHTML = '';
      el('simNote').innerHTML = T(r.species.note.es, r.species.note.en);
      els('[data-method]', el('simDiv')).forEach(b => b.addEventListener('click', () => {
        cur.method = b.dataset.method; syncControls(); run();
      }));
      return;
    }

    const yMax = r.opts.years;
    const isSeed = r.method === 'seed';

    /* --- panel izquierdo: el estado del material --- */
    el('simViab').innerHTML = linePlot({
      w: 480, h: 290, xdom: [0, yMax], ydom: [0, 100],
      xlab: T('años de conservación', 'years of conservation'),
      ylab: T(r.mainLabel.es, r.mainLabel.en),
      series: [{ pts: r.years.map((y, i) => [y, r.germ[i]]), color: 'var(--s1)', width: 2.2 }],
      hlines: isSeed ? [{ y: r.opts.threshold, color: 'var(--danger)', label: T('umbral', 'threshold') }] : [],
      vlines: r.regens.length <= 60 ? r.regens.map(g => ({ x: g.year, color: g.reason === 'stock' ? 'var(--s2)' : 'var(--s3)' })) : [],
      points: r.tests.map(t => ({ x: t.year, y: t.value, color: 'var(--s2)', r: 2.6 })),
    });

    /* --- panel derecho: la diversidad que se conserva --- */
    el('simDiv').innerHTML = linePlot({
      w: 380, h: 290, xdom: [0, yMax], ydom: [0, 100],
      xlab: T('años de conservación', 'years of conservation'),
      ylab: T('% del valor inicial', '% of the initial value'),
      series: [
        { pts: r.years.map((y, i) => [y, r.alleles[i]]), color: 'var(--s3)', width: 2.2 },
        { pts: r.years.map((y, i) => [y, r.he[i]]), color: 'var(--s4)', width: 2 },
        { pts: r.years.map((y, i) => [y, r.f[i]]), color: 'var(--s5)', width: 1.8, dash: '5 3' },
      ],
    });
    el('simDivLegend').innerHTML = [
      { c: 'var(--s3)', es: r.method === 'invitro' ? 'variantes clonales conservadas' : 'alelos conservados', en: r.method === 'invitro' ? 'clonal variants retained' : 'alleles retained' },
      { c: 'var(--s4)', es: 'diversidad esperada', en: 'expected diversity' },
      { c: 'var(--s5)', es: 'consanguinidad acumulada (F)', en: 'accumulated inbreeding (F)' },
    ].map(x => `<span style="--lc:${x.c}"><i></i>${L2(x.es, x.en)}</span>`).join('');

    el('simStats').innerHTML = statsFor(r).map(x =>
      `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');
    el('simNote').innerHTML = readOut(r);
  }

  /* ---------- las cifras, distintas en cada camino ---------- */
  function statsFor(r) {
    const s = r.summary, o = r.opts, st = [];
    const common = () => {
      st.push({ k: T('Alelos conservados', 'Alleles retained'), v: fmt(s.allelesLeft, 1) + ' %', d: T('de los que tenía la accesión al entrar', 'of those the accession had on arrival'), c: 'var(--s3)' });
      st.push({ k: T('Diversidad conservada', 'Diversity retained'), v: fmt(s.heLeft, 1) + ' %', d: 'H<sub>e</sub> / H<sub>e0</sub>', c: 'var(--s4)' });
      st.push({ k: T('Consanguinidad', 'Inbreeding'), v: fmt(s.F, 1) + ' %', d: T('F acumulada por los cuellos de botella', 'F accumulated over the bottlenecks'), c: 'var(--s5)' });
    };
    if (r.method === 'seed') {
      st.push({ k: T('Vida media del lote', 'Half-viability period'), v: r.p50 > 999 ? '>999' : fmt(r.p50, 0), d: T('años hasta 50 % de germinación (p₅₀)', 'years to 50% germination (p₅₀)'), c: 'var(--s1)' });
      st.push({ k: T(r.cycleLabel.es, r.cycleLabel.en), v: fmtInt(s.regens), d: T('en ' + o.years + ' años', 'in ' + o.years + ' years'), c: 'var(--s2)' });
      common();
      st.push({ k: T('Tamaño efectivo medio', 'Mean effective size'), v: s.NeMean == null ? '—' : fmt(s.NeMean, 0), d: T('plantas que de verdad dejaron descendencia', 'plants that actually left offspring'), c: 'var(--s6)' });
      st.push({ k: T('Semilla gastada en pruebas', 'Seed spent on tests'), v: fmtInt(s.seedsOnTests), d: T('semillas de germinación en el periodo', 'germination-test seeds in the period'), c: 'var(--s7)' });
    } else if (r.method === 'field') {
      st.push({ k: T('Golpes a la colección', 'Hits to the collection'), v: fmtInt(s.hazards || 0), d: T('sequías, plagas o huracanes en el periodo', 'droughts, pests or hurricanes in the period'), c: 'var(--s1)' });
      st.push({ k: T(r.cycleLabel.es, r.cycleLabel.en), v: fmtInt(s.regens), d: T('en ' + o.years + ' años', 'in ' + o.years + ' years'), c: 'var(--s2)' });
      common();
      st.push({ k: T('Tamaño efectivo medio', 'Mean effective size'), v: s.NeMean == null ? '—' : fmt(s.NeMean, 0), d: T('plantas que dejaron descendencia en cada resiembra', 'plants leaving offspring at each replanting'), c: 'var(--s6)' });
    } else if (r.method === 'invitro') {
      st.push({ k: T('Subcultivos', 'Subcultures'), v: fmtInt(s.subcultures), d: T('cada ' + o.subMonths + ' meses, durante ' + o.years + ' años', 'every ' + o.subMonths + ' months, over ' + o.years + ' years'), c: 'var(--s1)' });
      st.push({ k: T('Fidelidad genética', 'Genetic fidelity'), v: fmt(s.fidelity, 1) + ' %', d: T('material libre de variación somaclonal', 'material free of somaclonal variation'), c: 'var(--s2)' });
      common();
      st.push({ k: T('Frascos manipulados', 'Jars handled'), v: fmtInt(s.labour), d: T('el trabajo de laboratorio del periodo', 'the laboratory work over the period'), c: 'var(--s6)' });
    } else if (r.method === 'cryo') {
      st.push({ k: T('Explantes recuperados', 'Explants recovered'), v: fmtInt(s.survivors), d: T('de ' + o.explants + ' congelados, al ' + o.recovery + ' % de recuperación', 'of ' + o.explants + ' frozen, at ' + o.recovery + '% recovery'), c: 'var(--s1)' });
      st.push({ k: T('Ciclos de regeneración', 'Regeneration cycles'), v: '0', d: T('a −196 °C el material ya no envejece', 'at −196 °C the material no longer ages'), c: 'var(--s2)' });
      common();
      st.push({ k: T('Fallos del tanque', 'Tank failures'), v: fmtInt(s.hazards || 0), d: T('en ' + o.years + ' años, con riesgo de ' + o.failure + ' por mil', 'in ' + o.years + ' years, at a risk of ' + o.failure + ' per thousand'), c: 'var(--s6)' });
    } else {
      st.push({ k: T('Generaciones', 'Generations'), v: fmtInt(s.generations), d: T('la población siguió reproduciéndose sola', 'the population kept reproducing on its own'), c: 'var(--s1)' });
      st.push({ k: T('Golpes al sitio', 'Hits to the site'), v: fmtInt(s.hazards || 0), d: T('sequías, incendios o cambio de uso del suelo', 'droughts, fires or land-use change'), c: 'var(--s2)' });
      common();
      st.push({ k: T('Tamaño efectivo medio', 'Mean effective size'), v: s.NeMean == null ? '—' : fmt(s.NeMean, 0), d: T('Ne por generación', 'Ne per generation'), c: 'var(--s6)' });
      st.push({ k: T('Población final', 'Final population'), v: fmtInt(s.finalStock), d: T('individuos al terminar el periodo', 'individuals at the end of the period'), c: 'var(--s7)' });
    }
    return st;
  }

  /* ---------- la lectura en palabras ---------- */
  function readOut(r) {
    const s = r.summary, o = r.opts, sp = r.species;
    const bits = [];

    if (r.method === 'seed') {
      bits.push(T(
        `A ${o.temp} °C y ${o.moisture} % de humedad, la ecuación de viabilidad da σ = ${fmt(r.sigma / 365.25, 0)} años por probit: el lote tarda <b>${r.p50 > 999 ? 'más de 999' : fmt(r.p50, 0)} años</b> en caer al 50 % de germinación.`,
        `At ${o.temp} °C and ${o.moisture}% moisture, the viability equation gives σ = ${fmt(r.sigma / 365.25, 0)} years per probit: the lot takes <b>${r.p50 > 999 ? 'more than 999' : fmt(r.p50, 0)} years</b> to fall to 50% germination.`));
      if (s.regens === 0) {
        bits.push(T(`En ${o.years} años no hizo falta regenerar: la accesión llega con ${fmt(s.finalGerm, 0)} % de germinación y con toda su diversidad. Esto es lo que compra una buena cámara.`,
          `In ${o.years} years it never needed regenerating: the accession arrives with ${fmt(s.finalGerm, 0)}% germination and all of its diversity. That is what a good cold room buys.`));
      } else {
        const byStock = r.regens.filter(g => g.reason === 'stock').length;
        bits.push(T(
          `Hubo ${s.regens} regeneraciones (la primera en el año ${s.firstRegen}${byStock ? `, ${byStock} de ellas por quedarse sin semilla` : ''}), cada una con un tamaño efectivo medio de ${fmt(s.NeMean, 0)} plantas. Ahí se fueron ${fmtInt(s.allelesLost)} alelos y subió la consanguinidad a ${fmt(s.F, 1)} %.`,
          `There were ${s.regens} regenerations (the first in year ${s.firstRegen}${byStock ? `, ${byStock} of them because the seed ran out` : ''}), each with a mean effective size of ${fmt(s.NeMean, 0)} plants. That cost ${fmtInt(s.allelesLost)} alleles and pushed inbreeding to ${fmt(s.F, 1)}%.`));
      }
      if (o.interval >= 10) bits.push(T(
        `Con revisiones cada ${o.interval} años, cuando por fin se descubre que el lote bajó ya está muy por debajo del umbral: se siembra semilla poco viable y el tamaño efectivo de la regeneración se desploma.`,
        `With checks every ${o.interval} years, by the time the drop is noticed the lot is far below the threshold: poorly viable seed is sown and the effective size of the regeneration collapses.`));
      if (o.sown <= 30) bits.push(T(
        `Regenerar con ${o.sown} plantas es barato y sale caro: cada ciclo tira los alelos raros, que son los que hacen valiosa a una población nativa.`,
        `Regenerating with ${o.sown} plants is cheap and costly: every cycle throws away the rare alleles, which are what makes a native population valuable.`));
    } else if (r.method === 'field') {
      bits.push(T(
        `Una colección viva no envejece en un frasco: envejece en la parcela. Con resiembra cada ${o.interval} años y ${o.sown} plantas, en ${o.years} años pasó por ${s.regens} renovaciones y ${s.hazards || 0} golpes del clima o de las plagas, y conserva ${fmt(s.allelesLeft, 0)} % de sus alelos.`,
        `A living collection does not age in a jar: it ages in the plot. Replanted every ${o.interval} years with ${o.sown} plants, in ${o.years} years it went through ${s.regens} renewals and ${s.hazards || 0} weather or pest hits, and keeps ${fmt(s.allelesLeft, 0)}% of its alleles.`));
      bits.push(T(
        `Aquí el enemigo no es el tiempo de almacén, son la frecuencia de la renovación, el tamaño de la parcela y la suerte: por eso un banco de campo siempre necesita un respaldo (in vitro, criopreservación o una segunda localidad).`,
        `Here the enemy is not storage time but how often the plot is renewed, how big it is and plain luck: that is why a field collection always needs a backup (in vitro, cryopreservation or a second site).`));
    } else if (r.method === 'invitro') {
      bits.push(T(
        `Con subcultivos cada ${o.subMonths} meses, en ${o.years} años el laboratorio hizo ${fmtInt(s.subcultures)} pases y manipuló ${fmtInt(s.labour)} frascos. La fidelidad genética bajó a ${fmt(s.fidelity, 1)} %: cada pase es una oportunidad para la variación somaclonal y para perder una línea por contaminación.`,
        `With subcultures every ${o.subMonths} months, in ${o.years} years the laboratory made ${fmtInt(s.subcultures)} passes and handled ${fmtInt(s.labour)} jars. Genetic fidelity fell to ${fmt(s.fidelity, 1)}%: every pass is a chance for somaclonal variation and for losing a line to contamination.`));
      bits.push(T(
        `Alargar el intervalo entre subcultivos —con menos temperatura, menos luz o medios con osmóticos— es la única forma de bajar ese costo sin perder la colección; el respaldo definitivo es la criopreservación.`,
        `Stretching the interval between subcultures —lower temperature, less light, osmotic media— is the only way to cut that cost without losing the collection; the definitive backup is cryopreservation.`));
    } else if (r.method === 'cryo') {
      bits.push(T(
        `De ${o.explants} explantes congelados se recuperan ${fmtInt(s.survivors)}: ese único cuello de botella deja la accesión con ${fmt(s.allelesLeft, 0)} % de sus alelos y una consanguinidad de ${fmt(s.F, 1)} %. Después no pasa nada más: a −196 °C no hay envejecimiento ni ciclos de regeneración.`,
        `Of ${o.explants} frozen explants, ${fmtInt(s.survivors)} are recovered: that single bottleneck leaves the accession with ${fmt(s.allelesLeft, 0)}% of its alleles and an inbreeding of ${fmt(s.F, 1)}%. Nothing else happens afterwards: at −196 °C there is no ageing and no regeneration cycles.`));
      bits.push(s.hazards
        ? T(`El tanque falló en el año ${r.hazards[0].year}: la criopreservación es segura mientras el nitrógeno nunca falte.`, `The tank failed in year ${r.hazards[0].year}: cryopreservation is safe only while the nitrogen never runs out.`)
        : T(`Todo el riesgo está en la entrada y en el suministro de nitrógeno: congela suficientes explantes y trabaja el protocolo hasta subir la recuperación.`, `All the risk is at the door and in the nitrogen supply: freeze enough explants and work on the protocol until recovery goes up.`));
    } else {
      bits.push(T(
        `La población vive en su sitio: en ${o.years} años pasó por ${fmtInt(s.generations)} generaciones con un tamaño efectivo medio de ${fmt(s.NeMean, 0)}, recibió ${o.migration} % de flujo génico por generación y conserva ${fmt(s.allelesLeft, 0)} % de sus alelos.`,
        `The population lives where it belongs: in ${o.years} years it went through ${fmtInt(s.generations)} generations with a mean effective size of ${fmt(s.NeMean, 0)}, received ${o.migration}% gene flow per generation and keeps ${fmt(s.allelesLeft, 0)}% of its alleles.`));
      bits.push(o.migration > 0
        ? T(`El flujo génico de las poblaciones vecinas devuelve parte de lo que la deriva se lleva: por eso conservar in situ es conservar una red de poblaciones, no una sola parcela.`,
            `Gene flow from neighbouring populations gives back part of what drift takes away: that is why in-situ conservation means conserving a network of populations, not a single plot.`)
        : T(`Sin flujo génico, la parcela aislada se comporta como un banco pequeño que se regenera todos los años: la deriva no se detiene y nada repone lo perdido.`,
            `With no gene flow, an isolated plot behaves like a small collection regenerated every year: drift never stops and nothing replaces what is lost.`));
      bits.push(T(
        `A cambio, esta es la única vía en la que la accesión sigue evolucionando: se adapta al clima y al manejo de quien la siembra, y conserva también el conocimiento asociado. Lo que se gana en adaptación se pierde en control, y por eso in situ y ex situ son complementarias, no alternativas.`,
        `In exchange, this is the only route in which the accession keeps evolving: it adapts to the climate and to the management of whoever sows it, and the associated knowledge is conserved too. What is gained in adaptation is lost in control, which is why in situ and ex situ are complementary, not alternatives.`));
    }

    if (s.lotLost) bits.push(`<b style="color:var(--danger)">${T('La accesión se perdió en el año ' + s.lotLost + '.', 'The accession was lost in year ' + s.lotLost + '.')}</b>`);
    bits.push(`<span class="muted">${T(sp.note.es, sp.note.en)}</span>`);
    return bits.join(' ');
  }

  /* ============ la rejilla de bloques ============ */
  const BLOCKS = [
    { n: 2, es: 'Pasaporte de accesiones', en: 'Accession passport', d: { es: 'Importa tu lista de accesiones —de cualquier especie y de cualquier tipo de banco— y ordénala con los descriptores de pasaporte multicultivo (MCPD): identificadores, taxonomía, sitio de colecta, donante, tipo de material y forma de conservación.', en: 'Import your accession list —any species, any kind of collection— and organize it with the multi-crop passport descriptors (MCPD): identifiers, taxonomy, collecting site, donor, material type and conservation method.' } },
    { n: 3, es: 'Calidad y duplicados', en: 'Quality and duplicates', d: { es: 'Coordenadas imposibles, fechas al revés, nombres escritos de tres maneras y, sobre todo, las accesiones que son la misma colecta entrada dos veces o repetida en dos bancos.', en: 'Impossible coordinates, reversed dates, names spelled three ways and, above all, accessions that are the same collection entered twice or held in two collections.' } },
    { n: 4, es: 'Mapa de colecta', en: 'Collecting map', d: { es: 'Tus accesiones y tus sitios in situ en el mapa, sin internet y sin subir nada: por especie, por altitud, por año de colecta o por tipo de conservación.', en: 'Your accessions and your in-situ sites on a map, offline and with nothing uploaded: by species, elevation, collecting year or conservation method.' } },
    { n: 5, es: 'Diversidad geográfica', en: 'Geographic diversity', d: { es: 'Cuántas accesiones y cuánta variación hay por estado, por cuadro de rejilla y por franja altitudinal; curvas de acumulación y rarefacción de la colección.', en: 'How many accessions and how much variation there is per state, grid cell and elevation belt; accumulation and rarefaction curves for the collection.' } },
    { n: 6, es: 'Vacíos de colecta', en: 'Collecting gaps', d: { es: 'Dónde no has colectado y qué poblaciones no están respaldadas: cuadros vacíos, ambientes sin representar y una ruta de prioridades por complementariedad.', en: 'Where you have not collected and which populations are not backed up: empty cells, unrepresented environments and a complementarity-based priority list.' } },
    { n: 7, es: 'Caracterización y núcleo', en: 'Characterization and core', d: { es: 'Descriptores morfológicos, distancia de Gower, agrupamiento y selección de una colección núcleo que conserve la diversidad con menos accesiones.', en: 'Morphological descriptors, Gower distance, clustering and the selection of a core collection that keeps the diversity with fewer accessions.' } },
    { n: 8, es: 'Manejo del banco', en: 'Genebank management', d: { es: 'Existencias, pruebas de germinación y ecuación de viabilidad por lote, calendarios de resiembra y de subcultivo, inventario de criotubos y alertas de regeneración.', en: 'Stocks, germination tests and the viability equation lot by lot, replanting and subculture calendars, cryovial inventory and regeneration alerts.' } },
    { n: 9, es: 'Etiquetas y registro', en: 'Labels and register', d: { es: 'Etiquetas de sobre, frasco, maceta y criotubo con código de barras, listas de siembra, vales de distribución y el libro de registro del banco.', en: 'Envelope, jar, pot and cryovial labels with barcodes, sowing lists, distribution slips and the genebank register.' } },
    { n: 10, es: 'Informe', en: 'Report', d: { es: 'El informe del estado de la colección en HTML y PDF, con los métodos redactados, más la exportación en MCPD y en Darwin Core.', en: 'The collection status report in HTML and PDF, with the methods written out, plus MCPD and Darwin Core exports.' } },
  ];
  function buildBlocks() {
    const box = el('blockGrid');
    if (!box) return;
    box.innerHTML = BLOCKS.map(b => {
      const step = STEPS.find(s => s.n === b.n);
      const ready = step && step.ready;
      return `<button class="feature" ${ready ? `data-go="${b.n}"` : 'disabled'}>
        <span class="f-num">${b.n}</span>
        <h3>${L2(b.es, b.en)} ${ready ? '' : `<span class="soon">· ${L2('pronto', 'soon')}</span>`}</h3>
        <p>${L2(b.d.es, b.d.en)}</p>
      </button>`;
    }).join('');
    els('[data-go]', box).forEach(b => b.addEventListener('click', () => goStep(b.dataset.go)));
  }

  /* ============ las tarjetas de los tipos de banco ============ */
  function buildMethodCards() {
    const box = el('methodGrid');
    if (!box) return;
    box.innerHTML = Object.keys(GB.METHODS).map(k => {
      const m = GB.METHODS[k];
      const insitu = m.kind === 'in situ';
      return `<button class="feature method-card${insitu ? ' in-situ' : ''}" data-open="${k}">
        <span class="tag ${insitu ? 'new' : 'ok'}">${insitu ? 'In situ' : 'Ex situ'}</span>
        <h3>${L2(m.short.es, m.short.en)}</h3>
        <p>${L2(m.d.es, m.d.en)}</p>
      </button>`;
    }).join('');
    els('[data-open]', box).forEach(b => b.addEventListener('click', () => {
      cur.method = b.dataset.open;
      /* un escenario razonable para ese método, si el actual no le sirve */
      const pre = Object.keys(PRESETS).find(k => PRESETS[k].m === cur.method);
      if (pre) { Object.assign(cur, PRESETS[pre].v); el('simPreset').value = pre; cur.behaviour = null; }
      syncControls(); run();
      el('simulator').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  /* ============ la ilustración ============ */
  let artSeed = 20260922;
  function drawArt() {
    const h = el('heroArt');
    if (h) h.innerHTML = ART.heroArt(artSeed);
    const lg = el('brandLogo');
    if (lg && !lg.firstChild) lg.innerHTML = ART.logoSVG();
  }

  /* ============ arranque ============ */
  document.addEventListener('DOMContentLoaded', () => {
    drawArt();
    buildBlocks();
    buildMethodCards();
    buildControls();
    syncControls();
    run();
    const nb = el('artNew');
    if (nb) nb.addEventListener('click', () => { artSeed = Math.floor(Math.random() * 1e9); drawArt(); });
    const cb = el('citeBtn');
    if (cb) cb.addEventListener('click', () => el('citeDlg').showModal());
    els('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  });
  document.addEventListener('langchange', () => {
    drawArt();                 /* las etiquetas de las cinco rutas van dentro del SVG */
    buildBlocks(); buildMethodCards();
    if (lastRun) draw(lastRun);
    I18N.apply();
  });

  window.HOME = { linePlot, niceTicks, PRESETS, BLOCKS, SLIDERS, run: () => run(), current: () => cur, last: () => lastRun };
})();
