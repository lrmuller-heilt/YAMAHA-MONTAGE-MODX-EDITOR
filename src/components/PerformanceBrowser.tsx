import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  Star, 
  Play, 
  Square,
  Volume2,
  Download, 
  Upload, 
  Layers, 
  Split, 
  Filter,
  CheckCircle2,
  FolderOpen,
  CheckSquare,
  Square as SquareOutline,
  RotateCcw,
  Sparkles,
  Music
} from 'lucide-react';
import { Performance, Category, SynthTarget } from '../types/synth';
import { ALL_CATEGORIES } from '../data/presetPerformances';
import { audioSynth } from '../services/audioSynth';
import { midiService } from '../services/midiService';

interface PerformanceBrowserProps {
  performances: Performance[];
  activePerformanceId: string;
  onSelectPerformance: (perf: Performance) => void;
  onDuplicatePerformance: (perf: Performance) => void;
  onDeletePerformance: (id: string) => void;
  onBatchDeletePerformances?: (ids: string[]) => void;
  onCreatePerformance: () => void;
  onUpdatePerformance: (updater: (prev: Performance) => Performance) => void;
  onOpenSplitWizard: () => void;
  onOpenLayerWizard: () => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
  currentTarget: SynthTarget;
  onRestorePerformance?: (perf: Performance) => void;
}

export const PerformanceBrowser: React.FC<PerformanceBrowserProps> = ({
  performances,
  activePerformanceId,
  onSelectPerformance,
  onDuplicatePerformance,
  onDeletePerformance,
  onBatchDeletePerformances,
  onCreatePerformance,
  onUpdatePerformance,
  onOpenSplitWizard,
  onOpenLayerWizard,
  onExportLibrary,
  onImportLibrary,
  currentTarget,
  onRestorePerformance
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [bankFilter, setBankFilter] = useState<'ALL' | 'PRESET' | 'USER'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Audition Controls
  const [auditioningId, setAuditioningId] = useState<string | null>(null);
  const [autoAudition, setAutoAudition] = useState<boolean>(false);
  const [auditionPattern, setAuditionPattern] = useState<'auto' | 'arpeggio' | 'chord' | 'lead' | 'bass'>('auto');

  // Batch Selection & Deletion
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Quick Undo Toast state
  const [deletedPerfSnapshot, setDeletedPerfSnapshot] = useState<Performance | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Subscribe to audio engine audition state
  useEffect(() => {
    const unsub = audioSynth.subscribeAuditionState((isPlaying) => {
      if (!isPlaying) {
        setAuditioningId(null);
      }
    });
    return unsub;
  }, []);

  // Keyboard shortcut: Spacebar to toggle audition, Delete to delete active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        const active = performances.find(p => p.id === activePerformanceId);
        if (active) {
          handleToggleAudition(active);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = performances.find(p => p.id === activePerformanceId);
        if (active && performances.length > 1) {
          handleDeleteSingle(active);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePerformanceId, performances, auditioningId, auditionPattern]);

  // Filtered performances
  const filteredList = useMemo(() => {
    return performances.filter(perf => {
      if (selectedCategory !== 'All' && perf.category !== selectedCategory) {
        return false;
      }
      if (bankFilter !== 'ALL' && perf.bank !== bankFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = perf.name.toLowerCase().includes(q);
        const matchesCat = perf.category.toLowerCase().includes(q);
        const matchesSub = perf.subCategory.toLowerCase().includes(q);
        const matchesPart = perf.parts.some(p => p.name.toLowerCase().includes(q) || p.engineType.toLowerCase().includes(q));
        if (!matchesName && !matchesCat && !matchesSub && !matchesPart) return false;
      }
      return true;
    });
  }, [performances, selectedCategory, bankFilter, searchQuery]);

  const handleStartRename = (perf: Performance, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(perf.id);
    setEditName(perf.name);
  };

  const handleSaveRename = (perfId: string) => {
    if (editName.trim()) {
      onUpdatePerformance(p => p.id === perfId ? { ...p, name: editName.trim() } : p);
    }
    setEditingId(null);
  };

  const handleToggleFavorite = (perf: Performance, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePerformance(p => p.id === perf.id ? { ...p, favorite: !p.favorite } : p);
  };

  // Audition playback trigger
  const handleToggleAudition = (perf: Performance, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (auditioningId === perf.id && audioSynth.isAuditionActive()) {
      audioSynth.stopAudition();
      setAuditioningId(null);
      return;
    }

    onSelectPerformance(perf);
    setAuditioningId(perf.id);
    setTimeout(() => {
      audioSynth.auditionPerformance(auditionPattern);
    }, 40);
  };

  const handleSelectCard = (perf: Performance) => {
    if (isBatchMode) {
      toggleSelectId(perf.id);
      return;
    }

    onSelectPerformance(perf);
    if (autoAudition) {
      setAuditioningId(perf.id);
      setTimeout(() => {
        audioSynth.auditionPerformance(auditionPattern);
      }, 50);
    }
  };

  // Fast single deletion with Undo
  const handleDeleteSingle = (perf: Performance, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (performances.length <= 1) return;

    setDeletedPerfSnapshot(perf);
    setShowUndoToast(true);
    onDeletePerformance(perf.id);

    setTimeout(() => {
      setShowUndoToast(false);
    }, 6000);
  };

  // Undo deletion
  const handleUndoDelete = () => {
    if (deletedPerfSnapshot && onRestorePerformance) {
      onRestorePerformance(deletedPerfSnapshot);
      setDeletedPerfSnapshot(null);
      setShowUndoToast(false);
    }
  };

  // Batch selection methods
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredList.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size >= performances.length) {
      alert('Você não pode excluir todos os timbres da biblioteca. Pelo menos 1 deve permanecer.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} timbres selecionados?`)) {
      if (onBatchDeletePerformances) {
        onBatchDeletePerformances(Array.from(selectedIds));
      } else {
        selectedIds.forEach(id => onDeletePerformance(id));
      }
      setSelectedIds(new Set());
      setIsBatchMode(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
      {/* Top Search, Filter & Quick Actions Bar */}
      <div className="p-4 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Search & Bank Selector */}
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, categoria ou instrumento (ex: CFX, DX, AN-X)..."
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Bank Filter Tabs */}
          <div className="flex items-center p-0.5 bg-neutral-950 rounded-lg border border-neutral-800 text-xs shrink-0">
            {(['ALL', 'USER', 'PRESET'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBankFilter(b)}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  bankFilter === b
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {b === 'ALL' ? 'Todos' : b === 'USER' ? 'User Bank' : 'Preset Bank'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Librarian Batch Actions & Quick Tools */}
        <div className="flex items-center gap-2">
          {/* Batch Mode Toggle */}
          <button
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              setSelectedIds(new Set());
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isBatchMode
                ? 'bg-rose-950/60 text-rose-300 border-rose-700/60 shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            }`}
            title="Ativar seleção múltipla para exclusão em lote de timbres"
          >
            {isBatchMode ? <CheckSquare className="w-3.5 h-3.5 text-rose-400" /> : <SquareOutline className="w-3.5 h-3.5" />}
            <span>{isBatchMode ? 'Cancelar Seleção' : 'Exclusão em Lote'}</span>
          </button>

          <button
            onClick={onCreatePerformance}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold text-xs shadow-md shadow-cyan-950/40 transition-all"
            title="Criar uma nova performance em branco"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Timbre</span>
          </button>

          <button
            onClick={onOpenSplitWizard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
            title="Assistente de divisão de teclado (Key Split)"
          >
            <Split className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            onClick={onOpenLayerWizard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
            title="Adicionar camada de som (Layer)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Layer</span>
          </button>

          <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

          <button
            onClick={onExportLibrary}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title="Exportar biblioteca de patches (.json / backup)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onImportLibrary}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
            title="Importar biblioteca de patches"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audition Mode Bar & Category Filter */}
      <div className="px-4 py-2 bg-neutral-900/40 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Category Filter Horizontal Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-[280px]">
          <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mr-1 shrink-0">
            Categoria:
          </span>
          {ALL_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Quick Audition Settings Controls */}
        <div className="flex items-center gap-3 shrink-0 pl-3 border-l border-neutral-800">
          {/* Auto Audition Checkbox */}
          <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer text-xs select-none hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={autoAudition}
              onChange={(e) => setAutoAudition(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span>Auto-Ouvir ao Clicar</span>
          </label>

          {/* Pattern Style Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-[11px]">
            <Music className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-neutral-500 mr-1">Riff:</span>
            <select
              value={auditionPattern}
              onChange={(e) => setAuditionPattern(e.target.value as any)}
              className="bg-transparent text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="auto">Auto (Por Instrumento)</option>
              <option value="arpeggio">Arpejo Brilhante</option>
              <option value="chord">Acorde Sustentado</option>
              <option value="lead">Solo / Frase Lead</option>
              <option value="bass">Linha de Baixo</option>
            </select>
          </div>

          <span className="text-[11px] font-mono text-neutral-500 hidden xl:inline">
            [Espaço] = Ouvir · [Del] = Excluir
          </span>
        </div>
      </div>

      {/* Batch Operations Bar (when isBatchMode is active) */}
      {isBatchMode && (
        <div className="px-6 py-2.5 bg-rose-950/40 border-b border-rose-900/60 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-rose-200">
              {selectedIds.size} {selectedIds.size === 1 ? 'timbre selecionado' : 'timbres selecionados'} para exclusão
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-700"
              >
                Selecionar Todos ({filteredList.length})
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-700"
              >
                Desmarcar
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmBatchDelete}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedIds.size > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/50'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir {selectedIds.size} Selecionados</span>
            </button>
          </div>
        </div>
      )}

      {/* Performances Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredList.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
            <FolderOpen className="w-10 h-10 text-neutral-600 mb-3" />
            <h4 className="text-sm font-semibold text-neutral-300">Nenhum Timbre Encontrado</h4>
            <p className="text-xs text-neutral-500 max-w-sm mt-1">
              Nenhuma performance corresponde aos filtros de busca atuais. Tente limpar os filtros ou criar uma nova.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setBankFilter('ALL'); }}
              className="mt-4 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-cyan-400 font-medium"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredList.map((perf) => {
              const isActive = perf.id === activePerformanceId;
              const isPlaying = auditioningId === perf.id;
              const isChecked = selectedIds.has(perf.id);
              const engines = Array.from(new Set(perf.parts.map(p => p.engineType)));

              return (
                <div
                  key={perf.id}
                  onClick={() => handleSelectCard(perf)}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 border-cyan-500/60 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                      : 'bg-neutral-900/40 hover:bg-neutral-900/80 border-neutral-800/80 hover:border-neutral-700'
                  } ${isChecked ? 'ring-2 ring-rose-500/70 bg-rose-950/15' : ''}`}
                >
                  {/* Top row: Name & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    {/* Batch Checkbox or Icon */}
                    {isBatchMode && (
                      <div className="pt-0.5 pr-1 shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => { e.stopPropagation(); toggleSelectId(perf.id); }}
                          className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {editingId === perf.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleSaveRename(perf.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(perf.id)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-0.5 bg-neutral-950 border border-cyan-500 rounded text-sm font-bold text-white focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-bold truncate tracking-tight transition-colors ${
                            isPlaying ? 'text-cyan-400 font-extrabold' : 'text-white group-hover:text-cyan-300'
                          }`}>
                            {perf.name}
                          </h3>
                          {perf.liveSetSlot && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 shrink-0">
                              {perf.liveSetSlot}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                        <span className="font-medium text-neutral-300">{perf.category}</span>
                        <span>·</span>
                        <span className="truncate">{perf.subCategory}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleToggleFavorite(perf, e)}
                        className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
                        title={perf.favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                      >
                        <Star className={`w-4 h-4 ${perf.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Fast Delete Button right at the top right */}
                      {performances.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteSingle(perf, e)}
                          className="p-1 rounded text-neutral-600 hover:text-rose-400 hover:bg-neutral-800/80 transition-colors"
                          title="Excluir timbre imediatamente (com desfazer disponível)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle row: Synthesis Engines & Parts Overview */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      {engines.map(eng => (
                        <span
                          key={eng}
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            eng === 'AWM2'
                              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/40'
                              : eng === 'FM-X'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {eng}
                        </span>
                      ))}
                      <span className="text-[11px] font-mono text-neutral-500 ml-1">
                        {perf.parts.length} {perf.parts.length === 1 ? 'parte' : 'partes'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-neutral-400 tabular-nums">
                      {perf.tempo} BPM
                    </div>
                  </div>

                  {/* Bottom Actions: Audition Play/Stop & Management */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/40 text-xs">
                    {/* Primary Audition Button */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleToggleAudition(perf, e)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${
                          isPlaying
                            ? 'bg-cyan-500 text-neutral-950 shadow-cyan-500/40 animate-pulse'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-cyan-400 border border-neutral-700'
                        }`}
                        title={isPlaying ? 'Parar audição de timbre' : 'Ouvir demonstração deste timbre agora'}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-neutral-950" />
                            <span>Parar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                            <span>Ouvir</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => handleStartRename(perf, e)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                        title="Renomear performance"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicatePerformance(perf); }}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                        title="Duplicar performance"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fast Delete Button at bottom bar */}
                    {performances.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteSingle(perf, e)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Excluir este timbre"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Undo Notification Toast */}
      {showUndoToast && deletedPerfSnapshot && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 border border-neutral-700 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 text-xs animate-slideUp">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span className="text-neutral-200">
              Timbre <strong className="text-white font-bold">"{deletedPerfSnapshot.name}"</strong> excluído.
            </span>
          </div>

          <button
            onClick={handleUndoDelete}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold rounded-lg transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Desfazer</span>
          </button>
        </div>
      )}
    </div>
  );
};
