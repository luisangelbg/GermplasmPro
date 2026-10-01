/* GermplasmPro — escritor de ZIP mínimo (método «store», nombres en UTF-8).
   El mismo que usan PopGeneticsPro y BreedingPro en esta suite: sin comprimir,
   porque lo que se guarda son textos y SVG que el sistema operativo ya trata
   bien, y así el archivo se arma sin biblioteca de terceros. */

(function () {

  let CRC_T = null;
  function crc32(bytes) {
    if (!CRC_T) {
      CRC_T = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        CRC_T[n] = c >>> 0;
      }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_T[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function dosTime(d) { return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF; }
  function dosDate(d) { return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF; }

  /* La versión síncrona acepta texto, Uint8Array y ArrayBuffer, y devuelve los
     bytes del archivo: así la suite de pruebas puede volver a leerlo sin
     esperar a nadie. La asíncrona admite además Blob. */
  function bytes(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    const now = new Date();
    for (const f of files) {
      let data = f.data;
      if (typeof data === "string") data = enc.encode(data);
      else if (data instanceof ArrayBuffer) data = new Uint8Array(data);
      const name = enc.encode(f.name);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime(now), true); lh.setUint16(12, dosDate(now), true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);

      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime(now), true); ch.setUint16(14, dosDate(now), true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const centralSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
    const todo = [...parts, ...central, new Uint8Array(end.buffer)];
    const total = todo.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    todo.forEach(b => { out.set(b, p); p += b.length; });
    return out;
  }

  /* la misma, pero admitiendo Blob y devolviendo un Blob listo para descargar */
  async function build(files) {
    const listo = [];
    for (const f of files) {
      let data = f.data;
      if (typeof Blob !== "undefined" && data instanceof Blob) data = new Uint8Array(await data.arrayBuffer());
      listo.push({ name: f.name, data });
    }
    return new Blob([bytes(listo)], { type: "application/zip" });
  }

  window.ZIP = { crc32, bytes, build, dosTime, dosDate };
})();
