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
  return { on, bayer, fill, MASKS, STEPS: 8 };
})();
