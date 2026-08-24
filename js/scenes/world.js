/* ============================================================
   world.js - the side-scrolling world. Walk the seabed, swim the
   water column, fight, talk, ride your mount, duck into shops.
   ============================================================ */
KA.Scenes.world = (function () {
  const U = KA.U, D = KA.D, T = KA.T, P = KA.PAL, S = KA.S;
  let area, cam, me, pet, ents = [], props = [], amb = [], shots = [];
  let t = 0, prompt = null, msg = null, msgT = 0, killGoal = null;

  /* ---------------- setup ---------------- */
  function enter(args) {
    t = 0;
    const D0 = S.D;
    if (args && args.area) D0.area = args.area;
    area = KA.Areas.AREAS[D0.area] || KA.Areas.AREAS.home;
    const pr = KA.Areas.props(area);
    props = pr.fore || [];
    props.bg = pr.back || [];
    amb = KA.Areas.ambient(area);
    cam = new KA.Camera(roomW(), KA.H);
    const sx = args && args.x !== undefined ? args.x : U.clamp(D0.x || 200, 40, area.w - 40);
    me = {
      x: sx, y: floorY(sx) - 2, vx: 0, vy: 0, dir: args && args.dir ? args.dir : 1,
      onGround: true, atk: 0, atkCd: 0, dashCd: 0, dashT: 0, hurtT: 0, mounted: false,
      mode: 'stand', iframe: 0
    };
    pet = { x: sx - 30, y: me.y - 24, vx: 0, vy: 0, dir: 1 };
    ents = [];
    spawnEnemies();
    spawnNPCs();
    cam.snap(me.x, me.y);
    if (!D0.flags.intro) { D0.flags.intro = true; KA.Game.go('intro'); }
    say(area.name.toUpperCase(), 2.4);
    S.save();
  }
  function exit() { S.D.x = me.x; S.save(); }
  const floorY = (x) => area.floorAt(x);
  /* a single-room interior is stretched to at least the screen width so the
     page never shows through on a wide window */
  const roomW = () => (area.indoor ? Math.max(area.w, KA.W) : area.w);
  function say(s2, time) { msg = s2; msgT = time || 2; }

  function spawnNPCs() {
    (area.npcs || []).forEach((n) => {
      const def = KA.NPCs.DEF[n.id];
      if (!def) return;
      ents.push({ type: 'npc', id: n.id, def, x: n.x, y: floorY(n.x), dir: -1, t: U.rnd(0, 9) });
    });
  }
  function spawnEnemies() {
    (area.enemies || []).forEach((e) => {
      for (let i = 0; i < e.n; i++) {
        const x = 200 + Math.random() * (area.w - 300);
        ents.push(mkEnemy(e.kind, x));
      }
    });
    if (area.boss && !S.D.flags.bossDead) ents.push(mkEnemy('boss', area.w - 240));
  }
  const ESTATS = {
    crawler: { hp: 14, dmg: 1, spd: 26, r: 15, dropped: 14, swim: false, name: 'Kelp Crawler' },
    snapper: { hp: 26, dmg: 1, spd: 40, r: 17, dropped: 30, swim: false, armor: 2, name: 'Snapper Crab' },
    bandit:  { hp: 22, dmg: 1, spd: 52, r: 15, dropped: 46, swim: false, steal: true, name: 'Beer Bandit' },
    shark:   { hp: 34, dmg: 2, spd: 78, r: 20, dropped: 70, swim: true, name: 'Reef Shark' },
    horror:  { hp: 58, dmg: 2, spd: 30, r: 24, dropped: 140, swim: true, spit: true, name: 'Trench Horror' },
    boss:    { hp: 260, dmg: 2, spd: 46, r: 30, dropped: 900, swim: false, boss: true, name: 'Baron Foamhelm' }
  };
  function mkEnemy(kind, x) {
    const st = ESTATS[kind];
    return { type: 'enemy', kind, st, x, y: st.swim ? 140 + Math.random() * 90 : floorY(x) - 2,
      hp: st.hp, hpMax: st.hp, vx: 0, vy: 0, dir: -1, state: 'idle', t: U.rnd(0, 4),
      hurtT: 0, atkCd: U.rnd(0.5, 2), atk: 0, home: x, dead: 0 };
  }

  /* ---------------- update ---------------- */
  function update(dt) {
    t += dt;
    KA.Rig.sea.tick(0);
    if (KA.Dlg.active()) { KA.Dlg.update(dt); return; }
    if (msgT > 0) msgT -= dt;

    layoutButtons();
    const D0 = S.D;
    const fatMul = S.fatPenalty();

    /* ---- input ---- */
    const v = KA.In.padVec();
    const jump = KA.In.actPressed('jump', 'Space', 'KeyK', 'ArrowUp');
    const swimUp = KA.In.act('jump', 'Space', 'KeyK') || v.y < -0.35;
    const attack = KA.In.actPressed('atk', 'KeyJ', 'KeyZ', 'ShiftLeft') || KA.In.mouse.click;
    const interact = KA.In.actPressed('act', 'KeyE', 'Enter');
    const dash = KA.In.actPressed('dash', 'KeyL', 'KeyX');
    const mountKey = KA.In.actPressed('mount', 'KeyF');

    /* ---- movement ---- */
    const spd = (me.mounted ? 275 * (1 + KA.Pet.stats(S.active()).spd * 0.010) : 176) * fatMul;
    const accel = me.onGround ? 1000 : 620;
    me.vx = U.damp(me.vx, v.x * spd, 0.0004, dt);
    if (Math.abs(v.x) < 0.05 && me.onGround) me.vx = U.damp(me.vx, 0, 0.00001, dt);
    if (Math.abs(me.vx) > 6) me.dir = me.vx > 0 ? 1 : -1;

    const inWater = !area.indoor;
    if (inWater) {
      me.vy += 210 * dt;                                  // gentle sink
      if (swimUp) me.vy -= 470 * dt;
      if (v.y > 0.35) me.vy += 260 * dt;
      me.vy *= Math.pow(0.35, dt);
      if (me.mounted) me.vy *= 0.86;
    } else {
      me.vy += 900 * dt;
      if (jump && me.onGround) { me.vy = -300; KA.A.play('jump'); }
    }
    if (me.dashT > 0) me.dashT -= dt;
    me.dashCd -= dt;
    if (dash && me.dashCd <= 0) {
      me.dashCd = 0.85; me.dashT = 0.2; me.iframe = 0.3;
      me.vx += me.dir * 420; if (inWater) me.vy *= 0.4;
      KA.A.play('dash');
      KA.FX.bubbles(me.x, me.y - 14, 10, { vx: -me.dir * 60 });
      KA.FX.ring(me.x, me.y - 14, 6, 30, '#cdeeff', 0.3);
    }
    cam.worldW = roomW();                       // stays right across a window resize
    me.x = U.clamp(me.x + me.vx * dt, 20, roomW() - 20);
    me.y += me.vy * dt;
    const fy = floorY(me.x) - 2;
    if (me.y >= fy) { me.y = fy; me.vy = 0; me.onGround = true; }
    else me.onGround = false;
    if (me.y < 30) { me.y = 30; me.vy = Math.max(0, me.vy); }
    if (me.iframe > 0) me.iframe -= dt;
    if (me.hurtT > 0) me.hurtT -= dt;

    me.mode = me.mounted ? 'ride' : (me.onGround ? (Math.abs(me.vx) > 14 ? 'walk' : 'stand') : 'swim');
    if (me.mode === 'walk' && U.chance(dt * 5)) KA.A.play('step');
    if (!me.onGround && inWater && U.chance(dt * 3)) KA.FX.bubbles(me.x, me.y - 20, 1);

    /* ---- mount ---- */
    if (mountKey) {
      if (me.mounted) { me.mounted = false; say('Dismounted.', 1); }
      else if (U.dist(me.x, me.y, pet.x, pet.y) < 70) { me.mounted = true; KA.A.play('squeak'); say('Riding ' + S.active().name + '!', 1.4); }
      else say(S.active().name + ' is too far away.', 1.2);
    }
    /* pet follows, or carries */
    const ap = S.active();
    if (me.mounted) {
      pet.x = me.x; pet.y = me.y - 14;          // sits where it is drawn, so dismount range is honest
      pet.dir = me.dir;
    } else {
      const tx = me.x - me.dir * 34, ty = me.y - 26;
      pet.vx = U.damp(pet.vx, (tx - pet.x) * 3.4, 0.002, dt);
      pet.vy = U.damp(pet.vy, (ty - pet.y) * 3.0, 0.002, dt);
      pet.x += pet.vx * dt; pet.y += pet.vy * dt;
      if (Math.abs(pet.vx) > 8) pet.dir = pet.vx > 0 ? 1 : -1;
    }

    /* ---- attack ---- */
    me.atkCd -= dt;
    if (me.atk > 0) me.atk = Math.max(0, me.atk - dt / 0.26);
    if (attack && me.atkCd <= 0 && !me.mounted) {
      const W = S.weapon();
      me.atkCd = 0.42 / W.spd;
      me.atk = 1;
      KA.A.play('swoosh');
      const hx = me.x + me.dir * W.reach * 0.7, hy = me.y - 22;
      let hitAny = false;
      for (const e of ents) {
        if (e.type !== 'enemy' || e.dead) continue;
        if (U.dist(hx, hy, e.x, e.y - e.st.r * 0.6) < W.reach + e.st.r) {
          hitEnemy(e, Math.round(W.dmg * S.dmgMult()), me.dir);
          hitAny = true;
        }
      }
      if (hitAny) { KA.FX.hitstop(0.05); KA.FX.shake(5); KA.A.play('clash'); }
      else KA.FX.burst(hx, hy, 4, { col: '#cdeeff', speed: 60, life: 0.3 });
    }

    /* ---- entities ---- */
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (e.type === 'enemy') { updateEnemy(e, dt); if (e.dead > 0.6) ents.splice(i, 1); }
      else if (e.type === 'npc') e.t += dt;
      else if (e.type === 'drop') {
        e.vy += 180 * dt; e.vy *= Math.pow(0.5, dt);
        e.y += e.vy * dt;
        const gy = floorY(e.x) - 4;
        if (e.y > gy) { e.y = gy; e.vy = 0; }
        e.life -= dt;
        if (U.dist(e.x, e.y, me.x, me.y - 16) < 26) { collect(e); ents.splice(i, 1); continue; }
        if (e.life <= 0) ents.splice(i, 1);
      }
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (U.dist(s.x, s.y, me.x, me.y - 18) < 16 && me.iframe <= 0) { damageMe(2, Math.sign(s.vx)); shots.splice(i, 1); continue; }
      if (s.life <= 0) shots.splice(i, 1);
    }
    KA.Rig.sea.moveCreatures(amb, area, dt);

    /* ---- interaction prompts ---- */
    prompt = null;
    // doors
    for (const d of (area.doors || [])) {
      if (Math.abs(me.x - d.x) < d.w * 0.5 + 10 && me.onGround) {
        prompt = { kind: 'door', label: 'ENTER ' + d.label, act: () => { KA.A.play('door'); KA.Game.go('world', { area: d.interior, x: 120 }); }, d };
      }
    }
    // interior exit
    if (area.indoor && Math.abs(me.x - area.exitDoor.x) < 34) {
      prompt = { kind: 'door', label: 'LEAVE', act: () => { KA.A.play('door'); KA.Game.go('world', { area: area.exitDoor.back, x: doorXFor(area.id) }); } };
    }
    // shop counter
    if (area.indoor && area.shop && Math.abs(me.x - (area.w * 0.62)) < 60) {
      prompt = { kind: 'shop', label: 'BROWSE ' + KA.NPCs.SHOPS[area.shop].title, act: () => KA.Game.go('shop', { shop: area.shop }) };
    }
    // fishing spots
    for (const sp of (area.spots || [])) {
      if (Math.abs(me.x - sp.x) < 44) {
        prompt = { kind: 'fish', label: 'FISH HERE', act: () => KA.Game.go('fishing', { table: sp.table, back: area.id, x: me.x }) };
      }
    }
    // npcs
    for (const e of ents) {
      if (e.type === 'npc' && Math.abs(me.x - e.x) < 40) {
        prompt = { kind: 'talk', label: 'TALK TO ' + e.def.name.toUpperCase(), act: () => talk(e), e };
      }
    }
    // stable extras
    if (area.id === 'stable' && Math.abs(me.x - area.w * 0.3) < 50) {
      prompt = { kind: 'pet', label: 'YOUR MOUNT', act: () => KA.Game.go('petview', {}) };
    }
    if (prompt && interact) prompt.act();

    // area edges
    if (!area.indoor) {
      if (area.exits.right && me.x > area.w - 26) travel(area.exits.right, 40);
      if (area.exits.left && me.x < 26) travel(area.exits.left, KA.Areas.AREAS[area.exits.left].w - 60);
    }
    if (KA.In.isPressed('KeyM')) KA.Game.go('petview', {});
    if (KA.In.isPressed('Escape')) KA.Game.go('pause', {});
    cam.follow(me.x, me.y - 20, me.vx, 0, dt, 0.2);
  }

  function doorXFor(interiorId) {
    for (const k in KA.Areas.AREAS) {
      const a = KA.Areas.AREAS[k];
      if (a.doors) for (const d of a.doors) if (d.interior === interiorId) return d.x;
    }
    return 200;
  }
  function travel(to, x) {
    const dest = KA.Areas.AREAS[to];
    if (dest.gate && KA.S.fragCount() < dest.gate.frags) {
      say(dest.gate.why, 3);
      me.x = U.clamp(me.x, 30, area.w - 30);
      return;
    }
    S.burnFat(1);
    KA.Game.go('world', { area: to, x });
  }

  /* ---------------- combat ---------------- */
  function hitEnemy(e, dmg, dir) {
    const d = Math.max(1, dmg - (e.st.armor || 0));
    e.hp -= d;
    e.hurtT = 0.22;
    e.vx += dir * (S.weapon().kb || 100);
    e.vy -= 40;
    KA.FX.text(e.x, e.y - e.st.r * 1.6, String(d), '#ffe27a', { size: 16 });
    KA.FX.burst(e.x, e.y - e.st.r * 0.6, 8, { col: ['#ffffff', '#ff9ed2', '#cdeeff'], speed: 130, dir: dir > 0 ? 0 : Math.PI, spread: 1.1 });
    if (e.hp <= 0) killEnemy(e, dir);
  }
  function killEnemy(e, dir) {
    e.dead = 0.001;
    S.killed(e.kind);
    KA.FX.chunks(e.x, e.y - e.st.r * 0.5, 12, ['#ffffff', '#9dc4d6', '#ff9ed2']);
    KA.FX.ring(e.x, e.y - e.st.r * 0.5, 6, 42, '#ffffff', 0.4);
    KA.A.play('pop');
    KA.FX.shake(6);
    const n = 1 + U.rndInt(0, 2);
    for (let i = 0; i < n; i++) {
      ents.push({ type: 'drop', kind: 'clam', x: e.x + U.rnd(-10, 10), y: e.y - 12, vy: -U.rnd(40, 110),
        v: Math.round(e.st.dropped / n), life: 22 });
    }
    if (U.chance(0.22)) ents.push({ type: 'drop', kind: 'beer', x: e.x, y: e.y - 14, vy: -90, life: 22 });
    if (e.st.boss) {
      S.D.flags.bossDead = true;
      S.giveFrag(5, 'Worn Fragment');
      setTimeout(() => KA.Game.go('outro', {}), 900);
    }
  }
  function damageMe(n, dir) {
    if (me.iframe > 0 || me.hurtT > 0) return;
    me.hurtT = 0.7; me.iframe = 0.9;
    me.vx += (dir || 1) * 200; me.vy = -140;
    if (S.hurt(n)) die();
  }
  function die() {
    S.D.stats.deaths++;
    const lost = Math.round(S.D.clams * 0.2);
    S.D.clams -= lost;
    S.D.hp = S.hpMax();
    KA.UI.toast('You woke up at home. Lost ' + U.fmt(lost) + ' clams.', P.coral);
    KA.Game.go('world', { area: 'home', x: 340 });
  }
  function collect(e) {
    if (e.kind === 'clam') { S.earn(e.v, true); KA.A.play('coin'); KA.FX.text(e.x, e.y - 10, '+' + e.v, P.gold, { size: 13 }); }
    else if (e.kind === 'beer') { S.addItem('beer', 'lager', 1); KA.A.play('blip'); KA.UI.toast('Found a Reef Lager', P.beer); }
    else if (e.kind === 'fish') { S.addFish(e.id, 1); KA.A.play('blip'); }
  }

  function updateEnemy(e, dt) {
    if (e.dead) { e.dead += dt; return; }
    e.t += dt;
    if (e.hurtT > 0) e.hurtT -= dt;
    if (e.atk > 0) e.atk = Math.max(0, e.atk - dt / 0.3);
    const dx = me.x - e.x, dy = (me.y - 18) - e.y;
    const dist = Math.hypot(dx, dy);
    const st = e.st;
    const aggro = dist < (st.boss ? 500 : 220);
    e.vx *= Math.pow(0.2, dt);
    if (aggro) {
      e.dir = dx > 0 ? 1 : -1;
      if (st.spit) {
        if (dist < 320 && e.atkCd <= 0) {
          e.atkCd = 2.2; e.atk = 1;
          shots.push({ x: e.x + e.dir * 14, y: e.y - 8, vx: (dx / dist) * 180, vy: (dy / dist) * 180 - 20, life: 3, col: '#a86bff' });
          KA.A.play('zap');
        }
        e.vx += e.dir * st.spd * 0.4 * dt * 10;
      } else if (dist > st.r + 14) {
        e.vx += e.dir * st.spd * dt * 12;
      } else if (e.atkCd <= 0) {
        e.atkCd = st.boss ? 1.1 : 1.6; e.atk = 1;
        damageMe(st.dmg, e.dir);
        if (st.steal && S.D.clams > 0) {
          const st2 = Math.min(S.D.clams, 10 + U.rndInt(0, 20));
          S.D.clams -= st2;
          KA.FX.text(me.x, me.y - 40, '-' + st2 + ' clams!', P.coral, { size: 14 });
        }
      }
    } else {
      // patrol
      if (Math.sin(e.t * 0.7) > 0) e.dir = 1; else e.dir = -1;
      e.vx += e.dir * st.spd * 0.35 * dt * 10;
      if (Math.abs(e.x - e.home) > 180) e.dir = e.home > e.x ? 1 : -1;
    }
    e.atkCd -= dt;
    e.x = U.clamp(e.x + e.vx * dt, 20, area.w - 20);
    if (st.swim) {
      const tgt = aggro ? (me.y - 20) : 120 + Math.sin(e.t * 0.6) * 50;
      e.vy = U.damp(e.vy, (tgt - e.y) * 2.2, 0.002, dt);
      e.y += e.vy * dt;
      e.y = U.clamp(e.y, 40, floorY(e.x) - 10);
    } else {
      e.y = floorY(e.x) - 2;
    }
  }

  /* ---------------- talking ---------------- */
  function talk(e) {
    const def = e.def, D0 = S.D;
    const seen = D0.seen[e.id];
    D0.seen[e.id] = true;
    const lines = (seen && def.repeat ? def.repeat : def.lines).slice();
    const choices = [];
    /* crown fragment business */
    if (def.frag && !D0.frags[def.frag.id]) {
      const f = def.frag;
      if (f.cost && D0.clams >= f.cost) {
        choices.push({ text: 'PAY ' + U.fmt(f.cost), tone: 'gold', action: () => {
          if (S.spend(f.cost)) { S.giveFrag(f.id, f.name); KA.Dlg.open({ name: def.name, kind: def.kind, col: def.col,
            lines: ['Pleasure doing business. Do not come back.'] }); }
        } });
      } else if (f.cost) {
        lines.push('Come back with ' + U.fmt(f.cost) + ' clams.');
      } else if (f.need && f.need.fish) {
        const have = D0.inv.fish[f.need.fish] || 0;
        if (have >= f.need.n) {
          choices.push({ text: 'HAND OVER ' + f.need.n, tone: 'green', action: () => {
            S.takeFish(f.need.fish, f.need.n);
            S.giveFrag(f.id, f.name);
            KA.Dlg.open({ name: def.name, kind: def.kind, col: def.col, lines: ['There it is. Wedged in the gullet. Yours.'] });
          } });
        } else lines.push('You have ' + have + ' of ' + f.need.n + ' ' + KA.Items.fishById[f.need.fish].name + '.');
      } else if (f.need && f.need.kills) {
        const have = D0.kills.bandit || 0;
        if (have >= f.need.kills) {
          choices.push({ text: 'CLAIM IT', tone: 'violet', action: () => {
            S.giveFrag(f.id, f.name);
            KA.Dlg.open({ name: def.name, kind: def.kind, col: def.col, lines: ['Efficient. Unsettling. Here.'] });
          } });
        } else lines.push('Bandits thinned: ' + have + ' of ' + f.need.kills + '.');
      } else if (f.need && f.need.raceWin) {
        if (D0.stats.wins >= f.need.raceWin) {
          choices.push({ text: 'COLLECT', tone: 'gold', action: () => {
            S.giveFrag(f.id, f.name);
            KA.Dlg.open({ name: def.name, kind: def.kind, col: def.col, lines: ['A deal is a deal. Sickening, but a deal.'] });
          } });
        } else lines.push('Win me a race first. Out back. Any Reef Cup will do.');
      }
    }
    /* side quests */
    if (def.quest) {
      const q = KA.Quests.SIDE[def.quest], st = D0.quests[def.quest];
      if (!st) { S.startQuest(def.quest); lines.push('JOB: ' + q.text); }
      else if (st.done && !st.claimed) {
        choices.push({ text: 'CLAIM REWARD', tone: 'green', action: () => {
          S.claimQuest(def.quest);
          KA.Dlg.open({ name: def.name, kind: def.kind, col: def.col, lines: ['Good. Take it.'] });
        } });
      } else if (!st.done) {
        const target = q.need.n || q.need.kills || 1;
        lines.push('JOB: ' + q.text + '  (' + Math.min(st.have, target) + '/' + target + ')');
      }
    }
    KA.Dlg.open({ name: def.name, kind: def.kind, col: def.col, lines, choices: choices.length ? choices : null });
  }

  /* ---------------- draw ---------------- */
  function draw(ctx) {
    if (area.indoor) drawIndoor(ctx);
    else drawOutdoor(ctx);
    KA.Game.hud(ctx, { place: area.name });
    hudExtras(ctx);
    if (KA.Dlg.active()) KA.Dlg.draw(ctx);
    else if (prompt) drawPrompt(ctx);
    KA.UI.touchPad(ctx, BTNS);
  }

  function drawOutdoor(ctx) {
    const th = area.theme;
    // water column
    D.rect(ctx, 0, 0, KA.W, KA.H, D.vgrad(ctx, 0, 0, 0, KA.H,
      [[0, th.top], [0.45, th.mid], [1, th.bot]], 'w' + area.id));
    ctx.save();
    ctx.translate(-cam.x * 0.35, 0);
    // background silhouettes
    for (const b of (props.bg || [])) {
      const gy = KA.H - 46 + b.z * 10;
      KA.Rig.sea.prop(ctx, { x: b.x * 0.65, kind: b.kind, s: b.s, ph: 0, back: true },
        gy, { bgProp: D.alpha(th.bot, 0.55), rock: D.alpha(th.bot, 0.6) });
    }
    ctx.restore();
    // mid-distance kelp band, parallax
    ctx.save();
    ctx.translate(-cam.x * 0.62, 0);
    ctx.globalAlpha = 0.42;
    for (let i = 0; i < Math.round(area.w / 120); i++) {
      const bx = i * 120 + (area.seed * 37 % 90);
      KA.Rig.sea.prop(ctx, { x: bx, kind: area.props === 'ruins' || area.props === 'throne' ? 'pillar' : 'kelp',
        s: 1.1 + ((i * 7) % 5) * 0.12, ph: i * 1.7, back: false }, KA.H - 30, { rock: D.alpha(th.bot, 0.7) });
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // light shafts from the surface
    if (area.surface) {
      ctx.globalAlpha = 0.10;
      for (let i = 0; i < 7; i++) {
        const x = ((i * 150 - cam.x * 0.5) % (KA.W + 300)) - 150;
        const w = 26 + Math.sin(t * 0.4 + i) * 8;
        D.poly(ctx, [[x, 0], [x + w, 0], [x + w * 2.2, KA.H], [x - w * 0.6, KA.H]], '#dff6ff');
      }
      ctx.globalAlpha = 1;
    }
    if (area.dark) { ctx.globalAlpha = area.dark; D.rect(ctx, 0, 0, KA.W, KA.H, '#02040c'); ctx.globalAlpha = 1; }

    ctx.save();
    cam.apply(ctx);
    // surface line
    if (area.surface) {
      const y0 = 22;
      D.path(ctx, () => {
        ctx.moveTo(0, y0 + 10);
        for (let x = 0; x <= area.w; x += 24) ctx.lineTo(x, y0 + Math.sin(x * 0.02 + t * 1.6) * 4);
        ctx.lineTo(area.w, 0); ctx.lineTo(0, 0); ctx.closePath();
      }, D.alpha('#dff6ff', 0.30));
      for (let x = 0; x < area.w; x += 26) {
        D.circle(ctx, x, y0 + Math.sin(x * 0.02 + t * 1.6) * 4, 2.2, 'rgba(255,255,255,.5)');
      }
    }
    // ambient sea life behind
    for (const c of amb) if (c.s < 1) KA.Rig.sea.creature(ctx, c);
    // back props
    for (const p of props) if (p.back) KA.Rig.sea.prop(ctx, p, floorY(p.x), th);
    // village buildings
    if (area.doors && area.doors.length) for (const d of area.doors) building(ctx, d, th);
    // seabed
    seabed(ctx, th);
    // fishing spots
    for (const sp of (area.spots || [])) {
      const gy = floorY(sp.x);
      ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.2;
      D.circle(ctx, sp.x, gy - 30, 15, D.alpha('#7fe8ff', 0.18));
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const yy = gy - 20 - ((t * 24 + i * 18) % 54);
        D.circle(ctx, sp.x + Math.sin(yy * 0.1) * 5, yy, 2, 'rgba(205,238,255,.6)');
      }
      D.ellipse(ctx, sp.x, gy - 4, 22, 6, 0, 'rgba(127,232,255,.18)');
    }
    // fore props
    for (const p of props) if (!p.back) KA.Rig.sea.prop(ctx, p, floorY(p.x), th);
    // entities
    drawEnts(ctx);
    // ambient life in front: translucent, and it gets out of the king's face
    for (const c of amb) {
      if (c.s < 1) continue;
      const near = U.clamp((U.dist(c.x, c.y, me.x, me.y - 16) - 22) / 34, 0, 1);
      ctx.globalAlpha = 0.62 * near;
      if (ctx.globalAlpha > 0.02) KA.Rig.sea.creature(ctx, c);
    }
    ctx.globalAlpha = 1;
    KA.FX.drawWorld(ctx);
    ctx.restore();
    // vignette
    D.rect(ctx, 0, 0, KA.W, KA.H, D.rgrad(ctx, KA.W / 2, KA.H / 2, KA.W * 0.78,
      [[0.55, 'rgba(0,0,0,0)'], [1, 'rgba(2,8,16,.55)']], 'vig' + KA.W));
  }

  function seabed(ctx, th) {
    const y0 = floorY(0);
    D.path(ctx, () => {
      ctx.moveTo(0, KA.H + 40);
      for (let x = 0; x <= area.w; x += 16) ctx.lineTo(x, floorY(x));
      ctx.lineTo(area.w, KA.H + 40);
      ctx.closePath();
    }, D.vgrad(ctx, 0, y0 - 20, 0, y0 + 90, [[0, th.sand], [1, th.sand2]], 'sb' + area.id));
    // top ridge highlight
    ctx.strokeStyle = D.alpha('#ffffff', 0.22); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= area.w; x += 16) { const y = floorY(x); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // pebbles
    for (let x = 20; x < area.w; x += 47) {
      const y = floorY(x) + 8 + (x % 13);
      D.circle(ctx, x, y, 2 + (x % 3), D.alpha(th.sand2, 0.8));
    }
  }

  function building(ctx, d, th) {
    const gy = floorY(d.x);
    const w = d.w * 1.15, h = 140;
    const x = d.x - w / 2, y = gy - h;
    // body
    D.rr(ctx, x, y, w, h, 8, D.vgrad(ctx, 0, y, 0, gy, [[0, '#3f7f9a'], [1, '#1f4f68']], 'bld' + w + '_' + Math.round(y) + '_' + Math.round(gy)),
      { shadow: 'rgba(0,20,30,.4)', blur: 10, sy: 4 });
    // shell roof
    D.blob(ctx, [[x - 10, y + 6], [x + w * 0.2, y - 26], [x + w * 0.8, y - 26], [x + w + 10, y + 6]],
      '#ff8f5a', { tension: 0.5, shadow: 'rgba(0,20,30,.35)', blur: 6, sy: 3 });
    for (let i = 0; i < 4; i++) D.line(ctx, x + w * (0.2 + i * 0.2), y - 22, x + w * (0.1 + i * 0.26), y + 4, '#c9601c', 1.5);
    // windows
    for (let i = 0; i < 2; i++) {
      const wx = x + 12 + i * (w - 44);
      D.rr(ctx, wx, y + 20, 22, 20, 4, '#ffe9b0');
      D.rr(ctx, wx, y + 20, 22, 20, 4, null, { line: '#c9821c', lineW: 2 });
      D.glow(ctx, wx + 11, y + 30, 26, '#ffd88a', 0.22);
    }
    // door
    const dw = 30;
    D.rr(ctx, d.x - dw / 2, gy - 44, dw, 44, 6, '#6d4a24');
    D.rr(ctx, d.x - dw / 2 + 3, gy - 40, dw - 6, 36, 4, '#8a5f30');
    D.circle(ctx, d.x + 8, gy - 24, 2.4, '#ffd24a');
    // hanging sign
    const sw = T.width(ctx, d.label, 11, 900) + 18;
    D.rr(ctx, d.x - sw / 2, y - 46, sw, 20, 6, '#c9a26a', { shadow: 'rgba(0,0,0,.35)', blur: 5, sy: 2 });
    D.rr(ctx, d.x - sw / 2, y - 46, sw, 20, 6, null, { line: '#8a6a3c', lineW: 1.5 });
    T.draw(ctx, d.label, d.x, y - 41, '#4a2f14', { size: 11, align: 'center', weight: 900 });
  }

  function drawEnts(ctx) {
    // sort by y so things overlap sensibly
    const list = ents.slice().sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e.type === 'npc') {
        KA.Rig.folk.draw(ctx, e.x, e.y, { scale: 1.3, kind: e.def.kind, dir: me.x > e.x ? 1 : -1,
          talk: KA.Dlg.active() && prompt && prompt.e === e, tag: 'n' + e.id,
          alert: prompt && prompt.e === e, dt: 1 / 60 });
        T.draw(ctx, e.def.name, e.x, e.y - 78, D.alpha(e.def.col, 0.9), { size: 11, align: 'center', weight: 800, shadow: true });
      } else if (e.type === 'enemy') {
        const a = e.dead ? U.clamp(1 - e.dead / 0.6, 0, 1) : 1;
        ctx.globalAlpha = a;
        ctx.save();
        if (e.dead) { ctx.translate(e.x, e.y); ctx.rotate((1 - a) * 1.6); ctx.translate(-e.x, -e.y); }
        KA.Rig.folk.draw(ctx, e.x, e.y, { scale: e.st.boss ? 1.9 : 1.25, kind: e.kind, dir: e.dir,
          hurt: e.hurtT > 0, attack: e.atk, tag: 'e' + (e.home | 0) + e.kind, dt: 1 / 60 });
        ctx.restore();
        ctx.globalAlpha = 1;
        if (!e.dead) {
          const w = e.st.boss ? 90 : 34;
          D.rr(ctx, e.x - w / 2, e.y - e.st.r * 2.4 - 8, w, 5, 2.5, 'rgba(0,0,0,.5)');
          D.rr(ctx, e.x - w / 2 + 1, e.y - e.st.r * 2.4 - 7, (w - 2) * (e.hp / e.hpMax), 3, 1.5,
            e.st.boss ? '#ff6f74' : '#ffc94a');
          if (e.st.boss) T.draw(ctx, e.st.name, e.x, e.y - e.st.r * 2.4 - 24, '#ff9ed2',
            { size: 12, align: 'center', weight: 900, shadow: true });
        }
      } else if (e.type === 'drop') {
        const bob = Math.sin(t * 5 + e.x) * 2;
        if (e.kind === 'clam') {
          D.glow(ctx, e.x, e.y + bob, 14, '#ffd6ea', 0.35);
          D.blob(ctx, [[e.x - 7, e.y + bob], [e.x - 5, e.y - 6 + bob], [e.x, e.y - 8 + bob],
                       [e.x + 5, e.y - 6 + bob], [e.x + 7, e.y + bob]], '#f6d7e8', { tension: 0.5 });
        } else if (e.kind === 'beer') {
          D.glow(ctx, e.x, e.y + bob, 16, '#ffb52e', 0.35);
          D.rr(ctx, e.x - 5, e.y - 12 + bob, 10, 13, 3, '#ffb52e');
          D.rr(ctx, e.x - 5, e.y - 14 + bob, 10, 4, 2, '#fff3d6');
        }
      }
    }
    for (const s of shots) { D.glow(ctx, s.x, s.y, 12, s.col, 0.5); D.circle(ctx, s.x, s.y, 5, s.col); }
    // pet then king
    const ap = S.active();
    if (!me.mounted) KA.Rig.pet.draw(ctx, ap, pet.x, pet.y, { scale: 1.0, flipX: pet.dir < 0,
      speed: 0.3 + Math.abs(pet.vx) / 80, tag: 'follow' });
    if (me.mounted) {
      KA.Rig.pet.draw(ctx, ap, me.x, me.y - 14, { scale: 1.35, flipX: me.dir < 0, speed: 0.4 + Math.abs(me.vx) / 90, tag: 'mount' });
      KA.Rig.king.draw(ctx, me.x - me.dir * 2, me.y - 14 + KA.Pet.rideY(ap) * 1.35, { scale: 1.15, mode: 'ride', dir: me.dir,
        vx: me.vx, vy: me.vy, fat: S.D.fat, weapon: S.weapon(), hurt: me.hurtT > 0, dt: 1 / 60 });
    } else {
      // shadow
      const gy = floorY(me.x);
      const h = U.clamp(1 - (gy - me.y) / 120, 0, 1);
      ctx.globalAlpha = h * 0.28;
      D.ellipse(ctx, me.x, gy - 2, 16 * h + 6, 5, 0, '#000');
      ctx.globalAlpha = 1;
      if (me.dashT > 0) {
        ctx.globalAlpha = 0.3;
        /* dt 0: the ghost renders the rig without stepping its physics twice */
        KA.Rig.king.draw(ctx, me.x - me.vx * 0.05, me.y, { scale: 1.25, mode: me.mode, dir: me.dir,
          vx: me.vx, vy: me.vy, fat: S.D.fat, weapon: S.weapon(), dt: 0 });
        ctx.globalAlpha = 1;
      }
      KA.Rig.king.draw(ctx, me.x, me.y, { scale: 1.25, mode: me.mode, dir: me.dir, vx: me.vx, vy: me.vy,
        fat: S.D.fat, weapon: S.weapon(), attack: me.atk, hurt: me.hurtT > 0, dt: 1 / 60 });
    }
  }

  /* ---------------- interiors ---------------- */
  function drawIndoor(ctx) {
    const a = area, aw = roomW();
    D.rect(ctx, 0, 0, KA.W, KA.H, '#06131d');
    ctx.save();
    cam.apply(ctx);
    // back wall
    D.rect(ctx, 0, 0, aw, a.floorY, D.vgrad(ctx, 0, a.roomTop, 0, a.floorY,
      [[0, a.wall], [1, a.wall2]], 'iw' + a.id));
    // wainscot + skirting
    D.rect(ctx, 0, a.floorY - 34, aw, 4, D.alpha('#ffffff', 0.10));
    // floor
    D.rect(ctx, 0, a.floorY, aw, KA.H, D.vgrad(ctx, 0, a.floorY, 0, KA.H, [[0, a.floor], [1, a.floor2]], 'if' + a.id));
    for (let x = 0; x < aw; x += 34) D.rect(ctx, x, a.floorY, 2, KA.H - a.floorY, D.alpha('#000', 0.12));
    // ceiling beam
    D.rect(ctx, 0, a.roomTop - 12, aw, 12, D.shade(a.wall2, -0.3));
    for (let x = 20; x < aw; x += 90) D.rr(ctx, x, a.roomTop - 12, 12, 14, 2, D.shade(a.wall2, -0.45));
    // exit door
    const dx = a.exitDoor.x;
    D.rr(ctx, dx - 20, a.floorY - 62, 40, 62, 6, '#4a3220');
    D.rr(ctx, dx - 16, a.floorY - 58, 32, 58, 4, '#6d4a24');
    D.circle(ctx, dx + 9, a.floorY - 30, 3, '#ffd24a');
    // water spilling in at the doorway - it is still the ocean out there
    ctx.globalAlpha = 0.25;
    D.rr(ctx, dx - 20, a.floorY - 62, 40, 62, 6, '#7fe8ff');
    ctx.globalAlpha = 1;
    T.draw(ctx, 'OUT', dx, a.floorY - 78, P.dim, { size: 10, align: 'center', weight: 800 });
    decorate(ctx, a, aw);
    drawEnts(ctx);
    KA.FX.drawWorld(ctx);
    ctx.restore();
    D.rect(ctx, 0, 0, KA.W, KA.H, D.rgrad(ctx, KA.W / 2, KA.H / 2, KA.W * 0.8,
      [[0.5, 'rgba(0,0,0,0)'], [1, 'rgba(2,8,16,.6)']], 'ivig' + KA.W));
  }

  /* every interior is furnished by hand */
  function decorate(ctx, a, aw) {
    const fy = a.floorY, W = aw || a.w;
    const lamp = (x, y, col) => { D.glow(ctx, x, y, 46, col || '#ffd88a', 0.22); D.circle(ctx, x, y, 5, '#fff3d6');
      D.capsule(ctx, x, y - 4, x, a.roomTop, 1.5, 1.5, '#3a2f22'); };
    const rug = (x, w2, col) => { D.rr(ctx, x, fy + 6, w2, 16, 6, col); D.rr(ctx, x + 6, fy + 10, w2 - 12, 8, 4, D.alpha('#fff', 0.15)); };
    const shelf = (x, y, w2) => { D.rr(ctx, x, y, w2, 5, 2, '#5a3f22', { shadow: 'rgba(0,0,0,.3)', blur: 3, sy: 2 }); };
    const barrel = (x, y, s) => {
      D.rr(ctx, x - 11 * s, y - 26 * s, 22 * s, 26 * s, 8 * s,
        D.vgrad(ctx, x - 11 * s, 0, x + 11 * s, 0, [[0, '#8a5a24'], [0.45, '#c9821c'], [1, '#8a5a24']], 'bar' + Math.round(s * 10)));
      D.rr(ctx, x - 12 * s, y - 20 * s, 24 * s, 3 * s, 1, '#5e3f0f');
      D.rr(ctx, x - 12 * s, y - 10 * s, 24 * s, 3 * s, 1, '#5e3f0f');
      D.ellipse(ctx, x, y - 26 * s, 11 * s, 4 * s, 0, '#ffe08a');
    };
    // shared wall dressing so no interior has a bald upper half
    const wallDeco = () => {
      // bunting
      for (let i = 0; i < Math.floor(W / 46); i++) {
        const bx = 24 + i * 46, sag = Math.sin(i * 0.9) * 4;
        D.line(ctx, bx, a.roomTop + 4 + sag, bx + 46, a.roomTop + 8 + sag, 'rgba(255,255,255,.18)', 1.5);
        D.tri(ctx, [bx + 16, a.roomTop + 6 + sag], [bx + 30, a.roomTop + 6 + sag], [bx + 23, a.roomTop + 20 + sag],
          ['#ff6f74', '#ffc94a', '#3fd18b', '#7fe8ff'][i % 4]);
      }
      // porthole window with light
      const wx = W - 84, wy = a.roomTop + 46;
      D.circle(ctx, wx, wy, 26, '#123a4f');
      D.circle(ctx, wx, wy, 21, D.vgrad(ctx, 0, wy - 21, 0, wy + 21, [[0, '#7fd8f0'], [1, '#1d6d94']], 'port' + Math.round(wy)));
      D.circle(ctx, wx, wy, 21, null, { line: '#c9a26a', lineW: 3 });
      for (let i = 0; i < 4; i++) D.circle(ctx, wx + Math.cos(i * 1.57) * 24, wy + Math.sin(i * 1.57) * 24, 2.5, '#c9a26a');
      D.glow(ctx, wx, wy, 60, '#9fe8ff', 0.16);
      KA.Rig.sea.creature(ctx, { kind: 'fish', x: wx - 6 + Math.sin(KA.Rig.sea.T * 0.7) * 8, y: wy + 4, s: 0.5, dir: 1, ph: 2, hue: 0.5 });
      // framed pictures
      for (let i = 0; i < 2; i++) {
        const px2 = 120 + i * 150, py2 = a.roomTop + 34;
        D.rr(ctx, px2, py2, 54, 40, 4, '#6d4a24');
        D.rr(ctx, px2 + 5, py2 + 5, 44, 30, 3, i ? '#2f5d8a' : '#3f6f5a');
        if (i) { D.circle(ctx, px2 + 27, py2 + 20, 8, '#ffd24a'); }
        else { KA.Rig.sea.creature(ctx, { kind: 'fish', x: px2 + 27, y: py2 + 20, s: 0.45, dir: 1, ph: 1, hue: 0.2 }); }
      }
    };
    wallDeco();
    switch (a.decor) {
      case 'shack':
        lamp(90, fy - 120);
        rug(150, 120, '#7a3f4a');
        // bed
        D.rr(ctx, 300, fy - 26, 120, 26, 5, '#5a3f22');
        D.rr(ctx, 300, fy - 38, 120, 16, 6, '#3f6f8a');
        D.rr(ctx, 306, fy - 46, 34, 14, 6, '#e8eef4');
        // portrait of the crown
        D.rr(ctx, 190, fy - 150, 70, 56, 4, '#6d4a24');
        D.rr(ctx, 196, fy - 144, 58, 44, 3, '#1b3a4f');
        D.poly(ctx, [[212, fy - 112], [238, fy - 112], [238, fy - 128], [231, fy - 120],
                     [225, fy - 136], [219, fy - 120], [212, fy - 128]], '#ffd24a');
        T.draw(ctx, 'BETTER DAYS', 225, fy - 108, '#9dc4d6', { size: 7, align: 'center' });
        // empty bottles, so many
        for (let i = 0; i < 9; i++) {
          const bx = 60 + i * 15 + (i % 3) * 4;
          D.rr(ctx, bx, fy - 16, 6, 16, 2, i % 2 ? '#3f7f5a' : '#8a5a24');
          D.rr(ctx, bx + 1.5, fy - 22, 3, 7, 1, i % 2 ? '#3f7f5a' : '#8a5a24');
        }
        D.rr(ctx, 440, fy - 20, 40, 20, 4, '#8a5f30');
        break;
      case 'bait':
        lamp(110, fy - 130, '#9fe8ff');
        shelf(60, fy - 90, 150); shelf(60, fy - 130, 150);
        for (let i = 0; i < 6; i++) {
          D.capsule(ctx, 70 + i * 24, fy - 92, 70 + i * 24, fy - 132, 2, 2, '#a4713d');
          D.tri(ctx, [68 + i * 24, fy - 132], [72 + i * 24, fy - 142], [76 + i * 24, fy - 132], '#cfd8e2');
        }
        for (let i = 0; i < 4; i++) {
          D.rr(ctx, 240 + i * 30, fy - 22, 24, 22, 5, '#4f7f8a');
          D.ellipse(ctx, 252 + i * 30, fy - 22, 12, 4, 0, '#7fe8ff');
        }
        // counter
        D.rr(ctx, W * 0.62 - 60, fy - 40, 120, 40, 5, '#7a5a34', { shadow: 'rgba(0,0,0,.35)', blur: 6, sy: 3 });
        D.rr(ctx, W * 0.62 - 60, fy - 44, 120, 8, 3, '#a4763f');
        // hanging fish
        for (let i = 0; i < 3; i++) {
          const hx = 400 + i * 40;
          D.line(ctx, hx, a.roomTop, hx, fy - 120, '#3a2f22', 1);
          KA.Rig.sea.creature(ctx, { kind: 'fish', x: hx, y: fy - 110, s: 0.8, dir: 1, ph: i, hue: i * 0.3 });
        }
        break;
      case 'hall':
        lamp(120, fy - 140, '#ffb52e'); lamp(W - 120, fy - 140, '#ffb52e');
        rug(180, 200, '#6d2c3a');
        // bar
        D.rr(ctx, W * 0.62 - 90, fy - 44, 180, 44, 6, '#5e3f1e', { shadow: 'rgba(0,0,0,.4)', blur: 8, sy: 4 });
        D.rr(ctx, W * 0.62 - 90, fy - 50, 180, 10, 4, '#8a5f30');
        for (let i = 0; i < 5; i++) {
          D.rr(ctx, W * 0.62 - 76 + i * 34, fy - 62, 14, 14, 3, '#ffe08a');
          D.rr(ctx, W * 0.62 - 76 + i * 34, fy - 66, 14, 5, 2, '#fff3d6');
        }
        // kegs stacked behind
        barrel(150, fy, 1.2); barrel(196, fy, 1.2); barrel(173, fy - 30, 1.0);
        // stools
        for (let i = 0; i < 3; i++) {
          const sx = 250 + i * 44;
          D.rr(ctx, sx - 10, fy - 22, 20, 5, 2, '#8a5f30');
          D.capsule(ctx, sx, fy - 20, sx, fy, 3, 3, '#6d4a24');
        }
        // dartboard
        D.circle(ctx, W - 70, fy - 130, 20, '#2f5d3a');
        D.circle(ctx, W - 70, fy - 130, 12, '#c9343f');
        D.circle(ctx, W - 70, fy - 130, 4, '#ffd24a');
        break;
      case 'stable':
        lamp(100, fy - 130, '#dff6ff');
        // the pool with your mount
        D.rr(ctx, W * 0.3 - 78, fy - 48, 156, 48, 10, '#1d5c7f', { shadow: 'rgba(0,0,0,.35)', blur: 8, sy: 4 });
        D.rr(ctx, W * 0.3 - 72, fy - 42, 144, 36, 8, D.vgrad(ctx, 0, fy - 42, 0, fy, [[0, '#3fb0e0'], [1, '#1d6d94']], 'pool' + Math.round(fy)));
        for (let i = 0; i < 5; i++) {
          D.ellipse(ctx, W * 0.3 - 60 + i * 30, fy - 42, 10, 3, 0, 'rgba(255,255,255,.35)');
        }
        // hay and feed sacks
        for (let i = 0; i < 3; i++) {
          D.blob(ctx, [[W - 150 + i * 40, fy], [W - 158 + i * 40, fy - 18], [W - 140 + i * 40, fy - 24],
                       [W - 126 + i * 40, fy - 14], [W - 130 + i * 40, fy]], '#c9a24a', { tension: 0.5 });
        }
        // trophy shelf
        shelf(120, fy - 120, 160);
        for (let i = 0; i < 3; i++) {
          const tx = 140 + i * 50;
          D.capsule(ctx, tx, fy - 122, tx, fy - 138, 5, 8, '#ffd24a');
          D.rr(ctx, tx - 7, fy - 122, 14, 5, 2, '#c9821c');
        }
        // counter
        D.rr(ctx, W * 0.62 - 50, fy - 38, 100, 38, 5, '#4a5a3a');
        break;
      case 'armoury': {
        lamp(90, fy - 130, '#ff9a3c');
        // forge glow
        D.glow(ctx, W - 110, fy - 30, 90, '#ff6f2f', 0.3);
        D.rr(ctx, W - 150, fy - 46, 80, 46, 6, '#3a2f3a');
        D.rr(ctx, W - 140, fy - 34, 60, 24, 4, '#ff8f3a');
        for (let i = 0; i < 4; i++) D.circle(ctx, W - 130 + i * 15, fy - 40 - Math.random() * 8, 3, '#ffd24a');
        // anvil
        D.poly(ctx, [[W - 210, fy], [W - 196, fy - 16], [W - 178, fy - 16], [W - 172, fy - 22],
                     [W - 214, fy - 22], [W - 208, fy - 16], [W - 224, fy - 16]], '#5a5a66');
        // weapon rack
        shelf(70, fy - 30, 190);
        KA.Items.WEAPONS.forEach((w, i) => {
          const wx = 84 + i * 30;
          D.capsule(ctx, wx, fy - 32, wx, fy - 100, 2.5, 2, '#8a6a3c');
          D.circle(ctx, wx, fy - 104, 5, w.col);
        });
        // shields
        for (let i = 0; i < 3; i++) {
          const sx = 300 + i * 44;
          D.blob(ctx, [[sx - 14, fy - 130], [sx + 14, fy - 130], [sx + 12, fy - 100], [sx, fy - 88], [sx - 12, fy - 100]],
            i % 2 ? '#3f6f8a' : '#8a5a24', { tension: 0.5 });
          D.circle(ctx, sx, fy - 112, 4, '#ffd24a');
        }
        D.rr(ctx, W * 0.62 - 50, fy - 38, 100, 38, 5, '#3a3a44');
        break;
      }
      case 'bookie':
        lamp(100, fy - 130, '#ffd88a');
        // odds board
        D.rr(ctx, 150, fy - 160, 220, 96, 6, '#12202c', { shadow: 'rgba(0,0,0,.4)', blur: 8, sy: 4 });
        T.draw(ctx, 'TODAY\'S ODDS', 260, fy - 154, '#ffc94a', { size: 12, align: 'center', weight: 900 });
        ['SEAHORSE 8.4', 'CLOWNFISH 5.1', 'WAR CRAB 4.2', 'TUNA 2.8', 'DOLPHIN 2.1'].forEach((s2, i) => {
          T.draw(ctx, s2, 170, fy - 136 + i * 14, i === 4 ? '#7fe8ff' : '#9dc4d6', { size: 11, weight: 700 });
        });
        // desk + safe
        D.rr(ctx, W * 0.62 - 60, fy - 42, 120, 42, 5, '#524626', { shadow: 'rgba(0,0,0,.35)', blur: 6, sy: 3 });
        D.rr(ctx, W - 90, fy - 46, 56, 46, 5, '#3a3a44');
        D.circle(ctx, W - 62, fy - 24, 9, '#9dc4d6');
        D.circle(ctx, W - 62, fy - 24, 4, '#ffd24a');
        break;
    }
  }

  /* ---------------- hud bits ---------------- */
  const BTNS = [];
  function layoutButtons() {
    if (!KA.touch) { KA.In.defineButtons([]); BTNS.length = 0; return; }
    const r = 26, bx = KA.W - 54, by = KA.H - 52;
    BTNS.length = 0;
    BTNS.push({ name: 'atk',   x: bx,          y: by,          r, label: 'HIT', col: 'rgba(255,111,116,.3)' });
    BTNS.push({ name: 'jump',  x: bx - 62,     y: by,          r, label: 'UP',  col: 'rgba(127,232,255,.3)' });
    BTNS.push({ name: 'act',   x: bx,          y: by - 62,     r: 22, label: 'USE', col: 'rgba(255,201,74,.3)' });
    BTNS.push({ name: 'dash',  x: bx - 62,     y: by - 62,     r: 22, label: 'DSH', col: 'rgba(63,209,139,.3)' });
    BTNS.push({ name: 'mount', x: bx - 112,    y: by - 30,     r: 20, label: 'RIDE', col: 'rgba(168,107,255,.3)' });
    KA.In.defineButtons(BTNS);
  }

  function hudExtras(ctx) {
    if (msgT > 0 && msg) {
      ctx.globalAlpha = U.clamp(msgT, 0, 1);
      const w = T.width(ctx, msg, 15, 800) + 28;
      D.rr(ctx, KA.W / 2 - w / 2, 54, w, 26, 13, 'rgba(4,18,29,.8)');
      T.draw(ctx, msg, KA.W / 2, 60, P.text, { size: 15, align: 'center', weight: 800 });
      ctx.globalAlpha = 1;
    }
    // mount name + level
    const ap = S.active();
    const pr = KA.Pet.progress(ap);
    D.rr(ctx, 6, KA.H - 34, 128, 28, 8, 'rgba(4,18,29,.72)');
    T.draw(ctx, ap.name + '  Lv' + pr.lvl, 14, KA.H - 30, P.cyan, { size: 12, weight: 800 });
    KA.UI.bar(ctx, 14, KA.H - 16, 112, 7, pr.frac, { col: P.cyan });
    if (!KA.touch) T.draw(ctx, 'WASD move   J hit   L dash   F ride   E use   M mount   ESC menu',
      KA.W / 2 + 40, KA.H - 14, P.dim2, { size: 11, align: 'center' });
  }
  function drawPrompt(ctx) {
    const w = T.width(ctx, prompt.label, 16, 900) + 40;
    const x = KA.W / 2 - w / 2, y = 168;
    D.rr(ctx, x, y, w, 34, 17, D.vgrad(ctx, 0, y, 0, y + 34, [[0, '#ffd24a'], [1, '#c9821c']], 'pr'),
      { shadow: 'rgba(0,0,0,.4)', blur: 8, sy: 3 });
    T.draw(ctx, (KA.touch ? '' : '[E]  ') + prompt.label, KA.W / 2, y + 8, '#3a2402',
      { size: 16, align: 'center', weight: 900 });
  }

  return { enter, exit, update, draw };
})();
