import { useProjectState } from '../state/ProjectContext';
import { useButtonBindings } from '../state/useButtonBindings';
import Btn from './Btn';

export default function BFunctionButtons() {
  const { ui } = useProjectState();
  const bindings = useButtonBindings();

  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      {['b1', 'b2', 'b3'].map((key) => {
        const b = bindings[key];
        return (
          <Btn
            key={key}
            small
            label={b.label || key.toUpperCase()}
            shiftLabel={b.shiftLabel}
            onClick={() => (ui.shiftHeld && b.onShiftClick ? b.onShiftClick() : b.onClick?.())}
          />
        );
      })}
    </div>
  );
}
