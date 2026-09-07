/* ============================================================
   rpg/tree.js - what an animal learns, and where.

   A dolphin used to level up and get nothing but bigger numbers,
   which is not a decision. Now every level is a POINT, and a
   point goes somewhere on a tree that is different for every
   animal you own.

   The tree is three branches off one root, and each branch is a
   way of fighting rather than a stat line:

     QUICK   the ring, the window, the chain. An animal that
             wins by landing more strikes than it should.
     HEAVY   power, crits, and what a counter is worth. An
             animal that wins in two hits.
     HOLD    health, the shoulder, and breath. An animal that
             is still there in round twelve.

   Nothing here is +2 SPD. Every node changes how a round PLAYS:
   a wider window is a different game from a bigger number, and
   a second combo slot is a different game again.

   Ranks are cheap and shallow on purpose - two or three deep,
   so a level-eight animal has visibly committed to something
   and a level-twenty one has not bought the whole board.
   ============================================================ */
KD.Tree = (function () {

  /* ---- the board ------------------------------------------------------
     x and y are grid cells, not pixels: the scene lays them out. Wires
     are drawn from `req` to the node, so the shape of the tree is
     entirely in this table. */
  const NODES = [
    { id: 'fit',      x: 3, y: 0, max: 1, cost: 1, req: null, branch: 'root',
      icon: 'ic_sk_heart', name: 'CONDITION',
      key: 'hp', per: 10,
      note: 'Ten more in the tank. Everything starts here.' },

    /* ---- QUICK: land more than you should ---------------------------
       Two nodes off the eye rather than one line, so a quick animal is
       either slippery or economical and cannot cheaply be both. */
    { id: 'window',   x: 1, y: 1, max: 3, cost: 1, req: 'fit', branch: 'quick',
      icon: 'ic_sk_window', name: 'THE EYE',
      key: 'window', per: 0.14,
      note: 'Every timing window opens 14% wider.' },
    { id: 'slip',     x: 0, y: 2, max: 3, cost: 1, req: 'window', branch: 'quick',
      icon: 'ic_spd', name: 'THE SLIP',
      key: 'dodge', per: 0.05,
      note: 'Five points more chance of not being there.' },
    { id: 'air',      x: 2, y: 2, max: 2, cost: 1, req: 'window', branch: 'quick',
      icon: 'ic_sk_air', name: 'EFFICIENCY',
      key: 'air', per: 0.15,
      note: 'Every move costs 15% less breath.' },
    { id: 'combo',    x: 1, y: 3, max: 1, cost: 3, req: 'air', branch: 'quick',
      cap: true,
      icon: 'ic_sk_combo', name: 'THE CHAIN',
      key: 'combo', per: 1,
      note: 'A third strike in the same round, if you keep landing them.' },

    /* ---- HEAVY: win in two hits ------------------------------------- */
    { id: 'power',    x: 3, y: 1, max: 3, cost: 1, req: 'fit', branch: 'heavy',
      icon: 'ic_pow', name: 'THE SHOULDER',
      key: 'power', per: 0.11,
      note: 'Everything it throws lands 11% harder.' },
    { id: 'crit',     x: 3, y: 2, max: 3, cost: 1, req: 'power', branch: 'heavy',
      icon: 'ic_sk_crit', name: 'THE SPIKE',
      key: 'crit', per: 0.09,
      note: 'Nine points more chance of doubling a clean strike.' },
    { id: 'counter',  x: 4, y: 3, max: 2, cost: 2, req: 'crit', branch: 'heavy',
      cap: true,
      icon: 'ic_sk_counter', name: 'THE ANSWER',
      key: 'counter', per: 0.45,
      note: 'A countered strike lands for another 45%.' },

    /* ---- HOLD: still there in round twelve, and cheap to keep -------
       The two food nodes are here on purpose: an animal built to last
       is also the animal you can afford to work every day. */
    { id: 'lungs',    x: 5, y: 1, max: 3, cost: 1, req: 'fit', branch: 'hold',
      icon: 'ic_sta', name: 'LUNGS',
      key: 'airmax', per: 9,
      note: 'Nine more breath before it has to surface.' },
    { id: 'guard',    x: 5, y: 2, max: 2, cost: 1, req: 'lungs', branch: 'hold',
      icon: 'ic_guard', name: 'THE WALL',
      key: 'guard', per: 0.5,
      note: 'Holding gives half again the breath back, and hurts them more.' },
    { id: 'appetite', x: 6, y: 2, max: 2, cost: 1, req: 'lungs', branch: 'hold',
      icon: 'ic_sk_heart', name: 'APPETITE',
      key: 'eat', per: 0.22,
      note: 'It gets 22% more out of everything you feed it.' },
    { id: 'grit',     x: 5, y: 3, max: 2, cost: 2, req: 'guard', branch: 'hold',
      cap: true,
      icon: 'ic_sk_heart', name: 'GRIT',
      key: 'hp', per: 18,
      note: 'Eighteen more in the tank, on top of everything else.' },
    { id: 'thrift',   x: 6, y: 3, max: 2, cost: 1, req: 'appetite', branch: 'hold',
      icon: 'ic_dr_sta', name: 'EASY KEEPER',
      key: 'thrift', per: 0.15,
      note: 'A session at the tracks or the gym costs 15% less of it.' },

    /* ---- and one node you can only reach across the board ----------
       WIND needs both a heavy build and a held one, so it is the first
       thing in the game that is worth planning two branches for. */
    { id: 'wind',     x: 4, y: 4, max: 2, cost: 2, req: 'crit', req2: 'guard',
      branch: 'root', cap: true,
      icon: 'ic_dr_sta', name: 'SECOND WIND',
      key: 'stamax', per: 14,
      note: 'Fourteen more of the working day. Needs THE SPIKE and THE WALL.' }
  ];
  const BY_ID = {};
  for (const n of NODES) BY_ID[n.id] = n;

  const BRANCH = {
    root:  { col: 'GOLD.3',  dim: 'GOLD.0' },
    quick: { col: 'WATER.2', dim: 'DEEP.2' },
    heavy: { col: 'BLOOD.3', dim: 'BLOOD.0' },
    hold:  { col: 'KELP.3',  dim: 'KELP.0' }
  };

  /* ---- an animal's own board ------------------------------------------ */
  const bag = (d) => (d.sk || (d.sk = {}));
  const rank = (d, id) => (d && d.sk ? (d.sk[id] || 0) : 0);
  const points = (d) => (d ? (d.pts || 0) : 0);

  /* a node is reachable once its prerequisite has at least one rank */
  function open(d, id) {
    const n = BY_ID[id];
    if (!n) return false;
    if (!n.req) return true;
    if (rank(d, n.req) < 1) return false;
    /* `req2` is a second prerequisite from another branch */
    if (n.req2 && rank(d, n.req2) < 1) return false;
    /* a capstone wants its prerequisite MAXED, not merely opened - it is
       the end of a branch, and it should cost you the branch */
    if (n.cap) {
      const r = BY_ID[n.req];
      if (r && rank(d, n.req) < r.max) return false;
      if (n.req2) {
        const r2 = BY_ID[n.req2];
        if (r2 && rank(d, n.req2) < r2.max) return false;
      }
    }
    return true;
  }
  /* why a node is shut, in words, so the board can say it */
  function why(d, id) {
    const n = BY_ID[id];
    if (!n) return '';
    if (rank(d, id) >= n.max) return 'Maxed.';
    if (n.req && rank(d, n.req) < 1) return 'Needs ' + BY_ID[n.req].name + ' first.';
    if (n.req2 && rank(d, n.req2) < 1) return 'Needs ' + BY_ID[n.req2].name + ' too.';
    if (n.cap) {
      const r = BY_ID[n.req];
      if (r && rank(d, n.req) < r.max) return 'Needs ' + r.name + ' at ' + r.max + '.';
      if (n.req2) {
        const r2 = BY_ID[n.req2];
        if (r2 && rank(d, n.req2) < r2.max) return 'Needs ' + r2.name + ' at ' + r2.max + '.';
      }
    }
    if (points(d) < n.cost) return 'Costs ' + n.cost + '. You have ' + points(d) + '.';
    return '';
  }
  function canTake(d, id) {
    const n = BY_ID[id];
    if (!n || !d) return false;
    if (rank(d, id) >= n.max) return false;
    if (!open(d, id)) return false;
    return points(d) >= n.cost;
  }
  function take(d, id) {
    if (!canTake(d, id)) return false;
    const n = BY_ID[id];
    bag(d)[id] = rank(d, id) + 1;
    d.pts = points(d) - n.cost;
    return true;
  }
  /* wipe the board and hand the points back - a bad build should not be
     a dead animal */
  function reset(d) {
    if (!d) return 0;
    let spent = 0;
    for (const n of NODES) spent += rank(d, n.id) * n.cost;
    d.sk = {};
    d.pts = points(d) + spent;
    return spent;
  }
  const spent = (d) => NODES.reduce((a, n) => a + rank(d, n.id) * n.cost, 0);

  /* ---- what the board is worth ---------------------------------------
     One lookup the rest of the game asks: how much of `key` has this
     animal bought? Everything that reads the tree goes through here, so
     adding a node never means editing the fight. */
  function val(d, key) {
    if (!d || !d.sk) return 0;
    let v = 0;
    for (const n of NODES) {
      if (n.key !== key) continue;
      v += rank(d, n.id) * n.per;
    }
    return v;
  }

  return { NODES, BY_ID, BRANCH, rank, points, open, canTake, take, why,
           reset, spent, val };
})();
