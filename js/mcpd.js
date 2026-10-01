/* GermplasmPro — el pasaporte de la accesión: los descriptores multicultivo
   de FAO/Bioversity (MCPD v2.1), sus listas de códigos, la validación campo
   por campo y el reconocimiento automático de las columnas de tu archivo.

   Fuente del estándar: Alercia, A., Diulgheroff, S. y Mackay, M. (2015).
   FAO/Bioversity multi-crop passport descriptors V.2.1. Bioversity
   International y FAO.

   Dos advertencias que la app repite también en pantalla:

   1) MCPD describe colecciones EX SITU. Una población conservada in situ o en
      la parcela de quien la siembra no tiene número de accesión ni tipo de
      almacenamiento, pero sí hay que registrarla. Por eso GermplasmPro añade
      unos pocos campos propios, marcados como EXTENSIÓN (su clave empieza con
      GP_), que nunca se confunden con los del estándar y que se exportan en un
      archivo aparte para no ensuciar el MCPD.

   2) La lista de países que trae la app es la de códigos ISO 3166-1 alfa-3 de
      uso más frecuente en germoplasma, no las 249 entradas del estándar: un
      código bien formado que no esté en la lista se acepta con un aviso suave,
      nunca se marca como error. */

(function () {

  /* ================= listas de códigos del estándar ================= */

  /* SAMPSTAT — estatus biológico de la accesión */
  const SAMPSTAT = [
    { c: '100', es: 'Silvestre', en: 'Wild' },
    { c: '110', es: 'Natural', en: 'Natural' },
    { c: '120', es: 'Seminatural/silvestre', en: 'Semi-natural/wild' },
    { c: '130', es: 'Seminatural/sembrada', en: 'Semi-natural/sown' },
    { c: '200', es: 'Arvense o maleza', en: 'Weedy' },
    { c: '300', es: 'Variedad tradicional o criolla (landrace)', en: 'Traditional cultivar/landrace' },
    { c: '400', es: 'Material de mejoramiento o investigación', en: 'Breeding/research material' },
    { c: '410', es: 'Línea de mejorador', en: "Breeder's line" },
    { c: '411', es: 'Población sintética', en: 'Synthetic population' },
    { c: '412', es: 'Híbrido', en: 'Hybrid' },
    { c: '413', es: 'Población base o fundadora', en: 'Founder stock/base population' },
    { c: '414', es: 'Línea endogámica', en: 'Inbred line' },
    { c: '415', es: 'Población segregante', en: 'Segregating population' },
    { c: '416', es: 'Selección clonal', en: 'Clonal selection' },
    { c: '420', es: 'Acervo genético (genetic stock)', en: 'Genetic stock' },
    { c: '421', es: 'Mutante', en: 'Mutant' },
    { c: '422', es: 'Acervo citogenético', en: 'Cytogenetic stocks' },
    { c: '423', es: 'Otro acervo genético', en: 'Other genetic stocks' },
    { c: '500', es: 'Cultivar avanzado o mejorado', en: 'Advanced or improved cultivar' },
    { c: '600', es: 'Organismo genéticamente modificado', en: 'GMO' },
    { c: '999', es: 'Otro', en: 'Other' },
  ];

  /* COLLSRC — fuente de colecta o adquisición */
  const COLLSRC = [
    { c: '10', es: 'Hábitat silvestre', en: 'Wild habitat' },
    { c: '11', es: 'Bosque o matorral arbolado', en: 'Forest or woodland' },
    { c: '12', es: 'Matorral', en: 'Shrubland' },
    { c: '13', es: 'Pastizal', en: 'Grassland' },
    { c: '14', es: 'Desierto o tundra', en: 'Desert or tundra' },
    { c: '15', es: 'Hábitat acuático', en: 'Aquatic habitat' },
    { c: '20', es: 'Hábitat cultivado', en: 'Farm or cultivated habitat' },
    { c: '21', es: 'Parcela o campo', en: 'Field' },
    { c: '22', es: 'Huerta', en: 'Orchard' },
    { c: '23', es: 'Huerto familiar o solar', en: 'Backyard, kitchen or home garden' },
    { c: '24', es: 'Terreno en descanso', en: 'Fallow land' },
    { c: '25', es: 'Agostadero o potrero', en: 'Pasture' },
    { c: '26', es: 'Troje o almacén del agricultor', en: 'Farm store' },
    { c: '27', es: 'Era de trilla', en: 'Threshing floor' },
    { c: '28', es: 'Parque', en: 'Park' },
    { c: '30', es: 'Mercado o tienda', en: 'Market or shop' },
    { c: '40', es: 'Instituto u organización de investigación', en: 'Institute, research organization, genebank' },
    { c: '50', es: 'Empresa de semillas', en: 'Seed company' },
    { c: '60', es: 'Hábitat ruderal o perturbado', en: 'Weedy, disturbed or ruderal habitat' },
    { c: '61', es: 'Orilla de camino', en: 'Roadside' },
    { c: '62', es: 'Orilla de parcela', en: 'Field margin' },
    { c: '99', es: 'Otro', en: 'Other' },
  ];

  /* STORAGE — tipo de almacenamiento del germoplasma (ex situ) */
  const STORAGE = [
    { c: '10', es: 'Colección de semillas', en: 'Seed collection', route: 'seed' },
    { c: '11', es: 'Semillas, corto plazo', en: 'Short term seed collection', route: 'seed' },
    { c: '12', es: 'Semillas, mediano plazo', en: 'Medium term seed collection', route: 'seed' },
    { c: '13', es: 'Semillas, largo plazo', en: 'Long term seed collection', route: 'seed' },
    { c: '20', es: 'Colección de campo', en: 'Field collection', route: 'field' },
    { c: '30', es: 'Colección in vitro', en: 'In vitro collection', route: 'invitro' },
    { c: '40', es: 'Colección criopreservada', en: 'Cryopreserved collection', route: 'cryo' },
    { c: '50', es: 'Colección de ADN', en: 'DNA collection', route: 'dna' },
    { c: '99', es: 'Otro', en: 'Other', route: '' },
  ];

  /* MLSSTAT — estatus en el Sistema Multilateral del Tratado Internacional */
  const MLSSTAT = [
    { c: '0', es: 'No está en el Sistema Multilateral', en: 'No' },
    { c: '1', es: 'Está en el Sistema Multilateral', en: 'Yes' },
    { c: '99', es: 'Otro', en: 'Other' },
  ];

  /* GEOREFMETH — cómo se obtuvieron las coordenadas */
  const GEOREFMETH = [
    { c: 'GPS', es: 'GPS', en: 'GPS' },
    { c: 'determined from map', es: 'Leídas de un mapa', en: 'Determined from map' },
    { c: 'gazetteer', es: 'Tomadas de un nomenclátor', en: 'Gazetteer' },
    { c: 'determined by locality description', es: 'Deducidas de la descripción del sitio', en: 'Determined by locality description' },
  ];

  /* ---- extensión de GermplasmPro: la ruta de conservación activa ----
     STORAGE no contempla la conservación in situ porque MCPD es un estándar
     ex situ. Estos códigos amplían el cuadro sin tocar el estándar. */
  const GPCONS = [
    { c: 'seed', es: 'Banco de semillas', en: 'Seed bank', kind: 'ex situ' },
    { c: 'field', es: 'Banco de campo o colección viva', en: 'Field genebank or living collection', kind: 'ex situ' },
    { c: 'invitro', es: 'Cultivo in vitro', en: 'In vitro culture', kind: 'ex situ' },
    { c: 'cryo', es: 'Criopreservación', en: 'Cryopreservation', kind: 'ex situ' },
    { c: 'dna', es: 'Banco de ADN', en: 'DNA bank', kind: 'ex situ' },
    { c: 'insitu', es: 'Reserva genética (in situ)', en: 'Genetic reserve (in situ)', kind: 'in situ' },
    { c: 'onfarm', es: 'Conservación en la parcela (on-farm)', en: 'On-farm conservation', kind: 'in situ' },
  ];

  /* países de uso frecuente, en ISO 3166-1 alfa-3 (lista parcial a propósito) */
  const COUNTRIES = [
    { c: 'MEX', es: 'México', en: 'Mexico' }, { c: 'GTM', es: 'Guatemala', en: 'Guatemala' },
    { c: 'BLZ', es: 'Belice', en: 'Belize' }, { c: 'HND', es: 'Honduras', en: 'Honduras' },
    { c: 'SLV', es: 'El Salvador', en: 'El Salvador' }, { c: 'NIC', es: 'Nicaragua', en: 'Nicaragua' },
    { c: 'CRI', es: 'Costa Rica', en: 'Costa Rica' }, { c: 'PAN', es: 'Panamá', en: 'Panama' },
    { c: 'CUB', es: 'Cuba', en: 'Cuba' }, { c: 'DOM', es: 'República Dominicana', en: 'Dominican Republic' },
    { c: 'HTI', es: 'Haití', en: 'Haiti' }, { c: 'JAM', es: 'Jamaica', en: 'Jamaica' },
    { c: 'PRI', es: 'Puerto Rico', en: 'Puerto Rico' }, { c: 'TTO', es: 'Trinidad y Tobago', en: 'Trinidad and Tobago' },
    { c: 'COL', es: 'Colombia', en: 'Colombia' }, { c: 'VEN', es: 'Venezuela', en: 'Venezuela' },
    { c: 'ECU', es: 'Ecuador', en: 'Ecuador' }, { c: 'PER', es: 'Perú', en: 'Peru' },
    { c: 'BOL', es: 'Bolivia', en: 'Bolivia' }, { c: 'CHL', es: 'Chile', en: 'Chile' },
    { c: 'ARG', es: 'Argentina', en: 'Argentina' }, { c: 'URY', es: 'Uruguay', en: 'Uruguay' },
    { c: 'PRY', es: 'Paraguay', en: 'Paraguay' }, { c: 'BRA', es: 'Brasil', en: 'Brazil' },
    { c: 'GUY', es: 'Guyana', en: 'Guyana' }, { c: 'SUR', es: 'Surinam', en: 'Suriname' },
    { c: 'USA', es: 'Estados Unidos', en: 'United States' }, { c: 'CAN', es: 'Canadá', en: 'Canada' },
    { c: 'ESP', es: 'España', en: 'Spain' }, { c: 'PRT', es: 'Portugal', en: 'Portugal' },
    { c: 'FRA', es: 'Francia', en: 'France' }, { c: 'ITA', es: 'Italia', en: 'Italy' },
    { c: 'DEU', es: 'Alemania', en: 'Germany' }, { c: 'NLD', es: 'Países Bajos', en: 'Netherlands' },
    { c: 'BEL', es: 'Bélgica', en: 'Belgium' }, { c: 'CHE', es: 'Suiza', en: 'Switzerland' },
    { c: 'AUT', es: 'Austria', en: 'Austria' }, { c: 'GBR', es: 'Reino Unido', en: 'United Kingdom' },
    { c: 'IRL', es: 'Irlanda', en: 'Ireland' }, { c: 'NOR', es: 'Noruega', en: 'Norway' },
    { c: 'SWE', es: 'Suecia', en: 'Sweden' }, { c: 'FIN', es: 'Finlandia', en: 'Finland' },
    { c: 'DNK', es: 'Dinamarca', en: 'Denmark' }, { c: 'POL', es: 'Polonia', en: 'Poland' },
    { c: 'CZE', es: 'Chequia', en: 'Czechia' }, { c: 'HUN', es: 'Hungría', en: 'Hungary' },
    { c: 'ROU', es: 'Rumania', en: 'Romania' }, { c: 'BGR', es: 'Bulgaria', en: 'Bulgaria' },
    { c: 'GRC', es: 'Grecia', en: 'Greece' }, { c: 'TUR', es: 'Turquía', en: 'Türkiye' },
    { c: 'RUS', es: 'Rusia', en: 'Russian Federation' }, { c: 'UKR', es: 'Ucrania', en: 'Ukraine' },
    { c: 'GEO', es: 'Georgia', en: 'Georgia' }, { c: 'ARM', es: 'Armenia', en: 'Armenia' },
    { c: 'AZE', es: 'Azerbaiyán', en: 'Azerbaijan' }, { c: 'KAZ', es: 'Kazajistán', en: 'Kazakhstan' },
    { c: 'UZB', es: 'Uzbekistán', en: 'Uzbekistan' }, { c: 'TJK', es: 'Tayikistán', en: 'Tajikistan' },
    { c: 'IRN', es: 'Irán', en: 'Iran' }, { c: 'IRQ', es: 'Irak', en: 'Iraq' },
    { c: 'SYR', es: 'Siria', en: 'Syria' }, { c: 'LBN', es: 'Líbano', en: 'Lebanon' },
    { c: 'ISR', es: 'Israel', en: 'Israel' }, { c: 'JOR', es: 'Jordania', en: 'Jordan' },
    { c: 'SAU', es: 'Arabia Saudita', en: 'Saudi Arabia' }, { c: 'YEM', es: 'Yemen', en: 'Yemen' },
    { c: 'EGY', es: 'Egipto', en: 'Egypt' }, { c: 'MAR', es: 'Marruecos', en: 'Morocco' },
    { c: 'DZA', es: 'Argelia', en: 'Algeria' }, { c: 'TUN', es: 'Túnez', en: 'Tunisia' },
    { c: 'LBY', es: 'Libia', en: 'Libya' }, { c: 'SDN', es: 'Sudán', en: 'Sudan' },
    { c: 'ETH', es: 'Etiopía', en: 'Ethiopia' }, { c: 'ERI', es: 'Eritrea', en: 'Eritrea' },
    { c: 'KEN', es: 'Kenia', en: 'Kenya' }, { c: 'UGA', es: 'Uganda', en: 'Uganda' },
    { c: 'TZA', es: 'Tanzania', en: 'Tanzania' }, { c: 'RWA', es: 'Ruanda', en: 'Rwanda' },
    { c: 'BDI', es: 'Burundi', en: 'Burundi' }, { c: 'COD', es: 'República Democrática del Congo', en: 'DR Congo' },
    { c: 'CMR', es: 'Camerún', en: 'Cameroon' }, { c: 'NGA', es: 'Nigeria', en: 'Nigeria' },
    { c: 'GHA', es: 'Ghana', en: 'Ghana' }, { c: 'CIV', es: 'Costa de Marfil', en: "Côte d'Ivoire" },
    { c: 'SEN', es: 'Senegal', en: 'Senegal' }, { c: 'MLI', es: 'Malí', en: 'Mali' },
    { c: 'BFA', es: 'Burkina Faso', en: 'Burkina Faso' }, { c: 'NER', es: 'Níger', en: 'Niger' },
    { c: 'TCD', es: 'Chad', en: 'Chad' }, { c: 'ZAF', es: 'Sudáfrica', en: 'South Africa' },
    { c: 'ZWE', es: 'Zimbabue', en: 'Zimbabwe' }, { c: 'ZMB', es: 'Zambia', en: 'Zambia' },
    { c: 'MOZ', es: 'Mozambique', en: 'Mozambique' }, { c: 'MWI', es: 'Malaui', en: 'Malawi' },
    { c: 'MDG', es: 'Madagascar', en: 'Madagascar' }, { c: 'AGO', es: 'Angola', en: 'Angola' },
    { c: 'IND', es: 'India', en: 'India' }, { c: 'PAK', es: 'Pakistán', en: 'Pakistan' },
    { c: 'BGD', es: 'Bangladés', en: 'Bangladesh' }, { c: 'NPL', es: 'Nepal', en: 'Nepal' },
    { c: 'LKA', es: 'Sri Lanka', en: 'Sri Lanka' }, { c: 'MMR', es: 'Birmania', en: 'Myanmar' },
    { c: 'THA', es: 'Tailandia', en: 'Thailand' }, { c: 'VNM', es: 'Vietnam', en: 'Viet Nam' },
    { c: 'LAO', es: 'Laos', en: 'Lao PDR' }, { c: 'KHM', es: 'Camboya', en: 'Cambodia' },
    { c: 'MYS', es: 'Malasia', en: 'Malaysia' }, { c: 'IDN', es: 'Indonesia', en: 'Indonesia' },
    { c: 'PHL', es: 'Filipinas', en: 'Philippines' }, { c: 'CHN', es: 'China', en: 'China' },
    { c: 'JPN', es: 'Japón', en: 'Japan' }, { c: 'KOR', es: 'Corea del Sur', en: 'Republic of Korea' },
    { c: 'PRK', es: 'Corea del Norte', en: "Democratic People's Republic of Korea" },
    { c: 'MNG', es: 'Mongolia', en: 'Mongolia' }, { c: 'AFG', es: 'Afganistán', en: 'Afghanistan' },
    { c: 'AUS', es: 'Australia', en: 'Australia' }, { c: 'NZL', es: 'Nueva Zelanda', en: 'New Zealand' },
    { c: 'PNG', es: 'Papúa Nueva Guinea', en: 'Papua New Guinea' }, { c: 'FJI', es: 'Fiyi', en: 'Fiji' },
  ];
  const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map(c => [c.c, c]));

  /* ================= los descriptores ================= */
  /* g = grupo; t = tipo; req: 'must' obligatorio, 'should' muy recomendable */
  const GROUPS = [
    { g: 'id', es: 'Identificación', en: 'Identification' },
    { g: 'tax', es: 'Taxonomía', en: 'Taxonomy' },
    { g: 'coll', es: 'Colecta', en: 'Collecting' },
    { g: 'site', es: 'Sitio y coordenadas', en: 'Site and coordinates' },
    { g: 'orig', es: 'Origen y estatus', en: 'Origin and status' },
    { g: 'don', es: 'Donante y duplicados', en: 'Donor and safety duplicates' },
    { g: 'cons', es: 'Conservación y disponibilidad', en: 'Conservation and availability' },
    { g: 'gp', es: 'Extensión GermplasmPro', en: 'GermplasmPro extension' },
  ];

  const FIELDS = [
    /* --- identificación --- */
    { k: 'PUID', g: 'id', t: 'text', es: 'Identificador único persistente', en: 'Persistent unique identifier',
      d: { es: 'Un identificador que no cambia nunca y que sirve fuera de tu banco: un DOI, un URN o una cadena única que tú generes.', en: 'An identifier that never changes and works outside your genebank: a DOI, a URN or a unique string you generate.' }, ex: 'doi:10.18730/ABC12' },
    { k: 'INSTCODE', g: 'id', t: 'inst', req: 'must', es: 'Código del instituto que conserva', en: 'Holding institute code',
      d: { es: 'Código WIEWS de la institución que mantiene la accesión: tres letras del país más tres dígitos.', en: 'WIEWS code of the institute maintaining the accession: the three-letter country code plus three digits.' }, ex: 'MEX006' },
    { k: 'ACCENUMB', g: 'id', t: 'text', req: 'must', es: 'Número de accesión', en: 'Accession number',
      d: { es: 'El identificador único de la accesión dentro de tu banco. No se repite y no se reutiliza cuando una accesión se da de baja.', en: 'The unique identifier of the accession within your genebank. It is never repeated and never reused when an accession is discarded.' }, ex: 'MEX-CR-0417' },
    { k: 'ACCENAME', g: 'id', t: 'text', es: 'Nombre de la accesión', en: 'Accession name',
      d: { es: 'El nombre con el que se conoce: el nombre local, el del cultivar o el que le dio quien la colectó. Varios nombres se separan con punto y coma.', en: 'The name it is known by: the local name, the cultivar name or the one given by the collector. Several names are separated with semicolons.' }, ex: 'Cónico norteño; Maíz azul' },
    { k: 'ACCEURL', g: 'id', t: 'text', es: 'Dirección web de la accesión', en: 'Accession URL',
      d: { es: 'La página donde se puede consultar la accesión en el catálogo público de tu institución.', en: 'The page where the accession can be consulted in your institution’s public catalogue.' }, ex: 'https://…' },
    { k: 'OTHERNUMB', g: 'id', t: 'text', es: 'Otros números de identificación', en: 'Other identification numbers',
      d: { es: 'Los números que la misma accesión tiene en otros bancos o colecciones, separados por punto y coma. Son la pista principal para detectar duplicados entre instituciones.', en: 'The numbers the same accession has in other genebanks or collections, separated by semicolons. They are the main clue for spotting duplicates between institutions.' }, ex: 'CIMMYTMA 2317; PI 484512' },

    /* --- taxonomía --- */
    { k: 'GENUS', g: 'tax', t: 'text', req: 'must', es: 'Género', en: 'Genus',
      d: { es: 'El género, con mayúscula inicial y sin abreviar.', en: 'The genus, capitalized and not abbreviated.' }, ex: 'Zea' },
    { k: 'SPECIES', g: 'tax', t: 'text', req: 'should', es: 'Epíteto específico', en: 'Species',
      d: { es: 'Sólo el epíteto, en minúsculas. Si no se conoce, se deja vacío o se pone «sp.».', en: 'The epithet only, in lower case. If unknown, leave it blank or write "sp.".' }, ex: 'mays' },
    { k: 'SPAUTHOR', g: 'tax', t: 'text', es: 'Autoridad de la especie', en: 'Species authority',
      d: { es: 'Quien describió la especie.', en: 'The authority for the species name.' }, ex: 'L.' },
    { k: 'SUBTAXA', g: 'tax', t: 'text', es: 'Infraespecífico', en: 'Subtaxa',
      d: { es: 'Subespecie, variedad botánica o forma, con su abreviatura de rango.', en: 'Subspecies, botanical variety or form, with its rank abbreviation.' }, ex: 'subsp. mexicana' },
    { k: 'SUBTAUTHOR', g: 'tax', t: 'text', es: 'Autoridad del infraespecífico', en: 'Subtaxa authority',
      d: { es: 'Quien describió el taxon infraespecífico.', en: 'The authority for the infraspecific taxon.' }, ex: '(Schrad.) H.H.Iltis' },
    { k: 'CROPNAME', g: 'tax', t: 'text', req: 'should', es: 'Nombre común del cultivo', en: 'Common crop name',
      d: { es: 'El nombre del cultivo en lenguaje corriente: maíz, frijol, papa, cacao. Es lo que la gente busca primero.', en: 'The crop name in everyday language: maize, bean, potato, cacao. It is what people search for first.' }, ex: 'Maíz' },

    /* --- colecta --- */
    { k: 'COLLNUMB', g: 'coll', t: 'text', es: 'Número de colecta', en: 'Collecting number',
      d: { es: 'El número original de la libreta de campo. Junto con el colector, identifica la colecta aunque la accesión cambie de banco.', en: 'The original number in the field notebook. Together with the collector, it identifies the collection even if the accession moves between genebanks.' }, ex: 'LAB-2019-033' },
    { k: 'COLLCODE', g: 'coll', t: 'inst', es: 'Código del instituto colector', en: 'Collecting institute code',
      d: { es: 'Código WIEWS de la institución que hizo la colecta.', en: 'WIEWS code of the institute that collected the sample.' }, ex: 'MEX006' },
    { k: 'COLLNAME', g: 'coll', t: 'text', es: 'Instituto colector', en: 'Collecting institute name',
      d: { es: 'Nombre de la institución colectora, cuando no hay código.', en: 'Name of the collecting institute, when there is no code.' }, ex: '' },
    { k: 'COLLINSTADDRESS', g: 'coll', t: 'text', es: 'Dirección del instituto colector', en: 'Collecting institute address',
      d: { es: 'Dirección postal de la institución colectora.', en: 'Postal address of the collecting institute.' }, ex: '' },
    { k: 'COLLMISSID', g: 'coll', t: 'text', es: 'Identificador de la misión de colecta', en: 'Collecting mission identifier',
      d: { es: 'El código de la salida de campo o del proyecto de colecta. Sirve para reunir todas las accesiones de un mismo viaje.', en: 'The code of the field trip or collecting project. It groups all accessions from the same journey.' }, ex: 'SIERRA-2019' },
    { k: 'COLLDATE', g: 'coll', t: 'date', req: 'should', es: 'Fecha de colecta', en: 'Collecting date',
      d: { es: 'En formato AAAAMMDD. Si no se conoce el día o el mes, se ponen guiones: 201907-- o 2019----.', en: 'In YYYYMMDD format. If the day or month is unknown, use hyphens: 201907-- or 2019----.' }, ex: '20190812' },
    { k: 'COLLSRC', g: 'coll', t: 'code', codes: COLLSRC, req: 'should', es: 'Fuente de colecta', en: 'Collecting source',
      d: { es: 'De dónde salió la muestra: del hábitat silvestre, de la parcela, del huerto familiar, de la troje, del mercado o de otro banco. Cambia por completo la interpretación de la accesión.', en: 'Where the sample came from: wild habitat, field, home garden, farm store, market or another genebank. It changes the interpretation of the accession completely.' }, ex: '26' },

    /* --- sitio --- */
    { k: 'ORIGCTY', g: 'site', t: 'country', req: 'should', es: 'País de origen', en: 'Country of origin',
      d: { es: 'Código ISO 3166-1 alfa-3 del país donde se colectó o se domesticó el material.', en: 'ISO 3166-1 alpha-3 code of the country where the material was collected or domesticated.' }, ex: 'MEX' },
    { k: 'COLLSITE', g: 'site', t: 'text', req: 'should', es: 'Sitio de colecta', en: 'Collecting site',
      d: { es: 'La descripción del lugar, de lo general a lo particular: estado, municipio, localidad y referencia. Es lo que permite volver.', en: 'The description of the place, from general to particular: state, municipality, locality and landmark. It is what lets you go back.' }, ex: 'Oaxaca, Santiago Apoala, 3 km al norte' },
    { k: 'DECLATITUDE', g: 'site', t: 'lat', req: 'should', es: 'Latitud decimal', en: 'Latitude (decimal)',
      d: { es: 'En grados decimales y con signo: negativa al sur del ecuador.', en: 'In decimal degrees, signed: negative south of the equator.' }, ex: '17.6423' },
    { k: 'DECLONGITUDE', g: 'site', t: 'lon', req: 'should', es: 'Longitud decimal', en: 'Longitude (decimal)',
      d: { es: 'En grados decimales y con signo: negativa al oeste de Greenwich. En América casi siempre es negativa.', en: 'In decimal degrees, signed: negative west of Greenwich. In the Americas it is nearly always negative.' }, ex: '-97.3311' },
    { k: 'LATITUDE', g: 'site', t: 'dms', es: 'Latitud en grados, minutos y segundos', en: 'Latitude (degrees, minutes, seconds)',
      d: { es: 'Formato antiguo del estándar: GGMMSSH, por ejemplo 173832N. La app lo convierte a decimal y al revés.', en: 'The legacy format of the standard: DDMMSSH, for example 173832N. The app converts it to decimal and back.' }, ex: '173832N' },
    { k: 'LONGITUDE', g: 'site', t: 'dms', es: 'Longitud en grados, minutos y segundos', en: 'Longitude (degrees, minutes, seconds)',
      d: { es: 'Formato antiguo del estándar: GGGMMSSH, por ejemplo 0971952W.', en: 'The legacy format of the standard: DDDMMSSH, for example 0971952W.' }, ex: '0971952W' },
    { k: 'COORDUNCERT', g: 'site', t: 'num', es: 'Incertidumbre de las coordenadas (m)', en: 'Coordinate uncertainty (m)',
      d: { es: 'El radio en metros dentro del cual está el sitio real. Una colecta ubicada «por el pueblo» puede tener varios kilómetros de incertidumbre, y eso hay que decirlo.', en: 'The radius in metres within which the real site lies. A collection located "near the village" may carry several kilometres of uncertainty, and that must be stated.' }, ex: '250' },
    { k: 'COORDDATUM', g: 'site', t: 'text', es: 'Datum geodésico', en: 'Coordinate datum',
      d: { es: 'El datum de las coordenadas; hoy casi siempre WGS84.', en: 'The datum of the coordinates; nowadays almost always WGS84.' }, ex: 'WGS84' },
    { k: 'GEOREFMETH', g: 'site', t: 'code', codes: GEOREFMETH, es: 'Método de georreferenciación', en: 'Georeferencing method',
      d: { es: 'Cómo se obtuvieron las coordenadas: con GPS, de un mapa, de un nomenclátor o deducidas de la descripción.', en: 'How the coordinates were obtained: GPS, from a map, from a gazetteer or inferred from the description.' }, ex: 'GPS' },
    { k: 'ELEVATION', g: 'site', t: 'num', req: 'should', es: 'Altitud (m)', en: 'Elevation (m)',
      d: { es: 'Metros sobre el nivel del mar del sitio de colecta. En un país de montaña es el descriptor ecológico más informativo que existe.', en: 'Metres above sea level of the collecting site. In a mountainous country it is the single most informative ecological descriptor.' }, ex: '2180' },

    /* --- origen y estatus --- */
    { k: 'SAMPSTAT', g: 'orig', t: 'code', codes: SAMPSTAT, req: 'should', es: 'Estatus biológico', en: 'Biological status',
      d: { es: 'Qué clase de material es: silvestre, arvense, variedad criolla, material de mejoramiento o cultivar mejorado.', en: 'What kind of material it is: wild, weedy, landrace, breeding material or improved cultivar.' }, ex: '300' },
    { k: 'ANCEST', g: 'orig', t: 'text', es: 'Genealogía', en: 'Ancestral data',
      d: { es: 'El pedigrí o el método de obtención, cuando se trata de material de mejoramiento.', en: 'The pedigree or the method of development, for breeding material.' }, ex: '' },
    { k: 'BREDCODE', g: 'orig', t: 'inst', es: 'Código del instituto fitomejorador', en: 'Breeding institute code',
      d: { es: 'Código WIEWS de quien desarrolló el material.', en: 'WIEWS code of the institute that bred the material.' }, ex: '' },
    { k: 'BREDNAME', g: 'orig', t: 'text', es: 'Instituto fitomejorador', en: 'Breeding institute name',
      d: { es: 'Nombre de quien desarrolló el material, cuando no hay código.', en: 'Name of the breeder, when there is no code.' }, ex: '' },
    { k: 'ACQDATE', g: 'orig', t: 'date', req: 'should', es: 'Fecha de ingreso al banco', en: 'Acquisition date',
      d: { es: 'Cuándo entró la accesión a la colección, en AAAAMMDD. No es la fecha de colecta.', en: 'When the accession entered the collection, in YYYYMMDD. It is not the collecting date.' }, ex: '20191104' },

    /* --- donante y duplicados --- */
    { k: 'DONORCODE', g: 'don', t: 'inst', es: 'Código del donante', en: 'Donor institute code',
      d: { es: 'Código WIEWS de la institución que donó la muestra.', en: 'WIEWS code of the institute that donated the sample.' }, ex: '' },
    { k: 'DONORNAME', g: 'don', t: 'text', es: 'Donante', en: 'Donor institute name',
      d: { es: 'Nombre de quien donó la muestra, cuando no hay código.', en: 'Name of the donor, when there is no code.' }, ex: '' },
    { k: 'DONORNUMB', g: 'don', t: 'text', es: 'Número del donante', en: 'Donor accession number',
      d: { es: 'El número que la accesión tenía en la colección del donante. Es la otra gran pista de duplicados.', en: 'The number the accession had in the donor’s collection. It is the other major duplicate clue.' }, ex: '' },
    { k: 'DUPLSITE', g: 'don', t: 'inst', es: 'Sitio del duplicado de seguridad', en: 'Safety duplicate site',
      d: { es: 'Código WIEWS del banco donde está el respaldo. Una accesión sin duplicado de seguridad está a una falla eléctrica de perderse.', en: 'WIEWS code of the genebank holding the backup. An accession with no safety duplicate is one power failure away from being lost.' }, ex: 'NOR051' },
    { k: 'DUPLINSTNAME', g: 'don', t: 'text', es: 'Institución del duplicado', en: 'Safety duplicate institute name',
      d: { es: 'Nombre del banco donde está el respaldo, cuando no hay código.', en: 'Name of the genebank holding the backup, when there is no code.' }, ex: '' },

    /* --- conservación --- */
    { k: 'STORAGE', g: 'cons', t: 'multicode', codes: STORAGE, req: 'should', es: 'Tipo de almacenamiento', en: 'Type of germplasm storage',
      d: { es: 'Cómo se conserva la accesión: semillas (corto, mediano o largo plazo), campo, in vitro, criopreservada o ADN. Puede tener varios valores separados por punto y coma, y así se documenta el respaldo.', en: 'How the accession is conserved: seed (short, medium or long term), field, in vitro, cryopreserved or DNA. It may hold several values separated by semicolons, which is how backups are documented.' }, ex: '13;40' },
    { k: 'MLSSTAT', g: 'cons', t: 'code', codes: MLSSTAT, es: 'Estatus en el Sistema Multilateral', en: 'MLS status',
      d: { es: 'Si la accesión está incluida en el Sistema Multilateral del Tratado Internacional (acceso con el ANTM).', en: 'Whether the accession is included in the Multilateral System of the International Treaty (access under the SMTA).' }, ex: '1' },
    { k: 'REMARKS', g: 'cons', t: 'text', es: 'Observaciones', en: 'Remarks',
      d: { es: 'Lo que no cabe en ningún otro campo. Conviene anteponer la clave del descriptor al que se refiere.', en: 'Whatever does not fit anywhere else. Prefix it with the field descriptor it refers to.' }, ex: '' },

    /* --- extensión de GermplasmPro (fuera del estándar) --- */
    { k: 'GP_CONS', g: 'gp', t: 'code', codes: GPCONS, gp: true, es: 'Ruta de conservación activa', en: 'Active conservation route',
      d: { es: 'La ruta con la que se maneja hoy el material, incluidas las dos que MCPD no contempla: reserva genética in situ y conservación en la parcela. Si está vacía, se deduce de STORAGE.', en: 'The route the material is managed by today, including the two MCPD does not cover: in-situ genetic reserve and on-farm conservation. If left blank, it is derived from STORAGE.' }, ex: 'seed' },
    { k: 'GP_SITEID', g: 'gp', t: 'text', gp: true, es: 'Identificador del sitio in situ', en: 'In-situ site identifier',
      d: { es: 'La clave de la reserva, del predio o de la parcela donde se conserva la población in situ.', en: 'The code of the reserve, holding or field where the population is conserved in situ.' }, ex: 'RES-APOALA-01' },
    { k: 'GP_KEEPER', g: 'gp', t: 'text', gp: true, es: 'Persona o comunidad custodia', en: 'Custodian farmer or community',
      d: { es: 'Quién conserva la población en su parcela, o la comunidad a la que pertenece el sitio. Va con su consentimiento.', en: 'Who keeps the population in their field, or the community the site belongs to. Recorded with their consent.' }, ex: '' },
    { k: 'GP_STOCK', g: 'gp', t: 'num', gp: true, es: 'Existencias', en: 'Stock',
      d: { es: 'Cuánto hay hoy: semillas en el frasco, plantas en la parcela, frascos in vitro o criotubos, según la ruta.', en: 'How much there is today: seeds in the jar, plants in the plot, in-vitro jars or cryovials, depending on the route.' }, ex: '2500' },
    { k: 'GP_GERMPCT', g: 'gp', t: 'num', gp: true, es: 'Última germinación (%)', en: 'Last germination (%)',
      d: { es: 'El resultado de la última prueba de viabilidad.', en: 'The result of the last viability test.' }, ex: '92' },
    { k: 'GP_GERMDATE', g: 'gp', t: 'date', gp: true, es: 'Fecha de la última prueba', en: 'Last test date',
      d: { es: 'Cuándo se hizo esa prueba, en AAAAMMDD. Una accesión sin prueba reciente es una accesión sin saber si vive.', en: 'When that test was done, in YYYYMMDD. An accession with no recent test is an accession you cannot vouch for.' }, ex: '20240310' },
    { k: 'GP_REGENDATE', g: 'gp', t: 'date', gp: true, es: 'Fecha de la última regeneración', en: 'Last regeneration date',
      d: { es: 'Cuándo se regeneró, resembró o subcultivó por última vez, en AAAAMMDD.', en: 'When it was last regenerated, replanted or subcultured, in YYYYMMDD.' }, ex: '20210615' },
  ];
  const FIELD_MAP = Object.fromEntries(FIELDS.map(f => [f.k, f]));
  const MCPD_FIELDS = FIELDS.filter(f => !f.gp);
  const GP_FIELDS = FIELDS.filter(f => f.gp);

  /* ================= utilidades de texto ================= */
  function norm(s) {
    return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  /* ================= coordenadas ================= */
  /* GGMMSSH -> decimal con signo. Acepta grados de 2 o 3 dígitos y minutos o
     segundos desconocidos escritos con guiones (MCPD lo permite). */
  function dmsToDec(s) {
    const t = String(s ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!t) return null;
    const m = /^(\d{2,3})(\d{2}|--)?(\d{2}|--)?([NSEW])$/.exec(t);
    if (!m) return null;
    const deg = Number(m[1]);
    const min = m[2] && m[2] !== '--' ? Number(m[2]) : 0;
    const sec = m[3] && m[3] !== '--' ? Number(m[3]) : 0;
    if (min > 59 || sec > 59) return null;
    const h = m[4];
    const isLat = h === 'N' || h === 'S';
    const dec = deg + min / 60 + sec / 3600;
    if (isLat && dec > 90) return null;
    if (!isLat && dec > 180) return null;
    return (h === 'S' || h === 'W') ? -dec : dec;
  }
  /* decimal -> GGMMSSH (dos dígitos de grado en latitud, tres en longitud) */
  function decToDms(v, isLat) {
    if (v == null || v === '' || !isFinite(Number(v))) return '';
    let x = Math.abs(Number(v));
    let deg = Math.floor(x);
    let min = Math.floor((x - deg) * 60);
    let sec = Math.round((((x - deg) * 60) - min) * 60);
    if (sec === 60) { sec = 0; min++; }
    if (min === 60) { min = 0; deg++; }
    const h = isLat ? (Number(v) < 0 ? 'S' : 'N') : (Number(v) < 0 ? 'W' : 'E');
    const dd = String(deg).padStart(isLat ? 2 : 3, '0');
    return `${dd}${String(min).padStart(2, '0')}${String(sec).padStart(2, '0')}${h}`;
  }

  /* ================= validación ================= */
  /* devuelve {level:'error'|'warn', msg:{es,en}} o null si el valor está bien */
  function validateValue(key, value, row) {
    const f = FIELD_MAP[key];
    const v = String(value ?? '').trim();
    if (!f) return null;
    if (!v) {
      /* un registro in situ no tiene almacenamiento, ni fecha de ingreso al
         banco, ni duplicado de seguridad: pedírselos sería ruido */
      const inSitu = row && ['insitu', 'onfarm'].includes(consRoute(row));
      if (inSitu && ['STORAGE', 'ACQDATE', 'DUPLSITE', 'INSTCODE'].includes(key)) return null;
      if (f.req === 'must') return { level: 'error', msg: { es: 'Falta un dato obligatorio.', en: 'A mandatory value is missing.' } };
      if (f.req === 'should') return { level: 'warn', msg: { es: 'Muy recomendable: sin este dato la accesión pierde valor.', en: 'Strongly recommended: without it the accession loses value.' } };
      return null;
    }
    switch (f.t) {
      case 'date': {
        if (!/^\d{4}(\d{2}|--)(\d{2}|--)$/.test(v)) return { level: 'error', msg: { es: 'La fecha debe ir en AAAAMMDD, con guiones donde no se sepa (2019----).', en: 'Dates must be YYYYMMDD, with hyphens where unknown (2019----).' } };
        const y = Number(v.slice(0, 4)), mo = v.slice(4, 6), d = v.slice(6, 8);
        const nowY = new Date().getFullYear();
        if (y < 1700 || y > nowY) return { level: 'error', msg: { es: `El año ${y} no es posible.`, en: `The year ${y} is not possible.` } };
        if (mo !== '--' && (Number(mo) < 1 || Number(mo) > 12)) return { level: 'error', msg: { es: 'El mes está fuera de 01–12.', en: 'The month is outside 01–12.' } };
        if (d !== '--' && (Number(d) < 1 || Number(d) > 31)) return { level: 'error', msg: { es: 'El día está fuera de 01–31.', en: 'The day is outside 01–31.' } };
        if (mo !== '--' && d !== '--') {
          const dt = new Date(Date.UTC(y, Number(mo) - 1, Number(d)));
          if (dt.getUTCMonth() !== Number(mo) - 1) return { level: 'error', msg: { es: 'Ese día no existe en ese mes.', en: 'That day does not exist in that month.' } };
        }
        return null;
      }
      case 'lat': case 'lon': {
        const x = Number(v.replace(',', '.'));
        if (!isFinite(x)) return { level: 'error', msg: { es: 'No es un número: las coordenadas van en grados decimales con punto.', en: 'Not a number: coordinates go in decimal degrees with a dot.' } };
        const lim = f.t === 'lat' ? 90 : 180;
        if (Math.abs(x) > lim) return { level: 'error', msg: { es: `Fuera del intervalo −${lim} a ${lim}.`, en: `Outside the −${lim} to ${lim} range.` } };
        if (x === 0) return { level: 'warn', msg: { es: 'Un cero exacto casi siempre es un dato faltante escrito como cero.', en: 'An exact zero is almost always a missing value written as zero.' } };
        return null;
      }
      case 'dms': {
        if (dmsToDec(v) == null) return { level: 'error', msg: { es: 'Formato GGMMSSH inválido (por ejemplo 173832N).', en: 'Invalid DDMMSSH format (for example 173832N).' } };
        return null;
      }
      case 'num': {
        const x = Number(v.replace(',', '.'));
        if (!isFinite(x)) return { level: 'error', msg: { es: 'No es un número.', en: 'Not a number.' } };
        if (key === 'ELEVATION' && (x < -430 || x > 6500)) return { level: 'warn', msg: { es: 'Altitud poco verosímil para un sitio de colecta.', en: 'Implausible elevation for a collecting site.' } };
        if (key === 'GP_GERMPCT' && (x < 0 || x > 100)) return { level: 'error', msg: { es: 'La germinación es un porcentaje de 0 a 100.', en: 'Germination is a percentage from 0 to 100.' } };
        if ((key === 'COORDUNCERT' || key === 'GP_STOCK') && x < 0) return { level: 'error', msg: { es: 'No puede ser negativo.', en: 'It cannot be negative.' } };
        return null;
      }
      case 'country': {
        if (!/^[A-Za-z]{3}$/.test(v)) return { level: 'error', msg: { es: 'El país va en código ISO 3166-1 alfa-3, de tres letras (MEX, GTM, PER).', en: 'Country goes as a three-letter ISO 3166-1 alpha-3 code (MEX, GTM, PER).' } };
        if (!COUNTRY_MAP[v.toUpperCase()]) return { level: 'warn', msg: { es: 'Código bien formado, pero no está en la lista que trae la app: verifícalo.', en: 'Well-formed code, but not in the list bundled with the app: check it.' } };
        return null;
      }
      case 'inst': {
        if (!/^[A-Za-z]{3}\d{3}$/.test(v)) return { level: 'warn', msg: { es: 'Un código WIEWS son tres letras de país más tres dígitos (MEX006).', en: 'A WIEWS code is three country letters plus three digits (MEX006).' } };
        return null;
      }
      case 'code': {
        const codes = (f.codes || []).map(c => String(c.c).toLowerCase());
        if (!codes.includes(v.toLowerCase())) return { level: 'error', msg: { es: 'El valor no está en la lista de códigos del descriptor.', en: 'The value is not in the descriptor’s code list.' } };
        return null;
      }
      case 'multicode': {
        const codes = (f.codes || []).map(c => String(c.c));
        const parts = v.split(';').map(s => s.trim()).filter(Boolean);
        const bad = parts.filter(p => !codes.includes(p));
        if (bad.length) return { level: 'error', msg: { es: `Códigos que no existen: ${bad.join(', ')}.`, en: `Codes that do not exist: ${bad.join(', ')}.` } };
        return null;
      }
      default:
        return null;
    }
  }

  /* validaciones que necesitan ver la fila completa */
  function validateRow(row) {
    const out = [];
    const push = (k, level, es, en) => out.push({ field: k, level, msg: { es, en } });

    for (const f of FIELDS) {
      const r = validateValue(f.k, row[f.k], row);
      if (r) out.push({ field: f.k, level: r.level, msg: r.msg });
    }

    /* coherencia entre los dos formatos de coordenadas */
    const dLat = row.DECLATITUDE, dLon = row.DECLONGITUDE;
    if (row.LATITUDE && dLat !== '' && dLat != null) {
      const a = dmsToDec(row.LATITUDE);
      if (a != null && Math.abs(a - Number(dLat)) > 0.02) push('LATITUDE', 'warn', 'La latitud en grados-minutos-segundos no coincide con la decimal.', 'The latitude in degrees-minutes-seconds does not match the decimal one.');
    }
    if (row.LONGITUDE && dLon !== '' && dLon != null) {
      const a = dmsToDec(row.LONGITUDE);
      if (a != null && Math.abs(a - Number(dLon)) > 0.02) push('LONGITUDE', 'warn', 'La longitud en grados-minutos-segundos no coincide con la decimal.', 'The longitude in degrees-minutes-seconds does not match the decimal one.');
    }
    /* una sola de las dos coordenadas no sirve para nada */
    const hasLat = dLat !== '' && dLat != null, hasLon = dLon !== '' && dLon != null;
    if (hasLat !== hasLon) push(hasLat ? 'DECLONGITUDE' : 'DECLATITUDE', 'error', 'Falta la otra coordenada: una sola no ubica nada.', 'The other coordinate is missing: one alone locates nothing.');

    /* orden de las fechas */
    const cd = dateNum(row.COLLDATE), ad = dateNum(row.ACQDATE);
    if (cd && ad && cd > ad) push('ACQDATE', 'warn', 'La accesión habría entrado al banco antes de ser colectada.', 'The accession would have entered the genebank before being collected.');
    const gd = dateNum(row.GP_GERMDATE), rd = dateNum(row.GP_REGENDATE);
    if (gd && ad && gd < ad) push('GP_GERMDATE', 'warn', 'La prueba de germinación es anterior al ingreso al banco.', 'The germination test predates the accession’s arrival.');
    if (rd && ad && rd < ad) push('GP_REGENDATE', 'warn', 'La regeneración es anterior al ingreso al banco.', 'The regeneration predates the accession’s arrival.');

    /* coherencia entre el estatus biológico y la fuente de colecta */
    const st = String(row.SAMPSTAT || ''), src = String(row.COLLSRC || '');
    if (st === '100' && ['21', '22', '23', '26', '27'].includes(src)) push('SAMPSTAT', 'warn', 'Dice silvestre pero se colectó en un sitio cultivado o en un almacén.', 'It says wild but was collected in a cultivated site or a store.');
    if (st === '300' && ['10', '11', '12', '13', '14', '15'].includes(src)) push('SAMPSTAT', 'warn', 'Dice variedad criolla pero se colectó en hábitat silvestre.', 'It says landrace but was collected in a wild habitat.');

    /* la ruta de conservación frente al tipo de almacenamiento */
    const cons = consRoute(row);
    if (cons && ['insitu', 'onfarm'].includes(cons) && row.STORAGE) push('STORAGE', 'warn', 'Un registro in situ no debería llevar tipo de almacenamiento ex situ: si tienes las dos cosas, conviene registrar dos accesiones enlazadas.', 'An in-situ record should not carry an ex-situ storage type: if you hold both, register two linked accessions.');
    if (cons && ['insitu', 'onfarm'].includes(cons) && !row.GP_SITEID) push('GP_SITEID', 'warn', 'Un registro in situ sin identificador de sitio no se puede volver a visitar.', 'An in-situ record with no site identifier cannot be revisited.');
    if (cons && !['insitu', 'onfarm'].includes(cons) && !row.DUPLSITE) push('DUPLSITE', 'warn', 'Sin duplicado de seguridad: la accesión depende de una sola instalación.', 'No safety duplicate: the accession depends on a single facility.');
    return out;
  }

  function dateNum(v) {
    const s = String(v ?? '').trim();
    if (!/^\d{4}/.test(s)) return 0;
    const y = s.slice(0, 4), mo = s.slice(4, 6), d = s.slice(6, 8);
    return Number(y + (mo === '--' || !mo ? '01' : mo) + (d === '--' || !d ? '01' : d));
  }

  /* la ruta de conservación de una fila: la declarada, o la que se deduce de
     STORAGE (el primer código gana, y los demás quedan como respaldo) */
  function consRoute(row) {
    const declared = String(row.GP_CONS || '').trim().toLowerCase();
    if (declared) return declared;
    const st = String(row.STORAGE || '').split(';').map(s => s.trim()).filter(Boolean);
    for (const code of st) {
      const hit = STORAGE.find(s => s.c === code);
      if (hit && hit.route) return hit.route;
    }
    return '';
  }
  function storageRoutes(row) {
    const st = String(row.STORAGE || '').split(';').map(s => s.trim()).filter(Boolean);
    const routes = st.map(c => (STORAGE.find(s => s.c === c) || {}).route).filter(Boolean);
    const cons = consRoute(row);
    if (cons && !routes.includes(cons)) routes.unshift(cons);
    return [...new Set(routes)];
  }

  /* ================= reconocimiento de columnas =================
     Los archivos reales llegan con encabezados en español, en inglés, con
     acentos, con puntos o directamente con la clave MCPD. */
  const SYNONYMS = {
    ACCENUMB: ['accenumb', 'numerodeaccesion', 'noaccesion', 'numaccesion', 'accesion', 'accessionnumber', 'accessionno', 'accno', 'idaccesion', 'clave'],
    ACCENAME: ['accename', 'nombredelaaccesion', 'nombreaccesion', 'accessionname', 'nombrelocal', 'nombrecomun', 'localname', 'nombre'],
    INSTCODE: ['instcode', 'codigoinstituto', 'institutocodigo', 'holdinginstitute', 'instituto', 'banco'],
    PUID: ['puid', 'identificadorpersistente', 'doi', 'persistentid'],
    ACCEURL: ['acceurl', 'url', 'enlace', 'link'],
    OTHERNUMB: ['othernumb', 'otrosnumeros', 'otronumero', 'othernumbers', 'sinonimos'],
    GENUS: ['genus', 'genero'],
    SPECIES: ['species', 'especie', 'epiteto', 'sp'],
    SPAUTHOR: ['spauthor', 'autoridad', 'autor', 'autoridadespecie'],
    SUBTAXA: ['subtaxa', 'infraespecifico', 'subespecie', 'variedadbotanica', 'subsp'],
    SUBTAUTHOR: ['subtauthor', 'autoridadsubtaxa'],
    CROPNAME: ['cropname', 'cultivo', 'nombredelcultivo', 'commonname', 'nombrecomundelcultivo', 'especiecomun'],
    COLLNUMB: ['collnumb', 'numerodecolecta', 'nocolecta', 'collectingnumber', 'colecta', 'numcolecta'],
    COLLCODE: ['collcode', 'institutocolector', 'collectinginstitutecode'],
    COLLNAME: ['collname', 'nombreinstitutocolector', 'colector', 'collector', 'recolector'],
    COLLINSTADDRESS: ['collinstaddress', 'direccioninstituto'],
    COLLMISSID: ['collmissid', 'mision', 'misiondecolecta', 'expedicion', 'proyecto'],
    COLLDATE: ['colldate', 'fechadecolecta', 'fechacolecta', 'collectingdate', 'fecha'],
    COLLSRC: ['collsrc', 'fuentedecolecta', 'fuente', 'collectingsource', 'tipodesitio'],
    ORIGCTY: ['origcty', 'paisdeorigen', 'pais', 'country', 'countryoforigin', 'iso3'],
    COLLSITE: ['collsite', 'sitiodecolecta', 'sitio', 'localidad', 'lugar', 'collectingsite', 'municipio', 'estado'],
    DECLATITUDE: ['declatitude', 'latituddecimal', 'latitud', 'latitude', 'lat', 'y'],
    DECLONGITUDE: ['declongitude', 'longituddecimal', 'longitud', 'longitude', 'lon', 'lng', 'long', 'x'],
    LATITUDE: ['latitudgms', 'latgms', 'latitudgradosminutossegundos'],
    LONGITUDE: ['longitudgms', 'longms', 'longitudgradosminutossegundos'],
    COORDUNCERT: ['coorduncert', 'incertidumbre', 'errorcoordenadas', 'uncertainty'],
    COORDDATUM: ['coorddatum', 'datum'],
    GEOREFMETH: ['georefmeth', 'metodogeorreferencia', 'metodogeorreferenciacion'],
    ELEVATION: ['elevation', 'altitud', 'altitudmsnm', 'msnm', 'elevacion', 'alt'],
    SAMPSTAT: ['sampstat', 'estatusbiologico', 'estadobiologico', 'biologicalstatus', 'tipodemate', 'tipodematerial'],
    ANCEST: ['ancest', 'genealogia', 'pedigri', 'pedigree'],
    BREDCODE: ['bredcode', 'institutomejorador'],
    BREDNAME: ['bredname', 'mejorador', 'obtentor'],
    ACQDATE: ['acqdate', 'fechadeingreso', 'fechaingreso', 'acquisitiondate', 'fecharegistro'],
    DONORCODE: ['donorcode', 'codigodonante'],
    DONORNAME: ['donorname', 'donante', 'donor'],
    DONORNUMB: ['donornumb', 'numerodonante', 'numerodeldonante'],
    DUPLSITE: ['duplsite', 'duplicadoseguridad', 'sitioduplicado', 'safetyduplicate', 'respaldo'],
    DUPLINSTNAME: ['duplinstname', 'institucionduplicado'],
    STORAGE: ['storage', 'tipodealmacenamiento', 'almacenamiento', 'conservacion', 'storagetype'],
    MLSSTAT: ['mlsstat', 'sistemamultilateral', 'mls'],
    REMARKS: ['remarks', 'observaciones', 'notas', 'comentarios'],
    GP_CONS: ['gpcons', 'rutadeconservacion', 'ruta', 'metododeconservacion', 'conservationroute'],
    GP_SITEID: ['gpsiteid', 'sitioinsitu', 'idsitio', 'reserva', 'siteid'],
    GP_KEEPER: ['gpkeeper', 'custodio', 'productor', 'agricultor', 'comunidad', 'custodian'],
    GP_STOCK: ['gpstock', 'existencias', 'inventario', 'semillas', 'numerodesemillas', 'stock', 'plantas'],
    GP_GERMPCT: ['gpgermpct', 'germinacion', 'porcentajedegerminacion', 'viabilidad', 'germination'],
    GP_GERMDATE: ['gpgermdate', 'fechadegerminacion', 'fechaprueba', 'fechadeprueba'],
    GP_REGENDATE: ['gpregendate', 'fechaderegeneracion', 'ultimaregeneracion', 'regeneracion', 'resiembra'],
  };
  const SYN_INDEX = (() => {
    const idx = {};
    for (const k of Object.keys(SYNONYMS)) {
      idx[norm(k)] = k;
      for (const s of SYNONYMS[k]) if (!(s in idx)) idx[s] = k;
    }
    return idx;
  })();

  /* devuelve { columna original -> clave MCPD } sin repetir destino.
     `sample` (unas filas del archivo) sirve para decidir lo que el encabezado
     no dice: si una columna de latitud trae 173832N o trae 17.6423. */
  function guessMapping(headers, sample) {
    const used = new Set(), map = {};
    /* primero las coincidencias exactas con la clave del estándar */
    headers.forEach(h => {
      const n = norm(h);
      if (FIELD_MAP[String(h).trim().toUpperCase()] && !used.has(String(h).trim().toUpperCase())) {
        const k = String(h).trim().toUpperCase();
        map[h] = k; used.add(k);
      } else if (SYN_INDEX[n] && !used.has(SYN_INDEX[n]) && n === norm(SYN_INDEX[n])) {
        map[h] = SYN_INDEX[n]; used.add(SYN_INDEX[n]);
      }
    });
    /* después los sinónimos */
    headers.forEach(h => {
      if (map[h]) return;
      const n = norm(h);
      const k = SYN_INDEX[n];
      if (k && !used.has(k)) { map[h] = k; used.add(k); }
    });
    /* y por último las coincidencias parciales, que son las que más ayudan con
       encabezados como "Latitud (grados decimales)" */
    headers.forEach(h => {
      if (map[h]) return;
      const n = norm(h);
      if (n.length < 3) return;
      let best = null;
      for (const syn of Object.keys(SYN_INDEX)) {
        if (syn.length < 4) continue;
        const k = SYN_INDEX[syn];
        if (used.has(k)) continue;
        if (n.startsWith(syn) || n.includes(syn)) {
          if (!best || syn.length > best.len) best = { k, len: syn.length };
        }
      }
      if (best) { map[h] = best.k; used.add(best.k); }
    });

    /* las coordenadas se deciden mirando los valores, no el encabezado */
    if (sample && sample.length) {
      const looksDMS = col => {
        const vals = sample.map(r => String(r[col] ?? '').trim()).filter(Boolean).slice(0, 10);
        if (!vals.length) return null;
        const dms = vals.filter(v => /^\d{2,3}(\d{2}|--)?(\d{2}|--)?[NSEWnsew]$/.test(v)).length;
        const dec = vals.filter(v => /^[-+]?\d{1,3}([.,]\d+)?$/.test(v)).length;
        if (dms / vals.length > 0.6) return true;
        if (dec / vals.length > 0.6) return false;
        return null;
      };
      const pairs = [['LATITUDE', 'DECLATITUDE'], ['LONGITUDE', 'DECLONGITUDE']];
      for (const [dmsKey, decKey] of pairs) {
        for (const col of Object.keys(map)) {
          const k = map[col];
          if (k !== dmsKey && k !== decKey) continue;
          const isDMS = looksDMS(col);
          if (isDMS == null) continue;
          const should = isDMS ? dmsKey : decKey;
          if (k === should) continue;
          const other = Object.keys(map).find(c => map[c] === should);
          if (other) { map[other] = k; }        /* las dos columnas se intercambian */
          map[col] = should;
        }
      }
    }
    return map;
  }

  /* una fila vacía con todos los campos */
  function emptyRow() {
    const r = {};
    for (const f of FIELDS) r[f.k] = '';
    return r;
  }

  /* pasa las filas del archivo al pasaporte, según el mapeo */
  function applyMapping(rows, mapping) {
    return rows.map(src => {
      const r = emptyRow();
      for (const col of Object.keys(mapping)) {
        const k = mapping[col];
        if (!k || !FIELD_MAP[k]) continue;
        let v = String(src[col] ?? '').trim();
        if (FIELD_MAP[k].t === 'lat' || FIELD_MAP[k].t === 'lon' || FIELD_MAP[k].t === 'num') v = v.replace(',', '.');
        if (FIELD_MAP[k].t === 'country') v = v.toUpperCase();
        r[k] = v;
      }
      /* si vinieron sólo las coordenadas en grados-minutos-segundos, se
         calculan las decimales, que son las que usan los mapas */
      if (!r.DECLATITUDE && r.LATITUDE) { const d = dmsToDec(r.LATITUDE); if (d != null) r.DECLATITUDE = String(Math.round(d * 1e6) / 1e6); }
      if (!r.DECLONGITUDE && r.LONGITUDE) { const d = dmsToDec(r.LONGITUDE); if (d != null) r.DECLONGITUDE = String(Math.round(d * 1e6) / 1e6); }
      return r;
    });
  }

  /* ================= resumen de la colección ================= */
  function summarize(rows) {
    const count = (fn) => {
      const m = new Map();
      rows.forEach(r => { const k = fn(r); if (k) m.set(k, (m.get(k) || 0) + 1); });
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const withCoords = rows.filter(r => r.DECLATITUDE !== '' && r.DECLONGITUDE !== '' && isFinite(Number(r.DECLATITUDE)) && isFinite(Number(r.DECLONGITUDE)));
    return {
      n: rows.length,
      taxa: count(r => [r.GENUS, r.SPECIES].filter(Boolean).join(' ')),
      crops: count(r => r.CROPNAME),
      countries: count(r => r.ORIGCTY),
      status: count(r => r.SAMPSTAT),
      routes: count(r => consRoute(r)),
      sources: count(r => r.COLLSRC),
      withCoords: withCoords.length,
      withDupl: rows.filter(r => String(r.DUPLSITE || '').trim()).length,
      elevations: rows.map(r => Number(r.ELEVATION)).filter(v => isFinite(v) && v !== 0),
      years: rows.map(r => Number(String(r.COLLDATE || '').slice(0, 4))).filter(y => y >= 1700),
    };
  }

  /* completitud: qué porcentaje de las accesiones trae cada descriptor */
  function completeness(rows) {
    return FIELDS.map(f => {
      const n = rows.filter(r => String(r[f.k] ?? '').trim() !== '').length;
      return { k: f.k, field: f, n, pct: rows.length ? 100 * n / rows.length : 0 };
    });
  }

  window.MCPD = {
    FIELDS, FIELD_MAP, MCPD_FIELDS, GP_FIELDS, GROUPS,
    SAMPSTAT, COLLSRC, STORAGE, MLSSTAT, GEOREFMETH, GPCONS, COUNTRIES, COUNTRY_MAP,
    SYNONYMS, norm, dmsToDec, decToDms, validateValue, validateRow, dateNum,
    consRoute, storageRoutes, guessMapping, emptyRow, applyMapping, summarize, completeness,
  };
})();
