/* GermplasmPro — el motor del Bloque 10: el informe de la colección.

   Junta lo que cada bloque calculó —y sólo eso: lo que no se corrió no se
   inventa— y arma un documento que se lee solo, con sus cifras, sus figuras y
   los métodos redactados en prosa, listos para pegarse en el informe anual o
   en un artículo. Las referencias que salen son únicamente las de los métodos
   que de verdad se usaron.

   También exporta el pasaporte en los dos idiomas de los datos: MCPD v2.1,
   que es como hablan los bancos entre sí, y Darwin Core, que es como habla
   GBIF. Lo que MCPD guarda y Darwin Core no tiene dónde poner viaja en
   `dynamicProperties`, con su nombre original, en vez de perderse. */

(function () {

  /* ================= secciones del informe ================= */
  const SECTIONS = [
    { id: 'summary', es: 'Resumen', en: 'Summary', always: true },
    { id: 'passport', es: 'La colección', en: 'The collection', always: true },
    { id: 'quality', es: 'Calidad de los datos', en: 'Data quality' },
    { id: 'map', es: 'Distribución geográfica', en: 'Geographic distribution' },
    { id: 'diversity', es: 'Diversidad geográfica', en: 'Geographic diversity' },
    { id: 'gaps', es: 'Vacíos de colecta', en: 'Collecting gaps' },
    { id: 'charac', es: 'Caracterización y núcleo', en: 'Characterization and core' },
    { id: 'manage', es: 'Manejo del banco', en: 'Genebank management' },
    { id: 'methods', es: 'Métodos', en: 'Methods', always: true },
    { id: 'refs', es: 'Referencias', en: 'References', always: true },
    { id: 'annex', es: 'Anexo: las accesiones', en: 'Annex: the accessions' },
  ];

  /* ================= figuras ================= */
  /* Las figuras del informe salen con los colores del tema claro, porque el
     informe es papel: se genera en claro pase lo que pase en la pantalla. */
  function inLight(fn) {
    const root = document.documentElement;
    const prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
    try { return fn(); } finally {
      if (prev === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', prev);
    }
  }

  /* un SVG que sale de la app puede traer var(--algo); fuera de la app eso no
     existe, así que se sustituye por el color literal */
  let varCache = {}, varTheme = null;
  function cssValue(name) {
    const th = document.documentElement.getAttribute('data-theme') || 'auto';
    if (th !== varTheme) { varCache = {}; varTheme = th; }
    if (!(name in varCache)) {
      varCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
    return varCache[name];
  }
  function resolveVars(svg) {
    if (!svg) return '';
    return String(svg).replace(/var\((--[a-zA-Z0-9-]+)(?:\s*,\s*([^)]+))?\)/g,
      (m, name, alt) => cssValue(name) || (alt ? alt.trim() : '#888'));
  }

  /* llama a la función de dibujo de un bloque sin que un tropiezo tire todo */
  function figure(fn, W, H) {
    try {
      const out = fn(W, H);
      const svg = out && out.svg ? out.svg : out;
      if (typeof svg !== 'string' || svg.indexOf('<svg') < 0) return '';
      return resolveVars(svg);
    } catch (e) { return ''; }
  }

  /* ================= Darwin Core ================= */
  /* Términos del estándar; los de MCPD que no tienen dónde ir se guardan en
     dynamicProperties con su nombre original (mcpd:CAMPO). */
  const DWC_COLUMNS = [
    'occurrenceID', 'basisOfRecord', 'institutionCode', 'collectionCode', 'catalogNumber',
    'otherCatalogNumbers', 'fieldNumber', 'recordedBy', 'eventDate', 'year', 'month', 'day',
    'scientificName', 'genus', 'specificEpithet', 'infraspecificEpithet', 'scientificNameAuthorship',
    'vernacularName', 'country', 'countryCode', 'locality', 'decimalLatitude', 'decimalLongitude',
    'geodeticDatum', 'coordinateUncertaintyInMeters', 'georeferenceProtocol',
    'minimumElevationInMeters', 'maximumElevationInMeters', 'samplingProtocol',
    'degreeOfEstablishment', 'preparations', 'occurrenceRemarks', 'dynamicProperties',
  ];
  /* los descriptores MCPD que sí tienen término propio en Darwin Core */
  const DWC_MAPPED = ['INSTCODE', 'ACCENUMB', 'OTHERNUMB', 'COLLNUMB', 'COLLDATE', 'GENUS', 'SPECIES',
    'SUBTAXA', 'SPAUTHOR', 'CROPNAME', 'ORIGCTY', 'COLLSITE', 'DECLATITUDE', 'DECLONGITUDE',
    'COORDUNCERT', 'GEOREFMETH', 'ELEVATION', 'COLLSRC', 'REMARKS'];
  /* y los que no lo tienen, que viajan en dynamicProperties con su nombre de
     origen en vez de perderse: entre los dos arreglos está TODO el pasaporte,
     y la suite de pruebas comprueba justo eso */
  const DWC_LEFTOVER = ['ACCENAME', 'SAMPSTAT', 'STORAGE', 'MLSSTAT', 'DUPLSITE', 'DUPLINSTNAME', 'ANCEST',
    'ACQDATE', 'BREDCODE', 'BREDNAME', 'DONORCODE', 'DONORNAME', 'DONORNUMB', 'ACCEURL',
    'COLLCODE', 'COLLNAME', 'COLLINSTADDRESS', 'COLLMISSID', 'PUID',
    'COORDDATUM', 'LATITUDE', 'LONGITUDE', 'SUBTAUTHOR',
    'GP_CONS', 'GP_SITEID', 'GP_KEEPER', 'GP_STOCK', 'GP_GERMPCT', 'GP_GERMDATE', 'GP_REGENDATE'];

  function isoDate(s) {
    const v = String(s || '').replace(/-/g, '');
    if (/^\d{8}$/.test(v) && v.slice(4) !== '0000') return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
    if (/^\d{6}/.test(v) && v.slice(4, 6) !== '00') return `${v.slice(0, 4)}-${v.slice(4, 6)}`;
    if (/^\d{4}/.test(v)) return v.slice(0, 4);
    return '';
  }

  function dwcRow(row) {
    const route = MCPD.consRoute(row);
    const inSitu = route === 'insitu' || route === 'onfarm';
    const d = String(row.COLLDATE || '').replace(/-/g, '');
    const st = String(row.SAMPSTAT || '');
    const stNum = Number(st);
    const cty = MCPD.COUNTRY_MAP[row.ORIGCTY];
    const gr = MCPD.GEOREFMETH.find(x => x.c === String(row.GEOREFMETH || ''));
    const src = MCPD.COLLSRC.find(x => x.c === String(row.COLLSRC || ''));
    const cons = MCPD.GPCONS.find(x => x.c === route);
    const extra = {};
    DWC_LEFTOVER.forEach(k => { if (String(row[k] ?? '').trim() !== '') extra['mcpd:' + k] = String(row[k]); });
    const inst = String(row.INSTCODE || '').trim();
    return {
      occurrenceID: (inst ? inst + ':' : '') + String(row.ACCENUMB || ''),
      /* el material ex situ es un ejemplar vivo bajo custodia; un registro in
         situ es una población observada en su sitio, no un ejemplar en una
         cámara, y por eso no se declaran igual */
      basisOfRecord: inSitu ? 'HumanObservation' : 'LivingSpecimen',
      institutionCode: inst,
      collectionCode: 'germplasm',
      catalogNumber: String(row.ACCENUMB || ''),
      otherCatalogNumbers: String(row.OTHERNUMB || ''),
      fieldNumber: String(row.COLLNUMB || ''),
      recordedBy: String(row.COLLNAME || row.COLLCODE || ''),
      eventDate: isoDate(d),
      year: /^\d{4}/.test(d) ? d.slice(0, 4) : '',
      month: /^\d{6}/.test(d) && d.slice(4, 6) !== '00' ? String(Number(d.slice(4, 6))) : '',
      day: /^\d{8}/.test(d) && d.slice(6, 8) !== '00' ? String(Number(d.slice(6, 8))) : '',
      scientificName: [row.GENUS, row.SPECIES, row.SUBTAXA].filter(Boolean).join(' '),
      genus: String(row.GENUS || ''),
      specificEpithet: String(row.SPECIES || ''),
      infraspecificEpithet: String(row.SUBTAXA || ''),
      scientificNameAuthorship: String(row.SPAUTHOR || ''),
      vernacularName: String(row.CROPNAME || row.ACCENAME || ''),
      country: cty ? cty.es : '',
      countryCode: cty && GEO.A3_TO_A2 ? (GEO.A3_TO_A2[String(row.ORIGCTY || '').toUpperCase()] || '') : '',
      locality: String(row.COLLSITE || ''),
      decimalLatitude: String(row.DECLATITUDE ?? ''),
      decimalLongitude: String(row.DECLONGITUDE ?? ''),
      geodeticDatum: row.DECLATITUDE === '' || row.DECLATITUDE == null ? '' : 'EPSG:4326',
      coordinateUncertaintyInMeters: String(row.COORDUNCERT || ''),
      georeferenceProtocol: gr ? gr.es : '',
      minimumElevationInMeters: String(row.ELEVATION || ''),
      maximumElevationInMeters: String(row.ELEVATION || ''),
      samplingProtocol: src ? src.es : '',
      /* «cultivated» es un valor del vocabulario de Darwin Core; lo silvestre
         no tiene término propio, así que se deja vacío y el código SAMPSTAT
         completo viaja en dynamicProperties */
      degreeOfEstablishment: stNum >= 300 && stNum < 600 ? 'cultivated' : '',
      preparations: cons ? cons.es : '',
      occurrenceRemarks: String(row.REMARKS || ''),
      dynamicProperties: Object.keys(extra).length ? JSON.stringify(extra) : '',
    };
  }
  function darwinCore(rows) { return (rows || []).map(dwcRow); }

  /* ================= juntar lo que hay ================= */
  function gather(opts) {
    const o = Object.assign({ run: true }, opts || {});
    const rows = state.acc || [];
    const D = {
      date: new Date(),
      n: rows.length,
      rows,
      summary: rows.length ? MCPD.summarize(rows) : null,
      completeness: rows.length ? MCPD.completeness(rows) : [],
      issues: state.issues || [],
    };
    if (!rows.length) return D;

    /* calidad: se calcula aquí mismo, sin depender de que el bloque esté abierto */
    try {
      const ui = window.B3 && B3.ui ? B3.ui : {};
      D.quality = QC.audit(rows, { threshold: ui.threshold, dismissed: ui.dismissed });
    } catch (e) { D.quality = null; }

    if (o.run) {
      try { if (window.B5) D.diversity = B5.run(); } catch (e) { D.diversity = null; }
      try { if (window.B6) D.gaps = B6.run(); } catch (e) { D.gaps = null; }
      try { if (window.B8) D.manage = B8.run(); } catch (e) { D.manage = null; }
      try { if (window.B7 && (state.traits || []).length) D.charac = B7.run(); } catch (e) { D.charac = null; }
    } else {
      D.diversity = window.B5 ? B5.analysis() : null;
      D.gaps = window.B6 ? B6.analysis() : null;
      D.manage = window.B8 ? B8.analysis() : null;
      D.charac = window.B7 ? B7.analysis() : null;
    }
    D.hasMap = !!(window.B4 && window.GEO);
    D.traits = (state.traits || []).length;
    return D;
  }

  /* ================= métodos redactados ================= */
  /* Un párrafo por análisis que de verdad se corrió, con los ajustes que se
     usaron. Lo que no se corrió no aparece. */
  function methods(D, lang) {
    const L = (es, en) => (lang === 'en' ? en : es);
    const out = [];
    const nm = n => String(n);

    out.push({
      id: 'data', title: L('Datos de pasaporte', 'Passport data'),
      text: L(
        `La colección se describió con los descriptores multicultivo de pasaporte MCPD v2.1 (Alercia et al., 2015), ampliados con siete campos propios para lo que el estándar, pensado para bancos ex situ, no cubre: la ruta de conservación activa, el sitio in situ, la persona custodia, las existencias y las fechas de la última germinación y la última regeneración. Se registraron ${nm(D.n)} accesiones. Cada valor se validó contra la lista de códigos de su descriptor y, además, contra los demás campos del mismo registro (fechas coherentes entre sí, coordenadas dentro del país declarado, almacenamiento compatible con la ruta).`,
        `The collection was described with the FAO/Bioversity multi-crop passport descriptors MCPD v2.1 (Alercia et al., 2015), extended with seven local fields for what the standard, written for ex-situ banks, does not cover: the active conservation route, the in-situ site, the keeper, the stock and the dates of the last germination test and the last regeneration. ${nm(D.n)} accessions were recorded. Every value was validated against its descriptor's code list and against the rest of the record (dates consistent with one another, coordinates inside the declared country, storage compatible with the route).`),
    });

    if (D.quality) {
      const nd = D.quality.dup && D.quality.dup.pairs ? D.quality.dup.pairs.length : 0;
      out.push({
        id: 'quality', title: L('Control de calidad y duplicados', 'Quality control and duplicates'),
        text: L(
          `Las coordenadas se contrastaron con la caja envolvente del país declarado para detectar las tres equivocaciones clásicas —longitud sin signo, latitud invertida y latitud y longitud intercambiadas—, cada una con su corrección propuesta, que sólo se aplicó tras revisarla. Los nombres científicos y los sitios se revisaron con distancia de Levenshtein para agrupar variantes de escritura. Los duplicados se buscaron con un esquema de bloqueo (número de colecta, números de donante, prefijo del nombre, celda de medio grado y taxón con fecha) y se puntuaron con una combinación ponderada de similitud de nombres por Jaro-Winkler (Winkler, 1990), distancia geográfica por la fórmula del semiverseno y coincidencia de números y fechas; los pares por encima del umbral se revisaron uno por uno. Se examinaron ${nm(nd)} pares candidatos.`,
          `Coordinates were checked against the bounding box of the declared country to detect the three classic mistakes —unsigned longitude, flipped latitude and latitude and longitude swapped—, each with a proposed fix that was applied only after review. Scientific names and site names were screened with Levenshtein distance to group spelling variants. Duplicates were searched with a blocking scheme (collecting number, donor numbers, name prefix, half-degree cell and taxon with date) and scored with a weighted combination of Jaro-Winkler name similarity (Winkler, 1990), haversine geographic distance and agreement of numbers and dates; pairs above the threshold were reviewed one by one. ${nm(nd)} candidate pairs were examined.`),
      });
    }

    if (D.hasMap) {
      out.push({
        id: 'map', title: L('Cartografía', 'Cartography'),
        text: L(
          'Los mapas se dibujaron sin conexión a internet, con los contornos de dominio público de Natural Earth incluidos en la aplicación (admin-1 de México a 1:10 millones y admin-0 del mundo a 1:110 millones), en proyección equirrectangular con corrección por el coseno de la latitud. La entidad y el país de cada accesión se asignaron por inclusión del punto en el polígono, no por el texto del campo correspondiente, de modo que el mapa delata las coordenadas que no concuerdan con lo declarado.',
          'Maps were drawn offline from the public-domain Natural Earth outlines bundled with the application (Mexican admin-1 at 1:10 million and world admin-0 at 1:110 million), in an equirectangular projection corrected by the cosine of the latitude. The state and country of each accession were assigned by point-in-polygon, not from the text of the corresponding field, so that the map exposes coordinates that disagree with what was declared.'),
      });
    }

    if (D.diversity) {
      const A = D.diversity;
      const unit = { state: L('entidad federativa', 'state'), country: L('país', 'country'), cell: L('celda de la rejilla', 'grid cell'), band: L('franja altitudinal', 'elevation belt') }[A.unitMode] || A.unitMode;
      const cls = { species: L('especie', 'species'), crop: L('cultivo', 'crop'), genus: L('género', 'genus'), name: L('nombre de accesión', 'accession name') }[A.classMode] || A.classMode;
      out.push({
        id: 'diversity', title: L('Diversidad geográfica', 'Geographic diversity'),
        text: L(
          `Las accesiones se agruparon por ${unit} y se contó la diversidad de ${cls}. Para cada unidad se calcularon la riqueza observada, el índice de Shannon, el de Gini-Simpson, la equidad de Pielou y los números de Hill de orden 0, 1 y 2 (Jost, 2006). Como el número de accesiones cambia mucho de una unidad a otra, y la riqueza crece con el esfuerzo, la comparación se hizo sobre la riqueza rarefactada de Hurlbert (1971) a un esfuerzo común, con la varianza de Heck et al. (1975). Lo que falta por colectar se estimó con Chao1 (Chao, 1984), Chao2 y los estimadores de navaja de primer y segundo orden, y la cobertura del muestreo con el estimador de Good-Turing. La composición entre unidades se comparó con los índices de Jaccard, Sørensen y Bray-Curtis, se ordenó con agrupamiento UPGMA y se contrastó con la distancia geográfica mediante una prueba de Mantel con ${nm((A.opts && A.opts.perms) || 999)} permutaciones.`,
          `Accessions were grouped by ${unit} and the diversity of ${cls} was counted. For each unit we computed observed richness, the Shannon index, the Gini-Simpson index, Pielou's evenness and Hill numbers of order 0, 1 and 2 (Jost, 2006). Because the number of accessions differs greatly between units, and richness grows with effort, comparisons were made on Hurlbert (1971) rarefied richness at a common effort, with the variance of Heck et al. (1975). What remains to be collected was estimated with Chao1 (Chao, 1984), Chao2 and first- and second-order jackknife estimators, and sampling coverage with the Good-Turing estimator. Composition between units was compared with the Jaccard, Sørensen and Bray-Curtis indices, ordered with UPGMA clustering and contrasted against geographic distance with a Mantel test using ${nm((A.opts && A.opts.perms) || 999)} permutations.`),
      });
    }

    if (D.gaps) {
      const G = D.gaps;
      const w = (G.opts && G.opts.weights) || GAPS.DEFAULT_WEIGHTS;
      out.push({
        id: 'gaps', title: L('Vacíos de colecta', 'Collecting gaps'),
        text: L(
          `El territorio se dividió en una rejilla de ${nm((G.opts && G.opts.size) || 1)}° y se marcaron las celdas con y sin accesiones. Para cada celda vacía se midió la distancia al punto colectado más cercano y se calculó un índice de prioridad con cuatro componentes explícitos y pesos ajustables —lejanía (${nm(w.distance)}), riqueza del vecindario (${nm(w.richness)}), déficit de la entidad (${nm(w.state)}) y tipos exclusivos cercanos (${nm(w.exclusive)})—, de modo que cada renglón del resultado enseña de dónde sale su número. El conjunto mínimo de sitios que recogería todos los tipos presentes se obtuvo por complementariedad voraz. Conviene decir qué NO es esto: un análisis geográfico y de composición de la colección, en la línea de Ramírez-Villegas et al. (2010) pero sin su componente ecogeográfico, que exigiría capas ambientales que esta aplicación no incluye ni descarga.`,
          `The territory was divided into a ${nm((G.opts && G.opts.size) || 1)}° grid and cells with and without accessions were mapped. For every empty cell we measured the distance to the nearest collected point and computed a priority index from four explicit, adjustable components —remoteness (${nm(w.distance)}), neighbourhood richness (${nm(w.richness)}), state deficit (${nm(w.state)}) and nearby exclusive types (${nm(w.exclusive)})—, so that each row of the result shows where its number comes from. The minimum set of sites that would capture every type present was obtained by greedy complementarity. It is worth saying what this is NOT: it is a geographic and collection-composition analysis, in the spirit of Ramírez-Villegas et al. (2010) but without their ecogeographic component, which would require environmental layers that this application neither bundles nor downloads.`),
      });
    }

    if (D.charac) {
      const A = D.charac;
      const core = A.core || {};
      out.push({
        id: 'charac', title: L('Caracterización y colección núcleo', 'Characterization and core collection'),
        text: L(
          `Se caracterizaron ${nm(A.pairs ? A.pairs.length : 0)} accesiones con ${nm(A.used ? A.used.length : 0)} descriptores de tipo mixto (cuantitativos, ordinales y cualitativos). La distancia entre accesiones se calculó con el coeficiente general de similitud de Gower (1971), que admite datos faltantes y mezcla tipos de variable, y se ordenó por análisis de coordenadas principales. El agrupamiento se hizo por el método de Ward (criterio D2) y el número de grupos se eligió con el ancho de silueta. La colección núcleo se construyó reteniendo el ${nm(core.pct || 10)} % de las accesiones repartidas entre estratos según los criterios de Brown (1989), y se validó con los indicadores de Hu et al. (2000): porcentaje de medias distintas (MD%), de varianzas distintas (VD%), razón de amplitudes (CR%) y razón de coeficientes de variación (VR%), con pruebas t de Welch y F por descriptor.`,
          `${nm(A.pairs ? A.pairs.length : 0)} accessions were characterized with ${nm(A.used ? A.used.length : 0)} mixed-type descriptors (quantitative, ordinal and qualitative). Distances between accessions were computed with Gower's (1971) general coefficient of similarity, which admits missing data and mixes variable types, and were ordered by principal coordinates analysis. Clustering used Ward's method (D2 criterion) and the number of groups was chosen by silhouette width. The core collection retained ${nm(core.pct || 10)} % of the accessions allocated among strata following Brown (1989), and was validated with the indicators of Hu et al. (2000): percentage of significantly different means (MD%), of different variances (VD%), the coincidence rate of ranges (CR%) and the variable rate of coefficients of variation (VR%), using per-descriptor Welch t and F tests.`),
      });
    }

    if (D.manage) {
      out.push({
        id: 'manage', title: L('Viabilidad y manejo', 'Viability and management'),
        text: L(
          'La viabilidad de cada lote de semilla se proyectó con la ecuación mejorada de longevidad de Ellis y Roberts (1980), v = K_i − p/σ, con log σ = K_E − C_W·log₁₀ m − C_H·t − C_Q·t², usando el contenido de humedad y la temperatura de la instalación y las constantes publicadas de la especie. En los taxones sin constantes publicadas no se proyectó nada: se informó únicamente la fecha de la última prueba. El número de plantas necesario para conservar un alelo de frecuencia p se calculó como 1 − (1 − p)^(2n) en especies alógamas y 1 − (1 − p)^n en autógamas, y de ahí, con la germinación del lote, las semillas que hay que sembrar. Ninguna proyección sustituye a una prueba de germinación, y así se declara en la aplicación.',
          "Seed lot viability was projected with the improved longevity equation of Ellis and Roberts (1980), v = K_i − p/σ, with log σ = K_E − C_W·log₁₀ m − C_H·t − C_Q·t², using the moisture content and temperature of the facility and the published constants for the species. For taxa without published constants nothing was projected: only the date of the last test was reported. The number of plants needed to retain an allele of frequency p was computed as 1 − (1 − p)^(2n) for outcrossing species and 1 − (1 − p)^n for selfing species, and from that, with the lot's germination, the seeds to sow. No projection replaces a germination test, and the application says so."),
      });
    }

    out.push({
      id: 'software', title: L('Programa', 'Software'),
      text: L(
        'Todos los cálculos y todas las figuras se hicieron con GermplasmPro, una aplicación que corre entera en el navegador, sin servidor y sin bibliotecas de terceros: ningún dato de la colección sale de la computadora donde se trabaja.',
        'All computations and figures were produced with GermplasmPro, an application that runs entirely in the browser, with no server and no third-party libraries: no collection data leaves the computer where the work is done.'),
    });
    return out;
  }

  /* ================= referencias ================= */
  const REFS = {
    mcpd: 'Alercia, A., Diulgheroff, S. y Mackay, M. (2015). <i>FAO/Bioversity multi-crop passport descriptors V.2.1</i>. Bioversity International y FAO.',
    fao: 'FAO (2014). <i>Genebank standards for plant genetic resources for food and agriculture</i>. Roma.',
    winkler: 'Winkler, W.E. (1990). String comparator metrics and enhanced decision rules in the Fellegi-Sunter model of record linkage. <i>Proceedings of the Section on Survey Research Methods</i>, American Statistical Association, 354–359.',
    ne: 'Natural Earth (dominio público, naturalearthdata.com): contornos admin-1 de México a 1:10 millones y admin-0 del mundo a 1:110 millones.',
    hurlbert: 'Hurlbert, S.H. (1971). The nonconcept of species diversity: a critique and alternative parameters. <i>Ecology</i> 52(4): 577–586.',
    heck: 'Heck, K.L., van Belle, G. y Simberloff, D. (1975). Explicit calculation of the rarefaction diversity measurement. <i>Ecology</i> 56(6): 1459–1461.',
    chao: 'Chao, A. (1984). Nonparametric estimation of the number of classes in a population. <i>Scandinavian Journal of Statistics</i> 11: 265–270.',
    jost: 'Jost, L. (2006). Entropy and diversity. <i>Oikos</i> 113(2): 363–375.',
    mantel: 'Mantel, N. (1967). The detection of disease clustering and a generalized regression approach. <i>Cancer Research</i> 27(2): 209–220.',
    gap: 'Ramírez-Villegas, J., Khoury, C., Jarvis, A., Debouck, D.G. y Guarino, L. (2010). A gap analysis methodology for collecting crop genepools. <i>PLoS ONE</i> 5(10): e13497.',
    gower: 'Gower, J.C. (1971). A general coefficient of similarity and some of its properties. <i>Biometrics</i> 27(4): 857–871.',
    ward: 'Murtagh, F. y Legendre, P. (2014). Ward’s hierarchical agglomerative clustering method: which algorithms implement Ward’s criterion? <i>Journal of Classification</i> 31: 274–295.',
    brown: 'Brown, A.H.D. (1989). Core collections: a practical approach to genetic resources management. <i>Genome</i> 31(2): 818–824.',
    hu: 'Hu, J., Zhu, J. y Xu, H.M. (2000). Methods of constructing core collections by stepwise clustering with three sampling strategies. <i>Theoretical and Applied Genetics</i> 101: 264–268.',
    ellis: 'Ellis, R.H. y Roberts, E.H. (1980). Improved equations for the prediction of seed longevity. <i>Annals of Botany</i> 45(1): 13–30.',
    kew: 'Royal Botanic Gardens Kew. <i>Seed Information Database (SID)</i>.',
    dwc: 'Wieczorek, J., Bloom, D., Guralnick, R., Blum, S., Döring, M., Giovanni, R., Robertson, T. y Vieglais, D. (2012). Darwin Core: an evolving community-developed biodiversity data standard. <i>PLoS ONE</i> 7(1): e29715.',
  };
  function references(D, withDwc) {
    const ids = ['mcpd', 'fao'];
    if (D.quality) ids.push('winkler');
    if (D.hasMap) ids.push('ne');
    if (D.diversity) ids.push('hurlbert', 'heck', 'chao', 'jost', 'mantel');
    if (D.gaps) ids.push('gap');
    if (D.charac) ids.push('gower', 'ward', 'brown', 'hu');
    if (D.manage) ids.push('ellis', 'kew');
    if (withDwc) ids.push('dwc');
    return [...new Set(ids)].map(k => REFS[k]).sort((a, b) => a.localeCompare(b, 'es'));
  }


  /* ================= las secciones, una por una ================= */
  /* Cada sección devuelve HTML que sirve igual para la vista previa dentro de
     la app y para el archivo suelto que se descarga. */

  function esc2(s) { return esc(String(s == null ? '' : s)); }
  function tbl(head, rows, opts) {
    const o = opts || {};
    if (!rows.length) return '';
    return `<table class="rt"><thead><tr>${head.map((h, i) => `<th${o.num && o.num.includes(i) ? ' class="num"' : ''}>${esc2(h)}</th>`).join('')}</tr></thead><tbody>${
      rows.map(r => `<tr>${r.map((c, i) => `<td${o.num && o.num.includes(i) ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function stats(items) {
    return `<div class="rstats">${items.filter(Boolean).map(([v, l]) => `<div class="rstat"><b>${v}</b><span>${esc2(l)}</span></div>`).join('')}</div>`;
  }
  function topOf(map, n) {
    return [...(map instanceof Map ? map.entries() : Object.entries(map || {}))]
      .sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  function sections(D, lang, opts) {
    const o = Object.assign({ figures: true, annex: true, width: 760 }, opts || {});
    const L = (es, en) => (lang === 'en' ? en : es);
    const W = o.width, out = [];
    const fig = (svg, caption) => svg
      ? `<figure class="rfig">${svg}<figcaption>${esc2(caption)}</figcaption></figure>`
      : '';
    const S = D.summary;

    /* ---------- resumen ---------- */
    /* Los hallazgos se cuentan, y contar obliga a concordar: «1 accesión no
       tiene coordenadas», no «1 accesiones no tienen». */
    const pl = (n, uno, varios) => (n === 1 ? uno : varios).replace('#', fmtInt(n));
    const hallazgos = [];
    if (D.quality) {
      const ng = D.quality.geo.filter(p => p.level === 'bad').length;
      const nd = D.quality.dup.pairs.length;
      if (ng) hallazgos.push(L(
        pl(ng, '# coordenada no concuerda con el país declarado, y trae corrección propuesta.', '# coordenadas no concuerdan con el país declarado, y traen corrección propuesta.'),
        pl(ng, '# coordinate disagrees with the declared country, and comes with a proposed fix.', '# coordinates disagree with the declared country, and come with a proposed fix.')));
      if (nd) hallazgos.push(L(
        pl(nd, '# par de accesiones se parece lo bastante como para revisarlo por duplicado.', '# pares de accesiones se parecen lo bastante como para revisarlos por duplicado.'),
        pl(nd, '# accession pair is similar enough to be reviewed as a duplicate.', '# accession pairs are similar enough to be reviewed as duplicates.')));
    }
    if (S && S.n) {
      const sinCoord = S.n - S.withCoords;
      if (sinCoord) hallazgos.push(L(
        pl(sinCoord, '# accesión no tiene coordenadas, y por eso no entra en los mapas ni en el análisis de vacíos.', '# accesiones no tienen coordenadas, y por eso no entran en los mapas ni en el análisis de vacíos.'),
        pl(sinCoord, '# accession has no coordinates, so it is absent from the maps and from the gap analysis.', '# accessions have no coordinates, so they are absent from the maps and from the gap analysis.')));
      const sinDup = S.n - S.withDupl;
      if (sinDup) hallazgos.push(L(
        pl(sinDup, '# accesión no tiene duplicado de seguridad en otra institución.', '# accesiones no tienen duplicado de seguridad en otra institución.'),
        pl(sinDup, '# accession has no safety duplicate in another institution.', '# accessions have no safety duplicate in another institution.')));
    }
    if (D.manage) {
      const crit = D.manage.lots.filter(l => l.st.levelName === 'crit').length;
      if (crit) hallazgos.push(L(
        pl(crit, '# lote tiene al menos una alerta crítica de manejo.', '# lotes tienen al menos una alerta crítica de manejo.'),
        pl(crit, '# lot has at least one critical management alert.', '# lots have at least one critical management alert.')));
    }
    if (D.gaps) hallazgos.push(L(`La colecta cubre el ${fmt(D.gaps.coverage, 1)} % de las celdas del territorio analizado.`,
      `Collecting covers ${fmt(D.gaps.coverage, 1)} % of the cells of the analysed territory.`));

    out.push({
      id: 'summary', title: L('Resumen', 'Summary'),
      html: `${stats([
        [fmtInt(D.n), L('accesiones', 'accessions')],
        S ? [fmtInt(S.taxa.length), L('taxones', 'taxa')] : null,
        S ? [fmtInt(S.countries.length), L('países de origen', 'countries of origin')] : null,
        S ? [fmtInt(S.routes.length), L('rutas de conservación', 'conservation routes')] : null,
        S ? [fmtInt(S.withCoords), L('con coordenadas', 'with coordinates')] : null,
        S ? [fmtInt(S.withDupl), L('con duplicado', 'with a safety duplicate')] : null,
      ])}
      ${hallazgos.length ? `<ul class="rlist">${hallazgos.map(h => `<li>${esc2(h)}</li>`).join('')}</ul>` : ''}`,
    });

    /* ---------- la colección ---------- */
    if (S) {
      const routeName = c => { const h = MCPD.GPCONS.find(x => x.c === c); return h ? (lang === 'en' ? h.en : h.es) : L('sin declarar', 'not declared'); };
      const ctyName = c => { const h = MCPD.COUNTRY_MAP[c]; return h ? (lang === 'en' ? h.en : h.es) : (c || '—'); };
      const peor = D.completeness.filter(c => c.field.req === 'must' || c.field.req === 'should')
        .sort((a, b) => a.pct - b.pct).slice(0, 8);
      out.push({
        id: 'passport', title: L('La colección', 'The collection'),
        html: `
        <div class="rcols">
          <div><h4>${L('Taxones más representados', 'Best represented taxa')}</h4>
            ${tbl([L('Taxón', 'Taxon'), L('Accesiones', 'Accessions')],
              S.taxa.slice(0, 10).map(t => [`<i>${esc2(t[0])}</i>`, fmtInt(t[1])]), { num: [1] })}</div>
          <div><h4>${L('Países de origen', 'Countries of origin')}</h4>
            ${tbl([L('País', 'Country'), L('Accesiones', 'Accessions')],
              S.countries.slice(0, 10).map(t => [esc2(ctyName(t[0])), fmtInt(t[1])]), { num: [1] })}</div>
        </div>
        <h4>${L('Cómo se conserva', 'How it is conserved')}</h4>
        ${tbl([L('Ruta', 'Route'), L('Accesiones', 'Accessions'), '%'],
          S.routes.map(t => [esc2(routeName(t[0])), fmtInt(t[1]), fmt(100 * t[1] / D.n, 1)]), { num: [1, 2] })}
        <h4>${L('Descriptores obligatorios o recomendados peor llenados', 'Worst filled mandatory or recommended descriptors')}</h4>
        ${tbl([L('Descriptor', 'Descriptor'), L('Con dato', 'Filled'), '%'],
          peor.map(c => [esc2(lang === 'en' ? c.field.en : c.field.es), fmtInt(c.n), fmt(c.pct, 0)]), { num: [1, 2] })}`,
      });
    }

    /* ---------- calidad ---------- */
    if (D.quality) {
      const q = D.quality;
      const porNivel = lv => q.geo.filter(p => p.level === lv).length;
      const pares = q.dup.pairs.slice(0, 10);
      out.push({
        id: 'quality', title: L('Calidad de los datos', 'Data quality'),
        html: `${stats([
          [fmtInt(porNivel('bad')), L('coordenadas imposibles', 'impossible coordinates')],
          [fmtInt(porNivel('warn')), L('coordenadas sospechosas', 'suspicious coordinates')],
          [fmtInt(q.consistency.length), L('avisos de consistencia', 'consistency warnings')],
          [fmtInt(q.fixes.length), L('correcciones propuestas', 'proposed fixes')],
          [fmtInt(q.dup.pairs.length), L('pares candidatos a duplicado', 'candidate duplicate pairs')],
          [fmtInt((D.issues || []).length), L('avisos del pasaporte', 'passport warnings')],
        ])}
        ${pares.length ? `<h4>${L('Pares con mayor puntaje', 'Highest scoring pairs')}</h4>${
          tbl([L('Accesiones', 'Accessions'), L('Puntaje', 'Score'), L('Distancia', 'Distance'), L('Por qué', 'Why')],
            pares.map(p => [
              `<span class="mono">${esc2(D.rows[p.i].ACCENUMB)}</span> + <span class="mono">${esc2(D.rows[p.j].ACCENUMB)}</span>`,
              fmt(p.score, 0),
              p.dist != null ? fmt(p.dist, 1) + ' km' : '—',
              esc2(p.reasons.map(r => (lang === 'en' ? r.en : r.es)).join('; ')),
            ]), { num: [1, 2] })}` : ''}
        <p class="rnote">${L('Un par con puntaje alto no es un duplicado probado: es un par que hay que mirar. La fusión de registros se hace a mano, accesión por accesión, en el Bloque 3.',
          'A high-scoring pair is not a proven duplicate: it is a pair to look at. Merging records is done by hand, accession by accession, in Block 3.')}</p>`,
      });
    }

    /* ---------- mapa ---------- */
    if (D.hasMap && o.figures) {
      const svg = inLight(() => figure(B4.drawMap, W, Math.round(W * 0.62)));
      const pts = GEO.pointsOf ? GEO.pointsOf(D.rows) : [];
      /* countByState y countByCountry devuelven Map, no arreglo */
      const porEnt = [...GEO.countByState(pts).values()].sort((a, b) => b.n - a.n);
      const porPais = [...GEO.countByCountry(pts).values()].sort((a, b) => b.n - a.n);
      const fuera = pts.length - porEnt.reduce((a, e) => a + e.n, 0);
      out.push({
        id: 'map', title: L('Distribución geográfica', 'Geographic distribution'),
        html: `${fig(svg, L(`Sitios de colecta de las ${fmtInt(pts.length)} accesiones georreferenciadas.`,
          `Collecting sites of the ${fmtInt(pts.length)} georeferenced accessions.`))}
        <div class="rcols">
          ${porEnt.length ? `<div><h4>${L('Por entidad de México', 'By Mexican state')}</h4>${
            tbl([L('Entidad', 'State'), L('Accesiones', 'Accessions')],
              porEnt.slice(0, 12).map(e => [esc2(e.name || e.code), fmtInt(e.n)]), { num: [1] })}</div>` : ''}
          ${porPais.length ? `<div><h4>${L('Por país', 'By country')}</h4>${
            tbl([L('País', 'Country'), L('Accesiones', 'Accessions')],
              porPais.slice(0, 12).map(e => {
                const h = MCPD.COUNTRY_MAP[e.a3];
                return [esc2(h ? (lang === 'en' ? h.en : h.es) : e.a3), fmtInt(e.n)];
              }), { num: [1] })}</div>` : ''}
        </div>
        ${fuera > 0 ? `<p class="rnote">${L(`${fmtInt(fuera)} de los puntos caen fuera de México, así que sólo aparecen en el conteo por país. La entidad y el país se asignan por la coordenada, no por el texto del campo: si un punto no cae donde dice su pasaporte, aquí se nota.`,
          `${fmtInt(fuera)} of the points fall outside Mexico, so they only appear in the country count. State and country are assigned from the coordinate, not from the text of the field: if a point does not fall where its passport says, it shows here.`)}</p>` : ''}`,
      });
    }

    /* ---------- diversidad ---------- */
    if (D.diversity) {
      const A = D.diversity;
      const uni = A.units.slice().sort((a, b) => b.S - a.S).slice(0, 12);
      const est = A.inc || {};
      out.push({
        id: 'diversity', title: L('Diversidad geográfica', 'Geographic diversity'),
        html: `${stats([
          [fmtInt(A.total.S), L('tipos en total', 'types in total')],
          [fmt(A.total.H, 2), L('Shannon del conjunto', 'Shannon of the whole')],
          [fmt(A.beta, 2), L('beta de Whittaker', "Whittaker's beta")],
          A.chao1 ? [fmt(A.chao1.est, 0), L('tipos estimados (Chao1)', 'estimated types (Chao1)')] : null,
          isFinite(A.total.coverage) ? [fmt(100 * A.total.coverage, 1) + ' %', L('cobertura del muestreo', 'sampling coverage')] : null,
        ])}
        ${tbl([L('Unidad', 'Unit'), 'n', L('Riqueza', 'Richness'), 'Shannon', 'Pielou', L('Exclusivos', 'Exclusive')],
          uni.map(u => [esc2(u.label), fmtInt(u.N), fmtInt(u.S), fmt(u.H, 2), isFinite(u.pielou) ? fmt(u.pielou, 2) : '—',
            fmtInt((A.exclusives && A.exclusives[u.key] ? A.exclusives[u.key].length : 0))]), { num: [1, 2, 3, 4, 5] })}
        ${o.figures ? fig(inLight(() => figure(B5.curvePlot, W, 260)), L('Curva de acumulación de tipos con el número de accesiones.',
          'Accumulation curve of types against the number of accessions.')) : ''}
        ${A.chao1 && A.chao1.reliable === false ? `<p class="rnote">${L('El estimador Chao1 se apoya en el número de tipos vistos dos veces, y aquí hay muy pocos: tómese como una cota grosera y préstese más atención a Chao2 y a la navaja.',
          'The Chao1 estimator leans on the number of types seen twice, and here there are very few: treat it as a rough bound and give more weight to Chao2 and the jackknife.')}</p>` : ''}
        ${A.mantel ? `<p>${L(`Prueba de Mantel entre composición y distancia geográfica: r = ${fmt(A.mantel.r, 3)}, p = ${fmt(A.mantel.p, 3)} con ${fmtInt(A.mantel.perms)} permutaciones sobre ${fmtInt(A.mantel.n)} unidades.`,
          `Mantel test between composition and geographic distance: r = ${fmt(A.mantel.r, 3)}, p = ${fmt(A.mantel.p, 3)} with ${fmtInt(A.mantel.perms)} permutations over ${fmtInt(A.mantel.n)} units.`)}</p>` : ''}`,
      });
    }

    /* ---------- vacíos ---------- */
    if (D.gaps) {
      const G = D.gaps;
      const pr = G.priorities.slice(0, 10);
      const riesgos = (G.risks || []).filter(r => r.flags && r.flags.length);
      const conteo = {};
      riesgos.forEach(r => r.flags.forEach(f => { conteo[f] = (conteo[f] || 0) + 1; }));
      const flagName = f => {
        const h = window.B6 && B6.FLAGS ? B6.FLAGS[f] : null;
        return h ? (lang === 'en' ? h.en : h.es) : f;
      };
      out.push({
        id: 'gaps', title: L('Vacíos de colecta', 'Collecting gaps'),
        html: `${stats([
          [fmt(G.coverage, 1) + ' %', L('cobertura de la rejilla', 'grid coverage')],
          [fmtInt(G.filled.length), L('celdas con colecta', 'collected cells')],
          [fmtInt(G.empty.length), L('celdas vacías', 'empty cells')],
          G.complementarity ? [fmtInt(G.complementarity.order ? G.complementarity.order.length : 0), L('sitios del conjunto mínimo', 'sites in the minimum set')] : null,
        ])}
        ${o.figures ? fig(inLight(() => figure(B6.gapMap, W, Math.round(W * 0.62))), L('Celdas sin colectar y las diez prioridades mejor puntuadas.',
          'Uncollected cells and the ten highest scoring priorities.')) : ''}
        ${pr.length ? `<h4>${L('Prioridades de colecta', 'Collecting priorities')}</h4>${
          tbl(['#', L('Coordenada', 'Coordinate'), L('Entidad', 'State'), L('Distancia', 'Distance'), L('Puntaje', 'Score')],
            pr.map((c, i) => [String(i + 1), `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)}`, esc2(c.state || '—'),
              c.nearest != null ? fmt(c.nearest, 0) + ' km' : '—', fmt(c.score, 1)]), { num: [0, 3, 4] })}` : ''}
        ${Object.keys(conteo).length ? `<h4>${L('Tipos en riesgo', 'Types at risk')}</h4>${
          tbl([L('Riesgo', 'Risk'), L('Tipos', 'Types')],
            Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([f, n]) => [esc2(flagName(f)), fmtInt(n)]), { num: [1] })}` : ''}
        <p class="rnote">${L('Esto es un análisis geográfico y de composición de la colección, no un análisis ecogeográfico: no se usaron capas ambientales.',
          'This is a geographic and collection-composition analysis, not an ecogeographic one: no environmental layers were used.')}</p>`,
      });
    }

    /* ---------- caracterización ---------- */
    if (D.charac) {
      const A = D.charac, v = A.val || {};
      out.push({
        id: 'charac', title: L('Caracterización y colección núcleo', 'Characterization and core collection'),
        html: `${stats([
          [fmtInt(A.pairs.length), L('accesiones caracterizadas', 'characterized accessions')],
          [fmtInt(A.used.length), L('descriptores', 'descriptors')],
          [fmtInt(A.core.core.length), L('accesiones en el núcleo', 'accessions in the core')],
          isFinite(A.sil && A.sil.mean) ? [fmt(A.sil.mean, 2), L('silueta media', 'mean silhouette')] : null,
        ])}
        ${o.figures ? fig(inLight(() => figure(B7.pcoaPlot, W, 340)), L('Coordenadas principales sobre la distancia de Gower; en color, las accesiones del núcleo.',
          'Principal coordinates on Gower distance; coloured, the core accessions.')) : ''}
        ${tbl([L('Indicador', 'Indicator'), L('Valor', 'Value'), L('Qué dice', 'What it says')], [
          ['MD%', isFinite(v.MD) ? fmt(v.MD, 1) : '—', L('descriptores cuya media cambió; conviene que sea bajo', 'descriptors whose mean changed; low is good')],
          ['VD%', isFinite(v.VD) ? fmt(v.VD, 1) : '—', L('descriptores cuya varianza cambió', 'descriptors whose variance changed')],
          ['CR%', isFinite(v.CR) ? fmt(v.CR, 1) : '—', L('amplitud retenida; conviene que sea alto', 'range retained; high is good')],
          ['VR%', isFinite(v.VR) ? fmt(v.VR, 1) : '—', L('variación retenida; conviene que sea alto', 'variation retained; high is good')],
        ], { num: [1] })}
        ${A.core.core.length < 10 ? `<p class="rnote">${L('El núcleo tiene menos de diez accesiones: las pruebas t y F de la validación no tienen potencia y sus porcentajes se leen con reserva.',
          'The core has fewer than ten accessions: the validating t and F tests lack power and their percentages should be read with caution.')}</p>` : ''}`,
      });
    }

    /* ---------- manejo ---------- */
    if (D.manage) {
      const M = D.manage;
      const crit = M.codes.filter(c => c.level === 'crit');
      const codeName = c => {
        const l = M.lots.find(x => x.st.alerts.some(a => a.code === c.code));
        const a = l ? l.st.alerts.find(a => a.code === c.code) : null;
        return a ? (lang === 'en' ? a.msg.en : a.msg.es) : c.code;
      };
      out.push({
        id: 'manage', title: L('Manejo del banco', 'Genebank management'),
        html: `${stats([
          [fmtInt(M.lots.filter(l => l.st.levelName === 'crit').length), L('lotes con alerta crítica', 'lots with a critical alert')],
          [fmtInt(M.lots.filter(l => l.st.levelName === 'warn').length), L('lotes con aviso', 'lots with a warning')],
          [fmtInt(M.lots.filter(l => l.st.projected != null).length), L('lotes con viabilidad proyectada', 'lots with projected viability')],
          [fmtInt(M.lots.filter(l => l.st.alerts.some(a => a.code === 'noConstants')).length), L('sin constantes publicadas', 'without published constants')],
        ])}
        ${tbl([L('Alerta', 'Alert'), L('Lotes', 'Lots')],
          M.codes.slice(0, 12).map(c => [
            `<span class="lvl lvl-${c.level}"></span>${esc2(codeName(c))}`, fmtInt(c.n)]), { num: [1] })}
        ${o.figures ? fig(inLight(() => figure(B8.workPlot, W, 240)), L('Trabajo que cae cada año en los próximos 25: pruebas, regeneraciones y resiembras.',
          'Work falling due each year over the next 25: tests, regenerations and replantings.')) : ''}
        <p class="rnote">${L('Una proyección de viabilidad no sustituye a una prueba de germinación: dice lo que debería pasarle al lote en esas condiciones, no lo que le pasó.',
          'A viability projection does not replace a germination test: it says what should happen to the lot under those conditions, not what did happen.')}</p>`,
      });
    }

    /* ---------- métodos y referencias ---------- */
    out.push({
      id: 'methods', title: L('Métodos', 'Methods'),
      html: methods(D, lang).map(m => `<h4>${esc2(m.title)}</h4><p>${esc2(m.text)}</p>`).join(''),
    });
    out.push({
      id: 'refs', title: L('Referencias', 'References'),
      html: `<ol class="rrefs">${references(D, o.dwc).map(r => `<li>${r}</li>`).join('')}</ol>`,
    });

    /* ---------- anexo ---------- */
    if (o.annex) {
      const routeName = c => { const h = MCPD.GPCONS.find(x => x.c === c); return h ? (lang === 'en' ? h.en : h.es) : '—'; };
      out.push({
        id: 'annex', title: L('Anexo: las accesiones', 'Annex: the accessions'),
        html: tbl([L('Accesión', 'Accession'), L('Nombre', 'Name'), L('Especie', 'Species'), L('País', 'Country'),
          L('Sitio', 'Site'), L('Ruta', 'Route'), L('Existencias', 'Stock')],
        D.rows.map(r => [
          `<span class="mono">${esc2(r.ACCENUMB)}</span>`, esc2(r.ACCENAME), `<i>${esc2([r.GENUS, r.SPECIES].filter(Boolean).join(' '))}</i>`,
          esc2(r.ORIGCTY), esc2(r.COLLSITE), esc2(routeName(MCPD.consRoute(r))), fmtInt(Number(r.GP_STOCK) || 0) || '—',
        ]), { num: [6] }),
      });
    }
    return out;
  }

  /* ================= el archivo suelto ================= */
  const CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 860px; padding: 34px 26px 70px; background: #fff; color: #1b1b1b;
  font: 15px/1.62 Georgia, 'Times New Roman', serif; }
h1 { font-size: 1.9rem; margin: 0 0 4px; line-height: 1.2; }
h2 { font-size: 1.28rem; margin: 34px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #6b4a8f; color: #4a3266; }
h3 { font-size: 1.05rem; margin: 20px 0 6px; }
h4 { font-size: .95rem; margin: 16px 0 5px; color: #4a3266; }
p { margin: 0 0 10px; text-align: justify; }
.rmeta { color: #555; font-size: .9rem; margin-bottom: 20px; }
.rstats { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
.rstat { flex: 1 1 130px; border: 1px solid #ddd; border-left: 3px solid #6b4a8f; border-radius: 4px; padding: 7px 10px; }
.rstat b { display: block; font-size: 1.24rem; font-family: system-ui, sans-serif; color: #4a3266; }
.rstat span { font-size: .78rem; color: #555; font-family: system-ui, sans-serif; }
.rlist { margin: 6px 0 0 18px; padding: 0; }
.rlist li { margin-bottom: 4px; }
table.rt { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font: 12.5px/1.4 system-ui, sans-serif; }
table.rt th { text-align: left; border-bottom: 2px solid #999; padding: 5px 7px; font-size: 11px;
  text-transform: uppercase; letter-spacing: .04em; color: #555; }
table.rt td { border-bottom: 1px solid #e3e3e3; padding: 5px 7px; vertical-align: top; }
table.rt td.num, table.rt th.num { text-align: right; font-variant-numeric: tabular-nums; }
.mono { font-family: ui-monospace, 'Courier New', monospace; font-size: .92em; }
.rcols { display: flex; flex-wrap: wrap; gap: 0 26px; }
.rcols > div { flex: 1 1 280px; }
.rfig { margin: 14px 0 18px; padding: 0; }
.rfig svg { width: 100%; height: auto; display: block; border: 1px solid #e3e3e3; border-radius: 4px; background: #fff; }
.rfig figcaption { font: italic 12.5px/1.45 Georgia, serif; color: #555; margin-top: 5px; }
.rnote { font-size: .88rem; color: #444; background: #f6f2fa; border-left: 3px solid #6b4a8f; padding: 7px 11px; margin: 10px 0; }
.rrefs { font-size: .88rem; padding-left: 20px; }
.rrefs li { margin-bottom: 5px; }
.lvl { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; background: #999; }
.lvl-crit { background: #b23b3b; } .lvl-warn { background: #c5761c; } .lvl-info { background: #5a7fa8; }
.rfoot { margin-top: 36px; padding-top: 10px; border-top: 1px solid #ddd; font-size: .8rem; color: #666; }
@media print {
  body { max-width: none; padding: 0; font-size: 10.5pt; }
  h2 { page-break-after: avoid; }
  table.rt, .rfig { page-break-inside: avoid; }
  thead { display: table-header-group; }
}`;

  function buildHTML(D, opts) {
    const o = Object.assign({ lang: 'es', title: '', bank: '', author: '', pick: null }, opts || {});
    const L = (es, en) => (o.lang === 'en' ? en : es);
    const title = o.title || L('Informe de la colección', 'Collection report');
    const secs = sections(D, o.lang, o).filter(s => !o.pick || o.pick.includes(s.id));
    const fecha = D.date.toLocaleDateString(o.lang === 'en' ? 'en-GB' : 'es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const body = `
<h1>${esc2(title)}</h1>
<p class="rmeta">${[o.bank, o.author].filter(Boolean).map(esc2).join(' · ')}${o.bank || o.author ? ' · ' : ''}${esc2(fecha)} · ${fmtInt(D.n)} ${L('accesiones', 'accessions')}</p>
${secs.map(s => `<h2 id="s-${s.id}">${esc2(s.title)}</h2>${s.html}`).join('\n')}
<p class="rfoot">${L('Generado con GermplasmPro, que corre entero en el navegador. Los datos de la colección no salieron de esta computadora.',
      'Generated with GermplasmPro, which runs entirely in the browser. The collection data never left this computer.')}</p>`;
    return `<!DOCTYPE html>
<html lang="${o.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc2(title)}</title>
<style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
  }
  window.REPORT = {
    SECTIONS, REFS, DWC_COLUMNS, DWC_MAPPED, DWC_LEFTOVER,
    inLight, cssValue, resolveVars, figure, isoDate, dwcRow, darwinCore, sections, buildHTML, CSS,
    gather, methods, references,
  };
})();
