/* ============================================================
   racelobby.js - pick a tier, pick your runner, place bets.
   Odds come from stats + charm, so an unloved evil dolphin is a
   money printer.
   ============================================================ */
DZ.Scenes.racelobby = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let t = 0, tier = 0, entrantId = null, field = [], odds = [], betOn = -1, stake = 0;

  function enter(args) {
    t = 0;
    if (args && args.tier !== undefined) tier = args.tier;
    const ros = DZ.State.roster();
    const best = ros.slice().sort((x, y) => DZ.Dolphin.power(y) - DZ.Dolphin.power(x))[0];
    entrantId = (DZ.State.selected() || best).id;
    build();
    betOn = -1; stake = 0;
  }
  function update(dt) { t += dt; DZ.Water.tick(dt); }

  function entrant() { return DZ.State.roster().find((d) => d.id === entrantId); }

  function build() {
    const S = DZ.State.S;
    const me = entrant();
    const rivals = DZ.Races.fieldFor(S, tier, me);
    const mine = {
      id: me.id, name: me.name, lvl: DZ.Dolphin.level(me), evil: me.evil,
      stats: DZ.Dolphin.stats(me, S), col: me.pal['1'], mine: true, dolphin: me,
      trait: me.traits[0], quip: U.pick(DZ.Names.quipsRace)
    };
    field = [mine].concat(rivals);
    field = field.map((r, i) => Object.assign(r, { lane: i }));
    odds = DZ.Races.odds(field);
  }

  function draw(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#0d2f4a', '#04121f', 10);
    DZ.Water.shafts(ctx, 4, 0.05);
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    DZ.Game.topbar(ctx, { title: 'RACE GATE' });
    const T0 = DZ.Races.TIERS[tier];
    const me = entrant();
    const myLvl = me ? DZ.Dolphin.level(me) : 1;

    // ---- tier picker ----
    DZ.Races.TIERS.forEach((tr, i) => {
      const locked = myLvl < tr.minLvl;
      const w = 76, x = 4 + i * 78, y = 17;
      if (DZ.UI.button(ctx, x, y, w, 15, tr.name.split(' ')[0].toUpperCase(),
        { tone: tier === i ? 'gold' : (locked ? 'dark' : 'blue'), size: 7, disabled: locked,
          sub: locked ? 'Lv' + tr.minLvl : U.fmt(tr.purse[0]), id: 'tr' + i,
          tip: tr.blurb + ' Entry ' + tr.entry + 'c. Needs level ' + tr.minLvl + '.' })) {
        tier = i; build(); betOn = -1; stake = 0;
      }
    });

    // ---- field table ----
    const x = 4, y = 36, w = 250, h = 150;
    Px.rect(ctx, x, y, w, h, '#04121d');
    Px.frame(ctx, x, y, w, h, '#123246');
    T.draw(ctx, T0.name.toUpperCase() + '  -  ' + T0.len + 'm  -  entry ' + U.fmt(T0.entry) + 'c',
      x + 4, y + 3, PAL.gold, { size: 7, bold: true });
    T.draw(ctx, 'purse ' + T0.purse.slice(0, 3).map((p) => U.fmt(p)).join('/') + ' (4th ' + U.fmt(T0.purse[3]) + ')', x + w - 4, y + 3, PAL.kelp, { size: 7, align: 'right' });
    field.forEach((r, i) => {
      const ry = y + 14 + i * 22;
      const isBet = betOn === i;
      Px.rect(ctx, x + 2, ry, w - 4, 20, r.mine ? '#0d3d58' : (i % 2 ? '#072335' : '#08283c'));
      if (isBet) Px.frame(ctx, x + 2, ry, w - 4, 20, PAL.gold);
      Px.rect(ctx, x + 3, ry + 1, 3, 18, r.col);
      T.draw(ctx, String(i + 1), x + 9, ry + 6, PAL.dim, { size: 7 });
      const drawObj = r.mine ? r.dolphin : (r._obj = r._obj || { id: 'lb' + i,
        pal: { '1': r.col, '2': Px.shade(r.col, -0.35), '3': Px.shade(r.col, 0.5) },
        evil: r.evil, traits: [], skills: {}, base: r.stats });
      DZ.Dolphin.draw(ctx, drawObj, x + 32, ry + 10, { center: true, scale: 0.95, speed: 0.3, tag: 'lob' + i });
      T.draw(ctx, r.name + (r.mine ? ' (YOU)' : ''), x + 46, ry + 2, r.mine ? PAL.cyan : PAL.text, { size: 7, bold: true });
      T.draw(ctx, 'Lv' + r.lvl + (r.evil ? '  EVIL' : '') + (r.trait ? '  ' + (DZ.Names.TRAITS[r.trait] || {}).name : ''),
        x + 46, ry + 11, r.evil ? PAL.evil : PAL.dim, { size: 7 });
      const pw = DZ.Races.power(r);
      DZ.UI.bar(ctx, x + 150, ry + 3, 46, 6, U.clamp(pw / 90, 0.05, 1), { col: PAL.cyan, bg: '#05202f' });
      T.draw(ctx, 'SPD ' + r.stats.speed + ' STA ' + r.stats.stamina, x + 150, ry + 11, PAL.dim2, { size: 7 });
      T.draw(ctx, 'x' + odds[i].toFixed(2), x + w - 6, ry + 6, odds[i] > 6 ? PAL.gold : PAL.text, { size: 8, align: 'right', bold: true });
      if (DZ.UI.hover(x + 2, ry, w - 4, 20)) {
        DZ.UI.tooltip(r.mine ? 'Your runner. Click to bet on yourself.' :
          '"' + r.quip + '" - click to bet on this rival.');
        if (DZ.Input.mouse.click && !DZ.UI.blocked()) {
          DZ.Input.mouse.click = false;
          betOn = betOn === i ? -1 : i;
          if (betOn >= 0 && stake === 0) stake = Math.min(S.clams, Math.max(10, Math.round(T0.entry / 2)));
          DZ.Audio.play('blip');
        }
      }
    });

    // ---- your runner ----
    const rx = 258, rw = DZ.W - 262;
    Px.rect(ctx, rx, y, rw, 74, '#062033');
    Px.frame(ctx, rx, y, rw, 74, PAL.line);
    T.draw(ctx, 'YOUR RUNNER', rx + 4, y + 3, PAL.cyan, { size: 7, bold: true });
    if (me) {
      DZ.Dolphin.draw(ctx, me, rx + 26, y + 28, { center: true, scale: 1, frame: Math.floor(t * 5) % 2 });
      T.draw(ctx, me.name, rx + 46, y + 14, me.evil ? PAL.evil : PAL.text, { size: 8, bold: true });
      T.draw(ctx, 'Lv' + myLvl + '  ' + me.wins + 'W/' + me.races + 'R', rx + 46, y + 24, PAL.gold, { size: 7 });
      const abs = DZ.Dolphin.abilities(me);
      T.draw(ctx, abs.length ? abs.map((a, i) => (i + 1) + ':' + DZ.Skills.ABILITIES[a].name).join('  ') : 'no abilities (learn some!)',
        rx + 4, y + 40, abs.length ? PAL.cyan : PAL.dim2, { size: 7 });
      T.draw(ctx, 'mood ' + Math.round(me.mood * 100) + '%' + (me.mood < 0.4 ? ' (feed them!)' : ''),
        rx + 4, y + 50, me.mood < 0.4 ? PAL.coral : PAL.kelp, { size: 7 });
      if (DZ.UI.button(ctx, rx + 4, y + 59, 60, 12, '< SWAP', { tone: 'dark', size: 7, key: 'KeyQ' })) cycle(-1);
      if (DZ.UI.button(ctx, rx + 68, y + 59, 60, 12, 'SWAP >', { tone: 'dark', size: 7, key: 'KeyE' })) cycle(1);
    }

    // ---- betting ----
    const by = y + 78;
    Px.rect(ctx, rx, by, rw, 72, '#062033');
    Px.frame(ctx, rx, by, rw, 72, PAL.gold);
    T.draw(ctx, 'BOOKMAKER', rx + 4, by + 3, PAL.gold, { size: 7, bold: true });
    if (betOn < 0) {
      T.draw(ctx, 'Click a racer to bet on them.', rx + 4, by + 15, PAL.dim, { size: 7 });
      T.draw(ctx, 'Long odds = unloved dolphin.', rx + 4, by + 25, PAL.dim2, { size: 7 });
      T.draw(ctx, 'Betting is optional - racing pays', rx + 4, by + 39, PAL.dim2, { size: 7 });
      T.draw(ctx, 'the purse either way.', rx + 4, by + 48, PAL.dim2, { size: 7 });
    } else {
      const r = field[betOn];
      T.draw(ctx, 'ON: ' + r.name, rx + 4, by + 14, r.mine ? PAL.cyan : PAL.text, { size: 8, bold: true });
      T.draw(ctx, 'odds x' + odds[betOn].toFixed(2), rx + 4, by + 24, PAL.gold, { size: 7 });
      const steps = [10, 50, 200, 1000];
      steps.forEach((s, i) => {
        if (DZ.UI.button(ctx, rx + 4 + i * 32, by + 34, 30, 12, '+' + U.fmt(s), { tone: 'dark', size: 7, id: 'bs' + i,
            disabled: stake + s > S.clams })) { stake += s; DZ.Audio.play('coin'); }
      });
      if (DZ.UI.button(ctx, rx + 4, by + 48, 40, 12, 'CLEAR', { tone: 'red', size: 7 })) stake = 0;
      if (DZ.UI.button(ctx, rx + 46, by + 48, 40, 12, 'MAX', { tone: 'gold', size: 7 })) stake = S.clams;
      T.draw(ctx, 'STAKE ' + U.fmt(stake), rx + 92, by + 40, PAL.text, { size: 8, bold: true });
      T.draw(ctx, 'wins ' + U.fmt(Math.round(stake * odds[betOn])), rx + 92, by + 50, PAL.kelp, { size: 8 });
    }

    // ---- go ----
    const canAfford = S.clams >= T0.entry + stake;
    const why = !me ? 'no dolphin' : myLvl < T0.minLvl ? 'level too low' : !canAfford ? 'not enough clams' : null;
    if (DZ.UI.button(ctx, 4, 190, 250, 30, why ? 'CANNOT RACE: ' + why : 'START THE RACE!',
        { tone: why ? 'dark' : 'red', size: 12, bold: true, disabled: !!why, key: 'Enter' })) {
      DZ.State.spend(T0.entry);
      if (stake > 0 && betOn >= 0) DZ.State.spend(stake);
      DZ.Game.go('race', { tier, field, odds, betOn, stake, entrantId });
    }
    T.draw(ctx, 'entry ' + U.fmt(T0.entry) + 'c' + (stake ? ' + ' + U.fmt(stake) + 'c bet' : '') +
      '   |   you have ' + U.fmt(S.clams) + 'c', rx + 4, 194, PAL.dim, { size: 7 });
    T.draw(ctx, 'hold SPACE = surge', rx + 4, 205, PAL.cyan, { size: 7 });
    T.draw(ctx, '1/2/3 = abilities', rx + 4, 214, PAL.cyan, { size: 7 });
    if (S.inv.use && (S.inv.use.clover || S.inv.use.whistle)) {
      T.draw(ctx, 'auto-use: ' + (S.inv.use.clover ? 'Clam ' : '') + (S.inv.use.whistle ? 'Whistle' : ''),
        rx + 76, 214, PAL.pink, { size: 7 });
    }
  }

  function cycle(dir) {
    const ros = DZ.State.roster();
    const i = ros.findIndex((d) => d.id === entrantId);
    entrantId = ros[(i + dir + ros.length) % ros.length].id;
    DZ.State.select(entrantId);
    build(); betOn = -1; stake = 0;
    DZ.Audio.play('squeak');
  }

  return { enter, update, draw };
})();
