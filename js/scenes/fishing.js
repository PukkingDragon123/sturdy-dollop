/* ============================================================
   fishing.js - throw a spear with a power charge, then wrestle
   whatever you hit. Harder than pointing and clicking.
   ============================================================ */
KA.Scenes.fishing = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL, S = KA.S;
  let phase = 'aim', table = [], back = 'home', backX = 200;
  let power = 0, dirUp = 1, aim = 0.6, spear = null, fish = [], t = 0;
  let hooked = null, hookPos = 0.5, hookV = 0, fishPos = 0.5, fishV = 0, prog = 0, tension = 0;
  let caught = [], msg = null, msgT = 0;

  function enter(args) {
    table = (args && args.table) || ['shrimp', 'sardine'];
    back = (args && args.back) || 'home';
    backX = (args && args.x) || 200;
    phase = 'aim'; power = 0; dirUp = 1; aim = 0.6; spear = null; hooked = null;
    caught = []; t = 0;
    fish = [];
    for (let i = 0; i < 9; i++) spawn();
    say('Hold to charge. Release to throw.', 2.6);
  }
  function say(s, ti) { msg = s; msgT = ti || 2; }
  function spawn() {
    const id = U.pick(table);
    const f = KA.Items.fishById[id];
    const depth = 130 + f.depth * 42 + U.rnd(-16, 16);
    fish.push({ id, f, x: U.rnd(60, KA.W - 60), y: U.clamp(depth, 120, KA.H - 60),
      dir: U.chance(0.5) ? 1 : -1, v: 14 + f.fight * 12, ph: U.rnd(0, 9), hit: 0 });
  }

  function update(dt) {
    t += dt;
    if (msgT > 0) msgT -= dt;
    layout();
    for (const f of fish) {
      f.x += f.v * f.dir * dt;
      if (f.x < 40) f.dir = 1;
      if (f.x > KA.W - 40) f.dir = -1;
      f.y += Math.sin(t * 1.6 + f.ph) * 8 * dt;
    }
    if (phase === 'aim') {
      const v = KA.In.padVec();
      aim = U.clamp(aim + v.y * 1.4 * dt, 0.15, 1.35);
      const hold = KA.In.act('atk', 'Space', 'KeyJ') || KA.In.mouse.down;
      if (hold) {
        power += dirUp * dt * 1.5;
        if (power > 1) { power = 1; dirUp = -1; }
        if (power < 0) { power = 0; dirUp = 1; }
        if (U.chance(dt * 6)) KA.A.play('charge');
      } else if (power > 0.05) {
        throwSpear();
      }
      if (KA.In.mouse.down) {
        // mouse aim: point where you want it
        aim = U.clamp(Math.atan2(KA.In.mouse.y - 96, Math.abs(KA.In.mouse.x - 70) + 20), 0.15, 1.35);
      }
    } else if (phase === 'fly') {
      spear.vy += 260 * dt;
      spear.x += spear.vx * dt; spear.y += spear.vy * dt;
      spear.rot = Math.atan2(spear.vy, spear.vx);
      for (const f of fish) {
        if (U.dist(spear.x, spear.y, f.x, f.y) < 20 + f.f.fight * 3) { strike(f); return; }
      }
      if (spear.y > KA.H - 24 || spear.x > KA.W + 20) {
        phase = 'aim'; power = 0; say('Missed. The fish are laughing.', 1.6); KA.A.play('deny');
      }
    } else if (phase === 'fight') {
      fightUpdate(dt);
    }
    if (KA.In.isPressed('Escape') || KA.In.actPressed('leave')) leave();
  }

  function throwSpear() {
    const tk = S.tackle();
    const sp = (170 + power * 300) * tk.power;
    spear = { x: 74, y: 96, vx: Math.cos(aim) * sp, vy: Math.sin(aim) * sp * 0.7, rot: aim };
    phase = 'fly';
    KA.A.play('spear');
    KA.FX.burst(74, 96, 6, { col: '#cdeeff', speed: 80, dir: aim, spread: 0.5 });
    power = 0;
  }
  function strike(f) {
    hooked = f;
    f.hit = 1;
    phase = 'fight';
    hookPos = 0.5; fishPos = 0.5; prog = 0.28; tension = 0; hookV = 0; fishV = 0;
    KA.A.play('hit');
    KA.FX.hitstop(0.06); KA.FX.shake(5);
    KA.FX.burst(f.x, f.y, 12, { col: [f.f.col, '#fff'], speed: 130 });
    say('HOOKED! Keep the ring on it.', 1.6);
  }
  function fightUpdate(dt) {
    const tk = S.tackle();
    const f = hooked.f;
    // the fish bolts around
    fishV += (Math.sin(t * (3 + f.fight * 1.6)) + U.rnd(-0.6, 0.6)) * f.fight * 2.4 * dt;
    fishV *= Math.pow(0.2, dt);
    fishPos = U.clamp(fishPos + fishV * dt, 0.06, 0.94);
    if (fishPos <= 0.06 || fishPos >= 0.94) fishV *= -0.6;
    // you drag the ring
    const v = KA.In.padVec();
    let push = v.x;
    if (KA.In.act('atk', 'Space', 'KeyJ') || KA.In.mouse.down) {
      push = KA.In.mouse.down && !KA.touch ? (KA.In.mouse.x / KA.W - hookPos) * 3 : push;
    }
    hookV += push * 3.4 * dt;
    hookV *= Math.pow(0.02, dt);
    hookPos = U.clamp(hookPos + hookV * dt, 0.04, 0.96);
    const win = 0.085 * tk.window;
    const on = Math.abs(hookPos - fishPos) < win;
    if (on) {
      prog += dt * 0.36; tension = Math.max(0, tension - dt * 0.5);
      if (U.chance(dt * 8)) KA.A.play('reel');
      KA.FX.part(70 + hookPos * (KA.W - 140), KA.H - 74, { col: '#3fd18b', r: 2, life: 0.3, screen: true });
    } else {
      tension += dt * (0.30 + f.fight * 0.10);
      prog = Math.max(0, prog - dt * 0.09);
    }
    if (prog >= 1) land();
    if (tension >= 1) snap();
  }
  function land() {
    const f = hooked;
    S.addFish(f.id, 1);
    caught.push(f.id);
    KA.A.play('cash');
    KA.FX.text(KA.W / 2, KA.H / 2, f.f.name + '!', P.gold, { size: 30, screen: true, life: 1.4 });
    KA.FX.burst(KA.W / 2, KA.H / 2, 24, { col: [f.f.col, '#fff', P.gold], speed: 200, screen: true, glow: true });
    KA.FX.flash(f.f.col, 0.2);
    fish.splice(fish.indexOf(f), 1);
    spawn();
    hooked = null; phase = 'aim'; power = 0;
    S.save();
  }
  function snap() {
    KA.A.play('error');
    KA.FX.text(KA.W / 2, KA.H / 2, 'IT GOT AWAY', P.coral, { size: 26, screen: true, life: 1.2 });
    hooked.hit = 0;
    hooked = null; phase = 'aim'; power = 0;
  }
  function leave() { KA.Game.go('world', { area: back, x: backX }); }

  const BTNS = [];
  function layout() {
    if (!KA.touch) { KA.In.defineButtons([]); return; }
    BTNS.length = 0;
    BTNS.push({ name: 'atk', x: KA.W - 56, y: KA.H - 56, r: 32, label: phase === 'fight' ? 'PULL' : 'CAST', col: 'rgba(255,201,74,.3)' });
    BTNS.push({ name: 'leave', x: KA.W - 30, y: 96, r: 20, label: 'OUT', col: 'rgba(255,111,116,.3)' });
    KA.In.defineButtons(BTNS);
  }

  function draw(ctx) {
    // water
    D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H,
      [[0, '#7fd8f0'], [0.25, '#2f93c4'], [1, '#062a44']], 'fbg'));
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 7; i++) {
      const x = (i * 130 + Math.sin(t * 0.3 + i) * 24) % (KA.W + 200) - 100;
      D.poly(ctx, [[x, 40], [x + 26, 40], [x + 60, KA.H], [x - 8, KA.H]], '#dff6ff');
    }
    ctx.globalAlpha = 1;
    // surface
    D.path(ctx, () => {
      ctx.moveTo(0, 46);
      for (let x = 0; x <= KA.W; x += 18) ctx.lineTo(x, 40 + Math.sin(x * 0.03 + t * 2) * 4);
      ctx.lineTo(KA.W, 0); ctx.lineTo(0, 0); ctx.closePath();
    }, 'rgba(223,246,255,.35)');
    // seabed
    D.path(ctx, () => {
      ctx.moveTo(0, KA.H);
      for (let x = 0; x <= KA.W; x += 20) ctx.lineTo(x, KA.H - 26 + Math.sin(x * 0.02) * 6);
      ctx.lineTo(KA.W, KA.H); ctx.closePath();
    }, D.vgrad(ctx, 0, KA.H - 40, 0, KA.H, [[0, '#e0cfa0'], [1, '#a89468']], 'fsand'));
    for (let i = 0; i < 6; i++) KA.Rig.sea.prop(ctx, { x: 30 + i * (KA.W / 6), kind: i % 2 ? 'kelp' : 'coral', s: 0.9, ph: i },
      KA.H - 24, { rock: '#4a5a6a' });

    // fish
    for (const f of fish) {
      const sc = 0.95 + f.f.fight * 0.26;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir < 0 ? -1 : 1, 1);
      if (f.hit) ctx.rotate(Math.sin(t * 30) * 0.2);
      KA.Rig.sea.creature(ctx, { kind: 'fish', x: 0, y: 0, s: sc, dir: 1, ph: f.ph, col: f.f.col });
      ctx.restore();
      if (hooked === f) {
        D.circle(ctx, f.x, f.y, 22 + Math.sin(t * 10) * 3, null, { line: '#ffc94a', lineW: 2 });
        D.line(ctx, 74, 96, f.x, f.y, 'rgba(255,255,255,.5)', 1.5);
      }
    }
    // rock ledge for the king to stand on
    D.blob(ctx, [[-10, 150], [16, 116], [72, 108], [104, 124], [96, 156], [10, 168]], '#3c4a5c',
      { tension: 0.45, shadow: 'rgba(0,20,30,.4)', blur: 8, sy: 4 });
    D.blob(ctx, [[6, 132], [30, 118], [70, 116], [88, 128]], 'rgba(255,255,255,.08)', { tension: 0.5 });
    KA.Rig.sea.prop(ctx, { x: 94, kind: 'coral', s: 0.7, ph: 1 }, 116, {});
    // the king on the ledge, spear ready
    const swing = phase === 'fly' ? 1 : (power > 0 ? 0.2 : 0);
    KA.Rig.king.draw(ctx, 60, 120, { scale: 0.95, mode: 'stand', dir: 1, fat: S.D.fat,
      weapon: KA.Items.wById.trident, attack: swing, dt: 1 / 60 });
    // aim guide
    if (phase === 'aim') {
      ctx.globalAlpha = 0.5;
      for (let i = 1; i < 14; i++) {
        const sp = (170 + power * 300) * S.tackle().power;
        const tt = i * 0.045;
        const px = 74 + Math.cos(aim) * sp * tt;
        const py = 96 + Math.sin(aim) * sp * 0.7 * tt + 130 * tt * tt;
        if (py > KA.H) break;
        D.circle(ctx, px, py, 2.4, '#ffffff');
      }
      ctx.globalAlpha = 1;
    }
    if (spear && phase === 'fly') {
      ctx.save(); ctx.translate(spear.x, spear.y); ctx.rotate(spear.rot);
      D.capsule(ctx, -16, 0, 8, 0, 2, 1.4, '#c9a26a');
      D.tri(ctx, [8, -4], [18, 0], [8, 4], '#cfd8e2');
      ctx.restore();
      KA.FX.bubbles(spear.x, spear.y, 1);
    }

    /* ---- hud ---- */
    D.rr(ctx, 8, 8, 190, 30, 8, 'rgba(4,18,29,.7)');
    T.draw(ctx, 'SPEARFISHING', 16, 14, P.cyan, { size: 15, weight: 900 });
    T.draw(ctx, S.tackle().name, 16, 30, P.dim, { size: 10, weight: 700 });
    D.rr(ctx, KA.W - 150, 8, 142, 30, 8, 'rgba(4,18,29,.7)');
    T.draw(ctx, 'CAUGHT ' + caught.length, KA.W - 140, 14, P.gold, { size: 14, weight: 800 });
    T.draw(ctx, 'bag worth ' + U.fmt(S.fishValue()) + 'c', KA.W - 140, 30, P.dim, { size: 10, weight: 700 });

    if (phase === 'aim') {
      // power meter
      const pw = 200, px = KA.W / 2 - pw / 2, py = KA.H - 46;
      D.rr(ctx, px, py, pw, 22, 11, 'rgba(3,16,26,.75)');
      D.rr(ctx, px + 2, py + 2, (pw - 4) * power, 18, 9,
        D.vgrad(ctx, px, 0, px + pw, 0, [[0, '#3fd18b'], [0.6, '#ffc94a'], [1, '#ff6f74']], 'pwr'));
      // the sweet spot
      D.rr(ctx, px + (pw - 4) * 0.76, py, 4, 22, 2, 'rgba(255,255,255,.7)');
      T.draw(ctx, KA.touch ? 'HOLD CAST TO CHARGE' : 'HOLD SPACE / CLICK TO CHARGE  -  W/S AIM',
        KA.W / 2, py - 16, P.text, { size: 12, align: 'center', weight: 800, shadow: true });
    } else if (phase === 'fight') {
      const bw = KA.W - 140, bx = 70, by = KA.H - 84;
      D.rr(ctx, bx, by, bw, 26, 13, 'rgba(3,16,26,.8)');
      // the fish marker
      D.circle(ctx, bx + fishPos * bw, by + 13, 9, hooked.f.col, { shadow: 'rgba(0,0,0,.4)', blur: 4, sy: 2 });
      // your ring
      const win = 0.085 * S.tackle().window;
      D.rr(ctx, bx + (hookPos - win) * bw, by + 1, win * 2 * bw, 24, 12, null,
        { line: Math.abs(hookPos - fishPos) < win ? '#3fd18b' : '#ffffff', lineW: 3 });
      // progress + tension
      KA.UI.bar(ctx, bx, by - 20, bw, 14, prog, { col: P.kelp, label: 'LANDING', ls: 10 });
      KA.UI.bar(ctx, bx, by + 32, bw, 10, tension, { col: tension > 0.7 ? P.coral : P.amber, label: 'LINE TENSION', ls: 8 });
      T.draw(ctx, KA.touch ? 'DRAG THE PAD TO FOLLOW IT' : 'A/D or move the mouse to follow it',
        KA.W / 2, by - 40, P.text, { size: 12, align: 'center', weight: 800, shadow: true });
    }
    if (msgT > 0) {
      ctx.globalAlpha = U.clamp(msgT, 0, 1);
      T.draw(ctx, msg, KA.W / 2, 56, P.gold, { size: 15, align: 'center', weight: 800, shadow: true });
      ctx.globalAlpha = 1;
    }
    if (!KA.touch && KA.UI.button(ctx, KA.W - 100, KA.H - 40, 92, 30, 'LEAVE', { tone: 'dark', size: 14, key: 'Escape' })) leave();
    KA.UI.touchPad(ctx, BTNS);
  }
  return { enter, update, draw };
})();
