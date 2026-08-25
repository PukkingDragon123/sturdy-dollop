/* Loads the game's browser scripts in a Node VM where `window` IS the global,
   so `window.KD = {}` really does create a global KD - same as a browser.
   Used by the checker, the sprite previewer and the data validators. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
}

/* stub just enough canvas for sprite compilation to run headless */
function stubCanvas() {
  const mk = (w, h) => {
    const c = {
      width: w || 0, height: h || 0,
      getContext: () => ({
        canvas: c, fillStyle: '', imageSmoothingEnabled: true,
        fillRect() {}, clearRect() {}, drawImage() {}, save() {}, restore() {},
        translate() {}, scale() {}, setTransform() {}, globalAlpha: 1,
        createImageData: (a, b) => ({ width: a, height: b, data: new Uint8ClampedArray(a * b * 4) }),
        putImageData() {}, getImageData: (x, y, a, b) => ({ width: a, height: b, data: new Uint8ClampedArray(a * b * 4) })
      })
    };
    return c;
  };
  return mk;
}

function load(files) {
  const mk = stubCanvas();
  const sandbox = {
    console, Math, Date, JSON, performance: { now: () => 0 },
    requestAnimationFrame: () => 0, setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { maxTouchPoints: 0, userAgent: 'node' },
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
    addEventListener() {}, removeEventListener() {},
    document: {
      createElement: (t) => (t === 'canvas' ? mk() : { style: {}, appendChild() {} }),
      getElementById: () => null, addEventListener() {}, body: { appendChild() {}, style: {} }
    },
    Image: function () {}, Audio: function () {},
    AudioContext: function () { return { createGain: () => ({ connect() {}, gain: { value: 0 } }), destination: {} }; }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of files || scriptList()) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    new vm.Script(src, { filename: f }).runInContext(ctx);
  }
  return sandbox;
}

module.exports = { load, scriptList, ROOT };
