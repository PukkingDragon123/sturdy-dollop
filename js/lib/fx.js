/* ============================================================
   fx.js - the juice: particles, screen shake, hit-stop,
   floating text, flashes, spring camera.
   ============================================================ */
DZ.FX = (function () {
  const U = DZ.Util;
  let parts = [];
  let shakeAmt = 0, shakeT = 0;
  let stop = 0;            // hit-stop timer (freezes gameplay, not UI)
  let flashCol = null, flashT = 0, flashMax = 0;
  let slow = 1;            // time scale

  function reset() { parts.length = 0; shakeAmt = 0; stop = 0; flashT = 0; slow = 1; }

  function spawn(p) {
    if (parts.length > 900) parts.shift();
    parts.push(p);
    return p;
  }

  function part(x, y, opts) {
    opts = opts || {};
    return spawn({
      k: opts.k || 'dot',
      x, y,
      vx: opts.vx || 0, vy: opts.vy || 0,
      g: opts.g === undefined ? 0 : opts.g,
      drag: opts.drag === undefined ? 0.9 : opts.drag,
      life: opts.life || 0.5, max: opts.life || 0.5,
      col: opts.col || '#ffffff',
      col2: opts.col2 || null,
      r: opts.r === undefined ? 1 : opts.r,
      r2: opts.r2 === undefined ? 0 : opts.r2,
      txt: opts.txt || null,
      size: opts.size || 8,
      rise: opts.rise === undefined ? 0 : opts.rise,
      screen: !!opts.screen,
      spin: opts.spin || 0, rot: opts.rot || 0,
      wob: opts.wob || 0, seed: Math.random() * 100,
      sprite: opts.sprite || null, recolor: opts.recolor || null,
      fade: opts.fade === undefined ? true : opts.fade
    });
  }

  // ---- presets -------------------------------------------------
  function bubbles(x, y, n, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      part(x + U.rnd(-3, 3), y + U.rnd(-3, 3), {
        k: 'bubble',
        vx: (opts.vx || 0) + U.rnd(-14, 14),
        vy: (opts.vy || 0) - U.rnd(6, 26),
        drag: 0.5, life: U.rnd(0.5, 1.4),
        r: U.rndInt(1, opts.big ? 3 : 2),
        col: opts.col || '#bfeaff', wob: U.rnd(6, 20)
      });
    }
  }
  function burst(x, y, n, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const a = opts.dir !== undefined ? opts.dir + U.rnd(-0.9, 0.9) : U.rnd(0, Math.PI * 2);
      const sp = U.rnd(opts.minSpeed || 30, opts.speed || 110);
      part(x, y, {
        k: opts.k || 'dot',
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        drag: opts.drag === undefined ? 0.06 : opts.drag,
        g: opts.g || 0,
        life: U.rnd(0.25, opts.life || 0.6),
        r: opts.r === undefined ? U.rndInt(1, 2) : opts.r,
        col: Array.isArray(opts.col) ? U.pick(opts.col) : (opts.col || '#ffe27a')
      });
    }
  }
  function pop(x, y, col) {
    burst(x, y, 10, { col: col || ['#ffffff', '#bfeaff', '#7fd4ff'], speed: 90, drag: 0.04 });
    ringWave(x, y, 2, 14, col || '#cfefff', 0.28);
  }
  function ringWave(x, y, r0, r1, col, life) {
    part(x, y, { k: 'ring', r: r0, r2: r1, life: life || 0.35, col: col || '#ffffff', drag: 1 });
  }
  function text(x, y, str, col, opts) {
    opts = opts || {};
    return part(x, y, {
      k: 'text', txt: str, col: col || '#ffffff', col2: opts.shadow || '#04121f',
      life: opts.life || 0.9, vy: opts.vy === undefined ? -26 : opts.vy, vx: opts.vx || 0,
      drag: 0.02, size: opts.size || 8, screen: !!opts.screen, g: opts.g || 0
    });
  }
  function chunks(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      part(x, y, {
        k: 'chunk', vx: U.rnd(-70, 70), vy: U.rnd(-80, 20), g: 60, drag: 0.2,
        life: U.rnd(0.4, 0.9), r: U.rndInt(1, 2), col: Array.isArray(col) ? U.pick(col) : col,
        spin: U.rnd(-8, 8)
      });
    }
  }
  function sprite(x, y, name, opts) {
    opts = opts || {};
    return part(x, y, {
      k: 'sprite', sprite: name, recolor: opts.recolor,
      vx: opts.vx || 0, vy: opts.vy || 0, g: opts.g || 0, drag: opts.drag === undefined ? 0.2 : opts.drag,
      life: opts.life || 0.8, spin: opts.spin || 0, rot: opts.rot || 0, col: '#fff'
    });
  }

  function shake(a) { shakeAmt = Math.max(shakeAmt, a); shakeT = 0.001; }
  function hitstop(t) { stop = Math.max(stop, t); }
  function flash(col, t) { flashCol = col; flashT = t || 0.15; flashMax = flashT; }
  function timeScale(s, t) { slow = s; slowT = t || 0; }
  let slowT = 0;

  function update(dt) {
    if (stop > 0) stop = Math.max(0, stop - dt);
    if (slowT > 0) { slowT -= dt; if (slowT <= 0) slow = 1; }
    shakeAmt *= Math.pow(0.0025, dt);
    if (shakeAmt < 0.05) shakeAmt = 0;
    if (flashT > 0) flashT -= dt;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag < 1) { const f = Math.pow(p.drag, dt); p.vx *= f; p.vy *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wob) p.x += Math.sin((p.seed + p.life * 6)) * p.wob * dt;
      if (p.spin) p.rot += p.spin * dt;
    }
  }

  function drawOne(ctx, p) {
    const t = p.life / p.max;
    const a = p.fade ? U.clamp(t * 1.6, 0, 1) : 1;
    if (p.k === 'text') {
      DZ.Text.draw(ctx, p.txt, p.x, p.y, p.col, { align: 'center', size: p.size, shadow: p.col2, alpha: a, bold: p.size > 9 });
      return;
    }
    if (p.k === 'ring') {
      const r = U.lerp(p.r, p.r2, 1 - t);
      ctx.globalAlpha = a * 0.9;
      DZ.Pixel.ring(ctx, p.x, p.y, Math.max(1, Math.round(r)), p.col);
      ctx.globalAlpha = 1;
      return;
    }
    if (p.k === 'sprite') {
      DZ.Pixel.draw(ctx, p.sprite, p.x, p.y, { center: true, alpha: a, rot: p.rot, recolor: p.recolor });
      return;
    }
    if (p.k === 'bubble') {
      ctx.globalAlpha = a * 0.75;
      DZ.Pixel.ring(ctx, p.x, p.y, p.r, p.col);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = a;
    const s = p.k === 'chunk' ? p.r + 1 : p.r;
    DZ.Pixel.rect(ctx, p.x - s / 2, p.y - s / 2, s, s, p.col);
    ctx.globalAlpha = 1;
  }

  function drawWorld(ctx) { for (const p of parts) if (!p.screen) drawOne(ctx, p); }
  function drawScreen(ctx) {
    for (const p of parts) if (p.screen) drawOne(ctx, p);
    if (flashT > 0 && flashCol) {
      ctx.globalAlpha = U.clamp(flashT / flashMax, 0, 1) * 0.55;
      DZ.Pixel.rect(ctx, 0, 0, DZ.W, DZ.H, flashCol);
      ctx.globalAlpha = 1;
    }
  }
  function shakeOffset() {
    if (shakeAmt <= 0) return { x: 0, y: 0 };
    return { x: Math.round(U.rnd(-shakeAmt, shakeAmt)), y: Math.round(U.rnd(-shakeAmt, shakeAmt)) };
  }
  const frozen = () => stop > 0;
  const scale = () => slow;

  return { part, bubbles, burst, pop, ringWave, text, chunks, sprite, shake, hitstop, flash,
           timeScale, update, drawWorld, drawScreen, shakeOffset, frozen, scale, reset,
           count: () => parts.length };
})();

/* spring camera with look-ahead */
DZ.Camera = function (w, h, worldW, worldH) {
  this.x = 0; this.y = 0; this.tx = 0; this.ty = 0;
  this.w = w; this.h = h; this.worldW = worldW; this.worldH = worldH;
  this.follow = function (px, py, vx, vy, dt, lead) {
    lead = lead === undefined ? 0.28 : lead;
    this.tx = px + (vx || 0) * lead - this.w / 2;
    this.ty = py + (vy || 0) * lead - this.h / 2;
    this.tx = DZ.Util.clamp(this.tx, 0, Math.max(0, this.worldW - this.w));
    this.ty = DZ.Util.clamp(this.ty, 0, Math.max(0, this.worldH - this.h));
    this.x = DZ.Util.damp(this.x, this.tx, 0.0009, dt);
    this.y = DZ.Util.damp(this.y, this.ty, 0.0009, dt);
  };
  this.snap = function () { this.x = this.tx; this.y = this.ty; };
  this.apply = function (ctx) {
    const s = DZ.FX.shakeOffset();
    ctx.translate(-Math.round(this.x) + s.x, -Math.round(this.y) + s.y);
  };
};
