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
    { id: 'fit',      x: 2, y: 0, max: 1, cost: 1, req: null, branch: 'root',
      icon: 'ic_sk_heart', name: 'CONDITION',
      key: 'hp', per: 6,
      note: 'Six more in the tank. Everything starts here.' },

    /* ---- QUICK: land more than you should --------------------------- */
    { id: 'window',   x: 0, y: 1, max: 3, cost: 1, req: 'fit', branch: 'quick',
      icon: 'ic_sk_window', name: 'THE EYE',
      key: 'window', per: 0.12,
      note: 'Every timing window opens 12% wider.' },
    { id: 'air',      x: 0, y: 2, max: 2, cost: 1, req: 'window', branch: 'quick',
      icon: 'ic_sk_air', name: 'EFFICIENCY',
      key: 'air', per: 0.12,
      note: 'Every move costs 12% less breath.' },
    { id: 'combo',    x: 0, y: 3, max: 1, cost: 3, req: 'air', branch: 'quick',
      icon: 'ic_sk_combo', name: 'THE CHAIN',
      key: 'combo', per: 1,
      note: 'A third strike in the same round, if you keep landing them.' },

    /* ---- HEAVY: win in two hits ------------------------------------- */
    { id: 'power',    x: 2, y: 1, max: 3, cost: 1, req: 'fit', branch: 'heavy',
      icon: 'ic_pow', name: 'THE SHOULDER',
      key: 'power', per: 0.10,
      note: 'Everything it throws lands 10% harder.' },
    { id: 'crit',     x: 2, y: 2, max: 2, cost: 1, req: 'power', branch: 'heavy',
      icon: 'ic_sk_crit', name: 'THE SPIKE',
      key: 'crit', per: 0.07,
      note: 'Seven points more chance of doubling a clean strike.' },
    { id: 'counter',  x: 2, y: 3, max: 2, cost: 2, req: 'crit', branch: 'heavy',
      icon: 'ic_sk_counter', name: 'THE ANSWER',
      key: 'counter', per: 0.35,
      note: 'A countered strike lands for another 35%.' },

    /* ---- HOLD: still there in round twelve --------------------------- */
    { id: 'lungs',    x: 4, y: 1, max: 3, cost: 1, req: 'fit', branch: 'hold',
      icon: 'ic_sta', name: 'LUNGS',
      key: 'airmax', per: 8,
      note: 'Eight more breath to spend before it has to surface.' },
    { id: 'shoulder', x: 4, y: 2, max: 2, cost: 1, req: 'lungs', branch: 'hold',
      icon: 'ic_guard', name: 'THE WALL',
      key: 'guard', per: 0.5,
      note: 'Holding gives half again the breath back, and hurts them more.' },
    { id: 'grit',     x: 4, y: 3, max: 2, cost: 2, req: 'shoulder', branch: 'hold',
      icon: 'ic_sk_heart', name: 'GRIT',
      key: 'hp', per: 14,
      note: 'Fourteen more in the tank, on top of everything else.' }
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
    return rank(d, n.req) > 0;
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

  return { NODES, BY_ID, BRANCH, rank, points, open, canTake, take,
           reset, spent, val };
})();
