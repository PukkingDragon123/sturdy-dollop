/* ============================================================
   art/deep.js - the bottom of the world. THE KING who took the
   throne (48x44, four outfits, one per phase), his octopus army,
   the things that live in the trench with him, and the tat he
   has nailed to the walls of his own throne room.

   House rules, same as everywhere else in this game:
     - light falls from the UPPER LEFT. Highlights top-left,
       shade bottom-right, on every sprite below.
     - 1px selective outline: INK.0 on the shadow side, INK.2/3
       on the lit side, so nothing is a flat black cutout.
     - silhouette first. Nameable from the black shape alone.
     - no circles. Every dome, sucker and orb is stepped by hand.
     - nothing mirrored down its centre line.

   The four King outfits are the phase telegraph, so they are
   separated by VALUE and by SILHOUETTE, not by hue:
     scale  mid teal mail, spiked shoulder fins        (mid)
     gold   huge plate + pink cape + head plume        (lightest)
     ink    octopus wrapped over him, hood, no plate   (darkest)
     torn   plate smashed off, bare, cracked crown     (skin)
   ============================================================ */
KD.art.deep = (function () {
  const P = KD.PX;

  /* ---- the same character table actors.js uses, so his teal is
     the old King's teal and a recolour is a one-line edit.
       o p q P  INK      s S k K  SKIN      b B w  BONE  W white
       g G y Y  GOLD     t T c C  WATER     i d D e E  DEEP
       n N m M  SAND     r R x X  CORAL     f F + *  KELP
       h H j J  STONE    z Z a A  ROT       # $ % &  BLOOD
       u U v V  RUST     1 2 3 4  WOOD      5 6 7 8  CLOTH
     ROT is the octopus, CORAL.2/3 is a sucker, GOLD is the crown. */
  const C = {
    o: 'INK.0', p: 'INK.1', q: 'INK.2', P: 'INK.3',
    s: 'SKIN.0', S: 'SKIN.1', k: 'SKIN.2', K: 'SKIN.3',
    b: 'BONE.0', B: 'BONE.1', w: 'BONE.2', W: 'WHITE',
    g: 'GOLD.0', G: 'GOLD.1', y: 'GOLD.2', Y: 'GOLD.3',
    t: 'WATER.0', T: 'WATER.1', c: 'WATER.2', C: 'WATER.3',
    i: 'DEEP.0', d: 'DEEP.1', D: 'DEEP.2', e: 'DEEP.3', E: 'DEEP.4',
    n: 'SAND.0', N: 'SAND.1', m: 'SAND.2', M: 'SAND.3',
    r: 'CORAL.0', R: 'CORAL.1', x: 'CORAL.2', X: 'CORAL.3',
    f: 'KELP.0', F: 'KELP.1', '+': 'KELP.2', '*': 'KELP.3',
    u: 'RUST.0', U: 'RUST.1', v: 'RUST.2', V: 'RUST.3',
    h: 'STONE.0', H: 'STONE.1', j: 'STONE.2', J: 'STONE.3',
    z: 'ROT.0', Z: 'ROT.1', a: 'ROT.2', A: 'ROT.3',
    '#': 'BLOOD.0', '$': 'BLOOD.1', '%': 'BLOOD.2', '&': 'BLOOD.3',
    1: 'WOOD.0', 2: 'WOOD.1', 3: 'WOOD.2', 4: 'WOOD.3',
    5: 'CLOTH.0', 6: 'CLOTH.1', 7: 'CLOTH.2', 8: 'CLOTH.3',
    '!': 'SHADOW'
  };

  /* a frame that is another frame with named rows redrawn. Still
     hand-drawn pixels - this is just not retyping thirty rows of
     a boss who only moved his tentacles. */
  function edit(base, changes) {
    const out = base.slice();
    for (const k in changes) out[+k] = changes[k];
    return out;
  }
  const A = (px, ax, ay) => ({ pal: C, ax: ax, ay: ay, px: px });

  function build() {
    /* ==========================================================
       A. THE KING  48x44, anchored between his boots.
       Fists on his hips, chest thrown out, chin up, legs planted
       wide - the triangular holes under his arms are the pose.
       The stolen crown is 12px wide on an 18px head and sits on
       TOP of the skull, not round the brow. The octopus rides his
       right shoulder: tall stepped mantle, slit-pupil eye, one
       arm waving over the crown, two banding each of his arms,
       two more trailing past his boots.
       ruler 0         1         2         3         4
             0123456789012345678901234567890123456789012345678
       ========================================================== */
    const SCALE0 = [
      '....................oo..oo..oo..................',
      '...................oYYooYYooYYo.................',
      '...................oyWyyYyyYyyo....ozZo.........',
      '.................oMoGyYyGyYyGGo...oZAaao........',
      '................oMmoggGGggGGggo..oZAAaaaZo......',
      '...............oMmmmmmmmmNNno...oAAAaaaaaZZo....',
      '..............oMmmmmmmmmmmNNno.oAAAaaaaaaaZZo...',
      '..............qMmNNNNNNNNNNnno.oAAAaaaaaaaaZZo..',
      '..............qNmKKKKKKKKkSsno.oAAAaaaaaaaaaZZo.',
      '..............qNmKooKKoooKSsno.oAAAaaaaaaaaaZZzo',
      '..............qNKoWpoKKoWpkSno.oAAaaaaaaaaaaZZzo',
      '..............qNKKKKKKsKkkSsno.oAAaoooooooaaZZzo',
      '..............qNKKKKKKsoKkSsno.oAAoWwwwwBboaZZzo',
      '...............oKKKKKKoKkSsno..oAAowooooobcoaZzo',
      '...............oKKoooooKkkSso..oAAowwwwwBboaZZzo',
      '................oKKKWWKkkkSso..oAaaoooooooaZZzzo',
      '................oKKKKKkkkkSso..oAaaZZZZZZZzzzzo.',
      '.................oKKkkkkSso....oAaaZZZZZzzzzzo..',
      '...................oSKkkkSo.....oaaZZZZzzzzzo...',
      '......qcCTTtdooAaaZzoyYYyGgygooaaaZZZZZzzzzzo...',
      '...qcCTTTtddooAaaaZzooCcTTcTTdooaaaZZZZZZzzzzzo.',
      '..qcCTTTtddooAaxaZzooCcTTcTTcdooaaaZZZZZZZzzzzzo',
      '...qtTTtdo.oAaaaZzooGycTTcTTcygo.oAaaZZzzo.oaZZzo',
      '.oAaxZo....oxaxaxzoocGyTcTTcygdo.oxaxaxazo..oxZzo',
      'oAaaZo....oCcTdo...ocGycTTcygdo...oCcTdo...oaZZzo',
      'oxaZzo....oCcTdo...ocTGyygTTdo....oCcTdo..oxaZZzo',
      'oAaaZo....oCcTdo...ocTTgyyTTdo....oCcTdo..oaaZZzo',
      '.oxaaZo....oAaaZzo..ocTTcTTcdo...oCcTdo.oxaZZzo.',
      '..oaaZzo...oxaxaxo..ocTcTTcTdo..oAaaZzo.oaZZzo..',
      '...oxaZzo...oCcTdo.ocTTcTTcTTdo.oxaxaxo..oaZZzo.',
      '....oaZZzo..ogyTTdooocTcTTcTTTdooCcTTdo...oaZZzo',
      '.....oazo...oyYTtdooocTTcTTcTTdoogyTtdo....oZzo.',
      '............ooTtdoogyYoWYoYYgoooTtdo............',
      '..............odggyyYYyyyyYYyyggdo..............',
      '..........oaZooCcTTcTTcTTcTTcTTcdooaZo..........',
      '.......oAaZzo.oCcTTcTdo..oCcTcTTdo..oaZZzo......',
      '....oAaaxZo..qCcTTcTdo..qCcTcTTcTdo..oaaxZZo....',
      '..oAaaZo.....qCcTcTTdo..qgyYyyGGGgo....oaaZZzo..',
      'oAxaaZo......qgyYyyGgo..qCcTTcTTcdo.....oaxZZzo.',
      'oAaaZo.......qCcTTcTdo..qCcTcTTcTdo......oaZZzo.',
      '.oxaaZo......qCcTcTTdo..qCcTTcTTcdo.....oxaZzo..',
      '...oaaZzo.qDDddddddddio.qDDddddddddio..oaZzo....',
      '..........qyyDdddddddio.qDdddddddyyio...........',
      '..........ooooooooooooo.ooooooooooooo...........'
    ];
    P.def('king2_scale0', A(SCALE0, 24, 44));

    P.anim('king2_scale', ['king2_scale0'], 6);
  }

  return { build };
})();
