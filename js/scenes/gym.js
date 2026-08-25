/* ============================================================
   scenes/gym.js - Brine's Gym. Training is a timing game: a
   marker sweeps a bar, you hit it inside the window, the window
   shrinks as the set goes on. Reps become discipline levels and
   the weight comes off. One button, works on a thumb.
   ============================================================ */
KD.Scenes.gym = (function () {
  const S = KD.State;
  let disc = 'strength';
  let phase = 'pick';            // pick | set | done
  let pos = 0, dir = 1, speed = 1.1, win = 0.20, target = 0.5;
  let reps = 0, hits = 0, combo = 0, best = 0, score = 0, t = 0, flash = 0, flashCol = 'WHITE';
  const REPS = 12;
  const BTNS = [];

  function enter(args) {
    phase = 'pick'; t = 0; score = 0; reps = 0; hits = 0; combo = 0; best = 0;
    if (args && args.disc) disc = args.disc;
    KD.UI.guard(0.2);
  }
  function begin() {
    phase = 'set';
    pos = 0; dir = 1; speed = 1.05; win = 0.22;
    target = 0.5; reps = 0; hits = 0; combo = 0; best = 0; score = 0;
    KD.Sfx.play('open');
  }
  function newRep() {
    reps++;
    if (reps > REPS) { finish(); return; }
    /* each rep is faster and the window is tighter - a set should get hard */
    speed = 1.05 + reps * 0.13;
    win = Math.max(0.055, 0.22 - reps * 0.013);
    target = 0.18 + Math.random() * 0.64;
    pos = 0; dir = 1;
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

  function press() {
    if (phase !== 'set') return;
    const off = Math.abs(pos - target);
    if (off <= win) {
      const quality = 1 - off / win;              // dead centre is worth triple
      const pts = Math.round(4 + quality * 8) * (1 + Math.min(6, combo) * 0.16);
      score += pts; hits++; combo++;
      best = Math.max(best, combo);
      flash = 0.22; flashCol = quality > 0.75 ? 'GOLD.3' : 'KELP.2';
      KD.Fx.num(KD.W / 2 + (Math.random() - 0.5) * 40, KD.H * 0.42, '+' + Math.round(pts),
        quality > 0.75 ? 'GOLD.3' : 'KELP.2');
      KD.Sfx.play(quality > 0.75 ? 'craft' : 'pickup');
    } else {
      combo = 0;
      flash = 0.22; flashCol = 'BLOOD.2';
      KD.Sfx.play('deny');
    }
    newRep();
  }

  function layout() {
    BTNS.length = 0;
    if (!KD.touch) { KD.In.buttons(BTNS); return; }
    BTNS.push({ name: 'rep', x: KD.W - 40, y: KD.H - 44, r: 26,
                label: phase === 'set' ? 'REP' : 'GO', icon: 'ic_star', big: true });
    KD.In.buttons(BTNS);
  }

  function update(dt) {
    t += dt;
    layout();
    if (flash > 0) flash -= dt;
    KD.Fx.update(dt);
    if (KD.In.isHit('Escape')) { KD.Game.go('play', {}); return; }
    if (phase === 'set') {
      pos += dir * speed * dt;
      if (pos >= 1) { pos = 1; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; combo = 0; newRep(); }   // a whole sweep missed
      if (KD.In.isHit('Space') || KD.In.isHit('KeyF') || KD.In.actHit('rep') || KD.In.mouse.click) press();
    } else if (phase === 'done') {
      if (KD.In.isHit('Space') || KD.In.isHit('Enter') || KD.In.actHit('rep')) { phase = 'pick'; }
    }
  }

  function draw(ctx) {
    KD.Screen.clear('INK.1');
    /* the gym: a lit room, a rack of weights, and a mirror the king avoids */
    for (let y = 0; y < KD.H; y += 8) {
      for (let x = 0; x < KD.W; x += 8) {
        if (KD.PX.has('in_wall_panel')) KD.PX.blit(ctx, 'in_wall_panel', x, y, { anchor: false, shade: 2 });
      }
    }
    const floorY = Math.round(KD.H * 0.78);
    KD.Screen.rect(0, floorY, KD.W, KD.H - floorY, 'WOOD.1');
    KD.Screen.rect(0, floorY, KD.W, 1, 'WOOD.3');
    if (KD.PX.hasAny('king_idle')) {
      KD.PX.blit(ctx, KD.PX.frameOf(phase === 'set' ? 'king_mine' : 'king_idle', t * 2),
        Math.round(KD.W * 0.5), floorY + 2);
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
    const p = KD.UI.titled(cx - 110, 34, 220, 108, 'PICK A DISCIPLINE');
    KD.Goal.DISCIPLINES.forEach((d, i) => {
      const y = p.iy + i * 28;
      const lvl = S.S.train[d.id] || 0;
      const xp = S.S.trainXp[d.id] || 0, need = KD.Goal.cost(lvl);
      const on = disc === d.id;
      if (KD.UI.button(cx - 102, y, 96, 24, d.name, { on })) { disc = d.id; KD.Sfx.play('click'); }
      KD.Text.draw('LV ' + lvl + '/' + d.max, cx + 2, y + 2, lvl >= d.max ? 'GOLD.3' : 'BONE.2', { tiny: true });
      KD.UI.bar(cx + 2, y + 11, 96, 6, lvl >= d.max ? 1 : xp / need, d.col);
      if (on) KD.Text.draw(d.stat, cx - 102, y + 26, 'INK.3', { tiny: true, max: 200 });
    });
    if (KD.UI.button(cx - 54, 148, 108, 20, 'START A SET', { key: 'Enter' })) begin();
    KD.Text.draw('a set is 12 reps  -  time the bar  -  the window shrinks', cx, 172,
      'INK.3', { tiny: true, align: 'center' });
    const total = KD.Goal.trainedTotal(S.S);
    KD.Text.draw('TRAINED ' + total + ' levels', cx, 184, 'WATER.2', { tiny: true, align: 'center' });
  }

  function set(ctx, cx) {
    const d = KD.Goal.DISCIPLINES.find((x) => x.id === disc);
    KD.Text.draw(d.name + '   REP ' + Math.min(reps, REPS) + '/' + REPS, cx, 34,
      d.col, { align: 'center', shadow: 'INK.0' });
    /* the bar */
    const bw = Math.min(280, KD.W - 60), bx = cx - bw / 2, by = 52;
    KD.Screen.rect(bx - 2, by - 2, bw + 4, 18, 'INK.0');
    KD.Screen.rect(bx, by, bw, 14, 'DEEP.0');
    /* the target window */
    const tw = Math.max(6, Math.round(bw * win * 2));
    const tx = Math.round(bx + bw * target - tw / 2);
    KD.Screen.rect(tx, by, tw, 14, 'KELP.0');
    KD.Screen.rect(tx + (tw >> 1) - 1, by, 2, 14, 'GOLD.3');
    KD.Screen.frame(tx, by, tw, 14, 'KELP.2');
    /* the sweeping marker */
    const mx = Math.round(bx + bw * pos);
    KD.Screen.rect(mx - 1, by - 4, 3, 22, 'BONE.2');
    KD.Screen.rect(mx, by - 6, 1, 4, 'WHITE');
    KD.Text.draw('COMBO x' + combo + (best ? '   BEST x' + best : ''), cx, 74,
      combo > 2 ? 'GOLD.3' : 'BONE.1', { tiny: true, align: 'center' });
    KD.Text.draw('SCORE ' + Math.round(score), cx, 84, 'BONE.2', { align: 'center' });
    KD.Text.draw(KD.touch ? 'tap REP in the green' : 'SPACE in the green', cx, KD.H - 30,
      'INK.3', { tiny: true, align: 'center' });
  }

  function results(ctx, cx) {
    const p = KD.UI.titled(cx - 100, 40, 200, 96, 'SET DONE');
    const d = KD.Goal.DISCIPLINES.find((x) => x.id === disc);
    const rows = [
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
