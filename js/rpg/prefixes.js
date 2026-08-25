/* ============================================================
   rpg/prefixes.js - the gamble.

   Materials are the axis of progression; this table is the axis
   of luck. Every craft rolls once on it, so the same recipe with
   the same materials is never quite the same item twice.

   Every number here is a MULTIPLIER except crit, which is flat
   percentage points, because crit is already a percentage and
   multiplying a percentage twice is how you get 400% crit.
   ============================================================ */
KD.Prefixes = (function () {
  /* tier is what luck bends: -2 junk, -1 poor, 0 plain, 1 good,
     2 great, 3 legendary. It is also the tooltip colour band. */
  const all = [
    /* ---- junk: the reason you keep crafting ---- */
    { id: 'rusted',      name: 'Rusted',      weight: 40,  dmg: 0.85, spd: 0.90, crit: 0,  dur: 0.80, tier: -2 },
    { id: 'barnacled',   name: 'Barnacled',   weight: 45,  dmg: 0.90, spd: 0.88, crit: 0,  dur: 1.05, tier: -2 },
    { id: 'brackish',    name: 'Brackish',    weight: 55,  dmg: 0.92, spd: 0.95, crit: -1, dur: 0.90, tier: -1 },
    { id: 'waterlogged', name: 'Waterlogged', weight: 50,  dmg: 0.95, spd: 0.85, crit: 0,  dur: 1.00, tier: -1 },
    { id: 'chipped',     name: 'Chipped',     weight: 55,  dmg: 0.90, spd: 1.05, crit: 0,  dur: 0.85, tier: -1 },
    { id: 'dull',        name: 'Dull',        weight: 50,  dmg: 0.88, spd: 1.00, crit: -2, dur: 1.10, tier: -1 },

    /* ---- plain. The single most likely outcome by design: a
       prefix has to feel like news when you get one. ---- */
    { id: 'none',        name: '',            weight: 260, dmg: 1.00, spd: 1.00, crit: 0,  dur: 1.00, tier: 0 },

    /* ---- good ---- */
    { id: 'sharp',       name: 'Sharp',       weight: 60,  dmg: 1.08, spd: 1.00, crit: 2,  dur: 1.00, tier: 1 },
    { id: 'quick',       name: 'Quick',       weight: 60,  dmg: 1.00, spd: 1.12, crit: 1,  dur: 1.00, tier: 1 },
    { id: 'sturdy',      name: 'Sturdy',      weight: 60,  dmg: 1.02, spd: 0.98, crit: 0,  dur: 1.25, tier: 1 },
    { id: 'keen',        name: 'Keen',        weight: 45,  dmg: 1.05, spd: 1.02, crit: 5,  dur: 0.95, tier: 1 },
    { id: 'salted',      name: 'Salted',      weight: 45,  dmg: 1.10, spd: 1.00, crit: 0,  dur: 0.90, tier: 1 },
    { id: 'tidewrought', name: 'Tidewrought', weight: 35,  dmg: 1.06, spd: 1.06, crit: 2,  dur: 1.05, tier: 1 },

    /* ---- great ---- */
    { id: 'pearled',     name: 'Pearled',     weight: 26,  dmg: 1.14, spd: 1.05, crit: 6,  dur: 1.05, tier: 2 },
    { id: 'deepforged',  name: 'Deepforged',  weight: 22,  dmg: 1.18, spd: 1.00, crit: 3,  dur: 1.20, tier: 2 },
    { id: 'foamtouched', name: 'Foamtouched', weight: 18,  dmg: 1.15, spd: 1.12, crit: 4,  dur: 1.00, tier: 2 },
    /* the numeric ceiling. MASTER_PROMPT says Kingly is +30% and
       nothing in this table may beat it on damage. */
    { id: 'kingly',      name: 'Kingly',      weight: 9,   dmg: 1.30, spd: 1.15, crit: 8,  dur: 1.30, tier: 2 },

    /* ---- legendary: an EFFECT, which numbers cannot buy ----
       deliberately weaker on paper than Kingly. You do not chase
       these for the percentages. */
    { id: 'sanguine',   name: 'Sanguine',   weight: 5, dmg: 1.20, spd: 1.05, crit: 5, dur: 1.10, tier: 3, effect: 'lifesteal' },
    { id: 'stormbound', name: 'Stormbound', weight: 4, dmg: 1.18, spd: 1.08, crit: 6, dur: 1.05, tier: 3, effect: 'chain' },
    { id: 'leviathan',  name: 'Leviathan',  weight: 3, dmg: 1.25, spd: 0.95, crit: 3, dur: 1.25, tier: 3, effect: 'quake' }
  ];

  const byId = {};
  for (const p of all) byId[p.id] = p;
  const NONE = byId.none;

  /* the ceilings the roller may never exceed, read off the table
     itself so they cannot drift out of sync with it */
  const CAP = all.reduce((c, p) => ({
    tier: Math.max(c.tier, p.tier), dmg: Math.max(c.dmg, p.dmg),
    spd: Math.max(c.spd, p.spd), crit: Math.max(c.crit, p.crit),
    dur: Math.max(c.dur, p.dur)
  }), { tier: -9, dmg: 0, spd: 0, crit: -99, dur: 0 });

  /* ---- luck ------------------------------------------------
     Luck bends the table by tier: weight * LUCK^tier, where
     LUCK = 1 + luck/100. It is geometric in tier, so one point
     of luck helps a legendary nine times as much as it helps a
     Sharp, and hurts junk (negative tiers, so LUCK^-2 < 1).
     It can never guarantee anything: `none` sits at tier 0 and
     its weight is untouched by any amount of luck, so the plain
     outcome always keeps a real share of the distribution. */
  const LUCK_MAX = 200;               /* past here more luck is a no-op */
  function weightOf(p, luck) {
    const f = 1 + Math.max(0, Math.min(LUCK_MAX, luck || 0)) / 100;
    return p.weight * Math.pow(f, p.tier);
  }

  /* the whole distribution, for tooltips, the Reroll Anvil odds
     display and the balance tests */
  function odds(luck) {
    let total = 0;
    const w = all.map((p) => { const x = weightOf(p, luck); total += x; return x; });
    return all.map((p, i) => ({ id: p.id, name: p.name || '(plain)', tier: p.tier, p: w[i] / total }));
  }

  /* rng is injectable so the tests and the seeded world can both
     be deterministic; the game just calls roll(luck) */
  function roll(luck, rng) {
    const r = (rng || Math.random)();
    let total = 0;
    for (const p of all) total += weightOf(p, luck);
    let x = r * total;
    for (const p of all) {
      x -= weightOf(p, luck);
      if (x < 0) return p;
    }
    return NONE;                      /* float dust only */
  }

  /* ---- applying a prefix ---------------------------------
     ONE place does this so craft() and reroll() can never drift
     apart. `base` is the pre-prefix stat block an item carries
     for exactly this reason; only the fields present are touched. */
  const r2 = (v) => Math.round(v * 100) / 100;
  /* a great prefix on a tool is worth one extra tile hardness -
     enough to matter for gating, not enough to skip a tier */
  const POW_ADJ = { '-2': -1, '-1': 0, '0': 0, '1': 0, '2': 1, '3': 1 };

  function apply(base, p) {
    p = p || NONE;
    const o = {};
    for (const k in base) o[k] = base[k];
    if ('dmg' in base)    o.dmg = Math.max(1, Math.round(base.dmg * p.dmg));
    if ('spd' in base)    o.spd = Math.max(0.05, r2(base.spd * p.spd));
    if ('dur' in base)    o.dur = Math.max(1, Math.round(base.dur * p.dur));
    if ('crit' in base)   o.crit = Math.max(0, Math.round(base.crit + p.crit));
    /* armour takes 60% of the prefix's damage swing: a Rusted helm
       should sting without being unwearable */
    if ('armour' in base) o.armour = Math.max(1, Math.round(base.armour * (1 + (p.dmg - 1) * 0.6)));
    if ('heal' in base)   o.heal = Math.max(1, Math.round(base.heal * p.dmg));
    if ('buff' in base)   o.buff = r2(base.buff * p.dmg);
    if ('pow' in base)    o.pow = Math.max(1, base.pow + (POW_ADJ[String(p.tier)] || 0));
    return o;
  }

  /* ---- the Reroll Anvil ----------------------------------
     Pure: hands back a NEW item, never touches the one you gave
     it, so the UI can show before/after side by side and the
     player can decline. Rebuilds the display name from the stem
     craft() stored (adjective + noun, no prefix). */
  function reroll(item, luck, rng) {
    const p = roll(luck, rng);
    const out = {};
    for (const k in item) out[k] = item[k];
    const stats = apply(item.base || item, p);
    for (const k in stats) out[k] = stats[k];
    out.prefix = p.id;
    out.prefixTier = p.tier;
    out.effect = p.effect || null;
    out.name = ((p.name ? p.name + ' ' : '') + (item.stem || item.name)).trim();
    out.rerolls = (item.rerolls || 0) + 1;
    return out;
  }

  /* ---- tooltips ------------------------------------------ */
  const pct = (v) => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';
  const TIER_NAME = { '-2': 'Junk', '-1': 'Poor', '0': 'Plain', '1': 'Good', '2': 'Great', '3': 'LEGENDARY' };
  /* rarity colours, palette names only - never hex (see pal.js) */
  const TIER_PAL = { '-2': 'RUST.1', '-1': 'BONE.0', '0': 'BONE.2', '1': 'WATER.2', '2': 'GOLD.2', '3': 'ROT.3' };

  /* what a legendary actually does, for the tooltip and for combat
     to look up by key */
  const EFFECT = {
    lifesteal: 'heals you for 8% of the damage you deal',
    chain: 'every third hit forks to a second enemy',
    quake: 'a charged hit shakes loose the tiles around it'
  };

  function describe(p) {
    p = typeof p === 'string' ? byId[p] : p;
    if (!p) return '';
    if (p.id === 'none') return 'Plain. No modifier.';
    const bits = [];
    if (p.dmg !== 1) bits.push(pct(p.dmg) + ' dmg');
    if (p.spd !== 1) bits.push(pct(p.spd) + ' speed');
    if (p.crit) bits.push((p.crit > 0 ? '+' : '') + p.crit + ' crit');
    if (p.dur !== 1) bits.push(pct(p.dur) + ' durability');
    if (p.effect) bits.push(EFFECT[p.effect] || p.effect);
    return p.name + ': ' + bits.join(', ');
  }

  const tierName = (t) => TIER_NAME[String(t)] || 'Plain';
  const tierPal = (t) => TIER_PAL[String(t)] || 'BONE.2';
  const get = (id) => byId[id] || NONE;

  return { all, byId, NONE, CAP, EFFECT, LUCK_MAX,
           roll, odds, weightOf, apply, reroll, describe, get, tierName, tierPal };
})();
