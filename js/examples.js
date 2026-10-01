/* GermplasmPro — la colección de ejemplo.

   Un banco pequeño pero realista: accesiones de varias especies (cultivos
   anuales, árboles, cultivos de propagación vegetativa y parientes
   silvestres), de varios países, conservadas por las cinco rutas, y con
   errores TÍPICOS DE UN ARCHIVO REAL puestos a propósito para que el Bloque 3
   tenga trabajo: una longitud con el signo cambiado, un día que no existe, un
   país escrito con dos letras, una altitud imposible, un código de
   almacenamiento inventado, una accesión sin coordenadas, un estatus biológico
   que no concuerda con la fuente de colecta, fechas al revés y dos pares de
   accesiones que son la misma colecta entrada dos veces.

   Los sitios son localidades reales con coordenadas y altitudes aproximadas;
   los números de accesión, los nombres de las personas y las existencias son
   inventados. */

(function () {

  /* sitios de referencia: [nombre, país, lat, lon, altitud] */
  const SITES = {
    apoala: ['Oaxaca, Santiago Apoala', 'MEX', 17.6423, -97.3311, 2010],
    mitla: ['Oaxaca, San Pablo Villa de Mitla', 'MEX', 16.9230, -96.3597, 1690],
    sancris: ['Chiapas, San Cristóbal de Las Casas', 'MEX', 16.7370, -92.6376, 2120],
    ocosingo: ['Chiapas, Ocosingo, ejido Patihuitz', 'MEX', 16.9080, -92.0950, 900],
    uruapan: ['Michoacán, Uruapan', 'MEX', 19.4110, -102.0560, 1620],
    patzcuaro: ['Michoacán, Pátzcuaro', 'MEX', 19.5130, -101.6090, 2140],
    papantla: ['Veracruz, Papantla', 'MEX', 20.4470, -97.3210, 180],
    huatusco: ['Veracruz, Huatusco', 'MEX', 19.1490, -96.9660, 1340],
    coatepec: ['Veracruz, Coatepec', 'MEX', 19.4530, -96.9610, 1200],
    tequila: ['Jalisco, Tequila', 'MEX', 20.8830, -103.8360, 1200],
    cholula: ['Puebla, San Andrés Cholula', 'MEX', 19.0530, -98.3030, 2150],
    cuetzalan: ['Puebla, Cuetzalan del Progreso', 'MEX', 20.0190, -97.5190, 980],
    creel: ['Chihuahua, Bocoyna, Creel', 'MEX', 27.7510, -107.6350, 2340],
    valladolid: ['Yucatán, Valladolid', 'MEX', 20.6890, -88.2010, 25],
    texcoco: ['Estado de México, Texcoco', 'MEX', 19.5100, -98.8830, 2250],
    tlaxiaco: ['Oaxaca, Heroica Ciudad de Tlaxiaco', 'MEX', 17.2690, -97.6790, 2050],
    xela: ['Quetzaltenango, Cantel', 'GTM', 14.8080, -91.4540, 2330],
    solola: ['Sololá, Santa Cruz La Laguna', 'GTM', 14.7350, -91.2020, 1600],
    cusco: ['Cusco, Pisac', 'PER', -13.4240, -71.8490, 3000],
    puno: ['Puno, Chucuito', 'PER', -15.8930, -69.8890, 3850],
    lapaz: ['La Paz, Sorata', 'BOL', -15.7730, -68.6500, 2680],
    antioquia: ['Antioquia, Jardín', 'COL', 5.5980, -75.8190, 1750],
    addis: ['Oromia, Ambo', 'ETH', 8.9870, 37.8580, 2100],
    delhi: ['Uttarakhand, Almora', 'IND', 29.5970, 79.6590, 1640],
  };

  const S = k => SITES[k];

  /* una accesión: los campos que no se dan quedan vacíos */
  function acc(o) {
    const r = MCPD.emptyRow();
    Object.assign(r, o);
    return r;
  }
  /* rellena sitio, país y coordenadas desde la tabla de arriba */
  function at(key, jitter, seedn) {
    const s = S(key);
    const rnd = mulberry32((seedn || 1) * 7919);
    const j = jitter || 0;
    const lat = s[2] + (rnd() - 0.5) * j;
    const lon = s[3] + (rnd() - 0.5) * j;
    const ele = Math.round(s[4] + (rnd() - 0.5) * (j * 900));
    return {
      COLLSITE: s[0], ORIGCTY: s[1],
      DECLATITUDE: String(Math.round(lat * 1e4) / 1e4),
      DECLONGITUDE: String(Math.round(lon * 1e4) / 1e4),
      ELEVATION: String(ele),
      COORDDATUM: 'WGS84', GEOREFMETH: 'GPS', COORDUNCERT: '250',
    };
  }

  function build() {
    const rows = [];
    const inst = 'MEX006';
    let n = 0;
    const num = p => `${p}-${String(++n).padStart(4, '0')}`;

    /* ---------- maíces criollos: banco de semillas de largo plazo ---------- */
    const maices = [
      ['apoala', 'Cónico norteño', 'Maíz azul de Apoala', '20190812', 2],
      ['mitla', 'Bolita', 'Bolita amarillo', '20190815', 3],
      ['tlaxiaco', 'Mixteco', 'Maíz blanco de temporal', '20190818', 4],
      ['sancris', 'Olotón', 'Olotón de la montaña', '20190903', 5],
      ['cuetzalan', 'Arrocillo', 'Arrocillo amarillo', '20190910', 6],
      ['cholula', 'Cacahuacintle', 'Cacahuacintle de Cholula', '20191002', 7],
      ['creel', 'Azul de Chihuahua', 'Maíz rarámuri azul', '20191015', 8],
      ['valladolid', 'Nal-Tel', 'Nal-tel amarillo', '20191020', 9],
      ['xela', 'Salpor', 'Maíz salpor', '20200205', 10],
      ['solola', 'Olotillo', 'Olotillo de Sololá', '20200208', 11],
    ];
    maices.forEach(([site, raza, nombre, fecha, sd], i) => {
      rows.push(acc(Object.assign({
        INSTCODE: inst, ACCENUMB: num('MEX-ZM'), ACCENAME: nombre,
        GENUS: 'Zea', SPECIES: 'mays', SPAUTHOR: 'L.', CROPNAME: 'Maíz',
        COLLNUMB: `LAB-2019-${100 + i}`, COLLCODE: inst, COLLMISSID: i < 8 ? 'SIERRA-2019' : 'GUATE-2020',
        COLLDATE: fecha, COLLSRC: i % 3 === 0 ? '26' : '21',
        SAMPSTAT: '300', ACQDATE: '20191104',
        STORAGE: i % 4 === 0 ? '13;40' : '13', MLSSTAT: '1',
        DUPLSITE: i % 5 === 0 ? '' : 'NOR051',
        GP_CONS: 'seed', GP_STOCK: String(1800 + i * 130), GP_GERMPCT: String(88 + (i % 8)),
        GP_GERMDATE: '20240310', GP_REGENDATE: i % 3 === 0 ? '20210615' : '',
        REMARKS: `Raza ${raza}.`,
      }, at(site, 0.12, sd))));
    });

    /* ---------- parientes silvestres del maíz: in situ y semilla ---------- */
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-ZP'), ACCENAME: 'Teocintle de Balsas',
      GENUS: 'Zea', SPECIES: 'mays', SUBTAXA: 'subsp. parviglumis', SUBTAUTHOR: 'H.H.Iltis & Doebley',
      CROPNAME: 'Teocintle', COLLNUMB: 'LAB-2019-140', COLLCODE: inst, COLLMISSID: 'BALSAS-2019',
      COLLDATE: '20191108', COLLSRC: '10', SAMPSTAT: '100', ACQDATE: '20191220',
      STORAGE: '13', MLSSTAT: '1', DUPLSITE: 'NOR051',
      GP_CONS: 'seed', GP_STOCK: '900', GP_GERMPCT: '81', GP_GERMDATE: '20230914',
    }, at('uruapan', 0.3, 12))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-ZP'), ACCENAME: 'Población silvestre de teocintle, reserva',
      GENUS: 'Zea', SPECIES: 'mays', SUBTAXA: 'subsp. mexicana', CROPNAME: 'Teocintle',
      COLLNUMB: '', COLLDATE: '2021----', COLLSRC: '10', SAMPSTAT: '100',
      GP_CONS: 'insitu', GP_SITEID: 'RES-TEO-01', GP_KEEPER: 'Ejido de la sierra (con convenio)',
      GP_STOCK: '1200', GP_REGENDATE: '',
      REMARKS: 'Población monitoreada cada dos años; no hay muestra en cámara.',
    }, at('texcoco', 0.2, 13))));

    /* ---------- frijol, calabaza, chile, amaranto: semillas ---------- */
    const otros = [
      ['Phaseolus', 'vulgaris', 'Frijol', 'Frijol vaquita', 'mitla', '300', '21', 14],
      ['Phaseolus', 'coccineus', 'Frijol ayocote', 'Ayocote morado', 'sancris', '300', '23', 15],
      ['Cucurbita', 'pepo', 'Calabaza', 'Calabacita de milpa', 'cholula', '300', '21', 16],
      ['Cucurbita', 'moschata', 'Calabaza', 'Calabaza de Castilla', 'papantla', '300', '23', 17],
      ['Capsicum', 'annuum', 'Chile', 'Chile de árbol criollo', 'tequila', '300', '21', 18],
      ['Capsicum', 'annuum', 'Chile', 'Chile piquín silvestre', 'valladolid', '110', '60', 19],
      ['Amaranthus', 'hypochondriacus', 'Amaranto', 'Amaranto de Tulyehualco', 'cholula', '300', '21', 20],
      ['Physalis', 'philadelphica', 'Tomate de cáscara', 'Tomate milpero', 'cuetzalan', '300', '62', 21],
    ];
    otros.forEach(([g, sp, crop, nombre, site, stat, src, sd], i) => {
      rows.push(acc(Object.assign({
        INSTCODE: inst, ACCENUMB: num('MEX-SE'), ACCENAME: nombre,
        GENUS: g, SPECIES: sp, CROPNAME: crop,
        COLLNUMB: `LAB-2020-${200 + i}`, COLLCODE: inst, COLLMISSID: 'MILPA-2020',
        COLLDATE: `202008${String(10 + i).padStart(2, '0')}`, COLLSRC: src,
        SAMPSTAT: stat, ACQDATE: '20201125',
        STORAGE: '12', MLSSTAT: i % 2 ? '1' : '0', DUPLSITE: i % 3 ? 'NOR051' : '',
        GP_CONS: 'seed', GP_STOCK: String(1200 + i * 90), GP_GERMPCT: String(84 + (i % 10)),
        GP_GERMDATE: '20240410',
      }, at(site, 0.1, sd))));
    });

    /* ---------- cultivos de propagación vegetativa: in vitro y crio ---------- */
    rows.push(acc(Object.assign({
      INSTCODE: 'PER001', ACCENUMB: num('PER-ST'), ACCENAME: 'Papa nativa Huayro',
      GENUS: 'Solanum', SPECIES: 'tuberosum', SUBTAXA: 'subsp. andigenum', CROPNAME: 'Papa',
      COLLNUMB: 'AND-2018-07', COLLMISSID: 'ANDES-2018', COLLDATE: '20180322', COLLSRC: '21',
      SAMPSTAT: '300', ACQDATE: '20180901', STORAGE: '30;40', MLSSTAT: '1', DUPLSITE: 'PER001',
      GP_CONS: 'invitro', GP_STOCK: '24', GP_REGENDATE: '20240118',
      REMARKS: 'Veinticuatro frascos en crecimiento lento; respaldo criopreservado de ápices.',
    }, at('cusco', 0.15, 22))));
    rows.push(acc(Object.assign({
      INSTCODE: 'PER001', ACCENUMB: num('PER-ST'), ACCENAME: 'Papa amarga Luk’i',
      GENUS: 'Solanum', SPECIES: 'juzepczukii', CROPNAME: 'Papa amarga',
      COLLNUMB: 'AND-2018-19', COLLMISSID: 'ANDES-2018', COLLDATE: '20180330', COLLSRC: '21',
      SAMPSTAT: '300', ACQDATE: '20180901', STORAGE: '40', MLSSTAT: '1',
      GP_CONS: 'cryo', GP_STOCK: '180', REMARKS: 'Criotubos con ápices; recuperación del 46 % en la última prueba.',
    }, at('puno', 0.15, 23))));
    rows.push(acc(Object.assign({
      INSTCODE: 'BOL004', ACCENUMB: num('BOL-OC'), ACCENAME: 'Oca rosada',
      GENUS: 'Oxalis', SPECIES: 'tuberosa', CROPNAME: 'Oca',
      COLLNUMB: 'AND-2018-44', COLLMISSID: 'ANDES-2018', COLLDATE: '20180405', COLLSRC: '21',
      SAMPSTAT: '300', ACQDATE: '20181010', STORAGE: '20;30',
      GP_CONS: 'field', GP_STOCK: '60', GP_REGENDATE: '20230920',
    }, at('lapaz', 0.15, 24))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-AG'), ACCENAME: 'Agave espadín',
      GENUS: 'Agave', SPECIES: 'angustifolia', CROPNAME: 'Agave',
      COLLNUMB: 'LAB-2021-311', COLLDATE: '20210518', COLLSRC: '21', SAMPSTAT: '300',
      ACQDATE: '20210720', STORAGE: '20', GP_CONS: 'field', GP_STOCK: '85', GP_REGENDATE: '20210720',
      REMARKS: 'Colección viva; los hijuelos se resiembran cada seis años.',
    }, at('tequila', 0.2, 25))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-VA'), ACCENAME: 'Vainilla de Papantla',
      GENUS: 'Vanilla', SPECIES: 'planifolia', CROPNAME: 'Vainilla',
      COLLNUMB: 'LAB-2021-330', COLLDATE: '20210610', COLLSRC: '22', SAMPSTAT: '300',
      ACQDATE: '20210805', STORAGE: '30', GP_CONS: 'invitro', GP_STOCK: '30',
      GP_REGENDATE: '20240220', DUPLSITE: 'MEX006',
    }, at('papantla', 0.1, 26))));

    /* ---------- árboles y recalcitrantes: colección viva ---------- */
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-PA'), ACCENAME: 'Aguacate criollo de Uruapan',
      GENUS: 'Persea', SPECIES: 'americana', SUBTAXA: 'var. drymifolia', CROPNAME: 'Aguacate',
      COLLNUMB: 'LAB-2017-055', COLLDATE: '20170714', COLLSRC: '23', SAMPSTAT: '300',
      ACQDATE: '20171101', STORAGE: '20', GP_CONS: 'field', GP_STOCK: '12',
      GP_REGENDATE: '20171101', DUPLSITE: 'MEX006',
      REMARKS: 'Doce árboles injertados en la colección viva.',
    }, at('uruapan', 0.1, 27))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-TC'), ACCENAME: 'Cacao criollo de Ocosingo',
      GENUS: 'Theobroma', SPECIES: 'cacao', CROPNAME: 'Cacao',
      COLLNUMB: 'LAB-2017-081', COLLDATE: '20170920', COLLSRC: '22', SAMPSTAT: '300',
      ACQDATE: '20180215', STORAGE: '20;30', GP_CONS: 'field', GP_STOCK: '20',
      GP_REGENDATE: '20180215',
    }, at('ocosingo', 0.12, 28))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-CA'), ACCENAME: 'Café typica de sombra',
      GENUS: 'Coffea', SPECIES: 'arabica', CROPNAME: 'Café',
      COLLNUMB: 'LAB-2018-014', COLLDATE: '20180411', COLLSRC: '22', SAMPSTAT: '300',
      ACQDATE: '20180820', STORAGE: '20', GP_CONS: 'field', GP_STOCK: '45',
      REMARKS: 'Semilla intermedia: no se conserva en cámara a −18 °C.',
    }, at('coatepec', 0.1, 29))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-SE'), ACCENAME: 'Chayote verde liso',
      GENUS: 'Sechium', SPECIES: 'edule', CROPNAME: 'Chayote',
      COLLNUMB: 'LAB-2018-102', COLLDATE: '20180615', COLLSRC: '23', SAMPSTAT: '300',
      ACQDATE: '20180910', STORAGE: '20', GP_CONS: 'field', GP_STOCK: '40',
      GP_REGENDATE: '20230704',
    }, at('huatusco', 0.08, 30))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-SE'), ACCENAME: 'Chayote erizo (cuspidatum)',
      GENUS: 'Sechium', SPECIES: 'edule', SUBTAXA: 'var. nigrum spinosum', CROPNAME: 'Chayote',
      COLLNUMB: 'LAB-2018-103', COLLDATE: '20180616', COLLSRC: '23', SAMPSTAT: '300',
      ACQDATE: '20180910', STORAGE: '20;30', GP_CONS: 'field', GP_STOCK: '28',
      GP_REGENDATE: '20230704',
    }, at('huatusco', 0.08, 31))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-QU'), ACCENAME: 'Encino rojo, rodal semillero',
      GENUS: 'Quercus', SPECIES: 'crassifolia', CROPNAME: 'Encino',
      COLLDATE: '2020----', COLLSRC: '11', SAMPSTAT: '100',
      GP_CONS: 'insitu', GP_SITEID: 'RES-SIERRA-04', GP_KEEPER: 'Comunidad forestal (convenio 2020)',
      GP_STOCK: '350',
      REMARKS: 'Bellota recalcitrante: la conservación es in situ, con ensayo de procedencia en vivero.',
    }, at('sancris', 0.25, 32))));

    /* ---------- material de otros bancos ---------- */
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-TR'), ACCENAME: 'Trigo harinero, línea avanzada',
      GENUS: 'Triticum', SPECIES: 'aestivum', CROPNAME: 'Trigo',
      DONORCODE: 'MEX002', DONORNAME: 'Banco de trigo', DONORNUMB: 'WHT-22194',
      OTHERNUMB: 'CIMMYTWH 22194', COLLDATE: '2016----', COLLSRC: '40', SAMPSTAT: '410',
      ACQDATE: '20161118', STORAGE: '13', MLSSTAT: '1', DUPLSITE: 'NOR051',
      GP_CONS: 'seed', GP_STOCK: '3200', GP_GERMPCT: '95', GP_GERMDATE: '20230620',
    }, at('texcoco', 0.05, 33))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('ETH-EC'), ACCENAME: 'Cebada etíope de altura',
      GENUS: 'Hordeum', SPECIES: 'vulgare', CROPNAME: 'Cebada',
      DONORCODE: 'ETH085', DONORNUMB: 'EBI-3391', OTHERNUMB: 'EBI 3391',
      COLLDATE: '20150908', COLLSRC: '21', SAMPSTAT: '300', ACQDATE: '20160301',
      STORAGE: '13', MLSSTAT: '1', GP_CONS: 'seed', GP_STOCK: '1500',
      GP_GERMPCT: '90', GP_GERMDATE: '20220715',
    }, at('addis', 0.2, 34))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('IND-AM'), ACCENAME: 'Amaranto de Almora',
      GENUS: 'Amaranthus', SPECIES: 'caudatus', CROPNAME: 'Amaranto',
      DONORCODE: 'IND001', DONORNUMB: 'IC-42551', COLLDATE: '20140917', COLLSRC: '21',
      SAMPSTAT: '300', ACQDATE: '20150420', STORAGE: '12', MLSSTAT: '1',
      GP_CONS: 'seed', GP_STOCK: '800', GP_GERMPCT: '86', GP_GERMDATE: '20210510',
    }, at('delhi', 0.2, 35))));
    rows.push(acc(Object.assign({
      INSTCODE: 'COL003', ACCENUMB: num('COL-MA'), ACCENAME: 'Yuca amarga regional',
      GENUS: 'Manihot', SPECIES: 'esculenta', CROPNAME: 'Yuca',
      COLLNUMB: 'COL-2019-077', COLLDATE: '20190624', COLLSRC: '21', SAMPSTAT: '300',
      ACQDATE: '20191015', STORAGE: '30;40', GP_CONS: 'invitro', GP_STOCK: '18',
      GP_REGENDATE: '20240105', DUPLSITE: 'COL003',
    }, at('antioquia', 0.15, 36))));

    /* ---------- conservación en la parcela (on-farm) ---------- */
    [['apoala', 'Maíz azul, milpa de don Aurelio', 37], ['cuetzalan', 'Maíz arrocillo, parcela comunitaria', 38],
     ['patzcuaro', 'Frijol enredador de la isla', 39]].forEach(([site, nombre, sd], i) => {
      rows.push(acc(Object.assign({
        INSTCODE: inst, ACCENUMB: num('MEX-OF'), ACCENAME: nombre,
        GENUS: i === 2 ? 'Phaseolus' : 'Zea', SPECIES: i === 2 ? 'vulgaris' : 'mays',
        CROPNAME: i === 2 ? 'Frijol' : 'Maíz',
        COLLDATE: '2022----', COLLSRC: '21', SAMPSTAT: '300',
        GP_CONS: 'onfarm', GP_SITEID: `PARCELA-${String(i + 1).padStart(2, '0')}`,
        GP_KEEPER: 'Familia custodia (con consentimiento informado)',
        GP_STOCK: String(300 + i * 150),
        REMARKS: 'Se siembra cada año; se visita al final del ciclo.',
      }, at(site, 0.05, sd))));
    });

    /* =====================================================================
       Los errores que se pusieron a propósito. Cada uno lleva su comentario.
       ===================================================================== */

    /* 1. longitud positiva en México: el signo se perdió al pasar por una hoja de cálculo */
    rows.push(acc({
      INSTCODE: inst, ACCENUMB: num('MEX-ZM'), ACCENAME: 'Tuxpeño de la costa',
      GENUS: 'Zea', SPECIES: 'mays', CROPNAME: 'Maíz',
      COLLNUMB: 'LAB-2019-151', COLLDATE: '20191112', COLLSRC: '21', SAMPSTAT: '300',
      ACQDATE: '20200210', STORAGE: '13', MLSSTAT: '1', DUPLSITE: 'NOR051',
      COLLSITE: 'Veracruz, Tlalixcoyan', ORIGCTY: 'MEX',
      DECLATITUDE: '18.8100', DECLONGITUDE: '96.0600', ELEVATION: '20',
      COORDDATUM: 'WGS84', GEOREFMETH: 'GPS',
      GP_CONS: 'seed', GP_STOCK: '2100', GP_GERMPCT: '93', GP_GERMDATE: '20240310',
    }));

    /* 2. fecha imposible: 30 de febrero */
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-CU'), ACCENAME: 'Calabaza pipiana',
      GENUS: 'Cucurbita', SPECIES: 'argyrosperma', CROPNAME: 'Calabaza',
      COLLNUMB: 'LAB-2019-160', COLLDATE: '20190230', COLLSRC: '21', SAMPSTAT: '300',
      ACQDATE: '20190815', STORAGE: '12', GP_CONS: 'seed', GP_STOCK: '640',
      GP_GERMPCT: '88', GP_GERMDATE: '20230811',
    }, at('cholula', 0.1, 40))));

    /* 3. país con dos letras y altitud imposible */
    rows.push(acc({
      INSTCODE: inst, ACCENUMB: num('MEX-PH'), ACCENAME: 'Frijol tepari',
      GENUS: 'Phaseolus', SPECIES: 'acutifolius', CROPNAME: 'Frijol tepari',
      COLLNUMB: 'LAB-2019-165', COLLDATE: '20191122', COLLSRC: '10', SAMPSTAT: '110',
      ACQDATE: '20200210', STORAGE: '13', COLLSITE: 'Sonora, Álamos', ORIGCTY: 'MX',
      DECLATITUDE: '27.0280', DECLONGITUDE: '-108.9370', ELEVATION: '25000',
      GP_CONS: 'seed', GP_STOCK: '430', GP_GERMPCT: '79', GP_GERMDATE: '20230118',
    }));

    /* 4. código de almacenamiento inventado (15 no existe en MCPD) */
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-CH'), ACCENAME: 'Chile costeño',
      GENUS: 'Capsicum', SPECIES: 'annuum', CROPNAME: 'Chile',
      COLLNUMB: 'LAB-2020-240', COLLDATE: '20200912', COLLSRC: '30', SAMPSTAT: '300',
      ACQDATE: '20201125', STORAGE: '15', GP_STOCK: '520', GP_GERMPCT: '90', GP_GERMDATE: '20240410',
    }, at('mitla', 0.1, 41))));

    /* 5. sin coordenadas y con el sitio descrito de memoria */
    rows.push(acc({
      INSTCODE: inst, ACCENUMB: num('MEX-ZM'), ACCENAME: 'Maíz ancho de riego',
      GENUS: 'Zea', SPECIES: 'mays', CROPNAME: 'Maíz',
      COLLNUMB: 'LAB-2016-002', COLLDATE: '2016----', COLLSRC: '26', SAMPSTAT: '300',
      ACQDATE: '20161201', STORAGE: '13', COLLSITE: 'Por el rumbo de Guerrero', ORIGCTY: 'MEX',
      GP_CONS: 'seed', GP_STOCK: '1150', GP_GERMPCT: '72', GP_GERMDATE: '20190902',
      REMARKS: 'La libreta de campo se perdió; el sitio se anotó de memoria.',
    }));

    /* 6. estatus silvestre pero colectado en la troje, y fechas al revés */
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-ZM'), ACCENAME: 'Maíz reventador',
      GENUS: 'Zea', SPECIES: 'mays', CROPNAME: 'Maíz',
      COLLNUMB: 'LAB-2020-255', COLLDATE: '20201010', COLLSRC: '26', SAMPSTAT: '100',
      ACQDATE: '20190105', STORAGE: '13', GP_CONS: 'seed', GP_STOCK: '980',
      GP_GERMPCT: '91', GP_GERMDATE: '20240310',
    }, at('creel', 0.12, 42))));

    /* 7 y 8. dos pares de duplicados: la misma colecta entrada dos veces, con
       el nombre escrito distinto y el número de colecta repetido */
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-ZM'), ACCENAME: 'BOLITA  AMARILLO',
      GENUS: 'Zea', SPECIES: 'mays', CROPNAME: 'Maiz',
      COLLNUMB: 'LAB-2019-101', COLLCODE: inst, COLLMISSID: 'SIERRA-2019',
      COLLDATE: '20190815', COLLSRC: '21', SAMPSTAT: '300', ACQDATE: '20200115',
      STORAGE: '13', GP_CONS: 'seed', GP_STOCK: '1400', GP_GERMPCT: '89', GP_GERMDATE: '20240310',
      REMARKS: 'Entró otra vez al catálogo al digitalizar la libreta vieja.',
    }, at('mitla', 0.02, 3))));
    rows.push(acc(Object.assign({
      INSTCODE: inst, ACCENUMB: num('MEX-SE'), ACCENAME: 'Chayote verde liso ',
      GENUS: 'Sechium', SPECIES: 'edule', CROPNAME: 'Chayote',
      COLLNUMB: 'LAB-2018-102', COLLDATE: '20180615', COLLSRC: '23', SAMPSTAT: '300',
      ACQDATE: '20190130', STORAGE: '20', GP_CONS: 'field', GP_STOCK: '15',
      DONORNUMB: 'HUA-102',
    }, at('huatusco', 0.02, 30))));

    return rows;
  }

  /* ---------- caracterización morfológica de ejemplo ----------
     Doce descriptores para las mismas accesiones: seis cuantitativos, cuatro
     cualitativos y dos ordinales, con medias distintas por género para que el
     agrupamiento tenga algo real que encontrar, y con un 8 % de celdas vacías,
     que es lo que trae cualquier libreta de campo verdadera. */
  const TRAIT_PROFILES = {
    Zea: { flor: [78, 9], altura: [235, 35], largo: [15, 3], diam: [4.4, 0.7], p100: [32, 6], rend: [120, 30] },
    Phaseolus: { flor: [46, 7], altura: [95, 40], largo: [11, 2], diam: [1.2, 0.2], p100: [38, 9], rend: [60, 20] },
    Cucurbita: { flor: [55, 8], altura: [40, 10], largo: [24, 7], diam: [14, 4], p100: [18, 4], rend: [900, 300] },
    Capsicum: { flor: [62, 9], altura: [72, 18], largo: [7, 3], diam: [1.6, 0.6], p100: [6, 1.5], rend: [340, 120] },
    Amaranthus: { flor: [58, 7], altura: [150, 30], largo: [32, 8], diam: [3, 0.8], p100: [0.07, 0.02], rend: [70, 25] },
    Physalis: { flor: [50, 6], altura: [60, 15], largo: [3.5, 0.8], diam: [3.2, 0.7], p100: [0.12, 0.03], rend: [250, 80] },
    Solanum: { flor: [95, 12], altura: [65, 15], largo: [6, 2], diam: [4.5, 1.2], p100: [NaN, 0], rend: [420, 150] },
    Oxalis: { flor: [120, 15], altura: [35, 8], largo: [5.5, 1.5], diam: [2, 0.5], p100: [NaN, 0], rend: [300, 90] },
    Manihot: { flor: [150, 20], altura: [210, 40], largo: [28, 8], diam: [5, 1.5], p100: [NaN, 0], rend: [2600, 800] },
    Agave: { flor: [2400, 300], altura: [160, 40], largo: [95, 20], diam: [9, 2], p100: [NaN, 0], rend: [45000, 12000] },
    Vanilla: { flor: [900, 120], altura: [420, 90], largo: [17, 3], diam: [1.1, 0.2], p100: [NaN, 0], rend: [160, 60] },
    Persea: { flor: [1300, 200], altura: [850, 200], largo: [9, 2], diam: [6.5, 1.4], p100: [NaN, 0], rend: [18000, 6000] },
    Theobroma: { flor: [1500, 250], altura: [520, 120], largo: [19, 4], diam: [8.5, 1.8], p100: [NaN, 0], rend: [1400, 500] },
    Coffea: { flor: [1100, 180], altura: [280, 60], largo: [1.6, 0.3], diam: [1.1, 0.2], p100: [17, 3], rend: [2200, 700] },
    Sechium: { flor: [110, 15], altura: [640, 150], largo: [13, 3], diam: [8, 2], p100: [NaN, 0], rend: [2800, 900] },
    Quercus: { flor: [2000, 400], altura: [1400, 400], largo: [2.4, 0.5], diam: [1.5, 0.3], p100: [320, 70], rend: [NaN, 0] },
    Triticum: { flor: [95, 10], altura: [92, 12], largo: [9, 1.5], diam: [0.9, 0.15], p100: [4.2, 0.6], rend: [55, 15] },
    Hordeum: { flor: [88, 9], altura: [98, 14], largo: [8, 1.4], diam: [0.8, 0.15], p100: [4.6, 0.7], rend: [58, 16] },
  };
  const COLORS = ['blanco', 'amarillo', 'rojo', 'azul', 'morado', 'pinto', 'verde', 'negro'];
  const FORMS = ['redonda', 'alargada', 'ovalada', 'cónica', 'aplanada'];
  const HABITS = ['erecto', 'postrado', 'trepador', 'arbustivo', 'arbóreo'];
  const TEXTURES = ['lisa', 'rugosa', 'pubescente', 'brillante'];

  function buildTraits(rows) {
    return (rows || build()).map((r, i) => {
      const rnd = mulberry32(90210 + i * 37);
      const g = TRAIT_PROFILES[r.GENUS] || TRAIT_PROFILES.Zea;
      /* normal por Box-Muller, para que los caracteres no salgan uniformes */
      const norm = () => {
        const u = Math.max(1e-9, rnd()), v = rnd();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      };
      const draw = ([m, s], dec) => {
        if (!isFinite(m)) return '';
        const x = m + s * norm();
        return String(Math.round(Math.max(0, x) * Math.pow(10, dec || 0)) / Math.pow(10, dec || 0));
      };
      const hole = p => rnd() < p ? '' : null;   /* null = conservar el valor */
      const maybe = (val, p) => (hole(p == null ? 0.08 : p) === '' ? '' : val);

      /* el hábito sigue a la especie, no al azar */
      const habit = ['Persea', 'Theobroma', 'Quercus', 'Coffea'].includes(r.GENUS) ? 'arbóreo'
        : ['Vanilla', 'Sechium'].includes(r.GENUS) ? 'trepador'
        : ['Agave'].includes(r.GENUS) ? 'arbustivo'
        : r.GENUS === 'Phaseolus' ? (rnd() < 0.5 ? 'trepador' : 'erecto')
        : rnd() < 0.15 ? 'postrado' : 'erecto';

      return {
        ACCENUMB: r.ACCENUMB,
        dias_floracion: maybe(draw(g.flor, 0)),
        altura_planta_cm: maybe(draw(g.altura, 0)),
        largo_fruto_cm: maybe(draw(g.largo, 1)),
        diametro_fruto_cm: maybe(draw(g.diam, 1)),
        peso_100_semillas_g: maybe(draw(g.p100, 2)),
        rendimiento_planta_g: maybe(draw(g.rend, 0)),
        color_principal: maybe(COLORS[Math.floor(rnd() * COLORS.length)]),
        forma: maybe(FORMS[Math.floor(rnd() * FORMS.length)]),
        habito: maybe(habit, 0.04),
        textura: maybe(TEXTURES[Math.floor(rnd() * TEXTURES.length)]),
        tolerancia_sequia: maybe(String(1 + Math.floor(rnd() * 5))),
        vigor: maybe(String(1 + Math.floor(rnd() * 5))),
      };
    });
  }

  window.EXAMPLES = {
    build, buildTraits, TRAIT_PROFILES,
    SITES,
    info: {
      es: 'Colección de ejemplo: 45 accesiones de 18 especies, de México, Guatemala, Perú, Bolivia, Colombia, Etiopía e India, conservadas por las cinco rutas. Trae a propósito los errores típicos de un archivo real (una longitud sin signo, un 30 de febrero, un país de dos letras, una altitud de 25 000 m, un código de almacenamiento inventado, una accesión sin coordenadas, fechas al revés y dos duplicados) para que el Bloque 3 tenga qué encontrar.',
      en: 'Example collection: 45 accessions of 18 species from Mexico, Guatemala, Peru, Bolivia, Colombia, Ethiopia and India, conserved along all five routes. It deliberately carries the typical errors of a real file (a longitude without its sign, a 30 February, a two-letter country, an elevation of 25,000 m, an invented storage code, an accession with no coordinates, reversed dates and two duplicates) so that Block 3 has something to find.',
    },
  };
})();
