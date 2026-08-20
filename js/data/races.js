/* ============================================================
   races.js - race tiers, the rival stable, and the bookmaker.
   ============================================================ */
DZ.Races = (function () {
  const U = DZ.Util;

  const TIERS = [
    { id: 0, name: 'Puddle Cup',        entry: 20,   purse: [130, 55, 20],        minLvl: 1,  len: 440,  col: '#40d492',
      blurb: 'Mostly children and one confused eel.' },
    { id: 1, name: 'Reef Rumble',       entry: 85,   purse: [640, 250, 95],       minLvl: 3,  len: 640,  col: '#7ff0ff',
      blurb: 'Contact is discouraged but common.' },
    { id: 2, name: 'Colonnade Classic', entry: 320,  purse: [2800, 1050, 420],    minLvl: 6,  len: 850,  col: '#ffd24a',
      blurb: 'Raced between actual ruins. Very prestigious.' },
    { id: 3, name: 'Abyss Grand Prix',  entry: 1300, purse: [13000, 4800, 1700],  minLvl: 10, len: 1080, col: '#a86bff',
      blurb: 'Sponsored by something with too many eyes.' },
    { id: 4, name: 'Poseidon Trophy',   entry: 5200, purse: [58000, 19000, 7200], minLvl: 15, len: 1320, col: '#ff6f6f',
      blurb: 'The big one. Gods watch. Gods bet.' }
  ];

  const COLS = ['#ff6f6f', '#ffb347', '#c8ff4a', '#40d492', '#7ff0ff', '#9ec5ff', '#ff9ed2', '#a86bff', '#e9d9a8', '#ff9a3c'];

  function statBlock(lvl, spread, seedR) {
    const R = seedR || Math.random;
    const base = 6 + lvl * 1.9;
    const s = {};
    ['speed', 'stamina', 'burst', 'agility', 'charm', 'luck'].forEach((k) => {
      s[k] = Math.max(1, Math.round(base * (0.72 + R() * 0.56) + (spread || 0) * (R() - 0.5) * 6));
    });
    return s;
  }

  function makeRival(name, lvl, opts) {
    opts = opts || {};
    const evil = opts.evil || (lvl > 6 && U.chance(0.16));
    const st = statBlock(lvl, 1, opts.rng);
    if (evil) { st.speed += 3; st.burst += 3; st.charm = Math.max(1, st.charm - 6); }
    return {
      id: U.uid(), name, lvl, evil,
      stats: st,
      col: opts.col || U.pick(COLS),
      trait: DZ.Names.randTrait(),
      quip: U.pick(DZ.Names.quipsRace),
      wins: 0, races: 0, npc: true
    };
  }

  function makeStable(n) {
    const names = U.shuffle(DZ.Names.rival).slice(0, n);
    return names.map((nm, i) => makeRival(nm, 1 + U.rndInt(0, 2), { col: COLS[i % COLS.length] }));
  }

  /* rivals train too - called on every new day */
  function trainStable(state) {
    for (const r of state.rivals) {
      if (U.chance(0.42)) {
        r.lvl++;
        const k = U.pick(['speed', 'stamina', 'burst', 'agility', 'charm', 'luck']);
        r.stats[k] += U.rndInt(1, 3);
        if (U.chance(0.5)) r.stats[U.pick(['speed', 'stamina'])] += 1;
      }
      if (!r.evil && r.lvl > 8 && U.chance(0.05)) {
        r.evil = true; r.stats.speed += 3; r.stats.charm = Math.max(1, r.stats.charm - 5);
      }
    }
    // retire the weakest, sign a rookie, keeps the pool interesting
    if (state.rivals.length > 3 && U.chance(0.25)) {
      state.rivals.sort((a, b) => power(a) - power(b));
      state.rivals.shift();
      const used = state.rivals.map((r) => r.name);
      const nm = U.pick(DZ.Names.rival.filter((n) => !used.includes(n))) || 'Nameless Fin';
      state.rivals.push(makeRival(nm, 2 + Math.floor(state.day / 3), { col: U.pick(COLS) }));
    }
  }

  function power(r) {
    const s = r.stats;
    return s.speed * 1.25 + s.stamina * 0.8 + s.burst * 0.7 + s.agility * 0.55 + s.luck * 0.3;
  }

  /* a field is [player entrant, ...rivals] - the lobby inserts the entrant */
  function fieldFor(state, tierId, entrant) {
    const tier = TIERS[tierId];
    const target = entrant ? DZ.Dolphin.level(entrant) : tier.minLvl + 1;
    const pool = state.rivals.slice().sort((a, b) =>
      Math.abs(a.lvl - target) - Math.abs(b.lvl - target));
    const picks = pool.slice(0, 5).map((r) => Object.assign({}, r, { stats: Object.assign({}, r.stats) }));
    // Normalise the field around the player's actual power so every tier is a
    // real contest: some rivals a bit weaker, some a bit scarier, none hopeless.
    const mine = entrant ? DZ.Dolphin.power(entrant, state) : 40;
    picks.forEach((r, i) => {
      const want = mine * (0.78 + i * 0.09 + Math.random() * 0.12) * (1 + tierId * 0.02);
      const cur = power(r) || 1;
      const f = U.clamp(want / cur, 0.35, 3.2);
      for (const k in r.stats) r.stats[k] = Math.max(1, Math.round(r.stats[k] * f));
      r.lvl = Math.max(1, Math.round(r.lvl * U.clamp(f, 0.5, 2)));
    });
    return picks;
  }

  /* decimal odds. charm shortens your odds (crowd favourite = worse payout),
     which is exactly why an evil, unloved dolphin is a money printer. */
  function odds(field) {
    const pw = field.map((r) => {
      const s = r.stats;
      return Math.max(4, power(r) * (1 + (s.charm || 0) / 55));
    });
    const total = pw.reduce((a, b) => a + b, 0);
    return pw.map((p) => {
      const share = p / total;
      return Math.max(1.12, Math.min(48, (1 / share) * 0.88));
    });
  }

  const EVENTS = [
    { txt: 'KELP TANGLE!', col: '#40d492', kind: 'slow' },
    { txt: 'CURRENT BOOST!', col: '#7ff0ff', kind: 'fast' },
    { txt: 'A CRAB! ON THE TRACK!', col: '#ff6f6f', kind: 'slow' },
    { txt: 'SOMEONE THREW A FISH', col: '#ffd24a', kind: 'fast' },
    { txt: 'GARY SIGHTING', col: '#c53a3a', kind: 'scare' },
    { txt: 'ANCIENT PLUMBING ERUPTS', col: '#ff9ed2', kind: 'fast' }
  ];

  return { TIERS, COLS, makeRival, makeStable, trainStable, power, fieldFor, odds, statBlock, EVENTS };
})();
