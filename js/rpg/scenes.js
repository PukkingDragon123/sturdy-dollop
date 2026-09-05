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
        { kind: 'card', t: 3.0,
          lines: ['KING OF THE ATLANTIC'],
          sub: 'a story about a man, a barrel and a manta ray' },
        { kind: 'art', spr: 'po_king', scale: 2, y: 0.42, t: 0.1 },
        { kind: 'card', t: 3.4,
          lines: ['The trench answered to you.', 'So did the reef, and the drop, and the blue.'],
          sub: 'and there was a queen, and a very long table' },
        { kind: 'fade', to: 1, t: 0.8 }
      ],
      after: () => { mark('intro'); KD.Game.go('wake', {}); }
    };
  }

  /* ---- the crown comes back -----------------------------------------
     Three people speak here and the order is the point. The one who left
     him for the winner comes back first and gets nothing. The one who never
     asked for anything gets the line. And the one he actually broke a
     promise to does not take him back, because she said at the start what
     she was waiting for and he was not there.
     ------------------------------------------------------------------ */
  function win() {
    return {
      id: 'win',
      beats: [
        { kind: 'card', t: 2.8, vig: 0.6, lines: ['THE IRON GATE'],
          sub: 'the last card, and nobody left on it' },
        { kind: 'art', spr: 'ic_crown', scale: 4, y: 0.38, t: 0.1 },
        { kind: 'card', t: 3.0, vig: 0.5, lines: ['YOU BOUGHT IT BACK'],
          sub: 'a chair, at the price of five cards' },
        { kind: 'say', who: 'po_keg', name: 'The Keg', t: 4.8,
          text: 'There he is. There is the man I got fat. You can afford me again - come home, I have not moved.' },
        { kind: 'say', who: 'po_king', name: 'You', t: 3.6,
          text: 'No. You have not.' },
        { kind: 'say', who: 'po_santa', name: 'Santa the Manta', t: 5.0,
          text: 'HO! Do not look at me like that, majesty, I only pulled you out of the sand. Everything after that was you and a dolphin nobody else wanted.' },
        { kind: 'card', t: 2.6, lines: ['AND THE LONG TABLE'],
          sub: 'somebody had put the chairs back' },
        { kind: 'say', who: 'po_queen', name: 'Coralene', t: 5.0,
          text: 'I am not coming back. But I will sit down, and you will tell me about the quarry, and we will see.' },
        { kind: 'fade', to: 1, t: 1.0 },
        { kind: 'card', t: 3.4, vig: 1,
          lines: ['KING OF THE ATLANTIC'], sub: 'and one very good dolphin' }
      ],
      after: () => { mark('win'); KD.Game.go('victory', {}); }
    };
  }

  const BY_ID = { intro, win };
  /* play it once and only once, unless forced */
  function play(id, force) {
    const mk = BY_ID[id];
    if (!mk) return false;
    if (!force && seen(id)) return false;
    KD.Cut.play(mk());
    return true;
  }
  return { play, seen, mark, BY_ID };
})();
