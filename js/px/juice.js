/* ============================================================
   px/juice.js - the springs and the easing that make the game
   feel like it has weight.

   Nothing in here changes what happens; it changes how it lands.
   One shared set of curves so a panel opening, a landing squash
   and a house swaying all move like they belong to the same game.
   ============================================================ */
KD.Juice = (function () {
  /* ---- curves ------------------------------------------------------ */
  /* overshoot and settle: 0 -> past 1 -> 1. This is the whole look. */
  const back = (t) => {
    const c = 1.9;
    const u = t - 1;
    return 1 + u * u * ((c + 1) * u + c);
  };
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const outQuad = (t) => 1 - (1 - t) * (1 - t);
  /* a decaying wobble, for anything that got hit */
  const wobble = (t, n) => Math.sin(t * Math.PI * (n || 3)) * (1 - t);

  /* ---- hit stop ---------------------------------------------------- */
  /* A few frames of held time on a solid hit. Nothing sells impact like
     the game briefly refusing to move. */
  let stop = 0;
  const hit = (s) => { stop = Math.max(stop, s === undefined ? 0.055 : s); };
  /* the frame loop asks for its dt through this */
  function scale(dt) {
    if (stop <= 0) return dt;
    stop -= dt;
    return dt * 0.12;
  }
  const stopped = () => stop > 0;

  /* ---- squash and stretch ------------------------------------------ */
  /* A landing squashes wide and short, a launch stretches tall and thin,
     and both decay back. Returns { dw, dh, dy } to hand to blit. */
  function squash(amount, w, h) {
    const a = Math.max(-1, Math.min(1, amount));
    const dw = Math.round(w * (1 + a * 0.26));
    const dh = Math.round(h * (1 - a * 0.30));
    return { dw, dh, dy: h - dh };
  }

  /* ---- a named one-shot timer -------------------------------------- */
  /* Used for panels and pops: pop('bag') on open, then read at('bag'). */
  const pops = {};
  function pop(id, len) { pops[id] = { t: 0, len: len || 0.22 }; }
  function tick(dt) {
    for (const k in pops) {
      pops[k].t += dt;
      if (pops[k].t >= pops[k].len) delete pops[k];
    }
  }
  /* 0..1 through the pop, or 1 if it is over */
  function at(id) {
    const p = pops[id];
    return p ? Math.min(1, p.t / p.len) : 1;
  }
  const popping = (id) => !!pops[id];

  /* ---- a slow idle sway, deterministic in t ------------------------ */
  /* Everything alive should breathe a little. Seeded per object so a row
     of fruit houses does not sway in unison like a chorus line. */
  /* The wind is the ocean's, not each plant's. Reading it here means the
     houses, the kelp, the surface and the drifting silt all lean the same
     way at the same moment, which is the difference between weather and
     six unrelated sine waves. */
  const sway = (t, seed, amp, rate) =>
    Math.sin(t * 0.23) * (amp || 1) * 0.7 +
    Math.sin(t * (rate || 0.6) + (seed % 17) * 0.9) * (amp || 1);

  return { back, outCubic, outQuad, wobble, hit, scale, stopped,
           squash, pop, tick, at, popping, sway };
})();
