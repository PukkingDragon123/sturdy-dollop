/* ============================================================
   dolphin.js - the star of the show.
   Dolphins are plain JSON objects so saving is trivial; all the
   behaviour lives here as functions over those objects.
   ============================================================ */
DZ.Dolphin = (function () {
  const U = DZ.Util;
  const STATS = ['speed', 'stamina', 'burst', 'agility', 'charm', 'luck'];
  const STAT_INFO = {
    speed:   { short: 'SPD', col: '#7ff0ff', blurb: 'Top speed on the straight.' },
    stamina: { short: 'STA', col: '#40d492', blurb: 'How long you can surge.' },
    burst:   { short: 'BRST', col: '#ffb347', blurb: 'Acceleration and surge power.' },
    agility: { short: 'AGI', col: '#ff9ed2', blurb: 'Dodging, cornering, shrugging off shoves.' },
    charm:   { short: 'CHM', col: '#ffd24a', blurb: 'Crowd love. Shortens your betting odds.' },
    luck:    { short: 'LCK', col: '#c8ff4a', blurb: 'Good things happen. Sometimes.' }
  };

  const SKINS = [
    { name: 'Bluebell',  p: { '1': '#5aa8d8', '2': '#2f6f9e', '3': '#cfeaf7' } },
    { name: 'Slate',     p: { '1': '#8fa6b5', '2': '#5d7484', '3': '#e6f2fa' } },
    { name: 'Rosewater', p: { '1': '#f2a0c4', '2': '#c05f8c', '3': '#ffe0ee' } },
    { name: 'Seafoam',   p: { '1': '#6fd8b0', '2': '#2f8f76', '3': '#d6fff2' } },
    { name: 'Sunbeam',   p: { '1': '#ffc95a', '2': '#c98f1c', '3': '#fff3d0' } },
    { name: 'Inkwell',   p: { '1': '#5a6bb8', '2': '#2f3a72', '3': '#c8d0ff' } },
    { name: 'Coral',     p: { '1': '#ff8f6f', '2': '#c9502f', '3': '#ffddd0' } },
    { name: 'Pearl',     p: { '1': '#e8eef2', '2': '#a8bcc8', '3': '#ffffff' } }
  ];
  const EVIL_SKIN = { '1': '#6a3fa0', '2': '#2b1046', '3': '#c9a0ff', '4': '#ff3b6b', '5': '#ff9ed2' };

  function expForLevel(n) { return Math.floor(26 * Math.pow(n, 1.62)); } // exp needed to go n -> n+1
  function level(d) {
    let lvl = 1, need = expForLevel(1), pool = d.exp;
    while (pool >= need && lvl < 99) { pool -= need; lvl++; need = expForLevel(lvl); }
    return lvl;
  }
  function levelProgress(d) {
    let lvl = 1, need = expForLevel(1), pool = d.exp;
    while (pool >= need && lvl < 99) { pool -= need; lvl++; need = expForLevel(lvl); }
    return { lvl, cur: pool, need, frac: pool / need };
  }

  function create(opts) {
    opts = opts || {};
    const skin = opts.skin !== undefined ? SKINS[opts.skin % SKINS.length] : U.pick(SKINS);
    const lvl = opts.lvl || 1;
    const base = {};
    STATS.forEach((k) => { base[k] = (opts.base && opts.base[k]) || U.rndInt(6, 11) + (lvl - 1) * 2; });
    const traits = opts.traits ? opts.traits.slice() : [DZ.Names.randTrait()];
    const d = {
      id: U.uid(),
      name: opts.name || DZ.Names.randDolphin(),
      skinName: skin.name,
      pal: Object.assign({}, skin.p),
      base, exp: opts.exp || 0, sp: opts.sp || 0,
      skills: {}, traits,
      evil: false, corrupt: 0,
      hunger: 0, fedToday: 0, mood: 0.7,
      wins: 0, races: 0, gen: opts.gen || 1,
      parents: opts.parents || null,
      born: opts.born || 1,
      note: opts.note || null
    };
    if (opts.exp === undefined && lvl > 1) d.exp = totalExpFor(lvl);
    if (opts.evil) makeEvil(d, true);
    return d;
  }
  function totalExpFor(lvl) { let t = 0; for (let i = 1; i < lvl; i++) t += expForLevel(i); return t; }

  function palette(d) {
    if (d.evil) return EVIL_SKIN;
    return d.pal;
  }

  /* effective stats: base + skills + traits + ranch spa */
  function stats(d, state) {
    const out = {};
    STATS.forEach((k) => (out[k] = d.base[k]));
    for (const id in d.skills) {
      const n = DZ.Skills.byId[id];
      if (n && n.mods) for (const k in n.mods) out[k] = (out[k] || 0) + n.mods[k];
    }
    for (const t of d.traits) {
      const T = DZ.Names.TRAITS[t];
      if (T) for (const k in T.mods) out[k] = (out[k] || 0) + T.mods[k];
    }
    if (d.evil) {
      const vat = state ? DZ.Upgrades.value(state, 'vat') : 1;
      const bonus = 1 + (vat >= 3 ? 0.5 : 0);
      out.speed += Math.round(4 * bonus);
      out.burst += Math.round(4 * bonus);
      out.stamina += Math.round(2 * bonus);
      out.charm = Math.max(1, out.charm - 6);
    }
    if (state) {
      const spa = DZ.Upgrades.value(state, 'spa');
      if (spa) STATS.forEach((k) => (out[k] = Math.round(out[k] * (1 + spa))));
      if (d.groom) out.charm += d.groom;
    }
    STATS.forEach((k) => (out[k] = Math.max(1, Math.round(out[k]))));
    return out;
  }

  function power(d, state) {
    const s = stats(d, state);
    return s.speed * 1.25 + s.stamina * 0.8 + s.burst * 0.7 + s.agility * 0.55 + s.luck * 0.3;
  }

  function addExp(d, amount, state) {
    const before = level(d);
    d.exp += Math.max(0, Math.round(amount));
    const after = level(d);
    let sp = 0;
    for (let l = before + 1; l <= after; l++) sp += 1 + (l % 5 === 0 ? 1 : 0);
    if (sp) d.sp += sp;
    if (after > before) {
      // levelling also nudges base stats so a dolphin grows even without skills
      for (let l = before; l < after; l++) {
        const k = U.pick(STATS);
        d.base[k] += 1;
        if (U.chance(0.5)) d.base[U.pick(STATS)] += 1;
      }
      if (state) DZ.State.event('level', { level: after, dolphin: d.id });
    }
    return { levels: after - before, sp, level: after };
  }

  function feed(d, food, state) {
    const fishExp = food.fishExp || 0;
    let exp = (food.exp || 1) * (10 + fishExp);
    if (d.traits.includes('hungry')) exp *= 1.25;
    if (d.mood < 0.3) exp *= 0.8;
    const res = addExp(d, exp, state);
    d.fedToday++;
    d.mood = U.clamp(d.mood + 0.14, 0, 1);
    d.hunger = Math.max(0, d.hunger - 1);
    let gainedTrait = null;
    if (food.traitChance && U.chance(food.traitChance) && d.traits.length < 4) {
      const t = DZ.Names.randTrait(d.traits);
      if (t) { d.traits.push(t); gainedTrait = t; }
    }
    if (food.stat === 'any') d.base[U.pick(STATS)] += 1;
    let becameEvil = false;
    if (food.corrupt) becameEvil = corrupt(d, food.corrupt, state);
    return { exp: Math.round(exp), levels: res.levels, sp: res.sp, trait: gainedTrait, becameEvil, level: res.level };
  }

  function corrupt(d, amount, state) {
    if (d.evil) return false;
    d.corrupt = U.clamp((d.corrupt || 0) + amount, 0, 100);
    if (d.corrupt >= 100) { makeEvil(d); return true; }
    return false;
  }
  function makeEvil(d, quiet) {
    d.evil = true; d.corrupt = 100;
    if (!d.traits.includes('genius')) d.traits.push('genius');
    d.evilName = d.name;
    if (!quiet) {
      d.note = U.pick(DZ.Names.quipsEvil);
      DZ.State.event('evil', { dolphin: d.id });
    }
    return d;
  }
  function redeem(d) {
    d.evil = false; d.corrupt = 0;
    d.traits = d.traits.filter((t) => t !== 'genius');
    return d;
  }

  function learn(d, nodeId, state) {
    const node = DZ.Skills.byId[nodeId];
    const chk = DZ.Skills.canBuy(d, node);
    if (!chk.ok) return chk;
    d.sp -= node.cost;
    d.skills[nodeId] = true;
    if (state) DZ.State.event('skill', { n: 1 });
    return { ok: true, node };
  }

  function abilities(d) {
    const out = [];
    for (const id in d.skills) {
      const n = DZ.Skills.byId[id];
      if (n && n.ability) out.push(n.ability);
    }
    return out.slice(0, 3);
  }
  function passives(d) {
    const out = {};
    for (const id in d.skills) {
      const n = DZ.Skills.byId[id];
      if (n && n.passive) out[n.passive] = true;
    }
    return out;
  }
  function skillCount(d) { return Object.keys(d.skills).length; }

  /* ---------------- breeding ---------------- */
  function breed(a, b, lagoonLvl, day) {
    const base = {};
    const quality = 0.5 + lagoonLvl * 0.06;
    STATS.forEach((k) => {
      const avg = (a.base[k] + b.base[k]) / 2;
      const spread = (1 - quality) * 6;
      base[k] = Math.max(2, Math.round(avg * U.rnd(0.9, 1.12) + U.rnd(-spread, spread + lagoonLvl)));
    });
    const traits = [];
    const pool = U.shuffle(a.traits.concat(b.traits).filter((t) => t !== 'genius'));
    if (pool.length) traits.push(pool[0]);
    if (pool.length > 1 && U.chance(0.35 + lagoonLvl * 0.05)) traits.push(pool[1]);
    if (U.chance(0.22 + lagoonLvl * 0.04)) {
      const t = DZ.Names.randTrait(traits);
      if (t) traits.push(t);
    }
    const calf = create({
      name: DZ.Names.randDolphin(),
      base, traits, gen: Math.max(a.gen, b.gen) + 1,
      parents: [a.name, b.name], born: day || 1
    });
    // rare morphs
    const roll = Math.random();
    if (roll < 0.05 + lagoonLvl * 0.02) {
      calf.pal = { '1': '#ffd24a', '2': '#c98f1c', '3': '#fff3bf' };
      calf.skinName = 'ATLANTEAN GOLD';
      STATS.forEach((k) => (calf.base[k] += 4));
      calf.note = 'Born glowing. Neighbours concerned.';
    } else if (roll < 0.10 + lagoonLvl * 0.02) {
      calf.pal = { '1': '#c8ff4a', '2': '#7f9f1c', '3': '#f2ffd0' };
      calf.skinName = 'RADIOACTIVE LIME';
      calf.base.burst += 6; calf.base.charm -= 2;
      calf.note = 'Hums faintly. Do not lick.';
    }
    if ((a.evil || b.evil) && U.chance(0.4)) {
      calf.corrupt = 45;
      calf.note = 'Has a suspicious little smirk.';
    }
    return calf;
  }

  /* portrait-friendly draw helper used by every scene */
  function draw(ctx, d, x, y, opts) {
    opts = opts || {};
    const pal = palette(d);
    const frame = opts.frame || 0;
    const name = (opts.calf || d.calf) ? 'calf' : (frame ? 'dolphin2' : 'dolphin');
    DZ.Pixel.draw(ctx, name, x, y, Object.assign({}, opts, { recolor: pal }));
    const sz = DZ.Pixel.size(name);
    const left = opts.center ? x - sz.w / 2 : x;
    const top = opts.center ? y - sz.h / 2 : y;
    const sc = opts.scale || 1;
    if (d.evil && !opts.noHat) {
      const fx = opts.flipX ? -1 : 1;
      DZ.Pixel.draw(ctx, 'tophat', left + (opts.flipX ? sz.w - 15 : 8) * sc, top - 3 * sc,
        { scale: sc, alpha: opts.alpha, flipX: opts.flipX });
      DZ.Pixel.draw(ctx, 'stache', left + (opts.flipX ? 2 : sz.w - 9) * sc, top + 8 * sc,
        { scale: sc, alpha: opts.alpha, flipX: opts.flipX });
    }
    if (d.crown) DZ.Pixel.draw(ctx, 'crown', left + 9 * sc, top - 2 * sc, { scale: sc });
  }

  function tierName(d) {
    const l = level(d);
    if (l >= 20) return 'MYTHIC';
    if (l >= 14) return 'CHAMPION';
    if (l >= 9) return 'PRO';
    if (l >= 5) return 'ROOKIE';
    return 'PUP';
  }

  return { STATS, STAT_INFO, SKINS, create, level, levelProgress, expForLevel, totalExpFor,
           stats, power, addExp, feed, corrupt, makeEvil, redeem, learn, abilities, passives,
           skillCount, breed, draw, palette, tierName };
})();

/* feeding helpers (kept here so every scene agrees on the numbers) */
DZ.Dolphin.feedFish = function (d, sp, live, state) {
  const food = {
    exp: live ? 1.6 : 1,
    fishExp: sp.exp,
    traitChance: 0.012 + (sp.flags.rare ? 0.08 : 0),
    corrupt: sp.flags.cursed ? 16 : 0
  };
  const res = DZ.Dolphin.feed(d, food, state);
  res.what = (live ? 'live ' : '') + sp.name;
  return res;
};
DZ.Dolphin.feedFood = function (d, item, state) {
  const res = DZ.Dolphin.feed(d, Object.assign({}, item, { fishExp: 24 }), state);
  res.what = item.name;
  return res;
};
DZ.Dolphin.fishExpValue = function (sp, live) { return Math.round((live ? 1.6 : 1) * (10 + sp.exp)); };
DZ.Dolphin.foodExpValue = function (item) { return Math.round(item.exp * 34); };
