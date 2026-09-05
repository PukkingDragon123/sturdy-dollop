/* ============================================================
   scenes/swim.js - swimming with one of them.

   BOND is the gate on an animal's moves: a dolphin you have
   never got in the water with knows how to headbutt something,
   and that is all. Corkscrew at forty-five, Breach at seventy.
   So this is not a nice extra - it is how a fighter is made, and
   it needs to be worth four minutes of a day.

   The mechanic is the one thing a dolphin does that nothing else
   in the sea does: it PORPOISES. It arcs up, breaks the surface,
   and comes back down, over and over, and if you are alongside
   it you can go up with it. Press at the top of the arc and you
   break together; miss and you go under while it flies.

   A chain of them is worth more than the sum, because the whole
   point is the two of you getting into a rhythm.
   ============================================================ */
KD.Scenes.swim = (function () {
  const P = KD.Pod;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);
  let t = 0, d = null, phase = 'in', pt = 0;
  let arc = 0, arcT = 0, period = 1.35, chain = 0, best = 0, leaps = 0;
  let bonded = 0, gained = [], flash = 0, missT = 0, hitT = 0;
  let camX = 0;
  const TARGET = 8;               // how many arcs a session runs for

  function enter() {
    t = 0; pt = 0; phase = 'in';
    arc = 0; arcT = 0; chain = 0; best = 0; leaps = 0;
    bonded = 0; gained = []; flash = 0; missT = 0; hitT = 0; camX = 0;
    d = P.active();
    if (!d) { KD.Game.go('pens', {}); return; }
    KD.Day.spend(20);
    period = 1.55 - Math.min(0.55, (d.spd || 10) * 0.012);
    KD.Sfx.play('open');
  }

  function update(dt) {
    t += dt; pt += dt;
    if (flash > 0) flash -= dt;
    if (missT > 0) missT -= dt;
    if (hitT > 0) hitT -= dt;
    camX += dt * 46;
    KD.Fx.update(dt);

    if (phase === 'in') {
      if (pt > 1.2 || press()) { phase = 'run'; pt = 0; arcT = 0; }
      return;
    }
    if (phase === 'run') {
      arcT += dt;
      if (arcT >= period) {
        /* it came down without you */
        arcT -= period;
        arc++;
        if (!scored) { chain = 0; missT = 0.5; }
        scored = false;
        if (arc >= TARGET) { done(); return; }
      }
      if (press() && !scored) {
        /* how close to the top of the arc? */
        const f = arcT / period;
        const off = Math.abs(f - 0.5);
        scored = true;
        if (off < 0.07) {
          chain++; best = Math.max(best, chain); leaps++;
          bonded += 3 + chain;
          hitT = 0.4; flash = 0.25;
          KD.Sfx.play('crit');
        } else if (off < 0.15) {
          chain = Math.max(1, chain);
          leaps++;
          bonded += 2;
          hitT = 0.25;
          KD.Sfx.play('hit');
        } else {
          chain = 0; missT = 0.5;
          KD.Sfx.play('deny');
        }
      }
      return;
    }
    if (phase === 'done') {
      if (pt > 0.8 && press()) { KD.State.save(); KD.Game.go('pens', {}); }
      return;
    }
  }
  let scored = false;

  const press = () => KD.In.isHit('Space', 'Enter', 'KeyE') || KD.In.mouse.click ||
                      KD.In.actHit('act', 'use');

  function done() {
    phase = 'done'; pt = 0;
    const n = Math.round(bonded * 0.55);
    gained = P.bondUp(d, n);
    d.xp = (d.xp || 0) + 10 + leaps * 3;
    P.levelCheck(d);
    KD.State.save();
    KD.Sfx.play('levelup');
  }

  /* ================================================================
     THE OPEN WATER
     ================================================================ */
  function sea() {
    const W = KD.W, H = KD.H;
    const surf = Math.round(H * 0.30);
    /* Sky above the line, water below - and the sky is WARM, because the
       first pass painted it in the same teals as the sea and there was no
       horizon at all. Nine bands, weighted so the deep colour holds the
       top and the light collects in a few thin bands at the waterline;
       five even bands of full-strength colour just read as a flag. */
    const SKY = [[0.00, 'INK.0'], [0.22, 'INK.1'], [0.42, 'INK.2'],
                 [0.58, 'ROT.0'], [0.70, 'RUST.0'], [0.79, 'RUST.1'],
                 [0.86, 'RUST.2'], [0.91, 'GOLD.2'], [0.95, 'GOLD.3'],
                 [0.98, 'SAND.3']];
    for (let k = 0; k < SKY.length; k++) {
      const y0 = Math.round(surf * SKY[k][0]);
      const y1 = k + 1 < SKY.length ? Math.round(surf * SKY[k + 1][0]) : surf;
      R(0, y0, W, Math.max(1, y1 - y0), SKY[k][1]);
    }
    const BANDS = [[0, 'WATER.2'], [0.16, 'WATER.1'], [0.42, 'WATER.0'],
                   [0.70, 'DEEP.2'], [0.90, 'DEEP.1']];
    for (let i = 0; i < BANDS.length; i++) {
      const y0 = surf + Math.round((H - surf) * BANDS[i][0]);
      const y1 = i + 1 < BANDS.length ? surf + Math.round((H - surf) * BANDS[i + 1][0]) : H;
      R(0, y0, W, y1 - y0, BANDS[i][1]);
    }
    /* the sun: low, big enough to be the sun, with a track of broken
       light down the water underneath it */
    const sx = Math.round(W * 0.74);
    const sy = Math.round(surf * 0.80);
    for (let r = -8; r <= 8; r++) {
      const w = Math.round(Math.sqrt(Math.max(0, 81 - r * r)) * 2);
      if (w <= 0) continue;
      R(sx - (w >> 1), sy + r, w, 1, r < -2 ? 'WHITE' : r < 4 ? 'SAND.3' : 'GOLD.3');
    }
    for (let k = 0; k < 40; k++) {
      const w = 5 + k * 2;
      const yy = surf + 2 + k * 2;
      if (yy > H) break;
      const off = Math.round(Math.sin(yy * 0.21 + t * 1.6) * 4);
      R(sx - (w >> 1) + off, yy, w, k % 3 ? 2 : 1,
        k < 12 ? 'WATER.3' : 'WATER.2');
    }
    /* the surface itself: a real swell, a white cap, and a lit face */
    for (let x = 0; x < W; x += 2) {
      const wx = x + camX;
      const y = surf + Math.round(Math.sin(wx * 0.045) * 3 + Math.sin(wx * 0.013 - t) * 2);
      R(x, y - 2, 2, 2, 'WHITE');
      R(x, y, 2, 3, 'WATER.3');
      R(x, y + 3, 2, 3, 'WATER.2');
      if (((x >> 1) + ((t * 8) | 0)) % 13 === 0) R(x, y - 4, 1, 1, 'WHITE');
    }
    /* cloud bars, and a couple of gulls */
    for (let i = 0; i < 5; i++) {
      const x = Math.round(((i * 121 - camX * 0.18) % (W + 80)) - 40);
      const y = 6 + (i % 3) * 7;
      R(x, y, 34 - i * 3, 3, 'INK.3');
      R(x + 4, y - 2, 20 - i * 2, 2, 'ROT.1');
    }
    /* silt, moving past, so you can feel the speed */
    for (let i = 0; i < 34; i++) {
      const x = Math.round(((i * 173 - camX * 2.2) % (W + 40) + W + 40) % (W + 40)) - 20;
      const y = surf + 6 + Math.round((i * 61) % (H - surf - 8));
      R(x, y, 2, 1, i % 3 ? 'WATER.2' : 'WATER.3');
    }
    return surf;
  }

  function draw(ctx) {
    const surf = sea();
    const W = KD.W, H = KD.H;
    const f = phase === 'run' ? arcT / period : 0.5;
    /* the arc: a parabola through the surface. At f = 0.5 it is at the
       very top of the leap, which is the moment you are timing. */
    const rise = Math.sin(f * Math.PI) * 46;
    const dy = surf + 16 - rise;
    const dx = Math.round(W * 0.52);

    /* its wake, and the spray when it breaks */
    for (let k = 1; k < 9; k++) {
      const wf = Math.max(0, f - k * 0.03);
      const wr = Math.sin(wf * Math.PI) * 46;
      const wy = surf + 16 - wr;
      R(dx - 40 - k * 9, wy + 20, 8, 2, k < 4 ? 'WATER.3' : 'WATER.2');
    }
    if (rise > 26) {
      /* spray thrown sideways off the break - a RING of it read as a
         second timing marker competing with the real one */
      const k = (rise - 26) / 20;
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1;
        const sp = (i >> 1) / 8;
        const px = dx + side * (10 + sp * 34 * k);
        const py = surf + 10 - sp * 16 * k + ((i * 5) % 4);
        R(px, py, 2 + ((i + 1) % 2), 2, sp < 0.4 ? 'WHITE' : 'WATER.3');
      }
    }

    /* You, holding the dorsal, drawn BEHIND the animal so only your top
       half clears its back. The first pass gave you your own arc a beat
       behind, which put a man STANDING on open water next to a leaping
       dolphin. */
    const kr = missT > 0 ? Math.max(0, rise - 30) : rise;
    const ky = surf - 4 - kr + (missT > 0 ? 18 : 0);
    const kx = Math.round(dx - 40);
    const kn = KD.PX.hasAny('pk_swim') ? KD.PX.frameOf('pk_swim', t * 0.6) : 'pk_idle';
    if (KD.PX.has(kn)) {
      KD.PX.blit(ctx, kn, kx, Math.round(ky), { anchor: false });
    }
    /* the animal, over the top of you */
    const pose = phase === 'run' ? (rise > 22 ? 'charge' : (f < 0.5 ? 'cruise0' : 'cruise1'))
                                 : 'cruise0';
    KD.Dolph.draw(ctx, d, pose, dx - KD.Dolph.W / 2, dy - KD.Dolph.H / 2, {});

    /* The beat marker: a ring on the water that closes as the arc peaks.
       It used to be centred at the top of the leap, which drew twelve
       dots straight across the animal at the exact moment you are meant
       to be looking at it. */
    if (phase === 'run') {
      const off = Math.abs(f - 0.5);
      const r = Math.round(7 + off * 62);
      const col = off < 0.07 ? 'KELP.3' : off < 0.15 ? 'GOLD.3' : 'WATER.3';
      const ry = surf + 34;
      for (let a = 0; a < 16; a++) {
        const ang = a / 16 * Math.PI * 2;
        R(dx + Math.cos(ang) * r - 1, ry + Math.sin(ang) * r * 0.42 - 1, 3, 3, col);
      }
      /* and the mark it is closing on */
      R(dx - 5, ry - 1, 3, 3, 'BONE.2');
      R(dx + 3, ry - 1, 3, 3, 'BONE.2');
    }

    /* the strip */
    R(0, 0, W, 13, 'INK.0');
    R(0, 13, W, 1, 'WATER.1');
    KD.Text.draw('SWIMMING WITH ' + d.name.toUpperCase(), 5, 3, 'WATER.3', { tiny: true });
    KD.Text.draw('LEAP ' + Math.min(TARGET, arc + 1) + '/' + TARGET, W / 2, 3, 'BONE.2',
                 { tiny: true, align: 'center' });
    KD.Text.draw('BOND ' + Math.round(d.bond || 0) + '%', W - 5, 3, 'CORAL.3',
                 { tiny: true, align: 'right' });
    if (chain > 1) {
      KD.Text.draw(chain + ' TOGETHER', W / 2, 18, 'KELP.3',
                   { align: 'center', shadow: 'INK.0' });
    }
    if (hitT > 0) {
      KD.Text.draw('WITH IT', dx, dy - 34, 'KELP.3', { align: 'center', shadow: 'INK.0' });
    }
    if (missT > 0) {
      KD.Text.draw('UNDER', kx + 10, ky + 22, 'BLOOD.3', { align: 'center', shadow: 'INK.0' });
    }
    if (flash > 0) R(0, 0, W, H, 'WHITE');

    if (phase === 'in') {
      const s = 'Get alongside it. Press at the TOP of the arc.';
      const tw = KD.Text.width(s, { tiny: true }) + 16;
      R((W - tw) / 2, H - 40, tw, 14, 'INK.0');
      KD.Screen.frame((W - tw) / 2, H - 40, tw, 14, 'WATER.1');
      KD.Text.draw(s, W / 2, H - 37, 'BONE.2', { tiny: true, align: 'center' });
    }
    if (phase === 'run') {
      const hs = KD.touch ? 'TAP AT THE TOP' : 'SPACE AT THE TOP';
      const hw = KD.Text.width(hs, { tiny: true }) + 14;
      R((W - hw) / 2, H - 17, hw, 12, 'INK.0');
      KD.Text.draw(hs, W / 2, H - 14, 'BONE.2', { tiny: true, align: 'center' });
    }
    if (phase === 'done') card();
  }

  function card() {
    const w = Math.min(270, KD.W - 30), h = 86;
    const x = Math.round((KD.W - w) / 2), y = Math.round((KD.H - h) / 2);
    const k = KD.Juice.outCubic(Math.min(1, pt / 0.3));
    const yy = Math.round(y + (1 - k) * 12);
    R(x - 2, yy - 2, w + 4, h + 4, 'INK.0');
    R(x, yy, w, h, 'DEEP.0');
    KD.Screen.frame(x, yy, w, h, 'CORAL.1');
    KD.Text.draw('OUT OF THE WATER', KD.W / 2, yy + 6, 'CORAL.3',
                 { align: 'center', shadow: 'INK.0' });
    KD.Text.draw('Together', x + 12, yy + 26, 'BONE.0', { tiny: true });
    KD.Text.draw(leaps + ' of ' + TARGET, x + w - 12, yy + 25, 'BONE.2',
                 { align: 'right' });
    KD.Text.draw('Best chain', x + 12, yy + 40, 'BONE.0', { tiny: true });
    KD.Text.draw(String(best), x + w - 12, yy + 39, 'KELP.3', { align: 'right' });
    KD.Text.draw('Bond', x + 12, yy + 54, 'BONE.0', { tiny: true });
    KD.Text.draw(Math.round(d.bond) + '%', x + w - 12, yy + 53, 'CORAL.3', { align: 'right' });
    if (gained.length) {
      KD.Text.draw('LEARNED: ' + gained.map((m) => m.name).join(', '),
                   KD.W / 2, yy + 68, 'GOLD.3',
                   { tiny: true, align: 'center', max: w - 20 });
    }
    KD.Text.draw(KD.touch ? 'tap to go back' : 'SPACE to go back',
                 KD.W / 2, yy + h + 8, 'INK.3', { tiny: true, align: 'center' });
  }

  return { enter, update, draw };
})();
