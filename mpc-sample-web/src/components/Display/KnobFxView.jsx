import { useProjectState } from '../../state/ProjectContext';
import { KNOB_FX_LIST } from '../../data/constants';
import { useKnobBindings } from '../../state/useKnobBindings';
import ScreenChrome from './ScreenChrome';

export default function KnobFxView() {
  const { project, dispatchProject, dispatchUi, ui } = useProjectState();
  const bindings = useKnobBindings();
  const fx = KNOB_FX_LIST[project.knobFx.effectIndex];

  if (ui.fxSelectOpen) {
    return (
      <ScreenChrome footer={['Frequency', 'Resonance', '-']}>
        <div style={{ fontSize: 10, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span>{fx.name}</span>
          <span>{project.knobFx.allPads ? 'All Pads' : 'Per-Pad'}</span>
          <span style={{ color: project.knobFx.bypass ? 'var(--screen-red)' : 'var(--screen-text-dim)' }}>Bypass</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {KNOB_FX_LIST.map((f, i) => (
            <div
              key={f.name}
              onClick={() => {
                dispatchProject({ type: 'SET_KNOB_FX', patch: { effectIndex: i } });
                dispatchUi({ type: 'CLOSE_MENU', menu: 'fxSelectOpen' });
              }}
              style={{
                fontSize: 10,
                padding: '3px 4px',
                cursor: 'pointer',
                background: i === project.knobFx.effectIndex ? 'var(--screen-select-bg)' : 'transparent',
                color: i === project.knobFx.effectIndex ? 'var(--screen-accent)' : 'var(--screen-text)',
              }}
            >
              {f.name}
            </div>
          ))}
        </div>
      </ScreenChrome>
    );
  }

  return (
    <ScreenChrome footer={bindings.map((b) => b.label)}>
      <div style={{ fontSize: 9, color: 'var(--screen-text-dim)' }}>Knob FX{ui.shiftHeld ? ' (shift page)' : ''}</div>
      <div style={{ fontSize: 18, color: 'var(--screen-accent)', margin: '6px 0' }}>{fx.name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'flex-end' }}>
        {bindings.map((b, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--screen-text-dim)', fontSize: 9 }}>{b.label}</div>
            <div style={{ color: 'var(--screen-accent2)', fontSize: 11 }}>{b.formatValue(b.value)}</div>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}
