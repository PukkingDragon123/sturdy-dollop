/* ============================================================
   species.js - the fish. Every entry recolours a shared sprite,
   which is why there are lots of them and zero art files.
   behaviour: school | wander | skittish | chase | bottom | drift
   ============================================================ */
DZ.ZONES = [
  { id: 0, name: 'Sunny Shallows',   short: 'Shallows',   top: '#3fb0e0', bot: '#0d5f8c', need: 0,  dark: 0.00, blurb: 'Warm, bright, full of idiots.' },
  { id: 1, name: 'Kelp Forest',      short: 'Kelp',       top: '#1e8f7a', bot: '#06412f', need: 1,  dark: 0.12, blurb: 'Something is watching. It is kelp.' },
  { id: 2, name: 'Sunken Colonnade', short: 'Colonnade',  top: '#2b6ea8', bot: '#0a1f42', need: 2,  dark: 0.28, blurb: 'Actual Atlantis. Mind the pillars.' },
  { id: 3, name: 'The Abyss',        short: 'Abyss',      top: '#1b2350', bot: '#04060f', need: 3,  dark: 0.52, blurb: 'Do not make eye contact.' }
];

DZ.Species = (function () {
  function S(o) { return Object.assign({ hp: 1, speed: 30, value: 5, exp: 4, scale: 1, weight: 10, behavior: 'wander', flags: {} }, o); }
  const list = [
    /* ---- zone 0: Sunny Shallows ---- */
    S({ id: 'guppy', name: 'Guppy', sprite: 'fish_s', zone: 0, weight: 30, behavior: 'school',
        pal: { '1': '#ffb347', '2': '#c97f1c', '3': '#ffe0a8' }, hp: 1, speed: 34, value: 4, exp: 3,
        blurb: 'Numerous. Delicious. Dumb.' }),
    S({ id: 'sardine', name: 'Sardine', sprite: 'fish_s', zone: 0, weight: 26, behavior: 'school',
        pal: { '1': '#b8cfdd', '2': '#7f9bab', '3': '#eef7ff' }, hp: 1, speed: 42, value: 6, exp: 4,
        blurb: 'Comes in tins. And here.' }),
    S({ id: 'clown', name: 'Clownfish', sprite: 'fish_m', zone: 0, weight: 16, behavior: 'skittish',
        pal: { '1': '#ff8a2b', '2': '#d1520e', '3': '#fff3e0' }, hp: 2, speed: 46, value: 12, exp: 7,
        blurb: 'Tells jokes. They are bad.' }),
    S({ id: 'crab', name: 'Snippy Crab', sprite: 'crab', zone: 0, weight: 14, behavior: 'bottom',
        pal: { '1': '#ff6f6f', '2': '#a83232', '3': '#ffd6d6' }, hp: 3, speed: 22, value: 16, exp: 9,
        flags: { armored: true, aggressive: true }, blurb: 'Armoured. Grumpy. Sideways.' }),
    S({ id: 'prawn', name: 'King Prawn', sprite: 'prawn', zone: 0, weight: 9, behavior: 'bottom',
        pal: { '1': '#ffc2a8', '2': '#d1704e', '3': '#fff0e8' }, hp: 2, speed: 30, value: 22, exp: 8,
        blurb: 'Royalty. Tastes like it.' }),

    /* ---- zone 1: Kelp Forest ---- */
    S({ id: 'perch', name: 'Kelp Perch', sprite: 'fish_m', zone: 1, weight: 24, behavior: 'school',
        pal: { '1': '#7fc46a', '2': '#4a8f3c', '3': '#e0ffd6' }, hp: 2, speed: 44, value: 18, exp: 11,
        blurb: 'Smells strongly of salad.' }),
    S({ id: 'zap', name: 'Neon Zapfish', sprite: 'fish_s', zone: 1, weight: 15, behavior: 'skittish',
        pal: { '1': '#7ff0ff', '2': '#2f9fc4', '3': '#ffffff' }, hp: 1, speed: 78, value: 30, exp: 18,
        flags: { glow: '#7ff0ff', shock: true }, blurb: 'Zaps you a bit. Rude but tasty.' }),
    S({ id: 'puffer', name: 'Grumpuffer', sprite: 'puffer', zone: 1, weight: 13, behavior: 'chase',
        pal: { '1': '#c8ff4a', '2': '#7f9f1c', '3': '#f2ffd0' }, hp: 3, speed: 30, value: 34, exp: 22,
        flags: { aggressive: true, spiky: true }, blurb: 'Inflates when insulted. Always inflated.' }),
    S({ id: 'squid', name: 'Squiddo', sprite: 'squid', zone: 1, weight: 12, behavior: 'skittish',
        pal: { '1': '#ff9ed2', '2': '#c94f7c', '3': '#ffd6ea' }, hp: 2, speed: 66, value: 38, exp: 20,
        flags: { inky: true }, blurb: 'Squirts ink at your goggles.' }),
    S({ id: 'jelly', name: 'Wobble Jelly', sprite: 'jelly', zone: 1, weight: 11, behavior: 'drift',
        pal: { '1': '#c9b6ff', '2': '#8f6fd8', '3': '#f0e8ff' }, hp: 2, speed: 14, value: 44, exp: 16,
        flags: { stings: true, glow: '#c9b6ff' }, blurb: 'Touch it and regret everything.' }),

    /* ---- zone 2: Sunken Colonnade ---- */
    S({ id: 'snapper', name: 'Marble Snapper', sprite: 'fish_long', zone: 2, weight: 22, behavior: 'wander',
        pal: { '1': '#dfe8f0', '2': '#8fa6b5', '3': '#ffffff' }, hp: 4, speed: 56, value: 46, exp: 26,
        blurb: 'Chipped from an ancient statue. Alive though.' }),
    S({ id: 'eel', name: 'Ruin Eel', sprite: 'eel', zone: 2, weight: 14, behavior: 'chase',
        pal: { '1': '#6fd8a0', '2': '#2f8f66', '3': '#d0ffe8' }, hp: 5, speed: 52, value: 62, exp: 34,
        flags: { aggressive: true }, blurb: 'Lives in a vase. Hates that.' }),
    S({ id: 'statcrab', name: 'Statue Crab', sprite: 'crab', zone: 2, weight: 12, behavior: 'bottom',
        pal: { '1': '#9fb4c4', '2': '#5d7484', '3': '#e6f2fa' }, hp: 7, speed: 24, value: 70, exp: 40,
        flags: { armored: true, aggressive: true }, blurb: 'Pretends to be masonry. Fools nobody.' }),
    S({ id: 'tuna', name: 'Golden Tuna', sprite: 'fish_long', zone: 2, weight: 5, behavior: 'skittish',
        pal: { '1': '#ffd24a', '2': '#c98f1c', '3': '#fff3bf' }, hp: 4, speed: 96, value: 165, exp: 70,
        flags: { rare: true, glow: '#ffd24a' }, blurb: 'Worth more than your ranch. Knows it.' }),

    /* ---- zone 3: The Abyss ---- */
    S({ id: 'lantern', name: 'Lanternfish', sprite: 'fish_round', zone: 3, weight: 20, behavior: 'wander',
        pal: { '1': '#3a4f8f', '2': '#1b2350', '3': '#7ff0ff' }, hp: 5, speed: 48, value: 88, exp: 48,
        flags: { glow: '#9fe8ff' }, blurb: 'Its own nightlight. Cozy. Doomed.' }),
    S({ id: 'grouper', name: 'Void Grouper', sprite: 'fish_round', zone: 3, weight: 8, behavior: 'chase',
        pal: { '1': '#5d2b9a', '2': '#2b1046', '3': '#a86bff' }, hp: 9, speed: 44, value: 210, exp: 96,
        flags: { aggressive: true, rare: true, glow: '#a86bff' }, blurb: 'Mostly mouth. All attitude.' }),
    S({ id: 'cursed', name: 'Cursed Eel', sprite: 'eel', zone: 3, weight: 13, behavior: 'chase',
        pal: { '1': '#a86bff', '2': '#3b1466', '3': '#e0c2ff' }, hp: 6, speed: 60, value: 120, exp: 60,
        flags: { aggressive: true, cursed: true, glow: '#a86bff' }, blurb: 'Whispers. Feed it to a dolphin, see what happens.' }),
    S({ id: 'kraklet', name: 'Kraken Squidling', sprite: 'squid', zone: 3, weight: 7, behavior: 'chase',
        pal: { '1': '#c53a3a', '2': '#5e1414', '3': '#ffb0b0' }, hp: 8, speed: 70, value: 190, exp: 90,
        flags: { aggressive: true, inky: true, cursed: true }, blurb: 'Baby. Still ends careers.' }),
    S({ id: 'nightjelly', name: 'Nightmare Jelly', sprite: 'jelly', zone: 3, weight: 9, behavior: 'drift',
        pal: { '1': '#2b1046', '2': '#a86bff', '3': '#ff9ed2' }, hp: 6, speed: 16, value: 150, exp: 66,
        flags: { stings: true, cursed: true, glow: '#ff9ed2' }, blurb: 'Glows in a colour that should not exist.' })
  ];

  const byId = {};
  for (const s of list) byId[s.id] = s;

  function forZone(z) { return list.filter((s) => s.zone === z); }
  function get(id) { return byId[id]; }
  function rollFor(zone, sonarLuck) {
    const pool = forZone(zone);
    return DZ.Util.pickWeighted(pool, (s) => s.weight * (s.flags.rare ? 1 + (sonarLuck || 0) * 2 : 1));
  }
  // sale price with market drift + stall level
  function price(sp, mult) { return Math.max(1, Math.round(sp.value * (mult === undefined ? 1 : mult))); }

  return { list, byId, forZone, get, rollFor, price };
})();
