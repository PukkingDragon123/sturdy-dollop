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


  /* ============================================================
     B. THE ROOM ITSELF - surfaces, then the furniture that goes
     on them. Every piece is built like real cheap joinery: a
     WOOD.0 top lip catching the light, WOOD.3 in the shadow, an
     INK.0 outline only where the shape turns away. Legs are
     always thinner than they should be.
     ============================================================ */
  function room() {
    S('in_floor', [
      '33333333',
      '32222223',
      '22222222',
      '21111112',
      'oooooooo',
      '33333333',
      '32222223',
      '22111122'
    ]);
    S('in_floor2', [
      '32222223',
      '22222222',
      '21122112',
      'oooooooo',
      '33333333',
      '32222223',
      '22222222',
      '21212112'
    ]);
    S('in_wall', [
      'RRRRxxxx',
      'RRxxxxxx',
      'RxxxxXxx',
      'xxxXxxxx',
      'xxxxxxXx',
      'xXxxXxxx',
      'xxxxxxxx',
      'xxXxxxXX'
    ]);
    S('in_wall2', [
      'RRxxxxxx',
      'RxxxXxxx',
      'xxxxxxxx',
      'xxXxxxxX',
      'xxxxxXxx',
      'xxxxxxxx',
      'xXxxxxXx',
      'xxxxXxxx'
    ]);
    S('in_wainscot', [
      'oooooooo',
      '33333333',
      '32222223',
      '32211223',
      '32211223',
      '32222223',
      '31111113',
      'oooooooo'
    ]);
    S('in_beam', [
      'o111111o',
      'o322223o',
      'o321123o',
      'o321123o',
      'o321123o',
      'o322223o',
      'o333333o',
      'oooooooo'
    ]);
    S('in_ceil', [
      'oooooooo',
      'rrrrrrrr',
      'rRRrrRrr',
      'RRRRRRRR',
      'RxRRxRRR',
      'xxxxxxxx',
      'xxXxxxxX',
      'xxxxxxxx'
    ]);
    S('fu_counter', [
      '.4444444444444444444444444444444',
      '.4222222222222222222222222222243',
      '42222222222222222222222222222224',
      'o111111111111111111111111111113o',
      'o3222223oo3222223oo3222223oo223o',
      'o3211123oo3211123oo3211123oo213o',
      'o3211123oo3211123oo3211123oo213o',
      'o3211123oo3211123oo3211123oo213o',
      'o3211123oo3211123oo3211123oo213o',
      'o3222223oo3222223oo3222223oo223o',
      'o111111111111111111111111111113o',
      'o33333333333333333333333333333o.',
      'oooooooooooooooooooooooooooooo..',
      '.o.o........................o.o.',
      '.o.o........................o.o.',
      '.ooo........................ooo.'
    ]);
    S('fu_shelf', [
      'o1111111111111111111111111o',
      'o3222222222222222222222223o',
      'ooooooooooooooooooooooooooo',
      '..oBBo...oGGo....offo..oww.',
      '.oBWBBo.oGYGGo..oFfFFo.oWwo',
      '.oBWBBo.oGYGGo..oFfFFo.oWwo',
      '.oBBBBo.oGGGGo..offFFo.owwo',
      '.oobboo.oogyoo..oo+foo.obbo',
      'o1111111111111111111111111o',
      'o3222222222222222222222223o',
      'ooooooooooooooooooooooooooo',
      '...oxxo....orro...ottTo....',
      '..oxXxxo..orRrro.ottTTo....',
      '..oxXxxo..orRrro.ottTTo..oB',
      '..oxxxxo..orrrro.ottTTo.oBW',
      '..ooxxoo..oorroo.oottoo.oBB',
      'o1111111111111111111111111o',
      'oooooooooooooooooooooooooo.'
    ]);
    S('fu_bed', [
      '.........ooooooooo..................',
      '......ooowwwBwwwBwwooo..............',
      '....oowwwBwwBwwBwwBwwwoo............',
      '...owwBwwBwwBwwBwwBwwBwwo...........',
      '..owBwwBwwBwwBwwBwwBwwBwwo..........',
      '..oBwwBwwBwwBwwBwwBwwBwwBwo.........',
      '.oowwwwwwwwwwwwwwwwwwwwwwwwoooooooo.',
      '.oWWWWWWWWWWWWo#############$$$$$$#o',
      'oBoWWWWWWWWWWo$$$$$$$$$$$$$$$$$$$$#o',
      'oBoWWWWWWWWoo$%%%%%%%%%%%%%%%%%%%$#o',
      'oBoooooooooo$%%YY%%%%YY%%%%YY%%%%%$o',
      'o#############################$$$$#o',
      'o1111111111111111111111111111111111o',
      'o3222222222222222222222222222222223o',
      'o3211111111111111111111111111111123o',
      'o3333333333333333333333333333333333o',
      'oooooooooooooooooooooooooooooooooooo',
      '.o.o..........................o.o...'
    ]);
    S('fu_table', [
      '.111111111111111111111.',
      '.322222222222222222223.',
      'o222222222222222222222o',
      'o111111111111111111111o',
      'o333333333333333333333o',
      'ooooooooooooooooooooooo',
      '..o22o............o22o.',
      '..o21o............o21o.',
      '..o21o............o21o.',
      '..o21o............o21o.',
      '..o21o............o21o.',
      '..o33o............o33o.',
      '.o3333o..........o3333o',
      '.oooooo..........oooooo'
    ]);
    S('fu_stool', [
      'o11111111o',
      'o32222223o',
      'o33333333o',
      'oooooooooo',
      '.o2o..o2o.',
      '.o1o..o1o.',
      '.o1o..o1o.',
      '.o1o..o1o.',
      '.o3o..o3o.',
      'o33o..o33o',
      'o3o....o3o',
      'ooo....ooo'
    ]);
    S('fu_rug', [
      '..oooooooooooooooooooooooooooooooooo...',
      '.o####################################.',
      'o#$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$#o.',
      'o#$%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%$#o.',
      'o#$%GGYY%%GGYY%%GGYY%%GGYY%%GGYY%%%$#o.',
      'o#$%YY%%%%YY%%%%YY%%%%YY%%%%YY%%%%%$#o.',
      'o#$%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%$#o.',
      'o#$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$#o.',
      'o######################################',
      '.oooooooooooooooooooooooooooooooooooo..',
      'w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w.w..',
      'B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B..'
    ]);
    S('fu_barrel', [
      '..oo3333oo..',
      '.o33222233o.',
      'o3322112233o',
      'o3221111223o',
      'ovvvvvvvvvvo',
      'o3221111223o',
      'o3221111223o',
      'o3221111223o',
      'ovvvvvvvvvvo',
      'o3221111223o',
      'o3221111223o',
      'o3321122333o',
      'o3332222333o',
      '.o33333333o.',
      '..oo3333oo..',
      '...oooooo...'
    ]);
    S('fu_crate', [
      'o111111111111o',
      'o322222222223o',
      'o321111111123o',
      'o321oooooo123o',
      'o321o3223o123o',
      'o321o2112o123o',
      'o321o2112o123o',
      'o321o3223o123o',
      'o321oooooo123o',
      'o321111111123o',
      'o322222222223o',
      'o333333333333o',
      'oooooooooooooo',
      '.o..........o.'
    ]);
    S('fu_lamp', [
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '...oooooo...',
      '..oGGGGGGo..',
      '.oGYYYYYYGo.',
      'oGYWWWWWYYGo',
      'oYWWWWWWWYYo',
      'oYWWWWWWWYYo',
      'oGYWWWWWYYGo',
      '.oGYYYYYYGo.',
      '..oGGGGGGo..',
      '...oogyoo...',
      '....oyo.....',
      '.....o......',
      '............',
      '............',
      '............'
    ]);
    S('fu_window', [
      'oo11111111111111111111oo',
      'o1322222222222222222221o',
      'o32ooooooooooooooooooo3o',
      'o32ttttttttttoTTTTTTTo3o',
      'o32ttttTtttttoTTTTTTTo3o',
      'o32tttttttttcoTTTTcTTo3o',
      'o32ttcttttttcoTTcTTTTo3o',
      'o32tttttFttttoTTTTTTTo3o',
      'o32ttttFFttttoTfTTTTTo3o',
      'o32tttFFFtttcoTFfTTTTo3o',
      'o32ooooooooooooooooooo3o',
      'o32ttttttttttoTTTTTTTo3o',
      'o32ttttttcTttoTTTTTTTo3o',
      'o32tttWttttttoTTTTcTTo3o',
      'o32ttWWWttttcoTTTTTTTo3o',
      'o32tttWttFtttoTTfTTTTo3o',
      'o32ttttttFtttoTfFTTTTo3o',
      'o32ooooooooooooooooooo3o',
      'o1333333333333333333331o',
      'oo333333333333333333331o',
      '.oooooooooooooooooooooo.',
      '..o..................o..'
    ]);
    S('fu_pot', [
      '.......of.....',
      '......off*....',
      '.....offF*....',
      '....oFfF*.....',
      '...oFfFF*.o+..',
      '..offFF*.of*..',
      '..oFfF*.oFf*..',
      '.oFfFF*oFfF*..',
      '.ofFF*oFfFF*..',
      '..oFF*ofFF*...',
      '..ooffFF*o....',
      '...oofF*o.....',
      '.....offo.....',
      '..ouuuuuuuo...',
      '.oUUUUUUUUUo..',
      'oUVVVVVVVVVUo.',
      'oUVuuuuuuuVUo.',
      'oUVVVVVVVVVUo.',
      '.oUVVVVVVVUo..',
      '..oooooooooo..'
    ]);
    S('fu_picture', [
      'oGGGGGGGGGGGGGGGGGGo',
      'oGYYYYYYYYYYYYYYYYGo',
      'oGYooooooooooooooYGo',
      'oGYoiiiiiiiiiiiioYGo',
      'oGYoiiiiiwwiiiiioYGo',
      'oGYoiiiiwbbwiiiioYGo',
      'oGYoiiiiwWbwiiiioYGo',
      'oGYoiiiiobboiiiioYGo',
      'oGYoiiiitTTtiiiioYGo',
      'oGYoiiitTTTTtiiioYGo',
      'oGYoiitTTTTTTtiioYGo',
      'oGYoiitTTTTTTtiioYGo',
      'oGYooooooooooooooYGo',
      'oGyyyyyyyyyyyyyyyygo',
      'oGGGGGGGGGGGGGGGGGgo',
      '.oooooooooooooooooo.'
    ]);
    S('fu_rack', [
      'o1111111111111111o',
      'o3222222222222223o',
      'oooooooooooooooooo',
      '..ow....oB....og..',
      '..oW....oW....oY..',
      '..oW....oW....oY..',
      '..oWo...oWo...oYo.',
      '..obwo..obBo..ogyo',
      '..o11o..o11o..o11o',
      '..o32o..o32o..o32o',
      '..o32o..o32o..o32o',
      '..o32o..o32o..o32o',
      '..o32o..o32o..o32o',
      '..o32o..o32o..o32o',
      '..o33o..o33o..o33o',
      'o1111111111111111o',
      'o3222222222222223o',
      'oooooooooooooooooo',
      '.o..............o.',
      '.o..............o.',
      '.o..............o.',
      '.oo............oo.'
    ]);
    S('fu_stove', [
      '....oo........oo......',
      '...oPPo......oPPo.....',
      '...oPPo.....oPPo......',
      '..ohhhhhhhhhhhhhho...',
      '.oHHHHHHHHHHHHHHHHo..',
      'oHJJJJJJJJJJJJJJJJHo.',
      'oHJhhhhhhhhhhhhhhJHo.',
      'oHJhoooooooooooohJHo.',
      'oHJho$$$&&&$$$#ohJHo.',
      'oHJho$&&YYY&&$#ohJHo.',
      'oHJho$&YYYYY&$#ohJHo.',
      'oHJho$$&&YY&&$#ohJHo.',
      'oHJho##$$$$$$##ohJHo.',
      'oHJhoooooooooooohJHo.',
      'oHJJJJJJJJJJJJJJJJHo.',
      'oHHHHHHHHHHHHHHHHHHo.',
      'oHJhhhhhhhhhhhhhhJHo.',
      'oHHHHHHHHHHHHHHHHHHo.',
      'ooooooooooooooooooo..',
      '.o.o............o.o..'
    ]);
    S('fu_sink', [
      '.......ohho.......',
      '.......oHHo.......',
      '......ooHHoo......',
      'ohhhhhhhhhhhhhhho.',
      'oHHHHHHHHHHHHHHHHo',
      'oHJttttttttttttJHo',
      'oHJtTTTTTTTTTTtJHo',
      'oHJtTcccccccTTtJHo',
      'oHJttTTTTTTTTtJHo.',
      'oHHHHHHHHHHHHHHHo.',
      'o1111111111111111o',
      'o3222222222222223o',
      'o3333333333333333o',
      'oooooooooooooooooo'
    ]);
    S('fu_books', [
      '................',
      '...ooooooooo....',
      '..o###$$$$#Bo...',
      '..o#$$$$$$$Bo...',
      '..ooooooooooo...',
      '.offfff++fffBo..',
      '.of++++++++fBo..',
      '.ooooooooooooo..',
      'oGGGGyyyyyyyGBo.',
      'oGyyyyyyyyyyyBo.',
      'ooooooooooooooo.',
      'ottttcccccctTBo.',
      'otccccccccccTBo.',
      'ooooooooooooooo.'
    ]);
    S('fu_bunting', [
      'oooooooooooooooooooooooooooooooooooooooo',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'o####oo++++oooGGGGoo####oo++++oooGGGGooo',
      '.o$$$o.o+F+o.oGYYo.o$$$o.o+F+o.oGYYo.o$.',
      '.o$%$o.o+F+o.oGYYo.o$%$o.o+F+o.oGYYo.o$.',
      '..o$o...o*o...oYo...o$o...o*o...oYo...o.',
      '..o$o...o*o...oYo...o$o...o*o...oYo...o.',
      '...o.....o.....o.....o.....o.....o....o.',
      '........................................',
      '........................................',
      '........................................',
      '........................................'
    ]);
    S('fu_towel', [
      'o11111111111111o',
      'o32222222222233o',
      'oooooooooooooooo',
      '.o####o..o####o.',
      '.o$$$$o..o$$$$o.',
      '.o$%%$o..o$%%$o.',
      '.o$%%$o..o$%%$o.',
      '.oWWWWo..oGGGGo.',
      '.o$%%$o..o$%%$o.',
      '.o$%%$o..o$%%$o.',
      '.o$%%$o..o$%%$o.',
      '.o$$$$o..o$$$$o.',
      '.oo$%$oo.o$%$oo.',
      '..o$%$o..o$%$o..',
      '..o$$$o..o$$$o..',
      '..oo#oo..oo#oo..',
      '...ooo....ooo...',
      '................',
      '................',
      '................'
    ]);
    S('fu_board', [
      'o1111111111111111111o',
      'o3222222222222222223o',
      'o32ooooooooooooooo23o',
      'o32ozzzzzzzzzzzzzo23o',
      'o32ozBBBBzzBBBBBzo23o',
      'o32ozzzzzzzzzzzzzo23o',
      'o32ozBBBzzzBBzzzzo23o',
      'o32ozzzzzzzzzzzzzo23o',
      'o32ozBBBBBzzzBBzzo23o',
      'o32ozzzzzzzzzzzzzo23o',
      'o32ozzBBzzBBBzzzzo23o',
      'o32ozzzzzzzzzzzzzo23o',
      'o32ooooooooooooooo23o',
      'o3333333333333333333o',
      'ooooooooooooooooooooo',
      '..o...............o..'
    ]);
    S('fu_taps', [
      'o111111111111111111o',
      'o322222222222222223o',
      'oooooooooooooooooooo',
      '..og....og....og....',
      '..oY....oY....oY....',
      '.ooYoo.ooYoo.ooYoo..',
      '.oGYYo.oGYYo.oGYYo..',
      '.ooYoo.ooYoo.ooYoo..',
      '...oo...oo....oo....',
      '...og...og....og....',
      '..oooo.oooo..oooo...',
      '..oWWo.oWWo..oWWo...',
      '..oGGo.oGGo..oGGo...',
      '..oYYo.oYYo..oYYo...',
      '..oGgo.oGgo..oGgo...',
      '..oooo.oooo..oooo...',
      'o111111111111111111o',
      'oooooooooooooooooooo'
    ]);
    S('fu_forge', [
      '.....oooooo.........',
      '...oo$$$&&$oo.......',
      '..o$&&YYY&&$o.......',
      '..o$&YYYYY&$o...oo..',
      '..o$$&&Y&&$$o..oHHo.',
      '.oohhhhhhhhhoo.oHHo.',
      'oHHHHHHHHHHHHHooHHo.',
      'oHJJJJJJJJJJJHoHJHo.',
      'oHJhhhhhhhhhJHoHJHo.',
      'oHHHHHHHHHHHHHoHHHo.',
      'o1111111111111ooooo.',
      'o3222222222223o.....',
      'o3211111111123o.....',
      'o3222222222223o.....',
      'o3333333333333o.....',
      'oooooooooooooo......'
    ]);
  }

  /* ---------------------------------------------------------- */
  function build() {
    plush(); room();
  }

  return { build };
})();
