import { useProjectState } from '../../state/ProjectContext';
import { MODES } from '../../state/uiReducer';
import SampleModeView from './SampleModeView';
import SequenceModeView from './SequenceModeView';
import PadFxView from './PadFxView';
import KnobFxView from './KnobFxView';
import FlexBeatView from './FlexBeatView';
import CompressorView from './CompressorView';
import StepEditView from './StepEditView';
import SampleRecordView from './SampleRecordView';
import SampleSelectView from '../MenuPages/SampleSelectView';
import InputConfigView from '../MenuPages/InputConfigView';
import FaderMenuView from '../MenuPages/FaderMenuView';
import TimeCorrectView from '../MenuPages/TimeCorrectView';
import MidiConfigView from '../MenuPages/MidiConfigView';
import ProjectView from '../MenuPages/ProjectView';
import SongModeView from '../MenuPages/SongModeView';
import './Display.css';

export default function Display() {
  const { ui } = useProjectState();

  let content = null;

  if (ui.compressorOpen) content = <CompressorView />;
  else if (ui.inputConfigOpen) content = <InputConfigView />;
  else if (ui.faderMenuOpen) content = <FaderMenuView />;
  else if (ui.timeCorrectOpen) content = <TimeCorrectView />;
  else if (ui.midiConfigOpen) content = <MidiConfigView />;
  else if (ui.projectMenuOpen) content = <ProjectView />;
  else if (ui.songModeOpen) content = <SongModeView />;
  else if (ui.sampleSelectOpen) content = <SampleSelectView />;
  else if (ui.stepEditOpen) content = <StepEditView />;
  else if (ui.flexBeatOpen) content = <FlexBeatView />;
  else if (ui.mode === MODES.SAMPLE_RECORD) content = <SampleRecordView />;
  else if (ui.mode === MODES.SAMPLE) content = <SampleModeView />;
  else if (ui.mode === MODES.SEQUENCE) content = <SequenceModeView />;
  else if (ui.mode === MODES.PAD_FX) content = <PadFxView />;
  else if (ui.mode === MODES.KNOB_FX) content = <KnobFxView />;

  return <div className="display-bezel">{content}</div>;
}
