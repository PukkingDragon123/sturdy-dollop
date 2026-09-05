/* ============================================================
   scenes/drill.js - training you actually do.

   A drill used to be one keypress for a fixed +6. That is not
   training, it is a vending machine, and a day spent at it was
   a day spent pressing a button four times.

   So a drill is a round now, and it is the same round every
   time with a different flavour: SIX BEATS come at you and you
   answer each one. How close you are decides what you get, and
   the four drills differ in the shape of the beat rather than
   in the rules:

     SPRINTS   fast and even. Pure rhythm.
     WEIGHT    slow and heavy, and the window is wide - but a
               miss here costs you two beats of recovery.
     HOLDS     the beat gets slower and slower, so the last one
               is a genuine test of patience.
     RING      the beat MOVES - each one lands somewhere else
               across the pen, so you are reading position as
               well as timing.

   Perfect gets you double what the old button did. A bad round
   gets you almost nothing, and the day is gone either way,
   which is what makes it a decision.
   ============================================================ */
KD.Scenes.drill = (function () {
  const P = KD.Pod;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);
  const BEATS = 6;

  let t = 0, d = null, drill = null, phase = 'in', pt = 0;
  let beat = 0, bt = 0, gap = 1, hits = [], scored = false;
  let flash = 0, shake = 0, gained = 0, lvl = 0, pos = 0.5, nextPos = 0.5;

  /* the shape of each drill's beat */
  const SHAPE = {
    sprints: { gap: 0.72, win: 0.13, move: 0, ramp: 0,     icon: 'ic_dr_spd' },
    weight:  { gap: 1.15, win: 0.20, move: 0, ramp: 0,     icon: 'ic_dr_pow' },
    holds:   { gap: 0.80, win: 0.15, move: 0, ramp: 0.16,  icon: 'ic_dr_sta' },
    ring:    { gap: 0.86, win: 0.15, move: 1, ramp: 0,     icon: 'ic_dr_spi' }
  };
  const shape = () => SHAPE[drill.id] || SHAPE.sprints;

  function enter(args) {
    t = 0; pt = 0; phase = 'in';
    beat = 0; bt = 0; hits = []; scored = false;
    flash = 0; shake = 0; gained = 0; lvl = 0;
    pos = 0.5; nextPos = 0.5;
    d = P.active();
    drill = (args && args.drill) || P.DRILLS[0];
    if (!d) { KD.Game.go('pens', {}); return; }
    gap = shape().gap;
    KD.Sfx.play('open');
  }

  const press = () => KD.In.isHit('Space', 'Enter', 'KeyE') ||
                      (KD.In.mouse.click && !KD.UI.blocked()) ||
                      KD.In.actHit('act', 'use');

  function update(dt) {
    t += dt; pt += dt;
    if (flash > 0) flash -= dt;
    if (shake > 0) shake -= dt;
    KD.Fx.update(dt);
    if (KD.Coach.update(dt)) return;
    if (!KD.Coach.active() && phase === 'run' && KD.Coach.tip('drill_go')) return;
    if (KD.Coach.active()) return;

    if (phase === 'in') {
      if (pt > 1.1 || press()) { phase = 'run'; pt = 0; bt = 0; scored = false; }
      return;
    }

    if (phase === 'run') {
      bt += dt;
      const S = shape();
      if (bt >= gap) {
        /* the beat went past without you */
        bt -= gap;
        if (!scored) { hits.push(0); shake = 0.25; KD.Sfx.play('deny'); }
        scored = false;
        beat++;
        pos = nextPos;
        nextPos = S.move ? 0.18 + Math.random() * 0.64 : 0.5;
        gap = S.gap + S.ramp * beat;               /* HOLDS gets slower */
        if (beat >= BEATS) { done(); return; }
      }
      if (press() && !scored) {
        scored = true;
        /* how close to the middle of the beat? */
        const off = Math.abs(bt / gap - 0.5);
        if (off < S.win * 0.5) { hits.push(2); flash = 0.22; KD.Sfx.play('crit'); }
        else if (off < S.win) { hits.push(1); flash = 0.12; KD.Sfx.play('hit'); }
        else { hits.push(0); shake = 0.25; KD.Sfx.play('deny'); }
      }
      return;
    }

    if (phase === 'done') {
      if (pt > 0.7 && press()) { KD.State.save(); KD.Game.go('pens', {}); }
      return;
    }
  }

  /* ---- what the round was worth ---------------------------------------
     The old button gave a flat trainGain. A perfect round gives double
     that, an average one gives about the old number, and a round you
     fumbled gives one - the day is spent either way. */
  function done() {
    phase = 'done'; pt = 0;
    const score = hits.reduce((a, b) => a + b, 0);      // 0 .. BEATS*2
    const k = score / (BEATS * 2);
    const base = P.trainGain(d, drill.stat);
    gained = Math.max(1, Math.round(base * (0.35 + k * 1.65)));
    d[drill.stat] = (d[drill.stat] || 0) + gained;
    d.xp = (d.xp || 0) + 6 + Math.round(k * 10);
    lvl = P.levelCheck(d);
    KD.State.save();
    KD.Sfx.play(k > 0.8 ? 'victory' : 'levelup');
  }

  /* ================================================================
     DRAW - the pen, from above, with a rope down the middle
     ================================================================ */
  function pen() {
    const W = KD.W, H = KD.H;
    const BAND = [[0, 'WATER.0'], [0.18, 'DEEP.2'], [0.52, 'DEEP.1'], [0.84, 'DEEP.0']];
    for (let i = 0; i < BAND.length; i++) {
      const y0 = Math.round(H * BAND[i][0]);
      const y1 = i + 1 < BAND.length ? Math.round(H * BAND[i + 1][0]) : H;
      R(0, y0, W, y1 - y0, BAND[i][1]);
    }
    /* the rope walk along the top, and posts */
    R(0, 22, W, 2, 'SAND.1');
    R(0, 24, W, 1, 'SAND.0');
    for (let x = 6; x < W; x += 46) R(x, 20, 3, 8, 'RUST.1');
    /* silt going past, so the pen has motion in it */
    for (let i = 0; i < 26; i++) {
      const x = Math.round((i * 173 + t * (16 + (i % 4) * 9)) % W);
      const y = Math.round(30 + (i * 61) % (H - 70));
      R(x, y, 2, 1, i % 3 ? 'WATER.0' : 'WATER.2');
    }
    /* the floor of the pen: silted stone, not a beach */
    R(0, H - 16, W, 16, 'INK.1');
    R(0, H - 16, W, 1, 'STONE.0');
    for (let i = 0; i < 18; i++) {
      R((i * 53) % W, H - 13 + (i % 3), 5 + (i % 4), 1, i % 3 ? 'INK.2' : 'SAND.0');
    }
  }

  function draw(ctx) {
    if (!d) return;
    pen();
    const W = KD.W, H = KD.H;
    const S = shape();
    const sh = shake > 0 ? Math.round(Math.sin(shake * 80) * shake * 10) : 0;

    /* ---- the animal, working -------------------------------------- */
    const swing = Math.sin(t * (2.4 / Math.max(0.4, gap))) * 6;
    const dx = Math.round(W * (S.move ? pos : 0.5) - KD.Dolph.W / 2) + sh;
    const dy = Math.round(H * 0.46 - KD.Dolph.H / 2 + swing);
    const pose = phase === 'run' && bt / gap > 0.4 && bt / gap < 0.62 ? 'charge'
               : (Math.floor(t * 2) % 2 ? 'cruise1' : 'cruise0');
    KD.Dolph.draw(ctx, d, pose, dx, dy, {});

    /* ---- THE BEAT: a ring closing on the animal --------------------- */
    if (phase === 'run') {
      const f = bt / gap;
      const off = Math.abs(f - 0.5);
      const r = Math.round(6 + off * 76);
      const col = off < S.win * 0.5 ? 'KELP.3' : off < S.win ? 'GOLD.3' : 'WATER.1';
      const cx = dx + KD.Dolph.W / 2, cy = dy + KD.Dolph.H / 2;
      for (let a = 0; a < 20; a++) {
        const an = a / 20 * Math.PI * 2;
        R(cx + Math.cos(an) * r - 1, cy + Math.sin(an) * r * 0.55 - 1, 3, 3, col);
      }
      /* the target it is closing on */
      for (let a = 0; a < 20; a += 2) {
        const an = a / 20 * Math.PI * 2;
        R(cx + Math.cos(an) * 8 - 1, cy + Math.sin(an) * 8 * 0.55 - 1, 2, 2, 'BONE.0');
      }
    }
    if (flash > 0) {
      const n = Math.round(flash * 40);
      for (let i = 0; i < n; i++) R(0, i * 3, W, 1, 'KELP.1');
    }

    /* ---- the strip: which drill, and the beats you have taken ------- */
    R(0, 0, W, 22, 'INK.0');
    R(0, 22, W, 1, 'GOLD.0');
    if (KD.PX.has(S.icon)) KD.PX.blit(ctx, S.icon, 5, 3, { anchor: false });
    KD.Text.draw(drill.name.toUpperCase(), 25, 3, 'GOLD.3', { shadow: 'INK.0' });
    /* the stat it raises, as its icon and an arrow */
    const SI = { spd: 'ic_spd', pow: 'ic_pow', sta: 'ic_sta', spi: 'ic_spi' }[drill.stat];
    if (KD.PX.has(SI)) KD.PX.blit(ctx, SI, W - 20, 3, { anchor: false });
    for (let k = 0; k < 3; k++) R(W - 30 + k, 13 - k * 3, 3, 2, 'KELP.3');

    /* the beats, as six pips filling in - your whole score at a glance */
    const px = Math.round(W / 2) - BEATS * 9;
    for (let k = 0; k < BEATS; k++) {
      const v = hits[k];
      const x = px + k * 18;
      R(x, 6, 14, 10, 'INK.1');
      KD.Screen.frame(x, 6, 14, 10, k === beat && phase === 'run' ? 'GOLD.3' : 'INK.2');
      if (v === 2) { R(x + 2, 8, 10, 6, 'KELP.3'); R(x + 2, 8, 10, 1, 'KELP.2'); }
      else if (v === 1) { R(x + 2, 8, 10, 6, 'GOLD.2'); }
      else if (v === 0 && k < hits.length) { R(x + 4, 10, 6, 2, 'BLOOD.2'); }
    }

    if (phase === 'in') {
      const s2 = KD.touch ? 'TAP ON THE BEAT' : 'SPACE ON THE BEAT';
      const tw = KD.Text.width(s2) + 18;
      R((W - tw) / 2, H - 46, tw, 16, 'INK.0');
      KD.Screen.frame((W - tw) / 2, H - 46, tw, 16, 'GOLD.2');
      KD.Text.draw(s2, W / 2, H - 42, 'GOLD.3', { align: 'center', shadow: 'INK.0' });
    }

    if (phase === 'done') card(ctx);
    if (KD.touch) KD.UI.touchPad([], { noStick: true });
    KD.Coach.draw();
  }

  /* the card at the end: the gain, as a bar rather than a paragraph */
  function card(ctx) {
    const w = Math.min(230, KD.W - 40), h = 86;
    const x = Math.round((KD.W - w) / 2), y = Math.round((KD.H - h) / 2);
    const k = KD.Juice.outCubic(Math.min(1, pt / 0.3));
    const yy = Math.round(y + (1 - k) * 10);
    const score = hits.reduce((a, b) => a + b, 0);
    const perfect = score >= BEATS * 2;
    R(x - 2, yy - 2, w + 4, h + 4, 'INK.0');
    R(x, yy, w, h, 'DEEP.0');
    R(x + 1, yy + 1, w - 2, 1, 'DEEP.2');
    KD.Screen.frame(x, yy, w, h, perfect ? 'KELP.3' : 'GOLD.0');
    KD.Text.draw(perfect ? 'PERFECT' : (score > BEATS ? 'GOOD WORK' : 'SLOPPY'),
                 KD.W / 2, yy + 6, perfect ? 'KELP.3' : (score > BEATS ? 'GOLD.3' : 'BLOOD.3'),
                 { align: 'center', space: 1, shadow: 'INK.0' });
    /* the stat, its icon, and the gain as a row of pips */
    const SI = { spd: 'ic_spd', pow: 'ic_pow', sta: 'ic_sta', spi: 'ic_spi' }[drill.stat];
    if (KD.PX.has(SI)) KD.PX.blit(ctx, SI, x + 12, yy + 24, { anchor: false });
    KD.Text.draw('+' + gained, x + 34, yy + 26, 'KELP.3', { shadow: 'INK.0' });
    KD.Text.draw(String(d[drill.stat]), x + w - 12, yy + 26, 'BONE.2',
                 { align: 'right', shadow: 'INK.0' });
    R(x + 12, yy + 42, w - 24, 4, 'INK.1');
    R(x + 12, yy + 42, Math.round((w - 24) * Math.min(1, d[drill.stat] / 100)), 4, 'KELP.2');
    if (lvl > 0) {
      KD.Text.draw('LEVEL ' + d.lvl + '  -  ' + lvl + ' POINT' + (lvl > 1 ? 'S' : ''),
                   KD.W / 2, yy + 54, 'GOLD.3', { tiny: true, align: 'center' });
    }
    KD.Text.draw(KD.touch ? 'tap to go back' : 'SPACE to go back',
                 KD.W / 2, yy + h - 12, 'INK.3', { tiny: true, align: 'center' });
  }

  return { enter, update, draw, _hits: () => hits, _phase: () => phase };
})();
