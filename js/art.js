/* GermplasmPro — las ilustraciones, dibujadas por código.
   No hay fotografías: todo se genera con SVG a partir de modelos sencillos,
   así las figuras se adaptan al tema claro u oscuro (usan los tokens de color)
   y no pesan nada.

   La escena de la portada cuenta de un vistazo lo que hace la app: sobre una
   cuadrícula con puntos de colecta, las cinco rutas de conservación —el frasco
   de semillas, la colección viva en el campo, el frasco de cultivo in vitro,
   el criotubo y la población en su sitio—, con la etiqueta de una accesión y
   su código de barras. Las cuatro primeras son ex situ; la quinta, in situ.

   Aquí viven además piezas sueltas que usan otros bloques: la mazorca con sus
   granos y el chayote, que sirven de ejemplo en las fichas de especie. */

(function () {

  /* ---------- una mazorca con sus granos ---------- */
  function cornEar(opts) {
    const o = Object.assign({ x: 0, y: 0, h: 150, w: 44, grain: 'var(--mzAmarillo)', tip: true, rot: 0, seed: 7 }, opts);
    const rnd = mulberry32(o.seed);
    const rows = Math.round(o.h / 10), cols = 9;
    const parts = [];
    /* el olote, apenas visible entre los granos */
    parts.push(`<ellipse cx="0" cy="0" rx="${o.w / 2}" ry="${o.h / 2}" fill="var(--mzOlote)" opacity=".38"/>`);
    for (let r = 0; r < rows; r++) {
      /* posición vertical y ancho de la hilera: la mazorca es más angosta en la punta */
      const ty = -o.h / 2 + (r + 0.5) * (o.h / rows);
      const k = 1 - Math.pow(Math.abs(ty) / (o.h / 2), 2.6) * (ty > 0 ? 0.55 : 0.25);
      const halfW = (o.w / 2) * k;
      for (let c = 0; c < cols; c++) {
        const fx = (c + 0.5) / cols * 2 - 1;          /* -1 .. 1 a lo ancho */
        const cx = fx * halfW;
        if (Math.abs(fx) > 0.98) continue;
        const depth = Math.sqrt(Math.max(0, 1 - fx * fx)); /* sombreado del volumen */
        const rx = (halfW / cols) * 1.7, ry = (o.h / rows) * 0.78;
        const jitter = (rnd() - 0.5) * 0.6;
        /* un grano de cada quince sale de otro color: el maíz criollo es una mezcla */
        const fill = rnd() < 0.07 ? 'var(--mzBlanco)' : o.grain;
        parts.push(`<ellipse cx="${(cx + jitter).toFixed(1)}" cy="${(ty + (r % 2 ? 2.2 : 0)).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" opacity="${(0.55 + 0.45 * depth).toFixed(2)}"/>`);
      }
    }
    /* totomoxtle: dos hojas de la base */
    const husk = `<path d="M ${-o.w * 0.34} ${o.h * 0.42} C ${-o.w * 0.95} ${o.h * 0.30}, ${-o.w * 0.85} ${o.h * 0.72}, ${-o.w * 0.12} ${o.h * 0.62} Z" fill="var(--squash)" opacity=".5"/>
      <path d="M ${o.w * 0.30} ${o.h * 0.44} C ${o.w * 0.95} ${o.h * 0.32}, ${o.w * 0.9} ${o.h * 0.76}, ${o.w * 0.10} ${o.h * 0.62} Z" fill="var(--squash)" opacity=".38"/>`;
    /* los cabellos (estigmas) de la punta */
    const silk = o.tip ? `<g stroke="var(--mzPinto)" stroke-width="1.5" fill="none" opacity=".75" stroke-linecap="round">
      <path d="M -6 ${-o.h / 2} C -10 ${-o.h / 2 - 14}, -4 ${-o.h / 2 - 22}, -12 ${-o.h / 2 - 30}"/>
      <path d="M 0 ${-o.h / 2 + 1} C 2 ${-o.h / 2 - 16}, -2 ${-o.h / 2 - 24}, 4 ${-o.h / 2 - 34}"/>
      <path d="M 6 ${-o.h / 2} C 12 ${-o.h / 2 - 12}, 8 ${-o.h / 2 - 24}, 16 ${-o.h / 2 - 28}"/>
    </g>` : '';
    return `<g transform="translate(${o.x},${o.y}) rotate(${o.rot})">${husk}${parts.join('')}${silk}</g>`;
  }

  /* ---------- un chayote, con sus espinas y su surco ---------- */
  function chayote(opts) {
    const o = Object.assign({ x: 0, y: 0, s: 1, rot: -12, spiny: true, seed: 3 }, opts);
    const rnd = mulberry32(o.seed);
    const spines = [];
    if (o.spiny) {
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + (rnd() - 0.5) * 0.18, r = 25 + rnd() * 5;
        const x1 = Math.cos(a) * r * 0.86, y1 = Math.sin(a) * r * 1.05 + 4;
        const x2 = Math.cos(a) * (r + 9) * 0.86, y2 = Math.sin(a) * (r + 9) * 1.05 + 4;
        spines.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`);
      }
    }
    return `<g transform="translate(${o.x},${o.y}) rotate(${o.rot}) scale(${o.s})">
      <g stroke="var(--squash)" stroke-width="1.4" stroke-linecap="round" opacity=".7">${spines.join('')}</g>
      <path d="M 0 -30 C 22 -30, 30 -8, 27 12 C 24 30, 12 36, 0 36 C -12 36, -24 30, -27 12 C -30 -8, -22 -30, 0 -30 Z" fill="var(--squash)" opacity=".92"/>
      <path d="M 0 -26 C 12 -26, 18 -10, 16 8" fill="none" stroke="var(--card-bg)" stroke-width="1.6" opacity=".5"/>
      <path d="M -8 34 C -4 26, 4 26, 8 34" fill="none" stroke="var(--earth)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M 0 -30 C -2 -38, 4 -42, 10 -40" fill="none" stroke="var(--earth)" stroke-width="2.4" stroke-linecap="round"/>
    </g>`;
  }

  /* ---------- el fondo: cuadrícula geográfica con puntos de colecta ---------- */
  function collectingGrid(w, h, seed) {
    const rnd = mulberry32(seed || 11);
    const lines = [];
    for (let x = 0; x <= w; x += 34) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
    for (let y = 0; y <= h; y += 34) lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
    /* los puntos se agrupan como se agrupan de verdad las colectas: por
       carretera y por valle, no al azar uniforme */
    const pts = [];
    const cores = [[0.22, 0.30], [0.55, 0.22], [0.70, 0.58], [0.34, 0.70], [0.82, 0.36]];
    const colors = ['var(--mzAzul)', 'var(--mzRojo)', 'var(--mzAmarillo)', 'var(--squash)', 'var(--mzMorado)'];
    cores.forEach((c, i) => {
      const n = 5 + Math.floor(rnd() * 5);
      for (let k = 0; k < n; k++) {
        const x = (c[0] + (rnd() - 0.5) * 0.22) * w;
        const y = (c[1] + (rnd() - 0.5) * 0.20) * h;
        const r = 2.6 + rnd() * 2.2;
        pts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${colors[i % colors.length]}" opacity=".75"/>`);
      }
    });
    return `<g stroke="var(--grid)" stroke-width="1">${lines.join('')}</g><g>${pts.join('')}</g>`;
  }

  /* ---------- la etiqueta de la accesión, con su código de barras ---------- */
  function accessionTag(x, y, code, seed, sub) {
    const rnd = mulberry32(seed || 5);
    const bars = [];
    let bx = 0;
    while (bx < 96) {
      const w = 1 + Math.round(rnd() * 3);
      if (rnd() > 0.38) bars.push(`<rect x="${bx}" y="0" width="${w}" height="20" fill="var(--text)" opacity=".8"/>`);
      bx += w + 1 + Math.round(rnd() * 2);
    }
    return `<g transform="translate(${x},${y})">
      <rect x="-8" y="-10" width="126" height="62" rx="8" fill="var(--card-bg)" stroke="var(--border-strong)"/>
      <g transform="translate(2,0)">${bars.join('')}</g>
      <text x="2" y="36" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="var(--text)">${code}</text>
      <text x="2" y="48" font-family="system-ui, sans-serif" font-size="9" fill="var(--text-muted)">${esc(sub || '')}</text>
      <circle cx="104" cy="40" r="7" fill="var(--stOk-soft)" stroke="var(--stOk)"/>
      <path d="M 100.5 40 l 2.5 2.6 l 4.6 -5" fill="none" stroke="var(--stOk)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  }

  /* ---------- las cinco rutas de conservación, dibujadas una a una ----------
     Cada pieza cabe en una caja de 76 x 96 con el origen en su centro-abajo,
     para poder alinearlas en una fila sin cuentas raras. */

  /* 1. banco de semillas: el frasco con la semilla seca */
  function seedJar(seed) {
    const rnd = mulberry32(seed || 1);
    const grains = [];
    const colors = ['var(--mzAmarillo)', 'var(--mzAzul)', 'var(--mzRojo)', 'var(--mzBlanco)', 'var(--mzPinto)'];
    for (let i = 0; i < 26; i++) {
      const x = -13 + rnd() * 26, y = -26 + rnd() * 24;
      grains.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.1" ry="2.5" fill="${colors[Math.floor(rnd() * colors.length)]}" opacity=".95"/>`);
    }
    return `<g>
      <rect x="-12" y="-58" width="24" height="7" rx="2.5" fill="var(--earth)"/>
      <path d="M -16 -51 h 32 v 44 a 6 6 0 0 1 -6 6 h -20 a 6 6 0 0 1 -6 -6 z" fill="var(--card-bg)" stroke="var(--border-strong)" stroke-width="1.6"/>
      <clipPath id="jarClip-${seed || 1}"><path d="M -16 -51 h 32 v 44 a 6 6 0 0 1 -6 6 h -20 a 6 6 0 0 1 -6 -6 z"/></clipPath>
      <g clip-path="url(#jarClip-${seed || 1})">${grains.join('')}</g>
      <path d="M -11 -46 v 38" stroke="#ffffff" stroke-width="3" opacity=".45" stroke-linecap="round"/>
      <rect x="-13" y="-36" width="19" height="9" rx="2" fill="var(--card-bg)" stroke="var(--border)" opacity=".92"/>
      <path d="M -10 -31 h 13 M -10 -34 h 9" stroke="var(--text-muted)" stroke-width="1" opacity=".8"/>
    </g>`;
  }

  /* 2. banco de campo: la colección viva, en surcos */
  function fieldPlot() {
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const y = -6 + i * 7;
      rows.push(`<ellipse cx="0" cy="${y}" rx="${22 - i * 2}" ry="2.6" fill="var(--earth)" opacity="${0.22 + i * 0.08}"/>`);
    }
    const plant = (x, y, s, c) => `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M 0 0 v -22" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M 0 -8 C -9 -12, -12 -18, -10 -22 C -4 -22, -1 -15, 0 -8 Z" fill="${c}" opacity=".9"/>
      <path d="M 0 -13 C 9 -17, 12 -23, 10 -27 C 4 -27, 1 -20, 0 -13 Z" fill="${c}" opacity=".75"/>
      <path d="M 0 -20 C -7 -24, -9 -29, -7 -33 C -2 -32, -1 -26, 0 -20 Z" fill="${c}" opacity=".85"/>
    </g>`;
    return `<g>
      ${rows.join('')}
      ${plant(-14, -6, 0.95, 'var(--squash)')}
      ${plant(2, -1, 1.15, 'var(--s3)')}
      ${plant(16, -7, 0.85, 'var(--squash)')}
      <path d="M -24 2 h 48" stroke="var(--earth)" stroke-width="2" opacity=".5" stroke-linecap="round"/>
    </g>`;
  }

  /* 3. in vitro: la plántula en su frasco de cultivo */
  function invitroJar() {
    return `<g>
      <rect x="-13" y="-56" width="26" height="6" rx="2" fill="var(--text-muted)" opacity=".6"/>
      <path d="M -14 -50 h 28 v 40 a 5 5 0 0 1 -5 5 h -18 a 5 5 0 0 1 -5 -5 z" fill="var(--card-bg)" stroke="var(--border-strong)" stroke-width="1.6"/>
      <path d="M -13 -14 h 26 v 4 a 5 5 0 0 1 -5 5 h -16 a 5 5 0 0 1 -5 -5 z" fill="var(--gold)" opacity=".45"/>
      <path d="M 0 -14 v -20" stroke="var(--s3)" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 0 -24 C -8 -26, -10 -32, -8 -35 C -3 -34, -1 -29, 0 -24 Z" fill="var(--squash)" opacity=".9"/>
      <path d="M 0 -29 C 8 -31, 10 -37, 8 -40 C 3 -39, 1 -34, 0 -29 Z" fill="var(--squash)" opacity=".75"/>
      <path d="M -9 -46 v 30" stroke="#ffffff" stroke-width="2.6" opacity=".4" stroke-linecap="round"/>
    </g>`;
  }

  /* 4. criopreservación: el criotubo saliendo del vapor */
  function cryoVial() {
    return `<g>
      <path d="M -10 -56 h 20 v 6 h -20 z" fill="var(--sky)" opacity=".8"/>
      <path d="M -9 -50 h 18 v 30 a 9 9 0 0 1 -9 9 a 9 9 0 0 1 -9 -9 z" fill="var(--card-bg)" stroke="var(--border-strong)" stroke-width="1.6"/>
      <path d="M -7 -22 h 14 v 2 a 7 7 0 0 1 -7 7 a 7 7 0 0 1 -7 -7 z" fill="var(--sky)" opacity=".55"/>
      <g stroke="var(--sky)" stroke-width="1.5" fill="none" opacity=".55" stroke-linecap="round">
        <path d="M -20 -4 c 5 -4, 10 2, 15 -2"/>
        <path d="M 6 -2 c 5 -4, 10 2, 15 -2"/>
        <path d="M -14 4 c 6 -4, 12 2, 18 -2"/>
      </g>
      <g stroke="var(--sky)" stroke-width="1.2" opacity=".9">
        <path d="M 0 -40 v 12 M -5 -37 l 10 6 M 5 -37 l -10 6"/>
      </g>
      <path d="M -6 -46 v 24" stroke="#ffffff" stroke-width="2.4" opacity=".4" stroke-linecap="round"/>
    </g>`;
  }

  /* 5. in situ: la población en su sitio, entre cerros */
  function insituSite() {
    const plant = (x, s, c) => `<g transform="translate(${x},0) scale(${s})">
      <path d="M 0 0 v -12" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 0 -5 C -6 -8, -7 -13, -5 -15 C -1 -14, -0.5 -9, 0 -5 Z" fill="${c}" opacity=".9"/>
      <path d="M 0 -9 C 6 -12, 7 -17, 5 -19 C 1 -18, 0.5 -13, 0 -9 Z" fill="${c}" opacity=".75"/>
    </g>`;
    return `<g>
      <circle cx="13" cy="-46" r="7" fill="var(--gold)" opacity=".85"/>
      <path d="M -26 -14 L -12 -36 L -1 -20 L 7 -30 L 24 -14 Z" fill="var(--earth)" opacity=".45"/>
      <path d="M -26 -14 h 52" stroke="var(--earth)" stroke-width="1.6" opacity=".6"/>
      ${plant(-17, 1, 'var(--squash)')}
      ${plant(-5, 1.25, 'var(--s3)')}
      ${plant(8, 0.95, 'var(--squash)')}
      ${plant(19, 1.1, 'var(--s3)')}
      <path d="M -26 2 h 52" stroke="var(--earth)" stroke-width="2" opacity=".35" stroke-linecap="round"/>
    </g>`;
  }

  const ROUTES = [
    { k: 'seed', draw: seedJar, es: 'semillas', en: 'seed', c: 'var(--accent)' },
    { k: 'field', draw: fieldPlot, es: 'campo', en: 'field', c: 'var(--squash)' },
    { k: 'invitro', draw: invitroJar, es: 'in vitro', en: 'in vitro', c: 'var(--gold)' },
    { k: 'cryo', draw: cryoVial, es: 'crio', en: 'cryo', c: 'var(--sky)' },
    { k: 'insitu', draw: insituSite, es: 'in situ', en: 'in situ', c: 'var(--s3)' },
  ];

  /* ---------- la escena completa ----------
     Las cinco rutas de conservación en fila, sobre la cuadrícula con los
     puntos de colecta, y abajo la etiqueta de una accesión cualquiera. */
  function heroArt(seed, lang) {
    const s = seed || 20260922;
    const L = lang || (window.I18N ? I18N.lang : 'es');
    const W = 440, H = 340;
    const x0 = 44, step = 88, yBase = 162;
    const pieces = ROUTES.map((r, i) => {
      const x = x0 + i * step;
      return `<g transform="translate(${x},${yBase})">
        <rect x="-38" y="-78" width="76" height="100" rx="14" fill="var(--card-bg)" opacity=".55" stroke="var(--border)"/>
        ${r.draw(s + i)}
        <text x="0" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="${r.c}">${esc(r[L] || r.es)}</text>
      </g>`;
    }).join('');
    const label = L === 'en' ? 'Ex situ' : 'Ex situ';
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${L === 'en' ? 'The five conservation routes over a collecting grid' : 'Las cinco rutas de conservación sobre una cuadrícula de colecta'}">
      <defs><clipPath id="heroClip"><rect x="0" y="0" width="${W}" height="${H}" rx="18"/></clipPath></defs>
      <g clip-path="url(#heroClip)">
        <rect x="0" y="0" width="${W}" height="${H}" fill="var(--bg-soft)" opacity=".55"/>
        ${collectingGrid(W, H, s)}
        <g>
          <line x1="352" y1="62" x2="352" y2="208" stroke="var(--border-strong)" stroke-dasharray="4 4"/>
          <text x="176" y="56" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="800" letter-spacing="1.4" fill="var(--text-muted)">${label.toUpperCase()}</text>
          <text x="396" y="56" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="800" letter-spacing="1.4" fill="var(--s3)">IN SITU</text>
        </g>
        ${pieces}
        ${accessionTag(24, 262, 'MEX-CR-0417', s + 9, L === 'en' ? 'accession · MCPD passport' : 'accesión · pasaporte MCPD')}
      </g>
    </svg>`;
  }

  /* logotipo pequeño: una mazorca esquemática */
  function logoSVG() {
    return `<svg viewBox="-16 -18 32 36" aria-hidden="true">
      <ellipse cx="0" cy="0" rx="9" ry="16" fill="var(--mzAmarillo)"/>
      <g fill="var(--mzOlote)" opacity=".55">
        <ellipse cx="-3" cy="-9" rx="2" ry="2.6"/><ellipse cx="3" cy="-9" rx="2" ry="2.6"/>
        <ellipse cx="-3" cy="-3" rx="2" ry="2.6"/><ellipse cx="3" cy="-3" rx="2" ry="2.6"/>
        <ellipse cx="-3" cy="3" rx="2" ry="2.6"/><ellipse cx="3" cy="3" rx="2" ry="2.6"/>
        <ellipse cx="0" cy="9" rx="2" ry="2.6"/>
      </g>
      <path d="M -8 8 C -15 4, -14 15, -2 14 Z" fill="var(--squash)"/>
      <path d="M 8 8 C 15 4, 14 15, 2 14 Z" fill="var(--squash)" opacity=".75"/>
    </svg>`;
  }

  window.ART = { cornEar, chayote, collectingGrid, accessionTag, heroArt, logoSVG, seedJar, fieldPlot, invitroJar, cryoVial, insituSite, ROUTES };
})();
