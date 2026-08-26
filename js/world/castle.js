/* ============================================================
   world/castle.js - the architecture kit for Act One.

   Everything in here draws into a context you hand it, because
   the castle is BAKED: the scene builds one 900x210 canvas of
   stone, arches, glass and furniture at load, then blits the
   camera slice each frame. Ashlar masonry is a few thousand
   fills; done live it would cost the frame, done once it costs
   nothing and can be as detailed as it likes.

   Arches are stepped by hand from Math.sqrt into rows of rects.
   That is what the art rule is about - no ctx.arc, no gradient,
   no blur - and a stepped arch is what an arch looks like in
   pixels anyway.
   ============================================================ */
KD.CastleKit = (function () {
  const hex = (c) => KD.PAL.hex(c);

  /* deterministic per-block jitter, so the wall is varied but never
     shimmers between frames */
  function hash(x, y) {
    let h = (x * 73856093) ^ (y * 19349663);
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function fill(ctx, x, y, w, h, col) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = col[0] === '#' ? col : hex(col);
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /* ---- ashlar: staggered courses with mortar and the odd crack ------ */
  function stone(ctx, x, y, w, h, o) {
    o = o || {};
    const bw = o.bw || 18, bh = o.bh || 9;
    const ramp = o.ramp || 'STONE';
    const mortar = o.mortar || 'INK.2';
    fill(ctx, x, y, w, h, mortar);
    for (let row = 0, by = y; by < y + h; row++, by += bh) {
      const off = (row & 1) ? -(bw >> 1) : 0;
      for (let bx = x + off; bx < x + w; bx += bw) {
        const cx = Math.max(x, bx), cw = Math.min(bx + bw - 1, x + w) - cx;
        const ch = Math.min(bh - 1, y + h - by);
        if (cw <= 0 || ch <= 0) continue;
        const r = hash(bx, by);
        const step = r < 0.30 ? 1 : (r < 0.92 ? 2 : 3);
        fill(ctx, cx, by, cw, ch, ramp + '.' + step);
        /* a lit top edge is what makes a flat wall read as blocks; the
           matching foot shadow on every course turned it into a stack of
           stripes, so only every other course gets one */
        fill(ctx, cx, by, cw, 1, ramp + '.' + Math.min(3, step + 1));
        if (row & 1) fill(ctx, cx, by + ch - 1, cw, 1, ramp + '.' + Math.max(0, step - 1));
        if (r > 0.955 && ch > 3) {                 // a crack
          fill(ctx, cx + 3 + ((r * 90) | 0) % Math.max(1, cw - 6), by + 1, 1, ch - 2, 'INK.0');
        }
      }
    }
  }

  /* ---- an arch, stepped from a circle, returned as row insets ------- */
  function archRows(w, h) {
    const rows = [];
    const rx = w / 2;
    for (let i = 0; i < h; i++) {
      const dy = (h - 1 - i) / (h - 1 || 1);       // 1 at the top
      const inset = rx - rx * Math.sqrt(Math.max(0, 1 - dy * dy));
      rows.push(Math.round(inset));
    }
    return rows;
  }

  /* A hole in the wall with a voussoir ring around it. `back` is what you
     see through it. */
  function archway(ctx, x, y, w, h, o) {
    o = o || {};
    const crown = Math.min(h, Math.round(w * 0.55));
    const rows = archRows(w, crown);
    const back = o.back === null ? null : (o.back || 'INK.0');
    const ring = o.ring || 'STONE.3';
    for (let i = 0; i < h; i++) {
      const ins = i < crown ? rows[i] : 0;
      if (back) fill(ctx, x + ins, y + i, w - ins * 2, 1, back);
      /* a voussoir band four deep, lit on the left as everything else is */
      fill(ctx, x + ins - 4, y + i, 4, 1, ring);
      fill(ctx, x + ins - 4, y + i, 1, 1, 'BONE.1');
      fill(ctx, x + w - ins, y + i, 4, 1, ring);
      fill(ctx, x + w - ins + 3, y + i, 1, 1, 'STONE.0');
      if (i < crown) {
        fill(ctx, x + ins, y + i - 4, w - ins * 2, 4, ring);
        fill(ctx, x + ins, y + i - 4, w - ins * 2, 1, 'BONE.1');
      }
    }
    if (o.keystone) {
      fill(ctx, x + (w >> 1) - 3, y - 4, 6, 6, 'GOLD.1');
      fill(ctx, x + (w >> 1) - 2, y - 3, 4, 2, 'GOLD.3');
    }
  }

  /* ---- stained glass: lead, panes, and light on the floor ----------- */
  /* Glass is lit from BEHIND, so it wants the dark end of each ramp - at
     the light end six hues in four-pixel panes came out as rainbow
     confetti. Cool tones, one warm accent, and panes twice the size. */
  const PANE = ['DEEP.2', 'WATER.0', 'ROT.1', 'DEEP.1', 'GOLD.1', 'WATER.0'];
  function window_(ctx, x, y, w, h, o) {
    o = o || {};
    const crown = Math.round(w * 0.5);
    const rows = archRows(w, crown);
    const seed = o.seed === undefined ? x : o.seed;
    fill(ctx, x - 3, y - 3, w + 6, h + 5, 'STONE.0');
    fill(ctx, x - 2, y - 2, w + 4, h + 3, 'STONE.2');
    for (let i = 0; i < h; i++) {
      const ins = i < crown ? rows[i] : 0;
      const iw = w - ins * 2;
      if (iw <= 0) continue;
      for (let px = 0; px < iw; px++) {
        const gx = x + ins + px;
        /* diamond leading: which pane you are in comes from a coarse grid
           rotated 45 degrees, which in integer pixels is just a sum */
        const a = ((gx - x) + i) >> 3, b = ((gx - x) - i + 64) >> 3;
        const lead = (((gx - x) + i) % 16 === 0) || (((gx - x) - i + 64) % 16 === 0);
        const k = ((a * 7 + b * 13 + seed) % PANE.length + PANE.length) % PANE.length;
        fill(ctx, gx, y + i, 1, 1, lead ? 'INK.0' : PANE[k]);
      }
      fill(ctx, x + ins - 1, y + i, 1, 1, 'STONE.1');
      fill(ctx, x + w - ins, y + i, 1, 1, 'STONE.1');
    }
    /* mullions */
    for (let m = 1; m < 3; m++) {
      fill(ctx, x + Math.round(w * m / 3), y + crown - 2, 1, h - crown + 2, 'STONE.1');
    }
    fill(ctx, x - 3, y + h, w + 6, 3, 'STONE.1');
    fill(ctx, x - 3, y + h + 3, w + 6, 1, 'STONE.0');
  }

  /* Light from a window. Three passes went into this: a solid cone (read as
     a coloured wall), a dithered cone (read as the loudest thing in the
     room), and a dithered floor pool (read as snow). What works is not a
     scatter at all - it is a lighter COURSE of the surface the light lands
     on, which is legible at any zoom and never becomes noise. */
  function litStrip(ctx, x, y, w, h, ramp) {
    fill(ctx, x, y, w, h, ramp + '.3');
    fill(ctx, x, y, w, 1, 'BONE.1');
    fill(ctx, x + 1, y + h, w - 2, 1, ramp + '.2');
  }

  /* ---- columns ------------------------------------------------------ */
  function pillar(ctx, x, top, bot, o) {
    o = o || {};
    const w = o.w || 14;
    /* base */
    fill(ctx, x - 3, bot - 6, w + 6, 6, 'STONE.1');
    fill(ctx, x - 3, bot - 6, w + 6, 1, 'STONE.3');
    fill(ctx, x - 2, bot - 10, w + 4, 4, 'STONE.2');
    /* A cast shadow either side, or a stone pillar in front of a stone wall
       is invisible - which is exactly how the first pass looked. */
    fill(ctx, x - 5, top + 4, 2, bot - top - 8, 'INK.1');
    fill(ctx, x + w + 3, top + 4, 2, bot - top - 8, 'INK.1');
    /* shaft with flutes */
    fill(ctx, x, top + 8, w, bot - 10 - top - 8, 'STONE.1');
    for (let f = 1; f < w - 1; f += 3) {
      fill(ctx, x + f, top + 8, 1, bot - 18 - top, 'STONE.2');
      fill(ctx, x + f + 1, top + 8, 1, bot - 18 - top, 'STONE.0');
    }
    fill(ctx, x, top + 8, 1, bot - 18 - top, 'STONE.3');
    fill(ctx, x + w - 1, top + 8, 1, bot - 18 - top, 'STONE.0');
    /* capital */
    fill(ctx, x - 3, top + 3, w + 6, 6, 'STONE.2');
    fill(ctx, x - 4, top, w + 8, 4, 'STONE.3');
    fill(ctx, x - 4, top, w + 8, 1, 'BONE.1');
    fill(ctx, x - 3, top + 8, w + 6, 1, 'INK.1');
  }

  /* ---- hanging cloth ------------------------------------------------ */
  function banner(ctx, x, y, w, h, col, o) {
    o = o || {};
    fill(ctx, x - 2, y - 2, w + 4, 3, 'GOLD.1');    // the rail
    fill(ctx, x - 2, y - 2, w + 4, 1, 'GOLD.3');
    fill(ctx, x, y, w, h, col + '.1');
    /* folds: two lit and two dark, so it hangs instead of lying flat */
    for (let f = 0; f < w; f++) {
      const m = f % 9;
      if (m === 1 || m === 2) fill(ctx, x + f, y, 1, h, col + '.2');
      if (m === 6) fill(ctx, x + f, y, 1, h, col + '.0');
    }
    /* a notched hem */
    const notch = Math.round(w / 4);
    for (let i = 0; i < notch; i++) {
      fill(ctx, x + i, y + h + i, 1, 1, col + '.0');
      fill(ctx, x + w - 1 - i, y + h + i, 1, 1, col + '.0');
      fill(ctx, x + i, y + h - 1, 1, i + 1, col + '.1');
      fill(ctx, x + w - 1 - i, y + h - 1, 1, i + 1, col + '.1');
    }
    if (o.sigil !== false) trident(ctx, x + (w >> 1) - 4, y + Math.round(h * 0.3), 'GOLD');
  }

  /* the house mark: three prongs and a haft */
  function trident(ctx, x, y, ramp) {
    fill(ctx, x, y, 1, 5, ramp + '.3');
    fill(ctx, x + 4, y, 1, 5, ramp + '.3');
    fill(ctx, x + 8, y, 1, 5, ramp + '.3');
    fill(ctx, x, y + 5, 9, 2, ramp + '.3');
    fill(ctx, x + 4, y + 7, 1, 8, ramp + '.2');
    fill(ctx, x + 2, y + 14, 5, 2, ramp + '.3');
  }

  /* ---- floors -------------------------------------------------------- */
  function flagstone(ctx, x, y, w, h) {
    fill(ctx, x, y, w, h, 'INK.1');
    for (let row = 0, by = y; by < y + h; row++, by += 10) {
      const off = (row & 1) ? -12 : 0;
      for (let bx = x + off; bx < x + w; bx += 24) {
        const r = hash(bx, by + 999);
        const step = r < 0.3 ? 0 : (r < 0.75 ? 1 : 2);
        fill(ctx, bx, by, 23, 9, 'STONE.' + step);
        fill(ctx, bx, by, 23, 1, 'STONE.' + Math.min(3, step + 1));
      }
    }
  }

  function carpet(ctx, x, y, w, h) {
    fill(ctx, x, y, w, h, 'BLOOD.1');
    fill(ctx, x, y, w, 1, 'BLOOD.2');
    fill(ctx, x, y + h - 1, w, 1, 'BLOOD.0');
    fill(ctx, x + 2, y, 2, h, 'GOLD.1');
    fill(ctx, x + w - 4, y, 2, h, 'GOLD.1');
    for (let d = 8; d < w - 8; d += 16) {           // a row of gold lozenges
      for (let i = 0; i < 5; i++) {
        const ww = 1 + 2 * Math.min(i, 4 - i);
        fill(ctx, x + d + 2 - (ww >> 1) + 2, y + 2 + i, ww, 1, 'GOLD.2');
      }
    }
  }

  /* ---- fittings ------------------------------------------------------ */
  /* An iron arm off the wall with a bowl on the end. The first version was
     a stem with a cap and read as a mushroom. */
  function torchBracket(ctx, x, y) {
    fill(ctx, x, y + 2, 2, 10, 'RUST.0');            // the wall plate
    fill(ctx, x, y + 2, 1, 10, 'RUST.1');
    fill(ctx, x + 2, y + 6, 3, 2, 'RUST.1');         // the arm
    fill(ctx, x + 2, y + 6, 3, 1, 'RUST.2');
    fill(ctx, x + 4, y, 2, 8, 'RUST.1');             // the upright
    fill(ctx, x + 4, y, 1, 8, 'RUST.2');
    fill(ctx, x + 3, y - 1, 4, 1, 'RUST.2');         // a lip to hold the pitch
    fill(ctx, x + 4, y - 3, 2, 2, 'INK.0');
  }

  /* the flame is animated, so it is drawn live rather than baked */
  function flame(ctx, x, y, t, seed) {
    const f = Math.floor(t * 12 + seed) % 3;
    const hh = 6 + f;
    for (let i = 0; i < hh; i++) {
      const k = i / hh;
      const w = Math.max(1, Math.round(5 * (1 - k)) + (f === 1 && i === 2 ? 1 : 0));
      const col = k < 0.35 ? 'GOLD.3' : (k < 0.7 ? 'GOLD.2' : 'BLOOD.3');
      fill(ctx, x - (w >> 1), y - i, w, 1, col);
    }
    fill(ctx, x - 1, y - 1, 2, 1, 'BONE.2');
  }

  function chandelier(ctx, x, y, w) {
    fill(ctx, x + (w >> 1), 0, 1, y, 'INK.2');       // the chain
    fill(ctx, x, y, w, 3, 'GOLD.1');
    fill(ctx, x, y, w, 1, 'GOLD.3');
    fill(ctx, x, y + 3, 1, 3, 'GOLD.0');
    fill(ctx, x + w - 1, y + 3, 1, 3, 'GOLD.0');
    for (let c = 2; c < w - 2; c += 6) {
      fill(ctx, x + c, y - 5, 3, 5, 'BONE.2');       // candle stubs
      fill(ctx, x + c, y - 5, 1, 5, 'BONE.1');
    }
  }

  function candles(ctx, x, y, w, t) {
    for (let c = 2; c < w - 2; c += 6) flame(ctx, x + c + 1, y - 6, t, c);
  }

  /* a horizontal moulding across the wall, so a two-storey expanse of block
     has something in it at eye level */
  function stringCourse(ctx, x, y, w) {
    fill(ctx, x, y, w, 1, 'STONE.3');
    fill(ctx, x, y + 1, w, 3, 'STONE.2');
    fill(ctx, x, y + 4, w, 1, 'STONE.0');
    fill(ctx, x, y + 5, w, 1, 'INK.1');
    for (let k = 0; k < w; k += 12) fill(ctx, x + k, y + 1, 1, 3, 'STONE.1');
  }

  /* a woven hanging: bands of colour with a border, for the blank stretches */
  function tapestry(ctx, x, y, w, h, a, b) {
    fill(ctx, x - 1, y - 2, w + 2, 3, 'WOOD.1');
    fill(ctx, x - 1, y - 2, w + 2, 1, 'WOOD.3');
    fill(ctx, x, y + 1, w, h, a + '.1');
    fill(ctx, x + 1, y + 2, w - 2, h - 2, a + '.0');
    for (let r = 4; r < h - 3; r += 7) {
      fill(ctx, x + 2, y + r, w - 4, 2, b + '.1');
      fill(ctx, x + 2, y + r, w - 4, 1, b + '.2');
    }
    fill(ctx, x, y + 1, w, 1, a + '.2');
    fill(ctx, x, y + h, w, 1, 'INK.0');
    for (let k = 1; k < w - 1; k += 4) fill(ctx, x + k, y + h + 1, 2, 3, b + '.1');
  }

  return { fill, hash, stone, archway, archRows, window: window_,
           litStrip, stringCourse, tapestry,
           pillar, banner, trident, flagstone, carpet, torchBracket, flame,
           chandelier, candles };
})();
