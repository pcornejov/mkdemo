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

    // Musical Note Frequencies (Hz)
    const C2 = 65.41;
    const D2 = 73.42;
    const E2 = 82.41;
    const F2 = 87.31;
    const G2 = 98.00;
    const Ab2 = 103.83;
    const A2 = 110.00;
    const Bb2 = 116.54;
    const C3 = 130.81;
    const D3 = 146.83;
    const E3 = 164.81;

    // 5 Different Tracks
    this.tracks = [
      {
        // Track 1: D-Minor Heavy Chugging
        tempo: 150,
        guitar: [D2, D2, F2, D2, G2, D2, Ab2, G2, D2, D2, F2, D2, C2, D2, D3, D2],
        kick:   [true, false, true, false, true, false, true, false, true, false, true, false, true, true, false, false],
        snare:  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hat:    [false, true, false, true, false, true, false, true, false, true, false, true, false, true, true, true]
      },
      {
        // Track 2: E-Minor Thrash
        tempo: 180,
        guitar: [E2, 0, E2, E2, G2, E2, A2, G2, E2, E2, E3, 0, D3, 0, C3, 0],
        kick:   [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        snare:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        hat:    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]
      },
      {
        // Track 3: A-Minor Breakdown
        tempo: 110,
        guitar: [A2, 0, 0, A2, A2, 0, A2, 0, C3, 0, A2, A2, 0, G2, 0, E2],
        kick:   [true, false, false, true, true, false, true, false, false, false, true, true, false, false, false, false],
        snare:  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hat:    [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
      },
      {
        // Track 4: C-Minor Melodic Death
        tempo: 160,
        guitar: [C2, D2, Eb2, C2, G2, F2, Eb2, D2, C2, D2, Eb2, C2, Ab2, G2, F2, Eb2],
        kick:   [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, true],
        snare:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        hat:    [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true]
      },
      {
        // Track 5: Bb-Minor Groovy Doom
        tempo: 130,
        guitar: [Bb2, Bb2, Db2, 0, Bb2, 0, Eb2, 0, Bb2, Bb2, F2, 0, Eb2, 0, Db2, C2],
        kick:   [true, false, false, false, true, false, false, true, true, false, false, false, true, false, false, true],
        snare:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        hat:    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]
      }
    ];

    this.currentTrackIndex = 0;
    this.loopCount = 0;
    this.loopsPerTrack = 8; // Change track every 8 loops (bars)
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
    const track = this.tracks[this.currentTrackIndex];
    const secondsPerBeat = 60.0 / track.tempo;
    const stepDuration = secondsPerBeat / 4; // 16th notes
    this.nextNoteTime += stepDuration;
    
    this.currentStep++;
    if (this.currentStep >= 16) {
      this.currentStep = 0;
      this.loopCount++;
      if (this.loopCount >= this.loopsPerTrack) {
        this.loopCount = 0;
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
      }
    }
  }

  // Synthesize instruments on the fly
  scheduleStep(step, time) {
    const track = this.tracks[this.currentTrackIndex];
    
    // 1. Guitar / Bass Synth (Distorted Sawtooth)
    const noteFreq = track.guitar[step];
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
    if (track.kick[step]) {
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
    if (track.snare[step]) {
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
    if (track.hat[step]) {
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
