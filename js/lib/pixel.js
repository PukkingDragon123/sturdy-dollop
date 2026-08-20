/* ============================================================
   pixel.js - tiny sprite engine.
   Sprites are authored as arrays of strings + a palette map, so all
   the art lives in source (no image files, no loading, no CORS).
   Every sprite is baked to an offscreen canvas once and cached;
   palette swaps (dolphin colours, evil morphs, fish species) are
   just another cache key.
   ============================================================ */
DZ.Pixel = (function () {
  const defs = {};
  const cache = new Map();

  function define(name, def) {
    const rows = def.rows.slice();
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    for (let i = 0; i < rows.length; i++) while (rows[i].length < w) rows[i] += '.';
    defs[name] = { pal: def.pal, rows, w, h: rows.length };
    return name;
  }

  function has(name) { return !!defs[name]; }
  function size(name) {
    const d = defs[name];
    return d ? { w: d.w, h: d.h } : { w: 0, h: 0 };
  }

  function bake(name, recolor) {
    const d = defs[name];
    if (!d) return null;
    const c = document.createElement('canvas');
    c.width = d.w; c.height = d.h;
    const g = c.getContext('2d');
    for (let y = 0; y < d.h; y++) {
      const row = d.rows[y];
      for (let x = 0; x < row.length; x++) {
        const k = row[x];
        if (k === '.' || k === ' ') continue;
        let col = (recolor && recolor[k]) || d.pal[k];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function get(name, recolor) {
    let key = name;
    if (recolor) { key += '|'; for (const k in recolor) key += k + recolor[k]; }
    let c = cache.get(key);
    if (c === undefined) { c = bake(name, recolor); cache.set(key, c); }
    return c;
  }

  // solid-colour silhouette, for hit flashes and shadows
  function silhouette(name, color, recolor) {
    const key = 'SIL' + name + color + (recolor ? JSON.stringify(recolor) : '');
    let c = cache.get(key);
    if (c !== undefined) return c;
    const src = get(name, recolor);
    if (!src) { cache.set(key, null); return null; }
    c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    cache.set(key, c);
    return c;
  }

  /* draw(ctx, name, x, y, opts)
     opts: flipX, flipY, scale, sx, sy (independent squash), alpha, rot,
           center (x,y are the sprite centre), recolor, flash (colour) */
  function draw(ctx, name, x, y, opts) {
    opts = opts || {};
    const img = opts.flash ? silhouette(name, opts.flash, opts.recolor) : get(name, opts.recolor);
    if (!img) return;
    const s = opts.scale === undefined ? 1 : opts.scale;
    const sx = (opts.sx === undefined ? 1 : opts.sx) * s * (opts.flipX ? -1 : 1);
    const sy = (opts.sy === undefined ? 1 : opts.sy) * s * (opts.flipY ? -1 : 1);
    const a = opts.alpha === undefined ? 1 : opts.alpha;
    const plain = sx === 1 && sy === 1 && !opts.rot;
    if (a !== 1) ctx.globalAlpha = a;
    if (plain) {
      const px = opts.center ? Math.round(x - img.width / 2) : Math.round(x);
      const py = opts.center ? Math.round(y - img.height / 2) : Math.round(y);
      ctx.drawImage(img, px, py);
    } else {
      ctx.save();
      const cx = opts.center ? x : x + img.width / 2;
      const cy = opts.center ? y : y + img.height / 2;
      ctx.translate(Math.round(cx), Math.round(cy));
      if (opts.rot) ctx.rotate(opts.rot);
      ctx.scale(sx, sy);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
    if (a !== 1) ctx.globalAlpha = 1;
  }

  // --- plain drawing helpers on the low-res buffer -------------
  function rect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function frame(ctx, x, y, w, h, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  }
  function disc(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    x = Math.round(x); y = Math.round(y); r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(x - dx, y + dy, dx * 2 + 1, 1);
    }
  }
  function ring(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    x = Math.round(x); y = Math.round(y);
    let px = -1;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      ctx.fillRect(x - dx, y + dy, 1, 1);
      ctx.fillRect(x + dx, y + dy, 1, 1);
      if (px >= 0 && Math.abs(dx - px) > 1) {
        const lo = Math.min(dx, px), hi = Math.max(dx, px);
        ctx.fillRect(x - hi, y + dy, hi - lo, 1);
        ctx.fillRect(x + lo, y + dy, hi - lo, 1);
      }
      px = dx;
    }
  }
  function line(ctx, x0, y0, x1, y1, col) {
    ctx.fillStyle = col;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, guard = 0;
    while (guard++ < 2000) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  // vertical dithered gradient - cheap, very "pixel"
  const DITHER = [
    [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
  ];
  function vgrad(ctx, x, y, w, h, top, bottom, steps) {
    steps = steps || 8;
    const t = hex(top), b = hex(bottom);
    const bandH = Math.ceil(h / steps);
    for (let i = 0; i < steps; i++) {
      const f = i / (steps - 1 || 1);
      const col = rgb(
        Math.round(t[0] + (b[0] - t[0]) * f),
        Math.round(t[1] + (b[1] - t[1]) * f),
        Math.round(t[2] + (b[2] - t[2]) * f));
      rect(ctx, x, y + i * bandH, w, bandH, col);
    }
  }
  function hex(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function rgb(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return rgb(Math.round(A[0] + (B[0] - A[0]) * t), Math.round(A[1] + (B[1] - A[1]) * t), Math.round(A[2] + (B[2] - A[2]) * t));
  }
  function shade(c, amt) { return mix(c, amt < 0 ? '#000000' : '#ffffff', Math.abs(amt)); }

  return { define, has, size, get, silhouette, draw, rect, frame, disc, ring, line, vgrad, mix, shade, rgb, hex, DITHER };
})();
