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
  const Q = [
    { id: 'firstdig', give: 'smith', name: 'Something With An Edge',
      text: 'Bring me twenty stone and I will show you what a pick is for.',
      hint: 'Mine 20 stone and bring it to the smith.',
      done: (st) => KD.State.count('stone') >= 20,
      take: [['stone', 20]], clams: 60, xp: 20, item: 'ore_copper', n: 4 },

    { id: 'firstrep', give: 'trainer', name: 'One Honest Set',
      text: 'You have never finished a set in your life. Do one. Just one.',
      hint: 'Finish a set at the gym.',
      done: (st) => KD.Goal.trainedTotal(st) >= 1,
      clams: 40, xp: 25 },

    { id: 'lighter', give: 'trainer', name: 'Eighteen Kilos',
      text: 'The Gate does not open for you at a hundred. Get to eighty-two.',
      hint: 'Get down to 82kg and train to 3 levels.',
      done: (st) => !KD.Goal.why(st, 'gate'),
      clams: 120, xp: 60 },

    { id: 'gatepass', give: 'guard', name: 'Past The Gate',
      text: 'Show me you can move and I will let you through.',
      hint: 'Get through the Sea Gate.',
      done: (st) => (KD.Player.P.x / 8) > KD.Zones.byId.gate.x1,
      clams: 90, xp: 40 },

    { id: 'reeffish', give: 'tackler', name: 'Something For The Pot',
      text: 'Six fish off the reef. Any six. I am not fussy and neither are you.',
      hint: 'Bring the tackler 6 fish.',
      need: 'gatepass',
      done: () => KD.State.count('fish1') + KD.State.count('fish2') >= 6,
      take: [['fish1', 6]], clams: 100, xp: 45 },

    { id: 'champ1', give: 'guard', name: 'Old Scar',
      text: 'A shark out past the Gate has been taking our nets. And our netmen.',
      hint: 'Kill Old Scar in the Shallow Reef.',
      need: 'gatepass',
      done: (st) => !!st.champs.reef,
      clams: 220, xp: 120 },

    { id: 'champ2', give: 'scholar', name: 'The Tangle',
      text: 'Something in the kelp is not a plant. I would like to stop hearing it.',
      hint: 'Kill The Tangle in the Kelp Forest.',
      need: 'champ1',
      done: (st) => !!st.champs.kelp,
      clams: 300, xp: 180 },

    { id: 'champ3', give: 'scholar', name: 'The Last Warden',
      text: 'The city down there still has a guard on the door. It has been a while.',
      hint: 'Kill The Last Warden in the Sunken City.',
      need: 'champ2',
      done: (st) => !!st.champs.ruins,
      clams: 420, xp: 260 },

    { id: 'champ4', give: 'bookie', name: 'The Long Shadow',
      text: 'Nobody who has seen it will describe it. Odds are excellent.',
      hint: 'Kill The Long Shadow in the Open Blue.',
      need: 'champ3',
      done: (st) => !!st.champs.blue,
      clams: 600, xp: 380 },

    { id: 'crown', give: 'princess', name: 'The Crown',
      text: 'Go and get it back. I will still be here. I am a keg.',
      hint: 'Beat the King at the bottom of The Drop.',
      need: 'champ4',
      done: (st) => !!st.flags.kingDead,
      clams: 1000, xp: 800 }
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
    if (next) return 'Ask the ' + next.give + ' about work.';
    return null;
  }
  const doneCount = () => Q.filter((q) => isDone(q.id)).length;

  return { Q, byId, state, isDone, isOpen, offerable, forJob, accept, turnIn, current, doneCount };
})();
