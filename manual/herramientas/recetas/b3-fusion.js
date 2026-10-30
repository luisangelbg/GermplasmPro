/* Bloque 3: después de fusionar el primer par, el aviso y el resumen con 45 accesiones */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async n => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  /* la colección de ejemplo del Bloque 2, con el umbral de fábrica y sin pares descartados */
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  B3.ui.threshold = 50; B3.ui.dismissed = []; B3.ui.open = {};
  goStep(3); await W(3000);
  window.confirm = () => true;
  document.querySelector("[data-dupopen=\"0\"]").click(); await W(600);
  document.querySelector("[data-merge]").click(); await W(700);
  const p = document.getElementById("panel-3");
  await irA(p.querySelector(".imp-row"));
  document.getElementById("b3Msg").style.display = "";
  return caja([p.querySelector(".imp-row"), document.getElementById("b3Stats")], 8);
})()
