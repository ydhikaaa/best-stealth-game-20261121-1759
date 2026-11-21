// audio.js — WebAudio synth only: footsteps, coin clink, douse hiss, alarm
// sting, success jingle, and a low train rumble/clack ambience loop.
// No audio files. Everything is oscillators and filtered noise buffers.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.ambienceOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, filterFreq, type = 'lowpass', delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  footstep(loud) {
    this.noise(loud ? 0.09 : 0.05, loud ? 0.16 : 0.05, loud ? 900 : 420);
  }

  coin() {
    this.tone(2093, 0.09, 'sine', 0.20);
    this.tone(2637, 0.16, 'sine', 0.16, null, 0.055);
    this.noise(0.03, 0.06, 5000, 'highpass');
  }

  douse() {
    this.noise(0.35, 0.14, 2600, 'bandpass');
    this.tone(320, 0.25, 'sine', 0.05, 90);
  }

  smokePop() {
    this.noise(0.28, 0.12, 700);
  }

  pickup(big) {
    this.tone(big ? 1319 : 1047, 0.10, 'triangle', 0.16);
    this.tone(big ? 1760 : 1568, 0.14, 'triangle', 0.12, null, 0.06);
  }

  alarm() {
    this.tone(880, 0.16, 'sawtooth', 0.20, 660);
    this.tone(880, 0.16, 'sawtooth', 0.20, 660, 0.18);
    this.tone(1175, 0.30, 'sawtooth', 0.18, 587, 0.36);
  }

  jingle() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.16, 'triangle', 0.15, null, i * 0.09));
  }

  fanfare() {
    const notes = [392, 523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => this.tone(n, 0.22, 'triangle', 0.16, null, i * 0.11));
  }

  // Looping train ambience: brown-ish rumble plus a periodic rail clack.
  startAmbience() {
    if (!this.ctx || this.ambienceOn || this.muted) return;
    this.ambienceOn = true;
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    const clack = () => {
      if (!this.ambienceOn) return;
      this.noise(0.05, 0.10, 300);
      this.noise(0.05, 0.08, 300, 'lowpass', 0.14);
      this.clackTimer = setTimeout(clack, 1150);
    };
    clack();
  }

  stopAmbience() {
    this.ambienceOn = false;
    if (this.clackTimer) clearTimeout(this.clackTimer);
  }
}
