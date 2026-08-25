/* ============================================================
   ui/panels.js - the three full-screen panels: the bag, the
   crafting bench and the skill tree. One file because they
   share layout maths and only one is ever open.
   ============================================================ */
KD.Panels = (function () {
  let open = null;                    // null | 'bag' | 'craft' | 'tree'
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
  function craft(S) {
    const w = Math.min(KD.W - 16, 240), h = KD.H - 40;
    const x = ((KD.W - w) >> 1), y = 20;
    station = nearestStation() || 'hand';
    const p = KD.UI.titled(x, y, w, h, station === 'hand' ? 'CRAFTING  -  BARE HANDS'
                                                          : 'CRAFTING  -  ' + station.toUpperCase());
    const R = KD.Recipes;
    if (!R) { KD.Text.draw('no recipes loaded', x + w / 2, y + 30, 'BLOOD.2', { align: 'center' }); return; }
    const inv = KD.State.inventoryView();
    const shapes = R.all.filter((s) => (s.station || 'bench') === station);
    const rowH = 20, listW = w - 8;
    const view = Math.floor((h - 22) / rowH);
    scroll = Math.max(0, Math.min(Math.max(0, shapes.length - view), scroll + KD.In.mouse.wheel));
    for (let k = 0; k < view; k++) {
      const s = shapes[k + scroll];
      if (!s) break;
      const ry = p.iy + k * rowH;
      const can = R.canCraft(s.id, inv);
      const hot = KD.UI.inside(x + 4, ry, listW, rowH - 2);
      KD.Screen.rect(x + 4, ry, listW, rowH - 2, hot ? 'INK.2' : (k & 1 ? 'INK.1' : 'DEEP.0'));
      const spr = KD.State.art(s.sprite, s.kind);
      if (spr) KD.PX.blit(KD.Screen.ctx(), spr, x + 6, ry + 3, { anchor: false });
      KD.Text.draw(s.noun || s.id, x + 22, ry + 2, can ? 'BONE.2' : 'INK.3', { max: listW - 60 });
      const need = (s.needs || []).map((n) => n.n + 'x ' + n.role).join('  ');
      KD.Text.draw(need, x + 22, ry + 11, can ? 'BONE.0' : 'INK.3', { tiny: true, max: listW - 60 });
      if (can) {
        if (KD.UI.button(x + w - 38, ry + 2, 32, 14, 'MAKE', { key: null })) { S.craft(s.id); }
      } else {
        KD.Text.draw('need', x + w - 8, ry + 6, 'INK.3', { tiny: true, align: 'right' });
      }
    }
    if (shapes.length > view) {
      KD.Text.draw((scroll + 1) + '-' + Math.min(shapes.length, scroll + view) + ' of ' + shapes.length,
        x + w / 2, y + h - 9, 'INK.3', { tiny: true, align: 'center' });
    }
    if (!shapes.length) {
      KD.Text.draw('Nothing to make here.', x + w / 2, y + 40, 'BONE.0', { align: 'center' });
      KD.Text.draw('stand next to a station for its recipes', x + w / 2, y + 52, 'INK.3', { tiny: true, align: 'center' });
    }
    /* say which station you are at, and hint at what unlocks next */
    if (station === 'hand') {
      KD.Text.draw('build a WORKBENCH to unlock the rest', x + w / 2, y + h - 9,
        'GOLD.1', { tiny: true, align: 'center' });
    }
  }

  /* ---------------- the skill tree ---------------- */
  /* Node col/row are coordinates on ONE shared 11-column grid, not per-trunk
     offsets - the trunks just occupy different column bands. Laying them out
     per-trunk is what loses a whole trunk off the side of the panel. */
  /* One existing 8x8 icon per skill, chosen for what the skill DOES, so a
     glance at the tree reads as "dig, light, luck, lungs" rather than as
     twenty-seven identical discs. No new art needed. */
  const NODE_ICON = {
    delve_root: 'ic_pick',     delve_speed1: 'ic_pick',    delve_light1: 'ic_star',
    delve_luck1: 'ic_coin',    delve_breath: 'ic_bubble',   delve_tough: 'ic_shield',
    delve_speed2: 'ic_anvil',  delve_pressure: 'ic_arrow_down', delve_cap: 'ic_crown',
    brawl_root: 'ic_sword',    brawl_dmg1: 'ic_sword',      brawl_crit1: 'ic_cross',
    brawl_swing: 'ic_arrow_r', brawl_reach: 'ic_arrow_r',   brawl_rage: 'ic_heart_full',
    brawl_bulwark: 'ic_shield', brawl_leech: 'ic_heart_half', brawl_cap: 'ic_skull',
    tide_root: 'ic_bubble',    tide_swim1: 'ic_arrow_up',   tide_hook1: 'ic_pick',
    tide_grapple: 'ic_map',    tide_current: 'ic_arrow_r',  tide_mount: 'ic_star',
    tide_flow: 'ic_clock_day', tide_gills: 'ic_bubble',     tide_cap: 'ic_crown'
  };

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
    if (open === 'bag') bag(S);
    else if (open === 'craft') craft(S);
    else if (open === 'tree') tree(S);
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
