# Cambios

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
