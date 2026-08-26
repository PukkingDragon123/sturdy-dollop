/* ============================================================
   rpg/state.js - the save. Inventory, XP, skill points, fat and
   beer, fragments, and the localStorage round trip.
   Two kinds of thing live in a slot: a stack of a resource
   ({id, n}) or one unique crafted item ({uid, ...stats}).
   ============================================================ */
KD.State = (function () {
  const KEY = 'crowndeep.save.v1';
  const SLOTS = 40, HOT = 8;

  const S = {
    inv: new Array(SLOTS).fill(null),
    hot: 0,
    clams: 0, xp: 0, level: 1, points: 0,
    alloc: {}, stats: {}, fat: 24, beer: null,
    weight: 100, train: { strength: 0, wind: 0, grit: 0 },
    trainXp: { strength: 0, wind: 0, grit: 0 }, champs: {}, body: {},
    frags: [], flags: {}, quests: {},
    kills: 0, mined: 0, crafted: 0, deaths: 0, playtime: 0,
    seed: 0, msg: null, msgT: 0, msgCol: 'BONE.2',
    npcs: [], chests: {}
  };

  /* ---- resource definitions we own (crafted gear carries its own) ---- */
  const RES = {};
  function res(id, name, sprite, o) {
    RES[id] = Object.assign({ id, name, sprite, stack: 99, value: 1 }, o || {});
    return RES[id];
  }
  /* Which item sprite stands in for a material, and which materials can also
     be placed as a block. The material table itself is owned by KD.Mats - we
     register every entry so anything a recipe asks for is really carryable. */
  const MAT_SPRITE = {
    flint: 'it_ore_iron', driftwood: 'it_plank_i', kelp_fibre: 'it_kelp_i', shell: 'it_shell_i',
    plank: 'it_plank_i', hide: 'it_cloth_i', bone: 'it_bone_i', coral: 'it_coral_i',
    copper: 'it_bar', urchin_spine: 'it_bone_i', brick: 'it_brick_i', bronze: 'it_bar',
    glass: 'it_shell_i', keg_oak: 'it_plank_i', sharktooth: 'it_bone_i', sea_silk: 'it_cloth_i',
    iron: 'it_bar', whalebone: 'it_bone_i', pearl: 'it_pearl', gold: 'it_bar',
    rot_crystal: 'it_glowpod_i', abyssal: 'it_bar'
  };
  const MAT_TILE = { plank: 'plank', brick: 'brick', glass: 'glass', coral: 'coral' };

  function buildResources() {
    /* raw rock you dig up doubles as a building block */
    const raw = [
      ['sand', 'Sand', 'sand', 1], ['clay', 'Clay', 'mud', 1], ['stone', 'Stone', 'stone', 1],
      ['dark', 'Trench Rock', 'dark', 2], ['rot', 'Abyssal Stone', 'rot', 4]
    ];
    for (const [id, name, tile, value] of raw) res(id, name, 'it_brick_i', { tile, value });
    res('ore_copper', 'Copper Ore', 'it_ore_copper', { value: 3 });
    res('ore_bronze', 'Bronze Ore', 'it_ore_bronze', { value: 5 });
    res('ore_iron', 'Iron Ore', 'it_ore_iron', { value: 9 });
    res('ore_gold', 'Gold Ore', 'it_ore_gold', { value: 18 });
    res('ore_abyssal', 'Abyssal Ore', 'it_ore_abyssal', { value: 40 });
    /* every crafting material, straight from the material table */
    if (KD.Mats) {
      for (const m of KD.Mats.all) {
        res(m.id, m.name, MAT_SPRITE[m.id] || 'it_bar', {
          value: m.value || 2, stack: m.stack || 99, tile: MAT_TILE[m.id], mat: true
        });
      }
    }
    res('glowpod', 'Glowpod', 'it_glowpod_i', { value: 6, tile: 'glowpod' });
    res('torch', 'Torch', 'it_torch', { value: 1, tile: 'torch' });
    res('lantern', 'Lantern', 'bk_lantern_lit', { value: 8, tile: 'lantern' });
    res('platform', 'Platform', 'it_plank_i', { value: 1, tile: 'platform' });
    res('door', 'Door', 'bk_door_closed', { value: 6, tile: 'door', stack: 20 });
    res('chest', 'Chest', 'dc_chest_closed', { value: 8, tile: 'chest', stack: 20 });
    for (const st of ['workbench', 'furnace', 'anvil', 'loom', 'vat', 'reroll', 'cookpot']) {
      const T = KD.Tiles.byId[st];
      res(st, T ? T.name : st, 'st_' + st, { value: 20, tile: st, stack: 20 });
    }
    res('fragment', 'Crown Fragment', 'it_fragment', { stack: 5, value: 0, quest: true });
    res('crown', 'The Crown', 'it_crown', { stack: 1, value: 0, quest: true });
    res('bread', 'Kelp Loaf', 'it_bread', { value: 4, food: 2 });
    res('fish1', 'Sardine', 'it_fish1', { value: 6, food: 1 });
    res('fish2', 'Grouper', 'it_fish2', { value: 22, food: 2 });
    res('fish3', 'Golden Snapper', 'it_fish3', { value: 60, food: 3 });
    /* beers: the buff, and the belly */
    res('beer_lager', 'Reef Lager', 'it_beer_mug', { value: 12, beer: { dmg: 0.18, fat: 5, dur: 45 } });
    res('beer_stout', 'Trench Stout', 'it_beer_mug', { value: 34, beer: { dmg: 0.34, fat: 9, dur: 60 } });
    res('beer_royal', 'Royal Foam', 'it_beer_mug', { value: 90, beer: { dmg: 0.58, fat: 14, dur: 75 } });
    res('beer_keg', 'Her Own Brew', 'it_beer_keg', { value: 240, beer: { dmg: 1.0, fat: 22, dur: 90 } });
  }
  const resOf = (id) => RES[id] || null;

  /* The recipe table and the art files were authored against each other's
     names, not identical ones. This is the one place the two vocabularies
     meet: a recipe's sprite name resolved to a sprite that really exists. */
  const SPRITE_ALIAS = {
    pl_torch: 'it_torch', pl_lantern: 'bk_lantern_lit', pl_workbench: 'st_workbench',
    pl_furnace: 'st_furnace', pl_anvil: 'st_anvil', pl_loom: 'st_loom', pl_vat: 'st_vat',
    pl_reroll: 'st_reroll', pl_cookpot: 'st_cookpot', pl_chest: 'dc_chest_closed',
    pl_door: 'bk_door_closed', pl_platform: 'bk_stair_l', pl_block: 'it_brick_i',
    it_cuirass: 'it_chest', it_tunic: 'it_chest', it_shell: 'it_shield',
    it_beer: 'it_beer_mug', it_meal: 'it_bread',
    it_beer1: 'it_beer_mug', it_beer2: 'it_beer_mug', it_beer3: 'it_beer_mug',
    it_beer4: 'it_beer_keg', it_brew: 'it_beer_mug'
  };
  /* first name in the chain that actually exists, else a shape-appropriate stand-in */
  function art(name, kind) {
    if (!name) return fallbackArt(kind);
    if (KD.PX.has(name)) return name;
    const a = SPRITE_ALIAS[name];
    if (a && KD.PX.has(a)) return a;
    return fallbackArt(kind);
  }
  function fallbackArt(kind) {
    const order = kind === 'tool' ? ['it_pick', 'it_bar']
      : kind === 'weapon' ? ['it_shortblade', 'it_bar']
      : kind === 'armour' ? ['it_helm', 'it_bar']
      : ['it_brick_i', 'it_bar', 'stone_mid'];
    for (const n of order) if (KD.PX.has(n)) return n;
    return KD.PX.names()[0];
  }
  /* which world tile a crafted placeable turns into */
  const PLACE_TILE = {
    platform: 'platform', door: 'door', chest: 'chest', torch: 'torch', lantern: 'lantern',
    workbench: 'workbench', furnace: 'furnace', anvil: 'anvil', loom: 'loom',
    vat: 'vat', reroll: 'reroll', cookpot: 'cookpot'
  };
  function tileForPlaceable(item) {
    if (PLACE_TILE[item.shape]) return PLACE_TILE[item.shape];
    /* a generic "block" takes its identity from the material it was made of */
    const m = item.mats && item.mats.block;
    if (m && MAT_TILE[m]) return MAT_TILE[m];
    if (m && KD.Tiles.byId[m]) return m;
    return null;
  }

  /* ---- inventory ---- */
  /* Gear is a unique, non-stacking item with its own rolled stats; everything
     else is a stack of a resource id. Identify it by KIND, not by a uid - the
     crafting table stamps kind and we add the uid, so testing for uid alone
     silently treats every freshly forged sword as an unknown resource. */
  const GEAR_KINDS = { tool: 1, weapon: 1, armour: 1 };
  const isGear = (it) => !!(it && it.kind && GEAR_KINDS[it.kind]);
  let uidN = 0;
  const stampUid = (it) => { if (it && !it.uid) it.uid = 'g' + (++uidN) + '_' + (it.shape || 'x'); return it; };
  function nameOf(it) {
    if (!it) return '';
    if (isGear(it)) return it.name;
    const r = resOf(it.id);
    return r ? r.name : it.id;
  }
  function spriteOf(it) {
    if (!it) return null;
    if (isGear(it)) return art(it.sprite, it.kind);
    const r = resOf(it.id);
    return art(r && r.sprite, 'res');
  }
  function count(id) {
    let n = 0;
    for (const s of S.inv) if (s && !isGear(s) && s.id === id) n += s.n;
    return n;
  }
  function give(id, n) {
    n = n || 1;
    const r = resOf(id);
    if (!r) return 0;
    let left = n;
    for (let i = 0; i < SLOTS && left > 0; i++) {
      const s = S.inv[i];
      if (s && !isGear(s) && s.id === id && s.n < r.stack) {
        const add = Math.min(left, r.stack - s.n);
        s.n += add; left -= add;
      }
    }
    for (let i = 0; i < SLOTS && left > 0; i++) {
      if (!S.inv[i]) { const add = Math.min(left, r.stack); S.inv[i] = { id, n: add }; left -= add; }
    }
    if (left < n) KD.Sfx.play('pickup');
    if (left > 0) say('Inventory full.', 'BLOOD.2');
    return n - left;
  }
  function giveGear(item) {
    for (let i = 0; i < SLOTS; i++) if (!S.inv[i]) { S.inv[i] = item; KD.Sfx.play('pickup'); return true; }
    say('Inventory full.', 'BLOOD.2');
    return false;
  }
  function take(id, n) {
    n = n || 1;
    let left = n;
    for (let i = 0; i < SLOTS && left > 0; i++) {
      const s = S.inv[i];
      if (s && !isGear(s) && s.id === id) {
        const t = Math.min(left, s.n);
        s.n -= t; left -= t;
        if (s.n <= 0) S.inv[i] = null;
      }
    }
    return left === 0;
  }
  function takeSlot(i, n) {
    const s = S.inv[i];
    if (!s) return null;
    if (isGear(s)) { S.inv[i] = null; return s; }
    const t = Math.min(n || s.n, s.n);
    s.n -= t;
    const out = { id: s.id, n: t };
    if (s.n <= 0) S.inv[i] = null;
    return out;
  }
  const hotbarItem = () => {
    const s = S.inv[S.hot];
    if (!s) return null;
    return isGear(s) ? s : Object.assign({}, resOf(s.id), { n: s.n, slot: S.hot });
  };
  /* What is in your hand, in the crafted item's own vocabulary:
     tools carry pow/mine/tier, weapons carry dmg/spd/reach/crit/knock. */
  const BARE_TOOL = { name: 'Bare Hands', pow: 2, mine: 0.7, tier: 0, dmg: 2, spd: 1, reach: 12 };
  const BARE_FIST = { name: 'Fist', dmg: 3, spd: 1.1, reach: 12, crit: 0, knock: 0.8 };
  function tool() {
    const s = S.inv[S.hot];
    if (isGear(s) && s.kind === 'tool') return s;
    return BARE_TOOL;
  }
  function weapon() {
    const s = S.inv[S.hot];
    if (isGear(s) && (s.kind === 'weapon' || s.kind === 'tool')) return s;
    return BARE_FIST;
  }
  /* ---- worn armour ---- */
  function equipped(slot) { return S.equip && S.equip[slot] ? S.equip[slot] : null; }
  function armourTotal() {
    let n = 0;
    for (const k in (S.equip || {})) if (S.equip[k]) n += S.equip[k].armour || 0;
    return n + (S.stats.armour || 0);
  }
  /* right-click an armour piece in the bag to wear it, or take it off */
  function equip(item) {
    if (!isGear(item) || item.kind !== 'armour') return false;
    const slot = item.slot || 'body';
    const was = S.equip[slot] || null;
    S.equip[slot] = item;
    if (was) giveGear(was);
    KD.Sfx.play('place');
    say('Wearing ' + item.name, 'BONE.2');
    return true;
  }
  function unequip(slot) {
    const it = S.equip[slot];
    if (!it) return false;
    S.equip[slot] = null;
    giveGear(it);
    return true;
  }
  function useItem(slot) {
    const r = resOf(slot.id);
    if (!r) return;
    if (r.beer) { drink(r); take(slot.id, 1); return; }
    if (r.food) { KD.Player.heal(r.food); addFat(r.food * 1.5); take(slot.id, 1); KD.Sfx.play('pickup'); return; }
    say('Nothing happens.', 'BONE.0');
  }

  const earn = (n) => { S.clams += n; };
  const spend = (n) => { if (S.clams < n) return false; S.clams -= n; return true; };

  /* ---- beer, fat, damage ---- */
  function drink(r) {
    S.beer = { dmg: r.beer.dmg, t: r.beer.dur, max: r.beer.dur, name: r.name };
    addFat(r.beer.fat);
    KD.Sfx.play('beer');
    setTimeout(() => KD.Sfx.play('burp'), 420);
    say(r.name + '. Courage!', 'GOLD.2');
  }
  function tickBeer(dt) {
    if (!S.beer) return;
    S.beer.t -= dt;
    if (S.beer.t <= 0) { S.beer = null; say('The courage wears off.', 'BONE.0'); }
  }
  const dmgMult = () => (1 + (S.beer ? S.beer.dmg : 0)) * (1 + (S.stats.melee || 0));
  /* One number, two names: the HUD calls it WEIGHT, the beer calls it fat. */
  const addFat = (n) => { if (KD.Goal) KD.Goal.gain(S, n); S.fat = S.weight; };
  const burnFat = (n) => { if (KD.Goal) KD.Goal.burn(S, n); S.fat = S.weight; };

  /* ---- xp and skills ---- */
  const xpFor = (lvl) => Math.round(28 * Math.pow(lvl, 1.42));
  function addXp(n) {
    S.xp += n;
    let guard = 0;
    while (S.xp >= xpFor(S.level) && guard++ < 50) {
      S.xp -= xpFor(S.level);
      S.level++;
      S.points += 1 + (S.level % 5 === 0 ? 1 : 0);
      KD.Sfx.play('levelup');
      say('LEVEL ' + S.level + '  -  skill point earned', 'GOLD.3');
      KD.Fx.flash('GOLD.3', 0.18);
    }
  }
  /* The skill tree owns the canonical stat names; we do not shadow them with
     aliases. This only fills in floors for the ones the sim reads, and folds
     the tree's effect strings into the booleans the sim actually branches on. */
  function recalc() {
    const st = KD.Skills ? KD.Skills.derive(S.alloc) : {};
    const floors = {
      mineSpeed: 1, minePower: 0, oreLuck: 0, lightRadius: 0, breath: 0,
      meleeDmg: 1, critChance: 0, critDmg: 1, armour: 0, knockback: 1, lifesteal: 0,
      swimSpeed: 1, swingSpeed: 1, grappleLen: 0, mounts: 0, waterControl: 0,
      reach: 0, luck: 0, pressureDepth: 0, fallSafe: 0, xpGain: 1, effects: [],
      stamMax: 1, stamRegen: 1, hpBonus: 0, jumpMul: 1, moveMul: 1
    };
    for (const k in floors) if (st[k] === undefined) st[k] = floors[k];
    /* The tree reports ADDITIVE bonuses at 0 and MULTIPLIERS at 1. Reach is
       additive, so it needs the base 5 tiles added here or the player cannot
       reach the tile under their own feet. */
    st.reach = 5 + (st.reach || 0);
    const fx = st.effects || [];
    /* the disciplines and the weight fold in on top of the skill tree */
    if (KD.Goal) KD.Goal.apply(S, st);
    /* and what you have bought for your own body */
    if (KD.Body) KD.Body.apply(S, st);
    st.noFall = fx.indexOf('no_fall') >= 0;
    st.gills = fx.indexOf('gills') >= 0;
    st.xray = fx.indexOf('ore_xray') >= 0;
    S.stats = st;
    /* hearts bought with Grit take effect immediately */
    if (KD.Player) {
      KD.Player.P.hpMax = 6 + (st.hpBonus || 0);
      KD.Player.P.hp = Math.min(KD.Player.P.hp, KD.Player.P.hpMax);
    }
  }
  function takeSkill(id) {
    if (!KD.Skills) return false;
    if (!KD.Skills.canTake(S.alloc, id)) { KD.Sfx.play('deny'); return false; }
    const node = KD.Skills.byId[id];
    if (S.points < node.cost) { say('Not enough skill points.', 'BLOOD.2'); KD.Sfx.play('deny'); return false; }
    S.alloc[id] = (S.alloc[id] || 0) + 1;
    S.points -= node.cost;
    recalc();
    KD.Sfx.play('craft');
    return true;
  }

  /* ---- crafting ---- */
  function craft(shapeId) {
    if (!KD.Recipes) return null;
    const pick = KD.Recipes.resolve(shapeId, inventoryView());
    if (!pick || !pick.ok) {
      const need = pick && pick.missing.length
        ? pick.missing.map((m) => m.n + 'x ' + m.role).join(', ')
        : 'materials';
      say('Need ' + need + '.', 'BLOOD.2');
      KD.Sfx.play('deny');
      return null;
    }
    for (const need of pick.spend) take(need.id, need.n);
    const item = KD.Recipes.craft(shapeId, pick.mats, S.stats.luck || 0);
    const n = item.yield || item.n || 1;
    if (item.kind === 'place') {
      /* placeables are stackable, so register one resource per (shape, material)
         pair the first time it is made and hand out a stack of that */
      const tile = tileForPlaceable(item);
      if (tile) {
        const rid = 'pl_' + tile;
        if (!RES[rid]) {
          /* a generic block has no icon of its own - show the actual tile it
             places, which is both accurate and free */
          const T = KD.Tiles.byId[tile];
          const tileArt = T && T.art && KD.PX.has(T.art + '_mid') ? T.art + '_mid' : null;
          res(rid, item.name, item.shape === 'block' && tileArt ? tileArt : art(item.sprite, 'place'),
              { tile, stack: 99, value: item.value || 1 });
        }
        give(rid, n);
      } else { say('Cannot place that.', 'BLOOD.2'); }
    } else if (isGear(item)) {
      giveGear(stampUid(item));
    } else {
      /* a consumable: a beer, a potion, a loaf */
      const rid = 'cn_' + item.shape + '_' + (item.mats && item.mats.brew ? item.mats.brew : 'x');
      if (!RES[rid]) res(rid, item.name, art(item.sprite, 'res'),
                        { stack: 20, value: item.value || 1,
                          beer: item.shape.indexOf('beer') === 0 ? { dmg: 0.18 + item.tier * 0.14, fat: 4 + item.tier * 3, dur: 40 + item.tier * 12 } : null,
                          food: item.shape === 'bread' || item.shape === 'meal' ? 1 + item.tier : 0 });
      give(rid, n);
    }
    S.crafted++;
    const shape = KD.Recipes.byId[shapeId];
    addXp(shape && shape.xp ? shape.xp : 4);
    KD.Sfx.play('craft');
    say('Made ' + item.name, 'GOLD.2');
    return item;
  }
  /* a plain {id: count} view of the inventory, for the recipe resolver */
  function inventoryView() {
    const v = {};
    for (const s of S.inv) if (s && !isGear(s)) v[s.id] = (v[s.id] || 0) + s.n;
    return v;
  }

  /* ---- fragments, quests, death ---- */
  function giveFrag(n) {
    if (S.frags.includes(n)) return;
    S.frags.push(n);
    give('fragment', 1);
    KD.Fx.flash('GOLD.3', 0.4);
    KD.Sfx.play('victory');
    say('CROWN FRAGMENT ' + S.frags.length + '/5', 'GOLD.3');
    save();
  }
  const fragCount = () => S.frags.length;
  function die(from) {
    S.deaths++;
    KD.Sfx.play('die');
    KD.Game.go('death', { from: from || 'the deep' });
  }
  function say(t, col) { S.msg = t; S.msgT = 2.6; S.msgCol = col || 'BONE.2'; }
  function tick(dt) {
    S.playtime += dt;
    if (S.msgT > 0) S.msgT -= dt;
    tickBeer(dt);
  }

  /* ---- save ---- */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: 1, inv: S.inv, hot: S.hot, clams: S.clams, xp: S.xp, level: S.level,
        points: S.points, alloc: S.alloc, fat: S.fat, frags: S.frags, flags: S.flags,
        quests: S.quests, kills: S.kills, mined: S.mined, crafted: S.crafted, equip: S.equip,
        deaths: S.deaths, playtime: S.playtime, npcs: S.npcs, chests: S.chests,
        weight: S.weight, train: S.train, trainXp: S.trainXp, champs: S.champs, body: S.body,
        world: KD.World.save(), px: KD.Player.P.x, py: KD.Player.P.y
      }));
      return true;
    } catch (e) { return false; }
  }
  function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (!d || !d.world) return false;
      Object.assign(S, {
        inv: d.inv || new Array(SLOTS).fill(null), hot: d.hot || 0, clams: d.clams || 0,
        xp: d.xp || 0, level: d.level || 1, points: d.points || 0, alloc: d.alloc || {},
        fat: d.fat === undefined ? 24 : d.fat, frags: d.frags || [], flags: d.flags || {},
        quests: d.quests || {}, kills: d.kills || 0, mined: d.mined || 0,
        crafted: d.crafted || 0, deaths: d.deaths || 0, playtime: d.playtime || 0,
        npcs: d.npcs || [], chests: d.chests || {}, beer: null,
        equip: d.equip || { head: null, body: null, legs: null, shield: null },
        weight: d.weight === undefined ? 100 : d.weight,
        train: d.train || { strength: 0, wind: 0, grit: 0 },
        trainXp: d.trainXp || { strength: 0, wind: 0, grit: 0 },
        champs: d.champs || {}, body: d.body || {}
      });
      while (S.inv.length < SLOTS) S.inv.push(null);
      KD.World.loadFrom(d.world);
      KD.Light.init();
      KD.Water.init();
      KD.Render.flush();
      recalc();
      KD.Player.spawn(0, 0);
      KD.Player.P.x = d.px; KD.Player.P.y = d.py;
      return true;
    } catch (e) { return false; }
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function fresh() {
    S.inv = new Array(SLOTS).fill(null);
    S.hot = 0; S.clams = 0; S.xp = 0; S.level = 1; S.points = 0;
    S.alloc = {}; S.fat = 24; S.beer = null; S.frags = []; S.flags = {}; S.quests = {};
    S.kills = 0; S.mined = 0; S.crafted = 0; S.deaths = 0; S.playtime = 0;
    S.npcs = []; S.chests = {};
    S.equip = { head: null, body: null, legs: null, shield: null };
    S.weight = KD.Goal ? KD.Goal.START_WEIGHT : 100;
    S.fat = S.weight;
    S.train = { strength: 0, wind: 0, grit: 0 };
    S.trainXp = { strength: 0, wind: 0, grit: 0 };
    S.champs = {};
    recalc();
    /* you start with nothing but a stick and a bad hangover */
    give('torch', 6);
    give('plank_i', 20);
  }
  return { S, SLOTS, HOT, RES, buildResources, resOf, isGear, nameOf, spriteOf,
           count, give, giveGear, stampUid, take, takeSlot, hotbarItem, tool, weapon, useItem, art,
           equip, unequip, equipped, armourTotal, tileForPlaceable,
           drink, tickBeer, dmgMult, addFat, burnFat, xpFor, addXp, recalc, takeSkill, earn, spend,
           craft, inventoryView, giveFrag, fragCount, die, say, tick,
           save, load, hasSave, wipe, fresh,
           get stats() { return S.stats; }, get fat() { return S.fat; } };
})();
