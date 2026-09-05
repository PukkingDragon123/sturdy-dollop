/* ============================================================
   scenes/pens.js - the yard. Where you keep them.

   This is the hub, and it is a FIXED SCENE rather than somewhere
   you walk: six pens cut into a quarry shelf, a rope walk in
   front of them, a shed, and the dealer's cart. Nothing to
   traverse, nothing to get lost in. Everything you can do to a
   dolphin, you do from here.

     THE POD      six pens. Pick one to work with; the one you
                  pick is the one that fights.
     DRILLS       four of them, each raising one stat, each
                  costing a chunk of the day. A stat in the
                  fifties is four sessions; a stat in the
                  eighties is a fortnight.
     THE WATER    swim with one. Bond is the gate on its moves,
                  so this is not a nice extra - it is how an
                  animal becomes dangerous.
     THE DEALER   three animals, restocked every morning, priced
                  off what they are worth. He does not tell you
                  their temperament. That is what the price is
                  for.
   ============================================================ */
KD.Scenes.pens = (function () {
  const P = KD.Pod;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);
  let t = 0, tab = 0, sel = 0, msg = '', msgT = 0, flashT = 0;
  const TABS = ['THE POD', 'DRILLS', 'THE DEALER'];

  function enter() {
    t = 0; sel = 0;
    P.init();
    KD.Day.init();
    if (!KD.State.S.market) P.restock();
  }
  const say = (s, c) => { msg = s; msgT = 3.2; flashT = 0.3; KD.State.say(s, c || 'BONE.2'); };

  function update(dt) {
    t += dt;
    if (msgT > 0) msgT -= dt;
    if (flashT > 0) flashT -= dt;
    KD.State.tick(dt);
    KD.Fx.update(dt);

    if (KD.In.isHit('Tab')) { tab = (tab + 1) % TABS.length; sel = 0; KD.Sfx.play('click'); }
    if (KD.In.isHit('Digit1')) { tab = 0; sel = 0; }
    if (KD.In.isHit('Digit2')) { tab = 1; sel = 0; }
    if (KD.In.isHit('Digit3')) { tab = 2; sel = 0; }
    if (KD.In.isHit('KeyQ')) { KD.Game.go('circuit', {}); return; }
    if (KD.In.isHit('KeyR')) { swimOff(); return; }
    if (KD.In.isHit('KeyZ')) { bed(); return; }

    const n = rowCount();
    if (n > 0) {
      if (KD.In.isHit('ArrowUp', 'KeyW')) { sel = (sel + n - 1) % n; KD.Sfx.play('click'); }
      if (KD.In.isHit('ArrowDown', 'KeyS')) { sel = (sel + 1) % n; KD.Sfx.play('click'); }
      if (KD.In.isHit('Space', 'Enter', 'KeyE')) commit();
    }
  }

  function rowCount() {
    if (tab === 0) return P.pod().length;
    if (tab === 1) return P.DRILLS.length;
    return P.market().length;
  }

  function commit() {
    if (tab === 0) {
      const d = P.pod()[sel];
      if (d) { P.setActive(d); say(d.name + ' is up.', 'GOLD.3'); KD.State.save(); }
      return;
    }
    if (tab === 1) {
      const dr = P.DRILLS[sel];
      const d = P.active();
      const g = P.train(d, dr);
      if (g) say(d.name + ': ' + dr.stat.toUpperCase() + ' +' + g + '.', 'KELP.3');
      return;
    }
    const row = P.market()[sel];
    if (row && P.buy(row)) {
      say('Bought ' + row.d.name + '.', 'GOLD.3');
      sel = 0;
    }
  }

  function swimOff() {
    const d = P.active();
    if (!d) return;
    if (!P.fit(d)) { say(d.name + ' is in no state to swim.', 'BLOOD.2'); return; }
    if (KD.Day.energy() < 20) { say('Nothing left in the day.', 'BLOOD.2'); return; }
    KD.Game.go('swim', {});
  }
  function bed() {
    KD.Game.go('sleep', {});
  }

  /* ================================================================
     THE YARD

     Laid out in four bands, top to bottom, because the first pass put
     the shed, the pens and the key hints on top of each other:

       0-16    the day, the standing, the money
       20-84   THE ONE THAT IS UP, drawn at 112 by 52 - full size, no
               scaling. It is the biggest thing in the game and the
               whole reason the art was redrawn; a stable where you
               cannot see the animal is a spreadsheet.
       88-130  the six pens, small
       134     the keys
       140+    the panel
     ================================================================ */
  const HEAD = 16, BIGY = 20, BIGH = 64, PENY = 88, PENH = 42;

  function water() {
    const W = KD.W, H = KD.H;
    const BANDS = [[0, 'WATER.1'], [0.10, 'WATER.0'], [0.30, 'DEEP.2'],
                   [0.55, 'DEEP.1'], [0.80, 'DEEP.0']];
    for (let i = 0; i < BANDS.length; i++) {
      const y0 = Math.round(H * BANDS[i][0]);
      const y1 = i + 1 < BANDS.length ? Math.round(H * BANDS[i + 1][0]) : H;
      R(0, y0, W, y1 - y0, BANDS[i][1]);
    }
    /* light off the surface, in solid bars - three, not four, because this
       scene draws a 112x52 animal every frame and the budget is real */
    for (let i = 0; i < 3; i++) {
      const x = Math.round(((i * 151 + t * 5) % (W + 90)) - 45);
      for (let k = 0; k < 12; k++) {
        const w = Math.max(2, 9 - (k >> 1));
        R(x + k * 3, k * 5, w, 4, k < 5 ? 'WATER.2' : 'WATER.1');
      }
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.round((i * 191 + t * 6) % W);
      const y = Math.round((i * 71 - t * 4 + H * 6) % H);
      R(x, y, 1, 1, i % 3 ? 'WATER.0' : 'WATER.2');
    }
  }

  /* the shed on the left and the dealer's cart on the right, both up in
     the band with the big animal so nothing lands on a pen */
  function buildings() {
    shed(4, BIGY + 6);
    cart(KD.W - 60, BIGY + 12);
  }

  function shed(x, y) {
    R(x, y + 10, 40, 30, 'WOOD.1');
    R(x, y + 10, 40, 2, 'WOOD.3');
    for (let i = 0; i < 40; i += 6) R(x + i, y + 14, 1, 26, 'WOOD.0');
    for (let k = 0; k < 6; k++) R(x - 2 + k, y + 4 + k, 44 - k * 2, 2, k < 2 ? 'RUST.2' : 'RUST.1');
    R(x + 13, y + 22, 14, 18, 'INK.0');
    R(x + 14, y + 23, 12, 17, 'WOOD.0');
    R(x + 32, y + 16, 5, 6, 'GOLD.1');
    R(x + 33, y + 17, 3, 4, 'GOLD.3');
  }

  function cart(x, y) {
    R(x, y + 12, 52, 18, 'WOOD.1');
    R(x, y + 12, 52, 2, 'WOOD.3');
    R(x + 2, y + 16, 48, 12, 'WOOD.0');
    for (let k = 0; k < 5; k++) R(x - 2, y + 4 + k, 56, 2, k % 2 ? 'CORAL.1' : 'BONE.1');
    for (const wx of [x + 8, x + 38]) {
      R(wx, y + 30, 8, 8, 'WOOD.0');
      R(wx + 2, y + 32, 4, 4, 'WOOD.2');
    }
    KD.Text.draw('STOCK', x + 26, y + 20, 'SAND.3', { tiny: true, align: 'center' });
  }

  /* ---- THE ONE THAT IS UP, at full size ----------------------------- */
  function hero(ctx) {
    const d = P.active();
    if (!d) {
      KD.Text.draw('NOBODY IN THE PENS', KD.W / 2, BIGY + 26, 'BLOOD.3',
                   { align: 'center', shadow: 'INK.0' });
      return;
    }
    const bob = Math.round(Math.sin(t * 1.5) * 3);
    const pose = Math.floor(t * 1.3) % 2 ? 'cruise1' : 'cruise0';
    const x = Math.round((KD.W - KD.Dolph.W) / 2);
    const y = BIGY + Math.round((BIGH - KD.Dolph.H) / 2) + bob;
    /* a shadow on the sand under it, so it is IN the water and not on it */
    const sw = 70 - Math.abs(bob) * 3;
    R((KD.W - sw) / 2, BIGY + BIGH - 3, sw, 3, 'DEEP.0');
    KD.Dolph.draw(ctx, d, pose, x, y, {});
    /* bubbles off the blowhole */
    for (let i = 0; i < 4; i++) {
      const f = ((t * 0.5 + i * 0.25) % 1);
      const bx = x + 74 + Math.round(Math.sin(f * 7 + i) * 3);
      const by = y + 8 - f * 26;
      if (by > BIGY - 6) R(bx, by, 2 - (i % 2), 2 - (i % 2), 'WATER.3');
    }
    if (!P.fit(d)) {
      const lab = 'MENDING - ' + d.hurt + (d.hurt === 1 ? ' DAY' : ' DAYS');
      const tw = KD.Text.width(lab, { tiny: true }) + 12;
      R((KD.W - tw) / 2, BIGY + 2, tw, 12, 'INK.0');
      KD.Screen.frame((KD.W - tw) / 2, BIGY + 2, tw, 12, 'BLOOD.2');
      KD.Text.draw(lab, KD.W / 2, BIGY + 5, 'BLOOD.3', { tiny: true, align: 'center' });
    }
  }

  /* ---- the six bays ------------------------------------------------- */
  function bays(ctx) {
    const W = KD.W;
    const bayW = Math.floor((W - 10) / P.PENS);
    const shelfY = PENY;
    R(0, shelfY - 3, W, 3, 'STONE.1');
    R(0, shelfY, W, PENH + 6, 'STONE.0');
    const act = P.active();
    const pod = P.pod();
    for (let i = 0; i < P.PENS; i++) {
      const x = 5 + i * bayW;
      const bw = bayW - 3;
      R(x, shelfY + 2, bw, PENH, 'DEEP.0');
      R(x, shelfY + 2, bw, 1, 'INK.0');
      KD.Screen.frame(x, shelfY + 2, bw, PENH, 'STONE.0');
      /* a post and a slack rope over each bay */
      R(x - 1, shelfY - 9, 3, 11, 'WOOD.1');
      R(x - 1, shelfY - 9, 3, 2, 'WOOD.3');
      for (let k = 0; k < bw; k += 3) {
        R(x + k, shelfY - 8 + Math.round(Math.sin(k * 0.5 + t) * 1), 2, 1, 'SAND.1');
      }
      const d = pod[i];
      if (!d) {
        KD.Text.draw('EMPTY', x + bw / 2, shelfY + 18, 'INK.2',
                     { tiny: true, align: 'center' });
        continue;
      }
      const c = KD.Dolph.get(d, (i + Math.floor(t * 1.4)) % 2 ? 'cruise1' : 'cruise0');
      const dw = Math.min(bw - 6, 54), dh = Math.round(dw * KD.Dolph.H / KD.Dolph.W);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, 0, 0, KD.Dolph.W, KD.Dolph.H,
                    Math.round(x + (bw - dw) / 2),
                    Math.round(shelfY + 8 + Math.sin(t * 1.3 + i) * 2), dw, dh);
      const on = act && act.uid === d.uid;
      if (on) {
        KD.Screen.frame(x, shelfY + 2, bw, PENH, 'GOLD.2');
        R(x + bw / 2 - 5, shelfY - 3, 10, 3, 'GOLD.3');
      }
      if (!P.fit(d)) {
        KD.Text.draw(d.hurt + 'd', x + bw - 3, shelfY + 5, 'BLOOD.3',
                     { tiny: true, align: 'right', shadow: 'INK.0' });
      }
      KD.Text.draw(d.name.toUpperCase(), x + bw / 2, shelfY + PENH - 9,
                   on ? 'GOLD.3' : 'BONE.1',
                   { tiny: true, align: 'center', shadow: 'INK.0' });
      /* clicking a bay puts that one up */
      if (KD.UI.inside(x, shelfY + 2, bw, PENH) && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick();
        P.setActive(d); sel = i; tab = 0;
        say(d.name + ' is up.', 'GOLD.3');
        KD.State.save();
      }
    }
  }

  /* ================================================================
     THE PANEL
     ================================================================ */
  function statBar(x, y, w, label, v, col) {
    KD.Text.draw(label, x, y, 'INK.3', { tiny: true });
    R(x + 22, y, w, 5, 'INK.1');
    const f = Math.max(0, Math.min(1, v / 60));
    R(x + 22, y, Math.round(w * f), 5, col);
    R(x + 22, y, Math.round(w * f), 1, KD.PAL.shift(col, 1));
    KD.Text.draw(String(v), x + 22 + w + 3, y, 'BONE.2', { tiny: true });
  }

  function card(d, x, y, w) {
    if (!d) return;
    const T = P.temperOf(d.temper);
    KD.Text.draw(d.name.toUpperCase(), x, y, 'GOLD.3', { shadow: 'INK.0' });
    KD.Text.draw(P.BIAS[d.sp].name + '  -  ' + T.name, x, y + 11, 'BONE.1', { tiny: true });
    KD.Text.draw('LV ' + (d.lvl || 1) + '   ' + (d.wins || 0) + 'W ' + (d.losses || 0) + 'L',
                 x + w, y, 'BONE.0', { tiny: true, align: 'right' });
    statBar(x, y + 22, 54, 'SPD', d.spd, 'WATER.2');
    statBar(x, y + 30, 54, 'POW', d.pow, 'BLOOD.2');
    statBar(x, y + 38, 54, 'STA', d.sta, 'KELP.2');
    statBar(x, y + 46, 54, 'SPI', d.spi, 'ROT.2');
    /* bond, and what it has unlocked */
    KD.Text.draw('BOND', x + 96, y + 22, 'INK.3', { tiny: true });
    R(x + 96, y + 30, 60, 5, 'INK.1');
    R(x + 96, y + 30, Math.round(60 * (d.bond || 0) / 100), 5, 'CORAL.2');
    const mv = P.movesOf(d).filter((m) => !m.guard).map((m) => m.name).join(', ');
    KD.Text.draw(mv, x + 96, y + 38, 'BONE.0', { tiny: true, max: w - 100 });
    KD.Text.draw(T.note || '', x + 96, y + 48, 'INK.3', { tiny: true, max: w - 100 });
  }

  function panel() {
    const W = KD.W, H = KD.H;
    const pw = W - 12, ph = 76;
    const x = 6, y = H - ph - 4;
    R(x - 1, y - 1, pw + 2, ph + 2, 'INK.0');
    R(x, y, pw, ph, 'DEEP.0');
    KD.Screen.frame(x, y, pw, ph, 'GOLD.0');
    R(x + 1, y + 1, pw - 2, 1, 'DEEP.2');
    /* tabs */
    let tx = x + 4;
    TABS.forEach((lab, i) => {
      const tw = KD.Text.width(lab, { tiny: true }) + 10;
      const on = i === tab;
      R(tx, y - 8, tw, 10, on ? 'GOLD.0' : 'INK.0');
      KD.Screen.frame(tx, y - 8, tw, 10, on ? 'GOLD.2' : 'INK.2');
      KD.Text.draw(lab, tx + tw / 2, y - 6, on ? 'GOLD.3' : 'INK.3',
                   { tiny: true, align: 'center' });
      if (KD.UI.inside(tx, y - 8, tw, 10) && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick(); tab = i; sel = 0; KD.Sfx.play('click');
      }
      tx += tw + 2;
    });

    if (tab === 0) card(P.pod()[sel] || P.active(), x + 8, y + 8, pw - 16);
    else if (tab === 1) drills(x + 8, y + 8, pw - 16);
    else dealer(x + 8, y + 8, pw - 16);
  }

  function rowPlate(x, y, w, on, can) {
    R(x, y, w, 15, on ? 'DEEP.1' : 'INK.0');
    KD.Screen.frame(x, y, w, 15, on ? 'GOLD.2' : 'INK.1');
    if (!can) R(x + 1, y + 1, w - 2, 13, 'INK.1');
  }

  function drills(x, y, w) {
    const d = P.active();
    KD.Text.draw(d ? 'WORKING: ' + d.name.toUpperCase() : 'NOBODY IS UP',
                 x, y, 'GOLD.3', { tiny: true });
    KD.Text.draw(Math.round(KD.Day.energy()) + ' / ' + KD.Day.energyMax() + ' LEFT TODAY',
                 x + w, y, 'KELP.3', { tiny: true, align: 'right' });
    P.DRILLS.forEach((dr, i) => {
      const ry = y + 12 + i * 16;
      const can = d && P.fit(d) && KD.Day.energy() >= dr.cost;
      const on = i === sel;
      const hot = KD.UI.inside(x, ry, w, 15);
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick(); sel = i; commit();
      }
      rowPlate(x, ry, w, on || hot, can);
      KD.Text.draw(dr.name.toUpperCase(), x + 5, ry + 2, can ? 'BONE.2' : 'INK.3', { tiny: true });
      KD.Text.draw(dr.note, x + 96, ry + 2, 'INK.3', { tiny: true, max: w - 150 });
      KD.Text.draw('+' + (d ? P.trainGain(d, dr.stat) : 0) + ' ' + dr.stat.toUpperCase(),
                   x + w - 52, ry + 2, 'KELP.3', { tiny: true, align: 'right' });
      KD.Text.draw(dr.cost + ' EN', x + w - 4, ry + 2,
                   can ? 'WATER.2' : 'BLOOD.3', { tiny: true, align: 'right' });
    });
  }

  function dealer(x, y, w) {
    KD.Text.draw('HE CAUGHT THESE LAST NIGHT', x, y, 'GOLD.3', { tiny: true });
    KD.Text.draw(KD.State.S.clams + 'c', x + w, y, 'GOLD.3',
                 { tiny: true, align: 'right' });
    const rows = P.market();
    if (!rows.length) {
      KD.Text.draw('Cart is empty. He restocks overnight.', x, y + 16, 'INK.3', { tiny: true });
      return;
    }
    rows.forEach((row, i) => {
      const ry = y + 12 + i * 16;
      const can = KD.State.S.clams >= row.price && P.pod().length < P.PENS;
      const on = i === sel;
      const hot = KD.UI.inside(x, ry, w, 15);
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick(); sel = i; commit();
      }
      rowPlate(x, ry, w, on || hot, can);
      const d = row.d;
      KD.Text.draw(d.name.toUpperCase(), x + 5, ry + 2, can ? 'BONE.2' : 'INK.3', { tiny: true });
      KD.Text.draw(P.BIAS[d.sp].name, x + 62, ry + 2, 'BONE.0', { tiny: true });
      KD.Text.draw('SPD ' + d.spd + '  POW ' + d.pow + '  STA ' + d.sta + '  SPI ' + d.spi,
                   x + 110, ry + 2, 'WATER.2', { tiny: true });
      KD.Text.draw(row.price + 'c', x + w - 4, ry + 2,
                   can ? 'GOLD.3' : 'BLOOD.3', { tiny: true, align: 'right' });
    });
  }

  /* ---- the top strip: the day, the money, the standing --------------- */
  function head() {
    const W = KD.W;
    R(0, 0, W, 14, 'INK.0');
    R(0, 14, W, 1, 'GOLD.0');
    KD.Text.draw('DAY ' + KD.Day.day() + '   ' + KD.Day.hhmm(), 5, 3, 'BONE.2', { tiny: true });
    const st = P.standing();
    KD.Text.draw('STANDING: ' + P.TIERS[st].name.toUpperCase(), W / 2, 3, 'ROT.3',
                 { tiny: true, align: 'center' });
    KD.Text.draw(KD.State.S.clams + 'c', W - 5, 3, 'GOLD.3', { tiny: true, align: 'right' });
    /* energy, as a thin line under the strip */
    const f = KD.Day.energy() / KD.Day.energyMax();
    R(0, 15, Math.round(W * f), 2, f > 0.4 ? 'KELP.2' : f > 0.15 ? 'GOLD.2' : 'BLOOD.2');
  }

  function keys() {
    if (KD.touch) return;                 /* the buttons say it instead */
    /* on a plate of its own, in bone, because a hint you cannot read is
       not a hint */
    const s = 'Q the quarry   -   R swim with it   -   Z sleep   -   TAB tabs';
    const tw = KD.Text.width(s, { tiny: true }) + 12;
    const ty = PENY + PENH + 6;
    R((KD.W - tw) / 2, ty, tw, 12, 'INK.0');
    KD.Screen.frame((KD.W - tw) / 2, ty, tw, 12, 'INK.2');
    KD.Text.draw(s, KD.W / 2, ty + 3, 'BONE.1', { tiny: true, align: 'center' });
  }

  /* three big buttons for a thumb */
  function touchBtns() {
    if (!KD.touch) return;
    const W = KD.W;
    const bs = [['QUARRY', () => KD.Game.go('circuit', {}), 'ROT.2'],
                ['SWIM', swimOff, 'WATER.1'],
                ['SLEEP', bed, 'DEEP.2']];
    const bw = 62, gap = 4;
    let bx = Math.round((W - (bw * 3 + gap * 2)) / 2);
    for (const [lab, fn, col] of bs) {
      const by = PENY + PENH + 7;
      const hot = KD.UI.inside(bx, by, bw, 16);
      R(bx, by, bw, 16, hot ? col : 'INK.0');
      KD.Screen.frame(bx, by, bw, 16, col);
      KD.Text.draw(lab, bx + bw / 2, by + 4, hot ? 'INK.0' : 'BONE.2',
                   { tiny: true, align: 'center' });
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) { KD.In.consumedClick(); fn(); }
      bx += bw + gap;
    }
  }

  function draw(ctx) {
    water();
    buildings();
    hero(ctx);
    bays(ctx);
    head();
    touchBtns();
    keys();
    panel();
    if (msgT > 0) {
      const tw = KD.Text.width(msg) + 14;
      const tx = Math.round((KD.W - tw) / 2);
      R(tx, HEAD + 2, tw, 14, 'INK.0');
      KD.Screen.frame(tx, HEAD + 2, tw, 14, flashT > 0 ? 'WHITE' : 'GOLD.0');
      KD.Text.draw(msg, KD.W / 2, HEAD + 5, 'BONE.2', { align: 'center' });
    }
  }

  return { enter, update, draw, _tab: (i) => { tab = i; sel = 0; }, _sel: (i) => { sel = i; },
           _commit: commit };
})();
