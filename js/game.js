/* ============================================================
   game.js - boot, the scene manager and the frame loop.
   ============================================================ */
KD.Game = (function () {
  let cur = null, curName = '', next = null, nextArgs = null;
  let last = 0, acc = 0, t = 0, fps = 60, fpsT = 0, frames = 0;

  function go(name, args) {
    if (!KD.Scenes[name]) { console.error('no scene ' + name); return; }
    next = name; nextArgs = args || {};
  }
  function swap() {
    if (!next) return;
    if (cur && cur.exit) cur.exit();
    cur = KD.Scenes[next];
    curName = next;
    next = null;
    KD.Fx.reset();
    KD.UI.guard(0.18);
    if (cur.enter) cur.enter(nextArgs);
  }
  /* the crown coming back gets a cutscene; its `after` lands on victory */
  const win = () => { if (!KD.Cine || !KD.Cine.play('win')) go('victory', {}); };

  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;                 // a tab that was hidden must not teleport anyone
    t += dt;
    frames++; fpsT += dt;
    if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
    swap();
    /* The click guard must tick in the LOOP, not per scene. Leaving it to each
       scene meant the title screen armed it and never counted it down, so the
       mouse and every touch were dead on the first screen of the game. */
    KD.UI.tickGuard(dt);
    KD.Juice.tick(dt);
    /* Hit stop. A solid landing or a solid hit holds the world for a few
       frames - the UI timers above already ran on real time, so menus and
       pops stay responsive while the game itself hesitates. */
    let sdt = KD.Juice.scale(dt);
    /* A cutscene is a LAYER over whatever scene is running, not a scene of
       its own - see scenes/cine.js. It ticks BEFORE the scene so it can take
       the advance key out of the frame before the scene reads it, and draws
       AFTER so its letterbox and its words land on top of the live world.
       A beat asking for `slow` slows the world down; it never stops it,
       because the whole point is that you can still move. */
    if (KD.Cut.active) sdt *= KD.Cut.timeScale();
    try {
      KD.Cut.update(dt);
      if (cur && cur.update) cur.update(sdt);
      const ctx = KD.Screen.ctx();
      if (cur && cur.draw) cur.draw(ctx);
      KD.Cut.draw(ctx);
    } catch (e) {
      /* draw the error instead of a white screen: a black screen tells you nothing */
      const ctx = KD.Screen.ctx();
      KD.Screen.clear('BLOOD.0');
      KD.Text.draw('CRASH in ' + curName, 4, 4, 'BLOOD.3');
      KD.Text.block(String(e && e.message ? e.message : e), 4, 16, 'BONE.2', { max: KD.W - 8, tiny: true, maxLines: 8 });
      throw e;
    }
    KD.Screen.present();
    KD.In.endFrame();
  }

  function boot() {
    const canvas = document.getElementById('game');
    KD.Screen.attach(canvas);
    KD.In.attach(canvas);
    /* compile every hand-drawn sprite exactly once */
    for (const k in KD.art) if (KD.art[k] && KD.art[k].build) KD.art[k].build();
    const info = KD.PX.build();
    KD.State.buildResources();
    KD.State.recalc();
    KD.Water.init();
    window.addEventListener('resize', () => { KD.Screen.fit(); KD.Render.flush(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { KD.Screen.fit(); KD.Render.flush(); }, 120));
    /* first input unlocks audio on every browser that needs it */
    const unlock = () => { KD.Sfx.resume(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    const boot = document.getElementById('boot');
    if (boot) boot.remove();
    console.log('crowndeep: ' + info.sprites + ' sprites packed into ' + info.w + 'x' + info.h);
    go('title', {});
    requestAnimationFrame(frame);
  }
  return { boot, go, win, get scene() { return curName; }, get t() { return t; }, get fps() { return fps; } };
})();
window.addEventListener('load', () => KD.Game.boot());
