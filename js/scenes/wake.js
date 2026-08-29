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
  /* This was a sweeping needle over a target band: land it in the green or
     throw again, three tries. It is one press now. The good part of the beat
     was always the trident going end over end and the clock coming apart -
     the timing bar in front of it was a gate between you and the animation,
     on the first screen of the game, before anybody had agreed to play. */
  let thrown = false;
  let hit = -1, msg = '', shock = 0, smashed = false, sat = 0;
  /* the throw is its own little timeline: wind up, fly, land, sit there */
  const WIND = 0.22, FLY = 0.34, LAND = 0.12, HOLD = 0.5;
  const THROW = WIND + FLY + LAND + HOLD;
  const shards = [];
  let tx0 = 0, ty0 = 0, tx1 = 0, ty1 = 0, spin = 0, stuckA = 0, landed = false;
  let baked = null, bw = 0, bh = 0;
  const BTNS = [];

  /* the green band you are aiming for, and the sliver inside it */

  function enter() {
    t = 0; phase = 'card'; pt = 0;
    thrown = false;
    hit = -1; msg = ''; shock = 0; smashed = false; sat = 0;
    shards.length = 0; spin = 0;
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
      if (press()) strike();
      return;
    }
    if (phase === 'strike') {
      sat = Math.min(1, sat + dt * 5);
      spin += dt * (pt > WIND ? 22 : 4);
      /* the clock only dies at the moment of impact, not when you pressed */
      if (!landed && pt >= WIND + FLY) {
        landed = true;
        if (smashed) {
          shock = 0.55;
          burstShards();
          if (KD.Juice) KD.Juice.hit(0.3);
          if (KD.Sfx) KD.Sfx.play('hurt');
        } else {
          shock = 0.18;
          if (KD.Sfx) KD.Sfx.play('step');
        }
      }
      for (const sh2 of shards) {
        sh2.t -= dt; sh2.x += sh2.vx * dt; sh2.vy += 420 * dt; sh2.y += sh2.vy * dt;
        sh2.sp += dt * 12;
        if (sh2.y > ty1 + 12) { sh2.y = ty1 + 12; sh2.vy *= -0.35; sh2.vx *= 0.6; }
      }
      for (let i = shards.length - 1; i >= 0; i--) if (shards[i].t <= 0) shards.splice(i, 1);
      if (pt > THROW) {
        phase = 'after'; pt = 0;
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
    if (thrown) return;
    thrown = true;
    hit = 1;
    pt = 0; sat = 0; landed = false; spin = 0; shards.length = 0;
    msg = 'STRAIGHT THROUGH IT';
    smashed = true; shock = 0.5;
    if (KD.Juice) KD.Juice.hit(0.3);
    if (KD.Sfx) KD.Sfx.play('swing');
    phase = 'strike';
  }

  /* the clock coming apart: brass, glass and two little hands */
  function burstShards() {
    const COL = ['GOLD.3', 'GOLD.2', 'GOLD.1', 'WHITE', 'BONE.2', 'INK.2'];
    for (let i = 0; i < 22; i++) {
      const a = -2.6 + i * 0.14;
      const sp2 = 60 + (i % 6) * 34;
      shards.push({ x: tx1, y: ty1 - 12, vx: Math.cos(a) * sp2 * 1.3,
                    vy: Math.sin(a) * sp2 - 60, t: 0.7 + (i % 4) * 0.16,
                    sp: 0, w: (i % 5) ? 2 : 3, col: COL[i % COL.length] });
    }
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
    /* he leans back into the wind-up and follows through on release, and
       swaps to the thrust pose while the arm is doing the work */
    let lean = 0, pose = 'kp_idle';
    if (phase === 'strike') {
      if (pt < WIND) { lean = -Math.round((pt / WIND) * 3); pose = 'kp_thrust'; }
      else if (pt < WIND + FLY + 0.2) { lean = 2; pose = 'kp_thrust'; }
    }
    if (KD.PX.hasAny(pose)) {
      const nm = pose === 'kp_thrust'
        ? (pt < WIND ? 'kp_thrust0' : 'kp_thrust1')
        : KD.PX.frameOf('kp_idle', t);
      /* The sprite carries its own trident at columns 31-36. While the real
         one is in the air his hand has to be EMPTY or he is holding two, so
         the sprite is cropped narrower for those frames - o.w crops, it does
         not scale, which is exactly what is wanted. */
      const airborne = (phase === 'strike' && pt >= WIND) ||
                       (phase === 'after' && smashed);
      const o = { h: 44 };
      if (airborne) o.w = 30;
      if (KD.PX.has(nm)) KD.PX.blit(ctx, nm, kx + lean, ky, o);
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
    /* It is only broken once the trident LANDS. Keying this off `smashed`
       alone had it in pieces from the moment you pressed the button, with
       the trident still in mid-air. */
    const wrecked = smashed && (phase === 'after' || landed);
    if (!wrecked) {
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
    /* it stays where he left it: through the table, all morning */
    if (smashed && phase === 'after') {
      polearm(ax + 1, ay - 2, Math.cos(1.15), Math.sin(1.15), 34);
    }

    /* ---- the throw ------------------------------------------------ */
    if (phase === 'strike') {
      /* the hand it leaves and the thing it is aimed at */
      tx0 = kx + 6; ty0 = mtop - 34;
      tx1 = ax + 1; ty1 = ay - 14;
      if (pt < WIND) {
        /* WIND UP: cocked back over his shoulder, angle opening as he loads */
        const k = pt / WIND;
        const a = -2.5 - k * 0.5;
        polearm(tx0 - 10 - Math.round(k * 5), ty0 - 6 - Math.round(k * 3),
                Math.cos(a), Math.sin(a), 30);
      } else if (pt < WIND + FLY) {
        /* FLIGHT: a straight run with a little lift, spinning as it goes */
        const k = (pt - WIND) / FLY;
        const ez = KD.Juice ? KD.Juice.outQuad(k) : k;
        const fx = tx0 + (tx1 - tx0) * ez;
        const fy = ty0 + (ty1 - ty0) * ez - Math.sin(k * Math.PI) * 16;
        /* a trail of ghosts behind it, so the speed reads */
        for (let g = 3; g >= 1; g--) {
          const gk = Math.max(0, k - g * 0.055);
          const gez = KD.Juice ? KD.Juice.outQuad(gk) : gk;
          const gx = tx0 + (tx1 - tx0) * gez;
          const gy = ty0 + (ty1 - ty0) * gez - Math.sin(gk * Math.PI) * 16;
          const ga = spin - g * 0.55;
          polearm(gx, gy, Math.cos(ga), Math.sin(ga), 26, g === 1 ? 'BONE.1' : 'INK.3');
        }
        polearm(fx, fy, Math.cos(spin), Math.sin(spin), 30);
      } else {
        /* LANDED: buried in the table if it hit, flat on the boards if not */
        if (smashed) {
          stuckA = 1.15;
          const wob = Math.sin((pt - WIND - FLY) * 26) * 0.05 *
                      Math.max(0, 1 - (pt - WIND - FLY) * 2.4);
          polearm(tx1, ty1 + 12, Math.cos(stuckA + wob), Math.sin(stuckA + wob), 34);
        } else {
          polearm(tx1 + 22, ay + 2, 1, 0.06, 32);
        }
      }
      /* The impact. First version was a filled square growing to 46px and
         it fired on misses too, so a miss lit the whole side table up like a
         lamp. Hits only, and a starburst of spokes rather than a slab. */
      const it = pt - WIND - FLY;
      if (landed && smashed && it < 0.16) {
        const k = it / 0.16;
        const r = Math.round(5 + k * 22);
        const col = k < 0.35 ? 'WHITE' : (k < 0.7 ? 'GOLD.3' : 'GOLD.2');
        for (let a2 = 0; a2 < 8; a2++) {
          const an = a2 * 0.785;
          const ex = Math.cos(an), ey = Math.sin(an);
          for (let d2 = 3; d2 < r; d2 += 2) {
            R(Math.round(tx1 + ex * d2), Math.round(ty1 + ey * d2), 2, 2, col);
          }
        }
        if (k < 0.3) R(tx1 - 4, ty1 - 4, 9, 9, 'WHITE');
      }
      for (const sh2 of shards) {
        const w = ((sh2.sp | 0) % 2) ? sh2.w : Math.max(1, sh2.w - 1);
        R(Math.round(sh2.x), Math.round(sh2.y), w, w, sh2.col);
      }
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
      /* the same box the rest of the game talks in */
      const line = 'Six hundred years of kings, and not one of us ever solved the alarm clock.';
      const L = KD.Convo.layout(0, line);
      KD.Convo.box({ portrait: 'po_king', name: 'You', tint: 'WATER.3' }, line,
                   { L: L, speaking: false });
    }
    if (KD.touch) {
      layout();
      KD.In.buttons(BTNS);
      /* buttons() only registers; without touchPad() the phone button was
         invisible here too. No stick - there is nowhere to walk in bed. */
      KD.UI.touchPad(BTNS, { noStick: true });
    }
  }

  /* A trident at ANY angle, stepped out of 2x2 rects along a direction
     vector. Rotating the sprite with ctx.rotate would resample hand-placed
     pixels into mush, and hand-drawing every orientation of a spinning
     polearm is a dozen sprites - this is one function that reads correctly
     at every angle it is asked for, which is what a throw needs.
     (x, y) is the POINT of the middle prong; the haft runs backwards. */
  function polearm(x, y, dx, dy, len, ghost) {
    x = Math.round(x); y = Math.round(y);
    const px = -dy, py = dx;                     // perpendicular, for the head
    const haft = ghost || 'WOOD.2', grip = ghost || 'WOOD.1';
    const steel = ghost || 'WHITE', shade = ghost || 'BONE.0';
    const gold = ghost || 'GOLD.2';
    /* the haft, running back from the socket */
    for (let i = 5; i < len; i++) {
      R(Math.round(x - dx * i), Math.round(y - dy * i), 2, 2,
        (i % 8 < 2) ? grip : haft);
    }
    /* the gold ferrule at the socket */
    for (let i = 3; i < 6; i++) {
      R(Math.round(x - dx * i), Math.round(y - dy * i), 2, 2, gold);
    }
    /* the crossbar the prongs stand on */
    for (let p = -4; p <= 4; p++) {
      R(Math.round(x - dx * 3 + px * p), Math.round(y - dy * 3 + py * p), 2, 2,
        p === 0 ? steel : shade);
    }
    /* three prongs, the middle one longest */
    for (const p of [-4, 0, 4]) {
      const n = p === 0 ? 7 : 5;
      for (let j = 0; j < n; j++) {
        R(Math.round(x - dx * 3 + dx * j + px * p),
          Math.round(y - dy * 3 + dy * j + py * p), 2, 2,
          j > n - 3 ? steel : shade);
      }
    }
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

  /* what to press, on a plate, where the timing bar used to be */
  function gauge() {
    const label = phase === 'strike' ? msg
      : (KD.touch ? 'TAP TO THROW THE TRIDENT' : 'PRESS E TO THROW THE TRIDENT');
    const w = KD.Text.width(label) + 20, h = 16;
    const x = Math.round((KD.W - w) / 2), y = KD.H - 46;
    R(x - 3, y - 3, w + 6, h + 6, 'INK.0');
    KD.Screen.frame(x - 3, y - 3, w + 6, h + 6, 'GOLD.0');
    R(x, y, w, h, 'DEEP.0');
    R(x, y, w, 1, 'DEEP.2');
    /* it pulses while it is waiting for you and holds still afterwards */
    const on = phase === 'strike' || Math.sin(t * 4) > -0.3;
    KD.Text.draw(label, KD.W / 2, y + 4,
                 phase === 'strike' ? 'KELP.3' : (on ? 'GOLD.3' : 'GOLD.1'),
                 { align: 'center', shadow: 'INK.0' });
  }

  function layout() {
    BTNS.length = 0;
    const r = 22;
    BTNS.push({ id: 'use', x: KD.W - 10 - r, y: KD.H - 10 - r, r: r, label: 'E' });
  }

  return { enter, update, draw,
           /* a seam for the smoke harness: throw it now */
           _forceHit: () => { phase = 'check'; strike(); } };
})();
