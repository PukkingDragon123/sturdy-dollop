/* ============================================================
   scenes/gym.js - Brine's Gym. A set is an ANIMATED SET: you
   pick the exercise, he does the twelve reps, and the weight
   comes off. There is no timing check in it.

   It used to be three separate timing games - a sweeping bar,
   an alternating rhythm, and a charge-and-release column. Three
   of them, in the one room you have to keep coming back to for
   the whole game, each one a wall between you and the thing you
   came here for. The exercise you pick still decides which
   discipline goes up, which is the only choice that was ever
   doing any work; the rest of it is the king lifting, sweating,
   and getting lighter, which is what you came to watch.
   ============================================================ */
KD.Scenes.gym = (function () {
  const S = KD.State;
  let disc = 'strength';
  /* Three exercises. The one you pick decides which discipline goes up and
     nothing else - which was always the only choice in this room that was
     doing any work. */
  const EXERCISES = [
    { id: 'press',  name: 'Bench Press', disc: 'strength',
      blurb: 'Twelve on the bar. It is the shoulders that go first.' },
    { id: 'sprint', name: 'Swim Sprint', disc: 'wind',
      blurb: 'Twelve lengths. He hates every one of them.' },
    { id: 'hold',   name: 'Stone Hold',  disc: 'grit',
      blurb: 'Hold the stone until his arms give out. Twelve times.' }
  ];
  let ex = EXERCISES[0];
  let phase = 'pick';            // pick | set | done
  let reps = 0, t = 0, setT = 0, flash = 0, flashCol = 'WHITE';
  let score = 0, lastResult = {};
  const REPS = 12;
  const REP_T = 0.34;            // one rep, in seconds
  const sweat = [];
  const BTNS = [];

  function enter(args) {
    phase = 'pick'; t = 0; setT = 0; score = 0; reps = 0; sweat.length = 0;
    if (args && args.disc) disc = args.disc;
    KD.UI.guard(0.2);
  }
  function begin() {
    phase = 'set';
    disc = ex.disc;
    reps = 0; setT = 0; score = 0; sweat.length = 0;
    KD.Sfx.play('open');
  }

  /* one rep lands: a grunt, some sweat, and points. The payout scales with
     the level you already have, so a set is worth more the fitter he is -
     that is the progression the timing check used to be standing in for. */
  function rep() {
    reps++;
    const lvl = S.S.train[disc] || 0;
    const pts = 7 + lvl * 1.4;
    score += pts;
    flash = 0.16; flashCol = 'KELP.2';
    for (let i = 0; i < 4; i++) {
      sweat.push({ x: (Math.random() - 0.5) * 22, y: -20 - Math.random() * 14,
                   vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 40,
                   t: 0.5 + Math.random() * 0.3 });
    }
    KD.Fx.num(KD.W / 2 + (Math.random() - 0.5) * 44, KD.H * 0.44,
              '+' + Math.round(pts), reps === REPS ? 'GOLD.3' : 'KELP.2');
    KD.Sfx.play(reps === REPS ? 'craft' : 'step');
    if (reps >= REPS) finish();
  }

  function finish() {
    phase = 'done';
    const r = KD.Goal.train(S.S, disc, score);
    S.burnFat(1.2 + score * 0.02);
    S.addXp(6 + Math.round(score * 0.25));
    S.recalc();
    S.save();
    lastResult = r || {};
    KD.Sfx.play('levelup');
  }

  function layout() {
    BTNS.length = 0;
    if (!KD.touch) { KD.In.buttons(BTNS); return; }
    if (phase !== 'set') {
      BTNS.push({ name: 'rep', x: KD.W - 40, y: KD.H - 44, r: 26,
                  label: 'GO', icon: 'ic_star', big: true });
    }
    KD.In.buttons(BTNS);
  }

  function update(dt) {
    t += dt;
    layout();
    if (flash > 0) flash -= dt;
    KD.Fx.update(dt);
    KD.Belly.update(dt, S);
    for (let i = sweat.length - 1; i >= 0; i--) {
      const d = sweat[i];
      d.t -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 190 * dt;
      if (d.t <= 0) sweat.splice(i, 1);
    }
    if (KD.In.isHit('Escape')) { KD.Game.go('play', {}); return; }
    if (phase === 'set') {
      /* the set runs itself. Nothing to press, and nothing to lose. */
      setT += dt;
      while (reps < REPS && setT >= (reps + 1) * REP_T) rep();
    } else if (phase === 'done') {
      if (KD.In.isHit('Space') || KD.In.isHit('Enter') || KD.In.actHit('rep')) { phase = 'pick'; }
    }
  }

  function draw(ctx) {
    KD.Screen.clear('INK.1');
    /* the gym: a lit room, a rack of weights, and a mirror the king avoids */
    /* in_wall_panel never existed, so this room had been a flat navy void.
       It is a room inside an apple - use the same flesh wall and plank
       wainscot the other interiors are built from. */
    /* The wall used to be the raw fruit-flesh tile at shade 1, which across
       a whole screen came out bright pink with speckles in it - salami, not
       a gym. Three steps down the ramp it is a dim room with a texture in
       it, which is what the inside of a hollowed fruit should look like. */
    for (let y = 0; y < KD.H; y += 8) {
      for (let x = 0; x < KD.W; x += 8) {
        const alt = (((x / 8) | 0) * 3 + ((y / 8) | 0) * 5) % 7 < 3;
        if (KD.PX.has('in_wall')) {
          KD.PX.blit(ctx, alt ? 'in_wall2' : 'in_wall', x, y, { anchor: false, shade: 3 });
        }
      }
    }
    const floorY = Math.round(KD.H * 0.78);
    /* a lamp. It had a cone of light under it, five solid bands widening
       down the wall, and they read as three purple stripes hanging in the
       air - the same lesson as the god rays, one room smaller. The fixture
       stays; the cone does not. */
    const lx = Math.round(KD.W / 2);
    KD.Screen.rect(lx - 8, 22, 16, 4, 'INK.0');
    KD.Screen.rect(lx - 6, 24, 12, 3, 'GOLD.2');
    KD.Screen.rect(lx - 4, 26, 8, 2, 'GOLD.3');
    KD.Screen.rect(lx - 1, 12, 2, 11, 'INK.2');
    for (let x = 0; x < KD.W; x += 8) {
      KD.PX.blit(ctx, 'in_wainscot', x, floorY - 5, { anchor: false, clip: { w: 8, h: 5 } });
      for (let y = floorY; y < KD.H; y += 8) {
        KD.PX.blit(ctx, ((x / 8 | 0) + (y / 8 | 0)) & 1 ? 'in_floor2' : 'in_floor', x, y,
                   { anchor: false, shade: 2 });
      }
    }
    KD.Screen.rect(0, floorY - 1, KD.W, 1, 'INK.0');
    /* a rubber mat he stands on, so the room has a middle */
    KD.Screen.rect(lx - 46, floorY, 92, 6, 'INK.1');
    KD.Screen.rect(lx - 46, floorY, 92, 1, 'INK.2');
    for (let k = 0; k < 9; k++) KD.Screen.rect(lx - 42 + k * 10, floorY + 2, 5, 2, 'INK.0');
    /* a rack of plates on the left, a bench on the right */
    rack(20, floorY);
    bench(KD.W - 62, floorY);
    const pre = KD.PX.hasAny('pk_idle') ? 'pk_' : 'king_';
    if (KD.PX.hasAny(pre + 'idle')) {
      const kx = Math.round(KD.W * 0.5);
      /* he works through it: the mine cycle at rep speed, idling otherwise */
      const cyc = phase === 'set' ? (setT / REP_T) * 0.5 : t * 0.4;
      KD.PX.blit(ctx, KD.PX.frameOf(phase === 'set' ? pre + 'mine' : pre + 'idle', cyc), kx, floorY + 2);
      /* his belly bounces while he works, which is the whole point of this room */
      if (pre === 'pk_') KD.Belly.draw(ctx, kx, floorY + 2, 1, S);
      /* sweat, thrown off him on every rep */
      for (const d of sweat) {
        KD.Screen.rect(Math.round(kx + d.x), Math.round(floorY + 2 + d.y), 2, 2,
                       d.t > 0.25 ? 'WATER.3' : 'WATER.2');
      }
    }

    const cx = KD.W / 2;
    KD.Text.draw("BRINE'S GYM", cx, 8, 'GOLD.3', { align: 'center', space: 1, shadow: 'INK.0' });
    KD.Text.draw(Math.round(S.S.weight) + ' KG', cx, 20, 'SAND.2', { align: 'center', shadow: 'INK.0' });

    if (phase === 'pick') pick(ctx, cx);
    else if (phase === 'set') set(ctx, cx);
    else results(ctx, cx);

    KD.Fx.draw(ctx, { x: 0, y: 0 });
    if (flash > 0) KD.Dither.fill(ctx, 0, 0, KD.W, KD.H, flashCol, flash * 1.1);
    KD.UI.touchPad(BTNS);
    if (KD.UI.button(4, KD.H - 15, 44, 12, 'LEAVE', { key: 'Escape' })) KD.Game.go('play', {});
  }

  /* a weight rack: two uprights, three bars, and plates on them */
  function rack(x, fy) {
    const R = KD.Screen.rect;
    R(x, fy - 40, 3, 40, 'INK.2'); R(x + 26, fy - 40, 3, 40, 'INK.2');
    R(x, fy - 40, 3, 40, 'INK.2'); R(x + 1, fy - 40, 1, 40, 'INK.3');
    R(x - 2, fy - 2, 33, 3, 'INK.1');
    for (let k = 0; k < 3; k++) {
      const y = fy - 34 + k * 11;
      R(x + 2, y, 25, 2, 'STONE.1');
      R(x + 2, y, 25, 1, 'STONE.3');
      const w = 5 - k;                       /* heaviest at the bottom */
      R(x + 1, y - w, 4, w * 2 + 2, 'STONE.0');
      R(x + 1, y - w, 4, 1, 'STONE.2');
      R(x + 24, y - w, 4, w * 2 + 2, 'STONE.0');
      R(x + 24, y - w, 4, 1, 'STONE.2');
    }
  }

  /* a bench, seen from the side */
  function bench(x, fy) {
    const R = KD.Screen.rect;
    R(x, fy - 16, 42, 5, 'BLOOD.0');
    R(x, fy - 16, 42, 1, 'BLOOD.2');
    R(x + 3, fy - 11, 4, 11, 'INK.2');
    R(x + 35, fy - 11, 4, 11, 'INK.2');
    R(x + 1, fy - 1, 40, 2, 'INK.1');
  }

  function pick(ctx, cx) {
    /* You choose the EXERCISE; the exercise chooses the discipline. Picking
       a stat and then always playing the same game made two of the three
       disciplines pointless. */
    const p = KD.UI.titled(cx - 116, 30, 232, 116, 'PICK AN EXERCISE');
    EXERCISES.forEach((e, i) => {
      const y = p.iy + i * 30;
      const d = KD.Goal.DISCIPLINES.find((x) => x.id === e.disc);
      const lvl = S.S.train[e.disc] || 0;
      const xp = S.S.trainXp[e.disc] || 0, need = KD.Goal.cost(lvl);
      const on = ex.id === e.id;
      if (KD.UI.button(cx - 108, y, 104, 26, e.name, { on })) { ex = e; disc = e.disc; KD.Sfx.play('click'); }
      KD.Text.draw(d.name + '  LV ' + lvl + '/' + d.max, cx + 2, y + 1,
        lvl >= d.max ? 'GOLD.3' : 'BONE.2', { tiny: true });
      KD.UI.bar(cx + 2, y + 10, 104, 6, lvl >= d.max ? 1 : xp / need, d.col);
      KD.Text.draw(e.blurb, cx + 2, y + 19, on ? 'BONE.1' : 'INK.3', { tiny: true, max: 108 });
    });
    if (KD.UI.button(cx - 54, 152, 108, 20, 'START A SET', { key: 'Enter' })) begin();
    const total = KD.Goal.trainedTotal(S.S);
    KD.Text.draw('a set is 12 reps  -  TRAINED ' + total + ' levels', cx, 178,
      'WATER.2', { tiny: true, align: 'center' });
  }

  /* What a set looks like now: who is training, which rep he is on, and
     twelve pips filling in. No target, no window, nothing to hit. */
  function set(ctx, cx) {
    const d = KD.Goal.DISCIPLINES.find((x) => x.id === disc);
    KD.Text.draw(ex.name, cx, 34, d.col, { align: 'center', shadow: 'INK.0' });
    const bw = Math.min(200, KD.W - 60), bx = Math.round(cx - bw / 2), by = 50;
    KD.Screen.rect(bx - 3, by - 3, bw + 6, 18, 'INK.0');
    KD.Screen.frame(bx - 3, by - 3, bw + 6, 18, 'GOLD.0');
    KD.Screen.rect(bx, by, bw, 12, 'DEEP.0');
    const done = Math.min(1, setT / (REPS * REP_T));
    KD.Screen.rect(bx, by, Math.round(bw * done), 12, d.col);
    KD.Screen.rect(bx, by, Math.round(bw * done), 1, 'WHITE');
    /* twelve pips, so a rep is a thing that visibly happened */
    for (let k = 0; k < REPS; k++) {
      const px = bx + 3 + Math.round(k * (bw - 8) / REPS);
      KD.Screen.rect(px, by + 15, 4, 4, k < reps ? 'GOLD.3' : 'INK.2');
    }
    KD.Text.draw('REP ' + Math.min(reps, REPS) + ' / ' + REPS, cx, by + 23,
                 'BONE.2', { align: 'center', tiny: true, shadow: 'INK.0' });
    KD.Text.draw(String(Math.round(score)), cx, KD.H - 44, 'GOLD.3',
                 { align: 'center', shadow: 'INK.0' });
  }

  function results(ctx, cx) {
    const p = KD.UI.titled(cx - 100, 36, 200, 108, 'SET DONE');
    const d = KD.Goal.DISCIPLINES.find((x) => x.id === disc);
    const rows = [
      ['Exercise', ex.name],
      ['Discipline', d.name],
      ['Reps', REPS + ' / ' + REPS],
      ['Score', String(Math.round(score))],
      ['Levels gained', String(lastResult.gained || 0)],
      ['Weight now', Math.round(S.S.weight) + ' kg']
    ];
    rows.forEach((r, i) => {
      KD.Text.draw(r[0], cx - 92, p.iy + i * 11, 'BONE.0', { tiny: true });
      KD.Text.draw(r[1], cx + 92, p.iy + i * 11, i === 4 && lastResult.gained ? 'GOLD.3' : 'BONE.2',
        { tiny: true, align: 'right' });
    });
    if (KD.UI.button(cx - 54, 142, 108, 18, 'ANOTHER SET', { key: 'Enter' })) begin();
    if (KD.UI.button(cx - 54, 164, 108, 16, 'DONE')) KD.Game.go('play', {});
  }
  return { enter, update, draw };
})();
