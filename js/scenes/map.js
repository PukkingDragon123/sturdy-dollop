/* ============================================================
   scenes/map.js - outside. The little map.

   Not a menu of buildings: a strip of ground you walk along,
   with four places standing on it and the barn at your back.
   Walk up to a door and it says its name; press once and you
   are inside. That is the whole interface - no list, no tabs,
   no panel of buttons down the side.

     THE BARN      home. The animals, the basket, the feeding.
     THE CART      the octopus chef, who sells what they eat.
     THE TRACKS    speed and grit, paid for in breakfast.
     THE GYM       power and stamina, same currency.
     THE STADIUM   the card. Where somebody loses money.
   ============================================================ */
KD.Scenes.map = (function () {

  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);

  /* the world is a fixed strip; the camera slides along it */
  const SPAN = 1180;
  /* the buildings are authored at 34x32 and drawn at twice that, so the
     places on the road are the size of places and not the size of icons */
  const BW = 68, BH = 64;
  const PLACES = [
    { id: 'barn',    x: 70,  spr: 'mp_barn',    name: 'THE BARN',
      sub: 'feed them',        go: () => KD.Game.go('barn', {}) },
    { id: 'cart',    x: 290, spr: 'mp_cart',    name: "THE CHEF'S CART",
      sub: 'buy fish',         go: () => KD.Game.go('chef', {}) },
    { id: 'tracks',  x: 530, spr: 'mp_tracks',  name: 'THE TRACKS',
      sub: 'speed and grit',   go: () => KD.Game.go('gym', { room: 'tracks' }) },
    { id: 'gym',     x: 760, spr: 'mp_gym',     name: 'THE GYM',
      sub: 'power and wind',   go: () => KD.Game.go('gym', { room: 'gym' }) },
    { id: 'stadium', x: 1000, spr: 'mp_stadium', name: 'THE STADIUM',
      sub: 'find an opponent', go: () => KD.Game.go('circuit', {}) }
  ];

  let t = 0, px = 210, vx = 0, face = 1, cam = 0, walkT = 0, target = null;
  let near = null, tag = 0, enterT = 0;

  const GROUND = () => Math.round(KD.H * 0.84);

  function enter(a) {
    t = 0; vx = 0; target = null; enterT = 0;
    KD.Pod.init(); KD.Day.init();
    const from = (a && a.from) || 'barn';
    const p = PLACES.find((q) => q.id === from);
    px = p ? doorX(p) : 300;
    cam = clampCam(px - KD.W / 2);
  }

  const clampCam = (c) => Math.max(0, Math.min(SPAN - KD.W, c));

  /* the door of a place, in world coords - 34 wide, standing on the line */
  const doorX = (p) => p.x + (BW >> 1);

  function update(dt) {
    t += dt;
    KD.State.tick(dt);
    KD.Fx.update(dt);
    if (KD.Coach.update(dt)) return;
    if (!KD.Coach.active()) {
      if (KD.Coach.tip('map_walk')) return;
      if (KD.Feed.total() === 0 && KD.Coach.tip('map_chef')) return;
    }

    if (enterT > 0) { enterT -= dt; if (enterT <= 0 && near) near.go(); return; }

    /* keys and stick move you; a tap on the ground sets a place to walk to */
    let ax = 0;
    if (KD.In.isDown('ArrowLeft', 'KeyA')) ax -= 1;
    if (KD.In.isDown('ArrowRight', 'KeyD')) ax += 1;
    const st = KD.In.stick();
    if (st && Math.abs(st.x) > 0.2) ax = st.x;
    if (ax !== 0) target = null;

    const m = KD.In.mouse;
    if (m.click && !KD.UI.blocked()) {
      KD.In.consumedClick();
      const wx = m.x + cam;
      /* tapping a building walks you to it; tapping ground walks you there */
      let hit = null;
      for (const p of PLACES) {
        if (wx > p.x - 8 && wx < p.x + BW + 8 &&
            m.y > GROUND() - BH - 8 && m.y < GROUND() + 12) hit = p;
      }
      if (hit && near === hit) { fire(); }
      else target = hit ? doorX(hit) : Math.max(20, Math.min(SPAN - 20, wx));
    }
    if (target !== null) {
      const d = target - px;
      if (Math.abs(d) < 3) { target = null; ax = 0; }
      else ax = d > 0 ? 1 : -1;
    }

    const SPD = 78;
    vx += (ax * SPD - vx) * Math.min(1, dt * 12);
    px += vx * dt;
    px = Math.max(16, Math.min(SPAN - 16, px));
    if (Math.abs(vx) > 6) { face = vx > 0 ? 1 : -1; walkT += dt * (Math.abs(vx) / 34); }

    /* who am I standing at */
    let best = null, bd = 42;
    for (const p of PLACES) {
      const d = Math.abs(doorX(p) - px);
      if (d < bd) { bd = d; best = p; }
    }
    if (best !== near) { near = best; tag = 0; if (near) KD.Sfx.play('click'); }
    if (near) tag = Math.min(1, tag + dt * 6); else tag = Math.max(0, tag - dt * 8);

    if (near && KD.In.isHit('Space', 'Enter', 'KeyE', 'KeyW', 'ArrowUp')) fire();
    if (KD.In.isHit('Escape')) { KD.Game.go('pause', {}); return; }
    if (KD.In.isHit('KeyZ')) { KD.Game.go('sleep', {}); return; }
    if (KD.In.isHit('KeyT')) { KD.Game.go('tree', {}); return; }

    const want = clampCam(px - KD.W / 2);
    cam += (want - cam) * Math.min(1, dt * 6);
  }

  function fire() {
    if (!near) return;
    KD.Sfx.play('open');
    enterT = 0.14;
  }

  /* ---- drawing ---------------------------------------------------- */

  function sky() {
    const g = GROUND();
    R(0, 0, KD.W, g, 'DEEP.1');
    /* three bands of water light, and a soft horizon rather than a line */
    R(0, Math.round(g * 0.34), KD.W, Math.round(g * 0.2), 'DEEP.2');
    R(0, Math.round(g * 0.54), KD.W, Math.round(g * 0.24), 'DEEP.3');
    for (let i = 0; i < 26; i++) {
      const bx = (i * 137 - cam * 0.25) % (KD.W + 40) - 20;
      const by = 8 + ((i * 53) % Math.round(g * 0.6));
      const k = Math.sin(t * 0.8 + i) * 2;
      R(bx, by + k, 2, 2, i % 3 ? 'DEEP.4' : 'WATER.0');
    }
    /* two ranges of quarry cliff. The height comes off three sines of
       WORLD x, not off an index, so the ridge is a ridge - irregular,
       and identical every frame no matter where the camera is. */
    for (let lay = 0; lay < 2; lay++) {
      const par = lay ? 0.36 : 0.15;
      const rock = lay ? 'STONE.0' : 'DEEP.4';
      const lip  = lay ? 'STONE.2' : 'STONE.0';
      const cut  = lay ? 'INK.2'   : 'DEEP.3';
      const baseH = lay ? 44 : 76;
      const step = 4;
      for (let sx = -step; sx < KD.W + step; sx += step) {
        const wx = Math.round((sx + cam * par) / step) * step;
        const hh = baseH
                 + Math.sin(wx * 0.0130) * 17
                 + Math.sin(wx * 0.0370 + 1.7) * 9
                 + Math.sin(wx * 0.0910 + 0.4) * 4;
        const top = g - Math.round(hh);
        R(sx, top, step, g - top, rock);
        R(sx, top, step, 2, lip);
        R(sx, top + 3, step, 1, cut);
        /* two worked benches cut across the face */
        R(sx, g - Math.round(hh * 0.62), step, 1, cut);
        R(sx, g - Math.round(hh * 0.30), step, 2, lay ? 'STONE.1' : 'DEEP.3');
      }
    }
  }

  function ground() {
    const g = GROUND(), h = KD.H - g;
    /* the verge behind the road, the road itself, and the churned strip
       at the front - three bands, so the ground has a near and a far */
    R(0, g, KD.W, h, 'SAND.0');
    R(0, g, KD.W, Math.round(h * 0.22), 'KELP.0');
    R(0, g, KD.W, 2, 'SAND.2');
    const ry = g + Math.round(h * 0.22);
    R(0, ry, KD.W, Math.round(h * 0.52), 'SAND.1');
    R(0, ry, KD.W, 1, 'SAND.3');
    R(0, ry + Math.round(h * 0.52), KD.W, 1, 'SAND.0');
    /* ruts down the road, and grit that holds still as the camera moves */
    for (let i = 0; i < 3; i++) {
      const y = ry + 4 + i * Math.round(h * 0.16);
      for (let x = -Math.round(cam) % 14; x < KD.W; x += 14) R(x, y, 9, 1, 'SAND.2');
    }
    for (let i = 0; i < 190; i++) {
      const wx = i * 6.4 + ((i * 29) % 5);
      const sx = Math.round(wx - cam);
      if (sx < -4 || sx > KD.W) continue;
      const sy = g + 4 + ((i * 17) % Math.max(4, h - 5));
      R(sx, sy, (i % 7) ? 1 : 2, 1, (i % 3) ? 'SAND.3' : 'INK.1');
    }
  }

  function kelp(ctx) {
    const g = GROUND();
    for (let i = 0; i < 22; i++) {
      const wx = 24 + i * 41 + ((i * 71) % 17);
      const sx = Math.round(wx - cam);
      if (sx < -10 || sx > KD.W + 10) continue;
      const skip = PLACES.some((p) => wx > p.x - 10 && wx < p.x + 44);
      if (skip) continue;
      const h = 10 + ((i * 13) % 12);
      const sw = Math.round(Math.sin(t * 1.1 + i) * 2);
      for (let y = 0; y < h; y++) {
        const k = Math.round(sw * (y / h));
        R(sx + k, g - y, 2, 1, y > h - 4 ? 'KELP.2' : 'KELP.1');
      }
    }
  }

  function places(ctx) {
    const g = GROUND();
    for (const p of PLACES) {
      const sx = Math.round(p.x - cam);
      if (sx < -BW - 20 || sx > KD.W + 20) continue;
      const on = near === p;
      /* a shadow puddles the building onto the road so it is standing,
         not pasted, and a step up to the door */
      R(sx - 3, g - 1, BW + 6, 4, 'INK.1');
      R(sx + 20, g, BW - 40, 3, 'SAND.2');
      if (KD.PX.has(p.spr)) {
        KD.PX.blit(ctx, p.spr, sx, g - BH, { anchor: false, dw: BW, dh: BH });
      } else {
        R(sx, g - BH, BW, BH, 'WOOD.1');
      }
      /* a lamp on the corner of every place, lit */
      if (KD.PX.has('bn_lamp')) {
        KD.PX.blit(ctx, 'bn_lamp', sx + BW - 6, g - BH - 4,
                   { anchor: false, dw: 12, dh: 18 });
      }
      if (on) {
        const k = 0.5 + Math.sin(t * 4) * 0.5;
        KD.Screen.frame(sx - 3, g - BH - 4, BW + 6, BH + 7, k > 0.5 ? 'GOLD.3' : 'GOLD.1');
      }
      /* the sign, on two chains, only when you are standing at it */
      if (on && tag > 0.02) {
        const a = KD.Juice.outCubic(tag);
        const ty = g - BH - 20 - Math.round(a * 14);
        const w = Math.max(KD.Text.width(p.name),
                           KD.Text.width(p.sub, { tiny: true })) + 16;
        const bx = sx + (BW >> 1) - (w >> 1);
        R(bx + 6, ty - 6, 1, 6, 'RUST.1');
        R(bx + w - 7, ty - 6, 1, 6, 'RUST.1');
        R(bx, ty, w, 22, 'WOOD.0');
        R(bx + 1, ty + 1, w - 2, 20, 'INK.1');
        R(bx + 1, ty + 1, w - 2, 1, 'GOLD.1');
        KD.Text.draw(p.name, sx + (BW >> 1), ty + 4, 'GOLD.3', { align: 'center' });
        KD.Text.draw(p.sub, sx + (BW >> 1), ty + 13, 'BONE.1',
                     { align: 'center', tiny: true });
      }
    }
  }

  function hero(ctx) {
    const g = GROUND();
    const HW = 28, HH = 36;
    const sx = Math.round(px - cam) - (HW >> 1);
    const bob = Math.abs(vx) > 6 ? Math.round(Math.sin(walkT * 6) * 1) : 0;
    R(sx + 3, g - 2, HW - 6, 4, 'INK.1');
    const fr = (Math.abs(vx) > 6 && Math.floor(walkT * 5) % 2) ? 'mp_king1' : 'mp_king0';
    if (KD.PX.has(fr)) {
      KD.PX.blit(ctx, fr, sx, g - HH + bob,
                 { anchor: false, dw: HW, dh: HH, flipX: face < 0 });
    } else {
      R(sx + 6, g - HH + bob, 16, HH, 'CLOTH.2');
    }
  }

  /* the ONLY chrome: a thin strip at the top with the day, the purse,
     and how the animal you are working is doing. No panels. */
  function slate() {
    const d = KD.Pod.active();
    R(0, 0, KD.W, 11, 'INK.0');
    R(0, 11, KD.W, 1, 'INK.1');
    KD.Text.draw('DAY ' + KD.Day.day(), 4, 2, 'BONE.1', { tiny: true });
    /* a point waiting on the board is the one thing worth interrupting
       you for, so it gets a blinking pip and the key that spends it */
    const dd = KD.Pod.active();
    if (dd && KD.Tree && KD.Tree.points(dd) > 0 && Math.sin(t * 4) > -0.3) {
      const px = KD.W - 132;
      R(px, 3, 5, 5, 'GOLD.3');
      KD.Text.draw('T', px + 7, 2, 'GOLD.2', { tiny: true });
    }
    KD.Text.draw((KD.State.S.clams || 0) + ' CLAMS', 46, 2, 'GOLD.2', { tiny: true });
    if (d) {
      const mo = KD.Feed.mood(d);
      KD.Text.draw(d.name.toUpperCase(), KD.W - 6, 2, 'BONE.2',
                   { tiny: true, align: 'right' });
      const bw = 40, bx = KD.W - 10 - KD.Text.width(d.name.toUpperCase(), { tiny: true }) - bw;
      R(bx, 4, bw, 3, 'INK.2');
      R(bx, 4, Math.round(bw * KD.Feed.fed(d) / KD.Feed.FED_MAX), 3, mo.col);
      R(bx, 8, bw, 2, 'INK.2');
      R(bx, 8, Math.round(bw * KD.Feed.stam(d) / KD.Feed.staMax(d)), 2, 'WATER.2');
    }
  }

  function draw() {
    const ctx = KD.Screen.ctx();
    sky(); ground(); kelp(ctx); places(ctx); hero(ctx);
    slate();
    if (enterT > 0) {
      const a = 1 - enterT / 0.14;
      const h = Math.round(KD.H * a);
      R(0, (KD.H - h) >> 1, KD.W, h, 'INK.0');
    }
    KD.Fx.draw();
    KD.Coach.draw();
    if (KD.touch) KD.UI.touchPad([{ key: 'Space', label: 'GO' }]);
  }

  return { enter, update, draw, _places: PLACES };
})();
