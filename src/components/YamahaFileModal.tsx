import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileBox, 
  Trash2, 
  Play, 
  Square,
  Edit3, 
  Check, 
  CheckSquare, 
  Square as SquareOutline, 
  Download, 
  Upload, 
  Search, 
  ArrowRight, 
  FileText, 
  Sparkles,
  Layers,
  Save,
  Plus
} from 'lucide-react';
import { Performance, Category, SynthTarget } from '../types/synth';
import { YamahaArchive, yamahaFileService } from '../services/yamahaFileService';
import { audioSynth } from '../services/audioSynth';
import { ALL_CATEGORIES } from '../data/presetPerformances';

interface YamahaFileModalProps {
  archive: YamahaArchive;
  currentTarget: SynthTarget;
  onImportSelectedToLibrary: (selectedPerformances: Performance[], replaceAll: boolean) => void;
  onClose: () => void;
}

export const YamahaFileModal: React.FC<YamahaFileModalProps> = ({
  archive: initialArchive,
  currentTarget,
  onImportSelectedToLibrary,
  onClose
}) => {
  const [archive, setArchive] = useState<YamahaArchive>(initialArchive);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialArchive.performances.map(p => p.id))
  );

  const [auditioningId, setAuditioningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [replaceAllMode, setReplaceAllMode] = useState<boolean>(false);

  // Filtered performances within the file
  const filteredPerformances = useMemo(() => {
    return archive.performances.filter(perf => {
      if (selectedCategory !== 'All' && perf.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = perf.name.toLowerCase().includes(q);
        const matchesCat = perf.category.toLowerCase().includes(q);
        const matchesParts = perf.parts.some(p => p.name.toLowerCase().includes(q) || p.engineType.toLowerCase().includes(q));
        if (!matchesName && !matchesCat && !matchesParts) return false;
      }
      return true;
    });
  }, [archive.performances, selectedCategory, searchQuery]);

  // Audition handling
  const handleToggleAudition = (perf: Performance, e: React.MouseEvent) => {
    e.stopPropagation();
    if (auditioningId === perf.id && audioSynth.isAuditionActive()) {
      audioSynth.stopAudition();
      setAuditioningId(null);
      return;
    }

    audioSynth.setPerformance(perf);
    setAuditioningId(perf.id);
    audioSynth.auditionPerformance('auto');
  };

  // Delete single performance from file
  const handleDeleteFromFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setArchive(prev => ({
      ...prev,
      performances: prev.performances.filter(p => p.id !== id)
    }));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Delete selected batch from file
  const handleDeleteSelectedFromFile = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Remover ${selectedIds.size} timbres selecionados deste arquivo?`)) {
      setArchive(prev => ({
        ...prev,
        performances: prev.performances.filter(p => !selectedIds.has(p.id))
      }));
      setSelectedIds(new Set());
    }
  };

  // Edit rename within file
  const handleStartRename = (perf: Performance, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(perf.id);
    setEditName(perf.name);
  };

  const handleSaveRename = (perfId: string) => {
    if (editName.trim()) {
      setArchive(prev => ({
        ...prev,
        performances: prev.performances.map(p => 
          p.id === perfId ? { ...p, name: editName.trim() } : p
        )
      }));
    }
    setEditingId(null);
  };

  // Checkbox toggle
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredPerformances.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Import to active library
  const handleImportToLibrary = () => {
    const toImport = archive.performances.filter(p => selectedIds.has(p.id));
    if (toImport.length === 0) {
      alert('Selecione pelo menos um timbre para importar.');
      return;
    }

    onImportSelectedToLibrary(toImport, replaceAllMode);
    onClose();
  };

  // Export cleaned binary Yamaha file (.X7U, .X7L, .X7A)
  const handleExportCleanFile = (format: 'X7U' | 'X7L' | 'X7A') => {
    const blob = yamahaFileService.exportYamahaBinary(archive, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = archive.filename.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_Limpo.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format badge colors
  const extBadgeColors: Record<string, string> = {
    X7U: 'bg-cyan-950 text-cyan-400 border-cyan-800/60',
    X7L: 'bg-amber-950 text-amber-400 border-amber-800/60',
    X7A: 'bg-purple-950 text-purple-400 border-purple-800/60',
    JSON: 'bg-neutral-800 text-neutral-300 border-neutral-700'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-md">
              <FileBox className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight truncate max-w-md">
                  {archive.filename}
                </h2>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${extBadgeColors[archive.extension] || extBadgeColors.JSON}`}>
                  .{archive.extension}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  ({(archive.fileSize / 1024).toFixed(1)} KB)
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {archive.headerInfo.description} · Selecione os timbres para audicionar, editar, deletar ou importar.
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

        {/* Toolbar: Search, Filters & Batch actions */}
        <div className="px-6 py-3 bg-neutral-900/80 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar timbres no arquivo..."
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Selection status */}
            <span className="text-xs text-neutral-400 font-medium">
              <strong className="text-white font-mono">{selectedIds.size}</strong> de {archive.performances.length} selecionados
            </span>
          </div>

          {/* Quick Select & Batch Delete Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-medium border border-neutral-700 transition-colors"
            >
              Marcar Todos
            </button>
            <button
              onClick={deselectAll}
              className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-medium border border-neutral-700 transition-colors"
            >
              Desmarcar
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelectedFromFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800/80 transition-colors"
                title="Excluir do arquivo os timbres selecionados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Deletar {selectedIds.size} do Arquivo</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Ribbon */}
        <div className="px-6 py-2 bg-neutral-950/50 border-b border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mr-2 shrink-0">
            Filtrar:
          </span>
          {ALL_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Performances List Inside File */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredPerformances.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-xs">
              Nenhum timbre encontrado no arquivo com os filtros selecionados.
            </div>
          ) : (
            filteredPerformances.map((perf, index) => {
              const isChecked = selectedIds.has(perf.id);
              const isPlaying = auditioningId === perf.id;
              const engines = Array.from(new Set(perf.parts.map(p => p.engineType)));

              return (
                <div
                  key={perf.id}
                  onClick={() => toggleSelect(perf.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-neutral-900/90 border-cyan-500/50 shadow-sm'
                      : 'bg-neutral-950/40 border-neutral-800/70 opacity-70 hover:opacity-100 hover:border-neutral-700'
                  }`}
                >
                  {/* Left: Checkbox & Name & Category */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(perf.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0"
                    />

                    <span className="text-xs font-mono text-neutral-500 w-6 shrink-0">
                      #{(index + 1).toString().padStart(2, '0')}
                    </span>

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
                          className="px-2 py-0.5 bg-neutral-950 border border-cyan-500 rounded text-xs font-bold text-white focus:outline-none"
                        />
                      ) : (
                        <h4 className="text-xs font-bold text-white truncate tracking-tight">
                          {perf.name}
                        </h4>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                        <span>{perf.category}</span>
                        <span>·</span>
                        <span className="truncate">{perf.subCategory}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Engines & Parts */}
                  <div className="flex items-center gap-2 shrink-0">
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
                    <span className="text-[11px] font-mono text-neutral-500">
                      {perf.parts.length}p
                    </span>
                  </div>

                  {/* Right: Actions (Audition, Rename, Delete from file) */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Audition Button */}
                    <button
                      onClick={(e) => handleToggleAudition(perf, e)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        isPlaying
                          ? 'bg-cyan-500 text-neutral-950 animate-pulse shadow-sm'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700'
                      }`}
                      title={isPlaying ? 'Parar prévia sonora' : 'Audicionar som deste timbre no sintetizador'}
                    >
                      {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      <span>{isPlaying ? 'Parar' : 'Ouvir'}</span>
                    </button>

                    {/* Rename Button */}
                    <button
                      onClick={(e) => handleStartRename(perf, e)}
                      className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      title="Renomear timbre no arquivo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete from file */}
                    <button
                      onClick={(e) => handleDeleteFromFile(perf.id, e)}
                      className="p-1.5 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                      title="Excluir este timbre do arquivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Options & Export Cleaned Binary */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replaceAllMode}
                onChange={(e) => setReplaceAllMode(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
              <span>Substituir biblioteca atual inteira (em vez de mesclar)</span>
            </label>

            {/* Export Cleaned Binary Button (.X7U, .X7L, .X7A) */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-neutral-800">
              <span className="text-xs text-neutral-400 font-medium">Exportar Arquivo Limpo:</span>
              {(['X7U', 'X7L', 'X7A'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => handleExportCleanFile(fmt)}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-bold text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
                  title={`Baixar arquivo .${fmt.toLowerCase()} atualizado com os timbres deletados removidos`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Import selected buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white"
            >
              Cancelar
            </button>

            <button
              onClick={handleImportToLibrary}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                selectedIds.size > 0
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-neutral-950 shadow-cyan-950/40'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Importar {selectedIds.size} Timbres para o Montage Studio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
