// ASCII-dump every sprite so shapes can be eyeballed in a terminal.
const fs = require('fs');
global.window = global;
global.DZ = { Pixel: { define: (name, def) => { store[name] = def; return name; } } };
const store = {};
global.store = store;
const src = fs.readFileSync(__dirname + '/../js/sprites/sprites.js', 'utf8');
eval(src);
const want = process.argv.slice(2);
const CH = { '.': ' ', ' ': ' ' };
for (const [name, def] of Object.entries(store)) {
  if (want.length && !want.some((w) => name.includes(w))) continue;
  const rows = def.rows;
  const w = Math.max(...rows.map((r) => r.length));
  console.log('\n== ' + name + '  (' + w + 'x' + rows.length + ')');
  const lens = new Set(rows.map((r) => r.length));
  if (lens.size > 1) console.log('   ! ragged rows: ' + [...lens].join(','));
  for (const r of rows) {
    console.log('   |' + r.padEnd(w, '.').replace(/[.]/g, '·').replace(/[1-9]/g, (m) => '#@%*+=~:'[+m - 1] || '#') + '|');
  }
}
