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

  /* ---- a seam between two flat bands -------------------------------
     The ocean is drawn through a 2x lens now (px/screen.js), and a dither
     is the one thing a lens cannot survive: every checkered pixel comes
     out as a 2x2 block, so a 0.3-density wash ruled across the whole
     frame stops reading as a blend and starts reading as gingham. It was
     already the fifth failure of large dithered light in this file at
     1:1 - the god rays, the sun track, the sky seams, the caustics.

     So a seam is SOLID DASHES of the colour above, four pixels and up,
     shrinking and thinning out over five rows. Deterministic in the seam
     depth so it never shimmers, and at any zoom it reads as light lying
     on water rather than as a screen door.
     ---------------------------------------------------------------- */
  function feather(y0, col, seed, rows) {
    rows = rows || 5;
    for (let r = 0; r < rows; r++) {
      const sy = y0 + r * 2;
      if (sy > KD.H) return;
      if (sy < -2) continue;
      const w = 16 - r * 3;                       // 16, 13, 10, 7, 4
      if (w < 3) return;
      const step = 22 + r * 9;
      const off = ((seed * 37 + r * 149) % step) - step;
      for (let x = off; x < KD.W + step; x += step) {
        KD.Screen.rect(x, sy, w, 2, col);
        if (r < 2) KD.Screen.rect(x + step * 0.5, sy, w - 4, 2, col);
      }
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
      if (k) feather(y0, SKYB[k - 1], k * 7, 3);
    }
    KD.Screen.rect(0, Math.max(0, h - 4), KD.W, 3, 'WATER.3');
    /* haze at the waterline: cloud bars, not a stipple. Long and low, so
       they read as the air going white where it meets the sea. */
    for (let r = 0; r < 4; r++) {
      const hy = Math.max(0, h - 5 - r * 2);
      const step = 54 + r * 22;
      const w = 40 - r * 8;
      const off = ((r * 197) % step) - step;
      for (let x = off; x < KD.W + step; x += step) KD.Screen.rect(x, hy, w, 2, 'WATER.3');
    }
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
      if (i > 0 && y0 > -12 && y0 < KD.H) feather(y0, BANDS[i - 1][1], BANDS[i][0]);
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
  /* WATER.3 is not in here on purpose. One step up from the brightest water
     is BONE, and through the 2x lens six thirty-pixel bars of near-white
     across the shallows read as grey slabs laid over the sea - the fourth
     time light in this file has been too strong for the scale it is drawn
     at. The shallowest band is already the bright one; the shafts start
     below it. */
  const SHAFT_UP = { 'WATER.2': 'WATER.3', 'WATER.1': 'WATER.2',
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
        /* nine world pixels, not fifteen: at 2x that is already a
           eighteen-pixel bar in a two-hundred-pixel viewport */
        const w = Math.round(9 * (1 - k * 0.62));
        if (w < 2) break;
        const col = SHAFT_UP[bandColAt(cam.y + sy)] || null;
        if (!col) continue;                  /* skip the band, do not stop */
        const x = Math.round(sx + y * slant);
        KD.Screen.rect(x, sy, w, 2, col);
      }
    }
  }

  /* ---- kelp forest ---------------------------------------------------
     Drawn rather than spritesheeted, because a kelp stalk that cannot bend
     is a fence post. Each stalk is a stack of segments whose offset grows
     with height, so the whole thing leans on the wind and the tips move
     furthest - and blades hang off it in pairs.
     -------------------------------------------------------------------- */
  /* Where he is, in screen pixels, so the kelp can get out of his way.
     Set once per kelp() call rather than looked up per segment. */
  let wash = null;
  function stalk(x, groundY, h, seed, shade, wide) {
    const segs = Math.max(4, h >> 3);
    const amp = 3 + (seed % 3);
    let px = x;
    for (let s = 0; s < segs; s++) {
      const f = s / segs;
      const y = groundY - s * 8;
      if (y < -16) break;
      if (y > KD.H + 8) continue;
      let off = lean(seed + s, amp) * f * f;
      /* a diver swimming through kelp pushes it aside. It is the cheapest
         reactive thing in the whole scene and it is the one that makes the
         forest feel like it is made of something. */
      if (wash) {
        const dx = x - wash.x, dy = y - wash.y;
        const d = Math.abs(dx) + Math.abs(dy) * 0.7;
        if (d < 34) off += (1 - d / 34) * 5 * (dx < 0 ? -1 : 1) * (0.4 + f);
      }
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
    const P = KD.Player && KD.Player.P;
    for (let L = 0; L < FOREST.length; L++) {
      const cfg = FOREST[L];
      /* only the near band reacts: the far ones are a hundred metres away */
      wash = (P && cfg.f > 0.8) ? { x: P.x - cam.x, y: P.y - cam.y } : null;
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
    wash = null;
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

  /* ================================================================
     THE FISH

     Every fish in the ocean used to travel in a straight line at a
     constant speed with a sine wave on its y, at whatever depth it was
     dropped at. Through the 2x lens that reads as wallpaper: fifteen
     identical clownfish stamped across the frame, all the same size, all
     moving at the same rate, none of them reacting to anything.

     A fish here now:

       - lives in ITS OWN WATER. A clownfish is a reef fish and stays in
         the reef; a cuttlefish is a ruins-and-below animal. Recycling
         respawns a shoal inside its own band, so the surface stops
         filling up with things that live at four hundred metres.
       - SURGES. Fish do not glide, they beat their tail and coast, so
         forward speed is multiplied by the beat rather than being
         constant. It is the single cheapest thing that makes a sprite
         read as alive.
       - HOLDS ITS PLACE loosely. Followers spring toward a slot in the
         wedge instead of being welded to it, so the school breathes and
         squeezes when the leader turns.
       - CHANGES ITS MIND. A shoal wanders vertically, turns round every
         so often, and darts.
       - GETS OUT OF THE WAY. Swim into a shoal and it scatters, which
         is the moment the ocean stops being scenery.
     ================================================================ */
  const _Zd = KD.Zones.D;
  /* n, band (0 near / 1 mid / 2 the far layer), the tile depths it lives
     between, how many travel together, cruising speed, parallax factor */
  const SPECIES = [
    { n: 'an_clown',  band: 0, y: [_Zd.shallows,      _Zd.reef + 30],  size: [4, 9],  sp: 30, f: 1.00 },
    { n: 'an_parrot', band: 0, y: [_Zd.shallows + 12, _Zd.reef + 70],  size: [2, 5],  sp: 25, f: 1.00 },
    { n: 'an_cuda',   band: 1, y: [_Zd.shallows + 24, _Zd.ruins],      size: [2, 5],  sp: 48, f: 0.95 },
    { n: 'an_mantis', band: 1, y: [_Zd.reef - 20,     _Zd.ruins],      size: [1, 3],  sp: 18, f: 0.92 },
    { n: 'an_lion',   band: 1, y: [_Zd.reef,          _Zd.ruins + 40], size: [1, 2],  sp: 13, f: 0.92 },
    { n: 'an_moray',  band: 1, y: [_Zd.ruins - 30,    _Zd.trench],     size: [1, 1],  sp: 12, f: 0.90 },
    { n: 'an_cuttle', band: 1, y: [_Zd.ruins,         _Zd.abyss],      size: [1, 2],  sp: 15, f: 0.90 },
    { n: 'an_manta',  band: 2, y: [_Zd.reef,          _Zd.abyss],      size: [1, 1],  sp: 14, f: 0.74 }
  ];

  const shoals = [];
  const vwOf = () => KD.W / ((KD.Cam && KD.Cam.z) || 1);
  const vhOf = () => KD.H / ((KD.Cam && KD.Cam.z) || 1);

  /* somewhere in this shoal's own band that the camera can actually see */
  function bandY(sh, cy, vh) {
    const b0 = sh.s.y[0] * TS, b1 = sh.s.y[1] * TS;
    const lo = Math.max(b0, cy - 60), hi = Math.min(b1, cy + vh + 60);
    if (hi <= lo) return (b0 + b1) / 2;      /* not our water: park, unseen */
    return lo + Math.random() * (hi - lo);
  }

  /* The wedge used to be measured in flat pixels - eleven across, eight
     down - which was fine when a fish was twelve pixels long and is a pile
     when it is twenty-six and drawn at 2x. Rank and file are measured in
     BODY LENGTHS now, so a school of parrotfish spreads out as far as a
     school of parrotfish needs to and a school of clownfish stays tight. */
  function wedge(p, i) {
    const s0 = KD.PX.has(p.n + '0') ? KD.PX.get(p.n + '0') : null;
    const w = s0 ? s0.w : 14, h = s0 ? s0.h : 10;
    if (i === 0) return { tx: 0, ty: 0 };
    const rank = 1 + ((i - 1) / 3 | 0);
    return {
      tx: -Math.round(w * (0.55 + rank * 0.78) + (i % 2 ? w * 0.22 : 0)),
      ty: Math.round((((i % 5) - 2) * 0.88 + (i % 2 ? 0.2 : -0.2)) * h)
    };
  }

  /* ---- re-casting -------------------------------------------------
     Eighteen shoals across eight species is two shoals of clownfish in
     the whole Atlantic, and the first pass at depth bands emptied the
     reef out completely as a result. So a shoal is not one species for
     life: when it wraps round the camera and its own water is nowhere
     near the frame, it comes back as something that DOES live here. A
     fixed budget of shoals, always cast for the depth you are at.
     ---------------------------------------------------------------- */
  let POOL = null;
  const here = (p, cy, vh) => p.y[0] * TS < cy + vh + 40 && p.y[1] * TS > cy - 40;
  function recast(sh, cy, vh) {
    if (!POOL || !POOL.length) return;
    if (here(sh.s, cy, vh)) return;               /* still our water */
    const fit = POOL.filter((p) => here(p, cy, vh));
    if (!fit.length) return;
    const p = fit[(Math.random() * fit.length) | 0];
    sh.s = p; sh.name = p.n; sh.band = p.band; sh.f = p.f;
    sh.sp = p.sp * (0.75 + Math.random() * 0.5);
    /* the school changes size with the species: a barracuda pack is not a
       cloud of clownfish */
    const size = p.size[0] + ((Math.random() * (p.size[1] - p.size[0] + 1)) | 0);
    sh.m.length = 0;
    for (let i = 0; i < size; i++) {
      const o = wedge(p, i);
      sh.m.push({
        tx: o.tx, ty: o.ty,
        x: sh.x, y: sh.y, ph: Math.random() * 9,
        beat: 2.6 + Math.random() * 2.0
      });
    }
  }

  function seed(n) {
    seedSky();
    shoals.length = 0;
    const pool = SPECIES.filter((p) => KD.PX.hasAny(p.n));
    POOL = pool;
    if (!pool.length) return;
    /* Eighteen shoals, not fifty-eight. They are recycled around the camera,
       so the count is not "how many in the ocean" but "how many within three
       screens of you" - and at the new zoom fifty-eight of them put four
       hundred fish inside one viewport. */
    const groups = n || 13;
    for (let g = 0; g < groups; g++) {
      const p = pool[(Math.random() * pool.length) | 0];
      const size = p.size[0] + ((Math.random() * (p.size[1] - p.size[0] + 1)) | 0);
      const sh = {
        s: p, name: p.n, band: p.band, f: p.f,
        x: Math.random() * KD.World.W * TS,
        y: (p.y[0] + Math.random() * (p.y[1] - p.y[0])) * TS,
        dir: Math.random() < 0.5 ? -1 : 1,
        sp: p.sp * (0.75 + Math.random() * 0.5),
        ph: Math.random() * 9, vy: 0, dart: 0, turn: 0, m: []
      };
      for (let i = 0; i < size; i++) {
        /* a wedge three ranks deep behind the leader: a single trailing
           line reads as a queue, not as a school */
        const o = wedge(p, i);
        sh.m.push({
          tx: o.tx, ty: o.ty,
          x: sh.x, y: sh.y,
          ph: Math.random() * 9,
          beat: 2.6 + Math.random() * 2.0       /* tail beats a second */
        });
      }
      shoals.push(sh);
    }
  }

  function tick(dt) {
    wind(dt);
    const wpx = KD.World.W * TS;
    const cx = KD.Cam ? KD.Cam.x : 0, cy = KD.Cam ? KD.Cam.y : 0;
    const vw = vwOf(), vh = vhOf();
    /* Recycle round the CAMERA in both axes, and over nearly three screens
       of travel rather than one, so a shoal you swam past does not pop back
       into frame ten seconds later. */
    const span = vw * 2.6 + 120;
    const T = KD.Game.t;
    const P = KD.Player && KD.Player.P;
    for (const sh of shoals) {
      /* ---- the leader ------------------------------------------- */
      if (sh.dart > 0) sh.dart -= dt;
      if (sh.turn > 0) sh.turn -= dt;
      /* the tail beat, and the surge that comes with it */
      const surge = 1 + 0.45 * Math.sin(T * 3.1 + sh.ph);
      const sp = sh.sp * surge * (sh.dart > 0 ? 3.1 : 1);
      const wasX = sh.x;
      sh.x += sp * sh.dir * dt;
      /* it wanders up and down instead of holding one line */
      const wantVy = Math.sin(T * 0.37 + sh.ph * 2.1) * 12;
      sh.vy += (wantVy - sh.vy) * Math.min(1, dt * 1.5);
      sh.y += sh.vy * dt;
      /* and it stays in its own water */
      const b0 = sh.s.y[0] * TS, b1 = sh.s.y[1] * TS;
      if (sh.y < b0) { sh.y = b0; sh.vy = Math.abs(sh.vy); }
      if (sh.y > b1) { sh.y = b1; sh.vy = -Math.abs(sh.vy); }
      /* the odd change of mind */
      if (sh.turn <= 0 && sh.dart <= 0 && Math.random() < dt * 0.07) {
        sh.dir = -sh.dir; sh.turn = 2.6;
      }
      /* SCATTER. He swims into them and they go. */
      if (P && sh.dart <= 0) {
        const dx = sh.x - P.x, dy = sh.y - P.y;
        if (dx * dx + dy * dy < 54 * 54) {
          sh.dart = 0.7 + Math.random() * 0.5;
          sh.dir = dx >= 0 ? 1 : -1;
          sh.vy = dy >= 0 ? 30 : -30;
          sh.turn = 1.4;
        }
      }
      /* ---- recycling -------------------------------------------- */
      let jump = 0;
      const rel = sh.x - cx;
      if (rel < -span * 0.4) { jump = span; }
      else if (rel > span * 0.8) { jump = -span; }
      if (jump) {
        sh.x += jump;
        recast(sh, cy, vh);
        const ny = bandY(sh, cy, vh);
        for (const m of sh.m) { m.x += jump; m.y = ny + m.ty; }
        sh.y = ny;
        sh.dart = 0;
      }
      if (sh.x < 0) { sh.x += wpx; for (const m of sh.m) m.x += wpx; }
      else if (sh.x > wpx) { sh.x -= wpx; for (const m of sh.m) m.x -= wpx; }
      /* ---- the rest of the school ------------------------------- */
      /* They chase a slot rather than sitting in one, so the shoal squeezes
         up when the leader turns and stretches out when it bolts. */
      const k = Math.min(1, dt * (sh.dart > 0 ? 6.0 : 2.6));
      for (let i = 0; i < sh.m.length; i++) {
        const m = sh.m[i];
        if (i === 0) { m.x = sh.x; m.y = sh.y; continue; }
        m.x += (sh.x + sh.dir * m.tx - m.x) * k;
        m.y += (sh.y + m.ty - m.y) * k;
      }
      if (wasX === sh.x && !jump) { /* nothing moved: leave it alone */ }
    }
  }

  function life(ctx, cam, near) {
    const T = KD.Game.t;
    for (const sh of shoals) {
      if ((sh.band === 2) === !!near) continue;
      const bolt = sh.dart > 0;
      for (const m of sh.m) {
        /* the beat drives the body too - a fish holding one height is a
           fish on a rail */
        const wob = Math.sin(T * m.beat + m.ph) * (sh.band === 2 ? 2.6 : 1.5);
        const px = Math.round(m.x - cam.x * sh.f);
        const py = Math.round(m.y + wob - cam.y * sh.f);
        if (px < -70 || px > KD.W + 70 || py < -50 || py > KD.H + 50) continue;
        /* and it drives the frame: a bolting fish beats faster */
        const name = KD.PX.frameOf(sh.name, T * (0.7 + m.beat * (bolt ? 0.55 : 0.28)) + m.ph);
        if (!KD.PX.has(name)) continue;
        /* Do not draw a fish inside the seabed. The shoals wander on their
           own y and nothing was checking whether that y had rock in it, so
           there were clownfish swimming around in the middle of the mud. */
        const ftx = (m.x / TS) | 0, fty = (m.y / TS) | 0;
        if (KD.World.solid(ftx, fty) || KD.World.water(ftx, fty) < 3) continue;
        const lit = KD.World.lightAt(ftx, fty);
        /* Capped. The reef is only mid-lit, so the light band alone was
           taking two steps off every fish in it and a school came out as a
           cloud of silhouettes with pink dots on. Ambient life is what
           tells you how deep you are; it has to stay legible.  */
        const shade = Math.min(sh.band === 2 ? 2 : 1,
          Math.max(sh.band === 2 ? 1 : 0, KD.PX.bandFor(lit, KD.Light.MAX)));
        KD.PX.blit(ctx, name, px, py, { anchor: false, flipX: sh.dir < 0, shade });
      }
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
  /* ---- the current ---------------------------------------------------
     A flat field of one colour is what "low resolution" actually looks
     like, and through the 2x lens the middle of the water column was
     three hundred square pixels of unbroken turquoise. So the water gets
     a GRAIN: short solid streaks in its own ramp, one step either side of
     the band it sits in, drifting sideways at three parallax depths.

     Solid, obviously. A dither at this scale is the mistake this whole
     pass exists to undo. Streaks eight to twenty pixels long read as
     water moving; anything shorter reads as dust and anything longer
     reads as a scratch on the screen.
     ------------------------------------------------------------------ */
  const DRIFT = [{ f: 0.30, sp: 5, n: 26, len: 18, up: false },
                 { f: 0.55, sp: 9, n: 22, len: 13, up: true },
                 { f: 0.90, sp: 15, n: 14, len: 9, up: false }];
  function drift(ctx, cam, t) {
    const sea = (KD.Gen.meta.sea || 34) * TS;
    for (let L = 0; L < DRIFT.length; L++) {
      const d = DRIFT[L];
      const spanW = KD.W + 60, spanH = KD.H + 40;
      for (let i = 0; i < d.n; i++) {
        const seed = i * 7919 + L * 104729;
        const x = (((seed % spanW) + t * d.sp * (i % 2 ? 1 : -1) - cam.x * d.f * 0.06)
                   % spanW + spanW) % spanW - 30;
        const wy = cam.y + ((((seed >> 5) % spanH) + spanH) % spanH) - 20;
        if (wy < sea + 8) continue;                 /* not in the sky */
        const sy = Math.round(wy - cam.y);
        if (sy < 0 || sy > KD.H) continue;
        const base = bandColAt(wy);
        const col = d.up ? (SHAFT_UP[base] || base) : (DOWN[base] || base);
        if (col === base) continue;                 /* nothing to say here */
        const len = d.len - (i % 4) * 2;
        KD.Screen.rect(Math.round(x), sy, Math.max(3, len), 1, col);
      }
    }
  }
  /* one step DOWN the ramp, for the darker half of the grain */
  const DOWN = { 'WATER.3': 'WATER.2', 'WATER.2': 'WATER.1', 'WATER.1': 'WATER.0',
                 'WATER.0': 'DEEP.2', 'DEEP.2': 'DEEP.1', 'DEEP.1': 'DEEP.0' };

  function back(ctx, cam, t) {
    const horizon = water(ctx, cam, t);
    drift(ctx, cam, t);
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
           get shoals() { return shoals; },
           /* a seam for the harness: what is swimming out there right now */
           _shoals: () => shoals };
})();
