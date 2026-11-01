/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  SynthTarget, 
  Performance, 
  Part, 
  LiveSetPage 
} from './types/synth';
import { 
  INITIAL_PERFORMANCES, 
  INITIAL_LIVESET_PAGES 
} from './data/presetPerformances';
import { midiService } from './services/midiService';
import { audioSynth } from './services/audioSynth';
import { TopNavigation } from './components/TopNavigation';
import { SuperKnobConsole } from './components/SuperKnobConsole';
import { PerformanceBrowser } from './components/PerformanceBrowser';
import { PartMixer } from './components/PartMixer';
import { LiveSetManager } from './components/LiveSetManager';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { MidiModal } from './components/MidiModal';
import { SplitWizardModal } from './components/SplitWizardModal';
import { LayerWizardModal } from './components/LayerWizardModal';
import { YamahaFileModal } from './components/YamahaFileModal';
import { YamahaArchive, yamahaFileService } from './services/yamahaFileService';

export default function App() {
  const [currentTarget, setCurrentTarget] = useState<SynthTarget>('MONTAGE_M');
  const [performances, setPerformances] = useState<Performance[]>(() => {
    const saved = localStorage.getItem('montage_studio_performances');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to initial
      }
    }
    return INITIAL_PERFORMANCES;
  });

  const [activePerformanceId, setActivePerformanceId] = useState<string>(
    performances[0]?.id || 'perf-cfx-grand'
  );

  const [liveSetPages, setLiveSetPages] = useState<LiveSetPage[]>(() => {
    const saved = localStorage.getItem('montage_studio_liveset');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to initial
      }
    }
    return INITIAL_LIVESET_PAGES;
  });

  const [activeTab, setActiveTab] = useState<'librarian' | 'mixer' | 'liveset'>('librarian');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMidiModalOpen, setIsMidiModalOpen] = useState(false);
  const [isSplitWizardOpen, setIsSplitWizardOpen] = useState(false);
  const [isLayerWizardOpen, setIsLayerWizardOpen] = useState(false);
  const [loadedArchive, setLoadedArchive] = useState<YamahaArchive | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active performance object
  const activePerformance = performances.find(p => p.id === activePerformanceId) || performances[0];

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('montage_studio_performances', JSON.stringify(performances));
  }, [performances]);

  useEffect(() => {
    localStorage.setItem('montage_studio_liveset', JSON.stringify(liveSetPages));
  }, [liveSetPages]);

  // Initialize Web MIDI API and synth engine on mount
  useEffect(() => {
    midiService.init();
    if (activePerformance) {
      audioSynth.setPerformance(activePerformance);
    }
  }, []);

  // Sync synth engine whenever active performance updates
  useEffect(() => {
    if (activePerformance) {
      audioSynth.setPerformance(activePerformance);
    }
  }, [activePerformance]);

  const handleUpdateActivePerformance = (updater: (prev: Performance) => Performance) => {
    setPerformances(prevList => {
      return prevList.map(item => {
        if (item.id === activePerformanceId) {
          const updated = updater(item);
          audioSynth.setPerformance(updated);
          return updated;
        }
        return item;
      });
    });
  };

  const handleSelectPerformance = (perf: Performance) => {
    setActivePerformanceId(perf.id);
    audioSynth.setPerformance(perf);
    midiService.sendPerformanceSelect(perf, currentTarget);
  };

  const handleDuplicatePerformance = (perf: Performance) => {
    const newId = 'perf-' + Math.random().toString(36).substring(2, 9);
    const duplicated: Performance = {
      ...perf,
      id: newId,
      name: `${perf.name} (Cópia)`,
      bank: 'USER',
      liveSetSlot: undefined,
      parts: perf.parts.map(p => ({
        ...p,
        id: Math.random().toString(36).substring(2, 9)
      }))
    };
    setPerformances(prev => [duplicated, ...prev]);
    setActivePerformanceId(newId);
  };

  const handleDeletePerformance = (id: string) => {
    if (performances.length <= 1) return;
    setPerformances(prev => prev.filter(p => p.id !== id));
    if (activePerformanceId === id) {
      const remaining = performances.filter(p => p.id !== id);
      if (remaining[0]) {
        setActivePerformanceId(remaining[0].id);
      }
    }
  };

  const handleBatchDeletePerformances = (ids: string[]) => {
    const idSet = new Set(ids);
    setPerformances(prev => {
      const remaining = prev.filter(p => !idSet.has(p.id));
      if (remaining.length === 0) return prev;
      if (idSet.has(activePerformanceId) && remaining[0]) {
        setActivePerformanceId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleRestorePerformance = (perf: Performance) => {
    setPerformances(prev => [perf, ...prev]);
    setActivePerformanceId(perf.id);
  };

  const handleCreatePerformance = () => {
    const newId = 'perf-' + Math.random().toString(36).substring(2, 9);
    const newPerf: Performance = {
      id: newId,
      name: 'Nova Performance Inicial',
      category: 'Piano',
      subCategory: 'Acoustic',
      targetCompatibility: [currentTarget],
      tempo: 120,
      superKnob: 64,
      motionSeq: false,
      activeScene: 1,
      bank: 'USER',
      parts: [
        {
          id: Math.random().toString(36).substring(2, 9),
          partNumber: 1,
          enabled: true,
          solo: false,
          name: 'CFX Initial Grand',
          category: 'Piano',
          engineType: 'AWM2',
          volume: 110,
          pan: 64,
          reverbSend: 45,
          chorusSend: 0,
          dryWet: 127,
          tuningCoarse: 0,
          tuningFine: 0,
          keyRange: { lowNote: 0, highNote: 127 },
          velRange: { lowVel: 1, highVel: 127 },
          filter: { type: 'LPF24', cutoff: 110, resonance: 15, envDepth: 10 },
          envelope: { attack: 2, decay: 75, sustain: 65, release: 35 },
          eq: { low: 0, mid: 0, midFreq: 1000, high: 0 },
          arp: { enabled: false, type: 'None', tempoSync: false, hold: false },
          superKnobAssign: { enabled: true, targetParam: 'volume', minVal: 0, maxVal: 110 }
        }
      ]
    };

    setPerformances(prev => [newPerf, ...prev]);
    setActivePerformanceId(newId);
    setActiveTab('mixer');
  };

  const handleApplySplit = (leftPart: Partial<Part>, rightPart: Partial<Part>, splitPoint: number) => {
    handleUpdateActivePerformance(prev => {
      const p1: Part = {
        ...prev.parts[0],
        ...leftPart,
        id: Math.random().toString(36).substring(2, 9),
        partNumber: 1,
        keyRange: { lowNote: 0, highNote: splitPoint - 1 }
      };

      const p2: Part = {
        ...(prev.parts[1] || prev.parts[0]),
        ...rightPart,
        id: Math.random().toString(36).substring(2, 9),
        partNumber: 2,
        keyRange: { lowNote: splitPoint, highNote: 127 }
      };

      return {
        ...prev,
        name: `${prev.name} [Split]`,
        parts: [p1, p2]
      };
    });
  };

  const handleApplyLayer = (newPartData: Partial<Part>, linkToSuperKnob: boolean) => {
    handleUpdateActivePerformance(prev => {
      const newPart: Part = {
        id: Math.random().toString(36).substring(2, 9),
        partNumber: prev.parts.length + 1,
        name: newPartData.name || 'Nova Camada',
        category: newPartData.category || 'Strings',
        engineType: newPartData.engineType || 'AWM2',
        enabled: true,
        solo: false,
        volume: newPartData.volume || 85,
        pan: 64,
        reverbSend: 60,
        chorusSend: 30,
        dryWet: 127,
        tuningCoarse: 0,
        tuningFine: 4,
        keyRange: { lowNote: 0, highNote: 127 },
        velRange: { lowVel: 1, highVel: 127 },
        filter: newPartData.filter || { type: 'LPF24', cutoff: 90, resonance: 15, envDepth: 0 },
        envelope: newPartData.envelope || { attack: 40, decay: 75, sustain: 85, release: 65 },
        eq: { low: 0, mid: 0, midFreq: 1200, high: 0 },
        arp: { enabled: false, type: 'None', tempoSync: false, hold: false },
        superKnobAssign: {
          enabled: linkToSuperKnob,
          targetParam: 'volume',
          minVal: 0,
          maxVal: newPartData.volume || 85
        }
      };

      return {
        ...prev,
        parts: [...prev.parts, newPart]
      };
    });
  };

  const handleExportLibrary = () => {
    const data = {
      app: 'Montage Studio - Müller Edition',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      currentTarget,
      performances,
      liveSetPages
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Yamaha_Montage_Library_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportLibraryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const archive = await yamahaFileService.parseFile(file);
      setLoadedArchive(archive);
    } catch (err) {
      console.error('File parse error:', err);
      alert('Erro ao processar arquivo: ' + String(err));
    }
    e.target.value = '';
  };

  const handleOpenDemoArchive = (type: 'X7U' | 'X7L' | 'X7A') => {
    const demo = yamahaFileService.createDemoArchive(type);
    setLoadedArchive(demo);
  };

  const handleImportSelectedPerformances = (selected: Performance[], replaceAll: boolean) => {
    if (replaceAll) {
      setPerformances(selected);
      if (selected[0]) {
        setActivePerformanceId(selected[0].id);
        audioSynth.setPerformance(selected[0]);
      }
    } else {
      setPerformances(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPerfs = selected.map(p => {
          if (existingIds.has(p.id)) {
            return { ...p, id: 'perf-' + Math.random().toString(36).substring(2, 9) };
          }
          return p;
        });
        return [...newPerfs, ...prev];
      });
      if (selected[0]) {
        setActivePerformanceId(selected[0].id);
        audioSynth.setPerformance(selected[0]);
      }
    }
  };

  const toggleMuteAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    audioSynth.setMuted(next);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Hidden file input supporting .X7L, .X7U, .X7A and .JSON */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".x7l,.x7u,.x7a,.X7L,.X7U,.X7A,.x8l,.x8u,.x8a,.X8L,.X8U,.X8A,.json"
        className="hidden"
      />

      {/* Top Bar Navigation */}
      <TopNavigation
        currentTarget={currentTarget}
        onTargetChange={(tgt) => {
          setCurrentTarget(tgt);
          midiService.sendPerformanceSelect(activePerformance, tgt);
        }}
        activePerformance={activePerformance}
        onOpenMidiModal={() => setIsMidiModalOpen(true)}
        isAudioMuted={isAudioMuted}
        onToggleMute={toggleMuteAudio}
        onExportLibrary={handleExportLibrary}
        onImportLibrary={handleImportLibraryClick}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Super Knob Hardware Rack Console Bar */}
      <SuperKnobConsole
        performance={activePerformance}
        target={currentTarget}
        onUpdatePerformance={handleUpdateActivePerformance}
        onOpenSplitWizard={() => setIsSplitWizardOpen(true)}
        onOpenLayerWizard={() => setIsLayerWizardOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'librarian' && (
          <PerformanceBrowser
            performances={performances}
            activePerformanceId={activePerformanceId}
            onSelectPerformance={handleSelectPerformance}
            onDuplicatePerformance={handleDuplicatePerformance}
            onDeletePerformance={handleDeletePerformance}
            onBatchDeletePerformances={handleBatchDeletePerformances}
            onRestorePerformance={handleRestorePerformance}
            onCreatePerformance={handleCreatePerformance}
            onUpdatePerformance={handleUpdateActivePerformance}
            onOpenSplitWizard={() => setIsSplitWizardOpen(true)}
            onOpenLayerWizard={() => setIsLayerWizardOpen(true)}
            onExportLibrary={handleExportLibrary}
            onImportLibrary={handleImportLibraryClick}
            onOpenDemoArchive={handleOpenDemoArchive}
            currentTarget={currentTarget}
          />
        )}

        {activeTab === 'mixer' && (
          <PartMixer
            performance={activePerformance}
            target={currentTarget}
            onUpdatePerformance={handleUpdateActivePerformance}
            onOpenSplitWizard={() => setIsSplitWizardOpen(true)}
            onOpenLayerWizard={() => setIsLayerWizardOpen(true)}
          />
        )}

        {activeTab === 'liveset' && (
          <LiveSetManager
            pages={liveSetPages}
            activePerformance={activePerformance}
            performances={performances}
            target={currentTarget}
            onSelectPerformance={handleSelectPerformance}
            onUpdatePages={setLiveSetPages}
          />
        )}
      </main>

      {/* Bottom Virtual Keyboard & MIDI Wheels */}
      <VirtualKeyboard performance={activePerformance} />

      {/* Modals & Dialogs */}
      {isMidiModalOpen && (
        <MidiModal
          currentTarget={currentTarget}
          onClose={() => setIsMidiModalOpen(false)}
        />
      )}

      {isSplitWizardOpen && (
        <SplitWizardModal
          performance={activePerformance}
          target={currentTarget}
          onApplySplit={handleApplySplit}
          onClose={() => setIsSplitWizardOpen(false)}
        />
      )}

      {isLayerWizardOpen && (
        <LayerWizardModal
          performance={activePerformance}
          target={currentTarget}
          onApplyLayer={handleApplyLayer}
          onClose={() => setIsLayerWizardOpen(false)}
        />
      )}

      {loadedArchive && (
        <YamahaFileModal
          archive={loadedArchive}
          currentTarget={currentTarget}
          onImportSelectedToLibrary={handleImportSelectedPerformances}
          onClose={() => setLoadedArchive(null)}
        />
      )}
    </div>
  );
}
