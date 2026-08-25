/* ============================================================
   px.js - the pixel engine. Sprites are hand-authored character
   matrices, one char per pixel. They compile once into a packed
   atlas canvas and blit from there.

   There is not one arc(), curve or gradient in this game and
   tools/check.js fails the build if anyone adds one.
   ============================================================ */
KD.PX = (function () {
  const PAL = KD.PAL;
  const SPR = {};            // name -> sprite record
  const ORDER = [];          // definition order, for atlas packing
  let atlas = null, actx = null, built = false;

  /* ---- defining sprites ----------------------------------- */
  /* PX.def('name', { pal:{ '1':'INK.0', ... }, px:[ '..11..', ... ] })
     '.' and ' ' are transparent. Every other char must be in pal.
     Width comes from the longest row; short rows pad transparent. */
  function def(name, o) {
    if (SPR[name]) throw new Error('duplicate sprite: ' + name);
    const rows = o.px;
    if (!rows || !rows.length) throw new Error('sprite ' + name + ' has no pixels');
    const h = rows.length;
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    /* resolve the sub-palette to master indices once */
    const map = {};
    for (const ch in o.pal) {
      const v = o.pal[ch];
      map[ch] = v === null || v === undefined ? -1 : PAL.idx(v);
    }
    const data = new Int16Array(w * h).fill(-1);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        if (!(ch in map)) {
          throw new Error('sprite ' + name + ' row ' + y + ' uses "' + ch + '" with no palette entry');
        }
        data[y * w + x] = map[ch];
      }
    }
    const s = { name, w, h, data, ax: o.ax || 0, ay: o.ay || 0, u: 0, v: 0 };
    SPR[name] = s; ORDER.push(s);
    built = false;
    return s;
  }

  /* a recolour of an existing sprite: same pixels, swapped indices */
  function variant(name, from, swap) {
    const src = SPR[from];
    if (!src) throw new Error('variant ' + name + ' of unknown sprite ' + from);
    if (SPR[name]) throw new Error('duplicate sprite: ' + name);
    const remap = {};
    for (const k in swap) remap[PAL.idx(k)] = PAL.idx(swap[k]);
    const data = new Int16Array(src.data.length);
    for (let i = 0; i < data.length; i++) {
      const v = src.data[i];
      data[i] = v < 0 ? -1 : (v in remap ? remap[v] : v);
    }
    const s = { name, w: src.w, h: src.h, data, ax: src.ax, ay: src.ay, u: 0, v: 0 };
    SPR[name] = s; ORDER.push(s);
    built = false;
    return s;
  }

  /* an animation is just a name list; frame() picks one by time */
  const ANIM = {};
  const AUTO = {};
  function anim(name, frames, fps) {
    ANIM[name] = { frames, fps: fps || 8 };
  }
  /* An art file that names its frames foo0, foo1, foo2 but forgets to call
     anim('foo', ...) should still animate. Discover numbered frames on first
     ask and cache the result, so a missing anim() is a non-event rather than
     a creature that never draws. */
  function autoFrames(name) {
    if (AUTO[name] !== undefined) return AUTO[name];
    const out = [];
    for (let i = 0; i < 32; i++) {
      if (!SPR[name + i]) break;
      out.push(name + i);
    }
    AUTO[name] = out.length ? out : null;
    return AUTO[name];
  }
  function frameOf(name, t) {
    const a = ANIM[name];
    if (a) return a.frames[Math.floor(t * a.fps) % a.frames.length];
    if (SPR[name]) return name;
    const f = autoFrames(name);
    if (f) return f[Math.floor(t * 8) % f.length];
    return name;
  }

  /* ---- the atlas ------------------------------------------ */
  /* shelf-packs every sprite into one canvas and writes the
     pixels straight into an ImageData. Runs once at boot. */
  function build() {
    const pad = 1;
    let x = 0, y = 0, rowH = 0, W = 512;
    for (const s of ORDER) {
      if (x + s.w + pad > W) { x = 0; y += rowH + pad; rowH = 0; }
      s.u = x; s.v = y;
      x += s.w + pad;
      rowH = Math.max(rowH, s.h);
    }
    const H = y + rowH + pad;
    atlas = document.createElement('canvas');
    atlas.width = W; atlas.height = Math.max(1, H);
    actx = atlas.getContext('2d');
    actx.imageSmoothingEnabled = false;
    const img = actx.createImageData(W, Math.max(1, H));
    const d = img.data, RGB = PAL.RGB;
    for (const s of ORDER) {
      for (let sy = 0; sy < s.h; sy++) {
        for (let sx = 0; sx < s.w; sx++) {
          const v = s.data[sy * s.w + sx];
          if (v < 0) continue;
          const o = ((s.v + sy) * W + (s.u + sx)) * 4, c = RGB[v];
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
      }
    }
    actx.putImageData(img, 0, 0);
    /* pre-flipped copy, so flipX costs nothing at draw time */
    flipAtlas = document.createElement('canvas');
    flipAtlas.width = W; flipAtlas.height = atlas.height;
    const fctx = flipAtlas.getContext('2d');
    fctx.imageSmoothingEnabled = false;
    for (const s of ORDER) {
      fctx.save();
      fctx.translate(s.u + s.w, s.v);
      fctx.scale(-1, 1);
      fctx.drawImage(atlas, s.u, s.v, s.w, s.h, 0, 0, s.w, s.h);
      fctx.restore();
    }
    /* Darkness is BANDED, not dithered. Dithering near-black over a mid tone
       at 50% is just noise; a pixel artist draws the shadow with a darker
       colour instead. So we bake one atlas per brightness band and pick the
       band at blit time - clean, cheap, and it reads as hand-drawn shading. */
    shades = [atlas];
    shadeFlip = [flipAtlas];
    for (let k = 1; k < SHADES; k++) {
      const f = MIX[k];
      const c = document.createElement('canvas');
      c.width = W; c.height = atlas.height;
      const cx2 = c.getContext('2d');
      cx2.imageSmoothingEnabled = false;
      const im = cx2.createImageData(W, atlas.height);
      const dd = im.data;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        dd[i]     = Math.round(d[i]     * (1 - f) + DARK[0] * f);
        dd[i + 1] = Math.round(d[i + 1] * (1 - f) + DARK[1] * f);
        dd[i + 2] = Math.round(d[i + 2] * (1 - f) + DARK[2] * f);
        dd[i + 3] = 255;
      }
      cx2.putImageData(im, 0, 0);
      shades.push(c);
      const fc = document.createElement('canvas');
      fc.width = W; fc.height = atlas.height;
      const fx2 = fc.getContext('2d');
      fx2.imageSmoothingEnabled = false;
      for (const s of ORDER) {
        fx2.save();
        fx2.translate(s.u + s.w, s.v);
        fx2.scale(-1, 1);
        fx2.drawImage(c, s.u, s.v, s.w, s.h, 0, 0, s.w, s.h);
        fx2.restore();
      }
      shadeFlip.push(fc);
    }
    built = true;
    return { w: W, h: atlas.height, sprites: ORDER.length, shades: SHADES };
  }
  let flipAtlas = null;
  /* six brightness bands; band 0 is full light, band 5 is all but black */
  const SHADES = 6;
  const MIX = [0, 0.22, 0.42, 0.60, 0.78, 0.93];
  const DARK = [7, 11, 22];           // INK.0, the colour everything fades toward
  let shades = null, shadeFlip = null;
  /* light level 0..max -> band index */
  const bandFor = (light, max) => {
    const f = Math.max(0, Math.min(1, light / (max || 15)));
    return Math.min(SHADES - 1, Math.round((1 - f) * (SHADES - 1)));
  };

  /* ---- drawing -------------------------------------------- */
  /* blit(ctx, name, x, y, o)
     o.flipX, o.anchor (use the sprite's ax/ay), o.clip {w,h} */
  function blit(ctx, name, x, y, o) {
    if (!built) build();
    const s = SPR[typeof name === 'string' ? name : name.name];
    if (!s) throw new Error('blit of unknown sprite: ' + name);
    o = o || {};
    let dx = Math.round(x) - (o.anchor === false ? 0 : s.ax);
    const dy = Math.round(y) - (o.anchor === false ? 0 : s.ay);
    const w = o.w || s.w, h = o.h || s.h;
    const band = o.shade ? Math.min(SHADES - 1, o.shade | 0) : 0;
    if (o.flipX) {
      ctx.drawImage(shadeFlip[band], s.u + (s.w - w), s.v, w, h, dx, dy, w, h);
    } else {
      ctx.drawImage(shades[band], s.u, s.v, w, h, dx, dy, w, h);
    }
  }

  /* nine-slice from a 3x3 kit of same-sized corner/edge/centre tiles.
     names: [tl,t,tr, l,c,r, bl,b,br] */
  function nine(ctx, names, x, y, w, h) {
    if (!built) build();
    const t = SPR[names[0]];
    const u = t.w, v = t.h;
    const cols = Math.max(1, Math.ceil((w - u * 2) / u));
    const rows = Math.max(1, Math.ceil((h - v * 2) / v));
    const iw = w - u * 2, ih = h - v * 2;
    blit(ctx, names[0], x, y, { anchor: false });
    blit(ctx, names[2], x + w - u, y, { anchor: false });
    blit(ctx, names[6], x, y + h - v, { anchor: false });
    blit(ctx, names[8], x + w - u, y + h - v, { anchor: false });
    for (let i = 0; i < cols; i++) {
      const cw = Math.min(u, iw - i * u);
      if (cw <= 0) break;
      blit(ctx, names[1], x + u + i * u, y, { anchor: false, w: cw });
      blit(ctx, names[7], x + u + i * u, y + h - v, { anchor: false, w: cw });
    }
    for (let j = 0; j < rows; j++) {
      const rh = Math.min(v, ih - j * v);
      if (rh <= 0) break;
      blit(ctx, names[3], x, y + v + j * v, { anchor: false, h: rh });
      blit(ctx, names[5], x + w - u, y + v + j * v, { anchor: false, h: rh });
      for (let i = 0; i < cols; i++) {
        const cw = Math.min(u, iw - i * u);
        if (cw <= 0) break;
        blit(ctx, names[4], x + u + i * u, y + v + j * v, { anchor: false, w: cw, h: rh });
      }
    }
  }

  const has = (name) => !!SPR[name];
  const get = (name) => SPR[name];
  const names = () => Object.keys(SPR);
  const sheet = () => atlas;

  /* does this name resolve to something drawable, directly or as an anim? */
  const hasAny = (name) => !!(SPR[name] || ANIM[name] || autoFrames(name));
  return { def, variant, anim, frameOf, autoFrames, hasAny, build, blit, nine, has, get, names, sheet, SPR,
           SHADES, bandFor, MIX };
})();
