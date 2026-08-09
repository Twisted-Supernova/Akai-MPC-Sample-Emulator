import { useProjectState } from '../../state/ProjectContext';
import { PAD_FX_LIST } from '../../data/constants';
import { useKnobBindings } from '../../state/useKnobBindings';
import ScreenChrome from './ScreenChrome';

export default function PadFxView() {
  const { project } = useProjectState();
  const bindings = useKnobBindings();
  const activePad = Object.keys(project.padFx.active)[0];

  return (
    <ScreenChrome footer={bindings.length ? bindings.map((b) => b.label) : ['-', '-', '-']}>
      <div style={{ fontSize: 9, color: 'var(--screen-text-dim)', marginBottom: 3 }}>
        Latch: {project.padFx.latchOrder.length ? project.padFx.latchOrder.join(', ') : 'none'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, flex: 1 }}>
        {PAD_FX_LIST.map((fx) => {
          const isActive = !!project.padFx.active[fx.pad];
          const isLatched = project.padFx.latchOrder.includes(fx.pad);
          return (
            <div
              key={fx.pad}
              style={{
                fontSize: 8,
                textAlign: 'center',
                padding: '4px 2px',
                borderRadius: 2,
                background: isLatched ? 'var(--screen-accent)' : isActive ? '#5a3a1a' : '#151719',
                color: isLatched ? '#000' : isActive ? 'var(--screen-accent)' : 'var(--screen-text-dim)',
              }}
            >
              {fx.name}
            </div>
          );
        })}
      </div>
      {bindings.length ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9 }}>
          {bindings.map((b, i) => (
            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: 'var(--screen-text-dim)' }}>{b.label}</div>
              <div style={{ color: 'var(--screen-accent2)' }}>{b.formatValue(b.value)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 8, textAlign: 'center', color: 'var(--screen-text-dim)', marginTop: 4 }}>
          Hold a pad ({activePad ?? '-'}) to engage an effect
        </div>
      )}
    </ScreenChrome>
  );
}
