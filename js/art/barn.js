/* ============================================================
   art/barn.js - the barn, the basket, and the five places you
   can walk to outside it.

   Everything here is drawn at the size it is used and lit from
   the upper left, like the rest of the game. Two rules did most
   of the work:

     A BUILDING IS A SILHOUETTE AND A DOOR. At forty-eight
     pixels you get a roofline, a wall and one opening, and the
     opening is what says which building it is - a stall, a
     weight rack, a starting gate, an arch full of crowd.

     FOOD IS A COLOUR. It is drawn small, dragged across a dark
     barn and dropped on a grey animal, so each one is a shape
     in a hue nothing else in the room uses.
   ============================================================ */
KD.art.barn = (function () {
  const P = KD.PX;

  /* the house legend, same letters as every other art file */
  const C = {
    o: 'INK.0', p: 'INK.1', q: 'INK.2', P: 'INK.3',
    b: 'BONE.0', B: 'BONE.1', w: 'BONE.2', W: 'WHITE',
    g: 'GOLD.0', G: 'GOLD.1', y: 'GOLD.2', Y: 'GOLD.3',
    t: 'WATER.0', T: 'WATER.1', c: 'WATER.2', C: 'WATER.3',
    i: 'DEEP.0', d: 'DEEP.1', D: 'DEEP.2', e: 'DEEP.3', E: 'DEEP.4',
    n: 'SAND.0', N: 'SAND.1', m: 'SAND.2', M: 'SAND.3',
    r: 'CORAL.0', R: 'CORAL.1', x: 'CORAL.2', X: 'CORAL.3',
    f: 'KELP.0', F: 'KELP.1', '+': 'KELP.2', '*': 'KELP.3',
    u: 'RUST.0', U: 'RUST.1', v: 'RUST.2', V: 'RUST.3',
    h: 'STONE.0', H: 'STONE.1', j: 'STONE.2', J: 'STONE.3',
    z: 'ROT.0', Z: 'ROT.1', a: 'ROT.2', A: 'ROT.3',
    '#': 'BLOOD.0', $: 'BLOOD.1', '%': 'BLOOD.2', '&': 'BLOOD.3',
    1: 'WOOD.0', 2: 'WOOD.1', 3: 'WOOD.2', 4: 'WOOD.3',
    5: 'CLOTH.0', 6: 'CLOTH.1', 7: 'CLOTH.2', 8: 'CLOTH.3',
    s: 'SKIN.0', S: 'SKIN.1', k: 'SKIN.2', K: 'SKIN.3'
  };
  const S = (name, px) => P.def(name, { pal: C, px: px });

  function build() {
    /* ================================================================
       A. THE CHEF'S OWN. A squid, because the octopus sells what he
       knows, and it is the only violet thing in the basket.
       ================================================================ */
    S('it_squid', [
      '....oooo....',
      '...oAAAAo...',
      '..oAAAAAAo..',
      '..oAaaaaAo..',
      '.oAaaaaaaAo.',
      '.oAaWoaoWaAo',
      '.oAaaaaaaaAo',
      '..oaaaaaao..',
      '..oaxxxxao..',
      '..ox.oo.xo..',
      '..oo.xx.oo..',
      '...x.oo.x...'
    ]);

    /* ================================================================
       B. THE BARN
       ================================================================ */

    /* the feed basket: woven staves, a bound rim, and a shadow inside
       so it reads as a container rather than as a rug */
    S('bn_basket', [
      '..oooooooooooooooooooooooooooo..',
      '.o4444444444444444444444444444o.',
      'o4422222222222222222222222222244o',
      'o4o..........................o4o',
      'o41oooooooooooooooooooooooooo14o',
      'o412222222222222222222222222214o',
      'o41322323223223232232232232314o.',
      '.o13223232232322322323223231o...',
      '.o41322323223223232232232314o...',
      '.o.132232322323223223232231o....',
      '..o41322323223223232232314o.....',
      '..o.1322323223223232231o........',
      '...oo11111111111111111oo........',
      '.....oooooooooooooooooo.........'
    ]);

    /* a stall post with an iron ring on it */
    S('bn_post', [
      '.oooo.',
      'o4444o',
      'o3223o',
      'o3223o',
      'oUVVUo',
      'oUuuUo',
      'o3223o',
      'o3223o',
      'o3223o',
      'o2112o',
      'o2112o',
      'o2112o',
      'o1111o',
      '.oooo.'
    ]);

    /* the bucket you pour it out of */
    S('bn_bucket', [
      '.oooooooo.',
      'oUVVVVVVUo',
      'oUuuuuuuUo',
      'o41111114o',
      'o43222234o',
      'o43222234o',
      'oUVVVVVVUo',
      'o43222234o',
      'o41111114o',
      '.o111111o.',
      '.oooooooo.'
    ]);

    /* a hanging lamp, the only warm thing in the barn */
    S('bn_lamp', [
      '...oo...',
      '...oo...',
      '.oooooo.',
      'oUVVVVUo',
      'oGYYYYGo',
      'oYWWWWYo',
      'oYWWWWYo',
      'oGYYYYGo',
      'oGgggggo',
      'oUVVVVUo',
      '.oooooo.',
      '..o..o..'
    ]);

    /* a bale of cut kelp, tied twice */
    S('bn_bale', [
      '..ooooooooooooooo..',
      '.of*f*ff*f*ff*f*fo.',
      'of*ff*f*ff*f*ff*f*o',
      'oUUUUUUUUUUUUUUUUUo',
      'of*f*ff*f*ff*f*ff*o',
      'of*ff*f*ff*f*ff*f*o',
      'of*f*ff*f*ff*f*ff*o',
      'oUUUUUUUUUUUUUUUUUo',
      'of*ff*f*ff*f*ff*f*o',
      'off*f*ff*f*ff*f*ffo',
      '.offffffffffffffo..',
      '..ooooooooooooooo..'
    ]);

    /* ================================================================
       C. THE MAP. Five places, each one nameable from its black shape
       before any colour lands: a barn with a stall door, a starting
       gate, a stone shed with a weight rack in the doorway, a banked
       arch with a crowd in it, and a cart with a pot going.

       All 34 wide and bottom-aligned, so the map lays them on one
       ground line without a per-building offset table.
       ================================================================ */

    /* THE BARN - gambrel roof, plank walls, one big dark stall door */
    S('mp_barn', [
      '...............oo.................',
      '..............oGGo................',
      '.............oooooo...............',
      '..........ooo444444ooo............',
      '.......ooo4444444444444ooo........',
      '....ooo444444444444444444444oo....',
      '..oo44444444444444444444444444oo..',
      'oo333333333333333333333333333333o.',
      'o1333333333333333333333333333331o.',
      'o1111111111111111111111111111111o.',
      'o1222222222222222222222222222221o.',
      'o1211221122112211221122112211221o.',
      'o1211221122112211221122112211221o.',
      'o1111111111111111111111111111111o.',
      'o12211ooooooooooooooooo112211221o.',
      'o12211o444444444444444o12211221o..',
      'o12211o433333333333334o12211221o..',
      'o12211o43111111111334o12211221o..',
      'o12211o431oooooooo134o12211221o...',
      'o12211o431o111111o134o12211221o...',
      'o12211o431o122221o134o12211221o...',
      'o12211o431o122221o134o12211221o...',
      'o12211o431o122221o134o12211221o...',
      'o12211o431o122221o134o12211221o...',
      'o12211o431o122221o134o12211221o...',
      'o12211o431o122221o134o12211221o...',
      'o12211o4311oooooo1134o1221221o....',
      'o12211o43111111111134o1221221o....',
      'o12211o4433333333334o11221221o....',
      'o11111o4444444444444o11111111o....',
      'o11111ooooooooooooooo11111111o.....',
      'ooooooooooooooooooooooooooooo......'
    ]);

    /* THE TRACKS - a starting gate, a flag, and lanes running away */
    S('mp_tracks', [
      '..oo..........................oo..',
      '.oUVo........................oUVo.',
      '.oUVo..oo&&&&&&&&&&&oo.......oUVo.',
      '.oUVo.o&&&&&&&&&&&&&&&o......oUVo.',
      '.oUVo.o&&%%%%%%%%%%%&&o......oUVo.',
      '.oUVo.o&&%%%%%%%%%%%&&o......oUVo.',
      '.oUVo..oo%%%%%%%%%%oo........oUVo.',
      '.oUVo....oooooooooo..........oUVo.',
      '.oUVooooooooooooooooooooooooooUVo.',
      '.oUVVVVVVVVVVVVVVVVVVVVVVVVVVVVo.',
      '.oUuuuuuuuuuuuuuuuuuuuuuuuuuuuUo.',
      '.oUoooooooooooooooooooooooooooUo.',
      '.oUo..........................oUo.',
      '.oUo.oo.....oo.....oo.....oo..oUo.',
      '.oUo.MM.....MM.....MM.....MM..oUo.',
      '.oUo.MM.....MM.....MM.....MM..oUo.',
      '.oUo.MM.....MM.....MM.....MM..oUo.',
      '.oUo.MM.....MM.....MM.....MM..oUo.',
      '.oUo.oo.....oo.....oo.....oo..oUo.',
      '.oUo..........................oUo.',
      '.oUonnnnnnnnnnnnnnnnnnnnnnnnnnoUo.',
      '.oUoNNNNNNNNNNNNNNNNNNNNNNNNNNoUo.',
      '.oUonnnnnnnnnnnnnnnnnnnnnnnnnnoUo.',
      '.oUoNNNNNNNNNNNNNNNNNNNNNNNNNNoUo.',
      '.oUonnnnnnnnnnnnnnnnnnnnnnnnnnoUo.',
      '.oUoNNNNNNNNNNNNNNNNNNNNNNNNNNoUo.',
      '.oUonnnnnnnnnnnnnnnnnnnnnnnnnnoUo.',
      '.oUoNNNNNNNNNNNNNNNNNNNNNNNNNNoUo.',
      '.oUooooooooooooooooooooooooooooUo.',
      '.oUUUUUUUUUUUUUUUUUUUUUUUUUUUUUo.',
      '.oUuuuuuuuuuuuuuuuuuuuuuuuuuuuUo.',
      '.oooooooooooooooooooooooooooooo...'
    ]);

    /* THE GYM - a low stone shed, and a rack of weights in the door */
    S('mp_gym', [
      '.......oooooooooooooooooo.........',
      '.....ooJJJJJJJJJJJJJJJJJJoo.......',
      '...ooJJJJJJJJJJJJJJJJJJJJJJoo.....',
      '..oJJJJJJJJJJJJJJJJJJJJJJJJJJo....',
      '.oJjjjjjjjjjjjjjjjjjjjjjjjjjjjo...',
      'oJjjjjjjjjjjjjjjjjjjjjjjjjjjjjjo..',
      'ohHHHHHHHHHHHHHHHHHHHHHHHHHHHHho..',
      'ohHjjjjjjjjjjjjjjjjjjjjjjjjjjHho..',
      'ohHjhhhhhhhhhhhhhhhhhhhhhhhhjHho..',
      'ohHjhhhhhhhhhhhhhhhhhhhhhhhhjHho..',
      'ohHjhhoooooooooooooooooooohhjHho..',
      'ohHjhho1111111111111111111ohjHho..',
      'ohHjhho1oooooooooooooooo11ohjHho..',
      'ohHjhho1o..............o11ohjHho..',
      'ohHjhho1o..oo......oo..o11ohjHho..',
      'ohHjhho1o..hh......hh..o11ohjHho..',
      'ohHjhho1o..HH......HH..o11ohjHho..',
      'ohHjhho1o..HHoooooeHH..o11ohjHho..',
      'ohHjhho1o..HHoJJJJoHH..o11ohjHho..',
      'ohHjhho1o..HHoooooeHH..o11ohjHho..',
      'ohHjhho1o..HH......HH..o11ohjHho..',
      'ohHjhho1o..hh......hh..o11ohjHho..',
      'ohHjhho1o..oo......oo..o11ohjHho..',
      'ohHjhho1o..............o11ohjHho..',
      'ohHjhho1oooooooooooooooo11ohjHho..',
      'ohHjhho111111111111111111ohjHho...',
      'ohHjhhoooooooooooooooooooohjHho...',
      'ohHjhhhhhhhhhhhhhhhhhhhhhhhjHho...',
      'ohHjjjjjjjjjjjjjjjjjjjjjjjjjHho...',
      'ohHHHHHHHHHHHHHHHHHHHHHHHHHHHho...',
      'ohhhhhhhhhhhhhhhhhhhhhhhhhhhhho...',
      'ooooooooooooooooooooooooooooooo...'
    ]);

    /* THE STADIUM - banked stone, a crowd on it, and a lit arch */
    S('mp_stadium', [
      '............oooooooooo............',
      '.........oooJJJJJJJJJJooo.........',
      '.......ooJJJJjjjjjjjjJJJJoo.......',
      '.....ooJJjjjjhhhhhhhhjjjjJJoo.....',
      '....oJJjjhhhhhhhhhhhhhhhhjjJJo....',
      '...oJjjhhhhhhhhhhhhhhhhhhhhjjJo...',
      '..oJjhhoo.oo.oo.oo.oo.oo.oohhjJo..',
      '..oJjhhppoppoppoppoppoppopphhjJo..',
      '.oJjhhhppoppoppoppoppoppopphhhjJo.',
      '.oJjhhhhhhhhhhhhhhhhhhhhhhhhhhjJo.',
      'oJjhhhoo.oo.oo.oo.oo.oo.oo.oohhjJo',
      'oJjhhhppoppoppoppoppoppoppopphhjJo',
      'oJjhhhppoppoppoppoppoppoppopphhjJo',
      'oJjhhhhhhhhhhhhhhhhhhhhhhhhhhhhjJo',
      'oJjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjJo',
      'oJHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHJo',
      'oJhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhho',
      'oJhhhhhhhhhhoooooooohhhhhhhhhhhhho',
      'oJhhhhhhhhhoyyyyyyyyohhhhhhhhhhhho',
      'oJhhhhhhhhoyGGGGGGGGyohhhhhhhhhhho',
      'oJhhhhhhhoyGiiiiiiiiGyohhhhhhhhhho',
      'oJhhhhhhhoyGidddddddiGyohhhhhhhhho',
      'oJhhhhhhhoyGidDDDDDdiGyohhhhhhhhho',
      'oJhhhhhhhoyGidDDDDDdiGyohhhhhhhhho',
      'oJhhhhhhhoyGidDDDDDdiGyohhhhhhhhho',
      'oJhhhhhhhoyGidDDDDDdiGyohhhhhhhhho',
      'oJhhhhhhhoyGidDDDDDdiGyohhhhhhhhho',
      'oJhhhhhhhoyGidDDDDDdiGyohhhhhhhhho',
      'oJhhhhhhhooooooooooooooohhhhhhhhho',
      'oJjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjo',
      'oJHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHo',
      'ooooooooooooooooooooooooooooooooo.'
    ]);

    /* THE CART - the chef's stall: striped awning, a pot, two wheels */
    S('mp_cart', [
      '................oo................',
      '...............oGGo...............',
      '...............oGGo...............',
      '..ooooooooooooooooooooooooooo.....',
      '.oXXXXoRRRRoXXXXoRRRRoXXXXoRo.....',
      '.oXXXXoRRRRoXXXXoRRRRoXXXXoRo.....',
      '.oxxxxorrrroxxxxorrrroxxxxoro.....',
      '.ooooooooooooooooooooooooooooo....',
      '.o1o.......................o1o....',
      '.o1o......ooooooooo........o1o....',
      '.o1o.....oUVVVVVVVUo.......o1o....',
      '.o1o.....oUuuuuuuuUo.......o1o....',
      '.o1o.....oUaAaAaAaUo.......o1o....',
      '.o1o.....oUAaAaAaAUo.......o1o....',
      '.o1o.....oUaAaAaAaUo.......o1o....',
      '.o1o......oUUUUUUUo........o1o....',
      '.o1o.......ooooooo.........o1o....',
      '.o1ooooooooooooooooooooooooo1o....',
      '.o144444444444444444444444441o....',
      '.o133333333333333333333333331o....',
      '.o122222222222222222222222221o....',
      '.o121122112211221122112211221o....',
      '.o121122112211221122112211221o....',
      '.o111111111111111111111111111o....',
      '.ooooooooooooooooooooooooooooo....',
      '...oo1111oo..........oo1111oo.....',
      '..o11oooo11o........o11oooo11o....',
      '..o1oo22oo1o........o1oo22oo1o....',
      '..o1o2222o1o........o1o2222o1o....',
      '..o11oooo11o........o11oooo11o....',
      '...oo1111oo..........oo1111oo.....',
      '.....oooo..............oooo.......'
    ]);

    /* YOU, on the map. Fourteen by eighteen, because the buildings are
       thirty tall and a man who is taller than his own barn is a joke
       the map only gets to make once. Crown, beard, belly, boots. */
    S('mp_king0', [
      '...o.o.o......',
      '..oYoYoYo.....',
      '..oGYYYGo.....',
      '..oKKkkSo.....',
      '..oKoKoKo.....',
      '..oKKkkSo.....',
      '..owwwwbo.....',
      '.o%wwwbTo.....',
      'o%$wwbTTto....',
      'o%$cCTTTto....',
      'o%gyYYyGgo....',
      'o%$cTTTtoo....',
      '.o$cTTTto.....',
      '.o$oTTo.o.....',
      '..oo55oo......',
      '..ovUovUo.....',
      '..ouuouuo.....',
      '..oooooooo....'
    ]);
    S('mp_king1', [
      '..............',
      '...o.o.o......',
      '..oYoYoYo.....',
      '..oGYYYGo.....',
      '..oKKkkSo.....',
      '..oKoKoKo.....',
      '..oKKkkSo.....',
      '..owwwwbo.....',
      '.o%wwwbTo.....',
      'o%$wwbTTto....',
      'o%$cCTTTto....',
      'o%gyYYyGgo....',
      'o%$cTTTtoo....',
      '.o$cTTTto.....',
      '..oo55oo......',
      '..ovUovUo.....',
      '...ouuuo......',
      '..oooooooo....'
    ]);

    /* ------------------------------------------------------------------
       D. THE OCTOPUS CHEF. He sells the fish. He is forty pixels of
       purple, a paper hat, one closed eye and eight arms, six of which
       are doing something. Drawn front-on and big, because he is the
       only person in the game you buy anything from.
       ------------------------------------------------------------------ */
    S('oc_chef', [
      '.............ooWWWWWWWWWWWWWWWWWWWoo.............',
      '............obbWWWWWWWWWWWWWWWWWWWWWo............',
      '............obbWWWWWWWWWWWWWWWWWWWWWo............',
      '...........obbWWWWWWWWWWWWWWWWWWWWWWWo...........',
      '...........obbWWWWWWWWWWWWWWWWWWWWWWWo...........',
      '..........obbWWWWWWWWWWWWWWWWWWWWWWWWWo..........',
      '..........obbWWWWWWWWWWWWWWWWWWWWWWWWWo..........',
      '...........oBBBBBBBBBBBBBBBBBBBBBBBBBo...........',
      '...........obbbbbbbbbbbbbbbbbbbbbbbbbo...........',
      '...........oAAAAAAAAAAAAAAAAAAAAAAAZZo...........',
      '..........oAAAAAAAAAAAAAAAAAAAAAAAAAZZo..........',
      '.........oAAAAAAZAAAAAAAAAAAAAAAAAAAAZZo.........',
      '........oAAAAAAAAAAAAAAAAAAAAAAZAAAAAAZZo........',
      '.......oAAAAAAAAzzzzzAAAAAAAzzzzzAAAAAAZZo.......',
      '......oAAAAAAAAAWWWWWAAAAAAZWWWWWAAAAAAAZZo......',
      '.....oAAaaaaaaaWWWWWWWaaaZaWWWWWWWaaaaaaaZZo.....',
      '....oAAaaaaaaaaWWWooWWaZaaaWWooWWWaaaaaaaaZZo....',
      '....oAAaaaaaaaaWWoooWWaaaaaWoooWWWaaaaaaaaZZo....',
      '...oAAaaaaaaaaaWWoooWWaaaaaWoooWWWaaaaaaaaaZZo...',
      '...oAAaaaaaaaaaWWoooWWaaaaaWoooWWWaaaaaaaaaZZo...',
      '..oAAaaaaaaaaaaWWWWWWWaaaaaWWWWWWWaaaaaaaaaaZZo..',
      '..oAAaaaaaaaaaaaWWWWWaaaaaaaWWWWWaaaaaaaaaaaZZo..',
      '..oAAaaaaaaaaaaaaaaaaaaaaaaaZaaaaaaaaaaaaaaaZZo..',
      '..oAAaaaaaaaaaaaaaaaaazzzzzaaaaaaaaaaaaaaaaaZZo..',
      '.ojjjjjjjjaaaaaaaaaaaa$$$$$aaaaaaaaaaarrrrrrZZooo',
      '.ohhhhhhhhaaaaaaaaaaa%%%%%%%aaaaaaaaxoxxxxxxxxorr',
      '.ohhhhhhhh1111aaaaaaZa$$$$$aaaaaaaaXXWXXXXXXXXrrr',
      '.ohhhhhhhh2222aaaaZaaaazzzaaaaaaaaaaxxxxxxxxxxorr',
      '..oHHHHHHHaaaaaaaaaaaaaaaaaaaaaaaaaaaarrrrrroo.oo',
      '...ooooooAAaaaaaaaaaaaaaaaaaaaaaaaaaaaZZoooo.....',
      'oooo.....oAAaaaaa555555555555555aaaaaZZo.....oooo',
      'aaaaooooo.oooooouuuuuuuuuuuuuuuuuoooooo.oooooaaaa',
      'oAaaaaaaaooooAAaUUUUUUUUUUUUUUUUUaAAooooaaaaaaaAo',
      '.oZoAAaaaaaaaaaa66666666666666666aaaaaaaaaaAAoZo.',
      '..ooZooZoZooZooA66666zzz666666666AooZooZoZooZoo..',
      '....o..o.o..ooAa5555zzzzz55555555aAoo..o.o..o....',
      '...........oAAaa66666666666666666aaAAo...........',
      '..........oAaaa6666667777777666666aaaAo..........',
      '........ooAaaaa6666677777777766666aaaaAoo........',
      '......ooAAaaaao5555557777777555555oaaaaAAoo......',
      '....ooAAaaaaoo666666666666666666666ooaaaaAAoo....',
      '.oooAaaaaaoo.o666666666666666666666o.ooaaaaaAooo.',
      'oAaaaaaooo..oA666666666666666666666Ao..oooaaaaaAo',
      '.oooZoo.....o55555555555555555555555o.....ooZooo.',
      '....o......oAAaaoooAaaoooooaaAoooaaAAo......o....',
      '...........oAaaaooAAaao...oaaAAooaaaAo...........',
      '..........oAaaao.oAAao.....oaAAo.oaaaAo..........',
      '.........oAAaao...ooo.......ooo...oaaAAo.........',
      '..........oooo.....................oooo..........',
      '.................................................',
      '.................................................',
      '.................................................',
      '.................................................',
      '.................................................',
      '.................................................',
      '.................................................'
    ]);

    /* one fish on a hook. The cart hangs a row of them. */
    S('oc_hang', [
      '....o....',
      '...o.o...',
      '...ooo...',
      '....1....',
      '....1....',
      '..ooooo..',
      '.oxxrxxo.',
      'oxXXXXXxo',
      'oXXXXXXXo',
      'oXXWoXXXo',
      'oXXXXXXXo',
      'oxXXXXXxo',
      '.oxxxxxo.',
      '..oo.oo..',
      '...o.o...'
    ]);

    P.anim('mp_king', ['mp_king0', 'mp_king1'], 4);
  }

  return { build };
})();
