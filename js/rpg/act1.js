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
  /* Each beat names a conversation in rpg/talks.js rather than carrying its
     own lines, and `mark` says what kind of objective it is so the marker
     and the scroll can show the right icon.

     There used to be two timing minigames in here - pour the beer, then a
     rhythm game for the kiss. They were the same button pressed to a bar and
     neither of them said anything, so they are one conversation now: the
     beat where he throws his life away is a beat about what he SAYS. */
  const BEATS = [
    { id: 'wake', kind: 'talk', who: 'queen', room: 1, mark: 'talk',
      hint: 'Find the Queen in the Great Hall', talk: 'wake' },
    { id: 'dinner', kind: 'use', target: 'table', room: 1, mark: 'use',
      hint: 'Sit down and eat with her' },
    { id: 'sharks', kind: 'kill', n: 3, room: 3, mark: 'fight',
      hint: 'Sharks in off the balcony - three of them', talk: 'sharks' },
    { id: 'bully', kind: 'throw', who: 'deep', room: 2, need: 1, mark: 'fight',
      hint: 'Take a plate from the table. The cook has it coming', talk: 'bully' },
    { id: 'text', kind: 'cine', cine: 'a1_text', mark: 'go',
      hint: 'Something buzzed in the throne room' },
    { id: 'night', kind: 'talk', who: 'keg', room: 0, mark: 'talk',
      hint: 'She is waiting by the throne', talk: 'keg' },
    /* This used to say "go back to the Great Hall", and it fired in room 1,
       which meant the scene where she walks in on the two of them played in
       an empty hall with the keg one room away. It happens where it happens:
       the throne room, with her still sitting there. */
    { id: 'fall', kind: 'cine', cine: 'a1_fall', mark: 'go',
      hint: 'Stay where you are. Somebody is coming up the stairs', room: 0 }
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
