/* GermplasmPro — el motor del Bloque 9: códigos de barras y etiquetas.

   CÓDIGO DE BARRAS. Se genera Code 128 de verdad, no un dibujo decorativo: la
   tabla de los 107 símbolos, el juego B para texto y el C para tramos largos
   de dígitos (que ocupan la mitad), el dígito de control
   (start + Σ posición × valor) mod 103 y el patrón de parada. Cualquier lector
   de los que se usan en un laboratorio lo lee. Todo símbolo mide 11 módulos
   salvo la parada, que mide 13; la suite de pruebas comprueba justo eso, y
   además vuelve a leer el código que la app dibuja.

   ETIQUETAS. Cinco formatos con las medidas reales que se usan en un banco
   —sobre de semilla, frasco de cámara, estaca de campo, criotubo y etiqueta de
   envío— y una hoja tamaño carta o A4 que los acomoda en rejilla. Se dibujan
   en milímetros para que salgan del tamaño correcto al imprimir, no del tamaño
   que le parezca al navegador.

   LISTAS. Las hojas de trabajo que acompañan al material: lista de siembra
   para una regeneración, vale de distribución y libro de registro. */

(function () {

  /* ================= Code 128 ================= */
  /* anchos de cada símbolo: tres barras y tres espacios que suman 11 módulos */
  const C128 = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
  ];
  const START_B = 104, START_C = 105, STOP = 106, CODE_B = 100, CODE_C = 99;

  /* ¿conviene el juego C aquí? Sólo si hay al menos cuatro dígitos seguidos
     (seis al principio), porque cada símbolo C guarda dos dígitos. */
  function digitsRun(s, i) {
    let n = 0;
    while (i + n < s.length && s[i + n] >= '0' && s[i + n] <= '9') n++;
    return n;
  }

  /* devuelve los valores de los símbolos, sin la parada */
  function encode128(text) {
    const s = String(text ?? '');
    if (!s) return null;
    /* Code 128 B cubre del espacio al DEL; lo de fuera no se puede codificar */
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      if (c < 32 || c > 126) return null;
    }
    const values = [];
    let i = 0, mode = null;
    const startRun = digitsRun(s, 0);
    if (startRun >= 4 && startRun % 2 === 0 && startRun === s.length) { values.push(START_C); mode = 'C'; }
    else if (startRun >= 6) { values.push(START_C); mode = 'C'; }
    else { values.push(START_B); mode = 'B'; }

    while (i < s.length) {
      const run = digitsRun(s, i);
      if (mode === 'C') {
        if (run >= 2) {
          values.push(Number(s.substr(i, 2)));
          i += 2;
          continue;
        }
        values.push(CODE_B); mode = 'B';
        continue;
      }
      /* en modo B, se cambia a C cuando vienen al menos seis dígitos seguidos
         (o cuatro si son los últimos y son pares) */
      if (run >= 6 || (run >= 4 && i + run === s.length && run % 2 === 0)) {
        values.push(CODE_C); mode = 'C';
        continue;
      }
      values.push(s.charCodeAt(i) - 32);
      i++;
    }
    /* si el modo C quedó con un dígito suelto ya se resolvió arriba */
    const check = values.reduce((sum, v, idx) => sum + (idx === 0 ? v : v * idx), 0) % 103;
    values.push(check);
    values.push(STOP);
    return values;
  }

  /* patrón de anchos completo (barra, espacio, barra, …) */
  function widths128(text) {
    const v = encode128(text);
    if (!v) return null;
    return v.map(x => C128[x]).join('') + '';
  }

  /* el código como SVG, en milímetros */
  function barcodeSVG(text, opts) {
    const o = Object.assign({ mm: 30, height: 8, module: 0, quiet: 2, showText: true, fontSize: 2.4, color: '#000' }, opts || {});
    const w = widths128(text);
    if (!w) return '';
    const modules = [...w].reduce((a, c) => a + Number(c), 0);
    const mod = o.module > 0 ? o.module : (o.mm - 2 * o.quiet) / modules;
    let x = o.quiet, bar = true;
    const rects = [];
    for (const c of w) {
      const n = Number(c);
      if (bar) rects.push(`<rect x="${x.toFixed(3)}" y="0" width="${(n * mod).toFixed(3)}" height="${o.height}" fill="${o.color}"/>`);
      x += n * mod;
      bar = !bar;
    }
    const totalW = x + o.quiet;
    const th = o.showText ? o.fontSize + 0.8 : 0;
    return `<svg viewBox="0 0 ${totalW.toFixed(2)} ${(o.height + th).toFixed(2)}" width="${o.mm}mm" height="${((o.height + th) * o.mm / totalW).toFixed(2)}mm" xmlns="http://www.w3.org/2000/svg">
      ${rects.join('')}
      ${o.showText ? `<text x="${(totalW / 2).toFixed(2)}" y="${(o.height + o.fontSize).toFixed(2)}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="${o.fontSize}" fill="${o.color}">${esc(text)}</text>` : ''}
    </svg>`;
  }

  /* lector propio, para comprobar lo que dibujamos (lo usa la suite de pruebas) */
  function decode128(widths) {
    const syms = [];
    let s = String(widths);
    /* la parada mide 13 módulos en siete elementos; el resto, 11 en seis */
    while (s.length) {
      if (s.length === 7) { syms.push(s); break; }
      syms.push(s.slice(0, 6));
      s = s.slice(6);
    }
    const values = syms.map(p => C128.indexOf(p));
    if (values.some(v => v < 0)) return null;
    if (values[values.length - 1] !== STOP) return null;
    const body = values.slice(0, -2);
    const check = values[values.length - 2];
    const calc = body.reduce((sum, v, idx) => sum + (idx === 0 ? v : v * idx), 0) % 103;
    if (calc !== check) return null;
    let mode = body[0] === START_C ? 'C' : 'B', out = '';
    for (let i = 1; i < body.length; i++) {
      const v = body[i];
      if (v === CODE_B) { mode = 'B'; continue; }
      if (v === CODE_C) { mode = 'C'; continue; }
      out += mode === 'C' ? String(v).padStart(2, '0') : String.fromCharCode(v + 32);
    }
    return out;
  }

  /* ================= el chayote, en vectorial =================
     Un fruto piriforme con sus surcos longitudinales y el pedúnculo corto.
     Va dentro de un disco claro en el centro del QR. El hueco es un cuadro de
     round(0.26 n) módulos por lado: 7 × 7 = 49 de 625 módulos (7.8 %) en la
     versión 2 de los números de accesión. El nivel H recupera hasta el 30 %
     de los códigos de cada bloque; la suite cuenta cuántos códigos toca el
     hueco en cada bloque y comprueba que no pasen de la mitad de los de
     corrección, que es lo que un lector puede arreglar sin saber dónde están. */
  function chayoteSVG(cx, cy, r, opts) {
    const o = Object.assign({ cuerpo: '#5f9e4a', sombra: '#4a7f3a', surco: '#3d6b30', tallo: '#6b4a2f' }, opts || {});
    const s = r / 50;                       /* el dibujo está pensado en un radio de 50 */
    const t = (x, y) => `${(cx + x * s).toFixed(2)},${(cy + y * s).toFixed(2)}`;
    /* piriforme: angosto en el pedúnculo, ancho abajo, con la hendidura del ápice */
    return `<g>
      <path d="M ${t(0, -38)} C ${t(-11, -38)} ${t(-20, -26)} ${t(-24, -10)}
               C ${t(-29, 5)} ${t(-30, 20)} ${t(-23, 30)}
               C ${t(-17, 38)} ${t(-8, 42)} ${t(0, 42)}
               C ${t(8, 42)} ${t(17, 38)} ${t(23, 30)}
               C ${t(30, 20)} ${t(29, 5)} ${t(24, -10)}
               C ${t(20, -26)} ${t(11, -38)} ${t(0, -38)} Z"
            fill="${o.cuerpo}"/>
      <path d="M ${t(0, -38)} C ${t(11, -38)} ${t(20, -26)} ${t(24, -10)}
               C ${t(29, 5)} ${t(30, 20)} ${t(23, 30)}
               C ${t(17, 38)} ${t(8, 42)} ${t(0, 42)}
               C ${t(7, 30)} ${t(11, 14)} ${t(11, 0)}
               C ${t(11, -15)} ${t(7, -29)} ${t(0, -38)} Z"
            fill="${o.sombra}" opacity="0.5"/>
      <path d="M ${t(-11, -26)} C ${t(-17, -6)} ${t(-17, 16)} ${t(-10, 34)}" fill="none" stroke="${o.surco}" stroke-width="${(2.8 * s).toFixed(2)}" stroke-linecap="round" opacity="0.65"/>
      <path d="M ${t(11, -26)} C ${t(17, -6)} ${t(17, 16)} ${t(10, 34)}" fill="none" stroke="${o.surco}" stroke-width="${(2.8 * s).toFixed(2)}" stroke-linecap="round" opacity="0.65"/>
      <path d="M ${t(0, -30)} C ${t(-1, -6)} ${t(-1, 16)} ${t(0, 38)}" fill="none" stroke="${o.surco}" stroke-width="${(2.4 * s).toFixed(2)}" stroke-linecap="round" opacity="0.45"/>
      <path d="M ${t(-7, 39)} C ${t(-3, 33)} ${t(3, 33)} ${t(7, 39)}" fill="none" stroke="${o.surco}" stroke-width="${(3 * s).toFixed(2)}" stroke-linecap="round" opacity="0.85"/>
      <path d="M ${t(0, -38)} C ${t(-1, -44)} ${t(1, -47)} ${t(0, -50)}" fill="none" stroke="${o.tallo}" stroke-width="${(4.5 * s).toFixed(2)}" stroke-linecap="round"/>
    </g>`;
  }

  /* el cuadro central que se deja en blanco para el chayote (en módulos). Con
     la matriz de módulos de función (`funcs`), el hueco se achica hasta no
     tapar ninguno: en la versión 1 rozaría la información de formato, y de
     la 7 en adelante el patrón de alineación del centro, que ningún hueco
     centrado puede esquivar; ahí el QR sale sin chayote (hueco 0). */
  function qrHueco(n, logo, funcs) {
    let hueco = logo === false ? 0 : Math.round(n * 0.26);
    const pisa = (d, h) => { for (let y = d; y < h; y++) for (let x = d; x < h; x++) if (funcs[y][x]) return true; return false; };
    while (hueco > 0 && funcs && pisa(Math.floor((n - hueco) / 2), Math.floor((n - hueco) / 2) + hueco)) hueco--;
    if (hueco < 3) hueco = 0;
    const desde = Math.floor((n - hueco) / 2);
    return { hueco, desde, hasta: desde + hueco };
  }

  /* ================= el QR como SVG =================
     Con `logo`, deja un disco claro en el centro y dibuja el chayote encima. */
  function qrSVG(text, opts) {
    const o = Object.assign({ mm: 20, quiet: 4, logo: true, ecl: 'H', color: '#000', fondo: '#fff' }, opts || {});
    const q = QR.encode(text, { ecl: o.logo ? 'H' : o.ecl });
    if (!q) return '';
    const n = q.size, total = n + 2 * o.quiet;
    const paso = o.mm / total;
    const rects = [];
    /* el centro se deja en blanco sólo si hay dibujo */
    const { hueco, desde, hasta } = qrHueco(n, o.logo, q.funcs);
    const conLogo = hueco > 0;
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (!q.modules[y][x] || (conLogo && y >= desde && y < hasta && x >= desde && x < hasta)) { x++; continue; }
        let w = 1;
        while (x + w < n && q.modules[y][x + w] && !(conLogo && y >= desde && y < hasta && x + w >= desde && x + w < hasta)) w++;
        rects.push(`<rect x="${((o.quiet + x) * paso).toFixed(3)}" y="${((o.quiet + y) * paso).toFixed(3)}" width="${(w * paso).toFixed(3)}" height="${paso.toFixed(3)}" fill="${o.color}"/>`);
        x += w;
      }
    }
    let logo = '';
    if (conLogo) {
      /* el disco queda dentro del hueco: no tapa ningún módulo de fuera */
      const c = o.mm / 2, rr = (hueco * paso) / 2;
      logo = `<circle cx="${c.toFixed(2)}" cy="${c.toFixed(2)}" r="${rr.toFixed(2)}" fill="${o.fondo}"/>`
        + chayoteSVG(c, c, rr * 0.98);
    }
    return { svg: `<rect x="0" y="0" width="${o.mm}" height="${o.mm}" fill="${o.fondo}"/>${rects.join('')}${logo}`,
      mm: o.mm, version: q.version, ecl: q.ecl, logo: conLogo };
  }

  /* ¿de qué tamaño queda cada módulo del QR en este formato? Por debajo de
     unos 0.4 mm ni una cámara de teléfono ni una impresora láser lo resuelven
     bien, así que conviene decirlo antes de imprimir cien. El lado incluye la
     zona en blanco de 4 módulos por lado que pide la norma (ISO/IEC 18004). */
  const QR_MIN_MODULO = 0.4, QR_QUIET = 4;
  function qrModulo(fmtKey, text) {
    const f = FORMATS[fmtKey] || FORMATS.envelope;
    const q = QR.encode(String(text || 'MEX-0000'), { ecl: 'H' });
    if (!q) return null;
    const pad = Math.max(1.6, f.w * 0.035);
    const lado = Math.min(f.h - 2 * pad, f.w * 0.34);
    const mm = lado / (q.size + 2 * QR_QUIET);
    return { mm, lado, version: q.version, quiet: QR_QUIET, suficiente: mm >= QR_MIN_MODULO };
  }

  /* El módulo del Code 128 (la barra más delgada). Por debajo de 0.19 mm una
     impresora de oficina ya no lo dibuja parejo ni un lector de mano lo
     separa; de 0.25 mm para arriba lee cualquiera. Se mide con el número más
     largo de la selección, que es el que sale con las barras más delgadas. */
  const BAR_MIN_MODULO = 0.19, BAR_OK_MODULO = 0.25;
  function barModulo(fmtKey, text) {
    const f = FORMATS[fmtKey] || FORMATS.envelope;
    const bw = widths128(text);
    if (!bw) return null;
    const pad = Math.max(1.6, f.w * 0.035);
    const usable = Math.min(f.barcode, f.w - 2 * pad);
    const modules = [...bw].reduce((a, c) => a + Number(c), 0);
    const mm = usable / modules;
    return { mm, modules, suficiente: mm >= BAR_MIN_MODULO, holgado: mm >= BAR_OK_MODULO };
  }

  /* ================= formatos de etiqueta ================= */
  /* medidas en milímetros */
  const FORMATS = {
    envelope: { es: 'Sobre de semilla', en: 'Seed envelope', w: 90, h: 54, font: 3.2, barcode: 34, barH: 9 },
    jar: { es: 'Frasco de cámara', en: 'Cold-store jar', w: 63, h: 29, font: 2.5, barcode: 26, barH: 7 },
    stake: { es: 'Estaca de campo', en: 'Field stake', w: 95, h: 35, font: 4.2, barcode: 30, barH: 8 },
    vial: { es: 'Criotubo', en: 'Cryovial', w: 33, h: 13, font: 1.9, barcode: 22, barH: 4, barText: false },
    shipping: { es: 'Etiqueta de envío', en: 'Shipping label', w: 100, h: 62, font: 3.4, barcode: 42, barH: 11 },
  };
  const PAGES = {
    a4: { es: 'A4 (210 × 297 mm)', en: 'A4 (210 × 297 mm)', w: 210, h: 297 },
    letter: { es: 'Carta (216 × 279 mm)', en: 'Letter (216 × 279 mm)', w: 216, h: 279 },
  };

  /* campos que se pueden imprimir, con su valor */
  const FIELDS = [
    { k: 'ACCENUMB', es: 'Número de accesión', en: 'Accession number', big: true },
    { k: 'ACCENAME', es: 'Nombre', en: 'Name' },
    { k: 'TAXON', es: 'Especie', en: 'Species', italic: true },
    { k: 'CROPNAME', es: 'Cultivo', en: 'Crop' },
    { k: 'COLLSITE', es: 'Sitio de colecta', en: 'Collecting site' },
    { k: 'ORIGCTY', es: 'País', en: 'Country' },
    { k: 'COLLDATE', es: 'Fecha de colecta', en: 'Collecting date' },
    { k: 'ELEVATION', es: 'Altitud', en: 'Elevation' },
    { k: 'GP_CONS', es: 'Ruta de conservación', en: 'Conservation route' },
    { k: 'GP_STOCK', es: 'Existencias', en: 'Stock' },
    { k: 'GP_GERMPCT', es: 'Germinación', en: 'Germination' },
    { k: 'INSTCODE', es: 'Código del instituto', en: 'Institute code' },
  ];
  /* Fechas: en español día/mes/año (04/11/2019); en inglés ISO 8601 (2019-11-04), que no se confunde con el
     mes/día/año de EE. UU. Acepta AAAAMMDD de MCPD (con -- en lo que falte) o un objeto Date. */
  function fmtDate(v, lang) {
    if (v instanceof Date) {
      const d = String(v.getDate()).padStart(2, '0'), m = String(v.getMonth() + 1).padStart(2, '0'), y = v.getFullYear();
      return lang === 'en' ? `${y}-${m}-${d}` : `${d}/${m}/${y}`;
    }
    const s = String(v || '');
    if (/^\d{8}$/.test(s)) return lang === 'en' ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
    const t = s.replace(/-+$/, '');
    if (lang === 'en' && /^\d{6}$/.test(t)) return `${t.slice(0, 4)}-${t.slice(4, 6)}`;
    return t;
  }
  function valueOf(row, k, lang) {
    if (k === 'TAXON') return [row.GENUS, row.SPECIES, row.SUBTAXA].filter(Boolean).join(' ');
    if (k === 'GP_CONS') {
      const c = MCPD.GPCONS.find(x => x.c === MCPD.consRoute(row));
      return c ? (lang === 'en' ? c.en : c.es) : '';
    }
    if (k === 'ORIGCTY') {
      const c = MCPD.COUNTRY_MAP[row.ORIGCTY];
      return c ? (lang === 'en' ? c.en : c.es) : String(row.ORIGCTY || '');
    }
    if (k === 'COLLDATE' || k === 'ACQDATE') return fmtDate(row[k], lang);
    if (k === 'ELEVATION') return row.ELEVATION ? row.ELEVATION + ' m' : '';
    if (k === 'GP_GERMPCT') return row.GP_GERMPCT ? row.GP_GERMPCT + ' %' : '';
    return String(row[k] ?? '');
  }

  /* recorta un texto al ancho disponible (en mm) y lo dice con «…»; el ancho
     de cada letra se estima en 0.52 del cuerpo (0.6 en la monoespaciada) */
  function fitText(v, width, size, mono) {
    const s = String(v ?? '');
    const max = Math.max(1, Math.floor(width / (size * (mono ? 0.6 : 0.52))));
    return s.length <= max ? s : s.slice(0, Math.max(1, max - 1)).trimEnd() + '…';
  }

  /* la geometría de una etiqueta: dónde va el código, cuánto ancho le queda al
     texto y en qué alturas caben los renglones de los campos */
  function geometry(fmtKey, o, hayCodigo) {
    const f = FORMATS[fmtKey] || FORMATS.envelope;
    const pad = Math.max(1.6, f.w * 0.035);
    /* El código va abajo a la derecha si es de barras, y a la derecha de arriba
       abajo si es QR, que es cuadrado. En los dos casos el texto se detiene
       donde empieza el código, ni un milímetro más. */
    const esQR = o.codigo === 'qr';
    const barTop = f.h - pad - f.barH;
    /* lado del QR: lo que permita el alto de la etiqueta, sin comerse el texto */
    const qrLado = Math.min(f.h - 2 * pad, f.w * 0.34);
    const qrX = f.w - pad - qrLado;
    const anchoTexto = hayCodigo && esQR ? qrX - pad - 1 : f.w - 2 * pad;
    const limite = hayCodigo && !esQR ? barTop - 0.6 : f.h - pad;
    const yHeader = pad + f.font * 0.9;
    const yNum = (o.header ? yHeader + f.font * 0.95 : yHeader);
    const yField0 = yNum + f.font * 1.45;
    /* renglones de campo que caben antes del código o del borde */
    const slots = Math.max(0, Math.floor((limite - yField0) / (f.font * 1.18) + 1e-9) + 1);
    return { f, pad, esQR, barTop, qrLado, qrX, anchoTexto, limite, yHeader, yNum, yField0, slots: yField0 > limite ? 0 : slots };
  }

  /* qué campos elegidos no caben en este formato (con todos los campos llenos) */
  function fieldFit(fmtKey, opts) {
    const o = Object.assign({ fields: [], barcode: true, codigo: 'barras', header: '' }, opts || {});
    const g = geometry(fmtKey, o, !!o.barcode);
    return { slots: g.slots, fit: o.fields.slice(0, g.slots), dropped: o.fields.slice(g.slots) };
  }

  /* una etiqueta, en milímetros */
  function labelSVG(row, fmtKey, opts) {
    const o = Object.assign({ fields: ['ACCENAME', 'TAXON', 'COLLSITE'], barcode: true, codigo: 'barras',
      logo: true, header: '', lang: 'es', border: true }, opts || {});
    const hayCodigo = !!(o.barcode && row.ACCENUMB);
    const g = geometry(fmtKey, o, hayCodigo);
    const { f, pad, esQR, barTop, qrLado, qrX, anchoTexto, limite } = g;
    const barText = f.barText !== false;
    const parts = [];
    parts.push(`<rect x="0.2" y="0.2" width="${f.w - 0.4}" height="${f.h - 0.4}" rx="1.2" fill="#fff" stroke="${o.border ? '#999' : 'none'}" stroke-width="0.2"/>`);
    if (o.header) {
      const hs = f.font * 0.72;
      parts.push(`<text x="${pad}" y="${g.yHeader.toFixed(2)}" font-size="${hs.toFixed(2)}" fill="#555" font-family="system-ui, sans-serif">${esc(fitText(o.header, anchoTexto, hs))}</text>`);
    }
    /* el número de accesión, siempre y en grande */
    const ns = f.font * 1.25;
    parts.push(`<text x="${pad}" y="${(g.yNum + f.font * 0.2).toFixed(2)}" font-size="${ns.toFixed(2)}" font-weight="700" font-family="ui-monospace, monospace">${esc(fitText(row.ACCENUMB || '', anchoTexto, ns, true))}</text>`);
    let y = g.yField0;
    o.fields.forEach(k => {
      const v = valueOf(row, k, o.lang);
      if (!v) return;
      if (y > limite) return;
      const fd = FIELDS.find(x => x.k === k);
      parts.push(`<text x="${pad}" y="${y.toFixed(2)}" font-size="${f.font.toFixed(2)}" font-family="system-ui, sans-serif"${fd && fd.italic ? ' font-style="italic"' : ''}>${esc(fitText(v, anchoTexto, f.font))}</text>`);
      y += f.font * 1.18;
    });
    let sinCodigo = false;
    if (hayCodigo && esQR) {
      const q = qrSVG(row.ACCENUMB, { mm: qrLado, quiet: QR_QUIET, logo: o.logo !== false });
      if (q) {
        const qy = (f.h - qrLado) / 2;
        parts.push(`<g transform="translate(${qrX.toFixed(2)},${qy.toFixed(2)})">${q.svg}</g>`);
      }
    }
    if (hayCodigo && !esQR) {
      const bw = widths128(row.ACCENUMB);
      /* un número con letras fuera de ASCII (acentos, ñ…) no cabe en Code 128 */
      if (!bw) sinCodigo = true;
      if (bw) {
        const modules = [...bw].reduce((a, c) => a + Number(c), 0);
        const usable = Math.min(f.barcode, f.w - 2 * pad);
        const mod = usable / modules;
        let x = f.w - pad - usable, bar = true;
        const by = barTop;
        for (const c of bw) {
          const n = Number(c);
          if (bar) parts.push(`<rect x="${x.toFixed(3)}" y="${by.toFixed(2)}" width="${(n * mod).toFixed(3)}" height="${(f.barH - (barText ? f.font * 0.8 : 0)).toFixed(2)}" fill="#000"/>`);
          x += n * mod;
          bar = !bar;
        }
        if (barText) parts.push(`<text x="${(f.w - pad - usable / 2).toFixed(2)}" y="${(f.h - pad + 0.1).toFixed(2)}" text-anchor="middle" font-size="${(f.font * 0.62).toFixed(2)}" font-family="ui-monospace, monospace">${esc(row.ACCENUMB)}</text>`);
      }
    }
    const en = o.lang === 'en';
    const nombre = (en ? `Label for ${row.ACCENUMB || ''}` : `Etiqueta de ${row.ACCENUMB || ''}`)
      + (sinCodigo ? (en ? ': no barcode, the number has characters outside ASCII' : ': sin código de barras, el número tiene caracteres fuera de ASCII') : '');
    return `<svg class="lbl${sinCodigo ? ' lbl-nocode' : ''}" viewBox="0 0 ${f.w} ${f.h}" width="${f.w}mm" height="${f.h}mm" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(nombre)}">${parts.join('')}</svg>`;
  }

  /* cuántas etiquetas caben en una página y cómo se reparten */
  function sheet(rows, fmtKey, pageKey, opts) {
    const f = FORMATS[fmtKey] || FORMATS.envelope;
    const p = PAGES[pageKey] || PAGES.letter;
    const margin = 8, gap = 2;
    const cols = Math.max(1, Math.floor((p.w - 2 * margin + gap) / (f.w + gap)));
    const rowsPerPage = Math.max(1, Math.floor((p.h - 2 * margin + gap) / (f.h + gap)));
    const perPage = cols * rowsPerPage;
    const pages = [];
    for (let i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage));
    return { cols, rowsPerPage, perPage, pages, format: f, page: p, margin, gap };
  }

  /* ================= hojas de trabajo ================= */
  /* La germinación de cada lote es la medida; sin prueba registrada no se
     inventa: se usa el supuesto `germ` (el de la calculadora del Bloque 8) y se
     marca como supuesto. Un 0 % medido es un dato, no un hueco: ese lote no
     tiene semilla viable y no se le calculan semillas a sembrar. */
  function sowingSheet(lots, opts) {
    const o = Object.assign({ plants: 100, germ: 85, title: '', lang: 'es' }, opts || {});
    return lots.map(l => {
      const medida = MANAGE.optNum(l.row.GP_GERMPCT);
      const supuesta = medida == null;
      const g = supuesta ? o.germ : medida;
      const viable = g > 0;
      return {
        ACCENUMB: l.row.ACCENUMB,
        nombre: l.row.ACCENAME,
        taxon: [l.row.GENUS, l.row.SPECIES].filter(Boolean).join(' '),
        plantas: o.plants,
        germinacion: g,
        germinacion_supuesta: supuesta,
        semillas: viable ? MANAGE.seedsToSow(o.plants, g) : null,
        existencias: l.row.GP_STOCK,
        parcela: '', fecha_siembra: '', observaciones: '',
      };
    });
  }

  window.LABELS = {
    C128, encode128, widths128, barcodeSVG, decode128,
    FORMATS, PAGES, FIELDS, valueOf, fmtDate, labelSVG, sheet, sowingSheet, qrSVG, chayoteSVG, qrModulo, QR_MIN_MODULO,
    QR_QUIET, qrHueco, barModulo, BAR_MIN_MODULO, BAR_OK_MODULO, fitText, fieldFit,
  };
})();
