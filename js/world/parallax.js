/* ============================================================
   world/parallax.js - the ocean behind and in front of the
   world. Four scrolling depths of hand-drawn silhouette, light
   shafts, drifting life and foreground clutter. This is what
   makes the sea look like it goes somewhere.
   ============================================================ */
KD.Parallax = (function () {
  const TS = 8;

  /* ---- wind ---------------------------------------------------------
     One number the whole ocean reads: the surface waves take their phase
     from it, the clouds and the motes drift with it, and every plant leans
     into it. Before this, each of those had its own private sine and the
     sea looked like six things happening near each other. */
  const W = { t: 0, gust: 0, x: 0 };
  function wind(dt) {
    W.t += dt;
    /* a slow swell with a faster gust riding on it */
    W.gust = Math.sin(W.t * 0.21) * 0.7 + Math.sin(W.t * 0.73 + 1.3) * 0.3;
    W.x += W.gust * dt * 14;
    return W.gust;
  }
  const lean = (seed, amp) => W.gust * amp + Math.sin(W.t * 1.7 + seed) * amp * 0.35;
  /* Each band: sprite candidates, parallax factor, the world row it sits on,
     and how much it dims. Factor < 1 scrolls slower than the world (further
     away); > 1 scrolls faster (in front of it). */
  const FAR = [
    { spr: ['bg_far_reef', 'bg_far_spires', 'bg_far_arch', 'bg_far_wreck'], f: 0.12, shade: 2 },
    { spr: ['bg_mid_rocks', 'bg_mid_coral'], f: 0.26, shade: 1 }
  ];
  const MID = [
    { spr: ['bg_mid_coral', 'bg_mid_rocks'], f: 0.46, shade: 1 },
    { spr: ['bg_mid_coral'], f: 0.60, shade: 0 }
  ];
  /* No kelp band, near or mid. Tall stalks on a parallax layer hang in open
     water with their roots nowhere - they read as floating rubbish rather
     than as plants, and at 1.7x they swept across the frame faster than
     anything they were supposedly in front of. Foreground is reef only, and
     reef stands on the floor. */
  const NEAR = [
    { spr: ['fg_near_coral'], f: 1.22, shade: 0 }
  ];

  /* deterministic per-slot choice, so a band never flickers as you walk */
  function pickFor(list, slot) {
    const avail = list.filter((n) => KD.PX.hasAny(n));
    if (!avail.length) return null;
    const h = ((slot * 2654435761) ^ 0x9e3779b9) >>> 0;
    return avail[h % avail.length];
  }

  /* The ground under a band is not one height. Sampling the surface once at
     screen centre and tiling the whole row at that Y buries the sprites in
     rock on one side and floats them on the other, so every band samples the
     terrain under its own slot. `lift` raises a band off the floor, which is
     how a distant ridge reads as being further away and higher up. */
  function groundAt(worldX) {
    const tx = Math.max(0, Math.min(KD.World.W - 1, (worldX / TS) | 0));
    return KD.Gen.surfaceAt(tx) * TS;
  }
  /* `sink` is how far BELOW the local seabed a band's base sits, so what
     shows above the ground line is a distant ridge and not a wall. Lifting
     bands off the floor instead put a solid hedge of coral at roof height
     right behind the houses. */
  function band(ctx, cfg, cam, sink) {
    const first = pickFor(cfg.spr, 0);
    if (!first) return false;
    const w = KD.PX.get(first).w;
    const ox = Math.floor(cam.x * cfg.f);
    const start = Math.floor(ox / w) - 1;
    const n = Math.ceil(KD.W / w) + 2;
    for (let i = 0; i < n; i++) {
      const slot = start + i;
      const name = pickFor(cfg.spr, slot);
      if (!name) continue;
      const s = KD.PX.get(name);
      const px = slot * w - ox;
      if (px > KD.W || px + s.w < 0) continue;
      /* the world x this slot sits over, so the ground sample is honest */
      const wx = cam.x + px + s.w / 2;
      const g = groundAt(wx) - cam.y + (sink || 0) + ((slot * 2654435761) >>> 0) % 9;
      const py = Math.round(g - s.h);
      if (py > KD.H || py + s.h < -20) continue;
      KD.PX.blit(ctx, name, px, py, { anchor: false, shade: cfg.shade });
    }
    return true;
  }

  /* ---- the water column ------------------------------------------- *
   * Solid bands, one colour per depth, blended into each other over a
   * few rows. The whole column is drawn HERE, behind everything, and the
   * terrain chunks leave their water tiles transparent - so the reef and
   * the rock ridges sit IN the water at their own depth instead of being
   * seen through a stippled veil. Clean, and still layered.
   * ------------------------------------------------------------------ */
  /* The top of the column is now a SHALLOW SHELF: two bright bands before
     the water starts going anywhere. Without them the sea was one flat
     turquoise field from the waves to the sand, which is what "too small"
     looked like - no depth to read. */
  /* One colour per depth, and the depths are TIED TO THE LAYER TABLE in
     world/gen.js. These were left behind when the world went from 460 tiles
     deep to 700: DEEP.2 started at 116 and the reef now starts at 120, so
     the reef - the warm, loud, bright part of the ocean - was being painted
     in the same navy as the trench, and the whole game read as a cave with
     fish in it. Everything below the shallows moved down, and the bright
     end of the ramp holds for twice as long. */
  const _D = KD.Zones.D;
  const BANDS = [
    [_D.sea, 'WATER.3'],
    [_D.sea + 12, 'WATER.2'],
    [_D.shallows + 26, 'WATER.1'],
    [_D.reef - 20, 'WATER.0'],
    [_D.reef + 40, 'DEEP.2'],
    [_D.ruins, 'DEEP.1'],
    [_D.trench, 'DEEP.0'],
    [_D.abyss, 'ROT.0'],
    [_D.abyss + 120, 'INK.1']
  ];

  /* ---- the sky above the waterline -------------------------------- */
  /* Hand-stepped clouds on two layers. Above water is the one place in
     this game that is allowed to be bright, so it has to earn it. */
  const CLOUDS = [];
  function seedSky() {
    CLOUDS.length = 0;
    for (let i = 0; i < 14; i++) {
      CLOUDS.push({
        x: i * 190 + ((i * 977) % 130), y: 4 + ((i * 53) % 22),
        w: 34 + ((i * 37) % 46), h: 7 + ((i * 17) % 6),
        f: i & 1 ? 0.05 : 0.09, top: (i % 3) === 0
      });
    }
  }
  /* Gulls, because an empty sky is an empty sky however well it is
     graded. Two frames each, wings up and wings down. */
  function gull(x, y, up) {
    if (up) {
      KD.Screen.rect(x - 4, y - 2, 3, 1, 'INK.1'); KD.Screen.rect(x - 1, y, 3, 1, 'INK.1');
      KD.Screen.rect(x + 2, y - 2, 3, 1, 'INK.1');
    } else {
      KD.Screen.rect(x - 4, y + 1, 3, 1, 'INK.1'); KD.Screen.rect(x - 1, y, 3, 1, 'INK.1');
      KD.Screen.rect(x + 2, y + 1, 3, 1, 'INK.1');
    }
  }

  function sky(ctx, cam, horizon, t) {
    if (horizon <= 0) return;
    const h = Math.min(KD.H, horizon);
    /* A stepped gradient, zenith to haze. The old version was one flat slab
       of DEEP.4 with two dithered washes at the bottom and read as a painted
       wall; eight solid bands cost eight fills and read as sky. */
    /* Five bands, all of them still SKY colours. The first attempt ran the
       gradient down into BONE and the bottom of the sky came out as a grey
       slab with hard edges - a striped flag, not weather. The haze is a
       thin strip at the waterline instead, where haze actually is. */
    /* Six solid bands and ONE light wash at each seam. Two heavy washes per
       seam turned the sky into a set of stipple rules the width of the
       screen - which is the fourth time in this file that dithering
       something large has read as noise rather than as a blend. */
    const SKYB = ['DEEP.2', 'DEEP.3', 'DEEP.4', 'WATER.0', 'WATER.1', 'WATER.2'];
    for (let k = 0; k < SKYB.length; k++) {
      const y0 = Math.round(h * k / SKYB.length);
      const y1 = Math.round(h * (k + 1) / SKYB.length);
      if (y1 <= 0) continue;
      KD.Screen.rect(0, Math.max(0, y0), KD.W, y1 - Math.max(0, y0), SKYB[k]);
      if (k) KD.Dither.wash(ctx, 0, y0, KD.W, 2, SKYB[k - 1], 0.3);
    }
    KD.Screen.rect(0, Math.max(0, h - 4), KD.W, 3, 'WATER.3');
    KD.Dither.wash(ctx, 0, Math.max(0, h - 9), KD.W, 5, 'WATER.3', 0.45);
    /* the sun: a stepped disc with a stepped halo around it, never a circle
       and never a gradient */
    const sx = Math.round(KD.W * 0.72 - cam.x * 0.015);
    const sy = Math.max(10, h - 82);
    /* the halo, two solid stepped rings - dithered it read as a cloud of
       dots hanging under the sun */
    const HALO = [16, 24, 28, 28, 24, 16];
    for (let r = 0; r < HALO.length; r++) {
      const w = HALO[r];
      KD.Screen.rect(sx - (w >> 1), sy - 3 + r * 4, w, 4, 'WATER.3');
    }
    const H2 = [10, 18, 22, 22, 18, 10];
    for (let r = 0; r < H2.length; r++) {
      const w = H2[r];
      KD.Screen.rect(sx - (w >> 1), sy - 1 + r * 3, w, 3, 'BONE.2');
    }
    const DISC = [8, 14, 18, 18, 14, 8];
    for (let r = 0; r < DISC.length; r++) {
      const w = DISC[r];
      KD.Screen.rect(sx - (w >> 1), sy + r * 3, w, 3,
                     r === 0 || r === DISC.length - 1 ? 'GOLD.3' : 'WHITE');
    }
    /* clouds: stacked slabs, lit on top, warm underneath, drifting on the
       same wind as everything else */
    for (const c of CLOUDS) {
      const px = Math.round(c.x - cam.x * c.f - W.x * c.f * 8) % (KD.World.W * TS * c.f + KD.W + 400);
      const x = px - 200;
      if (x > KD.W + 90 || x + c.w < -90) continue;
      const y = Math.round(c.y + Math.sin(t * 0.2 + c.x) * 2);
      if (y > h) continue;
      KD.Screen.rect(x + 4, y, c.w - 8, 2, 'WHITE');
      KD.Screen.rect(x + 2, y + 2, c.w - 4, c.h - 3, 'BONE.2');
      KD.Screen.rect(x, y + c.h - 1, c.w, 2, 'BONE.1');
      KD.Screen.rect(x + 3, y + c.h + 1, c.w - 8, 1, 'GOLD.2');   // warm underside
      if (c.top) KD.Screen.rect(x + 10, y - 3, c.w - 22, 3, 'WHITE');
    }
    /* three gulls, wheeling */
    for (let k = 0; k < 3; k++) {
      const gx = Math.round(((k * 137 + t * (9 + k * 3) - cam.x * 0.05) % (KD.W + 60)) - 30);
      const gy = Math.round(14 + k * 13 + Math.sin(t * 0.8 + k) * 5);
      if (gy < h - 6) gull(gx, gy, ((t * 4 + k) | 0) % 2 === 0);
    }
  }

  function water(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const horizon = Math.round(sea - cam.y);
    sky(ctx, cam, horizon, t);
    for (let i = 0; i < BANDS.length; i++) {
      const y0 = BANDS[i][0] * TS - cam.y;
      const y1 = (i + 1 < BANDS.length ? BANDS[i + 1][0] * TS : KD.World.H * TS) - cam.y;
      if (y1 < 0 || y0 > KD.H) continue;
      const a = Math.max(0, y0), b = Math.min(KD.H, y1);
      KD.Screen.rect(0, a, KD.W, b - a, BANDS[i][1]);
      /* blend into the band above over six rows, so depth is a gradient
         and not a stack of stripes - three narrow washes, not a screen
         door across the whole frame */
      if (i > 0 && y0 > -8 && y0 < KD.H) {
        const up = BANDS[i - 1][1];
        /* four light rows, not one heavy one: at 0.72 the top row read as a
           dotted rule ruled across the whole frame */
        KD.Dither.wash(ctx, 0, y0, KD.W, 2, up, 0.46);
        KD.Dither.wash(ctx, 0, y0 + 2, KD.W, 2, up, 0.33);
        KD.Dither.wash(ctx, 0, y0 + 4, KD.W, 2, up, 0.21);
        KD.Dither.wash(ctx, 0, y0 + 6, KD.W, 2, up, 0.11);
      }
    }
    /* No sun-track on the water. Drawn as a dithered wedge it read as a
       screen-doored box hanging in mid-ocean, which is the third time
       dithered light has failed in this file - the shafts below are solid
       for the same reason. */
    return horizon;
  }

  /* ---- sunlight ------------------------------------------------------
     Shafts from the surface. Three earlier versions of this idea (in the
     castle, and twice here) were dithered, and dithered light always reads
     as speckle rather than as brightness. These are SOLID bands one step
     up the water ramp from whatever they cross, slanted by leaning each row
     a fraction, narrowing as they sink, and cut off before they reach the
     dark. Low contrast is what keeps them from becoming curtains.
     -------------------------------------------------------------------- */
  const SHAFT_UP = { 'WATER.3': 'BONE.2', 'WATER.2': 'WATER.3', 'WATER.1': 'WATER.2',
                     'WATER.0': 'WATER.1', 'DEEP.2': 'WATER.0', 'DEEP.1': 'DEEP.2' };
  function bandColAt(wy) {
    let col = BANDS[0][1];
    for (const b of BANDS) if (wy >= b[0] * TS) col = b[1]; else break;
    return col;
  }
  function shafts(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const top = Math.round(sea - cam.y);
    if (top > KD.H) return;
    const DEPTH = 260;                       // shafts die before the dark
    for (let i = 0; i < 6; i++) {
      const wx = i * 168 + Math.sin(t * 0.07 + i * 1.7) * 30 + W.x * 0.6;
      const px = Math.round(wx - cam.x * 0.55);
      const sx = ((px % (KD.W + 300)) + KD.W + 300) % (KD.W + 300) - 150;
      const slant = 0.22 + (i % 3) * 0.06 + W.gust * 0.05;
      for (let y = Math.max(0, -top); y < DEPTH; y += 2) {
        const sy = top + y;
        if (sy < -2) continue;
        if (sy > KD.H) break;
        const k = y / DEPTH;
        const w = Math.round(15 * (1 - k * 0.7));
        if (w < 3) break;
        const col = SHAFT_UP[bandColAt(cam.y + sy)] || null;
        if (!col) break;
        const x = Math.round(sx + y * slant);
        KD.Screen.rect(x, sy, w, 2, col);
        /* a brighter core, half the width, for the first third */
        if (k < 0.30) KD.Screen.rect(x + (w >> 2), sy, w >> 1, 2, col);
      }
    }
  }

  /* ---- kelp forest ---------------------------------------------------
     Drawn rather than spritesheeted, because a kelp stalk that cannot bend
     is a fence post. Each stalk is a stack of segments whose offset grows
     with height, so the whole thing leans on the wind and the tips move
     furthest - and blades hang off it in pairs.
     -------------------------------------------------------------------- */
  function stalk(x, groundY, h, seed, shade, wide) {
    const segs = Math.max(4, h >> 3);
    const amp = 3 + (seed % 3);
    let px = x;
    for (let s = 0; s < segs; s++) {
      const f = s / segs;
      const y = groundY - s * 8;
      if (y < -16) break;
      if (y > KD.H + 8) continue;
      const off = lean(seed + s, amp) * f * f;
      px = x + off * 2;
      const w = wide ? (f > 0.8 ? 2 : 3) : 2;
      KD.Screen.rect(Math.round(px), y - 8, w, 9, shade);
      KD.Screen.rect(Math.round(px), y - 8, 1, 9, 'KELP.2');
      /* a pair of blades every other segment, alternating sides */
      if (s % 2 === 1 && f < 0.95) {
        const bl = 5 + ((seed + s) % 5);
        const dir = (s & 2) ? 1 : -1;
        for (let b = 0; b < bl; b++) {
          KD.Screen.rect(Math.round(px + (dir > 0 ? w : -1 - b)), y - 6 + (b >> 1),
                         1, 2, b < 2 ? 'KELP.2' : shade);
        }
      }
    }
    /* a float at the tip, which is what real kelp has */
    KD.Screen.rect(Math.round(px), groundY - segs * 8 - 10, 3, 3, 'KELP.3');
  }

  /* three depths of forest, so the water has something behind it */
  const FOREST = [
    { f: 0.34, shade: 'KELP.0', h: [70, 130], step: 34, wide: false },
    { f: 0.58, shade: 'KELP.1', h: [58, 104], step: 46, wide: false },
    { f: 0.86, shade: 'KELP.1', h: [44, 82],  step: 74, wide: true }
  ];
  function kelp(ctx, cam) {
    for (let L = 0; L < FOREST.length; L++) {
      const cfg = FOREST[L];
      const ox = Math.floor(cam.x * cfg.f);
      const s0 = Math.floor(ox / cfg.step) - 1;
      for (let i = 0; i < Math.ceil(KD.W / cfg.step) + 3; i++) {
        const slot = s0 + i;
        const r = ((slot * 2654435761 + L * 40503) >>> 0);
        if ((r % 5) === 0) continue;                     // gaps, not a wall
        const px = slot * cfg.step - ox + (r % 17);
        if (px > KD.W + 8 || px < -12) continue;
        /* Stand on the REAL seabed, sunk a little further the further out
           the layer is - same trick the coral bands use. An implied floor
           210px under sea level put the whole forest off the bottom of the
           screen whenever the camera was up at the surface, which is why
           the first pass looked like it had no kelp at all. */
        const wx = cam.x + px;
        const g = groundAt(wx) - cam.y + (FOREST.length - 1 - L) * 10;
        if (g < -20 || g > KD.H + 120) continue;
        const h = cfg.h[0] + (r % (cfg.h[1] - cfg.h[0]));
        stalk(px, Math.round(g), h, r % 251, cfg.shade, cfg.wide);
      }
    }
  }

  /* plankton, drifting on the wind rather than falling straight */
  function motes(ctx, cam, t) {
    for (let i = 0; i < 54; i++) {
      const sp = 0.6 + (i % 5) * 0.25;
      const x = (((i * 173 + W.x * sp * 6 - cam.x * 0.3) % (KD.W + 40)) + KD.W + 40) % (KD.W + 40) - 20;
      const y = (((i * 97 - t * 5 * sp) % (KD.H + 40)) + KD.H + 40) % (KD.H + 40) - 20;
      KD.Screen.rect(Math.round(x), Math.round(y), 1, 1,
                     (i & 3) ? 'WATER.2' : 'BONE.1');
    }
  }

  /* ---- drifting life at several depths ---- */
  const fauna = [];
  /* These pools named sprites that never existed - an_clownfish, an_tang,
     an_wrasse and the rest - so the pool came out empty and there was no
     ambient life in the entire ocean. The real names are the eight animals
     in art/reef.js. */
  const SMALL = ['an_clown', 'an_parrot'];
  const MEDIUM = ['an_cuttle', 'an_lion', 'an_moray', 'an_mantis'];
  const BIG = ['an_manta', 'an_cuda'];

  /* Fish move in SHOALS. One leader per group and the rest hold a fixed
     offset from it with a little sway of their own, which is what makes a
     school read as a school rather than as ten fish that happen to be near
     each other. */
  function seed(n) {
    seedSky();
    fauna.length = 0;
    const pool = [];
    for (const s of SMALL) if (KD.PX.hasAny(s)) pool.push({ n: s, band: 0 });
    for (const s of MEDIUM) if (KD.PX.hasAny(s)) pool.push({ n: s, band: 1 });
    for (const s of BIG) if (KD.PX.hasAny(s)) pool.push({ n: s, band: 2 });
    if (!pool.length) return;
    const groups = n || 58;   /* the ocean should be BUSY */
    for (let g = 0; g < groups; g++) {
      const p = pool[(Math.random() * pool.length) | 0];
      /* the little ones travel in numbers; the big ones travel alone */
      const size = p.band === 0 ? 7 + ((Math.random() * 11) | 0)
                 : p.band === 1 ? 1 + ((Math.random() * 3) | 0) : 1;
      const lx = Math.random() * KD.World.W * TS;
      const ly = (36 + Math.random() * 210) * TS;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const sp = (p.band === 2 ? 11 : p.band === 1 ? 18 : 30) * (0.7 + Math.random() * 0.6);
      const f = p.band === 2 ? 0.72 : p.band === 1 ? 0.86 : 1.0;
      for (let i = 0; i < size; i++) {
        fauna.push({
          name: p.n, band: p.band, x: lx, y: ly, dir, sp, f,
          ph: Math.random() * 9,
          /* offsets fan out BEHIND the leader, so the shoal has a shape */
          /* a wedge behind the leader, three ranks deep, so a shoal has a
             SHAPE - a single trailing line reads as a queue */
          ox: i === 0 ? 0 : -dir * (7 + ((i / 3) | 0) * 11) - (i % 2 ? 5 : 0),
          oy: i === 0 ? 0 : ((i % 5) - 2) * 8 + (i % 2 ? 2 : -2),
          sway: 3 + (i % 4)
        });
      }
    }
  }
  function tick(dt) {
    wind(dt);
    const wpx = KD.World.W * TS;
    /* Recycle round the CAMERA, not round the world. Spread over 2600 tiles
       a hundred fish is one every seventeen tiles - three on screen. Wrapping
       them just past the edge of view keeps a steady stream going past. */
    const cx = KD.Cam ? KD.Cam.x : 0;
    const cy = KD.Cam ? KD.Cam.y : 0;
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const span = KD.W + 260;
    /* Recycle round the camera in BOTH axes. Horizontally this was already
       right; vertically they were being dropped anywhere in a 1600px water
       column, so at any moment nearly all of them were above or below a
       240px viewport and the sea looked empty however many there were. */
    const relight = () => Math.max(sea + 10, cy - 70 + Math.random() * (KD.H + 140));
    for (const f of fauna) {
      f.x += f.sp * f.dir * dt;
      f.y += Math.sin(f.ph + KD.Game.t * 0.5) * 4 * dt;
      const rel = f.x - cx;
      if (rel < -260) { f.x += span; f.y = relight(); }
      else if (rel > span) { f.x -= span; f.y = relight(); }
      /* drifted a long way out of view vertically? bring it back next pass */
      if (f.y < cy - 300 || f.y > cy + KD.H + 300) f.y = relight();
      if (f.x < 0) f.x += wpx; else if (f.x > wpx) f.x -= wpx;
    }
  }
  function life(ctx, cam, near) {
    for (const f of fauna) {
      if ((f.band === 2) === !!near) continue;
      const px = Math.round(f.x + (f.ox || 0) - cam.x * f.f);
      const py = Math.round(f.y + (f.oy || 0)
        + Math.sin(KD.Game.t * 1.6 + f.ph) * (f.sway || 3) - cam.y * f.f);
      if (px < -90 || px > KD.W + 90 || py < -60 || py > KD.H + 60) continue;
      const name = KD.PX.frameOf(f.name, KD.Game.t + f.ph);
      if (!KD.PX.has(name)) continue;
      /* Do not draw a fish inside the seabed. The shoals wander on their own
         y, and nothing was checking whether that y had rock in it - so there
         were clownfish swimming around in the middle of the mud. */
      const ftx = ((f.x + (f.ox || 0)) / TS) | 0, fty = ((f.y + (f.oy || 0)) / TS) | 0;
      if (KD.World.solid(ftx, fty) || KD.World.water(ftx, fty) < 3) continue;
      const lit = KD.World.lightAt(ftx, fty);
      const shade = Math.max(f.band === 2 ? 1 : 0, KD.PX.bandFor(lit, KD.Light.MAX));
      KD.PX.blit(ctx, name, px, py, { anchor: false, flipX: f.dir < 0, shade });
    }
  }

  /* ---- bubbles ------------------------------------------------------
     Three kinds, because one kind reads as dust: VENTS chugging up off the
     seabed in columns, a general drift of small ones through the whole
     column, and a few fat slow ones that wobble. All of them rise, all of
     them read the same wind, and none of them are dithered.
     -------------------------------------------------------------------- */
  function vents(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    /* vents sit at fixed world positions so they do not swim about */
    const first = Math.floor((cam.x - 60) / 190);
    for (let v = first; v < first + Math.ceil(KD.W / 190) + 2; v++) {
      const seedv = ((v * 2654435761) >>> 0);
      if (seedv % 3 === 0) continue;
      const wx = v * 190 + (seedv % 90);
      const tx = Math.max(0, Math.min(KD.World.W - 1, (wx / TS) | 0));
      const g = KD.Gen.surfaceAt(tx) * TS;
      const sx = Math.round(wx - cam.x);
      if (sx < -12 || sx > KD.W + 12) continue;
      const n = 7 + (seedv % 5);
      for (let b = 0; b < n; b++) {
        const life = ((t * (16 + (seedv % 9)) + b * 37) % 150);
        const by = g - life;
        if (by < sea) continue;
        const sy = Math.round(by - cam.y);
        if (sy < -4 || sy > KD.H + 4) continue;
        const sz = life < 40 ? 1 : (life < 100 ? 2 : 3);
        const drift = Math.round(Math.sin(life * 0.08 + b) * 3 + W.gust * 2);
        KD.Screen.rect(sx + drift, sy, sz, sz, 'WATER.3');
        if (sz > 1) KD.Screen.rect(sx + drift, sy, 1, 1, 'BONE.2');
      }
      /* the mouth of the vent, so the column comes from somewhere */
      const gy = Math.round(g - cam.y);
      if (gy > -6 && gy < KD.H + 6) {
        KD.Screen.rect(sx - 4, gy - 2, 9, 3, 'STONE.0');
        KD.Screen.rect(sx - 2, gy - 3, 5, 2, 'INK.1');
      }
    }
  }

  /* the general drift, plus a few fat wobblers */
  function bubbles(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const top = Math.max(0, Math.round(sea - cam.y));
    for (let i = 0; i < 70; i++) {
      const sp = 12 + (i % 7) * 5;
      const x = ((i * 149 + Math.sin(t * 0.5 + i) * 6 + W.x * 0.4) % (KD.W + 30) + KD.W + 30) % (KD.W + 30) - 15;
      const y = KD.H - ((t * sp + i * 61) % (KD.H - top + 40));
      if (y < top) continue;
      const big = (i % 11) === 0;
      const sz = big ? 3 : ((i % 3) ? 1 : 2);
      KD.Screen.rect(Math.round(x), Math.round(y), sz, sz, big ? 'BONE.2' : 'WATER.3');
      if (big) KD.Screen.rect(Math.round(x), Math.round(y), 1, 1, 'WHITE');
    }
  }

  /* ---- caustics -----------------------------------------------------
     The ripple of surface light on the first few metres of water. Solid
     rows one step up the ramp, travelling sideways - the same rule as the
     shafts, for the same reason. It is what stops the shallows reading as
     one flat field of turquoise.
     -------------------------------------------------------------------- */
  const CAUS_UP = { 'WATER.2': 'WATER.3', 'WATER.1': 'WATER.2',
                    'WATER.0': 'WATER.1', 'DEEP.2': 'WATER.0' };
  function caustics(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const top = Math.round(sea - cam.y);
    if (top > KD.H) return;
    for (let row = 0; row < 13; row++) {
      const wy = sea + 6 + row * 7;
      const sy = Math.round(wy - cam.y);
      if (sy < 0) continue;
      if (sy > KD.H) break;
      /* Caustics use their own map, NOT the shafts': one step up from
         WATER.3 is BONE.2, and near-white dashes across the top band came
         out as a stipple rule the width of the screen. The shallowest band
         simply does not get them - it is already the bright one. */
      const col = CAUS_UP[bandColAt(wy)];
      if (!col) continue;
      const ph = t * (13 + row * 2) + row * 21 - cam.x * 0.9;
      for (let k = -1; k < Math.ceil(KD.W / 46) + 1; k++) {
        const x = Math.round(k * 46 + (ph % 46));
        const w = 12 - row;
        if (w < 3) break;
        KD.Screen.rect(x, sy, w, 1, col);
        KD.Screen.rect(x + w + 6, sy, Math.max(2, w >> 1), 1, col);
      }
    }
  }

  /* ---- the whole back half of the frame ---- */
  function back(ctx, cam, t) {
    const horizon = water(ctx, cam, t);
    shafts(ctx, cam, t);
    caustics(ctx, cam, t);
    kelp(ctx, cam);
    vents(ctx, cam, t);
    motes(ctx, cam, t);
    /* Far bands stand on an implied distant floor, lifted clear of the real
       seabed; mid bands sit closer to it. They are drawn straight onto the
       water column, so each one really is AT its depth. */
    for (let i = 0; i < FAR.length; i++) band(ctx, FAR[i], cam, 22 + i * 12);
    for (let i = 0; i < MID.length; i++) band(ctx, MID[i], cam, 44 + i * 14);
    life(ctx, cam, false);
    return horizon;
  }
  /* ---- the surface -------------------------------------------------- *
   * Two travelling waves of different wavelength summed, drawn as a
   * stepped crest: a white cap on top, a lit face under it, then the
   * body of the water. Sunlight breaks along it. This is the one place
   * the ocean gets to move, so it moves properly rather than jittering
   * two pixels up and down.
   * ------------------------------------------------------------------ */
  function waveAt(wx, t) {
    /* the wind decides how big the swell is and how fast it runs */
    const g = 1 + W.gust * 0.45;
    return Math.sin(wx * 0.035 + t * 1.5 + W.x * 0.02) * 3.2 * g
         + Math.sin(wx * 0.011 - t * 0.9) * 2.4 * g
         + Math.sin(wx * 0.083 + t * 2.6 + W.x * 0.05) * 1.1;
  }
  function surface(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const h = Math.round(sea - cam.y);
    if (h < -24 || h > KD.H + 8) return;
    let prev = null;
    for (let x = 0; x < KD.W; x += 2) {
      const wx = x + cam.x;
      const y = h + Math.round(waveAt(wx, t));
      /* the face of the wave: three steps of water, brightest at the top */
      KD.Screen.rect(x, y + 1, 2, 3, 'WATER.3');
      KD.Screen.rect(x, y + 4, 2, 4, 'WATER.2');
      /* the crest */
      KD.Screen.rect(x, y - 1, 2, 2, 'WHITE');
      KD.Screen.rect(x, y - 3, 2, 2, 'BONE.2');
      /* foam where the wave is steepest, which is where it would break */
      if (prev !== null && Math.abs(y - prev) >= 2) {
        KD.Screen.rect(x, y - 5, 2, 2, 'WHITE');
        KD.Screen.rect(x - 2, y - 4, 2, 1, 'BONE.2');
      }
      /* glitter running along the crest */
      if (((x >> 1) + ((t * 7) | 0)) % 11 === 0) KD.Screen.rect(x, y - 6, 1, 1, 'WHITE');
      prev = y;
    }
  }
  /* everything in front of the world */
  function front(ctx, cam, t) {
    life(ctx, cam, true);
    bubbles(ctx, cam, t);
    /* Foreground plants must stand ON the ground and rise into the WATER.
       Drawn at a fixed row they cover the rock instead, which reads as damage
       on the terrain rather than as a plant in front of the camera. */
    for (const cfg of NEAR) {
      const first = pickFor(cfg.spr, 0);
      if (!first) continue;
      const step = KD.PX.get(first).w + 40;
      const ox = Math.floor(cam.x * cfg.f);
      const s0 = Math.floor(ox / step) - 1;
      for (let i = 0; i < Math.ceil(KD.W / step) + 2; i++) {
        const slot = s0 + i;
        if (((slot * 2246822519) >>> 0) % 3 === 0) continue;    // gaps, not a hedge
        const name = pickFor(cfg.spr, slot);
        if (!name) continue;
        const s = KD.PX.get(name);
        const px = slot * step - ox;
        if (px > KD.W || px + s.w < 0) continue;
        const wx = cam.x + px + s.w / 2;
        const tx = Math.max(0, Math.min(KD.World.W - 1, (wx / TS) | 0));
        /* only where there is actually water above the floor to grow into */
        if (KD.World.water(tx, KD.Gen.surfaceAt(tx) - 2) < 3) continue;
        const g = KD.Gen.surfaceAt(tx) * TS - cam.y;
        KD.PX.blit(ctx, name, px, Math.round(g - s.h + 2), { anchor: false, shade: cfg.shade });
      }
    }
    /* silt and bubbles, drifting fastest of all */
    if (KD.PX.hasAny('fg_silt')) {
      const s = KD.PX.get('fg_silt');
      const ox = Math.floor(cam.x * 1.9) % s.w, oy = Math.floor(cam.y * 1.9 - t * 9) % s.h;
      for (let y = -oy - s.h; y < KD.H + s.h; y += s.h) {
        for (let x = -ox - s.w; x < KD.W + s.w; x += s.w) KD.PX.blit(ctx, 'fg_silt', x, y, { anchor: false });
      }
    } else {
      for (let i = 0; i < 40; i++) {
        const x = ((i * 137 + 31) % (KD.W + 40)) - 20;
        const y = ((i * 71 + t * 11) % (KD.H + 40)) - 20;
        KD.Screen.rect(Math.round(x), Math.round(y), 1, 1, i & 3 ? 'WATER.1' : 'BONE.0');
      }
    }
  }
  return { back, front, surface, seed, tick, kelp, vents, bubbles, caustics,
           get wind() { return W.gust; }, get windX() { return W.x; },
           get fauna() { return fauna; } };
})();
