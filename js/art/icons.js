/* ============================================================
   art/icons.js - the pictures that replaced the words.

   The interface used to be a list of capital letters: HEADBUTT
   12 AIR, TAIL SLAP 17 AIR, SPD 9, POW 6. Reading a fight is
   not the same as playing one, and four rows of two-letter
   abbreviations is a spreadsheet with a dolphin behind it.

   So everything you choose between has a picture now. The rule
   for all of them: 16x16, ONE readable silhouette, drawn at the
   size it is displayed. No shrunken detail, no two ideas in one
   frame - at sixteen pixels you get a shape and a colour and
   that is the whole budget.

   Light comes from the upper left on every one, like the rest
   of the game.
   ============================================================ */
KD.art.icons = (function () {
  const P = KD.PX;

  /* ---- the shared legend -------------------------------------
     Every icon draws from the same twelve characters so the set
     reads as one set: an ink outline, three neutral steps for
     the body of the shape, and a per-icon accent ramp that
     carries the meaning. */
  const L = {
    'o': 'INK.0',                                  // outline
    'i': 'INK.1',                                  // inner shade
    '.': null,
    '1': 'BONE.0', '2': 'BONE.1', '3': 'BONE.2',   // neutral body
    'w': 'WATER.1', 'W': 'WATER.3',                // water accent
    'g': 'GOLD.2', 'G': 'GOLD.3',                  // gold accent
    'r': 'BLOOD.2', 'R': 'BLOOD.3',                // blood accent
    'k': 'KELP.2', 'K': 'KELP.3',                  // kelp accent
    'p': 'ROT.2',  'P': 'ROT.3',                   // rot accent
    'c': 'CORAL.2', 'C': 'CORAL.3',                // coral accent
    'd': 'DEEP.2', 'D': 'DEEP.3',                  // deep accent
    's': 'STONE.1', 'S': 'STONE.3'                 // stone accent
  };
  const I = (name, px) => P.def(name, { pal: L, px: px });

  function build() {
    /* ================================================================
       THE MOVES

       Each one is the SHAPE OF THE ACTION, not a picture of a dolphin
       doing it - a dolphin at sixteen pixels is a grey smudge, and six
       grey smudges are not six choices. A blunt wedge going in, a fluke
       coming round, a cone of sound, a spiral, an arc breaking a line,
       a shield.
       ================================================================ */

    /* HEADBUTT - a blunt wedge driving right, with the impact on its nose */
    I('ic_ram', [
      '................',
      '................',
      'oooo............',
      'o222oo..........',
      'o22222oo........',
      'o2222222oo......',
      'o222222222oo....',
      'o22222222222oo..',
      'o222222222222Ro.',
      'o22222222222oo..',
      'o222222222oo....',
      'o2222222oo......',
      'o22222oo........',
      'o222oo..........',
      'oooo............',
      '................'
    ]);

    /* TAIL SLAP - a fluke swung round, with the sweep it leaves behind */
    I('ic_tail', [
      '................',
      'oo............oo',
      'o22oo......oo22o',
      'o2222oo..oo2222o',
      'o22222oooo22222o',
      '.o222222oo22222o',
      '.o22222o..o2222o',
      '..o2222o..o222o.',
      '...o222oooo22o..',
      '....o22222222o..',
      '.....o222222o...',
      '......o2222o....',
      '......o222o.....',
      '.......o22o.....',
      '.......oooo.....',
      '................'
    ]);

    /* SONAR - a cone of sound, three solid arcs widening out */
    I('ic_sonar', [
      '................',
      '....oo..........',
      '...o22o....W..W.',
      '..o2222o..W..W..',
      '..o2222o.W..W..W',
      '.o222222oW.W..W.',
      '.o222222oW.W..W.',
      '.o222222oW.W..W.',
      '.o222222oW.W..W.',
      '.o222222oW.W..W.',
      '.o222222oW.W..W.',
      '..o2222o.W..W..W',
      '..o2222o..W..W..',
      '...o22o....W..W.',
      '....oo..........',
      '................'
    ]);

    /* CORKSCREW - a spiral, drawn as stepped bars so it reads as a spin */
    I('ic_spin', [
      '................',
      '....oooooooo....',
      '..ooPPPPPPPPoo..',
      '.oPPPoooooooPPo.',
      '.oPPo.......oPo.',
      'oPPo..ooooo..oPo',
      'oPPo.oPPPPPo.oPo',
      'oPPo.oPo.....oPo',
      'oPPo.oPo.oooooPo',
      'oPPo.oPPPPPPPPo.',
      'oPPo.ooooooooo..',
      '.oPPo...........',
      '.oPPPoooooooo...',
      '..ooPPPPPPPPo...',
      '....oooooooo....',
      '................'
    ]);

    /* BREACH - an arc coming up through a waterline and out of the frame */
    I('ic_breach', [
      '................',
      '.......GGG......',
      '.....GGG3GGG....',
      '...GGG33333GGG..',
      '..GG3333333333G.',
      '.GG333ooooo333GG',
      '.G33oo.....oo33G',
      'oG3o.........o3G',
      'oGo...........oo',
      'oo..............',
      '................',
      'wwwwwwwwwwwwwwww',
      'WWWWWWWWWWWWWWWW',
      'wwwwwwwwwwwwwwww',
      'dddddddddddddddd',
      '................'
    ]);

    /* HOLD - a shield, plated, with a breath mark on it */
    I('ic_guard', [
      '................',
      '..oooooooooooo..',
      '.oKKKKKKKKKKKKo.',
      '.oK3333333333Ko.',
      '.oK3oo3333oo3Ko.',
      '.oK3o333333o3Ko.',
      '.oK33333333333o.',
      '.oK3333WW333Ko..',
      '.oK333WWWW33Ko..',
      '..oK33WWWW3Ko...',
      '..oK333WW33Ko...',
      '...oK333333Ko...',
      '....oK3333Ko....',
      '.....oK33Ko.....',
      '......oKKo......',
      '.......oo.......'
    ]);

    /* THE TURN - the finisher. A crown, because that is what it buys. */
    I('ic_turn', [
      '................',
      '................',
      '..o..........o..',
      '.oPo...oo...oPo.',
      '.oPo..oPPo..oPo.',
      '.oPPo.oPPo.oPPo.',
      '.oPPo oPPo oPPo.',
      '.oPPPoPPPPoPPPo.',
      '.oPPPPPPPPPPPPo.',
      '.oPP33PP33PP33o.',
      '.oPPPPPPPPPPPPo.',
      '.oPGGPPGGPPGGPo.',
      '.oPPPPPPPPPPPPo.',
      '..oooooooooooo..',
      '................',
      '................'
    ]);

    /* ================================================================
       THE FOUR STATS

       They are on every plate in the game and they used to be SPD, POW,
       STA and SPI. A wing, a fist, a lung, a flame.
       ================================================================ */

    /* SPEED - a swept wing with two speed bars behind it */
    I('ic_spd', [
      '................',
      '................',
      '..oo.....oo.....',
      '..oWo....oWo....',
      '..oWWo...oWWo...',
      '...oWWo...oWWo..',
      '....oWWo...oWWo.',
      '.....oWWo...oWWo',
      '.....oWWo...oWWo',
      '....oWWo...oWWo.',
      '...oWWo...oWWo..',
      '..oWWo...oWWo...',
      '..oWo....oWo....',
      '..oo.....oo.....',
      '................',
      '................'
    ]);

    /* POWER - a closed fist */
    I('ic_pow', [
      '................',
      '................',
      '..oooooooooo....',
      '.oRRRRRRRRRRo...',
      '.oRRRrrrrRRRo...',
      '.oRRRRRRRRRRo...',
      '.oRRRrrrrRRRo...',
      '.oRRRRRRRRRRo...',
      '..ooooo11ooooo..',
      '......o11o......',
      '......o11o......',
      '......o11o......',
      '......o11o......',
      '.......oo.......',
      '................',
      '................'
    ]);

    /* STAMINA - a lung, full */
    I('ic_sta', [
      '................',
      '.....oooooo.....',
      '...ooKKKKKKoo...',
      '..oKK3333KKKKo..',
      '.oKK33333KKKKKo.',
      '.oK333KKKKKKKKo.',
      'oKK33KKKKKKKKKKo',
      'oKK3KKKKKKKKKKKo',
      'oKKKKKKKKKKKKKKo',
      'oKKKKKKKKKKKKKKo',
      '.oKKKKKKKKKKKKo.',
      '.oKKKKKKKKKKKKo.',
      '..oKKKKKKKKKKo..',
      '...ooKKKKKKoo...',
      '.....oooooo.....',
      '................'
    ]);

    /* SPIRIT - a flame */
    I('ic_spi', [
      '................',
      '.......oo.......',
      '......oPPo......',
      '.....oPPPPo.....',
      '....oPPPPPPo....',
      '....oPPGGPPo....',
      '...oPPGGGGPPo...',
      '...oPGGGGGGPo...',
      '..oPPGGGGGGPPo..',
      '..oPGG3333GGPo..',
      '..oPGG3333GGPo..',
      '..oPPGG33GGPPo..',
      '...oPPGGGGPPo...',
      '....oPPPPPPo....',
      '.....oooooo.....',
      '................'
    ]);

    /* BOND - a heart, because bond is the gate on every move */
    I('ic_bond', [
      '................',
      '................',
      '..oooo..oooo....',
      '.oCCCCooCCCCo...',
      'oCCCCCCCCCCCCo..',
      'oCCcCCCCCCCCCo..',
      'oCCcCCCCCCCCCo..',
      '.oCCCCCCCCCCo...',
      '.oCCCCCCCCCCo...',
      '..oCCCCCCCCo....',
      '...oCCCCCCo.....',
      '....oCCCCo......',
      '.....oCCo.......',
      '......oo........',
      '................',
      '................'
    ]);

    /* ================================================================
       THE FOUR DRILLS
       ================================================================ */

    /* SPRINTS - a marker buoy on a line */
    I('ic_dr_spd', [
      '................',
      '...oooooooo.....',
      '...oWWWWWWWo....',
      '...oWWWWWWWWo...',
      '...oWWWWWWWo....',
      '...oWWWWWWo.....',
      '...oWWWWWWWo....',
      '...oWWWWWWWWo...',
      '...oWWWWWWWo....',
      '...oooooooo.....',
      '...o11o.........',
      '...o11o.........',
      '...o11o.........',
      '..oo11oo........',
      '..o1111o........',
      '..oooooo........'
    ]);

    /* WEIGHT - a stone on a rope */
    I('ic_dr_pow', [
      '................',
      '................',
      '.oo..........oo.',
      'oSSo........oSSo',
      'oSSo........oSSo',
      'oSSoo......ooSSo',
      'oSSSo......oSSSo',
      'oSSSoooooooSSSSo',
      'oSSSoSSSSSoSSSSo',
      'oSSSoooooooSSSSo',
      'oSSSo......oSSSo',
      'oSSoo......ooSSo',
      'oSSo........oSSo',
      'oSSo........oSSo',
      '.oo..........oo.',
      '................'
    ]);

    /* HOLDS - a stopwatch, holding its breath */
    I('ic_dr_sta', [
      '................',
      '..oooooooooooo..',
      '..o1111111111o..',
      '..oKKKKKKKKKKo..',
      '...oKKKKKKKKo...',
      '....oKKKKKKo....',
      '.....oKKKKo.....',
      '......oKKo......',
      '......oKKo......',
      '.....oK33Ko.....',
      '....oK3333Ko....',
      '...oK333333Ko...',
      '..oKKKKKKKKKKo..',
      '..o1111111111o..',
      '..oooooooooooo..',
      '................'
    ]);

    /* THE RING - a hoop to swim through */
    I('ic_dr_spi', [
      '................',
      '....oooooooo....',
      '..ooPPPPPPPPoo..',
      '.oPPPoooooo PPo.',
      '.oPPo......oPPo.',
      'oPPo........oPPo',
      'oPPo........oPPo',
      'oPPo........oPPo',
      'oPPo........oPPo',
      'oPPo........oPPo',
      'oPPo........oPPo',
      '.oPPo......oPPo.',
      '.oPPPoooooo PPo.',
      '..ooPPPPPPPPoo..',
      '....oooooooo....',
      '................'
    ]);

    /* ================================================================
       THE HUB AND THE CARD
       ================================================================ */

    /* the quarry: a pit seen from the gantry */
    I('ic_quarry', [
      '................',
      'oooooooooooooooo',
      'oSSSSSSSSSSSSSSo',
      'oso..........oso',
      'os.oooooooooo.so',
      'os.odddddddo..so',
      'os.odDDDDDdo..so',
      'os.odDwwDDdo..so',
      'os.odDwwDDdo..so',
      'os.odDDDDDdo..so',
      'os.odddddddo..so',
      'os.oooooooooo.so',
      'oso..........oso',
      'oSSSSSSSSSSSSSSo',
      'oooooooooooooooo',
      '................'
    ]);

    /* the water: swim with it */
    I('ic_swim', [
      '................',
      '................',
      '.....GG.........',
      '....G33G........',
      '....G33G........',
      '.....GG.........',
      '................',
      '..W..W..W..W..W.',
      '.WWWWWWWWWWWWWW.',
      'W..W..W..W..W..W',
      '................',
      '.w..w..w..w..w..',
      'wwwwwwwwwwwwwwww',
      '..w..w..w..w..w.',
      '................',
      '................'
    ]);

    /* sleep: a moon over the pens */
    I('ic_sleep', [
      '................',
      '.....oooo.......',
      '...oo3333oo.....',
      '..o333333333o...',
      '.o3333oooo333o..',
      '.o333oo..ooo33o.',
      'o3333o.....oo3o.',
      'o3333o......o3o.',
      'o3333o......o3o.',
      'o3333o.....oo3o.',
      '.o333oo..ooo33o.',
      '.o3333oooo333o..',
      '..o333333333o...',
      '...oo3333oo.....',
      '.....oooo.......',
      '................'
    ]);

    /* the dealer's cart */
    I('ic_dealer', [
      '................',
      '..oooooooooooo..',
      '.oGGGGGGGGGGGGo.',
      '.o111111111111o.',
      '.o1oo1oo1oo1o1o.',
      '.o111111111111o.',
      '.o1oo1oo1oo1o1o.',
      '.o111111111111o.',
      '.oooooooooooooo.',
      '..o..........o..',
      '..o..........o..',
      '.ooo........ooo.',
      'o1o1o......o1o1o',
      'o1o1o......o1o1o',
      '.ooo........ooo.',
      '................'
    ]);

    /* clams - the money */
    I('ic_clam', [
      '................',
      '................',
      '.......oo.......',
      '.....ooGGoo.....',
      '...ooGGGGGGoo...',
      '..oGoGGoGGoGGo..',
      '.oGGoGGoGGoGGGo.',
      '.oGGoGGoGGoGGGo.',
      'oGGGoGGoGGoGGGGo',
      'oGGGoGGoGGoGGGGo',
      'oGGGoGGoGGoGGGGo',
      'oGGGGGGGGGGGGGGo',
      '.oGGGGGGGGGGGGo.',
      '..oooooooooooo..',
      '................',
      '................'
    ]);

    /* the day's energy */
    I('ic_energy', [
      '................',
      '.........ooo....',
      '........oGGo....',
      '.......oGGo.....',
      '......oGGo......',
      '.....oGGo.......',
      '....oGGGGGGo....',
      '...oGGGGGGGo....',
      '......oGGo......',
      '.....oGGo.......',
      '....oGGo........',
      '...oGGo.........',
      '...ooo..........',
      '................',
      '................',
      '................'
    ]);

    /* mending - an animal that cannot enter */
    I('ic_hurt', [
      '................',
      '................',
      '..oo........oo..',
      '.orro......orro.',
      '..orro....orro..',
      '...orro..orro...',
      '....orroorro....',
      '.....orrrro.....',
      '.....orrrro.....',
      '....orroorro....',
      '...orro..orro...',
      '..orro....orro..',
      '.orro......orro.',
      '..oo........oo..',
      '................',
      '................'
    ]);

    /* ================================================================
       THE SKILL TREE

       Six node icons, one per branch shape, so a node reads as what it
       DOES before you have read a word of it.
       ================================================================ */

    /* a wider window */
    I('ic_sk_window', [
      '................',
      '................',
      '..oo........oo..',
      '.oKKo......oKKo.',
      '.oKKKo....oKKKo.',
      '.oKKKKo..oKKKKo.',
      '.oKKo.oo.o..oKo.',
      '.oKKo......oKKo.',
      '.oKKo......oKKo.',
      '.oKKo.oo.o..oKo.',
      '.oKKKKo..oKKKKo.',
      '.oKKKo....oKKKo.',
      '.oKKo......oKKo.',
      '..oo........oo..',
      '................',
      '................'
    ]);

    /* cheaper air */
    I('ic_sk_air', [
      '................',
      '.....oo..oo.....',
      '....oWWooWWo....',
      '...oWWWWWWWWo...',
      '...oWWWWWWWWo...',
      '....oWWooWWo....',
      '.....oo..oo.....',
      '................',
      '.......oo.......',
      '......oWWo......',
      '.....oWWWWo.....',
      '.....oWWWWo.....',
      '......oWWo......',
      '.......oo.......',
      '................',
      '................'
    ]);

    /* a counter */
    I('ic_sk_counter', [
      '................',
      '................',
      '....oooooooo....',
      '...oGGGGGGGGo...',
      '..oGGoooooGGGo..',
      '.oGGo.....oGGGo.',
      '.oGo.......oGGo.',
      '.ooo.......oGGo.',
      '...........oGGo.',
      '..oo.......oGGo.',
      '..oGGo.....oGGo.',
      '..oGGGGo..oGGGo.',
      '...oGGGGooGGGo..',
      '....oGGGGGGGo...',
      '.....ooooooo....',
      '................'
    ]);

    /* a combo slot */
    I('ic_sk_combo', [
      '................',
      '................',
      '..oo.......oo...',
      '..oGo......oGo..',
      '..oGGo.....oGGo.',
      '...oGGo.....oGGo',
      '....oGGo.....oGo',
      '.....oGo......oo',
      '.....oGo......oo',
      '....oGGo.....oGo',
      '...oGGo.....oGGo',
      '..oGGo.....oGGo.',
      '..oGo......oGo..',
      '..oo.......oo...',
      '................',
      '................'
    ]);

    /* a bigger heart - survivability */
    I('ic_sk_heart', [
      '................',
      '................',
      '..oooo..oooo....',
      '.oRRRRooRRRRo...',
      'oRRRRRRRRRRRRo..',
      'oRRRRRRRRRRRRo..',
      'oRRR333333RRRo..',
      '.oRR333333RRo...',
      '.oRRRRRRRRRRo...',
      '..oRRRRRRRRo....',
      '...oRRRRRRo.....',
      '....oRRRRo......',
      '.....oRRo.......',
      '......oo........',
      '................',
      '................'
    ]);

    /* a crit - the spike */
    I('ic_sk_crit', [
      '................',
      '.......oo.......',
      '......oGGo......',
      '......oGGo......',
      '..o...oGGo...o..',
      '.oGo..oGGo..oGo.',
      '..oGo.oGGo.oGo..',
      '...oGooGGooGo...',
      '....oGGGGGGo....',
      '...oGooGGooGo...',
      '..oGo.oGGo.oGo..',
      '.oGo..oGGo..oGo.',
      '..o...oGGo...o..',
      '......oGGo......',
      '.......oo.......',
      '................'
    ]);

    /* a locked node */
    I('ic_sk_lock', [
      '................',
      '................',
      '.....oooooo.....',
      '....oo1111oo....',
      '...o11oooo11o...',
      '...o1oo..oo1o...',
      '...o1o....o1o...',
      '.oooooooooooooo.',
      '.o111111111111o.',
      '.o11oo1111oo11o.',
      '.o11o111111o11o.',
      '.o11oo1111oo11o.',
      '.o111111111111o.',
      '.oooooooooooooo.',
      '................',
      '................'
    ]);
  }

  return { build };
})();
