/* ============================================================
   race.js - side-scrolling mount racing. Surge to spend stamina,
   hop the obstacles, bet on anyone in the field.
   ============================================================ */
KA.Scenes.race = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL, S = KA.S;
  let phase = 'lobby', tier = 0, field = [], odds = [], bet = -1, stake = 0;
  let racers = [], obstacles = [], camX = 0, t = 0, countT = 0, order = [], res = null, ann = null, annT = 0;
  /* six lanes spread between the crowd and the seabed */
  const LANE_TOP = 84, LANE_H = 42;
  const laneY = (i) => LANE_TOP + i * LANE_H;
  /* mounts are part-normalised: a whale still reads bigger, but it stays in its lane */
  const laneScale = (pet) => 0.85 / Math.pow(KA.Pets.byId[pet.sp].size, 0.72);

  function enter(args) {
    tier = (args && args.tier) || 0;
    phase = 'lobby'; bet = -1; stake = 0; t = 0;
    build();
  }
  function build() {
    const me = S.active();
    const mine = { name: me.name, sp: me.sp, stats: KA.Pet.stats(me), col: '#ffc94a', mine: true, pet: me };
    field = [mine].concat(KA.Races.field(tier, KA.Pet.power(me), 5));
    odds = KA.Races.odds(field);
  }

  function begin() {
    const T0 = KA.Races.TIERS[tier];
    if (!S.spend(T0.entry + (bet >= 0 ? stake : 0))) return;
    phase = 'count'; countT = 3.2; camX = 0; t = 0; order = []; res = null;
    const len = T0.len;
    racers = field.map((r, i) => {
      const st = r.stats;
      const fat = r.mine ? S.fatPenalty() : 1;
      return { ref: r, lane: i, mine: !!r.mine, name: r.name, col: r.col, pet: r.pet, stats: st,
        x: 0, y: laneY(i), v: 0, base: (54 + st.spd * 1.9) * fat, acc: 60 + st.pwr * 3,
        stam: 100, stamMax: 46 + st.sta * 4.4, surge: false, mods: [], finished: false, place: 0,
        time: 0, ph: U.rnd(0, 9), ai: U.rnd(0.6, 2.6), hop: 0 };
    });
    obstacles = [];
    for (let i = 0; i < Math.floor(len / 210); i++) {
      obstacles.push({ x: 260 + i * 210 + U.rnd(-40, 40), lane: U.rndInt(0, 5),
        kind: U.pick(['kelp', 'crab', 'urchin']) });
    }
    KA.A.play('whistle');
  }

  function update(dt) {
    t += dt;
    if (annT > 0) annT -= dt;
    layout();
    if (phase === 'lobby') { if (KA.In.isPressed('Escape')) KA.Game.go('world', {}); return; }
    if (phase === 'count') {
      countT -= dt;
      if (Math.ceil(countT) !== Math.ceil(countT + dt) && countT > 0) KA.A.play('blip');
      if (countT <= 0) { phase = 'run'; KA.A.play('whistle'); say('AND THEY\'RE OFF'); }
      return;
    }
    if (phase === 'done') { if (KA.In.isPressed('Escape')) KA.Game.go('world', {}); return; }

    const T0 = KA.Races.TIERS[tier];
    const lead = racers.reduce((m, r) => Math.max(m, r.x), 0);
    const me = racers.find((r) => r.mine);
    if (me && !me.finished) {
      me.surge = (KA.In.act('atk', 'Space', 'KeyJ') || KA.In.mouse.down) && me.stam > 0;
      if (KA.In.actPressed('jump', 'KeyK', 'ArrowUp') && me.hop <= 0) { me.hop = 0.5; KA.A.play('jump'); }
    }
    for (const r of racers) {
      if (r.finished) continue;
      r.time += dt;
      for (let i = r.mods.length - 1; i >= 0; i--) { r.mods[i].t -= dt; if (r.mods[i].t <= 0) r.mods.splice(i, 1); }
      if (r.hop > 0) r.hop -= dt;
      if (!r.mine) {
        r.ai -= dt;
        const behind = (lead - r.x) / T0.len;
        r.surge = r.stam > r.stamMax * 0.2 && (r.x / T0.len > 0.55 || behind > 0.05 || (r.ai <= 0 && U.chance(0.6)));
        if (r.ai <= 0) r.ai = U.rnd(1.2, 3.2);
      }
      if (r.surge && r.stam > 0) r.stam = Math.max(0, r.stam - 22 * dt);
      else r.stam = Math.min(r.stamMax, r.stam + 10 * dt);
      if (r.surge && r.stam <= 0) r.surge = false;
      let mult = 1;
      for (const m of r.mods) mult *= m.mult;
      if (r.surge) mult *= 1.3;
      mult *= 1 + U.clamp((lead - r.x) / T0.len, 0, 0.3) * 0.5;
      const target = r.base * mult;
      r.v += (target - r.v) * Math.min(1, r.acc / 100 * dt * 4);
      r.v += Math.sin(t * 1.7 + r.ph) * (1 + r.stats.lck * 0.05) * dt * 8;
      r.x += r.v * dt;
      if (r.surge && U.chance(dt * 22)) KA.FX.bubbles(sx(r.x) - 16, r.y + 8, 1);
      // obstacles
      for (const o of obstacles) {
        if (o.lane !== r.lane || o.hit) continue;
        if (Math.abs(o.x - r.x) < 16) {
          if (r.hop > 0.05) { if (r.mine) { KA.FX.text(sx(r.x), r.y - 24, 'HOP!', P.kelp, { size: 14, screen: true }); } }
          else {
            r.mods.push({ mult: 0.55, t: 0.9 });
            if (r.mine) { KA.A.play('thud'); KA.FX.shake(5); KA.FX.text(sx(r.x), r.y - 24, 'OOF', P.coral, { size: 16, screen: true }); }
          }
        }
      }
      if (r.x >= T0.len && !r.finished) {
        r.finished = true; r.place = order.length + 1; order.push(r);
        if (r.mine) { KA.A.play(r.place === 1 ? 'cheer' : 'whistle'); KA.FX.flash(r.place === 1 ? P.gold : P.cyan, 0.25); }
      }
    }
    // random events
    if (U.chance(dt * 0.25)) {
      const alive = racers.filter((r) => !r.finished);
      if (alive.length) {
        const v = U.pick(alive), e = U.pick(KA.Races.EVENTS);
        if (e.k === 'slow') v.mods.push({ mult: 0.72, t: 1.4 });
        else if (e.k === 'fast') v.mods.push({ mult: 1.3, t: 1.5 });
        else { v.mods.push({ mult: 1.5, t: 0.8 }); v.mods.push({ mult: 0.7, t: 2.2 }); }
        say(v.name + ': ' + e.txt);
        KA.FX.text(sx(v.x), v.y - 26, e.txt, e.col, { size: 13, screen: true, life: 1.4 });
      }
    }
    const focus = me || racers[0];
    camX = U.damp(camX, U.clamp(U.lerp(focus.x, lead, 0.4) - KA.W * 0.34, 0, Math.max(0, T0.len + 120 - KA.W)), 0.0008, dt);
    if (racers.every((r) => r.finished)) finish();
  }
  const sx = (x) => x - camX + 60;
  function say(s) { ann = s; annT = 2.2; }

  function finish() {
    phase = 'done';
    const T0 = KA.Races.TIERS[tier];
    const me = racers.find((r) => r.mine);
    const place = me ? me.place : 6;
    const purse = T0.purse[place - 1] || 0;
    let betWin = 0;
    if (bet >= 0 && stake > 0) {
      const picked = racers[bet];
      if (picked && picked.place === 1) betWin = Math.round(stake * odds[bet]);
    }
    const pet = S.active();
    const exp = Math.round((50 + tier * 55) * (place === 1 ? 1.6 : place === 2 ? 1.2 : 0.85));
    const r = KA.Pet.addExp(pet, exp);
    pet.races++;
    if (place === 1) pet.wins++;
    S.D.stats.races++;
    if (place === 1) S.D.stats.wins++;
    if (purse) S.earn(purse, true);
    if (betWin) S.earn(betWin, true);
    S.burnFat(8);
    res = { place, purse, betWin, exp, levels: r.levels, tokens: r.tokens };
    S.save();
    if (place === 1) {
      KA.A.play('jackpot');
      for (let i = 0; i < 34; i++) KA.FX.part(U.rnd(0, KA.W), U.rnd(0, 60), { k: 'chunk', screen: true,
        vy: U.rnd(40, 130), vx: U.rnd(-50, 50), col: U.pick([P.gold, P.pink, P.cyan, P.kelp]), life: U.rnd(1.4, 3), r: 3 });
    }
  }

  const BTNS = [];
  function layout() {
    if (!KA.touch) { KA.In.defineButtons([]); return; }
    BTNS.length = 0;
    if (phase === 'run' || phase === 'count') {
      BTNS.push({ name: 'atk', x: KA.W - 56, y: KA.H - 56, r: 32, label: 'GO', col: 'rgba(255,201,74,.3)' });
      BTNS.push({ name: 'jump', x: KA.W - 126, y: KA.H - 56, r: 26, label: 'HOP', col: 'rgba(127,232,255,.3)' });
    }
    KA.In.defineButtons(BTNS);
  }

  /* ---------------- draw ---------------- */
  function draw(ctx) {
    const T0 = KA.Races.TIERS[tier];
    D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H,
      [[0, '#7fd8f0'], [0.3, '#2f93c4'], [1, '#08324c']], 'rcbg'));
    if (phase === 'lobby') return lobby(ctx);

    // crowd on the surface
    D.rect(ctx, 0, 0, KA.W, 46, 'rgba(4,24,38,.55)');
    for (let i = 0; i < 40; i++) {
      const cx = ((i * 37 - camX * 0.3) % (KA.W + 60)) - 30;
      const bounce = Math.sin(t * 5 + i) > 0.4 ? -3 : 0;
      D.circle(ctx, cx, 26 + (i % 3) * 8 + bounce, 5, KA.Races.COLS[i % KA.Races.COLS.length]);
    }
    D.rect(ctx, 0, 44, KA.W, 3, '#0d3d58');
    // lanes
    for (let i = 0; i < 6; i++) {
      const y = laneY(i);
      ctx.globalAlpha = 0.35;
      for (let x = -(camX % 24); x < KA.W; x += 24) D.rect(ctx, x, y + 22, 12, 2, '#1b6b93');
      ctx.globalAlpha = 1;
    }
    // seabed
    D.rect(ctx, 0, KA.H - 26, KA.W, 26, D.vgrad(ctx, 0, KA.H - 26, 0, KA.H, [[0, '#e0cfa0'], [1, '#a89468']], 'rcs'));
    // finish line
    const fx = sx(T0.len);
    if (fx > -30 && fx < KA.W + 30) {
      for (let y = 60; y < KA.H - 20; y += 12) D.rect(ctx, fx, y, 7, 6, ((y / 12) | 0) % 2 ? '#fff' : '#12202c');
      D.rr(ctx, fx - 26, 52, 60, 18, 5, '#c9343f');
      T.draw(ctx, 'FINISH', fx + 4, 55, '#fff', { size: 11, align: 'center', weight: 900 });
    }
    // obstacles
    for (const o of obstacles) {
      const x = sx(o.x), y = laneY(o.lane) + 20;
      if (x < -30 || x > KA.W + 30) continue;
      if (o.kind === 'kelp') KA.Rig.sea.prop(ctx, { x, kind: 'kelp', s: 0.5, ph: o.x }, y, {});
      else if (o.kind === 'crab') KA.Rig.sea.creature(ctx, { kind: 'crabby', x, y: y - 8, s: 0.8, dir: 1, ph: o.x, hue: 0 });
      else KA.Rig.sea.prop(ctx, { x, kind: 'urchin', s: 0.8, ph: o.x }, y, {});
    }
    // racers, top lane first so nearer lanes layer over the ones behind
    const onScreen = [];
    for (const r of racers) {
      const x = sx(Math.min(r.x, KA.Races.TIERS[tier].len + 40));
      if (x < -60 || x > KA.W + 60) { D.rr(ctx, x < 0 ? 2 : KA.W - 6, r.y, 4, 10, 2, r.col); continue; }
      const hop = r.hop > 0 ? -Math.sin((0.5 - r.hop) / 0.5 * Math.PI) * 22 : 0;
      onScreen.push({ r, x, y: r.y + hop + Math.sin(t * 6 + r.ph) * 2 });
    }
    onScreen.sort((a, b) => a.r.lane - b.r.lane);
    // pass 1: name tags and stamina pips sit behind every rig
    for (const { r, x, y } of onScreen) {
      const nw = T.width(ctx, r.name, 10, 800) + 12;
      D.rr(ctx, x - nw / 2, y - 24, nw, 14, 7, 'rgba(4,18,29,.6)');
      T.draw(ctx, r.name, x, y - 22, r.mine ? P.gold : '#dff0fb', { size: 10, align: 'center', weight: 800 });
      D.rr(ctx, x - 15, y + 17, 30, 4, 2, 'rgba(0,0,0,.45)');
      D.rr(ctx, x - 15, y + 17, 30 * (r.stam / r.stamMax), 4, 2, r.stam > r.stamMax * 0.3 ? P.kelp : P.coral);
    }
    // pass 2: the mounts and their riders
    for (const { r, x, y } of onScreen) {
      const ms = laneScale(r.pet);
      if (r.surge) {
        ctx.globalAlpha = 0.3;
        for (let k = 1; k <= 3; k++) KA.Rig.pet.draw(ctx, r.pet, x - k * 9, y, { scale: ms * 0.94, speed: 2, tag: 'gh' + r.lane });
        ctx.globalAlpha = 1;
      }
      KA.Rig.pet.draw(ctx, r.pet, x, y, { scale: ms, speed: 0.5 + r.v / 60, tag: 'rc' + r.lane });
      if (r.mine) {
        KA.Rig.king.draw(ctx, x - 2, y + KA.Pet.rideY(r.pet) * ms + 4, { scale: 0.52, mode: 'ride', dir: 1,
          vx: r.v, fat: S.D.fat, weapon: S.weapon(), dt: 1 / 60 });
        D.tri(ctx, [x - 5, y - 38], [x + 5, y - 38], [x, y - 32], P.gold);
      }
      if (r.finished) T.draw(ctx, '#' + r.place, x + 24, y - 12, P.gold, { size: 13, weight: 900 });
    }
    KA.FX.drawWorld(ctx);
    hud(ctx, T0);
    if (phase === 'count') {
      KA.UI.dim(ctx, 0.3);
      const n = Math.ceil(countT);
      T.draw(ctx, n <= 0 ? 'GO!' : String(n), KA.W / 2, KA.H / 2 - 40, n === 1 ? P.gold : P.text,
        { size: 60, align: 'center', weight: 900, shadow: true });
      T.draw(ctx, KA.touch ? 'hold GO to surge, HOP over obstacles' : 'hold SPACE to surge, K to hop',
        KA.W / 2, KA.H / 2 + 30, P.cyan, { size: 15, align: 'center', weight: 800 });
    }
    if (phase === 'done' && res) results(ctx, T0);
    KA.UI.touchPad(ctx, BTNS);
  }

  function hud(ctx, T0) {
    const me = racers.find((r) => r.mine);
    // the scoreboard lives over the crowd, never in a swim lane
    D.rr(ctx, 6, 6, 158, 32, 8, 'rgba(4,18,29,.8)');
    T.draw(ctx, T.fit(ctx, T0.name, 13, 900, 144), 14, 9, T0.col, { size: 13, weight: 900 });
    const sorted = racers.slice().sort((a, b) => (b.finished ? 1e6 - b.place : b.x) - (a.finished ? 1e6 - a.place : a.x));
    T.draw(ctx, 'POS ' + (sorted.indexOf(me) + 1) + '/' + racers.length, 14, 24, P.gold, { size: 12, weight: 800 });
    T.draw(ctx, Math.round(U.clamp(me.x / T0.len, 0, 1) * 100) + '%', 156, 24, P.dim, { size: 12, align: 'right' });
    // mini track
    const mw = Math.min(180, KA.W - 340), mx = KA.W - mw - 10;
    D.rr(ctx, mx, 14, mw, 10, 5, 'rgba(3,16,26,.7)');
    for (const r of racers) D.circle(ctx, mx + 4 + (mw - 8) * U.clamp(r.x / T0.len, 0, 1), 19, 3.4, r.mine ? P.gold : r.col);
    if (me && !me.finished) {
      KA.UI.bar(ctx, 8, KA.H - 30, 170, 20, me.stam / me.stamMax,
        { col: me.surge ? P.amber : P.kelp, label: me.surge ? 'SURGING' : 'STAMINA', ls: 12 });
    }
    if (annT > 0 && ann) {
      ctx.globalAlpha = U.clamp(annT, 0, 1);
      // the call sits in the gap between the scoreboard and the mini track
      const gl = 170, gr = mx - 8, gc = (gl + gr) / 2;
      const txt = T.fit(ctx, ann, 14, 900, gr - gl - 24);
      const w = T.width(ctx, txt, 14, 900) + 24;
      D.rr(ctx, gc - w / 2, 8, w, 26, 13, 'rgba(4,18,29,.92)');
      T.draw(ctx, txt, gc, 14, P.gold, { size: 14, align: 'center', weight: 900 });
      ctx.globalAlpha = 1;
    }
  }

  function results(ctx, T0) {
    KA.UI.dim(ctx, 0.65);
    const w = Math.min(400, KA.W - 40), x = KA.W / 2 - w / 2;
    const p = KA.UI.panel(ctx, x, 24, w, KA.H - 60, res.place === 1 ? 'WINNER!' : 'FINISHED #' + res.place,
      { titleCol: res.place === 1 ? P.gold : P.text });
    let y = p.cy;
    order.forEach((r, i) => {
      D.rr(ctx, x + 12, y, w - 24, 20, 5, r.mine ? 'rgba(127,232,255,.14)' : 'rgba(255,255,255,.05)');
      T.draw(ctx, '#' + r.place, x + 20, y + 3, i === 0 ? P.gold : P.dim, { size: 12, weight: 900 });
      D.circle(ctx, x + 48, y + 10, 4, r.col);
      T.draw(ctx, r.name + (r.mine ? '  (YOU)' : ''), x + 58, y + 3, r.mine ? P.cyan : P.text, { size: 12, weight: 700 });
      T.draw(ctx, r.time.toFixed(2) + 's', x + w - 20, y + 3, P.dim, { size: 12, align: 'right' });
      y += 22;
    });
    y += 6;
    const rows = [['Purse', '+' + U.fmt(res.purse) + 'c'],
                  ['Bet', res.betWin ? '+' + U.fmt(res.betWin) + 'c' : (stake ? 'lost ' + U.fmt(stake) + 'c' : 'no bet')],
                  ['Mount EXP', '+' + res.exp + (res.levels ? '  (' + res.levels + ' level up!)' : '')],
                  ['Roll tokens', '+' + res.tokens]];
    rows.forEach((r, i) => {
      T.draw(ctx, r[0], x + 20, y + i * 20, P.dim, { size: 13, weight: 700 });
      T.draw(ctx, r[1], x + w - 20, y + i * 20, P.gold, { size: 13, weight: 900, align: 'right' });
    });
    if (KA.UI.button(ctx, x + 16, KA.H - 60, (w - 44) / 2, 34, 'RACE AGAIN', { tone: 'blue', size: 15 })) { phase = 'lobby'; build(); }
    if (KA.UI.button(ctx, x + w / 2 + 6, KA.H - 60, (w - 44) / 2, 34, 'LEAVE', { tone: 'gold', size: 15, key: 'Enter' }))
      KA.Game.go('world', {});
  }

  function lobby(ctx) {
    const T0 = KA.Races.TIERS[tier];
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 6; i++) D.circle(ctx, (i * 181 + 50) % KA.W, 50 + i * 56, 66, '#1d6d94');
    ctx.globalAlpha = 1;
    T.draw(ctx, T0.name, 16, 12, T0.col, { size: 22, weight: 900, shadow: true });
    const meta = 'entry ' + T0.entry + 'c   purse ' + T0.purse[0] + 'c';
    T.draw(ctx, KA.W < 560 ? meta : T0.blurb + '   ' + meta, 16, 40, P.dim, { size: 12, weight: 700 });
    T.draw(ctx, U.fmt(S.D.clams) + ' clams', KA.W - 14, 14, P.gold, { size: 16, align: 'right', weight: 800 });

    const lw = Math.min(KA.W - 190, 430);
    field.forEach((r, i) => {
      const y = 64 + i * 42;
      const sel = bet === i;
      D.rr(ctx, 12, y, lw, 38, 8, sel ? 'rgba(255,201,74,.18)' : (r.mine ? 'rgba(127,232,255,.12)' : 'rgba(255,255,255,.05)'));
      if (sel) D.rr(ctx, 12, y, lw, 38, 8, null, { line: P.gold, lineW: 2 });
      D.rr(ctx, 16, y + 4, 5, 30, 2.5, r.col);
      KA.Rig.pet.draw(ctx, r.pet, 46, y + 20, { scale: 0.55, speed: 0.3, tag: 'lb' + i });
      // the odds keep their own column; name and stats trim rather than run under it
      const oddsTxt = 'x' + odds[i].toFixed(2);
      const availW = lw - 88 - T.width(ctx, oddsTxt, 15, 900);
      T.draw(ctx, T.fit(ctx, r.name + (r.mine ? '  (YOU)' : ''), 14, 800, availW), 74, y + 5,
        r.mine ? P.cyan : P.text, { size: 14, weight: 800 });
      let sub = KA.Pets.byId[r.sp].name + '   SPD ' + r.stats.spd + '  STA ' + r.stats.sta + '  PWR ' + r.stats.pwr;
      if (T.width(ctx, sub, 11, 600) > availW) sub = 'SPD ' + r.stats.spd + '  STA ' + r.stats.sta + '  PWR ' + r.stats.pwr;
      if (T.width(ctx, sub, 11, 600) > availW) sub = KA.Pets.byId[r.sp].name;
      T.draw(ctx, sub, 74, y + 22, P.dim, { size: 11, weight: 600 });
      T.draw(ctx, oddsTxt, lw - 8, y + 10, odds[i] > 6 ? P.gold : P.text, { size: 15, align: 'right', weight: 900 });
      if (KA.UI.hit(12, y, lw, 38) && KA.In.mouse.click && !KA.UI.blocked()) {
        KA.In.mouse.click = false;
        bet = bet === i ? -1 : i;
        if (bet >= 0 && stake === 0) stake = Math.min(S.D.clams, 20);
        KA.A.play('blip');
      }
    });
    // betting box
    const bx = lw + 24, bw = KA.W - bx - 12;
    KA.UI.panel(ctx, bx, 64, bw, 150, 'BOOKMAKER', { titleCol: P.gold });
    if (bet < 0) {
      T.block(ctx, 'Tap a racer to back them. Long odds mean nobody believes in them. Betting is optional.',
        bx + 10, 102, P.dim, { size: 12, max: bw - 20, lh: 16 });
    } else {
      T.draw(ctx, 'ON: ' + field[bet].name, bx + 10, 100, P.text, { size: 14, weight: 800 });
      T.draw(ctx, 'x' + odds[bet].toFixed(2) + '  ->  ' + U.fmt(Math.round(stake * odds[bet])) + 'c',
        bx + 10, 118, P.gold, { size: 13, weight: 800 });
      [10, 50, 250].forEach((s2, i) => {
        if (KA.UI.button(ctx, bx + 10 + i * ((bw - 28) / 3 + 4), 138, (bw - 28) / 3, 26, '+' + s2,
            { tone: 'dark', size: 12, disabled: stake + s2 > S.D.clams, id: 'st' + i })) stake += s2;
      });
      if (KA.UI.button(ctx, bx + 10, 170, (bw - 24) / 2, 26, 'CLEAR', { tone: 'red', size: 12 })) stake = 0;
      if (KA.UI.button(ctx, bx + 16 + (bw - 24) / 2, 170, (bw - 24) / 2, 26, 'MAX', { tone: 'gold', size: 12 }))
        stake = S.D.clams;
      T.draw(ctx, 'STAKE ' + U.fmt(stake), bx + bw / 2, 200, P.text, { size: 13, align: 'center', weight: 900 });
    }
    const lvl = KA.Pet.level(S.active());
    const why = lvl < T0.minLvl ? 'needs a level ' + T0.minLvl + ' mount'
      : S.D.clams < T0.entry + stake ? 'not enough clams' : null;
    if (KA.UI.button(ctx, bx, KA.H - 96, bw, 44, why ? 'CANNOT RACE' : 'START', { tone: why ? 'dark' : 'green',
        size: 20, disabled: !!why, key: 'Enter', sub: why || (T0.entry + stake) + 'c total' })) begin();
    if (KA.UI.button(ctx, bx, KA.H - 46, bw, 34, 'LEAVE', { tone: 'dark', size: 15, key: 'Escape' }))
      KA.Game.go('world', {});
    // tier switcher
    KA.Races.TIERS.forEach((tr, i) => {
      const w2 = lw / 5, lab = tr.name.split(' ')[0];
      if (KA.UI.button(ctx, 12 + i * w2, KA.H - 44, w2 - 4, 32, lab,
          { tone: tier === i ? 'gold' : 'dark', size: U.clamp((w2 - 10) / (lab.length * 0.58), 8, 11), id: 'tr' + i,
            disabled: KA.Pet.level(S.active()) < tr.minLvl, sub: 'Lv' + tr.minLvl })) {
        tier = i; build(); bet = -1; stake = 0;
      }
    });
  }
  return { enter, update, draw };
})();
