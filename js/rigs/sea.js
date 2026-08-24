/* ============================================================
   rigs/sea.js - the scenery: corals, kelp, ruins, village props,
   and the ambient sea life that makes a place feel alive.
   ============================================================ */
KA.Rig.sea = (function () {
  const U = KA.U, D = KA.D, R = KA.Rig;
  let T = 0;
  const tick = (dt) => { T += dt; };

  /* ---------------- static props ---------------- */
  function prop(ctx, p, groundY, theme) {
    const s = p.s, x = p.x, y = groundY;
    const back = p.back;
    if (back) ctx.globalAlpha = 0.55;
    switch (p.kind) {
      case 'coral': {
        const h = 26 * s, col = ['#ff7fa8', '#ff9a3c', '#a86bff', '#ffc94a'][Math.floor(p.ph) % 4];
        for (let i = -1; i <= 1; i++) {
          const bx = x + i * 7 * s;
          D.blob(ctx, [[bx - 4 * s, y], [bx - 3 * s, y - h * 0.55], [bx, y - h * (0.8 + Math.abs(i) * -0.2)],
                       [bx + 3 * s, y - h * 0.5], [bx + 4 * s, y]], i ? D.shade(col, -0.12) : col,
            { tension: 0.5, shadow: 'rgba(0,20,30,.25)', blur: 4, sy: 2 });
        }
        break;
      }
      case 'fan': {
        const h = 34 * s;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(T * 0.7 + p.ph) * 0.06);
        D.blob(ctx, [[-2 * s, 0], [-11 * s, -h * 0.5], [-6 * s, -h * 0.85], [0, -h],
                     [6 * s, -h * 0.85], [11 * s, -h * 0.5], [2 * s, 0]], '#c9527c',
          { tension: 0.55, shadow: 'rgba(0,20,30,.25)', blur: 4, sy: 2 });
        ctx.strokeStyle = 'rgba(255,200,220,.5)'; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i * 4 * s, -h * 0.8); ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'anemone': {
        const n = 9, h = 15 * s;
        D.ellipse(ctx, x, y - 2 * s, 8 * s, 4 * s, 0, '#7a3f9e');
        for (let i = 0; i < n; i++) {
          const a = -Math.PI + (i / (n - 1)) * Math.PI;
          const w = Math.sin(T * 1.5 + i + p.ph) * 3 * s;
          D.capsule(ctx, x + Math.cos(a) * 5 * s, y - 3 * s,
            x + Math.cos(a) * 9 * s + w, y - 3 * s + Math.sin(a) * h, 1.6 * s, 1 * s, '#c88bff');
        }
        break;
      }
      case 'kelp': {
        const h = 90 * s;
        const pts = [];
        for (let i = 0; i <= 7; i++) {
          const t = i / 7;
          pts.push([x + Math.sin(T * 0.9 + p.ph + t * 2.4) * 9 * s * t, y - h * t]);
        }
        D.ribbon(ctx, pts, pts.map((q, i) => (3.4 - i * 0.3) * s), '#2b8f5a', { tension: 0.9 });
        for (let i = 1; i < 7; i += 2) {
          D.ellipse(ctx, pts[i][0] + 4 * s, pts[i][1], 4 * s, 2 * s, 0.4, '#3fd18b');
          D.ellipse(ctx, pts[i][0] - 4 * s, pts[i][1] - 3 * s, 4 * s, 2 * s, -0.4, '#3fd18b');
        }
        break;
      }
      case 'rock':
        D.blob(ctx, [[x - 16 * s, y], [x - 12 * s, y - 10 * s], [x - 2 * s, y - 14 * s],
                     [x + 11 * s, y - 9 * s], [x + 16 * s, y]], theme.rock || '#4a5a6a',
          { tension: 0.4, shadow: 'rgba(0,20,30,.3)', blur: 4, sy: 2 });
        D.blob(ctx, [[x - 9 * s, y - 4 * s], [x - 5 * s, y - 10 * s], [x + 3 * s, y - 8 * s], [x + 6 * s, y - 3 * s]],
          'rgba(255,255,255,.08)', { tension: 0.5 });
        break;
      case 'urchin': {
        const r = 7 * s;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * 6.283;
          D.line(ctx, x + Math.cos(a) * r * 0.6, y - r * 0.6 + Math.sin(a) * r * 0.6,
            x + Math.cos(a) * r * 1.7, y - r * 0.6 + Math.sin(a) * r * 1.7, '#3a2050', 1.6 * s);
        }
        D.circle(ctx, x, y - r * 0.6, r, '#5b2a7a');
        break;
      }
      case 'shell':
        D.blob(ctx, [[x - 7 * s, y], [x - 5 * s, y - 7 * s], [x, y - 9 * s], [x + 5 * s, y - 7 * s], [x + 7 * s, y]],
          '#f6d7e8', { tension: 0.5 });
        ctx.strokeStyle = 'rgba(190,120,160,.6)'; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + i * 3 * s, y - 8 * s); ctx.stroke(); }
        break;
      case 'star': {
        const r = 9 * s;
        ctx.save(); ctx.translate(x, y - r * 0.4); ctx.rotate(p.ph);
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * 6.283, rr = i % 2 ? r * 0.42 : r;
          pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.7]);
        }
        D.blob(ctx, pts, '#ff9a3c', { tension: 0.5 });
        ctx.restore();
        break;
      }
      case 'pillar': {
        const h = 78 * s;
        D.rr(ctx, x - 8 * s, y - h, 16 * s, h, 2, D.vgrad(ctx, x - 8 * s, 0, x + 8 * s, 0,
          [[0, '#b9c6d4'], [0.5, '#8f9db0'], [1, '#6d7a89']], 'pil' + Math.round(s * 10)));
        D.rr(ctx, x - 12 * s, y - h - 6 * s, 24 * s, 7 * s, 2, '#c3d0dd');
        D.rr(ctx, x - 12 * s, y - 5 * s, 24 * s, 6 * s, 2, '#a8b6c4');
        ctx.strokeStyle = 'rgba(0,20,30,.16)'; ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 5 * s + i * 3 * s, y - h); ctx.lineTo(x - 5 * s + i * 3 * s, y - 5 * s); ctx.stroke(); }
        break;
      }
      case 'rubble':
        for (let i = 0; i < 4; i++) {
          D.rr(ctx, x - 14 * s + i * 8 * s, y - (4 + (i % 2) * 5) * s, 9 * s, (5 + (i % 2) * 4) * s, 2, '#8f9db0');
        }
        break;
      case 'statue': {
        const h = 54 * s;
        D.rr(ctx, x - 11 * s, y - 8 * s, 22 * s, 9 * s, 2, '#8f9db0');
        D.capsule(ctx, x, y - 8 * s, x, y - h * 0.7, 7 * s, 6 * s, '#a8b6c4');
        D.circle(ctx, x, y - h * 0.82, 7 * s, '#b9c6d4');
        D.blob(ctx, [[x - 8 * s, y - h * 0.9], [x, y - h * 1.02], [x + 8 * s, y - h * 0.9]], '#ffc94a', { tension: 0.5 });
        break;
      }
      case 'urn':
        D.blob(ctx, [[x - 8 * s, y], [x - 10 * s, y - 12 * s], [x - 5 * s, y - 20 * s], [x + 5 * s, y - 20 * s],
                     [x + 10 * s, y - 12 * s], [x + 8 * s, y]], '#c9a26a', { tension: 0.6 });
        D.rr(ctx, x - 7 * s, y - 23 * s, 14 * s, 4 * s, 2, '#8a6a3c');
        break;
      case 'vent': {
        D.blob(ctx, [[x - 10 * s, y], [x - 6 * s, y - 12 * s], [x, y - 16 * s], [x + 6 * s, y - 11 * s], [x + 10 * s, y]],
          '#2b2438', { tension: 0.45 });
        if (U.chance(0.04)) KA.FX.bubbles(x, y - 16 * s, 2, { vy: -40, col: '#8f9db0' });
        break;
      }
      case 'glowpod': {
        const g = 0.6 + Math.sin(T * 1.6 + p.ph) * 0.4;
        D.glow(ctx, x, y - 16 * s, 26 * s, '#a86bff', 0.24 * g);
        D.capsule(ctx, x, y, x, y - 14 * s, 2 * s, 1.4 * s, '#3a2b5c');
        D.circle(ctx, x, y - 17 * s, 4.4 * s, D.alpha('#d8b8ff', 0.55 + g * 0.4));
        break;
      }
      case 'bones':
        D.capsule(ctx, x - 12 * s, y - 2 * s, x + 12 * s, y - 4 * s, 2.4 * s, 2 * s, '#e2dccc');
        for (let i = -1; i <= 1; i += 2) D.circle(ctx, x + i * 13 * s, y - 3 * s, 3.4 * s, '#e2dccc');
        break;
      case 'lamp': {
        const h = 46 * s, gl = 0.6 + Math.sin(T * 2 + p.ph) * 0.25;
        D.capsule(ctx, x, y, x, y - h, 2.2 * s, 1.8 * s, '#6d5a3a');
        D.glow(ctx, x, y - h - 4 * s, 30 * s, '#ffd88a', 0.3 * gl);
        D.blob(ctx, [[x - 6 * s, y - h], [x, y - h - 10 * s], [x + 6 * s, y - h]], D.alpha('#ffe9b0', 0.9), { tension: 0.5 });
        D.circle(ctx, x, y - h - 3 * s, 3.4 * s, '#fff3d6');
        break;
      }
      case 'crate':
        D.rr(ctx, x - 10 * s, y - 18 * s, 20 * s, 18 * s, 2, '#8a5f30');
        D.rr(ctx, x - 10 * s, y - 12 * s, 20 * s, 3 * s, 1, '#6d4a24');
        D.rr(ctx, x - 2 * s, y - 18 * s, 4 * s, 18 * s, 1, '#6d4a24');
        break;
      case 'sign': {
        D.capsule(ctx, x, y, x, y - 26 * s, 2 * s, 2 * s, '#6d4a24');
        D.rr(ctx, x - 14 * s, y - 40 * s, 28 * s, 15 * s, 3, '#c9a26a');
        KA.T.draw(ctx, 'FISH', x, y - 36 * s, '#4a2f14', { size: 8 * s, align: 'center', weight: 800 });
        break;
      }
      case 'brazier': {
        const gl = 0.7 + Math.sin(T * 5 + p.ph) * 0.3;
        D.capsule(ctx, x, y, x, y - 20 * s, 3 * s, 5 * s, '#5a4a3a');
        D.glow(ctx, x, y - 26 * s, 34 * s, '#ff9a3c', 0.35 * gl);
        for (let i = -1; i <= 1; i++) {
          D.blob(ctx, [[x + i * 3 * s - 3 * s, y - 22 * s], [x + i * 3 * s, y - (30 + gl * 8) * s],
                       [x + i * 3 * s + 3 * s, y - 22 * s]], i ? '#ff9a3c' : '#ffd24a', { tension: 0.5 });
        }
        break;
      }
      case 'mound':
        D.blob(ctx, [[x - 60 * s, y], [x - 30 * s, y - 26 * s], [x + 10 * s, y - 34 * s],
                     [x + 45 * s, y - 18 * s], [x + 70 * s, y]], theme.bgProp || 'rgba(10,40,60,.5)', { tension: 0.5 });
        break;
    }
    if (back) ctx.globalAlpha = 1;
  }

  /* ---------------- ambient life ---------------- */
  function creature(ctx, c) {
    const x = c.x, y = c.y + Math.sin(T * 1.5 + c.ph) * 4, s = c.s, f = c.dir < 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f ? -1 : 1, 1);
    const hue = c.hue;
    switch (c.kind) {
      case 'fish': {
        const col = c.col || ['#ffc94a', '#7fe8ff', '#ff9ed2', '#3fd18b', '#ff9a3c'][Math.floor(hue * 5) % 5];
        const L = 16 * s, w = Math.sin(T * 9 + c.ph) * 0.2;
        D.blob(ctx, [[L * 0.5, 0], [L * 0.1, -L * 0.3], [-L * 0.3, -L * 0.22], [-L * 0.42, 0],
                     [-L * 0.3, L * 0.22], [L * 0.1, L * 0.3]], col, { tension: 0.6 });
        ctx.save(); ctx.translate(-L * 0.4, 0); ctx.rotate(w);
        D.blob(ctx, [[0, 0], [-L * 0.3, -L * 0.25], [-L * 0.36, 0], [-L * 0.3, L * 0.25]], D.shade(col, -0.15), { tension: 0.5 });
        ctx.restore();
        D.circle(ctx, L * 0.26, -L * 0.08, L * 0.09, '#fff');
        D.circle(ctx, L * 0.28, -L * 0.08, L * 0.05, '#16202c');
        break;
      }
      case 'seahorse': {
        const L = 18 * s;
        const pts = [[0, L * 0.4], [L * 0.06, L * 0.15], [-L * 0.02, -L * 0.1], [L * 0.06, -L * 0.3]];
        D.ribbon(ctx, pts, [L * 0.1, L * 0.14, L * 0.12, L * 0.08], '#ffb84d', { tension: 0.9 });
        const tp = [[0, L * 0.4], [L * 0.1, L * 0.5], [L * 0.02, L * 0.6], [-L * 0.08, L * 0.52]];
        D.ribbon(ctx, tp, [L * 0.07, L * 0.05, L * 0.04, L * 0.03], '#c97f1c', { tension: 0.9 });
        D.circle(ctx, L * 0.08, -L * 0.34, L * 0.11, '#ffc95a');
        D.capsule(ctx, L * 0.12, -L * 0.32, L * 0.3, -L * 0.26, L * 0.05, L * 0.03, '#ffc95a');
        D.circle(ctx, L * 0.12, -L * 0.36, L * 0.045, '#fff');
        D.circle(ctx, L * 0.13, -L * 0.36, L * 0.025, '#16202c');
        break;
      }
      case 'jelly': {
        const L = 20 * s, p = 1 + Math.sin(T * 2 + c.ph) * 0.16;
        const col = hue > 0.5 ? '#c9b6ff' : '#ff9ed2';
        for (let i = 0; i < 5; i++) {
          const tx = (i - 2) * L * 0.1;
          D.curve(ctx, [[tx, 0], [tx + Math.sin(T * 2 + i) * L * 0.1, L * 0.3],
                        [tx + Math.sin(T * 2 + i + 1) * L * 0.14, L * 0.6]], D.alpha(col, 0.6), 1.4 * s);
        }
        ctx.globalAlpha = 0.82;
        D.blob(ctx, [[-L * 0.34, L * 0.04], [-L * 0.3, -L * 0.22 * p], [0, -L * 0.34 * p],
                     [L * 0.3, -L * 0.22 * p], [L * 0.34, L * 0.04], [0, L * 0.1]], col, { tension: 0.6 });
        ctx.globalAlpha = 1;
        D.glow(ctx, 0, -L * 0.1, L * 0.7, col, 0.18);
        break;
      }
      case 'turtle': {
        const L = 26 * s, fl = Math.sin(T * 3 + c.ph) * 0.5;
        D.blob(ctx, [[-L * 0.36, -L * 0.02], [-L * 0.2, -L * 0.2], [L * 0.16, -L * 0.22],
                     [L * 0.34, 0], [L * 0.14, L * 0.2], [-L * 0.22, L * 0.2]], '#3f7a52',
          { tension: 0.55, shadow: 'rgba(0,20,30,.25)', blur: 4, sy: 2 });
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j += 2)
          D.blob(ctx, [[i * L * 0.14 - L * 0.06, j * L * 0.06], [i * L * 0.14, j * L * 0.14],
                       [i * L * 0.14 + L * 0.06, j * L * 0.06]], '#5c9a68', { tension: 0.5 });
        D.blob(ctx, [[L * 0.24, -L * 0.04], [L * 0.44, -L * 0.16 + fl * L * 0.1], [L * 0.3, L * 0.02]], '#4f8a5e', { tension: 0.5 });
        D.circle(ctx, L * 0.4, L * 0.02, L * 0.1, '#5c9a68');
        D.circle(ctx, L * 0.44, 0, L * 0.03, '#16202c');
        break;
      }
      case 'ray': {
        const L = 30 * s, w = Math.sin(T * 2.2 + c.ph);
        D.blob(ctx, [[L * 0.4, 0], [0, -L * 0.3 - w * L * 0.12], [-L * 0.34, -L * 0.06],
                     [-L * 0.5, 0], [-L * 0.34, L * 0.06], [0, L * 0.3 + w * L * 0.12]],
          '#5c7a9a', { tension: 0.6, shadow: 'rgba(0,20,30,.2)', blur: 5, sy: 2 });
        D.capsule(ctx, -L * 0.4, 0, -L * 0.8, w * L * 0.08, L * 0.03, L * 0.01, '#4a6580');
        D.circle(ctx, L * 0.24, -L * 0.06, L * 0.04, '#16202c');
        break;
      }
      case 'lantern': {
        const L = 14 * s, g = 0.6 + Math.sin(T * 3 + c.ph) * 0.4;
        D.glow(ctx, 0, 0, L * 2, '#9fe8ff', 0.3 * g);
        D.blob(ctx, [[L * 0.4, 0], [0, -L * 0.34], [-L * 0.4, 0], [0, L * 0.34]], '#2b3a5c', { tension: 0.7 });
        D.circle(ctx, L * 0.3, -L * 0.2, L * 0.1, D.alpha('#9fe8ff', 0.9));
        D.circle(ctx, L * 0.16, -L * 0.06, L * 0.06, '#fff');
        break;
      }
      case 'crabby': {
        const L = 15 * s, b = Math.sin(T * 3 + c.ph);
        for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 3; k++)
          D.line(ctx, i * L * 0.1 + k * L * 0.1 - L * 0.1, L * 0.05,
            i * L * 0.2 + k * L * 0.1 - L * 0.1, L * 0.24 + b * L * 0.04, '#c9525c', 1.4 * s);
        D.ellipse(ctx, 0, 0, L * 0.34, L * 0.22, 0, '#ff6f74');
        for (const i of [-1, 1]) D.circle(ctx, i * L * 0.12, -L * 0.2, L * 0.06, '#fff');
        for (const i of [-1, 1]) D.circle(ctx, i * L * 0.12, -L * 0.2, L * 0.03, '#16202c');
        break;
      }
      case 'shark': {
        const L = 54 * s, w = Math.sin(T * 2.4 + c.ph) * 0.16;
        ctx.globalAlpha = 0.9;
        D.blob(ctx, [[L * 0.5, 0], [L * 0.15, -L * 0.16], [-L * 0.1, -L * 0.15], [-L * 0.4, -L * 0.06],
                     [-L * 0.5, 0], [-L * 0.4, L * 0.06], [-L * 0.1, L * 0.13], [L * 0.2, L * 0.1]],
          '#7d90a4', { tension: 0.6, shadow: 'rgba(0,20,30,.3)', blur: 6, sy: 3 });
        D.tri(ctx, [-L * 0.02, -L * 0.14], [L * 0.04, -L * 0.32], [L * 0.1, -L * 0.13], '#66788c');
        ctx.save(); ctx.translate(-L * 0.46, 0); ctx.rotate(w);
        D.blob(ctx, [[0, 0], [-L * 0.14, -L * 0.24], [-L * 0.2, 0], [-L * 0.12, L * 0.16]], '#66788c', { tension: 0.45 });
        ctx.restore();
        D.blob(ctx, [[L * 0.05, L * 0.1], [L * 0.0, L * 0.24], [L * 0.14, L * 0.11]], '#66788c', { tension: 0.5 });
        D.circle(ctx, L * 0.34, -L * 0.05, L * 0.03, '#16202c');
        D.curve(ctx, [[L * 0.5, L * 0.01], [L * 0.3, L * 0.07], [L * 0.16, L * 0.06]], '#3f4d5c', 1.4 * s);
        ctx.globalAlpha = 1;
        break;
      }
    }
    ctx.restore();
  }
  function moveCreatures(list, area, dt) {
    for (const c of list) {
      c.x += c.v * c.dir * dt;
      if (c.x > area.w + 40) c.x = -40;
      if (c.x < -40) c.x = area.w + 40;
      c.y += Math.sin(T * 0.7 + c.ph) * 6 * dt;
    }
  }
  return { tick, prop, creature, moveCreatures, get T() { return T; } };
})();
