# ART BRIEF — how to draw for CROWNDEEP

Read `MASTER_PROMPT.md` first for the game. This file is the technical contract.
Follow it exactly or your file will not load.

## The rule

100% hand-drawn pixel art. You are writing character matrices, one character per
pixel. You never call a canvas drawing function. There are no circles, no
curves, no gradients and no blur anywhere in this game — `npm run check` fails
the build if it finds one.

## File shape

Every art file looks exactly like this:

```js
/* ============================================================
   art/<name>.js - one line on what is in here.
   ============================================================ */
KD.art.<name> = (function () {
  const P = KD.PX;

  function build() {
    P.def('sprite_name', {
      pal: { '1': 'INK.0', '2': 'SAND.1', '3': 'SAND.2', '4': 'SAND.3' },
      ax: 0, ay: 0,                      // optional draw anchor, defaults 0,0
      px: [
        '11111111',
        '14444321',
        ...
      ]
    });
    // variant() recolours an existing sprite with no redraw:
    P.variant('sprite_name_wet', 'sprite_name', { 'SAND.2': 'SAND.1' });
    // anim() names a frame sequence:
    P.anim('king_walk', ['king_walk0','king_walk1','king_walk2','king_walk3'], 8);
  }

  return { build };
})();
```

- `.` and a space are transparent. Every other character MUST have a `pal` entry.
- Width = the longest row. Keep every row the same length anyway.
- Colours are `RAMP.step` strings only, never hex. The ramps are in
  `js/px/pal.js`: INK DEEP WATER SAND STONE CORAL KELP GOLD SKIN RUST BONE ROT
  BLOOD WOOD CLOTH, each dark→light, plus WHITE BLACK SHADOW.
- Duplicate sprite names throw. Namespace yours with your file's prefix.

## Look at your work — this is not optional

```
node tools/sprite.js js/art/<yourfile>.js            # all of it
node tools/sprite.js js/art/<yourfile>.js king       # just names containing "king"
ASCII=10 node tools/sprite.js js/art/<yourfile>.js   # more ASCII in the terminal
```

It writes `tools/shots/sprites-<yourfile>.png`. **Read that PNG with the Read
tool and look at it.** If a sprite is unreadable, muddy, or does not look like
the thing it is supposed to be, redraw it. "It compiles" is not the bar. Expect
to iterate two or three times on anything with a silhouette.

## Craft standards

- **Outline everything.** 1px `INK.0` or `INK.1` around every solid shape.
  Prefer selective outlining: darker outline on the shadow side.
- **Light comes from the upper left.** Highlights top-left, shade bottom-right,
  consistently, on every sprite in the game.
- **Use the whole ramp but no more.** 3–4 shades per material. More shades read
  as mush at this size.
- **Dither, never blend.** For a gradient use a checkerboard or stipple between
  two adjacent ramp steps. `.2.2.2` / `2.2.2.` alternating rows is the standard
  50% mix.
- **Silhouette first.** For any creature or object: if you cannot tell what it
  is from the black shape alone, the detail will not save it.
- **No stray single pixels** floating off a shape, and no 1px-wide noise inside
  a fill. Clusters of 2+ read; single pixels look like dirt.
- **Anti-symmetry.** Do not mirror a sprite down its centre line. Offset an eye,
  shift a highlight, break the fold of a cloak.

## Sizes

| Subject | Size | Notes |
|---|---|---|
| Terrain / built tiles | 8x8 | must tile seamlessly with itself |
| Ore overlay | 8x8 | drawn ON a stone tile, mostly transparent |
| Small decor | 8x8 or 8x16 | attaches to a tile face |
| Item / tool / weapon icon | 12x12 | reads at 1x in an inventory slot |
| The king | 12x18 | pear-shaped, white beard, bare crown band |
| Small enemy | 10x10 – 16x16 | |
| Big enemy / mount | 20x16 – 40x24 | |
| Boss | 48x40 | |
| UI 9-slice part | 4x4 | corner/edge/centre kit |

## Tile kits and autotiling

The engine picks a tile by which neighbours are solid. For each terrain material
author this **15-tile kit**, named `<mat>_<part>`:

```
<mat>_mid      all four neighbours solid (the interior fill)
<mat>_mid2     interior variant 2   } so big fills do not visibly repeat
<mat>_mid3     interior variant 3   }
<mat>_top      open above
<mat>_bot      open below
<mat>_left     open left
<mat>_right    open right
<mat>_tl       open above AND left    (outer corner)
<mat>_tr       open above AND right
<mat>_bl       open below AND left
<mat>_br       open below AND right
<mat>_h        open above AND below   (a 1-tile-thick horizontal shelf)
<mat>_v        open left AND right    (a 1-tile-thick vertical column)
<mat>_cap      open on three sides    (a nub)
<mat>_single   open on all four sides (a lone block)
```

The exposed face is where the material shows its bright edge — grass-like
highlight on sand, chipped bright rim on stone. Interiors are darker and flatter.
Interiors MUST tile seamlessly: the right column has to sit next to the left
column without a seam, and the bottom row next to the top row.

## Do not touch

Only create or edit the files you are assigned. Do not edit `index.html`,
anything in `js/px/`, `tools/`, or another agent's file. Do not run `git`.

## When you are done

1. `node tools/sprite.js js/art/<yourfile>.js` runs clean.
2. You have READ the contact-sheet PNG and are happy with how it looks.
3. Report: the sprite names you defined, their sizes, and anything you think
   still looks weak.
