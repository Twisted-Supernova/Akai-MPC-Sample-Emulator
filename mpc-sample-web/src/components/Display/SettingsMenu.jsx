export default function SettingsMenu({ title, rows, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
        <span style={{ color: 'var(--screen-text-dim)', cursor: onBack ? 'pointer' : 'default' }} onClick={onBack}>
          ◄ Back
        </span>
        <span style={{ color: 'var(--screen-accent)' }}>{title}</span>
        <span />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rows.map((row) => (
          <div
            key={row.label}
            onClick={row.onCycle}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 3px',
              fontSize: 10,
              cursor: row.onCycle ? 'pointer' : 'default',
              borderBottom: '1px solid #1c1e22',
            }}
          >
            <span>{row.label}</span>
            <span style={{ color: 'var(--screen-accent2)' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function cycleOption(options, current) {
  const idx = options.indexOf(current);
  return options[(idx + 1) % options.length];
}
