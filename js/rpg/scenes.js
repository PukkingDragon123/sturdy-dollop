/* ============================================================
   rpg/scenes.js - the scripts. Data only: every cutscene in the
   game is a list of beats and a function saying where to go
   afterwards. scenes/cine.js knows how to play one; this file
   knows what happens in them.

   Written to be read out loud. The intro has one job - tell you
   in thirty seconds that you were king, that you met a keg, that
   you got fat, and that an octopus is sitting in your chair.
   ============================================================ */
KD.Cine = (function () {
  const seen = (id) => !!(KD.State.S.flags['cine_' + id]);
  const mark = (id) => { KD.State.S.flags['cine_' + id] = 1; KD.State.save(); };

  /* ---- the intro ---------------------------------------------------- */
  function intro() {
    return {
      id: 'intro',
      beats: [
        { kind: 'card', world: false, t: 3.0, space: 1,
          lines: ['KING OF THE ATLANTIC'],
          sub: 'a story about a man and a barrel' },
        { kind: 'art', world: false, spr: 'king2_scale0', scale: 2, y: 0.44, t: 0.1 },
        { kind: 'card', world: false, t: 3.4,
          lines: ['You had everything.', 'The trench, the reef, the crown.'] },
        { kind: 'art', world: false, spr: 'po_keg', scale: 2, y: 0.42, t: 0.1 },
        { kind: 'card', world: false, t: 3.6,
          lines: ['Then you met her.', 'A beer keg in a crooked tiara.'] },
        { kind: 'say', world: false, who: 'po_keg', name: 'The Keg', t: 4.0,
          text: 'You said you would only stay for one. That was four seasons ago, love.' },
        { kind: 'sfx', id: 'deny', t: 0.1 },
        { kind: 'card', world: false, t: 3.4,
          lines: ['You got heavy.', 'You lost the fight.'] },
        { kind: 'shake', amp: 8, t: 0.2 },
        { kind: 'art', world: false, spr: 'king2_ink0', scale: 2, y: 0.44, t: 0.1 },
        { kind: 'card', world: false, t: 3.8,
          lines: ['THE DEEP took the throne.', 'He brought his own courtiers.'] },
        { kind: 'say', world: false, who: 'po_octo', name: 'Inkwell', t: 4.2,
          text: 'Eight arms each, majesty. I counted them twice, and then I stopped counting.' },
        { kind: 'fade', to: 1, t: 0.9 },
        { kind: 'card', world: false, t: 3.6,
          lines: ['One hundred kilos.', 'One crown to get back.'],
          sub: 'start at the scales' },
        { kind: 'fade', to: 0, t: 0.7 }
      ],
      after: () => { mark('intro'); KD.Game.go('gen', {}); }
    };
  }

  /* ---- the Sea Gate opens ------------------------------------------- */
  function gate() {
    return {
      id: 'gate',
      beats: [
        { kind: 'shake', amp: 7, t: 0.3 },
        { kind: 'sfx', id: 'open', t: 0.2 },
        { kind: 'say', who: 'po_turtle', name: 'Bulwark', t: 4.2,
          text: 'Well. Look at you. Go on then - it is warm out there, and everything in it bites.' },
        { kind: 'card', t: 2.6, lines: ['THE SEA GATE IS OPEN'], sub: 'the reef is east' }
      ],
      after: () => { mark('gate'); KD.Game.go('play', {}); }
    };
  }

  /* ---- arriving at the throne --------------------------------------- */
  function throne() {
    return {
      id: 'throne',
      beats: [
        { kind: 'fade', to: 1, t: 0.6 },
        { kind: 'fade', to: 0, t: 0.8 },
        { kind: 'card', t: 2.6, lines: ['THE DROP'], sub: 'four hundred metres down' },
        { kind: 'art', spr: 'king2_scale0', scale: 2, y: 0.40, t: 0.1 },
        { kind: 'say', who: 'po_octo', name: 'The Deep', t: 4.4,
          text: 'Oh. You actually did it. You came all this way, and you are still going to lose.' },
        { kind: 'shake', amp: 9, t: 0.3 }
      ],
      after: () => { mark('throne'); KD.Game.go('play', {}); }
    };
  }

  /* ---- the crown comes back ----------------------------------------- */
  function win() {
    return {
      id: 'win',
      beats: [
        { kind: 'fade', to: 1, t: 0.7 },
        { kind: 'art', world: false, spr: 'ic_crown', scale: 6, y: 0.38, t: 0.1 },
        { kind: 'fade', to: 0, t: 0.8 },
        { kind: 'card', world: false, t: 3.2, lines: ['THE CROWN IS YOURS'] },
        { kind: 'say', world: false, who: 'po_keg', name: 'The Keg', t: 4.6,
          text: 'There he is. There is the man I got fat. Come home, I have not moved.' },
        { kind: 'card', world: false, t: 3.4,
          lines: ['KING OF THE ATLANTIC'], sub: 'and eighteen kilos of him' }
      ],
      after: () => { mark('win'); KD.Game.go('victory', {}); }
    };
  }

  const BY_ID = { intro, gate, throne, win };
  /* play it once and only once, unless forced */
  function play(id, force) {
    const mk = BY_ID[id];
    if (!mk) return false;
    if (!force && seen(id)) return false;
    KD.Game.go('cine', { scene: mk() });
    return true;
  }
  return { play, seen, mark, BY_ID };
})();
