/* ============================================================
   shop.js - one screen for every counter in the game.
   ============================================================ */
KA.Scenes.shop = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL, S = KA.S;
  let kind = 'bait', tab = 0, def = null;

  function enter(args) {
    kind = (args && args.shop) || 'bait';
    if (!KA.NPCs.SHOPS[kind]) kind = 'bait';       // never brick on a bad counter
    def = KA.NPCs.SHOPS[kind];
    tab = 0;
    KA.UI.resetScroll('shop');
  }
  function update(dt) {
    if (KA.In.isPressed('Escape')) KA.Game.go('world', {});
  }

  function draw(ctx) {
    D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H, [[0, '#0f3247'], [1, '#04121d']], 'shopbg'));
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 5; i++) D.circle(ctx, (i * 197 + 60) % KA.W, 50 + i * 60, 70, '#154a66');
    ctx.globalAlpha = 1;
    // keeper portrait
    const kd = KA.NPCs.DEF[def.keeper];
    D.rr(ctx, 8, 40, 104, KA.H - 90, 12, 'rgba(4,18,29,.6)');
    ctx.save();
    ctx.beginPath(); D.rr(ctx, 8, 40, 104, KA.H - 90, 12, null); ctx.clip();
    KA.Rig.folk.draw(ctx, 60, KA.H - 60, { scale: kd.kind === 'keg' ? 1.5 : 2.1, kind: kd.kind, tag: 'shop' + def.keeper });
    ctx.restore();
    T.draw(ctx, kd.name, 60, KA.H - 46, kd.col, { size: 12, align: 'center', weight: 800 });
    T.draw(ctx, def.title, 124, 12, P.gold, { size: 20, weight: 900, shadow: true });
    T.draw(ctx, U.fmt(S.D.clams) + ' clams', KA.W - 12, 14, P.gold, { size: 16, align: 'right', weight: 800 });

    const x = 124, w = KA.W - 136;
    if (def.tabs.length > 1) KA.UI.tabs(ctx, x, 40, w, 30, def.tabs, tab, (i) => { tab = i; KA.UI.resetScroll('shop'); });
    const listY = def.tabs.length > 1 ? 78 : 44;
    const listH = KA.H - listY - 52;
    D.rr(ctx, x, listY, w, listH, 10, 'rgba(3,16,26,.55)');

    const rows = buildRows();
    KA.UI.scroll('shop', ctx, x + 4, listY + 4, w - 8, listH - 8, rows.length * 56 + 6, (ox, oy, ow) => {
      rows.forEach((r, i) => {
        const ry = oy + 4 + i * 56;
        if (ry > listY + listH || ry < listY - 60) return;
        row(ctx, ox, ry, ow, r, i);
      });
      if (!rows.length) T.draw(ctx, 'Nothing here right now.', ox + ow / 2, oy + 40, P.dim, { size: 15, align: 'center' });
    });
    if (KA.UI.button(ctx, KA.W - 118, KA.H - 44, 106, 34, 'LEAVE', { tone: 'dark', size: 16, key: 'Escape' }))
      KA.Game.go('world', {});
  }

  function buildRows() {
    const D0 = S.D;
    if (kind === 'bait') {
      if (tab === 0) return KA.Items.TACKLE.map((it, i) => ({
        t: 'tackle', it, owned: KA.Items.TACKLE.indexOf(KA.Items.tById[D0.tackle]) >= i,
        title: it.name, sub: it.blurb + '   power x' + it.power.toFixed(2) + '  patience x' + it.window.toFixed(2),
        cost: it.cost, col: P.kelp
      }));
      const out = [];
      for (const id in D0.inv.fish) {
        const f = KA.Items.fishById[id];
        if (!f) continue;
        out.push({ t: 'sell', id, title: f.name + ' x' + D0.inv.fish[id], sub: f.value + ' clams each',
          cost: 0, sell: f.value * D0.inv.fish[id], col: f.col, n: D0.inv.fish[id] });
      }
      if (out.length) out.push({ t: 'sellall', title: 'SELL EVERYTHING', sub: S.fishValue() + ' clams for ' + S.fishCount() + ' fish', col: P.gold });
      return out;
    }
    if (kind === 'beer') {
      return KA.Items.BEERS.map((b) => ({
        t: 'beer', it: b, title: b.name, sub: b.blurb + '   +' + b.fat + ' fat', cost: b.cost, col: b.col,
        have: D0.inv.beer[b.id] || 0
      }));
    }
    if (kind === 'stable') {
      if (tab === 0) return KA.Pets.SPECIES.map((sp) => ({
        t: 'pet', it: sp, title: sp.name, sub: sp.blurb, cost: sp.cost, col: sp.col.a,
        owned: !!D0.owned[sp.id], locked: lockReason(sp)
      }));
      return KA.Items.FOOD.map((f) => ({ t: 'food', it: f, title: f.name, sub: f.blurb + '   +' + f.exp + ' EXP',
        cost: f.cost, col: f.col, have: D0.inv.food[f.id] || 0 }));
    }
    if (kind === 'weapons') {
      if (tab === 0) return KA.Items.WEAPONS.map((w, i) => ({
        t: 'weapon', it: w, title: w.name, sub: w.blurb + '   dmg ' + w.dmg + '  speed x' + w.spd.toFixed(2) + '  reach ' + w.reach,
        cost: w.cost, col: w.col, owned: KA.Items.WEAPONS.indexOf(KA.Items.wById[D0.weapon]) >= i
      }));
      const cost = 500 + D0.hpUps * 900;
      return [{ t: 'hp', title: 'ANOTHER HEART', sub: 'Grunda welds a plate to your chest. Max HP +1.',
        cost, col: P.coral }];
    }
    if (kind === 'race') {
      return KA.Races.TIERS.map((tr) => ({ t: 'race', it: tr, title: tr.name,
        sub: tr.blurb + '   entry ' + tr.entry + 'c   purse ' + tr.purse[0] + 'c', cost: 0, col: tr.col,
        locked: KA.Pet.level(S.active()) < tr.minLvl ? 'needs a level ' + tr.minLvl + ' mount' : null }));
    }
    return [];
  }
  function lockReason(sp) {
    const D0 = S.D;
    if (D0.owned[sp.id]) return null;
    if (sp.id === 'tuna' && D0.stats.wins < 1) return 'win a race first';
    if (sp.id === 'swordfish' && !S.pets().some((p) => KA.Pet.level(p) >= 12)) return 'needs a level 12 mount';
    return null;
  }

  function row(ctx, x, y, w, r, i) {
    const D0 = S.D;
    D.rr(ctx, x, y, w - 6, 50, 8, i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.07)');
    D.rr(ctx, x + 4, y + 4, 6, 42, 3, r.col || P.line);
    T.draw(ctx, r.title, x + 18, y + 6, P.text, { size: 15, weight: 800 });
    T.block(ctx, r.sub || '', x + 18, y + 23, P.dim, { size: 11, max: w - 152, lh: 12, weight: 600, maxLines: 2 });
    const bx = x + w - 122, bw = 108;
    if (r.t === 'sell') {
      if (KA.UI.button(ctx, bx, y + 9, bw, 32, 'SELL ' + U.fmt(r.sell), { tone: 'gold', size: 14, id: 'sl' + i })) {
        S.earn(KA.Items.fishById[r.id].value * r.n, true);
        delete D0.inv.fish[r.id];
        KA.A.play('cash'); S.save();
      }
    } else if (r.t === 'sellall') {
      if (KA.UI.button(ctx, bx, y + 9, bw, 32, 'SELL ALL', { tone: 'gold', size: 14, id: 'sa' })) {
        const res = S.sellAllFish();
        KA.UI.toast('Sold ' + res.n + ' fish for ' + U.fmt(res.clams), P.gold);
        S.save();
      }
    } else if (r.owned) {
      T.draw(ctx, r.t === 'pet' ? 'OWNED' : 'HAVE IT', bx + bw / 2, y + 18, P.kelp, { size: 14, align: 'center', weight: 800 });
      if (r.t === 'pet') {
        const mine = S.pets().find((p) => p.sp === r.it.id);
        if (mine && S.active().uid !== mine.uid &&
            KA.UI.button(ctx, bx, y + 28, bw, 20, 'RIDE THIS ONE', { tone: 'blue', size: 12, id: 'sw' + i })) {
          S.setActive(mine.uid); KA.UI.toast('Now riding ' + mine.name, P.cyan); S.save();
        }
      }
    } else if (r.locked) {
      T.draw(ctx, r.locked, bx + bw / 2, y + 18, P.coral, { size: 11, align: 'center', weight: 700 });
    } else if (r.t === 'race') {
      if (KA.UI.button(ctx, bx, y + 9, bw, 32, 'ENTER', { tone: 'gold', size: 14, id: 'rc' + i }))
        KA.Game.go('race', { tier: r.it.id });
    } else {
      const can = D0.clams >= r.cost;
      const label = r.cost ? U.fmt(r.cost) + 'c' : 'TAKE';
      if (KA.UI.button(ctx, bx, y + 9, bw, 32, label, { tone: can ? 'gold' : 'dark', size: 14, disabled: !can,
          id: 'by' + i, sub: r.have ? 'have ' + r.have : '' })) buy(r);
    }
  }

  function buy(r) {
    const D0 = S.D;
    if (!S.spend(r.cost)) return;
    KA.A.play('cash');
    if (r.t === 'tackle') { D0.tackle = r.it.id; KA.UI.toast('Equipped ' + r.it.name, P.kelp); }
    else if (r.t === 'weapon') { D0.weapon = r.it.id; KA.UI.toast('Equipped ' + r.it.name, P.gold); }
    else if (r.t === 'beer') { S.addItem('beer', r.it.id, 1); KA.UI.toast('Bought ' + r.it.name, r.it.col); }
    else if (r.t === 'food') { S.addItem('food', r.it.id, 1); KA.UI.toast('Bought ' + r.it.name, r.it.col); }
    else if (r.t === 'hp') { D0.hpUps++; D0.hp = S.hpMax(); KA.UI.toast('Max HP up!', P.coral); KA.A.play('levelup'); }
    else if (r.t === 'pet') {
      const p = KA.Pet.create(r.it.id);
      S.addPet(p); S.setActive(p.uid);
      KA.UI.toast('Meet ' + p.name + ' the ' + r.it.name + '!', r.it.col.a);
      KA.A.play('jackpot');
      KA.FX.flash(r.it.col.a, 0.25);
    }
    S.save();
  }
  return { enter, update, draw };
})();
