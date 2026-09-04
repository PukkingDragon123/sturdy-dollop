/* ============================================================
   sim/santa.js - Santa the Manta, who stayed.

   He drifts outside your shack, bobbing, and he is three things
   at once: the only quest giver in the game, the ferry between
   zones you have already reached, and the one voice that is on
   your side. Walk up to him and press USE.

   He is not a shop and he is not in a building, because the whole
   point of him is that he is OUT here, in the cold, waiting, and
   has been for four seasons.
   ============================================================ */
KD.Santa = (function () {
  const TS = 8;
  let x = 0, y = 0, t = 0, face = 1, home = 0, spoken = 0;
  let mode = 'idle';                   // idle | talk | travel
  let line = '', lineT = 0, pick = 0;
  let ready = false;

  const LOOSE = [
    'HO! There he is. Still upright. Marvellous.',
    'I have been out here the whole time, majesty. It is quite pleasant once you stop noticing.',
    'She sent nothing. Not a word. I checked twice, in case.',
    'Climb on any time you like. I am a manta. It is what I am FOR.',
    'The trench is cold and the company is worse. You will be fine.'
  ];

  function place() {
    const m = KD.Gen.meta;
    if (!m || !m.spawn) return;
    /* Well clear of the shack door. He used to hover five tiles from it,
       which put him inside the doorway's own hit box - pressing USE next to
       him walked you into the house instead of talking to him. */
    /* In the cove he waits on the far side of your own door, west of the
       shack - the yard east of it is the bin, the crate, the board and the
       plot, and a manta parked on top of the seed crate is a manta you
       cannot buy seeds through. */
    if (m.home) {
      x = (m.home.x - 8) * TS;
      y = (m.home.floor - 2) * TS;
      return;
    }
    const v = m.village;
    const b = v && v.buildings.find((q) => q.kind.home);
    const away = b ? -(b.doorSide || -1) : 1;      // opposite side from the door
    let tx = m.spawn.x + away * 11;
    const clear = (cx) => {
      if (!KD.World.inside(cx, m.spawn.y)) return false;
      for (let j = 0; j <= 4; j++) if (KD.World.solid(cx, m.spawn.y - j)) return false;
      return true;
    };
    for (let k = 0; k < 14 && !clear(tx); k++) tx += away;
    home = tx * TS;
    x = home; y = (m.spawn.y - 3) * TS;
    ready = true;
    mode = 'idle'; line = ''; lineT = 0;
  }

  /* which zones he will take you to: the ones you have already reached */
  function stops() {
    const S = KD.State.S;
    const out = [];
    for (const z of KD.Zones.Z) {
      if (z.id === 'gate') continue;
      const why = KD.Goal.why(S, z.id);
      const reached = !why || z.id === 'mine' || z.id === 'village';
      if (reached) out.push(z);
    }
    return out;
  }

  /* Two radii. He NOTICES you from a long way off and swims over; you can
     only talk to him once he has arrived. One radius meant he only
     approached when you were already close enough to talk, which is to say
     never. */
  function notices() {
    const P = KD.Player.P;
    return ready && Math.abs(P.x - x) < 170 && Math.abs(P.y - y) < 120;
  }
  function near() {
    const P = KD.Player.P;
    return ready && Math.abs(P.x - x) < 34 && Math.abs(P.y - y) < 44;
  }

  function talk() {
    const biz = KD.Quests.forJob('santa');
    if (biz) {
      if (biz.offer) { line = biz.q.text; KD.Quests.accept(biz.q); lineT = 6; mode = 'talk'; return; }
      if (biz.ready && KD.Quests.turnIn(biz.q)) {
        line = 'HO HO! Look at that. Look at YOU.'; lineT = 5; mode = 'talk'; return;
      }
      line = biz.q.hint; lineT = 5; mode = 'talk';
      KD.Sfx.play('click');
      return;
    }
    line = LOOSE[spoken++ % LOOSE.length]; lineT = 5; mode = 'talk';
    KD.Sfx.play('click');
  }

  function travel() { mode = 'travel'; pick = 0; KD.Sfx.play('open'); }

  function ride(z) {
    const P = KD.Player.P;
    const tx = Math.round(z.x0 + (z.x1 - z.x0) * 0.12);
    let ty = KD.Gen.surfaceAt(tx) - 3;
    for (let k = 0; k < 30 && KD.World.solid(tx, ty); k++) ty--;
    P.x = tx * TS + 4; P.y = ty * TS; P.vx = P.vy = 0;
    KD.Scenes.play.snapCam();
    mode = 'idle';
    KD.State.say('Santa drops you at ' + z.name + '. "Mind the hat."', 'WATER.3');
    KD.Sfx.play('splash');
    KD.Fx.shake(4);
    /* he follows you there, because of course he does */
    x = P.x + 40; y = P.y - 24; home = x;
  }

  function update(dt, S) {
    if (!ready) { place(); return; }
    t += dt;
    if (lineT > 0) lineT -= dt;
    else if (mode === 'talk') mode = 'idle';
    const P = KD.Player.P;
    /* he bobs, and drifts toward you when you are close, and always faces you */
    const want = notices() ? P.x + (P.x < x ? 26 : -26) : home;
    x += (want - x) * Math.min(1, dt * (notices() ? 2.6 : 1.2));
    const wy = notices() ? P.y - 26 : y;
    y += (wy - y) * Math.min(1, dt * 1.2);
    face = P.x > x ? 1 : -1;
    if (mode === 'travel') {
      const list = stops();
      if (KD.In.isHit('ArrowDown', 'KeyS')) pick = Math.min(list.length - 1, pick + 1);
      if (KD.In.isHit('ArrowUp', 'KeyW')) pick = Math.max(0, pick - 1);
      if (KD.In.isHit('Enter', 'Space')) { if (list[pick]) ride(list[pick]); }
      if (KD.In.isHit('Escape', 'KeyQ')) mode = 'idle';
      return;
    }
    if (!near()) return;
    if (KD.In.isHit('KeyE') || KD.In.actHit('use')) talk();
    if (KD.In.isHit('KeyR') || KD.In.actHit('ride')) travel();
  }

  function draw(ctx, cam) {
    if (!ready) return;
    const bob = Math.sin(t * 1.7) * 3;
    const name = KD.PX.hasAny('mt_santa')
      ? (mode === 'talk' && KD.PX.has('mt_santa2') ? 'mt_santa2' : KD.PX.frameOf('mt_santa', t * 0.9))
      : null;
    if (!name || !KD.PX.has(name)) return;
    const s = KD.PX.get(name);
    const px = Math.round(x - cam.x), py = Math.round(y + bob - cam.y);
    KD.PX.blit(ctx, name, px, py, { flipX: face < 0 });
    /* a prompt when you are in range, and his line when he has one */
    if (mode === 'talk' && line) {
      KD.Talk.say(line, x, y + bob - s.h + 6, cam, KD.Game.t, { max: 180, maxLines: 3 });
    } else if (near()) {
      /* On a plate. Loose over open water this was two grey words you had to
         hunt for, and it is the prompt that opens half the game. */
      const wxp = x - cam.x, wyp = y + bob - cam.y - s.h - 8;
      KD.Screen.defer((z) => {
        const bx = Math.round(wxp * z), by = Math.round(wyp * z);
        const lab = KD.touch ? 'USE  TALK   -   RIDE  TRAVEL' : 'E  TALK   -   R  RIDE';
        const lw = KD.Text.width(lab, { tiny: true }) + 12;
        const lx = Math.max(2, Math.min(KD.W - lw - 2, bx - (lw >> 1)));
        KD.Screen.rect(lx, by - 2, lw, 12, 'INK.0');
        KD.Screen.frame(lx, by - 2, lw, 12, 'KELP.1');
        KD.Screen.rect(lx + 1, by - 1, lw - 2, 1, 'KELP.0');
        KD.Text.draw(lab, lx + (lw >> 1), by + 1, 'KELP.3', { tiny: true, align: 'center' });
      });
    }
  }

  /* the travel list is a panel, so it draws at 1:1 after the world lens
     closes rather than inside it at double size */
  const hud = () => { if (mode === 'travel') travelPanel(); };

  function travelPanel() {
    const list = stops();
    const w = 168, h = 26 + list.length * 12;
    const px = Math.round((KD.W - w) / 2), py = Math.round((KD.H - h) / 2);
    const p = KD.UI.titled(px, py, w, h, 'CLIMB ON');
    list.forEach((z, i) => {
      const ry = p.iy + i * 12;
      const on = i === pick;
      const hot = KD.UI.inside(px + 4, ry - 2, w - 8, 11);
      if (on || hot) KD.Screen.rect(px + 4, ry - 2, w - 8, 11, 'DEEP.1');
      KD.Text.draw(z.name, px + 8, ry, on ? 'WHITE' : 'BONE.1', { tiny: true });
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) { KD.In.consumedClick(); ride(z); }
    });
    KD.Text.draw(KD.touch ? 'tap a stop' : 'up/down   ENTER go   ESC stay',
      px + w / 2, py + h - 11, 'INK.3', { tiny: true, align: 'center' });
  }
  const busy = () => mode === 'travel';
  return { update, draw, hud, place, near, busy, get x() { return x; }, get y() { return y; } };
})();
