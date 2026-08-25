/* ============================================================
   art/interior.js - the INSIDES of the fruit houses: plush pets,
   wonky furniture, kitchen clutter, wall dressing, floor and
   wall surfaces, and the tiny dumb details that make a room
   somewhere the player wants to stand.

   House rules obeyed everywhere below:
     - light falls from the UPPER LEFT. Highlights top-left,
       shade bottom-right, on every single sprite.
     - 1px selective outline: INK.0 on the shadow side, INK.2
       on the lit side, so nothing is a flat black cutout.
     - PLUSHIES ARE SOFT. Every silhouette is stepped, never
       straight; every one carries visible INK.1 stitch dashes
       and button eyes with one WHITE glint.
     - nothing is mirrored down its centre line. An eye is
       always a row off, a hem always hangs long on one side.
   ============================================================ */
KD.art.interior = (function () {
  const P = KD.PX;

  /* ---- ONE character table for the whole file ---------------
     Same legend as art/actors.js, so a plush of the King is the
     same teal and bone-white as the King.
       o p q P  INK (0..3): o shadow outline, q lit outline,
                p is THE STITCH COLOUR on every soft thing
       s S k K  SKIN        b B w  BONE   W = white
       g G y Y  GOLD        t T c C  WATER
       i d D e E  DEEP      n N m M  SAND
       r R x X  CORAL       f F + *  KELP
       u U v V  RUST        h H j J  STONE
       z Z a A  ROT         # $ % &  BLOOD
       1 2 3 4  WOOD        5 6 7 8  CLOTH
     ------------------------------------------------------- */
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
    '#': 'BLOOD.0', $: 'BLOOD.1', '%': 'BLOOD.2', '&': 'BLOOD.3',
    1: 'WOOD.0', 2: 'WOOD.1', 3: 'WOOD.2', 4: 'WOOD.3',
    5: 'CLOTH.0', 6: 'CLOTH.1', 7: 'CLOTH.2', 8: 'CLOTH.3'
  };

  /* a sprite whose rows are typed as one line, split on '/'.
     Used for the 8x8 surfaces and the 8x8 junk. */
  function K(name, rows) { P.def(name, { pal: C, px: rows.split('/') }); }
  /* a sprite whose rows are an array. Used for everything big. */
  function S(name, rows) { P.def(name, { pal: C, px: rows }); }

  /* ============================================================
     A. PLUSH PETS AND SOFT TOYS
     Hand-sewn, lumpy, slightly wrong. Stepped octagonal heads,
     no straight edge longer than 4px, a stitch seam somewhere
     you can see, and button eyes: 2x2 of INK with one WHITE
     glint in the top-left corner where the light hits.
     ============================================================ */
  function plush() {

    /* OCTOPUS - stepped dome head, stitched smile, four stubby
       legs of uneven length hanging off a seamed skirt. */
    S('pl_octopus', [
      '................',
      '....qqqqqq......',
      '..qqXXXXXXxxo...',
      '.qXXXWoXxxxxxxo.',
      'qXXXXooxxxWoxxRo',
      'qXxxxxxxxxooxxRo',
      'qXxxpxxxpxxxxxRo',
      'oxxxxpppxxxxxRRo',
      'oxxxxxxxxxxxRRRo',
      '.oxxxxxxxxxxRRo.',
      'oxpxxpxxpxxpRRRo',
      'oxxooxxooxxooxRo',
      'oxxo.oo.oxxooRRo',
      '.oo.....oxRo.oo.',
      '.........oo.....',
      '................'
    ]);

    /* DOLPHIN - beak out to the lower left, stitched mouth, a
       dorsal fin and a tail fluke that do not quite match. */
    S('pl_dolphin', [
      '................',
      '................',
      '............q8o.',
      '......q8....q88o',
      '.....q88o.q8887o',
      '.....q887oq8876o',
      '..q888877778776o',
      '.q8Wo8777777766o',
      'q88oo7777777765o',
      'qpp777777776665o',
      '.qww7777776665o.',
      '..owwwB666655o..',
      '..owwwooww5o....',
      '...owwo..oo.....',
      '....oo..........',
      '................'
    ]);

    /* CRAB - two soft mitt claws, a wide stitched shell, four
       legs and two of them are longer than the others. */
    S('pl_crab', [
      '................',
      '................',
      '..q&o.....q&o...',
      '.q&&&o...q&&o...',
      '.q&&%o...q&%o...',
      '..q%o.....q%o...',
      '...q&&&&&&&&&o..',
      '..q&&&&&&&&&&%o.',
      '.q&&&Wo&&&&&%%%o',
      '.q&&&oo&&&&Wo%%o',
      'o&%%%$%%%%%oo$$o',
      'o%%$p$p$p$$$$$#o',
      '.o%%$$$$$$$$$#o.',
      '.o$o.ooo.o$o.ooo',
      '.oo.......oo....',
      '................'
    ]);

    /* SHARK - dopey grin full of felt teeth, small mean eye,
       fat soft belly. Nothing about him is frightening. */
    S('pl_shark', [
      '................',
      '................',
      '........qJq.....',
      '.......qJJq..qq.',
      '....qJJJJq..qJJo',
      '..qJJJJJJJqJJJjo',
      '.qJJJJJjjjjJjjho',
      'qJJWojjjjjjjjjho',
      'qJjoojjjjjjjjhho',
      'ojpppppppjjjhho.',
      'owWBwWBwWjjhho..',
      '.oBwwwwwwwjho...',
      '..owwwwwwwho....',
      '...owwoowhho....',
      '.....oo..oo.....',
      '................'
    ]);

    /* JELLY - stepped bell with a scalloped hem and four soft
       tentacle strands that all wander a different way. */
    S('pl_jelly', [
      '................',
      '....qqqqq.......',
      '..qAAAAAAAAqo...',
      '.qAAAAaaaaaao...',
      'qAAAaaaaaaaaaZo.',
      'qAaWoaaaaaWoaZo.',
      'qAaooaaaaaooaZo.',
      'qaaaaaaaaaaaaZo.',
      'oaaapapapaaaZZo.',
      '.oaaZaZaZaZZZo..',
      '.oZooZo.oZo.oZo.',
      '.oZooZo..oZooooo',
      '..oZooZo.oZo....',
      '..oZo.oZooo.....',
      '..oo...oo.......',
      '................'
    ]);

    /* SEAHORSE - snout out to the left, two crest tufts, a
       frilled back and a tail hooked back under itself. */
    S('pl_seahorse', [
      '................',
      '......qYq.......',
      '.....qYYYqo.....',
      '..qyYYYYWoYo....',
      '.qyYYYYYooYo....',
      'qyyYYYYYYyo.....',
      'oqyyYYYyyGo.....',
      '...oqyYYYyqo....',
      '....oqyYYyyGqo..',
      '....oqyYYpyGqo..',
      '....oqyYYyyGo...',
      '.....oqyYYyo....',
      '.....oqyYyo.....',
      '...oqyYyoo......',
      '..oqyYyo........',
      '...ooooo........'
    ]);

    /* WHALE - 20x14, enormous and squashed flat, a mouth seam
       from end to end and one lonely flipper. */
    S('pl_whale', [
      '....................',
      '....qqqqqqqqq.......',
      '..qEEEEEEEEEEEEEo...',
      '.qEEEEEEeeeeeeeeqo..',
      'qEEEeeeeeeeeeeeedDeo',
      'qEeeeeeeeeeeeeeddDeo',
      'qEeWoeeeeeeeeeedddDo',
      'qeeooeeeeeeeeeeddDo.',
      'oppppppppeeeeeeddo..',
      '.owwwwwwwwBBddddo...',
      '..owwwwwwwwwBdo.....',
      '...owwwwwwwBdo......',
      '.....owwo...........',
      '......oo............'
    ]);

    /* PUFFERFISH - a ball with a bumpy stepped rim for spikes,
       two big buttons and a tiny cross mouth. */
    S('pl_pufferfish', [
      '................',
      '.....qxxqxxq....',
      '..qqMMMMMMMMqo..',
      '.qMMMMMMMMMMMMqo',
      'xqMWoMMMMMMMMmmo',
      'xqMooMMMMMWoMmmo',
      '.qMmmmmmmmoommmo',
      '.qmmmmmppmmmmmmx',
      '.qmmmmmpmmmmmmmx',
      '.oqmmmmmmmmmmNo.',
      '..oqmmmmmmmmNno.',
      '...oqmmmmmNNno..',
      '....oqxxNxxno...',
      '.....oooooo.....',
      '................',
      '................'
    ]);

    /* NARWHAL - a striped gold horn stitched on at a slight
       angle, pale body, two teal patches. */
    S('pl_narwhal', [
      '..qYo...........',
      '..qyYo..........',
      '...qyYo.........',
      '....qyYo....qqo.',
      '..qwwwwwwwwqwwWo',
      '.qwwWowwTTwwwwBo',
      'qwwwoowwTTwwwBBo',
      'qwwwwwwwwwwwBbo.',
      'qwpwwwwTTwwwBbo.',
      '.owwwwwTTwwBbo..',
      '..owwwwwwwBbo...',
      '...owwoowwbo....',
      '....oo..oo......',
      '................',
      '................',
      '................'
    ]);

    /* TURTLE - domed shell of stitched panels, blunt head to
       the left, four flippers and none of them match. */
    S('pl_turtle', [
      '................',
      '.....qq***q.....',
      '...qq*****+qo...',
      '..q***+**+**qo..',
      '.q**+++**++**+o.',
      'qM**+**++**+**fo',
      'qMMo+**++**++ffo',
      'qMWo*++**++*ffo.',
      'qMMo++**++*ffo..',
      '.oqffFFFFFFffo..',
      '..oMMo.oMMo.oo..',
      '..oMo...oMMo....',
      '..oo.....oo.....',
      '................',
      '................',
      '................'
    ]);

    /* THE KING DOLL - 14x18. A felt crown, the bare pale band
       across the forehead, a beard you could lose a hand in,
       and a red cape sewn down one side. */
    S('pl_kingdoll', [
      '..YY.YY.YY....',
      '.qYYyYYyYYqo..',
      '.qKKKKKKKKKo..',
      '.qKWoKKKKKKo..',
      '.qKooKKKKWoo..',
      '.qkkkkkkkook..',
      '.qwkkppkkkkwo.',
      '.owwwwwwwwwwo.',
      '..owwwwwwwwBo.',
      '.qTTwwwwwwTTo.',
      'q$TTTwwwwTTTTo',
      'q$TTTTwwTTTTTo',
      'q$TTTTTTTTTTTo',
      'q$GyGyGyGyGygo',
      'q$TTTTTTTTTTTo',
      'o$TTTTTTTTTTo.',
      '.o$uuo.oUuuo..',
      '..ooo...oooo..'
    ]);

    /* THE KEG DOLL - 14x16. The Princess as a plush: staved
       keg body, two rust hoops, a tap for a mouth, a crooked
       tiara and a coral dress with a lopsided hem. */
    S('pl_kegdoll', [
      '....yY.y......',
      '.qyYyYyYyqo...',
      '.q4444444qo...',
      'q43333333334o.',
      'qUVVVVVVVVVUo.',
      'q433Wo333Wo34o',
      'q433oo333oo34o',
      'q4333uuu33334o',
      'qUVVVVVVVVVUo.',
      'q4RxXXXXXXxRo.',
      '.qRXXXXXXXXxo.',
      'qRXXXXXXXXXXRo',
      'qRXXXpXXXpXXRo',
      'oRXXXXXXXXXXxo',
      '.oRRxxxxxxRRo.',
      '..oooooooooo..'
    ]);

    /* THE PILE - 24x16. Three of them squashed into a heap:
       octopus flopped on the left, whale wedged in behind, and
       the crab sat on top of everybody with its claws up. */
    S('pl_pile', [
      '........................',
      '..................q&o...',
      '.................q&&o...',
      '..qXXXXXo........q&%o...',
      '.qXXWoXxxo.......q&&o...',
      'qXxxooxxxRo.....q&&&&o..',
      'qXxpxxxxRRo....q&&&Wo&o.',
      'oxxxxxxxRRo.qEEq&&&oo&%o',
      'oxxxxxxRRo.qEEeeq&%%%$$o',
      '.oxpxxpxRo.qEeeeeq$p$p$o',
      'oxxooxxoRo.qEeeeee$$$$#o',
      'oxxooxxo.o.oeeeeeeo$$#o.',
      '.oo..oo....owwwwwwo.o$o.',
      '............owwwwo.ooo..',
      '.............oooo.......',
      '........................'
    ]);
  }

  /* ---------------------------------------------------------- */
  function build() {
    plush();
  }

  return { build };
})();
