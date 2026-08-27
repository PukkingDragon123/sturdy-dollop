/* ============================================================
   sim/player.js - the king: physics, swimming, breath, mining,
   placing and swinging. This file is where the game feels good
   or does not.
   ============================================================ */
KD.Player = (function () {
  const TS = 8;
  const P = {
    x: 0, y: 0, vx: 0, vy: 0,
    w: 6, h: 28,                      /* Narrower than one 8px tile ON PURPOSE:
                                         a doorway or a dug shaft is 1 tile
                                         wide and a wider box could never
                                         enter either. Height follows the
                                         24x36 sprite - not all of it, since
                                         the top eight pixels are crown and
                                         hair, and a hitbox that included
                                         them would need five tiles of
                                         headroom to stand up in. */
    face: 1, onGround: false, mode: 'stand', goTo: null, onArrive: null, goT: 0, stall: 0,
    swim: 0,                          // 0..1 submersion
    breath: 1, stam: 1, hp: 6, hpMax: 6,
    mineT: 0, mineTx: -1, mineTy: -1, mineAcc: 0,
    swingT: 0, swingCd: 0, hurtT: 0, iframe: 0,
    fallFrom: null, anim: 0, aimX: 0, aimY: 0,
    jumpBuf: 0, coyote: 0, squash: 0, stretch: 0
  };
  /* tuning, all in px/sec. Terraria-ish: heavy but responsive. */
  const RUN = 78, RUN_AIR = 62, ACC = 420, FRIC = 560;
  const GRAV = 460, JUMP = 152, TERM = 250;
  /* Swimming, tuned for momentum rather than for a walk that happens to be
     underwater: you accelerate hard, top out fast, glide a long way when you
     let go, and a kick is a real burst on a short cooldown. SWIM_RISE is the
     slow buoyant drift that keeps you off the floor when you do nothing. */
  const SWIM_ACC = 520, SWIM_TOP = 96, SWIM_KICK = 118, SWIM_RISE = -16;

  function spawn(x, y) {
    P.x = x * TS + 4; P.y = y * TS;
    P.vx = P.vy = 0; P.hp = P.hpMax; P.breath = 1;
    P.onGround = false; P.fallFrom = null;
  }

  const solidAt = (px, py) => {
    const t = KD.World.at((px / TS) | 0, (py / TS) | 0);
    const T = KD.Tiles.get(t);
    return !!(T && T.solid);
  };
  /* platforms stop you only when you are falling onto them */
  const platAt = (px, py) => {
    const T = KD.Tiles.get(KD.World.at((px / TS) | 0, (py / TS) | 0));
    return !!(T && T.plat);
  };
  function boxHits(x, y) {
    const l = x - P.w / 2, r = x + P.w / 2 - 1, t = y - P.h, b = y - 1;
    for (let py = t; py <= b; py += 4) {
      if (solidAt(l, py) || solidAt(r, py)) return true;
    }
    return solidAt(l, b) || solidAt(r, b) || solidAt(l, t) || solidAt(r, t);
  }

  function update(dt, S) {
    const In = KD.In, Wd = KD.World;
    const st = S.stats;
    /* ---- submersion and stamina ----
       The king is an Atlantean. He does not drown in his own ocean, and a
       breath meter that empties while you stand in the shallows is just a
       clock counting down to a pointless death. The bar is STAMINA now: it
       pays for dashes and heavy swings and refills when you stop, which is
       also what a man trying to get back in shape would notice. */
    P.swim = KD.Water.submersion(P.x, P.y, P.h);
    const wet = P.swim > 0.45;
    const smax = st.stamMax || 1;
    P.stam = Math.min(smax, (P.stam === undefined ? smax : P.stam) + dt * 0.16 * (st.stamRegen || 1));
    P.breath = P.stam / (st.stamMax || 1);   // the HUD reads one 0..1 field
    /* pressure: the abyss crushes you unless you are geared for it */
    const depth = (P.y / TS) | 0;
    if (depth > 300 + st.pressureDepth) {
      P.pressT = (P.pressT || 0) + dt;
      if (P.pressT > 2.4) { P.pressT = 0; hurt(1, S, 'pressure'); }
    }

    /* ---- movement ------------------------------------------------- *
     * On land: run, friction, jump. In water: SWIM, which is a different
     * game. You are neutrally buoyant, you accelerate in whatever
     * direction you are pointing, you glide when you let go, and a kick
     * gives you a burst that costs stamina. That is the Dave the Diver
     * feel - the water has weight and momentum, and stopping is a thing
     * you have to do rather than something that happens to you.
     * ---------------------------------------------------------------- */
    /* Tap-to-walk: a world x he is heading for. The stick always wins, so
       one nudge cancels it - a destination you cannot override is a cage. */
    let v = In.stick();
    if (Math.abs(v.x) > 0.2 || Math.abs(v.y) > 0.2) P.goTo = null;
    else if (P.goTo !== null && P.goTo !== undefined) {
      const d = P.goTo - P.x;
      P.goT = (P.goT || 0) + dt;
      if (Math.abs(d) < 8 || P.goT > 9) {
        const done = P.onArrive;
        P.goTo = null; P.onArrive = null; P.goT = 0;
        if (done && Math.abs(d) < 24) done();
      } else {
        v = { x: Math.sign(d), y: 0 };
        /* AUTO-JUMP. Tap-to-walk with no pathfinding walks straight into the
           first terrace wall and stands there pushing, which is exactly what
           the village did on the first try. If he is heading somewhere and
           has stopped moving, hop; in water, swim up instead. */
        if (Math.abs(P.vx) < 8) {
          P.stall = (P.stall || 0) + dt;
          if (P.stall > 0.18) {
            if (P.swim > 0.45) v.y = -0.9;
            else if (P.onGround || P.coyote > 0) { P.jumpBuf = 0.12; P.stall = 0; }
            /* still nowhere after a couple of seconds? the way is shut */
            if (P.stall > 2.2) { P.goTo = null; P.onArrive = null; P.stall = 0; }
          }
        } else P.stall = 0;
      }
    }
    const jumpHeld = In.act('jump', 'Space', 'KeyK') || v.y < -0.5;
    if (In.actHit('jump', 'Space', 'KeyK')) P.jumpBuf = 0.12;
    P.jumpBuf -= dt; P.coyote -= dt;

    if (wet) {
      /* full eight-way thrust toward the stick, scaled by how light you are */
      const mag = Math.min(1, Math.hypot(v.x, v.y));
      const top = SWIM_TOP * st.swimSpeed * (st.moveMul || 1);
      if (mag > 0.14) {
        const nx = v.x / (mag || 1), ny = v.y / (mag || 1);
        P.vx += nx * SWIM_ACC * dt * mag;
        P.vy += ny * SWIM_ACC * dt * mag;
        P.face = v.x > 0.1 ? 1 : (v.x < -0.1 ? -1 : P.face);
        P.kicking = 0.16;
      } else {
        P.kicking = Math.max(0, (P.kicking || 0) - dt);
      }
      /* a KICK: one hard burst in the direction you are pointing */
      P.kickCd = Math.max(0, (P.kickCd || 0) - dt);
      if (In.actHit('jump', 'Space', 'KeyK') && P.kickCd <= 0 && P.stam > 0.18) {
        const kx = mag > 0.14 ? v.x / mag : P.face, ky = mag > 0.14 ? v.y / mag : -0.25;
        P.vx += kx * SWIM_KICK;
        P.vy += ky * SWIM_KICK;
        P.stam -= 0.16;
        P.kickCd = 0.42;
        P.kicking = 0.3;
        KD.Fx.bubbles(P.x - P.face * 6, P.y - P.h * 0.5, 5);
        KD.Sfx.play('splash');
      }
      /* glide: water drags you down hard but never stops you dead, and a
         drift of buoyancy keeps you off the floor if you do nothing */
      const drag = Math.pow(mag > 0.14 ? 0.55 : 0.10, dt);
      P.vx *= drag; P.vy *= drag;
      P.vy += (mag > 0.14 ? 0 : SWIM_RISE) * dt;
      const sp = Math.hypot(P.vx, P.vy);
      if (sp > top) { P.vx = P.vx / sp * top; P.vy = P.vy / sp * top; }
      P.fallFrom = null;
    } else {
      /* on land, as before */
      const want = v.x * (P.onGround ? RUN : RUN_AIR) * (st.moveMul || 1);
      if (Math.abs(v.x) > 0.1) {
        P.vx += Math.sign(want) * ACC * dt;
        if (Math.abs(P.vx) > Math.abs(want)) P.vx = want;
        P.face = v.x > 0 ? 1 : -1;
      } else {
        const f = (P.onGround ? FRIC : FRIC * 0.35) * dt;
        P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f;
      }
      P.vy += GRAV * dt;
      if (P.vy > TERM) P.vy = TERM;
      if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0)) {
        P.vy = -JUMP * (st.jumpMul || 1); P.jumpBuf = 0; P.coyote = 0; P.onGround = false;
        KD.Sfx.play('jump');
      }
      /* short hop: let go early and you rise less */
      if (!jumpHeld && P.vy < -40) P.vy += GRAV * dt * 1.6;
    }

    /* ---- move and collide, axis at a time ---- */
    let nx = P.x + P.vx * dt;
    if (boxHits(nx, P.y)) {
      /* step up a single tile lip while walking */
      if (P.onGround && !boxHits(nx, P.y - TS) && !boxHits(nx, P.y - TS - 1)) P.y -= TS;
      else { P.vx = 0; nx = P.x; }
    }
    P.x = Math.max(P.w, Math.min(Wd.W * TS - P.w, nx));
    zoneGate(S);
    /* Squeeze assist: in a one-tile-wide gap, ease toward the column centre.
       Without this, threading a doorway or a dug shaft is a pixel-hunt. */
    const col = (P.x / TS) | 0;
    const midY = P.y - P.h / 2;
    if (solidAt((col - 1) * TS + 4, midY) && solidAt((col + 1) * TS + 4, midY)) {
      const want = col * TS + TS / 2;
      P.x += (want - P.x) * Math.min(1, dt * 14);
    }

    const wasFalling = P.vy > 0;
    let ny = P.y + P.vy * dt;
    const groundBefore = P.onGround;
    P.onGround = false;
    if (boxHits(P.x, ny)) {
      /* Walk the collision back to the tile face. The step must never overshoot
         P.y: stepping a whole pixel past it and then testing only the DISTANCE
         from P.y lets that distance grow without bound, which hangs the game
         the moment the player is embedded in solid tiles - out of bounds, or
         teleported into rock. Step toward P.y, stop when we reach it, and cap
         the iterations so no future embedding can ever spin here again. */
      const dir = Math.sign(ny - P.y) || 1;
      let guard = 0;
      while (boxHits(P.x, ny) && guard++ < 64) {
        const step = Math.min(1, Math.abs(ny - P.y));
        if (step <= 0.001) break;
        ny -= dir * step;
      }
      if (boxHits(P.x, ny)) ny = P.y;          // still stuck: do not move at all
      if (wasFalling) {
        P.onGround = true;
        /* squash proportional to how hard he arrived, and a hitch in time
           if it was a real drop */
        if (P.vy > 150) {
          P.squash = Math.min(1, P.vy / 520);
          if (P.vy > 330) { KD.Juice.hit(0.05); KD.Fx.shake(Math.min(5, P.vy / 130)); }
          KD.Sfx.play('land');
        }
        if (P.fallFrom !== null) {
          const drop = (ny - P.fallFrom) / TS;
          const safe = 11 + st.fallSafe;
          if (drop > safe && !st.noFall) hurt(Math.floor((drop - safe) / 4) + 1, S, 'the landing');
          P.fallFrom = null;
        }
      }
      P.vy = 0;
    } else if (wasFalling && !wet) {
      /* platforms: land on them unless you are holding down */
      const l = P.x - P.w / 2, r = P.x + P.w / 2 - 1;
      if ((platAt(l, ny) || platAt(r, ny)) && v.y < 0.4 && ((ny / TS) | 0) !== ((P.y / TS) | 0)) {
        ny = (((ny / TS) | 0)) * TS; P.vy = 0; P.onGround = true; P.fallFrom = null;
      }
    }
    P.y = ny;
    /* Unstick: if we somehow ended up inside solid tiles, step out to the
       NEAREST free spot rather than climbing. The old version walked up 48px
       every frame it was stuck, so being teleported into a pillar levitated
       the king a hundred tiles out through the ceiling. Bounded to two tiles
       and biased downward, because a floor is the usual thing to be inside. */
    if (boxHits(P.x, P.y)) {
      const OUT = [[0, 2], [0, -2], [0, 4], [0, -4], [-3, 0], [3, 0],
                   [0, 8], [0, -8], [-6, 0], [6, 0], [0, 16], [0, -16]];
      for (const [ox, oy] of OUT) {
        if (!boxHits(P.x + ox, P.y + oy)) { P.x += ox; P.y += oy; break; }
      }
      P.vy = 0;
    }
    if (P.onGround) { P.coyote = 0.09; P.fallFrom = null; }
    else if (groundBefore) P.coyote = 0.09;
    if (!P.onGround && P.vy > 0 && P.fallFrom === null && !wet) P.fallFrom = P.y;

    /* ---- what am I pointing at ---- */
    aim(S);
    /* ---- verbs ---- */
    mine(dt, S);
    swing(dt, S);
    place(S);

    /* ---- state for the renderer ---- */
    /* squash decays fast; a rise stretches him instead */
    P.squash = (P.squash || 0) - dt * 5.5;
    if (P.squash < 0) P.squash = 0;
    P.stretch = (!P.onGround && !wet && P.vy < -80) ? Math.min(0.5, -P.vy / 620) : 0;
    P.mode = wet ? 'swim' : (!P.onGround ? 'jump' : (Math.abs(P.vx) > 6 ? 'walk' : 'stand'));
    P.anim += dt * (P.mode === 'walk' ? Math.abs(P.vx) / 12 : 3);
    if (P.hurtT > 0) P.hurtT -= dt;
    if (P.iframe > 0) P.iframe -= dt;
    if (P.swingCd > 0) P.swingCd -= dt;
    /* swinging and swimming burn the beer off */
    /* honest effort burns weight: swimming, walking, swinging, digging */
    if (Math.abs(P.vx) > 20 || P.swingT > 0) S.burnFat(dt * (wet ? 0.22 : 0.14));
  }

  /* A zone you have not earned pushes you back out and tells you why. This is
     the weight-loss spine made physical: the world literally will not let a
     man in this condition go any deeper. */
  let gateMsg = 0;
  function zoneGate(S) {
    if (!KD.Zones || !KD.Goal) return;
    const z = KD.Zones.atPx(P.x);
    if (!z || !KD.Goal.milestone(z.id)) { P.zone = z; return; }
    if (KD.Goal.allowed(S.S, z.id)) { P.zone = z; return; }
    /* shove them back toward the edge they came from, and never outside the
       world - out there every tile reads solid and the player is embedded */
    const fromLeft = P.x / TS - z.x0 < (z.x1 - z.x0) / 2;
    const target = (fromLeft ? z.x0 - 2 : z.x1 + 2) * TS;
    P.x = Math.max(P.w + 1, Math.min(KD.World.W * TS - P.w - 1, target));
    P.vx = fromLeft ? -40 : 40;
    if (KD.Game.t - gateMsg > 3) {
      gateMsg = KD.Game.t;
      S.say('Not yet: ' + KD.Goal.why(S.S, z.id), 'BLOOD.3');
      KD.Sfx.play('deny');
    }
  }

  /* the reticle: mouse if we have one, otherwise the stick direction */
  function aim(S) {
    const In = KD.In, cam = KD.Cam;
    if (!KD.touch && (In.mouse.x || In.mouse.y)) {
      P.aimX = In.mouse.x + cam.x; P.aimY = In.mouse.y + cam.y;
    } else {
      const v = In.stick();
      const l = Math.hypot(v.x, v.y);
      const dx = l > 0.2 ? v.x / l : P.face, dy = l > 0.2 ? v.y / l : 0;
      P.aimX = P.x + dx * 20; P.aimY = P.y - P.h / 2 + dy * 20;
    }
    const reach = (S.stats.reach || 5) * TS;
    const dx = P.aimX - P.x, dy = P.aimY - (P.y - P.h / 2);
    const d = Math.hypot(dx, dy);
    if (d > reach) { P.aimX = P.x + dx / d * reach; P.aimY = P.y - P.h / 2 + dy / d * reach; }
    P.tgx = (P.aimX / TS) | 0; P.tgy = (P.aimY / TS) | 0;
  }

  function mine(dt, S) {
    const held = KD.In.act('dig', 'KeyJ') || (KD.In.mouse.down && !KD.touch);
    if (!held) { P.mineT = 0; P.mineTx = -1; P.mineAcc = 0; return; }
    const Wd = KD.World, tx = P.tgx, ty = P.tgy;
    const T = KD.Tiles.get(Wd.at(tx, ty));
    if (!T || !T.hp) { P.mineT = 0; return; }
    const tool = S.tool();
    if ((T.hard || 0) > (tool.tier || 0)) {
      S.say('That needs a better tool.', 'BLOOD.2');
      P.mineT = 0; return;
    }
    if (tx !== P.mineTx || ty !== P.mineTy) { P.mineTx = tx; P.mineTy = ty; P.mineT = 0; P.mineAcc = 0; }
    P.mineT += dt;
    /* Tile damage is stored in a byte array, so fractional hits would silently
       truncate to nothing. Accumulate here and only ever hand the world whole
       numbers. */
    const rate = ((tool.pow || 2) + S.stats.minePower) * (tool.mine || 1) * S.stats.mineSpeed;
    P.mineAcc = (P.mineAcc || 0) + rate * dt * 10;
    const step = Math.floor(P.mineAcc);
    if (step < 1) return;
    P.mineAcc -= step;
    if (Wd.damage(tx, ty, step)) {
      KD.Sfx.play('break');
      const drop = T.drop;
      if (drop) S.give(drop, 1 + (S.stats.oreLuck > 0 && Math.random() < S.stats.oreLuck ? 1 : 0));
      /* the material the rock was hiding, at its own odds */
      if (T.drop2 && Math.random() < (T.drop2p || 0.2) * (1 + S.stats.oreLuck)) S.give(T.drop2, 1);
      S.S.mined++;
      S.burnFat(0.05 + (T.hard || 0) * 0.03);
      S.addXp(T.hard >= 2 ? 4 : 2);
      KD.Fx.chunks(tx * TS + 4, ty * TS + 4, 5, T.art || 'stone');
      KD.Water.touch(tx, ty);
      /* anything resting on it falls off */
      const above = KD.Tiles.get(Wd.at(tx, ty - 1));
      if (above && !above.solid && above.hp && above.deco) Wd.set(tx, ty - 1, KD.Tiles.AIR);
    } else if (P.mineT > 0.12) {
      KD.Sfx.play('tap'); P.mineT = 0.001;
    }
  }

  function swing(dt, S) {
    if (P.swingT > 0) { P.swingT -= dt; return; }
    if (P.swingCd > 0) return;
    if (!(KD.In.actHit('hit', 'KeyF') || (KD.In.mouse.rclick))) return;
    const wpn = S.weapon();
    /* a heavy weapon costs stamina; a light one is nearly free */
    const cost = 0.05 + Math.max(0, (wpn.dmg || 3) - 6) * 0.006;
    if (P.stam < cost) { S.say('Out of puff.', 'BLOOD.2'); KD.Sfx.play('deny'); P.swingCd = 0.3; return; }
    P.stam -= cost;
    P.swingT = 0.22 / ((wpn.spd || 1) * S.stats.swingSpeed);
    P.swingCd = 0.30 / ((wpn.spd || 1) * S.stats.swingSpeed);
    KD.Sfx.play('swing');
    const dmg = (wpn.dmg || 3) * S.dmgMult();
    KD.Mobs.hitArc(P.x, P.y - P.h / 2, P.face, wpn.reach || 14, dmg, S, wpn);
    if (KD.Boss.active()) KD.Boss.playerHit(P.x, P.y - P.h / 2, P.face, wpn.reach || 14, dmg, S, wpn);
  }

  /* USE is context-sensitive: a chest opens, a door swings, otherwise you
     place whatever is in your hand. */
  function place(S) {
    if (!(KD.In.actHit('use', 'KeyE') || (KD.In.mouse.rclick && KD.touch))) return;
    /* A doorway beats everything else you are standing in - unless Santa is
       right there, in which case he is what you meant. */
    if (!(KD.Santa && KD.Santa.near()) && tryEnter(S)) return;
    if (interact(S)) return;
    const slot = S.hotbarItem();
    if (!slot) return;
    const tileId = slot.tile;
    if (!tileId) { S.useItem(slot); return; }
    const Wd = KD.World, tx = P.tgx, ty = P.tgy;
    if (Wd.at(tx, ty) !== KD.Tiles.AIR) { S.say('Something is already there.', 'BLOOD.2'); return; }
    /* must touch something, so you cannot build in mid-air */
    const touching = Wd.solid(tx - 1, ty) || Wd.solid(tx + 1, ty) || Wd.solid(tx, ty - 1) || Wd.solid(tx, ty + 1) ||
                     Wd.wall(tx, ty) !== 0;
    if (!touching) { S.say('Nothing to build against.', 'BLOOD.2'); return; }
    /* and not inside the player */
    if (Math.abs(tx * TS + 4 - P.x) < P.w && Math.abs(ty * TS + 4 - (P.y - P.h / 2)) < P.h) return;
    Wd.set(tx, ty, KD.Tiles.id(tileId));
    Wd.setWater(tx, ty, 0);
    KD.Water.touch(tx, ty);
    S.take(slot.id, 1);
    KD.Sfx.play('place');
  }

  /* returns true if the tile under the cursor handled the press itself */
  function interact(S) {
    const Wd = KD.World, tx = P.tgx, ty = P.tgy;
    const T = KD.Tiles.get(Wd.at(tx, ty));
    if (!T) return false;
    if (T.container) { openChest(S, tx, ty); return true; }
    if (T.door) {
      /* a door is 2x3; swing it by swapping solidity on its whole footprint */
      const key = tx + ',' + ty;
      S.S.flags['door' + key] = !S.S.flags['door' + key];
      Wd.set(tx, ty, KD.Tiles.id(S.S.flags['door' + key] ? 'platform' : 'door'));
      KD.Sfx.play('open');
      return true;
    }
    if (T.station) { KD.Panels.toggle('body'); return true; }
    return false;
  }
  /* Standing in a fruit doorway? Then ACT walks you in. The room is its
     own scene, which is why you can never be sealed inside one. */
  function tryEnter(S) {
    const b = KD.Village.doorAt(P.x, P.y - 4);
    if (!b) return false;
    if (b.kind.gym) { KD.Game.go('gym', {}); return true; }
    KD.Game.go('interior', { b: b });
    return true;
  }
  /* which village building, if any, contains this tile */
  function buildingAt(tx, ty) {
    const v = KD.Gen.meta.village;
    if (!v) return null;
    for (const b of v.buildings) {
      if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return b;
    }
    return null;
  }
  function openChest(S, tx, ty) {
    const key = tx + ',' + ty;
    if (S.S.chests[key]) { S.say('Already emptied.', 'INK.3'); return; }
    const c = (KD.Gen.meta.chests || []).find((q) => q.x === tx && q.y === ty);
    S.S.chests[key] = 1;
    KD.Sfx.play('open');
    if (!c) { S.say('Empty. Somebody beat you to it.', 'INK.3'); return; }
    let got = 0;
    for (const it of (c.items || [])) {
      if (it.id === 'clams') { S.earn(it.n); got++; continue; }
      if (S.give(it.id, it.n)) got++;
    }
    if (c.frag) {
      S.giveFrag(c.frag);
      if (S.fragCount() >= 5) S.say('ALL FIVE. Go take the crown back.', 'GOLD.3');
    } else {
      S.say(got ? 'Looted the chest.' : 'Nothing you can carry.', got ? 'GOLD.2' : 'INK.3');
    }
    S.addXp(6);
    KD.Fx.chunks(tx * TS + 4, ty * TS + 4, 6, 'plank');
    S.save();
  }

  function hurt(n, S, from) {
    if (P.iframe > 0) return;
    P.hp -= n; P.hurtT = 0.35; P.iframe = 0.7;
    KD.Sfx.play('hurt');
    KD.Fx.shake(3);
    if (P.hp <= 0) S.die(from);
  }
  const heal = (n) => { P.hp = Math.min(P.hpMax, P.hp + n); };
  const walkTo = (x, onArrive) => { P.goTo = x; P.onArrive = onArrive || null; P.goT = 0; };
  return { walkTo, P, spawn, update, hurt, heal, interact, tryEnter, openChest, zoneGate, buildingAt,
           get x() { return P.x; }, get y() { return P.y; } };
})();
