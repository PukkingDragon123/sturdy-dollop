/* ============================================================
   dither.js - the only way this game makes a gradient. A 4x4
   Bayer matrix plus a set of hand-picked stipple masks. Used
   for lighting steps, translucency and any two-tone blend.
   ============================================================ */
KD.Dither = (function () {
  /* classic 4x4 ordered dither, values 0..15 */
  const BAYER = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
  ];
  /* hand-drawn masks, 4x4, as bit rows. index = coverage 0..8 */
  const MASKS = [
    ['0000', '0000', '0000', '0000'],   // 0/8  nothing
    ['1000', '0000', '0010', '0000'],   // 1/8
    ['1000', '0010', '0010', '1000'],   // 2/8
    ['1010', '0000', '1010', '0100'],   // 3/8
    ['1010', '0101', '1010', '0101'],   // 4/8  checker
    ['1110', '0101', '1011', '0101'],   // 5/8
    ['1110', '1011', '1110', '1011'],   // 6/8
    ['1111', '1011', '1111', '1110'],   // 7/8
    ['1111', '1111', '1111', '1111']    // 8/8  solid
  ].map((rows) => {
    const m = new Uint8Array(16);
    rows.forEach((r, y) => { for (let x = 0; x < 4; x++) m[y * 4 + x] = r[x] === '1' ? 1 : 0; });
    return m;
  });

  /* should the pixel at world (x,y) be drawn, at this coverage? */
  const on = (x, y, coverage) =>
    MASKS[Math.max(0, Math.min(8, coverage))][((y & 3) * 4) + (x & 3)] === 1;
  const bayer = (x, y) => BAYER[((y & 3) * 4) + (x & 3)];

  /* fill a rect with `col` at fractional coverage, aligned to the world
     grid so adjacent calls agree and the pattern never seams */
  function fill(ctx, x, y, w, h, col, frac) {
    const cov = Math.round(Math.max(0, Math.min(1, frac)) * 8);
    if (cov <= 0) return;
    if (cov >= 8) { KD.Screen.rect(x, y, w, h, col); return; }
    ctx.fillStyle = KD.PAL.hex(col);
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const m = MASKS[cov];
    for (let py = 0; py < h; py++) {
      const my = ((y + py) & 3) * 4;
      let run = -1;
      for (let px = 0; px <= w; px++) {
        const solid = px < w && m[my + ((x + px) & 3)] === 1;
        if (solid && run < 0) run = px;
        else if (!solid && run >= 0) { ctx.fillRect(x + run, y + py, px - run, 1); run = -1; }
      }
    }
  }
  /* ---- big washes -------------------------------------------------- *
   * fill() emits one fillRect per run of pattern pixels, which is fine for
   * a lighting step over a tile but ruinous over the whole screen: a 4/8
   * checker across 486px is 240 rects a row. The pattern is 4x4 periodic,
   * so bake one 64x64 tile per (colour, coverage) once and blit it. That
   * turns a full-screen wash from ~70k rects into ~40 drawImage calls.
   * ------------------------------------------------------------------ */
  const TILE = 64;
  const tiles = {};
  function tileFor(col, cov) {
    const key = col + '|' + cov;
    let c = tiles[key];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = TILE; c.height = TILE;
    const g = c.getContext('2d');
    g.fillStyle = KD.PAL.hex(col);
    const m = MASKS[cov];
    /* the tile starts at world phase 0, so every placement must land on a
       multiple of 4 for the pattern to stay continuous */
    for (let py = 0; py < TILE; py++) {
      const my = (py & 3) * 4;
      let run = -1;
      for (let px = 0; px <= TILE; px++) {
        const solid = px < TILE && m[my + (px & 3)] === 1;
        if (solid && run < 0) run = px;
        else if (!solid && run >= 0) { g.fillRect(run, py, px - run, 1); run = -1; }
      }
    }
    tiles[key] = c;
    return c;
  }
  /* same look as fill(), for areas big enough that the rect count matters */
  function wash(ctx, x, y, w, h, col, frac) {
    const cov = Math.round(Math.max(0, Math.min(1, frac)) * 8);
    if (cov <= 0) return;
    if (cov >= 8) { KD.Screen.rect(x, y, w, h, col); return; }
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (w <= 0 || h <= 0) return;
    if (w * h < 3200) { fill(ctx, x, y, w, h, col, frac); return; }
    const t = tileFor(col, cov);
    /* step back to the nearest phase boundary so the pattern never shifts */
    const x0 = x - (((x % 4) + 4) % 4), y0 = y - (((y % 4) + 4) % 4);
    for (let ty = y0; ty < y + h; ty += TILE) {
      const sy = Math.max(0, y - ty), dh = Math.min(TILE - sy, y + h - ty - sy);
      if (dh <= 0) continue;
      for (let tx = x0; tx < x + w; tx += TILE) {
        const sx = Math.max(0, x - tx), dw = Math.min(TILE - sx, x + w - tx - sx);
        if (dw <= 0) continue;
        ctx.drawImage(t, sx, sy, dw, dh, tx + sx, ty + sy, dw, dh);
      }
    }
  }
  return { on, bayer, fill, wash, MASKS, STEPS: 8 };
})();
