import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  Activity, 
  Layers, 
  Volume2, 
  Radio, 
  Cpu, 
  Check, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Part, Performance, SynthTarget, EngineType, Category } from '../types/synth';
import { ALL_CATEGORIES } from '../data/presetPerformances';
import { midiService } from '../services/midiService';

interface PartInspectorProps {
  part: Part;
  performance: Performance;
  target: SynthTarget;
  onUpdatePart: (updatedPart: Part) => void;
  onClose: () => void;
}

export const PartInspector: React.FC<PartInspectorProps> = ({
  part,
  performance,
  target,
  onUpdatePart,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'filter' | 'eq' | 'engine' | 'superknob'>('quick');

  const update = (patch: Partial<Part>) => {
    const updated = { ...part, ...patch };
    onUpdatePart(updated);
  };

  const updateFilter = (field: keyof Part['filter'], val: unknown) => {
    const updatedFilter = { ...part.filter, [field]: val };
    const updated = { ...part, filter: updatedFilter };
    onUpdatePart(updated);

    if (field === 'cutoff') {
      midiService.sendPartFilterCutoff(part.partNumber - 1, val as number, target);
    } else if (field === 'resonance') {
      midiService.sendPartFilterResonance(part.partNumber - 1, val as number, target);
    }
  };

  const updateEnvelope = (field: keyof Part['envelope'], val: number) => {
    const updatedEnv = { ...part.envelope, [field]: val };
    onUpdatePart({ ...part, envelope: updatedEnv });
  };

  const updateEQ = (field: keyof Part['eq'], val: number) => {
    const updatedEQ = { ...part.eq, [field]: val };
    onUpdatePart({ ...part, eq: updatedEQ });
  };

  const updateFMX = (field: string, val: unknown) => {
    if (!part.fmxParams) return;
    const updatedFMX = { ...part.fmxParams, [field]: val };
    onUpdatePart({ ...part, fmxParams: updatedFMX });
  };

  const updateANX = (field: string, val: unknown) => {
    if (!part.anxParams) return;
    const updatedANX = { ...part.anxParams, [field]: val };
    onUpdatePart({ ...part, anxParams: updatedANX });
  };

  // Convert note number to friendly name (e.g. 60 -> C3)
  const noteName = (n: number) => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const oct = Math.floor(n / 12) - 2;
    return `${names[n % 12]}${oct}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
              part.engineType === 'AWM2'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : part.engineType === 'FM-X'
                ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                : 'bg-rose-950 text-rose-400 border border-rose-800/60'
            }`}>
              {part.engineType}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Parte {part.partNumber}: {part.name}
                </h2>
                <span className="text-xs text-neutral-400">({part.category})</span>
              </div>
              <p className="text-xs text-neutral-400">
                Performance: <strong className="text-neutral-300">{performance.name}</strong> · Alvo: {target}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-neutral-950/40 border-b border-neutral-800 text-xs">
          {[
            { id: 'quick', label: 'Quick Edit & Amp' },
            { id: 'filter', label: 'Filter & Envelopes' },
            { id: 'eq', label: 'Parametric 3-Band EQ' },
            { id: 'engine', label: `Engine (${part.engineType})` },
            { id: 'superknob', label: 'Super Knob Routing' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors border-t border-x ${
                activeTab === tab.id
                  ? 'bg-neutral-900 border-neutral-700 text-cyan-400 -mb-px'
                  : 'bg-transparent border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: QUICK EDIT */}
          {activeTab === 'quick' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part Identity */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Identificação da Parte
                </h4>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Nome da Parte</label>
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => update({ name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Motor de Síntese</label>
                    <select
                      value={part.engineType}
                      onChange={(e) => update({ engineType: e.target.value as EngineType })}
                      className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="AWM2">AWM2 (Sample Player)</option>
                      <option value="FM-X">FM-X (8-Operator FM)</option>
                      {(target === 'MONTAGE_M' || target === 'MONTAGE_ESP') && (
                        <option value="AN-X">AN-X (Analog Modeling)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Categoria</label>
                    <select
                      value={part.category}
                      onChange={(e) => update({ category: e.target.value as Category })}
                      className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {ALL_CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tuning & Pitch */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Afinação & Pitch
                </h4>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Transposição (Coarse)</span>
                    <span className="font-mono text-cyan-400 font-bold">{part.tuningCoarse > 0 ? `+${part.tuningCoarse}` : part.tuningCoarse} st</span>
                  </div>
                  <input
                    type="range"
                    min="-24"
                    max="24"
                    value={part.tuningCoarse}
                    onChange={(e) => update({ tuningCoarse: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Afinação Fina (Fine Detune)</span>
                    <span className="font-mono text-cyan-400 font-bold">{part.tuningFine > 0 ? `+${part.tuningFine}` : part.tuningFine} cents</span>
                  </div>
                  <input
                    type="range"
                    min="-64"
                    max="63"
                    value={part.tuningFine}
                    onChange={(e) => update({ tuningFine: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Key Split / Range */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Extensão de Teclado (Key Range Split)
                  </h4>
                  <div className="text-xs font-mono text-cyan-400 font-semibold">
                    {noteName(part.keyRange.lowNote)} ({part.keyRange.lowNote}) → {noteName(part.keyRange.highNote)} ({part.keyRange.highNote})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Nota Mais Grave (Low Limit)</label>
                    <input
                      type="range"
                      min="0"
                      max={part.keyRange.highNote}
                      value={part.keyRange.lowNote}
                      onChange={(e) => update({
                        keyRange: { ...part.keyRange, lowNote: parseInt(e.target.value) }
                      })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Nota Mais Aguda (High Limit)</label>
                    <input
                      type="range"
                      min={part.keyRange.lowNote}
                      max="127"
                      value={part.keyRange.highNote}
                      onChange={(e) => update({
                        keyRange: { ...part.keyRange, highNote: parseInt(e.target.value) }
                      })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Keybed Visualizer Bar */}
                <div className="h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative">
                  <div
                    className="absolute top-0 bottom-0 bg-cyan-500/80 rounded-full"
                    style={{
                      left: `${(part.keyRange.lowNote / 127) * 100}%`,
                      width: `${((part.keyRange.highNote - part.keyRange.lowNote) / 127) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILTER & ENVELOPE */}
          {activeTab === 'filter' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Filter */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Filtro Ressonante
                </h4>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Tipo de Filtro</label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {(['LPF24', 'LPF18', 'HPF', 'BPF'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => updateFilter('type', t)}
                        className={`py-1.5 rounded font-medium border text-center transition-colors ${
                          part.filter.type === t
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Cutoff (Frequência de Corte)</span>
                    <span className="font-mono text-cyan-400 font-bold">{part.filter.cutoff}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="127"
                    value={part.filter.cutoff}
                    onChange={(e) => updateFilter('cutoff', parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Ressonância (Q)</span>
                    <span className="font-mono text-cyan-400 font-bold">{part.filter.resonance}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="127"
                    value={part.filter.resonance}
                    onChange={(e) => updateFilter('resonance', parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Envelope Generator (ADSR) with SVG Curve */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Envelope de Amplitude (ADSR)
                </h4>

                {/* SVG Visualizer */}
                <div className="h-24 bg-neutral-900 rounded-lg border border-neutral-800 p-2 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 200 80">
                    {/* Grid lines */}
                    <line x1="0" y1="75" x2="200" y2="75" stroke="#262626" strokeWidth="1" />
                    <line x1="0" y1="10" x2="200" y2="10" stroke="#262626" strokeWidth="1" strokeDasharray="3 3" />

                    {/* ADSR coordinates */}
                    {/* Attack: 0,75 -> 0 + attack, 10 */}
                    {/* Decay: -> attack + decay, 75 - (sustain * 0.6) */}
                    {/* Sustain: -> 150, sustain */}
                    {/* Release: -> 150 + release, 75 */}
                    {(() => {
                      const aW = Math.max(5, (part.envelope.attack / 127) * 45);
                      const dW = Math.max(5, (part.envelope.decay / 127) * 45);
                      const sY = 75 - (part.envelope.sustain / 127) * 65;
                      const rW = Math.max(5, (part.envelope.release / 127) * 45);

                      const p0 = `0,75`;
                      const p1 = `${aW},10`;
                      const p2 = `${aW + dW},${sY}`;
                      const p3 = `${155},${sY}`;
                      const p4 = `${Math.min(200, 155 + rW)},75`;

                      return (
                        <>
                          <polygon
                            points={`${p0} ${p1} ${p2} ${p3} ${p4}`}
                            fill="rgba(6, 182, 212, 0.15)"
                          />
                          <polyline
                            points={`${p0} ${p1} ${p2} ${p3} ${p4}`}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Attack</span>
                    <input
                      type="range"
                      min="0"
                      max="127"
                      value={part.envelope.attack}
                      onChange={(e) => updateEnvelope('attack', parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <span className="font-mono text-neutral-300 font-bold">{part.envelope.attack}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Decay</span>
                    <input
                      type="range"
                      min="0"
                      max="127"
                      value={part.envelope.decay}
                      onChange={(e) => updateEnvelope('decay', parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <span className="font-mono text-neutral-300 font-bold">{part.envelope.decay}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Sustain</span>
                    <input
                      type="range"
                      min="0"
                      max="127"
                      value={part.envelope.sustain}
                      onChange={(e) => updateEnvelope('sustain', parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <span className="font-mono text-neutral-300 font-bold">{part.envelope.sustain}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Release</span>
                    <input
                      type="range"
                      min="0"
                      max="127"
                      value={part.envelope.release}
                      onChange={(e) => updateEnvelope('release', parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <span className="font-mono text-neutral-300 font-bold">{part.envelope.release}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 3-BAND EQ */}
          {activeTab === 'eq' && (
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Equalizador Paramétrico de 3 Bandas
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Low Gain (Graves)</span>
                    <span className="font-mono text-cyan-400 font-bold">{part.eq.low > 0 ? `+${part.eq.low}` : part.eq.low} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={part.eq.low}
                    onChange={(e) => updateEQ('low', parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">Mid Gain (Médios)</span>
                    <span className="font-mono text-cyan-400 font-bold">{part.eq.mid > 0 ? `+${part.eq.mid}` : part.eq.mid} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={part.eq.mid}
                    onChange={(e) => updateEQ('mid', parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="mt-2 text-[11px] text-neutral-500 flex justify-between">
                    <span>Freq: {part.eq.midFreq} Hz</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-400">High Gain (Agudos)</span>
                    <span className="font-mono text-cyan-400 font-bold">{part.eq.high > 0 ? `+${part.eq.high}` : part.eq.high} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={part.eq.high}
                    onChange={(e) => updateEQ('high', parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENGINE SPECIFIC (FM-X or AN-X or AWM2) */}
          {activeTab === 'engine' && (
            <div className="space-y-6">
              {part.engineType === 'FM-X' && (
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Parâmetros do Motor FM-X (8 Operadores)
                    </h4>
                    <span className="text-xs font-mono text-neutral-400">
                      Yamaha FM-X Synthesizer Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Algoritmo (1 - 8)</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(alg => (
                          <button
                            key={alg}
                            onClick={() => updateFMX('algorithm', alg)}
                            className={`py-2 rounded font-mono font-bold text-xs border ${
                              part.fmxParams?.algorithm === alg
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                            }`}
                          >
                            Alg {alg}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-400">Feedback Operator</span>
                        <span className="font-mono text-amber-400 font-bold">{part.fmxParams?.feedback || 0}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="7"
                        value={part.fmxParams?.feedback || 0}
                        onChange={(e) => updateFMX('feedback', parseInt(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 8 Operators Level Sliders */}
                  <div className="pt-2 border-t border-neutral-800">
                    <label className="text-xs text-neutral-400 block mb-2">Níveis dos 8 Operadores (Op 1 a Op 8)</label>
                    <div className="grid grid-cols-8 gap-2">
                      {(part.fmxParams?.opLevels || [99, 80, 70, 60, 50, 40, 30, 20]).map((lvl, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <span className="text-[10px] font-mono text-neutral-500 mb-1">Op {idx + 1}</span>
                          <input
                            type="range"
                            min="0"
                            max="99"
                            value={lvl}
                            onChange={(e) => {
                              const newOps = [...(part.fmxParams?.opLevels || [])];
                              newOps[idx] = parseInt(e.target.value);
                              updateFMX('opLevels', newOps);
                            }}
                            className="h-20 accent-amber-500 cursor-pointer"
                            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                          />
                          <span className="text-[10px] font-mono text-amber-400 font-bold mt-1">{lvl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {part.engineType === 'AN-X' && (
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Montage M / ESP AN-X (Modelagem Analógica Vintage)
                    </h4>
                    <span className="text-xs font-mono text-neutral-400">
                      Dual Oscillator + Sub Oscillator
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Oscilador 1 (Waveform)</label>
                      <select
                        value={part.anxParams?.osc1Type || 'saw'}
                        onChange={(e) => updateANX('osc1Type', e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                      >
                        <option value="saw">Dente de Serra (Sawtooth CS-80)</option>
                        <option value="pulse">Pulso / Onda Quadrada</option>
                        <option value="pwm">Modulação por Largura de Pulso (PWM)</option>
                        <option value="triangle">Triangular Suave</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Oscilador 2 (Waveform)</label>
                      <select
                        value={part.anxParams?.osc2Type || 'saw'}
                        onChange={(e) => updateANX('osc2Type', e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                      >
                        <option value="saw">Dente de Serra (Sawtooth)</option>
                        <option value="pulse">Pulso</option>
                        <option value="triangle">Triangular</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <label className="flex items-center gap-2 p-2 rounded bg-neutral-900 border border-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={part.anxParams?.sync || false}
                        onChange={(e) => updateANX('sync', e.target.checked)}
                        className="accent-rose-500 rounded"
                      />
                      <span className="text-xs text-neutral-300">Oscillator Hard Sync</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded bg-neutral-900 border border-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={part.anxParams?.ringMod || false}
                        onChange={(e) => updateANX('ringMod', e.target.checked)}
                        className="accent-rose-500 rounded"
                      />
                      <span className="text-xs text-neutral-300">Ring Modulation</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded bg-neutral-900 border border-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={part.anxParams?.subOsc || false}
                        onChange={(e) => updateANX('subOsc', e.target.checked)}
                        className="accent-rose-500 rounded"
                      />
                      <span className="text-xs text-neutral-300">Sub-Oscilador (-1 Oitava)</span>
                    </label>
                  </div>
                </div>
              )}

              {part.engineType === 'AWM2' && (
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    AWM2 Sample Playback Architecture
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Até 8 Elementos por parte com troca de velocidade e amostragem estéreo de alta fidelidade Yamaha.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                      <span className="text-xs text-neutral-400 block mb-1">Elementos Ativos</span>
                      <span className="text-lg font-mono font-bold text-white">8 / 8 Ativos</span>
                    </div>
                    <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                      <span className="text-xs text-neutral-400 block mb-1">Key Crossfade</span>
                      <span className="text-lg font-mono font-bold text-cyan-400">Linear Smooth</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SUPER KNOB ROUTING */}
          {activeTab === 'superknob' && (
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Atribuição do Super Knob na Parte
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Controle em tempo real de parâmetros através do dial central do Montage.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={part.superKnobAssign.enabled}
                    onChange={(e) => update({
                      superKnobAssign: { ...part.superKnobAssign, enabled: e.target.checked }
                    })}
                    className="accent-cyan-500 rounded w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-white">Habilitar Link</span>
                </label>
              </div>

              {part.superKnobAssign.enabled && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Parâmetro Destino</label>
                    <select
                      value={part.superKnobAssign.targetParam}
                      onChange={(e) => update({
                        superKnobAssign: { ...part.superKnobAssign, targetParam: e.target.value as any }
                      })}
                      className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
                    >
                      <option value="cutoff">Filter Cutoff (Abertura de Brilho)</option>
                      <option value="volume">Volume da Parte (Morphing Fade)</option>
                      <option value="reverb">Reverb Send Depth (Espacialidade)</option>
                      <option value="morph">Engine Waveform Morph</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-400">Valor Mínimo (Knob em 0)</span>
                        <span className="font-mono text-cyan-400 font-bold">{part.superKnobAssign.minVal}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        value={part.superKnobAssign.minVal}
                        onChange={(e) => update({
                          superKnobAssign: { ...part.superKnobAssign, minVal: parseInt(e.target.value) }
                        })}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-neutral-400">Valor Máximo (Knob em 127)</span>
                        <span className="font-mono text-cyan-400 font-bold">{part.superKnobAssign.maxVal}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="127"
                        value={part.superKnobAssign.maxVal}
                        onChange={(e) => update({
                          superKnobAssign: { ...part.superKnobAssign, maxVal: parseInt(e.target.value) }
                        })}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            Alterações transmitidas em tempo real para MIDI Out e sintetizador virtual.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold text-xs transition-colors"
          >
            Concluir Edição
          </button>
        </div>
      </div>
    </div>
  );
};
