/* ============================================================
   feeding.js - the feeding minigame. Your fish drop from the
   surface; steer your mount to catch them. Combos multiply EXP,
   dropped fish are gone.
   ============================================================ */
KA.Scenes.feeding = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL, S = KA.S;
  let phase = 'ready', queue = [], items = [], pet, petX = 0, petV = 0, t = 0;
  let combo = 0, best = 0, gained = 0, caughtN = 0, missed = 0, timer = 0, dropT = 0, res = null;

  function enter() {
    phase = 'ready'; t = 0; items = []; combo = 0; best = 0; gained = 0; caughtN = 0; missed = 0;
    petX = KA.W / 2; petV = 0; res = null;
    pet = S.active();
    queue = [];
    const D0 = S.D;
    for (const id in D0.inv.fish) for (let i = 0; i < D0.inv.fish[id]; i++) queue.push({ kind: 'fish', id });
    for (const id in D0.inv.food) for (let i = 0; i < D0.inv.food[id]; i++) queue.push({ kind: 'food', id });
    queue = U.shuffle(queue).slice(0, 40);
    timer = 4 + queue.length * 0.85;
  }

  function start() {
    if (!queue.length) { KA.UI.toast('Nothing to feed. Catch some fish!', P.coral); KA.A.play('deny'); return; }
    phase = 'play'; dropT = 0.4;
    // the inventory is committed the moment the round starts
    const D0 = S.D;
    for (const q of queue) {
      if (q.kind === 'fish') S.takeFish(q.id, 1);
      else S.takeItem('food', q.id, 1);
    }
    KA.A.play('whistle');
  }

  function update(dt) {
    t += dt;
    layout();
    const v = KA.In.padVec();
    if (phase === 'play') {
      const st = KA.Pet.stats(pet);
      const spd = 190 + st.spd * 3;
      petV = U.damp(petV, v.x * spd, 0.0006, dt);
      if (!KA.touch && KA.In.mouse.down) petV = U.damp(petV, (KA.In.mouse.x - petX) * 5, 0.002, dt);
      petX = U.clamp(petX + petV * dt, 40, KA.W - 40);
      timer -= dt;
      dropT -= dt;
      if (dropT <= 0 && queue.length) {
        dropT = U.rnd(0.35, 0.75);
        const q = queue.pop();
        const meta = q.kind === 'fish' ? KA.Items.fishById[q.id] : KA.Items.fById[q.id];
        items.push({ x: U.rnd(50, KA.W - 50), y: -10, vy: U.rnd(70, 120), q, meta,
          rot: U.rnd(-1, 1), spin: U.rnd(-3, 3), bad: false });
      }
      // an occasional boot, because the sea is like that
      if (U.chance(dt * 0.35)) items.push({ x: U.rnd(50, KA.W - 50), y: -10, vy: U.rnd(90, 140),
        q: { kind: 'junk' }, meta: { name: 'Old Boot', col: '#6d4a24' }, rot: 0, spin: 2, bad: true });
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.vy += 46 * dt;
        it.y += it.vy * dt;
        it.rot += it.spin * dt;
        if (Math.abs(it.x - petX) < 38 && it.y > KA.H - 112 && it.y < KA.H - 50) {
          items.splice(i, 1);
          if (it.bad) {
            combo = 0;
            KA.A.play('deny');
            KA.FX.text(petX, KA.H - 130, 'BLEH', P.coral, { size: 20 });
            KA.FX.shake(4);
          } else {
            combo++; best = Math.max(best, combo); caughtN++;
            const fav = KA.Pets.byId[pet.sp].loves === it.q.id;
            const base = it.q.kind === 'fish' ? it.meta.exp : it.meta.exp;
            const mult = 1 + Math.min(2.5, combo * 0.12);
            const got = Math.round(base * mult * (fav ? 1.5 : 1));
            gained += got;
            KA.A.play(combo % 5 === 0 ? 'happy' : 'gulp');
            KA.FX.text(petX, KA.H - 132, '+' + got + (fav ? ' FAVOURITE!' : ''), fav ? P.pink : P.cyan,
              { size: fav ? 20 : 16 });
            if (combo > 2) KA.FX.text(petX, KA.H - 112, 'x' + combo, P.gold, { size: 14 });
            KA.FX.burst(petX, KA.H - 100, 8, { col: [it.meta.col, '#fff'], speed: 110 });
          }
        } else if (it.y > KA.H - 30) {
          items.splice(i, 1);
          if (!it.bad) { missed++; combo = 0; KA.FX.text(it.x, KA.H - 60, 'missed', P.dim, { size: 12 }); }
        }
      }
      if (timer <= 0 || (!queue.length && !items.length)) finish();
    }
    if (KA.In.isPressed('Escape') && phase !== 'play') KA.Game.go('petview', {});
  }

  function finish() {
    phase = 'done';
    const r = KA.Pet.feed(pet, gained, false);
    res = { exp: gained, levels: r.levels, tokens: r.tokens, caught: caughtN, missed, best };
    S.D.stats.fed += caughtN;
    if (r.levels) { KA.A.play('levelup'); KA.FX.flash(P.cyan, 0.3); }
    S.save();
  }

  const BTNS = [];
  function layout() {
    if (!KA.touch) { KA.In.defineButtons([]); return; }
    BTNS.length = 0;
    KA.In.defineButtons(BTNS);
  }

  function draw(ctx) {
    D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H,
      [[0, '#7fd8f0'], [0.3, '#2f93c4'], [1, '#0a3c5c']], 'fdbg'));
    // stable pool walls
    D.rect(ctx, 0, 0, 18, KA.H, 'rgba(4,18,29,.5)');
    D.rect(ctx, KA.W - 18, 0, 18, KA.H, 'rgba(4,18,29,.5)');
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 6; i++) D.poly(ctx, [[i * 140, 0], [i * 140 + 30, 0], [i * 140 + 60, KA.H], [i * 140 - 6, KA.H]], '#fff');
    ctx.globalAlpha = 1;
    // surface
    D.path(ctx, () => {
      ctx.moveTo(0, 34);
      for (let x = 0; x <= KA.W; x += 16) ctx.lineTo(x, 28 + Math.sin(x * 0.04 + t * 3) * 4);
      ctx.lineTo(KA.W, 0); ctx.lineTo(0, 0); ctx.closePath();
    }, 'rgba(223,246,255,.4)');
    // floor
    D.rect(ctx, 0, KA.H - 26, KA.W, 26, D.vgrad(ctx, 0, KA.H - 26, 0, KA.H, [[0, '#c9a24a'], [1, '#8a6a2a']], 'fdf'));

    // falling items
    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      if (it.bad) {
        D.rr(ctx, -9, -7, 18, 14, 4, '#6d4a24');
        D.rr(ctx, -9, 1, 22, 6, 3, '#4f3418');
      } else if (it.q.kind === 'fish') {
        KA.Rig.sea.creature(ctx, { kind: 'fish', x: 0, y: 0, s: 1.15, dir: 1, ph: it.x, hue: (it.meta.value % 5) / 5 });
      } else {
        D.circle(ctx, 0, 0, 10, it.meta.col);
        D.circle(ctx, -3, -3, 3.5, 'rgba(255,255,255,.6)');
      }
      ctx.restore();
      D.glow(ctx, it.x, it.y, 16, it.bad ? '#6d4a24' : (it.meta.col || '#fff'), 0.2);
    }
    // the mount
    const bob = Math.sin(t * 3) * 4;
    KA.Rig.pet.draw(ctx, pet, petX, KA.H - 78 + bob, { scale: 1.15, flipX: petV < -8,
      speed: 0.4 + Math.abs(petV) / 120, talk: phase === 'play', tag: 'feed' });
    // catch aura
    D.glow(ctx, petX, KA.H - 86 + bob, 52, '#7fe8ff', 0.22);
    ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.15;
    D.ellipse(ctx, petX, KA.H - 84, 36, 12, 0, null, { line: 'rgba(127,232,255,.7)', lineW: 2 });
    ctx.globalAlpha = 1;

    /* hud */
    D.rr(ctx, 8, 8, 220, 34, 9, 'rgba(4,18,29,.72)');
    T.draw(ctx, 'FEEDING ' + pet.name, 16, 12, P.cyan, { size: 15, weight: 900 });
    T.draw(ctx, 'EXP ' + gained + '   combo x' + combo, 16, 28, P.gold, { size: 11, weight: 700 });
    D.rr(ctx, KA.W - 150, 8, 142, 34, 9, 'rgba(4,18,29,.72)');
    T.draw(ctx, 'LEFT ' + (queue.length + items.length), KA.W - 140, 12, P.text, { size: 13, weight: 800 });
    if (phase === 'play') KA.UI.bar(ctx, KA.W - 140, 28, 122, 9, U.clamp(timer / 40, 0, 1), { col: P.amber });

    if (phase === 'ready') {
      const p = KA.UI.panel(ctx, KA.W / 2 - 180, 70, 360, 180, 'FEEDING TIME');
      const lines = queue.length
        ? ['Your whole bag gets tipped into the pool.',
           'Steer ' + pet.name + ' and catch it before it hits the floor.',
           'Chains multiply the EXP. Boots do not.',
           '', 'Ready: ' + queue.length + ' items']
        : ['Your bag is empty.', 'Go spear something first.'];
      lines.forEach((l, i) => T.draw(ctx, l, KA.W / 2, p.cy + i * 20, i === 4 ? P.gold : P.text,
        { size: 14, align: 'center', weight: i === 4 ? 900 : 600 }));
      if (queue.length && KA.UI.button(ctx, KA.W / 2 - 80, 214, 160, 40, 'TIP IT IN', { tone: 'green', size: 18, key: 'Space' })) start();
      if (KA.UI.button(ctx, KA.W / 2 - 60, KA.H - 46, 120, 34, 'BACK', { tone: 'dark', size: 15, key: 'Escape' }))
        KA.Game.go('petview', {});
    } else if (phase === 'done') {
      const p = KA.UI.panel(ctx, KA.W / 2 - 180, 60, 360, 200, 'ALL FED');
      const rows = [['Caught', res.caught], ['Dropped', res.missed], ['Best chain', 'x' + res.best],
                    ['EXP gained', res.exp], ['Levels', res.levels], ['Roll tokens', '+' + res.tokens]];
      rows.forEach((r, i) => {
        T.draw(ctx, r[0], KA.W / 2 - 150, p.cy + i * 22, P.dim, { size: 14, weight: 700 });
        T.draw(ctx, String(r[1]), KA.W / 2 + 150, p.cy + i * 22, i >= 3 ? P.gold : P.text,
          { size: 14, weight: 900, align: 'right' });
      });
      if (KA.UI.button(ctx, KA.W / 2 - 150, 224, 140, 36, 'AGAIN', { tone: 'green', size: 16 })) enter();
      if (KA.UI.button(ctx, KA.W / 2 + 10, 224, 140, 36, 'DONE', { tone: 'gold', size: 16, key: 'Enter' }))
        KA.Game.go('petview', {});
    } else {
      T.draw(ctx, KA.touch ? 'SLIDE THE PAD TO STEER' : 'A/D or mouse to steer',
        KA.W / 2, KA.H - 46, P.text, { size: 13, align: 'center', weight: 800, shadow: true });
    }
    KA.UI.touchPad(ctx, BTNS);
  }
  return { enter, update, draw };
})();
