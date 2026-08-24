/* dev: F2 anywhere. Everything big, for tuning. */
KA.Scenes.rigtest = (function () {
  const D = KA.D, T = KA.T;
  let t = 0, mode = 0;
  const fake = KA.Pets.SPECIES.map((s) => ({ uid: 'rt' + s.id, sp: s.id, name: s.name, traits: [], exp: 0, rolled: {} }));
  function enter() { t = 0; }
  function update(dt) { t += dt; if (KA.In.isPressed('Space')) mode = (mode + 1) % 3; }
  function draw(ctx) {
    D.rect(ctx, 0, 0, KA.W, KA.H, '#0e3348');
    for (let x = 0; x < KA.W; x += 40) D.rect(ctx, x, 0, 1, KA.H, 'rgba(255,255,255,.04)');
    for (let y = 0; y < KA.H; y += 40) D.rect(ctx, 0, y, KA.W, 1, 'rgba(255,255,255,.04)');
    T.draw(ctx, 'RIG TEST  -  SPACE cycles  -  ESC exits', 8, 6, '#fff', { size: 13 });
    const sp = [0.1, 0.9, 2.2][mode];
    fake.forEach((p, i) => {
      const x = 70 + (i % 4) * 150, y = 96 + Math.floor(i / 4) * 110;
      KA.Rig.pet.draw(ctx, p, x, y, { scale: 1.5, speed: sp, tag: 'rt' });
      T.draw(ctx, KA.Pets.byId[p.sp].name, x, y + 44, '#9dc4d6', { size: 11, align: 'center' });
    });
    const hy = KA.H - 4;
    KA.Rig.king.draw(ctx, KA.W - 70, hy, { scale: 2.2, mode: ['stand', 'walk', 'swim'][mode], dir: 1,
      vx: mode ? 60 : 0, fat: 60, weapon: KA.Items.WEAPONS[2], dt: 1 / 60 });
    KA.Rig.folk.draw(ctx, KA.W - 150, hy, { scale: 1.6, kind: 'guard', dir: -1 });
    KA.Rig.folk.draw(ctx, KA.W - 230, hy, { scale: 1.6, kind: 'keg' });
    if (KA.In.isPressed('Escape') || KA.In.isPressed('F2')) KA.Game.go('title');
  }
  return { enter, update, draw };
})();
