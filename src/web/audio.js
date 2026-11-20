// Procedural WebAudio sounds (no external assets): night music drone + effect blips.
export function createAudio(getVolume) {
  let ctx = null, master = null, musicNodes = null, wantMusic = false;
  const api = {
    windWarned: false,
    unlock() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = getVolume(); master.connect(ctx.destination);
        if (wantMusic) startMusic();
      } catch (e) { ctx = null; }
    },
    setVolume() { if (master) master.gain.value = getVolume(); },
    music(on) { wantMusic = on; if (!ctx) return; on ? startMusic() : stopMusic(); },
    play(name) {
      if (!ctx) return;
      const S = {
        pick: [[880, 1320, 0.08, 'sine', 0.15]], lit: [[440, 880, 0.5, 'triangle', 0.25], [660, 1320, 0.6, 'sine', 0.15]],
        pulse: [[300, 900, 0.3, 'sine', 0.25]], hit: [[200, 80, 0.3, 'sawtooth', 0.2]], jump: [[300, 600, 0.12, 'square', 0.08]],
        dash: [[600, 200, 0.12, 'triangle', 0.15]], win: [[523, 523, 0.25, 'triangle', 0.2], [659, 659, 0.25, 'triangle', 0.2, 0.2], [784, 784, 0.5, 'triangle', 0.2, 0.4]],
        lose: [[392, 196, 0.8, 'triangle', 0.2]], spawn: [[120, 60, 0.5, 'sawtooth', 0.12]], tick: [[1000, 1000, 0.05, 'square', 0.08]],
        charm: [[700, 1400, 0.3, 'sine', 0.2]], wind: [[200, 400, 1.2, 'sine', 0.06]],
      }[name];
      if (!S) return;
      for (const [f0, f1, dur, type, vol, delay = 0] of S) {
        const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
      }
    },
  };
  function startMusic() {
    if (musicNodes) return;
    const g = ctx.createGain(); g.gain.value = 0.05; g.connect(master);
    const oscs = [110, 164.8, 220].map((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = i * 4; o.connect(g); o.start(); return o; });
    musicNodes = { g, oscs };
  }
  function stopMusic() { if (!musicNodes) return; musicNodes.oscs.forEach((o) => o.stop()); musicNodes.g.disconnect(); musicNodes = null; }
  return api;
}
