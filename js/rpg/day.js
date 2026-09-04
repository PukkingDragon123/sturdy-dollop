/* ============================================================
   rpg/day.js - the loop the game did not have.

   Before this, the ocean had no shape to it. You could swim
   east for as long as you liked, dig for as long as you liked,
   and nothing ever asked you to stop, come back, or decide what
   today was for. That is why it read as a big cave with fish in
   it rather than as a game: there was no unit of play smaller
   than "the whole story".

   A DAY is that unit now.

     - it starts at six in the morning in the cove and ends when
       you get into bed, or at two the following morning when
       you fall over wherever you are standing.
     - ENERGY is the real budget. Every swing of the pick and
       every swing of the trident spends some. It comes back
       when you sleep, and only when you sleep - so how far east
       you dare go is a decision, not a formality.
     - what you leave in the SHIPPING BIN is sold overnight and
       the clams are on the table in the morning.
     - what you PLANTED grows one day older every night, and a
       ripe row is worth several times its seed.

   Everything lives in the save under S.day, so a reload puts
   you back at the same hour of the same morning.
   ============================================================ */
KD.Day = (function () {
  const S = () => KD.State.S;

  const START = 6 * 60;          // 06:00, when you wake up
  const LATE  = 24 * 60;         // midnight - the screen starts to go
  const OUT   = 26 * 60;         // 02:00 - you pass out where you stand
  /* twelve real seconds an hour, so a full day is four minutes. Long
     enough to plan, short enough that a wasted one does not sting. */
  const SEC_PER_HOUR = 12;

  const SEASONS = ['Spring Tide', 'High Sun', 'Turning', 'Long Dark'];
  const DAYS_PER_SEASON = 14;

  /* ---- the crops ---------------------------------------------------
     Three, and they are deliberately different SHAPES of decision:
     kelp is fast and cheap and always worth planting; pearl vine is
     slow and worth more than everything else you will do that week;
     glowpods pay badly but light the plot, which is the only way to
     work it after dark. */
  const CROPS = {
    kelp:  { name: 'Kelp',       days: 2, seed: 'seed_kelp',  crop: 'crop_kelp',  art: 'fm_kelp',  cost: 10, sell: 14 },
    pearl: { name: 'Pearl Vine', days: 5, seed: 'seed_pearl', crop: 'crop_pearl', art: 'fm_pearl', cost: 45, sell: 130 },
    glow:  { name: 'Glowpod',    days: 3, seed: 'seed_glow',  crop: 'crop_glow',  art: 'fm_glow',  cost: 24, sell: 40 }
  };
  const SEED_OF = {};
  for (const k in CROPS) SEED_OF[CROPS[k].seed] = k;

  /* ---- state -------------------------------------------------------
     Held on the save object rather than in a closure, so it survives a
     reload and so the HUD can read it without asking. */
  function init() {
    const s = S();
    if (!s.day) s.day = { n: 1, t: START, slept: 0, shipped: 0, lastPay: 0 };
    if (s.energy === undefined) s.energy = 120;
    if (!s.crops) s.crops = {};
    if (!s.bin) s.bin = [];
    if (s.energyMax === undefined) s.energyMax = 120;
  }

  const day = () => (S().day || { n: 1, t: START }).n;
  const clock = () => (S().day || { t: START }).t;
  const season = () => SEASONS[Math.floor((day() - 1) / DAYS_PER_SEASON) % SEASONS.length];
  const dayOfSeason = () => ((day() - 1) % DAYS_PER_SEASON) + 1;
  /* 0 at six in the morning, 1 at two the next - what the light reads */
  const through = () => Math.max(0, Math.min(1, (clock() - START) / (OUT - START)));
  const late = () => clock() >= LATE;

  function hhmm() {
    const t = clock() % (24 * 60);
    const h = Math.floor(t / 60), m = Math.floor(t % 60 / 10) * 10;
    const ap = h >= 12 && h < 24 ? 'pm' : 'am';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ap;
  }

  /* ---- the clock ---------------------------------------------------- */
  function tick(dt) {
    init();
    const s = S();
    s.day.t += dt * (60 / SEC_PER_HOUR);
    if (s.day.t >= OUT) collapse();
  }

  /* ---- energy -------------------------------------------------------
     spend() returns false when there is nothing left, and the caller is
     expected to give up rather than to carry on for free. Being empty is
     not a fail state, it is a slow one: you can still swim home. */
  function spend(n) {
    init();
    const s = S();
    if (s.energy <= 0) return false;
    s.energy = Math.max(0, s.energy - n);
    if (s.energy === 0) KD.State.say('You have nothing left. Get to bed.', 'BLOOD.2');
    return true;
  }
  const energy = () => S().energy || 0;
  const energyMax = () => S().energyMax || 120;
  const spent = () => energy() <= 0;

  /* ---- the bin -------------------------------------------------------
     You put things in; they are gone until morning. That delay is the
     whole point: it is what makes you decide what to keep. */
  function ship(id, n) {
    init();
    const s = S();
    const r = KD.State.resOf(id);
    if (!r) return 0;
    const took = KD.State.take(id, n) ? n : 0;
    if (!took) return 0;
    const row = s.bin.find((b) => b.id === id);
    if (row) row.n += took; else s.bin.push({ id: id, n: took });
    KD.Sfx.play('pickup');
    return took;
  }
  function binValue() {
    init();
    let v = 0;
    for (const b of S().bin) {
      const r = KD.State.resOf(b.id);
      v += (r ? (r.value || 1) : 1) * b.n;
    }
    return v;
  }
  const binCount = () => S().bin.reduce((a, b) => a + b.n, 0);

  /* ---- the plot ------------------------------------------------------ */
  const key = (tx, ty) => tx + ',' + ty;
  const cropAt = (tx, ty) => (S().crops || {})[key(tx, ty)] || null;
  const inPlot = (tx, ty) => {
    const h = KD.Gen && KD.Gen.meta && KD.Gen.meta.home;
    if (!h) return false;
    return tx >= h.plot.x0 - 1 && tx <= h.plot.x1 + 1 &&
           ty >= h.plot.y - 1 && ty <= h.plot.y + 2;
  };

  function plant(tx, ty, kind) {
    init();
    const C = CROPS[kind];
    if (!C) return false;
    if (cropAt(tx, ty)) return false;
    S().crops[key(tx, ty)] = { k: kind, a: 0 };
    KD.Sfx.play('place');
    return true;
  }
  /* 0..3: seed, shoot, grown, ripe */
  function stage(c) {
    const C = CROPS[c.k];
    if (!C) return 0;
    if (c.a >= C.days) return 3;
    if (c.a <= 0) return 0;
    return c.a >= C.days - 1 ? 2 : 1;
  }
  const ripe = (c) => stage(c) === 3;

  function harvest(tx, ty) {
    init();
    const c = cropAt(tx, ty);
    if (!c || !ripe(c)) return false;
    const C = CROPS[c.k];
    delete S().crops[key(tx, ty)];
    KD.State.give(C.crop, 1 + (Math.random() < 0.22 ? 1 : 0));
    KD.State.addXp(6);
    KD.Sfx.play('pickup');
    return true;
  }

  /* ---- the night ------------------------------------------------------ */
  function sleep(where) {
    init();
    const s = S();
    /* 1. sell the bin */
    const pay = binValue();
    s.bin.length = 0;
    if (pay > 0) KD.State.earn(pay);
    s.day.lastPay = pay;
    /* 2. everything in the ground gets a day older */
    let grew = 0;
    for (const k in s.crops) {
      const c = s.crops[k];
      const C = CROPS[c.k];
      if (!C || c.a >= C.days) continue;
      c.a++; grew++;
    }
    /* 3. and it is tomorrow */
    s.day.n++;
    s.day.t = START;
    s.day.slept = where === 'bed' ? 1 : 0;
    /* Passing out in the sand costs you: half a night's rest and some of
       what you were carrying "washes away". A bed is worth going home for. */
    s.energy = where === 'bed' ? energyMax() : Math.round(energyMax() * 0.55);
    KD.State.tickBeer && KD.State.tickBeer(0);
    KD.State.save();
    return { pay: pay, grew: grew, bed: where === 'bed' };
  }

  function collapse() {
    const r = sleep('sand');
    KD.State.say('You passed out at two in the morning. ' +
                 (r.pay ? 'The bin paid ' + r.pay + 'c.' : 'The bin was empty.'), 'BLOOD.2');
    KD.Fx.flash && KD.Fx.flash('INK.0', 0.6);
  }

  return { init, tick, CROPS, SEED_OF, SEASONS,
           day, clock, hhmm, season, dayOfSeason, through, late,
           spend, energy, energyMax, spent,
           ship, binValue, binCount,
           cropAt, inPlot, plant, stage, ripe, harvest,
           sleep, collapse,
           START, LATE, OUT };
})();
