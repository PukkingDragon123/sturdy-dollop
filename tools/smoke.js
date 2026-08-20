/* Headless smoke test: loads the game, drives it, screenshots, reports errors. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

function serve(port) {
  return new Promise((res) => {
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
    srv.listen(port, () => res(srv));
  });
}

// script: [ ['shot','name'], ['click',x,y], ['key','Space'], ['wait',ms], ['hold','Space',ms], ['move',x,y] ]
async function main() {
  const port = 8199;
  const srv = await serve(port);
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_EXEC || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [], logs = [];
  page.on('console', (m) => {
    const txt = m.type() + ': ' + m.text();
    logs.push(txt);
    if (m.type() === 'error') errors.push(txt);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const box = await page.locator('#game').boundingBox();
  const scale = box.width / 400;
  const toPage = (x, y) => ({ x: box.x + x * scale, y: box.y + y * scale });

  const script = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'script.json'), 'utf8'));
  for (const step of script) {
    const [op, a, b] = step;
    if (op === 'shot') {
      await page.locator('#game').screenshot({ path: path.join(SHOTS, a + '.png') });
      process.stdout.write('shot ' + a + '\n');
    } else if (op === 'click') {
      const p = toPage(a, b); await page.mouse.click(p.x, p.y); await page.waitForTimeout(160);
    } else if (op === 'rclick') {
      const p = toPage(a, b); await page.mouse.click(p.x, p.y, { button: 'right' }); await page.waitForTimeout(120);
    } else if (op === 'move') {
      const p = toPage(a, b); await page.mouse.move(p.x, p.y); await page.waitForTimeout(60);
    } else if (op === 'key') { await page.keyboard.press(a); await page.waitForTimeout(120); }
    else if (op === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(b || 400); await page.keyboard.up(a); }
    else if (op === 'wait') { await page.waitForTimeout(a); }
    else if (op === 'eval') { const r = await page.evaluate(a); console.log('eval =>', JSON.stringify(r)); }
  }
  const state = await page.evaluate(() => ({
    scene: DZ.Game.scene, fps: DZ.Game.fps, clams: DZ.State.S.clams,
    dolphins: DZ.State.S.dolphins.length, day: DZ.State.S.day, fish: DZ.State.fishTotal()
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
