/* ============================================================
   scenes/chef.js - the octopus chef, and what he sells.

   He is the only shop in the game, and he is a person before he
   is a menu: eight arms, a paper hat, a cleaver in one arm and
   somebody's dinner in another. You stand in front of his cart
   and point at a fish; he says something about it and drops it
   in your basket.

   The interface is the cart. The fish are laid out on the board
   in front of him at the size they are in your hand, and the
   only text on screen is the price under each one and whatever
   he happens to be saying.
   ============================================================ */
KD.Scenes.chef = (function () {

  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);
  const F = KD.Feed;

  let t = 0, sel = 0, said = '', saidT = 0, pop = 0, popId = '';

  /* what he says when you buy, and when you cannot afford it. He is not
     a shopkeeper who thanks you. */
  const LINES = {
    loaf:    ['Bread. For an animal. Fine.', 'It is cheap because it is nothing.'],
    sardine: ['Everyone buys the sardines.', 'You and every other one of you.'],
    eel:     ['Good. That one works.', 'Oily. They hate it and they run better.'],
    squid:   ['My cousin. Take him.', 'You will not ask where he came from.'],
    snapper: ['That is a serious fish.', 'You have a card coming up, then.']
  };
  const BROKE = ['Come back with money.', 'No.', 'That is not enough and you knew that.'];

  function enter() {
    t = 0; sel = 0; said = 'Whatever it is, it is fresh.'; saidT = 3.4; pop = 0;
    KD.Pod.init(); KD.Day.init();
  }

  const GROUND = () => Math.round(KD.H * 0.80);
  const BOARD  = () => ({ x: 22, y: GROUND() - 44, w: KD.W - 44, h: 34 });
  /* the fish on the board and the chef behind it are drawn at twice the
     size they are authored, because he is the whole screen here */
  const CW = 98, CH = 108, IW = 24;

  /* one tile per food, laid along the board */
  function slots() {
    const b = BOARD(), n = F.FOOD.length;
    const pitch = Math.floor(b.w / n), tw = Math.min(38, pitch - 4);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ f: F.FOOD[i], i: i,
                 x: b.x + 2 + i * pitch + ((pitch - tw) >> 1),
                 y: b.y + 2, w: tw, h: b.h - 4 });
    }
    return out;
  }

  function buy(i) {
    const f = F.FOOD[i];
    if ((KD.State.S.clams || 0) < f.price) {
      said = BROKE[Math.floor(Math.random() * BROKE.length)]; saidT = 2.6;
      KD.Sfx.play('deny'); return;
    }
    KD.State.spend(f.price);
    F.give(f.id, 1);
    KD.State.save();
    const l = LINES[f.id] || ['Take it.'];
    said = l[Math.floor(Math.random() * l.length)]; saidT = 3.0;
    pop = 1; popId = f.id;
    KD.Sfx.play('pickup');
    KD.Juice.hit(0.06);
  }

  function update(dt) {
    t += dt;
    if (saidT > 0) saidT -= dt;
    if (pop > 0) pop = Math.max(0, pop - dt * 2.2);
    KD.State.tick(dt);
    KD.Fx.update(dt);
    if (KD.Coach.update(dt)) return;

    const S = slots();
    if (KD.In.isHit('ArrowRight', 'KeyD')) { sel = (sel + 1) % S.length; KD.Sfx.play('click'); }
    if (KD.In.isHit('ArrowLeft', 'KeyA')) { sel = (sel + S.length - 1) % S.length; KD.Sfx.play('click'); }
    if (KD.In.isHit('Space', 'Enter', 'KeyE')) buy(sel);
    if (KD.In.isHit('Escape') || KD.In.isHit('KeyQ')) { KD.Game.go('map', { from: 'cart' }); return; }

    const m = KD.In.mouse;
    /* the whole tile is the button, and hovering it also selects it, so
       a mouse never has to click twice to find out what a thing costs */
    for (const s of S) {
      if (KD.UI.inside(s.x, s.y - 12, s.w, s.h + 24)) {
        if (sel !== s.i) { sel = s.i; }
        if (m.click && !KD.UI.blocked()) { KD.In.consumedClick(); buy(s.i); }
      }
    }
    /* click anywhere off the cart to leave */
    if (m.click && !KD.UI.blocked() && m.y < BOARD().y - 46) {
      KD.In.consumedClick(); KD.Game.go('map', { from: 'cart' }); return;
    }
  }

  /* ---- drawing ---------------------------------------------------- */

  function back() {
    const g = GROUND();
    R(0, 0, KD.W, g, 'DEEP.0');
    R(0, Math.round(g * 0.3), KD.W, Math.round(g * 0.3), 'DEEP.1');
    R(0, Math.round(g * 0.6), KD.W, Math.round(g * 0.4), 'DEEP.2');
    /* a wall of quarry stone behind the cart, courses offset per row */
    for (let y = Math.round(g * 0.18); y < g; y += 7) {
      const off = ((y / 7) | 0) % 2 ? 9 : 0;
      for (let x = -18 + off; x < KD.W; x += 18) {
        R(x, y, 17, 6, ((x + y) % 5) ? 'STONE.0' : 'INK.2');
        R(x, y, 17, 1, 'STONE.1');
        R(x, y + 6, 17, 1, 'INK.1');
      }
    }
    R(0, g, KD.W, KD.H - g, 'SAND.1');
    R(0, g, KD.W, 2, 'SAND.2');
    for (let i = 0; i < 90; i++) {
      const x = (i * 37) % KD.W, y = g + 4 + ((i * 19) % Math.max(4, KD.H - g - 5));
      R(x, y, 1, 1, (i % 3) ? 'SAND.3' : 'SAND.0');
    }
  }

  function awning(ctx) {
    const b = BOARD();
    /* the canopy sits just over his hat, not up against the HUD, and the
       posts run from it down into the cart */
    const ay = Math.max(16, b.y - CH - 6);
    R(b.x + 2, ay + 10, 4, b.y - ay - 10, 'WOOD.1');
    R(b.x + 2, ay + 10, 1, b.y - ay - 10, 'WOOD.2');
    R(b.x + b.w - 6, ay + 10, 4, b.y - ay - 10, 'WOOD.1');
    R(b.x + b.w - 6, ay + 10, 1, b.y - ay - 10, 'WOOD.2');
    /* a scalloped stripe, and the shadow it throws on the wall */
    for (let x = b.x - 3; x < b.x + b.w + 3; x += 10) {
      const c = ((x / 10) | 0) % 2 ? 'BLOOD.2' : 'BONE.2';
      R(x, ay, 10, 10, c);
      R(x + 2, ay + 10, 6, 2, c);
      R(x + 4, ay + 12, 2, 1, c);
    }
    R(b.x - 3, ay - 2, b.w + 6, 2, 'WOOD.0');
    R(b.x - 3, ay + 13, b.w + 6, 3, 'INK.1');
    /* real fish on real hooks along the front rail */
    const HANG = ['it_fish2', 'it_fish1', 'it_fish3', 'it_fish1'];
    for (let i = 0; i < 4; i++) {
      const hx = b.x + 18 + i * Math.floor((b.w - 40) / 3);
      const sw = Math.round(Math.sin(t * 1.3 + i * 1.7) * 1);
      /* the hook and the line it hangs on */
      R(hx + 10, ay + 16, 2, 9, 'STONE.2');
      R(hx + 8, ay + 25, 6, 2, 'STONE.3');
      const spr = HANG[i];
      if (KD.PX.has(spr)) {
        KD.PX.blit(ctx, spr, hx + sw, ay + 26, { anchor: false, dw: 22, dh: 22 });
      }
    }
  }

  function chef(ctx) {
    const b = BOARD();
    const bob = Math.round(Math.sin(t * 1.6) * 2);
    const cw = CW;
    const cx = Math.round(KD.W / 2 - cw / 2);
    if (KD.PX.has('oc_chef')) {
      KD.PX.blit(ctx, 'oc_chef', cx, b.y - CH + 12 + bob,
                 { anchor: false, dw: CW, dh: CH });
    } else {
      R(cx, b.y - CH + 12 + bob, cw, CH, 'ROT.2');
    }
    /* what he is saying, in a bubble with a tail, over his shoulder */
    if (saidT > 0 && said) {
      const w = Math.min(KD.W - 24, KD.Text.width(said) + 14);
      const bx = Math.max(6, Math.min(KD.W - w - 6, cx + cw + 4 - (w >> 1)));
      const by = Math.max(14, b.y - CH - 4 + bob);
      const a = Math.min(1, saidT * 2.2);
      if (a > 0.05) {
        R(bx, by, w, 16, 'BONE.2');
        R(bx + 1, by - 1, w - 2, 1, 'BONE.2');
        R(bx + 1, by + 16, w - 2, 1, 'BONE.2');
        R(bx, by, w, 1, 'WHITE');
        KD.Text.draw(said, bx + (w >> 1), by + 5, 'INK.0',
                     { align: 'center', max: w - 10 });
        const tx = Math.max(bx + 4, Math.min(bx + w - 8, cx + cw - 10));
        R(tx, by + 17, 4, 2, 'BONE.2');
        R(tx + 1, by + 19, 2, 2, 'BONE.2');
      }
    }
  }

  function cart(ctx) {
    const b = BOARD();
    /* the board: planks, a lip at the front, legs down to the sand */
    R(b.x - 3, b.y - 3, b.w + 6, b.h + 8, 'WOOD.0');
    R(b.x - 2, b.y - 2, b.w + 4, b.h + 6, 'WOOD.1');
    for (let x = b.x - 2; x < b.x + b.w + 2; x += 11) R(x, b.y - 2, 1, b.h + 6, 'WOOD.0');
    R(b.x - 3, b.y + b.h + 4, b.w + 6, 2, 'WOOD.0');
    R(b.x + 6, b.y + b.h + 6, 4, GROUND() - b.y - b.h - 6, 'WOOD.0');
    R(b.x + b.w - 10, b.y + b.h + 6, 4, GROUND() - b.y - b.h - 6, 'WOOD.0');
    /* crushed ice under the fish */
    R(b.x, b.y, b.w, b.h, 'WATER.0');
    for (let i = 0; i < 70; i++) {
      const x = b.x + ((i * 29) % b.w), y = b.y + ((i * 13) % b.h);
      R(x, y, 1, 1, (i % 4) ? 'WATER.1' : 'WHITE');
    }

    for (const s of slots()) {
      const on = s.i === sel;
      const poke = (pop > 0 && popId === s.f.id) ? Math.round(pop * 4) : 0;
      const lift = (on ? 2 : 0) + poke;
      if (on) {
        R(s.x - 2, s.y - 2 - lift, s.w + 4, s.h + 4, 'GOLD.0');
        KD.Screen.frame(s.x - 2, s.y - 2 - lift, s.w + 4, s.h + 4, 'GOLD.3');
      }
      if (KD.PX.has(s.f.spr)) {
        KD.PX.blit(ctx, s.f.spr, s.x + ((s.w - IW) >> 1), s.y + 2 - lift,
                   { anchor: false, dw: IW, dh: IW });
      } else {
        R(s.x + 3, s.y + 3 - lift, s.w - 6, s.h - 8, 'CORAL.1');
      }
      /* the price is the label. Nothing else is written on the cart. */
      const afford = (KD.State.S.clams || 0) >= s.f.price;
      KD.Text.draw(s.f.price + '', s.x + (s.w >> 1), s.y + s.h - 7,
                   afford ? 'GOLD.3' : 'BLOOD.3', { align: 'center', tiny: true });
    }
  }

  /* the selected fish, named and explained, on the rail below the cart -
     one line, in the place a price tag would be */
  function tag() {
    const s = F.FOOD[sel]; if (!s) return;
    const y = GROUND() + 3;
    if (y + 16 > KD.H) return;
    KD.Text.draw(s.name.toUpperCase() + '   +' + s.fed + ' FED' +
                 (s.sta ? '   +' + s.sta + ' WIND' : ''),
                 6, y, 'BONE.2', { tiny: true });
    KD.Text.draw(s.note, 6, y + 7, 'STONE.3', { tiny: true, max: KD.W - 12 });
  }

  function slate() {
    R(0, 0, KD.W, 11, 'INK.0');
    R(0, 11, KD.W, 1, 'INK.1');
    KD.Text.draw((KD.State.S.clams || 0) + ' CLAMS', 4, 2, 'GOLD.2', { tiny: true });
    KD.Text.draw('BASKET ' + F.total(), KD.W - 4, 2, 'BONE.1',
                 { tiny: true, align: 'right' });
  }

  function draw() {
    const ctx = KD.Screen.ctx();
    back(); awning(ctx); chef(ctx); cart(ctx); tag(); slate();
    KD.Fx.draw();
    KD.Coach.draw();
    if (KD.touch) KD.UI.touchPad([{ key: 'Space', label: 'BUY' },
                                  { key: 'Escape', label: 'BACK' }], { noStick: true });
  }

  return { enter, update, draw, _buy: buy, _slots: slots };
})();
