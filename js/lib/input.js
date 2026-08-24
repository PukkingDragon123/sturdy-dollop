/* ============================================================
   input.js - keyboard, mouse and a real on-screen pad for phones.
   Everything reported in design-space units.
   ============================================================ */
KA.In = (function () {
  const U = KA.U;
  const down = new Set(), pressed = new Set();
  const st = { scale: 1, ox: 0, oy: 0 };
  const M = { x: 0, y: 0, down: false, click: false, up: false, rdown: false, rclick: false, wheel: 0 };
  const touches = new Map();
  let anyFlag = false;

  /* virtual pad state, filled by the touch handlers */
  /* ox/oy and moved let a touch in the pad zone still resolve as a plain tap */
  const pad = { active: false, cx: 0, cy: 0, dx: 0, dy: 0, id: null, mag: 0, ox: 0, oy: 0, moved: false };
  const TAP_SLOP = 7;                  // design px of travel before it counts as a drag
  const btn = {};                      // name -> {down, pressed, id}
  const BTN_DEFS = [];                 // laid out by the scene each frame

  function setTransform(scale, ox, oy) { st.scale = scale; st.ox = ox; st.oy = oy; }
  function toDesign(cx, cy) {
    return { x: (cx - st.ox) / st.scale, y: (cy - st.oy) / st.scale };
  }

  function attach(canvas) {
    window.addEventListener('keydown', (e) => {
      if (!down.has(e.code)) { pressed.add(e.code); anyFlag = true; }
      down.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => down.delete(e.code));
    window.addEventListener('blur', () => { down.clear(); M.down = false; });

    const mv = (cx, cy) => { const p = toDesign(cx, cy); M.x = p.x; M.y = p.y; };
    canvas.addEventListener('mousemove', (e) => mv(e.clientX, e.clientY));
    canvas.addEventListener('mousedown', (e) => {
      mv(e.clientX, e.clientY);
      if (e.button === 2) { M.rdown = true; M.rclick = true; } else { M.down = true; M.click = true; }
      anyFlag = true; e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) M.rdown = false; else { M.down = false; M.up = true; }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { M.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    /* ---- touch: left half drives the pad, buttons claim their own ---- */
    const onStart = (e) => {
      KA.touch = true;
      for (const t of e.changedTouches) {
        const p = toDesign(t.clientX, t.clientY);
        touches.set(t.identifier, p);
        let claimed = false;
        for (const b of BTN_DEFS) {
          if (U.dist(p.x, p.y, b.x, b.y) < b.r * 1.35 && !b.taken) {
            b.taken = t.identifier;
            const s = btn[b.name] || (btn[b.name] = {});
            if (!s.down) s.pressed = true;
            s.down = true; s.id = t.identifier;
            claimed = true; break;
          }
        }
        if (!claimed && !pad.active && p.x < KA.W * 0.55) {
          pad.active = true; pad.id = t.identifier; pad.cx = p.x; pad.cy = p.y; pad.dx = 0; pad.dy = 0; pad.mag = 0;
          pad.ox = p.x; pad.oy = p.y; pad.moved = false;
          M.x = p.x; M.y = p.y;        // so a tap that never moves lands where it was pressed
        } else if (!claimed) {
          M.x = p.x; M.y = p.y; M.down = true; M.click = true;
        }
        anyFlag = true;
      }
      if (e.cancelable) e.preventDefault();
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        const p = toDesign(t.clientX, t.clientY);
        touches.set(t.identifier, p);
        if (pad.id === t.identifier) {
          if (U.dist(p.x, p.y, pad.ox, pad.oy) > TAP_SLOP) pad.moved = true;
          const dx = p.x - pad.cx, dy = p.y - pad.cy;
          const l = Math.hypot(dx, dy), max = 34;
          pad.mag = Math.min(1, l / max);
          if (l > 0.001) { pad.dx = (dx / l) * pad.mag; pad.dy = (dy / l) * pad.mag; }
          if (l > max) { pad.cx = p.x - (dx / l) * max; pad.cy = p.y - (dy / l) * max; }
        } else if (!isButtonTouch(t.identifier)) { M.x = p.x; M.y = p.y; }
      }
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        touches.delete(t.identifier);
        if (pad.id === t.identifier) {
          /* a stab that never travelled is a button press, not a joystick nudge */
          if (!pad.moved) { M.x = pad.ox; M.y = pad.oy; M.click = true; M.up = true; }
          pad.active = false; pad.id = null; pad.dx = pad.dy = pad.mag = 0; pad.moved = false;
        }
        for (const k in btn) if (btn[k].id === t.identifier) { btn[k].down = false; btn[k].id = null; }
        for (const b of BTN_DEFS) if (b.taken === t.identifier) b.taken = null;
        if (!isButtonTouch(t.identifier)) { M.down = false; M.up = true; }
      }
      if (e.cancelable) e.preventDefault();
    };
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) KA.touch = true;
  }
  function isButtonTouch(id) { for (const k in btn) if (btn[k].id === id) return true; return false; }

  /* scenes declare their touch buttons once per frame, before reading them */
  function defineButtons(list) {
    BTN_DEFS.length = 0;
    for (const b of list) BTN_DEFS.push(b);
  }
  function padVec() {
    if (pad.active) return { x: pad.dx, y: pad.dy };
    let x = 0, y = 0;
    if (isDown('ArrowLeft', 'KeyA')) x -= 1;
    if (isDown('ArrowRight', 'KeyD')) x += 1;
    if (isDown('ArrowUp', 'KeyW')) y -= 1;
    if (isDown('ArrowDown', 'KeyS')) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }
  const isDown = (...c) => c.some((k) => down.has(k));
  const isPressed = (...c) => c.some((k) => pressed.has(k));
  /* virtual button OR its keyboard equivalent */
  function act(name, ...keys) {
    const b = btn[name];
    return (b && b.down) || isDown(...keys);
  }
  function actPressed(name, ...keys) {
    const b = btn[name];
    return (b && b.pressed) || isPressed(...keys);
  }
  function endFrame() {
    pressed.clear();
    M.click = false; M.rclick = false; M.up = false; M.wheel = 0;
    for (const k in btn) btn[k].pressed = false;
  }
  const anyKey = () => { const v = anyFlag; anyFlag = false; return v; };
  return { attach, setTransform, endFrame, isDown, isPressed, act, actPressed, padVec,
           defineButtons, mouse: M, pad, anyKey, toDesign };
})();
