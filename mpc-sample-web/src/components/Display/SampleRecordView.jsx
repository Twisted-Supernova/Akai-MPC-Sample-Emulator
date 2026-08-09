import { useEffect, useState } from 'react';
import { useProjectState } from '../../state/ProjectContext';
import ScreenChrome from './ScreenChrome';

const SOURCES = ['Mic', 'Rear', 'Rear L', 'Rear R', 'Resample', 'USB', 'USB L', 'USB R'];
const MONITORS = ['Off', 'Auto', 'On'];

export default function SampleRecordView() {
  const { project, dispatchProject, engine, recordingState } = useProjectState();
  const cfg = project.inputConfig;
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let raf;
    const loop = () => {
      setLevel(engine.getInputMeterLevel ? engine.getInputMeterLevel() : 0);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  useEffect(() => {
    let cancelled = false;
    async function attach() {
      if (cfg.source === 'Mic') {
        try {
          const stream = await engine.getMicStream();
          if (!cancelled) engine.attachInputMonitor(stream, cfg.monitor !== 'Off');
        } catch (e) { /* permission denied - meter just stays at 0 */ }
      } else if (cfg.source === 'Resample') {
        engine.attachInputMonitor(engine.getResampleStream(), cfg.monitor !== 'Off');
      } else {
        engine.detachInputMonitor();
      }
    }
    attach();
    return () => {
      cancelled = true;
      engine.detachInputMonitor();
    };
  }, [cfg.source, cfg.monitor, engine]);

  const patch = (p) => dispatchProject({ type: 'SET_INPUT_CONFIG', patch: p });

  return (
    <ScreenChrome footer={['Monitor', 'Rec Length', 'Threshold']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span
          style={{ cursor: 'pointer', color: cfg.monitor !== 'Off' ? 'var(--screen-green)' : 'var(--screen-text-dim)' }}
          onClick={() => patch({ monitor: MONITORS[(MONITORS.indexOf(cfg.monitor) + 1) % 3] })}
        >
          {cfg.monitor}
        </span>
        <span style={{ color: 'var(--screen-text-dim)' }}>{recordingState.recording ? 'Recording' : 'Ready'}</span>
      </div>
      <div
        style={{ fontSize: 10, cursor: 'pointer', margin: '4px 0' }}
        onClick={() => patch({ source: SOURCES[(SOURCES.indexOf(cfg.source) + 1) % SOURCES.length] })}
      >
        Source: <span style={{ color: 'var(--screen-accent)' }}>{cfg.source}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {recordingState.recording ? (
          <div style={{ color: 'var(--screen-red)', fontSize: 14 }}>● Recording {project.currentPadBank}{String(recordingState.pad).padStart(2, '0')}</div>
        ) : (
          <div style={{ color: 'var(--screen-text-dim)', fontSize: 11 }}>Tap pad to record</div>
        )}
        <div style={{ width: '80%', height: 8, background: '#151719', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, level * 220)}%`, height: '100%', background: level > 0.8 ? 'var(--screen-red)' : 'var(--screen-green)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => patch({ recLength: cfg.recLength === 'Free' ? 'Seq' : 'Free' })}>
          Rec Length: {cfg.recLength}
        </span>
        <span style={{ cursor: 'pointer' }} onClick={() => patch({ threshold: cfg.threshold >= 0 ? -96 : Math.min(0, cfg.threshold + 6) })}>
          Threshold: {cfg.threshold}dB
        </span>
      </div>
    </ScreenChrome>
  );
}
