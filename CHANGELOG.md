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
- **Mapa de colecta (Bloque 4):**
  - Todo país con puntos cuenta: la tabla de códigos de dos y tres letras (`GEO.A3_TO_A2`) y el catálogo de países
    (`MCPD.COUNTRIES`) traen ya los 177 países que dibuja el mapa. Antes, un punto que caía en un país fuera de la
    lista parcial (Botsuana, Croacia, Catar, Taiwán…) se descartaba en `GEO.countByCountry`: no salía en la tabla por
    país ni se coloreaba en la coropleta. Si algún día falta una equivalencia, cuenta con su código de dos letras.
  - La altitud vacía ya no se pinta como 0 m: queda en gris, «sin dato», fuera de la escala (`GEO.elevOf`). Tampoco
    entran en la escala las altitudes imposibles (fuera de −500 a 7000 m, `GEO.elevPlausible`); la leyenda dice
    cuántas hay.
  - La rampa de color empieza en un oro pálido (`--ramp0`, uno por tema) en lugar del color del mar, que se comía los
    valores bajos. Cambia en todas las rampas de la app (mapa, coropletas, rejilla, mapa de calor y vacíos).
  - La leyenda de años dice «2014 – 2022», sin separador de miles.
  - Las claves de entidad van en el polo de inaccesibilidad del polígono más grande (`GEO.labelPoint`), no en el
    centro de la caja: la de Colima ya no cae en el mar. Las que se enciman prueban desplazamientos cortos y, si no
    caben y no llevan cuenta, se omiten.
  - Sobre una coropleta o una rejilla los puntos llevan borde blanco grueso y un aro oscuro fino: ya no desaparecen
    sobre el morado del máximo.
  - Los rótulos de las leyendas de rampa (también en los Bloques 5 y 6) van en una columna con la barra
    (`.legend-scale`) y quedan alineados con sus extremos.
- **Diversidad geográfica (Bloque 5):**
  - Todos los totales —riqueza γ, α media, β de Whittaker, Chao1, Chao2, jackknife, cobertura y curva de
    acumulación— se calculan sobre el mismo conjunto: las accesiones que quedan dentro de alguna unidad
    (`DIV.analyse`). Antes la γ, Chao1 y la curva usaban las 45 accesiones mapeadas y la α sólo las de las unidades,
    y la β salía inflada (con entidades: 7.89 → 5.67). El primer recuadro se llama «Accesiones analizadas» y dice de
    cuántas con coordenadas salen; una nota explica cuántas quedan fuera y por qué.
  - La prueba de Mantel con franjas de altitud compara la composición con la diferencia de altitud entre los centros
    de las franjas (m), no con la coordenada de la primera accesión de cada franja; el eje, el título y el resultado
    lo dicen. Cuando Mantel no se puede calcular, el mensaje da la causa real: cuántas unidades tienen dos accesiones
    o más (con países, 3 de 8), o que las disimilitudes o las distancias no varían.
  - El gradiente altitudinal enseña las franjas vacías dentro del intervalo, con cero (`DIV.bandSeries`), y deja fuera
    las altitudes imposibles (fuera de −500 a 7000 m) diciéndolo; tampoco las acepta la franja como unidad, ni las
    vacías cuentan como 0 m en la altitud media.
  - Los encabezados de la tabla de índices se ven como encabezados (sin fondo gris, con la letra de la tabla y un
    indicador de orden) y las celdas con «—» quedan al final al ordenar hacia arriba y hacia abajo (`B5.sortUnits`).
  - J′ con un solo tipo es indefinida («—»), no 1 (`DIV.indices`).
  - Detalles: las marcas de los ejes llevan los decimales que necesitan («0.25», no «0.3»); la β y la q de Hill no
    pasan a mayúsculas en los títulos (`.nt`); «1 aparece» en singular en el aviso de Chao1; las etiquetas de la
    dispersión no se cortan ni se enciman (ni con el rótulo de r); los rótulos de dos estimadores casi iguales en la
    curva ya no se enciman; el mapa de calor trae su leyenda de color (0 %–100 % de composición compartida) dentro del
    SVG; el mapa del índice pone el mínimo y el máximo en los extremos de su rampa.
  - El informe nombra la diferencia de altitud cuando la prueba de Mantel se hizo con franjas. 1023 pruebas, todas en
    verde.

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
- **Vacíos de colecta (Bloque 6):**
  - Cada accesión cuenta en la entidad donde cae su propio punto, no en la del centro de su celda (`gaps.js`
    `fillCells`/`placePoint`): las accesiones de Puebla y del Estado de México ya no se le cargan a Tlaxcala. El déficit
    por entidad es 1 − densidad / densidad máxima, con densidad = accesiones de la entidad ÷ su superficie
    (`stateDeficits`); la tabla por entidad informa también cuántas celdas toca y a cuántas celdas completas equivale.
  - Una celda pertenece al área si toca tierra: se prueban 25 puntos repartidos en ella (9 ó 4 con el mundo) y cada
    entidad se queda con la fracción de tierra que ocupa (`areaGrid`). Las celdas de costa cuyo centro cae en el mar ya
    existen (con 2°, MEX-SE-0016, MEX-VA-0025 y MEX-OF-0037 dejan de quedar «fuera del área»), una entidad que ninguna
    muestra toca se ancla por su punto interior (las 32 tienen al menos una celda con 1° y con 2°), y la celda de una
    accesión en el mar también se crea. En una celda compartida, el déficit es el de sus entidades pesado por tierra.
  - Con «El mundo» como territorio, el déficit se calcula por país (`cellDeficit`); antes las celdas mexicanas recibían
    20 puntos por ser de una entidad y las de otros países 10. Las diez prioridades numeradas ya no se enciman: si dos
    chocan, una se aparta y una línea la une con su celda; el «Vacío más grande» dice de qué celda y de dónde es.
  - Con todos los pesos en cero se avisa y no se calcula un ranking; a igual puntaje gana la celda con más riqueza
    alrededor, luego la más lejana (documentado en el texto).
  - La lista de riesgos cuenta «entidades o países» (la entidad si el punto cae en México, el país si no; claves
    `st:`/`ct:` sin choque entre el Estado de México y el país), y el riesgo se llama «todo de una sola entidad o país».
    Un tipo guardado sólo como ADN recibe su alerta («no regenera planta»), y el tipo vacío «—» ya no suma riqueza,
    exclusividad ni complementariedad. La tabla dice «Se muestran 40 de N» cuando se corta, hay un CSV completo de los
    tipos en riesgo y las cursivas sólo van cuando el tipo es especie o género.
  - Figuras: los círculos de prioridad son claros con borde oscuro (ya no del mismo ocre que la rampa); la leyenda y la
    rampa cambian con lo que se pinta y dicen mínimo y máximo; el mapa se abre lo necesario para que quepan las celdas de
    la orilla; la curva de complementariedad dice «8 celdas ≥ 90 % (94 %)» dentro de la figura. Mapa y curva con
    `role="img"` y nombre, la barra «Por qué» con su desglose como texto, tablas desplazables con foco y nombre.
  - Textos: singular y plural en «accesiones caen fuera», en las etiquetas de las celdas y en la nota de altitudes
    imposibles, que ahora manda a corregirlas en la ficha del Bloque 2 (también en la nota del gradiente del Bloque 5);
    separador de miles en todas las cifras; los deslizadores de pesos ya no parten «40 (40 %)» en dos renglones.
- **Caracterización y núcleo (Bloque 7):**
  - El núcleo respeta el tamaño pedido (`charac.js` `allocate`/`buildCore`): con más estratos que plazas, las plazas
    van por mayor resto a los estratos con más peso según la regla y la interfaz avisa cuántos se quedan sin
    representante; «al menos 1 por estrato» es una casilla explícita y el aviso da el tamaño real (al 20 % por especie
    salían 24 accesiones; ahora 9, con 15 especies sin representante, o 24 si se marca la casilla).
  - Los estratos por entidad o país usan claves sin choque (`st:MEX` = Estado de México, `ct:MEX` = México sin entidad)
    y se leen con su nombre en pantalla y en el CSV; el estrato único y la columna «núcleo» del CSV siguen el idioma.
  - VR%: un solo umbral (≥ 100, `CHAR.VR_THRESHOLD`) en el letrero y en el semáforo; Hu et al. (2000) sólo fijan
    MD% < 20 y CR% > 80. Las clases capturadas cuentan cualitativos y ordinales, que son los que persigue el método M, y
    hay un «Detalle por carácter» desplegable con las pruebas t y F, CR%, VR% y las clases que faltan.
  - Una columna vacía se ve como «vacía», con la casilla y el peso desactivados. La plantilla usa las claves del
    catálogo (DIAS_FLORACION, ALTURA_PLANTA…) y el Bloque 2 la reconoce. Nombres recortados con «…» y el completo al
    pasar el ratón. «Otra selección al azar» sólo se activa al elegir al azar, y con el método M se desactivan los
    selectores que no usa. «Quitar la caracterización» pregunta antes. «1 fila repite» en singular.
  - Figuras: la PCoA combina color y forma cuando hay más de ocho categorías (y junta en «otras» más allá de 32),
    lleva marcas en los ejes y ya no deja un hueco bajo la leyenda; el árbol muestra todas sus hojas con letra de 11 px
    junto a su nombre, escala de altura de fusión y botón «Árbol en SVG». Selectores y pesos con nombre accesible.
- **CSV:** todos los que salen de la app llevan la marca BOM de UTF-8 (`IO.toCSV`), para que Excel lea bien los
  acentos; la app la quita al volver a leerlos.
- **Informe:** la tabla de prioridades de colecta muestra la entidad y la distancia (leía campos que no existían).
  1102 pruebas, todas en verde.

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
