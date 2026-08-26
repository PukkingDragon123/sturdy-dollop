/* ============================================================
   sim/belly.js - the king's stomach, on a spring.

   His belly is a separate sprite from his body, and it is not
   parented rigidly: it is a mass on a damped spring chasing the
   point it is supposed to sit at. Anything that accelerates HIM
   is felt by it a frame late, so it lags when he starts walking,
   overshoots when he stops, and slams when he lands.

   That is the whole trick. It is two springs, not a canned
   animation, which is why it never repeats and why the amount of
   wobble falls honestly out of how much belly there is to wobble.
   ============================================================ */
KD.Belly = (function () {
  /* offset from the rest position, in pixels, and its velocity */
  let x = 0, y = 0, vx = 0, vy = 0;
  let lastVX = 0, lastVY = 0, squash = 0, t = 0;
  let fallVY = 0;          // the speed he was falling at, kept until he lands

  /* Spring constants. K is stiffness, D is damping. Soft and underdamped,
     because an overdamped belly just slides - the overshoot IS the joke. */
  const K = 190, D = 9.5;

  function reset() { x = y = vx = vy = 0; squash = 0; fallVY = 0; }

  /* how much belly there is: 0 trained down, 1 at the starting hundred kilos */
  function fat(S) {
    const w = S && S.S ? S.S.weight : 100;
    return Math.max(0, Math.min(1, (w - 14) / 86));
  }
  function size(S) {
    const f = fat(S);
    return f > 0.62 ? 2 : (f > 0.28 ? 1 : 0);
  }

  function update(dt, S) {
    const P = KD.Player.P;
    if (dt <= 0) return;
    t += dt;
    const f = fat(S);
    /* His acceleration this frame, as a force on the mass. A heavier belly
       is thrown further by the same movement. */
    const ax = (P.vx - lastVX) / dt;
    const ay = (P.vy - lastVY) / dt;
    lastVX = P.vx; lastVY = P.vy;
    const gain = (0.010 + f * 0.030);
    vx -= ax * gain;
    vy -= ay * gain;
    /* Landing hits it harder than anything else he does, so the impact is
       taken from how fast he WAS falling rather than from this frame's
       acceleration - by the time he is on the ground that is already gone. */
    if (P.onGround && fallVY > 120) {
      vy += Math.min(70, fallVY * 0.16) * (0.3 + f * 0.7);
      squash = Math.min(1, fallVY / 420) * (0.4 + f * 0.6);
    }
    fallVY = P.onGround ? 0 : Math.max(fallVY, P.vy);
    /* the spring home, plus a slow idle sway so he is never quite still */
    const homeY = Math.sin(t * 1.9) * (0.5 + f * 1.1);
    const homeX = Math.sin(t * 1.3) * (0.3 + f * 0.6);
    vx += (homeX - x) * K * dt;
    vy += (homeY - y) * K * dt;
    vx *= Math.pow(0.5, dt * D * 0.16);
    vy *= Math.pow(0.5, dt * D * 0.16);
    x += vx * dt;
    y += vy * dt;
    /* Do not let it leave him. A belly that flies off is a bug, not a gag. */
    const lim = 2 + f * 3.5;
    if (x < -lim) { x = -lim; vx *= -0.3; }
    if (x > lim) { x = lim; vx *= -0.3; }
    if (y < -lim) { y = -lim; vy *= -0.3; }
    if (y > lim + 1) { y = lim + 1; vy *= -0.3; }
    if (squash > 0) squash = Math.max(0, squash - dt * 3.4);
  }

  /* Draw it into the hollow in his body sprite. The squash on landing is
     done by blitting wider and shorter - no scaling filter, so the pixels
     stay square. */
  function draw(ctx, px, py, face, S) {
    const n = 'pk_belly' + size(S);
    if (!KD.PX.has(n)) return;
    const s = KD.PX.get(n);
    const sq = squash;
    const w = Math.round(s.w * (1 + sq * 0.22));
    const h = Math.round(s.h * (1 - sq * 0.26));
    /* The hollow is rows 23-27 of a 36-tall sprite whose bottom sits on his
       feet. The belly has to be CENTRED on that, not hung from its top edge
       - anchoring it at row 23 pushed the whole thing down onto his legs and
       out through the floor. */
    const ox = Math.round(x) * (face < 0 ? -1 : 1);
    const oy = Math.round(y) + (s.h - h);
    KD.PX.blit(ctx, n, px - (w >> 1) + ox, py - 36 + 18 + oy, {
      anchor: false, w: w, h: h, flipX: face < 0
    });
  }
  return { update, draw, reset, size, fat, get x() { return x; }, get y() { return y; } };
})();
