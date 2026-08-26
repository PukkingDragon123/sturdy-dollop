/* ============================================================
   screen.js - the low-res render target. Everything draws into
   a small offscreen canvas at integer coordinates, then that
   canvas is blitted once to the visible one at an INTEGER scale.
   That is what keeps the pixels square.
   ============================================================ */
KD.Screen = (function () {
  /* Internal resolution. Raising H makes the pixels smaller on screen and
     shows more world at once - that is what "higher resolution" buys here.
     Tiles stay 8px, so 288 tall shows 36 tile rows instead of 27. */
  /* 360 rather than 288: at any window whose height gives the same integer
     scale, this is nine more tile rows of world for free - the pixels stay
     exactly as big, there is just more frame. A 1280x720 window renders
     640x360 at 2x either way; the old 288 just letterboxed the difference
     away. */
  const H = 360;
  /* WMIN is what the UI still lays out in; going below it is worse than
     letterboxing. WMAX caps how much world one screen may show. */
  const WMIN = 384, WMAX = 832;

  let buf = null, bctx = null;        // the low-res target
  let out = null, octx = null;        // the on-page canvas
  let scale = 1, ox = 0, oy = 0;

  function attach(canvas) {
    out = canvas;
    octx = out.getContext('2d', { alpha: false });
    octx.imageSmoothingEnabled = false;
    buf = document.createElement('canvas');
    bctx = buf.getContext('2d', { alpha: false });
    bctx.imageSmoothingEnabled = false;
    fit();
  }

  let cssScale = 1;
  function fit() {
    const cw = Math.max(160, window.innerWidth);
    const ch = Math.max(120, window.innerHeight);
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    /* Scale is chosen against DEVICE pixels, not CSS pixels: a phone at
       390 CSS px wide with DPR 2 has 780 real pixels to play with, and
       picking the scale from 390 renders the game at 1x in a big frame.
       And the WIDTH follows from the scale, not from the window aspect -
       deriving w from the aspect and then flooring the scale threw away
       whatever did not divide evenly. A 1280x720 window got a 512-wide
       buffer at 2x, filling 1024 of 1280 px; a 390x844 portrait phone got
       416 at 1x, filling 208 of 390. Pick the largest scale whose leftover
       width is still a playable buffer, and use all of it. */
    const dw = cw * dpr, dh = ch * dpr;
    let w = WMIN;
    scale = 1;
    for (let sc = 8; sc >= 1; sc--) {
      if (H * sc > dh) continue;                       // too tall to fit
      const cand = Math.floor(dw / sc);
      if (cand < WMIN && sc > 1) continue;             // too narrow to play
      scale = sc;
      w = Math.max(WMIN, Math.min(WMAX, cand));
      break;
    }
    if (w & 1) w--;
    KD.W = w; KD.H = H;
    if (buf.width !== w || buf.height !== H) {
      buf.width = w; buf.height = H;
      bctx.imageSmoothingEnabled = false;
    }
    cssScale = scale / dpr;
    KD.scale = scale; KD.dpr = dpr; KD.cssScale = cssScale;
    out.width = w * scale;
    out.height = H * scale;
    /* the backing store is device pixels; CSS lays it out at the real size */
    out.style.width = (w * cssScale) + 'px';
    out.style.height = (H * cssScale) + 'px';
    octx.imageSmoothingEnabled = false;
    ox = Math.floor((cw - w * cssScale) / 2);
    oy = Math.floor((ch - H * cssScale) / 2);
    out.style.left = ox + 'px';
    out.style.top = oy + 'px';
  }

  /* CSS px -> internal px, for the mouse and touches */
  function toBuf(cx, cy) {
    return { x: (cx - ox) / cssScale, y: (cy - oy) / cssScale };
  }

  function present() {
    octx.imageSmoothingEnabled = false;
    octx.drawImage(buf, 0, 0, KD.W, KD.H, 0, 0, KD.W * scale, KD.H * scale);
  }

  const ctx = () => bctx;
  /* solid fill, the only "primitive" the engine needs besides blit */
  function clear(col) {
    bctx.fillStyle = KD.PAL.hex(col === undefined ? 'DEEP.0' : col);
    bctx.fillRect(0, 0, KD.W, KD.H);
  }
  function rect(x, y, w, h, col) {
    bctx.fillStyle = typeof col === 'string' && col[0] === '#' ? col : KD.PAL.hex(col);
    bctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  /* a 1px hollow box */
  function frame(x, y, w, h, col) {
    rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, col);
    rect(x, y + 1, 1, h - 2, col); rect(x + w - 1, y + 1, 1, h - 2, col);
  }
  /* Bresenham, because there is no lineTo in a pixel game either */
  function line(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    /* An axis-aligned line is one rect, not one rect per pixel. The skill
       tree draws its whole prerequisite graph out of vertical and
       horizontal runs, which was thousands of 1x1 fills a frame. */
    if (y0 === y1) { rect(Math.min(x0, x1), y0, Math.abs(x1 - x0) + 1, 1, col); return; }
    if (x0 === x1) { rect(x0, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, col); return; }
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      rect(x0, y0, 1, 1, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  return { attach, fit, toBuf, present, ctx, clear, rect, frame, line,
           get scale() { return scale; }, get cssScale() { return cssScale; },
           get buf() { return buf; } };
})();
