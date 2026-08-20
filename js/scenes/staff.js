/* ============================================================
   staff.js - hire, promote and (regrettably) fire staff.
   ============================================================ */
DZ.Scenes.staff = (function () {
  const U = DZ.Util, Px = DZ.Pixel, T = DZ.Text, PAL = DZ.PAL;
  let t = 0;

  function enter() { t = 0; refreshCandidates(); }
  function update(dt) { t += dt; DZ.Water.tick(dt); }

  function refreshCandidates() {
    const S = DZ.State.S;
    if (S.candidateDay === S.day && S.candidates && S.candidates.length) return;
    S.candidateDay = S.day;
    const roles = U.shuffle(DZ.Upgrades.ROLES).slice(0, 3);
    S.candidates = roles.map((r) => ({
      id: U.uid(), role: r.id, name: DZ.Names.randStaff(), lvl: U.rndInt(0, Math.min(2, Math.floor(S.day / 4))),
      quirk: U.pick(['smells of kelp', 'brings own bucket', 'afraid of crabs', 'talks to the fish',
                     'has a suspicious tan', 'claims to be a dolphin', 'very normal', 'once fought Gary'])
    }));
  }

  function draw(ctx) {
    const S = DZ.State.S;
    Px.vgrad(ctx, 0, 0, DZ.W, DZ.H, '#123a52', '#04121f', 10);
    DZ.Water.marineSnow(ctx, 0, 0, 1 / 60);
    Px.draw(ctx, 'bunk', 4, 24, { scale: 2 });
    DZ.Game.topbar(ctx, { title: 'BUNKHOUSE' });
    const cap = DZ.State.staffCap();
    T.draw(ctx, 'SLOTS ' + S.staff.length + '/' + cap + '   daily wages ' +
      U.fmt(S.staff.reduce((a, s) => a + s.wage, 0)) + 'c', 6, 18, PAL.gold, { size: 7 });

    // ---- current staff ----
    const x = 4, y = 28, w = 190, h = 192;
    Px.rect(ctx, x, y, w, h, '#04121d');
    Px.frame(ctx, x, y, w, h, '#123246');
    T.draw(ctx, 'ON THE PAYROLL', x + 4, y + 3, PAL.cyan, { size: 7, bold: true });
    if (!S.staff.length) {
      T.draw(ctx, 'Nobody works here.', x + w / 2, y + 60, PAL.dim, { align: 'center', size: 8 });
      T.draw(ctx, 'It shows.', x + w / 2, y + 72, PAL.dim2, { align: 'center', size: 7 });
    }
    S.staff.forEach((st, i) => {
      const R = DZ.Upgrades.roleById[st.role];
      const ry = y + 14 + i * 36;
      if (ry + 34 > y + h) return;
      Px.rect(ctx, x + 3, ry, w - 6, 34, i % 2 ? '#072335' : '#08283c');
      Px.draw(ctx, R.icon, x + 6, ry + 4, { scale: 2 });
      T.draw(ctx, st.name, x + 28, ry + 2, PAL.text, { size: 8, bold: true });
      T.draw(ctx, R.title + ' Lv' + (st.lvl + 1) + '  -  ' + R.detail(st.lvl), x + 28, ry + 11, PAL.kelp, { size: 7 });
      T.draw(ctx, 'wage ' + st.wage + 'c/day  "' + st.quirk + '"', x + 28, ry + 20, PAL.dim, { size: 7 });
      const upCost = Math.round(R.cost * 0.8 * (st.lvl + 1));
      if (DZ.UI.button(ctx, x + w - 84, ry + 4, 40, 12, 'PROMOTE', { tone: S.clams >= upCost ? 'green' : 'dark',
          size: 7, disabled: S.clams < upCost || st.lvl >= 3, id: 'pr' + i,
          tip: 'Level up: ' + R.detail(st.lvl + 1) + ' - costs ' + upCost + 'c, wage +' + Math.round(R.wage * 0.5) })) {
        if (DZ.State.spend(upCost)) {
          st.lvl++; st.wage += Math.round(R.wage * 0.5);
          DZ.Audio.play('levelup'); DZ.State.toast(st.name + ' promoted!', PAL.kelp); DZ.State.save();
        }
      }
      if (DZ.UI.button(ctx, x + w - 84, ry + 18, 40, 12, 'FIRE', { tone: 'red', size: 7, id: 'fi' + i,
          tip: 'They will be sad. And damp.' })) {
        S.staff.splice(i, 1);
        DZ.Audio.play('deny'); DZ.State.toast(st.name + ' has been let go.', PAL.coral); DZ.State.save();
      }
      T.draw(ctx, 'Lv' + (st.lvl + 1) + '/4', x + w - 22, ry + 12, PAL.dim, { size: 7, align: 'center' });
    });

    // ---- candidates ----
    const cx = 198, cw = DZ.W - 202;
    Px.rect(ctx, cx, y, cw, h, '#04121d');
    Px.frame(ctx, cx, y, cw, h, '#123246');
    T.draw(ctx, 'LOOKING FOR WORK (today)', cx + 4, y + 3, PAL.gold, { size: 7, bold: true });
    refreshCandidates();
    S.candidates.forEach((c, i) => {
      const R = DZ.Upgrades.roleById[c.role];
      const ry = y + 14 + i * 58;
      Px.rect(ctx, cx + 3, ry, cw - 6, 56, i % 2 ? '#072335' : '#08283c');
      Px.draw(ctx, R.icon, cx + 6, ry + 5, { scale: 2 });
      T.draw(ctx, c.name, cx + 28, ry + 3, PAL.text, { size: 8, bold: true });
      T.draw(ctx, R.title + ' Lv' + (c.lvl + 1), cx + 28, ry + 12, PAL.cyan, { size: 7 });
      T.draw(ctx, R.blurb, cx + 6, ry + 23, PAL.dim, { size: 7 });
      T.draw(ctx, 'DOES: ' + R.detail(c.lvl), cx + 6, ry + 32, PAL.kelp, { size: 7 });
      T.draw(ctx, '"' + c.quirk + '"', cx + 6, ry + 41, PAL.dim2, { size: 7 });
      const hireCost = Math.round(R.cost * (1 + c.lvl * 0.6));
      const wage = Math.round(R.wage * (1 + c.lvl * 0.5));
      const full = S.staff.length >= DZ.State.staffCap();
      const dupe = S.staff.some((s) => s.role === c.role);
      const can = S.clams >= hireCost && !full && !dupe;
      if (DZ.UI.button(ctx, cx + cw - 78, ry + 38, 72, 15,
          full ? 'NO SLOTS' : dupe ? 'ALREADY GOT ONE' : U.fmt(hireCost) + 'c HIRE',
          { tone: can ? 'gold' : 'dark', size: 7, disabled: !can, id: 'hi' + i, sub: wage + 'c/day' })) {
        if (DZ.State.spend(hireCost)) {
          S.staff.push({ id: c.id, role: c.role, name: c.name, lvl: c.lvl, wage, quirk: c.quirk });
          S.candidates = S.candidates.filter((o) => o.id !== c.id);
          DZ.Audio.play('cash');
          DZ.State.toast(c.name + ' joined the ranch!', PAL.kelp);
          DZ.State.event('staff', {});
          DZ.State.save();
        }
      }
    });
    T.draw(ctx, 'new faces show up every morning', cx + cw / 2, y + h - 10, PAL.dim2, { size: 7, align: 'center' });
  }

  return { enter, update, draw };
})();
