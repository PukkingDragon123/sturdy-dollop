/* ============================================================
   breed.js - the Breeding Lagoon. Two dolphins, one overnight
   "gestation", one calf with mixed stats.
   ============================================================ */
DZ.Scenes.breed = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let t = 0, a = null, b = null;

  function enter() { t = 0; a = null; b = null; DZ.UI.resetScroll('brd'); }
  function update(dt) { t += dt; DZ.Water.tick(dt); }

  function cost() {
    const A = get(a), B = get(b);
    if (!A || !B) return 0;
    return Math.round(160 + (DZ.Dolphin.level(A) + DZ.Dolphin.level(B)) * 34);
  }
  function get(id) { return DZ.State.roster().find((d) => d.id === id); }

  function draw(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#2b1a44', '#0a1b2e', 10);
    DZ.Water.shafts(ctx, 4, 0.05, '#ffd6ea');
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    DZ.Game.topbar(ctx, { title: 'BREEDING LAGOON' });
    const lag = DZ.Upgrades.value(S, 'lagoon');

    // ---- the romantic pool ----
    const px = 130, py = 20, pw = DZ.W - 136, ph = 96;
    DZ.UI.panel(ctx, px, py, pw, ph, null, { fill: '#12203a' });
    Px.draw(ctx, 'clam_shell', px + pw / 2 - 12, py + ph - 18, { scale: 3 });
    for (let i = 0; i < 6; i++) {
      const hx = px + pw / 2 + Math.sin(t * 1.4 + i) * 30, hy = py + 70 - ((t * 22 + i * 26) % 70);
      ctx.globalAlpha = 0.7;
      Px.draw(ctx, 'heart', hx, hy, { center: true, alpha: 0.5 + Math.sin(t * 3 + i) * 0.3 });
      ctx.globalAlpha = 1;
    }
    const A = get(a), B = get(b);
    const ax = px + 34 + (A && B ? Math.sin(t * 1.2) * 12 : 0);
    const bx = px + pw - 34 - (A && B ? Math.sin(t * 1.2) * 12 : 0);
    const frame = Math.floor(t * 5) % 2;
    if (A) DZ.Dolphin.draw(ctx, A, ax, py + 44, { center: true, scale: 1, frame });
    else ghost(ctx, ax, py + 44, 'PICK ONE');
    if (B) DZ.Dolphin.draw(ctx, B, bx, py + 44, { center: true, scale: 1, frame, flipX: true });
    else ghost(ctx, bx, py + 44, 'PICK TWO');
    if (A && B) {
      T.draw(ctx, A.name + '  +  ' + B.name, px + pw / 2, py + 4, PAL.pink, { size: 8, align: 'center', bold: true });
      // predicted calf
      T.draw(ctx, 'EXPECTED CALF', px + pw / 2, py + 58, PAL.dim, { size: 7, align: 'center' });
      let sx = px + 18;
      DZ.Dolphin.STATS.forEach((k) => {
        const avg = Math.round((A.base[k] + B.base[k]) / 2);
        T.draw(ctx, DZ.Dolphin.STAT_INFO[k].short, sx, py + 68, DZ.Dolphin.STAT_INFO[k].col, { size: 7 });
        T.draw(ctx, '~' + avg, sx, py + 76, PAL.text, { size: 7 });
        sx += 42;
      });
    } else {
      T.draw(ctx, 'Pick two dolphins from the list.', px + pw / 2, py + 4, PAL.dim, { size: 8, align: 'center' });
    }

    // ---- roster picker ----
    const lx = 4, ly = 20, lw = 122, lh = 200;
    Px.rect(ctx, lx, ly, lw, lh, '#04121d');
    Px.frame(ctx, lx, ly, lw, lh, '#123246');
    T.draw(ctx, 'YOUR POD', lx + 4, ly + 3, PAL.cyan, { size: 7, bold: true });
    const ros = DZ.State.roster();
    DZ.UI.scroll('brd', ctx, lx + 1, ly + 12, lw - 2, lh - 14, ros.length * 24 + 2, (ox, oy, ow) => {
      ros.forEach((d, i) => {
        const ry = oy + 2 + i * 24;
        const sel = d.id === a ? 1 : d.id === b ? 2 : 0;
        const hot = DZ.UI.hover(ox + 1, ry, ow - 4, 22);
        Px.rect(ctx, ox + 1, ry, ow - 4, 22, sel ? '#3a1f52' : (hot ? '#0d3d58' : (i % 2 ? '#072335' : '#08283c')));
        if (sel) Px.frame(ctx, ox + 1, ry, ow - 4, 22, PAL.pink);
        DZ.Dolphin.draw(ctx, d, ox + 16, ry + 11, { center: true, scale: 1 });
        T.draw(ctx, d.name, ox + 32, ry + 2, d.evil ? PAL.evil : PAL.text, { size: 7, bold: true });
        T.draw(ctx, 'Lv' + DZ.Dolphin.level(d) + '  ' + d.traits.length + ' traits', ox + 32, ry + 11, PAL.dim, { size: 7 });
        if (sel) T.draw(ctx, sel === 1 ? 'A' : 'B', ox + ow - 10, ry + 6, PAL.pink, { size: 8, bold: true });
        if (hot && DZ.Input.mouse.click && !DZ.UI.blocked()) {
          DZ.Input.mouse.click = false;
          DZ.Audio.play('squeak');
          if (d.id === a) a = null;
          else if (d.id === b) b = null;
          else if (!a) a = d.id;
          else if (!b) b = d.id;
          else { a = b; b = d.id; }
        }
      });
    });

    // ---- action ----
    const c = cost();
    const bx2 = 130, by2 = 122;
    DZ.UI.panel(ctx, bx2, by2, DZ.W - 136, 98, null, {});
    T.draw(ctx, 'LAGOON LEVEL ' + lag + ' - ' + (DZ.Upgrades.byId.lagoon.levels[S.ranch.lagoon] || {}).txt,
      bx2 + 6, by2 + 5, PAL.kelp, { size: 7 });
    const perks = [
      'Calf stats average the parents, then mutate.',
      'Traits are inherited from both (and sometimes invented).',
      lag >= 3 ? 'Rare morph chance: ATLANTEAN GOLD / RADIOACTIVE LIME.' : 'Upgrade the lagoon for rare morphs.',
      lag >= 4 ? 'Twins are possible. Good luck.' : 'Level 4 lagoon: twins.',
      'An evil parent may pass on a head start on corruption.'
    ];
    perks.forEach((l, i) => T.draw(ctx, '- ' + l, bx2 + 6, by2 + 16 + i * 9, PAL.dim, { size: 7 }));
    const full = ros.length >= DZ.State.maxDolphins();
    let why = null;
    if (lag < 1) why = 'Build the Breeding Lagoon first (GEAR > RANCH).';
    else if (S.pending) why = 'A calf is already on the way! Sleep to meet it.';
    else if (!A || !B) why = 'Select two dolphins.';
    else if (A.id === B.id) why = 'That is one dolphin. Biology says no.';
    else if (full) why = 'Pens are full. Upgrade Lagoon Pens.';
    else if (S.clams < c) why = 'Need ' + U.fmt(c) + ' clams.';
    if (why) T.draw(ctx, why, bx2 + 6, by2 + 66, PAL.coral, { size: 7 });
    else T.draw(ctx, 'Gestation: one night. Science is fast here.', bx2 + 6, by2 + 66, PAL.kelp, { size: 7 });
    if (DZ.UI.button(ctx, bx2 + 6, by2 + 76, DZ.W - 148, 16, why ? 'CANNOT BREED' : 'BREED! (' + U.fmt(c) + ' clams)',
        { tone: why ? 'dark' : 'gold', size: 8, disabled: !!why, bold: true })) {
      if (DZ.State.spend(c)) {
        S.pending = { a: A.id, b: B.id };
        DZ.Audio.play('happy');
        DZ.FX.text(DZ.W / 2, 80, 'ROMANCE!', PAL.pink, { size: 14, screen: true, life: 1.6 });
        for (let i = 0; i < 16; i++) DZ.FX.sprite(px + pw / 2 + U.rnd(-40, 40), py + 60, 'heart',
          { vy: -U.rnd(30, 70), vx: U.rnd(-20, 20), life: 1.6, spin: U.rnd(-3, 3) });
        DZ.State.toast('A calf will arrive tomorrow morning.', PAL.pink);
        DZ.State.save();
      }
    }
  }

  function ghost(ctx, x, y, label) {
    ctx.globalAlpha = 0.25;
    Px.draw(ctx, 'dolphin', x, y, { center: true, flash: '#ffffff' });
    ctx.globalAlpha = 1;
    T.draw(ctx, label, x, y + 12, PAL.dim2, { size: 7, align: 'center' });
  }

  return { enter, update, draw };
})();
