/* ============================================================
   scenes/help.js - HOW TO PLAY.

   Three pages, because the answer to "what is this game" has
   three parts and cramming them into one 240-row screen makes
   all three unreadable: what happened, what you do about it,
   and which button does it.

   The controls page reads KD.touch and shows the layout you
   actually have, rather than listing both and making you work
   out which half applies to you.
   ============================================================ */
KD.Scenes.help = (function () {
  const R = KD.Screen.rect;
  let t = 0, page = 0, from = 'title';

  function enter(args) {
    t = 0; page = 0;
    from = (args && args.from) || 'title';
    KD.UI.guard(0.2);
  }

  function update(dt) {
    t += dt;
    if (KD.In.isHit('Escape')) leave();
    if (KD.In.isHit('ArrowRight', 'KeyD')) page = Math.min(2, page + 1);
    if (KD.In.isHit('ArrowLeft', 'KeyA')) page = Math.max(0, page - 1);
  }
  function leave() { KD.Game.go(from, {}); }

  /* ---- the pages ---------------------------------------------------- */
  const STORY = [
    'You were KING OF THE ATLANTIC. The trench answered to you,',
    'and so did the reef, the drop and the blue.',
    '',
    'Then a beer keg texted you. You put the trident down, you',
    'stopped counting the seasons, and you got heavy.',
    '',
    'The queen left. The keg left. THE DEEP came up the stairs',
    'with an army of octopuses and threw you out of your own gate.',
    '',
    'Now you run six pens on the edge of a flooded quarry, and',
    'once a night the quarry runs a card nobody official knows',
    'about. Five tiers of it. Win them all and you buy your way',
    'back through your own front door.'
  ];

  const LOOP = [
    ['1', 'THE POD', 'Six pens. The dealer brings three animals',
     'every morning and never tells you their temperament.'],
    ['2', 'DRILLS', 'Sprints, weight, holds and the ring. Each one',
     'raises one stat and eats a chunk of the day.'],
    ['3', 'SWIM WITH IT', 'BOND is the gate on its moves. Press at',
     'the top of every arc and it learns to fight for you.'],
    ['4', 'THE QUARRY', 'Pick a move, then hit the timing window.',
     'A clean strike is worth two and a half grazes.'],
    ['5', 'THE IRON GATE', 'Tier five, and the last three names on',
     'the card are people you already know.']
  ];

  function keyRows() {
    if (KD.touch) {
      return [
        ['TAP A PEN', 'That animal is the one that fights.'],
        ['QUARRY', 'Tonight\'s card. Five tiers, three handlers each.'],
        ['SWIM', 'Get in the water with it and raise its bond.'],
        ['SLEEP', 'End the day. Everything hurt mends one day.'],
        ['TABS', 'THE POD, DRILLS and THE DEALER.'],
        ['IN A FIGHT', 'Tap a move, then tap again in the green.'],
        ['', 'Miss and it costs you half again in breath.'],
        ['THE TURN', 'Fills as you land hits. At full it is a fifth move.']
      ];
    }
    return [
      ['ARROWS  /  W A S D', 'Move the cursor through a list.'],
      ['SPACE', 'Choose. In a fight it commits the move, then'],
      ['', 'stops the timing bar - hit it in the green.'],
      ['TAB  /  1 2 3', 'THE POD, DRILLS, THE DEALER.'],
      ['Q', 'Down to the quarry, to tonight\'s card.'],
      ['R', 'Swim with the one that is up.'],
      ['Z', 'Sleep. It is the only thing that mends them.'],
      ['ESC', 'Back, or pause.']
    ];
  }

  /* ---- draw --------------------------------------------------------- */
  function draw(ctx) {
    KD.Screen.clear('DEEP.0');
    /* a quiet version of the title backdrop, so it belongs to the game */
    for (let k = 0; k < 5; k++) {
      R(0, Math.round(k * KD.H / 5), KD.W, Math.round(KD.H / 5) + 1,
        ['DEEP.1', 'DEEP.0', 'DEEP.1', 'DEEP.0', 'INK.1'][k]);
    }
    for (let i = 0; i < 34; i++) {
      const bx = (i * 97 + 11) % KD.W;
      const by = KD.H - ((t * (9 + i % 6) + i * 53) % (KD.H + 20));
      R(bx, Math.round(by), (i % 4) ? 1 : 2, (i % 4) ? 1 : 2, 'WATER.1');
    }

    const cx = Math.round(KD.W / 2);
    KD.Text.draw('HOW TO PLAY', cx, 8, 'GOLD.3',
                 { align: 'center', space: 2, shadow: 'INK.0' });

    const pw = Math.min(KD.W - 20, 380);
    const px = Math.round((KD.W - pw) / 2);
    const py = 24, ph = KD.H - py - 30;
    R(px - 1, py - 1, pw + 2, ph + 2, 'INK.0');
    R(px, py, pw, ph, 'INK.1');
    R(px + 1, py + 1, pw - 2, 1, 'INK.3');
    KD.Screen.frame(px, py, pw, ph, 'GOLD.0');

    const TITLES = ['WHAT HAPPENED', 'WHAT YOU DO', 'THE BUTTONS'];
    KD.Text.draw(TITLES[page], px + 8, py + 5, 'WATER.3', { shadow: 'INK.0' });
    R(px + 8, py + 15, pw - 16, 1, 'GOLD.0');

    if (page === 0) storyPage(ctx, px, py + 20, pw, ph - 26);
    else if (page === 1) loopPage(px, py + 20, pw);
    else keysPage(px, py + 20, pw);

    /* the pager */
    for (let k = 0; k < 3; k++) {
      const dx = cx - 14 + k * 12;
      R(dx, KD.H - 22, 7, 7, k === page ? 'GOLD.3' : 'INK.2');
      R(dx, KD.H - 22, 7, 1, k === page ? 'WHITE' : 'INK.3');
    }
    if (page > 0 && KD.UI.button(px, KD.H - 25, 56, 13, 'BACK', {})) page--;
    if (page < 2 && KD.UI.button(px + pw - 56, KD.H - 25, 56, 13, 'NEXT', { key: 'Enter' })) page++;
    if (page === 2 && KD.UI.button(px + pw - 56, KD.H - 25, 56, 13, 'DONE', { key: 'Enter' })) leave();
    KD.Text.draw('ESC  -  BACK', cx, KD.H - 10, 'INK.3', { tiny: true, align: 'center' });
  }

  function storyPage(ctx, x, y, w, h) {
    /* the man himself, on the right, so the page is not a wall of text */
    if (KD.PX.hasAny('ti_king')) {
      const s = KD.PX.get('ti_king0');
      if (w > 300) {
        KD.PX.blit(ctx, KD.PX.frameOf('ti_king', t), x + w - 40, y + h - 2);
      }
    }
    const tw = w > 300 ? w - 96 : w - 16;
    const lh = KD.Text.H(true) + 2;
    for (let i = 0; i < STORY.length; i++) {
      if (y + 2 + i * lh > y + h - lh) break;
      KD.Text.draw(STORY[i], x + 8, y + 2 + i * lh,
                   STORY[i].indexOf('KING') >= 0 || STORY[i].indexOf('DEEP') >= 0
                     ? 'BONE.2' : 'BONE.1',
                   { tiny: true, max: tw });
    }
  }

  function loopPage(x, y, w) {
    const lh = KD.Text.H(true) + 2;
    let ry = y + 1;
    for (const [n, name, l1, l2] of LOOP) {
      if (ry > KD.H - 44) break;
      /* the numbered stud */
      R(x + 7, ry, 11, 11, 'GOLD.1');
      R(x + 7, ry, 11, 1, 'GOLD.3');
      KD.Text.draw(n, x + 12, ry + 2, 'INK.0', { tiny: true, align: 'center' });
      KD.Text.draw(name, x + 22, ry, 'GOLD.3', { tiny: true });
      const off = KD.Text.width(name, { tiny: true }) + 28;
      KD.Text.draw(l1, x + off, ry, 'BONE.1', { tiny: true, max: w - off - 8 });
      KD.Text.draw(l2, x + 22, ry + lh, 'BONE.0', { tiny: true, max: w - 30 });
      ry += lh * 2 + 3;
    }
  }

  function keysPage(x, y, w) {
    const rows = keyRows();
    const lh = KD.Text.H(true) + 3;
    const col = Math.min(112, Math.round(w * 0.34));
    for (let i = 0; i < rows.length; i++) {
      const ry = y + 1 + i * lh;
      if (ry > KD.H - 40) break;
      if (rows[i][0]) {
        R(x + 7, ry - 1, col - 4, lh - 1, 'INK.2');
        R(x + 7, ry - 1, col - 4, 1, 'INK.3');
        KD.Text.draw(rows[i][0], x + 10, ry, 'WATER.3', { tiny: true, max: col - 10 });
      }
      KD.Text.draw(rows[i][1], x + col + 8, ry, 'BONE.1',
                   { tiny: true, max: w - col - 18 });
    }
  }

  return { enter, update, draw };
})();
