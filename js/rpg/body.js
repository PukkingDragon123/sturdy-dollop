/* ============================================================
   rpg/body.js - what you spend money on now that there is no
   crafting: yourself.

   Six traits, each with its own rising price. Clams come out of
   the ocean - off octopuses, off champions, off quests - and go
   straight into your own arms, lungs and hide. That is the whole
   economy: exercise makes you lighter, fighting makes you richer,
   and being richer makes you stronger, which lets you fight
   deeper.

   Every trait folds into KD.State.recalc through apply(), so
   nothing here has to know how the stats are consumed.
   ============================================================ */
KD.Body = (function () {
  const TRAITS = [
    { id: 'arms',  name: 'Arms',    icon: 'ic_sword',
      blurb: 'Everything you swing lands harder.',
      base: 90,  step: 1.55, max: 8,
      apply: (st, n) => { st.meleeDmg = (st.meleeDmg || 1) + n * 0.14; } },
    { id: 'lungs', name: 'Lungs',   icon: 'ic_bubble',
      blurb: 'Stamina lasts longer and comes back faster.',
      base: 70,  step: 1.5,  max: 8,
      apply: (st, n) => { st.stamMax = (st.stamMax || 1) + n * 0.18; st.stamRegen = (st.stamRegen || 1) + n * 0.16; } },
    { id: 'hide',  name: 'Hide',    icon: 'ic_shield',
      blurb: 'You soak more before it reaches you.',
      base: 110, step: 1.6,  max: 6,
      apply: (st, n) => { st.armour = (st.armour || 0) + n * 3; } },
    { id: 'kick',  name: 'Kick',    icon: 'ic_arrow_up',
      blurb: 'Faster in the water and higher off the floor.',
      base: 80,  step: 1.5,  max: 8,
      apply: (st, n) => { st.swimSpeed = (st.swimSpeed || 1) + n * 0.09; st.jumpMul = (st.jumpMul || 1) + n * 0.045; } },
    { id: 'grit',  name: 'Grit',    icon: 'ic_heart_full',
      blurb: 'One more heart every other rank.',
      base: 140, step: 1.7,  max: 6,
      apply: (st, n) => { st.hpBonus = (st.hpBonus || 0) + Math.floor(n / 2); } },
    { id: 'depth', name: 'Depth',   icon: 'ic_arrow_down',
      blurb: 'The pressure down there stops crushing you.',
      base: 160, step: 1.8,  max: 4,
      apply: (st, n) => { st.pressureDepth = (st.pressureDepth || 0) + n * 40; } }
  ];
  const byId = {};
  for (const t of TRAITS) byId[t.id] = t;

  const rank = (S, id) => (S.body && S.body[id]) || 0;
  /* Each rank costs more than the last, rounded to something readable. */
  function cost(S, id) {
    const t = byId[id];
    if (!t) return 0;
    const n = rank(S, id);
    if (n >= t.max) return 0;
    return Math.round(t.base * Math.pow(t.step, n) / 10) * 10;
  }
  const maxed = (S, id) => rank(S, id) >= (byId[id] ? byId[id].max : 0);

  function buy(S, id) {
    const t = byId[id];
    if (!t || maxed(S, id)) return false;
    const c = cost(S, id);
    if (!KD.State.spend(c)) {
      KD.State.say('That costs ' + c + ' clams. You have ' + S.clams + '.', 'ROT.3');
      KD.Sfx.play('deny');
      return false;
    }
    if (!S.body) S.body = {};
    S.body[id] = rank(S, id) + 1;
    KD.State.recalc();
    KD.State.say(t.name + ' up to ' + S.body[id] + '.', 'GOLD.3');
    KD.Sfx.play('levelup');
    KD.State.save();
    return true;
  }

  /* folded into the derived stats, alongside the training bonuses */
  function apply(S, st) {
    if (!S.body) return;
    for (const t of TRAITS) {
      const n = S.body[t.id] || 0;
      if (n > 0) t.apply(st, n);
    }
  }
  const spent = (S) => TRAITS.reduce((n, t) => n + (S.body ? (S.body[t.id] || 0) : 0), 0);

  return { TRAITS, byId, rank, cost, maxed, buy, apply, spent };
})();
