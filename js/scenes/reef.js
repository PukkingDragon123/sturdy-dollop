/* ============================================================
   reef.js - the dive. Momentum swimming, spear physics, net
   catches, fish AI, hazards, Gary, combos, air, loot.
   ============================================================ */
DZ.Scenes.reef = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, W = DZ.Water, PAL = DZ.PAL;
  const WORLD_W = 780, WORLD_H = 318;
  const FLOOR = WORLD_H - 26;

  let phase = 'select', zone = 0, t = 0;
  let cam, p, fish = [], spears = [], loot = [], hazards = [], gary = null;
  let air = 0, airMax = 0, combo = 0, comboT = 0, bestCombo = 0, score = 0;
  let caught = {}, caughtN = 0, spearCd = 0, netCd = 0, netFx = 0, hurtT = 0, endT = 0;
  let deco = [], vents = [], sonarBoost = 0, msg = null, msgT = 0, garyT = 0, sharkHits = 0, tooth = 0;
  let bagCap = 12, gear = {};

  /* ---------------- lifecycle ---------------- */
  let cameFrom = 'ranch';
  function enter(args) {
    t = 0;
    cameFrom = (args && args.from) || 'ranch';
    if (args && args.zone !== undefined) { zone = args.zone; start(); }
    else { phase = 'select'; zone = Math.min(maxZone(), zone); }
  }
  function maxZone() { return Math.min(3, DZ.State.S.gear.tank); }
  const ZONE_PLACE = ['shallows', 'kelp', 'colonnade', 'abyss'];
  function zoneBlock(i) {
    const S = DZ.State.S;
    if (i > maxZone()) return { why: 'NEEDS', what: DZ.Items.GEAR.tank.tiers[i].name };
    if (!DZ.Places.unlocked(S, ZONE_PLACE[i])) {
      const pl = DZ.Places.byId[ZONE_PLACE[i]];
      return { why: 'TALK TO', what: pl.npc ? pl.npc.name : 'someone', map: true };
    }
    return null;
  }

  function start() {
    const S = DZ.State.S;
    gear = {
      spear: DZ.Items.gearTier('spear', S.gear.spear),
      net: DZ.Items.gearTier('net', S.gear.net),
      fins: DZ.Items.gearTier('fins', S.gear.fins),
      tank: DZ.Items.gearTier('tank', S.gear.tank),
      bag: DZ.Items.gearTier('bag', S.gear.bag)
    };
    bagCap = gear.bag.cap;
    airMax = gear.tank.air * (S.buffs.fizz ? 1.3 : 1);
    air = airMax;
    sonarBoost = DZ.Upgrades.value(S, 'sonar') + (S.buffs.sonar ? 2 : 0);
    S.buffs.fizz = false; S.buffs.sonar = false;
    phase = 'dive';
    cam = new DZ.Camera(DZ.W, DZ.H, WORLD_W, WORLD_H);
    p = { x: WORLD_W / 2, y: 70, vx: 0, vy: 0, dir: 1, dashCd: 0, dashT: 0, kick: 0, aim: 0 };
    fish = []; spears = []; loot = []; hazards = []; gary = null; garyT = U.rnd(22, 40);
    combo = 0; comboT = 0; bestCombo = 0; score = 0; caught = {}; caughtN = 0;
    spearCd = 0; netCd = 0; netFx = 0; hurtT = 0; endT = 0; sharkHits = 0; tooth = 0;
    const target = 20 + zone * 3;
    for (let i = 0; i < target; i++) spawnFish(true);
    for (let i = 0; i < 4; i++) {                      // a welcoming committee
      const f = spawnFish(true);
      f.x = p.x + U.rnd(-120, 120); f.y = p.y + U.rnd(-60, 70);
    }
    cam.follow(p.x, p.y, 0, 0, 1, 0); cam.snap();
    // static hazards
    hazards = [];
    for (let i = 0; i < 5 + zone * 3; i++) {
      hazards.push({ kind: 'urchin', x: U.rnd(40, WORLD_W - 40), y: FLOOR - 4, hit: 0 });
    }
    vents = [];
    for (let i = 0; i < 5; i++) vents.push({ x: U.rnd(30, WORLD_W - 30), tt: U.rnd(0, 2) });
    deco = [];
    for (let i = 0; i < 40; i++) {
      deco.push({
        kind: U.pick(zone === 2 ? ['pillar', 'arch', 'statue', 'pillar_broken', 'rock'] :
                     zone === 3 ? ['rock', 'vent', 'pillar_broken', 'urchin'] :
                     zone === 1 ? ['kelp', 'kelp', 'rock', 'coral_fan', 'anemone'] :
                                  ['coral_fan', 'coral_tube', 'rock', 'kelp', 'clam_shell']),
        x: U.rnd(10, WORLD_W - 20), z: U.rnd(0.45, 1), h: U.rnd(40, 110), seed: U.rnd(0, 9)
      });
    }
    DZ.State.event('zone', { zone });
    say(DZ.ZONES[zone].name.toUpperCase() + ' - ' + DZ.ZONES[zone].blurb, 3);
    DZ.Audio.play('splash');
  }

  function say(text, time) { msg = text; msgT = time || 2.2; }

  function spawnFish(anywhere) {
    const sp = DZ.Species.rollFor(zone, sonarBoost);
    let x, y;
    if (anywhere) { x = U.rnd(30, WORLD_W - 30); y = U.rnd(40, FLOOR - 10); }
    else {
      // spawn off-camera
      const side = U.chance(0.5) ? -1 : 1;
      x = U.clamp(cam.x + (side > 0 ? DZ.W + 40 : -40), 20, WORLD_W - 20);
      y = U.rnd(40, FLOOR - 10);
    }
    if (sp.behavior === 'bottom') y = FLOOR - 6;
    if (sp.behavior === 'drift') y = U.rnd(50, FLOOR - 40);
    const f = {
      sp, hp: sp.hp, x, y, vx: U.rnd(-10, 10), vy: 0, dir: U.chance(0.5) ? 1 : -1,
      ph: U.rnd(0, 9), tx: x, ty: y, retarget: 0, flash: 0, stun: 0, bite: 0,
      panic: 0, id: U.uid()
    };
    fish.push(f);
    // schools travel in groups
    if (sp.behavior === 'school' && fish.length < 40) {
      const n = U.rndInt(2, 5);
      for (let i = 0; i < n; i++) {
        fish.push(Object.assign({}, f, { id: U.uid(), x: x + U.rnd(-26, 26), y: y + U.rnd(-16, 16), ph: U.rnd(0, 9) }));
      }
    }
    return f;
  }

  /* ---------------- update ---------------- */
  function update(dt) {
    t += dt; W.tick(dt);
    if (phase !== 'dive') return;
    if (msgT > 0) msgT -= dt;
    if (endT > 0) { endT -= dt; if (endT <= 0) surface(); return; }

    const S = DZ.State.S;
    // ---- air ----
    air -= dt * (1 + (p.dashT > 0 ? 1.2 : 0));
    if (air <= 0) { air = 0; blackout(); return; }
    if (air < airMax * 0.18 && U.chance(dt * 3)) DZ.Audio.play('blip');

    // ---- player physics ----
    const ax = DZ.Input.axis();
    const thrust = 430 * gear.fins.thrust;
    p.vx += ax.x * thrust * dt;
    p.vy += ax.y * thrust * dt;
    p.vy += 26 * dt;                                   // gentle sink so you must swim
    const drag = Math.pow(p.dashT > 0 ? 0.5 : 0.05, dt);
    p.vx *= drag; p.vy *= drag;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.x < 10) { p.x = 10; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x > WORLD_W - 10) { p.x = WORLD_W - 10; p.vx = -Math.abs(p.vx) * 0.4; }
    if (p.y < 12) { p.y = 12; p.vy = Math.abs(p.vy) * 0.3; }
    if (p.y > FLOOR - 4) { p.y = FLOOR - 4; p.vy = -Math.abs(p.vy) * 0.35; DZ.FX.bubbles(p.x, p.y, 2); }
    if (Math.abs(p.vx) > 6) p.dir = p.vx > 0 ? 1 : -1;
    p.kick += (Math.hypot(p.vx, p.vy) * 0.05 + 2) * dt;
    if (Math.hypot(p.vx, p.vy) > 40 && U.chance(dt * 8)) DZ.FX.bubbles(p.x - p.dir * 6, p.y + 4, 1);

    // aim from mouse (screen -> world)
    const m = DZ.Input.mouse;
    const wmx = m.x + cam.x, wmy = m.y + cam.y;
    p.aim = Math.atan2(wmy - p.y, wmx - p.x);

    // ---- dash ----
    p.dashCd -= dt;
    if (p.dashT > 0) p.dashT -= dt;
    if (DZ.Input.isPressed('Space') && p.dashCd <= 0) {
      const imp = 300 * gear.fins.dash;
      const a = (Math.abs(ax.x) + Math.abs(ax.y)) > 0 ? Math.atan2(ax.y, ax.x) : p.aim;
      p.vx += Math.cos(a) * imp; p.vy += Math.sin(a) * imp;
      p.dashCd = 0.55; p.dashT = 0.22; air -= 0.6;
      DZ.FX.bubbles(p.x, p.y, 14, { vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, big: true });
      DZ.FX.ringWave(p.x, p.y, 3, 20, '#bfeaff', 0.3);
      DZ.Audio.play('dash');
      DZ.FX.shake(1.5);
    }

    // ---- spear ----
    spearCd -= dt;
    if ((m.down || m.click) && spearCd <= 0 && !DZ.UI.blocked()) {
      spearCd = gear.spear.reload;
      const sp = gear.spear;
      let aim = p.aim;
      // aim assist: snap to the nearest fish inside a forgiving cone
      let best = null, bestScore = 1e9;
      for (const f of fish) {
        if (f.dead) continue;
        const d = U.dist(f.x, f.y, p.x, p.y);
        if (d > 130) continue;
        let da = Math.atan2(f.y - p.y, f.x - p.x) - p.aim;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const cone = (sp.assist || 16) * Math.PI / 180;
        if (Math.abs(da) > cone) continue;
        const score = Math.abs(da) * 90 + d * 0.35;
        if (score < bestScore) { bestScore = score; best = { a: Math.atan2(f.y - p.y, f.x - p.x) }; }
      }
      if (best) aim = best.a;
      spears.push({ x: p.x + Math.cos(aim) * 8, y: p.y + Math.sin(aim) * 8,
                    vx: Math.cos(aim) * sp.speed + p.vx * 0.3, vy: Math.sin(aim) * sp.speed + p.vy * 0.3,
                    life: 1.0, dmg: sp.dmg, pierce: !!sp.pierce, hits: [], seek: sp.assist || 16 });
      p.vx -= Math.cos(p.aim) * 26; p.vy -= Math.sin(p.aim) * 26;   // recoil
      DZ.Audio.play('spear');
      DZ.FX.bubbles(p.x + Math.cos(p.aim) * 8, p.y + Math.sin(p.aim) * 8, 3);
    }
    // ---- net ----
    netCd -= dt;
    if ((m.rclick || DZ.Input.isPressed('KeyE')) && netCd <= 0) {
      netCd = gear.net.reload;
      netFx = 0.3;
      doNet();
    }
    if (netFx > 0) netFx -= dt;

    // ---- projectiles ----
    for (let i = spears.length - 1; i >= 0; i--) {
      const s = spears[i];
      s.life -= dt;
      s.vx *= Math.pow(0.62, dt); s.vy *= Math.pow(0.62, dt);
      s.vy += 14 * dt;
      // gentle homing so a near miss still connects
      let near = null, nd = 1e9;
      for (const f of fish) {
        if (f.dead || s.hits.includes(f.id)) continue;
        const d = U.dist2(f.x, f.y, s.x, s.y);
        if (d < 44 * 44 && d < nd) { nd = d; near = f; }
      }
      if (near) {
        const sp2 = Math.hypot(s.vx, s.vy) || 1;
        const wx = (near.x - s.x), wy = (near.y - s.y);
        const wl = Math.hypot(wx, wy) || 1;
        const k = U.clamp((s.seek || 16) / 12 * dt * 4, 0, 0.5);
        s.vx = (s.vx / sp2 * (1 - k) + wx / wl * k) * sp2;
        s.vy = (s.vy / sp2 * (1 - k) + wy / wl * k) * sp2;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      let dead = s.life <= 0 || s.y > FLOOR - 1 || s.x < 4 || s.x > WORLD_W - 4;
      // hit fish
      for (const f of fish) {
        if (f.dead || s.hits.includes(f.id)) continue;
        const r = hitRadius(f);
        if (U.dist2(s.x, s.y, f.x, f.y) < r * r) {
          hitFish(f, s.dmg, s.vx, s.vy);
          s.hits.push(f.id);
          if (!s.pierce) { dead = true; }
          break;
        }
      }
      if (gary && !s.hits.includes('gary') && U.dist2(s.x, s.y, gary.x, gary.y) < 240) {
        s.hits.push('gary');
        hitGary(s.vx, s.vy);
        if (!s.pierce) dead = true;
      }
      if (dead) {
        if (s.y > FLOOR - 2) DZ.FX.burst(s.x, FLOOR, 5, { col: ['#e2ce97', '#b79a5f'], speed: 40, g: 90 });
        spears.splice(i, 1);
      }
    }

    // ---- fish AI ----
    if (fish.filter((f) => !f.dead).length < 17 + zone * 3 && U.chance(dt * 3)) spawnFish(false);
    for (let i = fish.length - 1; i >= 0; i--) {
      const f = fish[i];
      if (f.dead) { fish.splice(i, 1); continue; }
      updateFish(f, dt);
      if (f.x < -60 || f.x > WORLD_W + 60) fish.splice(i, 1);
    }

    // ---- loot magnetism ----
    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i];
      l.life -= dt;
      l.delay = (l.delay || 0) - dt;
      const d = U.dist(l.x, l.y, p.x, p.y);
      if (l.delay <= 0) {
        // vacuum: dropped fish always finds its way to your bag
        l.pull = Math.min(560, (l.pull || 120) + 620 * dt);
        const k = l.pull;
        l.vx += ((p.x - l.x) / (d || 1)) * k * dt;
        l.vy += ((p.y - l.y) / (d || 1)) * k * dt;
        l.vx *= Math.pow(0.25, dt); l.vy *= Math.pow(0.25, dt);
        if (U.chance(dt * 12)) DZ.FX.part(l.x, l.y, { k: 'dot', col: '#bfeaff', life: 0.3, r: 1, drag: 0.5 });
      } else {
        l.vy += 40 * dt;
        l.vx *= Math.pow(0.35, dt); l.vy *= Math.pow(0.35, dt);
      }
      l.x += l.vx * dt; l.y += l.vy * dt;
      if (l.y > FLOOR - 2 && l.delay > 0) { l.y = FLOOR - 2; l.vy = -Math.abs(l.vy) * 0.2; }
      l.rot += l.spin * dt;
      if (d < 15) { collect(l); loot.splice(i, 1); continue; }
      if (l.life <= 0) loot.splice(i, 1);
    }

    // ---- Gary ----
    garyT -= dt;
    if (!gary && garyT <= 0 && caughtN > 2) {
      gary = { x: p.x + (U.chance(0.5) ? -1 : 1) * 260, y: U.rnd(60, FLOOR - 40), vx: 0, vy: 0,
               dir: 1, hp: 5, flash: 0, flee: 0, munch: 0 };
      say('GARY IS HERE. HE IS HUNGRY.', 2.4);
      DZ.Audio.play('thud'); DZ.FX.shake(4); DZ.FX.flash('#c53a3a', 0.2);
      garyT = 9999;
    }
    if (gary) updateGary(dt);

    // ---- combo decay ----
    if (comboT > 0) { comboT -= dt; if (comboT <= 0 && combo > 1) { combo = 0; } }
    if (hurtT > 0) hurtT -= dt;

    // ---- bubble vents ----
    for (const v of vents) {
      v.tt -= dt;
      if (v.tt <= 0) {
        v.tt = U.rnd(0.6, 2.2);
        if (Math.abs(v.x - (cam.x + DZ.W / 2)) < DZ.W) DZ.FX.bubbles(v.x, FLOOR - 4, U.rndInt(2, 5), { vy: -30 });
      }
    }
    // ---- camera ----
    cam.follow(p.x, p.y, p.vx, p.vy, dt, 0.22);

    // ---- exits ----
    if (DZ.Input.isPressed('Escape') || DZ.Input.isPressed('Enter')) surface();
    if (caughtN >= bagCap && endT <= 0) {
      say('BAG FULL! Surfacing...', 2);
      endT = 1.6;
      DZ.Audio.play('happy');
    }
  }

  function hitRadius(f) {
    const s = Px.size(f.sp.sprite);
    return Math.max(7, (s.w + s.h) / 3.2);
  }

  function updateFish(f, dt) {
    const sp = f.sp;
    const d = U.dist(f.x, f.y, p.x, p.y);
    if (f.flash > 0) f.flash -= dt;
    if (f.stun > 0) { f.stun -= dt; f.vx *= Math.pow(0.1, dt); f.vy *= Math.pow(0.1, dt); f.x += f.vx * dt; f.y += f.vy * dt; return; }
    if (f.panic > 0) f.panic -= dt;
    const spd = sp.speed * (f.panic > 0 ? 1.7 : 1);
    let ax = 0, ay = 0;

    switch (sp.behavior) {
      case 'school': {
        f.retarget -= dt;
        if (f.retarget <= 0) { f.tx = U.rnd(20, WORLD_W - 20); f.ty = U.rnd(40, FLOOR - 20); f.retarget = U.rnd(2, 5); }
        let cx = 0, cy = 0, n = 0, sx = 0, sy = 0;
        for (const o of fish) {
          if (o === f || o.sp.id !== sp.id) continue;
          const dd = U.dist2(o.x, o.y, f.x, f.y);
          if (dd < 900) {
            cx += o.x; cy += o.y; n++;
            if (dd < 90) { sx += f.x - o.x; sy += f.y - o.y; }
          }
        }
        if (n) { ax += ((cx / n) - f.x) * 0.7; ay += ((cy / n) - f.y) * 0.7; }
        ax += sx * 6; ay += sy * 6;
        ax += (f.tx - f.x) * 0.3; ay += (f.ty - f.y) * 0.3;
        if (d < 70) { ax += (f.x - p.x) * 3.2; ay += (f.y - p.y) * 3.2; f.panic = 0.8; }
        break;
      }
      case 'skittish':
        f.retarget -= dt;
        if (f.retarget <= 0) { f.tx = U.rnd(20, WORLD_W - 20); f.ty = U.rnd(40, FLOOR - 20); f.retarget = U.rnd(1, 3); }
        ax += (f.tx - f.x) * 0.5; ay += (f.ty - f.y) * 0.5;
        if (d < 100) { ax += (f.x - p.x) * 5; ay += (f.y - p.y) * 5; f.panic = 1.2; }
        break;
      case 'chase':
        if (d < 190) {
          ax += (p.x - f.x) * 2.4; ay += (p.y - f.y) * 2.4;
          if (d < 17 && f.bite <= 0) { biteMe(f); f.bite = 1.4; }
        } else {
          f.retarget -= dt;
          if (f.retarget <= 0) { f.tx = U.rnd(20, WORLD_W - 20); f.ty = U.rnd(40, FLOOR - 20); f.retarget = U.rnd(2, 4); }
          ax += (f.tx - f.x) * 0.4; ay += (f.ty - f.y) * 0.4;
        }
        if (f.bite > 0) f.bite -= dt;
        break;
      case 'bottom':
        f.retarget -= dt;
        if (f.retarget <= 0) { f.tx = U.clamp(f.x + U.rnd(-90, 90), 20, WORLD_W - 20); f.retarget = U.rnd(1.4, 3.4); }
        ax += (f.tx - f.x) * 0.8;
        f.ty = FLOOR - 6;
        ay += (f.ty - f.y) * 3;
        if (d < 40) { ax += (f.x - p.x) * 3; f.panic = 0.7;
          if (d < 13 && f.bite <= 0 && sp.flags.aggressive) { biteMe(f); f.bite = 1.6; } }
        if (f.bite > 0) f.bite -= dt;
        break;
      case 'drift':
      default:
        f.retarget -= dt;
        if (f.retarget <= 0) { f.tx = U.rnd(20, WORLD_W - 20); f.ty = U.rnd(40, FLOOR - 30); f.retarget = U.rnd(2.5, 6); }
        ax += (f.tx - f.x) * 0.25; ay += (f.ty - f.y) * 0.25 + Math.sin(t * 1.4 + f.ph) * 20;
        if (sp.flags.stings && d < 12) biteMe(f);
        break;
    }
    const al = Math.hypot(ax, ay) || 1;
    f.vx = U.damp(f.vx, (ax / al) * spd, 0.02, dt);
    f.vy = U.damp(f.vy, (ay / al) * spd, 0.02, dt);
    f.x += f.vx * dt;
    f.y += f.vy * dt + Math.sin(t * 5 + f.ph) * (sp.behavior === 'drift' ? 8 : 2) * dt;
    f.y = U.clamp(f.y, 14, FLOOR - 3);
    if (Math.abs(f.vx) > 4) f.dir = f.vx > 0 ? 1 : -1;
  }

  function biteMe(f) {
    if (hurtT > 0) return;
    hurtT = 0.8;
    air -= 2.2;
    const a = Math.atan2(p.y - f.y, p.x - f.x);
    p.vx += Math.cos(a) * 150; p.vy += Math.sin(a) * 150;
    DZ.FX.shake(5); DZ.FX.hitstop(0.05); DZ.FX.flash('#c53a3a', 0.18);
    DZ.FX.text(p.x, p.y - 14, f.sp.flags.stings ? 'ZAP!' : 'OW!', PAL.coral, { size: 9 });
    DZ.FX.burst(p.x, p.y, 10, { col: ['#ff6f6f', '#ffffff'], speed: 90 });
    DZ.Audio.play('hit');
    combo = 0;
  }

  function hitFish(f, dmg, vx, vy) {
    let dealt = dmg;
    if (f.sp.flags.armored) dealt = Math.max(0, dmg - 1);
    f.hp -= dealt;
    f.flash = 0.12;
    f.stun = 0.18;
    const a = Math.atan2(vy, vx);
    f.vx = Math.cos(a) * 120; f.vy = Math.sin(a) * 120;
    DZ.FX.hitstop(0.035);
    DZ.FX.shake(2.5);
    DZ.Audio.play(dealt <= 0 ? 'thud' : 'hit');
    if (dealt <= 0) {
      DZ.FX.text(f.x, f.y - 10, 'CLANG!', PAL.dim, { size: 7 });
      DZ.FX.burst(f.x, f.y, 6, { col: ['#ffffff', '#9fb4c4'], speed: 70 });
      return;
    }
    DZ.FX.burst(f.x, f.y, 8, { col: [f.sp.pal['1'], '#ffffff', f.sp.pal['3']], speed: 90 });
    if (f.hp <= 0) killFish(f);
  }

  function killFish(f) {
    f.dead = true;
    DZ.FX.chunks(f.x, f.y, 8, [f.sp.pal['1'], f.sp.pal['2'], '#ffffff']);
    DZ.FX.ringWave(f.x, f.y, 2, 16, '#ffffff', 0.25);
    DZ.Audio.play('pop');
    dropLoot(f, false);
  }

  function dropLoot(f, live) {
    loot.push({ sp: f.sp, live, x: f.x, y: f.y, vx: U.rnd(-40, 40), vy: -46,
                rot: 0, spin: U.rnd(-6, 6), life: 26, delay: 0.32 });
  }

  function doNet() {
    const r = gear.net.radius;
    const nx = p.x + Math.cos(p.aim) * 16, ny = p.y + Math.sin(p.aim) * 16;
    DZ.Audio.play('net');
    DZ.FX.ringWave(nx, ny, r * 0.4, r, '#dff6ff', 0.3);
    DZ.FX.bubbles(nx, ny, 6);
    netAt = { x: nx, y: ny, r, t: 0.28 };
    let got = 0;
    // loot gets scooped too
    for (let i = loot.length - 1; i >= 0; i--) {
      if (U.dist2(loot[i].x, loot[i].y, nx, ny) < r * r) { collect(loot[i]); loot.splice(i, 1); got++; }
    }
    for (const f of fish) {
      if (f.dead) continue;
      if (U.dist2(f.x, f.y, nx, ny) > r * r) continue;
      const catchable = f.sp.hp <= DZ.State.S.gear.net + 2 || f.stun > 0 || f.hp < f.sp.hp;
      if (catchable) {
        f.dead = true;
        const alive = U.chance(gear.net.live);
        DZ.FX.burst(f.x, f.y, 10, { col: [f.sp.pal['1'], '#ffffff'], speed: 70 });
        collect({ sp: f.sp, live: alive, x: f.x, y: f.y });
        got++;
      } else {
        const a = Math.atan2(f.y - ny, f.x - nx);
        f.vx = Math.cos(a) * 200; f.vy = Math.sin(a) * 200; f.panic = 1.4;
        DZ.FX.text(f.x, f.y - 10, 'too big!', PAL.dim, { size: 7, life: 0.7 });
      }
    }
    if (!got) DZ.FX.text(nx, ny - 12, 'whiff', PAL.dim2, { size: 7, life: 0.6 });
  }
  let netAt = null;

  function collect(l) {
    if (caughtN >= bagCap) {
      DZ.FX.text(l.x, l.y - 10, 'BAG FULL', PAL.coral, { size: 7 });
      return;
    }
    if (l.tooth) {
      tooth++;
      DZ.FX.text(l.x, l.y - 12, 'SHARK TOOTH!', PAL.gold, { size: 9 });
      DZ.Audio.play('cash');
      return;
    }
    DZ.State.addFish(l.sp.id, l.live, 1);
    caught[l.sp.id] = caught[l.sp.id] || { n: 0, live: 0, sp: l.sp };
    caught[l.sp.id].n++;
    if (l.live) caught[l.sp.id].live++;
    caughtN++;
    combo++; comboT = 3.6;
    bestCombo = Math.max(bestCombo, combo);
    score += 1 + combo * 0.5;
    DZ.Audio.play(l.live ? 'blip' : 'coin');
    const col = l.live ? PAL.kelp : PAL.gold;
    DZ.FX.text(l.x, l.y - 8, (l.live ? 'LIVE ' : '') + l.sp.name, col, { size: 7, life: 0.8 });
    DZ.FX.burst(l.x, l.y, 6, { col: [col, '#ffffff'], speed: 60 });
    if (combo >= 3) {
      DZ.FX.text(p.x, p.y - 22, 'x' + combo + ' ' + (combo >= 8 ? U.pick(DZ.Names.praise) : ''), PAL.cyan, { size: 8, life: 0.9 });
    }
    if (combo === 5 || combo === 10 || combo === 15) { DZ.Audio.play('happy'); DZ.FX.shake(3); }
    DZ.State.event('combo', { combo });
  }

  /* ---------------- Gary the shark ---------------- */
  function updateGary(dt) {
    const g = gary;
    if (g.flash > 0) g.flash -= dt;
    if (g.flee > 0) {
      g.flee -= dt;
      g.vx = U.damp(g.vx, g.dir * 260, 0.05, dt);
      g.vy = U.damp(g.vy, -20, 0.1, dt);
      if (g.flee <= 0) { gary = null; return; }
    } else {
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      const spd = 84 + Math.min(60, caughtN * 2);
      g.vx = U.damp(g.vx, Math.cos(a) * spd, 0.2, dt);
      g.vy = U.damp(g.vy, Math.sin(a) * spd, 0.2, dt);
      if (U.dist(g.x, g.y, p.x, p.y) < 21 && g.munch <= 0) {
        g.munch = 2.2;
        const steal = Math.min(caughtN, U.rndInt(1, 3));
        if (steal > 0) {
          let left = steal;
          for (const k in caught) {
            while (left > 0 && caught[k].n > 0) {
              const live = caught[k].live > 0;
              if (DZ.State.takeFish(k, live, 1)) {
                caught[k].n--; if (live) caught[k].live--;
                caughtN--; left--;
              } else break;
            }
            if (left <= 0) break;
          }
          DZ.FX.text(p.x, p.y - 16, 'GARY STOLE ' + (steal - left) + ' FISH!', PAL.coral, { size: 9 });
        } else DZ.FX.text(p.x, p.y - 16, 'GARY IS DISAPPOINTED', PAL.coral, { size: 8 });
        combo = 0;
        DZ.Audio.play('chomp'); DZ.FX.shake(7); DZ.FX.hitstop(0.08); DZ.FX.flash('#c53a3a', 0.3);
        const a2 = Math.atan2(p.y - g.y, p.x - g.x);
        p.vx += Math.cos(a2) * 220; p.vy += Math.sin(a2) * 220;
        g.dir = -Math.sign(Math.cos(a2)) || 1;
        g.flee = 1.4;
      }
    }
    if (g.munch > 0) g.munch -= dt;
    g.x += g.vx * dt; g.y += g.vy * dt;
    g.y = U.clamp(g.y, 20, FLOOR - 8);
    if (Math.abs(g.vx) > 8) g.dir = g.vx > 0 ? 1 : -1;
    if (U.chance(dt * 6)) DZ.FX.bubbles(g.x - g.dir * 14, g.y, 1);
  }

  function hitGary(vx, vy) {
    const g = gary;
    g.hp--; g.flash = 0.14; sharkHits++;
    DZ.FX.hitstop(0.05); DZ.FX.shake(4);
    DZ.FX.burst(g.x, g.y, 12, { col: ['#ffffff', '#7f9bab', '#ff6f6f'], speed: 110 });
    DZ.Audio.play('hit');
    const a = Math.atan2(vy, vx);
    g.vx += Math.cos(a) * 60; g.vy += Math.sin(a) * 60;
    if (g.hp <= 0) {
      g.flee = 1.6; g.dir = Math.sign(g.vx) || 1;
      DZ.FX.text(g.x, g.y - 16, 'GARY RETREATS!', PAL.gold, { size: 10 });
      loot.push({ tooth: true, sp: { name: 'Shark Tooth', sprite: 'skull', pal: {} }, live: false,
                  x: g.x, y: g.y, vx: 0, vy: -40, rot: 0, spin: 3, life: 30, delay: 0.4 });
      DZ.State.event('shark', {});
      DZ.Audio.play('cheer');
      DZ.FX.flash('#ffd24a', 0.2);
    } else {
      DZ.FX.text(g.x, g.y - 14, 'HP ' + g.hp, PAL.coral, { size: 7 });
    }
  }

  /* ---------------- end of dive ---------------- */
  function blackout() {
    say('You ran out of air. You woke up on the beach.', 3);
    DZ.Audio.play('error');
    DZ.FX.flash('#04121f', 0.6);
    surface(true);
  }
  function surface(rough) {
    phase = 'summary';
    DZ.State.event('combo', { combo: bestCombo });
    const bonus = Math.round(score * (2 + zone * 1.6));
    let toothClams = tooth * 320;
    summary = {
      rough: !!rough, bonus, toothClams,
      lines: Object.values(caught).sort((a, b) => b.n - a.n)
    };
    if (bonus > 0) DZ.State.earn(bonus, true);
    if (toothClams) DZ.State.earn(toothClams, true);
    DZ.State.save();
    DZ.Audio.play(rough ? 'error' : 'cash');
  }
  let summary = null;

  /* ---------------- draw ---------------- */
  function draw(ctx) {
    if (phase === 'select') return drawSelect(ctx);
    const Z = DZ.ZONES[zone];
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, Z.top, Z.bot, 12);

    ctx.save();
    cam.apply(ctx);

    // surface or rock ceiling
    if (zone === 0) {
      W.surfaceLine(ctx, 8);
      W.shafts(ctx, 7, 0.07, null, null, 8, WORLD_H);
    } else {
      for (let x = 0; x < WORLD_W; x += 4) {
        const h = 10 + Math.round(Math.sin(x * 0.07) * 3 + Math.sin(x * 0.021) * 3);
        Px.rect(ctx, x, 0, 4, h, '#08202f');
      }
      if (zone < 3) W.shafts(ctx, 4, 0.05, null, null, 10, WORLD_H);
    }
    // background ruins, then floor, then foreground decor
    for (const dc of deco) if (dc.z < 0.7) drawDeco(ctx, dc);
    W.ground(ctx, FLOOR, WORLD_W, zone === 3 ? '#2a2440' : '#e2ce97', zone === 3 ? '#161230' : '#b79a5f',
             0, WORLD_H - FLOOR + 8);
    W.caustics(ctx, FLOOR - 4, 4, zone === 0 ? 0.1 : 0.04);
    for (const dc of deco) if (dc.z >= 0.7) drawDeco(ctx, dc);
    for (const v of vents) Px.draw(ctx, 'vent', v.x - 3, FLOOR - 5, {});

    // hazards
    for (const h of hazards) {
      Px.draw(ctx, 'urchin', h.x, h.y - 7, { center: false });
      if (U.dist2(h.x + 3, h.y - 4, p.x, p.y) < 100) biteMe({ sp: { flags: { stings: true } } });
    }

    // loot
    for (const l of loot) {
      const bob = Math.sin(t * 4 + l.x) * 1.5;
      if (l.tooth) {
        ctx.globalAlpha = 0.8 + Math.sin(t * 8) * 0.2;
        Px.draw(ctx, 'skull', l.x, l.y + bob, { center: true, rot: l.rot });
        ctx.globalAlpha = 1;
        Px.ring(ctx, l.x, l.y + bob, 7, PAL.gold);
      } else {
        DZ.Fish.draw(ctx, l.sp, l.x, l.y + bob, { scale: 1.05, rot: l.rot, alpha: l.live ? 1 : 0.8,
          dead: !l.live, speed: l.live ? 1.4 : 0.15, tag: 'loot' + (l.sp.id || '') });
        if (l.live) { ctx.globalAlpha = 0.5; Px.ring(ctx, l.x, l.y + bob, 8, PAL.kelp); ctx.globalAlpha = 1; }
      }
    }

    // fish
    for (const f of fish) {
      if (f.dead) continue;
      const sq = 1 + Math.min(0.25, Math.abs(f.vx) / 400);
      const wob = Math.sin(t * 8 + f.ph) * 0.08;
      if (f.sp.flags.glow) {
        ctx.globalAlpha = 0.13 + Math.sin(t * 4 + f.ph) * 0.05;
        Px.disc(ctx, f.x, f.y, 7, f.sp.flags.glow);
        ctx.globalAlpha = 0.09;
        Px.disc(ctx, f.x, f.y, 11, f.sp.flags.glow);
        ctx.globalAlpha = 1;
      }
      DZ.Fish.draw(ctx, f.sp, f.x, f.y, {
        scale: 1.15, flipX: f.dir < 0, rot: wob * 0.5 + (f.vy / 400),
        speed: 0.4 + Math.abs(f.vx) / 60, tag: f.id
      });
      if (f.flash > 0) {
        ctx.globalAlpha = 0.75;
        Px.disc(ctx, f.x, f.y, hitRadius(f) * 0.8, '#ffffff');
        ctx.globalAlpha = 1;
      }
      if (f.panic > 0 && U.chance(0.04)) DZ.FX.bubbles(f.x, f.y, 1);
    }

    // Gary
    if (gary) {
      Px.draw(ctx, 'shark', gary.x, gary.y, { center: true, flipX: gary.dir < 0, scale: 1,
        flash: gary.flash > 0 ? '#ffffff' : null, rot: gary.vy / 400 });
      if (gary.munch > 1.6) Px.draw(ctx, 'heart', gary.x + gary.dir * 10, gary.y - 12, { center: true, recolor: { '1': '#c53a3a', '3': '#ff9ed2' } });
    }

    // net swing
    if (netAt && netFx > 0) {
      const f = 1 - netFx / 0.3;
      ctx.globalAlpha = 0.8 - f * 0.6;
      Px.ring(ctx, netAt.x, netAt.y, Math.round(netAt.r * (0.5 + f * 0.6)), '#dff6ff');
      Px.ring(ctx, netAt.x, netAt.y, Math.round(netAt.r * (0.3 + f * 0.4)), '#8fd4ff');
      ctx.globalAlpha = 1;
    }

    // spears
    for (const s of spears) {
      Px.draw(ctx, DZ.State.S.gear.spear >= 2 ? 'trident' : 'spear', s.x, s.y,
        { center: true, rot: Math.atan2(s.vy, s.vx), flipX: s.vx < 0 });
    }

    // player
    drawDiver(ctx);
    DZ.FX.drawWorld(ctx);
    ctx.restore();

    W.marineSnow(ctx, cam.x, cam.y, 1 / 60);
    W.vignette(ctx, 0.35 + Z.dark, '#020a12');
    if (hurtT > 0) { ctx.globalAlpha = hurtT * 0.4; Px.rect(ctx, 0, 0, DZ.W, DZ.H, '#c53a3a'); ctx.globalAlpha = 1; }

    radar(ctx);
    hud(ctx);
    if (phase === 'summary') drawSummary(ctx);
  }

  function drawDeco(ctx, dc) {
    const y = FLOOR;
    if (dc.kind === 'kelp') { W.kelp(ctx, dc.x, y + 2, dc.h, dc.seed, '#1c6b46', '#31a468'); return; }
    const sc = dc.z > 0.8 ? 2 : 1;
    const sz = Px.size(dc.kind);
    const tint = dc.z < 0.7 ? { '1': '#2a5b76', '2': '#1a3f56', '3': '#3b7593', '4': '#122c3e', '5': '#3b7593' } : null;
    ctx.globalAlpha = dc.z < 0.7 ? 0.55 : 1;
    Px.draw(ctx, dc.kind, dc.x, y - sz.h * sc + 3, { scale: sc, recolor: tint });
    ctx.globalAlpha = 1;
  }

  function drawDiver(ctx) {
    const spd = Math.hypot(p.vx, p.vy);
    // floor shadow keeps you readable against open water
    const sh = U.clamp(1 - (FLOOR - p.y) / 150, 0, 1);
    if (sh > 0) { ctx.globalAlpha = sh * 0.3; Px.disc(ctx, p.x, FLOOR - 1, Math.round(4 + sh * 5), '#000000'); ctx.globalAlpha = 1; }
    if (p.dashT > 0) {
      ctx.globalAlpha = 0.3;
      DZ.Rig.hero.draw(ctx, p.x - p.vx * 0.05, p.y - p.vy * 0.05,
        { scale: 1.1, mode: 'swim', vx: p.vx, vy: p.vy, dir: p.dir, tag: 'ghost' });
      ctx.globalAlpha = 1;
    }
    DZ.Rig.hero.draw(ctx, p.x, p.y, {
      scale: 1.1, mode: 'swim', vx: p.vx, vy: p.vy, dir: p.dir,
      dash: p.dashT > 0, tag: 'diver'
    });
    // aim reticle line
    const ax = p.x + Math.cos(p.aim) * 16, ay = p.y + Math.sin(p.aim) * 16;
    ctx.globalAlpha = 0.55;
    Px.rect(ctx, ax, ay, 2, 2, spearCd > 0 ? '#7f9bab' : '#ffffff');
    ctx.globalAlpha = 1;
  }

  /* off-screen fish pointers so open water never feels empty */
  function radar(ctx) {
    let n = 0;
    const list = fish.filter((f) => !f.dead).map((f) => ({ f, d: U.dist2(f.x, f.y, p.x, p.y) }))
      .sort((a, b) => a.d - b.d).slice(0, 7);
    for (const it of list) {
      const f = it.f;
      const sx = f.x - cam.x, sy = f.y - cam.y;
      if (sx > 6 && sx < DZ.W - 6 && sy > 18 && sy < DZ.H - 14) continue;
      const cx = U.clamp(sx, 6, DZ.W - 6), cy = U.clamp(sy, 20, DZ.H - 16);
      const col = f.sp.flags.rare ? PAL.gold : f.sp.flags.cursed ? PAL.evil : f.sp.pal['1'];
      ctx.globalAlpha = 0.75;
      Px.rect(ctx, cx - 1, cy - 1, 3, 3, col);
      Px.rect(ctx, cx, cy, 1, 1, '#ffffff');
      ctx.globalAlpha = 1;
      if (++n > 7) break;
    }
    if (gary) {
      const sx = U.clamp(gary.x - cam.x, 5, DZ.W - 5), sy = U.clamp(gary.y - cam.y, 20, DZ.H - 16);
      if (gary.x - cam.x < 0 || gary.x - cam.x > DZ.W || gary.y - cam.y < 18 || gary.y - cam.y > DZ.H) {
        ctx.globalAlpha = 0.6 + Math.sin(t * 9) * 0.3;
        Px.draw(ctx, 'skull', sx, sy, { center: true, recolor: { '1': '#ff6f6f', '2': '#c53a3a' } });
        ctx.globalAlpha = 1;
      }
    }
  }

  /* ---------------- hud ---------------- */
  function hud(ctx) {
    const Z = DZ.ZONES[zone];
    // air
    const af = air / airMax;
    Px.rect(ctx, 3, 3, 92, 12, '#03131d');
    Px.frame(ctx, 3, 3, 92, 12, af < 0.2 ? PAL.coral : PAL.line);
    DZ.UI.bar(ctx, 5, 5, 88, 8, af, { col: af < 0.2 ? PAL.coral : (af < 0.45 ? PAL.orange : PAL.cyan),
      label: 'AIR ' + Math.ceil(air) + 's' });
    if (af < 0.2 && Math.sin(t * 12) > 0) T.draw(ctx, '!', 98, 5, PAL.coral, { size: 9, bold: true });

    // bag
    const bf = caughtN / bagCap;
    Px.rect(ctx, DZ.W - 95, 3, 92, 12, '#03131d');
    Px.frame(ctx, DZ.W - 95, 3, 92, 12, bf >= 1 ? PAL.coral : PAL.line);
    DZ.UI.bar(ctx, DZ.W - 93, 5, 88, 8, bf, { col: bf >= 1 ? PAL.coral : PAL.kelp, label: 'BAG ' + caughtN + '/' + bagCap });

    // zone + combo
    T.draw(ctx, Z.name.toUpperCase(), DZ.W / 2, 4, PAL.text, { size: 7, align: 'center', shadow: true });
    if (combo > 1) {
      const s = 9 + Math.min(8, combo);
      T.draw(ctx, 'x' + combo, DZ.W / 2, 12, combo > 7 ? PAL.gold : PAL.cyan, { size: s, align: 'center', bold: true, shadow: true });
      DZ.UI.bar(ctx, DZ.W / 2 - 20, 13 + s, 40, 2, comboT / 3.6, { col: PAL.gold, bg: '#03131d', border: '#03131d' });
    }
    // spear cooldown ring at crosshair
    const m = DZ.Input.mouse;
    const cd = spearCd / gear.spear.reload;
    ctx.globalAlpha = 0.9;
    Px.rect(ctx, m.x - 4, m.y, 3, 1, '#ffffff'); Px.rect(ctx, m.x + 2, m.y, 3, 1, '#ffffff');
    Px.rect(ctx, m.x, m.y - 4, 1, 3, '#ffffff'); Px.rect(ctx, m.x, m.y + 2, 1, 3, '#ffffff');
    if (cd > 0) { ctx.globalAlpha = 0.5; Px.ring(ctx, m.x, m.y, Math.round(2 + cd * 5), '#7f9bab'); }
    if (netCd > 0) { ctx.globalAlpha = 0.35; Px.ring(ctx, m.x, m.y, Math.round(8 + (netCd / gear.net.reload) * 4), '#dff6ff'); }
    ctx.globalAlpha = 1;

    // message
    if (msgT > 0 && msg) {
      const w = T.width(msg, 7) + 10;
      ctx.globalAlpha = U.clamp(msgT, 0, 1);
      Px.rect(ctx, DZ.W / 2 - w / 2, DZ.H - 34, w, 12, '#03131dcc');
      Px.frame(ctx, DZ.W / 2 - w / 2, DZ.H - 34, w, 12, PAL.line);
      T.draw(ctx, msg, DZ.W / 2, DZ.H - 31, PAL.text, { size: 7, align: 'center' });
      ctx.globalAlpha = 1;
    }
    if (phase === 'dive') {
      T.draw(ctx, 'ESC surface', 3, DZ.H - 10, PAL.dim2, { size: 7 });
      T.draw(ctx, 'SPACE dash   E net', DZ.W - 3, DZ.H - 10, PAL.dim2, { size: 7, align: 'right' });
    }
  }

  /* ---------------- zone select ---------------- */
  function drawSelect(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#0d3b5c', '#04121f', 10);
    W.shafts(ctx, 6, 0.06);
    W.marineSnow(ctx, 0, 0, 1 / 60);
    DZ.Game.topbar(ctx, { title: 'PICK YOUR DIVE' });
    const mz = maxZone();
    for (let i = 0; i < 4; i++) {
      const Z = DZ.ZONES[i];
      const x = 8 + i * 97, y = 22, w = 92, h = 150;
      const block = zoneBlock(i);
      const locked = !!block;
      Px.vgrad(ctx, x, y, w, h, Z.top, Z.bot, 6);
      Px.frame(ctx, x, y, w, h, zone === i ? PAL.gold : PAL.line);
      T.draw(ctx, Z.name.toUpperCase(), x + w / 2, y + 4, '#ffffff', { align: 'center', size: 7, bold: true, shadow: true });
      // preview fish
      const pool = DZ.Species.forZone(i);
      pool.slice(0, 5).forEach((sp, k) => {
        const fy = y + 20 + k * 15;
        DZ.Fish.draw(ctx, sp, x + 12, fy + 4 + Math.sin(t * 2 + k) * 1.5, { scale: 0.85, tag: 'zp' + i + k });
        T.draw(ctx, sp.name, x + 24, fy, '#dff6ff', { size: 7, shadow: true });
        T.draw(ctx, sp.value + 'c', x + w - 5, fy, sp.flags.rare ? PAL.gold : '#bfeaff', { size: 7, align: 'right', shadow: true });
      });
      U.wrap(Z.blurb, 22).forEach((ln, k) =>
        T.draw(ctx, ln, x + w / 2, y + h - 42 + k * 8, '#cfe8ff', { align: 'center', size: 7, shadow: true }));
      if (locked) {
        ctx.globalAlpha = 0.72; Px.rect(ctx, x, y, w, h, '#020a12'); ctx.globalAlpha = 1;
        Px.draw(ctx, 'skull', x + w / 2 - 2, y + h / 2 - 20, { scale: 2, center: true });
        T.draw(ctx, block.why, x + w / 2, y + h / 2, PAL.coral, { align: 'center', size: 7 });
        U.wrap(block.what, 13).forEach((l, k) => T.draw(ctx, l, x + w / 2, y + h / 2 + 9 + k * 8, PAL.text, { align: 'center', size: 7 }));
        if (block.map) T.draw(ctx, 'on the MAP', x + w / 2, y + h / 2 + 26, PAL.cyan, { align: 'center', size: 7 });
      }
      if (DZ.UI.button(ctx, x + 8, y + h - 18, w - 16, 14, locked ? (block.map ? 'GO TALK' : 'LOCKED') : 'DIVE!',
          { tone: locked ? (block.map ? 'blue' : 'dark') : 'gold', size: 8, disabled: locked && !block.map, id: 'z' + i })) {
        if (locked) DZ.Game.go('worldmap', { at: ZONE_PLACE[i] });
        else { zone = i; start(); }
      }
    }
    // consumables you can burn on this dive
    const S2 = DZ.State.S;
    let cx2 = 8;
    T.draw(ctx, 'USE BEFORE DIVING:', cx2, DZ.H - 40, PAL.dim, { size: 7 });
    cx2 += 76;
    ['sonar', 'fizz'].forEach((id) => {
      const it = DZ.Items.useById[id];
      const have = (S2.inv.use[id] || 0);
      const on = !!S2.buffs[id];
      if (DZ.UI.button(ctx, cx2, DZ.H - 43, 92, 12, (on ? 'ACTIVE: ' : '') + it.name + (have ? ' x' + have : ''),
          { tone: on ? 'green' : (have ? 'blue' : 'dark'), size: 7, disabled: !have || on, id: 'use' + id,
            tip: it.blurb })) {
        S2.inv.use[id]--;
        if (!S2.inv.use[id]) delete S2.inv.use[id];
        S2.buffs[id] = true;
        DZ.Audio.play('happy');
        DZ.State.toast(it.name + ' ready for this dive!', it.col);
        DZ.State.save();
      }
      cx2 += 96;
    });
    if (!(S2.inv.use.sonar || S2.inv.use.fizz)) T.draw(ctx, '(buy these at the GEAR SHED)', cx2 + 4, DZ.H - 40, PAL.dim2, { size: 7 });

    // gear line
    const g = DZ.State.S.gear;
    const bits = [
      DZ.Items.gearTier('spear', g.spear).name, DZ.Items.gearTier('net', g.net).name,
      DZ.Items.gearTier('fins', g.fins).name, DZ.Items.gearTier('tank', g.tank).name,
      DZ.Items.gearTier('bag', g.bag).name
    ];
    T.draw(ctx, 'GEAR: ' + bits.join('  |  '), DZ.W / 2, DZ.H - 12, PAL.dim, { align: 'center', size: 7 });
    T.draw(ctx, 'better tank = deeper water. new water also needs someone\'s permission - go TRAVEL.', DZ.W / 2, DZ.H - 22, PAL.dim2, { align: 'center', size: 7 });
  }

  /* ---------------- summary ---------------- */
  function drawSummary(ctx) {
    DZ.UI.dim(ctx, 0.72);
    const rows = summary.lines;
    const h = Math.min(196, 74 + rows.length * 11);
    const pw = 250, px = (DZ.W - pw) / 2, py = (DZ.H - h) / 2;
    DZ.UI.panel(ctx, px, py, pw, h, summary.rough ? 'BLACKED OUT' : 'DIVE COMPLETE', {});
    let y = py + 17;
    if (!rows.length) {
      T.draw(ctx, 'You caught absolutely nothing.', px + pw / 2, y + 10, PAL.dim, { align: 'center', size: 8 });
      T.draw(ctx, 'The fish are laughing.', px + pw / 2, y + 22, PAL.dim2, { align: 'center', size: 7 });
      y += 40;
    } else {
      let value = 0;
      for (const r of rows) {
        if (y > py + h - 40) break;
        Px.draw(ctx, r.sp.sprite, px + 6, y + 1, { recolor: r.sp.pal });
        T.draw(ctx, r.sp.name, px + 26, y, PAL.text, { size: 7 });
        T.draw(ctx, 'x' + r.n + (r.live ? ' (' + r.live + ' live)' : ''), px + 130, y, PAL.dim, { size: 7 });
        const v = DZ.State.sellPrice(r.sp, false) * (r.n - r.live) + DZ.State.sellPrice(r.sp, true) * r.live;
        value += v;
        T.draw(ctx, U.fmt(v) + 'c', px + pw - 8, y, PAL.gold, { size: 7, align: 'right' });
        y += 11;
      }
      y += 3;
      Px.rect(ctx, px + 6, y, pw - 12, 1, PAL.line);
      y += 3;
      T.draw(ctx, 'bag value if sold', px + 8, y, PAL.dim, { size: 7 });
      T.draw(ctx, U.fmt(value) + 'c', px + pw - 8, y, PAL.gold, { size: 7, align: 'right' });
      y += 10;
    }
    T.draw(ctx, 'best combo x' + bestCombo, px + 8, y, PAL.cyan, { size: 7 });
    T.draw(ctx, '+' + U.fmt(summary.bonus) + 'c bonus', px + pw - 8, y, PAL.gold, { size: 7, align: 'right' });
    y += 10;
    if (summary.toothClams) {
      T.draw(ctx, 'shark tooth sold', px + 8, y, PAL.coral, { size: 7 });
      T.draw(ctx, '+' + U.fmt(summary.toothClams) + 'c', px + pw - 8, y, PAL.gold, { size: 7, align: 'right' });
      y += 10;
    }
    if (DZ.UI.button(ctx, px + 8, py + h - 18, (pw - 22) / 2, 14, 'DIVE AGAIN', { tone: 'blue', size: 8 })) {
      phase = 'select';
    }
    if (DZ.UI.button(ctx, px + pw / 2 + 3, py + h - 18, (pw - 22) / 2, 14,
        cameFrom === 'worldmap' ? 'BACK TO SEA' : 'TO THE RANCH', { tone: 'gold', size: 8, key: 'Enter' })) {
      DZ.Game.go(cameFrom === 'worldmap' ? 'worldmap' : 'ranch');
    }
  }

  return { enter, update, draw };
})();
