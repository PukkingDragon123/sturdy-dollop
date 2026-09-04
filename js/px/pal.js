/* ============================================================
   pal.js - the one palette. Every pixel in the game is one of
   these. Sprites name colours as 'RAMP.step', never as hex, so
   the whole game recolours from one place and always agrees
   with itself.
   ============================================================ */
window.KD = { Scenes: {}, art: {} };

KD.PAL = (function () {
  /* ramps run dark -> light */
  /* ================================================================
     REPAINTED.

     The first set was built cold: navy INK over midnight DEEP over
     cyan WATER, with brown SAND and blue-grey STONE on top of it. Four
     of the fifteen ramps were within a few degrees of the same hue, so
     a house on a seabed in front of water came out as three browns and
     a teal and nothing had an edge. Everything read muddy because
     everything WAS the same colour at different brightnesses.

     This set is warm and it separates. Water is tropical and goes green
     as it shallows; sand is gold; stone is violet-grey so it never
     fights the water; kelp is emerald into lime; rust is terracotta;
     wood is walnut into honey. Every ramp keeps its name, its length
     and its dark-to-light order, so every sprite in the game recolours
     without being touched.
     ================================================================ */
  const RAMPS = {
    INK:   ['#0d0b17', '#171529', '#232244', '#34335f', '#4a4b82'],
    DEEP:  ['#06182b', '#0a2a49', '#0f4269', '#17608f', '#2286bd'],
    WATER: ['#1a7a86', '#23a8ad', '#3fd3cd', '#9ff5e8'],
    SAND:  ['#7a5a2c', '#b5893f', '#e3bc6b', '#ffe6a8'],
    STONE: ['#3f3f52', '#5c5c75', '#85859e', '#b7b7cb'],
    CORAL: ['#8a1f46', '#c8386d', '#f56a95', '#ffb0c6'],
    KELP:  ['#14512e', '#23854a', '#3fc169', '#8ff08a'],
    GOLD:  ['#6e4712', '#ad7a1e', '#e8b234', '#ffe285'],
    SKIN:  ['#7d4a2c', '#b87b4c', '#e0a97a', '#f8d9b0'],
    RUST:  ['#4f2a1c', '#85472a', '#bd7040', '#eda368'],
    BONE:  ['#74757f', '#b0b2bd', '#f4f3ee'],
    ROT:   ['#2f1146', '#532079', '#8639b8', '#c072e8'],
    BLOOD: ['#520f18', '#961c26', '#db3a2c', '#ff8442'],
    WOOD:  ['#3d2313', '#66401d', '#96632f', '#c79350'],
    CLOTH: ['#262c4a', '#414a75', '#6a76a6', '#a3afd8']
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
