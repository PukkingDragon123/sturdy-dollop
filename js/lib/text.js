/* ============================================================
   text.js - crisp "pixel" text.
   Renders system monospace at tiny sizes into an offscreen buffer,
   hard-thresholds the alpha so there is zero anti-aliasing, then
   caches the resulting bitmap. Upscaled by the main canvas it looks
   like a proper bitmap font without shipping font data.
   ============================================================ */
DZ.Text = (function () {
  const scratch = document.createElement('canvas');
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const MAX = 900;
  const metrics = {};
  const FONT = (s, bold) => (bold ? 'bold ' : '') + s + 'px "Courier New", "DejaVu Sans Mono", monospace';

  const SC = () => (DZ.SC || 1);
  // native pixel width of one character cell at a design-space size
  function charWnative(size, bold) {
    const k = size + (bold ? 'b' : '');
    if (metrics[k] === undefined) {
      sctx.font = FONT(size, bold);
      metrics[k] = Math.max(3, Math.round(sctx.measureText('M').width));
    }
    return metrics[k];
  }
  function charW(size, bold) { return charWnative((size || 8) * SC(), bold) / SC(); }
  function width(str, size, bold) { return String(str).length * charW(size || 8, bold); }

  function bake(str, size, color, bold) {
    const cw = charWnative(size, bold);
    const w = Math.max(1, str.length * cw + 2);
    const h = size + 4;
    scratch.width = w; scratch.height = h;
    sctx.clearRect(0, 0, w, h);
    sctx.font = FONT(size, bold);
    sctx.textBaseline = 'top';
    sctx.fillStyle = '#fff';
    // draw char-by-char on a fixed grid => stable monospace layout everywhere
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === ' ') continue;
      sctx.fillText(ch, i * cw + 1, 1);
    }
    const img = sctx.getImageData(0, 0, w, h);
    const d = img.data;
    const cr = parseInt(color.slice(1, 3), 16), cg = parseInt(color.slice(3, 5), 16), cb = parseInt(color.slice(5, 7), 16);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 96) { d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = 255; }
      else { d[i + 3] = 0; }
    }
    sctx.putImageData(img, 0, 0);
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    out.getContext('2d').drawImage(scratch, 0, 0);
    return out;
  }

  function bitmap(str, size, color, bold) {
    const key = size + '|' + color + '|' + (bold ? 1 : 0) + '|' + str;
    let bm = cache.get(key);
    if (!bm) {
      if (cache.size > MAX) cache.clear();
      bm = bake(str, size, color, bold);
      cache.set(key, bm);
    }
    return bm;
  }

  /* draw(ctx, str, x, y, color, opts)
     opts: size, align ('left'|'center'|'right'), bold, shadow (color), alpha */
  function draw(ctx, str, x, y, color, opts) {
    str = String(str == null ? '' : str);
    if (!str.length) return 0;
    opts = opts || {};
    const size = opts.size || 8;
    const bold = !!opts.bold;
    const sc = SC();
    const bm = bitmap(str, size * sc, color || '#ffffff', bold);
    const dw = bm.width / sc;
    let px = x;
    if (opts.align === 'center') px = x - dw / 2;
    else if (opts.align === 'right') px = x - dw;
    const a = opts.alpha === undefined ? 1 : opts.alpha;
    if (a !== 1) ctx.globalAlpha = a;
    // blit at 1:1 device pixels so glyphs stay razor sharp, but keep whatever
    // camera translation the scene has applied
    const T = ctx.getTransform ? ctx.getTransform() : null;
    if (T) {
      const dx = Math.round(T.a * px + T.c * y + T.e);
      const dy = Math.round(T.b * px + T.d * y + T.f);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (opts.shadow) {
        const sh = bitmap(str, size * sc, opts.shadow === true ? '#04121f' : opts.shadow, bold);
        ctx.drawImage(sh, dx + sc, dy + sc);
      }
      ctx.drawImage(bm, dx, dy);
      ctx.restore();
    } else {
      ctx.drawImage(bm, Math.round(px), Math.round(y), dw, bm.height / sc);
    }
    if (a !== 1) ctx.globalAlpha = 1;
    return dw;
  }

  return { draw, width, charW, bitmap };
})();
