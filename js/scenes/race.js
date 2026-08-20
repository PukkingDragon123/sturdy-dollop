/* ============================================================
   race.js - the race itself. Hold SPACE to surge, 1/2/3 for
   abilities, try not to get tail-slapped by a rival in a hat.
   ============================================================ */
DZ.Scenes.race = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  const LANES = 6, LANE_H = 23, TOP = 46;
  let t = 0, phase = 'count', countT = 3.2, tier = 0, cfg = null;
  let racers = [], trackLen = 1200, camX = 0, finishOrder = [], results = null;
  let eventT = 3, announce = null, announceT = 0, leaderName = '', shakeSpd = 0;
  let whistleBuff = 0;

  function enter(args) {
    cfg = args || {};
    tier = cfg.tier || 0;
    const T0 = DZ.Races.TIERS[tier];
    trackLen = Math.round(T0.len * 2.9);
    t = 0; phase = 'count'; countT = 3.2; camX = 0; finishOrder = []; results = null;
    eventT = 4; announce = null; announceT = 0;
    const S = DZ.State.S;
    whistleBuff = S.inv.use && S.inv.use.whistle ? 3 : 0;
    if (whistleBuff) { S.inv.use.whistle--; if (!S.inv.use.whistle) delete S.inv.use.whistle; }
    const clover = S.inv.use && S.inv.use.clover ? 8 : 0;
    if (clover) { S.inv.use.clover--; if (!S.inv.use.clover) delete S.inv.use.clover; }

    racers = (cfg.field || []).map((r, i) => {
      const st = Object.assign({}, r.stats);
      if (r.mine && clover) st.luck += clover;
      const passives = r.mine && r.dolphin ? DZ.Dolphin.passives(r.dolphin) : {};
      const abil = r.mine && r.dolphin ? DZ.Dolphin.abilities(r.dolphin)
        : pickAiAbilities(r.lvl, r.evil);
      const mood = r.mine && r.dolphin ? 0.85 + r.dolphin.mood * 0.3 : 1;
      return {
        ref: r, mine: !!r.mine, name: r.name, col: r.col, evil: !!r.evil, lane: i,
        stats: st, passives, abil, cds: abil.map(() => 0),
        x: 0, v: 0, mods: [], stam: 100, stamMax: 40 + st.stamina * 4.2,
        surge: false, finished: false, place: 0, time: 0, ph: U.rnd(0, 9), frame: 0,
        base: (34 + st.speed * 1.45) * mood, acc: 44 + st.burst * 3.1,
        wind: false, aiT: U.rnd(0.5, 3), lucky: st.luck,
        dolphin: r.dolphin || null
      };
    });
    DZ.Audio.play('whistle');
  }

  function pickAiAbilities(lvl, evil) {
    const pool = evil ? ['darktide', 'grip', 'tailslap', 'sonar'] : ['torpedo', 'tailslap', 'bubblering', 'sonar'];
    const n = U.clamp(Math.floor(lvl / 4), 0, 2);
    return U.shuffle(pool).slice(0, n);
  }

  /* ---------------- update ---------------- */
  function update(dt) {
    t += dt;
    DZ.Water.tick(dt);
    if (announceT > 0) announceT -= dt;
    if (phase === 'count') {
      countT -= dt;
      const prev = Math.ceil(countT + dt), now = Math.ceil(countT);
      if (now !== prev && now > 0) DZ.Audio.play('blip');
      if (countT <= 0) { phase = 'race'; DZ.Audio.play('whistle'); DZ.FX.shake(3); say('AND THEY\'RE OFF!'); }
      return;
    }
    if (phase !== 'race') return;

    const me = racers.find((r) => r.mine);
    const leadX = racers.reduce((m, r) => Math.max(m, r.x), 0);
    // ---- player input ----
    if (me && !me.finished) {
      const holding = DZ.Input.isDown('Space') || DZ.Input.mouse.down;
      me.surge = holding && (me.stam > 0 || whistleBuff > 0);
      if (whistleBuff > 0) whistleBuff -= dt;
      for (let i = 0; i < me.abil.length; i++) {
        if (DZ.Input.isPressed('Digit' + (i + 1)) && me.cds[i] <= 0) fireAbility(me, i);
      }
    }
    // ---- simulate ----
    for (const r of racers) {
      if (r.finished) continue;
      r.time += dt;
      // mods decay
      for (let i = r.mods.length - 1; i >= 0; i--) {
        r.mods[i].t -= dt;
        if (r.mods[i].t <= 0) r.mods.splice(i, 1);
      }
      for (let i = 0; i < r.cds.length; i++) if (r.cds[i] > 0) r.cds[i] -= dt;

      // AI decisions
      if (!r.mine) {
        r.aiT -= dt;
        const prog = r.x / trackLen;
        const behind = (leadX - r.x) / trackLen;
        r.surge = r.stam > r.stamMax * 0.2 && (prog > 0.55 || behind > 0.06 || (r.aiT <= 0 && U.chance(0.6)));
        if (r.aiT <= 0) {
          r.aiT = U.rnd(1.2, 3.4);
          for (let i = 0; i < r.abil.length; i++) if (r.cds[i] <= 0 && U.chance(0.55)) { fireAbility(r, i); break; }
        }
      }
      // stamina
      const surgeCost = (r.passives.cheapSurge ? 13 : 20);
      if (r.surge && r.stam > 0) r.stam = Math.max(0, r.stam - surgeCost * dt);
      else r.stam = Math.min(r.stamMax, r.stam + 9 * dt);
      if (r.surge && r.stam <= 0 && !(r.mine && whistleBuff > 0)) r.surge = false;
      // second wind
      if (r.passives.secondWind && !r.wind && r.x > trackLen * 0.5) {
        r.wind = true; r.stam = r.stamMax;
        if (r.mine) { say('SECOND WIND!'); DZ.Audio.play('happy'); }
      }
      // target speed
      let mult = 1;
      for (const m of r.mods) mult *= m.mult;
      if (r.surge) mult *= 1.29;
      // pack physics: trailing racers ride the wash, so nobody gets left behind
      mult *= 1 + U.clamp((leadX - r.x) / Math.max(1, trackLen), 0, 0.3) * 0.55;
      // slipstream
      let draft = 1;
      for (const o of racers) {
        if (o === r) continue;
        const d = o.x - r.x;
        if (d > 4 && d < 30 && Math.abs(o.lane - r.lane) <= 1) { draft = r.passives.cheapSurge ? 1.12 : 1.07; break; }
      }
      if (r.stats.agility > 14 && draft > 1) draft += 0.02;
      const target = r.base * mult * draft;
      r.v += (target - r.v) * Math.min(1, r.acc / 100 * dt * 4);
      // luck wobble keeps races unpredictable
      r.v += Math.sin(t * 1.7 + r.ph) * (2 + r.lucky * 0.06) * dt * 10;
      r.x += r.v * dt;
      r.frame += (0.5 + r.v / 40) * dt * 6;
      if (r.surge && U.chance(dt * 22)) DZ.FX.bubbles(sx(r.x) - 12, laneY(r.lane) + 6, 1, { screen: false });
      // bumping
      for (const o of racers) {
        if (o === r || o.finished) continue;
        if (Math.abs(o.lane - r.lane) !== 1) continue;
        if (Math.abs(o.x - r.x) < 10 && U.chance(dt * 1.3)) {
          const strongerR = r.stats.agility + (r.passives.sturdy ? 8 : 0) + (r.passives.ram ? 10 : 0);
          const strongerO = o.stats.agility + (o.passives.sturdy ? 8 : 0) + (o.passives.ram ? 10 : 0);
          const loser = strongerR >= strongerO ? o : r;
          loser.mods.push({ mult: 0.78, t: 0.7 });
          if (loser.mine || r.mine || o.mine) { DZ.Audio.play('slap'); DZ.FX.shake(2); }
          DZ.FX.text(sx(loser.x), laneY(loser.lane) - 4, 'BONK', PAL.coral, { size: 7, screen: true, life: 0.6 });
        }
      }
      // chaos aura
      if (r.passives.chaos && U.chance(dt * 0.6)) {
        const near = racers.filter((o) => o !== r && !o.finished && Math.abs(o.x - r.x) < 40);
        if (near.length) {
          const v = U.pick(near);
          v.mods.push({ mult: 0.8, t: 1 });
          DZ.FX.text(sx(v.x), laneY(v.lane) - 6, 'PANIC!', PAL.evil, { size: 7, screen: true });
        }
      }
      // finish
      if (r.x >= trackLen && !r.finished) {
        r.finished = true;
        r.place = finishOrder.length + 1;
        finishOrder.push(r);
        if (r.mine) {
          DZ.Audio.play(r.place === 1 ? 'cheer' : 'whistle');
          DZ.FX.flash(r.place === 1 ? '#ffd24a' : '#7ff0ff', 0.25);
          DZ.FX.shake(6);
        }
      }
    }
    // ---- random track events ----
    eventT -= dt;
    if (eventT <= 0) {
      eventT = U.rnd(3.4, 7);
      const alive = racers.filter((r) => !r.finished);
      if (alive.length) {
        const victim = U.pick(alive);
        const ev = U.pick(DZ.Races.EVENTS);
        if (ev.kind === 'slow') victim.mods.push({ mult: 0.72, t: 1.4 });
        else if (ev.kind === 'fast') victim.mods.push({ mult: 1.3, t: 1.6 });
        else { victim.mods.push({ mult: 1.55, t: 0.9 }); victim.mods.push({ mult: 0.7, t: 2.4 }); }
        DZ.FX.text(sx(victim.x), laneY(victim.lane) - 8, ev.txt, ev.col, { size: 8, screen: true, life: 1.4 });
        say(victim.name + ': ' + ev.txt);
        DZ.Audio.play(ev.kind === 'fast' ? 'pop' : 'thud');
      }
    }
    // ---- leader callout ----
    const lead = racers.slice().sort((a, b) => b.x - a.x)[0];
    if (lead && lead.name !== leaderName && !lead.finished) {
      leaderName = lead.name;
      if (t > 2) say(lead.name.toUpperCase() + ' TAKES THE LEAD!');
    }
    // ---- camera ----
    const focus = racers.find((r) => r.mine) || lead;
    const fx2 = focus ? focus.x : 0;
    const lx2 = lead ? lead.x : fx2;
    const mid = U.lerp(fx2, lx2, 0.42);
    const target = U.clamp(mid - 150, 0, Math.max(0, trackLen + 60 - DZ.W));
    camX = U.damp(camX, target, 0.0008, dt);

    if (racers.every((r) => r.finished)) finish();
  }

  function say(s) { announce = s; announceT = 2.4; }
  const sx = (x) => x - camX + 30;
  const laneY = (l) => TOP + l * LANE_H;

  function fireAbility(r, i) {
    const id = r.abil[i];
    const A = DZ.Skills.ABILITIES[id];
    if (!A) return;
    r.cds[i] = A.cool;
    DZ.Audio.play(A.sfx || 'blip');
    const others = racers.filter((o) => o !== r && !o.finished);
    const ahead = others.filter((o) => o.x > r.x);
    switch (id) {
      case 'torpedo':
        r.mods.push({ mult: 1.75, t: 1.2 });
        DZ.FX.bubbles(sx(r.x), laneY(r.lane) + 8, 14, { vx: -90 });
        DZ.FX.shake(r.mine ? 4 : 1);
        break;
      case 'bubblering':
        r.mods.push({ mult: 1.38, t: 3 });
        DZ.FX.ringWave(sx(r.x), laneY(r.lane) + 8, 4, 22, '#ff9ed2', 0.5);
        break;
      case 'tailslap': {
        const near = others.sort((a, b) => Math.abs(a.x - r.x) - Math.abs(b.x - r.x))[0];
        if (near) {
          near.mods.push({ mult: 0.5, t: 1.3 });
          near.x -= 12;
          DZ.FX.text(sx(near.x), laneY(near.lane) - 6, 'SLAPPED!', PAL.orange, { size: 8, screen: true });
          DZ.FX.shake(3);
        }
        break;
      }
      case 'sonar':
        ahead.forEach((o) => o.mods.push({ mult: 0.74, t: 2.4 }));
        DZ.FX.ringWave(sx(r.x), laneY(r.lane) + 8, 6, 60, '#7ff0ff', 0.7);
        break;
      case 'darktide': {
        const lead = others.sort((a, b) => b.x - a.x)[0];
        if (lead) {
          lead.mods.push({ mult: 0.72, t: 2 });
          r.mods.push({ mult: 1.3, t: 2 });
          DZ.FX.text(sx(lead.x), laneY(lead.lane) - 6, 'DRAINED', PAL.evil, { size: 8, screen: true });
        }
        break;
      }
      case 'grip': {
        const v = ahead.sort((a, b) => a.x - b.x)[0] || others[0];
        if (v) {
          v.mods.push({ mult: 0.36, t: 1.5 });
          DZ.FX.text(sx(v.x), laneY(v.lane) - 6, 'GRABBED', PAL.evil, { size: 8, screen: true });
          DZ.FX.shake(4);
        }
        break;
      }
      case 'bane':
        others.forEach((o) => o.mods.push({ mult: 0.6, t: 2.6 }));
        DZ.FX.flash('#a86bff', 0.3); DZ.FX.shake(7);
        say('THE OCEAN TURNS ON THEM ALL');
        break;
    }
    if (r.mine) DZ.FX.text(sx(r.x), laneY(r.lane) - 12, A.name.toUpperCase() + '!', A.col, { size: 9, screen: true, life: 1.1 });
  }

  /* ---------------- results ---------------- */
  function finish() {
    phase = 'done';
    const S = DZ.State.S;
    const T0 = DZ.Races.TIERS[tier];
    const me = racers.find((r) => r.mine);
    const d = me && me.dolphin ? me.dolphin : null;
    const place = me ? me.place : 6;
    let purse = T0.purse[place - 1] || 0;
    let mult = 1;
    if (d) {
      const pas = DZ.Dolphin.passives(d);
      if (pas.showboat) mult += 0.25;
      if (pas.hype) mult += 0.4;
    }
    purse = Math.round(purse * mult);
    // betting
    let betWin = 0;
    if (cfg.betOn >= 0 && cfg.stake > 0) {
      const picked = racers[cfg.betOn];
      if (picked && picked.place === 1) {
        betWin = Math.round(cfg.stake * cfg.odds[cfg.betOn]);
        const hype = DZ.State.staffOf('hype');
        if (hype) betWin = Math.round(betWin * (1 + (12 + hype.lvl * 8) / 100));
      }
    }
    // exp
    let exp = 0, lvlUps = 0;
    if (d) {
      exp = Math.round((44 + tier * 46) * (place === 1 ? 1.6 : place === 2 ? 1.25 : place === 3 ? 1.05 : 0.8));
      const res = DZ.Dolphin.addExp(d, exp, S);
      lvlUps = res.levels;
      d.races++;
      if (place === 1) d.wins++;
      d.mood = U.clamp(d.mood + (place === 1 ? 0.12 : -0.04), 0, 1);
      d.note = U.pick(place === 1 ? DZ.Names.quipsRace : ['Robbed.', 'I demand a rematch.', 'The current was rude.']);
    }
    if (purse) DZ.State.earn(purse, true);
    if (betWin) { DZ.State.earn(betWin, true); DZ.State.event('bet', { clams: betWin - cfg.stake }); }
    S.totals.races++;
    if (place === 1) DZ.State.event('race_win', {});
    if (betWin) S.totals.betWon += betWin;
    results = { place, purse, betWin, exp, lvlUps, mult };
    DZ.State.save();
    DZ.Audio.play(place === 1 ? 'cheer' : 'whistle');
    if (place === 1) {
      for (let i = 0; i < 30; i++)
        DZ.FX.part(U.rnd(0, DZ.W), U.rnd(0, 60), { k: 'chunk', screen: true, vy: U.rnd(20, 70), vx: U.rnd(-30, 30),
          col: U.pick(['#ffd24a', '#ff9ed2', '#7ff0ff', '#40d492']), life: U.rnd(1.5, 3), r: 2, drag: 0.9 });
    }
  }

  /* ---------------- draw ---------------- */
  function draw(ctx) {
    const T0 = DZ.Races.TIERS[tier];
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#2f8fc0', '#062033', 11);
    // crowd stands
    Px.rect(ctx, 0, 14, DZ.W, TOP - 16, '#0a2a40');
    for (let i = 0; i < 46; i++) {
      const cx = (i * 9 + Math.sin(i) * 3) % DZ.W;
      const cy = 18 + (i % 3) * 8;
      const bounce = Math.sin(t * 6 + i) > 0.6 ? -2 : 0;
      const sp = DZ.Species.list[i % DZ.Species.list.length];
      DZ.Fish.draw(ctx, sp, cx, cy + bounce, { scale: 0.55, alpha: 0.9, speed: 0.2, tag: 'cr' + i });
    }
    Px.rect(ctx, 0, TOP - 4, DZ.W, 3, '#0d3d58');
    DZ.Water.surfaceLine(ctx, TOP - 8);

    // motion streaks
    ctx.globalAlpha = 0.10;
    for (let i = 0; i < 26; i++) {
      const sy2 = TOP + ((i * 37) % (LANES * LANE_H));
      const sx2 = (i * 71 - camX * 1.7) % (DZ.W + 60) - 30;
      Px.rect(ctx, sx2, sy2, 14, 1, '#dff6ff');
    }
    ctx.globalAlpha = 1;
    // lane ropes
    for (let l = 0; l <= LANES; l++) {
      const y = laneY(l) - 3;
      ctx.globalAlpha = 0.5;
      for (let x = -(camX % 6); x < DZ.W; x += 6) Px.rect(ctx, x, y, 3, 1, '#1b6b93');
      ctx.globalAlpha = 1;
      for (let x = -(camX % 72); x < DZ.W; x += 72) Px.draw(ctx, 'buoy', x, y - 4, { alpha: 0.75 });
    }
    // seabed under the track
    const bedY = TOP + LANES * LANE_H + 4;
    DZ.Water.ground(ctx, bedY, DZ.W, '#e2ce97', '#b79a5f', Math.round(camX), DZ.H - bedY);
    for (let i = 0; i < 7; i++) {
      const kx = (i * 118 - camX * 0.85) % (DZ.W + 120) - 60;
      DZ.Water.kelp(ctx, kx, bedY + 2, 14 + (i % 3) * 5, i * 2, '#1c6b46', '#31a468');
    }
    // finish line
    const fx = sx(trackLen);
    if (fx > -20 && fx < DZ.W + 20) {
      for (let y = TOP - 6; y < TOP + LANES * LANE_H; y += 6) {
        Px.rect(ctx, fx, y, 4, 3, ((y / 6) | 0) % 2 ? '#ffffff' : '#101820');
        Px.rect(ctx, fx, y + 3, 4, 3, ((y / 6) | 0) % 2 ? '#101820' : '#ffffff');
      }
      Px.draw(ctx, 'flag', fx - 2, TOP - 20, {});
    }
    // start gate
    const gx = sx(0);
    if (gx > -30 && gx < DZ.W) Px.draw(ctx, 'starttower', gx - 24, TOP - 24, { scale: 2, alpha: 0.9 });

    // racers
    const sorted = racers.slice().sort((a, b) => a.lane - b.lane);
    for (const r of sorted) {
      const x = sx(Math.min(r.x, trackLen + 26));
      const y = laneY(r.lane) + 8 + Math.sin(t * 5 + r.ph) * 1.5;
      if (x < -16 || x > DZ.W + 16) {
        // off-screen marker
        const mx = x < 0 ? 2 : DZ.W - 4;
        Px.rect(ctx, mx, y - 2, 3, 5, r.col);
        continue;
      }
      const stretch = 1 + Math.min(0.22, r.v / 700) + (r.surge ? 0.08 : 0);
      if (r.surge) {
        ctx.globalAlpha = 0.35;
        for (let k = 1; k <= 3; k++)
          Px.draw(ctx, 'dolphin', x - k * 5, y, { center: true, flash: '#bfeaff', alpha: 0.3 / k });
        ctx.globalAlpha = 1;
      }
      const dObj = r.dolphin || (r._obj = r._obj || { id: 'rc' + r.lane,
        pal: { '1': r.col, '2': Px.shade(r.col, -0.4), '3': Px.shade(r.col, 0.55) },
        evil: r.evil, traits: [], skills: {} });
      DZ.Dolphin.draw(ctx, dObj, x, y, { center: true, scale: 1.25, speed: 0.4 + r.v / 60,
        sx: stretch, sy: 1 / stretch, tag: 'race' + r.lane });
      if (r.mine) {
        Px.rect(ctx, x - 1, y - 16, 3, 3, PAL.gold);
        T.draw(ctx, 'YOU', x, y - 25, PAL.gold, { size: 7, align: 'center', shadow: true });
      }
      T.draw(ctx, r.name, x, y + 10, r.mine ? PAL.gold : '#cfe8ff', { size: 7, align: 'center', shadow: true });
      if (r.finished) T.draw(ctx, '#' + r.place, x + 16, y - 6, PAL.gold, { size: 8, bold: true });
      // lane stamina pip
      const sf = r.stam / r.stamMax;
      Px.rect(ctx, x - 10, y + 18, 20, 2, '#05202f');
      Px.rect(ctx, x - 10, y + 18, Math.round(20 * sf), 2, sf > 0.3 ? PAL.kelp : PAL.coral);
    }
    DZ.FX.drawWorld(ctx);
    DZ.Water.marineSnow(ctx, camX, 0, 1 / 60);

    hud(ctx, T0);
    if (phase === 'count') countdown(ctx);
    if (phase === 'done' && results) drawResults(ctx, T0);
  }

  function hud(ctx, T0) {
    const me = racers.find((r) => r.mine);
    Px.rect(ctx, 0, 0, DZ.W, 13, '#041826');
    Px.rect(ctx, 0, 13, DZ.W, 1, PAL.line);
    T.draw(ctx, T0.name.toUpperCase(), 4, 3, T0.col, { size: 8, bold: true });
    const sorted = racers.slice().sort((a, b) => (b.finished ? trackLen + 1000 - b.place : b.x) - (a.finished ? trackLen + 1000 - a.place : a.x));
    const pos = me ? sorted.indexOf(me) + 1 : 0;
    T.draw(ctx, 'POS ' + pos + '/' + racers.length, 120, 3, pos === 1 ? PAL.gold : PAL.text, { size: 8, bold: true });
    const prog = me ? U.clamp(me.x / trackLen, 0, 1) : 0;
    T.draw(ctx, Math.round(prog * T0.len) + 'm / ' + T0.len + 'm', 190, 3, PAL.dim, { size: 7 });
    // mini track
    const mx = 262, mw = DZ.W - 268;
    Px.rect(ctx, mx, 4, mw, 6, '#03131d');
    Px.frame(ctx, mx, 4, mw, 6, '#123246');
    for (const r of racers) {
      const px = mx + 1 + Math.round((mw - 3) * U.clamp(r.x / trackLen, 0, 1));
      Px.rect(ctx, px, 5, 2, 4, r.mine ? PAL.gold : r.col);
    }

    if (me && !me.finished) {
      // stamina + abilities
      const sf = me.stam / me.stamMax;
      DZ.UI.bar(ctx, 4, DZ.H - 16, 120, 11, sf, { col: me.surge ? PAL.orange : PAL.kelp,
        label: whistleBuff > 0 ? 'RALLY! ' + whistleBuff.toFixed(1) + 's' : 'STAMINA - hold SPACE' });
      me.abil.forEach((id, i) => {
        const A = DZ.Skills.ABILITIES[id];
        const ready = me.cds[i] <= 0;
        const bx = 130 + i * 62;
        if (DZ.UI.button(ctx, bx, DZ.H - 16, 58, 11, (i + 1) + ' ' + A.name.slice(0, 9),
            { tone: ready ? 'gold' : 'dark', size: 7, disabled: !ready, id: 'ab' + i, tip: A.blurb })) {
          fireAbility(me, i);
        }
        if (!ready) T.draw(ctx, me.cds[i].toFixed(1), bx + 56, DZ.H - 15, PAL.coral, { size: 7, align: 'right' });
      });
      if (!me.abil.length) T.draw(ctx, 'no abilities - learn some in SKILLS', 130, DZ.H - 13, PAL.dim2, { size: 7 });
    }
    if (announceT > 0 && announce) {
      const w = T.width(announce, 8, true) + 12;
      ctx.globalAlpha = U.clamp(announceT, 0, 1);
      Px.rect(ctx, DZ.W / 2 - w / 2, 16, w, 13, '#041826');
      Px.frame(ctx, DZ.W / 2 - w / 2, 16, w, 13, PAL.gold);
      T.draw(ctx, announce, DZ.W / 2, 19, PAL.gold, { size: 8, align: 'center', bold: true });
      ctx.globalAlpha = 1;
    }
  }

  function countdown(ctx) {
    DZ.UI.dim(ctx, 0.35);
    const n = Math.ceil(countT);
    const s = n <= 0 ? 'GO!' : String(n);
    const frac = countT - Math.floor(countT);
    const size = 22 + Math.round((1 - frac) * 10);
    T.draw(ctx, s, DZ.W / 2, DZ.H / 2 - 20, n === 1 ? PAL.gold : PAL.text, { size, align: 'center', bold: true, shadow: true });
    T.draw(ctx, 'hold SPACE to surge   1/2/3 abilities', DZ.W / 2, DZ.H / 2 + 14, PAL.cyan, { align: 'center', size: 8 });
    const me = racers.find((r) => r.mine);
    if (me) T.draw(ctx, 'you are ' + me.name + ', lane ' + (me.lane + 1), DZ.W / 2, DZ.H / 2 + 26, PAL.dim, { align: 'center', size: 7 });
  }

  function drawResults(ctx, T0) {
    DZ.UI.dim(ctx, 0.72);
    const pw = 260, ph = 176, px = (DZ.W - pw) / 2, py = (DZ.H - ph) / 2;
    const win = results.place === 1;
    DZ.UI.panel(ctx, px, py, pw, ph, win ? 'WINNER!' : 'FINISHED #' + results.place,
      { titleCol: win ? PAL.gold : PAL.text });
    let y = py + 17;
    finishOrder.forEach((r, i) => {
      Px.rect(ctx, px + 4, y, pw - 8, 12, r.mine ? '#0d3d58' : (i % 2 ? '#072335' : '#08283c'));
      T.draw(ctx, '#' + r.place, px + 7, y + 2, i === 0 ? PAL.gold : PAL.dim, { size: 7, bold: true });
      Px.rect(ctx, px + 22, y + 2, 3, 8, r.col);
      T.draw(ctx, r.name + (r.mine ? ' (YOU)' : ''), px + 29, y + 2, r.mine ? PAL.cyan : PAL.text, { size: 7 });
      T.draw(ctx, r.time.toFixed(2) + 's', px + pw - 8, y + 2, PAL.dim, { size: 7, align: 'right' });
      y += 13;
    });
    y += 2;
    Px.rect(ctx, px + 6, y, pw - 12, 1, PAL.line); y += 4;
    const rows = [
      ['purse (' + results.place + (results.place === 1 ? 'st' : results.place === 2 ? 'nd' : results.place === 3 ? 'rd' : 'th') + ')',
        '+' + U.fmt(results.purse) + 'c', results.purse ? PAL.gold : PAL.dim],
      ['bet payout', results.betWin ? '+' + U.fmt(results.betWin) + 'c' : (cfg.stake ? 'lost ' + U.fmt(cfg.stake) + 'c' : 'no bet'),
        results.betWin ? PAL.kelp : PAL.coral],
      ['dolphin EXP', '+' + results.exp + (results.lvlUps ? '  (' + results.lvlUps + ' level up!)' : ''), PAL.cyan]
    ];
    if (results.mult > 1) rows.push(['showbiz bonus', 'x' + results.mult.toFixed(2), PAL.pink]);
    rows.forEach((r) => {
      T.draw(ctx, r[0], px + 8, y, PAL.dim, { size: 7 });
      T.draw(ctx, r[1], px + pw - 8, y, r[2], { size: 7, align: 'right', bold: true });
      y += 10;
    });
    if (DZ.UI.button(ctx, px + 6, py + ph - 18, (pw - 18) / 2, 14, 'RACE AGAIN', { tone: 'blue', size: 8 }))
      DZ.Game.go('racelobby', { tier });
    if (DZ.UI.button(ctx, px + pw / 2 + 3, py + ph - 18, (pw - 18) / 2, 14, 'BACK TO RANCH', { tone: 'gold', size: 8, key: 'Enter' }))
      DZ.Game.go('ranch');
  }

  return { enter, update, draw };
})();
