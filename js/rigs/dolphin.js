/* ============================================================
   rigs/dolphin.js - a procedurally animated dolphin.

   Everything is placed by fraction of body length from the tip of
   the rostrum, using real bottlenose landmarks:
     0.00 rostrum tip      0.145 eye        0.17  blowhole
     0.24 pectoral base    0.44  dorsal     0.86  peduncle
     1.00 fluke notch
   The body is a smooth loft over a non-uniform spine so the beak
   stays slim while the melon bulges; locomotion is a travelling
   wave whose amplitude grows toward the tail, which is how they
   actually swim. The face is deliberately idiotic.
   ============================================================ */
DZ.Rig.dolphin = (function () {
  const U = DZ.Util, S = DZ.Rig.S, Px = DZ.Pixel;

  /* non-uniform samples: dense through the head, sparse down the body */
  const UU  = [0, .045, .09, .135, .195, .275, .36, .45, .55, .66, .76, .86, .94, 1];
  const TOP = [.011, .016, .026, .078, .112, .120, .118, .112, .102, .087, .069, .047, .030, .012];
  const BOT = [.009, .015, .024, .052, .088, .101, .102, .097, .088, .075, .058, .038, .023, .010];
  const N = UU.length;
  const state = {};

  function mem(id) {
    let m = state[id];
    if (!m) m = state[id] = {
      phase: Math.random() * 7, look: { x: 0, y: 0 }, lookT: 0, blink: U.rnd(1, 5),
      jaw: new DZ.Rig.Spring(0.4, 110, 9), belly: new DZ.Rig.Jiggle(120, 8, 2.5),
      px: null, py: null, vx: 0, vy: 0
    };
    return m;
  }

  /* ---- spine + lofted outline in local space (nose at +x) ---- */
  function build(L, phase, amp) {
    const sp = [], top = [], bot = [];
    for (let i = 0; i < N; i++) {
      const u = UU[i];
      const x = L * (0.5 - u);
      const y = Math.sin(phase - u * 3.4) * Math.pow(u, 2.2) * amp * L;
      sp.push([x, y]);
    }
    for (let i = 0; i < N; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(N - 1, i + 1)];
      // spine runs -x, so the outward-up normal is tangent + 90deg
      const nx = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      const cx = Math.cos(nx), cy = Math.sin(nx);
      top.push([sp[i][0] + cx * TOP[i] * L, sp[i][1] + cy * TOP[i] * L]);
      bot.push([sp[i][0] - cx * BOT[i] * L, sp[i][1] - cy * BOT[i] * L]);
    }
    // interpolate any landmark by fraction of body length
    function atU(u) {
      let i = 1;
      while (i < N - 1 && UU[i] < u) i++;
      const f = (u - UU[i - 1]) / (UU[i] - UU[i - 1] || 1);
      const lerpP = (A, B) => [U.lerp(A[i - 1][0], A[i][0], f), U.lerp(A[i - 1][1], A[i][1], f)];
      const p = lerpP(sp), t = lerpP(top), b = lerpP(bot);
      const ang = Math.atan2(sp[Math.min(N - 1, i)][1] - sp[i - 1][1], sp[Math.min(N - 1, i)][0] - sp[i - 1][0]);
      return { p, t, b, ang };
    }
    return { sp, top, bot, ring: top.concat(bot.slice().reverse()), atU };
  }

  function path(ctx, ring, from, to) {
    const n = ring.length;
    ctx.moveTo(ring[0][0], ring[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = ring[(i - 1 + n) % n], p1 = ring[i], p2 = ring[(i + 1) % n], p3 = ring[(i + 2) % n];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
                        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.closePath();
  }

  function draw(ctx, d, x, y, opts) {
    opts = opts || {};
    const dt = Math.min(0.05, opts.dt === undefined ? (DZ.Rig.dolphin.dt || 1 / 60) : opts.dt);
    const m = mem(((d && d.id) || 'anon') + (opts.tag || ''));
    const sc = opts.scale === undefined ? 1 : opts.scale;
    const L = 27 * sc * ((opts.calf || (d && d.calf)) ? 0.7 : 1);
    const pal = (d && d.evil) ? { '1': '#7a4ab8', '2': '#2b1046', '3': '#d8bcff' }
                              : ((d && DZ.Dolphin.palette(d)) || { '1': '#5aa8d8', '2': '#2f6f9e', '3': '#cfeaf7' });
    const mid = pal['1'], dark = pal['2'], belly = pal['3'];
    const cape = Px.shade(dark, -0.08);

    const speed = opts.speed === undefined ? 0.5 : U.clamp(opts.speed, 0, 3);
    m.phase += dt * (3.6 + speed * 6);
    if (m.px !== null) {
      const nvx = (x - m.px) / Math.max(1e-4, dt), nvy = (y - m.py) / Math.max(1e-4, dt);
      m.belly.push((nvx - m.vx) * 0.008, (nvy - m.vy) * 0.008);
      m.vx = U.damp(m.vx, nvx, 0.001, dt); m.vy = U.damp(m.vy, nvy, 0.001, dt);
    }
    m.px = x; m.py = y;
    m.belly.update(dt);
    m.lookT -= dt;
    if (m.lookT <= 0) { m.lookT = U.rnd(0.4, 2.2); m.look.x = U.rnd(-1, 1); m.look.y = U.rnd(-0.6, 0.9); }
    m.blink -= dt;
    const blinking = m.blink < 0.08;
    if (m.blink < -0.02) m.blink = U.rnd(1.6, 5.5);
    m.jaw.target = 0.35 + Math.sin(m.phase * 0.42) * 0.32 + (opts.talk ? 0.5 : 0);
    const jaw = U.clamp(m.jaw.update(dt), 0, 1.2);

    const B = build(L, m.phase, 0.026 + speed * 0.03);
    const dep = Math.max(0.7, L * 0.05);

    ctx.save();
    ctx.translate(x, y);
    if (opts.rot) ctx.rotate(opts.rot * (opts.flipX ? -1 : 1));
    ctx.scale((opts.flipX ? -1 : 1) * (opts.sx || 1), (opts.sy || 1) * (opts.dead ? -1 : 1));
    if (opts.alpha !== undefined && opts.alpha !== 1) ctx.globalAlpha = opts.alpha;

    /* far flipper behind everything */
    flipper(ctx, B.atU(0.25), L, Px.shade(dark, -0.4), 0.8, m.phase, 1);
    /* flukes: a horizontal blade, angled by the stroke */
    flukes(ctx, B.atU(1), B.atU(0.9), L, mid, dark, dep);

    /* ---- body ---- */
    const clip = (c) => { c.beginPath(); path(c, B.ring); };
    S._extrude(ctx, clip, mid, { depth: dep, dx: 0.15 });
    // dark dorsal cape, dipping low behind the head like the real thing
    S.panel(ctx, clip, (c) => {
      c.moveTo(B.top[1][0], B.top[1][1]);
      for (let i = 1; i < N; i++) c.lineTo(B.top[i][0], B.top[i][1]);
      for (let i = N - 1; i >= 1; i--) {
        const u = UU[i];
        const drop = (0.012 + Math.sin(Math.min(1, u * 1.25) * Math.PI) * 0.085) * L;
        c.lineTo(B.sp[i][0], B.sp[i][1] - TOP[i] * L + drop);
      }
      c.closePath();
    }, cape);
    // pale belly
    S.panel(ctx, clip, (c) => {
      c.moveTo(B.bot[1][0], B.bot[1][1]);
      for (let i = 1; i < N; i++) c.lineTo(B.bot[i][0], B.bot[i][1]);
      for (let i = N - 1; i >= 1; i--) {
        const u = UU[i];
        const rise = (0.01 + Math.sin(Math.min(1, u * 1.1) * Math.PI) * 0.05) * L * (1 + m.belly.squash * 0.6);
        c.lineTo(B.sp[i][0], B.sp[i][1] + BOT[i] * L - rise);
      }
      c.closePath();
    }, belly);
    // flank hourglass
    S.panel(ctx, clip, (c) => {
      const A = B.atU(0.22), M = B.atU(0.5), Z = B.atU(0.8);
      c.moveTo(A.p[0], A.p[1] - L * 0.02);
      c.quadraticCurveTo(M.p[0], M.p[1] + L * 0.075, Z.p[0], Z.p[1] - L * 0.01);
      c.quadraticCurveTo(M.p[0], M.p[1] - L * 0.03, A.p[0], A.p[1] - L * 0.02);
      c.closePath();
    }, Px.mix(mid, belly, 0.5));

    dorsal(ctx, B, L, cape, dep);
    flipper(ctx, B.atU(0.27), L, Px.shade(dark, -0.3), 1, m.phase, -1);
    head(ctx, B, L, { mid, dark, belly, cape }, m, jaw, blinking, opts);
    if (d && d.evil && !opts.noHat) evilBits(ctx, B, L);
    if (d && d.crown) crown(ctx, B, L);

    ctx.restore();
    if (opts.alpha !== undefined) ctx.globalAlpha = 1;
  }

  /* paddle-shaped pectoral, angled down and back */
  function flipper(ctx, at, L, col, alpha, phase, side) {
    const flap = Math.sin(phase * 0.85 + (side > 0 ? 1.7 : 0)) * 0.20;
    const a = at.ang - 0.58 + flap * 0.7;            // down-and-back along the flank
    const len = L * 0.185, w = L * 0.05;
    const bx = at.p[0] - L * 0.005, by = at.p[1] + L * 0.055 * (side > 0 ? 0.5 : 1);
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
    const mx = bx + Math.cos(a - 0.3) * len * 0.55, my = by + Math.sin(a - 0.3) * len * 0.55;
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    S.blob(ctx, [
      [bx - w * 1.1, by - w * 0.5], [bx + w * 1.2, by],
      [mx + w * 0.8, my], [tx, ty], [mx - w * 0.9, my + w * 0.4]
    ], col, { depth: L * 0.022, tension: 0.6 });
    if (alpha !== 1) ctx.globalAlpha /= alpha;
  }

  /* falcate dorsal: leading edge convex, trailing edge concave, tip aft */
  function dorsal(ctx, B, L, col, dep) {
    const f = B.atU(0.38), r = B.atU(0.54);
    const h = L * 0.115;
    S.blob(ctx, [
      [r.t[0], r.t[1] + L * 0.004],
      [f.t[0] + L * 0.012, f.t[1] + L * 0.003],
      [f.t[0] - L * 0.004, f.t[1] - h * 0.55],   // convex leading edge
      [f.t[0] - L * 0.055, f.t[1] - h],          // tip swept aft
      [r.t[0] - L * 0.012, r.t[1] - h * 0.34],   // concave trailing edge
      [r.t[0] + L * 0.004, r.t[1] - h * 0.10]
    ], col, { depth: dep * 0.7, tension: 0.42 });
  }

  function flukes(ctx, tip, ped, L, mid, dark, dep) {
    let dev = Math.atan2(tip.p[1] - ped.p[1], tip.p[0] - ped.p[0]) - Math.PI;
    while (dev > Math.PI) dev -= Math.PI * 2;
    while (dev < -Math.PI) dev += Math.PI * 2;
    const w = L * 0.175, h = L * 0.052;
    ctx.save();
    ctx.translate(tip.p[0], tip.p[1]);
    ctx.rotate(-dev * 0.75);
    S.blob(ctx, [
      [w * 0.5, 0],
      [-w * 0.25, -h * 1.25], [-w * 1.15, -h * 1.5], [-w * 1.0, -h * 0.35],
      [-w * 0.42, 0],
      [-w * 1.0, h * 0.35], [-w * 1.15, h * 1.5], [-w * 0.25, h * 1.25]
    ], mid, { depth: dep * 0.6, tension: 0.35 });
    ctx.globalAlpha *= 0.4;
    S.blob(ctx, [[w * 0.4, 0], [-w * 0.25, -h * 1.05], [-w * 1.05, -h * 1.25], [-w * 0.92, -h * 0.3], [-w * 0.4, 0]], dark, { depth: 0, tension: 0.35 });
    ctx.globalAlpha /= 0.4;
    ctx.restore();
  }

  function head(ctx, B, L, cols, m, jaw, blinking, opts) {
    const tip = B.atU(0), gape = B.atU(0.135), eyeAt = B.atU(0.175), blow = B.atU(0.215);
    const open = jaw * L * 0.05;
    /* lower jaw drops - permanently gormless */
    if (open > 0.2) {
      S.blob(ctx, [
        [tip.p[0] + L * 0.004, tip.p[1] + open * 0.25],
        [B.atU(0.05).p[0], B.atU(0.05).b[1] + open * 0.9],
        [gape.p[0], gape.b[1] + open * 0.5],
        [gape.p[0], gape.b[1] - L * 0.005]
      ], Px.shade(cols.mid, -0.12), { depth: 0, tension: 0.45 });
      ctx.fillStyle = '#e0607e';
      ctx.beginPath();
      ctx.ellipse(B.atU(0.06).p[0], B.atU(0.06).b[1] + open * 0.5, L * 0.038, Math.max(0.4, open * 0.36), tip.ang, 0, 6.3);
      ctx.fill();
    }
    /* the gape line, curving up behind the eye into the dolphin smirk */
    ctx.strokeStyle = Px.shade(cols.dark, -0.5);
    ctx.lineWidth = Math.max(0.5, L * 0.015);
    ctx.beginPath();
    ctx.moveTo(tip.p[0], tip.p[1] + open * 0.2 + L * 0.004);
    ctx.quadraticCurveTo(B.atU(0.06).p[0], B.atU(0.06).b[1] + open * 0.35,
                         gape.p[0] + L * 0.01, gape.p[1] + L * 0.028);
    ctx.stroke();
    /* blowhole */
    ctx.fillStyle = 'rgba(8,16,26,.8)';
    ctx.beginPath();
    ctx.ellipse(blow.t[0], blow.t[1] + L * 0.014, L * 0.021, L * 0.010, -0.35, 0, 6.3);
    ctx.fill();
    /* eye, comedically oversized */
    const er = L * 0.048;
    const ex = eyeAt.p[0] + L * 0.004, ey = eyeAt.p[1] + L * 0.004;
    if (blinking) {
      ctx.strokeStyle = Px.shade(cols.dark, -0.45);
      ctx.lineWidth = Math.max(0.6, L * 0.02);
      ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke();
    } else {
      S.eye(ctx, ex, ey, er, m.look, { pupil: '#0b1420' });
      ctx.strokeStyle = Px.shade(cols.dark, -0.35);
      ctx.lineWidth = Math.max(0.5, L * 0.013);
      ctx.beginPath();
      ctx.arc(ex, ey - er * 1.2, er * 0.9, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
  }

  function evilBits(ctx, B, L) {
    const t = B.atU(0.2);
    ctx.save();
    ctx.translate(t.t[0], t.t[1] + L * 0.01);
    ctx.rotate(-0.22);
    const hw = L * 0.085, hh = L * 0.13;
    S.rect(ctx, -hw * 1.6, -hh * 0.06, hw * 3.2, hh * 0.14, '#160c22', { depth: 0 });
    S.rect(ctx, -hw, -hh, hw * 2, hh, '#2b1740', { depth: L * 0.02 });
    S.rect(ctx, -hw, -hh * 0.4, hw * 2, hh * 0.2, '#c0392b', { depth: 0 });
    ctx.restore();
    const r = B.atU(0.07);
    ctx.strokeStyle = '#180e1e';
    ctx.lineWidth = Math.max(0.7, L * 0.024);
    ctx.beginPath();
    ctx.moveTo(r.p[0] + L * 0.05, r.b[1] - L * 0.004);
    ctx.quadraticCurveTo(r.p[0], r.b[1] + L * 0.03, r.p[0] - L * 0.05, r.b[1] - L * 0.004);
    ctx.stroke();
  }
  function crown(ctx, B, L) {
    const t = B.atU(0.3);
    S.poly(ctx, [
      [t.t[0] - L * 0.055, t.t[1]], [t.t[0] + L * 0.055, t.t[1]],
      [t.t[0] + L * 0.055, t.t[1] - L * 0.045], [t.t[0] + L * 0.028, t.t[1] - L * 0.018],
      [t.t[0], t.t[1] - L * 0.058], [t.t[0] - L * 0.028, t.t[1] - L * 0.018],
      [t.t[0] - L * 0.055, t.t[1] - L * 0.045]
    ], '#ffd24a', { depth: L * 0.018 });
  }

  return { draw, dt: 1 / 60, mem, build };
})();

/* every scene already calls DZ.Dolphin.draw - swap the sprite for the rig */
DZ.Dolphin.draw = function (ctx, d, x, y, opts) {
  opts = opts || {};
  if (!opts.center) {
    const sc = opts.scale === undefined ? 1 : opts.scale;
    x += 13 * sc; y += 7.5 * sc;
  }
  DZ.Rig.dolphin.draw(ctx, d, x, y, opts);
};
