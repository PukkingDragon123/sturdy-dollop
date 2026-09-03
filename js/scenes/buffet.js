/* ============================================================
   scenes/buffet.js - THE BUFFET.

   The cook offered him a room with food in it. This is that
   room, and the door is locked, and this is where the hundred
   kilos comes from.

   It is PLAYED, not watched. There is nothing else in here to
   do, which is the joke and also the point: you walk the length
   of a locked cellar, you eat, a season goes by, you eat, and
   the number at the top of the screen goes up because you did
   it. A cutscene saying "he got fat" is a caption. Doing it
   yourself for forty seconds is the scene.

   Everything drawn here comes out of the same CastleKit as the
   four rooms upstairs, so it reads as somewhere in the same
   building rather than as a minigame in a box.
   ============================================================ */
KD.Scenes.buffet = (function () {
  const K = KD.CastleKit;
  const R = KD.Screen.rect;
  const A1 = KD.Act1;

  const RW = 620, RH = 200;                  // room space
  const CEIL = 14, FLOOR = 150;
  const TABLES = [70, 190, 310, 430, 545];   // where the long tables stand

  /* four seasons, and one of them goes by every time he clears a table */
  const SEASONS = ['THE FIRST SEASON', 'THE SECOND SEASON',
                   'THE THIRD SEASON', 'THE FOURTH SEASON'];
  const GOAL = TABLES.length;                // tables to clear before the door

  let t = 0, phase = 'in', pt = 0;
  let baked = null;
  let ate = 0, chew = 0, said = '', saidT = 0, season = 0;
  let doorT = 0, knock = 0;
  const crumbs = [];
  const eaten = [];                          // which tables are cleared
  const BTNS = [];

  /* he walks it himself */
  const P = { x: 60, y: FLOOR, vx: 0, face: 1, anim: 0 };
  const cam = { x: 0, y: 0 };

  function enter() {
    t = 0; phase = 'in'; pt = 0; ate = 0; chew = 0; said = ''; saidT = 0; handed = false;
    season = 0; doorT = 0; knock = 0;
    crumbs.length = 0; eaten.length = 0;
    for (let i = 0; i < TABLES.length; i++) eaten.push(0);
    P.x = 60; P.vx = 0; P.face = 1; P.anim = 0;
    if (!baked) bake();
    snapCam();
  }

  /* ---- the cellar, baked once ------------------------------------- */
  function bake() {
    const c = document.createElement('canvas');
    c.width = RW; c.height = RH;
    const x2 = c.getContext('2d');
    x2.imageSmoothingEnabled = false;
    K.fill(x2, 0, 0, RW, RH, 'INK.0');
    /* the shell: brick, because a cellar is not a throne room */
    /* Brick, two steps down. At the top of the RUST ramp a whole wall of it
       is a sheet of bright orange, and this is a cellar with the door shut. */
    K.stone(x2, 0, CEIL, RW, FLOOR - CEIL, { bw: 14, bh: 8, ramp: 'WOOD' });
    K.stone(x2, 0, 0, RW, CEIL, { bw: 20, bh: 7, ramp: 'STONE' });
    K.fill(x2, 0, CEIL, RW, 2, 'INK.0');
    K.flagstone(x2, 0, FLOOR, RW, RH - FLOOR);
    K.fill(x2, 0, FLOOR, RW, 1, 'INK.0');
    K.stringCourse(x2, 0, FLOOR - 44, RW, 'RUST');
    /* the door he came in by, barred on the outside */
    K.archway(x2, 8, FLOOR - 72, 34, 72, { back: 'INK.0', keystone: true });
    K.fill(x2, 10, FLOOR - 70, 30, 70, '#0d1424');
    for (let k = 0; k < 5; k++) K.fill(x2, 12, FLOOR - 62 + k * 13, 26, 4, 'RUST.1');
    for (let k = 0; k < 5; k++) K.fill(x2, 12, FLOOR - 62 + k * 13, 26, 1, 'RUST.3');
    /* and the hatch they push the food through, high up on the far wall */
    K.archway(x2, RW - 46, FLOOR - 96, 30, 26, { back: 'STONE.0' });
    K.fill(x2, RW - 44, FLOOR - 94, 26, 22, '#0d1424');
    /* the tables: trestles under a cloth, running the length of the room */
    for (const tx of TABLES) table(x2, tx);
    /* brackets for the torches, which are drawn live */
    for (const bx of [60, 200, 340, 480, 580]) K.torchBracket(x2, bx, FLOOR - 62);
    baked = c;
  }

  function table(x2, x) {
    const w = 92, top = FLOOR - 30;
    /* trestle legs */
    K.fill(x2, x + 6, top + 6, 5, 24, 'WOOD.0');
    K.fill(x2, x + w - 11, top + 6, 5, 24, 'WOOD.0');
    /* the board */
    K.fill(x2, x, top, w, 6, 'WOOD.1');
    K.fill(x2, x, top, w, 1, 'WOOD.3');
    K.fill(x2, x, top + 5, w, 1, 'INK.0');
    /* a cloth over it, hanging in folds */
    K.fill(x2, x + 2, top + 6, w - 4, 12, 'BONE.0');
    K.fill(x2, x + 2, top + 6, w - 4, 1, 'BONE.1');
    for (let k = x + 6; k < x + w - 6; k += 9) K.fill(x2, k, top + 7, 1, 11, 'INK.1');
  }

  /* ---- what is on the tables, and what is left of it -------------- */
  function platter(x, y, cleared) {
    if (cleared) {                            /* just the plate, and bones */
      R(x - 13, y, 27, 3, 'BONE.1');
      R(x - 12, y - 1, 25, 2, 'BONE.2');
      R(x - 6, y - 3, 3, 2, 'BONE.2');
      R(x + 2, y - 3, 4, 2, 'BONE.1');
      return;
    }
    /* a heap: fish, crab, a cake, whatever the kitchen had */
    R(x - 15, y, 31, 3, 'BONE.1');
    R(x - 14, y - 1, 29, 2, 'BONE.2');
    R(x - 12, y - 7, 11, 6, 'CORAL.1');
    R(x - 12, y - 7, 11, 1, 'CORAL.2');
    R(x - 1, y - 9, 9, 8, 'BLOOD.1');
    R(x - 1, y - 9, 9, 1, 'BLOOD.2');
    R(x + 8, y - 6, 7, 5, 'SAND.2');
    R(x + 8, y - 6, 7, 1, 'SAND.3');
    R(x - 6, y - 12, 6, 4, 'GOLD.2');
    R(x - 6, y - 12, 6, 1, 'GOLD.3');
  }

  /* ---- movement, which he keeps the whole way through ------------- */
  const snapCam = () => { cam.x = clampCam(P.x - KD.W / 2); cam.y = 0; };
  const clampCam = (v) => Math.max(0, Math.min(RW - KD.W, Math.round(v)));

  function update(dt) {
    t += dt; pt += dt;
    if (chew > 0) chew -= dt;
    if (saidT > 0) saidT -= dt;
    if (doorT > 0) doorT -= dt;
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const c = crumbs[i];
      c.t -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt;
      if (c.t <= 0) crumbs.splice(i, 1);
    }
    /* The door closing behind him and the door opening again are both
       things he should be able to walk around in, so neither phase stops
       the world any more - they just change what the words say. */
    if (phase === 'in' && pt > 2.2) {
      phase = 'eat'; pt = 0; say('The door does not open from this side.');
    }
    if (phase === 'out' && pt > 2.6 && !handed) { handed = true; finish(); }

    /* ---- he walks. This is the whole of the interaction. ---------- */
    const ax = KD.In.stick().x;
    const run = 62;
    P.vx += ((ax * run) - P.vx) * Math.min(1, dt * 12);
    if (Math.abs(ax) > 0.1) P.face = ax > 0 ? 1 : -1;
    P.x = Math.max(24, Math.min(RW - 24, P.x + P.vx * dt));
    P.anim += dt * (Math.abs(P.vx) > 6 ? Math.abs(P.vx) / 10 : 2.2);
    cam.x += (clampCam(P.x - KD.W / 2) - cam.x) * Math.min(1, dt * 7);
    cam.x = clampCam(cam.x);

    /* the nearest table, and eating from it */
    if (phase !== 'eat' || KD.Cut.active) return;
    const i = nearTable();
    if (i >= 0 && !eaten[i] && press()) eat(i);
  }

  function nearTable() {
    for (let i = 0; i < TABLES.length; i++) {
      if (Math.abs(P.x - (TABLES[i] + 46)) < 40) return i;
    }
    return -1;
  }

  function press() {
    const tapped = KD.In.mouse.click && !KD.UI.blocked();
    if (tapped) KD.In.consumedClick();
    return KD.In.actHit('use', 'KeyE') || KD.In.isHit('Space', 'Enter') || tapped;
  }

  const LINES = [
    'It is good. That is the worst part.',
    'Somebody comes and fills it again while you sleep.',
    'You have stopped counting the tides.',
    'The trident is upstairs. Somewhere upstairs.',
    'You do not remember the last time the door opened.'
  ];

  function eat(i) {
    eaten[i] = 1; ate++;
    chew = 0.5;
    /* THIS is where the weight comes from, and he is doing it himself */
    A1.gain(6);
    if (KD.Juice) KD.Juice.pop('bite', 0.22);
    if (KD.Sfx) KD.Sfx.play('pickup');
    const px = TABLES[i] + 46;
    for (let k = 0; k < 12; k++) {
      const a = -2.6 + k * 0.16;
      crumbs.push({ x: px, y: FLOOR - 34, vx: Math.cos(a) * 90,
                    vy: Math.sin(a) * 70 - 40, t: 0.55 + (k % 3) * 0.14,
                    col: k % 3 ? 'CORAL.1' : 'SAND.2' });
    }
    say(LINES[Math.min(LINES.length - 1, ate - 1)]);
    season = Math.min(SEASONS.length - 1, ate - 1);
    doorT = 1.4; knock++;
    if (ate >= GOAL) { phase = 'out'; pt = 0; }
  }

  function say(s) { said = s; saidT = 4.0; }
  /* the outro is armed exactly once, whatever the frame rate does */
  let handed = false;

  function finish() {
    A1.save();
    /* over the cellar, not instead of it: the cook is at the door and he
       can walk up to it while the man talks */
    KD.Cut.play(outro());
  }

  /* ---- draw -------------------------------------------------------- */
  function draw(ctx) {
    KD.Screen.clear('INK.0');
    const ox = -Math.round(cam.x), oy = Math.round((KD.H - RH) / 2);
    ctx.drawImage(baked, Math.round(cam.x), 0,
                  Math.min(KD.W, RW - cam.x), RH, 0, oy,
                  Math.min(KD.W, RW - cam.x), RH);
    const sx = (wx) => Math.round(wx - cam.x);
    const sy = (wy) => Math.round(wy + oy);

    /* torches, live */
    for (const bx of [60, 200, 340, 480, 580]) {
      const x = sx(bx + 1);
      if (x < -12 || x > KD.W + 12) continue;
      K.flame(ctx, x, sy(FLOOR - 62), t, bx);
      for (let i = 0; i < 5; i++) K.fill(ctx, x - 4 - i, sy(FLOOR - 68 + i), 10 + i * 2, 1, 'RUST.1');
    }
    /* the food */
    for (let i = 0; i < TABLES.length; i++) {
      platter(sx(TABLES[i] + 46), sy(FLOOR - 30), eaten[i]);
    }
    /* him */
    drawKing(ctx, sx(P.x), sy(FLOOR));
    for (const c of crumbs) R(Math.round(c.x - cam.x), Math.round(c.y + oy), 2, 2, c.col);

    /* somebody at the hatch, every time he clears a table */
    if (doorT > 0) {
      const hx = sx(RW - 31), hy = sy(FLOOR - 84);
      R(hx - 7, hy, 15, 12, 'ROT.1');
      R(hx - 5, hy + 3, 4, 3, 'WHITE');
      R(hx + 2, hy + 3, 4, 3, 'WHITE');
      R(hx - 4, hy + 4, 2, 2, 'INK.0');
      R(hx + 3, hy + 4, 2, 2, 'INK.0');
    }

    /* ---- the words ------------------------------------------------
       Under a cutscene the layer owns the bottom of the frame and the
       letterbox owns the top, so the plaque, the weight and his own
       muttering all stand down and let it through. */
    const cut = KD.Cut.active;
    if (cut) {
      /* nothing: the layer is drawing */
    } else if (phase === 'in') {
      band('THE ROOM WITH FOOD IN IT', 'he did say to eat something', Math.min(1, pt / 0.4));
    } else if (phase === 'out') {
      band('FOUR SEASONS', 'and the door has not opened once', 1);
    } else {
      hud();
    }
    if (saidT > 0 && phase !== 'in' && !cut) {
      KD.Convo.box({ portrait: 'po_king', name: 'You', tint: 'WATER.3' }, said,
                   { speaking: false });
    }
    if (KD.touch) { layout(); KD.In.buttons(cut ? [] : BTNS); KD.UI.touchPad(cut ? [] : BTNS); }
  }

  function drawKing(ctx, x, y) {
    /* the same walk he has upstairs, and his belly grows as he eats */
    let anim = 'kp_idle';
    if (Math.abs(P.vx) > 6) anim = 'kp_walk';
    if (chew > 0) anim = 'kp_thrust';
    const nm = KD.PX.frameOf(anim, P.anim);
    if (nm && KD.PX.has(nm)) KD.PX.blit(ctx, nm, x, y, { flipX: P.face < 0 });
    /* a plate in his hand once he has started */
    if (ate > 0 && chew <= 0) {
      R(x + P.face * 12 - 5, y - 30, 11, 2, 'BONE.2');
      R(x + P.face * 12 - 4, y - 31, 9, 1, 'WHITE');
    }
  }

  function hud() {
    /* which season it is, and how many tables are left */
    const lab = SEASONS[season];
    const w = KD.Text.width(lab, { tiny: true }) + 12;
    R(8, 8, w, 13, 'INK.0');
    KD.Screen.frame(8, 8, w, 13, 'RUST.2');
    KD.Text.draw(lab, 8 + (w >> 1), 11, 'RUST.3', { align: 'center', tiny: true });
    /* the weight, going up, which is the only number that matters in here */
    const kg = 40 + Math.round(A1.A.fat || 0);
    const kl = kg + ' KG';
    const kw = KD.Text.width(kl) + 12;
    R(KD.W - kw - 8, 8, kw, 14, 'INK.0');
    KD.Screen.frame(KD.W - kw - 8, 8, kw, 14, 'GOLD.1');
    KD.Text.draw(kl, KD.W - 8 - (kw >> 1), 11, 'GOLD.3', { align: 'center' });
    for (let i = 0; i < GOAL; i++) {
      R(KD.W - kw - 8 + i * 6, 25, 4, 4, eaten[i] ? 'BONE.2' : 'INK.2');
    }
    /* and the prompt, when he is standing at a table with food on it */
    const i = nearTable();
    if (i >= 0 && !eaten[i]) {
      const p = KD.touch ? 'TAP TO EAT' : 'E  -  EAT';
      const pw = KD.Text.width(p) + 14;
      /* Under the season plaque, not at the bottom of the screen - down
         there it was behind the dialogue box every time he said something. */
      const px = Math.round((KD.W - pw) / 2), py = 26;
      R(px, py, pw, 15, 'INK.0');
      KD.Screen.frame(px, py, pw, 15, 'GOLD.1');
      KD.Text.draw(p, px + (pw >> 1), py + 4, 'GOLD.3', { align: 'center' });
    }
  }

  function band(title, sub, a) {
    const h = Math.round(46 * a);
    if (h < 4) return;
    const y = Math.round(KD.H / 2 - h / 2);
    R(0, y, KD.W, h, 'INK.0');
    R(0, y, KD.W, 1, 'RUST.1');
    R(0, y + h - 1, KD.W, 1, 'RUST.1');
    if (a > 0.7) {
      KD.Text.draw(title, KD.W / 2, y + 12, 'RUST.3', { align: 'center', space: 1 });
      KD.Text.draw(sub, KD.W / 2, y + 28, 'BONE.0', { align: 'center', tiny: true });
    }
  }

  function layout() {
    BTNS.length = 0;
    const r = 22;
    BTNS.push({ id: 'use', name: 'use', big: true, x: KD.W - 38,
                y: KD.H - 14 - r, r: r, label: 'EAT' });
  }

  /* the scene that gets him out of here, once the four seasons are up */
  function outro() {
    return {
      id: 'a1_out',
      beats: [
        { kind: 'card', t: 2.6, vig: 0.9,
          lines: ['THE DOOR OPENED'], sub: 'and he did not fit through it the first time' },
        { kind: 'art', spr: 'po_deep', scale: 2, y: 0.42, t: 0.1, vig: 0.8 },
        { kind: 'say', who: 'po_deep', name: 'The Deep', t: 5.0, vig: 0.8,
          text: 'Look at you. I did not have to do a single thing, majesty. I just kept the plates coming.' },
        { kind: 'say', who: 'po_king', name: 'You', t: 3.0,
          text: 'The castle.' },
        { kind: 'say', who: 'po_deep', name: 'The Deep', t: 4.8, vig: 0.8,
          text: 'Is a kitchen now. All of it. She left in the second season and I have been redecorating.' },
        { kind: 'shake', amp: 10, t: 0.4 },
        { kind: 'flash', col: 'BLOOD.3', t: 0.4 },
        { kind: 'card', t: 3.0, vig: 1,
          lines: ['OUT THROUGH HIS OWN GATE'],
          sub: 'and the current took him where it liked' },
        { kind: 'art', spr: 'po_santa', scale: 2, y: 0.40, t: 0.1 },
        { kind: 'say', who: 'po_santa', name: 'Santa the Manta', t: 5.0,
          text: 'Found you face down in the sand, big fella. Nobody sent me and nobody is paying me. Come on. I know a village.' },
        { kind: 'fade', to: 1, t: 1.0 }
      ],
      after: () => { A1.advance(); A1.save(); KD.Game.go('gen', {}); }
    };
  }

  return { enter, update, draw, _outro: outro,
           /* seams for the smoke harness */
           _P: P, _eat: eat, _tables: TABLES };
})();
