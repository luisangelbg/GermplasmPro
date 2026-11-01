/* Bloque 1: el aviso cuando la ruta no le queda a la especie (chayote en banco de semillas) */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("change")); };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async n => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  await W(1000); goStep(1); await W(500);
  /* las opciones de los selectores del simulador nacen en español: se pasan al idioma activo (en inglés no lo hace la app al abrir) */
  if (window.I18N) I18N.apply();
  set("simPreset", "seed-fao"); await W(300);
  set("simSpecies", "chayote"); await W(500);
  const c = document.querySelector("#panel-1 .pg-controls");
  await irA(c);
  return caja([c, document.getElementById("simVerdict"), document.querySelector("#panel-1 .sim-grid")], 6);
})()
