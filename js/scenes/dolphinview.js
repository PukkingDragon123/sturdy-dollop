/* ============================================================
   dolphinview.js - stats, traits and the skill tree.
   ============================================================ */
DZ.Scenes.dolphinview = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let t = 0, confirmRelease = false, flashNode = null, flashT = 0;

  function enter() { t = 0; confirmRelease = false; }

  function update(dt) {
    t += dt;
    if (flashT > 0) flashT -= dt;
    DZ.Water.tick(dt);
    const ros = DZ.State.roster();
    if (DZ.Input.isPressed('KeyQ') || DZ.Input.isPressed('KeyE')) {
      const d = DZ.State.selected();
      const i = ros.findIndex((x) => x.id === d.id);
      const n = DZ.Input.isPressed('KeyQ') ? (i - 1 + ros.length) % ros.length : (i + 1) % ros.length;
      DZ.State.select(ros[n].id);
      DZ.Audio.play('blip');
    }
  }

  function draw(ctx) {
    const S = DZ.State.S;
    const d = DZ.State.selected();
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, d && d.evil ? '#1b0f2e' : '#0b3552', '#04121f', 10);
    DZ.Water.shafts(ctx, 4, 0.05);
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    DZ.Game.topbar(ctx, { title: 'DOLPHIN' });
    if (!d) return;
    left(ctx, d, S);
    tree(ctx, d, S);
  }

  /* ---------------- left: the dolphin ---------------- */
  function left(ctx, d, S) {
    const x = 2, y = 16, w = 136, h = 206;
    DZ.UI.panel(ctx, x, y, w, h, null, {});
    const lp = DZ.Dolphin.levelProgress(d);
    const st = DZ.Dolphin.stats(d, S);
    // portrait
    Px.rect(ctx, x + 3, y + 3, w - 6, 44, d.evil ? '#150a24' : '#062033');
    Px.frame(ctx, x + 3, y + 3, w - 6, 44, d.evil ? PAL.evil2 : '#123246');
    const bob = Math.sin(t * 2) * 2;
    const frame = Math.floor(t * 4) % 2;
    DZ.Dolphin.draw(ctx, d, x + w / 2, y + 27 + bob, { center: true, scale: 2, frame });
    if (U.chance(0.04)) DZ.FX.bubbles(x + w / 2 + 24, y + 22 + bob, 1);
    // name row
    T.draw(ctx, d.name, x + 5, y + 51, d.evil ? PAL.evil : PAL.text, { size: 10, bold: true });
    T.draw(ctx, 'Lv ' + lp.lvl + '  ' + DZ.Dolphin.tierName(d) + (d.evil ? '  EVIL' : ''), x + 5, y + 62, PAL.gold, { size: 7 });
    T.draw(ctx, d.skinName + '  gen ' + d.gen + '  born day ' + d.born, x + 5, y + 70, PAL.dim2, { size: 7 });
    DZ.UI.bar(ctx, x + 5, y + 79, w - 12, 8, lp.frac, { col: PAL.cyan, label: Math.floor(lp.cur) + ' / ' + lp.need + ' EXP' });

    // stats
    let sy = y + 91;
    DZ.Dolphin.STATS.forEach((k) => {
      const info = DZ.Dolphin.STAT_INFO[k];
      T.draw(ctx, info.short, x + 5, sy, info.col, { size: 7, bold: true });
      DZ.UI.bar(ctx, x + 28, sy - 1, 76, 7, st[k] / Math.max(40, st[k] + 8), { col: info.col, bg: '#05202f' });
      T.draw(ctx, String(st[k]), x + w - 6, sy, PAL.text, { size: 7, align: 'right', bold: true });
      if (DZ.UI.hover(x + 3, sy - 2, w - 6, 9)) DZ.UI.tooltip(info.blurb);
      sy += 9;
    });
    // traits
    T.draw(ctx, 'TRAITS', x + 5, sy + 1, PAL.dim, { size: 7 });
    sy += 9;
    let tx = x + 5;
    for (const tr of d.traits) {
      const TR = DZ.Names.TRAITS[tr];
      if (!TR) continue;
      const cw = T.width(TR.name, 7) + 7;
      if (tx + cw > x + w - 4) { tx = x + 5; sy += 11; }
      DZ.UI.chip(ctx, tx, sy, TR.name, TR.col);
      if (DZ.UI.hover(tx, sy, cw, 10)) DZ.UI.tooltip(TR.name + ': ' + TR.blurb + ' ' +
        Object.keys(TR.mods).map((k) => (TR.mods[k] > 0 ? '+' : '') + TR.mods[k] + ' ' + DZ.Dolphin.STAT_INFO[k].short).join(' '));
      tx += cw + 2;
    }
    sy += 13;
    if (d.note) U.wrap('"' + d.note + '"', 30).forEach((l, i) => T.draw(ctx, l, x + 5, sy + i * 8, PAL.dim, { size: 7 }));
    // record
    T.draw(ctx, 'races ' + d.races + '   wins ' + d.wins + (d.parents ? '   ' + d.parents.join(' + ') : ''),
      x + 5, y + h - 32, PAL.dim2, { size: 7 });
    if (d.corrupt > 0 && !d.evil) {
      DZ.UI.bar(ctx, x + 5, y + h - 22, w - 12, 6, d.corrupt / 100, { col: PAL.evil, label: 'CORRUPTION ' + Math.round(d.corrupt) + '%' });
    }
    // buttons
    if (!confirmRelease) {
      if (DZ.UI.button(ctx, x + 3, y + h - 14, 44, 12, 'RENAME', { tone: 'dark', size: 7,
          tip: 'Reroll this dolphin\'s name. Naming is hard.' })) {
        d.name = DZ.Names.randDolphin(DZ.State.roster().map((o) => o.name));
        DZ.Audio.play('squeak'); DZ.State.save();
      }
      if (DZ.UI.button(ctx, x + 49, y + h - 14, 40, 12, 'RELEASE', { tone: 'red', size: 7,
          disabled: DZ.State.roster().length <= 1, tip: 'Set free. Permanently.' })) confirmRelease = true;
      if (DZ.UI.button(ctx, x + 91, y + h - 14, 42, 12, 'NEXT >', { tone: 'blue', size: 7, tip: 'Next dolphin (Q/E)' })) {
        const ros = DZ.State.roster();
        const i = ros.findIndex((o) => o.id === d.id);
        DZ.State.select(ros[(i + 1) % ros.length].id);
      }
    } else {
      T.draw(ctx, 'Release ' + d.name + '?', x + 5, y + h - 24, PAL.coral, { size: 7 });
      if (DZ.UI.button(ctx, x + 3, y + h - 14, 64, 12, 'YES, BYE', { tone: 'red', size: 7 })) {
        DZ.State.releaseDolphin(d.id); confirmRelease = false; DZ.Audio.play('splash'); DZ.State.save();
      }
      if (DZ.UI.button(ctx, x + 69, y + h - 14, 64, 12, 'NO WAIT', { tone: 'green', size: 7 })) confirmRelease = false;
    }
  }

  /* ---------------- right: skill tree ---------------- */
  function tree(ctx, d, S) {
    const px = 141, py = 16, pw = DZ.W - 143, ph = 206;
    DZ.UI.panel(ctx, px, py, pw, ph, null, {});
    T.draw(ctx, 'SKILL TREE', px + 5, py + 4, PAL.cyan, { size: 8, bold: true });
    const spCol = d.sp > 0 ? PAL.gold : PAL.dim;
    T.draw(ctx, d.sp + ' SKILL POINT' + (d.sp === 1 ? '' : 'S'), px + pw - 6, py + 4, spCol, { size: 8, align: 'right', bold: true });

    const colW = Math.floor((pw - 8) / 4);
    const nodeW = colW - 5, nodeH = 22;
    const top = py + 26;
    DZ.Skills.BRANCH.forEach((br, bi) => {
      const bx = px + 4 + bi * colW;
      T.draw(ctx, br.name, bx + nodeW / 2, top - 10, br.col, { size: 7, align: 'center', bold: true });
      if (DZ.UI.hover(bx, top - 11, nodeW, 9)) DZ.UI.tooltip(br.blurb);
      const nodes = DZ.Skills.nodesFor(bi);
      nodes.forEach((n, ri) => {
        const y = top + ri * (nodeH + 7);
        // connector
        if (ri > 0) {
          const owned = d.skills[nodes[ri - 1].id];
          Px.rect(ctx, bx + nodeW / 2 - 1, y - 7, 2, 7, owned ? br.col : '#123246');
        }
        const owned = !!d.skills[n.id];
        const chk = DZ.Skills.canBuy(d, n);
        const avail = chk.ok;
        const reqMet = n.req.every((r) => d.skills[r]) && (!n.evil || d.evil);
        const hot = DZ.UI.hover(bx, y, nodeW, nodeH);
        let fill = '#08283c', border = '#123246', txt = PAL.dim2;
        if (owned) { fill = Px.mix(br.col, '#000', 0.62); border = br.col; txt = '#ffffff'; }
        else if (avail) { fill = '#0d3d58'; border = Px.mix(br.col, '#000', 0.35); txt = PAL.text; }
        else if (reqMet) { fill = '#0a2c40'; border = '#1a4a66'; txt = PAL.dim; }
        Px.rect(ctx, bx, y, nodeW, nodeH, hot ? Px.mix(fill, '#ffffff', 0.12) : fill);
        Px.frame(ctx, bx, y, nodeW, nodeH, hot && avail ? '#ffffff' : border);
        if (flashNode === n.id && flashT > 0) Px.frame(ctx, bx - 1, y - 1, nodeW + 2, nodeH + 2, '#ffffff');
        const nm = n.name.length * 4 > nodeW - 6 ? n.name.slice(0, Math.floor((nodeW - 6) / 4)) : n.name;
        T.draw(ctx, nm, bx + 3, y + 3, txt, { size: 7, bold: owned });
        if (n.ability) {
          const ab = DZ.Skills.ABILITIES[n.ability];
          Px.draw(ctx, ab.icon, bx + 3, y + 12, { alpha: owned ? 1 : 0.5 });
          T.draw(ctx, 'ABILITY', bx + 12, y + 13, owned ? br.col : PAL.dim2, { size: 7 });
        } else {
          const mods = Object.keys(n.mods).map((k) => '+' + n.mods[k] + DZ.Dolphin.STAT_INFO[k].short).join(' ');
          T.draw(ctx, mods || (n.passive ? 'PASSIVE' : ''), bx + 3, y + 13, owned ? br.col : PAL.dim2, { size: 7 });
        }
        if (owned) T.draw(ctx, 'OK', bx + nodeW - 3, y + 3, '#ffffff', { size: 7, align: 'right', bold: true });
        else {
          Px.rect(ctx, bx + nodeW - 11, y + 2, 9, 8, avail ? '#3a2a05' : '#0a1e2c');
          T.draw(ctx, String(n.cost), bx + nodeW - 7, y + 3, avail ? PAL.gold : PAL.dim2, { size: 7, align: 'center' });
        }
        if (hot) {
          DZ.UI.tooltip(n.name + ' - ' + n.blurb + (owned ? ' [LEARNED]' : avail ? ' [' + n.cost + ' SP]' : ' [' + chk.why + ']'));
          if (DZ.Input.mouse.click && !DZ.UI.blocked()) {
            DZ.Input.mouse.click = false;
            if (avail) {
              DZ.Dolphin.learn(d, n.id, S);
              flashNode = n.id; flashT = 0.4;
              DZ.Audio.play('levelup');
              DZ.FX.text(bx + nodeW / 2, y + 4, n.name + '!', br.col, { size: 8, screen: true, life: 1.2 });
              DZ.FX.burst(bx + nodeW / 2, y + nodeH / 2, 14, { col: [br.col, '#ffffff'], speed: 80 });
              DZ.State.toast(d.name + ' learned ' + n.name, br.col);
              DZ.State.save();
            } else { DZ.Audio.play('deny'); DZ.State.toast(chk.why, PAL.coral); }
          }
        }
      });
    });
    // abilities strip
    const abs = DZ.Dolphin.abilities(d);
    T.draw(ctx, 'RACE ABILITIES: ' + (abs.length ? abs.map((a) => DZ.Skills.ABILITIES[a].name).join(', ') : 'none yet - learn one!'),
      px + 5, py + ph - 10, abs.length ? PAL.cyan : PAL.dim2, { size: 7 });
  }

  return { enter, update, draw };
})();
