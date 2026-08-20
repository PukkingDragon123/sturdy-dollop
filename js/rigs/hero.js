/* ============================================================
   rigs/hero.js - AQUADUDE, protector of moisture.

   A very cheap superhero. Flat chunky shapes, dot eyes, a permanent
   idiot grin, blonde hair on a verlet chain, IK limbs, and a rear
   end of frankly unreasonable size mounted on a 2D spring, so it
   lags, wobbles and squashes whenever he changes direction.

   Modes: 'swim' (horizontal flutter kick), 'ride' (astride the
   trident like a broom), 'stand' (idle / talking).
   ============================================================ */
DZ.Rig.hero = (function () {
  const U = DZ.Util, S = DZ.Rig.S, Px = DZ.Pixel;
  const C = {
    skin: '#f6c9a0', skinS: '#c98f68',
    hair: '#ffd24a', hairS: '#c98f1c',
    vest: '#ff9a3c', vestS: '#c9601c', scale: '#a34a12',
    pants: '#2fa86a', pantsS: '#1c7048',
    gold: '#ffd24a', goldS: '#c98f1c',
    shaft: '#c9a26a', shaftS: '#8a6a3c',
    eye: '#141c28'
  };
  const state = {};

  function mem(tag) {
    let m = state[tag];
    if (!m) {
      m = state[tag] = {
        butt: new DZ.Rig.Jiggle(105, 6.4, 5.2),
        butt2: new DZ.Rig.Jiggle(78, 5.2, 6.5),
        belly: new DZ.Rig.Jiggle(150, 9, 2),
        lean: new DZ.Rig.Spring(0, 90, 11),
        hair: new DZ.Rig.Chain(5, 3.1, { grav: 6, drag: 0.9, stiff: 3 }),
        kick: Math.random() * 7, blink: U.rnd(1, 4), t: 0,
        px: null, py: null, vx: 0, vy: 0, placed: false
      };
    }
    return m;
  }

  /* draw(ctx, x, y, opts)
     opts: scale, mode, vx, vy, dir(-1|1), aim, dash, dt, tag, talk */
  function draw(ctx, x, y, opts) {
    opts = opts || {};
    const dt = Math.min(0.05, opts.dt === undefined ? (DZ.Rig.hero.dt || 1 / 60) : opts.dt);
    const m = mem(opts.tag || 'p1');
    const sc = opts.scale === undefined ? 1 : opts.scale;
    const H = 26 * sc;                       // nominal standing height
    const mode = opts.mode || 'stand';
    const dir = opts.dir === undefined ? 1 : opts.dir;
    const vx = opts.vx || 0, vy = opts.vy || 0;
    const spd = Math.hypot(vx, vy);
    m.t += dt;

    /* --- feed the springs from real acceleration --- */
    if (m.px !== null) {
      const ax = (vx - m.vx), ay = (vy - m.vy);
      m.butt.push(ax * 0.055, ay * 0.055);
      m.butt2.push(ax * 0.075, ay * 0.075);
      m.belly.push(ax * 0.02, ay * 0.02);
    }
    m.vx = vx; m.vy = vy; m.px = x; m.py = y;
    if (opts.dash) { m.butt.vx += 26 * dir; m.butt2.vx += 34 * dir; }

    // kick cycle drives both the legs and a rhythmic butt wobble
    const rate = mode === 'swim' ? 3.4 + spd * 0.035 : mode === 'ride' ? 1.4 : 1.1;
    m.kick += dt * rate * Math.PI * 2;
    m.butt.vy += Math.sin(m.kick) * 34 * dt * (mode === 'stand' ? 0.5 : 1);
    m.butt2.vy += Math.sin(m.kick + 0.9) * 44 * dt;
    m.butt.update(dt); m.butt2.update(dt); m.belly.update(dt);
    m.blink -= dt;
    const blink = m.blink < 0.09;
    if (m.blink < -0.02) m.blink = U.rnd(1.5, 5);

    /* --- pose --- */
    let rot = 0;
    if (mode === 'swim') {
      rot = Math.PI / 2 + Math.atan2(vy, Math.abs(vx) + 20) * 0.55;
      m.lean.target = U.clamp(spd / 400, 0, 0.35);
    } else if (mode === 'ride') {
      rot = 0.42 + U.clamp(spd / 900, 0, 0.3);
      m.lean.target = 0.2;
    } else {
      rot = Math.sin(m.t * 1.6) * 0.02;
      m.lean.target = 0;
    }
    const lean = m.lean.update(dt);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir < 0 ? -1 : 1, 1);
    ctx.rotate(rot);
    const squash = 1 + U.clamp(spd / 1400, 0, 0.12) + (opts.dash ? 0.12 : 0);
    ctx.scale(squash, 1 / squash);

    /* ---------- geometry, hips at the origin ---------- */
    const hip = [0, 0];
    const sho = [H * 0.03, -H * 0.30];
    const neck = [H * 0.035, -H * 0.345];
    const headC = [H * 0.05, -H * 0.44];
    const headR = H * 0.145;
    const bw = H * 0.135;                    // half torso width

    /* legs: IK targets from the mode */
    const legs = [];
    for (let i = 0; i < 2; i++) {
      const ph = m.kick + i * Math.PI;
      let tx, ty;
      if (mode === 'swim') {
        tx = -H * (0.30 + Math.sin(ph) * 0.10);
        ty = H * (0.16 + Math.cos(ph) * 0.16);
      } else if (mode === 'ride') {
        tx = -H * (0.16 + i * 0.06) + Math.sin(ph) * H * 0.025;
        ty = H * (0.46 + i * 0.04);
      } else {
        tx = H * (0.04 + Math.sin(ph) * 0.04) - i * H * 0.055;
        ty = H * 0.56;
      }
      const hipP = [hip[0] - H * 0.02 + i * H * 0.035, hip[1] + H * 0.05 + i * H * 0.01];
      legs.push({ hip: hipP, knee: DZ.Rig.solve2(hipP[0], hipP[1], tx, ty, H * 0.23, H * 0.24, i === 0),
                  foot: [tx, ty] });
    }

    /* arms: front hand grips the trident, back arm trails */
    const gripD = mode === 'ride' ? [H * 0.36, H * 0.05]
      : mode === 'swim' ? [H * 0.16, -H * 0.40 + Math.sin(m.kick * 0.5) * H * 0.02]
      : [H * 0.26, -H * 0.06 + Math.sin(m.kick * 0.5) * H * 0.03];
    const arms = [];
    for (let i = 0; i < 2; i++) {
      const shoP = [sho[0] - H * 0.02 + i * H * 0.05, sho[1] + i * H * 0.015];
      const tgt = i === 1 ? gripD :
        (mode === 'swim' ? [-H * 0.16 + Math.sin(m.kick + 1.1) * H * 0.06, H * 0.10]
                         : [H * 0.06 + Math.sin(m.kick * 0.7) * H * 0.05, H * 0.18]);
      arms.push({ sho: shoP, knee: DZ.Rig.solve2(shoP[0], shoP[1], tgt[0], tgt[1], H * 0.17, H * 0.16, i === 0),
                  hand: tgt });
    }

    /* ---------- draw: far limbs, butt, torso, near limbs, head ---------- */
    limb(ctx, arms[0], H, Px.shade(C.skin, -0.22), Px.shade(C.vest, -0.3), H * 0.045);
    limb(ctx, legs[0], H, Px.shade(C.pants, -0.28), Px.shade(C.gold, -0.3), H * 0.055);

    butt(ctx, m, H, hip);

    /* torso: tapered vest over a green trunk */
    const bx = m.belly.x * 0.5, by = m.belly.y * 0.5;
    S.blob(ctx, [
      [sho[0] - bw * 0.95, sho[1]], [sho[0] + bw * 1.0, sho[1] + H * 0.01],
      [hip[0] + bw * 0.92 + bx, hip[1] + H * 0.06 + by], [hip[0] - bw * 0.9 + bx, hip[1] + H * 0.07 + by]
    ], C.vest, { depth: H * 0.05, side: C.vestS, tension: 0.35 });
    S.scales(ctx, sho[0] - bw, sho[1] - 1, bw * 2, H * 0.30, H * 0.055, C.scale);
    // trunks + gold belt
    S.roundRect(ctx, hip[0] - bw * 0.95, hip[1] - H * 0.02, bw * 1.95, H * 0.12, H * 0.03, C.pants,
      { depth: H * 0.035, side: C.pantsS });
    S.rect(ctx, hip[0] - bw * 0.98, hip[1] - H * 0.035, bw * 1.98, H * 0.045, C.gold, { depth: 0 });
    S.rect(ctx, hip[0] - H * 0.03, hip[1] - H * 0.042, H * 0.075, H * 0.06, C.goldS, { depth: 0 });
    // little chest emblem, drawn badly on purpose
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(sho[0] + H * 0.005, sho[1] + H * 0.10, H * 0.045, 0, 6.3);
    ctx.fill();
    ctx.fillStyle = C.scale;
    ctx.font = 'bold ' + Math.max(3, H * 0.075) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A', sho[0] + H * 0.005, sho[1] + H * 0.13);
    ctx.textAlign = 'left';

    limb(ctx, legs[1], H, C.pants, C.gold, H * 0.058);
    limb(ctx, arms[1], H, C.skin, C.vest, H * 0.048);

    head(ctx, m, H, headC, headR, neck, blink, lean, opts);
    trident(ctx, m, H, arms[1].hand, mode, opts);

    ctx.restore();
  }

  /* ---- the main event ---- */
  function butt(ctx, m, H, hip) {
    const bx = hip[0] - H * 0.19, by = hip[1] + H * 0.06;
    const r = H * 0.205;
    // two cheeks on separate springs so they never quite agree
    const sq1 = 1 + m.butt.squash, sq2 = 1 + m.butt2.squash;
    const B1 = Px.shade(C.pants, -0.30), B2 = Px.shade(C.pants, -0.14);
    S.ellipse(ctx, bx + m.butt2.x * 0.9 - H * 0.055, by + m.butt2.y * 0.9 + H * 0.05,
      r * 1.0 * sq2, r * 0.92 / sq2, -0.3, B1, { depth: H * 0.055, side: Px.shade(B1, -0.3) });
    S.ellipse(ctx, bx + m.butt.x, by + m.butt.y, r * 1.08 * sq1, r * 1.02 / sq1, -0.14, B2,
      { depth: H * 0.055, side: Px.shade(B2, -0.3) });
    // seam + a highlight so the wobble is unmistakable
    ctx.strokeStyle = Px.shade(C.pants, -0.5);
    ctx.lineWidth = Math.max(0.8, H * 0.026);
    ctx.beginPath();
    ctx.moveTo(bx + m.butt.x - r * 0.75, by + m.butt.y - r * 0.62);
    ctx.quadraticCurveTo(bx + m.butt.x - r * 0.15, by + m.butt.y, bx + m.butt.x - r * 0.7, by + m.butt.y + r * 0.68);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.ellipse(bx + m.butt.x - r * 0.25, by + m.butt.y - r * 0.4, r * 0.4, r * 0.22, -0.5, 0, 6.3);
    ctx.fill();
  }

  function limb(ctx, L, H, col, footCol, w) {
    S.capsule(ctx, L.sho ? L.sho[0] : L.hip[0], L.sho ? L.sho[1] : L.hip[1],
      L.knee.x, L.knee.y, w, w * 0.86, col, { depth: H * 0.03, side: Px.shade(col, -0.3) });
    S.capsule(ctx, L.knee.x, L.knee.y, L.hand ? L.hand[0] : L.foot[0], L.hand ? L.hand[1] : L.foot[1],
      w * 0.86, w * 0.72, col, { depth: H * 0.03, side: Px.shade(col, -0.3) });
    const e = L.hand || L.foot;
    if (L.foot) {
      S.roundRect(ctx, e[0] - w * 1.6, e[1] - w * 0.7, w * 2.6, w * 1.5, w * 0.5, footCol,
        { depth: H * 0.025, side: Px.shade(footCol, -0.3) });
    } else {
      S.disc(ctx, e[0], e[1], w * 0.95, col, { depth: H * 0.02, side: Px.shade(col, -0.3) });
    }
  }

  function head(ctx, m, H, c, r, neck, blink, lean, opts) {
    S.capsule(ctx, neck[0], neck[1] + H * 0.02, c[0], c[1] + r * 0.5, H * 0.05, H * 0.055, C.skin,
      { depth: H * 0.03, side: C.skinS });
    // hair chain streams behind
    if (!m.placed) { m.hair.place(c[0] - r * 0.7, c[1] - r * 0.4); m.placed = true; }
    const wind = -Math.hypot(m.vx, m.vy) * 0.55 - 30;
    m.hair.update(1 / 60, c[0] - r * 0.72, c[1] - r * 0.35, wind, -8);
    const hp = m.hair.pts();
    S.ribbon(ctx, hp, hp.map((p, i) => H * (0.075 - i * 0.012)), C.hair,
      { depth: H * 0.02, side: C.hairS, tension: 0.5 });
    // face
    S.roundRect(ctx, c[0] - r, c[1] - r, r * 2, r * 2.05, r * 0.62, C.skin, { depth: H * 0.04, side: C.skinS });
    // blonde flat-top with a widow's peak
    S.blob(ctx, [
      [c[0] - r * 1.02, c[1] - r * 0.28], [c[0] - r * 0.95, c[1] - r * 1.12],
      [c[0] + r * 0.55, c[1] - r * 1.2], [c[0] + r * 1.0, c[1] - r * 0.5],
      [c[0] + r * 0.72, c[1] - r * 0.4], [c[0] + r * 0.3, c[1] - r * 0.62],
      [c[0] - r * 0.2, c[1] - r * 0.36]
    ], C.hair, { depth: H * 0.03, side: C.hairS, tension: 0.4 });
    // beard, a single dumb slab
    S.blob(ctx, [
      [c[0] - r * 0.7, c[1] + r * 0.55], [c[0] + r * 0.9, c[1] + r * 0.62],
      [c[0] + r * 0.75, c[1] + r * 1.12], [c[0] + r * 0.15, c[1] + r * 1.3],
      [c[0] - r * 0.55, c[1] + r * 1.05]
    ], C.hair, { depth: H * 0.02, side: C.hairS, tension: 0.4 });
    // eyes: wide-set, googly, permanently startled
    const look = { x: U.clamp(m.vx / 200, -1, 1), y: U.clamp(m.vy / 200, -1, 1) };
    const er = r * 0.30;
    if (blink) {
      ctx.strokeStyle = C.eye; ctx.lineWidth = Math.max(0.6, H * 0.02);
      ctx.beginPath();
      ctx.moveTo(c[0] + r * 0.02, c[1] - r * 0.1); ctx.lineTo(c[0] + r * 0.42, c[1] - r * 0.1);
      ctx.moveTo(c[0] + r * 0.52, c[1] - r * 0.1); ctx.lineTo(c[0] + r * 0.92, c[1] - r * 0.1);
      ctx.stroke();
    } else {
      S.eye(ctx, c[0] + r * 0.22, c[1] - r * 0.1, er, look, { pupil: C.eye });
      S.eye(ctx, c[0] + r * 0.72, c[1] - r * 0.12, er, look, { pupil: C.eye });
      ctx.strokeStyle = C.hairS; ctx.lineWidth = Math.max(0.7, H * 0.022);
      ctx.beginPath();
      ctx.moveTo(c[0] - r * 0.06, c[1] - r * 0.52); ctx.lineTo(c[0] + r * 0.46, c[1] - r * 0.58);
      ctx.moveTo(c[0] + r * 0.52, c[1] - r * 0.6); ctx.lineTo(c[0] + r * 0.98, c[1] - r * 0.5);
      ctx.stroke();
    }
    // grin
    const gw = r * 0.42 * (opts.talk ? 1 + Math.sin(m.t * 18) * 0.35 : 1);
    S.grin(ctx, c[0] + r * 0.5, c[1] + r * 0.36, gw, r * 0.3, '#7d2b2b', { tongue: '#e0607e', teeth: true });
  }

  function trident(ctx, m, H, hand, mode, opts) {
    const len = H * 0.78, w = H * 0.032;
    // cancel the body pose so the trident always points where he is going
    const rotFor = { stand: -Math.PI / 2 - 0.12, swim: -Math.PI / 2 + 0.12, ride: -0.42 };
    ctx.save();
    ctx.translate(hand[0], hand[1]);
    ctx.rotate((rotFor[mode] === undefined ? -0.4 : rotFor[mode]) + Math.sin(m.t * 1.4) * 0.03);
    // shaft
    S.roundRect(ctx, -len * 0.55, -w, len, w * 2, w, C.shaft, { depth: H * 0.025, side: C.shaftS });
    // three prongs at the forward end
    const px = len * 0.45;
    for (let i = -1; i <= 1; i++) {
      const y0 = i * H * 0.062;
      S.roundRect(ctx, px, y0 - w * 0.55, H * 0.15, w * 1.1, w * 0.55, C.gold, { depth: H * 0.02, side: C.goldS });
      S.tri(ctx, [px + H * 0.15, y0 - w * 1.4], [px + H * 0.25, y0], [px + H * 0.15, y0 + w * 1.4], C.gold,
        { depth: H * 0.02, side: C.goldS });
    }
    S.roundRect(ctx, px - w, -H * 0.072, w * 2, H * 0.145, w, C.gold, { depth: H * 0.02, side: C.goldS });
    ctx.restore();
  }

  return { draw, dt: 1 / 60, mem, C };
})();
