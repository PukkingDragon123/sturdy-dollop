/* ============================================================
   scenes/interior.js - what is inside a giant fruit.

   The exteriors are solid shells in the tile world, so a room is
   not a cave you can get walled into - it is its own scene,
   drawn at full detail. Every room is built from one kit (fruit
   flesh wall, plank wainscot, plank floor, rind ceiling) and
   then dressed by trade: the smith gets a forge and a weapon
   rack, the tavern gets taps and a keg on the counter, your own
   shack gets the bed and every plush pet you own.

   Layout is deterministic from the building's own position, so
   your barber is always your barber - but nobody else's town is
   laid out like yours.
   ============================================================ */
KD.Scenes.interior = (function () {
  const S = KD.State;
  const TS = 8;
  let b = null;                              // the building we walked into
  let room = null;                           // the dressed layout
  let px = 0, vx = 0, face = 1, anim = 0;    // the king, walking the floor
  let t = 0, talkT = 0, line = '', lineI = 0;
  let shopOpen = false, shopSel = 0;
  const BTNS = [];

  /* ---- geometry: one room, centred, floor near the bottom ---------- */
  /* Size the room to what is IN it, not to the screen. The king is 14px
     tall and the furniture 12-22px, so a room 180px tall left a flat pink
     field four storeys high with a doll's house at the bottom. A 54px wall
     puts his head at two-thirds of it, which is what a room looks like.
     The rest of the frame is the rind he is standing inside. */
  function geom() {
    /* and not too WIDE either: 400px of room with a 14px king in it read
       as a corridor. About twelve paces across is a room. */
    /* Grow with the screen, within reason: a fixed 268 looked marooned in
       the middle of a 624-wide phone in landscape. */
    const w = Math.max(220, Math.min(Math.round(KD.W * 0.62), 344));
    const wall = 66, floorH = 22;   // a 36px king needs the headroom
    const h = wall + floorH;
    const x = Math.round((KD.W - w) / 2);
    const y = Math.round((KD.H - h) / 2) + 6;
    return { x, y, w, h, wall, floor: y + wall };
  }

  /* ---- what goes in this room ------------------------------------- */
  /* Each trade names its own dressing. `wall` pieces hang, `floor`
     pieces stand, `on` pieces sit on the counter, `plush` is the dumb
     stuff. Positions come out as fractions of the room, so every screen
     width lays the same room out the same way. */
  const DRESS = {
    smith:    { wall: ['fu_rack', 'fu_picture'], floor: ['fu_forge', 'fu_barrel', 'fu_crate'],
                on: ['it_hammer'], plush: ['pl_crab'] },
    tackler:  { wall: ['fu_shelf', 'fu_board'], floor: ['fu_barrel', 'fu_crate', 'fu_crate'],
                on: ['it_spear'], plush: ['pl_pufferfish'] },
    princess: { wall: ['fu_taps', 'fu_bunting', 'fu_picture'], floor: ['fu_table', 'fu_stool', 'fu_barrel'],
                on: ['it_beer'], plush: ['pl_kegdoll', 'pl_dolphin'] },
    stabler:  { wall: ['fu_shelf', 'fu_bunting'], floor: ['fu_crate', 'fu_barrel', 'fu_pot'],
                on: [], plush: ['pl_seahorse', 'pl_dolphin'] },
    trainer:  { wall: ['fu_board', 'fu_towel'], floor: ['fu_crate', 'fu_crate', 'fu_stool'],
                on: [], plush: ['pl_shark'] },
    bookie:   { wall: ['fu_board', 'fu_picture'], floor: ['fu_table', 'fu_stool', 'fu_crate'],
                on: ['fu_books'], plush: ['pl_turtle'] },
    scholar:  { wall: ['fu_shelf', 'fu_picture', 'fu_lamp'], floor: ['fu_table', 'fu_stool', 'fu_pot'],
                on: ['fu_books'], plush: ['pl_narwhal'] },
    market:   { wall: ['fu_shelf', 'fu_bunting'], floor: ['fu_crate', 'fu_crate', 'fu_barrel', 'fu_pot'],
                on: [], plush: ['pl_jelly'] },
    barber:   { wall: ['fu_picture', 'fu_picture', 'fu_towel'], floor: ['fu_stool', 'fu_sink', 'fu_pot'],
                on: [], plush: ['pl_pile'] },
    bathhouse:{ wall: ['fu_towel', 'fu_towel'], floor: ['fu_sink', 'fu_stool', 'fu_pot', 'fu_pot'],
                on: [], plush: ['pl_whale'] },
    guard:    { wall: ['fu_rack', 'fu_board'], floor: ['fu_crate', 'fu_stool'],
                on: [], plush: [] },
    home:     { wall: ['fu_picture', 'fu_shelf', 'fu_lamp'], floor: ['fu_bed', 'fu_table', 'fu_stool'],
                on: ['fu_books'],
                plush: ['pl_kingdoll', 'pl_dolphin', 'pl_octopus', 'pl_crab', 'pl_turtle', 'pl_pile'] }
  };

  /* what each trade sells. cost is in clams. */
  const STOCK = {
    smith:    [['ore_copper', 14], ['ore_iron', 34], ['flint', 6], ['plank', 5]],
    tackler:  [['kelp_fibre', 4], ['bone', 12], ['shell', 8]],
    princess: [['beer_lager', 30], ['beer_stout', 60]],
    stabler:  [['kelp_fibre', 4]],
    scholar:  [['rot_crystal', 90], ['pearl', 120]],
    market:   [['plank', 5], ['stone', 4], ['glass', 12], ['torch', 8], ['lantern', 40]]
  };

  /* the things people say. Every line is about the weight, the crown or
     the Deep, because that is the only story in this town. */
  const LINES = {
    smith: ['Heat, hammer, quench. You want a blade or you want to talk?',
            'The old King had a trident you could not lift today.',
            'Bring me ore. I will bring you an edge.'],
    tackler: ['Line, hook, patience. Two of those I can sell you.',
              'Everything past the Gate bites back. Take a spear.'],
    princess: ['You came back. You always come back.',
               'I am a keg, love. I was always a keg.',
               'One more will not hurt. That is what you said last year.'],
    stabler: ['They eat better than you do, majesty.',
              'A mount will carry you. It will not carry all of you.'],
    trainer: ['Under the bar or out the door.', 'Reps. Not opinions. Reps.',
              'The Deep did not get deep by resting.'],
    bookie: ['Odds on you? Long. Very long. Want in?',
             'Nobody has backed the old King in four seasons.'],
    scholar: ['The crown is not heavy. You are.',
              'The Deep keeps an army of eight-armed courtiers.',
              'He changes clothes between rounds. Vanity is a tell.'],
    market: ['Everything has a price. Even that.', 'Kelp is cheap. Dignity is not.'],
    barber: ['Sit. I will not ask what happened.',
             'A trim will not fix it. It will not hurt either.'],
    bathhouse: ['Steam, salt, silence. Ten clams.', 'Sweat is just weight in a hurry.'],
    guard: ['The Gate opens for the fit. Not the fat.',
            'Kilos and levels, majesty. Come back lighter.'],
    home: ['Home. Old beer and wet dolphin.',
           'The plush king on the shelf still fits his crown.']
  };

  /* deterministic little PRNG, so a room is always dressed the same way */
  function rng(seed) {
    let s = ((seed * 1103515245 + 12345) & 0x7fffffff) || 7;
    return () => { s = (s * 1103515 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }
  const px_ = (n) => (KD.PX.has(n) ? KD.PX.get(n) : null);

  function dress() {
    const g = geom();
    const job = b.kind.home ? 'home' : (b.kind.job || 'market');
    const D = DRESS[job] || DRESS.market;
    const r = rng(b.x * 31 + b.y * 17);
    const out = { job, D, wall: [], floor: [], on: [], plush: [], counter: null };
    if (!b.kind.home) out.counter = { x: g.x + Math.round(g.w * 0.60), y: g.floor };
    /* wall pieces along the upper wall, spread so nothing overlaps */
    const slots = [0.13, 0.34, 0.55, 0.76, 0.90];
    D.wall.forEach((n, i) => {
      const s = px_(n); if (!s) return;
      const f = slots[i % slots.length];
      const room = Math.max(2, g.wall - s.h - 12);
      out.wall.push({ n, x: Math.round(g.x + g.w * f - s.w / 2), y: g.y + 5 + ((i % 2) ? Math.min(6, room) : 0) });
    });
    /* floor props stand along the left half, leaving a walkway */
    let fx = g.x + 14;
    const limit = out.counter ? out.counter.x - 12 : g.x + g.w - 20;
    D.floor.forEach((n) => {
      const s = px_(n); if (!s) return;
      if (fx + s.w > limit) return;
      out.floor.push({ n, x: fx, y: g.floor - s.h });
      fx += s.w + 4 + ((r() * 6) | 0);
    });
    /* one or two more crowded into the far right corner */
    let rx = g.x + g.w - 12;
    D.floor.slice().reverse().forEach((n, i) => {
      if (i > 1) return;
      const s = px_(n); if (!s) return;
      rx -= s.w + 3;
      if (rx < g.x + g.w * 0.78) return;
      out.floor.push({ n, x: rx, y: g.floor - s.h });
    });
    /* things on the counter */
    if (out.counter) {
      const c = px_('fu_counter');
      D.on.forEach((n, i) => {
        const s = px_(n); if (!s) return;
        out.on.push({ n, x: out.counter.x + 5 + i * (s.w + 5), y: out.counter.y - (c ? c.h : 16) - s.h + 4 });
      });
    }
    /* plush pets: the first two go on the shelf, the rest sit about */
    const shelf = out.wall.find((q) => q.n === 'fu_shelf');
    const bed = out.floor.find((q) => q.n === 'fu_bed');
    D.plush.forEach((n, i) => {
      const s = px_(n); if (!s) return;
      if (shelf && i === 0) { out.plush.push({ n, x: shelf.x + 3, y: shelf.y - s.h + 3 }); return; }
      if (shelf && i === 1) { out.plush.push({ n, x: shelf.x + 14, y: shelf.y - s.h + 3 }); return; }
      if (bed && i === 2) { out.plush.push({ n, x: bed.x + 6, y: bed.y - s.h + 5, flip: true }); return; }
      out.plush.push({
        n, x: Math.round(g.x + 16 + r() * Math.max(1, g.w - 46)),
        y: g.floor - s.h, flip: r() < 0.5
      });
    });
    return out;
  }

  /* ---- scene ------------------------------------------------------ */
  function enter(args) {
    b = (args && args.b) || null;
    if (!b) { KD.Game.go('play', {}); return; }
    room = dress();
    const g = geom();
    px = g.x + 26; vx = 0; face = 1; anim = 0; t = 0;
    talkT = 0; line = ''; lineI = 0; shopOpen = false; shopSel = 0;
    KD.UI.guard(0.25);
    S.say(b.kind.title, 'GOLD.3');
  }

  const nearNpc = () => !!room.counter && Math.abs(px - room.counter.x) < 34;
  function nearDoor() { const g = geom(); return px < g.x + 24 || px > g.x + g.w - 24; }

  function serviceWord() {
    const j = room.job;
    if (j === 'trainer') return 'TRAIN';
    if (j === 'bathhouse') return 'SOAK';
    if (j === 'barber') return 'TRIM';
    if (j === 'guard') return 'ASK';
    if (b.kind.home) return 'SLEEP';
    return 'BUY';
  }

  /* TALK is the quest button when there is quest business, and flavour
     otherwise. One button, and it always does the useful thing first. */
  function talk() {
    const job = room.job;
    const biz = KD.Quests.forJob(job);
    if (biz) {
      if (biz.offer) {
        line = '"' + biz.q.text + '"';
        KD.Quests.accept(biz.q);
        talkT = 5.4;
        return;
      }
      if (biz.ready) {
        if (KD.Quests.turnIn(biz.q)) { line = '"That will do. Take this."'; talkT = 4.4; return; }
      }
      line = '"' + biz.q.hint + '"';
      talkT = 4.6;
      KD.Sfx.play('click');
      return;
    }
    const lines = LINES[job] || ['...'];
    line = lines[lineI % lines.length];
    lineI++; talkT = 4.4;
    KD.Sfx.play('click');
  }

  function service() {
    const job = room.job;
    if (job === 'trainer') { KD.Game.go('gym', {}); return; }
    if (job === 'bathhouse') {
      if (!S.spend(10)) { S.say('Ten clams. You have ' + S.S.clams + '.', 'ROT.3'); KD.Sfx.play('deny'); return; }
      S.S.hp = S.S.hpMax || S.S.hp; S.burnFat(0.4);
      S.say('Steamed. Lighter, even.', 'KELP.2'); KD.Sfx.play('levelup'); return;
    }
    if (job === 'barber') {
      if (!S.spend(25)) { S.say('Twenty-five clams.', 'ROT.3'); KD.Sfx.play('deny'); return; }
      S.S.flags.trimmed = (S.S.flags.trimmed || 0) + 1;
      S.say('There. Regal. Almost.', 'GOLD.3'); KD.Sfx.play('craft'); return;
    }
    if (job === 'guard') {
      const why = KD.Goal.why(S.S, 'gate');
      S.say(why || 'The Gate is open, majesty. Go and be thin.', why ? 'ROT.3' : 'KELP.2');
      return;
    }
    if (job === 'bookie') { S.say('The track is dry this season.', 'INK.3'); return; }
    if (b.kind.home) {
      S.S.hp = S.S.hpMax || S.S.hp; S.save();
      S.say('Slept. Saved. Still fat.', 'BONE.2'); KD.Sfx.play('open'); return;
    }
    if (!(STOCK[job] || []).length) { S.say('Nothing for sale today.', 'INK.3'); return; }
    shopOpen = true; shopSel = 0; KD.Sfx.play('open');
  }

  function buy() {
    const row = (STOCK[room.job] || [])[shopSel];
    if (!row) return;
    if (!S.spend(row[1])) { S.say('Not enough clams.', 'ROT.3'); KD.Sfx.play('deny'); return; }
    S.give(row[0], 1);
    S.say('Bought ' + (S.nameOf({ id: row[0] }) || row[0]) + '.', 'KELP.2');
    KD.Sfx.play('pickup');
  }

  const leave = () => KD.Game.go('play', { from: 'interior' });

  /* ---- touch buttons: three, big, and they say what they do -------- */
  function layout() {
    BTNS.length = 0;
    if (!KD.touch) { KD.In.buttons(BTNS); return; }
    const R = 22, r = 16;
    const bx = KD.W - R - 12, by = KD.H - R - 12;
    const main = nearNpc() ? 'TALK' : nearDoor() ? 'OUT' : 'USE';
    BTNS.push({ name: 'act', x: bx, y: by, r: R, label: main, icon: 'ic_check', big: true });
    if (nearNpc()) BTNS.push({ name: 'trade', x: bx - R - r - 6, y: by - 6, r, label: serviceWord(), icon: 'ic_bag' });
    else BTNS.push({ name: 'out', x: bx - R - r - 6, y: by - 6, r, label: 'OUT', icon: 'ic_arrow_up' });
    BTNS.push({ name: 'bag', x: KD.W - 16, y: 46, r: 11, label: 'BAG', icon: 'ic_bag', tab: true });
    KD.In.buttons(BTNS);
  }

  /* ---- update ----------------------------------------------------- */
  function update(dt) {
    t += dt;
    if (talkT > 0) talkT -= dt;
    layout();
    S.tick(dt);
    KD.UI.tickGuard(dt);
    KD.Fx.update(dt);
    KD.Belly.update(dt, S);
    const In = KD.In, g = geom();
    if (shopOpen) {
      const st = STOCK[room.job] || [];
      if (In.isHit('ArrowDown', 'KeyS')) shopSel = Math.min(st.length - 1, shopSel + 1);
      if (In.isHit('ArrowUp', 'KeyW')) shopSel = Math.max(0, shopSel - 1);
      if (In.isHit('Enter', 'Space')) buy();
      if (In.isHit('Escape', 'KeyQ') || In.actHit('trade')) shopOpen = false;
      return;
    }
    if (KD.Panels.isOpen()) {
      if (In.isHit('Escape')) KD.Panels.close();
      if (In.isHit('KeyC')) KD.Panels.toggle('craft');
      if (In.isHit('KeyI', 'Tab')) KD.Panels.toggle('bag');
      if (In.isHit('KeyV')) KD.Panels.toggle('tree');
      if (In.actHit('bag')) KD.Panels.toggle('bag');
      return;
    }
    /* walk the floor. No gravity in here - it is one room. */
    const v = In.stick();
    const ax = Math.abs(v.x) > 0.16 ? v.x : 0;
    vx += (ax * 78 - vx) * Math.min(1, dt * 12);
    px = Math.max(g.x + 12, Math.min(g.x + g.w - 12, px + vx * dt));
    if (Math.abs(ax) > 0.16) { face = ax < 0 ? -1 : 1; anim += dt * 9; }
    /* verbs */
    if (In.isHit('KeyE', 'Space', 'Enter') || In.actHit('act')) {
      if (nearNpc()) talk();
      else if (nearDoor()) leave();
      else if (b.kind.station) KD.Panels.toggle('craft');
      else talkT = 0;
    }
    if (In.isHit('KeyF') || In.actHit('trade')) { if (nearNpc()) service(); }
    if (In.actHit('out')) leave();
    if (In.isHit('Escape')) leave();
    if (In.isHit('KeyC')) KD.Panels.toggle('craft');
    if (In.isHit('KeyI', 'Tab') || In.actHit('bag')) KD.Panels.toggle('bag');
    if (In.isHit('KeyV')) KD.Panels.toggle('tree');
  }

  /* ---- draw ------------------------------------------------------- */
  /* two alternating 8x8 faces, staggered row by row so no seam lines up */
  function tileFill(ctx, x, y, w, h, a, bb) {
    for (let ty = 0; ty < h; ty += TS) {
      for (let tx = 0; tx < w; tx += TS) {
        const alt = ((((tx / TS) | 0) * 3 + ((ty / TS) | 0) * 5) % 7) < 3;
        KD.PX.blit(ctx, alt && bb ? bb : a, x + tx, y + ty, {
          clip: { w: Math.min(TS, w - tx), h: Math.min(TS, h - ty) }
        });
      }
    }
  }

  /* The shell around the room: you are inside a fruit, so the frame is
     rind, going darker the further it is from the lit room. */
  function outside(ctx, g) {
    KD.Screen.clear('INK.0');
    /* One shade for the whole shell, then a dithered vignette over it.
       Stepping the shade by distance drew a visible RECTANGLE where the
       band changed, which is the one thing a vignette must not do. */
    for (let ty = 0; ty < KD.H; ty += TS) {
      for (let tx = 0; tx < KD.W; tx += TS) {
        if (tx + TS > g.x - 8 && tx < g.x + g.w + 8 && ty + TS > g.y - 8 && ty < g.y + g.h + 8) continue;
        KD.PX.blit(ctx, ((tx / TS | 0) + (ty / TS | 0)) & 1 ? 'in_wall2' : 'in_wall', tx, ty, { shade: 2 });
      }
    }
    /* four soft rings of dark, each dithered, so the falloff has no edge */
    for (let k = 1; k <= 4; k++) {
      const pad = 8 + (k - 1) * 26;
      const x0 = g.x - pad, y0 = g.y - pad;
      const x1 = g.x + g.w + pad, y1 = g.y + g.h + pad;
      const a = 0.22;
      KD.Dither.wash(ctx, 0, 0, KD.W, Math.max(0, y0), 'INK.0', a);
      KD.Dither.wash(ctx, 0, Math.min(KD.H, y1), KD.W, Math.max(0, KD.H - y1), 'INK.0', a);
      KD.Dither.wash(ctx, 0, Math.max(0, y0), Math.max(0, x0), Math.max(0, Math.min(KD.H, y1) - Math.max(0, y0)), 'INK.0', a);
      KD.Dither.wash(ctx, Math.min(KD.W, x1), Math.max(0, y0), Math.max(0, KD.W - x1), Math.max(0, Math.min(KD.H, y1) - Math.max(0, y0)), 'INK.0', a);
    }
    /* a thick rind lip right around the opening */
    KD.Screen.rect(g.x - 8, g.y - 8, g.w + 16, 8, 'CORAL.0');
    KD.Screen.rect(g.x - 8, g.y + g.h, g.w + 16, 8, 'CORAL.0');
    KD.Screen.rect(g.x - 8, g.y - 8, 8, g.h + 16, 'CORAL.0');
    KD.Screen.rect(g.x + g.w, g.y - 8, 8, g.h + 16, 'CORAL.0');
    KD.Dither.fill(ctx, g.x - 8, g.y - 8, g.w + 16, 4, 'CORAL.1', 0.5);
    KD.Screen.frame(g.x - 9, g.y - 9, g.w + 18, g.h + 18, 'INK.0');
  }

  function draw(ctx) {
    const g = geom();
    outside(ctx, g);
    /* the room shell: flesh wall, plank wainscot, rind ceiling */
    tileFill(ctx, g.x, g.y, g.w, g.wall, 'in_wall', 'in_wall2');
    for (let tx = 0; tx < g.w; tx += TS) {
      KD.PX.blit(ctx, 'in_ceil', g.x + tx, g.y, { clip: { w: Math.min(TS, g.w - tx), h: TS } });
      KD.PX.blit(ctx, 'in_wainscot', g.x + tx, g.floor - 5, { clip: { w: Math.min(TS, g.w - tx), h: 5 } });
    }
    for (let ty = g.y; ty < g.floor; ty += TS) {
      KD.PX.blit(ctx, 'in_beam', g.x, ty, { clip: { w: TS, h: Math.min(TS, g.floor - ty) } });
      KD.PX.blit(ctx, 'in_beam', g.x + g.w - TS, ty, { clip: { w: TS, h: Math.min(TS, g.floor - ty) } });
    }
    tileFill(ctx, g.x, g.floor, g.w, g.h - g.wall, 'in_floor', 'in_floor2');
    KD.Screen.rect(g.x, g.floor - 1, g.w, 1, 'INK.0');
    KD.Screen.frame(g.x - 1, g.y - 1, g.w + 2, g.h + 2, 'INK.0');
    /* the rug, under everything */
    const rug = px_('fu_rug');
    if (rug) KD.PX.blit(ctx, 'fu_rug', Math.round(g.x + (g.w - rug.w) / 2), g.floor + 3, {});
    /* a doorway at each end, so leaving is never a hunt */
    for (const side of [-1, 1]) {
      const dh = 26, dw = 15;
      const dx = side < 0 ? g.x + 3 : g.x + g.w - 3 - dw;
      KD.Screen.rect(dx, g.floor - dh, dw, dh, 'WOOD.3');
      KD.Screen.rect(dx + 2, g.floor - dh + 2, dw - 4, dh - 2, 'WATER.0');
      KD.Dither.fill(ctx, dx + 2, g.floor - dh + 2, dw - 4, 12, 'WATER.1', 0.45);
      KD.Dither.fill(ctx, dx + 2, g.floor - 10, dw - 4, 9, 'INK.0', 0.35);
      KD.Screen.frame(dx, g.floor - dh, dw, dh, 'INK.0');
      /* a step out onto the street, so it reads as a way out */
      KD.Screen.rect(dx + 1, g.floor, dw - 2, 2, 'SAND.1');
      KD.Screen.rect(dx + 1, g.floor + 2, dw - 2, 1, 'SAND.0');
    }
    /* dressing, back to front */
    for (const q of room.wall) KD.PX.blit(ctx, q.n, q.x, q.y, {});
    for (const q of room.floor) KD.PX.blit(ctx, q.n, q.x, q.y, {});
    if (room.counter) {
      const npc = npcSprite();
      const c = px_('fu_counter');
      if (npc) KD.PX.blit(ctx, npc, room.counter.x + 16, room.counter.y - 2, {});
      /* a mark over the shopkeeper when they have work, or want it back */
      const biz = KD.Quests.forJob(room.job);
      if (biz) {
        const mx = room.counter.x + 16, my = room.counter.y - 34 + (Math.sin(t * 3) > 0 ? 0 : 1);
        const col = biz.offer ? 'GOLD.3' : (biz.ready ? 'KELP.2' : 'BONE.0');
        KD.Screen.rect(mx - 1, my, 3, 6, col);
        KD.Screen.rect(mx - 1, my + 8, 3, 3, col);
        KD.Screen.rect(mx - 2, my - 1, 5, 1, 'INK.0');
      }
      KD.PX.blit(ctx, 'fu_counter', room.counter.x, room.counter.y - (c ? c.h : 16), {});
      for (const q of room.on) KD.PX.blit(ctx, q.n, q.x, q.y, {});
    }
    for (const q of room.plush) KD.PX.blit(ctx, q.n, q.x, q.y, { flipX: !!q.flip });
    /* the station, if this trade has one, standing right of the counter */
    if (b.kind.station) {
      const sn = 'st_' + b.kind.station;
      if (KD.PX.has(sn)) {
        const s = KD.PX.get(sn);
        KD.PX.blit(ctx, sn, g.x + Math.round(g.w * 0.40), g.floor - s.h, {});
      }
    }
    drawYou(ctx, g);
    KD.Fx.draw(ctx, { x: 0, y: 0 });
    hud(ctx, g);
    if (shopOpen) shopPanel(ctx, g);
    KD.UI.touchPad(BTNS);
    KD.Panels.draw(S);
    KD.UI.tooltips();
  }

  /* Who runs which shop, as a creature. The talk frame (index 2) is used
     while a line is on screen, so the mouth is open when they are speaking. */
  const WHO = {
    smith:     { spr: 'fk_crab',     port: 'po_crab',     name: 'Nipper' },
    tackler:   { spr: 'fk_puffer',   port: 'po_puffer',   name: 'Bloat' },
    princess:  { spr: 'fk_keg',      port: 'po_keg',      name: 'The Keg' },
    stabler:   { spr: 'fk_seahorse', port: 'po_seahorse', name: 'Tack' },
    trainer:   { spr: 'fk_crab',     port: 'po_crab',     name: 'Brine' },
    bookie:    { spr: 'fk_angler',   port: 'po_angler',   name: 'Lantern' },
    scholar:   { spr: 'fk_octo',     port: 'po_octo',     name: 'Inkwell' },
    market:    { spr: 'fk_shrimp',   port: 'po_shrimp',   name: 'Snip' },
    barber:    { spr: 'fk_shrimp',   port: 'po_shrimp',   name: 'Snip' },
    bathhouse: { spr: 'fk_turtle',   port: 'po_turtle',   name: 'Bulwark' },
    guard:     { spr: 'fk_turtle',   port: 'po_turtle',   name: 'Bulwark' },
    home:      { spr: 'fk_keg',      port: 'po_keg',      name: 'The Keg' }
  };
  const who = () => WHO[room.job] || WHO.market;

  function npcSprite() {
    const w = who();
    /* mouth open while a line is up */
    if (talkT > 0 && KD.PX.has(w.spr + '2')) return w.spr + '2';
    if (KD.PX.hasAny(w.spr)) return KD.PX.frameOf(w.spr, t * 0.7);
    return KD.PX.has(w.spr + '0') ? w.spr + '0' : null;
  }

  function drawYou(ctx, g) {
    const NEW = KD.PX.hasAny('pk_idle');
    const pre = NEW ? 'pk_' : 'king_';
    let base = Math.abs(vx) > 8 ? pre + 'walk' : pre + 'idle';
    if (!KD.PX.hasAny(base)) base = pre + 'idle';
    const name = KD.PX.frameOf(base, anim * 0.12);
    if (!KD.PX.has(name)) return;
    KD.PX.blit(ctx, name, Math.round(px), g.floor, { flipX: face < 0 });
    /* and his belly, on the same spring it uses outside */
    if (NEW) KD.Belly.draw(ctx, Math.round(px), g.floor, face, S);
  }

  function hud(ctx, g) {
    const title = b.kind.title;
    const tw = KD.Text.width(title) + 16;
    KD.Screen.rect(Math.round((KD.W - tw) / 2), g.y - 28, tw, 14, 'INK.0');
    KD.Screen.frame(Math.round((KD.W - tw) / 2), g.y - 28, tw, 14, 'GOLD.0');
    KD.Text.draw(title, KD.W / 2, g.y - 24, 'GOLD.3', { align: 'center' });
    KD.Text.draw(S.S.clams + ' CLAMS', 8, 6, 'GOLD.2', { tiny: true });
    KD.Text.draw(Math.round(S.S.weight) + ' KG', 8, 15, 'BONE.1', { tiny: true });
    if (!KD.touch) {
      let hint = 'A / D walk   -   ESC leave';
      if (nearNpc()) hint = 'E talk   -   F ' + serviceWord().toLowerCase();
      else if (nearDoor()) hint = 'E to step outside';
      else if (b.kind.station) hint = 'E to use the ' + b.kind.station;
      KD.Text.draw(hint, KD.W / 2, g.y + g.h + 14, 'BONE.1', { align: 'center', tiny: true, shadow: 'INK.0' });
    }
    if (talkT > 0 && line) {
      const w = who();
      KD.Talk.panel({ portrait: w.port, name: w.name }, line, { bottom: KD.touch ? 6 : 10 });
    }
  }

  function shopPanel(ctx, g) {
    const st = STOCK[room.job] || [];
    const w = 204, h = 30 + st.length * 12;
    const x = Math.round((KD.W - w) / 2), y = Math.round((KD.H - h) / 2);
    const p = KD.UI.titled(x, y, w, h, 'FOR SALE');
    st.forEach((row, i) => {
      const ry = p.iy + i * 12;
      const hot = KD.UI.inside(x + 4, ry - 2, w - 8, 11);
      if (i === shopSel || hot) KD.Screen.rect(x + 4, ry - 2, w - 8, 11, 'DEEP.1');
      KD.Text.draw(S.nameOf({ id: row[0] }) || row[0], x + 8, ry, i === shopSel ? 'WHITE' : 'BONE.1', { tiny: true });
      KD.Text.draw(row[1] + 'c', x + w - 8, ry, S.S.clams >= row[1] ? 'GOLD.2' : 'ROT.3',
        { tiny: true, align: 'right' });
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) { shopSel = i; KD.In.consumedClick(); buy(); }
    });
    KD.Text.draw(KD.touch ? 'tap a row to buy' : 'up/down   ENTER buy   ESC close',
      x + w / 2, y + h - 12, 'INK.3', { tiny: true, align: 'center' });
    if (KD.UI.button(x + w - 28, y + 1, 25, 11, 'X')) shopOpen = false;
  }

  return { enter, update, draw };
})();
