import { PAD_GRID_LAYOUT, PAD_SHIFT_FUNCTIONS } from '../data/constants';
import { useProjectState } from '../state/ProjectContext';
import { MODES, PAD_GRID_MODES } from '../state/uiReducer';
import { usePadActions } from '../state/usePadActions';
import { useShiftActions } from '../state/useShiftActions';
import { padKey, seqKey } from '../state/projectReducer';
import './PadGrid.css';

export default function PadGrid() {
  const { ui, dispatchUi } = useProjectState();
  const { handlePadDown, handlePadUp } = usePadActions();
  const runShiftPadAction = useShiftActions();

  function onDown(padNum, e) {
    e.preventDefault();
    if (ui.shiftHeld) {
      runShiftPadAction(padNum);
      return;
    }
    dispatchUi({ type: 'ADD_HELD_PAD', pad: padNum });
    handlePadDown(padNum, e.nativeEvent ?? e);
  }

  function onUp(padNum) {
    dispatchUi({ type: 'REMOVE_HELD_PAD', pad: padNum });
    handlePadUp(padNum);
  }

  return (
    <div className="pad-grid">
      {PAD_GRID_LAYOUT.map((row, ri) => (
        <div className="pad-grid__row" key={ri}>
          {row.map((padNum) => (
            <Pad
              key={padNum}
              padNum={padNum}
              held={ui.heldPads.includes(padNum)}
              onDown={(e) => onDown(padNum, e)}
              onUp={() => onUp(padNum)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Pad({ padNum, held, onDown, onUp }) {
  const { project, ui } = useProjectState();
  const shiftFn = PAD_SHIFT_FUNCTIONS[padNum];

  let stateClass = 'pad--off';
  let content = null;

  if (ui.mode === MODES.SEQUENCE) {
    const key = seqKey(project.currentSeqBank, padNum);
    const seq = project.sequences[key];
    const hasEvents = seq.events.length > 0;
    const isCurrent = project.currentSeq === padNum;
    if (isCurrent && ui.playing) stateClass = 'pad--seq-playing';
    else if (isCurrent) stateClass = 'pad--seq-current';
    else if (hasEvents) stateClass = 'pad--seq-has-events';
    else stateClass = 'pad--seq-empty';
    content = <span className="pad__seq-name">{seq.name.replace(/^Seq /, '')}</span>;
  } else if (ui.mode === MODES.PAD_FX) {
    const isActive = !!project.padFx.active[padNum];
    const isLatched = project.padFx.latchOrder.includes(padNum);
    stateClass = isLatched ? 'pad--fx-latched' : isActive ? 'pad--fx-active' : 'pad--fx-idle';
  } else if (ui.mode === MODES.KNOB_FX) {
    const bank = project.currentPadBank;
    const affected = project.knobFx.affectedPads[`${bank}-${padNum}`];
    stateClass = affected ? 'pad--knobfx-affected' : 'pad--knobfx-idle';
  } else {
    const bank = project.currentPadBank;
    const pad = project.pads[padKey(bank, padNum)];
    if (ui.padGridMode === PAD_GRID_MODES.MUTE) {
      stateClass = pad.sampleId ? (pad.muted ? 'pad--muted' : 'pad--unmuted') : 'pad--off';
    } else if (ui.padGridMode === PAD_GRID_MODES.CHOP) {
      const hasSlice = pad.chop.slices[padNum - 1];
      stateClass = hasSlice ? (pad.chop.selectedSlice === padNum - 1 ? 'pad--chop-selected' : 'pad--chop-has') : 'pad--off';
    } else if (pad.sampleId) {
      stateClass = held ? 'pad--triggered' : project.currentPad === padNum ? 'pad--loaded-selected' : 'pad--loaded';
    }
  }

  return (
    <div className="pad-cell">
      <button
        type="button"
        className={`pad ${stateClass} ${held ? 'pad--held' : ''}`}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <span className="pad__number">{padNum}</span>
        {content}
      </button>
      {shiftFn ? <div className={`pad__shift-label ${ui.shiftHeld ? 'pad__shift-label--active' : ''}`}>{shiftFn.label}</div> : null}
    </div>
  );
}
