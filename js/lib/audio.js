/* ============================================================
   audio.js - 100% procedural WebAudio. No files, no loading.
   Bloops, chomps, splashes, coins plus a lazy underwater arpeggio.
   ============================================================ */
KA.A = (function () {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let muted = false, noiseBuf = null;
  let started = false;

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
    const len = ctx.sampleRate * 0.5;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    started = true;
    return true;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, dur, opts) {
    if (!init() || muted) return;
    opts = opts || {};
    const t0 = ctx.currentTime + (opts.delay || 0);
    const o = ctx.createOscillator();
    o.type = opts.type || 'square';
    const g = ctx.createGain();
    const vol = (opts.vol === undefined ? 0.25 : opts.vol);
    o.frequency.setValueAtTime(freq, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = opts.filter;
      node.connect(f); node = f;
    }
    node.connect(g);
    g.connect(opts.music ? musicGain : sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, opts) {
    if (!init() || muted) return;
    opts = opts || {};
    const t0 = ctx.currentTime + (opts.delay || 0);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 900, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(Math.max(60, opts.to), t0 + dur);
    f.Q.value = opts.q === undefined ? 1.2 : opts.q;
    const g = ctx.createGain();
    const vol = opts.vol === undefined ? 0.2 : opts.vol;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  const R = (a, b) => a + Math.random() * (b - a);

  const bank = {
    click:    () => tone(660, 0.05, { vol: 0.12, type: 'square' }),
    blip:     () => tone(880, 0.06, { vol: 0.1, to: 1200 }),
    deny:     () => { tone(200, 0.12, { vol: 0.16, type: 'sawtooth', to: 120 }); },
    hover:    () => tone(1200, 0.03, { vol: 0.05 }),
    spear:    () => { noise(0.14, { freq: 2400, to: 500, vol: 0.16, q: 0.7 }); tone(520, 0.09, { vol: 0.08, to: 200, type: 'triangle' }); },
    hit:      () => { noise(0.1, { freq: 500, to: 160, vol: 0.24, q: 0.6 }); tone(180, 0.08, { vol: 0.14, type: 'square', to: 90 }); },
    pop:      () => { tone(R(700, 1000), 0.07, { vol: 0.14, to: 240, type: 'sine' }); noise(0.07, { freq: 1600, to: 500, vol: 0.1 }); },
    net:      () => { noise(0.18, { freq: 700, to: 1800, vol: 0.12, q: 0.9 }); tone(300, 0.12, { vol: 0.07, to: 700, type: 'triangle' }); },
    chomp:    () => { tone(140, 0.07, { vol: 0.2, type: 'square', to: 70 }); tone(90, 0.1, { vol: 0.14, delay: 0.06, type: 'square', to: 50 }); },
    coin:     () => { tone(1046, 0.06, { vol: 0.14, type: 'square' }); tone(1568, 0.12, { vol: 0.12, delay: 0.055, type: 'square' }); },
    cash:     () => { for (let i = 0; i < 4; i++) tone(880 + i * 220, 0.07, { vol: 0.1, delay: i * 0.05, type: 'square' }); },
    bubble:   () => tone(R(400, 900), 0.05, { vol: 0.05, to: R(900, 1500), type: 'sine' }),
    dash:     () => { noise(0.22, { freq: 300, to: 2200, vol: 0.14, q: 0.8 }); },
    splash:   () => { noise(0.3, { freq: 2600, to: 300, vol: 0.2, q: 0.5 }); },
    jump:     () => { tone(400, 0.18, { vol: 0.1, to: 1100, type: 'triangle' }); },
    squeak:   () => { tone(R(1200, 1500), 0.08, { vol: 0.11, to: R(1900, 2400), type: 'square' });
                      tone(R(1600, 1900), 0.07, { vol: 0.09, delay: 0.07, to: 1200, type: 'square' }); },
    happy:    () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.11, { vol: 0.12, delay: i * 0.06, type: 'square' })); },
    levelup:  () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, { vol: 0.13, delay: i * 0.07, type: 'square' })); },
    whistle:  () => { tone(1400, 0.5, { vol: 0.13, to: 1800, type: 'triangle' }); },
    cheer:    () => { noise(0.9, { freq: 1200, to: 700, vol: 0.13, q: 0.4 }); },
    evil:     () => { [220, 175, 147, 110].forEach((f, i) => tone(f, 0.3, { vol: 0.14, delay: i * 0.12, type: 'sawtooth', filter: 700 })); },
    zap:      () => { tone(1800, 0.1, { vol: 0.12, to: 200, type: 'sawtooth' }); noise(0.12, { freq: 3000, to: 400, vol: 0.1 }); },
    thud:     () => { tone(110, 0.16, { vol: 0.18, type: 'square', to: 60 }); },
    swoosh:   () => noise(0.16, { freq: 900, to: 2400, vol: 0.09, q: 1 }),
    slap:     () => { noise(0.12, { freq: 400, to: 120, vol: 0.22, q: 0.5 }); tone(150, 0.1, { vol: 0.12, to: 70, type: 'square' }); },
    sonar:    () => { tone(1500, 0.5, { vol: 0.1, to: 400, type: 'sine' }); tone(750, 0.5, { vol: 0.06, delay: 0.1, to: 300, type: 'sine' }); },
    error:    () => { tone(160, 0.18, { vol: 0.15, type: 'square', to: 100 }); },
    /* new cues for the remake */
    gulp:     () => { tone(220, 0.10, { vol: 0.16, type: 'sine', to: 90 }); noise(0.12, { freq: 500, to: 180, vol: 0.1 }); },
    burp:     () => { tone(120, 0.28, { vol: 0.18, type: 'sawtooth', to: 60, filter: 500 }); },
    clash:    () => { noise(0.16, { freq: 3200, to: 900, vol: 0.2, q: 1.4 }); tone(700, 0.1, { vol: 0.1, to: 280, type: 'square' }); },
    charge:   () => { tone(260, 0.5, { vol: 0.07, to: 900, type: 'triangle' }); },
    reel:     () => { noise(0.08, { freq: 1500, to: 900, vol: 0.09, q: 2 }); },
    roll:     () => { for (let i = 0; i < 6; i++) tone(500 + i * 90, 0.05, { vol: 0.08, delay: i * 0.055, type: 'square' }); },
    jackpot:  () => { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.2, { vol: 0.13, delay: i * 0.075, type: 'square' })); },
    step:     () => { noise(0.06, { freq: 320, to: 160, vol: 0.06, q: 1 }); },
    door:     () => { tone(180, 0.18, { vol: 0.12, type: 'triangle', to: 300 }); noise(0.14, { freq: 700, to: 300, vol: 0.08 }); },
    hurt:     () => { tone(300, 0.16, { vol: 0.18, type: 'sawtooth', to: 120 }); noise(0.14, { freq: 900, to: 250, vol: 0.14 }); }
  };

  function play(name) {
    const f = bank[name];
    if (f) { init(); resume(); if (!muted) f(); }
  }

  // --- ambient music: slow pentatonic arpeggio + soft pad -------
  const SCALE = [0, 3, 5, 7, 10, 12, 15];
  const ROOTS = [146.83, 174.61, 130.81, 196.00];
  let beat = 0, mt = 0, bar = 0, musicOn = true;
  function tick(dt) {
    if (!musicOn || muted || !started) return;
    mt += dt;
    const spb = 0.42;
    while (mt > spb) {
      mt -= spb;
      const root = ROOTS[bar % ROOTS.length];
      const step = SCALE[(beat * 2 + (beat % 3)) % SCALE.length];
      const f = root * Math.pow(2, step / 12);
      tone(f, 0.5, { vol: 0.055, type: 'triangle', music: true, filter: 1400 });
      if (beat % 4 === 0) tone(root / 2, 1.6, { vol: 0.05, type: 'sine', music: true, filter: 500 });
      if (beat % 8 === 5) tone(f * 2, 0.3, { vol: 0.03, type: 'sine', music: true });
      beat++;
      if (beat % 8 === 0) bar++;
    }
  }
  function toggleMute() {
    muted = !muted;
    if (init() && master) master.gain.value = muted ? 0 : 0.55;
    return muted;
  }
  function isMuted() { return muted; }
  function toggleMusic() { musicOn = !musicOn; return musicOn; }

  return { play, tick, init, resume, toggleMute, isMuted, toggleMusic, tone, noise };
})();
