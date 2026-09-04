/* ============================================================
   world/zones.js - the map is one tile grid divided into named
   horizontal regions, each with its own look, spawn table and
   rules. This is what turns "a big cave" into "places".
   ============================================================ */
KD.Zones = (function () {
  /* x is in tiles. The whole world is 2600 wide. */
  /* ================================================================
     THE MAP, rebuilt.

     It used to be seven thousand tiles of procedurally identical rock
     divided into eight bands, and the honest description of playing it
     was "a big cave with fish in it". You could swim for two minutes
     without passing anything you had not already seen, there was no
     reason to be at any particular one of those tiles, and there was
     nowhere to come back to.

     Three thousand tiles now, and it is shaped like a game rather than
     like a noise function. Left to right:

       THE COVE      home. A shack with a bed in it, a bin that pays
                     out overnight, a seed crate, and forty tiles of
                     seabed that are yours to cut up. Nothing in here
                     bites.
       FRUITFALL     the village, a short swim from your own door.
       THE OLD MINE  a headland with a shaft through it. Rock and ore.
       THE SEA GATE  shut until you have earned it.

     and then the four wild places, each one small enough that you can
     see both ends of it: the reef, the kelp forest, the sunken city,
     the open blue, and the Drop at the bottom of everything.

     Every day starts in the cove and ends there. That is the whole
     difference between this map and the last one.
     ================================================================ */
  const Z = [
    { id: 'cove',    name: 'Hollow Cove',       x0: 0, x1: 340,
      blurb: 'Your shack, your bed, and a patch of seabed nobody else wanted.',
      rock: 'sand', deep: 'stone', ore: 0.15, caves: 0.2, safe: true, home: true,
      mobs: [], music: 'town' },
    { id: 'village', name: 'Fruitfall',         x0: 340, x1: 800,
      blurb: 'Twelve hollowed fruit and everyone you owe money to.',
      rock: 'sand', deep: 'stone', ore: 0.2, caves: 0.35, safe: true, build: true,
      mobs: [], music: 'town' },
    { id: 'mine',    name: 'The Old Mine',      x0: 800, x1: 1010,
      blurb: 'Where the village digs. Nobody has been to the bottom.',
      rock: 'stone', deep: 'dark', ore: 1.8, caves: 1.3, build: true,
      mobs: ['crawler', 'snapper', 'urchin', 'bandit'], music: 'mine' },
    { id: 'gate',    name: 'The Sea Gate',      x0: 1010, x1: 1110,
      blurb: 'Shut since the new king took the throne.',
      rock: 'masonry', deep: 'stone', ore: 0.1, caves: 0.2, gate: true,
      mobs: ['crawler'], music: 'town' },
    { id: 'reef',    name: 'Shallow Reef',      x0: 1110, x1: 1620,
      blurb: 'Warm, loud with fish, and full of things that bite.',
      rock: 'sand', deep: 'stone', ore: 0.7, caves: 0.9, reef: 2.4,
      mobs: ['clown', 'parrot', 'mantis', 'urchin', 'snapper', 'jelly'], music: 'reef' },
    { id: 'kelp',    name: 'The Kelp Forest',   x0: 1620, x1: 2070,
      blurb: 'You cannot see far in here. Neither can they.',
      rock: 'mud', deep: 'stone', ore: 0.8, caves: 1.1, kelp: 3.2, dim: 3,
      mobs: ['moray', 'cuttle', 'jelly', 'shark', 'parrot'], music: 'kelp' },
    { id: 'ruins',   name: 'The Sunken City',   x0: 2070, x1: 2520,
      blurb: 'Somebody built all this. Nobody says who.',
      rock: 'masonry', deep: 'stone', ore: 1.0, caves: 0.8, ruins: 2.6,
      mobs: ['sentinel', 'bandit', 'lion', 'cuda', 'urchin'], music: 'ruins' },
    { id: 'blue',    name: 'The Open Blue',     x0: 2520, x1: 2790,
      blurb: 'No floor for a long way. Big things pass through.',
      rock: 'dark', deep: 'dark', ore: 0.9, caves: 1.6, open: true, big: true,
      mobs: ['manta', 'cuda', 'shark', 'jelly', 'horror'], music: 'blue' },
    { id: 'drop',    name: 'The Drop',          x0: 2790, x1: 3000,
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
  /* 2600 -> 3250 -> 4710 -> 7000 -> 3000 wide, and 460 -> 700 -> 900 -> 620
     deep. It went UP four times chasing "make the ocean bigger", and what
     came out the other end was a world nobody could read: two and a half
     million tiles of the same rock, and no reason to be at any particular
     one of them. Small enough to know beats big enough to get lost in. */
  const WORLD_W = 3000, WORLD_H = 620;

  /* ================================================================
     THE DEPTH TABLE, and it is the ONLY one.

     These numbers were copied by hand into five files - the layer
     table and the ore bands in world/gen.js, the sunlight falloff and
     the ambient floor in world/light.js, the water colour bands in
     world/parallax.js, and every mob's spawn range in sim/mobs.js.
     Twice now the world has been made deeper and only some of those
     copies moved, and both times the result was the same bug wearing
     a different hat: the reef ended up below the last of the daylight
     and painted in trench navy, and the whole game read as a cave.

     Everything derives from here now. If the ocean gets deeper again,
     this is the only place that changes.

     `d(u)` maps a fraction of the way down the ocean to a tile row, so
     a caller can say "sixty per cent of the way to the floor" and not
     care what the floor is this week.
     ================================================================ */
  const D = {
    sea:      30,          // the waterline
    shallows: 46,          // sand and light, where the village sits
    reef:     118,         // warm, loud, and the last of the daylight
    ruins:    208,         // somebody built here
    trench:   322,         // and here is where you need a lamp
    abyss:    462,         // and here is where you need the pressure gear
    floor:    610          // the bottom
  };
  const d = (u) => Math.round(D.sea + (D.floor - D.sea) * u);

  return { Z, byId, at, atPx, progress, WORLD_W, WORLD_H, D, d };
})();
