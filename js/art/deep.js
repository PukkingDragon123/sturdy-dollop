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
     ROT is the octopus, CORAL.3 is a sucker, GOLD is the crown. */
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
       ruler: 0         1         2         3         4
              0123456789012345678901234567890123456789012345678
       ========================================================== */
    const SCALE0 = [
      '....................oo..oo..oo..................',
      '...................oYYooYYooYYo.................',
      '...................oyWyyYyyYyyo.................',
      '..................oGyYyGyYyGyGo.................',
      '...............oMmoggGGggGGggGo.................',
      '..............oMMmmmmmmmmmmNNno.................',
      '.............oMMmmmmmmmmmmmmNNno................',
      '.............oMmmmmmmmmmmmmmNnno.oAAo...........',
      '.............oMmKKKKKKKKKKKkkSnooAAAAo..........',
      '.............oMmKKoooKKKoooKSsnooAAAAaZo........',
      '.............oMKKWpoKKKKoWpkSsnooAAAAaaZo.......',
      '.............oMKKKKKKKKssKkSsnnoAAAAaaZZo.......',
      '.............oMKKKKKKKKsoKkSsnooAAAaaaZZZo......',
      '..............oKKKKKKKKKkKkSsno.oAAoooooZZZo....',
      '..............oKKKKoooooKkkSso..oAoWyyygoZZo....',
      '..............oKKKKKKWkkkkSso...oAoooooogoZo....',
      '...............oKKKKKkkkkSso....oAaoyyggoaZo....',
      '...............oKKKkkkkSso......oAaaooooaZZo....',
      '...........ozZZooSKkkkSo........oAaaaaaaZZo.....',
      '........otTTTtdooCcTTTTTTTTTTdooaaaZZZZZZZZo....',
      '......otToozZAAZooCcTcTTcTTcTdooaaZZZZZZZZZzo...',
      '.....otTToozZAZooCcTTcTTcTTcTdooaZZZZZZZZZZzo...',
      '....otTtoozZAZooCcTcTTcTTcTTdddooaZZZZZZZZzzo...',
      '.ozZAAZootTTTdooCcTTcTTcTTcTdddootTTTdoozZAAZo..',
      'ozZAAZzootTTTdooCcTcTTcTTcTTdddootTTTdoozZAAZzo.',
      'oZAXZzo.otTTTdooCcTTcTTcTTcTdddootTTTdo.ozZAXZo.',
      'oZXZzo..otTTTdooCcTcTTcTTcTTdddootTTTdo..oZAXZo.',
      'ozZzo...otTTTdooCcTTcTTcTTcTdddootTTTdo..oZXZo..',
      '.ooo....oTTTTdooCcTcTTcTTcTTdddooTTTTdo..ozZo...',
      '........otTTTdooCcTTcTTcTTcTdddootTTTdo...ooo...',
      '.......otTTTTdooCcTcTTcTTcTTdddootTTTTdo........',
      '.......oCcTTTdooCcTTcTTcTTcTdddootTTTcdo........',
      '.......oCcTTtdooggyYYyggyYYyggdootTTTcdo........',
      '.......oodddoooGyYWYygoYWYyGyygooodddoo.........',
      '..........ooooGyyyygoooogyyyyGoooooo............',
      '.............otTTTTdo..otTTTTTdo................',
      '.............oCcTTTdo..oCcTTTTdo................',
      '.............oCcTTTdo..oCcTTTTdo................',
      '.............otTTTTdo..otTTTTTdo................',
      '.............otTTTTdo..otTTTTTdo................',
      '............oodddddoo.oodddddddo................',
      '...........odDDddddDo.odDDddddddo...............',
      '..........oddDDddddDo.oddDDddddddo..............',
      '..........oooooooooo..ooooooooooo...............'
    ];
    P.def('king2_scale0', A(SCALE0, 24, 44));

    P.anim('king2_scale', ['king2_scale0'], 6);
  }

  return { build };
})();
