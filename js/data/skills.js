/* ============================================================
   skills.js - per-dolphin skill tree (4 branches x 6 tiers)
   plus the race abilities the nodes unlock.
   ============================================================ */
DZ.Skills = (function () {
  const BRANCH = [
    { id: 'speed', name: 'CURRENT',  col: '#7ff0ff', blurb: 'Go fast. Regret nothing.' },
    { id: 'brawn', name: 'BLUBBER',  col: '#ffb347', blurb: 'Endure. Also shove.' },
    { id: 'flair', name: 'FLAIR',    col: '#ff9ed2', blurb: 'Charm, luck and showbiz.' },
    { id: 'abyss', name: 'ABYSS',    col: '#a86bff', blurb: 'Evil only. Obviously.' }
  ];

  function N(o) { return Object.assign({ cost: 1, req: [], mods: {}, ability: null }, o); }
  const NODES = [
    /* ---- CURRENT ---- */
    N({ id: 'zoom',  b: 0, row: 0, name: 'Zoomies',      cost: 1, mods: { speed: 3 }, blurb: '+3 SPD. Vibrates constantly.' }),
    N({ id: 'slip',  b: 0, row: 1, name: 'Slipstream',   cost: 1, req: ['zoom'], mods: { speed: 2, agility: 2 }, blurb: '+2 SPD, +2 AGI. Drafts off rivals.' }),
    N({ id: 'torp',  b: 0, row: 2, name: 'Torpedo',      cost: 2, req: ['slip'], ability: 'torpedo', mods: { burst: 2 }, blurb: 'ABILITY: violent forward burst.' }),
    N({ id: 'hydro', b: 0, row: 3, name: 'Hydroform', cost: 2, req: ['torp'], mods: { speed: 4 }, blurb: '+4 SPD. Water gets out of the way.' }),
    N({ id: 'after', b: 0, row: 4, name: 'Afterburner',  cost: 3, req: ['hydro'], mods: { stamina: 2 }, passive: 'cheapSurge', blurb: 'Surging costs 35% less stamina.' }),
    N({ id: 'mach',  b: 0, row: 5, name: 'Mach Fin', cost: 4, req: ['after'], mods: { speed: 6, burst: 3 }, blurb: '+6 SPD, +3 BRST. Breaks the sound barrier. Underwater.' }),

    /* ---- BLUBBER ---- */
    N({ id: 'chonk', b: 1, row: 0, name: 'Chonk',        cost: 1, mods: { stamina: 3 }, blurb: '+3 STA. Density is a strategy.' }),
    N({ id: 'blub',  b: 1, row: 1, name: 'Blubber', cost: 1, req: ['chonk'], mods: { stamina: 2 }, passive: 'sturdy', blurb: '+2 STA. Shrugs off shoves.' }),
    N({ id: 'slap',  b: 1, row: 2, name: 'Tail Slap',    cost: 2, req: ['blub'], ability: 'tailslap', blurb: 'ABILITY: smack a nearby rival backwards.' }),
    N({ id: 'wind',  b: 1, row: 3, name: 'Second Wind',  cost: 2, req: ['slap'], passive: 'secondWind', mods: { stamina: 2 }, blurb: 'Refills stamina once at halfway.' }),
    N({ id: 'beak',  b: 1, row: 4, name: 'Beak Ram', cost: 3, req: ['wind'], mods: { burst: 2 }, passive: 'ram', blurb: 'Bumping rivals slows THEM instead.' }),
    N({ id: 'lungs', b: 1, row: 5, name: 'Whale Lungs',  cost: 4, req: ['beak'], mods: { stamina: 6, speed: 1 }, blurb: '+6 STA. Lungs of unusual size.' }),

    /* ---- FLAIR ---- */
    N({ id: 'charm', b: 2, row: 0, name: 'Charmer',      cost: 1, mods: { charm: 3 }, blurb: '+3 CHM. Better odds, worse payouts.' }),
    N({ id: 'ring',  b: 2, row: 1, name: 'Bubble Ring',  cost: 1, req: ['charm'], ability: 'bubblering', blurb: 'ABILITY: ride your own bubble. Speed up.' }),
    N({ id: 'sonar', b: 2, row: 2, name: 'Sonar Yell', cost: 2, req: ['ring'], ability: 'sonar', blurb: 'ABILITY: deafen everyone ahead of you.' }),
    N({ id: 'lucky', b: 2, row: 3, name: 'Lucky Fins',   cost: 2, req: ['sonar'], mods: { luck: 4 }, blurb: '+4 LCK. Finds coins mid-race.' }),
    N({ id: 'show',  b: 2, row: 4, name: 'Showboat',     cost: 3, req: ['lucky'], mods: { charm: 2 }, passive: 'showboat', blurb: '+25% race winnings. Insufferable.' }),
    N({ id: 'flip',  b: 2, row: 5, name: 'Backflip',     cost: 4, req: ['show'], mods: { charm: 4, agility: 3 }, passive: 'hype', blurb: 'Crowd hype: +40% winnings, +3 AGI feel.' }),

    /* ---- ABYSS (evil only) ---- */
    N({ id: 'dark',  b: 3, row: 0, name: 'Dark Tide',    cost: 2, evil: true, ability: 'darktide', blurb: 'ABILITY: steal speed from the leader.' }),
    N({ id: 'grip',  b: 3, row: 1, name: 'Kraken Grip',  cost: 2, evil: true, req: ['dark'], ability: 'grip', blurb: 'ABILITY: yank a rival back. Illegal-ish.' }),
    N({ id: 'surge', b: 3, row: 2, name: 'Void Surge',   cost: 3, evil: true, req: ['grip'], mods: { speed: 5, burst: 5 }, blurb: '+5 SPD, +5 BRST. Smells of ozone.' }),
    N({ id: 'chaos', b: 3, row: 3, name: 'Chaos Aura',   cost: 3, evil: true, req: ['surge'], passive: 'chaos', blurb: 'Rivals randomly panic near you.' }),
    N({ id: 'fuel',  b: 3, row: 4, name: 'Nightmare', cost: 4, evil: true, req: ['chaos'], mods: { stamina: 6, speed: 4 }, blurb: '+6 STA, +4 SPD. Sleep is for prey.' }),
    N({ id: 'bane',  b: 3, row: 5, name: 'Sea Bane', cost: 5, evil: true, req: ['fuel'], ability: 'bane', blurb: 'ABILITY: the ocean itself betrays your rivals.' })
  ];

  const byId = {}; NODES.forEach((n) => (byId[n.id] = n));

  /* ---------------- ABILITIES (used by the race) ---------------- */
  const ABILITIES = {
    torpedo:    { name: 'Torpedo',    icon: 'bolt',   cool: 9,  col: '#7ff0ff', sfx: 'dash',  blurb: 'Big forward burst.' },
    tailslap:   { name: 'Tail Slap',  icon: 'heart',  cool: 8,  col: '#ffb347', sfx: 'slap',  blurb: 'Shove the nearest rival.' },
    bubblering: { name: 'Bubble Ring',icon: 'exporb', cool: 7,  col: '#ff9ed2', sfx: 'pop',   blurb: 'Ride a bubble: +speed for 3s.' },
    sonar:      { name: 'Sonar Scream',cool: 11, icon: 'star',  col: '#7ff0ff', sfx: 'sonar', blurb: 'Slow every rival ahead of you.' },
    darktide:   { name: 'Dark Tide',  icon: 'skull',  cool: 10, col: '#a86bff', sfx: 'evil',  blurb: 'Steal the leader\'s speed.' },
    grip:       { name: 'Kraken Grip',icon: 'skull',  cool: 12, col: '#a86bff', sfx: 'thud',  blurb: 'Yank a rival backwards.' },
    bane:       { name: 'Poseidon\'s Bane', icon: 'trophy', cool: 20, col: '#ff6f6f', sfx: 'evil', blurb: 'Slow the entire field. Hard.' }
  };

  function nodesFor(branch) { return NODES.filter((n) => n.b === branch).sort((a, b) => a.row - b.row); }
  function canBuy(dolphin, node) {
    if (dolphin.skills[node.id]) return { ok: false, why: 'Already learned.' };
    if (node.evil && !dolphin.evil) return { ok: false, why: 'Requires an EVIL dolphin.' };
    for (const r of node.req) if (!dolphin.skills[r]) return { ok: false, why: 'Needs ' + byId[r].name + '.' };
    if (dolphin.sp < node.cost) return { ok: false, why: 'Needs ' + node.cost + ' skill points.' };
    return { ok: true };
  }
  return { BRANCH, NODES, byId, ABILITIES, nodesFor, canBuy };
})();
