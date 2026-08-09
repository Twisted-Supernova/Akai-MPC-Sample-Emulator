import { useEffect, useRef } from 'react';
import { useProjectState } from '../state/ProjectContext';
import { KEYBOARD_PAD_MAP } from '../data/constants';
import { usePadActions } from '../state/usePadActions';
import { useShiftActions } from '../state/useShiftActions';
import { useFaderBinding } from '../state/useFaderBinding';
import { useKnobFxSync } from '../state/useKnobFxSync';
import { useCompressorSync } from '../state/useCompressorSync';
import TopStrip from './TopStrip';
import Knobs from './Knobs';
import ModeButtons from './ModeButtons';
import PadPlayButtons from './PadPlayButtons';
import PadGrid from './PadGrid';
import Fader from './Fader';
import TransportBar from './TransportBar';
import { ShiftPadBankCluster, SampleSelectTapTempoCluster, EraseNoteRepeatCluster, EncoderCluster, UndoRedoCluster } from './UtilityClusters';
import './Chassis.css';

export default function Chassis() {
  const { project, ui, dispatchUi, engine } = useProjectState();
  const { handlePadDown, handlePadUp } = usePadActions();
  const runShiftPadAction = useShiftActions();
  const faderBinding = useFaderBinding();
  useKnobFxSync();
  useCompressorSync();
  const heldKeysRef = useRef(new Set());

  useEffect(() => {
    function resumeAudio() {
      engine.resume();
    }
    window.addEventListener('pointerdown', resumeAudio, { once: true });
    return () => window.removeEventListener('pointerdown', resumeAudio);
  }, [engine]);

  useEffect(() => {
    engine.ensureContext();
    engine.setKitVolume(project.kitVolume);
  }, [project.kitVolume, engine]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.repeat) return;
      if (e.key === 'Shift') {
        dispatchUi({ type: 'SET_SHIFT', held: true });
        return;
      }
      const padNum = KEYBOARD_PAD_MAP[e.key.toLowerCase()];
      if (padNum && !heldKeysRef.current.has(e.key)) {
        heldKeysRef.current.add(e.key);
        if (ui.shiftHeld) {
          runShiftPadAction(padNum);
          return;
        }
        dispatchUi({ type: 'ADD_HELD_PAD', pad: padNum });
        handlePadDown(padNum, e);
      }
    }
    function onKeyUp(e) {
      if (e.key === 'Shift') {
        dispatchUi({ type: 'SET_SHIFT', held: false });
        return;
      }
      const padNum = KEYBOARD_PAD_MAP[e.key.toLowerCase()];
      if (padNum) {
        heldKeysRef.current.delete(e.key);
        dispatchUi({ type: 'REMOVE_HELD_PAD', pad: padNum });
        handlePadUp(padNum);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [dispatchUi, handlePadDown, handlePadUp, runShiftPadAction, ui.shiftHeld]);

  return (
    <div className="chassis-outer">
      <div className="chassis">
        <TopStrip />

        <Knobs />

        <div className="chassis__controls-row">
          <div className="chassis__cluster chassis__cluster--narrow">
            <EraseNoteRepeatCluster />
          </div>

          <Fader value={faderBinding.value} onChange={faderBinding.onChange} />

          <div className="chassis__cluster">
            <ModeButtons />
            <ShiftPadBankCluster />
          </div>

          <div className="chassis__cluster">
            <PadPlayButtons />
            <SampleSelectTapTempoCluster />
          </div>

          <div className="chassis__cluster chassis__cluster--right">
            <EncoderCluster />
            <UndoRedoCluster />
          </div>

          <TransportBar />
        </div>

        <PadGrid />

        <div className="chassis__base-lip">MPC SAMPLE</div>
      </div>

      {ui.lastError ? (
        <div className="chassis__toast" onClick={() => dispatchUi({ type: 'SET_ERROR', message: null })}>
          {ui.lastError}
        </div>
      ) : null}
    </div>
  );
}
