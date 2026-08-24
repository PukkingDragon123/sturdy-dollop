const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const listed = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } })(path.join(root, 'js'));
let bad = 0;
for (const src of listed) if (!fs.existsSync(path.join(root, src))) { console.log('MISSING ' + src); bad++; }
for (const f of files) {
  const rel = path.relative(root, f).split(path.sep).join('/');
  if (!listed.includes(rel)) { console.log('NOT LOADED ' + rel); bad++; }
  try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); }
  catch (e) { console.log('SYNTAX ' + rel + ': ' + e.message); bad++; }
}
console.log(bad ? bad + ' problem(s)' : 'all ' + files.length + ' files ok (' + listed.length + ' scripts)');
process.exit(bad ? 1 : 0);
