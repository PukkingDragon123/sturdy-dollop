/* ============================================================
   ui/hud.js - hearts, breath, the hotbar, XP and the message
   line. Sits over the world, never in the middle of it.
   ============================================================ */
KD.Hud = (function () {
  function hearts(S) {
    const P = KD.Player.P;
    for (let i = 0; i < P.hpMax; i++) {
      const x = 3 + i * 9, y = 3;
      const full = P.hp >= i + 1, half = !full && P.hp > i;
      const n = full ? 'ic_heart_full' : (half ? 'ic_heart_half' : 'ic_heart_empty');
      if (KD.PX.has(n)) KD.PX.blit(KD.Screen.ctx(), n, x, y, { anchor: false });
      else {
        KD.Screen.rect(x, y, 7, 7, full ? 'BLOOD.2' : (half ? 'BLOOD.1' : 'INK.1'));
        KD.Screen.frame(x, y, 7, 7, 'INK.0');
      }
    }
  }
  function stamina(S) {
    const P = KD.Player.P;
    if (P.stam >= 0.999) return;
    const n = Math.ceil(P.stam * 8);
    for (let i = 0; i < 8; i++) {
      const x = 3 + i * 9, y = 12;
      if (i < n) {
        if (KD.PX.has('ic_bubble')) KD.PX.blit(KD.Screen.ctx(), 'ic_bubble', x, y, { anchor: false });
        else { KD.Screen.rect(x + 1, y + 1, 5, 5, 'WATER.2'); KD.Screen.frame(x + 1, y + 1, 5, 5, 'INK.0'); }
      } else {
        KD.Screen.frame(x + 1, y + 1, 5, 5, 'INK.2');
      }
    }
    KD.Text.draw('PUFF', 3 + 8 * 9 + 2, 13, 'WATER.1', { tiny: true });
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
      KD.Text.draw(KD.State.nameOf(held), KD.W / 2, y - 8, 'BONE.2', { align: 'center', shadow: 'INK.0' });
    }
  }
  function stats(S) {
    const x = KD.W - 3;
    /* clams, level, xp */
    KD.Text.draw(S.S.clams + 'c', x, 3, 'GOLD.3', { align: 'right', shadow: 'INK.0' });
    KD.Text.draw('LV ' + S.S.level, x, 12, 'BONE.2', { align: 'right', shadow: 'INK.0' });
    const need = KD.State.xpFor(S.S.level);
    KD.UI.bar(x - 46, 21, 46, 4, S.S.xp / need, 'GOLD.2');
    if (S.S.points > 0) {
      const blink = ((KD.Game.t * 2) | 0) % 2 === 0;
      KD.Text.draw(S.S.points + ' PT', x, 27, blink ? 'GOLD.3' : 'GOLD.1', { align: 'right', shadow: 'INK.0' });
    }
    /* fat and beer */
    KD.UI.bar(3, 21, 40, 4, S.S.fat / 100, 'SAND.2');
    KD.Text.draw('FAT', 45, 20, 'SAND.1', { tiny: true });
    if (S.S.beer) {
      KD.UI.bar(3, 27, 40, 4, S.S.beer.t / S.S.beer.max, 'GOLD.2');
      KD.Text.draw('+' + Math.round(S.S.beer.dmg * 100) + '%', 45, 26, 'GOLD.2', { tiny: true });
    }
    /* Fragments, tucked under the fat bar on the LEFT. They used to sit
       top-centre, which is exactly where a boss fight puts the King's name
       and health, so his title read as "THE KING[][][]E ATLANTIC". */
    for (let i = 0; i < 5; i++) {
      const fx = 3 + i * 9;
      const fy = S.S.beer ? 33 : 27;
      const got = S.S.frags.length > i;
      if (KD.PX.has('ic_crown')) {
        KD.PX.blit(KD.Screen.ctx(), 'ic_crown', fx, fy, { anchor: false });
        if (!got) KD.Dither.fill(KD.Screen.ctx(), fx, fy, 8, 8, 'INK.0', 0.75);
      } else {
        KD.Screen.rect(fx, fy + 1, 7, 5, got ? 'GOLD.3' : 'INK.2');
        KD.Screen.frame(fx, fy + 1, 7, 5, 'INK.0');
      }
    }
    /* The one line telling you what you are supposed to be doing. Without
       it a 2600-tile world is just a big cave with fish in it. */
    const task = KD.Quests && KD.Quests.current();
    if (task) {
      /* On a touch layout the right edge belongs to the tab column, so the
         task line goes under the fragments instead of behind the buttons. */
      const col = task.startsWith('READY') ? 'KELP.2' : 'BONE.1';
      if (KD.touch) KD.Text.draw(task, 3, 38, col, { tiny: true, shadow: 'INK.0', max: KD.W - 90 });
      else KD.Text.draw(task, KD.W - 6, 38, col, { tiny: true, align: 'right', shadow: 'INK.0', max: Math.min(230, KD.W - 130) });
    }
    /* depth read-out, so the layers are legible as progress */
    const d = (KD.Player.P.y / 8) | 0;
    const L = KD.Gen.layerAt(d);
    KD.Text.draw(L.id.toUpperCase() + '  ' + d + 'm', KD.W / 2, KD.H - 27, 'BONE.0', { tiny: true, align: 'center', shadow: 'INK.0' });
  }
  function message(S) {
    if (S.S.msgT <= 0 || !S.S.msg) return;
    const w = KD.Text.width(S.S.msg) + 8;
    const x = ((KD.W - w) >> 1), y = 40;
    KD.Screen.rect(x, y, w, 11, 'INK.0');
    KD.Screen.frame(x, y, w, 11, 'INK.2');
    KD.Text.draw(S.S.msg, KD.W / 2, y + 2, S.S.msgCol, { align: 'center' });
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
    reticle(cam);
    hearts(S); stamina(S); stats(S); hotbar(S); message(S);
  }
  return { draw };
})();
