/* Bloque 8: la sección 4, el banco por rutas, y la nota del pie */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async n => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  /* la sección (h3) del Bloque 8 cuyo título empieza con el número dado y lo que la sigue hasta la siguiente */
  const seccion = num => { const h = [...document.querySelectorAll("#b8Body h3.section-title")].find(x => x.textContent.trim().startsWith(num)); const out = [h]; let n = h.nextElementSibling; while (n && n.tagName !== "H3") { out.push(n); n = n.nextElementSibling; } return out; };
  /* la colección de ejemplo del Bloque 2 y el Bloque 8 con los supuestos de fábrica (sin constantes añadidas) */
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  Prefs.set("bankConfig", null); Prefs.set("viability", null); Prefs.set("calcP", 5); Prefs.set("calcPP", 95); Prefs.set("calcG", 85);
  goStep(8); await W(1500);
  { const c = B8.cfg(), d = MANAGE.config(null); Object.keys(d).forEach(k => Object.assign(c[k], d[k])); const v = B8.viab(); Object.keys(v).forEach(k => { if (k !== "Zea mays") delete v[k]; }); }
  Object.assign(B8.view, { filter: "all", route: "", sort: "score" });
  B8.run(); await W(800);
  const s = seccion("4");
  const nota = document.querySelector("#panel-8 .note-warn");
  await irA(s[0]);
  return caja(s.concat([nota]), 8);
})()
