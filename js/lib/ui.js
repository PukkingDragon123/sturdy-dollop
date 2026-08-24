/* ============================================================
   ui.js - touch-first UI kit: big rounded buttons, panels with
   soft shadows, bars, tabs, scrollers, toasts.
   ============================================================ */
KA.PAL = {
  deep:  '#04121d', ink: '#0a2233', ink2: '#0f3247', line: '#1d5c7f',
  text:  '#eaf7ff', dim: '#9dc4d6', dim2: '#6693a8',
  gold:  '#ffc94a', gold2: '#c9821c', amber: '#ff9a3c',
  coral: '#ff6f74', red: '#c9343f',
  kelp:  '#3fd18b', kelp2: '#1d8b5b',
  cyan:  '#7fe8ff', blue: '#3d9ad8',
  pink:  '#ff9ed2', violet: '#a86bff',
  sand:  '#f0dfb0', beer: '#ffb52e', foam: '#fff3d6'
};

KA.UI = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL;
  let hoverId = null, lastHover = null, tip = null, blockT = 0, now = 0;
  const scrolls = new Map();
  const toasts = [];

  function begin(dt) { now += dt; hoverId = null; tip = null; if (blockT > 0) blockT -= dt; }
  function end(ctx) {
    if (hoverId !== lastHover) { if (hoverId && !KA.touch) KA.A.play('hover'); lastHover = hoverId; }
    if (tip && !KA.touch) drawTip(ctx, tip);
    drawToasts(ctx);
  }
  function guard(t) { blockT = t || 0.16; }
  const blocked = () => blockT > 0;

  function hit(x, y, w, h) {
    const m = KA.In.mouse;
    return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
  }

  const TONES = {
    gold:  { a: '#ffc94a', b: '#c9821c', t: '#3a2402' },
    blue:  { a: '#3d9ad8', b: '#1d5c8b', t: '#eaf7ff' },
    green: { a: '#3fd18b', b: '#1d8b5b', t: '#04291b' },
    red:   { a: '#ff6f74', b: '#a8343f', t: '#2d0509' },
    violet:{ a: '#a86bff', b: '#5d2b9a', t: '#f2e6ff' },
    dark:  { a: '#17415c', b: '#0b2839', t: '#cfe8f5' },
    beer:  { a: '#ffb52e', b: '#c97f10', t: '#3a2402' }
  };

  /* big finger-friendly button */
  function button(ctx, x, y, w, h, label, o) {
    o = o || {};
    const id = o.id || (label + '@' + Math.round(x) + ',' + Math.round(y));
    const tone = TONES[o.tone || 'blue'];
    const dis = !!o.disabled;
    const hot = !dis && hit(x, y, w, h);
    if (hot) hoverId = id;
    const held = hot && KA.In.mouse.down;
    const off = held ? 2 : 0;
    const r = o.r === undefined ? Math.min(10, h * 0.32) : o.r;
    D.rr(ctx, x, y + 3, w, h, r, 'rgba(2,12,20,.45)');
    const top = dis ? '#20465c' : (hot ? D.shade(tone.a, 0.12) : tone.a);
    const bot = dis ? '#122c3c' : tone.b;
    D.rr(ctx, x, y + off, w, h - off, r, D.vgrad(ctx, x, y, x, y + h, [[0, top], [1, bot]], 'b' + top + bot + Math.round(h)));
    D.rr(ctx, x + 2, y + off + 1.5, w - 4, h * 0.42, r * 0.7, 'rgba(255,255,255,.16)');
    const size = o.size || Math.min(16, h * 0.5);
    const tx = o.align === 'left' ? x + 10 : x + w / 2;
    T.draw(ctx, label, tx, y + off + h / 2 - size * 0.62, dis ? '#5d7f92' : tone.t,
      { size, align: o.align === 'left' ? 'left' : 'center', weight: 800 });
    if (o.sub) T.draw(ctx, o.sub, x + w / 2, y + off + h - size * 0.52, dis ? '#5d7f92' : D.alpha(tone.t, 0.75),
      { size: size * 0.62, align: 'center', weight: 700 });
    if (hot && o.tip) tip = { text: o.tip };
    if (dis) return false;
    const key = o.key && KA.In.isPressed(o.key);
    const clicked = (hot && KA.In.mouse.click && !blocked()) || key;
    if (clicked) { KA.In.mouse.click = false; KA.A.play(o.sfx || 'click'); }
    return clicked;
  }

  function panel(ctx, x, y, w, h, title, o) {
    o = o || {};
    D.rr(ctx, x, y + 4, w, h, 12, 'rgba(2,10,18,.5)');
    D.rr(ctx, x, y, w, h, 12, D.vgrad(ctx, x, y, x, y + h,
      [[0, o.fill || '#0f3247'], [1, o.fill2 || '#08202f']], 'p' + Math.round(h) + (o.fill || '')));
    D.rr(ctx, x + 1, y + 1, w - 2, h - 2, 11, null, { line: o.border || 'rgba(127,232,255,.28)', lineW: 1.5 });
    let cy = y + 10;
    if (title) {
      /* titleRight reserves room for a top-right button so the two never overlap */
      T.draw(ctx, title, x + (w - (o.titleRight || 0)) / 2, y + 9, o.titleCol || P.cyan,
        { size: o.titleSize || 15, align: 'center', weight: 800 });
      D.rect(ctx, x + 14, y + 30, w - 28, 1.5, 'rgba(127,232,255,.2)');
      cy = y + 38;
    }
    return { x, y, w, h, cy };
  }

  function bar(ctx, x, y, w, h, frac, o) {
    o = o || {};
    frac = U.clamp(frac, 0, 1);
    D.rr(ctx, x, y, w, h, h / 2, o.bg || 'rgba(3,16,26,.75)');
    const iw = (w - 3) * frac;
    if (iw > 1) {
      const c = o.col || P.kelp;
      D.rr(ctx, x + 1.5, y + 1.5, iw, h - 3, (h - 3) / 2,
        D.vgrad(ctx, x, y, x, y + h, [[0, D.shade(c, 0.25)], [1, c]], 'bar' + c + Math.round(h)));
    }
    D.rr(ctx, x, y, w, h, h / 2, null, { line: o.line || 'rgba(255,255,255,.16)', lineW: 1 });
    if (o.label) T.draw(ctx, o.label, x + w / 2, y + h / 2 - (o.ls || h * 0.42) * 0.55, o.labelCol || '#fff',
      { size: o.ls || h * 0.72, align: 'center', weight: 800, shadow: true });
  }

  function chip(ctx, x, y, label, col, o) {
    o = o || {};
    const s = o.size || 11;
    const w = T.width(ctx, label, s, 800) + 14;
    D.rr(ctx, x, y, w, s + 8, (s + 8) / 2, o.fill || D.alpha(col, 0.18));
    D.rr(ctx, x, y, w, s + 8, (s + 8) / 2, null, { line: D.alpha(col, 0.7), lineW: 1 });
    T.draw(ctx, label, x + 7, y + 4, col, { size: s, weight: 800 });
    return w + 4;
  }

  function tabs(ctx, x, y, w, h, items, sel, onPick) {
    const bw = w / items.length;
    items.forEach((it, i) => {
      if (button(ctx, x + i * bw + 2, y, bw - 4, h, it, { tone: sel === i ? 'gold' : 'dark', size: h * 0.42, id: 'tab' + i }))
        onPick(i);
    });
  }

  function scroll(id, ctx, x, y, w, h, contentH, drawFn) {
    let s = scrolls.get(id);
    if (!s) { s = { off: 0, drag: false, last: 0 }; scrolls.set(id, s); }
    const maxOff = Math.max(0, contentH - h);
    const inside = hit(x, y, w, h);
    if (inside && KA.In.mouse.wheel) s.off += KA.In.mouse.wheel * 26;
    // drag-to-scroll (touch + mouse)
    if (inside && KA.In.mouse.down) {
      if (!s.drag) { s.drag = true; s.last = KA.In.mouse.y; }
      else { s.off -= (KA.In.mouse.y - s.last); s.last = KA.In.mouse.y; }
    }
    if (!KA.In.mouse.down) s.drag = false;
    s.off = U.clamp(s.off, 0, maxOff);
    ctx.save();
    ctx.beginPath(); D.rr(ctx, x, y, w, h, 8, null); ctx.clip();
    drawFn(x, y - s.off, w);
    ctx.restore();
    if (maxOff > 0) {
      const kh = Math.max(18, h * (h / contentH));
      const ky = y + (h - kh) * (s.off / maxOff);
      D.rr(ctx, x + w - 5, y, 3, h, 1.5, 'rgba(255,255,255,.08)');
      D.rr(ctx, x + w - 5, ky, 3, kh, 1.5, 'rgba(127,232,255,.55)');
    }
    return s;
  }
  function resetScroll(id) { const s = scrolls.get(id); if (s) s.off = 0; }

  function drawTip(ctx, t) {
    const m = KA.In.mouse;
    const lines = T.wrapPx(ctx, t.text, 11, 190, 700);
    const w = Math.min(210, Math.max(...lines.map((l) => T.width(ctx, l, 11, 700))) + 16);
    const h = lines.length * 14 + 12;
    let x = Math.min(m.x + 10, KA.W - w - 4), y = m.y - h - 8;
    if (y < 4) y = m.y + 16;
    D.rr(ctx, x, y, w, h, 8, 'rgba(4,18,29,.95)', { line: 'rgba(127,232,255,.35)', lineW: 1 });
    lines.forEach((l, i) => T.draw(ctx, l, x + 8, y + 6 + i * 14, P.text, { size: 11, weight: 700 }));
  }
  function tooltip(text) { if (text) tip = { text }; }

  function toast(text, col) {
    toasts.push({ text, col: col || P.text, t: 3.4, y: 0 });
    if (toasts.length > 5) toasts.shift();
  }
  function updateToasts(dt) {
    for (let i = toasts.length - 1; i >= 0; i--) {
      const o = toasts[i];
      o.t -= dt;
      o.y = U.damp(o.y, i * 30, 0.0008, dt);
      if (o.t <= 0) toasts.splice(i, 1);
    }
  }
  function drawToasts(ctx) {
    for (let i = 0; i < toasts.length; i++) {
      const o = toasts[i];
      const a = U.clamp(o.t / 0.5, 0, 1);
      const w = T.width(ctx, o.text, 13, 800) + 26;
      const x = KA.W - w - 10, y = 52 + o.y;
      ctx.globalAlpha = a;
      D.rr(ctx, x, y, w, 24, 12, 'rgba(4,18,29,.92)', { line: D.alpha(o.col, 0.6), lineW: 1.5 });
      D.circle(ctx, x + 12, y + 12, 4, o.col);
      T.draw(ctx, o.text, x + 22, y + 5, o.col, { size: 13, weight: 800 });
      ctx.globalAlpha = 1;
    }
  }

  function dim(ctx, a) {
    ctx.globalAlpha = a === undefined ? 0.6 : a;
    D.rect(ctx, 0, 0, KA.W, KA.H, '#020b14');
    ctx.globalAlpha = 1;
  }

  /* ---- on-screen pad, drawn only on touch devices ---- */
  function touchPad(ctx, buttons) {
    if (!KA.touch) return;
    const pad = KA.In.pad;
    const bx = 62, by = KA.H - 62;
    ctx.globalAlpha = pad.active ? 0.5 : 0.26;
    D.circle(ctx, pad.active ? pad.cx : bx, pad.active ? pad.cy : by, 34, 'rgba(255,255,255,.10)',
      { line: 'rgba(255,255,255,.35)', lineW: 2 });
    D.circle(ctx, (pad.active ? pad.cx : bx) + pad.dx * 26, (pad.active ? pad.cy : by) + pad.dy * 26, 16,
      'rgba(255,255,255,.42)');
    ctx.globalAlpha = 1;
    for (const b of buttons) {
      const st = (KA.In.act(b.name) ? 1 : 0);
      ctx.globalAlpha = 0.34 + st * 0.35;
      D.circle(ctx, b.x, b.y, b.r, b.col || 'rgba(255,255,255,.16)', { line: 'rgba(255,255,255,.45)', lineW: 2 });
      ctx.globalAlpha = 0.95;
      T.draw(ctx, b.label, b.x, b.y - 7, '#ffffff', { size: b.r * 0.62, align: 'center', weight: 800 });
      ctx.globalAlpha = 1;
    }
  }

  return { begin, end, guard, blocked, hit, button, panel, bar, chip, tabs, scroll, resetScroll,
           tooltip, toast, updateToasts, dim, touchPad, TONES };
})();
