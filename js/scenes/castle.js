/* ============================================================
   scenes/castle.js - Act One. Four rooms of your own castle,
   walked end to end, before you lose it.

   The castle is not part of the tile world. It is its own scene
   with its own collision - a floor line and a handful of wall
   columns with door gaps in them - because the tile world exists
   to be dug and this exists to be beautiful, and those two want
   opposite things from a wall.

   All the masonry is BAKED once into a canvas as wide as the
   castle (world/castle.js draws it) and blitted per frame, so
   the wall can be as detailed as it likes for the cost of one
   drawImage. Only what moves - flames, candles, the sea through
   the balcony arch, the cast - draws live on top.
   ============================================================ */
KD.Scenes.castle = (function () {
  const K = KD.CastleKit;
  const A1 = KD.Act1;

  /* ---- the building ------------------------------------------------ */
  /* CH has to be at least the 240-row render buffer or the frame ends in a
     black band under the floor, which is exactly what the first pass did. */
  const CW = 900, CH = 252;                  // castle space
  const CEIL = 16, FLOOR = 200;              // floor top
  const ROOMS = [
    { x: 0,   w: 210, name: 'THE THRONE ROOM' },
    { x: 210, w: 250, name: 'THE GREAT HALL' },
    { x: 460, w: 200, name: 'THE KITCHENS' },
    { x: 660, w: 240, name: 'THE SEA BALCONY' }
  ];
  const DOORW = 34, DOORH = 76;              // the gap in a dividing wall
  const WALLW = 12;

  let baked = null;                          // the whole castle, drawn once
  let cam = { x: 0, y: 0 };
  let t = 0, roomT = 0, shownRoom = -1;

  /* ---- the king ---------------------------------------------------- */
  const P = { x: 120, y: FLOOR, vx: 0, vy: 0, face: 1, anim: 0, ground: true,
              atk: 0, plate: 0, hurt: 0, hp: 5 };
  const SPD = 78, ACC = 460, GRAV = 420, JUMP = 168;

  /* ---- what is in the rooms --------------------------------------- */
  let mobs = [];                             // sharks, when they come
  let thrown = [];                           // plates in flight
  let talk = null;                           // {lines, i, ch}
  let mini = null;                           // a minigame in progress
  let spawnT = 0;
  const BTNS = [];
  /* tap-to-walk: a world x he is heading for, and what he does on arrival */
  let goTo = null, goWhat = null, goT = 0;

  /* ================================================================
     BAKING
     ================================================================ */
  function bake() {
    const c = document.createElement('canvas');
    c.width = CW; c.height = CH;
    const x2 = c.getContext('2d');
    x2.imageSmoothingEnabled = false;

    /* the void behind everything */
    K.fill(x2, 0, 0, CW, CH, 'INK.0');

    for (let i = 0; i < ROOMS.length; i++) dressRoom(x2, i);

    /* dividing walls, with a doorway punched through each */
    for (let i = 1; i < ROOMS.length; i++) {
      const wx = ROOMS[i].x - (WALLW >> 1);
      K.stone(x2, wx, CEIL, WALLW, FLOOR - CEIL, { bw: 12, bh: 9 });
      K.flagstone(x2, wx - 2, FLOOR, WALLW + 4, 30);
      const dx = wx + ((WALLW - DOORW) >> 1);
      /* A doorway is a dim PASSAGE, not a hole. Painting it INK.0 made every
         door a black rectangle; leaving it transparent made the wall look
         cut out. A dark stone interior with the floor running through reads
         as somewhere you can walk. */
      K.archway(x2, dx, FLOOR - DOORH, DOORW, DOORH, { back: 'STONE.0', keystone: true });
      K.stone(x2, dx + 2, FLOOR - DOORH + 6, DOORW - 4, DOORH - 6,
              { bw: 9, bh: 6, ramp: 'STONE', mortar: 'INK.0' });
      K.fill(x2, dx, FLOOR - DOORH, DOORW, DOORH, '#0d1424');
      K.fill(x2, dx + 3, FLOOR - 10, DOORW - 6, 10, 'STONE.1');
      K.fill(x2, dx + 3, FLOOR - 10, DOORW - 6, 1, 'STONE.2');
    }
    /* the two ends of the castle are solid */
    K.stone(x2, 0, CEIL, 10, FLOOR - CEIL, { bw: 12, bh: 9 });
    K.stone(x2, CW - 10, CEIL, 10, FLOOR - CEIL, { bw: 12, bh: 9 });
    /* the ceiling, and the floor below the floor */
    K.stone(x2, 0, 0, CW, CEIL, { bw: 22, bh: 8, ramp: 'STONE' });
    K.fill(x2, 0, CEIL, CW, 2, 'INK.0');
    /* below the flagstones is more castle, not a void */
    K.stone(x2, 0, FLOOR + 30, CW, CH - FLOOR - 30, { bw: 20, bh: 10, ramp: 'STONE', mortar: 'INK.1' });
    K.fill(x2, 0, FLOOR + 30, CW, 1, 'INK.0');
    baked = c;
  }

  /* Each room gets its own back wall, floor, glass and furniture. This is
     where the castle stops being a corridor. */
  function dressRoom(x2, i) {
    const r = ROOMS[i];
    const x = r.x, w = r.w;
    K.stone(x2, x, CEIL, w, FLOOR - CEIL, {});
    /* a wainscot band so the wall has a bottom */
    K.fill(x2, x, FLOOR - 26, w, 26, 'STONE.0');
    K.stone(x2, x, FLOOR - 26, w, 26, { bw: 14, bh: 7, ramp: 'STONE', mortar: 'INK.0' });
    K.fill(x2, x, FLOOR - 27, w, 2, 'GOLD.0');
    K.fill(x2, x, FLOOR - 26, w, 1, 'GOLD.2');

    if (i === 0) throneRoom(x2, x, w);
    else if (i === 1) greatHall(x2, x, w);
    else if (i === 2) kitchens(x2, x, w);
    else balcony(x2, x, w);
  }

  function floorAndPillars(x2, x, w, pillars) {
    K.flagstone(x2, x, FLOOR, w, 30);
    K.fill(x2, x, FLOOR, w, 1, 'STONE.3');
    for (const px of pillars) K.pillar(x2, x + px, CEIL + 2, FLOOR, {});
  }

  function throneRoom(x2, x, w) {
    K.window(x2, x + 22, CEIL + 12, 30, 54, { seed: 3 });
    K.window(x2, x + w - 54, CEIL + 12, 30, 54, { seed: 9 });
    K.stringCourse(x2, x, FLOOR - 74, w);
    K.banner(x2, x + (w >> 1) - 38, CEIL + 6, 20, 52, 'BLOOD');
    K.banner(x2, x + (w >> 1) + 20, CEIL + 6, 20, 52, 'BLOOD');
    floorAndPillars(x2, x, w, [10, w - 24]);
    K.carpet(x2, x + (w >> 1) - 30, FLOOR, 60, 20);
    K.litStrip(x2, x + 22, FLOOR + 1, 30, 4, 'STONE');
    K.litStrip(x2, x + w - 54, FLOOR + 1, 30, 4, 'STONE');
    throne(x2, x + (w >> 1) - 23, FLOOR);
    for (const tx of [x + 62, x + w - 70]) K.torchBracket(x2, tx, FLOOR - 62);
  }

  function greatHall(x2, x, w) {
    for (let k = 0; k < 3; k++) {
      K.window(x2, x + 26 + k * 66, CEIL + 12, 30, 54, { seed: k * 5 + 1 });
    }
    K.stringCourse(x2, x, FLOOR - 74, w);
    K.tapestry(x2, x + 4, FLOOR - 66, 18, 40, 'CLOTH', 'GOLD');
    K.tapestry(x2, x + w - 24, FLOOR - 66, 18, 40, 'CLOTH', 'GOLD');
    floorAndPillars(x2, x, w, [8, w - 22]);
    K.carpet(x2, x + 30, FLOOR, w - 60, 20);
    for (let k = 0; k < 3; k++) K.litStrip(x2, x + 26 + k * 66, FLOOR + 1, 30, 4, 'STONE');
    longTable(x2, x + (w >> 1) - 58, FLOOR, 116);
    K.chandelier(x2, x + (w >> 1) - 22, CEIL + 26, 44);
    for (const tx of [x + 16, x + w - 20]) K.torchBracket(x2, tx, FLOOR - 60);
  }

  function kitchens(x2, x, w) {
    /* soot: a kitchen is the one room in a castle that is not clean */
    K.fill(x2, x, CEIL + 2, w, 30, 'INK.1');
    for (let k = 0; k < w; k += 3) {
      if (K.hash(x + k, 7) > 0.5) K.fill(x2, x + k, CEIL + 2, 2, 22 + (k % 9), 'INK.0');
    }
    floorAndPillars(x2, x, w, []);
    oven(x2, x + 16, FLOOR);
    oven(x2, x + w - 62, FLOOR);
    counter(x2, x + 74, FLOOR, 60);
    potRack(x2, x + 78, CEIL + 12, 52);
    for (let k = 0; k < 4; k++) hangingFish(x2, x + 20 + k * 12, CEIL + 14);
  }

  function balcony(x2, x, w) {
    /* the wall is open to the sea from here out */
    const ax = x + 40, aw = w - 70, ah = FLOOR - CEIL - 30;
    K.fill(x2, ax, CEIL + 10, aw, ah, 'DEEP.0');
    /* layers of water behind the arch, lightest at the top */
    for (let k = 0; k < 6; k++) {
      K.fill(x2, ax, CEIL + 10 + k * Math.round(ah / 6), aw,
             Math.round(ah / 6) + 1, 'DEEP.' + Math.max(0, 4 - k));
    }
    K.archway(x2, ax, CEIL + 10, aw, ah, { back: null, ring: 'STONE.3', keystone: true });
    /* re-paint the sea inside the arch, since archway punched it dark */
    const rows = K.archRows(aw, Math.round(aw * 0.55));
    for (let i = 0; i < ah; i++) {
      const ins = i < rows.length ? rows[i] : 0;
      const band = Math.max(0, 4 - Math.floor(i * 6 / ah));
      K.fill(x2, ax + ins, CEIL + 10 + i, aw - ins * 2, 1, 'DEEP.' + band);
    }
    floorAndPillars(x2, x, w, [10]);
    railing(x2, ax, FLOOR - 20, aw);
    for (const tx of [x + 14, x + w - 24]) K.torchBracket(x2, tx, FLOOR - 62);
    K.stringCourse(x2, x, FLOOR - 74, 36);
  }

  /* ---- furniture ---------------------------------------------------- */
  function throne(x2, x, fy) {
    /* Rebuilt twice. A stepped back read as a staircase and a pointed cap
       read as a mushroom; what makes a throne is a GOLD FRAME around a dark
       seat, tall enough to clear the man sitting in it. */
    const w = 46, h = 96;
    const ty = fy - h;
    /* the back: dark inside a gold frame, with the house mark on it */
    K.fill(x2, x - 3, ty, w + 6, h, 'GOLD.0');
    K.fill(x2, x - 2, ty + 1, w + 4, h - 1, 'GOLD.1');
    K.fill(x2, x - 2, ty + 1, w + 4, 1, 'GOLD.3');
    K.fill(x2, x + 3, ty + 5, w - 6, h - 30, 'STONE.0');
    K.fill(x2, x + 4, ty + 6, w - 8, h - 32, 'CLOTH.0');
    for (let k = 0; k < w - 10; k += 5) {              // quilting on the back
      K.fill(x2, x + 5 + k, ty + 7, 1, h - 34, 'CLOTH.1');
    }
    K.trident(x2, x + (w >> 1) - 4, ty + 14, 'GOLD');
    /* finials, one either side of a raised centre */
    for (const fx of [x - 3, x + w - 3]) {
      K.fill(x2, fx, ty - 6, 6, 7, 'GOLD.1');
      K.fill(x2, fx, ty - 6, 6, 1, 'GOLD.3');
      K.fill(x2, fx + 1, ty - 9, 4, 3, 'GOLD.2');
    }
    K.fill(x2, x + (w >> 1) - 5, ty - 12, 10, 13, 'GOLD.1');
    K.fill(x2, x + (w >> 1) - 5, ty - 12, 10, 1, 'GOLD.3');
    K.fill(x2, x + (w >> 1) - 3, ty - 16, 6, 4, 'BLOOD.1');
    K.fill(x2, x + (w >> 1) - 3, ty - 16, 6, 1, 'BLOOD.3');
    /* the seat: a red cushion on a stone plinth */
    K.fill(x2, x - 5, fy - 34, w + 10, 10, 'BLOOD.0');
    K.fill(x2, x - 4, fy - 34, w + 8, 8, 'BLOOD.1');
    K.fill(x2, x - 4, fy - 34, w + 8, 2, 'BLOOD.2');
    for (let k = 6; k < w + 4; k += 9) K.fill(x2, x - 4 + k, fy - 33, 1, 7, 'BLOOD.0');
    /* arms */
    for (const ax of [x - 7, x + w + 1]) {
      K.fill(x2, ax, fy - 44, 7, 12, 'GOLD.1');
      K.fill(x2, ax, fy - 44, 7, 2, 'GOLD.3');
      K.fill(x2, ax + 1, fy - 32, 5, 10, 'STONE.1');
    }
    /* two steps up to it, which is what a dais is for */
    K.fill(x2, x - 12, fy - 12, w + 24, 6, 'STONE.2');
    K.fill(x2, x - 12, fy - 12, w + 24, 1, 'STONE.3');
    K.fill(x2, x - 18, fy - 6, w + 36, 6, 'STONE.1');
    K.fill(x2, x - 18, fy - 6, w + 36, 1, 'STONE.3');
    K.carpet(x2, x - 8, fy - 12, w + 16, 5);
  }

  function longTable(x2, x, fy, w) {
    const ty = fy - 26;
    K.fill(x2, x, ty + 6, w, 20, 'BONE.1');          // the cloth
    K.fill(x2, x, ty + 6, w, 1, 'BONE.2');
    for (let k = 0; k < w; k += 7) K.fill(x2, x + k, ty + 6, 1, 20, 'BONE.0');
    K.fill(x2, x - 2, ty, w + 4, 6, 'WOOD.2');       // the top
    K.fill(x2, x - 2, ty, w + 4, 1, 'WOOD.3');
    K.fill(x2, x - 2, ty + 5, w + 4, 1, 'WOOD.0');
    /* plates, goblets and a candelabrum */
    for (let k = 10; k < w - 10; k += 22) {
      K.fill(x2, x + k, ty - 2, 9, 2, 'BONE.2');
      K.fill(x2, x + k + 1, ty - 3, 7, 1, 'BONE.1');
      K.fill(x2, x + k + 12, ty - 5, 3, 5, 'GOLD.2');
      K.fill(x2, x + k + 11, ty - 6, 5, 1, 'GOLD.3');
    }
    const cx = x + (w >> 1) - 5;
    K.fill(x2, cx + 4, ty - 12, 2, 12, 'GOLD.1');
    K.fill(x2, cx, ty - 12, 10, 2, 'GOLD.2');
    for (const k of [0, 4, 8]) K.fill(x2, cx + k, ty - 18, 2, 6, 'BONE.2');
    /* two chairs */
    for (const bx of [x - 14, x + w + 6]) {
      K.fill(x2, bx, fy - 22, 8, 22, 'WOOD.1');
      K.fill(x2, bx, fy - 40, 8, 20, 'WOOD.2');
      K.fill(x2, bx, fy - 40, 8, 1, 'WOOD.3');
      K.fill(x2, bx + 1, fy - 22, 6, 3, 'BLOOD.1');
    }
  }

  function counter(x2, x, fy, w) {
    K.fill(x2, x, fy - 22, w, 22, 'WOOD.1');
    K.stone(x2, x, fy - 22, w, 22, { bw: 11, bh: 8, ramp: 'STONE', mortar: 'INK.0' });
    K.fill(x2, x - 2, fy - 26, w + 4, 5, 'WOOD.2');
    K.fill(x2, x - 2, fy - 26, w + 4, 1, 'WOOD.3');
    /* a chopping board, a fish and a very large knife */
    K.fill(x2, x + 8, fy - 30, 20, 4, 'WOOD.3');
    K.fill(x2, x + 11, fy - 33, 14, 3, 'BONE.1');
    K.fill(x2, x + 10, fy - 32, 2, 1, 'INK.0');
    K.fill(x2, x + 34, fy - 33, 14, 2, 'BONE.2');
    K.fill(x2, x + 46, fy - 34, 4, 4, 'WOOD.0');
  }

  function potRack(x2, x, y, w) {
    K.fill(x2, x, y, w, 2, 'RUST.1');
    K.fill(x2, x, y, w, 1, 'RUST.2');
    for (let k = 4; k < w - 6; k += 13) {
      K.fill(x2, x + k + 3, y + 2, 1, 4, 'RUST.0');
      K.fill(x2, x + k, y + 6, 8, 7, 'STONE.1');
      K.fill(x2, x + k, y + 6, 8, 1, 'STONE.3');
      K.fill(x2, x + k + 1, y + 12, 6, 1, 'INK.0');
    }
  }

  function hangingFish(x2, x, y) {
    K.fill(x2, x, y, 1, 6, 'INK.2');
    K.fill(x2, x - 2, y + 6, 5, 10, 'WATER.1');
    K.fill(x2, x - 2, y + 6, 5, 1, 'WATER.2');
    K.fill(x2, x - 1, y + 16, 3, 3, 'WATER.0');
    K.fill(x2, x - 1, y + 8, 1, 1, 'INK.0');
  }

  function railing(x2, x, y, w) {
    K.fill(x2, x, y, w, 3, 'STONE.2');
    K.fill(x2, x, y, w, 1, 'STONE.3');
    K.fill(x2, x, y + 17, w, 3, 'STONE.1');
    for (let k = 3; k < w - 4; k += 8) {
      K.fill(x2, x + k, y + 3, 4, 14, 'STONE.1');
      K.fill(x2, x + k, y + 3, 1, 14, 'STONE.3');
      K.fill(x2, x + k + 1, y + 7, 2, 6, 'STONE.2');
    }
  }

  function oven(x2, x, fy) {
    const w = 46, h = 58;
    K.stone(x2, x, fy - h, w, h, { bw: 9, bh: 6, ramp: 'RUST', mortar: 'INK.0' });
    K.archway(x2, x + 10, fy - 34, 26, 34, { back: 'INK.0', ring: 'RUST.2' });
    /* embers, baked; the flame licks are drawn live */
    for (let i = 0; i < 10; i++) {
      const ww = 22 - Math.abs(i - 5) * 2;
      K.fill(x2, x + 12 + ((22 - ww) >> 1), fy - 10 + (i >> 2), ww, 1,
             i < 4 ? 'BLOOD.3' : (i < 7 ? 'BLOOD.2' : 'BLOOD.1'));
    }
    K.fill(x2, x - 2, fy - h - 4, w + 4, 5, 'STONE.1');
    K.fill(x2, x - 2, fy - h - 4, w + 4, 1, 'STONE.3');
    /* a chimney going up through the ceiling */
    K.fill(x2, x + 14, CEIL, 18, fy - h - 4 - CEIL, 'STONE.0');
    K.fill(x2, x + 14, CEIL, 2, fy - h - 4 - CEIL, 'STONE.1');
  }

  /* ================================================================
     COLLISION - a floor, two ends, and the wall columns
     ================================================================ */
  function blockedAt(x, y) {
    if (x < 12 || x > CW - 12) return true;
    for (let i = 1; i < ROOMS.length; i++) {
      const wx = ROOMS[i].x;
      if (Math.abs(x - wx) > (WALLW >> 1) + 3) continue;
      /* the doorway is a gap; anything above it is wall */
      if (y > FLOOR - DOORH + 6) return false;
      return true;
    }
    return false;
  }

  function roomAt(x) {
    for (let i = ROOMS.length - 1; i >= 0; i--) if (x >= ROOMS[i].x) return i;
    return 0;
  }

  /* ================================================================
     ENTER / UPDATE
     ================================================================ */
  function enter() {
    if (!baked) bake();
    A1.load();
    P.x = A1.A.beat === 0 ? 120 : P.x || 120;
    P.y = FLOOR; P.vx = 0; P.vy = 0; P.hp = 5;
    mobs = []; thrown = []; talk = null; mini = null; arc = null; sparks.length = 0;
    goTo = null; goWhat = null; goT = 0;
    shownRoom = -1; roomT = 0;
    snapCam();
  }

  function snapCam() {
    cam.x = Math.max(0, Math.min(CW - KD.W, Math.round(P.x - KD.W / 2)));
    cam.y = Math.max(0, Math.min(CH - KD.H, Math.round(FLOOR - KD.H * 0.72)));
  }

  function update(dt) {
    t += dt;
    if (mini) { updateMini(dt); return; }
    if (talk) { updateTalk(dt); return; }

    tapTarget();
    /* ---- movement ------------------------------------------------- */
    const s = KD.In.stick();
    let want = Math.abs(s.x) > 0.2 ? Math.sign(s.x) : 0;
    if (want) { goTo = null; goWhat = null; }        // the stick always wins
    if (goTo !== null) {
      const d = goTo - P.x;
      if (Math.abs(d) < 7) {
        /* arrived: if he was walking TO something, do the thing */
        const what = goWhat;
        goTo = null; goWhat = null;
        if (what) interact();
      } else {
        want = Math.sign(d);
        goT += dt;
        if (goT > 8) { goTo = null; goWhat = null; }  // gave up; wall in the way
      }
    }
    P.vx += (want * SPD - P.vx) * Math.min(1, ACC * dt / SPD);
    if (!want) P.vx *= Math.pow(0.02, dt);
    if (want) P.face = want;
    if (P.ground && (KD.In.isHit('Space', 'KeyW', 'ArrowUp') || KD.In.actHit('jump'))) {
      P.vy = -JUMP; P.ground = false;
      if (KD.Sfx) KD.Sfx.play('jump');
    }
    P.vy += GRAV * dt;

    /* walk the move so he cannot tunnel through a wall column */
    const steps = Math.max(1, Math.ceil(Math.abs(P.vx * dt) / 3));
    for (let i = 0; i < steps; i++) {
      const nx = P.x + P.vx * dt / steps;
      if (blockedAt(nx + Math.sign(P.vx) * 5, P.y - 20)) { P.vx = 0; break; }
      P.x = nx;
    }
    P.y += P.vy * dt;
    if (P.y >= FLOOR) { P.y = FLOOR; P.vy = 0; P.ground = true; }
    P.x = Math.max(16, Math.min(CW - 16, P.x));
    P.anim += dt;
    if (P.atk > 0) P.atk -= dt;
    if (P.hurt > 0) P.hurt -= dt;

    /* ---- camera, with a soft follow ------------------------------- */
    const tx = Math.max(0, Math.min(CW - KD.W, P.x - KD.W / 2));
    cam.x += (tx - cam.x) * Math.min(1, dt * 7);
    cam.y = Math.max(0, Math.min(CH - KD.H, Math.round(FLOOR - KD.H * 0.72)));

    /* ---- room banner --------------------------------------------- */
    const rm = roomAt(P.x);
    if (rm !== shownRoom) { shownRoom = rm; roomT = 2.6; }
    if (roomT > 0) roomT -= dt;

    /* ---- attack --------------------------------------------------- */
    if (KD.In.actHit('hit', 'KeyF') || KD.In.mouse.rclick) {
      if (P.plate > 0) throwPlate(); else swing();
    }
    /* ---- interact ------------------------------------------------- */
    if (KD.In.actHit('use', 'KeyE')) interact();

    beatLogic(dt);
    updateArc(dt);
    updateSparks(dt);
    for (const m of mobs) updateShark(m, dt);
    mobs = mobs.filter((m) => m.hp > 0 || m.death > 0);
    updateThrown(dt);
  }

  /* A tap on the world means "go there". A tap ON somebody means "go there
     and talk to them", which is the half that makes it feel like a game and
     not a joystick: on a phone you should be able to point at the queen. */
  function tapTarget() {
    if (!KD.In.mouse.click || KD.UI.blocked()) return;
    KD.In.consumedClick();
    if (talk || mini) return;
    /* mouse.x/y are already in buffer space - Screen.toBuf does the scaling
       when the event lands, so dividing by cssScale here would halve it */
    const wx = cam.x + KD.In.mouse.x;
    const wy = cam.y + KD.In.mouse.y;
    if (wy < CEIL || wy > FLOOR + 30) return;        // ceiling and cellar are not floor
    goT = 0;
    /* did they point at somebody? */
    for (const e of castHere()) {
      if (Math.abs(e.c.x - wx) < 26) { goTo = e.c.x + (e.c.x > P.x ? -20 : 20); goWhat = e.id; return; }
    }
    /* the long table and the throne are things you interact with too */
    const hall = ROOMS[1], thr = ROOMS[0];
    const b = A1.beat();
    if ((b.kind === 'use' || b.kind === 'throw') &&
        Math.abs(wx - (hall.x + (hall.w >> 1))) < 70) {
      goTo = hall.x + (hall.w >> 1); goWhat = 'table'; return;
    }
    if (b.kind === 'cine' && Math.abs(wx - (thr.x + (thr.w >> 1))) < 50) {
      goTo = thr.x + (thr.w >> 1); goWhat = 'throne'; return;
    }
    goTo = Math.max(18, Math.min(CW - 18, wx));
    goWhat = null;
  }

  /* A swing is an ARC that lives for a fifth of a second, not an instant
     test. Keeping it around means the hit can be drawn, the shark can be
     knocked out of a lunge by it, and the timing has some width - an
     instantaneous check felt like the trident was not connected to anything. */
  let arc = null;
  function swing() {
    if (P.atk > 0) return;
    /* Face whatever is closest. Swinging the wrong way because you happened
       to be walking left is not an interesting way to lose. */
    const tg = target();
    if (tg) P.face = tg.x >= P.x ? 1 : -1;
    P.atk = 0.34;
    arc = { t: 0.2, face: P.face, x: P.x, y: P.y - 26, hits: [] };
    if (KD.Juice) KD.Juice.pop('swing', 0.2);
    if (KD.Sfx) KD.Sfx.play('swing');
  }

  /* ---- the fight prompt ---------------------------------------------
     A big obvious STRIKE button that only exists when something is trying
     to bite you, with the nearest shark called out and the button turning
     green the moment that shark is open. The idea is that you should be able
     to win this fight by watching one button.
     ------------------------------------------------------------------ */
  function target() {
    let best = null, bd = 240;
    for (const m of mobs) {
      if (m.hp <= 0 || m.death > 0) continue;
      const d = Math.hypot(m.x - P.x, m.y - (P.y - 26));
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  const inFight = () => !!target();

  const REACH = 46, ARC_H = 34;
  function updateArc(dt) {
    if (!arc) return;
    arc.t -= dt;
    if (arc.t <= 0) { arc = null; return; }
    for (const m of mobs) {
      if (m.hp <= 0 || arc.hits.indexOf(m) >= 0) continue;
      const dx = (m.x - arc.x) * arc.face;
      if (dx > -8 && dx < REACH && Math.abs(m.y - arc.y) < ARC_H) {
        arc.hits.push(m);
        /* A shark caught in its recovery takes double. That is the whole
           fight: bait the lunge, step aside, hit it while it is turning. */
        const open = m.state === 'recover';
        m.hp -= open ? 4 : 2;
        m.kb = arc.face * (open ? 220 : 120);
        m.flash = 0.2;
        m.state = 'recover'; m.st = Math.max(m.st, 0.5);
        if (KD.Juice) KD.Juice.hit(open ? 0.24 : 0.14);
        if (KD.Fx) KD.Fx.bubbles(m.x, m.y, open ? 8 : 4);
        spark(m.x, m.y, open);
        if (m.hp <= 0) {
          m.death = 0.7; m.spin = 0;
          A1.A.sharks++;
          if (KD.Fx) KD.Fx.bubbles(m.x, m.y, 14);
          if (KD.Juice) KD.Juice.hit(0.3);
        }
      }
    }
  }

  /* hit sparks, so a landed blow is visible without a damage number */
  const sparks = [];
  function spark(x, y, big) {
    for (let i = 0; i < (big ? 12 : 7); i++) {
      const a = i * 0.9 + (big ? 0.3 : 0);
      sparks.push({ x: x, y: y, vx: Math.cos(a) * (big ? 130 : 80),
                    vy: Math.sin(a) * (big ? 100 : 60), t: big ? 0.4 : 0.26,
                    col: big ? 'GOLD.3' : 'BONE.2' });
    }
  }
  function updateSparks(dt) {
    for (const s2 of sparks) { s2.t -= dt; s2.x += s2.vx * dt; s2.y += s2.vy * dt; s2.vy += 90 * dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t <= 0) sparks.splice(i, 1);
  }

  /* ================================================================
     THE CAST
     ================================================================ */
  function castHere() {
    const out = [];
    for (const id in A1.CAST) {
      const c = A1.CAST[id];
      if (id === 'keg' && A1.A.beat < 4) continue;   // she arrives by text
      out.push({ id, c });
    }
    return out;
  }

  function nearCast() {
    for (const e of castHere()) {
      if (Math.abs(e.c.x - P.x) < 26) return e;
    }
    return null;
  }

  function interact() {
    const b = A1.beat();
    const near = nearCast();
    /* the long table: sit and eat */
    if (b.kind === 'use' && b.target === 'table' && insideRoom(1) &&
        Math.abs(P.x - (ROOMS[1].x + (ROOMS[1].w >> 1))) < 70) {
      /* the dinner is its own scene now, not a dialogue box */
      KD.Game.go('dinner', {});
      return;
    }
    /* pick a plate up off the table for the cook */
    if (b.kind === 'throw' && insideRoom(1) &&
        Math.abs(P.x - (ROOMS[1].x + (ROOMS[1].w >> 1))) < 70) {
      P.plate = Math.min(3, P.plate + 1);
      return;
    }
    if (near) {
      if (b.kind === 'talk' && b.who === near.id) {
        startTalk(b.lines, () => A1.advance());
      } else if (b.kind === 'mini' && near.id === 'keg') {
        startTalk(b.lines || [['keg', 'Come here.']], () => startMini(b.mini));
      } else {
        startTalk([[near.id, idleLine(near.id)]], null);
      }
      return;
    }
    /* the throne, for the text message beat */
    if (b.kind === 'cine' && insideRoom(0) &&
        Math.abs(P.x - (ROOMS[0].x + (ROOMS[0].w >> 1))) < 40) {
      playCine(b.cine);
    }
    if (b.kind === 'cine' && b.room !== undefined && insideRoom(b.room)) playCine(b.cine);
  }

  const insideRoom = (i) => roomAt(P.x) === i;

  const IDLE = {
    queen: ['You are quiet tonight.', 'The candles are lit. They have been for a while.'],
    deep:  ['Kitchen is closed.', 'I am reducing something. Go away.'],
    keg:   ['You read my message, then.', 'Nobody has to know.']
  };
  const idleLine = (id) => IDLE[id][Math.floor(t * 0.4) % IDLE[id].length];

  /* ================================================================
     TALK
     ================================================================ */
  function startTalk(lines, after) {
    talk = { lines: lines, i: 0, ch: 0, after: after || null };
  }
  function updateTalk(dt) {
    const L = talk.lines[talk.i];
    if (!L) { endTalk(); return; }
    talk.ch += dt * 44;
    const full = talk.ch >= L[1].length;
    const tapped = KD.In.mouse.click && !KD.UI.blocked();
    if (tapped) KD.In.consumedClick();
    if (KD.In.actHit('use', 'KeyE') || KD.In.isHit('Space', 'Enter') || tapped) {
      if (!full) { talk.ch = L[1].length; return; }
      talk.i++;
      talk.ch = 0;
      if (talk.i >= talk.lines.length) endTalk();
    }
  }
  function endTalk() {
    const after = talk.after;
    talk = null;
    if (after) after();
  }

  function speaker(id) {
    if (id === 'king') return { name: 'You', portrait: 'po_king' };
    const c = A1.CAST[id];
    return c ? { name: c.name, portrait: c.portrait } : { name: '', portrait: null };
  }

  /* ================================================================
     BEAT LOGIC - spawning sharks, throwing plates, gating cutscenes
     ================================================================ */
  function beatLogic(dt) {
    const b = A1.beat();
    if (b.kind === 'kill') {
      if (A1.A.sharks >= (b.n || 3)) { A1.A.sharks = 0; A1.advance(); return; }
      spawnT -= dt;
      if (spawnT <= 0 && mobs.length < 2 && insideRoom(3)) {
        spawnT = 2.6;
        const r = ROOMS[3];
        mobs.push({ x: r.x + r.w - 24, y: FLOOR - 50 - (mobs.length * 24 % 44),
                    vx: -40, vy: 0, hp: 6, face: -1, flash: 0, kb: 0, death: 0,
                    spin: 0, ph: Math.random() * 6,
                    state: 'swim', st: 0.9 + Math.random(), side: mobs.length ? -1 : 1,
                    aimX: -1, aimY: 0, max: 6 });
      }
    }
    if (b.kind === 'throw' && A1.A.thrown >= (b.need || 1)) {
      A1.A.thrown = 0;
      startTalk(b.lines, () => A1.advance());
    }
  }

  /* A shark with a state machine instead of a homing dot. It circles, it
     WINDS UP where you can see it, it commits to a lunge in a straight line,
     and then it is slow and open while it turns around. That last state is
     the fight: without it there is nothing to do but stand still and mash. */
  function updateShark(m, dt) {
    if (m.death > 0) {
      m.death -= dt; m.y -= dt * 10; m.spin += dt * 9; m.x += m.kb * dt;
      m.kb *= Math.pow(0.05, dt);
      return;
    }
    if (m.flash > 0) m.flash -= dt;
    m.st -= dt;
    const dx = P.x - m.x, dy = (P.y - 26) - m.y;
    const l = Math.max(1, Math.hypot(dx, dy));

    if (m.state === 'swim') {
      /* keep station off his shoulder rather than sitting on top of him */
      const want = P.x - m.side * 62;
      m.vx += ((want - m.x) * 1.6 - m.vx) * dt * 3;
      m.vx = Math.max(-70, Math.min(70, m.vx));
      m.y += ((P.y - 34 + Math.sin(t * 1.6 + m.ph) * 14) - m.y) * dt * 1.6;
      m.face = m.vx < -2 ? -1 : (m.vx > 2 ? 1 : m.face);
      if (m.st <= 0 && Math.abs(dx) < 110) { m.state = 'wind'; m.st = 0.55; }
    } else if (m.state === 'wind') {
      /* it stops dead and lines up. This is the tell. */
      m.vx *= Math.pow(0.02, dt);
      m.face = dx < 0 ? -1 : 1;
      m.aimX = dx / l; m.aimY = dy / l;
      if (m.st <= 0) {
        m.state = 'lunge'; m.st = 0.42;
        m.vx = m.aimX * 300; m.vy = m.aimY * 220;
        if (KD.Sfx) KD.Sfx.play('swing');
      }
    } else if (m.state === 'lunge') {
      m.x += m.vx * dt; m.y += m.vy * dt;
      m.vx *= Math.pow(0.5, dt); m.vy *= Math.pow(0.5, dt);
      if (m.st <= 0) { m.state = 'recover'; m.st = 0.75; m.side = -m.side; }
    } else {                                   /* recover: slow, and open */
      m.vx *= Math.pow(0.1, dt);
      m.y += Math.sin(t * 3 + m.ph) * 10 * dt;
      if (m.st <= 0) { m.state = 'swim'; m.st = 0.7 + Math.random() * 0.8; }
    }
    if (m.state !== 'lunge') m.x += (m.vx + m.kb) * dt;
    m.kb *= Math.pow(0.02, dt);
    m.y = Math.max(CEIL + 26, Math.min(FLOOR - 10, m.y));
    m.x = Math.max(ROOMS[3].x - 40, Math.min(CW - 20, m.x));

    /* it only bites during the lunge, so being near one is not a death */
    if (m.state === 'lunge' && Math.abs(dx) < 20 && Math.abs(dy) < 22 && P.hurt <= 0) {
      P.hurt = 1.1; P.hp--; P.vx = -Math.sign(dx || 1) * 150; P.vy = -60;
      m.state = 'recover'; m.st = 0.8;
      if (KD.Juice) KD.Juice.hit(0.26);
      if (KD.Sfx) KD.Sfx.play('hurt');
      if (P.hp <= 0) {
        P.hp = 5; P.x = ROOMS[3].x + 40; P.hurt = 1.6;
        for (const k of mobs) { k.state = 'swim'; k.st = 1.4; }
      }
    }
  }

  function updateThrown(dt) {
    for (const p of thrown) {
      p.x += p.vx * dt; p.vy += 320 * dt; p.y += p.vy * dt; p.spin += dt * 14;
      const d = A1.CAST.deep;
      if (Math.abs(p.x - d.x) < 20 && Math.abs(p.y - (FLOOR - 30)) < 34) {
        p.dead = true; A1.A.thrown++;
        if (KD.Fx) KD.Fx.bubbles(p.x, p.y, 6);
        if (KD.Juice) KD.Juice.hit(0.12);
      }
      if (p.y > FLOOR) p.dead = true;
    }
    thrown = thrown.filter((p) => !p.dead);
  }

  function throwPlate() {
    if (P.plate <= 0) return;
    P.plate--;
    thrown.push({ x: P.x + P.face * 10, y: P.y - 34, vx: P.face * 150,
                  vy: -60, spin: 0, dead: false });
    if (KD.Sfx) KD.Sfx.play('swing');
  }

  /* ================================================================
     MINIGAMES
     ================================================================ */
  function startMini(kind) {
    mini = kind === 'beer'
      ? { kind: 'beer', fill: 0, target: 0.72, band: 0.1, tries: 3, msg: '', done: 0 }
      : { kind: 'kiss', beat: 0, n: 0, want: 0, hit: 0, msg: '', done: 0, tt: 0 };
  }

  function updateMini(dt) {
    mini.tt = (mini.tt || 0) + dt;
    if (mini.done > 0) {
      mini.done -= dt;
      if (mini.done <= 0) { mini = null; A1.advance(); }
      return;
    }
    const tapped = KD.In.mouse.click && !KD.UI.blocked();
    if (tapped) KD.In.consumedClick();
    const press = KD.In.actHit('use', 'KeyE') || KD.In.isHit('Space') || tapped;
    if (mini.kind === 'beer') {
      /* hold to pour, let go in the band. Overfill and it goes everywhere. */
      const hold = KD.In.act('use', 'KeyE') || KD.In.isDown('Space') || KD.In.mouse.down;
      if (hold) mini.fill += dt * 0.62;
      if (mini.fill > 1.12) {
        mini.msg = 'ALL OVER THE FLOOR'; mini.tries--; mini.fill = 0;
        if (mini.tries <= 0) { mini.msg = 'GOOD ENOUGH'; A1.gain(6); mini.done = 1.2; }
        return;
      }
      if (!hold && mini.fill > 0.05) {
        const ok = Math.abs(mini.fill - mini.target) < mini.band;
        if (ok) {
          A1.A.drinks++; A1.gain(5);
          mini.msg = 'PERFECT POUR'; mini.done = 1.1;
        } else {
          mini.msg = mini.fill < mini.target ? 'TOO LITTLE' : 'TOO MUCH';
          mini.tries--; mini.fill = 0;
          if (mini.tries <= 0) { mini.msg = 'GOOD ENOUGH'; A1.gain(6); mini.done = 1.2; }
        }
      }
    } else {
      /* a rhythm of three: press when the heart is full */
      mini.beat += dt * 1.6;
      const ph = mini.beat % 1;
      if (press) {
        if (ph > 0.62 && ph < 0.88) {
          mini.n++; mini.hit = 0.3; A1.A.kisses++; A1.gain(4);
          mini.msg = ['SHE LAUGHS', 'YOU FORGET THE TIME', 'YOU FORGET HER NAME'][Math.min(2, mini.n - 1)];
        } else { mini.msg = 'TOO EARLY'; mini.hit = 0; }
        if (mini.n >= 3) mini.done = 1.4;
      }
    }
  }

  /* ================================================================
     CUTSCENES
     ================================================================ */
  /* A cutscene is its own scene in this engine, so playing one means
     leaving the castle and coming back. The `after` both advances the beat
     and walks us back in. */
  function playCine(id) {
    const beats = CINE[id];
    if (!beats) { A1.advance(); return; }
    const back = P.x;
    KD.Game.go('cine', { scene: { id: id, beats: beats, after: () => {
      A1.advance();
      P.x = back;
      /* the last beat is the one that ends the act: from there the manta
         takes him to the village and the rest of the game begins */
      if (A1.done) { handOff(); return; }
      KD.Game.go('castle');
    } } });
  }

  /* The weight Act One put on him is applied by scenes/gen once the world
     exists - gen's enter() calls State.fresh(), which would reset anything
     written here. All this has to do is make sure the act is saved before we
     leave it. */
  function handOff() {
    A1.save();
    KD.Game.go('gen', {});
  }

  const CINE = {
    a1_text: [
      { kind: 'card', world: false, t: 2.4, vig: 0.6,
        lines: ['A LIGHT UNDER THE THRONE'],
        sub: 'something buzzing where nothing should be' },
      { kind: 'art', world: false, spr: 'po_keg', scale: 2, y: 0.40, t: 0.1 },
      { kind: 'say', world: false, who: 'po_keg', name: 'The Keg', t: 3.0,
        text: 'hey. u up' },
      { kind: 'say', world: false, who: 'po_king', name: 'You', t: 2.6,
        text: 'who is this' },
      { kind: 'say', world: false, who: 'po_keg', name: 'The Keg', t: 4.4,
        text: 'someone who does not ask u to sit still at a long table with candles on it' },
      { kind: 'shake', world: false, amp: 4, t: 0.4 },
      { kind: 'card', world: false, t: 2.6, lines: ['HE PUT THE TRIDENT DOWN'],
        sub: 'and did not pick it up for four seasons' }
    ],
    a1_fall: [
      { kind: 'card', world: false, t: 2.6, vig: 0.7, lines: ['FOUR SEASONS LATER'],
        sub: 'the candles on the long table had been out for most of it' },
      { kind: 'two', world: false, l: 'po_queen', r: 'po_king', t: 3.4,
        text: 'She had already had the chairs taken away.' },
      { kind: 'say', world: false, who: 'po_queen', name: 'Coralene', t: 4.4,
        text: 'I waited at that table until the wax ran onto the floor. Then I stopped waiting.' },
      { kind: 'say', world: false, who: 'po_king', name: 'You', t: 3.0,
        text: 'I can fix it. Give me one tide.' },
      { kind: 'say', world: false, who: 'po_queen', name: 'Coralene', t: 4.2,
        text: 'You are not the man on the banner any more. You are not even the man in the doorway.' },
      { kind: 'fade', world: false, to: 1, t: 0.8 },
      { kind: 'card', world: false, t: 2.4, lines: ['AND THEN THE KEG LEFT TOO'] },
      { kind: 'say', world: false, who: 'po_keg', name: 'The Keg', t: 4.0,
        text: 'u were fun when u were a king. u are not a king.' },
      { kind: 'rumble', world: false, amp: 4, t: 1.4, vig: 1 },
      { kind: 'card', world: false, t: 2.8, vig: 1,
        lines: ['THE KITCHENS CAME UP THE STAIRS'] },
      { kind: 'art', world: false, spr: 'po_deep', scale: 2, y: 0.42, t: 0.1, vig: 1 },
      { kind: 'say', world: false, who: 'po_deep', name: 'The Deep', t: 4.2, vig: 1,
        text: 'I said one day this kitchen would be the whole castle. It is that day, majesty.' },
      { kind: 'shake', world: false, amp: 10, t: 0.4 },
      { kind: 'flash', world: false, col: 'BLOOD.3', t: 0.4 },
      { kind: 'card', world: false, t: 3.0, vig: 1,
        lines: ['THEY THREW HIM OUT OF HIS OWN GATE'],
        sub: 'and the current took him where it liked' },
      { kind: 'art', world: false, spr: 'po_santa', scale: 2, y: 0.40, t: 0.1 },
      { kind: 'say', world: false, who: 'po_santa', name: 'Santa the Manta', t: 4.4,
        text: 'Found you face down in the sand, big fella. Come on. I know a village.' },
      { kind: 'fade', world: false, to: 1, t: 1.0 }
    ]
  };

  /* ================================================================
     DRAW
     ================================================================ */
  function draw(ctx) {
    KD.Screen.clear('INK.0');
    /* the castle, one blit */
    ctx.drawImage(baked, Math.round(cam.x), Math.round(cam.y),
                  Math.min(KD.W, CW - cam.x), Math.min(KD.H, CH - cam.y),
                  0, 0, Math.min(KD.W, CW - cam.x), Math.min(KD.H, CH - cam.y));

    /* live: fire, candles, the sea moving through the arch */
    liveDetail(ctx);

    /* where the tap sent him */
    if (goTo !== null) {
      const gx = Math.round(goTo - cam.x), gy = Math.round(FLOOR - cam.y);
      const bob = Math.round(Math.sin(t * 6) * 2);
      for (let k = 0; k < 3; k++) {
        KD.Screen.rect(gx - 4 + k, gy - 16 - k * 2 + bob, 9 - k * 2, 2, 'GOLD.3');
      }
      KD.Screen.rect(gx - 6, gy - 2, 13, 2, 'GOLD.2');
      KD.Screen.rect(gx - 3, gy - 4, 7, 2, 'GOLD.1');
    }
    /* the cast */
    for (const e of castHere()) drawCast(ctx, e);
    for (const m of mobs) drawShark(ctx, m);
    drawArc(ctx);
    drawSparks();
    for (const p of thrown) drawPlate(ctx, p);
    drawKing(ctx);

    /* UI */
    if (roomT > 0) roomBanner();
    hud();
    if (talk) {
      const L = talk.lines[talk.i];
      if (L) KD.Talk.panel(speaker(L[0]), L[1].slice(0, Math.floor(talk.ch)), {});
    }
    if (mini) drawMini();
    if (KD.touch) {
      layoutButtons();
      KD.In.buttons(BTNS);
      /* This was missing: buttons() only registers them for hit-testing.
         Without touchPad() the whole phone control layout was invisible. */
      KD.UI.touchPad(BTNS);
    }
    combatPrompt();
  }

  function liveDetail(ctx) {
    const sx = (wx) => Math.round(wx - cam.x), sy = (wy) => Math.round(wy - cam.y);
    /* torches */
    const TORCH = [[70, 0], [136, 0], [226, 1], [440, 1], [678, 3], [878, 3]];
    for (const [wx, rm] of TORCH) {
      const x = sx(wx), y = sy(FLOOR - 66);
      if (x < -12 || x > KD.W + 12) continue;
      K.flame(ctx, x + 1, y, t, wx);
      /* pool of light on the wall behind it */
      for (let i = 0; i < 5; i++) {
        K.fill(ctx, x - 4 - i, y - 6 + i, 10 + i * 2, 1, 'GOLD.0');
      }
    }
    /* the candelabrum and the chandelier in the hall */
    const hall = ROOMS[1];
    K.candles(ctx, sx(hall.x + (hall.w >> 1) - 22), sy(CEIL + 26), 44, t);
    K.candles(ctx, sx(hall.x + (hall.w >> 1) - 5), sy(FLOOR - 44), 10, t * 1.3);
    /* oven fire */
    for (const ox of [ROOMS[2].x + 16, ROOMS[2].x + ROOMS[2].w - 62]) {
      for (let i = 0; i < 3; i++) K.flame(ctx, sx(ox + 16 + i * 7), sy(FLOOR - 10), t * 1.4, ox + i);
    }
    /* the sea through the balcony arch: three drifting bands and some motes */
    const b = ROOMS[3], ax = b.x + 40, aw = b.w - 70, ah = FLOOR - CEIL - 30;
    for (let k = 0; k < 3; k++) {
      const yy = CEIL + 18 + ((t * (7 + k * 4) + k * 30) % (ah - 20));
      const rows = K.archRows(aw, Math.round(aw * 0.55));
      const i = Math.round(yy - CEIL - 10);
      const ins = i >= 0 && i < rows.length ? rows[i] : 0;
      K.fill(ctx, sx(ax + ins + 4), sy(yy), aw - ins * 2 - 8, 1, 'DEEP.4');
    }
    for (let k = 0; k < 14; k++) {
      const px = ax + 8 + ((k * 37 + t * 6) % (aw - 16));
      const py = CEIL + 16 + ((k * 53 + t * 9) % (ah - 12));
      K.fill(ctx, sx(px), sy(py), 1, 1, 'WATER.2');
    }
  }

  function drawCast(ctx, e) {
    const c = e.c;
    const x = Math.round(c.x - cam.x), y = Math.round(FLOOR - cam.y);
    if (x < -40 || x > KD.W + 40) return;
    const nm = KD.PX.frameOf ? KD.PX.frameOf(c.sprite, t) : null;
    const name = nm && KD.PX.has(nm) ? nm : (KD.PX.has(c.sprite + '0') ? c.sprite + '0' : null);
    if (name) KD.PX.blit(ctx, name, x, y, { flipX: c.x > P.x ? true : false });
    /* a marker over whoever the current beat wants */
    const b = A1.beat();
    if ((b.who === e.id) && !talk) {
      const bob = Math.round(Math.sin(t * 4) * 2);
      KD.Screen.rect(x - 1, y - 68 + bob, 3, 8, 'GOLD.3');
      KD.Screen.rect(x - 3, y - 62 + bob, 7, 2, 'GOLD.3');
    }
    if (Math.abs(c.x - P.x) < 26 && !talk && !mini) {
      KD.Text.draw('E', x, y - 74, 'GOLD.3', { align: 'center', shadow: 'INK.0', tiny: true });
    }
  }

  function drawKing(ctx) {
    const x = Math.round(P.x - cam.x), y = Math.round(P.y - cam.y);
    let anim = 'kp_idle';
    if (P.atk > 0) anim = 'kp_thrust';
    else if (!P.ground) anim = 'kp_walk';
    else if (Math.abs(P.vx) > 8) anim = 'kp_walk';
    const nm = KD.PX.frameOf(anim, P.anim);
    if (nm && KD.PX.has(nm)) {
      KD.PX.blit(ctx, nm, x, y, { flipX: P.face < 0, shade: P.hurt > 0 && ((P.hurt * 20) | 0) % 2 ? 3 : 0 });
    }
    if (P.plate > 0) {
      for (let i = 0; i < P.plate; i++) {
        KD.Screen.rect(x - 5 - P.face * 14, y - 46 - i * 3, 10, 2, 'BONE.2');
      }
    }
  }

  function drawShark(ctx, m) {
    const x = Math.round(m.x - cam.x), y = Math.round(m.y - cam.y);
    /* the WIND-UP tell: it stops, the jaw opens, and a line of chevrons runs
       out along the path it is about to take. You should be able to see the
       lunge coming from across the room. */
    if (m.state === 'wind') {
      const k = 1 - Math.max(0, m.st) / 0.55;
      for (let i2 = 1; i2 <= 5; i2++) {
        if (i2 / 5 > k + 0.2) break;
        const px = Math.round(x + m.aimX * i2 * 15), py = Math.round(y + m.aimY * i2 * 15);
        const c = i2 > 3 ? 'BLOOD.3' : 'BLOOD.2';
        KD.Screen.rect(px - 2, py - 3, 2, 6, c);
        KD.Screen.rect(px, py - 1, 2, 2, c);
      }
      /* and a ring of ticks round it, brightening as it commits */
      const r = 16 + Math.round(k * 4);
      for (let a = 0; a < 8; a++) {
        const ang = a * 0.785 + t * 2;
        KD.Screen.rect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r * 0.7),
                       2, 2, k > 0.65 ? 'BLOOD.3' : 'BLOOD.1');
      }
    }
    /* open and slow: say so, because this is the window to hit it */
    if (m.state === 'recover' && m.death <= 0) {
      const p2 = ((t * 6) | 0) % 2;
      if (p2) {
        KD.Screen.rect(x - 20, y - 14, 40, 1, 'KELP.2');
        KD.Screen.rect(x - 20, y + 13, 40, 1, 'KELP.2');
      }
    }
    const jaw = (m.state === 'wind' || m.state === 'lunge');
    const nm = jaw ? 'sk_bite' : KD.PX.frameOf('sk_swim', t * 1.4 + m.ph);
    if (nm && KD.PX.has(nm)) {
      /* the sprite is drawn facing right, so flipX is what makes it face
         LEFT - inverted, both sharks swam at him backwards */
      const o = { flipX: m.face < 0, shade: m.flash > 0 ? 5 : 0 };
      if (m.death > 0) { o.shade = 3; o.dh = Math.max(4, Math.round(20 * (m.death / 0.7))); }
      KD.PX.blit(ctx, nm, x, y, o);
    } else {
      KD.Screen.rect(x - 14, y - 5, 28, 10, m.flash > 0 ? 'BONE.2' : 'STONE.1');
    }
    /* a health pip bar, only once it has been hit */
    if (m.death <= 0 && m.hp < m.max) {
      const w = 22;
      KD.Screen.rect(x - (w >> 1) - 1, y - 20, w + 2, 4, 'INK.0');
      KD.Screen.rect(x - (w >> 1), y - 19, Math.round(w * Math.max(0, m.hp) / m.max), 2, 'BLOOD.2');
    }
  }

  /* The trident arc. Thin blades read as three sticks, so this is a solid
     sweep with a bright leading edge and a wake behind it - a swing has to be
     visible at a glance or the fight feels like nothing is happening. */
  function drawArc(ctx) {
    if (!arc) return;
    const k = 1 - arc.t / 0.2;
    const x = Math.round(P.x - cam.x), y = Math.round(P.y - cam.y - 26);
    const f = arc.face;
    const len = Math.round(REACH * Math.min(1, k * 2.2));
    const x0 = f > 0 ? x + 5 : x - 5 - len;
    /* the wake: a wedge widening away from him */
    for (let i2 = 0; i2 < len; i2++) {
      const p2 = i2 / len;
      const hh = Math.round(6 + p2 * ARC_H * 0.72);
      const col = p2 > 0.82 ? 'WHITE' : (p2 > 0.5 ? 'BONE.2' : 'WATER.3');
      const px = f > 0 ? x0 + i2 : x0 + (len - 1 - i2);
      KD.Screen.rect(px, y - hh, 1, hh * 2, col);
    }
    /* three prong lines through it, so it is a TRIDENT arc */
    for (let i2 = 0; i2 < 3; i2++) {
      const off = i2 * 11 - 11;
      KD.Screen.rect(x0, y + off - 1, len, 3, k < 0.45 ? 'WHITE' : 'BONE.2');
    }
    /* the flash at the moment it lands */
    if (k < 0.12) {                                /* one frame, not a slab */
      KD.Screen.rect(x0, y - ARC_H, len, ARC_H * 2, 'BONE.2');
    }
  }

  function drawSparks() {
    for (const s2 of sparks) {
      const sz = s2.t > 0.18 ? 2 : 1;
      KD.Screen.rect(Math.round(s2.x - cam.x), Math.round(s2.y - cam.y), sz, sz, s2.col);
    }
  }

  function drawPlate(ctx, p) {
    const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
    const w = ((p.spin | 0) % 2) ? 9 : 4;
    KD.Screen.rect(x - (w >> 1), y - 1, w, 3, 'BONE.2');
    KD.Screen.rect(x - (w >> 1), y - 1, w, 1, 'WHITE');
  }

  function roomBanner() {
    const r = ROOMS[shownRoom];
    const a = Math.min(1, roomT / 0.5);
    const y = 22;
    const nm = r.name;
    const w = KD.Text.width(nm) + 20;
    const x = Math.round((KD.W - w) / 2);
    if (a < 1) return drawBannerBox(x, y, w, nm);
    drawBannerBox(x, y, w, nm);
  }
  function drawBannerBox(x, y, w, nm) {
    KD.Screen.rect(x, y, w, 14, 'INK.0');
    KD.Screen.rect(x + 1, y + 1, w - 2, 1, 'GOLD.0');
    KD.Screen.frame(x, y, w, 14, 'GOLD.1');
    KD.Text.draw(nm, x + (w >> 1), y + 4, 'GOLD.3', { align: 'center', shadow: 'INK.0' });
  }

  function hud() {
    const h = A1.hint();
    if (h) KD.UI.scroll(10, 8, h, { w: Math.min(124, KD.W - 60) });
    /* how many are left, so the fight has a finish line */
    const b = A1.beat();
    if (b.kind === 'kill') {
      const need = b.n || 3, got = A1.A.sharks;
      const lab = 'SHARKS  ' + got + ' / ' + need;
      const lw = KD.Text.width(lab) + 12;
      const lx = Math.round((KD.W - lw) / 2);
      KD.Screen.rect(lx, 6, lw, 13, 'INK.0');
      KD.Screen.frame(lx, 6, lw, 13, 'BLOOD.1');
      KD.Text.draw(lab, lx + (lw >> 1), 9, 'BONE.2', { align: 'center' });
      for (let i2 = 0; i2 < need; i2++) {
        KD.Screen.rect(lx + 4 + i2 * 5, 20, 3, 3, i2 < got ? 'KELP.2' : 'INK.2');
      }
    }
    /* hearts, only while something can hurt him */
    if (mobs.length) {
      for (let i = 0; i < 5; i++) {
        KD.Screen.rect(KD.W - 12 - i * 8, 8, 6, 6, i < P.hp ? 'BLOOD.2' : 'INK.2');
        if (i < P.hp) KD.Screen.rect(KD.W - 12 - i * 8, 8, 6, 2, 'BLOOD.3');
      }
    }
    if (P.plate > 0) {
      KD.Text.draw('F: THROW', KD.W - 8, KD.H - 16, 'GOLD.3',
                   { align: 'right', tiny: true, shadow: 'INK.0' });
    }
  }

  function drawMini() {
    const w = 196, h = 84;
    const x = Math.round((KD.W - w) / 2), y = Math.round((KD.H - h) / 2) + 8;
    /* the two of them, either side of the panel, because a minigame with no
       faces in it is a progress bar */
    const pk = KD.PX.has('po_king') ? 'po_king' : null;
    const pg = KD.PX.has('po_keg') ? 'po_keg' : null;
    const lean = mini.kind === 'kiss' ? Math.min(3, mini.n) * 5 + (mini.hit > 0 ? 3 : 0) : 0;
    const py = y - 24;
    if (pk) portraitFramed(pk, x - 44 + lean, py, false);
    if (pg) portraitFramed(pg, x + w + 8 - lean, py, true);

    KD.Screen.rect(x - 2, y - 2, w + 4, h + 4, 'INK.0');
    KD.Screen.rect(x, y, w, h, 'DEEP.0');
    KD.Screen.rect(x + 1, y + 1, w - 2, 1, 'DEEP.2');
    KD.Screen.frame(x, y, w, h, 'GOLD.1');
    if (mini.kind === 'beer') {
      KD.Text.draw('POUR IT', x + (w >> 1), y + 6, 'GOLD.3', { align: 'center', shadow: 'INK.0' });
      const gx = x + 22, gy = y + 24, gw = w - 44, gh = 28;
      /* the tankard */
      KD.Screen.rect(gx - 4, gy - 2, gw + 8, gh + 6, 'STONE.0');
      KD.Screen.rect(gx, gy, gw, gh, 'INK.1');
      KD.Screen.frame(gx - 1, gy - 1, gw + 2, gh + 2, 'BONE.1');
      const fw = Math.round(Math.min(1, mini.fill) * (gw - 4));
      KD.Screen.rect(gx + 2, gy + 2, fw, gh - 4, 'GOLD.1');
      KD.Screen.rect(gx + 2, gy + 2, fw, gh - 12, 'GOLD.2');
      /* a head of foam that wobbles as it rises */
      for (let k = 0; k < fw; k += 3) {
        const bob = ((k + ((mini.tt * 22) | 0)) % 6) < 3 ? 0 : 1;
        KD.Screen.rect(gx + 2 + k, gy + 1 + bob, 3, 4, 'BONE.2');
      }
      /* the band you are aiming for, marked top and bottom */
      const bx = gx + 2 + Math.round((mini.target - mini.band) * (gw - 4));
      const bw = Math.max(4, Math.round(mini.band * 2 * (gw - 4)));
      KD.Screen.rect(bx, gy - 5, bw, 3, 'KELP.2');
      KD.Screen.rect(bx, gy + gh + 2, bw, 3, 'KELP.1');
      KD.Text.draw('HOLD E, LET GO IN THE GREEN', x + (w >> 1), y + h - 22,
                   'BONE.2', { align: 'center', tiny: true });
      for (let i = 0; i < mini.tries; i++) {
        KD.Screen.rect(x + 8 + i * 7, y + h - 11, 5, 5, 'GOLD.2');
      }
      KD.Text.draw(mini.msg, x + (w >> 1) + 12, y + h - 11, 'GOLD.3',
                   { align: 'center', tiny: true });
    } else {
      KD.Text.draw('DO NOT THINK ABOUT HER', x + (w >> 1), y + 6, 'CORAL.3',
                   { align: 'center', shadow: 'INK.0' });
      const ph = mini.beat % 1;
      const good = ph > 0.62 && ph < 0.88;
      const sz = 4 + Math.round(ph * 12);
      const cx = x + (w >> 1), cy = y + 40;
      heart(cx, cy, sz, good ? 'CORAL.3' : 'CORAL.1');
      if (good) heart(cx, cy, sz + 3, 'CORAL.2');
      if (mini.hit > 0) {                          /* a burst on a good press */
        for (let k = 0; k < 8; k++) {
          const a = k * 0.785, r = 14 + (1 - mini.hit / 0.3) * 12;
          KD.Screen.rect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r),
                         2, 2, 'CORAL.3');
        }
      }
      /* the window you are aiming for, drawn as a ring of ticks */
      for (let k = 0; k < 3; k++) {
        KD.Screen.rect(cx - 22 + k * 22, y + 20, 2, 4, k < mini.n ? 'CORAL.3' : 'INK.2');
      }
      KD.Text.draw(mini.msg || 'PRESS E WHEN THE HEART IS FULL', x + (w >> 1), y + h - 12,
                   'BONE.2', { align: 'center', tiny: true });
    }
  }

  /* a heart out of rects, because that is the whole rule */
  function heart(cx, cy, sz, col) {
    const h = sz >> 1;
    KD.Screen.rect(cx - sz, cy - h, sz, sz, col);
    KD.Screen.rect(cx, cy - h, sz, sz, col);
    for (let i = 0; i < sz; i++) {
      KD.Screen.rect(cx - sz + i, cy + h + i, (sz - i) * 2, 1, col);
    }
    KD.Screen.rect(cx - sz + 2, cy - h + 2, 3, 3, 'CORAL.3');
  }

  function portraitFramed(name, x, y, flip) {
    KD.Screen.rect(x - 2, y - 2, 40, 44, 'INK.0');
    KD.Screen.rect(x - 1, y - 1, 38, 42, 'GOLD.0');
    KD.Screen.rect(x, y, 36, 40, 'DEEP.1');
    KD.PX.blit(KD.Screen.ctx(), name, x, y, { anchor: false, flipX: !!flip });
  }

  function layoutButtons() {
    BTNS.length = 0;
    const r = 19, pad = 12;
    const fight = inFight();
    BTNS.push({ id: 'jump', name: 'jump', x: KD.W - 34,
                y: KD.H - pad - r * 3 - 4, r: r, label: 'JUMP' });
    /* the strike button grows and moves inboard while something is biting */
    if (fight) {
      /* octo() draws a little wider than r, so the inset allows for it */
      BTNS.push({ id: 'hit', name: 'hit', big: true,
                  x: KD.W - 40, y: KD.H - pad - r * 5 - 10, r: 24,
                  label: 'STRIKE', icon: 'ic_sword' });
    } else {
      BTNS.push({ id: 'hit', name: 'hit', x: KD.W - 34 - r * 2 - 6,
                  y: KD.H - pad - r, r: r, label: 'HIT' });
    }
    BTNS.push({ id: 'use', name: 'use', x: KD.W - 34, y: KD.H - pad - r,
                r: r, label: 'TALK' });
  }

  /* the ring round the strike button, the callout over the shark, and the
     one line of text that tells you what to do about it */
  function combatPrompt() {
    const tg = target();
    if (!tg) return;
    const open = tg.state === 'recover';
    const col = open ? 'KELP.3' : 'BLOOD.3';

    /* a chevron bouncing over whoever is nearest */
    const sx = Math.round(tg.x - cam.x), sy = Math.round(tg.y - cam.y);
    const bob = Math.round(Math.abs(Math.sin(t * 5)) * 3);
    for (let k = 0; k < 4; k++) {
      KD.Screen.rect(sx - 4 + k, sy - 30 - k + bob, 9 - k * 2, 2, col);
    }
    if (open) {
      KD.Text.draw('NOW', sx, sy - 42 + bob, 'KELP.3',
                   { align: 'center', tiny: true, shadow: 'INK.0' });
    }

    /* the pulsing ring on the button, on touch; the key prompt otherwise */
    if (KD.touch) {
      const b = BTNS.filter((x) => x.id === 'hit')[0];
      if (b) {
        const pr = b.r + 4 + Math.round(Math.abs(Math.sin(t * (open ? 7 : 3.5))) * 4);
        for (let a2 = 0; a2 < 16; a2++) {
          const an = a2 * 0.3927;
          KD.Screen.rect(Math.round(b.x + Math.cos(an) * pr) - 1,
                         Math.round(b.y + Math.sin(an) * pr) - 1, 3, 3, col);
        }
      }
    } else {
      const lab = open ? 'F  -  STRIKE NOW' : 'F  -  STRIKE';
      const w = KD.Text.width(lab) + 14;
      const x = Math.round((KD.W - w) / 2), y = KD.H - 30;
      KD.Screen.rect(x, y, w, 14, 'INK.0');
      KD.Screen.frame(x, y, w, 14, col);
      KD.Text.draw(lab, x + (w >> 1), y + 4, col, { align: 'center' });
    }

    /* and what the fight actually is, the first time you meet one */
    if (A1.A.sharks === 0) {
      const tip = open ? 'IT IS TURNING - HIT IT'
                       : 'WAIT FOR THE LUNGE, THEN HIT IT';
      KD.Text.draw(tip, KD.W / 2, KD.touch ? KD.H - 30 : KD.H - 44,
                   'BONE.2', { align: 'center', tiny: true, shadow: 'INK.0' });
    }
  }

  return { enter, update, draw, snapCam,
           /* exposed for the smoke harness */
           _P: P, _ROOMS: ROOMS, _bake: bake,
           _throw: throwPlate, _swing: swing, _A1: A1,
           get _mobs() { return mobs; }, get _arc() { return arc; } };
})();
