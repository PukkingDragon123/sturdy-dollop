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

    /* ---- his other three outfits ------------------------------------
       The phase telegraph. Same body, same pose - what changes is what
       the light catches, because that is what you read at a glance in
       the middle of a fight:
         gold  full plate where the mail was, trim knocked back to bone
               so it still reads, and a plume he did not earn
         ink   the octopus has taken him over: everything that caught
               light goes ROT, and the blond mop becomes a hood
         torn  the plate is off. Bare skin, wounds where the straps
               were, and the stolen crown finally cracked
       ---------------------------------------------------------------- */
    const K2 = (name, rows) => P.def(name, A(rows, 24, 44));
    K2('king2_gold0', [
      '....................oo..oo..oo.o%o...............',
      '...................oYYooYYooYYo%&%o..............',
      '...................oyWyyYyyYyyo$%&oozZo..........',
      '.................oMoGyYyGyYyGGo$%ooZAaao.........',
      '................oMmoggGGggGGggo$ooZAAaaaZo.......',
      '...............oMmmmmmmmmNNno...oAAAaaaaaZZo.....',
      '..............oMmmmmmmmmmmNNno.oAAAaaaaaaaZZo....',
      '..............qMmNNNNNNNNNNnno.oAAAaaaaaaaaZZo...',
      '..............qNmKKKKKKKKkSsno.oAAAaaaaaaaaaZZo..',
      '..............qNmKooKKoooKSsno.oAAAaaaaaaaaaZZzo.',
      '..............qNKoWpoKKoWpkSno.oAAaaaaaaaaaaZZzo.',
      '..............qNKKKKKKsKkkSsno.oAAaoooooooaaZZzo.',
      '..............qNKKKKKKsoKkSsno.oAAoWwwwwBboaZZzo.',
      '...............oKKKKKKoKkSsno..oAAowooooobcoaZzo.',
      '...............oKKoooooKkkSso..oAAowwwwwBboaZZzo.',
      '................oKKKWWKkkkSso..oAaaoooooooaZZzzo.',
      '................oKKKKKkkkkSso..oAaaZZZZZZZzzzzo..',
      '.................oKKkkkkSso....oAaaZZZZZzzzzzo...',
      '...................oSKkkkSo.....oaaZZZZzzzzzo....',
      '......qyYGGgyooAaaZzoBWWBwbBbooaaaZZZZZzzzzzo....',
      '...qyYGGGgyyooAaaaZzooYyGGyGGyooaaaZZZZZZzzzzzo..',
      '..qyYGGGgyyooAaxaZzooYyGGyGGyyooaaaZZZZZZZzzzzzo.',
      '...qgGGgyo.oAaaaZzoowByGGyGGyBbo.oAaaZZzzo.oaZZzo',
      '.oAaxZo....oxaxaxzooywBGyGGyBbyo.oxaxaxazo..oxZzo',
      'oAaaZo....oYyGyo...oywByGGyBbyo...oYyGyo...oaZZzo',
      'oxaZzo....oYyGyo...oyGwBBbGGyo....oYyGyo..oxaZZzo',
      'oAaaZo....oYyGyo...oyGGbBBGGyo....oYyGyo..oaaZZzo',
      '.oxaaZo....oAaaZzo..oyGGyGGyyo...oYyGyo.oxaZZzo..',
      '..oaaZzo...oxaxaxo..oyGyGGyGyo..oAaaZzo.oaZZzo...',
      '...oxaZzo...oYyGyo.oyGGyGGyGGyo.oxaxaxo..oaZZzo..',
      '....oaZZzo..obBGGyoooyGyGGyGGGyooYyGGyo...oaZZzo.',
      '.....oazo...oBWGgyoooyGGyGGyGGyoobBGgyo....oZzo..',
      '............ooGgyoobBWoWWoWWboooGgyo.............',
      '..............oybbBBWWBBBBWWBBbbyo...............',
      '..........oaZooYyGGyGGyGGyGGyGGyyooaZo...........',
      '.......oAaZzo.oYyGGyGyo..oYyGyGGyo..oaZZzo.......',
      '....oAaaxZo..qYyGGyGyo..qYyGyGGyGyo..oaaxZZo.....',
      '..oAaaZo.....qYyGyGGyo..qbBWBBwwwbo....oaaZZzo...',
      'oAxaaZo......qbBWBBwbo..qYyGGyGGyyo.....oaxZZzo..',
      'oAaaZo.......qYyGGyGyo..qYyGyGGyGyo......oaZZzo..',
      '.oxaaZo......qYyGyGGyo..qYyGGyGGyyo.....oxaZzo...',
      '...oaaZzo.qggyyyyyyyyoo.qggyyyyyyyyoo..oaZzo.....',
      '..........qBBgyyyyyyyoo.qgyyyyyyyBBoo............',
      '..........ooooooooooooo.ooooooooooooo............'
    ]);
    K2('king2_ink0', [
      '....................oo..oo..oo...................',
      '...................oYYooYYooYYo..................',
      '...................oyWyyYyyYyyo....ozZo..........',
      '.................oMoGyYyGyYyGGo...oZAaao.........',
      '................oMmoggGGggGGggo..oZAAaaaZo.......',
      '...............oAaaaaaaaaZZzo...oAAAaaaaaZZo.....',
      '..............oAaaaaaaaaaaZZzo.oAAAaaaaaaaZZo....',
      '..............qAaZZZZZZZZZZzzo.oAAAaaaaaaaaZZo...',
      '..............qZaKKKKKKKKkSszo.oAAAaaaaaaaaaZZo..',
      '..............qNmZooZZoooZSsno.oAAAaaaaaaaaaZZzo.',
      '..............qNZoWpoZZoWpkSno.oAAaaaaaaaaaaZZzo.',
      '..............qNKKKKKKsKkkSsno.oAAaoooooooaaZZzo.',
      '..............qNKKKKKKsoKkSsno.oAAoWwwwwBboaZZzo.',
      '...............oKKKKKKoKkSsno..oAAowooooobcoaZzo.',
      '...............oKKoooooKkkSso..oAAowwwwwBboaZZzo.',
      '................oKKKWWKkkkSso..oAaaoooooooaZZzzo.',
      '................oKKKKKkkkkSso..oAaaZZZZZZZzzzzo..',
      '.................oKKkkkkSso....oAaaZZZZZzzzzzo...',
      '...................oSKkkkSo.....oaaZZZZzzzzzo....',
      '......qaAZZzZooAaaZzoaZZaZzazooaaaZZZZZzzzzzo....',
      '...qaAZZZzZZooAaaaZzooAaZZaZZZooaaaZZZZZZzzzzzo..',
      '..qaAZZZzZZooAaxaZzooAaZZaZZaZooaaaZZZZZZZzzzzzo.',
      '...qzZZzZo.oAaaaZzooZaaZZaZZaazo.oAaaZZzzo.oaZZzo',
      '.oAaxZo....oxaxaxzooaZaZaZZaazZo.oxaxaxazo..oxZzo',
      'oAaaZo....oAaZZo...oaZaaZZaazZo...oAaZZo...oaZZzo',
      'oxaZzo....oAaZZo...oaZZaazZZZo....oAaZZo..oxaZZzo',
      'oAaaZo....oAaZZo...oaZZzaaZZZo....oAaZZo..oaaZZzo',
      '.oxaaZo....oAaaZzo..oaZZaZZaZo...oAaZZo.oxaZZzo..',
      '..oaaZzo...oxaxaxo..oaZaZZaZZo..oAaaZzo.oaZZzo...',
      '...oxaZzo...oAaZZo.oaZZaZZaZZZo.oxaxaxo..oaZZzo..',
      '....oaZZzo..ozaZZZoooaZaZZaZZZZooAaZZZo...oaZZzo.',
      '.....oazo...oaZZzZoooaZZaZZaZZZoozaZzZo....oZzo..',
      '............ooZzZoozaZoWZoZZzoooZzZo.............',
      '..............oZzzaaZZaaaaZZaazzZo...............',
      '..........oaZooAaZZaZZaZZaZZaZZaZooaZo...........',
      '.......oAaZzo.oAaZZaZZo..oAaZaZZZo..oaZZzo.......',
      '....oAaaxZo..qAaZZaZZo..qAaZaZZaZZo..oaaxZZo.....',
      '..oAaaZo.....qAaZaZZZo..qzaZaaZZZzo....oaaZZzo...',
      'oAxaaZo......qzaZaaZzo..qAaZZaZZaZo.....oaxZZzo..',
      'oAaaZo.......qAaZZaZZo..qAaZaZZaZZo......oaZZzo..',
      '.oxaaZo......qAaZaZZZo..qAaZZaZZaZo.....oxaZzo...',
      '...oaaZzo.qzzZZZZZZZZoo.qzzZZZZZZZZoo..oaZzo.....',
      '..........qaazZZZZZZZoo.qzZZZZZZZaaoo............',
      '..........ooooooooooooo.ooooooooooooo............'
    ]);
    K2('king2_torn0', [
      '....................oo..oo.......................',
      '...................oYYooYo.......................',
      '...................oyWyyYo.o...ozZo..............',
      '.................oMoGyYyGo.oo..oZAaao............',
      '................oMmoggGGgo...o..oZAAaaaZo........',
      '...............oMmmmmmmmmNNno...oAAAaaaaaZZo.....',
      '..............oMmmmmmmmmmmNNno.oAAAaaaaaaaZZo....',
      '..............qMmNNNNNNNNNNnno.oAAAaaaaaaaaZZo...',
      '..............qNmKKKKKKKKkSsno.oAAAaaaaaaaaaZZo..',
      '..............qNmKooKKoooKSsno.oAAAaaaaaaaaaZZzo.',
      '..............qNKoWpoKKoWpkSno.oAAaaaaaaaaaaZZzo.',
      '..............qNKKKKKKsKkkSsno.oAAaoooooooaaZZzo.',
      '..............qNKKKKKKsoKkSsno.oAAoWwwwwBboaZZzo.',
      '...............oKKKKKKoKkSsno..oAAowooooobcoaZzo.',
      '...............oKKoooooKkkSso..oAAowwwwwBboaZZzo.',
      '................oKKKWWKkkkSso..oAaaoooooooaZZzzo.',
      '................oKKKKKkkkkSso..oAaaZZZZZZZzzzzo..',
      '.................oKKkkkkSso....oAaaZZZZZzzzzzo...',
      '...................oSKkkkSo.....oaaZZZZzzzzzo....',
      '......qkKSSssooAaaZzo$%%$$#$#ooaaaZZZZZzzzzzo....',
      '...qkKSSSsssooAaaaZzooKkSSkSSsooaaaZZZZZZzzzzzo..',
      '..qkKSSSsssooAaxaZzooKkSSkSSksooaaaZZZZZZZzzzzzo.',
      '...qsSSsso.oAaaaZzoo$$kSSkSSk$#o.oAaaZZzzo.oaZZzo',
      '.oAaxZo....oxaxaxzook$$SkSSk$#so.oxaxaxazo..oxZzo',
      'oAaaZo....oKkSso...o#%$&%#$kSso...oKkSso...oaZZzo',
      'oxaZzo....oKkSso...o#$%%$#kSso....oKkSso..oxaZZzo',
      'oAaaZo....oKkSso...okSS#$$SSso....oKkSso..oaaZZzo',
      '.oxaaZo....oAaaZzo..okSSkSSkso...oKkSso.oxaZZzo..',
      '..oaaZzo...oxaxaxo..okSkSSkSso..oAaaZzo.oaZZzo...',
      '...oxaZzo...oKkSso.okSSkSSkSSso.oxaxaxo..oaZZzo..',
      '....oaZZzo..o#$SSsoookSkSSkSSSsooKkSSso...oaZZzo.',
      '.....oazo...o$%SssoookSSkSSkSSsoo#$Ssso....oZzo..',
      '............ooSssoo#$%oW%o%%#oooSsso.............',
      '..............os##$$%%$$$$%%$$##so...............',
      '..........oaZooKkSSkSSkSSkSSkSSksooaZo...........',
      '.......oAaZzo.oKkSSkSso..oKkSkSSso..oaZZzo.......',
      '....oAaaxZo..qKkSSkSso..qKkSkSSkSso..oaaxZZo.....',
      '..oAaaZo.....qKkSkSSso..q#$%$$$$$#o....oaaZZzo...',
      'oAxaaZo......q#$%$$$#o..qKkSSkSSkso.....oaxZZzo..',
      'oAaaZo.......qKkSSkSso..qKkSkSSkSso......oaZZzo..',
      '.oxaaZo......qKkSkSSso..qKkSSkSSkso.....oxaZzo...',
      '...oaaZzo.qSSssssssssoo.qSSssssssssoo..oaZzo.....',
      '..........q$$Ssssssssoo.qSsssssss$$oo............',
      '..........ooooooooooooo.ooooooooooooo............'
    ]);

    P.anim('king2_gold', ['king2_gold0'], 6);
    P.anim('king2_ink', ['king2_ink0'], 6);
    P.anim('king2_torn', ['king2_torn0'], 6);

    /* ==========================================================
       B. THE OCTOPUS ARMY. Five soldiers, told apart by
       SILHOUETTE before colour, because in a boss fight you only
       get the shape:
         grunt   conical helmet, spear planted, four arms down
         brute   fat mantle over a plate breastplate, two fists
         caster  long hood and a lit orb held out in front
         swarm   a hatchling. Mantle, three arms, no gear at all
         ink     a swollen sac, dripping, nothing else
       Every one of them keeps the King's ROT purple and the same
       white eye with an INK.1 slit, so they read as HIS.
       ========================================================== */
    const O = (name, rows) => P.def(name, A(rows, (rows[0].length >> 1), rows.length));
    O('octo_grunt0', [
      '.......ohho.......',
      '......ohHJho......',
      '.....ohHJJJho.....',
      '....oAaZZZZzzo....',
      '...oAaaZZZZZzzo...',
      '..oAaaaZZZZZZzzo..',
      '..oAaWWaZoWWZzzo..',
      '..oAaWpaZoWpZzzo..',
      '..oAaaaZZZZZZzzo..',
      '..oAaaZZZZZZZzzo..',
      '...oAaZZZZZZzzo...',
      '..oxaoZZZZZZoazo..',
      '.oxaxaoooooooaxzo.',
      'oxaxaxo.....oxaxzo',
      'oaxaxo..hh...oaxzo',
      'oxaxo...HH....oxzo',
      '.oao....HH.....oo.',
      '..o.....HH........',
      '........oo........',
      '..................'
    ]);
    O('octo_brute0', [
      '........oAAaaZZo..........',
      '......oAAaaaaZZZzo........',
      '.....oAaaaaaaZZZZzo.......',
      '....oAaaaaaaaaZZZZzo......',
      '...oAaaaaaaaaaaZZZZzo.....',
      '...oAaWWWaaZZoWWWZZzo.....',
      '...oAaWppWaZZoWppWZzo.....',
      '...oAaaWWaaaZZoWWZZzo.....',
      '...oAaaaaaaaaaaZZZZzo.....',
      '....oAaaaaaaaaZZZZzo......',
      '...ohhhhhhhhhhhhhhho......',
      '..oHJJJJJJJJJJJJJJJHo.....',
      '..oHJhhhhhhhhhhhhhJHo.....',
      '..oHJhoooooooooooohJHo....',
      '..oHJJJJJJJJJJJJJJJHo.....',
      '..oHHHHHHHHHHHHHHHHHo.....',
      '.oxaoHJJJJJJJJJJJJJHoazo..',
      'oxaxaoHHHHHHHHHHHHHoaxzo..',
      'oaxaxo.oooooooooooo.oaxzo.',
      'oxaxo..............oxaxzo.',
      'oaxo...oAAao..oAAao..oaxzo',
      'oxo...oAaaaZo.oAaaZo..oxzo',
      '.o....oAaaaZo.oAaaZo...oo.',
      '.......oooooo.oooooo......'
    ]);
    O('octo_caster0', [
      '.......oo.........',
      '......ozzo........',
      '.....oZzzzo.......',
      '....oZZzzzzo......',
      '...oAZZzzzzzo.....',
      '...oAaZZzzzzzo....',
      '..oAaaZZZzzzzzo...',
      '..oAaoWWoZoWWzo...',
      '..oAaoWpoZoWpzo...',
      '..oAaaZZZZZzzzo...',
      '..oAaaZZZZZzzzo...',
      '...oAaZZZZzzzo....',
      '...oAaZZZZzzzo....',
      '..oxaoZZZZoazo....',
      '.oxaxaoooooaxzo...',
      'oxaxaxo...oxaxzo..',
      'oaxaxo.oCCo.oaxzo.',
      'oxaxo.oCWWCo.oxzo.',
      '.oao.oCWWWWCo.oo..',
      '..o..oCWWWWCo.....',
      '......oCCCCo......',
      '.......oooo.......'
    ]);
    O('octo_swarm0', [
      '...oAaZzo...',
      '..oAaaZZzo..',
      '.oAaaaZZZzo.',
      '.oAaWaZoWzo.',
      '.oAaWaZoWzo.',
      '.oAaaaZZZzo.',
      '..oAaZZZzo..',
      '..oxaoZazo..',
      '.oxaxaoaxzo.',
      'oxaxo.oxaxzo',
      'oaxo...oaxzo',
      '.oo.....oo..'
    ]);
    O('octo_ink0', [
      '......ozZZzo......',
      '....ozZZZZZZzo....',
      '...ozZZZZZZZZzo...',
      '..ozZZZZZZZZZZzo..',
      '..oZZZZZZZZZZZZo..',
      '..oZZoWWoZoWWZZo..',
      '..oZZoWpoZoWpZZo..',
      '..oZZZZZZZZZZZZo..',
      '..ozZZZZZZZZZZzo..',
      '...ozZZZZZZZZzo...',
      '..oxzoZZZZZZozzo..',
      '.oxzxzoooooozxzo..',
      'oxzxzo.....ozxzzo.',
      'ozxzo..ozo...ozzo.',
      'oxzo..oZZo....ozo.',
      '.oo...oZZo.....oo.',
      '.......oo.oo......',
      '..........oo......',
      '.......oo.........',
      '.......oo.........'
    ]);

    P.anim('octo_grunt', ['octo_grunt0'], 5);
    P.anim('octo_brute', ['octo_brute0'], 5);
    P.anim('octo_caster', ['octo_caster0'], 5);
    P.anim('octo_swarm', ['octo_swarm0'], 7);
    P.anim('octo_ink', ['octo_ink0'], 5);
    const TH = (name, rows) => P.def(name, A(rows, 0, rows.length));

    /* ---- the seat he stole ------------------------------------------
       Coral and gold, and an octopus arm already grown over the back:
       he has been sitting in it long enough for the thing to take root.
       Anchored bottom-left so it lands on a 3x4 tile footprint. */
    TH('bk_throne', [
      '........oGGGGo..........',
      '.......oGYYYYGo.........',
      '......oGYWWWWYGo....ozZo',
      '......oGYWWWWYGo...oZAao',
      '.......oGYYYYGo...oZAaao',
      '........oGyygo...oZAaaZo',
      '.......orrrrro..oZAaaZzo',
      '......orRRxxRro.oAaaZZzo',
      '.....orRxxxxxRro.oaaZZzo',
      '....orRxxXXxxxRro.oaZZzo',
      '....oRxxXXXXxxRo.oaZZzzo',
      '....oRxxXXXXxxRo.oaZZzo.',
      '....oRxxXXXXxxRo.oZzzo..',
      '....oRxxXXXXxxRoozzo....',
      '....oRxxXXXXxxRozo......',
      '....oRxxXXXXxxRo........',
      '....oRxxXXXXxxRo........',
      '...orRxxXXXXxxRro.......',
      '..orRxxxxxxxxxxRro......',
      '.orRxxxxxxxxxxxxRro.....',
      'oRxxxxxxxxxxxxxxxxRo....',
      'oRxxGGGGGGGGGGGGxxRo....',
      'oRxxGYYYYYYYYYYGxxRo....',
      'oRxxGYYYYYYYYYYGxxRo....',
      'oRxxGGGGGGGGGGGGxxRo....',
      'oRxxxxxxxxxxxxxxxxRo....',
      'oRRxxxxxxxxxxxxxxRRo....',
      'orRRxxxxxxxxxxxxRRro....',
      '.orrRRRRRRRRRRRRrro.....',
      '.oGo.oooooooooo.oGo.....',
      '.oYo............oYo.....',
      '.ooo............ooo.....'
    ]);
  }

  return { build };
})();
