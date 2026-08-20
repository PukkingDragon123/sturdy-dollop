/* Verifies localStorage save/load survives a reload, and that the game
   also boots straight from file:// with no web server. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serve(port) {
  return new Promise((res) => {
    const srv = http.createServer((rq, rs) => {
      let p = decodeURIComponent(rq.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      rs.end(fs.readFileSync(f));
    });
    srv.listen(port, () => res(srv));
  });
}

(async () => {
  const errors = [];
  const browser = await chromium.launch({ executablePath: process.env.PW_EXEC });

  // ---------- 1. file:// boot ----------
  let page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('file:// pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('file:// console: ' + m.text()); });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(1200);
  const fileBoot = await page.evaluate(() => ({ scene: DZ.Game.scene, sprites: !!DZ.Pixel.get('dolphin'), fps: DZ.Game.fps }));
  console.log('file:// boot ->', JSON.stringify(fileBoot));
  await page.close();

  // ---------- 2. save survives reload ----------
  const srv = await serve(8211);
  page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('http pageerror: ' + e.message));
  await page.goto('http://localhost:8211/index.html');
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => {
    DZ.State.wipe();
    const S = DZ.State.S;
    S.clams = 4321; S.day = 7; S.ranch.vat = 2; S.gear.spear = 2;
    DZ.State.addFish('tuna', true, 2);
    DZ.State.addFood('krill', 3);
    const d = DZ.State.selected();
    d.name = 'Persist McTest';
    DZ.Dolphin.addExp(d, 500, S);
    DZ.Dolphin.learn(d, 'zoom', S);
    DZ.State.addDolphin(DZ.Dolphin.create({ name: 'Second', lvl: 4 }));
    DZ.State.save();
    return { clams: S.clams, day: S.day, dolphins: S.dolphins.length, name: d.name,
             lvl: DZ.Dolphin.level(d), skills: Object.keys(d.skills).length,
             fish: DZ.State.fishTotal(), food: DZ.State.foodCount(), vat: S.ranch.vat };
  });
  await page.reload();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => {
    const S = DZ.State.S;
    const d = S.dolphins[0];
    return { clams: S.clams, day: S.day, dolphins: S.dolphins.length, name: d.name,
             lvl: DZ.Dolphin.level(d), skills: Object.keys(d.skills).length,
             fish: DZ.State.fishTotal(), food: DZ.State.foodCount(), vat: S.ranch.vat };
  });
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log('before reload ->', JSON.stringify(before));
  console.log('after  reload ->', JSON.stringify(after));
  console.log('save/load identical:', same);

  // ---------- 3. continue button resumes ----------
  const resumed = await page.evaluate(async () => {
    // title screen should offer CONTINUE with the saved day
    DZ.Game.go('ranch');
    await new Promise((r) => setTimeout(r, 500));
    return { scene: DZ.Game.scene, day: DZ.State.S.day, clams: DZ.State.S.clams };
  });
  console.log('resume ->', JSON.stringify(resumed));

  await browser.close();
  srv.close();
  console.log('ERRORS: ' + errors.length);
  errors.forEach((e) => console.log('  ! ' + e));
  process.exit(!same || errors.length || fileBoot.scene !== 'title' ? 1 : 0);
})();
