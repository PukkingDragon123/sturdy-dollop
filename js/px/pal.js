/* ============================================================
   pal.js - the one palette. Every pixel in the game is one of
   these. Sprites name colours as 'RAMP.step', never as hex, so
   the whole game recolours from one place and always agrees
   with itself.
   ============================================================ */
window.KD = { Scenes: {}, art: {} };

KD.PAL = (function () {
  /* ramps run dark -> light */
  const RAMPS = {
    INK:   ['#0b0f1a', '#131a2b', '#1d2740', '#2b3a5c', '#3d4f75'],
    DEEP:  ['#071726', '#0d2942', '#14405f', '#1d5c82', '#2a7ba8'],
    WATER: ['#1b6b7d', '#2a94a8', '#46c2cf', '#8ee9ee'],
    SAND:  ['#6b5535', '#9c7d4a', '#c9a86a', '#efd9a0'],
    STONE: ['#3a4250', '#556172', '#7b8798', '#a6b2c2'],
    CORAL: ['#7a1f3a', '#b8365c', '#e86a8a', '#ffa8bd'],
    KELP:  ['#1e4a2e', '#2f7a44', '#4fb063', '#8ee08c'],
    GOLD:  ['#6b4410', '#a8731c', '#e0a832', '#ffd97a'],
    SKIN:  ['#7a4a30', '#b07a52', '#d8a97c', '#f2d3ac'],
    RUST:  ['#4a2c22', '#7a4a32', '#ab7048', '#d69c6a'],
    BONE:  ['#6d7180', '#a8adba', '#e8ecf5'],
    ROT:   ['#2d1440', '#4d2470', '#7a3fa8', '#b06fd8'],
    BLOOD: ['#4a0f14', '#8a1c20', '#cc3a2e', '#ff7a48'],
    WOOD:  ['#3b2415', '#5e3b1f', '#8a5c2e', '#b8874a'],
    CLOTH: ['#2a2f45', '#454d6b', '#6b7599', '#9aa4c4']
  };

  /* flat list: index -> hex, plus name -> index */
  const LIST = [], BY_NAME = {};
  for (const r in RAMPS) {
    RAMPS[r].forEach((hex, i) => {
      BY_NAME[r + '.' + i] = LIST.length;
      LIST.push(hex);
    });
  }
  /* a few named singles that are not part of a ramp */
  const EXTRA = { WHITE: '#ffffff', BLACK: '#000000', SHADOW: '#04070d' };
  for (const k in EXTRA) { BY_NAME[k] = LIST.length; LIST.push(EXTRA[k]); }

  /* rgb triples, for direct ImageData writes */
  const RGB = LIST.map((h) => [
    parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)
  ]);

  function idx(name) {
    if (typeof name === 'number') return name;
    const i = BY_NAME[name];
    if (i === undefined) throw new Error('unknown palette colour: ' + name);
    return i;
  }
  const hex = (name) => LIST[idx(name)];
  const rgb = (name) => RGB[idx(name)];
  /* step along a ramp, clamped: shift('SAND.2', -1) -> 'SAND.1' */
  function shift(name, by) {
    const p = String(name).split('.');
    const ramp = RAMPS[p[0]];
    if (!ramp) return name;
    const s = Math.max(0, Math.min(ramp.length - 1, (+p[1] || 0) + by));
    return p[0] + '.' + s;
  }
  return { RAMPS, LIST, RGB, BY_NAME, idx, hex, rgb, shift, count: LIST.length };
})();
