/* ============================================================
   rig.js - procedural character animation.

   Two halves:
     Rig.S  flat chunky shape drawing (the "cheap toy 3D" look:
            flat fills with a darker extruded side face, no outlines)
     Rig.P  the physics that animates them: scalar springs, 2D jiggle
            bodies, verlet chains and 2-bone IK.

   Nothing here is keyframed. Bodies follow velocity, limbs solve to
   targets, soft parts overshoot and settle.
   ============================================================ */
DZ.Rig = (function () {
  const U = DZ.Util, Px = DZ.Pixel;
  const TAU = Math.PI * 2;

  /* ================= shapes ================= */
  const S = {
    /* darker "side face" offset, then the flat top face */
    _extrude(ctx, drawFn, col, opts) {
      const o = opts || {};
      const d = o.depth === undefined ? 1.6 : o.depth;
      if (d > 0) {
        ctx.fillStyle = o.side || Px.shade(col, -0.34);
        ctx.save();
        ctx.translate(d * (o.dx === undefined ? 0.55 : o.dx), d);
        drawFn(ctx);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = col;
      drawFn(ctx);
      ctx.fill();
      if (o.line) {
        ctx.strokeStyle = o.line;
        ctx.lineWidth = o.lineW || 1;
        drawFn(ctx);
        ctx.stroke();
      }
    },

    poly(ctx, pts, col, opts) {
      S._extrude(ctx, (c) => {
        c.beginPath();
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
        c.closePath();
      }, col, opts);
    },

    /* closed Catmull-Rom through the points - organic bodies */
    blob(ctx, pts, col, opts) {
      const n = pts.length;
      if (n < 3) return;
      const t = (opts && opts.tension) || 0.5;
      S._extrude(ctx, (c) => {
        c.beginPath();
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < n; i++) {
          const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
          c.bezierCurveTo(
            p1[0] + (p2[0] - p0[0]) / 6 * t * 2, p1[1] + (p2[1] - p0[1]) / 6 * t * 2,
            p2[0] - (p3[0] - p1[0]) / 6 * t * 2, p2[1] - (p3[1] - p1[1]) / 6 * t * 2,
            p2[0], p2[1]);
        }
        c.closePath();
      }, col, opts);
    },

    /* open Catmull-Rom ribbon of given half-width per point (fins, tails) */
    ribbon(ctx, pts, widths, col, opts) {
      const n = pts.length;
      if (n < 2) return;
      const left = [], right = [];
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
        const w = widths[i];
        left.push([pts[i][0] + Math.cos(ang) * w, pts[i][1] + Math.sin(ang) * w]);
        right.push([pts[i][0] - Math.cos(ang) * w, pts[i][1] - Math.sin(ang) * w]);
      }
      S.blob(ctx, left.concat(right.reverse()), col, opts);
    },

    capsule(ctx, x1, y1, x2, y2, r1, r2, col, opts) {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const p = ang + Math.PI / 2;
      S._extrude(ctx, (c) => {
        c.beginPath();
        c.arc(x1, y1, r1, p, p + Math.PI);
        c.arc(x2, y2, r2, p + Math.PI, p + TAU);
        c.closePath();
      }, col, opts);
    },

    disc(ctx, x, y, r, col, opts) {
      S._extrude(ctx, (c) => { c.beginPath(); c.arc(x, y, r, 0, TAU); }, col, opts);
    },
    ellipse(ctx, x, y, rx, ry, rot, col, opts) {
      S._extrude(ctx, (c) => { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); }, col, opts);
    },
    rect(ctx, x, y, w, h, col, opts) {
      S._extrude(ctx, (c) => { c.beginPath(); c.rect(x, y, w, h); }, col, opts);
    },
    roundRect(ctx, x, y, w, h, r, col, opts) {
      r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
      S._extrude(ctx, (c) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
      }, col, opts);
    },
    tri(ctx, a, b, c2, col, opts) { S.poly(ctx, [a, b, c2], col, opts); },

    /* clipped highlight/shadow panel over the last drawn shape */
    panel(ctx, drawClip, drawFill, col) {
      ctx.save();
      ctx.beginPath(); drawClip(ctx); ctx.clip();
      ctx.fillStyle = col;
      ctx.beginPath(); drawFill(ctx); ctx.fill();
      ctx.restore();
    },

    /* two dot eyes with independently wobbling pupils = instant stupidity */
    eye(ctx, x, y, r, look, opts) {
      opts = opts || {};
      S.disc(ctx, x, y, r, opts.white || '#ffffff', { depth: 0 });
      const px = x + (look ? look.x : 0) * r * 0.42;
      const py = y + (look ? look.y : 0) * r * 0.42;
      ctx.fillStyle = opts.pupil || '#101828';
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.7, r * 0.46), 0, TAU); ctx.fill();
      if (opts.shine !== false) {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.33, Math.max(0.4, r * 0.2), 0, TAU); ctx.fill();
      }
    },
    /* dopey grin: an arc with optional tongue */
    grin(ctx, x, y, w, h, col, opts) {
      opts = opts || {};
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x, y + h * 2, x + w, y);
      ctx.closePath();
      ctx.fill();
      if (opts.tongue) {
        ctx.fillStyle = opts.tongue;
        ctx.beginPath();
        ctx.moveTo(x - w * 0.4, y + h * 0.55);
        ctx.quadraticCurveTo(x, y + h * 1.9, x + w * 0.4, y + h * 0.55);
        ctx.closePath();
        ctx.fill();
      }
      if (opts.teeth) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - w * 0.55, y, w * 0.3, h * 0.5);
        ctx.fillRect(x + w * 0.25, y, w * 0.3, h * 0.5);
      }
    },
    scales(ctx, x, y, w, h, step, col) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.strokeStyle = col; ctx.lineWidth = 0.7;
      for (let r = 0; r < h / step + 1; r++) {
        for (let c = 0; c < w / step + 2; c++) {
          const cx = x + c * step + (r % 2 ? step / 2 : 0);
          const cy = y + r * step;
          ctx.beginPath(); ctx.arc(cx, cy, step * 0.5, 0.15, Math.PI - 0.15); ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  /* ================= physics ================= */
  /* scalar spring: chases .target, overshoots, settles */
  function Spring(v, k, d) {
    this.v = v || 0; this.target = v || 0; this.vel = 0;
    this.k = k === undefined ? 180 : k;
    this.d = d === undefined ? 12 : d;
  }
  Spring.prototype.update = function (dt) {
    const steps = Math.min(4, Math.ceil(dt / 0.012));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.vel += (this.target - this.v) * this.k * h - this.vel * this.d * h;
      this.v += this.vel * h;
    }
    return this.v;
  };
  Spring.prototype.kick = function (a) { this.vel += a; };

  /* 2D soft body offset - the jiggle. Fed acceleration, wobbles, settles. */
  function Jiggle(k, d, max) {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.k = k === undefined ? 150 : k;
    this.d = d === undefined ? 9 : d;
    this.max = max === undefined ? 6 : max;
    this.squash = 0;
  }
  Jiggle.prototype.push = function (ax, ay) { this.vx -= ax; this.vy -= ay; };
  Jiggle.prototype.update = function (dt) {
    const steps = Math.min(4, Math.ceil(dt / 0.012));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.vx += -this.x * this.k * h - this.vx * this.d * h;
      this.vy += -this.y * this.k * h - this.vy * this.d * h;
      this.x += this.vx * h; this.y += this.vy * h;
    }
    const l = Math.hypot(this.x, this.y);
    if (l > this.max) { this.x = this.x / l * this.max; this.y = this.y / l * this.max; }
    this.squash = U.clamp((Math.hypot(this.vx, this.vy)) / 160, 0, 0.4);
    return this;
  };

  /* verlet chain for hair, capes, ropes, kelp */
  function Chain(n, seg, opts) {
    opts = opts || {};
    this.n = n; this.seg = seg;
    this.grav = opts.grav === undefined ? 40 : opts.grav;
    this.drag = opts.drag === undefined ? 0.86 : opts.drag;
    this.stiff = opts.stiff === undefined ? 2 : opts.stiff;
    this.p = [];
    for (let i = 0; i < n; i++) this.p.push({ x: 0, y: i * seg, px: 0, py: i * seg });
  }
  Chain.prototype.place = function (x, y) {
    for (let i = 0; i < this.n; i++) {
      this.p[i].x = this.p[i].px = x;
      this.p[i].y = this.p[i].py = y + i * this.seg;
    }
  };
  Chain.prototype.update = function (dt, ax, ay, windX, windY) {
    const P = this.p;
    P[0].x = ax; P[0].y = ay;
    for (let i = 1; i < this.n; i++) {
      const q = P[i];
      const vx = (q.x - q.px) * this.drag + (windX || 0) * dt;
      const vy = (q.y - q.py) * this.drag + (this.grav + (windY || 0)) * dt * dt * 60;
      q.px = q.x; q.py = q.y;
      q.x += vx; q.y += vy;
    }
    for (let k = 0; k < this.stiff; k++) {
      P[0].x = ax; P[0].y = ay;
      for (let i = 1; i < this.n; i++) {
        const a = P[i - 1], b = P[i];
        let dx = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 0.0001;
        const f = (l - this.seg) / l;
        if (i > 1) { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; }
        else { b.x -= dx * f; b.y -= dy * f; }
      }
    }
    return this.p;
  };
  Chain.prototype.pts = function () { return this.p.map((q) => [q.x, q.y]); };

  /* 2-bone IK: returns the knee/elbow position */
  function solve2(hx, hy, tx, ty, l1, l2, flip) {
    let dx = tx - hx, dy = ty - hy;
    let d = Math.hypot(dx, dy);
    const max = (l1 + l2) * 0.999;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < 0.001) d = 0.001;
    const a = Math.acos(U.clamp((d * d + l1 * l1 - l2 * l2) / (2 * d * l1), -1, 1));
    const base = Math.atan2(dy, dx);
    const ang = base + a * (flip ? -1 : 1);
    return { x: hx + Math.cos(ang) * l1, y: hy + Math.sin(ang) * l1,
             tx: hx + dx, ty: hy + dy };
  }

  return { S, Spring, Jiggle, Chain, solve2, TAU };
})();
