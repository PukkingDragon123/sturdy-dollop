/* ============================================================
   dialog.js - talking to people. A bottom panel with a live
   animated NPC portrait, typed-out text and choices.
   ============================================================ */
DZ.Dialog = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let cur = null, chars = 0, page = 0, t = 0, cool = 0;

  function open(o) {
    cur = Object.assign({ name: '???', kind: 'merchant', lines: [], choices: null, col: PAL.gold }, o);
    cur.lines = Array.isArray(cur.lines) ? cur.lines.slice() : [String(cur.lines)];
    page = 0; chars = 0; t = 0; cool = 0.15;
    DZ.Audio.play('blip');
  }
  function close() { cur = null; }
  const active = () => !!cur;

  function say(lines) { if (cur) { cur.lines = lines.slice(); page = 0; chars = 0; } }

  function update(dt) {
    if (!cur) return;
    t += dt;
    if (cool > 0) cool -= dt;
    const line = cur.lines[page] || '';
    if (chars < line.length) {
      chars = Math.min(line.length, chars + dt * 46);
      if (Math.random() < 0.3) DZ.Audio.play('hover');
    }
    const advance = (DZ.Input.isPressed('Space') || DZ.Input.isPressed('Enter') ||
                     DZ.Input.isPressed('KeyE') || DZ.Input.mouse.click) && cool <= 0;
    if (advance) {
      DZ.Input.mouse.click = false;
      cool = 0.12;
      if (chars < line.length) { chars = line.length; return; }
      if (page < cur.lines.length - 1) { page++; chars = 0; DZ.Audio.play('click'); return; }
      if (!cur.choices || !cur.choices.length) {
        const done = cur.onDone;
        close();
        if (done) done();
      }
    }
    if (DZ.Input.isPressed('Escape') && (!cur.choices || !cur.choices.length)) close();
  }

  function draw(ctx) {
    if (!cur) return;
    const h = 74, y = DZ.H - h - 3, x = 8, w = DZ.W - 16;
    ctx.globalAlpha = 0.35;
    Px.rect(ctx, 0, 0, DZ.W, DZ.H, '#020a12');
    ctx.globalAlpha = 1;
    Px.rect(ctx, x + 2, y + 3, w, h, '#02090f');
    Px.rect(ctx, x, y, w, h, '#07202f');
    Px.frame(ctx, x, y, w, h, cur.col);
    // portrait box
    Px.rect(ctx, x + 3, y + 3, 52, h - 6, '#0a2d42');
    Px.frame(ctx, x + 3, y + 3, 52, h - 6, '#14506e');
    const talking = chars < (cur.lines[page] || '').length;
    if (cur.dolphin) {
      DZ.Rig.dolphin.draw(ctx, cur.dolphin, x + 29, y + h / 2, { center: true, scale: 1.5, speed: 0.3, talk: talking, tag: 'dlg' });
    } else if (cur.hero) {
      DZ.Rig.hero.draw(ctx, x + 29, y + h - 26, { scale: 1.35, mode: 'stand', talk: talking, tag: 'dlghero' });
    } else {
      DZ.Rig.npc.draw(ctx, x + 29, y + h - 22, { scale: 1.55, kind: cur.kind, talk: talking, tag: 'dlg' + cur.kind });
    }
    // name plate
    const nw = T.width(cur.name, 8, true) + 8;
    Px.rect(ctx, x + 58, y - 6, nw, 12, '#07202f');
    Px.frame(ctx, x + 58, y - 6, nw, 12, cur.col);
    T.draw(ctx, cur.name, x + 62, y - 4, cur.col, { size: 8, bold: true });
    // text
    const line = (cur.lines[page] || '').slice(0, Math.floor(chars));
    U.wrap(line, 60).forEach((l, i) => T.draw(ctx, l, x + 62, y + 8 + i * 10, PAL.text, { size: 8 }));
    // choices or prompt
    if (cur.choices && cur.choices.length && chars >= (cur.lines[page] || '').length && page === cur.lines.length - 1) {
      cur.choices.forEach((c, i) => {
        const bw = Math.floor((w - 70) / cur.choices.length) - 4;
        if (DZ.UI.button(ctx, x + 62 + i * (bw + 4), y + h - 20, bw, 16,
            c.text, { tone: c.tone || 'gold', size: 8, id: 'dc' + i })) {
          const fn = c.action; close(); if (fn) fn();
        }
      });
    } else if (chars >= (cur.lines[page] || '').length) {
      const more = page < cur.lines.length - 1;
      T.draw(ctx, more ? '[SPACE] more' : '[SPACE] ok', x + w - 6, y + h - 12,
        PAL.dim, { size: 7, align: 'right', alpha: 0.6 + Math.sin(t * 5) * 0.4 });
    }
  }

  return { open, close, active, update, draw, say };
})();
