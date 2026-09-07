/* ============================================================
   scenes/barn.js - the barn. Where you keep them, and where
   the day starts.

   The hub used to be a screen of bands and tabs called THE
   PENS: a header, a water strip, six boxes, four buttons, a tab
   row and a drawer. You could not see the animal for the
   interface in front of it.

   This is a ROOM. There is an animal in a stall of water, there
   is a basket of food on the floor, and there is a door. You
   feed it by PICKING A FISH UP AND PUTTING IT IN FRONT OF IT -
   drag it out of the basket and drop it on the animal - which
   is one gesture and no menu at all.

   Everything else that used to live here went outside: the
   drills are at the tracks, the weights are at the gym, the
   card is at the stadium, and the food is bought off a cart.
   What is left in this room is an animal, a basket and a door,
   and that is the whole screen.
   ============================================================ */
KD.Scenes.barn = (function () {
  const P = KD.Pod;
  const F = KD.Feed;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);

  let t = 0, msg = '', msgT = 0, msgCol = 'BONE.2';
  /* the thing in your hand: { id, x, y, ox, oy } while the button is down */
  let drag = null, wasDown = false, pop = 0, popX = 0, popY = 0;
  let hoverFood = -1, ate = 0;

  /* ---- the room, in world rows ---------------------------------------
     Everything measures off these four numbers, so the barn lays itself
     out the same on a 390 phone and an 832 desktop. */
  const ROOF = 26;                    // the beams end here
  const RAIL = () => Math.round(KD.H * 0.62);   // the stall rail
  const FLOOR = () => Math.round(KD.H * 0.66);  // the floorboards start

  function enter() {
    t = 0; drag = null; wasDown = false; pop = 0; ate = 0;
    P.init();
    KD.Day.init();
    /* a save from before the barn existed has no basket and no hunger;
       reading either one seeds it, so this is all the migration needed */
    F.basket(); F.fed(P.active());
  }
  const say = (s, c) => { msg = s; msgT = 3.0; msgCol = c || 'BONE.2'; };

  /* ================================================================
     THE STALL, AND WHAT IS IN IT
     ================================================================ */
  /* the box of water the active animal is swimming in */
  function stallBox() {
    const w = Math.min(180, KD.W - 120);
    const x = Math.round((KD.W - w) / 2);
    const y = ROOF + 12;
    return { x: x, y: y, w: w, h: RAIL() - y };
  }
  /* where the animal actually is, so the drop test and the drawing
     agree by construction */
  function animalBox() {
    const B = stallBox();
    const dw = KD.Dolph.W, dh = KD.Dolph.H;
    const x = B.x + Math.round((B.w - dw) / 2);
    const y = B.y + Math.round((B.h - dh) / 2) + Math.round(Math.sin(t * 1.4) * 3);
    return { x: x, y: y, w: dw, h: dh };
  }

  /* the other animals, in side stalls - click one and it is the one
     that fights. Six pens was six empty boxes; this only draws what you
     own, and it sits in the margin rather than in a band of its own. */
  function sideStalls() {
    const pod = P.pod();
    const out = [];
    const B = stallBox();
    const sw = 46, sh = 26;
    for (let i = 0; i < pod.length; i++) {
      const left = i % 2 === 0;
      const k = Math.floor(i / 2);
      const x = left ? B.x - sw - 8 : B.x + B.w + 8;
      const y = ROOF + 16 + k * (sh + 6);
      if (x < 2 || x + sw > KD.W - 2) continue;
      out.push({ d: pod[i], x: x, y: y, w: sw, h: sh });
    }
    return out;
  }

  /* the basket, and one slot per KIND of food in it */
  function basketBox() {
    const w = Math.min(228, KD.W - 120);
    return { x: 8, y: KD.H - 42, w: w, h: 34 };
  }
  function slots() {
    const B = basketBox();
    const rows = F.rows();
    const out = [];
    const sw = 30;
    for (let i = 0; i < rows.length; i++) {
      const x = B.x + 10 + i * sw;
      if (x + 24 > B.x + B.w) break;
      out.push({ f: rows[i].f, n: rows[i].n, x: x, y: B.y + 6, w: 24, h: 24 });
    }
    return out;
  }

  /* the door out, on the right */
  function doorBox() {
    return { x: KD.W - 44, y: RAIL() - 62, w: 34, h: 62 };
  }

  /* ================================================================
     UPDATE
     ================================================================ */
  function update(dt) {
    t += dt;
    if (msgT > 0) msgT -= dt;
    if (pop > 0) pop -= dt;
    KD.State.tick(dt);
    KD.Fx.update(dt);
    if (KD.Coach.update(dt)) return;
    /* the guide, and only about this room. It eats the press that
       dismisses it so a tap cannot both close a tip and feed. */
    if (!KD.Coach.active()) {
      const d0 = P.active();
      if (d0) {
        if (F.rows().length && KD.Coach.tip('barn_feed')) return;
        if (KD.Coach.tip('barn_plate')) return;
        if ((d0.pts || 0) > 0 && KD.Coach.tip('barn_tree')) return;
        if (KD.Coach.tip('barn_out')) return;
      }
    }

    const m = KD.In.mouse;
    const down = m.down;

    /* ---- picking a fish up ----------------------------------------
       Hit-tested against WHERE THE PRESS LANDED, not where the pointer
       is by the time the frame runs: a fast drag moves several pixels
       before the game sees the button go down, and testing the live
       position picks up whatever the cursor has slid onto. */
    const hitAt = (x, y, w, h) => m.px >= x && m.py >= y && m.px < x + w && m.py < y + h;
    if (down && !wasDown && !drag) {
      const sl = slots();
      for (let i = 0; i < sl.length; i++) {
        const s = sl[i];
        if (hitAt(s.x, s.y, s.w, s.h)) {
          drag = { id: s.f.id, spr: s.f.spr, x: m.px, y: m.py };
          KD.Sfx.play('tap');
          break;
        }
      }
      /* a tap on a side stall swaps who is up */
      if (!drag) {
        for (const s of sideStalls()) {
          if (hitAt(s.x, s.y, s.w, s.h)) {
            P.setActive(s.d);
            say(s.d.name + ' is up.', 'GOLD.3');
            KD.Sfx.play('click');
            KD.State.save();
            break;
          }
        }
      }
      /* and one on the door goes outside */
      const D = doorBox();
      if (!drag && hitAt(D.x, D.y, D.w, D.h)) out();
    }
    if (drag) { drag.x = m.x; drag.y = m.y; }

    /* ---- and putting it down --------------------------------------- */
    if (!down && wasDown && drag) {
      const A = animalBox();
      /* a generous box: you are aiming at an animal, not a pixel */
      const hit = m.x > A.x - 10 && m.x < A.x + A.w + 10 &&
                  m.y > A.y - 14 && m.y < A.y + A.h + 14;
      if (hit) feed(drag.id);
      else KD.Sfx.play('deny');
      drag = null;
    }
    wasDown = down;
    if (m.click) KD.In.consumedClick();

    /* what the cursor is over, for the one line of prose at the foot */
    hoverFood = -1;
    if (!drag) {
      const sl = slots();
      for (let i = 0; i < sl.length; i++) {
        if (KD.UI.inside(sl[i].x, sl[i].y, sl[i].w, sl[i].h)) { hoverFood = i; break; }
      }
    }

    /* ---- keys, for anybody not holding a mouse --------------------- */
    if (KD.In.isHit('Space', 'Enter', 'KeyE')) {
      const sl = slots();
      if (sl.length) feed(sl[0].f.id);
    }
    if (KD.In.isHit('KeyD') || KD.In.isHit('ArrowRight')) out();
    if (KD.In.isHit('KeyT')) { KD.Game.go('tree', {}); return; }
    if (KD.In.isHit('KeyZ')) { KD.Game.go('sleep', {}); return; }
    if (KD.In.isHit('Escape')) { KD.Game.go('pause', {}); return; }
    if (KD.In.isHit('Tab')) {
      const pod = P.pod();
      if (pod.length > 1) {
        const i = pod.indexOf(P.active());
        P.setActive(pod[(i + 1) % pod.length]);
        KD.Sfx.play('click');
      }
    }
  }

  function out() { KD.Game.go('map', {}); }

  function feed(id) {
    const d = P.active();
    if (!d) return;
    const r = F.eat(d, id);
    if (!r) return;
    if (r.full) { say(d.name + ' will not take another mouthful.', 'GOLD.2'); KD.Sfx.play('deny'); return; }
    const A = animalBox();
    pop = 0.5; popX = A.x + A.w * 0.7; popY = A.y + 10;
    ate++;
    say(d.name + ' eats the ' + r.food.name.toLowerCase() + '.', 'KELP.3');
    KD.Sfx.play('pickup');
    KD.Fx.bubbles(popX, popY, 6);
  }

  /* ================================================================
     DRAWING THE ROOM
     ================================================================ */
  /* the back wall: vertical boards with a knot here and there */
  function wall() {
    const W = KD.W, H = KD.H;
    R(0, 0, W, H, 'WOOD.0');
    for (let x = 0; x < W; x += 11) {
      R(x, ROOF, 10, FLOOR() - ROOF, (x / 11) % 2 ? 'WOOD.1' : 'WOOD.0');
      R(x, ROOF, 1, FLOOR() - ROOF, 'INK.0');
      R(x + 1, ROOF, 1, FLOOR() - ROOF, 'WOOD.2');
      /* a knot, deterministic so it never shimmers */
      const k = (x * 7919) % 97;
      if (k < 22) {
        const ky = ROOF + 18 + (k * 5) % Math.max(10, FLOOR() - ROOF - 40);
        R(x + 3, ky, 4, 3, 'WOOD.0');
        R(x + 4, ky + 1, 2, 1, 'INK.1');
      }
    }
    /* the roof: three beams and the dark between them */
    R(0, 0, W, ROOF, 'INK.0');
    for (let i = 0; i < 4; i++) {
      const y = 3 + i * 6;
      R(0, y, W, 4, i % 2 ? 'WOOD.1' : 'WOOD.2');
      R(0, y, W, 1, 'WOOD.3');
      R(0, y + 3, W, 1, 'INK.0');
    }
    R(0, ROOF - 2, W, 2, 'WOOD.3');
    R(0, ROOF, W, 1, 'INK.0');
  }

  /* the floor: boards running away from you, and straw on them */
  function floor() {
    const W = KD.W, H = KD.H;
    const fy = FLOOR();
    R(0, fy, W, H - fy, 'WOOD.1');
    R(0, fy, W, 2, 'WOOD.3');
    for (let i = 0; i < 7; i++) {
      const y = fy + 4 + i * 7;
      if (y > H) break;
      R(0, y, W, 1, 'INK.1');
      R(0, y + 1, W, 6, (i % 2) ? 'WOOD.1' : 'WOOD.0');
    }
    /* cut kelp scattered over the boards */
    for (let i = 0; i < 34; i++) {
      const x = (i * 137 + 11) % W;
      const y = fy + 4 + (i * 53) % Math.max(6, H - fy - 6);
      R(x, y, 4 + (i % 3), 1, i % 3 ? 'KELP.0' : 'SAND.0');
    }
  }

  /* the water in the stall, and the animal in it */
  function stall(ctx) {
    const B = stallBox();
    const d = P.active();
    /* the box: a cut in the floor with water in it, dark at the bottom */
    R(B.x - 3, B.y - 3, B.w + 6, B.h + 6, 'INK.0');
    const BANDS = [[0, 'DEEP.3'], [0.22, 'DEEP.2'], [0.55, 'DEEP.1'], [0.82, 'DEEP.0']];
    for (let i = 0; i < BANDS.length; i++) {
      const y0 = B.y + Math.round(B.h * BANDS[i][0]);
      const y1 = i + 1 < BANDS.length ? B.y + Math.round(B.h * BANDS[i + 1][0]) : B.y + B.h;
      R(B.x, y0, B.w, y1 - y0, BANDS[i][1]);
    }
    /* the surface, moving */
    for (let x = 0; x < B.w; x += 2) {
      const y = B.y + Math.round(Math.sin((x + t * 26) * 0.09) * 1.6);
      R(B.x + x, y, 2, 1, 'WATER.3');
      R(B.x + x, y + 1, 2, 2, 'WATER.2');
    }
    /* silt drifting down it */
    for (let i = 0; i < 14; i++) {
      const x = B.x + ((i * 37 + 5) % B.w);
      const y = B.y + 4 + ((i * 61 + t * 9) % Math.max(8, B.h - 8));
      R(x, y, 1, 1, i % 3 ? 'WATER.0' : 'WATER.1');
    }
    if (!d) {
      KD.Text.draw('NOBODY IN THE BARN', B.x + B.w / 2, B.y + B.h / 2 - 4, 'BLOOD.3',
                   { align: 'center', shadow: 'INK.0' });
      return;
    }
    /* the animal, at full size, doing nothing in particular */
    const A = animalBox();
    const pose = Math.floor(t * 1.2) % 2 ? 'cruise1' : 'cruise0';
    KD.Dolph.draw(ctx, d, ate > 0 && pop > 0 ? 'charge' : pose, A.x, A.y, {});
    /* bubbles off the blowhole */
    for (let i = 0; i < 4; i++) {
      const f = ((t * 0.45 + i * 0.25) % 1);
      const bx = A.x + 74 + Math.round(Math.sin(f * 7 + i) * 3);
      const by = A.y + 6 - f * 22;
      if (by > B.y) R(bx, by, 2 - (i % 2), 2 - (i % 2), 'WATER.3');
    }
    /* the rail across the front of the stall, with the posts */
    const ry = B.y + B.h;
    R(B.x - 6, ry, B.w + 12, 4, 'WOOD.2');
    R(B.x - 6, ry, B.w + 12, 1, 'WOOD.3');
    R(B.x - 6, ry + 3, B.w + 12, 1, 'INK.0');
    /* two short posts at the ends of the rail */
    for (const px of [B.x - 8, B.x + B.w + 2]) {
      R(px, ry - 10, 6, 14, 'WOOD.1');
      R(px, ry - 10, 2, 14, 'WOOD.2');
      R(px - 1, ry - 12, 8, 3, 'WOOD.0');
    }
    nameplate(d, B.x - 6, ry, B.w + 12);
  }

  /* the brass plate screwed to the stall rail. This is the ONLY gauge in
     the barn: a name, one word for how the animal is doing, and two thin
     bars - what is in it, and what it has left today. */
  function nameplate(d, x, y, w) {
    if (!d) return;
    const mo = F.mood(d);
    R(x, y + 4, w, 22, 'INK.0');
    R(x + 1, y + 5, w - 2, 20, 'GOLD.0');
    R(x + 1, y + 5, w - 2, 1, 'GOLD.2');
    R(x + 1, y + 24, w - 2, 1, 'INK.0');
    /* two screws, because it is a plate and not a panel */
    R(x + 3, y + 8, 2, 2, 'GOLD.3'); R(x + w - 5, y + 8, 2, 2, 'GOLD.3');
    KD.Text.draw(d.name.toUpperCase(), x + 7, y + 8, 'INK.0');
    KD.Text.draw(mo.word, x + w - 7, y + 8, 'INK.0', { align: 'right' });
    /* fed in the mood colour, wind in water blue, both thin */
    const bx = x + 7, bw = w - 14;
    R(bx, y + 17, bw, 3, 'INK.1');
    R(bx, y + 17, Math.round(bw * F.fed(d) / F.FED_MAX), 3, mo.col);
    R(bx, y + 21, bw, 2, 'INK.1');
    R(bx, y + 21, Math.round(bw * F.stam(d) / F.staMax(d)), 2, 'WATER.2');
  }

  /* the props: bales along the back wall, a bucket, the posts holding the
     roof and the lamps that light the place. Nothing here is
     interactive - it is here so the barn looks lived in. */
  function props(ctx) {
    const fy = FLOOR();
    if (KD.PX.has('bn_bale')) {
      KD.PX.blit(ctx, 'bn_bale', 6, fy - 26, { anchor: false, dw: 30, dh: 20 });
      KD.PX.blit(ctx, 'bn_bale', 30, fy - 22, { anchor: false, dw: 26, dh: 17 });
      KD.PX.blit(ctx, 'bn_bale', 12, fy - 44, { anchor: false, dw: 26, dh: 17 });
    }
    if (KD.PX.has('bn_bucket')) {
      KD.PX.blit(ctx, 'bn_bucket', KD.W - 96, fy - 24,
                 { anchor: false, dw: 18, dh: 20 });
    }
    /* two posts holding the roof, drawn rather than blitted - the 6px
       post sprite stretched to full height read as a stretched sprite */
    for (let i = 0; i < 2; i++) {
      const x = i ? KD.W - 74 : 62;
      const top = ROOF, bot = RAIL();
      R(x, top, 12, bot - top, 'WOOD.1');
      R(x, top, 3, bot - top, 'WOOD.2');
      R(x + 9, top, 3, bot - top, 'WOOD.0');
      /* the bracket at the head, and the base block */
      R(x - 4, top, 20, 5, 'WOOD.1');
      R(x - 4, top, 20, 2, 'WOOD.3');
      for (let k = 0; k < 4; k++) R(x - 3 + k, top + 5 + k, 2, 1, 'WOOD.0');
      for (let k = 0; k < 4; k++) R(x + 13 - k, top + 5 + k, 2, 1, 'WOOD.0');
      R(x - 2, bot - 7, 16, 7, 'WOOD.0');
      R(x - 2, bot - 7, 16, 2, 'WOOD.2');
      /* two iron bands and the nails in them */
      for (let k = 0; k < 2; k++) {
        const by = top + 30 + k * 46;
        if (by > bot - 14) break;
        R(x - 1, by, 14, 3, 'RUST.1');
        R(x - 1, by, 14, 1, 'RUST.2');
        R(x + 2, by + 1, 1, 1, 'INK.0'); R(x + 9, by + 1, 1, 1, 'INK.0');
      }
    }
    /* two lamps on the beams. The light is a warm patch on the boards
       behind each one - the stepped cone read as stairs. */
    for (let i = 0; i < 2; i++) {
      const lx = Math.round(KD.W * (i ? 0.78 : 0.14));
      const flick = (Math.sin(t * 7 + i * 2) > 0.72) ? 1 : 0;
      R(lx + 5, ROOF, 2, 9, 'INK.0');
      if (KD.PX.has('bn_lamp')) {
        KD.PX.blit(ctx, 'bn_lamp', lx, ROOF + 9, { anchor: false, dw: 12, dh: 18 });
      }
      /* the light it throws: a narrow taper down the boards, one column
         per step, so it fades instead of stepping */
      if (!flick) {
        for (let k = 0; k < 9; k++) {
          const hw = 5 + k * 2;
          R(lx + 6 - hw, ROOF + 28 + k * 4, hw * 2, 4,
            k < 3 ? 'WOOD.3' : (k < 6 ? 'WOOD.2' : 'WOOD.1'));
        }
        R(lx + 1, ROOF + 26, 10, 2, 'GOLD.3');
      }
    }
  }

  /* the rest of the pod, in side stalls. Click one and it is the one
     that fights. Only draws what you own. */
  function stalls(ctx) {
    const act = P.active();
    for (const s of sideStalls()) {
      const on = s.d === act;
      const hot = !drag && KD.UI.inside(s.x, s.y, s.w, s.h);
      /* the stall: a window into a smaller box of water, barred */
      R(s.x - 2, s.y - 2, s.w + 4, s.h + 4, 'WOOD.0');
      R(s.x - 1, s.y - 1, s.w + 2, s.h + 2, on ? 'GOLD.1' : 'WOOD.2');
      R(s.x, s.y, s.w, s.h, 'DEEP.1');
      R(s.x, s.y, s.w, Math.round(s.h * 0.3), 'DEEP.2');
      for (let x = 0; x < s.w; x += 2) {
        R(s.x + x, s.y + Math.round(Math.sin((x + t * 20) * 0.14) * 1), 2, 1, 'WATER.2');
      }
      /* the animal in it, small, as a silhouette */
      const dw = 34, dh = 16;
      const bob = Math.round(Math.sin(t * 1.6 + s.x) * 1);
      if (KD.Dolph.get) {
        KD.Dolph.draw(ctx, s.d, Math.floor(t * 1.4) % 2 ? 'cruise1' : 'cruise0',
                      s.x + ((s.w - dw) >> 1), s.y + 5 + bob,
                      { dw: dw, dh: dh });
      }
      /* bars across the window */
      for (let i = 1; i < 4; i++) R(s.x + i * (s.w >> 2), s.y, 1, s.h, 'RUST.1');
      if (hot || on) KD.Screen.frame(s.x - 2, s.y - 2, s.w + 4, s.h + 4,
                                     on ? 'GOLD.3' : 'BONE.1');
      /* the name on a strip along the bottom */
      R(s.x, s.y + s.h - 8, s.w, 8, 'INK.0');
      KD.Text.draw(s.d.name.toUpperCase(), s.x + (s.w >> 1), s.y + s.h - 7,
                   on ? 'GOLD.3' : 'BONE.1',
                   { tiny: true, align: 'center', shadow: 'INK.0', max: s.w - 4 });
      /* the two marks worth making: hungry, or a point waiting */
      if (F.fed(s.d) < 28) R(s.x + s.w - 6, s.y + 2, 4, 4, 'BLOOD.3');
      else if (KD.Tree && KD.Tree.points(s.d) > 0) R(s.x + s.w - 6, s.y + 2, 4, 4, 'GOLD.3');
    }
  }

  /* the basket on the floor, with what you own laid out in it.
     One hamper woven across the whole width - the 32px sprite tiled six
     times read as six baskets, which is not what is on the floor. */
  function basket(ctx) {
    const B = basketBox();
    /* the rim, then the weave, then the shadow it sits in */
    R(B.x - 3, B.y + B.h - 1, B.w + 6, 3, 'INK.1');
    R(B.x - 2, B.y - 3, B.w + 4, 5, 'WOOD.2');
    R(B.x - 2, B.y - 3, B.w + 4, 2, 'WOOD.3');
    R(B.x - 1, B.y + 2, B.w + 2, B.h - 2, 'WOOD.1');
    /* woven: staggered short strokes, darker every other course */
    for (let y = B.y + 3; y < B.y + B.h; y += 4) {
      const off = ((y - B.y) / 4 | 0) % 2 ? 4 : 0;
      for (let x = B.x - 1 + off; x < B.x + B.w; x += 8) {
        R(x, y, 7, 3, ((x + y) % 9) ? 'WOOD.1' : 'WOOD.0');
        R(x, y, 7, 1, 'WOOD.2');
      }
    }
    R(B.x - 1, B.y + B.h - 3, B.w + 2, 3, 'WOOD.0');
    /* two handles on the ends */
    R(B.x - 4, B.y + 2, 3, 8, 'WOOD.0');
    R(B.x + B.w + 1, B.y + 2, 3, 8, 'WOOD.0');

    const sl = slots();
    if (!sl.length) {
      KD.Text.draw('EMPTY', B.x + B.w / 2, B.y + (B.h >> 1) - 3, 'BLOOD.2',
                   { tiny: true, align: 'center', shadow: 'INK.0' });
      return;
    }
    for (let i = 0; i < sl.length; i++) {
      const s = sl[i];
      const held = drag && drag.id === s.f.id;
      const hot = i === hoverFood;
      /* the food sits in a straw nest, and lifts when you point at it */
      const lift = hot && !drag ? 3 : 0;
      R(s.x - 1, s.y + s.h - 4, s.w + 2, 4, 'KELP.0');
      if (hot && !drag) {
        KD.Screen.frame(s.x - 2, s.y - 2 - lift, s.w + 4, s.h + 4, 'GOLD.2');
      }
      if (KD.PX.has(s.f.spr)) {
        KD.PX.blit(ctx, s.f.spr, s.x, s.y - lift,
                   { anchor: false, dw: s.w, dh: s.h, shade: held ? 3 : 0 });
      }
      /* how many, as a small count in the corner */
      if (s.n > 1) {
        KD.Text.draw(String(s.n), s.x + s.w, s.y + s.h - 6, 'BONE.2',
                     { tiny: true, align: 'right', shadow: 'INK.0' });
      }
    }
  }

  /* the door out, on the right wall: a frame, and the sea beyond it */
  function door(ctx) {
    const D = doorBox();
    const hot = !drag && KD.UI.inside(D.x, D.y, D.w, D.h);
    R(D.x - 3, D.y - 3, D.w + 6, D.h + 6, 'WOOD.0');
    R(D.x - 2, D.y - 2, D.w + 4, D.h + 4, 'WOOD.2');
    /* what you can see through it */
    R(D.x, D.y, D.w, D.h, 'WATER.1');
    R(D.x, D.y, D.w, Math.round(D.h * 0.3), 'WATER.2');
    R(D.x, D.y + Math.round(D.h * 0.72), D.w, Math.round(D.h * 0.28), 'SAND.1');
    for (let i = 0; i < 6; i++) {
      const kx = D.x + 3 + i * 6;
      const sw = Math.round(Math.sin(t * 1.4 + i) * 2);
      for (let y = 0; y < 16; y++) {
        R(kx + Math.round(sw * (y / 16)), D.y + D.h - 8 - y, 2, 1,
          y > 12 ? 'KELP.2' : 'KELP.1');
      }
    }
    for (let i = 0; i < 5; i++) {
      const bx = D.x + 4 + ((i * 13) % (D.w - 8));
      const by = D.y + 4 + Math.round(((t * 14 + i * 21) % (D.h - 8)));
      R(bx, D.y + D.h - 8 - (by - D.y) % (D.h - 10), 2, 2, 'WATER.3');
    }
    /* the frame over the top of it, and the sign */
    R(D.x - 3, D.y - 6, D.w + 6, 4, 'WOOD.1');
    R(D.x - 3, D.y - 6, D.w + 6, 1, 'WOOD.3');
    if (hot) KD.Screen.frame(D.x - 3, D.y - 3, D.w + 6, D.h + 6, 'GOLD.3');
    KD.Text.draw('OUT', D.x + (D.w >> 1), D.y - 14,
                 hot ? 'GOLD.3' : 'BONE.1',
                 { align: 'center', tiny: true, shadow: 'INK.0' });
  }

  /* what is in your hand, and where it is going. A dotted line from the
     hand to the animal, so a drag is legible even on a phone where your
     thumb is over the fish. */
  function held(ctx) {
    if (!drag) return;
    const A = animalBox();
    const ax = A.x + A.w / 2, ay = A.y + A.h / 2;
    const over = drag.x > A.x - 10 && drag.x < A.x + A.w + 10 &&
                 drag.y > A.y - 14 && drag.y < A.y + A.h + 14;
    const dx = ax - drag.x, dy = ay - drag.y;
    const n = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy) / 7));
    for (let i = 1; i < n; i++) {
      if ((i + Math.floor(t * 8)) % 2) continue;
      R(drag.x + (dx * i) / n - 1, drag.y + (dy * i) / n - 1, 2, 2,
        over ? 'KELP.3' : 'BONE.0');
    }
    if (over) {
      KD.Screen.frame(A.x - 4, A.y - 4, A.w + 8, A.h + 8, 'KELP.3');
    }
    if (KD.PX.has(drag.spr)) {
      KD.PX.blit(ctx, drag.spr, drag.x - 12, drag.y - 12,
                 { anchor: false, dw: 24, dh: 24 });
    }
  }

  /* one line at the foot of the screen, and only when there is one to
     say - what the cursor is over, or what just happened */
  function line() {
    let s = '', col = 'BONE.1';
    if (drag) { s = 'PUT IT IN FRONT OF ' + (P.active() ? P.active().name.toUpperCase() : 'IT'); col = 'KELP.3'; }
    else if (hoverFood >= 0) {
      const f = slots()[hoverFood].f;
      s = f.name.toUpperCase() + '  -  ' + f.note; col = 'BONE.1';
    } else if (msgT > 0) { s = msg; col = msgCol; }
    else if (!F.rows().length) { s = 'NOTHING TO FEED IT. THE CHEF HAS A CART OUTSIDE.'; col = 'BLOOD.3'; }
    else { s = 'DRAG A FISH ONTO IT'; col = 'STONE.3'; }
    if (!s) return;
    const B = basketBox();
    KD.Text.draw(s, B.x + B.w + 10, KD.H - 26, col,
                 { tiny: true, max: KD.W - B.x - B.w - 20 });
  }

  /* the slate by the door: the day and the money, small, on a board */
  function slate() {
    const w = 76, x = KD.W - w - 6, y = 4;
    R(x, y, w, 20, 'INK.0');
    R(x + 1, y + 1, w - 2, 18, 'WOOD.0');
    KD.Screen.frame(x, y, w, 20, 'WOOD.2');
    KD.Text.draw('DAY ' + KD.Day.day(), x + 4, y + 3, 'BONE.1', { tiny: true });
    KD.Text.draw(KD.State.S.clams + ' CLAMS', x + w - 4, y + 11, 'GOLD.3',
                 { tiny: true, align: 'right' });
  }

  function draw(ctx) {
    wall();
    floor();
    props(ctx);
    stall(ctx);
    stalls(ctx);
    door(ctx);
    basket(ctx);
    slate();
    line();
    held(ctx);
    /* the mouthful landing */
    if (pop > 0) {
      const k = 1 - pop / 0.5;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        const r = 4 + k * 16;
        R(popX + Math.cos(a) * r, popY + Math.sin(a) * r * 0.7, 2, 2,
          k < 0.5 ? 'KELP.3' : 'KELP.1');
      }
    }
    KD.Coach.draw();
  }

  return { enter, update, draw,
           /* seams for the smoke harness */
           _feed: feed, _slots: slots, _animal: animalBox, _basket: basketBox };
})();
