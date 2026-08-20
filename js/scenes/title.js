/* ============================================================
   title.js - splash screen.
   ============================================================ */
DZ.Scenes.title = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, W = DZ.Water;
  let t = 0, dolph = [], help = false, taglineI = 0, tagT = 0, rider = null;
  const TAGLINES = [
    'raise dolphins • hunt fish • commit betting',
    'now with 100% more moisture',
    'an ancient civilisation, and also gambling',
    'he is just a little guy (he is a menace)',
    'feed fish, gain fins, become legend'
  ];

  function enter() {
    t = 0; help = false;
    rider = { x: -40, y: 150, vx: 74, vy: 0, ph: 0 };
    dolph = [];
    for (let i = 0; i < 4; i++) {
      dolph.push({
        x: U.rnd(-40, DZ.W), y: U.rnd(100, 178), sp: U.rnd(26, 52), dir: U.chance(0.5) ? 1 : -1,
        ph: U.rnd(0, 9), fake: { id: 'ttl' + i, pal: DZ.Util.pick(DZ.Dolphin.SKINS).p, traits: [], skills: {} },
        sc: 1.1 + U.rnd(0, 0.7), jump: 0, nextJump: U.rnd(2, 7)
      });
    }
  }

  function update(dt) {
    t += dt; tagT += dt;
    W.tick(dt);
    if (tagT > 4) { tagT = 0; taglineI = (taglineI + 1) % TAGLINES.length; }
    rider.ph += dt;
    rider.vy = Math.sin(rider.ph * 1.3) * 26;
    rider.x += rider.vx * dt; rider.y += rider.vy * dt;
    if (rider.x > DZ.W + 60) { rider.x = -60; rider.y = U.rnd(120, 175); }
    if (U.chance(dt * 12)) DZ.FX.bubbles(rider.x - 14, rider.y + 6, 1);
    for (const d of dolph) {
      d.x += d.sp * d.dir * dt;
      if (d.x > DZ.W + 40) { d.x = -40; d.dir = 1; }
      if (d.x < -40) { d.x = DZ.W + 40; d.dir = -1; }
      d.nextJump -= dt;
      if (d.nextJump <= 0 && d.jump <= 0) { d.jump = 1.1; d.nextJump = U.rnd(4, 11); DZ.Audio.play('squeak'); }
      if (d.jump > 0) {
        d.jump -= dt;
        if (d.jump < 0.02) { DZ.FX.bubbles(d.x, 74, 6); DZ.Audio.play('splash'); }
      }
    }
  }

  function draw(ctx) {
    // sky + sea
    Px.vgrad(ctx, 0, 0, DZ.W, 70, '#0d2a44', '#2a6c96', 6);
    Px.vgrad(ctx, 0, 68, DZ.W, DZ.H - 68, '#2e8fc0', '#031b30', 12);
    // distant Atlantis skyline above water
    // horizon landmass so the ruins have something to stand on
    Px.rect(ctx, 0, 62, DZ.W, 9, '#0a2436');
    for (let i = 0; i < DZ.W; i += 3) {
      const h = Math.round(Math.sin(i * 0.05) * 2 + Math.sin(i * 0.013) * 3);
      Px.rect(ctx, i, 62 + h, 3, 9 - h, '#0a2436');
    }
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 7; i++) {
      const x = 16 + i * 55 + Math.sin(i * 2.1) * 7;
      const ruin = { '1': '#123a55', '2': '#0b2a3e', '3': '#1c5273', '4': '#08202f', '5': '#1c5273' };
      if (i % 3 === 1) Px.draw(ctx, 'arch', x, 52, { recolor: ruin });
      else Px.draw(ctx, i % 3 === 2 ? 'pillar_broken' : 'pillar', x + 3, i % 3 === 2 ? 54 : 46, { recolor: ruin });
    }
    ctx.globalAlpha = 1;
    W.shafts(ctx, 6, 0.07, null, null, 70, DZ.H - 70);
    W.surfaceLine(ctx, 70);

    // dolphins
    for (const d of dolph) {
      const jy = d.jump > 0 ? -Math.sin((1.1 - d.jump) / 1.1 * Math.PI) * 46 : 0;
      const y = d.y + jy + Math.sin(t * 2 + d.ph) * 3;
      const rot = d.jump > 0 ? (0.5 - (1.1 - d.jump) / 1.1) * -1.4 * d.dir : 0;
      DZ.Rig.dolphin.draw(ctx, d.fake, d.x, y, {
        center: true, scale: d.sc, flipX: d.dir < 0, rot,
        speed: d.jump > 0 ? 2 : 0.6, tag: 'ttl' + dolph.indexOf(d)
      });
    }
    DZ.Rig.hero.draw(ctx, rider.x, rider.y, { scale: 1.5, mode: 'ride', vx: rider.vx, vy: rider.vy, dir: 1, tag: 'ttlhero' });
    W.marineSnow(ctx, 0, 0, 1 / 60);
    // floor
    W.ground(ctx, 205, DZ.W, '#0f4463', '#0a2f45');
    for (let i = 0; i < 8; i++) W.kelp(ctx, 14 + i * 52, 208, 26 + (i % 3) * 12, i * 2, '#1c6b46', '#268a58');

    // logo
    const bob = Math.sin(t * 1.6) * 2;
    const cx = DZ.W / 2;
    logoText(ctx, 'DOLPHIN RANCH', cx, 14 + bob, 22, '#7ff0ff', '#0a3a58');
    logoText(ctx, 'TIDES OF ATLANTIS', cx, 38 + bob, 10, '#ffd24a', '#7d5610');
    T.draw(ctx, TAGLINES[taglineI], cx, 51 + bob, '#bfeaff', { align: 'center', size: 7, alpha: 0.9 });

    const S = DZ.State.S;
    const hasSave = S && (S.day > 1 || S.dolphins.length > 1 || S.totals.caught > 0);
    const bw = 116, bx = cx - bw / 2;
    let by = 118;
    if (hasSave) {
      if (DZ.UI.button(ctx, bx, by, bw, 20, 'CONTINUE', { tone: 'gold', size: 10, bold: true, key: 'Enter',
          sub: 'day ' + S.day })) DZ.Game.go('ranch');
      by += 25;
      if (DZ.UI.button(ctx, bx, by, bw, 15, 'START OVER', { tone: 'red', size: 8,
          tip: 'Wipes your ranch. Forever. Really.' })) {
        DZ.State.wipe(); DZ.Audio.play('deny'); DZ.State.toast('New ranch, new you.', DZ.PAL.cyan);
        DZ.Game.go('ranch');
      }
      by += 20;
    } else {
      if (DZ.UI.button(ctx, bx, by, bw, 22, 'NEW RANCH', { tone: 'gold', size: 10, bold: true, key: 'Enter' }))
        DZ.Game.go('ranch');
      by += 27;
    }
    if (DZ.UI.button(ctx, bx, by, bw, 14, help ? 'HIDE CONTROLS' : 'HOW TO PLAY', { tone: 'blue', size: 8 })) help = !help;

    if (help) {
      const p = DZ.UI.panel(ctx, 30, 78, DZ.W - 60, 126, 'HOW TO RANCH A DOLPHIN', { alpha: 0.96 });
      const lines = [
        ['TRAVEL', 'M opens the ocean. Fly your trident like a broom,'],
        ['', 'WASD + SPACE to boost. Press E at a place to enter it.'],
        ['', 'Locked places have someone standing in front. Talk to them.'],
        ['DIVE', 'WASD swim, mouse aims, click = spear, E = net (live fish'],
        ['', 'are worth more). SPACE dashes. Watch your air.'],
        ['FEED', 'Fish + food = EXP = levels = skill points.'],
        ['SKILLS', 'Four branches. Stat nodes and race abilities.'],
        ['RACE', 'Bet on your dolphin OR a rival. Hold SPACE to surge,'],
        ['', '1/2/3 fire abilities. Charm shortens your odds.'],
        ['CLAMS', 'Gear, buildings, staff, breeding, and one Abyssal Vat.'],
        ['ESC', 'goes back. F1 mutes. The game saves itself.']
      ];
      lines.forEach((l, i) => {
        const y = p.cy + i * 9.6;
        T.draw(ctx, l[0], 36, y, DZ.PAL.gold, { size: 7, bold: true });
        T.draw(ctx, l[1], 68, y, DZ.PAL.text, { size: 7 });
      });
    }
    T.draw(ctx, 'made of pixels and questionable marine science', cx, DZ.H - 10, '#4f88a8', { align: 'center', size: 7 });
  }

  function logoText(ctx, str, x, y, size, col, shadow) {
    T.draw(ctx, str, x + 1, y + 2, '#031018', { align: 'center', size, bold: true });
    T.draw(ctx, str, x, y + 1, shadow, { align: 'center', size, bold: true });
    T.draw(ctx, str, x, y, col, { align: 'center', size, bold: true });
  }

  return { enter, update, draw };
})();
