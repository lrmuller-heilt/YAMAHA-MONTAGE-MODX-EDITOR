import React, { useState } from 'react';
import { 
  Piano, 
  Activity, 
  Sliders, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  AlertCircle,
  Radio,
  Download,
  Upload,
  Settings2
} from 'lucide-react';
import { SynthTarget, Performance } from '../types/synth';
import { midiService } from '../services/midiService';
import { audioSynth } from '../services/audioSynth';

interface TopNavigationProps {
  currentTarget: SynthTarget;
  onTargetChange: (target: SynthTarget) => void;
  activePerformance: Performance;
  onOpenMidiModal: () => void;
  isAudioMuted: boolean;
  onToggleMute: () => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
  activeTab: 'librarian' | 'mixer' | 'liveset';
  onTabChange: (tab: 'librarian' | 'mixer' | 'liveset') => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentTarget,
  onTargetChange,
  activePerformance,
  onOpenMidiModal,
  isAudioMuted,
  onToggleMute,
  onExportLibrary,
  onImportLibrary,
  activeTab,
  onTabChange
}) => {
  const [syncing, setSyncing] = useState(false);

  const handleAudition = () => {
    audioSynth.auditionPerformance();
  };

  const handlePanic = () => {
    midiService.sendPanic();
    audioSynth.allNotesOff();
  };

  const handleSyncHardware = () => {
    setSyncing(true);
    midiService.sendAllPartsDump(activePerformance, currentTarget);
    setTimeout(() => setSyncing(false), 600);
  };

  const targetLabels: Record<SynthTarget, { name: string; badge: string }> = {
    MONTAGE_CLASSIC: { name: 'MONTAGE Classic', badge: 'v3.5' },
    MODX: { name: 'MODX / MODX+', badge: 'v3.0' },
    MODX_PLUS: { name: 'MODX+', badge: 'v1.0' },
    MONTAGE_M: { name: 'MONTAGE M', badge: 'AN-X' },
    MONTAGE_ESP: { name: 'MONTAGE ESP', badge: 'Plugin' }
  };

  return (
    <header className="flex items-center justify-between gap-6 px-5 py-3 bg-neutral-900 border-b border-neutral-800 select-none">
      {/* Brand & Target Zone */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <Piano className="w-5 h-5 text-neutral-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white uppercase">
                Montage Studio
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                MÜLLER CORE
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              Gerenciador & Editor em Tempo Real
            </div>
          </div>
        </div>

        {/* Target Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-neutral-800">
          <span className="text-xs text-neutral-400 mr-1 font-medium">Sintetizador:</span>
          {(['MONTAGE_CLASSIC', 'MODX', 'MONTAGE_M', 'MONTAGE_ESP'] as SynthTarget[]).map((tgt) => {
            const isActive = currentTarget === tgt;
            return (
              <button
                key={tgt}
                onClick={() => onTargetChange(tgt)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent'
                }`}
                title={`Alterne para sintetizador ${targetLabels[tgt].name}`}
              >
                {targetLabels[tgt].name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Nav Views (Librarian, Mixer/Rack, Live Set) */}
      <nav className="flex items-center gap-1 bg-neutral-950/70 p-1 rounded-lg border border-neutral-800 shrink-0">
        <button
          onClick={() => onTabChange('librarian')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'librarian'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Librarian & Patches
        </button>
        <button
          onClick={() => onTabChange('mixer')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'mixer'
              ? 'bg-neutral-800 text-cyan-400 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Mixer & Partes ({activePerformance.parts.length})
        </button>
        <button
          onClick={() => onTabChange('liveset')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'liveset'
              ? 'bg-neutral-800 text-amber-400 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Live Set (16 Slots)
        </button>
      </nav>

      {/* Right Action Tools: MIDI, Audition, Panic, Backup */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time MIDI Status button */}
        <button
          onClick={onOpenMidiModal}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-xs font-medium text-neutral-300 transition-colors"
          title="Configurações de portas MIDI e Monitor SysEx em tempo real"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">MIDI / SysEx</span>
        </button>

        {/* Sync Hardware / ESP SysEx Dump */}
        <button
          onClick={handleSyncHardware}
          disabled={syncing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
            syncing
              ? 'bg-cyan-600 text-white animate-pulse'
              : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold shadow-md shadow-cyan-950/40'
          }`}
          title="Transmitir toda a performance em tempo real via SysEx para o Montage ou Montage ESP"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Transmitindo...' : 'Sincronizar'}</span>
        </button>

        {/* Audition chord preview */}
        <button
          onClick={handleAudition}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
          title="Tocar acorde teste para testar o som no sintetizador virtual"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Audicionar</span>
        </button>

        {/* Mute Virtual Audio Engine */}
        <button
          onClick={onToggleMute}
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            isAudioMuted
              ? 'bg-rose-950/50 border-rose-800/60 text-rose-400'
              : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
          }`}
          title={isAudioMuted ? 'Desmutar áudio do sintetizador interno' : 'Mutar áudio do sintetizador interno'}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* MIDI Panic / All Notes Off */}
        <button
          onClick={handlePanic}
          className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-400 hover:text-rose-400 transition-colors"
          title="Pânico MIDI: Cortar todas as notas e sons imediatamente"
        >
          <AlertCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
