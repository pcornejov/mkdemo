// src/game/engine/music.js

class MetalMusicEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // seconds
    this.nextNoteTime = 0.0;
    this.currentStep = 0;
    this.timerId = null;
    this.masterVolume = null;
    this.distortionCurve = this.makeDistortionCurve(100); // More distortion!

    // Helper for note frequencies
    this.noteFreq = (noteStr) => {
      if (!noteStr || noteStr === 0 || noteStr === '_') return 0;
      const match = noteStr.match(/^([A-G][b#]?)([0-9])$/);
      if (!match) return 0;
      const note = match[1];
      const octave = parseInt(match[2], 10);
      const notes = { 'C': 16.35, 'Db': 17.32, 'D': 18.35, 'Eb': 19.45, 'E': 20.60, 'F': 21.83, 'Gb': 23.12, 'G': 24.50, 'Ab': 25.96, 'A': 27.50, 'Bb': 29.14, 'B': 30.87 };
      return notes[note] * Math.pow(2, octave);
    };

    const _ = 0;

    // 5 Different Tracks, enhanced with bass and lead layers, plus crashes
    this.tracks = [
      {
        // Track 1: D-Minor Heavy Chugging
        tempo: 155,
        guitar: ['D2', 'D2', 'F2', 'D2', 'G2', 'D2', 'Ab2', 'G2', 'D2', 'D2', 'F2', 'D2', 'C2', 'D2', 'D3', 'D2'],
        bass:   ['D1', 'D1', 'F1', 'D1', 'G1', 'D1', 'Ab1', 'G1', 'D1', 'D1', 'F1', 'D1', 'C1', 'D1', 'D2', 'D1'],
        lead:   ['D4', _,    'A4', _,    'F4', _,    'G4', 'A4', 'D4', _,    'C5', _,    'A4', _,    'G4', 'F4'],
        kick:   [true, false, true, false, true, false, true, false, true, false, true, false, true, true, false, false],
        snare:  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hat:    [false, true, false, true, false, true, false, true, false, true, false, true, false, true, true, true],
        crash:  [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
      },
      {
        // Track 2: E-Minor Thrash
        tempo: 185,
        guitar: ['E2', _, 'E2', 'E2', 'G2', 'E2', 'A2', 'G2', 'E2', 'E2', 'E3', _, 'D3', _, 'C3', _],
        bass:   ['E1', _, 'E1', 'E1', 'G1', 'E1', 'A1', 'G1', 'E1', 'E1', 'E2', _, 'D2', _, 'C2', _],
        lead:   ['E5', 'B4', 'G4', 'B4', 'E5', 'B4', 'G4', 'B4', 'D5', 'A4', 'F4', 'A4', 'C5', 'G4', 'E4', 'G4'],
        kick:   [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        snare:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        hat:    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        crash:  [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false]
      },
      {
        // Track 3: A-Minor Breakdown (Half-time feel)
        tempo: 120,
        guitar: ['A2', _, _, 'A2', 'A2', _, 'A2', _, 'C3', _, 'A2', 'A2', _, 'G2', _, 'E2'],
        bass:   ['A1', _, _, 'A1', 'A1', _, 'A1', _, 'C2', _, 'A1', 'A1', _, 'G1', _, 'E1'],
        lead:   ['A4', _, 'E5', _, 'C5', _, 'A4', _, 'G4', _, 'D5', _, 'B4', _, 'G4', _],
        kick:   [true, false, false, true, true, false, true, false, false, false, true, true, false, false, false, false],
        snare:  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hat:    [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        crash:  [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
      },
      {
        // Track 4: C-Minor Melodic Death
        tempo: 165,
        guitar: ['C2', 'D2', 'Eb2', 'C2', 'G2', 'F2', 'Eb2', 'D2', 'C2', 'D2', 'Eb2', 'C2', 'Ab2', 'G2', 'F2', 'Eb2'],
        bass:   ['C1', 'C1', 'C1',  'C1', 'C1', 'C1', 'C1',  'C1', 'C1', 'C1', 'C1',  'C1', 'Ab1','Ab1','Ab1','Ab1'],
        lead:   ['C5', _,    'G5',  _,    'Eb5',_,    'D5',  _,    'C5', _,    'G5',  _,    'Ab5',_,    'G5', 'F5'],
        kick:   [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, true],
        snare:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        hat:    [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
        crash:  [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false]
      },
      {
        // Track 5: Bb-Minor Groovy Doom
        tempo: 135,
        guitar: ['Bb2', 'Bb2', 'Db2', _, 'Bb2', _, 'Eb2', _, 'Bb2', 'Bb2', 'F2', _, 'Eb2', _, 'Db2', 'C2'],
        bass:   ['Bb1', 'Bb1', 'Db1', _, 'Bb1', _, 'Eb1', _, 'Bb1', 'Bb1', 'F1', _, 'Eb1', _, 'Db1', 'C1'],
        lead:   ['F4',  _,     'Bb4', _, 'Db5', _, 'Eb5', _, 'F5',  _,     'C5', _, 'Bb4', _, 'Ab4', _],
        kick:   [true, false, false, false, true, false, false, true, true, false, false, false, true, false, false, true],
        snare:  [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        hat:    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        crash:  [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
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
    this.masterVolume.gain.value = 0.25; // Adjusted for new tracks
    
    // Simple master compressor to glue the mix and prevent clipping
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.1;

    this.masterVolume.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
  }

  play() {
    this.initAudio();
    if (this.isPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1; // slight start delay
    this.currentStep = 0;

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

  scheduleStep(step, time) {
    const track = this.tracks[this.currentTrackIndex];
    const secondsPerBeat = 60.0 / track.tempo;
    const stepDuration = secondsPerBeat / 4;

    // 1. Guitar (Distorted Sawtooth)
    const guitarNote = track.guitar[step];
    if (guitarNote && guitarNote !== 0) {
      const freq = this.noteFreq(guitarNote);
      this.playSynth(freq, time, 'sawtooth', 0.65, 0.12, true, 900);
    }

    // 2. Bass (Thick Square)
    const bassNote = track.bass[step];
    if (bassNote && bassNote !== 0) {
      const freq = this.noteFreq(bassNote);
      this.playSynth(freq, time, 'square', 0.5, 0.15, false, 400);
    }

    // 3. Lead (Ethereal Sine/Saw)
    const leadNote = track.lead[step];
    if (leadNote && leadNote !== 0) {
      const freq = this.noteFreq(leadNote);
      // Play a slightly longer note for the lead, with a delay effect illusion (echo)
      this.playLeadSynth(freq, time, stepDuration);
    }

    // 4. Kick Drum
    if (track.kick[step]) {
      this.playKick(time);
    }

    // 5. Snare Drum
    if (track.snare[step]) {
      this.playSnare(time);
    }

    // 6. Hi-Hat
    if (track.hat[step]) {
      this.playHat(time);
    }

    // 7. Crash
    if (track.crash && track.crash[step]) {
      this.playCrash(time);
    }
  }

  playSynth(freq, time, type, vol, duration, distort, filterFreq) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, time);
    if (distort) {
      filter.Q.setValueAtTime(2.0, time);
      const waveShaper = this.ctx.createWaveShaper();
      waveShaper.curve = this.distortionCurve;
      waveShaper.oversample = '4x';
      
      osc.connect(waveShaper);
      waveShaper.connect(filter);
    } else {
      osc.connect(filter);
    }

    gainNode.gain.setValueAtTime(0.0, time);
    gainNode.gain.linearRampToValueAtTime(vol, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    filter.connect(gainNode);
    gainNode.connect(this.masterVolume);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  playLeadSynth(freq, time, stepDuration) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Detuned oscillators for a thick lead sound
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.005, time); // slightly sharp

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.2);

    gainNode.gain.setValueAtTime(0.0, time);
    gainNode.gain.linearRampToValueAtTime(0.25, time + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    
    // Add simple delay/echo effect using a delay node
    const delay = this.ctx.createDelay();
    delay.delayTime.value = stepDuration * 1.5; // dotted 8th note delay
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.3;
    
    gainNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    
    gainNode.connect(this.masterVolume);
    delay.connect(this.masterVolume);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.4);
    osc2.stop(time + 0.4);
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

    gainNode.gain.setValueAtTime(1.2, time); // slightly louder kick
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gainNode);
    gainNode.connect(this.masterVolume);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  playSnare(time) {
    // Noise body
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.8, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterVolume);

    // Tonal body
    const shellOsc = this.ctx.createOscillator();
    const shellGain = this.ctx.createGain();
    shellOsc.frequency.setValueAtTime(200, time);
    shellOsc.frequency.linearRampToValueAtTime(120, time + 0.1);
    shellGain.gain.setValueAtTime(0.5, time);
    shellGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    shellOsc.connect(shellGain);
    shellGain.connect(this.masterVolume);

    noiseNode.start(time);
    shellOsc.start(time);
    shellOsc.stop(time + 0.15);
  }

  playHat(time) {
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterVolume);

    noiseNode.start(time);
  }

  playCrash(time) {
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5s long crash
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.3)); // Pre-envelope
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterVolume);

    noiseNode.start(time);
  }
}

export const metalMusic = new MetalMusicEngine();
export default metalMusic;
