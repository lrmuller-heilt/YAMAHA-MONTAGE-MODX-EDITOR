import React, { useState } from 'react';
import { X, Layers, Check, Sparkles } from 'lucide-react';
import { Performance, Part, SynthTarget, EngineType, Category } from '../types/synth';

interface LayerWizardModalProps {
  performance: Performance;
  target: SynthTarget;
  onApplyLayer: (newPart: Partial<Part>, linkToSuperKnob: boolean) => void;
  onClose: () => void;
}

export const LayerWizardModal: React.FC<LayerWizardModalProps> = ({
  performance,
  target,
  onApplyLayer,
  onClose
}) => {
  const [layerType, setLayerType] = useState<'WarmStrings' | 'FMBell' | 'ANXAnalogPad' | 'Choir' | 'ShimmerAir'>('WarmStrings');
  const [volume, setVolume] = useState<number>(85);
  const [linkToSuperKnob, setLinkToSuperKnob] = useState<boolean>(true);

  const isMontageM = target === 'MONTAGE_M' || target === 'MONTAGE_ESP';

  const handleApply = () => {
    let name = 'Warm String Layer';
    let engineType: EngineType = 'AWM2';
    let category: Category = 'Strings';
    let attack = 35;
    let release = 60;

    switch (layerType) {
      case 'WarmStrings':
        name = 'Symphonic Warm Strings';
        engineType = 'AWM2';
        category = 'Strings';
        attack = 40;
        release = 65;
        break;
      case 'FMBell':
        name = 'FM-X Crystalline Tine';
        engineType = 'FM-X';
        category = 'Synth Pad';
        attack = 10;
        release = 75;
        break;
      case 'ANXAnalogPad':
        name = 'Montage M AN-X Lush Pad';
        engineType = isMontageM ? 'AN-X' : 'AWM2';
        category = 'Synth Pad';
        attack = 50;
        release = 70;
        break;
      case 'Choir':
        name = 'AWM2 Air Choir Aah';
        engineType = 'AWM2';
        category = 'Sound FX';
        attack = 45;
        release = 55;
        break;
      case 'ShimmerAir':
        name = 'FM-X Shimmering Atmosphere';
        engineType = 'FM-X';
        category = 'Synth Pad';
        attack = 60;
        release = 90;
        break;
    }

    const newPart: Partial<Part> = {
      name,
      engineType,
      category,
      volume,
      pan: 64,
      reverbSend: 65,
      envelope: { attack, decay: 75, sustain: 85, release },
      filter: { type: 'LPF24', cutoff: 85, resonance: 15, envDepth: 10 },
      superKnobAssign: {
        enabled: linkToSuperKnob,
        targetParam: 'volume',
        minVal: 0,
        maxVal: volume
      }
    };

    onApplyLayer(newPart, linkToSuperKnob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950 border border-amber-800/40 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Assistente de Camadas (Layer Wizard)
              </h3>
              <p className="text-xs text-neutral-400">
                Adicione uma nova camada de textura sonora com 1 clique sobre "{performance.name}".
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-2">
              Escolha a Camada Sonora
            </label>
            <div className="space-y-2">
              {[
                { id: 'WarmStrings', name: 'Symphonic Warm Strings', eng: 'AWM2', desc: 'Cordas orquestrais ricas com transição suave' },
                { id: 'FMBell', name: 'FM-X Crystalline Tine & Bell', eng: 'FM-X', desc: 'Harmônicos de sino FM inspirados no clássico DX7' },
                { id: 'ANXAnalogPad', name: 'AN-X Lush Vintage Pad', eng: isMontageM ? 'AN-X' : 'AWM2', desc: 'Pad analógico quente com osciladores dessincronizados' },
                { id: 'ShimmerAir', name: 'FM-X Shimmering Atmosphere', eng: 'FM-X', desc: 'Textura ambiente etérea com modulação lenta' }
              ].map(opt => (
                <label
                  key={opt.id}
                  onClick={() => setLayerType(opt.id as any)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    layerType === opt.id
                      ? 'bg-amber-950/30 border-amber-500/70 shadow-sm'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{opt.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        opt.eng === 'AWM2' ? 'bg-cyan-950 text-cyan-400' : opt.eng === 'FM-X' ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {opt.eng}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">{opt.desc}</span>
                  </div>
                  <input
                    type="radio"
                    name="layerType"
                    checked={layerType === opt.id}
                    onChange={() => setLayerType(opt.id as any)}
                    className="accent-amber-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Volume Slider */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-300 font-semibold">Volume Inicial da Camada</span>
              <span className="font-mono text-amber-400 font-bold">{volume}</span>
            </div>
            <input
              type="range"
              min="0"
              max="127"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Super Knob Morph Checkbox */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
            <input
              type="checkbox"
              checked={linkToSuperKnob}
              onChange={(e) => setLinkToSuperKnob(e.target.checked)}
              className="accent-cyan-500 rounded w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-white block">
                Vincular ao Super Knob (Fade Dinâmico)
              </span>
              <span className="text-[11px] text-neutral-400 block">
                Girar o Super Knob aumentará ou diminuirá suavemente o volume desta camada durante a performance.
              </span>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Adicionar Camada</span>
          </button>
        </div>
      </div>
    </div>
  );
};
