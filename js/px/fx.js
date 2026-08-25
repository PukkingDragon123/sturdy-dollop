/* ============================================================
   fx.js - particles, screen shake, floating numbers. Every
   particle is a 1x1 or 2x2 rect: no soft edges anywhere.
   ============================================================ */
KD.Fx = (function () {
  const parts = [];
  let shakeAmt = 0, flashT = 0, flashCol = 'WHITE';
  const MAX = 400;

  function add(p) { if (parts.length < MAX) parts.push(p); }
  function part(x, y, o) {
    add({ x, y, vx: o.vx || 0, vy: o.vy || 0, g: o.g === undefined ? 180 : o.g,
          life: o.life || 0.5, max: o.life || 0.5, col: o.col || 'BONE.2',
          r: o.r || 1, drag: o.drag || 0, kind: o.kind || 'dot', txt: o.txt, screen: !!o.screen });
  }
  /* rock chips, coloured by the material you just broke */
  function chunks(x, y, n, art) {
    const ramp = { sand: 'SAND', stone: 'STONE', dark: 'DEEP', rot: 'ROT', coral: 'CORAL',
                   plank: 'WOOD', brick: 'RUST', masonry: 'STONE', mud: 'SAND', glass: 'WATER' }[art] || 'STONE';
    for (let i = 0; i < n; i++) {
      part(x, y, { vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60 - 10,
                   life: 0.3 + Math.random() * 0.4, col: ramp + '.' + (1 + ((Math.random() * 3) | 0)),
                   r: Math.random() < 0.4 ? 2 : 1, drag: 0.5 });
    }
  }
  function bubbles(x, y, n) {
    for (let i = 0; i < n; i++) {
      part(x + (Math.random() - 0.5) * 6, y, { vx: (Math.random() - 0.5) * 14, vy: -14 - Math.random() * 18,
        g: -6, life: 0.6 + Math.random() * 0.7, col: 'WATER.3', r: Math.random() < 0.3 ? 2 : 1, drag: 0.2 });
    }
  }
  function blood(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      part(x, y, { vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 70,
        life: 0.25 + Math.random() * 0.35, col: col || 'BLOOD.2', r: 1, drag: 0.3 });
    }
  }
  function num(x, y, txt, col) {
    add({ x, y, vx: (Math.random() - 0.5) * 12, vy: -34, g: 42, life: 0.85, max: 0.85,
          col: col || 'BONE.2', kind: 'text', txt: String(txt), r: 1, drag: 0.2, screen: false });
  }
  const shake = (a) => { shakeAmt = Math.max(shakeAmt, a); };
  const flash = (col, t) => { flashCol = col; flashT = t || 0.15; };

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag) { p.vx *= Math.pow(1 - p.drag, dt * 4); p.vy *= Math.pow(1 - p.drag * 0.5, dt * 4); }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if (shakeAmt > 0) shakeAmt = Math.max(0, shakeAmt - dt * 26);
    if (flashT > 0) flashT -= dt;
  }
  function draw(ctx, cam) {
    for (const p of parts) {
      const x = Math.round(p.screen ? p.x : p.x - cam.x);
      const y = Math.round(p.screen ? p.y : p.y - cam.y);
      if (x < -8 || y < -8 || x > KD.W + 8 || y > KD.H + 8) continue;
      /* fade by dropping frames near the end, not by alpha */
      if (p.life / p.max < 0.35 && ((Math.round(p.x + p.y) + ((p.life * 40) | 0)) & 1)) continue;
      if (p.kind === 'text') KD.Text.draw(p.txt, x, y, p.col, { tiny: true, align: 'center', shadow: 'INK.0' });
      else { ctx.fillStyle = KD.PAL.hex(p.col); ctx.fillRect(x, y, p.r, p.r); }
    }
  }
  function shakeOffset() {
    if (shakeAmt <= 0) return { x: 0, y: 0 };
    return { x: Math.round((Math.random() - 0.5) * shakeAmt), y: Math.round((Math.random() - 0.5) * shakeAmt) };
  }
  function overlay(ctx) {
    if (flashT > 0) KD.Dither.fill(ctx, 0, 0, KD.W, KD.H, flashCol, flashT * 3);
  }
  const reset = () => { parts.length = 0; shakeAmt = 0; flashT = 0; };
  return { part, chunks, bubbles, blood, num, shake, flash, update, draw, shakeOffset, overlay, reset,
           get count() { return parts.length; } };
})();
