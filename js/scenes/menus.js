/* ============================================================
   menus.js - title, intro, outro, pause.
   ============================================================ */
KA.Scenes.title = (function () {
  const D = KA.D, T = KA.T, U = KA.U, P = KA.PAL;
  let t = 0, help = false, fish = [], kegBob = 0;
  function enter() {
    t = 0; help = false;
    fish = [];
    for (let i = 0; i < 16; i++) fish.push({ x: U.rnd(0, 980), y: U.rnd(120, 340), v: U.rnd(10, 34),
      dir: U.chance(0.5) ? 1 : -1, ph: U.rnd(0, 9), s: U.rnd(0.6, 1.3), hue: Math.random(),
      kind: U.pick(['fish', 'fish', 'jelly', 'seahorse', 'turtle']) });
  }
  function update(dt) {
    t += dt;
    KA.Rig.sea.tick(dt);
    for (const f of fish) { f.x += f.v * f.dir * dt; if (f.x > KA.W + 40) f.x = -40; if (f.x < -40) f.x = KA.W + 40; }
    if (KA.In.isPressed('F2')) KA.Game.go('rigtest');
  }
  function draw(ctx) {
    D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H,
      [[0, '#5fc8e8'], [0.4, '#2f93c4'], [1, '#05203a']], 'ttlbg' + KA.H));
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 8; i++) {
      const x = (i * 140 + Math.sin(t * 0.3 + i) * 30) % (KA.W + 200) - 100;
      D.poly(ctx, [[x, 0], [x + 30, 0], [x + 70, KA.H], [x - 10, KA.H]], '#dff6ff');
    }
    ctx.globalAlpha = 1;
    for (const f of fish) KA.Rig.sea.creature(ctx, f);
    // seabed
    D.path(ctx, () => {
      ctx.moveTo(0, KA.H);
      for (let x = 0; x <= KA.W; x += 20) ctx.lineTo(x, KA.H - 46 + Math.sin(x * 0.01) * 8);
      ctx.lineTo(KA.W, KA.H); ctx.closePath();
    }, D.vgrad(ctx, 0, KA.H - 60, 0, KA.H, [[0, '#f0dfb0'], [1, '#b89a5e']], 'ttlsand'));
    for (let i = 0; i < 7; i++) KA.Rig.sea.prop(ctx, { x: 40 + i * (KA.W / 7), kind: i % 2 ? 'coral' : 'kelp', s: 1, ph: i },
      KA.H - 44, { rock: '#4a5a6a' });

    // the king and his keg
    KA.Rig.king.draw(ctx, KA.W * 0.5 - 70, KA.H - 52, { scale: 1.5, mode: 'stand', dir: 1, fat: 62,
      weapon: KA.Items.WEAPONS[0], dt: 1 / 60 });
    KA.Rig.folk.draw(ctx, KA.W * 0.5 + 10, KA.H - 50, { scale: 1.05, kind: 'keg', tag: 'ttlkeg' });
    // logo
    const bob = Math.sin(t * 1.5) * 3;
    T.draw(ctx, 'KING OF ATLANTIC', KA.W / 2, 26 + bob, '#ffd24a',
      { size: Math.min(46, KA.W * 0.075), align: 'center', weight: 900, stroke: '#5e3f0f', strokeW: 6, glow: 'rgba(255,210,74,.5)' });
    T.draw(ctx, 'he had it all. then he met a keg.', KA.W / 2, 74 + bob, '#eaf7ff',
      { size: 15, align: 'center', weight: 700, shadow: true });

    const hasSave = KA.S.D && (KA.S.D.stats.caught > 0 || KA.S.fragCount() > 0 || KA.S.D.area !== 'home');
    const bw = 190, bx = KA.W / 2 - bw / 2;
    let by = 116;
    if (hasSave) {
      if (KA.UI.button(ctx, bx, by, bw, 44, 'CONTINUE', { tone: 'gold', size: 20, key: 'Enter',
          sub: KA.S.fragCount() + '/5 crown fragments' })) KA.Game.go('world', {});
      by += 52;
      if (KA.UI.button(ctx, bx, by, bw, 32, 'START OVER', { tone: 'red', size: 14 })) {
        KA.S.wipe(); KA.A.play('deny'); KA.Game.go('intro', {});
      }
      by += 40;
    } else {
      if (KA.UI.button(ctx, bx, by, bw, 46, 'BEGIN', { tone: 'gold', size: 22, key: 'Enter' })) KA.Game.go('intro', {});
      by += 54;
    }
    if (KA.UI.button(ctx, bx, by, bw, 30, help ? 'HIDE CONTROLS' : 'CONTROLS', { tone: 'blue', size: 14 })) help = !help;
    if (help) {
      const hw = Math.min(KA.W - 24, 400), hx = KA.W / 2 - hw / 2;
      const p = KA.UI.panel(ctx, hx, 96, hw, 200, 'HOW TO BE KING AGAIN');
      const rows = KA.touch ? [
        ['LEFT PAD', 'walk and swim. up rises, down sinks.'],
        ['HIT', 'swing whatever you are holding.'],
        ['USE', 'talk, enter doors, fish, browse shops.'],
        ['DSH / RIDE', 'dash, and hop on your mount.'],
        ['GOAL', 'five fragments. beer helps. and hurts.']
      ] : [
        ['WASD', 'walk and swim the water column'],
        ['J / click', 'attack'], ['L', 'dash'], ['F', 'mount or dismount'],
        ['E', 'talk, doors, fishing spots, shops'],
        ['M', 'mount screen (feed, roll, race)'], ['ESC', 'menu'],
        ['GOAL', 'five fragments. beer helps. and hurts.']
      ];
      rows.forEach((r, i) => {
        T.draw(ctx, r[0], hx + 14, p.cy + i * 19, P.gold, { size: 13, weight: 900 });
        T.draw(ctx, T.fit(ctx, r[1], 13, 600, hw - 108), hx + 94, p.cy + i * 19, P.text, { size: 13, weight: 600 });
      });
    }
    T.draw(ctx, 'no pixels were harmed in the making of this ocean', KA.W / 2, KA.H - 16, '#4f88a8',
      { size: 11, align: 'center' });
  }
  return { enter, update, draw };
})();

/* ---------------- intro / outro storyboard ---------------- */
function storyScene(lines, done, colTop, colBot) {
  return (function () {
    const D = KA.D, T = KA.T, U = KA.U;
    let t = 0, page = 0, chars = 0;
    function enter() { t = 0; page = 0; chars = 0; }
    function update(dt) {
      t += dt;
      const l = lines[page] || '';
      if (chars < l.length) chars = Math.min(l.length, chars + dt * 42);
      const go = KA.In.isPressed('Space') || KA.In.isPressed('Enter') || KA.In.mouse.click || KA.In.actPressed('act');
      if (go) {
        KA.In.mouse.click = false;
        if (chars < l.length) { chars = l.length; return; }
        if (page < lines.length - 1) { page++; chars = 0; KA.A.play('click'); }
        else done();
      }
      if (KA.In.isPressed('Escape')) done();
    }
    function draw(ctx) {
      D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H, [[0, colTop], [1, colBot]], 'story' + colTop));
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 5; i++) D.circle(ctx, (i * 211 + t * 12) % KA.W, 60 + i * 55, 60, '#ffffff');
      ctx.globalAlpha = 1;
      // a little tableau that changes with the page
      const cx = KA.W / 2, cy = KA.H * 0.56;
      if (page < 2) {
        KA.Rig.king.draw(ctx, cx - 60, cy + 40, { scale: 1.6, mode: 'stand', dir: 1, fat: 20, weapon: KA.Items.WEAPONS[4], dt: 1 / 60 });
        if (page === 1) KA.Rig.folk.draw(ctx, cx + 40, cy + 42, { scale: 1.1, kind: 'keg', tag: 'st' });
      } else if (page < 4) {
        KA.Rig.king.draw(ctx, cx - 40, cy + 40, { scale: 1.6, mode: 'stand', dir: 1, fat: 70, weapon: KA.Items.WEAPONS[0], dt: 1 / 60 });
        KA.Rig.folk.draw(ctx, cx + 60, cy + 42, { scale: 1.1, kind: 'keg', tag: 'st' });
      } else {
        KA.Rig.king.draw(ctx, cx - 70, cy + 40, { scale: 1.5, mode: 'stand', dir: 1, fat: 84, weapon: KA.Items.WEAPONS[0], dt: 1 / 60 });
        KA.Rig.folk.draw(ctx, cx + 60, cy + 42, { scale: 1.5, kind: 'boss', dir: -1, tag: 'stb' });
      }
      const txt = (lines[page] || '').slice(0, Math.floor(chars));
      KA.UI.panel(ctx, 30, KA.H - 96, KA.W - 60, 76, null, { fill: 'rgba(4,18,29,.86)', fill2: 'rgba(4,18,29,.94)' });
      T.block(ctx, txt, 46, KA.H - 84, '#eaf7ff', { size: 16, max: KA.W - 92, lh: 22, weight: 700 });
      T.draw(ctx, (page + 1) + '/' + lines.length + (KA.touch ? '  tap' : '  [SPACE]'), KA.W - 46, KA.H - 34,
        '#6693a8', { size: 11, align: 'right' });
    }
    return { enter, update, draw };
  })();
}
KA.Scenes.intro = storyScene(KA.Quests.INTRO, () => KA.Game.go('world', { area: 'home', x: 360 }), '#2f93c4', '#06131d');
KA.Scenes.outro = storyScene(KA.Quests.OUTRO, () => KA.Game.go('title', {}), '#ffb52e', '#5e3f0f');

/* ---------------- pause ---------------- */
KA.Scenes.pause = (function () {
  const D = KA.D, T = KA.T, U = KA.U, P = KA.PAL;
  function enter() {}
  function update(dt) { if (KA.In.isPressed('Escape')) KA.Game.go('world', {}); }
  function draw(ctx) {
    const S = KA.S.D;
    D.rect(ctx, 0, 0, KA.W, KA.H, '#06131d');
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 6; i++) D.circle(ctx, (i * 191) % KA.W, 40 + i * 52, 70, '#0f3247');
    ctx.globalAlpha = 1;
    const pw = Math.min(KA.W - 24, 660), x0 = KA.W / 2 - pw / 2;
    const p = KA.UI.panel(ctx, x0, 20, pw, KA.H - 40, 'THE STATE OF THE KINGDOM');
    const cw = Math.round(pw * 0.56);          // stats left, crown checklist right
    const y0 = p.cy;
    const rows = [
      ['Crown fragments', KA.S.fragCount() + ' / 5'],
      ['Clams', U.fmt(S.clams)],
      ['Fat', Math.round(S.fat) + '%  (speed x' + KA.S.fatPenalty().toFixed(2) + ')'],
      ['Weapon', KA.S.weapon().name],
      ['Tackle', KA.S.tackle().name],
      ['Mount', KA.S.active().name + '  Lv' + KA.Pet.level(KA.S.active())],
      ['Species', KA.Pets.byId[KA.S.active().sp].name],
      ['Mounts owned', Object.keys(S.owned).length + ' / 7'],
      ['Fish caught', S.stats.caught], ['Enemies felled', S.stats.killed],
      ['Races won', S.stats.wins + ' / ' + S.stats.races], ['Beers drunk', S.stats.drank],
      ['Woke up at home', S.stats.deaths]
    ];
    rows.forEach((r, i) => {
      const y = y0 + i * 18;
      T.draw(ctx, r[0], x0 + 16, y, P.dim, { size: 12, weight: 700 });
      T.draw(ctx, String(r[1]), x0 + cw - 6, y, P.text, { size: 12, weight: 800, align: 'right' });
    });
    // fragment checklist
    const fx = x0 + cw + 10, fw = pw - cw - 26;
    T.draw(ctx, 'THE CROWN', fx, y0 - 2, P.gold, { size: 12, weight: 900 });
    KA.Quests.FRAGS.forEach((f, i) => {
      const has = S.frags[f.id];
      const yy = y0 + 18 + i * 34;
      D.circle(ctx, fx + 5, yy + 6, 5, has ? P.gold : 'rgba(255,255,255,.15)');
      T.draw(ctx, T.fit(ctx, f.name, 11, 800, fw - 16), fx + 14, yy, has ? P.gold : P.text, { size: 11, weight: 800 });
      T.block(ctx, has ? 'RECOVERED' : f.how, fx + 14, yy + 13, has ? P.kelp : P.dim2,
        { size: 10, max: fw - 16, lh: 11, weight: 600, maxLines: 2 });
    });
    if (KA.UI.button(ctx, KA.W / 2 - 150, KA.H - 62, 140, 34, 'BACK', { tone: 'blue', size: 16, key: 'Escape' }))
      KA.Game.go('world', {});
    if (KA.UI.button(ctx, KA.W / 2 + 10, KA.H - 62, 140, 34, 'TITLE', { tone: 'dark', size: 16 }))
      KA.Game.go('title', {});
  }
  return { enter, update, draw };
})();
