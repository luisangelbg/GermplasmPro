/* Bloque 4: México con la coropleta de accesiones por entidad y las claves con su cuenta */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async n => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  /* cambia un control del bloque como lo haría el usuario */
  const pon = async (id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event("change")); await W(400); };
  /* la colección de ejemplo del Bloque 2 */
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  goStep(4); await W(2500);
  const p = document.getElementById("panel-4"), card = p.querySelector(".card");
  await pon("b4Scope", "mx"); await pon("b4Choro", "accState"); await pon("b4Color", "none");
  const m = document.getElementById("b4Map");
  await irA(m);
  return caja([m, document.getElementById("b4Legend")], 8);
})()
