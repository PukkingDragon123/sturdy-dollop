/* ============================================================
   rolls.js - the skill system. No tree: you gamble a token on a
   CATEGORY and the machine decides how generous it feels.
   ============================================================ */
KA.Rolls = (function () {
  const U = KA.U;
  const CATS = [
    { id: 'spd', name: 'SPEED',   col: '#7fe8ff', blurb: 'Flat-out pace. Wins straight races.' },
    { id: 'sta', name: 'STAMINA', col: '#3fd18b', blurb: 'How long you can surge before you die inside.' },
    { id: 'pwr', name: 'POWER',   col: '#ff9a3c', blurb: 'Acceleration, shoving, and mount combat bonus.' },
    { id: 'gra', name: 'GRACE',   col: '#ff9ed2', blurb: 'Dodging, cornering, looking good doing it.' },
    { id: 'lck', name: 'LUCK',    col: '#ffc94a', blurb: 'Better rolls, better race events, better everything.' }
  ];
  /* weight -> chance; amount -> stat points */
  const TIERS = [
    { id: 'dud',    name: 'DUD',        weight: 14, amount: 0, col: '#6693a8', shout: 'nothing. absolutely nothing.' },
    { id: 'common', name: 'COMMON',     weight: 40, amount: 1, col: '#9dc4d6', shout: 'a small improvement.' },
    { id: 'good',   name: 'GOOD',       weight: 25, amount: 2, col: '#3fd18b', shout: 'not bad!' },
    { id: 'great',  name: 'GREAT',      weight: 13, amount: 4, col: '#7fe8ff', shout: 'GREAT roll!' },
    { id: 'epic',   name: 'EPIC',       weight: 6,  amount: 7, col: '#a86bff', shout: 'EPIC!! the crowd goes wild' },
    { id: 'legend', name: 'LEGENDARY',  weight: 2,  amount: 12, col: '#ffc94a', shout: 'LEGENDARY!!! somebody fainted', trait: true }
  ];
  const tById = {}; TIERS.forEach((t) => (tById[t.id] = t));

  /* luck bends the table upward; double-down doubles and can bust */
  function roll(luck, doubled) {
    const l = U.clamp((luck || 0) / 90, 0, 0.65);
    const t = U.pickW(TIERS, (x) => {
      if (x.id === 'dud') return x.weight * (1 - l);
      if (x.id === 'legend' || x.id === 'epic') return x.weight * (1 + l * 3.2);
      if (x.id === 'great') return x.weight * (1 + l * 1.6);
      return x.weight;
    });
    let amount = t.amount;
    let bust = false;
    if (doubled) {
      if (U.chance(0.22 - l * 0.12)) { bust = true; amount = 0; }
      else amount *= 2;
    }
    return { tier: t, amount, bust, doubled: !!doubled };
  }
  function cost(n) { return 1; }                 // one token per roll
  const CATBYID = {}; CATS.forEach((c) => (CATBYID[c.id] = c));
  return { CATS, CATBYID, TIERS, tById, roll, cost };
})();
