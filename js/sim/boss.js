/* ============================================================
   sim/boss.js - the fight at the bottom of The Drop.
   The new King of the Atlantic: a preening showman with an
   octopus riding his shoulders and an army of them at his call.
   Four phases, one per outfit, and the outfit IS the telegraph -
   you learn to read what he is wearing.
   ============================================================ */
KD.Boss = (function () {
  const TS = 8;

  /* Each phase: the outfit sprite, the hp band it covers, how it fights and
     how many minions it keeps on the floor. Read the outfit, know the fight. */
  const PHASES = [
    { id: 'scale', spr: 'king2_scale', at: 1.00, name: 'SCALE ARMOUR',
      taunt: '"You used to be somebody."',
      speed: 40, dmg: 2, cd: [1.5, 2.2], minions: 2, kinds: ['octo_grunt'],
      moves: ['charge', 'slam'] },
    { id: 'gold', spr: 'king2_gold', at: 0.75, name: 'GOLD PLATE',
      taunt: '"Do you like it? I had it made."',
      speed: 30, dmg: 2, cd: [1.1, 1.8], minions: 3, kinds: ['octo_grunt', 'octo_caster'],
      moves: ['slam', 'summon', 'sweep'] },
    { id: 'ink', spr: 'king2_ink', at: 0.45, name: 'INK',
      taunt: '"Then let us do this in the dark."',
      speed: 52, dmg: 3, cd: [0.9, 1.4], minions: 4, kinds: ['octo_swarm', 'octo_ink', 'octo_brute'],
      moves: ['ink', 'charge', 'summon', 'sweep'] },
    { id: 'torn', spr: 'king2_torn', at: 0.20, name: 'NO ARMOUR AT ALL',
      taunt: '"FINE. Just us then."',
      speed: 74, dmg: 3, cd: [0.6, 1.0], minions: 2, kinds: ['octo_brute'],
      moves: ['charge', 'slam', 'sweep', 'ink'] }
  ];

  let B = null;                      // the boss, while the fight is on
  const minions = [];
  const hazards = [];                // ink clouds and shockwaves

  const HP = 900;

  function start(tx, ty) {
    B = {
      x: tx * TS, y: ty * TS, vx: 0, vy: 0, face: -1,
      hp: HP, hpMax: HP, phase: 0, state: 'entrance', stateT: 2.2,
      t: 0, anim: 0, hurtT: 0, cd: 1.8, move: null, moveT: 0, onGround: false,
      said: -1, mirror: 0
    };
    minions.length = 0; hazards.length = 0;
    KD.Fx.flash('ROT.3', 0.5);
    KD.Fx.shake(8);
    KD.Sfx.play('die');
    return B;
  }
  const active = () => !!B;
  const boss = () => B;
  function stop() { B = null; minions.length = 0; hazards.length = 0; }

  const phase = () => PHASES[B.phase];
  function checkPhase(S) {
    const f = B.hp / B.hpMax;
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (f <= PHASES[i].at && B.phase < i) {
        B.phase = i;
        B.state = 'change'; B.stateT = 1.6; B.vx = 0;
        KD.Fx.flash('WHITE', 0.3);
        KD.Fx.shake(7);
        KD.Sfx.play('levelup');
        S.say(PHASES[i].taunt + '  [' + PHASES[i].name + ']', 'ROT.3');
        /* he clears the floor and brings fresh ones with each costume */
        minions.length = 0;
        summon(S, PHASES[i].minions);
        return;
      }
    }
  }

  function summon(S, n) {
    const ph = phase();
    for (let i = 0; i < n; i++) {
      const kind = ph.kinds[(Math.random() * ph.kinds.length) | 0];
      minions.push({
        kind, x: B.x + (Math.random() - 0.5) * 120, y: B.y - 20 - Math.random() * 40,
        vx: 0, vy: 0, hp: kind === 'octo_brute' ? 60 : kind === 'octo_swarm' ? 12 : 26,
        hpMax: 60, face: -1, t: Math.random() * 9, anim: 0, hurtT: 0, cd: 1, dead: 0,
        w: kind === 'octo_brute' ? 22 : kind === 'octo_swarm' ? 10 : 16,
        h: kind === 'octo_brute' ? 20 : kind === 'octo_swarm' ? 10 : 16,
        dmg: kind === 'octo_brute' ? 2 : 1
      });
    }
    KD.Sfx.play('open');
  }

  const solid = (px, py) => {
    const T = KD.Tiles.get(KD.World.at((px / TS) | 0, (py / TS) | 0));
    return !!(T && T.solid);
  };

  function pickMove() {
    const ph = phase();
    B.move = ph.moves[(Math.random() * ph.moves.length) | 0];
    B.moveT = 0;
    B.state = 'wind';
    B.stateT = B.move === 'charge' ? 0.5 : B.move === 'ink' ? 0.7 : 0.42;
  }

  function update(dt, S) {
    if (!B) return;
    const P = KD.Player.P;
    B.t += dt; B.anim += dt;
    if (B.hurtT > 0) B.hurtT -= dt;
    if (B.mirror > 0) B.mirror -= dt;
    const ph = phase();
    B.face = P.x > B.x ? 1 : -1;

    /* gravity, so he lands and reads as heavy */
    B.vy += 420 * dt;
    let ny = B.y + B.vy * dt;
    B.onGround = false;
    if (solid(B.x, ny) || solid(B.x - 18, ny) || solid(B.x + 18, ny)) {
      if (B.vy > 0) { B.onGround = true; ny = Math.floor(ny / TS) * TS; }
      B.vy = 0;
    }
    B.y = ny;

    /* He does not swing while somebody is talking - and in the throne scene
       the somebody is him. The cutscene plays over this arena now, so the
       fight stands still through it: he keeps breathing and he keeps
       falling, and the moment the last line lands he starts. */
    if (KD.Cut && KD.Cut.active) { B.vx *= 0.86; return; }

    B.stateT -= dt;
    if (B.state === 'entrance') {
      if (B.stateT <= 0) {
        B.state = 'idle';
        S.say('"' + 'You came all this way.' + '"  [' + ph.name + ']', 'ROT.3');
        summon(S, ph.minions);
      }
    } else if (B.state === 'change') {
      if (B.stateT <= 0) B.state = 'idle';
    } else if (B.state === 'idle') {
      /* pace, and every so often check himself in the mirror - it is an
         opening, and it tells you he is beatable */
      const d = P.x - B.x;
      B.vx = Math.sign(d) * ph.speed * (Math.abs(d) > 40 ? 1 : 0.2);
      B.cd -= dt;
      if (B.cd <= 0) {
        if (Math.random() < 0.16) { B.state = 'vain'; B.stateT = 1.3; B.mirror = 1.3; B.vx = 0; }
        else pickMove();
        B.cd = ph.cd[0] + Math.random() * (ph.cd[1] - ph.cd[0]);
      }
    } else if (B.state === 'vain') {
      B.vx = 0;
      if (B.stateT <= 0) B.state = 'idle';
    } else if (B.state === 'wind') {
      B.vx *= 0.85;
      if (B.stateT <= 0) doMove(S);
    } else if (B.state === 'act') {
      act(dt, S);
      if (B.stateT <= 0) { B.state = 'recover'; B.stateT = ph.id === 'torn' ? 0.35 : 0.6; B.vx = 0; }
    } else if (B.state === 'recover') {
      B.vx *= 0.8;
      if (B.stateT <= 0) B.state = 'idle';
    }

    /* horizontal */
    let nx = B.x + B.vx * dt;
    if (solid(nx + Math.sign(B.vx) * 18, B.y - 20)) { B.vx = 0; nx = B.x; }
    B.x = nx;

    minionTick(dt, S);
    hazardTick(dt, S);
    checkPhase(S);
  }

  function doMove(S) {
    const P = KD.Player.P;
    B.state = 'act';
    if (B.move === 'charge') {
      B.stateT = 0.7;
      B.vx = B.face * (phase().speed * 4.2);
      KD.Sfx.play('swing');
    } else if (B.move === 'slam') {
      B.stateT = 0.35;
      B.vy = -150;
      KD.Sfx.play('swing');
    } else if (B.move === 'sweep') {
      B.stateT = 0.5;
      KD.Sfx.play('swing');
    } else if (B.move === 'summon') {
      B.stateT = 0.4;
      summon(S, 2);
    } else if (B.move === 'ink') {
      B.stateT = 0.45;
      for (let i = 0; i < 5; i++) {
        const a = -2.6 + i * 0.65;
        hazards.push({ kind: 'ink', x: B.x, y: B.y - 22, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90,
                       life: 2.6, r: 6, dmg: phase().dmg });
      }
      KD.Sfx.play('hurt');
    }
  }
  function act(dt, S) {
    const P = KD.Player.P, ph = phase();
    const hit = (reach) => Math.abs(P.x - B.x) < reach && Math.abs((P.y - P.h / 2) - (B.y - 20)) < 34;
    if (B.move === 'charge') {
      if (hit(24)) { KD.Player.hurt(ph.dmg, S, 'the King'); B.vx *= 0.3; }
      if (solid(B.x + B.face * 20, B.y - 20)) { B.vx = 0; KD.Fx.shake(4); }
    } else if (B.move === 'slam') {
      if (B.onGround && B.vy === 0 && !B.slammed) {
        B.slammed = 1;
        KD.Fx.shake(6);
        KD.Sfx.play('break');
        hazards.push({ kind: 'wave', x: B.x, y: B.y - 4, vx: -170, vy: 0, life: 1.1, r: 8, dmg: ph.dmg });
        hazards.push({ kind: 'wave', x: B.x, y: B.y - 4, vx: 170, vy: 0, life: 1.1, r: 8, dmg: ph.dmg });
      }
      if (!B.onGround) B.slammed = 0;
    } else if (B.move === 'sweep') {
      if (hit(46)) KD.Player.hurt(ph.dmg, S, 'a tentacle');
    }
  }

  function minionTick(dt, S) {
    const P = KD.Player.P;
    for (let i = minions.length - 1; i >= 0; i--) {
      const m = minions[i];
      m.t += dt; m.anim += dt;
      if (m.hurtT > 0) m.hurtT -= dt;
      if (m.dead > 0) { m.dead -= dt; if (m.dead <= 0) minions.splice(i, 1); continue; }
      const dx = P.x - m.x, dy = (P.y - P.h / 2) - m.y;
      const d = Math.hypot(dx, dy) || 1;
      if (m.kind === 'octo_ink') {
        /* an ink cloud drifts and leaks hazard */
        m.x += Math.sin(m.t) * 14 * dt; m.y += Math.cos(m.t * 0.7) * 10 * dt;
        m.cd -= dt;
        if (m.cd <= 0) { m.cd = 1.6; hazards.push({ kind: 'ink', x: m.x, y: m.y, vx: 0, vy: 22, life: 2, r: 5, dmg: 1 }); }
      } else {
        const sp = m.kind === 'octo_swarm' ? 66 : m.kind === 'octo_brute' ? 30 : 44;
        m.x += (dx / d) * sp * dt;
        m.y += (dy / d) * sp * 0.7 * dt;
      }
      m.face = dx > 0 ? 1 : -1;
      m.cd -= dt;
      if (d < 16 && m.cd <= 0) { m.cd = 1.2; KD.Player.hurt(m.dmg, S, 'an octopus'); }
    }
  }
  function hazardTick(dt, S) {
    const P = KD.Player.P;
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.life -= dt;
      h.x += h.vx * dt; h.y += h.vy * dt;
      if (h.kind === 'wave' && solid(h.x, h.y - 4)) h.life = 0;
      if (h.life <= 0) { hazards.splice(i, 1); continue; }
      if (Math.abs(h.x - P.x) < h.r + 6 && Math.abs(h.y - (P.y - P.h / 2)) < h.r + 10) {
        KD.Player.hurt(h.dmg, S, h.kind === 'ink' ? 'ink' : 'a shockwave');
        hazards.splice(i, 1);
      }
    }
  }

  /* the player's swing lands on the boss and his minions */
  function playerHit(x, y, face, reach, dmg, S, wpn) {
    let any = false;
    if (B && B.state !== 'entrance') {
      const dx = B.x - x, dy = (B.y - 20) - y;
      if (dx * face >= -6 && Math.hypot(dx, dy) < reach + 20) {
        /* he is untouchable mid-charge, and wide open while preening */
        const mult = B.mirror > 0 ? 2.5 : (B.state === 'act' && B.move === 'charge' ? 0.35 : 1);
        const d = Math.max(1, Math.round(dmg * mult));
        B.hp -= d; B.hurtT = 0.16;
        KD.Fx.num(B.x, B.y - 46, (mult > 2 ? '!' : '') + d, mult > 2 ? 'GOLD.3' : 'BONE.2');
        KD.Fx.blood(B.x, B.y - 24, 7, 'ROT.2');
        any = true;
        if (B.hp <= 0) return finish(S);
      }
    }
    for (const m of minions) {
      if (m.dead > 0) continue;
      const dx = m.x - x, dy = m.y - y;
      if (dx * face < -6) continue;
      if (Math.hypot(dx, dy) > reach + m.w / 2) continue;
      m.hp -= dmg; m.hurtT = 0.15;
      KD.Fx.blood(m.x, m.y, 5, 'ROT.2');
      KD.Fx.num(m.x, m.y - m.h, dmg, 'BONE.2');
      any = true;
      if (m.hp <= 0) { m.dead = 0.3; S.addXp(9); S.earn(6); KD.Sfx.play('kill'); }
    }
    if (any) { KD.Sfx.play('hit'); KD.Fx.shake(2); }
    return any;
  }
  function finish(S) {
    S.S.flags.kingDead = 1;
    S.give('crown', 1);
    S.addXp(600);
    S.earn(4000);
    KD.Fx.flash('GOLD.3', 0.7);
    KD.Fx.shake(10);
    KD.Sfx.play('victory');
    stop();
    S.save();
    KD.Game.win();
    return true;
  }

  function draw(ctx, cam) {
    for (const h of hazards) {
      const px = Math.round(h.x - cam.x), py = Math.round(h.y - cam.y);
      if (h.kind === 'ink') {
        KD.Dither.fill(ctx, px - h.r, py - h.r, h.r * 2, h.r * 2, 'ROT.1', 0.8);
        KD.Screen.rect(px - 1, py - 1, 3, 3, 'ROT.3');
      } else {
        KD.Screen.rect(px - h.r, py - 6, h.r * 2, 8, 'WATER.2');
        KD.Screen.rect(px - h.r, py - 7, h.r * 2, 1, 'BONE.2');
      }
    }
    for (const m of minions) {
      const name = KD.PX.frameOf(m.kind, m.anim);
      const px = Math.round(m.x - cam.x), py = Math.round(m.y - cam.y);
      if (KD.PX.has(name)) {
        const s = KD.PX.get(name);
        KD.PX.blit(ctx, name, px - (s.w >> 1), py - (s.h >> 1), { anchor: false, flipX: m.face < 0 });
        if (m.hurtT > 0) KD.Dither.fill(ctx, px - (s.w >> 1), py - (s.h >> 1), s.w, s.h, 'WHITE', 0.7);
      } else {
        KD.Screen.rect(px - (m.w >> 1), py - (m.h >> 1), m.w, m.h, m.hurtT > 0 ? 'WHITE' : 'ROT.2');
        KD.Screen.frame(px - (m.w >> 1), py - (m.h >> 1), m.w, m.h, 'INK.0');
      }
    }
    if (!B) return;
    const ph = phase();
    const base = B.state === 'wind' && KD.PX.hasAny('king2_wind') ? 'king2_wind' : ph.spr;
    const name = KD.PX.frameOf(base, B.anim);
    const px = Math.round(B.x - cam.x), py = Math.round(B.y - cam.y);
    if (KD.PX.has(name)) {
      const s = KD.PX.get(name);
      KD.PX.blit(ctx, name, px - (s.w >> 1), py - s.h, { anchor: false, flipX: B.face < 0 });
      /* The wind-up. It was a 0.65-density dither over the whole forty-pixel
         sprite, flashing, which turns the largest thing in the fight into an
         orange checkerboard for the length of the telegraph. It is the same
         lock-on bracket the sharks use now, so a tell means the same thing
         everywhere in the game, with a hard line along his edges. */
      if (B.state === 'wind') {
        KD.Mark.threat(px, py - (s.h >> 1), KD.Game.t, false,
                       { rx: (s.w >> 1) + 2, ry: (s.h >> 1) + 2 });
        if (((B.stateT * 22) | 0) % 2 === 0) {
          KD.Screen.rect(px - (s.w >> 1), py - s.h, s.w, 2, 'BLOOD.3');
          KD.Screen.rect(px - (s.w >> 1), py - 2, s.w, 2, 'BLOOD.3');
        }
      }
      if (B.hurtT > 0) KD.Dither.fill(ctx, px - (s.w >> 1), py - s.h, s.w, s.h, 'WHITE', 0.7);
    } else {
      KD.Screen.rect(px - 24, py - 44, 48, 44, B.hurtT > 0 ? 'WHITE' : 'ROT.2');
      KD.Screen.frame(px - 24, py - 44, 48, 44, 'GOLD.2');
      KD.Text.draw('KING', px, py - 26, 'GOLD.3', { align: 'center' });
    }
    if (B.mirror > 0) {
      KD.Text.draw('...looking good', px, py - 56, 'GOLD.2', { tiny: true, align: 'center', shadow: 'INK.0' });
    }
    /* the health bar, and the outfit you are fighting */
    const bw = Math.min(220, KD.W - 60);
    const bx = (KD.W - bw) >> 1;
    KD.Screen.rect(bx - 2, 16, bw + 4, 12, 'INK.0');
    KD.Screen.rect(bx, 18, Math.round(bw * Math.max(0, B.hp / B.hpMax)), 8, 'ROT.2');
    KD.Screen.rect(bx, 18, Math.round(bw * Math.max(0, B.hp / B.hpMax)), 1, 'ROT.3');
    for (const p of PHASES) {
      const mx = bx + Math.round(bw * p.at);
      KD.Screen.rect(mx, 16, 1, 12, 'INK.0');
    }
    KD.Text.draw('THE KING OF THE ATLANTIC', KD.W / 2, 6, 'GOLD.3', { align: 'center', shadow: 'INK.0' });
    KD.Text.draw(ph.name, KD.W / 2, 30, 'ROT.3', { tiny: true, align: 'center', shadow: 'INK.0' });
  }
  return { PHASES, start, stop, active, boss, update, draw, playerHit,
           get minions() { return minions; }, get hazards() { return hazards; } };
})();
