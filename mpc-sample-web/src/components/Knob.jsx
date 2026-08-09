import { useRef, useCallback, useState } from 'react';
import './Knob.css';

// Drag-vertical rotary control. Real hardware knobs are absolute-position with soft-takeover;
// a mouse has no absolute rotational position, so this implements the "Scaled" takeover model
// (drag distance scales to the parameter range) with a mismatch arrow, same visual language the
// manual uses for real takeover mismatches.
export default function Knob({ label, value, min = 0, max = 127, onChange, size = 46, formatValue, mismatchDir }) {
  const dragState = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e) => {
      dragState.current = { startY: e.clientY, startValue: value };
      setDragging(true);
      const handleMove = (ev) => {
        const dy = dragState.current.startY - ev.clientY;
        const range = max - min;
        const delta = (dy / 150) * range;
        let next = dragState.current.startValue + delta;
        next = Math.min(max, Math.max(min, next));
        onChange(next);
      };
      const handleUp = () => {
        setDragging(false);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [value, min, max, onChange]
  );

  const pct = (value - min) / (max - min);
  const angle = -135 + pct * 270;
  const arcSize = size + 18;
  const r = arcSize / 2 - 3;
  const cx = arcSize / 2;
  const cy = arcSize / 2;
  const startA = (-135 * Math.PI) / 180;
  const endA = (135 * Math.PI) / 180;
  const p1 = { x: cx + r * Math.cos(startA - Math.PI / 2), y: cy + r * Math.sin(startA - Math.PI / 2) };
  const p2 = { x: cx + r * Math.cos(endA - Math.PI / 2), y: cy + r * Math.sin(endA - Math.PI / 2) };

  return (
    <div className="knob-wrap">
      <div className="knob-arc-frame" style={{ width: arcSize, height: arcSize }}>
        <svg width={arcSize} height={arcSize} className="knob-arc-svg">
          <path
            d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 1 1 ${p2.x} ${p2.y}`}
            fill="none"
            stroke="var(--knob-cap)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx={p1.x} cy={p1.y} r="1.6" fill="var(--knob-cap)" />
          <circle cx={p2.x} cy={p2.y} r="1.6" fill="var(--knob-cap)" />
        </svg>
        <div
          className={`knob ${dragging ? 'knob--dragging' : ''}`}
          style={{ width: size, height: size }}
          onPointerDown={handlePointerDown}
        >
          <div className="knob__cap" />
          <div className="knob__body" style={{ transform: `rotate(${angle}deg)` }}>
            <div className="knob__indicator" />
          </div>
          {mismatchDir ? <div className={`knob__mismatch knob__mismatch--${mismatchDir}`}>{mismatchDir === 'left' ? '◄' : '►'}</div> : null}
        </div>
      </div>
      {label ? <div className="knob__label">{label}</div> : null}
      {formatValue ? <div className="knob__value">{formatValue(value)}</div> : null}
    </div>
  );
}
