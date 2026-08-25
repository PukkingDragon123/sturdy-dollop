# MASTER PROMPT — "CROWNDEEP"
### King of Atlantic, rebuilt as a hand-drawn pixel-art Terraria-like

Paste this whole file to Claude to build or continue the game. It is the single
source of truth. Where it says MUST, it is a hard constraint and a build check
enforces it.

---

## 0. One-paragraph pitch

A 2D side-view sandbox RPG set in a drowned Atlantis. You are the deposed King
of the Atlantic — fat, broke, crownless, still in love with a beer keg wearing a
tiara. You dig, build, craft, fight and level your way down through the seabed
to take your crown back off Baron Foamhelm. Everything on screen is hand-placed
pixels. Every world is generated fresh. Every weapon you forge is a little
different from the last one.

Think **Terraria**, underwater, with a fat king and a beer problem.

---

## 1. THE ART RULE (this is the important part)

**MUST: 100% hand-drawn pixel art. No circles. No curves. No smooth anything.**

Concretely, the following are BANNED everywhere in `js/`:

| Banned | Why |
|--------|-----|
| `ctx.arc`, `ctx.arcTo`, `ctx.ellipse` | circles |
| `ctx.bezierCurveTo`, `ctx.quadraticCurveTo` | curves |
| `createLinearGradient`, `createRadialGradient`, `createConicGradient` | smooth ramps |
| `ctx.filter`, `shadowBlur` | blur |
| `roundRect` | rounded corners |
| Any web font, any `ctx.font` with a real typeface | text must be drawn pixels |

`npm run check` greps for every one of these and **fails the build** if it finds
one. There is no allowlist and no exception.

What you use instead:

- **Sprites.** Every visual is a hand-authored matrix of characters, one
  character per pixel, compiled once at boot into an offscreen canvas and
  blitted with `drawImage`.
- **Dithering** for gradients. A 4x4 Bayer matrix, or hand-placed checker and
  stipple ramps. Two colours mixed by pattern, never by interpolation.
- **1px outlines.** Every sprite gets a dark outline (or selective outlining:
  dark on the lit side, darker on the shadow side).
- **Hand-drawn font.** A 5x7 bitmap font authored as sprite data: A–Z, a–z,
  0–9, punctuation. Plus a 3x5 tiny font for dense UI. No `fillText`, ever.

### 1.1 Resolution and scaling

```
INTERNAL: H = 216 fixed, W = clamp(round(216 * aspect), 320, 560)
SCALE:    integer only — floor(min(cssW / W, cssH / H)), minimum 1
FILTER:   imageSmoothingEnabled = false on every context
```

Render the whole frame into an offscreen canvas at internal resolution, then
blit it once to the visible canvas at integer scale. Pixels stay square and
crisp. Never draw UI at a different scale than the world — one grid, one look.

### 1.2 The palette

One master palette for the entire game, 48 colours in ramps of 4–5. Every sprite
references palette indices, never hex. This is what makes a hand-drawn game look
like one artist made it instead of forty.

```
Ramps (dark -> light), 4 steps each unless noted:
  INK     near-black outline ramp (5)   #0b0f1a #131a2b #1d2740 #2b3a5c
  DEEP    abyss blues (5)               #071726 #0d2942 #14405f #1d5c82 #2a7ba8
  WATER   mid-ocean teals (4)           #1b6b7d #2a94a8 #46c2cf #8ee9ee
  SAND    seabed (4)                    #6b5535 #9c7d4a #c9a86a #efd9a0
  STONE   rock (4)                      #3a4250 #556172 #7b8798 #a6b2c2
  CORAL   pinks/reds (4)                #7a1f3a #b8365c #e86a8a #ffa8bd
  KELP    greens (4)                    #1e4a2e #2f7a44 #4fb063 #8ee08c
  GOLD    crown/beer (4)                #6b4410 #a8731c #e0a832 #ffd97a
  SKIN    the king (4)                  #7a4a30 #b07a52 #d8a97c #f2d3ac
  RUST    iron/tools (4)                #4a2c22 #7a4a32 #ab7048 #d69c6a
  BONE    whites (3)                    #6d7180 #a8adba #e8ecf5
  ROT     poison/abyss purple (4)       #2d1440 #4d2470 #7a3fa8 #b06fd8
  BLOOD   damage/lava (4)               #4a0f14 #8a1c20 #cc3a2e #ff7a48
```

Sprites may declare a **sub-palette**: a per-sprite map of characters to master
indices. Recolouring an NPC's shirt or a sword's blade is then a one-line
variant, not a redrawn sprite.

### 1.3 Sprite format

```js
PX.def('king_idle', {
  pal: { '1':'INK.0', '2':'SKIN.1', '3':'SKIN.2', '4':'GOLD.2', '.':null },
  w: 12, h: 18,
  px: [
    '...1111.....',
    '..133331....',
    '.13333331...',
    ...
  ]
});
```

- `.` or space = transparent.
- Compiled at boot into one packed atlas canvas; `PX.blit(name, x, y, opts)`
  draws from it. `opts`: `flipX`, `tint` (index swap), `alpha` (dither-based,
  not real alpha, for the fade look).
- Animations are `name` + frame index: `PX.anim('king_walk', t, 6)`.

### 1.4 Art direction, per subject

- **Tiles** are 8x8. Every solid tile type needs a **47-variant autotile set**
  (blob tiling) so terrain edges look carved, not gridded. Plus 3 random
  interior variants per tile so large fills do not tile visibly.
- **The king** is 12x18, chunky, pear-shaped, white beard, bare pale forehead
  band where the crown used to be, a red cape of 4 hand-drawn frames. Normal
  butt. He should read as *sad and round* in one glance.
- **Enemies** 10x10 to 32x32, silhouette-first: you must be able to name the
  enemy from its black silhouette alone.
- **Buildings** are built from a kit of hand-drawn 8x8 parts (wall, beam,
  window, shell-roof tile, door, lantern, sign board), not one big sprite, so
  the world generator and the player can both build with them.
- **UI** is a 9-slice frame from hand-drawn corner/edge/centre tiles. Slots,
  bars, buttons, icons all pixel-authored.

---

## 2. THE WORLD

### 2.1 Structure

A tile grid, generated fresh per save.

```
WORLD:  1400 x 420 tiles at 8px  (11200 x 3360 px of playfield)
CHUNKS: 32x32 tiles, meshed lazily, only visible chunks drawn
LAYERS (top to bottom):
  0   Sky/Surface     y   0- 40   above water: gulls, ruined piers, sun
  1   Shallows        y  40- 90   bright water, sand, coral, seagrass, crabs
  2   Reef            y  90-150   coral forests, caves, first ores, sharks
  3   Ruins           y 150-230   Atlantean masonry, corridors, traps, statues
  4   Trench         y 230-330    dark, pressure, glowpods, beer bandits
  5   Abyss          y 330-420    rot purple, lava vents, the Baron's throne
```

### 2.2 Generation (procedural, seeded, no hand-authored maps)

Run in this order:

1. **Surface line** — 1D fractal noise (4 octaves) for the seabed, plus a
   flat-ish spawn shelf near the middle.
2. **Layer fill** — stone/sand/mud by depth band with dithered transition
   bands between layers, not hard lines.
3. **Caves** — Perlin worms plus 3 passes of cellular automata smoothing.
   Different cave scale per layer: tight in Reef, cathedral-sized in Trench.
4. **Ore veins** — blob growth from seeds, rarity and depth window per ore.
5. **Structures** — placed by a rule table with collision rejection:
   - Coral Village (surface, always one, near spawn) — 5–9 buildings from the
     building kit, an NPC per building
   - Sunken chapels, colonnades, flooded vaults (Ruins layer)
   - Bandit camps with loot chests (Trench)
   - Glowpod groves, air pockets, shipwrecks (any layer)
   - Baron's throne room (Abyss, far end, always one)
6. **Decoration** — kelp, anemones, urchins, bones, hanging chains, wall moss,
   using the surface normal of the tile they attach to.
7. **Chest loot** — depth-weighted tables.

Same seed MUST produce the same world. Store the seed in the save.

### 2.3 Lighting

Tile-based flood-fill light, not a shader. Each tile has a light byte. Sunlight
enters from above and attenuates with depth and through solid tiles; torches,
glowpods, lava and lanterns are point sources. Light is applied as a **dither
mask** over the tile — 5 discrete brightness steps, each a hand-drawn stipple
pattern. Pitch black at the bottom of the Abyss unless you bring light. This is
both the atmosphere and a core gameplay pressure.

### 2.4 Water

Water is a tile type with a flow simulation (cellular, 8 levels per tile) so
digging into a reservoir actually floods your tunnel. Being submerged changes
movement (you swim, gravity is weak, you can rise) and drains **breath**;
surfacing or an air pocket refills it. Air pockets are therefore worth building.

---

## 3. GAMEPLAY

### 3.1 Moment to moment

- Walk, jump, swim, grapple (hook), dig, place, attack, use.
- Mine any tile with the right tool tier. Tile hardness vs tool power.
- Place any tile you carry, including walls (background layer) which block
  enemy spawns — Terraria's core building loop.
- Fall damage, drowning, pressure damage below the Trench without gear.

### 3.2 Progression spine

```
wake up broke  ->  dig sand, craft a flint pick  ->  reach Reef, first ore
->  workbench + furnace  ->  bronze tools, first weapon  ->  clear a Ruin,
find a Crown Fragment  ->  anvil, armour  ->  Trench, glow gear, pressure suit
->  bandit camps, fragment  ->  Abyss  ->  Baron Foamhelm  ->  crown restored
```

Five Crown Fragments, one per layer below the surface, each behind a different
verb (mining, a boss, a puzzle, combat, the finale).

### 3.3 Procedural crafting — THE headline system

Recipes are **not** fixed item outputs. A recipe is a *shape*, and the materials
you put in decide what comes out.

```
RECIPE: "blade"      needs: 1 handle-material + 3 edge-material  at: anvil
RECIPE: "pick"       needs: 1 handle-material + 2 head-material  at: anvil
RECIPE: "tunic"      needs: 4 cloth-material  + 1 trim-material  at: loom
```

The result is generated:

```
damage      = shape.baseDmg  * edgeMat.power   * (1 + quality*0.25)
speed       = shape.baseSpd  * handleMat.speed
reach       = shape.baseReach + handleMat.length
crit        = edgeMat.crit + prefix.crit
durability  = edgeMat.hardness * handleMat.integrity
sprite      = shape.sprite recoloured to edgeMat.palette + handleMat.palette
name        = prefix + edgeMat.adjective + shape.noun
             ("Brackish Bronze Cleaver", "Kingly Abyssal Halberd")
```

Plus a **prefix roll** on every craft (Terraria-style modifiers): weighted
table from Rusted (-15%) up to Kingly (+30%) and rare Legendary prefixes that
add an effect, not just numbers. Crafting the same recipe twice never gives the
same item. Materials are the axis of progression; prefixes are the gamble.

Keep the gamble from the last build: a **Reroll Anvil** costs materials to
re-prefix an item you like the base of.

Stations: Workbench, Furnace, Anvil, Loom, Alchemy Vat, Reroll Anvil, Cook Pot
(beer!). Each is a craftable placeable that unlocks recipe shapes near it.

### 3.4 Levels and skill tree

- XP from mining, crafting, kills, discoveries, quests.
- Level up -> 1 skill point (+1 bonus every 5th level).
- A real **tree**, drawn as pixel nodes and connecting pipes, three trunks:
  - **DELVER** — mining speed, ore luck, light radius, breath, fall immunity
  - **BRAWLER** — melee damage, crit, armour, knockback, lifesteal
  - **TIDECALLER** — swim speed, grapple, summon a mount, water control
- 8–10 nodes per trunk, cheap early nodes and expensive capstones, with
  cross-links between trunks so hybrid builds exist. Respec at a cost.

### 3.5 Combat

- Melee (swing arc), thrown (spear), and a charge-attack for heavy weapons.
- Enemies: reef crawler, snapper crab, urchin, jelly, reef shark, bandit
  (ranged), ruin sentinel, trench horror, and Baron Foamhelm.
- Each has telegraph -> attack -> recover, so fights are readable.
- Day/night cycle: night raises spawn rates and lets surface enemies through.
- Bosses summoned with crafted items, arena-aware, multi-phase.

### 3.6 NPCs and housing (Terraria's best idea)

Build a valid room — floor, walls, roof, a door, a light source, minimum
interior volume — and an NPC moves in. Each NPC sells and does something:

| NPC | Moves in when | Gives you |
|-----|--------------|-----------|
| Stablemaster | you own a mount | mounts, feed |
| Smith | you place an anvil | ore trades, reforging |
| Tackler | you catch 10 fish | tackle, sells your fish |
| The Princess (a beer keg in a dress) | you brew any beer | beer, and the plot |
| Bookie | you win a race | betting, race entry |
| Scholar | you find a fragment | lore, fragment hints |
| Guard (police cap, shades) | you clear a bandit camp | keeps an area safe |

Housing validation runs on a flood fill over the wall layer. Show the player
*why* a room is invalid — that feedback is the whole feature.

### 3.7 Kept from the previous build (do not throw these away)

The mounts, the racing, and the beer/fat system were good. Port them in:

- **Mount ladder**: sea horse -> clownfish -> war crab -> bluefin tuna ->
  dolphin -> swordfish -> whale. Ridable, each with a pixel rig, each faster
  and dumber than the last. Mounts now also *dig* (the crab) or *dash* through
  water (the swordfish), so they matter outside racing.
- **Racing**: five cups, betting on yourself or against yourself, entered from
  the Bookie.
- **Beer and fat**: beer buffs damage and courage, adds fat; fat slows you and
  is burned by mining, swimming and fighting. The Princess is a beer keg. The
  king got fat for love. This is the joke the whole game hangs on — keep it.

---

## 4. TECH CONSTRAINTS

- Vanilla JS. Classic `<script>` tags, no modules, no bundler, no dependencies.
  Must run by opening `index.html` off the filesystem.
- One global namespace. Every file attaches to it.
- 60fps with the full world loaded. Chunked tile meshing, dirty-rect UI,
  cached sprite atlas, no per-frame allocation in the hot loop.
- localStorage save: world tiles (RLE-compressed), player, inventory, skills,
  NPCs, seed.
- Mobile: virtual stick + labelled buttons, and a *tap-to-dig* mode where
  tapping a tile within reach mines it. Inventory and crafting must be usable
  with a thumb.
- Responsive: internal resolution fixed in height, integer-scaled, letterboxed.

### 4.1 File layout

```
index.html
js/px/       pixel engine: canvas, palette, atlas, blit, font, dither, ui9
js/art/      SPRITE DATA ONLY — tiles, king, enemies, npcs, items, fx, font
js/world/    gen, chunks, tiles, lighting, water, structures
js/sim/      physics, mining, combat, ai, spawner, daynight
js/rpg/      items, materials, recipes, prefixes, skills, xp, quests, housing
js/ui/       hud, inventory, crafting, skilltree, dialog, map, tooltips
js/scenes/   title, play, race, death, victory
js/game.js   boot, scale, loop
tools/check.js   parse + load audit + THE BANNED-CALL LINT
tools/smoke.js   headless Chromium driver, screenshots, fails on console errors
```

### 4.2 Definition of done

1. `npm run check` passes — every file parses, every file is loaded, and the
   banned-call lint finds nothing.
2. `tools/smoke.js` drives title -> world -> mine -> craft -> skill tree ->
   fight -> race with **zero console errors**, at internal widths 320, 428 and
   560, and in touch emulation.
3. Screenshots reviewed by eye at every step. If a sprite reads badly, redraw
   it — "it renders" is not the bar.
4. README rewritten. Commit and push to the working branch. No PR unless asked.

---

## 5. HOW TO ATTACK IT

Build in this order; each stage must run before the next starts.

1. **Pixel engine + font + palette + the lint.** Get one hand-drawn sprite on
   screen at integer scale, and get the lint failing on a deliberate `arc()`.
2. **Tiles and the camera.** Autotiling, chunk meshing, a hand-flown camera
   over a hand-made test map.
3. **World gen.** Layers, caves, ores, decoration. Look at it. Tune it.
4. **Player physics + mining + placing + water + lighting.** This is the game.
5. **Items, inventory, procedural crafting, stations.**
6. **Combat, enemies, AI, day/night.**
7. **Skill tree, XP, quests, fragments.**
8. **NPCs, housing validation, village gen.**
9. **Port mounts, racing, beer/fat.**
10. **Boss, ending, polish, mobile pass, verification, README.**

Do not stub art. A placeholder square is a lie that hides how the game reads.
Draw the real sprite, look at it, redraw it if it is ugly.
