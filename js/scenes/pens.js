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
  let t = 0, tab = -1, sel = 0, msg = '', msgT = 0, flashT = 0;
  const TABS = ['THE POD', 'DRILLS', 'THE DEALER'];

  function enter() {
    t = 0; sel = 0; tab = -1;
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

    /* the guide, first: it eats the press that dismisses it so a tap
       cannot both close a tip and do the thing underneath it */
    if (KD.Coach.update(dt)) return;
    if (!KD.Coach.active()) {
      const d0 = P.active();
      if (d0) {
        if (KD.Coach.tip('pens_hero')) return;
        if ((d0.pts || 0) > 0 && KD.Coach.tip('pens_tree')) return;
        if ((d0.bond || 0) < 30 && KD.Coach.tip('pens_swim')) return;
        if (KD.Coach.tip('pens_keys')) return;
      }
    }

    /* TAB opens the drawer and walks the tabs; ESC shuts it. */
    if (KD.In.isHit('Tab')) {
      tab = tab + 1 >= TABS.length ? -1 : tab + 1;
      sel = 0; KD.Sfx.play('click');
    }
    if (panelOpen() && KD.In.isHit('Escape')) { tab = -1; KD.Sfx.play('click'); return; }
    if (KD.In.isHit('Digit1')) { tab = 0; sel = 0; }
    if (KD.In.isHit('Digit2')) { tab = 1; sel = 0; }
    if (KD.In.isHit('Digit3')) { tab = 2; sel = 0; }
    if (KD.In.isHit('KeyQ')) { KD.Game.go('circuit', {}); return; }
    if (KD.In.isHit('KeyT')) { KD.Game.go('tree', {}); return; }
    if (KD.In.isHit('KeyR')) { swimOff(); return; }
    if (KD.In.isHit('KeyE') && !panelOpen()) { tab = 1; sel = 0; KD.Sfx.play('open'); return; }
    if (KD.In.isHit('KeyZ')) { bed(); return; }

    const n = rowCount();
    if (n > 0) {
      if (KD.In.isHit('ArrowUp', 'KeyW')) { sel = (sel + n - 1) % n; KD.Sfx.play('click'); }
      if (KD.In.isHit('ArrowDown', 'KeyS')) { sel = (sel + 1) % n; KD.Sfx.play('click'); }
      if (KD.In.isHit('Space', 'Enter', 'KeyE')) commit();
    }
  }

  function rowCount() {
    if (tab < 0) return 0;
    if (tab === 0) return P.pod().length;
    if (tab === 1) return P.DRILLS.length;
    return P.market().length;
  }

  function commit() {
    if (tab < 0) return;
    if (tab === 0) {
      const d = P.pod()[sel];
      if (d) { P.setActive(d); say(d.name + ' is up.', 'GOLD.3'); KD.State.save(); }
      return;
    }
    if (tab === 1) {
      /* a drill is a round you play now, not a number you collect */
      const dr = P.DRILLS[sel];
      const d = P.active();
      if (!d) return;
      if (!P.fit(d)) { say(d.name + ' is not fit to work.', 'BLOOD.2'); return; }
      if (KD.Day.energy() < dr.cost) { say('Nothing left in the day.', 'BLOOD.2'); return; }
      KD.Day.spend(dr.cost);
      KD.Game.go('drill', { drill: dr });
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
  /* THREE BANDS, not seven.

     The yard had grown a strip per feature: a header, a bright teal
     water band, a rope walk, six pens, a button row, a tab row and a
     panel - seven horizontal slabs in two hundred and forty rows, none
     of them looking more important than any other, and five identical
     EMPTY boxes taking a third of the screen.

       0-14     the day, the money, what is left of it
       14-158   THE YARD: one water column, the shed, the cart, and the
                animal that is up, big, in the middle of it, with your
                pod along the bottom - the ones you OWN, and one slot.
       158-240  four things you can do. The card, the drills and the
                dealer live in a drawer that only exists while open.
     ------------------------------------------------------------------ */
  const HEAD = 14, BAR = 150;
  const BIGY = 26, BIGH = 74, PENY = 108, PENH = 38;

  function water() {
    const W = KD.W, H = KD.H;
    /* ONE ramp, top to bottom. It opened on WATER.1 - a bright cyan -
       and dropped to DEEP.0 a third of the way down, which read as two
       different games stitched together at the waterline. */
    const BANDS = [[0, 'DEEP.3'], [0.16, 'DEEP.2'], [0.42, 'DEEP.1'],
                   [0.66, 'DEEP.0'], [0.88, 'INK.1']];
    for (let i = 0; i < BANDS.length; i++) {
      const y0 = Math.round(H * BANDS[i][0]);
      const y1 = i + 1 < BANDS.length ? Math.round(H * BANDS[i + 1][0]) : H;
      R(0, y0, W, y1 - y0, BANDS[i][1]);
    }
    for (let i = 0; i < 3; i++) {
      const x = Math.round(((i * 151 + t * 5) % (W + 90)) - 45);
      for (let k = 0; k < 10; k++) {
        const w = Math.max(2, 9 - (k >> 1));
        R(x + k * 3, HEAD + k * 5, w, 4, k < 4 ? 'DEEP.4' : 'DEEP.3');
      }
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.round((i * 191 + t * 6) % W);
      const y = Math.round((i * 71 - t * 4 + H * 6) % H);
      R(x, y, 1, 1, i % 3 ? 'DEEP.3' : 'WATER.0');
    }
  }

  /* the shed on the left and the dealer's cart on the right, both up in
     the band with the big animal so nothing lands on a pen */
  function buildings() {
    shed(4, BIGY + 2);
    cart(KD.W - 60, BIGY + 8);
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
  /* YOUR POD, as portraits of the animals you actually have, plus one
     slot with a plus in it. Six identical boxes reading EMPTY was a
     third of the screen spent telling you about things you do not own. */
  function bays(ctx) {
    const W = KD.W;
    const pod = P.pod();
    const act = P.active();
    const n = Math.min(P.PENS, pod.length + 1);
    const bw = Math.min(62, Math.floor((W - 20) / n) - 4), gap = 4;
    const total = n * (bw + gap) - gap;
    const x0 = Math.round((W - total) / 2);
    R(0, PENY - 4, W, 2, 'STONE.0');
    R(0, PENY - 2, W, PENH + 6, 'INK.1');
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (bw + gap);
      const d = pod[i];
      const on = d && act && act.uid === d.uid;
      const hot = KD.UI.inside(x, PENY, bw, PENH);
      R(x, PENY, bw, PENH, on ? 'DEEP.1' : 'INK.0');
      R(x + 1, PENY + 1, bw - 2, 1, on ? 'DEEP.3' : 'INK.2');
      KD.Screen.frame(x, PENY, bw, PENH, on ? 'GOLD.3' : (hot ? 'BONE.0' : 'INK.2'));
      if (!d) {
        const cx = x + (bw >> 1), cy = PENY + (PENH >> 1);
        R(cx - 7, cy - 2, 15, 4, 'INK.2');
        R(cx - 2, cy - 7, 4, 15, 'INK.2');
        continue;
      }
      const c = KD.Dolph.get(d, (i + Math.floor(t * 1.4)) % 2 ? 'cruise1' : 'cruise0');
      const dw = bw - 8, dh = Math.round(dw * KD.Dolph.H / KD.Dolph.W);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, 0, 0, KD.Dolph.W, KD.Dolph.H,
                    Math.round(x + 4), Math.round(PENY + 5 + Math.sin(t * 1.3 + i) * 2),
                    dw, dh);
      KD.Text.draw(d.name.toUpperCase(), x + (bw >> 1), PENY + PENH - 8,
                   on ? 'GOLD.3' : 'BONE.1',
                   { tiny: true, align: 'center', shadow: 'INK.0' });
      /* mending, or a point waiting - the only two marks worth making */
      if (!P.fit(d) && KD.PX.has('ic_hurt')) {
        KD.PX.blit(ctx, 'ic_hurt', x + bw - 16, PENY + 1, { anchor: false });
      } else if (KD.Tree && KD.Tree.points(d) > 0) {
        R(x + bw - 7, PENY + 3, 4, 4, 'GOLD.3');
      }
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) {
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
  /* A stat is an ICON and a bar. SPD / POW / STA / SPI were four
     three-letter abbreviations you had to learn before the panel meant
     anything; a wing, a hammer, a lung and a flame mean it on sight. */
  const STAT_ICON = { spd: 'ic_spd', pow: 'ic_pow', sta: 'ic_sta', spi: 'ic_spi' };
  function statBar(ctx, x, y, w, key, v, col) {
    const ic = STAT_ICON[key];
    if (ic && KD.PX.has(ic)) KD.PX.blit(ctx, ic, x, y - 5, { anchor: false });
    R(x + 18, y, w, 5, 'INK.1');
    const f = Math.max(0, Math.min(1, v / 60));
    R(x + 18, y, Math.round(w * f), 5, col);
    R(x + 18, y, Math.round(w * f), 1, KD.PAL.shift(col, 1));
    KD.Text.draw(String(v), x + 18 + w + 3, y, 'BONE.2', { tiny: true });
  }

  function card(ctx, d, x, y, w) {
    if (!d) return;
    const T = P.temperOf(d.temper);
    KD.Text.draw(d.name.toUpperCase(), x, y, 'GOLD.3', { shadow: 'INK.0' });
    KD.Text.draw(P.BIAS[d.sp].name + '  -  ' + T.name, x, y + 11, 'BONE.1', { tiny: true });
    KD.Text.draw('LV ' + (d.lvl || 1) + '   ' + (d.wins || 0) + 'W ' + (d.losses || 0) + 'L',
                 x + w, y, 'BONE.0', { tiny: true, align: 'right' });
    /* a point waiting to be spent is the loudest thing on the card */
    const pts = KD.Tree ? KD.Tree.points(d) : 0;
    if (pts > 0) {
      const px = x + w - 26;
      for (let k = 0; k < Math.min(3, pts); k++) R(px + k * 8, y + 12, 6, 6, 'GOLD.3');
      KD.Text.draw('T', x + w, y + 12, 'GOLD.2', { tiny: true, align: 'right' });
    }
    statBar(ctx, x, y + 22, 48, 'spd', d.spd, 'WATER.2');
    statBar(ctx, x, y + 32, 48, 'pow', d.pow, 'BLOOD.2');
    statBar(ctx, x, y + 42, 48, 'sta', d.sta, 'KELP.2');
    statBar(ctx, x + 88, y + 22, 48, 'spi', d.spi, 'ROT.2');
    /* bond, and the moves it has bought - as the move ICONS, so you can
       see what this animal can actually do without reading a list */
    if (KD.PX.has('ic_bond')) KD.PX.blit(ctx, 'ic_bond', x + 88, y + 27, { anchor: false });
    R(x + 106, y + 32, 48, 5, 'INK.1');
    R(x + 106, y + 32, Math.round(48 * (d.bond || 0) / 100), 5, 'CORAL.2');
    const mv = P.movesOf(d);
    for (let k = 0; k < mv.length; k++) {
      const C = P.CLS[mv[k].cls] || P.CLS.hold;
      const mx = x + 88 + k * 19;
      R(mx, y + 41, 17, 17, 'INK.1');
      KD.Screen.frame(mx, y + 41, 17, 17, C.dim);
      if (KD.PX.has(mv[k].icon)) KD.PX.blit(ctx, mv[k].icon, mx, y + 41, { anchor: false });
    }
    KD.Text.draw(T.note || '', x + 88 + mv.length * 19 + 6, y + 46, 'INK.3',
                 { tiny: true, max: Math.max(40, w - 100 - mv.length * 19) });
  }

  /* The card, the drills and the dealer live in a DRAWER now. It used to
     be nailed to the bottom of the screen whether you wanted it or not,
     which is why the yard had no room left to be a yard. Nothing is open
     by default; a tab opens one over everything, ESC shuts it. */
  const panelOpen = () => tab >= 0;
  function panel(ctx) {
    if (!panelOpen()) return;
    const W = KD.W, H = KD.H;
    const pw = W - 12, ph = 112;
    const x = 6, y = H - ph - 6;
    /* a SOLID blackout behind it - what is underneath is not competing */
    R(0, 0, W, H, 'INK.0');
    R(x - 1, y - 1, pw + 2, ph + 2, 'INK.0');
    R(x, y, pw, ph, 'DEEP.0');
    KD.Screen.frame(x, y, pw, ph, 'GOLD.0');
    R(x + 1, y + 1, pw - 2, 1, 'DEEP.2');
    let tx = x + 4;
    TABS.forEach((lab, i) => {
      const tw = KD.Text.width(lab, { tiny: true }) + 10;
      const on = i === tab;
      R(tx, y - 10, tw, 12, on ? 'GOLD.0' : 'INK.1');
      KD.Screen.frame(tx, y - 10, tw, 12, on ? 'GOLD.2' : 'INK.2');
      KD.Text.draw(lab, tx + tw / 2, y - 7, on ? 'GOLD.3' : 'BONE.0',
                   { tiny: true, align: 'center' });
      if (KD.UI.inside(tx, y - 10, tw, 12) && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick(); tab = i; sel = 0; KD.Sfx.play('click');
      }
      tx += tw + 2;
    });
    KD.Text.draw(KD.touch ? 'tap away' : 'ESC', x + pw - 4, y - 7, 'INK.3',
                 { tiny: true, align: 'right' });
    /* the animal this is about, up top where the yard was */
    const d0 = P.active();
    if (d0 && tab !== 2) {
      const c = KD.Dolph.get(d0, Math.floor(t * 1.3) % 2 ? 'cruise1' : 'cruise0');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, 0, 0, KD.Dolph.W, KD.Dolph.H,
                    Math.round((W - 96) / 2), 24, 96, 45);
    }
    if (tab === 0) card(ctx, P.pod()[sel] || P.active(), x + 8, y + 8, pw - 16);
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
      /* the four stats as tiny bars in their own colours - a shape you can
         compare between three rows without reading twelve numbers */
      const SB = [[d.spd, 'WATER.2'], [d.pow, 'BLOOD.2'], [d.sta, 'KELP.2'], [d.spi, 'ROT.2']];
      for (let k = 0; k < SB.length; k++) {
        const bx = x + 112 + k * 16;
        R(bx, ry + 2, 12, 11, 'INK.1');
        const bh = Math.max(1, Math.round(11 * Math.min(1, SB[k][0] / 60)));
        R(bx, ry + 13 - bh, 12, bh, can ? SB[k][1] : 'INK.2');
      }
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

  /* The four things you can do, as buttons with pictures on them - the
     same four on a keyboard and on a phone, so there is one layout to
     learn. This was a line of prose reading "Q the quarry - R swim with
     it - Z sleep - TAB tabs", which is a manual, not a control. */
  const ACTS = [
    { key: 'Q', icon: 'ic_quarry', col: 'ROT.3',   lab: 'FIGHT',
      act: () => KD.Game.go('circuit', {}) },
    { key: 'R', icon: 'ic_swim',   col: 'WATER.2', lab: 'SWIM',  act: () => swimOff() },
    { key: 'E', icon: 'ic_dr_pow', col: 'KELP.3',  lab: 'TRAIN',
      act: () => { tab = 1; sel = 0; KD.Sfx.play('open'); } },
    { key: 'Z', icon: 'ic_sleep',  col: 'BONE.1',  lab: 'SLEEP', act: () => bed() }
  ];

  /* FOUR THINGS YOU CAN DO, big enough to be the answer to "what now".
     This was a row of small chips wedged between the pens and a tab
     strip, over a panel that was always open - so the screen ended in
     three bands of interface with no hierarchy between them. */
  function keys(ctx) {
    const W = KD.W;
    const gap = 5;
    const bw = Math.floor((W - 12 - gap * 3) / 4), bh = 56;
    const x0 = Math.round((W - (bw * 4 + gap * 3)) / 2), y = BAR + 4;
    for (let i = 0; i < ACTS.length; i++) {
      const a2 = ACTS[i];
      const x = x0 + i * (bw + gap);
      const hot = KD.UI.inside(x, y, bw, bh);
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) { KD.In.consumedClick(); a2.act(); }
      R(x, y, bw, bh, hot ? 'DEEP.1' : 'INK.1');
      R(x + 1, y + 1, bw - 2, 1, hot ? 'DEEP.3' : 'INK.2');
      KD.Screen.frame(x, y, bw, bh, hot ? 'GOLD.3' : a2.col);
      if (KD.PX.has(a2.icon)) {
        KD.PX.blit(ctx, a2.icon, x + Math.round((bw - 16) / 2), y + 9, { anchor: false });
      }
      KD.Text.draw(a2.lab, x + (bw >> 1), y + 30, hot ? 'GOLD.3' : a2.col,
                   { align: 'center', shadow: 'INK.0' });
      if (!KD.touch) {
        KD.Text.draw(a2.key, x + (bw >> 1), y + 43, 'INK.3',
                     { tiny: true, align: 'center' });
      }
      if (a2.key === 'E') {
        const d0 = P.active();
        if (d0 && KD.Tree && KD.Tree.points(d0) > 0) R(x + bw - 8, y + 3, 5, 5, 'GOLD.3');
      }
    }
    /* under the buttons, where nothing else lives */
    KD.Text.draw(KD.touch ? 'tap a pen to change who fights'
                          : 'TAB  the card   -   T  its board',
                 W / 2, KD.H - 9, 'BONE.0', { tiny: true, align: 'center' });
  }

  function draw(ctx) {
    water();
    if (!panelOpen()) {
      buildings();
      hero(ctx);
      bays(ctx);
      keys(ctx);
    }
    head();
    panel(ctx);
    KD.Coach.draw();
  }

  return { enter, update, draw, _tab: (i) => { tab = i; sel = 0; }, _sel: (i) => { sel = i; },
           _commit: commit };
})();
