/* GermplasmPro — leer y escribir archivos de texto separados por comas,
   por tabuladores o por punto y coma, sin bibliotecas.

   Los archivos reales de un banco de germoplasma vienen de hojas de cálculo y traen de
   todo: comillas, comas dentro de los nombres de sitio, saltos de línea dentro
   de una celda, marca de orden de bytes al principio y, con suerte una de cada
   tres veces, codificación Windows-1252 en vez de UTF-8. Esto lo resuelve. */

(function () {

  /* elige el separador contando cuál parte todas las líneas en el mismo
     número de campos (fuera de comillas), no simplemente cuál abunda */
  function detectDelimiter(text) {
    const sample = text.split(/\r?\n/).filter(l => l.trim() !== '').slice(0, 20);
    if (!sample.length) return ',';
    let best = ',', bestScore = -1;
    for (const d of ['\t', ';', ',', '|']) {
      const counts = sample.map(l => splitLine(l, d).length);
      const first = counts[0];
      if (first < 2) continue;
      const consistent = counts.filter(c => c === first).length / counts.length;
      const score = consistent * 10 + Math.min(first, 40) / 40;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }
  /* partir una línea respetando las comillas (sólo para medir el separador) */
  function splitLine(line, d) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === d) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /* ¿la primera fila son encabezados o ya son datos?

     Quien copia de una hoja de cálculo a veces selecciona la tabla con sus títulos y a veces
     sólo los renglones. Distinguirlo se puede: un encabezado no suele traer
     números, no repite textos, no deja celdas vacías y se parece poco a la
     fila que le sigue. Ninguna de esas señales basta sola, así que se suman y
     se compara con la segunda fila, que sí es un dato seguro. */
  const esNumero = v => v !== '' && isFinite(String(v).replace(',', '.').replace(/\s/g, ''));
  /* a qué se parece una celda; comparar formas distingue mejor que contar números */
  function forma(v) {
    const s = String(v ?? '').trim();
    if (s === '') return 'vacio';
    if (esNumero(s)) return 'num';
    if (/^\d{4}[-/]?\d{2}[-/]?\d{2}$/.test(s)) return 'fecha';
    if (/\d/.test(s) && /[a-záéíóúñ]/i.test(s)) return 'codigo';     /* MEX-001, LAB-2019-100 */
    return 'texto';
  }

  function looksLikeHeader(matrix) {
    if (!matrix || !matrix.length) return false;
    const fila = matrix[0].map(c => String(c ?? '').trim());
    if (!fila.length) return false;
    const datos = matrix.slice(1, 8);

    /* Con una sola fila no hay con qué comparar: se decide por su aspecto, y
       si nos equivocamos el diálogo lo dice y basta una casilla para corregirlo. */
    if (!datos.length) {
      const nums = fila.filter(esNumero).length / fila.length;
      return nums === 0 && fila.every(c => c !== '');
    }

    /* La señal fuerte está sólo en las columnas cuyos datos tienen una forma
       reconocible —números, fechas o códigos—, porque un título nunca la
       tiene. Una columna de texto sobre texto no dice nada en ningún sentido,
       así que no se cuenta: pesarla sólo diluye la evidencia. */
    let distintas = 0, informativas = 0;
    for (let c = 0; c < fila.length; c++) {
      const abajo = datos.map(r => forma(r[c])).filter(f => f !== 'vacio');
      if (!abajo.length) continue;
      const frec = {};
      abajo.forEach(f => { frec[f] = (frec[f] || 0) + 1; });
      const comun = Object.keys(frec).sort((a, b) => frec[b] - frec[a])[0];
      if (comun === 'texto') continue;                 /* texto sobre texto: no informa */
      informativas++;
      if (forma(fila[c]) !== comun) distintas++;
    }
    if (informativas) return distintas / informativas > 0.5;

    /* Todas las columnas son texto sobre texto: no hay nada que comparar. Sólo
       se declara encabezado si tiene pinta de título. */
    const nums = fila.filter(esNumero).length / fila.length;
    if (nums > 0) return false;
    const propio = fila.every(c => c !== '')
      && new Set(fila.map(c => c.toLowerCase())).size === fila.length
      && fila.every(c => forma(c) === 'texto');
    /* «MEX-101 · Zea · mays» cumple lo anterior salvo por el código: eso lo
       delata como dato, no como título */
    return propio && fila.some(c => /\s/.test(c) || c.length > 9);
  }

  /* nombre de columna al estilo de una hoja de cálculo: A, B, … Z, AA, AB… */
  function columnName(i) {
    let s = '';
    for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
    return s;
  }

  /* analizador completo: admite saltos de línea dentro de una celda entre comillas.
     opts.header = false trata la primera fila como datos y nombra las columnas
     «Columna A», «Columna B»… */
  function parseDelimited(text, delim, opts) {
    let t = String(text ?? '');
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);          /* marca de orden de bytes */
    const d = delim || detectDelimiter(t);
    const rows = [];
    let row = [], cur = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) {
        if (ch === '"') {
          if (t[i + 1] === '"') { cur += '"'; i++; }
          else q = false;
        } else cur += ch;
      } else if (ch === '"') {
        q = true;
      } else if (ch === d) {
        row.push(cur); cur = '';
      } else if (ch === '\n') {
        row.push(cur); cur = ''; rows.push(row); row = [];
      } else if (ch === '\r') {
        /* fin de línea de Windows: el \n siguiente cierra la fila */
      } else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }

    /* fuera las filas totalmente vacías */
    const clean = rows.filter(r => r.some(c => String(c).trim() !== ''));
    if (!clean.length) return { delim: d, headers: [], rows: [], matrix: [], header: true };

    /* sin encabezados, las columnas toman el nombre que tendrían en la hoja */
    const conCabecera = !opts || opts.header !== false;
    if (!conCabecera) {
      const ancho = Math.max(...clean.map(r => r.length));
      const headers = Array.from({ length: ancho }, (_, i) => `Columna ${columnName(i)}`);
      const objs = clean.map(r => {
        const o = {};
        headers.forEach((h, i) => { o[h] = String(r[i] ?? '').trim(); });
        return o;
      });
      return { delim: d, headers, rows: objs, matrix: clean, header: false };
    }

    const headers = clean[0].map((h, i) => {
      const name = String(h).trim();
      return name || `Columna ${columnName(i)}`;
    });
    /* encabezados repetidos: se numeran para no perder columnas */
    const seen = {};
    headers.forEach((h, i) => {
      if (seen[h] == null) seen[h] = 0;
      else { seen[h]++; headers[i] = `${h} (${seen[h] + 1})`; }
    });

    const objs = clean.slice(1).map(r => {
      const o = {};
      headers.forEach((h, i) => { o[h] = String(r[i] ?? '').trim(); });
      return o;
    });
    return { delim: d, headers, rows: objs, matrix: clean, header: true };
  }

  /* escribir CSV: se entrecomilla sólo lo que lo necesita */
  function cell(v, d) {
    const s = String(v ?? '');
    return /["\n\r]|^\s|\s$/.test(s) || s.includes(d) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(rows, columns, delim) {
    const d = delim || ',';
    const cols = columns && columns.length ? columns : Object.keys(rows[0] || {});
    const head = cols.map(c => cell(c, d)).join(d);
    const body = rows.map(r => cols.map(c => cell(r[c], d)).join(d));
    return [head, ...body].join('\r\n') + '\r\n';
  }

  /* leer un archivo del disco, adivinando la codificación:
     si al decodificar como UTF-8 aparecen caracteres de reemplazo, casi seguro
     viene de una hoja de cálculo en Windows-1252 */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
      fr.onload = () => {
        const buf = fr.result;
        let text = '';
        try {
          text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
          if (/�/.test(text)) {
            try { text = new TextDecoder('windows-1252').decode(buf); } catch (e) { /* se queda el utf-8 */ }
          }
        } catch (e) {
          text = String(buf);
        }
        resolve(text);
      };
      fr.readAsArrayBuffer(file);
    });
  }

  /* Radiografía de un texto pegado, para enseñarle al usuario qué entendimos
     antes de que lo demos por bueno: cuántas filas y columnas salen, con qué
     separador, si la primera fila parece encabezado y qué cosas suelen salir
     mal al copiar de una hoja de cálculo. */
  const NOMBRE_SEP = { '\t': ['tabuladores', 'tabs'], ',': ['comas', 'commas'], ';': ['punto y coma', 'semicolons'], '|': ['barras', 'pipes'] };

  function describe(text, opts) {
    const t = String(text ?? '');
    const o = opts || {};
    const vacio = !t.trim();
    const parsed = vacio ? { delim: ',', headers: [], rows: [], matrix: [], header: true }
      : parseDelimited(t, o.delim || null, { header: o.header !== false });
    const m = parsed.matrix;
    const avisos = [];

    if (!vacio && m.length) {
      /* filas con distinto número de celdas: casi siempre una coma suelta
         dentro de un texto sin comillas, o una celda combinada en la hoja de cálculo */
      const frec = new Map();
      m.forEach(r => frec.set(r.length, (frec.get(r.length) || 0) + 1));
      let modo = 0, mejor = -1;
      frec.forEach((n, ancho) => { if (n > mejor || (n === mejor && ancho > modo)) { mejor = n; modo = ancho; } });
      const disparejas = m.filter(r => r.length !== modo).length;
      if (disparejas) {
        avisos.push({
          nivel: 'warn', code: 'disparejas',
          es: `${disparejas} ${disparejas === 1 ? 'fila no tiene' : 'filas no tienen'} el mismo número de celdas que las demás (${modo}). Suele ser una coma dentro de un texto, o celdas combinadas en la hoja.`,
          en: `${disparejas} ${disparejas === 1 ? 'row does not have' : 'rows do not have'} the same number of cells as the rest (${modo}). Usually a comma inside a text, or merged cells in the sheet.`,
        });
      }
      /* una sola columna: puede ser a propósito —copiar una columna de una hoja de cálculo es
         de lo más normal—, así que se pregunta en vez de afirmar, y no se
         bloquea nada */
      if (modo === 1) {
        avisos.push({
          nivel: 'warn', code: 'unacolumna',
          es: 'Todo quedó en una sola columna. Si tu tabla tenía más, el separador no es el correcto: elígelo abajo.',
          en: 'Everything landed in a single column. If your table had more, the separator is not the right one: pick it below.',
        });
      }
      /* coma decimal: 17,6871 en vez de 17.6871 rompe las coordenadas */
      const cuerpo = parsed.header ? m.slice(1) : m;
      let comaDecimal = 0, ejemplo = '';
      cuerpo.forEach(r => r.forEach(c => {
        const v = String(c).trim();
        if (/^-?\d{1,3},\d+$/.test(v)) { comaDecimal++; if (!ejemplo) ejemplo = v; }
      }));
      if (comaDecimal >= 2 && parsed.delim !== ',') {
        avisos.push({
          nivel: 'info', code: 'comaDecimal',
          es: `${comaDecimal} valores usan coma decimal, como «${ejemplo}». La app los entiende al validar, pero si son coordenadas conviene que tu hoja use punto.`,
          en: `${comaDecimal} values use a decimal comma, such as “${ejemplo}”. The app understands them when validating, but if they are coordinates it is better for your sheet to use a point.`,
        });
      }
      /* una sola fila y parece encabezado: copió los títulos y nada más */
      if (cuerpo.length === 0) {
        avisos.push({
          nivel: 'error', code: 'sinfilas',
          es: 'Sólo hay una fila y se está tomando como encabezado: no quedan datos que importar.',
          en: 'There is only one row and it is being taken as a header: no data left to import.',
        });
      }
    }

    return {
      vacio,
      delim: parsed.delim,
      delimNombre: NOMBRE_SEP[parsed.delim] || ['el separador elegido', 'the chosen separator'],
      header: parsed.header,
      pareceEncabezado: looksLikeHeader(parsed.matrix),
      filas: parsed.rows.length,
      columnas: parsed.headers.length,
      headers: parsed.headers,
      muestra: parsed.rows.slice(0, 6),
      matrix: parsed.matrix,
      avisos,
      parsed,
    };
  }

  window.IO = { detectDelimiter, parseDelimited, toCSV, readFile, splitLine, looksLikeHeader, columnName, describe };
})();
