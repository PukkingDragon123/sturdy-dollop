/* ============================================================
   ui/mark.js - markers.

   Everything that points at something. There were four different
   improvised chevrons doing this job across three scenes, all of
   them three stacked rects, and none of them said WHAT the thing
   was. One module now, four shapes, and a glyph in the middle
   that tells you whether the thing wants talking to, hitting, or
   walking to.

   The objective marker is a gold diamond with a rotating tick
   ring and a beam down to the ground point, because a floating
   diamond on its own reads as a collectible and a beam says "the
   thing is HERE, at this spot".
   ============================================================ */
KD.Mark = (function () {
  const R = KD.Screen.rect;

  /* 5x5 glyphs, one per objective kind */
  const GLYPH = {
    talk:  ['.###.', '#####', '#####', '.###.', '..#..'],
    fight: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    go:    ['#####', '.###.', '.###.', '..#..', '..#..'],
    use:   ['..#..', '..#..', '..#..', '.....', '..#..'],
    ride:  ['.###.', '#####', '.#.#.', '#...#', '#...#']
  };

  /* s = pixel size. At 1 this is a 5x5 stamp for a brass tag; at 2 it is
     the 10x10 icon in the middle of the floating marker, which is the
     smallest that reads as a SHAPE rather than as a dot. */
  function glyph(x, y, kind, col, s) {
    const g = GLYPH[kind] || GLYPH.go;
    s = s || 1;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === '#') R(x + c * s, y + r * s, s, s, col);
      }
    }
  }

  /* a diamond, stepped: widths grow to the middle and shrink again */
  function diamond(cx, cy, half, fill, lit, dark) {
    for (let r = -half; r <= half; r++) {
      const w = (half - Math.abs(r)) * 2 + 1;
      R(cx - (w >> 1), cy + r, w, 1, fill);
    }
    /* one lit facet and one shaded, so it is a solid and not a lozenge */
    for (let r = -half + 1; r <= 0; r++) {
      R(cx - (half - Math.abs(r)), cy + r, 2, 1, lit);
    }
    for (let r = 0; r <= half - 1; r++) {
      R(cx + (half - Math.abs(r)) - 1, cy + r, 2, 1, dark);
    }
  }

  /* ---- the objective marker ---------------------------------------
     sx, sy is the GROUND point of the thing it marks; o.up is how far
     above that the diamond floats. It has to clear the sprite - the first
     cut used a flat 40 and parked the diamond squarely on the queen's
     face, which read as a hat. */
  function objective(sx, sy, kind, t, o) {
    o = o || {};
    const col = o.col || 'GOLD';
    const up = o.up || 46;
    const bob = Math.round(Math.sin(t * 3) * 3);
    const cy = Math.round(sy - up + bob);
    /* A stepped disc on the ground at its feet. The cut before this ran a
       dashed beam the whole way down from the diamond, which meant gold
       dashes across the queen's face and dress; a floating icon plus a mark
       on the ground says the same thing and touches nobody. */
    if (o.foot !== false) {
      R(sx - 10, sy - 1, 21, 2, 'INK.1');
      R(sx - 9, sy - 3, 19, 2, col + '.1');
      R(sx - 6, sy - 4, 13, 1, col + '.2');
      R(sx - 3, sy - 5, 7, 1, col + '.3');
    }
    /* three dashes under the icon, thinning downward - a tail, not a beam */
    for (let k = 0; k < 3; k++) {
      const w = 7 - k * 2;
      R(sx - (w >> 1), cy + 15 + k * 7, w, 3, k ? col + '.1' : col + '.2');
    }
    /* three sparkles turning round it. Eight of them read as debris. */
    for (let k = 0; k < 3; k++) {
      const a = k * 2.094 + t * 1.2;
      const px = Math.round(sx + Math.cos(a) * 18), py = Math.round(cy + Math.sin(a) * 18);
      R(px - 2, py, 5, 1, col + '.3');
      R(px, py - 2, 1, 5, col + '.3');
    }
    /* the diamond: an ink one a size up first, so it reads off grey stone */
    diamond(sx, cy, 13, 'INK.0', 'INK.0', 'INK.0');
    diamond(sx, cy, 12, col + '.1', col + '.3', col + '.0');
    R(sx - 6, cy - 6, 13, 13, 'INK.0');
    R(sx - 6, cy - 6, 13, 1, 'INK.1');
    glyph(sx - 5, cy - 5, kind, col + '.3', 2);
  }

  /* ---- the off-screen pointer -------------------------------------
     When the thing is past the edge of the frame, pin a plate to that edge
     with an arrow and the distance. Without this the marker simply is not
     there and the objective may as well not exist. */
  function offscreen(wx, wy, cam, kind, t, o) {
    o = o || {};
    const col = o.col || 'GOLD';
    const sx = wx - cam.x, sy = wy - cam.y;
    if (sx > 15 && sx < KD.W - 15 && sy > 15 && sy < KD.H - 15) return false;
    /* The point sticks 9px out of the plate, so the plate has to sit that
       much further in - the first cut clamped to the frame edge and drew the
       arrow underneath its own plate, where it read as a stray gold stub. */
    const IN = 25;
    const ex = Math.round(Math.max(IN, Math.min(KD.W - IN, sx)));
    const ey = Math.round(Math.max(IN, Math.min(KD.H - IN, sy)));
    const dx = sx < ex ? -1 : (sx > ex ? 1 : 0);
    const dy = sy < ey ? -1 : 1;
    const pulse = Math.abs(Math.sin(t * 3)) > 0.5;
    /* a pennant: a plate with a point on the side the thing is on */
    R(ex - 12, ey - 11, 24, 24, 'INK.0');
    KD.Screen.frame(ex - 12, ey - 11, 24, 24, col + (pulse ? '.3' : '.1'));
    for (let k = 0; k < 9; k++) {
      const hh = 20 - k * 2;
      if (hh <= 0) break;
      if (dx) {
        const x = dx < 0 ? ex - 13 - k : ex + 12 + k;
        R(x, ey - (hh >> 1), 1, hh, 'INK.0');
        R(x, ey - (hh >> 1), 1, 1, col + '.3');
        R(x, ey + (hh >> 1) - 1, 1, 1, col + '.3');
      } else {
        const y = dy < 0 ? ey - 12 - k : ey + 12 + k;
        R(ex - (hh >> 1), y, hh, 1, 'INK.0');
        R(ex - (hh >> 1), y, 1, 1, col + '.3');
        R(ex + (hh >> 1) - 1, y, 1, 1, col + '.3');
      }
    }
    /* and the seam where the point meets the plate, so it is one shape */
    if (dx) R(dx < 0 ? ex - 12 : ex + 11, ey - 9, 1, 18, 'INK.0');
    else R(ex - 9, dy < 0 ? ey - 11 : ey + 10, 18, 1, 'INK.0');
    glyph(ex - 5, ey - 9, kind, col + '.3', 2);
    /* how far, in whole tiles */
    const d = Math.round(Math.hypot(sx - ex, sy - ey) / 8);
    KD.Text.draw(d + 'M', ex, ey + 3, 'BONE.2', { tiny: true, align: 'center' });
    return true;
  }

  /* ---- the combat callout ------------------------------------------
     A lock-on box round the thing, not a chevron over it. The chevron cut
     read as two disconnected red smudges either side of its head; four
     corners breathing inward read as something being AIMED at. */
  function threat(sx, sy, t, open, o) {
    o = o || {};
    const col = open ? 'KELP' : 'BLOOD';
    const rx = o.rx || 22, ry = o.ry || 13;
    const breathe = Math.round(Math.abs(Math.sin(t * (open ? 7 : 3))) * 3);
    const bx = rx + 3 - breathe, by = ry + 3 - breathe;
    const L = 9, TH = 2;
    for (const gx of [-1, 1]) {
      for (const gy of [-1, 1]) {
        const cx = sx + gx * bx, cy = sy + gy * by;
        R(gx < 0 ? cx : cx - L + TH, gy < 0 ? cy : cy - TH + 1, L, TH, col + '.3');
        R(gx < 0 ? cx : cx - TH + 1, gy < 0 ? cy : cy - L + TH, TH, L, col + '.3');
      }
    }
    /* and a wedge sitting ON the top edge, so it is one shape and not a
       chevron floating above a box */
    const y = sy - by - 5;
    for (let k = 0; k < 4; k++) R(sx - 4 + k, y + k, 9 - k * 2, 2, col + '.3');
    if (open) {
      KD.Text.draw('NOW', sx, y - 10, 'KELP.3',
                   { align: 'center', tiny: true, shadow: 'INK.0' });
    }
  }

  /* ---- the tap destination -----------------------------------------
     A flat ring on the ground with a pin standing in it. The cut before this
     was two rings of eight dots and a cross, which at three-times zoom read
     as a small gold splat rather than as a place to walk to. */
  function ring(cx, cy, rx, ry, col) {
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy / ry) * (dy / ry);
      const hw = Math.round(rx * Math.sqrt(Math.max(0, k)));
      if (hw < 1) continue;
      R(cx - hw, cy + dy, 2, 1, col);
      R(cx + hw - 1, cy + dy, 2, 1, col);
    }
  }

  function dest(sx, sy, t) {
    const p = (t * 1.4) % 1;
    for (const ph of [p, (p + 0.5) % 1]) {
      const rx = Math.round(5 + ph * 10);
      ring(sx, sy - 2, rx, Math.max(1, Math.round(rx * 0.42)),
           ph > 0.72 ? 'GOLD.1' : 'GOLD.3');
    }
    /* the pin: a post with a pennant, planted on the spot */
    const bob = Math.round(Math.sin(t * 4) * 1.5);
    const top = sy - 20 + bob;
    R(sx - 1, top, 2, 19 - bob, 'GOLD.1');
    R(sx - 1, top, 1, 19 - bob, 'GOLD.3');
    R(sx - 3, sy - 3, 6, 2, 'GOLD.2');
    for (let k = 0; k < 7; k++) {
      R(sx + 1, top + 1 + k, Math.max(1, 8 - k), 1, k < 3 ? 'GOLD.3' : 'GOLD.2');
    }
    R(sx - 1, top - 1, 2, 2, 'BONE.2');
  }

  return { objective, offscreen, threat, dest, glyph, diamond, GLYPH };
})();
