import { useEffect, useRef, useState } from 'react';
import { useProjectState } from '../state/ProjectContext';
import { BANKS } from '../data/constants';
import Knob from './Knob';
import BFunctionButtons from './BFunctionButtons';
import Display from './Display/Display';
import './TopStrip.css';

export default function TopStrip() {
  const { project, dispatchProject, engine } = useProjectState();
  const [volume, setVolume] = useState(0.9);
  const [level, setLevel] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    engine.ensureContext();
    if (engine.masterGain) engine.masterGain.gain.value = volume;
  }, [volume, engine]);

  useEffect(() => {
    const loop = () => {
      setLevel(engine.getMeterLevel ? engine.getMeterLevel() : 0);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [engine]);

  const segments = 6;
  const litL = Math.round(Math.min(1, level * 4) * segments);
  const bankIdx = BANKS.indexOf(project.currentPadBank);

  return (
    <div className="top-panel">
      <div className="top-panel__left">
        <div className="top-panel__brand">
          <span className="chassis__akai">AKAI</span>
          <span className="chassis__akai-sub">professional</span>
        </div>
        <div className="top-panel__volume-row">
          <div className="top-panel__volume-cluster">
            <Knob label="" value={volume} min={0} max={1} onChange={setVolume} size={44} />
            <div className="top-panel__volume-text">MAIN<br />VOLUME</div>
          </div>
          <div className="bank-indicator" title="Pad bank">
            {BANKS.map((b, i) => (
              <span
                key={b}
                className={`bank-indicator__letter ${b === project.currentPadBank ? 'bank-indicator__letter--active' : ''}`}
                style={{ display: Math.abs(i - bankIdx) <= 1 ? 'inline' : 'none' }}
                onClick={() => dispatchProject({ type: 'SET_PAD_BANK', bank: b })}
              >
                {b}
              </span>
            ))}
          </div>
          <span className="battery-icon" title="Battery (inert - no real hardware battery)" />
        </div>
      </div>

      <div className="top-panel__center">
        <BFunctionButtons />
        <div className="chassis__display-frame">
          <Display />
        </div>
      </div>

      <div className="top-panel__right">
        <span className="chassis__wordmark">MPC SAMPLE</span>
        <div className="top-panel__right-row">
          <div className="top-strip__meters">
            {['L', 'R'].map((ch) => (
              <div className="meter" key={ch}>
                {Array.from({ length: segments }, (_, i) => (
                  <div
                    key={i}
                    className={`meter__seg ${segments - i <= litL ? 'meter__seg--lit' : ''} ${i === 0 ? 'meter__seg--red' : i === 1 ? 'meter__seg--amber' : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="speaker-grille" title="Built-in speaker">
            {Array.from({ length: 16 }, (_, i) => <span key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
