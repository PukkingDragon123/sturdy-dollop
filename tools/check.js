/* Build gate. Three jobs:
   1. every js file parses
   2. every js file is listed in index.html, and every listed file exists
   3. THE ART RULE: no circles, no curves, no gradients, no blur, no real text
   Any failure exits non-zero. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

/* --- the banned list. This is what makes the game 100% hand-drawn pixels. --- */
const BANNED = [
  [/\.arc\s*\(/,                      'arc() - circles are banned, draw the pixels'],
  [/\.arcTo\s*\(/,                    'arcTo() - curves are banned'],
  [/\.ellipse\s*\(/,                  'ellipse() - circles are banned'],
  [/\.bezierCurveTo\s*\(/,            'bezierCurveTo() - curves are banned'],
  [/\.quadraticCurveTo\s*\(/,         'quadraticCurveTo() - curves are banned'],
  [/createLinearGradient/,            'gradients are banned, dither instead'],
  [/createRadialGradient/,            'gradients are banned, dither instead'],
  [/createConicGradient/,             'gradients are banned, dither instead'],
  [/createPattern/,                   'use a hand-drawn tile, not a canvas pattern'],
  [/\bshadowBlur\b/,                  'shadowBlur - blur is banned'],
  [/\bshadowColor\b/,                 'canvas shadows are banned, draw the shadow pixels'],
  [/\.filter\s*=/,                    'ctx.filter - blur/effects are banned'],
  [/\broundRect\s*\(/,                'roundRect - rounded corners must be stepped by hand'],
  [/\.fillText\s*\(/,                 'fillText - text must use the hand-drawn font'],
  [/\.strokeText\s*\(/,               'strokeText - text must use the hand-drawn font'],
  [/\.measureText\s*\(/,              'measureText - use KD.Text.width'],
  [/ctx\.font\s*=/,                   'ctx.font - there is no web font in this game'],
  [/imageSmoothingEnabled\s*=\s*true/, 'smoothing must stay off - pixels are square']
];
/* a line ending in this comment is an intentional, reviewed exception */
const ALLOW = /\/\/\s*pixel-lint-ok\b/;

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d).sort()) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) files.push(p);
  }
})(path.join(root, 'js'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const listed = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);

let bad = 0;
const fail = (msg) => { console.log(msg); bad++; };

for (const src of listed) {
  if (!fs.existsSync(path.join(root, src))) fail('MISSING   ' + src);
}
for (const f of files) {
  const rel = path.relative(root, f).split(path.sep).join('/');
  const src = fs.readFileSync(f, 'utf8');
  if (!listed.includes(rel)) fail('NOT LOADED ' + rel);
  try { new vm.Script(src, { filename: f }); }
  catch (e) { fail('SYNTAX    ' + rel + ': ' + e.message); }
  src.split('\n').forEach((line, i) => {
    if (ALLOW.test(line)) return;
    const code = line.replace(/\/\*.*?\*\//g, '').split('//')[0];
    for (const [re, why] of BANNED) {
      if (re.test(code)) fail('ART RULE  ' + rel + ':' + (i + 1) + '  ' + why + '\n            ' + line.trim());
    }
  });
}

/* the lint has to actually work, so prove it on a known-bad string */
const probe = 'ctx.arc(0,0,5,0,6.28);';
if (!BANNED.some(([re]) => re.test(probe))) fail('LINT BROKEN: the banned-call check does not match ctx.arc()');

console.log(bad
  ? '\n' + bad + ' problem(s)'
  : 'ok - ' + files.length + ' files, ' + listed.length + ' scripts, art rule clean');
process.exit(bad ? 1 : 0);
