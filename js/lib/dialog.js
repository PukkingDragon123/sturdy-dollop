/* ============================================================
   dialog.js - conversations. Live animated portrait, typed text,
   choices, works on touch.
   ============================================================ */
KA.Dlg = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL;
  let cur = null, chars = 0, page = 0, t = 0, cool = 0;

  function open(o) {
    cur = Object.assign({ name: '???', kind: 'merchant', col: P.gold, lines: [] }, o);
    cur.lines = Array.isArray(cur.lines) ? cur.lines.slice() : [String(cur.lines)];
    page = 0; chars = 0; t = 0; cool = 0.2;
    KA.A.play('blip');
  }
  const close = () => { cur = null; };
  const active = () => !!cur;

  function update(dt) {
    if (!cur) return;
    t += dt;
    if (cool > 0) cool -= dt;
    const line = cur.lines[page] || '';
    if (chars < line.length) chars = Math.min(line.length, chars + dt * 54);
    const go = (KA.In.isPressed('Space') || KA.In.isPressed('Enter') || KA.In.isPressed('KeyE') ||
                KA.In.actPressed('act') || KA.In.mouse.click) && cool <= 0;
    if (go) {
      KA.In.mouse.click = false;
      cool = 0.14;
      if (chars < line.length) { chars = line.length; return; }
      if (page < cur.lines.length - 1) { page++; chars = 0; KA.A.play('click'); return; }
      if (!cur.choices || !cur.choices.length) { const d = cur.onDone; close(); if (d) d(); }
    }
    if (KA.In.isPressed('Escape') && (!cur.choices || !cur.choices.length)) close();
  }

  function draw(ctx) {
    if (!cur) return;
    const h = 108, y = KA.H - h - 8, x = 10, w = KA.W - 20;
    KA.UI.dim(ctx, 0.4);
    D.rr(ctx, x, y, w, h, 14, D.vgrad(ctx, 0, y, 0, y + h, [[0, '#0f3247'], [1, '#071c2a']], 'dlg' + h),
      { shadow: 'rgba(0,0,0,.5)', blur: 12, sy: 5 });
    D.rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 13, null, { line: D.alpha(cur.col, 0.5), lineW: 2 });
    // portrait
    D.rr(ctx, x + 8, y + 8, 78, h - 16, 10, 'rgba(4,18,29,.6)');
    const talking = chars < (cur.lines[page] || '').length;
    ctx.save();
    ctx.beginPath(); D.rr(ctx, x + 8, y + 8, 78, h - 16, 10, null); ctx.clip();
    if (cur.pet) KA.Rig.pet.draw(ctx, cur.pet, x + 47, y + h / 2, { scale: 1.5, speed: 0.3, talk: talking, tag: 'dlg' });
    else if (cur.king) KA.Rig.king.draw(ctx, x + 47, y + h - 16, { scale: 1.5, mode: 'stand', talk: talking, fat: KA.S.D.fat, weapon: KA.S.weapon() });
    else KA.Rig.folk.draw(ctx, x + 47, y + h - 14, { scale: cur.kind === 'keg' ? 1.15 : 1.5, kind: cur.kind, talk: talking, tag: 'dlg' + cur.kind });
    ctx.restore();
    // name plate
    const nw = T.width(ctx, cur.name, 14, 800) + 20;
    D.rr(ctx, x + 92, y - 12, nw, 24, 12, D.vgrad(ctx, 0, y - 12, 0, y + 12, [[0, cur.col], [1, D.shade(cur.col, -0.35)]], 'np' + cur.col));
    T.draw(ctx, cur.name, x + 102, y - 5, '#12202c', { size: 14, weight: 900 });
    // text
    const line = (cur.lines[page] || '').slice(0, Math.floor(chars));
    T.block(ctx, line, x + 96, y + 20, P.text, { size: 15, max: w - 112, lh: 20, weight: 600 });
    // choices / prompt
    const done = chars >= (cur.lines[page] || '').length;
    if (cur.choices && cur.choices.length && done && page === cur.lines.length - 1) {
      const bw = Math.min(180, (w - 112) / cur.choices.length - 8);
      cur.choices.forEach((c, i) => {
        if (KA.UI.button(ctx, x + 96 + i * (bw + 8), y + h - 40, bw, 32, c.text,
            { tone: c.tone || 'gold', size: 14, id: 'dc' + i })) {
          const fn = c.action; close(); if (fn) fn();
        }
      });
    } else if (done) {
      T.draw(ctx, KA.touch ? 'tap to continue' : '[SPACE]', x + w - 16, y + h - 24, P.dim,
        { size: 12, align: 'right', alpha: 0.5 + Math.sin(t * 5) * 0.4 });
    }
  }
  return { open, close, active, update, draw };
})();
