/* GermplasmPro — estado global, navegación y utilidades compartidas.
   Sin módulos ES: todo cuelga de window para que la app también funcione
   cuando index.html se abre con doble clic (file://). */

/* ---------------- estado del banco ----------------
   Todo lo que el usuario carga vive aquí; los bloques 2 a 10 leen y escriben
   sobre este mismo objeto, nunca sobre el DOM. */
const state = {
  acc: [],          /* accesiones: una fila por accesión, campos MCPD */
  cols: [],         /* columnas originales del archivo importado */
  map: {},          /* columna original -> descriptor MCPD */
  qc: null,         /* resultado del control de calidad (Bloque 3) */
  dups: null,       /* grupos de posibles duplicados (Bloque 3) */
  crop: '',         /* cultivo o género de trabajo */
};
window.state = state;

/* los diez bloques de la app, en orden de navegación */
const STEPS = [
  { n: 1,  es: 'Inicio',            en: 'Home',              ready: true },
  { n: 2,  es: 'Pasaporte',         en: 'Passport',          ready: true },
  { n: 3,  es: 'Calidad y duplicados', en: 'Quality & duplicates', ready: true },
  { n: 4,  es: 'Mapa de colecta',   en: 'Collecting map',    ready: true },
  { n: 5,  es: 'Diversidad geográfica', en: 'Geographic diversity', ready: true },
  { n: 6,  es: 'Vacíos de colecta', en: 'Collecting gaps',   ready: true },
  { n: 7,  es: 'Caracterización y núcleo', en: 'Characterization & core', ready: true },
  { n: 8,  es: 'Manejo del banco',  en: 'Genebank management', ready: true },
  { n: 9,  es: 'Etiquetas y registro', en: 'Labels & register', ready: true },
  { n: 10, es: 'Informe',           en: 'Report',            ready: true },
];

/* ---------------- DOM ---------------- */
function el(id) { return document.getElementById(id); }
function els(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function mk(tag, attrs, html) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'style') n.setAttribute('style', attrs[k]);
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/* HTML bilingüe en línea: se escriben los dos idiomas, el CSS muestra el activo */
function L2(es, en) { return `<span data-l="es">${es}</span><span data-l="en">${en}</span>`; }

function download(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function slug(s) {
  return String(s || 'germplasmpro').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 70) || 'germplasmpro';
}

/* preferencias que sobreviven al cierre del navegador */
const Prefs = {
  get(k, d) { try { const v = localStorage.getItem('germplasmpro:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('germplasmpro:' + k, JSON.stringify(v)); } catch (e) { /* ignorar */ } },
};

/* ---------------- números ---------------- */
function fmt(x, d) {
  if (x == null || !isFinite(x)) return '—';
  const n = Number(x);
  return n.toLocaleString(I18N.lang === 'en' ? 'en-US' : 'es-MX', { minimumFractionDigits: d ?? 2, maximumFractionDigits: d ?? 2 });
}
function fmtInt(x) { return fmt(x, 0); }
function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
function sum(a) { let s = 0; for (const v of a) s += v; return s; }
function mean(a) { return a.length ? sum(a) / a.length : NaN; }

/* generador de azar reproducible: la misma semilla da la misma simulación */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* una normal estándar (Box-Muller), para aproximar binomiales grandes */
function rnorm(rnd) {
  const u = Math.max(1e-12, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/* binomial: exacta cuando n es pequeño y aproximada por la normal cuando es
   grande, porque la simulación in situ sortea miles de gametos cada año */
function rbinom(n, p, rnd) {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  if (n * p > 25 && n * (1 - p) > 25) {
    const k = Math.round(n * p + Math.sqrt(n * p * (1 - p)) * rnorm(rnd));
    return clamp(k, 0, n);
  }
  let k = 0;
  for (let i = 0; i < n; i++) if (rnd() < p) k++;
  return k;
}

/* función de distribución normal y su inversa (probits de la ecuación de
   viabilidad de Ellis y Roberts) */
function erf(x) {
  /* Abramowitz y Stegun 7.1.26, |error| < 1.5e-7 */
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
function normCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
function normInv(p) {
  /* algoritmo de Acklam para la normal inversa, refinado con una iteración de Halley */
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q, r, x;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= ph) {
    q = p - 0.5; r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
}

/* distancia entre dos puntos de colecta, en kilómetros (fórmula del haversine) */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.0088, toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* ---------------- navegación entre bloques ----------------
   La barra de direcciones guarda el bloque (#b4), así una curadora puede
   compartir un enlace que abre la app directamente en un bloque. */
function goStep(n, opts) {
  n = String(n);
  if (!el('panel-' + n)) n = '1';
  els('.step-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + n));
  els('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === n));
  document.body.classList.toggle('on-home', n === '1');
  if (!(opts && opts.keepScroll)) window.scrollTo({ top: 0, behavior: 'smooth' });
  const btn = document.querySelector('.step-btn[data-step="' + n + '"]');
  if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (!(opts && opts.fromHash)) { try { history.replaceState(null, '', '#b' + n); } catch (e) { /* file:// en algunos navegadores */ } }
  if (window.LABG) {
    LABG.setCurrentStep(n);
    LABG.announce(T('Bloque ', 'Block ') + stepLabel(n));
  }
  /* los oyentes de 'stepchange' comparan con === contra un número */
  document.dispatchEvent(new CustomEvent('stepchange', { detail: { step: Number(n) } }));
  /* después del evento: el bloque ya corrió su análisis al abrirse */
  noteVisit(Number(n));
  refreshStepFooters();
  if (window.LABG) { const m = el('b10Msg'); if (m) LABG.messageRole(m, 'info'); }
}
function buildStepper() {
  const nav = el('stepper');
  if (!nav) return;
  nav.innerHTML = STEPS.map(s =>
    `<button type="button" class="step-btn${s.ready ? '' : ' soon'}" data-step="${s.n}"${s.ready ? '' : ` disabled data-soon="${esc(T('pronto', 'soon'))}"`}><span class="step-num">${s.n}</span>${L2(s.es, s.en)}</button>`
  ).join('');
  els('.step-btn', nav).forEach(b => b.addEventListener('click', () => goStep(b.dataset.step)));
}

/* ---------------- estado de cada bloque en la barra común ----------------
   Aquí ningún bloque se bloquea: los diez están abiertos desde el principio,
   así que la regla general de la suite («terminado» = hay un bloque posterior
   habilitado) marcaría todo desde el arranque. Además, el Bloque 10 corre de
   golpe los análisis de los Bloques 5 a 8 para armar el informe. Por eso la
   palomita se gana así, y sólo así:
     · Bloque 2: hay accesiones cargadas.
     · Bloques 3 a 10: con accesiones cargadas, la persona abrió ese bloque
       (el análisis se corrió a la vista) y, en 5, 6, 7 y 8, el análisis
       existe (el 7 además necesita caracterización cargada).
   Lo que el informe calcula por su cuenta no marca nada. Cargar otra
   colección en el Bloque 2 borra las visitas y las palomitas. */
const visited = new Set();
let visitedAcc = null;
function syncVisits() {
  if (visitedAcc !== state.acc) { visited.clear(); visitedAcc = state.acc; }
}
function noteVisit(n) {
  syncVisits();
  if (n >= 3 && (state.acc || []).length) visited.add(n);
  refreshStepMarks();
}
function stepDone(n) {
  const hay = (state.acc || []).length > 0;
  if (n === 2) return hay;
  if (n < 3 || !hay || !visited.has(n)) return false;
  const res = { 5: 'B5', 6: 'B6', 7: 'B7', 8: 'B8' }[n];
  if (!res) return true;
  try { return !!(window[res] && window[res].analysis()); } catch (e) { return false; }
}
function refreshStepMarks() {
  if (!window.LABG) return;
  syncVisits();
  STEPS.forEach(s => { if (s.n > 1) LABG.markStep(s.n, stepDone(s.n) ? 'done' : null); });
}

/* nombre de un bloque para el pie y los anuncios: «4 · Mapa de colecta» */
function stepLabel(n) {
  const s = STEPS.find(x => x.n === Number(n));
  return s ? s.n + ' · ' + T(s.es, s.en) : String(n);
}
/* pie Anterior / Siguiente al final de cada bloque */
function refreshStepFooters() {
  const bar = el('stepper');
  if (bar) bar.setAttribute('aria-label', T('Bloques', 'Blocks'));
  const order = STEPS.map(s => s.n);
  const usable = n => { const s = STEPS.find(x => x.n === n); return !!(s && s.ready); };
  els('.step-panel').forEach(p => {
    const n = Number(p.id.replace('panel-', ''));
    const i = order.indexOf(n);
    if (i < 0) return;
    let f = p.querySelector(':scope > .step-footer');
    if (!f) {
      f = mk('nav', { class: 'step-footer no-print' });
      f.innerHTML = '<button type="button" class="btn btn-secondary prev"></button><button type="button" class="btn btn-primary next"></button>';
      /* data-target y no data-go: al cargar, cada [data-go] se enlaza a goStep */
      f.addEventListener('click', e => { const b = e.target.closest('button[data-target]'); if (b && !b.disabled) goStep(b.dataset.target); });
      p.appendChild(f);
    }
    f.setAttribute('aria-label', T('Anterior y siguiente bloque', 'Previous and next block'));
    const prev = order.slice(0, i).reverse().find(usable);
    const next = order[i + 1];
    const bp = f.querySelector('.prev'), bn = f.querySelector('.next');
    bp.hidden = !prev;
    if (prev) { bp.dataset.target = prev; bp.innerHTML = `← <span><small>${T('Anterior', 'Previous')}</small>${esc(stepLabel(prev))}</span>`; }
    bn.hidden = !next;
    if (next) {
      bn.dataset.target = next; bn.disabled = !usable(next);
      bn.innerHTML = `<span><small>${T('Siguiente', 'Next')}</small>${esc(stepLabel(next))}</span> →`;
    }
  });
}

/* hay trabajo que se perdería al cerrar sólo si la copia guardada en el
   navegador no es la de ahora (guardado aún pendiente o sin espacio) */
function unsavedWork() {
  if (!(state.acc || []).length) return false;
  try { return localStorage.getItem('germplasmpro:acc') !== JSON.stringify(state.acc); } catch (e) { return true; }
}
function stepFromHash() {
  const m = /^#b(\d+)/.exec(location.hash || '');
  const n = m ? Number(m[1]) : 1;
  const s = STEPS.find(x => x.n === n);
  return String(s && s.ready ? n : 1);
}

document.addEventListener('DOMContentLoaded', () => {
  buildStepper();
  const brand = el('brand');
  if (brand) brand.addEventListener('click', e => { e.preventDefault(); goStep(1); });
  /* el enlace para saltar al contenido no debe tocar el #bN de la dirección,
     que es el que decide el bloque abierto */
  const skip = document.querySelector('.skip-link');
  if (skip) skip.addEventListener('click', e => { e.preventDefault(); const m = el('main'); if (m) m.focus(); });
  els('[data-go]').forEach(b => b.addEventListener('click', () => goStep(b.dataset.go)));

  /* barra común de la suite: tema, ayuda, teclado y aviso al cerrar. El idioma
     y el tema siguen en I18N y Theme (i18n.js); las pruebas cargan este
     archivo sin labg-core.js, de ahí el if. */
  if (window.LABG) {
    if (LABG.theme) {
      LABG.theme.key = 'germplasmpro:theme';
      LABG.theme.paint();
      document.addEventListener('themechange', () => LABG.theme.paint());
    }
    const hb = el('helpBtn');
    if (hb) hb.addEventListener('click', () => LABG.showShortcuts());
    LABG.shortcuts([]);
    LABG.bindStepKeys(goStep);
    LABG.guardUnload(unsavedWork);
    const m3 = el('b3Msg');
    if (m3) LABG.messageRole(m3, 'info');
    document.addEventListener('langchange', () => {
      buildStepperLabels();
      LABG.theme && LABG.theme.paint();
      refreshStepMarks();
      refreshStepFooters();
    });
    /* cargar datos en el Bloque 2 no cambia de bloque: se revisa la palomita
       poco después de cada clic o cambio */
    let t = null;
    const later = () => { clearTimeout(t); t = setTimeout(refreshStepMarks, 700); };
    document.addEventListener('click', later);
    document.addEventListener('change', later);
  }
  goStep(stepFromHash(), { fromHash: true, keepScroll: true });
  window.addEventListener('hashchange', () => goStep(stepFromHash(), { fromHash: true }));
});
/* ---------------- esperas ----------------
   Ventana de trabajo de la suite para los cálculos que corren al hacer clic.
   Se abre sólo si la espera pasa de 300 ms; las pruebas cargan este archivo
   sin labg-core.js, de ahí que todo pregunte por window.LABG. */
function gpWork(es, en) {
  if (!window.LABG || !LABG.work) return null;
  const w = LABG.work({ title: LABG.t(es, en || es), delay: 300 });
  gpWork.current = w;
  return w;
}
gpWork.current = null;
/* marca la ventana abierta como fallida: se cierra sin palomita */
function gpWorkFail() { if (gpWork.current) gpWork.current._failed = true; }
/* deja pintar la ventana, corre f y la cierra con palomita (o sin ella si falló) */
function gpAfterPaint(f, w) {
  const done = () => { if (gpWork.current === w) gpWork.current = null; if (w && !w.ended) { if (w._failed) w.close(); else w.done(); } };
  return (window.LABG ? LABG.nextPaint() : new Promise(r => setTimeout(r, 30))).then(f).then(done, e => { console.error(e); if (w) w._failed = true; done(); });
}
/* exportaciones: el botón trabaja con puntitos y termina en «✓ Listo» */
function gpBusy(btn, task) {
  if (window.LABG && LABG.busyButton && btn) return LABG.busyButton(btn, task).catch(e => console.error(e));
  return Promise.resolve().then(task);
}
if (window.LABG && LABG.work) {
  LABG.work.scene = 'grow';
  LABG.work.tips = [
    ['La prueba de Mantel usa 999 permutaciones con semilla fija: los mismos datos dan siempre el mismo valor p.',
     'The Mantel test uses 999 permutations with a fixed seed: the same data always give the same p value.'],
    ['La colección se guarda en este navegador: al volver, tus accesiones siguen ahí.',
     'The collection is stored in this browser: when you come back, your accessions are still there.'],
    ['El paquete .zip del Bloque 10 trae el pasaporte en MCPD v2.1 y en Darwin Core, sin perder campos.',
     'The Block 10 .zip package carries the passport in MCPD v2.1 and in Darwin Core, without losing fields.'],
  ];
}

/* la etiqueta «pronto» de un bloque sin terminar va en un atributo */
function buildStepperLabels() {
  els('.step-btn.soon').forEach(b => b.setAttribute('data-soon', T('pronto', 'soon')));
}

Object.assign(window, {
  STEPS, el, els, mk, esc, L2, download, slug, Prefs,
  fmt, fmtInt, clamp, sum, mean, mulberry32, rbinom,
  erf, normCdf, normInv, haversine, goStep, rnorm,
});
