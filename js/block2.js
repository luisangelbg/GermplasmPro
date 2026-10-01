/* GermplasmPro — Bloque 2: el pasaporte de las accesiones.

   Cuatro cosas, en este orden:
     1. Traer los datos: un archivo CSV o TSV, un pegado directo desde una hoja de cálculo, la
        colección de ejemplo o una tabla en blanco.
     2. Decir qué columna es qué descriptor MCPD (la app lo propone sola).
     3. Revisar y corregir en una tabla editable, con la ficha completa de cada
        accesión y la validación campo por campo.
     4. Ver el retrato de la colección y exportar.

   Todo vive en state.acc y se guarda solo en el navegador; nada se sube. */

(function () {

  const PAGE = 50;
  const view = {
    page: 0, q: '', route: '', crop: '', country: '', onlyIssues: false,
    sort: { k: 'ACCENUMB', dir: 1 },
    cols: ['ACCENUMB', 'ACCENAME', 'GENUS', 'SPECIES', 'CROPNAME', 'ORIGCTY', 'COLLSITE', 'ELEVATION', 'GP_CONS'],
    fichaIdx: -1,
  };
  let issues = [];          /* [{i, field, level, msg}] */
  let pending = null;       /* importación a la espera de mapeo */

  /* ============ guardado local ============ */
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Prefs.set('acc', state.acc);
      Prefs.set('savedAt', Date.now());
      const el2 = el('b2Saved');
      if (el2) el2.textContent = T('guardado en este navegador · ', 'saved in this browser · ') + new Date().toLocaleTimeString();
    }, 400);
  }
  function restore() {
    const rows = Prefs.get('acc', null);
    if (Array.isArray(rows) && rows.length) {
      state.acc = rows.map(r => Object.assign(MCPD.emptyRow(), r));
      return true;
    }
    return false;
  }

  /* ============ validación de toda la colección ============ */
  function revalidate() {
    issues = [];
    state.acc.forEach((r, i) => {
      MCPD.validateRow(r).forEach(p => issues.push(Object.assign({ i }, p)));
    });
    state.issues = issues;
  }
  const issuesOf = i => issues.filter(p => p.i === i);
  const issueAt = (i, k) => issues.find(p => p.i === i && p.field === k);

  /* ============ 1. traer los datos ============ */
  function startImport(text, name, opts) {
    const o = opts || {};
    const parsed = IO.parseDelimited(text, o.delim || null, o.header === false ? { header: false } : undefined);
    if (!parsed.headers.length || !parsed.rows.length) {
      if (window.gpWorkFail) gpWorkFail();
      alert(T('El archivo no trae filas que se puedan leer.', 'The file has no readable rows.'));
      return;
    }
    /* Las columnas de caracterización (peso del fruto, °Brix, días a
       floración…) no son pasaporte y no se les busca descriptor MCPD: viajan
       aparte, a la caracterización del Bloque 7, unidas por el número de
       accesión. Se apartan aquí para que no se pierdan ni ensucien el mapeo. */
    const traitCols = window.TRAITS ? parsed.headers.filter(h => TRAITS.has(h)) : [];
    const mcpdHeaders = parsed.headers.filter(h => !traitCols.includes(h));
    pending = {
      parsed, name: name || '', traitCols, mcpdHeaders,
      map: MCPD.guessMapping(mcpdHeaders, parsed.rows.slice(0, 20)),
    };
    if (!el('b2MapCard')) return;        /* fuera de la app (suite de pruebas) no hay nada que dibujar */
    renderMapping();
    el('b2MapCard').style.display = '';
    el('b2MapCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* Qué pasaría con esta columna si se importara como ese descriptor: cuántos
     de sus valores no pasarían la validación, y cuál es el primero que falla.
     Vale más enseñarlo aquí que después, cuando ya está dentro. */
  function columnPreview(col, key) {
    if (!pending) return null;
    const vals = pending.parsed.rows.map(r => String(r[col] ?? '').trim()).filter(v => v !== '');
    if (!vals.length) return { n: 0, malos: 0, primero: '' };
    let malos = 0, primero = '';
    vals.forEach(v => {
      const p = MCPD.validateValue(key, v, null);
      if (p && p.level === 'error') { malos++; if (!primero) primero = v; }
    });
    return { n: vals.length, malos, primero };
  }
  function previewTag(p) {
    if (!p.n) return `<span class="muted">${T('vacía', 'empty')}</span>`;
    if (!p.malos) return `<span class="tag ok">${T(`${p.n} bien`, `${p.n} ok`)}</span>`;
    return `<span class="tag bad" title="${esc(T('primero que falla', 'first one that fails'))}: ${esc(p.primero)}">${
      T(`${p.malos} de ${p.n} fallan`, `${p.malos} of ${p.n} fail`)}</span> <span class="hint">${esc(p.primero.slice(0, 18))}</span>`;
  }
  /* descriptores obligatorios que ninguna columna está alimentando */
  function missingRequired(map) {
    const usados = new Set(Object.values(map).filter(Boolean));
    return MCPD.FIELDS.filter(f => f.req === 'must' && !usados.has(f.k));
  }

  function renderMapping() {
    if (!pending || !el('b2MapInfo')) return;
    const { parsed, map } = pending;
    const opts = (sel) => {
      const groups = MCPD.GROUPS.map(g => {
        const fs = MCPD.FIELDS.filter(f => f.g === g.g);
        return `<optgroup label="${esc(T(g.es, g.en))}">` + fs.map(f =>
          `<option value="${f.k}"${sel === f.k ? ' selected' : ''}>${esc(T(f.es, f.en))} · ${f.k}</option>`).join('') + '</optgroup>';
      }).join('');
      return `<option value=""${sel ? '' : ' selected'}>— ${T('no importar', 'do not import')} —</option>` + groups;
    };
    const rowsHtml = pending.mcpdHeaders.map(h => {
      const sample = parsed.rows.slice(0, 3).map(r => r[h]).filter(v => v !== '').slice(0, 3).join(' · ');
      const k = map[h] || '';
      const p = k ? columnPreview(h, k) : null;
      return `<tr>
        <td><b>${esc(h)}</b><div class="hint">${esc(sample || T('(vacía)', '(empty)'))}</div></td>
        <td><select class="sel map-sel" data-col="${esc(h)}">${opts(k)}</select></td>
        <td>${k ? `<span class="tag ${MCPD.FIELD_MAP[k].gp ? 'dup' : 'ok'}">${k}</span>` : `<span class="muted">—</span>`}</td>
        <td>${p ? previewTag(p) : '<span class="muted">—</span>'}</td>
      </tr>`;
    }).join('');
    const detected = Object.values(pending.map).filter(Boolean).length;
    const faltan = missingRequired(map);
    const nf = parsed.rows.length, nc = parsed.headers.length;
    el('b2MapInfo').innerHTML = T(
      `Se ${nf === 1 ? 'leyó' : 'leyeron'} <b>${nf}</b> ${nf === 1 ? 'fila' : 'filas'} y <b>${nc}</b> ${nc === 1 ? 'columna' : 'columnas'}${pending.name ? ` de <b>${esc(pending.name)}</b>` : ''}. La app reconoció <b>${detected}</b> ${detected === 1 ? 'columna' : 'columnas'}; revisa las demás.`,
      `Read <b>${nf}</b> ${nf === 1 ? 'row' : 'rows'} and <b>${nc}</b> ${nc === 1 ? 'column' : 'columns'}${pending.name ? ` from <b>${esc(pending.name)}</b>` : ''}. The app recognized <b>${detected}</b> ${detected === 1 ? 'column' : 'columns'}; check the rest.`)
      + (pending.traitCols.length ? `<div class="paste-warn info" style="margin-top:8px">${T(
        `${pending.traitCols.length} ${pending.traitCols.length === 1 ? 'columna es de caracterización y no de pasaporte' : 'columnas son de caracterización y no de pasaporte'} (${pending.traitCols.map(c => `<b>${esc(TRAITS.FIELD_MAP[c] ? T(TRAITS.FIELD_MAP[c].es, TRAITS.FIELD_MAP[c].en) : c)}</b>`).join(', ')}). Se guardan aparte, en el Bloque 7, unidas por el número de accesión.`,
        `${pending.traitCols.length} ${pending.traitCols.length === 1 ? 'column is characterization data, not passport' : 'columns are characterization data, not passport'} (${pending.traitCols.map(c => `<b>${esc(TRAITS.FIELD_MAP[c] ? T(TRAITS.FIELD_MAP[c].es, TRAITS.FIELD_MAP[c].en) : c)}</b>`).join(', ')}). They are stored separately, in Block 7, joined by the accession number.`)}</div>` : '')
      + (faltan.length ? `<div class="paste-warn warn" style="margin-top:8px">${T(
        `Sin columna todavía: ${faltan.map(f => `<b>${esc(T(f.es, f.en))}</b>`).join(', ')}. Puedes importar igual y llenarlos después en la tabla.`,
        `Still without a column: ${faltan.map(f => `<b>${esc(T(f.es, f.en))}</b>`).join(', ')}. You can import anyway and fill them in later in the table.`)}</div>` : '');
    el('b2MapBody').innerHTML = rowsHtml;
    els('.map-sel', el('b2MapBody')).forEach(s => s.addEventListener('change', () => {
      pending.map[s.dataset.col] = s.value;
      /* un descriptor no puede recibir dos columnas */
      if (s.value) els('.map-sel').forEach(o => { if (o !== s && o.value === s.value) { o.value = ''; pending.map[o.dataset.col] = ''; } });
      renderMapping();
    }));
  }

  function applyImport(mode) {
    if (!pending) return;
    const rows = MCPD.applyMapping(pending.parsed.rows, pending.map);
    state.acc = mode === 'append' ? state.acc.concat(rows) : rows;

    /* lo que era caracterización se guarda en el Bloque 7, junto a su accesión */
    if (pending.traitCols.length) {
      const previos = new Map((state.traits || []).map(t => [String(t.ACCENUMB || '').trim(), t]));
      pending.parsed.rows.forEach((src, i) => {
        const num = String(rows[i] && rows[i].ACCENUMB || '').trim();
        if (!num) return;
        const t = Object.assign({}, previos.get(num) || {}, { ACCENUMB: num });
        let algo = false;
        pending.traitCols.forEach(c => {
          const v = String(src[c] ?? '').trim();
          if (v !== '') { t[c] = v; algo = true; }
        });
        if (algo) previos.set(num, t);
      });
      state.traits = [...previos.values()];
      Prefs.set('traits', state.traits);
      if (window.B7) B7.run();
    }
    pending = null;
    if (el('b2MapCard')) el('b2MapCard').style.display = 'none';
    view.page = 0;
    refresh();
    if (el('b2Table')) el('b2Table').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ============ 2. la tabla ============ */
  function filtered() {
    const q = MCPD.norm(view.q);
    let out = state.acc.map((r, i) => ({ r, i }));
    if (q) out = out.filter(({ r }) => MCPD.norm(Object.values(r).join(' ')).includes(q));
    if (view.route) out = out.filter(({ r }) => MCPD.consRoute(r) === view.route);
    if (view.crop) out = out.filter(({ r }) => (r.CROPNAME || '') === view.crop);
    if (view.country) out = out.filter(({ r }) => (r.ORIGCTY || '') === view.country);
    if (view.onlyIssues) out = out.filter(({ i }) => issuesOf(i).length);
    const k = view.sort.k, dir = view.sort.dir;
    const f = MCPD.FIELD_MAP[k];
    out.sort((a, b) => {
      let x = a.r[k] ?? '', y = b.r[k] ?? '';
      if (f && (f.t === 'num' || f.t === 'lat' || f.t === 'lon')) { x = Number(x) || -Infinity; y = Number(y) || -Infinity; return (x - y) * dir; }
      return String(x).localeCompare(String(y), 'es') * dir;
    });
    return out;
  }

  function renderTable() {
    const box = el('b2Table');
    if (!box) return;
    const all = filtered();
    const pages = Math.max(1, Math.ceil(all.length / PAGE));
    view.page = clamp(view.page, 0, pages - 1);
    const slice = all.slice(view.page * PAGE, view.page * PAGE + PAGE);

    if (!state.acc.length) {
      box.innerHTML = `<div class="sim-empty">${T('Todavía no hay accesiones: carga un archivo, pega tu tabla o abre la colección de ejemplo.', 'No accessions yet: load a file, paste your table or open the example collection.')}</div>`;
      el('b2Pager').innerHTML = '';
      return;
    }

    const head = view.cols.map(k => {
      const f = MCPD.FIELD_MAP[k];
      const on = view.sort.k === k;
      return `<th><button class="th-btn${on ? ' on' : ''}" data-sort="${k}">${esc(T(f.es, f.en))}${on ? (view.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`;
    }).join('');

    const body = slice.map(({ r, i }) => {
      const tds = view.cols.map(k => {
        const iss = issueAt(i, k);
        const cls = iss ? (iss.level === 'error' ? ' cell-error' : ' cell-warn') : '';
        const title = iss ? ` title="${esc(T(iss.msg.es, iss.msg.en))}"` : '';
        const f = MCPD.FIELD_MAP[k];
        const val = esc(r[k] ?? '');
        if (f.t === 'code' || f.t === 'multicode') {
          const label = codeLabel(f, r[k]);
          return `<td class="c${cls}"${title}><input class="cell-inp" data-i="${i}" data-k="${k}" value="${val}" list="dl_${k}"><div class="cell-sub">${esc(label)}</div></td>`;
        }
        return `<td class="c${cls}"${title}><input class="cell-inp" data-i="${i}" data-k="${k}" value="${val}"></td>`;
      }).join('');
      const n = issuesOf(i).length;
      return `<tr>
        <td class="row-n">${i + 1}</td>
        ${tds}
        <td class="row-act">
          ${n ? `<span class="tag ${issuesOf(i).some(p => p.level === 'error') ? 'bad' : 'warn'}">${n}</span>` : ''}
          <button class="icon-btn sm" data-ficha="${i}" data-es-title="Ver la ficha completa" data-en-title="Open the full record">▤</button>
          <button class="icon-btn sm" data-del="${i}" data-es-title="Eliminar la accesión" data-en-title="Delete the accession">✕</button>
        </td>
      </tr>`;
    }).join('');

    const datalists = view.cols.filter(k => ['code', 'multicode'].includes(MCPD.FIELD_MAP[k].t)).map(k => {
      const f = MCPD.FIELD_MAP[k];
      return `<datalist id="dl_${k}">${(f.codes || []).map(c => `<option value="${c.c}">${esc(T(c.es, c.en))}</option>`).join('')}</datalist>`;
    }).join('');

    box.innerHTML = `${datalists}<div class="table-wrap"><table class="tbl tbl-edit">
      <thead><tr><th class="row-n">#</th>${head}<th class="row-act"></th></tr></thead>
      <tbody>${body}</tbody></table></div>`;

    el('b2Pager').innerHTML = `
      <button class="btn btn-ghost btn-sm" ${view.page === 0 ? 'disabled' : ''} data-page="prev">←</button>
      <span class="hint">${T('mostrando', 'showing')} ${all.length ? view.page * PAGE + 1 : 0}–${Math.min(all.length, (view.page + 1) * PAGE)} ${T('de', 'of')} ${all.length}${all.length !== state.acc.length ? ` (${T('filtradas de', 'filtered from')} ${state.acc.length})` : ''}</span>
      <button class="btn btn-ghost btn-sm" ${view.page >= pages - 1 ? 'disabled' : ''} data-page="next">→</button>`;

    els('[data-sort]', box).forEach(b => b.addEventListener('click', () => {
      if (view.sort.k === b.dataset.sort) view.sort.dir *= -1; else view.sort = { k: b.dataset.sort, dir: 1 };
      renderTable();
    }));
    els('.cell-inp', box).forEach(inp => {
      inp.addEventListener('change', () => {
        state.acc[Number(inp.dataset.i)][inp.dataset.k] = inp.value.trim();
        refresh(); save();
      });
    });
    els('[data-ficha]', box).forEach(b => b.addEventListener('click', () => openFicha(Number(b.dataset.ficha))));
    els('[data-del]', box).forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.del);
      if (!confirm(T(`¿Eliminar la accesión ${state.acc[i].ACCENUMB || i + 1}?`, `Delete accession ${state.acc[i].ACCENUMB || i + 1}?`))) return;
      state.acc.splice(i, 1); refresh(); save();
    }));
    els('[data-page]', el('b2Pager')).forEach(b => b.addEventListener('click', () => {
      view.page += b.dataset.page === 'next' ? 1 : -1; renderTable();
    }));
    I18N.apply(box);
  }

  function codeLabel(f, v) {
    const val = String(v ?? '').trim();
    if (!val) return '';
    const parts = val.split(';').map(s => s.trim()).filter(Boolean);
    return parts.map(p => {
      const hit = (f.codes || []).find(c => String(c.c) === p);
      return hit ? T(hit.es, hit.en) : '?';
    }).join(' + ');
  }

  /* ============ 3. la ficha completa ============ */
  function openFicha(i) {
    view.fichaIdx = i;
    renderFicha();
    el('fichaDlg').showModal();
  }
  function renderFicha() {
    const i = view.fichaIdx;
    const r = state.acc[i];
    if (!r) return;
    const iss = issuesOf(i);
    const body = MCPD.GROUPS.map(g => {
      const fs = MCPD.FIELDS.filter(f => f.g === g.g);
      return `<div class="fi-group"><h4>${esc(T(g.es, g.en))}${g.g === 'gp' ? ` <span class="tag dup">${T('fuera del estándar', 'outside the standard')}</span>` : ''}</h4>
        ${fs.map(f => {
          const p = iss.find(x => x.field === f.k);
          const cls = p ? (p.level === 'error' ? ' fi-error' : ' fi-warn') : '';
          const input = (f.t === 'code' || f.t === 'multicode')
            ? `<input class="inp fi-inp" data-k="${f.k}" value="${esc(r[f.k] ?? '')}" list="fdl_${f.k}">
               <datalist id="fdl_${f.k}">${(f.codes || []).map(c => `<option value="${c.c}">${esc(T(c.es, c.en))}</option>`).join('')}</datalist>`
            : `<input class="inp fi-inp" data-k="${f.k}" value="${esc(r[f.k] ?? '')}" placeholder="${esc(f.ex || '')}">`;
          return `<div class="fi-row${cls}">
            <label title="${esc(T(f.d.es, f.d.en))}">${esc(T(f.es, f.en))} <span class="fi-key">${f.k}</span>${f.req === 'must' ? ' <span class="fi-req">*</span>' : ''}</label>
            ${input}
            <div class="fi-help">${p ? `<b>${esc(T(p.msg.es, p.msg.en))}</b>` : esc(T(f.d.es, f.d.en))}</div>
          </div>`;
        }).join('')}</div>`;
    }).join('');
    el('fichaTitle').innerHTML = `${esc(r.ACCENUMB || T('(sin número)', '(no number)'))} · <i class="sci">${esc([r.GENUS, r.SPECIES].filter(Boolean).join(' '))}</i>`;
    el('fichaBody').innerHTML = body;
    el('fichaNav').innerHTML = `<span class="hint">${i + 1} / ${state.acc.length}</span>`;
    els('.fi-inp', el('fichaBody')).forEach(inp => inp.addEventListener('change', () => {
      state.acc[i][inp.dataset.k] = inp.value.trim();
      revalidate(); renderFicha(); renderTable(); renderSummary(); renderIssues(); save();
    }));
  }

  /* ============ 4. los problemas encontrados ============ */
  function renderIssues() {
    const box = el('b2Issues');
    if (!box) return;
    const errs = issues.filter(p => p.level === 'error'), warns = issues.filter(p => p.level === 'warn');
    if (!state.acc.length) { box.innerHTML = ''; el('b2IssueHead').innerHTML = ''; return; }

    /* se agrupan por campo y mensaje, que es como se corrigen */
    const groups = new Map();
    issues.forEach(p => {
      const key = p.field + '|' + p.msg.es;
      if (!groups.has(key)) groups.set(key, { field: p.field, level: p.level, msg: p.msg, rows: [] });
      groups.get(key).rows.push(p.i);
    });
    const list = [...groups.values()].sort((a, b) => (a.level === b.level ? b.rows.length - a.rows.length : a.level === 'error' ? -1 : 1));

    el('b2IssueHead').innerHTML = `
      <span class="tag ${errs.length ? 'bad' : 'ok'}">${errs.length} ${T('errores', 'errors')}</span>
      <span class="tag ${warns.length ? 'warn' : 'ok'}">${warns.length} ${T('avisos', 'warnings')}</span>
      <span class="hint">${T('en', 'across')} ${new Set(issues.map(p => p.i)).size} ${T('accesiones de', 'of')} ${state.acc.length}</span>`;

    box.innerHTML = list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr>
        <th>${T('Descriptor', 'Descriptor')}</th><th>${T('Qué pasa', 'What is wrong')}</th><th class="num">${T('Accesiones', 'Accessions')}</th><th></th>
      </tr></thead><tbody>${list.map((g, gi) => `<tr>
        <td><span class="tag ${g.level === 'error' ? 'bad' : 'warn'}">${g.field}</span></td>
        <td>${esc(T(g.msg.es, g.msg.en))}</td>
        <td class="num">${g.rows.length}</td>
        <td><button class="btn btn-ghost btn-sm" data-goissue="${gi}">${T('ver', 'show')}</button></td>
      </tr>`).join('')}</tbody></table></div>`
      : `<div class="note-ok">${T('No hay nada que corregir: todos los descriptores pasan la validación.', 'Nothing to fix: every descriptor passes validation.')}</div>`;

    els('[data-goissue]', box).forEach(b => b.addEventListener('click', () => {
      const g = list[Number(b.dataset.goissue)];
      view.q = ''; view.route = ''; view.crop = ''; view.country = ''; view.onlyIssues = true;
      if (!view.cols.includes(g.field)) view.cols = view.cols.concat([g.field]);
      syncFilters(); renderTable();
      openFicha(g.rows[0]);
    }));
  }

  /* ============ 5. el retrato de la colección ============ */
  function barPlot(pairs, opts) {
    const o = Object.assign({ w: 460, h: 200, color: 'var(--s1)', max: 8 }, opts);
    const data = pairs.slice(0, o.max);
    if (!data.length) return `<div class="sim-empty">${T('sin datos', 'no data')}</div>`;
    const pad = { l: 150, r: 38, t: 6, b: 6 };
    const rowH = Math.max(16, (o.h - pad.t - pad.b) / data.length);
    const H = pad.t + pad.b + rowH * data.length;
    const maxV = Math.max(...data.map(d => d[1]));
    const bars = data.map((d, i) => {
      const y = pad.t + i * rowH;
      const w = maxV ? (o.w - pad.l - pad.r) * d[1] / maxV : 0;
      return `<g>
        <text x="${pad.l - 8}" y="${y + rowH / 2 + 3.5}" text-anchor="end" font-size="10.5" fill="var(--text)">${esc(String(d[0]).slice(0, 26))}</text>
        <rect x="${pad.l}" y="${y + 3}" width="${Math.max(1, w).toFixed(1)}" height="${rowH - 6}" rx="3" fill="${o.color}" opacity=".85"/>
        <text x="${pad.l + w + 5}" y="${y + rowH / 2 + 3.5}" font-size="10" fill="var(--text-muted)">${d[1]}</text>
      </g>`;
    }).join('');
    return `<svg viewBox="0 0 ${o.w} ${H}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
  }

  function histPlot(values, opts) {
    const o = Object.assign({ w: 460, h: 200, color: 'var(--s2)', bins: 12, unit: '', raw: false }, opts);
    const lab = v => (o.raw ? String(Math.round(v)) : fmtInt(v)) + o.unit;
    if (values.length < 2) return `<div class="sim-empty">${T('sin datos suficientes', 'not enough data')}</div>`;
    const lo = Math.min(...values), hi = Math.max(...values);
    const span = (hi - lo) || 1;
    const counts = new Array(o.bins).fill(0);
    values.forEach(v => { counts[clamp(Math.floor((v - lo) / span * o.bins), 0, o.bins - 1)]++; });
    const pad = { l: 34, r: 10, t: 8, b: 26 };
    const maxC = Math.max(...counts);
    const bw = (o.w - pad.l - pad.r) / o.bins;
    const bars = counts.map((c, i) => {
      const h = maxC ? (o.h - pad.t - pad.b) * c / maxC : 0;
      return `<rect x="${(pad.l + i * bw + 1).toFixed(1)}" y="${(o.h - pad.b - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${o.color}" opacity=".85"/>`;
    }).join('');
    return `<svg viewBox="0 0 ${o.w} ${o.h}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${pad.l}" y1="${o.h - pad.b}" x2="${o.w - pad.r}" y2="${o.h - pad.b}" stroke="var(--border-strong)"/>
      ${bars}
      <text x="${pad.l}" y="${o.h - 8}" font-size="10" fill="var(--text-muted)">${lab(lo)}</text>
      <text x="${o.w - pad.r}" y="${o.h - 8}" text-anchor="end" font-size="10" fill="var(--text-muted)">${lab(hi)}</text>
      <text x="${pad.l - 6}" y="${pad.t + 8}" text-anchor="end" font-size="10" fill="var(--text-muted)">${maxC}</text>
    </svg>`;
  }

  function renderSummary() {
    const box = el('b2Summary');
    if (!box) return;
    if (!state.acc.length) { box.innerHTML = ''; return; }
    const s = MCPD.summarize(state.acc);
    const routeName = c => { const h = MCPD.GPCONS.find(x => x.c === c); return h ? T(h.es, h.en) : T('sin declarar', 'not declared'); };
    const statName = c => { const h = MCPD.SAMPSTAT.find(x => x.c === c); return h ? T(h.es, h.en) : c; };
    const cty = c => { const h = MCPD.COUNTRY_MAP[c]; return h ? T(h.es, h.en) : c; };

    const stats = [
      { k: T('Accesiones', 'Accessions'), v: fmtInt(s.n), d: T(`${s.taxa.length} taxones · ${s.crops.length} cultivos`, `${s.taxa.length} taxa · ${s.crops.length} crops`), c: 'var(--s1)' },
      { k: T('Con coordenadas', 'With coordinates'), v: fmt(100 * s.withCoords / s.n, 0) + ' %', d: T(`${s.withCoords} de ${s.n} se pueden mapear`, `${s.withCoords} of ${s.n} can be mapped`), c: 'var(--s4)' },
      { k: T('Con duplicado de seguridad', 'With safety duplicate'), v: fmt(100 * s.withDupl / s.n, 0) + ' %', d: T('el resto depende de una sola instalación', 'the rest depend on a single facility'), c: s.withDupl / s.n < 0.8 ? 'var(--danger)' : 'var(--s3)', },
      { k: T('Países', 'Countries'), v: fmtInt(s.countries.length), d: s.countries.slice(0, 3).map(c => c[0]).join(', '), c: 'var(--s6)' },
      { k: T('Rutas en uso', 'Routes in use'), v: fmtInt(s.routes.length), d: s.routes.slice(0, 3).map(r => routeName(r[0])).join(', '), c: 'var(--s2)' },
    ];

    box.innerHTML = `
      <div class="stat-row">${stats.map(x => `<div class="stat" style="--sc:${x.c}"><div class="s-k">${x.k}</div><div class="s-v">${x.v}</div><div class="s-d">${x.d}</div></div>`).join('')}</div>
      <div class="sum-grid">
        <div class="pg-pane"><div class="pg-title">${T('Accesiones por ruta de conservación', 'Accessions by conservation route')}</div>
          ${barPlot(s.routes.map(r => [routeName(r[0]), r[1]]), { color: 'var(--s2)' })}</div>
        <div class="pg-pane"><div class="pg-title">${T('Accesiones por especie', 'Accessions by species')}</div>
          ${barPlot(s.taxa, { color: 'var(--s1)', max: 10 })}</div>
        <div class="pg-pane"><div class="pg-title">${T('Estatus biológico', 'Biological status')}</div>
          ${barPlot(s.status.map(r => [statName(r[0]), r[1]]), { color: 'var(--s3)' })}</div>
        <div class="pg-pane"><div class="pg-title">${T('País de origen', 'Country of origin')}</div>
          ${barPlot(s.countries.map(r => [cty(r[0]), r[1]]), { color: 'var(--s6)' })}</div>
        <div class="pg-pane"><div class="pg-title">${T('Altitud de los sitios de colecta (m)', 'Elevation of collecting sites (m)')}</div>
          ${histPlot(s.elevations, { color: 'var(--s4)', unit: ' m' })}</div>
        <div class="pg-pane"><div class="pg-title">${T('Año de colecta', 'Collecting year')}</div>
          ${histPlot(s.years, { color: 'var(--s5)', bins: 10, raw: true })}</div>
      </div>`;
  }

  function renderCompleteness() {
    const box = el('b2Complete');
    if (!box || !state.acc.length) { if (box) box.innerHTML = ''; return; }
    const comp = MCPD.completeness(state.acc);
    const rows = comp.filter(c => c.field.req || c.pct > 0 || c.field.gp).map(c => {
      const color = c.pct >= 90 ? 'var(--stOk)' : c.pct >= 50 ? 'var(--stWarn)' : 'var(--stBad)';
      return `<div class="comp-row" title="${esc(T(c.field.d.es, c.field.d.en))}">
        <span class="comp-k">${esc(T(c.field.es, c.field.en))}${c.field.req === 'must' ? ' *' : ''}</span>
        <span class="comp-bar"><i style="width:${c.pct.toFixed(1)}%;background:${color}"></i></span>
        <span class="comp-v">${fmt(c.pct, 0)} %</span>
      </div>`;
    }).join('');
    box.innerHTML = rows;
  }

  /* ============ exportación ============ */
  function exportCSV(which) {
    const cols = which === 'mcpd' ? MCPD.MCPD_FIELDS.map(f => f.k) : MCPD.FIELDS.map(f => f.k);
    const rows = which === 'mcpd' ? state.acc.map(r => { const o = {}; cols.forEach(k => o[k] = r[k]); return o; }) : state.acc;
    download(IO.toCSV(rows, cols), which === 'mcpd' ? 'pasaporte-mcpd.csv' : 'pasaporte-completo.csv', 'text/csv;charset=utf-8');
  }
  function exportTemplate() {
    const cols = MCPD.FIELDS.map(f => f.k);
    const example = {}; MCPD.FIELDS.forEach(f => example[f.k] = f.ex || '');
    download(IO.toCSV([example], cols), 'plantilla-pasaporte.csv', 'text/csv;charset=utf-8');
  }
  function exportProject() {
    download(JSON.stringify({ app: 'GermplasmPro', version: 1, saved: new Date().toISOString(), acc: state.acc }, null, 1),
      'coleccion-germplasmpro.json', 'application/json');
  }
  function importProject(text) {
    try {
      const o = JSON.parse(text);
      if (!o || !Array.isArray(o.acc)) throw new Error('bad');
      state.acc = o.acc.map(r => Object.assign(MCPD.emptyRow(), r));
      refresh(); save();
    } catch (e) {
      if (window.gpWorkFail) gpWorkFail();
      alert(T('Ese archivo no es un proyecto de GermplasmPro.', 'That file is not a GermplasmPro project.'));
    }
  }

  /* ============ filtros y refresco ============ */
  function syncFilters() {
    const crops = [...new Set(state.acc.map(r => r.CROPNAME).filter(Boolean))].sort();
    const ctys = [...new Set(state.acc.map(r => r.ORIGCTY).filter(Boolean))].sort();
    const fill = (id, list, cur, label) => {
      const s = el(id);
      if (!s) return;
      s.innerHTML = `<option value="">${label}</option>` + list.map(v => `<option value="${esc(v.v)}"${cur === v.v ? ' selected' : ''}>${esc(v.t)}</option>`).join('');
    };
    fill('b2FRoute', MCPD.GPCONS.filter(c => state.acc.some(r => MCPD.consRoute(r) === c.c)).map(c => ({ v: c.c, t: T(c.es, c.en) })), view.route, T('todas las rutas', 'all routes'));
    fill('b2FCrop', crops.map(c => ({ v: c, t: c })), view.crop, T('todos los cultivos', 'all crops'));
    fill('b2FCty', ctys.map(c => ({ v: c, t: (MCPD.COUNTRY_MAP[c] ? T(MCPD.COUNTRY_MAP[c].es, MCPD.COUNTRY_MAP[c].en) : c) })), view.country, T('todos los países', 'all countries'));
    const q = el('b2Q'); if (q && q.value !== view.q) q.value = view.q;
    const oi = el('b2OnlyIssues'); if (oi) oi.classList.toggle('on', view.onlyIssues);
    renderColPicker();
  }

  function renderColPicker() {
    const box = el('b2Cols');
    if (!box) return;
    const keys = ['ACCENUMB', 'ACCENAME', 'GENUS', 'SPECIES', 'CROPNAME', 'SAMPSTAT', 'ORIGCTY', 'COLLSITE', 'DECLATITUDE', 'DECLONGITUDE', 'ELEVATION', 'COLLDATE', 'COLLSRC', 'STORAGE', 'GP_CONS', 'GP_STOCK', 'GP_GERMPCT', 'DUPLSITE'];
    box.innerHTML = keys.map(k => `<button class="chip${view.cols.includes(k) ? ' on' : ''}" data-col="${k}">${esc(T(MCPD.FIELD_MAP[k].es, MCPD.FIELD_MAP[k].en))}</button>`).join('');
    els('[data-col]', box).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.col;
      if (view.cols.includes(k)) { if (view.cols.length > 2) view.cols = view.cols.filter(c => c !== k); }
      else view.cols = view.cols.concat([k]);
      renderColPicker(); renderTable();
    }));
  }

  function refresh() {
    revalidate();
    if (!el('b2Table')) return;          /* sin el panel del bloque, sólo se revalida */
    syncFilters();
    renderTable();
    renderIssues();
    renderSummary();
    renderCompleteness();
    const c = el('b2Count');
    if (c) c.textContent = state.acc.length ? T(`${state.acc.length} accesiones en la colección`, `${state.acc.length} accessions in the collection`) : T('la colección está vacía', 'the collection is empty');
  }

  /* ============ arranque del bloque ============ */
  function init() {
    if (!el('panel-2')) return;

    el('b2File').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      await gpAfterPaint(async () => {
        const text = await IO.readFile(f);
        if (/\.json$/i.test(f.name)) importProject(text); else startImport(text, f.name);
      }, gpWork('Leyendo el archivo', 'Reading the file'));
      e.target.value = '';
    });
    el("b2Paste").addEventListener("click", () => PASTE.open({
      titulo: ["Pega tu tabla de pasaporte", "Paste your passport table"],
      ayuda: ["Copia en tu hoja de cálculo el rango con sus encabezados y pégalo aquí.", "Copy the range with its headers in your spreadsheet and paste it here."],
      onLeer: (texto, o) => startImport(texto, T("texto pegado", "pasted text"), o),
    }));
    el('b2Example').addEventListener('click', () => gpAfterPaint(() => {
      state.acc = EXAMPLES.build();
      view.page = 0; refresh(); save();
      el('b2Table').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, gpWork('Cargando la colección de ejemplo', 'Loading the example collection')));
    el('b2Blank').addEventListener('click', () => {
      state.acc = [MCPD.emptyRow()];
      refresh(); save(); openFicha(0);
    });
    el('b2Add').addEventListener('click', () => {
      state.acc.push(MCPD.emptyRow());
      refresh(); save(); openFicha(state.acc.length - 1);
    });
    el('b2Clear').addEventListener('click', () => {
      if (!state.acc.length) return;
      if (!confirm(T('¿Vaciar la colección? Se borra lo que está en este navegador.', 'Empty the collection? This clears what is stored in this browser.'))) return;
      state.acc = []; refresh(); save();
    });

    el('b2MapApply').addEventListener('click', () => gpAfterPaint(() => applyImport('replace'), gpWork('Importando las accesiones', 'Importing the accessions')));
    el('b2MapAppend').addEventListener('click', () => gpAfterPaint(() => applyImport('append'), gpWork('Importando las accesiones', 'Importing the accessions')));
    el('b2MapCancel').addEventListener('click', () => { pending = null; el('b2MapCard').style.display = 'none'; });
    el('b2MapAuto').addEventListener('click', () => { if (pending) { pending.map = MCPD.guessMapping(pending.parsed.headers, pending.parsed.rows.slice(0, 20)); renderMapping(); } });

    el('b2Q').addEventListener('input', () => { view.q = el('b2Q').value; view.page = 0; renderTable(); });
    el('b2FRoute').addEventListener('change', () => { view.route = el('b2FRoute').value; view.page = 0; renderTable(); });
    el('b2FCrop').addEventListener('change', () => { view.crop = el('b2FCrop').value; view.page = 0; renderTable(); });
    el('b2FCty').addEventListener('change', () => { view.country = el('b2FCty').value; view.page = 0; renderTable(); });
    el('b2OnlyIssues').addEventListener('click', () => { view.onlyIssues = !view.onlyIssues; view.page = 0; syncFilters(); renderTable(); });

    el('b2ExpMcpd').addEventListener('click', () => exportCSV('mcpd'));
    el('b2ExpFull').addEventListener('click', () => exportCSV('full'));
    el('b2Template').addEventListener('click', exportTemplate);
    el('b2ExpProj').addEventListener('click', exportProject);

    el('fichaPrev').addEventListener('click', () => { if (view.fichaIdx > 0) { view.fichaIdx--; renderFicha(); } });
    el('fichaNext').addEventListener('click', () => { if (view.fichaIdx < state.acc.length - 1) { view.fichaIdx++; renderFicha(); } });

    restore();
    refresh();
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('langchange', () => { if (el('panel-2') && state.acc) refresh(); });

  window.B2 = { refresh, barPlot, histPlot, view, exportCSV, startImport, applyImport, openFicha, revalidate, pending: () => pending, issues: () => issues };
})();
