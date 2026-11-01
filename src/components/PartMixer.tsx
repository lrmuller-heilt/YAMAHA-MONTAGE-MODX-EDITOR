import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Settings2, 
  Trash2, 
  Copy, 
  Volume2, 
  VolumeX, 
  Radio, 
  Layers,
  Sparkles,
  Play
} from 'lucide-react';
import { Performance, Part, SynthTarget, EngineType } from '../types/synth';
import { midiService } from '../services/midiService';
import { audioSynth } from '../services/audioSynth';
import { PartInspector } from './PartInspector';

interface PartMixerProps {
  performance: Performance;
  target: SynthTarget;
  onUpdatePerformance: (updater: (prev: Performance) => Performance) => void;
  onOpenSplitWizard: () => void;
  onOpenLayerWizard: () => void;
}

export const PartMixer: React.FC<PartMixerProps> = ({
  performance,
  target,
  onUpdatePerformance,
  onOpenSplitWizard,
  onOpenLayerWizard
}) => {
  const [selectedPartIndex, setSelectedPartIndex] = useState<number | null>(null);

  const handleVolumeChange = (idx: number, val: number) => {
    onUpdatePerformance(p => {
      const parts = [...p.parts];
      parts[idx] = { ...parts[idx], volume: val };
      return { ...p, parts };
    });
    midiService.sendPartVolume(idx, val);
  };

  const handlePanChange = (idx: number, val: number) => {
    onUpdatePerformance(p => {
      const parts = [...p.parts];
      parts[idx] = { ...parts[idx], pan: val };
      return { ...p, parts };
    });
    midiService.sendPartPan(idx, val);
  };

  const handleReverbChange = (idx: number, val: number) => {
    onUpdatePerformance(p => {
      const parts = [...p.parts];
      parts[idx] = { ...parts[idx], reverbSend: val };
      return { ...p, parts };
    });
    midiService.sendPartReverb(idx, val);
  };

  const toggleMute = (idx: number) => {
    onUpdatePerformance(p => {
      const parts = [...p.parts];
      parts[idx] = { ...parts[idx], enabled: !parts[idx].enabled };
      return { ...p, parts };
    });
  };

  const toggleSolo = (idx: number) => {
    onUpdatePerformance(p => {
      const parts = [...p.parts];
      parts[idx] = { ...parts[idx], solo: !parts[idx].solo };
      return { ...p, parts };
    });
  };

  const [auditioningPartIdx, setAuditioningPartIdx] = useState<number | null>(null);

  const handleAuditionPart = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setAuditioningPartIdx(idx);
    audioSynth.auditionPart(idx);
    setTimeout(() => {
      setAuditioningPartIdx(null);
    }, 2200);
  };

  const handleDeletePart = (idx: number) => {
    if (performance.parts.length <= 1) return;
    onUpdatePerformance(p => {
      const parts = p.parts.filter((_, i) => i !== idx).map((pt, i) => ({
        ...pt,
        partNumber: i + 1
      }));
      return { ...p, parts };
    });
  };

  const handleDuplicatePart = (idx: number) => {
    if (performance.parts.length >= 16) return;
    onUpdatePerformance(p => {
      const src = p.parts[idx];
      const newPart: Part = {
        ...src,
        id: Math.random().toString(36).substring(2, 9),
        partNumber: p.parts.length + 1,
        name: `${src.name} (Copy)`
      };
      return { ...p, parts: [...p.parts, newPart] };
    });
  };

  const handleAddPart = () => {
    if (performance.parts.length >= 16) return;
    const isMontageM = target === 'MONTAGE_M' || target === 'MONTAGE_ESP';
    const newPart: Part = {
      id: Math.random().toString(36).substring(2, 9),
      partNumber: performance.parts.length + 1,
      name: `Nova Parte ${performance.parts.length + 1}`,
      category: 'Keyboard',
      engineType: isMontageM ? 'AN-X' : 'AWM2',
      enabled: true,
      solo: false,
      volume: 100,
      pan: 64,
      reverbSend: 40,
      chorusSend: 0,
      dryWet: 127,
      tuningCoarse: 0,
      tuningFine: 0,
      keyRange: { lowNote: 0, highNote: 127 },
      velRange: { lowVel: 1, highVel: 127 },
      filter: { type: 'LPF24', cutoff: 100, resonance: 15, envDepth: 0 },
      envelope: { attack: 2, decay: 60, sustain: 70, release: 35 },
      eq: { low: 0, mid: 0, midFreq: 1000, high: 0 },
      arp: { enabled: false, type: 'None', tempoSync: false, hold: false },
      superKnobAssign: { enabled: true, targetParam: 'volume', minVal: 0, maxVal: 100 }
    };

    onUpdatePerformance(p => ({ ...p, parts: [...p.parts, newPart] }));
  };

  const noteName = (n: number) => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const oct = Math.floor(n / 12) - 2;
    return `${names[n % 12]}${oct}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {/* Top Banner Toolbar */}
      <div className="px-6 py-3 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Mixer Multi-Partes de Alta Performance
          </h2>
          <span className="text-xs text-neutral-400">
            {performance.parts.length} de 16 Partes Usadas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddPart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 border border-neutral-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Adicionar Parte</span>
          </button>
          <button
            onClick={onOpenSplitWizard}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 border border-neutral-700 transition-colors"
          >
            Split Wizard
          </button>
          <button
            onClick={onOpenLayerWizard}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 border border-neutral-700 transition-colors"
          >
            Layer Wizard
          </button>
        </div>
      </div>

      {/* Mixer Channel Strips Rack (Horizontal Scrollable) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-3 scrollbar-thin">
        {performance.parts.map((part, idx) => {
          const isSelected = selectedPartIndex === idx;
          const isMuted = !part.enabled;
          const isSolo = part.solo;

          // Pan visual formatting: 0 = L64, 64 = C, 127 = R63
          const panText = part.pan === 64 
            ? 'C' 
            : part.pan < 64 
            ? `L${64 - part.pan}` 
            : `R${part.pan - 64}`;

          return (
            <div
              key={part.id || idx}
              className={`w-44 shrink-0 flex flex-col rounded-xl border transition-all ${
                isSelected
                  ? 'bg-neutral-900 border-cyan-500/60 shadow-lg shadow-cyan-950/20'
                  : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              {/* Strip Header: Part # and Engine */}
              <div className="p-3 bg-neutral-950/70 rounded-t-xl border-b border-neutral-800/70 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-neutral-300">
                  PART {part.partNumber}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    part.engineType === 'AWM2'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40'
                      : part.engineType === 'FM-X'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                  }`}
                >
                  {part.engineType}
                </span>
              </div>

              {/* Part Name & Category */}
              <div className="p-3 border-b border-neutral-800/50">
                <h4 className="text-xs font-bold text-white truncate" title={part.name}>
                  {part.name}
                </h4>
                <div className="text-[10px] text-neutral-400 truncate">
                  {part.category}
                </div>
              </div>

              {/* Mute and Solo Buttons */}
              <div className="px-3 py-2 flex items-center gap-1.5 border-b border-neutral-800/50">
                <button
                  onClick={() => toggleMute(idx)}
                  className={`flex-1 py-1 rounded text-xs font-bold font-mono transition-colors ${
                    isMuted
                      ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50'
                      : 'bg-neutral-800/80 text-neutral-400 hover:text-white border border-neutral-700'
                  }`}
                  title="Mute: Ligar/Desligar Parte"
                >
                  MUTE
                </button>
                <button
                  onClick={() => toggleSolo(idx)}
                  className={`flex-1 py-1 rounded text-xs font-bold font-mono transition-colors ${
                    isSolo
                      ? 'bg-amber-500 text-neutral-950 border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : 'bg-neutral-800/80 text-neutral-400 hover:text-white border border-neutral-700'
                  }`}
                  title="Solo: Isolar esta parte"
                >
                  SOLO
                </button>
              </div>

              {/* Rotary Controls: Pan & Reverb */}
              <div className="p-3 space-y-2.5 border-b border-neutral-800/50 text-[11px]">
                {/* Pan */}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">PAN</span>
                  <span className="font-mono text-cyan-400 font-bold">{panText}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={part.pan}
                  onChange={(e) => handlePanChange(idx, parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5"
                />

                {/* Reverb Send */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-neutral-400">REV SEND</span>
                  <span className="font-mono text-neutral-300 font-bold">{part.reverbSend}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="127"
                  value={part.reverbSend}
                  onChange={(e) => handleReverbChange(idx, parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Fader Section with LED Peak Meter */}
              <div className="flex-1 p-3 flex flex-col justify-end items-center relative min-h-[160px]">
                <div className="flex items-center gap-3 w-full justify-center flex-1">
                  {/* Vertical Fader */}
                  <div className="relative h-36 flex items-center justify-center">
                    <input
                      type="range"
                      min="0"
                      max="127"
                      value={part.volume}
                      onChange={(e) => handleVolumeChange(idx, parseInt(e.target.value))}
                      className="fader-vert h-36 accent-cyan-500 cursor-pointer"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                  </div>

                  {/* Simulated Hardware LED dB Meter */}
                  <div className="h-32 w-2 rounded bg-neutral-950 flex flex-col-reverse p-0.5 gap-0.5 border border-neutral-800">
                    {Array.from({ length: 12 }).map((_, step) => {
                      const threshold = (step / 12) * 127;
                      const isLit = !isMuted && part.volume > threshold;
                      let colorClass = 'bg-neutral-800';
                      if (isLit) {
                        if (step > 9) colorClass = 'bg-rose-500';
                        else if (step > 6) colorClass = 'bg-amber-400';
                        else colorClass = 'bg-emerald-400';
                      }
                      return (
                        <div
                          key={step}
                          className={`w-full flex-1 rounded-[1px] transition-colors ${colorClass}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Numeric Volume display */}
                <div className="mt-2 text-center">
                  <span className="text-xs font-mono font-bold text-white tabular-nums">
                    VOL: {part.volume}
                  </span>
                </div>
              </div>

              {/* Key Range Info */}
              <div className="px-3 py-1.5 bg-neutral-950/40 border-t border-neutral-800/60 text-center text-[10px] font-mono text-neutral-400 truncate">
                {noteName(part.keyRange.lowNote)} - {noteName(part.keyRange.highNote)}
              </div>

              {/* Bottom Strip Action Bar */}
              <div className="p-2 bg-neutral-950/80 rounded-b-xl border-t border-neutral-800/80 flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleAuditionPart(idx, e)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs font-bold transition-all ${
                      auditioningPartIdx === idx
                        ? 'bg-cyan-500 text-neutral-950 animate-pulse'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 border border-neutral-700/80'
                    }`}
                    title="Ouvir apenas esta parte isolada"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Ouvir</span>
                  </button>

                  <button
                    onClick={() => setSelectedPartIndex(idx)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-neutral-800 hover:bg-cyan-600 hover:text-neutral-950 text-neutral-200 text-xs font-bold transition-all border border-neutral-700/80"
                    title="Abrir editor completo de parâmetros da parte"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                </div>

                <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
                  <button
                    onClick={() => handleDuplicatePart(idx)}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    title="Duplicar parte"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicar</span>
                  </button>
                  {performance.parts.length > 1 && (
                    <button
                      onClick={() => handleDeletePart(idx)}
                      className="flex items-center gap-1 hover:text-rose-400 transition-colors"
                      title="Excluir esta parte"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Part Inspector Modal */}
      {selectedPartIndex !== null && performance.parts[selectedPartIndex] && (
        <PartInspector
          part={performance.parts[selectedPartIndex]}
          performance={performance}
          target={target}
          onUpdatePart={(updatedPart) => {
            onUpdatePerformance(p => {
              const parts = [...p.parts];
              parts[selectedPartIndex] = updatedPart;
              return { ...p, parts };
            });
          }}
          onClose={() => setSelectedPartIndex(null)}
        />
      )}
    </div>
  );
};
