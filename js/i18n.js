/* GermplasmPro — idioma (español / inglés) y tema de color.

   Cómo funciona la traducción, para que nada quede a medio traducir:
   1. El texto largo del HTML se escribe dos veces, uno al lado del otro:
        <span data-l="es">…</span><span data-l="en">…</span>
      El CSS oculta el idioma que no está activo (html[lang]), así el cambio es
      inmediato y no necesita buscar en ningún diccionario.
   2. Los textos cortos que no se pueden duplicar (opciones de un <select>,
      textos de botones, marcadores de posición, ayudas emergentes) llevan las
      dos versiones como atributos: data-es / data-en, data-es-ph / data-en-ph,
      data-es-title / data-en-title. `I18N.apply()` copia el que toca.
   3. El texto que arma JavaScript usa T('español', 'English'), y cada módulo
      que dibuja algo escucha el evento 'langchange' para volver a dibujarlo.

   GermplasmPro se usa en bancos de germoplasma de México: abre en español a
   menos que el usuario haya elegido inglés antes. El tema sigue al sistema
   operativo hasta que el usuario elige uno. */

(function () {
  const KEY_LANG = 'germplasmpro:lang', KEY_THEME = 'germplasmpro:theme';
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } };

  function initialLang() {
    const saved = read(KEY_LANG);
    return saved === 'en' ? 'en' : 'es';
  }

  const I18N = {
    lang: initialLang(),

    set(lang) {
      if (lang !== 'es' && lang !== 'en') return;
      const changed = lang !== I18N.lang;
      I18N.lang = lang;
      write(KEY_LANG, lang);
      I18N.apply();
      if (changed) document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    },

    /* copia el idioma activo en los nodos traducidos por atributo */
    apply(root) {
      const L = I18N.lang;
      document.documentElement.lang = L;
      const scope = root || document;
      scope.querySelectorAll('[data-es]').forEach(n => { const v = n.getAttribute('data-' + L); if (v != null) n.textContent = v; });
      scope.querySelectorAll('[data-es-html]').forEach(n => { const v = n.getAttribute('data-' + L + '-html'); if (v != null) n.innerHTML = v; });
      scope.querySelectorAll('[data-es-ph]').forEach(n => { const v = n.getAttribute('data-' + L + '-ph'); if (v != null) n.setAttribute('placeholder', v); });
      scope.querySelectorAll('[data-es-title]').forEach(n => {
        const v = n.getAttribute('data-' + L + '-title');
        if (v != null) { n.setAttribute('title', v); n.setAttribute('aria-label', v); }
      });
      const t = document.querySelector('title');
      if (t && t.dataset.es) document.title = t.getAttribute('data-' + L);
      document.querySelectorAll('.lang-seg button').forEach(b => b.classList.toggle('on', b.dataset.lang === L));
    },
  };

  /* T('texto', 'text') → el idioma activo. También acepta un objeto {es, en}. */
  function T(es, en) {
    if (es && typeof es === 'object' && !Array.isArray(es)) return I18N.lang === 'en' ? (es.en ?? es.es) : es.es;
    return I18N.lang === 'en' ? en : es;
  }

  /* ---------------- tema ---------------- */
  const Theme = {
    current() {
      const set = document.documentElement.getAttribute('data-theme');
      if (set === 'dark' || set === 'light') return set;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    set(mode) {
      if (mode === 'dark' || mode === 'light') {
        document.documentElement.setAttribute('data-theme', mode);
        write(KEY_THEME, mode);
      }
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: Theme.current() } }));
    },
    toggle() { Theme.set(Theme.current() === 'dark' ? 'light' : 'dark'); },
  };
  const savedTheme = read(KEY_THEME);
  if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.lang = I18N.lang;
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSys = () => { if (!document.documentElement.getAttribute('data-theme')) document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: Theme.current() } })); };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
  }

  document.addEventListener('DOMContentLoaded', () => {
    I18N.apply();
    document.querySelectorAll('.lang-seg button').forEach(b => b.addEventListener('click', () => I18N.set(b.dataset.lang)));
    const tb = document.getElementById('themeBtn');
    if (tb) tb.addEventListener('click', () => Theme.toggle());
  });

  window.I18N = I18N;
  window.T = T;
  window.Theme = Theme;
})();
