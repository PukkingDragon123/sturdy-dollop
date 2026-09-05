/* ============================================================
   scenes/tree.js - the board, drawn as a board.

   A skill tree that is a list of text rows is a shop. This one
   is the shape it says it is: ten nodes in three branches, wired
   together, with the wire between two nodes going live the
   moment the one above it is bought. You read where you are by
   looking at it.

   Every node is an icon and a rank of pips. The only words on
   the screen are the name of whatever the cursor is on and the
   one line saying what it does - because that line is the whole
   reason to press the button, and a board where you cannot tell
   what anything does is a board you click at random.
   ============================================================ */
KD.Scenes.tree = (function () {
  const P = KD.Pod;
  const T = KD.Tree;
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);
  let t = 0, sel = 0, d = null, msg = '', msgT = 0, popT = 0, popId = '';

  function enter() {
    t = 0; sel = 0; msg = ''; msgT = 0;
    P.init();
    d = P.active();
    if (!d) { KD.Game.go('pens', {}); return; }
    KD.UI.guard(0.15);
  }
  const say = (s2) => { msg = s2; msgT = 2.6; };

  /* ---- where every node sits ------------------------------------------
     The grid in rpg/tree.js is cells; this turns it into pixels once, so
     the wires and the hit tests agree with the drawing by construction. */
  const CELL = 46, NODE = 26;
  function board() {
    const cols = 5, rows = 4;
    const bw = cols * CELL, bh = rows * CELL;
    const ox = Math.round((KD.W - bw) / 2) + 4;
    const oy = 30;
    return { ox, oy, bw, bh };
  }
  function at(n) {
    const B = board();
    return { x: B.ox + n.x * CELL, y: B.oy + n.y * CELL };
  }

  function update(dt) {
    t += dt;
    if (msgT > 0) msgT -= dt;
    if (popT > 0) popT -= dt;
    KD.State.tick(dt);
    KD.Fx.update(dt);
    if (KD.Coach.update(dt)) return;
    if (!KD.Coach.active() && !T.open(d, T.NODES[sel].id) &&
        KD.Coach.tip('tree_open')) return;
    if (KD.Coach.active()) return;

    if (KD.In.isHit('Escape') || KD.In.isHit('KeyT')) { KD.Game.go('pens', {}); return; }

    const N = T.NODES;
    /* the arrows walk the board by POSITION, not by index, so left really
       is left however the table is ordered */
    const cur = N[sel];
    const step = (dx, dy) => {
      let best = -1, bd = 1e9;
      for (let i = 0; i < N.length; i++) {
        if (i === sel) continue;
        const ddx = N[i].x - cur.x, ddy = N[i].y - cur.y;
        if (dx && Math.sign(ddx) !== dx) continue;
        if (dy && Math.sign(ddy) !== dy) continue;
        if (dx && ddy !== 0 && Math.abs(ddy) > 1) continue;
        const dist = Math.abs(ddx) * (dx ? 1 : 3) + Math.abs(ddy) * (dy ? 1 : 3);
        if (dist < bd) { bd = dist; best = i; }
      }
      if (best >= 0) { sel = best; KD.Sfx.play('click'); }
    };
    if (KD.In.isHit('ArrowLeft', 'KeyA')) step(-1, 0);
    if (KD.In.isHit('ArrowRight', 'KeyD')) step(1, 0);
    if (KD.In.isHit('ArrowUp', 'KeyW')) step(0, -1);
    if (KD.In.isHit('ArrowDown', 'KeyS')) step(0, 1);

    /* click a node straight */
    if (KD.In.mouse.click && !KD.UI.blocked()) {
      for (let i = 0; i < N.length; i++) {
        const p = at(N[i]);
        if (KD.UI.inside(p.x, p.y, NODE, NODE)) {
          KD.In.consumedClick();
          if (i === sel) buy(); else { sel = i; KD.Sfx.play('click'); }
          break;
        }
      }
    }
    if (KD.In.isHit('Space', 'Enter', 'KeyE')) buy();
    if (KD.In.isHit('KeyR')) {
      const back = T.reset(d);
      if (back) { say('Board cleared. ' + back + ' back.'); KD.Sfx.play('open'); KD.State.save(); }
    }
  }

  function buy() {
    const n = T.NODES[sel];
    if (T.rank(d, n.id) >= n.max) { say('That is as far as it goes.'); KD.Sfx.play('deny'); return; }
    if (!T.open(d, n.id)) { say('Buy what it hangs off first.'); KD.Sfx.play('deny'); return; }
    if (T.points(d) < n.cost) { say('Not enough. Win something.'); KD.Sfx.play('deny'); return; }
    T.take(d, n.id);
    popT = 0.4; popId = n.id;
    KD.Sfx.play('levelup');
    KD.Fx.flash(T.BRANCH[n.branch].col, 0.12);
    KD.State.save();
  }

  /* ================================================================
     DRAW
     ================================================================ */
  function water() {
    const W = KD.W, H = KD.H;
    R(0, 0, W, H, 'INK.0');
    const BAND = [[0, 'DEEP.0'], [0.30, 'INK.1'], [0.72, 'INK.0']];
    for (let i = 0; i < BAND.length; i++) {
      const y0 = Math.round(H * BAND[i][0]);
      const y1 = i + 1 < BAND.length ? Math.round(H * BAND[i + 1][0]) : H;
      R(0, y0, W, y1 - y0, BAND[i][1]);
    }
    for (let i = 0; i < 26; i++) {
      const x = Math.round((i * 149 + t * (5 + (i % 4) * 3)) % W);
      const y = Math.round((i * 71 - t * 4 + H * 6) % H);
      R(x, y, 1, 1, i % 3 ? 'DEEP.1' : 'DEEP.2');
    }
  }

  function wires() {
    for (const n of T.NODES) {
      if (!n.req) continue;
      const from = at(T.BY_ID[n.req]), to = at(n);
      const live = T.rank(d, n.req) > 0;
      const on = T.rank(d, n.id) > 0;
      const col = on ? T.BRANCH[n.branch].col : (live ? T.BRANCH[n.branch].dim : 'INK.2');
      const fx = from.x + NODE / 2, fy = from.y + NODE / 2;
      const tx = to.x + NODE / 2, ty = to.y + NODE / 2;
      /* elbow: down out of the parent, across, then down into the child.
         Solid two-pixel runs - a diagonal of single pixels at this size
         reads as dust. */
      const my = Math.round((fy + ty) / 2);
      R(fx - 1, fy, 2, my - fy, col);
      R(Math.min(fx, tx) - 1, my - 1, Math.abs(tx - fx) + 2, 2, col);
      R(tx - 1, my, 2, ty - my, col);
      /* a spark running down a live wire you have not bought yet */
      if (live && !on) {
        const k = (t * 0.7 + n.y * 0.3) % 1;
        R(tx - 1, my + (ty - my) * k, 2, 3, 'BONE.2');
      }
    }
  }

  function nodes(ctx) {
    for (let i = 0; i < T.NODES.length; i++) {
      const n = T.NODES[i];
      const p = at(n);
      const rk = T.rank(d, n.id);
      const maxed = rk >= n.max;
      const open = T.open(d, n.id);
      const can = T.canTake(d, n.id);
      const on = i === sel;
      const BR = T.BRANCH[n.branch];
      const pop = (popT > 0 && popId === n.id) ? Math.round(popT * 8) : 0;
      const x = p.x - pop, y = p.y - pop, sz = NODE + pop * 2;

      R(x - 1, y - 1, sz + 2, sz + 2, 'INK.0');
      R(x, y, sz, sz, rk > 0 ? 'DEEP.1' : (open ? 'INK.1' : 'INK.0'));
      if (rk > 0) R(x + 1, y + 1, sz - 2, 1, 'DEEP.3');
      KD.Screen.frame(x, y, sz, sz,
                      on ? 'GOLD.3' : (maxed ? BR.col : (rk > 0 ? BR.dim : (can ? 'BONE.0' : 'INK.2'))));
      /* the picture. A node you cannot reach shows the padlock instead. */
      const ic = open ? n.icon : 'ic_sk_lock';
      if (KD.PX.has(ic)) {
        KD.PX.blit(ctx, ic, x + Math.round((sz - 16) / 2), y + Math.round((sz - 16) / 2) - 2,
                   { anchor: false });
      }
      /* rank pips along the bottom edge */
      const pw = Math.min(5, Math.floor((sz - 6) / n.max));
      const tw = n.max * (pw + 1) - 1;
      for (let k = 0; k < n.max; k++) {
        R(x + (sz - tw) / 2 + k * (pw + 1), y + sz - 5, pw, 3,
          k < rk ? BR.col : 'INK.2');
      }
      /* a node you can afford right now pulses */
      if (can && !on) {
        const g = Math.sin(t * 4) > 0 ? 'BONE.1' : 'INK.3';
        R(x + sz - 4, y + 1, 3, 3, g);
      }
    }
  }

  function head(ctx) {
    R(0, 0, KD.W, 22, 'INK.0');
    R(0, 22, KD.W, 1, 'GOLD.0');
    if (d && KD.PX.has('ic_bond')) { /* the animal this board belongs to */ }
    KD.Text.draw(d.name.toUpperCase(), 6, 2, 'GOLD.3', { shadow: 'INK.0' });
    KD.Text.draw('LV' + d.lvl, 6, 13, 'BONE.0', { tiny: true });
    /* the points, as pips you can count without reading a number */
    const pts = T.points(d);
    const px = Math.round(KD.W / 2) - Math.min(pts, 10) * 5;
    for (let k = 0; k < Math.min(pts, 10); k++) {
      R(px + k * 10, 6, 7, 7, 'GOLD.3');
      R(px + k * 10 + 1, 7, 5, 1, 'WHITE');
    }
    if (pts > 10) KD.Text.draw('+' + (pts - 10), px + 106, 6, 'GOLD.3', { tiny: true });
    if (!pts) {
      KD.Text.draw('NO POINTS - WIN A FIGHT', KD.W / 2, 8, 'INK.3',
                   { tiny: true, align: 'center' });
    }
    KD.Text.draw(KD.touch ? 'tap a node' : 'R WIPE   -   ESC BACK',
                 KD.W - 6, 8, 'INK.3', { tiny: true, align: 'right' });
  }

  /* the one panel with words on it: what the cursor is sitting on */
  function detail(ctx) {
    const n = T.NODES[sel];
    const rk = T.rank(d, n.id);
    const BR = T.BRANCH[n.branch];
    const h = 40;
    const y = KD.H - h;
    R(0, y - 1, KD.W, h + 1, 'INK.0');
    R(0, y - 1, KD.W, 1, BR.col);
    if (KD.PX.has(n.icon)) KD.PX.blit(ctx, n.icon, 7, y + 8, { anchor: false });
    KD.Text.draw(n.name, 29, y + 5, BR.col, { shadow: 'INK.0' });
    KD.Text.draw(n.note, 29, y + 18, 'BONE.1', { tiny: true, max: KD.W - 100 });
    /* rank, and what it costs, as pips - no numbers */
    const rx = KD.W - 8;
    KD.Text.draw(rk + '/' + n.max, rx, y + 5, rk >= n.max ? BR.col : 'BONE.0',
                 { align: 'right', shadow: 'INK.0' });
    for (let k = 0; k < n.cost; k++) {
      R(rx - 7 - k * 9, y + 20, 7, 7, T.points(d) >= n.cost ? 'GOLD.3' : 'INK.3');
    }
    if (msgT > 0) {
      const tw = KD.Text.width(msg, { tiny: true }) + 12;
      R((KD.W - tw) / 2, y - 16, tw, 13, 'INK.0');
      KD.Screen.frame((KD.W - tw) / 2, y - 16, tw, 13, 'BLOOD.2');
      KD.Text.draw(msg, KD.W / 2, y - 13, 'BONE.2', { tiny: true, align: 'center' });
    }
  }

  function draw(ctx) {
    if (!d) return;
    water();
    wires();
    nodes(ctx);
    head(ctx);
    detail(ctx);
    if (KD.touch) KD.UI.touchPad([], { noStick: true });
    KD.Coach.draw();
  }

  return { enter, update, draw, _sel: () => sel, _buy: buy };
})();
