import { useRef, useCallback } from 'react';
import './Fader.css';

export default function Fader({ value = 0.5, onChange }) {
  const trackRef = useRef(null);

  const updateFromClientY = useCallback(
    (clientY) => {
      const rect = trackRef.current.getBoundingClientRect();
      const pct = 1 - (clientY - rect.top) / rect.height;
      onChange(Math.min(1, Math.max(0, pct)));
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e) => {
      updateFromClientY(e.clientY);
      const handleMove = (ev) => updateFromClientY(ev.clientY);
      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [updateFromClientY]
  );

  return (
    <div className="fader-wrap">
      <div className="fader-track" ref={trackRef} onPointerDown={handlePointerDown}>
        <div className="fader-track__slot fader-track__slot--left" />
        <div className="fader-track__slot fader-track__slot--right" />
        <div className="fader-led" style={{ bottom: `calc(${value * 100}% - 1px)` }} />
        <div className="fader-cap" style={{ bottom: `calc(${value * 100}% - 11px)` }} />
      </div>
      <div className="fader__label">Fader</div>
    </div>
  );
}
