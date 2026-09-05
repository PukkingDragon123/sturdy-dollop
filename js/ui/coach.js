/* ============================================================
   ui/coach.js - the guide, which points instead of lecturing.

   HOW TO PLAY was three screens of paragraphs on the title
   menu, which is where guidance goes to be skipped. Nobody
   reads a manual for a game about hitting a bar in the middle.

   So the guide is not a screen. It is one short line at a
   time, fired the FIRST time you reach the situation it is
   about, with an arrow pointing at the actual thing on screen.
   It never fires twice - what you have seen lives in the save -
   and any key puts it away.

   The rule for writing one: name the thing, say what to do, and
   stop. If a tip needs two sentences it is two tips, and if it
   needs three it is probably not a tip.
   ============================================================ */
KD.Coach = (function () {
  /* every tip: an id, the words, and where to point.
     `at` is a function returning {x, y} in buffer space, or null for a
     tip that is not about anywhere in particular. */
  const TIPS = {
    pens_hero: { text: 'This one fights. Pick a pen to change it.',
                 at: () => ({ x: KD.W / 2, y: 84 }) },
    pens_keys: { text: 'Q takes you down to the card.',
                 at: () => ({ x: KD.W / 2, y: 136 }) },
    pens_tree: { text: 'It levelled. T spends the point.',
                 at: () => ({ x: KD.W / 2, y: 136 }) },
    pens_swim: { text: 'Bond unlocks moves. R gets in the water.',
                 at: () => ({ x: KD.W / 2, y: 136 }) },

    fight_ring: { text: 'They telegraph. This ring says what beats it.',
                  at: () => ({ x: 34, y: Math.round(KD.H * 0.5) + 8 }) },
    fight_pick: { text: 'Answer it. A gold ring means that move counters.',
                  at: () => ({ x: KD.W / 2, y: KD.H - 40 }) },
    fight_bar:  { text: 'Stop it in the green.',
                  at: () => ({ x: KD.W / 2, y: KD.H - 60 }) },
    fight_combo: { text: 'Clean hit. Go again at half the breath.',
                   at: () => ({ x: KD.W / 2, y: KD.H - 40 }) },
    fight_air:  { text: 'Low breath. HOLD gets some back.',
                  at: () => ({ x: 60, y: 30 }) },

    tree_open:  { text: 'Buy the wire above it first.',
                  at: () => ({ x: KD.W / 2, y: 120 }) },
    swim_top:   { text: 'Press at the TOP of the arc.',
                  at: () => ({ x: KD.W / 2, y: 110 }) },
    drill_go:   { text: 'Match the beat. Better rhythm, better gain.',
                  at: () => ({ x: KD.W / 2, y: KD.H - 70 }) }
  };

  let live = null, t = 0, life = 0, arrow = null;

  const seenBag = () => {
    const S = KD.State && KD.State.S;
    if (!S) return {};
    return S.coach || (S.coach = {});
  };
  const seen = (id) => !!seenBag()[id];
  function forget() { const S = KD.State && KD.State.S; if (S) S.coach = {}; }

  /* fire a tip once, ever. Returns true if it actually showed. */
  function tip(id) {
    if (!TIPS[id] || seen(id) || live) return false;
    seenBag()[id] = 1;
    live = TIPS[id]; t = 0; life = 4.6;
    arrow = live.at ? live.at() : null;
    KD.Sfx.play('open');
    if (KD.State.save) KD.State.save();
    return true;
  }
  const active = () => !!live;
  const clear = () => { live = null; };

  function update(dt) {
    if (!live) return false;
    t += dt;
    life -= dt;
    /* any commit key puts it away, but not before it has been on screen
       long enough to read - a tip you dismiss by accident never happened */
    if (t > 0.5 && (KD.In.isHit('Space', 'Enter', 'KeyE', 'Escape') ||
                    (KD.In.mouse.click && !KD.UI.blocked()))) {
      live = null;
      return true;                      /* we ate the press */
    }
    if (life <= 0) live = null;
    return false;
  }

  function draw() {
    if (!live) return;
    const R = KD.Screen.rect;
    const k = Math.min(1, t * 6);
    const words = live.text;
    const tw = KD.Text.width(words, { tiny: true }) + 22;
    const h = 17;
    const x = Math.round((KD.W - tw) / 2);
    /* the plate sits under whatever it points at, or at the foot of the
       frame when the tip is about nothing in particular */
    let y = arrow ? Math.round(arrow.y) + 14 : KD.H - 40;
    if (y + h > KD.H - 6) y = Math.round(arrow ? arrow.y : KD.H) - h - 16;
    const yy = Math.round(y + (1 - k) * 6);

    /* the arrow, three solid steps, pointing back up at the thing */
    if (arrow) {
      const ax = Math.round(arrow.x);
      const ay = Math.round(arrow.y) + 3 + Math.round(Math.sin(t * 6) * 2);
      const up = yy > ay;
      for (let i = 0; i < 5; i++) {
        const w = 9 - i * 2;
        R(ax - (w >> 1), up ? ay + i * 2 : ay - i * 2, w, 2, i < 2 ? 'GOLD.3' : 'GOLD.1');
      }
    }
    R(x - 2, yy - 2, tw + 4, h + 4, 'INK.0');
    R(x, yy, tw, h, 'DEEP.0');
    R(x + 1, yy + 1, tw - 2, 1, 'DEEP.2');
    KD.Screen.frame(x, yy, tw, h, 'GOLD.2');
    /* a small mark so it reads as a voice rather than as a system box */
    R(x + 5, yy + 5, 3, 3, 'GOLD.3');
    R(x + 5, yy + 10, 3, 2, 'GOLD.3');
    KD.Text.draw(words, x + 13, yy + 5, 'BONE.2', { tiny: true });
    if (t > 0.5) {
      KD.Text.draw(KD.touch ? 'tap' : 'SPACE', x + tw - 5, yy + 6, 'INK.3',
                   { tiny: true, align: 'right' });
    }
  }

  return { tip, update, draw, active, clear, seen, forget, TIPS };
})();
