/* Generate a world headlessly and write a PNG of the whole thing, plus a
   zoomed crop, so you can SEE whether the generator made anything good.
   node tools/worldmap.js [seed] [cropX] [cropY]  */
const fs = require('fs'), path = require('path');
const { load, ROOT } = require('./load.js');
const png = require('./png.js');

const seed = +(process.argv[2] || 12345);
const w = load(['js/px/pal.js', 'js/px/px.js', 'js/world/tiles.js', 'js/world/world.js',
                'js/world/light.js', 'js/world/gen.js']);
const KD = w.KD, Wd = KD.World, Gen = KD.Gen, T = KD.Tiles;

const t0 = Date.now();
const n = Gen.begin(1400, 420, seed);
let s;
while ((s = Gen.step())) process.stdout.write('  ' + s.done + '/' + s.total + ' ' + s.label + '\n');
const ms = Date.now() - t0;

/* one colour per tile type, so the map reads at a glance */
const COL = {
  air: [12, 22, 38], water: [20, 60, 95], sand: [201, 168, 106], mud: [110, 88, 60],
  stone: [85, 97, 114], dark: [20, 64, 95], rot: [77, 36, 112], coral: [232, 106, 138],
  masonry: [166, 178, 194], plank: [138, 92, 46], brick: [171, 112, 72], glass: [142, 233, 238],
  ore_copper: [214, 156, 106], ore_bronze: [224, 168, 50], ore_iron: [232, 236, 245],
  ore_gold: [255, 217, 122], ore_abyssal: [176, 111, 216],
  torch: [255, 200, 90], glowpod: [176, 111, 216], lantern: [255, 217, 122],
  kelp: [79, 176, 99], grass: [47, 122, 68], anemone: [255, 168, 189], urchin_d: [90, 40, 120],
  bones: [232, 236, 245], workbench: [255, 120, 0], furnace: [255, 90, 40], anvil: [255, 60, 200],
  loom: [255, 255, 0], vat: [0, 255, 180], reroll: [255, 0, 120], cookpot: [255, 160, 0],
  chest: [255, 240, 120], door: [255, 140, 60], platform: [180, 135, 74],
  statue: [220, 225, 235], pillar: [200, 210, 225], moss: [47, 122, 68]
};
const colFor = (i) => {
  const t = T.get(i);
  const c = t && COL[t.id];
  return c || [255, 0, 255];
};

function write(name, x0, y0, ww, hh, zoom, withLight) {
  const W = ww * zoom, H = hh * zoom;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < ww; x++) {
      const tx = x0 + x, ty = y0 + y;
      let c = colFor(Wd.at(tx, ty));
      if (Wd.at(tx, ty) === T.AIR && Wd.water(tx, ty) > 0) c = COL.water;
      if (withLight) {
        const l = Wd.lightAt(tx, ty) / 15;
        const f = 0.12 + 0.88 * l;
        c = [c[0] * f, c[1] * f, c[2] * f];
      }
      for (let zy = 0; zy < zoom; zy++) for (let zx = 0; zx < zoom; zx++) {
        const o = (((y * zoom + zy) * W) + (x * zoom + zx)) * 4;
        buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255;
      }
    }
  }
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  const out = path.join(__dirname, 'shots', name);
  fs.writeFileSync(out, png.encode(W, H, buf));
  return path.relative(ROOT, out);
}

/* stats: is the world actually playable? */
const counts = {};
for (let i = 0; i < Wd.fg.length; i++) {
  const id = T.get(Wd.fg[i]).id;
  counts[id] = (counts[id] || 0) + 1;
}
const total = Wd.fg.length;
const openIn = (y0, y1) => {
  let open = 0, all = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < Wd.W; x++) { all++; if (!T.isSolid(Wd.at(x, y))) open++; }
  return (open / all * 100).toFixed(1) + '%';
};

console.log('\nseed ' + seed + '  ' + Wd.W + 'x' + Wd.H + ' tiles  generated in ' + ms + 'ms');
console.log('spawn ' + JSON.stringify(Gen.meta.spawn) + '  village houses ' + (Gen.meta.village ? Gen.meta.village.houses.length : 0) +
            '  structures ' + Gen.meta.structures.length + '  chests ' + (Gen.meta.chests || []).length);
console.log('\nopen space by layer:');
for (const L of Gen.LAYERS) console.log('  ' + L.id.padEnd(9) + ' y' + L.y0 + '-' + L.y1 + '  ' + openIn(L.y0, L.y1));
console.log('\ntile mix (top 14):');
Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 14)
  .forEach(([k, v]) => console.log('  ' + k.padEnd(12) + (v / total * 100).toFixed(2) + '%  ' + v));
console.log('\nore totals:');
for (const o of Gen.ORES) console.log('  ' + o.t.padEnd(12) + (counts[o.t] || 0));

console.log('\n' + write('world-full.png', 0, 0, Wd.W, Wd.H, 1, true));
const cx = +(process.argv[3] || Gen.meta.spawn.x) - 80;
const cy = +(process.argv[4] || Gen.meta.spawn.y) - 30;
console.log(write('world-spawn.png', Math.max(0, cx), Math.max(0, cy), 160, 100, 4, true));
console.log(write('world-deep.png', Math.max(0, Wd.W - 200), 330, 200, 90, 4, true));
