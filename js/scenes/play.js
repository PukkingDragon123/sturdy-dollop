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
    KD.Parallax.seed(30);
    KD.Folk.seed();
    KD.UI.guard(0.2);
  }
  function snapCam() {
    const P = KD.Player.P;
    KD.Cam.x = clampCamX(P.x - KD.W / 2);
    KD.Cam.y = clampCamY(P.y - KD.H * 0.58);
  }
  const clampCamX = (v) => Math.max(0, Math.min(KD.World.W * 8 - KD.W, v));
  const clampCamY = (v) => Math.max(0, Math.min(KD.World.H * 8 - KD.H, v));

  /* MOBILE CONTROLS: two thumbs, no thinking.
     Left thumb: a stick that appears wherever you put it down.
     Right thumb: ONE big ACT button whose job changes to match what is in
     front of you, and one big SWIM/JUMP button. Panels live in three small
     tabs out of the way. Six buttons that all did one thing each was a menu;
     this is a controller. */
  let actMode = 'dig';
  function contextAction(S) {
    const P = KD.Player.P, Wd = KD.World;
    /* an enemy within a swing? then the button is a weapon */
    for (const m of KD.Mobs.list) {
      if (m.dead > 0) continue;
      if (Math.hypot(m.x - P.x, m.y - m.K.h / 2 - (P.y - P.h / 2)) < 34) return 'hit';
    }
    /* standing in a fruit doorway? then the button is the door */
    if (KD.Village.doorAt(P.x, P.y - 4)) return 'door';
    /* something interactive under the reticle? then it is USE */
    const T = KD.Tiles.get(Wd.at(P.tgx, P.tgy));
    if (T && (T.container || T.door || T.station)) return 'use';
    /* holding a placeable and pointing at empty space? then it is PLACE */
    const held = S.hotbarItem();
    if (held && held.tile && Wd.at(P.tgx, P.tgy) === KD.Tiles.AIR) return 'use';
    return 'dig';
  }
  const ACT_LABEL = { dig: 'DIG', hit: 'HIT', use: 'USE', door: 'ENTER' };
  const ACT_ICON = { dig: 'ic_pick', hit: 'ic_sword', use: 'ic_check', door: 'ic_check' };

  function layout(S) {
    BTNS.length = 0;
    if (!KD.touch) { KD.In.buttons(BTNS); return; }
    actMode = contextAction(S);
    const R = 22, r = 16;
    const bx = KD.W - R - 12, by = KD.H - R - 12;
    /* the two big ones, under the right thumb */
    /* ENTER is a USE under the hood, so the door and the chest share one
       button rather than two that do almost the same thing */
    const actName = actMode === 'door' ? 'use' : actMode;
    BTNS.push({ name: actName, x: bx, y: by, r: R, label: ACT_LABEL[actMode], icon: ACT_ICON[actMode], big: true });
    BTNS.push({ name: 'jump', x: bx - R - r - 6, y: by - 6, r, label: 'UP', icon: 'ic_arrow_up' });
    /* three small tabs, top right, out of the way of the action */
    const tx = KD.W - 16;
    BTNS.push({ name: 'bag',  x: tx, y: 46, r: 11, label: 'BAG',  icon: 'ic_bag',  tab: true });
    BTNS.push({ name: 'make', x: tx, y: 70, r: 11, label: 'MAKE', icon: 'ic_anvil', tab: true });
    BTNS.push({ name: 'tree', x: tx, y: 94, r: 11, label: 'SKL',  icon: 'ic_tree', tab: true });
    KD.In.buttons(BTNS);
  }

  function update(dt) {
    layout(S);
    S.tick(dt);
    dayT += dt;

    /* panels: open one and the world pauses around you */
    if (KD.In.isHit('KeyI', 'Tab')) KD.Panels.toggle('bag');
    if (KD.In.isHit('KeyC') || KD.In.actHit('make')) KD.Panels.toggle('craft');
    if (KD.In.isHit('KeyV')) KD.Panels.toggle('tree');
    if (KD.In.actHit('bag')) KD.Panels.toggle('bag');
    if (KD.In.actHit('tree')) KD.Panels.toggle('tree');
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
    KD.Boss.update(dt, S);
    KD.Mobs.update(dt, S);
    KD.Mobs.updateShots(dt, S);
    KD.Water.step(2600);
    KD.Light.step();
    KD.Fx.update(dt);
    KD.Parallax.tick(dt);
    KD.Folk.update(dt, S);

    /* camera: lead the player, snap to whole pixels so nothing shimmers */
    const P = KD.Player.P;
    const tx = clampCamX(P.x + P.vx * 0.16 - KD.W / 2);
    const ty = clampCamY(P.y - P.h / 2 + P.vy * 0.10 - KD.H / 2);
    KD.Cam.x += (tx - KD.Cam.x) * Math.min(1, dt * 7);
    KD.Cam.y += (ty - KD.Cam.y) * Math.min(1, dt * 7);

    if (P.swim > 0.45 && Math.random() < dt * 2.2) KD.Fx.bubbles(P.x, P.y - P.h, 1);
    bossWatch(S);
    /* autosave, quietly */
    if ((S.S.playtime | 0) % 30 === 0 && S.S.playtime - (S.lastSave || 0) > 30) {
      S.lastSave = S.S.playtime; S.save();
    }
  }

  /* The King is sitting in there the whole time. Walk in out of shape and he
     does not even stand up - the weight gate is the lock on the last door. */
  function bossWatch(S) {
    const th = KD.Gen.meta.throne;
    if (!th || S.S.flags.kingDead || KD.Boss.active()) return;
    const P = KD.Player.P;
    if (Math.abs(P.x / 8 - th.x) > 30 || Math.abs(P.y / 8 - th.y) > 16) return;
    const m = KD.Goal.milestone('drop');
    const short = KD.Goal.why(S.S, 'drop');
    if (short) {
      if (KD.Game.t - (S.S.flags.kingWarnT || -99) > 5) {
        S.S.flags.kingWarnT = KD.Game.t;
        S.say('"Look at you." He does not get up. ' + short + '.', 'ROT.3');
        KD.Sfx.play('deny');
      }
      return;
    }
    S.S.flags.kingUp = 1;
    KD.Boss.start(th.x, th.y);
    S.say('"Oh. You actually did it."', 'ROT.3');
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
    KD.Parallax.back(ctx, cam, dayT);
    KD.Render.draw(ctx, cam);
    /* the fruit skins sit on top of the tiles they were carved from, so a
       house can lean over the street and still be walked in front of */
    KD.Village.draw(ctx, cam);
    KD.Parallax.surface(ctx, cam, dayT);
    const st = S.stats;
    const lightR = 26 + (st.lightRadius || 0) * 10;
    KD.Render.torch(ctx, cam, KD.Player.P.x, KD.Player.P.y - 8, lightR);
    KD.Folk.draw(ctx, cam);
    KD.Mobs.draw(ctx, cam);
    KD.Boss.draw(ctx, cam);
    drawKing(ctx, cam);
    KD.Fx.draw(ctx, cam);
    KD.Parallax.front(ctx, cam, dayT);
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
