import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Music, Disc } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';
import { midiService } from '../services/midiService';
import { Performance } from '../types/synth';

interface VirtualKeyboardProps {
  performance: Performance;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ performance }) => {
  const [octaveOffset, setOctaveOffset] = useState(0); // 0 = C3 to B4 base
  const [sustainActive, setSustainActive] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [modWheelVal, setModWheelVal] = useState(0);
  const [pitchBendVal, setPitchBendVal] = useState(64); // 64 center

  const playNote = useCallback((midiNote: number, velocity: number = 100) => {
    setActiveNotes(prev => new Set(prev).add(midiNote));
    audioSynth.triggerNoteOn(midiNote, velocity);
    midiService.sendNoteOn(midiNote, velocity);
  }, []);

  const releaseNote = useCallback((midiNote: number) => {
    if (!sustainActive) {
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(midiNote);
        return next;
      });
      audioSynth.triggerNoteOff(midiNote);
      midiService.sendNoteOff(midiNote);
    }
  }, [sustainActive]);

  const toggleSustain = () => {
    const next = !sustainActive;
    setSustainActive(next);
    if (!next) {
      // Release currently held notes
      activeNotes.forEach(n => {
        audioSynth.triggerNoteOff(n);
        midiService.sendNoteOff(n);
      });
      setActiveNotes(new Set());
    }
  };

  // Keyboard mapping (QWERTY piano)
  useEffect(() => {
    const keyMap: Record<string, number> = {
      'a': 60, // C4
      'w': 61, // C#4
      's': 62, // D4
      'e': 63, // D#4
      'd': 64, // E4
      'f': 65, // F4
      't': 66, // F#4
      'g': 67, // G4
      'y': 68, // G#4
      'h': 69, // A4
      'u': 70, // A#4
      'j': 71, // B4
      'k': 72, // C5
      'o': 73, // C#5
      'l': 74, // D5
      'p': 75, // D#5
      ';': 76  // E5
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (key in keyMap) {
        const note = keyMap[key] + octaveOffset * 12;
        playNote(note, 105);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key in keyMap) {
        const note = keyMap[key] + octaveOffset * 12;
        releaseNote(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [octaveOffset, playNote, releaseNote]);

  // 2 Octaves on screen (25 keys: C to C)
  const baseNote = 48 + octaveOffset * 12; // C3 + offset
  const keysCount = 25;

  const isBlackKey = (noteNum: number) => {
    const pitch = noteNum % 12;
    return [1, 3, 6, 8, 10].includes(pitch);
  };

  const getNoteName = (noteNum: number) => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const oct = Math.floor(noteNum / 12) - 1;
    return `${names[noteNum % 12]}${oct}`;
  };

  // Find which parts cover this note
  const getCoveringParts = (note: number) => {
    return performance.parts.filter(p => p.enabled && note >= p.keyRange.lowNote && note <= p.keyRange.highNote);
  };

  return (
    <div className="bg-neutral-900 border-t border-neutral-800 p-3 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* Left: Octave & Wheels & Sustain */}
      <div className="flex items-center gap-4">
        {/* Octave Controls */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          <span className="text-[10px] text-neutral-400 font-mono uppercase px-1">Oitava:</span>
          {[-2, -1, 0, 1, 2].map((oct) => (
            <button
              key={oct}
              onClick={() => setOctaveOffset(oct)}
              className={`w-6 h-6 text-xs font-mono font-bold rounded transition-colors ${
                octaveOffset === oct
                  ? 'bg-cyan-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {oct > 0 ? `+${oct}` : oct}
            </button>
          ))}
        </div>

        {/* Sustain Pedal Toggle */}
        <button
          onClick={toggleSustain}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
            sustainActive
              ? 'bg-amber-500 text-neutral-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700'
          }`}
          title="Pedal de Sustain: Mantém as notas tocando"
        >
          SUSTAIN {sustainActive ? 'ON' : 'OFF'}
        </button>

        {/* Pitch Bend / Mod Wheel */}
        <div className="hidden md:flex items-center gap-3 pl-3 border-l border-neutral-800 text-[10px] font-mono">
          <div>
            <span className="text-neutral-400 block mb-0.5">PITCH</span>
            <input
              type="range"
              min="0"
              max="127"
              value={pitchBendVal}
              onChange={(e) => setPitchBendVal(parseInt(e.target.value))}
              onMouseUp={() => setPitchBendVal(64)}
              className="w-16 accent-cyan-500 cursor-pointer"
            />
          </div>
          <div>
            <span className="text-neutral-400 block mb-0.5">MOD</span>
            <input
              type="range"
              min="0"
              max="127"
              value={modWheelVal}
              onChange={(e) => setModWheelVal(parseInt(e.target.value))}
              className="w-16 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Center: The Piano Keybed */}
      <div className="flex-1 max-w-2xl h-24 relative flex justify-center mx-auto overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 p-1">
        {/* Render White Keys first */}
        <div className="flex w-full h-full">
          {Array.from({ length: keysCount }).map((_, i) => {
            const noteNum = baseNote + i;
            if (isBlackKey(noteNum)) return null;

            const isDown = activeNotes.has(noteNum);
            const partsCovering = getCoveringParts(noteNum);
            const hasSplit = partsCovering.length > 0;

            return (
              <div
                key={noteNum}
                onMouseDown={() => playNote(noteNum, 110)}
                onMouseUp={() => releaseNote(noteNum)}
                onMouseEnter={(e) => e.buttons === 1 && playNote(noteNum, 100)}
                onMouseLeave={() => releaseNote(noteNum)}
                className={`flex-1 h-full rounded-b transition-colors relative cursor-pointer border-r border-neutral-400 last:border-r-0 flex flex-col justify-end items-center pb-1 ${
                  isDown
                    ? 'bg-cyan-300 shadow-inner'
                    : 'bg-white hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                {/* Key split zone indicator line at base */}
                {hasSplit && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-1.5 ${
                      partsCovering[0]?.engineType === 'AWM2'
                        ? 'bg-cyan-500'
                        : partsCovering[0]?.engineType === 'FM-X'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                )}
                {/* Note name on C keys */}
                {noteNum % 12 === 0 && (
                  <span className="text-[9px] font-mono font-bold text-neutral-600 pointer-events-none">
                    {getNoteName(noteNum)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Black keys overlaid on top */}
        <div className="absolute inset-0 flex pointer-events-none px-1">
          {Array.from({ length: keysCount }).map((_, i) => {
            const noteNum = baseNote + i;
            if (!isBlackKey(noteNum)) {
              // Invisible spacer for white keys
              return <div key={noteNum} className="flex-1" />;
            }

            const isDown = activeNotes.has(noteNum);

            return (
              <div
                key={noteNum}
                className="relative -mx-2.5 w-5 h-14 z-10 pointer-events-auto"
                onMouseDown={(e) => { e.stopPropagation(); playNote(noteNum, 115); }}
                onMouseUp={(e) => { e.stopPropagation(); releaseNote(noteNum); }}
                onMouseEnter={(e) => e.buttons === 1 && playNote(noteNum, 105)}
                onMouseLeave={() => releaseNote(noteNum)}
              >
                <div
                  className={`w-full h-full rounded-b cursor-pointer transition-colors border border-black shadow-md ${
                    isDown
                      ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]'
                      : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Keybed Helper Hint */}
      <div className="hidden lg:block text-right text-[10px] text-neutral-400 font-mono">
        <div>Teclado do PC: [A..K]</div>
        <div className="text-neutral-500">MIDI In / USB Ativo</div>
      </div>
    </div>
  );
};
