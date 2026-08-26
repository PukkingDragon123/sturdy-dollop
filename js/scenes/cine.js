/* ============================================================
   scenes/cine.js - cutscenes.

   A cutscene is a list of BEATS, each a small object the player
   runs in order. Beats are declarative on purpose: a beat says
   "hold on this portrait and say this line" or "pan the camera
   here over two seconds", never "on frame 41 do this". That way a
   scene reads like a script, can be skipped at any point, and
   nothing in it can leave the game in a half-set-up state - the
   scene's `after` runs whether it played out or was skipped.

   Beat kinds:
     say    { who, name, text, t }      portrait and a line
     card   { lines, t, sub }           full-screen title card
     wait   { t }                       hold on what is there
     fade   { t, to }                   fade to or from black
     shake  { amp }                     kick the camera
     sfx    { id }                      one cue
     art    { spr, x, y, t, scale }     hold a sprite on the card
     do     { fn }                      run a function once
   ============================================================ */
KD.Scenes.cine = (function () {
  let beats = [], i = 0, bt = 0, done = null, name = '';
  let fade = 0, fadeTo = 0, letter = 0, skipHold = 0;
  /* what the last `art` beat put on screen, so it can persist across says */
  let held = null;

  function enter(args) {
    const sc = (args && args.scene) || null;
    beats = (sc && sc.beats) || [];
    done = (sc && sc.after) || null;
    name = (sc && sc.id) || '';
    i = 0; bt = 0; fade = 1; fadeTo = 0; letter = 0; skipHold = 0; held = null;
    if (!beats.length) { finish(); return; }
    start();
  }

  function start() {
    const b = beats[i];
    if (!b) return;
    bt = b.t === undefined ? 2.4 : b.t;
    if (b.kind === 'fade') { fadeTo = b.to === undefined ? 1 : b.to; }
    if (b.kind === 'shake') KD.Fx.shake(b.amp || 6);
    if (b.kind === 'sfx' && b.id) KD.Sfx.play(b.id);
    if (b.kind === 'art') held = b;
    if (b.kind === 'do' && b.fn) b.fn();
    if (b.kind === 'say' && b.sfx !== false) KD.Sfx.play('click');
  }

  function next() {
    i++;
    if (i >= beats.length) { finish(); return; }
    start();
  }
  function finish() {
    const f = done;
    beats = []; done = null;
    /* `after` decides where we land, so a skipped scene ends up in exactly
       the same place a watched one does */
    if (f) f(); else KD.Game.go('play', {});
  }
  const skip = () => finish();

  function update(dt) {
    letter = Math.min(1, letter + dt * 4);
    KD.Fx.update(dt);
    const b = beats[i];
    if (!b) return;
    /* the fade eases toward its target rather than snapping */
    fade += (fadeTo - fade) * Math.min(1, dt * 5);
    if (b.kind === 'fade') fade = fadeTo === 1 ? Math.min(1, fade + dt / Math.max(0.1, b.t || 0.6))
                                              : Math.max(0, fade - dt / Math.max(0.1, b.t || 0.6));
    else fadeTo = 0;
    bt -= dt;
    /* advance on time, or immediately on a press */
    const hit = KD.In.isHit('Space', 'Enter', 'KeyE') || KD.In.mouse.click || KD.In.actHit('act');
    if (hit) { KD.In.consumedClick(); next(); return; }
    if (KD.In.isHit('Escape')) { skip(); return; }
    if (bt <= 0) next();
  }

  function draw(ctx) {
    KD.Screen.clear('INK.0');
    const b = beats[i] || {};
    /* the world behind, if this scene is playing over it */
    if (b.world !== false && KD.Gen && KD.Gen.meta && KD.Gen.meta.village) {
      const sh = KD.Fx.shakeOffset();
      const cam = { x: Math.round(KD.Cam.x + sh.x), y: Math.round(KD.Cam.y + sh.y) };
      KD.Parallax.back(ctx, cam, KD.Game.t);
      KD.Render.draw(ctx, cam);
      KD.Village.draw(ctx, cam);
      KD.Parallax.surface(ctx, cam, KD.Game.t);
      KD.Folk.draw(ctx, cam);
      KD.Parallax.front(ctx, cam, KD.Game.t);
    }
    /* whatever art is being held up */
    const a = held;
    if (a && KD.PX.has(a.spr)) {
      const s = KD.PX.get(a.spr);
      const k = a.scale || 1;
      KD.PX.blit(ctx, a.spr,
        Math.round((a.x === undefined ? 0.5 : a.x) * KD.W - s.w * k / 2),
        Math.round((a.y === undefined ? 0.42 : a.y) * KD.H - s.h * k / 2),
        { anchor: false, dw: s.w * k, dh: s.h * k });
    }
    /* letterbox bars slide in, which is the whole signal that this is a
       cutscene and not the game */
    const bar = Math.round(22 * letter);
    KD.Screen.rect(0, 0, KD.W, bar, 'INK.0');
    KD.Screen.rect(0, KD.H - bar, KD.W, bar, 'INK.0');

    if (b.kind === 'card') {
      const lines = b.lines || [];
      const lh = 13;
      const y0 = Math.round(KD.H / 2 - (lines.length * lh) / 2) - (b.sub ? 8 : 0);
      lines.forEach((l, k) => {
        KD.Text.draw(l, KD.W / 2, y0 + k * lh, k === 0 ? 'GOLD.3' : 'BONE.2',
          { align: 'center', shadow: 'INK.0', space: k === 0 ? 1 : 0 });
      });
      if (b.sub) {
        KD.Text.draw(b.sub, KD.W / 2, y0 + lines.length * lh + 6, 'INK.3',
          { tiny: true, align: 'center' });
      }
    } else if (b.kind === 'say') {
      KD.Talk.panel({ portrait: b.who, name: b.name }, b.text, { bottom: bar + 6 });
    }
    /* the fade sits over everything except the skip hint */
    if (fade > 0.01) KD.Dither.wash(ctx, 0, 0, KD.W, KD.H, 'INK.0', Math.min(1, fade));
    KD.Text.draw(KD.touch ? 'tap to go on' : 'SPACE to go on   -   ESC to skip',
      KD.W - 6, KD.H - bar + 7, 'INK.2', { tiny: true, align: 'right' });
  }
  return { enter, update, draw, skip };
})();
