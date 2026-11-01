import React, { useState } from 'react';
import { 
  Grid, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  Play, 
  Palette,
  ArrowRight
} from 'lucide-react';
import { LiveSetPage, LiveSetSlot, Performance, SynthTarget } from '../types/synth';
import { midiService } from '../services/midiService';
import { audioSynth } from '../services/audioSynth';

interface LiveSetManagerProps {
  pages: LiveSetPage[];
  activePerformance: Performance;
  performances: Performance[];
  target: SynthTarget;
  onSelectPerformance: (perf: Performance) => void;
  onUpdatePages: (updater: (prev: LiveSetPage[]) => LiveSetPage[]) => void;
}

export const LiveSetManager: React.FC<LiveSetManagerProps> = ({
  pages,
  activePerformance,
  performances,
  target,
  onSelectPerformance,
  onUpdatePages
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const currentPage = pages[currentPageIndex] || pages[0];

  const handleSlotClick = (slot: LiveSetSlot) => {
    if (!slot.performanceId) return;
    const targetPerf = performances.find(p => p.id === slot.performanceId);
    if (targetPerf) {
      onSelectPerformance(targetPerf);
      midiService.sendPerformanceSelect(targetPerf, target);
      audioSynth.auditionPerformance();
    }
  };

  const handleAssignCurrentToSlot = (slotIndex: number) => {
    onUpdatePages(prevPages => {
      const next = [...prevPages];
      const page = { ...next[currentPageIndex] };
      const slots = [...page.slots];
      slots[slotIndex] = {
        ...slots[slotIndex],
        performanceId: activePerformance.id,
        label: activePerformance.name.slice(0, 16),
        color: slots[slotIndex].color === 'neutral' ? 'cyan' : slots[slotIndex].color
      };
      page.slots = slots;
      next[currentPageIndex] = page;
      return next;
    });
  };

  const handleClearSlot = (slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePages(prevPages => {
      const next = [...prevPages];
      const page = { ...next[currentPageIndex] };
      const slots = [...page.slots];
      slots[slotIndex] = {
        ...slots[slotIndex],
        performanceId: undefined,
        label: undefined,
        color: 'neutral'
      };
      page.slots = slots;
      next[currentPageIndex] = page;
      return next;
    });
  };

  const handleCycleColor = (slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const colors: LiveSetSlot['color'][] = ['cyan', 'amber', 'rose', 'emerald', 'blue', 'purple', 'neutral'];
    onUpdatePages(prevPages => {
      const next = [...prevPages];
      const page = { ...next[currentPageIndex] };
      const slots = [...page.slots];
      const current = slots[slotIndex].color;
      const nextColor = colors[(colors.indexOf(current) + 1) % colors.length];
      slots[slotIndex] = { ...slots[slotIndex], color: nextColor };
      page.slots = slots;
      next[currentPageIndex] = page;
      return next;
    });
  };

  const colorStyles: Record<LiveSetSlot['color'], { bg: string; text: string; border: string }> = {
    cyan: { bg: 'bg-cyan-950/60 hover:bg-cyan-900/60', text: 'text-cyan-300', border: 'border-cyan-600/50' },
    amber: { bg: 'bg-amber-950/60 hover:bg-amber-900/60', text: 'text-amber-300', border: 'border-amber-600/50' },
    rose: { bg: 'bg-rose-950/60 hover:bg-rose-900/60', text: 'text-rose-300', border: 'border-rose-600/50' },
    emerald: { bg: 'bg-emerald-950/60 hover:bg-emerald-900/60', text: 'text-emerald-300', border: 'border-emerald-600/50' },
    blue: { bg: 'bg-blue-950/60 hover:bg-blue-900/60', text: 'text-blue-300', border: 'border-blue-600/50' },
    purple: { bg: 'bg-purple-950/60 hover:bg-purple-900/60', text: 'text-purple-300', border: 'border-purple-600/50' },
    neutral: { bg: 'bg-neutral-900/40 hover:bg-neutral-900/80', text: 'text-neutral-400', border: 'border-neutral-800' }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {/* Top Bar */}
      <div className="px-6 py-3.5 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Grid className="w-4 h-4 text-amber-400" />
            Yamaha Live Set - 16 Slots de Disparo Rápido
          </h2>
          <p className="text-xs text-neutral-400">
            Grade ao vivo idêntica à tela do Montage/MODX para repertório de palco e troca rápida de timbres.
          </p>
        </div>

        {/* Current performance quick-assign indicator */}
        <div className="flex items-center gap-3 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400">Selecionada:</span>
          <span className="font-bold text-white truncate max-w-[140px]">{activePerformance.name}</span>
          <span className="text-neutral-500">→ Clique em "+ Atribuir" em qualquer slot</span>
        </div>
      </div>

      {/* 4x4 Grid of 16 Live Set Slots */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {currentPage.slots.map((slot, idx) => {
            const hasPerformance = Boolean(slot.performanceId);
            const perf = performances.find(p => p.id === slot.performanceId);
            const isCurrentActive = perf?.id === activePerformance.id;
            const style = colorStyles[slot.color];

            const slotNum = (idx + 1).toString().padStart(2, '0');

            return (
              <div
                key={idx}
                onClick={() => handleSlotClick(slot)}
                className={`relative p-4 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all cursor-pointer group ${
                  hasPerformance
                    ? `${style.bg} ${style.border} shadow-sm hover:scale-[1.02]`
                    : 'bg-neutral-900/30 border-neutral-800/80 hover:border-neutral-700'
                } ${isCurrentActive ? 'ring-2 ring-cyan-400 shadow-lg' : ''}`}
              >
                {/* Top: Slot Number and Controls */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    SLOT {slotNum}
                  </span>

                  {hasPerformance ? (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCycleColor(idx, e)}
                        className="p-1 rounded text-neutral-400 hover:text-white"
                        title="Trocar cor do slot"
                      >
                        <Palette className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleClearSlot(idx, e)}
                        className="p-1 rounded text-neutral-400 hover:text-rose-400"
                        title="Limpar slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Center: Title / Content */}
                <div className="my-2">
                  {hasPerformance && perf ? (
                    <div>
                      <h4 className={`text-sm font-bold truncate tracking-tight ${style.text}`}>
                        {perf.name}
                      </h4>
                      <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {perf.category} · {perf.parts.length}p
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-xs text-neutral-500 font-medium block">
                        Vazio
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAssignCurrentToSlot(idx); }}
                        className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        + Atribuir Aqui
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom: Recall Action */}
                {hasPerformance && (
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-white/5">
                    <span className="font-mono">RECALL MIDI</span>
                    <Play className="w-3 h-3 text-cyan-400 fill-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
