/**
 * Web Audio polyphonic multi-timbral engine simulating Yamaha AWM2, FM-X and AN-X synthesis.
 * Supports real-time preview of multi-part Performances with Super Knob modulation.
 */

import { Performance, Part } from '../types/synth';

interface ActiveVoice {
  note: number;
  partIndex: number;
  oscillators: (OscillatorNode | AudioBufferSourceNode)[];
  gains: GainNode[];
  filters: BiquadFilterNode[];
  panner: StereoPannerNode;
  stop: (time?: number) => void;
}

class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private activeVoices: Map<string, ActiveVoice[]> = new Map(); // key = noteNumber
  private currentPerformance: Performance | null = null;
  private isMuted: boolean = false;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

      // Algorithmic Reverb Impulse creation
      this.reverbNode = this.ctx.createConvolver();
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.createReverbImpulse(2.0, 0.02);

      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  private createReverbImpulse(duration: number, decay: number): void {
    if (!this.ctx || !this.reverbNode) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = (length - i) / length;
      const envelope = Math.exp(-i / (sampleRate * decay * 20));
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }

    this.reverbNode.buffer = impulse;
  }

  public setPerformance(perf: Performance): void {
    this.currentPerformance = perf;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public noteToFreq(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  public triggerNoteOn(note: number, velocity: number = 100): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!this.currentPerformance) return;

    // Release any existing voice on this note
    this.triggerNoteOff(note);

    const perf = this.currentPerformance;
    const superKnobNorm = perf.superKnob / 127;
    const voicesForNote: ActiveVoice[] = [];

    // Check solo states
    const hasSolo = perf.parts.some(p => p.solo);

    perf.parts.forEach((part, partIndex) => {
      if (!part.enabled) return;
      if (hasSolo && !part.solo) return;

      // Key Range and Velocity Range check
      if (note < part.keyRange.lowNote || note > part.keyRange.highNote) return;
      if (velocity < part.velRange.lowVel || velocity > part.velRange.highVel) return;

      const voice = this.synthesizePartVoice(ctx, part, partIndex, note, velocity, superKnobNorm);
      if (voice) {
        voicesForNote.push(voice);
      }
    });

    if (voicesForNote.length > 0) {
      this.activeVoices.set(note.toString(), voicesForNote);
    }
  }

  public triggerNoteOff(note: number): void {
    const key = note.toString();
    const voices = this.activeVoices.get(key);
    if (!voices || !this.ctx) return;

    voices.forEach(voice => voice.stop());
    this.activeVoices.delete(key);
  }

  public allNotesOff(): void {
    this.activeVoices.forEach(voices => {
      voices.forEach(v => v.stop());
    });
    this.activeVoices.clear();
  }

  private synthesizePartVoice(
    ctx: AudioContext,
    part: Part,
    partIndex: number,
    note: number,
    velocity: number,
    superKnobNorm: number
  ): ActiveVoice | null {
    const now = ctx.currentTime;
    const noteFreq = this.noteToFreq(note + part.tuningCoarse) * Math.pow(2, part.tuningFine / 1200);

    // Dynamic Super Knob modulation on volume / cutoff / reverb
    let modVolume = part.volume / 127;
    let modCutoff = part.filter.cutoff / 127;
    let modReverb = part.reverbSend / 127;

    if (part.superKnobAssign.enabled) {
      const min = part.superKnobAssign.minVal / 127;
      const max = part.superKnobAssign.maxVal / 127;
      const interpolated = min + (max - min) * superKnobNorm;

      switch (part.superKnobAssign.targetParam) {
        case 'volume':
          modVolume = Math.max(0, Math.min(1, modVolume * interpolated * 1.5));
          break;
        case 'cutoff':
          modCutoff = Math.max(0, Math.min(1, interpolated));
          break;
        case 'reverb':
          modReverb = Math.max(0, Math.min(1, interpolated));
          break;
      }
    }

    const velNorm = velocity / 127;
    const basePartGain = modVolume * (0.3 + 0.7 * velNorm) * 0.25;

    // Part Channel Nodes
    const partGainNode = ctx.createGain();
    const filterNode = ctx.createBiquadFilter();
    const pannerNode = ctx.createStereoPanner();

    // Pan: 0 = -1 (Left), 64 = 0 (Center), 127 = 1 (Right)
    const panVal = (part.pan - 64) / 64;
    pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal)), now);

    // Filter configuration
    switch (part.filter.type) {
      case 'HPF':
        filterNode.type = 'highpass';
        break;
      case 'BPF':
        filterNode.type = 'bandpass';
        break;
      case 'LPF18':
      case 'LPF24':
      default:
        filterNode.type = 'lowpass';
        break;
    }

    const minFreq = 40;
    const maxFreq = 16000;
    const targetCutoffFreq = minFreq * Math.pow(maxFreq / minFreq, modCutoff);
    filterNode.frequency.setValueAtTime(Math.min(targetCutoffFreq, 20000), now);
    filterNode.Q.setValueAtTime(0.5 + (part.filter.resonance / 127) * 12, now);

    // Envelope calculation (Attack, Decay, Sustain, Release)
    const attackTime = 0.005 + (part.envelope.attack / 127) * 2.5;
    const decayTime = 0.05 + (part.envelope.decay / 127) * 3.0;
    const sustainLevel = (part.envelope.sustain / 127) * basePartGain;
    const releaseTime = 0.05 + (part.envelope.release / 127) * 3.5;

    partGainNode.gain.setValueAtTime(0, now);
    partGainNode.gain.linearRampToValueAtTime(basePartGain, now + attackTime);
    partGainNode.gain.linearRampToValueAtTime(Math.max(0.001, sustainLevel), now + attackTime + decayTime);

    // Connect voice: Filter -> PartGain -> Panner -> Master & Reverb
    filterNode.connect(partGainNode);
    partGainNode.connect(pannerNode);

    if (this.masterGain) {
      pannerNode.connect(this.masterGain);
    }
    if (this.reverbNode && modReverb > 0.05) {
      const revSendGain = ctx.createGain();
      revSendGain.gain.setValueAtTime(modReverb * 0.4, now);
      pannerNode.connect(revSendGain);
      revSendGain.connect(this.reverbNode);
    }

    const createdOscs: (OscillatorNode | AudioBufferSourceNode)[] = [];

    // Synthesize based on engine type
    if (part.engineType === 'FM-X') {
      // 2-Operator FM pair (Carrier + Modulator) simulating Yamaha 8-Op algorithms
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modIndexGain = ctx.createGain();

      const algo = part.fmxParams?.algorithm || 1;
      const feedback = (part.fmxParams?.feedback || 3) / 7;

      // FM Ratios based on algorithm
      const modRatio = algo === 1 ? 1.0 : algo === 2 ? 2.0 : algo === 3 ? 3.5 : 0.5;
      carrier.frequency.setValueAtTime(noteFreq, now);
      modulator.frequency.setValueAtTime(noteFreq * modRatio, now);

      const modAmount = noteFreq * (1.5 + feedback * 3.5) * (0.4 + 0.6 * velNorm);
      modIndexGain.gain.setValueAtTime(modAmount, now);
      modIndexGain.gain.exponentialRampToValueAtTime(Math.max(1, modAmount * 0.3), now + attackTime + decayTime);

      modulator.connect(modIndexGain);
      modIndexGain.connect(carrier.frequency);
      carrier.connect(filterNode);

      carrier.start(now);
      modulator.start(now);
      createdOscs.push(carrier, modulator);

    } else if (part.engineType === 'AN-X') {
      // Montage M Analog engine: Dual detuned analog oscillators + Sub osc
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const subOsc = ctx.createOscillator();

      const anx = part.anxParams;
      osc1.type = anx?.osc1Type === 'triangle' ? 'triangle' : anx?.osc1Type === 'pulse' ? 'square' : 'sawtooth';
      osc2.type = anx?.osc2Type === 'triangle' ? 'triangle' : 'sawtooth';

      const detuneCents = (anx?.osc2Detune || 7);
      osc1.frequency.setValueAtTime(noteFreq, now);
      osc2.frequency.setValueAtTime(noteFreq * Math.pow(2, detuneCents / 1200), now);

      osc1.connect(filterNode);
      osc2.connect(filterNode);
      osc1.start(now);
      osc2.start(now);
      createdOscs.push(osc1, osc2);

      if (anx?.subOsc) {
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(noteFreq / 2, now);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.35, now);
        subOsc.connect(subGain);
        subGain.connect(filterNode);
        subOsc.start(now);
        createdOscs.push(subOsc);
      }

    } else {
      // AWM2: Acoustic multi-sampled harmonics simulation
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      const isPianoOrKeys = part.category === 'Piano' || part.category === 'Keyboard';
      const isStrings = part.category === 'Strings' || part.category === 'Synth Pad';
      const isBass = part.category === 'Bass';

      if (isPianoOrKeys) {
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(noteFreq, now);
        osc2.frequency.setValueAtTime(noteFreq * 2.001, now);
      } else if (isStrings) {
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(noteFreq, now);
        osc2.frequency.setValueAtTime(noteFreq * 1.004, now); // slight chorus detune
      } else if (isBass) {
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(noteFreq, now);
        osc2.frequency.setValueAtTime(noteFreq / 2, now);
      } else {
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(noteFreq, now);
        osc2.frequency.setValueAtTime(noteFreq * 1.002, now);
      }

      osc1.connect(filterNode);
      osc2.connect(filterNode);
      osc1.start(now);
      osc2.start(now);
      createdOscs.push(osc1, osc2);
    }

    const stopVoice = (stopAt?: number) => {
      const releaseStart = stopAt || ctx.currentTime;
      partGainNode.gain.cancelScheduledValues(releaseStart);
      partGainNode.gain.setValueAtTime(partGainNode.gain.value, releaseStart);
      partGainNode.gain.linearRampToValueAtTime(0.0001, releaseStart + releaseTime);

      setTimeout(() => {
        createdOscs.forEach(o => {
          try {
            if ('stop' in o) o.stop();
            o.disconnect();
          } catch {
            // Already stopped
          }
        });
        filterNode.disconnect();
        partGainNode.disconnect();
        pannerNode.disconnect();
      }, (releaseTime + 0.1) * 1000);
    };

    return {
      note,
      partIndex,
      oscillators: createdOscs,
      gains: [partGainNode],
      filters: [filterNode],
      panner: pannerNode,
      stop: stopVoice
    };
  }

  private auditionTimeouts: number[] = [];
  private isCurrentlyAuditioning: boolean = false;
  private auditionListeners: Set<(isPlaying: boolean) => void> = new Set();

  public subscribeAuditionState(listener: (isPlaying: boolean) => void): () => void {
    this.auditionListeners.add(listener);
    return () => this.auditionListeners.delete(listener);
  }

  public isAuditionActive(): boolean {
    return this.isCurrentlyAuditioning;
  }

  private setAuditionState(state: boolean): void {
    this.isCurrentlyAuditioning = state;
    this.auditionListeners.forEach(fn => fn(state));
  }

  public stopAudition(): void {
    this.auditionTimeouts.forEach(t => clearTimeout(t));
    this.auditionTimeouts = [];
    this.allNotesOff();
    this.setAuditionState(false);
  }

  /**
   * Quick audition pattern tailored to performance category or custom pattern
   */
  public auditionPerformance(patternType?: 'auto' | 'chord' | 'arpeggio' | 'bass' | 'lead'): void {
    this.stopAudition();
    this.setAuditionState(true);

    const perf = this.currentPerformance;
    const cat = perf?.category || 'Piano';

    let pattern = patternType || 'auto';
    if (pattern === 'auto') {
      if (cat === 'Bass') pattern = 'bass';
      else if (cat === 'Synth Lead') pattern = 'lead';
      else if (cat === 'Synth Pad' || cat === 'Strings') pattern = 'chord';
      else pattern = 'arpeggio';
    }

    if (pattern === 'bass') {
      const bassNotes = [36, 36, 41, 43, 38]; // C1, C1, F1, G1, D1
      bassNotes.forEach((n, idx) => {
        const t1 = window.setTimeout(() => {
          this.triggerNoteOn(n, 115);
        }, idx * 280);
        const t2 = window.setTimeout(() => {
          this.triggerNoteOff(n);
        }, idx * 280 + 240);
        this.auditionTimeouts.push(t1, t2);
      });

      const finishTimeout = window.setTimeout(() => {
        this.setAuditionState(false);
      }, bassNotes.length * 280 + 200);
      this.auditionTimeouts.push(finishTimeout);

    } else if (pattern === 'lead') {
      const leadNotes = [60, 63, 65, 67, 70, 72, 75]; // C4 pentatonic bluesy phrase
      leadNotes.forEach((n, idx) => {
        const t1 = window.setTimeout(() => {
          this.triggerNoteOn(n, 110);
        }, idx * 180);
        const t2 = window.setTimeout(() => {
          this.triggerNoteOff(n);
        }, idx * 180 + (idx === leadNotes.length - 1 ? 900 : 160));
        this.auditionTimeouts.push(t1, t2);
      });

      const finishTimeout = window.setTimeout(() => {
        this.setAuditionState(false);
      }, leadNotes.length * 180 + 1000);
      this.auditionTimeouts.push(finishTimeout);

    } else if (pattern === 'chord') {
      // Lush evolving chord with slight note stagger
      const chord = [60, 64, 67, 71, 74]; // Cmaj9
      chord.forEach((n, idx) => {
        const t = window.setTimeout(() => {
          this.triggerNoteOn(n, 95);
        }, idx * 70);
        this.auditionTimeouts.push(t);
      });

      const releaseTimeout = window.setTimeout(() => {
        chord.forEach(n => this.triggerNoteOff(n));
      }, 2000);
      const finishTimeout = window.setTimeout(() => {
        this.setAuditionState(false);
      }, 2600);
      this.auditionTimeouts.push(releaseTimeout, finishTimeout);

    } else {
      // Arpeggio + sustained chord
      const arpNotes = [60, 64, 67, 71, 72, 71, 67, 64];
      arpNotes.forEach((n, idx) => {
        const t1 = window.setTimeout(() => {
          this.triggerNoteOn(n, 100);
        }, idx * 140);
        const t2 = window.setTimeout(() => {
          this.triggerNoteOff(n);
        }, idx * 140 + 220);
        this.auditionTimeouts.push(t1, t2);
      });

      const finishTimeout = window.setTimeout(() => {
        this.setAuditionState(false);
      }, arpNotes.length * 140 + 400);
      this.auditionTimeouts.push(finishTimeout);
    }
  }

  /**
   * Audition a specific part in isolation (temporarily solos it)
   */
  public auditionPart(partIndex: number): void {
    if (!this.currentPerformance) return;
    const originalParts = this.currentPerformance.parts;
    
    // Create copy with only that part active
    const soloedPerf = {
      ...this.currentPerformance,
      parts: originalParts.map((p, idx) => ({
        ...p,
        solo: idx === partIndex
      }))
    };

    const prevPerf = this.currentPerformance;
    this.setPerformance(soloedPerf);
    this.auditionPerformance('auto');

    // Restore original performance after audition ends
    const restoreTimeout = window.setTimeout(() => {
      this.setPerformance(prevPerf);
    }, 2200);
    this.auditionTimeouts.push(restoreTimeout);
  }
}

export const audioSynth = new AudioSynthEngine();
