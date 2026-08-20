/* ============================================================
   ranch.js - the hub. Dolphins swim, buildings are clickable,
   the bottom bar is your dolphin, and NEXT DAY runs the sim.
   ============================================================ */
DZ.Scenes.ranch = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, W = DZ.Water, PAL = DZ.PAL;
  const SURFACE = 46, SAND = 168, BAR = 186;
  let t = 0, ents = [], hoverB = null, overlay = null, report = [], feedTab = 0, splashes = [];
  let deco = [];

  const BUILDINGS = [
    { id: 'dive',  sprite: 'arch',       x: 6,   sc: 2, label: 'DIVE',    sub: 'hunt fish',    scene: 'reef',      col: '#7ff0ff' },
    { id: 'feed',  sprite: 'trough',     x: 52,  sc: 2, label: 'FEED',    sub: 'gain EXP',     action: 'feed',     col: '#40d492' },
    { id: 'shop',  sprite: 'hut',        x: 88,  sc: 2, label: 'GEAR',    sub: '& ranch',      scene: 'shop',      col: '#ffb347' },
    { id: 'market',sprite: 'stall',      x: 136, sc: 2, label: 'MARKET',  sub: 'sell fish',    scene: 'market',    col: '#ffd24a' },
    { id: 'quest', sprite: 'board',      x: 178, sc: 2, label: 'QUESTS',  sub: 'get paid',     scene: 'questboard',col: '#ff9ed2' },
    { id: 'staff', sprite: 'bunk',       x: 210, sc: 2, label: 'STAFF',   sub: 'hire help',    scene: 'staff',     col: '#8fd8ff' },
    { id: 'breed', sprite: 'clam_shell',  x: 252, sc: 3, label: 'BREED',   sub: 'more dolphins',scene: 'breed',     col: '#ff6f9d', need: 'lagoon' },
    { id: 'vat',   sprite: 'vat',        x: 288, sc: 2, label: 'VAT',     sub: 'make evil',    scene: 'vat',       col: '#a86bff', need: 'vat' },
    { id: 'race',  sprite: 'starttower', x: 330, sc: 2, label: 'RACE',    sub: 'bet & win',    scene: 'racelobby', col: '#ff6f6f' }
  ];

  function enter(args) {
    t = 0; overlay = (args && args.overlay) || null; hoverB = null;
    if (args && args.report) { report = args.report; overlay = 'report'; }
    sync();
    const S0 = DZ.State.S;
    if (!S0.tutorial) {
      S0.tutorial = 1;
      DZ.State.toast('Welcome to your ranch!', DZ.PAL.gold);
      DZ.State.toast('1. DIVE for fish  2. FEED your dolphin', DZ.PAL.cyan);
      DZ.State.toast('3. spend SP in SKILLS  4. RACE and bet', DZ.PAL.kelp);
    }
    deco = [];
    for (let i = 0; i < 14; i++) {
      const sp = U.pick(DZ.Species.forZone(0));
      deco.push({ x: U.rnd(0, DZ.W), y: U.rnd(SURFACE + 12, SAND - 8), sp, dir: U.chance(0.5) ? 1 : -1,
                  v: U.rnd(8, 22), ph: U.rnd(0, 9) });
    }
    DZ.UI.resetScroll('feedfish'); DZ.UI.resetScroll('feedfood');
  }

  function sync() {
    const ros = DZ.State.roster();
    const keep = [];
    for (const d of ros) {
      let e = ents.find((x) => x.id === d.id);
      if (!e) {
        e = { id: d.id, x: U.rnd(30, 340), y: U.rnd(SURFACE + 18, SAND - 30), vx: 0, vy: 0,
              tx: 0, ty: 0, dir: 1, ph: U.rnd(0, 9), jump: 0, nextJump: U.rnd(3, 12), retarget: 0 };
        pickTarget(e);
      }
      keep.push(e);
    }
    ents = keep;
  }
  function pickTarget(e) {
    e.tx = U.rnd(24, DZ.W - 34);
    e.ty = U.rnd(SURFACE + 14, SAND - 26);
    e.retarget = U.rnd(1.6, 4.2);
  }

  function update(dt) {
    t += dt; W.tick(dt);
    if (DZ.State.roster().length !== ents.length) sync();

    for (const e of ents) {
      const d = DZ.State.roster().find((x) => x.id === e.id);
      const mood = d ? d.mood : 0.6;
      e.retarget -= dt;
      if (e.retarget <= 0) pickTarget(e);
      const spd = 26 + mood * 34;
      const ax = (e.tx - e.x), ay = (e.ty - e.y);
      const l = Math.hypot(ax, ay) || 1;
      e.vx = U.damp(e.vx, (ax / l) * spd, 0.02, dt);
      e.vy = U.damp(e.vy, (ay / l) * spd, 0.02, dt);
      // jumping
      e.nextJump -= dt * (0.5 + mood);
      if (e.nextJump <= 0 && e.jump <= 0) {
        e.jump = 1.25; e.nextJump = U.rnd(6, 16);
        e.jx = e.x; e.jdir = e.vx >= 0 ? 1 : -1;
        DZ.Audio.play('squeak');
      }
      if (e.jump > 0) {
        e.jump -= dt;
        e.x += e.jdir * 46 * dt;
        if (e.jump <= 0) {
          splashes.push({ x: e.x, y: SURFACE, t: 0.5 });
          DZ.FX.bubbles(e.x, SURFACE + 4, 8, { big: true });
          DZ.FX.ringWave(e.x, SURFACE, 2, 16, '#dff6ff', 0.4);
          DZ.Audio.play('splash');
        }
      } else {
        e.x += e.vx * dt; e.y += e.vy * dt;
      }
      e.x = U.clamp(e.x, 14, DZ.W - 24);
      e.y = U.clamp(e.y, SURFACE + 8, SAND - 22);
      if (Math.abs(e.vx) > 3) e.dir = e.vx > 0 ? 1 : -1;
      if (U.chance(dt * 0.5)) DZ.FX.bubbles(e.x + e.dir * 10, e.y - 2, 1);
    }
    for (let i = splashes.length - 1; i >= 0; i--) { splashes[i].t -= dt; if (splashes[i].t <= 0) splashes.splice(i, 1); }
    for (const f of deco) {
      f.x += f.v * f.dir * dt;
      if (f.x > DZ.W + 8) { f.x = -8; f.dir = 1; }
      if (f.x < -8) { f.x = DZ.W + 8; f.dir = -1; }
      // scatter away from a passing dolphin
      for (const e of ents) {
        if (Math.abs(e.x - f.x) < 26 && Math.abs(e.y - f.y) < 16) {
          f.dir = e.x > f.x ? -1 : 1;
          f.y += (f.y > e.y ? 1 : -1) * 22 * dt;
        }
      }
      f.y = U.clamp(f.y, SURFACE + 10, SAND - 6);
    }
  }

  /* ---------------- drawing ---------------- */
  function draw(ctx) {
    const S = DZ.State.S;
    // sky & water
    Px.vgrad(ctx, 0, 0, DZ.W, SURFACE, '#0e2f4a', '#2f7ea8', 5);
    Px.vgrad(ctx, 0, SURFACE - 2, DZ.W, SAND - SURFACE + 4, '#2e8fc0', '#07304a', 11);
    ctx.globalAlpha = 0.5;
    Px.rect(ctx, 0, 40, DZ.W, 9, '#0a2436');
    ctx.globalAlpha = 1;
    // distant ruins behind the ranch
    ctx.globalAlpha = 0.30;
    const ruin = { '1': '#12455f', '2': '#0c3247', '3': '#1a5d7c', '4': '#092634', '5': '#1a5d7c' };
    Px.draw(ctx, 'pillar', 40, SAND - 44, { scale: 2, recolor: ruin });
    Px.draw(ctx, 'arch', 150, SAND - 34, { scale: 2, recolor: ruin });
    Px.draw(ctx, 'pillar_broken', 262, SAND - 30, { scale: 2, recolor: ruin });
    Px.draw(ctx, 'statue', 344, SAND - 40, { scale: 2, recolor: ruin });
    ctx.globalAlpha = 1;
    W.shafts(ctx, 5, 0.06, null, null, SURFACE, SAND - SURFACE);
    W.surfaceLine(ctx, SURFACE);
    W.caustics(ctx, SAND - 6, 6, 0.07);
    // sand + decor
    W.ground(ctx, SAND, DZ.W, '#e2ce97', '#b79a5f');
    for (let i = 0; i < 9; i++) W.kelp(ctx, 16 + i * 45, SAND + 3, 16 + (i % 3) * 9, i * 1.7, '#1c6b46', '#31a468');
    Px.draw(ctx, 'rock', 68, SAND - 4, {});
    Px.draw(ctx, 'coral_fan', 128, SAND - 5, {});
    Px.draw(ctx, 'coral_tube', 232, SAND - 5, {});
    Px.draw(ctx, 'urchin', 316, SAND - 4, {});
    Px.draw(ctx, 'buoy', 24, SURFACE - 4, {});
    Px.draw(ctx, 'buoy', 372, SURFACE - 4, {});

    // buildings
    hoverB = null;
    for (const b of BUILDINGS) {
      const sz = Px.size(b.sprite);
      const w = sz.w * b.sc, h = sz.h * b.sc;
      const y = SAND - h + 2 + Math.round(Math.sin(t * 1.1 + b.x) * 0.5);
      const locked = b.need && DZ.Upgrades.value(S, b.need) < 1;
      const hot = DZ.UI.hover(b.x, y - 8, w, h + 8) && !overlay;
      if (hot) hoverB = b;
      if (hot) { ctx.globalAlpha = 1; Px.draw(ctx, b.sprite, b.x, y - 1, { scale: b.sc, flash: '#ffffff' }); }
      Px.draw(ctx, b.sprite, b.x, y, { scale: b.sc, alpha: locked ? 0.45 : 1 });
      b._r = { x: b.x, y, w, h };
      if (locked) {
        Px.draw(ctx, 'skull', b.x + w / 2 - 2, y + h / 2 - 4, { alpha: 0.9 });
      }
      // little plaque under each so the label reads against the sand
      const lw = T.width(b.label, 7) + 6;
      Px.rect(ctx, b.x + w / 2 - lw / 2, SAND + 2, lw, 10, '#062033');
      Px.frame(ctx, b.x + w / 2 - lw / 2, SAND + 2, lw, 10, hot ? '#ffffff' : Px.mix(b.col, '#000000', 0.45));
      T.draw(ctx, b.label, b.x + w / 2, SAND + 4, hot ? '#ffffff' : b.col, { align: 'center', size: 7 });
      if (hot && DZ.Input.mouse.click && !DZ.UI.blocked()) {
        DZ.Input.mouse.click = false;
        if (locked) { DZ.Audio.play('deny'); DZ.State.toast('Build it first: GEAR > RANCH tab', PAL.coral); }
        else if (b.action === 'feed') { overlay = 'feed'; DZ.Audio.play('blip'); }
        else { DZ.Audio.play('click'); DZ.Game.go(b.scene); }
      }
    }

    // decorative fish
    for (const f of deco) {
      const y = f.y + Math.sin(t * 3 + f.ph) * 1.5;
      Px.draw(ctx, f.sp.sprite, f.x, y, { recolor: f.sp.pal, flipX: f.dir < 0, center: true, alpha: 0.9 });
    }
    // splash puffs
    for (const s of splashes) {
      const f = 1 - s.t / 0.5;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.15 + i / 8 * 0.7);
        Px.rect(ctx, s.x - Math.cos(a) * f * 20, s.y - Math.sin(a) * f * 14 + f * f * 10, 2, 2, '#dff6ff');
      }
    }

    // dolphins
    const sel = DZ.State.selected();
    for (const e of ents) {
      const d = DZ.State.roster().find((x) => x.id === e.id);
      if (!d) continue;
      let y = e.y, rot = 0;
      if (e.jump > 0) {
        const p = 1 - e.jump / 1.25;
        y = e.y - Math.sin(p * Math.PI) * (e.y - SURFACE + 34);
        rot = (0.5 - p) * -1.5 * e.jdir;
      } else {
        y += Math.sin(t * 2.4 + e.ph) * 1.5;
      }
      const frame = Math.floor(t * (5 + Math.abs(e.vx) * 0.08) + e.ph) % 2;
      const isSel = sel && sel.id === d.id;
      if (isSel) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
        Px.ring(ctx, e.x, y, 17, PAL.gold);
        ctx.globalAlpha = 1;
      }
      DZ.Dolphin.draw(ctx, d, e.x, y, { center: true, flipX: e.dir < 0, frame, rot, scale: 1 });
      if (d.hunger > 1) T.draw(ctx, 'x', e.x + 6, y - 14, PAL.coral, { size: 8, align: 'center' });
      if (d.sp > 0) Px.draw(ctx, 'star', e.x - 3, y - 16, {});
      // click to select
      if (!overlay && DZ.UI.hover(e.x - 13, y - 9, 26, 18)) {
        DZ.UI.tooltip(d.name + ' - lvl ' + DZ.Dolphin.level(d) + (d.evil ? ' (EVIL)' : ''));
        if (DZ.Input.mouse.click && !DZ.UI.blocked()) {
          DZ.Input.mouse.click = false;
          DZ.State.select(d.id); DZ.Audio.play('squeak');
          DZ.FX.text(e.x, y - 20, d.name, PAL.gold, { size: 8 });
        }
      }
    }
    W.marineSnow(ctx, 0, 0, 1 / 60);
    Px.rect(ctx, 0, BAR - 2, DZ.W, 2, '#03131d');

    // ---- top bar + next day ----
    DZ.Game.topbar(ctx, { back: false });
    T.draw(ctx, 'THE RANCH', DZ.W / 2 - 6, 3, PAL.text, { size: 8, align: 'center', bold: true });
    if (DZ.UI.button(ctx, DZ.W - 108, 1, 58, 11, 'NEXT DAY', { tone: 'gold', size: 7, key: 'KeyN',
        tip: 'Sleep. Staff work, dolphins train, market moves. (N)' })) {
      report = DZ.State.nextDay();
      overlay = 'report';
      DZ.Audio.play('happy');
    }
    if (DZ.UI.button(ctx, DZ.W - 155, 1, 45, 11, 'TITLE', { tone: 'dark', size: 7 })) DZ.Game.go('title');

    bottomBar(ctx);
    if (hoverB && !overlay) {
      const r = hoverB._r;
      const label = hoverB.label + ' - ' + hoverB.sub;
      const w = T.width(label, 7) + 8;
      const x = U.clamp(r.x + r.w / 2 - w / 2, 2, DZ.W - w - 2);
      Px.rect(ctx, x, r.y - 13, w, 11, '#041420');
      Px.frame(ctx, x, r.y - 13, w, 11, hoverB.col);
      T.draw(ctx, label, x + 4, r.y - 11, hoverB.col, { size: 7 });
    }
    if (overlay === 'feed') drawFeed(ctx);
    else if (overlay === 'report') drawReport(ctx);
  }

  /* ---------------- bottom bar ---------------- */
  function bottomBar(ctx) {
    const S = DZ.State.S;
    Px.rect(ctx, 0, BAR, DZ.W, DZ.H - BAR, '#061e2e');
    Px.rect(ctx, 0, BAR, DZ.W, 1, PAL.line);
    const d = DZ.State.selected();
    if (!d) return;
    const lp = DZ.Dolphin.levelProgress(d);
    const st = DZ.Dolphin.stats(d, S);

    // roster arrows + portrait
    const ros = DZ.State.roster();
    const idx = ros.findIndex((x) => x.id === d.id);
    if (ros.length > 1) {
      if (DZ.UI.button(ctx, 1, BAR + 10, 8, 13, '<', { tone: 'dark', size: 8, key: 'KeyQ', id: 'prevd' }))
        DZ.State.select(ros[(idx - 1 + ros.length) % ros.length].id);
      if (DZ.UI.button(ctx, 37, BAR + 10, 8, 13, '>', { tone: 'dark', size: 8, key: 'KeyE', id: 'nextd' }))
        DZ.State.select(ros[(idx + 1) % ros.length].id);
    }
    Px.rect(ctx, 10, BAR + 9, 26, 15, '#04121d');
    Px.frame(ctx, 10, BAR + 9, 26, 15, '#123246');
    DZ.Dolphin.draw(ctx, d, 23, BAR + 16, { center: true, scale: 1 });
    T.draw(ctx, 'PENS ' + ros.length + '/' + DZ.State.maxDolphins(), 23, BAR + 26, PAL.dim2, { size: 7, align: 'center' });

    // name & level
    const x = 48;
    T.draw(ctx, d.name, x, BAR + 2, d.evil ? PAL.evil : PAL.text, { size: 8, bold: true });
    const nw = T.width(d.name, 8, true);
    T.draw(ctx, 'Lv' + lp.lvl, x + nw + 5, BAR + 3, PAL.gold, { size: 7, bold: true });
    T.draw(ctx, d.evil ? 'EVIL' : DZ.Dolphin.tierName(d), x + nw + 5 + T.width('Lv' + lp.lvl, 7, true) + 4, BAR + 3,
      d.evil ? PAL.evil : PAL.dim, { size: 7 });
    DZ.UI.bar(ctx, x, BAR + 11, 100, 7, lp.frac, { col: PAL.cyan, label: Math.floor(lp.cur) + '/' + lp.need + ' EXP' });
    DZ.UI.bar(ctx, x, BAR + 20, 40, 5, d.mood, { col: d.mood > 0.5 ? PAL.kelp : PAL.coral, bg: '#05202f' });
    T.draw(ctx, d.mood > 0.7 ? 'happy' : d.mood > 0.4 ? 'ok' : 'grumpy', x + 43, BAR + 19, PAL.dim, { size: 7 });
    if (d.sp > 0) {
      Px.rect(ctx, x + 104, BAR + 10, 28, 9, '#3a2a05');
      Px.frame(ctx, x + 104, BAR + 10, 28, 9, PAL.gold);
      T.draw(ctx, d.sp + ' SP', x + 106, BAR + 11, PAL.gold, { size: 7, bold: true });
    }
    let tx = x;
    for (const tr of d.traits.slice(0, 3)) {
      const TR = DZ.Names.TRAITS[tr];
      if (!TR) continue;
      if (tx + T.width(TR.name, 7) + 9 > 190) break;
      tx += DZ.UI.chip(ctx, tx, BAR + 27, TR.name.toUpperCase(), TR.col);
    }
    // mini stats
    const sx = 192;
    DZ.Dolphin.STATS.forEach((k, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = sx + col * 46, by = BAR + 3 + row * 10;
      T.draw(ctx, DZ.Dolphin.STAT_INFO[k].short, bx, by, DZ.Dolphin.STAT_INFO[k].col, { size: 7 });
      T.draw(ctx, String(st[k]), bx + 42, by, PAL.text, { size: 7, align: 'right', bold: true });
      if (DZ.UI.hover(bx, by - 1, 44, 9)) DZ.UI.tooltip(k.toUpperCase() + ': ' + DZ.Dolphin.STAT_INFO[k].blurb);
    });

    // buttons
    if (DZ.UI.button(ctx, 288, BAR + 3, 52, 15, 'FEED', { tone: 'green', size: 8, key: 'KeyF',
        tip: 'Feed fish or food for EXP (F)' })) { overlay = 'feed'; }
    if (DZ.UI.button(ctx, 288, BAR + 21, 52, 15, 'SKILLS', { tone: 'blue', size: 8, key: 'KeyT',
        sub: d.sp ? '+' + d.sp : '', tip: 'Stats, skill tree, abilities (T)' })) DZ.Game.go('dolphinview');
    if (DZ.UI.button(ctx, 344, BAR + 3, 52, 15, 'DIVE', { tone: 'gold', size: 8, key: 'KeyR',
        tip: 'Go hunt fish (R)' })) DZ.Game.go('reef');
    if (DZ.UI.button(ctx, 344, BAR + 21, 52, 15, 'RACE', { tone: 'red', size: 8,
        tip: 'Enter a race and place bets' })) DZ.Game.go('racelobby');
  }

  /* ---------------- feed overlay ---------------- */
  function drawFeed(ctx) {
    const S = DZ.State.S;
    DZ.UI.dim(ctx, 0.65);
    const d = DZ.State.selected();
    const px = 24, py = 20, pw = DZ.W - 48, ph = 180;
    DZ.UI.panel(ctx, px, py, pw, ph, 'FEED ' + (d ? d.name.toUpperCase() : ''), {});
    if (DZ.UI.button(ctx, px + pw - 16, py + 1, 15, 11, 'X', { tone: 'red', size: 7, key: 'Escape' })) { overlay = null; return; }
    const lp = DZ.Dolphin.levelProgress(d);
    DZ.UI.bar(ctx, px + 6, py + 16, pw - 12, 8, lp.frac, { col: PAL.cyan, label: 'Lv' + lp.lvl + '   ' + Math.floor(lp.cur) + ' / ' + lp.need + ' EXP' });

    const tabs = ['FISH (' + DZ.State.fishTotal() + ')', 'FOOD (' + DZ.State.foodCount() + ')'];
    tabs.forEach((tb, i) => {
      if (DZ.UI.button(ctx, px + 6 + i * 76, py + 28, 74, 13, tb, { tone: feedTab === i ? 'gold' : 'dark', size: 7 })) feedTab = i;
    });
    if (DZ.UI.button(ctx, px + pw - 78, py + 28, 72, 13, 'FEAST (ALL FISH)', { tone: 'green', size: 7,
        tip: 'Feed every fish you own to this dolphin.' })) feastAll(d);

    const lx = px + 6, ly = py + 45, lw = pw - 12, lh = ph - 52;
    Px.rect(ctx, lx, ly, lw, lh, '#04121d');
    Px.frame(ctx, lx, ly, lw, lh, '#123246');

    if (feedTab === 0) {
      const keys = Object.keys(S.inv.fish).filter((k) => DZ.Species.get(k));
      const rows = [];
      for (const k of keys) {
        const e = S.inv.fish[k], sp = DZ.Species.get(k);
        if (e.n - e.live > 0) rows.push({ sp, live: false, n: e.n - e.live });
        if (e.live > 0) rows.push({ sp, live: true, n: e.live });
      }
      if (!rows.length) {
        T.draw(ctx, 'No fish. Go DIVE and get some!', lx + lw / 2, ly + lh / 2 - 4, PAL.dim, { align: 'center', size: 8 });
      }
      DZ.UI.scroll('feedfish', ctx, lx + 1, ly + 1, lw - 2, lh - 2, rows.length * 17 + 2, (ox, oy, ow) => {
        rows.forEach((r, i) => {
          const y = oy + 2 + i * 17;
          if (y > ly + lh || y < ly - 18) return;
          Px.rect(ctx, ox + 1, y, ow - 3, 15, i % 2 ? '#062033' : '#07283c');
          Px.draw(ctx, r.sp.sprite, ox + 4, y + 4, { recolor: r.sp.pal, scale: 1 });
          T.draw(ctx, r.sp.name + (r.live ? ' (LIVE)' : ''), ox + 22, y + 1, r.live ? PAL.kelp : PAL.text, { size: 7 });
          T.draw(ctx, 'x' + r.n, ox + 22, y + 8, PAL.dim, { size: 7 });
          T.draw(ctx, '+' + DZ.Dolphin.fishExpValue(r.sp, r.live) + ' EXP', ox + 128, y + 4, PAL.cyan, { size: 7 });
          if (r.sp.flags.cursed) T.draw(ctx, '+CORRUPT', ox + 176, y + 4, PAL.evil, { size: 7 });
          if (DZ.UI.button(ctx, ox + ow - 44, y + 1, 38, 13, 'FEED', { tone: 'green', size: 7, id: 'ff' + i })) {
            if (DZ.State.takeFish(r.sp.id, r.live, 1)) {
              const res = DZ.Dolphin.feedFish(d, r.sp, r.live, S);
              afterFeed(d, res);
            }
          }
        });
      });
    } else {
      const rows = DZ.Items.FOOD.filter((f) => (S.inv.food[f.id] || 0) > 0);
      if (!rows.length) T.draw(ctx, 'No food. Buy some at GEAR.', lx + lw / 2, ly + lh / 2 - 4, PAL.dim, { align: 'center', size: 8 });
      DZ.UI.scroll('feedfood', ctx, lx + 1, ly + 1, lw - 2, lh - 2, rows.length * 19 + 2, (ox, oy, ow) => {
        rows.forEach((f, i) => {
          const y = oy + 2 + i * 19;
          Px.rect(ctx, ox + 1, y, ow - 3, 17, i % 2 ? '#062033' : '#07283c');
          Px.draw(ctx, f.sprite, ox + 4, y + 5, {});
          T.draw(ctx, f.name, ox + 22, y + 1, f.col, { size: 7, bold: true });
          T.draw(ctx, f.blurb, ox + 22, y + 9, PAL.dim, { size: 7 });
          T.draw(ctx, 'x' + (S.inv.food[f.id] || 0), ox + ow - 92, y + 5, PAL.text, { size: 7, align: 'right' });
          T.draw(ctx, '+' + DZ.Dolphin.foodExpValue(f) + ' EXP', ox + ow - 50, y + 5, PAL.cyan, { size: 7, align: 'right' });
          if (DZ.UI.button(ctx, ox + ow - 44, y + 2, 38, 13, 'FEED', { tone: 'green', size: 7, id: 'fd' + i })) {
            if (DZ.State.takeFood(f.id, 1)) {
              const res = DZ.Dolphin.feedFood(d, f, S);
              afterFeed(d, res);
            }
          }
        });
      });
    }
  }

  function afterFeed(d, res) {
    DZ.State.event('feed', {});
    DZ.Audio.play('chomp');
    const e = ents.find((x) => x.id === d.id);
    const fx = e ? e.x : DZ.W / 2, fy = e ? e.y : 100;
    DZ.FX.text(fx, fy - 18, '+' + res.exp + ' EXP', PAL.cyan, { size: 8 });
    DZ.FX.burst(fx, fy, 8, { col: ['#7ff0ff', '#ffffff'], speed: 60 });
    DZ.FX.shake(2);
    if (U.chance(0.5)) DZ.FX.text(fx, fy + 8, U.pick(DZ.Names.quipsFeed), PAL.text, { size: 7, life: 1.4, vy: -8 });
    if (res.levels > 0) {
      DZ.Audio.play('levelup');
      DZ.FX.text(fx, fy - 30, 'LEVEL ' + res.level + '!', PAL.gold, { size: 10, life: 1.6 });
      DZ.FX.burst(fx, fy, 24, { col: ['#ffd24a', '#ffffff', '#7ff0ff'], speed: 130 });
      DZ.FX.flash('#ffd24a', 0.12);
      DZ.State.toast(d.name + ' reached level ' + res.level + '! +' + res.sp + ' SP', PAL.gold);
    }
    if (res.trait) {
      const TR = DZ.Names.TRAITS[res.trait];
      DZ.State.toast(d.name + ' developed: ' + TR.name + '!', TR.col);
      DZ.Audio.play('happy');
    }
    if (res.becameEvil) {
      DZ.State.toast(d.name + ' HAS TURNED EVIL. Cool hat though.', PAL.evil);
      DZ.Audio.play('evil'); DZ.FX.flash('#a86bff', 0.4);
    }
    DZ.State.save();
  }

  function feastAll(d) {
    const S = DZ.State.S;
    let n = 0, exp = 0, evil = false, lvls = 0;
    for (const k of Object.keys(S.inv.fish)) {
      const sp = DZ.Species.get(k); if (!sp) continue;
      const e = S.inv.fish[k];
      const live = e.live, dead = e.n - e.live;
      for (let i = 0; i < dead; i++) { const r = DZ.Dolphin.feedFish(d, sp, false, S); exp += r.exp; lvls += r.levels; evil = evil || r.becameEvil; n++; }
      for (let i = 0; i < live; i++) { const r = DZ.Dolphin.feedFish(d, sp, true, S); exp += r.exp; lvls += r.levels; evil = evil || r.becameEvil; n++; }
      delete S.inv.fish[k];
    }
    if (!n) { DZ.Audio.play('deny'); DZ.State.toast('No fish to feast on.', PAL.coral); return; }
    for (let i = 0; i < n; i++) DZ.State.event('feed', {});
    const e = ents.find((x) => x.id === d.id);
    const fx = e ? e.x : DZ.W / 2, fy = e ? e.y : 100;
    DZ.Audio.play('chomp'); DZ.Audio.play('happy');
    DZ.FX.text(fx, fy - 22, 'FEAST! +' + exp + ' EXP', PAL.gold, { size: 10, life: 1.8 });
    DZ.FX.burst(fx, fy, 30, { col: ['#ffd24a', '#7ff0ff', '#ffffff'], speed: 150 });
    DZ.FX.shake(5); DZ.FX.hitstop(0.05);
    DZ.State.toast(d.name + ' ate ' + n + ' fish (+' + exp + ' EXP' + (lvls ? ', +' + lvls + ' levels' : '') + ')', PAL.gold);
    if (evil) { DZ.State.toast(d.name + ' HAS TURNED EVIL.', PAL.evil); DZ.Audio.play('evil'); }
    DZ.State.save();
  }

  /* ---------------- morning report ---------------- */
  function drawReport(ctx) {
    DZ.UI.dim(ctx, 0.7);
    const S = DZ.State.S;
    const h = Math.min(190, 46 + report.length * 10);
    const px = 40, py = (DZ.H - h) / 2, pw = DZ.W - 80;
    DZ.UI.panel(ctx, px, py, pw, h, 'GOOD MORNING - DAY ' + S.day, {});
    report.forEach((r, i) => {
      const y = py + 17 + i * 10;
      if (y > py + h - 22) return;
      Px.rect(ctx, px + 6, y + 3, 2, 2, r.c);
      T.draw(ctx, r.t, px + 12, y, r.c, { size: 7 });
    });
    if (DZ.UI.button(ctx, px + pw / 2 - 30, py + h - 17, 60, 14, 'LET\'S GO', { tone: 'gold', size: 8, key: 'Enter' })) {
      overlay = null; DZ.Audio.play('click');
    }
  }

  return { enter, update, draw };
})();
