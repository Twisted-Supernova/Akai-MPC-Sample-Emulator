import { useProjectState } from '../../state/ProjectContext';
import ScreenChrome from '../Display/ScreenChrome';

const PARAMS = ['Pad Volume', 'Pad Pan', 'Pad Tune', 'Pad Amp Attack', 'Pad Amp Decay', 'Pad Filter Cutoff', 'Kit Volume'];

export default function FaderMenuView() {
  const { project, dispatchProject, dispatchUi } = useProjectState();
  const menu = project.faderMenu;

  return (
    <ScreenChrome footer={['Back', '', 'On/Off']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
        <span
          style={{ color: 'var(--screen-text-dim)', cursor: 'pointer' }}
          onClick={() => dispatchUi({ type: 'CLOSE_MENU', menu: 'faderMenuOpen' })}
        >
          ◄ Back
        </span>
        <span
          onClick={() => dispatchProject({ type: 'SET_FADER_MENU', patch: { enabled: !menu.enabled } })}
          style={{ color: menu.enabled ? 'var(--screen-green)' : 'var(--screen-text-dim)', cursor: 'pointer' }}
        >
          {menu.enabled ? 'ON' : 'OFF'}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {PARAMS.map((p) => (
          <div
            key={p}
            onClick={() => dispatchProject({ type: 'SET_FADER_MENU', patch: { param: p } })}
            style={{
              padding: '4px 3px',
              fontSize: 10,
              cursor: 'pointer',
              background: p === menu.param ? 'var(--screen-select-bg)' : 'transparent',
              color: p === menu.param ? 'var(--screen-accent)' : 'var(--screen-text)',
            }}
          >
            {p}
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}
