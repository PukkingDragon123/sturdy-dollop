/* names, traits and goofy flavour text */
DZ.Names = {
  dolphin: ['Bubbles','Squeaks','Flipper','Chonk','Sir Splashley','Zoomer','Wetson','Noodle','Tuna Todd',
    'Blorp','Snoot','Gerald','Kevin','Mildred','Torpedo','Sushi','Beans','Nugget','Wobbles','Captain Nibbles',
    'Moist','Barnacle','Slappy','Fin Diesel','Dolph Lundgren','Echo','Pearl','Marina','Tidal Wave','Splishy',
    'Big Steve','Lil Squirt','Mayor Blowhole','Professor Squeak','Wendy','Aquathan','Clickbait','Sonar Sam'],
  rival: ['Baron Von Blowhole','Chad Wavedeep','Miss Fintastic','Kelpy Ken','Turbo Tim','Duchess Bubbles',
    'Reef Rick','Sharkbait Sharon','Old Man Mackerel','Zoinks','Gary Jr','Neptune Nate','Salty Sue',
    'Flipper Fitzgerald','Wet Bandit','Count Splashula','Brine Brad','Coralline','Admiral Wiggles','Foam Boy'],
  staffFirst: ['Doug','Tina','Gary','Vera','Hank','Sal','Moira','Bjorn','Pip','Rhonda','Chad','Nessa'],
  staffLast: ['the Damp','McSplash','Barnacle','Kelpington','O\'Brine','Fishwick','Von Tide','Bubbleton'],
  praise: ['NICE!','SPLASHY!','SQUEAKY CLEAN!','ATLANTEAN!','DOLPHINCREDIBLE!','ABSOLUTELY MOIST!','LEGENDARY!'],
  evilPraise: ['EVIL!','DEVIOUS!','SO WET, SO WRONG','THE ABYSS APPROVES','MWAHAHA!'],
  quipsFeed: ['*happy squeak*','*inhales fish*','MORE.','That was mid.','10/10 would eat again','*blorp*',
    'You are forgiven.','Tastes like victory.','*aggressive clicking*','I could eat a whale.'],
  quipsRace: ['Eat my bubbles!','I am speed.','My flippers hurt.','Was that a race?','Bet on me next time!',
    'I saw a crab. I got distracted.','Nobody beats the fin.','I did it for the snacks.'],
  quipsEvil: ['The tide obeys me.','Your reef is mine.','I have committed crimes.','Fear the flipper.',
    'I stole your lunch.','Behold: moisture.'],
  events: [
    'A crab unionised in your ranch. Nothing changed.',
    'Someone left a shopping cart in the lagoon.',
    'A tourist submarine drove past. Dolphins posed.',
    'Your dolphins invented a new sound. It is illegal.',
    'A seagull tried to steal a fish and got bullied.',
    'Poseidon left a 1-star review. Rude.',
    'Ancient Atlantean plumbing gurgled ominously.',
    'A dolphin learned to whistle the theme song.',
    'Kelp prices fluctuated dramatically for no reason.',
    'A fish asked to be let go. You said no.'
  ],

  /* traits: modifiers applied on top of base stats */
  TRAITS: {
    zoomer:   { name: 'Zoomer',    col: '#7ff0ff', mods: { speed: 3, stamina: -1 }, blurb: 'Cannot stop. Will not stop.' },
    chonky:   { name: 'Chonky',    col: '#ffb347', mods: { stamina: 4, burst: -2 }, blurb: 'Built like a submarine.' },
    gassy:    { name: 'Gassy',     col: '#c8ff4a', mods: { burst: 4, charm: -3 }, blurb: 'Propulsion of questionable origin.' },
    sleepy:   { name: 'Sleepy',    col: '#a8b8d8', mods: { stamina: 2, speed: -2, luck: 1 }, blurb: 'Races in its dreams.' },
    sassy:    { name: 'Sassy',     col: '#ff9ed2', mods: { charm: 4, agility: 1, stamina: -2 }, blurb: 'Backtalks the referee.' },
    lucky:    { name: 'Lucky',     col: '#40d492', mods: { luck: 5 }, blurb: 'Found three coins in a clam.' },
    chaotic:  { name: 'Chaotic',   col: '#ff6f6f', mods: { burst: 3, agility: 3, luck: -2 }, blurb: 'Unpredictable in every way.' },
    blessed:  { name: 'Poseidon-Touched', col: '#ffd24a', mods: { speed: 2, stamina: 2, charm: 2, luck: 2 }, blurb: 'Suspiciously shiny.' },
    slippery: { name: 'Slippery',  col: '#8fe0f5', mods: { agility: 4, stamina: -1 }, blurb: 'Cannot be held. Emotionally either.' },
    dramatic: { name: 'Dramatic',  col: '#ff9a3c', mods: { charm: 5, speed: -1 }, blurb: 'Fakes injuries for applause.' },
    feral:    { name: 'Feral',     col: '#c53a3a', mods: { burst: 2, speed: 2, charm: -4 }, blurb: 'Bites the trophy.' },
    genius:   { name: 'Evil Genius', col: '#a86bff', mods: { agility: 3, luck: 3, charm: -2 }, blurb: 'Has a whiteboard. Has plans.' },
    moist:    { name: 'Extremely Moist', col: '#7ff0ff', mods: { speed: 1, stamina: 1, agility: 1 }, blurb: 'Peak hydration.' },
    hungry:   { name: 'Bottomless', col: '#ffe27a', mods: { stamina: 3, charm: -1 }, blurb: 'Gains extra EXP from food.' }
  },

  randDolphin(used) {
    used = used || [];
    const pool = this.dolphin.filter((n) => !used.includes(n));
    const base = DZ.Util.pick(pool.length ? pool : this.dolphin);
    return used.includes(base) ? base + ' ' + DZ.Util.pick(['II','Jr','the 3rd','Prime','2.0']) : base;
  },
  randStaff() { return DZ.Util.pick(this.staffFirst) + ' ' + DZ.Util.pick(this.staffLast); },
  randTrait(exclude) {
    const keys = Object.keys(this.TRAITS).filter((k) => !(exclude || []).includes(k) && k !== 'genius');
    return DZ.Util.pick(keys);
  }
};
