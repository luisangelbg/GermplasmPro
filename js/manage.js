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

  function config(saved) {
    const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (saved) Object.keys(saved).forEach(k => { if (c[k]) Object.assign(c[k], saved[k]); });
    return c;
  }

  /* ---------- constantes de viabilidad por taxón ----------
     El maíz viene con las publicadas; lo demás lo pone quien cura, con su
     fuente. Sin constantes no hay proyección: es preferible no decir nada a
     decir un número inventado. */
  function viabilityTable(saved) {
    const t = {
      'Zea mays': { KE: 6.474, CW: 2.115, CH: 0.0329, CQ: 0.000478, source: 'Ellis & Roberts (publicadas)' },
    };
    if (saved) Object.keys(saved).forEach(k => { t[k] = Object.assign({ CH: 0.0329, CQ: 0.000478 }, saved[k]); });
    return t;
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
    const st = {
      route, alerts: [], stock: Number(row.GP_STOCK), germ: Number(row.GP_GERMPCT),
      yearsSinceTest: yearsSince(row.GP_GERMDATE, today),
      yearsSinceRegen: yearsSince(row.GP_REGENDATE, today),
      projected: null, yearsToThreshold: null, sigmaYears: null, constants: null,
    };
    const add = (code, level, es, en, extra) => st.alerts.push(Object.assign({ code, level, msg: { es, en } }, extra || {}));

    if (route === 'seed' || route === '') {
      const c = cfg.seed;
      const k = viab[taxonOf(row)];
      /* proyección de la viabilidad, sólo si hay constantes para el taxón */
      if (k && isFinite(st.germ) && st.yearsSinceTest != null) {
        const sig = GB.sigma(k.KE, k.CW, k.CH, k.CQ, c.moisture, c.temp);
        st.sigmaYears = sig / 365.25;
        st.constants = k;
        st.projected = GB.germination(st.germ, st.yearsSinceTest * 365.25, sig);
        const yrs = GB.yearsTo(st.germ, c.threshold, sig) - st.yearsSinceTest;
        st.yearsToThreshold = yrs;
        if (st.projected < c.threshold) {
          add('belowThreshold', 'crit',
            `La proyección lo pone en ${fmt(st.projected, 0)} % de germinación, por debajo del umbral de ${c.threshold} %.`,
            `The projection puts it at ${fmt(st.projected, 0)}% germination, below the ${c.threshold}% threshold.`,
            { value: st.projected });
        } else if (yrs < 3) {
          add('nearThreshold', 'warn',
            `Le quedan unos ${fmt(Math.max(0, yrs), 1)} años antes de caer del umbral.`,
            `About ${fmt(Math.max(0, yrs), 1)} years left before it drops below the threshold.`, { value: yrs });
        }
      } else if (isFinite(st.germ) && !k) {
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
      /* medida por debajo del umbral, sin necesidad de proyectar */
      if (isFinite(st.germ) && st.germ < c.threshold) {
        add('measuredLow', 'crit',
          `La última prueba dio ${fmt(st.germ, 0)} %, por debajo del umbral.`,
          `The last test gave ${fmt(st.germ, 0)}%, below the threshold.`, { value: st.germ });
      }
      /* existencias */
      if (isFinite(st.stock)) {
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
      if (isFinite(st.stock) && st.stock < c.minPlants) {
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
      if (isFinite(st.stock) && st.stock < c.minJars) {
        add('fewJars', 'warn',
          `Quedan ${fmtInt(st.stock)} frascos (el mínimo es ${c.minJars}).`,
          `${fmtInt(st.stock)} jars left (the minimum is ${c.minJars}).`, { value: st.stock });
      }
    } else if (route === 'cryo') {
      const c = cfg.cryo;
      if (isFinite(st.stock) && st.stock < c.minVials) {
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
    if (!['insitu', 'onfarm'].includes(route) && !String(row.DUPLSITE || '').trim()) {
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

  /* ---------- carga de trabajo de los próximos años ---------- */
  function workload(rows, cfg, viab, years, today) {
    const horizon = years || 25;
    const perYear = new Array(horizon + 1).fill(0).map(() => ({ tests: 0, regen: 0, sub: 0, replant: 0 }));
    rows.forEach(r => {
      const route = MCPD.consRoute(r) || 'seed';
      const st = lotStatus(r, cfg, viab, today);
      if (route === 'seed') {
        /* pruebas cada testInterval a partir de la última */
        let t = st.yearsSinceTest == null ? 0 : cfg.seed.testInterval - st.yearsSinceTest;
        while (t <= horizon) {
          if (t >= 0) perYear[Math.round(t)].tests++;
          t += cfg.seed.testInterval;
        }
        /* regeneración cuando la proyección cruza el umbral */
        if (st.yearsToThreshold != null) {
          let y = st.yearsToThreshold;
          if (y < 0) y = 0;
          if (y <= horizon) perYear[Math.round(y)].regen++;
        }
      } else if (route === 'field') {
        let y = st.yearsSinceRegen == null ? 0 : cfg.field.cycle - st.yearsSinceRegen;
        while (y <= horizon) {
          if (y >= 0) perYear[Math.round(y)].replant++;
          y += cfg.field.cycle;
        }
      } else if (route === 'invitro') {
        const per = Math.max(1, Math.round(12 / cfg.invitro.subMonths));
        for (let y = 0; y <= horizon; y++) perYear[y].sub += per;
      }
    });
    return perYear;
  }

  /* ---------- registrar una prueba o una regeneración ---------- */
  function recordTest(row, pct, dateStr, seedsUsed) {
    row.GP_GERMPCT = String(Math.round(pct * 10) / 10);
    row.GP_GERMDATE = dateStr;
    const s = Number(row.GP_STOCK);
    if (isFinite(s) && seedsUsed > 0) row.GP_STOCK = String(Math.max(0, s - seedsUsed));
    return row;
  }
  function recordRegeneration(row, dateStr, newStock, newGerm) {
    row.GP_REGENDATE = dateStr;
    if (isFinite(newStock) && newStock > 0) row.GP_STOCK = String(Math.round(newStock));
    if (isFinite(newGerm) && newGerm > 0) {
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
    lots.forEach(l => {
      const k = l.st.route || 'sin declarar';
      if (!byRoute.has(k)) byRoute.set(k, { route: k, n: 0, crit: 0, warn: 0, stock: 0 });
      const e = byRoute.get(k);
      e.n++;
      if (l.st.levelName === 'crit') e.crit++;
      if (l.st.levelName === 'warn') e.warn++;
      if (isFinite(l.st.stock)) e.stock += l.st.stock;
    });
    const codes = new Map();
    lots.forEach(l => l.st.alerts.forEach(a => {
      if (!codes.has(a.code)) codes.set(a.code, { code: a.code, level: a.level, n: 0, lots: [] });
      const e = codes.get(a.code);
      e.n++; e.lots.push(l.i);
    }));
    return {
      lots, byLevel, byRoute: [...byRoute.values()].sort((a, b) => b.n - a.n),
      codes: [...codes.values()].sort((a, b) => (b.level === a.level ? b.n - a.n : (b.level === 'crit' ? 1 : -1))),
      work: workload(rows, cfg, viab, 25, now),
      today: now,
    };
  }

  window.MANAGE = {
    DEFAULT_CONFIG, config, viabilityTable, taxonOf, parseDate, yearsSince,
    lotStatus, plantsNeeded, retentionProb, seedsToSow, workload,
    recordTest, recordRegeneration, todayStamp, analyse,
  };
})();
