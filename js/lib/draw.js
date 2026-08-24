/* ============================================================
   draw.js - every shape in the game. Flat-but-lush vector art:
   gradients, soft shadows, glows, rounded organic blobs.
   ============================================================ */
KA.D = (function () {
  const U = KA.U;
  const TAU = Math.PI * 2;
  const gcache = new Map();

  /* ---------- colour ---------- */
  function hex(h) {
    if (h[0] !== '#') return [0, 0, 0];
    if (h.length === 4) return [parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), parseInt(h[3] + h[3], 16)];
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  const rgb = (r, g, b) => '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  const shade = (c, amt) => mix(c, amt < 0 ? '#000000' : '#ffffff', Math.abs(amt));
  function alpha(c, a) { const A = hex(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }

  /* ---------- gradients (cached by key) ---------- */
  function vgrad(ctx, x0, y0, x1, y1, stops, key) {
    const k = key || (x0 + ',' + y0 + ',' + x1 + ',' + y1 + JSON.stringify(stops));
    let g = gcache.get(k);
    if (!g) {
      g = ctx.createLinearGradient(x0, y0, x1, y1);
      for (const s of stops) g.addColorStop(s[0], s[1]);
      if (gcache.size > 400) gcache.clear();
      gcache.set(k, g);
    }
    return g;
  }
  function rgrad(ctx, x, y, r, stops, key) {
    const k = 'r' + (key || (x + ',' + y + ',' + r + JSON.stringify(stops)));
    let g = gcache.get(k);
    if (!g) {
      g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r));
      for (const s of stops) g.addColorStop(s[0], s[1]);
      if (gcache.size > 400) gcache.clear();
      gcache.set(k, g);
    }
    return g;
  }

  /* ---------- primitives ---------- */
  function rect(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }

  function rr(ctx, x, y, w, h, r, fill, o) {
    o = o || {};
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    path(ctx, () => {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }, fill, o);
  }
  function circle(ctx, x, y, r, fill, o) {
    path(ctx, () => { ctx.moveTo(x + r, y); ctx.arc(x, y, Math.abs(r), 0, TAU); }, fill, o);
  }
  function ellipse(ctx, x, y, rx, ry, rot, fill, o) {
    path(ctx, () => { ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); }, fill, o);
  }
  function poly(ctx, pts, fill, o) {
    path(ctx, () => {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    }, fill, o);
  }
  function tri(ctx, a, b, c, fill, o) { poly(ctx, [a, b, c], fill, o); }

  /* closed Catmull-Rom through points: organic bodies */
  function blobPath(ctx, pts, tension) {
    const n = pts.length, t = (tension === undefined ? 1 : tension);
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6 * t, p1[1] + (p2[1] - p0[1]) / 6 * t,
                        p2[0] - (p3[0] - p1[0]) / 6 * t, p2[1] - (p3[1] - p1[1]) / 6 * t, p2[0], p2[1]);
    }
    ctx.closePath();
  }
  function blob(ctx, pts, fill, o) { path(ctx, () => blobPath(ctx, pts, o && o.tension), fill, o); }

  /* open curve with per-point half width: fins, tails, kelp */
  function ribbon(ctx, pts, widths, fill, o) {
    const n = pts.length;
    if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      const w = widths[i];
      L.push([pts[i][0] + Math.cos(ang) * w, pts[i][1] + Math.sin(ang) * w]);
      R.push([pts[i][0] - Math.cos(ang) * w, pts[i][1] - Math.sin(ang) * w]);
    }
    blob(ctx, L.concat(R.reverse()), fill, o);
  }
  function capsule(ctx, x1, y1, x2, y2, r1, r2, fill, o) {
    const ang = Math.atan2(y2 - y1, x2 - x1), p = ang + Math.PI / 2;
    path(ctx, () => {
      ctx.arc(x1, y1, Math.abs(r1), p, p + Math.PI);
      ctx.arc(x2, y2, Math.abs(r2), p + Math.PI, p + TAU);
      ctx.closePath();
    }, fill, o);
  }
  function line(ctx, x1, y1, x2, y2, col, w, cap) {
    ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.lineCap = cap || 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function curve(ctx, pts, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
  }

  /* shared fill/stroke/shadow wrapper */
  function path(ctx, build, fill, o) {
    o = o || {};
    ctx.beginPath();
    build();
    if (o.shadow) {
      ctx.save();
      ctx.shadowColor = o.shadow === true ? 'rgba(0,20,35,.45)' : o.shadow;
      ctx.shadowBlur = o.blur === undefined ? 6 : o.blur;
      ctx.shadowOffsetY = o.sy === undefined ? 2 : o.sy;
      ctx.fillStyle = fill; ctx.fill();
      ctx.restore();
    } else if (fill) {
      ctx.fillStyle = fill; ctx.fill();
    }
    if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = o.lineW || 1; ctx.lineJoin = 'round'; ctx.stroke(); }
  }

  /* clipped panel over the previous shape */
  function panel(ctx, clipFn, fillFn, col) {
    ctx.save();
    ctx.beginPath(); clipFn(ctx); ctx.clip();
    ctx.beginPath(); fillFn(ctx);
    ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  }

  function glow(ctx, x, y, r, col, a) {
    ctx.globalAlpha = a === undefined ? 0.5 : a;
    ctx.fillStyle = rgrad(ctx, x, y, r, [[0, col], [0.55, alpha(col, 0.35)], [1, alpha(col, 0)]], 'g' + col + Math.round(r));
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* eyes and mouths, used by every character */
  function eye(ctx, x, y, r, look, o) {
    o = o || {};
    circle(ctx, x, y, r, o.white || '#ffffff', { shadow: o.flat ? null : 'rgba(0,0,0,.18)', blur: 2, sy: 1 });
    const px = x + (look ? look.x : 0) * r * 0.4, py = y + (look ? look.y : 0) * r * 0.4;
    circle(ctx, px, py, Math.max(0.6, r * (o.pr || 0.46)), o.pupil || '#16202c');
    if (o.shine !== false) circle(ctx, x - r * 0.3, y - r * 0.34, Math.max(0.4, r * 0.22), 'rgba(255,255,255,.9)');
  }
  function smile(ctx, x, y, w, h, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x, y + h, x + w, y);
    ctx.stroke();
  }
  function mouthOpen(ctx, x, y, w, h, col, tongue) {
    path(ctx, () => {
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x, y + h * 2.1, x + w, y);
      ctx.closePath();
    }, col);
    if (tongue) {
      path(ctx, () => {
        ctx.moveTo(x - w * 0.45, y + h * 0.75);
        ctx.quadraticCurveTo(x, y + h * 2.0, x + w * 0.45, y + h * 0.75);
        ctx.closePath();
      }, tongue);
    }
  }

  return { TAU, hex, rgb, mix, shade, alpha, vgrad, rgrad, rect, rr, circle, ellipse,
           poly, tri, blob, blobPath, ribbon, capsule, line, curve, path, panel, glow, eye, smile, mouthOpen };
})();
