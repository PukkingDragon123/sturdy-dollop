/* ============================================================
   upgrades.js - ranch buildings and hireable staff.
   ============================================================ */
DZ.Upgrades = (function () {
  /* levels[0] is what you start with; cost is to reach that level */
  const RANCH = [
    { id: 'pens', name: 'Lagoon Pens', icon: 'hut', blurb: 'How many dolphins you can keep.',
      levels: [ { cost: 0, v: 2, txt: '2 dolphins' }, { cost: 220, v: 3, txt: '3 dolphins' },
                { cost: 900, v: 5, txt: '5 dolphins' }, { cost: 3200, v: 8, txt: '8 dolphins' },
                { cost: 11000, v: 12, txt: '12 dolphins' } ] },
    { id: 'trough', name: 'Auto-Trough', icon: 'trough', blurb: 'Feeds dolphins for you each morning.',
      levels: [ { cost: 0, v: 0, txt: 'manual feeding' }, { cost: 260, v: 1, txt: 'feeds 1/day' },
                { cost: 950, v: 2, txt: 'feeds 2/day' }, { cost: 3000, v: 4, txt: 'feeds 4/day' },
                { cost: 9000, v: 9, txt: 'feeds everyone' } ] },
    { id: 'reef', name: 'Training Reef', icon: 'coral_fan', blurb: 'Passive EXP every day, per dolphin.',
      levels: [ { cost: 0, v: 0, txt: 'no training' }, { cost: 300, v: 8, txt: '+8 EXP/day' },
                { cost: 1100, v: 20, txt: '+20 EXP/day' }, { cost: 3800, v: 45, txt: '+45 EXP/day' },
                { cost: 12500, v: 95, txt: '+95 EXP/day' } ] },
    { id: 'lagoon', name: 'Breeding Lagoon', icon: 'anemone', blurb: 'Make more dolphins. Romantically.',
      levels: [ { cost: 0, v: 0, txt: 'locked' }, { cost: 500, v: 1, txt: 'breeding unlocked' },
                { cost: 1800, v: 2, txt: '+better inheritance' }, { cost: 5600, v: 3, txt: '+rare morph chance' },
                { cost: 16000, v: 4, txt: 'twins possible' } ] },
    { id: 'stall', name: 'Market Stall', icon: 'stall', blurb: 'Sell fish for more clams.',
      levels: [ { cost: 0, v: 1.0, txt: 'x1.00 sell price' }, { cost: 240, v: 1.15, txt: 'x1.15 sell price' },
                { cost: 900, v: 1.35, txt: 'x1.35 sell price' }, { cost: 3400, v: 1.6, txt: 'x1.60 sell price' },
                { cost: 10500, v: 2.0, txt: 'x2.00 sell price' } ] },
    { id: 'vat', name: 'Abyssal Vat', icon: 'vat', blurb: 'Turn a good dolphin evil. For science.',
      levels: [ { cost: 0, v: 0, txt: 'locked' }, { cost: 800, v: 1, txt: 'corruption unlocked' },
                { cost: 2600, v: 2, txt: 'corrupts 35% faster' }, { cost: 7400, v: 3, txt: 'evil stat bonus +50%' } ] },
    { id: 'bunk', name: 'Bunkhouse', icon: 'bunk', blurb: 'Somewhere for the staff to sleep.',
      levels: [ { cost: 0, v: 1, txt: '1 staff slot' }, { cost: 350, v: 2, txt: '2 staff slots' },
                { cost: 1300, v: 3, txt: '3 staff slots' }, { cost: 4200, v: 5, txt: '5 staff slots' },
                { cost: 13000, v: 7, txt: '7 staff slots' } ] },
    { id: 'sonar', name: 'Sonar Buoy', icon: 'buoy', blurb: 'Rare fish spawn more often on dives.',
      levels: [ { cost: 0, v: 0, txt: 'no sonar' }, { cost: 420, v: 0.35, txt: '+35% rare fish' },
                { cost: 1600, v: 0.8, txt: '+80% rare fish' }, { cost: 5200, v: 1.6, txt: '+160% rare fish' } ] },
    { id: 'spa', name: 'Bubble Spa', icon: 'vent', blurb: 'Happy dolphins race better.',
      levels: [ { cost: 0, v: 0, txt: 'no spa' }, { cost: 380, v: 0.06, txt: '+6% race stats' },
                { cost: 1500, v: 0.13, txt: '+13% race stats' }, { cost: 5000, v: 0.22, txt: '+22% race stats' } ] }
  ];

  const byId = {}; RANCH.forEach((u) => (byId[u.id] = u));

  /* ---------------- STAFF ---------------- */
  const ROLES = [
    { id: 'fisher',  title: 'Deckhand',   icon: 'netring', cost: 320,  wage: 26,
      blurb: 'Catches fish while you sleep.', detail: (l) => (2 + l * 2) + ' fish/day' },
    { id: 'trainer', title: 'Trainer',    icon: 'bolt',    cost: 480,  wage: 40,
      blurb: 'Drills your dolphins daily.', detail: (l) => '+' + (14 + l * 10) + ' EXP/day each' },
    { id: 'groomer', title: 'Groomer',    icon: 'heart',   cost: 300,  wage: 22,
      blurb: 'Shiny dolphins are charming dolphins.', detail: (l) => '+' + (1 + l) + ' CHM/day' },
    { id: 'vet',     title: 'Sea Vet',    icon: 'clam_shell', cost: 560, wage: 44,
      blurb: 'Keeps everyone fed and fit.', detail: () => 'no fatigue, +stamina' },
    { id: 'hype',    title: 'Hype Fish',  icon: 'star',    cost: 700,  wage: 55,
      blurb: 'Talks up your dolphin at the track.', detail: (l) => '+' + (12 + l * 8) + '% bet payouts' },
    { id: 'shady',   title: 'Shady Dealer', icon: 'skull', cost: 900,  wage: 70,
      blurb: 'Sells your fish to... someone.', detail: (l) => '+' + (15 + l * 10) + '% sell price, finds cursed fish' }
  ];
  const roleById = {}; ROLES.forEach((r) => (roleById[r.id] = r));

  function level(state, id) { return state.ranch[id] || 0; }
  function value(state, id) {
    const u = byId[id];
    return u.levels[DZ.Util.clamp(level(state, id), 0, u.levels.length - 1)].v;
  }
  function next(state, id) {
    const u = byId[id], l = level(state, id);
    return l + 1 < u.levels.length ? u.levels[l + 1] : null;
  }
  return { RANCH, byId, ROLES, roleById, level, value, next };
})();
