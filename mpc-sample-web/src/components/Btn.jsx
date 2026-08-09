import './Btn.css';

export default function Btn({
  label,
  shiftLabel,
  variant = 'grey',
  active = false,
  dim = false,
  shiftActive = false,
  disabled = false,
  small = false,
  square = false,
  accentBar = false,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  style,
  className = '',
}) {
  const classes = [
    'hw-btn',
    `hw-btn--${variant}`,
    active ? 'hw-btn--active' : '',
    dim ? 'hw-btn--dim' : '',
    disabled ? 'hw-btn--disabled' : '',
    small ? 'hw-btn--small' : '',
    square ? 'hw-btn--square' : '',
    accentBar ? 'hw-btn--has-accent' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="hw-btn-wrap" style={style}>
      <button
        type="button"
        className={classes}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onMouseDown}
        onTouchEnd={onMouseUp}
      >
        <span className="hw-btn__led" />
        <span className="hw-btn__label">{label}</span>
        {accentBar ? <span className={`hw-btn__accent-bar ${active ? 'hw-btn__accent-bar--active' : ''}`} /> : null}
      </button>
      {shiftLabel ? (
        <span className={`hw-btn__shift ${shiftActive ? 'hw-btn__shift--active' : ''}`}>{shiftLabel}</span>
      ) : null}
    </div>
  );
}
