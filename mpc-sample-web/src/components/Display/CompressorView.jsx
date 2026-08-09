import { useProjectState } from '../../state/ProjectContext';
import { useKnobBindings } from '../../state/useKnobBindings';
import ScreenChrome from './ScreenChrome';

export default function CompressorView() {
  const { project } = useProjectState();
  const c = project.compressor;
  const bindings = useKnobBindings();

  return (
    <ScreenChrome footer={bindings.map((b) => b.label)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ color: c.color ? 'var(--screen-accent)' : 'var(--screen-text-dim)' }}>Color {c.color ? 'On' : 'Off'}</span>
        <span style={{ color: c.bypass ? 'var(--screen-red)' : 'var(--screen-green)' }}>{c.bypass ? 'Bypassed' : 'Active'}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 34 }}>🎚</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
        {bindings.map((b, i) => (
          <div key={i}>
            <div style={{ color: 'var(--screen-text-dim)' }}>{b.label}</div>
            <div style={{ color: 'var(--screen-accent2)' }}>{b.formatValue(b.value)}</div>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}
