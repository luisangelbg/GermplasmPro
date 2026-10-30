/* Bloque 5: el título, los seis selectores y los seis recuadros del resumen */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  const irA = async n => { window.scrollTo({ top: top(n) - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: top(n) - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  /* elige una opción de un selector del panel y espera a que el cálculo termine */
  const elige = async (id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); await W(2500); };
  /* la sección (h3) del Bloque 5 cuyo título empieza con el número dado, y los nodos que la siguen hasta la próxima */
  const seccion = num => { const h = [...document.querySelectorAll("#b5Body h3.section-title")].find(x => x.textContent.trim().startsWith(num)); const out = [h]; let n = h.nextElementSibling; while (n && !(n.tagName === "H3") && !(n.classList.contains("imp-row") && n.querySelector("#b5CSV"))) { out.push(n); n = n.nextElementSibling; } return out; };
  /* la colección de ejemplo del Bloque 2 y el Bloque 5 con sus valores de fábrica */
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  Object.assign(B5.view, { unit: "state", cls: "species", grid: 1, band: 500, dist: "jaccard", effort: "q1", index: "S", sort: { k: "N", dir: -1 } });
  goStep(5); await W(3500);
  const p = document.getElementById("panel-5");
  await irA(p.querySelector(".blk-title"));
  return caja([p.querySelector(".blk-title"), p.querySelector(".card"), document.getElementById("b5Stats")], 8);
})()
