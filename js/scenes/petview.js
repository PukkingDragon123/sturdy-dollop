/* ============================================================
   petview.js - your mount, and THE ROLLING MACHINE. No skill
   tree: you gamble a token on a category and take what comes.
   ============================================================ */
KA.Scenes.petview = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL, S = KA.S;
  let cat = 'spd', dbl = false, spin = 0, result = null, hist = [], shake = 0, nameT = 0, tab = 0;

  function enter() { spin = 0; result = null; shake = 0; }
  function update(dt) {
    if (spin > 0) {
      spin -= dt;
      if (spin <= 0 && result) land();
    }
    if (nameT > 0) nameT -= dt;
    if (KA.In.isPressed('Escape')) KA.Game.go('world', {});
  }

  function doRoll() {
    const p = S.active();
    const cost = dbl ? 2 : 1;
    if ((p.tokens || 0) < cost) { KA.UI.toast('Not enough roll tokens', P.coral); KA.A.play('deny'); return; }
    p.tokens -= cost;
    const st = KA.Pet.stats(p);
    result = KA.Rolls.roll(st.lck, dbl);
    result.cat = cat;
    spin = 1.15;
    KA.A.play('roll');
  }
  function land() {
    const p = S.active();
    const r = result;
    if (r.amount > 0) {
      const trait = KA.Pet.applyRoll(p, r.cat, r.amount, r.tier.trait);
      if (trait) KA.UI.toast(p.name + ' gained: ' + KA.Pets.TRAITS[trait].name, KA.Pets.TRAITS[trait].col);
    }
    hist.unshift({ cat: r.cat, tier: r.tier, amount: r.amount, bust: r.bust });
    if (hist.length > 6) hist.pop();
    shake = r.tier.amount >= 7 ? 12 : 5;
    KA.FX.shake(shake);
    if (r.bust) { KA.A.play('error'); KA.UI.toast('BUST. The double down ate it.', P.coral); }
    else if (r.tier.amount >= 7) { KA.A.play('jackpot'); KA.FX.flash(r.tier.col, 0.3);
      for (let i = 0; i < 30; i++) KA.FX.part(U.rnd(0, KA.W), U.rnd(0, 80), { k: 'chunk', screen: true,
        vy: U.rnd(40, 130), vx: U.rnd(-60, 60), col: U.pick([r.tier.col, '#fff', P.gold]), life: U.rnd(1, 2.4), r: 3 }); }
    else if (r.amount === 0) KA.A.play('deny');
    else KA.A.play('levelup');
    S.save();
  }

  /* ---- the mount, laid out for whatever panel it is given ---- */
  function mountPanel(ctx, x, y, w, h, p, sp, st, pr) {
    KA.UI.panel(ctx, x, y, w, h, null);
    const twoCol = w > 340;                 // a wide panel puts the pool beside the numbers
    let px, py, pw, ph, tx0, tw;
    if (twoCol) {
      px = x + 10; py = y + 10; pw = w * 0.42; ph = h - 62;
      tx0 = px + pw + 12; tw = w - pw - 32;
    } else {
      px = x + 10; py = y + 10; pw = w - 20; ph = Math.min(116, h * 0.33);
      tx0 = x + 10; tw = w - 20;
    }
    D.rr(ctx, px, py, pw, ph, 12,
      D.vgrad(ctx, 0, py, 0, py + ph, [[0, '#3fb0e0'], [1, '#155a80']], 'pvpool' + Math.round(py) + '_' + Math.round(ph)));
    for (let i = 0; i < 4 && px + 24 + i * 46 < px + pw - 14; i++) {
      D.ellipse(ctx, px + 24 + i * 46, py + 8, 14, 4, 0, 'rgba(255,255,255,.25)');
    }
    KA.Rig.pet.draw(ctx, p, px + pw / 2, py + ph * (twoCol ? 0.5 : 0.62),
      { scale: Math.min(1.7, 1.9 / sp.size), speed: 0.5, tag: 'pv' });

    let cy = twoCol ? y + 14 : py + ph + 12;
    T.draw(ctx, p.name, tx0, cy, P.text, { size: 20, weight: 900 });
    cy += 24;
    T.draw(ctx, sp.name + '  -  Lv ' + pr.lvl, tx0, cy, P.gold, { size: 13, weight: 800 });
    cy += 19;
    KA.UI.bar(ctx, tx0, cy, tw, 12, pr.frac, { col: P.cyan, label: Math.floor(pr.cur) + ' / ' + pr.need + ' EXP', ls: 10 });
    cy += 20;
    const by = y + h - 42;
    const pitch = U.clamp((by - 26 - cy) / 5, 15, 20);
    KA.Pet.KEYS.forEach((k, i) => {
      const ry = cy + i * pitch;
      const c = KA.Rolls.CATBYID[k];
      T.draw(ctx, KA.Pet.LABEL[k], tx0, ry, c.col, { size: 12, weight: 900 });
      KA.UI.bar(ctx, tx0 + 36, ry - 1, tw - 84, 12, U.clamp(st[k] / 70, 0.02, 1), { col: c.col });
      T.draw(ctx, String(st[k]) + (p.rolled[k] ? ' (+' + p.rolled[k] + ')' : ''), tx0 + tw, ry, P.text,
        { size: 11, align: 'right', weight: 800 });
    });
    let cx = tx0;
    const ty = cy + 5 * pitch + 2;
    for (const tr of p.traits) {
      const TR = KA.Pets.TRAITS[tr];
      if (!TR || cx + 80 > tx0 + tw) break;
      cx += KA.UI.chip(ctx, cx, ty, TR.name, TR.col, { size: 10 });
    }

    if (KA.UI.button(ctx, x + 10, by, 80, 32, 'FEED', { tone: 'green', size: 15 })) KA.Game.go('feeding', {});
    if (KA.UI.button(ctx, x + 96, by, 74, 32, 'RENAME', { tone: 'dark', size: 13 })) {
      p.name = U.pick(KA.Pets.NAMES); nameT = 1; KA.A.play('squeak'); S.save();
    }
    const sw = Math.min(84, x + w - 186);
    if (S.pets().length > 1 && sw > 44 && KA.UI.button(ctx, x + 176, by, sw, 32, 'SWAP', { tone: 'blue', size: 13 })) {
      const list = S.pets(), i = list.findIndex((q) => q.uid === p.uid);
      S.setActive(list[(i + 1) % list.length].uid);
      KA.A.play('blip'); S.save();
    }
    if (nameT > 0) T.draw(ctx, 'renamed!', x + 96, by - 15, P.kelp, { size: 11, alpha: nameT });
  }

  /* ---- THE ROLLING MACHINE ---- */
  function machinePanel(ctx, x, y, w, h, p, st, titled) {
    KA.UI.panel(ctx, x, y, w, h, titled ? 'THE ROLLING MACHINE' : null,
      { titleCol: P.violet, titleRight: 78 });
    const cx = x + w / 2;
    let cy = y + (titled ? 32 : 10);
    T.draw(ctx, 'no skill trees. pick a category, feed it a token,', cx, cy, P.dim,
      { size: 11, align: 'center', weight: 600 });
    T.draw(ctx, 'and find out what the ocean thinks of you.', cx, cy + 14, P.dim,
      { size: 11, align: 'center', weight: 600 });
    cy += 32;
    // category buttons
    const cw = (w - 24) / 5;
    KA.Rolls.CATS.forEach((c, i) => {
      if (KA.UI.button(ctx, x + 12 + i * cw + 2, cy, cw - 4, 32, c.name, { tone: cat === c.id ? 'gold' : 'dark',
          size: Math.max(9, Math.min(11, cw / 5.4)), id: 'cat' + i, tip: c.blurb })) { cat = c.id; KA.A.play('blip'); }
    });
    cy += 38;
    // the drum
    const drumH = Math.min(74, h * 0.22);
    D.rr(ctx, x + 12, cy, w - 24, drumH, 10, 'rgba(3,16,26,.7)');
    const cc = KA.Rolls.CATBYID[cat];
    if (spin > 0) {
      const tt = KA.Rolls.TIERS[Math.floor(KA.Rig.sea.T * 22) % KA.Rolls.TIERS.length];
      T.draw(ctx, tt.name, cx, cy + 14, tt.col, { size: 26, align: 'center', weight: 900 });
      T.draw(ctx, 'rolling...', cx, cy + drumH - 22, P.dim, { size: 13, align: 'center' });
    } else if (result) {
      const r = result;
      T.draw(ctx, r.bust ? 'BUST' : r.tier.name, cx, cy + 8, r.bust ? P.coral : r.tier.col,
        { size: 26, align: 'center', weight: 900, glow: D.alpha(r.bust ? P.coral : r.tier.col, 0.6) });
      T.draw(ctx, r.amount > 0 ? '+' + r.amount + ' ' + KA.Rolls.CATBYID[r.cat].name : r.tier.shout,
        cx, cy + drumH - 30, P.text, { size: 15, align: 'center', weight: 800 });
      if (r.doubled && !r.bust) T.draw(ctx, 'DOUBLED', cx, cy + drumH - 14, P.gold, { size: 11, align: 'center', weight: 800 });
    } else {
      T.draw(ctx, 'ROLL ' + cc.name, cx, cy + 12, cc.col, { size: 24, align: 'center', weight: 900 });
      T.draw(ctx, cc.blurb, cx, cy + drumH - 22, P.dim, { size: 12, align: 'center' });
    }
    cy += drumH + 8;
    // odds table
    const w2 = (w - 24) / KA.Rolls.TIERS.length;
    KA.Rolls.TIERS.forEach((tt, i) => {
      const bx = x + 12 + i * w2;
      D.rr(ctx, bx + 1, cy, w2 - 2, 30, 5, D.alpha(tt.col, 0.14));
      T.draw(ctx, tt.name, bx + w2 / 2, cy + 3, tt.col,
        { size: Math.max(7, Math.min(9, w2 / 5.6)), align: 'center', weight: 900 });
      T.draw(ctx, '+' + tt.amount, bx + w2 / 2, cy + 15, P.text, { size: 11, align: 'center', weight: 800 });
    });
    T.draw(ctx, 'LUCK ' + st.lck + ' bends this table your way', cx, cy + 34, P.dim2, { size: 10, align: 'center' });
    // tokens, then the two levers
    const hist_h = 26;
    const by = y + h - hist_h - 46;
    D.rr(ctx, x + 12, by - 34, w - 24, 30, 8, 'rgba(3,16,26,.6)');
    T.draw(ctx, 'ROLL TOKENS', x + 22, by - 26, P.dim, { size: 12, weight: 700 });
    if (w > 280) T.draw(ctx, dbl ? 'doubling: 2 tokens' : '1 token per roll', x + 118, by - 24, P.dim2, { size: 10, weight: 600 });
    T.draw(ctx, String(p.tokens || 0), x + w - 22, by - 29, P.violet, { size: 18, align: 'right', weight: 900 });
    const half = (w - 36) * 0.44;
    if (KA.UI.button(ctx, x + 12, by, half, 40, dbl ? 'DOUBLE: ON' : 'DOUBLE DOWN',
        { tone: dbl ? 'red' : 'dark', size: Math.max(10, Math.min(13, half / 8.6)),
          sub: dbl ? '2 tokens, x2 or bust' : '2 tokens, x2 or nothing' })) { dbl = !dbl; KA.A.play('click'); }
    if (KA.UI.button(ctx, x + 24 + half, by, w - 36 - half, 40, spin > 0 ? '...' : 'ROLL',
        { tone: 'violet', size: 20, disabled: spin > 0 || (p.tokens || 0) < (dbl ? 2 : 1), key: 'Space' })) doRoll();
    // history
    hist.forEach((h2, i) => {
      const hx = x + 12 + i * 44;
      if (hx + 40 > x + w - 8) return;
      D.rr(ctx, hx, y + h - 24, 40, 16, 4, D.alpha(h2.bust ? P.coral : h2.tier.col, 0.2));
      T.draw(ctx, (h2.bust ? 'X' : '+' + h2.amount) + ' ' + KA.Rolls.CATBYID[h2.cat].name.slice(0, 3),
        hx + 20, y + h - 22, h2.bust ? P.coral : h2.tier.col, { size: 9, align: 'center', weight: 800 });
    });
  }

  function draw(ctx) {
    const p = S.active();
    const sp = KA.Pets.byId[p.sp];
    const st = KA.Pet.stats(p);
    const pr = KA.Pet.progress(p);
    D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H, [[0, '#12405c'], [1, '#04121d']], 'pvbg'));
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 6; i++) D.circle(ctx, (i * 173 + 40) % KA.W, 40 + i * 58, 66, '#1d6d94');
    ctx.globalAlpha = 1;

    if (KA.W < 580) {
      /* narrow screens get one full-width panel and a tab to swap between them */
      const w = KA.W - 16;
      KA.UI.tabs(ctx, 8, 10, w - 76, 26, ['MOUNT', 'ROLL'], tab, (i) => { tab = i; KA.A.play('blip'); });
      if (tab === 0) mountPanel(ctx, 8, 42, w, KA.H - 50, p, sp, st, pr);
      else machinePanel(ctx, 8, 42, w, KA.H - 50, p, st, false);
    } else {
      const lw = Math.min(300, KA.W * 0.46);
      mountPanel(ctx, 8, 8, lw, KA.H - 16, p, sp, st, pr);
      machinePanel(ctx, lw + 16, 8, KA.W - lw - 24, KA.H - 16, p, st, true);
    }
    if (KA.UI.button(ctx, KA.W - 74, 12, 62, 26, 'BACK', { tone: 'dark', size: 13, key: 'Escape' }))
      KA.Game.go('world', {});
  }
  return { enter, update, draw };
})();
