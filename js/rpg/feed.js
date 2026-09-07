/* ============================================================
   rpg/feed.js - what an animal eats, and what it buys you.

   The stable used to run on one number: ENERGY, which was the
   handler's day. The animal itself was never hungry, never
   tired, and never had a reason to be standing in a barn.

   So the animal has two numbers of its own now, and everything
   outside the barn spends them:

     FED       what is in it. Feeding is the only way up, and it
               drops overnight. Nothing trains on an empty gut.
     STAMINA   what it has left today. The tracks and the gym
               both burn it, and sleeping is the only thing that
               puts it back.

   And that is the trade the whole day is built on: food is
   bought with clams, food becomes FED, FED becomes work, and
   work becomes an animal that can win on the card. The gym does
   not ask for money. It asks for breakfast.
   ============================================================ */
KD.Feed = (function () {

  /* ---- the larder -----------------------------------------------------
     Five things to eat, and they are not a straight ladder: the loaf is
     cheap bulk, the sardine is what everybody feeds, the grouper is a
     proper meal, and the snapper is what you give an animal the night
     before the Iron Gate. Squid is the chef's own, and it is the only
     one that puts anything back into the legs. */
  const FOOD = [
    { id: 'loaf',    name: 'Kelp Loaf',  spr: 'it_bread', price: 6,
      fed: 8,  sta: 0,
      note: 'Bulk. It fills a corner and nothing else.' },
    { id: 'sardine', name: 'Sardines',   spr: 'it_fish1', price: 14,
      fed: 16, sta: 0,
      note: 'What everybody in the quarry feeds.' },
    { id: 'eel',     name: 'Sand Eel',   spr: 'it_fish2', price: 30,
      fed: 26, sta: 4,
      note: 'Oily. They work harder on it.' },
    { id: 'squid',   name: 'Chef Squid', spr: 'it_squid', price: 58,
      fed: 30, sta: 14,
      note: 'His own. Nothing else puts that back in the legs.' },
    { id: 'snapper', name: 'Gold Snapper', spr: 'it_fish3', price: 120,
      fed: 44, sta: 20,
      note: 'You feed this the night before the Iron Gate.' }
  ];
  const BY_ID = {};
  for (const f of FOOD) BY_ID[f.id] = f;

  /* ---- the basket -----------------------------------------------------
     One basket for the whole barn, kept on the save. It is a bag of
     counts and nothing more - the barn draws it, the chef fills it. */
  const basket = () => {
    const S = KD.State.S;
    return S.basket || (S.basket = { loaf: 2, sardine: 3 });
  };
  const count = (id) => (basket()[id] || 0);
  const total = () => FOOD.reduce((a, f) => a + count(f.id), 0);
  function give(id, n) {
    const b = basket();
    b[id] = (b[id] || 0) + (n || 1);
    return b[id];
  }
  function take(id, n) {
    const b = basket();
    n = n || 1;
    if ((b[id] || 0) < n) return false;
    b[id] -= n;
    if (b[id] <= 0) delete b[id];
    return true;
  }
  /* what is actually in the basket, in table order, for drawing */
  function rows() {
    const out = [];
    for (const f of FOOD) { const n = count(f.id); if (n > 0) out.push({ f: f, n: n }); }
    return out;
  }

  /* ---- the animal's own two numbers ----------------------------------
     Held on the dolphin so every animal in the barn is hungry on its
     own schedule, and defaulted on read so a save from before the barn
     existed still opens. */
  const FED_MAX = 100;
  function fed(d) {
    if (!d) return 0;
    if (d.fed === undefined) d.fed = 45;
    return d.fed;
  }
  function staMax(d) {
    /* a fitter animal has a longer working day, so STAMINA the stat and
       stamina the resource are the same idea at two time scales */
    return Math.round(60 + (d && d.sta ? d.sta : 10) * 1.1);
  }
  function stam(d) {
    if (!d) return 0;
    if (d.stam === undefined) d.stam = staMax(d);
    return Math.min(d.stam, staMax(d));
  }

  /* how well an animal is doing, as one word - the barn says this
     instead of drawing a number */
  function mood(d) {
    const f = fed(d) / FED_MAX;
    if (f > 0.85) return { word: 'FULL', col: 'KELP.3' };
    if (f > 0.55) return { word: 'FED', col: 'KELP.2' };
    if (f > 0.28) return { word: 'PECKISH', col: 'GOLD.2' };
    if (f > 0.08) return { word: 'HUNGRY', col: 'BLOOD.3' };
    return { word: 'STARVING', col: 'BLOOD.2' };
  }

  /* ---- eating ---------------------------------------------------------
     Returns what happened, so the barn can say it without knowing the
     rules. An animal that is already full will not take it, which is
     the only thing stopping a basket of loaves from being a stat farm. */
  function eat(d, id) {
    const f = BY_ID[id];
    if (!d || !f) return null;
    if (fed(d) >= FED_MAX - 2) return { full: true, food: f };
    if (!take(id, 1)) return null;
    const before = fed(d);
    d.fed = Math.min(FED_MAX, before + f.fed);
    if (f.sta) d.stam = Math.min(staMax(d), stam(d) + f.sta);
    /* a well-fed animal warms to whoever is holding the bucket */
    if (KD.Pod && KD.Pod.bondUp) KD.Pod.bondUp(d, 1);
    d.xp = (d.xp || 0) + 2;
    KD.State.save();
    return { food: f, gained: d.fed - before, full: false };
  }

  /* ---- spending it ----------------------------------------------------
     The one call the tracks and the gym make. Work costs FED and
     STAMINA together; if either is short it says which, and the scene
     that asked can put that on screen instead of a red X. */
  function canWork(d, need) {
    if (!d) return { ok: false, why: 'Nobody is up.' };
    if (!KD.Pod.fit(d)) return { ok: false, why: d.name + ' is still mending.' };
    if (fed(d) < need.fed) {
      return { ok: false, why: d.name + ' is too hungry to work. Feed it.' };
    }
    if (stam(d) < need.stam) {
      return { ok: false, why: d.name + ' has nothing left today. Sleep on it.' };
    }
    return { ok: true };
  }
  function work(d, need) {
    d.fed = Math.max(0, fed(d) - need.fed);
    d.stam = Math.max(0, stam(d) - need.stam);
    KD.State.save();
  }

  /* ---- the night ------------------------------------------------------
     Called by the day roll. Stamina comes all the way back; FED does
     not, because an animal you fed on Tuesday is not fed on Wednesday
     and that is the entire reason to keep buying fish. */
  function newDay() {
    for (const d of KD.Pod.pod()) {
      d.stam = staMax(d);
      d.fed = Math.max(0, fed(d) - 26);
      /* an animal left starving overnight loses condition rather than
         health - it is slower to train, not closer to dying */
      if (d.fed <= 0 && (d.bond || 0) > 0) d.bond = Math.max(0, d.bond - 3);
    }
  }

  return { FOOD, BY_ID, FED_MAX,
           basket, count, total, give, take, rows,
           fed, stam, staMax, mood, eat, canWork, work, newDay };
})();
