/* Bloque 7: la sección 2, coordenadas principales y agrupamiento con los valores de fábrica */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async n => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  /* la sección (h3) del Bloque 7 cuyo título empieza con el número dado, y los nodos que la siguen hasta la próxima */
  const seccion = num => { const h = [...document.querySelectorAll("#b7Body h3.section-title")].find(x => x.textContent.trim().startsWith(num)); const out = [h]; let n = h.nextElementSibling; while (n && n.tagName !== "H3") { out.push(n); n = n.nextElementSibling; } return out; };
  /* la colección de ejemplo del Bloque 2, la caracterización de ejemplo y el Bloque 7 con sus valores de fábrica */
  const fabrica = { k: 4, tree: "ward", pct: 10, strata: "group", alloc: "L", pick: "distance", method: "strata", seed: 20260923, colorBy: "group" };
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  goStep(7); await W(1500); document.getElementById("b7Example").click(); await W(3500);
  const pon = async o => { Object.assign(B7.view, fabrica, o || {}); B7.run(); await W(800); };
  await pon();
  const s = seccion("2");
  /* el árbol ya se ve completo en la app; si alguna versión lo mete en una caja con desplazamiento, se despliega */
  const arbol = s.find(n => n.classList && n.classList.contains("card")).querySelectorAll(".pg-pane")[1].querySelector("div[style]"); if (arbol) arbol.style.maxHeight = "none"; await W(300);
  await irA(s[0]);
  return caja(s, 8);
})()
