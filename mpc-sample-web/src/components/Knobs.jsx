import Knob from './Knob';
import { useKnobBindings } from '../state/useKnobBindings';

export default function Knobs() {
  const bindings = useKnobBindings();

  return (
    <div style={{ display: 'flex', gap: 22, justifyContent: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => {
        const b = bindings[i];
        if (!b) return <Knob key={i} label={`K${i + 1}`} value={0} min={0} max={1} onChange={() => {}} />;
        return (
          <div key={i} onDoubleClick={b.cycle}>
            <Knob
              label={`K${i + 1}`}
              value={b.value}
              min={b.min}
              max={b.max}
              onChange={b.onChange}
              formatValue={b.formatValue}
            />
          </div>
        );
      })}
    </div>
  );
}
