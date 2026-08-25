/* ============================================================
   world/village.js - Fruitfall. Twelve giant fruit sitting on
   three terraces of the seabed, each hollowed out by whoever
   lives in it.

   Every shell is carved from its OWN sprite: the generator reads
   the fruit's pixel mask and makes a tile solid only where the
   fruit really covers it. So the collision is the silhouette -
   you can never clip a corner of empty water, and the skin can
   never sit crooked on its box. That is also why leaving a house
   is not a maze any more: the shells are solid, the doorway is a
   notch in the belly you walk into off the street, and the room
   itself is its own scene.
   ============================================================ */
KD.Village = (function () {
  const TS = 8;
  /* Every building: which fruit, who lives there, what they sell, and what
     the room behind the door has in it. `job` drives the sign and the NPC. */
  const KINDS = [
    { fruit: 'vh_pineapple',  job: 'smith',     sign: 'vs_smith',      title: 'The Hot Anvil',    station: 'anvil',     shop: 'smith' },
    { fruit: 'vh_watermelon', job: 'tackler',   sign: 'vs_tackle',     title: 'Hook & Line',      station: null,        shop: 'tackle' },
    { fruit: 'vh_coconut',    job: 'princess',  sign: 'vs_tavern',     title: 'The Foamy Keg',    station: 'cookpot',   shop: 'tavern' },
    { fruit: 'vh_banana',     job: 'stabler',   sign: 'vs_stable',     title: 'The Stable',       station: null,        shop: 'stable' },
    { fruit: 'vh_apple',      job: 'trainer',   sign: 'vs_gym',        title: "Brine's Gym",      station: null,        gym: true },
    { fruit: 'vh_strawberry', job: 'bookie',    sign: 'vs_bookie',     title: 'Race Office',      station: null,        shop: 'bookie' },
    { fruit: 'vh_grape',      job: 'scholar',   sign: 'vs_apothecary', title: 'The Reading Room', station: 'vat',       shop: 'scholar' },
    { fruit: 'vh_lemon',      job: 'market',    sign: 'vs_market',     title: 'Sour Goods',       station: 'workbench', shop: 'market' },
    { fruit: 'vh_dragonfruit',job: 'barber',    sign: 'vs_barber',     title: 'A Cut Below',      station: null,        shop: 'barber' },
    { fruit: 'vh_durian',     job: 'bathhouse', sign: 'vs_bathhouse',  title: 'The Steam',        station: null,        shop: 'bath' },
    { fruit: 'vh_shell',      job: 'guard',     sign: null,            title: 'Gate House',       station: null,        shop: 'guard' },
    { fruit: 'vh_stump',      job: null,        sign: null,            title: 'Your Shack',       station: 'workbench', home: true }
  ];

  /* --- footprint of one fruit, in tiles, straight off the sprite ------- */
  function footprint(kind) {
    const s = KD.PX.get(kind.fruit);
    if (!s) return { w: 5, h: 6, sw: 40, sh: 48, ax: 20, ay: 48 };
    return {
      w: Math.ceil(s.w / TS), h: Math.ceil(s.h / TS),
      sw: s.w, sh: s.h, ax: s.ax, ay: s.ay
    };
  }

  /* Lay the town out on three terraces. Returns the building list; the
     generator carves them, and scenes/interior.js furnishes the rooms. */
  function plan(Wd, z, surfaceAt) {
    const out = [];
    const cx = ((z.x0 + z.x1) / 2) | 0;
    const base = surfaceAt(cx);
    /* three shelves, each one step higher than the last, so the town
       climbs away from the mine mouth instead of lying flat */
    const terraces = [
      { y: base,      x0: z.x0 + 14,  x1: z.x0 + 116 },
      { y: base - 9,  x0: z.x0 + 118, x1: z.x0 + 224 },
      { y: base - 18, x0: z.x0 + 226, x1: z.x1 - 14 }
    ];
    const order = KINDS.slice();
    /* home stays first and the gate house stays last; the trades shuffle,
       so two runs never lay Fruitfall out the same way */
    for (let i = order.length - 3; i > 0; i--) {
      const j = 1 + ((Wd.rnd() * i) | 0);
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    let ti = 0, x = terraces[0].x0;
    for (const k of order) {
      const f = footprint(k);
      let t = terraces[ti];
      if (x + f.w + 3 > t.x1) { ti = Math.min(terraces.length - 1, ti + 1); t = terraces[ti]; x = t.x0; }
      if (x + f.w + 3 > t.x1) break;
      out.push({
        kind: k, x, y: t.y - f.h, w: f.w, h: f.h,
        terrace: ti, floorY: t.y, fp: f
      });
      x += f.w + Wd.rint(3, 7);
    }
    return { buildings: out, terraces };
  }

  /* Cut each terrace as one continuous shelf BEFORE any fruit lands on
     it. Doing it per-building left the untouched terrain standing between
     the pads, so the street read as a row of brown pillars. */
  function shelve(Wd, T, terraces) {
    const w = Wd.W, sand = T.id('sand'), stone = T.id('stone');
    for (const tr of terraces) {
      for (let tx = tr.x0 - 4; tx <= tr.x1 + 4; tx++) {
        if (!Wd.inside(tx, 0)) continue;
        /* clear the head-room above the shelf */
        for (let j = Math.max(1, tr.y - 22); j < tr.y; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.AIR;
        /* and lay a floor: two rows of sand on packed stone, so digging
           through the street is possible but not accidental */
        for (let j = tr.y; j < tr.y + 2; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = sand;
        for (let j = tr.y + 2; j < tr.y + 6; j++) {
          if (Wd.inside(tx, j) && Wd.fg[j * w + tx] === T.AIR) Wd.fg[j * w + tx] = stone;
        }
      }
    }
  }

  /* Carve one fruit. Flatten the ground it stands on, then stamp the
     sprite's own silhouette into the tile layer as shell, and notch a
     doorway out of the belly. */
  function carve(Wd, T, b) {
    const w = Wd.W;
    const s = KD.PX.get(b.kind.fruit);
    const rind = T.id('rind');
    const floorRow = b.floorY;
    /* shelve() has already cut the street; just make sure nothing has
       grown into the footprint since */
    for (let i = -1; i <= b.w; i++) {
      const tx = b.x + i;
      if (!Wd.inside(tx, 0)) continue;
      for (let j = Math.max(1, b.y - 2); j < floorRow; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.AIR;
    }
    /* where the sprite really is, in pixels */
    const px = (b.x + b.w / 2) * TS - (s ? s.ax : 20);
    const py = floorRow * TS - (s ? s.ay : 48);
    b.px = Math.round(px); b.py = Math.round(py);
    /* stamp the silhouette: a tile is shell when the fruit covers most of it */
    if (s) {
      for (let ty = b.y; ty < b.y + b.h; ty++) {
        for (let tx = b.x; tx < b.x + b.w; tx++) {
          if (!Wd.inside(tx, ty)) continue;
          let hit = 0;
          for (let sy = 0; sy < TS; sy++) {
            const iy = ty * TS + sy - b.py;
            if (iy < 0 || iy >= s.h) continue;
            for (let sx = 0; sx < TS; sx++) {
              const ix = tx * TS + sx - b.px;
              if (ix < 0 || ix >= s.w) continue;
              if (s.data[iy * s.w + ix] >= 0) hit++;
            }
          }
          if (hit >= 30) Wd.fg[ty * w + tx] = rind;
        }
      }
    } else {
      for (let ty = b.y; ty < b.y + b.h; ty++)
        for (let tx = b.x; tx < b.x + b.w; tx++)
          if (Wd.inside(tx, ty)) Wd.fg[ty * w + tx] = rind;
    }
    /* the doorway: a 2x3 notch out of the belly, standing on the street.
       Two tiles wide so a 6px-wide king strolls through without hunting
       for pixels, and open downward so there is never a way to be shut in. */
    const dw = 2;
    const dx = b.x + ((b.w - dw) >> 1);
    for (let i = 0; i < dw; i++) {
      for (let j = 1; j <= 3; j++) {
        const ty = floorRow - j, tx = dx + i;
        if (Wd.inside(tx, ty)) { Wd.fg[ty * w + tx] = T.AIR; Wd.setWater && Wd.setWater(tx, ty, 0); }
      }
    }
    b.door = { x: dx, y: floorRow - 1, w: dw, h: 3 };
    b.doorCx = dx + dw / 2;
    /* A lantern on the street outside, not bored into the shell: every
       fruit already draws its own lit windows, and a tile lantern sunk
       into the rind just read as a pale box stuck to the wall. */
    const lamp = T.id('lantern');
    const lx = dx + (Wd.chance(0.5) ? -2 : dw + 1);
    if (Wd.inside(lx, floorRow - 1) && Wd.fg[(floorRow - 1) * w + lx] === T.AIR)
      Wd.fg[(floorRow - 1) * w + lx] = lamp;
    /* where the sign hangs, and which way the fruit faces */
    /* The sign hangs off a bracket on one flank, at eye level, where it
       cannot cover the windows the fruit already has drawn into it. */
    const right = Wd.chance(0.5);
    b.signSide = right ? 1 : -1;
    b.signAt = { x: right ? b.px + (s ? s.w : 40) - 4 : b.px - 22, y: floorRow * TS - 44 };
    return b;
  }

  /* Stairs between terraces, so the town is walkable end to end. */
  function connect(Wd, T, terraces) {
    const w = Wd.W;
    const plat = T.id('platform');
    for (let i = 0; i < terraces.length - 1; i++) {
      const a = terraces[i], b = terraces[i + 1];
      const x0 = a.x1 + 1, x1 = b.x0 - 1;
      const drop = a.y - b.y;                          // b is the higher shelf
      const span = Math.max(1, x1 - x0);
      for (let k = 0; k <= drop; k++) {
        /* one step per tile of rise, spread across the gap */
        const tx = x0 + Math.round((k / Math.max(1, drop)) * span);
        for (let j = a.y - k; j < a.y - k + 3; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = plat;
        for (let j = a.y - k - 14; j < a.y - k; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.AIR;
      }
      /* and flatten the landing at the top so you do not step into a wall */
      for (let tx = x1; tx < x1 + 4; tx++) {
        for (let j = b.y - 14; j < b.y; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.AIR;
        for (let j = b.y; j < b.y + 4; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.id('sand');
      }
    }
  }

  /* ---- which house am I standing in the doorway of? ------------------ */
  function doorAt(worldX, worldY) {
    const v = KD.Gen.meta.village;
    if (!v) return null;
    const tx = (worldX / TS) | 0, ty = (worldY / TS) | 0;
    for (const b of v.buildings) {
      const d = b.door;
      if (!d) continue;
      if (tx >= d.x - 1 && tx < d.x + d.w + 1 && ty <= d.y && ty > d.y - d.h) return b;
    }
    return null;
  }

  /* ---- draw the skins over the tile world --------------------------- */
  /* Called between the terrain and the actors, so a fruit can overlap the
     street it stands on and still be walked in front of. */
  function draw(ctx, cam) {
    const v = KD.Gen.meta.village;
    if (!v) return;
    const L = KD.Light, Wd = KD.World;
    for (const b of v.buildings) {
      const sx = Math.round(b.px - cam.x), sy = Math.round(b.py - cam.y);
      if (sx > KD.Screen.w || sx + b.w * TS < 0) continue;
      const lit = Wd.lit[(b.y + 1) * Wd.W + b.x + (b.w >> 1)] || 0;
      const shade = KD.PX.bandFor(lit, L.MAX);
      /* Every fruit already has its own door and lit windows drawn into
         it - all this has to do is darken the reveal so the notch we
         carved out of the tile layer does not show terrain through it. */
      const dx = Math.round(b.door.x * TS - cam.x);
      const dy = Math.round((b.door.y - b.door.h + 1) * TS - cam.y);
      KD.Screen.rect(dx, dy, b.door.w * TS, b.door.h * TS - 1, 'INK.0');
      KD.Dither.fill(ctx, dx, dy, b.door.w * TS, 6, 'GOLD.0', 0.4);
      KD.PX.blit(ctx, b.kind.fruit, sx, sy, { shade, anchor: false });
      /* the trade sign, hung off the front of the fruit */
      if (b.kind.sign && KD.PX.has(b.kind.sign)) {
        KD.PX.blit(ctx, b.kind.sign, Math.round(b.signAt.x - cam.x),
          Math.round(b.signAt.y - cam.y), { shade, anchor: false });
      }
    }
  }
  return { KINDS, plan, shelve, carve, connect, draw, doorAt, footprint };
})();
