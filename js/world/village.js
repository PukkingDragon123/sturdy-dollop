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
  /* Every fruit is drawn and carved at SC times its authored size. The art
     was authored at 40x48, which is six tiles tall - next to a 24x36 king
     that read as a person the size of his own house. Doubling it makes a
     house about three and a half times his height, which is what a house
     is. Integer scale only, so the pixels stay square. */
  const SC = 2;
  function footprint(kind) {
    const s = KD.PX.get(kind.fruit);
    if (!s) return { w: 10, h: 12, sw: 80, sh: 96, ax: 40, ay: 96 };
    return {
      w: Math.ceil(s.w * SC / TS), h: Math.ceil(s.h * SC / TS),
      sw: s.w * SC, sh: s.h * SC, ax: s.ax * SC, ay: s.ay * SC
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
      if (x + f.w + 5 > t.x1) { ti = Math.min(terraces.length - 1, ti + 1); t = terraces[ti]; x = t.x0; }
      if (x + f.w + 5 > t.x1) break;
      out.push({
        kind: k, x, y: t.y - f.h, w: f.w, h: f.h,
        terrace: ti, floorY: t.y, fp: f
      });
      x += f.w + Wd.rint(7, 13);
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
    const px = (b.x + b.w / 2) * TS - (s ? s.ax * SC : 40);
    const py = floorRow * TS - (s ? s.ay * SC : 96);
    b.px = Math.round(px); b.py = Math.round(py);
    /* stamp the silhouette: a tile is shell when the fruit covers most of it */
    if (s) {
      for (let ty = b.y; ty < b.y + b.h; ty++) {
        for (let tx = b.x; tx < b.x + b.w; tx++) {
          if (!Wd.inside(tx, ty)) continue;
          let hit = 0;
          for (let sy = 0; sy < TS; sy++) {
            const iy = ((ty * TS + sy - b.py) / SC) | 0;
            if (iy < 0 || iy >= s.h) continue;
            for (let sx = 0; sx < TS; sx++) {
              const ix = ((tx * TS + sx - b.px) / SC) | 0;
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
    /* Sized to the door the fruit itself draws, now that the fruit is at
       2x: about three tiles across and five tall. */
    const dw = 3, dh = 5;
    const dx = b.x + ((b.w - dw) >> 1);
    for (let i = 0; i < dw; i++) {
      for (let j = 1; j <= dh; j++) {
        const ty = floorRow - j, tx = dx + i;
        if (Wd.inside(tx, ty)) { Wd.fg[ty * w + tx] = T.AIR; Wd.setWater && Wd.setWater(tx, ty, 0); }
      }
    }
    b.door = { x: dx, y: floorRow - 1, w: dw, h: dh };
    b.doorH = dh;
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
    b.signAt = { x: right ? b.px + (s ? s.w * SC : 80) - 6 : b.px - 24, y: floorRow * TS - 62 };
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
      const fs = KD.PX.get(b.kind.fruit);
      KD.PX.blit(ctx, b.kind.fruit, sx, sy,
        { shade, anchor: false, w: fs.w * SC, h: fs.h * SC });
      /* The doorway, drawn after the fruit. The notch carved out of the
         tile layer has to be filled with SOMETHING or the background water
         shows through the base of the house as a blue box - and the door
         each fruit draws into its own art does not line up with the notch
         once the fruit is blitted at 2x. So this is the real door: a plank
         frame, a dark reveal, warm light spilling out of the room behind
         it, and a worn step. */
      const dx = Math.round(b.door.x * TS - cam.x);
      const dh = b.door.h * TS, dwp = b.door.w * TS;
      const dy = Math.round((b.door.y + 1) * TS - cam.y) - dh;
      KD.Screen.rect(dx, dy, dwp, dh, 'WOOD.3');                     // frame
      KD.Screen.rect(dx + 2, dy + 2, dwp - 4, dh - 2, 'INK.0');      // reveal
      /* the room behind: a warm wedge, brightest at the floor */
      KD.Screen.rect(dx + 3, dy + dh - 14, dwp - 6, 13, 'GOLD.0');
      KD.Screen.rect(dx + 4, dy + dh - 10, dwp - 8, 9, 'GOLD.1');
      KD.Screen.rect(dx + 5, dy + dh - 6, dwp - 10, 5, 'GOLD.2');
      KD.Dither.fill(ctx, dx + 3, dy + dh - 18, dwp - 6, 5, 'GOLD.0', 0.5);
      /* lintel highlight and a worn stone step */
      KD.Screen.rect(dx + 1, dy + 1, dwp - 2, 1, 'WOOD.1');
      KD.Screen.rect(dx - 1, dy + dh - 1, dwp + 2, 2, 'STONE.1');
      KD.Screen.rect(dx - 1, dy + dh + 1, dwp + 2, 1, 'STONE.0');
      KD.Screen.frame(dx, dy, dwp, dh, 'INK.0');
      /* the trade sign, hung off the front of the fruit */
      if (b.kind.sign && KD.PX.has(b.kind.sign)) {
        KD.PX.blit(ctx, b.kind.sign, Math.round(b.signAt.x - cam.x),
          Math.round(b.signAt.y - cam.y), { shade, anchor: false });
      }
    }
  }
  return { KINDS, plan, shelve, carve, connect, draw, doorAt, footprint };
})();
