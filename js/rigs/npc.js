/* ============================================================
   rigs/npc.js - flat chunky townsfolk, procedurally animated.
   Kinds: guard (police uniform, blocks passage), bookie, cultist,
   noble, merchant, weirdo. All idle-breathe, blink and flap their
   jaw when talking.
   ============================================================ */
DZ.Rig.npc = (function () {
  const U = DZ.Util, S = DZ.Rig.S, Px = DZ.Pixel;

  const KINDS = {
    guard:    { skin: '#e8b48a', suit: '#1f3c78', suitS: '#12244a', trim: '#ffd24a', hair: '#3a2a1a',
                hat: 'cap', shades: true, badge: true, blurb: 'ATLANTIS HARBOUR PATROL' },
    bookie:   { skin: '#f0c49b', suit: '#7a3f9e', suitS: '#4d2266', trim: '#ffd24a', hair: '#241a12',
                hat: 'boater', blurb: 'licensed-ish bookmaker' },
    cultist:  { skin: '#cfe8c0', suit: '#2f8f4c', suitS: '#1b6033', trim: '#c8ff4a', hair: '#1b6033',
                hat: 'hood', blurb: 'the kelp knows' },
    noble:    { skin: '#f6d6b8', suit: '#c53a3a', suitS: '#8c2222', trim: '#ffd24a', hair: '#e8d9a8',
                hat: 'crown', blurb: 'minor Atlantean royalty' },
    merchant: { skin: '#d9a273', suit: '#ff9a3c', suitS: '#c9601c', trim: '#7ff0ff', hair: '#3a2a1a',
                hat: 'bandana', blurb: 'everything must go' },
    weirdo:   { skin: '#b9e3ff', suit: '#3a4f8f', suitS: '#1b2350', trim: '#a86bff', hair: '#7ff0ff',
                hat: 'none', blurb: 'has seen the trench' }
  };
  const state = {};
  function mem(tag) {
    let m = state[tag];
    if (!m) m = state[tag] = { t: Math.random() * 9, blink: U.rnd(1, 5), look: { x: 0, y: 0 }, lookT: 0,
      bob: new DZ.Rig.Spring(0, 120, 10), arm: Math.random() * 6 };
    return m;
  }

  /* draw(ctx, x, y, opts) - opts: scale, kind, t, talk, alert, dir, tag */
  function draw(ctx, x, y, opts) {
    opts = opts || {};
    const dt = Math.min(0.05, DZ.Rig.npc.dt || 1 / 60);
    const K = KINDS[opts.kind] || KINDS.merchant;
    const m = mem(opts.tag || opts.kind || 'n');
    const sc = opts.scale === undefined ? 1 : opts.scale;
    const H = 24 * sc;
    const dir = opts.dir === undefined ? 1 : opts.dir;
    m.t += dt;
    m.arm += dt * (opts.talk ? 5.5 : 1.4);
    m.blink -= dt;
    const blink = m.blink < 0.09;
    if (m.blink < -0.02) m.blink = U.rnd(1.6, 5.5);
    m.lookT -= dt;
    if (m.lookT <= 0) { m.lookT = U.rnd(0.6, 2.6); m.look.x = U.rnd(-1, 1); m.look.y = U.rnd(-0.5, 0.7); }

    const breathe = Math.sin(m.t * 1.7) * H * 0.012;
    const bounce = opts.talk ? Math.abs(Math.sin(m.arm * 0.8)) * H * 0.02 : 0;

    ctx.save();
    ctx.translate(x, y + breathe - bounce);
    ctx.scale(dir < 0 ? -1 : 1, 1);

    const hip = [0, 0], sho = [0, -H * 0.30], headC = [H * 0.02, -H * 0.45], hr = H * 0.135;
    const bw = H * 0.15;

    /* legs: two chunky pillars */
    for (let i = 0; i < 2; i++) {
      const lx = -bw * 0.45 + i * bw * 0.9;
      S.roundRect(ctx, lx - H * 0.055, hip[1] - H * 0.02, H * 0.11, H * 0.36, H * 0.03,
        i ? K.suit : K.suitS, { depth: H * 0.03, side: K.suitS });
      S.roundRect(ctx, lx - H * 0.075, hip[1] + H * 0.30, H * 0.15, H * 0.07, H * 0.02, '#20242c', { depth: H * 0.02 });
    }
    /* far arm */
    armAt(ctx, m, H, sho, K, -1, opts);
    /* torso */
    S.roundRect(ctx, -bw, sho[1], bw * 2, H * 0.34, H * 0.045, K.suit, { depth: H * 0.045, side: K.suitS });
    if (K.badge) {
      S.rect(ctx, -bw * 0.1, sho[1] + H * 0.05, bw * 0.55, H * 0.02, K.trim, { depth: 0 });
      S.disc(ctx, -bw * 0.55, sho[1] + H * 0.07, H * 0.028, K.trim, { depth: 0 });
      // duty belt
      S.rect(ctx, -bw, sho[1] + H * 0.26, bw * 2, H * 0.05, '#20242c', { depth: 0 });
      S.rect(ctx, bw * 0.35, sho[1] + H * 0.26, H * 0.05, H * 0.09, '#20242c', { depth: 0 });
    } else {
      S.rect(ctx, -bw, sho[1] + H * 0.26, bw * 2, H * 0.04, K.trim, { depth: 0 });
    }
    /* near arm */
    armAt(ctx, m, H, sho, K, 1, opts);
    /* head */
    S.roundRect(ctx, headC[0] - hr, headC[1] - hr, hr * 2, hr * 2.1, hr * 0.55, K.skin,
      { depth: H * 0.035, side: Px.shade(K.skin, -0.3) });
    hat(ctx, K, headC, hr, H);
    /* face */
    const er = hr * 0.26;
    if (K.shades) {
      S.roundRect(ctx, headC[0] - hr * 0.85, headC[1] - hr * 0.28, hr * 1.7, hr * 0.5, hr * 0.14, '#151a24', { depth: 0 });
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(headC[0] - hr * 0.7, headC[1] - hr * 0.2, hr * 0.3, hr * 0.14);
    } else if (blink) {
      ctx.strokeStyle = '#141c28'; ctx.lineWidth = Math.max(0.6, H * 0.02);
      ctx.beginPath();
      ctx.moveTo(headC[0] - hr * 0.5, headC[1] - hr * 0.12); ctx.lineTo(headC[0] - hr * 0.14, headC[1] - hr * 0.12);
      ctx.moveTo(headC[0] + hr * 0.16, headC[1] - hr * 0.12); ctx.lineTo(headC[0] + hr * 0.52, headC[1] - hr * 0.12);
      ctx.stroke();
    } else {
      S.eye(ctx, headC[0] - hr * 0.32, headC[1] - hr * 0.12, er, m.look, { pupil: '#141c28' });
      S.eye(ctx, headC[0] + hr * 0.34, headC[1] - hr * 0.12, er, m.look, { pupil: '#141c28' });
    }
    // mouth: flaps while talking
    const mo = opts.talk ? 0.35 + Math.abs(Math.sin(m.arm * 3.2)) * 0.65 : 0.15;
    S.roundRect(ctx, headC[0] - hr * 0.24, headC[1] + hr * 0.42, hr * 0.5, hr * 0.5 * mo, hr * 0.12,
      '#7d2b2b', { depth: 0 });
    if (opts.alert) {
      ctx.fillStyle = '#ff6f6f';
      ctx.font = 'bold ' + (H * 0.28) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', headC[0], headC[1] - hr * 1.7 - Math.abs(Math.sin(m.t * 6)) * H * 0.04);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function armAt(ctx, m, H, sho, K, side, opts) {
    const swing = Math.sin(m.arm * (opts.talk ? 1.6 : 0.9) + (side > 0 ? 0 : 1.9));
    const sx = side * H * 0.15, sy = sho[1] + H * 0.04;
    let tx, ty;
    if (opts.kind === 'guard' && !opts.talk) {       // arms folded, unimpressed
      tx = sx - side * H * 0.12; ty = sy + H * 0.14;
    } else {
      tx = sx + side * H * 0.10 + swing * H * 0.05;
      ty = sy + H * 0.22 - (opts.talk ? Math.abs(swing) * H * 0.14 : 0);
    }
    const el = DZ.Rig.solve2(sx, sy, tx, ty, H * 0.14, H * 0.13, side < 0);
    const col = side > 0 ? K.suit : K.suitS;
    S.capsule(ctx, sx, sy, el.x, el.y, H * 0.045, H * 0.04, col, { depth: H * 0.02, side: K.suitS });
    S.capsule(ctx, el.x, el.y, tx, ty, H * 0.04, H * 0.035, col, { depth: H * 0.02, side: K.suitS });
    S.disc(ctx, tx, ty, H * 0.042, K.skin, { depth: 0 });
  }

  function hat(ctx, K, c, hr, H) {
    if (K.hat === 'cap') {
      S.roundRect(ctx, c[0] - hr * 1.05, c[1] - hr * 1.15, hr * 2.1, hr * 0.75, hr * 0.2, K.suit,
        { depth: H * 0.02, side: K.suitS });
      S.roundRect(ctx, c[0] - hr * 0.2, c[1] - hr * 0.55, hr * 1.5, hr * 0.22, hr * 0.08, K.suitS, { depth: 0 });
      S.disc(ctx, c[0], c[1] - hr * 0.85, hr * 0.16, K.trim, { depth: 0 });
    } else if (K.hat === 'boater') {
      S.rect(ctx, c[0] - hr * 1.3, c[1] - hr * 0.72, hr * 2.6, hr * 0.16, '#f4e7c9', { depth: 0 });
      S.roundRect(ctx, c[0] - hr * 0.75, c[1] - hr * 1.25, hr * 1.5, hr * 0.6, hr * 0.1, '#f4e7c9', { depth: H * 0.015 });
      S.rect(ctx, c[0] - hr * 0.75, c[1] - hr * 0.88, hr * 1.5, hr * 0.16, K.suit, { depth: 0 });
    } else if (K.hat === 'hood') {
      S.blob(ctx, [[c[0] - hr * 1.1, c[1] + hr * 0.3], [c[0] - hr * 0.9, c[1] - hr * 1.1],
                   [c[0] + hr * 0.9, c[1] - hr * 1.1], [c[0] + hr * 1.1, c[1] + hr * 0.3],
                   [c[0] + hr * 0.5, c[1] - hr * 0.35], [c[0] - hr * 0.5, c[1] - hr * 0.35]],
        K.suit, { depth: H * 0.02, side: K.suitS, tension: 0.4 });
    } else if (K.hat === 'crown') {
      S.poly(ctx, [[c[0] - hr * 0.8, c[1] - hr * 0.8], [c[0] + hr * 0.8, c[1] - hr * 0.8],
                   [c[0] + hr * 0.8, c[1] - hr * 1.4], [c[0] + hr * 0.4, c[1] - hr * 1.05],
                   [c[0], c[1] - hr * 1.5], [c[0] - hr * 0.4, c[1] - hr * 1.05],
                   [c[0] - hr * 0.8, c[1] - hr * 1.4]], K.trim, { depth: H * 0.02 });
    } else if (K.hat === 'bandana') {
      S.roundRect(ctx, c[0] - hr * 1.02, c[1] - hr * 1.0, hr * 2.04, hr * 0.5, hr * 0.12, K.trim, { depth: 0 });
      S.tri(ctx, [c[0] - hr * 0.9, c[1] - hr * 0.6], [c[0] - hr * 1.5, c[1] - hr * 0.1],
            [c[0] - hr * 0.85, c[1] - hr * 0.15], K.trim, { depth: 0 });
    } else {
      S.blob(ctx, [[c[0] - hr, c[1] - hr * 0.5], [c[0] - hr * 0.8, c[1] - hr * 1.15],
                   [c[0] + hr * 0.8, c[1] - hr * 1.15], [c[0] + hr, c[1] - hr * 0.5],
                   [c[0], c[1] - hr * 0.7]], K.hair, { depth: 0, tension: 0.45 });
    }
  }

  return { draw, dt: 1 / 60, KINDS };
})();
