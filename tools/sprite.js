/* Preview hand-drawn sprites without a browser.
   node tools/sprite.js <file.js> [nameFilter]      ASCII + a PNG contact sheet
   Writes tools/shots/sprites-<file>.png so you can LOOK at what you drew. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { load, ROOT } = require('./load.js');

const target = process.argv[2];
const filter = process.argv[3] || '';
if (!target) { console.error('usage: node tools/sprite.js js/art/<file>.js [nameFilter]'); process.exit(2); }

const base = ['js/px/pal.js', 'js/px/px.js'];
const w = load(base.concat([target].filter((f) => !base.includes(f))));
const PX = w.KD.PX, PAL = w.KD.PAL;
/* art modules that define lazily expose build(); run them all */
for (const k in w.KD.art) {
  const m = w.KD.art[k];
  if (m && typeof m.build === 'function') m.build();
}

const names = PX.names().filter((n) => n.includes(filter));
if (!names.length) { console.error('no sprites matched ' + filter); process.exit(1); }

/* ---- ascii, so the shape is readable in a terminal ---- */
const SHADE = ' .:-=+*#%@';
function ascii(name) {
  const s = PX.get(name);
  const out = [];
  for (let y = 0; y < s.h; y++) {
    let row = '';
    for (let x = 0; x < s.w; x++) {
      const v = s.data[y * s.w + x];
      if (v < 0) { row += ' '; continue; }
      const c = PAL.RGB[v];
      const lum = (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;
      row += SHADE[Math.min(SHADE.length - 1, Math.max(1, Math.round(lum * (SHADE.length - 1))))];
    }
    out.push(row.replace(/\s+$/, ''));
  }
  return out;
}

/* ---- a real PNG contact sheet, hand-rolled (no deps) ---- */
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}
let TAB = null;
function crc32(buf) {
  if (!TAB) {
    TAB = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TAB[n] = c; }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const ZOOM = 5, GAP = 3, COLS = Math.max(1, Math.min(10, names.length));
let cellW = 0, cellH = 0;
for (const n of names) { const s = PX.get(n); cellW = Math.max(cellW, s.w); cellH = Math.max(cellH, s.h); }
const rowsN = Math.ceil(names.length / COLS);
const W = (cellW * ZOOM + GAP) * COLS + GAP, H = (cellH * ZOOM + GAP + 8) * rowsN + GAP;
const buf = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i * 4] = 28; buf[i * 4 + 1] = 32; buf[i * 4 + 2] = 44; buf[i * 4 + 3] = 255; }
const put = (x, y, c) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255;
};
names.forEach((n, i) => {
  const s = PX.get(n);
  const cx = GAP + (i % COLS) * (cellW * ZOOM + GAP);
  const cy = GAP + Math.floor(i / COLS) * (cellH * ZOOM + GAP + 8);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const v = s.data[y * s.w + x];
    if (v < 0) continue;
    const c = PAL.RGB[v];
    for (let zy = 0; zy < ZOOM; zy++) for (let zx = 0; zx < ZOOM; zx++) put(cx + x * ZOOM + zx, cy + y * ZOOM + zy, c);
  }
});
fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
const out = path.join(__dirname, 'shots', 'sprites-' + path.basename(target, '.js') + (filter ? '-' + filter : '') + '.png');
fs.writeFileSync(out, png(W, H, buf));

for (const n of names.slice(0, +process.env.ASCII || 6)) {
  const s = PX.get(n);
  console.log('\n' + n + '  ' + s.w + 'x' + s.h + (s.ax || s.ay ? '  anchor ' + s.ax + ',' + s.ay : ''));
  console.log('+' + '-'.repeat(s.w) + '+');
  for (const r of ascii(n)) console.log('|' + r.padEnd(s.w) + '|');
  console.log('+' + '-'.repeat(s.w) + '+');
}
console.log('\n' + names.length + ' sprite(s) in ' + target);
console.log('contact sheet -> ' + path.relative(ROOT, out));
