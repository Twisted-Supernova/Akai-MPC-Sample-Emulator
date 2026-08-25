import { useState } from 'react';
import { useProjectState } from '../../state/ProjectContext';
import { seqKey } from '../../state/projectReducer';
import { TICKS_PER_BAR } from '../../data/constants';
import { renderSongToWavBlob } from '../../audio/songExport';
import { downloadBlob } from '../../audio/downloadBlob';
import ScreenChrome from '../Display/ScreenChrome';

export default function SongModeView() {
  const { project, dispatchProject, dispatchUi, engine } = useProjectState();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [exportPage, setExportPage] = useState(false);
  const [songName, setSongName] = useState('Song1');
  const [rendering, setRendering] = useState(false);

  function insertSequence(padNum) {
    const key = seqKey(project.currentSeqBank, padNum);
    if (!project.sequences[key].events.length) return;
    const step = { bank: project.currentSeqBank, seq: padNum };
    const song = [...project.song];
    song.splice(selectedIndex + 1, 0, step);
    dispatchProject({ type: 'SET_SONG', song });
  }

  function removeAt(i) {
    dispatchProject({ type: 'REMOVE_SONG_STEP', index: i });
  }

  async function doExportAudio() {
    setRendering(true);
    try {
      const blob = await renderSongToWavBlob(project, engine);
      if (blob) downloadBlob(blob, `${songName}.wav`);
    } catch {
      // Without this the render error surfaces only as an unhandled rejection and the user is left
      // staring at a dialog that closed with no file and no explanation.
      dispatchUi({ type: 'SET_ERROR', message: 'Could not render the song mixdown' });
    } finally {
      setRendering(false);
      setExportPage(false);
    }
  }

  function exportAsSequence() {
    const totalBars = project.song.reduce((sum, { bank, seq }) => sum + project.sequences[seqKey(bank, seq)].bars, 0);
    const nextEmpty = Object.entries(project.sequences).find(([, s]) => s.events.length === 0);
    if (!nextEmpty) return;
    const [key] = nextEmpty;
    const bank = key[0];
    const seqNum = Number(key.slice(1));
    let events = [];
    let tickCursor = 0;
    project.song.forEach(({ bank: b, seq: s }) => {
      const sequence = project.sequences[seqKey(b, s)];
      events = events.concat(sequence.events.map((e) => ({ ...e, tick: e.tick + tickCursor })));
      tickCursor += sequence.bars * TICKS_PER_BAR;
    });
    dispatchProject({
      type: 'UPDATE_SEQUENCE',
      bank,
      seq: seqNum,
      patch: { bars: Math.min(128, totalBars), events },
    });
    dispatchUi({ type: 'CLOSE_MENU', menu: 'songModeOpen' });
  }

  if (exportPage) {
    return (
      <ScreenChrome footer={['Cancel', '', rendering ? 'Rendering...' : 'Do It!']}>
        <div style={{ fontSize: 10, color: 'var(--screen-text-dim)' }}>Create name</div>
        <input
          value={songName}
          onChange={(e) => setSongName(e.target.value)}
          style={{ background: '#151719', border: '1px solid #2a2a2a', color: 'var(--screen-accent)', fontFamily: 'inherit', fontSize: 14, padding: 4, marginTop: 4, width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }} onClick={() => setExportPage(false)}>Cancel</span>
          <span style={{ cursor: rendering ? 'default' : 'pointer', color: 'var(--screen-green)' }} onClick={rendering ? undefined : doExportAudio}>
            {rendering ? 'Rendering…' : 'Do It!'}
          </span>
        </div>
      </ScreenChrome>
    );
  }

  return (
    <ScreenChrome footer={['Export Mixdown', 'Remove', 'Export as Seq']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}>
        <span
          style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }}
          onClick={() => dispatchUi({ type: 'CLOSE_MENU', menu: 'songModeOpen' })}
        >
          ◄ Back
        </span>
        <span style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }} onClick={() => setExportPage(true)}>Export Mixdown</span>
        <span style={{ cursor: 'pointer', color: 'var(--screen-text-dim)' }} onClick={exportAsSequence}>Export as Sequence</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: 8, color: 'var(--screen-text-dim)', marginBottom: 2 }}>
        <span>Seq</span><span>BPM</span><span>Length</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {project.song.map((step, i) => {
          const seq = project.sequences[seqKey(step.bank, step.seq)];
          const bpm = seq.bpmMode === 'SEQ' ? seq.bpm : project.globalBpm;
          return (
            <div
              key={i}
              onClick={() => setSelectedIndex(i)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: 9, padding: '2px 0',
                background: i === selectedIndex ? 'var(--screen-select-bg)' : 'transparent', cursor: 'pointer',
              }}
            >
              <span>Seq {step.bank}{String(step.seq).padStart(2, '0')}</span>
              <span>{bpm.toFixed(2)} BPM</span>
              <span onDoubleClick={() => removeAt(i)}>{seq.bars} bars</span>
            </div>
          );
        })}
        {!project.song.length && <div style={{ fontSize: 8, color: 'var(--screen-text-dim)' }}>No steps yet - tap a lit pad to insert.</div>}
      </div>
      <div style={{ fontSize: 7, color: 'var(--screen-text-dim)', marginTop: 2 }}>
        Tap a pad with events to insert after selection. Double-click a row to remove it.
      </div>
      <PadInsertRow onInsert={insertSequence} bank={project.currentSeqBank} sequences={project.sequences} />
    </ScreenChrome>
  );
}

function PadInsertRow({ onInsert, bank, sequences }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, marginTop: 4 }}>
      {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => {
        const has = sequences[seqKey(bank, n)].events.length > 0;
        return (
          <div
            key={n}
            onClick={() => has && onInsert(n)}
            style={{
              fontSize: 7, textAlign: 'center', padding: 3, borderRadius: 2,
              background: has ? '#1f6b45' : '#151719', color: has ? '#bff' : 'var(--screen-text-dim)',
              cursor: has ? 'pointer' : 'default',
            }}
          >
            {n}
          </div>
        );
      })}
    </div>
  );
}
