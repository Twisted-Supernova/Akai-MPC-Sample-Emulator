import { useProjectState } from '../../state/ProjectContext';
import { seqKey } from '../../state/projectReducer';
import { PPQN } from '../../data/constants';
import ScreenChrome from '../Display/ScreenChrome';

export default function TimeCorrectView() {
  const { project, dispatchProject, dispatchUi } = useProjectState();
  const tc = project.timeCorrect;

  function toggleAll() {
    dispatchProject({
      type: 'SET_TIME_CORRECT',
      patch: { selectedPads: tc.selectedPads.length === 16 ? [] : Array.from({ length: 16 }, (_, i) => i + 1) },
    });
  }

  function togglePad(n) {
    const set = new Set(tc.selectedPads);
    if (set.has(n)) set.delete(n);
    else set.add(n);
    dispatchProject({ type: 'SET_TIME_CORRECT', patch: { selectedPads: Array.from(set) } });
  }

  function applyTimeCorrect() {
    const bank = project.currentSeqBank;
    const seq = project.currentSeq;
    const key = seqKey(bank, seq);
    const sequence = project.sequences[key];
    const qTicks = quantizeTicksFor(tc.q);
    const events = sequence.events.map((e) => {
      if (!tc.selectedPads.includes(e.pad)) return e;
      const snapped = Math.round(e.tick / qTicks) * qTicks;
      const shifted = snapped + tc.shift;
      const swung = e.tick % (qTicks * 2) >= qTicks ? shifted + (tc.swing / 100) * qTicks * 0.5 : shifted;
      return { ...e, tick: Math.max(0, Math.round(swung)) };
    });
    dispatchProject({ type: 'SET_SEQUENCE_EVENTS', bank, seq, events });
    dispatchUi({ type: 'CLOSE_MENU', menu: 'timeCorrectOpen' });
  }

  return (
    <ScreenChrome footer={['Cancel', 'All', 'Do It!']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
        <span style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }} onClick={() => dispatchUi({ type: 'CLOSE_MENU', menu: 'timeCorrectOpen' })}>Cancel</span>
        <span style={{ cursor: 'pointer' }} onClick={toggleAll}>All</span>
        <span style={{ cursor: 'pointer', color: 'var(--screen-green)' }} onClick={applyTimeCorrect}>Do It!</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, flex: 1 }}>
        {Array.from({ length: 16 }, (_, i) => 16 - i).map((n) => (
          <div
            key={n}
            onClick={() => togglePad(n)}
            style={{
              fontSize: 9,
              textAlign: 'center',
              padding: 6,
              cursor: 'pointer',
              background: tc.selectedPads.includes(n) ? 'var(--screen-accent)' : '#151719',
              color: tc.selectedPads.includes(n) ? '#000' : 'var(--screen-text-dim)',
            }}
          >
            {project.currentSeqBank}{n}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, marginTop: 3 }}>Q {tc.q}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
        <span>Shift {tc.shift}</span>
        <span>Swing {tc.swing}%</span>
      </div>
    </ScreenChrome>
  );
}

function quantizeTicksFor(q) {
  const map = { '1/4': PPQN, '1/8': PPQN / 2, '1/16': PPQN / 4, '1/32': PPQN / 8, '1/16t': PPQN / 6, '1/8t': PPQN / 3 };
  return map[q] ?? PPQN / 4;
}
