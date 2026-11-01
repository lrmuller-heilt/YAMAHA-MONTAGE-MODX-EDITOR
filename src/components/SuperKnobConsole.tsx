import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Split, Layers, Music, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Performance, SynthTarget } from '../types/synth';
import { midiService } from '../services/midiService';

interface SuperKnobConsoleProps {
  performance: Performance;
  target: SynthTarget;
  onUpdatePerformance: (updater: (prev: Performance) => Performance) => void;
  onOpenSplitWizard: () => void;
  onOpenLayerWizard: () => void;
}

export const SuperKnobConsole: React.FC<SuperKnobConsoleProps> = ({
  performance,
  target,
  onUpdatePerformance,
  onOpenSplitWizard,
  onOpenLayerWizard
}) => {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);
  const [knobVal, setKnobVal] = useState(performance.superKnob);

  useEffect(() => {
    setKnobVal(performance.superKnob);
  }, [performance.superKnob]);

  // Handle knob drag interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = knobVal;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaY = startY.current - moveEvent.clientY;
      const sensitivity = 0.8;
      const newVal = Math.max(0, Math.min(127, Math.round(startVal.current + deltaY * sensitivity)));

      setKnobVal(newVal);
      onUpdatePerformance(p => ({ ...p, superKnob: newVal }));
      midiService.sendSuperKnob(newVal, target);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Wheel interaction
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 3 : -3;
    const newVal = Math.max(0, Math.min(127, knobVal + delta));
    setKnobVal(newVal);
    onUpdatePerformance(p => ({ ...p, superKnob: newVal }));
    midiService.sendSuperKnob(newVal, target);
  };

  const handleSceneSelect = (sceneNum: number) => {
    onUpdatePerformance(p => ({ ...p, activeScene: sceneNum }));
    midiService.sendSceneSelect(sceneNum, target);
  };

  const toggleMotionSeq = () => {
    onUpdatePerformance(p => ({ ...p, motionSeq: !p.motionSeq }));
  };

  // Rotation angle: -135deg (at 0) to +135deg (at 127)
  const angle = -135 + (knobVal / 127) * 270;
  const strokeDashoffset = 283 - (knobVal / 127) * 283;

  return (
    <div className="bg-neutral-900/90 border-b border-neutral-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-6 select-none">
      {/* Left: Active Performance Summary */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white tracking-tight">
              {performance.name}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              {performance.category}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
              {performance.parts.length} {performance.parts.length === 1 ? 'Parte' : 'Partes'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
            <span>BPM: <strong className="text-neutral-200 font-mono">{performance.tempo}</strong></span>
            <span>·</span>
            <span>Cena Atual: <strong className="text-amber-400 font-mono">Cena {performance.activeScene}</strong></span>
            <span>·</span>
            <span className="truncate max-w-xs">{performance.notes || 'Sem anotações'}</span>
          </div>
        </div>

        {/* Quick Quick Edit Wizards */}
        <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-neutral-800">
          <button
            onClick={onOpenSplitWizard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700 transition-colors"
            title="Dividir teclado em duas zonas (baixo na esquerda, teclas na direita)"
          >
            <Split className="w-3.5 h-3.5 text-cyan-400" />
            <span>Assistente Split</span>
          </button>
          <button
            onClick={onOpenLayerWizard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700 transition-colors"
            title="Adicionar nova camada AWM2, FM-X ou AN-X"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Adicionar Layer</span>
          </button>
        </div>
      </div>

      {/* Center: The Super Knob Hardware Section */}
      <div className="flex items-center gap-6">
        {/* Super Knob */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Super Knob
            </div>
            <div className="text-xl font-bold font-mono text-white tabular-nums">
              {knobVal}
            </div>
          </div>

          <div
            className="relative w-18 h-18 cursor-ns-resize flex items-center justify-center group"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            title="Arraste para cima/baixo ou use a roda do mouse para girar o Super Knob"
          >
            {/* Circular LED Ring (SVG Arc) */}
            <svg className="w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              {/* Background Ring Track */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#262626"
                strokeWidth="6"
                strokeDasharray="210 100"
                strokeDashoffset="-25"
                strokeLinecap="round"
              />
              {/* Active LED Ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#superKnobGrad)"
                strokeWidth="6"
                strokeDasharray="210 100"
                strokeDashoffset={210 - (knobVal / 127) * 210 - 25}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
              <defs>
                <linearGradient id="superKnobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="60%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>

            {/* Realistic Hardware Knob Center */}
            <div
              className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-neutral-700 via-neutral-900 to-black border-2 border-neutral-600 shadow-xl flex items-center justify-center transition-transform"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              {/* Notch / Pointer */}
              <div className="absolute top-1 w-1.5 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              {/* Subtle metallic radial lines */}
              <div className="w-6 h-6 rounded-full bg-neutral-950/80 border border-neutral-800 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-500/40" />
              </div>
            </div>
          </div>

          {/* Motion Sequencer Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggleMotionSeq}
              className={`px-2.5 py-1 text-[11px] font-bold rounded border transition-all ${
                performance.motionSeq
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
              }`}
              title="Motion Sequencer: Ativar automação contínua sincronizada com o andamento"
            >
              MOTION SEQ
            </button>
            <span className="text-[9px] font-mono text-neutral-400 mt-1 uppercase">
              {performance.motionSeq ? 'PLAYING' : 'OFF'}
            </span>
          </div>
        </div>

        {/* 8 Scene Buttons */}
        <div className="hidden sm:flex flex-col gap-1 pl-4 border-l border-neutral-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Montage Scenes (1 - 8)
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sceneNum) => {
              const isCurrent = performance.activeScene === sceneNum;
              return (
                <button
                  key={sceneNum}
                  onClick={() => handleSceneSelect(sceneNum)}
                  className={`w-7 h-6 text-xs font-mono font-bold rounded flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-neutral-950 font-extrabold shadow-[0_0_8px_rgba(245,158,11,0.5)] scale-105'
                      : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60'
                  }`}
                  title={`Alternar para Cena ${sceneNum}`}
                >
                  {sceneNum}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
