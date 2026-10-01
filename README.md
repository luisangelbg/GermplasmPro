# GermplasmPro

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

**El banco de germoplasma, accesión por accesión.** Una aplicación para el trabajo diario de una colección de
recursos fitogenéticos —**de cualquier especie**: cultivos anuales, árboles frutales y forestales, cultivos de
propagación vegetativa y parientes silvestres—, y **para cualquier forma de conservarla**: banco de semillas,
banco de campo o colección viva, cultivo in vitro, criopreservación y conservación **in situ** u **on-farm**.
Incluye **pasaporte** con los descriptores multicultivo de FAO/Bioversity (MCPD v2.1), **control de duplicados**,
**mapas de colecta** que se dibujan sin internet, **minería de diversidad geográfica** y **vacíos de colecta**, más
el manejo del material vivo: existencias, germinación, regeneración, subcultivos, criotubos, etiquetas e informes.
Está pensada para sustituir la hoja de cálculo y los portales externos, no para modelar distribuciones.

Está construida por bloques y **los diez están listos**: la aplicación está completa.

*English summary below.*

## Cómo abrirla

1. Haz doble clic en **`index.html`**. Se abre en tu navegador, en la portada. Todo funciona desde la copia local,
   sin servidor y sin conexión a internet.
2. Si tu institución bloquea las páginas abiertas como archivo, haz doble clic en **`Open GermplasmPro.bat`**
   (o ejecuta `server.ps1` con PowerShell): inicia un pequeño servidor y abre `http://localhost:9600`.
3. Las pruebas se abren igual: **`tests/index.html`** (todas deben salir en verde; con `?all` se listan también
   las que pasan).

## Los cinco caminos de la conservación

| Ruta | Qué es | Para qué material |
|---|---|---|
| **Banco de semillas** (ex situ) | semilla seca en frasco cerrado, en cámara fría | especies de semilla **ortodoxa**; con reservas, las **intermedias** |
| **Banco de campo o colección viva** (ex situ) | plantas vivas en una parcela, un huerto o un arboreto | árboles, **recalcitrantes**, cultivos de propagación vegetativa; sirve para todo, pero es caro y está expuesto |
| **Cultivo in vitro de crecimiento lento** (ex situ) | plántulas o ápices en frascos, subcultivados cada cierto tiempo | material **clonal** y recalcitrante |
| **Criopreservación** (ex situ) | ápices, embriones o polen a −196 °C | cualquiera; el respaldo definitivo del material clonal |
| **In situ y on-farm** | la población viva en su reserva o en la parcela de quien la siembra | cualquiera; la única ruta en la que la población **sigue evolucionando** |

El banco de **ADN** conserva información, no material vivo: la app lo registra en el pasaporte, junto con las
muestras de herbario y de polen, pero no lo simula porque de un tubo de ADN no se regenera una planta.

## Los diez bloques

| Bloque | Contenido | Estado |
|---|---|---|
| 1 | Portada: los cinco caminos de la conservación y el simulador «la vida de una accesión» | listo |
| 2 | Pasaporte: importación (CSV, TSV o pegado desde una hoja de cálculo), reconocimiento automático de columnas, los 42 descriptores MCPD v2.1 más 7 de extensión, validación campo por campo y cruzada, tabla editable, ficha completa, retrato de la colección y exportación | listo |
| 3 | Calidad y duplicados: coordenadas contra el país con diagnóstico y corrección propuesta, consistencia de nombres y catálogos, y detección de duplicados por puntaje con bloqueo, comparación lado a lado y fusión | listo |
| 4 | Mapa de colecta: México con sus 32 entidades y el mundo por países, sin internet; puntos coloreados por cualquier descriptor, coropleta por entidad o país, rejilla, escala y exportación a SVG y PNG | listo |
| 5 | Diversidad geográfica: riqueza e índices por entidad, país, celda o franja altitudinal, con rarefacción a esfuerzo común, estimadores de lo que falta por colectar, composición entre regiones con UPGMA y prueba de Mantel | listo |
| 6 | Vacíos de colecta: celdas sin colectar y distancia al vecino más cercano, índice de prioridad con pesos a la vista, tipos en riesgo (una sola accesión, sin duplicado, sólo campo, sólo in situ), franjas altitudinales vacías y conjunto mínimo por complementariedad | listo |
| 7 | Caracterización y núcleo: descriptores mixtos con faltantes, distancia de Gower, PCoA, agrupamiento Ward o UPGMA con silueta, colección núcleo por estratos (C, P, L, S) o método M, y validación con los criterios de Hu et al. (MD%, VD%, CR%, VR%) | listo |
| 8 | Manejo del banco: viabilidad proyectada lote por lote con tus condiciones y constantes, alertas de prueba, existencias, subcultivo, resiembra y respaldo, plan de trabajo, calculadora de tamaño de muestra para regenerar y carga de trabajo a 25 años | listo |
| 9 | Etiquetas y registro: cinco formatos de etiqueta en milímetros (sobre, frasco, estaca, criotubo y envío) con **código QR o de barras Code 128**, los dos generados aquí; el QR admite un chayote vectorial en el centro; hoja carta o A4, lista de siembra, vale de distribución y libro de registro | listo |
| 10 | Informe: el estado de la colección en un documento HTML que se lee solo, con las figuras dentro y los métodos redactados en prosa; impresión a PDF, paquete ZIP con datos y figuras, y exportación del pasaporte en MCPD y en Darwin Core | listo |

## Qué hace el simulador del Bloque 1

Se elige una especie y una forma de conservarla, y el simulador sigue a la accesión durante décadas con dos relojes
en marcha:

- **El material.** En el banco de semillas, la ecuación de Ellis y Roberts,
  `v = Ki − p/σ` con `σ = 10^(KE − CW·log₁₀m − CH·t − CQ·t²)`, da la germinación esperada según la temperatura de la
  cámara y el contenido de humedad de la semilla. En el banco de campo son las plantas vivas de la parcela y los
  golpes del clima; in vitro, los frascos y la fidelidad genética que se pierde con cada subcultivo; en
  criopreservación, los explantes que rebrotan al descongelar y el riesgo de que falle el tanque; in situ, el tamaño
  de la población y el riesgo de perder el sitio.
- **La integridad genética.** Cada cuello de botella —una regeneración, una resiembra, un subcultivo, la
  recuperación de un criotubo, una generación en la milpa— vuelve a sortear las frecuencias alélicas
  (Wright–Fisher, con 2·Ne gametos o Ne líneas si el material es clonal): se pierden alelos raros, baja la
  diversidad esperada y sube la consanguinidad. In situ, el flujo génico de las poblaciones vecinas devuelve parte
  de lo perdido y la consanguinidad se estabiliza en el equilibrio deriva–migración.

Si el camino elegido no le queda a la especie (un banco de semillas para el chayote o para una variedad de papa),
la app lo dice y ofrece los que sí. **Las constantes de viabilidad publicadas que trae la app son las de
*Zea mays*;** en cualquier otra especie de semilla son un punto de partida editable, y hay que tomarlas de la Seed
Information Database (Kew) o de la literatura antes de usar los años del simulador para programar nada.

## Qué hace el Bloque 2

El pasaporte, que es lo que convierte un montón de sobres en una colección:

- **Traer los datos.** Archivo CSV o TSV (con detección del separador, de la codificación y de las comillas de
  las hojas de cálculo), pegado directo desde una hoja de cálculo, la colección de ejemplo o una tabla en blanco. Todo se guarda
  solo en el navegador y nada se sube.
- **Ver qué columnas existen, y armarlas una por una.** El diálogo de pegado tiene una segunda pestaña, *armar la
  tabla columna por columna*, con **el catálogo completo de columnas explicadas**: cada una con su nombre completo,
  su clave (`ACCENUMB`, `DECLATITUDE`, `SAMPSTAT`… que nadie tiene por qué saberse), qué significa, en qué unidad va
  y un ejemplo, agrupadas y con buscador. Se marcan las que se vayan a usar —arranca con lo obligatorio y lo muy
  recomendable— y abajo aparece la tabla lista para llenar: se puede escribir, **pegar una columna entera** copiada
  de una hoja de cálculo (clic en la primera celda y Ctrl+V, y se reparte hacia abajo), pegar un bloque de varias columnas, o
  descargar la plantilla en CSV con esos encabezados para llenarla en la hoja de cálculo.
- **Más allá del pasaporte: caracterización.** Al catálogo se suman **37 descriptores de caracterización** en cuatro
  grupos —agronómicas y de la planta, morfológicas del fruto, químicas y de calidad, y semilla—, cada uno con su
  unidad, su escala y su ejemplo: días a floración, peso y forma del fruto, grosor de la pulpa, °Brix, acidez
  titulable, relación Brix/acidez, firmeza, materia seca, vitamina C, peso de 100 semillas… Se pegan en la misma
  tabla que el pasaporte, y al importar **cada cosa va a su sitio**: los descriptores MCPD a la colección y los de
  caracterización al Bloque 7, unidos por el número de accesión. El pasaporte MCPD no se ensucia con campos que no
  son suyos, que es lo que mantiene limpias las exportaciones a MCPD y a Darwin Core.
- **Pegar desde una hoja de cálculo, sin sorpresas.** El pegado no es una caja de texto a ciegas: en cuanto entra el contenido
  —con Ctrl+V en cualquier punto del diálogo, o desde el portapapeles— la app lo lee y enseña **qué entendió**
  (cuántas accesiones, cuántas columnas y con qué separador), dibuja las primeras filas ya partidas en celdas y
  avisa de lo que suele salir mal al copiar de una hoja: filas con distinto número de celdas —una coma dentro de un
  texto, celdas combinadas—, todo caído en una sola columna, coma decimal en las coordenadas, o haber copiado sólo
  los títulos. **Reconoce solo si la primera fila son encabezados o ya son datos**, comparando su forma con la de
  las filas de abajo, y si acierta mal se corrige con una casilla; sin encabezados, las columnas se llaman como en
  la hoja (Columna A, B, C…). El botón dice cuántas filas va a leer y no deja seguir si no hay nada que leer.
- **Reconocer las columnas.** La app propone a qué descriptor MCPD corresponde cada encabezado —en español o en
  inglés, con acentos, con paréntesis— y decide mirando los valores lo que el nombre no dice: si una columna de
  latitud trae `173832N` la manda al campo de grados-minutos-segundos, y si trae `17.6423`, al decimal. Cada
  asignación se puede cambiar a mano, y junto a cada columna se enseña **qué tal encaja**: cuántos de sus valores
  pasarían la validación con el descriptor elegido y cuál es el primero que no, antes de importar nada. Si algún
  descriptor obligatorio se quedó sin columna, se dice cuál.
- **Los descriptores.** Los 42 de MCPD v2.1 con sus listas de códigos (SAMPSTAT, COLLSRC, STORAGE, MLSSTAT,
  GEOREFMETH), más **7 campos de extensión** marcados aparte (clave `GP_`) para lo que el estándar no cubre: la ruta
  de conservación activa —incluidas reserva genética y conservación en la parcela—, el sitio in situ, la persona o
  comunidad custodia, las existencias, la última germinación y la última regeneración.
- **Validar.** Campo por campo (formatos de fecha y coordenadas, códigos de las listas, países ISO alfa-3, códigos
  WIEWS) y cruzando campos: fechas en orden imposible, los dos formatos de coordenada que no coinciden, una sola
  coordenada, un estatus silvestre con fuente de troje, un registro in situ sin sitio, una accesión sin duplicado de
  seguridad. Los problemas se agrupan por tipo y se corrigen en la tabla o en la ficha completa.
- **El retrato de la colección.** Accesiones por ruta, por especie, por estatus y por país, altitud de los sitios,
  año de colecta y qué tan completo está cada descriptor.
- **Exportar.** CSV MCPD con las claves oficiales, CSV completo con la extensión, o el proyecto en JSON.

## Qué hace el Bloque 3

Lo que sólo se ve mirando la colección entera:

- **Correcciones propuestas.** La app enseña el valor actual y el propuesto y espera tu visto bueno, por tipo o
  todas juntas: longitudes sin signo, países en dos letras, nombres todo en mayúsculas o con espacios de más,
  géneros y epítetos mal capitalizados, la ruta de conservación que se deduce del almacenamiento y las coordenadas
  decimales que se calculan del formato antiguo.
- **¿El punto cae donde dice?** Cada coordenada se compara con un rectángulo envolvente del país declarado (hay
  cajas para los 119 países del catálogo). Cuando el punto se sale, la app prueba las tres equivocaciones clásicas —longitud sin
  signo, latitud con el signo cambiado, latitud y longitud intercambiadas— y propone la que hace que el punto caiga
  dentro. Marca también el (0, 0), las coordenadas redondeadas a grados enteros y la latitud igual a la longitud.
  Son rectángulos, no fronteras: sirven para cazar errores gruesos, y por eso todo lo que sale de ellas es un aviso.
- **Nombres y catálogos.** Géneros que se parecen demasiado para ser distintos (Levenshtein ≤ 2), epítetos con
  autoridad incluida, un taxón con dos nombres de cultivo, un sitio con tres ortografías, coordenadas idénticas en
  sitios que se declaran distintos.
- **Duplicados.** Se comparan sólo los pares que comparten algo (número de colecta, número de donante, principio del
  nombre, taxón y fecha, o la misma celda de medio grado), de modo que una colección grande no necesita comparar
  todos los pares: en 600 accesiones se evalúan unos cientos, no 180 000. Cada coincidencia suma puntos —el mismo
  número de colecta pesa 40, el nombre casi idéntico 25 (Jaro-Winkler), estar a menos de 1 km 20, la misma fecha
  15— y dos géneros distintos restan 35. Los pares encadenados se agrupan, se comparan campo por campo lado a lado
  con las diferencias resaltadas, y se pueden **fusionar** (la maestra manda, se rescata lo que sólo tenía la otra,
  se suman las existencias y el número absorbido queda en `OTHERNUMB`), anotar como duplicado sin fusionar, o
  descartar. El umbral es ajustable.
- **Informe de calidad** en CSV con todo lo anterior, incluidas las validaciones del Bloque 2.

## Qué hace el Bloque 4

El mapa, dibujado en el navegador y sin conexión, de modo que **ninguna coordenada sale de tu computadora**:

- **México con sus 32 entidades** (Natural Earth admin-1 a 1:10 millones) y el resto del mundo con el contorno de
  los países (admin-0 a 1:110 millones). Los dos conjuntos son de dominio público y viajan dentro de la app; son los
  mismos que usan BioModellingPro y SciMetricsPro, para que las tres dibujen igual.
- **Encuadre** automático a tus datos, México completo, el mundo o una entidad concreta; se puede tocar una entidad
  en el mapa para acercarse a ella y tocar un punto para abrir su ficha en el Bloque 2.
- **Color de los puntos** por ruta de conservación, cultivo, especie, estatus biológico, país o fuente de colecta
  (categórico, con leyenda y conteos) o por altitud y año de colecta (continuo, con rampa). Tamaño fijo o
  proporcional a las existencias.
- **Coropleta** de accesiones o de especies por entidad, o de accesiones por país, y **rejilla** de 0.25° a 2° con
  el conteo de cada celda: el punto de partida de los Bloques 5 y 6.
- **Barra de escala, flecha de norte y título**, y exportación a **SVG** y **PNG 2×** con los colores resueltos, más
  un CSV de los puntos visibles con la entidad, el país y la celda de cada uno.
- Debajo, las tablas de accesiones y especies **por entidad de México** y **por país**, y el aviso de cuántas
  accesiones con coordenadas caen fuera de todo país (es decir, en el mar: coordenadas con algún error).

La asignación de cada punto a su entidad o a su país se hace con una prueba de punto en polígono contra esos
contornos, no con el texto del campo: así se detecta también la accesión que dice una cosa y cae en otra.

## Qué hace el Bloque 5

Cuánta diversidad hay, dónde está y cuánta falta, para la unidad que elijas: entidad de México, país, celda de
rejilla (0.25° a 2°) o franja altitudinal, y contando como «tipo» la especie, el cultivo, el género o el nombre de
la accesión.

- **Cuánto hay.** Riqueza observada, Shannon, Gini-Simpson, equitatividad de Pielou y los números de Hill (q = 0, 1
  y 2), que expresan las tres medidas anteriores en tipos efectivos y por eso se pueden comparar entre sí.
- **Cuánto falta.** Curva de acumulación de Hurlbert con su banda del 95 %, y cuatro estimadores de la riqueza
  total: **Chao1** (abundancias), **Chao2** y **jackknife de primer y segundo orden** (presencias por unidad), más
  la cobertura de muestreo de Good-Turing. Cuando hay muy pocos dobletones la app **avisa de que Chao1 no es de
  fiar** —la fórmula f₁²/(2f₂) se dispara— y remite a los estimadores de presencias.
- **Comparación justa.** La riqueza crece con el esfuerzo casi siempre, así que la tabla trae una columna de
  **riqueza rarificada**: los tipos que cabría esperar en cada unidad si de todas se hubiera tomado el mismo número
  de accesiones. El esfuerzo de referencia se elige (primer cuartil, mediana, la unidad más pequeña o un número).
- **Dónde está.** Tabla ordenable con todos los índices por unidad, los **tipos exclusivos** de cada una —lo que se
  perdería con ella— y un mapa coroplético del índice que elijas.
- **Si se parecen.** Matriz de composición (Jaccard, Sørensen o Bray-Curtis) dibujada como mapa de calor y ordenada
  por su **agrupamiento UPGMA**, y **prueba de Mantel** con 999 permutaciones entre la distancia en kilómetros y la
  disimilitud de composición, para saber si lo cercano se parece.
- **El gradiente.** Accesiones y tipos por franja altitudinal: las franjas vacías son ambientes que la colección no
  representa.

Todo se exporta: la tabla en CSV y las figuras en SVG.

## Qué hace el Bloque 6

Dónde **no** has colectado y qué material ya tienes pero podrías perder:

- **El mapa de lo que falta.** Una rejilla de 0.5°, 1° o 2° sobre México (o sobre el mundo), quedándose sólo con las
  celdas cuyo centro cae en tierra. Cada celda vacía sabe a qué distancia le queda la colecta más cercana; el mapa se
  puede pintar por prioridad, por esa distancia o por la riqueza de las celdas ocupadas.
- **A dónde ir la próxima vez.** Un **índice de prioridad** que suma cuatro componentes con pesos visibles y
  ajustables: lejanía de la colecta más cercana, riqueza del vecindario, déficit de la entidad y tipos exclusivos
  cerca. Cada fila de la tabla muestra la barra con lo que aporta cada componente, y el CSV sale con las coordenadas
  del centro de cada celda, listas para el GPS.
- **Lo que puedes perder.** Los vacíos que un mapa no enseña: tipos con una sola accesión, sin duplicado de
  seguridad, conservados sólo en banco de campo o sólo in situ, sin coordenadas, o con todo el material de una sola
  localidad. Cada tipo lleva sus banderas y un peso de riesgo.
- **Las franjas altitudinales vacías**, descartando las altitudes imposibles para que un dato de 25 000 m no invente
  cuarenta huecos.
- **El mínimo indispensable.** Complementariedad voraz: qué conjunto de celdas captura toda la diversidad y en qué
  orden, con la curva de cuánto se acumula. Sirve para priorizar sitios in situ y para ver cuánto se perdería al
  cerrar una localidad.

**Hasta dónde llega.** Es un análisis de vacíos **geográficos y de colección**, no ecogeográfico: saber qué
combinaciones de clima y suelo faltan exige capas ambientales, y la app no las trae ni las descarga. Eso se dice en
la propia pantalla, y se ofrece la exportación de coordenadas para llevarlas a una herramienta de modelado.

## Qué hace el Bloque 7

La caracterización, que casi nunca es homogénea —números, categorías y celdas vacías en la misma tabla—, y lo que
se hace con ella:

- **Traer la caracterización.** Un archivo o un **pegado desde una hoja de cálculo** con el mismo asistente del Bloque 2: se ve
  qué entendió la app antes de aceptar nada. Y como aquí lo que decide es si la tabla **se une** con la colección,
  antes de importarla se dice cuántas filas encuentran su accesión, cuántas no —nombrando las que no— y cuántas
  accesiones se quedarían sin datos. Si la columna del número de accesión no era la que la app supuso, se cambia ahí
  mismo y la cuenta se rehace al instante.
- **Los caracteres.** Se unen a las accesiones por `ACCENUMB`. La app propone el tipo de cada columna
  (cuantitativo, ordinal o cualitativo) mirando sus valores, y se puede corregir, apagar o pesar. La descriptiva va
  con media, desviación, CV y rango en los cuantitativos, y con clases, Shannon y equitatividad en los
  cualitativos, que es como se mide la diversidad fenotípica descriptor por descriptor.
- **Distancia de Gower.** La que admite variables mixtas y datos faltantes: cada carácter aporta su diferencia
  relativa y se promedia sólo sobre lo que ambas accesiones tienen medido.
- **PCoA y agrupamiento.** Coordenadas principales de esa matriz (descomposición espectral por el método de
  Jacobi), árbol Ward.D2 o UPGMA, corte en k grupos y **silueta media**, que dice si los grupos son reales o los
  inventó el corte.
- **La colección núcleo.** Estratificada por grupos, entidad, cultivo o especie, con las cuatro reglas de reparto
  clásicas (constante, proporcional, logarítmica y raíz cuadrada) y eligiendo dentro de cada estrato al azar o las
  accesiones más distintas entre sí; o por **método M**, que va tomando la que más clases nuevas aporta.
- **La validación.** Criterios de Hu *et al.* (2000) con semáforo: **MD%** (medias que difieren, prueba t),
  **VD%** (varianzas, prueba F), **CR%** (rango conservado) y **VR%** (variación relativa), más la cobertura de
  clases cualitativas. La app avisa cuando el núcleo es tan pequeño que las pruebas no tienen potencia, y explica el
  caso frecuente de **VD% alto con VR% alto**: al elegir las accesiones más distintas, el núcleo sale *más* variable
  que la colección, que es justo lo que se busca.

## Qué hace el Bloque 8

El simulador del Bloque 1 seguía una accesión imaginaria; este bloque hace lo mismo con **tus** lotes, usando los
campos de extensión del pasaporte (existencias, última prueba, última regeneración) y las condiciones de tu
instalación:

- **Viabilidad de hoy.** Desde la última prueba y su fecha, la ecuación de Ellis y Roberts proyecta en qué
  porcentaje anda el lote ahora y cuántos años le quedan antes del umbral. **Sin constantes para esa especie no se
  proyecta nada**: la app lo dice y trabaja sólo con la fecha. Las constantes se añaden por taxón, con su fuente.
- **Alertas por lote**, distintas según la ruta: prueba vencida o inexistente, germinación bajo el umbral
  (medida o proyectada), existencias bajas, subcultivo o resiembra atrasados, visita al sitio in situ pendiente y
  accesión sin duplicado de seguridad. Cada una con su antigüedad, para ordenar el trabajo de la temporada, y un
  **plan de trabajo exportable en CSV**.
- **Registrar lo hecho.** Un botón por lote guarda la prueba de germinación (con las semillas que consumió) o la
  regeneración, y actualiza el pasaporte del Bloque 2.
- **Cuántas plantas y cuántas semillas.** La probabilidad de conservar un alelo de frecuencia *p* con *n* plantas es
  1 − (1 − p)^(2n) en una alógama y 1 − (1 − p)^n en una autógama: de ahí sale el número de plantas y, con la
  germinación del lote, las semillas que hay que sembrar.
- **Carga de trabajo a 25 años**: pruebas, regeneraciones y resiembras que caerían cada año con los intervalos
  configurados, para repartir los picos.

**Una proyección no sustituye a una prueba**, y la app lo dice donde se puede leer: la ecuación describe lo que
*debería* pasarle a un lote en esas condiciones, no un secado incompleto, un frasco mal cerrado o un corte de luz.

## Qué hace el Bloque 9

Lo que sale del banco lleva papel. Este bloque imprime ese papel a la medida real, en milímetros, para que lo que se
ve en pantalla sea del tamaño que sale de la impresora:

- **Cinco formatos de etiqueta** con las medidas que se usan en un banco: sobre de semilla (90 × 54 mm), frasco de
  cámara (63 × 29), estaca de campo (95 × 35), criotubo (33 × 13) y etiqueta de envío (100 × 62). Se acomodan en
  rejilla sobre hoja carta o A4, y la app dice cuántas caben y cuántas hojas hacen falta.
- **Código QR o de barras, a elegir.** El QR se genera aquí mismo —modelo 2, modo byte, versiones 1 a 10, los cuatro niveles de corrección, las ocho máscaras con su puntaje y los códigos BCH del formato—, sin biblioteca de terceros. Con **nivel H**, que corrige hasta el 30 % del símbolo, en el centro cabe un **chayote dibujado en vectorial** que tapa menos del 5 %: el código sigue leyéndose. La app dice de cuánto queda cada módulo en el formato elegido y avisa cuando baja de 0.4 mm, que es donde una impresora láser y la cámara de un teléfono empiezan a fallar (pasa en el criotubo, donde conviene el código de barras).
- **Código de barras Code 128 de verdad**, no unas rayas decorativas: la tabla de los 107 símbolos, el juego B para
  texto y el C para tramos largos de dígitos (que ocupan la mitad), el dígito de control (start + Σ posición × valor)
  mod 103 y el patrón de parada. Cualquier lector de laboratorio lo descifra. La suite de pruebas comprueba que todo
  símbolo mida 11 módulos —13 la parada— y **vuelve a leer con un lector propio el código que la app dibuja**.
- **Los campos se eligen**: el número de accesión va siempre y en grande; nombre, especie, sitio, país, fecha,
  altitud, ruta, existencias, germinación y código del instituto se ponen y se quitan, y sólo se imprimen los que
  caben sin invadir la banda del código. En el criotubo, donde no hay espacio, el número no se repite debajo de las
  barras: ya está arriba.
- **Qué se etiqueta**: toda la colección, la colección núcleo del Bloque 7, los lotes en apuros del Bloque 8 o una
  selección hecha a mano, con buscador por número, nombre, especie o sitio.
- **Lista de siembra** para la regeneración, con la germinación de cada lote, las semillas que hay que sembrar para
  el número de plantas que pidas, y las columnas de parcela, fecha y observaciones en blanco para llenarlas en el
  campo; se descarga también en CSV.
- **Vale de distribución** con el solicitante, el uso previsto, la cantidad, la casilla del Sistema Multilateral
  (MLSSTAT) y las dos firmas.
- **Libro de registro** de la colección agrupado por ruta de conservación, con sitio, fecha de ingreso, existencias,
  última germinación y sitio de duplicado.

**Comprueba la primera hoja antes de imprimir cien**: en el diálogo de impresión, escala al 100 % (no «ajustar a la
página») y sin encabezados ni pies; imprime una, mídela con una regla y pásale el lector al código. Y para el campo y
la cámara fría, etiqueta de poliéster o papel resistente al agua, con tinta láser o lápiz: la de inyección se corre
con la condensación.

## Qué hace el Bloque 10

Reúne lo que los nueve bloques anteriores calcularon y lo deja en un documento que se lee solo:

- **Once secciones**: resumen con las cifras y los hallazgos que importan, la colección, calidad de los datos,
  distribución geográfica, diversidad, vacíos de colecta, caracterización y núcleo, manejo del banco, métodos,
  referencias y el anexo con todas las accesiones. Cada una se puede quitar y poner.
- **Sólo aparece lo que se corrió.** Si un bloque no se usó, su sección no sale, sus métodos no se redactan y sus
  referencias no aparecen en la bibliografía. Nada se rellena con supuestos.
- **Métodos en prosa**, con los ajustes que de verdad se usaron —el tamaño de la rejilla, el número de
  permutaciones, el porcentaje del núcleo, los pesos de la prioridad— listos para pegarse en el informe anual o en
  un artículo. Con ellos van sólo las referencias de los métodos empleados.
- **Las figuras van dentro** del archivo, en SVG, con los colores resueltos a literales y en tema claro pase lo que
  pase en la pantalla: el informe es papel.
- **La vista previa es el archivo**. No es un dibujo aproximado: el documento se arma y se muestra dentro de un
  marco, de modo que lo que se ve en pantalla es exactamente lo que se guarda y lo que se imprime. El botón de
  imprimir manda a la impresora el informe solo, sin la aplicación alrededor, y de ahí sale el PDF.
- **Un paquete ZIP** con todo: el informe, el pasaporte en los tres archivos (MCPD, completo y Darwin Core), el
  informe de calidad, el plan de trabajo y cada figura suelta en SVG, más un LEEME que explica qué es cada cosa. El
  ZIP se arma sin bibliotecas de terceros, con el método «store» y su CRC-32 por archivo.

**Los dos idiomas de los datos.** El pasaporte sale en MCPD v2.1, que es como hablan los bancos entre sí, y en
**Darwin Core**, que es como habla GBIF. La traducción no pierde nada: los descriptores con término propio en el
estándar van a su columna (`scientificName`, `decimalLatitude`, `eventDate`, `countryCode`…) y **los que no tienen
dónde ir viajan en `dynamicProperties`** con su nombre de origen (`mcpd:SAMPSTAT`, `mcpd:STORAGE`, `mcpd:GP_STOCK`…).
Entre las dos partes está el pasaporte completo, y la suite de pruebas comprueba justo eso: que ningún campo se
quede fuera. Dos decisiones que conviene conocer: una accesión ex situ se declara `LivingSpecimen` y un registro in
situ `HumanObservation`, porque es una población observada en su sitio y no un ejemplar en una cámara; y lo
silvestre deja vacío `degreeOfEstablishment`, porque el vocabulario de Darwin Core no tiene un valor para eso y el
código SAMPSTAT completo viaja aparte.

**Un informe no vuelve buenos unos datos flojos.** Si el Bloque 3 dejó coordenadas sin arreglar o duplicados sin
revisar, el informe los arrastra tal cual: las cifras se calculan sobre lo que hay, no sobre lo que debería haber.

## Qué corre dónde

Todo se calcula y se dibuja en el navegador con JavaScript simple: no hay servidor, no se sube nada y nada de lo
que haces sale de tu computadora. No usa bibliotecas de terceros; las figuras y las ilustraciones las genera el
propio código en SVG. La interfaz está en español e inglés, con tema claro y oscuro.

## Referencias

- Ellis, R.H. y Roberts, E.H. (1980). Improved equations for the prediction of seed longevity. *Annals of Botany* 45(1): 13–30.
- FAO (2014). *Genebank standards for plant genetic resources for food and agriculture*. Roma.
- Alercia, A., Diulgheroff, S. y Mackay, M. (2015). *FAO/Bioversity multi-crop passport descriptors V.2.1*. Bioversity International y FAO.
- Engels, J.M.M. y Ebert, A.W. (2021). A critical review of the current global ex situ conservation system for plant agrobiodiversity. *Plants* 10(9): 1904.
- Maxted, N., Dulloo, M.E. y Ford-Lloyd, B.V. (eds.) (2016). *Enhancing crop genepool use*. CABI.
- Gower, J.C. (1971). A general coefficient of similarity and some of its properties. *Biometrics* 27(4): 857–871.
- Brown, A.H.D. (1989). Core collections: a practical approach to genetic resources management. *Genome* 31(2): 818–824.
- Hu, J., Zhu, J. y Xu, H.M. (2000). Methods of constructing core collections by stepwise clustering. *Theoretical and Applied Genetics* 101: 264–268.
- Ramírez-Villegas, J., Khoury, C., Jarvis, A., Debouck, D.G. y Guarino, L. (2010). A gap analysis methodology for collecting crop genepools. *PLoS ONE* 5(10): e13497.
- Royal Botanic Gardens Kew. *Seed Information Database (SID)*.
- Hurlbert, S.H. (1971). The nonconcept of species diversity. *Ecology* 52(4): 577–586.
- Chao, A. (1984). Nonparametric estimation of the number of classes in a population. *Scandinavian Journal of Statistics* 11: 265–270.
- Jost, L. (2006). Entropy and diversity. *Oikos* 113(2): 363–375. (los números de Hill)
- Wieczorek, J., Bloom, D., Guralnick, R., Blum, S., Döring, M., Giovanni, R., Robertson, T. y Vieglais, D. (2012). Darwin Core: an evolving community-developed biodiversity data standard. *PLoS ONE* 7(1): e29715.
- ISO/IEC 15417:2007. *Information technology — Automatic identification and data capture techniques — Code 128 bar code symbology specification*.
- Natural Earth (dominio público, naturalearthdata.com): contornos admin-1 de México a 1:10 millones y admin-0 del mundo a 1:110 millones.

## English summary

**GermplasmPro** is a self-contained browser application for the daily work of a plant genetic resources
collection, **for any species and any conservation route**: seed bank, field genebank or living collection,
slow-growth in vitro culture, cryopreservation, and in-situ or on-farm conservation. It covers MCPD v2.1 passport
data, duplicate control, offline collecting maps, geographic diversity mining and gap analysis, plus stocks,
germination, regeneration, subcultures, cryovials, labels and reports. It is built block by block. Block 1 (home
page and the "life of an accession" simulator, combining the material clock of each route with genetic drift at
every bottleneck) and Block 2 (passport data: import with automatic column recognition, the 42 MCPD v2.1
descriptors plus 7 extension fields for in-situ and management data, field-by-field and cross-field validation, an
editable table, the full record of each accession, the portrait of the collection and MCPD export) and Block 3 (quality control and duplicates: coordinates checked against the declared country with a diagnosis and a proposed fix, name and catalogue consistency, and blocked, score-based duplicate detection with side-by-side comparison and merging) and Block 4 (the collecting map: Mexico with its 32 states and the world by countries, drawn offline from bundled Natural Earth outlines, with point colouring by any descriptor, choropleths, a grid, a scale bar and SVG/PNG export) and Block 5 (geographic diversity: richness and the classic indices per state, country, grid cell or elevation belt, Hurlbert rarefaction to a common effort, Chao1/Chao2/jackknife estimators with a warning when Chao1 is unreliable, compositional heat map with UPGMA clustering, and a Mantel test against geographic distance) and Block 6 (collecting gaps: empty cells and distance to the nearest collection, a transparent priority index with adjustable weights, at-risk types, empty elevation belts and a complementarity-based minimum set) and Block 7 (characterization and core collection: mixed traits with missing data, Gower distance, PCoA, Ward or UPGMA clustering with silhouette, core building by strata or method M, and validation against the Hu et al. criteria) and Block 8 (running the genebank: viability projected lot by lot from your own conditions and constants, work alerts by conservation route, an exportable work plan, sample-size calculators for regeneration and a 25-year workload) and Block 9 (labels and register: five millimetre-accurate label formats —seed envelope, cold-store jar, field stake, cryovial and shipping label— laid out on Letter or A4 sheets, with a genuine Code 128 barcode that the test suite reads back with its own decoder, selectable fields, a hand-picked selection, and the sowing list, delivery note and register book) and Block 10 (the report: a standalone HTML document with the figures embedded and the methods written out in prose, only for the analyses actually run, printable to PDF, plus a ZIP package with data and figures and passport export in both MCPD v2.1 and Darwin Core, where descriptors with no Darwin Core term travel in dynamicProperties so that nothing is lost) are ready. **The application is complete.** Everything runs locally, in Spanish and English, with light and dark themes. Open
`index.html` by double-clicking it, or run `server.ps1` for `http://localhost:9600`. Tests: `tests/index.html`.
