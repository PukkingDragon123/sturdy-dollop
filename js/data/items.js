/* ============================================================
   items.js - food, gear tiers, consumables.
   ============================================================ */
DZ.Items = (function () {
  /* ---------------- FOOD ---------------- */
  const FOOD = [
    { id: 'pellet', name: 'Kelp Pellets', cost: 6, exp: 1.0, sprite: 'kelpbulb', col: '#40d492',
      traitChance: 0.02, blurb: 'Technically food. Legally food.' },
    { id: 'chow', name: 'Fish Chow', cost: 18, exp: 1.35, sprite: 'bucket', col: '#8fa6b5',
      traitChance: 0.05, blurb: 'Smells like a crime but they love it.' },
    { id: 'krill', name: 'Premium Krill', cost: 48, exp: 1.8, sprite: 'prawn', col: '#ffc2a8',
      traitChance: 0.10, blurb: 'Tiny shrimp, huge gains.' },
    { id: 'roe', name: 'Golden Roe', cost: 130, exp: 2.6, sprite: 'coin', col: '#ffd24a',
      traitChance: 0.18, stat: 'any', blurb: 'Eggs of unclear origin. Very shiny.' },
    { id: 'chum', name: 'Cursed Chum', cost: 90, exp: 2.0, sprite: 'skull', col: '#a86bff',
      traitChance: 0.22, corrupt: 12, blurb: 'Feeds the body. Ruins the soul. +CORRUPTION.' },
    { id: 'ambrosia', name: 'Atlantean Ambrosia', cost: 420, exp: 4.0, sprite: 'star', col: '#7ff0ff',
      traitChance: 0.30, stat: 'any', blurb: 'Poseidon\'s leftovers. Still good.' }
  ];

  /* ---------------- GEAR ---------------- */
  /* every tier lists what it does in plain numbers; the reef reads these */
  const GEAR = {
    spear: { name: 'Spear', icon: 'spear', blurb: 'Kills fish. The main event.', tiers: [
      { name: 'Sharp Stick',     cost: 0,    dmg: 1, speed: 230, reload: 0.50, assist: 16, blurb: 'It is a stick. It is sharp.' },
      { name: 'Bone Spear',      cost: 140,  dmg: 2, speed: 270, reload: 0.44, assist: 18, blurb: 'Someone else\'s bone.' },
      { name: 'Bronze Trident',  cost: 620,  dmg: 3, speed: 310, reload: 0.38, assist: 21, blurb: 'Three points, triple the smug.' },
      { name: 'Atlantean Lance', cost: 2400, dmg: 5, speed: 360, reload: 0.31, assist: 25, blurb: 'Hums when a fish is near. Homing-ish.' },
      { name: 'Void Fork',       cost: 9000, dmg: 8, speed: 430, reload: 0.24, assist: 32, pierce: true, blurb: 'Pierces fish AND the concept of fish.' }
    ]},
    net: { name: 'Net', icon: 'netring', blurb: 'Catches fish ALIVE - worth more, better EXP.', tiers: [
      { name: 'Old Sock',        cost: 0,    radius: 21, live: 0.35, reload: 0.85, blurb: 'Holds one fish and a lot of shame.' },
      { name: 'Kelp Net',        cost: 180,  radius: 27, live: 0.55, reload: 0.76, blurb: 'Woven by a guy named Doug.' },
      { name: 'Wide Net',        cost: 700,  radius: 34, live: 0.72, reload: 0.66, blurb: 'Wide. Netty.' },
      { name: 'Vortex Net',      cost: 2900, radius: 43, live: 0.88, reload: 0.54, pull: 70, blurb: 'Sucks fish in. They hate it.' },
      { name: 'Singularity Sock',cost: 11000,radius: 56, live: 1.00, reload: 0.42, pull: 130, blurb: 'A sock, but cosmic.' }
    ]},
    fins: { name: 'Fins', icon: 'bolt', blurb: 'Swim speed and dash power.', tiers: [
      { name: 'Bare Feet',       cost: 0,    thrust: 1.00, dash: 1.00, blurb: 'Free. Feels illegal.' },
      { name: 'Rubber Fins',     cost: 120,  thrust: 1.18, dash: 1.10, blurb: 'Squeaky but effective.' },
      { name: 'Turbo Fins',      cost: 560,  thrust: 1.38, dash: 1.28, blurb: 'Slight risk of takeoff.' },
      { name: 'Hydro Jets',      cost: 2200, thrust: 1.62, dash: 1.55, blurb: 'Actual jets. On your feet.' },
      { name: 'Poseidon Boots',  cost: 8600, thrust: 1.95, dash: 1.9,  blurb: 'The sea moves for you.' }
    ]},
    tank: { name: 'Air Tank', icon: 'heart', blurb: 'How long you can stay down.', tiers: [
      { name: 'Big Lungs',       cost: 0,    air: 46,  blurb: 'You just hold your breath. Bold.' },
      { name: 'Dented Tank',     cost: 150,  air: 66,  blurb: 'Hisses. Probably fine.' },
      { name: 'Proper Tank',     cost: 640,  air: 92,  blurb: 'Certified by nobody.' },
      { name: 'Twin Tanks',      cost: 2500, air: 128, blurb: 'Twice the tank, twice the tank.' },
      { name: 'Gill Grafts',     cost: 9400, air: 180, blurb: 'You are basically a fish now. Legally unclear.' }
    ]},
    bag: { name: 'Fish Bag', icon: 'bucket', blurb: 'How many fish you can haul per dive.', tiers: [
      { name: 'Pockets',         cost: 0,    cap: 12,  blurb: 'Wet pockets.' },
      { name: 'Bucket',          cost: 100,  cap: 22,  blurb: 'Classic.' },
      { name: 'Kelp Crate',      cost: 480,  cap: 38,  blurb: 'Smells like commitment.' },
      { name: 'Trawler Sack',    cost: 1900, cap: 60,  blurb: 'Industrial. Slightly evil.' },
      { name: 'Bag of Holding',  cost: 7800, cap: 120, blurb: 'Do not look inside.' }
    ]}
  };

  /* ---------------- CONSUMABLES ---------------- */
  const USE = [
    { id: 'sonar', name: 'Sonar Ping', cost: 70, sprite: 'exporb', col: '#7ff0ff',
      blurb: 'Next dive: rare fish are 3x more likely. Loud.' },
    { id: 'fizz', name: 'Fizzy Kelp Cola', cost: 45, sprite: 'kelpbulb', col: '#c8ff4a',
      blurb: 'Next dive: +30% air and slightly jittery.' },
    { id: 'clover', name: 'Lucky Clam', cost: 110, sprite: 'clam_shell', col: '#ff9ed2',
      blurb: 'Next race: your dolphin gets +8 LUCK.' },
    { id: 'whistle', name: 'Rally Whistle', cost: 150, sprite: 'star', col: '#ffd24a',
      blurb: 'Next race: infinite surge for the first 3 seconds.' }
  ];

  const foodById = {}; FOOD.forEach((f) => (foodById[f.id] = f));
  const useById = {}; USE.forEach((u) => (useById[u.id] = u));

  function gearTier(kind, lvl) {
    const g = GEAR[kind];
    return g.tiers[DZ.Util.clamp(lvl, 0, g.tiers.length - 1)];
  }
  function gearNext(kind, lvl) {
    const g = GEAR[kind];
    return lvl + 1 < g.tiers.length ? g.tiers[lvl + 1] : null;
  }
  return { FOOD, GEAR, USE, foodById, useById, gearTier, gearNext };
})();
