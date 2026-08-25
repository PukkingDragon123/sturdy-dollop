# CROWNDEEP

A hand-drawn pixel-art sandbox RPG in a drowned Atlantis. Dig, build, craft,
fight and level your way down through six layers of seabed to take your crown
back off Baron Foamhelm.

Think **Terraria**, underwater, with a fat king and a beer problem.

> You were KING OF THE ATLANTIC. Then you met her: a beer keg in a little dress
> with a crooked tiara. You got fat, you lost the battle, and somebody walked
> off with your crown in five pieces.

**Play it:** open `index.html` in any browser. No build step, no dependencies,
no server — it runs straight off the filesystem. `npm start` if you want one.

---

## The art rule

**Not one circle, curve, gradient, blur or web font in the entire game.**

Every visible pixel is placed by hand. `npm run check` greps the whole source
for `arc`, `arcTo`, `ellipse`, `bezierCurveTo`, `quadraticCurveTo`,
`createLinearGradient`, `createRadialGradient`, `createConicGradient`,
`createPattern`, `shadowBlur`, `shadowColor`, `ctx.filter`, `roundRect`,
`fillText`, `strokeText`, `measureText`, `ctx.font` and
`imageSmoothingEnabled = true`, and **fails the build** on any hit. The lint
self-tests against a known-bad string so it cannot quietly stop working.

What that means in practice:

- **Sprites are character matrices.** One character per pixel, compiled once
  at boot into a packed atlas and blitted from there.
  ```js
  P.def('king_idle0', {
    pal: { '1': 'INK.0', '2': 'SKIN.2', '3': 'KELP.1', '.': null },
    px: ['..111..', '.12321.', '1233321', ...]
  });
  ```
- **One palette, 64 colours in 15 ramps.** Sprites name colours as `RAMP.step`,
  never as hex, so the whole game recolours from `js/px/pal.js` and always
  agrees with itself.
- **The font is drawn glyph by glyph.** A 5x7 body face (90 glyphs) and a 3x5
  face for dense numbers. There is no `fillText` anywhere.
- **Darkness is banded, not dithered.** Six pre-darkened copies of the atlas,
  picked per tile by light level. Dithering near-black over a mid tone at 50%
  is just noise — a pixel artist reaches for a darker colour instead. Dither
  is kept for what it is good at: transition bands and translucency.
- **Integer scaling only.** The game renders into a 216px-tall buffer and is
  blitted to the page at a whole-number scale with smoothing off, so pixels
  stay square at every window size.

---

## The world

1400 x 420 tiles at 8px, generated fresh from a seed and rebuildable from it.

| Layer | Depth | What is down there |
|---|---|---|
| Sky | 0–40 | above the water |
| Shallows | 40–90 | bright sand, seagrass, crabs, the village |
| Reef | 90–150 | coral, first ore, sharks, tight caves |
| Ruins | 150–230 | Atlantean masonry, pillars, statues, sentinels |
| Trench | 230–330 | dark, glowpods, bandit camps, pressure |
| Abyss | 330–420 | rot-stone, abyssal ore, the throne room |

Generation runs in eleven visible steps: fractal seabed, cellular caves plus
190 Perlin worms, two smoothing passes, depth-windowed ore veins, ruins and
bandit camps placed by rule with collision rejection, a coral village of seven
houses, the throne room, the flood, chest loot, decoration, then lighting.

**Light** is a tile flood fill, applied as banded shade. Sunlight dims through
water and is gone by the bottom of the reef; below that you bring your own.
Caves are genuinely black.

**Water** is cellular, eight levels per tile. Dig into a reservoir and your
tunnel floods. Sealed rooms stay dry — which is exactly what makes an air
pocket worth building.

---

## Playing it

| Key | Action |
|-----|--------|
| `WASD` / arrows | walk, swim, climb |
| `Space` | jump, or rise while swimming |
| hold left mouse / `J` | dig the tile under the cursor |
| `F` / right mouse | swing what you are holding |
| `E` | place, open a chest, use a station, open a door |
| `1`–`8`, wheel | pick a hotbar slot |
| `C` | crafting · `V` skills · `I` bag · `Esc` pause |
| `F2` (title) | sprite viewer |

**Touch** is detected automatically: a stick on the left, `DIG` `HIT` `UP`
`USE` `BAG` `MAKE` on the right. A tap that never travels still counts as a
tap, so buttons under the stick zone stay reachable.

### Procedural crafting

A recipe is a **shape**, not a fixed output. The materials you feed it decide
what comes out.

```
pick     = 1 handle-material + 2 head-material    at bare hands
cleaver  = 1 handle-material + 3 edge-material    at an anvil
```

Damage, speed, reach, crit, durability, sprite colours and the item's *name*
are all derived from the materials, then a weighted prefix is rolled on top —
from Rusted (−15%) through no prefix at all (the most common outcome) to Kingly
(+30%), plus three legendary prefixes that grant a real effect rather than just
numbers. 22 materials across 12 roles and 37 shapes, so **crafting the same
recipe twice never gives you the same item**. A *Sturdy Copper Pick* and a
*Dull Iron Cleaver* were generated, not written.

Stations: workbench, furnace, anvil, loom, alchemy vat, reroll anvil, cook pot.
Each is a craftable placeable that unlocks its own recipe list when you stand
next to it. Bare hands can make a pick, a shovel, a torch, a block and a
workbench — that is the first two minutes.

### Levels and skills

XP from mining, crafting, kills and looting. Each level pays a skill point,
plus a bonus every fifth. 27 nodes across three trunks — **DELVER** (mining
speed, ore luck, light, breath, fall safety), **BRAWLER** (damage, crit,
armour, knockback, lifesteal) and **TIDECALLER** (swim, grapple, mounts, water
control) — laid out on one shared grid with cross-links, so hybrids exist.

### Combat and the crown

Nine enemy kinds, each with a telegraph → strike → recover cycle so fights are
readable. They spawn off-screen, gated by depth and darkness, so a lit room is
a safe room. Armour is worn in real slots. Beer buffs your damage and adds fat;
fat slows you and burns off as you swim and swing.

Five **Crown Fragments**, one per layer below the surface, each in that layer's
deepest chest. Bring all five to the throne room and Baron Foamhelm stands up.

---

## Layout

```
index.html            the script list, in load order
css/style.css         page chrome; everything visible is drawn pixels
js/px/                engine: palette, sprite atlas, render target, dither,
                      pixel text, input, sound, particles
js/art/               SPRITE DATA ONLY - font, tiles, built pieces, actors, items
js/world/             tile table, tile store, generator, lighting, water, renderer
js/sim/               player physics and verbs, enemies and combat
js/rpg/               materials, recipes, prefixes, skills, game state and save
js/ui/                widgets, HUD, bag / crafting / skill-tree panels
js/scenes/            title, generation, play, pause, death, victory, sprite test
js/game.js            boot, scene manager, frame loop
MASTER_PROMPT.md      the full spec this was built from
```

## Dev tools

```bash
npm run check                          # parse + load audit + THE ART RULE lint
node tools/sprite.js js/art/tiles.js   # ASCII + a PNG contact sheet of any art file
node tools/sprite.js js/art/actors.js king    # filter to inspect one thing large
node tools/worldmap.js 12345           # generate a world headlessly, write a PNG map,
                                       # print layer openness, tile mix and ore totals
node tools/smoke.js script.json        # headless Chromium; fails on any console error
MOBILE=1 node tools/smoke.js s.json    # the same, in touch emulation
VIEW=700x620 node tools/smoke.js s.json  # force a viewport to test a layout width
```

`tools/sprite.js` exists because **art authored blind is bad art**. Every
sprite in this game was rendered to a contact sheet and looked at.
`tools/worldmap.js` exists for the same reason: the first generated world was
too closed to walk through and almost pitch black, and only the map showed it.

`tools/load.js` runs the browser scripts in a Node VM where `window` *is* the
global, so the data tables can be fuzzed — 12,741 crafts and rerolls across
every shape × material × luck combination, and a 20,000-sample check that luck
bends the prefix table without ever guaranteeing the top tier.

## Saving

localStorage, key `crowndeep.save.v1`. The world is run-length encoded, so a
588,000-tile map fits comfortably. NEW WORLD wipes it.
