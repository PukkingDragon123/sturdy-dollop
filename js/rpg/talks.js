/* ============================================================
   rpg/talks.js - what everyone in Act One actually says.

   Data only. ui/convo.js knows how to play a script; this knows
   what is in one. Kept apart because dialogue gets rewritten far
   more often than the thing that draws it, and because a scene
   file with forty lines of prose in the middle of it stops being
   readable as a scene.

   Choices set flags on the bag the scene passes in. Three of
   them matter: `warm` (whether he is paying her any attention),
   `cruel` (how he treats the cook) and `fell` (whether he goes
   with the keg or not - he does, but it reads differently).
   ============================================================ */
KD.Talks = (function () {

  /* ---- 1. the queen, in the great hall --------------------------- */
  const wake = [
    { who: 'queen', text: 'There you are. I heard the alarm go. I heard it stop, too - very suddenly.' },
    { who: 'king',  text: 'It was making a noise.' },
    { who: 'queen', text: 'It was making the noise it is for. That is the sixth one this season.' },
    { who: 'queen', text: 'You promised me dinner three tides ago. The long table. Candles. All of it.' },
    { choose: [
        { label: 'Tonight. I mean it.', goto: 'yes', set: { warm: 1 } },
        { label: 'Was that this week?', goto: 'no' },
        { label: 'The trench needed me.', goto: 'no' }
      ], text: 'SAY:' },

    { label: 'yes' },
    { who: 'queen', text: 'You said that last time, and then an eel came up the drain and you were gone until the tide turned.' },
    { who: 'king',  text: 'No eels tonight. I will have the cook lay it out.' },
    { who: 'queen', text: 'Then I will be at the table. Do not make me the only one at it.' },
    { end: true },

    { label: 'no' },
    { who: 'queen', text: 'It was last season. There was a fish going cold in front of me for two hours.' },
    { who: 'king',  text: 'Then tonight. The table. I will be there.' },
    { who: 'queen', text: 'I will believe the chair when it has you in it.' }
  ];

  /* ---- 2. before the sharks -------------------------------------- */
  const sharks = [
    { who: 'queen', text: 'Something came in off the balcony. Three of them. They are between me and the door.' },
    { who: 'king',  text: 'Get behind the table.' },
    { who: 'queen', text: 'I am behind the table. You are the one with the trident.' },
    { who: 'king',  text: 'Then watch what a king does about sharks.' }
  ];

  /* ---- 3. the cook, after you have thrown dinner at him ---------- */
  const bully = [
    { who: 'deep',  text: 'Majesty. There is a plate in my kitchen that came in at the height of my head.' },
    { who: 'king',  text: 'It was undercooked.' },
    { who: 'deep',  text: 'It was a crab. Crabs are served as they are. I have explained this to you four times.' },
    { choose: [
        { label: 'Then explain it a fifth time.', goto: 'cruel', set: { cruel: 1 } },
        { label: 'Fine. It was a good crab.', goto: 'kind' },
        { label: 'Say nothing.', goto: 'kind' }
      ], text: 'SAY:' },

    { label: 'cruel' },
    { who: 'deep',  text: 'No. I think I have finished explaining things to you.' },
    { who: 'deep',  text: 'Eight arms, majesty. Do you know what a cook does with eight arms and a long memory?' },
    { who: 'king',  text: 'Cooks.' },
    { who: 'deep',  text: 'For now.' },
    { end: true },

    { label: 'kind' },
    { who: 'deep',  text: 'Hm. That is the first civil thing you have said to me in a season.' },
    { who: 'deep',  text: 'It will not save the kitchen, but I will remember you said it.' },
    { who: 'king',  text: 'Save the kitchen from what?' },
    { who: 'deep',  text: 'Nothing, majesty. Your crab is going cold.' }
  ];

  /* ---- 4. the night with the keg ---------------------------------
     This used to be two timing minigames - pour the beer, then a
     rhythm game for the kiss. Both of them were the same button
     pressed to a bar, and neither of them said anything. It is one
     conversation now, and the only mechanic is what he chooses to
     say, because that is the beat where he throws his life away and
     a rhythm meter is a strange way to dramatise that.
     -------------------------------------------------------------- */
  const keg = [
    { who: 'keg',   text: 'You came. I did not think you would, and here you are, standing in your own throne room like a man waiting for a bus.' },
    { who: 'king',  text: 'You said you were downstairs.' },
    { who: 'keg',   text: 'I said a lot of things. Sit down. Nobody sits in that chair when you are in it - do you know how strange that is?' },
    { choose: [
        { label: 'I should go back up.', goto: 'resist' },
        { label: 'What are you drinking?', goto: 'drink', set: { drank: 1 } },
        { label: 'Say nothing. Sit.', goto: 'drink', set: { drank: 1 } }
      ], text: 'SAY:' },

    { label: 'resist' },
    { who: 'keg',   text: 'Back up. To the long table, and the candles, and the woman who checks whether you finished your fish.' },
    { who: 'keg',   text: 'I am not asking you to leave her. I am asking you to have one and stop holding your stomach in.' },
    { who: 'king',  text: 'One.' },
    { who: 'keg',   text: 'One.' },
    { goto: 'drink' },

    { label: 'drink' },
    { who: 'keg',   text: 'There. That is better. You have a whole different face when you are not being the King of the Atlantic.' },
    { who: 'king',  text: 'What face is that.' },
    { who: 'keg',   text: 'A younger one. Sit closer, I cannot hear you over the water.' },
    { choose: [
        { label: 'Move closer.', goto: 'fall', set: { fell: 2 } },
        { label: 'Stay where I am.', goto: 'slow', set: { fell: 1 } }
      ], text: 'SAY:' },

    { label: 'slow' },
    { who: 'keg',   text: 'Suit yourself. I have all night, and so do you - that is the thing about a trench, it does not go anywhere.' },
    { who: 'keg',   text: 'Another?' },
    { who: 'king',  text: 'Another.' },
    { goto: 'fall' },

    { label: 'fall' },
    { who: 'keg',   text: 'Good. Now put that thing down, you are going to have somebody\'s eye out with it.' },
    { do: (b) => { b.putDown = 1; } },
    { who: 'king',  text: '...' },
    { who: 'keg',   text: 'Look at that. Four hundred years of kings and all it took was asking.' }
  ];

  /* ---- 5. the neighbours, once he is in the village -------------- */
  const village = [
    { who: 'santa', text: 'Easy, big fella. You have been face down in that sand for two tides and I have been waiting to see if you floated.' },
    { who: 'king',  text: 'Where is this.' },
    { who: 'santa', text: 'Fruitfall. Twelve hollowed-out fruit, one gym, and a gate east that will not open for a man your size.' },
    { who: 'santa', text: 'Which is the good news, if you think about it. A shut gate is a thing you can do something about.' }
  ];

  return { wake, sharks, bully, keg, village };
})();
