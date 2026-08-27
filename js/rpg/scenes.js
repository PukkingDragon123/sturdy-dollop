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

  /* ---- the intro ------------------------------------------------------
     Six movements, and each one has a different SHAPE on screen - a title,
     a held portrait, a two-shot, a rumble, a flash, a vignette - so it
     plays as a sequence rather than as a slideshow of captions.
       1  the kingdom at its height
       2  the keg, and four seasons going by
       3  THE FALL: rumble, flash, the octopus arriving
       4  the betrayal, staged as a two-shot
       5  the crown gone, the vignette closing
       6  the manta, who stayed
     -------------------------------------------------------------------- */
  function intro() {
    /* Short now. The fall used to be narrated here in six movements; Act One
       plays it instead, so this is the title card and the setup and nothing
       else. Anything the player is about to DO does not belong in a caption. */
    return {
      id: 'intro',
      beats: [
        { kind: 'card', world: false, t: 3.0,
          lines: ['KING OF THE ATLANTIC'],
          sub: 'a story about a man, a barrel and a manta ray' },
        { kind: 'art', world: false, spr: 'po_king', scale: 2, y: 0.42, t: 0.1 },
        { kind: 'card', world: false, t: 3.4,
          lines: ['The trench answered to you.', 'So did the reef, and the drop, and the blue.'],
          sub: 'and there was a queen, and a very long table' },
        { kind: 'fade', world: false, to: 1, t: 0.8 }
      ],
      after: () => { mark('intro'); KD.Game.go('wake', {}); }
    };
  }

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
