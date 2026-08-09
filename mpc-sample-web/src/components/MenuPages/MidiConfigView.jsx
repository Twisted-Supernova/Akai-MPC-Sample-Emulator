import { useProjectState } from '../../state/ProjectContext';
import ScreenChrome from '../Display/ScreenChrome';
import SettingsMenu, { cycleOption } from '../Display/SettingsMenu';
import { MENU_TAKEOVER_MODES } from '../../data/constants';

const CHANNELS_ALL = ['All', ...Array.from({ length: 16 }, (_, i) => String(i + 1))];
const CHANNELS = Array.from({ length: 16 }, (_, i) => String(i + 1));

export default function MidiConfigView() {
  const { project, dispatchProject, dispatchUi } = useProjectState();
  const c = project.midiConfig;
  const patch = (p) => dispatchProject({ type: 'SET_MIDI_CONFIG', patch: p });

  const rows = [
    { label: 'MIDI Port', value: c.midiPort, onCycle: () => patch({ midiPort: cycleOption(['External', 'USB'], c.midiPort) }) },
    { label: 'MIDI In Channel', value: c.midiInChannel, onCycle: () => patch({ midiInChannel: cycleOption(CHANNELS_ALL, c.midiInChannel) }) },
    { label: 'MIDI Out Channel', value: c.midiOutChannel, onCycle: () => patch({ midiOutChannel: Number(cycleOption(CHANNELS, String(c.midiOutChannel))) }) },
    { label: 'Pad MIDI In', value: c.padMidiIn, onCycle: () => patch({ padMidiIn: cycleOption(['Off', 'On'], c.padMidiIn) }) },
    { label: 'Pad MIDI Out', value: c.padMidiOut, onCycle: () => patch({ padMidiOut: cycleOption(['Never', 'Always', 'Empty'], c.padMidiOut) }) },
    { label: 'MIDI Sync In', value: c.midiSyncIn, onCycle: () => patch({ midiSyncIn: cycleOption(['Off', 'Midi Clock', 'MTC'], c.midiSyncIn) }) },
    { label: 'MIDI Sync Out', value: c.midiSyncOut, onCycle: () => patch({ midiSyncOut: cycleOption(['Off', 'Midi Clock', 'MTC'], c.midiSyncOut) }) },
    { label: 'MIDI Thru', value: c.midiThru, onCycle: () => patch({ midiThru: cycleOption(['Off', 'On'], c.midiThru) }) },
    { label: 'Rec Program Change', value: c.receiveProgramChange, onCycle: () => patch({ receiveProgramChange: cycleOption(['Off', 'Sequence'], c.receiveProgramChange) }) },
    { label: 'CV/Sync Out', value: c.cvSyncOut, onCycle: () => patch({ cvSyncOut: cycleOption(['Off', 'On'], c.cvSyncOut) }) },
    { label: 'CV/Sync Base', value: c.cvSyncBase, onCycle: () => patch({ cvSyncBase: (c.cvSyncBase % 8) + 1 }) },
    { label: 'CV/Sync Division', value: c.cvSyncDivision, onCycle: () => patch({ cvSyncDivision: (c.cvSyncDivision % 24) + 1 }) },
    { label: 'Parameter Takeover', value: c.parameterTakeover, onCycle: () => patch({ parameterTakeover: cycleOption(MENU_TAKEOVER_MODES, c.parameterTakeover) }) },
    { label: 'Knob FX Takeover', value: c.knobFxTakeover, onCycle: () => patch({ knobFxTakeover: cycleOption(MENU_TAKEOVER_MODES, c.knobFxTakeover) }) },
    { label: 'Fader Takeover', value: c.faderTakeover, onCycle: () => patch({ faderTakeover: cycleOption(MENU_TAKEOVER_MODES, c.faderTakeover) }) },
  ];

  return (
    <ScreenChrome footer={['Back', 'Reset Settings', 'Reset Data']}>
      <SettingsMenu
        title="MIDI Configuration (UI only - not wired to real MIDI, see README)"
        rows={rows}
        onBack={() => dispatchUi({ type: 'CLOSE_MENU', menu: 'midiConfigOpen' })}
      />
      <div style={{ fontSize: 8, color: 'var(--screen-text-dim)', marginTop: 2 }}>
        Web MIDI wiring is out of scope for v1 - see README.
      </div>
    </ScreenChrome>
  );
}
