/* ============================================================
   scenes/menus.js - title, world generation, pause, death and
   the ending. All drawn from the same hand-drawn kit.
   ============================================================ */
KD.Scenes.title = (function () {
  /* The menu is a PICTURE, not a card: the fat king on a rock, looking east
     at the castle he does not live in any more. Everything in it is drawn
     here rather than baked, because it is four hundred rects and the title
     screen has nothing else to do with its frame. */
  let t = 0;
  const R = KD.Screen.rect;
  function enter() { t = 0; KD.UI.guard(0.2); }
  function update(dt) { t += dt; if (KD.In.isHit('F2')) KD.Game.go('spritetest', {}); }

  /* deterministic scatter, so nothing shimmers between frames */
  function hash(a, b) {
    let h = (a * 73856093) ^ (b * 19349663);
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* ---- his kingdom, small and far away ---------------------------- */
  function castle(x, base, sc) {
    const T = (tx, tw, th, top) => {              // one tower
      tx = Math.round(tx); tw = Math.round(tw); th = Math.round(th);
      R(tx, base - th, tw, th, 'INK.2');
      R(tx, base - th, 2, th, 'INK.3');
      R(tx - 1, base - th - top, tw + 2, top, 'INK.2');
      for (let k = 0; k < tw + 2; k += 4)         // crenellations
        R(tx - 1 + k, base - th - top - 2, 2, 2, 'INK.2');
      for (let k = 3; k < th - 3; k += 7)         // lit windows
        R(tx + 2, base - th + k, 2, 3, 'GOLD.2');
    };
    /* The shelf it stands on. A tapering diamond left the whole castle
       floating on a dark lozenge in mid-water, so this runs off both sides
       and keeps going down out of frame. */
    const cxr = Math.round(x + 14 * sc);
    for (let k = 0; k < KD.H; k++) {
      const spread = Math.round(30 * sc + k * 2.2);
      const y = base + k;
      if (y > KD.H) break;
      R(cxr - spread, y, spread * 2, 1, k < 2 ? 'INK.2' : 'INK.1');
      if (k > 3 && k % 7 === 0) R(cxr - spread + 4, y, spread * 2 - 8, 1, 'INK.2');
    }
    T(x, 9 * sc, 30 * sc, 4);
    T(x + 20 * sc, 9 * sc, 24 * sc, 4);
    T(x + 9 * sc, 12 * sc, 40 * sc, 5);           // the keep, tallest
    R(x + 9 * sc, base - 46 * sc, 12 * sc, 2, 'INK.3');
    /* a banner still flying on it, which is the sad part */
    R(x + 15 * sc, base - 52 * sc, 1, 6 * sc, 'INK.3');
    const f = Math.sin(t * 2) > 0 ? 1 : 0;
    R(x + 16 * sc, base - 52 * sc, 5 * sc - f, 4, 'BLOOD.0');
  }

  /* ---- kelp, as silhouettes ---------------------------------------- */
  /* A stalk that tapers, with blades on ONE side per segment and angled
     down. The first version put an even blade either side of a parallel bar
     and the whole seabed came out as a field of crosses. */
  function weed(x, groundY, h, seed, col) {
    const segs = Math.max(3, h >> 3);
    let px = x;
    for (let s2 = 0; s2 < segs; s2++) {
      const f = s2 / segs;
      const y = groundY - s2 * 8;
      px = x + Math.sin(t * 0.8 + seed) * 4 * f * f;
      const w = f > 0.7 ? 1 : (f > 0.35 ? 2 : 3);
      R(Math.round(px), y - 8, w, 9, col);
      R(Math.round(px), y - 8, 1, 9, 'KELP.2');   // a lit edge down the stem
      if (s2 % 2 === 1) {                          // a frond, alternating sides
        const dir = (s2 & 2) ? 1 : -1;
        const len = 7 + (seed % 4);
        for (let b = 0; b < len; b++) {
          const bx2 = Math.round(px) + (dir > 0 ? w + b : -1 - b);
          R(bx2, y - 6 + Math.round(b * 0.7), 1, 3 - (b > len - 3 ? 1 : 0),
            b < 2 ? 'KELP.2' : col);
        }
      }
    }
    R(Math.round(px), groundY - segs * 8 - 3, 2, 3, col);   // a float on top
  }

  function draw(ctx) {
    const H = KD.H, W = KD.W;
    const sea = Math.round(H * 0.20);             // the waterline
    /* ---- sky ------------------------------------------------------ */
    const SKYB = ['DEEP.3', 'DEEP.4', 'WATER.0', 'WATER.1', 'WATER.2'];
    for (let k = 0; k < SKYB.length; k++) {
      const y0 = Math.round(sea * k / SKYB.length);
      R(0, y0, W, Math.round(sea * (k + 1) / SKYB.length) - y0 + 1, SKYB[k]);
    }
    /* the sun, low and behind him */
    const sx = Math.round(W * 0.78);
    for (let r = 0; r < 6; r++) {
      const w = [10, 18, 22, 22, 18, 10][r];
      R(sx - (w >> 1), 6 + r * 3, w, 3, r === 0 || r === 5 ? 'GOLD.3' : 'WHITE');
    }
    /* ---- water, in bands ------------------------------------------ */
    const WB = [['WATER.3', 0.06], ['WATER.2', 0.16], ['WATER.1', 0.34],
                ['WATER.0', 0.56], ['DEEP.2', 1.0]];
    let prev = sea, above = null;
    for (const [col, f] of WB) {
      const y1 = Math.round(sea + (H - sea) * f);
      R(0, prev, W, y1 - prev, col);
      if (above) {                                 // soften the seam
        KD.Dither.wash(ctx, 0, prev, W, 3, above, 0.5);
        KD.Dither.wash(ctx, 0, prev + 3, W, 3, above, 0.22);
      }
      above = col; prev = y1;
    }
    /* ---- the surface, from underneath ------------------------------ */
    for (let x = 0; x < W; x += 2) {
      const y = sea + Math.round(Math.sin(x * 0.05 + t * 1.4) * 2
                               + Math.sin(x * 0.017 - t * 0.8) * 2);
      R(x, y - 2, 2, 2, 'WHITE');
      R(x, y, 2, 3, 'WATER.3');
      if (((x >> 1) + ((t * 6) | 0)) % 13 === 0) R(x, y - 4, 1, 1, 'WHITE');
    }
    /* ---- sunlight, solid and slanted ------------------------------- */
    /* Three, not five, and one step up the ramp rather than white all the
       way down - at five wide bars of BONE they became the subject of the
       picture instead of the light in it. */
    for (let i = 0; i < 3; i++) {
      const bx = Math.round(W * (0.16 + i * 0.27) + Math.sin(t * 0.2 + i) * 8);
      for (let y = 0; y < (H - sea) * 0.72; y += 2) {
        const k = y / ((H - sea) * 0.72);
        const w = Math.round(11 * (1 - k * 0.8));
        if (w < 2) break;
        const col = k < 0.10 ? 'WATER.3' : (k < 0.40 ? 'WATER.2'
                  : (k < 0.72 ? 'WATER.1' : 'WATER.0'));
        R(bx + Math.round(y * 0.28), sea + y, w, 2, col);
      }
    }
    /* ---- his kingdom, on the far rock ------------------------------ */
    castle(Math.round(W * 0.50), Math.round(H * 0.62), 1.6);
    /* ---- a bed of weed between here and there ---------------------- */
    for (let i = 0; i < 22; i++) {
      const x = Math.round(((i * 137 + 40) % (W + 60)) - 30);
      const g = Math.round(H * (0.70 + (i % 3) * 0.03));
      weed(x, g, 26 + ((i * 53) % 30), i, i % 2 ? 'DEEP.1' : 'DEEP.0');
    }
    /* ---- fish, at three depths ------------------------------------- */
    const FISH = ['an_clown', 'an_parrot', 'an_cuttle', 'an_lion', 'an_cuda'];
    for (let i = 0; i < 16; i++) {
      const name = FISH[i % FISH.length];
      if (!KD.PX.hasAny(name)) continue;
      const sp = 8 + (i % 5) * 7;
      const dir = i & 1 ? 1 : -1;
      const x = Math.round((((i * 191 + t * sp * dir) % (W + 80)) + W + 80) % (W + 80)) - 40;
      const y = Math.round(sea + 14 + ((i * 61) % Math.max(20, H - sea - 40))
                          + Math.sin(t * 1.1 + i) * 4);
      KD.PX.blit(ctx, KD.PX.frameOf(name, t + i), x, y,
                 { anchor: false, flipX: dir < 0, shade: 1 + (i % 3) });
    }
    /* ---- bubbles, lots of them ------------------------------------- */
    for (let i = 0; i < 60; i++) {
      const bx = Math.round((i * 71 + 13) % W + Math.sin(t * 1.3 + i) * 3);
      const by = H - ((t * (11 + i % 9) + i * 43) % (H - sea + 30));
      if (by < sea) continue;
      const sz = (i % 5) ? 1 : 2;
      R(bx, Math.round(by), sz, sz, i % 4 ? 'WATER.3' : 'BONE.2');
    }
    /* ---- the rock he is standing on -------------------------------- */
    const ledge = Math.round(H * 0.78);
    const lw = Math.round(W * 0.46);
    for (let k = 0; k < H - ledge + 4; k++) {
      const w = lw - Math.round(k * 0.6);
      R(0, ledge + k, Math.max(0, w), 1, k < 3 ? 'STONE.1' : 'INK.1');
    }
    /* blocked rock, so it reads as stone rather than as a platform */
    for (let ry = ledge + 4; ry < H + 4; ry += 9) {
      const w = lw - Math.round((ry - ledge) * 0.6);
      for (let rx = ((ry / 9) | 0) % 2 ? -9 : 0; rx < w; rx += 19) {
        const q = hash(rx, ry);
        R(rx, ry, Math.min(18, w - rx), 8, q < 0.4 ? 'INK.1' : (q < 0.85 ? 'INK.2' : 'STONE.0'));
        R(rx, ry, Math.min(18, w - rx), 1, 'INK.3');
      }
    }
    R(0, ledge, lw, 3, 'STONE.1');
    R(0, ledge, lw, 1, 'STONE.3');
    R(0, ledge + 3, lw, 1, 'INK.0');
    /* a few sprigs on the lip, because a bare rock reads as a platform */
    for (let i = 0; i < 7; i++) {
      const x = Math.round(lw * (0.12 + i * 0.13));
      weed(x, ledge, 12 + ((i * 37) % 12), i + 40, 'KELP.0');
    }
    /* ---- and the man himself --------------------------------------- */
    if (KD.PX.hasAny('ti_king')) {
      KD.PX.blit(ctx, KD.PX.frameOf('ti_king', t), Math.round(W * 0.22), ledge + 1);
    }

    /* ---- the words ------------------------------------------------- */
    const cx = Math.round(W / 2);
    const top = Math.round(H * 0.04);
    KD.Text.draw('CROWNDEEP', cx, top, 'GOLD.3', { align: 'center', space: 2, shadow: 'INK.0' });
    KD.Text.draw('KING OF ATLANTIC', cx, top + 13, 'WATER.3',
                 { align: 'center', space: 1, shadow: 'INK.0' });
    KD.Text.draw('he had it all. then he met a keg.', cx, top + 24, 'BONE.2',
                 { tiny: true, align: 'center', shadow: 'INK.0' });

    /* ---- the menu, on a scrim so it reads over the water ----------- */
    const bw = 104, bx = W - bw - 12;
    const rows = KD.State.hasSave() ? 3 : 2;
    const panelH = rows * 21 + 12;
    let by = H - panelH - 6;
    R(bx - 6, by - 6, bw + 12, panelH, 'INK.0');
    R(bx - 5, by - 5, bw + 10, 1, 'GOLD.0');
    KD.Screen.frame(bx - 6, by - 6, bw + 12, panelH, 'GOLD.0');
    if (KD.State.hasSave()) {
      if (KD.UI.button(bx, by, bw, 18, 'CONTINUE', { key: 'Enter' })) {
        if (KD.State.load()) {
          /* Somebody who quit halfway through Act One has a save but no
             generated world, so sending them to `play` dropped them into an
             empty one. The prologue is where they left off. */
          const a = KD.State.S.act1;
          KD.Game.go(a && !a.done ? 'castle' : 'play', {});
        } else KD.State.say('That save is broken.', 'BLOOD.2');
      }
      by += 21;
      if (KD.UI.button(bx, by, bw, 15, 'NEW WORLD')) {
        KD.State.wipe();
        if (!KD.Cine.play('intro')) KD.Game.go('wake', {});
      }
      by += 21;
    } else {
      if (KD.UI.button(bx, by, bw, 18, 'DIG IN', { key: 'Enter' })) {
        if (!KD.Cine.play('intro')) KD.Game.go('wake', {});
      }
      by += 21;
    }
    if (KD.UI.button(bx, by, bw, 15, KD.Sfx.isMuted() ? 'SOUND OFF' : 'SOUND ON')) KD.Sfx.mute();
    KD.Text.draw('every pixel placed by hand', 6, H - 10, 'STONE.2',
                 { tiny: true, shadow: 'INK.0' });
  }
  return { enter, update, draw };
})();

/* ---------------- world generation, with a progress bar ---------------- */
KD.Scenes.gen = (function () {
  let step = null, total = 1, t = 0, seed = 0, done = false;
  function enter(args) {
    t = 0; done = false;
    seed = (args && args.seed) || ((Math.random() * 2147483647) | 0);
    total = KD.Gen.begin(KD.Zones.WORLD_W, KD.Zones.WORLD_H, seed);
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
    /* Act One is where the weight comes from, and it has to land HERE -
       enter() above calls State.fresh(), which resets weight to the starting
       figure, so adding it in the castle before switching scenes wrote a
       number that was thrown away one frame later. */
    if (KD.Act1 && KD.Act1.A.fat > 0) {
      KD.State.S.weight += KD.Act1.A.fat;
      KD.State.S.fat = KD.State.S.weight;
    }
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
  function update(dt) { t += dt; }
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
    const vtop = Math.round(KD.H * 0.10);
    KD.Text.draw('KING AGAIN', cx, vtop, 'GOLD.3', { align: 'center', space: 2, shadow: 'INK.0' });
    const lines = [
      'The crown is back on your head.',
      'It does not fit like it used to.',
      'Neither does the tunic.',
      '',
      'The Princess is still a beer keg.',
      'You are still in love with her.',
      'Some things a crown cannot fix.'
    ];
    lines.forEach((l, i) => KD.Text.draw(l, cx, vtop + 24 + i * 12, i > 3 ? 'GOLD.2' : 'BONE.1', { align: 'center' }));
    if (KD.PX.has('it_crown')) KD.PX.blit(ctx, 'it_crown', cx - 7, KD.H - 46, { anchor: false });
    if (t > 1 && KD.UI.button(cx - 40, KD.H - 26, 80, 13, 'THE END', { key: 'Enter' })) KD.Game.go('title', {});
  }
  return { enter, update, draw };
})();
