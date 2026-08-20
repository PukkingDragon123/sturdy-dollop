/* ============================================================
   water.js - shared underwater backdrop bits: gradients, light
   shafts, marine snow, kelp, sand, surface waves, vignette.
   ============================================================ */
DZ.Water = (function () {
  const U = DZ.Util, Px = DZ.Pixel;
  let t = 0;
  const snow = [];
  for (let i = 0; i < 70; i++) {
    snow.push({ x: U.rnd(0, DZ.W), y: U.rnd(0, DZ.H), s: U.rnd(3, 12), r: U.chance(0.25) ? 2 : 1, a: U.rnd(0.15, 0.5) });
  }
  function tick(dt) { t += dt; }

  function gradient(ctx, top, bot, x, y, w, h) {
    Px.vgrad(ctx, x || 0, y || 0, w || DZ.W, h || DZ.H, top, bot, 10);
  }

  /* god rays from the surface */
  function shafts(ctx, n, alpha, col, speed, y0, h) {
    n = n || 5;
    y0 = y0 || 0; h = h === undefined ? DZ.H : h;
    ctx.globalAlpha = alpha === undefined ? 0.06 : alpha;
    for (let i = 0; i < n; i++) {
      const ph = i * 2.3;
      const x = ((i / n) * DZ.W + Math.sin(t * (speed || 0.12) + ph) * 22 + DZ.W) % DZ.W;
      const w = 8 + Math.sin(t * 0.4 + ph) * 4;
      for (let k = 0; k < 3; k++) {
        Px.rect(ctx, x + k * 3 - w / 2, y0, Math.max(1, w / 2 - k), h, col || '#bfeaff');
      }
    }
    ctx.globalAlpha = 1;
  }

  /* drifting motes - cheap depth cue */
  function marineSnow(ctx, camX, camY, dt) {
    for (const s of snow) {
      s.y += s.s * (dt || 0);
      s.x += Math.sin(t * 0.6 + s.y * 0.05) * 6 * (dt || 0);
      if (s.y > DZ.H) { s.y = -2; s.x = U.rnd(0, DZ.W); }
      ctx.globalAlpha = s.a;
      Px.rect(ctx, s.x, s.y, s.r, s.r, '#dff6ff');
    }
    ctx.globalAlpha = 1;
  }

  /* animated surface: chunky waves + bright rim */
  function surface(ctx, y, col, hi) {
    for (let x = 0; x < DZ.W; x += 2) {
      const h = Math.round(Math.sin(x * 0.09 + t * 1.7) * 2 + Math.sin(x * 0.031 - t * 1.1) * 2);
      Px.rect(ctx, x, y + h, 2, 3, hi || '#cdf3ff');
      Px.rect(ctx, x, y + h + 3, 2, DZ.H, col || 'rgba(0,0,0,0)');
    }
  }
  function surfaceLine(ctx, y) {
    for (let x = 0; x < DZ.W; x += 2) {
      const h = Math.round(Math.sin(x * 0.09 + t * 1.7) * 2 + Math.sin(x * 0.031 - t * 1.1) * 2);
      Px.rect(ctx, x, y + h, 2, 1, '#dff6ff');
      ctx.globalAlpha = 0.35;
      Px.rect(ctx, x, y + h + 1, 2, 2, '#9fe0ff');
      ctx.globalAlpha = 1;
    }
  }

  /* sand / rubble floor with a wobbly top edge */
  function ground(ctx, y, w, colTop, colBody, seed, depth) {
    seed = seed || 0;
    depth = (depth || Math.max(4, DZ.H - y)) + 10;   // slack so the wobble never exposes the background
    for (let x = 0; x < (w || DZ.W); x += 1) {
      const h = Math.round(Math.sin((x + seed) * 0.07) * 2 + Math.sin((x + seed) * 0.021) * 3);
      Px.rect(ctx, x, y + h, 1, 2, colTop || '#e9d9a8');
      Px.rect(ctx, x, y + h + 2, 1, depth, colBody || '#c2ab72');
      if ((x + seed) % 17 === 0) Px.rect(ctx, x, y + h + 4 + ((x * 7) % 9), 2, 1, '#00000022');
    }
  }

  /* a swaying kelp stalk, drawn from the floor up */
  function kelp(ctx, x, groundY, h, seed, col, col2) {
    const segs = Math.floor(h / 4);
    let px = x;
    for (let i = 0; i < segs; i++) {
      const y = groundY - i * 4;
      const sway = Math.sin(t * 1.1 + seed + i * 0.42) * (i * 0.42);
      const cx = x + sway;
      Px.rect(ctx, cx - 1, y - 4, 3, 5, i % 2 ? (col || '#2f8f4c') : (col2 || '#39ab5c'));
      if (i % 3 === 1) Px.rect(ctx, cx + 2, y - 3, 3, 2, col2 || '#4fc873');
      if (i % 3 === 2) Px.rect(ctx, cx - 4, y - 3, 3, 2, col2 || '#4fc873');
      px = cx;
    }
    Px.draw(ctx, 'kelpbulb', px - 2, groundY - h - 4, {});
  }

  function vignette(ctx, amt, col) {
    if (!amt) return;
    ctx.globalAlpha = amt;
    const c = col || '#020a12';
    for (let i = 0; i < 6; i++) {
      const a = (6 - i) / 12;
      ctx.globalAlpha = amt * a;
      Px.rect(ctx, 0, i, DZ.W, 1, c);
      Px.rect(ctx, 0, DZ.H - 1 - i, DZ.W, 1, c);
      Px.rect(ctx, i, 0, 1, DZ.H, c);
      Px.rect(ctx, DZ.W - 1 - i, 0, 1, DZ.H, c);
    }
    ctx.globalAlpha = 1;
  }

  /* caustic ripples on the floor */
  function caustics(ctx, y, h, alpha) {
    ctx.globalAlpha = alpha === undefined ? 0.08 : alpha;
    for (let x = 0; x < DZ.W; x += 6) {
      const o = Math.sin(x * 0.11 + t * 1.4) * 3;
      Px.rect(ctx, x + o, y, 3, 1, '#dff6ff');
      Px.rect(ctx, x + o + 2, y + 3, 2, 1, '#dff6ff');
    }
    ctx.globalAlpha = 1;
  }

  return { tick, gradient, shafts, marineSnow, surface, surfaceLine, ground, kelp, vignette, caustics,
           get t() { return t; } };
})();
