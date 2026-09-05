/* ============================================================
   ui/convo.js - conversations.

   The old dialogue was one line in a box and a keypress to
   dismiss it. This plays a SCRIPT: lines with a typewriter that
   pauses on punctuation, a portrait that moves while its owner
   is talking, and choices the player actually makes, which set
   flags the rest of the act reads.

   A script is a flat list of nodes, because a tree drawn as a
   tree is unreadable in source. Jumps are by label:

     { who:'queen', text:'...' }        one line
     { label:'x' }                      a jump target
     { goto:'x' }                       jump
     { choose:[ {label,goto,set,tint} ] }  the player picks
     { do:fn }                          a side effect
     { end:true }                       stop early

   Anything a choice puts in `set` lands on the bag the caller
   handed in, so the scene owns the consequences and this file
   owns the presentation.
   ============================================================ */
KD.Convo = (function () {
  const R = KD.Screen.rect;

  /* who is who: name, portrait, and the colour their name plate takes */
  const CAST = {
    king:  { name: 'You',              portrait: 'po_king',  tint: 'WATER.3' },
    queen: { name: 'Coralene',         portrait: 'po_queen', tint: 'CORAL.3' },
    deep:  { name: 'The Deep',         portrait: 'po_deep',  tint: 'ROT.3' },
    keg:   { name: 'The Keg',          portrait: 'po_keg',   tint: 'GOLD.3' },
    santa: { name: 'Santa the Manta',  portrait: 'po_santa', tint: 'KELP.3' },
    folk:  { name: 'A Neighbour',      portrait: 'po_crab',  tint: 'BONE.2' }
  };

  let script = null, i = 0, ch = 0, done = null, bag = null;
  let sel = 0, hold = 0, t = 0, shown = '';
  /* punctuation gets an extra beat, which is most of what makes a
     typewriter read like speech rather than like a printer */
  let popT = 0, popWho = '';          // the portrait bounces on a new speaker
  const SPEED = 46, PAUSE = { '.': 0.16, ',': 0.09, '!': 0.18, '?': 0.18, '-': 0.07 };
  let pause = 0;

  function start(s, o) {
    o = o || {};
    script = s; i = 0; ch = 0; sel = 0; hold = 0.12; pause = 0; shown = '';
    done = o.after || null;
    bag = o.bag || {};
    step();
  }
  const active = () => !!script;

  /* skip forward over nodes that are not lines or choices */
  function step() {
    let guard = 0;
    while (script && i < script.length && guard++ < 400) {
      const n = script[i];
      if (n.end) { finish(); return; }
      if (n.label !== undefined && n.text === undefined) { i++; continue; }
      if (n.goto !== undefined) { jump(n.goto); continue; }
      if (n.do) { n.do(bag); i++; continue; }
      if (n.set) { Object.assign(bag, n.set); i++; continue; }
      return;                                    /* a line or a choice */
    }
    finish();
  }
  function jump(lab) {
    for (let k = 0; k < script.length; k++) {
      if (script[k].label === lab) { i = k + 1; return; }
    }
    i = script.length;
  }
  function finish() {
    const cb = done, b = bag;
    script = null; done = null;
    if (cb) cb(b);
  }

  /* ---- layout -------------------------------------------------------
     One place computes the box, because the choice rows have to be
     hit-testable as well as drawn. A phone tap used to confirm whatever
     happened to be selected and there was no way to move the selection, so
     a phone could only ever pick the first line - which, in a scene whose
     only mechanic is what he chooses to say, meant no choice at all. */
  const PW = 36, PH = 40;
  const LH = 10;                       // one line of tiny text plus leading

  /* `full` is the whole line this box has to hold, not the part typed so
     far - the box was a fixed 54 pixels tall with maxLines: 3, and on a
     390-wide phone (where the panel gives up 96 columns to the buttons) a
     long line simply lost its last third with no indication that it had. */
  /* `slim` drops the portrait gutter and the minimum height with it, so the
     box is exactly as tall as the words in it. Cutscenes use it: they play
     over the live room now, and a fifty-six pixel panel across the bottom
     of a two-hundred-and-forty pixel frame cut everybody in the scene off
     at the knees. The face goes in the corner up top instead, where the
     wall is. */
  function layout(nRows, full, o) {
    const slim = !!(o && o.slim);
    const gap = KD.touch ? 96 : 0;
    const w = Math.min(KD.W - 12 - gap, 352);
    const x = Math.round((KD.W - gap - w) / 2);
    const tx = slim ? x + 9 : x + 7 + PW + 10;
    const tw = x + w - tx - 8;
    let body = slim ? 34 : 54;
    let rows = 0;
    if (nRows) {
      body = 20 + nRows * 13;
    } else if (full) {
      rows = KD.Text.wrap(full, tw, { tiny: true }).length;
      body = (slim ? 11 : 14) + Math.max(slim ? 2 : 3, rows) * LH;
    }
    const h = slim ? body : Math.max(body, PH + 16);
    /* `rows` is the line count of the WHOLE line, not of what has been
       typed so far, so the words can be centred in the box from the first
       character instead of creeping down it as the typewriter runs. A
       one-line answer used to sit against the top edge of a fifty-six
       pixel panel with forty pixels of empty navy under it, which reads as
       a layout bug rather than as a box. */
    return { w: w, h: h, x: x, y: KD.H - h - 12, tx: tx, tw: tw, slim: slim,
             rows: rows };
  }
  const rowY = (L, k) => L.y + 20 + k * 13;
  function rowAt(L, n) {
    const m = KD.In.mouse;
    if (m.x < L.tx - 10 || m.x > L.tx + L.tw + 2) return -1;
    for (let k = 0; k < n; k++) {
      const ry = rowY(L, k);
      if (m.y >= ry - 3 && m.y < ry + 10) return k;
    }
    return -1;
  }

  /* ---- update ------------------------------------------------------- */
  function update(dt) {
    if (popT > 0) popT -= dt;
    if (!script) return false;
    t += dt;
    if (hold > 0) { hold -= dt; return true; }
    const n = script[i];
    if (!n) { finish(); return true; }

    if (n.choose) {
      const list = n.choose.filter((c) => !c.when || c.when(bag));
      if (KD.In.isHit('ArrowDown', 'KeyS')) { sel = (sel + 1) % list.length; click(); }
      if (KD.In.isHit('ArrowUp', 'KeyW')) { sel = (sel + list.length - 1) % list.length; click(); }
      const L = layout(list.length, null);
      /* a mouse hover moves the selection, so what is lit is what Enter
         takes. On touch there is no hover - mouse.x/y is just where the
         last tap landed - so the selection is left alone there. */
      if (!KD.touch) {
        const over = rowAt(L, list.length);
        if (over >= 0) sel = over;
      }
      /* a tap TAKES the line it landed on; a tap anywhere else is ignored */
      let take = -1;
      if (KD.In.mouse.click && !KD.UI.blocked()) {
        take = rowAt(L, list.length);
        if (take >= 0) { sel = take; KD.In.consumedClick(); }
      }
      if (take >= 0 || KD.In.actHit('use', 'KeyE') || KD.In.isHit('Space', 'Enter')) {
        const c = list[Math.min(sel, list.length - 1)];
        if (c.set) Object.assign(bag, c.set);
        if (c.do) c.do(bag);
        sel = 0; hold = 0.1; click();
        if (c.goto !== undefined) { jump(c.goto); step(); }
        else { i++; step(); }
      }
      return true;
    }

    /* a line: type it out, then wait */
    const full = n.text || '';
    if (ch < full.length) {
      if (pause > 0) pause -= dt;
      else {
        ch += SPEED * dt;
        const c = full[Math.max(0, Math.floor(ch) - 1)];
        if (PAUSE[c]) pause = PAUSE[c];
      }
      if (press()) ch = full.length;              /* skip the typing */
      shown = full.slice(0, Math.floor(ch));
      return true;
    }
    shown = full;
    if (press()) { i++; ch = 0; pause = 0; hold = 0.06; step(); }
    return true;
  }

  function press() {
    const tapped = KD.In.mouse.click && !KD.UI.blocked();
    if (tapped) KD.In.consumedClick();
    return KD.In.actHit('use', 'KeyE') || KD.In.isHit('Space', 'Enter') || tapped;
  }
  const click = () => { if (KD.Sfx) KD.Sfx.play('click'); };

  /* ---- the box itself -----------------------------------------------
     Pulled out of draw() so the cutscene player can use it too. The
     cinematics had their own thinner panel and it looked like a different
     game from the conversations either side of it.
     ------------------------------------------------------------------ */
  function box(who, shownText, o) {
    o = o || {};
    const L = o.L || layout(0, shownText || '');
    const w = L.w, h = L.h, x = L.x, y = L.y;
    /* two frames and a lit inner edge */
    R(x - 2, y - 2, w + 4, h + 4, 'INK.0');
    R(x, y, w, h, 'DEEP.0');
    R(x + 1, y + 1, w - 2, 1, 'DEEP.2');
    R(x + 1, y + h - 2, w - 2, 1, 'INK.0');
    KD.Screen.frame(x, y, w, h, 'GOLD.0');
    KD.Screen.frame(x + 2, y + 2, w - 4, h - 4, 'INK.2');
    for (const [cx2, cy2, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1],
                                      [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
      R(cx2, cy2, sx * 5, sy * 2, 'GOLD.2');
      R(cx2, cy2, sx * 2, sy * 5, 'GOLD.2');
      R(cx2 + sx, cy2 + sy, sx * 2, sy * 2, 'GOLD.3');
    }
    /* The portrait, in its own frame. It bobs while its owner is speaking
       and drops in when the speaker CHANGES, which is the cheapest way to
       make a conversation feel like it has two people in it. */
    if (who.portrait !== popWho) { popWho = who.portrait; popT = 0.22; }
    if (!L.slim) {
      const drop = popT > 0 ? Math.round(KD.Juice.outCubic(1 - popT / 0.22) * 6 - 6) : 0;
      const bob = (o.speaking ? Math.round(Math.sin(t * 22) * 1.2) : 0) + drop;
      const px = x + 7, py = Math.round(y + (h - PH) / 2);
      R(px - 3, py - 3, PW + 6, PH + 6, 'INK.0');
      R(px - 2, py - 2, PW + 4, PH + 4, 'GOLD.0');
      R(px - 1, py - 1, PW + 2, 1, 'GOLD.2');
      R(px - 1, py - 1, PW + 2, PH + 2, 'DEEP.1');
      if (who.portrait && KD.PX.has(who.portrait)) {
        KD.PX.blit(KD.Screen.ctx(), who.portrait, px, py + bob, { anchor: false });
      }
      for (const ry of [py - 2, py + PH]) { R(px - 2, ry, 2, 2, 'GOLD.2'); R(px + PW, ry, 2, 2, 'GOLD.2'); }
    }
    /* the name, on a plaque over the top edge */
    const nm = (who.name || '').toUpperCase();
    if (nm) {
      const nw = KD.Text.width(nm) + 10;
      R(L.tx - 3, y - 6, nw, 12, 'INK.0');
      R(L.tx - 2, y - 5, nw - 2, 1, 'GOLD.1');
      KD.Screen.frame(L.tx - 3, y - 6, nw, 12, 'GOLD.0');
      KD.Text.draw(nm, L.tx + 2, y - 3, who.tint || 'GOLD.3', { shadow: 'INK.0' });
    }
    if (shownText !== null && shownText !== undefined) {
      const th = Math.max(1, L.rows || 1) * LH;
      const ty = Math.round(y + (h - th) / 2) + 1;
      KD.Text.block(shownText, L.tx, ty, 'BONE.2', { tiny: true, max: L.tw });
    }
    return L;
  }

  /* ---- draw --------------------------------------------------------- */
  function draw() {
    if (!script) return;
    const n = script[i];
    if (!n) return;
    const who = CAST[n.who] || CAST[(n.choose ? 'king' : 'folk')];
    const isChoice = !!n.choose;
    const list = isChoice ? n.choose.filter((c) => !c.when || c.when(bag)) : null;

    const L = layout(isChoice ? list.length : 0, isChoice ? null : (n.text || ''));
    const w = L.w, h = L.h, x = L.x, y = L.y;
    const speaking = !isChoice && Math.floor(ch) < (n.text || '').length;
    box(who, isChoice ? null : shown, { L: L, speaking: speaking });
    const tx = L.tx, tw = L.tw;

    /* ---- the words, or the choices ------------------------------- */
    if (isChoice) {
      KD.Text.draw(n.text || 'SAY:', tx, y + 8, 'BONE.0', { tiny: true, max: tw });
      /* on a phone you tap the line you want, so no line is pre-chosen and
         every one of them gets the plate and the bullet that says "tap me" */
      const lit = KD.touch ? -1 : Math.min(sel, list.length - 1);
      for (let k = 0; k < list.length; k++) {
        const ry = rowY(L, k);
        const on = k === lit;
        R(tx - 2, ry - 2, tw + 2, 12, on ? 'DEEP.2' : (KD.touch ? 'DEEP.1' : 'DEEP.0'));
        if (on) R(tx - 2, ry - 2, tw + 2, 1, 'WATER.2');
        if (on || KD.touch) {
          /* a little trident bullet on a line you can take */
          const c = on ? 'GOLD.3' : 'GOLD.1';
          R(tx - 8, ry + 1, 2, 2, c); R(tx - 8, ry + 5, 2, 2, c);
          R(tx - 6, ry + 1, 2, 6, c);
          R(tx - 4, ry + 3, 3, 2, on ? 'GOLD.2' : 'GOLD.0');
        }
        KD.Text.draw(list[k].label, tx + 2, ry, on ? 'WHITE' : 'BONE.2',
                     { tiny: true, max: tw - 6 });
      }
    } else {
      /* the caret: a small filled triangle that only appears when the line
         is finished, so you know the difference between "still talking" and
         "waiting for you" */
      if (!speaking) {
        /* a caret AND the word, because a four-pixel triangle in the corner
           is not an affordance on a phone */
        const cyy = y + h - 12 + (Math.sin(t * 5) > 0 ? 0 : 1);
        const lab = KD.touch ? 'TAP' : 'SPACE';
        const lw2 = KD.Text.width(lab, { tiny: true });
        const cxx = x + w - 10 - lw2 - 8;
        for (let k = 0; k < 4; k++) R(cxx - k, cyy + k, 1 + k * 2, 1, 'GOLD.3');
        KD.Text.draw(lab, x + w - 8, cyy + 1, 'GOLD.1', { tiny: true, align: 'right' });
      }
    }
    return { x, y, w, h };
  }

  return { start, update, draw, box, layout, active, CAST, get bag() { return bag; } };
})();
