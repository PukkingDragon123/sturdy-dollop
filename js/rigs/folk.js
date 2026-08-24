/* ============================================================
   rigs/folk.js - NPCs and enemies. Same skeleton, different
   silhouettes, all procedurally animated.
   ============================================================ */
KA.Rig.folk = (function () {
  const U = KA.U, D = KA.D, R = KA.Rig;
  const mem = {};
  function M(tag) {
    let m = mem[tag];
    if (!m) m = mem[tag] = { t: U.rnd(0, 9), blink: U.rnd(1, 5), look: { x: 0, y: 0 }, lookT: 0, chain: null };
    return m;
  }

  const KINDS = {
    bird:     { skin: '#eaf7ff', suit: '#dfe8f2', suit2: '#b8c6d4', hair: '#ffc94a', hat: 'beak' },
    kid:      { skin: '#f0c49b', suit: '#7fe8ff', suit2: '#3d9ad8', hair: '#3a2a1a', hat: 'none', small: true },
    guard:    { skin: '#e8b48a', suit: '#1f3c78', suit2: '#12244a', hair: '#3a2a1a', hat: 'cap', shades: true, badge: true },
    fence:    { skin: '#d9b48a', suit: '#5a2f7a', suit2: '#38184f', hair: '#241a12', hat: 'hood' },
    cultist:  { skin: '#cfe8c0', suit: '#2f8f4c', suit2: '#1b6033', hair: '#1b6033', hat: 'hood' },
    hermit:   { skin: '#e0c0a0', suit: '#8a6a3c', suit2: '#5a4426', hair: '#e8e2d0', hat: 'shell', beard: true },
    scholar:  { skin: '#f0d0b0', suit: '#2f5d8a', suit2: '#1c3a56', hair: '#dfe8f2', hat: 'mortar', beard: true },
    merchant: { skin: '#d9a273', suit: '#ff9a3c', suit2: '#c9601c', hair: '#3a2a1a', hat: 'bandana' },
    drunk:    { skin: '#f0b49b', suit: '#8a5f30', suit2: '#5e3f1e', hair: '#a4713d', hat: 'none', beard: true },
    stabler:  { skin: '#e8c0a0', suit: '#6f7f5a', suit2: '#4a5a3a', hair: '#c98f1c', hat: 'hat' },
    smith:    { skin: '#c98f68', suit: '#5a4a5a', suit2: '#3a2f3a', hair: '#c9343f', hat: 'none', big: true },
    bookie:   { skin: '#f0c49b', suit: '#7a3f9e', suit2: '#4d2266', hair: '#241a12', hat: 'boater' },
    /* enemies */
    crawler:  { skin: '#3fd18b', suit: '#2b8f5a', suit2: '#1b6033', hair: '#3fd18b', hat: 'none', enemy: true },
    snapper:  { skin: '#ff6f74', suit: '#c9343f', suit2: '#8a1f28', hair: '#ff6f74', hat: 'none', enemy: true, crabby: true },
    bandit:   { skin: '#d9a273', suit: '#8a5f30', suit2: '#5e3f1e', hair: '#3a2a1a', hat: 'mask', enemy: true },
    shark:    { skin: '#7d90a4', suit: '#66788c', suit2: '#3f4d5c', hair: '#7d90a4', hat: 'none', enemy: true, fish: true },
    horror:   { skin: '#a86bff', suit: '#5a2f7a', suit2: '#2b1046', hair: '#a86bff', hat: 'none', enemy: true, big: true },
    boss:     { skin: '#e8c0a0', suit: '#c9343f', suit2: '#6d1c2d', hair: '#ffe08a', hat: 'crown', beard: true, big: true }
  };

  /* the Princess is a beer keg in a dress. Drawn separately, with love. */
  function keg(ctx, x, y, H, m, talk) {
    const bob = Math.sin(m.t * 1.6) * H * 0.012;
    ctx.save();
    ctx.translate(x, y + bob);
    // dress skirt
    D.blob(ctx, [[-H * 0.32, 0], [-H * 0.24, -H * 0.28], [H * 0.24, -H * 0.28], [H * 0.32, 0]],
      '#ff9ed2', { tension: 0.5, shadow: 'rgba(0,20,30,.35)', blur: 6, sy: 3 });
    D.rr(ctx, -H * 0.3, -H * 0.06, H * 0.6, H * 0.05, 3, '#ffd6ea');
    // the keg itself
    const kw = H * 0.24, kh = H * 0.42;
    D.rr(ctx, -kw, -kh - H * 0.24, kw * 2, kh, kw * 0.42,
      D.vgrad(ctx, -kw, 0, kw, 0, [[0, '#c9821c'], [0.4, '#ffb52e'], [1, '#c9821c']], 'keg' + Math.round(H)),
      { shadow: 'rgba(0,20,30,.35)', blur: 6, sy: 3 });
    for (const yy of [-0.72, -0.42]) D.rr(ctx, -kw * 1.05, yy * H, kw * 2.1, H * 0.035, 2, '#8a5a10');
    D.ellipse(ctx, 0, -kh - H * 0.24, kw, kw * 0.34, 0, '#ffe08a');
    // tap
    D.rr(ctx, kw * 0.7, -H * 0.42, H * 0.09, H * 0.035, 2, '#c9a26a');
    D.circle(ctx, kw * 0.7 + H * 0.09, -H * 0.4, H * 0.022, '#ffd24a');
    // face painted on, eyes and a little smile
    D.eye(ctx, -kw * 0.4, -H * 0.55, H * 0.045, m.look, { pupil: '#3a2402' });
    D.eye(ctx, kw * 0.4, -H * 0.55, H * 0.045, m.look, { pupil: '#3a2402' });
    if (talk) D.mouthOpen(ctx, 0, -H * 0.45, H * 0.05, H * 0.04 * (1 + Math.sin(m.t * 20)), '#5e3f0f');
    else D.smile(ctx, 0, -H * 0.45, H * 0.05, H * 0.035, '#5e3f0f', 1.6);
    // tiara, slightly crooked
    ctx.save();
    ctx.translate(0, -kh - H * 0.26); ctx.rotate(-0.12);
    D.poly(ctx, [[-H * 0.11, 0], [H * 0.11, 0], [H * 0.09, -H * 0.06], [H * 0.045, -H * 0.02],
                 [0, -H * 0.1], [-H * 0.045, -H * 0.02], [-H * 0.09, -H * 0.06]], '#ffd24a',
      { shadow: 'rgba(0,0,0,.25)', blur: 3, sy: 1 });
    D.circle(ctx, 0, -H * 0.06, H * 0.018, '#7fe8ff');
    ctx.restore();
    // foam halo, because she is beloved
    for (let i = 0; i < 4; i++) {
      const a = m.t * 0.6 + i * 1.57;
      D.circle(ctx, Math.cos(a) * H * 0.3, -kh - H * 0.34 + Math.sin(a) * H * 0.05, H * 0.02, 'rgba(255,243,214,.7)');
    }
    ctx.restore();
  }

  /* draw(ctx, x, y, o) - o: scale, kind, dir, talk, alert, hurt, attack, tag */
  function draw(ctx, x, y, o) {
    o = o || {};
    const dt = Math.min(0.05, o.dt === undefined ? 1 / 60 : o.dt);
    const m = M(o.tag || o.kind || 'n');
    m.t += dt;
    m.blink -= dt;
    const blink = m.blink < 0.09;
    if (m.blink < -0.02) m.blink = U.rnd(1.6, 5.5);
    m.lookT -= dt;
    if (m.lookT <= 0) { m.lookT = U.rnd(0.6, 2.6); m.look.x = U.rnd(-1, 1); m.look.y = U.rnd(-0.4, 0.7); }

    if (o.kind === 'keg') { keg(ctx, x, y, 54 * (o.scale || 1), m, o.talk); return; }

    const K = KINDS[o.kind] || KINDS.merchant;
    const sc = o.scale === undefined ? 1 : o.scale;
    const H = (K.small ? 30 : K.big ? 52 : 42) * sc;
    const dir = o.dir === undefined ? 1 : o.dir;
    const walk = o.walk || 0;                     // 0..1 movement amount
    const step = Math.sin(m.t * (6 + walk * 6)) * walk;
    const breathe = Math.sin(m.t * 1.8) * H * 0.01;

    ctx.save();
    ctx.translate(x, y + breathe);
    ctx.scale(dir < 0 ? -1 : 1, 1);
    if (o.hurt) ctx.rotate(Math.sin(m.t * 44) * 0.07);

    const hipY = -H * 0.36, shoY = -H * 0.62, hr = H * 0.13;
    const headC = [H * 0.01, shoY - hr * 1.05];
    const bw = H * 0.15;

    if (K.fish) { fishFolk(ctx, H, m, K, blink, o); ctx.restore(); return; }
    if (K.crabby) { crabFolk(ctx, H, m, K, blink, o); ctx.restore(); return; }

    /* legs */
    for (let i = 0; i < 2; i++) {
      const lx = -bw * 0.4 + i * bw * 0.8;
      const sw = (i ? step : -step) * H * 0.1;
      D.capsule(ctx, lx, hipY, lx + sw, -H * 0.02, H * 0.05, H * 0.04, i ? K.suit : K.suit2);
      D.rr(ctx, lx + sw - H * 0.05, -H * 0.03, H * 0.11, H * 0.04, 2, '#20242c');
    }
    /* far arm */
    arm(ctx, H, m, K, -1, o, step);
    /* torso */
    D.rr(ctx, -bw, shoY, bw * 2, hipY - shoY + H * 0.04, H * 0.05,
      D.vgrad(ctx, 0, shoY, 0, hipY, [[0, D.shade(K.suit, 0.12)], [1, K.suit2]], 'f' + K.suit + Math.round(H)),
      { shadow: 'rgba(0,20,30,.3)', blur: 5, sy: 2 });
    if (K.badge) {
      D.rr(ctx, -bw * 0.1, shoY + H * 0.06, bw * 0.5, H * 0.02, 1, '#ffc94a');
      D.circle(ctx, -bw * 0.55, shoY + H * 0.08, H * 0.026, '#ffc94a');
      D.rr(ctx, -bw, hipY - H * 0.04, bw * 2, H * 0.045, 2, '#20242c');
    }
    if (K.enemy) {
      // ragged edge so enemies read as hostile
      D.poly(ctx, [[-bw, hipY + H * 0.04], [-bw * 0.6, hipY - H * 0.02], [-bw * 0.2, hipY + H * 0.05],
                   [bw * 0.2, hipY - H * 0.02], [bw * 0.6, hipY + H * 0.05], [bw, hipY]], K.suit2);
    }
    /* near arm */
    arm(ctx, H, m, K, 1, o, step);
    /* head */
    D.rr(ctx, headC[0] - hr, headC[1] - hr, hr * 2, hr * 2.05, hr * 0.5, K.skin,
      { shadow: 'rgba(0,20,30,.25)', blur: 4, sy: 2 });
    hat(ctx, K, headC, hr, H);
    if (K.shades) {
      D.rr(ctx, headC[0] - hr * 0.85, headC[1] - hr * 0.25, hr * 1.7, hr * 0.45, hr * 0.12, '#151a24');
      D.rect(ctx, headC[0] - hr * 0.7, headC[1] - hr * 0.18, hr * 0.3, hr * 0.12, 'rgba(255,255,255,.28)');
    } else if (blink) {
      D.line(ctx, headC[0] - hr * 0.45, headC[1] - hr * 0.1, headC[0] - hr * 0.1, headC[1] - hr * 0.1, '#141c28', 1.4);
      D.line(ctx, headC[0] + hr * 0.12, headC[1] - hr * 0.1, headC[0] + hr * 0.48, headC[1] - hr * 0.1, '#141c28', 1.4);
    } else {
      D.eye(ctx, headC[0] - hr * 0.28, headC[1] - hr * 0.1, hr * 0.23, m.look, { pupil: K.enemy ? '#c9343f' : '#141c28' });
      D.eye(ctx, headC[0] + hr * 0.3, headC[1] - hr * 0.1, hr * 0.23, m.look, { pupil: K.enemy ? '#c9343f' : '#141c28' });
    }
    if (K.beard) {
      D.blob(ctx, [[headC[0] - hr * 0.6, headC[1] + hr * 0.4], [headC[0] + hr * 0.62, headC[1] + hr * 0.42],
                   [headC[0] + hr * 0.5, headC[1] + hr * 1.1], [headC[0], headC[1] + hr * 1.35],
                   [headC[0] - hr * 0.48, headC[1] + hr * 1.05]], K.hair, { tension: 0.8 });
    } else {
      const mo = o.talk ? 0.35 + Math.abs(Math.sin(m.t * 20)) * 0.65 : 0.18;
      D.rr(ctx, headC[0] - hr * 0.22, headC[1] + hr * 0.45, hr * 0.44, hr * 0.5 * mo, hr * 0.1, '#7d2b2b');
    }
    if (o.alert) {
      KA.T.draw(ctx, '!', headC[0], headC[1] - hr * 2.4 - Math.abs(Math.sin(m.t * 6)) * H * 0.04,
        '#ff6f74', { size: H * 0.3, align: 'center', weight: 900, shadow: true });
    }
    ctx.restore();
  }

  function arm(ctx, H, m, K, side, o, step) {
    const sx = side * H * 0.15, sy = -H * 0.58;
    let tx, ty;
    const swing = o.attack ? Math.sin(U.clamp(o.attack, 0, 1) * Math.PI) : 0;
    if (side > 0 && swing > 0) { tx = sx + H * 0.28 * Math.cos(-0.7 + swing * 1.9); ty = sy + H * 0.28 * Math.sin(-0.7 + swing * 1.9); }
    else if (K.hat === 'cap' && !o.talk) { tx = sx - side * H * 0.1; ty = sy + H * 0.13; }
    else { tx = sx + side * H * 0.08 - step * H * 0.06; ty = sy + H * 0.2 - (o.talk ? Math.abs(Math.sin(m.t * 7)) * H * 0.1 : 0); }
    const el = R.solve2(sx, sy, tx, ty, H * 0.13, H * 0.12, side < 0);
    const col = side > 0 ? K.suit : K.suit2;
    D.capsule(ctx, sx, sy, el.x, el.y, H * 0.042, H * 0.036, col);
    D.capsule(ctx, el.x, el.y, tx, ty, H * 0.036, H * 0.03, col);
    D.circle(ctx, tx, ty, H * 0.04, K.skin);
    if (side > 0 && K.enemy && !K.fish) {
      // a nasty little weapon
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.8 + swing * 1.9);
      D.capsule(ctx, 0, 0, H * 0.22, 0, H * 0.02, H * 0.014, '#6d4a24');
      D.tri(ctx, [H * 0.22, -H * 0.03], [H * 0.3, 0], [H * 0.22, H * 0.03], '#cfd8e2');
      ctx.restore();
    }
    if (K.hat === 'boater' && side > 0) {
      D.rr(ctx, tx - H * 0.04, ty - H * 0.01, H * 0.08, H * 0.1, 2, '#f4e7c9');   // betting slip
    }
  }

  function hat(ctx, K, c, hr, H) {
    switch (K.hat) {
      case 'cap':
        D.rr(ctx, c[0] - hr * 1.05, c[1] - hr * 1.1, hr * 2.1, hr * 0.7, hr * 0.2, K.suit);
        D.rr(ctx, c[0] - hr * 0.1, c[1] - hr * 0.52, hr * 1.5, hr * 0.2, hr * 0.08, K.suit2);
        D.circle(ctx, c[0], c[1] - hr * 0.82, hr * 0.15, '#ffc94a');
        break;
      case 'hood':
        D.blob(ctx, [[c[0] - hr * 1.1, c[1] + hr * 0.3], [c[0] - hr * 0.9, c[1] - hr * 1.1],
                     [c[0] + hr * 0.9, c[1] - hr * 1.1], [c[0] + hr * 1.1, c[1] + hr * 0.3],
                     [c[0] + hr * 0.5, c[1] - hr * 0.35], [c[0] - hr * 0.5, c[1] - hr * 0.35]],
          K.suit, { tension: 0.5 });
        break;
      case 'boater':
        D.rr(ctx, c[0] - hr * 1.3, c[1] - hr * 0.72, hr * 2.6, hr * 0.16, 2, '#f4e7c9');
        D.rr(ctx, c[0] - hr * 0.75, c[1] - hr * 1.25, hr * 1.5, hr * 0.6, hr * 0.12, '#f4e7c9');
        D.rect(ctx, c[0] - hr * 0.75, c[1] - hr * 0.88, hr * 1.5, hr * 0.16, K.suit);
        break;
      case 'mortar':
        D.rr(ctx, c[0] - hr * 1.1, c[1] - hr * 0.95, hr * 2.2, hr * 0.2, 2, '#1c3a56');
        D.rr(ctx, c[0] - hr * 0.6, c[1] - hr * 1.15, hr * 1.2, hr * 0.25, 2, '#1c3a56');
        D.line(ctx, c[0] + hr * 0.9, c[1] - hr * 0.9, c[0] + hr * 1.1, c[1] - hr * 0.2, '#ffc94a', 1.5);
        break;
      case 'bandana':
        D.rr(ctx, c[0] - hr * 1.02, c[1] - hr * 1.0, hr * 2.04, hr * 0.5, hr * 0.12, '#7fe8ff');
        D.tri(ctx, [c[0] - hr * 0.9, c[1] - hr * 0.6], [c[0] - hr * 1.5, c[1] - hr * 0.05],
              [c[0] - hr * 0.85, c[1] - hr * 0.12], '#7fe8ff');
        break;
      case 'mask':
        D.rr(ctx, c[0] - hr * 0.95, c[1] - hr * 0.32, hr * 1.9, hr * 0.5, hr * 0.1, '#2b2018');
        break;
      case 'shell':
        D.blob(ctx, [[c[0] - hr, c[1] - hr * 0.6], [c[0] - hr * 0.6, c[1] - hr * 1.3],
                     [c[0] + hr * 0.6, c[1] - hr * 1.3], [c[0] + hr, c[1] - hr * 0.6]], '#f6d7e8', { tension: 0.5 });
        break;
      case 'hat':
        D.rr(ctx, c[0] - hr * 1.2, c[1] - hr * 0.8, hr * 2.4, hr * 0.16, 2, '#8a6a3c');
        D.blob(ctx, [[c[0] - hr * 0.7, c[1] - hr * 0.8], [c[0] - hr * 0.5, c[1] - hr * 1.4],
                     [c[0] + hr * 0.5, c[1] - hr * 1.4], [c[0] + hr * 0.7, c[1] - hr * 0.8]], '#a4813c', { tension: 0.5 });
        break;
      case 'crown':
        D.poly(ctx, [[c[0] - hr * 0.95, c[1] - hr * 0.75], [c[0] + hr * 0.95, c[1] - hr * 0.75],
                     [c[0] + hr * 0.95, c[1] - hr * 1.45], [c[0] + hr * 0.5, c[1] - hr * 1.05],
                     [c[0], c[1] - hr * 1.65], [c[0] - hr * 0.5, c[1] - hr * 1.05],
                     [c[0] - hr * 0.95, c[1] - hr * 1.45]], '#ffd24a',
          { shadow: 'rgba(255,201,74,.6)', blur: 10, sy: 0 });
        D.circle(ctx, c[0], c[1] - hr * 1.05, hr * 0.14, '#ff6f74');
        break;
      case 'beak':
        D.tri(ctx, [c[0] + hr * 0.8, c[1] - hr * 0.1], [c[0] + hr * 1.9, c[1] + hr * 0.1],
              [c[0] + hr * 0.8, c[1] + hr * 0.35], '#ffc94a');
        break;
      default:
        D.blob(ctx, [[c[0] - hr, c[1] - hr * 0.45], [c[0] - hr * 0.8, c[1] - hr * 1.12],
                     [c[0] + hr * 0.8, c[1] - hr * 1.12], [c[0] + hr, c[1] - hr * 0.45],
                     [c[0], c[1] - hr * 0.65]], K.hair, { tension: 0.5 });
    }
  }

  /* enemy shapes that are not humanoid */
  function fishFolk(ctx, H, m, K, blink, o) {
    const L = H * 1.15, w = Math.sin(m.t * 8) * 0.2;
    D.blob(ctx, [[L * 0.5, 0], [L * 0.15, -L * 0.18], [-L * 0.1, -L * 0.17], [-L * 0.42, -L * 0.06],
                 [-L * 0.5, 0], [-L * 0.42, L * 0.07], [-L * 0.1, L * 0.15], [L * 0.2, L * 0.11]],
      D.vgrad(ctx, 0, -L * 0.2, 0, L * 0.2, [[0, K.suit2], [0.5, K.skin], [1, '#e8f2fa']], 'sk' + Math.round(L)),
      { tension: 0.6, shadow: 'rgba(0,20,30,.3)', blur: 6, sy: 3 });
    D.tri(ctx, [-L * 0.02, -L * 0.16], [L * 0.04, -L * 0.34], [L * 0.1, -L * 0.15], K.suit);
    ctx.save(); ctx.translate(-L * 0.46, 0); ctx.rotate(w);
    D.blob(ctx, [[0, 0], [-L * 0.14, -L * 0.24], [-L * 0.2, 0], [-L * 0.12, L * 0.18]], K.suit, { tension: 0.45 });
    ctx.restore();
    // toothy grin
    D.curve(ctx, [[L * 0.5, L * 0.02], [L * 0.3, L * 0.09], [L * 0.14, L * 0.07]], '#3f4d5c', 1.6);
    for (let i = 0; i < 4; i++) D.tri(ctx, [L * (0.44 - i * 0.07), L * 0.045], [L * (0.41 - i * 0.07), L * 0.09],
      [L * (0.38 - i * 0.07), L * 0.045], '#ffffff');
    D.eye(ctx, L * 0.32, -L * 0.06, L * 0.045, m.look, { pupil: '#c9343f' });
  }
  function crabFolk(ctx, H, m, K, blink, o) {
    const L = H * 0.9, b = Math.sin(m.t * 4);
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const bx = -L * 0.16 + i * L * 0.16;
        const a = 0.8 + Math.sin(m.t * 4 + i + (side > 0 ? 0 : 2)) * 0.4;
        D.capsule(ctx, bx, -L * 0.1, bx + Math.cos(a) * L * 0.18, -L * 0.1 + Math.sin(a) * L * 0.2,
          L * 0.026, L * 0.018, side > 0 ? K.suit : K.suit2);
      }
    }
    for (const side of [-1, 1]) {
      const cx = L * 0.28, cy = -L * 0.16 + side * L * 0.07 + b * L * 0.02;
      D.capsule(ctx, L * 0.12, -L * 0.18, cx, cy, L * 0.035, L * 0.045, K.skin);
      D.blob(ctx, [[cx, cy], [cx + L * 0.13, cy - L * 0.06], [cx + L * 0.17, cy], [cx + L * 0.08, cy + L * 0.03]],
        K.suit, { tension: 0.5 });
    }
    D.ellipse(ctx, 0, -L * 0.22, L * 0.3, L * 0.19, 0,
      D.vgrad(ctx, 0, -L * 0.4, 0, 0, [[0, D.shade(K.skin, 0.18)], [1, K.suit2]], 'cb' + Math.round(L)),
      { shadow: 'rgba(0,20,30,.35)', blur: 6, sy: 3 });
    for (const side of [-1, 1]) {
      const ex = L * 0.1 + side * L * 0.04;
      D.capsule(ctx, ex, -L * 0.28, ex, -L * 0.42, L * 0.018, L * 0.016, K.skin);
      D.eye(ctx, ex, -L * 0.44, L * 0.04, m.look, { pupil: '#c9343f' });
    }
  }

  return { draw, KINDS, keg };
})();
