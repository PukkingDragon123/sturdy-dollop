/* ============================================================
   world/gen.js - the world generator. Seeded, layered, and
   never the same twice. Runs in slices so the loading screen
   can show progress instead of freezing the tab.
   ============================================================ */
KD.Gen = (function () {
  const W = () => KD.World;
  /* depth bands, in tiles. The whole game's pacing lives here. */
  /* Both of these come off KD.Zones.D, which is the one place the ocean's
     depths are written down. They used to be hand-copied numbers here, and
     twice the world got deeper and they did not follow. */
  const Z_D = KD.Zones.D;
  const LAYERS = [
    { id: 'sky',      y0: 0,             y1: Z_D.sea,      fill: 'air' },
    { id: 'shallows', y0: Z_D.sea,       y1: Z_D.reef,     fill: 'sand' },
    { id: 'reef',     y0: Z_D.reef,      y1: Z_D.ruins,    fill: 'stone' },
    { id: 'ruins',    y0: Z_D.ruins,     y1: Z_D.trench,   fill: 'stone' },
    { id: 'trench',   y0: Z_D.trench,    y1: Z_D.abyss,    fill: 'dark' },
    { id: 'abyss',    y0: Z_D.abyss,     y1: Z_D.floor,    fill: 'rot' }
  ];
  const layerAt = (y) => LAYERS.find((l) => y >= l.y0 && y < l.y1) || LAYERS[LAYERS.length - 1];

  /* Ore bands, as fractions of the way down, so a deeper ocean spreads them
     out instead of leaving them all in the top third. */
  const OB = (a, b) => ({ y0: KD.Zones.d(a), y1: KD.Zones.d(b) });
  const ORES = [
    Object.assign({ t: 'ore_copper',  tries: 3800, size: 5, rare: 1.0 }, OB(0.05, 0.28)),
    Object.assign({ t: 'ore_bronze',  tries: 2800, size: 5, rare: 0.8 }, OB(0.11, 0.38)),
    Object.assign({ t: 'ore_iron',    tries: 2200, size: 6, rare: 0.7 }, OB(0.20, 0.50)),
    Object.assign({ t: 'ore_gold',    tries: 1500, size: 5, rare: 0.5 }, OB(0.34, 0.66)),
    Object.assign({ t: 'ore_abyssal', tries: 1000, size: 4, rare: 0.4 }, OB(0.52, 0.99))
  ];

  let surface = null;                 // surface[x] = first solid y
  let dry = new Set();                // tiles the flood must not fill: air pockets
  let steps = null, si = 0;
  const meta = { spawn: { x: 0, y: 0 }, village: null, throne: null, gate: null, seed: 0, structures: [] };

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
      ['sinking the wrecks', landmarks],
      ['planting the village', village],
      ['seating the cook on your throne', throne],
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
    const Zn = KD.Zones;
    const vill = Zn.byId.village;
    const shelfX = ((vill.x0 + vill.x1) / 2) | 0;
    /* THE SHELF.

       Until now the seabed sat at 44-76 across the whole map and everything
       under it was solid rock, so a world seven hundred tiles deep had about
       fifteen tiles of water in it and the other six hundred and fifty were
       something you dug through. That is a mine with a puddle on top, and it
       is why the ocean read as small however wide it got: the number that
       matters is not how far you can travel, it is how much water there is
       to be in.

       The seabed falls away eastward now, from a shelf you can stand on at
       the village to six hundred and forty tiles down at the Drop. Swimming
       east IS descending. The swimmable volume goes up about seventeen times
       and the shape of it - shallows, shelf, slope, abyss - is the shape of
       a real ocean, which is the thing that was missing.

       Control points in (tile x, seabed y); everything between is a
       smoothstep, so there are no cliffs where two zones meet. */
    const D = KD.Zones.D, WD = KD.Zones.d;
    const SHELF = [[0.00, D.sea + 14], [0.11, D.sea + 18], [0.15, D.sea + 22],
                   [0.20, D.shallows + 8], [0.24, WD(0.08)], [0.31, WD(0.15)],
                   [0.36, WD(0.20)], [0.40, WD(0.26)], [0.46, WD(0.32)],
                   [0.50, WD(0.37)], [0.54, WD(0.45)], [0.59, WD(0.51)],
                   [0.63, WD(0.63)], [1.01, WD(0.76)]];
    function shelfAt(x) {
      const f = x / w;
      for (let k = 0; k < SHELF.length - 1; k++) {
        const a = SHELF[k], b = SHELF[k + 1];
        if (f < b[0]) {
          const u = (f - a[0]) / (b[0] - a[0]);
          const e = u * u * (3 - 2 * u);            // smoothstep
          return a[1] + (b[1] - a[1]) * e;
        }
      }
      return SHELF[SHELF.length - 1][1];
    }
    for (let x = 0; x < w; x++) {
      const z = Zn.at(x);
      const base = shelfAt(x);
      /* the deeper it is the more broken it gets, so the shelf is smooth and
         the abyss floor is ragged */
      const rough = 5 + base * 0.10;
      let s = base + (Wd.fbm(x * 0.012, 0.5, 4) - 0.5) * rough * 2
                   + (Wd.fbm(x * 0.05, 9.5, 2) - 0.5) * 6;
      if (z.id === 'village' || z.id === 'gate') {
        const dd = Math.min(1, Math.abs(x - shelfX) / 260);
          s = s * dd + (D.shallows + 4) * (1 - dd);
      }
      surface[x] = Math.max(D.sea + 6, Math.round(s));
      for (let y = 0; y < h; y++) {
        const i = y * w + x;
        if (y < surface[x]) { Wd.fg[i] = T.AIR; continue; }
        const L = layerAt(y);
        /* the zone owns the surface rock; the depth layer owns the deep rock */
        let t = T.id(y < D.reef ? (z.rock || L.fill) : (y < D.ruins ? (z.deep || L.fill) : L.fill));
        /* dithered transition bands, so layers blend instead of striping */
        const band = 7;
        const prev = LAYERS[LAYERS.indexOf(L) - 1];
        if (prev && y - L.y0 < band && prev.fill !== 'air') {
          const f = (y - L.y0) / band;
          if (Wd.noise2(x * 0.4, y * 0.4) > f) t = T.id(prev.fill);
        }
        if (Wd.fbm(x * 0.06, y * 0.06, 2) > 0.66) {
          t = T.id(y < D.reef ? 'mud' : (y < D.ruins ? 'sand' : 'dark'));
        }
        Wd.fg[i] = t;
      }
    }
    /* coral crusts the reef roof */
    for (let x = 0; x < w; x++) {
      const y = surface[x];
      if (y >= KD.Zones.D.shallows + 20 && y < KD.Zones.D.ruins && Wd.chance(0.5)) {
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
      const base = L.id === 'shallows' ? 0.60 : L.id === 'reef' ? 0.52
                 : L.id === 'ruins' ? 0.50 : L.id === 'trench' ? 0.455 : 0.44;
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!T.isSolid(Wd.fg[i])) continue;
        const z = KD.Zones.at(x);
        if (z.safe && y < 96) continue;                       // never hollow the town out
        /* a zone with denser caves gets a lower threshold */
        const thresh = base - (((z.caves || 1) - 1) * 0.06) - (z.open ? 0.10 : 0);
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
      for (let n = 0; n < o.tries * 2; n++) {
        if (!Wd.chance(o.rare)) continue;
        const x = Wd.rint(3, w - 4), y = Wd.rint(o.y0, o.y1 - 1);
        if (!T.isSolid(Wd.at(x, y))) continue;
        const z = KD.Zones.at(x);
        if (z.safe) continue;
        if (Wd.rnd() > (z.ore === undefined ? 1 : z.ore)) continue;
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

  /* ---------- 7. Fruitfall ---------- */
  function village() {
    const Wd = W(), w = Wd.W, T = KD.Tiles;
    const z = KD.Zones.byId.village;
    const plan = KD.Village.plan(Wd, z, surfaceAt);
    KD.Village.shelve(Wd, T, plan.terraces);
    for (const b of plan.buildings) {
      KD.Village.carve(Wd, T, b);
      meta.structures.push({ kind: 'house', x: b.x, y: b.y, w: b.w, h: b.h, b });
    }
    KD.Village.connect(Wd, T, plan.terraces);
    meta.village = { x: (z.x0 + z.x1) >> 1, buildings: plan.buildings, terraces: plan.terraces };
    /* Spawn ON THE STREET outside your own shack - never inside it. This
       used to be the horizontal CENTRE of the home's footprint, which with a
       ten-tile-wide fruit is solid rind: the game started you buried in your
       own wall. Walk out from the door until a column has real standing room
       over solid ground, and stand there. */
    const home = plan.buildings.find((b) => b.kind.home) || plan.buildings[0];
    if (home && home.door) {
      const floorRow = home.floorY;
      const clearAt = (tx) => {
        if (!Wd.inside(tx, floorRow)) return false;
        if (!T.isSolid(Wd.at(tx, floorRow))) return false;      // must be ground
        for (let j = 1; j <= 4; j++) {
          if (T.isSolid(Wd.at(tx, floorRow - j))) return false;  // must be open
        }
        return true;
      };
      const dir = home.doorSide || -1;
      let sx = home.door.x + (dir < 0 ? -1 : home.door.w);
      for (let k = 0; k < home.w + 12; k++) {
        if (clearAt(sx)) break;
        sx += dir;
      }
      if (!clearAt(sx)) {                       // nothing that way: try the other
        sx = home.door.x + (dir < 0 ? home.door.w : -1);
        for (let k = 0; k < home.w + 12; k++) { if (clearAt(sx)) break; sx -= dir; }
      }
      meta.spawn.x = clearAt(sx) ? sx : home.x - 3;
      meta.spawn.y = floorRow - 1;
    }
    /* THE SEA GATE: a masonry wall across the gate zone with a doorway a
       guard keeps shut until you have earned your way out */
    const g = KD.Zones.byId.gate;
    const gx = ((g.x0 + g.x1) / 2) | 0;
    const top = Math.max(4, surfaceAt(gx) - 26);
    for (let j = top; j < surfaceAt(gx) + 6; j++) {
      for (let i = -2; i <= 2; i++) {
        if (Wd.inside(gx + i, j)) Wd.fg[j * w + gx + i] = T.id('masonry');
      }
    }
    const doorTop = surfaceAt(gx) - 4;
    for (let j = doorTop; j < surfaceAt(gx); j++) {
      for (let i = -2; i <= 2; i++) if (Wd.inside(gx + i, j)) Wd.fg[j * w + gx + i] = T.id('gate');
    }
    meta.gate = { x: gx, y: surfaceAt(gx) - 2, top: doorTop };
  }

  /* ---------- 8. the throne ---------- */
  function throne() {
    const Wd = W(), w = Wd.W, T = KD.Tiles;
    const rw = 56, rh = 26;
    const x = w - rw - 30;
    /* It sat at a hard-coded y=392. The seabed used to be at 44-76 all the
       way across, so 392 was three hundred tiles into solid rock; with the
       shelf the floor at this end of the map is around 520, and 392 left the
       whole throne room hanging in open water above it. It sits ON the
       bottom of the Drop, wherever that turns out to be. */
    const floorHere = surface[Math.min(w - 1, x + (rw >> 1))];
    const y = Math.max(360, Math.min(W().H - rh - 10, floorHere + 18));
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
      const tx = x + i, ty = y + j;
      if (!Wd.inside(tx, ty)) continue;
      const edge = i === 0 || j === 0 || i === rw - 1 || j === rh - 1;
      Wd.fg[ty * w + tx] = edge ? T.id('masonry') : T.AIR;
      if (!edge) { Wd.bg[ty * w + tx] = T.id('masonry'); markDry(tx, ty); }
    }
    /* Pillars ONLY against the two ends. They used to march across the
       whole room every six tiles, which put one right where the fight
       starts - the player was teleported inside solid rock and the
       collision unstick levitated him out through the ceiling. A boss
       arena needs a clear floor. */
    for (const i of [3, 8, rw - 4, rw - 9]) {
      for (let j = y + 2; j < y + rh - 2; j++) Wd.fg[j * w + x + i] = T.id('pillar');
    }
    /* the floor of the arena, so nothing in the fight can fall out of it */
    for (let i = 1; i < rw - 1; i++) {
      Wd.fg[(y + rh - 2) * w + x + i] = T.id('masonry');
      Wd.fg[(y + rh - 3) * w + x + i] = T.id('masonry');
    }
    /* Lanterns along the ceiling AND up both walls. One row of five at the
       top of a fifty-six tile room six hundred tiles down is a fight in the
       dark. */
    for (let i = 5; i < rw - 5; i += 5) Wd.fg[(y + 2) * w + x + i] = T.id('lantern');
    for (let j = y + 5; j < y + rh - 5; j += 5) {
      Wd.fg[j * w + (x + 2)] = T.id('lantern');
      Wd.fg[j * w + (x + rw - 3)] = T.id('lantern');
    }
    Wd.fg[(y + rh - 4) * w + (x + 5)] = T.id('statue');
    Wd.fg[(y + rh - 4) * w + (x + rw - 7)] = T.id('statue');
    /* his throne, dead centre against the back wall */
    const seat = x + (rw >> 1) + 12;
    Wd.fg[(y + rh - 4) * w + seat] = T.id('throne_seat');
    /* The way in: a shaft from the open water above right down to the roof,
       widened enough to swim rather than squeeze. It used to run a fixed
       thirty tiles, which with the shelf started in the middle of nowhere. */
    const shaftTop = Math.max(40, floorHere - 24);
    for (let j = shaftTop; j < y + 3; j++) {
      for (let i = 4; i <= 8; i++) Wd.fg[j * w + (x + i)] = T.AIR;
    }
    /* Where the fight happens: standing ON the arena floor, clear of every
       pillar and of the throne itself. */
    meta.throne = { x: x + (rw >> 1) - 6, y: y + rh - 4, room: { x, y, w: rw, h: rh }, seat: seat };
    meta.structures.push({ kind: 'throne', x, y, w: rw, h: rh });
  }

  /* ---------- landmarks ----------
     Forty per cent of this world is open water now, and open water with
     nothing in it is just a long swim. These are the things worth crossing
     it for: hulls with a chest in them, vents on the abyss floor, whale
     falls, and rock spires so the column has something to hide behind.

     Everything is placed off the shelf, so a wreck sits on whatever the
     seabed turns out to be rather than at a depth somebody typed in.
     ------------------------------------------------------------------ */
  function landmarks() {
    const Wd = W(), w = Wd.W, h = Wd.H, T = KD.Tiles;
    const D = KD.Zones.D;
    const set = (x, y, id) => { if (Wd.inside(x, y)) Wd.fg[y * w + x] = T.id(id); };
    const carve = (x, y) => { if (Wd.inside(x, y)) { Wd.fg[y * w + x] = T.AIR; Wd.bg[y * w + x] = T.id('plank'); } };

    /* ---- wrecks: a hull lying on the seabed with a hold you can get into */
    for (let n = 0; n < 9; n++) {
      const cx = Math.round(w * (0.20 + n * 0.085) + Wd.rrange(-90, 90));
      if (cx < 40 || cx > w - 60) continue;
      const len = Wd.rint(26, 46), hh = Wd.rint(9, 14);
      const base = surface[Math.min(w - 1, cx)] - 1;
      const tilt = Wd.rrange(-0.12, 0.12);
      for (let i = 0; i < len; i++) {
        const x = cx - (len >> 1) + i;
        const u = i / (len - 1);
        /* the hull: a shallow arc, deepest amidships */
        const depth = Math.round(hh * Math.sqrt(Math.max(0, 1 - (2 * u - 1) * (2 * u - 1))));
        const top = Math.round(base - depth + tilt * (i - len / 2));
        for (let y = top; y <= base + 1; y++) {
          const edge = y === top || y === base + 1 || i === 0 || i === len - 1;
          if (edge) set(x, y, 'plank'); else carve(x, y);
        }
        if (i % 9 === 4 && depth > 5) set(x, top + 1, 'lantern');
      }
      /* a mast, and the hold */
      const mx = cx + Math.round(len * 0.15);
      for (let y = base - hh - Wd.rint(6, 16); y < base - hh + 2; y++) set(mx, y, 'plank');
      set(cx - 3, base, 'chest');
      set(cx + 5, base, 'chest');
      meta.structures.push({ kind: 'wreck', x: cx - (len >> 1), y: base - hh, w: len, h: hh + 2 });
    }

    /* ---- vents: chimneys on the abyss floor, which is the only warm thing
            down there and the only light that is not yours */
    for (let n = 0; n < 26; n++) {
      const cx = Math.round(w * (0.55 + Wd.rrange(0, 0.44)));
      if (cx < 20 || cx > w - 20) continue;
      const base = surface[Math.min(w - 1, cx)] - 1;
      if (base < D.trench) continue;
      const tall = Wd.rint(10, 26);
      for (let k = 0; k < tall; k++) {
        const r = Math.max(1, 3 - Math.round(k * 2.4 / tall));
        for (let dx = -r; dx <= r; dx++) set(cx + dx, base - k, 'rot');
      }
      /* Glowpods all the way up, not one on the cap. Down here the water is
         at light level zero, and a landmark you cannot see from more than a
         screen away is not a landmark - these are the only things burning in
         the trench and they are what you steer by. */
      for (let k = 1; k < tall; k += 4) {
        set(cx - 2, base - k, 'glowpod');
        set(cx + 2, base - k - 2, 'glowpod');
      }
      set(cx, base - tall, 'glowpod');
      set(cx - 4, base, 'glowpod');
      set(cx + 4, base, 'glowpod');
      meta.structures.push({ kind: 'vent', x: cx - 3, y: base - tall, w: 7, h: tall });
    }

    /* ---- whale falls: a skull and a ribcage, on the deep shelf */
    for (let n = 0; n < 5; n++) {
      const cx = Math.round(w * (0.42 + n * 0.12) + Wd.rrange(-60, 60));
      if (cx < 40 || cx > w - 40) continue;
      const base = surface[Math.min(w - 1, cx)] - 1;
      if (base < D.ruins) continue;
      for (let i = 0; i < 9; i++) {                 /* the spine */
        set(cx + i * 3, base, 'bones');
        const rib = 4 + ((i * 7) % 5);
        for (let k = 1; k <= rib; k++) {
          set(cx + i * 3 - 1, base - k, 'bones');
          set(cx + i * 3 + 1, base - k, 'bones');
        }
      }
      for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 7; dx++) set(cx - 8 + dx, base - dy, 'bones');
      set(cx - 5, base - 5, 'chest');
      meta.structures.push({ kind: 'whale', x: cx - 10, y: base - 10, w: 42, h: 11 });
    }

    /* ---- spires: rock towers rising out of the shelf into the column, so
            the open water has something in it to swim around */
    for (let n = 0; n < 120; n++) {
      const cx = Wd.rint(60, w - 60);
      const base = surface[cx] - 1;
      if (base < D.shallows + 30) continue;
      const tall = Wd.rint(14, Math.max(20, Math.round((base - D.sea) * 0.42)));
      const rock = base > D.trench ? 'dark' : (base > D.reef ? 'stone' : 'sand');
      for (let k = 0; k < tall; k++) {
        const u = k / tall;
        const r = Math.max(0, Math.round(4 * (1 - u) + 1));
        for (let dx = -r; dx <= r; dx++) set(cx + dx, base - k, rock);
      }
      if (base < D.trench) {
        for (let k = 0; k < 4; k++) set(cx + Wd.rint(-2, 2), base - tall + k, 'coral');
      }
    }
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
        const zn = KD.Zones.at(x);
        /* Density and VARIETY are two separate rolls. Dividing one roll by
           the zone's lushness compressed it into the low end - in the reef,
           with a 2.2 multiplier, r never exceeded 0.31, so only the first
           three entries in each table could ever come up and the whole
           seabed was one kind of frond. */
        const lush = 1 + (zn.reef || 0) * 0.5 + (zn.kelp || 0) * 0.5;
        if (Wd.rnd() > Math.min(0.97, 0.78 * lush)) continue;
        const r = Wd.rnd();
        /* Planted THICK. The old table topped out around a fifth of the
           available row, which on a flat seabed is one sparse line of
           stubble; the sea floor should be crowded. */
        if (L.id === 'shallows' || L.id === 'reef') {
          if (B.id === 'sand' || B.id === 'mud') {
            if (r < 0.12) Wd.fg[i] = T.id(Wd.chance(0.5) ? 'frond' : 'frond2');
            else if (r < 0.24) Wd.fg[i] = T.id('tuft');
            else if (r < 0.31) Wd.fg[i] = T.id('grass');
            else if (r < 0.37) Wd.fg[i] = T.id('kelp');
            else if (r < 0.42) Wd.fg[i] = T.id('bulb');
            else if (r < 0.46) Wd.fg[i] = T.id('starfish');
            else if (r < 0.49) Wd.fg[i] = T.id('clamshell');
            else if (r < 0.53) Wd.fg[i] = T.id('urchin_d');
          } else if (B.id === 'coral' || B.id === 'stone') {
            if (r < 0.14) Wd.fg[i] = T.id('fan');
            else if (r < 0.26) Wd.fg[i] = T.id('tube');
            else if (r < 0.38) Wd.fg[i] = T.id('anemone');
            else if (r < 0.44) Wd.fg[i] = T.id('tuft');
          }
        } else if (L.id === 'ruins') {
          if (r < 0.08) Wd.fg[i] = T.id('bones');
          else if (r < 0.16) Wd.fg[i] = T.id('tube');
          else if (r < 0.24) Wd.fg[i] = T.id('anemone');
          else if (r < 0.29) Wd.fg[i] = T.id('urchin_d');
          else if (r < 0.34) Wd.fg[i] = T.id('tuft');
        } else if (L.id === 'trench') {
          if (r < 0.09) Wd.fg[i] = T.id('podstalk');
          else if (r < 0.15) Wd.fg[i] = T.id('bones');
          else if (r < 0.20) Wd.fg[i] = T.id('tube');
          else if (r < 0.24) Wd.fg[i] = T.id('urchin_d');
        } else if (L.id === 'abyss') {
          if (r < 0.10) Wd.fg[i] = T.id('podstalk');
          else if (r < 0.15) Wd.fg[i] = T.id('glowpod');
          else if (r < 0.19) Wd.fg[i] = T.id('bones');
        }
      }
    }
    /* moss on cave walls, on the background layer so it never blocks you */
    for (let n = 0; n < 9000; n++) {
      const x = Wd.rint(1, w - 2), y = Wd.rint(60, h - 2);
      if (Wd.at(x, y) === AIR && !isBuilt(x, y) && !Wd.bg[y * w + x] &&
          T.isSolid(Wd.at(x, y + 1)) && y < KD.Zones.D.ruins && Wd.chance(0.3)) {
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
