# King of Atlantic

A goofy side-scrolling underwater RPG that runs in a browser. No build step, no
dependencies, no pixel art — every fish, coral, tankard and royal belly is drawn
with vector paths and gradients at runtime.

> You were KING OF THE ATLANTIC. Then you met her: a beer keg in a little dress
> with a crooked tiara. You got fat, you lost the battle, and somebody walked off
> with your crown in five pieces. Time to earn some clams, buy some beer, and take
> it back.

**Play it:** open `index.html` in any modern browser. Works straight off the
filesystem (`file://`) — classic `<script>` tags, no modules, no server needed.
Or run `npm start` for a local web server on port 8080.

---

## The loop

1. **Spear fish** at fishing spots. Charge the throw on an oscillating power
   meter, land the spear, then win the tug-of-war before the line snaps.
2. **Sell the catch** at Bait & Tackle for clams, or keep it to feed your mount.
3. **Feed your mount** in the feeding minigame — tip your whole larder into the
   water and swim around catching it. Chain catches for a combo multiplier. Do
   not catch the boot.
4. **Gamble the level-up.** Mounts do not have a skill tree. Every level gives
   you a token, and a token buys one pull on the ROLLING MACHINE: pick a stat
   category, pull, and pray. DUD to LEGENDARY. DOUBLE DOWN doubles the payout or
   busts the whole token.
5. **Race.** Five cups from the Puddle Cup to the Atlantic Grand. Bet on your own
   mount or against it. Rivals are seeded partly off your own power, so a bad
   roll really is a bad race.
6. **Fight, drink, upgrade.** Better weapons, better spears, better food, better
   mounts, and beer that buffs your damage while it makes you fatter and slower.
7. **Recover five crown fragments** and take the throne back off Baron Foamhelm.

## Mounts

Seven species, a real ladder rather than palette swaps — some walk the seabed,
some only swim, all of them are ridable.

| # | Mount | Clams | Notes |
|---|-------|-------|-------|
| 0 | Sea Horse | free | Starter. Tiny, upright, curls its tail when it idles. |
| 1 | Clownfish | 380 | Fast and flappy, no stamina to speak of. |
| 2 | War Crab | 1,250 | Walks. Eight legs, two claws, zero grace. |
| 3 | Bluefin Tuna | 4,200 | The first mount that actually feels like a vehicle. |
| 4 | Dolphin | 12,000 | Anatomical: melon, blowhole, falcate dorsal, notched flukes. |
| 5 | Swordfish | 34,000 | A rapier with fins. |
| 6 | Whale | 90,000 | Slow, unstoppable, enormous. |

Each mount has speed / stamina / power / grace / luck, gains EXP from food and
races, and can pick up traits (Zoomy, Well Fed, Grumpy, Royal Blood...) from
LEGENDARY rolls.

## Places

Seven outdoor areas — **Home Shallows, Coral Village, Seahorse Meadow, Crab
Flats, Sunken Colonnade, The Beer Trench, Throne of Atlantic** — connected by
side-scrolling travel, each darker and meaner than the last. Six interiors —
**Your Shack, Bait & Tackle, The Foamy Keg, The Stable, The Armoury, Race
Office** — every one hand-decorated with its own walls, floor, lamps, bunting,
portholes and clutter.

Fourteen NPC kinds live out there, including a gull who has opinions, a guard in
a police cap and shades, a hermit crab with a grudge, and the Princess herself
(still a beer keg, still in the dress).

## Combat and gear

Six weapon tiers, each with its own silhouette, damage, swing speed, reach and
knockback: **Bar Stool → Sharpened Bone → Bronze Trident → Coral Halberd →
Kingsfork → Poseidon's Regalia.** Six enemy kinds from reef crawlers up to the
Baron, with drops. Four beers that trade damage buff against fat, and fat is a
real stat: it slows you down until you burn it off swimming and swinging.

## Controls

**Keyboard**

| Key | Action |
|-----|--------|
| `WASD` / arrows | walk the seabed, swim the water column |
| `Space` / `K` | jump, or rise while swimming |
| `J` / `Z` / click | attack |
| `L` / `X` | dash |
| `F` | mount / dismount |
| `E` / `Enter` | talk, doors, fishing spots, shop counters |
| `M` | mount screen (feed, roll, race) |
| `Esc` | pause / kingdom summary |
| `F2` | rig test scene |

**Touch** — detected automatically. A virtual joystick claims the left half of
the screen, and labelled buttons (`HIT`, `UP`, `USE`, `DSH`, `RIDE`) sit on the
right, relabelled per scene. Every scene defines its own button set, so fishing
gets `THROW`, the race gets `SURGE` / `HOP`, and so on. Portrait phones get a
"rotate me" nag.

---

## How it is built

Vanilla JS, one canvas, one global namespace (`KA`), 31 files loaded in order by
`index.html`.

```
index.html            script list, viewport, favicon
css/style.css         page chrome, touch-action guards
js/lib/               engine
  core.js             KA namespace, design-space sizing, math/random helpers
  draw.js             vector primitives: gradients, blobs, ribbons, capsules
  text.js             real font stack, wrapping, blocks
  input.js            keyboard, mouse, touch pad + named buttons
  audio.js            WebAudio blips, no asset files
  fx.js               particles, shake, hitstop, flash, camera
  rig.js              springs, soft bodies, verlet chains, 2-bone IK, body loft
  ui.js               palette, buttons, panels, bars, tabs, scroll, toasts
  dialog.js           typed dialogue with live animated portraits
js/data/              content tables: pets, items, rolls, areas, npcs, quests, races
js/model/             pet.js (levels, EXP, rolls), state.js (save, money, hp, fat, beer)
js/rigs/              king.js, pets.js (7 species), sea.js (props/creatures), folk.js (NPCs)
js/scenes/            menus, world, shop, petview, fishing, feeding, race, rigtest
js/game.js            responsive fit, scene manager, main loop, HUD
tools/                check.js (parse + load audit), smoke.js (headless driver)
```

**Design space.** The game renders into a fixed 360px-tall space whose width
follows the window aspect (clamped 460–980), then scales up by
`devicePixelRatio`. One layout, sharp on a phone and on a 4K monitor.

**Procedural animation.** Nothing is a sprite. Characters are built from scalar
springs, 2D soft bodies, verlet chains and two-bone IK over a travelling-wave
spine, so the king's cape trails, his belly wobbles, his feet plant where the
IK actually lands, and every mount's fins and tail are driven by the same wave
that moves its body. Anatomy is placed by fraction of body length, which is why
the dolphin reads as a dolphin.

**Saving.** localStorage, key `kingofatlantic.save.v1`. START OVER wipes it.

## Dev tools

```bash
npm run check                  # every js file parses and is listed in index.html
node tools/smoke.js my.json    # headless Chromium: drive the game, screenshot, fail on console errors
MOBILE=1 node tools/smoke.js my.json   # same, in touch emulation at 844x390
```

A smoke script is a JSON array of ops: `["shot","name"]`, `["click",x,y]`,
`["tap",x,y]`, `["drag",x0,y0,x1,y1,ms]`, `["key","KeyE"]`,
`["hold","Space",ms]`, `["wait",ms]`, `["eval","expr"]`. Coordinates are in
design space; the driver reads `KA.W` from the page and scales for you.
Screenshots land in `tools/shots/`.
