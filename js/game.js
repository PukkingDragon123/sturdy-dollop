/* ============================================================
   game.js - boot, responsive canvas, scene manager, main loop,
   shared HUD.
   ============================================================ */
KA.Game = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL;
  let canvas, ctx, scale = 1, ox = 0, oy = 0;
  let cur = null, curName = '', trans = 0, transTo = null, transArgs = null;
  let last = 0, fps = 0, frames = 0, fpsT = 0, paused = false, debug = false;

  function fit() {
    const winW = window.innerWidth, winH = window.innerHeight;
    const aspect = winW / winH;
    KA.H = 360;
    KA.W = U.clamp(Math.round(KA.H * aspect), 460, 980);
    KA.DPR = Math.min(2.5, window.devicePixelRatio || 1);
    scale = Math.min(winW / KA.W, winH / KA.H);
    canvas.style.width = Math.round(KA.W * scale) + 'px';
    canvas.style.height = Math.round(KA.H * scale) + 'px';
    canvas.width = Math.round(KA.W * scale * KA.DPR);
    canvas.height = Math.round(KA.H * scale * KA.DPR);
    const r = canvas.getBoundingClientRect();
    ox = r.left; oy = r.top;
    KA.In.setTransform(scale, ox, oy);
  }

  function go(name, args) { if (transTo) return; transTo = name; transArgs = args || {}; trans = 0.001; }
  function swap(name, args) {
    if (cur && cur.exit) cur.exit();
    cur = KA.Scenes[name];
    curName = name;
    KA.FX.reset();
    KA.UI.guard(0.18);
    if (cur && cur.enter) cur.enter(args || {});
  }

  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d', { alpha: false });
    KA.In.attach(canvas);
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 120));
    fit();
    const b = document.getElementById('boot');
    if (b) b.remove();
    KA.S.init();
    swap('title', {});
    last = performance.now();
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { paused = document.hidden; if (paused) KA.S.save(); });
    window.addEventListener('beforeunload', () => KA.S.save());
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    let dt = (ts - last) / 1000;
    last = ts;
    if (paused) return;
    dt = U.clamp(dt, 0, 1 / 20);
    frames++; fpsT += dt;
    if (fpsT > 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }

    if (KA.In.isPressed('F1')) KA.UI.toast(KA.A.toggleMute() ? 'Muted' : 'Sound on', P.dim);
    if (KA.In.isPressed('F3')) debug = !debug;
    KA.A.tick(dt);
    KA.UI.updateToasts(dt);
    KA.UI.begin(dt);
    KA.Rig.pet.dt = dt;
    KA.Rig.sea.tick(dt);
    KA.S.tickBeer(dt);

    const gdt = KA.FX.frozen() ? 0 : dt;
    if (trans > 0) {
      trans += dt;
      if (trans > 0.16 && transTo) { swap(transTo, transArgs); transTo = null; }
      if (trans > 0.34) trans = 0;
    }
    if (cur && cur.update) cur.update(gdt, dt);
    KA.FX.update(dt);

    ctx.setTransform(scale * KA.DPR, 0, 0, scale * KA.DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (cur && cur.draw) cur.draw(ctx, dt);
    else D.rect(ctx, 0, 0, KA.W, KA.H, '#04121d');
    if (KA.touch && window.innerWidth < window.innerHeight * 1.05) rotateNag(ctx);
    KA.FX.drawScreen(ctx);
    KA.UI.end(ctx);
    if (trans > 0) drawTrans(ctx);
    if (debug) T.draw(ctx, fps + 'fps ' + curName + ' p' + KA.FX.count() + ' ' + KA.W + 'x' + KA.H,
      4, KA.H - 14, '#7fe8ff', { size: 11 });
    KA.In.endFrame();
  }

  function drawTrans(ctx) {
    const t = trans < 0.17 ? trans / 0.17 : 1 - (trans - 0.17) / 0.17;
    const f = U.clamp(t, 0, 1);
    ctx.globalAlpha = f;
    D.rect(ctx, 0, 0, KA.W, KA.H, '#04121d');
    ctx.globalAlpha = 1;
    if (f > 0.1) {
      for (let i = 0; i < 10; i++) {
        const r = 12 + i * 9;
        D.circle(ctx, KA.W / 2, KA.H / 2, r * f * 3, D.alpha('#7fe8ff', 0.04 * f));
      }
    }
  }

  /* phones get a nudge: this is a landscape game */
  let nagT = 0;
  function rotateNag(ctx) {
    nagT += 0.016;
    D.rect(ctx, 0, 0, KA.W, KA.H, 'rgba(4,18,29,.88)');
    const cx = KA.W / 2, cy = KA.H / 2 - 20;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(nagT * 2) * 0.5 - 0.5);
    D.rr(ctx, -26, -44, 52, 88, 8, '#0f3247', { line: '#7fe8ff', lineW: 3 });
    D.rr(ctx, -18, -34, 36, 62, 4, '#1d6d94');
    ctx.restore();
    T.draw(ctx, 'TURN YOUR PHONE', cx, cy + 62, '#7fe8ff', { size: 20, align: 'center', weight: 900 });
    T.draw(ctx, 'the Atlantic is wider than it is tall', cx, cy + 90, '#9dc4d6',
      { size: 13, align: 'center', weight: 600 });
  }

  /* ---------------- shared HUD ---------------- */
  function hud(ctx, o) {
    o = o || {};
    const S = KA.S.D;
    D.rr(ctx, 6, 6, 128, 44, 10, 'rgba(4,18,29,.72)');
    // hearts
    const max = KA.S.hpMax();
    for (let i = 0; i < max; i++) {
      const hx = 16 + i * 15, hy = 16, full = i < S.hp;
      heart(ctx, hx, hy, 6, full ? '#ff5f6f' : 'rgba(255,255,255,.16)');
    }
    // clams
    D.circle(ctx, 18, 36, 6, '#f6d7e8');
    D.circle(ctx, 18, 36, 3.4, '#ffb0d0');
    T.draw(ctx, U.fmt(S.clams), 28, 29, P.gold, { size: 14, weight: 800 });
    // fat meter
    KA.UI.bar(ctx, 74, 32, 54, 9, S.fat / 100, { col: S.fat > 70 ? P.coral : P.beer, label: 'FAT', ls: 8 });
    // beer buff
    if (S.beer) {
      D.rr(ctx, 140, 6, 92, 20, 8, 'rgba(4,18,29,.72)');
      KA.UI.bar(ctx, 144, 10, 84, 12, U.clamp(S.beer.t / 60, 0, 1),
        { col: S.beer.col, label: '+' + Math.round(S.beer.dmg * 100) + '% DMG', ls: 9 });
    }
    // crown fragments
    const fc = KA.S.fragCount();
    D.rr(ctx, KA.W - 96, 6, 90, 22, 10, 'rgba(4,18,29,.72)');
    for (let i = 0; i < 5; i++) {
      const cx = KA.W - 84 + i * 16;
      D.poly(ctx, [[cx - 6, 20], [cx + 6, 20], [cx + 6, 13], [cx + 3, 16], [cx, 10], [cx - 3, 16], [cx - 6, 13]],
        i < fc ? '#ffd24a' : 'rgba(255,255,255,.14)');
    }
    if (o.place) T.draw(ctx, o.place, KA.W / 2, 10, P.text, { size: 15, align: 'center', weight: 800, shadow: true });
  }
  function heart(ctx, x, y, r, col) {
    D.path(ctx, () => {
      ctx.moveTo(x, y + r * 0.9);
      ctx.bezierCurveTo(x - r * 1.4, y - r * 0.3, x - r * 0.5, y - r * 1.1, x, y - r * 0.25);
      ctx.bezierCurveTo(x + r * 0.5, y - r * 1.1, x + r * 1.4, y - r * 0.3, x, y + r * 0.9);
      ctx.closePath();
    }, col);
  }

  return { boot, go, hud, heart, get scene() { return curName; }, get fps() { return fps; } };
})();

window.addEventListener('load', () => {
  try { KA.Game.boot(); }
  catch (e) {
    const b = document.getElementById('boot');
    if (b) b.textContent = 'CRASH: ' + e.message;
    console.error(e);
  }
});
