/* ============================================================
   races.js - mount racing: tiers, rivals, odds.
   ============================================================ */
KA.Races = (function () {
  const U = KA.U;
  const TIERS = [
    { id: 0, name: 'Puddle Cup',    entry: 20,   purse: [140, 60, 25, 20],        minLvl: 1,  len: 1500, col: '#3fd18b',
      blurb: 'Local, damp, mostly children.' },
    { id: 1, name: 'Reef Cup',      entry: 90,   purse: [700, 280, 110, 90],      minLvl: 4,  len: 2100, col: '#7fe8ff',
      blurb: 'Proper racing. Barry keeps a fragment on this one.' },
    { id: 2, name: 'Colonnade Cup', entry: 350,  purse: [3000, 1100, 450, 350],   minLvl: 8,  len: 2700, col: '#ffc94a',
      blurb: 'Raced between the old columns. Very grand.' },
    { id: 3, name: 'Trench Cup',    entry: 1400, purse: [14000, 5000, 1800, 1400],minLvl: 14, len: 3300, col: '#a86bff',
      blurb: 'Dark, deep, sponsored by something with teeth.' },
    { id: 4, name: 'Atlantic Grand',entry: 5000, purse: [60000, 20000, 7500, 5000],minLvl: 20, len: 3900, col: '#ff6f74',
      blurb: 'The big one. Your old subjects will be watching.' }
  ];
  const TIER_POWER = [26, 44, 68, 100, 140];
  const NAMES = ['Barnacle Bill', 'Miss Fintastic', 'Chad Wavedeep', 'Kelpy Ken Jr', 'Turbo Tim',
    'Duchess Bubbles', 'Old Man Mackerel', 'Baron Von Blowhole', 'Salty Sue', 'Foam Boy',
    'Reef Rick', 'Wet Bandit', 'Count Splashula', 'Brine Brad', 'Admiral Wiggles'];
  const COLS = ['#ff6f74', '#ffb347', '#c8ff4a', '#3fd18b', '#7fe8ff', '#9ec5ff', '#ff9ed2', '#a86bff'];

  function field(tierId, myPower, n) {
    const tier = TIERS[tierId];
    const anchor = U.lerp(TIER_POWER[tierId] || 26, myPower, 0.68);
    const names = U.shuffle(NAMES).slice(0, n || 5);
    const specs = KA.Pets.SPECIES.filter((s) => s.tier <= Math.min(6, tierId + 2));
    return names.map((nm, i) => {
      const sp = U.pick(specs);
      const want = anchor * (0.76 + i * 0.085 + Math.random() * 0.1);
      const base = KA.Pet.stats({ sp: sp.id, exp: 0, rolled: {}, traits: [] });
      const cur = base.spd * 1.3 + base.sta * 0.8 + base.pwr * 0.75 + base.gra * 0.5 + base.lck * 0.3;
      const f = U.clamp(want / (cur || 1), 0.3, 4);
      const st = {};
      for (const k in base) st[k] = Math.max(1, Math.round(base[k] * f));
      return { name: nm, sp: sp.id, stats: st, col: COLS[i % COLS.length],
        pet: { uid: 'r' + i, sp: sp.id, name: nm, exp: 0, rolled: {}, traits: [] } };
    });
  }
  function odds(list) {
    const pw = list.map((r) => {
      const s = r.stats;
      return Math.max(4, s.spd * 1.3 + s.sta * 0.8 + s.pwr * 0.75 + s.gra * 0.5 + s.lck * 0.3);
    });
    const tot = pw.reduce((a, b) => a + b, 0);
    return pw.map((p) => U.clamp((1 / (p / tot)) * 0.86, 1.1, 40));
  }
  const EVENTS = [
    { txt: 'CURRENT BOOST!', col: '#7fe8ff', k: 'fast' },
    { txt: 'KELP TANGLE!', col: '#3fd18b', k: 'slow' },
    { txt: 'CRAB ON THE TRACK', col: '#ff6f74', k: 'slow' },
    { txt: 'SOMEBODY THREW A BEER', col: '#ffb52e', k: 'fast' },
    { txt: 'SHARK SIGHTING', col: '#c9343f', k: 'scare' }
  ];
  return { TIERS, TIER_POWER, field, odds, EVENTS, NAMES, COLS };
})();
