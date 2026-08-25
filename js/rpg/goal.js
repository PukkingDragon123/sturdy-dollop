/* ============================================================
   rpg/goal.js - the point of the game.
   You are the fat, deposed King of the Atlantic. The new king
   took your throne, your crown and your dignity, and he has an
   octopus army. To take it back you have to get back in shape:
   lose the weight, train the three disciplines, beat the champion
   of every zone, then go down to The Drop and settle it.
   ============================================================ */
KD.Goal = (function () {
  /* Weight is the spine of the whole game. It starts absurd and every
     honest activity shaves it down; every beer puts it back. */
  const START_WEIGHT = 100;

  const DISCIPLINES = [
    { id: 'strength', name: 'STRENGTH', col: 'BLOOD.2', blurb: 'Swing harder. Carry more.',
      stat: 'Melee damage +4% per level.', max: 10 },
    { id: 'wind',     name: 'WIND',     col: 'WATER.2', blurb: 'Stop wheezing.',
      stat: 'Stamina and swim speed +5% per level.', max: 10 },
    { id: 'grit',     name: 'GRIT',     col: 'SAND.2',  blurb: 'Take a hit and keep going.',
      stat: 'Armour +2 and knock resistance per level.', max: 10 }
  ];

  /* The five gates on the road back to the throne. Each is checked, not
     hand-waved: the guard, the pressure and the champion all read these. */
  const MILESTONES = [
    { id: 'gate',   weight: 82, trained: 3,  name: 'Leave town',
      why: 'The gate guard will not open up for a man who cannot climb the stairs.' },
    { id: 'reef',   weight: 68, trained: 8,  name: 'Past the reef' },
    { id: 'kelp',   weight: 54, trained: 14, name: 'Through the kelp' },
    { id: 'ruins',  weight: 40, trained: 20, name: 'Into the city' },
    { id: 'blue',   weight: 26, trained: 26, name: 'Across the blue' },
    { id: 'drop',   weight: 18, trained: 30, name: 'Down The Drop',
      why: 'The pressure down there would fold you in half at this weight.' }
  ];

  /* champions: one per zone, beat them to earn the challenge */
  const CHAMPIONS = [
    { zone: 'mine',  kind: 'sentinel', name: 'The Rockjaw',      hp: 120, at: 0.8 },
    { zone: 'reef',  kind: 'shark',    name: 'Old Scar',         hp: 180, at: 0.85 },
    { zone: 'kelp',  kind: 'horror',   name: 'The Tangle',       hp: 260, at: 0.8 },
    { zone: 'ruins', kind: 'sentinel', name: 'The Last Warden',  hp: 340, at: 0.85 },
    { zone: 'blue',  kind: 'shark',    name: 'The Long Shadow',  hp: 420, at: 0.8 }
  ];

  const trainedTotal = (S) => DISCIPLINES.reduce((n, d) => n + (S.train[d.id] || 0), 0);
  const weight = (S) => S.weight;

  /* the furthest milestone you have earned */
  function reached(S) {
    let best = -1;
    MILESTONES.forEach((m, i) => {
      if (S.weight <= m.weight && trainedTotal(S) >= m.trained) best = i;
    });
    return best;
  }
  function milestone(id) { return MILESTONES.find((m) => m.id === id); }
  /* can the player be in this zone at all? */
  function allowed(S, zoneId) {
    const m = milestone(zoneId);
    if (!m) return true;
    return S.weight <= m.weight && trainedTotal(S) >= m.trained;
  }
  function why(S, zoneId) {
    const m = milestone(zoneId);
    if (!m) return null;
    const bits = [];
    if (S.weight > m.weight) bits.push('get under ' + m.weight + 'kg (you are ' + Math.round(S.weight) + ')');
    const t = trainedTotal(S);
    if (t < m.trained) bits.push('train to ' + m.trained + ' levels (you have ' + t + ')');
    return bits.length ? bits.join(' and ') : null;
  }

  /* Training: each session at the gym is a minigame; the score converts to
     discipline levels and burns weight. Later levels cost more reps. */
  const cost = (level) => 40 + level * 26;
  function train(S, disc, score) {
    const d = DISCIPLINES.find((x) => x.id === disc);
    if (!d) return null;
    const lvl = S.train[disc] || 0;
    if (lvl >= d.max) return { full: true };
    S.trainXp[disc] = (S.trainXp[disc] || 0) + score;
    let gained = 0;
    while (S.trainXp[disc] >= cost(S.train[disc] || 0) && (S.train[disc] || 0) < d.max) {
      S.trainXp[disc] -= cost(S.train[disc] || 0);
      S.train[disc] = (S.train[disc] || 0) + 1;
      gained++;
    }
    return { gained, level: S.train[disc] || 0, xp: S.trainXp[disc], need: cost(S.train[disc] || 0) };
  }
  /* what the disciplines are worth, folded into the stats block */
  function apply(S, stats) {
    const st = S.train.strength || 0, wi = S.train.wind || 0, gr = S.train.grit || 0;
    stats.meleeDmg = (stats.meleeDmg || 1) * (1 + st * 0.04);
    stats.swimSpeed = (stats.swimSpeed || 1) * (1 + wi * 0.05);
    stats.stamRegen = 1 + wi * 0.07;
    stats.armour = (stats.armour || 0) + gr * 2;
    stats.knockResist = (stats.knockResist || 0) + gr * 0.04;
    /* being lighter is its own reward: you move better the less of you there is */
    const lean = 1 + (START_WEIGHT - S.weight) / 240;
    stats.moveMul = lean;
    stats.jumpMul = 0.9 + (START_WEIGHT - S.weight) / 300;
    return stats;
  }
  /* effort burns weight. Tuned so honest play trims ~1kg a minute. */
  const burn = (S, kg) => { S.weight = Math.max(4, S.weight - kg); };
  const gain = (S, kg) => { S.weight = Math.min(140, S.weight + kg); };
  return { START_WEIGHT, DISCIPLINES, MILESTONES, CHAMPIONS,
           trainedTotal, weight, reached, milestone, allowed, why,
           train, cost, apply, burn, gain };
})();
