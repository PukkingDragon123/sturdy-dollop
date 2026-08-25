/* ============================================================
   world/water.js - cellular water. Eight fill levels per tile.
   Dig into a reservoir and your tunnel really does flood, which
   is the whole reason air pockets are worth building.
   ============================================================ */
KD.Water = (function () {
  const MAX = 8;
  let active = null;                  // tiles worth simulating this frame
  let next = null;

  function init() { active = new Set(); next = new Set(); }
  /* nudge a tile and its neighbours: something changed here */
  function touch(x, y) {
    if (!active) init();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const tx = x + dx, ty = y + dy;
      if (KD.World.inside(tx, ty)) active.add(ty * KD.World.W + tx);
    }
  }
  const passable = (x, y) => !KD.Tiles.isSolid(KD.World.at(x, y));

  /* One settle pass over the active set. Water falls, then spreads level.
     Budgeted so a huge flood costs frames, not a hang. */
  function step(budget) {
    if (!active || !active.size) return 0;
    const Wd = KD.World, W = Wd.W;
    const list = active; active = next; next = list === next ? new Set() : active;
    active = new Set();
    let n = 0;
    for (const i of list) {
      if (n++ > (budget || 4000)) { active.add(i); continue; }
      const x = i % W, y = (i / W) | 0;
      let v = Wd.water(x, y);
      if (v <= 0 || !passable(x, y)) continue;
      /* 1. fall */
      if (passable(x, y + 1) && Wd.inside(x, y + 1)) {
        const below = Wd.water(x, y + 1);
        if (below < MAX) {
          const move = Math.min(v, MAX - below);
          Wd.setWater(x, y + 1, below + move);
          Wd.setWater(x, y, v - move);
          v -= move;
          touch(x, y + 1); touch(x, y);
          if (v <= 0) continue;
        }
      }
      /* 2. level out sideways */
      for (const dx of (Wd.rnd() < 0.5 ? [-1, 1] : [1, -1])) {
        if (!passable(x + dx, y) || !Wd.inside(x + dx, y)) continue;
        const side = Wd.water(x + dx, y);
        if (side < v - 1) {
          const move = Math.max(1, ((v - side) / 2) | 0);
          Wd.setWater(x + dx, y, side + move);
          Wd.setWater(x, y, v - move);
          v -= move;
          touch(x + dx, y); touch(x, y);
        }
      }
    }
    return n;
  }
  /* how deep is the player in it: 0 dry, 1 fully submerged */
  function submersion(px, py, h) {
    const TS = KD.World.TS;
    const tx = (px / TS) | 0;
    let wet = 0, total = 0;
    for (let y = py - h; y < py; y += 4) {
      total++;
      if (KD.World.water(tx, (y / TS) | 0) >= 4) wet++;
    }
    return total ? wet / total : 0;
  }
  return { MAX, init, touch, step, submersion };
})();
