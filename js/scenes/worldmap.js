/* ============================================================
   worldmap.js - the overworld. You ride the trident like a broom
   across a big stretch of ocean; landmarks are places you can
   enter, some with a guard standing in front of them.
   ============================================================ */
DZ.Scenes.worldmap = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, S = DZ.Rig.S, PAL = DZ.PAL;
  const P = DZ.Places;
  let t = 0, cam, me, scenery = [], near = null, hint = 0, fishies = [], boostT = 0;

  function enter(args) {
    t = 0;
    cam = new DZ.Camera(DZ.W, DZ.H, P.W, P.H);
    const St = DZ.State.S;
    const start = (args && args.at && P.byId[args.at]) ||
                  (St.mapPos ? null : P.byId[St.place || 'ranch']) || P.byId.ranch;
    me = {
      x: St.mapPos ? St.mapPos.x : start.x + start.r + 34,
      y: St.mapPos ? St.mapPos.y : start.y + 10,
      vx: 0, vy: 0, dir: 1
    };
    if (args && args.at && P.byId[args.at]) {
      const a2 = P.byId[args.at];
      me.x = a2.x + a2.r + 34; me.y = a2.y + 10;
    }
    cam.follow(me.x, me.y, 0, 0, 1, 0); cam.snap();
    scenery = P.scenery(4242);
    fishies = [];
    for (let i = 0; i < 26; i++) {
      fishies.push({ x: U.rnd(0, P.W), y: U.rnd(180, P.H - 60), sp: U.pick(DZ.Species.list),
                     dir: U.chance(0.5) ? 1 : -1, v: U.rnd(10, 32), ph: U.rnd(0, 9) });
    }
    hint = 4;
  }
  function exit() {
    const St = DZ.State.S;
    St.mapPos = { x: me.x, y: me.y };
    DZ.State.save();
  }

  function update(dt) {
    t += dt;
    DZ.Water.tick(dt);
    if (DZ.Dialog.active()) { DZ.Dialog.update(dt); return; }
    if (hint > 0) hint -= dt;

    /* ---- flight ---- */
    const ax = DZ.Input.axis();
    const boost = DZ.Input.isDown('Space') || DZ.Input.isDown('ShiftLeft');
    if (boost) boostT += dt; else boostT = 0;
    const thrust = boost ? 900 : 520;
    me.vx += ax.x * thrust * dt;
    me.vy += ax.y * thrust * dt;
    const drag = Math.pow(boost ? 0.22 : 0.06, dt);
    me.vx *= drag; me.vy *= drag;
    me.x = U.clamp(me.x + me.vx * dt, 20, P.W - 20);
    me.y = U.clamp(me.y + me.vy * dt, 120, P.H - 30);
    if (Math.abs(me.vx) > 8) me.dir = me.vx > 0 ? 1 : -1;
    const spd = Math.hypot(me.vx, me.vy);
    if (spd > 40 && U.chance(dt * (boost ? 40 : 14))) {
      DZ.FX.bubbles(me.x - me.dir * 12, me.y + 6, 1, { vx: -me.vx * 0.2, vy: -me.vy * 0.2 });
    }
    if (boost && U.chance(dt * 8)) DZ.Audio.play('bubble');

    /* ---- proximity ---- */
    near = null;
    let best = 1e9;
    for (const p of P.LIST) {
      const d = U.dist(me.x, me.y, p.x, p.y);
      if (d < p.r + 30 && d < best) { best = d; near = p; }
    }
    if (near && DZ.Input.isPressed('KeyE')) interact(near);
    if (DZ.Input.isPressed('Escape')) DZ.Game.go('ranch');
    cam.follow(me.x, me.y, me.vx, me.vy, dt, 0.32);
  }

  /* ---- entering / talking ---- */
  function interact(p) {
    const St = DZ.State.S;
    if (P.unlocked(St, p.id)) return go(p);
    const g = p.gate;
    const res = g.check(St);
    const talkedBefore = St.talked[p.id];
    if (res.ok) {
      DZ.Dialog.open({
        name: p.npc.name, kind: p.npc.kind, col: p.npc.col,
        lines: (talkedBefore ? [] : g.intro).concat(g.pass),
        choices: [
          { text: 'DO IT' + (res.how ? ' (' + res.how + ')' : ''), tone: 'gold', action: () => {
              if (res.pay) res.pay();
              P.unlock(St, p.id);
              St.talked[p.id] = true;
              DZ.State.toast(p.name + ' unlocked!', p.npc.col);
              DZ.Audio.play('cash');
              DZ.FX.flash(p.npc.col, 0.2);
              DZ.State.save();
            } },
          { text: 'NOT YET', tone: 'dark', action: () => { St.talked[p.id] = true; DZ.State.save(); } }
        ]
      });
    } else {
      DZ.Dialog.open({
        name: p.npc.name, kind: p.npc.kind, col: p.npc.col,
        lines: (talkedBefore ? [] : g.intro).concat([res.why]),
        onDone: () => { St.talked[p.id] = true; DZ.State.save(); }
      });
    }
  }
  function go(p) {
    const St = DZ.State.S;
    St.place = p.id;
    St.mapPos = { x: me.x, y: me.y };
    DZ.Audio.play('click');
    if (p.dive !== undefined) DZ.Game.go('reef', { zone: p.dive, from: 'worldmap' });
    else DZ.Game.go(p.scene || 'ranch', { from: 'worldmap' });
  }

  /* ---------------- draw ---------------- */
  function draw(ctx) {
    const St = DZ.State.S;
    // depth gradient: sunlit at the top, black at the bottom
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, shadeAt(cam.y), shadeAt(cam.y + DZ.H), 12);
    ctx.save();
    cam.apply(ctx);

    // surface + light shafts only near the top of the world
    if (cam.y < 300) {
      DZ.Water.surfaceLine(ctx, 96);
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 14; i++) {
        const x = (i * 220 + Math.sin(t * 0.15 + i) * 30);
        Px.rect(ctx, x, 100, 16, 900, '#cfefff');
      }
      ctx.globalAlpha = 1;
      // sky above the waterline
      Px.rect(ctx, 0, 0, P.W, 96, '#1b4f74');
      for (let i = 0; i < P.W; i += 40) {
        S.disc(ctx, i + 20, 40 + Math.sin(i * 0.02) * 12, 16, '#24618c', { depth: 0 });
      }
    }
    // seabed
    DZ.Water.ground(ctx, P.H - 26, P.W, '#3a3050', '#221c33', 0, 60);

    // scenery
    for (const s of scenery) {
      const sx = s.x, sy = s.y;
      if (sx < cam.x - 90 || sx > cam.x + DZ.W + 90 || sy < cam.y - 120 || sy > cam.y + DZ.H + 60) continue;
      prop(ctx, s);
    }
    // ambient fish
    for (const f of fishies) {
      f.x += f.v * f.dir * (1 / 60);
      if (f.x > P.W) f.x = 0; if (f.x < 0) f.x = P.W;
      if (f.x < cam.x - 40 || f.x > cam.x + DZ.W + 40 || f.y < cam.y - 40 || f.y > cam.y + DZ.H + 40) continue;
      DZ.Fish.draw(ctx, f.sp, f.x, f.y + Math.sin(t * 2 + f.ph) * 3, { scale: 0.9, flipX: f.dir < 0, tag: 'mp' + fishies.indexOf(f) });
    }

    // landmarks
    for (const p of P.LIST) {
      if (p.x < cam.x - 200 || p.x > cam.x + DZ.W + 200 || p.y < cam.y - 220 || p.y > cam.y + DZ.H + 200) continue;
      landmark(ctx, p, St);
    }

    // the hero on his trident
    const spd = Math.hypot(me.vx, me.vy);
    DZ.Rig.hero.draw(ctx, me.x, me.y, {
      scale: 1.25, mode: 'ride', vx: me.vx, vy: me.vy, dir: me.dir,
      dash: boostT > 0.05, tag: 'rider'
    });
    DZ.FX.drawWorld(ctx);
    ctx.restore();

    DZ.Water.marineSnow(ctx, cam.x, cam.y, 1 / 60);
    hud(ctx, St, spd);
    if (DZ.Dialog.active()) DZ.Dialog.draw(ctx);
  }

  function shadeAt(y) {
    const f = U.clamp(y / P.H, 0, 1);
    const cols = ['#3fb0e0', '#1d7ba8', '#12557d', '#0c3552', '#071f33', '#04101c', '#02070d'];
    const i = U.clamp(Math.floor(f * (cols.length - 1)), 0, cols.length - 2);
    return Px.mix(cols[i], cols[i + 1], (f * (cols.length - 1)) - i);
  }

  function prop(ctx, s) {
    const dim = 0.5 + (1 - s.deep) * 0.5;
    ctx.globalAlpha = dim;
    const sz = 18 * s.s, x = s.x, y = s.y;
    if (s.kind === 'islet') {
      // a floating chunk of seabed - reads as an underwater archipelago
      S.blob(ctx, [[-sz * 1.15, -sz * 0.05], [-sz * 0.8, -sz * 0.4], [0, -sz * 0.5], [sz * 0.85, -sz * 0.35],
                   [sz * 1.15, -sz * 0.02], [sz * 0.7, sz * 0.4], [-sz * 0.75, sz * 0.38]]
        .map((p) => [x + p[0], y + p[1]]), '#2e3a4c', { depth: 3, side: '#1d2634', tension: 0.38 });
      S.ellipse(ctx, x, y - sz * 0.42, sz * 0.85, sz * 0.22, 0, '#c9b483', { depth: 2, side: '#9c8a5f' });
      for (let i = 0; i < 3; i++) {
        DZ.Water.kelp(ctx, x - sz * 0.4 + i * sz * 0.4, y - sz * 0.45, sz * (0.7 + (i % 2) * 0.5), s.ph + i, '#1c6b46', '#2f9a63');
      }
    } else if (s.kind === 'coralhead') {
      S.blob(ctx, [[-sz * 0.8, sz * 0.4], [-sz * 0.5, -sz * 0.1], [0, sz * 0.1], [sz * 0.5, -sz * 0.1], [sz * 0.8, sz * 0.4]]
        .map((p) => [x + p[0], y + p[1]]), '#2e3a4c', { depth: 2, tension: 0.4 });
      for (let i = -1; i <= 1; i++) {
        S.blob(ctx, [[-sz * 0.22, sz * 0.1], [-sz * 0.18, -sz * 0.5], [0, -sz * 0.8], [sz * 0.2, -sz * 0.45], [sz * 0.24, sz * 0.1]]
          .map((p) => [x + p[0] + i * sz * 0.42, y + p[1]]), i ? '#ff7fa8' : '#ffb347', { depth: 2, tension: 0.5 });
      }
    } else if (s.kind === 'ruin') {
      S.ellipse(ctx, x, y + sz * 0.35, sz * 0.85, sz * 0.24, 0, '#2e3a4c', { depth: 2 });
      const h = sz * (1.2 + (s.ph % 1) * 0.8);
      S.rect(ctx, x - sz * 0.16, y + sz * 0.3 - h, sz * 0.32, h, '#8f9db0', { depth: 3, side: '#6a7787' });
      S.rect(ctx, x - sz * 0.26, y + sz * 0.28 - h, sz * 0.52, sz * 0.16, '#aab9c9', { depth: 2 });
    } else if (s.kind === 'bubbles') {
      for (let i = 0; i < 6; i++) {
        const by = y - ((t * 26 + i * 22 + s.ph * 30) % (sz * 5));
        ctx.globalAlpha = dim * 0.5 * (1 - Math.abs(by - y) / (sz * 5));
        Px.ring(ctx, x + Math.sin(by * 0.08 + s.ph) * 5, by, 1 + (i % 3), '#bfeaff');
      }
      ctx.globalAlpha = dim;
      S.blob(ctx, [[-sz * 0.3, 0], [0, -sz * 0.3], [sz * 0.3, 0]].map((p) => [x + p[0], y + p[1]]),
        '#2b3646', { depth: 1, tension: 0.4 });
    } else if (s.kind === 'drift') {
      const jsp = DZ.Species.get(s.deep > 0.66 ? 'nightjelly' : 'jelly');
      DZ.Fish.draw(ctx, jsp, x, y + Math.sin(t * 0.7 + s.ph) * 10, { scale: s.s * 1.1, tag: 'dj' + Math.round(x) });
    } else if (s.kind === 'wreck') {
      S.blob(ctx, [[-sz * 1.6, -sz * 0.1], [-sz * 1.2, -sz * 0.5], [sz * 1.1, -sz * 0.55],
                   [sz * 1.6, sz * 0.05], [sz * 0.9, sz * 0.45], [-sz * 1.1, sz * 0.4]]
        .map((p) => [x + p[0], y + p[1]]), '#5a4630', { depth: 3, side: '#3a2c1c', tension: 0.4 });
      S.rect(ctx, x - sz * 0.1, y - sz * 1.5, sz * 0.16, sz * 1.05, '#3a2c1c', { depth: 2 });
      S.tri(ctx, [x + sz * 0.06, y - sz * 1.45], [x + sz * 0.9, y - sz * 0.95], [x + sz * 0.06, y - sz * 0.6],
        '#c9b483', { depth: 1 });
      for (let i = 0; i < 3; i++) S.disc(ctx, x - sz * 0.9 + i * sz * 0.7, y - sz * 0.1, sz * 0.12, '#1b2634', { depth: 0 });
    }
    ctx.globalAlpha = 1;
  }

  /* ---- landmark art: flat chunky structures ---- */
  function landmark(ctx, p, St) {
    const open = P.unlocked(St, p.id);
    const x = p.x, y = p.y, r = p.r;
    const glow = near === p;
    if (glow) {
      ctx.globalAlpha = 0.16 + Math.sin(t * 4) * 0.06;
      S.disc(ctx, x, y, r * 1.15, '#ffffff', { depth: 0 });
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = open ? 1 : 0.85;
    switch (p.art) {
      case 'ranch': {
        S.ellipse(ctx, x, y + r * 0.55, r * 1.05, r * 0.35, 0, '#c2a86a', { depth: 4 });
        for (let i = -1; i <= 1; i++) {
          S.roundRect(ctx, x + i * r * 0.5 - r * 0.22, y - r * 0.1, r * 0.44, r * 0.5, 4, '#2f7ea8', { depth: 4, side: '#1b5877' });
          S.tri(ctx, [x + i * r * 0.5 - r * 0.3, y - r * 0.1], [x + i * r * 0.5, y - r * 0.5],
                [x + i * r * 0.5 + r * 0.3, y - r * 0.1], '#ff8f5a', { depth: 3, side: '#c9601c' });
        }
        S.rect(ctx, x - r * 0.05, y - r * 0.95, r * 0.1, r * 0.45, '#a4713d', { depth: 2 });
        S.roundRect(ctx, x - r * 0.45, y - r * 1.25, r * 0.9, r * 0.34, 3, '#c9a26a', { depth: 3, side: '#8a6a3c' });
        T.draw(ctx, 'RANCH', x, y - r * 1.18, '#4a2f14', { size: 8, align: 'center', bold: true });
        break;
      }
      case 'reefpatch':
        S.ellipse(ctx, x, y + r * 0.4, r * 1.1, r * 0.4, 0, '#e9d9a8', { depth: 4 });
        for (let i = 0; i < 7; i++) {
          const a = -0.3 + i * 0.5, rr = r * 0.75;
          S.blob(ctx, [[-8, 8], [-6, -10], [0, -16], [7, -9], [9, 8]].map((q) =>
            [x + Math.cos(a) * rr * 0.7 + q[0], y + q[1] + Math.sin(a) * 8]),
            i % 2 ? '#ff7fa8' : '#ffb347', { depth: 2, tension: 0.5 });
        }
        break;
      case 'kelpwood':
        for (let i = 0; i < 9; i++) DZ.Water.kelp(ctx, x - r * 0.8 + i * r * 0.2, y + r * 0.4, r * (0.9 + (i % 3) * 0.25), i * 2, '#17603e', '#2f9a63');
        S.ellipse(ctx, x, y + r * 0.45, r * 0.95, r * 0.22, 0, '#25543a', { depth: 3 });
        break;
      case 'ruins':
        S.ellipse(ctx, x, y + r * 0.5, r * 1.1, r * 0.3, 0, '#8f9db0', { depth: 3 });
        for (let i = -2; i <= 2; i++) {
          const h = r * (0.9 - Math.abs(i) * 0.14);
          S.rect(ctx, x + i * r * 0.38 - r * 0.09, y + r * 0.4 - h, r * 0.18, h, '#aab9c9', { depth: 4, side: '#7c8b9c' });
          S.rect(ctx, x + i * r * 0.38 - r * 0.14, y + r * 0.4 - h - r * 0.07, r * 0.28, r * 0.08, '#c3d0dd', { depth: 2 });
        }
        S.rect(ctx, x - r * 0.85, y - r * 0.55, r * 1.7, r * 0.12, '#c3d0dd', { depth: 3 });
        break;
      case 'city': {
        S.ellipse(ctx, x, y + r * 0.5, r * 1.15, r * 0.3, 0, '#c9a26a', { depth: 3 });
        for (let i = -1; i <= 1; i++) {
          const hh = r * (i === 0 ? 1.0 : 0.7);
          S.roundRect(ctx, x + i * r * 0.55 - r * 0.2, y + r * 0.4 - hh, r * 0.4, hh, 4, '#e9d9a8', { depth: 4, side: '#c2a86a' });
          S.disc(ctx, x + i * r * 0.55, y + r * 0.4 - hh, r * 0.21, '#ffd24a', { depth: 3, side: '#c98f1c' });
          S.rect(ctx, x + i * r * 0.55 - r * 0.02, y + r * 0.4 - hh - r * 0.3, r * 0.04, r * 0.22, '#ffd24a', { depth: 0 });
        }
        ctx.globalAlpha *= 0.35;
        S.disc(ctx, x, y, r * 1.05, '#9fe8ff', { depth: 0 });
        ctx.globalAlpha /= 0.35;
        break;
      }
      case 'track': {
        S.ellipse(ctx, x, y + r * 0.2, r * 1.0, r * 0.5, 0, '#2f8f66', { depth: 4 });
        S.ellipse(ctx, x, y + r * 0.2, r * 0.7, r * 0.32, 0, '#1d7ba8', { depth: 0 });
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * 6.28;
          S.rect(ctx, x + Math.cos(a) * r * 0.88 - 2, y + r * 0.2 + Math.sin(a) * r * 0.44 - 8, 3, 10, '#ffffff', { depth: 0 });
        }
        S.roundRect(ctx, x - r * 0.55, y - r * 0.7, r * 1.1, r * 0.34, 3, '#c53a3a', { depth: 4, side: '#8c2222' });
        for (let i = 0; i < 6; i++) S.disc(ctx, x - r * 0.42 + i * r * 0.17, y - r * 0.55, r * 0.05, '#ffd24a', { depth: 0 });
        break;
      }
      case 'chasm': {
        ctx.globalAlpha *= 0.95;
        S.blob(ctx, [[x - r, y + r * 0.5], [x - r * 0.6, y - r * 0.5], [x, y - r * 0.8],
                     [x + r * 0.6, y - r * 0.45], [x + r, y + r * 0.5]], '#0a0714', { depth: 0, tension: 0.45 });
        S.blob(ctx, [[x - r * 0.7, y + r * 0.4], [x - r * 0.4, y - r * 0.25], [x, y - r * 0.5],
                     [x + r * 0.4, y - r * 0.2], [x + r * 0.7, y + r * 0.4]], '#02030a', { depth: 0, tension: 0.45 });
        ctx.globalAlpha /= 0.95;
        for (let i = 0; i < 4; i++) {
          const ex = x - r * 0.4 + i * r * 0.27, ey = y - r * 0.1 + Math.sin(t * 1.3 + i) * 4;
          ctx.globalAlpha = 0.5 + Math.sin(t * 2 + i * 2) * 0.4;
          S.disc(ctx, ex, ey, 3, '#a86bff', { depth: 0 });
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'bazaar':
        S.ellipse(ctx, x, y + r * 0.45, r * 1.0, r * 0.25, 0, '#2b2438', { depth: 3 });
        for (let i = -1; i <= 1; i++) {
          const bx = x + i * r * 0.5;
          S.rect(ctx, bx - r * 0.22, y - r * 0.1, r * 0.44, r * 0.5, '#3a2f4a', { depth: 3, side: '#241c30' });
          S.tri(ctx, [bx - r * 0.32, y - r * 0.1], [bx, y - r * 0.55], [bx + r * 0.32, y - r * 0.1],
            i ? '#7a3f9e' : '#c53a3a', { depth: 3 });
          S.disc(ctx, bx, y + r * 0.12, r * 0.07, '#c8ff4a', { depth: 0 });
        }
        break;
      case 'town': {
        S.ellipse(ctx, x, y + r * 0.45, r * 1.1, r * 0.28, 0, '#d9c48a', { depth: 3 });
        for (let i = -1; i <= 1; i++) {
          const bx = x + i * r * 0.5;
          S.rect(ctx, bx - r * 0.2, y - r * 0.15, r * 0.4, r * 0.55, '#f4e7c9', { depth: 3, side: '#c2a86a' });
          for (let k = 0; k < 5; k++) {
            S.rect(ctx, bx - r * 0.2 + k * r * 0.08, y - r * 0.3, r * 0.08, r * 0.15,
              k % 2 ? '#c53a3a' : '#f4e7c9', { depth: 0 });
          }
          S.rect(ctx, bx - r * 0.12, y + r * 0.05, r * 0.24, r * 0.12, '#7ff0ff', { depth: 0 });
        }
        S.blob(ctx, [[x - r * 0.3, y + r * 0.4], [x - r * 0.22, y + r * 0.18], [x, y + r * 0.1],
                     [x + r * 0.22, y + r * 0.18], [x + r * 0.3, y + r * 0.4]], '#f6d7e8', { depth: 3, tension: 0.5 });
        break;
      }
    }
    ctx.globalAlpha = 1;

    /* guard / questgiver stands out front when still locked */
    if (!open && p.npc) {
      DZ.Rig.npc.draw(ctx, x + r * 0.1, y + r * 0.62, {
        scale: 1.15, kind: p.npc.kind, dir: -1, alert: glow, tag: 'g' + p.id
      });
      if (!glow) {
        ctx.globalAlpha = 0.8;
        Px.rect(ctx, x - 1, y - r * 0.1, 2, 2, '#ff6f6f');
        ctx.globalAlpha = 1;
      }
    }

    /* name plate */
    const nm = p.name.toUpperCase();
    const w = T.width(nm, 8, true) + 10;
    const py = y - r - 16;
    Px.rect(ctx, x - w / 2, py, w, 12, open ? '#07202f' : '#2a1220');
    Px.frame(ctx, x - w / 2, py, w, 12, open ? (glow ? '#ffffff' : PAL.line) : PAL.coral);
    T.draw(ctx, nm, x, py + 2, open ? (glow ? '#ffffff' : PAL.text) : PAL.coral, { size: 8, align: 'center', bold: true });
    if (!open) T.draw(ctx, 'LOCKED', x, py + 13, PAL.coral, { size: 7, align: 'center' });
  }

  /* ---------------- hud ---------------- */
  function hud(ctx, St, spd) {
    Px.rect(ctx, 0, 0, DZ.W, 13, '#041826');
    Px.rect(ctx, 0, 13, DZ.W, 1, PAL.line);
    T.draw(ctx, 'THE OCEAN', 4, 3, PAL.cyan, { size: 8, bold: true });
    Px.draw(ctx, 'coin', 74, 4, {});
    T.draw(ctx, U.fmt(St.clams), 82, 3, PAL.gold, { size: 8 });
    T.draw(ctx, 'DAY ' + St.day, 130, 3, PAL.text, { size: 8 });
    const kn = P.LIST.filter((p) => P.unlocked(St, p.id)).length;
    T.draw(ctx, kn + '/' + P.LIST.length + ' places', 186, 3, PAL.dim, { size: 7 });
    if (DZ.UI.button(ctx, DZ.W - 46, 1, 44, 11, 'RANCH', { tone: 'dark', size: 7, key: 'Escape' })) DZ.Game.go('ranch');

    /* minimap */
    const mw = 92, mh = Math.round(mw * P.H / P.W), mx = DZ.W - mw - 4, my = 17;
    Px.rect(ctx, mx, my, mw, mh, '#041826');
    Px.frame(ctx, mx, my, mw, mh, PAL.line);
    for (const p of P.LIST) {
      const px = mx + (p.x / P.W) * mw, py = my + (p.y / P.H) * mh;
      const open = P.unlocked(St, p.id);
      Px.rect(ctx, px - 1, py - 1, 3, 3, open ? (near === p ? '#ffffff' : PAL.gold) : PAL.coral);
    }
    Px.rect(ctx, mx + (me.x / P.W) * mw - 1, my + (me.y / P.H) * mh - 1, 2, 2, '#7ff0ff');
    Px.rect(ctx, mx + (cam.x / P.W) * mw, my + (cam.y / P.H) * mh,
      Math.max(2, (DZ.W / P.W) * mw), Math.max(2, (DZ.H / P.H) * mh), 'rgba(0,0,0,0)');
    Px.frame(ctx, mx + (cam.x / P.W) * mw, my + (cam.y / P.H) * mh,
      Math.max(3, (DZ.W / P.W) * mw), Math.max(3, (DZ.H / P.H) * mh), '#7ff0ff');

    /* speed */
    DZ.UI.bar(ctx, 4, DZ.H - 12, 70, 8, U.clamp(spd / 460, 0, 1),
      { col: boostT > 0 ? PAL.orange : PAL.cyan, label: boostT > 0 ? 'BOOST' : 'SPEED' });
    if (hint > 0) {
      ctx.globalAlpha = U.clamp(hint, 0, 1);
      const msg = 'WASD to fly the trident  -  SPACE to boost  -  E at a place to enter or talk';
      const w = T.width(msg, 8) + 12;
      Px.rect(ctx, DZ.W / 2 - w / 2, 22, w, 14, '#041826');
      Px.frame(ctx, DZ.W / 2 - w / 2, 22, w, 14, PAL.gold);
      T.draw(ctx, msg, DZ.W / 2, 25, PAL.text, { size: 8, align: 'center' });
      ctx.globalAlpha = 1;
    }

    /* interaction prompt */
    if (near && !DZ.Dialog.active()) {
      const open = P.unlocked(DZ.State.S, near.id);
      const label = open
        ? '[E]  ENTER ' + near.name.toUpperCase() + (near.dive !== undefined ? '  (dive)' : '')
        : '[E]  TALK TO ' + near.npc.name.toUpperCase();
      const sub = open ? near.blurb : 'this place is closed to you';
      const w = Math.max(T.width(label, 10, true), T.width(sub, 7)) + 16;
      const x = DZ.W / 2 - w / 2, y = DZ.H - 34;
      Px.rect(ctx, x + 2, y + 3, w, 28, '#02090f');
      Px.rect(ctx, x, y, w, 28, '#07202f');
      Px.frame(ctx, x, y, w, 28, open ? PAL.gold : PAL.coral);
      T.draw(ctx, label, DZ.W / 2, y + 4, open ? PAL.gold : PAL.coral, { size: 10, align: 'center', bold: true });
      T.draw(ctx, sub, DZ.W / 2, y + 17, PAL.dim, { size: 7, align: 'center' });
    }
  }

  return { enter, exit, update, draw };
})();
