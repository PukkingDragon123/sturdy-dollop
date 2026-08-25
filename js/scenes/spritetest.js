/* dev: F2 from the title. Every sprite in the atlas, paged, so
   you can see what the art actually looks like in the engine. */
KD.Scenes.spritetest = (function () {
  let page = 0, names = [];
  function enter() { names = KD.PX.names().filter((n) => n.indexOf('g5_') && n.indexOf('g3_')); page = 0; }
  function update(dt) {
    if (KD.In.isHit('Escape') || KD.In.isHit('F2')) KD.Game.go('title', {});
    if (KD.In.isHit('ArrowRight', 'Space')) page++;
    if (KD.In.isHit('ArrowLeft')) page = Math.max(0, page - 1);
  }
  function draw(ctx) {
    KD.Screen.clear('INK.1');
    for (let y = 0; y < KD.H; y += 8) for (let x = 0; x < KD.W; x += 8) {
      if (((x / 8) + (y / 8)) & 1) KD.Screen.rect(x, y, 8, 8, 'INK.0');
    }
    const cell = 40, cols = Math.floor((KD.W - 8) / cell), rows = Math.floor((KD.H - 24) / cell);
    const per = cols * rows;
    const maxPage = Math.max(0, Math.ceil(names.length / per) - 1);
    if (page > maxPage) page = maxPage;
    for (let i = 0; i < per; i++) {
      const n = names[page * per + i];
      if (!n) break;
      const x = 4 + (i % cols) * cell, y = 16 + ((i / cols) | 0) * cell;
      const s = KD.PX.get(n);
      KD.PX.blit(ctx, n, x + ((cell - s.w) >> 1), y + ((cell - 12 - s.h) >> 1) + 2, { anchor: false });
      KD.Text.draw(n, x + cell / 2, y + cell - 12, 'BONE.0', { tiny: true, align: 'center', max: cell - 2 });
      KD.Text.draw(s.w + 'x' + s.h, x + cell / 2, y + cell - 6, 'INK.3', { tiny: true, align: 'center' });
    }
    KD.Text.draw('SPRITES  ' + (page + 1) + '/' + (maxPage + 1) + '   ' + names.length + ' total   ' +
                 'arrows page  -  ESC exits', 4, 4, 'GOLD.3');
  }
  return { enter, update, draw };
})();
