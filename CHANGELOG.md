# Cambios

## Después de la 1.0.0 — 2026-10-30

- **Pasaporte (Bloque 2):**
  - Después de «Importar y reemplazar» o «Añadir a lo que ya hay», la colección queda guardada en el navegador en ese
    momento, con la hora de guardado (antes sólo se guardaba con la siguiente edición).
  - En la plantilla guiada, pegar un valor suelto en una celda o en el buscador de columnas ya entra en ese campo; el
    diálogo lo interceptaba y lo mandaba a la caja principal. Un pegado con tabuladores o saltos de línea en una celda
    se sigue repartiendo en la rejilla.
  - «Reconocer otra vez» sólo mira las columnas de pasaporte: las de caracterización que se habían apartado ya no
    reciben descriptor (SEMILLAS_FRUTO terminaba en GP_STOCK), y el contador de columnas reconocidas no las cuenta.
  - «Empezar en blanco», «Abrir la colección de ejemplo» y abrir un proyecto .json preguntan antes de reemplazar una
    colección con datos, diciendo cuántas accesiones se perderán.
  - El histograma de altitud del retrato incluye los sitios a 0 m (`MCPD.summarize` descartaba el cero junto con las
    celdas vacías); siguen fuera las vacías y las que no son número.
  - El proyecto .json guarda también la caracterización del Bloque 7 y la restaura al abrirlo; los proyectos viejos,
    que no la traen, se abren igual y dejan la caracterización que ya había.
- **Calidad y duplicados (Bloque 3):**
  - Los pares descartados («No son duplicados» o anotados sin fusionar) se recuerdan por la identidad de las dos
    accesiones (instituto + número, `QC.pairKey`), no por su fila: ya no se pierden ni pasan a otro par al fusionar,
    ordenar o importar. Los descartes viejos, guardados por fila, se tiran, y uno que ya no corresponde a ningún par
    no cuenta en «Volver a proponer los descartados».
  - En pantalla ya no aparecen los códigos internos (`lonsign`, `speciesCase`, `cropName`…): cada uno tiene su nombre
    en español y en inglés (`QC.CODES`), y la tabla de correcciones nombra el descriptor por su nombre. El aviso de
    nombres de cultivo enseña el taxón y los nombres como están escritos en los datos («Zea mays», «Maíz», «Elote»),
    no su forma normalizada.
  - El puntaje de duplicados resta 15 puntos cuando las dos accesiones declaran `SUBTAXA` y no es la misma (los
    géneros distintos siguen restando 35); queda descrito en la pantalla, en el README y en la tabla 3.4 del manual.
  - La corrección de nombres TODO EN MAYÚSCULAS deja el nombre de la accesión y el del cultivo en forma de oración
    («BOLITA  AMARILLO» → «Bolita amarillo») y el sitio como nombre de lugar, sin mayúscula en las palabras menores
    del español («VILLA DE MITLA» → «Villa de Mitla»); lo que no viene todo en mayúsculas sólo pierde los espacios de
    más.
  - La comparación lado a lado muestra la ruta de conservación por su nombre («Banco de semillas», no «seed»), y la
    distancia del par se escribe igual en la cabecera y en la razón (antes «6.20 km» y «a 6 km»).
  - Plurales con 1: «1 corrección aplicada», «1 par por encima del umbral», «1 error», «1 aviso», «1 accesión en la
    colección», «1 taxón», «1 de 5 falla»…
- **Herramientas del manual:** `evaluar.ps1` y `shot.ps1` aceptan solos los `confirm()`, que sin ventana dejan la
  página colgada. 977 pruebas, todas en verde.

- **Simulador del Bloque 1:**
  - Las constantes de viabilidad (K_E y C_W) ya no pasan de una especie a otra: al cambiar de especie o de escenario
    se toman las de la nueva (antes, al pasar del café al trigo se quedaba K_E = 5.2 y la semilla parecía durar 47
    años en vez de 883).
  - Una accesión clonal (estacas, frascos o criotubos de un mismo genotipo) ya no pierde alelos ni se consanguiniza
    en el banco de campo, in vitro ni en la criopreservación: perder plantas o líneas sólo acerca el riesgo de
    perderla entera. Las líneas in vitro de una especie sexual se sortean como 2N gametos. La especie genérica marcada
    como clonal se trata como clon.
  - El título de la gráfica sólo habla de pruebas de germinación en el banco de semillas; la entrada a la
    criopreservación ya no se dibuja como un ciclo; con la ruta bloqueada se ocultan los deslizadores; K_E y C_W ya no
    se parten en dos renglones; la sección «Los diez bloques» dice que los diez están listos, la tarjeta del Bloque 2
    se llama «Pasaporte» y la del Bloque 6 ya no habla de ambientes. 919 pruebas, todas en verde.
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
