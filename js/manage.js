/* GermplasmPro — el motor del Bloque 8: el manejo diario del banco.

   El Bloque 1 simula la vida de UNA accesión imaginaria. Este bloque aplica lo
   mismo a TUS lotes, con los datos que ya están en el pasaporte: existencias,
   última prueba de germinación, última regeneración y ruta de conservación.

   Lo que calcula, accesión por accesión:

     · VIABILIDAD DE HOY. Desde la última prueba (su valor y su fecha) y las
       condiciones de tu cámara, la ecuación de Ellis y Roberts proyecta en qué
       porcentaje anda el lote ahora y cuántos años le quedan antes de caer del
       umbral. Sin constantes de viabilidad para esa especie NO se proyecta
       nada: se dice que falta el dato y se trabaja sólo con la fecha.

     · ALERTAS. Prueba de germinación vencida, lote por debajo del umbral,
       existencias por debajo del mínimo, subcultivo o resiembra atrasados,
       accesión sin duplicado de seguridad. Cada una con su antigüedad, para
       poder ordenar el trabajo de la temporada.

     · TAMAÑO DE MUESTRA. Cuántas plantas hacen falta para regenerar sin perder
       los alelos raros: P(retener un alelo de frecuencia p) = 1 − (1 − p)^(2n)
       en una especie alógama, y con un solo gameto efectivo por planta en una
       autógama. De ahí sale el número de plantas y, con la germinación actual,
       cuántas semillas hay que sembrar.

     · CARGA DE TRABAJO. Cuántas accesiones van a necesitar prueba o
       regeneración en los próximos años, que es lo que de verdad decide el
       presupuesto de un banco. */

(function () {

  /* ---------- parámetros del banco, por ruta de conservación ---------- */
  const DEFAULT_CONFIG = {
    seed: {
      temp: -18, moisture: 6, threshold: 85, testInterval: 10,
      minStock: 400, testSeeds: 200, sampleSeeds: 50, regenPlants: 100,
    },
    field: { cycle: 8, minPlants: 25 },
    invitro: { subMonths: 12, minJars: 10 },
    cryo: { checkYears: 5, minVials: 20 },
    insitu: { visitYears: 2 },
    onfarm: { visitYears: 1 },
  };

  /* la clave con la que se agrupan y filtran las accesiones sin ruta declarada
     (y que no se deduce de STORAGE): se manejan como semilla */
  const NO_ROUTE = 'none';
  /* en qué se cuentan las existencias de cada ruta */
  const STOCK_UNITS = {
    seed: { es: ['semilla', 'semillas'], en: ['seed', 'seeds'] },
    field: { es: ['planta', 'plantas'], en: ['plant', 'plants'] },
    invitro: { es: ['frasco', 'frascos'], en: ['jar', 'jars'] },
    cryo: { es: ['criotubo', 'criotubos'], en: ['cryovial', 'cryovials'] },
    dna: { es: ['muestra', 'muestras'], en: ['sample', 'samples'] },
    insitu: { es: ['individuo', 'individuos'], en: ['individual', 'individuals'] },
    onfarm: { es: ['individuo', 'individuos'], en: ['individual', 'individuals'] },
  };
  /* in situ y en la parcela cuentan lo mismo (individuos): una sola unidad */
  function stockUnit(route) { return route === 'onfarm' ? 'insitu' : STOCK_UNITS[route] ? route : 'seed'; }

  /* un campo numérico opcional: la casilla vacía es «sin dato» (null), no cero */
  function optNum(v) {
    const s = String(v ?? '').trim().replace(',', '.');
    if (s === '') return null;
    const x = Number(s);
    return Number.isFinite(x) ? x : null;
  }
  const has = v => v != null && Number.isFinite(v);

  function config(saved) {
    const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (saved) Object.keys(saved).forEach(k => { if (c[k]) Object.assign(c[k], saved[k]); });
    return c;
  }

  /* ---------- constantes de viabilidad por taxón ----------
     El maíz viene con las publicadas; lo demás lo pone quien cura, con su
     fuente. Sin constantes no hay proyección: es preferible no decir nada a
     decir un número inventado. */
  const PUBLISHED = {
    'Zea mays': { KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478, source: 'Ellis & Roberts (publicadas)' },
  };
  function viabilityTable(saved) {
    const t = JSON.parse(JSON.stringify(PUBLISHED));
    if (saved) Object.keys(saved).forEach(k => { t[k] = Object.assign({ CH: 0.0329, CQ: 0.000478 }, saved[k]); });
    return t;
  }
  /* las constantes que hay que guardar: las de taxones nuevos y las publicadas
     que se editaron (el maíz incluido); las publicadas sin tocar no se guardan */
  function customConstants(viab) {
    const out = {};
    Object.keys(viab || {}).forEach(k => {
      const p = PUBLISHED[k], v = viab[k];
      if (!p || ['KE', 'CW', 'CH', 'CQ', 'source'].some(f => p[f] !== v[f])) out[k] = Object.assign({}, v);
    });
    return out;
  }
  function taxonOf(row) { return [row.GENUS, row.SPECIES].filter(Boolean).join(' ').trim(); }

  /* ---------- fechas ---------- */
  function parseDate(v) {
    const s = String(v ?? '').trim();
    if (!/^\d{4}/.test(s)) return null;
    const y = Number(s.slice(0, 4));
    const mo = s.slice(4, 6), d = s.slice(6, 8);
    const m = (mo === '--' || !mo) ? 6 : Number(mo);
    const day = (d === '--' || !d) ? 15 : Number(d);
    if (!isFinite(y) || y < 1700) return null;
    return new Date(Date.UTC(y, clamp(m - 1, 0, 11), clamp(day, 1, 28)));
  }
  function yearsSince(v, today) {
    const d = parseDate(v);
    if (!d) return null;
    return ((today || new Date()) - d) / (365.25 * 24 * 3600 * 1000);
  }

  /* ---------- estado de un lote ---------- */
  function lotStatus(row, cfg, viab, today) {
    const route = MCPD.consRoute(row) || '';
    /* sin ruta declarada (ni deducible de STORAGE) se maneja como semilla */
    const isSeed = route === 'seed' || route === '';
    const st = {
      route, alerts: [], stock: optNum(row.GP_STOCK),
      /* la germinación sólo tiene sentido en un lote de semilla */
      germ: isSeed ? optNum(row.GP_GERMPCT) : null,
      yearsSinceTest: isSeed ? yearsSince(row.GP_GERMDATE, today) : null,
      yearsSinceRegen: yearsSince(row.GP_REGENDATE, today),
      projected: null, yearsToThreshold: null, sigmaYears: null, constants: null, regenSeeds: null,
    };
    const add = (code, level, es, en, extra) => st.alerts.push(Object.assign({ code, level, msg: { es, en } }, extra || {}));

    if (isSeed) {
      const c = cfg.seed;
      const k = viab[taxonOf(row)];
      /* proyección de la viabilidad, sólo si hay constantes para el taxón */
      if (k && has(st.germ) && st.yearsSinceTest != null) {
        const sig = GB.sigma(k.KE, k.CW, k.CH, k.CQ, c.moisture, c.temp);
        st.sigmaYears = sig / 365.25;
        st.constants = k;
        st.projected = GB.germination(st.germ, st.yearsSinceTest * 365.25, sig);
        st.yearsToThreshold = GB.yearsTo(st.germ, c.threshold, sig) - st.yearsSinceTest;
      }
      /* lo que pide una regeneración con las plantas de los supuestos: semillas
         a sembrar con la germinación de hoy (la proyectada, si la hay) */
      const gNow = st.projected != null ? st.projected : st.germ;
      if (has(gNow) && gNow > 0) st.regenSeeds = seedsToSow(c.regenPlants, gNow);
      const regenTip = () => {
        if (!has(gNow)) return { es: '', en: '' };
        if (!(gNow > 0)) return {
          es: ' No queda semilla viable de la cual regenerar: recurre al duplicado de seguridad o vuelve a colectar.',
          en: ' There is no viable seed left to regenerate from: turn to the safety duplicate or collect again.' };
        const short = has(st.stock) && st.stock < st.regenSeeds;
        return {
          es: ` Para regenerar con ${fmtInt(c.regenPlants)} plantas hay que sembrar unas ${fmtInt(st.regenSeeds)} semillas${short ? `, y sólo quedan ${fmtInt(st.stock)}` : ''}.`,
          en: ` Regenerating with ${fmtInt(c.regenPlants)} plants means sowing about ${fmtInt(st.regenSeeds)} seeds${short ? `, and only ${fmtInt(st.stock)} are left` : ''}.` };
      };
      /* por debajo del umbral: una sola alerta, la más grave. Si ya la prueba
         medida quedó abajo, la proyección (que sólo puede bajar) también: se
         dice lo medido y, al lado, lo proyectado. */
      if (has(st.germ) && st.germ < c.threshold) {
        const tip = regenTip();
        /* lo proyectado sólo se menciona si ya se nota al redondear */
        const proj = st.projected != null && Math.round(st.projected) < Math.round(st.germ);
        add('measuredLow', 'crit',
          `La última prueba dio ${fmt(st.germ, 0)} %, por debajo del umbral de ${c.threshold} %${proj ? `; la proyección lo pone hoy en ${fmt(st.projected, 0)} %` : ''}.${tip.es}`,
          `The last test gave ${fmt(st.germ, 0)} %, below the ${c.threshold} % threshold${proj ? `; the projection puts it at ${fmt(st.projected, 0)} % today` : ''}.${tip.en}`,
          { value: st.germ });
      } else if (st.projected != null && st.projected < c.threshold) {
        const tip = regenTip();
        add('belowThreshold', 'crit',
          `La proyección lo pone en ${fmt(st.projected, 0)} % de germinación, por debajo del umbral de ${c.threshold} %.${tip.es}`,
          `The projection puts it at ${fmt(st.projected, 0)} % germination, below the ${c.threshold} % threshold.${tip.en}`,
          { value: st.projected });
      } else if (st.yearsToThreshold != null && st.yearsToThreshold < 3) {
        add('nearThreshold', 'warn',
          `Le quedan unos ${fmt(Math.max(0, st.yearsToThreshold), 1)} años antes de caer del umbral.`,
          `About ${fmt(Math.max(0, st.yearsToThreshold), 1)} years left before it drops below the threshold.`, { value: st.yearsToThreshold });
      }
      if (has(st.germ) && !k) {
        add('noConstants', 'info',
          `No hay constantes de viabilidad para ${taxonOf(row) || 'esta especie'}: la proyección no se puede hacer y sólo queda la fecha de la última prueba.`,
          `No viability constants for ${taxonOf(row) || 'this species'}: the projection cannot be made and only the last test date is available.`);
      }
      /* prueba vencida */
      if (st.yearsSinceTest == null) {
        add('neverTested', 'crit', 'Nunca se le ha hecho una prueba de germinación.', 'It has never had a germination test.');
      } else if (st.yearsSinceTest > c.testInterval) {
        add('testDue', 'warn',
          `Van ${fmt(st.yearsSinceTest, 1)} años desde la última prueba (el intervalo del banco es de ${c.testInterval}).`,
          `${fmt(st.yearsSinceTest, 1)} years since the last test (the genebank interval is ${c.testInterval}).`,
          { value: st.yearsSinceTest });
      }
      /* existencias */
      if (has(st.stock)) {
        if (st.stock < c.minStock) {
          add('lowStock', 'crit',
            `Quedan ${fmtInt(st.stock)} semillas, por debajo del mínimo de ${fmtInt(c.minStock)}.`,
            `${fmtInt(st.stock)} seeds left, below the minimum of ${fmtInt(c.minStock)}.`, { value: st.stock });
        } else if (st.stock < c.minStock * 1.5) {
          add('stockWarn', 'warn',
            `Las existencias (${fmtInt(st.stock)}) se acercan al mínimo.`,
            `Stock (${fmtInt(st.stock)}) is getting close to the minimum.`, { value: st.stock });
        }
      } else {
        add('noStock', 'info', 'No hay existencias registradas.', 'No stock recorded.');
      }
    } else if (route === 'field') {
      const c = cfg.field;
      if (st.yearsSinceRegen == null) {
        add('neverReplanted', 'warn', 'No hay fecha de la última resiembra.', 'No date for the last replanting.');
      } else if (st.yearsSinceRegen > c.cycle) {
        add('replantDue', 'crit',
          `Van ${fmt(st.yearsSinceRegen, 1)} años desde la última resiembra (el ciclo es de ${c.cycle}).`,
          `${fmt(st.yearsSinceRegen, 1)} years since the last replanting (the cycle is ${c.cycle}).`,
          { value: st.yearsSinceRegen });
      }
      if (has(st.stock) && st.stock < c.minPlants) {
        add('fewPlants', 'crit',
          `Sólo quedan ${fmtInt(st.stock)} plantas (el mínimo es ${c.minPlants}): la deriva en la próxima resiembra será fuerte.`,
          `Only ${fmtInt(st.stock)} plants left (the minimum is ${c.minPlants}): drift at the next replanting will be severe.`,
          { value: st.stock });
      }
    } else if (route === 'invitro') {
      const c = cfg.invitro;
      const months = st.yearsSinceRegen == null ? null : st.yearsSinceRegen * 12;
      if (months == null) {
        add('neverSub', 'warn', 'No hay fecha del último subcultivo.', 'No date for the last subculture.');
      } else if (months > c.subMonths) {
        add('subDue', 'crit',
          `Van ${fmt(months, 0)} meses desde el último subcultivo (el intervalo es de ${c.subMonths}).`,
          `${fmt(months, 0)} months since the last subculture (the interval is ${c.subMonths}).`, { value: months });
      }
      if (has(st.stock) && st.stock < c.minJars) {
        add('fewJars', 'warn',
          `Quedan ${fmtInt(st.stock)} frascos (el mínimo es ${c.minJars}).`,
          `${fmtInt(st.stock)} jars left (the minimum is ${c.minJars}).`, { value: st.stock });
      }
    } else if (route === 'cryo') {
      const c = cfg.cryo;
      /* revisión de los criotubos (descongelar uno y comprobar que rebrota) cada
         checkYears; sin fecha de revisión se cuenta desde que entró al banco */
      const fromAcq = st.yearsSinceRegen == null;
      const last = fromAcq ? yearsSince(row.ACQDATE, today) : st.yearsSinceRegen;
      if (last == null) {
        add('neverChecked', 'warn', 'No hay fecha de la última revisión de los criotubos.', 'No date for the last check of the cryovials.');
      } else if (last > c.checkYears) {
        add('checkDue', 'warn',
          `Van ${fmt(last, 1)} años desde ${fromAcq ? 'que entró al banco, sin revisión registrada' : 'la última revisión'} (lo previsto es cada ${c.checkYears}).`,
          `${fmt(last, 1)} years since ${fromAcq ? 'it entered the genebank, with no check recorded' : 'the last check'} (the plan is every ${c.checkYears}).`,
          { value: last });
      }
      if (has(st.stock) && st.stock < c.minVials) {
        add('fewVials', 'warn',
          `Quedan ${fmtInt(st.stock)} criotubos (el mínimo es ${c.minVials}).`,
          `${fmtInt(st.stock)} cryovials left (the minimum is ${c.minVials}).`, { value: st.stock });
      }
    } else if (route === 'insitu' || route === 'onfarm') {
      const c = route === 'insitu' ? cfg.insitu : cfg.onfarm;
      const last = st.yearsSinceRegen != null ? st.yearsSinceRegen : yearsSince(row.COLLDATE, today);
      if (last != null && last > c.visitYears) {
        add('visitDue', 'warn',
          `Hace ${fmt(last, 1)} años que no se registra una visita al sitio (lo previsto es cada ${c.visitYears}).`,
          `${fmt(last, 1)} years since the last recorded visit to the site (the plan is every ${c.visitYears}).`,
          { value: last });
      }
    }

    /* algo que vale para todas las rutas ex situ */
    if (!['insitu', 'onfarm'].includes(route) && !MCPD.hasSafetyDup(row)) {
      add('noBackup', 'warn', 'Sin duplicado de seguridad en otra institución.', 'No safety duplicate in another institution.');
    }

    const order = { crit: 3, warn: 2, info: 1 };
    st.level = st.alerts.reduce((a, x) => Math.max(a, order[x.level] || 0), 0);
    st.levelName = ['ok', 'info', 'warn', 'crit'][st.level];
    st.score = st.alerts.reduce((a, x) => a + (order[x.level] || 0), 0);
    return st;
  }
  /* ---------- tamaño de muestra para regenerar ----------
     n plantas para retener, con probabilidad P, un alelo de frecuencia p. */
  function plantsNeeded(p, P, outcrossing) {
    if (!(p > 0 && p < 1) || !(P > 0 && P < 1)) return NaN;
    const gametesPerPlant = outcrossing ? 2 : 1;
    return Math.ceil(Math.log(1 - P) / (gametesPerPlant * Math.log(1 - p)));
  }
  /* probabilidad de retener ese alelo con n plantas */
  function retentionProb(p, n, outcrossing) {
    const g = (outcrossing ? 2 : 1) * n;
    return 1 - Math.pow(1 - p, g);
  }
  /* semillas que hay que sembrar para lograr esas plantas */
  function seedsToSow(plants, germPct, establishment) {
    const g = clamp((germPct || 0) / 100, 0.01, 1);
    const e = clamp(establishment == null ? 0.9 : establishment, 0.1, 1);
    return Math.ceil(plants / (g * e));
  }

  /* ---------- carga de trabajo de los próximos años ----------
     El año +k es el lapso de k a k + 1 años a partir de hoy. Lo atrasado (una
     prueba, una resiembra o un subcultivo que ya debió hacerse) cae en el año
     +0: es trabajo de esta temporada, no trabajo que desaparece. Los eventos se
     cuentan de verdad, uno por uno, desde la última fecha: con 24 meses entre
     subcultivos, un año toca y el siguiente no (0.5 por año en promedio). */
  function workload(rows, cfg, viab, years, today) {
    const horizon = years || 25;
    const perYear = new Array(horizon + 1).fill(0).map(() => ({ tests: 0, regen: 0, sub: 0, replant: 0, plants: 0 }));
    const bin = t => Math.floor(t + 1e-9);
    /* eventos cada `every` años a partir del primero, que si está atrasado va al año 0 */
    const series = (first, every, key) => {
      if (!(every > 0)) return;
      let t = Math.max(0, first);
      while (t < horizon + 1) { perYear[bin(t)][key]++; t += every; }
    };
    rows.forEach(r => {
      const route = MCPD.consRoute(r) || 'seed';
      const st = lotStatus(r, cfg, viab, today);
      if (route === 'seed') {
        /* pruebas cada testInterval a partir de la última */
        series(st.yearsSinceTest == null ? 0 : cfg.seed.testInterval - st.yearsSinceTest, cfg.seed.testInterval, 'tests');
        /* regeneración cuando la proyección cruza el umbral (o ya, si la prueba medida quedó abajo) */
        let y = st.yearsToThreshold;
        if (st.alerts.some(a => a.code === 'measuredLow')) y = 0;
        if (y != null && isFinite(y)) {
          if (y < 0) y = 0;
          if (y < horizon + 1) { perYear[bin(y)].regen++; perYear[bin(y)].plants += cfg.seed.regenPlants; }
        }
      } else if (route === 'field') {
        series(st.yearsSinceRegen == null ? 0 : cfg.field.cycle - st.yearsSinceRegen, cfg.field.cycle, 'replant');
      } else if (route === 'invitro') {
        const every = cfg.invitro.subMonths / 12;
        series(st.yearsSinceRegen == null ? 0 : every - st.yearsSinceRegen, every, 'sub');
      }
    });
    return perYear;
  }
  /* ---------- registrar una prueba o una regeneración ---------- */
  function recordTest(row, pct, dateStr, seedsUsed) {
    row.GP_GERMPCT = String(Math.round(pct * 10) / 10);
    row.GP_GERMDATE = dateStr;
    /* sin existencias registradas no hay de dónde descontar: no se inventa un cero */
    const s = optNum(row.GP_STOCK);
    if (has(s) && seedsUsed > 0) row.GP_STOCK = String(Math.max(0, s - seedsUsed));
    return row;
  }
  function recordRegeneration(row, dateStr, newStock, newGerm) {
    row.GP_REGENDATE = dateStr;
    if (has(newStock) && newStock >= 0) row.GP_STOCK = String(Math.round(newStock));
    if (has(newGerm) && newGerm >= 0) {
      row.GP_GERMPCT = String(Math.round(newGerm * 10) / 10);
      row.GP_GERMDATE = dateStr;
    }
    return row;
  }
  function todayStamp(d) {
    const x = d || new Date();
    return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`;
  }

  /* ---------- el panel completo ---------- */
  function analyse(rows, cfg, viab, today) {
    const now = today || new Date();
    const lots = rows.map((r, i) => ({ i, row: r, st: lotStatus(r, cfg, viab, now) }));
    const byLevel = { crit: [], warn: [], info: [], ok: [] };
    lots.forEach(l => byLevel[l.st.levelName === 'ok' ? 'ok' : l.st.levelName].push(l));
    const byRoute = new Map();
    /* existencias por unidad: semillas, plantas, frascos… no se suman entre sí */
    const stockByUnit = new Map();
    lots.forEach(l => {
      const k = l.st.route || NO_ROUTE;
      if (!byRoute.has(k)) byRoute.set(k, { route: k, n: 0, crit: 0, warn: 0, stock: 0, withStock: 0, unit: stockUnit(l.st.route) });
      const e = byRoute.get(k);
      e.n++;
      if (l.st.levelName === 'crit') e.crit++;
      if (l.st.levelName === 'warn') e.warn++;
      if (has(l.st.stock)) {
        e.stock += l.st.stock; e.withStock++;
        const u = stockUnit(l.st.route);
        stockByUnit.set(u, (stockByUnit.get(u) || 0) + l.st.stock);
      }
    });
    const codes = new Map();
    lots.forEach(l => l.st.alerts.forEach(a => {
      if (!codes.has(a.code)) codes.set(a.code, { code: a.code, level: a.level, n: 0, lots: [] });
      const e = codes.get(a.code);
      e.n++; e.lots.push(l.i);
    }));
    return {
      lots, byLevel, byRoute: [...byRoute.values()].sort((a, b) => b.n - a.n),
      stockByUnit: [...stockByUnit.entries()].map(([unit, n]) => ({ unit, n }))
        .sort((a, b) => Object.keys(STOCK_UNITS).indexOf(a.unit) - Object.keys(STOCK_UNITS).indexOf(b.unit)),
      codes: [...codes.values()].sort((a, b) => (b.level === a.level ? b.n - a.n : (b.level === 'crit' ? 1 : -1))),
      work: workload(rows, cfg, viab, 25, now),
      today: now,
    };
  }

  /* ---------- el nombre genérico de cada tipo de alerta ----------
     El mensaje de una alerta trae las cifras de su lote («la última prueba dio
     81 %»); para hablar de todas las del mismo tipo juntas (el informe del
     Bloque 10) hace falta un nombre sin cifras de nadie. */
  const ALERT_NAMES = {
    measuredLow: { es: 'Última prueba de germinación por debajo del umbral', en: 'Last germination test below the threshold' },
    belowThreshold: { es: 'Germinación proyectada por debajo del umbral', en: 'Projected germination below the threshold' },
    nearThreshold: { es: 'A menos de tres años de caer del umbral', en: 'Less than three years from dropping below the threshold' },
    noConstants: { es: 'Sin constantes de viabilidad: no se proyecta', en: 'No viability constants: not projected' },
    neverTested: { es: 'Nunca se le ha hecho una prueba de germinación', en: 'Never had a germination test' },
    testDue: { es: 'Prueba de germinación vencida', en: 'Germination test overdue' },
    lowStock: { es: 'Existencias por debajo del mínimo', en: 'Stock below the minimum' },
    stockWarn: { es: 'Existencias cerca del mínimo', en: 'Stock close to the minimum' },
    noStock: { es: 'Sin existencias registradas', en: 'No stock recorded' },
    neverReplanted: { es: 'Sin fecha de la última resiembra', en: 'No date for the last replanting' },
    replantDue: { es: 'Resiembra de campo vencida', en: 'Field replanting overdue' },
    fewPlants: { es: 'Menos plantas en campo que el mínimo', en: 'Fewer field plants than the minimum' },
    neverSub: { es: 'Sin fecha del último subcultivo', en: 'No date for the last subculture' },
    subDue: { es: 'Subcultivo in vitro vencido', en: 'In-vitro subculture overdue' },
    fewJars: { es: 'Menos frascos que el mínimo', en: 'Fewer jars than the minimum' },
    neverChecked: { es: 'Sin fecha de la última revisión de los criotubos', en: 'No date for the last cryovial check' },
    checkDue: { es: 'Revisión de los criotubos vencida', en: 'Cryovial check overdue' },
    fewVials: { es: 'Menos criotubos que el mínimo', en: 'Fewer cryovials than the minimum' },
    visitDue: { es: 'Visita al sitio vencida', en: 'Site visit overdue' },
    noBackup: { es: 'Sin duplicado de seguridad en otra institución', en: 'No safety duplicate in another institution' },
  };

  window.MANAGE = {
    ALERT_NAMES,
    DEFAULT_CONFIG, NO_ROUTE, STOCK_UNITS, stockUnit, optNum, PUBLISHED, customConstants,
    config, viabilityTable, taxonOf, parseDate, yearsSince,
    lotStatus, plantsNeeded, retentionProb, seedsToSow, workload,
    recordTest, recordRegeneration, todayStamp, analyse,
  };
})();
