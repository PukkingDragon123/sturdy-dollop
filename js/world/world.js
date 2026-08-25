/* ============================================================
   world/world.js - the tile store. Three parallel byte layers
   over one big grid: the foreground tile, the background wall,
   and the light level. Everything else in the game reads and
   writes through here.
   ============================================================ */
KD.World = (function () {
  const TS = 8;                       // tile size in pixels
  let W = 0, H = 0;
  let fg = null, bg = null, lit = null, dmg = null, wat = null;
  let seed = 1;

  /* --- seeded random, so a world can be rebuilt from its seed --- */
  function rngFrom(s) {
    let a = (s | 0) || 1;
    return function () {
      a ^= a << 13; a >>>= 0;
      a ^= a >> 17;
      a ^= a << 5; a >>>= 0;
      return a / 4294967296;
    };
  }
  let rnd = rngFrom(1);
  const rrange = (lo, hi) => lo + rnd() * (hi - lo);
  const rint = (lo, hi) => Math.floor(lo + rnd() * (hi - lo + 1));
  const chance = (p) => rnd() < p;
  const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];

  /* --- value noise, hashed off the seed. No libraries. --- */
  function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263 + seed * 2654435761) | 0;
    h = (h ^ (h >> 13)) * 1274126177 | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf;
  }
  function fbm(x, y, oct, gain) {
    let s = 0, amp = 1, tot = 0, fx = x, fy = y;
    gain = gain === undefined ? 0.5 : gain;
    for (let i = 0; i < (oct || 4); i++) {
      s += noise2(fx, fy) * amp; tot += amp;
      amp *= gain; fx *= 2; fy *= 2;
    }
    return s / tot;
  }

  function alloc(w, h, s) {
    W = w; H = h; seed = s | 0 || 1;
    rnd = rngFrom(seed);
    const n = W * H;
    fg = new Uint8Array(n);
    bg = new Uint8Array(n);
    lit = new Uint8Array(n);
    dmg = new Uint8Array(n);
    wat = new Uint8Array(n);          // 0..8 fill level
    return { W, H };
  }

  const idx = (x, y) => y * W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (x, y) => (inside(x, y) ? fg[idx(x, y)] : KD.Tiles.id('stone'));
  const wall = (x, y) => (inside(x, y) ? bg[idx(x, y)] : 0);
  const solid = (x, y) => KD.Tiles.isSolid(at(x, y));
  const water = (x, y) => (inside(x, y) ? wat[idx(x, y)] : 0);
  const lightAt = (x, y) => (inside(x, y) ? lit[idx(x, y)] : 0);

  const dirty = new Set();            // chunk keys needing a redraw
  const CH = 16;                      // chunk size in tiles
  const markChunk = (x, y) => {
    dirty.add(((y / CH) | 0) * 4096 + ((x / CH) | 0));
    /* neighbours too, autotiling reaches across the seam */
    if (x % CH === 0) dirty.add(((y / CH) | 0) * 4096 + (((x - 1) / CH) | 0));
    if (x % CH === CH - 1) dirty.add(((y / CH) | 0) * 4096 + (((x + 1) / CH) | 0));
    if (y % CH === 0) dirty.add((((y - 1) / CH) | 0) * 4096 + ((x / CH) | 0));
    if (y % CH === CH - 1) dirty.add((((y + 1) / CH) | 0) * 4096 + ((x / CH) | 0));
  };

  function set(x, y, t) {
    if (!inside(x, y)) return;
    const i = idx(x, y);
    if (fg[i] === t) return;
    fg[i] = t; dmg[i] = 0;
    markChunk(x, y);
    KD.Light.touch(x, y);
  }
  function setWall(x, y, t) {
    if (!inside(x, y)) return;
    bg[idx(x, y)] = t; markChunk(x, y); KD.Light.touch(x, y);
  }
  function setWater(x, y, v) {
    if (!inside(x, y)) return;
    wat[idx(x, y)] = Math.max(0, Math.min(8, v)); markChunk(x, y);
  }
  /* returns true when the tile broke */
  function damage(x, y, amount) {
    if (!inside(x, y)) return false;
    const i = idx(x, y), t = KD.Tiles.get(fg[i]);
    if (!t || !t.hp) return false;
    dmg[i] = Math.min(255, dmg[i] + amount);
    markChunk(x, y);
    if (dmg[i] >= t.hp) { set(x, y, KD.Tiles.AIR); return true; }
    return false;
  }
  const damageOf = (x, y) => (inside(x, y) ? dmg[idx(x, y)] : 0);

  /* neighbour bitmask for autotiling: 1 up, 2 right, 4 down, 8 left */
  function mask(x, y) {
    const a = at(x, y), t = KD.Tiles.get(a);
    if (!t || !t.art) return 0;
    const same = (nx, ny) => {
      const n = KD.Tiles.get(at(nx, ny));
      return !!(n && n.solid) || (n && n.art === t.art);
    };
    return (same(x, y - 1) ? 1 : 0) | (same(x + 1, y) ? 2 : 0) |
           (same(x, y + 1) ? 4 : 0) | (same(x - 1, y) ? 8 : 0);
  }

  /* --- save: run-length encode the layers, they compress hugely --- */
  function rle(arr) {
    const out = [];
    let v = arr[0], n = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === v && n < 65000) n++;
      else { out.push(v, n); v = arr[i]; n = 1; }
    }
    out.push(v, n);
    return out;
  }
  function unrle(list, arr) {
    let i = 0;
    for (let k = 0; k < list.length; k += 2) {
      const v = list[k], n = list[k + 1];
      for (let j = 0; j < n; j++) arr[i++] = v;
    }
    return arr;
  }
  const save = () => ({ W, H, seed, fg: rle(fg), bg: rle(bg), wat: rle(wat) });
  function loadFrom(o) {
    alloc(o.W, o.H, o.seed);
    unrle(o.fg, fg); unrle(o.bg, bg); unrle(o.wat, wat);
    dirty.clear();
    return true;
  }

  return {
    TS, CH, alloc, save, loadFrom,
    get W() { return W; }, get H() { return H; },
    get seed() { return seed; },
    idx, inside, at, wall, solid, water, lightAt, damageOf, mask,
    set, setWall, setWater, damage, markChunk, dirty,
    get fg() { return fg; }, get bg() { return bg; }, get lit() { return lit; },
    get wat() { return wat; }, get dmg() { return dmg; },
    rnd: () => rnd(), rrange, rint, chance, pick, noise2, fbm, rngFrom,
    reseed: (s) => { seed = s | 0 || 1; rnd = rngFrom(seed); }
  };
})();
