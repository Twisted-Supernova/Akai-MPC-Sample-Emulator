import { useRef } from 'react';
import { useProjectState } from '../state/ProjectContext';
import { usePlaybackEngine } from '../audio/usePlaybackEngine';
import { MODES } from '../state/uiReducer';
import { padKey } from '../state/projectReducer';
import Btn from './Btn';

export default function TransportBar() {
  const { project, dispatchProject, ui, dispatchUi, engine, registerSample } = useProjectState();
  const { play, stop, stopAllAudio, toggleSeqRecord } = usePlaybackEngine();
  const lastStopRef = useRef(0);

  function handlePlay() {
    if (ui.shiftHeld) {
      play(ui.playheadTick);
    } else {
      play(0);
    }
  }

  function handleStop() {
    const now = performance.now();
    if (now - lastStopRef.current < 350) {
      stopAllAudio();
    }
    lastStopRef.current = now;
    stop();
  }

  function handleSampleRecord() {
    if (ui.shiftHeld) {
      const snapshot = engine.getInputCaptureSnapshot?.(25);
      if (!snapshot) {
        dispatchUi({ type: 'SET_ERROR', message: 'Open Sample Record mode first to arm input capture, then Recall.' });
        return;
      }
      const bank = project.currentPadBank;
      const emptyPad = Array.from({ length: 16 }, (_, i) => i + 1).find((p) => !project.pads[padKey(bank, p)].sampleId);
      if (!emptyPad) return;
      const entry = engine.registerBuffer(snapshot, `Recall-${bank}${String(emptyPad).padStart(2, '0')}`);
      registerSample(entry);
      dispatchProject({ type: 'LOAD_SAMPLE_TO_PAD', bank, pad: emptyPad, sampleId: entry.id, name: entry.name });
      return;
    }
    dispatchUi({ type: 'SET_MODE', mode: MODES.SAMPLE_RECORD });
  }

  function handleSeqRecord() {
    if (ui.shiftHeld) {
      // Recall Recording: pull events from the last loop into the sequence (already recorded
      // live during playback, so this is a no-op safety net in this implementation - events are
      // captured directly as they're played, matching the manual's "last loop" semantics).
      return;
    }
    toggleSeqRecord();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Btn label="Sample Record" shiftLabel="Recall" variant="grey" accentBar active={ui.mode === MODES.SAMPLE_RECORD} onClick={handleSampleRecord} />
      <Btn label="Seq Record" shiftLabel="Recall" variant="grey" accentBar active={ui.recordingSeq} onClick={handleSeqRecord} />
      <Btn label="Stop" variant="transport" onClick={handleStop} />
      <Btn label="Play" shiftLabel="Continue" variant="transport" active={ui.playing} onClick={handlePlay} />
    </div>
  );
}
