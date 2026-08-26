/* ============================================================
   rpg/act1.js - Act One: the night the kingdom went.

   The prologue is a chain of beats, each of which knows where it
   happens, who it is with, and what finishes it. The castle
   scene reads this and nothing else, so the story can be
   rewritten here without touching a line of the scene.

   Order matters: he takes the queen to dinner, eats it, fights
   what comes in off the balcony, throws the leftovers at the
   cook - and then a keg texts him and he throws all of it away.
   ============================================================ */
KD.Act1 = (function () {
  const A = {
    beat: 0, plates: 0, sharks: 0, fat: 0, done: false,
    thrown: 0, drinks: 0, kisses: 0
  };

  /* who lives where. `room` indexes the castle's ROOMS. */
  const CAST = {
    queen: { name: 'Coralene', portrait: 'po_queen', room: 1, x: 250, sprite: 'qn_idle' },
    deep:  { name: 'The Deep', portrait: 'po_deep',  room: 2, x: 470, sprite: 'dp_idle' },
    keg:   { name: 'The Keg',  portrait: 'po_keg',   room: 0, x: 60,  sprite: 'kg_idle' }
  };

  /* Each beat: where the marker goes, what the objective line says, and
     the `kind` the scene switches on. */
  const BEATS = [
    { id: 'wake', kind: 'talk', who: 'queen', room: 1,
      hint: 'Find the Queen in the Great Hall',
      lines: [
        ['queen', 'There you are. You promised me dinner three tides ago.'],
        ['king',  'Tonight, then. The long table. Candles. All of it.'],
        ['queen', 'You said that last time and then you fought an eel.']
      ] },
    { id: 'dinner', kind: 'use', target: 'table', room: 1,
      hint: 'Sit down and eat with her',
      lines: [
        ['queen', 'It is good. You are here and it is good.'],
        ['king',  'I will not miss another one.']
      ] },
    { id: 'sharks', kind: 'kill', n: 3, room: 3,
      hint: 'Sharks in off the balcony - three of them',
      lines: [
        ['queen', 'Do NOT let them near the table.'],
        ['king',  'Stay behind me.']
      ] },
    { id: 'bully', kind: 'throw', who: 'deep', room: 2, need: 1,
      hint: 'Take a plate from the table. The cook has it coming',
      lines: [
        ['deep',  'Your Majesty. I do not appreciate being thrown at.'],
        ['king',  'Cook better and I will stop.'],
        ['deep',  'One day this kitchen will be the whole castle.']
      ] },
    { id: 'text', kind: 'cine', cine: 'a1_text',
      hint: 'Something buzzed in the throne room' },
    { id: 'drink', kind: 'mini', mini: 'beer', room: 0,
      hint: 'She is waiting by the throne. Drink with her',
      lines: [['keg', 'You look like a man who is bored of being loved.']] },
    { id: 'kiss', kind: 'mini', mini: 'kiss', room: 0,
      hint: 'One more and you will not remember the promise' },
    { id: 'fall', kind: 'cine', cine: 'a1_fall',
      hint: 'Go back to the Great Hall' , room: 1 }
  ];

  const beat = () => BEATS[Math.min(A.beat, BEATS.length - 1)];
  const hint = () => (A.done ? '' : beat().hint);
  const at = (id) => BEATS[A.beat] && BEATS[A.beat].id === id;

  function advance() {
    A.beat++;
    if (A.beat >= BEATS.length) { A.done = true; A.beat = BEATS.length - 1; }
    save();
  }

  /* Weight is the whole point of the act: he leaves it heavier than he
     arrived, and the village game picks that up. */
  function gain(kg) {
    A.fat = Math.min(60, A.fat + kg);
    save();
  }

  function save() {
    if (!KD.State || !KD.State.S) return;
    KD.State.S.act1 = { beat: A.beat, fat: A.fat, done: A.done,
                        drinks: A.drinks, kisses: A.kisses };
    if (KD.State.save) KD.State.save();
  }
  function load() {
    const s = KD.State && KD.State.S && KD.State.S.act1;
    if (!s) return;
    A.beat = s.beat || 0; A.fat = s.fat || 0; A.done = !!s.done;
    A.drinks = s.drinks || 0; A.kisses = s.kisses || 0;
  }

  return { A, BEATS, CAST, beat, hint, at, advance, gain, save, load,
           get done() { return A.done; } };
})();
