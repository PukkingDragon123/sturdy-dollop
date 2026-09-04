/* ============================================================
   art/built.js - everything MADE by hands: the four placeable
   material kits (plank / brick / masonry / glass), the building
   kit the world-gen and the player raise houses from, the seven
   crafting stations, and the props and weeds that dress a room.

   House style: built things have straight lines, repeated
   modules and a visible joint. Natural rock does not. Light
   arrives from the upper left on every single sprite here.
   ============================================================ */
KD.art.built = (function () {
  const P = KD.PX;

  /* one tile / sprite per line: rows are split on '/' so a whole
     8x8 face fits on one readable line of source. */
  function K(name, pal, rows) { P.def(name, { pal: pal, px: rows.split('/') }); }

  /* ---------------------------------------------------------- *
   * A.1  PLANK - sawn boards, WOOD ramp. Boards run across,
   *      1px WOOD.0 seam every 4 rows, two bone nail heads.
   * ---------------------------------------------------------- */
  const W = { '0': 'INK.0', '1': 'INK.1', '2': 'WOOD.0', '3': 'WOOD.1',
              '4': 'WOOD.2', '5': 'WOOD.3', 'n': 'BONE.1' };

  function plank() {
    K('plank_mid', W, '45554444/4n444444/32333333/22222222/44445554/444444n4/33333323/22222222');
    K('plank_mid2', W, '44455544/44444444/33333333/22222222/45554444/44442244/33332233/22222222');
    K('plank_mid3', W, '54444554/44n44444/33233333/22222222/44455424/44444424/33333323/22222222');
    K('plank_top', W, '55555555/45445445/32333333/22222222/44445554/444444n4/33333323/22222222');
    K('plank_bot', W, '44455544/44444444/33333333/22222222/45554444/44442244/33232233/22222222');
    K('plank_left', W, '54444554/54n44444/53233333/52222222/54455424/54444424/53333323/52222222');
    K('plank_right', W, '45554442/4n444442/32333332/22222222/44445552/444444n2/33333322/22222222');
    K('plank_tl', W, '55555555/55445445/53333333/52222222/55554444/54442244/53332233/52222222');
    K('plank_tr', W, '55555552/45n45442/33233332/22222222/44455422/44444422/33333322/22222222');
    K('plank_bl', W, '55554444/5n444444/52333333/52222222/54445554/544444n4/53233223/52222222');
    K('plank_br', W, '44455542/44444442/33333332/22222222/45554442/44442242/33232232/22222222');
    K('plank_h', W, '55555555/45n45445/33233333/22222222/44455424/44444424/33233223/22222222');
    K('plank_v', W, '55554442/5n444442/52333332/52222222/54445552/544444n2/53333322/52222222');
    K('plank_cap', W, '55555552/55445442/53333332/52222222/55554442/54442242/53332232/52222222');
    K('plank_single', W, '55555552/55n45442/53233332/52222222/54455422/54444422/53233222/52222222');
  }

  /* ---------------------------------------------------------- *
   * A.2  BRICK - fired clay, RUST faces, SAND mortar. Courses
   *      offset by half a brick; 7px brick, 1px joint.
   * ---------------------------------------------------------- */
  const B = { '0': 'INK.0', '1': 'INK.1', 'm': 'SAND.0', 'M': 'SAND.1',
              '2': 'RUST.0', '3': 'RUST.1', '4': 'RUST.2', '5': 'RUST.3' };

  function brick() {
    K('brick_mid', B, 'm5555555/m4444444/m4444443/mmmmmmmm/5555m555/4444m444/4443m443/mmmmmmmm');
    K('brick_mid2', B, 'm4444444/m3333333/m3333332/mmmmmmmm/5555m555/4444m444/4443m443/mmmmmmmm');
    K('brick_mid3', B, 'm5555555/m4433444/m4433443/mmmmmmmm/5555m555/4444m444/4443m4mm/mmmmmmmm');
    K('brick_top', B, 'MMMMMMMM/mM44M44M/m4444443/mmmmmmmm/5555m555/4444m444/4443m443/mmmmmmmm');
    K('brick_bot', B, 'm4444444/m3333333/m3333332/mmmmmmmm/5555m555/4444m444/4423m243/22222222');
    K('brick_left', B, 'M5555555/M4433444/M4433443/Mmmmmmmm/M555m555/M444m444/M443m4mm/Mmmmmmmm');
    K('brick_right', B, 'm5555552/m4444442/m4444442/mmmmmmm2/5555m552/4444m442/4443m442/mmmmmmm2');
    K('brick_tl', B, 'MMMMMMMM/MM33M33M/M3333332/Mmmmmmmm/M555m555/M444m444/M443m443/Mmmmmmmm');
    K('brick_tr', B, 'MMMMMMM2/mM43M442/m4433442/mmmmmmm2/5555m552/4444m442/4443m4m2/mmmmmmm2');
    K('brick_bl', B, 'M5555555/M4444444/M4444443/Mmmmmmmm/M555m555/M444m444/M423m243/M2222222');
    K('brick_br', B, 'm4444442/m3333332/m3333332/mmmmmmm2/5555m552/4444m442/4423m242/22222222');
    K('brick_h', B, 'MMMMMMMM/mM43M44M/m4433443/mmmmmmmm/5555m555/4444m444/4423m2mm/22222222');
    K('brick_v', B, 'M5555552/M4444442/M4444442/Mmmmmmm2/M555m552/M444m442/M443m442/Mmmmmmm2');
    K('brick_cap', B, 'MMMMMMM2/MM33M332/M3333332/Mmmmmmm2/M555m552/M444m442/M443m442/Mmmmmmm2');
    K('brick_single', B, 'MMMMMMM2/MM43M442/M4433442/Mmmmmmm2/M555m552/M444m442/M423m2m2/M2222222');
  }

  /* ---------------------------------------------------------- *
   * A.3  MASONRY - Atlantean ashlar. One big precise block per
   *      tile, recessed 1px joint with a lit lower lip, and an
   *      incised wave band cut across the face. Ruins material.
   * ---------------------------------------------------------- */
  const M = { '0': 'INK.0', '1': 'INK.1', '2': 'STONE.0', '3': 'STONE.1',
              '4': 'STONE.2', '5': 'STONE.3', 'b': 'BONE.1', 'B': 'BONE.2' };

  function masonry() {
    K('masonry_mid', M, '33333333/35555555/35444444/35443344/35443344/35444443/35444433/33333333');
    K('masonry_mid2', M, '33333333/35555555/35444444/35333333/35BBBBBB/35444444/35444433/33333333');
    K('masonry_mid3', M, '33333333/35555555/33344433/35334434/35433344/35444444/35444433/33333333');
    K('masonry_top', M, '55555555/35555555/35444444/35443344/35443344/35444443/35444433/33333333');
    K('masonry_bot', M, '33333333/35555555/35444444/35333333/35BBBBBB/35444444/35244233/22222222');
    K('masonry_left', M, '53333333/55555555/53344433/55334434/55433344/55444444/55444433/53333333');
    K('masonry_right', M, '33333332/35555552/35444442/35443342/35443342/35444442/35444432/33333332');
    K('masonry_tl', M, '55555555/55555555/55444444/55333333/55BBBBBB/55444444/55444433/53333333');
    K('masonry_tr', M, '55555552/35555552/33344432/35334432/35433342/35444442/35444432/33333332');
    K('masonry_bl', M, '53333333/55555555/55444444/55443344/55443344/55444443/55244233/52222222');
    K('masonry_br', M, '33333332/35555552/35444442/35333332/35BBBBB2/35444442/35244232/22222222');
    K('masonry_h', M, '55555555/35555555/33344433/35334434/35433344/35444444/35244233/22222222');
    K('masonry_v', M, '53333332/55555552/55444442/55443342/55443342/55444442/55444432/53333332');
    K('masonry_cap', M, '55555552/55555552/55444442/55333332/55BBBBB2/55444442/55444432/53333332');
    K('masonry_single', M, '55555552/55555552/53344432/55334432/55433342/55444442/55244232/52222222');
  }

  /* ---------------------------------------------------------- *
   * A.4  GLASS - you can see the room through it. A sparse
   *      4x4 stipple of WATER.0, a 2px bone glare running down
   *      to the left, WATER.2 lit edges and a hard INK frame.
   * ---------------------------------------------------------- */
  const G = { '0': 'INK.0', '1': 'INK.1', 'w': 'WATER.0', 'c': 'WATER.2', 'B': 'BONE.2' };

  function glass() {
    K('glass_mid', G, 'w...w.../.....BB./..w.BB../...BB.../w.BB..../......../..w...w./........');
    K('glass_mid2', G, '..w...w./.BB...../..BB..w./...BB.../w...BB../......../w...w.../........');
    K('glass_mid3', G, 'w...w.../......../..w...w./...BB.../..BB..../......../..w...w./........');
    K('glass_top', G, 'cccccccc/.c..cBBc/..w.BB../...BB.../w.BB..../......../..w...w./........');
    K('glass_bot', G, '..w...w./.BB...../..BB..w./...BB.../w...BB../......../w...w.../wwwwwwww');
    K('glass_left', G, 'c...w.../c......./c.w...w./c..BB.../c.BB..../c......./c.w...w./c.......');
    K('glass_right', G, 'w...w..w/.....BBw/..w.BB.w/...BB..w/w.BB...w/.......w/..w...ww/.......w');
    K('glass_tl', G, 'cccccccc/ccB.c..c/c.BB..w./c..BB.../c...BB../c......./c...w.../c.......');
    K('glass_tr', G, 'cccccccw/.c..c..w/..w...ww/...BB..w/..BB...w/.......w/..w...ww/.......w');
    K('glass_bl', G, 'c...w.../c....BB./c.w.BB../c..BB.../c.BB..../c......./c.w...w./cwwwwwww');
    K('glass_br', G, '..w...ww/.BB....w/..BB..ww/...BB..w/w...BB.w/.......w/w...w..w/wwwwwwww');
    K('glass_h', G, 'cccccccc/.c..c..c/..w...w./...BB.../..BB..../......../..w...w./wwwwwwww');
    K('glass_v', G, 'c...w..w/c....BBw/c.w.BB.w/c..BB..w/c.BB...w/c......w/c.w...ww/c......w');
    K('glass_cap', G, 'cccccccw/ccB.c..w/c.BB..ww/c..BB..w/c...BB.w/c......w/c...w..w/c......w');
    K('glass_single', G, 'cccccccw/cc..c..w/c.w...ww/c..BB..w/c.BB...w/c......w/c.w...ww/cwwwwwww');
  }

  /* ---------------------------------------------------------- *
   * B. BUILDING KIT - the parts a house is assembled from.
   *    Single sprites, no autotiling; beams tile along their
   *    own axis, roof shells tile in both.
   * ---------------------------------------------------------- */
  const TIMBER = { '0': 'INK.0', '1': 'INK.1', '2': 'WOOD.0', '3': 'WOOD.1',
                   '4': 'WOOD.2', '5': 'WOOD.3', 'i': 'RUST.1', 'I': 'RUST.3' };

  const LIT = { '0': 'INK.0', '1': 'INK.1', 'g': 'GOLD.1', 'G': 'GOLD.2', 'y': 'GOLD.3' };

  const CORALPAL = { '0': 'INK.0', '1': 'INK.1', '2': 'CORAL.0', '3': 'CORAL.1',
                     '4': 'CORAL.2', '5': 'CORAL.3' };

  const COLUMN = { '0': 'INK.0', '1': 'INK.1', '2': 'STONE.0', '3': 'STONE.1',
                   '4': 'STONE.2', '5': 'STONE.3', 'B': 'BONE.2' };

  function buildkit() {
    /* structural timber ------------------------------------- */
    K('bk_beam_v', TIMBER, '.154430./.154430./.1IIII0./.1iiii0./.154430./.154430./.154230./.154430.');
    K('bk_beam_h', TIMBER, '......../11111111/55555555/44I444I4/44i444i4/33333333/00000000/........');

    /* a lit window: dithered gold interior behind a hard frame */
    K('bk_window', LIT, '11111111/1yG1GG01/1Gy1Gg01/1yG1gG01/1Gg1gg01/1gG1gg01/1gg1gg01/00000000');

    /* shell roofing: 4px scallops, courses offset by 2 -------- */
    K('bk_roof_shell',      CORALPAL, '54444455/24333422/52333255/45222544/44555444/34222433/32555233/25444522');
    K('bk_roof_shell_edge', CORALPAL, '54444455/24333422/52333255/45222544/44555444/34000433/30...033/0.....00');
    K('bk_roof_peak',       CORALPAL, '...00.../..0550../.055440./05544330/44555444/34222433/32555233/25444522');

    /* stepped platforms ------------------------------------- */
    K('bk_stair_r', TIMBER, '......11/......55/....1143/....5543/..114443/..554443/11444433/55443320');
    K('bk_stair_l', TIMBER, '11....../55....../4411..../4455..../444411../444455../44444411/33334455');

    /* fluted Atlantean column, three segments --------------- */
    K('bk_pillar_top',  COLUMN, '11111111/55555555/44444443/22222222/15BBBB30/15444430/12222220/15434320');
    K('bk_pillar_mid',  COLUMN, '12222220/15434320/15434320/15434320/15434320/15434320/15434320/15434320');
    K('bk_pillar_base', COLUMN, '15434320/15434320/12222220/11111111/55555555/44444444/33322222/00000000');

    /* hanging lantern: 8x12, warm when lit ------------------ */
    P.def('bk_lantern_lit', {
      pal: { '0': 'INK.0', 'i': 'RUST.1', 'I': 'RUST.3',
             'g': 'GOLD.1', 'G': 'GOLD.2', 'y': 'GOLD.3', 'W': 'WHITE' },
      px: ['...ii...', '...ii...', '.0IIII0.', '.0iiii0.',
           '.0GyyG0.', '.0yWWy0.', '.0yyyy0.', '.0GyyG0.',
           '.0GGgG0.', '.0gGgg0.', '.0IIII0.', '.000000.']
    });
    P.variant('bk_lantern_dark', 'bk_lantern_lit', {
      'GOLD.3': 'DEEP.1', 'GOLD.2': 'DEEP.0', 'GOLD.1': 'INK.1',
      'WHITE': 'DEEP.1', 'RUST.3': 'RUST.1', 'RUST.1': 'RUST.0'
    });

    /* 16x24 doors ------------------------------------------- */
    P.def('bk_door_closed', {
      pal: { '0': 'INK.0', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2',
             '5': 'WOOD.3', 'i': 'RUST.1', 'I': 'RUST.2', 'H': 'RUST.3' },
      px: [
        '0000000000000000',
        '0555555555555550',
        '0544325443254430',
        '0544325443254430',
        '0HIIIIHIIIIHIII0',
        '0iiiiiiiiiiiiii0',
        '0544325443254430',
        '0544325443254430',
        '0544325443254430',
        '0544325443254430',
        '0544325443254430',
        '0544325443254430',
        '05443254HHH54430',
        '05443254H2H54430',
        '05443254HHH54430',
        '0544325443254430',
        '0544325443254430',
        '0544325443254430',
        '0HIIIIHIIIIHIII0',
        '0iiiiiiiiiiiiii0',
        '0544325443254430',
        '0544325443254430',
        '0222222222222220',
        '0000000000000000'
      ]
    });
    P.def('bk_door_open', {
      pal: { '0': 'INK.0', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2',
             '5': 'WOOD.3', 'H': 'RUST.3', 'i': 'RUST.1',
             'd': 'INK.1', 'D': 'DEEP.0', 'E': 'DEEP.1' },
      px: [
        '0000000000000000',
        '05430dddddddddd0',
        '05430dDdDdDdDdD0',
        '05430dddddddddd0',
        '0H430dDdDdDdDdD0',
        '0i430dddddddddd0',
        '05430dDdDdDdDdD0',
        '05430dddddddddd0',
        '05430dDdDdDdDdD0',
        '05430dddddddddd0',
        '05430dDdDdDdDdD0',
        '0H430dddddddddd0',
        '0H430dDdDdDdDdD0',
        '0H430dddddddddd0',
        '05430dDdDdDdDdD0',
        '05430dddddddddd0',
        '05430dDdDdDdDdD0',
        '05430dddddddddd0',
        '0H430dDdDdDdDdD0',
        '0i430dddddddddd0',
        '05430EdEdEdEdEd0',
        '05430EEEEEEEEEE0',
        '02220DDDDDDDDDD0',
        '0000000000000000'
      ]
    });

    /* 24x10 blank hanging sign - text is drawn on top ------- */
    P.def('bk_sign', {
      pal: { '0': 'INK.0', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2',
             '5': 'WOOD.3', 'i': 'RUST.1', 'I': 'RUST.3' },
      px: [
        '.....iI.........iI......',
        '000000000000000000000000',
        '055555555555555555555550',
        '05I44444444444444444I430',
        '054444444444444444444430',
        '054444444444444444444430',
        '054444444444444444444430',
        '05I33333333333333333I330',
        '022222222222222222222220',
        '000000000000000000000000'
      ]
    });
  }

  /* ---------------------------------------------------------- *
   * C. CRAFTING STATIONS - 16x16. Read the silhouette first:
   *    table / hearth / anvil / frame / cauldron / pot.
   * ---------------------------------------------------------- */
  function stations() {
    /* WORKBENCH - trestle top, legs, lower shelf, mallet + saw */
    P.def('st_workbench', {
      pal: { '0': 'INK.0', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2', '5': 'WOOD.3',
             'i': 'RUST.1', 'I': 'RUST.3', 'b': 'BONE.1', 'B': 'BONE.2' },
      px: [
        '................',
        '.........bb.....',
        '........0BB0....',
        '........0BBb....',
        '..0000..0BB0....',
        '.0IIII0.0BBb....',
        '.0iiii0.0BB0....',
        '0000000000000000',
        '0555555555555550',
        '0444444444444430',
        '0222222222222220',
        '..0530.....0530.',
        '..0000000000000.',
        '..0444444444430.',
        '..0530.....0530.',
        '..0000.....0000.'
      ]
    });

    /* FURNACE - brick block, stone lintel, coals burning inside */
    P.def('st_furnace', {
      pal: { '0': 'INK.0', 'm': 'SAND.0', 'M': 'SAND.1', '4': 'RUST.2',
             'g': 'GOLD.1', 'G': 'GOLD.2', 'y': 'GOLD.3', 'W': 'WHITE' },
      px: [
        '....000.........',
        '....0M0.........',
        '.00000000000000.',
        '.0MMMMMMMMMMMM0.',
        '.044444444444m0.',
        '.04m44444444m40.',
        '.044000000004m0.',
        '.0440gGgGgG04m0.',
        '.0440GgGyGy04m0.',
        '.0440yGyGyG04m0.',
        '.0440yyWWyy04m0.',
        '.044000000004m0.',
        '.044444444444m0.',
        '.0mmmmmmmmmmmm0.',
        '.00000000000000.',
        '................'
      ]
    });

    /* ANVIL - horn left, pinched waist, splayed base */
    P.def('st_anvil', {
      pal: { '0': 'INK.0', 'D': 'RUST.0', 'i': 'RUST.1', 'I': 'RUST.2', 'H': 'RUST.3' },
      px: [
        '................',
        '................',
        '..0000000000000.',
        '.0HHHHHHHHHHHH0.',
        '0IIIIIIIIIIIIII0',
        '.0IIIIIIIIIIII0.',
        '...0IIIIIIII0...',
        '.....0IIII0.....',
        '.....0IiiI0.....',
        '.....0IiiI0.....',
        '....0IIIIII0....',
        '...0IIIIIIII0...',
        '..0IIIIIIIIII0..',
        '..0DDDDDDDDDD0..',
        '..000000000000..',
        '................'
      ]
    });

    /* REROLL ANVIL - the same iron with a gold rune burnt in */
    P.def('st_reroll', {
      pal: { '0': 'INK.0', 'D': 'RUST.0', 'i': 'RUST.1', 'I': 'RUST.2', 'H': 'RUST.3',
             'G': 'GOLD.2', 'y': 'GOLD.3' },
      px: [
        '....y..y........',
        '......yGy.......',
        '..0000000000000.',
        '.0HyGGGyHHHHHH0.',
        '0IIIIIIIIIIIIII0',
        '.0IIIIIIIIIIII0.',
        '...0IIIIIIII0...',
        '.....0IIII0.....',
        '.....0IyyI0.....',
        '.....0IiiI0.....',
        '....0IIIIII0....',
        '...0IIIIIIII0...',
        '..0IIIIIIIIII0..',
        '..0DDDDDDDDDD0..',
        '..000000000000..',
        '................'
      ]
    });

    /* LOOM - upright frame, warp threads, a band of cloth woven */
    P.def('st_loom', {
      pal: { '0': 'INK.0', '3': 'WOOD.1', '4': 'WOOD.2', '5': 'WOOD.3',
             'T': 'CLOTH.3', 'C': 'CORAL.2', 'c': 'CORAL.1', 'b': 'BONE.2' },
      px: [
        '.04..........40.',
        '.04..........40.',
        '.00000000000000.',
        '.05555555555550.',
        '.04.T.T.T.T..40.',
        '.04.T.T.T.T..40.',
        '.04.T.T.T.T..40.',
        '.04.T.T.T.T..40.',
        '.04CCCCCCCCCC40.',
        '.04cccccccccc40.',
        '.04.T.T.T.T..40.',
        '.04bbbbbb.T..40.',
        '.00000000000000.',
        '.05555555555550.',
        '.03333333333330.',
        '.00000000000000.'
      ]
    });

    /* ALCHEMY VAT - riveted tub, purple brew, bubbles leaving */
    P.def('st_vat', {
      pal: { '0': 'INK.0', 's': 'STONE.0', 'S': 'STONE.1', 'T': 'STONE.2',
             'H': 'STONE.3', 'p': 'ROT.1', 'P': 'ROT.2', 'q': 'ROT.3' },
      px: [
        '...qq...qq......',
        '...qq...qq......',
        '......qq........',
        '.00000000000000.',
        '.0TTTTTTTTTTTT0.',
        '.0qqPqqPqqPqqP0.',
        '.0PpPpPpPpPpPp0.',
        '.0pppppppppppp0.',
        '.0TTSSSSSSSSss0.',
        '.0HHHHHHHHHHHH0.',
        '.0TTSSSSSSSSss0.',
        '.0TTSSSSSSSSss0.',
        '.0ssssssssssss0.',
        '.00000000000000.',
        '..0S0......0S0..',
        '..000......000..'
      ]
    });

    /* COOK POT - copper pot, beer, and foam going over the side */
    P.def('st_cookpot', {
      pal: { '0': 'INK.0', 'b': 'BONE.1', 'B': 'BONE.2', 'i': 'RUST.1',
             'I': 'RUST.2', 'H': 'RUST.3', 'g': 'GOLD.1', 'G': 'GOLD.2',
             'y': 'GOLD.3', 'f': 'BLOOD.2', 'F': 'BLOOD.3' },
      px: [
        '....BB...BB.....',
        '..BBBBB.BBBB....',
        '.BBBBBBBBBBBBB..',
        '.bBBBBBBBBBBBb..',
        '.00000000000000.',
        '.0HHHHHHHHHHHH0.',
        '.0yGyGyGyGyGyG0.',
        '.0GgGgGgGgGgGg0.',
        '.0HIIIIIIIIIIi0.',
        '.0HIIIIIIIIIIi0.',
        '.0HIIIIIIIIIIi0.',
        '.0HIIIIIIIIIIi0.',
        '..0IIIIIIIIII0..',
        '..000000000000..',
        '...FfFfFfFfFf...',
        '....fFfFfF......'
      ]
    });
  }

  /* ---------------------------------------------------------- *
   * D. DECORATION - hangs off a tile face, mostly transparent.
   * ---------------------------------------------------------- */
  const WEED = { '0': 'INK.0', '1': 'KELP.0', '2': 'KELP.1', '3': 'KELP.2', '4': 'KELP.3' };

  function decor() {
    /* kelp, 8x24, three silhouettes: sway right, sway left, thick */
    K('dc_kelp1', WEED,
      '...42.../...31.../.2231.../...31.../...3144./...31.../.2231.../...31.../' +
      '...3144./..31..../2231..../..31..../..3144../..31..../.2231.../...31.../' +
      '...3144./...31.../.2231.../...31.../...31.../..231.../...31.../..0310..');
    K('dc_kelp2', WEED,
      '.42...../.31...../.3122.../.31...../.31...../.3122.../..31..../..31..../' +
      '4431..../..31..../..3122../..31..../...31.../.4431.../...31.../...3122./' +
      '...31.../....31../..4431../....31../....3122/....31../....31../...0310.');
    K('dc_kelp3', WEED,
      '..44..../..321.../..321.../..321444/..321444/..321.../..321.../44321.../' +
      '44321.../..321.../..321.../..321444/..321444/..321.../..321.../44321.../' +
      '44321.../..321.../..321.../..321444/..321.../..321.../..321.../.03210..');

    K('dc_seagrass1', WEED, '.4....4./.3...43./.3.4.3../.23.43../..3.3.../..2332../..1231../..0110..');
    K('dc_seagrass2', WEED, '......4./.4...43./.3.4.3../.3.3.3../.34334../..3331../..2231../.001100.');

    /* anemones, CORAL */
    K('dc_anemone1', CORALPAL, '.5.5..5./.4.4.54./.44.444./.044440./.045540./.044430./.033220./.000000.');
    K('dc_anemone2', CORALPAL, '5.5.5.5./4.4.4.4./44.444.4/.444444./.055550./.044430./.043320./.002200.');

    /* urchin - a black knot of spines */
    P.def('dc_urchin', {
      pal: { '1': 'INK.1', 'P': 'ROT.2', 'q': 'ROT.3' },
      px: ['..q...q.', 'q.P..P.q', '.PPqqPP.', 'qPq11qPq',
           '.Pq11qP.', 'qPPqqPP.', '..P..P.q', '.q...q..']
    });

    /* bones - loose vertebrae, and a ribcage */
    const OSS = { '0': 'INK.0', '1': 'INK.1', 'B': 'BONE.1', 'W': 'BONE.2' };
    K('dc_bones1', OSS, '......../WW....WW/WBWWWWBW/0BBBBBB0/WB0000BW/00....00/.WBW.WBW/.0B0.0B0');
    K('dc_bones2', OSS, '.WW...../.BB...../.BBWW.../.BB..WW./.BBWW.../.BB..WW./.BBWW.../.00..WW.');

    /* chain - one wide link and one edge-on link, tiles down */
    K('dc_chain', OSS, '..0WW0../.0W11W0./.0W11W0./..0WW0../..0WW0../..0BB0../..0BB0../..0WW0..');

    /* wall moss - clumps, mostly holes */
    K('dc_moss', WEED, '.44..44./3443.443/.22..22./.2....2./......../..44.44./.3443.43/..22.22.');

    /* glowpod - a lamp: white core, purple shell, four sparks */
    P.def('dc_glowpod', {
      pal: { 'p': 'ROT.1', 'P': 'ROT.2', 'q': 'ROT.3', 'W': 'WHITE' },
      px: ['..q..q..', '.P.qq...', '..qWWq.P', '.qWWWWq.',
           '.qWWWWq.', 'P.qWWq..', '...qq.P.', '..ppp...']
    });

    /* ---- 16x16 props ------------------------------------- */
    P.def('dc_barrel', {
      pal: { '0': 'INK.0', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2',
             '5': 'WOOD.3', 'i': 'RUST.1', 'I': 'RUST.3' },
      px: [
        '...0000000000...',
        '...0333333330...',
        '..0IIIIIIIIII0..',
        '.05444444444430.',
        '.05442442442430.',
        '.05442442442430.',
        '.0IIIIIIIIIIII0.',
        '.0iiiiiiiiiiii0.',
        '.05442442442430.',
        '.05442442442430.',
        '.05442442442430.',
        '.0IIIIIIIIIIII0.',
        '.0iiiiiiiiiiii0.',
        '..044244244330..',
        '...0222222220...',
        '...0000000000...'
      ]
    });

    P.def('dc_crate', {
      pal: { '0': 'INK.0', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2', '5': 'WOOD.3' },
      px: [
        '0000000000000000',
        '0555555555555550',
        '0544444444444430',
        '0555333333335530',
        '0535533333355330',
        '0533553333553330',
        '0533355335533330',
        '0533335555333330',
        '0533333553333330',
        '0533335555333330',
        '0533355335533330',
        '0533553333553330',
        '0535533333355330',
        '0544444444444430',
        '0522222222222220',
        '0000000000000000'
      ]
    });

    P.def('dc_urn', {
      pal: { '0': 'INK.0', '2': 'SAND.0', '3': 'SAND.1', '4': 'SAND.2',
             '5': 'SAND.3', 'C': 'CORAL.1' },
      px: [
        '....000000......',
        '....055440......',
        '.....0540.......',
        '.....0540.......',
        '....05430.......',
        '...0554430......',
        '..0554443330....',
        '.055444433330...',
        '.05544444333320.',
        '.05CCCCCCCCCC20.',
        '.05544444333320.',
        '..054444333320..',
        '...0544433320...',
        '....05443320....',
        '....05443320....',
        '....00000000....'
      ]
    });

    P.def('dc_chest_closed', {
      pal: { '0': 'INK.0', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2', '5': 'WOOD.3',
             'i': 'RUST.1', 'I': 'RUST.3', 'g': 'GOLD.1', 'G': 'GOLD.2', 'y': 'GOLD.3' },
      px: [
        '..000000000000..',
        '.05555555555530.',
        '.05444444444430.',
        '.0IIIIIIIIIIII0.',
        '.0iiiiiiiiiiii0.',
        '.05444yGGy44430.',
        '.00000yGGy00000.',
        '.05444yGgy44430.',
        '.05444444444430.',
        '.0IIIIIIIIIIII0.',
        '.0iiiiiiiiiiii0.',
        '.05444444444430.',
        '.05444444444430.',
        '.02222222222220.',
        '..000000000000..',
        '................'
      ]
    });

    P.def('dc_chest_open', {
      pal: { '0': 'INK.0', '1': 'INK.1', '2': 'WOOD.0', '3': 'WOOD.1', '4': 'WOOD.2',
             '5': 'WOOD.3', 'i': 'RUST.1', 'I': 'RUST.3',
             'g': 'GOLD.1', 'G': 'GOLD.2', 'y': 'GOLD.3' },
      px: [
        '..000000000000..',
        '.02333333333320.',
        '.02222222222220.',
        '.00000000000000.',
        '.01111111111110.',
        '.011yGG111yG110.',
        '.01yGGGy1yGGy10.',
        '.00000000000000.',
        '.05555555555530.',
        '.05444444444430.',
        '.0IIIIIIIIIIII0.',
        '.0iiiiiiiiiiii0.',
        '.05444444444430.',
        '.05444444444430.',
        '.02222222222220.',
        '..000000000000..'
      ]
    });

    /* the drowned king in stone: crown, beard, one arm snapped off */
    P.def('dc_statue', {
      pal: { '0': 'INK.0', '2': 'STONE.0', '3': 'STONE.1', '4': 'STONE.2',
             '5': 'STONE.3', 'B': 'BONE.2', 'k': 'KELP.1' },
      px: [
        '....00.00.00....',
        '...0554554550...',
        '...0555555550...',
        '...0444444430...',
        '...05444444430..',
        '...0542242230...',
        '...0544444430...',
        '...0553553530...',
        '...0553553530...',
        '....05335330....',
        '.05544444433330.',
        '.05544444433330.',
        '.0BB44444433330.',
        '...054444433330.',
        '...054444433330.',
        '...054444233330.',
        '...054444233330.',
        '...054444433330.',
        '...022222222220.',
        '...054444433330.',
        '...054444433330.',
        '..0k44444433330.',
        '..0k44444433330.',
        '.055444444333330',
        '.055444444333330',
        '0554444444333330',
        '0000000000000000',
        '0555555555555550',
        '0444444444444430',
        '0222222222222220',
        '0000000000000000',
        '0000000000000000'
      ]
    });
  }

  /* ---------------------------------------------------------- */
  function build() {
    plank(); brick(); masonry(); glass();
    buildkit(); stations(); decor();
  }

  return { build };
})();
