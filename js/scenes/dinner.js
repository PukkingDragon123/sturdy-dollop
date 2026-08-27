/* ============================================================
   scenes/dinner.js - the long table, the candles, and the one
   evening he actually turned up for.

   The dinner used to be a dialogue box you dismissed. It is a
   played scene now, and it has a choice in it: EAT clears the
   course, TOAST turns to the woman sitting opposite. Eating is
   what fills the belly and eating is all the game asks of you -
   so if you only ever press EAT, her lines cool off and the
   evening ends differently. That is the whole of Act One in one
   screen, and it is why this beat is not a caption.
   ============================================================ */
KD.Scenes.dinner = (function () {
  const K = KD.CastleKit;
  const R = KD.Screen.rect;

  const COURSES = [
    { spr: 'fd_fish', name: 'THE FISH',  label: 'FIRST COURSE',
      lines: ['You came.', 'You actually came.'] },
    { spr: 'fd_crab', name: 'THE CRAB',  label: 'SECOND COURSE',
      lines: ['The cook does this one well.', 'Do not tell him I said so.'] },
    { spr: 'fd_cake', name: 'THE CAKE',  label: 'LAST COURSE',
      lines: ['Stay a while after.', 'The candles have hours in them yet.'] }
  ];

  let t = 0, phase = 'in', pt = 0;
  let course = 0, bite = 0, full = 0, warm = 0.5;
  let chew = 0, toastT = 0, said = '', saidT = 0, sipped = false;
  let buffered = false;               // a press made while a course was landing
  const crumbs = [];
  let baked = null, bw = 0, bh = 0;
  const KSEAT = 96, QSEAT = 204;      // where the two of them sit, baked space
  const BTNS = [];
  /* Table top in baked space. Everything else is measured off it: the two
     of them sit so their waist lands just under the cloth, the chairs stand
     directly behind them, and the plates sit a fixed offset either side.
     The first pass had them a hundred pixels apart with a grey band between
     and it read as two people at a bus stop. */
  const TABLE = 96;

  function enter() {
    t = 0; phase = 'in'; pt = 0;
    course = 0; bite = 0; full = 0; warm = 0.5;
    chew = 0; toastT = 0; said = ''; saidT = 0; sipped = false; buffered = false;
    crumbs.length = 0;
    if (!baked) bake();
  }

  /* ---- the room, baked once ---------------------------------------- */
  function bake() {
    bw = 300; bh = 152;
    const c = document.createElement('canvas');
    c.width = bw; c.height = bh;
    const x2 = c.getContext('2d');
    x2.imageSmoothingEnabled = false;
    K.fill(x2, 0, 0, bw, bh, 'INK.0');
    K.stone(x2, 0, 0, bw, bh, {});
    /* one big window behind them, tapestries either side, and a shelf of
       plates - a blank grey wall above the table was most of the frame */
    K.window(x2, bw / 2 - 30, 6, 60, 50, { seed: 7 });
    K.banner(x2, 22, 4, 22, 46, 'BLOOD');
    K.banner(x2, bw - 44, 4, 22, 46, 'BLOOD');
    K.tapestry(x2, 58, 8, 22, 34, 'CLOTH', 'GOLD');
    K.tapestry(x2, bw - 80, 8, 22, 34, 'CLOTH', 'GOLD');
    K.stringCourse(x2, 0, 58, bw);
    /* a plate rail, because a great hall has one */
    K.fill(x2, 30, 68, bw - 60, 3, 'WOOD.1');
    K.fill(x2, 30, 68, bw - 60, 1, 'WOOD.3');
    for (let px = 40; px < bw - 46; px += 26) {
      K.fill(x2, px, 62, 14, 6, 'BONE.1');
      K.fill(x2, px + 1, 61, 12, 2, 'BONE.2');
      K.fill(x2, px + 4, 63, 6, 2, 'CORAL.1');
    }
    for (const tx of [12, bw - 18]) K.torchBracket(x2, tx, 74);
    /* the floor, and the table across it */
    K.flagstone(x2, 0, TABLE + 44, bw, bh - TABLE - 44);
    K.fill(x2, 0, TABLE + 44, bw, 1, 'STONE.3');
    K.carpet(x2, 8, TABLE + 44, bw - 16, 9);
    /* two high-backed chairs, directly behind where each of them sits */
    for (const cx2 of [KSEAT - 13, QSEAT - 13]) {
      K.fill(x2, cx2, TABLE - 54, 26, 58, 'WOOD.0');
      K.fill(x2, cx2 + 2, TABLE - 52, 22, 54, 'WOOD.1');
      K.fill(x2, cx2 + 2, TABLE - 52, 22, 2, 'WOOD.2');
      for (let k = 3; k < 20; k += 5) K.fill(x2, cx2 + 2 + k, TABLE - 48, 2, 48, 'WOOD.0');
      K.fill(x2, cx2 - 2, TABLE - 59, 30, 6, 'WOOD.2');
      K.fill(x2, cx2 - 2, TABLE - 59, 30, 1, 'WOOD.3');
      K.fill(x2, cx2 + 3, TABLE - 64, 6, 5, 'GOLD.1');
      K.fill(x2, cx2 + 17, TABLE - 64, 6, 5, 'GOLD.1');
      /* a red cushion on the back, so it is not a plank */
      K.fill(x2, cx2 + 5, TABLE - 44, 16, 22, 'BLOOD.1');
      K.fill(x2, cx2 + 5, TABLE - 44, 16, 2, 'BLOOD.2');
    }
    /* The table. The cloth was BONE.1 with a stripe every nine pixels and
       came out looking like corrugated metal; it is a solid drape now with a
       gold-braided hem and four soft folds. */
    /* Darker than the plates, or the cloth reads as blank paper and the
       settings vanish into it. Folds every twenty pixels, not sixty - at
       sixty they read as panel joins on a cabinet. */
    K.fill(x2, 6, TABLE + 8, bw - 12, 30, 'BONE.0');
    K.fill(x2, 6, TABLE + 8, bw - 12, 3, 'BONE.1');
    for (let k = 14; k < bw - 14; k += 20) {
      K.fill(x2, k, TABLE + 11, 2, 24, 'INK.2');
      K.fill(x2, k + 2, TABLE + 11, 2, 24, 'BONE.1');
    }
    /* a gold-braided hem with tassels */
    K.fill(x2, 6, TABLE + 33, bw - 12, 4, 'GOLD.1');
    K.fill(x2, 6, TABLE + 33, bw - 12, 1, 'GOLD.3');
    K.fill(x2, 6, TABLE + 37, bw - 12, 1, 'GOLD.0');
    for (let k = 12; k < bw - 14; k += 13) {
      K.fill(x2, k, TABLE + 38, 3, 5, 'GOLD.2');
      K.fill(x2, k, TABLE + 42, 3, 2, 'GOLD.0');
    }
    /* the board itself */
    K.fill(x2, 2, TABLE, bw - 4, 8, 'WOOD.2');
    K.fill(x2, 2, TABLE, bw - 4, 2, 'WOOD.3');
    K.fill(x2, 2, TABLE + 7, bw - 4, 1, 'WOOD.0');
    baked = c;
  }

  /* ---- update ------------------------------------------------------ */
  function update(dt) {
    t += dt; pt += dt;
    if (chew > 0) chew -= dt;
    if (toastT > 0) toastT -= dt;
    if (saidT > 0) saidT -= dt;
    for (const c of crumbs) {
      c.t -= dt; c.x += c.vx * dt; c.vy += 380 * dt; c.y += c.vy * dt;
    }
    for (let i = crumbs.length - 1; i >= 0; i--) if (crumbs[i].t <= 0) crumbs.splice(i, 1);

    if (phase === 'in') {
      if (pt > 1.1) { phase = 'serve'; pt = 0; }
      return;
    }
    if (phase === 'serve') {
      /* A press while the plate is still coming in used to be dropped on the
         floor, which feels like the button is broken. Hold it and spend it
         the moment eating opens. */
      if (eatPress()) buffered = true;
      if (pt > 0.75) {
        phase = 'eat'; pt = 0; bite = 0; sipped = false;
        say(COURSES[course].lines[0]);
        if (buffered) { buffered = false; takeBite(); }
      }
      return;
    }
    if (phase === 'eat') {
      /* attention drifts if he only ever eats */
      warm = Math.max(0, warm - dt * 0.035);
      if (eatPress()) takeBite();
      else if (toastPress()) toast();
      return;
    }
    if (phase === 'clear') {
      if (eatPress()) buffered = true;
      if (pt > 0.85) {
        course++;
        if (course >= COURSES.length) { phase = 'out'; pt = 0; }
        else { phase = 'serve'; pt = 0; }
      }
      return;
    }
    if (phase === 'out') {
      if (pt > 3.6 || eatPress() || toastPress()) finish();
    }
  }

  function tapped() {
    const hit = KD.In.mouse.click && !KD.UI.blocked();
    if (hit) KD.In.consumedClick();
    return hit;
  }
  function eatPress() {
    return KD.In.actHit('use', 'KeyE') || KD.In.isHit('Space', 'Enter') || tapped();
  }
  const toastPress = () => KD.In.actHit('hit', 'KeyF');

  function takeBite() {
    bite++;
    chew = 0.3;
    full = Math.min(1, full + 0.115);
    if (KD.Act1) KD.Act1.gain(1);
    if (KD.Juice) KD.Juice.pop('bite', 0.18);
    if (KD.Sfx) KD.Sfx.play('step');
    for (let i = 0; i < 7; i++) {
      const a = -2.4 + i * 0.2;
      crumbs.push({ x: plateX(), y: TABLEY() - 12, vx: Math.cos(a) * 70,
                    vy: Math.sin(a) * 60 - 30, t: 0.5 + (i % 3) * 0.12,
                    col: i % 2 ? 'CORAL.1' : 'SAND.2' });
    }
    if (bite >= 3) {
      phase = 'clear'; pt = 0;
      say(warm > 0.55 ? 'You are still here. Good.'
                      : 'You have not looked up once.');
    } else {
      const L = COURSES[course].lines;
      if (bite === 2 && L[1]) say(L[1]);
    }
  }

  function toast() {
    toastT = 0.9;
    sipped = true;
    warm = Math.min(1, warm + 0.28);
    if (KD.Sfx) KD.Sfx.play('click');
    say(['To the trench.', 'To you, then.', 'You remembered the wine.'][
      Math.min(2, course)]);
  }

  function say(s) { said = s; saidT = 3.2; }

  function finish() {
    /* the evening lands where he left it, and Act One remembers */
    if (KD.State && KD.State.S) {
      KD.State.S.flags.dinner = warm > 0.55 ? 2 : 1;
      KD.State.save();
    }
    if (KD.Act1) { KD.Act1.gain(3); KD.Act1.advance(); }
    KD.Game.go('castle', {});
  }

  /* ---- draw -------------------------------------------------------- */
  const ox = () => Math.round((KD.W - bw) / 2);
  const oy = () => Math.round((KD.H - bh) / 2) - 4;
  const TABLEY = () => oy() + TABLE;
  const plateX = () => ox() + KSEAT + 22;

  function draw(ctx) {
    KD.Screen.clear('INK.0');
    const X = ox(), Y = oy();
    ctx.drawImage(baked, 0, 0, bw, bh, X, Y, bw, bh);
    const ty = Y + TABLE;

    /* the two wall sconces, live */
    K.flame(ctx, X + 17, Y + 72, t, 5);
    K.flame(ctx, X + bw - 13, Y + 72, t, 11);
    /* the candelabrum in the middle, live */
    const cx2 = X + (bw >> 1) - 10;
    R(cx2 + 8, ty - 22, 3, 22, 'GOLD.1');
    R(cx2, ty - 24, 20, 3, 'GOLD.2');
    for (const k of [0, 8, 16]) {
      R(cx2 + k, ty - 32, 3, 9, 'BONE.2');
      R(cx2 + k, ty - 32, 1, 9, 'BONE.1');
      K.flame(ctx, cx2 + k + 1, ty - 33, t, k);
    }

    /* The two of them, seated: cropped to 46 rows, which is head to waist,
       and placed so the waist lands just under the cloth. o.w also crops the
       trident off his sprite, which is what you want at a dinner table. */
    const kx = X + KSEAT, qx = X + QSEAT;
    const bob = chew > 0 ? Math.round(Math.sin(chew * 60) * 2) : 0;
    const seatY = ty + 27;
    if (KD.PX.hasAny('kp_idle')) {
      const nm = KD.PX.frameOf('kp_idle', t);
      if (KD.PX.has(nm)) KD.PX.blit(ctx, nm, kx, seatY + bob, { w: 30, h: 46 });
    }
    if (KD.PX.hasAny('qn_idle')) {
      const nm = KD.PX.frameOf('qn_idle', t + 1.3);
      if (KD.PX.has(nm)) KD.PX.blit(ctx, nm, qx, seatY, { w: 34, h: 46, flipX: true });
    }

    /* her setting, and his */
    plate(qx - 20, ty - 1, false);
    goblet(qx + 16, ty - 1, false);
    goblet(kx - 18, ty - 1, toastT > 0);

    /* the course itself, sliding in as it is served */
    if (phase !== 'in' && course < COURSES.length) {
      const c = COURSES[course];
      let fx = plateX(), fy = ty - 1;
      let show = Math.min(2, bite);
      if (phase === 'serve') {
        const k = KD.Juice ? KD.Juice.outCubic(Math.min(1, pt / 0.7)) : 1;
        fx = X + bw + 30 - (X + bw + 30 - plateX()) * k;
        show = 0;
      }
      if (phase === 'clear') {
        const k = Math.min(1, pt / 0.8);
        fy = ty - 1 + Math.round(k * 40);
        show = 2;
      }
      const nm = c.spr + show;
      if (KD.PX.has(nm)) KD.PX.blit(ctx, nm, Math.round(fx), Math.round(fy));
    }

    for (const c of crumbs) {
      R(Math.round(c.x), Math.round(c.y), 2, 2, c.col);
    }

    /* ---- the words ------------------------------------------------ */
    if (phase === 'in') {
      const a = Math.min(1, pt / 0.35);
      band('DINNER', 'the long table, and the candles lit for once', a);
    } else if (phase === 'out') {
      band(warm > 0.55 ? 'A GOOD NIGHT' : 'HE ATE WELL',
           warm > 0.55 ? 'she stayed at the table until the wax ran'
                       : 'she stopped talking somewhere in the second course', 1);
    } else {
      hud();
    }
    if (saidT > 0 && phase !== 'in') {
      KD.Talk.panel({ name: 'Coralene', portrait: 'po_queen' }, said, { bottom: 6 });
    }
    if (KD.touch) { layout(); KD.In.buttons(BTNS); KD.UI.touchPad(BTNS, { noStick: true }); }
  }

  function plate(x, y, mine) {
    R(x - 14, y - 3, 29, 3, 'BONE.1');
    R(x - 13, y - 4, 27, 2, 'BONE.2');
    R(x - 14, y, 29, 1, 'INK.1');
    if (!mine) {                                 /* hers, barely touched */
      R(x - 6, y - 6, 11, 3, 'CORAL.1');
      R(x - 4, y - 7, 6, 2, 'CORAL.2');
    }
  }

  function goblet(x, y, lifted) {
    const ly = lifted ? y - 12 : y;
    R(x - 3, ly - 12, 7, 8, 'GOLD.2');
    R(x - 3, ly - 12, 7, 1, 'GOLD.3');
    R(x - 2, ly - 11, 5, 3, 'BLOOD.2');
    R(x - 1, ly - 4, 3, 3, 'GOLD.1');
    R(x - 4, ly - 1, 9, 2, 'GOLD.2');
    if (lifted) {
      R(x - 6, ly - 16, 3, 2, 'BONE.2');
      R(x + 4, ly - 15, 2, 2, 'BONE.2');
    }
  }

  function band(title, sub, a) {
    const cy = Math.round(KD.H * 0.13);
    const h = 30;
    R(0, cy - 8, KD.W, h, 'INK.0');
    R(0, cy - 8, KD.W, 1, 'GOLD.0');
    R(0, cy - 9 + h, KD.W, 1, 'GOLD.0');
    KD.Text.draw(title, KD.W / 2, cy - 3, 'GOLD.3',
                 { align: 'center', space: 2, shadow: 'INK.0' });
    if (a > 0.6) {
      KD.Text.draw(sub, KD.W / 2, cy + 11, 'BONE.1',
                   { tiny: true, align: 'center' });
    }
  }

  function hud() {
    const c = COURSES[course];
    /* which course, top left, on a little plaque */
    const lab = c.label + '  -  ' + c.name;
    const w = KD.Text.width(lab, { tiny: true }) + 12;
    R(8, 8, w, 13, 'INK.0');
    R(9, 9, w - 2, 1, 'GOLD.0');
    KD.Screen.frame(8, 8, w, 13, 'GOLD.1');
    KD.Text.draw(lab, 8 + (w >> 1), 11, 'GOLD.3', { align: 'center', tiny: true });

    /* how full he is, and how she is taking it */
    meter(KD.W - 84, 8, 'FULL', full, 'BLOOD.2', 'BLOOD.3');
    meter(KD.W - 84, 21, 'HER', warm, 'CORAL.1', 'CORAL.3');

    /* what the two buttons do */
    if (!KD.touch) {
      const y = KD.H - 22;
      key('E', 'EAT', KD.W / 2 - 62, y, 'BLOOD.3');
      key('F', 'TOAST HER', KD.W / 2 + 6, y, 'CORAL.3');
    }
    if (!sipped && bite >= 1) {
      /* a nudge, once, because nobody presses the second button unprompted */
      const p = Math.abs(Math.sin(t * 3));
      KD.Text.draw('SHE IS RIGHT THERE', KD.W / 2, KD.H - 36,
                   p > 0.5 ? 'CORAL.3' : 'CORAL.1',
                   { align: 'center', tiny: true, shadow: 'INK.0' });
    }
  }

  function meter(x, y, lab, v, low, high) {
    KD.Text.draw(lab, x, y + 1, 'BONE.1', { tiny: true });
    const bx = x + 26, bw2 = 54;
    R(bx - 1, y - 1, bw2 + 2, 9, 'INK.0');
    R(bx, y, bw2, 7, 'INK.2');
    const fw = Math.round(bw2 * Math.max(0, Math.min(1, v)));
    R(bx, y, fw, 7, v > 0.66 ? high : low);
    R(bx, y, fw, 2, 'BONE.2');
    for (let k = 1; k < 4; k++) R(bx + Math.round(bw2 * k / 4), y, 1, 7, 'INK.1');
  }

  function key(k, lab, x, y, col) {
    R(x, y, 13, 13, 'INK.0');
    KD.Screen.frame(x, y, 13, 13, col);
    KD.Text.draw(k, x + 6, y + 3, col, { align: 'center' });
    KD.Text.draw(lab, x + 17, y + 4, 'BONE.1', { tiny: true });
  }

  function layout() {
    BTNS.length = 0;
    const r = 24, pad = 12;
    BTNS.push({ id: 'use', name: 'use', big: true, x: KD.W - 40,
                y: KD.H - pad - r, r: r, label: 'EAT' });
    BTNS.push({ id: 'hit', name: 'hit', x: KD.W - 40 - r - 22,
                y: KD.H - pad - r + 2, r: 19, label: 'TOAST' });
  }

  return { enter, update, draw };
})();
