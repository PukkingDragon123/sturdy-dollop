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

  /* a frame that is another frame with named rows redrawn. Still
     hand-drawn pixels - this is just not retyping the thirty rows
     of a boss that did not move. */
  function edit(base, changes) {
    const out = base.slice();
    for (const k in changes) out[+k] = changes[k];
    return out;
  }
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
      '............',
      '............',
      '.....oooo...',
      '..oooo%%$oo.',
      '.oKKKo%%$$to',
      'oKoKow%$$#vo',
      'okoowwgyYGUo',
      '.owwBb$TTtuo',
      '..oooooooooo'
    ], 6, 18));

    P.anim('king_idle', ['king_idle0', 'king_idle1'], 3);
    P.anim('king_walk', ['king_walk0', 'king_walk1', 'king_walk2',
      'king_walk3', 'king_walk4', 'king_walk5'], 10);
    P.anim('king_swim', ['king_swim0', 'king_swim1', 'king_swim2', 'king_swim3'], 8);
    P.anim('king_mine', ['king_mine0', 'king_mine1', 'king_mine2'], 12);
  }

  return { build };
})();
