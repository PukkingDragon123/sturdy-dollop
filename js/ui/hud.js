/* ============================================================
   ui/hud.js - hearts, breath, the hotbar, XP and the message
   line. Sits over the world, never in the middle of it.
   ============================================================ */
KD.Hud = (function () {
  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);

  /* ================================================================
     THE INTERFACE, cut down.

     There used to be twelve things on screen at once: hearts, a stamina
     row, a fat bar, a beer bar, five crown pips, a clam count, a level,
     an XP bar, a depth gauge, a quest scroll, a message box, a hotbar
     and a tooltip that landed on top of the hotbar. Every one of them
     was defensible on its own and together they were wallpaper - and
     the one thing a player actually needs, "what is today for", was a
     grey line in the corner competing with eleven other grey lines.

     Four groups now, one per corner, and nothing in the middle:

       TOP LEFT     what you are made of - hearts and energy.
       TOP RIGHT    what today is - the day, the season, the clock, and
                    your clams.
       BOTTOM       the hotbar, and nothing else.
       ONE LINE     under the top-left group: what you are doing.

     Everything else moved into a panel you open on purpose.
     ================================================================ */

  function vitals(S) {
    const P = KD.Player.P;
    /* hearts */
    for (let i = 0; i < P.hpMax; i++) {
      const x = 4 + i * 9, y = 4;
      const full = P.hp >= i + 1, half = !full && P.hp > i;
      const n = full ? 'ic_heart_full' : (half ? 'ic_heart_half' : 'ic_heart_empty');
      if (KD.PX.has(n)) KD.PX.blit(KD.Screen.ctx(), n, x, y, { anchor: false });
      else {
        R(x, y, 7, 7, full ? 'BLOOD.2' : (half ? 'BLOOD.1' : 'INK.1'));
        KD.Screen.frame(x, y, 7, 7, 'INK.0');
      }
    }
    /* ENERGY. The number that decides how long today is, so it gets a real
       bar with a lip and a label rather than eight little bubbles. */
    const e = KD.Day.energy(), em = KD.Day.energyMax();
    const bw = 74, bx = 4, by = 15;
    R(bx - 1, by - 1, bw + 2, 9, 'INK.0');
    R(bx, by, bw, 7, 'DEEP.0');
    const f = Math.max(0, Math.min(1, e / em));
    const col = f > 0.5 ? 'KELP.2' : (f > 0.22 ? 'GOLD.2' : 'BLOOD.2');
    R(bx, by, Math.round(bw * f), 7, col);
    R(bx, by, Math.round(bw * f), 1, KD.PAL.shift(col, 1));
    KD.Screen.frame(bx - 1, by - 1, bw + 2, 9, 'INK.2');
    KD.Text.draw('ENERGY', bx + 3, by + 1, f > 0.22 ? 'INK.0' : 'BONE.2', { tiny: true });
    KD.Text.draw(Math.round(e) + '', bx + bw - 3, by + 1, 'BONE.2',
                 { tiny: true, align: 'right' });
    /* breath, only while it is running out */
    if (P.stam < 0.999) {
      const sw = Math.round(bw * Math.max(0, P.stam));
      R(bx - 1, by + 9, bw + 2, 5, 'INK.0');
      R(bx, by + 10, sw, 3, 'WATER.2');
      KD.Text.draw('AIR', bx + bw + 5, by + 9, 'WATER.1', { tiny: true });
    }
  }

  /* ---- the day, the clock and the money, top right ------------------ */
  function today(S) {
    const x = KD.W - 4;
    const dayLab = 'DAY ' + KD.Day.day();
    const timeLab = KD.Day.hhmm();
    const seaLab = KD.Day.season().toUpperCase() + ' ' + KD.Day.dayOfSeason();
    /* Three rows, not two. The season used to be printed on the same line
       as the day and the two of them overlapped in the middle. */
    const w = Math.max(KD.Text.width(dayLab), KD.Text.width(timeLab),
                       KD.Text.width(seaLab, { tiny: true })) + 16;
    R(x - w, 3, w, 36, 'INK.0');
    KD.Screen.frame(x - w, 3, w, 36, 'INK.2');
    R(x - w + 1, 4, w - 2, 1, 'DEEP.2');
    KD.Text.draw(dayLab, x - 6, 6, 'BONE.2', { align: 'right', shadow: 'INK.0' });
    KD.Text.draw(seaLab, x - 6, 16, 'INK.3', { tiny: true, align: 'right' });
    /* the clock, with a bar under it that fills as the day burns down */
    KD.Text.draw(timeLab, x - 6, 23, KD.Day.late() ? 'BLOOD.3' : 'WATER.3',
                 { align: 'right', shadow: 'INK.0' });
    const tw = w - 12;
    R(x - w + 6, 33, tw, 3, 'DEEP.0');
    R(x - w + 6, 33, Math.round(tw * KD.Day.through()), 3,
      KD.Day.late() ? 'BLOOD.2' : 'GOLD.2');
    /* clams, on their own plate under it */
    const cl = S.S.clams + 'c';
    const cw = KD.Text.width(cl) + 12;
    R(x - cw, 42, cw, 13, 'INK.0');
    KD.Screen.frame(x - cw, 42, cw, 13, 'GOLD.0');
    KD.Text.draw(cl, x - 6, 45, 'GOLD.3', { align: 'right', shadow: 'INK.0' });
  }

  /* ---- ONE line saying what you are doing ---------------------------
     Not a scroll, not a panel, not a box in the middle of the frame. A
     tab under the vitals with the current objective on it, in the colour
     of the thing it wants from you. */
  function objective(S) {
    const task = KD.Quests && KD.Quests.current();
    if (!task) return;
    const y = KD.Player.P.stam < 0.999 ? 30 : 26;
    const max = Math.min(190, KD.W - 120);
    const line = KD.Text.fit(task, max - 16, { tiny: true });
    const w = KD.Text.width(line, { tiny: true }) + 18;
    R(4, y, w, 12, 'INK.0');
    KD.Screen.frame(4, y, w, 12, 'GOLD.0');
    R(5, y + 1, w - 2, 1, 'GOLD.1');
    /* a brass tag saying what KIND of thing it is */
    const kind = KD.Quests.currentMark ? KD.Quests.currentMark() : 'go';
    if (KD.Mark && KD.Mark.glyph) KD.Mark.glyph(7, y + 3, kind, 'GOLD.3', 1);
    KD.Text.draw(line, 16, y + 3, 'BONE.2', { tiny: true });
  }

  function hotbar(S) {
    const n = KD.State.HOT;
    const w = n * 17 - 1;
    const x0 = ((KD.W - w) >> 1), y = KD.H - 19;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 17;
      const r = KD.UI.slot(x, y, S.S.inv[i], { sel: S.S.hot === i });
      if (r === 'left') S.S.hot = i;
      KD.Text.draw(String((i + 1) % 10), x + 1, y - 6, S.S.hot === i ? 'GOLD.3' : 'INK.3', { tiny: true });
    }
    const held = S.S.inv[S.S.hot];
    if (held) {
      KD.Text.draw(KD.State.nameOf(held), KD.W / 2, y - 8, 'BONE.2',
                   { align: 'center', shadow: 'INK.0' });
    }
  }

  /* ---- where you are, once, when it changes -------------------------- */
  let zoneWas = '', zoneT = 0;
  function place(S) {
    const z = KD.Zones.atPx(KD.Player.P.x);
    if (z.id !== zoneWas) { zoneWas = z.id; zoneT = 2.6; }
    if (zoneT > 0) zoneT -= 1 / 60;
    if (zoneT <= 0) return;
    const k = Math.min(1, zoneT / 0.4);
    const lab = z.name.toUpperCase();
    const w = KD.Text.width(lab) + 20;
    const x = Math.round((KD.W - w) / 2), y = 30;
    R(x, y, w, 15, 'INK.0');
    KD.Screen.frame(x, y, w, 15, 'GOLD.0');
    R(x + 1, y + 1, w - 2, 1, 'GOLD.1');
    KD.Text.draw(lab, KD.W / 2, y + 4, k > 0.5 ? 'GOLD.3' : 'GOLD.1',
                 { align: 'center', shadow: 'INK.0' });
    KD.Text.draw(((KD.Player.P.y / 8) | 0) + 'm', KD.W / 2, y + 17, 'INK.3',
                 { tiny: true, align: 'center', shadow: 'INK.0' });
  }

  /* ---- the depth gauge ----------------------------------------------
     The ocean is nine hundred tiles deep and going down it is the whole
     game, and until now the only thing telling you how far you had got was
     a number in the corner - and the crush depth, which is the thing that
     kills you, was not shown at all. You simply started taking damage.

     A column down the right edge: the whole ocean top to bottom, the layer
     bands in their own water colours, your bead on it, and a hard red line
     at the depth your gear can survive. Going deeper is the loop, so the
     loop gets a dial.
     ------------------------------------------------------------------ */
  function gauge(S, depth) {
    const D = KD.Zones.D;
    const R = KD.Screen.rect;
    /* Down the right edge, but BELOW the day plate - the two used to
       overlap and the clock was printed across the top of the column. */
    const h = Math.min(120, KD.H - 116);
    const x = KD.W - 13, y = 60;
    const at = (tile) => y + Math.round(h * Math.max(0, Math.min(1, tile / D.floor)));
    /* the water column, in the same colours the water actually is */
    const BAND = [[0, 'WATER.3'], [D.sea, 'WATER.2'], [D.shallows, 'WATER.1'],
                  [D.reef, 'WATER.0'], [D.ruins, 'DEEP.1'], [D.trench, 'DEEP.0'],
                  [D.abyss, 'ROT.0']];
    R(x - 2, y - 2, 10, h + 4, 'INK.0');
    for (let i = 0; i < BAND.length; i++) {
      const a = at(BAND[i][0]);
      const b = i + 1 < BAND.length ? at(BAND[i + 1][0]) : y + h;
      R(x, a, 6, Math.max(1, b - a), BAND[i][1]);
    }
    KD.Screen.frame(x - 2, y - 2, 10, h + 4, 'INK.2');
    /* the crush line: how deep this gear will let you go */
    const crush = KD.Player.P.crushAt;
    if (crush !== undefined && crush < D.floor) {
      const cy = at(crush);
      R(x - 4, cy, 14, 1, 'BLOOD.3');
      R(x - 4, cy + 1, 14, 1, 'BLOOD.0');
    }
    /* and you */
    const py = at(depth);
    R(x - 4, py - 1, 14, 3, 'INK.0');
    R(x - 3, py, 12, 1, 'GOLD.3');
    R(x - 5, py - 2, 3, 5, 'GOLD.3');
    R(x + 8, py - 2, 3, 5, 'GOLD.3');
    /* the warning, once you are inside twenty tiles of the crush */
    if (crush !== undefined && depth > crush - 20) {
      const over = depth > crush;
      const lab = over ? 'PRESSURE' : 'DEEP';
      if (over || Math.sin(KD.Game.t * 5) > 0) {
        const lw = KD.Text.width(lab, { tiny: true }) + 8;
        R(x - lw - 6, py - 5, lw, 11, 'INK.0');
        KD.Screen.frame(x - lw - 6, py - 5, lw, 11, over ? 'BLOOD.3' : 'GOLD.2');
        KD.Text.draw(lab, x - 6 - (lw >> 1), py - 3, over ? 'BLOOD.3' : 'GOLD.3',
                     { tiny: true, align: 'center' });
      }
    }
  }
  /* One unwrapped line, centred on KD.W. The quest gates say things like
     "get under 82kg (you are 99) and train to 3 levels (you have 0)" and on
     any frame narrower than that the sentence simply ran off both edges. */
  function message(S) {
    if (S.S.msgT <= 0 || !S.S.msg) return;
    const max = Math.min(300, KD.W - 24);
    const lines = KD.Text.wrap(S.S.msg, max, {});
    let w = 0;
    for (const l of lines) w = Math.max(w, KD.Text.width(l));
    w = Math.min(max + 10, w + 10);
    const h = 5 + lines.length * 11;
    const x = ((KD.W - w) >> 1), y = 40;
    KD.Screen.rect(x, y, w, h, 'INK.0');
    KD.Screen.frame(x, y, w, h, 'INK.2');
    lines.forEach((l, i) => {
      KD.Text.draw(l, KD.W / 2, y + 2 + i * 11, S.S.msgCol, { align: 'center' });
    });
  }
  /* the mining / placing reticle */
  function reticle(cam) {
    const P = KD.Player.P;
    if (P.tgx === undefined) return;
    const x = P.tgx * 8 - cam.x, y = P.tgy * 8 - cam.y;
    const solid = KD.World.at(P.tgx, P.tgy) !== KD.Tiles.AIR;
    const n = solid ? 'cur_dig' : 'cur_place';
    if (KD.PX.has(n)) KD.PX.blit(KD.Screen.ctx(), n, x, y, { anchor: false });
    else {
      const c = solid ? 'GOLD.3' : 'BONE.1';
      KD.Screen.rect(x, y, 2, 1, c); KD.Screen.rect(x, y, 1, 2, c);
      KD.Screen.rect(x + 6, y, 2, 1, c); KD.Screen.rect(x + 7, y, 1, 2, c);
      KD.Screen.rect(x, y + 7, 2, 1, c); KD.Screen.rect(x, y + 6, 1, 2, c);
      KD.Screen.rect(x + 6, y + 7, 2, 1, c); KD.Screen.rect(x + 7, y + 6, 1, 2, c);
    }
  }
  function draw(S, cam) {
    vitals(S);
    today(S);
    objective(S);
    place(S);
    hotbar(S);
    message(S);
    gauge(S, (KD.Player.P.y / 8) | 0);
  }
  return { draw, reticle };
})();
