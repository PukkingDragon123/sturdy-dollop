/* ============================================================
   world/parallax.js - the ocean behind and in front of the
   world. Four scrolling depths of hand-drawn silhouette, light
   shafts, drifting life and foreground clutter. This is what
   makes the sea look like it goes somewhere.
   ============================================================ */
KD.Parallax = (function () {
  const TS = 8;
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
  const BANDS = [
    [34, 'WATER.2'], [52, 'WATER.1'], [82, 'WATER.0'], [116, 'DEEP.2'],
    [152, 'DEEP.1'], [214, 'DEEP.0'], [300, 'ROT.0'], [380, 'INK.1']
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
  function sky(ctx, cam, horizon, t) {
    if (horizon <= 0) return;
    const h = Math.min(KD.H, horizon);
    /* a vertical wash from deep sky down to haze at the waterline */
    KD.Screen.rect(0, 0, KD.W, h, 'DEEP.4');
    const steps = [['WATER.3', 0.30], ['WATER.2', 0.18]];
    steps.forEach((st, k) => {
      const y = Math.max(0, h - 26 + k * 11);
      KD.Dither.wash(ctx, 0, y, KD.W, Math.max(0, h - y), st[0], st[1]);
    });
    /* the sun, stepped square by square, never a circle */
    const sx = Math.round(KD.W * 0.74 - cam.x * 0.02) % (KD.W + 120);
    const sy = Math.max(6, h - 66);
    for (let r = 0; r < 5; r++) {
      const w = [6, 12, 16, 12, 6][r];
      KD.Screen.rect(sx - (w >> 1), sy + r * 4, w, 4, r === 2 ? 'WHITE' : 'GOLD.3');
    }
    /* clouds: stacked slabs, lit on top, shadowed underneath */
    for (const c of CLOUDS) {
      const px = Math.round(c.x - cam.x * c.f) % (KD.World.W * TS * c.f + KD.W + 400);
      const x = px - 200;
      if (x > KD.W + 90 || x + c.w < -90) continue;
      const y = Math.round(c.y + Math.sin(t * 0.2 + c.x) * 2);
      if (y > h) continue;
      KD.Screen.rect(x + 4, y, c.w - 8, 2, 'WHITE');
      KD.Screen.rect(x + 2, y + 2, c.w - 4, c.h - 3, 'BONE.2');
      KD.Screen.rect(x, y + c.h - 1, c.w, 2, 'BONE.1');
      if (c.top) KD.Screen.rect(x + 10, y - 3, c.w - 22, 3, 'WHITE');
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
        KD.Dither.wash(ctx, 0, y0, KD.W, 2, up, 0.72);
        KD.Dither.wash(ctx, 0, y0 + 2, KD.W, 2, up, 0.44);
        KD.Dither.wash(ctx, 0, y0 + 4, KD.W, 2, up, 0.20);
      }
    }
    return horizon;
  }

  /* ---- god rays: bright dithered columns that drift ---- */
  function shafts(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    if (cam.y > sea + 150 * TS) return;             // no sun this deep
    const have = false;   // the sprite column read as a hard grey bar
    const n = 4;
    for (let i = 0; i < n; i++) {
      const wx = (i * 220 + Math.sin(t * 0.09 + i * 1.7) * 26);
      const px = Math.round(wx - cam.x * 0.4);
      const sx = ((px % (KD.W + 240)) + KD.W + 240) % (KD.W + 240) - 120;
      const top = Math.max(0, Math.round(sea - cam.y));
      if (top > KD.H) return;
      if (have) {
        const s = KD.PX.get('bg_shaft');
        for (let k = 0; k * s.h < KD.H - top + s.h; k++) {
          KD.PX.blit(ctx, 'bg_shaft', sx, top + k * s.h, { anchor: false, shade: Math.min(5, 1 + k) });
        }
      } else {
        /* no art yet: a hand-dithered wedge, still not a gradient. BONE reads
           as light against every water band; WATER.3 vanished into WATER.2. */
        const H2 = Math.min(KD.H - top, 190);
        for (let y = 0; y < H2; y += 2) {
          const wide = 16 + (y >> 2);
          const cov = Math.max(0, 0.26 - y / 420);
          if (cov <= 0.02) break;
          KD.Dither.fill(ctx, sx - (wide >> 1) + (y >> 3), top + y, wide, 2, 'BONE.2', cov);
        }
      }
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
    const groups = n || 26;
    for (let g = 0; g < groups; g++) {
      const p = pool[(Math.random() * pool.length) | 0];
      /* the little ones travel in numbers; the big ones travel alone */
      const size = p.band === 0 ? 4 + ((Math.random() * 6) | 0)
                 : p.band === 1 ? 1 + ((Math.random() * 2) | 0) : 1;
      const lx = Math.random() * KD.World.W * TS;
      const ly = (36 + Math.random() * 190) * TS;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const sp = (p.band === 2 ? 11 : p.band === 1 ? 18 : 30) * (0.7 + Math.random() * 0.6);
      const f = p.band === 2 ? 0.72 : p.band === 1 ? 0.86 : 1.0;
      for (let i = 0; i < size; i++) {
        fauna.push({
          name: p.n, band: p.band, x: lx, y: ly, dir, sp, f,
          ph: Math.random() * 9,
          /* offsets fan out BEHIND the leader, so the shoal has a shape */
          ox: i === 0 ? 0 : -dir * (6 + i * 9) - (i % 2 ? 4 : 0),
          oy: i === 0 ? 0 : ((i % 3) - 1) * 7 + (i % 2 ? 2 : -2),
          sway: 3 + (i % 4)
        });
      }
    }
  }
  function tick(dt) {
    const wpx = KD.World.W * TS;
    /* Recycle round the CAMERA, not round the world. Spread over 2600 tiles
       a hundred fish is one every seventeen tiles - three on screen. Wrapping
       them just past the edge of view keeps a steady stream going past. */
    const cx = KD.Cam ? KD.Cam.x : 0;
    const span = KD.W + 260;
    for (const f of fauna) {
      f.x += f.sp * f.dir * dt;
      f.y += Math.sin(f.ph + KD.Game.t * 0.5) * 4 * dt;
      const rel = f.x - cx;
      if (rel < -260) { f.x += span; f.y = (34 + Math.random() * 200) * TS; }
      else if (rel > span) { f.x -= span; f.y = (34 + Math.random() * 200) * TS; }
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

  /* ---- the whole back half of the frame ---- */
  function back(ctx, cam, t) {
    const horizon = water(ctx, cam, t);
    shafts(ctx, cam, t);
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
    return Math.sin(wx * 0.035 + t * 1.5) * 3.2
         + Math.sin(wx * 0.011 - t * 0.9) * 2.4
         + Math.sin(wx * 0.083 + t * 2.6) * 1.1;
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
  return { back, front, surface, seed, tick, get fauna() { return fauna; } };
})();
