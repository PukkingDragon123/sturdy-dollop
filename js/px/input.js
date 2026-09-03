/* ============================================================
   input.js - keyboard, mouse and a thumb-friendly touch layer.
   Everything is reported in internal pixel coordinates so game
   code never thinks about window size or scale.
   ============================================================ */
KD.In = (function () {
  const down = new Set(), hit = new Set(), rel = new Set();
  const M = { x: 0, y: 0, down: false, click: false, up: false, rdown: false, rclick: false, wheel: 0 };
  const pad = { on: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, mag: 0, ox: 0, oy: 0, moved: false };
  const btn = {};                 // name -> { down, hit }
  let DEFS = [];                  // laid out by the active scene each frame
  const TAP = 6;                  // px of travel before a touch counts as a drag
  let anyInput = false;

  function attach(canvas) {
    window.addEventListener('keydown', (e) => {
      if (!down.has(e.code)) hit.add(e.code);
      down.add(e.code);
      anyInput = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Slash'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { down.delete(e.code); rel.add(e.code); });
    window.addEventListener('blur', () => { down.clear(); M.down = false; });

    const mv = (cx, cy) => { const p = KD.Screen.toBuf(cx, cy); M.x = p.x; M.y = p.y; };
    canvas.addEventListener('mousemove', (e) => mv(e.clientX, e.clientY));
    canvas.addEventListener('mousedown', (e) => {
      mv(e.clientX, e.clientY);
      if (e.button === 2) { M.rdown = true; M.rclick = true; } else { M.down = true; M.click = true; }
      anyInput = true; e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) M.rdown = false; else { M.down = false; M.up = true; }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { M.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    /* ---- touch: the left third is a stick, buttons claim their own,
            and a stab that never travels still counts as a tap ---- */
    const start = (e) => {
      KD.touch = true;
      for (const t of e.changedTouches) {
        const p = KD.Screen.toBuf(t.clientX, t.clientY);
        let claimed = false;
        for (const b of DEFS) {
          if (Math.abs(p.x - b.x) <= b.r + 3 && Math.abs(p.y - b.y) <= b.r + 3 && !b.take) {
            b.take = t.identifier;
            const s = btn[b.name] || (btn[b.name] = {});
            if (!s.down) s.hit = true;
            s.down = true; s.id = t.identifier;
            claimed = true; break;
          }
        }
        if (!claimed && !pad.on && p.x < KD.W * 0.42) {
          pad.on = true; pad.id = t.identifier;
          pad.cx = p.x; pad.cy = p.y; pad.ox = p.x; pad.oy = p.y;
          pad.dx = 0; pad.dy = 0; pad.mag = 0; pad.moved = false;
          M.x = p.x; M.y = p.y;
        } else if (!claimed) { M.x = p.x; M.y = p.y; M.down = true; M.click = true; }
        anyInput = true;
      }
      if (e.cancelable) e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        const p = KD.Screen.toBuf(t.clientX, t.clientY);
        if (pad.id === t.identifier) {
          if (Math.hypot(p.x - pad.ox, p.y - pad.oy) > TAP) pad.moved = true;
          const dx = p.x - pad.cx, dy = p.y - pad.cy, l = Math.hypot(dx, dy), max = 22;
          pad.mag = Math.min(1, l / max);
          if (l > 0.001) { pad.dx = (dx / l) * pad.mag; pad.dy = (dy / l) * pad.mag; }
          if (l > max) { pad.cx = p.x - (dx / l) * max; pad.cy = p.y - (dy / l) * max; }
        } else if (!ownedByButton(t.identifier)) { M.x = p.x; M.y = p.y; }
      }
      if (e.cancelable) e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (pad.id === t.identifier) {
          if (!pad.moved) { M.x = pad.ox; M.y = pad.oy; M.click = true; M.up = true; }
          pad.on = false; pad.id = null; pad.dx = pad.dy = pad.mag = 0; pad.moved = false;
        }
        for (const k in btn) if (btn[k].id === t.identifier) { btn[k].down = false; btn[k].id = null; }
        for (const b of DEFS) if (b.take === t.identifier) b.take = null;
        if (!ownedByButton(t.identifier)) { M.down = false; M.up = true; }
      }
      if (e.cancelable) e.preventDefault();
    };
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) KD.touch = true;
  }
  function ownedByButton(id) { for (const k in btn) if (btn[k].id === id) return true; return false; }

  /* scenes declare their on-screen buttons once per frame */
  function buttons(list) { DEFS = list || []; }
  function stick() {
    if (pad.on && pad.moved) return { x: pad.dx, y: pad.dy };
    let x = 0, y = 0;
    if (isDown('ArrowLeft', 'KeyA')) x -= 1;
    if (isDown('ArrowRight', 'KeyD')) x += 1;
    if (isDown('ArrowUp', 'KeyW')) y -= 1;
    if (isDown('ArrowDown', 'KeyS')) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  }
  const isDown = (...c) => c.some((k) => down.has(k));
  const isHit = (...c) => c.some((k) => hit.add && hit.has(k));
  /* a named touch button OR its keyboard equivalent */
  const act = (name, ...keys) => (btn[name] && btn[name].down) || isDown(...keys);
  const actHit = (name, ...keys) => (btn[name] && btn[name].hit) || isHit(...keys);
  const padState = () => pad;
  const consumedClick = () => { M.click = false; };
  /* Take a press back out of this frame's hit set. The cutscene layer runs
     before the scene it is sitting on and both of them read the same keys -
     without this, one tap on SPACE would advance the story AND talk to
     whoever happened to be standing next to you. */
  const eat = (...c) => {
    for (const k of c) { hit.delete(k); if (btn[k]) btn[k].hit = false; }
  };
  function endFrame() {
    hit.clear(); rel.clear();
    M.click = false; M.rclick = false; M.up = false; M.wheel = 0;
    for (const k in btn) btn[k].hit = false;
  }
  const any = () => { const v = anyInput; anyInput = false; return v; };
  return { attach, buttons, stick, isDown, isHit, act, actHit, endFrame, mouse: M,
           padState, consumedClick, eat, any, DEFS: () => DEFS };
})();
