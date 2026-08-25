/* ============================================================
   scenes/menus.js - title, world generation, pause, death and
   the ending. All drawn from the same hand-drawn kit.
   ============================================================ */
KD.Scenes.title = (function () {
  let t = 0, seedBox = '';
  function enter() { t = 0; KD.UI.guard(0.2); }
  function update(dt) { t += dt; if (KD.In.isHit('F2')) KD.Game.go('spritetest', {}); }
  function draw(ctx) {
    /* a dithered deep-sea backdrop, no gradients allowed */
    KD.Screen.clear('DEEP.0');
    for (let i = 0; i < 5; i++) {
      const y = Math.round(i * KD.H / 5);
      KD.Dither.fill(ctx, 0, y, KD.W, KD.H / 5 + 1, 'DEEP.' + Math.min(4, 4 - i), 0.85 - i * 0.14);
    }
    /* drifting bubbles: 2x2 rects, nothing round */
    for (let i = 0; i < 26; i++) {
      const bx = (i * 71 + 13) % KD.W;
      const by = KD.H - ((t * (12 + i % 7) + i * 37) % (KD.H + 20));
      KD.Screen.rect(bx, Math.round(by), (i % 3) ? 1 : 2, (i % 3) ? 1 : 2, 'WATER.2');
    }
    const cx = KD.W / 2;
    /* the logo, hand-spaced */
    KD.Text.draw('CROWNDEEP', cx, 22, 'GOLD.3', { align: 'center', space: 2, shadow: 'INK.0' });
    KD.Text.draw('KING OF ATLANTIC', cx, 34, 'WATER.3', { align: 'center', space: 1, shadow: 'INK.0' });
    KD.Text.draw('he had it all. then he met a keg.', cx, 46, 'BONE.0', { tiny: true, align: 'center' });

    /* the king and the keg, if their art has landed */
    const gy = KD.H - 42;
    if (KD.PX.has('king_idle0')) KD.PX.blit(ctx, KD.PX.frameOf('king_idle', t), cx - 22, gy);
    if (KD.PX.has('npc_princess_idle0')) KD.PX.blit(ctx, KD.PX.frameOf('npc_princess_idle', t), cx + 12, gy);
    KD.Screen.rect(0, gy, KD.W, KD.H - gy, 'SAND.1');
    KD.Dither.fill(ctx, 0, gy, KD.W, 4, 'SAND.2', 0.6);

    const bw = 96, bx = cx - bw / 2;
    let by = 62;
    if (KD.State.hasSave()) {
      if (KD.UI.button(bx, by, bw, 14, 'CONTINUE', { key: 'Enter' })) {
        if (KD.State.load()) KD.Game.go('play', {});
        else KD.State.say('That save is broken.', 'BLOOD.2');
      }
      by += 18;
      if (KD.UI.button(bx, by, bw, 12, 'NEW WORLD')) { KD.State.wipe(); KD.Game.go('gen', {}); }
      by += 16;
    } else {
      if (KD.UI.button(bx, by, bw, 14, 'DIG IN', { key: 'Enter' })) KD.Game.go('gen', {});
      by += 18;
    }
    if (KD.UI.button(bx, by, bw, 12, KD.Sfx.isMuted() ? 'SOUND OFF' : 'SOUND ON')) KD.Sfx.mute();
    KD.Text.draw('every pixel placed by hand', cx, KD.H - 12, 'INK.3', { tiny: true, align: 'center' });
  }
  return { enter, update, draw };
})();

/* ---------------- world generation, with a progress bar ---------------- */
KD.Scenes.gen = (function () {
  let step = null, total = 1, t = 0, seed = 0, done = false;
  function enter(args) {
    t = 0; done = false;
    seed = (args && args.seed) || ((Math.random() * 2147483647) | 0);
    total = KD.Gen.begin(1400, 420, seed);
    step = { done: 0, total, label: 'waking up' };
    KD.State.fresh();
    KD.Mobs.clear();
    KD.Fx.reset();
  }
  function update(dt) {
    t += dt;
    if (done) return;
    /* one generator step per frame keeps the bar moving */
    const s = KD.Gen.step();
    if (s) { step = s; return; }
    done = true;
    KD.Water.init();
    KD.Render.flush();
    const sp = KD.Gen.meta.spawn;
    KD.Player.spawn(sp.x, sp.y);
    KD.State.S.seed = seed;
    KD.State.recalc();
    KD.State.save();
    KD.Game.go('play', {});
  }
  function draw(ctx) {
    KD.Screen.clear('INK.0');
    const cx = KD.W / 2;
    KD.Text.draw('DROWNING A CITY', cx, KD.H / 2 - 26, 'GOLD.3', { align: 'center', space: 1 });
    KD.Text.draw(step.label, cx, KD.H / 2 - 10, 'BONE.1', { align: 'center' });
    const bw = Math.min(160, KD.W - 40);
    KD.UI.bar(cx - bw / 2, KD.H / 2 + 4, bw, 8, step.done / step.total, 'WATER.2');
    KD.Text.draw('seed ' + seed, cx, KD.H / 2 + 18, 'INK.3', { tiny: true, align: 'center' });
    /* something to watch: a row of dithered blocks filling up */
    for (let i = 0; i < 20; i++) {
      const on = i / 20 < step.done / step.total;
      KD.Screen.rect(cx - 50 + i * 5, KD.H / 2 + 30, 4, 4, on ? 'SAND.2' : 'INK.1');
    }
  }
  return { enter, update, draw };
})();

/* ---------------- pause ---------------- */
KD.Scenes.pause = (function () {
  function enter() { KD.UI.guard(0.2); }
  function update(dt) {
    KD.UI.tickGuard(dt);
    if (KD.In.isHit('Escape')) KD.Game.go('play', {});
  }
  function draw(ctx) {
    KD.Scenes.play.draw(ctx);
    KD.Screen.rect(0, 0, KD.W, KD.H, 'INK.0');
    for (let yy = 0; yy < KD.H; yy += 4) {
      for (let xx = (yy & 4) ? 0 : 2; xx < KD.W; xx += 8) KD.Screen.rect(xx, yy, 1, 1, 'DEEP.1');
    }
    const S = KD.State.S;
    const w = Math.min(190, KD.W - 20), h = 120;
    const x = ((KD.W - w) >> 1), y = ((KD.H - h) >> 1);
    const p = KD.UI.titled(x, y, w, h, 'THE STATE OF THE KINGDOM');
    const rows = [
      ['Crown fragments', S.frags.length + ' / 5'],
      ['Level', S.level + '   (' + S.points + ' pts)'],
      ['Clams', String(S.clams)],
      ['Fat', Math.round(S.fat) + '%'],
      ['Blocks mined', String(S.mined)],
      ['Things crafted', String(S.crafted)],
      ['Enemies felled', String(S.kills)],
      ['Deaths', String(S.deaths)],
      ['Depth', ((KD.Player.P.y / 8) | 0) + 'm'],
      ['Seed', String(S.seed)]
    ];
    rows.forEach((r, i) => {
      KD.Text.draw(r[0], x + 6, p.iy + i * 9, 'BONE.0', { tiny: true });
      KD.Text.draw(r[1], x + w - 6, p.iy + i * 9, 'BONE.2', { tiny: true, align: 'right' });
    });
    if (KD.UI.button(x + 6, y + h - 15, (w - 18) / 2, 12, 'BACK', {})) KD.Game.go('play', {});
    if (KD.UI.button(x + 12 + (w - 18) / 2, y + h - 15, (w - 18) / 2, 12, 'SAVE + QUIT', {})) {
      KD.State.save(); KD.Game.go('title', {});
    }
  }
  return { enter, update, draw };
})();

/* ---------------- death ---------------- */
KD.Scenes.death = (function () {
  let t = 0, from = '';
  function enter(args) { t = 0; from = (args && args.from) || 'the deep'; KD.UI.guard(0.5); KD.Sfx.play('die'); }
  function update(dt) { t += dt; KD.UI.tickGuard(dt); }
  function draw(ctx) {
    KD.Screen.clear('INK.0');
    KD.Dither.fill(ctx, 0, 0, KD.W, KD.H, 'BLOOD.0', Math.min(0.5, t * 0.4));
    const cx = KD.W / 2;
    KD.Text.draw('YOU DIED', cx, KD.H / 2 - 30, 'BLOOD.3', { align: 'center', space: 2 });
    KD.Text.draw('killed by ' + from, cx, KD.H / 2 - 14, 'BONE.1', { align: 'center' });
    KD.Text.draw('you wake up at home, damper and poorer', cx, KD.H / 2 - 2, 'INK.3', { tiny: true, align: 'center' });
    if (t > 0.7 && KD.UI.button(cx - 44, KD.H / 2 + 12, 88, 14, 'GET UP', { key: 'Enter' })) {
      const sp = KD.Gen.meta.spawn;
      KD.Player.spawn(sp.x, sp.y);
      KD.Player.P.hp = KD.Player.P.hpMax;
      KD.Player.P.breath = 1;
      KD.State.S.clams = Math.floor(KD.State.S.clams * 0.7);
      KD.Scenes.play.snapCam();
      KD.Game.go('play', {});
    }
  }
  return { enter, update, draw };
})();

/* ---------------- the ending ---------------- */
KD.Scenes.victory = (function () {
  let t = 0;
  function enter() { t = 0; KD.Sfx.play('victory'); }
  function update(dt) { t += dt; }
  function draw(ctx) {
    KD.Screen.clear('DEEP.1');
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + 11) % KD.W;
      const y = ((t * 30 + i * 53) % (KD.H + 20)) - 10;
      KD.Screen.rect(x, Math.round(y), 2, 2, i % 3 ? 'GOLD.2' : 'GOLD.3');
    }
    const cx = KD.W / 2;
    KD.Text.draw('KING AGAIN', cx, 30, 'GOLD.3', { align: 'center', space: 2, shadow: 'INK.0' });
    const lines = [
      'The crown is back on your head.',
      'It does not fit like it used to.',
      'Neither does the tunic.',
      '',
      'The Princess is still a beer keg.',
      'You are still in love with her.',
      'Some things a crown cannot fix.'
    ];
    lines.forEach((l, i) => KD.Text.draw(l, cx, 52 + i * 11, i > 3 ? 'GOLD.2' : 'BONE.1', { align: 'center' }));
    if (KD.PX.has('it_crown')) KD.PX.blit(ctx, 'it_crown', cx - 7, KD.H - 46, { anchor: false });
    if (t > 1 && KD.UI.button(cx - 40, KD.H - 26, 80, 13, 'THE END', { key: 'Enter' })) KD.Game.go('title', {});
  }
  return { enter, update, draw };
})();
