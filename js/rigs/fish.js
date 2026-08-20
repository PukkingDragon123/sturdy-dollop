/* ============================================================
   rigs/fish.js - procedural fish, squid, jellies, crabs.
   One loft function plus a shape table, so 19 species come out of
   ~200 lines with wiggling tails, flapping fins and dumb eyes.
   ============================================================ */
DZ.Rig.fish = (function () {
  const U = DZ.Util, S = DZ.Rig.S, Px = DZ.Pixel;

  /* body profiles: u along the body (0 = snout), half-heights as a
     fraction of length, top and bottom */
  const SHAPES = {
    slim:   { UU: [0, .12, .3, .5, .72, .9, 1], TOP: [.03, .12, .15, .13, .08, .05, .03], BOT: [.025, .11, .14, .12, .07, .04, .025], tail: 'fork', amp: .05, len: 1 },
    oval:   { UU: [0, .12, .3, .5, .72, .9, 1], TOP: [.04, .17, .22, .19, .11, .06, .03], BOT: [.035, .17, .22, .18, .10, .05, .03], tail: 'fan', amp: .04, len: .9 },
    long:   { UU: [0, .1, .28, .5, .72, .9, 1], TOP: [.025, .09, .11, .10, .07, .04, .02], BOT: [.02, .085, .105, .095, .06, .035, .02], tail: 'fork', amp: .06, len: 1.25 },
    round:  { UU: [0, .12, .32, .55, .78, .92, 1], TOP: [.05, .21, .28, .24, .13, .07, .03], BOT: [.045, .21, .28, .23, .12, .06, .03], tail: 'fan', amp: .035, len: .8 },
    puffer: { UU: [0, .14, .35, .58, .8, .93, 1], TOP: [.07, .24, .30, .27, .16, .08, .04], BOT: [.065, .24, .30, .26, .15, .07, .04], tail: 'fan', amp: .03, len: .78, spikes: true },
    eel:    { UU: [0, .08, .22, .42, .62, .82, 1], TOP: [.02, .07, .075, .07, .06, .045, .015], BOT: [.018, .065, .07, .065, .055, .04, .015], tail: 'point', amp: .10, len: 1.5 }
  };
  const MAP = {
    fish_s: 'slim', fish_m: 'oval', fish_long: 'long', fish_round: 'round',
    puffer: 'puffer', eel: 'eel', squid: 'squid', jelly: 'jelly', crab: 'crab', prawn: 'prawn'
  };
  const state = {};
  function mem(id) {
    let m = state[id];
    if (!m) m = state[id] = { ph: Math.random() * 7, look: { x: 0, y: 0 }, lookT: 0,
      legs: null, tent: null, blink: U.rnd(0.5, 4) };
    return m;
  }
  function kindOf(sp) { return MAP[sp.sprite] || 'oval'; }

  function loft(shape, L, ph, amp) {
    const n = shape.UU.length, sp = [], top = [], bot = [];
    for (let i = 0; i < n; i++) {
      const u = shape.UU[i];
      sp.push([L * (0.5 - u), Math.sin(ph - u * 4.2) * Math.pow(u, 1.6) * amp * L]);
    }
    for (let i = 0; i < n; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)];
      const nx = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      top.push([sp[i][0] + Math.cos(nx) * shape.TOP[i] * L, sp[i][1] + Math.sin(nx) * shape.TOP[i] * L]);
      bot.push([sp[i][0] - Math.cos(nx) * shape.BOT[i] * L, sp[i][1] - Math.sin(nx) * shape.BOT[i] * L]);
    }
    return { sp, top, bot, ring: top.concat(bot.slice().reverse()) };
  }

  /* draw(ctx, species, x, y, opts) - opts: scale, flipX, alpha, speed, dead, tag */
  function draw(ctx, sp, x, y, opts) {
    opts = opts || {};
    const dt = Math.min(0.05, DZ.Rig.fish.dt || 1 / 60);
    const m = mem((sp.id || 'f') + (opts.tag || ''));
    const kind = kindOf(sp);
    const pal = sp.pal || { '1': '#8fd8ff', '2': '#3f7f9f', '3': '#ffffff' };
    const mid = pal['1'], dark = pal['2'], light = pal['3'];
    const spd = opts.speed === undefined ? 0.6 : opts.speed;
    m.ph += dt * (5 + spd * 7);
    m.lookT -= dt;
    if (m.lookT <= 0) { m.lookT = U.rnd(0.3, 1.6); m.look.x = U.rnd(-1, 1); m.look.y = U.rnd(-1, 1); }
    const base = 13 * (opts.scale === undefined ? 1 : opts.scale);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(opts.flipX ? -1 : 1, opts.dead ? -1 : 1);
    if (opts.rot) ctx.rotate(opts.rot);
    if (opts.alpha !== undefined && opts.alpha !== 1) ctx.globalAlpha = opts.alpha;

    if (kind === 'squid') squid(ctx, m, base, mid, dark, light, dt);
    else if (kind === 'jelly') jelly(ctx, m, base, mid, dark, light, dt);
    else if (kind === 'crab') crab(ctx, m, base, mid, dark, light);
    else if (kind === 'prawn') prawn(ctx, m, base, mid, dark, light);
    else swimmer(ctx, m, SHAPES[kind], base, mid, dark, light, sp);

    ctx.restore();
    if (opts.alpha !== undefined) ctx.globalAlpha = 1;
  }

  function swimmer(ctx, m, shape, base, mid, dark, light, sp) {
    const L = base * shape.len;
    const B = loft(shape, L, m.ph, shape.amp);
    const n = shape.UU.length;
    const dep = Math.max(0.5, L * 0.05);
    const tail = B.sp[n - 1], ped = B.sp[n - 2];
    let dev = Math.atan2(tail[1] - ped[1], tail[0] - ped[0]) - Math.PI;
    while (dev > Math.PI) dev -= 6.283;
    while (dev < -Math.PI) dev += 6.283;

    // caudal fin
    ctx.save();
    ctx.translate(tail[0], tail[1]);
    ctx.rotate(-dev * 1.1);
    const tw = L * 0.20, th = L * (shape.tail === 'point' ? 0.07 : 0.16);
    if (shape.tail === 'fork') {
      S.blob(ctx, [[0, 0], [-tw, -th * 1.3], [-tw * 0.55, 0], [-tw, th * 1.3]], Px.mix(mid, dark, .5), { depth: dep, tension: .3 });
    } else if (shape.tail === 'fan') {
      S.blob(ctx, [[0, 0], [-tw * 0.9, -th * 1.35], [-tw * 1.05, 0], [-tw * 0.9, th * 1.35]], Px.mix(mid, dark, .5), { depth: dep, tension: .45 });
    } else {
      S.blob(ctx, [[0, 0], [-tw * 1.3, -th], [-tw * 1.5, 0], [-tw * 1.3, th]], Px.mix(mid, dark, .5), { depth: dep, tension: .4 });
    }
    ctx.restore();

    // dorsal + pelvic fins
    const d0 = B.top[2], d1 = B.top[3];
    S.blob(ctx, [[d1[0], d1[1]], [d0[0], d0[1]], [d0[0] - L * 0.03, d0[1] - L * 0.10], [d1[0] + L * 0.02, d1[1] - L * 0.03]],
      Px.shade(dark, -0.1), { depth: dep * .6, tension: .4 });
    const v0 = B.bot[2], v1 = B.bot[3];
    S.blob(ctx, [[v1[0], v1[1]], [v0[0], v0[1]], [v0[0] - L * 0.02, v0[1] + L * 0.07], [v1[0], v1[1] + L * 0.02]],
      Px.shade(dark, -0.1), { depth: 0, tension: .4 });

    // body + belly + stripe
    const clip = (c) => {
      c.beginPath();
      const r = B.ring, k = r.length;
      c.moveTo(r[0][0], r[0][1]);
      for (let i = 0; i < k; i++) {
        const p0 = r[(i - 1 + k) % k], p1 = r[i], p2 = r[(i + 1) % k], p3 = r[(i + 2) % k];
        c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
                        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      c.closePath();
    };
    S._extrude(ctx, clip, mid, { depth: dep, dx: 0.2 });
    S.panel(ctx, clip, (c) => {
      c.moveTo(B.bot[0][0], B.bot[0][1]);
      for (let i = 1; i < n; i++) c.lineTo(B.bot[i][0], B.bot[i][1]);
      for (let i = n - 1; i >= 0; i--) c.lineTo(B.sp[i][0], B.sp[i][1] + shape.BOT[i] * L * 0.35);
      c.closePath();
    }, light);
    S.panel(ctx, clip, (c) => {
      c.moveTo(B.top[0][0], B.top[0][1]);
      for (let i = 1; i < n; i++) c.lineTo(B.top[i][0], B.top[i][1]);
      for (let i = n - 1; i >= 0; i--) c.lineTo(B.sp[i][0], B.sp[i][1] - shape.TOP[i] * L * 0.45);
      c.closePath();
    }, Px.shade(dark, 0.05));
    // pectoral
    const pf = B.sp[1];
    S.ellipse(ctx, pf[0] - L * 0.02, pf[1] + shape.BOT[1] * L * 0.5, L * 0.07, L * 0.035,
      0.5 + Math.sin(m.ph * 1.3) * 0.35, Px.shade(mid, -0.2), { depth: 0 });
    if (SHAPES[kindOf({ sprite: 'puffer' })] && shape.spikes) {
      ctx.strokeStyle = Px.shade(dark, -0.2);
      ctx.lineWidth = Math.max(0.5, L * 0.03);
      for (let i = 1; i < n - 1; i++) {
        for (const arr of [B.top, B.bot]) {
          const s = arr[i], c = B.sp[i];
          const ang = Math.atan2(s[1] - c[1], s[0] - c[0]);
          ctx.beginPath();
          ctx.moveTo(s[0], s[1]);
          ctx.lineTo(s[0] + Math.cos(ang) * L * 0.07, s[1] + Math.sin(ang) * L * 0.07);
          ctx.stroke();
        }
      }
    }
    // face
    const h = B.sp[1];
    const er = L * 0.055;
    S.eye(ctx, h[0] + L * 0.055, h[1] - L * 0.02, er, m.look, { pupil: '#111a26' });
    ctx.strokeStyle = Px.shade(dark, -0.4);
    ctx.lineWidth = Math.max(0.4, L * 0.022);
    ctx.beginPath();
    ctx.moveTo(B.sp[0][0], B.sp[0][1] + L * 0.01);
    ctx.lineTo(B.sp[0][0] - L * 0.05, B.sp[0][1] + L * 0.045);
    ctx.stroke();
  }

  function squid(ctx, m, base, mid, dark, light, dt) {
    const L = base * 1.1;
    const pulse = 1 + Math.sin(m.ph * 1.6) * 0.12;
    if (!m.tent) { m.tent = []; for (let i = 0; i < 6; i++) m.tent.push(new DZ.Rig.Chain(4, L * 0.13, { grav: 8, drag: .88, stiff: 2 })); }
    // mantle points backward (-x)
    S.blob(ctx, [[L * 0.42, 0], [L * 0.05, -L * 0.26 * pulse], [-L * 0.42, -L * 0.12], [-L * 0.5, 0],
                 [-L * 0.42, L * 0.12], [L * 0.05, L * 0.26 * pulse]], mid, { depth: L * 0.05, tension: .5 });
    S.blob(ctx, [[-L * 0.3, -L * 0.1], [-L * 0.55, -L * 0.24], [-L * 0.6, 0], [-L * 0.55, L * 0.24], [-L * 0.3, L * 0.1]],
      Px.shade(dark, -0.05), { depth: 0, tension: .45 });
    for (let i = 0; i < 6; i++) {
      const c = m.tent[i];
      const ay = -L * 0.14 + i * L * 0.055;
      if (!c._p) { c.place(L * 0.42, ay); c._p = 1; }
      c.update(dt, L * 0.42, ay, 70 + Math.sin(m.ph * 2 + i) * 60, Math.sin(m.ph * 3 + i * 1.3) * 40);
      const pts = c.pts();
      S.ribbon(ctx, pts, pts.map((p, k) => L * (0.045 - k * 0.009)), i % 2 ? mid : Px.shade(mid, -0.12), { depth: 0, tension: .5 });
    }
    S.eye(ctx, L * 0.2, -L * 0.09, L * 0.075, m.look, { pupil: '#0e1620' });
    S.eye(ctx, L * 0.2, L * 0.09, L * 0.075, m.look, { pupil: '#0e1620' });
  }

  function jelly(ctx, m, base, mid, dark, light, dt) {
    const L = base;
    const pulse = 1 + Math.sin(m.ph * 1.9) * 0.16;
    if (!m.tent) { m.tent = []; for (let i = 0; i < 5; i++) m.tent.push(new DZ.Rig.Chain(5, L * 0.11, { grav: 12, drag: .9, stiff: 2 })); }
    for (let i = 0; i < 5; i++) {
      const c = m.tent[i];
      const ax = (i - 2) * L * 0.10;
      if (!c._p) { c.place(ax, 0); c._p = 1; }
      c.update(dt, ax, 0, Math.sin(m.ph * 1.4 + i) * 40, 0);
      const pts = c.pts();
      S.ribbon(ctx, pts, pts.map((p, k) => L * (0.028 - k * 0.004)), Px.shade(mid, -0.1), { depth: 0, tension: .5 });
    }
    ctx.globalAlpha *= 0.88;
    S.blob(ctx, [[-L * 0.34, L * 0.02], [-L * 0.3, -L * 0.22 * pulse], [0, -L * 0.34 * pulse],
                 [L * 0.3, -L * 0.22 * pulse], [L * 0.34, L * 0.02], [0, L * 0.1]], mid, { depth: L * 0.04, tension: .55 });
    ctx.globalAlpha /= 0.88;
    S.blob(ctx, [[-L * 0.2, -L * 0.06], [0, -L * 0.24 * pulse], [L * 0.2, -L * 0.06], [0, L * 0.02]], light, { depth: 0, tension: .5 });
    S.eye(ctx, -L * 0.1, -L * 0.05, L * 0.055, m.look, { pupil: '#141b2a' });
    S.eye(ctx, L * 0.1, -L * 0.05, L * 0.055, m.look, { pupil: '#141b2a' });
  }

  function crab(ctx, m, base, mid, dark, light) {
    const L = base;
    const bob = Math.sin(m.ph * 1.4);
    for (let i = 0; i < 4; i++) {
      const sx = -L * 0.3 + i * L * 0.2;
      const ang = 0.9 + Math.sin(m.ph * 2 + i) * 0.35;
      const kx = sx + Math.cos(ang) * L * 0.2, ky = L * 0.1 + Math.sin(ang) * L * 0.2;
      S.capsule(ctx, sx, L * 0.05, kx, ky, L * 0.035, L * 0.025, Px.shade(dark, -0.05), { depth: 0 });
      S.capsule(ctx, kx, ky, kx + L * 0.06, ky + L * 0.14, L * 0.025, L * 0.018, Px.shade(dark, -0.15), { depth: 0 });
    }
    for (const s of [-1, 1]) {
      const cx = s * L * 0.42, cy = -L * 0.02 + bob * L * 0.02;
      S.capsule(ctx, s * L * 0.24, 0, cx, cy, L * 0.04, L * 0.05, mid, { depth: L * 0.03 });
      S.blob(ctx, [[cx, cy - L * 0.09], [cx + s * L * 0.16, cy - L * 0.05], [cx + s * L * 0.13, cy + L * 0.02], [cx, cy + L * 0.07]],
        Px.shade(mid, 0.1), { depth: L * 0.02, tension: .4 });
    }
    S.ellipse(ctx, 0, 0, L * 0.34, L * 0.22, 0, mid, { depth: L * 0.05 });
    S.ellipse(ctx, 0, L * 0.03, L * 0.24, L * 0.11, 0, light, { depth: 0 });
    S.eye(ctx, -L * 0.1, -L * 0.16, L * 0.06, m.look, { pupil: '#141b2a' });
    S.eye(ctx, L * 0.1, -L * 0.16, L * 0.06, m.look, { pupil: '#141b2a' });
  }

  function prawn(ctx, m, base, mid, dark, light) {
    const L = base * 1.1;
    const curl = Math.sin(m.ph * 1.7) * 0.25;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const u = i / 5;
      const a = -0.5 + curl * u * 2;
      pts.push([L * (0.4 - u * 0.8), Math.sin(u * 2.2 + curl) * L * 0.12]);
    }
    S.ribbon(ctx, pts, pts.map((p, i) => L * (0.13 - i * 0.017)), mid, { depth: L * 0.04, tension: .5 });
    ctx.strokeStyle = Px.shade(dark, -0.1);
    ctx.lineWidth = Math.max(0.4, L * 0.02);
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1] - L * 0.1);
      ctx.lineTo(pts[i][0], pts[i][1] + L * 0.1);
      ctx.stroke();
    }
    ctx.strokeStyle = Px.shade(mid, -0.2);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(L * 0.4, s * L * 0.03);
      ctx.quadraticCurveTo(L * 0.62, s * L * 0.16, L * 0.78, s * L * 0.06 + Math.sin(m.ph * 3) * L * 0.04);
      ctx.stroke();
    }
    S.blob(ctx, [[L * 0.42, -L * 0.05], [L * 0.5, -L * 0.02], [L * 0.46, L * 0.08], [L * 0.34, L * 0.06]], light, { depth: 0, tension: .4 });
    S.eye(ctx, L * 0.36, -L * 0.06, L * 0.05, m.look, { pupil: '#141b2a' });
  }

  return { draw, dt: 1 / 60, kindOf, SHAPES };
})();

/* world-space fish draw; UI lists keep the crisp pixel icons */
DZ.Fish = {
  draw(ctx, sp, x, y, opts) { DZ.Rig.fish.draw(ctx, sp, x, y, opts || {}); }
};
