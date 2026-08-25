/* ============================================================
   rpg/materials.js - the progression axis.

   A recipe never names a material. It asks for a ROLE ("give me
   one handle and three edges") and whatever the player drops in
   decides what comes out. So a material is really just a bag of
   multipliers plus the list of sockets it is allowed to fill.
   ============================================================ */
KD.Mats = (function () {
  /* The socket vocabulary. A material may fill several - shell is
     a plate, a trim, an edge AND a lens, which is why the first
     hour of the game is all shell: one pickup unlocks four shapes. */
  const ROLES = ['edge', 'head', 'handle', 'plate', 'cloth',
                 'trim', 'block', 'frame', 'fuel', 'stone', 'lens', 'brew'];

  /* Tier 1..6 lines up with the six world layers, so "what tier am
     I on" and "how deep have I dug" are the same question.
     MAXTIER is used to normalise craft quality, so changing it
     rebalances every recipe at once - which is the point. */
  const MAXTIER = 6;

  /* Every multiplier is relative to BRONZE = 1.0 flat across the
     board; bronze is the datum the whole game is tuned against.
       power     -> damage, from the edge/head material
       hardness  -> durability, from the edge/head material
       speed     -> swing rate, from the handle
       integrity -> durability, from the handle
       length    -> reach in PIXELS, from the handle
       crit      -> flat crit percentage points, from the edge
     Nothing at tier 1 drops below ~0.45 on hardness/integrity: the
     first pick has to survive long enough to reach the second one.
     rarity 0 means "never in the ground" - it is smelted or sawn
     from something else, so `smeltFrom` + `station` is its recipe.
     depth is the tile-Y band worldgen may seed it in; it matches
     the layer table in MASTER_PROMPT 2.1. */
  const all = [
    /* ---- TIER 1: the beach. Everything here is lying on the
       seabed within two minutes of waking up broke. -------- */
    { id: 'flint', name: 'Flint', tier: 1, roles: ['edge', 'head', 'stone'],
      power: 0.60, hardness: 0.70, speed: 1.05, integrity: 0.70, length: -1, crit: 1,
      adjective: 'Flint', pal: { edge: 'STONE.2', trim: 'STONE.1', dark: 'STONE.0' },
      depth: [30, 130], rarity: 0.90, smeltFrom: null, station: null, stack: 99, value: 1 },

    { id: 'driftwood', name: 'Driftwood', tier: 1, roles: ['handle', 'frame', 'fuel'],
      power: 0.35, hardness: 0.45, speed: 1.15, integrity: 0.70, length: 1, crit: 0,
      adjective: 'Driftwood', pal: { edge: 'WOOD.2', trim: 'WOOD.1', dark: 'WOOD.0' },
      depth: [0, 60], rarity: 0.85, smeltFrom: null, station: null, stack: 99, value: 1 },

    { id: 'kelp_fibre', name: 'Kelp Fibre', tier: 1, roles: ['cloth', 'brew'],
      power: 0.25, hardness: 0.35, speed: 1.20, integrity: 0.50, length: 0, crit: 0,
      adjective: 'Kelp', pal: { edge: 'KELP.2', trim: 'KELP.1', dark: 'KELP.0' },
      depth: [35, 120], rarity: 0.80, smeltFrom: null, station: null, stack: 99, value: 1 },

    { id: 'shell', name: 'Shell', tier: 1, roles: ['edge', 'plate', 'trim', 'lens'],
      power: 0.70, hardness: 0.65, speed: 1.10, integrity: 0.72, length: 0, crit: 3,
      adjective: 'Shell', pal: { edge: 'BONE.2', trim: 'CORAL.2', dark: 'BONE.0' },
      depth: [40, 130], rarity: 0.70, smeltFrom: null, station: null, stack: 99, value: 2 },

    /* sawn, not found: the first thing the workbench is for */
    { id: 'plank', name: 'Plank', tier: 1, roles: ['block', 'frame', 'handle'],
      power: 0.45, hardness: 0.60, speed: 1.05, integrity: 0.85, length: 2, crit: 0,
      adjective: 'Plank', pal: { edge: 'WOOD.3', trim: 'WOOD.2', dark: 'WOOD.1' },
      depth: [0, 60], rarity: 0, smeltFrom: 'driftwood', station: 'workbench', stack: 99, value: 2 },

    /* ---- TIER 2: shallows and reef. First real choices. ---- */
    { id: 'hide', name: 'Crab Hide', tier: 2, roles: ['cloth', 'plate'],
      power: 0.40, hardness: 0.60, speed: 1.02, integrity: 0.80, length: 0, crit: 0,
      adjective: 'Hide', pal: { edge: 'CORAL.1', trim: 'SAND.1', dark: 'CORAL.0' },
      depth: [40, 170], rarity: 0.45, smeltFrom: null, station: null, stack: 99, value: 4 },

    { id: 'bone', name: 'Bone', tier: 2, roles: ['edge', 'head', 'handle', 'plate'],
      power: 0.85, hardness: 0.75, speed: 1.05, integrity: 0.85, length: 1, crit: 2,
      adjective: 'Bone', pal: { edge: 'BONE.2', trim: 'BONE.1', dark: 'BONE.0' },
      depth: [90, 240], rarity: 0.50, smeltFrom: null, station: null, stack: 99, value: 4 },

    /* brittle but wickedly sharp - the crit-fishing tier-2 pick */
    { id: 'coral', name: 'Coral', tier: 2, roles: ['edge', 'head', 'block', 'trim'],
      power: 0.90, hardness: 0.70, speed: 0.98, integrity: 0.80, length: 1, crit: 4,
      adjective: 'Coral', pal: { edge: 'CORAL.2', trim: 'CORAL.3', dark: 'CORAL.0' },
      depth: [90, 175], rarity: 0.55, smeltFrom: null, station: null, stack: 99, value: 5 },

    { id: 'copper', name: 'Copper', tier: 2, roles: ['edge', 'head', 'plate', 'trim'],
      power: 0.90, hardness: 0.85, speed: 1.00, integrity: 0.95, length: 0, crit: 1,
      adjective: 'Copper', pal: { edge: 'RUST.3', trim: 'RUST.2', dark: 'RUST.1' },
      depth: [80, 205], rarity: 0.40, smeltFrom: 'ore_copper', station: 'furnace', stack: 99, value: 5 },

    /* a needle: fastest thing in the game, snaps if you look at it */
    { id: 'urchin_spine', name: 'Urchin Spine', tier: 2, roles: ['edge', 'trim'],
      power: 0.75, hardness: 0.45, speed: 1.25, integrity: 0.50, length: 3, crit: 8,
      adjective: 'Urchin', pal: { edge: 'ROT.2', trim: 'ROT.3', dark: 'ROT.0' },
      depth: [40, 160], rarity: 0.35, smeltFrom: null, station: null, stack: 99, value: 6 },

    { id: 'brick', name: 'Brick', tier: 2, roles: ['block', 'stone', 'frame'],
      power: 0.80, hardness: 1.10, speed: 0.85, integrity: 1.10, length: 0, crit: 0,
      adjective: 'Brick', pal: { edge: 'SAND.1', trim: 'SAND.2', dark: 'SAND.0' },
      depth: [150, 240], rarity: 0, smeltFrom: 'clay', station: 'furnace', stack: 99, value: 3 },

    /* ---- TIER 3: reef floor into the ruins. ---- */
    { id: 'bronze', name: 'Bronze', tier: 3, roles: ['edge', 'head', 'plate', 'trim'],
      power: 1.00, hardness: 1.00, speed: 1.00, integrity: 1.00, length: 0, crit: 2,
      adjective: 'Bronze', pal: { edge: 'GOLD.2', trim: 'GOLD.1', dark: 'GOLD.0' },
      depth: [110, 255], rarity: 0.35, smeltFrom: 'ore_bronze', station: 'furnace', stack: 99, value: 6 },

    /* razor-sharp and it shatters: the gambler's edge */
    { id: 'glass', name: 'Sea Glass', tier: 3, roles: ['edge', 'block', 'lens'],
      power: 1.10, hardness: 0.40, speed: 1.08, integrity: 0.50, length: 0, crit: 10,
      adjective: 'Glass', pal: { edge: 'WATER.2', trim: 'WATER.3', dark: 'WATER.0' },
      depth: [40, 120], rarity: 0, smeltFrom: 'sand', station: 'furnace', stack: 99, value: 7 },

    /* salvaged beer barrels. Long, tough, and it brews. The joke
       the whole game hangs on gets its own material. */
    { id: 'keg_oak', name: 'Keg Oak', tier: 3, roles: ['handle', 'frame', 'fuel', 'brew'],
      power: 0.70, hardness: 0.95, speed: 0.95, integrity: 1.25, length: 3, crit: 0,
      adjective: 'Keg-Oak', pal: { edge: 'WOOD.2', trim: 'GOLD.1', dark: 'WOOD.0' },
      depth: [150, 235], rarity: 0.25, smeltFrom: null, station: null, stack: 99, value: 9 },

    { id: 'sharktooth', name: 'Shark Tooth', tier: 3, roles: ['edge'],
      power: 1.25, hardness: 0.65, speed: 1.12, integrity: 0.70, length: 0, crit: 9,
      adjective: 'Sharktooth', pal: { edge: 'BONE.2', trim: 'BLOOD.1', dark: 'INK.2' },
      depth: [90, 210], rarity: 0.22, smeltFrom: null, station: null, stack: 99, value: 12 },

    { id: 'sea_silk', name: 'Sea Silk', tier: 3, roles: ['cloth', 'trim'],
      power: 0.55, hardness: 0.80, speed: 1.18, integrity: 0.90, length: 0, crit: 3,
      adjective: 'Silk', pal: { edge: 'CLOTH.2', trim: 'CLOTH.3', dark: 'CLOTH.0' },
      depth: [110, 245], rarity: 0.28, smeltFrom: null, station: null, stack: 99, value: 14 },

    /* ---- TIER 4: ruins and trench. The real gear. ---- */
    { id: 'iron', name: 'Iron', tier: 4, roles: ['edge', 'head', 'plate', 'handle'],
      power: 1.45, hardness: 1.45, speed: 0.94, integrity: 1.35, length: 1, crit: 2,
      adjective: 'Iron', pal: { edge: 'STONE.2', trim: 'RUST.1', dark: 'INK.2' },
      depth: [180, 335], rarity: 0.30, smeltFrom: 'ore_iron', station: 'furnace', stack: 99, value: 11 },

    /* enormous. Slow, long, and it will outlive you. */
    { id: 'whalebone', name: 'Whalebone', tier: 4, roles: ['edge', 'head', 'handle', 'plate'],
      power: 1.35, hardness: 1.30, speed: 0.90, integrity: 1.40, length: 4, crit: 1,
      adjective: 'Whalebone', pal: { edge: 'BONE.1', trim: 'BONE.2', dark: 'STONE.0' },
      depth: [230, 365], rarity: 0.18, smeltFrom: null, station: null, stack: 99, value: 18 },

    { id: 'pearl', name: 'Pearl', tier: 4, roles: ['trim', 'lens'],
      power: 1.20, hardness: 1.10, speed: 1.06, integrity: 1.00, length: 0, crit: 6,
      adjective: 'Pearl', pal: { edge: 'BONE.2', trim: 'WATER.3', dark: 'CLOTH.1' },
      depth: [90, 250], rarity: 0.10, smeltFrom: null, station: null, stack: 99, value: 45 },

    /* soft, useless, and it makes you lucky. It is the crown metal:
       gold rolls prefixes you cannot get any other way. */
    { id: 'gold', name: 'Gold', tier: 4, roles: ['trim', 'edge', 'plate'],
      power: 1.15, hardness: 0.70, speed: 1.02, integrity: 0.75, length: 0, crit: 12,
      adjective: 'Gold', pal: { edge: 'GOLD.3', trim: 'GOLD.2', dark: 'GOLD.0' },
      depth: [200, 370], rarity: 0.12, smeltFrom: 'ore_gold', station: 'furnace', stack: 99, value: 30 },

    /* ---- TIER 5-6: the Abyss, and only the Abyss. ---- */
    { id: 'rot_crystal', name: 'Rot Crystal', tier: 5, roles: ['edge', 'lens', 'trim', 'brew'],
      power: 1.85, hardness: 0.85, speed: 1.05, integrity: 0.80, length: 1, crit: 14,
      adjective: 'Rotglass', pal: { edge: 'ROT.2', trim: 'ROT.3', dark: 'ROT.0' },
      depth: [300, 420], rarity: 0.14, smeltFrom: null, station: null, stack: 99, value: 40 },

    { id: 'abyssal', name: 'Abyssal Alloy', tier: 6, roles: ['edge', 'head', 'handle', 'plate', 'trim'],
      power: 2.35, hardness: 2.10, speed: 0.98, integrity: 1.90, length: 2, crit: 5,
      adjective: 'Abyssal', pal: { edge: 'DEEP.4', trim: 'ROT.2', dark: 'DEEP.0' },
      depth: [355, 420], rarity: 0.05, smeltFrom: 'ore_abyssal', station: 'furnace', stack: 99, value: 90 }
  ];

  const byId = {};
  for (const m of all) byId[m.id] = m;

  /* role -> materials, tier ascending, built once. Callers that want
     "the best X" read from the end. */
  const ROLE_IDX = {};
  for (const r of ROLES) ROLE_IDX[r] = [];
  for (const m of all) {
    for (const r of m.roles) {
      if (!ROLE_IDX[r]) throw new Error('material ' + m.id + ' claims unknown role ' + r);
      ROLE_IDX[r].push(m);
    }
  }
  for (const r of ROLES) ROLE_IDX[r].sort((a, b) => a.tier - b.tier || a.value - b.value);

  const byRole = (role) => ROLE_IDX[role] || [];
  /* loud on purpose: a typo'd material id in a recipe or a save is a
     bug, not a thing to silently render as "undefined Cleaver" */
  function get(id) {
    const m = byId[typeof id === 'object' && id ? id.id : id];
    if (!m) throw new Error('unknown material: ' + id);
    return m;
  }
  const has = (id) => !!byId[typeof id === 'object' && id ? id.id : id];
  const byTier = (t) => all.filter((m) => m.tier === t);
  /* what worldgen asks: everything seedable in this tile row */
  const atDepth = (y) => all.filter((m) => m.rarity > 0 && y >= m.depth[0] && y <= m.depth[1]);

  return { all, byId, byRole, get, has, byTier, atDepth, ROLES, MAXTIER };
})();
