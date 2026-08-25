/* ============================================================
   world/light.js - tile lighting by flood fill, not a shader.
   Sunlight pours in from the top and dies with depth; torches,
   glowpods and lava push light back. The renderer turns the
   level into one of 8 dither steps, so light looks hand-drawn.
   ============================================================ */
KD.Light = (function () {
  const MAX = 15;                     // levels; 0 is pitch black
  const SUN_TOP = 15;
  let q = null, qh = 0, qt = 0;       // ring-buffer flood queue
  let pending = null;                 // tiles whose neighbourhood changed
  let W = 0, H = 0;

  function init() {
    const Wd = KD.World;
    W = Wd.W; H = Wd.H;
    /* The flood queue is a ring. If more entries are pushed than it can hold,
       it overwrites work that has not been done yet and the fill can chase its
       own tail forever. Give it real headroom AND a hard budget, because a
       1.2M-tile world seeds hundreds of thousands of entries at once. */
    q = new Int32Array(Math.min(6e6, W * H * 2));
    pending = new Set();
    full();
  }

  /* Two different costs, and conflating them is a bug worth naming:
     sunCost is what a vertical sunbeam pays to pass through a tile - open
     water pays nothing, that is why the sea is bright near the top.
     spreadCost is what light pays to travel sideways from a source, and there
     open water must cost something or a torch would light the whole ocean. */
  function sunCost(t) {
    const T = KD.Tiles.get(t);
    if (!T) return MAX;
    if (!T.solid) return 0;
    return T.clear ? 3 : MAX;         // glass dims, rock stops it dead
  }
  function cost(t) {
    const T = KD.Tiles.get(t);
    if (!T) return 4;
    if (!T.solid) return 1;
    return T.clear ? 2 : 4;
  }

  let dropped = 0;
  function push(i, v) {
    const lit = KD.World.lit;
    if (lit[i] >= v) return;
    lit[i] = v;
    const nxt = qt + 1 >= q.length ? 0 : qt + 1;
    if (nxt === qh) { dropped++; return; }      // full: drop rather than corrupt
    q[qt] = i;
    qt = nxt;
  }

  /* rebuild the whole map: seed the sky column, seed every emitter, flood */
  function full() {
    const Wd = KD.World, lit = Wd.lit, fg = Wd.fg;
    lit.fill(0);
    qh = qt = 0; dropped = 0;
    /* sunlight: walk down each column until something opaque stops it */
    for (let x = 0; x < W; x++) {
      let v = SUN_TOP;
      for (let y = 0; y < H; y++) {
        const i = y * W + x;
        if (v > 0) push(i, v);
        v -= sunCost(fg[i]);
        /* open water dims slowly: full daylight in the shallows, gone by the
           bottom of the reef. Below that you bring your own light. */
        if (y > 34 && y % 5 === 0) v--;
        if (v <= 0) { v = 0; break; }
      }
    }
    for (let i = 0; i < fg.length; i++) {
      const e = KD.Tiles.light(fg[i]);
      if (e) push(i, Math.min(MAX, e * 2));
    }
    /* Ambient floor: the sunlit layers never go fully black, or the seabed
       right under a bright surface reads as a hole in the world. It fades out
       by the bottom of the reef, and below that darkness is the point.
       Written straight into the buffer, NOT queued - these need no spreading
       and half a million queue entries is what overran the ring. */
    for (let y = 0; y < H; y++) {
      const amb = y < 60 ? 5 : y < 100 ? 4 : y < 140 ? 2 : 0;
      if (!amb) continue;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (lit[i] < amb) lit[i] = amb;
      }
    }
    flood(W * H * 3);
    if (dropped) console.warn('light: ' + dropped + ' queue entries dropped');
  }

  /* spread until the queue drains or we hit the budget */
  function flood(budget) {
    const Wd = KD.World, lit = Wd.lit, fg = Wd.fg;
    let n = 0;
    while (qh !== qt && n++ < budget) {
      const i = q[qh++];
      if (qh >= q.length) qh = 0;
      const v = lit[i];
      if (v <= 1) continue;
      const x = i % W, y = (i / W) | 0;
      if (x > 0)     push(i - 1, v - cost(fg[i - 1]));
      if (x < W - 1) push(i + 1, v - cost(fg[i + 1]));
      if (y > 0)     push(i - W, v - cost(fg[i - W]));
      if (y < H - 1) push(i + W, v - cost(fg[i + W]));
    }
    return n;
  }

  /* a tile changed: relight its neighbourhood next frame */
  function touch(x, y) { if (pending) pending.add((y << 12) | x); }

  /* local relight: clear a box, reseed its border and emitters, reflood.
     Cheap enough to run every frame while the player is digging. */
  function step() {
    if (!pending || !pending.size) return;
    const Wd = KD.World, lit = Wd.lit, fg = Wd.fg;
    const R = 16;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const k of pending) {
      const x = k & 0xfff, y = k >> 12;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    pending.clear();
    x0 = Math.max(0, x0 - R); y0 = Math.max(0, y0 - R);
    x1 = Math.min(W - 1, x1 + R); y1 = Math.min(H - 1, y1 + R);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) lit[y * W + x] = 0;
    qh = qt = 0;
    /* reseed: the border ring, the sky if the box touches it, and emitters */
    for (let y = y0; y <= y1; y++) {
      if (x0 > 0) push(y * W + x0 - 1, lit[y * W + x0 - 1]);
      if (x1 < W - 1) push(y * W + x1 + 1, lit[y * W + x1 + 1]);
    }
    for (let x = x0; x <= x1; x++) {
      if (y0 > 0) push((y0 - 1) * W + x, lit[(y0 - 1) * W + x]);
      if (y1 < H - 1) push((y1 + 1) * W + x, lit[(y1 + 1) * W + x]);
      if (y0 === 0) push(x, SUN_TOP);
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x, e = KD.Tiles.light(fg[i]);
      if (e) push(i, Math.min(MAX, e * 2));
    }
    flood(120000);
    for (let cy = y0; cy <= y1; cy += 8) for (let cx = x0; cx <= x1; cx += 8) Wd.markChunk(cx, cy);
    Wd.markChunk(x1, y1);
  }

  /* a moving light (the player's torch) - applied at draw time, not stored */
  return { MAX, init, full, step, touch, cost, sunCost };
})();
