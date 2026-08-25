/* ============================================================
   world/village.js - Fruitfall. Twelve hollowed giant fruit on
   three terraces, each a real interior you can walk into, each
   with an NPC and a trade. Built procedurally so no two runs
   lay the town out the same way.
   ============================================================ */
KD.Village = (function () {
  const TS = 8;
  /* Every building: which fruit, who lives there, what they sell, and how
     big the room behind the door is. `job` drives the sign and the NPC. */
  const KINDS = [
    { fruit: 'vh_pineapple',  job: 'smith',      sign: 'vs_smith',      title: 'The Hot Anvil',    station: 'anvil',     w: 14, h: 9 },
    { fruit: 'vh_watermelon', job: 'tackler',    sign: 'vs_tackle',     title: 'Hook & Line',      station: null,        w: 13, h: 8 },
    { fruit: 'vh_coconut',    job: 'princess',   sign: 'vs_tavern',     title: 'The Foamy Keg',    station: 'cookpot',   w: 16, h: 9 },
    { fruit: 'vh_banana',     job: 'stabler',    sign: 'vs_stable',     title: 'The Stable',       station: null,        w: 15, h: 9 },
    { fruit: 'vh_apple',      job: 'trainer',    sign: 'vs_gym',        title: "Brine's Gym",      station: null,        w: 16, h: 9, gym: true },
    { fruit: 'vh_strawberry', job: 'bookie',     sign: 'vs_bookie',     title: 'Race Office',      station: null,        w: 12, h: 8 },
    { fruit: 'vh_grape',      job: 'scholar',    sign: 'vs_apothecary', title: 'The Reading Room', station: 'vat',       w: 14, h: 9 },
    { fruit: 'vh_lemon',      job: 'market',     sign: 'vs_market',     title: 'Sour Goods',       station: 'workbench', w: 13, h: 8 },
    { fruit: 'vh_dragonfruit',job: 'barber',     sign: 'vs_barber',     title: 'A Cut Below',      station: null,        w: 12, h: 8 },
    { fruit: 'vh_durian',     job: 'bathhouse',  sign: 'vs_bathhouse',  title: 'The Steam',        station: null,        w: 14, h: 9 },
    { fruit: 'vh_shell',      job: 'guard',      sign: null,            title: 'Gate House',       station: null,        w: 13, h: 8 },
    { fruit: 'vh_stump',      job: null,         sign: null,            title: 'Your Shack',       station: 'workbench', w: 14, h: 9, home: true }
  ];

  /* Lay the town out on three terraces. Returns the building list; the
     generator carves them and interiors.js furnishes them. */
  function plan(Wd, z, surfaceAt) {
    const out = [];
    const cx = ((z.x0 + z.x1) / 2) | 0;
    /* three terrace heights, each a flat shelf the buildings stand on */
    const base = surfaceAt(cx);
    const terraces = [
      { y: base,     x0: z.x0 + 16,  x1: z.x0 + 118 },
      { y: base - 8, x0: z.x0 + 120, x1: z.x0 + 226 },
      { y: base - 16, x0: z.x0 + 228, x1: z.x1 - 16 }
    ];
    const order = KINDS.slice();
    /* home first, gate house last, the rest shuffled so the town differs */
    for (let i = order.length - 3; i > 0; i--) {
      const j = 1 + ((Wd.rnd() * i) | 0);
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    let ti = 0, x = terraces[0].x0;
    for (const k of order) {
      let t = terraces[ti];
      if (x + k.w + 4 > t.x1) { ti = Math.min(terraces.length - 1, ti + 1); t = terraces[ti]; x = t.x0; }
      if (x + k.w + 4 > t.x1) break;
      out.push({ kind: k, x, y: t.y - k.h, w: k.w, h: k.h, terrace: ti, floorY: t.y });
      x += k.w + Wd.rint(4, 9);
    }
    return { buildings: out, terraces };
  }

  /* carve one building: flatten under it, wall it, roof it, punch a door
     through a side wall standing on the floor, and mark the room dry */
  function carve(Wd, T, b, markDry) {
    const w = Wd.W;
    const { x, y, h } = b;
    const bw = b.w;
    const floorRow = y + h - 1;
    /* flatten a shelf, and clear the air above it */
    for (let i = -2; i <= bw + 1; i++) {
      const tx = x + i;
      if (!Wd.inside(tx, 0)) continue;
      for (let j = floorRow; j < floorRow + 5; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.id('sand');
      for (let j = Math.max(1, y - 8); j < floorRow; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.AIR;
    }
    /* walls, floor, ceiling */
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < bw; i++) {
        const tx = x + i, ty = y + j;
        if (!Wd.inside(tx, ty)) continue;
        const edge = i === 0 || i === bw - 1 || j === 0 || j === h - 1;
        Wd.fg[ty * w + tx] = edge ? T.id('plank') : T.AIR;
        if (!edge) { Wd.bg[ty * w + tx] = T.id('plank'); markDry(tx, ty); }
      }
    }
    /* the doorway: a hole in a side wall, 3 tall, on the floor, with the
       ground outside cleared so there is somewhere to step */
    const onLeft = Wd.chance(0.5);
    const dx = onLeft ? x : x + bw - 1;
    const ox = onLeft ? x - 1 : x + bw;
    for (let j = 1; j <= 3; j++) {
      const ty = floorRow - j;
      Wd.fg[ty * w + dx] = T.AIR;
      Wd.bg[ty * w + dx] = T.id('plank');
      markDry(dx, ty);
      if (Wd.inside(ox, ty)) Wd.fg[ty * w + ox] = T.AIR;
    }
    b.door = dx;
    b.doorSide = onLeft ? -1 : 1;
    /* windows, and a lantern so the room is lit */
    for (let i = 3; i < bw - 3; i += 4) {
      Wd.fg[(y + 2) * w + x + i] = T.id('glass');
    }
    Wd.fg[(y + 1) * w + (x + (bw >> 1))] = T.id('lantern');
    /* the station this trade needs, on the floor inside */
    if (b.kind.station) {
      const sx = x + 2 + (Wd.rint(0, Math.max(0, bw - 6)));
      Wd.fg[(floorRow - 1) * w + sx] = T.id(b.kind.station);
      b.stationAt = sx;
    }
    b.npcAt = x + 2 + ((bw - 4) >> 1);
    return b;
  }

  /* stairs and rope bridges between terraces, so the town is walkable */
  function connect(Wd, T, terraces) {
    const w = Wd.W;
    for (let i = 0; i < terraces.length - 1; i++) {
      const a = terraces[i], b = terraces[i + 1];
      const x = (a.x1 + b.x0) >> 1;
      const drop = a.y - b.y;                         // b is higher
      for (let k = 0; k <= drop; k++) {
        const tx = x - Math.floor(k / 2), ty = a.y - k;
        for (let j = ty; j < ty + 3; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.id('platform');
        /* keep the headroom clear */
        for (let j = ty - 12; j < ty; j++) if (Wd.inside(tx, j)) Wd.fg[j * w + tx] = T.AIR;
      }
    }
  }
  return { KINDS, plan, carve, connect };
})();
