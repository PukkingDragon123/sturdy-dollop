/* ============================================================
   world/render.js - draws the tile world. Tiles are cached into
   16x16-tile chunk canvases with their autotile edges and their
   baked darkness; only dirty chunks are redrawn. The player's
   own torch is a separate pass on top, because it moves.
   ============================================================ */
KD.Render = (function () {
  const TS = 8, CH = 16, CPX = CH * TS;
  const cache = new Map();            // key -> canvas
  let scratch = null, sctx = null;

  /* mask -> autotile part. 1 up, 2 right, 4 down, 8 left; a set bit means
     "that neighbour is the same material", so a clear bit is an exposed face. */
  const PART = [];
  PART[15] = 'mid';  PART[14] = 'top';  PART[13] = 'right'; PART[12] = 'tr';
  PART[11] = 'bot';  PART[10] = 'h';    PART[9]  = 'br';    PART[7]  = 'left';
  PART[6]  = 'tl';   PART[5]  = 'v';    PART[3]  = 'bl';    PART[0]  = 'single';
  PART[1] = 'cap';   PART[2] = 'cap';   PART[4]  = 'cap';   PART[8]  = 'cap';

  /* pick an interior variant from the tile position, so big fills break up
     but never flicker (the same tile always picks the same variant) */
  function midName(art, x, y) {
    const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    const v = h % 10;
    if (v < 6) return art + '_mid';
    return art + (v < 8 ? '_mid2' : '_mid3');
  }
  function nameFor(t, x, y) {
    const T = KD.Tiles.get(t);
    if (!T || !T.art) return null;
    const m = KD.World.mask(x, y);
    const part = PART[m] || 'mid';
    const n = part === 'mid' ? midName(T.art, x, y) : T.art + '_' + part;
    return KD.PX.has(n) ? n : (KD.PX.has(T.art + '_mid') ? T.art + '_mid' : null);
  }

  function ensureScratch() {
    if (scratch) return;
    scratch = document.createElement('canvas');
    scratch.width = CPX; scratch.height = CPX;
    sctx = scratch.getContext('2d');
    sctx.imageSmoothingEnabled = false;
  }

  /* Water is drawn in its own colour per brightness band, same idea as the
     shaded sprite atlases: banded colour, never a black checkerboard. */
  const WATER_BANDS = ['WATER.3', 'WATER.2', 'WATER.0', 'DEEP.1', 'DEEP.0', 'INK.0'];
  const DEEP_BANDS  = ['DEEP.2', 'DEEP.1', 'DEEP.0', 'INK.1', 'INK.0', 'INK.0'];
  const band = (level) => KD.PX.bandFor(level, KD.Light.MAX);
  /* the last unlit band is solid: a cave with no torch is genuinely black */
  function blackout(ctx, px, py, b) {
    if (b < KD.PX.SHADES - 1) return;
    ctx.fillStyle = KD.PAL.hex('INK.0');
    ctx.fillRect(px, py, TS, TS);
  }

  function buildChunk(cx, cy) {
    ensureScratch();
    const Wd = KD.World, T = KD.Tiles;
    const c = document.createElement('canvas');
    c.width = CPX; c.height = CPX;
    const x2 = c.getContext('2d');
    x2.imageSmoothingEnabled = false;
    x2.clearRect(0, 0, CPX, CPX);
    const tx0 = cx * CH, ty0 = cy * CH;
    for (let j = 0; j < CH; j++) {
      for (let i = 0; i < CH; i++) {
        const tx = tx0 + i, ty = ty0 + j;
        if (!Wd.inside(tx, ty)) continue;
        const px = i * TS, py = j * TS;
        const t = Wd.at(tx, ty), TT = T.get(t);
        const b = band(Wd.lightAt(tx, ty));
        /* background wall first, one band darker, so caves read as carved */
        const bw = Wd.wall(tx, ty);
        if (bw) {
          const bn = nameFor(bw, tx, ty) || (T.get(bw).deco);
          if (bn && KD.PX.has(bn)) {
            KD.PX.blit(x2, bn, px, py, { anchor: false, shade: Math.min(KD.PX.SHADES - 1, b + 1) });
          }
        }
        /* the water body, coloured by depth and brightness */
        const wv = Wd.water(tx, ty);
        if (wv > 0 && (!TT || !TT.solid)) {
          const h = Math.round(TS * (wv / 8));
          const ramp = ty < 150 ? WATER_BANDS : DEEP_BANDS;
          x2.fillStyle = KD.PAL.hex(ramp[b]);
          x2.fillRect(px, py + (TS - h), TS, h);
          /* a brighter skin on the surface of a partial tile */
          if (wv < 8 && b < 4) { x2.fillStyle = KD.PAL.hex(ramp[Math.max(0, b - 1)]); x2.fillRect(px, py + (TS - h), TS, 1); }
        }
        if (TT && TT.art && TT.solid) {
          const n = nameFor(t, tx, ty);
          if (n) KD.PX.blit(x2, n, px, py, { anchor: false, shade: b });
          else { x2.fillStyle = KD.PAL.hex('STONE.1'); x2.fillRect(px, py, TS, TS); }
          if (TT.ore && KD.PX.has(TT.ore)) {
            const v = (((tx * 31) ^ (ty * 17)) & 1) && KD.PX.has(TT.ore + '2') ? TT.ore + '2' : TT.ore;
            /* ore keeps a little of its glitter even in the dark */
            KD.PX.blit(x2, v, px, py, { anchor: false, shade: Math.max(0, b - 1) });
          }
          blackout(x2, px, py, b);
        } else if (TT && TT.plat) {
          const n = KD.PX.has(TT.art + '_h') ? TT.art + '_h' : null;
          if (n) KD.PX.blit(x2, n, px, py + TS - 3, { anchor: false, h: 3, shade: b });
        } else if (TT && TT.deco && !TT.big) {
          if (KD.PX.has(TT.deco)) {
            const s = KD.PX.get(TT.deco);
            const lit = TT.light ? 0 : b;      // a torch lights itself
            KD.PX.blit(x2, TT.deco, px, py + TS - s.h, { anchor: false, shade: lit });
          }
        } else if (!wv) {
          /* A dug-out dry pocket must not show the water backdrop through it -
             an air pocket you can breathe in should look like a room. */
          if (ty >= (KD.Gen.meta.sea || 34)) {
            const AIR_BANDS = ['INK.3', 'INK.2', 'INK.1', 'INK.1', 'INK.0', 'INK.0'];
            x2.fillStyle = KD.PAL.hex(AIR_BANDS[b]);
            x2.fillRect(px, py, TS, TS);
          }
          blackout(x2, px, py, b);
        }
        /* mining damage cracks, drawn as stepped pixels */
        const d = Wd.damageOf(tx, ty);
        if (d > 0 && TT && TT.hp) {
          const f = d / TT.hp;
          x2.fillStyle = KD.PAL.hex('INK.0');
          const n = Math.min(6, 1 + Math.floor(f * 6));
          for (let k = 0; k < n; k++) {
            const hx = ((tx * 7 + k * 3) % 6) + 1, hy = ((ty * 5 + k * 2) % 6) + 1;
            x2.fillRect(px + hx, py + hy, 1, 1);
            if (k & 1) x2.fillRect(px + hx + 1, py + hy - 1, 1, 1);
          }
        }
      }
    }
    return c;
  }

  /* big multi-tile furniture is drawn per frame from its anchor tile, not
     baked, so it can animate (a lit furnace, an open chest) */
  function drawBig(ctx, cam) {
    const Wd = KD.World, T = KD.Tiles;
    const x0 = Math.max(0, (cam.x / TS | 0) - 2), x1 = Math.min(Wd.W - 1, ((cam.x + KD.W) / TS | 0) + 2);
    const y0 = Math.max(0, (cam.y / TS | 0) - 2), y1 = Math.min(Wd.H - 1, ((cam.y + KD.H) / TS | 0) + 4);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const TT = T.get(Wd.at(tx, ty));
        if (!TT || !TT.big || !TT.deco || !KD.PX.has(TT.deco)) continue;
        const s = KD.PX.get(TT.deco);
        const px = tx * TS - cam.x, py = (ty + TT.big[1]) * TS - cam.y - s.h;
        KD.PX.blit(ctx, TT.deco, px, py, { anchor: false, shade: TT.light ? 0 : band(Wd.lightAt(tx, ty)) });
      }
    }
  }

  function draw(ctx, cam) {
    const Wd = KD.World;
    for (const key of Wd.dirty) cache.delete(key);
    Wd.dirty.clear();
    const c0 = Math.max(0, (cam.x / CPX) | 0), c1 = ((cam.x + KD.W) / CPX) | 0;
    const r0 = Math.max(0, (cam.y / CPX) | 0), r1 = ((cam.y + KD.H) / CPX) | 0;
    const maxC = Math.ceil(Wd.W / CH) - 1, maxR = Math.ceil(Wd.H / CH) - 1;
    for (let r = r0; r <= Math.min(r1, maxR); r++) {
      for (let c = c0; c <= Math.min(c1, maxC); c++) {
        const key = r * 4096 + c;
        let img = cache.get(key);
        if (!img) { img = buildChunk(c, r); cache.set(key, img); }
        ctx.drawImage(img, c * CPX - cam.x, r * CPX - cam.y);
      }
    }
    /* keep the cache from growing without bound on a long session */
    if (cache.size > 700) {
      let n = 0;
      for (const k of cache.keys()) { if (n++ > 300) break; cache.delete(k); }
    }
    drawBig(ctx, cam);
  }

  /* the player's torch: a moving light, dithered outward in rings.
     Applied as a *brightening* by punching holes in the darkness we baked. */
  function torch(ctx, cam, wx, wy, radius) {
    if (radius <= 0) return;
    const Wd = KD.World;
    const tx0 = Math.max(0, ((wx - radius) / TS) | 0), tx1 = Math.min(Wd.W - 1, ((wx + radius) / TS) | 0);
    const ty0 = Math.max(0, ((wy - radius) / TS) | 0), ty1 = Math.min(Wd.H - 1, ((wy + radius) / TS) | 0);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const d = Math.hypot(tx * TS + 4 - wx, ty * TS + 4 - wy);
        if (d > radius) continue;
        const want = (1 - d / radius);
        const have = Wd.lightAt(tx, ty) / KD.Light.MAX;
        if (want <= have) continue;
        const px = tx * TS - cam.x, py = ty * TS - cam.y;
        if (px < -TS || py < -TS || px > KD.W || py > KD.H) continue;
        /* redraw the tile un-darkened, then re-darken to the brighter level */
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, TS, TS);
        ctx.clip();
        const t = Wd.at(tx, ty), TT = KD.Tiles.get(t);
        const b = Math.min(KD.PX.SHADES - 1, Math.round((1 - want) * (KD.PX.SHADES - 1)));
        const n = TT && TT.art && TT.solid ? nameFor(t, tx, ty) : null;
        if (n) KD.PX.blit(ctx, n, px, py, { anchor: false, shade: b });
        else if (Wd.water(tx, ty) > 0) {
          const ramp = ty < 150 ? WATER_BANDS : DEEP_BANDS;
          ctx.fillStyle = KD.PAL.hex(ramp[b]); ctx.fillRect(px, py, TS, TS);
        } else { ctx.fillStyle = KD.PAL.hex(b > 3 ? 'INK.0' : 'INK.1'); ctx.fillRect(px, py, TS, TS); }
        if (TT && TT.ore && KD.PX.has(TT.ore)) KD.PX.blit(ctx, TT.ore, px, py, { anchor: false, shade: Math.max(0, b - 1) });
        if (TT && TT.deco && !TT.big && KD.PX.has(TT.deco)) {
          const ds = KD.PX.get(TT.deco);
          KD.PX.blit(ctx, TT.deco, px, py + TS - ds.h, { anchor: false, shade: TT.light ? 0 : b });
        }
        ctx.restore();
      }
    }
  }
  const flush = () => cache.clear();
  return { draw, torch, flush, nameFor, PART, TS, band };
})();
