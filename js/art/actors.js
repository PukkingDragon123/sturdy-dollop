/* ============================================================
   art/actors.js - everything alive in CROWNDEEP, drawn by hand
   one character per pixel: the deposed King, the things that
   want to eat him, the things he rides, and the neighbours.

   House rules obeyed everywhere below:
     - light falls from the UPPER LEFT. Highlights top-left,
       shade bottom-right, on every single sprite.
     - 1px selective outline: INK.0 on the shadow side, INK.2
       on the lit side, so nothing is a flat black cutout.
     - silhouette first. If the black shape is not nameable the
       shading will not save it.
     - nothing is mirrored down its centre line. An eye is
       always off, a fold is always broken.
   ============================================================ */
KD.art.actors = (function () {
  const P = KD.PX;

  /* ---- ONE character table for the whole file ---------------
     Every sprite below shares it, so the King's teal is the
     Princess's teal and a recolour is a one-line edit.
       o p q P  INK    (0..3)      s S k K  SKIN
       b B w    BONE   W = white   g G y Y  GOLD
       t T c C  WATER              i d D e E  DEEP (5)
       n N m M  SAND               r R x X  CORAL
       f F + *  KELP               u U v V  RUST
       h H j J  STONE              z Z a A  ROT
       # $ % &  BLOOD              1 2 3 4  WOOD
       5 6 7 8  CLOTH
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
    '#': 'BLOOD.0', '$': 'BLOOD.1', '%': 'BLOOD.2', '&': 'BLOOD.3',
    1: 'WOOD.0', 2: 'WOOD.1', 3: 'WOOD.2', 4: 'WOOD.3',
    5: 'CLOTH.0', 6: 'CLOTH.1', 7: 'CLOTH.2', 8: 'CLOTH.3'
  };

  /* every sprite below is { pal: C, ax, ay, px }; this just keeps
     eighty of those from being eighty copies of the same boilerplate */
  const A = (px, ax, ay) => ({ pal: C, ax: ax, ay: ay, px: px });

  function build() {
    /* ==========================================================
       A. THE KING  12x18, anchored between his boots.
       Weathered bald pate, a PALE band across the forehead where
       the crown used to sit, white beard to the belly, teal
       tunic, gold belt losing an argument with the belly, red
       cape trailing on his left, brown boots. Shoulders 7px
       wide, belly 12px wide: he is a pear and he is sad.
       ========================================================== */
    P.def('king_idle0', A([
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      '.o%wwpBBbTo.',
      '.o%$wBBbTto.',
      'o%$bwBbTTto.',
      'o%$CcbBTTtto',
      'o%cCCcTTTTto',
      'o%gyYYyGGGgo',
      'o%$ccTTTto..',
      'o%$o65o65o..',
      'o%$ovUuovUuo',
      '.ooouuoouuuo'
    ], 6, 18));

    /* breath: head settles a pixel, beard shortens, belly holds */
    P.def('king_idle1', A([
      '............',
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      '.o%$wBBbTto.',
      'o%$bwBbTTto.',
      'o%$CcbBTTtto',
      'o%cCCcTTTTto',
      'o%gyYYyGGGgo',
      'o%$ccTTTto..',
      'o%$o65o65o..',
      'o%$ovUuovUuo',
      '.ooouuoouuuo'
    ], 6, 18));

    /* --- walk, 6 frames: contact / down / passing, twice.
       He moves right, so forward is right. Down frames drop the
       whole torso a pixel onto the planted foot; passing frames
       lift it and swing a boot through the air. --- */
    P.def('king_walk0', A([
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      '.o%wwpBBbTo.',
      '.o%$wBBbTto.',
      'o%$bwBbTTto.',
      'o%$CcbBTTtto',
      'o%cCCcTTTTto',
      'o%gyYYyGGGgo',
      'o%$ccTTTto..',
      'o%$o65oo65o.',
      'o%$ouUuovUuo',
      '.ooouuuouuuo'
    ], 6, 18));

    P.def('king_walk1', A([
      '............',
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      '.o%$wBBbTto.',
      'o%$bwBbTTto.',
      'o%$CcbBTTtto',
      'o%cCCcTTTTto',
      'o%gyYYyGGGgo',
      'o%$ccTTTto..',
      'o%$.o65o65o.',
      'o%$.ouuovUuo',
      '.....ououuuo'
    ], 6, 18));

    P.def('king_walk2', A([
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      'o%$wwpBBbTo.',
      'o%$$wBBbTto.',
      'o%$bwBbTTto.',
      '.o$CcbBTTtto',
      '.ocCCcTTTTto',
      '.ogyYYyGGGgo',
      '..oqcTTTTto.',
      '....o65oovVo',
      '....ovUuouuo',
      '....ouuuo...'
    ], 6, 18));

    P.def('king_walk3', A([
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      '.o%wwpBBbTo.',
      '.o%$wBBbTto.',
      'o%$bwBbTTto.',
      'o%$CcbBTTtto',
      'o%cCCCTTTTto',
      'o%gGyYYyGGgo',
      'o%$ccTTTto..',
      'o%$o55oo65o.',
      'o%$ovUuouUuo',
      '.ooouuuouuuo'
    ], 6, 18));

    P.def('king_walk4', A([
      '............',
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      '.o%$wBBbTto.',
      'o%$bwBbTTto.',
      'o%$CcbBTTtto',
      'o%cCCCTTTTto',
      'o%gGyYYyGGgo',
      'o%$ccTTTto..',
      'o%$.o56o65o.',
      'o%$.ovUouuuo',
      '....ouuoouuo'
    ], 6, 18));

    P.def('king_walk5', A([
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBbo..',
      'o%$wwpBBbTo.',
      'o%$$wBBbTto.',
      'o%$bwBbTTto.',
      '.o$CcbBTTtto',
      '.ocCCCTTTTto',
      '.ogyYYyGGGgo',
      '..oqcTTTTto.',
      '....o55oovVo',
      '....ouuuovUo',
      '....ouuuo...'
    ], 6, 18));

    /* --- swim: he is horizontal, head right, belly slung under,
       cape streaming back and up over his kicking boots. Same
       12x18 box and same anchor as every other King frame. --- */
    P.def('king_swim0', A([
      '............',
      '............',
      '............',
      '...oooo.....',
      '..o%%%%o....',
      '.o%%%$$ooooo',
      '.oo$$$cKKKko',
      '...ocCCkkoKo',
      '..oTTcCkwwo.',
      '..oTTTbwwBo.',
      '.o6tTTbwBo..',
      'ovUotTtobo..',
      '.ouuoooo....',
      '............',
      '............',
      '............',
      '............',
      '............'
    ], 6, 18));

    P.def('king_swim1', A([
      '............',
      '............',
      '...ooo......',
      '..o%%oo.....',
      '.o%%%%%o....',
      '.o%%$$$ooooo',
      '..o$$$cKKKko',
      '...ocCCkkoKo',
      '..oTTcCkwwo.',
      '.ooTTTbwwBo.',
      'ovUotTbwBo..',
      '.ouuotTtobo.',
      '....oooo....',
      '............',
      '............',
      '............',
      '............',
      '............'
    ], 6, 18));

    P.def('king_swim2', A([
      '............',
      '............',
      '............',
      '...oooo.....',
      '..o%%%%o....',
      '.o%%%$$ooooo',
      '.oo$$$cKKKko',
      '...ocCCkkoKo',
      '..oTTcCkwwo.',
      '..oTTTbwwBo.',
      '.o6tTTbwBo..',
      '.o6otTtobo..',
      'ovUooooo....',
      '.ouuo.......',
      '............',
      '............',
      '............',
      '............'
    ], 6, 18));

    P.def('king_swim3', A([
      '............',
      '............',
      '............',
      '..ooooo.....',
      '.o%%%%%o....',
      '.o%%%$$ooooo',
      '.oo$$$cKKKko',
      '...ocCCkkoKo',
      '..oTTcCkwwo.',
      '..oTTTbwwBo.',
      '..o6tTbwBo..',
      '.ovUottobo..',
      '..ouuooo....',
      '............',
      '............',
      '............',
      '............',
      '............'
    ], 6, 18));

    /* --- mining: wind up overhead, strike down through the
       middle, recover. The pick shaft rides in front of him. --- */
    P.def('king_mine0', A([
      '.....ooooVvo',
      '....okkSouUo',
      '...oKKKKKo3o',
      '..oBKKKKKko3',
      '..oBkokoSBo3',
      '..oBskKKsBo3',
      '...owwwBbo.3',
      '..owwppBboK3',
      '.o%wwpBBbTko',
      '.o%$wBBbTto.',
      'o%$bwBbTTto.',
      'o%$CcbBTTtto',
      'o%cCCcTTTTto',
      'o%gyYYyGGGgo',
      'o%$ccTTTto..',
      'o%$o65o65o..',
      'o%$ovUuovUuo',
      '.ooouuoouuuo'
    ], 6, 18));

    P.def('king_mine1', A([
      '............',
      '......ooo...',
      '.....okkSo..',
      '....oKKKKKo.',
      '...oBKKKKKko',
      '...oBkokoSBo',
      '...oBskKKsBo',
      '....owwwBbo.',
      '...owwppBbko',
      '.o%wwpBBbT3o',
      'o%$$wBBbTt3o',
      'o%$bwBbTT3uo',
      'o%$CcbBT3vVo',
      'o%cCCcTToUuo',
      'o%gyYYyGGGgo',
      'o%$ccTTTto..',
      'o%$ovUuovUuo',
      '.ooouuoouuuo'
    ], 6, 18));

    P.def('king_mine2', A([
      '.....ooo....',
      '....okkSo...',
      '...oKKKKKo..',
      '..oBKKKKKko.',
      '..oBkokoSBo.',
      '..oBskKKsBo.',
      '...owwwBbo..',
      '..owwppBboKo',
      '.o%wwpBBbTk3',
      '.o%$wBBbTto3',
      'o%$bwBbTTtuV',
      'o%$CcbBTTtUo',
      'o%cCCcTTTTto',
      'o%gyYYyGGGgo',
      'o%$ccTTTto..',
      'o%$o65o65o..',
      'o%$ovUuovUuo',
      '.ooouuoouuuo'
    ], 6, 18));

    /* --- hurt: knocked back, eyes shut, mouth open, cape thrown
       forward past him --- */
    P.def('king_hurt', A([
      '....ooo.....',
      '...okkSo....',
      '..oKKKKKo...',
      '.oBKKKKKko..',
      '.oBooooqBo..',
      '.oBskKKsBo..',
      '..owwwBbo...',
      '.owwoooBbo..',
      '.owwpBBbTo%o',
      '.owwBBbTto%$',
      'obwBbTTto%$.',
      'oCcbBTTtto%$',
      'ocCCcTTTTt%$',
      'ogyYYyGGGgo$',
      'oqccTTTTto..',
      '..o65o65o...',
      '.ovUuovUuo..',
      '..ouuoouuuo.'
    ], 6, 18));

    /* --- dead: flat on his back, boots to the right, beard
       splayed, the bare crown band pointing at the ceiling --- */
    P.def('king_dead', A([
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '.........oo.',
      '........ovUo',
      '........ovUo',
      '....ooooouuo',
      '...o%%$$o6o.',
      'ooKKKo%$$cTo',
      'oKoKowwgyYGo',
      'oKkoowwcTtuo',
      'oooooooooooo'
    ], 6, 18));

    P.anim('king_idle', ['king_idle0', 'king_idle1'], 3);
    P.anim('king_walk', ['king_walk0', 'king_walk1', 'king_walk2',
      'king_walk3', 'king_walk4', 'king_walk5'], 10);
    P.anim('king_swim', ['king_swim0', 'king_swim1', 'king_swim2', 'king_swim3'], 8);
    P.anim('king_mine', ['king_mine0', 'king_mine1', 'king_mine2'], 12);

    /* =========================================================
       B. ENEMIES. Silhouette first: every one of these has to be
       nameable from its black shape. Anchors are bottom-centre.
       ======================================================== */

    /* reef crawler - low armoured woodlouse, five leg pairs, ribbed shell */
    P.def('crawler0', A([
      '....ooooo.H.',
      '..oJJpJjpJo.',
      '.oJJpJjpJjho',
      'oJjpJjpJjHyo',
      'ojHpjHpjHhho',
      '.ohHphHphHo.',
      '..oooooooo..',
      '.H.H.H.H.H..',
      '.H.H.H.H.H..',
      'h.h.h.h.h...'
    ], 6, 10));

    P.def('crawler1', A([
      '....ooooo..H',
      '..oJJpJjpJo.',
      '.oJJpJjpJjho',
      'oJjpJjpJjHyo',
      'ojHpjHpjHhho',
      '.ohHphHphHo.',
      '..oooooooo..',
      '..H.H.H.H.H.',
      '..H.H.H.H.H.',
      '..h.h.h.h.h.'
    ], 6, 10));

    P.def('crawler2', A([
      '....oooooH..',
      '..oJJpJjpJo.',
      '.oJJpJjpJjho',
      'oJjpJjpJjHyo',
      'ojHpjHpjHhho',
      '.ohHphHphHo.',
      '..oooooooo..',
      '.H.H.H.H.H..',
      '..H.H.H.H.H.',
      '...h.h.h.h.h'
    ], 6, 10));

    P.anim('crawler_move', ['crawler0', 'crawler1', 'crawler2'], 8);

    /* snapper crab - the claw is the silhouette, the body is an afterthought */
    P.def('snapper0', A([
      '................',
      '................',
      '...w............',
      '...R.w....oooo..',
      '...R.R...oXXXxo.',
      '..oooooo.oXXxxxo',
      '.oXXxxRoRRxRo...',
      '.oXxxRRrRRRRrro.',
      '.oxRRrro..oRrrro',
      '..ooooo....oooo.',
      '..R.R.R.........',
      '.r.r.r..........'
    ], 8, 12));

    P.def('snapper1', A([
      '................',
      '................',
      '...R............',
      '...R.w....oooo..',
      '...R.R...oXXXxo.',
      '..oooooo.oXXxxo.',
      '.oXXxxRoRRxRoo..',
      '.oXxxRRrRRRRrro.',
      '.oxRRrro..oRrrro',
      '..ooooo....oooo.',
      '..R.R.R.........',
      '..r.r.r.........'
    ], 8, 12));

    P.def('snapper2', A([
      '................',
      '................',
      '...w............',
      '...R.w....ooo...',
      '...R.R...oXXxo..',
      '..oooooo.oXXxxxo',
      '.oXXxxRoRRxRrro.',
      '.oXxxRRrRRRRrro.',
      '.oxRRrro..oRrro.',
      '..ooooo....ooo..',
      '...R.R.R........',
      '...r.r.r........'
    ], 8, 12));

    P.anim('snapper_idle', ['snapper0', 'snapper1', 'snapper2'], 6);

    /* urchin - spiked ball of rot. Spines are 1-2px and asymmetric */
    P.def('urchin0', A([
      '...A.a....',
      '..oAoao...',
      '.AoAaaZoa.',
      '.oAaaaZZo.',
      'AAaaaZZZo.',
      '.oaaZZZzaa',
      '.oZaZZzzo.',
      '.ZoZZzzoz.',
      '..oZozo...',
      '...Z.z....'
    ], 5, 10));

    P.def('urchin1', A([
      '....A.a...',
      '..ooAoa...',
      '.AoAaaZoa.',
      'AAaaaaZZo.',
      '.oAaaZZZaa',
      '.oaaZZZzo.',
      '.ZoZaZzzo.',
      '..oZZzzoz.',
      '..oZoZo...',
      '...Z.z....'
    ], 5, 10));

    P.anim('urchin_idle', ['urchin0', 'urchin1'], 4);

    /* jelly - bell is 50% dither so you can see through it; coral fringe */
    P.def('jelly0', A([
      '....qqqq....',
      '..qCCCCcq...',
      '.qCCcCcccq..',
      'qC.c.c.c.cTq',
      'q.c.c.c.c.Tq',
      'qc.c.c.c.cTq',
      'q.c.c.c.c.Tq',
      '.qcxcxcxcTq.',
      '..qxRxRxRq..',
      '..R.R..R.R..',
      '..R.R..R.R..',
      '.R..R...R.R.',
      '.x..x...x.x.',
      '..x.x..x.x..',
      '..x.x..x.x..',
      '...x.x.x.x..'
    ], 6, 16));

    P.def('jelly1', A([
      '............',
      '....qqqq....',
      '..qCCCCcq...',
      '.qCCcCcccq..',
      'qC.c.c.c.cTq',
      'q.c.c.c.c.Tq',
      '.qcxcxcxcTq.',
      '..qxRxRxRq..',
      '...R.R.R.R..',
      '..R.R..R.R..',
      '.R..R..R..R.',
      '.x..x..R..x.',
      '.x.x...x..x.',
      '..x.x..x.x..',
      '...x.x.x.x..',
      '...x.x.x.x..'
    ], 6, 16));

    P.def('jelly2', A([
      '....qqqq....',
      '...qCCCcq...',
      '..qCcCcccq..',
      '.qC.c.c.cTq.',
      'qc.c.c.c.cTq',
      'q.c.c.c.c.Tq',
      'qc.c.c.c.cTq',
      '.qcxcxcxcTq.',
      '..qxRxRxRq..',
      '..R.R..R.R..',
      '.R..R..R..R.',
      '.x..x..R..x.',
      '.x.x...x..x.',
      '..x.x..x.x..',
      '...x.x.x.x..',
      '...x.x.x.x..'
    ], 6, 16));

    P.def('jelly3', A([
      '............',
      '....qqqq....',
      '..qCCCCcq...',
      '.qCCcCcccq..',
      'qC.c.c.c.cTq',
      'q.c.c.c.c.Tq',
      '.qcxcxcxcTq.',
      '..qxRxRxRq..',
      '..R.R..R.R..',
      '..R.R..R.R..',
      '..R.R..R.R..',
      '.R..R...R.R.',
      '.x..x...x.x.',
      '..x.x..x.x..',
      '..x.x..x.x..',
      '...x.x.x.x..'
    ], 6, 16));

    P.anim('jelly_idle', ['jelly0', 'jelly1', 'jelly2', 'jelly3'], 6);

    /* reef shark - DEEP back, BONE belly, teeth on the front of the mouth */
    P.def('shark0', A([
      '.............oo.................',
      '............oeeo................',
      'oo..........oeDDo...............',
      'odo.........oeDDdo..............',
      'oddo.......oeDDDddo.............',
      'odddo....oeeDDDDdddoooooooooooo.',
      'oddddddddDDDDDDDDDDDDDDDDDDwDddo',
      '..odddddddDDeeeeeeeeeeeeeeeoDddo',
      '...oddddbbBBBBBBBBBBBBBBBoBoBooo',
      'odddddddobBBBBBBBBBBBBBBBBBboooo',
      'odddddo.oooooooodddddddddoooo...',
      'oddddo...........odddddddoo.....',
      'oddo..............oodddoo.......',
      'oo..................ooooo.......'
    ], 16, 14));

    P.def('shark1', A([
      'oo...........oo.................',
      'odo.........oeeo................',
      'oddo........oeDDo...............',
      'odddo.......oeDDdo..............',
      'oddddo.....oeDDDddo.............',
      'oddddddo.oeeDDDDdddoooooooooooo.',
      'oddddddddDDDDDDDDDDDDDDDDDDwDddo',
      '..odddddddDDeeeeeeeeeeeeeeeoDddo',
      '...oddddbbBBBBBBBBBBBBBBBoBoBooo',
      'odddddddobBBBBBBBBBBBBBBBBBboooo',
      'odddddo.oooooooodddddddddoooo...',
      'oddo.............odddddddoo.....',
      'oo................oodddoo.......',
      '....................ooooo.......'
    ], 16, 14));

    P.def('shark2', A([
      '.............oo.................',
      '............oeeo................',
      'oo..........oeDDo...............',
      'odo.........oeDDdo..............',
      'oddo.......oeDDDddo.............',
      'odddo....oeeDDDDdddoooooooooooo.',
      'oddddddddDDDDDDDDDDDDDDDDDDwDddo',
      '.oodddddddDDeeeeeeeeeeeeeeeoDddo',
      '...oddddbbBBBBBBBBBBBBBBBoBoBooo',
      'odddddddobBBBBBBBBBBBBBBBBBboooo',
      'oddddddooooooooodddddddddoooo...',
      'odddddo..........odddddddoo.....',
      'oddddo............oodddoo.......',
      'oddo................ooooo.......'
    ], 16, 14));

    P.anim('shark_swim', ['shark0', 'shark1', 'shark2'], 8);

    /* beer bandit - hood, rust straps, and somebody elses tankard */
    P.def('bandit0', A([
      '...oo.......',
      '..o66o......',
      '..o667o.....',
      '..o6677o....',
      '..o66pw7o...',
      '..o66pp77o..',
      '..oppppppo..',
      '.o66677778o.',
      '.o6u6777778o',
      '.o66u677778o',
      '.o6uUUUUowwo',
      '..o67778o32o',
      '..o67778oU2o',
      '..o6777oo21o',
      '..o6777oooo.',
      '..o6o77o....',
      '..ovUuovUo..',
      '..ouuoouuo..'
    ], 6, 18));

    P.def('bandit1', A([
      '....oo......',
      '...o66o.....',
      '...o667o....',
      '...o6677o...',
      '...o66pB7o..',
      '...o66pp77o.',
      '..oppppppo..',
      '.o66677778o.',
      '.o6u6777778o',
      '.o66u677778o',
      '.o6uUUUUowBo',
      '..o67778o32o',
      '..o67778oU2o',
      '..o6777oo21o',
      '..o6777oooo.',
      '..o66o7o....',
      '..ovUuovUo..',
      '..ouuoouuo..'
    ], 6, 18));

    P.anim('bandit_idle', ['bandit0', 'bandit1'], 5);

    /* ruin sentinel - animated masonry, one gold slit for a face */
    P.def('sentinel0', A([
      '....................',
      '......oooooooo......',
      '.....oJJjjjjHo......',
      '....oJJjjjjjHHo.....',
      '....oJjpppppHHo.....',
      '....oJjoyYYyoHo.....',
      '....oJjjjjjjjHo.....',
      '....ojpppppppho.....',
      '.....ojHHjHHho......',
      '.......ojHHho.......',
      '.oooooooooooooooooo.',
      '.oJJJJjjjjjjHHHHHho.',
      '.oJjjjjjjjjjjjHHHho.',
      '.oppppppppppppppppo.',
      '.ojjojjjjjjjjjHooho.',
      '.ojjojpJjjjjJpHooho.',
      '.ojjojjpJjjJpHHooho.',
      '.ojjojjjpJJpHHHooho.',
      '.ohhopppppppppHooho.',
      '....ohHHjHHHHHho....',
      '.....oJjo..oHho.....',
      '.....oJjo..oHho.....',
      '.....ojHo..ohho.....',
      '....ohhhhoohhhho....'
    ], 10, 24));

    P.def('sentinel1', A([
      '....................',
      '....................',
      '......oooooooo......',
      '.....oJJjjjjHo......',
      '....oJJjjjjjHHo.....',
      '....oJjpppppHHo.....',
      '....oJjoYYYYoHo.....',
      '....oJjjjjjjjHo.....',
      '....ojpppppppho.....',
      '.....ojHHjHHho......',
      '.oooooooooooooooooo.',
      '.oJJJJjjjjjjHHHHHho.',
      '.oJjjjjjjjjjjjHHHho.',
      '.oppppppppppppppppo.',
      '.ojjojjjjjjjjjHooho.',
      '.ojjojpJjjjjJpHooho.',
      '.ojjojjpJjjJpHHooho.',
      '.ojjojjjpJJpHHHooho.',
      '.ohhopppppppppHooho.',
      '....ohHHjHHHHHho....',
      '.....oJjo..oHho.....',
      '.....oJjo..oHho.....',
      '.....ojHo..ohho.....',
      '....ohhhhoohhhho....'
    ], 10, 24));

    P.def('sentinel2', A([
      '....................',
      '......oooooooo......',
      '.....oJJjjjjHo......',
      '....oJJjjjjjHHo.....',
      '....oJjpppppHHo.....',
      '....oJjogGGgoHo.....',
      '....oJjjjjjjjHo.....',
      '....ojpppppppho.....',
      '.....ojHHjHHho......',
      '.......ojHHho.......',
      '.oooooooooooooooooo.',
      '.oJJJJjjjjjjHHHHHho.',
      '.oJjjjjjjjjjjjHHHho.',
      '.oppppppppppppppppo.',
      '.ojHojjjjjjjjjHooho.',
      '.ojHojpJjjjjJpHooho.',
      '.ojHojjpJjjJpHHooho.',
      '.ojHojjjpJJpHHHooho.',
      '.ohhopppppppppHooho.',
      '....ohHHjHHHHHho....',
      '.....oJjo..oHho.....',
      '.....oJjo..oHho.....',
      '.....ojHo..ohho.....',
      '....ohhhhoohhhho....'
    ], 10, 24));

    P.anim('sentinel_idle', ['sentinel0', 'sentinel1', 'sentinel2'], 4);

    /* trench horror - no eyes at all, five mouths, rotting */
    P.def('horror0', A([
      '........................',
      '.......oooo...ooo.......',
      '.....oAAAAAaaooaaao.....',
      '...oAAAAAAaaaaaZooooo...',
      '..oAAAaaaaaaaZZZwowooo..',
      '..oAaaaaaaaaZZZZZZZZoo..',
      '..oAaooooooaZZZZZZZZoo..',
      '..oaawowowoaZZZZZZZZoo..',
      '..oaaooooooZZZZZZZzzoo..',
      '..oaaaaaaZZZZZZZZooooo..',
      '..oaaaaZZZZZZZZzzwowo...',
      '...oaaaZZoooozzzzzzoo...',
      '...oaaZZZowozzzzzzoo....',
      '....oaoooZZzzzzzzoo.....',
      '....oZwoZZzzzzzzoo......',
      '.....oZZZzzzzzoo........',
      '.....oZZooZZoZ..........',
      '......Z...Z..z..........',
      '.....z....z...z.........',
      '.....z.....z..z.........'
    ], 12, 20));

    P.def('horror1', A([
      '........................',
      '.......oooo...ooo.......',
      '.....oAAAAAaaooaaao.....',
      '...oAAAAAAaaaaaZooooo...',
      '..oAAAaaaaaaaZZZowowoo..',
      '..oAaaaaaaaaZZZZZZZZoo..',
      '..oAaooooooaZZZZZZZZoo..',
      '..oaaowowowaZZZZZZZZoo..',
      '..oaaooooooZZZZZZZzzoo..',
      '..oaaaaaaZZZZZZZZooooo..',
      '..oaaaaZZZZZZZZzzowow...',
      '...oaaaZZoooozzzzzzoo...',
      '...oaaZZZwowzzzzzzoo....',
      '....oaoooZZzzzzzzoo.....',
      '....oZowZZzzzzzzoo......',
      '.....oZZZzzzzzoo........',
      '.....ooZZoZZZo..........',
      '.......Z...Zz...........',
      '.......z...z.z..........',
      '......z.....zz..........'
    ], 12, 20));

    P.def('horror2', A([
      '........................',
      '.......oooo...ooo.......',
      '.....oAAAAAaaooaaao.....',
      '...oAAAAAAaaaaaZooooo...',
      '..oAAAaaaaaaaZZZwowowo..',
      '..oAaaaaaaaaZZZZZZZZoo..',
      '..oAaoooooaaZZZZZZZZoo..',
      '..oaawowowaaZZZZZZZZoo..',
      '..oaaoooooZZZZZZZZzzoo..',
      '..oaaaaaaZZZZZZZZooooo..',
      '..oaaaaZZZZZZZZzzwowo...',
      '...oaaaZZooooozzzzzoo...',
      '...oaaZZZowowzzzzzoo....',
      '....oaooooZzzzzzzoo.....',
      '....oZwowZzzzzzzoo......',
      '.....oZZZzzzzzoo........',
      '.....oZZoZZooZ..........',
      '.....Z...Z....z.........',
      '.....z...z....z.........',
      '....z.....z....z........'
    ], 12, 20));

    P.anim('horror_idle', ['horror0', 'horror1', 'horror2'], 5);

    /* =========================================================
       BARON FOAMHELM  48x40. He is wearing your crown. The keg on
       his shoulder is a pauldron, the maul is another keg, and the
       foam never stops. Four frames of him breathing at you.
       ======================================================== */

    /* boss idle 0 - maul low, coals banked */
    P.def('baron0', A([
      '...................oo..oo..oo..oo......ww..w....',
      '..................oYYooYYooYYooYyo...wwww..ww...',
      '.................oyYyyYyyYyyYyyyo...w.wwoowww...',
      '................oGyYyGyYyGyYyGyGo....o4444333ow.',
      '................oggGGggGGggGGggGo...oVVVVVVVVVo.',
      '...............ooooooooooooooooooooo44443332211o',
      '...............oJJJjjjjjHHHHHHhhhhoo44443332211o',
      '.............ooJJJjjjjjjHHHHHHhhhhoo444p333p211o',
      '............obJJjj.oooooooooooohhhbo344p333p211o',
      '............BbJjj..oo&&oooo&oooHhhboo333222111o.',
      '............oBJjj..ooooooooooooHhhBooUUUUUUUUUo.',
      '.............ooJjjjjjHHHHHHHhhhhoo...o2221111o..',
      '.......oooooooooJjjjjjHHHHHHHhhhho..oooooooo....',
      '.....o4444444444ojjjjjHHHHHHhhho...oHJooHJo.....',
      '....o44V444444V3oooooooooooooo....ooooooo33o..ww',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHhhoHHHHHHo33o..w.',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHHhoHHHHHHo33oo...',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhoHHHHHHo33oo.ww',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhohHHHHHo33o....',
      '...o334v3p3p32UU1ojjjjjjHHHHHHHHhohhhhhho33o....',
      '...o334v3p3p32UU1oyjjjjjHHHHHHyghhooHHHHo33o....',
      '...o233v2p2p21uu1ogyjjjjHHHHHygHhhhoHHHHo33o....',
      '...o233v2p2p21uu1ojgyjjjHHHHygHHhhhoHHHHo33o....',
      '....o22222211u11wwjjgyjjHHHygHHHhhhoHHHHo33o....',
      '.....o2222211u1ojwjjjgyjHHygHHHHhhhhooooo33o....',
      '.......oooooooojjjjjjjjgyygHHHHHhhhoJjjHhho.....',
      '............oUUUwUUUUUgyYYygUUUUUUuoJjjHhho.....',
      '............oUUUUUUUUUgyYYygUUUUUUuojjHHhho.....',
      '.............ouuuuuuuuggGGGGgguuuuuoooooooo.....',
      '.............oJjjjjjjjjHHHHHHhhho.......o32o....',
      '..............oJjjjjjjjHHHHHhhho........o32o....',
      '..............ooooooooo.oooooooooo......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......o32o....',
      '..............ojjjjjjjo.oHHHhhhho.......oooo....',
      '..............ojjjjjjjo.oHHhhhhho...............',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '............ouuUUUUUUUouuUUUUuuuuuo.............',
      '............ooooooooooooooooooooooo.............'
    ], 24, 40));

    /* boss idle 1 - maul lifting */
    P.def('baron1', A([
      '...................oo..oo..oo..oo.....w...ww....',
      '..................oYYooYYooYYooYyo..wwoowwwo....',
      '.................oyYyyYyyYyyYyyyo....ww44w3wwo..',
      '................oGyYyGyYyGyYyGyGo..woVVVVVVVVVww',
      '................oggGGggGGggGGggGo..o44443332211o',
      '...............ooooooooooooooooooooo44443332211o',
      '...............oJJJjjjjjHHHHHHhhhhoo444p333p211o',
      '.............ooJJJjjjjjjHHHHHHhhhhoo344p333p211o',
      '............obJJjj.oooooooooooohhhboo333222111o.',
      '............BbJjj..oo&&oooo&oooHhhbooUUUUUUUUUo.',
      '............oBJjj..ooooooooooooHhhBo.o2221111o..',
      '.............ooJjjjjjHHHHHHHhhhhoo....oooooo....',
      '.......oooooooooJjjjjjHHHHHHHhhhho..oo..oo......',
      '.....o4444444444ojjjjjHHHHHHhhho...oHJooo33o....',
      '....o44V444444V3oooooooooooooo....ooooooo33o..ww',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHhhoHHHHHHo33o....',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHHhoHHHHHHo33oo.ww',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhoHHHHHHo33oo...',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhohHHHHHo33o..ww',
      '...o334v3p3p32UU1ojjjjjjHHHHHHHHhohhhhhho33o....',
      '...o334v3p3p32UU1oyjjjjjHHHHHHyghhooHHHHo33o....',
      '...o233v2p2p21uu1ogyjjjjHHHHHygHhhhoHHHHo33o....',
      '...o233v2p2p21uu1ojgyjjjHHHHygHHhhhoHHHHo33o....',
      '....o22222211u11wjjjgyjjHHHygHHHhhhoHHHHo33o....',
      '.....o2222211u1ojjjjjgyjHHygHHHHhhhhooooooo.....',
      '.......oooooooojwwjjjjjgyygHHHHHhhhoJjjHhho.....',
      '............oUUUUUUUUUgyYYygUUUUUUuoJjjHhho.....',
      '............oUUUUwUUUUgyYYygUUUUUUuojjHHhho.....',
      '.............ouuuuuuuuggGGGGgguuuuuoooooo32o....',
      '.............oJjjjjjjjjHHHHHHhhho.......o32o....',
      '..............oJjjjjjjjHHHHHhhho........o32o....',
      '..............ooooooooo.oooooooooo......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......oooo....',
      '..............ojjjjjjjo.oHHHhhhho...............',
      '..............ojjjjjjjo.oHHhhhhho...............',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '............ouuUUUUUUUouuUUUUuuuuuo.............',
      '............ooooooooooooooooooooooo.............'
    ], 24, 40));

    /* boss idle 2 */
    P.def('baron2', A([
      '...................oo..oo..oo..oo.......w...w...',
      '..................oYYooYYooYYooYyo....www.ww....',
      '.................oyYyyYyyYyyYyyyo...wwoowooow...',
      '................oGyYyGyYyGyYyGyGo..wwo4444333ow.',
      '................oggGGggGGggGGggGo...oVVVVVVVVVo.',
      '...............ooooooooooooooooooooo44443332211o',
      '...............oJJJjjjjjHHHHHHhhhhoo44443332211o',
      '.............ooJJJjjjjjjHHHHHHhhhhoo444p333p211o',
      '............obJJjj.oooooooooooohhhbo344p333p211o',
      '............BbJjj..oo%%oooo%oooHhhboo333222111o.',
      '............oBJjj..ooooooooooooHhhBooUUUUUUUUUo.',
      '.............ooJjjjjjHHHHHHHhhhhoo...o2221111o..',
      '.......oooooooooJjjjjjHHHHHHHhhhho..oooooooo....',
      '.....o4444444444ojjjjjHHHHHHhhho...oHJooHJo.....',
      '....o44V444444V3oooooooooooooo....ooooooo33o....',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHhhoHHHHHHo33o..w.',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHHhoHHHHHHo33oo.ww',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhoHHHHHHo33oo...',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhohHHHHHo33o..ww',
      '...o334v3p3p32UU1ojjjjjjHHHHHHHHhohhhhhho33o....',
      '...o334v3p3p32UU1oyjjjjjHHHHHHyghhooHHHHo33o....',
      '...o233v2p2p21uu1ogyjjjjHHHHHygHhhhoHHHHo33o....',
      '...o233v2p2p21uu1ojgyjjjHHHHygHHhhhoHHHHo33o....',
      '....o22222211u11ojjjgyjjHHHygHHHhhhoHHHHo33o....',
      '.....o2222211u1owwjjjgyjHHygHHHHhhhhooooo33o....',
      '.......oooooooojjjjjjjjgyygHHHHHhhhoJjjHhho.....',
      '............oUUUUwUUUUgyYYygUUUUUUuoJjjHhho.....',
      '............oUUUUUUUUUgyYYygUUUUUUuojjHHhho.....',
      '.............ouuwuuuuuggGGGGgguuuuuoooooooo.....',
      '.............oJjjjjjjjjHHHHHHhhho.......o32o....',
      '..............oJjjjjjjjHHHHHhhho........o32o....',
      '..............ooooooooo.oooooooooo......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......o32o....',
      '..............ojjjjjjjo.oHHHhhhho.......oooo....',
      '..............ojjjjjjjo.oHHhhhhho...............',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '............ouuUUUUUUUouuUUUUuuuuuo.............',
      '............ooooooooooooooooooooooo.............'
    ], 24, 40));

    /* boss idle 3 - maul settling */
    P.def('baron3', A([
      '...................oo..oo..oo..oo......ww..w....',
      '..................oYYooYYooYYooYyo...wwww..ww...',
      '.................oyYyyYyyYyyYyyyo...w.ww..www...',
      '................oGyYyGyYyGyYyGyGo.....oooooo..w.',
      '................oggGGggGGggGGggGo....o4444333o..',
      '...............oooooooooooooooooooo.oVVVVVVVVVo.',
      '...............oJJJjjjjjHHHHHHhhhhoo44443332211o',
      '.............ooJJJjjjjjjHHHHHHhhhhoo44443332211o',
      '............obJJjj.oooooooooooohhhbo444p333p211o',
      '............BbJjj..oo&&oooo&oooHhhbo344p333p211o',
      '............oBJjj..ooooooooooooHhhBoo333222111o.',
      '.............ooJjjjjjHHHHHHHhhhhoo..oUUUUUUUUUo.',
      '.......oooooooooJjjjjjHHHHHHHhhhho..oo2221111o..',
      '.....o4444444444ojjjjjHHHHHHhhho...oHJoooooo....',
      '....o44V444444V3oooooooooooooo....oooooooo....ww',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHhhoHHHHHHo33o..w.',
      '...o444V4p4p43VV2ojjjjjjHHHHHHHHhoHHHHHHo33oo...',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhoHHHHHHo33oo.ww',
      '...o344V3p3p32UU1ojjjjjjHHHHHHHHhohHHHHHo33o....',
      '...o334v3p3p32UU1ojjjjjjHHHHHHHHhohhhhhho33o....',
      '...o334v3p3p32UU1oyjjjjjHHHHHHyghhooHHHHo33o....',
      '...o233v2p2p21uu1ogyjjjjHHHHHygHhhhoHHHHo33o....',
      '...o233v2p2p21uu1ojgyjjjHHHHygHHhhhoHHHHo33o....',
      '....o22222211u11ojjjgyjjHHHygHHHhhhoHHHHo33o....',
      '.....o2222211u1owwjjjgyjHHygHHHHhhhhooooo33o....',
      '.......oooooooojjjjjjjjgyygHHHHHhhhoJjjHo33o....',
      '............oUUUUwUUUUgyYYygUUUUUUuoJjjHhho.....',
      '............oUUUUUUUUUgyYYygUUUUUUuojjHHhho.....',
      '.............ouuwuuuuuggGGGGgguuuuuoooooooo.....',
      '.............oJjjjjjjjjHHHHHHhhho...............',
      '..............oJjjjjjjjHHHHHhhho........o32o....',
      '..............ooooooooo.oooooooooo......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......o32o....',
      '..............oJjjjjjjo.oHHHHhhho.......o32o....',
      '..............ojjjjjjjo.oHHHhhhho.......o32o....',
      '..............ojjjjjjjo.oHHhhhhho.......oooo....',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '.............ouUUUUUUUuouUUUUuuuuo..............',
      '............ouuUUUUUUUouuUUUUuuuuuo.............',
      '............ooooooooooooooooooooooo.............'
    ], 24, 40));

    P.anim('baron_idle', ['baron0', 'baron1', 'baron2', 'baron3'], 6);

    /* =========================================================
       C. MOUNTS. All side-on, all facing right, all anchored at
       the bottom-centre so the King sits in the same place on
       every one of them. Three frames each.
       ======================================================== */

    /* sea horse - the curl is stepped pixels, there is no circle in it */
    P.def('mt_seahorse0', A([
      '.....y.y....',
      '....oyYyo...',
      '...oYYYYo...',
      '...oYoYYGGGo',
      '...oYYYGGGoo',
      '...oYYYGo...',
      '..oYYYGo....',
      '..oYYYYGx...',
      '..oYYYYGGx..',
      '.oYYYYYGGx..',
      '.oYYYYYGGx..',
      '.oYYYYGGo...',
      '..oYYYGGo...',
      '..oGGGo.....',
      '.oGGGo......',
      'oGGoggo.....',
      'ogGggo......',
      '.ooooo......'
    ], 6, 18));

    P.def('mt_seahorse1', A([
      '.....y.y....',
      '....oyYyo...',
      '...oYYYYo...',
      '...oYoYYGGGo',
      '...oYYYGGGoo',
      '...oYYYGo...',
      '..oYYYGo....',
      '..oYYYYG....',
      '..oYYYYGGx..',
      '.oYYYYYGGx..',
      '.oYYYYYGGx..',
      '.oYYYYGGo...',
      '..oYYYGGo...',
      '..oGGGo.....',
      '.oGGGGo.....',
      '.oGGggo.....',
      '.oggggo.....',
      '..oooo......'
    ], 6, 18));

    P.def('mt_seahorse2', A([
      '.....y.y....',
      '....oyYyo...',
      '...oYYYYo...',
      '...oYoYYGGGo',
      '...oYYYGGGoo',
      '...oYYYGo...',
      '..oYYYGo....',
      '..oYYYYGx...',
      '..oYYYYGGx..',
      '.oYYYYYGGx..',
      '.oYYYYYGG...',
      '.oYYYYGGo...',
      '..oYYYGGo...',
      '..oGGGo.....',
      'oGGGGo......',
      'oGGgo.......',
      'oggggo......',
      '.ooooo......'
    ], 6, 18));

    P.anim('mt_seahorse_move', ['mt_seahorse0', 'mt_seahorse1', 'mt_seahorse2'], 8);

    /* clownfish - orange, three bands, tiny and smug */
    P.def('mt_clownfish0', A([
      '................',
      '.......oooo.....',
      'o&o...o&&&o.....',
      'o&&oo&&&&oooo...',
      'o&&&&ww&&&&&&o..',
      'o&&&owwo&&oww&&o',
      'o&&&owwo&&oww&&o',
      'o&&&owwo%%oww%%o',
      'o&&o%ww%%%%ww%o.',
      'o&oo%%o%%o$$o...',
      '....ooooooooo...',
      '................'
    ], 8, 12));

    P.def('mt_clownfish1', A([
      '................',
      '.......oooo.....',
      'oo....o&&&o.....',
      'o&ooo&&&&oooo...',
      'o&&&&ww&&&&&&o..',
      'o&&&&wwo&&oww&&o',
      'o&&&&wwo&&oww&&o',
      'o&&&owwo%%oww%%o',
      'o&o%%ww%%%%ww%o.',
      'oo.o%%o%o%$$o...',
      '....ooooooooo...',
      '................'
    ], 8, 12));

    P.def('mt_clownfish2', A([
      '................',
      '.......oooo.....',
      'o&&o..o&&&o.....',
      'o&&&o&&&&oooo...',
      'o&&&&ww&&&&&&o..',
      'o&&&owwo&&oww&&o',
      'o&&&owwo&&oww&&o',
      'o&&&owwo%%oww%%o',
      'o&&&oww%%%%ww%o.',
      'o&&o%%%o%%o$o...',
      '....ooooooooo...',
      '................'
    ], 8, 12));

    P.anim('mt_clownfish_move', ['mt_clownfish0', 'mt_clownfish1', 'mt_clownfish2'], 9);

    /* war crab - digs, walks, does not care */
    P.def('mt_crab0', A([
      '......w...w.........',
      '......R...R...ooo...',
      '......R...R..oXXxo..',
      '.....ooooooo.oXxoo..',
      '..oXXXXXXxxRoRxRro..',
      '.oXXXXXxxxxRRoorro..',
      '.oXxxxxRRRRrroooo...',
      '.oxxRRRRRrrrroXXxo..',
      '..oooooooooo.oXxxxo.',
      '..R..R..R..R.RxRrro.',
      '..R..R..R..R..orro..',
      '.r..r..r..r.........',
      '.r..r..r..r.........',
      'o..o..o..o..........'
    ], 10, 14));

    P.def('mt_crab1', A([
      '......w...w.........',
      '......R...R...ooo...',
      '......R...R..oXXxo..',
      '.....ooooooo.oXxxxo.',
      '..oXXXXXXxxRoRxRrro.',
      '.oXXXXXxxxxRRoorro..',
      '.oXxxxxRRRRrroooo...',
      '.oxxRRRRRrrrroXXxo..',
      '..oooooooooo.oXxoo..',
      '...R..R..R..RRxRro..',
      '...R..R..R..R.orro..',
      '...r..r..r..r.......',
      '...r..r..r..r.......',
      '...o..o..o..o.......'
    ], 10, 14));

    P.def('mt_crab2', A([
      '......w...w.........',
      '......R...R...ooo...',
      '......R...R..oXXxo..',
      '.....ooooooo.oXxoo..',
      '..oXXXXXXxxRoRxRro..',
      '.oXXXXXxxxxRRoorro..',
      '.oXxxxxRRRRrroooo...',
      '.oxxRRRRRrrrroXXxo..',
      '..oooooooooo.oXxoo..',
      '..R..R..R..R.RxRro..',
      '...R..R..R..R.orro..',
      '....r..r..r..r......',
      '....r..r..r..r......',
      '.....o..o..o..o.....'
    ], 10, 14));

    P.anim('mt_crab_move', ['mt_crab0', 'mt_crab1', 'mt_crab2'], 8);

    /* bluefin tuna - all muscle, gold finlets */
    P.def('mt_tuna0', A([
      '.........oooo...........',
      '........oeEEo...........',
      '.......oeEEEo..yy.y.....',
      'oddo.ooeEEEDdddoooo.....',
      'odddddEEEDDDddddddDdo...',
      'odddddEDDDddddddddDddo..',
      'odddddbBBBBBBBBBBBbdo...',
      'odddoobBBBBoddoBBBbo....',
      'oddo..ooBBBBoddoyoy.....',
      '........ooooooooo.......',
      '........................',
      '........................'
    ], 12, 12));

    P.def('mt_tuna1', A([
      '.........oooo...........',
      '........oeEEo...........',
      '.......oeEEEo..yy.y.....',
      'oddddooeEEEDdddoooo.....',
      'oddddddEEDDDddddddDdo...',
      'odddddEDDDddddddddDddo..',
      'oddddbbBBBBBBBBBBBbdo...',
      'oddo.obBBBBodoBBBBbo....',
      'oo....ooBBBoddoyyoy.....',
      '........ooooooooo.......',
      '........................',
      '........................'
    ], 12, 12));

    P.def('mt_tuna2', A([
      '.........oooo...........',
      '........oeEEo...........',
      '.......oeEEEo..yy.y.....',
      'oo...ooeEEEDdddoooo.....',
      'odddoeEEEDDDddddddDdo...',
      'odddddEDDDddddddddDddo..',
      'oddddddBBBBBBBBBBBbdo...',
      'oddddddBBBBBodoBBBbo....',
      'oddddoooBBBBoddoyoy.....',
      '........ooooooooo.......',
      '........................',
      '........................'
    ], 12, 12));

    P.anim('mt_tuna_move', ['mt_tuna0', 'mt_tuna1', 'mt_tuna2'], 9);

    /* dolphin - melon forehead, real beak, swept dorsal, notched flukes */
    P.def('mt_dolphin0', A([
      '.............oo.............',
      '............ojHo............',
      '...........ojHHHo...........',
      '..........ojHHHHHoooooooo...',
      '.........ojjHHHHHHHHHhhjjo..',
      '........ojjjHHHHHHHHHhhjjjo.',
      '...ooooJjjHHHHHHHHHhhjjjjjo.',
      'oJjHHHHjjjHHHHHHHHHhhjojjjjo',
      'oJjjHHHBBBBBBBBBBBBBBBooooo.',
      '.ooohHHBBBBBBBBBBBBBBBwwoo..',
      '.....ooBBBBBBBBBBBBBBooo....',
      '.......ooooooHHHHHHooo......',
      '............oHHHHo..........',
      '...........oHHo.............'
    ], 14, 14));

    P.def('mt_dolphin1', A([
      '.............oo.............',
      '............ojHo............',
      '...........ojHHHo...........',
      '..........ojHHHHHoooooooo...',
      '.........ojjHHHHHHHHHhhjjo..',
      '...oooo.ojjjHHHHHHHHHhhjjjo.',
      'oJjHHHHJjjHHHHHHHHHhhjjjjjo.',
      'oJjjHHHjjjHHHHHHHHHhhjojjjjo',
      '.ooohHHBBBBBBBBBBBBBBBooooo.',
      '.....ooBBBBBBBBBBBBBBBwwoo..',
      '.......BBBBBBBBBBBBBBooo....',
      '.......oooooooHHHHHooo......',
      '............ooHHHo..........',
      '...........oHHo.............'
    ], 14, 14));

    P.def('mt_dolphin2', A([
      '.............oo.............',
      '............ojHo............',
      '...........ojHHHo...........',
      '..........ojHHHHHoooooooo...',
      '.........ojjHHHHHHHHHhhjjo..',
      '........ojjjHHHHHHHHHhhjjjo.',
      '.......JjjHHHHHHHHHhhjjjjjo.',
      '...oooojjjHHHHHHHHHhhjojjjjo',
      'oJjHHHHBBBBBBBBBBBBBBBooooo.',
      'oJjjHHHBBBBBBBBBBBBBBBwwoo..',
      '.ooohHHBBBBBBBBBBBBBBooo....',
      '.......ooooooHHHHHoooo......',
      '............oHHHoo..........',
      '...........oHo..............'
    ], 14, 14));

    P.anim('mt_dolphin_move', ['mt_dolphin0', 'mt_dolphin1', 'mt_dolphin2'], 8);

    /* swordfish - the bill is a third of the sprite */
    P.def('mt_swordfish0', A([
      'oo...........ooooo..............',
      'oddo........oddDDdo.............',
      'odddo...oooooddDDDddoooooo......',
      'oddddo.oddDDDDDDdddddddDdo......',
      'odddd.oddDDDDDDDDdddddddDDdo....',
      'oddddoobbDDDDDDDDdddddddDDdBBBBB',
      'oddddoobbbBBBBBBBBBBBBBBBdobbbBB',
      'odddo..obbBBBBBBBBBBBBBBBdoo....',
      'oddo....ooBBBBBBBBBBBBBBdo......',
      'oo.........oooooooooooooo.......',
      '..........odddo.................',
      '...........ooo..................'
    ], 16, 12));

    P.def('mt_swordfish1', A([
      '.............ooooo..............',
      'oo..........oddDDdo.............',
      'oddo....oooooddDDDddoooooo......',
      'odddo..oddDDDDDDdddddddDdo......',
      'oddddooddDDDDDDDDdddddddDDdo....',
      'odddd.obbDDDDDDDDdddddddDDdBBBBB',
      'oddddoobbbBBBBBBBBBBBBBBBdobbbBB',
      'oddddo.obbBBBBBBBBBBBBBBBdoo....',
      'odddo...ooBBBBBBBBBBBBBBdo......',
      'oddo.......oooooooooooooo.......',
      'oo........oddo..................',
      '...........oo...................'
    ], 16, 12));

    P.def('mt_swordfish2', A([
      'oddo.........ooooo..............',
      'odddo.......oddDDdo.............',
      'oddddo..oooooddDDDddoooooo......',
      'odddd..oddDDDDDDdddddddDdo......',
      'oddddooddDDDDDDDDdddddddDDdo....',
      'oddddoobbDDDDDDDDdddddddDDdBBBBB',
      'odddo.obbbBBBBBBBBBBBBBBBdobbbBB',
      'oddo...obbBBBBBBBBBBBBBBBdoo....',
      'oo......ooBBBBBBBBBBBBBBdo......',
      '...........oooooooooooooo.......',
      '..........odddddo...............',
      '...........ooooo................'
    ], 16, 12));

    P.anim('mt_swordfish_move', ['mt_swordfish0', 'mt_swordfish1', 'mt_swordfish2'], 9);

    /* whale - the top of the mount ladder */
    P.def('mt_whale0', A([
      '.............................ww..w......',
      '............................wwwwwww.....',
      '.............................ww..w......',
      '.....................oooooooo...........',
      '................ooooooiiiiddddoo........',
      '...........oooooiiiidddddddddddddoo.....',
      'oo..........ooiiiiddddddddddddddddddDdo.',
      'oiio......ooiiiidddddddddddddddddddDDdo.',
      'oiiio.....oiiidddddddddddddddddddddDDDdo',
      'oiiiio....iiidddddddddddddddddddoDDDDDdo',
      'oiiiiio...iiiddddddddddddddddddDDDDDDDdo',
      'oiiiiiiii.iidddddddddddddddddDDDDDDDDDdo',
      'oiiiiiiii.iddddddddddddddddDDDDDDDDDDddo',
      'oiiiiio...obbbBBBBBBBBBBBBBBBBBBBBBBBBdo',
      'oiiiio....obbBBBBBBBBBBBBBBBBBBBBBBBBBdo',
      'oiiio......obBBBBBBBBBBBBBBBoBoBoBoBoBdo',
      'oiio.......obBBBBBBBBBBBBBBoBoBoBoBoBoo.',
      'oo..........ooBBBBBBBBBBBBBBBBBBBBBBoo..',
      '..................ohhhhhoooooooooooo....',
      '...................ohhhho...............',
      '....................ohhho...............',
      '.....................ooo................'
    ], 20, 22));

    P.def('mt_whale1', A([
      '..............................w..ww.....',
      '.............................wwwww......',
      '..............................w..w......',
      '.....................oooooooo...........',
      '................ooooooiiiiddddoo........',
      '...........oooooiiiidddddddddddddoo.....',
      '............ooiiiiddddddddddddddddddDdo.',
      'oo........ooiiiidddddddddddddddddddDDdo.',
      'oiio......oiiidddddddddddddddddddddDDDdo',
      'oiiio.....iiidddddddddddddddddddoDDDDDdo',
      'oiiiio....iiiddddddddddddddddddDDDDDDDdo',
      'oiiiiio...iidddddddddddddddddDDDDDDDDDdo',
      'oiiiiiiii.iddddddddddddddddDDDDDDDDDDddo',
      'oiiiiiiii.obbbBBBBBBBBBBBBBBBBBBBBBBBBdo',
      'oiiiiio...obbBBBBBBBBBBBBBBBBBBBBBBBBBdo',
      'oiiiio.....obBBBBBBBBBBBBBBBoBoBoBoBoBdo',
      'oiiio......obBBBBBBBBBBBBBBoBoBoBoBoBoo.',
      'oiio........ooBBBBBBBBBBBBBBBBBBBBBBoo..',
      '..................ohhhhooooooooooooo....',
      '...................ohhho................',
      '....................ooo.................',
      '........................................'
    ], 20, 22));

    P.def('mt_whale2', A([
      '............................w..w..w.....',
      '............................ww.www......',
      '.............................w..ww......',
      '.....................oooooooo...........',
      '................ooooooiiiiddddoo........',
      '...........oooooiiiidddddddddddddoo.....',
      'oiio........ooiiiiddddddddddddddddddDdo.',
      'oiiio.....ooiiiidddddddddddddddddddDDdo.',
      'oiiiio....oiiidddddddddddddddddddddDDDdo',
      'oiiiiio...iiidddddddddddddddddddoDDDDDdo',
      'oiiiiiiii.iiiddddddddddddddddddDDDDDDDdo',
      'oiiiiiiii.iidddddddddddddddddDDDDDDDDDdo',
      'oiiiiio...iddddddddddddddddDDDDDDDDDDddo',
      'oiiiio....obbbBBBBBBBBBBBBBBBBBBBBBBBBdo',
      'oiiio.....obbBBBBBBBBBBBBBBBBBBBBBBBBBdo',
      'oiio.......obBBBBBBBBBBBBBBBoBoBoBoBoBdo',
      'oo.........obBBBBBBBBBBBBBBoBoBoBoBoBoo.',
      '............ooBBBBBBBBBBBBBBBBBBBBBBoo..',
      '..................ohhhhhoooooooooooo....',
      '..................oohhhho...............',
      '....................ohhho...............',
      '.....................ooo................'
    ], 20, 22));

    P.anim('mt_whale_move', ['mt_whale0', 'mt_whale1', 'mt_whale2'], 6);

    /* =========================================================
       D. NPCs. 12x18, anchored at the feet, and each one has to be
       recognisable from across a room: the hat, the tool and the
       palette do all the work at this size.
       ======================================================== */

    /* smith - apron, hammer, soot, no patience */
    P.def('npc_smith0', A([
      '....oooo....',
      '...oKKkooooo',
      '...oKKKkoJHo',
      '...okokooJHo',
      '...okkkSojHo',
      '...oppppoooo',
      '..oppppSoo3o',
      '.okuuuuuuo3o',
      '.okuUUUUuo3o',
      '.okuqVVUuo3o',
      '.okuUVVUuoKo',
      '.oSuUUUUuoKo',
      '..ouUVVUuo..',
      '..ouUUUUuo..',
      '...o55o55o..',
      '...o55o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.def('npc_smith1', A([
      '....oooo....',
      '...oKKkooooo',
      '...oKKKkoJHo',
      '...okokooJHo',
      '...okkkSojHo',
      '...oppppoooo',
      '..oppppSoo3o',
      '.okuuuuuuo3o',
      '.okuUUUUuo3o',
      '.okuUqVUuo3o',
      '.okuUVVUuoKo',
      '.oSuUUUUuoKo',
      '..ouUVVUuo..',
      '..ouUUUUuo..',
      '...o55o55o..',
      '...o56o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.anim('npc_smith_idle', ['npc_smith0', 'npc_smith1'], 3);

    /* stablemaster - wide hat, tall boots, coil of rope */
    P.def('npc_stabler0', A([
      '....oooo....',
      '...o3333o...',
      'o3333333333o',
      '.oooooooooo.',
      '...okokoo...',
      '...okkkSo...',
      '...oSSSo....',
      '.okNNNNNNko.',
      '.okNMMMMNko.',
      '.okNMMMMNn3.',
      '.okNMMMMNn3.',
      '.oSNMMMMNSo.',
      '..ouUUUUuo..',
      '..onNNNNno..',
      '...ovvoovvo.',
      '...ovUoovUo.',
      '...ovUoovUo.',
      '..ouuuoouuuo'
    ], 6, 18));

    P.def('npc_stabler1', A([
      '....oooo....',
      '...o3333o...',
      'o3333333333o',
      '.oooooooooo.',
      '...okokoo...',
      '...okkkSo...',
      '...oSSSo....',
      '.okNNNNNNko.',
      '.okNMMMMNko.',
      '.okNMMMMNnN.',
      '.okNMMMMNnN.',
      '.oSNMMMMNSo.',
      '..ouUUUUuo..',
      '..onNNNNno..',
      '...ovvoovvo.',
      '...ovUoovUo.',
      '...oUvoovUo.',
      '..ouuuoouuuo'
    ], 6, 18));

    P.anim('npc_stabler_idle', ['npc_stabler0', 'npc_stabler1'], 3);

    /* tackler - green vest, rod over the shoulder */
    P.def('npc_tackler0', A([
      '....oooo....',
      '...offfo...3',
      '...oFFFFo..3',
      '...okokoo.3.',
      '...okkkSo.3.',
      '...oSSSo.3..',
      '..okSSSko3..',
      '.okfFFFfkK..',
      '.okfF++Ffko.',
      '.okfF++Ffko.',
      '.okfFFFFfko.',
      '..ofFFFFfo..',
      '..ofFFFFfoB.',
      '..offFFffo..',
      '...o55o55o..',
      '...o55o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.def('npc_tackler1', A([
      '....oooo....',
      '...offfo...3',
      '...oFFFFo..3',
      '...okokoo.3.',
      '...okkkSo.3.',
      '...oSSSo.3..',
      '..okSSSko3..',
      '.okfFFFfkK..',
      '.okfF++Ffko.',
      '.okfF++Ffko.',
      '.okfFFFFfko.',
      '..ofFFFFfo..',
      '..ofFFFFfow.',
      '..offFFffo..',
      '...o55o55o..',
      '...o55o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.anim('npc_tackler_idle', ['npc_tackler0', 'npc_tackler1'], 3);

    /* bookie - visor, waistcoat, ledger */
    P.def('npc_bookie0', A([
      '....oooo....',
      '...oqqqo....',
      '..oFFFFFFo..',
      '...okokoo...',
      '...okkkSo...',
      '...oSSSo....',
      '..ok777ko...',
      '.ok76667ko..',
      '.ok76667ko..',
      '.ok76667ko..',
      '.ok7owwwoo..',
      '..o7owBwo...',
      '..o7ooooo...',
      '..o76667o...',
      '...o55o55o..',
      '...o55o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.def('npc_bookie1', A([
      '....oooo....',
      '...oqqqo....',
      '..oFFFFFFo..',
      '...okokoo...',
      '...okkkSo...',
      '...oSSSo....',
      '..ok777ko...',
      '.ok76667ko..',
      '.ok76667ko..',
      '.ok76667ko..',
      '.oS7owwwoo..',
      '..o7owwwo...',
      '..o7ooooo...',
      '..o76667o...',
      '...o55o55o..',
      '...o55o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.anim('npc_bookie_idle', ['npc_bookie0', 'npc_bookie1'], 3);

    /* scholar - rot-purple robe, spectacles, scroll */
    P.def('npc_scholar0', A([
      '....oooo....',
      '...oBBBo....',
      '..oBBBBBo...',
      '..okwowko...',
      '..okkkSSo...',
      '..oBBBBo....',
      '...ozZZzo...',
      '..ozZaaZzo..',
      '.ozZaaaZzooo',
      '.ozZaaaZzoww',
      '.ozoaaaozoww',
      '.ozoaaaozooo',
      '.ogyYygyyo..',
      '.ozZaaaZzo..',
      '.ozZaaaZzo..',
      'ozZaaaaZzo..',
      'ozZaaaaaZzo.',
      'ooooooooooo.'
    ], 6, 18));

    P.def('npc_scholar1', A([
      '....oooo....',
      '...oBBBo....',
      '..oBBBBBo...',
      '..okwowko...',
      '..okkkSSo...',
      '..oBBBBo....',
      '...ozZZzo...',
      '..ozZaaZzo..',
      '.ozZaaaZzooo',
      '.ozZaaaZzowB',
      '.ozoaaaozowB',
      '.ozoaaaozooo',
      '.ogyyygyyo..',
      '.ozZaaaZzo..',
      '.ozZaaaZzo..',
      'ozZaaaaZzo..',
      'ozZaaaaaZzo.',
      'ooooooooooo.'
    ], 6, 18));

    P.anim('npc_scholar_idle', ['npc_scholar0', 'npc_scholar1'], 3);

    /* guard - cap, shades, zero expression */
    P.def('npc_guard0', A([
      '...oooooo...',
      '..o555555o..',
      '..o5yYy55o..',
      '.oooooooooo.',
      '...okkkko...',
      '...owpppo...',
      '...okkSo....',
      '..ok555ko...',
      '.ok55g55ko..',
      '.ok5yY55ko..',
      '.ok55555ko..',
      '.oSS555SSo..',
      '.oSS555SSo..',
      '..o55555o...',
      '...o55o55o..',
      '...o55o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.def('npc_guard1', A([
      '...oooooo...',
      '..o555555o..',
      '..o5yYY55o..',
      '.oooooooooo.',
      '...okkkko...',
      '...oBpppo...',
      '...okkSo....',
      '..ok555ko...',
      '.ok55g55ko..',
      '.ok5yY55ko..',
      '.ok55555ko..',
      '.oSS555SSo..',
      '.oSS555SSo..',
      '..o55555o...',
      '...o55o55o..',
      '...o55o55o..',
      '..ovUuovUuo.',
      '..ouuoouuo..'
    ], 6, 18));

    P.anim('npc_guard_idle', ['npc_guard0', 'npc_guard1'], 3);

    /* THE PRINCESS - a keg, a dress, a crooked tiara, a tap for a mouth */
    P.def('npc_princess0', A([
      '....w.ww.w....',
      '...w.w..ww....',
      '....Y.Y.y.....',
      '...oyYyYyo....',
      '..oooooooyo...',
      '.oHHHHHHHHHHo.',
      'o44ww3332ww11o',
      'o4woow33woow1o',
      'o4woow33woow1o',
      'o4wwww22woow1o',
      'o4333322wwww1o',
      '.o3332gYg21o..',
      '.oHHHHHgHHHHo.',
      '..oxXXXXXXxo..',
      '.oxXXXXXXXXxo.',
      'oxXXXXXXXXXXxo',
      'oxwXXwwXXwXXxo',
      'oooooooooooooo'
    ], 7, 18));

    P.def('npc_princess1', A([
      '...ww..w..w...',
      '....w.ww.w....',
      '....Y.y.Y.....',
      '...oyYyYyo....',
      '..oooooooYo...',
      '.oHHHHHHHHHHo.',
      'o44ww3332ww11o',
      'o4wwow33woww1o',
      'o4wwow33woww1o',
      'o4wwww22woww1o',
      'o4333322wwww1o',
      '.o3332gYg21o..',
      '.oHHHHHgHHHHo.',
      '..oxXXXXXXxo..',
      '.oxXXXXXXXXxo.',
      'oxXXXXXXXXXXxo',
      'oxXwwXXwwXXXxo',
      'oooooooooooooo'
    ], 7, 18));

    P.def('npc_princess2', A([
      '.....w..ww....',
      '...ww.w..w....',
      '....Y.Y.y.....',
      '...oyYyYyo....',
      '..oooooooyo...',
      '.oHHHHHHHHHHo.',
      'o44ww3332ww11o',
      'o4woww33wwow1o',
      'o4woww33wwow1o',
      'o4wwww22wwow1o',
      'o4333322wwww1o',
      '.o3332gYg21o..',
      '.oHHHHHgHHHHo.',
      '..oxXXXXXXxo..',
      '.oxXXXXXXXXxo.',
      'oxXXXXXXXXXXxo',
      'oxwXXwwXXwXXxo',
      'oooooooooooooo'
    ], 7, 18));

    P.anim('npc_princess_idle', ['npc_princess0', 'npc_princess1', 'npc_princess2'], 4);
  }

  return { build };
})();
