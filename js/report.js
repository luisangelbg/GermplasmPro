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
     informe es papel: se genera en claro pase lo que pase en la pantalla. Con el
     Bloque 4 cargado, en su modo de archivo: colores fijos (también las rampas). */
  function inLight(fn) {
    if (window.B4 && typeof B4.forFile === 'function') return B4.forFile(fn);
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

  /* Las funciones de dibujo de los bloques escriben sus letreros con T(), es
     decir, en el idioma de la app; el informe puede ir en otro. Mientras se
     dibuja se cambia el idioma —sin avisar a nadie: no es un cambio de la
     interfaz— y se devuelve el de antes pase lo que pase. */
  function inLang(lang, fn) {
    if (!window.I18N || (lang !== 'es' && lang !== 'en') || I18N.lang === lang) return fn();
    const prev = I18N.lang;
    I18N.lang = lang;
    try { return fn(); } finally { I18N.lang = prev; }
  }

  /* llama a la función de dibujo de un bloque sin que un tropiezo tire todo.
     El mapa del Bloque 4 devuelve un objeto: se le añade su leyenda, que en la
     app vive en otro lugar de la página. */
  function figure(fn, W, H) {
    try {
      const out = fn(W, H);
      let svg = out && out.svg ? out.svg : out;
      if (typeof svg !== 'string' || svg.indexOf('<svg') < 0) return '';
      if (out && out.cinfo && window.B4 && typeof B4.legendHTML === 'function') {
        const leg = B4.legendHTML(out.cinfo) + (typeof B4.choroLegend === 'function' ? B4.choroLegend() : '');
        if (leg.trim()) svg += `<div class="map-legends">${leg}</div>`;
      }
      return resolveVars(svg);
    } catch (e) { return ''; }
  }

  /* sólo el primer <svg>…</svg> de una figura, sin la leyenda en HTML que
     algunas llevan debajo: lo que va a un archivo .svg tiene que ser SVG */
  function svgOnly(s) {
    const str = String(s || '');
    const start = str.indexOf('<svg');
    if (start < 0) return '';
    const re = /<svg\b|<\/svg>/g;
    re.lastIndex = start;
    let depth = 0, m;
    while ((m = re.exec(str))) {
      depth += m[0] === '</svg>' ? -1 : 1;
      if (depth === 0) return str.slice(start, m.index + 6);
    }
    return '';
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

  /* Los textos (país, protocolos, preparación) salen en el idioma del informe;
     el país viaja además con su código ISO de dos letras en countryCode, que es
     lo que de verdad lee GBIF. */
  function dwcRow(row, lang) {
    const en = lang === 'en';
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
      /* quien colectó; COLLCODE es el código de un instituto, no una persona:
         sin COLLNAME se deja vacío y el código viaja en dynamicProperties */
      recordedBy: String(row.COLLNAME || ''),
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
      country: cty ? (en ? cty.en : cty.es) : '',
      countryCode: cty && GEO.A3_TO_A2 ? (GEO.A3_TO_A2[String(row.ORIGCTY || '').toUpperCase()] || '') : '',
      locality: String(row.COLLSITE || ''),
      decimalLatitude: String(row.DECLATITUDE ?? ''),
      decimalLongitude: String(row.DECLONGITUDE ?? ''),
      geodeticDatum: row.DECLATITUDE === '' || row.DECLATITUDE == null ? '' : 'EPSG:4326',
      coordinateUncertaintyInMeters: String(row.COORDUNCERT || ''),
      georeferenceProtocol: gr ? (en ? gr.en : gr.es) : '',
      minimumElevationInMeters: String(row.ELEVATION || ''),
      maximumElevationInMeters: String(row.ELEVATION || ''),
      samplingProtocol: src ? (en ? src.en : src.es) : '',
      /* «cultivated» es un valor del vocabulario de Darwin Core; lo silvestre
         no tiene término propio, así que se deja vacío y el código SAMPSTAT
         completo viaja en dynamicProperties */
      degreeOfEstablishment: stNum >= 300 && stNum < 600 ? 'cultivated' : '',
      preparations: cons ? (en ? cons.en : cons.es) : '',
      occurrenceRemarks: String(row.REMARKS || ''),
      dynamicProperties: Object.keys(extra).length ? JSON.stringify(extra) : '',
    };
  }
  function darwinCore(rows, lang) { return (rows || []).map(r => dwcRow(r, lang)); }

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
    /* los ajustes con que se corrieron la caracterización y el manejo, para
       que los métodos digan exactamente lo que se hizo */
    D.characView = D.charac && window.B7 && B7.view ? Object.assign({}, B7.view) : null;
    D.manageCfg = D.manage && window.B8 && typeof B8.cfg === 'function' ? B8.cfg() : null;
    /* sin una sola coordenada no hay mapa que dibujar ni tablas que llenar */
    D.hasMap = !!(window.B4 && window.GEO) && !!(D.summary && D.summary.withCoords > 0);
    D.traits = (state.traits || []).length;
    return D;
  }

  /* ================= métodos redactados ================= */
  /* Un párrafo por análisis que de verdad se corrió, con los ajustes que se
     usaron. Lo que no se corrió no aparece. Cada párrafo lleva la lista de las
     referencias que cita (refs): la bibliografía se arma con esas listas, y así
     cada cita está en la bibliografía y cada entrada de la bibliografía está
     citada. */

  /* la cita de la propia aplicación: la misma de la portada y de CITATION.cff */
  const APP = {
    version: '1.0.0', year: 2026,
    title: 'GermplasmPro: el banco de germoplasma, accesión por accesión',
    url: 'https://github.com/luisangelbg/GermplasmPro',
  };

  function methods(D, lang) {
    const L = (es, en) => (lang === 'en' ? en : es);
    const out = [];
    const nm = n => String(n);

    out.push({
      id: 'data', title: L('Datos de pasaporte', 'Passport data'), refs: ['mcpd', 'dwc'],
      text: L(
        `La colección se describió con los descriptores multicultivo de pasaporte MCPD v2.1 (Alercia et al., 2015), ampliados con siete campos propios para lo que el estándar, pensado para bancos ex situ, no cubre: la ruta de conservación activa, el sitio in situ, la persona custodia, las existencias, el porcentaje de germinación de la última prueba y las fechas de la última prueba de germinación y de la última regeneración. Se registraron ${nm(D.n)} accesiones. Cada valor se validó contra la lista de códigos de su descriptor y, además, contra los demás campos del mismo registro (fechas coherentes entre sí, coordenadas dentro del país declarado, almacenamiento compatible con la ruta). Para compartirlo con GBIF, el pasaporte se exporta también en Darwin Core (Wieczorek et al., 2012); los descriptores que no tienen término propio en ese estándar viajan en dynamicProperties con su nombre original.`,
        `The collection was described with the FAO/Bioversity multi-crop passport descriptors MCPD v2.1 (Alercia et al., 2015), extended with seven local fields for what the standard, written for ex-situ banks, does not cover: the active conservation route, the in-situ site, the keeper, the stock, the germination percentage of the last test and the dates of the last germination test and the last regeneration. ${nm(D.n)} accessions were recorded. Every value was validated against its descriptor's code list and against the rest of the record (dates consistent with one another, coordinates inside the declared country, storage compatible with the route). To share it with GBIF, the passport is also exported in Darwin Core (Wieczorek et al., 2012); descriptors without a term of their own in that standard travel in dynamicProperties under their original name.`),
    });

    if (D.quality) {
      const nd = D.quality.dup && D.quality.dup.pairs ? D.quality.dup.pairs.length : 0;
      out.push({
        id: 'quality', title: L('Control de calidad y duplicados', 'Quality control and duplicates'), refs: ['winkler'],
        text: L(
          `Las coordenadas se contrastaron con la caja envolvente del país declarado para detectar las tres equivocaciones clásicas —longitud sin signo, latitud invertida y latitud y longitud intercambiadas—, cada una con su corrección propuesta, que sólo se aplicó tras revisarla. Los nombres científicos y los sitios se revisaron con distancia de Levenshtein para agrupar variantes de escritura. Los duplicados se buscaron con un esquema de bloqueo (número de colecta, números de donante, prefijo del nombre, celda de medio grado y taxón con fecha) y se puntuaron con una combinación ponderada de similitud de nombres por Jaro-Winkler (Winkler, 1990), distancia geográfica por la fórmula del semiverseno y coincidencia de números y fechas; los pares por encima del umbral se revisaron uno por uno. Se examinaron ${nm(nd)} ${nd === 1 ? 'par candidato' : 'pares candidatos'}.`,
          `Coordinates were checked against the bounding box of the declared country to detect the three classic mistakes —unsigned longitude, flipped latitude and latitude and longitude swapped—, each with a proposed fix that was applied only after review. Scientific names and site names were screened with Levenshtein distance to group spelling variants. Duplicates were searched with a blocking scheme (collecting number, donor numbers, name prefix, half-degree cell and taxon with date) and scored with a weighted combination of Jaro-Winkler name similarity (Winkler, 1990), haversine geographic distance and agreement of numbers and dates; pairs above the threshold were reviewed one by one. ${nm(nd)} candidate ${nd === 1 ? 'pair was' : 'pairs were'} examined.`),
      });
    }

    if (D.hasMap) {
      out.push({
        id: 'map', title: L('Cartografía', 'Cartography'), refs: ['ne'],
        text: L(
          'Los mapas se dibujaron sin conexión a internet, con los contornos de dominio público de Natural Earth incluidos en la aplicación (admin-1 de México a 1:10 millones y admin-0 del mundo a 1:110 millones), en proyección equirrectangular con corrección por el coseno de la latitud. La entidad y el país de cada accesión se asignaron por inclusión del punto en el polígono, no por el texto del campo correspondiente, de modo que el mapa delata las coordenadas que no concuerdan con lo declarado.',
          'Maps were drawn offline from the public-domain Natural Earth outlines bundled with the application (Mexican admin-1 at 1:10 million and world admin-0 at 1:110 million), in an equirectangular projection corrected by the cosine of the latitude. The state and country of each accession were assigned by point-in-polygon, not from the text of the corresponding field, so that the map exposes coordinates that disagree with what was declared.'),
      });
    }

    if (D.diversity) {
      const A = D.diversity, o = A.opts || {};
      const unit = {
        state: L('entidad federativa', 'state'), country: L('país', 'country'),
        cell: L(`celda de una rejilla de ${nm(o.grid || 1)}°`, `cell of a ${nm(o.grid || 1)}° grid`),
        grid: L(`celda de una rejilla de ${nm(o.grid || 1)}°`, `cell of a ${nm(o.grid || 1)}° grid`),
        band: L(`franja altitudinal de ${nm(o.band || 500)} m`, `${nm(o.band || 500)} m elevation belt`),
      }[A.unitMode] || A.unitMode;
      const cls = { species: L('especies', 'species'), crop: L('cultivos', 'crops'), genus: L('géneros', 'genera'), name: L('nombres de accesión', 'accession names') }[A.classMode] || A.classMode;
      const refs = ['jost', 'hurlbert', 'heck', 'chao', 'chao87', 'burnham', 'good'];
      let comp = '';
      if (A.D) {
        const dist = {
          jaccard: [L('el índice de disimilitud de Jaccard (Jaccard, 1912)', 'the Jaccard dissimilarity index (Jaccard, 1912)'), 'jaccard'],
          sorensen: [L('el índice de disimilitud de Sørensen (Sørensen, 1948)', 'the Sørensen dissimilarity index (Sørensen, 1948)'), 'sorensen'],
          bray: [L('la disimilitud de Bray-Curtis (Bray y Curtis, 1957)', 'the Bray-Curtis dissimilarity (Bray and Curtis, 1957)'), 'bray'],
        }[o.dist] || null;
        if (dist) refs.push(dist[1]);
        refs.push('sokal');
        const m = A.mantel && isFinite(A.mantel.r) ? A.mantel : null;
        if (m) refs.push('mantel');
        const contra = m ? (m.dist === 'elev' ? L('la diferencia de altitud entre franjas', 'the elevation difference between belts') : L('la distancia geográfica', 'geographic distance')) : '';
        comp = L(
          ` La composición de las unidades con al menos dos accesiones se comparó con ${dist ? dist[0] : 'una disimilitud'}, se ordenó con agrupamiento UPGMA (Sokal y Michener, 1958)${m ? ` y se contrastó con ${contra} mediante una prueba de Mantel (Mantel, 1967) con ${nm(m.perms)} permutaciones` : ''}.`,
          ` The composition of units with at least two accessions was compared with ${dist ? dist[0] : 'a dissimilarity'}, ordered with UPGMA clustering (Sokal and Michener, 1958)${m ? ` and contrasted against ${contra} with a Mantel test (Mantel, 1967) using ${nm(m.perms)} permutations` : ''}.`);
      }
      out.push({
        id: 'diversity', title: L('Diversidad geográfica', 'Geographic diversity'), refs,
        text: L(
          `Las accesiones se agruparon por ${unit} y se contó la diversidad de ${cls}. Para cada unidad se calcularon la riqueza observada, el índice de Shannon, el de Gini-Simpson, la equidad de Pielou y los números de Hill de orden 0, 1 y 2 (Jost, 2006). Como el número de accesiones cambia mucho de una unidad a otra, y la riqueza crece con el esfuerzo, la comparación se hizo sobre la riqueza rarefactada de Hurlbert (1971) a un esfuerzo común, con la varianza de Heck et al. (1975). Lo que falta por colectar se estimó con Chao1 (Chao, 1984), Chao2 (Chao, 1987) y los estimadores de navaja de primer y segundo orden (Burnham y Overton, 1978), y la cobertura del muestreo con el estimador de Good-Turing (Good, 1953).${comp}`,
          `Accessions were grouped by ${unit} and the diversity of ${cls} was counted. For each unit we computed observed richness, the Shannon index, the Gini-Simpson index, Pielou's evenness and Hill numbers of order 0, 1 and 2 (Jost, 2006). Because the number of accessions differs greatly between units, and richness grows with effort, comparisons were made on Hurlbert (1971) rarefied richness at a common effort, with the variance of Heck et al. (1975). What remains to be collected was estimated with Chao1 (Chao, 1984), Chao2 (Chao, 1987) and first- and second-order jackknife estimators (Burnham and Overton, 1978), and sampling coverage with the Good-Turing estimator (Good, 1953).${comp}`),
      });
    }

    if (D.gaps) {
      const G = D.gaps;
      const w = (G.opts && G.opts.weights) || GAPS.DEFAULT_WEIGHTS;
      out.push({
        id: 'gaps', title: L('Vacíos de colecta', 'Collecting gaps'), refs: ['gap'],
        text: L(
          `El territorio se dividió en una rejilla de ${nm((G.opts && G.opts.size) || 1)}° y se marcaron las celdas con y sin accesiones. Para cada celda vacía se midió la distancia al punto colectado más cercano y se calculó un índice de prioridad con cuatro componentes explícitos y pesos ajustables —lejanía (${nm(w.distance)}), riqueza del vecindario (${nm(w.richness)}), déficit de la entidad (${nm(w.state)}) y tipos exclusivos cercanos (${nm(w.exclusive)})—, de modo que cada renglón del resultado enseña de dónde sale su número. El conjunto mínimo de sitios que recogería todos los tipos presentes se obtuvo por complementariedad voraz. Conviene decir qué NO es esto: un análisis geográfico y de composición de la colección, en la línea de Ramírez-Villegas et al. (2010) pero sin su componente ecogeográfico, que exigiría capas ambientales que esta aplicación no incluye ni descarga.`,
          `The territory was divided into a ${nm((G.opts && G.opts.size) || 1)}° grid and cells with and without accessions were mapped. For every empty cell we measured the distance to the nearest collected point and computed a priority index from four explicit, adjustable components —remoteness (${nm(w.distance)}), neighbourhood richness (${nm(w.richness)}), state deficit (${nm(w.state)}) and nearby exclusive types (${nm(w.exclusive)})—, so that each row of the result shows where its number comes from. The minimum set of sites that would capture every type present was obtained by greedy complementarity. It is worth saying what this is NOT: it is a geographic and collection-composition analysis, in the spirit of Ramírez-Villegas et al. (2010) but without their ecogeographic component, which would require environmental layers that this application neither bundles nor downloads.`),
      });
    }

    if (D.charac) {
      const A = D.charac;
      const V = D.characView || {};
      const core = A.core || { core: [], target: 0 };
      const nC = A.pairs ? A.pairs.length : 0;
      const nU = A.used ? A.used.length : 0;
      const k = A.groups ? new Set(A.groups).size : (V.k || 0);
      const sil = A.sil && isFinite(A.sil.mean) ? A.sil.mean : null;
      const refs = ['gower'];
      const upgma = V.tree === 'upgma';
      refs.push(upgma ? 'sokal' : 'ward');
      if (sil != null) refs.push('rousseeuw');
      refs.push('brown');
      const pct = V.pct != null ? V.pct : (nC ? Math.round(100 * core.target / nC) : 0);
      const real = core.core.length;
      const arbol = upgma
        ? L('El agrupamiento jerárquico se hizo por UPGMA, el promedio no ponderado entre grupos (Sokal y Michener, 1958)',
          'Hierarchical clustering used UPGMA, the unweighted pair-group average (Sokal and Michener, 1958)')
        : L('El agrupamiento jerárquico se hizo por el método de Ward en su variante D2 (Murtagh y Legendre, 2014)',
          "Hierarchical clustering used Ward's method in its D2 variant (Murtagh and Legendre, 2014)");
      const corte = L(
        `, y el árbol se cortó en ${nm(k)} grupos, un número elegido a mano${sil != null ? `; la silueta media de ese corte fue de ${fmt(sil, 2)} (Rousseeuw, 1987)` : ''}.`,
        `, and the tree was cut into ${nm(k)} groups, a number chosen by hand${sil != null ? `; the mean silhouette of that cut was ${fmt(sil, 2)} (Rousseeuw, 1987)` : ''}.`);
      const pedido = L(
        `La colección núcleo, en el sentido de Brown (1989), se pidió del ${nm(pct)} % de las accesiones caracterizadas (${nm(core.target)} de ${nm(nC)}) y quedó con ${nm(real)}${core.exceeds ? ', más de las pedidas porque se exigió al menos una por estrato' : ''}.`,
        `The core collection, in the sense of Brown (1989), was requested at ${nm(pct)} % of the characterized accessions (${nm(core.target)} of ${nm(nC)}) and ended up with ${nm(real)}${core.exceeds ? ', more than requested because at least one per stratum was required' : ''}.`);
      let como;
      if (core.method === 'M') {
        refs.push('schoen');
        como = L(
          ' Se construyó con el método M de máximas clases (Schoen y Brown, 1993), que no estratifica: en cada paso entra la accesión que aporta más clases todavía no cubiertas de los descriptores cualitativos y ordinales.',
          ' It was built with the M (maximization) method (Schoen and Brown, 1993), which does not stratify: at each step it adds the accession contributing the most classes of the qualitative and ordinal descriptors not yet covered.');
      } else {
        const strata = core.strata || [];
        const nS = strata.length;
        const al = CHAR.ALLOCATIONS[core.method] || null;
        const reparto = al ? L(`con reparto ${al.adj} del tamaño entre estratos`, `with ${al.en.toLowerCase()} allocation of the size among strata`) : '';
        const dentro = core.pick === 'random'
          ? L(`al azar (semilla ${nm(V.seed)})`, `at random (seed ${nm(V.seed)})`)
          : L('las accesiones más distintas entre sí por la distancia de Gower', 'the accessions most distinct from one another by Gower distance');
        const cuales = {
          group: L(`los ${nm(k)} grupos del agrupamiento`, `the ${nm(k)} clusters`),
          state: L('la entidad o el país de origen', 'the state or country of origin'),
          crop: L('el cultivo', 'the crop'),
          taxon: L('la especie', 'the species'),
        }[V.strata];
        if (V.strata === 'none' || !cuales) {
          como = L(` Se construyó sin estratificar, tomando ${dentro} de toda la colección caracterizada.`,
            ` It was built without strata, taking ${dentro} from the whole characterized collection.`);
        } else {
          const un = core.unrepresented || 0;
          /* con los grupos del agrupamiento ya se dijo cuántos son */
          const cuantos = V.strata === 'group' ? ['', ''] : [`, ${nm(nS)} en total`, `, ${nm(nS)} in all`];
          como = L(
            ` Se construyó por estratos —${cuales}${cuantos[0]}—, ${reparto}, y dentro de cada estrato se eligieron ${dentro}.${core.atLeastOne ? ' Se pidió al menos una accesión por estrato.' : ''} ${un ? `${nm(un)} de ${nm(nS)} estratos ${un === 1 ? 'se quedó' : 'se quedaron'} sin representante, porque había más estratos que plazas.` : 'Todos los estratos quedaron representados.'}`,
            ` It was built by strata —${cuales}${cuantos[1]}—, ${reparto}, picking within each stratum ${dentro}.${core.atLeastOne ? ' At least one accession per stratum was required.' : ''} ${un ? `${nm(un)} of ${nm(nS)} strata ${un === 1 ? 'was' : 'were'} left without a representative, because there were more strata than places.` : 'Every stratum was represented.'}`);
        }
      }
      refs.push('hu');
      out.push({
        id: 'charac', title: L('Caracterización y colección núcleo', 'Characterization and core collection'), refs,
        text: L(
          `Se caracterizaron ${nm(nC)} accesiones con ${nm(nU)} descriptores de tipo mixto (cuantitativos, ordinales y cualitativos). La distancia entre accesiones se calculó con el coeficiente general de similitud de Gower (1971), que admite datos faltantes y mezcla tipos de variable, y se ordenó por análisis de coordenadas principales. ${arbol}${corte} ${pedido}${como} El núcleo se validó con los indicadores de Hu et al. (2000): porcentaje de medias distintas (MD%), de varianzas distintas (VD%), razón de amplitudes (CR%) y razón de coeficientes de variación (VR%), con pruebas t de Welch y F por descriptor.`,
          `${nm(nC)} accessions were characterized with ${nm(nU)} mixed-type descriptors (quantitative, ordinal and qualitative). Distances between accessions were computed with Gower's (1971) general coefficient of similarity, which admits missing data and mixes variable types, and were ordered by principal coordinates analysis. ${arbol}${corte} ${pedido}${como} The core was validated with the indicators of Hu et al. (2000): percentage of significantly different means (MD%), of different variances (VD%), the coincidence rate of ranges (CR%) and the variable rate of coefficients of variation (VR%), using per-descriptor Welch t and F tests.`),
      });
    }

    if (D.manage) {
      const c = (D.manageCfg && D.manageCfg.seed) || MANAGE.DEFAULT_CONFIG.seed;
      const t = String(c.temp).replace('-', '−');
      out.push({
        id: 'manage', title: L('Viabilidad y manejo', 'Viability and management'), refs: ['ellis', 'kew', 'fao'],
        text: L(
          `La viabilidad de cada lote de semilla se proyectó con la ecuación mejorada de longevidad de Ellis y Roberts (1980), v = K_i − p/σ, con log σ = K_E − C_W·log₁₀ m − C_H·t − C_Q·t², usando la temperatura de la cámara (${t} °C) y el contenido de humedad de la semilla (${fmt(c.moisture, 1).replace(/\.0$/, '')} %) y las constantes de viabilidad de la especie: las del maíz vienen con la aplicación y las de otras especies se toman de la Seed Information Database (Royal Botanic Gardens Kew) o de la literatura, con su fuente anotada. En los taxones sin constantes no se proyectó nada: se informó únicamente la fecha de la última prueba. Un lote se marcó para regenerar por debajo del ${nm(c.threshold)} % de germinación, y la prueba se dio por vencida a los ${nm(c.testInterval)} años; los valores de partida de la aplicación siguen las normas para bancos de germoplasma de la FAO (2014), y los de este informe son los de la configuración del banco. El número de plantas necesario para conservar un alelo de frecuencia p se calculó como 1 − (1 − p)^(2n) en especies alógamas y 1 − (1 − p)^n en autógamas, y de ahí, con la germinación del lote, las semillas que hay que sembrar. Ninguna proyección sustituye a una prueba de germinación, y así se declara en la aplicación.`,
          `Seed lot viability was projected with the improved longevity equation of Ellis and Roberts (1980), v = K_i − p/σ, with log σ = K_E − C_W·log₁₀ m − C_H·t − C_Q·t², using the store temperature (${t} °C), the seed moisture content (${fmt(c.moisture, 1).replace(/\.0$/, '')} %) and the viability constants of the species: those for maize ship with the application and those for other species are taken from the Seed Information Database (Royal Botanic Gardens Kew) or from the literature, with their source recorded. For taxa without constants nothing was projected: only the date of the last test was reported. A lot was flagged for regeneration below ${nm(c.threshold)} % germination, and a test was considered overdue after ${nm(c.testInterval)} years; the application's starting values follow the FAO (2014) genebank standards, and those in this report are the genebank's own settings. The number of plants needed to retain an allele of frequency p was computed as 1 − (1 − p)^(2n) for outcrossing species and 1 − (1 − p)^n for selfing species, and from that, with the lot's germination, the seeds to sow. No projection replaces a germination test, and the application says so.`),
      });
    }

    out.push({
      id: 'software', title: L('Programa', 'Software'), refs: ['app'],
      text: L(
        `Todos los cálculos y todas las figuras se hicieron con GermplasmPro, versión ${APP.version} (Barrera-Guzmán, ${APP.year}), una aplicación que corre entera en el navegador, sin servidor y sin bibliotecas de terceros: ningún dato de la colección sale de la computadora donde se trabaja.`,
        `All computations and figures were produced with GermplasmPro, version ${APP.version} (Barrera-Guzmán, ${APP.year}), an application that runs entirely in the browser, with no server and no third-party libraries: no collection data leaves the computer where the work is done.`),
    });
    return out;
  }

  /* ================= referencias ================= */
  /* Fichas completas. Las que cambian de idioma (los «y» entre autores, la
     ciudad, la versión) tienen las dos formas; las demás son iguales en los dos. */
  const REFS = {
    mcpd: { es: 'Alercia, A., Diulgheroff, S. y Mackay, M. (2015). <i>FAO/Bioversity multi-crop passport descriptors V.2.1</i>. Bioversity International y FAO.',
      en: 'Alercia, A., Diulgheroff, S. and Mackay, M. (2015). <i>FAO/Bioversity multi-crop passport descriptors V.2.1</i>. Bioversity International and FAO.' },
    fao: { es: 'FAO (2014). <i>Genebank standards for plant genetic resources for food and agriculture</i>. Roma: FAO.',
      en: 'FAO (2014). <i>Genebank standards for plant genetic resources for food and agriculture</i>. Rome: FAO.' },
    winkler: 'Winkler, W.E. (1990). String comparator metrics and enhanced decision rules in the Fellegi-Sunter model of record linkage. <i>Proceedings of the Section on Survey Research Methods</i>, American Statistical Association, 354–359.',
    ne: { es: 'Natural Earth (dominio público, naturalearthdata.com): contornos admin-1 de México a 1:10 millones y admin-0 del mundo a 1:110 millones.',
      en: 'Natural Earth (public domain, naturalearthdata.com): Mexican admin-1 outlines at 1:10 million and world admin-0 outlines at 1:110 million.' },
    hurlbert: 'Hurlbert, S.H. (1971). The nonconcept of species diversity: a critique and alternative parameters. <i>Ecology</i> 52(4): 577–586.',
    heck: { es: 'Heck, K.L., van Belle, G. y Simberloff, D. (1975). Explicit calculation of the rarefaction diversity measurement and the determination of sufficient sample size. <i>Ecology</i> 56(6): 1459–1461.',
      en: 'Heck, K.L., van Belle, G. and Simberloff, D. (1975). Explicit calculation of the rarefaction diversity measurement and the determination of sufficient sample size. <i>Ecology</i> 56(6): 1459–1461.' },
    chao: 'Chao, A. (1984). Nonparametric estimation of the number of classes in a population. <i>Scandinavian Journal of Statistics</i> 11(4): 265–270.',
    chao87: 'Chao, A. (1987). Estimating the population size for capture-recapture data with unequal catchability. <i>Biometrics</i> 43(4): 783–791.',
    burnham: { es: 'Burnham, K.P. y Overton, W.S. (1978). Estimation of the size of a closed population when capture probabilities vary among animals. <i>Biometrika</i> 65(3): 625–633.',
      en: 'Burnham, K.P. and Overton, W.S. (1978). Estimation of the size of a closed population when capture probabilities vary among animals. <i>Biometrika</i> 65(3): 625–633.' },
    good: 'Good, I.J. (1953). The population frequencies of species and the estimation of population parameters. <i>Biometrika</i> 40(3–4): 237–264.',
    jaccard: 'Jaccard, P. (1912). The distribution of the flora in the alpine zone. <i>New Phytologist</i> 11(2): 37–50.',
    sorensen: 'Sørensen, T. (1948). A method of establishing groups of equal amplitude in plant sociology based on similarity of species content and its application to analyses of the vegetation on Danish commons. <i>Biologiske Skrifter, Kongelige Danske Videnskabernes Selskab</i> 5(4): 1–34.',
    bray: { es: 'Bray, J.R. y Curtis, J.T. (1957). An ordination of the upland forest communities of southern Wisconsin. <i>Ecological Monographs</i> 27(4): 325–349.',
      en: 'Bray, J.R. and Curtis, J.T. (1957). An ordination of the upland forest communities of southern Wisconsin. <i>Ecological Monographs</i> 27(4): 325–349.' },
    sokal: { es: 'Sokal, R.R. y Michener, C.D. (1958). A statistical method for evaluating systematic relationships. <i>University of Kansas Science Bulletin</i> 38: 1409–1438.',
      en: 'Sokal, R.R. and Michener, C.D. (1958). A statistical method for evaluating systematic relationships. <i>University of Kansas Science Bulletin</i> 38: 1409–1438.' },
    jost: 'Jost, L. (2006). Entropy and diversity. <i>Oikos</i> 113(2): 363–375.',
    mantel: 'Mantel, N. (1967). The detection of disease clustering and a generalized regression approach. <i>Cancer Research</i> 27(2): 209–220.',
    gap: { es: 'Ramírez-Villegas, J., Khoury, C., Jarvis, A., Debouck, D.G. y Guarino, L. (2010). A gap analysis methodology for collecting crop genepools: a case study with <i>Phaseolus</i> beans. <i>PLoS ONE</i> 5(10): e13497.',
      en: 'Ramírez-Villegas, J., Khoury, C., Jarvis, A., Debouck, D.G. and Guarino, L. (2010). A gap analysis methodology for collecting crop genepools: a case study with <i>Phaseolus</i> beans. <i>PLoS ONE</i> 5(10): e13497.' },
    gower: 'Gower, J.C. (1971). A general coefficient of similarity and some of its properties. <i>Biometrics</i> 27(4): 857–871.',
    ward: { es: 'Murtagh, F. y Legendre, P. (2014). Ward’s hierarchical agglomerative clustering method: which algorithms implement Ward’s criterion? <i>Journal of Classification</i> 31(3): 274–295.',
      en: 'Murtagh, F. and Legendre, P. (2014). Ward’s hierarchical agglomerative clustering method: which algorithms implement Ward’s criterion? <i>Journal of Classification</i> 31(3): 274–295.' },
    rousseeuw: 'Rousseeuw, P.J. (1987). Silhouettes: a graphical aid to the interpretation and validation of cluster analysis. <i>Journal of Computational and Applied Mathematics</i> 20: 53–65.',
    brown: 'Brown, A.H.D. (1989). Core collections: a practical approach to genetic resources management. <i>Genome</i> 31(2): 818–824.',
    schoen: { es: 'Schoen, D.J. y Brown, A.H.D. (1993). Conservation of allelic richness in wild crop relatives is aided by assessment of genetic markers. <i>Proceedings of the National Academy of Sciences of the USA</i> 90(22): 10623–10627.',
      en: 'Schoen, D.J. and Brown, A.H.D. (1993). Conservation of allelic richness in wild crop relatives is aided by assessment of genetic markers. <i>Proceedings of the National Academy of Sciences of the USA</i> 90(22): 10623–10627.' },
    hu: { es: 'Hu, J., Zhu, J. y Xu, H.M. (2000). Methods of constructing core collections by stepwise clustering with three sampling strategies based on the genotypic values of crops. <i>Theoretical and Applied Genetics</i> 101(1–2): 264–268.',
      en: 'Hu, J., Zhu, J. and Xu, H.M. (2000). Methods of constructing core collections by stepwise clustering with three sampling strategies based on the genotypic values of crops. <i>Theoretical and Applied Genetics</i> 101(1–2): 264–268.' },
    ellis: { es: 'Ellis, R.H. y Roberts, E.H. (1980). Improved equations for the prediction of seed longevity. <i>Annals of Botany</i> 45(1): 13–30.',
      en: 'Ellis, R.H. and Roberts, E.H. (1980). Improved equations for the prediction of seed longevity. <i>Annals of Botany</i> 45(1): 13–30.' },
    kew: { es: 'Royal Botanic Gardens Kew. <i>Seed Information Database (SID)</i>. Consulta en línea.',
      en: 'Royal Botanic Gardens Kew. <i>Seed Information Database (SID)</i>. Online database.' },
    dwc: { es: 'Wieczorek, J., Bloom, D., Guralnick, R., Blum, S., Döring, M., Giovanni, R., Robertson, T. y Vieglais, D. (2012). Darwin Core: an evolving community-developed biodiversity data standard. <i>PLoS ONE</i> 7(1): e29715.',
      en: 'Wieczorek, J., Bloom, D., Guralnick, R., Blum, S., Döring, M., Giovanni, R., Robertson, T. and Vieglais, D. (2012). Darwin Core: an evolving community-developed biodiversity data standard. <i>PLoS ONE</i> 7(1): e29715.' },
    app: { es: `Barrera-Guzmán, L.Á. (${APP.year}). <i>${APP.title}</i> (versión ${APP.version}) [software]. ${APP.url}`,
      en: `Barrera-Guzmán, L.Á. (${APP.year}). <i>${APP.title}</i> (version ${APP.version}) [software]. ${APP.url}` },
  };
  /* cómo se reconoce en el texto de los métodos la cita de cada referencia:
     el apellido (o el nombre) y el año, a no más de unas palabras de distancia */
  const CITES = {
    mcpd: ['Alercia', 2015], fao: ['FAO', 2014], winkler: ['Winkler', 1990], ne: ['Natural Earth', null],
    hurlbert: ['Hurlbert', 1971], heck: ['Heck', 1975], chao: ['Chao', 1984], chao87: ['Chao', 1987],
    burnham: ['Burnham', 1978], good: ['Good', 1953], jaccard: ['Jaccard', 1912], sorensen: ['Sørensen', 1948],
    bray: ['Bray', 1957], sokal: ['Sokal', 1958], jost: ['Jost', 2006], mantel: ['Mantel', 1967],
    gap: ['Ramírez-Villegas', 2010], gower: ['Gower', 1971], ward: ['Murtagh', 2014], rousseeuw: ['Rousseeuw', 1987],
    brown: ['Brown', 1989], schoen: ['Schoen', 1993], hu: ['Hu', 2000], ellis: ['Ellis', 1980],
    kew: ['Royal Botanic Gardens Kew', null], dwc: ['Wieczorek', 2012], app: ['Barrera-Guzmán', APP.year],
  };
  function citeRegex(key) {
    const c = CITES[key];
    if (!c) return null;
    const who = c[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return c[1] == null ? new RegExp(who) : new RegExp(`${who}[^()]{0,40}?[ (]${c[1]}\\b`);
  }
  function refText(k, lang) {
    const r = REFS[k];
    if (!r) return '';
    return typeof r === 'string' ? r : (lang === 'en' ? r.en : r.es);
  }
  /* la bibliografía sale de las citas de los métodos que de verdad se
     redactaron: ni una de más, ni una de menos */
  function refKeys(D, lang) {
    const ks = [];
    methods(D, lang || 'es').forEach(m => (m.refs || []).forEach(k => { if (!ks.includes(k)) ks.push(k); }));
    return ks;
  }
  function references(D, lang) {
    const L = typeof lang === 'string' ? lang : 'es';
    return refKeys(D, L).map(k => refText(k, L))
      .sort((a, b) => a.replace(/<[^>]+>/g, '').localeCompare(b.replace(/<[^>]+>/g, ''), 'es'));
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
    /* las figuras se dibujan en el idioma del informe y con los colores del papel */
    const draw = (fn, w, h) => inLang(lang, () => inLight(() => figure(fn, w, h)));
    const S = D.summary;
    const ctyName = c => { const h = MCPD.COUNTRY_MAP[c]; return h ? (lang === 'en' ? h.en : h.es) : (c || '—'); };

    /* ---------- resumen ---------- */
    /* Los hallazgos se cuentan, y contar obliga a concordar: «1 accesión no
       tiene coordenadas», no «1 accesiones no tienen». */
    const pl = (n, uno, varios) => (n === 1 ? uno : varios).replace('#', fmtInt(n));
    /* un recuadro de stats([...]) que cuenta algo concuerda con su número:
       «1 coordenada con error claro», no «1 coordenadas». `shown` es la cifra
       que se escribe cuando no es el entero mismo (Chao1 trae decimales). */
    const cuenta = (n, es1, esN, en1, enN, shown) => [shown != null ? shown : fmtInt(n), L(n === 1 ? es1 : esN, n === 1 ? en1 : enN)];
    const hallazgos = [];
    if (D.quality) {
      /* los niveles de QC.audit son error, warn e info, igual que en el Bloque 3 */
      const conFix = D.quality.geo.filter(p => p.level === 'error' && p.fix).length;
      const sinFix = D.quality.geo.filter(p => p.level === 'error' && !p.fix).length;
      const nd = D.quality.dup.pairs.length;
      if (conFix) hallazgos.push(L(
        pl(conFix, '# coordenada no concuerda con el país declarado, y trae corrección propuesta.', '# coordenadas no concuerdan con el país declarado, y traen corrección propuesta.'),
        pl(conFix, '# coordinate disagrees with the declared country, and comes with a proposed fix.', '# coordinates disagree with the declared country, and come with a proposed fix.')));
      if (sinFix) hallazgos.push(L(
        pl(sinFix, '# coordenada tiene un error claro sin corrección automática.', '# coordenadas tienen un error claro sin corrección automática.'),
        pl(sinFix, '# coordinate has a clear error with no automatic fix.', '# coordinates have a clear error with no automatic fix.')));
      if (nd) hallazgos.push(L(
        pl(nd, '# par de accesiones se parece lo bastante como para revisarlo por duplicado.', '# pares de accesiones se parecen lo bastante como para revisarlos por duplicado.'),
        pl(nd, '# accession pair is similar enough to be reviewed as a duplicate.', '# accession pairs are similar enough to be reviewed as duplicates.')));
    }
    if (S && S.n) {
      const sinCoord = S.n - S.withCoords;
      if (sinCoord) hallazgos.push(L(
        pl(sinCoord, '# accesión no tiene coordenadas, y por eso no entra en los mapas ni en el análisis de vacíos.', '# accesiones no tienen coordenadas, y por eso no entran en los mapas ni en el análisis de vacíos.'),
        pl(sinCoord, '# accession has no coordinates, so it is absent from the maps and from the gap analysis.', '# accessions have no coordinates, so they are absent from the maps and from the gap analysis.')));
      /* como en el Bloque 8: el duplicado de seguridad se pide a lo que está
         ex situ; a una población in situ o en finca no se le pide */
      const sinDup = D.rows.filter(r => !['insitu', 'onfarm'].includes(MCPD.consRoute(r)) && !MCPD.hasSafetyDup(r)).length;
      if (sinDup) hallazgos.push(L(
        pl(sinDup, '# accesión conservada ex situ no tiene duplicado de seguridad en otra institución (a las in situ y en finca no se les pide).', '# accesiones conservadas ex situ no tienen duplicado de seguridad en otra institución (a las in situ y en finca no se les pide).'),
        pl(sinDup, '# accession conserved ex situ has no safety duplicate in another institution (in-situ and on-farm ones are not expected to).', '# accessions conserved ex situ have no safety duplicate in another institution (in-situ and on-farm ones are not expected to).')));
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
        cuenta(D.n, 'accesión', 'accesiones', 'accession', 'accessions'),
        S ? cuenta(S.taxa.length, 'taxón', 'taxones', 'taxon', 'taxa') : null,
        S ? cuenta(S.countries.length, 'país de origen', 'países de origen', 'country of origin', 'countries of origin') : null,
        S ? cuenta(S.routes.length, 'ruta de conservación', 'rutas de conservación', 'conservation route', 'conservation routes') : null,
        S ? [fmtInt(S.withCoords), L('con coordenadas', 'with coordinates')] : null,
        S ? [fmtInt(S.withDupl), L('con duplicado', 'with a safety duplicate')] : null,
      ])}
      ${hallazgos.length ? `<ul class="rlist">${hallazgos.map(h => `<li>${esc2(h)}</li>`).join('')}</ul>` : ''}`,
    });

    /* ---------- la colección ---------- */
    if (S) {
      const routeName = c => { const h = MCPD.GPCONS.find(x => x.c === c); return h ? (lang === 'en' ? h.en : h.es) : L('Sin declarar', 'Not declared'); };
      /* MCPD.summarize no cuenta las accesiones sin ruta: van en su renglón,
         para que la tabla sume la colección entera y el 100 % */
      const rutas = S.routes.slice();
      const sinRuta = D.n - rutas.reduce((a, t) => a + t[1], 0);
      if (sinRuta > 0) rutas.push(['', sinRuta]);
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
          rutas.map(t => [esc2(routeName(t[0])), fmtInt(t[1]), fmt(100 * t[1] / D.n, 1)]), { num: [1, 2] })}
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
          /* los niveles de QC.audit: error (diagnóstico claro), warn e info */
          cuenta(porNivel('error'), 'coordenada con error claro', 'coordenadas con error claro', 'coordinate with a clear error', 'coordinates with a clear error'),
          cuenta(porNivel('warn'), 'coordenada sospechosa', 'coordenadas sospechosas', 'suspicious coordinate', 'suspicious coordinates'),
          cuenta(q.consistency.length, 'aviso de consistencia', 'avisos de consistencia', 'consistency warning', 'consistency warnings'),
          cuenta(q.fixes.length, 'corrección propuesta', 'correcciones propuestas', 'proposed fix', 'proposed fixes'),
          cuenta(q.dup.pairs.length, 'par candidato a duplicado', 'pares candidatos a duplicado', 'candidate duplicate pair', 'candidate duplicate pairs'),
          cuenta((D.issues || []).length, 'aviso del pasaporte', 'avisos del pasaporte', 'passport warning', 'passport warnings'),
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
    /* las tablas y la nota van siempre que haya coordenadas; sólo la figura
       depende de «figuras» */
    if (D.hasMap) {
      const svg = o.figures ? draw(B4.drawMap, W, Math.round(W * 0.62)) : '';
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
          cuenta(A.total.S, 'tipo en total', 'tipos en total', 'type in total', 'types in total'),
          [fmt(A.total.H, 2), L('Shannon del conjunto', 'Shannon of the whole')],
          [fmt(A.beta, 2), L('beta de Whittaker', "Whittaker's beta")],
          A.chao1 ? cuenta(Math.round(A.chao1.est), 'tipo estimado (Chao1)', 'tipos estimados (Chao1)', 'estimated type (Chao1)', 'estimated types (Chao1)', fmt(A.chao1.est, 0)) : null,
          isFinite(A.total.coverage) ? [fmt(100 * A.total.coverage, 1) + ' %', L('cobertura del muestreo', 'sampling coverage')] : null,
        ])}
        ${tbl([L('Unidad', 'Unit'), 'n', L('Riqueza', 'Richness'), 'Shannon', 'Pielou', L('Exclusivos', 'Exclusive')],
          uni.map(u => [esc2(u.label), fmtInt(u.N), fmtInt(u.S), fmt(u.H, 2), isFinite(u.pielou) ? fmt(u.pielou, 2) : '—',
            /* cada unidad trae ya contados sus exclusivos (DIV.exclusives devuelve un Map) */
            fmtInt(u.exclusive || 0)]), { num: [1, 2, 3, 4, 5] })}
        ${o.figures ? fig(draw(B5.curvePlot, W, 260), L('Curva de acumulación de tipos con el número de accesiones.',
          'Accumulation curve of types against the number of accessions.')) : ''}
        ${A.chao1 && A.chao1.reliable === false ? `<p class="rnote">${L('El estimador Chao1 se apoya en el número de tipos vistos dos veces, y aquí hay muy pocos: tómese como una cota grosera y préstese más atención a Chao2 y a la navaja.',
          'The Chao1 estimator leans on the number of types seen twice, and here there are very few: treat it as a rough bound and give more weight to Chao2 and the jackknife.')}</p>` : ''}
        ${A.mantel && isFinite(A.mantel.r) ? `<p>${L(`Prueba de Mantel entre composición y ${A.mantel.dist === 'elev' ? 'diferencia de altitud entre franjas' : 'distancia geográfica'}: r = ${fmt(A.mantel.r, 3)}, p = ${fmt(A.mantel.p, 3)} con ${fmtInt(A.mantel.perms)} permutaciones sobre ${fmtInt(A.mantel.n)} unidades.`,
          `Mantel test between composition and ${A.mantel.dist === 'elev' ? 'elevation difference between belts' : 'geographic distance'}: r = ${fmt(A.mantel.r, 3)}, p = ${fmt(A.mantel.p, 3)} with ${fmtInt(A.mantel.perms)} permutations over ${fmtInt(A.mantel.n)} units.`)}</p>` : ''}`,
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
          cuenta(G.filled.length, 'celda con colecta', 'celdas con colecta', 'collected cell', 'collected cells'),
          cuenta(G.empty.length, 'celda vacía', 'celdas vacías', 'empty cell', 'empty cells'),
          G.complementarity ? cuenta(G.complementarity.order ? G.complementarity.order.length : 0, 'sitio del conjunto mínimo', 'sitios del conjunto mínimo', 'site in the minimum set', 'sites in the minimum set') : null,
        ])}
        ${o.figures ? fig(draw(B6.gapMap, W, Math.round(W * 0.62)), L('Celdas sin colectar y las diez prioridades mejor puntuadas.',
          'Uncollected cells and the ten highest scoring priorities.')) : ''}
        ${pr.length ? `<h4>${L('Prioridades de colecta', 'Collecting priorities')}</h4>${
          tbl(['#', L('Coordenada', 'Coordinate'), L('Entidad', 'State'), L('Distancia', 'Distance'), L('Puntaje', 'Score')],
            pr.map((c, i) => [String(i + 1), `${fmt(c.lat, 2)}, ${fmt(c.lon, 2)}`,
              esc2((GEO.MX_BY_CODE[c.stateCode] || {}).name || c.countryCode || '—'),
              isFinite(c.dist) ? fmt(c.dist, 0) + ' km' : '—', fmt(c.score, 1)]), { num: [0, 3, 4] })}` : ''}
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
      /* el color de la figura es lo que se eligió en «Colorear por» del Bloque 7 */
      const cb = (D.characView && D.characView.colorBy) || 'group';
      const colorEs = { group: 'el grupo del agrupamiento', crop: 'el cultivo', taxon: 'la especie', core: 'si la accesión está en el núcleo' }[cb] || 'el grupo del agrupamiento';
      const colorEn = { group: 'the cluster', crop: 'the crop', taxon: 'the species', core: 'whether the accession is in the core' }[cb] || 'the cluster';
      out.push({
        id: 'charac', title: L('Caracterización y colección núcleo', 'Characterization and core collection'),
        html: `${stats([
          cuenta(A.pairs.length, 'accesión caracterizada', 'accesiones caracterizadas', 'characterized accession', 'characterized accessions'),
          cuenta(A.used.length, 'descriptor', 'descriptores', 'descriptor', 'descriptors'),
          cuenta(A.core.core.length, 'accesión en el núcleo', 'accesiones en el núcleo', 'accession in the core', 'accessions in the core'),
          isFinite(A.sil && A.sil.mean) ? [fmt(A.sil.mean, 2), L('silueta media', 'mean silhouette')] : null,
        ])}
        ${o.figures ? fig(draw(B7.pcoaPlot, W, 340), L(`Coordenadas principales sobre la distancia de Gower; el color es ${colorEs} y el símbolo grande con borde marca las accesiones del núcleo.`,
          `Principal coordinates on Gower distance; colour shows ${colorEn} and the large outlined symbol marks the core accessions.`)) : ''}
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
      /* una fila por tipo de alerta, con un nombre genérico: el mensaje de un
         lote trae las cifras de ese lote y no sirve para los demás */
      const codeName = c => {
        const h = MANAGE.ALERT_NAMES && MANAGE.ALERT_NAMES[c.code];
        return h ? (lang === 'en' ? h.en : h.es) : c.code;
      };
      const rank = { crit: 0, warn: 1, info: 2 };
      const codes = M.codes.slice().sort((a, b) => (rank[a.level] ?? 3) - (rank[b.level] ?? 3) || b.n - a.n);
      out.push({
        id: 'manage', title: L('Manejo del banco', 'Genebank management'),
        html: `${stats([
          cuenta(M.lots.filter(l => l.st.levelName === 'crit').length, 'lote con alerta crítica', 'lotes con alerta crítica', 'lot with a critical alert', 'lots with a critical alert'),
          cuenta(M.lots.filter(l => l.st.levelName === 'warn').length, 'lote con aviso', 'lotes con aviso', 'lot with a warning', 'lots with a warning'),
          cuenta(M.lots.filter(l => l.st.projected != null).length, 'lote con viabilidad proyectada', 'lotes con viabilidad proyectada', 'lot with projected viability', 'lots with projected viability'),
          cuenta(M.lots.filter(l => l.st.alerts.some(a => a.code === 'noConstants')).length, 'lote sin constantes publicadas', 'lotes sin constantes publicadas', 'lot without published constants', 'lots without published constants'),
        ])}
        ${tbl([L('Alerta', 'Alert'), L('Lotes', 'Lots')],
          codes.map(c => [
            `<span class="lvl lvl-${c.level}"></span>${esc2(codeName(c))}`, fmtInt(c.n)]), { num: [1] })}
        ${o.figures ? fig(draw(B8.workPlot, W, 240), L('Trabajo que cae cada año en los próximos 25 (el año +0 incluye lo atrasado): pruebas, regeneraciones, resiembras y subcultivos.',
          'Work falling due each year over the next 25 (year +0 includes overdue work): tests, regenerations, replantings and subcultures.')) : ''}
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
      html: `<ol class="rrefs">${references(D, lang).map(r => `<li>${r}</li>`).join('')}</ol>`,
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
          esc2(ctyName(r.ORIGCTY)), esc2(r.COLLSITE), esc2(routeName(MCPD.consRoute(r))), (MANAGE.optNum(r.GP_STOCK) != null ? fmtInt(MANAGE.optNum(r.GP_STOCK)) : '—'),
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
.rfig > svg { width: 100%; height: auto; display: block; border: 1px solid #e3e3e3; border-radius: 4px; background: #fff; }
.rfig figcaption { font: italic 12.5px/1.45 Georgia, serif; color: #555; margin-top: 5px; }
.rnote { font-size: .88rem; color: #444; background: #f6f2fa; border-left: 3px solid #6b4a8f; padding: 7px 11px; margin: 10px 0; }
.rrefs { font-size: .88rem; padding-left: 20px; }
.rrefs li { margin-bottom: 5px; }
/* las leyendas en HTML que algunas figuras llevan debajo (mapa, PCoA, carga de trabajo) */
.map-legends { display: flex; flex-wrap: wrap; gap: 6px 22px; margin-top: 6px; }
.map-legend { font: 11.5px/1.35 system-ui, sans-serif; color: #555; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: 6px; }
.map-legend b { color: #1b1b1b; font-size: 11.5px; width: 100%; }
.map-legend .lg-item { display: inline-flex; align-items: center; gap: 5px; }
.map-legend i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; border: 1px solid #c8c8c8; }
.map-legend .lg-shape svg { flex: none; display: block; width: 13px; height: 13px; border: 0; }
.legend-ramp { display: flex; }
.legend-ramp i { width: 26px; height: 11px; border-radius: 0; border-left: 0; }
.legend-ramp i:first-child { border-radius: 3px 0 0 3px; border-left: 1px solid #c8c8c8; }
.legend-ramp i:last-child { border-radius: 0 3px 3px 0; }
.legend-scale { display: inline-flex; flex-direction: column; gap: 2px; }
.legend-ends { display: flex; justify-content: space-between; gap: 12px; font-size: 10.5px; line-height: 1.2; }
.legend-title { font-size: 10.5px; line-height: 1.2; color: #555; }
.muted { color: #777; }
table.rt .mono { white-space: nowrap; }
.lvl { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; background: #999; }
.lvl-crit { background: #b23b3b; } .lvl-warn { background: #c5761c; } .lvl-info { background: #5a7fa8; }
.rfoot { margin-top: 36px; padding-top: 10px; border-top: 1px solid #ddd; font-size: .8rem; color: #666; }
@media print {
  body { max-width: none; padding: 0; font-size: 10.5pt; }
  h2, h3, h4 { page-break-after: avoid; break-after: avoid; }
  .rfig, .rstats, table.rt tr { page-break-inside: avoid; break-inside: avoid; }
  /* una figura que no cabe salta entera a la hoja siguiente: en papel van
     más chicas, para que quepan donde caen y no dejen media hoja en blanco */
  .rfig > svg { width: 82%; margin: 0 auto; }
  .rfig figcaption { text-align: center; }
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
    gather, methods, references, inLang, svgOnly, APP, CITES, citeRegex, refKeys, refText,
  };
})();
