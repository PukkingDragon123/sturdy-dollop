/* ============================================================
   KING OF ATLANTIC
   core.js - namespace, responsive design space, math helpers.

   No pixel art anywhere: the whole game is vector shapes drawn at
   the device's real resolution. Design space is 360 units tall and
   as wide as the window's aspect ratio needs, so phones, tablets
   and desktops all get a correct field of view instead of bars.
   ============================================================ */
window.KA = { Scenes: {} };

KA.H = 360;          // design height, fixed
KA.W = 640;          // design width, recomputed on resize
KA.DPR = 1;
KA.touch = false;

KA.U = (function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const dist2 = (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => Math.random() < p;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  function pickW(list, wf) {
    wf = wf || ((o) => o.weight || 1);
    let tot = 0; for (const it of list) tot += wf(it);
    let r = Math.random() * tot;
    for (const it of list) { r -= wf(it); if (r <= 0) return it; }
    return list[list.length - 1];
  }
  const damp = (cur, tgt, smooth, dt) => lerp(cur, tgt, 1 - Math.pow(smooth, dt));
  const ease = { out: (t) => 1 - (1 - t) * (1 - t), in: (t) => t * t,
                 io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
                 bump: (t) => Math.sin(t * Math.PI) };
  function fmt(n) {
    n = Math.floor(n);
    if (Math.abs(n) < 10000) return String(n);
    if (Math.abs(n) < 1000000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
    return (n / 1000000).toFixed(2) + 'm';
  }
  function wrap(str, cols) {
    const words = String(str).split(' '), lines = [];
    let line = '';
    for (const w of words) {
      if (line.length && (line + ' ' + w).length > cols) { lines.push(line); line = w; }
      else line = line ? line + ' ' + w : w;
    }
    if (line) lines.push(line);
    return lines;
  }
  let idn = 0;
  const uid = (p) => (p || 'x') + (++idn) + Math.floor(Math.random() * 1e6).toString(36);
  function noise(x) {
    const i = Math.floor(x), f = x - i;
    const h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
    const t = f * f * (3 - 2 * f);
    return h(i) + (h(i + 1) - h(i)) * t;
  }
  return { clamp, lerp, inv, dist, dist2, rnd, rndInt, pick, chance, shuffle, pickW,
           damp, ease, fmt, wrap, uid, noise };
})();
