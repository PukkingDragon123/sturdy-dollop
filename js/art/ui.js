/* ============================================================
   art/ui.js - every piece of chrome in the game, drawn one pixel
   at a time: 9-slice frames, stat bars, 8x8 icons, the skill-tree
   node and pipe kit, cursors and world markers.

   Two rules run through all of it. Light comes from the upper
   left, so a RAISED element is bright along its top and left and
   dark along its bottom and right, and a RECESSED one is exactly
   inverted. And every 9-slice centre is periodic in 4px, so it
   tiles across any panel without a seam.
   ============================================================ */
KD.art.ui = (function () {
  const P = KD.PX;

  /* ---- palettes -------------------------------------------- */
  /* panel: ink field, one bright bevel line inside the top-left */
  const PNL  = { 'o': 'INK.0', 'h': 'INK.3', 'f': 'INK.1', 'd': 'INK.2' };
  /* slot: sunk, so the shadow is near (top-left) and the lit wall far */
  const SLOT = { 'e': 'INK.2', 's': 'INK.0', 'h': 'INK.3', 'w': 'DEEP.0' };
  /* button: raised out of the panel on the DEEP ramp */
  const BTN  = { 'o': 'INK.0', 'h': 'DEEP.4', 'f': 'DEEP.2', 'd': 'DEEP.1' };
  const BAR  = { 'o': 'INK.0', '1': 'INK.1', '2': 'INK.2', 'w': 'DEEP.0' };
  const FILL = { '3': 'BLOOD.3', '2': 'BLOOD.2', '1': 'BLOOD.1', '0': 'BLOOD.0' };
  /* one legend for all 27 icons, so they cannot drift apart */
  const IC = {
    'o': 'INK.0',   'e': 'INK.3',   'W': 'WHITE',
    'w': 'BONE.2',  'v': 'BONE.1',  'u': 'BONE.0',
    'R': 'BLOOD.3', 'r': 'BLOOD.2', 'q': 'BLOOD.1',
    'G': 'GOLD.3',  'g': 'GOLD.2',  'f': 'GOLD.1',
    'S': 'STONE.3', 's': 'STONE.2', 't': 'STONE.1', 'n': 'STONE.0',
    'K': 'KELP.3',  'k': 'KELP.2',
    'A': 'WATER.3', 'a': 'WATER.2', 'b': 'WATER.1',
    'D': 'WOOD.2',  'd': 'WOOD.1',
    'c': 'CORAL.2', 'p': 'ROT.2',
    'M': 'SAND.2',  'm': 'SAND.1',  'z': 'DEEP.1'
  };
  const SK   = { 'o': 'INK.0', 'R': 'STONE.1', 'S': 'STONE.0', 'F': 'INK.1' };
  const PIPE = { 'o': 'INK.0', 'p': 'STONE.1', 'q': 'STONE.0' };
  const CUR  = { 'W': 'WHITE', 'o': 'INK.0', 'a': 'WATER.2' };
  const MK   = { 'o': 'INK.0', 'G': 'GOLD.3', 'g': 'GOLD.2' };

  /* the 9-slice part order px.nine() expects */
  const NINE = ['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br'];
  const kit = (name) => NINE.map((p) => name + '_' + p);

  function build() {
    /* ================= 9-SLICE FRAMES ================= */

    /* ---- pnl 9-slice: the main panel: INK.0 outer edge, INK.3 bevel catching the light top-left, INK.1 field ---- */

    /* pnl_tl */
    P.def('pnl_tl', { pal: PNL, px: [
      'oooo',
      'ohhh',
      'ohff',
      'ohff'
    ] });

    /* pnl_t */
    P.def('pnl_t', { pal: PNL, px: [
      'oooo',
      'hhhh',
      'ffff',
      'ffff'
    ] });

    /* pnl_tr */
    P.def('pnl_tr', { pal: PNL, px: [
      'oooo',
      'hhho',
      'fffo',
      'fffo'
    ] });

    /* pnl_l */
    P.def('pnl_l', { pal: PNL, px: [
      'ohff',
      'ohff',
      'ohff',
      'ohff'
    ] });

    /* pnl_c */
    P.def('pnl_c', { pal: PNL, px: [
      'ffff',
      'fdff',
      'ffff',
      'fffd'
    ] });

    /* pnl_r */
    P.def('pnl_r', { pal: PNL, px: [
      'fffo',
      'fffo',
      'fffo',
      'fffo'
    ] });

    /* pnl_bl */
    P.def('pnl_bl', { pal: PNL, px: [
      'ohff',
      'ohff',
      'ohff',
      'oooo'
    ] });

    /* pnl_b */
    P.def('pnl_b', { pal: PNL, px: [
      'ffff',
      'ffff',
      'ffff',
      'oooo'
    ] });

    /* pnl_br */
    P.def('pnl_br', { pal: PNL, px: [
      'fffo',
      'fffo',
      'fffo',
      'oooo'
    ] });


    /* ---- slot 9-slice: an inventory slot: sunk, dark well, the lit bevel on the FAR wall bottom-right ---- */

    /* slot_tl */
    P.def('slot_tl', { pal: SLOT, px: [
      'eeee',
      'esss',
      'esww',
      'esww'
    ] });

    /* slot_t */
    P.def('slot_t', { pal: SLOT, px: [
      'eeee',
      'ssss',
      'wwww',
      'wwww'
    ] });

    /* slot_tr */
    P.def('slot_tr', { pal: SLOT, px: [
      'eeee',
      'ssse',
      'wwhe',
      'wwhe'
    ] });

    /* slot_l */
    P.def('slot_l', { pal: SLOT, px: [
      'esww',
      'esww',
      'esww',
      'esww'
    ] });

    /* slot_c */
    P.def('slot_c', { pal: SLOT, px: [
      'wwww',
      'wwww',
      'wwww',
      'wwww'
    ] });

    /* slot_r */
    P.def('slot_r', { pal: SLOT, px: [
      'wwhe',
      'wwhe',
      'wwhe',
      'wwhe'
    ] });

    /* slot_bl */
    P.def('slot_bl', { pal: SLOT, px: [
      'esww',
      'esww',
      'ehhh',
      'eeee'
    ] });

    /* slot_b */
    P.def('slot_b', { pal: SLOT, px: [
      'wwww',
      'wwww',
      'hhhh',
      'eeee'
    ] });

    /* slot_br */
    P.def('slot_br', { pal: SLOT, px: [
      'wwhe',
      'wwhe',
      'hhhe',
      'eeee'
    ] });


    /* ---- btn 9-slice: a button: raised out of the panel, DEEP face, bright top and left edge ---- */

    /* btn_tl */
    P.def('btn_tl', { pal: BTN, px: [
      'oooo',
      'ohhh',
      'ohff',
      'ohff'
    ] });

    /* btn_t */
    P.def('btn_t', { pal: BTN, px: [
      'oooo',
      'hhhh',
      'ffff',
      'ffff'
    ] });

    /* btn_tr */
    P.def('btn_tr', { pal: BTN, px: [
      'oooo',
      'hhho',
      'ffdo',
      'ffdo'
    ] });

    /* btn_l */
    P.def('btn_l', { pal: BTN, px: [
      'ohff',
      'ohff',
      'ohff',
      'ohff'
    ] });

    /* btn_c */
    P.def('btn_c', { pal: BTN, px: [
      'ffff',
      'ffff',
      'ffff',
      'ffff'
    ] });

    /* btn_r */
    P.def('btn_r', { pal: BTN, px: [
      'ffdo',
      'ffdo',
      'ffdo',
      'ffdo'
    ] });

    /* btn_bl */
    P.def('btn_bl', { pal: BTN, px: [
      'ohff',
      'ohff',
      'oddd',
      'oooo'
    ] });

    /* btn_b */
    P.def('btn_b', { pal: BTN, px: [
      'ffff',
      'ffff',
      'dddd',
      'oooo'
    ] });

    /* btn_br */
    P.def('btn_br', { pal: BTN, px: [
      'ffdo',
      'ffdo',
      'dddo',
      'oooo'
    ] });


    /* selected slot: the same sunk well with a gold rim */

    P.variant('slotsel_tl', 'slot_tl', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_t', 'slot_t', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_tr', 'slot_tr', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_l', 'slot_l', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_c', 'slot_c', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_r', 'slot_r', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_bl', 'slot_bl', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_b', 'slot_b', { 'INK.2': 'GOLD.2' });

    P.variant('slotsel_br', 'slot_br', { 'INK.2': 'GOLD.2' });


    /* hot button: one step brighter and the bevel flipped, so it reads pressed */

    P.variant('btnhot_tl', 'btn_tl', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_t', 'btn_t', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_tr', 'btn_tr', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_l', 'btn_l', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_c', 'btn_c', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_r', 'btn_r', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_bl', 'btn_bl', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_b', 'btn_b', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });

    P.variant('btnhot_br', 'btn_br', { 'DEEP.4': 'DEEP.2', 'DEEP.2': 'DEEP.3', 'DEEP.1': 'DEEP.4' });


    /* ================= BARS =================
       An empty track in three parts, then one 4x8 fill segment
       per stat. Every fill carries a 1px bright line along its
       top edge and dithers down to its darkest step.          */

    /* bar track: left cap */
    P.def('bar_cap_l', { pal: BAR, px: [
      'oooo',
      'o111',
      'o1ww',
      'o1ww',
      'o1ww',
      'o1ww',
      'o122',
      'oooo'
    ] });

    /* bar track: middle, tiles across */
    P.def('bar_mid', { pal: BAR, px: [
      'oooo',
      '1111',
      'wwww',
      'wwww',
      'wwww',
      'wwww',
      '2222',
      'oooo'
    ] });

    /* bar track: right cap */
    P.def('bar_cap_r', { pal: BAR, px: [
      'oooo',
      '111o',
      'ww2o',
      'ww2o',
      'ww2o',
      'ww2o',
      '222o',
      'oooo'
    ] });

    /* health fill: bright top line, dithered belly, BLOOD ramp */
    P.def('barfill_hp', { pal: FILL, px: [
      '3333',
      '2222',
      '2222',
      '2121',
      '1212',
      '1111',
      '1111',
      '0000'
    ] });

    /* same segment, WATER ramp */
    P.variant('barfill_breath', 'barfill_hp', { 'BLOOD.0': 'WATER.0', 'BLOOD.1': 'WATER.1', 'BLOOD.2': 'WATER.2', 'BLOOD.3': 'WATER.3' });

    /* same segment, GOLD ramp */
    P.variant('barfill_xp', 'barfill_hp', { 'BLOOD.0': 'GOLD.0', 'BLOOD.1': 'GOLD.1', 'BLOOD.2': 'GOLD.2', 'BLOOD.3': 'GOLD.3' });

    /* same segment, SAND ramp */
    P.variant('barfill_fat', 'barfill_hp', { 'BLOOD.0': 'SAND.0', 'BLOOD.1': 'SAND.1', 'BLOOD.2': 'SAND.2', 'BLOOD.3': 'SAND.3' });

    /* ================= ICONS, 8x8 ================= */

    /* full heart */
    P.def('ic_heart_full', { pal: IC, px: [
      '........',
      '.RR..rr.',
      'RRRRrrrr',
      'RRrrrrrq',
      '.rrrrrq.',
      '..rrrq..',
      '...rq...',
      '........'
    ] });

    /* half heart: left solid, right hollow */
    P.def('ic_heart_half', { pal: IC, px: [
      '........',
      '.RR..ee.',
      'RRRRe..e',
      'RRrr...e',
      '.rrr..e.',
      '..rr.e..',
      '...re...',
      '........'
    ] });

    /* spent heart: outline only */
    P.def('ic_heart_empty', { pal: IC, px: [
      '........',
      '.ee..ee.',
      'e..ee..e',
      'e......e',
      '.e....e.',
      '..e..e..',
      '...ee...',
      '........'
    ] });

    /* breath bubble, specular knocked up-left */
    P.def('ic_bubble', { pal: IC, px: [
      '........',
      '...aa...',
      '..a..a..',
      '.aW...a.',
      '.a....a.',
      '..a..a..',
      '...aa...',
      '........'
    ] });

    /* coin: stamped octagon */
    P.def('ic_coin', { pal: IC, px: [
      '........',
      '..GGGg..',
      '.GGGggg.',
      '.GGoggf.',
      '.Ggoggf.',
      '.gggfff.',
      '..gfff..',
      '........'
    ] });

    /* pick tab: crown high, both arms hooking down and out */
    P.def('ic_pick', { pal: IC, px: [
      '........',
      '.SSSttt.',
      'SS....tt',
      '...Dd...',
      '...Dd...',
      '...Dd...',
      '...Dd...',
      '........'
    ] });

    /* sword tab */
    P.def('ic_sword', { pal: IC, px: [
      '....w...',
      '...wv...',
      '...wv...',
      '...wv...',
      '.gggggg.',
      '...Dd...',
      '...Dd...',
      '...gg...'
    ] });

    /* shield tab */
    P.def('ic_shield', { pal: IC, px: [
      '........',
      '.SStttn.',
      '.SStttn.',
      '.SStttn.',
      '..Sttn..',
      '..Sttn..',
      '...St...',
      '........'
    ] });

    /* star: five points, lower half in shade */
    P.def('ic_star', { pal: IC, px: [
      '...G....',
      '...G....',
      'GGGGGGG.',
      '.GGGGG..',
      '..ggg...',
      '.gg.gg..',
      '.g...g..',
      '........'
    ] });

    /* padlock */
    P.def('ic_lock', { pal: IC, px: [
      '........',
      '..sss...',
      '.s...s..',
      'ggggggf.',
      'gggoggf.',
      'gggoggf.',
      'gffffff.',
      '........'
    ] });

    /* tick */
    P.def('ic_check', { pal: IC, px: [
      '........',
      '........',
      '......KK',
      '.....KK.',
      '.K..KK..',
      '.KKKK...',
      '..KK....',
      '........'
    ] });

    /* cross */
    P.def('ic_cross', { pal: IC, px: [
      '........',
      '.rr..rr.',
      '..rrrr..',
      '...rr...',
      '...qq...',
      '..qqqq..',
      '.qq..qq.',
      '........'
    ] });

    /* arrow up */
    P.def('ic_arrow_up', { pal: IC, px: [
      '........',
      '...w....',
      '..www...',
      '.wwwww..',
      'wwwwwww.',
      '..vvv...',
      '..vvv...',
      '........'
    ] });

    /* arrow down */
    P.def('ic_arrow_down', { pal: IC, px: [
      '........',
      '..www...',
      '..www...',
      'wwwwwww.',
      '.vvvvv..',
      '..vvv...',
      '...v....',
      '........'
    ] });

    /* arrow left */
    P.def('ic_arrow_l', { pal: IC, px: [
      '........',
      '...w....',
      '..ww....',
      '.wwwwww.',
      '..vvvvv.',
      '..vv....',
      '...v....',
      '........'
    ] });

    /* arrow right */
    P.def('ic_arrow_r', { pal: IC, px: [
      '........',
      '....w...',
      '....ww..',
      '.wwwwww.',
      '.vvvvv..',
      '....vv..',
      '....v...',
      '........'
    ] });

    /* plus */
    P.def('ic_plus', { pal: IC, px: [
      '........',
      '...ww...',
      '...ww...',
      '.wwwwww.',
      '.vvvvvv.',
      '...vv...',
      '...vv...',
      '........'
    ] });

    /* minus */
    P.def('ic_minus', { pal: IC, px: [
      '........',
      '........',
      '........',
      '.wwwwww.',
      '.vvvvvv.',
      '........',
      '........',
      '........'
    ] });

    /* satchel with a gold clasp */
    P.def('ic_bag', { pal: IC, px: [
      '........',
      '..sss...',
      '.s...s..',
      '.DDDDDD.',
      '.DDgDDD.',
      '.dddddd.',
      '..dddd..',
      '........'
    ] });

    /* anvil: horn out to the left, waisted, splayed base */
    P.def('ic_anvil', { pal: IC, px: [
      '........',
      '..ssss..',
      'ssssssn.',
      '...ssn..',
      '...ssn..',
      '..tttn..',
      '.tttnnn.',
      '........'
    ] });

    /* skill tree: two nodes on a crossbar over the root node */
    P.def('ic_tree', { pal: IC, px: [
      'GG...GG.',
      'GG...GG.',
      '.g...g..',
      '.gggggg.',
      '...gg...',
      '..GGGG..',
      '..GGGG..',
      '........'
    ] });

    /* map: rolled top and bottom, two marks on the route */
    P.def('ic_map', { pal: IC, px: [
      '........',
      'mmmmmmmm',
      '.MMMMMM.',
      '.MMrMMM.',
      '.MMMMMM.',
      '.MMMMrM.',
      '.MMMMMM.',
      'mmmmmmmm'
    ] });

    /* tankard: foam over the lip, handle on the right */
    P.def('ic_beer', { pal: IC, px: [
      '........',
      '.wwwww..',
      'wwwwwww.',
      '.GGGGG..',
      '.GGGGGw.',
      '.GGGGGw.',
      '.GGGGG..',
      '.fffff..'
    ] });

    /* crown: tall middle spike, one set stone */
    P.def('ic_crown', { pal: IC, px: [
      '........',
      '....G...',
      'G.G.G.G.',
      'GGGGGGG.',
      'GGcGGGG.',
      'ggggggg.',
      'fffffff.',
      '........'
    ] });

    /* skull */
    P.def('ic_skull', { pal: IC, px: [
      '........',
      '..wwww..',
      '.wwwwww.',
      '.woowoo.',
      '.wwwwww.',
      '..wwww..',
      '..w.w.w.',
      '........'
    ] });

    /* day: the sun */
    P.def('ic_clock_day', { pal: IC, px: [
      '........',
      '..GGGG..',
      '.GGGGGG.',
      '.GGGGGg.',
      '.GGGggg.',
      '.Gggggf.',
      '..gfff..',
      '........'
    ] });

    /* night: crescent, lit on the outer edge */
    P.def('ic_clock_night', { pal: IC, px: [
      '........',
      '..wwv...',
      '.wwv....',
      'wwv.....',
      'wwv.....',
      '.wwv....',
      '..wwv...',
      '........'
    ] });

    /* ================= SKILL TREE ================= */

    /* skill node, locked: stepped hex frame, dead grey, flat field for the icon */
    P.def('sk_node_locked', { pal: SK, px: [
      '...oooooo...',
      '..ooRRRRoo..',
      '.ooRRFFRRoo.',
      'ooRRFFFFSSoo',
      'oRRFFFFFFSSo',
      'oRFFFFFFFFSo',
      'oRFFFFFFFFSo',
      'oRRFFFFFFSSo',
      'ooRSFFFFSSoo',
      '.ooSSFFSSoo.',
      '..ooSSSSoo..',
      '...oooooo...'
    ] });

    /* available: bone rim over a lit blue field */
    P.variant('sk_node_open', 'sk_node_locked', { 'STONE.1': 'BONE.2', 'STONE.0': 'BONE.0', 'INK.1': 'DEEP.1' });

    /* spent: gold rim, gold field */
    P.variant('sk_node_taken', 'sk_node_locked', { 'STONE.1': 'GOLD.3', 'STONE.0': 'GOLD.1', 'INK.1': 'GOLD.0' });

    /* pipe: straight run left-right */
    P.def('sk_pipe_h', { pal: PIPE, px: [
      '........',
      '........',
      'oooooooo',
      'pppppppp',
      'qqqqqqqq',
      'oooooooo',
      '........',
      '........'
    ] });

    /* pipe: straight run top-bottom */
    P.def('sk_pipe_v', { pal: PIPE, px: [
      '..opqo..',
      '..opqo..',
      '..opqo..',
      '..opqo..',
      '..opqo..',
      '..opqo..',
      '..opqo..',
      '..opqo..'
    ] });

    /* elbow: right and down */
    P.def('sk_pipe_tl', { pal: PIPE, px: [
      '........',
      '........',
      '..oooooo',
      '..opqppp',
      '..opqqqq',
      '..opqooo',
      '..opqo..',
      '..opqo..'
    ] });

    /* elbow: left and down */
    P.def('sk_pipe_tr', { pal: PIPE, px: [
      '........',
      '........',
      'oooooo..',
      'ppppqo..',
      'qqqpqo..',
      'ooopqo..',
      '..opqo..',
      '..opqo..'
    ] });

    /* elbow: right and up */
    P.def('sk_pipe_bl', { pal: PIPE, px: [
      '..opqo..',
      '..opqo..',
      '..opqooo',
      '..opqppp',
      '..opqqqq',
      '..oooooo',
      '........',
      '........'
    ] });

    /* elbow: left and up */
    P.def('sk_pipe_br', { pal: PIPE, px: [
      '..opqo..',
      '..opqo..',
      'ooopqo..',
      'ppppqo..',
      'qqqpqo..',
      'oooooo..',
      '........',
      '........'
    ] });

    /* lit path: the same pipes in gold once the points are spent */

    P.variant('sk_pipe_h_on', 'sk_pipe_h', { 'STONE.1': 'GOLD.3', 'STONE.0': 'GOLD.1' });

    P.variant('sk_pipe_v_on', 'sk_pipe_v', { 'STONE.1': 'GOLD.3', 'STONE.0': 'GOLD.1' });

    P.variant('sk_pipe_tl_on', 'sk_pipe_tl', { 'STONE.1': 'GOLD.3', 'STONE.0': 'GOLD.1' });

    P.variant('sk_pipe_tr_on', 'sk_pipe_tr', { 'STONE.1': 'GOLD.3', 'STONE.0': 'GOLD.1' });

    P.variant('sk_pipe_bl_on', 'sk_pipe_bl', { 'STONE.1': 'GOLD.3', 'STONE.0': 'GOLD.1' });

    P.variant('sk_pipe_br_on', 'sk_pipe_br', { 'STONE.1': 'GOLD.3', 'STONE.0': 'GOLD.1' });

    /* mining reticle: four corner brackets, dark inner edge so it holds on bright rock */
    P.def('cur_dig', { pal: CUR, px: [
      'WW....WW',
      'Wo....oW',
      '........',
      '........',
      '........',
      '........',
      'Wo....oW',
      'WW....WW'
    ] });

    /* placement ghost: dotted frame, one pixel on one pixel off */
    P.def('cur_place', { pal: CUR, px: [
      'a.a.a.a.',
      '.......a',
      'a.......',
      '.......a',
      'a.......',
      '.......a',
      'a.......',
      '.a.a.a.a'
    ] });

    /* quest marker: the gap under the bar closes to ink on its own */
    P.def('mk_exclaim', { pal: MK, px: [
      '..oooo..',
      '..oGgo..',
      '..oGgo..',
      '..oGgo..',
      '..oGgo..',
      '..oooo..',
      '..oGgo..',
      '..oooo..'
    ] });

    /* offscreen pointer: stepped arrowhead, no curve in it */
    P.def('mk_arrow', { pal: MK, px: [
      '........',
      '..oooo..',
      '.oGGoo..',
      '.oGGGGo.',
      '.oGGGGGo',
      '.ogggGo.',
      '.oggoo..',
      '..oooo..'
    ] });
  }

  /* kit('pnl') -> the name list px.nine() wants */
  return { build, NINE, kit };
})();
