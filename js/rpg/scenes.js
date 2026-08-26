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
    return {
      id: 'intro',
      beats: [
        { kind: 'card', world: false, t: 3.0,
          lines: ['KING OF THE ATLANTIC'],
          sub: 'a story about a man, a barrel and a manta ray' },

        /* 1. the kingdom */
        { kind: 'art', world: false, spr: 'king2_scale0', scale: 2, y: 0.42, t: 0.1 },
        { kind: 'card', world: false, t: 3.4,
          lines: ['The trench answered to you.', 'So did the reef, and the drop, and the blue.'] },

        /* 2. the keg */
        { kind: 'art', world: false, spr: 'po_keg', scale: 2, y: 0.40, t: 0.1 },
        { kind: 'card', world: false, t: 3.2,
          lines: ['Then you met her.'], sub: 'a beer keg in a crooked tiara' },
        { kind: 'say', world: false, who: 'po_keg', name: 'The Keg', t: 4.2,
          text: 'One more will not hurt you, love. You are the King of the Atlantic. What is one more?' },
        { kind: 'card', world: false, t: 2.8, lines: ['Four seasons went by.'],
          sub: 'you stopped counting at the second' },

        /* 3. THE FALL */
        { kind: 'rumble', world: false, amp: 5, t: 1.5 },
        { kind: 'flash', world: false, col: 'BLOOD.3', t: 0.5 },
        { kind: 'shake', world: false, amp: 10, t: 0.3 },
        { kind: 'card', world: false, t: 2.4, lines: ['THE KINGDOM FELL'] },
        { kind: 'rumble', world: false, amp: 3, t: 1.2, vig: 1 },
        { kind: 'art', world: false, spr: 'king2_ink0', scale: 2, y: 0.42, t: 0.1, vig: 1 },
        { kind: 'card', world: false, t: 3.6, vig: 1,
          lines: ['THE DEEP came up the trench', 'and brought his own court with him.'] },
        { kind: 'say', world: false, who: 'po_octo', name: 'Inkwell', t: 4.2, vig: 1,
          text: 'Eight arms each, majesty. I counted them twice, and then I stopped counting.' },

        /* 4. the betrayal */
        { kind: 'two', world: false, l: 'po_keg', r: 'po_octo', t: 3.6,
          text: 'She did not even wait for the fight to finish.' },
        { kind: 'say', world: false, who: 'po_keg', name: 'The Keg', t: 4.6,
          text: 'Do not look at me like that. You got heavy, love. He did not. That is the whole of it.' },

        /* 5. the crown */
        { kind: 'flash', world: false, col: 'INK.0', t: 0.4 },
        { kind: 'fade', world: false, to: 1, t: 0.9 },
        { kind: 'card', world: false, t: 3.2,
          lines: ['She is down there with him now.', 'On a cushion. By your chair.'] },
        { kind: 'fade', world: false, to: 0, t: 0.7 },

        /* 6. the one who stayed */
        { kind: 'art', world: false, spr: 'po_santa', scale: 2, y: 0.40, t: 0.1 },
        { kind: 'say', world: false, who: 'po_santa', name: 'Santa the Manta', t: 5.0,
          text: 'HO! There you are. Everyone else went with the winner, majesty. I did not fancy the company.' },
        { kind: 'say', world: false, who: 'po_santa', name: 'Santa the Manta', t: 5.0,
          text: 'One hundred kilos, one crown, one very patient manta. Get on the scales and we shall begin.' },
        { kind: 'card', world: false, t: 3.2,
          lines: ['ONE HUNDRED KILOS', 'ONE CROWN TO GET BACK'], sub: 'start at the scales' }
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
