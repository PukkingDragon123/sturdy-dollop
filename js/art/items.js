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

    /* spade: T-grip, long shaft, dished blade */
    P.def('it_shovel', { pal: T, px: [
      '..oooooo....',
      '..oddcbo....',
      '...ocbao....',
      '...ocbao....',
      '...ocbao....',
      '...oabao....',
      '..o43332o...',
      '.o4332222o..',
      '.o3332222o..',
      '..o32222o...',
      '...o1221o...',
      '....oooo....'
    ] });

    /* felling axe: haft left, bit flared out to a tall cutting edge */
    P.def('it_axe', { pal: T, px: [
      '..oooo......',
      '..ocbo......',
      '..ocbooo....',
      '..ocb443oo..',
      '..ocb43333o.',
      '..ocb433332o',
      '..ocb433221o',
      '..ocb3322oo.',
      '..ocb32oo...',
      '..ocboo.....',
      '..ocao......',
      '..oooo......'
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

    /* drill: fat wooden grip, chuck, fluted bit */
    P.def('it_drill', { pal: T, px: [
      '.oooooooo...',
      '.odddccao...',
      '.occcbbao...',
      '.oaaabbao...',
      '.ooo4433o...',
      '...o43i32o..',
      '...o43i32o..',
      '...o43i32o..',
      '....o4i2o...',
      '....o432o...',
      '.....o32o...',
      '......oo....'
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

    /* halberd: top spike, axe cheek on the right, long haft */
    P.def('it_halberd', { pal: T, px: [
      '....oo......',
      '...o44o.....',
      '...o43oooo..',
      '...o434432o.',
      '...o433322o.',
      '...o4332oo..',
      '...ocbao....',
      '...ocbao....',
      '...oaaao....',
      '...ocbao....',
      '...ocbao....',
      '...ooooo....'
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
  }

  return { build, MATS, EDGE, TOOLS, WEAPONS };
})();
