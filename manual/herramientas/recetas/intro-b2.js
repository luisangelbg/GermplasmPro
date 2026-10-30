/* Bloque 2 con la colección de ejemplo cargada: los botones para traer los datos y la tabla de accesiones */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  await W(1000); goStep(2); await W(400); document.getElementById("b2Example").click(); await W(2500);
  const c = document.querySelectorAll("#panel-2 .card")[0];
  window.scrollTo({ top: top(c) - 90, behavior: "instant" }); await W(600);
})()
