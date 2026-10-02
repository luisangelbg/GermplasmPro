/* GermplasmPro — Bloque 4: el mapa de colecta.

   Un mapa de verdad, dibujado en el navegador y sin conexión: los contornos
   vienen con la app (Natural Earth, dominio público), de modo que el mapa se
   ve igual en una oficina con fibra óptica que en una casa de campo sin señal,
   y ninguna coordenada de tu colección sale de tu computadora, que es un
   requisito serio cuando se trabaja con sitios de parientes silvestres o con
   parcelas de familias custodias.

   México se dibuja con sus 32 entidades; el resto del mundo, con el contorno
   de los países. Se puede pintar por encima una coropleta (accesiones o
   especies por entidad o por país) y una rejilla de celdas, que es la antesala
   de los dos bloques siguientes: la diversidad geográfica y los vacíos de
   colecta.

   Los colores se resuelven a valores literales al dibujar (no se deja ninguna
   variable CSS dentro del SVG) para que la figura exportada se vea igual fuera
   de la app. */

(function () {

  const view = {
    scope: 'auto',        /* auto | mx | world | estado (código) */
    color: 'GP_CONS',     /* variable que colorea los puntos */
    size: 'fixed',        /* fixed | stock */
    choro: 'none',        /* none | accState | spState | accCountry */
    grid: 0,              /* 0, 0.25, 0.5, 1, 2 grados */
    labels: true,
    crop: '', route: '',
    title: '',
    hover: -1,
  };
  let pts = [], lastSVG = '';

  /* ---------- colores: se leen del tema y se cachean ---------- */
  let cssCache = {}, cssTheme = '';
  function cssVar(name) {
    const th = document.documentElement.getAttribute('data-theme') || 'auto';
    if (th !== cssTheme) { cssCache = {}; cssTheme = th; }
    if (cssCache[name]) return cssCache[name];
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
    cssCache[name] = v;
    return v;
  }
  const CAT_VARS = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8', '--mzAzul', '--mzRojo', '--mzAmarillo', '--squash'];
  function catColor(i) { return cssVar(CAT_VARS[i % CAT_VARS.length]); }
  function mix(a, b, t) {
    const pa = hex(a), pb = hex(b);
    const c = pa.map((v, k) => Math.round(v + (pb[k] - v) * clamp(t, 0, 1)));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function hex(c) {
    const s = String(c).trim();
    if (s.startsWith('#')) {
      const h = s.length === 4 ? s.slice(1).split('').map(x => x + x).join('') : s.slice(1);
      return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    }
    const m = s.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [136, 136, 136];
  }
  /* rampa secuencial de la app: crema → ocre → morado */
  function ramp(t) {
    const stops = [cssVar('--bg-soft'), cssVar('--gold'), cssVar('--accent'), cssVar('--primary')];
    const x = clamp(t, 0, 1) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    return mix(stops[i], stops[i + 1], x - i);
  }

  /* ---------- qué colorea los puntos ---------- */
  const COLOR_BY = [
    { k: 'GP_CONS', es: 'Ruta de conservación', en: 'Conservation route', kind: 'cat' },
    { k: 'CROPNAME', es: 'Cultivo', en: 'Crop', kind: 'cat' },
    { k: 'TAXON', es: 'Especie', en: 'Species', kind: 'cat' },
    { k: 'SAMPSTAT', es: 'Estatus biológico', en: 'Biological status', kind: 'cat' },
    { k: 'ORIGCTY', es: 'País de origen', en: 'Country of origin', kind: 'cat' },
    { k: 'COLLSRC', es: 'Fuente de colecta', en: 'Collecting source', kind: 'cat' },
    { k: 'ELEVATION', es: 'Altitud', en: 'Elevation', kind: 'num' },
    { k: 'YEAR', es: 'Año de colecta', en: 'Collecting year', kind: 'num' },
    { k: 'none', es: 'Un solo color', en: 'A single colour', kind: 'none' },
  ];
  function valueOf(p, k) {
    const r = p.row;
    if (k === 'TAXON') return [r.GENUS, r.SPECIES].filter(Boolean).join(' ');
    if (k === 'YEAR') return Number(String(r.COLLDATE || '').slice(0, 4)) || NaN;
    if (k === 'ELEVATION') return Number(r.ELEVATION);
    return String(r[k] ?? '').trim();
  }
  function labelOf(k, v) {
    if (k === 'GP_CONS') { const h = MCPD.GPCONS.find(x => x.c === v); return h ? T(h.es, h.en) : T('sin declarar', 'not declared'); }
    if (k === 'SAMPSTAT') { const h = MCPD.SAMPSTAT.find(x => x.c === v); return h ? T(h.es, h.en) : v || '—'; }
    if (k === 'COLLSRC') { const h = MCPD.COLLSRC.find(x => x.c === v); return h ? T(h.es, h.en) : v || '—'; }
    if (k === 'ORIGCTY') { const h = MCPD.COUNTRY_MAP[v]; return h ? T(h.es, h.en) : v || '—'; }
    return v || '—';
  }

  /* ---------- selección de puntos y encuadre ---------- */
  function currentPoints() {
    let list = GEO.pointsOf(state.acc);
    if (view.crop) list = list.filter(p => (p.row.CROPNAME || '') === view.crop);
    if (view.route) list = list.filter(p => MCPD.consRoute(p.row) === view.route);
    return list;
  }
  function currentBBox() {
    if (view.scope === 'mx') return GEO.MX_BBOX;
    if (view.scope === 'world') return GEO.WORLD_BBOX;
    if (GEO.MX_BY_CODE[view.scope]) {
      const b = GEO.MX_BY_CODE[view.scope].bbox;
      const dx = (b[2] - b[0]) * 0.08, dy = (b[3] - b[1]) * 0.08;
      return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
    }
    /* automático: lo que abarcan los datos, sin quedarse más chico que un estado */
    const b = GEO.bboxOfPoints(pts.map(p => [p.lon, p.lat]), 0.15);
    const w = b[2] - b[0], h = b[3] - b[1];
    if (w < 1.5) { const c = (b[0] + b[2]) / 2; b[0] = c - 0.75; b[2] = c + 0.75; }
    if (h < 1.5) { const c = (b[1] + b[3]) / 2; b[1] = c - 0.75; b[3] = c + 0.75; }
    return b;
  }

  /* ============ el dibujo ============ */
  function drawMap(W, H) {
    pts = currentPoints();          /* así el dibujo no depende de que render() haya corrido antes */
    const bbox = currentBBox();
    const proj = GEO.projection(bbox, W, H, 10);
    const g = [];
    const cBg = cssVar('--bg-soft'), cLand = cssVar('--card-bg'), cLine = cssVar('--border-strong'),
      cText = cssVar('--text'), cMuted = cssVar('--text-muted'), cGrid = cssVar('--grid');

    g.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${cBg}"/>`);

    /* meridianos y paralelos */
    const step = (bbox[2] - bbox[0]) > 60 ? 20 : (bbox[2] - bbox[0]) > 14 ? 5 : (bbox[2] - bbox[0]) > 4 ? 2 : 1;
    const gl = [];
    for (let lon = Math.ceil(bbox[0] / step) * step; lon <= bbox[2]; lon += step) {
      gl.push(`<line x1="${proj.X(lon).toFixed(1)}" y1="0" x2="${proj.X(lon).toFixed(1)}" y2="${H}"/>`);
    }
    for (let lat = Math.ceil(bbox[1] / step) * step; lat <= bbox[3]; lat += step) {
      gl.push(`<line x1="0" y1="${proj.Y(lat).toFixed(1)}" x2="${W}" y2="${proj.Y(lat).toFixed(1)}"/>`);
    }
    g.push(`<g stroke="${cGrid}" stroke-width="1">${gl.join('')}</g>`);

    /* tierra: países del mundo y, encima, las entidades de México */
    const wide = (bbox[2] - bbox[0]) > 45;   /* a esta escala México ya no se pinta por entidades */
    const choroC = view.choro === 'accCountry' ? GEO.countByCountry(pts) : null;
    const choroS = (view.choro === 'accState' || view.choro === 'spState') ? GEO.countByState(pts) : null;
    let maxC = 1, maxS = 1;
    if (choroC) maxC = Math.max(1, ...[...choroC.values()].map(v => v.n));
    if (choroS) maxS = Math.max(1, ...[...choroS.values()].map(v => view.choro === 'spState' ? speciesIn(v.items) : v.n));

    const worldPaths = [];
    for (const c of GEO.WORLD) {
      if (c.bbox[2] < bbox[0] || c.bbox[0] > bbox[2] || c.bbox[3] < bbox[1] || c.bbox[1] > bbox[3]) continue;
      if (c.a3 === 'MEX' && !wide) continue;      /* México lo pintan sus estados */
      const d = GEO.ringsToPath(c.rings, proj, bbox);
      if (!d) continue;
      let fill = cLand;
      if (choroC) {
        const e = choroC.get(c.a3);
        fill = e ? ramp(0.15 + 0.85 * e.n / maxC) : cLand;
      }
      worldPaths.push(`<path d="${d}" fill="${fill}" stroke="${cLine}" stroke-width="0.6" fill-rule="evenodd"/>`);
    }
    g.push(`<g>${worldPaths.join('')}</g>`);

    const statePaths = [], stateLabels = [];
    const mb = GEO.MX_BBOX;
    const tocaMexico = !(bbox[2] < mb[0] || bbox[0] > mb[2] || bbox[3] < mb[1] || bbox[1] > mb[3]);
    const showStates = !wide && tocaMexico;
    if (showStates) {
      for (const s of GEO.MX) {
        if (s.bbox[2] < bbox[0] || s.bbox[0] > bbox[2] || s.bbox[3] < bbox[1] || s.bbox[1] > bbox[3]) continue;
        const d = GEO.ringsToPath(s.rings, proj, bbox);
        if (!d) continue;
        let fill = cLand;
        if (choroS) {
          const e = choroS.get(s.code);
          const v = e ? (view.choro === 'spState' ? speciesIn(e.items) : e.n) : 0;
          fill = v ? ramp(0.15 + 0.85 * v / maxS) : cLand;
        } else if (choroC) {
          const e = choroC.get('MEX');
          fill = e ? ramp(0.15 + 0.85 * e.n / maxC) : cLand;
        }
        const sel = view.scope === s.code;
        statePaths.push(`<path d="${d}" fill="${fill}" stroke="${sel ? cssVar('--primary') : cLine}" stroke-width="${sel ? 1.8 : 0.7}" fill-rule="evenodd" data-state="${s.code}"><title>${esc(s.name)}</title></path>`);
        if (view.labels && !wide) {
          const cx = proj.X((s.bbox[0] + s.bbox[2]) / 2), cy = proj.Y((s.bbox[1] + s.bbox[3]) / 2);
          const e = choroS && choroS.get(s.code);
          const n = e ? (view.choro === 'spState' ? speciesIn(e.items) : e.n) : 0;
          stateLabels.push(`<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${cMuted}" paint-order="stroke" stroke="${cBg}" stroke-width="2.5">${esc(s.code)}${n ? ` (${n})` : ''}</text>`);
        }
      }
    }
    g.push(`<g>${statePaths.join('')}</g>`);

    /* rejilla de celdas con conteo */
    if (view.grid) {
      const cells = GEO.gridCount(pts, view.grid);
      const maxN = Math.max(1, ...cells.map(c => c.n));
      const cellSVG = cells.map(c => {
        const b = GEO.cellBBox(c.key, view.grid);
        const x = proj.X(b[0]), y = proj.Y(b[3]), w = proj.X(b[2]) - x, h = proj.Y(b[1]) - y;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.abs(w).toFixed(1)}" height="${Math.abs(h).toFixed(1)}" fill="${ramp(0.25 + 0.75 * c.n / maxN)}" fill-opacity="0.72" stroke="${cLine}" stroke-width="0.4"><title>${c.n}</title></rect>`;
      }).join('');
      g.push(`<g>${cellSVG}</g>`);
    }

    /* los puntos */
    const cinfo = colorInfo();
    const rMax = Math.max(1, ...pts.map(p => Number(p.row.GP_STOCK) || 0));
    const circles = pts.map((p, idx) => {
      const x = proj.X(p.lon), y = proj.Y(p.lat);
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return '';
      const col = cinfo.colorOf(p);
      let r = 4;
      if (view.size === 'stock') {
        const v = Number(p.row.GP_STOCK) || 0;
        r = 2.5 + 5.5 * Math.sqrt(v / rMax || 0);
      }
      const on = view.hover === p.i;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(on ? r + 2.5 : r).toFixed(1)}" fill="${col}" fill-opacity="${on ? 1 : 0.85}" stroke="${on ? cText : cssVar('--card-bg')}" stroke-width="${on ? 1.8 : 0.9}" data-pt="${p.i}"><title>${esc((p.row.ACCENUMB || '') + ' · ' + (p.row.ACCENAME || ''))}</title></circle>`;
    }).join('');
    g.push(`<g>${circles}</g>`);
    g.push(`<g>${stateLabels.join('')}</g>`);

    /* barra de escala y norte */
    const sb = GEO.scaleBar(proj, Math.min(140, W * 0.22));
    g.push(`<g transform="translate(${W - sb.px - 26},${H - 26})">
      <rect x="-6" y="-14" width="${(sb.px + 12).toFixed(1)}" height="26" rx="6" fill="${cssVar('--card-bg')}" fill-opacity="0.82"/>
      <line x1="0" y1="0" x2="${sb.px.toFixed(1)}" y2="0" stroke="${cText}" stroke-width="2"/>
      <line x1="0" y1="-4" x2="0" y2="4" stroke="${cText}" stroke-width="2"/>
      <line x1="${sb.px.toFixed(1)}" y1="-4" x2="${sb.px.toFixed(1)}" y2="4" stroke="${cText}" stroke-width="2"/>
      <text x="${(sb.px / 2).toFixed(1)}" y="-6" text-anchor="middle" font-size="9.5" fill="${cText}">${fmtInt(sb.km)} km</text>
    </g>`);
    g.push(`<g transform="translate(22,${H - 30})">
      <path d="M0 8 L0 -14 M0 -14 L-4 -7 M0 -14 L4 -7" stroke="${cText}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <text x="0" y="20" text-anchor="middle" font-size="9" fill="${cMuted}">N</text>
    </g>`);

    /* título */
    if (view.title) {
      g.push(`<text x="14" y="22" font-size="13" font-weight="700" fill="${cText}">${esc(view.title)}</text>`);
    }

    return { svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${g.join('')}</svg>`, proj, cinfo, bbox };
  }

  function speciesIn(items) {
    return new Set(items.map(p => [p.row.GENUS, p.row.SPECIES].filter(Boolean).join(' ')).filter(Boolean)).size;
  }

  /* la función de color y su leyenda */
  function colorInfo() {
    const def = COLOR_BY.find(c => c.k === view.color) || COLOR_BY[0];
    if (def.kind === 'none') {
      return { def, colorOf: () => cssVar('--s1'), legend: [] };
    }
    if (def.kind === 'num') {
      const vals = pts.map(p => valueOf(p, def.k)).filter(v => isFinite(v));
      const lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1;
      return {
        def, lo, hi,
        colorOf: p => {
          const v = valueOf(p, def.k);
          return isFinite(v) ? ramp(hi > lo ? (v - lo) / (hi - lo) : 0.5) : cssVar('--border-strong');
        },
        legend: 'ramp',
      };
    }
    const counts = new Map();
    pts.forEach(p => {
      const v = String(valueOf(p, def.k) || '');
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 11).map(e => e[0]);
    const idx = Object.fromEntries(top.map((v, i) => [v, i]));
    return {
      def, top, counts,
      colorOf: p => {
        const v = String(valueOf(p, def.k) || '');
        return idx[v] != null ? catColor(idx[v]) : cssVar('--border-strong');
      },
      legend: 'cat',
    };
  }

  function legendHTML(cinfo) {
    if (!cinfo.legend || !cinfo.legend.length && cinfo.legend !== 'ramp' && cinfo.legend !== 'cat') return '';
    if (cinfo.legend === 'ramp') {
      const steps = 6;
      const cells = [...Array(steps)].map((_, i) => `<i style="background:${ramp(i / (steps - 1))}"></i>`).join('');
      return `<div class="map-legend"><b>${esc(T(cinfo.def.es, cinfo.def.en))}</b>
        <div class="legend-ramp">${cells}</div>
        <div class="legend-ends"><span>${fmtInt(cinfo.lo)}</span><span>${fmtInt(cinfo.hi)}</span></div></div>`;
    }
    if (cinfo.legend === 'cat') {
      return `<div class="map-legend"><b>${esc(T(cinfo.def.es, cinfo.def.en))}</b>
        ${cinfo.top.map((v, i) => `<span class="lg-item"><i style="background:${catColor(i)}"></i>${esc(labelOf(cinfo.def.k, v))} <span class="muted">(${cinfo.counts.get(v)})</span></span>`).join('')}
        ${cinfo.counts.size > cinfo.top.length ? `<span class="lg-item"><i style="background:${cssVar('--border-strong')}"></i>${T('los demás', 'the rest')}</span>` : ''}
      </div>`;
    }
    return '';
  }

  function choroLegend() {
    if (view.choro === 'none') return '';
    const label = {
      accState: T('Accesiones por entidad', 'Accessions per state'),
      spState: T('Especies por entidad', 'Species per state'),
      accCountry: T('Accesiones por país', 'Accessions per country'),
    }[view.choro];
    const cells = [...Array(6)].map((_, i) => `<i style="background:${ramp(0.15 + 0.85 * i / 5)}"></i>`).join('');
    return `<div class="map-legend"><b>${esc(label)}</b><div class="legend-ramp">${cells}</div>
      <div class="legend-ends"><span>${T('pocas', 'few')}</span><span>${T('muchas', 'many')}</span></div></div>`;
  }

  /* ============ tablas de apoyo ============ */
  function tables() {
    const byState = GEO.countByState(pts);
    const byCountry = GEO.countByCountry(pts);
    const sin = pts.length - [...byCountry.values()].reduce((a, e) => a + e.n, 0);
    const stateRows = [...byState.values()].sort((a, b) => b.n - a.n).map(e => `<tr>
      <td><button class="btn btn-ghost btn-sm" data-zoom="${e.code}">${esc(e.name)}</button></td>
      <td class="num">${e.n}</td><td class="num">${speciesIn(e.items)}</td>
      <td>${esc([...new Set(e.items.map(p => p.row.CROPNAME).filter(Boolean))].slice(0, 3).join(', '))}</td></tr>`).join('');
    const ctyRows = [...byCountry.values()].sort((a, b) => b.n - a.n).map(e => {
      const c = MCPD.COUNTRY_MAP[e.a3];
      return `<tr><td>${esc(c ? T(c.es, c.en) : e.a3)}</td><td class="num">${e.n}</td><td class="num">${speciesIn(e.items)}</td></tr>`;
    }).join('');

    return `<div class="sum-grid">
      <div class="pg-pane"><div class="pg-title">${T('México, por entidad', 'Mexico, by state')}</div>
        ${stateRows ? `<div class="table-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr>
          <th>${T('Entidad', 'State')}</th><th class="num">${T('Accesiones', 'Accessions')}</th><th class="num">${T('Especies', 'Species')}</th><th>${T('Cultivos', 'Crops')}</th>
        </tr></thead><tbody>${stateRows}</tbody></table></div>`
        : `<div class="sim-empty">${T('Ninguna accesión cae en México.', 'No accession falls in Mexico.')}</div>`}</div>
      <div class="pg-pane"><div class="pg-title">${T('El mundo, por país', 'The world, by country')}</div>
        <div class="table-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr>
          <th>${T('País', 'Country')}</th><th class="num">${T('Accesiones', 'Accessions')}</th><th class="num">${T('Especies', 'Species')}</th>
        </tr></thead><tbody>${ctyRows}</tbody></table></div>
        ${sin > 0 ? `<p class="hint">${T(`${sin} accesiones con coordenadas no caen dentro de ningún país del mapa: suelen ser puntos en el mar, es decir, coordenadas con algún error.`, `${sin} accessions with coordinates fall outside every country on the map: usually points at sea, that is, coordinates with an error.`)}</p>` : ''}
      </div>
    </div>`;
  }

  /* ============ interfaz ============ */
  function render() {
    if (!el('panel-4')) return;
    pts = currentPoints();
    const total = state.acc.length;
    const sinCoord = total - GEO.pointsOf(state.acc).length;
    el('b4CountsHead').hidden = !total;   /* sin accesiones no hay cuentas que titular */

    if (!total) {
      el('b4Map').innerHTML = `<div class="sim-empty">${T('Primero carga tus accesiones en el Bloque 2.', 'Load your accessions in Block 2 first.')}</div>`;
      el('b4Legend').innerHTML = ''; el('b4Tables').innerHTML = ''; el('b4Stats').innerHTML = '';
      return;
    }

    const W = 900, H = 560;
    const { svg, cinfo } = drawMap(W, H);
    lastSVG = svg;
    el('b4Map').innerHTML = svg;
    el('b4Legend').innerHTML = legendHTML(cinfo) + choroLegend();

    const byState = GEO.countByState(pts);
    const byCountry = GEO.countByCountry(pts);
    el('b4Stats').innerHTML = [
      { k: T('En el mapa', 'On the map'), v: fmtInt(pts.length), d: T(`de ${total} accesiones`, `of ${total} accessions`), c: 'var(--s1)' },
      { k: T('Sin coordenadas', 'Without coordinates'), v: fmtInt(sinCoord), d: T('no se pueden mapear', 'cannot be mapped'), c: sinCoord ? 'var(--stWarn)' : 'var(--s3)' },
      { k: T('Entidades de México', 'Mexican states'), v: fmtInt(byState.size), d: T('con al menos una colecta', 'with at least one collection'), c: 'var(--s2)' },
      { k: T('Países', 'Countries'), v: fmtInt(byCountry.size), d: T('según dónde cae el punto', 'according to where the point falls'), c: 'var(--s6)' },
      { k: T('Especies mapeadas', 'Mapped species'), v: fmtInt(speciesIn(pts)), d: T('taxones con al menos un punto', 'taxa with at least one point'), c: 'var(--s4)' },
    ].map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('');

    el('b4Tables').innerHTML = tables();
    els('[data-zoom]', el('b4Tables')).forEach(b => b.addEventListener('click', () => {
      view.scope = b.dataset.zoom; syncControls(); render();
    }));

    /* interacción con el mapa */
    const svgEl = el('b4Map').querySelector('svg');
    if (svgEl) {
      svgEl.querySelectorAll('[data-pt]').forEach(c => {
        c.style.cursor = 'pointer';
        c.addEventListener('click', () => { goStep(2); setTimeout(() => B2.openFicha(Number(c.dataset.pt)), 250); });
        c.addEventListener('mouseenter', () => showInfo(Number(c.dataset.pt)));
      });
      svgEl.querySelectorAll('[data-state]').forEach(p => {
        p.style.cursor = 'pointer';
        p.addEventListener('click', () => { view.scope = view.scope === p.dataset.state ? 'mx' : p.dataset.state; syncControls(); render(); });
      });
    }
  }

  function showInfo(i) {
    const r = state.acc[i];
    if (!r) return;
    const s = GEO.stateOf(Number(r.DECLONGITUDE), Number(r.DECLATITUDE));
    el('b4Info').innerHTML = `<b>${esc(r.ACCENUMB || '')}</b> · ${esc(r.ACCENAME || '')} ·
      <i class="sci">${esc([r.GENUS, r.SPECIES].filter(Boolean).join(' '))}</i> ·
      ${esc(r.COLLSITE || '')}${s ? ` · ${esc(s.name)}` : ''} ·
      ${esc(r.ELEVATION ? r.ELEVATION + ' m' : '')} ·
      <span class="muted">${esc(labelOf('GP_CONS', MCPD.consRoute(r)))}</span>`;
  }

  function syncControls() {
    const sc = el('b4Scope');
    if (sc) {
      const opts = [
        `<option value="auto">${T('Ajustar a mis datos', 'Fit to my data')}</option>`,
        `<option value="mx">${T('México completo', 'All of Mexico')}</option>`,
        `<option value="world">${T('El mundo', 'The world')}</option>`,
        `<optgroup label="${T('Una entidad', 'A single state')}">` +
        GEO.MX.map(s => `<option value="${s.code}">${esc(s.name)}</option>`).join('') + '</optgroup>',
      ].join('');
      if (sc.innerHTML !== opts) sc.innerHTML = opts;
      sc.value = view.scope;
    }
    const fill = (id, list, cur, label) => {
      const s = el(id);
      if (!s) return;
      s.innerHTML = `<option value="">${label}</option>` + list.map(v => `<option value="${esc(v.v)}"${cur === v.v ? ' selected' : ''}>${esc(v.t)}</option>`).join('');
    };
    const crops = [...new Set(state.acc.map(r => r.CROPNAME).filter(Boolean))].sort();
    fill('b4Crop', crops.map(c => ({ v: c, t: c })), view.crop, T('todos los cultivos', 'all crops'));
    fill('b4Route', MCPD.GPCONS.filter(c => state.acc.some(r => MCPD.consRoute(r) === c.c)).map(c => ({ v: c.c, t: T(c.es, c.en) })), view.route, T('todas las rutas', 'all routes'));
    const cb = el('b4Color');
    if (cb) {
      cb.innerHTML = COLOR_BY.map(c => `<option value="${c.k}">${esc(T(c.es, c.en))}</option>`).join('');
      cb.value = view.color;
    }
    const ch = el('b4Choro');
    if (ch) {
      ch.innerHTML = [
        ['none', T('sin coropleta', 'no choropleth')],
        ['accState', T('accesiones por entidad', 'accessions per state')],
        ['spState', T('especies por entidad', 'species per state')],
        ['accCountry', T('accesiones por país', 'accessions per country')],
      ].map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
      ch.value = view.choro;
    }
    const gr = el('b4Grid');
    if (gr) {
      gr.innerHTML = [[0, T('sin rejilla', 'no grid')], [0.25, '0.25°'], [0.5, '0.5°'], [1, '1°'], [2, '2°']]
        .map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
      gr.value = String(view.grid);
    }
    const sz = el('b4Size');
    if (sz) {
      sz.innerHTML = [['fixed', T('tamaño fijo', 'fixed size')], ['stock', T('tamaño por existencias', 'size by stock')]]
        .map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
      sz.value = view.size;
    }
    const lb = el('b4Labels');
    if (lb) lb.classList.toggle('on', view.labels);
  }

  /* ---------- exportación ---------- */
  function exportSVG() {
    if (!lastSVG) return;
    download(lastSVG, 'mapa-colecta.svg', 'image/svg+xml;charset=utf-8');
  }
  function exportPNG(scale) {
    if (!lastSVG) return;
    const k = scale || 2;
    const m = /viewBox="0 0 (\d+) (\d+)"/.exec(lastSVG);
    const W = m ? Number(m[1]) : 900, H = m ? Number(m[2]) : 560;
    const img = new Image();
    const blob = new Blob([lastSVG], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = W * k; cv.height = H * k;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = cssVar('--bg-soft');
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(b => { if (b) download(b, 'mapa-colecta.png', 'image/png'); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert(T('No se pudo convertir a PNG; descarga el SVG.', 'Could not convert to PNG; download the SVG instead.')); };
    img.src = url;
  }
  /* las accesiones que se ven, en CSV, con su entidad y su celda */
  function exportPoints() {
    const rows = pts.map(p => {
      const s = GEO.stateOf(p.lon, p.lat), c = GEO.countryOf(p.lon, p.lat);
      return {
        ACCENUMB: p.row.ACCENUMB, ACCENAME: p.row.ACCENAME, TAXON: [p.row.GENUS, p.row.SPECIES].filter(Boolean).join(' '),
        CROPNAME: p.row.CROPNAME, DECLATITUDE: p.lat, DECLONGITUDE: p.lon, ELEVATION: p.row.ELEVATION,
        ENTIDAD: s ? s.name : '', PAIS_PUNTO: c ? (c.a3 || c.a2) : '', PAIS_PASAPORTE: p.row.ORIGCTY,
        CELDA_1G: GEO.cellKey(p.lon, p.lat, 1), RUTA: MCPD.consRoute(p.row),
      };
    });
    download(IO.toCSV(rows, Object.keys(rows[0] || { ACCENUMB: '' })), 'puntos-mapa.csv', 'text/csv;charset=utf-8');
  }

  /* ============ arranque ============ */
  function init() {
    if (!el('panel-4')) return;
    syncControls();
    ['b4Scope', 'b4Color', 'b4Choro', 'b4Grid', 'b4Size', 'b4Crop', 'b4Route'].forEach(id => {
      const n = el(id);
      if (!n) return;
      n.addEventListener('change', () => {
        if (id === 'b4Scope') view.scope = n.value;
        if (id === 'b4Color') view.color = n.value;
        if (id === 'b4Choro') view.choro = n.value;
        if (id === 'b4Grid') view.grid = Number(n.value);
        if (id === 'b4Size') view.size = n.value;
        if (id === 'b4Crop') view.crop = n.value;
        if (id === 'b4Route') view.route = n.value;
        render();
      });
    });
    el('b4Labels').addEventListener('click', () => { view.labels = !view.labels; syncControls(); render(); });
    el('b4Title').addEventListener('input', () => { view.title = el('b4Title').value; render(); });
    el('b4SVG').addEventListener('click', exportSVG);
    el('b4PNG').addEventListener('click', () => exportPNG(2));
    el('b4CSV').addEventListener('click', exportPoints);
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('stepchange', e => { if (e.detail.step === 4) { syncControls(); render(); } });
  document.addEventListener('langchange', () => { if (el('panel-4')) { syncControls(); render(); } });
  document.addEventListener('themechange', () => { cssCache = {}; cssTheme = ''; if (el('panel-4')) render(); });

  window.B4 = { render, view, drawMap, colorInfo, exportSVG, exportPNG, cssVar, ramp, speciesIn, points: () => pts };
})();
