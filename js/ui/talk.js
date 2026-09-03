/* ============================================================
   ui/talk.js - how anybody says anything.

   Two shapes for the same job:

   BUBBLE   for a line spoken out in the world. The balloon is
            built out of bubbles - a rim of stepped discs round a
            dark interior - and a trail of small ones rises from
            the speaker's mouth to reach it, drifting and
            wobbling on the way up, because that is what a
            sentence looks like underwater.

   PANEL    for a real conversation. A 36x40 portrait on the
            left, the name over it, the line beside it, and a
            prompt to go on. The portrait is the thing you look
            at, so it gets the frame and the light.
   ============================================================ */
KD.Talk = (function () {
  /* ---- one bubble: a stepped disc, lit upper-left ------------------ */
  /* r is the radius in pixels. No arcs: each row's width comes out of a
     hand-written table, which is also what stops them all being identical. */
  const SPANS = {
    2: [2, 2],
    3: [2, 3, 3],
    4: [2, 4, 4, 3],
    5: [3, 5, 5, 4, 3],
    6: [4, 6, 6, 6, 5, 3],
    7: [4, 6, 7, 7, 7, 6, 4]
  };
  function disc(x, y, r, col, rim) {
    const sp = SPANS[Math.max(2, Math.min(7, r))] || SPANS[4];
    const n = sp.length;
    for (let i = 0; i < n * 2; i++) {
      const w = sp[i < n ? i : n * 2 - 1 - i];
      KD.Screen.rect(x - w, y - n + i, w * 2, 1, col);
    }
    if (rim) {
      KD.Screen.rect(x - sp[0], y - n, sp[0] * 2, 1, rim);
      KD.Screen.rect(x - sp[1] + 1, y - n + 1, 2, 1, rim);
    }
  }

  /* ---- the balloon ------------------------------------------------- */
  /* Drawn at (cx, by): centred horizontally, bottom edge at by. */
  function bubble(text, cx, by, o) {
    o = o || {};
    const maxW = Math.min(o.max || 168, KD.W - 24);
    const lines = KD.Text.wrap(text, maxW - 14, { tiny: true });
    const n = Math.min(o.maxLines || 3, lines.length);
    const lh = KD.Text.H(true) + 3;
    let w = 0;
    for (let i = 0; i < n; i++) w = Math.max(w, KD.Text.width(lines[i], { tiny: true }));
    w = Math.min(maxW, w + 14);
    const h = n * lh + 9;
    let x = Math.round(cx - w / 2);
    x = Math.max(4, Math.min(KD.W - w - 4, x));
    const y = Math.round(by - h);
    /* the body */
    KD.Screen.rect(x, y, w, h, 'INK.0');
    KD.Screen.rect(x + 1, y + 1, w - 2, h - 2, 'DEEP.0');
    /* a rim of bubbles all the way round, so it reads as foam and not a box */
    for (let i = 0; i < w; i += 8) {
      disc(x + i + 3, y + 2, i % 16 ? 4 : 5, 'WATER.1', 'WATER.3');
      disc(x + i + 7, y + h, i % 16 ? 5 : 4, 'WATER.0', 'WATER.2');
    }
    for (let j = 0; j < h; j += 8) {
      disc(x + 2, y + j + 5, j % 16 ? 4 : 5, 'WATER.1', 'WATER.3');
      disc(x + w - 2, y + j + 3, j % 16 ? 5 : 4, 'WATER.0', 'WATER.2');
    }
    /* the text sits inside the foam */
    for (let i = 0; i < n; i++) {
      let l = lines[i];
      if (n < lines.length && i === n - 1) l = KD.Text.fit(l + '...', w - 14, { tiny: true });
      KD.Text.draw(l, x + w / 2, y + 5 + i * lh, 'BONE.2',
        { tiny: true, align: 'center', shadow: 'INK.0' });
    }
    return { x, y, w, h };
  }

  /* ---- the trail: small bubbles climbing from a mouth to a balloon -- */
  /* Deterministic in t so it animates without needing any state kept. */
  function trail(mx, my, tx, ty, t) {
    const dx = tx - mx, dy = ty - my;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const f = ((t * 0.55 + i / n) % 1);
      const x = Math.round(mx + dx * f + Math.sin(f * 7 + i) * 3);
      const y = Math.round(my + dy * f);
      const r = 2 + ((i + ((t * 2) | 0)) % 2);
      disc(x, y, r, f < 0.6 ? 'WATER.1' : 'WATER.0', 'WATER.3');
    }
  }

  /* ---- a world line: balloon over a speaker, with the trail --------- */
  /* The balloon is anchored to a mouth in the world and drawn at 1:1 -
     see KD.Screen.defer. Inside the ocean's 2x lens the words would come
     out eight pixels tall and the balloon would not fit the frame. */
  function say(text, wx, wy, cam, t, o) {
    KD.Screen.defer((z) => {
      const sx = Math.round((wx - cam.x) * z), sy = Math.round((wy - cam.y) * z);
      const by = Math.max(34, sy - 22);
      const b = bubble(text, sx, by, o);
      trail(sx, sy - 2, b.x + b.w / 2, b.y + b.h + 2, t);
    });
  }

  /* ---- the conversation panel -------------------------------------- */
  /* who: { portrait, name }. Returns the box, so a caller can put its own
     prompt or choices inside it. */
  function panel(who, text, o) {
    o = o || {};
    const pw = 36, ph = 40;
    const h = Math.max(ph + 14, 56);
    const w = Math.min(KD.W - 16, 340);
    const x = Math.round((KD.W - w) / 2);
    const y = KD.H - h - (o.bottom === undefined ? 10 : o.bottom);
    /* the box: dark, with a gold rule under the name */
    KD.Screen.rect(x - 1, y - 1, w + 2, h + 2, 'INK.0');
    KD.Screen.rect(x, y, w, h, 'DEEP.0');
    KD.Screen.rect(x + 1, y + 1, w - 2, 1, 'DEEP.2');
    KD.Screen.frame(x, y, w, h, 'INK.1');
    /* the portrait, framed, on the left */
    const px = x + 5, py = y + (h - ph) / 2;
    KD.Screen.rect(px - 2, py - 2, pw + 4, ph + 4, 'INK.0');
    KD.Screen.rect(px - 1, py - 1, pw + 2, ph + 2, 'GOLD.0');
    KD.Screen.rect(px, py, pw, ph, 'DEEP.1');
    if (who && who.portrait && KD.PX.has(who.portrait)) {
      KD.PX.blit(KD.Screen.ctx(), who.portrait, px, Math.round(py), { anchor: false });
    }
    /* name and line */
    const tx = px + pw + 8;
    const tw = x + w - tx - 6;
    if (who && who.name) {
      KD.Text.draw(who.name.toUpperCase(), tx, y + 5, 'GOLD.3', { shadow: 'INK.0' });
      KD.Screen.rect(tx, y + 14, Math.min(tw, KD.Text.width(who.name.toUpperCase()) + 6), 1, 'GOLD.0');
    }
    KD.Text.block(text, tx, y + 19, 'BONE.2', { tiny: true, max: tw, maxLines: 3 });
    return { x, y, w, h, tx, tw };
  }
  return { bubble, trail, say, panel, disc };
})();
