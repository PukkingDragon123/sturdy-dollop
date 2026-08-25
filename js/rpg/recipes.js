/* ============================================================
   rpg/recipes.js - THE headline system (MASTER_PROMPT 3.3).

   A recipe is a SHAPE, not an output. "Cleaver" is a handle
   socket and three edge sockets; what you put in those sockets
   decides the damage, the speed, the reach, the sprite and the
   name. Then a prefix rolls on top, so crafting the same recipe
   twice never gives you the same item.

   Nothing in here draws, allocates per frame, or keeps state.
   craft() is a function of (shape, materials, luck, rng).
   ============================================================ */
KD.Recipes = (function () {
  /* Stations gate which shapes are visible. Each one is itself a
     shape below, so the whole chain is craftable from bare hands:
     hands -> workbench -> furnace -> anvil -> everything. */
  const STATIONS = {
    hand:      { id: 'hand',      name: 'Bare Hands', shape: null },
    workbench: { id: 'workbench', name: 'Workbench',  shape: 'workbench' },
    furnace:   { id: 'furnace',   name: 'Furnace',    shape: 'furnace' },
    anvil:     { id: 'anvil',     name: 'Anvil',      shape: 'anvil' },
    loom:      { id: 'loom',      name: 'Loom',       shape: 'loom' },
    vat:       { id: 'vat',       name: 'Alchemy Vat', shape: 'vat' },
    reroll:    { id: 'reroll',    name: 'Reroll Anvil', shape: 'reroll' },
    cookpot:   { id: 'cookpot',   name: 'Cook Pot',   shape: 'cookpot' }
  };

  /* `level` is the player level the shape appears at. 0 = from the
     first minute. Bases are tuned against BRONZE = 1.0 multipliers
     (see materials.js), so a bronze cleaver deals exactly baseDmg
     and everything else reads off that. */
  const all = [
    /* ---- TOOLS. Mining is the game, so a pick you can make with
       nothing but your hands is the first thing that exists. ---- */
    { id: 'pick', kind: 'tool', noun: 'Pick', sprite: 'it_pick',
      station: 'hand', level: 0, needs: [{ role: 'handle', n: 1 }, { role: 'head', n: 2 }],
      baseDmg: 6, baseSpd: 1.00, baseReach: 16, baseDur: 120, basePow: 2, target: 'all', xp: 8 },
    { id: 'shovel', kind: 'tool', noun: 'Shovel', sprite: 'it_shovel',
      station: 'hand', level: 0, needs: [{ role: 'handle', n: 1 }, { role: 'head', n: 2 }],
      baseDmg: 5, baseSpd: 1.10, baseReach: 16, baseDur: 100, basePow: 2, target: 'soft', xp: 6 },
    { id: 'axe', kind: 'tool', noun: 'Axe', sprite: 'it_axe',
      station: 'workbench', level: 0, needs: [{ role: 'handle', n: 1 }, { role: 'head', n: 3 }],
      baseDmg: 10, baseSpd: 0.95, baseReach: 18, baseDur: 130, basePow: 2, target: 'wood', xp: 10 },
    { id: 'hammer', kind: 'tool', noun: 'Hammer', sprite: 'it_hammer',
      station: 'workbench', level: 2, needs: [{ role: 'handle', n: 1 }, { role: 'head', n: 4 }],
      baseDmg: 12, baseSpd: 0.70, baseReach: 16, baseDur: 170, basePow: 3, target: 'wall', knock: 1.8, xp: 14 },
    /* the drill trades reach and damage for a silly swing rate */
    { id: 'drill', kind: 'tool', noun: 'Drill', sprite: 'it_drill',
      station: 'anvil', level: 8, needs: [{ role: 'handle', n: 1 }, { role: 'head', n: 3 }, { role: 'trim', n: 1 }],
      baseDmg: 8, baseSpd: 2.20, baseReach: 14, baseDur: 200, basePow: 3, target: 'all', xp: 22 },

    /* ---- WEAPONS. baseSpd is swings per second, so small is slow. */
    { id: 'shortblade', kind: 'weapon', noun: 'Shortblade', sprite: 'it_shortblade',
      station: 'workbench', level: 0, needs: [{ role: 'handle', n: 1 }, { role: 'edge', n: 1 }],
      baseDmg: 8, baseSpd: 1.35, baseReach: 14, baseDur: 90, style: 'swing', xp: 6 },
    { id: 'cleaver', kind: 'weapon', noun: 'Cleaver', sprite: 'it_cleaver',
      station: 'anvil', level: 0, needs: [{ role: 'handle', n: 1 }, { role: 'edge', n: 3 }],
      baseDmg: 14, baseSpd: 0.85, baseReach: 18, baseDur: 120, style: 'swing', xp: 12 },
    { id: 'longblade', kind: 'weapon', noun: 'Longblade', sprite: 'it_longblade',
      station: 'anvil', level: 4, needs: [{ role: 'handle', n: 1 }, { role: 'edge', n: 4 }],
      baseDmg: 18, baseSpd: 0.95, baseReach: 24, baseDur: 150, style: 'swing', xp: 18 },
    { id: 'spear', kind: 'weapon', noun: 'Spear', sprite: 'it_spear',
      station: 'workbench', level: 0, needs: [{ role: 'handle', n: 2 }, { role: 'edge', n: 1 }],
      baseDmg: 12, baseSpd: 1.00, baseReach: 30, baseDur: 110, style: 'throw', xp: 10 },
    { id: 'trident', kind: 'weapon', noun: 'Trident', sprite: 'it_trident',
      station: 'anvil', level: 6, needs: [{ role: 'handle', n: 2 }, { role: 'edge', n: 3 }],
      baseDmg: 20, baseSpd: 0.90, baseReach: 32, baseDur: 160, style: 'thrust', xp: 20 },
    { id: 'halberd', kind: 'weapon', noun: 'Halberd', sprite: 'it_halberd',
      station: 'anvil', level: 10, needs: [{ role: 'handle', n: 2 }, { role: 'edge', n: 4 }, { role: 'trim', n: 1 }],
      baseDmg: 26, baseSpd: 0.70, baseReach: 38, baseDur: 190, style: 'swing', xp: 28 },
    /* the charge weapon: one hit, and the tiles feel it */
    { id: 'maul', kind: 'weapon', noun: 'Maul', sprite: 'it_maul',
      station: 'anvil', level: 6, needs: [{ role: 'handle', n: 1 }, { role: 'head', n: 5 }],
      baseDmg: 32, baseSpd: 0.55, baseReach: 22, baseDur: 220, style: 'charge', knock: 2.4, xp: 30 },
    /* the Kingsfork, kept from the old build */
    { id: 'fork', kind: 'weapon', noun: 'Fork', sprite: 'it_fork',
      station: 'anvil', level: 14, needs: [{ role: 'handle', n: 1 }, { role: 'edge', n: 2 }, { role: 'trim', n: 1 }],
      baseDmg: 22, baseSpd: 1.10, baseReach: 26, baseDur: 140, style: 'thrust', xp: 24 },

    /* ---- ARMOUR ---- */
    { id: 'helm', kind: 'armour', noun: 'Helm', sprite: 'it_helm', slot: 'head',
      station: 'anvil', level: 0, needs: [{ role: 'plate', n: 2 }, { role: 'trim', n: 1 }],
      baseArmour: 4, baseDur: 100, xp: 10 },
    /* id is `cuirass`, not `chest`: the placeable chest owns that id */
    { id: 'cuirass', kind: 'armour', noun: 'Cuirass', sprite: 'it_cuirass', slot: 'chest',
      station: 'anvil', level: 3, needs: [{ role: 'plate', n: 4 }, { role: 'trim', n: 1 }],
      baseArmour: 8, baseDur: 160, xp: 16 },
    { id: 'greaves', kind: 'armour', noun: 'Greaves', sprite: 'it_greaves', slot: 'legs',
      station: 'anvil', level: 3, needs: [{ role: 'plate', n: 3 }],
      baseArmour: 5, baseDur: 120, xp: 12 },
    /* the pressure shell: what lets you survive below the Trench */
    { id: 'shell', kind: 'armour', noun: 'Shell', sprite: 'it_shell', slot: 'back',
      station: 'anvil', level: 12, needs: [{ role: 'plate', n: 6 }, { role: 'trim', n: 2 }],
      baseArmour: 14, baseDur: 240, xp: 26 },
    /* MASTER_PROMPT's own example recipe, and the reason to weave */
    { id: 'tunic', kind: 'armour', noun: 'Tunic', sprite: 'it_tunic', slot: 'chest',
      station: 'loom', level: 0, needs: [{ role: 'cloth', n: 4 }, { role: 'trim', n: 1 }],
      baseArmour: 3, baseDur: 90, xp: 8 },

    /* ---- PLACEABLES. Light is a survival stat down there, so the
       torch is a hand recipe too. ---- */
    { id: 'torch', kind: 'place', noun: 'Torch', sprite: 'pl_torch',
      station: 'hand', level: 0, needs: [{ role: 'fuel', n: 1 }, { role: 'handle', n: 1 }],
      baseDur: 4, light: 6, yield: 4, stack: 99, xp: 2 },
    { id: 'workbench', kind: 'place', noun: 'Workbench', sprite: 'pl_workbench',
      station: 'hand', level: 0, needs: [{ role: 'frame', n: 4 }],
      baseDur: 40, xp: 6 },
    { id: 'furnace', kind: 'place', noun: 'Furnace', sprite: 'pl_furnace',
      station: 'workbench', level: 0, needs: [{ role: 'stone', n: 8 }, { role: 'fuel', n: 2 }],
      baseDur: 60, light: 5, xp: 10 },
    { id: 'anvil', kind: 'place', noun: 'Anvil', sprite: 'pl_anvil',
      station: 'furnace', level: 0, needs: [{ role: 'head', n: 6 }, { role: 'frame', n: 2 }],
      baseDur: 80, xp: 14 },
    /* named for its frame, not its cloth: "Plank Loom" reads, "Kelp
       Loom" sounds like a thing you weave rather than weave on */
    { id: 'loom', kind: 'place', noun: 'Loom', sprite: 'pl_loom', nameRole: 'frame',
      station: 'workbench', level: 0, needs: [{ role: 'frame', n: 4 }, { role: 'cloth', n: 2 }],
      baseDur: 40, xp: 12 },
    { id: 'vat', kind: 'place', noun: 'Vat', sprite: 'pl_vat',
      station: 'workbench', level: 5, needs: [{ role: 'frame', n: 3 }, { role: 'lens', n: 2 }],
      baseDur: 40, light: 2, xp: 14 },
    /* the gamble station: re-prefix an item whose base you like */
    { id: 'reroll', kind: 'place', noun: 'Reroll Anvil', sprite: 'pl_reroll',
      station: 'anvil', level: 10, needs: [{ role: 'head', n: 4 }, { role: 'trim', n: 2 }, { role: 'lens', n: 1 }],
      baseDur: 80, xp: 30 },
    { id: 'cookpot', kind: 'place', noun: 'Cook Pot', sprite: 'pl_cookpot',
      station: 'furnace', level: 0, needs: [{ role: 'plate', n: 3 }, { role: 'frame', n: 1 }],
      baseDur: 50, light: 3, xp: 12 },
    /* ONE block shape for every block in the game: the material is
       the block. Plank Block, Brick Block, Glass Block, Coral Block
       all fall out of this single row. */
    { id: 'block', kind: 'place', noun: 'Block', sprite: 'pl_block',
      station: 'hand', level: 0, needs: [{ role: 'block', n: 1 }],
      baseDur: 4, yield: 4, stack: 99, xp: 1 },
    { id: 'platform', kind: 'place', noun: 'Platform', sprite: 'pl_platform',
      station: 'workbench', level: 0, needs: [{ role: 'block', n: 2 }],
      baseDur: 3, yield: 6, stack: 99, xp: 1 },
    { id: 'door', kind: 'place', noun: 'Door', sprite: 'pl_door',
      station: 'workbench', level: 0, needs: [{ role: 'block', n: 4 }, { role: 'trim', n: 1 }],
      baseDur: 20, xp: 4 },
    { id: 'chest', kind: 'place', noun: 'Chest', sprite: 'pl_chest',
      station: 'workbench', level: 0, needs: [{ role: 'block', n: 6 }, { role: 'trim', n: 1 }],
      baseDur: 20, xp: 8 },
    { id: 'lantern', kind: 'place', noun: 'Lantern', sprite: 'pl_lantern',
      station: 'workbench', level: 2, needs: [{ role: 'frame', n: 1 }, { role: 'lens', n: 2 }, { role: 'fuel', n: 1 }],
      baseDur: 10, light: 9, yield: 1, xp: 8 },

    /* ---- CONSUMABLES. Four beers, because beer is the plot:
       each tier buffs harder and fattens harder (MASTER_PROMPT 3.7). */
    { id: 'beer_swill', kind: 'food', noun: 'Swill', sprite: 'it_beer1',
      station: 'cookpot', level: 0, needs: [{ role: 'brew', n: 2 }],
      heal: 4, fat: 2, buff: 0.05, buffTime: 60, yield: 2, stack: 30, xp: 4 },
    { id: 'beer_ale', kind: 'food', noun: 'Ale', sprite: 'it_beer2',
      station: 'cookpot', level: 5, needs: [{ role: 'brew', n: 3 }, { role: 'trim', n: 1 }],
      heal: 10, fat: 5, buff: 0.12, buffTime: 90, yield: 2, stack: 30, xp: 8 },
    { id: 'beer_stout', kind: 'food', noun: 'Stout', sprite: 'it_beer3',
      station: 'cookpot', level: 12, needs: [{ role: 'brew', n: 4 }, { role: 'frame', n: 1 }],
      heal: 18, fat: 9, buff: 0.20, buffTime: 120, yield: 2, stack: 30, xp: 14 },
    { id: 'beer_royal', kind: 'food', noun: 'Reserve', sprite: 'it_beer4',
      station: 'cookpot', level: 22, needs: [{ role: 'brew', n: 6 }, { role: 'trim', n: 2 }],
      heal: 30, fat: 14, buff: 0.32, buffTime: 180, yield: 1, stack: 30, xp: 26 },
    { id: 'potion', kind: 'food', noun: 'Draught', sprite: 'it_potion',
      station: 'vat', level: 5, needs: [{ role: 'brew', n: 2 }, { role: 'lens', n: 1 }],
      heal: 30, fat: 0, buff: 0, buffTime: 0, yield: 2, stack: 30, xp: 10 },
    { id: 'bread', kind: 'food', noun: 'Loaf', sprite: 'it_bread',
      station: 'cookpot', level: 0, needs: [{ role: 'brew', n: 2 }],
      heal: 12, fat: 3, buff: 0, buffTime: 0, yield: 2, stack: 30, xp: 4 }
  ];

  /* ---- indexes, and the two derived roles every shape needs ----
     The item is named after what it is MADE of, which is the first
     of these roles the shape asks for. A shape may override with
     `nameRole`. The handle is where speed/reach/integrity come
     from; shapes without one (a block, a beer) use their primary,
     so the formula never has to branch on kind. */
  const NAME_ROLE = ['edge', 'head', 'plate', 'block', 'cloth', 'brew', 'lens', 'stone', 'frame', 'fuel', 'handle'];

  const byId = {}, byKind = {}, byStation = {};
  for (const sh of all) {
    if (byId[sh.id]) throw new Error('duplicate recipe: ' + sh.id);
    byId[sh.id] = sh;
    (byKind[sh.kind] = byKind[sh.kind] || []).push(sh);
    if (!STATIONS[sh.station]) throw new Error(sh.id + ' wants unknown station ' + sh.station);
    (byStation[sh.station] = byStation[sh.station] || []).push(sh);
    const roles = sh.needs.map((n) => n.role);
    sh.nameRole = sh.nameRole || NAME_ROLE.find((r) => roles.indexOf(r) >= 0);
    if (!sh.nameRole) throw new Error(sh.id + ' has no nameable role');
    sh.handleRole = roles.indexOf('handle') >= 0 ? 'handle' : sh.nameRole;
    sh.yield = sh.yield || 1;
    sh.stack = sh.stack || 1;
  }

  function get(id) {
    const sh = byId[id];
    if (!sh) throw new Error('unknown recipe: ' + id);
    return sh;
  }

  /* ---- the generator ------------------------------------- */
  const r2 = (v) => Math.round(v * 100) / 100;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  /* quality is craftsmanship, not luck: how deep the materials are
     plus how well matched they are. The match term is why an
     abyssal edge on a driftwood stick is not strictly best - it
     keeps the player upgrading handles too. */
  function quality(sh, picked) {
    let sum = 0, n = 0;
    for (const nd of sh.needs) { sum += picked[nd.role].tier * nd.n; n += nd.n; }
    const mean = sum / n;
    const gap = Math.abs(picked[sh.nameRole].tier - picked[sh.handleRole].tier);
    const bal = 1 - Math.min(1, gap / 3);
    return clamp01(0.75 * (mean - 1) / (KD.Mats.MAXTIER - 1) + 0.25 * bal);
  }

  /* one row per item kind instead of a branch tree. m = the primary
     (naming) material, h = the handle material, q = quality. */
  const KIND = {
    weapon: (sh, m, h, q) => ({
      dmg: sh.baseDmg * m.power * (1 + q * 0.25),
      spd: sh.baseSpd * h.speed,
      reach: Math.round(sh.baseReach + h.length),
      crit: m.crit,
      dur: sh.baseDur * m.hardness * h.integrity,
      knock: r2((sh.knock || 1) * (0.7 + m.power * 0.3))
    }),
    tool: (sh, m, h, q) => ({
      dmg: sh.baseDmg * m.power * (1 + q * 0.25),
      spd: sh.baseSpd * h.speed,
      reach: Math.round(sh.baseReach + h.length),
      crit: m.crit,
      dur: sh.baseDur * m.hardness * h.integrity,
      knock: r2((sh.knock || 1) * (0.7 + m.power * 0.3)),
      /* pow is the tile hardness it can break at all: two material
         tiers buy one point, which lands a flint pick on sand and
         stone, copper in the Ruins, iron in the Trench and abyssal
         in the Abyss - one gate per layer.
         mine is how fast it chews what it CAN break, and it leans
         hard on the head material so a tier upgrade is felt and not
         cancelled out by a slower handle. */
      pow: sh.basePow + Math.floor(m.tier / 2),
      mine: r2((0.35 + m.power * 0.65) * h.speed)
    }),
    armour: (sh, m, h, q) => ({
      armour: sh.baseArmour * m.hardness * (1 + q * 0.25),
      dur: sh.baseDur * m.hardness * h.integrity,
      /* heavy metal slows the king down; he is slow enough already */
      weight: r2(sh.baseArmour * (2 - m.speed) * 0.1)
    }),
    place: (sh, m) => ({
      dur: sh.baseDur * m.hardness,
      light: sh.light || 0
    }),
    food: (sh, m, h, q) => ({
      heal: sh.heal * (1 + q * 0.5),
      buff: sh.buff,
      buffTime: sh.buffTime,
      fat: sh.fat
    })
  };

  /* only gear rolls the gamble. A "Rusted Workbench" is not a
     gamble, it is a bug report. */
  const ROLLS_PREFIX = { weapon: 1, tool: 1, armour: 1 };

  /* sprite variant per material, with the base sprite as the
     fallback so the art can land one material at a time */
  function spriteFor(sh, m) {
    const v = sh.sprite + '_' + m.id;
    return (KD.PX && KD.PX.has && KD.PX.has(v)) ? v : sh.sprite;
  }

  /* accepts ids, material records, or arrays of either (the crafting
     UI hands over one stack per socket). Wrong role in a socket is a
     hard error - kelp is not an edge. */
  function socket(sh, matsByRole) {
    const out = {};
    for (const nd of sh.needs) {
      let v = matsByRole ? matsByRole[nd.role] : null;
      if (Array.isArray(v)) v = v[0];
      if (v === undefined || v === null) throw new Error(sh.id + ' needs a ' + nd.role);
      const m = KD.Mats.get(v);
      if (m.roles.indexOf(nd.role) < 0) throw new Error(m.id + ' cannot be a ' + nd.role);
      out[nd.role] = m;
    }
    return out;
  }

  function spend(sh, picked) {
    const cost = {};
    for (const nd of sh.needs) {
      const id = picked[nd.role].id;
      cost[id] = (cost[id] || 0) + nd.n;
    }
    return cost;
  }

  /* craft(shapeId, matsByRole, luck, rng) -> item (plain data)
     rng is optional and only exists so tests and seeded worlds can
     reproduce a roll. */
  function craft(shapeId, matsByRole, luck, rng) {
    const sh = get(shapeId);
    const picked = socket(sh, matsByRole);
    const prim = picked[sh.nameRole], hand = picked[sh.handleRole];
    const q = quality(sh, picked);
    const base = KIND[sh.kind](sh, prim, hand, q);
    const p = ROLLS_PREFIX[sh.kind] ? KD.Prefixes.roll(luck, rng) : KD.Prefixes.NONE;
    const st = KD.Prefixes.apply(base, p);

    const stem = (prim.adjective + ' ' + sh.noun).trim();
    const cost = spend(sh, picked);
    let matValue = 0;
    for (const id in cost) matValue += KD.Mats.get(id).value * cost[id];

    const item = {
      shape: sh.id, kind: sh.kind, noun: sh.noun, adjective: prim.adjective,
      stem: stem, name: ((p.name ? p.name + ' ' : '') + stem).trim(),
      prefix: p.id, prefixTier: p.tier, effect: p.effect || null,
      sprite: spriteFor(sh, prim), pal: prim.pal, tier: prim.tier, quality: r2(q),
      /* `n` is how many you get; `yield` is the same number under the
         name the recipe table uses. Both, because the inventory code
         asks for one and the crafting UI asks for the other. */
      mats: {}, spent: cost, yield: sh.yield, n: sh.yield, stack: sh.stack,
      station: sh.station, xp: sh.xp,
      /* the pre-prefix stat block, kept so the Reroll Anvil is exact
         instead of dividing floats back out */
      base: base
    };
    for (const r in picked) item.mats[r] = picked[r].id;
    for (const k in st) item[k] = st[k];
    for (const k of ['slot', 'target', 'style']) if (k in sh) item[k] = sh[k];
    item.value = Math.max(1, Math.round((matValue + sh.xp) * (1 + 0.15 * p.tier) / sh.yield));
    /* stack/compare key: same shape, same materials, same prefix */
    item.key = sh.id + ':' + Object.keys(item.mats).sort().map((r) => item.mats[r]).join('+') + ':' + p.id;
    if (item.durMax === undefined && item.dur !== undefined) item.durMax = item.dur;
    return item;
  }

  /* ---- what can I make with what I am carrying? ----------
     inventory may be { matId: count } or [{ id, n }] - the
     inventory UI and the save format disagree, so accept both. */
  function normInv(inv) {
    if (!inv) return {};
    if (!Array.isArray(inv)) return inv;
    const o = {};
    for (const s of inv) if (s && s.id) o[s.id] = (o[s.id] || 0) + (s.n || s.count || 1);
    return o;
  }

  /* "best" is role-aware on purpose: the highest tier is not always
     the best handle (whalebone is slow), so each socket scores what
     it actually cares about, with tier as a light thumb on the
     scale so progression still wins ties. */
  const SCORE = {
    edge: (m) => m.power * 2 + m.crit * 0.04 + m.hardness * 0.5 + m.tier * 0.15,
    head: (m) => m.power * 2 + m.hardness + m.tier * 0.15,
    handle: (m) => m.speed + m.integrity + m.length * 0.08 + m.tier * 0.15,
    plate: (m) => m.hardness * 2 + m.power * 0.5 + m.tier * 0.15,
    cloth: (m) => m.integrity + m.speed * 0.5 + m.tier * 0.2,
    trim: (m) => m.crit * 0.05 + m.power * 0.5 + m.tier * 0.3,
    block: (m) => m.hardness + m.tier * 0.3,
    frame: (m) => m.integrity + m.tier * 0.2,
    fuel: (m) => -m.value + m.tier * 0.05,          /* burn the cheap stuff */
    stone: (m) => m.hardness + m.tier * 0.1,
    lens: (m) => m.crit * 0.05 + m.tier * 0.3,
    brew: (m) => m.tier * 1.0 + m.power * 0.2       /* deeper kelp, stronger beer */
  };

  /* resolve(shapeId, inventory) -> { ok, mats, cost, spend, missing }
     Scarcest socket first, so a material that only one socket can
     use is not eaten by a socket that had other options. */
  function resolve(shapeId, inv) {
    const sh = get(shapeId);
    const have = normInv(inv);
    const order = sh.needs.slice().sort((a, b) =>
      KD.Mats.byRole(a.role).length - KD.Mats.byRole(b.role).length || b.n - a.n);
    const used = {}, mats = {}, missing = [];
    for (const nd of order) {
      const score = SCORE[nd.role] || ((m) => m.tier);
      const cand = KD.Mats.byRole(nd.role).slice().sort((a, b) => score(b) - score(a));
      let got = null;
      for (const m of cand) {
        if ((have[m.id] || 0) - (used[m.id] || 0) >= nd.n) { got = m; break; }
      }
      if (!got) { missing.push({ role: nd.role, n: nd.n }); continue; }
      used[got.id] = (used[got.id] || 0) + nd.n;
      mats[nd.role] = got.id;
    }
    /* `cost` is keyed like an inventory ({id: n}) so it can be diffed
       against one; `spend` is the same thing as a list, which is what
       the inventory's take() loop wants. */
    const list = Object.keys(used).map((id) => ({ id: id, n: used[id] }));
    return { ok: missing.length === 0, mats: mats, cost: used, spend: list, missing: missing };
  }

  const canCraft = (shapeId, inv) => resolve(shapeId, inv).ok;

  /* the one-click path: resolve then craft. Returns null rather
     than throwing when the player simply cannot afford it. */
  function craftBest(shapeId, inv, luck, rng) {
    const r = resolve(shapeId, inv);
    if (!r.ok) return null;
    return craft(shapeId, r.mats, luck, rng);
  }

  return { all, byId, byKind, byStation, STATIONS, NAME_ROLE, KIND, SCORE,
           get, craft, craftBest, canCraft, resolve, quality, spriteFor };
})();
