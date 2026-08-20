/* ============================================================
   Dolphin Ranch: Tides of Atlantis
   util.js - math, random, formatting helpers
   ============================================================ */
window.DZ = window.DZ || {};

DZ.Scenes = {};

/* Scenes lay out in a 400x225 "design space"; everything is drawn through a
   global x2 transform, so the real canvas is 800x450 and text/shapes render at
   full native resolution without a single layout needing to change. */
DZ.W = 400;
DZ.H = 225;
DZ.SC = 2;

DZ.Util = (function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const dist2 = (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);

  // deterministic-ish rng with seed (so races can be replayed / rivals stable)
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // weighted pick: items must have .weight
  function pickWeighted(list, weightFn) {
    const wf = weightFn || ((o) => o.weight || 1);
    let total = 0;
    for (const it of list) total += wf(it);
    let r = Math.random() * total;
    for (const it of list) { r -= wf(it); if (r <= 0) return it; }
    return list[list.length - 1];
  }

  const easeOut = (t) => 1 - (1 - t) * (1 - t);
  const easeIn = (t) => t * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const bounce = (t) => Math.sin(t * Math.PI);

  // approach a target with per-second smoothing (frame-rate independent)
  const damp = (cur, target, smooth, dt) => lerp(cur, target, 1 - Math.pow(smooth, dt));

  function fmt(n) {
    n = Math.floor(n);
    if (Math.abs(n) < 10000) return String(n);
    if (Math.abs(n) < 1000000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
    return (n / 1000000).toFixed(2) + 'm';
  }
  function fmtC(n) { return DZ.Util.fmt(n) + 'c'; } // clams

  function pad(n, len) { let s = String(n); while (s.length < len) s = '0' + s; return s; }

  // wrap text to a width in characters
  function wrap(str, cols) {
    const words = String(str).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if (line.length && (line + ' ' + w).length > cols) { lines.push(line); line = w; }
      else line = line ? line + ' ' + w : w;
    }
    if (line) lines.push(line);
    return lines;
  }

  function uid() { return 'x' + Math.floor(Math.random() * 1e9).toString(36) + (uid._n = (uid._n || 0) + 1); }

  // simple 1-D value noise for currents / wobble
  function noise1(x) {
    const i = Math.floor(x), f = x - i;
    const h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
    const a = h(i), b = h(i + 1);
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  }

  return { clamp, lerp, inv, dist, dist2, mulberry, rnd, rndInt, pick, chance, shuffle,
           pickWeighted, easeOut, easeIn, easeInOut, bounce, damp, fmt, fmtC, pad, wrap, uid, noise1 };
})();
