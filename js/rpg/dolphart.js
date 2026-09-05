/* ============================================================
   rpg/dolphart.js - every dolphin in the game, drawn on demand.

   These are the biggest sprites in the game by a long way: 112 by
   52, against the 24 by 36 the old side-scrolling king got. That
   is not a zoom - nothing here is scaled up. A fight has two
   animals on screen where the tile world had eight hundred
   things, so each one can afford sixteen times the area, and
   that is what "higher resolution" actually means in pixel art.

   They are BUILT rather than stored. Six species times eight
   coats times six poses is two hundred and eighty-eight sprites
   of six thousand pixels, which is not something to paste into a
   source file - and it would still only give you two hundred and
   eighty-eight possible animals. So the rig is here, in code, and
   it draws one to a canvas the first time anybody asks for it.
   Every dolphin you catch can be its own shape.

   What a dolphin needs to read as a dolphin:

     A MELON. The forehead bulge is the whole silhouette; get it
     wrong and you have drawn a shark. It is a hard STEP down to
     the rostrum, not a blend - the first pass smoothed the two
     together and came out as a barracuda.
     COUNTERSHADING: a dark cape over the back, a hard line where
     it meets the pale flank, a white belly. The single most
     recognisable thing about the animal.
     A DORSAL raked back off a wide base, with a crease where it
     meets the back - without the crease the fin and the cape are
     the same tone meeting with no line between them.
     A FLIPPER in front of the flank, not behind it.
     FLUKES on a narrow wrist, notched.
     An EYE behind and below the melon crease, and a mouth line
     that turns up at the corner, which is the whole reason a
     dolphin looks like it is enjoying itself.
   ============================================================ */
KD.Dolph = (function () {
  const W = 112, H = 52;

  /* ---- the silhouette, by hand ------------------------------------
     (u, up, down) with u running 0 at the tail root to 1 at the tip of
     the rostrum, and up/down as fractions of the barrel half-depth. Read
     it as a side elevation: wrist, taper, chest, shoulder, the melon
     rising, the crease, and a beak held out in front. */
  const OUTLINE = [
    [0.000, 0.10, 0.10],
    [0.060, 0.26, 0.28],
    [0.140, 0.48, 0.52],
    [0.240, 0.70, 0.76],
    [0.340, 0.86, 0.92],
    [0.440, 0.96, 0.99],
    [0.540, 1.00, 1.00],
    [0.640, 0.99, 0.97],
    [0.720, 0.94, 0.90],
    [0.790, 0.86, 0.78],
    [0.850, 0.74, 0.62],
    [0.880, 0.62, 0.48],
    [0.895, 0.30, 0.34],
    [0.930, 0.27, 0.31],
    [0.970, 0.24, 0.28],
    [1.000, 0.15, 0.20]
  ];

  const BASE = {
    nose: 102, tail: 26, cy: 26, bh: 10.0, melon: 2.0, cape: 0.40, flex: 3.2,
    du: 0.54, dh: 11, dw: 12, rake: 9, pfu: 0.70, pfl: 13,
    fl: 13, fh: 11, eu: 0.155, ey: 4, ml: 13, mo: 1
  };
  const sp = (o) => Object.assign({}, BASE, o);

  /* Species differ in PROPORTION and fin shape, not just in hue: six
     recolours of one shape is a palette swatch, not a roster. */
  const SPECIES = {
    runt:    sp({}),
    bull:    sp({ nose: 100, tail: 30, bh: 12.5, melon: 3.6, dh: 11, dw: 15,
                  rake: 6, pfl: 15, fl: 12, fh: 12, ml: 10, cape: 0.48 }),
    spinner: sp({ nose: 106, tail: 22, bh: 8.5, melon: 1.4, dh: 16, dw: 10,
                  rake: 13, pfl: 12, fl: 15, fh: 13, ml: 16, flex: 4.4, cape: 0.34 }),
    pilot:   sp({ nose: 96, tail: 30, bh: 13.5, melon: 6.0, dh: 8, dw: 19,
                  rake: 3, pfl: 17, fl: 12, fh: 11, ml: 6, cape: 0.62 }),
    risso:   sp({ nose: 100, tail: 26, bh: 11.0, melon: 3.0, dh: 14, dw: 11,
                  rake: 10, pfl: 14, fl: 13, fh: 11, ml: 8, cape: 0.26 }),
    commons: sp({ nose: 104, tail: 24, bh: 9.0, melon: 1.8, dh: 12, dw: 11,
                  rake: 10, pfl: 12, fl: 14, fh: 12, ml: 15, cape: 0.36 })
  };
  const NAMES = {
    runt: 'Coastal', bull: 'Bull', spinner: 'Spinner',
    pilot: 'Pilot', risso: 'Risso', commons: 'Common'
  };

  /* ink, cape dark, cape, flank, belly */
  const COATS = {
    slate:  ['INK.0', 'DEEP.0', 'DEEP.1', 'DEEP.2', 'DEEP.3'],
    steel:  ['INK.0', 'STONE.0', 'STONE.1', 'STONE.2', 'STONE.3'],
    ink:    ['INK.0', 'INK.1', 'INK.2', 'INK.3', 'BONE.0'],
    bronze: ['INK.0', 'GOLD.0', 'GOLD.1', 'GOLD.2', 'GOLD.3'],
    rose:   ['INK.0', 'CORAL.0', 'CORAL.1', 'CORAL.2', 'CORAL.3'],
    jade:   ['INK.0', 'KELP.0', 'KELP.1', 'KELP.2', 'KELP.3'],
    violet: ['INK.0', 'ROT.0', 'ROT.1', 'ROT.2', 'ROT.3'],
    sand:   ['INK.0', 'SAND.0', 'SAND.1', 'SAND.2', 'SAND.3']
  };
  const COAT_IDS = Object.keys(COATS);
  const SPECIES_IDS = Object.keys(SPECIES);
  const MARKS = [null, 'spot', 'stripe', 'scar', 'saddle'];

  /*            bend  sweep  lift  mouth */
  const POSES = {
    cruise0: [-1.0, 0.9, 0, 0],
    cruise1: [1.0, -0.9, 1, 0],
    charge:  [0.0, 1.4, -1, 1],
    strike:  [2.2, -1.6, -2, 1],
    hit:     [-2.6, 0.4, 3, 1],
    stagger: [1.6, 1.2, 4, 1]
  };

  /* ---- the canvas -------------------------------------------------- */
  const cache = new Map();
  let cv = null, cx = null;

  function tab(u) {
    if (u <= OUTLINE[0][0]) return [OUTLINE[0][1], OUTLINE[0][2]];
    for (let k = 0; k < OUTLINE.length - 1; k++) {
      const a = OUTLINE[k], b = OUTLINE[k + 1];
      if (u <= b[0]) {
        const f = (u - a[0]) / (b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      }
    }
    const L = OUTLINE[OUTLINE.length - 1];
    return [L[1], L[2]];
  }

  function build(species, coat, pose, mark, seed) {
    const S = SPECIES[species] || SPECIES.runt;
    const P = COATS[coat] || COATS.slate;
    const pz = POSES[pose] || POSES.cruise0;
    const bend = pz[0], sweep = pz[1], lift = pz[2], mouth = pz[3];
    const g = new Array(H);
    for (let y = 0; y < H; y++) g[y] = new Array(W).fill(null);
    const px = (x, y, c) => {
      if (x >= 0 && x < W && y >= 0 && y < H) g[y | 0][x | 0] = c;
    };
    const d0 = P[0], d1 = P[1], d2 = P[2], d3 = P[3], d4 = P[4];

    /* ---- profile ---- */
    const top = {}, bot = {}, mid = {};
    const len = S.nose - S.tail;
    for (let x = S.tail; x <= S.nose; x++) {
      const u = (x - S.tail) / len;
      const rear = Math.max(0, (0.55 - u) / 0.55);
      const cy = S.cy + bend * Math.pow(rear, 1.4) * S.flex;
      const t = tab(u);
      let up = t[0];
      if (u > 0.70 && u < 0.86) {
        up += (S.melon / S.bh) * Math.sin((u - 0.70) / 0.16 * Math.PI);
      }
      top[x] = cy - up * S.bh;
      bot[x] = cy + t[1] * S.bh;
      mid[x] = cy;
    }

    /* ---- flukes: two blades on a narrow wrist ---- */
    {
      const tx = S.tail, cy0 = mid[tx];
      for (let k = 0; k <= S.fl; k++) {
        const f = (k + 1) / (S.fl + 1);
        const x = tx - k;
        let spread, notch;
        if (f < 0.32) { spread = 1 + Math.round(f * 4); notch = 0; }
        else {
          const g2 = (f - 0.32) / 0.68;
          spread = 2 + Math.round(S.fh * Math.pow(g2, 0.62));
          notch = Math.round(spread * 0.62 * g2);
        }
        const c = Math.round(cy0) + Math.round(sweep * 4.0 * f + bend * 0.7);
        for (let j = -spread; j <= spread; j++) {
          if (notch && Math.abs(j) < notch) continue;
          px(x, c + j, Math.abs(j) > spread - 2 ? d2 : d1);
        }
        px(x, c - spread - 1, d0); px(x, c + spread + 1, d0);
        if (notch) { px(x, c - notch, d0); px(x, c + notch, d0); }
      }
    }

    /* ---- the body, countershaded ---- */
    for (let x = S.tail; x <= S.nose; x++) {
      const t = top[x], b = bot[x];
      if (b - t < 1) continue;
      const ti = Math.round(t), bi = Math.round(b);
      const span = Math.max(1, bi - ti);
      const u = (x - S.tail) / len;
      /* THE CAPE. A hard edge between the dark back and the pale flank,
         dipping under the dorsal and rising over the eye. */
      const capeAt = S.cape + 0.10 * Math.sin(u * 3.1 + 0.6);
      for (let y = ti; y <= bi; y++) {
        const a = (y - ti) / span;
        px(x, y, a < capeAt * 0.22 ? d1
               : a < capeAt ? d2
               : a < capeAt + 0.30 ? d3 : d4);
      }
      px(x, ti - 1, d0); px(x, bi + 1, d0);
      if (x % 2 === 0) px(x, ti, d2);
    }

    /* ---- the dorsal, raked back off a wide base ---- */
    {
      const bx = Math.round(S.tail + len * S.du);
      const base = top[bx];
      for (let k = 0; k <= S.dh; k++) {
        const f = k / S.dh;
        const lead = bx + S.dw * 0.42 - S.rake * Math.pow(f, 0.55);
        const trail = bx - S.dw * 0.58 - S.rake * Math.pow(f, 1.25) - 3 * f;
        if (lead < trail) break;
        const x0 = Math.round(trail), x1 = Math.round(lead);
        for (let x = x0; x <= x1; x++) {
          const y = Math.round(Math.min(base, top[x] === undefined ? base : top[x]) - k + 1);
          px(x, y, d1);
          if (x === x1) { px(x, y, k < S.dh - 2 ? d3 : d2); px(x + 1, y, d0); }
          if (x === x0) px(x - 1, y, d0);
        }
      }
      /* the crease at the root */
      for (let x = Math.round(bx - S.dw * 0.58); x <= Math.round(bx + S.dw * 0.42); x++) {
        const tt = top[x] === undefined ? base : top[x];
        px(x, Math.round(Math.min(base, tt) + 1), d0);
      }
    }

    /* ---- the near flipper, ON TOP of the flank ---- */
    {
      const bx = Math.round(S.tail + len * S.pfu);
      const by = Math.round(bot[bx] - 7);
      const L = S.pfl;
      for (let k = 0; k <= L; k++) {
        const f = k / L;
        const x = bx - Math.round(f * L * 0.80);
        const y = by + Math.round(f * (L * 0.62 + lift));
        const h = Math.max(1, Math.round(5.0 * (1 - f * 0.82)));
        for (let j = 0; j < h; j++) px(x, y + j, j ? d1 : d2);
        px(x, y - 1, d0); px(x, y + h, d0);
      }
    }

    /* ---- markings ---- */
    if (mark) {
      const rnd = (n) => (Math.sin((seed || 1) * 12.9898 + n * 78.233) * 43758.5453) % 1;
      if (mark === 'spot') {
        for (let i = 0; i < 30; i++) {
          const u = 0.18 + ((i * 0.031 + Math.abs(rnd(i)) * 0.02) % 0.62);
          const x = Math.round(S.tail + len * u);
          const t = top[x], b = bot[x];
          if (t === undefined) continue;
          const y = Math.round(t + (b - t) * (0.16 + ((i * 7) % 5) * 0.12));
          if (g[y] && g[y][x] && g[y][x] !== d0) { px(x, y, d1); px(x + 1, y, d1); }
        }
      } else if (mark === 'stripe') {
        for (let i = 0; i < 5; i++) {
          const x = Math.round(S.tail + len * (0.22 + i * 0.11));
          const t = top[x], b = bot[x];
          for (let y = Math.round(t + 2); y < t + (b - t) * 0.62; y++) {
            px(x, y, d1); px(x + 1, y, d1);
          }
        }
      } else if (mark === 'scar') {
        for (let i = 0; i < 4; i++) {
          const x = Math.round(S.tail + len * (0.28 + i * 0.13));
          const t = top[x];
          for (let k = 0; k < 7; k++) px(x + k, Math.round(t + 3 + k), k % 2 ? 'WHITE' : d3);
        }
      } else if (mark === 'saddle') {
        for (let x = Math.round(S.tail + len * 0.30); x < S.tail + len * 0.58; x++) {
          const t = top[x], b = bot[x];
          for (let y = Math.round(t + 1); y < t + (b - t) * 0.34; y++) px(x, y, d1);
        }
      }
    }

    /* ---- the face ---- */
    {
      const ex = Math.round(S.nose - len * S.eu);
      const ey = Math.round(mid[ex] - S.ey);
      /* the melon crease */
      for (let k = 0; k < 5; k++) px(ex + 4 + k, ey - 3 + (k >> 1), d1);
      /* the eye: a lid, a white, a pupil and a fold at the corner */
      for (let j = -1; j <= 2; j++) for (let i = -2; i <= 2; i++) px(ex + i, ey + j, d0);
      px(ex - 1, ey, 'WHITE'); px(ex, ey, 'WHITE');
      px(ex - 1, ey + 1, 'BONE.2');
      px(ex + 3, ey + 1, d1); px(ex + 4, ey + 2, d1);
      /* the blowhole */
      const bh = Math.round(S.nose - len * (S.eu + 0.06));
      px(bh, Math.round(top[bh] + 1), d0);
      px(bh + 1, Math.round(top[bh + 1] + 1), d0);
      /* the mouth, turning up at the corner */
      for (let k = 0; k < S.ml; k++) {
        const x = S.nose - k;
        const f = k / S.ml;
        const y = Math.round(mid[x] + S.mo + 1.6 * Math.pow(f, 2.2));
        px(x, y, d0);
        if (mouth && k > 2 && k < S.ml - 3) px(x, y + 1, k % 2 ? 'WHITE' : d0);
      }
      /* a lit top to the rostrum */
      for (let k = 4; k < S.ml - 2; k++) {
        const x = S.nose - k;
        px(x, Math.round(top[x] + 1), d3);
      }
    }

    /* ---- to a canvas ---- */
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      cx = cv.getContext('2d');
    }
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    const img = octx.createImageData(W, H);
    const D = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = g[y][x];
        if (!c) continue;
        const rgb = KD.PAL.rgb(c);
        const i = (y * W + x) * 4;
        D[i] = rgb[0]; D[i + 1] = rgb[1]; D[i + 2] = rgb[2]; D[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return out;
  }

  /* one canvas per (species, coat, pose, mark) - a save holds a handful of
     animals, so the cache never grows past a few dozen entries */
  function get(d, pose) {
    const key = d.sp + '|' + d.coat + '|' + pose + '|' + (d.mark || '-') + '|' + (d.seed | 0);
    let c = cache.get(key);
    if (!c) { c = build(d.sp, d.coat, pose, d.mark, d.seed); cache.set(key, c); }
    return c;
  }

  /* Drawn at 1:1. No lens, no scale - the detail IS the resolution. */
  function draw(ctx, d, pose, x, y, o) {
    o = o || {};
    const c = get(d, pose);
    ctx.imageSmoothingEnabled = false;
    if (o.flip) {
      ctx.save();
      ctx.translate(Math.round(x) + W, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(c, Math.round(x), Math.round(y));
    }
  }

  return { W, H, SPECIES, SPECIES_IDS, COATS, COAT_IDS, MARKS, NAMES, POSES,
           build, get, draw };
})();
