/* ============================================================
   scenes/circuit.js - tonight's card.

   Five tiers in a flooded quarry nobody official knows about,
   three handlers deep each. You cannot enter a tier until you
   have beaten everybody in the one below, so the ladder IS the
   progression and the money is only how you keep up with it.

   Every opponent is hand-written with a name and a line, because
   a man with a name and a line is somebody you want to beat and
   a procedurally generated one is a number in a list. The last
   three are people you know.
   ============================================================ */
KD.Scenes.circuit = (function () {
  const P = KD.Pod;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);
  let t = 0, tier = 0, sel = 0, msg = '', msgT = 0, confirm = null;

  function enter() {
    t = 0; confirm = null;
    P.init();
    tier = P.standing();
    sel = 0;
  }
  const say = (s) => { msg = s; msgT = 3.0; };

  function update(dt) {
    t += dt;
    if (msgT > 0) msgT -= dt;
    KD.State.tick(dt);
    KD.Fx.update(dt);

    if (confirm) {
      if (KD.In.isHit('Escape')) { confirm = null; KD.Sfx.play('click'); return; }
      if (KD.In.isHit('Space', 'Enter', 'KeyE') || KD.In.mouse.click) {
        KD.In.consumedClick();
        go(confirm);
      }
      return;
    }
    if (KD.In.isHit('Escape') || KD.In.isHit('KeyQ')) { KD.Game.go('pens', {}); return; }
    const card = P.tierCard(tier);
    if (KD.In.isHit('ArrowUp', 'KeyW')) { sel = (sel + card.length - 1) % card.length; KD.Sfx.play('click'); }
    if (KD.In.isHit('ArrowDown', 'KeyS')) { sel = (sel + 1) % card.length; KD.Sfx.play('click'); }
    if (KD.In.isHit('ArrowLeft', 'KeyA')) { tier = Math.max(0, tier - 1); sel = 0; KD.Sfx.play('click'); }
    if (KD.In.isHit('ArrowRight', 'KeyD')) {
      tier = Math.min(P.TIERS.length - 1, tier + 1); sel = 0; KD.Sfx.play('click');
    }
    if (KD.In.isHit('Space', 'Enter', 'KeyE')) pick(card[sel]);
  }

  function pick(entry) {
    if (!entry) return;
    if (!P.tierOpen(entry.t)) { say('You have not earned this card yet.'); KD.Sfx.play('deny'); return; }
    const d = P.active();
    if (!d) { say('You have nothing to enter.'); KD.Sfx.play('deny'); return; }
    if (!P.fit(d)) { say(d.name + ' needs ' + d.hurt + ' more days.'); KD.Sfx.play('deny'); return; }
    const T = P.TIERS[entry.t];
    if (KD.State.S.clams < T.fee) { say('The fee is ' + T.fee + 'c.'); KD.Sfx.play('deny'); return; }
    confirm = entry;
    KD.Sfx.play('open');
  }

  function go(entry) {
    const T = P.TIERS[entry.t];
    KD.State.spend(T.fee);
    KD.State.save();
    confirm = null;
    KD.Game.go('battle', { entry: entry });
  }

  /* ================================================================
     THE ROOM
     ================================================================ */
  function room() {
    const W = KD.W, H = KD.H;
    R(0, 0, W, H, 'INK.0');
    /* the pit, seen from the gantry: a bright ring of water in the dark */
    const cy = Math.round(H * 0.42);
    for (let k = 10; k >= 0; k--) {
      const w = Math.round(W * (0.30 + k * 0.055));
      const h = Math.round(14 + k * 7);
      const col = k > 7 ? 'INK.1' : k > 5 ? 'DEEP.0' : k > 3 ? 'DEEP.1' : k > 1 ? 'DEEP.2' : 'WATER.0';
      R((W - w) / 2, cy - h / 2, w, h, col);
    }
    /* lamps round the rim */
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + t * 0.05;
      const x = Math.round(W / 2 + Math.cos(a) * W * 0.42);
      const y = Math.round(cy + Math.sin(a) * H * 0.30);
      const lit = (Math.floor(t * 3) + i) % 7 !== 0;
      R(x - 2, y - 2, 5, 5, lit ? 'GOLD.1' : 'INK.2');
      R(x - 1, y - 1, 3, 3, lit ? 'GOLD.3' : 'INK.3');
    }
    /* silhouettes leaning over the rail */
    for (let i = 0; i < 22; i++) {
      const x = Math.round((i * 47 + 9) % W);
      const y = Math.round(H * 0.14 + ((i * 13) % 3) * 4);
      const sway = Math.round(Math.sin(t * 1.1 + i) * 1.4);
      R(x + sway, y, 3, 7, 'INK.1');
      R(x + sway, y - 2, 3, 2, 'INK.2');
    }
    R(0, Math.round(H * 0.22), W, 1, 'STONE.0');
    R(0, Math.round(H * 0.22) + 1, W, 1, 'INK.0');
  }

  function tierStrip() {
    const W = KD.W;
    R(0, 0, W, 13, 'INK.0');
    R(0, 13, W, 1, 'ROT.1');
    let x = 4;
    P.TIERS.forEach((T, i) => {
      const lab = String(i + 1);
      const open = P.tierOpen(i);
      const clear = P.tierClear(i);
      const on = i === tier;
      R(x, 2, 11, 9, on ? 'ROT.2' : 'INK.1');
      KD.Screen.frame(x, 2, 11, 9, clear ? 'GOLD.2' : open ? 'ROT.3' : 'INK.2');
      KD.Text.draw(lab, x + 5, 4, clear ? 'GOLD.3' : open ? 'BONE.2' : 'INK.3',
                   { tiny: true, align: 'center' });
      if (KD.UI.inside(x, 2, 11, 9) && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick(); tier = i; sel = 0;
      }
      x += 13;
    });
    KD.Text.draw(P.TIERS[tier].name.toUpperCase(), W / 2, 3, 'ROT.3',
                 { tiny: true, align: 'center' });
    KD.Text.draw(KD.State.S.clams + 'c', W - 4, 3, 'GOLD.3', { tiny: true, align: 'right' });
  }

  function rows(ctx) {
    const W = KD.W, H = KD.H;
    const card = P.tierCard(tier);
    const T = P.TIERS[tier];
    const open = P.tierOpen(tier);
    const w = Math.min(W - 12, 380);
    const x = Math.round((W - w) / 2);
    const y0 = 18;
    /* Three rows filling the whole card, because three handlers with a
       name each is the entire tier and there is nothing else to look at.
       The animal is drawn big enough to tell a bull from a spinner. */
    const gap = 5;
    const rh = Math.floor((H - 24 - y0 - gap * 2) / card.length);
    const aw = Math.min(112, rh * 2 + 8), ah = Math.round(aw * 52 / 112);
    card.forEach((e, i) => {
      const ry = y0 + i * (rh + gap);
      const on = i === sel;
      const done = P.beaten(e);
      const hot = KD.UI.inside(x, ry, w, rh);
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick(); sel = i; pick(e);
      }
      R(x - 1, ry - 1, w + 2, rh + 2, 'INK.0');
      R(x, ry, w, rh, on || hot ? 'DEEP.1' : 'DEEP.0');
      /* a lit top edge, so the selected row reads as raised */
      R(x, ry, w, 1, on ? 'DEEP.3' : 'INK.2');
      KD.Screen.frame(x, ry, w, rh, done ? 'KELP.1' : on ? 'GOLD.2' : 'INK.2');
      if (!open) R(x + 1, ry + 1, w - 2, rh - 2, 'INK.1');
      /* their animal, in a lit alcove on the left */
      const foe = P.foeOf(e);
      const ax = x + 4, ay = ry + Math.round((rh - ah) / 2);
      R(ax, ry + 2, aw + 2, rh - 4, on ? 'DEEP.2' : 'INK.1');
      R(ax, ry + 2, aw + 2, 1, on ? 'DEEP.3' : 'INK.2');
      const c = KD.Dolph.get(foe, Math.floor(t * 1.6 + i) % 2 ? 'cruise1' : 'cruise0');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c, 0, 0, KD.Dolph.W, KD.Dolph.H, ax + 1, ay, aw, ah);
      const tx = ax + aw + 9;
      const tw = w - (tx - x) - 74;
      KD.Text.draw(e.who.toUpperCase(), tx, ry + 5,
                   done ? 'KELP.3' : open ? 'GOLD.3' : 'INK.3', { shadow: 'INK.0' });
      KD.Text.draw(foe.name.toUpperCase() + '  -  ' + P.BIAS[foe.sp].name +
                   '  LV' + foe.lvl + '  RTG ' + P.rating(foe),
                   tx, ry + 17, 'BONE.1', { tiny: true });
      /* the line, wrapped, because a man with a name and a line is
         somebody you want to beat and half a line is nothing */
      const lines = KD.Text.wrap(e.line || '', tw, { tiny: true });
      for (let k = 0; k < Math.min(3, lines.length); k++) {
        KD.Text.draw(lines[k], tx, ry + 28 + k * 9, 'INK.3', { tiny: true });
      }
      KD.Text.draw(done ? 'BEATEN' : (open ? T.purse + 'c' : 'LOCKED'),
                   x + w - 5, ry + 5, done ? 'KELP.3' : open ? 'GOLD.3' : 'INK.3',
                   { align: 'right', shadow: 'INK.0' });
      if (open && !done) {
        KD.Text.draw('fee ' + T.fee + 'c', x + w - 5, ry + 18, 'BLOOD.2',
                     { tiny: true, align: 'right' });
      }
      if (on && open && !done) {
        KD.Text.draw('SPACE', x + w - 5, ry + rh - 11, 'GOLD.2',
                     { tiny: true, align: 'right' });
      }
    });
    /* who you are entering */
    const d = P.active();
    const fy = H - 18;
    R(0, fy - 2, W, 20, 'INK.0');
    R(0, fy - 2, W, 1, 'GOLD.0');
    if (d) {
      KD.Text.draw('ENTERING: ' + d.name.toUpperCase() + '  (' + P.BIAS[d.sp].name +
                   ' LV' + d.lvl + ', RTG ' + P.rating(d) + ')',
                   5, fy + 2, P.fit(d) ? 'BONE.2' : 'BLOOD.3', { tiny: true });
    } else {
      KD.Text.draw('NOTHING TO ENTER', 5, fy + 2, 'BLOOD.3', { tiny: true });
    }
    KD.Text.draw(KD.touch ? 'tap a fight   -   tap a pit number'
                          : 'ARROWS choose   -   SPACE enter   -   Q back to the yard',
                 W - 5, fy + 2, 'BONE.0', { tiny: true, align: 'right' });
  }

  function confirmCard(ctx) {
    const e = confirm, T = P.TIERS[e.t];
    const foe = P.foeOf(e), mine = P.active();
    const DW = KD.Dolph.W, DH = KD.Dolph.H;
    const w = Math.min(KD.W - 14, DW * 2 + 40), h = 150;
    const x = Math.round((KD.W - w) / 2), y = Math.round((KD.H - h) / 2);
    /* a SOLID blackout, not a dither - a dither this large is noise */
    R(0, 0, KD.W, KD.H, 'INK.0');
    R(x - 2, y - 2, w + 4, h + 4, 'INK.0');
    R(x, y, w, h, 'DEEP.0');
    R(x, y, w, 1, 'DEEP.2');
    KD.Screen.frame(x, y, w, h, 'GOLD.0');
    KD.Text.draw('MATCHED', KD.W / 2, y + 6, 'GOLD.3',
                 { align: 'center', space: 1, shadow: 'INK.0' });
    R(x + 6, y + 18, w - 12, 1, 'INK.2');

    /* Both animals at FULL SIZE and facing each other. Nothing scaled -
       this is the last look you get before you pay the fee. */
    const ay = y + 24;
    R(x + 4, ay - 2, DW + 4, DH + 4, 'DEEP.1');
    R(x + w - DW - 8, ay - 2, DW + 4, DH + 4, 'DEEP.1');
    KD.Dolph.draw(ctx, mine, 'charge', x + 6, ay, {});
    KD.Dolph.draw(ctx, foe, 'charge', x + w - DW - 6, ay, { flip: true });
    KD.Text.draw('V', KD.W / 2, ay + DH / 2 - 4, 'BLOOD.3',
                 { align: 'center', shadow: 'INK.0' });

    const ny = ay + DH + 6;
    KD.Text.draw(mine.name.toUpperCase(), x + 8, ny, 'GOLD.3', { shadow: 'INK.0' });
    KD.Text.draw(foe.name.toUpperCase(), x + w - 8, ny, 'BLOOD.3',
                 { align: 'right', shadow: 'INK.0' });
    KD.Text.draw(P.BIAS[mine.sp].name.toUpperCase() + '  LV' + mine.lvl +
                 '  RTG ' + P.rating(mine), x + 8, ny + 12, 'BONE.1', { tiny: true });
    KD.Text.draw(P.BIAS[foe.sp].name.toUpperCase() + '  LV' + foe.lvl +
                 '  RTG ' + P.rating(foe), x + w - 8, ny + 12, 'BONE.1',
                 { tiny: true, align: 'right' });

    R(x + 6, ny + 24, w - 12, 1, 'INK.2');
    KD.Text.draw('FEE ' + T.fee + 'c   -   PURSE ' + T.purse + 'c', KD.W / 2, ny + 30,
                 'GOLD.2', { align: 'center', shadow: 'INK.0' });
    KD.Text.draw(KD.touch ? 'tap to go down' : 'SPACE to go down   -   ESC to walk away',
                 KD.W / 2, y + h - 11, 'BONE.0', { tiny: true, align: 'center' });
  }

  function draw(ctx) {
    room();
    rows(ctx);
    tierStrip();
    if (confirm) confirmCard(ctx);
    if (msgT > 0 && !confirm) {
      const tw = KD.Text.width(msg) + 14;
      const tx = Math.round((KD.W - tw) / 2);
      R(tx, KD.H - 40, tw, 14, 'INK.0');
      KD.Screen.frame(tx, KD.H - 40, tw, 14, 'BLOOD.2');
      KD.Text.draw(msg, KD.W / 2, KD.H - 37, 'BONE.2', { align: 'center' });
    }
  }

  return { enter, update, draw, _pick: pick, _go: go,
           _tier: (i) => { tier = i; sel = 0; } };
})();
