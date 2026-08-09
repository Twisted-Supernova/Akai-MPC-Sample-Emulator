import './ScreenChrome.css';

export default function ScreenChrome({ playing, tabs, activeTab, onTabClick, footer, children }) {
  return (
    <div className="screen">
      <div className={`screen__top-bar ${playing ? 'screen__top-bar--playing' : ''}`} />
      {tabs ? (
        <div className="screen__tabs">
          {tabs.map((t) => (
            <div
              key={t}
              className={`screen__tab ${t === activeTab ? 'screen__tab--active' : ''}`}
              onClick={() => onTabClick?.(t)}
            >
              {t}
            </div>
          ))}
        </div>
      ) : null}
      <div className="screen__body">{children}</div>
      {footer ? (
        <div className="screen__footer">
          {footer.map((f, i) => (
            <div className="screen__footer-item" key={i}>{f}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
