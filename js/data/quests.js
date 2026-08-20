/* ============================================================
   quests.js - quest templates + generator. Progress is driven by
   DZ.State.event(kind, payload) calls from every scene.
   ============================================================ */
DZ.Quests = (function () {
  const U = DZ.Util;

  /* each template builds a concrete quest object */
  const TEMPLATES = [
    { id: 'catch_any', tier: 0, make: (d) => {
        const n = 8 + d * 6;
        return { kind: 'catch', need: n, text: 'Catch ' + n + ' fish of any kind', clams: 60 + d * 40, sp: 0 };
      } },
    { id: 'catch_sp', tier: 0, make: (d) => {
        const pool = DZ.Species.list.filter((s) => s.zone <= Math.min(3, d));
        const sp = U.pick(pool);
        const n = Math.max(2, 5 - Math.floor(sp.value / 40)) + Math.floor(d / 2);
        return { kind: 'catch', species: sp.id, need: n, text: 'Bring back ' + n + ' x ' + sp.name,
                 clams: 70 + sp.value * n * 0.5, sp: sp.value > 100 ? 1 : 0 };
      } },
    { id: 'sell', tier: 0, make: (d) => {
        const n = 150 + d * 180;
        return { kind: 'sell', need: n, text: 'Sell ' + n + ' clams worth of fish', clams: 90 + d * 55, sp: 0 };
      } },
    { id: 'feed', tier: 0, make: (d) => {
        const n = 4 + d * 2;
        return { kind: 'feed', need: n, text: 'Feed your dolphins ' + n + ' times', clams: 70 + d * 35, sp: 0 };
      } },
    { id: 'level', tier: 1, make: (d) => {
        const n = 3 + d;
        return { kind: 'level', need: n, text: 'Get a dolphin to level ' + n, clams: 150 + d * 90, sp: 1 };
      } },
    { id: 'race_win', tier: 1, make: (d) => {
        const n = 1 + Math.floor(d / 3);
        return { kind: 'race_win', need: n, text: 'Win ' + n + ' race' + (n > 1 ? 's' : ''), clams: 200 + d * 110, sp: 1 };
      } },
    { id: 'bet', tier: 1, make: (d) => {
        const n = 120 + d * 140;
        return { kind: 'bet', need: n, text: 'Win ' + n + ' clams from betting', clams: 160 + d * 90, sp: 1 };
      } },
    { id: 'combo', tier: 1, make: (d) => {
        const n = 5 + d;
        return { kind: 'combo', need: n, text: 'Hit a x' + n + ' catch combo on one dive', clams: 180 + d * 70, sp: 1 };
      } },
    { id: 'zone', tier: 1, make: (d) => {
        const z = U.clamp(1 + Math.floor(d / 2), 1, 3);
        return { kind: 'zone', need: 1, zone: z, text: 'Dive in ' + DZ.ZONES[z].name, clams: 140 + z * 130, sp: 1 };
      } },
    { id: 'breed', tier: 2, make: (d) => ({ kind: 'breed', need: 1, text: 'Breed a new dolphin', clams: 320, sp: 2 }) },
    { id: 'evil', tier: 2, make: (d) => ({ kind: 'evil', need: 1, text: 'Corrupt a dolphin in the Vat', clams: 500, sp: 2 }) },
    { id: 'skill', tier: 2, make: (d) => {
        const n = 3 + Math.floor(d / 2);
        return { kind: 'skill', need: n, text: 'Learn ' + n + ' skills across your stable', clams: 260 + d * 80, sp: 1 };
      } },
    { id: 'shark', tier: 2, make: (d) => ({ kind: 'shark', need: 1, text: 'Punch Gary the shark in the face', clams: 420, sp: 2 }) },
    { id: 'gear', tier: 2, make: (d) => ({ kind: 'gear', need: 1, text: 'Upgrade any piece of gear', clams: 150, sp: 0 }) },
    { id: 'staff', tier: 2, make: (d) => ({ kind: 'staff', need: 1, text: 'Hire a staff member', clams: 220, sp: 1 }) }
  ];

  const GIVERS = [
    { name: 'Old Man Mackerel', col: '#ffd24a', line: 'Back in my day we caught fish with our TEETH.' },
    { name: 'Mayor Blowhole',   col: '#7ff0ff', line: 'The town demands... aquatic content.' },
    { name: 'Chef Brine',       col: '#ff9a3c', line: 'I need ingredients. Do not ask why.' },
    { name: 'The Kelp Cult',    col: '#40d492', line: 'The green one hungers. Also hello.' },
    { name: 'Shady Sal',        col: '#a86bff', line: 'No questions. Just fish.' },
    { name: 'Poseidon (probably)', col: '#ff9ed2', line: 'I am definitely a god and not a guy in a costume.' }
  ];

  function make(day, avoidIds) {
    const d = Math.floor(day / 3);
    const pool = TEMPLATES.filter((t) => t.tier <= (day < 4 ? 0 : day < 9 ? 1 : 2) && !(avoidIds || []).includes(t.id));
    const t = U.pick(pool.length ? pool : TEMPLATES);
    const q = t.make(d);
    const giver = U.pick(GIVERS);
    return Object.assign({
      id: U.uid(), tid: t.id, have: 0, done: false, claimed: false,
      giver: giver.name, giverCol: giver.col, line: giver.line, day
    }, q, { clams: Math.round(q.clams) });
  }

  function refresh(state) {
    const active = state.quests.filter((q) => !q.claimed);
    const want = 3 + (state.ranch.board || 0);
    const ids = active.map((q) => q.tid);
    while (active.length < want) {
      const q = make(state.day, ids);
      ids.push(q.tid);
      active.push(q);
    }
    state.quests = active;
  }

  /* called by State.event */
  function progress(state, kind, payload) {
    let advanced = false;
    for (const q of state.quests) {
      if (q.done || q.kind !== kind) continue;
      let amt = 0;
      switch (kind) {
        case 'catch':
          if (!q.species || q.species === payload.species) amt = payload.n || 1;
          break;
        case 'sell': amt = payload.clams || 0; break;
        case 'feed': amt = 1; break;
        case 'level': if ((payload.level || 0) >= q.need) amt = q.need; break;
        case 'race_win': amt = 1; break;
        case 'bet': amt = payload.clams || 0; break;
        case 'combo': if ((payload.combo || 0) >= q.need) amt = q.need; break;
        case 'zone': if (payload.zone === q.zone) amt = 1; break;
        case 'breed': case 'evil': case 'shark': case 'gear': case 'staff': amt = 1; break;
        case 'skill': amt = payload.n || 1; break;
      }
      if (amt > 0) {
        q.have = Math.min(q.need, q.have + amt);
        advanced = true;
        if (q.have >= q.need && !q.done) {
          q.done = true;
          DZ.State.toast('QUEST DONE: ' + q.text, '#ffd24a');
          DZ.Audio.play('happy');
        }
      }
    }
    return advanced;
  }
  return { TEMPLATES, GIVERS, make, refresh, progress };
})();
