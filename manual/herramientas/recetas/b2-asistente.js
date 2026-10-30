/* Bloque 2: el asistente de pegado con el pegado de prueba (tarjetas, aviso de coma decimal, opciones y vista previa) */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async (n, d) => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - (d || 18), behavior: "instant" }); await W(500); ocultaFlotantes(); };
  const carga = async () => { goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500); };
  /* el pegado de prueba del manual: tres chayotes, con coma decimal, un país de dos letras, un 31 de febrero y una columna de caracterización */
  const PRUEBA = "No. accesión\tGénero\tEspecie\tCultivo\tPaís\tLocalidad\tLatitud\tLongitud\tAltitud (msnm)\tFecha de colecta\tPESO_FRUTO\nCH-001\tSechium\tedule\tChayote\tMEX\tVeracruz, Huatusco\t19,149\t-96,966\t1340\t20230915\t318.5\nCH-002\tSechium\tedule\tChayote\tMX\tVeracruz, Coatepec\t19,453\t-96,961\t1200\t20230916\t290\nCH-003\tSechium\tedule\tChayote\tMEX\tPuebla, Cuetzalan\t20,019\t-97,519\t980\t20230231\t402.7";
  const pega = async () => { document.getElementById("b2Paste").click(); await W(500); const a = document.getElementById("pasteArea"); a.value = PRUEBA; a.dispatchEvent(new Event("input")); await W(500); };
  await W(1000); goStep(2); await W(400); await pega();
  return caja([document.getElementById("pasteDlg")], 1);
})()
