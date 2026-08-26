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
     done(st): have you finished it. Rewards are clams + xp + maybe an item. */
  /* Every one of these comes from HER. She is a beer keg in a crooked tiara,
     she is the reason he is like this, and she is the only one in Fruitfall
     who will say so to his face. The others sell things; she sets the task.
     `at` is who you hand it back to when it is done - usually her. */
  const Q = [
    { id: 'firstrep', give: 'princess', name: 'One Honest Set',
      text: 'You have never finished a set in your life, love. Do one. I will wait. I always wait.',
      hint: 'Finish one set at the gym.',
      done: (st) => KD.Goal.trainedTotal(st) >= 1,
      clams: 60, xp: 25 },

    { id: 'firstdig', give: 'princess', name: 'Something With An Edge',
      text: 'The crab wants twenty stone and you want something sharper than your wit. Go and dig.',
      hint: 'Mine 20 stone.',
      need: 'firstrep',
      done: () => KD.State.count('stone') >= 20,
      take: [['stone', 20]], clams: 90, xp: 30 },

    { id: 'lighter', give: 'princess', name: 'Eighteen Kilos',
      text: 'The Gate does not open for you at a hundred. Neither do I, frankly. Get to eighty-two.',
      hint: 'Get to 82kg and train to 3 levels.',
      need: 'firstdig',
      done: (st) => !KD.Goal.why(st, 'gate'),
      clams: 160, xp: 70 },

    { id: 'gatepass', give: 'princess', name: 'Past The Gate',
      text: 'Show the turtle you can move. Then keep going, because I am not carrying you.',
      hint: 'Get through the Sea Gate.',
      need: 'lighter',
      done: () => (KD.Player.P.x / 8) > KD.Zones.byId.gate.x1,
      clams: 120, xp: 50 },

    { id: 'reeffish', give: 'princess', name: 'Something For The Pot',
      text: 'Six fish off the reef. You used to bring me six fish. You used to bring me things.',
      hint: 'Bring back 6 fish.',
      need: 'gatepass',
      done: () => KD.State.count('fish1') + KD.State.count('fish2') >= 6,
      take: [['fish1', 6]], clams: 140, xp: 55 },

    { id: 'champ1', give: 'princess', name: 'Old Scar',
      text: 'A shark past the Gate has been taking our nets. And our netmen. Go and be useful.',
      hint: 'Kill Old Scar in the Shallow Reef.',
      need: 'reeffish',
      done: (st) => !!st.champs.reef,
      clams: 260, xp: 130 },

    { id: 'champ2', give: 'princess', name: 'The Tangle',
      text: 'Something in the kelp is not a plant. I would very much like to stop hearing it at night.',
      hint: 'Kill The Tangle in the Kelp Forest.',
      need: 'champ1',
      done: (st) => !!st.champs.kelp,
      clams: 340, xp: 190 },

    { id: 'champ3', give: 'princess', name: 'The Last Warden',
      text: 'The sunken city still has a guard on the door. It has been a very long shift.',
      hint: 'Kill The Last Warden in the Sunken City.',
      need: 'champ2',
      done: (st) => !!st.champs.ruins,
      clams: 460, xp: 280 },

    { id: 'champ4', give: 'princess', name: 'The Long Shadow',
      text: 'Nobody who has seen it will describe it. The odds on you are magnificent.',
      hint: 'Kill The Long Shadow in the Open Blue.',
      need: 'champ3',
      done: (st) => !!st.champs.blue,
      clams: 640, xp: 400 },

    { id: 'crown', give: 'princess', name: 'The Crown',
      text: 'Now go down and take it back off him. I will still be here. I am a keg, love. I do not go anywhere.',
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
    KD.State.say('TAKEN: ' + q.name, 'GOLD.3');
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
    if (next) return 'The Keg has something to say to you.';
    return null;
  }
  const doneCount = () => Q.filter((q) => isDone(q.id)).length;

  return { Q, byId, state, isDone, isOpen, offerable, forJob, accept, turnIn, current, doneCount };
})();
