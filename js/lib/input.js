/* ============================================================
   input.js - keyboard / mouse / touch, in game-space pixels.
   ============================================================ */
DZ.Input = (function () {
  const down = new Set(), pressed = new Set(), released = new Set();
  const st = { scale: 1, ox: 0, oy: 0 };
  const M = { x: 200, y: 112, down: false, rdown: false, click: false, rclick: false, up: false, wheel: 0, moved: false };
  let anyKeyFlag = false;

  function setTransform(scale, ox, oy) { st.scale = scale; st.ox = ox; st.oy = oy; }

  function toGame(cx, cy) {
    return {
      x: DZ.Util.clamp((cx - st.ox) / st.scale, 0, DZ.W),
      y: DZ.Util.clamp((cy - st.oy) / st.scale, 0, DZ.H)
    };
  }

  function attach(canvas) {
    window.addEventListener('keydown', (e) => {
      const c = e.code;
      if (!down.has(c)) { pressed.add(c); anyKeyFlag = true; }
      down.add(c);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(c)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { down.delete(e.code); released.add(e.code); });
    window.addEventListener('blur', () => { down.clear(); M.down = false; M.rdown = false; });

    const move = (cx, cy) => { const p = toGame(cx, cy); M.x = p.x; M.y = p.y; M.moved = true; };
    canvas.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    canvas.addEventListener('mousedown', (e) => {
      move(e.clientX, e.clientY);
      if (e.button === 0) { M.down = true; M.click = true; }
      else if (e.button === 2) { M.rdown = true; M.rclick = true; }
      anyKeyFlag = true;
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) { M.down = false; M.up = true; }
      else if (e.button === 2) M.rdown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { M.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    // touch: single finger = move + hold, tap = click
    canvas.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; move(t.clientX, t.clientY);
      M.down = true; M.click = true; anyKeyFlag = true; e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      const t = e.changedTouches[0]; move(t.clientX, t.clientY); e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => { M.down = false; M.up = true; e.preventDefault(); }, { passive: false });
  }

  function endFrame() {
    pressed.clear(); released.clear();
    M.click = false; M.rclick = false; M.up = false; M.wheel = 0; M.moved = false;
  }

  const isDown = (...codes) => codes.some((c) => down.has(c));
  const isPressed = (...codes) => codes.some((c) => pressed.has(c));

  // named axes so scenes don't repeat key lists
  function axis() {
    let x = 0, y = 0;
    if (isDown('ArrowLeft', 'KeyA')) x -= 1;
    if (isDown('ArrowRight', 'KeyD')) x += 1;
    if (isDown('ArrowUp', 'KeyW')) y -= 1;
    if (isDown('ArrowDown', 'KeyS')) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }
  function anyKey() { const v = anyKeyFlag; anyKeyFlag = false; return v; }
  function consumeClick() { const v = M.click; M.click = false; return v; }

  return { attach, setTransform, endFrame, isDown, isPressed, axis, mouse: M, anyKey, consumeClick, toGame };
})();
