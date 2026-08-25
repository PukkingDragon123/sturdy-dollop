/* ============================================================
   rpg/skills.js - three trunks, 27 nodes, on an integer grid.

   The UI draws this: `col`/`row` are grid cells (not pixels) and
   `needs` is the pipe list, so the skill screen is a dumb
   renderer over this table and never has to know what a node
   does. Trunks own column bands - DELVER 0-2, BRAWLER 4-6,
   TIDECALLER 8-10 - with the empty columns 3 and 7 left as the
   gutters the cross-links run through. Nothing crosses anything.

   `needs` is OR: any one listed prerequisite with at least one
   rank unlocks the node. That is what makes the three cross-links
   optional shortcuts into a neighbouring trunk instead of a tax.
   ============================================================ */
KD.Skills = (function () {
  const TRUNKS = {
    delver:     { id: 'delver',     name: 'DELVER',     col: 1, cols: [0, 2],
                  colour: 'SAND.2',  dim: 'SAND.0',  root: 'delve_root',
                  blurb: 'Dig deeper, see further, drown later.' },
    brawler:    { id: 'brawler',    name: 'BRAWLER',    col: 5, cols: [4, 6],
                  colour: 'BLOOD.2', dim: 'BLOOD.0', root: 'brawl_root',
                  blurb: 'Hit harder, bleed less, take the crown by hand.' },
    tidecaller: { id: 'tidecaller', name: 'TIDECALLER', col: 9, cols: [8, 10],
                  colour: 'WATER.2', dim: 'WATER.0', root: 'tide_root',
                  blurb: 'The sea does what you tell it. Mostly.' }
  };

  /* Multiplier stats start at 1 and are multiplied straight into
     the sim; flat stats start at 0 and are added. `luck` is the
     same luck KD.Prefixes.roll() takes, which is how the tree
     reaches into the crafting gamble. */
  function base() {
    return {
      /* delver */
      mineSpeed: 1, minePower: 0, oreLuck: 0, lightRadius: 0, breath: 0,
      fallSafe: 0, pressureDepth: 0, luck: 0,
      /* brawler */
      meleeDmg: 1, swingSpeed: 1, reach: 0, critChance: 0, critDmg: 1,
      armour: 0, knockback: 1, knockResist: 0, lifesteal: 0,
      /* tidecaller. `mounts` is how many mounts you can whistle up in
         the field; 0 means you walk back to the stable like a peasant. */
      swimSpeed: 1, grappleLen: 0, grappleSpeed: 1, mounts: 0, mountSpeed: 1,
      waterControl: 0,
      /* shared */
      xpGain: 1, effects: []
    };
  }

  const all = [
    /* ================= DELVER (cols 0-2) ================= */
    { id: 'delve_root', trunk: 'delver', name: 'Dirt Under The Nails', col: 1, row: 0,
      cost: 1, max: 1, needs: [],
      desc: 'Mining speed +5%. Ore luck +2%.',
      apply: (s) => { s.mineSpeed += 0.05; s.oreLuck += 0.02; } },

    { id: 'delve_speed1', trunk: 'delver', name: 'Chipper', col: 0, row: 1,
      cost: 1, max: 3, needs: ['delve_root'],
      desc: 'Mining speed +12% per rank.',
      apply: (s, rank) => { s.mineSpeed += 0.12 * rank; } },

    { id: 'delve_light1', trunk: 'delver', name: 'Glowsense', col: 2, row: 1,
      cost: 1, max: 3, needs: ['delve_root'],
      desc: 'Light radius +1 tile per rank.',
      apply: (s, rank) => { s.lightRadius += 1 * rank; } },

    { id: 'delve_luck1', trunk: 'delver', name: 'Vein Sense', col: 0, row: 2,
      cost: 1, max: 3, needs: ['delve_speed1'],
      desc: 'Ore luck +8% per rank: more ore per vein, better vein rolls.',
      apply: (s, rank) => { s.oreLuck += 0.08 * rank; } },

    { id: 'delve_breath', trunk: 'delver', name: 'Big Lungs', col: 2, row: 2,
      cost: 1, max: 3, needs: ['delve_light1'],
      desc: 'Breath +6 seconds per rank.',
      apply: (s, rank) => { s.breath += 6 * rank; } },

    /* the trunk's waist: both branches feed it, and it is the
       delver end of the cross-link into BRAWLER */
    { id: 'delve_tough', trunk: 'delver', name: 'Kneecaps Of Stone', col: 1, row: 3,
      cost: 2, max: 2, needs: ['delve_luck1', 'delve_breath'],
      desc: 'Safe fall +6 tiles and armour +2 per rank.',
      apply: (s, rank) => { s.fallSafe += 6 * rank; s.armour += 2 * rank; } },

    { id: 'delve_speed2', trunk: 'delver', name: 'Rockbreaker', col: 0, row: 4,
      cost: 2, max: 2, needs: ['delve_tough'],
      desc: 'Mining speed +18% and tool power +1 per rank.',
      apply: (s, rank) => { s.mineSpeed += 0.18 * rank; s.minePower += 1 * rank; } },

    { id: 'delve_pressure', trunk: 'delver', name: 'Pressure Hardened', col: 2, row: 4,
      cost: 2, max: 2, needs: ['delve_tough'],
      desc: 'Survive 60 tiles deeper without a suit, breath +8, per rank.',
      apply: (s, rank) => { s.pressureDepth += 60 * rank; s.breath += 8 * rank; } },

    /* capstone: the Abyss stops being a place you visit */
    { id: 'delve_cap', trunk: 'delver', name: 'Coreseeker', col: 1, row: 5,
      cost: 3, max: 1, needs: ['delve_speed2', 'delve_pressure'],
      desc: 'Ore glows through 6 tiles of rock. No fall ever hurts again. '
          + 'Mining +50%, ore luck +35%, light +4, tool power +2, craft luck +10.',
      apply: (s) => {
        s.mineSpeed += 0.50; s.oreLuck += 0.35; s.lightRadius += 4;
        s.minePower += 2; s.luck += 10; s.fallSafe += 12;
        /* total fall immunity is an effect, not a huge number: the
           sim reads 'no_fall' and skips the check entirely */
        s.effects.push('ore_xray', 'no_fall');
      } },

    /* ================= BRAWLER (cols 4-6) ================= */
    { id: 'brawl_root', trunk: 'brawler', name: 'Bar Brawler', col: 5, row: 0,
      cost: 1, max: 1, needs: [],
      desc: 'Melee damage +5%. Knockback +5%.',
      apply: (s) => { s.meleeDmg += 0.05; s.knockback += 0.05; } },

    { id: 'brawl_dmg1', trunk: 'brawler', name: 'Heavy Hands', col: 4, row: 1,
      cost: 1, max: 3, needs: ['brawl_root'],
      desc: 'Melee damage +10% per rank.',
      apply: (s, rank) => { s.meleeDmg += 0.10 * rank; } },

    { id: 'brawl_crit1', trunk: 'brawler', name: 'Weak Spots', col: 6, row: 1,
      cost: 1, max: 3, needs: ['brawl_root'],
      desc: 'Crit chance +4 points per rank.',
      apply: (s, rank) => { s.critChance += 4 * rank; } },

    { id: 'brawl_swing', trunk: 'brawler', name: 'Wide Arc', col: 4, row: 2,
      cost: 1, max: 2, needs: ['brawl_dmg1'],
      desc: 'Swing speed +8% and knockback +15% per rank.',
      apply: (s, rank) => { s.swingSpeed += 0.08 * rank; s.knockback += 0.15 * rank; } },

    /* the brawler end of the cross-link into TIDECALLER */
    { id: 'brawl_reach', trunk: 'brawler', name: 'Long Reach', col: 6, row: 2,
      cost: 1, max: 2, needs: ['brawl_crit1'],
      desc: 'Weapon reach +3px and crit damage +10% per rank.',
      apply: (s, rank) => { s.reach += 3 * rank; s.critDmg += 0.10 * rank; } },

    { id: 'brawl_rage', trunk: 'brawler', name: 'Second Wind', col: 5, row: 3,
      cost: 2, max: 2, needs: ['brawl_swing', 'brawl_reach'],
      desc: 'Melee damage +12% and lifesteal +2% per rank.',
      apply: (s, rank) => { s.meleeDmg += 0.12 * rank; s.lifesteal += 0.02 * rank; } },

    /* CROSS-LINK: reachable from delve_pressure, so a delver can
       buy plate without paying for the whole brawler trunk */
    { id: 'brawl_bulwark', trunk: 'brawler', name: 'Barnacle Hide', col: 4, row: 4,
      cost: 2, max: 3, needs: ['brawl_rage', 'delve_pressure'],
      desc: 'Armour +5 and knockback resistance +15% per rank.',
      apply: (s, rank) => { s.armour += 5 * rank; s.knockResist += 0.15 * rank; } },

    /* CROSS-LINK: reachable from tide_flow */
    { id: 'brawl_leech', trunk: 'brawler', name: 'Red Tide', col: 6, row: 4,
      cost: 2, max: 2, needs: ['brawl_rage', 'tide_flow'],
      desc: 'Lifesteal +4% and crit damage +15% per rank.',
      apply: (s, rank) => { s.lifesteal += 0.04 * rank; s.critDmg += 0.15 * rank; } },

    /* capstone: finish anything already bleeding */
    { id: 'brawl_cap', trunk: 'brawler', name: 'Crown Of Teeth', col: 5, row: 5,
      cost: 3, max: 1, needs: ['brawl_bulwark', 'brawl_leech'],
      desc: 'Any enemy under 15% health dies to a single hit, and the kill '
          + 'shockwaves. Melee +40%, crit +12, crit damage +50%, lifesteal +6%, armour +8.',
      apply: (s) => {
        s.meleeDmg += 0.40; s.critChance += 12; s.critDmg += 0.50;
        s.lifesteal += 0.06; s.armour += 8;
        s.effects.push('execute');
      } },

    /* =============== TIDECALLER (cols 8-10) =============== */
    { id: 'tide_root', trunk: 'tidecaller', name: 'Salt In The Blood', col: 9, row: 0,
      cost: 1, max: 1, needs: [],
      desc: 'Swim speed +8%. Breath +5 seconds.',
      apply: (s) => { s.swimSpeed += 0.08; s.breath += 5; } },

    { id: 'tide_swim1', trunk: 'tidecaller', name: 'Finkick', col: 8, row: 1,
      cost: 1, max: 3, needs: ['tide_root'],
      desc: 'Swim speed +10% per rank.',
      apply: (s, rank) => { s.swimSpeed += 0.10 * rank; } },

    { id: 'tide_hook1', trunk: 'tidecaller', name: 'Barbed Hook', col: 10, row: 1,
      cost: 1, max: 3, needs: ['tide_root'],
      desc: 'Grapple reach +4 tiles and reel speed +8% per rank.',
      apply: (s, rank) => { s.grappleLen += 4 * rank; s.grappleSpeed += 0.08 * rank; } },

    /* CROSS-LINK: reachable from brawl_reach */
    { id: 'tide_grapple', trunk: 'tidecaller', name: 'Kraken Line', col: 8, row: 2,
      cost: 2, max: 2, needs: ['tide_swim1', 'brawl_reach'],
      desc: 'Grapple reach +6 tiles and reel speed +15% per rank. '
          + 'At rank 2 you can swing on the line instead of just winching.',
      apply: (s, rank) => {
        s.grappleLen += 6 * rank; s.grappleSpeed += 0.15 * rank;
        if (rank >= 2) s.effects.push('grapple_swing');
      } },

    { id: 'tide_current', trunk: 'tidecaller', name: 'Rip Current', col: 10, row: 2,
      cost: 1, max: 2, needs: ['tide_hook1'],
      desc: 'Push 1 more level of water per use, swim speed +6%, per rank.',
      apply: (s, rank) => { s.waterControl += 1 * rank; s.swimSpeed += 0.06 * rank; } },

    { id: 'tide_mount', trunk: 'tidecaller', name: 'Whistle', col: 9, row: 3,
      cost: 2, max: 1, needs: ['tide_grapple', 'tide_current'],
      desc: 'Summon your mount anywhere, even mid-water. Mount speed +10%.',
      apply: (s) => { s.mounts += 1; s.mountSpeed += 0.10; s.effects.push('mount_anywhere'); } },

    /* the tidecaller end of the cross-link into BRAWLER */
    { id: 'tide_flow', trunk: 'tidecaller', name: 'Tideturner', col: 8, row: 4,
      cost: 2, max: 2, needs: ['tide_mount'],
      desc: 'Move 2 more levels of water per use and swim +12% per rank.',
      apply: (s, rank) => { s.waterControl += 2 * rank; s.swimSpeed += 0.12 * rank; } },

    { id: 'tide_gills', trunk: 'tidecaller', name: 'Gill Slits', col: 10, row: 4,
      cost: 2, max: 2, needs: ['tide_mount'],
      desc: 'Breath +15 seconds per rank. At rank 2 breath stops draining '
          + 'above the Trench entirely.',
      apply: (s, rank) => { s.breath += 15 * rank; if (rank >= 2) s.effects.push('gills'); } },

    /* capstone: a whirlpool with your name on it, and a whale */
    { id: 'tide_cap', trunk: 'tidecaller', name: 'Call The Deep', col: 9, row: 5,
      cost: 3, max: 1, needs: ['tide_flow', 'tide_gills'],
      desc: 'Open a maelstrom that drags everything nearby in and shreds it. '
          + 'The whale answers your whistle. Swim +50%, water control +4, breath +30.',
      apply: (s) => {
        s.swimSpeed += 0.50; s.waterControl += 4; s.breath += 30; s.mounts += 1;
        s.effects.push('maelstrom', 'whale');
      } }
  ];

  const byId = {}, byTrunk = {};
  for (const t in TRUNKS) byTrunk[t] = [];
  for (const n of all) {
    if (byId[n.id]) throw new Error('duplicate skill node: ' + n.id);
    if (!TRUNKS[n.trunk]) throw new Error(n.id + ' is in unknown trunk ' + n.trunk);
    byId[n.id] = n;
    byTrunk[n.trunk].push(n);
  }
  /* the grid the UI has to fit on screen, read off the data */
  const GRID = all.reduce((g, n) => ({
    cols: Math.max(g.cols, n.col + 1), rows: Math.max(g.rows, n.row + 1)
  }), { cols: 0, rows: 0 });

  /* every node at rank 0, so the UI can iterate an allocation
     without caring which nodes exist yet */
  function blank() {
    const a = {};
    for (const n of all) a[n.id] = 0;
    return a;
  }

  const rankOf = (alloc, id) => Math.max(0, Math.min(byId[id] ? byId[id].max : 0, (alloc && alloc[id]) || 0));

  /* needs is OR: one taken prerequisite is enough. The UI must still
     check the player has a point spare - that is not this function's
     business. */
  function canTake(alloc, id) {
    const n = byId[id];
    if (!n) return false;
    if (rankOf(alloc, id) >= n.max) return false;
    if (!n.needs.length) return true;
    for (const p of n.needs) if (rankOf(alloc, p) > 0) return true;
    return false;
  }

  function cost(alloc) {
    let sum = 0;
    for (const n of all) sum += rankOf(alloc, n.id) * n.cost;
    return sum;
  }

  /* fold every taken rank into one stats object. Order-independent:
     every apply() only ever adds, so the tree cannot depend on the
     order the player bought it in. */
  function derive(alloc) {
    const s = base();
    for (const n of all) {
      const r = rankOf(alloc, n.id);
      if (r > 0) n.apply(s, r);
    }
    /* two nodes can grant the same effect; the sim wants a set */
    s.effects = s.effects.filter((e, i) => s.effects.indexOf(e) === i);
    return s;
  }

  /* respec is deliberately expensive but never level-locked: the
     price is clams, which you can always go and earn */
  const respecCost = (alloc) => 25 * cost(alloc);
  /* level N has given out N points plus a bonus every 5th level */
  const pointsAt = (level) => Math.max(0, level) + Math.floor(Math.max(0, level) / 5);

  return { all, byId, byTrunk, TRUNKS, GRID, base, blank, derive, canTake,
           cost, rankOf, respecCost, pointsAt };
})();
