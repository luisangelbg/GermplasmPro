# Cambios

## Después de la 1.0.0 — 2026-10-30

- **Duplicado de seguridad:** sólo cuenta si al menos uno de los sitios de `DUPLSITE` es otra institución que la que
  conserva la accesión (`MCPD.hasSafetyDup`). Lo usan el retrato de la colección (Bloque 2), los riesgos por tipo
  (Bloque 6) y las alertas del manejo del banco (Bloque 8). La validación avisa cuando el duplicado está en la misma
  institución, y `DUPLSITE` acepta varios códigos separados por punto y coma, como pide MCPD v2.1.
- **Nombres de cultivo (Bloque 3):** el aviso de «un mismo taxón con varios nombres de cultivo» toma en cuenta la
  subespecie o la variedad; el teocintle (*Zea mays* subsp. *parviglumis*) ya no cuenta como otro nombre del maíz.
- **Colección de ejemplo:** los dos maíces de Guatemala entran al banco después de colectarse (antes tenían una fecha
  de entrada anterior a la colecta que no era uno de los errores sembrados); la vainilla, el aguacate, la papa y la
  yuca tienen su duplicado de seguridad en otra institución, y la descripción dice «46 accesiones de 24 taxones y 18
  géneros».
- **Detalles:** el Bloque 3 escribe «En 1 accesión» en singular; los encabezados de `data/world.js` y
  `data/mexico-states.js` ya no hablan de las apps de donde se copiaron; Natural Earth (dominio público) queda
  declarado en `LICENSES-TERCEROS.md`. 914 pruebas, todas en verde.

## Después de la 1.0.0 — 2026-10-09

- **Accesibilidad (WCAG 2.5.3, la etiqueta en el nombre):** el enlace de la marca en la barra superior se anunciaba
  como «Inicio de GermplasmPro», un nombre que no contenía el texto que muestra. `I18N.apply` (`js/i18n.js`) copiaba
  cada título emergente (`data-es-title` / `data-en-title`) a `aria-label`; lo sigue haciendo, salvo donde un enlace,
  botón o pestaña ya muestra un texto legible que el título no contiene: ahí el control se llama por ese texto y el
  título queda como su descripción. Se ve y calcula igual; las 908 pruebas siguen pasando.

## 1.0.0 — 2026-10-01

Primera versión publicada: los diez bloques completos.

- **Bloques:** portada con el simulador «la vida de una accesión», pasaporte MCPD v2.1 con campos de extensión,
  calidad y duplicados, mapa de colecta sin internet, diversidad geográfica, vacíos de colecta, caracterización y
  colección núcleo, manejo del banco, etiquetas y registro, e informe con exportación a MCPD y Darwin Core.
- **Módulos compartidos de la suite:** el Navegador LABG (barra lateral de bloques, índice de secciones y paleta
  Ctrl+K) y el Estudio de figuras LABG (editar y exportar cada figura a la medida de la revista). Los íconos son de
  Lucide (ISC); ver `LICENSES-TERCEROS.md`.
- **Pruebas:** 902 en `tests/index.html`, todas en verde, también abriendo la página con doble clic.
- **Publicación:** código en GitHub y la app en GitHub Pages. La cita de la portada ya nombra la versión 1.0.0 y la
  dirección del repositorio, en lugar de «versión en desarrollo». Se agregan `CITATION.cff`, `codemeta.json` y este
  archivo.
