import { useRef, useState, useCallback } from 'react';
import './Encoder.css';

export default function Encoder({ onTurn, onPress, size = 56 }) {
  const dragState = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = useCallback(
    (e) => {
      dragState.current = { startY: e.clientY, turned: false };
      const handleMove = (ev) => {
        const dy = dragState.current.startY - ev.clientY;
        if (Math.abs(dy) > 6) {
          const steps = Math.trunc(dy / 6);
          if (steps !== 0) {
            onTurn(steps);
            setRotation((r) => r + steps * 20);
            dragState.current.startY = ev.clientY;
            dragState.current.turned = true;
          }
        }
      };
      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [onTurn]
  );

  // A drag that starts and ends inside the element still fires a click on release, so a turn would
  // otherwise register as a press as well - on the real encoder those are distinct gestures.
  const handleClick = useCallback(() => {
    if (dragState.current?.turned) return;
    onPress?.();
  }, [onPress]);

  return (
    <div className="encoder-wrap">
      <div
        className={`encoder ${pressed ? 'encoder--pressed' : ''}`}
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          handlePointerDown(e);
        }}
        onClick={handleClick}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
      >
        <div className="encoder__ring" style={{ transform: `rotate(${rotation % 360}deg)` }}>
          <div className="encoder__tick" />
        </div>
      </div>
      <div className="encoder__label">Encoder</div>
    </div>
  );
}
