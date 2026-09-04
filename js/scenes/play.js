/* ============================================================
   scenes/play.js - the game. Camera, world draw, the king, the
   mobs, the HUD, and the keys that open the panels.
   ============================================================ */
KD.Scenes.play = (function () {
  const S = KD.State;
  const BTNS = [];
  let dayT = 0;

  /* ---- THE LENS ---------------------------------------------------
     The ocean is drawn through a 2x lens: into a buffer half the frame's
     size, then blitted back over it. See px/screen.js for why. The
     numbers that follow from it:

       - the world viewport is vw() x vh(), not KD.W x KD.H, so the
         camera clamp and every "is it on screen" test uses those.
       - a tap or a mouse position is in FRAME pixels and has to be
         divided by Z before it means anything in the world.

     Z is on KD.Cam so sim code can reach it - player.js aims the dig
     cursor and needs the same division.
     ---------------------------------------------------------------- */
  const Z = 2;
  const vw = () => Math.ceil(KD.W / Z), vh = () => Math.ceil(KD.H / Z);

  function enter(args) {
    KD.Cam = KD.Cam || { x: 0, y: 0 };
    KD.Cam.z = Z;
    snapCam();
    KD.Parallax.seed();
    KD.Santa.place();
    KD.Folk.seed();
    KD.UI.guard(0.2);
  }
  function snapCam() {
    const P = KD.Player.P;
    KD.Cam.z = Z;
    cvx = 0; cvy = 0;
    KD.Cam.x = clampCamX(P.x - vw() / 2);
    KD.Cam.y = clampCamY(P.y - vh() * 0.58);
  }
  const clampCamX = (v) => Math.max(0, Math.min(KD.World.W * 8 - vw(), v));
  const clampCamY = (v) => Math.max(0, Math.min(KD.World.H * 8 - vh(), v));

  /* MOBILE CONTROLS: two thumbs, no thinking.
     Left thumb: a stick that appears wherever you put it down.
     Right thumb: ONE big ACT button whose job changes to match what is in
     front of you, and one big SWIM/JUMP button. Panels live in three small
     tabs out of the way. Six buttons that all did one thing each was a menu;
     this is a controller. */
  let actMode = 'dig';
  /* ---- tap to walk, and tap to talk -------------------------------
     On touch the world tap is free: player.js only digs on mouse.down when
     KD.touch is false, and digging on a phone goes through the DIG button.
     So a tap on the world means "go there", and a tap on a villager, a door
     or Santa means "go there and do the obvious thing when you arrive".
     ----------------------------------------------------------------- */
  function tapWalk(S, cam) {
    if (!KD.touch) return;
    if (!KD.In.mouse.click || KD.UI.blocked() || KD.Panels.isOpen()) return;
    const wx = cam.x + KD.In.mouse.x / Z, wy = cam.y + KD.In.mouse.y / Z;
    KD.In.consumedClick();
    /* Santa first: he is the one who moves you around the map */
    if (KD.Santa && Math.abs(KD.Santa.x - wx) < 28 && Math.abs(KD.Santa.y - wy) < 44) {
      KD.Player.walkTo(KD.Santa.x + (KD.Santa.x > KD.Player.P.x ? -18 : 18), null);
      return;
    }
    /* a villager */
    if (KD.Folk && KD.Folk.list) {
      for (const f of KD.Folk.list) {
        if (Math.abs(f.x - wx) < 22 && Math.abs(f.y - wy) < 40) {
          KD.Player.walkTo(f.x + (f.x > KD.Player.P.x ? -16 : 16), null);
          return;
        }
      }
    }
    /* a doorway */
    const d = KD.Village.doorAt(wx, wy);
    if (d) {
      KD.Player.walkTo(wx, () => KD.Player.tryEnter(S));
      return;
    }
    KD.Player.walkTo(wx, null);
  }

  /* the nearest live thing that wants to bite you, and how far off it is */
  function threat() {
    const P = KD.Player.P;
    let best = null, bd = 150;
    for (const m of KD.Mobs.list) {
      if (m.dead > 0) continue;
      const d = Math.hypot(m.x - P.x, m.y - m.K.h / 2 - (P.y - P.h / 2));
      if (d < bd) { bd = d; best = m; }
    }
    return best ? { m: best, d: bd } : null;
  }

  function contextAction(S) {
    const P = KD.Player.P, Wd = KD.World;
    /* Something hunting you? Then the button is a weapon - and it notices at
       150px rather than 34, so the button is already there when the thing
       comes at you instead of appearing the frame it reaches your face. */
    if (threat()) return 'hit';
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
  const ACT_LABEL = { dig: 'DIG', hit: 'STRIKE', use: 'USE', door: 'ENTER' };
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
    /* the strike button is bigger than the others, because it is the one
       you need to find in a hurry */
    BTNS.push({ name: actName, x: bx, y: by, r: actMode === 'hit' ? R + 4 : R,
                label: ACT_LABEL[actMode], icon: ACT_ICON[actMode], big: true });
    BTNS.push({ name: 'jump', x: bx - R - r - 6, y: by - 6, r, label: 'UP', icon: 'ic_arrow_up' });
    /* three small tabs, top right, out of the way of the action */
    const tx = KD.W - 16;
    BTNS.push({ name: 'bag',  x: tx, y: 46, r: 11, label: 'BAG',  icon: 'ic_bag',  tab: true });
    BTNS.push({ name: 'make', x: tx, y: 70, r: 11, label: 'BODY', icon: 'ic_heart_full', tab: true });
    BTNS.push({ name: 'tree', x: tx, y: 94, r: 11, label: 'SKL',  icon: 'ic_tree', tab: true });
    BTNS.push({ name: 'quest', x: tx, y: 118, r: 11, label: 'TASK', icon: 'ic_star', tab: true });
    if (KD.Santa.near()) BTNS.push({ name: 'ride', x: tx, y: 142, r: 11, label: 'RIDE', icon: 'ic_map', tab: true });
    KD.In.buttons(BTNS);
  }

  /* First time east of the Sea Gate, the turtle has something to say. */
  function gateWatch() {
    if (KD.Cine.seen('gate')) return;
    const tx = (KD.Player.P.x / 8) | 0;
    if (tx <= KD.Zones.byId.gate.x1) return;
    KD.Cine.play('gate');
  }

  function update(dt) {
    layout(S);
    S.tick(dt);
    dayT += dt;

    /* A cutscene runs OVER the ocean now. He keeps swimming; he does not
       open his bag, pause the game, dig a hole or ride the manta in the
       middle of somebody's speech. */
    if (KD.Cut.active) {
      tapWalk(S, { x: KD.Cam.x, y: KD.Cam.y });
      KD.Player.update(dt, S);
      KD.Boss.update(dt, S);
      KD.Mobs.update(dt, S);
      KD.Mobs.updateShots(dt, S);
      KD.Water.step(2600);
      KD.Light.step();
      KD.Fx.update(dt);
      KD.Parallax.tick(dt);
      KD.Folk.update(dt, S);
      KD.Belly.update(dt, S);
      KD.Santa.update(dt, S);
      camera(dt);
      return;
    }

    /* panels: open one and the world pauses around you */
    if (KD.In.isHit('KeyI', 'Tab')) KD.Panels.toggle('bag');
    if (KD.In.isHit('KeyC') || KD.In.actHit('make')) KD.Panels.toggle('body');
    if (KD.In.isHit('KeyV')) KD.Panels.toggle('tree');
    if (KD.In.isHit('KeyQ') || KD.In.actHit('quest')) KD.Panels.toggle('quest');
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

    tapWalk(S, { x: KD.Cam.x, y: KD.Cam.y });
    KD.Player.update(dt, S);
    KD.Boss.update(dt, S);
    KD.Mobs.update(dt, S);
    KD.Mobs.updateShots(dt, S);
    KD.Water.step(2600);
    KD.Light.step();
    KD.Fx.update(dt);
    KD.Parallax.tick(dt);
    KD.Folk.update(dt, S);
    KD.Belly.update(dt, S);
    KD.Santa.update(dt, S);
    gateWatch();

    camera(dt);
    const P = KD.Player.P;
    if (P.swim > 0.45 && Math.random() < dt * 2.2) KD.Fx.bubbles(P.x, P.y - P.h, 1);
    bossWatch(S);
    /* autosave, quietly */
    if ((S.S.playtime | 0) % 30 === 0 && S.S.playtime - (S.lastSave || 0) > 30) {
      S.lastSave = S.S.playtime; S.save();
    }
  }

  /* camera: lead the player, snap to whole pixels so nothing shimmers. A
     `pan` beat in a cutscene takes the camera off him for as long as it is
     running, and hands it straight back. */
  /* A SPRING, not a lerp. A lerp toward the player is dead weight - it
     always trails and never arrives - and the whole ask for this pass was
     that the ocean feel bouncy. Stiffness 140 with damping 15 is a ratio
     of about 0.63, so a hard change of direction overshoots by a few
     pixels and settles, and the water gets some mass behind it. */
  let cvx = 0, cvy = 0;
  const CAM_K = 140, CAM_C = 15;
  function camera(dt) {
    if (KD.Cut.holdsCam()) return;
    const P = KD.Player.P;
    /* Lead him harder than before. Through the lens the viewport is half
       as wide in world pixels, so the same 0.16s of look-ahead showed half
       as much of what he was swimming into. */
    const tx = clampCamX(P.x + P.vx * 0.30 - vw() / 2);
    const ty = clampCamY(P.y - P.h / 2 + P.vy * 0.20 - vh() / 2);
    /* integrated in small steps so a dropped frame cannot make it explode */
    let left = Math.min(0.1, dt);
    while (left > 0) {
      const h = Math.min(1 / 120, left);
      left -= h;
      cvx += ((tx - KD.Cam.x) * CAM_K - cvx * CAM_C) * h;
      cvy += ((ty - KD.Cam.y) * CAM_K - cvy * CAM_C) * h;
      KD.Cam.x += cvx * h;
      KD.Cam.y += cvy * h;
    }
    /* Kill the velocity at the edges of the world. Left to run, the spring
       kept winding up against the clamp and let go the moment he turned
       round, which is a whip-pan, not a bounce. */
    const cx2 = clampCamX(KD.Cam.x), cy2 = clampCamY(KD.Cam.y);
    if (cx2 !== KD.Cam.x) { KD.Cam.x = cx2; cvx = 0; }
    if (cy2 !== KD.Cam.y) { KD.Cam.y = cy2; cvy = 0; }
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
    /* the cutscene plays over the arena, then hands straight back to play
       with the fight already running */
    if (!KD.Cine.play('throne')) S.say('"Oh. You actually did it."', 'ROT.3');
  }

  function drawKing(ctx, cam) {
    const P = KD.Player.P;
    /* pk_* is the 24x36 king; king_* was the old 12x18 one */
    const NEW = KD.PX.hasAny('pk_idle');
    const pre = NEW ? 'pk_' : 'king_';
    let base = pre + 'idle';
    if (P.swingT > 0) base = pre + 'mine';
    else if (P.mode === 'swim') base = pre + 'swim';
    else if (P.mode === 'walk') base = pre + 'walk';
    else if (P.mode === 'jump') base = pre + 'swim';
    if (P.hurtT > 0.12 && KD.PX.has(pre + 'hurt')) base = pre + 'hurt';
    if (!KD.PX.hasAny(base) && !KD.PX.has(base)) base = pre + 'idle';
    /* the swim cycle runs off how hard he is actually kicking, so a glide
       coasts on one frame and a burst thrashes */
    const rate = P.mode === 'swim'
      ? 0.10 + Math.min(0.22, Math.hypot(P.vx, P.vy) / 420) + ((P.kicking || 0) > 0 ? 0.16 : 0)
      : 0.12;
    const name = KD.PX.hasAny(base) ? KD.PX.frameOf(base, P.anim * rate) : base;
    const px = Math.round(P.x - cam.x), py = Math.round(P.y - cam.y);
    if (KD.PX.has(name)) {
      /* squash on landing, stretch on the way up. Anchored at the feet, so
         he compresses into the floor rather than sinking through it. */
      const amt = (P.squash || 0) - (P.stretch || 0);
      if (Math.abs(amt) > 0.01) {
        const s0 = KD.PX.get(name);
        const q = KD.Juice.squash(amt, s0.w, s0.h);
        KD.PX.blit(ctx, name, px - (q.dw >> 1), py - q.dh,
          { anchor: false, flipX: P.face < 0, dw: q.dw, dh: q.dh });
      } else {
        KD.PX.blit(ctx, name, px, py, { flipX: P.face < 0 });
      }
      /* the belly goes on AFTER the body, on its own spring */
      if (NEW && P.mode !== 'swim') KD.Belly.draw(ctx, px, py, P.face, S);
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

  /* ---- what is growing in the plot ----------------------------------
     Crops live in the SAVE, not in the tile grid, because a crop has an
     age and a tile id does not. They are drawn here, standing on the
     furrow they were planted in, and a ripe one gets a small bob so a
     finished row reads as movement from the other end of the cove. */
  function drawCrops(ctx, cam) {
    const c = S.S.crops;
    if (!c) return;
    const t = KD.Game.t;
    for (const k in c) {
      const p = k.indexOf(',');
      const tx = +k.slice(0, p), ty = +k.slice(p + 1);
      const px = tx * 8 - cam.x;
      if (px < -16 || px > KD.W + 16) continue;
      const py = ty * 8 - cam.y;
      if (py < -24 || py > KD.H + 24) continue;
      const st = KD.Day.stage(c[k]);
      const name = KD.Day.CROPS[c[k].k].art + st;
      if (!KD.PX.has(name)) continue;
      const bob = st === 3 ? Math.round(Math.sin(t * 2.2 + tx) * 1.4) : 0;
      KD.PX.blit(ctx, name, Math.round(px), Math.round(py) - 16 + bob, { anchor: false });
    }
  }

  /* the lock-on bracket over the nearest threat, so you know which way to
     face - same shape the castle fight uses, from ui/mark.js */
  function threatMark(cam) {
    const th = threat();
    if (!th) return;
    const m = th.m;
    const h = m.K.h || 12, w = m.K.w || 16;
    /* m.y is the mob's feet, so the box centres half a body higher */
    KD.Mark.threat(Math.round(m.x - cam.x), Math.round(m.y - h / 2 - cam.y),
                   KD.Game.t, false,
                   { rx: Math.round(w / 2) + 3, ry: Math.round(h / 2) + 3 });
  }

  function walkMark(cam) {
    const P = KD.Player.P;
    if (P.goTo === null || P.goTo === undefined) return;
    KD.Mark.dest(Math.round(P.goTo - cam.x), Math.round(P.y - cam.y), KD.Game.t);
  }

  function draw(frameCtx) {
    const sh = KD.Fx.shakeOffset();
    const cam = { x: Math.round(KD.Cam.x + sh.x), y: Math.round(KD.Cam.y + sh.y) };
    /* everything from here to unlens() is drawn at world scale, into a
       buffer half the frame's size */
    const ctx = KD.Screen.lens(Z);
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
    KD.Santa.draw(ctx, cam);
    KD.Mobs.draw(ctx, cam);
    KD.Boss.draw(ctx, cam);
    drawCrops(ctx, cam);
    if (!KD.Cut.active) walkMark(cam);
    drawKing(ctx, cam);
    if (!KD.Cut.active) threatMark(cam);
    KD.Fx.draw(ctx, cam);
    KD.Parallax.front(ctx, cam, dayT);
    if (!KD.Cut.active) KD.Hud.reticle(cam);
    KD.Screen.unlens();
    /* speech balloons, name plates and prompts: pinned in the world,
       drawn at 1:1 now that the lens is closed */
    KD.Screen.flush();

    /* ---- and from here on, the frame itself, at 1:1 --------------- */
    const ctx2 = frameCtx;
    KD.Fx.overlay(ctx2);
    /* Under a cutscene: the stick stays, the rest of the interface goes.
       The health, the hotbar, the depth gauge and eight touch buttons all
       sit exactly where the letterbox and the words land. */
    const cut = KD.Cut.active;
    if (!cut) {
      KD.Hud.draw(S, cam);
      KD.Boss.hud();
      KD.Santa.hud();
      KD.UI.touchPad(BTNS);
      KD.Panels.draw(S);
      KD.UI.tooltips();
    } else if (KD.touch) {
      KD.In.buttons([]);
      KD.UI.touchPad([]);
    }
    /* The controls, for the first twenty seconds, and ABOVE the hotbar
       rather than across it - it used to land on the item name and the
       slot numbers, so the one line explaining the game was printed on
       top of the game. */
    if (!KD.Panels.isOpen() && !cut && S.S.playtime < 20) {
      const txt = KD.touch ? 'pad to move   -   DIG   -   USE   -   tabs, top right'
                           : 'WASD swim  -  hold click to dig  -  E use  -  F swing  -  I bag';
      const tw = KD.Text.width(txt, { tiny: true }) + 16;
      const tx = Math.round((KD.W - tw) / 2), ty = KD.H - 34;
      KD.Screen.rect(tx, ty, tw, 12, 'INK.0');
      KD.Screen.frame(tx, ty, tw, 12, 'INK.2');
      KD.Text.draw(txt, KD.W / 2, ty + 3, 'BONE.1', { tiny: true, align: 'center' });
    }
  }
  return { enter, update, draw, snapCam };
})();
