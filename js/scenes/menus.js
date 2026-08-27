/* ============================================================
   scenes/menus.js - title, world generation, pause, death and
   the ending. All drawn from the same hand-drawn kit.
   ============================================================ */
KD.Scenes.title = (function () {
  /* The menu is a PICTURE, not a card: the fat king on a rock, looking east
     at the castle he does not live in any more. Everything in it is drawn
     here rather than baked, because it is four hundred rects and the title
     screen has nothing else to do with its frame. */
  let t = 0, sel = 0, items = [];
  const R = KD.Screen.rect;
  function enter() { t = 0; sel = 0; KD.UI.guard(0.2); }
  function update(dt) {
    t += dt;
    if (KD.In.isHit('F2')) KD.Game.go('spritetest', {});
    if (!items.length) return;
    if (KD.In.isHit('ArrowDown', 'KeyS')) { sel = (sel + 1) % items.length; beep(); }
    if (KD.In.isHit('ArrowUp', 'KeyW')) { sel = (sel + items.length - 1) % items.length; beep(); }
    if (KD.In.isHit('Enter', 'Space') && !KD.UI.blocked()) items[sel].act();
  }
  const beep = () => { if (KD.Sfx) KD.Sfx.play('click'); };

  /* ---- the logotype ------------------------------------------------
     A hand-built plate rather than three centred strings. The name is
     drawn twice - once in ink one pixel down and right, once in gold on
     top - which is how you get a letter to sit ON something at this size
     without a shadow blur.
     ------------------------------------------------------------------ */
  function tridentGlyph(x, y, col) {
    R(x, y, 1, 5, col); R(x + 3, y, 1, 5, col); R(x + 6, y, 1, 5, col);
    R(x, y + 4, 7, 1, col);
    R(x + 3, y + 4, 1, 6, col);
  }
  function logo(cx, y) {
    const nm = 'CROWNDEEP', sub = 'KING OF ATLANTIC';
    const nw = KD.Text.width(nm, { space: 2 });
    const sw = KD.Text.width(sub, { space: 1 });
    const tag = 'he had it all.  then he met a keg.';
    const w = Math.max(nw + 46, sw + 24, KD.Text.width(tag, { tiny: true }) + 20);
    const h = 43;
    const x = cx - (w >> 1);
    /* the plate */
    R(x - 2, y - 2, w + 4, h + 4, 'INK.0');
    R(x, y, w, h, 'DEEP.0');
    R(x + 1, y + 1, w - 2, 1, 'DEEP.2');
    R(x + 1, y + h - 2, w - 2, 1, 'INK.0');
    KD.Screen.frame(x, y, w, h, 'GOLD.1');
    KD.Screen.frame(x + 2, y + 2, w - 4, h - 4, 'GOLD.0');
    for (const [cx2, cy2, dx, dy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1],
                                      [x, y + h - 1, 1, -1],
                                      [x + w - 1, y + h - 1, -1, -1]]) {
      R(cx2, cy2, dx * 6, dy * 2, 'GOLD.2');
      R(cx2, cy2, dx * 2, dy * 6, 'GOLD.2');
      R(cx2 + dx, cy2 + dy, dx * 2, dy * 2, 'GOLD.3');
    }
    /* a trident either side of the name */
    tridentGlyph(x + 8, y + 8, 'GOLD.2');
    tridentGlyph(x + w - 15, y + 8, 'GOLD.2');
    /* the name, cut into the plate */
    KD.Text.draw(nm, cx + 1, y + 7, 'GOLD.0', { align: 'center', space: 2 });
    KD.Text.draw(nm, cx, y + 6, 'GOLD.3', { align: 'center', space: 2 });
    /* a rule under it, with a break in the middle for the diamond */
    R(x + 8, y + 19, (w >> 1) - 14, 1, 'GOLD.1');
    R(cx + 6, y + 19, (w >> 1) - 14, 1, 'GOLD.1');
    R(cx - 2, y + 18, 4, 1, 'GOLD.3'); R(cx - 1, y + 17, 2, 3, 'GOLD.3');
    KD.Text.draw(sub, cx, y + 23, 'WATER.3', { align: 'center', space: 1 });
    /* the strapline lives IN the plate. Under it, it landed exactly on the
       white foam line at the surface and could not be read at all. */
    KD.Text.draw(tag, cx, y + 34, 'BONE.1', { tiny: true, align: 'center' });
  }

  /* ---- one menu option --------------------------------------------
     A recessed dark slot with light letters. The selected one fills with
     brass, flips its letters to ink, and gets a trident pointing at it.
     ------------------------------------------------------------------ */
  function slot(x, y, w, h, label, on) {
    R(x - 1, y - 1, w + 2, h + 2, 'INK.0');
    R(x, y, w, h, on ? 'GOLD.1' : 'DEEP.0');
    R(x, y, w, 1, on ? 'GOLD.3' : 'INK.2');
    R(x, y + h - 1, w, 1, on ? 'GOLD.0' : 'INK.0');
    R(x, y, 1, h, on ? 'GOLD.2' : 'INK.2');
    R(x + w - 1, y, 1, h, on ? 'GOLD.0' : 'INK.0');
    const ty = y + Math.round((h - 7) / 2);
    if (on) {
      KD.Text.draw(label, x + (w >> 1) + 1, ty + 1, 'GOLD.3', { align: 'center' });
      KD.Text.draw(label, x + (w >> 1), ty, 'INK.0', { align: 'center' });
      const px = x - 11 + Math.round(Math.sin(t * 4) * 2);
      tridentGlyph(px, y + (h >> 1) - 5, 'GOLD.3');
      R(px + 7, y + (h >> 1) - 1, 4, 2, 'GOLD.2');
    } else {
      KD.Text.draw(label, x + (w >> 1), ty + 1, 'INK.0', { align: 'center' });
      KD.Text.draw(label, x + (w >> 1), ty, 'BONE.2', { align: 'center' });
    }
    return { x: x, y: y, w: w, h: h };
  }

  /* a rivet, and a barnacle, for the plaque itself */
  function rivet(x, y) {
    R(x - 2, y - 2, 5, 5, 'RUST.0');
    R(x - 1, y - 1, 3, 3, 'RUST.2');
    R(x - 1, y - 1, 2, 1, 'RUST.3');
  }
  function barnacle(x, y, n) {
    for (let i = 0; i < n; i++) {
      const bx = x + (i % 3) * 5, by = y + ((i / 3) | 0) * 4;
      R(bx, by, 5, 4, 'BONE.0');
      R(bx + 1, by, 3, 1, 'BONE.2');
      R(bx + 2, by + 1, 1, 2, 'INK.1');
    }
  }

  /* deterministic scatter, so nothing shimmers between frames */
  function hash(a, b) {
    let h = (a * 73856093) ^ (b * 19349663);
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* ---- his kingdom, small and far away ----------------------------
     The old one was three INK rectangles with orange dots in them, at the
     far dark end of the ramp against light water, and it read as a factory
     chimney cut out of black paper.

     Two things fix it. Architecture: a curtain wall with crenellations, a
     gatehouse with a real arch, three towers of different heights with
     roofs on them, and banners. And VALUE: something that far away through
     water is only a step or two darker than the water behind it, not eight.
     The only thing allowed to be bright is the light in the windows, and
     that is what makes it read as a home he does not live in any more.
     ------------------------------------------------------------------ */
  function litWindow(x, y, w, h) {
    R(x, y, w, h, 'GOLD.1');
    R(x, y, w, 1, 'GOLD.3');
    R(x, y + h - 1, w, 1, 'GOLD.0');
  }

  /* a tower: shaft, a corbelled band under the parapet, crenellations, and
     a roof. `lit` rows get a window. */
  function tower(x, base, w, h, roof) {
    R(x, base - h, w, h, 'DEEP.2');
    R(x, base - h, 2, h, 'DEEP.3');               /* the sunward face */
    R(x + w - 1, base - h, 1, h, 'DEEP.1');
    /* the parapet, wider than the shaft */
    const py = base - h - 4;
    R(x - 2, py, w + 4, 4, 'DEEP.2');
    R(x - 2, py, w + 4, 1, 'DEEP.3');
    for (let k = 0; k < w + 4; k += 4) R(x - 2 + k, py - 2, 2, 2, 'DEEP.2');
    if (roof) {
      /* a stepped cone, because a triangle drawn any other way needs a
         diagonal and diagonals in eight pixels are just stairs anyway */
      for (let k = 0; k < roof; k++) {
        const rw = Math.max(1, w + 2 - k * 2);
        R(x - 1 + k, py - 2 - roof + k, rw, 1, k < 2 ? 'ROT.1' : 'ROT.0');
      }
      R(x + (w >> 1) - 1, py - 4 - roof, 1, 4, 'DEEP.3');
      const f = Math.sin(t * 2.2 + x) > 0 ? 0 : 1;
      R(x + (w >> 1), py - 4 - roof, 4 - f, 3, 'BLOOD.1');
    }
    /* windows up the shaft, two rows of them */
    for (let k = 6; k < h - 5; k += 9) litWindow(x + 2, base - h + k, 2, 3);
  }

  function castle(cx, base, sc) {
    /* the shelf it stands on: it runs off both sides and keeps going down
       out of frame, so the castle is not floating on a dark lozenge */
    for (let k = 0; k < KD.H; k++) {
      const spread = Math.round(36 * sc + k * 2.4);
      const y = base + k;
      if (y > KD.H) break;
      R(cx - spread, y, spread * 2, 1, k < 2 ? 'DEEP.2' : 'DEEP.1');
      if (k > 3 && k % 8 === 0) R(cx - spread + 5, y, spread * 2 - 10, 1, 'DEEP.2');
    }
    R(cx - Math.round(36 * sc), base, Math.round(72 * sc), 1, 'DEEP.3');

    const w = Math.round(74 * sc);
    const x0 = cx - (w >> 1);
    /* ---- the curtain wall ---- */
    const wh = Math.round(15 * sc);
    R(x0, base - wh, w, wh, 'DEEP.1');
    R(x0, base - wh, w, 1, 'DEEP.2');
    for (let k = 0; k < w; k += 5) R(x0 + k, base - wh - 3, 3, 3, 'DEEP.1');
    /* arrow slits along it */
    for (let k = 4; k < w - 4; k += 9) R(x0 + k, base - wh + 4, 1, 4, 'DEEP.0');
    /* ---- the gatehouse, in the middle of the wall ---- */
    const gw = Math.round(16 * sc), gx = cx - (gw >> 1);
    const gh = Math.round(26 * sc);
    R(gx, base - gh, gw, gh, 'DEEP.2');
    R(gx, base - gh, 2, gh, 'DEEP.3');
    for (let k = 0; k < gw; k += 4) R(gx + k, base - gh - 2, 2, 2, 'DEEP.2');
    /* the arch: a lit passage, which is the one warm thing at ground level */
    const aw = Math.max(4, Math.round(7 * sc)), ax = cx - (aw >> 1);
    const ah = Math.round(10 * sc);
    R(ax, base - ah, aw, ah, 'INK.0');
    R(ax + 1, base - ah - 1, aw - 2, 1, 'INK.0');
    R(ax + 1, base - 3, aw - 2, 3, 'GOLD.0');
    R(ax + 2, base - 2, aw - 4, 2, 'GOLD.1');
    litWindow(gx + 3, base - gh + 5, Math.round(3 * sc), Math.round(4 * sc));
    litWindow(gx + gw - 3 - Math.round(3 * sc), base - gh + 5,
              Math.round(3 * sc), Math.round(4 * sc));
    /* ---- three towers, none of them the same height ---- */
    tower(x0 + Math.round(3 * sc), base, Math.round(9 * sc), Math.round(30 * sc), 6);
    tower(x0 + w - Math.round(12 * sc), base, Math.round(9 * sc), Math.round(24 * sc), 5);
    tower(cx - Math.round(6 * sc), base - gh, Math.round(12 * sc), Math.round(26 * sc), 10);
    /* and two more lights up the keep, so somebody is home in it */
    litWindow(cx - 1, base - gh - Math.round(14 * sc), 2, 3);
    litWindow(cx - 1, base - gh - Math.round(22 * sc), 2, 3);
  }

  /* ---- kelp, as silhouettes ---------------------------------------- */
  /* A stalk that tapers, with blades on ONE side per segment and angled
     down. The first version put an even blade either side of a parallel bar
     and the whole seabed came out as a field of crosses. */
  function weed(x, groundY, h, seed, col, edge) {
    const segs = Math.max(3, h >> 3);
    let px = x;
    for (let s2 = 0; s2 < segs; s2++) {
      const f = s2 / segs;
      const y = groundY - s2 * 8;
      px = x + Math.sin(t * 0.8 + seed) * 4 * f * f;
      const w = f > 0.7 ? 1 : (f > 0.35 ? 2 : 3);
      R(Math.round(px), y - 8, w, 9, col);
      R(Math.round(px), y - 8, 1, 9, edge || 'KELP.2');   // a lit edge down the stem
      if (s2 % 2 === 1) {                          // a frond, alternating sides
        const dir = (s2 & 2) ? 1 : -1;
        const len = 7 + (seed % 4);
        for (let b = 0; b < len; b++) {
          const bx2 = Math.round(px) + (dir > 0 ? w + b : -2 - b);
          const bh = 4 - (b > len - 3 ? 2 : 0);
          R(bx2, y - 6 + Math.round(b * 0.7), 2, bh, col);
          R(bx2, y - 6 + Math.round(b * 0.7), 2, 1, edge || 'KELP.2');
        }
      }
    }
    R(Math.round(px), groundY - segs * 8 - 3, 2, 3, col);   // a float on top
  }

  function draw(ctx) {
    const H = KD.H, W = KD.W;
    const sea = Math.round(H * 0.20);             // the waterline
    /* ---- sky ------------------------------------------------------ */
    const SKYB = ['DEEP.3', 'DEEP.4', 'WATER.0', 'WATER.1', 'WATER.2'];
    for (let k = 0; k < SKYB.length; k++) {
      const y0 = Math.round(sea * k / SKYB.length);
      R(0, y0, W, Math.round(sea * (k + 1) / SKYB.length) - y0 + 1, SKYB[k]);
    }
    /* The sun, low and ahead of him. It was a white lozenge with a gold
       line top and bottom, which read as a poached egg; concentric stepped
       rings and a couple of spikes read as light. */
    const sx = Math.round(W * 0.78), sy = 17;
    for (const [rr, col] of [[13, 'GOLD.1'], [10, 'GOLD.3'], [7, 'WHITE']]) {
      for (let dy = -rr; dy <= rr; dy++) {
        const hw = Math.round(Math.sqrt(Math.max(0, rr * rr - dy * dy)));
        if (hw < 1) continue;
        R(sx - hw, sy + dy, hw * 2, 1, col);
      }
    }
    for (let k = 0; k < 8; k++) {                 /* eight short spikes */
      const a = k * 0.785 + t * 0.15;
      const c0 = 14, c1 = 19;
      R(Math.round(sx + Math.cos(a) * c0), Math.round(sy + Math.sin(a) * c0),
        Math.max(1, Math.round(Math.abs(Math.cos(a)) * (c1 - c0))) || 1,
        Math.max(1, Math.round(Math.abs(Math.sin(a)) * (c1 - c0))) || 1, 'GOLD.2');
    }
    /* ---- water, in bands ------------------------------------------ */
    /* light at the top, dark at the bottom. The shafts below index into
       this, because a shaft has to be lighter than the band it crosses. */
    const WB = [['WATER.3', 0.06], ['WATER.2', 0.16], ['WATER.1', 0.34],
                ['WATER.0', 0.56], ['DEEP.2', 1.0]];
    let prev = sea, above = null;
    for (const [col, f] of WB) {
      const y1 = Math.round(sea + (H - sea) * f);
      R(0, prev, W, y1 - prev, col);
      if (above) {                                 // soften the seam
        KD.Dither.wash(ctx, 0, prev, W, 3, above, 0.5);
        KD.Dither.wash(ctx, 0, prev + 3, W, 3, above, 0.22);
      }
      above = col; prev = y1;
    }
    /* ---- the surface, from underneath ------------------------------ */
    for (let x = 0; x < W; x += 2) {
      const y = sea + Math.round(Math.sin(x * 0.05 + t * 1.4) * 2
                               + Math.sin(x * 0.017 - t * 0.8) * 2);
      /* broken foam, not a continuous white cable: two crests in three */
      if (((x >> 2) + ((t * 3) | 0)) % 3) R(x, y - 2, 2, 1, 'WHITE');
      R(x, y - 1, 2, 1, 'BONE.2');
      R(x, y, 2, 3, 'WATER.3');
      if (((x >> 1) + ((t * 6) | 0)) % 13 === 0) R(x, y - 4, 1, 1, 'WHITE');
    }
    /* ---- sunlight, solid and slanted -------------------------------
       Three, not five, and one step UP the ramp from whatever band the
       shaft is crossing. They used to be picked from a fixed list of four
       WATER tones, which meant that below a third of the way down the
       "light" was the same value as the water or darker than it - three
       dark streaks running through the middle of the picture.
       ------------------------------------------------------------------ */
    const bandAt = (yy) => {
      const f = (yy - sea) / Math.max(1, H - sea);
      for (let i = 0; i < WB.length; i++) if (f <= WB[i][1]) return i;
      return WB.length - 1;
    };
    for (let i = 0; i < 3; i++) {
      const bx = Math.round(W * (0.16 + i * 0.27) + Math.sin(t * 0.2 + i) * 8);
      for (let y = 0; y < (H - sea) * 0.72; y += 2) {
        const k = y / ((H - sea) * 0.72);
        const w = Math.round(11 * (1 - k * 0.8));
        if (w < 2) break;
        const bi = bandAt(sea + y);
        const col = bi === 0 ? 'BONE.2' : WB[bi - 1][0];
        R(bx + Math.round(y * 0.28), sea + y, w, 2, col);
      }
    }
    /* ---- his kingdom, on the far rock ------------------------------
       There was a band of lighter water behind it here for atmospheric
       haze. With hard ends it read as a pale rectangle painted on the sea,
       which is the same lesson as the god rays and the window light: at
       this size, either the whole surface changes or nothing does. The
       castle is only two steps darker than the water now, which does the
       job on its own. */
    const cbase = Math.round(H * 0.62);
    castle(Math.round(W * 0.50), cbase, 1.6);
    /* ---- a bed of weed between here and there ---------------------- */
    for (let i = 0; i < 22; i++) {
      const x = Math.round(((i * 137 + 40) % (W + 60)) - 30);
      const g = Math.round(H * (0.70 + (i % 3) * 0.03));
      weed(x, g, 26 + ((i * 53) % 30), i,
           i % 3 === 0 ? 'DEEP.1' : 'KELP.0',
           i % 3 === 0 ? 'DEEP.2' : 'KELP.1');
    }
    /* ---- fish, at three depths -------------------------------------
       an_cuda and an_moray are long grey capsules at this size and read as
       torpedoes, so the named species here are the ones with a shape and a
       colour, and the density comes from hand-drawn schools instead. */
    const FISH = ['an_clown', 'an_parrot', 'an_lion', 'an_cuttle'];
    for (let i = 0; i < 14; i++) {
      const name = FISH[i % FISH.length];
      if (!KD.PX.hasAny(name)) continue;
      const sp = 8 + (i % 5) * 7;
      const dir = i & 1 ? 1 : -1;
      const x = Math.round((((i * 191 + t * sp * dir) % (W + 80)) + W + 80) % (W + 80)) - 40;
      const y = Math.round(sea + 14 + ((i * 61) % Math.max(20, H - sea - 40))
                          + Math.sin(t * 1.1 + i) * 4);
      KD.PX.blit(ctx, KD.PX.frameOf(name, t + i), x, y,
                 { anchor: false, flipX: dir < 0, shade: i % 3 });
    }
    /* schools: three fish to a group, a body and a tail, nothing more */
    for (let g = 0; g < 11; g++) {
      const dir = g & 1 ? 1 : -1;
      const sp = 9 + (g % 4) * 5;
      const gx = Math.round((((g * 233 + t * sp * dir) % (W + 90)) + W + 90) % (W + 90)) - 45;
      const gy = Math.round(sea + 10 + ((g * 97) % Math.max(16, H - sea - 34)));
      const col = g % 3 ? 'DEEP.3' : 'CORAL.1';
      for (let f = 0; f < 4; f++) {
        const fx = gx + f * 6, fy = gy + ((f % 2) ? 4 : 0)
                 + Math.round(Math.sin(t * 2 + g + f) * 1.5);
        R(fx, fy, 3, 2, col);
        R(fx + (dir > 0 ? 3 : -1), fy, 1, 2, dir > 0 ? 'DEEP.2' : 'DEEP.2');
        R(fx + (dir > 0 ? -1 : 3), fy, 1, 1, col);
      }
    }
    /* ---- bubbles, lots of them ------------------------------------- */
    for (let i = 0; i < 60; i++) {
      const bx = Math.round((i * 71 + 13) % W + Math.sin(t * 1.3 + i) * 3);
      const by = H - ((t * (11 + i % 9) + i * 43) % (H - sea + 30));
      if (by < sea) continue;
      const sz = (i % 5) ? 1 : 2;
      R(bx, Math.round(by), sz, sz, i % 4 ? 'WATER.3' : 'BONE.2');
    }
    /* ---- the rock he is standing on --------------------------------
       Blocked, so it reads as a broken quay rather than a platform, with
       the top course catching the light and weed in the joints. */
    const ledge = Math.round(H * 0.78);
    const lw = Math.round(W * 0.46);
    for (let k = 0; k < H - ledge + 4; k++) {
      const w = lw - Math.round(k * 0.6);
      R(0, ledge + k, Math.max(0, w), 1, k < 3 ? 'STONE.1' : 'INK.1');
    }
    for (let ry = ledge + 4; ry < H + 4; ry += 9) {
      const w = lw - Math.round((ry - ledge) * 0.6);
      for (let rx = ((ry / 9) | 0) % 2 ? -9 : 0; rx < w; rx += 19) {
        const q = hash(rx, ry);
        R(rx, ry, Math.min(18, w - rx), 8,
          q < 0.34 ? 'INK.1' : (q < 0.62 ? 'INK.2' : (q < 0.88 ? 'STONE.0' : 'STONE.1')));
        R(rx, ry, Math.min(18, w - rx), 1, 'INK.3');
        if (q > 0.72) R(rx + 2, ry + 5, Math.min(9, w - rx - 3), 2, 'INK.1');
      }
    }
    /* the top course, and a lit lip along the front of it */
    R(0, ledge, lw, 3, 'STONE.1');
    R(0, ledge, lw, 1, 'STONE.3');
    R(lw - 2, ledge, 2, 4, 'STONE.3');
    R(0, ledge + 3, lw, 1, 'INK.0');
    /* sprigs and barnacles in the joints, because bare rock is a platform */
    for (let i = 0; i < 8; i++) {
      const x = Math.round(lw * (0.06 + i * 0.12));
      weed(x, ledge, 11 + ((i * 37) % 13), i + 40, 'KELP.0');
    }

    /* ---- and the man himself --------------------------------------- */
    if (KD.PX.hasAny('ti_king')) {
      KD.PX.blit(ctx, KD.PX.frameOf('ti_king', t), Math.round(W * 0.22), ledge + 1);
    }

    /* ---- foreground kelp down the left edge, in front of everything ---
       Without it the composition ran off the side and the eye fell out of
       frame before it ever reached the castle. Drawn last, and at the ink
       end of the ramp, so it reads as a near silhouette. */
    for (let i = 0; i < 3; i++) {
      weed(-8 + i * 11, H + 10, 86 + ((i * 41) % 40), i + 90, 'INK.0', 'INK.1');
    }

    /* ---- the words --------------------------------------------------
       Three lines of bare centred text over a picture is a debug overlay,
       not a title. This is a plate: ink ground, a gold double frame with
       corner joinery, a trident either side of the name, a rule under it,
       and the subtitle inside the same box. The tagline hangs below on its
       own, in tiny text, because it is an aside and should read as one.
       ------------------------------------------------------------------ */
    logo(Math.round(W / 2), Math.round(H * 0.03));

    /* ---- the menu ------------------------------------------------- */
    items = [];
    if (KD.State.hasSave()) {
      items.push({ label: 'CONTINUE', act: () => {
        if (KD.State.load()) {
          /* Somebody who quit halfway through Act One has a save but no
             generated world, so sending them to `play` dropped them into an
             empty one. The prologue is where they left off. */
          const a = KD.State.S.act1;
          KD.Game.go(a && !a.done ? 'castle' : 'play', {});
        } else KD.State.say('That save is broken.', 'BLOOD.2');
      } });
      items.push({ label: 'NEW WORLD', act: () => {
        KD.State.wipe();
        if (!KD.Cine.play('intro')) KD.Game.go('wake', {});
      } });
    } else {
      items.push({ label: 'ANOTHER DAY', act: () => {
        if (!KD.Cine.play('intro')) KD.Game.go('wake', {});
      } });
    }
    items.push({ label: 'HOW TO PLAY', act: () => KD.Game.go('help', { from: 'title' }) });
    items.push({ label: KD.Sfx.isMuted() ? 'SOUND OFF' : 'SOUND ON', act: () => KD.Sfx.mute() });
    if (sel >= items.length) sel = items.length - 1;

    const pw = 136, ph = items.length * 21 + 26;
    const pxx = W - pw - 14, pyy = H - ph - 12;
    /* The plaque. It was a grey stone slab with three flat brown plates on
       it and dark letters cut into them, and brown-on-grey at this size is
       cardboard. Dark slate, a gold frame, and light letters on dark slots -
       with gold used only for the one that is selected, so the eye goes
       straight to it instead of having to compare three brown bars. */
    R(pxx - 2, pyy - 2, pw + 4, ph + 4, 'INK.0');
    R(pxx, pyy, pw, ph, 'INK.1');
    for (let ry = pyy + 2; ry < pyy + ph - 2; ry += 6) {
      for (let rx = pxx + (((ry - pyy) / 6 | 0) % 2 ? -7 : 1); rx < pxx + pw - 1; rx += 15) {
        const q = hash(rx, ry);
        const cw = Math.min(14, pxx + pw - 1 - Math.max(pxx + 1, rx));
        if (cw <= 0) continue;
        R(Math.max(pxx + 1, rx), ry, cw, 5, q < 0.5 ? 'INK.1' : 'INK.2');
        R(Math.max(pxx + 1, rx), ry, cw, 1, 'INK.2');
      }
    }
    R(pxx, pyy, pw, 1, 'INK.3');
    R(pxx, pyy + ph - 1, pw, 1, 'INK.0');
    KD.Screen.frame(pxx, pyy, pw, ph, 'GOLD.1');
    KD.Screen.frame(pxx + 2, pyy + 2, pw - 4, ph - 4, 'GOLD.0');
    /* corner joinery, so the frame is made of parts */
    for (const [cx2, cy2, dx, dy] of [[pxx, pyy, 1, 1], [pxx + pw - 1, pyy, -1, 1],
                                      [pxx, pyy + ph - 1, 1, -1],
                                      [pxx + pw - 1, pyy + ph - 1, -1, -1]]) {
      R(cx2, cy2, dx * 7, dy * 2, 'GOLD.2');
      R(cx2, cy2, dx * 2, dy * 7, 'GOLD.2');
      R(cx2 + dx, cy2 + dy, dx * 2, dy * 2, 'GOLD.3');
    }
    rivet(pxx + 7, pyy + 7); rivet(pxx + pw - 8, pyy + 7);
    barnacle(pxx + 4, pyy + ph - 20, 3);

    /* and the options */
    for (let i = 0; i < items.length; i++) {
      const iy = pyy + 10 + i * 21;
      const b = slot(pxx + 16, iy, pw - 28, 17, items[i].label, i === sel);
      /* mouse and touch: hovering picks, clicking commits */
      if (KD.UI.inside(b.x, b.y, b.w, b.h)) {
        if (sel !== i) { sel = i; }
        if (KD.In.mouse.click && !KD.UI.blocked()) { KD.In.consumedClick(); items[i].act(); }
      }
    }
    const hint = KD.touch ? 'TAP TO CHOOSE' : 'W / S  -  ENTER';
    const hw = KD.Text.width(hint, { tiny: true }) + 10;
    R(pxx + ((pw - hw) >> 1), pyy + ph - 13, hw, 11, 'INK.0');
    KD.Text.draw(hint, pxx + (pw >> 1), pyy + ph - 11, 'GOLD.2',
                 { tiny: true, align: 'center' });
    const fw = KD.Text.width('every pixel placed by hand', { tiny: true }) + 8;
    R(4, H - 11, fw, 9, 'INK.0');
    KD.Text.draw('every pixel placed by hand', 8, H - 9, 'STONE.2', { tiny: true });
  }
  return { enter, update, draw };
})();

/* ---------------- world generation, with a progress bar ---------------- */
KD.Scenes.gen = (function () {
  let step = null, total = 1, t = 0, seed = 0, done = false;
  function enter(args) {
    t = 0; done = false;
    seed = (args && args.seed) || ((Math.random() * 2147483647) | 0);
    total = KD.Gen.begin(KD.Zones.WORLD_W, KD.Zones.WORLD_H, seed);
    step = { done: 0, total, label: 'waking up' };
    KD.State.fresh();
    KD.Mobs.clear();
    KD.Fx.reset();
  }
  function update(dt) {
    t += dt;
    if (done) return;
    /* one generator step per frame keeps the bar moving */
    const s = KD.Gen.step();
    if (s) { step = s; return; }
    done = true;
    KD.Water.init();
    KD.Render.flush();
    const sp = KD.Gen.meta.spawn;
    KD.Player.spawn(sp.x, sp.y);
    KD.State.S.seed = seed;
    /* Act One is where the weight comes from, and it has to land HERE -
       enter() above calls State.fresh(), which resets weight to the starting
       figure, so adding it in the castle before switching scenes wrote a
       number that was thrown away one frame later. */
    if (KD.Act1 && KD.Act1.A.fat > 0) {
      KD.State.S.weight += KD.Act1.A.fat;
      KD.State.S.fat = KD.State.S.weight;
    }
    KD.State.recalc();
    KD.State.save();
    KD.Game.go('play', {});
  }
  function draw(ctx) {
    KD.Screen.clear('INK.0');
    const cx = KD.W / 2;
    KD.Text.draw('DROWNING A CITY', cx, KD.H / 2 - 26, 'GOLD.3', { align: 'center', space: 1 });
    KD.Text.draw(step.label, cx, KD.H / 2 - 10, 'BONE.1', { align: 'center' });
    const bw = Math.min(160, KD.W - 40);
    KD.UI.bar(cx - bw / 2, KD.H / 2 + 4, bw, 8, step.done / step.total, 'WATER.2');
    KD.Text.draw('seed ' + seed, cx, KD.H / 2 + 18, 'INK.3', { tiny: true, align: 'center' });
    /* something to watch: a row of dithered blocks filling up */
    for (let i = 0; i < 20; i++) {
      const on = i / 20 < step.done / step.total;
      KD.Screen.rect(cx - 50 + i * 5, KD.H / 2 + 30, 4, 4, on ? 'SAND.2' : 'INK.1');
    }
  }
  return { enter, update, draw };
})();

/* ---------------- pause ---------------- */
KD.Scenes.pause = (function () {
  function enter() { KD.UI.guard(0.2); }
  function update(dt) {
    if (KD.In.isHit('Escape')) KD.Game.go('play', {});
  }
  function draw(ctx) {
    KD.Scenes.play.draw(ctx);
    KD.Screen.rect(0, 0, KD.W, KD.H, 'INK.0');
    for (let yy = 0; yy < KD.H; yy += 4) {
      for (let xx = (yy & 4) ? 0 : 2; xx < KD.W; xx += 8) KD.Screen.rect(xx, yy, 1, 1, 'DEEP.1');
    }
    const S = KD.State.S;
    const w = Math.min(190, KD.W - 20), h = 120;
    const x = ((KD.W - w) >> 1), y = ((KD.H - h) >> 1);
    const p = KD.UI.titled(x, y, w, h, 'THE STATE OF THE KINGDOM');
    const rows = [
      ['Crown fragments', S.frags.length + ' / 5'],
      ['Level', S.level + '   (' + S.points + ' pts)'],
      ['Clams', String(S.clams)],
      ['Fat', Math.round(S.fat) + '%'],
      ['Blocks mined', String(S.mined)],
      ['Things crafted', String(S.crafted)],
      ['Enemies felled', String(S.kills)],
      ['Deaths', String(S.deaths)],
      ['Depth', ((KD.Player.P.y / 8) | 0) + 'm'],
      ['Seed', String(S.seed)]
    ];
    rows.forEach((r, i) => {
      KD.Text.draw(r[0], x + 6, p.iy + i * 9, 'BONE.0', { tiny: true });
      KD.Text.draw(r[1], x + w - 6, p.iy + i * 9, 'BONE.2', { tiny: true, align: 'right' });
    });
    if (KD.UI.button(x + 6, y + h - 15, (w - 18) / 2, 12, 'BACK', {})) KD.Game.go('play', {});
    if (KD.UI.button(x + 12 + (w - 18) / 2, y + h - 15, (w - 18) / 2, 12, 'SAVE + QUIT', {})) {
      KD.State.save(); KD.Game.go('title', {});
    }
  }
  return { enter, update, draw };
})();

/* ---------------- death ---------------- */
KD.Scenes.death = (function () {
  let t = 0, from = '';
  function enter(args) { t = 0; from = (args && args.from) || 'the deep'; KD.UI.guard(0.5); KD.Sfx.play('die'); }
  function update(dt) { t += dt; }
  function draw(ctx) {
    KD.Screen.clear('INK.0');
    KD.Dither.fill(ctx, 0, 0, KD.W, KD.H, 'BLOOD.0', Math.min(0.5, t * 0.4));
    const cx = KD.W / 2;
    KD.Text.draw('YOU DIED', cx, KD.H / 2 - 30, 'BLOOD.3', { align: 'center', space: 2 });
    KD.Text.draw('killed by ' + from, cx, KD.H / 2 - 14, 'BONE.1', { align: 'center' });
    KD.Text.draw('you wake up at home, damper and poorer', cx, KD.H / 2 - 2, 'INK.3', { tiny: true, align: 'center' });
    if (t > 0.7 && KD.UI.button(cx - 44, KD.H / 2 + 12, 88, 14, 'GET UP', { key: 'Enter' })) {
      const sp = KD.Gen.meta.spawn;
      KD.Player.spawn(sp.x, sp.y);
      KD.Player.P.hp = KD.Player.P.hpMax;
      KD.Player.P.breath = 1;
      KD.State.S.clams = Math.floor(KD.State.S.clams * 0.7);
      KD.Scenes.play.snapCam();
      KD.Game.go('play', {});
    }
  }
  return { enter, update, draw };
})();

/* ---------------- the ending ---------------- */
KD.Scenes.victory = (function () {
  let t = 0;
  function enter() { t = 0; KD.Sfx.play('victory'); }
  function update(dt) { t += dt; }
  function draw(ctx) {
    KD.Screen.clear('DEEP.1');
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + 11) % KD.W;
      const y = ((t * 30 + i * 53) % (KD.H + 20)) - 10;
      KD.Screen.rect(x, Math.round(y), 2, 2, i % 3 ? 'GOLD.2' : 'GOLD.3');
    }
    const cx = KD.W / 2;
    const vtop = Math.round(KD.H * 0.10);
    KD.Text.draw('KING AGAIN', cx, vtop, 'GOLD.3', { align: 'center', space: 2, shadow: 'INK.0' });
    const lines = [
      'The crown is back on your head.',
      'It does not fit like it used to.',
      'Neither does the tunic.',
      '',
      'The Princess is still a beer keg.',
      'You are still in love with her.',
      'Some things a crown cannot fix.'
    ];
    lines.forEach((l, i) => KD.Text.draw(l, cx, vtop + 24 + i * 12, i > 3 ? 'GOLD.2' : 'BONE.1', { align: 'center' }));
    if (KD.PX.has('it_crown')) KD.PX.blit(ctx, 'it_crown', cx - 7, KD.H - 46, { anchor: false });
    if (t > 1 && KD.UI.button(cx - 40, KD.H - 26, 80, 13, 'THE END', { key: 'Enter' })) KD.Game.go('title', {});
  }
  return { enter, update, draw };
})();
