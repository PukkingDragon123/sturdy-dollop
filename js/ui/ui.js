/* ============================================================
   ui/ui.js - panels, buttons, slots and bars, built from the
   hand-drawn 9-slice kits. Every widget falls back to stepped
   rectangles if its sprite kit has not been drawn yet, so the
   game is always playable.
   ============================================================ */
KD.UI = (function () {
  let hotId = null, guardT = 0;
  const tipQ = [];

  const kit = (k) => [k + '_tl', k + '_t', k + '_tr', k + '_l', k + '_c', k + '_r', k + '_bl', k + '_b', k + '_br'];
  const hasKit = (k) => kit(k).every((n) => KD.PX.has(n));

  /* a stepped bevel box: light top-left, dark bottom-right (or inverted) */
  function bevel(x, y, w, h, fill, recessed) {
    const hi = recessed ? 'INK.0' : 'INK.3';
    const lo = recessed ? 'INK.3' : 'INK.0';
    KD.Screen.rect(x, y, w, h, fill);
    KD.Screen.rect(x, y, w, 1, hi);
    KD.Screen.rect(x, y, 1, h, hi);
    KD.Screen.rect(x, y + h - 1, w, 1, lo);
    KD.Screen.rect(x + w - 1, y, 1, h, lo);
  }
  function panel(x, y, w, h, k) {
    const key = k || 'pnl';
    if (hasKit(key)) KD.PX.nine(KD.Screen.ctx(), kit(key), x, y, w, h);
    else { KD.Screen.rect(x, y, w, h, 'INK.1'); bevel(x, y, w, h, 'INK.1', false); }
    return { x, y, w, h, cx: x + w / 2, iy: y + 4 };
  }
  function titled(x, y, w, h, title) {
    const p = panel(x, y, w, h);
    KD.Screen.rect(x + 3, y + 11, w - 6, 1, 'INK.3');
    KD.Text.draw(title, x + w / 2, y + 3, 'GOLD.3', { align: 'center', shadow: 'INK.0' });
    p.iy = y + 15;
    return p;
  }
  const inside = (x, y, w, h) => {
    const m = KD.In.mouse;
    return m.x >= x && m.y >= y && m.x < x + w && m.y < y + h;
  };
  const guard = (t) => { guardT = t || 0.16; };
  const blocked = () => guardT > 0;
  const tickGuard = (dt) => { if (guardT > 0) guardT -= dt; };

  function button(x, y, w, h, label, o) {
    o = o || {};
    const hot = !o.off && inside(x, y, w, h);
    const held = hot && KD.In.mouse.down;
    const k = o.off ? null : (held || o.on ? 'btnhot' : 'btn');
    if (k && hasKit(k)) KD.PX.nine(KD.Screen.ctx(), kit(k), x, y, w, h);
    else bevel(x, y, w, h, o.off ? 'INK.1' : (held || o.on ? 'DEEP.3' : (hot ? 'DEEP.2' : 'DEEP.1')), held);
    const col = o.off ? 'INK.3' : (o.on ? 'GOLD.3' : 'BONE.2');
    KD.Text.draw(label, x + w / 2, y + ((h - 7) >> 1), col, { align: 'center', max: w - 6, shadow: 'INK.0' });
    if (o.off) return false;
    const clicked = (hot && KD.In.mouse.click && !blocked()) ||
                    (o.key && KD.In.isHit(o.key));
    if (clicked) { KD.In.consumedClick(); KD.Sfx.play('click'); }
    return clicked;
  }

  /* an inventory slot. Returns 'left' | 'right' | null. */
  function slot(x, y, item, o) {
    o = o || {};
    const sel = o.sel;
    const k = sel ? 'slotsel' : 'slot';
    if (hasKit(k)) KD.PX.nine(KD.Screen.ctx(), kit(k), x, y, 16, 16);
    else {
      bevel(x, y, 16, 16, 'INK.0', true);
      if (sel) KD.Screen.frame(x, y, 16, 16, 'GOLD.2');
    }
    if (item) {
      const spr = KD.State.spriteOf(item);
      if (spr && KD.PX.has(spr)) KD.PX.blit(KD.Screen.ctx(), spr, x + 2, y + 2, { anchor: false });
      else KD.Screen.rect(x + 4, y + 4, 8, 8, 'CORAL.2');
      if (!KD.State.isGear(item) && item.n > 1) {
        KD.Text.draw(item.n, x + 15, y + 10, 'BONE.2', { tiny: true, align: 'right', shadow: 'INK.0' });
      }
      if (KD.State.isGear(item) && item.prefixTier) {
        const pc = item.prefixTier < 0 ? 'BLOOD.1' : (item.prefixTier >= 3 ? 'GOLD.3' : (item.prefixTier >= 2 ? 'ROT.3' : 'KELP.2'));
        KD.Screen.rect(x + 1, y + 1, 2, 2, pc);
      }
      if (KD.State.isGear(item) && item.kind === 'armour' && KD.State.equipped(item.slot) === item) {
        KD.Screen.rect(x + 12, y + 1, 3, 3, 'KELP.2');
      }
    }
    const hot = inside(x, y, 16, 16);
    if (hot && item) tipQ.push({ item, x, y });
    if (hot && !blocked()) {
      if (KD.In.mouse.click) { KD.In.consumedClick(); return 'left'; }
      if (KD.In.mouse.rclick) return 'right';
    }
    return null;
  }

  function bar(x, y, w, h, frac, fillCol, o) {
    o = o || {};
    frac = Math.max(0, Math.min(1, frac));
    KD.Screen.rect(x, y, w, h, 'INK.0');
    KD.Screen.rect(x, y, w, 1, 'INK.2');
    const iw = Math.round((w - 2) * frac);
    if (iw > 0) {
      KD.Screen.rect(x + 1, y + 1, iw, h - 2, fillCol);
      KD.Screen.rect(x + 1, y + 1, iw, 1, KD.PAL.shift(fillCol, 1));
    }
    if (o.label) KD.Text.draw(o.label, x + w / 2, y + ((h - 5) >> 1), 'BONE.2', { tiny: true, align: 'center', shadow: 'INK.0' });
  }

  /* tooltips draw last so they sit over everything */
  function tooltips() {
    if (!tipQ.length) return;
    const t = tipQ[tipQ.length - 1];
    tipQ.length = 0;
    const it = t.item;
    const lines = [];
    lines.push([KD.State.nameOf(it), it.tierCol || 'BONE.2']);
    if (KD.State.isGear(it)) {
      if (it.kind === 'weapon') lines.push([it.dmg + ' dmg   ' + it.spd.toFixed(2) + ' spd   ' + it.reach + ' reach', 'BONE.1']);
      if (it.kind === 'tool') lines.push(['mine ' + it.pow + '   tier ' + it.tier + '   ' + it.dmg + ' dmg', 'BONE.1']);
      if (it.kind === 'armour') {
        lines.push([it.armour + ' armour   (' + (it.slot || 'body') + ')', 'BONE.1']);
        lines.push([KD.State.equipped(it.slot) === it ? 'WORN' : 'right-click to wear', 'KELP.2']);
      }
      if (it.crit) lines.push([it.crit + '% crit', 'GOLD.2']);
      if (it.dur !== undefined) lines.push([it.dur + ' / ' + it.durMax + ' durability', 'BONE.0']);
      if (it.effect) lines.push(['* ' + it.effect, 'ROT.3']);
      if (it.tier) lines.push(['tier ' + it.tier, 'INK.3']);
    } else {
      const r = KD.State.resOf(it.id);
      if (r && r.tile) lines.push(['placeable', 'KELP.2']);
      if (r && r.beer) lines.push(['+' + Math.round(r.beer.dmg * 100) + '% damage, +' + r.beer.fat + ' fat', 'GOLD.2']);
      if (r && r.food) lines.push(['heals ' + r.food, 'KELP.2']);
      if (r && r.value) lines.push([r.value + 'c each', 'BONE.0']);
    }
    let w = 0;
    for (const l of lines) w = Math.max(w, KD.Text.width(l[0]));
    w += 8;
    const h = lines.length * 9 + 5;
    let x = t.x + 18, y = t.y - 2;
    if (x + w > KD.W - 2) x = t.x - w - 2;
    if (y + h > KD.H - 2) y = KD.H - h - 2;
    KD.Screen.rect(x, y, w, h, 'INK.0');
    KD.Screen.frame(x, y, w, h, 'INK.3');
    lines.forEach((l, i) => KD.Text.draw(l[0], x + 4, y + 3 + i * 9, l[1]));
  }

  /* An octagon, stepped by hand. No arc(), and it reads as a round button. */
  function octo(cx, cy, r, fill, line) {
    const c = Math.max(2, Math.round(r * 0.42));       // corner cut
    for (let y = -r; y <= r; y++) {
      const ay = Math.abs(y);
      let half = r;
      if (ay > r - c) half = r - (ay - (r - c));
      if (fill) KD.Screen.rect(cx - half, cy + y, half * 2 + 1, 1, fill);
      if (line) {
        KD.Screen.rect(cx - half, cy + y, 1, 1, line);
        KD.Screen.rect(cx + half, cy + y, 1, 1, line);
      }
    }
    if (line) { KD.Screen.rect(cx - (r - c), cy - r, (r - c) * 2 + 1, 1, line);
                KD.Screen.rect(cx - (r - c), cy + r, (r - c) * 2 + 1, 1, line); }
  }

  /* The touch cluster. Big, stepped-octagonal, icon-first, and it fades out
     while you are not touching it so it never covers the game. */
  /* o.noStick: for scenes with no movement in them. The MOVE hint sitting in
     the corner of a dinner table is a control that does nothing. */
  function touchPad(defs, o) {
    if (!KD.touch) return;
    const pad = KD.In.padState();
    if (o && o.noStick) { /* buttons only */ }
    else if (pad.on) {
      octo(Math.round(pad.cx), Math.round(pad.cy), 20, null, 'BONE.0');
      octo(Math.round(pad.cx + pad.dx * 13), Math.round(pad.cy + pad.dy * 13), 7, 'BONE.2', 'INK.0');
    } else {
      /* a hint of where the stick lives, so a new player finds it */
      octo(30, KD.H - 40, 20, null, 'INK.3');
      KD.Text.draw('MOVE', 30, KD.H - 43, 'INK.3', { tiny: true, align: 'center' });
    }
    for (const b of defs) {
      const held = KD.In.act(b.name);
      const face = held ? (b.big ? 'GOLD.2' : 'DEEP.3') : (b.big ? 'DEEP.2' : 'INK.1');
      octo(b.x, b.y, b.r, face, held ? 'GOLD.3' : 'INK.0');
      /* a lit top edge, so even a flat octagon has a direction of light */
      if (!held) KD.Screen.rect(b.x - (b.r - Math.round(b.r * 0.42)), b.y - b.r + 1,
                                (b.r - Math.round(b.r * 0.42)) * 2 + 1, 1, b.big ? 'WATER.2' : 'INK.3');
      const icon = b.icon && KD.PX.has(b.icon) ? b.icon : null;
      if (icon && b.r >= 14) {
        KD.PX.blit(KD.Screen.ctx(), icon, b.x - 4, b.y - 7, { anchor: false });
        KD.Text.draw(b.label, b.x, b.y + 3, held ? 'INK.0' : 'BONE.2', { tiny: true, align: 'center' });
      } else if (icon) {
        KD.PX.blit(KD.Screen.ctx(), icon, b.x - 4, b.y - 4, { anchor: false });
      } else {
        KD.Text.draw(b.label, b.x, b.y - 3, held ? 'INK.0' : 'BONE.2', { tiny: true, align: 'center' });
      }
    }
  }
  /* ---- the quest scroll ---------------------------------------------
     Both the castle and the village need to say what you are supposed to be
     doing, and a bare line of text at the top of the screen reads as a debug
     label. This is a hanging piece of parchment: two rods, a curled top and
     bottom edge, a wax seal, and the objective written on it. It sways, so
     the eye finds it.
     ------------------------------------------------------------------ */
  function scroll(x, y, text, o) {
    o = o || {};
    const R = KD.Screen.rect;
    const t = KD.Game ? KD.Game.t : 0;
    const tiny = o.tiny !== false;
    const maxW = o.w || Math.min(150, KD.W - 24);
    const lines = KD.Text.wrap(text, maxW - 16, { tiny: tiny });
    const n = Math.min(o.maxLines || 3, lines.length);
    let tw = 0;
    for (let i = 0; i < n; i++) tw = Math.max(tw, KD.Text.width(lines[i], { tiny: tiny }));
    const w = Math.max(64, Math.min(maxW, tw + 18));
    const lh = KD.Text.H(tiny) + 3;
    const h = n * lh + 16;
    /* it hangs, so it swings a little */
    const sway = Math.round(Math.sin(t * 1.1 + x * 0.05) * 1.2);
    x = Math.round(x) + sway; y = Math.round(y);

    /* the two cords it hangs from */
    R(x + 4, y - 5, 1, 5, 'WOOD.0');
    R(x + w - 5, y - 5, 1, 5, 'WOOD.0');
    /* the top rod, with knobs */
    R(x - 3, y, w + 6, 4, 'WOOD.1');
    R(x - 3, y, w + 6, 1, 'WOOD.3');
    R(x - 5, y, 3, 4, 'WOOD.2');
    R(x + w + 2, y, 3, 4, 'WOOD.2');
    /* the parchment: SAND, with a darker edge either side so it curls */
    R(x, y + 4, w, h, 'SAND.2');
    R(x, y + 4, w, 1, 'SAND.1');
    R(x, y + 4, 2, h, 'SAND.1');
    R(x + w - 2, y + 4, 2, h, 'SAND.1');
    R(x + 2, y + 5, w - 4, 1, 'SAND.3');
    /* a couple of foxed patches, so it is not a flat card */
    R(x + 6, y + h - 4, 9, 2, 'SAND.1');
    R(x + w - 18, y + 8, 7, 2, 'SAND.1');
    /* the bottom rod */
    R(x - 3, y + h + 4, w + 6, 4, 'WOOD.1');
    R(x - 3, y + h + 4, w + 6, 1, 'WOOD.2');
    R(x - 5, y + h + 4, 3, 4, 'WOOD.2');
    R(x + w + 2, y + h + 4, 3, 4, 'WOOD.2');
    /* A brass tag on the left of the bottom rod saying what KIND of thing
       this is - talk to someone, hit something, go somewhere. The line of
       text says where; the glyph says what, at a glance, without reading. */
    if (o.kind && KD.Mark) {
      const tx = x + 6, ty = y + h + 1;
      R(tx - 1, y + h + 4, 2, 3, 'GOLD.0');            /* the ring */
      R(tx - 2, ty + 1, 11, 10, 'INK.0');
      R(tx - 1, ty + 2, 9, 8, 'GOLD.1');
      R(tx - 1, ty + 2, 9, 1, 'GOLD.3');
      R(tx - 1, ty + 9, 9, 1, 'GOLD.0');
      KD.Mark.glyph(tx + 1, ty + 3, o.kind, 'INK.0');
    }
    /* a wax seal on the bottom rod, because a scroll has one */
    const sx = x + w - 14;
    R(sx, y + h + 2, 8, 7, 'BLOOD.1');
    R(sx + 1, y + h + 3, 6, 5, 'BLOOD.2');
    R(sx + 2, y + h + 4, 4, 1, 'BLOOD.0');
    R(sx + 3, y + h + 5, 2, 2, 'BLOOD.0');
    /* and the words, in ink on parchment */
    for (let i = 0; i < n; i++) {
      KD.Text.draw(lines[i], x + 8, y + 10 + i * lh, 'INK.1', { tiny: tiny });
    }
    return { x: x, y: y, w: w, h: h + 8 };
  }

  return { panel, titled, button, slot, bar, bevel, octo, inside, tooltips, touchPad, scroll,
           guard, blocked, tickGuard, hasKit, kit };
})();
