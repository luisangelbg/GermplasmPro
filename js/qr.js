/* GermplasmPro — códigos QR, escritos aquí y no traídos de fuera.

   Un QR no es un dibujo: es un mensaje con corrección de errores. Esto
   implementa el modelo 2 de la norma en modo byte —que es el que admite
   cualquier texto— con sus cuatro niveles de corrección, versiones 1 a 10, los
   ocho patrones de máscara con su puntaje, y la información de formato y de
   versión con sus códigos BCH.

   POR QUÉ NIVEL H. Los niveles corrigen 7 %, 15 %, 25 % y 30 % del símbolo. Si
   en el centro va un dibujo, esos módulos se pierden: con el nivel H el código
   sigue leyéndose porque sobra corrección. Por eso las etiquetas con chayote
   usan H, y la app no deja poner el dibujo en niveles más bajos.

   La aritmética vive en el campo de Galois GF(256) con el polinomio 0x11D, que
   es el que fija la norma. El cálculo del residuo de Reed-Solomon sigue la
   formulación de Project Nayuki, que es de dominio público (CC0).

   La suite de pruebas vuelve a leer lo que aquí se dibuja: deshace la máscara,
   recompone los bloques y saca el texto; y comprueba, además, que el polinomio
   completo sea divisible entre el generador, que es la propiedad que hace que
   un lector pueda corregir errores. */

(function () {

  /* ================= GF(256) ================= */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ ((x & 0x80) ? 0x11D : 0); }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  /* divisor de Reed-Solomon de grado n: Π (x − α^i), i = 0…n−1 */
  function rsDivisor(n) {
    const r = new Array(n).fill(0);
    r[n - 1] = 1;
    let root = 1;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        r[j] = gmul(r[j], root);
        if (j + 1 < n) r[j] ^= r[j + 1];
      }
      root = gmul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, divisor) {
    const res = new Array(divisor.length).fill(0);
    for (const b of data) {
      const factor = b ^ res.shift();
      res.push(0);
      for (let i = 0; i < divisor.length; i++) res[i] ^= gmul(divisor[i], factor);
    }
    return res;
  }

  /* ================= tablas de la norma ================= */
  /* por versión: [códigos totales] y, por nivel, [CE por bloque, bloques g1, datos g1, bloques g2, datos g2] */
  const TOTAL = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
  const ECL = { L: 0, M: 1, Q: 2, H: 3 };
  const ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };     /* lo que va en la información de formato */
  const BLOCKS = {
    1: { L: [7, 1, 19, 0, 0], M: [10, 1, 16, 0, 0], Q: [13, 1, 13, 0, 0], H: [17, 1, 9, 0, 0] },
    2: { L: [10, 1, 34, 0, 0], M: [16, 1, 28, 0, 0], Q: [22, 1, 22, 0, 0], H: [28, 1, 16, 0, 0] },
    3: { L: [15, 1, 55, 0, 0], M: [26, 1, 44, 0, 0], Q: [18, 2, 17, 0, 0], H: [22, 2, 13, 0, 0] },
    4: { L: [20, 1, 80, 0, 0], M: [18, 2, 32, 0, 0], Q: [26, 2, 24, 0, 0], H: [16, 4, 9, 0, 0] },
    5: { L: [26, 1, 108, 0, 0], M: [24, 2, 43, 0, 0], Q: [18, 2, 15, 2, 16], H: [22, 2, 11, 2, 12] },
    6: { L: [18, 2, 68, 0, 0], M: [16, 4, 27, 0, 0], Q: [24, 4, 19, 0, 0], H: [28, 4, 15, 0, 0] },
    7: { L: [20, 2, 78, 0, 0], M: [18, 4, 31, 0, 0], Q: [18, 2, 14, 4, 15], H: [26, 4, 13, 1, 14] },
    8: { L: [24, 2, 97, 0, 0], M: [22, 2, 38, 2, 39], Q: [22, 4, 18, 2, 19], H: [26, 4, 14, 2, 15] },
    9: { L: [30, 2, 116, 0, 0], M: [22, 3, 36, 2, 37], Q: [20, 4, 16, 4, 17], H: [24, 4, 12, 4, 13] },
    10: { L: [18, 2, 68, 2, 69], M: [26, 4, 43, 1, 44], Q: [24, 6, 19, 2, 20], H: [28, 6, 15, 2, 16] },
  };
  /* centros de los patrones de alineación */
  const ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };
  const MAXV = 10;

  const dataCodewords = (v, ecl) => {
    const b = BLOCKS[v][ecl];
    return b[1] * b[2] + b[3] * b[4];
  };

  /* ================= el mensaje ================= */
  function toBytes(text) {
    return Array.from(new TextEncoder().encode(String(text)));
  }

  function bitStream(bytes, version, ecl) {
    const bits = [];
    const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(0b0100, 4);                                   /* modo byte */
    push(bytes.length, version <= 9 ? 8 : 16);         /* cuenta de caracteres */
    bytes.forEach(b => push(b, 8));
    const cap = dataCodewords(version, ecl) * 8;
    if (bits.length > cap) return null;
    for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);   /* terminador */
    while (bits.length % 8 !== 0) bits.push(0);
    const pad = [0xEC, 0x11];
    for (let i = 0; bits.length < cap; i++) push(pad[i % 2], 8);
    const out = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      out.push(b);
    }
    return out;
  }

  /* reparte en bloques, calcula la corrección y los entrelaza */
  function codewords(data, version, ecl) {
    const [ecLen, n1, d1, n2, d2] = BLOCKS[version][ecl];
    const divisor = rsDivisor(ecLen);
    const bloques = [];
    let p = 0;
    for (let i = 0; i < n1 + n2; i++) {
      const len = i < n1 ? d1 : d2;
      const dat = data.slice(p, p + len);
      p += len;
      bloques.push({ dat, ec: rsRemainder(dat, divisor) });
    }
    const out = [];
    const maxDat = Math.max(d1, d2);
    for (let i = 0; i < maxDat; i++) bloques.forEach(b => { if (i < b.dat.length) out.push(b.dat[i]); });
    for (let i = 0; i < ecLen; i++) bloques.forEach(b => out.push(b.ec[i]));
    return out;
  }

  /* ================= la matriz ================= */
  function nuevaMatriz(size) {
    return { size, m: Array.from({ length: size }, () => new Array(size).fill(0)),
      f: Array.from({ length: size }, () => new Array(size).fill(false)) };
  }
  const set = (M, x, y, v, func) => {
    if (x < 0 || y < 0 || x >= M.size || y >= M.size) return;
    M.m[y][x] = v ? 1 : 0;
    if (func) M.f[y][x] = true;
  };

  function patronesFijos(M, version) {
    const n = M.size;
    /* buscadores y sus separadores */
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(M, x, y, d !== 2 && d <= 3, true);
      }
    };
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    /* temporizadores */
    for (let i = 8; i < n - 8; i++) { set(M, i, 6, i % 2 === 0, true); set(M, 6, i, i % 2 === 0, true); }
    /* alineación */
    const centros = ALIGN[version];
    centros.forEach(cy => centros.forEach(cx => {
      const esquina = (cx === 6 && cy === 6) || (cx === 6 && cy === n - 7) || (cx === n - 7 && cy === 6);
      if (esquina) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        set(M, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, true);
      }
    }));
    /* módulo oscuro y zonas reservadas del formato */
    set(M, 8, n - 8, 1, true);
    for (let i = 0; i < 9; i++) { if (!M.f[i][8]) set(M, 8, i, 0, true); if (!M.f[8][i]) set(M, i, 8, 0, true); }
    for (let i = 0; i < 8; i++) { set(M, n - 1 - i, 8, 0, true); set(M, 8, n - 1 - i, 0, true); }
    /* información de versión (7 en adelante) */
    if (version >= 7) {
      const bits = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const b = (bits >>> i) & 1;
        const a = Math.floor(i / 3), c = i % 3;
        set(M, a, n - 11 + c, b, true);
        set(M, n - 11 + c, a, b, true);
      }
    }
  }

  function versionBits(version) {
    let r = version;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    return ((version << 12) | r) >>> 0;
  }
  function formatBits(ecl, mask) {
    const datos = (ECL_BITS[ecl] << 3) | mask;
    let r = datos;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    return (((datos << 10) | r) ^ 0x5412) >>> 0;
  }
  function ponFormato(M, ecl, mask) {
    const n = M.size, bits = formatBits(ecl, mask);
    for (let i = 0; i <= 5; i++) set(M, 8, i, (bits >>> i) & 1, true);
    set(M, 8, 7, (bits >>> 6) & 1, true);
    set(M, 8, 8, (bits >>> 7) & 1, true);
    set(M, 7, 8, (bits >>> 8) & 1, true);
    for (let i = 9; i < 15; i++) set(M, 14 - i, 8, (bits >>> i) & 1, true);
    for (let i = 0; i < 8; i++) set(M, n - 1 - i, 8, (bits >>> i) & 1, true);
    for (let i = 8; i < 15; i++) set(M, 8, n - 15 + i, (bits >>> i) & 1, true);
    set(M, 8, n - 8, 1, true);
  }

  /* zigzag de dos columnas desde la esquina inferior derecha */
  function recorrido(M) {
    const n = M.size, celdas = [];
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;                 /* la columna del temporizador no cuenta */
      for (let v = 0; v < n; v++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const arriba = ((right + 1) & 2) === 0;
          const y = arriba ? n - 1 - v : v;
          if (!M.f[y][x]) celdas.push([x, y]);
        }
      }
    }
    return celdas;
  }

  const MASK = [
    (i, j) => (i + j) % 2 === 0,
    (i) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
    (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
    (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0,
    (i, j) => ((i + j) % 2 + (i * j) % 3) % 2 === 0,
  ];

  function aplicaMascara(M, mask) {
    for (let y = 0; y < M.size; y++) for (let x = 0; x < M.size; x++) {
      if (!M.f[y][x] && MASK[mask](y, x)) M.m[y][x] ^= 1;
    }
  }

  /* las cuatro reglas de penalización de la norma */
  /* acepta tanto la matriz de trabajo como el resultado de encode() */
  function penaliza(M) {
    const n = M.size, m = M.m || M.modules;
    let p = 0;
    const linea = arr => {
      let run = 1, res = 0;
      for (let i = 1; i < n; i++) {
        if (arr[i] === arr[i - 1]) { run++; if (run === 5) res += 3; else if (run > 5) res += 1; }
        else run = 1;
      }
      /* patrón 1:1:3:1:1 con cuatro módulos claros a un lado */
      const s = arr.join('');
      const pat = /1011101/g;
      let mm;
      while ((mm = pat.exec(s)) !== null) {
        const i = mm.index;
        const antes = s.slice(Math.max(0, i - 4), i);
        const despues = s.slice(i + 7, i + 11);
        if (antes === '0000' || despues === '0000') res += 40;
        pat.lastIndex = i + 1;
      }
      return res;
    };
    for (let y = 0; y < n; y++) p += linea(m[y]);
    for (let x = 0; x < n; x++) p += linea(m.map(r => r[x]));
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const a = m[y][x];
      if (a === m[y][x + 1] && a === m[y + 1][x] && a === m[y + 1][x + 1]) p += 3;
    }
    let oscuros = 0;
    m.forEach(r => r.forEach(v => { if (v) oscuros++; }));
    const pct = 100 * oscuros / (n * n);
    p += 10 * Math.floor(Math.abs(pct - 50) / 5);
    return p;
  }

  /* ================= la función principal ================= */
  function encode(text, opts) {
    const o = Object.assign({ ecl: 'H', minVersion: 1, mask: null }, opts || {});
    if (!ECL.hasOwnProperty(o.ecl)) return null;
    const bytes = toBytes(text);
    if (!bytes.length) return null;

    let version = 0, datos = null;
    for (let v = Math.max(1, o.minVersion); v <= MAXV; v++) {
      const d = bitStream(bytes, v, o.ecl);
      if (d) { version = v; datos = d; break; }
    }
    if (!version) return null;                    /* no cabe: quien llame decide qué hacer */

    const todos = codewords(datos, version, o.ecl);
    const M = nuevaMatriz(17 + 4 * version);
    patronesFijos(M, version);
    const celdas = recorrido(M);
    /* los códigos entran bit a bit, del más significativo al menos */
    celdas.forEach(([x, y], i) => {
      const byte = todos[i >> 3];
      const bit = byte === undefined ? 0 : (byte >>> (7 - (i & 7))) & 1;
      M.m[y][x] = bit;
    });

    let mask = o.mask;
    if (mask == null) {
      let mejor = Infinity;
      for (let k = 0; k < 8; k++) {
        aplicaMascara(M, k); ponFormato(M, o.ecl, k);
        const p = penaliza(M);
        if (p < mejor) { mejor = p; mask = k; }
        aplicaMascara(M, k);                       /* se deshace: XOR es su propio inverso */
      }
    }
    aplicaMascara(M, mask);
    ponFormato(M, o.ecl, mask);
    return { size: M.size, modules: M.m, funcs: M.f, version, ecl: o.ecl, mask, codewords: todos, data: datos };
  }

  /* ================= lector propio (lo usa la suite) ================= */
  function decode(qr) {
    const n = qr.size;
    const m = qr.modules.map(r => r.slice());
    /* información de formato: se lee de la esquina superior izquierda */
    let bits = 0;
    for (let i = 0; i <= 5; i++) bits |= m[i][8] << i;
    bits |= m[7][8] << 6; bits |= m[8][8] << 7; bits |= m[8][7] << 8;
    for (let i = 9; i < 15; i++) bits |= m[8][14 - i] << i;
    const crudo = bits ^ 0x5412;
    const eclBits = (crudo >>> 13) & 3, mask = (crudo >>> 10) & 7;
    const ecl = Object.keys(ECL_BITS).find(k => ECL_BITS[k] === eclBits);
    if (!ecl) return null;
    const version = (n - 17) / 4;
    if (!Number.isInteger(version) || version < 1 || version > MAXV) return null;

    /* se deshace la máscara y se recorre igual que al escribir */
    const F = nuevaMatriz(n);
    patronesFijos(F, version);
    ponFormato(F, ecl, mask);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!F.f[y][x] && MASK[mask](y, x)) m[y][x] ^= 1;
    }
    const celdas = recorrido(F);
    const bytesLeidos = [];
    for (let i = 0; i < celdas.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        const c = celdas[i + j];
        b = (b << 1) | (c ? m[c[1]][c[0]] : 0);
      }
      bytesLeidos.push(b);
    }
    /* deshacer el entrelazado */
    const [ecLen, n1, d1, n2, d2] = BLOCKS[version][ecl];
    const nb = n1 + n2, maxDat = Math.max(d1, d2);
    const blo = Array.from({ length: nb }, () => []);
    let p = 0;
    for (let i = 0; i < maxDat; i++) for (let b = 0; b < nb; b++) {
      const len = b < n1 ? d1 : d2;
      if (i < len) blo[b].push(bytesLeidos[p++]);
    }
    const datos = [].concat(...blo);
    /* el texto: modo, cuenta y bytes */
    let bitPos = 0;
    const leer = k => { let v = 0; for (let i = 0; i < k; i++) { const by = datos[bitPos >> 3]; v = (v << 1) | ((by >>> (7 - (bitPos & 7))) & 1); bitPos++; } return v; };
    const modo = leer(4);
    if (modo !== 0b0100) return null;
    const cuenta = leer(version <= 9 ? 8 : 16);
    const out = [];
    for (let i = 0; i < cuenta; i++) out.push(leer(8));
    try { return new TextDecoder().decode(new Uint8Array(out)); } catch (e) { return null; }
  }

  /* ¿el polinomio completo de cada bloque es divisible entre su generador?
     Si lo es, un lector puede corregir errores; si no, el código está mal. */
  function residuoCero(qr) {
    const [ecLen, n1, d1, n2, d2] = BLOCKS[qr.version][qr.ecl];
    const divisor = rsDivisor(ecLen);
    const nb = n1 + n2, maxDat = Math.max(d1, d2);
    const blo = Array.from({ length: nb }, () => ({ dat: [], ec: [] }));
    let p = 0;
    for (let i = 0; i < maxDat; i++) for (let b = 0; b < nb; b++) {
      if (i < (b < n1 ? d1 : d2)) blo[b].dat.push(qr.codewords[p++]);
    }
    for (let i = 0; i < ecLen; i++) for (let b = 0; b < nb; b++) blo[b].ec.push(qr.codewords[p++]);
    return blo.every(b => rsRemainder(b.dat.concat(b.ec), divisor).every(v => v === 0));
  }

  window.QR = {
    encode, decode, residuoCero, penaliza, formatBits, versionBits,
    rsDivisor, rsRemainder, gmul, EXP, LOG, BLOCKS, TOTAL, ALIGN, MAXV, dataCodewords,
  };
})();
