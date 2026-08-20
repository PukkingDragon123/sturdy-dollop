/* dev-only: F2 from anywhere. Shows the rigs big, for tuning. */
DZ.Scenes.rigtest = (function () {
  const Px = DZ.Pixel, T = DZ.Text;
  let t = 0, pose = 0;
  const fake = (o) => Object.assign({ id: 'rt' + (o && o.tag || ''), pal: { '1': '#5aa8d8', '2': '#2f6f9e', '3': '#cfeaf7' },
    evil: false, traits: [], skills: {}, base: {}, mood: 0.8 }, o || {});
  const a = fake({ id: 'rt1' });
  const b = fake({ id: 'rt2', evil: true });
  const c = fake({ id: 'rt3', pal: { '1': '#f2a0c4', '2': '#c05f8c', '3': '#ffe0ee' } });

  function enter() { t = 0; }
  function update(dt) { t += dt; if (DZ.Input.isPressed('Space')) pose = (pose + 1) % 3; }
  function draw(ctx) {
    Px.rect(ctx, 0, 0, DZ.W, DZ.H, '#123a52');
    for (let x = 0; x < DZ.W; x += 20) Px.rect(ctx, x, 0, 1, DZ.H, '#164761');
    for (let y = 0; y < DZ.H; y += 20) Px.rect(ctx, 0, y, DZ.W, 1, '#164761');
    T.draw(ctx, 'RIG TEST - F2/ESC exits, SPACE cycles motion', 4, 3, '#fff', { size: 8 });
    const spd = [0, 120, 340][pose];
    T.draw(ctx, 'speed ' + spd, 4, 13, '#7ff0ff', { size: 7 });
    const wob = Math.sin(t * 2.2) * spd;   // shove them around so the springs work

    DZ.Rig.hero.draw(ctx, 60, 120, { scale: 4.6, mode: 'stand', vx: wob * 0.2, vy: 0, t, tag: 'HA' });
    T.draw(ctx, 'stand', 60, 200, '#ffd24a', { size: 8, align: 'center' });
    DZ.Rig.hero.draw(ctx, 175, 110, { scale: 4.6, mode: 'swim', vx: 60 + wob, vy: Math.sin(t) * 40, t, tag: 'HB' });
    T.draw(ctx, 'swim', 175, 200, '#ffd24a', { size: 8, align: 'center' });
    DZ.Rig.hero.draw(ctx, 300, 110, { scale: 4.6, mode: 'ride', vx: 200 + wob, vy: 0, t, tag: 'HC' });
    T.draw(ctx, 'ride the trident', 300, 200, '#ffd24a', { size: 8, align: 'center' });

    DZ.Rig.dolphin.draw(ctx, 60, 210, { center: true, scale: 2, speed: spd / 200, tag: 'A' });
    DZ.Rig.dolphin.draw(ctx, 175, 210, { center: true, scale: 2, speed: spd / 200, tag: 'B' });
    DZ.Rig.dolphin.draw(ctx, 300, 210, { center: true, scale: 2, speed: spd / 200, flipX: true, tag: 'C' });
    if (DZ.Rig.npc) {
      DZ.Rig.npc.draw(ctx, 370, 120, { scale: 4, kind: 'guard', t, tag: 'G' });
      T.draw(ctx, 'guard', 370, 200, '#8fd8ff', { size: 7, align: 'center' });
    }
    if (DZ.Input.isPressed('F2') || DZ.Input.isPressed('Escape')) DZ.Game.go('ranch');
  }
  return { enter, update, draw };
})();
