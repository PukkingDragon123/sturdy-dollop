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
    clams: 0, xp: 0, level: 1,
    stats: {}, fat: 24, beer: null, weight: 100,
    flags: {}, act1: null,
    deaths: 0, playtime: 0,
    msg: null, msgT: 0, msgCol: 'BONE.2'
  };

  /* ---- the things a slot can hold ------------------------------------
     Act One still passes food and beer around a table, and the dealer
     still deals in clams, so the resource table survives - but the ores,
     the building blocks, the crop pods and the crafting materials went
     out with the mine they belonged to. --------------------------------- */
  const RES = {};
  function res(id, name, sprite, o) {
    RES[id] = Object.assign({ id, name, sprite, stack: 99, value: 1 }, o || {});
    return RES[id];
  }
  function buildResources() {
    res('bread', 'Kelp Loaf', 'it_bread', { value: 4, food: 2 });
    res('fish1', 'Sardine', 'it_fish1', { value: 6, food: 1 });
    res('fish2', 'Grouper', 'it_fish2', { value: 22, food: 2 });
    res('fish3', 'Golden Snapper', 'it_fish3', { value: 60, food: 3 });
    /* beers: the buff, and the belly */
    res('beer_lager', 'Reef Lager', 'it_beer_mug', { value: 12, beer: { dmg: 0.18, fat: 5, dur: 45 } });
    res('beer_stout', 'Trench Stout', 'it_beer_mug', { value: 34, beer: { dmg: 0.34, fat: 9, dur: 60 } });
    res('beer_royal', 'Royal Foam', 'it_beer_mug', { value: 90, beer: { dmg: 0.58, fat: 14, dur: 75 } });
    res('beer_keg', 'Her Own Brew', 'it_beer_keg', { value: 240, beer: { dmg: 1.0, fat: 22, dur: 90 } });
    res('crown', 'The Crown', 'it_crown', { stack: 1, value: 0, quest: true });
  }
  const resOf = (id) => RES[id] || null;

  /* the sprite an item is drawn with, falling back to something of the
     right shape when the art and the data disagree about a name */
  const SPRITE_ALIAS = {
    it_beer: 'it_beer_mug', it_meal: 'it_bread',
    it_beer1: 'it_beer_mug', it_beer2: 'it_beer_mug', it_beer3: 'it_beer_mug',
    it_beer4: 'it_beer_keg', it_brew: 'it_beer_mug'
  };
  function art(name, kind) {
    if (!name) return fallbackArt(kind);
    if (KD.PX.has(name)) return name;
    const a = SPRITE_ALIAS[name];
    if (a && KD.PX.has(a)) return a;
    return fallbackArt(kind);
  }
  function fallbackArt(kind) {
    const order = kind === 'armour' ? ['it_helm', 'it_bar'] : ['it_bread', 'it_bar'];
    for (const n of order) if (KD.PX.has(n)) return n;
    return KD.PX.names()[0];
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
  /* Act One still shows what he is wearing at the table */
  function equipped(slot) { return S.equip && S.equip[slot] ? S.equip[slot] : null; }

  function useItem(slot) {
    const r = resOf(slot.id);
    if (!r) return;
    if (r.beer) { drink(r); take(slot.id, 1); return; }
    if (r.food) { addFat(r.food * 1.5); take(slot.id, 1); KD.Sfx.play('pickup'); return; }
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
  /* One number, two names: the pause screen calls it WEIGHT, the beer
     calls it fat. Act One puts it on him; nothing takes it off. */
  const addFat = (n) => { S.weight = Math.max(80, S.weight + n); S.fat = S.weight; };
  const burnFat = (n) => { S.weight = Math.max(80, S.weight - n); S.fat = S.weight; };

  /* ---- xp and skills ---- */
  const xpFor = (lvl) => Math.round(28 * Math.pow(lvl, 1.42));
  function addXp(n) {
    S.xp += n;
    let guard = 0;
    while (S.xp >= xpFor(S.level) && guard++ < 50) {
      S.xp -= xpFor(S.level);
      S.level++;
      KD.Sfx.play('levelup');
      say('LEVEL ' + S.level, 'GOLD.3');
      KD.Fx.flash('GOLD.3', 0.18);
    }
  }
  /* There is no skill tree any more - the animal carries the stats now,
     and KD.Pod owns those. This is the floor the Act One scenes read. */
  function recalc() {
    S.stats = { meleeDmg: 1, armour: 0, luck: 0, xpGain: 1 };
  }

  function say(t, col) { S.msg = t; S.msgT = 2.6; S.msgCol = col || 'BONE.2'; }
  function tick(dt) {
    S.playtime += dt;
    /* the clock, and everything that hangs off it */
    if (KD.Day) KD.Day.tick(dt);
    if (S.msgT > 0) S.msgT -= dt;
    tickBeer(dt);
  }

  /* ---- save ------------------------------------------------------
     There is no world to serialise any more. What persists is the pod,
     the money, the standing on the card and where Act One got to. ---- */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: 2, inv: S.inv, hot: S.hot, clams: S.clams, xp: S.xp, level: S.level,
        fat: S.fat, weight: S.weight, flags: S.flags, equip: S.equip,
        deaths: S.deaths, playtime: S.playtime, act1: S.act1,
        day: S.day, energy: S.energy, energyMax: S.energyMax,
        pod: S.pod, active: S.active, foes: S.foes, beat: S.beat,
        market: S.market, record: S.record
      }));
      return true;
    } catch (e) { return false; }
  }
  function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (!d || !d.pod) return false;
      Object.assign(S, {
        inv: d.inv || new Array(SLOTS).fill(null), hot: d.hot || 0, clams: d.clams || 0,
        xp: d.xp || 0, level: d.level || 1,
        fat: d.fat === undefined ? 24 : d.fat, flags: d.flags || {},
        deaths: d.deaths || 0, playtime: d.playtime || 0, beer: null,
        equip: d.equip || { head: null, body: null, legs: null, shield: null },
        weight: d.weight === undefined ? 100 : d.weight, act1: d.act1 || null,
        day: d.day || null, energy: d.energy, energyMax: d.energyMax,
        pod: d.pod, active: d.active, foes: d.foes || {}, beat: d.beat || {},
        market: d.market || null, record: d.record || { w: 0, l: 0 }
      });
      while (S.inv.length < SLOTS) S.inv.push(null);
      if (KD.Day) KD.Day.init();
      if (KD.Pod) KD.Pod.init();
      recalc();
      return true;
    } catch (e) { return false; }
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function fresh() {
    S.inv = new Array(SLOTS).fill(null);
    S.hot = 0; S.clams = 0; S.xp = 0; S.level = 1;
    S.beer = null; S.flags = {};
    S.deaths = 0; S.playtime = 0;
    S.equip = { head: null, body: null, legs: null, shield: null };
    S.weight = 100; S.fat = S.weight;
    S.pod = null; S.active = null; S.foes = {}; S.beat = {};
    S.market = null; S.record = { w: 0, l: 0 };
    S.day = null; S.energy = undefined;
    recalc();
    if (KD.Day) KD.Day.init();
  }
  return { S, SLOTS, HOT, RES, buildResources, resOf, isGear, nameOf, spriteOf,
           count, give, giveGear, stampUid, take, takeSlot, useItem, art,
           equipped, drink, tickBeer, addFat, burnFat, xpFor, addXp, recalc,
           earn, spend, say, tick, save, load, hasSave, wipe, fresh,
           get stats() { return S.stats; }, get fat() { return S.fat; } };
})();
