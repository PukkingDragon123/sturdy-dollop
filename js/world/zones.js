/* ============================================================
   world/zones.js - the map is one tile grid divided into named
   horizontal regions, each with its own look, spawn table and
   rules. This is what turns "a big cave" into "places".
   ============================================================ */
KD.Zones = (function () {
  /* x is in tiles. The whole world is 2600 wide. */
  const Z = [
    { id: 'mine',    name: 'The Old Mine',      x0: 0,    x1: 520,
      blurb: 'Where the village digs. Nobody has been to the bottom.',
      rock: 'stone', deep: 'dark', ore: 1.6, caves: 1.25, build: true,
      mobs: ['crawler', 'snapper', 'urchin', 'bandit'], music: 'mine' },
    { id: 'village', name: 'Fruitfall',         x0: 520,  x1: 900,
      blurb: 'Twelve hollowed fruit and everyone you owe money to.',
      rock: 'sand', deep: 'stone', ore: 0.2, caves: 0.35, safe: true,
      mobs: [], music: 'town' },
    { id: 'gate',    name: 'The Sea Gate',      x0: 900,  x1: 980,
      blurb: 'Shut since the new king took the throne.',
      rock: 'masonry', deep: 'stone', ore: 0.1, caves: 0.2, gate: true,
      mobs: ['crawler'], music: 'town' },
    { id: 'reef',    name: 'Shallow Reef',      x0: 980,  x1: 1480,
      blurb: 'Warm, loud with fish, and full of things that bite.',
      rock: 'sand', deep: 'stone', ore: 0.7, caves: 0.9, reef: 2.2,
      mobs: ['clown', 'parrot', 'mantis', 'urchin', 'snapper', 'jelly'], music: 'reef' },
    { id: 'kelp',    name: 'The Kelp Forest',   x0: 1480, x1: 1950,
      blurb: 'You cannot see far in here. Neither can they.',
      rock: 'mud', deep: 'stone', ore: 0.8, caves: 1.1, kelp: 3.0, dim: 3,
      mobs: ['moray', 'cuttle', 'jelly', 'shark', 'parrot'], music: 'kelp' },
    { id: 'ruins',   name: 'The Sunken City',   x0: 1950, x1: 2420,
      blurb: 'Somebody built all this. Nobody says who.',
      rock: 'masonry', deep: 'stone', ore: 1.0, caves: 0.8, ruins: 2.4,
      mobs: ['sentinel', 'bandit', 'lion', 'cuda', 'urchin'], music: 'ruins' },
    { id: 'blue',    name: 'The Open Blue',     x0: 2420, x1: 2830,
      blurb: 'No floor for a long way. Big things pass through.',
      rock: 'dark', deep: 'dark', ore: 0.9, caves: 1.6, open: true, big: true,
      mobs: ['manta', 'cuda', 'shark', 'jelly', 'horror'], music: 'blue' },
    { id: 'drop',    name: 'The Drop',          x0: 2830, x1: 3250,
      blurb: 'Down. Just down.',
      rock: 'rot', deep: 'rot', ore: 1.3, caves: 1.4, dim: 6, boss: 'king2',
      mobs: ['horror', 'manta', 'cuda', 'sentinel'], music: 'deep' }
  ];
  const byId = {};
  for (const z of Z) byId[z.id] = z;

  const at = (tx) => {
    for (const z of Z) if (tx >= z.x0 && tx < z.x1) return z;
    return Z[Z.length - 1];
  };
  const atPx = (px) => at((px / 8) | 0);
  /* how far into the zone, 0..1 - used to ramp difficulty across a zone */
  const progress = (tx) => {
    const z = at(tx);
    return (tx - z.x0) / (z.x1 - z.x0);
  };
  /* Widened from 2600. Once swimming had real momentum the old map was
     crossed in a couple of minutes, which is what "too small" meant. */
  const WORLD_W = 3250, WORLD_H = 460;
  return { Z, byId, at, atPx, progress, WORLD_W, WORLD_H };
})();
