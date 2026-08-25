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
    { spr: 'npc_market',   name: 'a fishwife',   lines: [
      'Twelve fruit and not one of them ripe.',
      'You used to be taller. Or thinner. One of them.'] },
    { spr: 'npc_tackler',  name: 'a netmender',  lines: [
      'Something out past the Gate keeps taking my nets.',
      'Mend, cast, lose. Mend, cast, lose.'] },
    { spr: 'npc_stabler',  name: 'a stablehand', lines: [
      'The seahorses will not go near the mine mouth today.',
      'They eat better than we do.'] },
    { spr: 'npc_scholar',  name: 'a scribe',     lines: [
      'I am writing down what happened. It is not flattering.',
      'The Deep keeps courtiers with eight arms each. I counted.'] },
    { spr: 'npc_guard',    name: 'a gate guard', lines: [
      'Move along. Slowly, in your case.',
      'Nobody through the Gate who cannot swim back.'] },
    { spr: 'npc_smith',    name: 'a smith\'s boy', lines: [
      'He makes me pump the bellows all day.',
      'Bring us ore and he will stop shouting.'] },
    { spr: 'npc_bookie',   name: 'a tout',       lines: [
      'Odds on the old king? Nobody will take that bet.',
      'Put a clam on yourself. Somebody should.'] }
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
      /* and say something, once, when he walks into them */
      if (near && f.sayT <= 0 && Math.abs(P.vx) > 8) {
        f.sayT = 6;
        S.say('"' + f.who.lines[f.line % f.who.lines.length] + '"  - ' + f.who.name, 'BONE.2');
        f.line++;
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
      /* a speech tick so you can see who just spoke */
      if (f.sayT > 4.6) {
        KD.Screen.rect(px + (s.w >> 1) - 1, py - 6, 3, 4, 'BONE.2');
        KD.Screen.rect(px + (s.w >> 1) - 1, py - 2, 1, 2, 'BONE.0');
      }
    }
  }
  return { list, seed, clear, update, draw };
})();
