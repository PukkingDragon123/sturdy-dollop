/* ============================================================
   game.js - boot, scene manager, main loop, global HUD.
   ============================================================ */
DZ.Scenes = DZ.Scenes || {};

DZ.Game = (function () {
  const U = DZ.Util;
  let canvas, ctx, scale = 3, ox = 0, oy = 0;
  let cur = null, curName = '', trans = 0, transTo = null, transArgs = null;
  let last = 0, acc = 0, fps = 0, fpsT = 0, frames = 0;
  let paused = false;
  let debug = false;

  function fit() {
    const pad = 26;
    const sw = window.innerWidth - pad, sh = window.innerHeight - pad * 2;
    scale = Math.max(1, Math.min(Math.floor(sw / DZ.W), Math.floor(sh / DZ.H)));
    canvas.style.width = (DZ.W * scale) + 'px';
    canvas.style.height = (DZ.H * scale) + 'px';
    const r = canvas.getBoundingClientRect();
    ox = r.left; oy = r.top;
    DZ.Input.setTransform(scale, ox, oy);
  }

  function go(name, args) {
    if (transTo) return;
    transTo = name; transArgs = args || {}; trans = 0.001;
  }
  function swap(name, args) {
    if (cur && cur.exit) cur.exit();
    cur = DZ.Scenes[name];
    curName = name;
    DZ.FX.reset();
    DZ.UI.guard(0.16);
    if (cur && cur.enter) cur.enter(args || {});
  }

  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    DZ.Input.attach(canvas);
    window.addEventListener('resize', fit);
    fit();
    const b = document.getElementById('boot');
    if (b) b.remove();
    DZ.State.init();
    swap('title', {});
    last = performance.now();
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (paused) DZ.State.save();
    });
    window.addEventListener('beforeunload', () => DZ.State.save());
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    let dt = (ts - last) / 1000;
    last = ts;
    if (paused) return;
    dt = U.clamp(dt, 0, 1 / 20);
    frames++; fpsT += dt;
    if (fpsT > 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }

    // global keys
    if (DZ.Input.isPressed('KeyM')) {
      const m = DZ.Audio.toggleMute();
      DZ.State.toast(m ? 'Muted' : 'Sound on', DZ.PAL.dim);
    }
    if (DZ.Input.isPressed('F3')) debug = !debug;
    DZ.Audio.tick(dt);
    DZ.State.updateToasts(dt);
    DZ.UI.begin(dt);

    const gdt = DZ.FX.frozen() ? 0 : dt * DZ.FX.scale();
    if (trans > 0) {
      trans += dt;
      if (trans > 0.17 && transTo) { swap(transTo, transArgs); transTo = null; }
      if (trans > 0.36) trans = 0;
    }
    if (cur && cur.update) cur.update(gdt, dt);
    DZ.FX.update(dt);

    // ---- draw ----
    ctx.imageSmoothingEnabled = false;
    if (cur && cur.draw) cur.draw(ctx, dt);
    else { DZ.Pixel.rect(ctx, 0, 0, DZ.W, DZ.H, '#062033'); }
    DZ.FX.drawScreen(ctx);
    DZ.State.drawToasts(ctx);
    DZ.UI.end(ctx);
    if (trans > 0) drawTrans(ctx);
    if (debug) {
      DZ.Text.draw(ctx, fps + 'fps p' + DZ.FX.count() + ' ' + curName, 2, DZ.H - 9, '#7ff0ff', { size: 7 });
    }
    DZ.Input.endFrame();
  }

  /* a chunky underwater wipe */
  function drawTrans(ctx) {
    const t = trans < 0.18 ? trans / 0.18 : 1 - (trans - 0.18) / 0.18;
    const f = U.clamp(t, 0, 1);
    const bands = 9, bh = Math.ceil(DZ.H / bands);
    for (let i = 0; i < bands; i++) {
      const w = Math.round(DZ.W * U.clamp(f * 1.25 - (i % 3) * 0.12, 0, 1));
      const flip = i % 2 === 0;
      DZ.Pixel.rect(ctx, flip ? 0 : DZ.W - w, i * bh, w, bh, i % 2 ? '#04121f' : '#072335');
    }
  }

  /* ---------------- shared chrome ---------------- */
  function topbar(ctx, opts) {
    opts = opts || {};
    const S = DZ.State.S;
    DZ.Pixel.rect(ctx, 0, 0, DZ.W, 13, '#041826');
    DZ.Pixel.rect(ctx, 0, 13, DZ.W, 1, DZ.PAL.line);
    DZ.Text.draw(ctx, 'DAY ' + S.day, 4, 3, DZ.PAL.cyan, { size: 8, bold: true });
    DZ.Pixel.draw(ctx, 'coin', 52, 4, {});
    DZ.Text.draw(ctx, U.fmt(S.clams), 60, 3, DZ.PAL.gold, { size: 8 });
    const fc = DZ.State.fishTotal();
    DZ.Pixel.draw(ctx, 'fish_s', 108, 5, { recolor: { '1': '#8fd8ff', '2': '#3f7f9f', '3': '#fff' } });
    DZ.Text.draw(ctx, fc + '/' + DZ.Items.gearTier('bag', S.gear.bag).cap, 118, 3, fc >= DZ.Items.gearTier('bag', S.gear.bag).cap ? DZ.PAL.coral : DZ.PAL.text, { size: 8 });
    if (opts.title) DZ.Text.draw(ctx, opts.title, DZ.W / 2 + 30, 3, DZ.PAL.text, { size: 8, align: 'center', bold: true });
    // mute + back
    if (DZ.UI.button(ctx, DZ.W - 15, 1, 13, 11, DZ.Audio.isMuted() ? 'x' : '~', { tone: 'dark', size: 7, tip: 'Mute (M)' })) DZ.Audio.toggleMute();
    if (opts.back !== false && DZ.UI.button(ctx, DZ.W - 46, 1, 29, 11, 'BACK', { tone: 'dark', size: 7, key: 'Escape' })) go(opts.back || 'ranch');
    return 14;
  }

  return { boot, go, topbar, get scene() { return curName; }, get fps() { return fps; } };
})();

window.addEventListener('load', () => {
  try { DZ.Game.boot(); }
  catch (e) {
    const b = document.getElementById('boot');
    if (b) b.textContent = 'CRASH: ' + e.message;
    console.error(e);
  }
});
