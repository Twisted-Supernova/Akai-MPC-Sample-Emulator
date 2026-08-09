import { useMemo } from 'react';
import { useProjectState, useCurrentSequence } from '../../state/ProjectContext';
import { PPQN } from '../../data/constants';
import ScreenChrome from './ScreenChrome';

const Q_TICKS = { '1/4': PPQN, '1/8': PPQN / 2, '1/16': PPQN / 4, '1/32': PPQN / 8 };

export default function StepEditView() {
  const { project, dispatchProject, ui, dispatchUi } = useProjectState();
  const seq = useCurrentSequence();
  const qTicks = Q_TICKS[seq.q] ?? PPQN / 4;
  const totalSteps = Math.floor((seq.bars * PPQN * 4) / qTicks);
  const currentStep = Math.floor(ui.playheadTick / qTicks);

  const stepEvents = useMemo(() => {
    const map = new Map();
    seq.events.forEach((e) => {
      const step = Math.round(e.tick / qTicks);
      if (!map.has(step)) map.set(step, []);
      map.get(step).push(e);
    });
    return map;
  }, [seq.events, qTicks]);

  const eventsAtStep = stepEvents.get(currentStep) ?? [];

  function eraseEvent(ev) {
    dispatchProject({
      type: 'SET_SEQUENCE_EVENTS',
      bank: project.currentSeqBank,
      seq: project.currentSeq,
      events: seq.events.filter((e) => e !== ev),
    });
  }

  return (
    <ScreenChrome footer={['Length', 'Q', 'Velocity']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span>Seq {project.currentSeqBank}{String(project.currentSeq).padStart(2, '0')}</span>
        <span>{String(currentStep + 1).padStart(3, '0')} / {totalSteps}</span>
        <span style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }} onClick={() => dispatchUi({ type: 'CLOSE_MENU', menu: 'stepEditOpen' })}>Close</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', marginTop: 4 }}>
        {eventsAtStep.length === 0 && <div style={{ fontSize: 9, color: 'var(--screen-text-dim)' }}>(no events at this step)</div>}
        {eventsAtStep.map((e, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '2px 0', borderBottom: '1px solid #1c1e22' }}>
            <span>Pad {e.padBank}{e.pad}</span>
            <span>{String(Math.floor(e.tick / (PPQN * 4)) + 1).padStart(3, '0')}:{String(Math.floor((e.tick % (PPQN * 4)) / PPQN) + 1).padStart(2, '0')}:{String(e.tick % PPQN).padStart(3, '0')}</span>
            <span>{Math.round((e.velocity ?? 0.85) * 127)}</span>
            <span style={{ cursor: 'pointer', color: 'var(--screen-red)' }} onClick={() => eraseEvent(e)}>Erase</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 8, color: 'var(--screen-text-dim)' }}>Q {seq.q} · Fader nudges timing · turn Encoder to step</div>
    </ScreenChrome>
  );
}
