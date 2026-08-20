/* ============================================================
   state.js - the save file: clams, roster, inventory, ranch,
   quests, plus the "next day" simulation.
   ============================================================ */
DZ.State = (function () {
  const U = DZ.Util;
  const KEY = 'dolphinranch.save.v1';
  let S = null;
  const toasts = [];

  function fresh() {
    const starter = DZ.Dolphin.create({ name: DZ.Names.randDolphin(), skin: 0, traits: ['moist'] });
    starter.note = 'Your first dolphin. Be nice.';
    return {
      version: 1,
      day: 1,
      clams: 140,
      dolphins: [starter],
      selected: starter.id,
      rivals: DZ.Races.makeStable(8),
      staff: [],
      ranch: { pens: 0, trough: 0, reef: 0, lagoon: 0, stall: 0, vat: 0, bunk: 0, sonar: 0, spa: 0 },
      gear: { spear: 0, net: 0, fins: 0, tank: 0, bag: 0 },
      inv: { fish: {}, food: { pellet: 6 }, use: {} },
      buffs: {},
      quests: [],
      pending: null,          // breeding in progress
      vatDolphin: null,       // dolphin currently marinating in evil
      marketMult: 1,
      unlockedZone: 0,
      totals: { caught: 0, sold: 0, clamsEarned: 0, races: 0, wins: 0, betWon: 0, bestCombo: 0, sharkPunches: 0, bred: 0, evil: 0 },
      seen: {},
      log: [],
      tutorial: 0
    };
  }

  function init() {
    if (!load()) {
      S = fresh();
      DZ.Quests.refresh(S);
      save();
    }
    return S;
  }
  function data() { return S; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const o = JSON.parse(raw);
      if (!o || o.version !== 1 || !o.dolphins || !o.dolphins.length) return false;
      S = Object.assign(fresh(), o);
      S.ranch = Object.assign({ pens: 0, trough: 0, reef: 0, lagoon: 0, stall: 0, vat: 0, bunk: 0, sonar: 0, spa: 0 }, o.ranch || {});
      S.gear = Object.assign({ spear: 0, net: 0, fins: 0, tank: 0, bag: 0 }, o.gear || {});
      S.inv = Object.assign({ fish: {}, food: {}, use: {} }, o.inv || {});
      if (!S.rivals || !S.rivals.length) S.rivals = DZ.Races.makeStable(8);
      DZ.Quests.refresh(S);
      return true;
    } catch (e) { return false; }
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} S = fresh(); DZ.Quests.refresh(S); save(); }

  /* ---------------- money & inventory ---------------- */
  function clams() { return S.clams; }
  function earn(n, silent) {
    n = Math.round(n);
    S.clams += n; S.totals.clamsEarned += Math.max(0, n);
    if (!silent && n > 0) toast('+' + U.fmt(n) + ' clams', DZ.PAL.gold);
    return n;
  }
  function spend(n) {
    n = Math.round(n);
    if (S.clams < n) { toast('Not enough clams!', DZ.PAL.coral); DZ.Audio.play('deny'); return false; }
    S.clams -= n;
    return true;
  }

  function addFish(id, live, n) {
    n = n || 1;
    const e = S.inv.fish[id] || (S.inv.fish[id] = { n: 0, live: 0 });
    e.n += n;
    if (live) e.live += n;
    S.totals.caught += n;
    S.seen[id] = true;
    event('catch', { species: id, n });
    return e;
  }
  function fishTotal() {
    let t = 0;
    for (const k in S.inv.fish) t += S.inv.fish[k].n;
    return t;
  }
  function fishValue() {
    let t = 0;
    for (const k in S.inv.fish) {
      const sp = DZ.Species.get(k); if (!sp) continue;
      const e = S.inv.fish[k];
      t += sellPrice(sp, false) * (e.n - e.live) + sellPrice(sp, true) * e.live;
    }
    return Math.round(t);
  }
  function sellPrice(sp, live) {
    let m = DZ.Upgrades.value(S, 'stall') * S.marketMult;
    const shady = staffOf('shady');
    if (shady) m *= 1 + (0.15 + shady.lvl * 0.10);
    return Math.max(1, Math.round(sp.value * m * (live ? 1.6 : 1)));
  }
  function takeFish(id, live, n) {
    const e = S.inv.fish[id];
    if (!e) return 0;
    n = Math.min(n === undefined ? 1 : n, live ? e.live : e.n - e.live);
    if (n <= 0) return 0;
    e.n -= n;
    if (live) e.live -= n;
    if (e.n <= 0) delete S.inv.fish[id];
    return n;
  }
  function sellFish(id, live, n) {
    const sp = DZ.Species.get(id);
    const got = takeFish(id, live, n);
    if (!got) return 0;
    const gain = sellPrice(sp, live) * got;
    earn(gain, true);
    S.totals.sold += got;
    event('sell', { clams: gain });
    return gain;
  }
  function sellAll(filter) {
    let total = 0, count = 0;
    for (const k of Object.keys(S.inv.fish)) {
      const sp = DZ.Species.get(k); if (!sp) continue;
      if (filter && !filter(sp)) continue;
      const e = S.inv.fish[k];
      const dead = e.n - e.live;
      if (dead > 0) { total += sellFish(k, false, dead); count += dead; }
      const live = (S.inv.fish[k] || {}).live || 0;
      if (live > 0) { total += sellFish(k, true, live); count += live; }
    }
    return { clams: total, count };
  }

  function addFood(id, n) { S.inv.food[id] = (S.inv.food[id] || 0) + (n || 1); }
  function takeFood(id, n) {
    n = n || 1;
    if ((S.inv.food[id] || 0) < n) return false;
    S.inv.food[id] -= n;
    if (S.inv.food[id] <= 0) delete S.inv.food[id];
    return true;
  }
  function foodCount() { let t = 0; for (const k in S.inv.food) t += S.inv.food[k]; return t; }
  function addUse(id, n) { S.inv.use[id] = (S.inv.use[id] || 0) + (n || 1); }

  /* ---------------- roster ---------------- */
  function maxDolphins() { return DZ.Upgrades.value(S, 'pens'); }
  function roster() { return S.dolphins; }
  function selected() {
    return S.dolphins.find((d) => d.id === S.selected) || S.dolphins[0];
  }
  function select(id) { S.selected = id; }
  function addDolphin(d) {
    if (S.dolphins.length >= maxDolphins()) { toast('Pens are full! Upgrade the lagoon.', DZ.PAL.coral); return false; }
    S.dolphins.push(d);
    return true;
  }
  function releaseDolphin(id) {
    if (S.dolphins.length <= 1) { toast('You cannot release your last dolphin.', DZ.PAL.coral); return false; }
    const i = S.dolphins.findIndex((d) => d.id === id);
    if (i < 0) return false;
    const d = S.dolphins[i];
    S.dolphins.splice(i, 1);
    if (S.selected === id) S.selected = S.dolphins[0].id;
    toast(d.name + ' swam off into the sunset.', DZ.PAL.dim);
    return true;
  }
  function staffOf(role) {
    return S.staff.find((s) => s.role === role);
  }
  function staffCap() { return DZ.Upgrades.value(S, 'bunk'); }

  /* ---------------- quests / events ---------------- */
  function event(kind, payload) {
    payload = payload || {};
    if (kind === 'race_win') { S.totals.wins++; }
    if (kind === 'combo') S.totals.bestCombo = Math.max(S.totals.bestCombo, payload.combo || 0);
    if (kind === 'shark') S.totals.sharkPunches++;
    if (kind === 'breed') S.totals.bred++;
    if (kind === 'evil') S.totals.evil++;
    DZ.Quests.progress(S, kind, payload);
  }
  function claimQuest(q) {
    if (!q.done || q.claimed) return false;
    q.claimed = true;
    earn(q.clams);
    if (q.sp) {
      const d = selected();
      if (d) { d.sp += q.sp; toast('+' + q.sp + ' skill point for ' + d.name, DZ.PAL.cyan); }
    }
    S.quests = S.quests.filter((x) => !x.claimed);
    DZ.Quests.refresh(S);
    DZ.Audio.play('cash');
    return true;
  }

  function toast(text, col) {
    toasts.push({ text, col: col || DZ.PAL.text, t: 3.2, y: 0 });
    if (toasts.length > 5) toasts.shift();
    S.log.push(text);
    if (S.log.length > 40) S.log.shift();
  }
  function updateToasts(dt) {
    for (let i = toasts.length - 1; i >= 0; i--) {
      toasts[i].t -= dt;
      toasts[i].y = U.damp(toasts[i].y, i * 11, 0.001, dt);
      if (toasts[i].t <= 0) toasts.splice(i, 1);
    }
  }
  function drawToasts(ctx) {
    for (let i = 0; i < toasts.length; i++) {
      const t = toasts[i];
      const a = U.clamp(t.t / 0.6, 0, 1);
      const w = DZ.Text.width(t.text, 7) + 10;
      const x = DZ.W - w - 4, y = 26 + t.y;
      ctx.globalAlpha = a * 0.9;
      DZ.Pixel.rect(ctx, x, y, w, 11, '#041420');
      DZ.Pixel.frame(ctx, x, y, w, 11, t.col);
      ctx.globalAlpha = 1;
      DZ.Text.draw(ctx, t.text, x + 5, y + 2, t.col, { size: 7, alpha: a });
    }
  }

  /* ---------------- the day cycle ---------------- */
  function nextDay() {
    const rep = [];
    S.day++;
    // ----- wages -----
    let wage = 0;
    for (const st of S.staff) wage += st.wage;
    if (wage > 0) {
      if (S.clams >= wage) { S.clams -= wage; rep.push({ t: 'Paid ' + U.fmt(wage) + ' clams in wages.', c: DZ.PAL.dim }); }
      else {
        const quitter = S.staff.pop();
        rep.push({ t: quitter.name + ' quit! (unpaid wages, rude of you)', c: DZ.PAL.coral });
        S.clams = 0;
      }
    }
    // ----- auto trough -----
    const troughN = DZ.Upgrades.value(S, 'trough');
    if (troughN > 0) {
      let fed = 0;
      for (const d of S.dolphins) {
        if (fed >= troughN) break;
        const cheap = DZ.Items.FOOD.find((f) => (S.inv.food[f.id] || 0) > 0 && !f.corrupt);
        if (!cheap) break;
        takeFood(cheap.id);
        DZ.Dolphin.feed(d, Object.assign({}, cheap, { fishExp: 0 }), S);
        fed++;
      }
      if (fed) rep.push({ t: 'Auto-Trough fed ' + fed + ' dolphin' + (fed > 1 ? 's' : '') + '.', c: DZ.PAL.kelp });
      else if (troughN) rep.push({ t: 'Auto-Trough is empty. Buy food!', c: DZ.PAL.coral });
    }
    // ----- training reef -----
    const reefExp = DZ.Upgrades.value(S, 'reef');
    if (reefExp > 0) {
      for (const d of S.dolphins) DZ.Dolphin.addExp(d, reefExp, S);
      rep.push({ t: 'Training Reef: +' + reefExp + ' EXP to every dolphin.', c: DZ.PAL.cyan });
    }
    // ----- staff work -----
    for (const st of S.staff) {
      if (st.role === 'fisher') {
        const n = 2 + st.lvl * 2;
        const zone = U.rndInt(0, S.unlockedZone);
        let got = 0;
        for (let i = 0; i < n; i++) {
          const sp = DZ.Species.rollFor(zone, DZ.Upgrades.value(S, 'sonar'));
          addFish(sp.id, U.chance(0.3), 1); got++;
        }
        rep.push({ t: st.name + ' hauled in ' + got + ' fish.', c: DZ.PAL.kelp });
      } else if (st.role === 'trainer') {
        const e = 14 + st.lvl * 10;
        for (const d of S.dolphins) DZ.Dolphin.addExp(d, e, S);
        rep.push({ t: st.name + ' drilled the squad: +' + e + ' EXP each.', c: DZ.PAL.cyan });
      } else if (st.role === 'groomer') {
        for (const d of S.dolphins) d.groom = (d.groom || 0) + 1 + st.lvl;
        rep.push({ t: st.name + ' buffed everyone to a shine (+CHM).', c: DZ.PAL.pink });
      } else if (st.role === 'vet') {
        for (const d of S.dolphins) { d.mood = U.clamp(d.mood + 0.3, 0, 1); d.hunger = 0; }
        rep.push({ t: st.name + ' kept the pod healthy.', c: DZ.PAL.kelp });
      } else if (st.role === 'shady' && U.chance(0.4)) {
        addFish('cursed', false, 1);
        rep.push({ t: st.name + ' left a cursed eel in your bucket. No explanation.', c: DZ.PAL.evil });
      }
    }
    // ----- hunger / mood -----
    for (const d of S.dolphins) {
      if (d.fedToday === 0) {
        d.hunger = (d.hunger || 0) + 1;
        d.mood = U.clamp(d.mood - 0.18, 0, 1);
      }
      d.fedToday = 0;
      if (d.hunger > 2) d.mood = U.clamp(d.mood - 0.1, 0, 1);
    }
    const hungry = S.dolphins.filter((d) => d.hunger > 1);
    if (hungry.length) rep.push({ t: hungry.length + ' dolphin(s) are hungry and sulking.', c: DZ.PAL.coral });

    // ----- vat corruption -----
    if (S.vatDolphin) {
      const d = S.dolphins.find((x) => x.id === S.vatDolphin);
      if (d && !d.evil) {
        const rate = 18 * (DZ.Upgrades.value(S, 'vat') >= 2 ? 1.35 : 1);
        if (DZ.Dolphin.corrupt(d, rate, S)) {
          rep.push({ t: d.name + ' HAS EMERGED FROM THE VAT. Wearing a tiny hat.', c: DZ.PAL.evil });
          S.vatDolphin = null;
          DZ.Audio.play('evil');
        } else rep.push({ t: d.name + ' marinates in the Vat (' + Math.round(d.corrupt) + '% evil).', c: DZ.PAL.evil });
      } else S.vatDolphin = null;
    }
    // ----- breeding -----
    if (S.pending) {
      const a = S.dolphins.find((d) => d.id === S.pending.a);
      const b = S.dolphins.find((d) => d.id === S.pending.b);
      if (a && b) {
        const lag = DZ.Upgrades.value(S, 'lagoon');
        const n = (lag >= 4 && U.chance(0.25)) ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const calf = DZ.Dolphin.breed(a, b, lag, S.day);
          if (addDolphin(calf)) {
            rep.push({ t: 'A calf was born: ' + calf.name + '! (' + calf.skinName + ')', c: DZ.PAL.pink });
            event('breed', {});
          } else rep.push({ t: 'A calf had nowhere to live and went to live with its aunt.', c: DZ.PAL.coral });
        }
      }
      S.pending = null;
    }
    // ----- market drift -----
    S.marketMult = U.clamp(S.marketMult * U.rnd(0.86, 1.16) + U.rnd(-0.05, 0.05), 0.65, 1.55);
    rep.push({ t: 'Fish market: x' + S.marketMult.toFixed(2) + ' today.', c: S.marketMult >= 1 ? DZ.PAL.gold : DZ.PAL.dim });

    DZ.Races.trainStable(S);
    DZ.Quests.refresh(S);
    S.buffs = {};
    rep.push({ t: U.pick(DZ.Names.events), c: DZ.PAL.dim });
    save();
    return rep;
  }

  return { init, data, save, load, wipe, fresh,
           clams, earn, spend,
           addFish, fishTotal, fishValue, sellPrice, sellFish, sellAll, takeFish,
           addFood, takeFood, foodCount, addUse,
           roster, selected, select, addDolphin, releaseDolphin, maxDolphins, staffOf, staffCap,
           event, claimQuest, toast, updateToasts, drawToasts, nextDay,
           get S() { return S; } };
})();
