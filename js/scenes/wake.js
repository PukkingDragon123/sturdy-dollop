/* ============================================================
   scenes/wake.js - ANOTHER DAY. ANOTHER MEAL.

   The first thing you do in this game is smash an alarm clock
   with a trident, on a timing check, in bed. That is the whole
   scene and it exists for three reasons: it says what kind of
   king he is before a word of story lands, it teaches the one
   button the rest of Act One is built on, and it means the game
   opens with you DOING something rather than reading a card.

   Miss and it rings again, faster and ruder. Miss three times
   and he gets it anyway - nobody is going to be stuck on the
   first screen of a game about a fat man and a barrel.
   ============================================================ */
KD.Scenes.wake = (function () {
  const K = KD.CastleKit;
  const R = KD.Screen.rect;

  let t = 0, phase = 'card', pt = 0;
  let sweep = 0, dir = 1, speed = 1.15, tries = 0;
  let hit = -1, msg = '', shock = 0, smashed = false, sat = 0;
  let baked = null, bw = 0, bh = 0;
  const BTNS = [];

  /* the green band you are aiming for, and the sliver inside it */
  const BAND = 0.16, PERFECT = 0.05, TARGET = 0.5;

  function enter() {
    t = 0; phase = 'card'; pt = 0;
    sweep = 0; dir = 1; speed = 1.15; tries = 0;
    hit = -1; msg = ''; shock = 0; smashed = false; sat = 0;
    if (!baked) bake();
  }

  /* ---- the bedchamber, baked once ---------------------------------- */
  function bake() {
    bw = 268; bh = 168;
    const c = document.createElement('canvas');
    c.width = bw; c.height = bh;
    const x2 = c.getContext('2d');
    x2.imageSmoothingEnabled = false;
    const FLOOR = 132;
    K.fill(x2, 0, 0, bw, bh, 'INK.0');
    K.stone(x2, 0, 0, bw, FLOOR, {});
    K.fill(x2, 0, FLOOR - 24, bw, 24, 'STONE.0');
    K.stone(x2, 0, FLOOR - 24, bw, 24, { bw: 14, bh: 7, mortar: 'INK.0' });
    K.fill(x2, 0, FLOOR - 25, bw, 2, 'GOLD.0');
    K.stringCourse(x2, 0, FLOOR - 62, bw);
    K.window(x2, 30, 14, 34, 56, { seed: 5 });
    K.window(x2, bw - 64, 14, 34, 56, { seed: 11 });
    K.banner(x2, bw / 2 - 11, 8, 22, 54, 'BLOOD');
    K.flagstone(x2, 0, FLOOR, bw, bh - FLOOR);
    K.fill(x2, 0, FLOOR, bw, 1, 'STONE.3');
    K.carpet(x2, 24, FLOOR, bw - 48, 16);
    K.litStrip(x2, 30, FLOOR + 1, 34, 3, 'STONE');
    K.litStrip(x2, bw - 64, FLOOR + 1, 34, 3, 'STONE');
    for (const tx of [12, bw - 18]) K.torchBracket(x2, tx, FLOOR - 58);
    bed(x2, 40, FLOOR);
    table(x2, 186, FLOOR);
    baked = c;
  }

  /* A four-poster. MATTRESS is the one number the rest of the scene keys
     off: the king is blitted so his waist lands on it, which is the whole
     difference between a man in a bed and a man standing behind one. */
  const BEDX = 40, BEDW = 128, MATTRESS = 34;
  function bed(x2, x, fy) {
    const w = BEDW, top = fy - MATTRESS;
    for (const px of [x - 4, x + w - 4]) {          // posts
      K.fill(x2, px, fy - 92, 9, 92, 'WOOD.1');
      K.fill(x2, px, fy - 92, 2, 92, 'WOOD.3');
      K.fill(x2, px - 1, fy - 97, 11, 6, 'WOOD.2');
      K.fill(x2, px + 2, fy - 102, 5, 5, 'GOLD.1');
      K.fill(x2, px + 2, fy - 102, 5, 1, 'GOLD.3');
    }
    K.fill(x2, x - 5, fy - 97, w + 10, 6, 'WOOD.2');  // canopy rail
    K.fill(x2, x - 5, fy - 97, w + 10, 1, 'WOOD.3');
    K.fill(x2, x - 2, fy - 91, w + 4, 13, 'BLOOD.1'); // valance above
    K.fill(x2, x - 2, fy - 91, w + 4, 2, 'BLOOD.2');
    for (let k = 0; k < w + 4; k += 8) K.fill(x2, x - 2 + k, fy - 79, 4, 4, 'BLOOD.0');
    /* the headboard, behind where he sits */
    K.fill(x2, x + 4, top - 40, w - 8, 40, 'WOOD.0');
    K.fill(x2, x + 6, top - 38, w - 12, 36, 'WOOD.1');
    K.fill(x2, x + 6, top - 38, w - 12, 2, 'WOOD.2');
    for (let k = 0; k < w - 16; k += 11) K.fill(x2, x + 10 + k, top - 34, 2, 30, 'WOOD.0');
    /* the frame and the mattress. The frame gets panels and a skirt, or the
       whole lower half of the bed is one brown slab. */
    K.fill(x2, x, top, w, MATTRESS, 'WOOD.1');
    K.fill(x2, x, top, w, 3, 'WOOD.2');
    K.fill(x2, x, top, w, 1, 'WOOD.3');
    for (let k = 6; k < w - 6; k += 21) {
      K.fill(x2, x + k, top + 6, 17, MATTRESS - 14, 'WOOD.0');
      K.fill(x2, x + k + 1, top + 7, 15, MATTRESS - 16, 'WOOD.1');
      K.fill(x2, x + k + 1, top + 7, 15, 1, 'WOOD.2');
    }
    K.fill(x2, x, fy - 14, w, 6, 'CLOTH.0');          // a skirt under it
    K.fill(x2, x, fy - 14, w, 1, 'CLOTH.1');
    K.fill(x2, x + 3, top - 9, w - 6, 10, 'BONE.1');
    K.fill(x2, x + 3, top - 9, w - 6, 2, 'BONE.2');
    K.fill(x2, x, fy - 8, w, 8, 'WOOD.0');
    /* a pillow, dented, on the far side */
    K.fill(x2, x + w - 44, top - 17, 34, 10, 'BONE.2');
    K.fill(x2, x + w - 44, top - 17, 34, 1, 'WHITE');
    K.fill(x2, x + w - 36, top - 14, 17, 4, 'BONE.1');
  }

  function table(x2, x, fy) {
    K.fill(x2, x, fy - 30, 34, 5, 'WOOD.2');
    K.fill(x2, x, fy - 30, 34, 1, 'WOOD.3');
    K.fill(x2, x + 3, fy - 25, 5, 25, 'WOOD.1');
    K.fill(x2, x + 26, fy - 25, 5, 25, 'WOOD.1');
    K.fill(x2, x + 3, fy - 14, 28, 3, 'WOOD.0');
    /* an empty plate and a goblet on its side: last night happened */
    K.fill(x2, x + 20, fy - 33, 11, 3, 'BONE.2');
    K.fill(x2, x + 21, fy - 34, 9, 1, 'BONE.1');
  }

  /* ---- update ------------------------------------------------------ */
  function update(dt) {
    t += dt; pt += dt;
    if (shock > 0) shock -= dt;
    if (phase === 'card') {
      if (pt > 2.6 || press()) { phase = 'check'; pt = 0; }
      return;
    }
    if (phase === 'check') {
      sweep += dir * speed * dt;
      if (sweep > 1) { sweep = 1; dir = -1; }
      if (sweep < 0) { sweep = 0; dir = 1; }
      if (press()) strike();
      return;
    }
    if (phase === 'strike') {
      sat = Math.min(1, sat + dt * 5);
      if (pt > 0.9) {
        if (smashed) { phase = 'after'; pt = 0; }
        else { phase = 'check'; pt = 0; sat = 0; }
      }
      return;
    }
    if (phase === 'after') {
      if (pt > 3.4 || press()) {
        if (KD.State && KD.State.S) { KD.State.S.flags.woke = 1; KD.State.save(); }
        KD.Game.go('castle', {});
      }
    }
  }

  /* consumedClick is a FUNCTION that eats the click, not a flag - reading it
     as a boolean made every tap on this screen a no-op. */
  function press() {
    const tapped = KD.In.mouse.click && !KD.UI.blocked();
    if (tapped) KD.In.consumedClick();
    return KD.In.actHit('use', 'KeyE') || KD.In.isHit('Space', 'Enter') ||
           KD.In.actHit('hit', 'KeyF') || tapped;
  }

  function strike() {
    const d = Math.abs(sweep - TARGET);
    tries++;
    hit = sweep;
    pt = 0; sat = 0;
    if (d < PERFECT) {
      msg = 'STRAIGHT THROUGH IT'; smashed = true; shock = 0.5;
      if (KD.Juice) KD.Juice.hit(0.28);
    } else if (d < BAND) {
      msg = 'GOT IT'; smashed = true; shock = 0.4;
      if (KD.Juice) KD.Juice.hit(0.2);
    } else if (tries >= 3) {
      /* nobody is getting stuck on the first screen of the game */
      msg = 'CLOSE ENOUGH'; smashed = true; shock = 0.3;
    } else {
      msg = ['MISSED. IT IS LAUGHING AT YOU.', 'AGAIN. IT IS GETTING LOUDER.'][tries - 1] || 'AGAIN.';
      smashed = false;
      speed += 0.34;                                 // it gets ruder
      if (KD.Sfx) KD.Sfx.play('hurt');
    }
    if (smashed && KD.Sfx) KD.Sfx.play('swing');
    phase = 'strike';
  }

  /* ---- draw -------------------------------------------------------- */
  function draw(ctx) {
    KD.Screen.clear('INK.0');
    const sh = shock > 0 ? Math.round(Math.sin(shock * 70) * shock * 8) : 0;
    const ox = Math.round((KD.W - bw) / 2) + sh;
    const oy = Math.round((KD.H - bh) / 2) - 6;
    ctx.drawImage(baked, 0, 0, bw, bh, ox, oy, bw, bh);
    const FLOOR = oy + 132;

    /* torch flames, live */
    K.flame(ctx, ox + 17, FLOOR - 60, t, 3);
    K.flame(ctx, ox + bw - 13, FLOOR - 60, t, 9);

    /* The king, sitting up. o.h crops the sprite rather than scaling it, so
       44 rows is head-to-waist; the anchor is still his feet, which is why
       the y is MATTRESS-relative and not sprite-relative. Getting that wrong
       first time left him standing behind the bed like a footman. */
    /* mtop is the bed FRAME top; the mattress surface is nine rows above it.
       The sprite is anchored at his feet and cropped to 44 rows, so to land
       his waist on the mattress the blit y is mattress + 60 - 44, which is
       mtop + 9 - hence the arithmetic rather than a hand-tuned number. The
       first two attempts put him behind the bed and then inside it. */
    const mtop = FLOOR - MATTRESS, surf = mtop - 9;
    const kx = ox + BEDX + 46, ky = mtop + 9;
    if (KD.PX.hasAny('kp_idle')) {
      KD.PX.blit(ctx, KD.PX.frameOf('kp_idle', t), kx, ky, { h: 44 });
    }
    /* the covers, over his legs and thrown back where he has swung out */
    const bx0 = ox + BEDX + 2, bwid = 124;
    R(bx0, surf, bwid, 13, 'CLOTH.1');
    R(bx0, surf, bwid, 2, 'CLOTH.2');
    R(bx0, surf + 11, bwid, 3, 'CLOTH.0');
    for (let k = 0; k < bwid; k += 11) R(bx0 + 3 + k, surf + 2, 2, 10, 'CLOTH.0');
    /* a rumpled fold where he pushed them off his chest */
    R(bx0 + 58, surf - 7, 46, 8, 'CLOTH.2');
    R(bx0 + 58, surf - 7, 46, 2, 'CLOTH.3');
    R(bx0 + 63, surf - 10, 34, 4, 'CLOTH.1');

    /* the alarm, on the table, ringing its head off */
    const ax = ox + 203, ay = FLOOR - 30;
    if (!smashed) {
      const jig = Math.round(Math.sin(t * 44) * 2);
      const nm = KD.PX.frameOf('al_ring', t * 2);
      if (KD.PX.has(nm)) KD.PX.blit(ctx, nm, ax + jig, ay);
      /* sound, as stepped brackets either side - no arcs in this game */
      for (let r = 0; r < 3; r++) {
        if (((t * 9) | 0) % 3 === r) continue;
        const d = 8 + r * 6;
        for (const s2 of [-1, 1]) {
          R(ax + s2 * d, ay - 24, 2, 8, 'GOLD.3');
          R(ax + s2 * (d - 2), ay - 27, 2, 3, 'GOLD.3');
          R(ax + s2 * (d - 2), ay - 15, 2, 3, 'GOLD.3');
        }
      }
    } else if (KD.PX.has('al_dead')) {
      KD.PX.blit(ctx, 'al_dead', ax, ay);
    }

    /* the trident coming down, when it comes down */
    if (phase === 'strike') {
      const k = KD.Juice ? KD.Juice.outCubic(sat) : sat;
      const ty = Math.round(oy - 40 + k * (FLOOR - 30 - (oy - 40)));
      drawTrident(ax, ty);
      if (smashed && sat > 0.85) burst(ax, ay - 6);
    }

    /* ---- the words and the check ----------------------------------- */
    if (phase === 'card') {
      const a = Math.min(1, pt / 0.4);
      const cy = Math.round(KD.H * 0.16);
      R(0, cy - 8, KD.W, 30, 'INK.0');
      R(0, cy - 8, KD.W, 1, 'GOLD.0');
      R(0, cy + 21, KD.W, 1, 'GOLD.0');
      KD.Text.draw('ANOTHER DAY.', KD.W / 2, cy - 3, 'GOLD.3',
                   { align: 'center', space: 2, shadow: 'INK.0' });
      KD.Text.draw('ANOTHER MEAL.', KD.W / 2, cy + 9, 'BONE.2',
                   { align: 'center', space: 1, shadow: 'INK.0' });
      if (a >= 1) {
        KD.Text.draw('the alarm has never survived a morning', KD.W / 2, KD.H - 22,
                     'BONE.0', { tiny: true, align: 'center' });
      }
    }

    if (phase === 'check' || phase === 'strike') gauge();

    if (phase === 'after') {
      const line = tries === 1 ? 'Six hundred years of kings and not one alarm clock.'
                 : 'It will be back tomorrow. They always come back.';
      KD.Talk.panel({ name: 'You', portrait: 'po_king' }, line, {});
    }
    if (KD.touch) { layout(); KD.In.buttons(BTNS); }
  }

  function drawTrident(x, y) {
    for (let r = 0; r < 9; r++) {
      R(x - 7, y - 46 + r * 2, 2, 2, 'WHITE');
      R(x - 1, y - 46 + r * 2, 2, 2, 'WHITE');
      R(x + 5, y - 46 + r * 2, 2, 2, 'WHITE');
    }
    R(x - 7, y - 28, 14, 3, 'WHITE');
    R(x - 7, y - 25, 14, 2, 'BONE.0');
    R(x - 2, y - 23, 4, 3, 'GOLD.2');
    R(x - 2, y - 20, 4, 60, 'WOOD.2');
    R(x - 2, y - 20, 1, 60, 'WOOD.3');
  }

  function burst(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = i * 0.449;
      const r = 6 + (1 - sat) * 4 + (i % 4) * 5;
      R(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.7),
        2, 2, i % 3 ? 'GOLD.3' : 'WHITE');
    }
    for (let i = 0; i < 6; i++) {
      R(Math.round(x - 20 + i * 8), y + 6, 3, 1, 'GOLD.2');
    }
  }

  /* the timing check: a sweeping needle over a band */
  function gauge() {
    const w = Math.min(220, KD.W - 40), h = 16;
    const x = Math.round((KD.W - w) / 2), y = KD.H - 46;
    R(x - 3, y - 3, w + 6, h + 6, 'INK.0');
    KD.Screen.frame(x - 3, y - 3, w + 6, h + 6, 'GOLD.0');
    R(x, y, w, h, 'DEEP.0');
    /* the band, and the sliver inside it */
    R(x + Math.round((TARGET - BAND) * w), y, Math.round(BAND * 2 * w), h, 'KELP.0');
    R(x + Math.round((TARGET - PERFECT) * w), y, Math.round(PERFECT * 2 * w), h, 'KELP.2');
    /* ticks, so the bar has a scale */
    for (let k = 0; k <= 10; k++) R(x + Math.round(k * w / 10), y, 1, 3, 'INK.3');
    /* the needle */
    const nx = x + Math.round(sweep * w);
    R(nx - 1, y - 4, 3, h + 8, 'WHITE');
    R(nx, y - 4, 1, h + 8, 'GOLD.3');
    /* where you struck last time */
    if (hit >= 0) {
      const hx = x + Math.round(hit * w);
      R(hx, y - 7, 1, 4, smashed ? 'KELP.3' : 'BLOOD.2');
    }
    const label = phase === 'strike' ? msg : 'PRESS E WHEN THE NEEDLE IS IN THE GREEN';
    KD.Text.draw(label, KD.W / 2, y + h + 6, phase === 'strike'
                 ? (smashed ? 'KELP.3' : 'BLOOD.3') : 'BONE.2',
                 { align: 'center', tiny: true, shadow: 'INK.0' });
    if (tries > 0 && phase === 'check') {
      KD.Text.draw('TRY ' + (tries + 1) + ' OF 3', KD.W / 2, y - 14, 'GOLD.2',
                   { align: 'center', tiny: true, shadow: 'INK.0' });
    }
  }

  function layout() {
    BTNS.length = 0;
    const r = 22;
    BTNS.push({ id: 'use', x: KD.W - 10 - r, y: KD.H - 10 - r, r: r, label: 'E' });
  }

  return { enter, update, draw };
})();
