import { useProjectState } from '../../state/ProjectContext';
import { FLEX_BEAT_SLOTS } from '../../data/constants';
import ScreenChrome from './ScreenChrome';

export default function FlexBeatView() {
  const { project, dispatchProject } = useProjectState();
  const slot = FLEX_BEAT_SLOTS[project.flexBeat.activeSlot - 1];

  return (
    <ScreenChrome footer={['One Shot/Loop', '-', 'Mix']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
        <span>{slot.name}</span>
        <span
          style={{ color: project.flexBeat.quantize ? 'var(--screen-green)' : 'var(--screen-text-dim)', cursor: 'pointer' }}
          onClick={() => dispatchProject({ type: 'SET_FLEX_BEAT', patch: { quantize: !project.flexBeat.quantize } })}
        >
          Quantize
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, flex: 1 }}>
        {FLEX_BEAT_SLOTS.map((s) => (
          <div
            key={s.pad}
            style={{
              fontSize: 8,
              textAlign: 'center',
              padding: '8px 2px',
              borderRadius: 2,
              background: s.pad === project.flexBeat.activeSlot ? 'var(--screen-accent)' : s.empty ? '#151719' : '#2a1730',
              color: s.pad === project.flexBeat.activeSlot ? '#000' : s.empty ? 'var(--screen-text-dim)' : '#c99bff',
            }}
          >
            {s.name}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9 }}>
        <div>
          <div style={{ color: 'var(--screen-text-dim)' }}>Mode</div>
          <div style={{ color: 'var(--screen-accent2)' }}>{project.flexBeat.mode}</div>
        </div>
        <div>
          <div style={{ color: 'var(--screen-text-dim)' }}>Mix</div>
          <div style={{ color: 'var(--screen-accent2)' }}>{project.flexBeat.mix}%</div>
        </div>
      </div>
    </ScreenChrome>
  );
}
