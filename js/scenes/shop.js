/* ============================================================
   shop.js - Gear Shed: gear tiers, ranch buildings, supplies.
   ============================================================ */
DZ.Scenes.shop = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  const TABS = ['GEAR', 'RANCH', 'SUPPLIES'];
  let tab = 0, t = 0;

  function enter(args) { t = 0; if (args && args.tab !== undefined) tab = args.tab; }
  function update(dt) { t += dt; DZ.Water.tick(dt); }

  function draw(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#0b3552', '#04121f', 10);
    DZ.Water.shafts(ctx, 4, 0.05);
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    DZ.Game.topbar(ctx, { title: 'GEAR SHED' });
    TABS.forEach((tb, i) => {
      if (DZ.UI.button(ctx, 4 + i * 68, 17, 66, 13, tb, { tone: tab === i ? 'gold' : 'dark', size: 8, bold: tab === i }))
        { tab = i; DZ.UI.resetScroll('shopranch'); DZ.UI.resetScroll('shopsup'); }
    });
    T.draw(ctx, 'Doug\'s Gear Shed - "no refunds, no questions"', DZ.W - 6, 20, PAL.dim2, { size: 7, align: 'right' });
    if (tab === 0) gear(ctx, S);
    else if (tab === 1) ranch(ctx, S);
    else supplies(ctx, S);
  }

  /* ---------------- gear ---------------- */
  function gear(ctx, S) {
    const kinds = ['spear', 'net', 'fins', 'tank', 'bag'];
    kinds.forEach((k, i) => {
      const G = DZ.Items.GEAR[k];
      const lvl = S.gear[k];
      const cur = DZ.Items.gearTier(k, lvl);
      const nxt = DZ.Items.gearNext(k, lvl);
      const y = 34 + i * 37, x = 4, w = DZ.W - 8, h = 35;
      Px.rect(ctx, x, y, w, h, i % 2 ? '#072335' : '#08283c');
      Px.frame(ctx, x, y, w, h, '#123246');
      Px.draw(ctx, G.icon, x + 5, y + 4, { scale: 2 });
      T.draw(ctx, G.name.toUpperCase(), x + 30, y + 3, PAL.cyan, { size: 8, bold: true });
      T.draw(ctx, G.blurb, x + 30, y + 12, PAL.dim, { size: 7 });
      // tier pips
      for (let p = 0; p < G.tiers.length; p++) {
        Px.rect(ctx, x + 30 + p * 7, y + 22, 5, 5, p <= lvl ? PAL.gold : '#153a52');
      }
      T.draw(ctx, cur.name, x + 30 + G.tiers.length * 7 + 6, y + 21, PAL.text, { size: 7 });
      T.draw(ctx, statLine(k, cur), x + 178, y + 3, PAL.kelp, { size: 7 });
      if (nxt) {
        T.draw(ctx, '-> ' + nxt.name, x + 178, y + 12, PAL.gold, { size: 7 });
        T.draw(ctx, statLine(k, nxt), x + 178, y + 21, PAL.cyan, { size: 7 });
        const can = S.clams >= nxt.cost;
        if (DZ.UI.button(ctx, x + w - 74, y + 6, 68, 22, U.fmt(nxt.cost) + ' CLAMS',
            { tone: can ? 'gold' : 'dark', size: 8, disabled: !can, sub: 'UPGRADE', tip: nxt.blurb })) {
          if (DZ.State.spend(nxt.cost)) {
            S.gear[k]++;
            if (k === 'tank') S.unlockedZone = Math.min(3, S.gear.tank);
            DZ.Audio.play('cash');
            DZ.FX.burst(x + w - 40, y + 17, 16, { col: [PAL.gold, '#ffffff'], speed: 90, screen: true });
            DZ.State.toast('Bought ' + nxt.name + '!', PAL.gold);
            DZ.State.event('gear', {});
            DZ.State.save();
          }
        }
      } else {
        T.draw(ctx, 'MAXED OUT', x + w - 40, y + 14, PAL.gold, { size: 8, align: 'center', bold: true });
      }
    });
  }
  function statLine(k, tier) {
    if (k === 'spear') return 'dmg ' + tier.dmg + '  spd ' + tier.speed + '  cd ' + tier.reload.toFixed(2) + 's' + (tier.pierce ? '  PIERCE' : '');
    if (k === 'net') return 'r' + tier.radius + '  live ' + Math.round(tier.live * 100) + '%  cd ' + tier.reload.toFixed(2) + 's' + (tier.pull ? '  PULL' : '');
    if (k === 'fins') return 'thrust x' + tier.thrust.toFixed(2) + '  dash x' + tier.dash.toFixed(2);
    if (k === 'tank') return tier.air + 's air';
    if (k === 'bag') return tier.cap + ' fish';
    return '';
  }

  /* ---------------- ranch ---------------- */
  function ranch(ctx, S) {
    const x = 4, y = 34, w = DZ.W - 8, h = DZ.H - 40;
    Px.rect(ctx, x, y, w, h, '#04121d');
    Px.frame(ctx, x, y, w, h, '#123246');
    const list = DZ.Upgrades.RANCH;
    DZ.UI.scroll('shopranch', ctx, x + 1, y + 1, w - 2, h - 2, list.length * 30 + 4, (ox, oy, ow) => {
      list.forEach((u, i) => {
        const ry = oy + 2 + i * 30;
        if (ry > y + h || ry < y - 30) return;
        const lvl = DZ.Upgrades.level(S, u.id);
        const nxt = DZ.Upgrades.next(S, u.id);
        Px.rect(ctx, ox + 1, ry, ow - 4, 28, i % 2 ? '#072335' : '#08283c');
        Px.draw(ctx, u.icon, ox + 4, ry + 4, {});
        T.draw(ctx, u.name.toUpperCase(), ox + 26, ry + 2, PAL.cyan, { size: 7, bold: true });
        T.draw(ctx, u.blurb, ox + 26, ry + 10, PAL.dim, { size: 7 });
        T.draw(ctx, 'now: ' + u.levels[lvl].txt, ox + 26, ry + 18, PAL.text, { size: 7 });
        for (let p = 0; p < u.levels.length; p++)
          Px.rect(ctx, ox + 150 + p * 6, ry + 19, 4, 4, p <= lvl ? PAL.gold : '#153a52');
        if (nxt) {
          T.draw(ctx, 'next: ' + nxt.txt, ox + 150, ry + 2, PAL.gold, { size: 7 });
          const can = S.clams >= nxt.cost;
          if (DZ.UI.button(ctx, ox + ow - 66, ry + 8, 60, 16, U.fmt(nxt.cost) + 'c',
              { tone: can ? 'green' : 'dark', size: 8, disabled: !can, id: 'ru' + i, tip: 'Build: ' + nxt.txt })) {
            if (DZ.State.spend(nxt.cost)) {
              S.ranch[u.id] = lvl + 1;
              DZ.Audio.play('cash');
              DZ.State.toast(u.name + ' -> ' + nxt.txt, PAL.kelp);
              DZ.FX.burst(ox + ow - 36, ry + 16, 14, { col: [PAL.kelp, '#ffffff'], speed: 80, screen: true });
              DZ.State.save();
            }
          }
        } else T.draw(ctx, 'MAXED', ox + ow - 36, ry + 12, PAL.gold, { size: 8, align: 'center', bold: true });
      });
    });
  }

  /* ---------------- supplies ---------------- */
  function supplies(ctx, S) {
    const x = 4, y = 34, w = DZ.W - 8, h = DZ.H - 40;
    Px.rect(ctx, x, y, w, h, '#04121d');
    Px.frame(ctx, x, y, w, h, '#123246');
    const rows = DZ.Items.FOOD.map((f) => ({ kind: 'food', it: f }))
      .concat(DZ.Items.USE.map((u) => ({ kind: 'use', it: u })));
    DZ.UI.scroll('shopsup', ctx, x + 1, y + 1, w - 2, h - 2, rows.length * 26 + 4, (ox, oy, ow) => {
      rows.forEach((r, i) => {
        const it = r.it, ry = oy + 2 + i * 26;
        if (ry > y + h || ry < y - 26) return;
        Px.rect(ctx, ox + 1, ry, ow - 4, 24, i % 2 ? '#072335' : '#08283c');
        Px.draw(ctx, it.sprite, ox + 5, ry + 6, {});
        T.draw(ctx, it.name, ox + 22, ry + 2, it.col, { size: 8, bold: true });
        T.draw(ctx, it.blurb, ox + 22, ry + 11, PAL.dim, { size: 7 });
        if (r.kind === 'food') {
          T.draw(ctx, '+' + DZ.Dolphin.foodExpValue(it) + ' EXP', ox + 200, ry + 2, PAL.cyan, { size: 7 });
          T.draw(ctx, 'trait ' + Math.round(it.traitChance * 100) + '%', ox + 200, ry + 11, PAL.pink, { size: 7 });
          T.draw(ctx, 'have ' + (S.inv.food[it.id] || 0), ox + 254, ry + 2, PAL.text, { size: 7 });
          if (it.corrupt) T.draw(ctx, '+' + it.corrupt + '% EVIL', ox + 254, ry + 11, PAL.evil, { size: 7 });
        } else {
          T.draw(ctx, 'have ' + (S.inv.use[it.id] || 0), ox + 254, ry + 6, PAL.text, { size: 7 });
        }
        const can1 = S.clams >= it.cost, can5 = S.clams >= it.cost * 5;
        if (DZ.UI.button(ctx, ox + ow - 84, ry + 4, 38, 16, U.fmt(it.cost) + 'c',
            { tone: can1 ? 'gold' : 'dark', size: 7, disabled: !can1, id: 'b1' + i })) buy(r, 1);
        if (DZ.UI.button(ctx, ox + ow - 44, ry + 4, 38, 16, 'x5', { tone: can5 ? 'blue' : 'dark', size: 7,
            disabled: !can5, id: 'b5' + i, sub: U.fmt(it.cost * 5) })) buy(r, 5);
      });
    });
  }
  function buy(r, n) {
    const S = DZ.State.S;
    if (!DZ.State.spend(r.it.cost * n)) return;
    if (r.kind === 'food') DZ.State.addFood(r.it.id, n);
    else DZ.State.addUse(r.it.id, n);
    DZ.Audio.play('coin');
    DZ.State.toast('+' + n + ' ' + r.it.name, r.it.col);
    DZ.State.save();
  }

  return { enter, update, draw };
})();
