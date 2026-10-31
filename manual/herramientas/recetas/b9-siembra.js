/* Bloque 9: la lista de siembra de los lotes en apuros del Bloque 8 */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async n => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  /* la colección de ejemplo y el Bloque 9 con sus valores de fábrica; luego, lo propio de esta captura */
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  Prefs.set("labelHeader", ""); Prefs.set("labelFields", null);
  goStep(9); await W(2000);
  Object.assign(B9.view, { fmt: "envelope", page: "letter", fields: ["ACCENAME", "TAXON", "COLLSITE"], barcode: true, codigo: "barras", logo: true, header: "", which: "all", sheet: "labels", plants: 100, plantsEdited: false });
  B9.view.selection.clear(); B9.view.q = "";
  Object.assign(B9.view, { which: "work", sheet: "sowing" });
  B9.run(); await W(1000);
  const sh = document.querySelector("#b9Preview .print-sheet");
  await irA(sh);
  return caja([sh.querySelector(".ws-head"), sh.querySelector(".imp-row")], 14);
})()
