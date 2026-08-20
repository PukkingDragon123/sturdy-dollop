/* ============================================================
   questboard.js - the quest board outside the hut.
   ============================================================ */
DZ.Scenes.questboard = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let t = 0;

  function enter() { t = 0; DZ.Quests.refresh(DZ.State.S); DZ.UI.resetScroll('qb'); }
  function update(dt) { t += dt; DZ.Water.tick(dt); }

  function draw(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#123a52', '#04121f', 10);
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    Px.draw(ctx, 'board', 4, 24, { scale: 2 });
    DZ.Game.topbar(ctx, { title: 'QUEST BOARD' });
    T.draw(ctx, 'people want things. you have a spear.', 6, 18, PAL.dim2, { size: 7 });

    const x = 34, y = 28, w = DZ.W - 38, h = 192;
    Px.rect(ctx, x, y, w, h, '#04121d');
    Px.frame(ctx, x, y, w, h, '#123246');
    const qs = S.quests;
    DZ.UI.scroll('qb', ctx, x + 1, y + 1, w - 2, h - 2, Math.max(h, qs.length * 44 + 4), (ox, oy, ow) => {
      qs.forEach((q, i) => {
        const ry = oy + 2 + i * 44;
        if (ry > y + h || ry < y - 44) return;
        const done = q.done;
        Px.rect(ctx, ox + 1, ry, ow - 4, 42, done ? '#0d3320' : (i % 2 ? '#072335' : '#08283c'));
        if (done) Px.frame(ctx, ox + 1, ry, ow - 4, 42, PAL.kelp);
        T.draw(ctx, q.giver, ox + 6, ry + 3, q.giverCol, { size: 7, bold: true });
        T.draw(ctx, '"' + q.line + '"', ox + 6 + T.width(q.giver, 7, true) + 6, ry + 3, PAL.dim2, { size: 7 });
        T.draw(ctx, q.text, ox + 6, ry + 13, done ? PAL.kelp : PAL.text, { size: 8, bold: true });
        DZ.UI.bar(ctx, ox + 6, ry + 25, 150, 8, q.have / q.need,
          { col: done ? PAL.kelp : PAL.cyan, label: Math.min(q.have, q.need) + ' / ' + q.need });
        let rx = ox + 164;
        Px.draw(ctx, 'coin', rx, ry + 25, {});
        T.draw(ctx, U.fmt(q.clams), rx + 8, ry + 26, PAL.gold, { size: 7 });
        if (q.sp) {
          Px.draw(ctx, 'star', rx + 40, ry + 25, {});
          T.draw(ctx, '+' + q.sp + ' SP', rx + 48, ry + 26, PAL.cyan, { size: 7 });
        }
        if (done) {
          if (DZ.UI.button(ctx, ox + ow - 66, ry + 22, 60, 16, 'CLAIM!', { tone: 'gold', size: 8, bold: true, id: 'cq' + i })) {
            DZ.State.claimQuest(q);
            DZ.FX.text(DZ.W / 2, 90, '+' + U.fmt(q.clams) + ' CLAMS', PAL.gold, { size: 12, screen: true, life: 1.4 });
            DZ.FX.burst(DZ.W / 2, 100, 24, { col: [PAL.gold, '#ffffff'], speed: 130, g: 120 });
            DZ.State.save();
          }
        } else {
          if (DZ.UI.button(ctx, ox + ow - 66, ry + 22, 60, 16, 'REROLL 40c', { tone: 'dark', size: 7, id: 'rr' + i,
              disabled: S.clams < 40, tip: 'Swap this quest for a different one.' })) {
            if (DZ.State.spend(40)) {
              const idx = S.quests.indexOf(q);
              S.quests[idx] = DZ.Quests.make(S.day, S.quests.map((o) => o.tid));
              DZ.Audio.play('blip'); DZ.State.save();
            }
          }
        }
        T.draw(ctx, hint(q), ox + 6, ry + 34, PAL.dim, { size: 7 });
      });
      if (!qs.length) T.draw(ctx, 'Nothing on the board. Sleep to get new work.', ox + 100, oy + 80, PAL.dim, { size: 8 });
    });
  }

  function hint(q) {
    switch (q.kind) {
      case 'catch': return 'go DIVE and spear things';
      case 'sell': return 'sell fish at the MARKET';
      case 'feed': return 'FEED your dolphins at the trough';
      case 'level': return 'feed a dolphin until it levels up';
      case 'race_win': return 'win at the RACE gate';
      case 'bet': return 'bet on a winner at the RACE gate';
      case 'combo': return 'chain catches quickly on one dive';
      case 'zone': return 'buy a better air tank, then dive deep';
      case 'breed': return 'BREEDING LAGOON (needs building)';
      case 'evil': return 'ABYSSAL VAT (needs building)';
      case 'skill': return 'spend skill points in SKILLS';
      case 'shark': return 'spear Gary five times on a dive';
      case 'gear': return 'GEAR SHED';
      case 'staff': return 'BUNKHOUSE';
      default: return '';
    }
  }

  return { enter, update, draw };
})();
