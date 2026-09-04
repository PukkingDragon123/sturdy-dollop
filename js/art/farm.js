/* ============================================================
   art/farm.js - the cove. A bed, a bin, a seed crate, the
   furrows you cut in the seabed and three things you can grow
   in them.

   Everything here is drawn to be read at a glance from across
   a room, because it is the furniture of the loop: if you
   cannot tell a ripe row from a green one without walking up
   to it, the farm is a chore instead of a garden. So each crop
   changes SILHOUETTE at every stage rather than just getting
   taller, and the ripe stage is the only one carrying its
   ramp's brightest colour.
   ============================================================ */
KD.art.farm = (function () {
  const P = KD.PX;
  const C = {
    o: 'INK.0', p: 'INK.1', q: 'INK.2', P: 'INK.3',
    i: 'DEEP.0', d: 'DEEP.1', D: 'DEEP.2', e: 'DEEP.3', E: 'DEEP.4',
    t: 'WATER.0', T: 'WATER.1', c: 'WATER.2', C: 'WATER.3',
    n: 'SAND.0', N: 'SAND.1', m: 'SAND.2', M: 'SAND.3',
    h: 'STONE.0', H: 'STONE.1', j: 'STONE.2', J: 'STONE.3',
    r: 'CORAL.0', R: 'CORAL.1', x: 'CORAL.2', X: 'CORAL.3',
    f: 'KELP.0', F: 'KELP.1', '+': 'KELP.2', '*': 'KELP.3',
    g: 'GOLD.0', G: 'GOLD.1', y: 'GOLD.2', Y: 'GOLD.3',
    u: 'RUST.0', U: 'RUST.1', v: 'RUST.2', V: 'RUST.3',
    b: 'BONE.0', B: 'BONE.1', w: 'BONE.2', W: 'WHITE',
    z: 'ROT.0', Z: 'ROT.1', a: 'ROT.2', A: 'ROT.3',
    s: 'SKIN.0', S: 'SKIN.1', k: 'SKIN.2', K: 'SKIN.3',
    '#': 'BLOOD.0', '$': 'BLOOD.1', '%': 'BLOOD.2', '&': 'BLOOD.3',
    1: 'WOOD.0', 2: 'WOOD.1', 3: 'WOOD.2', 4: 'WOOD.3',
    5: 'CLOTH.0', 6: 'CLOTH.1', 7: 'CLOTH.2', 8: 'CLOTH.3'
  };
  const D = (name, px, ax, ay) => P.def(name, { pal: C, ax: ax || 0, ay: ay || 0, px: px });

  function build() {
    /* ---- the furrows ------------------------------------------------
       An 8x8 overlay on the mud tile. Two ridges and two troughs, lit
       from the upper left, and NOT symmetrical - a symmetrical furrow
       tiles into a grid of dots. */
    D('fm_tilled', [
      'oooooooo',
      'u1uu1uu1',
      '22322232',
      '11211121',
      'ou1uu1uu',
      '23222322',
      '12111211',
      'oooooooo'
    ]);

    /* ---- the bed. 24x16, three tiles by two ------------------------- */
    D('fm_bed', [
      '........oooooooooooo....',
      '.......o8887777788o.....',
      'oooooooo877777778oo.....',
      'o5555555o77777777o......',
      'o6666666o88888888o......',
      'oo66666oo66666666oo.....',
      '.o5555o.o66666666o......',
      '.oooooo.o55555555o......',
      '2222222222222222222222oo',
      '3333333333333333333333o.',
      '2222222222222222222222o.',
      '1111111111111111111111o.',
      'o1o..............o1o..o.',
      'o2o..............o2o..o.',
      'o1o..............o1o..o.',
      'ooo..............ooo....'
    ]);

    /* ---- the shipping bin. 16x16, two by two ------------------------
       A lid held half open on a hinge, so it is obviously a thing you
       put something INTO. */
    D('fm_bin', [
      '....oooooooo....',
      '...o44444444o...',
      '..o4333333334o..',
      '.o433333333334o.',
      'o4333333333333o.',
      'o1333333333331o.',
      'o1oooooooooo21o.',
      'o1222222222221o.',
      'o1233333333221o.',
      'o1233333333221o.',
      'o1233333333221o.',
      'o1222222222221o.',
      'o1111111111111o.',
      'o1oooooooooo11o.',
      'oooo......oooo..',
      '.oo........oo...'
    ]);

    /* ---- the seed crate. 16x16 -------------------------------------
       A crate with three seed pods sitting in the top of it, so it does
       not read as another chest. */
    D('fm_crate', [
      '................',
      '..o..o....o..o..',
      '.o*o.o*o..o*o.o.',
      '.oFo.oFo..oFo.o.',
      'ooFoooFooooFooo.',
      'o1111111111111o.',
      'o1333333333331o.',
      'o1322222222231o.',
      'o1322333332231o.',
      'o1322322232231o.',
      'o1322333332231o.',
      'o1322222222231o.',
      'o1333333333331o.',
      'o1111111111111o.',
      'ooooooooooooooo.',
      '................'
    ]);

    /* ================================================================
       THE CROPS. Four stages, one tile wide, two tiles tall.

       Stage 0 is a seed you can barely see, 1 is a shoot, 2 is the
       plant grown but green, 3 is ripe - and only 3 uses the bright
       end of its ramp, so a ripe row reads as a line of light down the
       plot from anywhere on screen.
       ================================================================ */
    const crop = (id, rows) => D(id, rows, 0, 0);

    /* KELP: the reliable one. Three days, sells for little. */
    crop('fm_kelp0', [
      '........', '........', '........', '........',
      '........', '........', '...o....', '..oFo...'
    ]);
    crop('fm_kelp1', [
      '........', '........', '........', '...o....',
      '..oFo...', '..oFo...', '.ofFfo..', '.oo+oo..'
    ]);
    crop('fm_kelp2', [
      '...o....', '..oFo...', '.ofFfo..', '..oFo...',
      '.ofFfo..', '..oFo...', '.ofFfo..', '.oo+oo..'
    ]);
    crop('fm_kelp3', [
      '.o*o*o..', 'o*+F+*o.', 'o+*F*+o.', '.o+F+o..',
      'o*+F+*o.', 'o+*F*+o.', '.o+F+o..', '.oo*oo..'
    ]);

    /* PEARL VINE: slow, and the pod at the top is the whole point. */
    crop('fm_pearl0', [
      '........', '........', '........', '........',
      '........', '........', '...o....', '..oxo...'
    ]);
    crop('fm_pearl1', [
      '........', '........', '........', '..o.....',
      '.oxo....', '..oxo...', '.oxRo...', '.oorooo.'
    ]);
    crop('fm_pearl2', [
      '..oo....', '.oRRo...', '.oxRo...', '..oxo...',
      '.oxRo...', '..oxo...', '.oxRo...', '.oorooo.'
    ]);
    crop('fm_pearl3', [
      '.oWWo...', 'oWBBWo..', 'oWBBWo..', '.oWWo...',
      '.oXXo...', 'oxXRxo..', '.oxRo...', '.oorooo.'
    ]);

    /* GLOWPOD: the fast one, and it lights the plot at night. */
    crop('fm_glow0', [
      '........', '........', '........', '........',
      '........', '........', '...o....', '..oZo...'
    ]);
    crop('fm_glow1', [
      '........', '........', '........', '...o....',
      '..oZo...', '..oao...', '.oZaZo..', '.oozoo..'
    ]);
    crop('fm_glow2', [
      '........', '..ooo...', '.oaAao..', '.oZaZo..',
      '..oZo...', '.oZaZo..', '..oao...', '.oozoo..'
    ]);
    crop('fm_glow3', [
      '.oYYo...', 'oYWWYo..', 'oYWWYo..', '.oYYo...',
      '..oAo...', '.oAYAo..', '..oao...', '.oozoo..'
    ]);

    /* ---- a sign for the plot, so the first day explains itself ----- */
    D('fm_sign', [
      '................',
      '.oooooooooooooo.',
      'o4444444444444o.',
      'o3oooooooooo33o.',
      'o3oWWoWoWoWo33o.',
      'o3oWoWoWoWWo33o.',
      'o3oWWoWoWoWo33o.',
      'o3oooooooooo33o.',
      'o3333333333333o.',
      'o1111111111111o.',
      'oooo2222222oooo.',
      '...o2333332o....',
      '...o1222221o....',
      '...o1111111o....',
      '...ooooooooo....',
      '................'
    ]);
  }
  return { build };
})();
