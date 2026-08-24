/* ============================================================
   text.js - real font rendering, no bitmap tricks. One rounded
   system stack, drawn at device resolution.
   ============================================================ */
KA.T = (function () {
  const STACK = '"Trebuchet MS", "Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif';
  let m = null;
  function font(ctx, size, weight) { ctx.font = (weight || 700) + ' ' + size + 'px ' + STACK; }

  /* draw(ctx, str, x, y, col, o)
     o: size, weight, align, baseline, shadow, alpha, glow, max, spacing */
  function draw(ctx, str, x, y, col, o) {
    o = o || {};
    str = String(str == null ? '' : str);
    if (!str) return 0;
    const size = o.size || 12;
    ctx.save();
    font(ctx, size, o.weight);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'top';
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 10; }
    if (o.shadow) {
      ctx.fillStyle = o.shadow === true ? 'rgba(2,14,24,.6)' : o.shadow;
      ctx.fillText(str, x + (o.so || 1.2), y + (o.so || 1.2));
    }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || 3; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = col || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
    return width(ctx, str, size, o.weight);
  }
  function width(ctx, str, size, weight) {
    ctx.save(); font(ctx, size || 12, weight); const w = ctx.measureText(String(str)).width; ctx.restore();
    return w;
  }
  /* wrap by measured pixels, not characters */
  function wrapPx(ctx, str, size, maxW, weight) {
    const words = String(str).split(' '), lines = [];
    let line = '';
    ctx.save(); font(ctx, size, weight);
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    ctx.restore();
    if (line) lines.push(line);
    return lines;
  }
  /* trim a string with an ellipsis until it fits maxW */
  function fit(ctx, str, size, weight, maxW) {
    str = String(str);
    if (width(ctx, str, size, weight) <= maxW) return str;
    let s2 = str;
    while (s2.length > 1 && width(ctx, s2 + '...', size, weight) > maxW) s2 = s2.slice(0, -1);
    return s2 + '...';
  }
  function block(ctx, str, x, y, col, o) {
    o = o || {};
    let lines = wrapPx(ctx, str, o.size || 12, o.max || 200, o.weight);
    if (o.maxLines && lines.length > o.maxLines) {      // clip to what the box can show
      lines = lines.slice(0, o.maxLines);
      lines[o.maxLines - 1] = lines[o.maxLines - 1].replace(/[,.;:]?$/, '...');
    }
    lines.forEach((l, i) => draw(ctx, l, x, y + i * (o.lh || (o.size || 12) * 1.25), col, o));
    return lines.length * (o.lh || (o.size || 12) * 1.25);
  }
  return { draw, width, wrapPx, block, fit, STACK, font };
})();
