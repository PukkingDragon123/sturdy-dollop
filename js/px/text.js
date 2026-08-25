/* ============================================================
   text.js - drawing words out of the hand-drawn font. Glyphs
   are white sprites; we tint by drawing them into a small
   scratch canvas once per colour and caching that. No fillText
   exists in this game.
   ============================================================ */
KD.Text = (function () {
  const F = () => KD.art.font;
  /* cache: colour -> {canvas, ctx} holding the whole tinted atlas */
  const tinted = {};

  function sheetFor(col) {
    const key = String(col);
    if (tinted[key]) return tinted[key];
    const src = KD.PX.sheet();
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0);
    /* keep the glyph shape, replace every colour with this one */
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = KD.PAL.hex(col);
    x.fillRect(0, 0, c.width, c.height);
    tinted[key] = { c: c, x: x };
    return tinted[key];
  }

  /* The tiny 3x5 face is uppercase-only by design, so lowercase silently
     promotes rather than turning the HUD into a row of question marks. */
  function glyphName(ch, tiny) {
    const base = tiny ? 'g3_' : 'g5_';
    let n = base + ch.charCodeAt(0);
    if (!KD.PX.has(n) && tiny) {
      const up = ch.toUpperCase();
      if (up !== ch) n = base + up.charCodeAt(0);
    }
    return n;
  }
  function has(ch, tiny) { return KD.PX.has(glyphName(ch, tiny)); }
  /* the glyph we substitute for anything we did not draw */
  const fallback = (tiny) => (tiny ? 'g3_63' : 'g5_63');   // '?'

  function advance(ch, tiny) {
    if (ch === ' ') return (tiny ? F().W3 : F().W5) + 1;
    const n = has(ch, tiny) ? glyphName(ch, tiny) : fallback(tiny);
    return KD.PX.get(n).w + 1;
  }
  function width(str, o) {
    o = o || {};
    const tiny = !!o.tiny, sp = o.space === undefined ? 0 : o.space;
    let w = 0;
    for (const ch of String(str)) w += advance(ch, tiny) + sp;
    return Math.max(0, w - 1 - sp);
  }

  /* draw(str, x, y, col, o)
     o.tiny, o.align 'left'|'center'|'right', o.shadow (a colour),
     o.space extra letter spacing, o.max (ellipsise to fit) */
  function draw(str, x, y, col, o) {
    o = o || {};
    str = String(str);
    const tiny = !!o.tiny, sp = o.space || 0;
    if (o.max !== undefined) str = fit(str, o.max, o);
    let w = width(str, o);
    x = Math.round(x); y = Math.round(y);
    if (o.align === 'center') x -= (w >> 1);
    else if (o.align === 'right') x -= w;
    if (o.shadow !== undefined) drawRaw(str, x + 1, y + 1, o.shadow, tiny, sp);
    drawRaw(str, x, y, col, tiny, sp);
    return w;
  }
  function drawRaw(str, x, y, col, tiny, sp) {
    const sh = sheetFor(col), ctx = KD.Screen.ctx();
    let cx = x;
    for (const ch of str) {
      if (ch === ' ') { cx += (tiny ? F().W3 : F().W5) + 1 + sp; continue; }
      if (ch === '\n') continue;
      const n = has(ch, tiny) ? glyphName(ch, tiny) : fallback(tiny);
      const s = KD.PX.get(n);
      ctx.drawImage(sh.c, s.u, s.v, s.w, s.h, cx, y, s.w, s.h);
      cx += s.w + 1 + sp;
    }
  }

  /* trim with an ellipsis until it fits */
  function fit(str, max, o) {
    if (width(str, o) <= max) return str;
    let s = String(str);
    while (s.length > 1 && width(s + '...', o) > max) s = s.slice(0, -1);
    return s + '...';
  }
  /* word wrap to a pixel width */
  function wrap(str, max, o) {
    const words = String(str).split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (width(t, o) > max && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  /* a block of wrapped text; returns the height used */
  function block(str, x, y, col, o) {
    o = o || {};
    const lh = o.lh || ((o.tiny ? KD.art.font.H3 : KD.art.font.H5) + 2);
    const lines = wrap(str, o.max || 200, o);
    const n = o.maxLines && lines.length > o.maxLines ? o.maxLines : lines.length;
    for (let i = 0; i < n; i++) {
      let l = lines[i];
      if (o.maxLines && i === n - 1 && lines.length > n) l = fit(l + '...', o.max, o);
      draw(l, x, y + i * lh, col, o);
    }
    return n * lh;
  }
  const H = (tiny) => (tiny ? KD.art.font.H3 : KD.art.font.H5);
  return { draw, width, block, wrap, fit, H };
})();
