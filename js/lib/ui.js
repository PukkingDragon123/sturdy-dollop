/* ============================================================
   ui.js - immediate-mode pixel UI kit (panels, buttons, bars,
   scroll regions, tooltips). Everything drawn on the low-res
   canvas so menus match the game art.
   ============================================================ */
DZ.PAL = {
  deep:   '#04121f',
  ink:    '#072335',
  ink2:   '#0b3049',
  ink3:   '#12456a',
  line:   '#1f6b96',
  lineHi: '#48b6e6',
  text:   '#dff6ff',
  dim:    '#79aec9',
  dim2:   '#487d9a',
  gold:   '#ffcf4a',
  gold2:  '#c98f1c',
  coral:  '#ff6f6f',
  red:    '#c53a3a',
  kelp:   '#40d492',
  kelp2:  '#1e8d5c',
  evil:   '#a86bff',
  evil2:  '#5d2b9a',
  sand:   '#e9d9a8',
  white:  '#ffffff',
  cyan:   '#7ff0ff',
  pink:   '#ff9ed2',
  orange: '#ff9a3c'
};

DZ.UI = (function () {
  const P = DZ.PAL, U = DZ.Util, T = DZ.Text, Px = DZ.Pixel;
  const scrolls = new Map();
  let lastHover = null, hoverNow = null;
  let tip = null, tipT = 0;
  let clipDepth = 0;
  let blockUntil = 0, now = 0;

  function begin(dt) {
    now += dt;
    hoverNow = null;
    tip = null;
  }
  function end(ctx) {
    if (hoverNow !== lastHover) { if (hoverNow) DZ.Audio.play('hover'); lastHover = hoverNow; }
    if (tip) drawTip(ctx, tip);
  }
  // swallow clicks for a moment after a scene change so a click doesn't fall through
  function guard(t) { blockUntil = now + (t || 0.12); }
  const blocked = () => now < blockUntil;

  function hover(x, y, w, h) {
    const m = DZ.Input.mouse;
    return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
  }

  function panel(ctx, x, y, w, h, title, opts) {
    opts = opts || {};
    const fill = opts.fill || P.ink;
    ctx.globalAlpha = opts.alpha === undefined ? 1 : opts.alpha;
    Px.rect(ctx, x, y, w, h, fill);
    ctx.globalAlpha = 1;
    Px.frame(ctx, x, y, w, h, opts.border || P.line);
    Px.rect(ctx, x + 1, y + 1, w - 2, 1, Px.mix(fill, '#ffffff', 0.08));
    if (title) {
      Px.rect(ctx, x + 1, y + 1, w - 2, 11, opts.titleFill || P.ink2);
      Px.rect(ctx, x + 1, y + 12, w - 2, 1, opts.border || P.line);
      T.draw(ctx, title, x + 5, y + 3, opts.titleCol || P.cyan, { size: 8, bold: true });
    }
    return { x, y, w, h, cy: y + (title ? 15 : 3) };
  }

  const TONES = {
    blue:  { a: '#12557d', b: '#0a3a58', t: P.text, e: P.lineHi },
    gold:  { a: '#b8811a', b: '#7d5610', t: '#fff6d8', e: P.gold },
    green: { a: '#1c8a5c', b: '#115c3d', t: '#dcffef', e: P.kelp },
    red:   { a: '#a83232', b: '#732020', t: '#ffdede', e: P.coral },
    evil:  { a: '#6a2fb0', b: '#42196f', t: '#f0dcff', e: P.evil },
    dark:  { a: '#0d3550', b: '#082436', t: P.dim, e: P.line }
  };

  /* button -> true when clicked this frame */
  function button(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const id = opts.id || (label + x + ',' + y);
    const tone = TONES[opts.tone || 'blue'];
    const dis = !!opts.disabled;
    const hot = !dis && hover(x, y, w, h) && clipOK(y, h);
    if (hot) hoverNow = id;
    const pressed = hot && DZ.Input.mouse.down;
    const keyHit = opts.key && !dis && DZ.Input.isPressed(opts.key);
    const off = pressed ? 1 : 0;
    // drop shadow
    Px.rect(ctx, x + 1, y + 2, w, h, '#031018');
    Px.rect(ctx, x, y + off, w, h, dis ? '#0a2434' : (hot ? Px.mix(tone.a, '#ffffff', 0.14) : tone.a));
    Px.rect(ctx, x, y + off + h - 2, w, 2, dis ? '#071a26' : tone.b);
    Px.frame(ctx, x, y + off, w, h, dis ? '#123246' : (hot ? tone.e : Px.mix(tone.b, '#000', 0.2)));
    const size = opts.size || 8;
    const ty = y + off + Math.floor((h - size - 1) / 2);
    let tx = x + w / 2, align = 'center';
    if (opts.icon) {
      const isz = Px.size(opts.icon);
      Px.draw(ctx, opts.icon, x + 4, y + off + Math.floor((h - isz.h) / 2), { alpha: dis ? 0.4 : 1 });
      tx = x + 6 + isz.w + (w - 6 - isz.w) / 2;
    }
    if (opts.align === 'left') { tx = x + 5 + (opts.icon ? Px.size(opts.icon).w + 3 : 0); align = 'left'; }
    T.draw(ctx, label, tx, ty, dis ? '#3d6a85' : tone.t, { align, size, shadow: dis ? false : '#03131d', bold: !!opts.bold });
    if (opts.sub) T.draw(ctx, opts.sub, x + w - 4, y + off + h - 9, dis ? '#3d6a85' : Px.mix(tone.t, '#000', 0.25), { align: 'right', size: 7 });
    if (hot && opts.tip) tip = { text: opts.tip };
    if (dis) return false;
    const clicked = (hot && DZ.Input.mouse.click && !blocked()) || keyHit;
    if (clicked) { DZ.Input.mouse.click = false; DZ.Audio.play(opts.sfx || 'click'); }
    return clicked;
  }

  function bar(ctx, x, y, w, h, frac, opts) {
    opts = opts || {};
    frac = U.clamp(frac, 0, 1);
    Px.rect(ctx, x, y, w, h, opts.bg || '#061c2a');
    Px.frame(ctx, x, y, w, h, opts.border || '#154561');
    const iw = Math.round((w - 2) * frac);
    if (iw > 0) {
      Px.rect(ctx, x + 1, y + 1, iw, h - 2, opts.col || P.kelp);
      Px.rect(ctx, x + 1, y + 1, iw, 1, Px.mix(opts.col || P.kelp, '#ffffff', 0.35));
    }
    if (opts.ghost !== undefined && opts.ghost > frac) {
      const gw = Math.round((w - 2) * U.clamp(opts.ghost, 0, 1));
      Px.rect(ctx, x + 1 + iw, y + 1, gw - iw, h - 2, Px.mix(opts.col || P.kelp, '#000', 0.55));
    }
    if (opts.label) T.draw(ctx, opts.label, x + w / 2, y + Math.floor((h - 7) / 2), opts.labelCol || '#eaffff', { align: 'center', size: 7, shadow: '#03131d' });
  }

  function chip(ctx, x, y, label, col, opts) {
    opts = opts || {};
    const w = T.width(label, 7) + 7;
    Px.rect(ctx, x, y, w, 10, opts.fill || '#08293c');
    Px.frame(ctx, x, y, w, 10, col);
    T.draw(ctx, label, x + 4, y + 2, col, { size: 7 });
    return w + 2;
  }

  function statRow(ctx, x, y, w, name, val, max, col) {
    T.draw(ctx, name, x, y, P.dim, { size: 7 });
    const bw = w - 46;
    bar(ctx, x + 34, y - 1, bw, 7, val / max, { col: col || P.cyan, bg: '#05202f' });
    T.draw(ctx, String(Math.round(val)), x + w, y, P.text, { size: 7, align: 'right' });
  }

  function drawTip(ctx, t) {
    const m = DZ.Input.mouse;
    const lines = U.wrap(t.text, 34);
    const w = Math.min(150, Math.max(...lines.map((l) => T.width(l, 7))) + 8);
    const h = lines.length * 8 + 6;
    let x = Math.min(m.x + 6, DZ.W - w - 2), y = m.y - h - 4;
    if (y < 2) y = m.y + 10;
    Px.rect(ctx, x, y, w, h, '#020d16');
    Px.frame(ctx, x, y, w, h, P.line);
    lines.forEach((l, i) => T.draw(ctx, l, x + 4, y + 3 + i * 8, P.text, { size: 7 }));
  }
  function tooltip(text) { if (text) tip = { text }; }

  // ---- scroll region ------------------------------------------
  function clipOK(y, h) { return true; }
  function scroll(id, ctx, x, y, w, h, contentH, drawFn) {
    let s = scrolls.get(id);
    if (!s) { s = { off: 0, drag: false }; scrolls.set(id, s); }
    const maxOff = Math.max(0, contentH - h);
    const inside = hover(x, y, w, h);
    if (inside && DZ.Input.mouse.wheel) s.off += DZ.Input.mouse.wheel * 18;
    s.off = U.clamp(s.off, 0, maxOff);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    clipDepth++;
    drawFn(x, y - Math.round(s.off), w);
    clipDepth--;
    ctx.restore();
    if (maxOff > 0) {
      const tw = 3, tx = x + w - tw;
      Px.rect(ctx, tx, y, tw, h, '#05202f');
      const kh = Math.max(8, Math.round(h * (h / contentH)));
      const ky = y + Math.round((h - kh) * (s.off / maxOff));
      Px.rect(ctx, tx, ky, tw, kh, P.line);
      // drag the bar
      if (DZ.Input.mouse.down && hover(tx - 2, y, tw + 4, h)) s.drag = true;
      if (!DZ.Input.mouse.down) s.drag = false;
      if (s.drag) s.off = U.clamp(((DZ.Input.mouse.y - y - kh / 2) / (h - kh)) * maxOff, 0, maxOff);
      // fade edges
      if (s.off > 1) { ctx.globalAlpha = 0.5; Px.rect(ctx, x, y, w - tw, 1, P.lineHi); ctx.globalAlpha = 1; }
      if (s.off < maxOff - 1) { ctx.globalAlpha = 0.5; Px.rect(ctx, x, y + h - 1, w - tw, 1, P.lineHi); ctx.globalAlpha = 1; }
    }
    return s;
  }
  function resetScroll(id) { const s = scrolls.get(id); if (s) s.off = 0; }

  // ---- misc ----------------------------------------------------
  function shadowText(ctx, str, x, y, col, opts) {
    opts = Object.assign({ shadow: '#03131d' }, opts || {});
    return T.draw(ctx, str, x, y, col, opts);
  }
  function dim(ctx, a) {
    ctx.globalAlpha = a === undefined ? 0.6 : a;
    Px.rect(ctx, 0, 0, DZ.W, DZ.H, '#020a12');
    ctx.globalAlpha = 1;
  }
  function ribbon(ctx, y, h, col) { Px.rect(ctx, 0, y, DZ.W, h, col); }

  return { begin, end, panel, button, bar, chip, statRow, hover, tooltip, scroll,
           resetScroll, shadowText, dim, ribbon, guard, blocked, TONES };
})();
