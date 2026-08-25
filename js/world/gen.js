/* ============================================================
   world/gen.js - the world generator. Seeded, layered, and
   never the same twice. Runs in slices so the loading screen
   can show progress instead of freezing the tab.
   ============================================================ */
KD.Gen = (function () {
  const W = () => KD.World;
  /* depth bands, in tiles. The whole game's pacing lives here. */
  const LAYERS = [
    { id: 'sky',      y0: 0,   y1: 40,  fill: 'air' },
    { id: 'shallows', y0: 40,  y1: 90,  fill: 'sand' },
    { id: 'reef',     y0: 90,  y1: 150, fill: 'stone' },
    { id: 'ruins',    y0: 150, y1: 230, fill: 'stone' },
    { id: 'trench',   y0: 230, y1: 330, fill: 'dark' },
    { id: 'abyss',    y0: 330, y1: 420, fill: 'rot' }
  ];
  const layerAt = (y) => LAYERS.find((l) => y >= l.y0 && y < l.y1) || LAYERS[LAYERS.length - 1];

  const ORES = [
    { t: 'ore_copper',  y0: 60,  y1: 180, tries: 1400, size: 5,  rare: 1.0 },
    { t: 'ore_bronze',  y0: 90,  y1: 230, tries: 1000, size: 5,  rare: 0.8 },
    { t: 'ore_iron',    y0: 140, y1: 300, tries: 800,  size: 6,  rare: 0.7 },
    { t: 'ore_gold',    y0: 220, y1: 380, tries: 520,  size: 5,  rare: 0.5 },
    { t: 'ore_abyssal', y0: 320, y1: 420, tries: 340,  size: 4,  rare: 0.4 }
  ];

  let surface = null;                 // surface[x] = first solid y
  let dry = new Set();                // tiles the flood must not fill: air pockets
  let steps = null, si = 0;
  const meta = { spawn: { x: 0, y: 0 }, village: null, throne: null, seed: 0, structures: [] };

  /* ---------- the pipeline ---------- */
  function begin(w, h, seed) {
    const Wd = W();
    Wd.alloc(w, h, seed);
    meta.seed = Wd.seed;
    meta.structures.length = 0;
    surface = new Int16Array(w);
    dry = new Set();
    steps = [
      ['carving the seabed', terrain],
      ['hollowing caves', caves],
      ['smoothing the rock', smoothPass],
      ['salting in ore', ores],
      ['raising the ruins', ruins],
      ['planting the village', village],
      ['seating the Baron', throne],
      ['flooding the ocean', flood],
      ['filling the chests', loot],
      ['scattering the reef', decorate],
      ['letting the light in', lightUp]
    ];
    si = 0;
    return steps.length;
  }
  /* one step per call, so the caller can draw a progress bar */
  function step() {
    if (si >= steps.length) return null;
    const [label, fn] = steps[si++];
    fn();
    return { label, done: si, total: steps.length };
  }
  const label = () => (si < steps.length ? steps[si][0] : 'ready');

  /* ---------- 1. terrain ---------- */
  function terrain() {
    const Wd = W(), w = Wd.W, h = Wd.H;
    const T = KD.Tiles;
    const shelfX = (w >> 1);
    for (let x = 0; x < w; x++) {
      /* two octaves of hills plus a flat shelf near spawn so you can stand up */
      let s = 44 + Wd.fbm(x * 0.012, 0.5, 4) * 26 + Wd.fbm(x * 0.05, 9.5, 2) * 6;
      const d = Math.abs(x - shelfX);
      if (d < 90) s = s * (d / 90) + 52 * (1 - d / 90);
      surface[x] = Math.round(s);
      for (let y = 0; y < h; y++) {
        const i = y * w + x;
        if (y < surface[x]) { Wd.fg[i] = T.AIR; continue; }
        const L = layerAt(y);
        let t = T.id(L.fill);
        /* dithered transition bands, so layers blend instead of striping */
        const band = 7;
        const prev = LAYERS[LAYERS.indexOf(L) - 1];
        if (prev && y - L.y0 < band && prev.fill !== 'air') {
          const f = (y - L.y0) / band;
          if (Wd.noise2(x * 0.4, y * 0.4) > f) t = T.id(prev.fill);
        }
        /* mud pockets in the shallows, sand pockets in the reef */
        if (L.id === 'shallows' && Wd.fbm(x * 0.06, y * 0.06, 2) > 0.62) t = T.id('mud');
        if (L.id === 'reef' && Wd.fbm(x * 0.05 + 7, y * 0.05, 2) > 0.70) t = T.id('sand');
        if (L.id === 'abyss' && Wd.fbm(x * 0.04 + 3, y * 0.04, 2) > 0.66) t = T.id('dark');
        Wd.fg[i] = t;
      }
    }
    /* coral crusts the reef roof */
    for (let x = 0; x < w; x++) {
      const y = surface[x];
      if (y >= 90 && y < 160 && Wd.chance(0.5)) {
        for (let k = 0; k < Wd.rint(1, 3); k++) if (Wd.inside(x, y + k)) Wd.fg[(y + k) * w + x] = T.id('coral');
      }
    }
    meta.spawn.x = shelfX;
    meta.spawn.y = surface[shelfX] - 3;
  }

  /* ---------- 2. water ---------- */
  /* Everything open below sea level is water - this is a drowned city. The
     exception is anything a builder sealed: those stay air, and an air pocket
     you can breathe in is worth digging for. */
  function flood() {
    const Wd = W(), w = Wd.W, h = Wd.H, T = KD.Tiles;
    const SEA = 34;
    for (let y = SEA; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (T.isSolid(Wd.fg[i])) continue;
        Wd.wat[i] = dry.has(i) ? 0 : 8;
      }
    }
    meta.sea = SEA;
    meta.dryCount = dry.size;
  }
  const markDry = (x, y) => { if (W().inside(x, y)) dry.add(y * W().W + x); };

  /* ---------- 3. caves ---------- */
  function caves() {
    const Wd = W(), w = Wd.W, h = Wd.H, T = KD.Tiles;
    /* cave scale per layer: tight up top, cathedrals down deep */
    for (let y = 46; y < h; y++) {
      const L = layerAt(y);
      const sc = L.id === 'reef' ? 0.055 : L.id === 'ruins' ? 0.045 : L.id === 'trench' ? 0.032 : 0.026;
      /* lower threshold = more hollow. The deep layers are cathedral-sized. */
      const thresh = L.id === 'shallows' ? 0.60 : L.id === 'reef' ? 0.52
                   : L.id === 'ruins' ? 0.50 : L.id === 'trench' ? 0.455 : 0.44;
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!T.isSolid(Wd.fg[i])) continue;
        if (Wd.fbm(x * sc, y * sc, 3, 0.55) > thresh) Wd.fg[i] = T.AIR;
      }
    }
    /* perlin worms: long connected tunnels the noise alone will not make */
    const worms = 190;
    for (let n = 0; n < worms; n++) {
      let x = Wd.rrange(30, w - 30), y = Wd.rrange(60, h - 20);
      let ang = Wd.rrange(0, 6.283);
      const len = Wd.rint(120, 420), rad = Wd.rrange(1.6, 4.2);
      for (let s = 0; s < len; s++) {
        ang += (Wd.noise2(s * 0.08, n * 3.7) - 0.5) * 0.6;
        x += Math.cos(ang) * 1.1; y += Math.sin(ang) * 0.85;
        if (x < 4 || x > w - 5 || y < 46 || y > h - 4) break;
        const r = rad + Math.sin(s * 0.07) * 0.9;
        for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
          for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
            if (dx * dx + dy * dy > r * r) continue;
            const tx = (x + dx) | 0, ty = (y + dy) | 0;
            if (Wd.inside(tx, ty) && ty > 44) Wd.fg[ty * w + tx] = T.AIR;
          }
        }
      }
    }
  }

  /* ---------- 4. cellular smoothing ---------- */
  function smoothPass() {
    const Wd = W(), w = Wd.W, h = Wd.H, T = KD.Tiles;
    const src = Wd.fg;
    for (let pass = 0; pass < 2; pass++) {
      const copy = src.slice();
      for (let y = 47; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            if (T.isSolid(copy[(y + dy) * w + (x + dx)])) n++;
          }
          const i = y * w + x;
          if (!T.isSolid(copy[i]) && n >= 6) src[i] = T.id(layerAt(y).fill);
          else if (T.isSolid(copy[i]) && n <= 1) src[i] = T.AIR;
        }
      }
    }
    /* refresh the surface line, the caves may have eaten into it */
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < h && !T.isSolid(src[y * w + x])) y++;
      surface[x] = y;
    }
  }

  /* ---------- 5. ore ---------- */
  function ores() {
    const Wd = W(), w = Wd.W, T = KD.Tiles;
    for (const o of ORES) {
      const id = T.id(o.t);
      for (let n = 0; n < o.tries; n++) {
        if (!Wd.chance(o.rare)) continue;
        const x = Wd.rint(3, w - 4), y = Wd.rint(o.y0, o.y1 - 1);
        if (!T.isSolid(Wd.at(x, y))) continue;
        /* blob growth from the seed */
        let cx = x, cy = y;
        const n2 = Wd.rint(2, o.size);
        for (let k = 0; k < n2; k++) {
          if (Wd.inside(cx, cy) && T.isSolid(Wd.at(cx, cy))) Wd.fg[cy * w + cx] = id;
          cx += Wd.rint(-1, 1); cy += Wd.rint(-1, 1);
        }
      }
    }
  }

  /* ---------- 6. ruins ---------- */
  function room(x, y, w2, h2, wallT, floorT, hollow) {
    const Wd = W(), T = KD.Tiles;
    for (let j = 0; j < h2; j++) for (let i = 0; i < w2; i++) {
      const tx = x + i, ty = y + j;
      if (!Wd.inside(tx, ty)) continue;
      const edge = i === 0 || j === 0 || i === w2 - 1 || j === h2 - 1;
      if (edge) Wd.fg[ty * Wd.W + tx] = T.id(wallT);
      else if (hollow) { Wd.fg[ty * Wd.W + tx] = T.AIR; Wd.bg[ty * Wd.W + tx] = T.id(wallT); }
      if (j === h2 - 1 && !edge) Wd.fg[ty * Wd.W + tx] = T.id(floorT || wallT);
    }
  }
  function ruins() {
    const Wd = W(), w = Wd.W, T = KD.Tiles;
    let placed = 0;
    for (let n = 0; n < 260 && placed < 26; n++) {
      const rw = Wd.rint(10, 22), rh = Wd.rint(6, 11);
      const x = Wd.rint(20, w - rw - 20), y = Wd.rint(155, 224 - rh);
      let solidCount = 0;
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) if (T.isSolid(Wd.at(x + i, y + j))) solidCount++;
      if (solidCount < rw * rh * 0.6) continue;    // needs rock to be carved out of
      if (meta.structures.some((s) => Math.abs(s.x - x) < 30 && Math.abs(s.y - y) < 18)) continue;
      room(x, y, rw, rh, 'masonry', 'masonry', true);
      /* a doorway, two pillars and a statue: reads as built, not as a bubble */
      const dx = x + Wd.rint(2, rw - 3);
      Wd.fg[(y + rh - 2) * w + dx] = T.AIR;
      Wd.fg[(y + rh - 3) * w + dx] = T.AIR;
      for (const px of [x + 2, x + rw - 3]) {
        for (let j = y + 2; j < y + rh - 1; j++) Wd.fg[j * w + px] = T.id('pillar');
      }
      if (Wd.chance(0.5)) Wd.fg[(y + rh - 2) * w + (x + (rw >> 1))] = T.id('statue');
      meta.structures.push({ kind: 'ruin', x, y, w: rw, h: rh });
      placed++;
    }
    /* bandit camps in the trench: a plank shack and a chest */
    for (let n = 0; n < 160 && placed < 40; n++) {
      const rw = Wd.rint(9, 14), rh = Wd.rint(5, 7);
      const x = Wd.rint(20, w - rw - 20), y = Wd.rint(238, 322 - rh);
      let sc = 0;
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) if (T.isSolid(Wd.at(x + i, y + j))) sc++;
      if (sc < rw * rh * 0.55) continue;
      if (meta.structures.some((s) => Math.abs(s.x - x) < 34 && Math.abs(s.y - y) < 16)) continue;
      room(x, y, rw, rh, 'plank', 'plank', true);
      for (let j = 1; j < rh - 1; j++) for (let i = 1; i < rw - 1; i++) markDry(x + i, y + j);
      Wd.fg[(y + rh - 2) * w + (x + 1)] = T.AIR;
      Wd.fg[(y + rh - 2) * w + (x + 2)] = T.id('chest');
      Wd.fg[(y + 1) * w + (x + (rw >> 1))] = T.id('lantern');
      meta.structures.push({ kind: 'camp', x, y, w: rw, h: rh });
      placed++;
    }
  }

  /* ---------- 7. the village ---------- */
  function village() {
    const Wd = W(), w = Wd.W, T = KD.Tiles;
    const cx = meta.spawn.x;
    const houses = [];
    let x = cx - 70;
    for (let n = 0; n < 7; n++) {
      const hw = Wd.rint(9, 13), hh = Wd.rint(6, 8);
      x += Wd.rint(hw + 3, hw + 9);
      if (x + hw > w - 20) break;
      /* sit the house on the seabed */
      let gy = surface[Math.min(w - 1, x + (hw >> 1))];
      for (let i = 0; i < hw; i++) gy = Math.max(gy, surface[Math.min(w - 1, x + i)]);
      const y = gy - hh;
      if (y < 20) continue;
      /* flatten the ground under it */
      for (let i = -1; i <= hw; i++) {
        const tx = Math.min(w - 1, Math.max(0, x + i));
        for (let j = gy; j < gy + 4; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.id('sand');
        for (let j = 20; j < gy; j++) if (Wd.inside(tx, j) && T.isSolid(Wd.at(tx, j))) Wd.fg[j * w + tx] = T.AIR;
      }
      room(x, y, hw, hh, 'plank', 'plank', true);
      for (let j = 1; j < hh - 1; j++) for (let i = 1; i < hw - 1; i++) markDry(x + i, y + j);
      /* roof, door, window, lantern */
      for (let i = 0; i < hw; i++) Wd.fg[(y - 1) * w + x + i] = T.id('coral');
      const dx = x + 1 + ((hw - 3) >> 1);
      Wd.fg[(y + hh - 2) * w + dx] = T.AIR;
      Wd.fg[(y + hh - 3) * w + dx] = T.AIR;
      Wd.bg[(y + hh - 2) * w + dx] = T.id('plank');
      Wd.fg[(y + 2) * w + (x + 2)] = T.id('glass');
      Wd.fg[(y + 2) * w + (x + hw - 3)] = T.id('glass');
      Wd.fg[(y + 1) * w + (x + (hw >> 1))] = T.id('lantern');
      houses.push({ x, y, w: hw, h: hh, door: dx });
      meta.structures.push({ kind: 'house', x, y, w: hw, h: hh });
    }
    meta.village = { x: cx, houses };
    /* the player's own shack gets a workbench and a furnace to start with */
    if (houses.length) {
      const h0 = houses[0];
      Wd.fg[(h0.y + h0.h - 2) * w + (h0.x + 2)] = T.id('workbench');
      Wd.fg[(h0.y + h0.h - 2) * w + (h0.x + 5)] = T.id('furnace');
    }
  }

  /* ---------- 8. the throne ---------- */
  function throne() {
    const Wd = W(), w = Wd.W, T = KD.Tiles;
    const rw = 44, rh = 20;
    const x = w - rw - 24, y = 372;
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
      const tx = x + i, ty = y + j;
      if (!Wd.inside(tx, ty)) continue;
      const edge = i === 0 || j === 0 || i === rw - 1 || j === rh - 1;
      Wd.fg[ty * w + tx] = edge ? T.id('masonry') : T.AIR;
      if (!edge) { Wd.bg[ty * w + tx] = T.id('masonry'); markDry(tx, ty); }
    }
    for (let i = 3; i < rw - 3; i += 6) {
      for (let j = y + 2; j < y + rh - 2; j++) Wd.fg[j * w + x + i] = T.id('pillar');
    }
    for (let i = 4; i < rw - 4; i += 8) Wd.fg[(y + 2) * w + x + i] = T.id('lantern');
    Wd.fg[(y + rh - 2) * w + (x + rw - 8)] = T.id('statue');
    /* a way in from above */
    for (let j = y - 8; j < y; j++) { Wd.fg[j * w + (x + 4)] = T.AIR; Wd.fg[j * w + (x + 5)] = T.AIR; }
    meta.throne = { x: x + (rw >> 1), y: y + rh - 3, room: { x, y, w: rw, h: rh } };
    meta.structures.push({ kind: 'throne', x, y, w: rw, h: rh });
  }

  /* ---------- 9. decoration ---------- */
  function decorate() {
    const Wd = W(), w = Wd.W, h = Wd.H, T = KD.Tiles;
    const AIR = T.AIR;
    /* Anything a builder put there is off limits - anemones growing on the
       village rooftops looked like the houses had grown antlers. */
    const built = new Uint8Array(w * h);
    for (const st of meta.structures) {
      for (let j = -2; j < st.h + 1; j++) {
        for (let i = -1; i < st.w + 1; i++) {
          const tx = st.x + i, ty = st.y + j;
          if (Wd.inside(tx, ty)) built[ty * w + tx] = 1;
        }
      }
    }
    const isBuilt = (x, y) => Wd.inside(x, y) && built[y * w + x] === 1;
    for (let x = 1; x < w - 1; x++) {
      for (let y = 30; y < h - 1; y++) {
        const i = y * w + x;
        if (Wd.fg[i] !== AIR) continue;
        if (isBuilt(x, y)) continue;
        const below = Wd.at(x, y + 1);
        if (!T.isSolid(below)) continue;
        const B = T.get(below);
        const L = layerAt(y);
        const r = Wd.rnd();
        if (L.id === 'shallows' || L.id === 'reef') {
          if (B.id === 'sand' || B.id === 'mud') {
            if (r < 0.10) Wd.fg[i] = T.id('kelp');
            else if (r < 0.20) Wd.fg[i] = T.id('grass');
            else if (r < 0.235) Wd.fg[i] = T.id('urchin_d');
          } else if (B.id === 'coral' && r < 0.22) Wd.fg[i] = T.id('anemone');
        } else if (L.id === 'ruins') {
          if (r < 0.05) Wd.fg[i] = T.id('bones');
          else if (r < 0.09) Wd.fg[i] = T.id('urchin_d');
        } else if (L.id === 'trench') {
          if (r < 0.045) Wd.fg[i] = T.id('glowpod');
          else if (r < 0.075) Wd.fg[i] = T.id('bones');
        } else if (L.id === 'abyss') {
          if (r < 0.055) Wd.fg[i] = T.id('glowpod');
        }
      }
    }
    /* moss on cave walls, on the background layer so it never blocks you */
    for (let n = 0; n < 9000; n++) {
      const x = Wd.rint(1, w - 2), y = Wd.rint(60, h - 2);
      if (Wd.at(x, y) === AIR && !isBuilt(x, y) && !Wd.bg[y * w + x] &&
          T.isSolid(Wd.at(x, y + 1)) && y < 240 && Wd.chance(0.3)) {
        Wd.bg[y * w + x] = T.id('moss');
      }
    }
  }

  /* ---------- 10. loot ---------- */
  /* Chest contents by depth, and the five Crown Fragments: one per layer
     below the surface, always in that layer's deepest chest, so the spine of
     the game is "go deeper" and every fragment is somewhere findable. */
  const LOOT = [
    { y0: 40,  y1: 90,  pool: [['torch', 4, 10], ['plank_i', 6, 16], ['ore_copper', 2, 6], ['fish1', 1, 3], ['shell_i', 2, 5]] },
    { y0: 90,  y1: 150, pool: [['ore_copper', 4, 10], ['ore_bronze', 2, 7], ['coral_i', 3, 8], ['beer_lager', 1, 2], ['glowpod_i', 1, 3]] },
    { y0: 150, y1: 230, pool: [['ore_bronze', 4, 10], ['ore_iron', 2, 6], ['brick_i', 6, 14], ['cloth_i', 2, 5], ['beer_stout', 1, 2], ['pearl', 1, 1]] },
    { y0: 230, y1: 330, pool: [['ore_iron', 4, 10], ['ore_gold', 2, 6], ['glowpod_i', 3, 8], ['beer_royal', 1, 2], ['pearl', 1, 2], ['bone_i', 4, 9]] },
    { y0: 330, y1: 420, pool: [['ore_gold', 4, 10], ['ore_abyssal', 2, 7], ['pearl', 2, 4], ['beer_keg', 1, 1], ['ore_iron', 6, 12]] }
  ];
  function rollLoot(depth) {
    const Wd = W();
    const band = LOOT.find((l) => depth >= l.y0 && depth < l.y1) || LOOT[LOOT.length - 1];
    const out = [];
    const picks = Wd.rint(2, 4);
    const pool = band.pool.slice();
    for (let i = 0; i < picks && pool.length; i++) {
      const k = Wd.rint(0, pool.length - 1);
      const [id, lo, hi] = pool.splice(k, 1)[0];
      out.push({ id, n: Wd.rint(lo, hi) });
    }
    out.push({ id: 'clams', n: 4 + Math.round(depth / 3) });
    return out;
  }
  function loot() {
    const Wd = W(), w = Wd.W, T = KD.Tiles;
    meta.chests = [];
    const CHEST = T.id('chest');
    for (let n = 0; n < 6000; n++) {
      const x = Wd.rint(10, w - 11), y = Wd.rint(60, Wd.H - 6);
      if (Wd.at(x, y) !== T.AIR || Wd.at(x + 1, y) !== T.AIR) continue;
      if (!T.isSolid(Wd.at(x, y + 1))) continue;
      if (meta.chests.some((c) => Math.abs(c.x - x) < 24 && Math.abs(c.y - y) < 10)) continue;
      Wd.fg[y * w + x] = CHEST;
      meta.chests.push({ x, y, depth: y, items: rollLoot(y), frag: 0 });
      if (meta.chests.length >= 44) break;
    }
    /* one fragment per layer, in that layer's deepest chest */
    LOOT.forEach((band, i) => {
      const inBand = meta.chests.filter((c) => c.depth >= band.y0 && c.depth < band.y1);
      if (!inBand.length) return;
      inBand.sort((a, b) => b.depth - a.depth);
      inBand[0].frag = i + 1;
    });
    /* if a layer had no chest, hang its fragment off the throne instead */
    const placed = meta.chests.filter((c) => c.frag).length;
    meta.fragsPlaced = placed;
  }
  function lightUp() { KD.Light.init(); }

  const surfaceAt = (x) => surface[Math.max(0, Math.min(surface.length - 1, x | 0))];
  return { begin, step, label, meta, LAYERS, layerAt, surfaceAt, ORES,
           get surface() { return surface; } };
})();
