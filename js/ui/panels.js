/* ============================================================
   ui/panels.js - the three full-screen panels: the bag, the
   crafting bench and the skill tree. One file because they
   share layout maths and only one is ever open.
   ============================================================ */
KD.Panels = (function () {
  let open = null;                    // null | 'bag' | 'body' | 'tree' | 'quest'
  let carry = null;                   // the stack on the cursor
  let station = 'bench';              // nearest crafting station
  let scroll = 0, treePan = { x: 0, y: 0 }, pick = null;

  /* A 50% checkerboard over the whole screen is authentic and also unreadable
     at any zoom. A solid curtain with a sparse stipple says "behind glass"
     without turning the frame into static. */
  function scrim() {
    const ctx = KD.Screen.ctx();
    KD.Screen.rect(0, 0, KD.W, KD.H, 'INK.0');
    for (let y = 0; y < KD.H; y += 4) {
      for (let x = (y & 4) ? 0 : 2; x < KD.W; x += 8) KD.Screen.rect(x, y, 1, 1, 'DEEP.1');
    }
  }
  const isOpen = () => !!open;
  function toggle(which) {
    if (open === which) { close(); return; }
    open = which; scroll = 0; pick = null;
    KD.Juice.pop('panel', 0.24);
    KD.UI.guard(0.18);
    KD.Sfx.play('open');
  }
  function close() {
    if (carry) { KD.State.giveGear(carry.uid ? carry : carry); carry = null; }
    open = null;
    KD.UI.guard(0.14);
  }

  /* what station is the player standing next to? */
  function nearestStation() {
    const P = KD.Player.P, Wd = KD.World;
    const tx = (P.x / 8) | 0, ty = (P.y / 8) | 0;
    let best = null;
    for (let dy = -3; dy <= 2; dy++) for (let dx = -4; dx <= 4; dx++) {
      const T = KD.Tiles.get(Wd.at(tx + dx, ty + dy));
      if (T && T.station) best = T.station;
    }
    return best;
  }

  /* ---------------- the bag ---------------- */
  function bag(S) {
    const cols = 8, rows = Math.ceil(KD.State.SLOTS / cols);
    const w = cols * 17 + 11, h = rows * 17 + 26;
    const x = ((KD.W - w - 28) >> 1), y = 24;
    KD.UI.titled(x, y, w, h, 'THE BAG');
    for (let i = 0; i < KD.State.SLOTS; i++) {
      const sx = x + 6 + (i % cols) * 17, sy = y + 16 + ((i / cols) | 0) * 17;
      const r = KD.UI.slot(sx, sy, S.S.inv[i], { sel: i === S.S.hot });
      if (r === 'left') {
        const had = S.S.inv[i];
        S.S.inv[i] = carry;
        carry = had;
        KD.Sfx.play('click');
      } else if (r === 'right' && S.S.inv[i]) {
        const it = S.S.inv[i];
        if (KD.State.isGear(it)) {
          /* right click wears armour, or eats/drinks anything usable */
          if (it.kind === 'armour') { S.S.inv[i] = null; S.equip(it); }
        } else {
          const rr = KD.State.resOf(it.id);
          if (rr && (rr.beer || rr.food)) S.useItem({ id: it.id });
          else {
            /* otherwise split the stack */
            const half = Math.ceil(it.n / 2);
            if (!carry) { carry = { id: it.id, n: half }; it.n -= half; if (it.n <= 0) S.S.inv[i] = null; }
          }
        }
      }
    }
    /* the worn kit gets its own panel beside the bag, so armour reads as
       something you wear rather than four slots floating on the scrim */
    const ew = 26, ex = x + w + 2;
    if (ex + ew <= KD.W - 2) {
      const eh = 4 * 17 + 22;
      KD.UI.panel(ex, y, ew, eh);
      KD.Text.draw('WORN', ex + ew / 2, y + 3, 'GOLD.2', { tiny: true, align: 'center' });
      ['head', 'body', 'legs', 'shield'].forEach((sl, k) => {
        const r = KD.UI.slot(ex + 5, y + 11 + k * 17, S.S.equip[sl], {});
        if (r) S.unequip(sl);
      });
      KD.Text.draw(S.armourTotal() + ' AR', ex + ew / 2, y + eh - 8, 'BONE.2', { tiny: true, align: 'center' });
    }
    KD.Text.draw('click to move  -  right-click to wear, drink or split  -  1-8 selects', KD.W / 2, y + h + 3,
      'INK.3', { tiny: true, align: 'center' });
  }

  /* ---------------- crafting ---------------- */
  /* ---- QUESTS: the whole chain, so you can see where you are -------- *
   * One line of HUD text told you the current objective and nothing else -
   * not what you had done, not what was coming, not who wanted it. This is
   * the ladder, with the rung you are on lit.
   * ------------------------------------------------------------------ */
  /* ---- the seed crate ------------------------------------------------
     Four rows, a price, and what each one is FOR - fast and cheap, slow
     and rich, or the one that lights the plot after dark. A shop whose
     rows do not say why you would want the thing is a price list. */
  function seeds(S) {
    const C = KD.Day.CROPS;
    const list = Object.keys(C).map((k) => Object.assign({ k: k }, C[k]));
    const w = Math.min(KD.W - 20, 262), rowH = 26;
    const h = 34 + list.length * rowH + 16;
    const x = Math.round((KD.W - w) / 2);
    const y = Math.max(4, Math.round((KD.H - h) / 2));
    const p = KD.UI.titled(x, y, w, h, 'SEED CRATE');
    KD.Text.draw(S.S.clams + 'c', x + w - 8, y + 3, 'GOLD.3',
                 { tiny: true, align: 'right', shadow: 'INK.0' });
    const WHY = { kelp: 'two days. Always worth it.',
                  glow: 'three days, and it lights the plot.',
                  pearl: 'five days. Pays for the week.' };
    list.forEach((c, i) => {
      const ry = p.iy + 2 + i * rowH;
      const hot = KD.UI.inside(x + 5, ry - 2, w - 10, rowH - 3);
      const can = S.S.clams >= c.cost;
      if (hot) KD.Screen.rect(x + 5, ry - 2, w - 10, rowH - 3, can ? 'DEEP.1' : 'INK.1');
      const spr = c.art + '3';
      if (KD.PX.has(spr)) KD.PX.blit(KD.Screen.ctx(), spr, x + 9, ry - 1, { anchor: false });
      KD.Text.draw(c.name, x + 24, ry, can ? 'BONE.2' : 'INK.3', { shadow: 'INK.0' });
      KD.Text.draw(WHY[c.k] || '', x + 24, ry + 11, 'INK.3', { tiny: true });
      KD.Text.draw(c.cost + 'c', x + w - 10, ry + 3, can ? 'GOLD.3' : 'BLOOD.2',
                   { align: 'right', shadow: 'INK.0' });
      if (hot && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick();
        if (!can) { KD.State.say('Not enough clams.', 'BLOOD.2'); KD.Sfx.play('deny'); }
        else { S.spend(c.cost); S.give(c.seed, 1); KD.Sfx.play('pickup'); }
      }
    });
    KD.Text.draw(KD.touch ? 'tap a row to buy one' : 'click a row to buy one',
                 x + w / 2, y + h - 12, 'INK.3', { tiny: true, align: 'center' });
  }

  function quests(S) {
    const Q = KD.Quests.Q;
    const w = Math.min(KD.W - 20, 300);
    const rowH = 20;
    const h = Math.min(KD.H - 12, 34 + Q.length * rowH + 14);
    const x = Math.round((KD.W - w) / 2);
    const y = Math.max(4, Math.round((KD.H - h) / 2));
    const p = KD.UI.titled(x, y, w, h, 'WHAT SHE WANTS');
    const dn = KD.Quests.doneCount();
    KD.Text.draw(dn + '/' + Q.length, x + w - 8, y + 3, 'GOLD.2',
      { tiny: true, align: 'right', shadow: 'INK.0' });
    /* her portrait in the corner, because every one of these is hers */
    if (KD.PX.has('po_keg')) {
      KD.PX.blit(KD.Screen.ctx(), 'po_keg', x + w - 26, y + h - 30,
        { anchor: false, dw: 18, dh: 20, shade: 1 });
    }
    Q.forEach((q, i) => {
      const ry = p.iy + 2 + i * rowH;
      if (ry + rowH > y + h - 10) return;
      const st = KD.Quests.state(q.id);
      const open = st === 'open';
      const ready = open && q.done(S.S);
      const locked = st === 'none' && q.need && !KD.Quests.isDone(q.need);
      if (open) KD.Screen.rect(x + 4, ry - 2, w - 8, rowH - 2, 'DEEP.1');
      /* a tick, a bullet or a lock, so status reads before the words do */
      const bx = x + 8, by = ry + 1;
      if (st === 'done') {
        KD.Screen.rect(bx, by + 3, 2, 2, 'KELP.2');
        KD.Screen.rect(bx + 2, by + 5, 2, 2, 'KELP.2');
        KD.Screen.rect(bx + 4, by + 1, 2, 4, 'KELP.3');
      } else if (ready) {
        KD.Screen.rect(bx + 1, by, 4, 6, 'GOLD.3');
        KD.Screen.rect(bx, by + 1, 6, 4, 'GOLD.3');
      } else if (open) {
        KD.Screen.rect(bx + 1, by + 1, 4, 4, 'BONE.2');
        KD.Screen.frame(bx + 1, by + 1, 4, 4, 'INK.0');
      } else {
        KD.Screen.rect(bx + 1, by + 2, 4, 4, locked ? 'INK.2' : 'INK.3');
        KD.Screen.rect(bx + 2, by, 2, 2, locked ? 'INK.2' : 'INK.3');
      }
      const col = st === 'done' ? 'KELP.2' : ready ? 'GOLD.3'
                : open ? 'WHITE' : locked ? 'INK.2' : 'BONE.0';
      KD.Text.draw(locked && st === 'none' ? '- - - - -' : q.name, x + 18, ry, col, { max: w - 60 });
      /* the objective, but only for the one you are actually on */
      if (open) KD.Text.draw(q.hint, x + 18, ry + 9, ready ? 'KELP.2' : 'INK.3', { tiny: true, max: w - 30 });
      else if (st === 'done') KD.Text.draw('done', x + w - 12, ry + 1, 'KELP.0', { tiny: true, align: 'right' });
    });
    const cur = KD.Quests.current();
    KD.Text.draw(cur || 'Nothing left to prove.', x + w / 2, y + h - 11,
      'BONE.1', { tiny: true, align: 'center', max: w - 40 });
  }

  /* ---- BODY: what you spend clams on now that crafting is gone ------ *
   * Six traits, a rising price each, and the blurb says what the rank
   * actually does rather than quoting a number nobody can feel.
   * ------------------------------------------------------------------ */
  function body(S) {
    const T = KD.Body.TRAITS;
    const w = Math.min(KD.W - 24, 300);
    const rowH = 26;
    const h = 34 + T.length * rowH + 16;
    const x = Math.round((KD.W - w) / 2);
    const y = Math.max(4, Math.round((KD.H - h) / 2));
    const p = KD.UI.titled(x, y, w, h, 'TRAIN THE BODY');
    KD.Text.draw(S.S.clams + ' CLAMS', x + w - 8, y + 3, 'GOLD.2',
      { tiny: true, align: 'right', shadow: 'INK.0' });
    T.forEach((t, i) => {
      const ry = p.iy + 4 + i * rowH;
      const n = KD.Body.rank(S.S, t.id);
      const cap = KD.Body.maxed(S.S, t.id);
      const c = KD.Body.cost(S.S, t.id);
      const afford = !cap && S.S.clams >= c;
      const hot = KD.UI.inside(x + 4, ry - 3, w - 8, rowH - 3);
      if (hot && !cap) KD.Screen.rect(x + 4, ry - 3, w - 8, rowH - 3, 'DEEP.1');
      /* the icon */
      if (KD.PX.has(t.icon)) {
        KD.PX.blit(KD.Screen.ctx(), t.icon, x + 8, ry, { anchor: false, shade: cap ? 2 : 0 });
      }
      KD.Text.draw(t.name, x + 22, ry, cap ? 'GOLD.3' : 'BONE.2', { shadow: 'INK.0' });
      /* rank pips, so progress is visible without reading a number */
      for (let k = 0; k < t.max; k++) {
        KD.Screen.rect(x + 22 + k * 6, ry + 10, 5, 4, k < n ? 'GOLD.2' : 'INK.2');
        KD.Screen.frame(x + 22 + k * 6, ry + 10, 5, 4, 'INK.0');
      }
      KD.Text.draw(t.blurb, x + 22 + t.max * 6 + 6, ry + 10, 'INK.3',
        { tiny: true, max: w - 40 - t.max * 6 });
      /* the price, or MAX */
      KD.Text.draw(cap ? 'MAX' : c + 'c', x + w - 8, ry + 1,
        cap ? 'GOLD.3' : (afford ? 'GOLD.2' : 'ROT.3'), { align: 'right', shadow: 'INK.0' });
      if (hot && !cap && KD.In.mouse.click && !KD.UI.blocked()) {
        KD.In.consumedClick();
        KD.Body.buy(S.S, t.id);
      }
    });
    KD.Text.draw(Math.round(S.S.weight) + ' KG   -   ' + KD.Goal.trainedTotal(S.S) + ' LEVELS TRAINED',
      x + w / 2, y + h - 12, 'BONE.0', { tiny: true, align: 'center' });
  }

  function tree(S) {
    const Sk = KD.Skills;
    const w = KD.W - 8, h = KD.H - 8, x = 4, y = 4;
    KD.UI.titled(x, y, w, h, 'SKILLS  -  ' + S.S.points + ' POINT' + (S.S.points === 1 ? '' : 'S'));
    if (!Sk) { KD.Text.draw('no skill tree loaded', KD.W / 2, 40, 'BLOOD.2', { align: 'center' }); return; }
    const trunks = Array.isArray(Sk.TRUNKS) ? Sk.TRUNKS : Object.keys(Sk.TRUNKS).map((k) => Sk.TRUNKS[k]);
    let maxCol = 0, maxRow = 0;
    for (const n of Sk.all) { maxCol = Math.max(maxCol, n.col); maxRow = Math.max(maxRow, n.row); }
    const top = y + 26, bottom = y + h - 36;
    const GX = Math.floor((w - 24) / (maxCol + 1));
    const GY = Math.max(14, Math.floor((bottom - top) / (maxRow + 1)));
    const px = (c) => x + 12 + c * GX + Math.floor((GX - 12) / 2);
    const py = (r) => top + r * GY;

    /* pipes first so the nodes sit on top of them */
    for (const n of Sk.all) {
      for (const pid of (n.needs || [])) {
        const p2 = Sk.byId[pid];
        if (!p2) continue;
        const ax = px(p2.col) + 6, ay = py(p2.row) + 6;
        const bx = px(n.col) + 6, by = py(n.row) + 6;
        const on = (S.S.alloc[pid] || 0) > 0;
        const col = on ? 'GOLD.1' : 'INK.2';
        KD.Screen.line(ax, ay, ax, by, col);
        KD.Screen.line(ax, by, bx, by, col);
      }
    }
    /* trunk headings, centred over each trunk's own column band */
    for (const tr of trunks) {
      const cols = tr.cols || [tr.col, tr.col];
      const cx = (px(cols[0]) + px(cols[1]) + 12) / 2;
      KD.Text.draw(tr.name, cx, y + 15, tr.colour || 'BONE.2', { tiny: true, align: 'center' });
    }
    pick = null;
    for (const n of Sk.all) {
      const nx = px(n.col), ny = py(n.row);
      const rank = S.S.alloc[n.id] || 0;
      const can = Sk.canTake(S.S.alloc, n.id) && S.S.points >= n.cost;
      const state = rank >= n.max ? 'taken' : (rank > 0 ? 'taken' : (can ? 'open' : 'locked'));
      const spr = 'sk_node_' + state;
      if (KD.PX.has(spr)) KD.PX.blit(KD.Screen.ctx(), spr, nx, ny, { anchor: false });
      else {
        KD.Screen.rect(nx, ny, 12, 12, rank > 0 ? 'GOLD.1' : (can ? 'DEEP.2' : 'INK.1'));
        KD.Screen.frame(nx, ny, 12, 12, rank > 0 ? 'GOLD.3' : 'INK.3');
      }
      /* the node's own mark inside it. Twenty-seven identical discs is a
         wall, not a tree - you could only tell them apart by hovering. */
      const ico = NODE_ICON[n.id];
      if (ico && KD.PX.has(ico)) {
        KD.PX.blit(KD.Screen.ctx(), ico, nx + 2, ny + 2,
          { anchor: false, shade: state === 'locked' ? 3 : 0 });
      }
      if (n.max > 1 || rank) {
        KD.Text.draw(rank + '/' + n.max, nx + 6, ny + 13, rank ? 'GOLD.2' : 'INK.3', { tiny: true, align: 'center' });
      }
      if (KD.UI.inside(nx - 2, ny - 2, 16, 16)) {
        pick = n;
        if (KD.In.mouse.click && !KD.UI.blocked()) { KD.In.consumedClick(); S.takeSkill(n.id); }
      }
    }
    /* the detail box for whatever the cursor is over */
    const bh = 30, bw = Math.min(w - 16, 190);
    const bx = ((KD.W - bw) >> 1), by = KD.H - bh - 6;
    KD.Screen.rect(bx, by, bw, bh, 'INK.0');
    KD.Screen.frame(bx, by, bw, bh, 'INK.3');
    if (pick) {
      KD.Text.draw(pick.name, bx + 4, by + 3, 'GOLD.3', { max: bw - 40 });
      KD.Text.draw(pick.cost + 'pt', bx + bw - 4, by + 3, 'BONE.0', { align: 'right' });
      KD.Text.block(pick.desc || '', bx + 4, by + 13, 'BONE.1', { max: bw - 8, tiny: true, lh: 7, maxLines: 2 });
    } else {
      KD.Text.draw('hover a node to read it, click to spend a point', bx + bw / 2, by + 11,
        'INK.3', { tiny: true, align: 'center', max: bw - 8 });
    }
  }

  function draw(S) {
    if (!open) return;
    scrim();
    /* Panels come in on an overshoot rather than appearing. The scale is
       applied by squeezing the LAYOUT toward the centre, so every panel gets
       it for free without any of them knowing about it. */
    const k = KD.Juice.back(KD.Juice.at('panel'));
    if (k < 0.999) {
      const cx = KD.W / 2, cy = KD.H / 2;
      const ctx0 = KD.Screen.ctx();
      ctx0.save();
      ctx0.translate(cx, cy);
      ctx0.scale(k, k);
      ctx0.translate(-cx, -cy);
      drawOpen(S);
      ctx0.restore();
      return;
    }
    drawOpen(S);
  }

  function drawOpen(S) {
    if (open === 'bag') bag(S);
    else if (open === 'body') body(S);
    else if (open === 'quest') quests(S);
    else if (open === 'tree') tree(S);
    else if (open === 'seeds') seeds(S);
    /* the carried stack rides the cursor */
    if (carry) {
      const spr = KD.State.spriteOf(carry);
      const mx = Math.round(KD.In.mouse.x) - 6, my = Math.round(KD.In.mouse.y) - 6;
      if (spr && KD.PX.has(spr)) KD.PX.blit(KD.Screen.ctx(), spr, mx, my, { anchor: false });
      else KD.Screen.rect(mx + 2, my + 2, 8, 8, 'CORAL.2');
      if (!KD.State.isGear(carry) && carry.n > 1) {
        KD.Text.draw(carry.n, mx + 13, my + 7, 'BONE.2', { tiny: true, align: 'right', shadow: 'INK.0' });
      }
    }
    KD.UI.tooltips();
    if (KD.UI.button(KD.W - 40, 2, 36, 11, 'CLOSE', {})) close();
  }
  return { draw, toggle, close, isOpen, get open() { return open; }, nearestStation };
})();
