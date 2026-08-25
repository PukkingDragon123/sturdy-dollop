/* Which sprites does the game ASK for, and which of those exist?
   Catches every missing tile kit part, deco, item icon and UI piece at once. */
const { load } = require('./load.js');
const fs = require('fs'), path = require('path');

const files = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
  .match(/<script src="([^"]+)"/g).map((m) => m.slice(13, -1))
  .filter((f) => fs.existsSync(path.join(__dirname, '..', f)));
const w = load(files.filter((f) => !/game\.js$/.test(f)));
const KD = w.KD;
for (const k in KD.art) if (KD.art[k] && KD.art[k].build) KD.art[k].build();
KD.State.buildResources();

const have = new Set(KD.PX.names());
const want = new Map();          // name -> why
const need = (n, why) => { if (n) want.set(n, (want.get(n) || '') + ' ' + why); };

/* tile autotile kits + ore overlays + deco */
const PARTS = ['mid', 'mid2', 'mid3', 'top', 'bot', 'left', 'right', 'tl', 'tr', 'bl', 'br', 'h', 'v', 'cap', 'single'];
for (const t of KD.Tiles.T) {
  if (t.art) for (const p of PARTS) need(t.art + '_' + p, 'tile:' + t.id);
  if (t.ore) { need(t.ore, 'ore:' + t.id); need(t.ore + '2', 'ore:' + t.id); }
  if (t.deco) need(t.deco, 'deco:' + t.id);
}
/* every inventory resource icon */
for (const id in KD.State.RES) need(KD.State.RES[id].sprite, 'res:' + id);
/* every recipe shape icon, and the per-material variants the crafter asks for */
if (KD.Recipes) {
  for (const s of KD.Recipes.all) {
    need(s.sprite, 'recipe:' + s.id);
    if (!KD.Mats) continue;
    for (const m of KD.Mats.all) {
      const roles = (s.needs || []).map((n) => n.role);
      if (!roles.some((r) => m.roles.indexOf(r) >= 0)) continue;
      /* the crafter falls back to the base sprite, so a missing variant is
         a "nice to have", tracked separately */
      const v = s.sprite + '_' + m.id;
      if (!have.has(v)) want.set('~' + v, 'variant');
    }
  }
}
/* UI kits, icons and the skill tree */
for (const k of ['pnl', 'slot', 'slotsel', 'btn', 'btnhot']) {
  for (const p of ['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br']) need(k + '_' + p, 'ui:' + k);
}
for (const n of ['ic_heart_full', 'ic_heart_half', 'ic_heart_empty', 'ic_bubble', 'ic_coin',
                 'ic_crown', 'ic_pick', 'ic_sword', 'ic_star', 'ic_lock', 'ic_beer', 'ic_skull',
                 'cur_dig', 'cur_place', 'sk_node_locked', 'sk_node_open', 'sk_node_taken',
                 'bar_cap_l', 'bar_cap_r', 'bar_mid']) need(n, 'ui');
/* actors */
for (const k in KD.Mobs.KINDS) need(KD.Mobs.KINDS[k].spr, 'mob:' + k);
for (const n of ['king_idle0', 'king_walk0', 'king_swim0', 'king_mine0', 'king_hurt']) need(n, 'king');

/* A name that resolves through the alias table is FINE - it draws real art.
   Only a name with nothing behind it will fall back to a placeholder. */
const GENERIC = new Set(['it_bar', 'it_brick_i', 'it_pick', 'it_shortblade', 'it_helm', 'stone_mid']);
const missing = [], variants = [], aliased = [];
for (const [n, why] of want) {
  if (n[0] === '~') { variants.push(n.slice(1)); continue; }
  if (have.has(n) || (KD.PX.hasAny && KD.PX.hasAny(n))) continue;
  const resolved = KD.State.art ? KD.State.art(n) : null;
  if (resolved && have.has(resolved) && !GENERIC.has(resolved)) { aliased.push(n + '->' + resolved); continue; }
  missing.push([n, why.trim()]);
}
const byWhy = {};
for (const [n, why] of missing) { const k = why.split(' ')[0].split(':')[0]; (byWhy[k] = byWhy[k] || []).push(n); }

console.log('sprites defined: ' + have.size + '   sprites required: ' + (want.size - variants.length));
console.log('MISSING: ' + missing.length + (missing.length ? '' : '  - nothing'));
for (const k of Object.keys(byWhy).sort()) {
  console.log('  ' + k + ' (' + byWhy[k].length + '): ' + byWhy[k].slice(0, 14).join(' ') + (byWhy[k].length > 14 ? ' ...' : ''));
}
console.log('resolved through an alias: ' + aliased.length + (aliased.length ? '  ' + aliased.slice(0, 8).join(' ') : ''));
console.log('optional material variants not drawn: ' + variants.length +
            (variants.length ? '  (crafter falls back to the base sprite)' : ''));
/* unused sprites are not an error, but worth knowing about */
const unused = [...have].filter((n) => !want.has(n) && !/^g[35]_/.test(n));
console.log('defined but never asked for: ' + unused.length +
            (unused.length ? '  e.g. ' + unused.slice(0, 10).join(' ') : ''));
process.exit(missing.length ? 1 : 0);
