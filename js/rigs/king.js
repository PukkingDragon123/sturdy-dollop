/* ============================================================
   rigs/king.js - the player: former King of the Atlantic.
   Round, bearded, faintly ashamed. His belly grows with the fat
   stat and his forehead still has the pale band where the crown
   used to sit. Cape on a verlet chain, IK limbs, no absurd butt.
   ============================================================ */
KA.Rig = KA.Rig || {};
KA.Rig.king = (function () {
  const U = KA.U, D = KA.D, R = KA.Rig;
  const C = {
    skin: '#f0c49b', skinS: '#c48a63',
    hair: '#e8e2d0', hairS: '#b3ac97',
    tunic: '#2f8f8a', tunicS: '#1c5f5c',
    cape: '#a8324a', capeS: '#6d1c2d',
    gold: '#ffc94a', goldS: '#c9821c',
    boot: '#7a4a2a', bootS: '#4f2f18',
    eye: '#1a2430'
  };
  const st = {
    cape: new R.Chain(6, 5.2, { grav: 16, drag: 0.9, stiff: 3 }),
    belly: new R.Soft(140, 9, 3),
    lean: new R.Spring(0, 100, 12),
    kick: 0, blink: 2, t: 0, px: null, py: null, vx: 0, vy: 0, look: { x: 0, y: 0 }, lookT: 0
  };

  /* draw(ctx, x, y, o)
     o: scale, mode 'walk'|'swim'|'ride'|'stand', dir, vx, vy, fat (0..100),
        attack (0..1 swing progress), hurt, weapon (item), dt */
  function draw(ctx, x, y, o) {
    o = o || {};
    const dt = Math.min(0.05, o.dt === undefined ? 1 / 60 : o.dt);
    const sc = o.scale === undefined ? 1 : o.scale;
    const H = 46 * sc;                       // standing height, feet at y
    const dir = o.dir === undefined ? 1 : o.dir;
    const mode = o.mode || 'stand';
    const vx = o.vx || 0, vy = o.vy || 0;
    const spd = Math.hypot(vx, vy);
    const fat = U.clamp((o.fat === undefined ? 40 : o.fat) / 100, 0, 1);
    st.t += dt;

    if (st.px !== null) st.belly.push((vx - st.vx) * 0.02, (vy - st.vy) * 0.02);
    st.vx = vx; st.vy = vy; st.px = x; st.py = y;
    st.belly.update(dt);
    st.blink -= dt;
    const blink = st.blink < 0.09;
    if (st.blink < -0.02) st.blink = U.rnd(1.8, 5.5);
    st.lookT -= dt;
    if (st.lookT <= 0) { st.lookT = U.rnd(0.7, 2.6); st.look.x = U.rnd(-0.8, 0.8); st.look.y = U.rnd(-0.4, 0.6); }

    const rate = mode === 'walk' ? 1.4 + spd * 0.016 : mode === 'swim' ? 2.2 + spd * 0.012 : 0.8;
    st.kick += dt * rate * Math.PI * 2;
    st.lean.target = mode === 'swim' ? U.clamp(spd / 300, 0, 0.3) : 0;
    const lean = st.lean.update(dt);

    /* geometry in local space: origin at the feet, body up -y */
    const bellyR = H * (0.20 + fat * 0.11);
    const hipY = -H * (0.36 - fat * 0.02);
    const bellyC = [-H * 0.01 + st.belly.x * 0.4, hipY - bellyR * 0.55 + st.belly.y * 0.4];
    const shoY = hipY - bellyR * 1.25;
    const headR = H * 0.135;
    const headC = [H * 0.03, shoY - headR * 1.15];

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir < 0 ? -1 : 1, 1);
    if (mode === 'swim') ctx.rotate(Math.PI / 2 * 0.72 + Math.atan2(vy, Math.abs(vx) + 40) * 0.4);
    else if (mode === 'ride') ctx.rotate(0.06);
    if (o.hurt) ctx.rotate(Math.sin(st.t * 40) * 0.06);

    /* ---- cape on a chain, behind everything ---- */
    const anchor = [-H * 0.06, shoY + H * 0.02];
    st.cape.update(dt, anchor[0], anchor[1], -vx * 0.35 - 26 - (mode === 'swim' ? 40 : 0), -6);
    const cp = st.cape.pts();
    D.ribbon(ctx, cp, cp.map((p, i) => H * (0.16 - i * 0.02)), C.cape,
      { shadow: 'rgba(0,0,0,.28)', blur: 5, sy: 2, tension: 0.9 });
    D.ribbon(ctx, cp, cp.map((p, i) => H * (0.09 - i * 0.012)), D.shade(C.cape, -0.22), { tension: 0.9 });

    /* ---- far limbs ---- */
    const legs = [], arms = [];
    for (let i = 0; i < 2; i++) {
      const ph = st.kick + i * Math.PI;
      let tx, ty;
      if (mode === 'walk') { tx = Math.sin(ph) * H * 0.16; ty = Math.max(0, -Math.cos(ph) * H * 0.09); }
      else if (mode === 'swim') { tx = -H * (0.14 + Math.sin(ph) * 0.10); ty = -H * 0.02 + Math.cos(ph) * H * 0.10; }
      else if (mode === 'ride') { tx = -H * (0.06 + i * 0.05); ty = -H * 0.05 + i * H * 0.02; }
      else { tx = H * (0.04 - i * 0.09); ty = 0; }
      const hip = [-H * 0.05 + i * H * 0.09, hipY + bellyR * 0.25];
      const sol = R.solve2(hip[0], hip[1], tx, ty, H * 0.135, H * 0.145, i === 1);
      legs.push({ a: hip, k: sol, e: [sol.tx, sol.ty] });
    }
    const swing = o.attack ? Math.sin(U.clamp(o.attack, 0, 1) * Math.PI) : 0;
    for (let i = 0; i < 2; i++) {
      const ph = st.kick + (i ? 0 : Math.PI);
      const sho = [-H * 0.03 + i * H * 0.10, shoY + H * 0.03];
      let tgt;
      if (i === 1) {                                  // weapon arm
        const a = -0.26 + swing * 1.95;
        tgt = [sho[0] + Math.cos(a) * H * 0.34, sho[1] + Math.sin(a) * H * 0.34];
      } else if (mode === 'swim') tgt = [-H * 0.1 + Math.sin(ph) * H * 0.08, hipY * 0.4];
      else if (mode === 'ride') tgt = [H * 0.16, hipY + bellyR * 0.1];
      else tgt = [-H * 0.12 + Math.sin(ph) * H * 0.05, hipY + bellyR * 0.55];
      const asol = R.solve2(sho[0], sho[1], tgt[0], tgt[1], H * 0.17, H * 0.16, i === 0);
      arms.push({ a: sho, k: asol, e: [asol.tx, asol.ty] });
    }

    limb(ctx, legs[0], H * 0.062, D.shade(C.skin, -0.3), D.shade(C.boot, -0.25), true);
    limb(ctx, arms[0], H * 0.055, D.shade(C.skin, -0.28), null, false);

    /* ---- body: the belly is the silhouette ---- */
    D.ellipse(ctx, bellyC[0], bellyC[1], bellyR * (1 + st.belly.squash * 0.4), bellyR * 1.02 / (1 + st.belly.squash * 0.4),
      -0.06, D.vgrad(ctx, 0, bellyC[1] - bellyR, 0, bellyC[1] + bellyR,
        [[0, D.shade(C.tunic, 0.18)], [1, C.tunicS]], 'kbelly' + Math.round(bellyR)),
      { shadow: 'rgba(0,20,30,.4)', blur: 7, sy: 3 });
    // stretched-fabric highlight
    D.ellipse(ctx, bellyC[0] - bellyR * 0.3, bellyC[1] - bellyR * 0.42, bellyR * 0.42, bellyR * 0.2, -0.5, 'rgba(255,255,255,.14)');
    // chest / shoulders
    D.rr(ctx, -H * 0.115, shoY - H * 0.02, H * 0.23, bellyR * 0.9, H * 0.06, C.tunic);
    // gold belt straining
    D.rr(ctx, bellyC[0] - bellyR * 0.95, bellyC[1] + bellyR * 0.45, bellyR * 1.9, H * 0.055, H * 0.02,
      D.vgrad(ctx, 0, bellyC[1], 0, bellyC[1] + bellyR, [[0, C.gold], [1, C.goldS]], 'kbelt' + Math.round(bellyR)));
    D.rr(ctx, bellyC[0] - H * 0.035, bellyC[1] + bellyR * 0.4, H * 0.07, H * 0.075, H * 0.02, C.goldS);

    /* ---- near limbs ---- */
    limb(ctx, legs[1], H * 0.066, C.skin, C.boot, true);

    /* ---- head ---- */
    head(ctx, H, headC, headR, blink, o);

    /* ---- weapon arm on top, holding the current weapon ---- */
    limb(ctx, arms[1], H * 0.058, C.skin, null, false);
    weapon(ctx, H, arms[1].e, swing, o);

    ctx.restore();
  }

  function limb(ctx, L, w, col, footCol, isLeg) {
    D.capsule(ctx, L.a[0], L.a[1], L.k.x, L.k.y, w, w * 0.88, col);
    D.capsule(ctx, L.k.x, L.k.y, L.e[0], L.e[1], w * 0.88, w * 0.74, col);
    if (footCol) {
      D.rr(ctx, L.e[0] - w * 1.5, L.e[1] - w * 0.55, w * 2.7, w * 1.3, w * 0.5, footCol);
    } else {
      D.circle(ctx, L.e[0], L.e[1], w * 0.95, col);
    }
  }

  function head(ctx, H, c, r, blink, o) {
    // neck
    D.capsule(ctx, c[0] - H * 0.01, c[1] + r * 0.7, c[0], c[1] + r * 0.2, H * 0.05, H * 0.055, C.skin);
    // skull
    D.circle(ctx, c[0], c[1], r, D.vgrad(ctx, 0, c[1] - r, 0, c[1] + r,
      [[0, D.shade(C.skin, 0.12)], [1, C.skinS]], 'khead' + Math.round(r)), { shadow: 'rgba(0,20,30,.3)', blur: 5, sy: 2 });
    // the pale band where the crown used to sit
    D.path(ctx, () => {
      ctx.ellipse(c[0], c[1] - r * 0.48, r * 0.92, r * 0.3, 0, 0, 6.283);
    }, 'rgba(255,245,225,.55)');
    // hair fringe + royal topknot
    D.blob(ctx, [[c[0] - r * 1.0, c[1] - r * 0.28], [c[0] - r * 0.75, c[1] - r * 1.02],
                 [c[0] + r * 0.55, c[1] - r * 1.05], [c[0] + r * 0.98, c[1] - r * 0.35],
                 [c[0] + r * 0.5, c[1] - r * 0.6], [c[0] - r * 0.3, c[1] - r * 0.55]], C.hair, { tension: 0.7 });
    D.circle(ctx, c[0] - r * 0.15, c[1] - r * 1.15, r * 0.26, C.hair);
    // big honest nose
    D.circle(ctx, c[0] + r * 0.72, c[1] + r * 0.12, r * 0.27, D.shade(C.skin, -0.08));
    D.circle(ctx, c[0] + r * 0.78, c[1] + r * 0.06, r * 0.1, 'rgba(255,255,255,.35)');
    // beard: three soft lobes
    D.blob(ctx, [[c[0] - r * 0.72, c[1] + r * 0.28], [c[0] + r * 0.7, c[1] + r * 0.3],
                 [c[0] + r * 0.62, c[1] + r * 1.25], [c[0] + r * 0.02, c[1] + r * 1.55],
                 [c[0] - r * 0.6, c[1] + r * 1.1]], C.hair, { tension: 0.85, shadow: 'rgba(0,0,0,.18)', blur: 3, sy: 1 });
    D.blob(ctx, [[c[0] - r * 0.5, c[1] + r * 0.4], [c[0] + r * 0.45, c[1] + r * 0.42],
                 [c[0] + r * 0.3, c[1] + r * 1.1], [c[0] - r * 0.35, c[1] + r * 0.95]],
      D.shade(C.hair, -0.1), { tension: 0.85 });
    // eyes + brows
    const er = r * 0.2;
    if (blink) {
      D.line(ctx, c[0] + r * 0.1, c[1] - r * 0.12, c[0] + r * 0.42, c[1] - r * 0.12, C.eye, 1.6);
    } else {
      D.eye(ctx, c[0] + r * 0.3, c[1] - r * 0.1, er, st.look, { pupil: C.eye });
      D.eye(ctx, c[0] - r * 0.18, c[1] - r * 0.12, er * 0.94, st.look, { pupil: C.eye });
    }
    ctx.strokeStyle = C.hairS; ctx.lineWidth = Math.max(1, r * 0.13); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(c[0] - r * 0.42, c[1] - r * 0.46); ctx.lineTo(c[0] - r * 0.02, c[1] - r * 0.4);
    ctx.moveTo(c[0] + r * 0.12, c[1] - r * 0.4); ctx.lineTo(c[0] + r * 0.5, c[1] - r * 0.46);
    ctx.stroke();
    if (o.talk) D.mouthOpen(ctx, c[0] + r * 0.3, c[1] + r * 0.5, r * 0.22, r * 0.2 * (1 + Math.sin(st.t * 22) * 0.5), '#5e1f22');
  }

  function weapon(ctx, H, hand, swing, o) {
    const W = o.weapon || KA.Items.WEAPONS[0];
    const len = H * (0.44 + (W.reach - 24) * 0.012);
    const ang = -0.62 + swing * 2.1;
    ctx.save();
    ctx.translate(hand[0], hand[1]);
    ctx.rotate(ang);
    const w = H * 0.028;
    if (W.id === 'stool') {
      D.rr(ctx, -w, -w, len * 0.8, w * 2, w, '#8a5f30');
      D.rr(ctx, len * 0.72, -H * 0.075, H * 0.10, H * 0.15, H * 0.03, W.col);
      for (let i = -1; i <= 1; i += 2) D.rr(ctx, len * 0.76, i * H * 0.075, H * 0.05, H * 0.055, 2, '#6d4a24');
    } else if (W.id === 'bone') {
      D.capsule(ctx, 0, 0, len, 0, w * 1.1, w * 0.8, W.col);
      D.circle(ctx, 0, 0, w * 1.8, W.col); D.circle(ctx, len, 0, w * 1.2, W.col);
    } else if (W.id === 'trident' || W.id === 'fork') {
      D.rr(ctx, -w, -w * 0.8, len, w * 1.6, w, '#a4713d');
      for (let i = -1; i <= 1; i++) {
        D.rr(ctx, len - H * 0.02, i * H * 0.05 - w * 0.5, H * 0.09, w, w * 0.5, W.col);
        D.tri(ctx, [len + H * 0.07, i * H * 0.05 - w * 1.3], [len + H * 0.14, i * H * 0.05],
              [len + H * 0.07, i * H * 0.05 + w * 1.3], W.col);
      }
      D.rr(ctx, len - H * 0.03, -H * 0.06, w * 1.4, H * 0.12, w * 0.7, W.col);
    } else if (W.id === 'halberd') {
      D.rr(ctx, -w, -w * 0.8, len, w * 1.6, w, '#7a4a2a');
      D.blob(ctx, [[len - H * 0.02, -H * 0.02], [len + H * 0.02, -H * 0.13],
                   [len + H * 0.13, -H * 0.05], [len + H * 0.09, H * 0.05]], W.col, { tension: 0.5 });
      D.tri(ctx, [len - H * 0.02, H * 0.01], [len + H * 0.06, H * 0.09], [len - H * 0.05, H * 0.06], D.shade(W.col, -0.2));
    } else {
      D.rr(ctx, -w, -w, len, w * 2, w, '#c9b483');
      D.blob(ctx, [[len - H * 0.02, -H * 0.03], [len + H * 0.05, -H * 0.12],
                   [len + H * 0.18, 0], [len + H * 0.05, H * 0.12], [len - H * 0.02, H * 0.03]],
        W.col, { tension: 0.5, shadow: D.alpha(W.col, 0.6), blur: 8, sy: 0 });
    }
    ctx.restore();
    if (swing > 0.25) {
      ctx.globalAlpha = (swing - 0.25) * 0.6;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = H * 0.035;
      ctx.beginPath();
      ctx.arc(hand[0], hand[1], len * 0.92, ang - 1.1, ang + 0.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  return { draw, C, st };
})();
