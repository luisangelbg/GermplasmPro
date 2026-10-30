# Manual de usuario de GermplasmPro

El manual se escribe por partes, en HTML, con el mismo estilo que los manuales de PhenologyPro, EconomicsPro,
BioModelling Pro, PopGeneticsPro y las demás apps LABG. Primero va la versión en español; después, la inglesa en
`en/` (mismas partes y marcado, capturas en `img/en/` tomadas con `captura.ps1 -Idioma en`). Cuando todas las
partes de un idioma estén listas se unen en un solo documento y se imprime a PDF **una sola vez**.

```
manual/
  manual.css           hoja común: tamaño carta y marco de la portada
  interior.css         páginas interiores: hojas blancas, vivos en morado de maíz azul y negro, un color por bloque
  paginar.js           reparte el contenido en hojas tamaño carta (encabezados, números de página, índice)
  img/                 capturas de pantalla de la app (img/en/: las de la interfaz en inglés)
  herramientas/
    captura.ps1        abre la app, ejecuta una receta y guarda la captura en img/ al doble de resolución
    recetas/           una receta por captura (JS): bN-…
    evaluar.ps1        abre una página sin ventana, ejecuta un guion y escribe el resultado
    huecos.js          guion para evaluar.ps1: el hueco al pie de cada hoja de una parte del manual
    unir-manual.ps1    une la portada y las partes en <idioma>/manual-completo.html para imprimir
  es/                  partes en español
  en/                  partes en inglés (después)
```

`captura.ps1` usa `tools\local\shot.ps1` (fuera de git), el mismo de las demás apps.

Las capturas se toman con la app abierta desde `file://`, en español, tema claro, 1400 × 900, al doble de
resolución, con la **colección de ejemplo** del Bloque 2 (46 accesiones, 18 especies, 7 países, las cinco rutas de
conservación, con sus errores sembrados) y, en el Bloque 7, la caracterización de ejemplo (12 descriptores), salvo
donde el texto diga otra cosa. Todos los números del manual salen de esa corrida y se comprueban en la app antes de
escribirlos.

## Plan de partes

| Parte | Archivo | Contenido |
|---|---|---|
| 1 | `00a-portada.html` | portada blanca: título en español e inglés; ilustración original con semilla fija |
| 2 | `00b-introduccion.html` | créditos, cómo citar, índice general, cómo leer el manual e introducción I.1–I.9 |
| 3 | `01-bloque1.html` | Bloque 1 · Inicio: los tipos de banco (ex situ e in situ), el comportamiento de la semilla y el simulador «la vida de una accesión» |
| 4 | `02-bloque2.html` | Bloque 2 · Pasaporte: MCPD v2.1 y los campos GP_, importar archivo, pegar desde Excel, la plantilla guiada, validación, tabla, ficha, retrato de la colección y exportación |
| 5 | `03-bloque3.html` | Bloque 3 · Calidad y duplicados: coordenadas contra el país, nombres, correcciones con visto bueno, duplicados, fusión e informe de calidad |
| 6 | `04-bloque4.html` | Bloque 4 · Mapa de colecta: encuadre, color de los puntos, coropleta, rejilla, tablas por entidad y país, exportación |
| 7 | `05-bloque5.html` | Bloque 5 · Diversidad geográfica: unidades y tipos, índices, rarefacción, estimadores de riqueza, beta, Mantel y gradiente altitudinal |
| 8 | `06-bloque6.html` | Bloque 6 · Vacíos de colecta: la rejilla, el índice de prioridad, la ruta para GPS, los riesgos de la colección y el conjunto mínimo |
| 9 | `07-bloque7.html` | Bloque 7 · Caracterización y núcleo: tipos de carácter, Gower, PCoA, agrupamiento y silueta, colección núcleo y su validación |
| 10 | `08-bloque8.html` | Bloque 8 · Manejo del banco: viabilidad, alertas por ruta, plan de trabajo, pruebas y regeneraciones, calculadora y carga de trabajo |
| 11 | `09-bloque9.html` | Bloque 9 · Etiquetas y registro: Code 128 y QR, formatos, lista de siembra, vale de distribución y libro de registro |
| 12 | `10-bloque10.html` | Bloque 10 · Informe: secciones, métodos en prosa, paquete ZIP y exportación Darwin Core |
| 13 | `11-apendices.html` | apéndices A–F: archivos, reglas de decisión reunidas, glosario, cuando algo no sale, referencias, licencia y cita |

## Colores por bloque

Los de la franja de la portada, en el mismo orden; salen de la paleta de la app.

| Bloque | Color | Variable |
|---|---|---|
| Preliminares e introducción | morado oscuro `#4e3a75` | `--b0` |
| 1 Inicio | morado de maíz azul `#6b4a8f` | `--b1` |
| 2 Pasaporte | cielo `#2f7fb4` | `--b2` |
| 3 Calidad y duplicados | rojo `#b5352b` | `--b3` |
| 4 Mapa de colecta | tierra `#8a6a45` | `--b4` |
| 5 Diversidad geográfica | verde `#3d8f4f` | `--b5` |
| 6 Vacíos de colecta | ocre de mazorca `#c5761c` | `--b6` |
| 7 Caracterización y núcleo | magenta `#a8437e` | `--b7` |
| 8 Manejo del banco | verde de chayote `#4f8a3c` | `--b8` |
| 9 Etiquetas y registro | oro viejo `#9a7414` | `--b9` |
| 10 Informe | índigo `#4e4382` | `--b10` |
| Apéndices | negro `#111111` | `--bx` |

## Capítulo = bloque

El capítulo N explica el Bloque N de la aplicación. La introducción no lleva número: sus apartados son I.1, I.2, etc.

## Cómo se trabaja

1. Cada parte se abre con doble clic y se ve ya paginada (paginar.js). Se revisa el hueco al pie de cada hoja con
   `evaluar.ps1 -ScriptFile herramientas\huecos.js -Page manual/es/NN-….html`.
2. Las capturas se toman con `captura.ps1 -Receta <nombre>`; cada receta deja en `window.__recorte` el recorte que
   la figura necesita.
3. Al terminar todas las partes: `powershell -ExecutionPolicy Bypass -File herramientas\unir-manual.ps1 es` desde
   `manual/`, y se imprime `es/manual-completo.html` a PDF (`GermplasmPro User's Manual.pdf`).
