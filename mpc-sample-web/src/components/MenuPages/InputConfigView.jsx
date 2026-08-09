import { useProjectState } from '../../state/ProjectContext';
import ScreenChrome from '../Display/ScreenChrome';
import SettingsMenu, { cycleOption } from '../Display/SettingsMenu';

const SOURCES = ['Mic', 'Rear', 'Rear L', 'Rear R', 'Resample', 'USB', 'USB L', 'USB R'];
const MONITORS = ['Off', 'Auto', 'On'];

export default function InputConfigView() {
  const { project, dispatchProject, dispatchUi } = useProjectState();
  const cfg = project.inputConfig;
  const patch = (p) => dispatchProject({ type: 'SET_INPUT_CONFIG', patch: p });

  const rows = [
    { label: 'Source', value: cfg.source, onCycle: () => patch({ source: cycleOption(SOURCES, cfg.source) }) },
    { label: 'Monitor', value: cfg.monitor, onCycle: () => patch({ monitor: cycleOption(MONITORS, cfg.monitor) }) },
    { label: 'Threshold', value: `${cfg.threshold} dB`, onCycle: () => patch({ threshold: cfg.threshold >= 0 ? -96 : Math.min(0, cfg.threshold + 6) }) },
    { label: 'Rec Length', value: cfg.recLength, onCycle: () => patch({ recLength: cfg.recLength === 'Free' ? 'Seq' : 'Free' }) },
    { label: 'Rec Input Effects', value: cfg.recInputEffects, onCycle: () => patch({ recInputEffects: cfg.recInputEffects === 'On' ? 'Off' : 'On' }) },
  ];

  return (
    <ScreenChrome footer={['Cancel', '', 'Close']}>
      <SettingsMenu
        title="Input Configuration"
        rows={rows}
        onBack={() => dispatchUi({ type: 'CLOSE_MENU', menu: 'inputConfigOpen' })}
      />
    </ScreenChrome>
  );
}
