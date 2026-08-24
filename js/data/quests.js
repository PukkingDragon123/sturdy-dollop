/* ============================================================
   quests.js - the crown spine plus a few side jobs.
   ============================================================ */
KA.Quests = (function () {
  const FRAGS = [
    { id: 1, name: 'Pawned Fragment',   who: 'Sticky Finn',      where: 'Coral Village',      how: 'Buy it back for 600 clams.' },
    { id: 2, name: 'Wagered Fragment',  who: 'Bookie Barry',     where: 'Race Office',        how: 'Win a Reef Cup race.' },
    { id: 3, name: 'Swallowed Fragment',who: 'Scholar Wrasse',   where: 'Sunken Colonnade',   how: 'Bring 2 Golden Snappers.' },
    { id: 4, name: 'Stolen Fragment',   who: 'Sergeant Sludge',  where: 'The Beer Trench',    how: 'Kill 12 Beer Bandits.' },
    { id: 5, name: 'Worn Fragment',     who: 'Baron Foamhelm',   where: 'Throne of Atlantic', how: 'Take it off his head.' }
  ];

  const SIDE = {
    q_kelp:  { name: 'The Kelp Is Hungry', giver: 'kelpy',
      text: 'Bring Kelpy Ken 3 Mackerel.', need: { fish: 'mackerel', n: 3 }, clams: 220, tokens: 1 },
    q_crab:  { name: 'Shel\'s Revenge', giver: 'hermit',
      text: 'Kill 6 Snapper Crabs for the hermit.', need: { kills: 6, kind: 'snapper' }, clams: 340, tokens: 1 },
    q_beer:  { name: 'Her Favour', giver: 'princess',
      text: 'Drink a Royal Foam in her presence. She likes that.', need: { drink: 'royal' }, clams: 0, tokens: 2 }
  };

  const INTRO = [
    'You were KING OF THE ATLANTIC.',
    'Then you met her. A beer keg in a little dress and a crooked tiara.',
    'You fell in love. You drank. You kept drinking. You got... comfortable.',
    'At the Battle of the Bubble you fell over before anyone hit you.',
    'Baron Foamhelm took your crown, broke it into five, and scattered the pieces.',
    'You have a bar stool, a sea horse called Nibbles, and forty clams.',
    'Get it back.'
  ];
  const OUTRO = [
    'The crown is whole. It does not fit any more.',
    'You have it widened. You are still king. You are also still fat.',
    'The Princess gurgles from the throne beside you. Nobody comments.',
    'THE END. Go on then, have a beer.'
  ];
  return { FRAGS, SIDE, INTRO, OUTRO };
})();
