/* GermplasmPro — Bloque 6: los vacíos de colecta.

   Tres pantallas:
     1. El mapa de vacíos: qué celdas del territorio no tienen ninguna colecta
        y a qué distancia les queda la más cercana.
     2. La lista de prioridades para la próxima salida al campo, con el porqué
        de cada una desglosado y con los pesos a la vista.
     3. Los vacíos que no se ven en el mapa: tipos con una sola accesión, sin
        duplicado de seguridad, sólo en banco de campo o sólo in situ, y las
        franjas altitudinales intermedias sin nada.

   Más el conjunto mínimo de celdas que captura toda la diversidad, que sirve
   tanto para priorizar sitios in situ como para saber cuánto se perdería
   cerrando una localidad. */

(function () {

  const view = {
    size: 1,
    scope: 'mx',
    cls: 'species',
    weights: Object.assign({}, GAPS.DEFAULT_WEIGHTS),
    topN: 25,
    show: 'priority',   /* priority | distance | richness */
  };
  let G = null;

  const cv = n => B4.paint(n);   /* referencias al tema: la figura cambia sola con él */
  const ramp = t => B4.ramp(t);

  /* ============ el mapa de vacíos ============ */
  function gapMap(W, H) {
    const bbox = view.scope === 'world' ? GEO.WORLD_BBOX : GEO.MX_BBOX;
    const proj = GEO.projection(bbox, W, H, 10);
    const g = [`<rect x="0" y="0" width="${W}" height="${H}" fill="${cv('--bg-soft')}"/>`];

    /* el territorio */
    if (view.scope === 'world') {
      GEO.WORLD.forEach(c => {
        const d = GEO.ringsToPath(c.rings, proj, bbox);
        if (d) g.push(`<path d="${d}" fill="${cv('--card-bg')}" stroke="${cv('--border-strong')}" stroke-width="0.5" fill-rule="evenodd"/>`);
      });
    } else {
      GEO.MX.forEach(s => {
        const d = GEO.ringsToPath(s.rings, proj, bbox);
        if (d) g.push(`<path d="${d}" fill="${cv('--card-bg')}" stroke="${cv('--border-strong')}" stroke-width="0.6" fill-rule="evenodd"/>`);
      });
    }

    /* las celdas */
    const maxScore = Math.max(1, ...G.allPriorities.map(c => c.score));
    const maxDist = Math.max(1, ...G.empty.map(c => c.dist).filter(isFinite));
    const maxRich = Math.max(1, ...G.filled.map(c => c.types.size));
    G.cells.forEach(c => {
      const x = proj.X(c.i * c.size), y = proj.Y((c.j + 1) * c.size);
      const w = Math.abs(proj.X((c.i + 1) * c.size) - x), h = Math.abs(proj.Y(c.j * c.size) - y);
      let fill = 'none', op = 0.8, stroke = cv('--border');
      if (c.n > 0) {
        fill = view.show === 'richness' ? ramp(0.2 + 0.8 * c.types.size / maxRich) : cv('--s3');
        op = view.show === 'richness' ? 0.85 : 0.55;
      } else if (view.show === 'distance') {
        fill = isFinite(c.dist) ? ramp(0.1 + 0.9 * Math.min(1, c.dist / maxDist)) : 'none';
      } else if (view.show === 'priority') {
        fill = isFinite(c.score) ? ramp(0.1 + 0.9 * c.score / maxScore) : 'none';
      }
      const title = c.n > 0
        ? `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)} · ${c.n} ${T('accesiones', 'accessions')} · ${c.types.size} ${T('tipos', 'types')}`
        : `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)} · ${T('vacía', 'empty')} · ${fmt(c.dist, 0)} km${isFinite(c.score) ? ` · ${fmt(c.score, 0)} ${T('pts', 'pts')}` : ''}`;
      g.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="0.4"><title>${esc(title)}</title></rect>`);
    });

    /* las celdas ocupadas se marcan siempre con un punto, para no confundirlas */
    G.filled.forEach(c => {
      g.push(`<circle cx="${proj.X(c.lon).toFixed(1)}" cy="${proj.Y(c.lat).toFixed(1)}" r="2" fill="${cv('--s3')}" opacity="0.9"/>`);
    });

    /* las diez primeras prioridades, numeradas */
    G.priorities.slice(0, 10).forEach((c, i) => {
      const x = proj.X(c.lon), y = proj.Y(c.lat);
      g.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${cv('--accent')}" fill-opacity="0.92" stroke="${cv('--card-bg')}" stroke-width="1.4"/>`);
      g.push(`<text x="${x.toFixed(1)}" y="${(y + 3.4).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${cv('--card-bg')}">${i + 1}</text>`);
    });

    const sb = GEO.scaleBar(proj, Math.min(140, W * 0.22));
    g.push(`<g transform="translate(${W - sb.px - 26},${H - 22})">
      <line x1="0" y1="0" x2="${sb.px.toFixed(1)}" y2="0" stroke="${cv('--text')}" stroke-width="2"/>
      <text x="${(sb.px / 2).toFixed(1)}" y="-5" text-anchor="middle" font-size="9.5" fill="${cv('--text')}">${fmtInt(sb.km)} km</text></g>`);

    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* curva de complementariedad: cuántos tipos capturan las primeras k celdas */
  function compCurve(W, H) {
    const o = G.complementarity.order;
    if (o.length < 2) return `<div class="sim-empty">${T('hacen falta más celdas con colectas', 'more occupied cells are needed')}</div>`;
    const pad = { l: 44, r: 14, t: 12, b: 32 };
    const X = i => pad.l + (i / Math.max(1, o.length)) * (W - pad.l - pad.r);
    const Y = v => H - pad.b - (v / 100) * (H - pad.t - pad.b);
    const g = [];
    [0, 25, 50, 75, 100].forEach(v => {
      g.push(`<line x1="${pad.l}" y1="${Y(v).toFixed(1)}" x2="${W - pad.r}" y2="${Y(v).toFixed(1)}" stroke="${cv('--grid')}"/>`);
      g.push(`<text x="${pad.l - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="${cv('--text-muted')}">${v}%</text>`);
    });
    const pts = o.map((e, i) => `${X(i + 1).toFixed(1)},${Y(e.pct).toFixed(1)}`);
    g.push(`<path d="M${X(0).toFixed(1)},${Y(0).toFixed(1)} L${pts.join(' L')}" fill="none" stroke="${cv('--s1')}" stroke-width="2.2"/>`);
    /* dónde se llega al 90 % */
    const k90 = o.findIndex(e => e.pct >= 90) + 1;
    if (k90 > 0) {
      g.push(`<line x1="${X(k90).toFixed(1)}" y1="${pad.t}" x2="${X(k90).toFixed(1)}" y2="${H - pad.b}" stroke="${cv('--s2')}" stroke-dasharray="4 4"/>`);
      g.push(`<text x="${(X(k90) + 5).toFixed(1)}" y="${pad.t + 12}" font-size="10" fill="${cv('--s2')}">${T(`${k90} celdas = 90 %`, `${k90} cells = 90%`)}</text>`);
    }
    g.push(`<text x="${(pad.l + W - pad.r) / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${T('celdas ordenadas por lo que aportan', 'cells ordered by what they add')}</text>`);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`;
  }

  /* ============ interfaz ============ */
  function run() {
    G = GAPS.analyse(state.acc, {
      size: view.size, scope: view.scope, classMode: view.cls,
      weights: view.weights, topN: view.topN,
    });
    if (el('panel-6')) render();
    return G;
  }

  const FLAGS = {
    single: { es: 'una sola accesión', en: 'a single accession', c: 'bad' },
    noDuplicate: { es: 'sin duplicado de seguridad', en: 'no safety duplicate', c: 'warn' },
    onlyField: { es: 'sólo en banco de campo', en: 'only in a field collection', c: 'warn' },
    onlyInSitu: { es: 'sólo in situ, sin respaldo ex situ', en: 'only in situ, no ex-situ backup', c: 'bad' },
    noCoords: { es: 'sin coordenadas', en: 'no coordinates', c: 'warn' },
    oneSite: { es: 'todo de una sola localidad', en: 'all from one locality', c: 'warn' },
  };

  function render() {
    if (!state.acc.length) {
      el('b6Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      el('b6Stats').innerHTML = '';
      return;
    }
    const nRisk = G.risks.filter(r => r.weight >= 3).length;
    el('b6Stats').innerHTML = [
      { k: T('Cobertura del territorio', 'Territory covered'), v: fmt(G.coverage, 1) + ' %', d: T(`${G.filled.length} de ${G.cells.length} celdas de ${view.size}°`, `${G.filled.length} of ${G.cells.length} cells of ${view.size}°`), c: G.coverage < 25 ? 'var(--danger)' : 'var(--s3)' },
      { k: T('Celdas sin ninguna colecta', 'Cells with no collection'), v: fmtInt(G.empty.length), d: T('territorio sin representar en la colección', 'territory unrepresented in the collection'), c: 'var(--s2)' },
      { k: T('Vacío más grande', 'Largest gap'), v: fmt(Math.max(0, ...G.empty.map(c => c.dist).filter(isFinite)), 0) + ' km', d: T('a la colecta más cercana', 'to the nearest collection'), c: 'var(--s5)' },
      { k: T('Celdas que captan el 90 %', 'Cells holding 90%'), v: fmtInt(Math.max(0, G.complementarity.order.findIndex(e => e.pct >= 90) + 1)), d: T(`de ${G.complementarity.total} tipos, por complementariedad`, `of ${G.complementarity.total} types, by complementarity`), c: 'var(--s4)' },
      { k: T('Tipos en riesgo', 'Types at risk'), v: fmtInt(nRisk), d: T('una sola accesión, sin respaldo o sólo in situ', 'single accession, no backup or in situ only'), c: nRisk ? 'var(--danger)' : 'var(--s3)' },
    ].map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');

    const W = Object.assign({}, view.weights);
    const sumW = W.distance + W.richness + W.state + W.exclusive;

    el('b6Body').innerHTML = `
      <h3 class="section-title">${T('1 · El mapa de lo que falta', '1 · The map of what is missing')}</h3>
      <p class="section-sub">${T(
        `Cada cuadro es una celda de ${view.size}° cuyo centro cae en tierra. Las que tienen un punto verde ya tienen colectas; las demás están vacías, y su color dice ${view.show === 'distance' ? 'a qué distancia les queda la colecta más cercana' : view.show === 'richness' ? 'cuántos tipos hay en las ocupadas' : 'su prioridad de colecta'}. Los diez círculos numerados son las diez primeras prioridades.`,
        `Each square is a ${view.size}° cell whose centre falls on land. Those with a green dot already hold collections; the rest are empty, and their colour shows ${view.show === 'distance' ? 'how far the nearest collection is' : view.show === 'richness' ? 'how many types the occupied ones hold' : 'their collecting priority'}. The ten numbered circles are the top ten priorities.`)}</p>
      <div class="card">
        <div class="imp-row">
          <label class="inline-label">${T('Pintar', 'Paint')}<select class="sel" id="b6Show">
            <option value="priority">${T('prioridad de colecta', 'collecting priority')}</option>
            <option value="distance">${T('distancia al vecino más cercano', 'distance to nearest collection')}</option>
            <option value="richness">${T('riqueza de las celdas ocupadas', 'richness of occupied cells')}</option>
          </select></label>
          <span class="hint">${T(`${G.orphan.length} accesiones caen fuera del área analizada`, `${G.orphan.length} accessions fall outside the analysed area`)}</span>
        </div>
        <div class="map-wrap">${gapMap(900, 520)}</div>
        <div class="map-legends"><div class="map-legend">
          <span class="lg-item"><i style="background:${cv('--s3')}"></i>${T('celda con colectas', 'cell with collections')}</span>
          <span class="lg-item"><i style="background:${cv('--accent')}"></i>${T('prioridad numerada', 'numbered priority')}</span>
          <div class="legend-ramp">${[...Array(6)].map((_, i) => `<i style="background:${ramp(0.1 + 0.9 * i / 5)}"></i>`).join('')}</div>
          <div class="legend-ends"><span>${T('menos', 'less')}</span><span>${T('más', 'more')}</span></div>
        </div></div>
      </div>

      <h3 class="section-title">${T('2 · A dónde ir la próxima vez', '2 · Where to go next time')}</h3>
      <p class="section-sub">${T(
        'La prioridad de cada celda vacía es la suma de cuatro cosas, y cada una se puede pesar distinto según lo que busques. Si vas tras material nuevo, sube la distancia; si vas tras diversidad, sube la riqueza del vecindario; si quieres equilibrar la colección entre estados, sube el déficit de la entidad. La tabla trae las coordenadas del centro de cada celda, listas para cargarlas en el GPS.',
        'The priority of each empty cell is the sum of four things, and each can be weighted differently depending on what you are after. If you want new material, raise the distance; if you want diversity, raise neighbourhood richness; if you want to balance the collection across states, raise the state deficit. The table carries the coordinates of each cell centre, ready for a GPS.')}</p>
      <div class="card">
        <div class="field-grid">
          ${[['distance', T('Lejanía de la colecta más cercana', 'Distance to nearest collection')],
             ['richness', T('Riqueza del vecindario', 'Neighbourhood richness')],
             ['state', T('Déficit de la entidad', 'State deficit')],
             ['exclusive', T('Tipos exclusivos cerca', 'Exclusive types nearby')]].map(([k, lab]) => `
            <div class="slider-row"><label>${esc(lab)}</label>
              <input type="range" id="b6w_${k}" min="0" max="60" step="5" value="${W[k]}">
              <span class="range-val">${W[k]} (${fmt(100 * W[k] / sumW, 0)} %)</span></div>`).join('')}
        </div>
        <div class="table-wrap" style="max-height:420px;overflow:auto;margin-top:12px">
          <table class="tbl"><thead><tr>
            <th>#</th><th>${T('Centro de la celda', 'Cell centre')}</th><th>${T('Entidad', 'State')}</th>
            <th class="num">${T('Al vecino', 'To nearest')}</th><th class="num">${T('Riqueza cerca', 'Richness nearby')}</th>
            <th class="num">${T('Puntos', 'Score')}</th><th>${T('Por qué', 'Why')}</th>
          </tr></thead><tbody>
          ${G.priorities.map((c, i) => {
            const st = GEO.MX_BY_CODE[c.stateCode];
            const barra = [['dist', 'var(--s1)'], ['rich', 'var(--s3)'], ['state', 'var(--s2)'], ['excl', 'var(--s7)']]
              .map(([k, col]) => `<i style="width:${(100 * c.parts[k] / Math.max(1, c.score)).toFixed(1)}%;background:${col}"></i>`).join('');
            return `<tr>
              <td><b>${i + 1}</b></td>
              <td class="mono">${fmt(c.lat, 3)}, ${fmt(c.lon, 3)}</td>
              <td>${esc(st ? st.name : (c.countryCode || '—'))}</td>
              <td class="num">${fmt(c.dist, 0)} km</td>
              <td class="num">${c.nbRichness || 0}</td>
              <td class="num"><b>${fmt(c.score, 0)}</b></td>
              <td><span class="prio-bar">${barra}</span></td>
            </tr>`;
          }).join('')}
          </tbody></table>
        </div>
        <div class="map-legends" style="margin-top:8px"><div class="map-legend">
          <span class="lg-item"><i style="background:var(--s1)"></i>${T('lejanía', 'distance')}</span>
          <span class="lg-item"><i style="background:var(--s3)"></i>${T('riqueza cerca', 'richness nearby')}</span>
          <span class="lg-item"><i style="background:var(--s2)"></i>${T('déficit de la entidad', 'state deficit')}</span>
          <span class="lg-item"><i style="background:var(--s7)"></i>${T('exclusivos cerca', 'exclusive types nearby')}</span>
        </div></div>
        <div class="imp-row" style="margin-top:10px">
          <button class="btn btn-secondary btn-sm" id="b6CSV">${T('Ruta de colecta en CSV', 'Collecting route as CSV')}</button>
          <button class="btn btn-ghost btn-sm" id="b6SVG">${T('Mapa en SVG', 'Map as SVG')}</button>
        </div>
      </div>

      <h3 class="section-title">${T('3 · Lo que ya tienes y puedes perder', '3 · What you already have and could lose')}</h3>
      <p class="section-sub">${T(
        'Los vacíos que no se ven en un mapa. Un tipo con una sola accesión, sin duplicado de seguridad o que sólo existe en el banco de campo está a un accidente de desaparecer del catálogo; uno que sólo está in situ depende de que la parcela siga sembrándose.',
        'The gaps a map does not show. A type with a single accession, without a safety duplicate, or living only in the field collection is one accident away from leaving the catalogue; one that exists only in situ depends on that field still being sown.')}</p>
      <div class="card">
        <div class="table-wrap" style="max-height:420px;overflow:auto">
          <table class="tbl"><thead><tr>
            <th>${T('Tipo', 'Type')}</th><th class="num">${T('Accesiones', 'Accessions')}</th>
            <th class="num">${T('Entidades', 'States')}</th><th>${T('Rutas', 'Routes')}</th><th>${T('Riesgos', 'Risks')}</th>
          </tr></thead><tbody>
          ${G.risks.filter(r => r.flags.length).slice(0, 40).map(r => `<tr>
            <td><i class="sci">${esc(r.type)}</i></td>
            <td class="num">${r.n}</td><td class="num">${r.sites}</td>
            <td>${r.routes.map(x => { const h = MCPD.GPCONS.find(y => y.c === x); return esc(h ? T(h.es, h.en) : x); }).join(', ') || '—'}</td>
            <td>${r.flags.map(f => `<span class="tag ${FLAGS[f].c}">${esc(T(FLAGS[f].es, FLAGS[f].en))}</span>`).join(' ')}</td>
          </tr>`).join('')}
          </tbody></table>
        </div>
        ${G.elevation.gaps.length ? `<div class="note-warn" style="margin-top:12px">${T(
          `<b>Franjas altitudinales sin nada.</b> Entre ${fmtInt(G.elevation.bands[0].from)} y ${fmtInt(G.elevation.bands[G.elevation.bands.length - 1].to)} m hay ${G.elevation.gaps.length} ${G.elevation.gaps.length === 1 ? 'franja' : 'franjas'} de 500 m sin ninguna accesión: ${G.elevation.gaps.map(b => `${fmtInt(b.from)}–${fmtInt(b.to)}`).join(', ')} m. Son ambientes intermedios que la colección se está saltando.${G.elevation.dropped ? ` (Se dejaron fuera ${G.elevation.dropped} altitudes imposibles; corrígelas en el Bloque 3.)` : ''}`,
          `<b>Empty elevation belts.</b> Between ${fmtInt(G.elevation.bands[0].from)} and ${fmtInt(G.elevation.bands[G.elevation.bands.length - 1].to)} m there are ${G.elevation.gaps.length} 500 m ${G.elevation.gaps.length === 1 ? 'belt' : 'belts'} with no accession at all: ${G.elevation.gaps.map(b => `${fmtInt(b.from)}–${fmtInt(b.to)}`).join(', ')} m. Those are intermediate environments the collection is skipping.${G.elevation.dropped ? ` (${G.elevation.dropped} impossible elevations were left out; fix them in Block 3.)` : ''}`)}</div>` : ''}
      </div>

      <h3 class="section-title">${T('4 · El mínimo indispensable', '4 · The indispensable minimum')}</h3>
      <p class="section-sub">${T(
        'Por complementariedad: si sólo pudieras conservar unas cuantas localidades, ¿cuáles captarían más diversidad? La curva añade celdas una a una, empezando siempre por la que más aporta. Sirve para priorizar sitios in situ y para ver cuánto se perdería si se cerrara una localidad.',
        'By complementarity: if you could only keep a few localities, which ones would capture the most diversity? The curve adds cells one at a time, always starting with the one that contributes most. It helps to prioritize in-situ sites and to see how much would be lost by closing a locality.')}</p>
      <div class="card"><div class="sum-grid">
        <div class="pg-pane"><div class="pg-title">${T('Tipos capturados según cuántas celdas se conserven', 'Types captured by number of cells kept')}</div>${compCurve(520, 320)}</div>
        <div class="pg-pane"><div class="pg-title">${T('Las celdas imprescindibles, en orden', 'The indispensable cells, in order')}</div>
          <div class="table-wrap" style="max-height:300px;overflow:auto"><table class="tbl"><thead><tr>
            <th>#</th><th>${T('Celda', 'Cell')}</th><th class="num">${T('Aporta', 'Adds')}</th><th class="num">${T('Acumulado', 'Cumulative')}</th>
          </tr></thead><tbody>
          ${G.complementarity.order.slice(0, 20).map((e, i) => `<tr>
            <td>${i + 1}</td><td class="mono">${esc(e.unit.label)}</td>
            <td class="num">+${e.gain}</td><td class="num">${e.cum} (${fmt(e.pct, 0)} %)</td>
          </tr>`).join('')}
          </tbody></table></div></div>
      </div></div>`;

    /* eventos */
    const sh = el('b6Show');
    if (sh) { sh.value = view.show; sh.addEventListener('change', () => { view.show = sh.value; render(); }); }
    ['distance', 'richness', 'state', 'exclusive'].forEach(k => {
      const s = el('b6w_' + k);
      if (s) s.addEventListener('change', () => { view.weights[k] = Number(s.value); runUI(); });
    });
    el('b6CSV').addEventListener('click', exportRoute);
    el('b6SVG').addEventListener('click', () => download(B4.forFile(() => gapMap(1000, 580)), 'vacios-colecta.svg', 'image/svg+xml'));
  }

  function exportRoute() {
    const rows = G.allPriorities.slice(0, 200).map((c, i) => ({
      orden: i + 1,
      latitud: Math.round(c.lat * 1e4) / 1e4,
      longitud: Math.round(c.lon * 1e4) / 1e4,
      entidad: GEO.MX_BY_CODE[c.stateCode] ? GEO.MX_BY_CODE[c.stateCode].name : '',
      pais: c.countryCode,
      km_al_vecino: Math.round(c.dist),
      riqueza_vecindario: c.nbRichness || 0,
      accesiones_vecindario: c.nbAccessions || 0,
      exclusivos_cerca: c.nbExclusive || 0,
      puntos: Math.round(c.score * 10) / 10,
      celda_grados: c.size,
    }));
    download(IO.toCSV(rows, Object.keys(rows[0] || { orden: '' })), 'prioridades-colecta.csv', 'text/csv;charset=utf-8');
  }

  function syncControls() {
    const sz = el('b6Size');
    if (sz) {
      sz.innerHTML = [0.5, 1, 2].map(v => `<option value="${v}">${v}°</option>`).join('');
      sz.value = String(view.size);
    }
    const sc = el('b6Scope');
    if (sc) {
      sc.innerHTML = [['mx', T('México', 'Mexico')], ['world', T('El mundo', 'The world')]]
        .map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
      sc.value = view.scope;
    }
    const cl = el('b6Class');
    if (cl) {
      cl.innerHTML = B5.CLASSES.map(c => `<option value="${c.k}">${esc(T(c.es, c.en))}</option>`).join('');
      cl.value = view.cls;
    }
  }

  function init() {
    if (!el('panel-6')) return;
    syncControls();
    ['b6Size', 'b6Scope', 'b6Class'].forEach(id => {
      const n = el(id);
      if (!n) return;
      n.addEventListener('change', () => {
        if (id === 'b6Size') view.size = Number(n.value);
        if (id === 'b6Scope') view.scope = n.value;
        if (id === 'b6Class') view.cls = n.value;
        runUI();
      });
    });
    run();
  }
  /* desde la interfaz, rejilla, prioridades y complementariedad van en la
     ventana de trabajo; run() sigue síncrona para las pruebas */
  function runUI() {
    return gpAfterPaint(() => { run(); }, gpWork('Buscando vacíos de colecta', 'Searching for collecting gaps'));
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('stepchange', e => { if (e.detail.step === 6) { syncControls(); runUI(); } });
  document.addEventListener('langchange', () => { if (el('panel-6')) { syncControls(); run(); } });
  document.addEventListener('themechange', () => { if (el('panel-6') && G) render(); });

  window.B6 = { run, view, analysis: () => G, gapMap, compCurve, FLAGS };
})();
