# CROWNDEEP

A hand-drawn pixel-art sandbox RPG in a drowned Atlantis. Train, dig, build,
craft and fight your way east through eight zones of ocean to take your crown
back off the man who is sitting in your chair. It opens with a castle prologue
you walk through, and it ends with him.

Think **Terraria**, underwater, with a fat king and a weight problem.

> You were KING OF THE ATLANTIC. Then you met her: a beer keg in a little dress
> with a crooked tiara. You got fat, you lost the fight, and The Deep took your
> crown, your throne and your ocean, and put an army of octopuses in it.

**Act One is playable, not narrated.** The game opens inside your castle, four
rooms end to end, back when you still had it: take the queen to dinner, eat it,
fight the sharks that come in off the sea balcony, throw the leftovers at the
cook. Then a keg texts you. You put the trident down, you drink, you cheat, and
you lose all of it in one night - the queen, the keg, the throne and the room
you are standing in. Whatever weight you put on in there is the weight you are
carrying when a manta pulls you out of the sand, so the prologue is not a
cutscene you skip: it sets your starting number.

**What you say is the mechanic.** The night the keg comes over used to be two
timing bars - pour the beer, then hit a rhythm meter for the kiss. Both were the
same button pressed to a moving marker and neither of them said anything, so
they are one conversation now. Every scene that matters gives you lines to
choose between: how warm you are to the queen at the alarm, whether you are
cruel to the cook about his crab, whether you take the drink, whether you put
the trident down when she asks.

**And everybody leaves you for the specific reason you gave them.** Those four
answers are read back out in the scene where you lose everything. Promise the
queen dinner and mean it and she goes quietly, which is worse; never promise it
and she tells you she sat there anyway. Be cruel to the cook and he takes the
castle with the exact sentence he warned you with; be civil and he says he
remembered, and that it is the difference between the gate and the pot. Put the
trident down for the keg and she tells you that was the night she stopped being
interested. The prologue also reads them when it works out what you weigh, which
is your starting number for the rest of the game.

**What is on your throne.** The cook runs the castle now, and at the bottom of
the Drop he is sitting in your chair with the keg on a cushion beside him. He
fights his own fight, and the fight is him taking his armour off: four phases,
one outfit each - scale armour, then gold plate, then ink, then no armour at
all - and the outfit you can see is the telegraph for what he is about to do.
Beating him is the end of the story the prologue started.

**He is dressed for the water.** Ninety per cent of this game happens
underwater and the king used to swim through it in a t-shirt. He has a dive
mask pushed up on his forehead, a wetsuit, an air tank over his shoulder and
flippers - with the crown still on top of the mask, because he has not stopped
being the king about it. Crown plus goggles is a silhouette you can pick out at
twenty-four pixels wide, which is all he gets.

**The goal is the scales.** You start at 100kg and the world is gated on what
you weigh and how much you have trained. The Sea Gate will not open for you at
a hundred kilos. Neither will the Drop. Neither, in the end, will the King -
walk into his throne room out of shape and he does not get up.

**New here?** There is a HOW TO PLAY on the title screen: what happened, what
you do about it, and which button does it, with the control page showing the
layout you actually have rather than listing both.

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
- **Integer scaling only.** The game renders into a 288px-tall buffer and is
  blitted to the page at a whole-number scale of DEVICE pixels with smoothing
  off, so pixels stay square at every window size. The buffer's WIDTH follows
  from the scale rather than from the window aspect - derive it from the aspect
  and then floor the scale, and whatever does not divide evenly is thrown away
  as letterbox (a 390x844 portrait phone filled 208 of its 390 px). Now every
  size fills the screen.

---

## The world

7000 x 900 tiles at 8px, generated fresh from a seed in about four seconds
and rebuildable from it. About **forty per cent of it is open water** - two
and a half million swimmable tiles - because the seabed is a SHELF that falls
away eastward, from something you can stand on at the village to six hundred
and forty tiles down at the Drop.

That shelf is the whole difference. Before it the seabed sat at 44-76 across
the entire map and everything under it was solid rock, so a world seven
hundred tiles deep had about fifteen tiles of water in it and the other six
hundred and fifty were something you dug through - a mine with a puddle on
top. The ocean read as small however wide it got, because the number that
matters is not how far you can travel, it is how much water there is to be in.
Swimming east IS descending now.

**Every depth in the game comes from one table**, `KD.Zones.D`. It used to be
copied by hand into five files - the layer table and the ore bands in the
generator, the sunlight falloff and the ambient floor in the light, the water
colour bands in the parallax, and every mob's spawn range - and twice the
ocean was made deeper while only some of the copies moved. Both times the same
bug came out wearing a different hat: the reef ended up below the last of the
daylight and painted in trench navy, and the whole game read as a cave.

It runs **west to east**, not just down: eight named zones, each with its own
rock, ore density, cave density, light level and spawn table.

| Zone | Tiles | What is there |
|---|---|---|
| The Old Mine | 0–1110 | where the village digs. Ore, crawlers, bandits, and you can build in it |
| Fruitfall | 1110–1930 | twelve hollowed giant fruit on three terraces, and everyone you owe money to |
| The Sea Gate | 1930–2110 | shut until you are light enough to be let through |
| Shallow Reef | 2110–3200 | warm, loud with clownfish and parrotfish, and mantis shrimp that punch |
| The Kelp Forest | 3200–4210 | you cannot see far in here. Morays lunge, cuttlefish spit |
| The Sunken City | 4210–5220 | somebody built all this. Sentinels, lionfish, barracuda |
| The Open Blue | 5220–6090 | no floor for a long way. Manta rays pass through |
| The Drop | 6090–7000 | down. Just down. And the throne room at the bottom |

Scattered through the open water: **shipwrecks** with lanterns still lit and
chests in the hold, **whale falls** on the deep shelf, **thermal vents** that
glow all the way up their chimneys because they are the only thing burning in
the trench and they are what you steer by, and **rock spires** so the column
has something in it to swim around.

**Fruitfall** is laid out procedurally on three terraces, and each fruit is
carved from **its own sprite's pixel mask** - the collision is the silhouette,
so the skin can never sit crooked on its box. Twelve trades, each with a
hanging sign, a lantern on the street and a room behind the door. Villagers
pace the terraces and have opinions.

Every house is **its own scene**, not a room in the tile world: a dressed
interior per trade with plush pets, furniture, a counter, an NPC who talks and
hands out work, and a door at each end. That is also why you can never be
sealed inside one.

**Light** is a tile flood fill, applied as banded shade. Sunlight dims through
water and is gone by the bottom of the reef; below that you bring your own.
Caves are genuinely black.

**Water** is cellular, eight levels per tile - and it is **dithered, not
opaque**, which is what gives the ocean depth: the far reef, the kelp forest
and the god rays all read through the column, and the veil thickens with depth
until the abyss really is solid. Each parallax layer is then veiled by the
water in front of it, because things wash out toward the water colour with
distance down there - they do not go black.

Dig into a reservoir and your tunnel floods. Sealed rooms stay dry, which is
what makes an air pocket worth building.

---

## Losing the weight

You start at **100kg**. Three disciplines - strength, wind, grit - trained at
Brine's Gym, which is a one-button timing minigame: a marker sweeps a bar, you
hit it inside a window, and the window shrinks as the set goes on. Reps become
discipline levels; sets, swimming, swinging and digging burn weight.

Six milestones gate the map, each on **both** a weight and a training total:

| Milestone | Weight | Levels |
|---|---|---|
| The Sea Gate | 82kg | 3 |
| Shallow Reef | 68kg | 8 |
| The Kelp Forest | 54kg | 14 |
| The Sunken City | 40kg | 20 |
| The Open Blue | 26kg | 26 |
| The Drop | 18kg | 30 |

---

## Things that fight back

Seventeen creatures, each nameable from its silhouette before any colour
arrives. Every one telegraphs, strikes, then recovers, so a fight is readable
instead of a coin flip. Shy things scatter; dashers wind up out of reach and
cross the whole gap in one committed lunge.

**Five champions**, one per zone - Old Scar, The Tangle, The Last Warden, The
Long Shadow, The Rockjaw. Each stands at a fixed spot in its own zone and waits
there until it is killed. Each drops a crown fragment.

**The King** is at the bottom of the Drop, in four phases, and the phase is
the outfit: teal scale mail, then full gold plate with a plume he did not earn,
then hooded purple once the octopus riding his shoulder has taken him over,
then bare skin with wounds where the straps were and the stolen crown cracked.
He summons five kinds of octopus soldier - helmeted grunts, plated brutes,
hooded casters with lit orbs, hatchling swarms and dripping ink sacs - and
between rounds he stops to admire himself, which is when he is open.

---

## Quests

Ten of them, from "bring me twenty stone" through the Gate and the five
champions to the crown itself. A quest is a written line, a check that reads
the game state, and a reward - no state machine, so a quest cannot get stuck
half-finished and an old save never loads into an impossible step. Shopkeepers
carry a mark when they have work or want it back, and the HUD keeps one line
saying what you are supposed to be doing.

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

**Touch** is detected automatically and stays deliberately small: a stick
that appears wherever your left thumb lands, and on the right **one big
contextual button plus one jump**, with three small tabs out of the way. The
big one reads what you are pointing at and becomes `DIG`, `HIT`, `USE` or
`ENTER` on its own, so there is never a row of six buttons to hunt through. A
tap that never travels still counts as a tap, so a stab inside the stick zone
still clicks.

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
Each node carries its own mark, because twenty-seven identical discs is a wall
rather than a tree.

### Combat and the crown

Seventeen creatures, all telegraph → strike → recover, all spawning off screen
and gated by the zone they are in — so where you are is legible from what is
swimming at you, and a lit room is a safe room. Armour is worn in real slots.
Beer buffs your damage and adds weight; weight slows you and burns off as you
swim, swing and dig.

Five **crown fragments**, one per champion. Then the throne room — but only if
you are under 18kg with thirty levels of training behind you, and only if you
have taken the pressure skill, because the Drop crushes anybody who has not.

---

## Layout

```
index.html            the script list, in load order
css/style.css         page chrome; everything visible is drawn pixels
js/px/                engine: palette, sprite atlas, render target, dither,
                      pixel text, input, sound, particles
js/art/               SPRITE DATA ONLY - font, tiles, built pieces, actors,
                      items, UI, the reef and its animals, the fruit village,
                      interiors, the King and his army
js/world/             zones, tile table, tile store, generator, the village
                      planner, lighting, water, parallax, renderer
js/sim/               player physics and verbs, enemies, villagers, the King
js/rpg/               materials, recipes, prefixes, skills, the weight-loss
                      goal system, quests, game state and save
js/ui/                widgets, HUD, bag / crafting / skill-tree panels
js/scenes/            title, generation, play, interiors, the gym, pause,
                      death, victory, sprite test
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
