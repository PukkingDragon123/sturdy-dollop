/* ============================================================
   rpg/quests.js - what the town actually wants from you.

   A quest is a hand-written line, a check that reads the game
   state, and a reward. No state machine: the check IS the state,
   so a quest can never get stuck half-finished, and loading an
   old save never leaves one in an impossible step.

   The chain is the game's spine - get out of the village, get
   through the Gate, kill the five champions, take the crown -
   and everything else hangs off it.
   ============================================================ */
KD.Quests = (function () {
  const S = () => KD.State.S;

  /* give: which NPC job hands it over. need: what unlocks OFFERING it.
     done(st): have you finished it. Rewards are clams + xp + maybe an item.
     mark: which glyph the quest scroll's brass tag shows - whether this one
     wants hitting, using or walking to. */
  /* Every one of these comes from SANTA. The keg left - she took one look at
     the weight and went to sit with the winner, and she is down at the bottom
     of the Drop with The Deep. The manta stayed. Nobody asked him to and
     nobody thanked him for it, and he has never once mentioned either. */
  const Q = [
    { id: 'firstrep', mark: 'use', give: 'santa', name: 'One Honest Set',
      text: 'HO! Right. First thing. You have never finished a set in your life, your majesty. Do ONE. I will count.',
      hint: 'Finish one set at the gym.',
      done: (st) => KD.Goal.trainedTotal(st) >= 1,
      clams: 60, xp: 25 },

    { id: 'firstdig', mark: 'use', give: 'santa', name: 'Something With An Edge',
      text: 'The crab wants twenty stone and you want something sharper than your own wit. Off you go. I shall wait here, cheerfully.',
      hint: 'Mine 20 stone.',
      need: 'firstrep',
      done: () => KD.State.count('stone') >= 20,
      take: [['stone', 20]], clams: 90, xp: 30 },

    { id: 'lighter', mark: 'use', give: 'santa', name: 'Eighteen Kilos',
      text: 'The Gate will not open for a hundred kilos of ex-king. Eighty-two and I will carry you through myself.',
      hint: 'Get to 82kg and train to 3 levels.',
      need: 'firstdig',
      done: (st) => !KD.Goal.why(st, 'gate'),
      clams: 160, xp: 70 },

    { id: 'gatepass', mark: 'go', give: 'santa', name: 'Past The Gate',
      text: 'Climb on. Mind the hat. HO HO - hold tight, majesty, I have not done this in a while.',
      hint: 'Get through the Sea Gate.',
      need: 'lighter',
      done: () => (KD.Player.P.x / 8) > KD.Zones.byId.gate.x1,
      clams: 120, xp: 50 },

    { id: 'reeffish', mark: 'use', give: 'santa', name: 'Something For The Pot',
      text: 'Six fish off the reef. Not for me - for YOU. You have eaten nothing but beer for four seasons.',
      hint: 'Bring back 6 fish.',
      need: 'gatepass',
      done: () => KD.State.count('fish1') + KD.State.count('fish2') >= 6,
      take: [['fish1', 6]], clams: 140, xp: 55 },

    { id: 'champ1', mark: 'fight', give: 'santa', name: 'Old Scar',
      text: 'A shark past the Gate has been taking the nets. And the netmen. Go and be useful - it suits you.',
      hint: 'Kill Old Scar in the Shallow Reef.',
      need: 'reeffish',
      done: (st) => !!st.champs.reef,
      clams: 260, xp: 130 },

    { id: 'champ2', mark: 'fight', give: 'santa', name: 'The Tangle',
      text: 'Something in the kelp is not a plant. I would dearly love to stop hearing it at night. HO.',
      hint: 'Kill The Tangle in the Kelp Forest.',
      need: 'champ1',
      done: (st) => !!st.champs.kelp,
      clams: 340, xp: 190 },

    { id: 'champ3', mark: 'fight', give: 'santa', name: 'The Last Warden',
      text: 'The sunken city still has a guard on the door. Longest shift in the Atlantic, poor thing.',
      hint: 'Kill The Last Warden in the Sunken City.',
      need: 'champ2',
      done: (st) => !!st.champs.ruins,
      clams: 460, xp: 280 },

    { id: 'champ4', mark: 'fight', give: 'santa', name: 'The Long Shadow',
      text: 'Nobody who has seen it will describe it. I am told the odds on you are magnificent.',
      hint: 'Kill The Long Shadow in the Open Blue.',
      need: 'champ3',
      done: (st) => !!st.champs.blue,
      clams: 640, xp: 400 },

    { id: 'crown', mark: 'fight', give: 'santa', name: 'The Crown',
      text: 'She is down there with him, majesty. On a cushion, by his chair. Go and get your hat back - I shall wait right here, as ever.',
      hint: 'Beat the King at the bottom of The Drop.',
      need: 'champ4',
      done: (st) => !!st.flags.kingDead,
      clams: 1200, xp: 900 }
  ];

  const byId = {};
  for (const q of Q) byId[q.id] = q;

  const state = (id) => (S().quests[id] || 'none');   // none | open | done
  const isDone = (id) => state(id) === 'done';
  const isOpen = (id) => state(id) === 'open';

  /* can this NPC offer this quest right now? */
  function offerable(q) {
    if (state(q.id) !== 'none') return false;
    if (q.need && !isDone(q.need)) return false;
    return true;
  }
  /* what this job has to say, if anything */
  function forJob(job) {
    const open = Q.find((q) => q.give === job && isOpen(q.id));
    if (open) return { q: open, ready: !!open.done(S()) };
    const offer = Q.find((q) => q.give === job && offerable(q));
    return offer ? { q: offer, offer: true } : null;
  }
  function accept(q) {
    S().quests[q.id] = 'open';
    /* No toast. Whoever handed it over is already saying it out loud in a
       bubble, and the two boxes landed on top of each other. */
    KD.Sfx.play('open');
  }
  function turnIn(q) {
    if (!q.done(S())) { KD.State.say(q.hint, 'ROT.3'); KD.Sfx.play('deny'); return false; }
    for (const [id, n] of (q.take || [])) KD.State.take(id, n);
    S().quests[q.id] = 'done';
    if (q.clams) KD.State.earn(q.clams);
    if (q.xp) KD.State.addXp(q.xp);
    if (q.item) KD.State.give(q.item, q.n || 1);
    KD.State.say('DONE: ' + q.name + '   +' + (q.clams || 0) + 'c', 'GOLD.3');
    KD.Sfx.play('levelup');
    KD.State.save();
    return true;
  }
  /* the one line the HUD shows: what you are supposed to be doing */
  function current() {
    const open = Q.find((q) => isOpen(q.id));
    if (open) return (open.done(S()) ? 'READY: ' : '') + open.hint;
    const next = Q.find((q) => offerable(q));
    if (next) return 'Santa has something to say to you.';
    return null;
  }
  /* and which glyph goes on the scroll beside it. A finished quest wants
     taking back to Santa, so it turns into a TALK whatever it started as. */
  function currentMark() {
    const open = Q.find((q) => isOpen(q.id));
    if (open) return open.done(S()) ? 'talk' : (open.mark || 'go');
    return Q.find((q) => offerable(q)) ? 'talk' : null;
  }
  const doneCount = () => Q.filter((q) => isDone(q.id)).length;

  return { Q, byId, state, isDone, isOpen, offerable, forJob, accept, turnIn, current, currentMark, doneCount };
})();
