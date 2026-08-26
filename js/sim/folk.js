/* ============================================================
   sim/folk.js - the people of Fruitfall, out on the street.

   The shopkeepers live in their fruit; these are everyone else.
   They pace their own terrace, stop to look at things, turn
   around at the edges, and say one line if you walk into them.
   Nothing here is a quest - it is just so the town is not an
   empty film set with lit windows.
   ============================================================ */
KD.Folk = (function () {
  const TS = 8;
  const list = [];

  /* Who is out. Each picks a sprite from the NPC set already drawn, so
     nobody in the street is a stranger to the art. */
  const WHO = [
    { spr: 'fk_seahorse', port: 'po_seahorse', name: 'Tack the stablehand', lines: [
      'The seahorses will not go near the mine mouth today.',
      'They eat better than we do, and they know it.'] },
    { spr: 'fk_crab',     port: 'po_crab',     name: 'Nipper', lines: [
      'He makes me pump the bellows all day. All day.',
      'Bring us ore and he stops shouting. Bring a lot.'] },
    { spr: 'fk_puffer',   port: 'po_puffer',   name: 'Bloat the netmender', lines: [
      'Something out past the Gate keeps taking my nets.',
      'Mend, cast, lose. Mend, cast, lose. That is the job.'] },
    { spr: 'fk_octo',     port: 'po_octo',     name: 'Inkwell', lines: [
      'I am writing down what happened. It is not flattering.',
      'The Deep keeps eight-armed courtiers. I have counted them twice.'] },
    { spr: 'fk_turtle',   port: 'po_turtle',   name: 'Bulwark', lines: [
      'Move along. Slowly, in your case.',
      'Nobody goes through the Gate who cannot swim back.'] },
    { spr: 'fk_angler',   port: 'po_angler',   name: 'Lantern', lines: [
      'Odds on the old king? Nobody will take that bet.',
      'Put a clam on yourself. Somebody ought to.'] },
    { spr: 'fk_shrimp',   port: 'po_shrimp',   name: 'Snip', lines: [
      'Sit down. I will not ask what happened to you.',
      'A trim will not fix it. It will not hurt either.'] }
  ];

  function clear() { list.length = 0; }

  /* Populate once, off the village plan, so the crowd is part of the town
     rather than something that wanders in from off screen. */
  function seed() {
    clear();
    const v = KD.Gen.meta.village;
    if (!v) return;
    const Wd = KD.World;
    v.terraces.forEach((tr, ti) => {
      const n = 3 + (ti === 0 ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const who = WHO[(ti * 3 + i) % WHO.length];
        const tx = Math.round(tr.x0 + ((i + 0.5) / n) * (tr.x1 - tr.x0));
        if (!Wd.inside(tx, tr.y)) continue;
        list.push({
          who, x: tx * TS + 4, y: tr.y * TS, home: tx * TS + 4,
          x0: (tr.x0 + 2) * TS, x1: (tr.x1 - 2) * TS, floor: tr.y * TS,
          face: i & 1 ? 1 : -1, vx: 0, t: i * 1.7, anim: 0,
          state: 'walk', stateT: 1 + i * 0.6, line: 0, sayT: 0
        });
      }
    });
  }

  function update(dt, S) {
    if (!list.length) return;
    const P = KD.Player.P;
    for (const f of list) {
      f.t += dt; f.stateT -= dt;
      if (f.sayT > 0) f.sayT -= dt;
      if (f.stateT <= 0) {
        /* pace, then stop and look at something, then pace again */
        if (f.state === 'walk') { f.state = 'stand'; f.stateT = 1.2 + Math.random() * 2.6; }
        else { f.state = 'walk'; f.stateT = 1.8 + Math.random() * 3.2; f.face = Math.random() < 0.5 ? -1 : 1; }
      }
      if (f.state === 'walk') {
        f.vx = f.face * 22;
        /* turn at the ends of their own terrace, and at a wall */
        const ahead = f.x + f.face * 7;
        const t = KD.Tiles.get(KD.World.at((ahead / TS) | 0, ((f.y - 6) / TS) | 0));
        if (ahead < f.x0 || ahead > f.x1 || (t && t.solid)) f.face = -f.face;
      } else f.vx = 0;
      f.x += f.vx * dt;
      f.anim += Math.abs(f.vx) > 1 ? dt * 6 : dt * 1.2;
      /* stand still and face the king when he is right there */
      const near = Math.abs(f.x - P.x) < 22 && Math.abs(f.y - P.y) < 24;
      if (near) { f.state = 'stand'; f.stateT = 0.6; f.face = P.x > f.x ? 1 : -1; }
      /* and say something, once, when he walks into them. The line goes in
         a bubble over their own head, not into the HUD - you should be able
         to see WHO is talking. */
      if (near && f.sayT <= 0 && Math.abs(P.vx) > 8) {
        f.sayT = 5.5;
        f.said = f.who.lines[f.line % f.who.lines.length];
        f.line++;
        KD.Sfx.play('click');
      }
    }
  }

  function draw(ctx, cam) {
    const Wd = KD.World;
    for (const f of list) {
      const base = f.who.spr;
      const name = KD.PX.hasAny(base) ? KD.PX.frameOf(base, f.anim * 0.5)
                 : (KD.PX.has(base + '0') ? base + ((f.anim | 0) % 2 ? '1' : '0') : null);
      if (!name || !KD.PX.has(name)) continue;
      const s = KD.PX.get(name);
      const px = Math.round(f.x - s.w / 2 - cam.x), py = Math.round(f.y - s.h - cam.y);
      if (px > KD.W || px + s.w < 0) continue;
      const lit = Wd.lit[(((f.y - 8) / TS) | 0) * Wd.W + ((f.x / TS) | 0)] || 0;
      KD.PX.blit(ctx, name, px, py, {
        anchor: false, flipX: f.face < 0, shade: KD.PX.bandFor(lit, KD.Light.MAX)
      });
      /* their line, in a bubble of bubbles, trailing up from the mouth */
      if (f.sayT > 0 && f.said) {
        KD.Talk.say(f.said, f.x, f.y - s.h + 8, cam, KD.Game.t, { max: 150, maxLines: 2 });
      } else if (f.sayT <= 0 && f.said) f.said = null;
    }
  }
  return { list, seed, clear, update, draw };
})();
