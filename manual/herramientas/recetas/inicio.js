/* portada de la app (Bloque 1), arriba, sin colección cargada */
(async () => { const W = ms => new Promise(r => setTimeout(r, ms));
  try { localStorage.removeItem('germplasmpro:acc'); } catch (e) {}
  await W(1200); goStep(1); await W(600); window.scrollTo(0, 0); await W(400); })()
