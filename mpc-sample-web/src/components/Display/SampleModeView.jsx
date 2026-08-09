import { useProjectState, useCurrentPad } from '../../state/ProjectContext';
import { useKnobBindings } from '../../state/useKnobBindings';
import { PAD_GRID_MODES } from '../../state/uiReducer';
import ScreenChrome from './ScreenChrome';
import WaveformCanvas from './WaveformCanvas';

export default function SampleModeView() {
  const { project, ui, engine } = useProjectState();
  const pad = useCurrentPad();
  const bindings = useKnobBindings();
  const entry = pad.sampleId ? engine.getBufferEntry(pad.sampleId) : null;

  const tabs = [ui.sampleTabs.b1, ui.sampleTabs.b2, ui.sampleTabs.b3];
  const activeLabel = { b1: ui.sampleTabs.b1, b2: ui.sampleTabs.b2, b3: ui.sampleTabs.b3 }[ui.sampleTabs.active];

  const isChop = ui.padGridMode === PAD_GRID_MODES.CHOP;

  return (
    <ScreenChrome
      tabs={tabs}
      activeTab={activeLabel}
      footer={bindings.map((b) => b.label || ' ')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
        <span>{project.currentPadBank}{String(project.currentPad).padStart(2, '0')}</span>
        <span style={{ color: 'var(--screen-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: '0 6px' }}>
          {pad.name || '(empty)'}
        </span>
        <span>{pad.noteOn ? '♪' : ''}{pad.loop ? '↻' : ''}{pad.reverse ? '←' : ''}{pad.muted ? 'MUTE' : ''}</span>
      </div>
      <WaveformCanvas
        buffer={entry?.buffer}
        start={isChop ? 0 : pad.start}
        end={isChop ? 1 : pad.end}
        loopStart={pad.loopStart}
        showLoop={pad.loop && !isChop}
        sliceLines={isChop ? pad.chop.slices : null}
        selectedSliceIndex={isChop ? pad.chop.selectedSlice : null}
        height={70}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9 }}>
        {bindings.map((b, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }} onClick={b.cycle}>
            <div style={{ color: 'var(--screen-text-dim)' }}>{b.label}</div>
            <div style={{ color: 'var(--screen-accent2)', cursor: b.cycle ? 'pointer' : 'default' }}>
              {b.formatValue ? b.formatValue(b.value) : b.value}
            </div>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}
