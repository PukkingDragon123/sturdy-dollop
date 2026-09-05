# CROWNDEEP

A hand-drawn pixel-art **dolphin fighting game** in a drowned Atlantis. Collect
them, train them, swim with them, and take them down to an illegal five-tier
card in a flooded quarry that nobody official knows about. It opens with a
castle prologue you walk through, and it ends with the man who is sitting in
your chair.

> You were KING OF THE ATLANTIC. Then you met her: a beer keg in a little dress
> with a crooked tiara. You got fat, you lost the fight, and The Deep took your
> crown, your throne and your ocean, and put an army of octopuses in it.

Now you run six pens on the lip of a flooded quarry, and once a night the
quarry runs a card. Five tiers of it. The last three names on that card are
people you already know.

**Play it:** open `index.html` in any browser. No build step, no dependencies,
no server — it runs straight off the filesystem. `npm start` if you want one.

---

## The game

**The animal is the whole game, so the animal is drawn properly.** Every
dolphin is built to a 112x52 canvas, pixel by pixel, from a hand-authored
outline table — sixteen control points down the body with separate top and
bottom profiles, because a dolphin blended from four spans is a barracuda. Six
species, eight coats, five markings and six poses, cached per animal. Nothing
in this game is a small sprite scaled up: the melon crease, the eye with its
lid and corner fold, the blowhole, the ink crease under the dorsal root and the
pectoral rooted seven pixels inside the belly are all drawn at the size you see
them.

**The fight is something you DO.** Two animals in a pit, alternating turns.
Pick a move, and then a bar sweeps across a window and you stop it: land it in
the middle and the strike is CLEAN, land it in the band either side and you
GRAZE, miss it altogether and you swing through nothing and it costs you half
again in breath. A clean strike is worth two and a half grazes, and that margin
is the entire reason you can take an animal rated worse than the one across
from you and still walk out with the purse. The window is different per move —
a headbutt is generous, a breach is a sliver — and the sweep gets faster the
higher the card, so the Iron Gate is a different game from the Shallow Card
with the same three buttons.

**Breath is the resource, not mana.** Every move costs air, a miss costs half
again, and an animal that runs out has to surface — which is a free hit for the
other one. HOLD is a real move: it costs nothing, gives you 22 air back and
halves what lands on you.

**THE TURN.** A meter fills with the damage you deal, and at full it unlocks a
fifth move worth four times a headbutt, on a nine-per-cent window. It is the
one button in the game that can steal a fight you are losing, and it is exactly
as hard to hit as that implies.

**Bond is the gate on moves, so swimming with them is the game, not a nicety.**
An animal you have never got in the water with knows how to headbutt something,
and that is all. Sonar at thirty, corkscrew at forty-five, breach at seventy.
The mechanic is the one thing a dolphin does that nothing else in the sea does:
it PORPOISES, and if you are alongside it you can go up with it. Press at the
top of the arc and you break the surface together; a chain of them is worth
more than the sum, because the point is the two of you getting into a rhythm.

**Six pens and a dealer who does not tell you anything.** He brings three
animals every morning and prices them off what they are worth on paper. He does
not tell you their temperament — steady, wild, sulky, game, proud — and
temperament is what decides whether the thing bonds with you, whether it holds
its breath, and whether it can hit a window at all. That is what the price is
for.

**Four drills, and each is a different shape of decision.** Sprints raise
speed, weight raises power, holds raise stamina and the ring raises spirit;
every one of them eats a chunk of the day, and the gain shrinks as the stat
climbs, so a stat in the fifties is four sessions and a stat in the eighties is
a fortnight.

**A day is the unit of play.** Six in the morning to two the next, about four
real minutes. ENERGY is the budget and only sleep gives it back, so how much
you can make of one animal in one day is a decision rather than a formality.
Overnight everything hurt mends a day and the cart restocks.

**Five tiers, fifteen handlers, and every one of them has a name and a line,**
because a man with a name and a line is somebody you want to beat and a
procedurally generated one is a number in a list. You cannot enter a tier until
you have beaten everybody in the one below, so the ladder is the progression
and the money is only how you keep up with it. Their animals are gated on bond
too: on the Shallow Card they only know how to headbutt and slap, the sonar
arrives on the Long Pen, the corkscrew at the Quarry, and nobody breaches at
you until the Deep Card.

---

## Act One

**Act One is playable, not narrated.** The game opens inside your castle, four
rooms end to end, back when you still had it: take the queen to dinner, eat it,
fight the sharks that come in off the sea balcony, throw the leftovers at the
cook. Then a keg texts you. You put the trident down, you drink, you cheat, and
you lose all of it in one night — the queen, the keg, the throne and the room
you are standing in. Whatever weight you put on in there is the weight you are
carrying when a manta pulls you out of the sand, so the prologue is not a
cutscene you skip: it sets your starting number.

**What you say is the mechanic.** Every scene that matters gives you lines to
choose between: how warm you are to the queen at the alarm, whether you are
cruel to the cook about his crab, whether you take the drink, whether you put
the trident down when she asks.

**Cutscenes are things you stand in.** A cutscene here is not a scene of its
own — it is a layer over whatever you were already playing, so the room keeps
its own time and you keep every control you had a second ago. The night she
walks in on the two of you happens in the throne room you are standing in: she
comes up the stairs, crosses the floor to you, and throws you out of the room
while you can walk anywhere in it you like. There is nowhere in the room to go,
which is the point of being able to try.

**And everybody leaves you for the specific reason you gave them.** Those four
answers are read back out in the scene where you lose everything. Promise the
queen dinner and mean it and she goes quietly, which is worse; never promise it
and she tells you she sat there anyway. Be cruel to the cook and he takes the
castle with the exact sentence he warned you with; be civil and he says he
remembered, and that it is the difference between the gate and the pot. Put the
trident down for the keg and she tells you that was the night she stopped being
interested.

**New here?** There is a HOW TO PLAY on the title screen: what happened, what
you do about it, and which button does it, with the control page showing the
layout you actually have rather than listing both.

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
- **Integer scaling only.** The game renders into a 240px-tall buffer and is
  blitted to the page at a whole-number scale of DEVICE pixels with smoothing
  off, so pixels stay square at every window size. The buffer's WIDTH follows
  from the scale rather than from the window aspect - derive it from the aspect
  and then floor the scale, and whatever does not divide evenly is thrown away
  as letterbox (a 390x844 portrait phone filled 208 of its 390 px). Now every
  size fills the screen.

---

## Playing it

| Key | |
|---|---|
| Arrows / WASD | move the cursor through a list |
| SPACE | choose; in a fight it commits the move, then stops the timing bar |
| TAB / 1 2 3 | THE POD, DRILLS, THE DEALER |
| Q | down to the quarry, to tonight's card |
| R | swim with the one that is up |
| Z | sleep |
| ESC | back, or pause |

On a phone every one of those is a button: tap a pen to make that animal the
one that fights, then QUARRY, SWIM or SLEEP, and in a fight tap a move and tap
again in the green.

---

## Layout

```
index.html            the script list, in load order
css/style.css         page chrome; everything visible is drawn pixels
js/px/                engine: palette, sprite atlas, render target, dither,
                      pixel text, input, sound, particles
js/art/               SPRITE DATA ONLY - font, built pieces, actors, items,
                      UI, the reef, the fruit village, interiors, the deep,
                      and the Act One cast
js/world/castle.js    the castle kit the prologue is built out of
js/rpg/dolphart.js    the 112x52 dolphin: species, coats, markings, poses
js/rpg/pod.js         stats, temperaments, moves, drills, the market, and
                      the fifteen handlers on the card
js/rpg/day.js         the clock and the energy budget
js/rpg/state.js       inventory, money, and the localStorage round trip
js/rpg/act1.js        the prologue's state and its four answers
js/ui/                widgets, dialogue, conversation, markers
js/scenes/pens.js     the yard: six pens, the drills, the dealer
js/scenes/circuit.js  tonight's card, five tiers deep
js/scenes/battle.js   the fight
js/scenes/swim.js     porpoising, and the bond it buys
js/scenes/            title, pause, the prologue rooms, help, sprite test
js/game.js            boot, scene manager, frame loop
MASTER_PROMPT.md      the full spec this was built from
```

## Dev tools

```bash
npm run check                            # parse + load audit + THE ART RULE lint
node tools/sprite.js js/art/actors.js    # ASCII + a PNG contact sheet of any art file
node tools/sprite.js js/art/actors.js king   # filter to inspect one thing large
node tools/smoke.js script.json          # headless Chromium; fails on any console error
MOBILE=1 node tools/smoke.js s.json      # the same, in touch emulation
VIEW=700x620 node tools/smoke.js s.json  # force a viewport to test a layout width
```

`tools/sprite.js` exists because **art authored blind is bad art**. Every
sprite in this game was rendered to a contact sheet and looked at. So was every
dolphin: the rig went through a barracuda, a tail fin that was widest where it
met the body, a dorsal floating clear of the back, and a flipper drawn before
the body so only its tip showed, and each of those was found by looking at a
picture rather than by reading the code.

`tools/smoke.js` drives the real game in a real browser — key presses, taps,
waits, screenshots, arbitrary `eval` — and fails on any console error. Every
scene in this repo was walked through with it at 1280x720, 1024x600, 844x390
and 390x844.

## Saving

localStorage, key `crowndeep.save.v1`. The pod, the money, the standing on the
card, the day and where Act One got to. NEW GAME wipes it.
