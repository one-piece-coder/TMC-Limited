/*
 * The Fable Loom — stained glass.
 * Medieval church windows drawn entirely in code:
 *   FableArt.portrait(kind) -> the hero creature in a round rose window
 *   FableArt.plate(fable)   -> three lancet windows in a church wall: the companion,
 *                              the hero before their realm, and the prize they seek
 * Glass colors and stone come from CSS classes, so the art follows the page theme.
 */
(function (root) {
  'use strict';

  // ---------- Drawing primitives ----------
  const E = (cx, cy, rx, ry, rot) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
  const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  const P = (d) => `<path d="${d}"/>`;
  const L = (d, w) => `<path d="${d}" fill="none" stroke-width="${w || 4}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const CUT = (inner) => `<g class="cut">${inner}</g>`;   // lines and holes in the page color
  const EYE = (cx, cy, r) => `<circle class="eye" cx="${cx}" cy="${cy}" r="${r || 1.6}"/>`;
  const legs = (xs, top, w, bottom) =>
    xs.map((x, i) => L(`M${x},${top} L${x + (i % 2 ? 1 : -1)},${bottom || 97}`, w)).join('');

  // ---------- The creatures (feet on y≈97, facing right) ----------
  const CREATURES = {
    fox: P('M30,60 C14,56 4,62 3,74 C12,72 22,72 34,68 Z') + E(50, 62, 22, 11) + legs([36, 42, 60, 66], 68, 4) +
      P('M62,56 L72,46 L78,58 L66,68 Z') + E(75, 50, 9, 7) + P('M78,46 L94,54 L80,57 Z') +
      P('M68,46 L69,33 L75,44 Z') + P('M73,44 L77,32 L80,45 Z') + CUT(L('M3,74 C8,72 10,72 12,72', 2)) + EYE(78, 49),

    wolf: P('M28,56 C18,62 12,74 12,86 C20,80 26,72 32,64 Z') + E(50, 58, 24, 13) + legs([35, 42, 60, 67], 64, 5) +
      P('M62,52 L72,40 L80,52 L68,66 Z') + E(76, 45, 10, 8) + P('M80,41 L97,48 L96,52 L82,54 Z') +
      P('M70,40 L71,28 L77,38 Z') + P('M75,38 L79,27 L82,40 Z') + EYE(79, 44),

    lion: L('M27,60 C16,62 12,70 10,80', 3) + C(10, 83, 4) + E(48, 62, 24, 12) + legs([36, 42, 58, 64], 68, 6) +
      C(72, 52, 16) + E(81, 54, 9, 8) + E(88, 59, 6, 4.5) + CUT(L('M62,46 C66,52 66,58 62,64', 1.5)) + EYE(84, 52),

    tiger: L('M27,58 C14,54 8,46 12,36', 4) + E(48, 62, 25, 12) + legs([35, 42, 58, 64], 68, 6) +
      P('M60,56 L70,46 L76,64 L64,70 Z') + E(76, 54, 11, 10) + E(85, 58, 6, 5) + C(70, 45, 3.5) + C(77, 43, 3.5) +
      CUT(L('M38,51 L42,62', 2.5) + L('M47,50 L50,62', 2.5) + L('M56,51 L58,62', 2.5) + L('M30,56 L34,66', 2.5)) + EYE(80, 52),

    lynx: P('M28,57 L21,55 L21,62 Z') + E(46, 62, 20, 12) + legs([33, 39, 54, 60], 66, 5.5) +
      P('M56,56 L66,46 L72,64 L60,70 Z') + E(73, 52, 10, 9) + E(81, 56, 5, 4) +
      P('M66,46 L67,34 L72,44 Z') + P('M72,44 L76,33 L78,46 Z') + L('M67,34 L66,28', 1.5) + L('M76,33 L76,27', 1.5) +
      P('M66,58 L60,66 L68,62 Z') + EYE(76, 50),

    hare: E(38, 80, 15, 15) + E(50, 76, 22, 14, -15) + E(72, 58, 10, 8, -10) +
      P('M64,52 C60,36 62,22 66,18 C70,24 70,40 69,52 Z') + P('M69,51 C70,34 74,22 79,20 C80,28 76,42 73,52 Z') +
      C(23, 74, 5) + L('M62,84 L64,97', 4) + L('M56,86 L57,97', 4) + P('M30,92 L50,92 L52,98 L28,98 Z') + EYE(76, 56),

    mouse: L('M32,88 C18,90 10,82 4,88', 2) + E(52, 84, 22, 13) + P('M66,76 C76,74 86,80 94,86 C86,92 74,94 66,92 Z') +
      C(68, 72, 7) + CUT(C(68, 72, 3.5)) + EYE(80, 82, 1.4) + L('M44,94 L44,98', 3) + L('M62,94 L63,98', 3),

    tortoise: P('M18,86 C20,58 40,46 54,46 C70,46 84,60 84,86 Z') + P('M80,80 C86,72 96,72 97,79 C96,84 88,86 80,86 Z') +
      P('M26,84 L22,98 L32,98 L34,84 Z') + P('M68,84 L66,98 L76,98 L76,84 Z') + P('M18,82 L10,88 L18,86 Z') +
      CUT(L('M36,58 L42,72 L60,72 L66,58', 2) + L('M42,72 L38,86', 2) + L('M60,72 L64,86', 2) + L('M20,80 L82,80', 2)) + EYE(91, 77),

    owl: L('M8,96 L94,96', 4) + E(50, 62, 22, 30) + P('M30,42 L31,22 L44,34 Z') + P('M70,42 L69,22 L56,34 Z') +
      CUT(C(41, 44, 7.5) + C(59, 44, 7.5) + P('M48,52 L52,52 L50,58 Z') + L('M38,70 L44,74 L50,70 L56,74 L62,70', 1.5) + L('M40,80 L46,84 L52,80 L58,84', 1.5)) +
      C(41, 44, 3) + C(59, 44, 3) + L('M42,90 L42,96', 3) + L('M58,90 L58,96', 3),

    crow: P('M30,62 L6,74 L10,80 L34,70 Z') + E(48, 62, 22, 13, -12) + C(70, 48, 10) + P('M78,44 L96,50 L78,54 Z') +
      L('M46,74 L44,97', 2.5) + L('M54,74 L56,97', 2.5) + L('M39,97 L49,97', 2) + L('M52,97 L62,97', 2) +
      CUT(L('M34,60 C44,56 54,60 62,66', 1.5)) + EYE(72, 46),

    sparrow: P('M30,74 L12,82 L14,88 L34,80 Z') + E(50, 74, 20, 15, -10) + C(68, 60, 10) + P('M76,57 L87,61 L76,64 Z') +
      L('M48,88 L46,97', 2) + L('M56,88 L57,97', 2) + CUT(L('M36,72 C46,68 56,72 60,78', 1.5) + L('M40,78 C48,76 54,78 58,82', 1.5)) + EYE(70, 58),

    heron: E(40, 46, 18, 9, -15) + P('M24,48 L10,54 L24,53 Z') + L('M54,42 C66,36 54,22 66,16', 5) + E(68, 15, 5, 4) +
      P('M71,13 L95,18 L71,18 Z') + L('M38,54 L36,97', 2.5) + L('M44,54 L48,97', 2.5) + L('M64,13 L52,9', 1.5) +
      L('M32,97 L40,97', 2) + L('M45,97 L54,97', 2) + EYE(68, 14, 1.2),

    elephant: E(44, 54, 30, 22) + C(74, 46, 16) + L('M86,50 C92,62 90,76 95,86', 7) +
      legs([26, 38, 56, 68], 68, 11) + L('M14,50 L10,66', 2) +
      CUT(`<path d="M64,38 C56,40 56,62 66,64 C72,60 74,44 64,38 Z" fill="none" stroke-width="1.6"/>` + L('M82,60 L93,63', 3)) + EYE(80, 42),

    ant: E(24, 66, 16, 11, -10) + E(48, 64, 9, 6) + C(66, 58, 8) +
      L('M70,52 C74,40 80,36 86,34', 2) + L('M66,51 C68,40 70,34 76,30', 2) +
      L('M44,68 L34,84 L28,97', 2) + L('M48,68 L48,84 L46,97', 2) + L('M52,68 L60,84 L66,97', 2) + L('M73,60 L79,64', 2) + EYE(69, 56, 1.4),

    stag: E(46, 56, 20, 11) + P('M58,52 L66,34 L74,36 L68,58 Z') + E(74, 34, 8, 5, 15) + P('M76,31 L88,40 L78,41 Z') +
      L('M70,30 C66,18 70,10 62,2', 2.5) + L('M67,18 L58,14', 2) + L('M68,10 L74,4', 2) +
      L('M74,29 C78,18 84,12 82,4', 2.5) + L('M80,16 L89,12', 2) + P('M68,32 L60,28 L66,36 Z') +
      legs([36, 42, 54, 60], 62, 3.5) + P('M27,52 L22,56 L27,58 Z') + EYE(76, 33, 1.3),

    badger: E(46, 78, 30, 13) + P('M68,70 C80,68 90,76 96,84 C88,88 76,88 68,86 Z') + C(70, 70, 3.5) +
      legs([24, 34, 58, 66], 84, 6) + P('M17,76 L8,80 L17,82 Z') + CUT(L('M72,74 L93,83', 2.5)),

    ox: P('M16,50 C16,42 30,38 50,40 C62,40 66,44 70,48 L70,72 C60,76 26,76 16,70 Z') + C(58, 44, 9) +
      P('M66,46 L84,52 L90,66 L82,72 L70,64 Z') + L('M72,47 C70,38 76,34 83,36', 3.5) + P('M70,50 L61,47 L67,55 Z') +
      legs([22, 30, 58, 64], 70, 7) + L('M16,52 C10,60 10,70 12,80', 2) + EYE(80, 56, 1.4),

    bear: E(46, 64, 30, 19) + C(54, 48, 12) + E(80, 62, 12, 10) + E(90, 66, 6, 4.5) + C(74, 52, 4.5) +
      legs([26, 36, 58, 66], 72, 10) + EYE(83, 59, 1.4)
  };

  let uid = 0;

  // Lead outline under a gold-glass figure: a dilated dark copy, then the glass on top.
  function glassFigure(body, transform, glassClass, id) {
    return `<g transform="${transform}">` +
      `<g class="lead-fig" filter="url(#${id}-dl)"><g class="fig">${body}</g></g>` +
      `<g class="${glassClass}"><g class="fig">${body}</g></g></g>`;
  }
  const leadFilter = (id, r) =>
    `<filter id="${id}-dl" x="-20%" y="-20%" width="140%" height="140%"><feMorphology operator="dilate" radius="${r}"/></filter>`;

  function creature(kind, cls) {
    return `<svg class="${cls || 'creature'}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g class="fig">${CREATURES[kind] || ''}</g></svg>`;
  }

  // ---------- Rose window portrait ----------
  function portrait(kind, cls) {
    const id = 'fa' + (++uid);
    const seg = 12;
    let ring = '';
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / seg) * Math.PI * 2 - Math.PI / 2;
      const pt = (r, a) => `${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`;
      ring += `<path class="${i % 2 ? 'r1' : 'b2'}" d="M${pt(38, a0)} L${pt(46, a0)} A46,46 0 0 1 ${pt(46, a1)} L${pt(38, a1)} A38,38 0 0 0 ${pt(38, a0)} Z"/>`;
    }
    for (let i = 0; i < seg; i++) {
      const a = ((i + 0.5) / seg) * Math.PI * 2 - Math.PI / 2;
      ring += `<circle class="gd" cx="${(50 + Math.cos(a) * 42).toFixed(2)}" cy="${(50 + Math.sin(a) * 42).toFixed(2)}" r="1.8"/>`;
    }
    const field = '<path class="b1" d="M50,50 L50,12 A38,38 0 0 1 88,50 Z"/><path class="b3" d="M50,50 L88,50 A38,38 0 0 1 50,88 Z"/>' +
      '<path class="b1" d="M50,50 L50,88 A38,38 0 0 1 12,50 Z"/><path class="b3" d="M50,50 L12,50 A38,38 0 0 1 50,12 Z"/>';
    const inner = CREATURES[kind]
      ? glassFigure(CREATURES[kind], 'translate(21 19) scale(0.58)', 'gold-fig', id)
      : '<path class="gd" d="M50,30 C58,30 60,42 50,50 C60,42 72,44 70,50 C72,56 60,58 50,50 C60,58 58,70 50,70 C42,70 40,58 50,50 C40,58 28,56 30,50 C28,44 40,42 50,50 C40,42 42,30 50,30 Z"/>';
    return `<svg class="sg ${cls || 'portrait'}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">` +
      `<defs>${leadFilter(id, 1.6)}</defs><circle class="lead" cx="50" cy="50" r="49"/>` +
      `<g class="glass">${ring}${field}</g>${inner}</svg>`;
  }

  // ---------- Helpers for the church window ----------
  function rng32(seed) {
    let a = (seed >>> 0) ^ 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f1 = (n) => n.toFixed(1);

  // Two-centered pointed (lancet) arch.
  function arch(l, r, spring, bottom, rad) {
    const w = r - l, cx = (l + r) / 2;
    const apex = spring - Math.sqrt(rad * rad - (rad - w / 2) * (rad - w / 2));
    return { d: `M${l},${bottom} L${l},${spring} A${rad},${rad} 0 0 1 ${cx},${f1(apex)} A${rad},${rad} 0 0 1 ${r},${spring} L${r},${bottom} Z`, apex };
  }

  // Break a rectangle into irregular glass panes (jittered triangles).
  function panes(rand, x0, y0, x1, y1, step, colorAt) {
    const cols = Math.ceil((x1 - x0) / step) + 1, rows = Math.ceil((y1 - y0) / step) + 1;
    const g = [];
    for (let j = 0; j <= rows; j++) {
      g.push([]);
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        g[j].push([x0 + i * step + (edge ? 0 : (rand() - 0.5) * step * 0.7), y0 + j * step + (edge ? 0 : (rand() - 0.5) * step * 0.7)]);
      }
    }
    let out = '';
    const tri = (a, b, c) => {
      const cy = (a[1] + b[1] + c[1]) / 3;
      out += `<path class="${colorAt(cy, rand)}" d="M${f1(a[0])},${f1(a[1])} L${f1(b[0])},${f1(b[1])} L${f1(c[0])},${f1(c[1])} Z"/>`;
    };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i], d = g[j + 1][i + 1];
        if ((i + j) % 2) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); }
      }
    }
    return out;
  }
  const pickOf = (list) => (y, rand) => list[Math.floor(rand() * list.length)];

  function ridge(rand, x0, x1, base, amp, sharp) {
    const pts = [];
    if (sharp) {
      let x = x0 - 10, up = rand() < 0.5;
      while (x < x1 + 30) {
        pts.push([x, base - (up ? amp * (0.55 + rand() * 0.45) : amp * rand() * 0.25)]);
        x += 18 + rand() * 26; up = !up;
      }
    } else {
      const p1 = rand() * 6, p2 = rand() * 6;
      for (let x = x0 - 10; x <= x1 + 10; x += 8) {
        pts.push([x, base - amp * (0.5 + 0.5 * (Math.sin(x * 0.03 + p1) * 0.65 + Math.sin(x * 0.075 + p2) * 0.35))]);
      }
    }
    return { pts, d: 'M' + pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' L') + ` L${x1 + 40},600 L${x0 - 40},600 Z` };
  }
  const heightAt = (pts, x) => {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] >= x) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1));
      }
    }
    return pts[pts.length - 1][1];
  };
  // Lead lines that cut a region into pieces.
  function leadCuts(rand, x0, x1, yTop, yBot, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + rand() * (x1 - x0);
      s += `M${f1(x)},${yTop} L${f1(x + (rand() - 0.5) * 30)},${yBot} `;
    }
    return `<path class="cutline" d="${s}"/>`;
  }

  // ---------- Each realm: terrain, glass colors and its landmark ----------
  const REALM_SCENES = {
    'the Kingdom of Ashvale': { terrain: 'peaks', landmark: P('M592,250 L607,112 L622,250 Z') + P('M600,250 L607,150 L614,250 Z'), glow: [607, 108], lm: 'v2' },
    'the Evergreen Dominion': { terrain: 'forest', landmark: P('M594,250 L599,170 L615,170 L620,250 Z') + C(607, 150, 38) + C(576, 168, 24) + C(638, 168, 24), glow: [607, 104], lm: 'g1' },
    'the Sunken Isles of Meridian': { terrain: 'isles', landmark: P('M596,250 L600,150 L616,150 L620,250 Z') + P('M597,136 h22 v14 h-22 Z') + P('M595,136 L608,122 L621,136 Z'), glow: [608, 143], lm: 'wh' },
    'the Golden Steppe of Orrin': { terrain: 'steppe', landmark: P('M560,250 L564,196 L578,196 L580,250 Z') + P('M600,250 L602,192 L618,192 L620,250 Z') + P('M596,184 h28 v8 h-28 Z') + P('M640,250 L642,200 L656,200 L658,250 Z'), glow: [610, 170], lm: 'v2' },
    'the Frostmarch': { terrain: 'ice', landmark: P('M570,250 V182 H590 V250 Z M600,250 V150 H620 V250 Z M630,250 V192 H650 V250 Z') + P('M568,182 L580,160 L592,182 Z M598,150 L610,122 L622,150 Z M628,192 L640,172 L652,192 Z'), glow: [610, 114], lm: 'wh' },
    'the Dunes of Kehar': { terrain: 'dunes', landmark: P('M540,250 L610,168 L680,250 Z') + P('M600,250 V222 A10,10 0 0 1 620,222 V250 Z'), glow: [610, 158], lm: 'am' },
    'the Cloudreach Highlands': { terrain: 'cliffs', landmark: P('M540,260 L548,160 L572,160 L578,260 Z M640,260 L646,150 L670,150 L676,260 Z') + L('M572,166 Q608,196 646,156', 3), glow: [608, 140], lm: 'v2' },
    'the Valley of Lanterns': { terrain: 'valley', landmark: P('M602,250 L604,186 L612,186 L614,250 Z') + E(608, 176, 40, 22) + [572, 584, 596, 620, 632, 644].map((x, i) => L(`M${x},${182 + (i % 2) * 4} C${x - 2},200 ${x + 2},214 ${x - 1},${226 + (i % 3) * 6}`, 2)).join(''), glow: [608, 158], lm: 'g2' }
  };

  const TERRAIN_GLASS = {
    peaks:  { far: 'v1', mid: 'g1', near: 'ol' },
    forest: { far: 'g2', mid: 'g1', near: 'ol' },
    isles:  { far: 'g2', mid: 'b2', near: 'am' },
    steppe: { far: 'v1', mid: 'gd', near: 'am' },
    ice:    { far: 'wh', mid: 'b2', near: 'v1' },
    dunes:  { far: 'am', mid: 'gd', near: 'am' },
    cliffs: { far: 'v1', mid: 'g2', near: 'ol' },
    valley: { far: 'v1', mid: 'g2', near: 'g1' }
  };

  // The calamity sets the sky glass.
  const SKIES = {
    'the Rain-Pearl': { panes: ['am', 'gd', 'am', 'r2'], sun: true },
    'the Lantern of First Dawn': { panes: ['n1', 'n2', 'n1', 'v1'], stars: 14 },
    'the Seed of the First Tree': { panes: ['gy', 'gy2', 'gy'], ash: true },
    'the Ember Crown': { panes: ['b1', 'b2', 'wh', 'b3'], snow: true, sun: true },
    'the Moonharp': { panes: ['n1', 'n2', 'b3'], stars: 10, moon: true },
    'the Starloom': { panes: ['n1', 'n2', 'v1'], stars: 8, falling: true },
    'the Chalice of Evermere': { panes: ['b3', 'v1', 'r1', 'am'], dusk: true, sun: true }
  };

  // The prize, drawn as an emblem for the right-hand window (100×100 box).
  const PRIZES = {
    'the Rain-Pearl': '<circle class="b2" cx="50" cy="52" r="30"/><circle class="wh" cx="50" cy="52" r="20"/><circle class="b1" cx="43" cy="45" r="5"/>',
    'the Lantern of First Dawn': '<path class="cutline" d="M38,22 Q50,4 62,22"/><path class="gd" d="M32,22 H68 L62,32 H38 Z"/><path class="g2l" d="M38,32 H62 V70 H38 Z"/><path class="cutline" d="M50,32 V70 M38,51 H62"/><path class="gd" d="M32,70 H68 L62,80 H38 Z"/>',
    'the Seed of the First Tree': '<path class="g1" d="M50,52 C40,34 24,34 22,44 C30,52 42,54 50,52 Z"/><path class="g2" d="M50,48 C58,28 76,28 78,38 C70,48 58,50 50,48 Z"/><ellipse class="am" cx="50" cy="68" rx="14" ry="18"/>',
    'the Ember Crown': '<path class="gd" d="M22,74 L22,34 L36,52 L50,24 L64,52 L78,34 L78,74 Z"/><path class="am" d="M22,64 H78 V76 H22 Z"/><circle class="r2" cx="50" cy="70" r="4"/><circle class="b2" cx="34" cy="70" r="3"/><circle class="b2" cx="66" cy="70" r="3"/><circle class="r2" cx="50" cy="24" r="4"/>',
    'the Moonharp': '<path class="gd" d="M28,82 L28,20 C54,18 74,32 76,52 C78,66 68,76 56,82 Z"/><path class="b1" d="M36,74 L36,30 C54,30 66,42 67,54 C68,62 62,70 54,74 Z"/><path class="cutline" d="M42,32 V74 M48,34 V74 M54,38 V74 M60,44 V70"/>',
    'the Starloom': '<path class="gd" d="M50,12 L58,40 L86,34 L64,52 L82,76 L54,64 L50,92 L46,64 L18,76 L36,52 L14,34 L42,40 Z"/><circle class="wh" cx="50" cy="52" r="9"/>',
    'the Chalice of Evermere': '<path class="gd" d="M28,20 H72 C72,46 62,58 50,58 C38,58 28,46 28,20 Z"/><path class="b2" d="M32,24 H68 C66,30 34,30 32,24 Z"/><path class="gd" d="M46,58 H54 V74 H46 Z"/><path class="gd" d="M32,84 C32,74 68,74 68,84 Z"/><circle class="r2" cx="50" cy="42" r="5"/>'
  };

  const VIRTUES = {
    patience: 'Patientia', humility: 'Humilitas', honesty: 'Veritas', courage: 'Fortitudo',
    perseverance: 'Perseverantia', kindness: 'Caritas', teamwork: 'Concordia',
    gratitude: 'Gratitudo', prudence: 'Prudentia', generosity: 'Largitas'
  };

  // ---------- The church window plate ----------
  function plate(fable) {
    const id = 'fp' + (++uid);
    const rand = rng32(fable.seed);
    const realm = REALM_SCENES[fable.realm] || REALM_SCENES['the Kingdom of Ashvale'];
    const skyDef = SKIES[fable.prize] || SKIES['the Ember Crown'];
    const tg = TERRAIN_GLASS[realm.terrain];
    const t = realm.terrain;

    const W = 800, H = 560, SILL = 470;
    const outer = arch(120, 680, 330, SILL + 8, 300);
    const moulding = arch(102, 698, 330, SILL + 8, 318);
    const lanL = arch(150, 260, 300, SILL, 77);
    const lanC = arch(300, 500, 240, SILL, 140);
    const lanR = arch(540, 650, 300, SILL, 77);

    // Church wall: dressed stone blocks.
    let blocks = '';
    for (let y = 0, row = 0; y < 520; y += 28, row++) {
      blocks += `M0,${y} H${W} `;
      for (let x = row % 2 ? 30 : 0; x < W; x += 60) blocks += `M${x},${y} V${y + 28} `;
    }
    const wall = `<rect class="stone" width="${W}" height="${H}"/><path class="mortar" d="${blocks}"/>` +
      `<rect class="floor" y="516" width="${W}" height="${H - 516}"/>` +
      `<path class="mortar" d="M0,516 H${W} M80,516 L40,${H} M240,516 L220,${H} M400,516 V${H} M560,516 L580,${H} M720,516 L760,${H}"/>`;

    const frame = `<path class="moulding" d="${moulding.d}"/><path class="tracery" d="${outer.d}"/>` +
      `<rect class="tracery" x="94" y="${SILL + 6}" width="612" height="16"/>`;

    // Small rose windows in the tracery.
    const oculus = (cx, cy, r) => {
      let petals = '';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        petals += `<circle class="${i % 2 ? 'b2' : 'r2'}" cx="${f1(cx + Math.cos(a) * r * 0.42)}" cy="${f1(cy + Math.sin(a) * r * 0.42)}" r="${f1(r * 0.45)}"/>`;
      }
      return `<g class="glass"><circle class="r1" cx="${cx}" cy="${cy}" r="${r}"/>${petals}<circle class="gd" cx="${cx}" cy="${cy}" r="${f1(r * 0.28)}"/></g>`;
    };

    // ----- Centre lancet: the hero before the realm -----
    let sky = panes(rand, 296, lanC.apex - 4, 504, 400, 30, skyDef.dusk
      ? (y, r) => (y < 170 ? 'b3' : y < 230 ? (r() < 0.5 ? 'v1' : 'b3') : (r() < 0.5 ? 'r1' : 'am'))
      : pickOf(skyDef.panes));
    if (skyDef.sun && !skyDef.dusk) sky += `<circle class="gd" cx="342" cy="176" r="20"/><circle class="gd2" cx="342" cy="176" r="11"/>`;
    if (skyDef.dusk) sky += `<circle class="gd" cx="350" cy="292" r="22"/>`;
    if (skyDef.moon) sky += `<path class="wh" d="M330,150 A24,24 0 1 0 354,186 A19,19 0 1 1 330,150 Z"/>`;
    if (skyDef.stars) {
      for (let i = 0; i < skyDef.stars; i++) sky += `<circle class="gd2" cx="${f1(310 + rand() * 180)}" cy="${f1(lanC.apex + 20 + rand() * 150)}" r="${f1(2 + rand() * 2)}"/>`;
    }
    if (skyDef.falling) {
      for (let i = 0; i < 4; i++) {
        const x = 330 + rand() * 150, y = lanC.apex + 30 + rand() * 90;
        sky += `<path class="gd" d="M${f1(x)},${f1(y)} l-26,18 l3,4 l26,-18 Z"/>`;
      }
    }

    const far = ridge(rand, 300, 500, 352, t === 'steppe' || t === 'isles' ? 26 : t === 'dunes' ? 40 : 88, t === 'peaks' || t === 'ice');
    const mid = ridge(rand, 300, 500, 404, t === 'isles' ? 6 : 34, false);
    let caps = '';
    if (t === 'peaks' || t === 'ice') {
      far.pts.forEach((p, i) => {
        const a = far.pts[i - 1], b = far.pts[i + 1];
        if (!a || !b || p[1] > a[1] || p[1] > b[1] || p[1] > 310) return;
        caps += `<path class="wh" d="M${f1(p[0])},${f1(p[1])} L${f1(p[0] + (b[0] - p[0]) * 0.3)},${f1(p[1] + (b[1] - p[1]) * 0.3)} L${f1(p[0])},${f1(p[1] + 12)} L${f1(p[0] + (a[0] - p[0]) * 0.3)},${f1(p[1] + (a[1] - p[1]) * 0.3)} Z"/>`;
      });
    }

    let extras = '';
    if (t === 'forest') {
      for (let x = 306; x < 500; x += 16 + rand() * 12) {
        if (x > 430 && x < 490) continue;
        const y = heightAt(mid.pts, x) + 6, h = 22 + rand() * 18;
        extras += `<path class="g1" d="M${f1(x)},${f1(y - h)} L${f1(x - h * 0.3)},${f1(y)} L${f1(x + h * 0.3)},${f1(y)} Z"/>`;
      }
    } else if (t === 'valley') {
      for (let i = 0; i < 12; i++) extras += `<circle class="gd2" cx="${f1(306 + rand() * 188)}" cy="${f1(330 + rand() * 70)}" r="2.6"/>`;
    } else if (t === 'cliffs') {
      extras += '<ellipse class="wh" cx="350" cy="260" rx="40" ry="8"/><ellipse class="wh" cx="470" cy="236" rx="30" ry="7"/>';
    } else if (t === 'ice') {
      extras += '<path class="g2l" d="M296,250 C340,226 380,262 430,236 S480,224 504,232 L504,246 C480,240 460,250 430,252 C380,276 340,240 296,266 Z"/>';
    } else if (t === 'isles') {
      extras += `<path class="cutline" d="M300,${f1(mid.pts[2][1] + 14)} q12,-6 24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 M300,${f1(mid.pts[2][1] + 30)} q12,-6 24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0"/>`;
    } else if (t === 'steppe') {
      extras += leadCuts(rand, 300, 500, 380, 420, 6);
    }

    const lmT = `translate(458 ${heightAt(mid.pts, 458) + 8}) scale(0.6) translate(-610 -250)`;
    const [gx, gy] = realm.glow;
    const glowX = 458 + (gx - 610) * 0.6, glowY = heightAt(mid.pts, 458) + 8 + (gy - 250) * 0.6;

    const knoll = 'M296,476 L296,436 C336,420 368,414 400,414 C432,414 464,420 504,436 L504,476 Z';
    const heroSize = 100, heroX = 396, heroFeet = 432;
    const halo = `<circle class="r1 halo" cx="${heroX}" cy="${heroFeet - heroSize * 0.5}" r="${heroSize * 0.56}"/>`;
    const virtue = VIRTUES[fable.lesson.id] || '';

    const centre =
      `<g class="glass">${sky}` +
      `<path class="${tg.far}" d="${far.d}"/>${caps}` +
      (t === 'ice' || t === 'cliffs' ? extras : '') +
      `<g transform="${lmT}" class="landmark-glass"><g class="${realm.lm}">${realm.landmark}</g></g>` +
      `<circle class="gd2" cx="${f1(glowX)}" cy="${f1(glowY)}" r="7"/>` +
      `<path class="${tg.mid}" d="${mid.d}"/>` + (t !== 'ice' && t !== 'cliffs' ? extras : '') +
      `<path class="${tg.near}" d="${knoll}"/>${halo}</g>` +
      glassFigure(CREATURES[fable.hero.kind] || '', `translate(${heroX - heroSize / 2} ${heroFeet - heroSize * 0.97}) scale(${heroSize / 100})`, 'gold-fig', id) +
      `<g class="glass"><path class="wh" d="M318,442 H482 L474,453 L482,464 H318 L326,453 Z"/></g>` +
      `<text class="virtue" x="400" y="459" text-anchor="middle">${virtue}</text>`;

    // ----- Left lancet: the companion -----
    const left =
      `<g class="glass">${panes(rand, 146, lanL.apex - 4, 264, 470, 26, pickOf(['r1', 'r2', 'r1']))}` +
      `<path class="g1" d="M146,476 L146,440 C180,428 228,428 264,440 L264,476 Z"/>` +
      `<circle class="b2 halo" cx="205" cy="402" r="34"/></g>` +
      glassFigure(CREATURES[fable.companion.kind] || '', `translate(${205 - 33} ${440 - 64}) scale(0.66)`, 'white-fig', id);

    // ----- Right lancet: the prize -----
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays += `M${f1(595 + Math.cos(a) * 40)},${f1(372 + Math.sin(a) * 40)} L${f1(595 + Math.cos(a) * 52)},${f1(372 + Math.sin(a) * 52)} `;
    }
    const right =
      `<g class="glass">${panes(rand, 536, lanR.apex - 4, 654, 470, 26, pickOf(['b1', 'b3', 'b1']))}` +
      `<path class="g1" d="M536,476 L536,440 C570,428 618,428 654,440 L654,476 Z"/>` +
      `<circle class="r1 halo" cx="595" cy="372" r="38"/>` +
      `<g transform="translate(565 342) scale(0.6)">${PRIZES[fable.prize] || ''}</g></g>` +
      `<path class="rays" d="${rays}"/>`;

    // Jewelled border, lead outline and a faint inner glow on each lancet.
    const dressing = (a, l, r, spring, rad) => {
      const inner = arch(l + 7, r - 7, spring, SILL - 7, rad - 7);
      return `<path class="band-gold" d="${a.d}" clip-path="url(#${id}-${l})"/>` +
        `<path class="band-jewel" d="${a.d}" clip-path="url(#${id}-${l})"/>` +
        `<path class="leadline" d="${inner.d}"/>` +
        `<path d="${a.d}" fill="url(#${id}-shine)"/>` +
        `<path class="lead-frame" d="${a.d}"/>`;
    };
    const lancet = (a, l, content, r, spring, rad) =>
      `<g clip-path="url(#${id}-${l})">${content}</g>` + dressing(a, l, r, spring, rad);

    // Coloured light falling from the glass onto the floor.
    const shafts =
      `<path class="shaft s-red" d="M152,${SILL} L258,${SILL} L300,${H} L120,${H} Z"/>` +
      `<path class="shaft s-gold" d="M302,${SILL} L498,${SILL} L560,${H} L250,${H} Z"/>` +
      `<path class="shaft s-blue" d="M542,${SILL} L648,${SILL} L690,${H} L510,${H} Z"/>`;

    const defs = `<defs>${leadFilter(id, 1.8)}` +
      `<clipPath id="${id}-150"><path d="${lanL.d}"/></clipPath>` +
      `<clipPath id="${id}-300"><path d="${lanC.d}"/></clipPath>` +
      `<clipPath id="${id}-540"><path d="${lanR.d}"/></clipPath>` +
      `<radialGradient id="${id}-shine" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
      `</defs>`;

    return `<svg class="sg plate-art" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stained glass windows: ${fable.hero.kind} in the centre, ${fable.companion.kind} on the left, ${fable.prize.replace(/^the /, '')} on the right">` +
      defs + wall + frame +
      oculus(215, 188, 26) + oculus(585, 188, 26) + oculus(400, 70, 20) +
      lancet(lanL, 150, left, 260, 300, 77) +
      lancet(lanC, 300, centre, 500, 240, 140) +
      lancet(lanR, 540, right, 650, 300, 77) +
      shafts + `</svg>`;
  }

  const api = { creature, portrait, plate, virtues: VIRTUES, kinds: Object.keys(CREATURES) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FableArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
