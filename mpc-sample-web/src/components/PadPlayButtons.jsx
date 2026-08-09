import { useProjectState, useCurrentPad } from '../state/ProjectContext';
import { PAD_GRID_MODES } from '../state/uiReducer';
import { usePadActions } from '../state/usePadActions';
import { padKey } from '../state/projectReducer';
import { SIXTEEN_LEVEL_TYPES } from '../data/constants';
import Btn from './Btn';

export default function PadPlayButtons() {
  const { project, dispatchProject, ui, dispatchUi } = useProjectState();
  const pad = useCurrentPad();
  const { runChop } = usePadActions();
  const bank = project.currentPadBank;
  const padNum = project.currentPad;

  function patchPad(patch) {
    dispatchProject({ type: 'UPDATE_PAD', bank, pad: padNum, patch });
  }

  function toggleChop() {
    if (ui.padGridMode === PAD_GRID_MODES.CHOP) {
      dispatchUi({ type: 'SET_PAD_GRID_MODE', mode: PAD_GRID_MODES.CHOP });
      return;
    }
    dispatchUi({ type: 'SET_PAD_GRID_MODE', mode: PAD_GRID_MODES.CHOP });
    if (!pad.chop.slices.length) runChop(bank, padNum, 'Threshold');
  }

  function toggleNoteOn() {
    patchPad({ noteOn: !pad.noteOn });
  }

  function toggleLoop() {
    patchPad({ loop: !pad.loop });
  }

  function toggleReverse() {
    patchPad({ reverse: !pad.reverse });
  }

  function toggleMuteMode() {
    dispatchUi({ type: 'SET_PAD_GRID_MODE', mode: PAD_GRID_MODES.MUTE });
  }

  function unmuteAll() {
    for (let p = 1; p <= 16; p++) {
      const key = padKey(bank, p);
      if (project.pads[key].muted) {
        dispatchProject({ type: 'UPDATE_PAD', bank, pad: p, patch: { muted: false } });
      }
    }
  }

  function toggle16Levels() {
    dispatchUi({ type: 'SET_PAD_GRID_MODE', mode: PAD_GRID_MODES.SIXTEEN_LEVELS });
    patchPad({ sixteenLevels: { ...pad.sixteenLevels, active: !pad.sixteenLevels.active } });
  }

  function cycle16LevelsType() {
    const idx = SIXTEEN_LEVEL_TYPES.indexOf(pad.sixteenLevels.type);
    patchPad({ sixteenLevels: { ...pad.sixteenLevels, type: SIXTEEN_LEVEL_TYPES[(idx + 1) % SIXTEEN_LEVEL_TYPES.length] } });
  }

  return (
    <div>
      <div className="section-label">Pad Play</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
      <Btn
        label="Chop"
        shiftLabel="Note On"
        variant="blue"
        active={ui.padGridMode === PAD_GRID_MODES.CHOP}
        shiftActive={pad.noteOn}
        onClick={() => (ui.shiftHeld ? toggleNoteOn() : toggleChop())}
      />
      <Btn
        label="Mute"
        shiftLabel="Unmute All"
        variant="blue"
        active={ui.padGridMode === PAD_GRID_MODES.MUTE}
        onClick={() => (ui.shiftHeld ? unmuteAll() : toggleMuteMode())}
      />
      <Btn
        label="Loop"
        shiftLabel="Reverse"
        variant="blue"
        active={pad.loop}
        shiftActive={pad.reverse}
        onClick={() => (ui.shiftHeld ? toggleReverse() : toggleLoop())}
      />
      <Btn
        label="16 Levels"
        shiftLabel="Type"
        variant="blue"
        active={pad.sixteenLevels.active}
        onClick={() => (ui.shiftHeld ? cycle16LevelsType() : toggle16Levels())}
      />
    </div>
    </div>
  );
}
