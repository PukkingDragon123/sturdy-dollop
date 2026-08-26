/* ============================================================
   scenes/gym.js - Brine's Gym. Training is a timing game: a
   marker sweeps a bar, you hit it inside the window, the window
   shrinks as the set goes on. Reps become discipline levels and
   the weight comes off. One button, works on a thumb.
   ============================================================ */
KD.Scenes.gym = (function () {
  const S = KD.State;
  let disc = 'strength';
  /* Three exercises, and each one is a DIFFERENT game rather than the same
     bar with a different label:
       press  a marker sweeps, hit it inside a shrinking window
       sprint alternate two keys in rhythm without breaking tempo
       hold   charge to a target band and release inside it
     Each favours a discipline, and each burns weight its own way. */
  const EXERCISES = [
    { id: 'press',  name: 'Bench Press', disc: 'strength',
      blurb: 'Time the bar. The window shrinks every rep.' },
    { id: 'sprint', name: 'Swim Sprint', disc: 'wind',
      blurb: 'Alternate left and right. Keep the tempo.' },
    { id: 'hold',   name: 'Stone Hold',  disc: 'grit',
      blurb: 'Charge into the band and let go inside it.' }
  ];
  let ex = EXERCISES[0];
  let phase = 'pick';            // pick | set | done
  let pos = 0, dir = 1, speed = 1.1, win = 0.20, target = 0.5;
  let reps = 0, hits = 0, combo = 0, best = 0, score = 0, t = 0, flash = 0, flashCol = 'WHITE';
  const REPS = 12;
  /* sprint: which side is expected next, and how long since the last one */
  let side = 0, beat = 0, tempo = 0.44, lastBeat = 0;
  /* hold: the charge and the band it has to land in */
  let charge = 0, rising = true, bandLo = 0.5, bandHi = 0.7;
  const BTNS = [];

  function enter(args) {
    phase = 'pick'; t = 0; score = 0; reps = 0; hits = 0; combo = 0; best = 0;
    if (args && args.disc) disc = args.disc;
    KD.UI.guard(0.2);
  }
  function begin() {
    phase = 'set';
    disc = ex.disc;
    pos = 0; dir = 1; speed = 1.05; win = 0.22;
    target = 0.5; reps = 0; hits = 0; combo = 0; best = 0; score = 0;
    side = 0; beat = 0; tempo = 0.44; lastBeat = 0;
    charge = 0; rising = true;
    KD.Sfx.play('open');
    newRep();
  }
  function newRep() {
    reps++;
    if (reps > REPS) { finish(); return; }
    /* every exercise gets harder the same way: less room, less time */
    speed = 1.05 + reps * 0.13;
    win = Math.max(0.055, 0.22 - reps * 0.013);
    target = 0.18 + Math.random() * 0.64;
    pos = 0; dir = 1;
    tempo = Math.max(0.16, 0.44 - reps * 0.022);
    lastBeat = 0;
    const w = Math.max(0.09, 0.26 - reps * 0.014);
    bandLo = 0.25 + Math.random() * (0.7 - w);
    bandHi = bandLo + w;
    charge = 0; rising = true;
  }
  function finish() {
    phase = 'done';
    const r = KD.Goal.train(S.S, disc, score);
    /* a real set costs real weight */
    S.burnFat(1.2 + score * 0.02);
    S.addXp(6 + Math.round(score * 0.25));
    S.recalc();
    S.save();
    lastResult = r || {};
    KD.Sfx.play(hits > REPS * 0.6 ? 'levelup' : 'click');
  }
  let lastResult = {};

  /* one scorer, so all three exercises pay out on the same curve */
  function land(quality) {
    const pts = Math.round(4 + quality * 8) * (1 + Math.min(6, combo) * 0.16);
    score += pts; hits++; combo++;
    best = Math.max(best, combo);
    flash = 0.22; flashCol = quality > 0.75 ? 'GOLD.3' : 'KELP.2';
    KD.Fx.num(KD.W / 2 + (Math.random() - 0.5) * 40, KD.H * 0.42, '+' + Math.round(pts),
      quality > 0.75 ? 'GOLD.3' : 'KELP.2');
    KD.Sfx.play(quality > 0.75 ? 'craft' : 'pickup');
  }
  function miss() {
    combo = 0;
    flash = 0.22; flashCol = 'BLOOD.2';
    KD.Sfx.play('deny');
  }

  function press() {
    if (phase !== 'set') return;
    const off = Math.abs(pos - target);
    if (off <= win) land(1 - off / win); else miss();
    newRep();
  }

  /* SPRINT: alternate the two sides. Scored on how close each stroke lands
     to the tempo, so it is a rhythm game and not a mash. */
  function stroke(which) {
    if (phase !== 'set') return;
    if (which !== side) { miss(); newRep(); return; }
    const gap = beat - lastBeat;
    if (lastBeat > 0) {
      const err = Math.abs(gap - tempo) / tempo;
      if (err > 0.85) { miss(); newRep(); return; }
      land(Math.max(0, 1 - err));
    } else land(0.6);
    lastBeat = beat;
    side = 1 - side;
    if (hits + 1 >= reps * 2) newRep();
  }

  /* HOLD: charge climbs while the button is down. Let go inside the band. */
  function release() {
    if (phase !== 'set') return;
    if (charge >= bandLo && charge <= bandHi) {
      const mid = (bandLo + bandHi) / 2;
      land(1 - Math.abs(charge - mid) / ((bandHi - bandLo) / 2 || 1));
    } else miss();
    newRep();
  }


  function layout() {
    BTNS.length = 0;
    if (!KD.touch) { KD.In.buttons(BTNS); return; }
    if (phase === 'set' && ex.id === 'sprint') {
      BTNS.push({ name: 'left',  x: 46, y: KD.H - 44, r: 26, label: 'L', icon: 'ic_arrow_l', big: true });
      BTNS.push({ name: 'right', x: KD.W - 46, y: KD.H - 44, r: 26, label: 'R', icon: 'ic_arrow_r', big: true });
    } else {
      BTNS.push({ name: 'rep', x: KD.W - 40, y: KD.H - 44, r: 26,
                  label: phase === 'set' ? (ex.id === 'hold' ? 'HOLD' : 'REP') : 'GO',
                  icon: 'ic_star', big: true });
    }
    KD.In.buttons(BTNS);
  }

  function update(dt) {
    t += dt;
    layout();
    if (flash > 0) flash -= dt;
    KD.Fx.update(dt);
    KD.Belly.update(dt, S);
    if (KD.In.isHit('Escape')) { KD.Game.go('play', {}); return; }
    if (phase === 'set') {
      const go = KD.In.isHit('Space') || KD.In.isHit('KeyF') || KD.In.actHit('rep') || KD.In.mouse.click;
      if (ex.id === 'press') {
        pos += dir * speed * dt;
        if (pos >= 1) { pos = 1; dir = -1; }
        if (pos <= 0) { pos = 0; dir = 1; combo = 0; newRep(); }   // a whole sweep missed
        if (go) press();
      } else if (ex.id === 'sprint') {
        beat += dt;
        /* let the tempo slip too far and the rep is gone */
        if (lastBeat > 0 && beat - lastBeat > tempo * 2.1) { miss(); newRep(); }
        if (KD.In.isHit('KeyA', 'ArrowLeft') || KD.In.actHit('left')) stroke(0);
        if (KD.In.isHit('KeyD', 'ArrowRight') || KD.In.actHit('right')) stroke(1);
      } else {
        /* hold: the charge runs up, and keeps going past the band if you
           dither - overcharging is a miss, same as undercharging */
        const held = KD.In.isDown('Space', 'KeyF') || KD.In.act('rep') || KD.In.mouse.down;
        if (held) charge = Math.min(1.15, charge + dt * (0.55 + reps * 0.05));
        else if (charge > 0.02) release();
        if (charge >= 1.15) { miss(); newRep(); }
      }
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
    for (let y = 0; y < KD.H; y += 8) {
      for (let x = 0; x < KD.W; x += 8) {
        const alt = (((x / 8) | 0) * 3 + ((y / 8) | 0) * 5) % 7 < 3;
        if (KD.PX.has('in_wall')) {
          KD.PX.blit(ctx, alt ? 'in_wall2' : 'in_wall', x, y, { anchor: false, shade: 1 });
        }
      }
    }
    const floorY = Math.round(KD.H * 0.78);
    for (let x = 0; x < KD.W; x += 8) {
      KD.PX.blit(ctx, 'in_wainscot', x, floorY - 5, { anchor: false, clip: { w: 8, h: 5 } });
      for (let y = floorY; y < KD.H; y += 8) {
        KD.PX.blit(ctx, ((x / 8 | 0) + (y / 8 | 0)) & 1 ? 'in_floor2' : 'in_floor', x, y, { anchor: false });
      }
    }
    KD.Screen.rect(0, floorY - 1, KD.W, 1, 'INK.0');
    const pre = KD.PX.hasAny('pk_idle') ? 'pk_' : 'king_';
    if (KD.PX.hasAny(pre + 'idle')) {
      const kx = Math.round(KD.W * 0.5);
      KD.PX.blit(ctx, KD.PX.frameOf(phase === 'set' ? pre + 'mine' : pre + 'idle', t * 2), kx, floorY + 2);
      /* his belly bounces while he works, which is the whole point of this room */
      if (pre === 'pk_') KD.Belly.draw(ctx, kx, floorY + 2, 1, S);
    }
    if (KD.PX.has('td_dumbbell')) KD.PX.blit(ctx, 'td_dumbbell', 20, floorY - 8, { anchor: false });
    if (KD.PX.has('td_scales')) KD.PX.blit(ctx, 'td_scales', KD.W - 30, floorY - 8, { anchor: false });

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

  function set(ctx, cx) {
    const d = KD.Goal.DISCIPLINES.find((x) => x.id === disc);
    KD.Text.draw(ex.name + '   REP ' + Math.min(reps, REPS) + '/' + REPS, cx, 34,
      d.col, { align: 'center', shadow: 'INK.0' });
    const bw = Math.min(280, KD.W - 60), bx = cx - bw / 2, by = 52;

    if (ex.id === 'press') {
      KD.Screen.rect(bx - 2, by - 2, bw + 4, 18, 'INK.0');
      KD.Screen.rect(bx, by, bw, 14, 'DEEP.0');
      const tw = Math.max(6, Math.round(bw * win * 2));
      const tx = Math.round(bx + bw * target - tw / 2);
      KD.Screen.rect(tx, by, tw, 14, 'KELP.0');
      KD.Screen.rect(tx + (tw >> 1) - 1, by, 2, 14, 'GOLD.3');
      KD.Screen.frame(tx, by, tw, 14, 'KELP.2');
      const mx = Math.round(bx + bw * pos);
      KD.Screen.rect(mx - 1, by - 4, 3, 22, 'BONE.2');
      KD.Screen.rect(mx, by - 6, 1, 4, 'WHITE');

    } else if (ex.id === 'sprint') {
      /* Two pads. The lit one is the stroke you owe, and the ring round it
         closes as the beat runs out, so the tempo is something you SEE. */
      const r = 22;
      [0, 1].forEach((k) => {
        const x = Math.round(cx + (k ? 46 : -46)), y = by + 12;
        const on = side === k;
        KD.Screen.rect(x - r, y - 12, r * 2, 24, on ? 'KELP.0' : 'DEEP.0');
        KD.Screen.frame(x - r, y - 12, r * 2, 24, on ? 'KELP.2' : 'INK.2');
        KD.Text.draw(k ? 'RIGHT' : 'LEFT', x, y - 4, on ? 'WHITE' : 'INK.3',
          { tiny: true, align: 'center' });
        if (on && lastBeat > 0) {
          const f = Math.max(0, 1 - (beat - lastBeat) / (tempo * 2.1));
          KD.Screen.rect(x - r, y + 12, Math.round(r * 2 * f), 3, 'GOLD.2');
        }
      });
      KD.Text.draw('TEMPO ' + (1 / tempo).toFixed(1) + '/s', cx, by + 32, 'WATER.2',
        { tiny: true, align: 'center' });

    } else {
      /* A vertical column: charge climbs it, the band is the target, and
         over the top counts as a miss too. */
      const ch = 88, cwid = 28;
      const bxx = Math.round(cx - cwid / 2), byy = by - 6;
      KD.Screen.rect(bxx - 2, byy - 2, cwid + 4, ch + 4, 'INK.0');
      KD.Screen.rect(bxx, byy, cwid, ch, 'DEEP.0');
      const y0 = Math.round(byy + ch - bandHi * ch);
      const y1 = Math.round(byy + ch - bandLo * ch);
      KD.Screen.rect(bxx, y0, cwid, y1 - y0, 'KELP.0');
      KD.Screen.frame(bxx, y0, cwid, y1 - y0, 'KELP.2');
      const h = Math.round(Math.min(1, charge) * ch);
      KD.Screen.rect(bxx + 3, byy + ch - h, cwid - 6, h, charge > 1 ? 'BLOOD.2' : 'GOLD.2');
      KD.Screen.rect(bxx + 3, byy + ch - h, cwid - 6, 1, 'WHITE');
      KD.Text.draw(charge > 1 ? 'TOO FAR' : 'HOLD', cx, byy + ch + 5,
        charge > 1 ? 'BLOOD.3' : 'BONE.1', { tiny: true, align: 'center' });
    }

    KD.Text.draw('COMBO x' + combo + (best ? '   BEST x' + best : ''), cx, KD.H - 52,
      combo > 2 ? 'GOLD.3' : 'BONE.1', { tiny: true, align: 'center' });
    KD.Text.draw('SCORE ' + Math.round(score), cx, KD.H - 42, 'BONE.2', { align: 'center' });
    const tip = ex.id === 'press' ? (KD.touch ? 'tap REP in the green' : 'SPACE in the green')
              : ex.id === 'sprint' ? (KD.touch ? 'tap the lit pad, in time' : 'A and D, alternating, in time')
              : (KD.touch ? 'hold, release in the green' : 'hold SPACE, release in the green');
    KD.Text.draw(tip, cx, KD.H - 30, 'INK.3', { tiny: true, align: 'center' });
  }

  function results(ctx, cx) {
    const p = KD.UI.titled(cx - 100, 36, 200, 108, 'SET DONE');
    const d = KD.Goal.DISCIPLINES.find((x) => x.id === disc);
    const rows = [
      ['Exercise', ex.name],
      ['Discipline', d.name],
      ['Clean reps', hits + ' / ' + REPS],
      ['Best combo', 'x' + best],
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
