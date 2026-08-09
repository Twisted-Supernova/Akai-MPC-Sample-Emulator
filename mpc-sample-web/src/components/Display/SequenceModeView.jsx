import { useProjectState, useCurrentSequence } from '../../state/ProjectContext';
import { PPQN } from '../../data/constants';
import ScreenChrome from './ScreenChrome';

export default function SequenceModeView() {
  const { project, ui } = useProjectState();
  const seq = useCurrentSequence();
  const bpm = seq.bpmMode === 'SEQ' ? seq.bpm : project.globalBpm;
  const ticksPerBar = PPQN * 4;
  const bar = Math.floor(ui.playheadTick / ticksPerBar) + 1;
  const beat = Math.floor((ui.playheadTick % ticksPerBar) / PPQN) + 1;

  return (
    <ScreenChrome playing={ui.playing} footer={['Bars', 'Q', 'RT Swing']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span>{bpm.toFixed(2)}</span>
        <span style={{ fontSize: 9, color: 'var(--screen-text-dim)' }}>BPM: {seq.bpmMode}</span>
        <span style={{ color: seq.recQuantize ? 'var(--screen-green)' : 'var(--screen-text-dim)', fontSize: 9 }}>Rec Quant</span>
      </div>
      <div style={{ fontSize: 20, color: 'var(--screen-accent)', margin: '4px 0' }}>
        Seq {project.currentSeqBank}{String(project.currentSeq).padStart(2, '0')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
        <span>{project.timeSignature.numerator}/{project.timeSignature.denominator}</span>
        <span style={{ color: project.metronome !== 'Off' ? 'var(--screen-green)' : 'var(--screen-text-dim)' }}>
          Metro {project.metronome}
        </span>
        <span style={{ color: seq.countIn ? 'var(--screen-red)' : 'var(--screen-text-dim)' }}>1234</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 26, color: ui.playing ? 'var(--screen-green)' : 'var(--screen-text-dim)' }}>
          {ui.playing ? '▶' : '■'}
        </span>
        <span style={{ fontSize: 22 }}>{String(bar).padStart(3, '0')}.{String(beat).padStart(2, '0')}</span>
        <span style={{ fontSize: 10, color: 'var(--screen-text-dim)' }}>{seq.events.length}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--screen-accent2)' }}>
        <span>{seq.bars} Bars</span>
        <span>Q {seq.q}</span>
        <span>RT Swing {seq.swing}%</span>
      </div>
    </ScreenChrome>
  );
}
