/* Bloque 10: la sección de la colección */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  /* la barra fija de arriba tapa lo que queda debajo; los botones flotantes de abajo se esconden */
  const fijos = () => [...document.querySelectorAll("body *")].filter(e => { const p = getComputedStyle(e).position; return p === "fixed" || p === "sticky"; });
  const cabeza = () => Math.max(0, ...fijos().map(e => e.getBoundingClientRect()).filter(r => r.top < 120 && r.height < 200 && r.height > 0).map(r => r.bottom));
  const ocultaFlotantes = () => fijos().forEach(e => { const r = e.getBoundingClientRect(); if (r.top > innerHeight / 3 && r.width < 400) e.style.visibility = "hidden"; });
  /* lo que está dentro del marco del informe se mide sumándole la posición del marco */
  const marco = () => document.getElementById("b10Frame");
  const dentro = n => ({ getBoundingClientRect() { const a = marco().getBoundingClientRect(), b = n.getBoundingClientRect(); return { left: a.left + b.left, top: a.top + b.top, right: a.left + b.right, bottom: a.top + b.bottom }; } });
  const irA = async n => { const y = dentro(n).getBoundingClientRect().top + window.scrollY; window.scrollTo({ top: y - 400, behavior: "instant" }); await W(300); window.scrollTo({ top: y - cabeza() - 18, behavior: "instant" }); await W(500); ocultaFlotantes(); };
  /* una sección del informe: su h2 y lo que la sigue hasta el siguiente h2 */
  const seccion = id => { const d = marco().contentDocument; const h = d.getElementById("s-" + id); const out = [h]; let n = h.nextElementSibling; while (n && n.tagName !== "H2" && !n.classList.contains("rfoot")) { out.push(n); n = n.nextElementSibling; } return out; };
  /* la colección de ejemplo, la caracterización de ejemplo con el núcleo de fábrica y el Bloque 10 con el título del ejemplo */
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  goStep(7); await W(1500);
  Object.assign(B7.view, { k: 4, tree: "ward", pct: 10, strata: "group", alloc: "L", pick: "distance", method: "strata", atLeastOne: false, colorBy: "group" });
  document.getElementById("b7Example").click(); await W(4000);
  Prefs.set("repTitle", "Informe anual 2026"); Prefs.set("repBank", "Banco de Germoplasma de Ejemplo"); Prefs.set("repAuthor", "");
  Object.assign(B10.view, { title: "Informe anual 2026", bank: "Banco de Germoplasma de Ejemplo", author: "", pick: null, figures: true, annex: true, lang: null });
  goStep(10); await W(6000);
  const s = seccion("passport");
  await irA(s[0]);
  return caja(s.map(dentro), 14);
})()
