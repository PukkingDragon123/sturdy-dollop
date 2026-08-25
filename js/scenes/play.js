/* ============================================================
   scenes/play.js - the game. Camera, world draw, the king, the
   mobs, the HUD, and the keys that open the panels.
   ============================================================ */
KD.Scenes.play = (function () {
  const S = KD.State;
  const BTNS = [];
  let dayT = 0;

  function enter(args) {
    KD.Cam = KD.Cam || { x: 0, y: 0 };
    snapCam();
    KD.UI.guard(0.2);
  }
  function snapCam() {
    const P = KD.Player.P;
    KD.Cam.x = clampCamX(P.x - KD.W / 2);
    KD.Cam.y = clampCamY(P.y - KD.H * 0.58);
  }
  const clampCamX = (v) => Math.max(0, Math.min(KD.World.W * 8 - KD.W, v));
  const clampCamY = (v) => Math.max(0, Math.min(KD.World.H * 8 - KD.H, v));

  function layout() {
    BTNS.length = 0;
    if (!KD.touch) { KD.In.buttons(BTNS); return; }
    const r = 13, x = KD.W - 20, y = KD.H - 22;
    BTNS.push({ name: 'dig',  x: x,      y: y,      r, label: 'DIG' });
    BTNS.push({ name: 'hit',  x: x - 30, y: y,      r, label: 'HIT' });
    BTNS.push({ name: 'jump', x: x,      y: y - 30, r, label: 'UP' });
    BTNS.push({ name: 'use',  x: x - 30, y: y - 30, r, label: 'USE' });
    BTNS.push({ name: 'bag',  x: x - 58, y: y - 30, r: 11, label: 'BAG' });
    BTNS.push({ name: 'make', x: x - 58, y: y,      r: 11, label: 'MAKE' });
    KD.In.buttons(BTNS);
  }

  function update(dt) {
    layout();
    S.tick(dt);
    dayT += dt;

    /* panels: open one and the world pauses around you */
    if (KD.In.isHit('KeyI', 'Tab')) KD.Panels.toggle('bag');
    if (KD.In.isHit('KeyC') || KD.In.actHit('make')) KD.Panels.toggle('craft');
    if (KD.In.isHit('KeyV')) KD.Panels.toggle('tree');
    if (KD.In.actHit('bag')) KD.Panels.toggle('bag');
    if (KD.In.isHit('Escape')) {
      if (KD.Panels.isOpen()) KD.Panels.close();
      else KD.Game.go('pause', {});
    }
    for (let i = 0; i < 8; i++) if (KD.In.isHit('Digit' + (i + 1))) S.S.hot = i;
    if (KD.In.mouse.wheel && !KD.Panels.isOpen()) {
      S.S.hot = (S.S.hot + KD.In.mouse.wheel + 8) % 8;
    }
    if (KD.Panels.isOpen()) { KD.Fx.update(dt); return; }

    KD.Player.update(dt, S);
    KD.Mobs.update(dt, S);
    KD.Mobs.updateShots(dt, S);
    KD.Water.step(2600);
    KD.Light.step();
    KD.Fx.update(dt);

    /* camera: lead the player, snap to whole pixels so nothing shimmers */
    const P = KD.Player.P;
    const tx = clampCamX(P.x + P.vx * 0.16 - KD.W / 2);
    const ty = clampCamY(P.y - P.h / 2 + P.vy * 0.10 - KD.H / 2);
    KD.Cam.x += (tx - KD.Cam.x) * Math.min(1, dt * 7);
    KD.Cam.y += (ty - KD.Cam.y) * Math.min(1, dt * 7);

    if (P.swim > 0.45 && Math.random() < dt * 2.2) KD.Fx.bubbles(P.x, P.y - P.h, 1);
    baronWatch(S);
    /* autosave, quietly */
    if ((S.S.playtime | 0) % 30 === 0 && S.S.playtime - (S.lastSave || 0) > 30) {
      S.lastSave = S.S.playtime; S.save();
    }
  }

  /* The Baron sits in his throne room until you walk in. With fewer than five
     fragments he throws you out instead of fighting - the fragments are the key. */
  function baronWatch(S) {
    const th = KD.Gen.meta.throne;
    if (!th || S.S.flags.baronDead) return;
    const P = KD.Player.P;
    const near = Math.abs(P.x / 8 - th.x) < 26 && Math.abs(P.y / 8 - th.y) < 14;
    if (!near) return;
    if (S.fragCount() < 5) {
      if (!S.S.flags.baronWarned) {
        S.S.flags.baronWarned = 1;
        S.say('"Five pieces, or nothing." ' + S.fragCount() + '/5', 'BLOOD.3');
      }
      return;
    }
    if (!S.S.flags.baronUp) {
      S.S.flags.baronUp = 1;
      KD.Mobs.spawn('baron', th.x, th.y);
      KD.Fx.flash('BLOOD.2', 0.4);
      KD.Fx.shake(6);
      S.say('BARON FOAMHELM STANDS UP', 'BLOOD.3');
      KD.Sfx.play('die');
    }
  }

  /* the water surface and the sky behind everything */
  function backdrop(ctx, cam) {
    const sea = (KD.Gen.meta.sea || 34) * 8;
    const horizon = Math.round(sea - cam.y);
    /* sky */
    if (horizon > 0) {
      KD.Screen.rect(0, 0, KD.W, Math.min(KD.H, horizon), 'DEEP.4');
      /* a dithered band just under the sky, so it is not a flat wall */
      KD.Dither.fill(ctx, 0, Math.max(0, horizon - 10), KD.W, 10, 'WATER.3', 0.5);
    }
    /* the water column, banded by depth with dither seams */
    const bands = [[34, 'WATER.0'], [90, 'DEEP.2'], [150, 'DEEP.1'], [230, 'DEEP.0'], [330, 'ROT.0']];
    for (let i = 0; i < bands.length; i++) {
      const y0 = bands[i][0] * 8 - cam.y;
      const y1 = (i + 1 < bands.length ? bands[i + 1][0] * 8 : KD.World.H * 8) - cam.y;
      if (y1 < 0 || y0 > KD.H) continue;
      const a = Math.max(0, y0), b = Math.min(KD.H, y1);
      KD.Screen.rect(0, a, KD.W, b - a, bands[i][1]);
      if (y0 > 0 && y0 < KD.H) KD.Dither.fill(ctx, 0, y0 - 6, KD.W, 12, bands[i][1], 0.5);
    }
    /* the surface line itself: a hand-drawn 2px chop */
    if (horizon > -4 && horizon < KD.H) {
      for (let x = 0; x < KD.W; x += 2) {
        const bob = Math.round(Math.sin((x + cam.x) * 0.09 + dayT * 1.6) * 1.4);
        KD.Screen.rect(x, horizon + bob, 2, 1, 'WATER.3');
        KD.Screen.rect(x, horizon + bob + 1, 2, 1, 'WATER.2');
      }
    }
  }

  function drawKing(ctx, cam) {
    const P = KD.Player.P;
    let base = 'king_idle';
    if (P.swingT > 0) base = 'king_mine';
    else if (P.mode === 'swim') base = 'king_swim';
    else if (P.mode === 'walk') base = 'king_walk';
    else if (P.mode === 'jump') base = 'king_swim';
    if (!KD.PX.hasAny(base)) base = KD.PX.hasAny('king_idle') ? 'king_idle' : base;
    const name = KD.PX.frameOf(base, P.anim * 0.12);
    const px = Math.round(P.x - cam.x), py = Math.round(P.y - cam.y);
    if (KD.PX.has(name)) {
      KD.PX.blit(ctx, name, px, py, { flipX: P.face < 0 });
      if (P.hurtT > 0) {
        const s = KD.PX.get(name);
        KD.Dither.fill(ctx, px - s.ax, py - s.ay, s.w, s.h, 'BLOOD.3', 0.8);
      }
    } else {
      /* placeholder while the art lands - stepped, not round */
      KD.Screen.rect(px - 5, py - 16, 10, 16, P.hurtT > 0 ? 'BONE.2' : 'KELP.1');
      KD.Screen.frame(px - 5, py - 16, 10, 16, 'INK.0');
      KD.Screen.rect(px - 3, py - 15, 6, 4, 'SKIN.2');
    }
    /* the swing arc, drawn as stepped pixels */
    if (P.swingT > 0) {
      const w = S.weapon();
      const r = (w.reach || 14);
      const f = 1 - P.swingT / 0.22;
      const a = (-0.9 + f * 1.8) * P.face;
      for (let k = 4; k < r; k += 2) {
        KD.Screen.rect(Math.round(px + Math.cos(a) * k * P.face), Math.round(py - 8 + Math.sin(a) * k), 2, 2, 'BONE.2');
      }
    }
  }

  function draw(ctx) {
    const sh = KD.Fx.shakeOffset();
    const cam = { x: Math.round(KD.Cam.x + sh.x), y: Math.round(KD.Cam.y + sh.y) };
    backdrop(ctx, cam);
    KD.Render.draw(ctx, cam);
    const st = S.stats;
    const lightR = 26 + (st.lightRadius || 0) * 10;
    KD.Render.torch(ctx, cam, KD.Player.P.x, KD.Player.P.y - 8, lightR);
    KD.Mobs.draw(ctx, cam);
    drawKing(ctx, cam);
    KD.Fx.draw(ctx, cam);
    KD.Fx.overlay(ctx);
    KD.Hud.draw(S, cam);
    KD.UI.touchPad(BTNS);
    KD.Panels.draw(S);
    KD.UI.tooltips();
    if (!KD.Panels.isOpen() && S.S.playtime < 14) {
      KD.Text.draw(KD.touch ? 'pad to move  -  DIG  -  MAKE  -  BAG'
                            : 'WASD move  -  click to dig  -  F swing  -  E place  -  C craft  -  V skills  -  I bag',
        KD.W / 2, KD.H - 34, 'BONE.0', { tiny: true, align: 'center', shadow: 'INK.0' });
    }
  }
  return { enter, update, draw, snapCam };
})();
