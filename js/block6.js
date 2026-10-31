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
  const pl = (n, uno, varios) => (n === 1 ? uno : varios);

  /* el nombre de una unidad del territorio: entidad de México o país */
  function unitName(code, scope) {
    if (!code) return '';
    if (scope !== 'world') { const s = GEO.MX_BY_CODE[code]; return s ? s.name : code; }
    const c = MCPD.COUNTRY_MAP && MCPD.COUNTRY_MAP[code];
    return c ? T(c.es, c.en) : code;
  }
  /* lo que se lee en la columna «Entidad» (o «País»): la unidad con más tierra en la celda */
  function cellPlace(c) {
    const main = view.scope === 'world'
      ? (c.countryCode === 'MEX' && c.stateCode ? `${unitName(c.stateCode, 'mx')} (${unitName('MEX', 'world')})` : unitName(c.countryCode, 'world'))
      : unitName(c.stateCode, 'mx');
    const others = [...(c.shares || new Map()).entries()].sort((a, b) => b[1] - a[1])
      .map(([code]) => code).filter(code => code !== (view.scope === 'world' ? c.countryCode : c.stateCode));
    return { main: main || '—', others: others.map(code => unitName(code, view.scope)) };
  }
  const isTaxon = () => view.cls === 'species' || view.cls === 'genus';
  /* el nombre de una ruta de conservación en el idioma de la interfaz (no su código) */
  function routeName(x) { const h = MCPD.GPCONS.find(y => y.c === x); return h ? T(h.es, h.en) : x; }

  /* las diez prioridades numeradas, sin que se tapen: si un círculo choca con
     otro ya puesto, se aparta en espiral y una línea fina lo une con su celda */
  function placeMarkers(list, proj, W, H, r) {
    const placed = [];
    return list.map(c => {
      const x0 = proj.X(c.lon), y0 = proj.Y(c.lat);
      const free = (x, y) => x > r + 2 && x < W - r - 2 && y > r + 2 && y < H - r - 2
        && placed.every(p => Math.hypot(p.x - x, p.y - y) >= 2 * r + 3);
      let x = x0, y = y0;
      if (!free(x, y)) {
        let found = false;
        for (let ring = 1; ring <= 12 && !found; ring++) {
          const rad = ring * (r + 4);
          for (let a = 0; a < 12; a++) {
            const ang = -Math.PI / 2 + a * Math.PI / 6;
            const xx = x0 + rad * Math.cos(ang), yy = y0 + rad * Math.sin(ang);
            if (free(xx, yy)) { x = xx; y = yy; found = true; break; }
          }
        }
      }
      const m = { c, x, y, x0, y0, moved: Math.hypot(x - x0, y - y0) > 0.5 };
      placed.push(m);
      return m;
    });
  }

  /* ============ el mapa de vacíos ============ */
  function gapMap(W, H) {
    let bbox = view.scope === 'world' ? GEO.WORLD_BBOX : GEO.MX_BBOX;
    /* las celdas de la orilla rebasan el recuadro del país: el mapa se abre lo necesario para que quepan */
    if (view.scope !== 'world' && G.cells.length) {
      bbox = GEO.unionBBox(bbox, [Math.min(...G.cells.map(c => c.i * c.size)), Math.min(...G.cells.map(c => c.j * c.size)),
        Math.max(...G.cells.map(c => (c.i + 1) * c.size)), Math.max(...G.cells.map(c => (c.j + 1) * c.size))]);
    }
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
        ? `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)} · ${fmtInt(c.n)} ${T(pl(c.n, 'accesión', 'accesiones'), pl(c.n, 'accession', 'accessions'))} · ${fmtInt(c.types.size)} ${T(pl(c.types.size, 'tipo', 'tipos'), pl(c.types.size, 'type', 'types'))}`
        : `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)} · ${T('vacía', 'empty')} · ${fmt(c.dist, 0)} km${isFinite(c.score) ? ` · ${fmt(c.score, 0)} ${T('pts', 'pts')}` : ''}`;
      g.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="0.4"><title>${esc(title)}</title></rect>`);
    });

    /* las celdas ocupadas se marcan siempre con un punto, para no confundirlas */
    G.filled.forEach(c => {
      g.push(`<circle cx="${proj.X(c.lon).toFixed(1)}" cy="${proj.Y(c.lat).toFixed(1)}" r="2" fill="${cv('--s3')}" opacity="0.9"/>`);
    });

    /* las diez primeras prioridades, numeradas: círculo claro con borde oscuro,
       que no se confunde con el ocre de la rampa */
    const marks = placeMarkers(G.priorities.slice(0, 10), proj, W, H, 9);
    marks.filter(m => m.moved).forEach(m => {
      g.push(`<line x1="${m.x0.toFixed(1)}" y1="${m.y0.toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${m.y.toFixed(1)}" stroke="${cv('--text')}" stroke-width="0.9"/>`);
      g.push(`<circle cx="${m.x0.toFixed(1)}" cy="${m.y0.toFixed(1)}" r="1.8" fill="${cv('--text')}"/>`);
    });
    marks.forEach((m, i) => {
      g.push(`<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="9" fill="${cv('--card-bg')}" stroke="${cv('--text')}" stroke-width="1.8"><title>${esc(`${i + 1} · ${fmt(m.c.lat, 2)}, ${fmt(m.c.lon, 2)} · ${cellPlace(m.c).main}`)}</title></circle>`);
      g.push(`<text x="${m.x.toFixed(1)}" y="${(m.y + 3.4).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${cv('--text')}">${i + 1}</text>`);
    });

    const sb = GEO.scaleBar(proj, Math.min(140, W * 0.22));
    g.push(`<g transform="translate(${W - sb.px - 26},${H - 22})">
      <line x1="0" y1="0" x2="${sb.px.toFixed(1)}" y2="0" stroke="${cv('--text')}" stroke-width="2"/>
      <text x="${(sb.px / 2).toFixed(1)}" y="-5" text-anchor="middle" font-size="9.5" fill="${cv('--text')}">${fmtInt(sb.km)} km</text></g>`);

    const what = view.show === 'distance' ? T('distancia de cada celda vacía a la colecta más cercana', 'distance from each empty cell to the nearest collection')
      : view.show === 'richness' ? T('riqueza de las celdas ocupadas', 'richness of the occupied cells')
      : T('prioridad de colecta de cada celda vacía', 'collecting priority of each empty cell');
    const label = T(
      `Mapa de vacíos de colecta en celdas de ${fmt(view.size, view.size < 1 ? 1 : 0)}°: ${fmtInt(G.filled.length)} de ${fmtInt(G.cells.length)} celdas con colectas; el color muestra la ${what}; los círculos numerados son las ${Math.min(10, G.priorities.length)} primeras prioridades.`,
      `Map of collecting gaps in ${fmt(view.size, view.size < 1 ? 1 : 0)}° cells: ${fmtInt(G.filled.length)} of ${fmtInt(G.cells.length)} cells hold collections; colour shows the ${what}; the numbered circles are the top ${Math.min(10, G.priorities.length)} priorities.`);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif" role="img" aria-label="${esc(label)}">${g.join('')}</svg>`;
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
      const p90 = o[k90 - 1].pct;
      const txt = T(`${k90} ${pl(k90, 'celda', 'celdas')} ≥ 90 % (${fmt(p90, 0)} %)`, `${k90} ${pl(k90, 'cell', 'cells')} ≥ 90% (${fmt(p90, 0)}%)`);
      /* la etiqueta se pone del lado donde cabe: a la izquierda de la línea si
         ésta queda en la mitad derecha de la figura */
      const left = X(k90) > (pad.l + W - pad.r) / 2;
      g.push(`<line x1="${X(k90).toFixed(1)}" y1="${pad.t}" x2="${X(k90).toFixed(1)}" y2="${H - pad.b}" stroke="${cv('--s2')}" stroke-dasharray="4 4"/>`);
      g.push(`<text x="${(X(k90) + (left ? -5 : 5)).toFixed(1)}" y="${(Y(37.5) + 4).toFixed(1)}" text-anchor="${left ? 'end' : 'start'}" font-size="10" fill="${cv('--s2')}">${txt}</text>`);
    }
    g.push(`<text x="${(pad.l + W - pad.r) / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="${cv('--text-muted')}">${T('celdas ordenadas por lo que aportan', 'cells ordered by what they add')}</text>`);
    const label = T(
      `Curva de complementariedad: ${o.length} ${pl(o.length, 'celda captura', 'celdas capturan')} los ${G.complementarity.covered} tipos${k90 > 0 ? `; con ${k90} se llega a ${fmt(o[k90 - 1].pct, 0)} %` : ''}.`,
      `Complementarity curve: ${o.length} ${pl(o.length, 'cell captures', 'cells capture')} the ${G.complementarity.covered} types${k90 > 0 ? `; ${k90} reach ${fmt(o[k90 - 1].pct, 0)}%` : ''}.`);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif" role="img" aria-label="${esc(label)}">${g.join('')}</svg>`;
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
    onlyDNA: { es: 'sólo como ADN: no regenera planta', en: 'only as DNA: cannot regrow a plant', c: 'bad' },
    noCoords: { es: 'sin coordenadas', en: 'no coordinates', c: 'warn' },
    oneSite: { es: 'todo de una sola entidad o país', en: 'all from one state or country', c: 'warn' },
  };

  function render() {
    if (!state.acc.length) {
      el('b6Body').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      el('b6Stats').innerHTML = '';
      return;
    }
    const nRisk = G.risks.filter(r => r.weight >= 3).length;
    const world = view.scope === 'world';
    const sizeTxt = fmt(view.size, view.size < 1 ? 1 : 0);
    const nSamp = world ? (view.size >= 1 ? 9 : 4) : 25;   /* puntos que se prueban por celda (gaps.js areaGrid) */
    const finite = G.empty.filter(c => isFinite(c.dist));
    const far = finite.length ? finite.reduce((a, b) => (b.dist > a.dist ? b : a)) : null;
    const k90 = G.complementarity.order.findIndex(e => e.pct >= 90) + 1;
    el('b6Stats').innerHTML = [
      { k: T('Cobertura del territorio', 'Territory covered'), v: fmt(G.coverage, 1) + ' %', d: T(`${fmtInt(G.filled.length)} de ${fmtInt(G.cells.length)} celdas de ${sizeTxt}°`, `${fmtInt(G.filled.length)} of ${fmtInt(G.cells.length)} cells of ${sizeTxt}°`), c: G.coverage < 25 ? 'var(--danger)' : 'var(--s3)' },
      { k: T('Celdas sin ninguna colecta', 'Cells with no collection'), v: fmtInt(G.empty.length), d: T('territorio sin representar en la colección', 'territory unrepresented in the collection'), c: 'var(--s2)' },
      { k: T('Vacío más grande', 'Largest gap'), v: (far ? fmtInt(far.dist) : '0') + ' km',
        d: far ? T(`de la celda ${fmt(far.lat, 2)}, ${fmt(far.lon, 2)} (${esc(cellPlace(far).main)}) a la colecta más cercana`, `from cell ${fmt(far.lat, 2)}, ${fmt(far.lon, 2)} (${esc(cellPlace(far).main)}) to the nearest collection`) : T('a la colecta más cercana', 'to the nearest collection'), c: 'var(--s5)' },
      { k: T('Celdas que captan <span style="white-space:nowrap">≥&nbsp;90&nbsp;%</span>', 'Cells holding <span style="white-space:nowrap">≥&nbsp;90%</span>'), v: fmtInt(Math.max(0, k90)), d: k90 > 0 ? T(`juntan el ${fmt(G.complementarity.order[k90 - 1].pct, 0)} % de ${fmtInt(G.complementarity.total)} tipos, por complementariedad`, `together hold ${fmt(G.complementarity.order[k90 - 1].pct, 0)}% of ${fmtInt(G.complementarity.total)} types, by complementarity`) : T(`de ${fmtInt(G.complementarity.total)} tipos, por complementariedad`, `of ${fmtInt(G.complementarity.total)} types, by complementarity`), c: 'var(--s4)' },
      { k: T('Tipos en riesgo', 'Types at risk'), v: fmtInt(nRisk), d: T('una sola accesión, sin respaldo, sólo in situ o sólo ADN', 'single accession, no backup, in situ only or DNA only'), c: nRisk ? 'var(--danger)' : 'var(--s3)' },
    ].map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');

    const W = Object.assign({}, view.weights);
    const sumW = W.distance + W.richness + W.state + W.exclusive;
    const nOut = G.orphan.length;

    /* la leyenda y la rampa cambian con lo que se pinta, y dicen qué miden y entre qué valores */
    const scores = G.allPriorities.map(c => c.score).filter(isFinite);
    const rich = G.filled.map(c => c.types.size);
    const dists = G.empty.map(c => c.dist).filter(isFinite);
    const rampInfo = view.show === 'richness'
      ? { what: T('tipos por celda ocupada', 'types per occupied cell'), lo: rich.length ? fmtInt(Math.min(...rich)) : '—', hi: rich.length ? fmtInt(Math.max(...rich)) : '—', t0: 0.2 }
      : view.show === 'distance'
        ? { what: T('km de la celda vacía a la colecta más cercana', 'km from the empty cell to the nearest collection'), lo: dists.length ? fmtInt(Math.min(...dists)) : '—', hi: dists.length ? fmtInt(Math.max(...dists)) : '—', t0: 0.1 }
        : { what: T('puntos de prioridad de la celda vacía', 'priority points of the empty cell'), lo: scores.length ? fmtInt(Math.min(...scores)) : '—', hi: scores.length ? fmtInt(Math.max(...scores)) : '—', t0: 0.1 };
    const legendItems = view.show === 'richness'
      ? `<span class="lg-item"><i style="background:transparent;border:1px solid ${cv('--border')}"></i>${T('celda vacía (sin color)', 'empty cell (no colour)')}</span>`
      : `<span class="lg-item"><i style="background:${cv('--s3')}"></i>${T('celda con colectas', 'cell with collections')}</span>`;

    const shown = G.risks.filter(r => r.flags.length);
    const MAXR = 40;

    el('b6Body').innerHTML = `
      <h3 class="section-title">${T('1 · El mapa de lo que falta', '1 · The map of what is missing')}</h3>
      <p class="section-sub">${T(
        `Cada cuadro es una celda de ${sizeTxt}° que toca tierra ${world ? 'de algún país' : 'de alguna entidad'} (se prueban ${nSamp} puntos repartidos en ella, no sólo el centro), o que contiene alguna accesión. Las que tienen un punto verde ya tienen colectas; las demás están vacías. ${view.show === 'distance' ? 'El color de las vacías dice a qué distancia les queda la colecta más cercana' : view.show === 'richness' ? 'Aquí el color va en las ocupadas y dice cuántos tipos tiene cada una; las vacías quedan sin color' : 'El color de las vacías dice su prioridad de colecta'}. Los diez círculos numerados son las diez primeras prioridades; si dos quedan encimados, uno se aparta y una línea lo une con su celda.`,
        `Each square is a ${sizeTxt}° cell that touches the land of ${world ? 'some country' : 'some state'} (${nSamp} points spread over it are tested, not just its centre), or that holds an accession. Those with a green dot already hold collections; the rest are empty. ${view.show === 'distance' ? 'The colour of the empty ones shows how far the nearest collection is' : view.show === 'richness' ? 'Here the colour goes on the occupied cells and shows how many types each holds; empty cells stay uncoloured' : 'The colour of the empty ones shows their collecting priority'}. The ten numbered circles are the top ten priorities; when two would overlap, one is moved aside and a line joins it to its cell.`)}</p>
      <div class="card">
        <div class="imp-row">
          <label class="inline-label">${T('Pintar', 'Paint')}<select class="sel" id="b6Show">
            <option value="priority">${T('prioridad de colecta', 'collecting priority')}</option>
            <option value="distance">${T('distancia al vecino más cercano', 'distance to nearest collection')}</option>
            <option value="richness">${T('riqueza de las celdas ocupadas', 'richness of occupied cells')}</option>
          </select></label>
          ${nOut > 0 ? `<span class="hint">${T(
            `${fmtInt(nOut)} ${pl(nOut, 'accesión cae', 'accesiones caen')} fuera del área analizada`,
            `${fmtInt(nOut)} ${pl(nOut, 'accession falls', 'accessions fall')} outside the analysed area`)}</span>` : ''}
        </div>
        <div class="map-wrap">${gapMap(900, 520)}</div>
        <div class="map-legends"><div class="map-legend">
          ${legendItems}
          <span class="lg-item"><i style="background:${cv('--card-bg')};border:1.8px solid ${cv('--text')};border-radius:50%"></i>${T('prioridad numerada', 'numbered priority')}</span>
          <div class="legend-scale"><div class="legend-title">${esc(rampInfo.what)}</div><div class="legend-ramp">${[...Array(6)].map((_, i) => `<i style="background:${ramp(rampInfo.t0 + (1 - rampInfo.t0) * i / 5)}"></i>`).join('')}</div>
          <div class="legend-ends"><span>${T('mín.', 'min')} ${rampInfo.lo}</span><span>${T('máx.', 'max')} ${rampInfo.hi}</span></div></div>
        </div></div>
      </div>

      <h3 class="section-title">${T('2 · A dónde ir la próxima vez', '2 · Where to go next time')}</h3>
      <p class="section-sub">${T(
        `La prioridad de cada celda vacía es la suma de cuatro cosas, y cada una se puede pesar distinto según lo que busques. Si vas tras material nuevo, sube la distancia; si vas tras diversidad, sube la riqueza del vecindario; si quieres equilibrar la colección entre ${world ? 'países' : 'estados'}, sube el déficit ${world ? 'del país' : 'de la entidad'}: accesiones cuyo propio punto cae en ${world ? 'el país' : 'la entidad'} entre su superficie, comparado con ${world ? 'el país mejor cubierto' : 'la entidad mejor cubierta'} (en una celda que comparten varias, cada una pesa por la tierra que ocupa). El vecindario de una celda son las celdas a unos ${fmtInt(GAPS.NEIGHBOUR_KM)} km o menos (${G.opts.radius} ${pl(G.opts.radius, 'celda', 'celdas')} de ${sizeTxt}° hacia cada lado), sea cual sea el tamaño de celda. A igual puntaje, va primero la celda con más riqueza alrededor y, si sigue el empate, la más lejana. La tabla trae las coordenadas del centro de cada celda, listas para cargarlas en el GPS.`,
        `The priority of each empty cell is the sum of four things, and each can be weighted differently depending on what you are after. If you want new material, raise the distance; if you want diversity, raise neighbourhood richness; if you want to balance the collection across ${world ? 'countries' : 'states'}, raise the ${world ? 'country' : 'state'} deficit: accessions whose own point falls in the ${world ? 'country' : 'state'} divided by its area, compared with the best covered one (in a cell shared by several, each weighs by the land it occupies). The neighbourhood of a cell is the cells within about ${fmtInt(GAPS.NEIGHBOUR_KM)} km (${G.opts.radius} ${pl(G.opts.radius, 'cell', 'cells')} of ${sizeTxt}° each way), whatever the cell size. On equal scores, the cell with more richness around goes first and, if still tied, the farthest one. The table carries the coordinates of each cell centre, ready for a GPS.`)}</p>
      <div class="card">
        <div class="field-grid b6-weights">
          ${[['distance', T('Lejanía de la colecta más cercana', 'Distance to nearest collection')],
             ['richness', T('Riqueza del vecindario', 'Neighbourhood richness')],
             ['state', world ? T('Déficit del país', 'Country deficit') : T('Déficit de la entidad', 'State deficit')],
             ['exclusive', T('Tipos exclusivos cerca', 'Exclusive types nearby')]].map(([k, lab]) => `
            <div class="slider-row"><label for="b6w_${k}">${esc(lab)}</label>
              <input type="range" id="b6w_${k}" min="0" max="60" step="5" value="${W[k]}">
              <span class="range-val">${W[k]} (${sumW > 0 ? fmt(100 * W[k] / sumW, 0) : '0'} %)</span></div>`).join('')}
        </div>
        ${G.weightsZero ? `<div class="note-warn" style="margin-top:12px">${T(
          '<b>Todos los pesos están en cero.</b> Sin nada que pesar no hay índice de prioridad, y ordenar las celdas así sería inventar un ranking: sube al menos uno de los cuatro deslizadores.',
          '<b>All the weights are zero.</b> With nothing to weigh there is no priority index, and ordering the cells that way would invent a ranking: raise at least one of the four sliders.')}</div>` : `
        <div class="table-wrap" style="max-height:420px;overflow:auto;margin-top:12px" tabindex="0" role="region" aria-label="${esc(T('Tabla de prioridades de colecta', 'Collecting priorities table'))}">
          <table class="tbl"><thead><tr>
            <th>#</th><th>${T('Centro de la celda', 'Cell centre')}</th><th>${world ? T('País', 'Country') : T('Entidad', 'State')}</th>
            <th class="num">${T('Al vecino', 'To nearest')}</th><th class="num">${T('Riqueza cerca', 'Richness nearby')}</th>
            <th class="num">${T('Puntos', 'Score')}</th><th>${T('Por qué', 'Why')}</th>
          </tr></thead><tbody>
          ${G.priorities.map((c, i) => {
            const place = cellPlace(c);
            const partes = [['dist', 'var(--s1)', T('lejanía', 'distance')], ['rich', 'var(--s3)', T('riqueza cerca', 'richness nearby')],
              ['state', 'var(--s2)', world ? T('déficit del país', 'country deficit') : T('déficit de la entidad', 'state deficit')], ['excl', 'var(--s7)', T('exclusivos cerca', 'exclusive nearby')]];
            const barra = partes.map(([k, col]) => `<i style="width:${(100 * c.parts[k] / Math.max(1, c.score)).toFixed(1)}%;background:${col}"></i>`).join('');
            const porque = partes.map(([k, , lab]) => `${lab} ${fmt(c.parts[k], 1)}`).join(' + ') + ` = ${fmt(c.score, 1)}`;
            return `<tr>
              <td><b>${i + 1}</b></td>
              <td class="mono">${fmt(c.lat, 3)}, ${fmt(c.lon, 3)}</td>
              <td${place.others.length ? ` title="${esc(T('También toca: ', 'Also touches: ') + place.others.join(', '))}"` : ''}>${esc(place.main)}${place.others.length ? ` <span class="muted">+${place.others.length}</span>` : ''}</td>
              <td class="num">${fmtInt(c.dist)} km</td>
              <td class="num">${c.nbRichness || 0}</td>
              <td class="num"><b>${fmt(c.score, 0)}</b></td>
              <td><span class="prio-bar" role="img" aria-label="${esc(porque)}" title="${esc(porque)}">${barra}</span></td>
            </tr>`;
          }).join('')}
          </tbody></table>
        </div>`}
        <div class="map-legends" style="margin-top:8px"><div class="map-legend">
          <span class="lg-item"><i style="background:var(--s1)"></i>${T('lejanía', 'distance')}</span>
          <span class="lg-item"><i style="background:var(--s3)"></i>${T('riqueza cerca', 'richness nearby')}</span>
          <span class="lg-item"><i style="background:var(--s2)"></i>${world ? T('déficit del país', 'country deficit') : T('déficit de la entidad', 'state deficit')}</span>
          <span class="lg-item"><i style="background:var(--s7)"></i>${T('exclusivos cerca', 'exclusive types nearby')}</span>
        </div></div>
        <div class="imp-row" style="margin-top:10px">
          <button class="btn btn-secondary btn-sm" id="b6CSV"${G.weightsZero ? ' disabled' : ''}>${T('Ruta de colecta en CSV', 'Collecting route as CSV')}</button>
          <button class="btn btn-ghost btn-sm" id="b6SVG">${T('Mapa en SVG', 'Map as SVG')}</button>
        </div>
      </div>

      <h3 class="section-title">${T('3 · Lo que ya tienes y puedes perder', '3 · What you already have and could lose')}</h3>
      <p class="section-sub">${T(
        'Los vacíos que no se ven en un mapa. Un tipo con una sola accesión, sin duplicado de seguridad o que sólo existe en el banco de campo está a un accidente de desaparecer del catálogo; uno que sólo está in situ depende de que la parcela siga sembrándose, y uno guardado sólo como ADN conserva la información, pero no puede volver a dar una planta. «Entidades o países» cuenta dónde cae el punto de cada accesión: la entidad si cae en México, el país si cae en otro lado.',
        'The gaps a map does not show. A type with a single accession, without a safety duplicate, or living only in the field collection is one accident away from leaving the catalogue; one that exists only in situ depends on that field still being sown, and one kept only as DNA keeps the information but can never give a plant again. “States or countries” counts where the point of each accession falls: the state if it is in Mexico, the country otherwise.')}</p>
      <div class="card">
        ${shown.length > MAXR ? `<p class="hint">${T(`Se muestran ${MAXR} de ${fmtInt(shown.length)} tipos con algún riesgo, los más graves primero; el CSV los trae todos.`, `Showing ${MAXR} of ${fmtInt(shown.length)} types with some risk, the most serious first; the CSV has them all.`)}</p>` : ''}
        <div class="table-wrap" style="max-height:420px;overflow:auto" tabindex="0" role="region" aria-label="${esc(T('Tabla de tipos en riesgo', 'Types at risk table'))}">
          <table class="tbl"><thead><tr>
            <th>${T('Tipo', 'Type')}</th><th class="num">${T('Accesiones', 'Accessions')}</th>
            <th class="num">${T('Entidades o países', 'States or countries')}</th><th>${T('Rutas', 'Routes')}</th><th>${T('Riesgos', 'Risks')}</th>
          </tr></thead><tbody>
          ${shown.slice(0, MAXR).map(r => `<tr>
            <td>${isTaxon() ? `<i class="sci">${esc(r.type)}</i>` : esc(r.type)}</td>
            <td class="num">${fmtInt(r.n)}</td><td class="num">${fmtInt(r.sites)}</td>
            <td>${r.routes.map(x => esc(routeName(x))).join(', ') || '—'}</td>
            <td>${r.flags.map(f => `<span class="tag ${FLAGS[f].c}">${esc(T(FLAGS[f].es, FLAGS[f].en))}</span>`).join(' ')}</td>
          </tr>`).join('')}
          </tbody></table>
        </div>
        <div class="imp-row" style="margin-top:10px">
          <button class="btn btn-ghost btn-sm" id="b6RiskCSV"${shown.length ? '' : ' disabled'}>${T('Tipos en riesgo en CSV', 'Types at risk as CSV')}</button>
        </div>
        ${elevationNote()}
      </div>

      <h3 class="section-title">${T('4 · El mínimo indispensable', '4 · The indispensable minimum')}</h3>
      <p class="section-sub">${T(
        'Por complementariedad: si sólo pudieras conservar unas cuantas localidades, ¿cuáles captarían más diversidad? La curva añade celdas una a una, empezando siempre por la que más aporta. Sirve para priorizar sitios in situ y para ver cuánto se perdería si se cerrara una localidad.',
        'By complementarity: if you could only keep a few localities, which ones would capture the most diversity? The curve adds cells one at a time, always starting with the one that contributes most. It helps to prioritize in-situ sites and to see how much would be lost by closing a locality.')}</p>
      <div class="card"><div class="sum-grid">
        <div class="pg-pane"><div class="pg-title">${T('Tipos capturados según cuántas celdas se conserven', 'Types captured by number of cells kept')}</div>${compCurve(520, 320)}</div>
        <div class="pg-pane"><div class="pg-title">${T('Las celdas imprescindibles, en orden', 'The indispensable cells, in order')}</div>
          <div class="table-wrap" style="max-height:300px;overflow:auto" tabindex="0" role="region" aria-label="${esc(T('Tabla de celdas imprescindibles', 'Indispensable cells table'))}"><table class="tbl"><thead><tr>
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
    el('b6RiskCSV').addEventListener('click', exportRisks);
    el('b6SVG').addEventListener('click', () => download(B4.forFile(() => gapMap(1000, 580)), 'vacios-colecta.svg', 'image/svg+xml'));
  }

  /* la nota de las franjas altitudinales vacías */
  function elevationNote() {
    const E = G.elevation;
    if (!E.gaps.length) return '';
    const ng = E.gaps.length, nd = E.dropped;
    return `<div class="note-warn" style="margin-top:12px">${T(
      `<b>Franjas altitudinales sin nada.</b> Entre ${fmtInt(E.bands[0].from)} y ${fmtInt(E.bands[E.bands.length - 1].to)} m hay ${ng} ${pl(ng, 'franja', 'franjas')} de 500 m sin ninguna accesión: ${E.gaps.map(b => `${fmtInt(b.from)}–${fmtInt(b.to)}`).join(', ')} m. Son ambientes intermedios que la colección se está saltando.${nd ? ` (Se ${pl(nd, 'dejó', 'dejaron')} fuera ${nd} ${pl(nd, 'altitud imposible', 'altitudes imposibles')}; ${pl(nd, 'corrígela', 'corrígelas')} en la ficha de la accesión, en el Bloque 2.)` : ''}`,
      `<b>Empty elevation belts.</b> Between ${fmtInt(E.bands[0].from)} and ${fmtInt(E.bands[E.bands.length - 1].to)} m there ${pl(ng, 'is', 'are')} ${ng} 500 m ${pl(ng, 'belt', 'belts')} with no accession at all: ${E.gaps.map(b => `${fmtInt(b.from)}–${fmtInt(b.to)}`).join(', ')} m. Those are intermediate environments the collection is skipping.${nd ? ` (${nd} impossible ${pl(nd, 'elevation was', 'elevations were')} left out; fix ${pl(nd, 'it', 'them')} in the accession record, in Block 2.)` : ''}`)}</div>`;
  }

  function exportRisks() {
    const rows = G.risks.filter(r => r.flags.length).map(r => ({
      tipo: r.type, accesiones: r.n, entidades_o_paises: r.sites,
      rutas: r.routes.map(routeName).join('; '), duplicados: r.dupl, con_coordenadas: r.coords,
      riesgos: r.flags.map(f => FLAGS[f] ? T(FLAGS[f].es, FLAGS[f].en) : f).join('; '), peso: r.weight,
    }));
    download(IO.toCSV(rows, Object.keys(rows[0] || { tipo: '' })), 'tipos-en-riesgo.csv', 'text/csv;charset=utf-8');
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

  window.B6 = { run, view, analysis: () => G, gapMap, compCurve, FLAGS, placeMarkers, elevationNote, cellPlace };
})();
