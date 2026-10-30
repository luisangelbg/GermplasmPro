/* Bloque 2: el retrato de la colección de ejemplo (cifras y gráficas de resumen) */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  const s = document.getElementById("b2Summary");
  const h = [...document.querySelectorAll("#panel-2 h2, #panel-2 .section-title")].find(x => /retrato/.test(x.textContent));
  window.scrollTo({ top: top(s) - 160, behavior: "instant" }); await W(800);
  const kids = [...s.children].filter(k => k.getBoundingClientRect().bottom < innerHeight - 4);
  return caja(kids, 10);
})()
