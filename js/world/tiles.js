/* ============================================================
   world/tiles.js - the tile table. One entry per block type.
   Tiles are 8x8. `art` is the autotile kit prefix, so the
   renderer asks for e.g. 'stone_tl' without knowing anything
   about stone in particular.
   ============================================================ */
KD.Tiles = (function () {
  const T = [];
  const byId = {};
  function def(o) {
    o.i = T.length;
    T.push(o); byId[o.id] = o;
    return o;
  }
  /* solid: blocks movement. hard: pick tier needed. hp: hits to break.
     light: emits this much light. clear: transmits light. drop: item id. */
  def({ id: 'air',      name: 'Air',            solid: false, clear: true, hp: 0 });
  def({ id: 'water',    name: 'Water',          solid: false, clear: true, hp: 0, liquid: true });
  /* drop is the block you get back; drop2 is the crafting material the rock
     was hiding, at drop2p odds. That is how flint and driftwood enter the game. */
  def({ id: 'sand',     name: 'Sand',           solid: true, art: 'sand',  hard: 0, hp: 8,  drop: 'sand', drop2: 'driftwood', drop2p: 0.12 });
  def({ id: 'mud',      name: 'Mud',            solid: true, art: 'mud',   hard: 0, hp: 7,  drop: 'clay' });
  def({ id: 'stone',    name: 'Stone',          solid: true, art: 'stone', hard: 1, hp: 20, drop: 'stone', drop2: 'flint', drop2p: 0.45 });
  def({ id: 'dark',     name: 'Trench Rock',    solid: true, art: 'dark',  hard: 2, hp: 34, drop: 'dark', drop2: 'flint', drop2p: 0.25 });
  def({ id: 'rot',      name: 'Abyssal Stone',  solid: true, art: 'rot',   hard: 3, hp: 52, drop: 'rot', drop2: 'rot_crystal', drop2p: 0.18 });
  def({ id: 'coral',    name: 'Coral',          solid: true, art: 'coral', hard: 0, hp: 12, drop: 'coral', light: 1 });
  def({ id: 'masonry',  name: 'Atlantean Block',solid: true, art: 'masonry', hard: 2, hp: 40, drop: 'brick' });
  def({ id: 'plank',    name: 'Plank',          solid: true, art: 'plank', hard: 0, hp: 10, drop: 'plank', build: true });
  def({ id: 'brick',    name: 'Brick',          solid: true, art: 'brick', hard: 1, hp: 22, drop: 'brick', build: true });
  def({ id: 'glass',    name: 'Glass',          solid: true, art: 'glass', hard: 1, hp: 6,  drop: 'glass', clear: true, build: true });
  /* ores are stone with an overlay sprite and a better drop */
  def({ id: 'ore_copper',  name: 'Copper Vein',  solid: true, art: 'stone', ore: 'ore_copper',  hard: 1, hp: 24, drop: 'ore_copper' });
  def({ id: 'ore_bronze',  name: 'Bronze Vein',  solid: true, art: 'stone', ore: 'ore_bronze',  hard: 1, hp: 28, drop: 'ore_bronze' });
  def({ id: 'ore_iron',    name: 'Iron Vein',    solid: true, art: 'stone', ore: 'ore_iron',    hard: 2, hp: 36, drop: 'ore_iron' });
  def({ id: 'ore_gold',    name: 'Gold Vein',    solid: true, art: 'dark',  ore: 'ore_gold',    hard: 2, hp: 40, drop: 'ore_gold' });
  def({ id: 'ore_abyssal', name: 'Abyssal Vein', solid: true, art: 'rot',   ore: 'ore_abyssal', hard: 3, hp: 60, drop: 'ore_abyssal', light: 2 });
  /* non-blocking furniture, drawn as one sprite, sits on a floor */
  def({ id: 'torch',    name: 'Torch',   solid: false, deco: 'it_torch',      hp: 1, light: 7, drop: 'torch', build: true });
  def({ id: 'glowpod',  name: 'Glowpod', solid: false, deco: 'dc_glowpod',    hp: 1, light: 6, drop: 'glowpod' });
  def({ id: 'lantern',  name: 'Lantern', solid: false, deco: 'bk_lantern_lit', hp: 2, light: 8, drop: 'lantern', build: true });
  def({ id: 'kelp',     name: 'Kelp',    solid: false, deco: 'dc_kelp1',      hp: 1, drop: 'kelp_fibre' });
  def({ id: 'grass',    name: 'Seagrass',solid: false, deco: 'dc_seagrass1',  hp: 1, drop: 'kelp_fibre' });
  def({ id: 'anemone',  name: 'Anemone', solid: false, deco: 'dc_anemone1',   hp: 1, drop: 'coral', light: 1 });
  def({ id: 'urchin_d', name: 'Urchin',  solid: false, deco: 'dc_urchin',     hp: 2, drop: 'urchin_spine' });
  def({ id: 'bones',    name: 'Bones',   solid: false, deco: 'dc_bones1',     hp: 1, drop: 'bone' });
  def({ id: 'moss',     name: 'Moss',    solid: false, deco: 'dc_moss',       hp: 1 });
  /* placeables the player crafts */
  def({ id: 'workbench',name: 'Workbench', solid: false, deco: 'st_workbench', big: [2, 2], hp: 6, station: 'workbench', drop: 'workbench', build: true });
  def({ id: 'furnace',  name: 'Furnace',   solid: false, deco: 'st_furnace',   big: [2, 2], hp: 8, station: 'furnace',drop: 'furnace', light: 6, build: true });
  def({ id: 'anvil',    name: 'Anvil',     solid: false, deco: 'st_anvil',     big: [2, 2], hp: 8, station: 'anvil',  drop: 'anvil', build: true });
  def({ id: 'loom',     name: 'Loom',      solid: false, deco: 'st_loom',      big: [2, 2], hp: 6, station: 'loom',   drop: 'loom', build: true });
  def({ id: 'vat',      name: 'Alchemy Vat',solid: false, deco: 'st_vat',      big: [2, 2], hp: 6, station: 'vat',    drop: 'vat', light: 3, build: true });
  def({ id: 'reroll',   name: 'Reroll Anvil',solid: false, deco: 'st_reroll',  big: [2, 2], hp: 8, station: 'reroll', drop: 'reroll', light: 2, build: true });
  def({ id: 'cookpot',  name: 'Cook Pot',  solid: false, deco: 'st_cookpot',   big: [2, 2], hp: 6, station: 'cookpot',drop: 'cookpot', light: 3, build: true });
  def({ id: 'chest',    name: 'Chest',     solid: false, deco: 'dc_chest_closed', big: [2, 2], hp: 6, drop: 'chest', build: true, container: 20 });
  def({ id: 'door',     name: 'Door',      solid: true,  deco: 'bk_door_closed',  big: [2, 3], hp: 6, drop: 'door', build: true, door: true });
  def({ id: 'platform', name: 'Platform',  solid: false, art: 'plank', plat: true, hp: 5, drop: 'platform', build: true });
  def({ id: 'statue',   name: 'Statue',    solid: false, deco: 'dc_statue', big: [2, 4], hp: 30 });
  /* the Sea Gate: solid until the guard lets you through */
  def({ id: 'gate',     name: 'The Sea Gate', solid: true, art: 'masonry', hard: 9, hp: 250, gate: true });
  def({ id: 'pillar',   name: 'Pillar',    solid: true,  deco: 'bk_pillar_mid', hp: 30, drop: 'brick' });

  const AIR = byId.air.i, WATER = byId.water.i;
  const isSolid = (i) => T[i] && T[i].solid;
  const isClear = (i) => !T[i] || T[i].clear || (!T[i].solid && !T[i].art);
  const light = (i) => (T[i] && T[i].light) || 0;
  return { T, byId, def, AIR, WATER, isSolid, isClear, light,
           get: (i) => T[i], id: (name) => (byId[name] ? byId[name].i : 0) };
})();
