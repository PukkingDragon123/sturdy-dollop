/* ============================================================
   items.js - weapons, beer, food, bait, tackle.
   ============================================================ */
KA.Items = (function () {
  /* ---- weapons: the combat ladder ---- */
  const WEAPONS = [
    { id: 'stool',  name: 'Bar Stool',        cost: 0,     dmg: 7,  spd: 1.00, reach: 24, kb: 90,
      col: '#a4713d', blurb: 'You woke up holding it. It is technically a weapon.' },
    { id: 'bone',   name: 'Sharpened Bone',   cost: 140,   dmg: 12, spd: 1.10, reach: 26, kb: 100,
      col: '#e8dcc0', blurb: 'Somebody else\'s. Do not ask whose.' },
    { id: 'trident',name: 'Bronze Trident',   cost: 520,   dmg: 19, spd: 1.00, reach: 33, kb: 130,
      col: '#c98f1c', blurb: 'Three points. Classic. Royalty-adjacent.' },
    { id: 'halberd',name: 'Coral Halberd',    cost: 1800,  dmg: 29, spd: 0.85, reach: 40, kb: 190,
      col: '#ff7fa8', blurb: 'Heavy, gorgeous, slightly alive.' },
    { id: 'fork',   name: 'Kingsfork',        cost: 6000,  dmg: 42, spd: 1.15, reach: 36, kb: 165,
      col: '#ffd24a', blurb: 'Your old cutlery. Turns out it was ceremonial.' },
    { id: 'regalia',name: 'Poseidon\'s Regalia', cost: 19000, dmg: 62, spd: 1.30, reach: 44, kb: 240,
      col: '#7fe8ff', blurb: 'Hums the national anthem when it hits things.' }
  ];
  const wById = {}; WEAPONS.forEach((w) => (wById[w.id] = w));

  /* ---- beer: strength now, fat later. The whole tragedy. ---- */
  const BEERS = [
    { id: 'lager',   name: 'Reef Lager',      cost: 18,   dmg: 0.18, fat: 6,  dur: 45, col: '#ffb52e',
      blurb: 'Cheap, wet, does the job. +18% damage.' },
    { id: 'stout',   name: 'Trench Stout',    cost: 55,   dmg: 0.35, fat: 11, dur: 60, col: '#8a5a24',
      blurb: 'Thick as tar. +35% damage. Regrettable.' },
    { id: 'royal',   name: 'Royal Foam',      cost: 160,  dmg: 0.60, fat: 16, dur: 75, col: '#ffe08a',
      blurb: 'What kings drank. +60% damage. Also what ruined one.' },
    { id: 'keg',     name: 'Her Own Brew',    cost: 420,  dmg: 1.00, fat: 24, dur: 90, col: '#fff3d6',
      blurb: 'Brewed by the Princess herself. +100% damage. You will feel it tomorrow.' }
  ];
  const bById = {}; BEERS.forEach((b) => (bById[b.id] = b));

  /* ---- pet food: bought, or use raw fish ---- */
  const FOOD = [
    { id: 'pellets', name: 'Kelp Pellets',  cost: 8,   exp: 12,  col: '#3fd18b', blurb: 'Technically food.' },
    { id: 'chow',    name: 'Fish Chow',     cost: 26,  exp: 34,  col: '#9dc4d6', blurb: 'Smells like a crime.' },
    { id: 'krill',   name: 'Premium Krill', cost: 74,  exp: 78,  col: '#ffc2a8', blurb: 'Tiny shrimp, huge gains.' },
    { id: 'roe',     name: 'Golden Roe',    cost: 210, exp: 190, col: '#ffd24a', blurb: 'Shiny. Probably illegal.' }
  ];
  const fById = {}; FOOD.forEach((f) => (fById[f.id] = f));

  /* ---- tackle: makes the spear easier to aim and land ---- */
  const TACKLE = [
    { id: 'stick',  name: 'Pointy Stick',  cost: 0,    power: 1.00, window: 1.00, blurb: 'Wobbles in flight.' },
    { id: 'barb',   name: 'Barbed Spear',  cost: 180,  power: 1.15, window: 1.20, blurb: 'Fish struggle less.' },
    { id: 'harpoon',name: 'Hand Harpoon',  cost: 700,  power: 1.30, window: 1.45, blurb: 'Proper kit at last.' },
    { id: 'coil',   name: 'Coilgun Spear', cost: 2600, power: 1.55, window: 1.75, blurb: 'Fires itself. Alarming.' }
  ];
  const tById = {}; TACKLE.forEach((t) => (tById[t.id] = t));

  /* ---- the fish you catch: food, money, and pet favourites ---- */
  const FISH = [
    { id: 'shrimp',   name: 'Shrimp',        value: 6,   exp: 14,  depth: 0, fight: 0.5, col: '#ffc2a8' },
    { id: 'anemone',  name: 'Anemone Blob',  value: 11,  exp: 20,  depth: 0, fight: 0.6, col: '#a86bff' },
    { id: 'sardine',  name: 'Sardine',       value: 14,  exp: 26,  depth: 1, fight: 0.8, col: '#cfe0ee' },
    { id: 'clam',     name: 'Fat Clam',      value: 22,  exp: 30,  depth: 0, fight: 0.4, col: '#f6d7e8' },
    { id: 'mackerel', name: 'Mackerel',      value: 34,  exp: 48,  depth: 1, fight: 1.1, col: '#7fc4a8' },
    { id: 'squid',    name: 'Squid',         value: 52,  exp: 66,  depth: 2, fight: 1.4, col: '#ff9ed2' },
    { id: 'krill',    name: 'Krill Cloud',   value: 40,  exp: 90,  depth: 2, fight: 0.7, col: '#ffd9c2' },
    { id: 'grouper',  name: 'Grumpy Grouper',value: 90,  exp: 120, depth: 2, fight: 1.9, col: '#8f6f4a' },
    { id: 'tunafish', name: 'Small Tuna',    value: 140, exp: 170, depth: 3, fight: 2.3, col: '#4d7fc4' },
    { id: 'goldfish', name: 'Golden Snapper',value: 320, exp: 260, depth: 3, fight: 2.8, col: '#ffd24a' },
    { id: 'void',     name: 'Trench Thing',  value: 620, exp: 420, depth: 4, fight: 3.4, col: '#a86bff' }
  ];
  const fishById = {}; FISH.forEach((f) => (fishById[f.id] = f));

  return { WEAPONS, wById, BEERS, bById, FOOD, fById, TACKLE, tById, FISH, fishById };
})();
