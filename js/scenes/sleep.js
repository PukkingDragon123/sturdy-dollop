/* ============================================================
   scenes/sleep.js - the end of a day.

   Stardew's best trick is not the farming, it is the SUMMARY:
   the moment where the day you just had is added up and handed
   back to you as three numbers. It is what turns "I dug some
   rock" into "that was a good Tuesday", and it is the reason
   you start another one.

   So going to bed is a scene, not a fade. What the bin sold,
   what grew in the ground, and what tomorrow is - and then the
   morning, in your own cove, with the energy back.
   ============================================================ */
KD.Scenes.sleep = (function () {
  let t = 0, phase = 'out', res = null, before = 0;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);

  function enter() {
    t = 0; phase = 'out';
    before = KD.Day.day();
    res = null;
    KD.Sfx.play('open');
  }

  function update(dt) {
    t += dt;
    if (phase === 'out') {
      if (t > 0.9) {
        res = KD.Day.sleep('bed');
        /* the animals mend, and the dealer restocks the cart */
        KD.Pod.newDay();
        phase = 'card'; t = 0;
      }
      return;
    }
    if (phase === 'card') {
      const go = KD.In.isHit('Space', 'Enter', 'KeyE', 'Escape') ||
                 KD.In.mouse.click || KD.In.actHit('act', 'use');
      if (go || t > 9) {
        KD.In.consumedClick();
        KD.State.save();
        KD.Game.go('pens', {});
      }
    }
  }

  function draw() {
    KD.Screen.clear('INK.0');
    /* a few slow motes so the black is water, not a dead panel */
    for (let k = 0; k < 30; k++) {
      const x = Math.round((k * 149 + t * (5 + (k % 5) * 3)) % KD.W);
      const y = Math.round((k * 71 - t * 7 + KD.H * 4) % KD.H);
      R(x, y, 1, 1, k % 3 ? 'DEEP.1' : 'DEEP.2');
    }
    if (phase === 'out') {
      const k = Math.min(1, t / 0.9);
      KD.Text.draw('...', KD.W / 2, KD.H / 2 - 4, k > 0.5 ? 'INK.3' : 'INK.2',
                   { align: 'center' });
      return;
    }

    /* ---- the card ---------------------------------------------- */
    const w = Math.min(300, KD.W - 40);
    const h = 146;
    const x = Math.round((KD.W - w) / 2);
    const y = Math.round((KD.H - h) / 2) - 6;
    const k = KD.Juice.outCubic(Math.min(1, t / 0.35));
    const yy = Math.round(y + (1 - k) * 14);

    R(x - 2, yy - 2, w + 4, h + 4, 'INK.0');
    R(x, yy, w, h, 'DEEP.0');
    R(x + 1, yy + 1, w - 2, 1, 'DEEP.2');
    KD.Screen.frame(x, yy, w, h, 'GOLD.0');
    KD.Screen.frame(x + 2, yy + 2, w - 4, h - 4, 'INK.2');

    /* the day that just ended, on a plate over the top edge */
    const lab = 'DAY ' + before + ' - ' + KD.Day.season();
    const lw = KD.Text.width(lab) + 12;
    R(x + (w - lw) / 2, yy - 7, lw, 13, 'INK.0');
    KD.Screen.frame(x + (w - lw) / 2, yy - 7, lw, 13, 'GOLD.0');
    KD.Text.draw(lab, x + w / 2, yy - 4, 'GOLD.3', { align: 'center', shadow: 'INK.0' });

    const P = KD.Pod;
    const pod = P.pod();
    const hurt = pod.filter((d) => !P.fit(d));
    const fit = pod.length - hurt.length;
    const beat = P.CARD.filter(P.beaten).length;
    const rows = [];
    rows.push(['In the pens', pod.length + ' / ' + P.PENS, 'BONE.2']);
    rows.push(['Fit to enter', fit ? String(fit) : 'none',
               fit ? 'KELP.3' : 'BLOOD.3']);
    rows.push(['Mending', hurt.length ? hurt.map((d) => d.name).join(', ') : 'nobody',
               hurt.length ? 'BLOOD.2' : 'INK.3']);
    rows.push(['Handlers beaten', beat + ' / ' + P.CARD.length, 'ROT.3']);
    rows.push(['Clams', KD.State.S.clams + 'c', 'GOLD.3']);

    rows.forEach(([a, b, col], i) => {
      const ry = yy + 20 + i * 16;
      KD.Text.draw(a, x + 14, ry, 'BONE.0', { tiny: true });
      KD.Text.draw(b, x + w - 14, ry - 1, col, { align: 'right', shadow: 'INK.0' });
      if (i < rows.length - 1) R(x + 12, ry + 11, w - 24, 1, 'INK.1');
    });

    const nx = 'DAY ' + KD.Day.day() + ' BEGINS';
    KD.Text.draw(nx, x + w / 2, yy + h - 18, 'WATER.3', { align: 'center', shadow: 'INK.0' });
    KD.Text.draw(KD.touch ? 'tap to get up' : 'SPACE to get up',
                 x + w / 2, yy + h + 8, 'INK.3', { tiny: true, align: 'center' });
  }

  return { enter, update, draw };
})();
