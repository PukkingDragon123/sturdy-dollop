/* ============================================================
   sim/player.js - the king: physics, swimming, breath, mining,
   placing and swinging. This file is where the game feels good
   or does not.
   ============================================================ */
KD.Player = (function () {
  const TS = 8;
  const P = {
    x: 0, y: 0, vx: 0, vy: 0,
    w: 6, h: 16,                      // narrower than one 8px tile ON PURPOSE:
                                      // a doorway or a dug shaft is 1 tile wide,
                                      // and a wider box could never enter either
    face: 1, onGround: false, mode: 'stand',
    swim: 0,                          // 0..1 submersion
    breath: 1, stam: 1, hp: 6, hpMax: 6,
    mineT: 0, mineTx: -1, mineTy: -1, mineAcc: 0,
    swingT: 0, swingCd: 0, hurtT: 0, iframe: 0,
    fallFrom: null, anim: 0, aimX: 0, aimY: 0,
    jumpBuf: 0, coyote: 0
  };
  /* tuning, all in px/sec. Terraria-ish: heavy but responsive. */
  const RUN = 78, RUN_AIR = 62, ACC = 420, FRIC = 560;
  const GRAV = 460, GRAV_WATER = 62, JUMP = 152, SWIM_UP = 86, TERM = 250, TERM_WATER = 62;

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
    P.stam = Math.min(1, (P.stam === undefined ? 1 : P.stam) + dt * 0.16 * (st.stamRegen || 1));
    P.breath = P.stam;                    // the HUD reads one field
    /* pressure: the abyss crushes you unless you are geared for it */
    const depth = (P.y / TS) | 0;
    if (depth > 300 + st.pressureDepth) {
      P.pressT = (P.pressT || 0) + dt;
      if (P.pressT > 2.4) { P.pressT = 0; hurt(1, S, 'pressure'); }
    }

    /* ---- horizontal ---- */
    const v = In.stick();
    /* the lighter you get, the better you move - that is the whole point */
    const want = v.x * (wet ? RUN * st.swimSpeed : (P.onGround ? RUN : RUN_AIR)) * (st.moveMul || 1);
    if (Math.abs(v.x) > 0.1) {
      P.vx += Math.sign(want) * ACC * dt;
      if (Math.abs(P.vx) > Math.abs(want)) P.vx = want;
      P.face = v.x > 0 ? 1 : -1;
    } else {
      const f = (P.onGround ? FRIC : FRIC * 0.35) * dt;
      P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f;
    }

    /* ---- vertical ---- */
    const jumpHeld = In.act('jump', 'Space', 'KeyK') || v.y < -0.5;
    if (In.actHit('jump', 'Space', 'KeyK')) P.jumpBuf = 0.12;
    P.jumpBuf -= dt; P.coyote -= dt;
    if (wet) {
      P.vy += GRAV_WATER * dt;
      if (jumpHeld) P.vy -= SWIM_UP * dt * 3.4;
      if (v.y > 0.4) P.vy += GRAV_WATER * dt * 2.2;
      P.vy *= Math.pow(0.16, dt);
      P.vy = Math.max(-TERM_WATER, Math.min(TERM_WATER, P.vy));
      P.fallFrom = null;
    } else {
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
    /* Unstick: if we somehow ended up inside solid tiles, climb out upward
       rather than vibrating in the floor forever. */
    if (boxHits(P.x, P.y)) {
      for (let k = 0; k < 24 && boxHits(P.x, P.y); k++) P.y -= 2;
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
    if (T.station) { KD.Panels.toggle('craft'); return true; }
    /* standing in a building that does something? do that thing */
    const b = buildingAt(tx, ty);
    if (b && b.kind.gym) { KD.Game.go('gym', {}); return true; }
    return false;
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
  return { P, spawn, update, hurt, heal, interact, openChest, zoneGate, buildingAt,
           get x() { return P.x; }, get y() { return P.y; } };
})();
