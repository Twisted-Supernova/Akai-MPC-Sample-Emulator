import { useProjectState } from '../state/ProjectContext';
import { MODES } from '../state/uiReducer';
import Btn from './Btn';

export default function ModeButtons() {
  const { ui, dispatchUi } = useProjectState();

  function setMode(mode) {
    dispatchUi({ type: 'CLOSE_ALL_MENUS' });
    dispatchUi({ type: 'SET_MODE', mode });
  }

  function toggleShiftMenu(menu) {
    dispatchUi({ type: 'TOGGLE_MENU', menu });
  }

  return (
    <div>
      <div className="section-label">Mode</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
      <Btn
        label="Sample"
        shiftLabel="Input Config"
        variant="grey"
        active={ui.mode === MODES.SAMPLE}
        shiftActive={ui.inputConfigOpen}
        onClick={() => (ui.shiftHeld ? toggleShiftMenu('inputConfigOpen') : setMode(MODES.SAMPLE))}
      />
      <Btn
        label="Seq"
        shiftLabel="Step Edit"
        variant="grey"
        active={ui.mode === MODES.SEQUENCE}
        shiftActive={ui.stepEditOpen}
        onClick={() => (ui.shiftHeld ? toggleShiftMenu('stepEditOpen') : setMode(MODES.SEQUENCE))}
      />
      <Btn
        label="Pad FX"
        shiftLabel="Flex Beat"
        variant="orange"
        active={ui.mode === MODES.PAD_FX}
        shiftActive={ui.flexBeatOpen}
        onClick={() => (ui.shiftHeld ? toggleShiftMenu('flexBeatOpen') : setMode(MODES.PAD_FX))}
      />
      <Btn
        label="Knob FX"
        shiftLabel="FX Select"
        variant="orange"
        active={ui.mode === MODES.KNOB_FX}
        shiftActive={ui.fxSelectOpen}
        onClick={() => (ui.shiftHeld ? toggleShiftMenu('fxSelectOpen') : setMode(MODES.KNOB_FX))}
      />
    </div>
    </div>
  );
}
