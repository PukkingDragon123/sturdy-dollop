/* ============================================================
   state.js - the save file and the rules that touch it.
   ============================================================ */
KA.S = (function () {
  const U = KA.U;
  const KEY = 'kingofatlantic.save.v1';
  let D = null;

  function fresh() {
    const starter = KA.Pet.create('seahorse', 'Nibbles');
    return {
      ver: 1,
      clams: 40,
      hp: 5, hpUps: 0,
      fat: 34,
      beer: null,                 // {dmg, t, name}
      weapon: 'stool', tackle: 'stick',
      area: 'home', x: 360,
      pets: [starter], active: starter.uid,
      owned: { seahorse: true },
      frags: {},                  // id -> true
      kills: {}, killTotal: 0,
      quests: {},                 // id -> {have, done, claimed}
      inv: { fish: {}, food: { pellets: 3 }, beer: {} },
      stats: { caught: 0, races: 0, wins: 0, killed: 0, drank: 0, fed: 0, deaths: 0 },
      flags: { intro: false },
      seen: {}
    };
  }
  function init() { if (!load()) { D = fresh(); save(); } return D; }
  const data = () => D;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); return true; } catch (e) { return false; } }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const o = JSON.parse(raw);
      if (!o || o.ver !== 1 || !o.pets || !o.pets.length) return false;
      D = Object.assign(fresh(), o);
      D.inv = Object.assign({ fish: {}, food: {}, beer: {} }, o.inv || {});
      D.stats = Object.assign(fresh().stats, o.stats || {});
      return true;
    } catch (e) { return false; }
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} D = fresh(); save(); }

  /* ---- money ---- */
  function earn(n, quiet) {
    n = Math.round(n); D.clams += n;
    if (!quiet && n > 0) KA.UI.toast('+' + U.fmt(n) + ' clams', KA.PAL.gold);
    return n;
  }
  function spend(n) {
    n = Math.round(n);
    if (D.clams < n) { KA.UI.toast('Not enough clams', KA.PAL.coral); KA.A.play('deny'); return false; }
    D.clams -= n; return true;
  }

  /* ---- health & fat ---- */
  const hpMax = () => 5 + D.hpUps;
  function hurt(n) {
    D.hp = Math.max(0, D.hp - n);
    KA.A.play('hurt');
    KA.FX.shake(7); KA.FX.flash('#c9343f', 0.2); KA.FX.hitstop(0.06);
    return D.hp <= 0;
  }
  function heal(n) { D.hp = Math.min(hpMax(), D.hp + n); }
  function burnFat(n) { D.fat = U.clamp(D.fat - n, 0, 100); }
  function addFat(n) { D.fat = U.clamp(D.fat + n, 0, 100); }
  const fatPenalty = () => 1 - (D.fat / 100) * 0.34;      // move speed multiplier
  function drink(beerId) {
    const b = KA.Items.bById[beerId];
    if (!b) return false;
    if ((D.inv.beer[beerId] || 0) <= 0) return false;
    D.inv.beer[beerId]--;
    if (D.inv.beer[beerId] <= 0) delete D.inv.beer[beerId];
    D.beer = { dmg: b.dmg, t: b.dur, name: b.name, col: b.col };
    addFat(b.fat);
    D.stats.drank++;
    questTick('drink', { id: beerId });
    KA.A.play('gulp');
    setTimeout(() => KA.A.play('burp'), 320);
    KA.UI.toast(b.name + ': +' + Math.round(b.dmg * 100) + '% damage', b.col);
    return true;
  }
  function tickBeer(dt) {
    if (D.beer) { D.beer.t -= dt; if (D.beer.t <= 0) { D.beer = null; KA.UI.toast('The beer wears off.', KA.PAL.dim); } }
  }
  const dmgMult = () => 1 + (D.beer ? D.beer.dmg : 0);

  /* ---- gear ---- */
  const weapon = () => KA.Items.wById[D.weapon];
  const tackle = () => KA.Items.tById[D.tackle];

  /* ---- pets ---- */
  const pets = () => D.pets;
  function active() { return D.pets.find((p) => p.uid === D.active) || D.pets[0]; }
  function setActive(uid) { D.active = uid; }
  function addPet(p) { D.pets.push(p); D.owned[p.sp] = true; return p; }

  /* ---- inventory ---- */
  function addFish(id, n) {
    n = n || 1;
    D.inv.fish[id] = (D.inv.fish[id] || 0) + n;
    D.stats.caught += n;
    burnFat(1.5 * n);
    questTick('fish', { id, n });
    return D.inv.fish[id];
  }
  function takeFish(id, n) {
    n = n || 1;
    if ((D.inv.fish[id] || 0) < n) return false;
    D.inv.fish[id] -= n;
    if (D.inv.fish[id] <= 0) delete D.inv.fish[id];
    return true;
  }
  const fishCount = () => Object.values(D.inv.fish).reduce((a, b) => a + b, 0);
  function fishValue() {
    let t = 0;
    for (const k in D.inv.fish) t += (KA.Items.fishById[k] ? KA.Items.fishById[k].value : 0) * D.inv.fish[k];
    return t;
  }
  function sellAllFish() {
    let clams = 0, n = 0;
    for (const k in D.inv.fish) {
      const f = KA.Items.fishById[k];
      if (!f) continue;
      clams += f.value * D.inv.fish[k]; n += D.inv.fish[k];
    }
    D.inv.fish = {};
    if (clams) { earn(clams, true); KA.A.play('cash'); }
    return { clams, n };
  }
  function addItem(bucket, id, n) { D.inv[bucket][id] = (D.inv[bucket][id] || 0) + (n || 1); }
  function takeItem(bucket, id, n) {
    n = n || 1;
    if ((D.inv[bucket][id] || 0) < n) return false;
    D.inv[bucket][id] -= n;
    if (D.inv[bucket][id] <= 0) delete D.inv[bucket][id];
    return true;
  }

  /* ---- kills, quests, crown ---- */
  function killed(kind) {
    D.kills[kind] = (D.kills[kind] || 0) + 1;
    D.killTotal++;
    D.stats.killed++;
    burnFat(3);
    questTick('kill', { kind });
  }
  function questTick(kind, payload) {
    for (const id in KA.Quests.SIDE) {
      const q = KA.Quests.SIDE[id];
      const st = D.quests[id];
      if (!st || st.done) continue;
      const nd = q.need;
      if (kind === 'fish' && nd.fish === payload.id) st.have += payload.n;
      else if (kind === 'kill' && nd.kills && (!nd.kind || nd.kind === payload.kind)) st.have += 1;
      else if (kind === 'drink' && nd.drink === payload.id) st.have += 1;
      else continue;
      const target = nd.n || nd.kills || 1;
      if (st.have >= target) {
        st.done = true;
        KA.UI.toast('QUEST DONE: ' + q.name, KA.PAL.gold);
        KA.A.play('happy');
      }
    }
  }
  function startQuest(id) {
    if (!D.quests[id]) { D.quests[id] = { have: 0, done: false, claimed: false }; return true; }
    return false;
  }
  function claimQuest(id) {
    const q = KA.Quests.SIDE[id], st = D.quests[id];
    if (!q || !st || !st.done || st.claimed) return false;
    st.claimed = true;
    if (q.clams) earn(q.clams);
    if (q.tokens) { const p = active(); p.tokens = (p.tokens || 0) + q.tokens; KA.UI.toast('+' + q.tokens + ' roll token', KA.PAL.violet); }
    save();
    return true;
  }
  const fragCount = () => Object.keys(D.frags).length;
  function giveFrag(id, name) {
    if (D.frags[id]) return false;
    D.frags[id] = true;
    KA.UI.toast('CROWN FRAGMENT ' + fragCount() + '/5', KA.PAL.gold);
    KA.A.play('jackpot');
    KA.FX.flash('#ffc94a', 0.35);
    save();
    return true;
  }
  const won = () => fragCount() >= 5;

  return { init, data, save, load, wipe, fresh,
           earn, spend, hpMax, hurt, heal, burnFat, addFat, fatPenalty, drink, tickBeer, dmgMult,
           weapon, tackle, pets, active, setActive, addPet,
           addFish, takeFish, fishCount, fishValue, sellAllFish, addItem, takeItem,
           killed, questTick, startQuest, claimQuest, fragCount, giveFrag, won,
           get D() { return D; } };
})();
