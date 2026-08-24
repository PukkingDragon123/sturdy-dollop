/* ============================================================
   pet.js - mount model: exp, levels, rolled stats, traits.
   ============================================================ */
KA.Pet = (function () {
  const U = KA.U;
  const KEYS = ['spd', 'sta', 'pwr', 'gra', 'lck'];
  const LABEL = { spd: 'SPD', sta: 'STA', pwr: 'PWR', gra: 'GRA', lck: 'LCK' };

  function create(speciesId, name) {
    const sp = KA.Pets.byId[speciesId];
    const p = {
      uid: U.uid('p'), sp: speciesId,
      name: name || U.pick(KA.Pets.NAMES),
      exp: 0, rolled: { spd: 0, sta: 0, pwr: 0, gra: 0, lck: 0 },
      traits: [], fed: 0, wins: 0, races: 0, mood: 0.75, tokens: 0
    };
    if (U.chance(0.35)) { const t = KA.Pets.randTrait([]); if (t) p.traits.push(t); }
    return p;
  }
  const need = (lvl) => Math.floor(42 * Math.pow(lvl, 1.52));
  function level(p) {
    let l = 1, pool = p.exp, n = need(1);
    while (pool >= n && l < 60) { pool -= n; l++; n = need(l); }
    return l;
  }
  function progress(p) {
    let l = 1, pool = p.exp, n = need(1);
    while (pool >= n && l < 60) { pool -= n; l++; n = need(l); }
    return { lvl: l, cur: pool, need: n, frac: pool / n };
  }
  function addExp(p, amt) {
    const before = level(p);
    p.exp += Math.max(0, Math.round(amt));
    const after = level(p);
    let tok = 0;
    for (let l = before + 1; l <= after; l++) tok += 1 + (l % 4 === 0 ? 1 : 0);
    if (tok) p.tokens = (p.tokens || 0) + tok;
    return { levels: after - before, tokens: tok, level: after };
  }
  function stats(p) {
    const sp = KA.Pets.byId[p.sp];
    const lvl = level(p);
    const out = {};
    KEYS.forEach((k) => { out[k] = sp.base[k] + (p.rolled[k] || 0) + Math.floor((lvl - 1) * 0.6); });
    for (const t of p.traits) {
      const T = KA.Pets.TRAITS[t];
      if (T) for (const k in T.mods) out[k] = (out[k] || 0) + T.mods[k];
    }
    KEYS.forEach((k) => (out[k] = Math.max(1, Math.round(out[k]))));
    return out;
  }
  function power(p) {
    const s = stats(p);
    return s.spd * 1.3 + s.sta * 0.8 + s.pwr * 0.75 + s.gra * 0.5 + s.lck * 0.3;
  }
  function feed(p, exp, fav) {
    let e = exp * (fav ? 1.5 : 1);
    const r = addExp(p, e);
    p.fed++;
    p.mood = U.clamp(p.mood + 0.12, 0, 1);
    let trait = null;
    if (U.chance(0.05) && p.traits.length < 3) {
      const t = KA.Pets.randTrait(p.traits);
      if (t) { p.traits.push(t); trait = t; }
    }
    return { exp: Math.round(e), levels: r.levels, tokens: r.tokens, level: r.level, trait };
  }
  function applyRoll(p, cat, amount, giveTrait) {
    p.rolled[cat] = (p.rolled[cat] || 0) + amount;
    let trait = null;
    if (giveTrait && p.traits.length < 4) {
      const t = KA.Pets.randTrait(p.traits);
      if (t) { p.traits.push(t); trait = t; }
    }
    return trait;
  }
  /* where a rider sits, in rig-local px at scale 1: ride.top is a fraction of the
     mount's own body length (44 * size), so every species lands on its own back. */
  const rideY = (p) => { const sp = KA.Pets.byId[p.sp]; return -44 * sp.size * sp.ride.top; };
  return { KEYS, LABEL, create, level, progress, addExp, stats, power, feed, applyRoll, need, rideY };
})();
