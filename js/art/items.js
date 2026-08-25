/* ============================================================
   art/items.js - every item icon, 12x12, hand-drawn one pixel
   at a time. Tools and weapons are drawn ONCE as neutral SHAPES
   (STONE ramp for the working part, WOOD ramp for the handle) and
   the procedural crafting system in js/rpg recolours them per
   material with P.variant. The two regions never share a ramp, so
   a palette swap on the edge material cannot bleed into the grip.
   ============================================================ */
KD.art.items = (function () {
  const P = KD.PX;

  /* ---- the shared shape legend -----------------------------
     o/i  INK outline, shared by everything
     1-4  the WORKING part: STONE dark -> light. Recoloured per
          material (the "edge material" of a recipe).
     a-d  the HANDLE: WOOD dark -> light. Left alone by the
          material variants, so grips stay wood.
     Light comes from the upper left on every one of these.      */
  const T = {
    'o': 'INK.0', 'i': 'INK.2',
    '1': 'STONE.0', '2': 'STONE.1', '3': 'STONE.2', '4': 'STONE.3',
    'a': 'WOOD.0', 'b': 'WOOD.1', 'c': 'WOOD.2', 'd': 'WOOD.3'
  };

  /* the 4 working-part steps, in order, for the recolour loop */
  const EDGE = ['STONE.0', 'STONE.1', 'STONE.2', 'STONE.3'];

  /* material ramps: dark, body, lit, spec.
     copper RUST / bronze the GOLD ramp / iron BONE over an INK
     shadow / gold the bright top of GOLD / abyssal ROT.          */
  const MATS = {
    copper:  ['RUST.0', 'RUST.1', 'RUST.2', 'RUST.3'],
    bronze:  ['GOLD.0', 'GOLD.1', 'GOLD.2', 'GOLD.3'],
    iron:    ['INK.3', 'BONE.0', 'BONE.1', 'BONE.2'],
    gold:    ['GOLD.1', 'GOLD.2', 'GOLD.3', 'WHITE'],
    abyssal: ['ROT.0', 'ROT.1', 'ROT.2', 'ROT.3']
  };

  /* every shape the crafting system can stamp a material onto */
  const TOOLS = ['it_pick', 'it_shovel', 'it_axe', 'it_hammer', 'it_drill'];
  const WEAPONS = ['it_shortblade', 'it_cleaver', 'it_longblade', 'it_spear',
                   'it_trident', 'it_halberd', 'it_maul', 'it_fork'];

  function build() {
    /* ================= TOOLS ================= */

    /* pick: flat crown, both arms diving out to hooked tips */
    P.def('it_pick', { pal: T, px: [
      '...oooooo...',
      '..o444333o..',
      '.o44oooo44o.',
      'o43ocbao34o.',
      'oooocbaoooo.',
      '...ocbao....',
      '...ocbao....',
      '...oabao....',
      '...ocbao....',
      '...ocbao....',
      '...ocbao....',
      '...ooooo....'
    ] });

    /*    /* spade: T-grip, shaft, wide dished blade */
    P.def('it_shovel', { pal: T, px: [
      '..oooooo....',
      '..odccbo....',
      '..oocboo....',
      '...ocbo.....',
      '.ooocbooooo.',
      '.o44333322o.',
      '.o44333222o.',
      '.o44333222o.',
      '.oo433222oo.',
      '..oo3322oo..',
      '...oooooo...',
      '............'
    ] });

    /*    /* axe: short eye at the haft, bit fanned out to a tall edge */
    P.def('it_axe', { pal: T, px: [
      '.oooo.......',
      '.ocbo...oooo',
      '.ocbo.ooo43o',
      '.ocbooo4433o',
      '.ocbo444333o',
      '.ocb4433322o',
      '.ocb4333222o',
      '.ocb3332221o',
      '.ocbo332221o',
      '.ocaooo3221o',
      '.ocbo.ooo21o',
      '.oooo...oooo'
    ] });

    /* sledge: one blunt brick of a head */
    P.def('it_hammer', { pal: T, px: [
      '.oooooooo...',
      '.o4443332o..',
      '.o4333222o..',
      '.o3322211o..',
      '.ooocbaooo..',
      '...ocbao....',
      '...ocbao....',
      '...oabao....',
      '...ocbao....',
      '...ocbao....',
      '...ocbao....',
      '...ooooo....'
    ] });

    /* drill: wood grip, chuck, spiral-fluted bit */
    P.def('it_drill', { pal: T, px: [
      '.oooooooo...',
      '.oddccbbo...',
      '.odccbbao...',
      '.occbbaao...',
      '.oo4432oo...',
      '..oi432o....',
      '..o4i32o....',
      '..o43i2o....',
      '..oo43io....',
      '...o432o....',
      '...o42oo....',
      '...oooo.....'
    ] });

    /* ================= WEAPONS ================= */

    /* dagger: short diagonal blade, stubby guard */
    P.def('it_shortblade', { pal: T, px: [
      '.........oo.',
      '........o43o',
      '.......o43o.',
      '......o43o..',
      '.....o43o...',
      '....o43o....',
      '.oo2222oo...',
      '..occbo.....',
      '..occbo.....',
      '..ocbao.....',
      '.oo222oo....',
      '..oooo......'
    ] });

    /* cleaver: broad chopping slab, grip hung off the bottom left */
    P.def('it_cleaver', { pal: T, px: [
      '...oooooooo.',
      '..o44443332o',
      '..o44333222o',
      '..o43332222o',
      '..o43322211o',
      '..o33222111o',
      '..oo32211o..',
      '...ooo221o..',
      '..occboooo..',
      '..occbo.....',
      '.oocbaoo....',
      '.ooooooo....'
    ] });

    /* the sword: straight blade, fullered centre, cross guard */
    P.def('it_longblade', { pal: T, px: [
      '.....oo.....',
      '....o43o....',
      '...o432o....',
      '...o432o....',
      '...o432o....',
      '...o432o....',
      '...o432o....',
      '.oo33333oo..',
      '...ocbao....',
      '...ocbao....',
      '..o23322o...',
      '...ooooo....'
    ] });

    /* spear: broad leaf head, long raked shaft */
    P.def('it_spear', { pal: T, px: [
      '........ooo.',
      '.......o444o',
      '......o4433o',
      '.....o44322o',
      '.....o4332o.',
      '....o432oo..',
      '....ocbo....',
      '...ocbo.....',
      '..ocbo......',
      '..ocao......',
      '.ocbo.......',
      'ooo.........'
    ] });

    /* trident: three prongs off a socket bar */
    P.def('it_trident', { pal: T, px: [
      '..oo.oo.oo..',
      '..42.42.42..',
      '..42.42.42..',
      '..42.42.42..',
      '.o43333322o.',
      '.oo33322oo..',
      '....ocbo....',
      '....ocbo....',
      '....oabo....',
      '....ocbo....',
      '....ocbo....',
      '....oooo....'
    ] });

    /* halberd: top spike, socket, axe cheek off the right */
    P.def('it_halberd', { pal: T, px: [
      '...o4oooooo.',
      '...o43o443oo',
      '...o4344332o',
      '...o4343322o',
      '...o434332oo',
      '...o43o32oo.',
      '...o32oooo..',
      '...ocbo.....',
      '...ocbo.....',
      '...oabo.....',
      '...ocbo.....',
      '...oooo.....'
    ] });

    /* maul: banded drum head, choked haft */
    P.def('it_maul', { pal: T, px: [
      '.oooooooooo.',
      'o44i3332i22o',
      'o43i3222i11o',
      'o43i2221i11o',
      'o33i2211i11o',
      '.oooocbaooo.',
      '....ocbao...',
      '....ocbao...',
      '....oaaao...',
      '....ocbao...',
      '....ocbao...',
      '....ooooo...'
    ] });

    /* war fork: two long tines off a barbed crossbar */
    P.def('it_fork', { pal: T, px: [
      '...oo.oo....',
      '...42.42....',
      '...42.42....',
      '...42.42....',
      '...42.42....',
      '..o422224o..',
      '..oo3221oo..',
      '....ocbo....',
      '....oabo....',
      '....ocbo....',
      '....ocbo....',
      '....oooo....'
    ] });

    /* ================= ARMOUR ================= */

    /*    /* helm: crown, twin eye slits over a nose bridge, chin taper */
    P.def('it_helm', { pal: T, px: [
      '...oo4ooo...',
      '.ooo4433ooo.',
      'oo44443332oo',
      'o4443333222o',
      'o44ii33ii22o',
      'o4433333222o',
      'oo443i3222oo',
      '.o44333222o.',
      '.oo433222oo.',
      '..oo3322oo..',
      '...oooooo...',
      '............'
    ] });

    /* cuirass: pauldron line, centre seam, waisted skirt */
    P.def('it_chest', { pal: T, px: [
      'oooooooooooo',
      'o4i433322i2o',
      'o4443332222o',
      'oo4433i222oo',
      '.o4433i222o.',
      '.o4433i222o.',
      '.o4433i222o.',
      '.o4433i222o.',
      '.oo433i22oo.',
      '..o433i22o..',
      '..o433222o..',
      '..oooooooo..'
    ] });

    /* greaves: belt, two legs, flared boot cuffs */
    P.def('it_greaves', { pal: T, px: [
      'oooooooooooo',
      'o4443332222o',
      'o443i332222o',
      'oo443oo322oo',
      '.o443oo322o.',
      '.o443oo322o.',
      '.o4i3oo3i2o.',
      '.o443oo322o.',
      'oo443oo322oo',
      'o4433oo3222o',
      'o4433oo3222o',
      'oooooooooooo'
    ] });

    /* shell shield: scallop fan, ribbed, tapered foot */
    P.def('it_shell', { pal: T, px: [
      '.oooooooooo.',
      'oo44333222oo',
      'o4443i33222o',
      'o443i33i222o',
      'o443i33i222o',
      'oo43i33i22oo',
      '.o43i33i22o.',
      '.oo4i33i2oo.',
      '..oo4332oo..',
      '...oo332o...',
      '....o33oo...',
      '....oooo....'
    ] });

    /* ================= MATERIALS ================= */

    /* copper ore: rough rock with three struck facets */
    P.def('it_ore_copper', {
      pal: { 'o': 'INK.0', 's': 'STONE.2', 'r': 'STONE.1', 't': 'STONE.0', 'k': 'RUST.3', 'n': 'RUST.2', 'm': 'RUST.1' },
      px: [
      '..oooooooo..',
      '.oossssrroo.',
      'oosknsrrrroo',
      'ossnmrrrrtto',
      'osssrrkkntto',
      'ossrrrnnmtto',
      'oorrknttttoo',
      '.orrnmtttto.',
      '.oortttttoo.',
      '..oottttoo..',
      '...oooooo...',
      '............'
      ]
    });

    /* bronze ore: rough rock with three struck facets */
    P.def('it_ore_bronze', {
      pal: { 'o': 'INK.0', 's': 'STONE.2', 'r': 'STONE.1', 't': 'STONE.0', 'k': 'GOLD.2', 'n': 'GOLD.1', 'm': 'GOLD.0' },
      px: [
      '..oooooooo..',
      '.oossssrroo.',
      'oosknsrrrroo',
      'ossnmrrrrtto',
      'osssrrkkntto',
      'ossrrrnnmtto',
      'oorrknttttoo',
      '.orrnmtttto.',
      '.oortttttoo.',
      '..oottttoo..',
      '...oooooo...',
      '............'
      ]
    });

    /* iron ore: rough rock with three struck facets */
    P.def('it_ore_iron', {
      pal: { 'o': 'INK.0', 's': 'STONE.1', 'r': 'STONE.0', 't': 'INK.2', 'k': 'BONE.2', 'n': 'BONE.1', 'm': 'BONE.0' },
      px: [
      '..oooooooo..',
      '.oossssrroo.',
      'oosknsrrrroo',
      'ossnmrrrrtto',
      'osssrrkkntto',
      'ossrrrnnmtto',
      'oorrknttttoo',
      '.orrnmtttto.',
      '.oortttttoo.',
      '..oottttoo..',
      '...oooooo...',
      '............'
      ]
    });

    /* gold ore: rough rock with three struck facets */
    P.def('it_ore_gold', {
      pal: { 'o': 'INK.0', 's': 'STONE.2', 'r': 'STONE.1', 't': 'STONE.0', 'k': 'GOLD.3', 'n': 'GOLD.2', 'm': 'GOLD.1' },
      px: [
      '..oooooooo..',
      '.oossssrroo.',
      'oosknsrrrroo',
      'ossnmrrrrtto',
      'osssrrkkntto',
      'ossrrrnnmtto',
      'oorrknttttoo',
      '.orrnmtttto.',
      '.oortttttoo.',
      '..oottttoo..',
      '...oooooo...',
      '............'
      ]
    });

    /* abyssal ore: rough rock with three struck facets */
    P.def('it_ore_abyssal', {
      pal: { 'o': 'INK.0', 's': 'STONE.1', 'r': 'STONE.0', 't': 'INK.2', 'k': 'ROT.3', 'n': 'ROT.2', 'm': 'ROT.1' },
      px: [
      '..oooooooo..',
      '.oossssrroo.',
      'oosknsrrrroo',
      'ossnmrrrrtto',
      'osssrrkkntto',
      'ossrrrnnmtto',
      'oorrknttttoo',
      '.orrnmtttto.',
      '.oortttttoo.',
      '..oottttoo..',
      '...oooooo...',
      '............'
      ]
    });

    /*    /* ingots: two bars stacked and offset, lit cast faces */
    P.def('it_bar', { pal: T, px: [
      '............',
      '....oooooooo',
      '...oo444444o',
      '...o2222222o',
      '...o1111111o',
      '.ooooooooooo',
      'oo333333o...',
      'o2222222o...',
      'o1111111o...',
      'ooooooooo...',
      '............',
      '............'
    ] });
    /*    /* plank: sawn board, lit top edge, two grain streaks */
    P.def('it_plank_i', {
      pal: { 'o': 'INK.0', 'd': 'WOOD.3', 'c': 'WOOD.2', 'b': 'WOOD.1', 'a': 'WOOD.0' },
      px: [
      '............',
      '............',
      'oooooooooooo',
      'oddddddddddo',
      'occcccccccco',
      'ocbbcccbbcco',
      'obbbbbbbbbbo',
      'obaabbbbaabo',
      'oaaaaaaaaaao',
      'oooooooooooo',
      '............',
      '............'
      ]
    });

    /* brick: three courses of Atlantean masonry, running bond */
    P.def('it_brick_i', {
      pal: { 'o': 'INK.0', 'i': 'INK.2', '3': 'STONE.2', '2': 'STONE.1', '1': 'STONE.0' },
      px: [
      '............',
      '.oooooooooo.',
      '.o33333333o.',
      '.o32222i22o.',
      '.o32222i21o.',
      '.oiiiiiiiio.',
      '.o32i22222o.',
      '.o32i22221o.',
      '.oiiiiiiiio.',
      '.o32222i21o.',
      '.oooooooooo.',
      '............'
      ]
    });

    /* conch: stepped whorl up to the apex, coral aperture at the lip */
    P.def('it_shell_i', {
      pal: { 'o': 'INK.0', 'w': 'BONE.2', 'x': 'BONE.1', 'v': 'BONE.0', 'p': 'CORAL.2', 'q': 'CORAL.1' },
      px: [
      '............',
      '.......oooo.',
      '......oowwo.',
      '.....oowwvo.',
      '...ooowwvxo.',
      '..oowwvwwxo.',
      '.oowwvwwvxo.',
      '.opqwvwwvxo.',
      '.oppwvwwvoo.',
      '.ooppwvwwo..',
      '..oopwvwoo..',
      '...oooooo...'
      ]
    });

    /* coral: two-armed sprig off a stubby foot */
    P.def('it_coral_i', {
      pal: { 'o': 'INK.0', 'p': 'CORAL.3', 'q': 'CORAL.2', 'n': 'CORAL.1', 'm': 'CORAL.0' },
      px: [
      '............',
      '..ooo..ooo..',
      '..opo..opo..',
      '..oqo.ooqo..',
      '..oqoooqqo..',
      '..ooqqoqoo..',
      '...ooqqqo...',
      '....onqno...',
      '...oonnno...',
      '...onnnno...',
      '...ommmmo...',
      '...oooooo...'
      ]
    });

    /* kelp: a stipe with three blades peeling off it */
    P.def('it_kelp_i', {
      pal: { 'o': 'INK.0', 'g': 'KELP.3', 'h': 'KELP.2', 'j': 'KELP.1', 'k': 'KELP.0' },
      px: [
      '.....ooo....',
      '....oogo....',
      '...oohgooo..',
      '...ohgoggo..',
      '..oohjohgo..',
      '..ohjohhoo..',
      '..ojjhgoo...',
      '..oojjooo...',
      '...ojkhho...',
      '..ookkooo...',
      '..okkko.....',
      '..ooooo.....'
      ]
    });

    /* cloth: folded bolt with one hard crease */
    P.def('it_cloth_i', {
      pal: { 'o': 'INK.0', 'i': 'INK.2', '3': 'CLOTH.3', '2': 'CLOTH.2', '1': 'CLOTH.1', '0': 'CLOTH.0' },
      px: [
      '............',
      '............',
      '.oooooooooo.',
      'oo33333333oo',
      'o3222222223o',
      'o3211111112o',
      'o2iiiiiiii2o',
      'o2100000001o',
      'oo11000000oo',
      '.oo000000oo.',
      '..oooooooo..',
      '............'
      ]
    });

    /* bone: knuckled at both ends, shaft between */
    P.def('it_bone_i', {
      pal: { 'o': 'INK.0', 'w': 'BONE.2', 'x': 'BONE.1', 'v': 'BONE.0' },
      px: [
      '............',
      '............',
      'oooo....oooo',
      'owwo....owwo',
      'owxooooooxwo',
      'owwwwwwwwwwo',
      'oxxxxxxxxxxo',
      'owxooooooxvo',
      'owwo....ovvo',
      'oooo....oooo',
      '............',
      '............'
      ]
    });

    /* pearl: stepped octagon, specular knocked up to the left */
    P.def('it_pearl', {
      pal: { 'o': 'INK.0', 'W': 'WHITE', 'w': 'BONE.2', 'x': 'BONE.1', 'v': 'BONE.0' },
      px: [
      '............',
      '...oooooo...',
      '..oowwwwoo..',
      '.oowWWwwwoo.',
      '.owWWwwwxxo.',
      '.owwwwwwxxo.',
      '.owwwwwxxvo.',
      '.oxwwwxxvvo.',
      '.ooxxxxvvoo.',
      '..ooxvvvoo..',
      '...oooooo...',
      '............'
      ]
    });

    /* glowpod: dark rind, cold bright core */
    P.def('it_glowpod_i', {
      pal: { 'o': 'INK.0', 'W': 'WATER.3', 'h': 'WATER.2', 'g': 'KELP.1', 'j': 'KELP.0' },
      px: [
      '....ooo.....',
      '....ojo.....',
      '....ogoo....',
      '...ooggoo...',
      '..ooghhgoo..',
      '..oghWWhgo..',
      '..oghWWhgo..',
      '..oghhhhgo..',
      '..ooghhgoo..',
      '...ooggoo...',
      '....oooo....',
      '............'
      ]
    });

    /* ================= CONSUMABLES ================= */

    /* tankard: foam over the lip, amber body, side handle */
    P.def('it_beer_mug', {
      pal: { 'o': 'INK.0', 'F': 'BONE.2', 'f': 'BONE.1', 'G': 'GOLD.3', 'g': 'GOLD.2', 'h': 'GOLD.1' },
      px: [
      '............',
      '.oooooo.....',
      'ooFFFFoo....',
      'oFFFFFFo....',
      'ofFFFffo....',
      'oGGggghooo..',
      'oGGggghffo..',
      'oGGggghofo..',
      'oGggghoofo..',
      'oGgghooffo..',
      'ohhhhhhooo..',
      'oooooooo....'
      ]
    });

    /* keg: bulged staves, two iron hoops, a spigot on the left */
    P.def('it_beer_keg', {
      pal: { 'o': 'INK.0', 'i': 'INK.2', 'd': 'WOOD.3', 'c': 'WOOD.2', 'b': 'WOOD.1', 'a': 'WOOD.0', 'k': 'STONE.2' },
      px: [
      '............',
      '..oooooooo..',
      '.ooddddddoo.',
      '.occcccccco.',
      'ooiiiiiiiioo',
      'occcccccccco',
      'ocbbbbbbbbbo',
      'oiiiiiiiiiio',
      'kobbbbbbbboo',
      'oooaaaaaaoo.',
      '..oooooooo..',
      '............'
      ]
    });

    /* flask: corked neck, glass specular down the left, liquid recoloured per effect */
    P.def('it_potion', {
      pal: { 'o': 'INK.0', 'b': 'WOOD.1', 'd': 'WOOD.3', 'v': 'WATER.0', 'w': 'WATER.2', '7': 'BLOOD.3', '6': 'BLOOD.2', '5': 'BLOOD.1' },
      px: [
      '....oooo....',
      '....obbo....',
      '....oddo....',
      '...oovvoo...',
      '..oovwwvo...',
      '.oovw77vooo.',
      '.ovw77666vo.',
      '.ovw66655vo.',
      '.ovw65555vo.',
      '.ovw55555vo.',
      '.ovwwwwwwvo.',
      '.oooooooooo.'
      ]
    });

    /* reef fish: deep body, forked tail left, eye up front */
    P.def('it_fish1', {
      pal: { 'o': 'INK.0', 'W': 'WHITE', 'p': 'CORAL.2', 'q': 'CORAL.1', 'm': 'CORAL.0' },
      px: [
      '............',
      '............',
      '....ooooo...',
      '..ooopppooo.',
      'ooopppppppoo',
      'omqppppppWqo',
      'omqppppppqoo',
      'omqqqqqqqoo.',
      'oooqqqmmoo..',
      '..ooommoo...',
      '....oooo....',
      '............'
      ]
    });

    /* eel-fish: long slim body, low dorsal, sand-pale snout */
    P.def('it_fish2', {
      pal: { 'o': 'INK.0', 'W': 'WHITE', 'g': 'KELP.2', 'h': 'KELP.1', 'k': 'KELP.0', 'd': 'SAND.2' },
      px: [
      '............',
      '.....oooo...',
      '...oooggo...',
      'ooooghhgoooo',
      'okgggggggWdo',
      'khgggggggdoo',
      'okhhhhhhhho.',
      'ooohhkkoooo.',
      '..oookko....',
      '....oooo....',
      '............',
      '............'
      ]
    });

    /* trench fish: bulging eye, lure spine, rot-purple hide */
    P.def('it_fish3', {
      pal: { 'o': 'INK.0', 'W': 'WHITE', 'e': 'INK.2', 'r': 'ROT.3', 's': 'ROT.2', 't': 'ROT.1' },
      px: [
      '............',
      '...ooo......',
      '...oroo.....',
      '.ooorsoooo..',
      'oorssssWeooo',
      'otssssssWeso',
      'otssssssssso',
      'ootttsssssto',
      '.ootttttsooo',
      '..ooottooo..',
      '....oooo....',
      '............'
      ]
    });

    /* loaf: floured crown, two slashed vents */
    P.def('it_bread', {
      pal: { 'o': 'INK.0', 'i': 'INK.2', 'd': 'SAND.3', 'c': 'SAND.2', 'b': 'SAND.1', 'a': 'SAND.0' },
      px: [
      '............',
      '............',
      '..oooooooo..',
      '.ooddddddoo.',
      'ooddccccccoo',
      'odccicciccbo',
      'occcicciccbo',
      'ocbbbbbbbbao',
      'oobbbbbbaaoo',
      '.ooaaaaaaoo.',
      '..oooooooo..',
      '............'
      ]
    });

    /* torch: pale core in the flame, bound head, short stick */
    P.def('it_torch', {
      pal: { 'o': 'INK.0', 'F': 'GOLD.3', 'G': 'GOLD.2', 'h': 'BLOOD.2', 'c': 'WOOD.2', 'b': 'WOOD.1', 'a': 'WOOD.0' },
      px: [
      '....ooo.....',
      '...ooFoo....',
      '...oFFFo....',
      '...oFGFo....',
      '...oGhGo....',
      '...oohoo....',
      '...occbo....',
      '...oocbo....',
      '....ocbo....',
      '....ocbo....',
      '....oabo....',
      '....oooo....'
      ]
    });

    /* ================= SPECIAL ================= */

    /* crown fragment: gold shard, set stone, zigzag break */
    P.def('it_fragment', {
      pal: { 'o': 'INK.0', 'W': 'WHITE', '3': 'GOLD.3', '2': 'GOLD.2', '1': 'GOLD.1', '0': 'GOLD.0', 'p': 'CORAL.2' },
      px: [
      '......oooo..',
      '.....ooW3o..',
      '.....o333oo.',
      '...ooo3332o.',
      '...o33p321o.',
      '.ooo33221oo.',
      '.o33322110o.',
      '.oo32p110oo.',
      '.o332110oo..',
      '.ooo210oo...',
      '...ooooo....',
      '............'
      ]
    });

    /* the crown, restored: five spikes, jewelled band, white fire on the middle point */
    P.def('it_crown', {
      pal: { 'o': 'INK.0', 'W': 'WHITE', '3': 'GOLD.3', '2': 'GOLD.2', '1': 'GOLD.1', '0': 'GOLD.0', 'p': 'CORAL.2', 'w': 'WATER.2' },
      px: [
      '.....oooo.....',
      '...oooWWooo...',
      'oooo3o33o3oooo',
      'o3oo3o33o3oo3o',
      'o3oo3o33o3oo3o',
      'o3oo3o33o3oo3o',
      'o333333333333o',
      'o32p2222p2223o',
      'o322222w22223o',
      'o211111111112o',
      'o000000000000o',
      'oooooooooooooo'
      ]
    });

    /* grapple: chain, shank, two flukes splayed out at the bottom */
    P.def('it_grapple', { pal: T, px: [
      '....oo3o....',
      '....o31o....',
      '....o13o....',
      '....o31o....',
      '....o33o....',
      '....o32o....',
      '...oo32oo...',
      '..oo3332oo..',
      '.oo33oo22oo.',
      '.o33oooo22o.',
      '.o3oo..oo2o.',
      '.ooo....ooo.'
    ] });

    /* key: pierced bow, long shank, two teeth */
    P.def('it_key', {
      pal: { 'o': 'INK.0', '3': 'GOLD.3', '2': 'GOLD.2', '1': 'GOLD.1' },
      px: [
      '............',
      '............',
      '.oooo.......',
      'oo33oo......',
      'o3oo3ooooooo',
      'o3oo3333322o',
      'o3oo3222211o',
      'oo22oooo22oo',
      '.oooo..o11o.',
      '.......oooo.',
      '............',
      '............'
      ]
    });
  }

  return { build, MATS, EDGE, TOOLS, WEAPONS };
})();
