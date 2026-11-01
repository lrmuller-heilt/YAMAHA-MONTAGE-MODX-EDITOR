import React, { useState } from 'react';
import { X, Split, Check, Piano, Disc, Sparkles } from 'lucide-react';
import { Performance, Part, SynthTarget, Category } from '../types/synth';

interface SplitWizardModalProps {
  performance: Performance;
  target: SynthTarget;
  onApplySplit: (leftPart: Partial<Part>, rightPart: Partial<Part>, splitPointNote: number) => void;
  onClose: () => void;
}

export const SplitWizardModal: React.FC<SplitWizardModalProps> = ({
  performance,
  target,
  onApplySplit,
  onClose
}) => {
  const [splitNote, setSplitNote] = useState<number>(60); // C3 (note 60)
  const [leftSound, setLeftSound] = useState<'AcousticBass' | 'SynthBass' | 'FMBass' | 'Strings'>('AcousticBass');
  const [rightSound, setRightSound] = useState<'CFXGrand' | 'DXRoads' | 'ANXBrass' | 'Organ'>('CFXGrand');

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const getNoteLabel = (n: number) => {
    const oct = Math.floor(n / 12) - 2;
    return `${noteNames[n % 12]}${oct}`;
  };

  const handleApply = () => {
    const leftPart: Partial<Part> = {
      name: leftSound === 'AcousticBass' ? 'Upright Bass (Left)' : leftSound === 'SynthBass' ? 'Sub Synth Bass' : 'FM Solid Bass',
      category: 'Bass',
      engineType: leftSound === 'FMBass' ? 'FM-X' : target === 'MONTAGE_M' ? 'AN-X' : 'AWM2',
      keyRange: { lowNote: 21, highNote: splitNote - 1 },
      volume: 115,
      pan: 56
    };

    const rightPart: Partial<Part> = {
      name: rightSound === 'CFXGrand' ? 'CFX Grand (Right)' : rightSound === 'DXRoads' ? 'DX7 Mark II EP' : 'Vintage AN-X Brass',
      category: rightSound === 'CFXGrand' ? 'Piano' : rightSound === 'DXRoads' ? 'Keyboard' : 'Brass',
      engineType: rightSound === 'DXRoads' ? 'FM-X' : rightSound === 'ANXBrass' ? 'AN-X' : 'AWM2',
      keyRange: { lowNote: splitNote, highNote: 108 },
      volume: 118,
      pan: 70
    };

    onApplySplit(leftPart, rightPart, splitNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800/40 text-cyan-400">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Assistente de Teclado Dividido (Key Split Wizard)
              </h3>
              <p className="text-xs text-neutral-400">
                Configure instantaneamente um som para a mão esquerda e outro para a mão direita.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Split Point Slider */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-neutral-300">Ponto de Divisão (Split Point)</span>
              <span className="font-mono text-cyan-400 font-bold text-sm bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                {getNoteLabel(splitNote)} (Nota MIDI {splitNote})
              </span>
            </div>

            <input
              type="range"
              min="36"
              max="84"
              value={splitNote}
              onChange={(e) => setSplitNote(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />

            {/* Visual Split Ribbon */}
            <div className="flex h-5 rounded-md overflow-hidden text-[10px] font-mono font-bold">
              <div
                className="bg-cyan-600/80 text-white flex items-center justify-center transition-all"
                style={{ width: `${((splitNote - 21) / (108 - 21)) * 100}%` }}
              >
                Mão Esquerda (Baixo)
              </div>
              <div className="flex-1 bg-amber-500/80 text-neutral-950 flex items-center justify-center">
                Mão Direita (Solo/Acordes)
              </div>
            </div>
          </div>

          {/* Sound Presets for Left and Right */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Hand */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-xs font-bold text-cyan-400 block uppercase">
                Mão Esquerda (Grave)
              </label>
              <select
                value={leftSound}
                onChange={(e) => setLeftSound(e.target.value as any)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
              >
                <option value="AcousticBass">Acoustic Upright Bass (AWM2)</option>
                <option value="SynthBass">Deep Sub Synth Bass (AN-X)</option>
                <option value="FMBass">FM Solid DX Bass (FM-X)</option>
                <option value="Strings">Cello & Bass Strings (AWM2)</option>
              </select>
              <span className="text-[11px] text-neutral-400 block">
                Alcance: A-1 até {getNoteLabel(splitNote - 1)}
              </span>
            </div>

            {/* Right Hand */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-xs font-bold text-amber-400 block uppercase">
                Mão Direita (Agudo)
              </label>
              <select
                value={rightSound}
                onChange={(e) => setRightSound(e.target.value as any)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white"
              >
                <option value="CFXGrand">CFX Concert Grand (AWM2)</option>
                <option value="DXRoads">FM Linear DX Roads (FM-X)</option>
                <option value="ANXBrass">Vintage Poly Brass (AN-X)</option>
                <option value="Organ">Jazz Tonewheel Organ (AWM2)</option>
              </select>
              <span className="text-[11px] text-neutral-400 block">
                Alcance: {getNoteLabel(splitNote)} até C7
              </span>
            </div>
          </div>
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
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Divisão</span>
          </button>
        </div>
      </div>
    </div>
  );
};
