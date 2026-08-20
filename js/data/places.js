/* ============================================================
   places.js - the world map: where things are, who guards them,
   and what it takes to get in.
   ============================================================ */
DZ.Places = (function () {
  const U = DZ.Util;
  const W = 2600, H = 1500;

  /* gate.check(state) -> {ok:true} | {ok:false, why:'...', pay?:fn}
     Talking runs the check; passing it unlocks the place for good. */
  const LIST = [
    { id: 'ranch', name: 'Your Ranch', x: 700, y: 640, r: 78, art: 'ranch', scene: 'ranch',
      blurb: 'Home. Smells of fish and ambition.' },

    { id: 'shallows', name: 'Sunny Shallows', x: 1130, y: 300, r: 74, art: 'reefpatch', dive: 0,
      blurb: 'Warm, bright, full of idiots.' },

    { id: 'clamsdale', name: 'Clamsdale', x: 1560, y: 830, r: 76, art: 'town', scene: 'market',
      blurb: 'One street, four stalls, zero regulation.' },

    { id: 'kelp', name: 'Kelp Forest', x: 360, y: 540, r: 76, art: 'kelpwood', dive: 1,
      blurb: 'Something is watching. It is kelp.',
      npc: { kind: 'cultist', name: 'Kelpy Ken', col: '#40d492' },
      gate: {
        intro: ['Halt. This forest is SACRED.', 'Also I am not really allowed to stop you.',
                'Say the words: "the green one hungers".'],
        check: () => ({ ok: true }),
        pass: ['...beautiful. Go. Take fish. The kelp forgives.'],
        after: ['The kelp remembers you fondly.'] } },

    { id: 'downs', name: 'Puddle Downs', x: 2090, y: 760, r: 82, art: 'track', scene: 'racelobby',
      blurb: 'Dolphin racing. Legal on most days.',
      npc: { kind: 'bookie', name: 'Bookie Barry', col: '#ffd24a' },
      gate: {
        intro: ['Oi. New face.', 'You want in on the racing? Odds, bets, glory, debt?',
                'First one is free. After that I own a small piece of your soul.'],
        check: () => ({ ok: true }),
        pass: ['Beautiful. Bring a dolphin, bring clams, bring a bad decision.'],
        after: ['Back for more, eh? The book is open.'] } },

    { id: 'colonnade', name: 'Sunken Colonnade', x: 1950, y: 470, r: 78, art: 'ruins', dive: 2,
      blurb: 'Actual Atlantis. Mind the pillars.',
      npc: { kind: 'guard', name: 'Officer Barnacle', col: '#8fd8ff' },
      gate: {
        intro: ['HALT. This is a protected heritage site.',
                'You need a permit to spear anything in there.',
                'Permit is 400 clams. Or three Marble Snappers, because I am hungry.'],
        check: (S) => {
          const fish = (S.inv.fish.snapper || {}).n || 0;
          if (fish >= 3) return { ok: true, pay: () => DZ.State.takeFish('snapper', false, 3) || DZ.State.takeFish('snapper', true, 3), how: 'paid in snappers' };
          if (S.clams >= 400) return { ok: true, pay: () => DZ.State.spend(400), how: 'paid 400 clams' };
          return { ok: false, why: 'Come back with 400 clams or 3 Marble Snappers.' };
        },
        pass: ['...stamped. Do not touch the statues. They bite now, somehow.'],
        after: ['Permit is valid. Mind the pillars.'] } },

    { id: 'atlantis', name: 'Atlantis Proper', x: 1330, y: 195, r: 90, art: 'city', scene: 'questboard',
      blurb: 'The capital. Very shiny, very rude.',
      npc: { kind: 'noble', name: 'Lord Tidewick', col: '#ff9ed2' },
      gate: {
        intro: ['You wish to enter the CAPITAL? With that dolphin?',
                'The city only admits ranchers of proven quality.',
                'Bring me a dolphin of level 8 and we shall speak again.'],
        check: (S) => {
          const best = S.dolphins.reduce((a, d) => Math.max(a, DZ.Dolphin.level(d)), 0);
          return best >= 8 ? { ok: true, how: 'level ' + best + ' dolphin' }
                           : { ok: false, why: 'Your best is level ' + best + '. I require 8.' };
        },
        pass: ['Adequate! Enter. Try not to touch anything gold.'],
        after: ['The city tolerates you.'] } },

    { id: 'abyss', name: 'The Abyss', x: 2280, y: 1270, r: 86, art: 'chasm', dive: 3,
      blurb: 'Do not make eye contact.',
      npc: { kind: 'weirdo', name: 'The Damp Prophet', col: '#a86bff' },
      gate: {
        intro: ['down. down. it is very down.', 'you will need real lungs. metal ones.',
                'come back when you carry Twin Tanks or better.'],
        check: (S) => S.gear.tank >= 3 ? { ok: true, how: 'twin tanks' }
                                       : { ok: false, why: 'Buy Twin Tanks at the Gear Shed first.' },
        pass: ['good. good. it has been waiting. bring a snack.'],
        after: ['it knows your name now.'] } },

    { id: 'trench', name: 'Trench Bazaar', x: 2430, y: 1400, r: 74, art: 'bazaar', scene: 'vat',
      blurb: 'Where the evil dolphin business happens.',
      npc: { kind: 'guard', name: 'Sergeant Sludge', col: '#a86bff' },
      gate: {
        intro: ['This is a restricted area. Very restricted. Extremely restricted.',
                'Unless... you were to make a DONATION to the police social fund.',
                '1200 clams. For the fund. Which is my pocket.'],
        check: (S) => S.clams >= 1200 ? { ok: true, pay: () => DZ.State.spend(1200), how: 'donated 1200 clams' }
                                      : { ok: false, why: 'The fund requires 1200 clams. The fund is patient.' },
        pass: ['A pleasure doing corruption with you. Straight through.'],
        after: ['The fund thanks you for your continued support.'] } }
  ];

  const byId = {};
  LIST.forEach((p) => (byId[p.id] = p));

  function unlocked(S, id) {
    const p = byId[id];
    if (!p) return false;
    if (!p.gate) return true;
    return !!(S.unlocked && S.unlocked[id]);
  }
  function unlock(S, id) {
    S.unlocked = S.unlocked || {};
    S.unlocked[id] = true;
  }
  /* scattered background props: floating islets, wrecks, drifting jellies */
  function scenery(seed) {
    const rng = U.mulberry(seed || 1234);
    const out = [];
    const kinds = ['islet', 'islet', 'islet', 'coralhead', 'ruin', 'bubbles', 'drift', 'wreck'];
    for (let i = 0; i < 130; i++) {
      const x = rng() * W, y = 150 + rng() * (H - 200);
      if (LIST.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 90)) continue;
      const kind = kinds[Math.floor(rng() * kinds.length)];
      out.push({ x, y, kind: (kind === 'wreck' && rng() > 0.25) ? 'islet' : kind,
                 s: 0.55 + rng() * 1.6, deep: y / H, ph: rng() * 9, flip: rng() < 0.5 });
    }
    return out;
  }
  return { LIST, byId, W, H, unlocked, unlock, scenery };
})();
