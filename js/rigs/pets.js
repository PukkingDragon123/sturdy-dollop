/* ============================================================
   rigs/pets.js - the mount ladder, drawn procedurally.
   Seahorse, clownfish, crab, tuna, dolphin, swordfish, whale.
   Each animates from its own travelling wave; each has a ride
   point so the king can sit on it.
   ============================================================ */
KA.Rig.pet = (function () {
  const U = KA.U, D = KA.D, R = KA.Rig;
  const mem = {};
  function M(tag) {
    let m = mem[tag];
    if (!m) m = mem[tag] = { ph: U.rnd(0, 9), look: { x: 0, y: 0 }, lookT: 0, blink: U.rnd(1, 4),
      chain: null, legs: null, jaw: new R.Spring(0.3, 90, 9) };
    return m;
  }

  /* draw(ctx, pet, x, y, o) - o: scale, flipX, speed, dt, tag, talk */
  function draw(ctx, pet, x, y, o) {
    o = o || {};
    const dt = Math.min(0.05, o.dt === undefined ? (KA.Rig.pet.dt || 1 / 60) : o.dt);
    const sp = KA.Pets.byId[pet.sp] || KA.Pets.byId.seahorse;
    const m = M((pet.uid || pet.sp) + (o.tag || ''));
    const speed = o.speed === undefined ? 0.5 : U.clamp(o.speed, 0, 3);
    m.ph += dt * (3.2 + speed * 6);
    m.lookT -= dt;
    if (m.lookT <= 0) { m.lookT = U.rnd(0.4, 2.2); m.look.x = U.rnd(-1, 1); m.look.y = U.rnd(-0.6, 0.8); }
    m.blink -= dt;
    const blink = m.blink < 0.08;
    if (m.blink < -0.02) m.blink = U.rnd(1.6, 5.5);
    m.jaw.target = 0.25 + Math.sin(m.ph * 0.4) * 0.25 + (o.talk ? 0.6 : 0);
    const jaw = U.clamp(m.jaw.update(dt), 0, 1.2);

    const L = 44 * sp.size * (o.scale === undefined ? 1 : o.scale);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.flipX ? -1 : 1, 1);
    if (o.rot) ctx.rotate(o.rot);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    (SPECIES[pet.sp] || SPECIES.seahorse)(ctx, L, m, sp.col, { speed, blink, jaw, dt, pet });
    ctx.restore();
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
  }

  /* shared: lofted fish body with a dark back and pale belly */
  function fishBody(ctx, L, uu, top, bot, m, col, amp, o) {
    const B = R.loft(L, uu, top, bot, m.ph, amp);
    const clip = (c) => D.blobPath(c, B.ring, 1);
    const g = D.vgrad(ctx, 0, -L * 0.2, 0, L * 0.22,
      [[0, col.b], [0.45, col.a], [1, col.c]], 'fb' + col.a + Math.round(L));
    D.path(ctx, () => clip(ctx), g, { shadow: 'rgba(0,25,40,.35)', blur: 6, sy: 3 });
    return { B, clip };
  }
  function eyeAt(ctx, p, r, m, blink, col) {
    if (blink) { D.line(ctx, p[0] - r, p[1], p[0] + r, p[1], '#16202c', Math.max(1, r * 0.5)); return; }
    D.eye(ctx, p[0], p[1], r, m.look, { pupil: col || '#16202c' });
  }

  const SPECIES = {
    /* ---------------- SEA HORSE ---------------- */
    seahorse(ctx, L, m, col, s) {
      const sway = Math.sin(m.ph * 0.8) * 0.12;
      ctx.rotate(-0.12 + sway * 0.4);
      // curled prehensile tail: a real spiral that coils and uncoils
      const curl = 3.5 + Math.sin(m.ph * 0.7) * 0.8;
      const cx = -L * 0.10, cy = L * 0.27, r0 = L * 0.15, N = 10;
      const tp = [];
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1);
        const a = -1.15 + curl * f, r = r0 * (1 - f * 0.76);
        tp.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      D.ribbon(ctx, tp, tp.map((p, i) => L * (0.062 - i * 0.0052)), col.b,
        { tension: 0.85, shadow: 'rgba(0,25,40,.3)', blur: 4, sy: 2 });
      // ridge segments along the coil
      ctx.strokeStyle = D.alpha(col.c, 0.55); ctx.lineWidth = Math.max(0.6, L * 0.014);
      for (let i = 1; i < N - 1; i += 2) {
        const w = L * (0.062 - i * 0.0052);
        ctx.beginPath(); ctx.moveTo(tp[i][0] - w * 0.7, tp[i][1] - w * 0.7);
        ctx.lineTo(tp[i][0] + w * 0.7, tp[i][1] + w * 0.7); ctx.stroke();
      }
      // body: an S from tail up to the snout
      const body = [[-L * 0.02, L * 0.18], [L * 0.02, L * 0.04], [-L * 0.02, -L * 0.10],
                    [L * 0.03, -L * 0.20], [L * 0.10, -L * 0.26]];
      D.ribbon(ctx, body, [L * 0.07, L * 0.095, L * 0.09, L * 0.075, L * 0.055],
        D.vgrad(ctx, -L * 0.1, 0, L * 0.1, 0, [[0, col.b], [1, col.a]], 'sh' + Math.round(L)),
        { shadow: 'rgba(0,25,40,.3)', blur: 5, sy: 2 });
      // belly ridges
      ctx.strokeStyle = D.alpha(col.c, 0.6); ctx.lineWidth = Math.max(0.6, L * 0.016);
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const p = [U.lerp(body[1][0], body[3][0], t) + L * 0.05, U.lerp(body[1][1], body[3][1], t)];
        ctx.beginPath(); ctx.moveTo(p[0], p[1] - L * 0.03); ctx.lineTo(p[0] + L * 0.03, p[1] + L * 0.03); ctx.stroke();
      }
      // dorsal frill
      D.blob(ctx, [[-L * 0.05, -L * 0.06], [-L * 0.13, -L * 0.02], [-L * 0.12, L * 0.08], [-L * 0.03, L * 0.05]],
        D.alpha(col.c, 0.85), { tension: 0.6 });
      // head + long snout
      const h = [L * 0.12, -L * 0.28];
      D.circle(ctx, h[0], h[1], L * 0.075, col.a);
      D.capsule(ctx, h[0] + L * 0.03, h[1] + L * 0.02, h[0] + L * 0.20, h[1] + L * 0.055, L * 0.032, L * 0.02, col.a);
      // coronet
      D.blob(ctx, [[h[0] - L * 0.04, h[1] - L * 0.05], [h[0] - L * 0.09, h[1] - L * 0.14],
                   [h[0] - L * 0.01, h[1] - L * 0.10], [h[0] + L * 0.02, h[1] - L * 0.16],
                   [h[0] + L * 0.05, h[1] - L * 0.05]], col.b, { tension: 0.5 });
      eyeAt(ctx, [h[0] + L * 0.035, h[1] - L * 0.005], L * 0.032, m, s.blink);
    },

    /* ---------------- CLOWNFISH ---------------- */
    clownfish(ctx, L, m, col, s) {
      const uu = [0, .1, .26, .45, .64, .84, 1];
      const top = [.05, .17, .225, .20, .13, .07, .03];
      const bot = [.045, .17, .225, .19, .12, .06, .03];
      const B = R.loft(L, uu, top, bot, m.ph, 0.045);
      const tail = B.atU(1), ped = B.atU(0.9);
      let dev = Math.atan2(tail.p[1] - ped.p[1], tail.p[0] - ped.p[0]) - Math.PI;
      while (dev > Math.PI) dev -= 6.283; while (dev < -Math.PI) dev += 6.283;
      // caudal fan
      ctx.save(); ctx.translate(tail.p[0], tail.p[1]); ctx.rotate(-dev * 1.1);
      D.blob(ctx, [[0, 0], [-L * 0.16, -L * 0.16], [-L * 0.2, 0], [-L * 0.16, L * 0.16]], col.b, { tension: 0.5 });
      ctx.restore();
      // dorsal + pelvic
      D.blob(ctx, [[B.top[3][0], B.top[3][1]], [B.top[2][0], B.top[2][1]],
                   [B.top[2][0] - L * 0.02, B.top[2][1] - L * 0.10], [B.top[3][0] + L * 0.02, B.top[3][1] - L * 0.03]],
        col.b, { tension: 0.5 });
      D.blob(ctx, [[B.bot[3][0], B.bot[3][1]], [B.bot[2][0], B.bot[2][1]],
                   [B.bot[2][0] - L * 0.01, B.bot[2][1] + L * 0.09], [B.bot[3][0], B.bot[3][1] + L * 0.02]],
        col.b, { tension: 0.5 });
      const clip = (c) => D.blobPath(c, B.ring, 1);
      D.path(ctx, () => clip(ctx), D.vgrad(ctx, 0, -L * 0.24, 0, L * 0.24,
        [[0, D.shade(col.a, -0.12)], [0.5, col.a], [1, D.shade(col.a, 0.2)]], 'cf' + Math.round(L)),
        { shadow: 'rgba(0,25,40,.35)', blur: 6, sy: 3 });
      // three white bands with dark edges
      [0.16, 0.42, 0.72].forEach((u, i) => {
        const a = B.atU(u);
        const w = L * (i === 1 ? 0.075 : 0.055);
        D.panel(ctx, clip, (c) => {
          c.moveTo(a.t[0] + w, a.t[1]); c.lineTo(a.b[0] + w * 0.6, a.b[1]);
          c.lineTo(a.b[0] - w * 0.6, a.b[1]); c.lineTo(a.t[0] - w, a.t[1]); c.closePath();
        }, '#0d1622');
        D.panel(ctx, clip, (c) => {
          c.moveTo(a.t[0] + w * 0.68, a.t[1]); c.lineTo(a.b[0] + w * 0.4, a.b[1]);
          c.lineTo(a.b[0] - w * 0.4, a.b[1]); c.lineTo(a.t[0] - w * 0.68, a.t[1]); c.closePath();
        }, col.c);
      });
      // pectoral
      const pf = B.atU(0.3);
      D.ellipse(ctx, pf.p[0] + L * 0.02, pf.p[1] + L * 0.10, L * 0.075, L * 0.035,
        0.5 + Math.sin(m.ph * 1.6) * 0.4, D.alpha(col.b, 0.9));
      eyeAt(ctx, [B.atU(0.11).p[0] + L * 0.03, B.atU(0.11).p[1] - L * 0.03], L * 0.055, m, s.blink);
      D.smile(ctx, B.atU(0.03).p[0], B.atU(0.03).p[1] + L * 0.04, L * 0.035, L * 0.03, '#0d1622', 1.2);
    },

    /* ---------------- WAR CRAB ---------------- */
    crab(ctx, L, m, col, s) {
      const bob = Math.sin(m.ph * 1.3);
      // legs
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 4; i++) {
          const bx = -L * 0.22 + i * L * 0.15, by = L * 0.04 + side * L * 0.02;
          const a = 0.75 + Math.sin(m.ph * 2.2 + i * 1.1 + (side > 0 ? 0 : 2)) * 0.35;
          const kx = bx + Math.cos(a) * L * 0.16 * (side > 0 ? 1 : 0.85);
          const ky = by + Math.sin(a) * L * 0.16;
          D.capsule(ctx, bx, by, kx, ky, L * 0.028, L * 0.02, side > 0 ? col.b : D.shade(col.b, -0.2));
          D.capsule(ctx, kx, ky, kx + L * 0.03, ky + L * 0.13, L * 0.02, L * 0.012, side > 0 ? col.b : D.shade(col.b, -0.2));
        }
      }
      // claws
      for (const side of [-1, 1]) {
        const cx = L * 0.3, cy = -L * 0.02 + side * L * 0.06 + bob * L * 0.015;
        D.capsule(ctx, L * 0.14, side * L * 0.05, cx, cy, L * 0.035, L * 0.045, col.a);
        const open = (1 + Math.sin(m.ph * 1.7 + (side > 0 ? 0 : 1.6))) * 0.5 * L * 0.03;
        D.blob(ctx, [[cx, cy], [cx + L * 0.12, cy - L * 0.05 - open], [cx + L * 0.17, cy - L * 0.01],
                     [cx + L * 0.08, cy + L * 0.02]], D.shade(col.a, 0.1), { tension: 0.5 });
        D.blob(ctx, [[cx, cy + L * 0.02], [cx + L * 0.11, cy + L * 0.06 + open], [cx + L * 0.16, cy + L * 0.02]],
          D.shade(col.a, -0.1), { tension: 0.5 });
      }
      // shell
      D.ellipse(ctx, 0, -L * 0.04, L * 0.32, L * 0.2, 0,
        D.vgrad(ctx, 0, -L * 0.24, 0, L * 0.16, [[0, D.shade(col.a, 0.2)], [1, col.b]], 'crab' + Math.round(L)),
        { shadow: 'rgba(0,25,40,.4)', blur: 7, sy: 3 });
      D.ellipse(ctx, -L * 0.02, L * 0.02, L * 0.2, L * 0.09, 0, D.alpha(col.c, 0.45));
      // shell studs
      for (let i = -1; i <= 1; i++) D.circle(ctx, i * L * 0.12, -L * 0.09, L * 0.022, D.shade(col.b, -0.15));
      // eyestalks
      for (const side of [-1, 1]) {
        const ex = L * 0.12 + side * L * 0.03, ey = -L * 0.2 + Math.sin(m.ph * 2 + side) * L * 0.01;
        D.capsule(ctx, ex - L * 0.02, -L * 0.1, ex, ey, L * 0.02, L * 0.018, col.a);
        eyeAt(ctx, [ex, ey], L * 0.042, m, s.blink);
      }
      D.smile(ctx, L * 0.14, -L * 0.05, L * 0.05, -L * 0.03, '#3a0d12', 1.4);
    },

    /* ---------------- TUNA ---------------- */
    tuna(ctx, L, m, col, s) {
      const uu = [0, .08, .2, .34, .5, .68, .86, 1];
      const top = [.02, .085, .135, .15, .13, .085, .04, .012];
      const bot = [.018, .08, .125, .14, .12, .075, .034, .01];
      const B = R.loft(L, uu, top, bot, m.ph, 0.05);
      const tail = B.atU(1), ped = B.atU(0.9);
      let dev = Math.atan2(tail.p[1] - ped.p[1], tail.p[0] - ped.p[0]) - Math.PI;
      while (dev > Math.PI) dev -= 6.283; while (dev < -Math.PI) dev += 6.283;
      // sickle caudal
      ctx.save(); ctx.translate(tail.p[0], tail.p[1]); ctx.rotate(-dev * 1.15);
      D.blob(ctx, [[L * 0.02, 0], [-L * 0.05, -L * 0.19], [-L * 0.14, -L * 0.2], [-L * 0.06, 0],
                   [-L * 0.14, L * 0.2], [-L * 0.05, L * 0.19]], D.shade(col.a, -0.1), { tension: 0.35 });
      ctx.restore();
      // sail dorsal + anal fin + finlets
      const d0 = B.atU(0.38), d1 = B.atU(0.52);
      D.blob(ctx, [[d1.t[0], d1.t[1]], [d0.t[0], d0.t[1]], [d0.t[0] - L * 0.02, d0.t[1] - L * 0.13],
                   [d1.t[0] + L * 0.01, d1.t[1] - L * 0.03]], '#2f6ea8', { tension: 0.45 });
      const a0 = B.atU(0.58), a1 = B.atU(0.7);
      D.blob(ctx, [[a1.b[0], a1.b[1]], [a0.b[0], a0.b[1]], [a0.b[0] - L * 0.01, a0.b[1] + L * 0.08]],
        '#2f6ea8', { tension: 0.45 });
      const clip = (c) => D.blobPath(c, B.ring, 1);
      D.path(ctx, () => clip(ctx), D.vgrad(ctx, 0, -L * 0.16, 0, L * 0.16,
        [[0, '#20406e'], [0.42, col.a], [0.72, '#c9d8e8'], [1, '#f2f7ff']], 'tuna' + Math.round(L)),
        { shadow: 'rgba(0,25,40,.4)', blur: 7, sy: 3 });
      // yellow finlets along the peduncle
      for (let i = 0; i < 4; i++) {
        const u = 0.74 + i * 0.05, a = B.atU(u);
        D.tri(ctx, [a.t[0], a.t[1]], [a.t[0] - L * 0.03, a.t[1] - L * 0.03], [a.t[0] - L * 0.01, a.t[1]], '#ffc94a');
        D.tri(ctx, [a.b[0], a.b[1]], [a.b[0] - L * 0.03, a.b[1] + L * 0.03], [a.b[0] - L * 0.01, a.b[1]], '#ffc94a');
      }
      const pf = B.atU(0.26);
      D.blob(ctx, [[pf.p[0], pf.p[1] + L * 0.04], [pf.p[0] - L * 0.06, pf.p[1] + L * 0.14],
                   [pf.p[0] + L * 0.04, pf.p[1] + L * 0.08]], '#2f6ea8', { tension: 0.5 });
      eyeAt(ctx, [B.atU(0.1).p[0], B.atU(0.1).p[1] - L * 0.02], L * 0.042, m, s.blink);
      D.line(ctx, B.atU(0).p[0], B.atU(0).p[1] + L * 0.01, B.atU(0.08).p[0], B.atU(0.08).b[1], '#16202c', 1.2);
    },

    /* ---------------- DOLPHIN ---------------- */
    dolphin(ctx, L, m, col, s) {
      const uu  = [0, .045, .09, .135, .195, .275, .36, .45, .55, .66, .76, .86, .94, 1];
      const top = [.011, .016, .026, .078, .112, .120, .118, .112, .102, .087, .069, .047, .030, .012];
      const bot = [.009, .015, .024, .052, .088, .101, .102, .097, .088, .075, .058, .038, .023, .010];
      const B = R.loft(L, uu, top, bot, m.ph, 0.028 + s.speed * 0.02);
      const dep = L * 0.05;
      // far flipper
      flip(ctx, B.atU(0.25), L, D.shade(col.b, -0.3), m.ph, 1, 0.75);
      // flukes
      const tip = B.atU(1), ped = B.atU(0.9);
      let dev = Math.atan2(tip.p[1] - ped.p[1], tip.p[0] - ped.p[0]) - Math.PI;
      while (dev > Math.PI) dev -= 6.283; while (dev < -Math.PI) dev += 6.283;
      ctx.save(); ctx.translate(tip.p[0], tip.p[1]); ctx.rotate(-dev * 0.75);
      const fw = L * 0.175, fh = L * 0.05;
      D.blob(ctx, [[fw * 0.5, 0], [-fw * 0.25, -fh * 1.25], [-fw * 1.15, -fh * 1.5], [-fw * 1.0, -fh * 0.35],
                   [-fw * 0.42, 0], [-fw * 1.0, fh * 0.35], [-fw * 1.15, fh * 1.5], [-fw * 0.25, fh * 1.25]],
        col.a, { tension: 0.35 });
      ctx.restore();
      const clip = (c) => D.blobPath(c, B.ring, 1);
      D.path(ctx, () => clip(ctx), D.vgrad(ctx, 0, -L * 0.14, 0, L * 0.12,
        [[0, col.b], [0.4, col.a], [0.78, D.mix(col.a, col.c, 0.7)], [1, col.c]], 'dol' + Math.round(L)),
        { shadow: 'rgba(0,25,40,.4)', blur: 7, sy: 3 });
      // flank hourglass
      D.panel(ctx, clip, (c) => {
        const A = B.atU(0.22), Mi = B.atU(0.5), Z = B.atU(0.8);
        c.moveTo(A.p[0], A.p[1] - L * 0.02);
        c.quadraticCurveTo(Mi.p[0], Mi.p[1] + L * 0.07, Z.p[0], Z.p[1] - L * 0.01);
        c.quadraticCurveTo(Mi.p[0], Mi.p[1] - L * 0.03, A.p[0], A.p[1] - L * 0.02);
        c.closePath();
      }, D.alpha(col.c, 0.35));
      // falcate dorsal
      const f = B.atU(0.38), r2 = B.atU(0.54), hh = L * 0.115;
      D.blob(ctx, [[r2.t[0], r2.t[1]], [f.t[0] + L * 0.012, f.t[1]], [f.t[0] - L * 0.004, f.t[1] - hh * 0.55],
                   [f.t[0] - L * 0.055, f.t[1] - hh], [r2.t[0] - L * 0.012, r2.t[1] - hh * 0.34]],
        D.shade(col.b, 0.04), { tension: 0.42 });
      flip(ctx, B.atU(0.27), L, D.shade(col.b, -0.12), m.ph, -1, 1);
      // head
      const tipA = B.atU(0), gape = B.atU(0.135), ey = B.atU(0.175), bl = B.atU(0.215);
      const open = s.jaw * L * 0.045;
      if (open > 0.2) {
        D.blob(ctx, [[tipA.p[0], tipA.p[1] + open * 0.25], [B.atU(0.05).p[0], B.atU(0.05).b[1] + open * 0.9],
                     [gape.p[0], gape.b[1] + open * 0.5], [gape.p[0], gape.b[1]]],
          D.shade(col.a, -0.1), { tension: 0.45 });
        D.ellipse(ctx, B.atU(0.06).p[0], B.atU(0.06).b[1] + open * 0.5, L * 0.035, Math.max(0.4, open * 0.35), 0, '#e0607e');
      }
      D.curve(ctx, [[tipA.p[0], tipA.p[1] + L * 0.004], [B.atU(0.06).p[0], B.atU(0.06).b[1] + open * 0.3],
                    [gape.p[0] + L * 0.01, gape.p[1] + L * 0.026]], D.shade(col.b, -0.4), L * 0.014);
      D.ellipse(ctx, bl.t[0], bl.t[1] + L * 0.012, L * 0.02, L * 0.01, -0.35, 'rgba(8,16,26,.75)');
      eyeAt(ctx, [ey.p[0] + L * 0.004, ey.p[1] + L * 0.004], L * 0.045, m, s.blink);
    },

    /* ---------------- SWORDFISH ---------------- */
    swordfish(ctx, L, m, col, s) {
      const uu = [0, .18, .26, .36, .5, .66, .84, 1];
      const top = [.006, .012, .085, .115, .105, .07, .034, .01];
      const bot = [.006, .012, .075, .10, .092, .06, .028, .008];
      const B = R.loft(L, uu, top, bot, m.ph, 0.045);
      const tail = B.atU(1), ped = B.atU(0.9);
      let dev = Math.atan2(tail.p[1] - ped.p[1], tail.p[0] - ped.p[0]) - Math.PI;
      while (dev > Math.PI) dev -= 6.283; while (dev < -Math.PI) dev += 6.283;
      ctx.save(); ctx.translate(tail.p[0], tail.p[1]); ctx.rotate(-dev * 1.1);
      D.blob(ctx, [[L * 0.02, 0], [-L * 0.06, -L * 0.2], [-L * 0.16, -L * 0.22], [-L * 0.07, 0],
                   [-L * 0.16, L * 0.22], [-L * 0.06, L * 0.2]], D.shade(col.a, -0.1), { tension: 0.32 });
      ctx.restore();
      // tall sail dorsal
      const d0 = B.atU(0.3), d1 = B.atU(0.5);
      D.blob(ctx, [[d1.t[0], d1.t[1]], [d0.t[0], d0.t[1]], [d0.t[0] - L * 0.01, d0.t[1] - L * 0.22],
                   [d1.t[0] + L * 0.03, d1.t[1] - L * 0.07]], '#233f78', { tension: 0.4 });
      const clip = (c) => D.blobPath(c, B.ring, 1);
      D.path(ctx, () => clip(ctx), D.vgrad(ctx, 0, -L * 0.14, 0, L * 0.12,
        [[0, '#182c5e'], [0.42, col.a], [0.78, '#b8c8e0'], [1, '#f2f6ff']], 'sw' + Math.round(L)),
        { shadow: 'rgba(0,25,40,.4)', blur: 7, sy: 3 });
      // the bill
      const nose = B.atU(0);
      D.capsule(ctx, nose.p[0] - L * 0.02, nose.p[1], nose.p[0] + L * 0.16, nose.p[1] - L * 0.01,
        L * 0.02, L * 0.007, '#2b3d5c');
      const pf = B.atU(0.32);
      D.blob(ctx, [[pf.p[0], pf.p[1] + L * 0.04], [pf.p[0] - L * 0.1, pf.p[1] + L * 0.13],
                   [pf.p[0] + L * 0.03, pf.p[1] + L * 0.07]], '#233f78', { tension: 0.5 });
      eyeAt(ctx, [B.atU(0.24).p[0], B.atU(0.24).p[1] - L * 0.02], L * 0.04, m, s.blink);
    },

    /* ---------------- WHALE ---------------- */
    whale(ctx, L, m, col, s) {
      const uu = [0, .06, .14, .26, .4, .55, .7, .84, .93, 1];
      const top = [.06, .10, .135, .155, .15, .13, .10, .062, .035, .012];
      const bot = [.055, .105, .145, .17, .165, .14, .10, .055, .03, .01];
      const B = R.loft(L, uu, top, bot, m.ph, 0.02 + s.speed * 0.012);
      // flukes
      const tip = B.atU(1), ped = B.atU(0.9);
      let dev = Math.atan2(tip.p[1] - ped.p[1], tip.p[0] - ped.p[0]) - Math.PI;
      while (dev > Math.PI) dev -= 6.283; while (dev < -Math.PI) dev += 6.283;
      ctx.save(); ctx.translate(tip.p[0], tip.p[1]); ctx.rotate(-dev * 0.7);
      const fw = L * 0.2, fh = L * 0.055;
      D.blob(ctx, [[fw * 0.4, 0], [-fw * 0.2, -fh * 1.4], [-fw * 1.2, -fh * 1.7], [-fw * 0.95, -fh * 0.3],
                   [-fw * 0.4, 0], [-fw * 0.95, fh * 0.3], [-fw * 1.2, fh * 1.7], [-fw * 0.2, fh * 1.4]],
        D.shade(col.a, -0.12), { tension: 0.32 });
      ctx.restore();
      const clip = (c) => D.blobPath(c, B.ring, 1);
      D.path(ctx, () => clip(ctx), D.vgrad(ctx, 0, -L * 0.17, 0, L * 0.18,
        [[0, col.b], [0.45, col.a], [0.8, D.mix(col.a, col.c, 0.6)], [1, col.c]], 'wh' + Math.round(L)),
        { shadow: 'rgba(0,25,40,.45)', blur: 9, sy: 4 });
      // throat pleats
      ctx.strokeStyle = D.alpha('#ffffff', 0.22); ctx.lineWidth = Math.max(0.8, L * 0.012);
      for (let i = 0; i < 7; i++) {
        const a = B.atU(0.08 + i * 0.045);
        ctx.beginPath(); ctx.moveTo(a.p[0], a.p[1] + L * 0.02); ctx.lineTo(a.b[0], a.b[1]); ctx.stroke();
      }
      // long jaw line
      D.curve(ctx, [[B.atU(0).p[0] - L * 0.01, B.atU(0).p[1] + L * 0.02],
                    [B.atU(0.1).p[0], B.atU(0.1).b[1] - L * 0.01],
                    [B.atU(0.24).p[0], B.atU(0.24).b[1] - L * 0.02]], D.shade(col.b, -0.35), L * 0.016);
      // small dorsal bump + flipper
      const d = B.atU(0.62);
      D.blob(ctx, [[d.t[0] + L * 0.03, d.t[1]], [d.t[0], d.t[1] - L * 0.05], [d.t[0] - L * 0.05, d.t[1]]],
        D.shade(col.b, 0.05), { tension: 0.5 });
      const pf = B.atU(0.3);
      D.blob(ctx, [[pf.p[0] + L * 0.02, pf.p[1] + L * 0.08], [pf.p[0] - L * 0.12, pf.p[1] + L * 0.2],
                   [pf.p[0] - L * 0.02, pf.p[1] + L * 0.1]], D.shade(col.b, -0.1), { tension: 0.5 });
      // blowhole + spout
      const bl = B.atU(0.16);
      D.ellipse(ctx, bl.t[0], bl.t[1] + L * 0.01, L * 0.018, L * 0.01, 0, 'rgba(6,12,20,.8)');
      if (Math.sin(m.ph * 0.35) > 0.985) KA.FX.bubbles(0, 0, 2, { vy: -60 });
      eyeAt(ctx, [B.atU(0.19).p[0], B.atU(0.19).p[1] + L * 0.03], L * 0.028, m, s.blink);
    }
  };

  function flip(ctx, at, L, col, ph, side, alpha) {
    const flap = Math.sin(ph * 0.85 + (side > 0 ? 1.7 : 0)) * 0.2;
    const a = at.ang - 0.58 + flap * 0.7;
    const len = L * 0.185, w = L * 0.05;
    const bx = at.p[0] - L * 0.005, by = at.p[1] + L * 0.055 * (side > 0 ? 0.5 : 1);
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
    const mx = bx + Math.cos(a - 0.3) * len * 0.55, my = by + Math.sin(a - 0.3) * len * 0.55;
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    D.blob(ctx, [[bx - w * 1.1, by - w * 0.5], [bx + w * 1.2, by], [mx + w * 0.8, my], [tx, ty],
                 [mx - w * 0.9, my + w * 0.4]], col, { tension: 0.6 });
    if (alpha !== 1) ctx.globalAlpha /= alpha;
  }

  return { draw, dt: 1 / 60, SPECIES };
})();
