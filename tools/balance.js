/* Drives the real model code for N in-game days to sanity-check pacing:
   dives -> feed -> sell -> race -> next day. Prints a progression table. */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const http = require('http');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
function serve(port) { return new Promise((res) => {
  const s = http.createServer((rq, rs) => {
    let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); rs.end(); return; }
    rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' }); rs.end(fs.readFileSync(f));
  }); s.listen(port, () => res(s)); }); }

(async () => {
  const srv = await serve(8212);
  const browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:8212/index.html');
  await page.waitForTimeout(700);

  const rows = await page.evaluate((DAYS) => {
    DZ.State.wipe();
    const S = DZ.State.S;
    const U = DZ.Util;
    const out = [];
    // a "player" that plays reasonably: dive twice a day, feed everything,
    // sell the rest, buy the cheapest useful upgrade, race the best tier.
    for (let day = 1; day <= DAYS; day++) {
      const maxZone = Math.min(3, S.gear.tank);
      const bag = DZ.Items.gearTier('bag', S.gear.bag).cap;
      const spearDmg = DZ.Items.gearTier('spear', S.gear.spear).dmg;
      let caught = 0;
      for (let dive = 0; dive < 2; dive++) {
        // a competent dive fills ~75% of the bag, skipping fish it cannot kill
        for (let i = 0; i < Math.floor(bag * 0.75); i++) {
          let sp = DZ.Species.rollFor(maxZone, DZ.Upgrades.value(S, 'sonar'));
          let guard = 0;
          while (sp.hp > spearDmg * 3 && guard++ < 6) sp = DZ.Species.rollFor(maxZone, 0);
          DZ.State.addFish(sp.id, U.chance(DZ.Items.gearTier('net', S.gear.net).live * 0.4), 1);
          caught++;
        }
        DZ.State.earn(Math.round(bag * 0.75 * 1.5 * (2 + maxZone * 1.6)), true); // combo bonus
      }
      // feed the best dolphin half the catch, sell the rest
      const d = S.dolphins.slice().sort((a, b) => DZ.Dolphin.power(b) - DZ.Dolphin.power(a))[0];
      const keys = Object.keys(S.inv.fish);
      let fed = 0;
      for (const k of keys) {
        const sp = DZ.Species.get(k); if (!sp) continue;
        const half = Math.ceil(S.inv.fish[k].n / 2);
        for (let i = 0; i < half; i++) {
          if (DZ.State.takeFish(k, false, 1) || DZ.State.takeFish(k, true, 1)) {
            DZ.Dolphin.feedFish(d, sp, false, S); fed++;
          }
        }
      }
      const sold = DZ.State.sellAll();
      // spend: upgrade the cheapest gear/ranch thing we can afford (tank first)
      let bought = [];
      for (let k = 0; k < 3; k++) {
        const opts = [];
        ['tank', 'spear', 'net', 'bag', 'fins'].forEach((g) => {
          const n = DZ.Items.gearNext(g, S.gear[g]);
          if (n) opts.push({ cost: n.cost, buy: () => S.gear[g]++, name: g });
        });
        DZ.Upgrades.RANCH.forEach((u) => {
          const n = DZ.Upgrades.next(S, u.id);
          if (n) opts.push({ cost: n.cost, buy: () => (S.ranch[u.id] = DZ.Upgrades.level(S, u.id) + 1), name: u.id });
        });
        opts.sort((a, b) => a.cost - b.cost);
        const pick = opts.find((o) => o.cost <= S.clams * 0.6);
        if (!pick) break;
        S.clams -= pick.cost; pick.buy(); bought.push(pick.name);
      }
      // race the best tier we qualify for
      const lvl = DZ.Dolphin.level(d);
      const tier = DZ.Races.TIERS.filter((t) => t.minLvl <= lvl && t.entry < S.clams * 0.5).pop();
      let raceNote = 'none';
      if (tier) {
        S.clams -= tier.entry;
        const field = [ { mine: true, stats: DZ.Dolphin.stats(d, S), lvl } ]
          .concat(DZ.Races.fieldFor(S, tier.id, d));
        const pw = field.map((r) => DZ.Races.power(r));
        // player skill edge: surging well is worth ~12%
        pw[0] *= 1.12;
        const place = 1 + pw.slice(1).filter((p) => p > pw[0]).length;
        const purse = tier.purse[place - 1] || 0;
        DZ.State.earn(purse, true);
        DZ.Dolphin.addExp(d, Math.round((44 + tier.id * 46) * (place === 1 ? 1.6 : 0.9)), S);
        d.races++; if (place === 1) d.wins++;
        raceNote = tier.name.split(' ')[0] + ' #' + place + ' +' + purse;
      }
      const rep = DZ.State.nextDay();
      out.push({
        day, clams: S.clams, lvl: DZ.Dolphin.level(d), sp: d.sp,
        exp: d.exp, zone: Math.min(3, S.gear.tank), caught, fed, sold: sold.clams,
        pens: S.dolphins.length, race: raceNote, bought: bought.join(',') || '-',
        power: Math.round(DZ.Dolphin.power(d, S))
      });
    }
    return out;
  }, 25);

  console.log('day  clams    lvl sp  power zone caught fed  sold   race                 bought');
  for (const r of rows) {
    console.log(
      String(r.day).padEnd(5) + String(r.clams).padEnd(9) + String(r.lvl).padEnd(4) +
      String(r.sp).padEnd(4) + String(r.power).padEnd(6) + String(r.zone).padEnd(5) +
      String(r.caught).padEnd(7) + String(r.fed).padEnd(5) + String(r.sold).padEnd(7) +
      r.race.padEnd(21) + r.bought.slice(0, 34));
  }
  console.log('\nerrors: ' + errs.length); errs.slice(0, 5).forEach((e) => console.log('  ! ' + e));
  await browser.close(); srv.close();
})();
