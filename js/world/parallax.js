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
    { spr: ['bg_far_reef', 'bg_far_spires', 'bg_far_arch', 'bg_far_wreck'], f: 0.12, shade: 2, haze: 0.50 },
    { spr: ['bg_mid_rocks', 'bg_mid_coral'], f: 0.26, shade: 1, haze: 0.34 }
  ];
  const MID = [
    { spr: ['bg_mid_kelp'], f: 0.44, shade: 1, haze: 0.22 },
    { spr: ['bg_mid_coral', 'bg_mid_rocks'], f: 0.58, shade: 0, haze: 0.06 }
  ];
  const NEAR = [
    { spr: ['fg_near_coral'], f: 1.35, shade: 0 },
    { spr: ['fg_near_kelp'], f: 1.7, shade: 0 }
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
  function band(ctx, cfg, cam, lift) {
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
      const g = groundAt(wx) - cam.y - (lift || 0);
      const py = Math.round(g - s.h);
      if (py > KD.H || py + s.h < -20) continue;
      KD.PX.blit(ctx, name, px, py, { anchor: false, shade: cfg.shade });
    }
    return true;
  }

  /* ---- the water column: banded colour with dithered seams ---- */
  const BANDS = [
    [34, 'WATER.2'], [56, 'WATER.1'], [90, 'WATER.0'], [122, 'DEEP.2'],
    [160, 'DEEP.1'], [230, 'DEEP.0'], [330, 'ROT.0'], [400, 'INK.1']
  ];
  function water(ctx, cam) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const horizon = Math.round(sea - cam.y);
    if (horizon > 0) {
      /* above the surface: sky, and a sun the game can actually see */
      KD.Screen.rect(0, 0, KD.W, Math.min(KD.H, horizon), 'DEEP.4');
      KD.Dither.wash(ctx, 0, Math.max(0, horizon - 14), KD.W, 14, 'WATER.3', 0.55);
    }
    for (let i = 0; i < BANDS.length; i++) {
      const y0 = BANDS[i][0] * TS - cam.y;
      const y1 = (i + 1 < BANDS.length ? BANDS[i + 1][0] * TS : KD.World.H * TS) - cam.y;
      if (y1 < 0 || y0 > KD.H) continue;
      const a = Math.max(0, y0), b = Math.min(KD.H, y1);
      KD.Screen.rect(0, a, KD.W, b - a, BANDS[i][1]);
      /* dither the seam between two bands so depth reads as a gradient */
      if (y0 > -8 && y0 < KD.H) KD.Dither.wash(ctx, 0, y0 - 7, KD.W, 14, BANDS[i][1], 0.5);
    }
    return horizon;
  }

  /* ---- god rays: bright dithered columns that drift ---- */
  function shafts(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    if (cam.y > sea + 150 * TS) return;             // no sun this deep
    const have = KD.PX.hasAny('bg_shaft');
    const n = 5;
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
          const cov = Math.max(0, 0.42 - y / 300);
          if (cov <= 0.02) break;
          KD.Dither.fill(ctx, sx - (wide >> 1) + (y >> 3), top + y, wide, 2, 'BONE.2', cov);
        }
      }
    }
  }

  /* ---- drifting life at several depths ---- */
  const fauna = [];
  const SMALL = ['an_clownfish', 'an_tang', 'an_wrasse', 'an_angelfish', 'an_pufferfish',
                 'an_nudibranch', 'an_shrimp', 'an_pipefish'];
  const MEDIUM = ['an_turtle', 'an_ray', 'an_cuttlefish', 'an_grouper', 'an_lionfish', 'an_octopus_wild'];
  const BIG = ['an_whaleshark', 'an_manta', 'an_sunfish', 'an_hammerhead', 'an_dolphinpod'];
  function seed(n) {
    fauna.length = 0;
    const pool = [];
    for (const s of SMALL) if (KD.PX.hasAny(s)) pool.push({ n: s, band: 0 });
    for (const s of MEDIUM) if (KD.PX.hasAny(s)) pool.push({ n: s, band: 1 });
    for (const s of BIG) if (KD.PX.hasAny(s)) pool.push({ n: s, band: 2 });
    if (!pool.length) return;
    for (let i = 0; i < (n || 26); i++) {
      const p = pool[(Math.random() * pool.length) | 0];
      fauna.push({
        name: p.n, band: p.band,
        x: Math.random() * KD.World.W * TS,
        y: (36 + Math.random() * 130) * TS,
        dir: Math.random() < 0.5 ? -1 : 1,
        sp: (p.band === 2 ? 9 : p.band === 1 ? 16 : 24) * (0.7 + Math.random() * 0.6),
        ph: Math.random() * 9,
        f: p.band === 2 ? 0.72 : p.band === 1 ? 0.86 : 1.0
      });
    }
  }
  function tick(dt) {
    const wpx = KD.World.W * TS;
    for (const f of fauna) {
      f.x += f.sp * f.dir * dt;
      f.y += Math.sin(f.ph + KD.Game.t * 0.5) * 4 * dt;
      if (f.x < -200) f.x = wpx + 200;
      if (f.x > wpx + 200) f.x = -200;
    }
  }
  function life(ctx, cam, near) {
    for (const f of fauna) {
      if ((f.band === 2) === !!near) continue;
      const px = Math.round(f.x - cam.x * f.f);
      const py = Math.round(f.y - cam.y * f.f);
      if (px < -90 || px > KD.W + 90 || py < -60 || py > KD.H + 60) continue;
      const name = KD.PX.frameOf(f.name, KD.Game.t + f.ph);
      if (!KD.PX.has(name)) continue;
      const lit = KD.World.lightAt((f.x / TS) | 0, (f.y / TS) | 0);
      const shade = Math.max(f.band === 2 ? 1 : 0, KD.PX.bandFor(lit, KD.Light.MAX));
      KD.PX.blit(ctx, name, px, py, { anchor: false, flipX: f.dir < 0, shade });
    }
  }

  /* Which water colour is in front of the camera at this depth. A haze
     pass dithers THAT over a band, which is what actually makes a
     backdrop read as distant underwater: things do not go black with
     distance down here, they wash out toward the colour of the water in
     front of them. Darkening alone turned every far ridge into a black
     scribble against bright shallows. */
  function waterColAt(y) {
    let col = BANDS[0][1];
    for (const bnd of BANDS) { if (y >= bnd[0] * TS) col = bnd[1]; else break; }
    return col;
  }
  function haze(ctx, cam, amount) {
    if (!amount) return;
    /* wash in the two or three colours the visible column actually is, so
       the veil matches the water at every depth on screen at once */
    let y = 0;
    while (y < KD.H) {
      const col = waterColAt(cam.y + y);
      let end = KD.H;
      for (const bnd of BANDS) {
        const sy = bnd[0] * TS - cam.y;
        if (sy > y) { end = Math.min(end, sy); break; }
      }
      KD.Dither.wash(ctx, 0, y, KD.W, Math.max(1, end - y), col, amount);
      y = end;
    }
  }

  /* ---- the whole back half of the frame ---- */
  function back(ctx, cam, t) {
    const horizon = water(ctx, cam);
    shafts(ctx, cam, t);
    /* Far bands stand on an implied distant floor, lifted well clear of the
       real seabed; mid bands sit closer to it. Each one is veiled by the
       water in front of it before the next is drawn, so the layers really
       do sit at different distances instead of stacking flat. */
    for (let i = 0; i < FAR.length; i++) {
      if (band(ctx, FAR[i], cam, 26 - i * 10)) haze(ctx, cam, FAR[i].haze);
    }
    for (let i = 0; i < MID.length; i++) {
      if (band(ctx, MID[i], cam, 10 - i * 6)) haze(ctx, cam, MID[i].haze);
    }
    life(ctx, cam, false);
    return horizon;
  }
  /* the surface chop, drawn over the water but under the world */
  function surface(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    const h = Math.round(sea - cam.y);
    if (h < -6 || h > KD.H) return;
    if (KD.PX.hasAny('bg_surface')) {
      const s = KD.PX.get('bg_surface');
      const ox = Math.floor(cam.x * 0.85) % s.w;
      for (let x = -ox - s.w; x < KD.W + s.w; x += s.w) {
        KD.PX.blit(ctx, 'bg_surface', x, h - s.h + 2, { anchor: false });
      }
      return;
    }
    for (let x = 0; x < KD.W; x += 2) {
      const bob = Math.round(Math.sin((x + cam.x) * 0.08 + t * 1.7) * 2);
      KD.Screen.rect(x, h + bob, 2, 1, 'WATER.3');
      KD.Screen.rect(x, h + bob + 1, 2, 1, 'WATER.2');
      if (((x >> 1) + ((t * 3) | 0)) % 7 === 0) KD.Screen.rect(x, h + bob - 2, 1, 1, 'BONE.2');
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
