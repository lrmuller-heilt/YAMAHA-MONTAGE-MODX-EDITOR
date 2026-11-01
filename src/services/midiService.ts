/**
 * Web MIDI API service with Yamaha Montage / MODX / Montage M / Montage ESP SysEx generation.
 */

import { MidiDevice, MidiLogEntry, SynthTarget, Performance, Part } from '../types/synth';

interface IMidiPort {
  id: string;
  name?: string;
  manufacturer?: string;
  state: string;
}

interface IMidiInput extends IMidiPort {
  onmidimessage: ((event: IMidiMessageEvent) => void) | null;
}

interface IMidiOutput extends IMidiPort {
  send: (data: number[] | Uint8Array) => void;
}

interface IMidiMessageEvent {
  data: Uint8Array;
}

interface IMidiAccess {
  inputs: Map<string, IMidiInput>;
  outputs: Map<string, IMidiOutput>;
  onstatechange: (() => void) | null;
}

type MidiListener = (entry: MidiLogEntry) => void;
type DeviceChangeListener = (inputs: MidiDevice[], outputs: MidiDevice[]) => void;

class MidiService {
  private midiAccess: IMidiAccess | null = null;
  private selectedInput: IMidiInput | null = null;
  private selectedOutput: IMidiOutput | null = null;
  private listeners: Set<MidiListener> = new Set();
  private deviceListeners: Set<DeviceChangeListener> = new Set();
  private logs: MidiLogEntry[] = [];
  private deviceChannel: number = 0; // MIDI Ch 1 (0-indexed)

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported()) {
      this.addLog({
        type: 'SYSTEM',
        bytes: '--',
        description: 'Web MIDI API não disponível neste navegador (Modo Simulação Ativo)',
        direction: 'IN'
      });
      return false;
    }

    try {
      const nav = navigator as unknown as { requestMIDIAccess: (opt?: { sysex?: boolean }) => Promise<IMidiAccess> };
      this.midiAccess = await nav.requestMIDIAccess({ sysex: true });
      this.midiAccess.onstatechange = () => {
        this.notifyDeviceChange();
      };

      // Auto-select first Yamaha or available port
      const outputs = this.getOutputs();
      const montageOutput = outputs.find(o => 
        o.name.toLowerCase().includes('montage') || 
        o.name.toLowerCase().includes('modx') ||
        o.name.toLowerCase().includes('yamaha')
      ) || outputs[0];

      if (montageOutput) {
        this.selectOutput(montageOutput.id);
      }

      const inputs = this.getInputs();
      const montageInput = inputs.find(i => 
        i.name.toLowerCase().includes('montage') || 
        i.name.toLowerCase().includes('modx') ||
        i.name.toLowerCase().includes('yamaha')
      ) || inputs[0];

      if (montageInput) {
        this.selectInput(montageInput.id);
      }

      this.addLog({
        type: 'SYSTEM',
        bytes: '--',
        description: 'Web MIDI conectado com sucesso (Suporte SysEx Habilitado)',
        direction: 'IN'
      });

      return true;
    } catch (err) {
      console.warn('Web MIDI access error:', err);
      this.addLog({
        type: 'SYSTEM',
        bytes: '--',
        description: 'Permissão Web MIDI SysEx não concedida (Modo Simulação Ativo)',
        direction: 'IN'
      });
      return false;
    }
  }

  public getInputs(): MidiDevice[] {
    if (!this.midiAccess) return [];
    const list: MidiDevice[] = [];
    this.midiAccess.inputs.forEach((input: IMidiInput) => {
      list.push({
        id: input.id,
        name: input.name || `MIDI In (${input.id})`,
        manufacturer: input.manufacturer || 'Yamaha / Generic',
        state: input.state
      });
    });
    return list;
  }

  public getOutputs(): MidiDevice[] {
    if (!this.midiAccess) return [];
    const list: MidiDevice[] = [];
    this.midiAccess.outputs.forEach((output: IMidiOutput) => {
      list.push({
        id: output.id,
        name: output.name || `MIDI Out (${output.id})`,
        manufacturer: output.manufacturer || 'Yamaha / Generic',
        state: output.state
      });
    });
    return list;
  }

  public selectInput(id: string): void {
    if (!this.midiAccess) return;
    if (this.selectedInput) {
      this.selectedInput.onmidimessage = null;
    }
    const input = this.midiAccess.inputs.get(id);
    if (input) {
      this.selectedInput = input;
      this.selectedInput.onmidimessage = (event: IMidiMessageEvent) => this.handleMidiMessage(event);
      this.notifyDeviceChange();
    }
  }

  public selectOutput(id: string): void {
    if (!this.midiAccess) return;
    const output = this.midiAccess.outputs.get(id);
    if (output) {
      this.selectedOutput = output;
      this.notifyDeviceChange();
    }
  }

  public getSelectedInputId(): string | null {
    return this.selectedInput?.id || null;
  }

  public getSelectedOutputId(): string | null {
    return this.selectedOutput?.id || null;
  }

  private handleMidiMessage(event: IMidiMessageEvent): void {
    const data = event.data;
    if (!data || data.length === 0) return;
    const hex = Array.from(data).map((b: number) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const status = data[0] & 0xF0;

    let type: MidiLogEntry['type'] = 'SYSTEM';
    let desc = 'Mensagem MIDI recebida';

    if (data[0] === 0xF0) {
      type = 'SYSEX';
      desc = `Yamaha SysEx recebido (${data.length} bytes)`;
    } else if (status === 0x90 && data[2] > 0) {
      type = 'NOTE_ON';
      desc = `Note On: ${data[1]} (Vel ${data[2]})`;
    } else if (status === 0x80 || (status === 0x90 && data[2] === 0)) {
      type = 'NOTE_OFF';
      desc = `Note Off: ${data[1]}`;
    } else if (status === 0xB0) {
      type = 'CC';
      desc = `Control Change: CC#${data[1]} = ${data[2]}`;
    }

    this.addLog({
      type,
      bytes: hex,
      description: desc,
      direction: 'IN'
    });
  }

  private sendRaw(bytes: number[], description: string, type: MidiLogEntry['type'] = 'SYSEX'): void {
    const hex = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    if (this.selectedOutput) {
      try {
        this.selectedOutput.send(bytes);
      } catch (err) {
        console.warn('Failed to send raw MIDI bytes:', err);
      }
    }

    this.addLog({
      type,
      bytes: hex,
      description,
      direction: 'OUT'
    });
  }

  /**
   * Helper to get Yamaha Model ID for Montage, MODX, Montage M, or ESP
   */
  private getModelId(target: SynthTarget): number[] {
    switch (target) {
      case 'MONTAGE_CLASSIC':
        return [0x7F, 0x1C];
      case 'MODX':
      case 'MODX_PLUS':
        return [0x7F, 0x20];
      case 'MONTAGE_M':
      case 'MONTAGE_ESP':
        return [0x7F, 0x24];
      default:
        return [0x7F, 0x1C];
    }
  }

  /**
   * Send Super Knob change (SysEx + CC#95)
   */
  public sendSuperKnob(value: number, target: SynthTarget): void {
    const clamped = Math.max(0, Math.min(127, Math.round(value)));
    // Send CC#95 (Montage default assign for Super Knob)
    this.sendRaw([0xB0 | this.deviceChannel, 95, clamped], `Super Knob CC#95 -> ${clamped}`, 'CC');

    // Yamaha Montage Parameter Change SysEx for Super Knob:
    // F0 43 10 [ModelID] 30 00 00 [Value] F7
    const model = this.getModelId(target);
    const sysex = [0xF0, 0x43, 0x10 | this.deviceChannel, ...model, 0x30, 0x00, 0x00, clamped, 0xF7];
    this.sendRaw(sysex, `Super Knob SysEx -> ${clamped}`, 'SYSEX');
  }

  /**
   * Send Part Parameter Change (Volume, Pan, Reverb, Filter Cutoff, etc.)
   */
  public sendPartVolume(partIndex: number, volume: number): void {
    const val = Math.max(0, Math.min(127, Math.round(volume)));
    const ch = (this.deviceChannel + partIndex) % 16;
    this.sendRaw([0xB0 | ch, 7, val], `Part ${partIndex + 1} Volume (CC#7) -> ${val}`, 'CC');
  }

  public sendPartPan(partIndex: number, pan: number): void {
    const val = Math.max(0, Math.min(127, Math.round(pan)));
    const ch = (this.deviceChannel + partIndex) % 16;
    this.sendRaw([0xB0 | ch, 10, val], `Part ${partIndex + 1} Pan (CC#10) -> ${val}`, 'CC');
  }

  public sendPartReverb(partIndex: number, reverb: number): void {
    const val = Math.max(0, Math.min(127, Math.round(reverb)));
    const ch = (this.deviceChannel + partIndex) % 16;
    this.sendRaw([0xB0 | ch, 91, val], `Part ${partIndex + 1} Reverb Send (CC#91) -> ${val}`, 'CC');
  }

  public sendPartFilterCutoff(partIndex: number, cutoff: number, target: SynthTarget): void {
    const val = Math.max(0, Math.min(127, Math.round(cutoff)));
    const ch = (this.deviceChannel + partIndex) % 16;
    // Standard Brightness CC#74
    this.sendRaw([0xB0 | ch, 74, val], `Part ${partIndex + 1} Filter Cutoff (CC#74) -> ${val}`, 'CC');

    // Yamaha SysEx Part Filter: Address 0x31 [Part] 0x02
    const model = this.getModelId(target);
    const sysex = [0xF0, 0x43, 0x10 | this.deviceChannel, ...model, 0x31, partIndex, 0x02, val, 0xF7];
    this.sendRaw(sysex, `Part ${partIndex + 1} Cutoff SysEx -> ${val}`, 'SYSEX');
  }

  public sendPartFilterResonance(partIndex: number, resonance: number, target: SynthTarget): void {
    const val = Math.max(0, Math.min(127, Math.round(resonance)));
    const ch = (this.deviceChannel + partIndex) % 16;
    this.sendRaw([0xB0 | ch, 71, val], `Part ${partIndex + 1} Resonance (CC#71) -> ${val}`, 'CC');

    const model = this.getModelId(target);
    const sysex = [0xF0, 0x43, 0x10 | this.deviceChannel, ...model, 0x31, partIndex, 0x03, val, 0xF7];
    this.sendRaw(sysex, `Part ${partIndex + 1} Resonance SysEx -> ${val}`, 'SYSEX');
  }

  public sendSceneSelect(sceneNum: number, target: SynthTarget): void {
    const sceneIndex = Math.max(0, Math.min(7, sceneNum - 1));
    // Montage Scene Select SysEx: 0x30 0x00 0x09 [0..7]
    const model = this.getModelId(target);
    const sysex = [0xF0, 0x43, 0x10 | this.deviceChannel, ...model, 0x30, 0x00, 0x09, sceneIndex, 0xF7];
    this.sendRaw(sysex, `Recall Scene ${sceneNum} (SysEx)`, 'SYSEX');
  }

  public sendPerformanceSelect(performance: Performance, target: SynthTarget): void {
    // Montage Bank Select MSB 63, LSB 0 (Preset) / LSB 1 (User), PC
    const isUser = performance.bank === 'USER';
    const lsb = isUser ? 1 : 0;
    // Hash performance ID to an index 0-127
    const pc = Math.abs(performance.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 128;

    this.sendRaw([0xB0 | this.deviceChannel, 0, 63], `Bank Select MSB (63)`, 'CC');
    this.sendRaw([0xB0 | this.deviceChannel, 32, lsb], `Bank Select LSB (${lsb})`, 'CC');
    this.sendRaw([0xC0 | this.deviceChannel, pc], `Program Change: ${performance.name} (#${pc + 1})`, 'PC');

    // SysEx Performance Change Header
    const model = this.getModelId(target);
    const nameBytes = Array.from(performance.name.slice(0, 16)).map(c => c.charCodeAt(0) & 0x7F);
    const sysex = [0xF0, 0x43, 0x10 | this.deviceChannel, ...model, 0x30, 0x00, 0x01, ...nameBytes, 0xF7];
    this.sendRaw(sysex, `Sync Performance Header: "${performance.name}"`, 'SYSEX');
  }

  public sendAllPartsDump(performance: Performance, target: SynthTarget): void {
    this.addLog({
      type: 'SYSTEM',
      bytes: '--',
      description: `Transmitindo Performance completa para ${target}: "${performance.name}"...`,
      direction: 'OUT'
    });

    this.sendPerformanceSelect(performance, target);
    this.sendSuperKnob(performance.superKnob, target);

    // Send each part parameters
    performance.parts.forEach((part, idx) => {
      if (part.enabled) {
        this.sendPartVolume(idx, part.volume);
        this.sendPartPan(idx, part.pan);
        this.sendPartReverb(idx, part.reverbSend);
        this.sendPartFilterCutoff(idx, part.filter.cutoff, target);
        this.sendPartFilterResonance(idx, part.filter.resonance, target);
      }
    });

    this.addLog({
      type: 'SYSTEM',
      bytes: '--',
      description: `Sincronização com ${target} finalizada com sucesso!`,
      direction: 'OUT'
    });
  }

  public sendNoteOn(note: number, velocity: number = 100, channel: number = 0): void {
    this.sendRaw([0x90 | (channel & 0x0F), note & 0x7F, velocity & 0x7F], `Note On: ${note} (Vel ${velocity})`, 'NOTE_ON');
  }

  public sendNoteOff(note: number, channel: number = 0): void {
    this.sendRaw([0x80 | (channel & 0x0F), note & 0x7F, 0], `Note Off: ${note}`, 'NOTE_OFF');
  }

  public sendPanic(): void {
    for (let ch = 0; ch < 16; ch++) {
      this.sendRaw([0xB0 | ch, 123, 0], `All Notes Off (Ch ${ch + 1})`, 'CC');
      this.sendRaw([0xB0 | ch, 120, 0], `All Sound Off (Ch ${ch + 1})`, 'CC');
    }
  }

  private addLog(entry: Omit<MidiLogEntry, 'id' | 'timestamp'>): void {
    const newEntry: MidiLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }) + '.' + Math.floor(new Date().getMilliseconds() / 10).toString().padStart(2, '0')
    };

    this.logs = [newEntry, ...this.logs.slice(0, 99)];
    this.listeners.forEach(fn => fn(newEntry));
  }

  public getLogs(): MidiLogEntry[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public subscribeLogs(listener: MidiListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeDeviceChange(listener: DeviceChangeListener): () => void {
    this.deviceListeners.add(listener);
    return () => this.deviceListeners.delete(listener);
  }

  private notifyDeviceChange(): void {
    const inputs = this.getInputs();
    const outputs = this.getOutputs();
    this.deviceListeners.forEach(fn => fn(inputs, outputs));
  }
}

export const midiService = new MidiService();
