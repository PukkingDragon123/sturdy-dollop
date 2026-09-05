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
  /* 240. This is the ZOOM control: fewer rows in the buffer means each one
     is drawn bigger, so the world comes closer and the sprites get larger on
     screen. 360 showed a lot of ocean but the 24x36 king was a thumbnail in
     it. At 240 he is a third of the frame's height and you can see his face.
     Tiles stay 8px, so this is 30 rows of world rather than 45. */
  const H = 240;
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
    /* Size to the STAGE, not to the window. They are the same thing when
       the game owns the whole page - the stage is inset:0 there - but the
       game also has to live in a panel on a page that has other things on
       it, and measuring the window in that case renders a canvas taller
       than the box it sits in. */
    const host = (out && out.parentNode && out.parentNode.getBoundingClientRect)
      ? out.parentNode.getBoundingClientRect() : null;
    const cw = Math.max(160, Math.round(host && host.width ? host.width : window.innerWidth));
    const ch = Math.max(120, Math.round(host && host.height ? host.height : window.innerHeight));
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

  /* CSS px -> internal px, for the mouse and touches.
     Off the canvas's own box rather than off the stage-relative offset:
     the events carry VIEWPORT coordinates, so subtracting an offset
     measured inside the stage only lines up while the stage happens to
     start at the top left of the window. */
  function toBuf(cx, cy) {
    if (out) {
      const r = out.getBoundingClientRect();
      if (r.width) return { x: (cx - r.left) / cssScale, y: (cy - r.top) / cssScale };
    }
    return { x: (cx - ox) / cssScale, y: (cy - oy) / cssScale };
  }

  /* ================================================================
     THE LENS

     The ocean used to be drawn straight into the frame at 1:1, and the
     castle cutscenes are 60-pixel characters in a 240-pixel frame while
     the ocean was a 36-pixel king in the same frame. Same buffer, half
     the size on screen - which is why the game looked lower-fidelity
     than its own cutscenes.

     So the world gets a lens. It is drawn into its own buffer at HALF
     the frame's size and blitted back over the frame at 2x: one
     drawImage, nearest neighbour, still perfectly square pixels. Tiles
     land at sixteen screen pixels, the king at 48x72, and the fish are
     big enough to have faces.

     Everything in the world phase reads KD.W and KD.H to cull and to
     pin edge markers, so the push swaps those too - inside the lens
     they ARE the world viewport. The HUD, the panels and the cutscene
     layer all draw after unlens(), at 1:1, so text stays crisp and the
     interface does not double in size with the world.
     ================================================================ */
  let lensBuf = null, lensCtx = null, zoom = 1;
  const stack = [];
  function lens(z) {
    z = Math.max(1, Math.round(z || 1));
    const w = Math.ceil(KD.W / z), h = Math.ceil(KD.H / z);
    if (!lensBuf) {
      lensBuf = document.createElement('canvas');
      lensCtx = lensBuf.getContext('2d', { alpha: false });
    }
    if (lensBuf.width !== w || lensBuf.height !== h) {
      lensBuf.width = w; lensBuf.height = h;
      lensCtx.imageSmoothingEnabled = false;
    }
    stack.push({ c: bctx, w: KD.W, h: KD.H, z: zoom });
    bctx = lensCtx; KD.W = w; KD.H = h; zoom = z;
    return lensCtx;
  }
  function unlens() {
    const p = stack.pop();
    if (!p) return;
    const z = zoom;
    bctx = p.c; KD.W = p.w; KD.H = p.h; zoom = p.z;
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(lensBuf, 0, 0, lensBuf.width, lensBuf.height,
                   0, 0, lensBuf.width * z, lensBuf.height * z);
  }

  /* ---- world-anchored, frame-scaled -------------------------------
     Letters. A speech bubble, a name plate or a prompt is pinned to
     somebody standing in the world, but it has to be drawn at 1:1 or it
     comes out of the lens at double size with four-pixel-tall type and
     half of it off the edge of the frame. defer() queues a draw until
     after unlens() and hands it the zoom it was queued at, so a caller
     can multiply its own coordinates up and otherwise not think about
     it. Outside a lens it just runs, with a zoom of 1.
     ---------------------------------------------------------------- */
  const later = [];
  function defer(fn) {
    if (zoom > 1) later.push({ fn: fn, z: zoom });
    else fn(1);
  }
  function flush() {
    if (!later.length) return;
    const q = later.slice();
    later.length = 0;
    for (const it of q) it.fn(it.z);
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
           lens, unlens, defer, flush,
           get scale() { return scale; }, get cssScale() { return cssScale; },
           get zoom() { return zoom; },
           get buf() { return buf; } };
})();
