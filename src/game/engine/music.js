// src/game/engine/music.js

class MetalMusicEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.tempo = 150; // Fast heavy metal tempo (BPM)
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // seconds
    this.nextNoteTime = 0.0;
    this.currentStep = 0;
    this.timerId = null;
    this.masterVolume = null;
    this.distortionCurve = this.makeDistortionCurve(80);

    // D-Minor Heavy Metal Riff notes (frequencies in Hz)
    const D2 = 73.42;
    const D3 = 146.83;
    const F2 = 87.31;
    const G2 = 98.00;
    const Ab2 = 103.83;
    const C2 = 65.41;

    // 16-step metal riff
    this.guitarRiff = [
      D2, D2, F2, D2, G2, D2, Ab2, G2,
      D2, D2, F2, D2, C2, D2, D3, D2
    ];

    // Heavy Double-Bass drum pattern
    this.kickPattern = [
      true, false, true, false, true, false, true, false,
      true, false, true, false, true, true, false, false
    ];

    // Snare hits on 4 and 12
    this.snarePattern = [
      false, false, false, false, true, false, false, false,
      false, false, false, false, true, false, false, false
    ];

    // Hi-hats on off-beats
    this.hatPattern = [
      false, true, false, true, false, true, false, true,
      false, true, false, true, false, true, true, true
    ];
  }

  makeDistortionCurve(amount) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  initAudio() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.value = 0.18; // Keep it rich but not deafening
    this.masterVolume.connect(this.ctx.destination);
  }

  play() {
    this.initAudio();
    if (this.isPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.currentStep = 0;

    // Scheduler loop
    const scheduler = () => {
      while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleStep(this.currentStep, this.nextNoteTime);
        this.advanceStep();
      }
      this.timerId = setTimeout(scheduler, this.lookahead);
    };

    scheduler();
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    clearTimeout(this.timerId);
    if (this.ctx) {
      this.ctx.suspend();
    }
  }

  advanceStep() {
    const secondsPerBeat = 60.0 / this.tempo;
    const stepDuration = secondsPerBeat / 4; // 16th notes
    this.nextNoteTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  // Synthesize instruments on the fly
  scheduleStep(step, time) {
    // 1. Guitar / Bass Synth (Distorted Sawtooth)
    const noteFreq = this.guitarRiff[step];
    if (noteFreq) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const waveShaper = this.ctx.createWaveShaper();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, time);

      // Distort
      waveShaper.curve = this.distortionCurve;
      waveShaper.oversample = '4x';

      // Heavy lowpass filter to simulate guitar cabinet speaker
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, time);
      filter.Q.setValueAtTime(2.0, time);

      // Volume envelope (chugging decay)
      gainNode.gain.setValueAtTime(0.0, time);
      gainNode.gain.linearRampToValueAtTime(0.65, time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(waveShaper);
      waveShaper.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterVolume);

      osc.start(time);
      osc.stop(time + 0.15);
    }

    // 2. Heavy Kick Drum (Double-Bass chug)
    if (this.kickPattern[step]) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);

      gainNode.gain.setValueAtTime(1.0, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gainNode);
      gainNode.connect(this.masterVolume);

      osc.start(time);
      osc.stop(time + 0.15);
    }

    // 3. Noise Snare Drum
    if (this.snarePattern[step]) {
      // Create noise buffer
      const bufferSize = this.ctx.sampleRate * 0.18; // 180ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.7, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterVolume);

      // Add a small sine pitch sweep for the drum shell body
      const shellOsc = this.ctx.createOscillator();
      const shellGain = this.ctx.createGain();
      shellOsc.frequency.setValueAtTime(180, time);
      shellOsc.frequency.linearRampToValueAtTime(120, time + 0.08);
      shellGain.gain.setValueAtTime(0.4, time);
      shellGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
      shellOsc.connect(shellGain);
      shellGain.connect(this.masterVolume);

      noiseNode.start(time);
      shellOsc.start(time);
      shellOsc.stop(time + 0.1);
    }

    // 4. Noise Hi-Hat (Metallic crash)
    if (this.hatPattern[step]) {
      const bufferSize = this.ctx.sampleRate * 0.04; // 40ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.25, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterVolume);

      noiseNode.start(time);
    }
  }
}

export const metalMusic = new MetalMusicEngine();
export default metalMusic;
