/* Headless driver: serve the game, drive it, screenshot, fail on console errors.
   node tools/smoke.js script.json
   env: PAGE, VIEW=WxH, MOBILE=1, SHOW_LOGS=1, PW_EXEC */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

function serve(port) {
  return new Promise((res, rej) => {
    const srv = http.createServer((req, rq) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rq.writeHead(404); rq.end('no'); return; }
      rq.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      rq.end(fs.readFileSync(f));
    });
    srv.on('error', rej);
    srv.listen(port, () => res(srv));
  });
}

async function main() {
  const first = +(process.env.PORT || 8300);
  let port = 0, srv = null;
  for (let i = 0; i < 40 && !srv; i++) {
    try { srv = await serve(first + i); port = first + i; }
    catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  }
  if (!srv) throw new Error('no free port');
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_EXEC || undefined });
  const vv = (process.env.VIEW || '').split('x').map(Number);
  const view = vv.length === 2 && vv.every((n) => n > 0) ? { width: vv[0], height: vv[1] } : null;
  const page = await browser.newPage(process.env.MOBILE
    ? { viewport: view || { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: view || { width: 1280, height: 760 } });
  const errors = [], logs = [];
  page.on('console', (m) => { const t = m.type() + ': ' + m.text(); logs.push(t); if (m.type() === 'error') errors.push(t); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto('http://localhost:' + port + '/' + (process.env.PAGE || 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const box = await page.locator('#game').boundingBox();
  const dims = await page.evaluate(() => (window.KD ? { w: KD.W, h: KD.H, s: KD.scale, css: KD.cssScale, dpr: KD.dpr } : null));
  if (!dims) { console.log('KD never booted'); }
  const scale = dims ? (dims.css || dims.s) : 1;
  const toPage = (x, y) => ({ x: box.x + x * scale, y: box.y + y * scale });
  console.log('internal ' + (dims ? dims.w + 'x' + dims.h + ' at ' + dims.s + 'x (dpr ' + dims.dpr + ')' : '?') +
              '   css ' + Math.round(box.width) + 'x' + Math.round(box.height));

  const script = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const step of script) {
    const [op, a, b] = step;
    if (op === 'shot') {
      await page.locator('#game').screenshot({ path: path.join(SHOTS, a + '.png') });
      process.stdout.write('shot ' + a + '\n');
    } else if (op === 'click') {
      const p = toPage(a, b);
      if (process.env.MOBILE) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(150);
    } else if (op === 'rclick') { const p = toPage(a, b); await page.mouse.click(p.x, p.y, { button: 'right' }); await page.waitForTimeout(120); }
    else if (op === 'move') { const p = toPage(a, b); await page.mouse.move(p.x, p.y); await page.waitForTimeout(50); }
    else if (op === 'hold_mouse') { const p = toPage(a, b); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(step[3] || 500); await page.mouse.up(); }
    else if (op === 'key') { await page.keyboard.press(a); await page.waitForTimeout(110); }
    else if (op === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(b || 400); await page.keyboard.up(a); }
    else if (op === 'wait') { await page.waitForTimeout(a); }
    else if (op === 'eval') { const r = await page.evaluate(a); console.log('eval => ' + JSON.stringify(r)); }
    else if (op === 'tap') { const p = toPage(a, b); await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(140); }
    else if (op === 'drag') {
      const p0 = toPage(step[1], step[2]), p1 = toPage(step[3], step[4]);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p0.x, y: p0.y }] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0.x + (p1.x - p0.x) * i / 8, y: p0.y + (p1.y - p0.y) * i / 8 }] });
        await page.waitForTimeout(28);
      }
      await page.waitForTimeout(step[5] || 400);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    }
  }
  const state = await page.evaluate(() => ({
    scene: KD.Game.scene, fps: KD.Game.fps, W: KD.W, H: KD.H,
    day: KD.Day ? KD.Day.day() : 0, energy: KD.Day ? KD.Day.energy() : 0,
    clams: KD.State.S.clams, pod: KD.Pod ? KD.Pod.pod().length : 0,
    sprites: KD.PX.names().length, parts: KD.Fx.count
  })).catch((e) => ({ evalError: String(e) }));
  console.log('\nSTATE: ' + JSON.stringify(state));
  console.log('ERRORS: ' + errors.length);
  errors.slice(0, 12).forEach((e) => console.log('  ! ' + e));
  if (process.env.SHOW_LOGS) logs.slice(-25).forEach((l) => console.log('  . ' + l));
  await browser.close();
  srv.close();
  process.exit(errors.length ? 1 : 0);
}
main().catch((e) => { console.error('HARNESS FAIL', e.message); process.exit(2); });
