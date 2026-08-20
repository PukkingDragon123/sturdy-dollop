/* ============================================================
   market.js - sell your fish. Prices drift daily.
   ============================================================ */
DZ.Scenes.market = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let t = 0, lastSale = 0, saleT = 0;

  function enter() { t = 0; DZ.UI.resetScroll('mk'); }
  function update(dt) { t += dt; if (saleT > 0) saleT -= dt; DZ.Water.tick(dt); }

  function draw(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#123a52', '#04121f', 10);
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    // stall art
    Px.draw(ctx, 'stall', 6, 26, { scale: 2 });
    Px.draw(ctx, 'clam_shell', 12, 78, { scale: 2 });
    DZ.Game.topbar(ctx, { title: 'FISH MARKET' });

    const mult = DZ.Upgrades.value(S, 'stall') * S.marketMult;
    const shady = DZ.State.staffOf('shady');
    T.draw(ctx, 'TODAY: x' + S.marketMult.toFixed(2) + ' market  |  stall x' + DZ.Upgrades.value(S, 'stall').toFixed(2) +
      (shady ? '  |  shady +' + (15 + shady.lvl * 10) + '%' : ''), 6, 18, S.marketMult >= 1 ? PAL.gold : PAL.coral, { size: 7 });

    const x = 40, y = 30, w = DZ.W - 46, h = 152;
    Px.rect(ctx, x, y, w, h, '#04121d');
    Px.frame(ctx, x, y, w, h, '#123246');
    const rows = [];
    for (const k of Object.keys(S.inv.fish)) {
      const sp = DZ.Species.get(k); if (!sp) continue;
      const e = S.inv.fish[k];
      if (e.n - e.live > 0) rows.push({ sp, live: false, n: e.n - e.live });
      if (e.live > 0) rows.push({ sp, live: true, n: e.live });
    }
    rows.sort((a, b) => DZ.State.sellPrice(b.sp, b.live) * b.n - DZ.State.sellPrice(a.sp, a.live) * a.n);
    if (!rows.length) {
      T.draw(ctx, 'Your bucket is empty.', x + w / 2, y + h / 2 - 10, PAL.dim, { align: 'center', size: 9 });
      T.draw(ctx, 'Go DIVE, catch something, come back.', x + w / 2, y + h / 2 + 2, PAL.dim2, { align: 'center', size: 7 });
    }
    DZ.UI.scroll('mk', ctx, x + 1, y + 1, w - 2, h - 2, rows.length * 17 + 2, (ox, oy, ow) => {
      rows.forEach((r, i) => {
        const ry = oy + 2 + i * 17;
        if (ry > y + h || ry < y - 18) return;
        const unit = DZ.State.sellPrice(r.sp, r.live);
        Px.rect(ctx, ox + 1, ry, ow - 4, 15, i % 2 ? '#072335' : '#08283c');
        Px.draw(ctx, r.sp.sprite, ox + 4, ry + 4, { recolor: r.sp.pal });
        T.draw(ctx, r.sp.name + (r.live ? ' (LIVE x1.6)' : ''), ox + 24, ry + 1, r.live ? PAL.kelp : PAL.text, { size: 7 });
        T.draw(ctx, r.sp.blurb, ox + 24, ry + 8, PAL.dim2, { size: 7 });
        T.draw(ctx, 'x' + r.n, ox + 158, ry + 4, PAL.text, { size: 7 });
        T.draw(ctx, unit + 'c ea', ox + 182, ry + 4, PAL.gold, { size: 7 });
        if (r.sp.flags.cursed) T.draw(ctx, 'CURSED', ox + 218, ry + 4, PAL.evil, { size: 7 });
        if (DZ.UI.button(ctx, ox + ow - 82, ry + 1, 36, 13, 'SELL 1', { tone: 'gold', size: 7, id: 's1' + i })) sell(r, 1);
        if (DZ.UI.button(ctx, ox + ow - 44, ry + 1, 38, 13, 'ALL ' + r.n, { tone: 'blue', size: 7, id: 'sa' + i,
            sub: U.fmt(unit * r.n) })) sell(r, r.n);
      });
    });

    // totals
    const val = DZ.State.fishValue();
    Px.rect(ctx, 40, 184, DZ.W - 46, 38, '#062033');
    Px.frame(ctx, 40, 184, DZ.W - 46, 38, PAL.line);
    T.draw(ctx, 'BUCKET: ' + DZ.State.fishTotal() + ' fish', 46, 188, PAL.text, { size: 8, bold: true });
    T.draw(ctx, 'worth ' + U.fmt(val) + ' clams', 46, 198, PAL.gold, { size: 8 });
    if (saleT > 0) T.draw(ctx, '+' + U.fmt(lastSale) + 'c!', 46, 209, PAL.kelp, { size: 8, alpha: U.clamp(saleT, 0, 1) });
    if (DZ.UI.button(ctx, 200, 188, 82, 15, 'SELL EVERYTHING', { tone: 'gold', size: 7, disabled: !val,
        tip: 'Sell every fish in the bucket.' })) {
      const r = DZ.State.sellAll();
      finish(r.clams, r.count);
    }
    if (DZ.UI.button(ctx, 200, 205, 82, 14, 'SELL NON-CURSED', { tone: 'blue', size: 7, disabled: !val,
        tip: 'Keep cursed fish for the Vat.' })) {
      const r = DZ.State.sellAll((sp) => !sp.flags.cursed);
      finish(r.clams, r.count);
    }
    if (DZ.UI.button(ctx, 288, 188, 96, 15, 'GO DIVE', { tone: 'green', size: 8 })) DZ.Game.go('reef');
    if (DZ.UI.button(ctx, 288, 205, 96, 14, 'FEED SOMEBODY', { tone: 'dark', size: 7 })) DZ.Game.go('ranch', { overlay: 'feed' });
  }

  function sell(r, n) {
    const gain = DZ.State.sellFish(r.sp.id, r.live, n);
    finish(gain, n);
  }
  function finish(gain, count) {
    if (!gain) { DZ.Audio.play('deny'); return; }
    lastSale = gain; saleT = 1.6;
    DZ.Audio.play('cash');
    DZ.FX.text(DZ.W / 2, 100, '+' + U.fmt(gain) + ' CLAMS', PAL.gold, { size: 12, screen: true, life: 1.3 });
    DZ.FX.burst(DZ.W / 2, 110, 22, { col: [PAL.gold, '#ffffff', '#c98f1c'], speed: 120, g: 120 });
    DZ.State.toast('Sold ' + count + ' fish for ' + U.fmt(gain) + 'c', PAL.gold);
    DZ.State.save();
  }

  return { enter, update, draw };
})();
