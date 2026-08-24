/* ============================================================
   areas.js - the side-scrolling world. Outdoor areas are open
   water with a walkable seabed; interiors are air-filled rooms
   you enter through a door.
   ============================================================ */
KA.Areas = (function () {
  const U = KA.U;

  /* seabed profile: deterministic sum of sines per area */
  function floorFn(seed, base, amp) {
    return (x) => base
      + Math.sin((x + seed * 130) * 0.0042) * amp
      + Math.sin((x + seed * 57) * 0.011) * amp * 0.45
      + Math.sin((x + seed * 311) * 0.027) * amp * 0.18;
  }

  const AREAS = {
    /* ---------------- outdoor ---------------- */
    home: {
      name: 'Home Shallows', w: 1250, seed: 1, sky: 96, base: 300, amp: 12,
      theme: { top: '#5fc8e8', mid: '#2f93c4', bot: '#0d4f74', sand: '#f0dfb0', sand2: '#c9ab72' },
      surface: true, warm: 1,
      exits: { right: 'village' },
      doors: [{ x: 300, w: 84, interior: 'shack', label: 'YOUR SHACK' }],
      npcs: [{ id: 'gull', x: 640 }],
      spots: [{ x: 980, table: ['shrimp', 'clam', 'sardine'] }],
      enemies: [],
      props: 'reef'
    },
    village: {
      name: 'Coral Village', w: 2150, seed: 2, sky: 88, base: 302, amp: 8,
      theme: { top: '#66d0ea', mid: '#2f9ac9', bot: '#0e5479', sand: '#f4e4bc', sand2: '#cfae76' },
      surface: true, warm: 1, village: true,
      exits: { left: 'home', right: 'meadow' },
      doors: [
        { x: 320,  w: 96, interior: 'bait',   label: 'BAIT & TACKLE' },
        { x: 700,  w: 104, interior: 'hall',  label: 'THE FOAMY KEG' },
        { x: 1120, w: 104, interior: 'stable',label: 'STABLE' },
        { x: 1520, w: 96, interior: 'armoury',label: 'ARMOURY' },
        { x: 1900, w: 96, interior: 'bookie', label: 'RACE OFFICE' }
      ],
      npcs: [{ id: 'fence', x: 2160 }, { id: 'kid', x: 520 }, { id: 'guard', x: 1730 }],
      spots: [{ x: 2280, table: ['sardine', 'mackerel', 'clam'] }],
      enemies: [],
      props: 'town'
    },
    meadow: {
      name: 'Seahorse Meadow', w: 1850, seed: 3, sky: 80, base: 296, amp: 18,
      theme: { top: '#4fc39a', mid: '#1f8f7a', bot: '#06432f', sand: '#e6dfa8', sand2: '#b8a866' },
      surface: true, warm: 0.8,
      exits: { left: 'village', right: 'flats' },
      doors: [],
      npcs: [{ id: 'kelpy', x: 900 }],
      spots: [{ x: 520, table: ['sardine', 'mackerel', 'shrimp'] }, { x: 1650, table: ['mackerel', 'squid', 'krill'] }],
      enemies: [{ kind: 'crawler', n: 4 }],
      props: 'kelp'
    },
    flats: {
      name: 'Crab Flats', w: 1900, seed: 4, sky: 64, base: 300, amp: 10,
      theme: { top: '#3f9fc4', mid: '#1d6d94', bot: '#08324a', sand: '#e0cfa0', sand2: '#a89468' },
      surface: false, warm: 0.6,
      exits: { left: 'meadow', right: 'colonnade' },
      doors: [],
      npcs: [{ id: 'hermit', x: 1400 }],
      spots: [{ x: 700, table: ['clam', 'squid', 'grouper'] }],
      enemies: [{ kind: 'snapper', n: 4 }, { kind: 'bandit', n: 2 }],
      props: 'flats'
    },
    colonnade: {
      name: 'Sunken Colonnade', w: 2050, seed: 5, sky: 40, base: 298, amp: 14,
      theme: { top: '#2f6ea8', mid: '#173f6e', bot: '#050f28', sand: '#c8cfda', sand2: '#8f97a6' },
      surface: false, warm: 0.35,
      exits: { left: 'flats', right: 'trench' },
      doors: [],
      npcs: [{ id: 'scholar', x: 1200 }],
      spots: [{ x: 1900, table: ['grouper', 'tunafish', 'goldfish'] }],
      enemies: [{ kind: 'snapper', n: 3 }, { kind: 'shark', n: 3 }],
      props: 'ruins'
    },
    trench: {
      name: 'The Beer Trench', w: 2200, seed: 6, sky: 20, base: 302, amp: 20,
      theme: { top: '#1b2b4a', mid: '#0d1730', bot: '#020510', sand: '#3a3450', sand2: '#221f33' },
      surface: false, warm: 0.1, dark: 0.5,
      exits: { left: 'colonnade', right: 'throne' },
      doors: [],
      npcs: [{ id: 'dealer', x: 1500 }],
      spots: [{ x: 2200, table: ['void', 'goldfish', 'tunafish'] }],
      enemies: [{ kind: 'bandit', n: 5 }, { kind: 'horror', n: 3 }],
      props: 'trench'
    },
    throne: {
      name: 'Throne of Atlantic', w: 1500, seed: 7, sky: 30, base: 300, amp: 4,
      theme: { top: '#3a2b5c', mid: '#1d1436', bot: '#08040f', sand: '#c9a26a', sand2: '#8a6a3c' },
      surface: false, warm: 0.2, dark: 0.35, boss: true,
      exits: { left: 'trench' },
      doors: [],
      npcs: [],
      spots: [],
      enemies: [],
      props: 'throne',
      gate: { frags: 4, why: 'The doors are sealed. Four crown fragments, then he will see you.' }
    },

    /* ---------------- interiors ---------------- */
    shack: {
      name: 'Your Shack', indoor: true, w: 520, floorY: 268, roomTop: 60,
      wall: '#3a5a6e', wall2: '#22404f', floor: '#6b4a2e', floor2: '#4a3220',
      exitDoor: { x: 60, back: 'home' },
      decor: 'shack',
      npcs: []
    },
    bait: {
      name: 'Bait & Tackle', indoor: true, w: 560, floorY: 268, roomTop: 56,
      wall: '#2f5d5a', wall2: '#1c3f3d', floor: '#7a5a34', floor2: '#523a20',
      exitDoor: { x: 60, back: 'village' },
      decor: 'bait', shop: 'bait',
      npcs: [{ id: 'tackler', x: 380 }]
    },
    hall: {
      name: 'The Foamy Keg', indoor: true, w: 620, floorY: 270, roomTop: 52,
      wall: '#5a3a26', wall2: '#3a2416', floor: '#8a5f30', floor2: '#5e3f1e',
      exitDoor: { x: 60, back: 'village' },
      decor: 'hall', shop: 'beer',
      npcs: [{ id: 'princess', x: 430 }, { id: 'drunk', x: 250 }]
    },
    stable: {
      name: 'The Stable', indoor: true, w: 640, floorY: 272, roomTop: 50,
      wall: '#2f4f6e', wall2: '#1b334a', floor: '#6f7f5a', floor2: '#4a5a3a',
      exitDoor: { x: 60, back: 'village' },
      decor: 'stable', shop: 'stable',
      npcs: [{ id: 'stabler', x: 420 }]
    },
    armoury: {
      name: 'The Armoury', indoor: true, w: 560, floorY: 268, roomTop: 56,
      wall: '#4a3f5a', wall2: '#2e2738', floor: '#5a5a66', floor2: '#3a3a44',
      exitDoor: { x: 60, back: 'village' },
      decor: 'armoury', shop: 'weapons',
      npcs: [{ id: 'smith', x: 390 }]
    },
    bookie: {
      name: 'Race Office', indoor: true, w: 560, floorY: 268, roomTop: 56,
      wall: '#3f2f5a', wall2: '#251b38', floor: '#7a6a3a', floor2: '#524626',
      exitDoor: { x: 60, back: 'village' },
      decor: 'bookie', shop: 'race',
      npcs: [{ id: 'bookie', x: 380 }]
    }
  };

  /* attach a floor function to each outdoor area */
  for (const k in AREAS) {
    const a = AREAS[k];
    a.id = k;
    if (!a.indoor) a.floorAt = floorFn(a.seed, a.base, a.amp);
    else a.floorAt = () => a.floorY;
  }

  const ORDER = ['home', 'village', 'meadow', 'flats', 'colonnade', 'trench', 'throne'];

  /* seeded decorative props so every area looks hand-placed but costs nothing */
  function props(area) {
    if (area.indoor) return [];
    const out = [];
    let s = area.seed * 977;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const kinds = {
      reef:   ['coral', 'coral', 'fan', 'anemone', 'rock', 'star', 'urchin', 'shell'],
      town:   ['coral', 'fan', 'lamp', 'crate', 'rock', 'anemone', 'shell', 'sign'],
      kelp:   ['kelp', 'kelp', 'kelp', 'anemone', 'rock', 'fan', 'shell'],
      flats:  ['rock', 'rock', 'urchin', 'shell', 'coral', 'bones'],
      ruins:  ['pillar', 'pillar', 'rubble', 'statue', 'coral', 'urn', 'rock'],
      trench: ['vent', 'rock', 'bones', 'urchin', 'glowpod', 'glowpod'],
      throne: ['pillar', 'urn', 'brazier', 'brazier', 'rubble']
    }[area.props] || ['rock'];
    const n = Math.round(area.w / 78);
    const blocked = (x) => {
      if (x < 60 || x > area.w - 60) return true;
      for (const d of (area.doors || [])) if (Math.abs(x - d.x) < d.w * 0.75 + 22) return true;
      for (const sp of (area.spots || [])) if (Math.abs(x - sp.x) < 46) return true;
      for (const nn of (area.npcs || [])) if (Math.abs(x - nn.x) < 30) return true;
      return false;
    };
    for (let i = 0; i < n; i++) {
      let x = 40 + rnd() * (area.w - 80), guard = 0;
      while (blocked(x) && guard++ < 8) x = 40 + rnd() * (area.w - 80);
      if (blocked(x)) continue;
      out.push({ x, kind: kinds[Math.floor(rnd() * kinds.length)], s: 0.7 + rnd() * 0.9,
                 ph: rnd() * 9, back: rnd() < 0.45 });
    }
    // background silhouettes
    const bg = [];
    for (let i = 0; i < Math.round(area.w / 200); i++) {
      bg.push({ x: rnd() * area.w, kind: area.props === 'ruins' || area.props === 'throne' ? 'pillar' : 'mound',
                s: 1 + rnd() * 2, z: 0.35 + rnd() * 0.3 });
    }
    return { fore: out, back: bg };
  }

  /* ambient sea life that just swims around being beautiful */
  function ambient(area) {
    if (area.indoor) return [];
    const out = [];
    let s = area.seed * 613;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const pool = area.props === 'trench' ? ['jelly', 'jelly', 'lantern']
      : area.props === 'ruins' ? ['fish', 'fish', 'jelly', 'ray']
      : area.props === 'kelp' ? ['seahorse', 'seahorse', 'fish', 'fish', 'turtle']
      : area.props === 'flats' ? ['fish', 'crabby', 'ray']
      : ['fish', 'fish', 'fish', 'seahorse', 'jelly', 'turtle', 'ray'];
    const n = Math.round(area.w / 62) + 6;
    for (let i = 0; i < n; i++) {
      out.push({ kind: pool[Math.floor(rnd() * pool.length)], x: rnd() * area.w,
                 y: 56 + rnd() * 218, v: 8 + rnd() * 30, dir: rnd() < 0.5 ? -1 : 1,
                 ph: rnd() * 9, s: 0.6 + rnd() * 0.8, hue: rnd() });
    }
    // a shark cruising the deep areas, harmless scenery
    if (['ruins', 'flats', 'trench'].includes(area.props)) {
      out.push({ kind: 'shark', x: rnd() * area.w, y: 110 + rnd() * 60, v: 22, dir: 1, ph: 0, s: 1.3, hue: 0 });
    }
    return out;
  }

  return { AREAS, ORDER, props, ambient };
})();
