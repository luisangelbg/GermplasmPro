/* GermplasmPro — el motor de la conservación: cuánto dura viva una accesión y
   cuánta de su diversidad conserva, en cada uno de los tipos de banco de
   germoplasma que existen. Aquí sólo está la ciencia; el dibujo y los
   controles viven en home.js, y las pruebas de tests/index.html llaman
   directamente a estas funciones.

   ---------------------------------------------------------------------------
   LOS TIPOS DE CONSERVACIÓN QUE MODELA
   ---------------------------------------------------------------------------
   EX SITU (el material se guarda fuera de su lugar de origen)
     seed    Banco de semillas: la vía más barata y segura, pero sólo sirve
             para especies de semilla ortodoxa (y, con reservas, intermedia).
     field   Banco de campo o colección viva: la única opción para árboles,
             especies recalcitrantes y muchos cultivos de propagación
             vegetativa; queda expuesta al clima y a las plagas.
     invitro Cultivo in vitro de crecimiento lento: frascos de plántulas o
             ápices que se subcultivan cada cierto tiempo; ahorra espacio pero
             cuesta trabajo y acumula variación somaclonal.
     cryo    Criopreservación en nitrógeno líquido (−196 °C): el metabolismo se
             detiene, no hay envejecimiento medible; el cuello de botella es la
             recuperación del material al descongelarlo.
     (El banco de ADN conserva información, no material vivo; la app lo trata
      en el pasaporte, no aquí, porque de una muestra de ADN no se regenera
      una planta.)

   IN SITU (el material sigue vivo en su sitio, evolucionando)
     insitu  Reserva genética de parientes silvestres o conservación en la
             parcela (on-farm): la población sigue expuesta a la selección
             natural y al manejo de quien la cultiva, recibe flujo génico de
             las poblaciones vecinas y, a cambio, corre el riesgo de que el
             sitio se pierda.

   ---------------------------------------------------------------------------
   1) LONGEVIDAD DE LA SEMILLA — ecuación de viabilidad de Ellis y Roberts
   ---------------------------------------------------------------------------
        v = Ki - p / sigma        sigma = 10^(KE - CW*log10(m) - CH*t - CQ*t^2)

      v  = viabilidad en probits (unidades de desviación normal),
      Ki = viabilidad inicial del lote en probits,
      p  = tiempo de almacenamiento en días,
      m  = contenido de humedad de la semilla (% en peso fresco),
      t  = temperatura de la cámara (°C).
      El porcentaje de germinación esperado es 100 * Phi(v).

      Las constantes son de la especie. CH = 0.0329 y CQ = 0.000478 describen
      el efecto de la temperatura en muchas especies ortodoxas; KE y CW son
      propias de cada una. La app trae las publicadas para Zea mays como punto
      de partida y deja editarlas: para cualquier otra especie hay que tomarlas
      de la Seed Information Database (Kew) o de la literatura.

   ---------------------------------------------------------------------------
   2) INTEGRIDAD GENÉTICA — deriva en cada ciclo
   ---------------------------------------------------------------------------
      Cada vez que la accesión pasa por un cuello de botella (una regeneración,
      una resiembra, un subcultivo, la recuperación de un criotubo o una
      generación en el campo del agricultor), las frecuencias se vuelven a
      sortear: 2*Ne gametos si hay reproducción sexual, o Ne líneas si el
      material es clonal. Los alelos raros son los primeros en perderse, la
      heterocigosis esperada baja y la consanguinidad acumulada crece con
      1 - prod(1 - 1/(2*Ne_i)). De ahí la regla de oro del banco: pocos ciclos
      y con muchos individuos. In situ ocurre lo mismo cada generación, pero el
      flujo génico de las poblaciones vecinas devuelve parte de lo perdido. */

(function () {

  /* ---------- comportamiento de la semilla ---------- */
  const BEHAVIOUR = {
    orthodox: {
      es: 'ortodoxa', en: 'orthodox',
      d: { es: 'tolera secarse al 3–7 % de humedad y congelarse: se conserva en frasco a −18 °C.', en: 'tolerates drying to 3–7% moisture and freezing: it is stored in jars at −18 °C.' },
    },
    intermediate: {
      es: 'intermedia', en: 'intermediate',
      d: { es: 'tolera secarse, pero no el frío profundo: pierde viabilidad en pocos años a −18 °C.', en: 'tolerates drying but not deep cold: it loses viability within a few years at −18 °C.' },
    },
    recalcitrant: {
      es: 'recalcitrante', en: 'recalcitrant',
      d: { es: 'no tolera la desecación ni el congelamiento: no hay banco de semillas posible.', en: 'tolerates neither desiccation nor freezing: a seed bank is not an option.' },
    },
    clonal: {
      es: 'de propagación vegetativa', en: 'vegetatively propagated',
      d: { es: 'su semilla no reproduce el genotipo que se quiere conservar, porque la variedad es un clon.', en: 'its seed does not reproduce the genotype to be conserved, because the variety is a clone.' },
    },
  };

  /* ---------- catálogo de especies ----------
     No es una lista cerrada ni pretende serlo: son ejemplos de cada
     comportamiento para que el simulador tenga casos reales, más una entrada
     genérica en la que el usuario declara el comportamiento de SU especie.
     Sólo el maíz trae constantes de viabilidad publicadas; en las demás
     especies de semilla, KE y CW se editan (arrancan de las del maíz). */
  const SPECIES = {
    generica: {
      es: 'Otra especie (elige su comportamiento)', en: 'Other species (choose its behaviour)',
      sci: '', behaviour: 'orthodox', pickBehaviour: true, editable: true,
      KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478, seedsPerPlant: 120, sexual: true,
      note: {
        es: 'Declara cómo se comporta la semilla de tu especie y, si es de banco de semillas, pon sus constantes de viabilidad (Seed Information Database, Kew) antes de tomar decisiones con los años que salen aquí.',
        en: 'Declare how your species behaves and, for a seed bank, enter its viability constants (Seed Information Database, Kew) before using these years for any decision.',
      },
    },
    maiz: {
      es: 'Maíz', en: 'Maize', sci: 'Zea mays',
      behaviour: 'orthodox', KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478,
      seedsPerPlant: 180, sexual: true, outcrossing: true,
      note: {
        es: 'Constantes publicadas para Zea mays. Es alógamo: FAO recomienda regenerar con al menos 100 plantas y polinización controlada.',
        en: 'Published constants for Zea mays. It is outcrossing: FAO recommends regenerating with at least 100 plants and controlled pollination.',
      },
    },
    frijol: {
      es: 'Frijol', en: 'Common bean', sci: 'Phaseolus vulgaris',
      behaviour: 'orthodox', editable: true, KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478,
      seedsPerPlant: 90, sexual: true, outcrossing: false,
      note: {
        es: 'Autógamo: bastan menos plantas por regeneración que en un alógamo, pero conviene cosechar por planta para no sesgar la muestra. Pon sus constantes de viabilidad antes de leer los años como pronóstico.',
        en: 'Self-pollinating: fewer plants per regeneration are needed than in an outcrosser, but harvesting plant by plant avoids biasing the sample. Enter its viability constants before reading the years as a forecast.',
      },
    },
    calabaza: {
      es: 'Calabaza', en: 'Squash', sci: 'Cucurbita pepo',
      behaviour: 'orthodox', editable: true, KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478,
      seedsPerPlant: 250, sexual: true, outcrossing: true,
      note: {
        es: 'Alógama y con polinizadores específicos: la regeneración necesita aislamiento o polinización manual.',
        en: 'Outcrossing and with specialist pollinators: regeneration needs isolation or hand pollination.',
      },
    },
    chile: {
      es: 'Chile', en: 'Chilli pepper', sci: 'Capsicum annuum',
      behaviour: 'orthodox', editable: true, KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478,
      seedsPerPlant: 400, sexual: true, outcrossing: false,
      note: {
        es: 'Autógamo con cruzamiento natural apreciable: se regenera con malla antiáfidos para que la accesión no se contamine con el vecino.',
        en: 'Self-pollinating with appreciable outcrossing: regenerate under insect-proof mesh so the accession is not contaminated by its neighbour.',
      },
    },
    trigo: {
      es: 'Trigo', en: 'Wheat', sci: 'Triticum aestivum',
      behaviour: 'orthodox', editable: true, KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478,
      seedsPerPlant: 60, sexual: true, outcrossing: false,
      note: {
        es: 'Autógamo de semilla ortodoxa: el caso más cómodo para un banco de semillas.',
        en: 'A self-pollinating orthodox-seeded crop: the easiest case for a seed bank.',
      },
    },
    cafe: {
      es: 'Café', en: 'Coffee', sci: 'Coffea arabica',
      behaviour: 'intermediate', editable: true, KE: 5.2, CW: 2.115, CH: 0.0329, CQ: 0.000478,
      seedsPerPlant: 500, sexual: true,
      note: {
        es: 'Semilla intermedia: tolera secarse hasta cierto punto, pero el congelamiento la mata. En cámara pierde viabilidad en pocos años, así que el café se conserva en banco de campo, in vitro o criopreservado.',
        en: 'Intermediate seed: it tolerates some drying, but freezing kills it. In a cold store it loses viability within a few years, so coffee is conserved in field genebanks, in vitro or cryopreserved.',
      },
    },
    aguacate: {
      es: 'Aguacate', en: 'Avocado', sci: 'Persea americana',
      behaviour: 'recalcitrant', sexual: true, seedsPerPlant: 0,
      note: {
        es: 'Semilla recalcitrante y árbol perenne: se conserva como colección viva en campo, y su germoplasma élite como clon injertado.',
        en: 'Recalcitrant seed and a perennial tree: it is kept as a living field collection, with elite germplasm maintained as grafted clones.',
      },
    },
    cacao: {
      es: 'Cacao', en: 'Cacao', sci: 'Theobroma cacao',
      behaviour: 'recalcitrant', sexual: true, seedsPerPlant: 0,
      note: {
        es: 'Semilla recalcitrante: no resiste secarse ni enfriarse. Las colecciones mundiales son de campo, con respaldo in vitro y criopreservación de ápices.',
        en: 'Recalcitrant seed: it survives neither drying nor chilling. World collections are field collections, backed up in vitro and by cryopreserved shoot tips.',
      },
    },
    chayote: {
      es: 'Chayote', en: 'Chayote', sci: 'Sechium edule',
      behaviour: 'recalcitrant', sexual: true, seedsPerPlant: 0,
      note: {
        es: 'La semilla es recalcitrante y germina dentro del fruto (vivípara): no se puede secar ni congelar. Se conserva en banco de campo o in vitro, con resiembra periódica.',
        en: 'The seed is recalcitrant and germinates inside the fruit (vivipary): it cannot be dried or frozen. It is conserved in a field genebank or in vitro, with periodic replanting.',
      },
    },
    encino: {
      es: 'Encino', en: 'Oak', sci: 'Quercus spp.',
      behaviour: 'recalcitrant', sexual: true, seedsPerPlant: 0,
      note: {
        es: 'La bellota es recalcitrante: en un árbol forestal la conservación empieza in situ, en rodales semilleros y reservas, y se complementa con ensayos de procedencia.',
        en: 'The acorn is recalcitrant: for a forest tree, conservation starts in situ, in seed stands and reserves, and is complemented with provenance trials.',
      },
    },
    papa: {
      es: 'Papa', en: 'Potato', sci: 'Solanum tuberosum',
      behaviour: 'clonal', sexual: false, seedsPerPlant: 0,
      note: {
        es: 'La variedad es un clon: su semilla botánica da plantas distintas. Se conserva in vitro con crecimiento lento y criopreservada, con respaldo en campo.',
        en: 'The variety is a clone: its botanical seed gives different plants. It is conserved in vitro under slow growth and cryopreserved, with a field backup.',
      },
    },
    yuca: {
      es: 'Yuca', en: 'Cassava', sci: 'Manihot esculenta',
      behaviour: 'clonal', sexual: false, seedsPerPlant: 0,
      note: {
        es: 'Se propaga por estacas: el banco es de campo y de frascos in vitro, y la criopreservación es el respaldo de largo plazo.',
        en: 'Propagated by stem cuttings: the collection lives in the field and in in-vitro jars, with cryopreservation as the long-term backup.',
      },
    },
    agave: {
      es: 'Agave', en: 'Agave', sci: 'Agave spp.',
      behaviour: 'clonal', sexual: false, seedsPerPlant: 0,
      note: {
        es: 'Los cultivares se mantienen por hijuelos, y muchas poblaciones silvestres sólo se conservan in situ; el ciclo largo hace carísimo el banco de campo.',
        en: 'Cultivars are kept as offsets, and many wild populations survive only in situ; the long life cycle makes a field collection very expensive.',
      },
    },
    vainilla: {
      es: 'Vainilla', en: 'Vanilla', sci: 'Vanilla planifolia',
      behaviour: 'clonal', sexual: false, seedsPerPlant: 0,
      note: {
        es: 'Orquídea de propagación vegetativa y base genética estrecha: in vitro, campo bajo sombra y conservación in situ de sus parientes silvestres.',
        en: 'A vegetatively propagated orchid with a narrow genetic base: in vitro, shaded field plots and in-situ conservation of its wild relatives.',
      },
    },
  };

  /* ---------- métodos de conservación ---------- */
  const METHODS = {
    seed: {
      es: 'Banco de semillas (ex situ)', en: 'Seed bank (ex situ)', kind: 'ex situ',
      short: { es: 'Banco de semillas', en: 'Seed bank' },
      d: { es: 'Semilla seca en frasco cerrado, en cámara fría. Barato, compacto y seguro, mientras alguien vigile la germinación y regenere a tiempo.', en: 'Dry seed in sealed jars in a cold room. Cheap, compact and safe, as long as someone watches germination and regenerates in time.' },
      sliders: ['temp', 'moisture', 'threshold', 'interval', 'sown', 'years'],
      fits: { orthodox: 'ok', intermediate: 'warn', recalcitrant: 'no', clonal: 'no' },
      why: {
        warn: { es: 'La semilla intermedia se puede secar, pero el frío profundo la daña: en cámara a −18 °C su vida útil se mide en años, no en siglos, y hay que revisarla muy seguido.', en: 'Intermediate seed can be dried, but deep cold damages it: at −18 °C its useful life is measured in years, not centuries, and it must be checked very often.' },
        no: { es: 'Con semilla recalcitrante o con una variedad clonal, el banco de semillas no conserva lo que quieres conservar: usa campo, in vitro o criopreservación.', en: 'With recalcitrant seed or a clonal variety, a seed bank does not conserve what you mean to conserve: use a field collection, in vitro or cryopreservation.' },
      },
    },
    field: {
      es: 'Banco de campo o colección viva (ex situ)', en: 'Field genebank or living collection (ex situ)', kind: 'ex situ',
      short: { es: 'Banco de campo o colección viva', en: 'Field genebank or living collection' },
      d: { es: 'Las plantas vivas en una parcela, un huerto o un arboreto. Indispensable para árboles y recalcitrantes; caro y expuesto al clima, las plagas y los recortes de presupuesto.', en: 'Living plants in a plot, orchard or arboretum. Essential for trees and recalcitrant species; expensive and exposed to weather, pests and budget cuts.' },
      sliders: ['interval', 'sown', 'hazard', 'years'],
      fits: { orthodox: 'ok', intermediate: 'ok', recalcitrant: 'ok', clonal: 'ok' },
    },
    invitro: {
      es: 'Cultivo in vitro de crecimiento lento (ex situ)', en: 'Slow-growth in vitro culture (ex situ)', kind: 'ex situ',
      short: { es: 'Cultivo in vitro de crecimiento lento', en: 'Slow-growth in vitro culture' },
      d: { es: 'Plántulas o ápices en frascos, con el crecimiento frenado para subcultivar lo menos posible. Ahorra espacio y sanea el material, pero cada subcultivo cuesta trabajo y arriesga contaminación y variación somaclonal.', en: 'Plantlets or shoot tips in jars, with growth slowed to subculture as rarely as possible. It saves space and cleans the material, but every subculture costs labour and risks contamination and somaclonal variation.' },
      sliders: ['subMonths', 'lines', 'contam', 'years'],
      fits: { orthodox: 'warn', intermediate: 'ok', recalcitrant: 'ok', clonal: 'ok' },
      why: { warn: { es: 'Para una especie de semilla ortodoxa el frasco in vitro es un gasto innecesario: el banco de semillas hace el mismo trabajo por una fracción del costo.', en: 'For an orthodox-seeded species, in-vitro jars are an unnecessary expense: a seed bank does the same job for a fraction of the cost.' } },
    },
    cryo: {
      es: 'Criopreservación (ex situ)', en: 'Cryopreservation (ex situ)', kind: 'ex situ',
      short: { es: 'Criopreservación', en: 'Cryopreservation' },
      d: { es: 'Ápices, embriones o polen en nitrógeno líquido a −196 °C. El material deja de envejecer y ya no hay ciclos de regeneración: todo el riesgo está en la entrada y en que nunca falte nitrógeno.', en: 'Shoot tips, embryos or pollen in liquid nitrogen at −196 °C. The material stops ageing and there are no more regeneration cycles: all the risk is at the door, and in never running out of nitrogen.' },
      sliders: ['explants', 'recovery', 'failure', 'years'],
      fits: { orthodox: 'ok', intermediate: 'ok', recalcitrant: 'ok', clonal: 'ok' },
    },
    insitu: {
      es: 'In situ: reserva genética o conservación en la parcela', en: 'In situ: genetic reserve or on-farm conservation', kind: 'in situ',
      short: { es: 'Reserva genética y conservación en la parcela', en: 'Genetic reserve and on-farm conservation' },
      d: { es: 'La población sigue viva en su sitio —una reserva de parientes silvestres o la milpa de quien la siembra cada año— y sigue evolucionando. Se pierde control y se gana adaptación: hay selección, flujo génico de las poblaciones vecinas y riesgo de que el sitio desaparezca.', en: 'The population stays alive where it belongs —a wild-relative reserve or the field of whoever sows it each year— and keeps evolving. You lose control and gain adaptation: there is selection, gene flow from neighbouring populations, and the risk of losing the site.' },
      sliders: ['census', 'neRatio', 'migration', 'siteRisk', 'years'],
      fits: { orthodox: 'ok', intermediate: 'ok', recalcitrant: 'ok', clonal: 'ok' },
    },
  };

  /* ¿le queda este método a esta especie? 'ok' | 'warn' | 'no' */
  function fit(speciesKey, methodKey, behaviourOverride) {
    const sp = SPECIES[speciesKey] || SPECIES.generica;
    const b = behaviourOverride || sp.behaviour;
    const m = METHODS[methodKey] || METHODS.seed;
    return m.fits[b] || 'ok';
  }

  /* ---------- la ecuación de viabilidad ---------- */
  function sigma(KE, CW, CH, CQ, m, t) {
    return Math.pow(10, KE - CW * Math.log10(m) - CH * t - CQ * t * t);
  }
  function germination(g0Pct, days, sig) {
    const Ki = normInv(clamp(g0Pct, 0.01, 99.99) / 100);
    return 100 * normCdf(Ki - days / sig);
  }
  function yearsTo(g0Pct, targetPct, sig) {
    const Ki = normInv(clamp(g0Pct, 0.01, 99.99) / 100);
    const vt = normInv(clamp(targetPct, 0.01, 99.99) / 100);
    return sig * (Ki - vt) / 365.25;
  }

  /* ---------- diversidad y deriva ---------- */
  const BASE_FREQ = [0.45, 0.22, 0.15, 0.09, 0.06, 0.03];
  function startFreqs(nLoci, rnd) {
    const loci = [];
    for (let l = 0; l < nLoci; l++) {
      const f = BASE_FREQ.map(v => v * (0.75 + 0.5 * rnd()));
      const s = sum(f);
      loci.push(f.map(v => v / s));
    }
    return loci;
  }
  function expHet(loci) { return mean(loci.map(f => 1 - sum(f.map(p => p * p)))); }
  function alleleCount(loci) { return sum(loci.map(f => f.filter(p => p > 0).length)); }

  /* un ciclo de deriva. `genes` es el número de copias que se sortean:
     2*Ne gametos en una especie sexual, o Ne líneas en material clonal. */
  function driftOnce(loci, Ne, rnd, opts) {
    const genes = Math.max(2, Math.round((opts && opts.genes) != null ? opts.genes : 2 * Ne));
    return loci.map(f => {
      let left = genes, rest = 1, counts = [];
      for (let i = 0; i < f.length; i++) {
        if (i === f.length - 1) { counts.push(left); break; }
        const p = rest > 0 ? clamp(f[i] / rest, 0, 1) : 0;
        const k = rbinom(left, p, rnd);
        counts.push(k); left -= k; rest -= f[i];
      }
      return counts.map(k => k / genes);
    });
  }
  /* el flujo génico de las poblaciones vecinas devuelve parte de lo perdido */
  function migrate(loci, pool, m) {
    if (!(m > 0)) return loci;
    return loci.map((f, i) => f.map((p, j) => (1 - m) * p + m * pool[i][j]));
  }

  const DEFAULTS = {
    species: 'maiz', method: 'seed', behaviour: null,
    /* banco de semillas */
    temp: -18, moisture: 6, g0: 96, threshold: 85, interval: 5,
    testSeeds: 100, sown: 100, stock0: 2500, minStock: 400,
    /* banco de campo */
    hazard: 2, establishment: 0.75,
    /* in vitro */
    subMonths: 12, lines: 20, contam: 2, soma: 0.5,
    /* criopreservación */
    explants: 200, recovery: 50, failure: 2,
    /* in situ / on-farm */
    census: 500, neRatio: 30, migration: 5, siteRisk: 1,
    /* comunes */
    years: 100, nLoci: 30, seed: 20260922,
  };

  /* estructura común de salida, para que home.js dibuje siempre igual */
  function blank(o, sp, method) {
    return {
      species: sp, method, opts: o, orthodox: sp.behaviour === 'orthodox',
      sigma: NaN, p50: NaN,
      years: [], germ: [], tested: [], stock: [], alleles: [], he: [], f: [],
      regens: [], tests: [], hazards: [],
    };
  }

  function simulate(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const sp = SPECIES[o.species] || SPECIES.generica;
    const beh = o.behaviour || sp.behaviour;
    const verdict = fit(o.species, o.method, beh);
    /* si el camino no le queda a la especie no se inventa una simulación:
       de una semilla recalcitrante en cámara no sale una curva de viabilidad */
    if (verdict === 'no') {
      const out = blank(o, sp, o.method);
      out.blocked = true; out.fit = 'no'; out.behaviour = beh;
      out.summary = { regens: 0, firstRegen: null, allelesLeft: NaN, heLeft: NaN, F: NaN, NeMean: null, seedsOnTests: 0, allelesLost: 0, lotLost: null, finalGerm: NaN, finalStock: NaN };
      return out;
    }
    const fn = { seed: simulateSeed, field: simulateField, invitro: simulateInVitro, cryo: simulateCryo, insitu: simulateInSitu }[o.method] || simulateSeed;
    const out = fn(o, sp, beh);
    out.behaviour = beh;
    out.fit = verdict;
    out.blocked = false;
    return out;
  }

  /* ======================= BANCO DE SEMILLAS ======================= */
  function simulateSeed(o, sp, beh) {
    const KE = o.KE != null ? o.KE : sp.KE, CW = o.CW != null ? o.CW : sp.CW;
    const CH = sp.CH != null ? sp.CH : 0.0329, CQ = sp.CQ != null ? sp.CQ : 0.000478;
    const rnd = mulberry32(o.seed);
    const sig = sigma(KE, CW, CH, CQ, o.moisture, o.temp);
    const sexual = sp.sexual !== false;

    let loci = startFreqs(o.nLoci, rnd);
    const A0 = alleleCount(loci), He0 = expHet(loci);

    const out = blank(o, sp, 'seed');
    out.sigma = sig; out.p50 = yearsTo(o.g0, 50, sig);
    out.mainLabel = { es: 'germinación (%)', en: 'germination (%)' };
    out.cycleLabel = { es: 'Regeneraciones', en: 'Regenerations' };

    let sinceRegen = 0, g0 = o.g0, stock = o.stock0, F = 0;
    let seedsOnTests = 0, NeSum = 0, NeN = 0, lost = 0, emptyLot = 0;

    for (let y = 0; y <= o.years; y++) {
      const g = germination(g0, sinceRegen * 365.25, sig);
      out.years.push(y); out.germ.push(g); out.stock.push(stock);
      out.alleles.push(100 * (alleleCount(loci) / A0));
      out.he.push(100 * (expHet(loci) / He0));
      out.f.push(100 * F);
      if (y === o.years) break;

      let measured = null;
      if (y > 0 && o.interval > 0 && y % o.interval === 0 && stock > o.testSeeds) {
        const k = rbinom(o.testSeeds, clamp(g / 100, 0, 1), rnd);
        measured = 100 * k / o.testSeeds;
        stock -= o.testSeeds; seedsOnTests += o.testSeeds;
        out.tests.push({ year: y, value: measured });
      }
      out.tested.push(measured);

      const lowViab = measured != null && measured < o.threshold;
      const lowStock = stock <= o.minStock;
      if (lowViab || lowStock) {
        const sowable = Math.min(o.sown, Math.max(0, stock - o.minStock * 0.2));
        const germinated = rbinom(Math.round(sowable), clamp(g / 100, 0, 1), rnd);
        const Ne = Math.max(0, Math.round(germinated * 0.9));
        if (Ne < 2) { emptyLot = emptyLot || y; stock = 0; sinceRegen++; continue; }
        const before = alleleCount(loci);
        loci = driftOnce(loci, Ne, rnd, { genes: sexual ? 2 * Ne : Ne });
        lost += before - alleleCount(loci);
        F = 1 - (1 - F) * (1 - 1 / (2 * Ne));
        NeSum += Ne; NeN++;
        stock = Math.round(Ne * (sp.seedsPerPlant || 120) * 0.85);
        sinceRegen = 0; g0 = o.g0;
        out.regens.push({ year: y, Ne, reason: lowViab ? 'viability' : 'stock', germ: g });
      } else {
        sinceRegen++;
      }
    }
    finish(out, { F, NeSum, NeN, lost, emptyLot, seedsOnTests });
    return out;
  }

  /* ======================= BANCO DE CAMPO ======================= */
  function simulateField(o, sp, beh) {
    const rnd = mulberry32(o.seed);
    const sexual = sp.sexual !== false;
    let loci = startFreqs(o.nLoci, rnd);
    const A0 = alleleCount(loci), He0 = expHet(loci);
    const target = Math.max(2, Math.round(o.sown));

    const out = blank(o, sp, 'field');
    out.mainLabel = { es: 'plantas vivas (% del objetivo)', en: 'living plants (% of target)' };
    out.cycleLabel = { es: 'Resiembras', en: 'Replantings' };

    let plants = target, F = 0, NeSum = 0, NeN = 0, lost = 0, emptyLot = 0, since = 0;

    for (let y = 0; y <= o.years; y++) {
      out.years.push(y);
      out.germ.push(100 * (plants / target));
      out.stock.push(plants);
      out.alleles.push(100 * (alleleCount(loci) / A0));
      out.he.push(100 * (expHet(loci) / He0));
      out.f.push(100 * F);
      if (y === o.years) break;
      out.tested.push(null);

      if (rnd() < o.hazard / 100) {
        const killed = 0.3 + rnd() * 0.4;
        plants = Math.floor(plants * (1 - killed));
        out.hazards.push({ year: y, lossPct: 100 * killed });
      }
      if (plants < 2) { emptyLot = emptyLot || y; plants = 0; since++; continue; }

      since++;
      if (since >= o.interval) {
        const Ne = Math.max(0, Math.round(plants * o.establishment));
        if (Ne < 2) { emptyLot = emptyLot || y; plants = 0; continue; }
        const before = alleleCount(loci);
        loci = driftOnce(loci, Ne, rnd, { genes: sexual ? 2 * Ne : Ne });
        lost += before - alleleCount(loci);
        F = 1 - (1 - F) * (1 - 1 / (2 * Ne));
        NeSum += Ne; NeN++;
        out.regens.push({ year: y, Ne, reason: 'replant', germ: 100 * (plants / target) });
        plants = target; since = 0;
      }
    }
    finish(out, { F, NeSum, NeN, lost, emptyLot, seedsOnTests: 0 });
    out.summary.hazards = out.hazards.length;
    return out;
  }

  /* ======================= IN VITRO ======================= */
  function simulateInVitro(o, sp) {
    const rnd = mulberry32(o.seed);
    let loci = startFreqs(o.nLoci, rnd);
    const A0 = alleleCount(loci), He0 = expHet(loci);
    const target = Math.max(2, Math.round(o.lines));

    const out = blank(o, sp, 'invitro');
    out.mainLabel = { es: 'fidelidad genética (% de líneas sin cambio)', en: 'genetic fidelity (% of unchanged lines)' };
    out.cycleLabel = { es: 'Subcultivos', en: 'Subcultures' };

    let lines = target, fidelity = 1, F = 0;
    let NeSum = 0, NeN = 0, lost = 0, emptyLot = 0, subs = 0;
    const perYear = 12 / Math.max(1, o.subMonths);

    for (let y = 0; y <= o.years; y++) {
      out.years.push(y);
      out.germ.push(100 * fidelity);
      out.stock.push(lines);
      out.alleles.push(100 * (alleleCount(loci) / A0));
      out.he.push(100 * (expHet(loci) / He0));
      out.f.push(100 * F);
      if (y === o.years) break;
      out.tested.push(null);

      /* los subcultivos del año (el número se reparte en pasos enteros) */
      const nSub = Math.floor((y + 1) * perYear) - Math.floor(y * perYear);
      for (let s = 0; s < nSub; s++) {
        if (lines < 2) { emptyLot = emptyLot || y; lines = 0; break; }
        /* frascos que se pierden por contaminación o por mal enraizamiento */
        const survivors = lines - rbinom(lines, clamp(o.contam / 100, 0, 1), rnd);
        if (survivors < 2) { emptyLot = emptyLot || y; lines = 0; break; }
        const before = alleleCount(loci);
        loci = driftOnce(loci, survivors, rnd, { genes: survivors });  /* clones: se sortean líneas, no gametos */
        lost += before - alleleCount(loci);
        F = 1 - (1 - F) * (1 - 1 / (2 * survivors));
        NeSum += survivors; NeN++; subs++;
        /* variación somaclonal: cada subcultivo deja atrás una parte del material fiel */
        fidelity *= (1 - clamp(o.soma / 100, 0, 1));
        lines = target;  /* el multiplicado repone los frascos perdidos */
      }
    }
    finish(out, { F, NeSum, NeN, lost, emptyLot, seedsOnTests: 0 });
    out.summary.subcultures = subs;
    out.summary.fidelity = 100 * fidelity;
    out.summary.labour = subs * target;
    return out;
  }

  /* ======================= CRIOPRESERVACIÓN ======================= */
  function simulateCryo(o, sp) {
    const rnd = mulberry32(o.seed);
    const sexual = sp.sexual !== false;
    let loci = startFreqs(o.nLoci, rnd);
    const A0 = alleleCount(loci), He0 = expHet(loci);

    const out = blank(o, sp, 'cryo');
    out.mainLabel = { es: 'material recuperable (%)', en: 'recoverable material (%)' };
    out.cycleLabel = { es: 'Ciclos de regeneración', en: 'Regeneration cycles' };

    /* el único cuello de botella es la entrada: de los explantes congelados
       sólo rebrota una parte, y esa parte es la accesión que queda */
    const survivors = Math.max(0, Math.round(o.explants * clamp(o.recovery / 100, 0, 1)));
    let F = 0, lost = 0, emptyLot = 0, alive = survivors >= 2;
    if (alive) {
      const before = alleleCount(loci);
      loci = driftOnce(loci, survivors, rnd, { genes: sexual ? 2 * survivors : survivors });
      lost += before - alleleCount(loci);
      F = 1 / (2 * survivors);
      out.regens.push({ year: 0, Ne: survivors, reason: 'cryo-entry', germ: o.recovery });
    } else {
      emptyLot = 0;
    }

    let recoverable = alive ? o.recovery : 0;
    for (let y = 0; y <= o.years; y++) {
      out.years.push(y);
      out.germ.push(recoverable);
      out.stock.push(alive ? survivors : 0);
      out.alleles.push(100 * (alleleCount(loci) / A0));
      out.he.push(100 * (expHet(loci) / He0));
      out.f.push(100 * F);
      if (y === o.years) break;
      out.tested.push(null);
      /* el material no envejece: lo único que puede pasar es que falle el
         suministro de nitrógeno o el tanque */
      if (alive && rnd() < o.failure / 1000) {
        out.hazards.push({ year: y, lossPct: 100 });
        alive = false; recoverable = 0; emptyLot = emptyLot || y;
      }
    }
    finish(out, { F, NeSum: survivors, NeN: alive || survivors >= 2 ? 1 : 0, lost, emptyLot: alive ? null : emptyLot, seedsOnTests: 0 });
    out.summary.survivors = survivors;
    out.summary.hazards = out.hazards.length;
    out.summary.regens = out.regens.length;
    return out;
  }

  /* ======================= IN SITU / ON-FARM ======================= */
  function simulateInSitu(o, sp) {
    const rnd = mulberry32(o.seed);
    const sexual = sp.sexual !== false;
    let loci = startFreqs(o.nLoci, rnd);
    const pool = loci.map(f => f.slice());     /* el acervo regional que aporta el flujo génico */
    const A0 = alleleCount(loci), He0 = expHet(loci);
    const census0 = Math.max(2, Math.round(o.census));

    const out = blank(o, sp, 'insitu');
    out.mainLabel = { es: 'tamaño de la población (% del censo inicial)', en: 'population size (% of the initial census)' };
    out.cycleLabel = { es: 'Generaciones', en: 'Generations' };

    let census = census0, F = 0, NeSum = 0, NeN = 0, lost = 0, emptyLot = 0, gens = 0;

    for (let y = 0; y <= o.years; y++) {
      out.years.push(y);
      out.germ.push(100 * (census / census0));
      out.stock.push(census);
      out.alleles.push(100 * (alleleCount(loci) / A0));
      out.he.push(100 * (expHet(loci) / He0));
      out.f.push(100 * F);
      if (y === o.years) break;
      out.tested.push(null);

      /* lo que amenaza a una población in situ: que cambie el uso del suelo,
         que se deje de sembrar la variedad, una sequía, un incendio */
      if (rnd() < o.siteRisk / 100) {
        const hit = 0.4 + rnd() * 0.6;
        census = Math.floor(census * (1 - hit));
        out.hazards.push({ year: y, lossPct: 100 * hit });
      }
      if (census < 2) { emptyLot = emptyLot || y; census = 0; continue; }

      /* una generación: deriva con el tamaño efectivo, y después el flujo
         génico de las poblaciones vecinas */
      const Ne = Math.max(2, Math.round(census * clamp(o.neRatio / 100, 0.01, 1)));
      const m = clamp(o.migration / 100, 0, 1);
      const before = alleleCount(loci);
      loci = driftOnce(loci, Ne, rnd, { genes: sexual ? 2 * Ne : Ne });
      loci = migrate(loci, pool, m);
      lost += Math.max(0, before - alleleCount(loci));
      /* deriva y migración a la vez: los dos genes de un individuo son de
         padres residentes con probabilidad (1-m)^2, así que la consanguinidad
         no crece sin freno, se estabiliza en un equilibrio deriva-migración */
      F = Math.pow(1 - m, 2) * (F * (1 - 1 / (2 * Ne)) + 1 / (2 * Ne));
      NeSum += Ne; NeN++; gens++;
      out.regens.push({ year: y, Ne, reason: 'generation', germ: 100 * (census / census0) });
      /* la población se recupera poco a poco hasta su censo habitual */
      census = Math.min(census0, Math.round(census * 1.15) + 1);
    }
    finish(out, { F, NeSum, NeN, lost, emptyLot, seedsOnTests: 0 });
    out.summary.generations = gens;
    out.summary.hazards = out.hazards.length;
    return out;
  }

  /* resumen común */
  function finish(out, acc) {
    out.summary = {
      regens: out.regens.length,
      firstRegen: out.regens.length ? out.regens[0].year : null,
      allelesLeft: out.alleles[out.alleles.length - 1],
      heLeft: out.he[out.he.length - 1],
      F: 100 * acc.F,
      NeMean: acc.NeN ? acc.NeSum / acc.NeN : null,
      seedsOnTests: acc.seedsOnTests,
      allelesLost: acc.lost,
      lotLost: acc.emptyLot || null,
      finalGerm: out.germ[out.germ.length - 1],
      finalStock: out.stock[out.stock.length - 1],
    };
    return out;
  }

  window.GB = {
    BEHAVIOUR, SPECIES, METHODS, DEFAULTS, BASE_FREQ,
    fit, sigma, germination, yearsTo,
    startFreqs, expHet, alleleCount, driftOnce, migrate,
    simulate, simulateSeed, simulateField, simulateInVitro, simulateCryo, simulateInSitu,
  };
})();
