/* ============================================================
   scenes/battle.js - the fight.

   THE PROBLEM WITH A STAT FIGHT is that you are not in it. You
   pick the biggest number, the numbers argue, and you read the
   result. So there is a second layer here, and it is the one you
   actually play: every move has a TIMING WINDOW, and the window
   is narrower the harder the move hits.

     Headbutt   30% of the bar. Always lands well enough.
     Tail Slap  21%.
     Corkscrew  15%.
     Breach     10%, and two and a half times the damage.

   Which means the decision each round is not "which is biggest",
   it is "how much am I willing to miss". A Breach that lands
   ends a fight. A Breach that misses costs you half your breath
   and the round.

   BREATH is the budget. Every move spends it, nothing gives it
   back except Holding or going up for air - and going up is a
   free hit for the other animal. Two thirds of the fights you
   lose, you lose because you ran out of air with your health
   bar still half full.

   The arena is drawn here rather than in an art file, because it
   is one place and it needs to move: lamps swing, the crowd
   shifts, silt drifts through the beams, and the water goes red
   at the edges when your animal is nearly done.
   ============================================================ */
KD.Scenes.battle = (function () {
  const P = KD.Pod;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);

  let t = 0;
  let mine = null, foe = null, entry = null, tier = null;
  let A = null, B = null;               // the two fighters' live state
  let phase = 'in', pt = 0;
  let sel = 0, moves = [];
  let bar = { x: 0, dir: 1, sp: 1.1, win: 0.3, live: false };
  let shownMsg = '', msgT = 0;
  let hitFx = [], nums = [];
  let round = 1, log = [];
  let result = null;
  /* what the other animal is winding up this round, decided BEFORE you
     pick so that reading it is the game */
  let plan = null, planHid = false, tellT = 0;
  let combo = 0, comboMax = 1;      /* how many extra strikes this round */
  let lastQ = '';                   /* what the last strike was, for the banner */
  const BTNS = [];

  /* ---- entering ----------------------------------------------------- */
  function enter(args) {
    t = 0; pt = 0; round = 1; sel = 0;
    hitFx = []; nums = []; log = []; result = null;
    entry = (args && args.entry) || P.CARD[0];
    tier = P.TIERS[entry.t];
    mine = P.active();
    foe = P.foeOf(entry);
    A = live(mine, false);
    B = live(foe, true);
    moves = P.movesOf(mine);
    combo = 0;
    comboMax = 1 + (KD.Tree ? KD.Tree.val(mine, 'combo') : 0);
    plan = null; planHid = false; lastQ = '';
    phase = 'in';
    say(entry.who + ': ' + (entry.line || '...'));
    KD.Sfx.play('open');
  }

  function live(d, isFoe) {
    return {
      d: d, foe: !!isFoe,
      hp: P.hpMax(d), hpMax: P.hpMax(d),
      air: P.airMax(d), airMax: P.airMax(d),
      pose: 'cruise0', poseT: 0,
      stun: 0, guard: 0, meter: 0,
      x: isFoe ? 0 : 0, bob: Math.random() * 6, shake: 0
    };
  }

  const say = (s) => { shownMsg = s; msgT = 3.4; };

  /* ---- the round ---------------------------------------------------- */
  function beginPick() {
    phase = 'pick'; pt = 0; sel = 0;
    combo = 0;
    /* THE TELEGRAPH. The other animal decides now, and shows it. A
       cagey one (high spirit, high card) sometimes hides what it is
       doing, and hiding it is the only thing that makes the Iron Gate
       frightening once you can read the ring. */
    plan = foePlan();
    const cag = Math.min(0.55, (B.d.spi || 10) * 0.006 + entry.t * 0.07);
    planHid = Math.random() < cag;
    tellT = 0;
  }

  function armBar(move, who) {
    let w = move.win * P.winScale(who.d);
    /* a follow-up in a combo is HARDER: the window closes by a fifth for
       every strike you have already landed this round, so pushing a chain
       is a real decision and not free damage */
    if (combo > 0) w *= Math.max(0.45, 1 - combo * 0.2);
    bar.win = Math.max(0.05, Math.min(0.55, w));
    /* the sweep gets faster the higher the card, so the Iron Gate is a
       different game from the Shallow Card with the same buttons */
    bar.sp = (0.95 + entry.t * 0.16) * (1 + combo * 0.18);
    bar.x = 0; bar.dir = 1; bar.live = true;
  }

  function strikeQuality() {
    /* the window sits in the middle of the bar; the outer band either
       side of it is a graze */
    const d = Math.abs(bar.x - 0.5);
    if (d <= bar.win / 2) return 'clean';
    if (d <= bar.win / 2 + 0.13) return 'graze';
    return 'miss';
  }

  function resolveStrike(att, def, move, quality) {
    bar.live = false;
    /* THE COUNTER. If you answered the telegraph with the move that
       beats it, the strike lands as a counter: the other animal's swing
       comes apart and yours lands for double. This is the whole reason
       the telegraph is worth looking at, and it is why an animal rated
       worse than the one across from you can take the purse. */
    const answering = (att === A && plan && !move.guard && quality !== 'miss');
    const countered = answering && P.beats(move.cls, plan.cls);
    if (countered) { plan = null; B.stun = Math.max(B.stun, 1); }
    /* Timing has to be worth something or the bar is decoration: a clean
       strike is worth two and a half grazes, and that margin is the whole
       reason you can take an animal rated worse than the one across from
       you and still walk out with the purse. */
    let mul = quality === 'clean' ? 1.35 : quality === 'graze' ? 0.5 : 0.15;
    if (countered) mul *= 2.0 + (att === A && KD.Tree ? KD.Tree.val(att.d, 'counter') : 0);
    let airCost = Math.round(move.air * (quality === 'miss' ? 1.5 : 1) * P.airScale(att.d));
    if (att === A && combo > 0) airCost = Math.round(airCost * 0.5);
    att.air = Math.max(0, att.air - airCost);
    if (move.guard) {
      att.guard = 1;
      const gsk = KD.Tree ? KD.Tree.val(att.d, 'guard') : 0;
      att.air = Math.min(att.airMax, att.air + Math.round(22 * (1 + gsk)));
      att.pose = 'cruise1';
      /* Holding through something HEAVY does not just soften it - you
         take it on the shoulder and it costs them. */
      if (att === A && plan && plan.cls === 'heavy') {
        const back = Math.max(2, Math.round(P.power(att.d) * (0.5 + gsk * 0.5)));
        def.hp = Math.max(0, def.hp - back);
        def.shake = 4;
        nums.push({ v: back, x: def.foe ? 320 : 120, y: 108, t: 0, crit: false });
        lastQ = 'shoulder';
        say(att.d.name + ' takes it on the shoulder. ' + back + ' back.');
        KD.Sfx.play('hit');
        return;
      }
      lastQ = 'hold';
      say(att.d.name + ' holds, and gets its breath back.');
      return;
    }
    /* dodged? a clean hit can still be slipped by something quick, and
       sonar cannot be dodged at all */
    let dodged = false;
    if (!move.stun && Math.random() < P.dodge(def.d) * (quality === 'clean' ? 0.6 : 1.2)) {
      dodged = true;
    }
    let dmg = 0, critHit = false;
    if (!dodged && mul > 0) {
      critHit = Math.random() < P.crit(att.d) * (quality === 'clean' ? 1.4 : 0.5);
      dmg = P.power(att.d) * move.mul * mul * (critHit ? 2.0 : 1);
      if (def.guard) dmg *= 0.45;
      dmg = Math.max(1, Math.round(dmg));
      def.hp = Math.max(0, def.hp - dmg);
      att.meter = Math.min(100, att.meter + dmg * 0.9);
    }
    def.guard = 0;
    if (move.stun && !dodged) def.stun = Math.max(def.stun, move.stun);

    att.pose = quality === 'miss' ? 'stagger' : 'strike';
    att.poseT = 0.5;
    if (dmg > 0) {
      def.pose = 'hit'; def.poseT = 0.45;
      def.shake = critHit ? 7 : 4;
      KD.Fx.shake(critHit ? 6 : 3);
      hitFx.push({ x: def.foe ? 300 : 120, y: 118, t: 0, crit: critHit });
      nums.push({ v: dmg, x: def.foe ? 320 : 120, y: 108, t: 0, crit: critHit });
      KD.Sfx.play(critHit ? 'crit' : 'hit');
    } else {
      KD.Sfx.play('deny');
    }

    if (dodged) { lastQ = 'slip'; say(def.d.name + ' slips it.'); }
    else if (quality === 'miss') { lastQ = 'miss'; say(att.d.name + ' swings through nothing.'); }
    else if (countered) { lastQ = 'counter'; say('COUNTERED. ' + dmg + '.'); }
    else if (critHit) { lastQ = 'crit'; say('CLEAN. ' + dmg + '.'); }
    else if (quality === 'graze') { lastQ = 'graze'; say('Grazed it. ' + dmg + '.'); }
    else { lastQ = 'clean'; say(move.name + ' lands. ' + dmg + '.'); }
    if (countered) { KD.Fx.flash('GOLD.3', 0.14); KD.Fx.shake(6); }
  }

  /* The other handler's animal CHOOSES at the top of the round. It does
     not swing until after you have, which is what makes the telegraph
     worth showing: you get to answer it. */
  function foePlan() {
    const list = P.movesOf(B.d).filter((m) => m.air <= B.air || m.guard);
    if (!list.length) return null;
    const rich = B.air / B.airMax;
    let pick = list[0];
    const heavy = list.filter((m) => !m.guard).sort((a, b) => b.mul - a.mul);
    if (heavy.length) {
      if (rich > 0.7 && Math.random() < 0.55) pick = heavy[0];
      else if (rich > 0.35) pick = heavy[Math.min(heavy.length - 1, 1)];
      else pick = heavy[heavy.length - 1];
    }
    if (rich < 0.22 && Math.random() < 0.6) pick = P.MOVES.guard;
    return pick;
  }

  /* and then it swings, at the timing its spirit and its card allow */
  function foeMove() {
    const pick = plan || foePlan();
    if (!pick) { surface(B, A); return; }
    /* It starts sloppy. On the Shallow Card it lands one clean strike in
       five; by the Iron Gate it lands two in three. */
    const skill = 0.12 + (B.d.spi || 10) * 0.008 + entry.t * 0.11;
    const r = Math.random();
    const q = r < skill ? 'clean' : r < skill + 0.40 ? 'graze' : 'miss';
    resolveStrike(B, A, pick, q);
    plan = null;
  }

  function surface(who, other) {
    who.air = Math.min(who.airMax, who.air + Math.round(who.airMax * 0.55));
    who.pose = 'cruise1';
    say(who.d.name + ' has to go up for air.');
    /* and that is a free hit */
    const m = P.MOVES.ram;
    resolveStrike(other, who, m, 'clean');
  }

  /* ---- update ------------------------------------------------------- */
  function update(dt) {
    t += dt; pt += dt;
    if (msgT > 0) msgT -= dt;
    KD.Fx.update(dt);
    /* the guide eats its own dismissal, so closing a tip never also
       commits a move */
    if (KD.Coach.update(dt)) return;
    if (!KD.Coach.active()) {
      if (phase === 'pick' && plan && !planHid) {
        if (KD.Coach.tip('fight_ring')) return;
        if (KD.Coach.tip('fight_pick')) return;
      }
      if (phase === 'time' && KD.Coach.tip('fight_bar')) return;
      if (phase === 'pick' && combo > 0 && KD.Coach.tip('fight_combo')) return;
      if (phase === 'pick' && A && A.air < A.airMax * 0.3 &&
          KD.Coach.tip('fight_air')) return;
    }
    if (KD.Coach.active()) return;      /* the fight holds while it is up */
    for (const f of [A, B]) {
      if (!f) continue;
      f.bob += dt;
      if (f.poseT > 0) { f.poseT -= dt; if (f.poseT <= 0) f.pose = 'cruise0'; }
      if (f.shake > 0) f.shake = Math.max(0, f.shake - dt * 22);
    }
    for (let i = hitFx.length - 1; i >= 0; i--) {
      hitFx[i].t += dt; if (hitFx[i].t > 0.4) hitFx.splice(i, 1);
    }
    for (let i = nums.length - 1; i >= 0; i--) {
      nums[i].t += dt; if (nums[i].t > 1.1) nums.splice(i, 1);
    }

    if (phase === 'in') {
      if (pt > 1.6 || hit()) { beginPick(); }
      return;
    }
    if (phase === 'pick') {
      if (A.air < 10) { phase = 'noair'; pt = 0; return; }
      const n = moves.length + (A.meter >= 100 ? 1 : 0);
      if (KD.In.isHit('ArrowLeft', 'KeyA')) { sel = (sel + n - 1) % n; KD.Sfx.play('click'); }
      if (KD.In.isHit('ArrowRight', 'KeyD')) { sel = (sel + 1) % n; KD.Sfx.play('click'); }
      if (KD.In.isHit('ArrowUp', 'KeyW')) { sel = (sel + n - 1) % n; KD.Sfx.play('click'); }
      if (KD.In.isHit('ArrowDown', 'KeyS')) { sel = (sel + 1) % n; KD.Sfx.play('click'); }
      const mv = moveAt(sel);
      if (hit()) {
        const cost = Math.round(mv.air * P.airScale(A.d) * (combo > 0 ? 0.5 : 1));
        if (!mv.guard && cost > A.air) { say('Not enough breath for that.'); KD.Sfx.play('deny'); return; }
        armBar(mv, A);
        phase = 'time'; pt = 0;
      }
      /* you can always bank a combo instead of pushing it */
      if (combo > 0 && KD.In.isHit('Escape')) { combo = 0; phase = 'foe'; pt = 0; }
      return;
    }
    if (phase === 'noair') {
      if (pt > 0.5) { surface(A, B); phase = 'foe'; pt = 0; }
      return;
    }
    if (phase === 'time') {
      bar.x += bar.dir * bar.sp * dt;
      if (bar.x > 1) { bar.x = 1; bar.dir = -1; }
      if (bar.x < 0) { bar.x = 0; bar.dir = 1; }
      if (hit()) {
        const mv = moveAt(sel);
        const q = strikeQuality();
        if (mv.finish) { A.meter = 0; }
        resolveStrike(A, B, mv, q);
        phase = 'after'; pt = 0;
      } else if (pt > 4.5) {
        resolveStrike(A, B, moveAt(sel), 'miss');
        phase = 'after'; pt = 0;
      }
      return;
    }
    if (phase === 'after') {
      if (pt < 0.9) return;
      if (B.hp <= 0) { finish(true); return; }
      if (A.stun > 0) { A.stun--; say(A.d.name + ' is still rattled.'); phase = 'foe2'; pt = 0; return; }
      /* THE COMBO WINDOW. A clean strike buys you another one, at half
         the breath and a window a fifth narrower. Push it or bank it. */
      if ((lastQ === 'clean' || lastQ === 'crit' || lastQ === 'counter') &&
          combo < comboMax && A.air >= 6) {
        combo++;
        phase = 'pick'; pt = 0; sel = 0;
        KD.Sfx.play('levelup');
        say('OPEN. Another one, half the breath.');
        return;
      }
      combo = 0;
      phase = 'foe'; pt = 0;
      return;
    }
    if (phase === 'foe') {
      if (pt < 0.5) return;
      if (B.stun > 0) { B.stun--; say(B.d.name + ' cannot get straight.'); phase = 'foe2'; pt = 0; return; }
      if (B.air < 10) { surface(B, A); phase = 'foe2'; pt = 0; return; }
      foeMove();
      phase = 'foe2'; pt = 0;
      return;
    }
    if (phase === 'foe2') {
      if (pt < 0.9) return;
      if (A.hp <= 0) { finish(false); return; }
      round++;
      /* a trickle of breath back each round, so a long fight is possible */
      A.air = Math.min(A.airMax, A.air + 6);
      B.air = Math.min(B.airMax, B.air + 6);
      beginPick();
      return;
    }
    if (phase === 'done') {
      if (pt > 1.0 && hit()) {
        /* Clearing the last name on the Iron Gate IS the ending. The game
           lost its only win condition when the boss fight went out with the
           side-scroller, so there was nothing at the top of the ladder. */
        if (result.won && P.tierClear(P.TIERS.length - 1)) KD.Game.win();
        else KD.Game.go('circuit', {});
      }
      return;
    }
  }

  function moveAt(i) {
    if (i >= moves.length) {
      return { id: 'finish', name: 'THE TURN', air: 0, mul: 4.0, win: 0.09,
               finish: 1, note: 'Everything, once.' };
    }
    return moves[i];
  }

  const hit = () => KD.In.isHit('Space', 'Enter', 'KeyE') || KD.In.mouse.click ||
                    KD.In.actHit('act', 'use');

  function finish(won) {
    phase = 'done'; pt = 0;
    result = { won: won };
    const st = KD.State.S;
    if (won) {
      P.markBeaten(entry);
      KD.State.earn(tier.purse);
      mine.wins = (mine.wins || 0) + 1;
      mine.xp = (mine.xp || 0) + 30 + entry.t * 25;
      P.levelCheck(mine);
      P.bondUp(mine, 6);
      result.purse = tier.purse;
      KD.Sfx.play('levelup');
    } else {
      mine.losses = (mine.losses || 0) + 1;
      mine.hurt = 2 + entry.t;
      mine.xp = (mine.xp || 0) + 8;
      P.levelCheck(mine);
      result.hurt = mine.hurt;
      KD.Sfx.play('deny');
    }
    KD.State.save();
  }

  /* ================================================================
     THE QUARRY
     ================================================================ */
  function arena() {
    const W = KD.W, H = KD.H;
    const RING0 = Math.round(H * 0.28), RING1 = Math.round(H * 0.72);

    /* Water in solid bands. The middle band is BRIGHTER than the two
       around it because that is where the lamps are pointed - the ring
       is lit, and a dark animal has to have something to be dark
       against or it is just a hole in the picture. */
    R(0, 0, W, RING0, 'DEEP.1');
    R(0, RING0, W, RING1 - RING0, 'DEEP.2');
    R(0, RING1, W, Math.round(H * 0.88) - RING1, 'DEEP.0');
    R(0, Math.round(H * 0.88), W, H, 'INK.1');
    /* the lit lip of the ring, top and bottom, one step up */
    R(0, RING0, W, 1, 'DEEP.3');
    R(0, RING1 - 1, W, 1, 'INK.0');

    /* the gantry across the top: a cut stone lip you are looking down
       past, with posts hanging off it */
    R(0, 0, W, 10, 'STONE.0');
    R(0, 0, W, 2, 'STONE.1');
    R(0, 9, W, 1, 'INK.0');
    /* cut blocks, wide enough to read as masonry rather than as a barcode */
    for (let x = 0; x < W; x += 29) {
      R(x, 2, 1, 7, 'INK.1');
      R(x + 1, 2, 27, 1, 'STONE.2');
    }

    /* the quarry walls: cut stone benches stepping in from both sides.
       They are LIT on top, so the crowd sitting on them reads as a
       silhouette instead of as more darkness. */
    const B0 = 38;   /* below the name plates, or the crowd hides behind them */
    for (let s = 0; s < 2; s++) {
      for (let k = 0; k < 8; k++) {
        const w = 44 - k * 5;
        const y = B0 + k * 10;
        const x = s ? W - w : 0;
        R(x, y, w, 10, k % 2 ? 'STONE.1' : 'STONE.0');
        R(x, y, w, 2, 'STONE.2');
        R(x, y + 9, w, 1, 'INK.0');
        R(s ? x : x + w - 1, y, 1, 10, 'INK.1');
      }
    }

    /* THE CROWD. Forty of them on the benches, leaning and shifting -
       the whole reason an illegal fight in a quarry does not feel like
       a menu. Two tones so the front row reads in front of the back. */
    for (let i = 0; i < 44; i++) {
      const s = i % 2;
      const k = (i * 3) % 7;
      const w = 44 - k * 5;
      const span = Math.max(4, w - 8);
      const bx = s ? W - w + 3 + ((i * 7) % span) : 3 + ((i * 11) % span);
      const by = B0 + k * 10;
      const sway = Math.round(Math.sin(t * 1.2 + i * 1.7) * 1.4);
      const c = i % 3 ? 'INK.0' : 'INK.1';
      R(bx + sway, by - 6, 4, 6, c);          /* shoulders */
      R(bx + sway, by - 9, 3, 3, c);          /* head */
      if (i % 5 === 0) R(bx + sway + (s ? -2 : 3), by - 7, 2, 2, c);  /* an arm up */
    }

    /* lamps hung off the gantry, swinging, each with a solid cone that
       lands ON the ring. Four of them, and they are the brightest thing
       in the picture on purpose. */
    for (const f of [0.16, 0.38, 0.62, 0.84]) {
      const lx = Math.round(W * f);
      const sw = Math.round(Math.sin(t * 0.9 + lx) * 2);
      const ly = 20;
      R(lx - 1, 9, 2, ly - 9, 'INK.0');
      R(lx - 4 + sw, ly, 9, 6, 'RUST.1');
      R(lx - 3 + sw, ly + 1, 7, 4, 'GOLD.2');
      R(lx - 2 + sw, ly + 2, 5, 2, 'GOLD.3');
      R(lx - 1 + sw, ly + 6, 3, 1, 'GOLD.3');
      /* the cone, in three solid steps, brightest at the top */
      for (let k = 0; k < 12; k++) {
        const w = 7 + k * 4;
        const yy = ly + 7 + k * 4;
        if (yy > RING1) break;
        R(lx - (w >> 1) + Math.round(sw * (1 - k * 0.06)), yy, w, 4,
          k < 3 ? 'WATER.0' : (k < 7 ? 'DEEP.3' : 'DEEP.2'));
      }
    }

    /* the rope ring: two slack lines, one above the animals and one
       under them, so they FRAME the fight instead of cutting it in half */
    for (const ry of [Math.round(H * 0.25)]) {
      for (let x = 0; x < W; x += 2) {
        const s = Math.round(Math.sin(x * 0.05 + t * 0.7) * 2);
        R(x, ry + s, 2, 1, 'SAND.2');
        R(x, ry + s + 1, 2, 1, 'SAND.0');
      }
      for (let x = 8; x < W; x += 54) {
        const s = Math.round(Math.sin(x * 0.05 + t * 0.7) * 2);
        R(x, ry + s - 1, 3, 4, 'RUST.1');
      }
    }

    /* the far bank: a silted stone shelf at the back of the ring, so the
       fight is happening OVER something instead of in a blue void */
    R(0, RING1, W, 7, 'INK.0');
    R(0, RING1, W, 1, 'STONE.0');
    for (let i = 0; i < 26; i++) {
      const x = (i * 41) % W, w = 5 + (i % 5) * 4, h = 2 + (i % 3);
      R(x, RING1 - h, w, h, i % 2 ? 'STONE.0' : 'INK.2');
      R(x, RING1 - h, w, 1, 'STONE.1');
    }
    for (let i = 0; i < 14; i++) {
      const x = (i * 61 + 9) % W;
      R(x, RING1 - 1, 3 + (i % 3), 1, 'SAND.0');
    }

    /* silt in the beams */
    for (let i = 0; i < 46; i++) {
      const x = Math.round((i * 173 + t * (7 + (i % 4) * 4)) % W);
      const y = Math.round((i * 61 - t * 5 + H * 8) % H);
      R(x, y, 1, 1, i % 3 ? 'WATER.0' : 'WATER.1');
    }

    /* and the water goes bad at the edges when your animal is nearly out */
    const dire = A ? 1 - A.hp / A.hpMax : 0;
    if (dire > 0.62) {
      const k = Math.min(1, (dire - 0.62) / 0.38);
      const pulse = 0.6 + 0.4 * Math.sin(t * 6);
      /* inside the ring only - bleeding across the gantry and the name
         plates just looked like the renderer had broken */
      const n = Math.round(4 + k * 7 * pulse);
      for (let i = 0; i < n; i++) {
        R(0, RING0 + 2 + i * 2, W, 1, 'BLOOD.0');
        R(0, RING1 - 3 - i * 2, W, 1, 'BLOOD.0');
      }
    }
  }

  /* ---- the fighters -------------------------------------------------- */
  function fighters(ctx) {
    const W = KD.W;
    const midY = Math.round(KD.H * 0.50);
    const DW = KD.Dolph.W;
    for (const f of [B, A]) {
      if (!f) continue;
      const bob = Math.round(Math.sin(f.bob * 1.6) * 2);
      const sh = f.shake > 0 ? Math.round((Math.random() - 0.5) * f.shake) : 0;
      let x, flip;
      if (f.foe) { x = W - DW - 6; flip = true; }
      else { x = 6; flip = false; }
      /* they lean in when they strike */
      if (f.pose === 'strike') x += f.foe ? -10 : 10;
      if (f.pose === 'hit') x += f.foe ? 8 : -8;
      KD.Dolph.draw(ctx, f.d, f.pose, x + sh, midY - KD.Dolph.H / 2 + bob, { flip: flip });
    }
    /* the hits */
    for (const h of hitFx) {
      const k = h.t / 0.4;
      const r = Math.round(6 + k * 22);
      const c = h.crit ? 'WHITE' : 'BONE.2';
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4 + k * 0.6;
        const px = h.x + Math.cos(ang) * r, py = h.y + Math.sin(ang) * r * 0.7;
        R(px - 2, py - 1, 4, 2, c);
        R(px - 1, py - 2, 2, 4, c);
      }
      if (k < 0.4) R(h.x - 12, h.y - 3, 24, 6, c);
    }
    for (const n of nums) {
      const k = n.t / 1.1;
      KD.Text.draw('-' + n.v, n.x, n.y - k * 22,
                   n.crit ? 'BLOOD.3' : 'BONE.2',
                   { align: 'center', shadow: 'INK.0' });
    }
  }

  /* ---- the plates ---------------------------------------------------- */
  function plate(f, x, y, w, right) {
    R(x, y, w, 30, 'INK.0');
    KD.Screen.frame(x, y, w, 30, right ? 'BLOOD.0' : 'GOLD.0');
    R(x + 1, y + 1, w - 2, 1, right ? 'BLOOD.1' : 'GOLD.1');
    const nm = f.d.name.toUpperCase();
    KD.Text.draw(nm, right ? x + w - 5 : x + 5, y + 3,
                 right ? 'BLOOD.3' : 'GOLD.3',
                 { align: right ? 'right' : 'left', shadow: 'INK.0' });
    KD.Text.draw(P.BIAS[f.d.sp].name + '  LV' + (f.d.lvl || 1),
                 right ? x + w - 5 : x + 5, y + 12, 'INK.3',
                 { tiny: true, align: right ? 'right' : 'left' });
    /* health */
    const bw = w - 10;
    R(x + 5, y + 19, bw, 5, 'DEEP.0');
    const hf = Math.max(0, f.hp / f.hpMax);
    const hc = hf > 0.5 ? 'KELP.2' : hf > 0.22 ? 'GOLD.2' : 'BLOOD.2';
    R(x + 5, y + 19, Math.round(bw * hf), 5, hc);
    R(x + 5, y + 19, Math.round(bw * hf), 1, KD.PAL.shift(hc, 1));
    /* breath */
    R(x + 5, y + 25, bw, 3, 'INK.1');
    R(x + 5, y + 25, Math.round(bw * Math.max(0, f.air / f.airMax)), 3, 'WATER.2');
  }

  /* ================================================================
     THE TELEGRAPH

     What the other animal is winding up, held over its head from the
     moment the round opens. Reading it and answering it is the game;
     everything else in the fight is timing. A cagey animal hides it,
     and a hidden one shows a question mark instead - which is its own
     information, because it means you cannot counter this round.
     ================================================================ */
  function telegraph(ctx) {
    if (!plan || phase === 'done' || phase === 'in') return;
    const bx = KD.W - KD.Dolph.W - 6 + 40;
    const by = Math.round(KD.H * 0.50) - KD.Dolph.H / 2 - 24 +
               Math.round(Math.sin(t * 3) * 1.5);
    const C = P.CLS[plan.cls] || P.CLS.hold;
    /* the bubble */
    R(bx - 3, by - 3, 26, 26, 'INK.0');
    R(bx - 2, by - 2, 24, 24, planHid ? 'INK.1' : 'DEEP.0');
    R(bx - 1, by - 1, 22, 1, planHid ? 'INK.2' : 'DEEP.2');
    KD.Screen.frame(bx - 2, by - 2, 24, 24, planHid ? 'INK.3' : C.col);
    /* the tail, pointing down at them */
    for (let k = 0; k < 4; k++) R(bx + 8 - k, by + 22 + k, 5 + k * 2, 1, 'INK.0');
    if (planHid) {
      KD.Text.draw('?', bx + 9, by + 5, 'BONE.0', { align: 'center' });
    } else if (KD.PX.has(plan.icon)) {
      KD.PX.blit(ctx, plan.icon, bx + 2, by + 2, { anchor: false });
    }
  }

  /* The ring: three chips in a triangle with the arrows between them, so
     what beats what is on screen all fight. A rule you have to remember
     is a rule you get wrong at the worst moment. The chip of whatever
     they are winding up lights red; the one that answers it lights gold. */
  function ring(ctx) {
    const bw = 60, bh = 62;
    const x = 5, y = Math.round(KD.H * 0.50) - bh / 2 + 8;
    R(x, y, bw, bh, 'INK.0');
    KD.Screen.frame(x, y, bw, bh, 'INK.2');
    R(x + 1, y + 1, bw - 2, 1, 'INK.3');
    const CH = 18;
    const SPOT = {
      quick: [Math.round((bw - CH) / 2), 3],
      heavy: [4, bh - CH - 4],
      sound: [bw - CH - 4, bh - CH - 4]
    };
    const ICON = { quick: 'ic_spd', heavy: 'ic_pow', sound: 'ic_sonar' };
    /* the arrows first, under the chips: quick -> sound -> heavy -> quick */
    const arrow = (fx, fy, tx, ty, col) => {
      const steps = 5;
      for (let k = 1; k < steps; k++) {
        R(fx + (tx - fx) * k / steps - 1, fy + (ty - fy) * k / steps - 1, 2, 2, col);
      }
      R(tx - 1, ty - 1, 3, 3, col);
    };
    const mid = (id) => [x + SPOT[id][0] + CH / 2, y + SPOT[id][1] + CH / 2];
    const [qx, qy] = mid('quick'), [hx, hy] = mid('heavy'), [sx, sy] = mid('sound');
    arrow(qx + 6, qy + 4, sx - 2, sy - 6, P.CLS.quick.dim);
    arrow(sx - 8, sy + 2, hx + 8, hy + 2, P.CLS.sound.dim);
    arrow(hx - 2, hy - 6, qx - 6, qy + 4, P.CLS.heavy.dim);
    for (const id in SPOT) {
      const [dx, dy] = SPOT[id];
      const C = P.CLS[id];
      const theirs = plan && !planHid && plan.cls === id;
      const yours = plan && !planHid && P.beats(id, plan.cls);
      const cx = x + dx, cy = y + dy;
      R(cx, cy, CH, CH, theirs ? 'BLOOD.0' : (yours ? 'GOLD.0' : 'INK.1'));
      KD.Screen.frame(cx, cy, CH, CH,
                      theirs ? 'BLOOD.3' : (yours ? 'GOLD.3' : C.dim));
      if (KD.PX.has(ICON[id])) KD.PX.blit(ctx, ICON[id], cx + 1, cy + 1, { anchor: false });
    }
  }

  /* ---- the move card and the timing bar ------------------------------ */
  /* one icon, framed, in its class colour - the unit the whole fight
     interface is built out of */
  function chip(ctx, icon, x, y, cls, lit, dead) {
    const C = P.CLS[cls] || P.CLS.hold;
    R(x - 1, y - 1, 22, 22, 'INK.0');
    R(x, y, 20, 20, lit ? 'DEEP.1' : 'INK.1');
    R(x + 1, y + 1, 18, 1, lit ? 'DEEP.3' : 'INK.2');
    KD.Screen.frame(x, y, 20, 20, dead ? 'INK.2' : (lit ? C.col : C.dim));
    if (icon && KD.PX.has(icon)) KD.PX.blit(ctx, icon, x + 2, y + 2, { anchor: false });
    if (dead) for (let k = 0; k < 20; k += 2) R(x, y + k, 20, 1, 'INK.0');
  }

  function picker(ctx) {
    const n = moves.length + (A.meter >= 100 ? 1 : 0);
    const cw = 34, ch = 34, gap = 4;
    const totalW = n * (cw + gap) - gap;
    const x0 = Math.round((KD.W - totalW) / 2);
    const y0 = KD.H - ch - 30;
    BTNS.length = 0;
    for (let i = 0; i < n; i++) {
      const m = moveAt(i);
      const cx = x0 + i * (cw + gap);
      const on = i === sel;
      const cost = Math.round(m.air * P.airScale(A.d) * (combo > 0 ? 0.5 : 1));
      const can = m.guard || m.finish || cost <= A.air;
      const hot = KD.UI.inside(cx, y0, cw, ch);
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick(); sel = i;
        if (can) { armBar(m, A); phase = 'time'; pt = 0; }
        else KD.Sfx.play('deny');
      }
      const C = P.CLS[m.finish ? 'sound' : m.cls] || P.CLS.hold;
      /* the plate */
      R(cx, y0, cw, ch, on ? 'DEEP.1' : 'INK.0');
      KD.Screen.frame(cx, y0, cw, ch, !can ? 'INK.2' : (on ? 'GOLD.3' : C.dim));
      if (on) R(cx + 1, y0 + 1, cw - 2, 1, 'GOLD.2');
      /* the picture, which is the whole label now */
      const ic = m.finish ? 'ic_turn' : m.icon;
      if (ic && KD.PX.has(ic)) {
        KD.PX.blit(ctx, ic, cx + 9, y0 + 3, { anchor: false });
      }
      /* THE WINDOW, as a bar the width of the target it gives you. This
         is the one number that decides whether to pick it, so it is the
         only number left on the card. */
      const ww = Math.round((cw - 8) * Math.min(1, m.win * P.winScale(A.d) *
                            (combo > 0 ? Math.max(0.45, 1 - combo * 0.2) : 1) * 2.4));
      R(cx + 4, y0 + 21, cw - 8, 3, 'INK.1');
      R(cx + 4, y0 + 21, ww, 3, can ? C.col : 'INK.2');
      /* the breath it costs, in pips rather than a number */
      const pips = Math.min(8, Math.ceil(cost / 5));
      for (let k = 0; k < pips; k++) {
        R(cx + 4 + k * 3, y0 + 27, 2, 4, can ? 'WATER.1' : 'BLOOD.1');
      }
      if (m.finish) {
        R(cx + 4, y0 + 27, cw - 8, 4, A.meter >= 100 ? 'ROT.3' : 'INK.2');
      }
      /* does it beat what they are winding up? a gold ring says so */
      if (plan && !planHid && P.beats(m.cls, plan.cls)) {
        const pl = 1 + Math.round(Math.abs(Math.sin(t * 5)));
        KD.Screen.frame(cx - pl, y0 - pl, cw + pl * 2, ch + pl * 2, 'GOLD.3');
      }
    }
    /* the one line of prose left in the fight: what the selected move is */
    const m = moveAt(sel);
    R(0, KD.H - 26, KD.W, 26, 'INK.0');
    const CN = P.CLS[m.finish ? 'sound' : m.cls] || P.CLS.hold;
    KD.Text.draw(m.name.toUpperCase(), KD.W / 2 - 2, KD.H - 23, CN.col,
                 { tiny: true, align: 'right' });
    KD.Text.draw(m.finish ? 'FINISHER' : CN.name, KD.W / 2 + 4, KD.H - 23, 'BONE.0',
                 { tiny: true });
    KD.Text.draw(m.note || '', KD.W / 2, KD.H - 14, 'BONE.0',
                 { tiny: true, align: 'center', max: KD.W - 20 });
    if (combo > 0) {
      KD.Text.draw('CHAIN ' + combo + '  -  half the breath  -  ESC to bank it',
                   KD.W / 2, KD.H - 6, 'GOLD.3', { tiny: true, align: 'center' });
    }
  }

  function timing() {
    const w = Math.min(300, KD.W - 40), h = 22;
    const x = Math.round((KD.W - w) / 2), y = KD.H - 56;
    R(x - 2, y - 2, w + 4, h + 4, 'INK.0');
    R(x, y, w, h, 'DEEP.0');
    KD.Screen.frame(x, y, w, h, 'GOLD.0');
    /* the graze band, then the clean window inside it */
    const gz = Math.round(w * (bar.win + 0.26));
    R(x + (w - gz) / 2, y + 2, gz, h - 4, 'DEEP.2');
    const cw = Math.round(w * bar.win);
    R(x + (w - cw) / 2, y + 2, cw, h - 4, 'KELP.1');
    R(x + (w - cw) / 2, y + 2, cw, 1, 'KELP.3');
    /* the marker */
    const mx = Math.round(x + bar.x * w);
    R(mx - 1, y - 4, 3, h + 8, 'INK.0');
    R(mx, y - 3, 1, h + 6, 'WHITE');
    for (let k = 0; k < 3; k++) R(mx - 2 + k, y - 6 + k, 5 - k * 2, 2, 'WHITE');
    const m = moveAt(sel);
    KD.Text.draw(m.name.toUpperCase(), KD.W / 2, y - 16, 'GOLD.3',
                 { align: 'center', shadow: 'INK.0' });
    KD.Text.draw(KD.touch ? 'TAP IN THE GREEN' : 'SPACE IN THE GREEN',
                 KD.W / 2, y + h + 7, 'BONE.1', { tiny: true, align: 'center' });
  }

  /* ---- the card at the end ------------------------------------------- */
  function endCard() {
    const w = Math.min(280, KD.W - 40), h = 96;
    const x = Math.round((KD.W - w) / 2), y = Math.round((KD.H - h) / 2);
    const k = KD.Juice.outCubic(Math.min(1, pt / 0.35));
    const yy = Math.round(y + (1 - k) * 12);
    R(x - 2, yy - 2, w + 4, h + 4, 'INK.0');
    R(x, yy, w, h, 'DEEP.0');
    KD.Screen.frame(x, yy, w, h, result.won ? 'GOLD.0' : 'BLOOD.0');
    const lab = result.won ? 'WON' : 'LOST';
    KD.Text.draw(lab, KD.W / 2, yy + 8, result.won ? 'GOLD.3' : 'BLOOD.3',
                 { align: 'center', space: 2, shadow: 'INK.0' });
    if (result.won) {
      KD.Text.draw('Purse', x + 12, yy + 32, 'BONE.0', { tiny: true });
      KD.Text.draw('+' + result.purse + 'c', x + w - 12, yy + 31, 'GOLD.3',
                   { align: 'right', shadow: 'INK.0' });
      KD.Text.draw(entry.who + ' pays up.', KD.W / 2, yy + 48, 'BONE.1',
                   { tiny: true, align: 'center', max: w - 20 });
      KD.Text.draw(mine.name + ' is bolder for it.', KD.W / 2, yy + 60, 'KELP.3',
                   { tiny: true, align: 'center', max: w - 20 });
    } else {
      KD.Text.draw('Entry', x + 12, yy + 32, 'BONE.0', { tiny: true });
      KD.Text.draw('-' + tier.fee + 'c', x + w - 12, yy + 31, 'BLOOD.3',
                   { align: 'right', shadow: 'INK.0' });
      KD.Text.draw(mine.name + ' needs ' + result.hurt + ' days.', KD.W / 2, yy + 50,
                   'BLOOD.2', { tiny: true, align: 'center', max: w - 20 });
    }
    KD.Text.draw(KD.touch ? 'tap to go back' : 'SPACE to go back',
                 KD.W / 2, yy + h + 8, 'INK.3', { tiny: true, align: 'center' });
  }

  /* ---- draw ---------------------------------------------------------- */
  function draw(ctx) {
    arena();
    fighters(ctx);
    /* the plates */
    const pw = Math.min(120, (KD.W - 24) / 2);
    plate(A, 6, 4, pw, false);
    plate(B, KD.W - pw - 6, 4, pw, true);
    /* The round, and the finisher, laid out as one horizontal strip in
       the middle of the header so neither can land on the other. */
    const ready = A.meter >= 100;
    const lab = ready ? 'THE TURN IS READY' : 'THE TURN';
    const lw = KD.Text.width(lab, { tiny: true });
    const mw = 54;
    const strip = lw + 5 + mw;
    const sx = Math.round((KD.W - strip) / 2);
    R(sx - 4, 10, strip + 8, 11, 'INK.0');
    KD.Text.draw('ROUND ' + round, KD.W / 2, 2, 'BONE.1',
                 { tiny: true, align: 'center', shadow: 'INK.0' });
    KD.Text.draw(lab, sx, 12, ready ? 'ROT.3' : 'INK.3', { tiny: true });
    const mx = sx + lw + 5;
    R(mx, 12, mw, 6, 'INK.1');
    R(mx + 1, 13, Math.round((mw - 2) * A.meter / 100), 4,
      ready ? 'ROT.3' : 'ROT.1');
    KD.Screen.frame(mx, 12, mw, 6, ready ? 'ROT.2' : 'INK.2');

    if (msgT > 0 && phase !== 'done' && phase !== 'time') {
      const tw = KD.Text.width(shownMsg, { tiny: true }) + 14;
      const tx = Math.round((KD.W - tw) / 2);
      R(tx, KD.H - 76, tw, 13, 'INK.0');
      KD.Screen.frame(tx, KD.H - 76, tw, 13, 'INK.2');
      KD.Text.draw(shownMsg, KD.W / 2, KD.H - 73, 'BONE.2',
                   { tiny: true, align: 'center' });
    }

    if (phase !== 'done') { telegraph(ctx); ring(ctx); }
    if (phase === 'pick') picker(ctx);
    else if (phase === 'time') timing();
    else if (phase === 'done') endCard();

    if (KD.touch) KD.UI.touchPad([], { noStick: true });
    KD.Coach.draw();
  }

  return { enter, update, draw, _A: () => A, _B: () => B,
           _phase: () => phase, _bar: bar, _sel: () => sel,
           _set: (p) => { phase = p; pt = 0; } };
})();
