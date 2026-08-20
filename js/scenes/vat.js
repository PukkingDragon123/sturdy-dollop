/* ============================================================
   vat.js - the Abyssal Vat. Turn a perfectly nice dolphin into
   a menace with a tiny hat. Evil = big stats, terrible charm,
   which means glorious betting odds.
   ============================================================ */
DZ.Scenes.vat = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let t = 0;

  function enter() { t = 0; DZ.UI.resetScroll('vat'); }
  function update(dt) {
    t += dt; DZ.Water.tick(dt);
    if (U.chance(dt * 6)) DZ.FX.bubbles(66 + U.rnd(-14, 14), 100, 1, { col: '#c9a0ff' });
  }

  function cursedCount() {
    const S = DZ.State.S;
    let n = 0;
    for (const k in S.inv.fish) {
      const sp = DZ.Species.get(k);
      if (sp && sp.flags.cursed) n += S.inv.fish[k].n;
    }
    return n;
  }
  function takeCursed() {
    const S = DZ.State.S;
    for (const k in S.inv.fish) {
      const sp = DZ.Species.get(k);
      if (sp && sp.flags.cursed) {
        if (DZ.State.takeFish(k, false, 1)) return sp;
        if (DZ.State.takeFish(k, true, 1)) return sp;
      }
    }
    return null;
  }

  function draw(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#1b0f2e', '#050208', 10);
    DZ.Water.shafts(ctx, 3, 0.05, '#a86bff');
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    DZ.Game.topbar(ctx, { title: 'ABYSSAL VAT' });

    // the vat itself
    const glow = 0.5 + Math.sin(t * 3) * 0.2;
    ctx.globalAlpha = glow * 0.35;
    Px.disc(ctx, 58, 96, 42, '#4a1f7a');
    ctx.globalAlpha = 1;
    Px.draw(ctx, 'vat', 30, 66, { scale: 5 });
    const inVat = S.vatDolphin ? DZ.State.roster().find((d) => d.id === S.vatDolphin) : null;
    if (inVat) {
      DZ.Dolphin.draw(ctx, inVat, 58, 96 + Math.sin(t * 2) * 3, { center: true, scale: 1, frame: Math.floor(t * 6) % 2, noHat: true });
      T.draw(ctx, inVat.name, 58, 136, PAL.evil, { size: 8, align: 'center', bold: true });
      DZ.UI.bar(ctx, 16, 146, 84, 8, inVat.corrupt / 100, { col: PAL.evil, label: Math.round(inVat.corrupt) + '% EVIL' });
      if (DZ.UI.button(ctx, 16, 158, 84, 13, 'PULL THEM OUT', { tone: 'dark', size: 7 })) {
        S.vatDolphin = null; DZ.Audio.play('blip'); DZ.State.save();
      }
    } else {
      T.draw(ctx, 'EMPTY', 58, 92, PAL.dim, { size: 8, align: 'center' });
      T.draw(ctx, 'place a dolphin', 58, 136, PAL.dim2, { size: 7, align: 'center' });
    }
    T.draw(ctx, 'cursed fish: ' + cursedCount(), 58, 176, PAL.evil, { size: 7, align: 'center' });
    T.draw(ctx, 'vat lv ' + S.ranch.vat, 58, 186, PAL.dim, { size: 7, align: 'center' });

    if (DZ.Upgrades.value(S, 'vat') < 1) {
      const p = DZ.UI.panel(ctx, 120, 40, 260, 120, 'THE VAT IS NOT BUILT', {});
      U.wrap('Build the Abyssal Vat in GEAR > RANCH. It costs clams, ruins a dolphin, and is the best decision you will ever make.', 44)
        .forEach((l, i) => T.draw(ctx, l, 128, p.cy + i * 10, PAL.text, { size: 8 }));
      if (DZ.UI.button(ctx, 128, 132, 100, 16, 'GO TO RANCH TAB', { tone: 'gold', size: 8 })) DZ.Game.go('shop', { tab: 1 });
      return;
    }

    // ---- what evil does ----
    const ix = 118, iy = 18, iw = DZ.W - 122;
    Px.rect(ctx, ix, iy, iw, 44, '#150a24');
    Px.frame(ctx, ix, iy, iw, 44, PAL.evil2);
    T.draw(ctx, 'WHAT CORRUPTION DOES', ix + 5, iy + 3, PAL.evil, { size: 7, bold: true });
    const perks = [
      '+4 SPD  +4 BRST  +2 STA' + (DZ.Upgrades.value(S, 'vat') >= 3 ? '  (x1.5 from vat lv3)' : ''),
      '-6 CHM: the crowd hates them, so BETTING ODDS GET LONGER',
      'unlocks the ABYSS skill branch (Dark Tide, Grip, Sea Bane)',
      'gains a tiny top hat and a moustache. Non-negotiable.'
    ];
    perks.forEach((l, i) => T.draw(ctx, '- ' + l, ix + 5, iy + 13 + i * 8, i === 1 ? PAL.gold : PAL.text, { size: 7 }));

    // ---- roster ----
    const x = 118, y = 66, w = DZ.W - 122, h = 154;
    Px.rect(ctx, x, y, w, h, '#0a0512');
    Px.frame(ctx, x, y, w, h, PAL.evil2);
    const ros = DZ.State.roster();
    DZ.UI.scroll('vat', ctx, x + 1, y + 1, w - 2, h - 2, ros.length * 34 + 2, (ox, oy, ow) => {
      ros.forEach((d, i) => {
        const ry = oy + 2 + i * 34;
        if (ry > y + h || ry < y - 34) return;
        Px.rect(ctx, ox + 1, ry, ow - 4, 32, d.evil ? '#2a1046' : (i % 2 ? '#120a1e' : '#170e26'));
        DZ.Dolphin.draw(ctx, d, ox + 18, ry + 12, { center: true, scale: 1 });
        T.draw(ctx, d.name, ox + 36, ry + 2, d.evil ? PAL.evil : PAL.text, { size: 8, bold: true });
        T.draw(ctx, 'Lv' + DZ.Dolphin.level(d) + '  ' + DZ.Dolphin.tierName(d), ox + 36, ry + 11, PAL.dim, { size: 7 });
        DZ.UI.bar(ctx, ox + 36, ry + 21, 90, 7, (d.corrupt || 0) / 100,
          { col: PAL.evil, bg: '#0a0512', label: d.evil ? 'FULLY EVIL' : Math.round(d.corrupt || 0) + '%' });
        if (d.evil) {
          if (DZ.UI.button(ctx, ox + ow - 74, ry + 8, 68, 16, 'THERAPY 800c', { tone: 'green', size: 7, id: 'th' + i,
              disabled: DZ.State.S.clams < 800, tip: 'Make them good again. Loses evil stats.' })) {
            if (DZ.State.spend(800)) {
              DZ.Dolphin.redeem(d);
              DZ.Audio.play('happy'); DZ.State.toast(d.name + ' is nice again. Boring, but nice.', PAL.kelp);
              DZ.State.save();
            }
          }
        } else {
          if (DZ.UI.button(ctx, ox + ow - 148, ry + 8, 70, 16, 'INTO THE VAT', { tone: 'evil', size: 7, id: 'iv' + i,
              disabled: S.vatDolphin === d.id, tip: 'Marinates overnight: +18% corruption per day.' })) {
            S.vatDolphin = d.id;
            DZ.Audio.play('evil'); DZ.FX.flash('#a86bff', 0.25);
            DZ.State.toast(d.name + ' is in the vat. Sleep to continue.', PAL.evil);
            DZ.State.save();
          }
          const has = cursedCount() > 0;
          if (DZ.UI.button(ctx, ox + ow - 74, ry + 8, 68, 16, 'FEED CURSED', { tone: has ? 'evil' : 'dark', size: 7,
              disabled: !has, id: 'fc' + i, tip: 'Feed one cursed fish: +16% corruption, plus EXP.' })) {
            const sp = takeCursed();
            if (sp) {
              const res = DZ.Dolphin.feedFish(d, sp, false, S);
              DZ.State.event('feed', {});
              DZ.Audio.play('chomp');
              DZ.FX.text(66, 90, '+' + res.exp + ' EXP', PAL.cyan, { size: 8, screen: true });
              DZ.FX.burst(ox + ow - 40, ry + 16, 12, { col: [PAL.evil, '#ffffff'], speed: 70, screen: true });
              if (res.becameEvil) {
                DZ.State.toast(d.name + ' IS NOW EVIL. Behold.', PAL.evil);
                DZ.Audio.play('evil'); DZ.FX.flash('#a86bff', 0.4); DZ.FX.shake(6);
              } else DZ.State.toast(d.name + ': ' + Math.round(d.corrupt) + '% evil', PAL.evil);
              DZ.State.save();
            }
          }
        }
      });
    });
  }

  return { enter, update, draw };
})();
