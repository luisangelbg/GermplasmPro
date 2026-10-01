/* GermplasmPro — catálogo de descriptores de caracterización.

   El pasaporte (MCPD) dice QUIÉN es una accesión y DE DÓNDE viene. Esto dice
   CÓMO ES: lo que se mide en la parcela, en la mesa de trabajo y en el
   laboratorio. No es un estándar —los descriptores varían con cada especie y
   cada quien añade los suyos—, es un punto de partida con los caracteres que
   casi siempre se toman, con su unidad y su escala, para que nadie tenga que
   inventar los encabezados ni acordarse de en qué unidad iba cada cosa.

   Van aparte del pasaporte a propósito: MCPD es un estándar con el que los
   bancos hablan entre sí y no se le cuelgan campos. Estos viven en la
   caracterización del Bloque 7 y se unen a las accesiones por su número.

   Cada uno lleva: clave de columna, grupo, tipo (cuantitativo, ordinal o
   cualitativo), unidad, nombre claro en los dos idiomas, qué es y un ejemplo. */

(function () {

  const GROUPS = [
    { g: 'agro', es: 'Agronómicas y de la planta', en: 'Agronomic and plant traits',
      d: { es: 'Lo que se anota en el campo a lo largo del ciclo: cuándo florece, cuánto mide, cómo crece y cuánto da.',
        en: 'What is recorded in the field through the cycle: when it flowers, how tall it grows, how it grows and how much it yields.' } },
    { g: 'fruto', es: 'Morfológicas del fruto', en: 'Fruit morphology',
      d: { es: 'La forma, el tamaño y el color del fruto o del órgano que se cosecha, medidos sobre una muestra de frutos maduros.',
        en: 'The shape, size and colour of the fruit or harvested organ, measured on a sample of ripe fruits.' } },
    { g: 'quim', es: 'Químicas y de calidad', en: 'Chemical and quality traits',
      d: { es: 'Lo que se mide en el laboratorio o con instrumento de mano: azúcares, acidez, firmeza y composición.',
        en: 'What is measured in the laboratory or with a hand instrument: sugars, acidity, firmness and composition.' } },
    { g: 'semilla', es: 'Semilla', en: 'Seed',
      d: { es: 'Lo que describe a la semilla misma, que en un banco es a la vez carácter y unidad de trabajo.',
        en: 'What describes the seed itself, which in a genebank is both a trait and the working unit.' } },
  ];

  /* t: num = cuantitativo · ord = escala ordinal · cat = cualitativo */
  const FIELDS = [
    /* ---------------- agronómicas ---------------- */
    { k: 'DIAS_EMERGENCIA', g: 'agro', t: 'num', u: 'días', es: 'Días a emergencia', en: 'Days to emergence',
      d: { es: 'Días de la siembra a que emerge el 50 % de las plantas.', en: 'Days from sowing until 50 % of plants have emerged.' }, ex: '8' },
    { k: 'DIAS_FLORACION', g: 'agro', t: 'num', u: 'días', es: 'Días a floración', en: 'Days to flowering',
      d: { es: 'Días de la siembra o del brote a que el 50 % de las plantas tiene flor abierta.', en: 'Days from sowing or sprouting until 50 % of plants have an open flower.' }, ex: '96' },
    { k: 'DIAS_COSECHA', g: 'agro', t: 'num', u: 'días', es: 'Días a cosecha', en: 'Days to harvest',
      d: { es: 'Días de la siembra a la primera cosecha en madurez comercial.', en: 'Days from sowing to the first harvest at commercial maturity.' }, ex: '145' },
    { k: 'ALTURA_PLANTA', g: 'agro', t: 'num', u: 'cm', es: 'Altura de planta', en: 'Plant height',
      d: { es: 'Del suelo al ápice, en floración o en madurez; se promedian al menos cinco plantas.', en: 'From the ground to the apex, at flowering or maturity; at least five plants are averaged.' }, ex: '212' },
    { k: 'HABITO', g: 'agro', t: 'cat', u: '', es: 'Hábito de crecimiento', en: 'Growth habit',
      d: { es: 'Erecto, semierecto, postrado, trepador o arbustivo, según la especie.', en: 'Erect, semi-erect, prostrate, climbing or bushy, depending on the species.' }, ex: 'erecto' },
    { k: 'VIGOR', g: 'agro', t: 'ord', u: '1–9', es: 'Vigor de la planta', en: 'Plant vigour',
      d: { es: 'Escala de 1 (muy débil) a 9 (muy vigoroso), evaluada en el mismo momento en todas las accesiones.', en: 'Scale from 1 (very weak) to 9 (very vigorous), scored at the same moment in every accession.' }, ex: '7' },
    { k: 'RAMAS', g: 'agro', t: 'num', u: 'número', es: 'Ramas o tallos por planta', en: 'Branches or stems per plant',
      d: { es: 'Ramas primarias o tallos que salen de la base.', en: 'Primary branches or stems arising from the base.' }, ex: '4' },
    { k: 'FRUTOS_PLANTA', g: 'agro', t: 'num', u: 'número', es: 'Frutos por planta', en: 'Fruits per plant',
      d: { es: 'Frutos cosechados por planta en todo el ciclo.', en: 'Fruits harvested per plant over the whole cycle.' }, ex: '38' },
    { k: 'RENDIMIENTO_PLANTA', g: 'agro', t: 'num', u: 'g', es: 'Rendimiento por planta', en: 'Yield per plant',
      d: { es: 'Peso fresco cosechado por planta.', en: 'Fresh weight harvested per plant.' }, ex: '2450' },
    { k: 'REACCION_SEQUIA', g: 'agro', t: 'ord', u: '1–9', es: 'Reacción a la sequía', en: 'Reaction to drought',
      d: { es: 'De 1 (muy tolerante) a 9 (muy susceptible), en un ciclo con el estrés documentado.', en: 'From 1 (very tolerant) to 9 (very susceptible), in a cycle with the stress documented.' }, ex: '3' },
    { k: 'REACCION_PLAGA', g: 'agro', t: 'ord', u: '1–9', es: 'Reacción a plaga o enfermedad', en: 'Reaction to pest or disease',
      d: { es: 'De 1 (sin daño) a 9 (daño total). Conviene anotar en las observaciones de qué plaga se trata.', en: 'From 1 (no damage) to 9 (total damage). It is worth noting which pest it was in the remarks.' }, ex: '5' },

    /* ---------------- morfológicas del fruto ---------------- */
    { k: 'PESO_FRUTO', g: 'fruto', t: 'num', u: 'g', es: 'Peso del fruto', en: 'Fruit weight',
      d: { es: 'Peso fresco de un fruto maduro; se promedian al menos diez frutos.', en: 'Fresh weight of a ripe fruit; at least ten fruits are averaged.' }, ex: '318.5' },
    { k: 'LARGO_FRUTO', g: 'fruto', t: 'num', u: 'cm', es: 'Largo del fruto', en: 'Fruit length',
      d: { es: 'Del pedúnculo al ápice, en el eje mayor.', en: 'From the peduncle to the apex, along the major axis.' }, ex: '12.4' },
    { k: 'ANCHO_FRUTO', g: 'fruto', t: 'num', u: 'cm', es: 'Ancho del fruto', en: 'Fruit width',
      d: { es: 'Diámetro máximo, perpendicular al eje mayor.', en: 'Maximum diameter, perpendicular to the major axis.' }, ex: '8.1' },
    { k: 'FORMA_FRUTO', g: 'fruto', t: 'cat', u: '', es: 'Forma del fruto', en: 'Fruit shape',
      d: { es: 'Redondo, oblongo, ovado, piriforme, elíptico, achatado… Conviene usar siempre la misma lista.', en: 'Round, oblong, ovate, pyriform, elliptic, flattened… It helps to always use the same list.' }, ex: 'piriforme' },
    { k: 'COLOR_EXTERNO', g: 'fruto', t: 'cat', u: '', es: 'Color externo del fruto', en: 'External fruit colour',
      d: { es: 'Color de la cáscara en madurez de consumo. Si se usa una carta de color, se anota su código.', en: 'Skin colour at eating ripeness. If a colour chart is used, its code is recorded.' }, ex: 'verde oscuro' },
    { k: 'COLOR_PULPA', g: 'fruto', t: 'cat', u: '', es: 'Color de la pulpa', en: 'Flesh colour',
      d: { es: 'Color de la pulpa en un corte transversal, en madurez de consumo.', en: 'Flesh colour on a cross section, at eating ripeness.' }, ex: 'crema' },
    { k: 'GROSOR_PULPA', g: 'fruto', t: 'num', u: 'mm', es: 'Grosor de la pulpa', en: 'Flesh thickness',
      d: { es: 'De la cáscara a la cavidad, medido en el ecuador del fruto.', en: 'From the skin to the cavity, measured at the fruit’s equator.' }, ex: '18.5' },
    { k: 'GROSOR_CASCARA', g: 'fruto', t: 'num', u: 'mm', es: 'Grosor de la cáscara', en: 'Skin thickness',
      d: { es: 'Espesor de la cáscara o epicarpio.', en: 'Thickness of the skin or epicarp.' }, ex: '2.3' },
    { k: 'SEMILLAS_FRUTO', g: 'fruto', t: 'num', u: 'número', es: 'Semillas por fruto', en: 'Seeds per fruit',
      d: { es: 'Semillas llenas por fruto; las vanas se cuentan aparte si interesa.', en: 'Filled seeds per fruit; empty ones are counted separately if of interest.' }, ex: '1' },
    { k: 'SUPERFICIE_FRUTO', g: 'fruto', t: 'cat', u: '', es: 'Superficie del fruto', en: 'Fruit surface',
      d: { es: 'Lisa, rugosa, acostillada, espinosa, pubescente…', en: 'Smooth, rough, ribbed, spiny, pubescent…' }, ex: 'lisa' },

    /* ---------------- químicas y de calidad ---------------- */
    { k: 'BRIX', g: 'quim', t: 'num', u: '°Brix', es: 'Sólidos solubles', en: 'Soluble solids',
      d: { es: 'Grados Brix del jugo, con refractómetro, sobre pulpa homogeneizada a temperatura conocida.', en: 'Degrees Brix of the juice, with a refractometer, on homogenised pulp at a known temperature.' }, ex: '11.8' },
    { k: 'ACIDEZ', g: 'quim', t: 'num', u: '% ácido', es: 'Acidez titulable', en: 'Titratable acidity',
      d: { es: 'Por titulación con hidróxido de sodio, expresada como el ácido que domina en la especie (cítrico, málico…).', en: 'By titration with sodium hydroxide, expressed as the acid dominant in the species (citric, malic…).' }, ex: '0.42' },
    { k: 'RELACION_BA', g: 'quim', t: 'num', u: 'razón', es: 'Relación Brix/acidez', en: 'Brix/acid ratio',
      d: { es: 'Sólidos solubles entre acidez titulable: es lo que más se acerca al sabor percibido.', en: 'Soluble solids over titratable acidity: the closest single number to perceived flavour.' }, ex: '28.1' },
    { k: 'PH', g: 'quim', t: 'num', u: 'pH', es: 'pH del jugo o de la pulpa', en: 'Juice or pulp pH',
      d: { es: 'Con potenciómetro calibrado, sobre la misma muestra que la acidez.', en: 'With a calibrated pH meter, on the same sample as the acidity.' }, ex: '4.6' },
    { k: 'FIRMEZA', g: 'quim', t: 'num', u: 'N', es: 'Firmeza de la pulpa', en: 'Flesh firmness',
      d: { es: 'Resistencia a la penetración con penetrómetro; se anota el diámetro del émbolo usado.', en: 'Resistance to penetration with a penetrometer; the plunger diameter used is recorded.' }, ex: '32.5' },
    { k: 'MATERIA_SECA', g: 'quim', t: 'num', u: '%', es: 'Materia seca', en: 'Dry matter',
      d: { es: 'Por secado en estufa hasta peso constante, sobre peso fresco.', en: 'By oven drying to constant weight, on a fresh-weight basis.' }, ex: '23.4' },
    { k: 'PROTEINA', g: 'quim', t: 'num', u: '%', es: 'Proteína', en: 'Protein',
      d: { es: 'En base seca. Se anota el método (Kjeldahl, Dumas o infrarrojo cercano) en las observaciones.', en: 'On a dry-weight basis. The method (Kjeldahl, Dumas or near-infrared) is noted in the remarks.' }, ex: '9.8' },
    { k: 'ACEITE', g: 'quim', t: 'num', u: '%', es: 'Aceite o grasa', en: 'Oil or fat',
      d: { es: 'En base seca, por extracción con disolvente o por infrarrojo cercano.', en: 'On a dry-weight basis, by solvent extraction or near-infrared.' }, ex: '4.2' },
    { k: 'ALMIDON', g: 'quim', t: 'num', u: '%', es: 'Almidón', en: 'Starch',
      d: { es: 'En base seca.', en: 'On a dry-weight basis.' }, ex: '62.1' },
    { k: 'FIBRA', g: 'quim', t: 'num', u: '%', es: 'Fibra', en: 'Fibre',
      d: { es: 'Fibra cruda o dietética total, en base seca; se dice cuál en las observaciones.', en: 'Crude or total dietary fibre, on a dry-weight basis; which one is stated in the remarks.' }, ex: '3.6' },
    { k: 'VITAMINA_C', g: 'quim', t: 'num', u: 'mg/100 g', es: 'Vitamina C', en: 'Vitamin C',
      d: { es: 'Ácido ascórbico por 100 g de peso fresco.', en: 'Ascorbic acid per 100 g of fresh weight.' }, ex: '48.2' },
    { k: 'FENOLES', g: 'quim', t: 'num', u: 'mg EAG/100 g', es: 'Fenoles totales', en: 'Total phenolics',
      d: { es: 'Equivalentes de ácido gálico por 100 g, por Folin-Ciocalteu.', en: 'Gallic acid equivalents per 100 g, by Folin-Ciocalteu.' }, ex: '135' },

    /* ---------------- semilla ---------------- */
    { k: 'PESO_100_SEMILLAS', g: 'semilla', t: 'num', u: 'g', es: 'Peso de 100 semillas', en: 'Weight of 100 seeds',
      d: { es: 'Con semilla limpia y seca, a contenido de humedad conocido.', en: 'On clean, dry seed, at a known moisture content.' }, ex: '31.7' },
    { k: 'LARGO_SEMILLA', g: 'semilla', t: 'num', u: 'mm', es: 'Largo de la semilla', en: 'Seed length',
      d: { es: 'Promedio de al menos diez semillas.', en: 'Average of at least ten seeds.' }, ex: '10.2' },
    { k: 'COLOR_SEMILLA', g: 'semilla', t: 'cat', u: '', es: 'Color de la semilla', en: 'Seed colour',
      d: { es: 'Color principal de la testa; si hay más de uno, se anota el patrón.', en: 'Main testa colour; if there is more than one, the pattern is recorded.' }, ex: 'azul' },
    { k: 'FORMA_SEMILLA', g: 'semilla', t: 'cat', u: '', es: 'Forma de la semilla', en: 'Seed shape',
      d: { es: 'Redonda, ovalada, arriñonada, dentada…', en: 'Round, oval, kidney-shaped, dented…' }, ex: 'dentada' },
  ];

  const FIELD_MAP = Object.fromEntries(FIELDS.map(f => [f.k, f]));
  const byGroup = g => FIELDS.filter(f => f.g === g);
  const has = k => Object.prototype.hasOwnProperty.call(FIELD_MAP, k);

  window.TRAITS = { GROUPS, FIELDS, FIELD_MAP, byGroup, has };
})();
