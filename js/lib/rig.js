/* ============================================================
   rig.js - the physics that animates every character.
   Scalar springs, 2D soft bodies, verlet chains, 2-bone IK.
   ============================================================ */
KA.Rig = (function () {
  const U = KA.U;

  function Spring(v, k, d) {
    this.v = v || 0; this.target = v || 0; this.vel = 0;
    this.k = k === undefined ? 180 : k; this.d = d === undefined ? 12 : d;
  }
  Spring.prototype.update = function (dt) {
    const n = Math.min(4, Math.ceil(dt / 0.012)), h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vel += (this.target - this.v) * this.k * h - this.vel * this.d * h;
      this.v += this.vel * h;
    }
    return this.v;
  };
  Spring.prototype.kick = function (a) { this.vel += a; };

  function Soft(k, d, max) {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.k = k === undefined ? 160 : k; this.d = d === undefined ? 10 : d;
    this.max = max === undefined ? 5 : max; this.squash = 0;
  }
  Soft.prototype.push = function (ax, ay) { this.vx -= ax; this.vy -= ay; };
  Soft.prototype.update = function (dt) {
    const n = Math.min(4, Math.ceil(dt / 0.012)), h = dt / n;
    for (let i = 0; i < n; i++) {
      this.vx += -this.x * this.k * h - this.vx * this.d * h;
      this.vy += -this.y * this.k * h - this.vy * this.d * h;
      this.x += this.vx * h; this.y += this.vy * h;
    }
    const l = Math.hypot(this.x, this.y);
    if (l > this.max) { this.x = this.x / l * this.max; this.y = this.y / l * this.max; }
    this.squash = U.clamp(Math.hypot(this.vx, this.vy) / 200, 0, 0.32);
    return this;
  };

  function Chain(n, seg, o) {
    o = o || {};
    this.n = n; this.seg = seg;
    this.grav = o.grav === undefined ? 30 : o.grav;
    this.drag = o.drag === undefined ? 0.88 : o.drag;
    this.stiff = o.stiff === undefined ? 3 : o.stiff;
    this.p = [];
    for (let i = 0; i < n; i++) this.p.push({ x: 0, y: i * seg, px: 0, py: i * seg });
    this.placed = false;
  }
  Chain.prototype.place = function (x, y) {
    for (let i = 0; i < this.n; i++) { const q = this.p[i]; q.x = q.px = x; q.y = q.py = y + i * this.seg; }
    this.placed = true;
  };
  Chain.prototype.update = function (dt, ax, ay, wx, wy) {
    if (!this.placed) this.place(ax, ay);
    const P = this.p;
    P[0].x = ax; P[0].y = ay;
    for (let i = 1; i < this.n; i++) {
      const q = P[i];
      const vx = (q.x - q.px) * this.drag + (wx || 0) * dt;
      const vy = (q.y - q.py) * this.drag + (this.grav + (wy || 0)) * dt * dt * 60;
      q.px = q.x; q.py = q.y; q.x += vx; q.y += vy;
    }
    for (let k = 0; k < this.stiff; k++) {
      P[0].x = ax; P[0].y = ay;
      for (let i = 1; i < this.n; i++) {
        const a = P[i - 1], b = P[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1e-4;
        const f = (l - this.seg) / l;
        if (i > 1) { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; }
        else { b.x -= dx * f; b.y -= dy * f; }
      }
    }
    return this.p;
  };
  Chain.prototype.pts = function () { return this.p.map((q) => [q.x, q.y]); };

  function solve2(hx, hy, tx, ty, l1, l2, flip) {
    let dx = tx - hx, dy = ty - hy;
    let d = Math.hypot(dx, dy);
    const max = (l1 + l2) * 0.999;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < 1e-3) d = 1e-3;
    const a = Math.acos(U.clamp((d * d + l1 * l1 - l2 * l2) / (2 * d * l1), -1, 1));
    const base = Math.atan2(dy, dx);
    const ang = base + a * (flip ? -1 : 1);
    return { x: hx + Math.cos(ang) * l1, y: hy + Math.sin(ang) * l1, tx: hx + dx, ty: hy + dy };
  }

  /* loft a body outline over a wavy spine - used by every sea creature */
  function loft(len, uu, top, bot, phase, amp, taper) {
    const n = uu.length, sp = [], T = [], B = [];
    for (let i = 0; i < n; i++) {
      const u = uu[i];
      sp.push([len * (0.5 - u), Math.sin(phase - u * (taper || 3.6)) * Math.pow(u, 2.1) * amp * len]);
    }
    for (let i = 0; i < n; i++) {
      const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)];
      const nx = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      const cx = Math.cos(nx), cy = Math.sin(nx);
      T.push([sp[i][0] + cx * top[i] * len, sp[i][1] + cy * top[i] * len]);
      B.push([sp[i][0] - cx * bot[i] * len, sp[i][1] - cy * bot[i] * len]);
    }
    function atU(u) {
      let i = 1;
      while (i < n - 1 && uu[i] < u) i++;
      const f = (u - uu[i - 1]) / ((uu[i] - uu[i - 1]) || 1);
      const L = (A) => [U.lerp(A[i - 1][0], A[i][0], f), U.lerp(A[i - 1][1], A[i][1], f)];
      const ang = Math.atan2(sp[i][1] - sp[i - 1][1], sp[i][0] - sp[i - 1][0]);
      return { p: L(sp), t: L(T), b: L(B), ang };
    }
    return { sp, top: T, bot: B, ring: T.concat(B.slice().reverse()), atU, n };
  }

  return { Spring, Soft, Chain, solve2, loft };
})();
