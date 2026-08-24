/* ============================================================
   fx.js - particles, shake, hit-stop, floating text, flashes.
   All vector, all soft-edged.
   ============================================================ */
KA.FX = (function () {
  const U = KA.U, D = KA.D;
  let parts = [], shakeAmt = 0, stop = 0, flashCol = null, flashT = 0, flashMax = 0;

  function reset() { parts.length = 0; shakeAmt = 0; stop = 0; flashT = 0; }

  function part(x, y, o) {
    o = o || {};
    if (parts.length > 700) parts.shift();
    const p = {
      k: o.k || 'dot', x, y, vx: o.vx || 0, vy: o.vy || 0,
      g: o.g || 0, drag: o.drag === undefined ? 0.1 : o.drag,
      life: o.life || 0.6, max: o.life || 0.6,
      r: o.r === undefined ? 3 : o.r, r2: o.r2 || 0,
      col: o.col || '#fff', col2: o.col2 || null,
      txt: o.txt || null, size: o.size || 14, screen: !!o.screen,
      rot: o.rot || 0, spin: o.spin || 0, wob: o.wob || 0, seed: Math.random() * 90,
      glow: !!o.glow
    };
    parts.push(p);
    return p;
  }
  function bubbles(x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      part(x + U.rnd(-4, 4), y + U.rnd(-4, 4), {
        k: 'bubble', vx: (o.vx || 0) + U.rnd(-16, 16), vy: (o.vy === undefined ? -U.rnd(10, 34) : o.vy),
        drag: 0.5, life: U.rnd(0.6, 1.6), r: U.rnd(1.4, o.big ? 4.5 : 3), col: o.col || '#cdeeff', wob: U.rnd(8, 26)
      });
    }
  }
  function burst(x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = o.dir !== undefined ? o.dir + U.rnd(-(o.spread || 0.9), (o.spread || 0.9)) : U.rnd(0, 6.283);
      const sp = U.rnd(o.minSpeed || 40, o.speed || 150);
      part(x, y, {
        k: o.k || 'dot', vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        drag: o.drag === undefined ? 0.06 : o.drag, g: o.g || 0,
        life: U.rnd(0.25, o.life || 0.7), r: o.r === undefined ? U.rnd(1.5, 3.5) : o.r,
        col: Array.isArray(o.col) ? U.pick(o.col) : (o.col || '#ffe27a'), glow: o.glow
      });
    }
  }
  function ring(x, y, r0, r1, col, life) { part(x, y, { k: 'ring', r: r0, r2: r1, life: life || 0.4, col, drag: 1 }); }
  function text(x, y, str, col, o) {
    o = o || {};
    return part(x, y, { k: 'text', txt: str, col, life: o.life || 1, vy: o.vy === undefined ? -34 : o.vy,
      vx: o.vx || 0, drag: 0.02, size: o.size || 15, screen: !!o.screen, g: o.g || 0 });
  }
  function chunks(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      part(x, y, { k: 'chunk', vx: U.rnd(-90, 90), vy: U.rnd(-110, 20), g: 130, drag: 0.25,
        life: U.rnd(0.5, 1.1), r: U.rnd(2, 4), col: Array.isArray(col) ? U.pick(col) : col, spin: U.rnd(-9, 9) });
    }
  }
  const shake = (a) => { shakeAmt = Math.max(shakeAmt, a); };
  const hitstop = (t) => { stop = Math.max(stop, t); };
  const flash = (c, t) => { flashCol = c; flashT = t || 0.16; flashMax = flashT; };

  function update(dt) {
    if (stop > 0) stop = Math.max(0, stop - dt);
    shakeAmt *= Math.pow(0.0022, dt);
    if (shakeAmt < 0.06) shakeAmt = 0;
    if (flashT > 0) flashT -= dt;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag < 1) { const f = Math.pow(p.drag, dt); p.vx *= f; p.vy *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.wob) p.x += Math.sin(p.seed + p.life * 7) * p.wob * dt;
      if (p.spin) p.rot += p.spin * dt;
    }
  }

  function one(ctx, p) {
    const t = p.life / p.max, a = U.clamp(t * 1.7, 0, 1);
    if (p.k === 'text') {
      KA.T.draw(ctx, p.txt, p.x, p.y, p.col, { size: p.size, align: 'center', weight: 900, alpha: a, shadow: true });
      return;
    }
    ctx.globalAlpha = a;
    if (p.k === 'ring') {
      const r = U.lerp(p.r, p.r2, 1 - t);
      ctx.strokeStyle = p.col; ctx.lineWidth = 2 * t + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, r), 0, 6.283); ctx.stroke();
    } else if (p.k === 'bubble') {
      ctx.strokeStyle = p.col; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = a * 0.35; D.circle(ctx, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.4, '#ffffff');
    } else if (p.k === 'chunk') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      D.rr(ctx, -p.r, -p.r * 0.7, p.r * 2, p.r * 1.4, p.r * 0.4, p.col);
      ctx.restore();
    } else {
      if (p.glow) D.glow(ctx, p.x, p.y, p.r * 3.2, p.col, a * 0.5);
      D.circle(ctx, p.x, p.y, p.r * (0.4 + t * 0.6), p.col);
    }
    ctx.globalAlpha = 1;
  }
  function drawWorld(ctx) { for (const p of parts) if (!p.screen) one(ctx, p); }
  function drawScreen(ctx) {
    for (const p of parts) if (p.screen) one(ctx, p);
    if (flashT > 0 && flashCol) {
      ctx.globalAlpha = U.clamp(flashT / flashMax, 0, 1) * 0.5;
      D.rect(ctx, 0, 0, KA.W, KA.H, flashCol);
      ctx.globalAlpha = 1;
    }
  }
  const shakeOff = () => (shakeAmt <= 0 ? { x: 0, y: 0 } : { x: U.rnd(-shakeAmt, shakeAmt), y: U.rnd(-shakeAmt, shakeAmt) });
  const frozen = () => stop > 0;

  return { part, bubbles, burst, ring, text, chunks, shake, hitstop, flash, update,
           drawWorld, drawScreen, shakeOff, frozen, reset, count: () => parts.length };
})();

/* spring camera */
KA.Camera = function (worldW, worldH) {
  this.x = 0; this.y = 0; this.worldW = worldW; this.worldH = worldH;
  this.follow = function (px, py, vx, vy, dt, lead) {
    lead = lead === undefined ? 0.22 : lead;
    const tx = KA.U.clamp(px + (vx || 0) * lead - KA.W / 2, 0, Math.max(0, this.worldW - KA.W));
    const ty = KA.U.clamp(py + (vy || 0) * lead - KA.H * 0.58, 0, Math.max(0, this.worldH - KA.H));
    this.x = KA.U.damp(this.x, tx, 0.0006, dt);
    this.y = KA.U.damp(this.y, ty, 0.0009, dt);
  };
  this.snap = function (px, py) {
    this.x = KA.U.clamp(px - KA.W / 2, 0, Math.max(0, this.worldW - KA.W));
    this.y = KA.U.clamp(py - KA.H * 0.58, 0, Math.max(0, this.worldH - KA.H));
  };
  this.apply = function (ctx) {
    const s = KA.FX.shakeOff();
    ctx.translate(-this.x + s.x, -this.y + s.y);
  };
};
