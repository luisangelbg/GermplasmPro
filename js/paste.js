/* GermplasmPro — el asistente para pegar una tabla desde una hoja de cálculo.

   Lo usan el Bloque 2 (pasaporte) y el Bloque 7 (caracterización), porque el
   problema es el mismo: alguien copia un rango de una hoja de cálculo y hay que entenderlo
   sin que tenga que adivinar nada.

   La idea de fondo: nadie debería pulsar «Leer» a ciegas. En cuanto el texto
   entra, se lee, se enseña qué se entendió —cuántas filas, cuántas columnas,
   con qué separador—, se dibujan las primeras filas ya partidas en celdas y se
   avisa de lo que suele salir mal al copiar de una hoja. Lo que no se pueda
   adivinar se corrige ahí mismo: el separador y si la primera fila son
   encabezados o ya son datos.

   Quien lo llama sólo pasa un título, una ayuda y qué hacer con el resultado:
     PASTE.open({ titulo:[es,en], ayuda:[es,en], onLeer(texto, {delim, header}) }) */

(function () {

  let estado = { sep: '', header: null, texto: '' };
  let alLeer = null;
  let textos = null;

  function ponerTextos() {
    if (!textos) return;
    if (textos.titulo) el('pasteTitle').textContent = T(textos.titulo[0], textos.titulo[1]);
    if (textos.ayuda) el('pasteAyuda').textContent = T(textos.ayuda[0], textos.ayuda[1]);
  }

  function diagnostico() {
    const o = { delim: estado.sep || null };
    if (estado.header !== null) o.header = estado.header;
    return IO.describe(estado.texto, o);
  }

  function render() {
    const zona = el('pasteZone');
    const hay = estado.texto.trim() !== '';
    el('pasteHint').style.display = hay ? 'none' : '';
    zona.classList.toggle('lleno', hay);
    el('pasteRead').style.display = hay ? '' : 'none';
    const go = el('pasteGo');
    if (!hay) {
      go.disabled = true;
      el('pasteGoHint').textContent = '';
      return;
    }

    const d = diagnostico();
    /* la primera vez decide la app; después manda lo que el usuario marcó */
    if (estado.header === null) {
      estado.header = d.pareceEncabezado;
      el('pasteHeader').checked = estado.header;
      return render();
    }
    el('pasteHeader').checked = estado.header;
    el('pasteSep').value = estado.sep;

    const sep = T(d.delimNombre[0], d.delimNombre[1]);
    el('pasteStats').innerHTML = `
      <div class="pstat"><b>${fmtInt(d.filas)}</b><span>${T(d.filas === 1 ? 'fila' : 'filas', d.filas === 1 ? 'row' : 'rows')}</span></div>
      <div class="pstat"><b>${fmtInt(d.columnas)}</b><span>${T(d.columnas === 1 ? 'columna' : 'columnas', d.columnas === 1 ? 'column' : 'columns')}</span></div>
      <div class="pstat"><b>${esc(sep)}</b><span>${T('separador', 'separator')}</span></div>`;

    el('pasteWarns').innerHTML = d.avisos.map(a =>
      `<div class="paste-warn ${a.nivel}">${esc(T(a.es, a.en))}</div>`).join('');

    /* vista previa: las primeras filas, ya partidas en celdas */
    const cols = d.headers.slice(0, 9);
    const sobran = d.columnas - cols.length;
    el('pastePrev').innerHTML = d.filas ? `
      <table class="tbl tbl-prev"><thead><tr>${cols.map(h =>
        `<th>${esc(String(h).slice(0, 26))}</th>`).join('')}${sobran > 0 ? `<th class="mas">+${sobran}</th>` : ''}</tr></thead>
      <tbody>${d.muestra.map(r => `<tr>${cols.map(h =>
        `<td>${esc(String(r[h] ?? '').slice(0, 30))}</td>`).join('')}${sobran > 0 ? '<td class="mas">…</td>' : ''}</tr>`).join('')}</tbody></table>
      ${d.filas > d.muestra.length ? `<p class="hint" style="margin:6px 0 0">${T(
        `y ${fmtInt(d.filas - d.muestra.length)} filas más`, `and ${fmtInt(d.filas - d.muestra.length)} more rows`)}</p>` : ''}` : '';

    const bloqueado = d.avisos.some(a => a.nivel === 'error') || !d.filas;
    go.disabled = bloqueado;
    go.querySelectorAll('span').forEach(s => {
      s.textContent = s.dataset.l === 'en'
        ? `Read ${d.filas} ${d.filas === 1 ? 'row' : 'rows'}`
        : `Leer ${d.filas} ${d.filas === 1 ? 'fila' : 'filas'}`;
    });
    el('pasteGoHint').textContent = bloqueado
      ? T('Corrige lo de arriba para continuar.', 'Fix the above to continue.')
      : T('Después podrás decir qué es cada columna.', 'Next you will say what each column is.');
  }

  function setTexto(t) {
    estado.texto = t;
    estado.header = null;        /* se vuelve a decidir con el texto nuevo */
    el('pasteArea').value = t;
    render();
  }

  function open(opts) {
    const o = opts || {};
    alLeer = o.onLeer || null;
    estado = { sep: '', header: null, texto: '' };
    el('pasteArea').value = '';
    el('pasteSep').value = '';
    cols = o.columnas === false ? [] : basicas();
    rejilla = [];
    tplBusca = '';
    el('tplSearch').value = '';
    el('tplRows').value = 10;
    /* el Bloque 7 no pide el pasaporte: allí la plantilla arranca vacía */
    if (o.soloTraits) cols = [];
    verPestana('pegar');
    /* el título y la ayuda los pone quien abre el diálogo, en el idioma de la app */
    textos = o;
    ponerTextos();
    render();
    el('pasteDlg').showModal();
    setTimeout(() => el('pasteArea').focus(), 50);
  }

  /* ================= la plantilla guiada =================

     El problema que resuelve: las columnas del pasaporte se llaman ACCENUMB,
     DECLATITUDE o SAMPSTAT, y nadie tiene por qué saberse esas abreviaturas.
     Aquí se enseñan todas con su nombre completo, qué significan, en qué
     unidad van y un ejemplo; se marcan las que se vayan a usar y aparece la
     tabla lista para llenar: escribiendo, pegando una columna entera de una hoja de cálculo
     o pegando el bloque completo. */
  let cols = [];               /* claves elegidas, en orden */
  let rejilla = [];            /* [{col: valor}] */
  let tplBusca = '';

  /* el catálogo completo: pasaporte + caracterización, cada uno con su grupo */
  function catalogo() {
    const out = [];
    MCPD.GROUPS.forEach(g => out.push({
      g: 'mcpd:' + g.g, es: g.es, en: g.en, d: null,
      campos: MCPD.FIELDS.filter(f => f.g === g.g).map(f => ({
        k: f.k, es: f.es, en: f.en, d: f.d, ex: f.ex, u: '', req: f.req, origen: 'acc',
      })),
    }));
    if (window.TRAITS) TRAITS.GROUPS.forEach(g => out.push({
      g: 'tr:' + g.g, es: g.es, en: g.en, d: g.d,
      campos: TRAITS.byGroup(g.g).map(f => ({
        k: f.k, es: f.es, en: f.en, d: f.d, ex: f.ex, u: f.u, req: null, origen: 'trait',
      })),
    }));
    return out;
  }
  const CLAVE = k => (window.TRAITS && TRAITS.has(k)) ? 'trait' : 'acc';

  /* lo indispensable para empezar: lo obligatorio y lo muy recomendable */
  function basicas() {
    return MCPD.FIELDS.filter(f => f.req === 'must' || f.req === 'should').map(f => f.k);
  }

  function renderCatalogo() {
    const q = MCPD.norm(tplBusca);
    const marcadas = new Set(cols);
    el('tplCat').innerHTML = catalogo().map(g => {
      const campos = g.campos.filter(f => !q
        || MCPD.norm(T(f.es, f.en)).includes(q) || MCPD.norm(f.k).includes(q)
        || MCPD.norm(T(f.d ? f.d.es : '', f.d ? f.d.en : '')).includes(q));
      if (!campos.length) return '';
      const n = campos.filter(f => marcadas.has(f.k)).length;
      return `<details class="tpl-grupo"${q || n ? ' open' : ''}>
        <summary>${esc(T(g.es, g.en))}<span class="tpl-n">${n ? `${n}/${campos.length}` : campos.length}</span></summary>
        ${g.d ? `<p class="hint tpl-gd">${esc(T(g.d.es, g.d.en))}</p>` : ''}
        <div class="tpl-campos">${campos.map(f => `
          <label class="tpl-campo${marcadas.has(f.k) ? ' on' : ''}">
            <input type="checkbox" data-tpl="${esc(f.k)}"${marcadas.has(f.k) ? ' checked' : ''}>
            <div>
              <div class="tpl-nom">${esc(T(f.es, f.en))}${f.u ? ` <span class="tpl-u">(${esc(f.u)})</span>` : ''}${
                f.req === 'must' ? `<span class="tag bad">${T('obligatorio', 'mandatory')}</span>` : ''}</div>
              <div class="tpl-cod">${esc(f.k)}</div>
              ${f.d ? `<div class="tpl-d">${esc(T(f.d.es, f.d.en))}</div>` : ''}
              ${f.ex ? `<div class="tpl-ej">${T('ejemplo', 'example')}: <code>${esc(f.ex)}</code></div>` : ''}
            </div>
          </label>`).join('')}</div>
      </details>`;
    }).join('') || `<p class="hint">${T('Ninguna columna coincide con esa búsqueda.', 'No column matches that search.')}</p>`;

    el('tplCount').textContent = cols.length
      ? T(`${cols.length} ${cols.length === 1 ? 'columna elegida' : 'columnas elegidas'}`,
        `${cols.length} ${cols.length === 1 ? 'column chosen' : 'columns chosen'}`)
      : T('ninguna columna elegida todavía', 'no column chosen yet');

    els('[data-tpl]', el('tplCat')).forEach(c => c.addEventListener('change', () => {
      const k = c.dataset.tpl;
      if (c.checked) { if (!cols.includes(k)) cols.push(k); }
      else cols = cols.filter(x => x !== k);
      renderCatalogo();
      renderRejilla();
    }));
  }

  function filasPedidas() { return clamp(Number(el('tplRows').value) || 10, 1, 500); }

  function renderRejilla() {
    const n = filasPedidas();
    while (rejilla.length < n) rejilla.push({});
    rejilla.length = n;
    if (!cols.length) {
      el('tplGridWrap').innerHTML = `<p class="hint">${T('Marca arriba las columnas que vayas a usar.', 'Tick above the columns you will use.')}</p>`;
      sincronizarTexto();
      return;
    }
    const nom = k => {
      const f = MCPD.FIELD_MAP[k] || (window.TRAITS ? TRAITS.FIELD_MAP[k] : null);
      return f ? T(f.es, f.en) : k;
    };
    el('tplGridWrap').innerHTML = `
      <table class="tbl tpl-grid"><thead><tr><th class="tpl-rn"></th>${cols.map(k =>
        `<th title="${esc(k)}">${esc(nom(k))}<div class="tpl-cod">${esc(k)}</div></th>`).join('')}</tr></thead>
      <tbody>${rejilla.map((r, i) => `<tr><td class="tpl-rn">${i + 1}</td>${cols.map(k =>
        `<td><input class="tpl-cell" data-r="${i}" data-c="${esc(k)}" value="${esc(r[k] || '')}"></td>`).join('')}</tr>`).join('')}</tbody></table>`;

    els('.tpl-cell', el('tplGridWrap')).forEach(inp => {
      inp.addEventListener('input', () => {
        rejilla[+inp.dataset.r][inp.dataset.c] = inp.value;
        sincronizarTexto();
      });
      /* pegar aquí una columna entera de una hoja de cálculo: se reparte hacia abajo.
         Si el pegado trae varias columnas, se reparte también hacia la derecha. */
      inp.addEventListener('paste', e => {
        const t = (e.clipboardData || window.clipboardData).getData('text');
        if (!t || !/[\t\r\n]/.test(t)) return;        /* un solo valor: pegado normal */
        e.preventDefault();
        e.stopPropagation();
        const filas = t.replace(/\r/g, '').split('\n').filter((l, i, a) => l !== '' || i < a.length - 1);
        const r0 = +inp.dataset.r, c0 = cols.indexOf(inp.dataset.c);
        if (r0 + filas.length > rejilla.length) {
          el('tplRows').value = Math.min(500, r0 + filas.length);
        }
        const n2 = filasPedidas();
        while (rejilla.length < n2) rejilla.push({});
        filas.forEach((linea, di) => {
          const celdas = linea.split('\t');
          celdas.forEach((v, dj) => {
            const k = cols[c0 + dj];
            if (k && rejilla[r0 + di]) rejilla[r0 + di][k] = v.trim();
          });
        });
        renderRejilla();
      });
    });
    sincronizarTexto();
  }

  /* la rejilla alimenta el mismo camino que un pegado normal */
  function sincronizarTexto() {
    if (!cols.length) { estado.texto = ''; return; }
    const llenas = rejilla.filter(r => cols.some(k => String(r[k] || '').trim() !== ''));
    estado.sep = '\t';
    estado.header = true;
    estado.texto = llenas.length
      ? [cols.join('\t')].concat(llenas.map(r => cols.map(k => String(r[k] || '').replace(/[\t\n]/g, ' ')).join('\t'))).join('\n')
      : '';
    const go = el('pasteGo');
    go.disabled = !llenas.length;
    go.querySelectorAll('span').forEach(s => {
      s.textContent = s.dataset.l === 'en'
        ? `Read ${llenas.length} ${llenas.length === 1 ? 'row' : 'rows'}`
        : `Leer ${llenas.length} ${llenas.length === 1 ? 'fila' : 'filas'}`;
    });
    el('pasteGoHint').textContent = llenas.length
      ? T('Después podrás decir qué es cada columna.', 'Next you will say what each column is.')
      : T('Escribe o pega algo en la tabla.', 'Type or paste something into the table.');
  }

  function verPestana(cual) {
    els('[data-ptab]', el('pasteTabs')).forEach(b => b.classList.toggle('on', b.dataset.ptab === cual));
    el('pastePegarPane').style.display = cual === 'pegar' ? '' : 'none';
    el('pasteTplPane').style.display = cual === 'plantilla' ? '' : 'none';
    if (cual === 'plantilla') { renderCatalogo(); renderRejilla(); }
    else { estado.sep = ''; estado.header = null; estado.texto = el('pasteArea').value; render(); }
  }

  function descargarPlantilla() {
    if (!cols.length) { alert(T('Marca primero las columnas que quieres.', 'Tick the columns you want first.')); return; }
    const filas = rejilla.filter(r => cols.some(k => String(r[k] || '').trim() !== ''));
    const cuerpo = filas.length ? filas : [Object.fromEntries(cols.map(k => [k, '']))];
    download(IO.toCSV(cuerpo, cols), 'plantilla-germplasmpro.csv', 'text/csv;charset=utf-8');
  }

  function init() {
    if (!el('pasteDlg')) return;
    els('[data-ptab]', el('pasteTabs')).forEach(b => b.addEventListener('click', () => verPestana(b.dataset.ptab)));
    el('tplSearch').addEventListener('input', () => { tplBusca = el('tplSearch').value; renderCatalogo(); });
    el('tplBasics').addEventListener('click', () => { cols = basicas(); renderCatalogo(); renderRejilla(); });
    el('tplNone').addEventListener('click', () => { cols = []; renderCatalogo(); renderRejilla(); });
    el('tplRows').addEventListener('change', renderRejilla);
    el('tplCsv').addEventListener('click', descargarPlantilla);

    /* pegar en cualquier punto del diálogo, no sólo dentro del recuadro */
    el('pasteDlg').addEventListener('paste', e => {
      const t = (e.clipboardData || window.clipboardData).getData('text');
      if (!t) return;
      e.preventDefault();
      setTexto(t);
    });
    el('pasteArea').addEventListener('input', () => setTexto(el('pasteArea').value));

    el('pasteClip').addEventListener('click', async () => {
      try {
        const t = await navigator.clipboard.readText();
        if (t && t.trim()) setTexto(t);
        else alert(T('El portapapeles está vacío.', 'The clipboard is empty.'));
      } catch (e) {
        alert(T('El navegador no dejó leer el portapapeles. Pega con Ctrl+V dentro del recuadro.',
          'The browser did not allow reading the clipboard. Paste with Ctrl+V inside the box.'));
        el('pasteArea').focus();
      }
    });

    el('pasteHeader').addEventListener('change', () => { estado.header = el('pasteHeader').checked; render(); });
    el('pasteSep').addEventListener('change', () => { estado.sep = el('pasteSep').value; render(); });
    el('pasteClear').addEventListener('click', () => { setTexto(''); el('pasteArea').focus(); });

    el('pasteGo').addEventListener('click', () => {
      const d = diagnostico();
      if (!d.filas || !alLeer) return;
      el('pasteDlg').close();
      alLeer(estado.texto, { delim: estado.sep || null, header: estado.header });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  /* si cambian el idioma con el diálogo abierto, se rehace lo que hay dentro */
  document.addEventListener('langchange', () => {
    if (el('pasteDlg') && el('pasteDlg').open) { ponerTextos(); render(); }
  });

  window.PASTE = { open, diagnostico, estado: () => estado };
})();
