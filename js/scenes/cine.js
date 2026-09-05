/* ============================================================
   scenes/cine.js - cutscenes, and you are standing IN them.

   A cutscene used to be a scene of its own. It replaced the world
   with a frozen photograph of wherever you had been, dropped a
   black bar over each end of it, and took every key on the
   keyboard until it was finished. That is a video, and you cannot
   be in a video - so four of the best moments in this game were
   things you watched happen to somebody who looked like you: the
   queen walking in on him, the cook offering him a room, the sea
   gate grinding open, the crown coming back.

   A cutscene is not a scene now. It is a LAYER. game.js ticks it
   BEFORE the scene underneath and draws it AFTER, which buys three
   things at once:

     - the world keeps its own time. Torches burn, water moves,
       fish swim past, the cast keep breathing.
     - you keep every control you had a second ago. Walk around
       the queen while she throws you out of your own throne room.
       Walk out of the room. She is still talking.
     - the layer eats the advance key before the scene sees it, so
       SPACE moves the story on and does not also swing a trident.

   The only cutscenes with nothing underneath them are the ones on
   the title screen, and KD.Scenes.cine is the bare stage those
   play on: the same layer, over black, with the portraits held up
   full size because there is nothing behind them to look at.

   Beat kinds:
     say    { who, name, text, t }      portrait and a line
     card   { lines, sub, t }           a title plate
     wait   { t }                       hold on what is there
     fade   { to, t }                   shutter closed or open
     shake  { amp }                     kick the camera once
     sfx    { id }                      one cue
     art    { spr, scale, x, y, t }     hold a portrait in frame
     two    { l, r, text, t }           two portraits facing off
     pan    { to:{x,y}, t }             take the camera somewhere
     move   { who, to, t }              walk a member of the cast
     flash  { col, t }                  a hit of colour
     rumble { amp, t }                  sustained shake
     do     { fn }                      run a function once

   Every beat can carry `vig` to squeeze the letterbox in on the
   frame and `slow` to run the world at quarter speed while it
   plays. Neither one stops you moving.
   ============================================================ */
KD.Cut = (function () {
  /* ---- which scenes you can walk around in -------------------------
     Anything not in here has no player in it, so a cutscene called
     from it goes to the bare stage instead. */
  const HOSTS = { castle: 1, buffet: 1, dinner: 1 };

  let beats = [], i = 0, bt = 0, after = null, id = '';
  let on = false, stage = false, pending = null;
  let letter = 0, fade = 0, fadeTo = 0, flash = 0, vig = 0;
  let pan = null, mv = null, held = null, heldSpr = '', artT = 0;
  let resolve = null;                        /* host's cast lookup, for `move` */
  /* THE SKIP BUTTON.
     Escape has skipped a cutscene since the layer was written, which is
     no use at all on a phone and no use to anybody who does not already
     know it is there. It is a drawn, hit-tested button now, in the top
     bar where the words never go, and it is checked BEFORE the
     tap-to-advance so pressing it cannot also turn the page. */
  const SKIP = { x: 0, y: 0, w: 0, h: 0 };
  let skipHot = 0;
  const SKIP_LAB_OF = () => (KD.touch ? 'SKIP' : 'ESC  SKIP');
  let SKIP_LAB = 'SKIP';
  function skipRect() {
    SKIP_LAB = SKIP_LAB_OF();
    const w = KD.Text.width(SKIP_LAB, { tiny: true }) + (KD.touch ? 26 : 14);
    const h = KD.touch ? 18 : 13;
    SKIP.w = w; SKIP.h = h;
    SKIP.x = KD.W - w - 5;
    SKIP.y = 3;
    return SKIP;
  }
  function skipHit() {
    const B = skipRect();
    const m = KD.In.mouse;
    return m.x >= B.x - 4 && m.x < B.x + B.w + 4 &&
           m.y >= B.y - 4 && m.y < B.y + B.h + 4;
  }

  const R = (x, y, w, h, c) => KD.Screen.rect(Math.round(x), Math.round(y),
                                              Math.round(w), Math.round(h), c);

  /* ---- starting ---------------------------------------------------- */
  function play(scene) {
    if (!scene || !scene.beats || !scene.beats.length) {
      if (scene && scene.after) scene.after();
      return;
    }
    /* Two cutscenes must never be half-playing at once: the second one's
       `after` is what advances the story, and the first one's is what puts
       the player somewhere sensible. Retire the one running first. */
    if (on) finish();
    if (HOSTS[KD.Game.scene]) { begin(scene, false); return; }
    /* nothing to stand in: put it on the bare stage */
    pending = scene;
    KD.Game.go('cine', {});
  }

  function begin(scene, onStage) {
    beats = scene.beats; after = scene.after || null; id = scene.id || '';
    i = 0; bt = 0; on = true; stage = !!onStage;
    letter = 0; fade = 1; fadeTo = 0; flash = 0; vig = 0;
    pan = null; mv = null; held = null; heldSpr = ''; artT = 0;
    start();
  }

  /* A host scene says how to find a member of its cast, so a `move`
     beat can walk somebody across the room. Scenes with nobody in them
     leave this alone and `move` quietly does nothing. */
  const setCast = (fn) => { resolve = fn || null; };

  function start() {
    const b = beats[i];
    if (!b) return;
    bt = b.t === undefined ? 2.4 : b.t;
    if (b.kind === 'fade') fadeTo = b.to === undefined ? 1 : b.to;
    if (b.kind === 'shake') KD.Fx.shake(b.amp || 6);
    if (b.kind === 'sfx' && b.id) KD.Sfx.play(b.id);
    if (b.kind === 'art') hold(b.spr, b.scale);
    if (b.kind === 'do' && b.fn) b.fn();
    if (b.kind === 'say') {
      if (b.sfx !== false) KD.Sfx.play('click');
      /* Over the live world the say box is slim and has no portrait in it,
         so the speaker's face goes up in the corner panel instead - the
         same slot an `art` beat uses. It only drops in again when the
         speaker actually changes. */
      if (!stage && b.who) hold(b.who, 1);
    }
    if (b.kind === 'flash') flash = 1;
    if (b.kind === 'two') { held = null; heldSpr = ''; artT = 0; }
    if (b.kind === 'pan' && b.to) {
      pan = { fx: KD.Cam.x, fy: KD.Cam.y, tx: b.to.x * 8, ty: b.to.y * 8,
              t: 0, len: Math.max(0.2, b.t || 1.4) };
    }
    if (b.kind === 'move') {
      const a = resolve && resolve(b.who);
      mv = a ? { a: a, from: a.x, to: b.to, t: 0, len: Math.max(0.2, b.t || 1.2) } : null;
      if (mv) mv.a.walk = 1;
    }
  }

  /* what is in the corner panel, and a drop-in when it changes */
  function hold(spr, scale) {
    if (!spr || !KD.PX.has(spr)) return;
    held = { spr: spr, scale: scale || 1 };
    if (spr !== heldSpr) { heldSpr = spr; artT = 0; }
  }

  function next() {
    i++;
    if (i >= beats.length) { finish(); return; }
    start();
  }
  function finish() {
    const f = after;
    beats = []; after = null; on = false;
    if (mv && mv.a) mv.a.walk = 0;
    mv = null; pan = null; held = null; heldSpr = '';
    /* `after` decides where we land, so a skipped scene ends up in exactly
       the same place a watched one does. It may not navigate at all any
       more - most cutscenes now hand the player straight back to the room
       he never left. */
    if (f) f();
  }
  const skip = () => finish();

  /* ---- the world's clock while a beat plays ------------------------
     `slow` used to mean "stop". It cannot mean that any more: a frozen
     world with a live player is a player swimming through a photograph.
     Quarter speed instead, which is what the beat wanted anyway. */
  const timeScale = () => (on && beats[i] && beats[i].slow ? 0.25 : 1);
  const holdsCam = () => !!(on && pan);

  function update(dt) {
    if (!on) return;
    letter = Math.min(1, letter + dt * 4);
    const b = beats[i];
    if (!b) return;
    fade += (fadeTo - fade) * Math.min(1, dt * 5);
    if (b.kind === 'fade') {
      fade = fadeTo === 1 ? Math.min(1, fade + dt / Math.max(0.1, b.t || 0.6))
                          : Math.max(0, fade - dt / Math.max(0.1, b.t || 0.6));
    } else fadeTo = 0;
    if (flash > 0) flash = Math.max(0, flash - dt * 3.2);
    vig += ((b.vig || 0) - vig) * Math.min(1, dt * 3);
    artT = Math.min(1, artT + dt * 5);
    if (b.kind === 'rumble') KD.Fx.shake((b.amp || 4) * dt * 30);
    if (pan) {
      pan.t = Math.min(pan.len, pan.t + dt);
      const k = KD.Juice.outCubic(pan.t / pan.len);
      KD.Cam.x = pan.fx + (pan.tx - pan.fx) * k;
      KD.Cam.y = pan.fy + (pan.ty - pan.fy) * k;
      if (pan.t >= pan.len) pan = null;
    }
    if (mv) {
      mv.t = Math.min(mv.len, mv.t + dt);
      const k = mv.t / mv.len, e = k * k * (3 - 2 * k);
      mv.a.x = Math.round(mv.from + (mv.to - mv.from) * e);
      if (mv.t >= mv.len) { mv.a.walk = 0; mv = null; }
    }
    bt -= dt;
    /* Advance, and EAT the press. The scene under us reads the same hit
       set a moment later; if we did not take the key out of it, one tap
       would advance the story and talk to whoever was standing there. */
    const clicked = KD.In.mouse.click;
    const onSkip = clicked && skipHit();
    skipHot = onSkip ? 0.2 : Math.max(0, skipHot - dt);
    const hit = KD.In.isHit('Space', 'Enter', 'KeyE') || clicked || KD.In.actHit('act');
    const esc = KD.In.isHit('Escape') || KD.In.isHit('Backspace');
    if (hit || esc) {
      KD.In.consumedClick();
      KD.In.eat('Space', 'Enter', 'KeyE', 'Escape', 'Backspace', 'act');
      if (esc || onSkip) { KD.Sfx.play('click'); skip(); } else next();
      return;
    }
    if (bt <= 0) next();
  }

  /* ================================================================
     DRAWING

     Two looks, because a cutscene over a live world and a cutscene
     over black want opposite things. On the bare stage the portraits
     are held up big in the middle of the frame, because there is
     nothing else to look at. Over the world they are framed insets in
     the top corner and the words sit on a solid plate - the picture
     underneath is the scene, and covering it up is the one thing this
     rewrite exists to stop.
     ================================================================ */
  function bars() {
    const base = stage ? 24 : 13;
    return Math.round((base + vig * (stage ? 10 : 11)) * KD.Juice.outCubic(letter));
  }

  /* a framed portrait panel - one blit inside two rules of light. Small
     sprites get scaled up so an item like the crown still reads; a
     forty-by-sixty face is already big enough at 1x. */
  function insetW(spr, sc) {
    if (!spr || !KD.PX.has(spr)) return 0;
    return KD.PX.get(spr).w * insetScale(spr, sc) + 6;
  }
  function insetScale(spr, sc) {
    const s = KD.PX.get(spr);
    let k = Math.max(1, Math.min(4, Math.round(sc || 1)));
    while (k > 1 && (s.h * k > 96 || s.w * k > 96)) k--;
    if (s.h * 2 <= 56 && k < 2) k = 2;
    return k;
  }
  function inset(ctx, spr, x, y, flip, sc) {
    if (!spr || !KD.PX.has(spr)) return 0;
    const s = KD.PX.get(spr), k = insetScale(spr, sc);
    const w = s.w * k + 6, h = s.h * k + 6;
    R(x - 1, y - 1, w + 2, h + 2, 'INK.0');
    R(x, y, w, h, 'DEEP.0');
    KD.Screen.frame(x, y, w, h, 'GOLD.0');
    R(x + 1, y + 1, w - 2, 1, 'DEEP.2');
    KD.PX.blit(ctx, spr, x + 3, y + 3,
               { anchor: false, flipX: !!flip, dw: s.w * k, dh: s.h * k });
    return h;
  }

  /* a title plate: solid, engraved, and readable over anything */
  function plate(lines, sub, y0) {
    const lh = 13;
    const hh = 11 + lines.length * lh + (sub ? 9 : 0);
    R(0, y0 - 1, KD.W, hh + 2, 'INK.0');
    R(0, y0 - 1, KD.W, 1, 'INK.2');
    R(0, y0 + hh, KD.W, 1, 'INK.2');
    R(10, y0 + 2, KD.W - 20, 1, 'GOLD.0');
    R(10, y0 + hh - 3, KD.W - 20, 1, 'GOLD.0');
    lines.forEach((l, k) => {
      KD.Text.draw(l, KD.W / 2, y0 + 7 + k * lh, k === 0 ? 'GOLD.3' : 'BONE.2',
                   { align: 'center', shadow: 'INK.0', space: k === 0 ? 1 : 0 });
    });
    if (sub) {
      KD.Text.draw(sub, KD.W / 2, y0 + 7 + lines.length * lh, 'INK.3',
                   { tiny: true, align: 'center' });
    }
    return hh;
  }

  function draw(ctx) {
    if (!on) return;
    const b = beats[i] || {};
    const bar = bars();
    let top = bar + 7;

    /* ---- portraits ------------------------------------------------- */
    if (b.kind === 'two') {
      if (stage) {
        const y0 = Math.round(KD.H * 0.30);
        [[b.l, 0.26, false], [b.r, 0.74, true]].forEach(([spr, fx, flip]) => {
          if (!spr || !KD.PX.has(spr)) return;
          const s = KD.PX.get(spr);
          KD.PX.blit(ctx, spr, Math.round(KD.W * fx - s.w), y0,
                     { anchor: false, dw: s.w * 2, dh: s.h * 2, flipX: flip });
        });
      } else {
        const k = KD.Juice.outCubic(artT), sl = Math.round((1 - k) * 14);
        const lw = insetW(b.l, 1), rw = insetW(b.r, 1);
        const h1 = inset(ctx, b.l, 8 - sl, top, false);
        const h2 = inset(ctx, b.r, KD.W - 8 - rw + sl, top, true);
        /* a rule between them, so they read as facing each other */
        const my = top + Math.round(Math.max(h1, h2) / 2);
        R(8 + lw + 4, my, KD.W - 24 - lw - rw, 1, 'INK.2');
        top += Math.max(h1, h2) + 6;
      }
      if (b.text) {
        if (stage) {
          KD.Text.draw(b.text, KD.W / 2, Math.round(KD.H * 0.30) - 14, 'BONE.2',
                       { align: 'center', shadow: 'INK.0', max: KD.W - 30 });
        } else {
          plate([b.text], null, top);
        }
      }
    }
    const a = held;
    if (a && KD.PX.has(a.spr)) {
      if (stage) {
        const s = KD.PX.get(a.spr), k = a.scale || 1;
        KD.PX.blit(ctx, a.spr,
          Math.round((a.x === undefined ? 0.5 : a.x) * KD.W - s.w * k / 2),
          Math.round((a.y === undefined ? 0.36 : a.y) * KD.H - s.h * k / 2),
          { anchor: false, dw: s.w * k, dh: s.h * k });
      } else {
        const sl = Math.round((1 - KD.Juice.outCubic(artT)) * 16);
        top += inset(ctx, a.spr, 8 - sl, top, false, a.scale) + 6;
      }
    }

    /* ---- the letterbox --------------------------------------------- */
    R(0, 0, KD.W, bar, 'INK.0');
    R(0, KD.H - bar, KD.W, bar, 'INK.0');
    if (bar > 1) {
      R(0, bar - 1, KD.W, 1, 'INK.2');
      R(0, KD.H - bar, KD.W, 1, 'INK.2');
    }

    /* ---- words ----------------------------------------------------- */
    if (b.kind === 'card') {
      const lines = b.lines || [];
      /* On the bare stage the words are the picture, so they sit in open
         black with nothing drawn behind them. Over the live world they need
         the plate: a caption laid straight over a brick wall is a caption
         you cannot read. */
      if (stage) {
        const lh = 13;
        const y0 = held ? Math.round(KD.H * 0.70)
                        : Math.round(KD.H / 2 - (lines.length * lh) / 2) - (b.sub ? 8 : 0);
        lines.forEach((l, k) => {
          KD.Text.draw(l, KD.W / 2, y0 + k * lh, k === 0 ? 'GOLD.3' : 'BONE.2',
                       { align: 'center', shadow: 'INK.0', space: k === 0 ? 1 : 0 });
        });
        if (b.sub) {
          KD.Text.draw(b.sub, KD.W / 2, y0 + lines.length * lh + 6, 'BONE.0',
                       { tiny: true, align: 'center' });
        }
      } else {
        plate(lines, b.sub, top);
      }
    } else if (b.kind === 'say') {
      const L = KD.Convo.layout(0, b.text || '', { slim: !stage });
      /* flush to the bottom edge over the letterbox bar, so the people
         talking are not cut off at the knees by the words they are saying */
      L.y = stage ? KD.H - L.h - bar - 6 : KD.H - L.h - 3;
      const cast = KD.Convo.CAST;
      let tint = 'GOLD.3';
      for (const k in cast) if (cast[k].portrait === b.who) tint = cast[k].tint;
      KD.Convo.box({ portrait: b.who, name: b.name, tint: tint }, b.text,
                   { L: L, speaking: false });
    }

    /* ---- transitions -----------------------------------------------
       The fade is a SHUTTER, not a cross-fade. Dimming a picture with a
       half-density dither turns it into a checkerboard - the lesson the
       god rays, the window light and the old cutscene wash all taught -
       so black closes in from both edges instead, solid the whole way. */
    if (fade > 0.005) {
      const h = Math.round(fade * (KD.H / 2 + 1));
      R(0, 0, KD.W, h, 'INK.0');
      R(0, KD.H - h, KD.W, h, 'INK.0');
      if (h > 1 && fade < 0.99) {
        R(0, h - 1, KD.W, 1, 'INK.1');
        R(0, KD.H - h, KD.W, 1, 'INK.1');
      }
    }
    /* and the flash is solid for two frames rather than a screen of dots */
    if (flash > 0.34) R(0, 0, KD.W, KD.H, b.col || 'WHITE');

    /* ---- the hint and the SKIP button ------------------------------
       Both live in the TOP bar, because the bottom one is where the words
       go. The hint used to be one dim line of tiny ink-purple text that
       said ESC TO SKIP, which is invisible on a laptop and a lie on a
       phone. Now the skip is a button you can see and hit with a thumb,
       and the advance hint sits to the left of it. */
    if (fade < 0.9) {
      const B = skipRect();
      KD.Text.draw(KD.touch ? 'tap to go on' : 'SPACE to go on',
        B.x - 8, B.y + (B.h >> 1) - 2, 'BONE.0', { tiny: true, align: 'right' });
      const lit = skipHot > 0 || (!KD.touch && KD.UI.inside(B.x - 4, B.y - 4, B.w + 8, B.h + 8));
      R(B.x - 1, B.y - 1, B.w + 2, B.h + 2, 'INK.0');
      R(B.x, B.y, B.w, B.h, lit ? 'GOLD.1' : 'INK.1');
      R(B.x + 1, B.y + 1, B.w - 2, 1, lit ? 'GOLD.3' : 'INK.2');
      KD.Screen.frame(B.x, B.y, B.w, B.h, lit ? 'GOLD.3' : 'GOLD.0');
      KD.Text.draw(SKIP_LAB, B.x + (B.w >> 1), B.y + (B.h >> 1) - 2,
                   lit ? 'INK.0' : 'GOLD.3', { tiny: true, align: 'center' });
    }
  }

  return { play, begin, update, draw, skip, setCast, timeScale, holdsCam,
           get active() { return on; },
           get id() { return id; },
           _takeStage: () => { const p = pending; pending = null; return p; } };
})();

/* ---------------------------------------------------------------
   The bare stage. Only the title screen's cutscenes land here, and
   only because a story about how he used to be king has no room to
   walk around in yet.
   --------------------------------------------------------------- */
KD.Scenes.cine = (function () {
  let t = 0, dead = 0;
  function enter(args) {
    t = 0; dead = 0;
    const sc = (args && args.scene) || KD.Cut._takeStage();
    if (!sc) { KD.Game.go('title', {}); return; }
    KD.Cut.begin(sc, true);
  }
  function update(dt) {
    t += dt;
    KD.Fx.update(dt);
    /* The layer's `after` is what moves us off this stage. If a scene ever
       forgets to say where it goes we would sit here on black forever, so
       count the frames it has been finished and bail out to the title.
       Checked here and not in draw(): a Game.go() from draw would land
       AFTER the after-hook's and quietly overrule it. */
    if (!KD.Cut.active && KD.Game.scene === 'cine') {
      dead += dt;
      if (dead > 0.4) KD.Game.go('title', {});
    }
  }
  function draw() {
    KD.Screen.clear('INK.0');
    /* not quite black: a few slow motes, so the stage is not a dead panel */
    for (let k = 0; k < 26; k++) {
      const x = Math.round((k * 149 + t * (6 + (k % 5) * 3)) % KD.W);
      const y = Math.round((k * 71 + t * 4) % KD.H);
      KD.Screen.rect(x, y, 1, 1, k % 3 ? 'INK.1' : 'INK.2');
    }
  }
  return { enter, update, draw };
})();
