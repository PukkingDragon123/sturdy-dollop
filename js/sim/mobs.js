/* ============================================================
   sim/mobs.js - enemies. Every one telegraphs, attacks, then
   recovers, so a fight is readable instead of a coin flip.
   Spawning is depth-driven and off-screen only.
   ============================================================ */
KD.Mobs = (function () {
  const TS = 8;
  const list = [];
  const MAXN = 34;

  /* hp/dmg/speed are tuned against the player's 6 hearts and ~8 dps start */
  const KINDS = {
    crawler:  { spr: 'crawler',  w: 10, h: 8,  hp: 10, dmg: 1, spd: 22, xp: 3,  swim: false, y0: 40,  y1: 160, drop: ['bone_i'] },
    snapper:  { spr: 'snapper',  w: 14, h: 10, hp: 20, dmg: 1, spd: 30, xp: 5,  swim: false, y0: 60,  y1: 200, drop: ['shell_i', 'bone_i'], armour: 2 },
    urchin:   { spr: 'urchin',   w: 8,  h: 8,  hp: 14, dmg: 1, spd: 0,  xp: 3,  swim: false, y0: 60,  y1: 420, drop: ['bone_i'], still: true },
    jelly:    { spr: 'jelly',    w: 10, h: 14, hp: 16, dmg: 1, spd: 20, xp: 4,  swim: true,  y0: 40,  y1: 240, drop: ['cloth_i'], drift: true },
    shark:    { spr: 'shark',    w: 28, h: 12, hp: 30, dmg: 2, spd: 62, xp: 9,  swim: true,  y0: 60,  y1: 260, drop: ['bone_i', 'fish2'] },
    bandit:   { spr: 'bandit',   w: 10, h: 16, hp: 24, dmg: 1, spd: 44, xp: 8,  swim: false, y0: 200, y1: 340, drop: ['beer_lager', 'ore_iron'], steal: true },
    sentinel: { spr: 'sentinel', w: 16, h: 22, hp: 52, dmg: 2, spd: 26, xp: 16, swim: false, y0: 150, y1: 240, drop: ['brick_i', 'ore_gold'], armour: 4 },
    horror:   { spr: 'horror',   w: 20, h: 18, hp: 70, dmg: 2, spd: 34, xp: 24, swim: true,  y0: 280, y1: 420, drop: ['ore_abyssal', 'pearl'], spit: true },
    baron:    { spr: 'baron',    w: 40, h: 36, hp: 420, dmg: 3, spd: 40, xp: 200, swim: false, boss: true, drop: [] },
    /* ---- the ocean past the Gate. One shape per zone, so where you are
       is legible from what is swimming at you. --------------------- */
    clown:    { spr: 'an_clown',  w: 12, h: 9,  hp: 8,  dmg: 1, spd: 54, xp: 2,  swim: true,  y0: 34, y1: 150, drop: ['fish1'], shy: true },
    parrot:   { spr: 'an_parrot', w: 18, h: 13, hp: 26, dmg: 1, spd: 34, xp: 6,  swim: true,  y0: 36, y1: 190, drop: ['coral', 'fish1'], armour: 3 },
    mantis:   { spr: 'an_mantis', w: 20, h: 12, hp: 18, dmg: 2, spd: 40, xp: 8,  swim: false, y0: 40, y1: 210, drop: ['shell', 'flint'] },
    moray:    { spr: 'an_moray',  w: 26, h: 11, hp: 34, dmg: 2, spd: 30, xp: 11, swim: true,  y0: 60, y1: 250, drop: ['bone', 'fish2'], dash: true },
    cuttle:   { spr: 'an_cuttle', w: 15, h: 15, hp: 24, dmg: 1, spd: 26, xp: 9,  swim: true,  y0: 50, y1: 260, drop: ['cloth_i', 'pearl'], drift: true, spit: true },
    cuda:     { spr: 'an_cuda',   w: 30, h: 10, hp: 30, dmg: 2, spd: 78, xp: 13, swim: true,  y0: 80, y1: 320, drop: ['bone', 'fish2'], dash: true },
    lion:     { spr: 'an_lion',   w: 18, h: 17, hp: 40, dmg: 2, spd: 16, xp: 14, swim: true,  y0: 90, y1: 300, drop: ['urchin_spine', 'coral'], armour: 5 },
    manta:    { spr: 'an_manta',  w: 42, h: 17, hp: 66, dmg: 2, spd: 44, xp: 22, swim: true,  y0: 120, y1: 400, drop: ['hide', 'pearl'], drift: true }
  };

  function spawn(kind, tx, ty) {
    const K = KINDS[kind];
    if (!K) return null;
    const m = {
      kind, K, x: tx * TS + 4, y: ty * TS, vx: 0, vy: 0,
      hp: K.hp, hpMax: K.hp, face: -1, t: Math.random() * 9,
      state: 'idle', stateT: 0, hurtT: 0, atkCd: 0.6 + Math.random(), anim: 0, dead: 0
    };
    list.push(m);
    return m;
  }
  const clear = () => { list.length = 0; };

  const solid = (px, py) => {
    const T = KD.Tiles.get(KD.World.at((px / TS) | 0, (py / TS) | 0));
    return !!(T && T.solid);
  };
  const wet = (m) => KD.World.water((m.x / TS) | 0, ((m.y - m.K.h / 2) / TS) | 0) >= 4;

  /* --- spawning: off-screen, depth-appropriate, capped --- */
  let spawnT = 0;
  function spawner(dt, S) {
    spawnT -= dt;
    if (spawnT > 0 || list.length >= MAXN) return;
    spawnT = 0.42;
    const P = KD.Player.P, Wd = KD.World;
    const py = (P.y / TS) | 0;
    /* Depth said WHAT could live here; the zone says what actually does.
       Without the zone filter every region spawned the same four things at
       a given depth, so the reef, the kelp forest and the ruins all felt
       like the same place with different rock. */
    const zone = KD.Zones.atPx(P.x);
    if (zone.safe) return;
    const listed = !!(zone.mobs && zone.mobs.length);
    const table = listed ? zone.mobs : Object.keys(KINDS);
    const cands = [];
    for (const k of table) {
      const K = KINDS[k];
      if (!K || K.boss) continue;
      /* A hand-written zone table IS the curation, so it only needs a loose
         depth sanity check. The tight y0/y1 window is for the fallback: with
         it applied to the tables, the ruins surface could only produce
         urchins, because everything else in the ruins lives deeper than the
         zone's own seabed. */
      const slack = listed ? 90 : 20;
      if (py >= K.y0 - slack && py <= K.y1 + slack) cands.push(k);
    }
    if (!cands.length) return;
    for (let tries = 0; tries < 24; tries++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      /* Far enough out to be off screen at ANY width. The old 14-36 tile
         band was almost entirely inside a 486px viewport, so nearly every
         candidate was rejected for being visible and the ocean was empty. */
      const clear = Math.ceil((KD.W / 2 + 40) / TS);
      const tx = ((P.x / TS) | 0) + side * (clear + ((Math.random() * 26) | 0));
      const ty = py + (((Math.random() * 22) | 0) - 11);
      if (!Wd.inside(tx, ty)) continue;
      /* must be open, and must not be visible on screen */
      if (Wd.solid(tx, ty) || Wd.solid(tx, ty - 1)) continue;
      const sx = tx * TS - KD.Cam.x, sy = ty * TS - KD.Cam.y;
      if (sx > -30 && sx < KD.W + 30 && sy > -30 && sy < KD.H + 30) continue;
      const kind = cands[(Math.random() * cands.length) | 0];
      const K = KINDS[kind];
      const inWater = Wd.water(tx, ty) >= 4;
      if (K.swim && !inWater) continue;
      if (!K.swim && !Wd.solid(tx, ty + 1)) continue;
      /* Darkness breeds - but only for the things that live in it. Gating
         swimmers on light too meant no fish in a sunlit reef, which is
         exactly backwards. */
      if (!K.swim && Wd.lightAt(tx, ty) > 9 && Math.random() < 0.85) continue;
      spawn(kind, tx, ty);
      return;
    }
  }

  function update(dt, S) {
    const P = KD.Player.P;
    spawner(dt, S);
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      m.t += dt; m.anim += dt;
      if (m.hurtT > 0) m.hurtT -= dt;
      if (m.dead > 0) {
        m.dead -= dt;
        if (m.dead <= 0) list.splice(i, 1);
        continue;
      }
      /* despawn what wandered far away, so the sim stays cheap */
      if (Math.abs(m.x - P.x) > KD.W * 2.5 && !m.K.boss) { list.splice(i, 1); continue; }

      const K = m.K, dx = P.x - m.x, dy = (P.y - P.h / 2) - (m.y - K.h / 2);
      const dist = Math.hypot(dx, dy);
      m.atkCd -= dt;
      if (!K.still) m.face = dx > 0 ? 1 : -1;

      /* --- state machine: idle -> chase -> telegraph -> strike -> recover --- */
      m.stateT -= dt;
      if (m.state === 'idle') {
        if (dist < 90) m.state = K.shy ? 'flee' : 'chase';
        if (K.drift) { m.vx = Math.sin(m.t * 0.7) * 12; m.vy = Math.sin(m.t * 0.45) * 9; }
        else if (K.swim) {
          /* An idle swimmer that only wobbles in place never arrives: it
             spawns off screen and stays there. Cruise, and lean toward the
             player, so the ocean actually has fish crossing it. */
          m.vx = Math.sign(dx || 1) * K.spd * 0.45 + Math.sin(m.t * 0.6) * 8;
          m.vy = Math.sin(m.t * 0.4) * 10;
        } else if (!K.still) m.vx = Math.sin(m.t * 0.5) * K.spd * 0.3;
      } else if (m.state === 'flee') {
        /* shy things scatter. They still cost you a swing if you corner one. */
        if (dist > 130) { m.state = 'idle'; m.vx = 0; }
        m.face = dx > 0 ? -1 : 1;
        m.vx = -Math.sign(dx || 1) * K.spd;
        m.vy = -Math.sign(dy || 1) * K.spd * 0.5;
      } else if (m.state === 'chase') {
        if (dist > 160) m.state = 'idle';
        /* a dasher winds up out of reach and crosses the gap in one go */
        if (K.dash && dist < 120 && dist > K.w + 14 && m.atkCd <= 0) {
          m.state = 'wind'; m.stateT = 0.46; m.vx = 0; m.dashing = true;
        } else if (dist < (K.w + 12) && m.atkCd <= 0) { m.state = 'wind'; m.stateT = 0.32; m.vx = 0; }
        else if (!K.still) {
          if (K.swim) {
            m.vx = (dx / (dist || 1)) * K.spd;
            m.vy = (dy / (dist || 1)) * K.spd * 0.7;
          } else {
            m.vx = Math.sign(dx) * K.spd;
            /* hop a one-tile lip rather than grinding into it */
            if (solid(m.x + Math.sign(dx) * (K.w / 2 + 2), m.y - 2) && m.onGround) m.vy = -128;
          }
        }
      } else if (m.state === 'wind') {
        m.vx *= 0.4;
        if (m.stateT <= 0) {
          m.state = 'strike'; m.stateT = m.dashing ? 0.42 : 0.18;
          if (m.dashing) {
            /* the whole attack IS the movement: commit to a heading and go */
            const d = dist || 1;
            m.vx = (dx / d) * K.spd * 3.4;
            m.vy = (dy / d) * K.spd * 1.9;
            KD.Sfx.play('swing');
          } else if (K.spit) shot(m, dx, dy);
          else if (dist < K.w + 16) {
            KD.Player.hurt(Math.max(1, K.dmg - Math.floor(S.armourTotal() / 14)), S, K.spr);
            if (K.steal && S.count('beer_lager')) { S.take('beer_lager', 1); S.say('A bandit took your beer.', 'BLOOD.2'); }
          }
        }
      } else if (m.state === 'strike') {
        /* a dash hits whatever it runs into on the way past */
        if (m.dashing && dist < K.w / 2 + 8 && m.atkCd <= 0) {
          m.atkCd = 1.1;
          KD.Player.hurt(Math.max(1, K.dmg - Math.floor(S.armourTotal() / 14)), S, K.spr);
        }
        if (m.stateT <= 0) { m.state = 'recover'; m.stateT = m.dashing ? 0.7 : 0.4; m.dashing = false; }
      } else if (m.state === 'recover') {
        if (m.stateT <= 0) { m.state = 'chase'; m.atkCd = 0.8 + Math.random() * 0.7; }
      }

      /* --- physics --- */
      const inWater = wet(m);
      if (K.swim || K.drift) {
        m.vy += (inWater ? 0 : 300) * dt;
        m.vx *= Math.pow(0.6, dt);
      } else if (!K.still) {
        m.vy += (inWater ? 90 : 420) * dt;
        if (inWater) { m.vx *= Math.pow(0.5, dt); m.vy = Math.min(m.vy, 40); }
      }
      m.onGround = false;
      let nx = m.x + m.vx * dt;
      if (solid(nx + Math.sign(m.vx) * K.w / 2, m.y - K.h / 2) || solid(nx + Math.sign(m.vx) * K.w / 2, m.y - 2)) {
        m.vx = -m.vx * 0.4; nx = m.x;
      }
      m.x = nx;
      let ny = m.y + m.vy * dt;
      if (solid(m.x, ny) || solid(m.x - K.w / 2 + 1, ny) || solid(m.x + K.w / 2 - 1, ny)) {
        if (m.vy > 0) { m.onGround = true; ny = Math.floor(ny / TS) * TS; }
        m.vy = 0;
      }
      m.y = ny;
      if (inWater && Math.random() < dt * 1.5) KD.Fx.bubbles(m.x, m.y - K.h, 1);
    }
  }

  const shots = [];
  function shot(m, dx, dy) {
    const d = Math.hypot(dx, dy) || 1;
    shots.push({ x: m.x, y: m.y - m.K.h / 2, vx: dx / d * 78, vy: dy / d * 78, life: 2.4, dmg: m.K.dmg });
    KD.Sfx.play('swing');
  }
  function updateShots(dt, S) {
    const P = KD.Player.P;
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life <= 0 || solid(s.x, s.y)) { KD.Fx.blood(s.x, s.y, 4, 'ROT.2'); shots.splice(i, 1); continue; }
      if (Math.abs(s.x - P.x) < 7 && Math.abs(s.y - (P.y - P.h / 2)) < 9) {
        KD.Player.hurt(s.dmg, S, 'a trench horror');
        shots.splice(i, 1);
      }
    }
  }

  /* the player's swing: an arc in front, not a rectangle */
  function hitArc(x, y, face, reach, dmg, S, wpn) {
    let hitAny = false;
    for (const m of list) {
      if (m.dead > 0) continue;
      const dx = m.x - x, dy = m.y - m.K.h / 2 - y;
      if (dx * face < -4) continue;                 // behind us
      if (Math.hypot(dx, dy) > reach + m.K.w / 2) continue;
      hurtMob(m, dmg, S, face, wpn);
      hitAny = true;
    }
    if (hitAny) { KD.Sfx.play('hit'); KD.Fx.shake(2); }
  }
  function hurtMob(m, dmg, S, face, wpn) {
    const armour = m.K.armour || 0;
    const crit = Math.random() < ((S.stats.critChance || 0) + ((wpn && wpn.crit) || 0)) / 100;
    let d = Math.max(1, Math.round(dmg * (crit ? (S.stats.critDmg || 2) : 1)) - armour);
    m.hp -= d;
    m.hurtT = 0.18;
    m.vx += (face || 1) * 40 * (S.stats.knockback || 1) * ((wpn && wpn.knock) || 1);
    m.vy -= 30;
    KD.Fx.blood(m.x, m.y - m.K.h / 2, crit ? 8 : 5);
    KD.Fx.num(m.x, m.y - m.K.h - 4, (crit ? '!' : '') + d, crit ? 'GOLD.3' : 'BONE.2');
    if (S.stats.lifesteal && Math.random() < S.stats.lifesteal) KD.Player.heal(1);
    /* legendary prefixes carry an effect string, and it has to mean something */
    if (wpn && wpn.effect) {
      if (wpn.effect === 'lifesteal' && Math.random() < 0.34) KD.Player.heal(1);
      else if (wpn.effect === 'quake') { KD.Fx.shake(5); splash(m, S, Math.ceil(d * 0.5), 26); }
      else if (wpn.effect === 'chain' && !m.chained) { m.chained = 1; splash(m, S, Math.ceil(d * 0.6), 34); }
    }
    if (m.hp <= 0) kill(m, S);
  }
  /* an area hit that cannot recurse into itself */
  function splash(from, S, dmg, radius) {
    for (const o of list) {
      if (o === from || o.dead > 0) continue;
      if (Math.hypot(o.x - from.x, o.y - from.y) > radius) continue;
      o.hp -= dmg; o.hurtT = 0.16;
      KD.Fx.num(o.x, o.y - o.K.h - 4, dmg, 'ROT.3');
      KD.Fx.blood(o.x, o.y - o.K.h / 2, 4, 'ROT.2');
      if (o.hp <= 0) kill(o, S);
    }
    from.chained = 0;
  }
  function kill(m, S) {
    m.dead = 0.35;
    S.S.kills++;
    S.addXp(Math.round(m.K.xp * (S.stats.xpGain || 1)));
    KD.Sfx.play('kill');
    KD.Fx.blood(m.x, m.y - m.K.h / 2, 14);
    for (const d of m.K.drop) if (Math.random() < 0.6) S.give(d, 1);
    S.earn(2 + Math.round(m.K.xp * 0.8));
    if (m.K.boss) {
      S.S.flags.baronDead = 1;
      S.give('crown', 1);
      S.save();
      KD.Game.win();
    }
  }

  function draw(ctx, cam) {
    for (const m of list) {
      const windName = m.K.spr + '_wind';
      const base = (m.state === 'wind' && KD.PX.hasAny(windName)) ? windName : m.K.spr;
      const spr = KD.PX.frameOf(base, m.anim);
      const name = KD.PX.has(spr) ? spr : null;
      if (!name) {
        /* the art has not landed yet: a readable placeholder box, still no circles */
        const px = Math.round(m.x - m.K.w / 2 - cam.x), py = Math.round(m.y - m.K.h - cam.y);
        KD.Screen.rect(px, py, m.K.w, m.K.h, m.hurtT > 0 ? 'BONE.2' : 'CORAL.1');
        KD.Screen.frame(px, py, m.K.w, m.K.h, 'INK.0');
        continue;
      }
      const s = KD.PX.get(name);
      const px = Math.round(m.x - s.w / 2 - cam.x), py = Math.round(m.y - s.h - cam.y);
      if (px < -60 || px > KD.W + 60) continue;
      /* the wind-up flashes, so you know to move */
      if (m.state === 'wind' && ((m.stateT * 30) | 0) % 2 === 0) {
        KD.Dither.fill(ctx, px, py, s.w, s.h, 'BLOOD.3', 0.6);
      }
      /* a mob in an unlit cave is a silhouette, not a glowing sticker */
      const l = KD.World.lightAt((m.x / TS) | 0, ((m.y - m.K.h / 2) / TS) | 0);
      const pl = Math.hypot(m.x - KD.Player.P.x, m.y - KD.Player.P.y);
      const lit = Math.max(l, pl < 40 ? KD.Light.MAX - 4 : 0);
      KD.PX.blit(ctx, name, px, py, { anchor: false, flipX: m.face < 0, shade: KD.PX.bandFor(lit, KD.Light.MAX) });
      if (m.hurtT > 0) KD.Dither.fill(ctx, px, py, s.w, s.h, 'WHITE', 0.7);
      /* a boss gets a health bar */
      if (m.K.boss) {
        const bw = 70;
        KD.Screen.rect(KD.W / 2 - bw / 2 - 1, 15, bw + 2, 6, 'INK.0');
        KD.Screen.rect(KD.W / 2 - bw / 2, 16, Math.round(bw * (m.hp / m.hpMax)), 4, 'BLOOD.2');
        KD.Text.draw('BARON FOAMHELM', KD.W / 2, 6, 'GOLD.3', { align: 'center', shadow: 'INK.0' });
      }
    }
    for (const s of shots) {
      KD.Screen.rect(Math.round(s.x - cam.x) - 1, Math.round(s.y - cam.y) - 1, 3, 3, 'ROT.3');
      KD.Screen.rect(Math.round(s.x - cam.x), Math.round(s.y - cam.y), 1, 1, 'ROT.1');
    }
  }
  const count = () => list.length;
  return { KINDS, list, spawn, clear, update, updateShots, hitArc, hurtMob, draw, count, shots };
})();
