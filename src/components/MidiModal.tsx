import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle, 
  Terminal, 
  Send,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { MidiDevice, MidiLogEntry, SynthTarget } from '../types/synth';
import { midiService } from '../services/midiService';

interface MidiModalProps {
  currentTarget: SynthTarget;
  onClose: () => void;
}

export const MidiModal: React.FC<MidiModalProps> = ({ currentTarget, onClose }) => {
  const [inputs, setInputs] = useState<MidiDevice[]>(midiService.getInputs());
  const [outputs, setOutputs] = useState<MidiDevice[]>(midiService.getOutputs());
  const [selectedInputId, setSelectedInputId] = useState<string | null>(midiService.getSelectedInputId());
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(midiService.getSelectedOutputId());
  const [logs, setLogs] = useState<MidiLogEntry[]>(midiService.getLogs());
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    const unsubDevices = midiService.subscribeDeviceChange((ins, outs) => {
      setInputs(ins);
      setOutputs(outs);
    });

    const unsubLogs = midiService.subscribeLogs(() => {
      setLogs([...midiService.getLogs()]);
    });

    return () => {
      unsubDevices();
      unsubLogs();
    };
  }, []);

  const handleSelectInput = (id: string) => {
    setSelectedInputId(id);
    midiService.selectInput(id);
  };

  const handleSelectOutput = (id: string) => {
    setSelectedOutputId(id);
    midiService.selectOutput(id);
  };

  const handleTestPing = () => {
    midiService.sendSuperKnob(64, currentTarget);
  };

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.direction === 'OUT' ? '>>>' : '<<<'} [${l.type}] ${l.bytes} -- ${l.description}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter(l => {
    if (filterType === 'ALL') return true;
    return l.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-800/40 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Web MIDI & Monitor SysEx em Tempo Real
              </h3>
              <p className="text-xs text-neutral-400">
                Comunicação bidirecional com Yamaha MONTAGE, MODX e plugin MONTAGE ESP via DAW/loopback.
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

        {/* Port Configuration Section */}
        <div className="p-6 bg-neutral-900/60 border-b border-neutral-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MIDI Output (To Synth / ESP) */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Porta MIDI Out (Para Hardware / Montage ESP)
              </label>
              {outputs.length > 0 ? (
                <select
                  value={selectedOutputId || ''}
                  onChange={(e) => handleSelectOutput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {outputs.map(out => (
                    <option key={out.id} value={out.id}>
                      {out.name} ({out.manufacturer})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-400">
                  Nenhuma porta física detectada. Modo <strong className="text-emerald-400">Virtual / Simulação Ativa</strong> (sintetizador integrado reproduzindo som).
                </div>
              )}
            </div>

            {/* MIDI Input (From Synth / Master Controller) */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Porta MIDI In (Teclado Controlador / Entrada)
              </label>
              {inputs.length > 0 ? (
                <select
                  value={selectedInputId || ''}
                  onChange={(e) => handleSelectInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {inputs.map(inp => (
                    <option key={inp.id} value={inp.id}>
                      {inp.name} ({inp.manufacturer})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-400">
                  Teclado virtual na tela e teclas do computador [A..K] habilitados.
                </div>
              )}
            </div>
          </div>

          {/* Quick connection test buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestPing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 border border-neutral-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>Enviar Teste SysEx (Super Knob)</span>
              </button>
              <button
                onClick={() => midiService.sendPanic()}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-rose-400 border border-neutral-700 transition-colors"
              >
                All Notes Off (Panic)
              </button>
            </div>

            <div className="text-[11px] font-mono text-neutral-400">
              Alvo SysEx: <strong className="text-cyan-400">{currentTarget}</strong>
            </div>
          </div>
        </div>

        {/* SysEx Log Monitor */}
        <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
          {/* Monitor Toolbar */}
          <div className="px-6 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Console de Mensagens e Bytes SysEx</span>
              <span className="text-[10px] font-mono text-neutral-400">({logs.length} eventos)</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter */}
              <div className="flex items-center gap-1 text-[11px]">
                {['ALL', 'SYSEX', 'CC', 'NOTE_ON'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2 py-0.5 rounded font-mono ${
                      filterType === t
                        ? 'bg-neutral-800 text-cyan-400'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="h-3 w-[1px] bg-neutral-800 mx-1" />

              <button
                onClick={handleCopyLogs}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium text-neutral-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <button
                onClick={() => midiService.clearLogs()}
                className="p-1 rounded text-neutral-400 hover:text-rose-400"
                title="Limpar logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Log Stream */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 scrollbar-thin">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-xs font-sans">
                Nenhuma mensagem MIDI registrada ainda. Mova um fader, o Super Knob ou toque no teclado para inspecionar os bytes.
              </div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-neutral-900/60 transition-colors border-b border-neutral-900/50"
                >
                  <span className="text-neutral-500 shrink-0">{log.timestamp}</span>

                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                    log.direction === 'OUT'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                  }`}>
                    {log.direction}
                  </span>

                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0 ${
                    log.type === 'SYSEX'
                      ? 'bg-amber-950 text-amber-400'
                      : log.type === 'CC'
                      ? 'bg-blue-950 text-blue-400'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {log.type}
                  </span>

                  <span className="text-cyan-300 font-bold shrink-0 select-all">
                    {log.bytes}
                  </span>

                  <span className="text-neutral-400 truncate flex-1">
                    {log.description}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Driver MIDI Yamaha & Softsynth Montage ESP prontos para transmissão em tempo real.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
