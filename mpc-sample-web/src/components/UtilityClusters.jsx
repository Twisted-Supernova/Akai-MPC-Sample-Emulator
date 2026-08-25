import { useState } from 'react';
import { useProjectState } from '../state/ProjectContext';
import { BANKS } from '../data/constants';
import Btn from './Btn';
import Encoder from './Encoder';
import { KNOB_FX_LIST } from '../data/constants';
import { audioBufferToWavBlob } from '../audio/wavEncoder';
import { downloadBlob } from '../audio/downloadBlob';

export function ShiftPadBankCluster() {
  const { project, dispatchProject, ui, dispatchUi } = useProjectState();

  function onShiftDown() {
    dispatchUi({ type: 'SET_SHIFT', held: true });
  }
  function onShiftUp() {
    dispatchUi({ type: 'SET_SHIFT', held: false });
  }

  function cycleBank() {
    const idx = BANKS.indexOf(project.currentPadBank);
    if (ui.shiftHeld) {
      dispatchProject({ type: 'SET_PAD_BANK', bank: BANKS[(idx - 1 + BANKS.length) % BANKS.length] });
    } else {
      dispatchProject({ type: 'SET_PAD_BANK', bank: BANKS[(idx + 1) % BANKS.length] });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Btn label="Shift" active={ui.shiftHeld} onMouseDown={onShiftDown} onMouseUp={onShiftUp} onMouseLeave={onShiftUp} />
      <Btn label="Pad Bank" shiftLabel="Prev Bank" onClick={cycleBank} />
    </div>
  );
}

export function SampleSelectTapTempoCluster() {
  const { project, dispatchProject, ui, dispatchUi, engine } = useProjectState();
  const [tapTimes, setTapTimes] = useState([]);

  function saveSample() {
    const pad = project.pads[`${project.currentPadBank}${String(project.currentPad).padStart(2, '0')}`];
    const entry = pad.sampleId ? engine.getBufferEntry(pad.sampleId) : null;
    if (!entry) return;
    downloadBlob(audioBufferToWavBlob(entry.buffer), `${entry.name || 'sample'}.wav`);
  }

  function toggleSampleSelect() {
    if (ui.shiftHeld) {
      saveSample();
      return;
    }
    dispatchUi({ type: 'TOGGLE_MENU', menu: 'sampleSelectOpen' });
  }

  function tapTempo() {
    const now = performance.now();
    const next = [...tapTimes, now].filter((t) => now - t < 3000).slice(-4);
    setTapTimes(next);
    if (next.length >= 2) {
      const intervals = next.slice(1).map((t, i) => t - next[i]);
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.min(300, Math.max(20, 60000 / avgMs));
      const seq = project.sequences[`${project.currentSeqBank}${String(project.currentSeq).padStart(2, '0')}`];
      if (seq?.bpmMode === 'SEQ') {
        dispatchProject({ type: 'UPDATE_SEQUENCE', bank: project.currentSeqBank, seq: project.currentSeq, patch: { bpm } });
      } else {
        dispatchProject({ type: 'SET_GLOBAL_BPM', bpm });
      }
    }
  }

  function cycleMetro() {
    const opts = ['Off', 'On', 'Record'];
    const idx = opts.indexOf(project.metronome);
    dispatchProject({ type: 'SET_METRONOME', value: opts[(idx + 1) % 3] });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Btn label="Sample Select" shiftLabel="Save Sample" active={ui.sampleSelectOpen} onClick={toggleSampleSelect} />
      <Btn label="Tap Tempo" shiftLabel="Metro" active={project.metronome !== 'Off'} onClick={() => (ui.shiftHeld ? cycleMetro() : tapTempo())} />
    </div>
  );
}

export function EraseNoteRepeatCluster() {
  const { ui, dispatchUi } = useProjectState();

  function onEraseDown() {
    dispatchUi({ type: 'SET_ERASE_ARMED', value: true });
  }
  function onEraseUp() {
    dispatchUi({ type: 'SET_ERASE_ARMED', value: false });
  }

  function toggleNoteRepeat() {
    dispatchUi({ type: 'SET_NOTE_REPEAT', patch: { active: !ui.noteRepeat.active } });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Btn label="Erase" shiftLabel="Copy" active={ui.eraseArmed} onMouseDown={onEraseDown} onMouseUp={onEraseUp} onMouseLeave={onEraseUp} />
      <Btn label="Note Repeat" shiftLabel="Triplet" active={ui.noteRepeat.active} onClick={toggleNoteRepeat} />
    </div>
  );
}

export function EncoderCluster() {
  const { project, dispatchProject, ui, dispatchUi } = useProjectState();

  function handleTurn(steps) {
    if (ui.fxSelectOpen) {
      const next = (project.knobFx.effectIndex + steps + KNOB_FX_LIST.length) % KNOB_FX_LIST.length;
      dispatchProject({ type: 'SET_KNOB_FX', patch: { effectIndex: next } });
    } else if (ui.mode === 'SEQUENCE' && !ui.playing) {
      dispatchUi({ type: 'SET_PLAYHEAD', tick: Math.max(0, ui.playheadTick + steps * 24) });
    }
  }

  function handlePress() {
    if (ui.fxSelectOpen) dispatchUi({ type: 'CLOSE_MENU', menu: 'fxSelectOpen' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 14 }} title="Built-in microphone">🎙</span>
      <Encoder onTurn={handleTurn} onPress={handlePress} />
    </div>
  );
}

export function UndoRedoCluster() {
  const { ui, undo, redo } = useProjectState();
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <Btn label="-" shiftLabel="Undo" small square onClick={() => (ui.shiftHeld ? undo() : undefined)} />
      <Btn label="+" shiftLabel="Redo" small square onClick={() => (ui.shiftHeld ? redo() : undefined)} />
    </div>
  );
}
