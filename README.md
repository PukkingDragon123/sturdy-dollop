# Dolphin Ranch: Tides of Atlantis

A goofy 2D dolphin-raising game. You are **AQUADUDE**, a discount superhero with
a trident, an orange scale vest and an unreasonable rear end. Fly the trident
across an ocean overworld, sweet-talk your way past the harbour police, hunt
fish in the ruins of Atlantis, feed them to your dolphins, level those dolphins
into skill-tree monsters, race them for money, bet on the results, and — when
the ranch is going well — build a vat and make one of them evil.

No engine, no build step, no asset files. Characters are **procedurally
animated rigs** (springs, verlet chains, 2-bone IK) drawn as flat chunky shapes;
props are pixel strings in source; every sound is synthesised in WebAudio. The
whole game is an `index.html` you can open.

```
open index.html          # that's it
# or, if your browser is fussy about file://
npm start                # python3 -m http.server 8080  ->  localhost:8080
```

## The loop

1. **TRAVEL** — press M and ride your trident like a broom across a 2600×1500
   stretch of ocean. Nine landmarks: your ranch, four dive zones, a racetrack,
   the Atlantis capital, a market town and a very illegal trench bazaar. Most
   start locked, with somebody standing in front of them — a kelp cultist, a
   bookmaker, a Lord, a prophet, and two officers of the Atlantis Harbour Patrol
   who will absolutely take a bribe.
2. **DIVE** — swim, spear fish, scoop them with a net. Momentum swimming with
   real water drag, a dash, spear physics with aim assist, fish that school,
   flee, chase and bite back. Fill your bag before your air runs out.
3. **FEED** — fish become EXP. EXP becomes levels. Levels become skill points.
   Live-netted fish are worth more than speared ones.
4. **SKILLS** — spend points across four branches (Current / Blubber / Flair /
   Abyss). Stat nodes make your dolphin faster; ability nodes unlock things you
   fire mid-race.
5. **RACE** — pick a tier, pick a runner, and bet on any dolphin in the field
   including your own. Hold SPACE to surge, 1/2/3 for abilities. The pack
   drafts and shoves, and there are photo finishes.
6. **SPEND** — sell fish at the market, upgrade gear, build the ranch, hire
   staff, breed the next generation, corrupt a dolphin, take quests.
7. **SLEEP** — NEXT DAY runs the sim: staff work, dolphins train, the market
   moves, calves are born, corruption spreads, new quests appear.

## Controls

| | |
|---|---|
| WASD / arrows | swim / fly |
| mouse | aim |
| left click | throw spear |
| right click / E | net (catches fish **alive** — worth more) |
| SPACE | dash (diving) / boost (map) / surge (racing) |
| E | enter a place or talk to whoever is guarding it |
| 1 / 2 / 3 | race abilities |
| ESC | back / surface |
| M | world map &nbsp;•&nbsp; F feed &nbsp;•&nbsp; T skills &nbsp;•&nbsp; R dive &nbsp;•&nbsp; N next day &nbsp;•&nbsp; Q/E swap dolphin |
| F1 | mute &nbsp;•&nbsp; F2 rig test &nbsp;•&nbsp; F3 fps |

The game saves itself to `localStorage` after anything important.

## Characters

Nothing is keyframed. Every character is a rig fed by real motion:

**Aquadude** — flat chunky body in the toy-3D style (flat fills with a darker
extruded side face, no outlines). Blonde hair on a 5-link verlet chain that
streams in the current, 2-bone IK arms and legs that flutter-kick when
swimming, straddle the trident when flying and plant when standing. The butt is
two ellipses on independent 2D springs fed his actual acceleration plus a
rhythmic kick from the leg cycle, so it lags, overshoots, squashes and never
quite agrees with itself. This was a requirement.

**Dolphins** — everything placed by fraction of body length from the tip of the
rostrum, on real bottlenose landmarks: eye at 0.145, blowhole at 0.175,
pectoral base at 0.26, falcate dorsal at 0.38–0.54, peduncle at 0.86, notched
flukes at 1.0. The body is a smooth loft over a non-uniform spine so the beak
stays slim while the melon bulges; countershading gives a dark dorsal cape, a
pale belly and the flank hourglass. Locomotion is a travelling wave whose
amplitude grows toward the tail, which is how they actually swim, and the
horizontal fluke blade tilts with the stroke. The face is deliberately idiotic:
a googly eye with its own wobble, a raised eyebrow, a permanently gormless open
jaw with a tongue.

**Fish** — one loft function plus a shape table covers 19 species: slim, oval,
long, round, puffer (with spines) and eel bodies with wiggling tails and
flapping pectorals, plus special rigs for squid (six chain tentacles), jellies
(pulsing bell), crabs (eight walking legs and snapping claws) and prawns.

**NPCs** — flat townsfolk who breathe, blink, look around and flap their jaws
when talking. The Atlantis Harbour Patrol get navy uniforms, peaked caps with a
gold badge, dark shades, a duty belt and folded arms.

## Systems

**Dolphins** have six stats (SPD/STA/BRST/AGI/CHM/LCK), a palette, 1–4 traits,
a skill tree, a corruption meter, a mood and a family tree. Charm is the sly
one: it shortens your betting odds, so a beloved dolphin pays worse than a
hated one.

**Fish** — 19 species across four depth zones (Sunny Shallows, Kelp Forest,
Sunken Colonnade, The Abyss), each with its own AI behaviour (school, skittish,
chase, bottom, drift) and flags (armoured, aggressive, stinging, glowing,
cursed). Deeper water needs a better air tank. Cursed fish feed the vat.

**Gary** is a shark. He shows up mid-dive, steals fish out of your bag, and
drops a valuable tooth if you spear him five times.

**Places** — nine landmarks, each with an unlock condition checked when you talk
to whoever is guarding it: say the magic words to a kelp cultist, meet the
bookmaker, buy a heritage permit for 400 clams *or* three Marble Snappers,
prove a level 8 dolphin to a Lord, own Twin Tanks before the trench prophet
will let you down, and donate 1200 clams to Sergeant Sludge's "police social
fund". Dive zones need both the right air tank *and* their unlock.

**Evil** — the Abyssal Vat corrupts a dolphin over a few nights (or instantly
with enough cursed chum). Evil dolphins get +SPD/+BRST/+STA, lose charm, unlock
the Abyss skill branch, and wear a tiny top hat and moustache. Non-negotiable.

**Breeding** averages the parents' stats, mutates them, mixes traits, and can
roll rare morphs (ATLANTEAN GOLD, RADIOACTIVE LIME). Level 4 lagoon: twins.

**Staff** — deckhands fish while you sleep, trainers grant daily EXP, groomers
add charm, hype fish improve bet payouts, and a shady dealer sells your catch
for more and occasionally leaves a cursed eel in your bucket.

## Code layout

```
index.html            script tags, in load order
css/style.css         page chrome (the game itself is all canvas)
js/lib/               engine: util, text, pixel, input, audio, fx, ui, water,
                      rig (springs / chains / IK / flat shapes), dialog
js/rigs/              the procedurally animated cast: dolphin, hero, fish, npc
js/sprites/           props and UI icons, as pixel strings + palettes
js/data/              species, items/gear, skills, ranch upgrades, quests,
                      races, places (the world map)
js/model/             dolphin behaviour + save state and the day cycle
js/scenes/            title, worldmap, ranch, reef, dolphinview, shop, market,
                      breed, staff, questboard, vat, racelobby, race, rigtest
js/game.js            scene manager, main loop, shared HUD
tools/                dev helpers (sprite previewer, smoke/persist/balance runs)
```

Scenes lay out in a 400×225 "design space" and everything is drawn through one
global ×2 transform, so the real canvas is 800×450 and shapes and text render at
full native resolution without a single layout needing to change. Pixel props
keep `imageSmoothingEnabled = false` and land on exact 2×2 blocks; character
rigs are anti-aliased paths, so they gain the extra resolution. Text is system
monospace baked at native size, alpha-thresholded to kill anti-aliasing, cached,
and blitted in device space — a bitmap font without shipping font data.

Press **F2** anywhere for the rig test scene: every character large, with a
speed toggle, for tuning the animation.

### Dev tools

```
npm run check                # syntax-check every source; verify index.html loads them all
node tools/showsprites.js    # ASCII-dump sprite art in the terminal (optional name filter)
node tools/smoke.js          # headless Chromium: drives the game through tools/script.json,
                             # screenshots each scene to tools/shots, fails on console errors
node tools/persist.js        # verifies the save survives a reload, and that file:// boots
node tools/balance.js        # drives the real model for 25 in-game days and prints the
                             # progression table (clams / level / zone / race placings)
```

The browser tools need `npm i -D playwright`. If the bundled Chromium version
does not match, point at it explicitly:
`PW_EXEC=/opt/pw-browsers/chromium-*/chrome-linux/chrome node tools/smoke.js`

### Balance notes

Race fields are generated per tier by anchoring rival power 70% to your own
dolphin and 30% to an absolute per-tier difficulty (`DZ.Races.TIER_POWER`). That
keeps every race close enough to be decided by surging and ability timing, while
still punishing you for entering the Poseidon Trophy with a level 20 pup —
which is what makes stat investment mean anything. Fourth place refunds roughly
the entry fee, so a competent race is never a pure loss.
