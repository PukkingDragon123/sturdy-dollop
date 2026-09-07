/* ============================================================
   scenes/gym.js - the tracks and the gym. Two rooms, one file,
   because they are the same idea in different buildings:

     THE TRACKS   a starting gate and a straight. Speed and the
                  nerve to run beside something you dislike.
     THE GYM      a chain, a stone and a breath bench. Power
                  and the wind to keep using it.

   And they are not free. Training does not cost you the day
   any more - it costs the ANIMAL: a chunk of what you fed it
   this morning, and a chunk of what it has left today. So a
   session is a decision about breakfast, and an animal you
   never feed is an animal that cannot train.

   You walk in, stand at a station, and it tells you what the
   station takes and what it gives. Nothing else is on screen.
   ============================================================ */
KD.Scenes.gym = (function () {

  const P = KD.Pod, F = KD.Feed;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);

  /* the two rooms and what stands in them. `need` is the price in the
     animal's own two numbers; the drill id picks the rhythm shape. */
  const ROOMS = {
    tracks: {
      name: 'THE TRACKS', wall: 'RUST', floor: 'SAND',
      blurb: 'Sand, a gate and a rope down the straight.',
      stations: [
        { drill: 'sprints', name: 'GATE SPRINTS', stat: 'spd',
          need: { fed: 16, stam: 22 }, kind: 'gate',
          note: 'Twenty lengths against a rope.' },
        { drill: 'ring',    name: 'RING WORK',    stat: 'spi',
          need: { fed: 12, stam: 18 }, kind: 'ring',
          note: 'Somebody it hates, across a rope.' }
      ]
    },
    gym: {
      name: 'THE GYM', wall: 'STONE', floor: 'STONE',
      blurb: 'A chain, a netted stone, and a bench nobody likes.',
      stations: [
        { drill: 'weight', name: 'DRAG THE CHAIN', stat: 'pow',
          need: { fed: 22, stam: 16 }, kind: 'chain',
          note: 'A netted stone on a harness.' },
        { drill: 'holds',  name: 'BREATH HOLDS',   stat: 'sta',
          need: { fed: 14, stam: 24 }, kind: 'bench',
          note: 'Down on the sand until it wants up.' }
      ]
    }
  };

  let t = 0, room = null, key = 'gym', sel = 0, warn = '', warnT = 0, goT = 0;

  function enter(a) {
    t = 0; sel = 0; warn = ''; warnT = 0; goT = 0;
    key = (a && a.room && ROOMS[a.room]) ? a.room : 'gym';
    room = ROOMS[key];
    P.init(); KD.Day.init();
    KD.Sfx.play('open');
  }

  /* the walkway the equipment stands on, and the water channel in front
     of it. They are dolphins - a gym with a dry floor was a room with a
     beached animal in it. */
  const GROUND = () => Math.round(KD.H * 0.64);
  const WATER  = () => Math.round(KD.H * 0.78);

  /* one bay per station, side by side, filling the room */
  function bays() {
    const n = room.stations.length;
    const pad = 10, w = Math.floor((KD.W - pad * (n + 1)) / n);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ s: room.stations[i], i: i,
                 x: pad + i * (w + pad), y: 14, w: w, h: KD.H - 14 });
    }
    return out;
  }

  function start(i) {
    const st = room.stations[i];
    const d = P.active();
    if (!d) { warn = 'Nobody is up.'; warnT = 2.4; KD.Sfx.play('deny'); return; }
    const ok = F.canWork(d, st.need);
    if (!ok.ok) { warn = ok.why; warnT = 3.0; KD.Sfx.play('deny'); return; }
    F.work(d, st.need);
    goT = 0.18;
  }

  function update(dt) {
    t += dt;
    if (warnT > 0) warnT -= dt;
    KD.State.tick(dt);
    KD.Fx.update(dt);
    if (KD.Coach.update(dt)) return;
    if (!KD.Coach.active() && KD.Coach.tip('gym_cost')) return;

    if (goT > 0) {
      goT -= dt;
      if (goT <= 0) {
        const st = room.stations[sel];
        const dr = P.DRILLS.find((q) => q.id === st.drill) || P.DRILLS[0];
        KD.Game.go('drill', { drill: dr, room: key });
      }
      return;
    }

    const B = bays();
    if (KD.In.isHit('ArrowRight', 'KeyD')) { sel = (sel + 1) % B.length; KD.Sfx.play('click'); }
    if (KD.In.isHit('ArrowLeft', 'KeyA')) { sel = (sel + B.length - 1) % B.length; KD.Sfx.play('click'); }
    if (KD.In.isHit('Space', 'Enter', 'KeyE')) start(sel);
    if (KD.In.isHit('Escape') || KD.In.isHit('KeyQ')) { KD.Game.go('map', { from: key }); return; }
    if (KD.In.isHit('Tab')) {
      const pod = P.pod();
      if (pod.length > 1) {
        const cur = pod.indexOf(P.active());
        P.setActive(pod[(cur + 1) % pod.length]);
        KD.Sfx.play('click');
      }
    }

    const m = KD.In.mouse;
    for (const b of B) {
      if (KD.UI.inside(b.x, b.y, b.w, b.h)) {
        sel = b.i;
        if (m.click && !KD.UI.blocked()) { KD.In.consumedClick(); start(b.i); }
      }
    }
  }

  /* ---- the room --------------------------------------------------- */

  function shell() {
    const g = GROUND(), wl = room.wall;
    /* the roof, dark, so the eye starts at the middle of the frame */
    R(0, 0, KD.W, 26, 'INK.0');
    for (let x = 0; x < KD.W; x += 16) { R(x, 20, 8, 6, 'WOOD.0'); R(x, 20, 8, 1, 'WOOD.1'); }
    R(0, 26, KD.W, 2, 'INK.1');
    /* the wall: two courses of block and then a plaster field, so the
       pattern does not fill the screen with texture */
    R(0, 28, KD.W, g - 28, wl + '.0');
    for (let y = 28; y < 46; y += 9) {
      const off = ((y / 9) | 0) % 2 ? 13 : 0;
      for (let x = -26 + off; x < KD.W; x += 26) {
        R(x, y, 25, 8, ((x + y) % 6) ? wl + '.1' : wl + '.0');
        R(x, y, 25, 1, wl + '.2');
        R(x, y + 8, 25, 1, 'INK.1');
      }
    }
    R(0, 46, KD.W, 1, wl + '.2');
    /* a few marks on the plaster, and the shadow the roof throws */
    R(0, 47, KD.W, 5, 'INK.1');
    for (let i = 0; i < 44; i++) {
      const x = (i * 61) % KD.W, y = 54 + ((i * 37) % Math.max(6, g - 60));
      R(x, y, 2 + (i % 3), 1, (i % 4) ? wl + '.1' : 'INK.1');
    }
    /* posts, and the rail the animals get tied to */
    for (let x = 16; x < KD.W; x += 78) { R(x, 28, 5, g - 28, 'WOOD.0'); R(x, 28, 1, g - 28, 'WOOD.1'); }
    R(0, g - 30, KD.W, 3, 'RUST.1');
    R(0, g - 27, KD.W, 1, 'RUST.0');
    /* tack on the rail: coiled rope, straps, a spare harness */
    for (let i = 0; i < 6; i++) {
      const hx = 40 + i * Math.round((KD.W - 60) / 6);
      if (i % 3 === 0) {
        for (let k = 0; k < 4; k++) R(hx - 6 + k, g - 26, 12 - k * 2, 2, 'BONE.0');
        for (let k = 0; k < 3; k++) R(hx - 5, g - 24 + k * 3, 10, 2, 'BONE.1');
      } else if (i % 3 === 1) {
        R(hx, g - 26, 3, 16, 'CLOTH.2');
        R(hx, g - 26, 3, 2, 'CLOTH.3');
        R(hx - 2, g - 12, 7, 3, 'RUST.2');
      } else {
        R(hx - 4, g - 26, 9, 4, 'WOOD.1');
        R(hx - 2, g - 22, 5, 9, 'CLOTH.1');
      }
    }
    /* the walkway: wet flags, and the coping at the water's edge */
    const wy = WATER();
    R(0, g, KD.W, wy - g, room.floor + '.1');
    R(0, g, KD.W, 2, room.floor + '.2');
    R(0, g + 2, KD.W, 1, 'INK.1');
    for (let x = -8; x < KD.W; x += 24) {
      R(x, g + 3, 1, wy - g - 3, room.floor + '.0');
      R(x + 1, g + 3, 1, wy - g - 3, room.floor + '.2');
    }
    for (let i = 0; i < 70; i++) {
      const x = (i * 43) % KD.W, y = g + 5 + ((i * 23) % Math.max(4, wy - g - 8));
      R(x, y, 1 + (i % 2), 1, (i % 3) ? room.floor + '.3' : 'INK.1');
    }
    R(0, wy - 4, KD.W, 4, room.floor + '.3');
    R(0, wy - 4, KD.W, 1, 'BONE.0');
    /* the way out, drawn as a door in the wall */
    R(2, g - 56, 26, 56, 'INK.0');
    R(4, g - 54, 22, 54, 'WOOD.0');
    R(4, g - 54, 22, 2, 'WOOD.2');
    R(6, g - 50, 18, 30, 'WOOD.1');
    R(21, g - 30, 3, 4, 'GOLD.1');
    KD.Text.draw('OUT', 15, g - 64, 'BONE.1', { align: 'center', tiny: true });
  }

  /* the equipment. Each station is a real object standing in its bay. */
  function rig(ctx, b) {
    const g = GROUND(), cx = b.x + (b.w >> 1), k = b.s.kind;
    const on = b.i === sel;
    const bounce = on ? Math.round(Math.sin(t * 3) * 1) : 0;

    /* a mat under each station, so the two bays are two places */
    /* a duckboard under each station, so the two bays are two places */
    R(cx - 54, g + 3, 108, 11, 'WOOD.0');
    for (let i = 0; i < 13; i++) {
      R(cx - 52 + i * 8, g + 4, 6, 9, (i % 2) ? 'WOOD.1' : 'WOOD.2');
      R(cx - 52 + i * 8, g + 4, 6, 1, 'WOOD.3');
    }
    if (on) { R(cx - 54, g + 3, 108, 1, 'GOLD.2'); R(cx - 54, g + 13, 108, 1, 'GOLD.0'); }

    if (k === 'gate') {
      /* a starting gate you could walk an animal through: two uprights
         to head height, a bar, and a flag on the near post */
      const gy = g - 104;
      R(cx - 46, gy, 9, 104, 'RUST.1'); R(cx - 46, gy, 3, 104, 'RUST.3');
      R(cx + 37, gy, 9, 104, 'RUST.1'); R(cx + 37, gy, 3, 104, 'RUST.3');
      R(cx - 46, gy + 8, 92, 8, 'RUST.2'); R(cx - 46, gy + 8, 92, 2, 'RUST.3');
      R(cx - 46, gy + 44, 92, 5, 'RUST.0');
      R(cx - 46, gy + 74, 92, 4, 'RUST.0');
      /* the gate leaves, hinged and half open */
      R(cx - 37, gy + 18, 6, 82, 'WOOD.0'); R(cx + 31, gy + 18, 6, 82, 'WOOD.0');
      const fl = Math.round(Math.sin(t * 4) * 2);
      R(cx + 46, gy - 16, 2, 22, 'INK.0');
      for (let i = 0; i < 7; i++) {
        R(cx + 48, gy - 16 + i * 3 + fl, 20 - i * 2, 3, i % 2 ? 'BLOOD.2' : 'BONE.1');
      }
      /* lane paint running away from the gate */
      for (let i = 0; i < 5; i++) R(cx - 44 + i * 21, g + 4, 5, 14, 'BONE.0');
    } else if (k === 'ring') {
      /* a roped ring with a heavy bag swinging in it */
      const gy = g - 96;
      R(cx - 48, gy, 7, 96, 'WOOD.0'); R(cx - 48, gy, 2, 96, 'WOOD.2');
      R(cx + 41, gy, 7, 96, 'WOOD.0'); R(cx + 41, gy, 2, 96, 'WOOD.2');
      for (let i = 0; i < 3; i++) {
        R(cx - 48, gy + 14 + i * 26, 96, 4, 'BONE.1');
        R(cx - 48, gy + 17 + i * 26, 96, 1, 'BONE.0');
      }
      const sw = Math.round(Math.sin(t * 2.2) * 5);
      R(cx - 2 + Math.round(sw * 0.4), gy + 4, 3, 20, 'INK.1');
      R(cx - 14 + sw, gy + 22, 28, 46, 'RUST.1');
      R(cx - 14 + sw, gy + 22, 28, 4, 'RUST.3');
      R(cx - 14 + sw, gy + 22, 5, 46, 'RUST.2');
      R(cx - 14 + sw, gy + 64, 28, 4, 'RUST.0');
      for (let i = 0; i < 3; i++) R(cx - 14 + sw, gy + 32 + i * 11, 28, 1, 'INK.1');
    } else if (k === 'chain') {
      /* a netted stone on a chain from the rafters */
      const gy = g - 100;
      R(cx - 4, gy, 8, 40, 'STONE.2');
      for (let i = 0; i < 10; i++) R(cx - 6, gy + i * 4, 12, 3, i % 2 ? 'STONE.3' : 'STONE.1');
      const sq = Math.round(Math.sin(t * 1.7) * 3);
      const sy = gy + 40 + sq;
      R(cx - 26, sy, 52, 54, 'STONE.1');
      R(cx - 24, sy - 2, 48, 4, 'STONE.2');
      R(cx - 26, sy, 7, 54, 'STONE.2');
      R(cx + 20, sy, 6, 54, 'STONE.0');
      R(cx - 26, sy + 50, 52, 4, 'STONE.0');
      /* it is rock, so it is pitted rather than smooth */
      for (let i = 0; i < 40; i++) {
        const px = cx - 24 + ((i * 17) % 48), py = sy + 3 + ((i * 29) % 48);
        R(px, py, 1 + (i % 3), 1, (i % 3) ? 'STONE.0' : 'STONE.2');
      }
      /* the net: three ropes each way, knotted where they cross */
      for (let i = 0; i < 3; i++) {
        R(cx - 20 + i * 18, sy, 2, 54, 'RUST.1');
        R(cx - 26, sy + 12 + i * 15, 52, 2, 'RUST.1');
      }
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        R(cx - 21 + i * 18, sy + 11 + j * 15, 4, 4, 'RUST.2');
      }
      /* the harness on the floor beside it */
      R(cx + 30, g - 6, 22, 6, 'CLOTH.2');
      R(cx + 30, g - 6, 22, 2, 'CLOTH.3');
    } else {
      /* the breath bench: a slab on legs, a strap, and a bucket */
      const gy = g - 52;
      R(cx - 44, gy, 88, 14, 'WOOD.1');
      R(cx - 44, gy, 88, 4, 'WOOD.2');
      R(cx - 44, gy + 12, 88, 2, 'WOOD.0');
      R(cx - 36, gy + 14, 10, 38, 'WOOD.0');
      R(cx + 26, gy + 14, 10, 38, 'WOOD.0');
      R(cx - 12, gy - 6, 24, 6, 'CLOTH.2');
      R(cx - 12, gy - 6, 24, 2, 'CLOTH.3');
      /* the weight rack behind the bench */
      for (let i = 0; i < 3; i++) {
        R(cx - 40 + i * 30, gy - 26, 22, 6, 'STONE.1');
        R(cx - 40 + i * 30, gy - 26, 22, 2, 'STONE.3');
      }
      R(cx - 44, gy - 20, 88, 4, 'RUST.1');
      const bb = Math.round(Math.sin(t * 2) * 1);
      if (KD.PX.has('bn_bucket')) {
        KD.PX.blit(ctx, 'bn_bucket', cx + 48, g - 22 + bb,
                   { anchor: false, dw: 20, dh: 22 });
      }
    }

  }

  /* the sign over each bay: the name, and the price in FED and WIND.
     This is the only text in the room and it is nailed to the wall. */
  function sign(b) {
    const on = b.i === sel;
    const d = P.active();
    const cx = b.x + (b.w >> 1);
    /* a small board nailed high on the post: the name always, the price
       only for the station you are standing at */
    const w = Math.min(b.w - 8, 118), x = cx - (w >> 1), y = 32;
    const h = on ? 25 : 13;
    R(x, y, w, h, 'WOOD.0');
    R(x + 1, y + 1, w - 2, h - 2, on ? 'WOOD.2' : 'WOOD.1');
    R(x + 1, y + 1, w - 2, 1, on ? 'GOLD.2' : 'WOOD.3');
    R(x + 1, y + h - 2, w - 2, 1, 'WOOD.0');
    R(x + 3, y - 2, 2, 2, 'RUST.2'); R(x + w - 5, y - 2, 2, 2, 'RUST.2');
    KD.Text.draw(b.s.name, cx, y + 3, on ? 'INK.0' : 'INK.1',
                 { align: 'center', tiny: true, max: w - 6 });
    if (on) {
      R(x + 2, y + 12, w - 4, 11, 'INK.1');
      KD.Text.draw('-' + b.s.need.fed + ' FED', x + 5, y + 14,
                   (d && F.fed(d) < b.s.need.fed) ? 'BLOOD.3' : 'KELP.2', { tiny: true });
      KD.Text.draw('+' + b.s.stat.toUpperCase(), cx, y + 14, 'GOLD.3',
                   { align: 'center', tiny: true });
      KD.Text.draw('-' + b.s.need.stam + ' WIND', x + w - 5, y + 14,
                   (d && F.stam(d) < b.s.need.stam) ? 'BLOOD.3' : 'WATER.2',
                   { tiny: true, align: 'right' });
    }
  }

  /* the same thin strip the map uses, so the two numbers you are
     spending are always in the same place on screen */
  function slate() {
    const d = P.active();
    R(0, 0, KD.W, 11, 'INK.0');
    R(0, 11, KD.W, 1, 'INK.1');
    KD.Text.draw(room.name, 4, 2, 'BONE.2', { tiny: true });
    KD.Text.draw((KD.State.S.clams || 0) + ' CLAMS', 90, 2, 'GOLD.2', { tiny: true });
    if (d) {
      const mo = F.mood(d);
      const nm = d.name.toUpperCase();
      KD.Text.draw(nm, KD.W - 6, 2, 'BONE.2', { tiny: true, align: 'right' });
      const bw = 40, bx = KD.W - 10 - KD.Text.width(nm, { tiny: true }) - bw;
      R(bx, 4, bw, 3, 'INK.2');
      R(bx, 4, Math.round(bw * F.fed(d) / F.FED_MAX), 3, mo.col);
      R(bx, 8, bw, 2, 'INK.2');
      R(bx, 8, Math.round(bw * F.stam(d) / F.staMax(d)), 2, 'WATER.2');
    }
  }

  /* the channel: banded water with a lit surface, silt drifting past,
     and the tiled wall of the pool showing through */
  function channel() {
    const wy = WATER(), h = KD.H - wy;
    R(0, wy, KD.W, h, 'DEEP.1');
    R(0, wy, KD.W, Math.round(h * 0.28), 'DEEP.2');
    R(0, wy + Math.round(h * 0.62), KD.W, Math.round(h * 0.38), 'DEEP.0');
    /* the surface: a bright line that ripples along its length */
    for (let x = 0; x < KD.W; x += 2) {
      const k = Math.round(Math.sin(x * 0.09 + t * 2.2) * 1);
      R(x, wy + k, 2, 2, 'WATER.2');
      R(x, wy + k + 2, 2, 1, 'WATER.1');
    }
    /* silt going past, so the water is moving */
    for (let i = 0; i < 30; i++) {
      const x = Math.round((i * 173 + t * (14 + (i % 4) * 8)) % KD.W);
      const y = wy + 6 + ((i * 61) % Math.max(4, h - 8));
      R(x, y, 2, 1, (i % 3) ? 'WATER.0' : 'DEEP.3');
    }
  }

  function draw() {
    const ctx = KD.Screen.ctx();
    shell();
    const B = bays();
    for (const b of B) rig(ctx, b);
    channel();
    /* the animal in the water, at the station you are standing at */
    const d = P.active();
    if (d) {
      const b = B[sel];
      const cx = b.x + (b.w >> 1);
      const swim = Math.sin(t * 1.5) * 3;
      const pose = Math.floor(t * 2) % 2 ? 'cruise1' : 'cruise0';
      KD.Dolph.draw(ctx, d, pose, Math.round(cx - KD.Dolph.W / 2),
                    Math.round(WATER() - 16 + swim), {});
      /* it breaks the surface, so it is IN the water and not on it */
      for (let i = 0; i < 8; i++) {
        const sx = cx - 30 + i * 8;
        R(sx, WATER() + Math.round(Math.sin(t * 3 + i) * 1), 6, 2, 'WATER.3');
      }
    }
    for (const b of B) sign(b);
    slate();
    /* the blurb sits over the water, tiny, and only for a moment */
    if (t < 5) {
      const a = Math.min(1, (5 - t) * 1.5);
      if (a > 0.05) KD.Text.draw(room.blurb, KD.W >> 1, KD.H - 10, 'WATER.1',
                                 { align: 'center', tiny: true });
    }
    if (warnT > 0 && warn) {
      const w = KD.Text.width(warn) + 14, x = (KD.W - w) >> 1, y = Math.round(KD.H * 0.46);
      R(x, y, w, 17, 'BLOOD.0');
      R(x, y, w, 1, 'BLOOD.3');
      R(x, y + 17, w, 1, 'INK.0');
      KD.Text.draw(warn, KD.W >> 1, y + 5, 'BONE.2', { align: 'center' });
    }
    if (goT > 0) {
      const a = 1 - goT / 0.18, h = Math.round(KD.H * a);
      R(0, (KD.H - h) >> 1, KD.W, h, 'INK.0');
    }
    KD.Fx.draw();
    KD.Coach.draw();
    if (KD.touch) KD.UI.touchPad([{ key: 'Space', label: 'WORK' },
                                  { key: 'Escape', label: 'OUT' }], { noStick: true });
  }

  return { enter, update, draw, _rooms: ROOMS, _start: start };
})();
