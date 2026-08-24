/* ============================================================
   pets.js - the mount ladder. Sea horse to whale. Every one can
   be fed, rolled, ridden and raced.
   ============================================================ */
KA.Pets = (function () {
  const SPECIES = [
    { id: 'seahorse', name: 'Sea Horse', tier: 0, cost: 0,
      base: { spd: 6, sta: 8, pwr: 4, gra: 9, lck: 7 },
      size: 0.62, ride: { top: 0.34, rot: 0 }, walker: false,
      col: { a: '#ffb84d', b: '#c97f1c', c: '#fff0c9' },
      loves: 'shrimp', blurb: 'Tiny. Curls its tail around your finger. Cannot carry you far.',
      unlock: 'Yours from the start. He has always been here.' },
    { id: 'clownfish', name: 'Clownfish', tier: 1, cost: 380,
      base: { spd: 11, sta: 9, pwr: 6, gra: 14, lck: 9 },
      size: 0.72, ride: { top: 0.21, rot: 0 }, walker: false,
      col: { a: '#ff8a2b', b: '#d1520e', c: '#fff6ea' },
      loves: 'anemone', blurb: 'Darty, bouncy, unreasonably confident for its size.',
      unlock: 'Sold at the Stable once you own 380 clams.' },
    { id: 'crab', name: 'War Crab', tier: 2, cost: 1250,
      base: { spd: 9, sta: 16, pwr: 15, gra: 6, lck: 8 },
      size: 0.9, ride: { top: 0.19, rot: 0 }, walker: true,
      col: { a: '#ff6f6f', b: '#a8343f', c: '#ffd9d9' },
      loves: 'clam', blurb: 'Walks the seabed. Cannot be shoved. Sideways by design.',
      unlock: 'Stable, 1250 clams. Comes with a grudge.' },
    { id: 'tuna', name: 'Bluefin Tuna', tier: 3, cost: 4200,
      base: { spd: 20, sta: 18, pwr: 14, gra: 11, lck: 9 },
      size: 1.0, ride: { top: 0.15, rot: 0 }, walker: false,
      col: { a: '#4d7fc4', b: '#26456f', c: '#e8f3ff' },
      loves: 'sardine', blurb: 'A muscle with a face. Genuinely fast.',
      unlock: 'Stable, 4200 clams, and the Stablemaster wants to see a race win first.' },
    { id: 'dolphin', name: 'Dolphin', tier: 4, cost: 12000,
      base: { spd: 24, sta: 24, pwr: 18, gra: 20, lck: 14 },
      size: 1.12, ride: { top: 0.13, rot: 0 }, walker: false,
      col: { a: '#5aa8d8', b: '#2b5f8c', c: '#dff0fb' },
      loves: 'mackerel', blurb: 'Smart, smug, jumps clean out of the water. The classic.',
      unlock: 'Stable, 12000 clams. The good stuff.' },
    { id: 'swordfish', name: 'Swordfish', tier: 5, cost: 34000,
      base: { spd: 34, sta: 22, pwr: 26, gra: 24, lck: 12 },
      size: 1.2, ride: { top: 0.13, rot: 0 }, walker: false,
      col: { a: '#3f6fb8', b: '#1d3468', c: '#e6eeff' },
      loves: 'squid', blurb: 'Fastest thing in the Atlantic. Has stabbed three referees.',
      unlock: 'Stable, 34000 clams, and a level 12 mount to prove you can handle it.' },
    { id: 'whale', name: 'Whale', tier: 6, cost: 90000,
      base: { spd: 20, sta: 60, pwr: 55, gra: 8, lck: 18 },
      size: 2.1, ride: { top: 0.16, rot: 0 }, walker: false,
      col: { a: '#5c6f8c', b: '#2b3648', c: '#dfe8f2' },
      loves: 'krill', blurb: 'Slow to start, impossible to stop. Sings while racing.',
      unlock: 'Stable, 90000 clams. You will need the crown money for this. Choose.' }
  ];
  const byId = {};
  SPECIES.forEach((s) => (byId[s.id] = s));

  /* favourite-food ids map onto the fish table */
  const NAMES = ['Nibbles', 'Bucket', 'Sir Gulps', 'Moist', 'Chonk', 'Zoom', 'Beans', 'Duchess',
    'Squeaks', 'Torpedo', 'Wobbles', 'Barnacle', 'Slappy', 'Pudding', 'Admiral', 'Biscuit',
    'Noodle', 'Blorp', 'Gerald', 'Mildred', 'Tiny', 'Big Steve', 'Sushi', 'Captain Nibbles'];

  const TRAITS = {
    zoomy:    { name: 'Zoomy',      col: '#7fe8ff', mods: { spd: 3 }, blurb: 'Cannot sit still.' },
    thicc:    { name: 'Well Fed',   col: '#ffb52e', mods: { sta: 4, spd: -1 }, blurb: 'Ate the whole bucket.' },
    brawler:  { name: 'Brawler',    col: '#ff6f74', mods: { pwr: 4, gra: -1 }, blurb: 'Starts things.' },
    dainty:   { name: 'Dainty',     col: '#ff9ed2', mods: { gra: 4 }, blurb: 'Refuses to touch the seabed.' },
    lucky:    { name: 'Lucky',      col: '#3fd18b', mods: { lck: 6 }, blurb: 'Found a coin in a clam. Twice.' },
    loud:     { name: 'Very Loud',  col: '#a86bff', mods: { pwr: 2, sta: 2 }, blurb: 'Audible from the next area.' },
    royal:    { name: 'Royal Blood',col: '#ffc94a', mods: { spd: 2, sta: 2, pwr: 2, gra: 2, lck: 2 }, blurb: 'Suspiciously regal.' },
    soggy:    { name: 'Extra Soggy',col: '#7fe8ff', mods: { gra: 2, sta: 1 }, blurb: 'Peak hydration.' },
    grumpy:   { name: 'Grumpy',     col: '#c9343f', mods: { pwr: 3, lck: -2 }, blurb: 'Bites the trophy.' }
  };
  function randTrait(exclude) {
    const keys = Object.keys(TRAITS).filter((k) => !(exclude || []).includes(k));
    return keys.length ? KA.U.pick(keys) : null;
  }
  return { SPECIES, byId, NAMES, TRAITS, randTrait };
})();
