/* ============================================================
   rpg/day.js - the loop the game did not have.

   A DAY is the unit of play.

     - it starts at six in the morning in the pens and ends when
       you go to bed, or at two the following morning when you
       fall over in the yard.
     - ENERGY is the real budget. A drill costs a chunk of it and
       so does an hour in the water with an animal, so how much
       you can make of one dolphin in one day is a decision.
     - overnight, hurt animals mend a day, the dealer restocks
       his cart, and it is tomorrow.

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

  /* ---- state -------------------------------------------------------
     Held on the save object rather than in a closure, so it survives a
     reload and so the HUD can read it without asking. */
  function init() {
    const s = S();
    if (!s.day) s.day = { n: 1, t: START, slept: 0, shipped: 0, lastPay: 0 };
    if (s.energy === undefined) s.energy = 120;
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

  /* ---- the night ------------------------------------------------------ */
  function sleep(where) {
    init();
    const s = S();
    /* 1. the pens: everything hurt mends a day, and the dealer's cart
          gets a new three in the morning */
    let mended = 0;
    if (KD.Pod) {
      for (const d of KD.Pod.pod()) if (d.hurt > 0) mended++;
      KD.Pod.newDay();
    }
    /* 2. and it is tomorrow */
    s.day.n++;
    s.day.t = START;
    s.day.slept = where === 'bed' ? 1 : 0;
    /* Passing out in the yard costs you half a night's rest. A bed is
       worth walking to. */
    s.energy = where === 'bed' ? energyMax() : Math.round(energyMax() * 0.55);
    s.day.lastPay = 0;
    KD.State.tickBeer && KD.State.tickBeer(0);
    KD.State.save();
    return { mended: mended, bed: where === 'bed' };
  }

  function collapse() {
    const r = sleep('sand');
    KD.State.say('You passed out in the yard at two in the morning.', 'BLOOD.2');
    KD.Fx.flash && KD.Fx.flash('INK.0', 0.6);
  }

  return { init, tick, SEASONS,
           day, clock, hhmm, season, dayOfSeason, through, late,
           spend, energy, energyMax, spent,
           sleep, collapse,
           START, LATE, OUT };
})();
