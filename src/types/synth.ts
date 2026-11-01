/**
 * Data structures and types for Yamaha Montage, MODX, Montage M, and Montage ESP editor.
 */

export type SynthTarget = 'MONTAGE_CLASSIC' | 'MODX' | 'MODX_PLUS' | 'MONTAGE_M' | 'MONTAGE_ESP';

export type EngineType = 'AWM2' | 'FM-X' | 'AN-X';

export type Category = 
  | 'Piano'
  | 'Keyboard'
  | 'Organ'
  | 'Guitar'
  | 'Bass'
  | 'Strings'
  | 'Brass'
  | 'Synth Lead'
  | 'Synth Pad'
  | 'Chromatic Perc'
  | 'Drums/Perc'
  | 'Sound FX'
  | 'Ethnic';

export interface KeyRange {
  lowNote: number; // 0 to 127 (C-2 to G8)
  highNote: number;
}

export interface VelRange {
  lowVel: number; // 1 to 127
  highVel: number;
}

export interface PartFilter {
  type: 'LPF24' | 'LPF18' | 'HPF' | 'BPF';
  cutoff: number; // 0-127
  resonance: number; // 0-127
  envDepth: number; // -64 to +63
}

export interface PartEnvelope {
  attack: number; // 0-127
  decay: number; // 0-127
  sustain: number; // 0-127
  release: number; // 0-127
}

export interface PartEQ {
  low: number; // -12 to +12 dB
  mid: number; // -12 to +12 dB
  midFreq: number; // Hz (100 - 10000)
  high: number; // -12 to +12 dB
}

export interface FMXParams {
  algorithm: number; // 1 to 8
  feedback: number; // 0 to 7
  opLevels: number[]; // 8 operators [op1, op2, ... op8] (0-99)
  spectralForm: 'Sine' | 'All 1' | 'All 2' | 'Resonant 1' | 'Resonant 2';
}

export interface ANXParams {
  osc1Type: 'saw' | 'pulse' | 'pwm' | 'triangle';
  osc2Type: 'saw' | 'pulse' | 'pwm' | 'triangle';
  osc2Detune: number; // -64 to 63
  ringMod: boolean;
  sync: boolean;
  subOsc: boolean;
  pwmDepth: number; // 0-127
}

export interface SuperKnobAssignment {
  enabled: boolean;
  targetParam: 'volume' | 'cutoff' | 'reverb' | 'morph' | 'pan';
  minVal: number;
  maxVal: number;
}

export interface Part {
  id: string;
  partNumber: number; // 1 to 16
  enabled: boolean;
  solo: boolean;
  name: string;
  category: Category;
  engineType: EngineType;
  volume: number; // 0-127
  pan: number; // 0-127, 64 is center
  reverbSend: number; // 0-127
  chorusSend: number; // 0-127
  dryWet: number; // 0-127
  tuningCoarse: number; // -24 to +24 semitones
  tuningFine: number; // -64 to +63 cents
  keyRange: KeyRange;
  velRange: VelRange;
  filter: PartFilter;
  envelope: PartEnvelope;
  eq: PartEQ;
  arp: {
    enabled: boolean;
    type: string;
    tempoSync: boolean;
    hold: boolean;
  };
  superKnobAssign: SuperKnobAssignment;
  fmxParams?: FMXParams;
  anxParams?: ANXParams;
}

export interface Performance {
  id: string;
  name: string;
  category: Category;
  subCategory: string;
  targetCompatibility: SynthTarget[];
  tempo: number;
  superKnob: number; // 0-127
  motionSeq: boolean;
  activeScene: number; // 1 to 8
  parts: Part[];
  bank: 'PRESET' | 'USER';
  notes?: string;
  favorite?: boolean;
  liveSetSlot?: string;
}

export interface LiveSetSlot {
  slotIndex: number; // 0-15 (Slots 1 to 16)
  performanceId?: string;
  label?: string;
  color: 'amber' | 'cyan' | 'emerald' | 'blue' | 'purple' | 'rose' | 'neutral';
}

export interface LiveSetPage {
  id: string;
  name: string;
  slots: LiveSetSlot[];
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

export interface MidiLogEntry {
  id: string;
  timestamp: string;
  type: 'SYSEX' | 'CC' | 'NOTE_ON' | 'NOTE_OFF' | 'PC' | 'SYSTEM';
  bytes: string;
  description: string;
  direction: 'OUT' | 'IN';
}
