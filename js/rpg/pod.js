/* ============================================================
   rpg/pod.js - the roster, the moves, and the men who run the
   Deepwater Circuit.

   The old game was a sandbox: a big world with things in it and
   no reason to be anywhere. This one is a stable. You own
   animals, they have numbers, the numbers go up if you put the
   work in, and once a night you find out whether the work was
   enough. Everything below exists to make that one loop have
   teeth.

   FOUR STATS, and they do different KINDS of thing, so a
   dolphin is a shape rather than a total:
     SPEED    who moves first, and how often they slip a hit
     POWER    what a clean hit takes off
     STAMINA  how much they can take, and how long they can
              hold their breath
     SPIRIT   how often they land something ruinous, and how
              fast the finisher fills

   BREATH is the real resource in a fight. Every move spends it.
   Run out and you have to surface, and surfacing is a free hit
   for the other animal - which is why a fight is a budget and
   not a slugging match.
   ============================================================ */
KD.Pod = (function () {
  const S = () => KD.State.S;

  /* ---- species: a bias, not a tier ---------------------------------
     Nothing here is strictly better than anything else. A pilot whale
     soaks everything and cannot catch a spinner; a spinner cannot
     survive being caught. */
  const BIAS = {
    runt:    { spd: 12, pow: 10, sta: 12, spi: 12, w: 26, name: 'Coastal' },
    bull:    { spd: 6,  pow: 20, sta: 16, spi: 8,  w: 14, name: 'Bull' },
    spinner: { spd: 22, pow: 8,  sta: 7,  spi: 15, w: 14, name: 'Spinner' },
    pilot:   { spd: 4,  pow: 14, sta: 24, spi: 6,  w: 10, name: 'Pilot' },
    risso:   { spd: 11, pow: 15, sta: 11, spi: 18, w: 12, name: 'Risso' },
    commons: { spd: 17, pow: 11, sta: 9,  spi: 13, w: 24, name: 'Common' }
  };

  /* ---- temperament: what it does to you, not to its stats ---------- */
  const TEMPER = [
    { id: 'steady',  name: 'Steady',   note: 'Never panics. The timing window is wider.',   win: 1.30 },
    { id: 'wild',    name: 'Wild',     note: 'Hits harder, but the window is a sliver.',    win: 0.70, pow: 1.18 },
    { id: 'sulky',   name: 'Sulky',    note: 'Slow to warm up. Bonds at half speed.',       bond: 0.5 },
    { id: 'game',    name: 'Game',     note: 'Fights on. Keeps a last sliver of breath.',   breath: 1.20 },
    { id: 'proud',   name: 'Proud',    note: 'Crits far more often. Sulks when it loses.',  spi: 1.30 },
    { id: 'plain',   name: 'Plain',    note: 'Nothing remarkable either way.' }
  ];
  const temperOf = (id) => TEMPER.find((t) => t.id === id) || TEMPER[TEMPER.length - 1];

  /* ---- the moves ---------------------------------------------------
     `win` is the width of the clean-hit window as a fraction of the
     timing bar, so a big move is a smaller target. That is the whole
     risk curve of the fight: everything strong is hard to land. */
  /* ---- the moves ------------------------------------------------------
     Every move has a CLASS, and the classes beat each other in a ring:

         QUICK  beats  SOUND  beats  HEAVY  beats  QUICK

     which is what turns a round from "pick the biggest number" into a
     read. The other animal shows you what it is winding up BEFORE you
     choose, so picking the move that beats it is a decision you can
     actually make rather than a coin you flip. HOLD sits outside the
     ring: it never counters and is never countered, it just eats the
     hit and gives you your breath back.

     Colours are the class, everywhere in the game, so you learn the
     ring by looking at it rather than by reading a table.
     -------------------------------------------------------------------- */
  const CLS = {
    quick: { id: 'quick', name: 'QUICK', col: 'WATER.2', dim: 'WATER.0', beats: 'sound' },
    heavy: { id: 'heavy', name: 'HEAVY', col: 'BLOOD.3', dim: 'BLOOD.1', beats: 'quick' },
    sound: { id: 'sound', name: 'SOUND', col: 'ROT.3',   dim: 'ROT.1',   beats: 'heavy' },
    hold:  { id: 'hold',  name: 'HOLD',  col: 'KELP.3',  dim: 'KELP.1',  beats: null }
  };
  const beats = (a, b) => !!(a && b && CLS[a] && CLS[a].beats === b);

  const MOVES = {
    ram:    { id: 'ram',    name: 'Headbutt',   air: 12, mul: 1.00, win: 0.30, bond: 0,
              cls: 'quick', icon: 'ic_ram',
              note: 'Straight in off the melon. Always there.' },
    tail:   { id: 'tail',   name: 'Tail Slap',  air: 17, mul: 1.40, win: 0.21, bond: 0,
              cls: 'heavy', icon: 'ic_tail',
              note: 'The flukes come round. More power, less margin.' },
    sonar:  { id: 'sonar',  name: 'Sonar Burst', air: 14, mul: 0.80, win: 0.26, bond: 30,
              cls: 'sound', icon: 'ic_sonar', stun: 1,
              note: 'Weak, but it cannot be dodged and it rattles them.' },
    spin:   { id: 'spin',   name: 'Corkscrew',  air: 23, mul: 1.75, win: 0.15, bond: 45,
              cls: 'quick', icon: 'ic_spin',
              note: 'Comes up under them spinning. Hard to time.' },
    breach: { id: 'breach', name: 'Breach',     air: 32, mul: 2.50, win: 0.10, bond: 70,
              cls: 'heavy', icon: 'ic_breach',
              note: 'All the way up and all the way down. If it lands.' },
    guard:  { id: 'guard',  name: 'Hold',       air: 0,  mul: 0,    win: 0.40, bond: 0,
              cls: 'hold', icon: 'ic_guard', guard: 1,
              note: 'Take the hit on the shoulder and get your breath back.' }
  };
  const MOVE_IDS = ['ram', 'tail', 'sonar', 'spin', 'breach', 'guard'];

  /* which moves an animal has EARNED - bond is the gate, so swimming
     with one is how it gets dangerous */
  function movesOf(d) {
    const out = [];
    for (const k of MOVE_IDS) {
      const m = MOVES[k];
      if ((d.bond || 0) >= m.bond) out.push(m);
    }
    return out;
  }

  /* An opponent spends its own points without a player. It leans the way
     its stats already lean, so a Pilot buys lungs and a Bull buys power -
     which is the only reason a tier-four handler feels different from a
     tier-one handler with bigger numbers. */
  function autoSpend(d) {
    if (!KD.Tree) return;
    const lean = (d.pow >= d.spd && d.pow >= d.sta) ? ['fit', 'power', 'crit', 'counter']
               : (d.sta >= d.spd) ? ['fit', 'lungs', 'shoulder', 'grit']
               : ['fit', 'window', 'air', 'combo'];
    let guard = 0;
    while ((d.pts || 0) > 0 && guard++ < 60) {
      let took = false;
      for (const id of lean) {
        if (KD.Tree.canTake(d, id)) { KD.Tree.take(d, id); took = true; break; }
      }
      if (!took) break;
    }
  }

  /* ---- derived numbers --------------------------------------------- */
  /* The four derived numbers all read the skill tree, so a point spent
     there shows up in the fight rather than on a sheet. */
  const sk = (d, k) => (KD.Tree ? KD.Tree.val(d, k) : 0);
  const hpMax = (d) => Math.round(46 + (d.sta || 10) * 1.7 + (d.lvl || 1) * 3 + sk(d, 'hp'));
  function airMax(d) {
    const t = temperOf(d.temper);
    return Math.round((58 + (d.sta || 10) * 0.9) * (t.breath || 1) + sk(d, 'airmax'));
  }
  const dodge = (d) => Math.min(0.34, (d.spd || 10) * 0.0042);
  function crit(d) {
    const t = temperOf(d.temper);
    return Math.min(0.55, (d.spi || 10) * 0.0038 * (t.spi || 1) + sk(d, 'crit'));
  }
  function power(d) {
    const t = temperOf(d.temper);
    return (7 + (d.pow || 10) * 0.62) * (t.pow || 1) * (1 + sk(d, 'power'));
  }
  /* THE EYE is the most valuable thing on the board: a wider window is
     a different game, not a bigger number. */
  const winScale = (d) => (temperOf(d.temper).win || 1) * (1 + sk(d, 'window'));
  const airScale = (d) => Math.max(0.5, 1 - sk(d, 'air'));
  const rating = (d) => Math.round(((d.spd || 0) + (d.pow || 0) + (d.sta || 0) + (d.spi || 0)) / 4);
  const fit = (d) => !d.hurt || d.hurt <= 0;

  /* ---- making one -------------------------------------------------- */
  const FIRST = ['Nine', 'Sixpence', 'Bracket', 'Tuppence', 'Hatchet', 'Cinder',
                 'Marbles', 'Whistle', 'Sunday', 'Gravel', 'Pennyworth', 'Kettle',
                 'Bishop', 'Chalk', 'Rattle', 'Muddle', 'Grin', 'Anchor',
                 'Halfmoon', 'Fathom', 'Bilge', 'Tempest', 'Custard', 'Wick'];
  let nid = 1;

  function roll(o) {
    o = o || {};
    const spId = o.sp || SPECIES_PICK();
    const B = BIAS[spId];
    const q = o.q === undefined ? 1.0 : o.q;      // quality multiplier
    const j = () => 0.72 + Math.random() * 0.56;  // a wide spread per stat
    const d = {
      uid: 'd' + (nid++) + '-' + ((Math.random() * 1e6) | 0),
      name: o.name || FIRST[(Math.random() * FIRST.length) | 0],
      sp: spId,
      coat: o.coat || KD.Dolph.COAT_IDS[(Math.random() * KD.Dolph.COAT_IDS.length) | 0],
      mark: o.mark !== undefined ? o.mark
            : KD.Dolph.MARKS[(Math.random() * KD.Dolph.MARKS.length) | 0],
      seed: (Math.random() * 9999) | 0,
      temper: o.temper || TEMPER[(Math.random() * TEMPER.length) | 0].id,
      spd: Math.max(3, Math.round(B.spd * j() * q)),
      pow: Math.max(3, Math.round(B.pow * j() * q)),
      sta: Math.max(3, Math.round(B.sta * j() * q)),
      spi: Math.max(3, Math.round(B.spi * j() * q)),
      lvl: o.lvl || 1, xp: 0, bond: o.bond || 0,
      hurt: 0, wins: 0, losses: 0,
      /* its own skill board, and a point to open it with - a board you
         cannot touch until level two is a board nobody looks at */
      sk: {}, pts: 1 + Math.max(0, (o.lvl || 1) - 1)
    };
    /* an opponent has already spent its own points, weighted to the way
       its stats lean, so a Bull on the Deep Card really has bought power */
    if (o.auto) autoSpend(d);
    return d;
  }
  function SPECIES_PICK() {
    /* weighted, so a pilot whale in the pens is worth telling somebody
       about and a coastal is Tuesday */
    let total = 0;
    for (const k in BIAS) total += BIAS[k].w;
    let r = Math.random() * total;
    for (const k in BIAS) { r -= BIAS[k].w; if (r <= 0) return k; }
    return 'runt';
  }

  /* ---- the pens ---------------------------------------------------- */
  const PENS = 6;
  function pod() { return S().pod || (S().pod = []); }
  const active = () => pod().find((d) => d.uid === S().activeUid) || pod()[0] || null;
  const setActive = (d) => { S().activeUid = d ? d.uid : null; };
  function add(d) {
    if (pod().length >= PENS) return false;
    pod().push(d);
    if (!S().activeUid) setActive(d);
    return true;
  }
  function release(d) {
    const p = pod();
    const i = p.indexOf(d);
    if (i < 0) return;
    p.splice(i, 1);
    if (S().activeUid === d.uid) setActive(p[0] || null);
  }

  /* ---- training ----------------------------------------------------
     Every drill costs energy and gives less the higher the stat already
     is, so a fifty is four sessions and an eighty is a fortnight. */
  const DRILLS = [
    { id: 'sprints', stat: 'spd', name: 'Gate Sprints',  cost: 26,
      note: 'Twenty lengths of the pen against a rope.' },
    { id: 'weight',  stat: 'pow', name: 'Drag The Chain', cost: 30,
      note: 'A netted stone on a harness. Miserable, and it works.' },
    { id: 'holds',   stat: 'sta', name: 'Breath Holds',   cost: 24,
      note: 'Down on the sand until it wants up, then a bit more.' },
    { id: 'ring',    stat: 'spi', name: 'Ring Work',      cost: 28,
      note: 'Somebody it does not like, on the other side of a rope.' }
  ];
  function trainGain(d, stat) {
    const v = d[stat] || 0;
    return Math.max(1, Math.round(7 - v * 0.055));
  }
  function train(d, drill) {
    if (!d) return null;
    if (!fit(d)) { KD.State.say(d.name + ' is not fit to work.', 'BLOOD.2'); return null; }
    if (KD.Day.energy() < drill.cost) {
      KD.State.say('Not enough left in the day for that.', 'BLOOD.2');
      return null;
    }
    KD.Day.spend(drill.cost);
    const g = trainGain(d, drill.stat);
    d[drill.stat] = (d[drill.stat] || 0) + g;
    d.xp = (d.xp || 0) + 6;
    levelCheck(d);
    KD.State.save();
    return g;
  }

  /* Every level is a POINT, and a point is a decision on the animal's own
     board. Returns how many it just gained, so the scene that triggered
     the level can say so. */
  function levelCheck(d) {
    let got = 0, guard = 0;
    let need = 40 + (d.lvl || 1) * 26;
    while (d.xp >= need && guard++ < 40) {
      d.xp -= need;
      d.lvl = (d.lvl || 1) + 1;
      d.pts = (d.pts || 0) + 1;
      got++;
      need = 40 + d.lvl * 26;
    }
    return got;
  }

  /* bonding: what swimming with one buys you */
  function bondUp(d, n) {
    const t = temperOf(d.temper);
    const before = d.bond || 0;
    d.bond = Math.min(100, before + n * (t.bond === undefined ? 1 : t.bond));
    const gained = [];
    for (const k of MOVE_IDS) {
      const m = MOVES[k];
      if (before < m.bond && d.bond >= m.bond) gained.push(m);
    }
    return gained;
  }

  /* ================================================================
     THE CIRCUIT

     Five tiers in a flooded quarry nobody official knows about. Each
     one is three handlers deep, and you cannot enter a tier until you
     have beaten everybody in the one below - so the ladder is the
     progression and the money is just how you keep up with it.
     ================================================================ */
  const TIERS = [
    { id: 0, name: 'The Shallow Card', fee: 40,   purse: 140,   q: 0.85, lvl: 1 },
    { id: 1, name: 'The Long Pen',     fee: 120,  purse: 420,   q: 1.05, lvl: 4 },
    { id: 2, name: 'The Quarry',       fee: 320,  purse: 1100,  q: 1.30, lvl: 8 },
    { id: 3, name: 'The Deep Card',    fee: 800,  purse: 2800,  q: 1.60, lvl: 13 },
    { id: 4, name: 'The Iron Gate',    fee: 2000, purse: 8000,  q: 2.00, lvl: 19 }
  ];

  /* Hand-written, because an opponent with a name and a line is somebody
     you want to beat and a procedural one is a number. */
  const CARD = [
    /* tier 0 */
    { t: 0, who: 'Mullet', dolph: 'Sixpence', sp: 'runt', coat: 'slate', mark: null,
      temper: 'plain', line: 'She has never lost to anybody who turned up in a dressing gown.' },
    { t: 0, who: 'Old Pell', dolph: 'Kettle', sp: 'commons', coat: 'sand', mark: 'spot',
      temper: 'steady', line: 'Kettle is nine. Kettle has been nine for four years.' },
    { t: 0, who: 'The Netman', dolph: 'Bilge', sp: 'runt', coat: 'steel', mark: 'stripe',
      temper: 'wild', line: 'I caught this one Tuesday. It has not forgiven me.' },
    /* tier 1 */
    { t: 1, who: 'Cass', dolph: 'Marbles', sp: 'spinner', coat: 'bronze', mark: null,
      temper: 'wild', line: 'You will not touch her. Nobody touches her.' },
    { t: 1, who: 'Bracket Joe', dolph: 'Hatchet', sp: 'bull', coat: 'ink', mark: 'scar',
      temper: 'game', line: 'He goes twelve rounds on a bad day, majesty.' },
    { t: 1, who: 'Mrs Vell', dolph: 'Sunday', sp: 'risso', coat: 'steel', mark: 'scar',
      temper: 'proud', line: 'Sunday does not need to be quick. Sunday needs one opening.' },
    /* tier 2 */
    { t: 2, who: 'The Cooper', dolph: 'Gravel', sp: 'pilot', coat: 'slate', mark: 'saddle',
      temper: 'game', line: 'You will get bored before Gravel does.' },
    { t: 2, who: 'Thin Alec', dolph: 'Whistle', sp: 'spinner', coat: 'jade', mark: 'stripe',
      temper: 'proud', line: 'Whistle has put four animals out of the sport.' },
    { t: 2, who: 'Ma Rennick', dolph: 'Chalk', sp: 'risso', coat: 'violet', mark: 'scar',
      temper: 'steady', line: 'I have been doing this since before you had a crown.' },
    /* tier 3 */
    { t: 3, who: 'Bishop', dolph: 'Anchor', sp: 'bull', coat: 'violet', mark: 'saddle',
      temper: 'wild', line: 'They call it Anchor because of what they bring it up with.' },
    { t: 3, who: 'The Quiet Man', dolph: 'Halfmoon', sp: 'risso', coat: 'ink', mark: 'scar',
      temper: 'proud', line: '' },
    { t: 3, who: 'Coralene', dolph: 'Fathom', sp: 'spinner', coat: 'rose', mark: null,
      temper: 'steady', line: 'I did tell you I would find something to do with my evenings.' },
    /* tier 4 */
    { t: 4, who: 'The Keg', dolph: 'Custard', sp: 'commons', coat: 'bronze', mark: 'spot',
      temper: 'game', line: 'u still up' },
    { t: 4, who: 'Santa the Manta', dolph: 'Wick', sp: 'pilot', coat: 'jade', mark: 'saddle',
      temper: 'steady', line: 'HO! Somebody has to be the last one in your way, majesty.' },
    { t: 4, who: 'The Deep', dolph: 'Tempest', sp: 'pilot', coat: 'ink', mark: 'saddle',
      temper: 'proud', line: 'I run this. I run the quarry, I run the card, and I run your ocean.' }
  ];

  /* the opponent's animal, rolled once and then remembered, so the same
     fight is the same fight until you win it */
  function foeOf(entry) {
    const key = 'foe_' + entry.who;
    const st = S();
    if (!st.foes) st.foes = {};
    if (!st.foes[key]) {
      const T = TIERS[entry.t];
      /* Bond gates moves, so bond is what makes a tier feel like a tier.
         On the Shallow Card they only know how to headbutt and slap; the
         sonar comes in on the Long Pen, the spin at the Quarry, and
         nobody breaches at you until the Deep Card. Handing every
         opponent bond 100 was the whole reason the opener was
         unwinnable - a starter animal was being breached on by a
         stranger in a pond. */
      const d = roll({ sp: entry.sp, coat: entry.coat, mark: entry.mark,
                       name: entry.dolph, temper: entry.temper,
                       q: T.q, lvl: T.lvl, bond: 12 + entry.t * 22,
                       auto: true });
      st.foes[key] = d;
    }
    return st.foes[key];
  }
  const beaten = (entry) => !!(S().beat || {})[entry.who];
  function markBeaten(entry) {
    const st = S();
    if (!st.beat) st.beat = {};
    st.beat[entry.who] = 1;
  }
  const tierCard = (t) => CARD.filter((c) => c.t === t);
  function tierClear(t) { return tierCard(t).every(beaten); }
  function tierOpen(t) { return t === 0 || tierClear(t - 1); }
  function standing() {
    let t = 0;
    while (t < TIERS.length - 1 && tierClear(t)) t++;
    return t;
  }

  /* ---- the save ----------------------------------------------------- */
  function init() {
    const st = S();
    if (!st.pod) st.pod = [];
    if (!st.beat) st.beat = {};
    if (!st.foes) st.foes = {};
    if (st.market === undefined) st.market = null;
    if (!st.pod.length) {
      /* You do not start with a good one. You start with the one nobody
         else wanted, which is the entire point of the first hour. */
      const d = roll({ sp: 'runt', name: 'Nine', coat: 'slate', mark: null,
                       temper: 'game', q: 0.72 });
      d.bond = 10;
      add(d);
    }
    if (!st.activeUid) setActive(st.pod[0]);
  }

  /* ---- the dealer --------------------------------------------------
     Three animals, restocked every morning, priced off what they are
     worth. He does not tell you their temperament: that is what the
     price is for. */
  function restock() {
    const st = S();
    const q = 0.8 + standing() * 0.22;
    st.market = [];
    for (let i = 0; i < 3; i++) {
      const d = roll({ q: q * (0.85 + Math.random() * 0.4) });
      st.market.push({ d: d, price: priceOf(d) });
    }
  }
  const priceOf = (d) => Math.round(60 + rating(d) * 26 + (d.lvl || 1) * 30);
  function market() {
    const st = S();
    if (!st.market) restock();
    return st.market;
  }
  function buy(row) {
    const st = S();
    if (pod().length >= PENS) { KD.State.say('No pen free.', 'BLOOD.2'); return false; }
    if (st.clams < row.price) { KD.State.say('Not enough clams.', 'BLOOD.2'); return false; }
    KD.State.spend(row.price);
    add(row.d);
    st.market = st.market.filter((r) => r !== row);
    KD.Sfx.play('pickup');
    KD.State.save();
    return true;
  }

  /* every animal in the pens gets a day older and a day better */
  function newDay() {
    for (const d of pod()) {
      if (d.hurt > 0) d.hurt--;
      levelCheck(d);
    }
    restock();
  }

  return { BIAS, TEMPER, temperOf, MOVES, MOVE_IDS, movesOf, CLS, beats, DRILLS, TIERS, CARD,
           hpMax, airMax, dodge, crit, power, winScale, airScale, rating, fit,
           roll, pod, active, setActive, add, release, PENS,
           train, trainGain, bondUp, levelCheck,
           foeOf, beaten, markBeaten, tierCard, tierClear, tierOpen, standing,
           init, market, restock, buy, priceOf, newDay };
})();
