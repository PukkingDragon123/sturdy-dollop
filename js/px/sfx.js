/* ============================================================
   sfx.js - WebAudio blips. No asset files: every sound is a
   couple of oscillators and an envelope, which suits a game
   made entirely of hand-placed pixels.
   ============================================================ */
KD.Sfx = (function () {
  let ac = null, master = null, muted = false;
  function ensure() {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.24;
      master.connect(ac.destination);
    } catch (e) { ac = null; }
    return ac;
  }
  function tone(o) {
    if (muted || !ensure()) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.len);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.5 : o.vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.len);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + o.len + 0.02);
  }
  function noise(len, vol, hp) {
    if (muted || !ensure()) return;
    const t = ac.currentTime, n = (ac.sampleRate * len) | 0;
    const b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = b;
    const g = ac.createGain(); g.gain.value = vol === undefined ? 0.4 : vol;
    if (hp) {
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      src.connect(f); f.connect(g);
    } else src.connect(g);
    g.connect(master); src.start(t);
  }
  const CUES = {
    jump:    () => tone({ f0: 260, f1: 470, len: 0.10, type: 'square', vol: 0.30 }),
    tap:     () => noise(0.035, 0.22, 1600),
    break:   () => { noise(0.13, 0.42, 700); tone({ f0: 170, f1: 70, len: 0.11, type: 'triangle', vol: 0.24 }); },
    place:   () => tone({ f0: 380, f1: 260, len: 0.06, type: 'square', vol: 0.26 }),
    swing:   () => noise(0.07, 0.28, 2400),
    hit:     () => { noise(0.07, 0.4, 500); tone({ f0: 150, f1: 60, len: 0.09, type: 'square', vol: 0.3 }); },
    hurt:    () => tone({ f0: 300, f1: 90, len: 0.20, type: 'sawtooth', vol: 0.34 }),
    die:     () => { tone({ f0: 320, f1: 40, len: 0.7, type: 'sawtooth', vol: 0.4 }); noise(0.4, 0.2, 300); },
    pickup:  () => tone({ f0: 700, f1: 1100, len: 0.07, type: 'square', vol: 0.22 }),
    craft:   () => { tone({ f0: 520, f1: 780, len: 0.10, type: 'square', vol: 0.26 }); setTimeout(() => tone({ f0: 780, f1: 1040, len: 0.12, type: 'square', vol: 0.22 }), 70); },
    levelup: () => [0, 90, 180, 300].forEach((d, i) => setTimeout(() => tone({ f0: 440 + i * 170, len: 0.16, type: 'square', vol: 0.26 }), d)),
    click:   () => tone({ f0: 620, len: 0.03, type: 'square', vol: 0.2 }),
    deny:    () => tone({ f0: 190, f1: 120, len: 0.13, type: 'sawtooth', vol: 0.26 }),
    open:    () => tone({ f0: 300, f1: 520, len: 0.09, type: 'triangle', vol: 0.22 }),
    splash:  () => noise(0.22, 0.3, 900),
    kill:    () => { tone({ f0: 200, f1: 500, len: 0.12, type: 'square', vol: 0.3 }); noise(0.16, 0.3, 600); },
    beer:    () => { tone({ f0: 180, f1: 300, len: 0.22, type: 'triangle', vol: 0.3 }); noise(0.3, 0.16, 1200); },
    burp:    () => tone({ f0: 120, f1: 60, len: 0.3, type: 'sawtooth', vol: 0.3 }),
    victory: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone({ f0: f, len: 0.3, type: 'square', vol: 0.3 }), i * 150))
  };
  const play = (n) => { const c = CUES[n]; if (c) c(); };
  const mute = (v) => { muted = v === undefined ? !muted : !!v; return muted; };
  const isMuted = () => muted;
  return { play, mute, isMuted, resume: () => { if (ac && ac.state === 'suspended') ac.resume(); } };
})();
