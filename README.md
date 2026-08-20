# Dolphin Ranch: Tides of Atlantis

A goofy 2D pixel dolphin-raising game. You are a diver with a stick, a sock, and
a dream: hunt fish in the ruins of Atlantis, feed them to your dolphins, level
those dolphins into skill-tree monsters, race them for money, bet on the
results, and — when the ranch is going well — build a vat and make one of them
evil.

No engine, no build step, no assets. Every sprite is authored as pixel strings
in JavaScript and every sound is synthesised in WebAudio, so the whole game is
just an `index.html` you can open.

```
open index.html          # that's it
# or, if your browser is fussy about file://
npm start                # python3 -m http.server 8080  ->  localhost:8080
```

## The loop

1. **DIVE** — swim, spear fish, scoop them with a net. Momentum swimming with
   real water drag, a dash, spear physics with aim assist, fish that school,
   flee, chase and bite back. Fill your bag before your air runs out.
2. **FEED** — fish become EXP. EXP becomes levels. Levels become skill points.
   Live-netted fish are worth more than speared ones.
3. **SKILLS** — spend points across four branches (Current / Blubber / Flair /
   Abyss). Stat nodes make your dolphin faster; ability nodes unlock things you
   fire mid-race.
4. **RACE** — pick a tier, pick a runner, and bet on any dolphin in the field
   including your own. Hold SPACE to surge, 1/2/3 for abilities. The pack
   drafts and shoves, and there are photo finishes.
5. **SPEND** — sell fish at the market, upgrade gear, build the ranch, hire
   staff, breed the next generation, corrupt a dolphin, take quests.
6. **SLEEP** — NEXT DAY runs the sim: staff work, dolphins train, the market
   moves, calves are born, corruption spreads, new quests appear.

## Controls

| | |
|---|---|
| WASD / arrows | swim |
| mouse | aim |
| left click | throw spear |
| right click / E | net (catches fish **alive** — worth more) |
| SPACE | dash (diving) / surge (racing) |
| 1 / 2 / 3 | race abilities |
| ESC | back / surface |
| F | feed &nbsp;•&nbsp; T skills &nbsp;•&nbsp; R dive &nbsp;•&nbsp; N next day &nbsp;•&nbsp; Q/E swap dolphin |
| M | mute &nbsp;•&nbsp; F3 fps |

The game saves itself to `localStorage` after anything important.

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
js/lib/               engine: util, text, pixel, input, audio, fx, ui, water
js/sprites/           all art, as pixel strings + palettes
js/data/              species, items/gear, skills, ranch upgrades, quests, races
js/model/             dolphin behaviour + save state and the day cycle
js/scenes/            title, ranch, reef, dolphinview, shop, market, breed,
                      staff, questboard, vat, racelobby, race
js/game.js            scene manager, main loop, shared HUD
tools/                dev helpers (sprite previewer, headless smoke test)
```

Rendering targets a 400×225 buffer scaled by whole integers, with
`imageSmoothingEnabled = false`, so everything stays on the pixel grid. Text is
system monospace rendered tiny, alpha-thresholded to kill anti-aliasing, and
cached — a bitmap font without shipping font data.

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
