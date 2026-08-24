/* Headless smoke test: loads the game, drives it, screenshots, reports errors. */
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
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        rq.writeHead(404); rq.end('nope'); return;
      }
      rq.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      rq.end(fs.readFileSync(f));
    });
    srv.on('error', rej);
    srv.listen(port, () => res(srv));
  });
}

// script: [ ['shot','name'], ['click',x,y], ['key','Space'], ['wait',ms], ['hold','Space',ms], ['move',x,y] ]
async function main() {
  // walk up from 8199 so parallel runs do not fight over the port
  const first = +(process.env.PORT || 8199);
  let port = 0, srv = null;
  for (let i = 0; i < 40 && !srv; i++) {
    try { srv = await serve(first + i); port = first + i; }
    catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  }
  if (!srv) throw new Error('no free port');
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_EXEC || undefined });
  // VIEW=WxH overrides the viewport, e.g. VIEW=700x620 to exercise the narrowest layout
  const vv = (process.env.VIEW || '').split('x').map(Number);
  const view = vv.length === 2 && vv.every((n) => n > 0) ? { width: vv[0], height: vv[1] } : null;
  const page = await browser.newPage(process.env.MOBILE
    ? { viewport: view || { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: view || { width: 1280, height: 760 } });
  const errors = [], logs = [];
  page.on('console', (m) => {
    const txt = m.type() + ': ' + m.text();
    logs.push(txt);
    if (m.type() === 'error') errors.push(txt);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto('http://localhost:' + port + '/' + (process.env.PAGE || 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const box = await page.locator('#game').boundingBox();
  const designW = await page.evaluate(() => (window.KA ? KA.W : 400));
  const scale = box.width / (process.env.DESIGNW ? +process.env.DESIGNW : designW);
  console.log('design ' + designW + 'x360  css ' + Math.round(box.width) + 'x' + Math.round(box.height));
  const toPage = (x, y) => ({ x: box.x + x * scale, y: box.y + y * scale });

  const script = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'script.json'), 'utf8'));
  for (const step of script) {
    const [op, a, b] = step;
    if (op === 'shot') {
      await page.locator('#game').screenshot({ path: path.join(SHOTS, a + '.png') });
      process.stdout.write('shot ' + a + '\n');
    } else if (op === 'click') {
      const p = toPage(a, b);
      if (process.env.MOBILE) await page.touchscreen.tap(p.x, p.y);
      else await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(160);
    } else if (op === 'rclick') {
      const p = toPage(a, b); await page.mouse.click(p.x, p.y, { button: 'right' }); await page.waitForTimeout(120);
    } else if (op === 'move') {
      const p = toPage(a, b); await page.mouse.move(p.x, p.y); await page.waitForTimeout(60);
    } else if (op === 'key') { await page.keyboard.press(a); await page.waitForTimeout(120); }
    else if (op === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(b || 400); await page.keyboard.up(a); }
    else if (op === 'wait') { await page.waitForTimeout(a); }
    else if (op === 'eval') { const r = await page.evaluate(a); console.log('eval =>', JSON.stringify(r)); }
    else if (op === 'tap') { const p = toPage(a, b); await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(150); }
    else if (op === 'drag') {
      // drag from (a,b) to (step[3],step[4]) with touch, holding for step[5] ms
      const p0 = toPage(step[1], step[2]), p1 = toPage(step[3], step[4]);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p0.x, y: p0.y }] });
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: p0.x + (p1.x - p0.x) * i / steps, y: p0.y + (p1.y - p0.y) * i / steps }] });
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(step[5] || 400);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    }
  }
  const state = await page.evaluate(() => ({
    scene: KA.Game.scene, fps: KA.Game.fps, W: KA.W,
    clams: KA.S.D.clams, hp: KA.S.D.hp, fat: Math.round(KA.S.D.fat),
    mount: KA.S.active() && KA.S.active().sp, frags: KA.S.fragCount(), area: KA.S.D.area,
  })).catch((e) => ({ evalError: String(e) }));
  console.log('\nSTATE: ' + JSON.stringify(state));
  console.log('ERRORS: ' + errors.length);
  errors.slice(0, 14).forEach((e) => console.log('  ! ' + e));
  if (process.env.SHOW_LOGS) logs.slice(-30).forEach((l) => console.log('  . ' + l));
  await browser.close();
  srv.close();
  process.exit(errors.length ? 1 : 0);
}
main().catch((e) => { console.error('HARNESS FAIL', e); process.exit(2); });
