export default function Nav({ activeSection, onNavigate }) {
  const tabs = [
    { id: 'hub', icon: '⌂', label: 'Hub' },
    { id: 'achievements', icon: '★', label: 'Achievements' },
    { id: 'track', icon: '◎', label: 'Track' },
    { id: 'shop', icon: '◈', label: 'Shopping' },
    { id: 'holiday', icon: '✈', label: 'Holiday' },
  ];

  return (
    <nav>
      <div className="nav-logo">
        <div className="nav-logo-icon">V</div>
        <div className="nav-logo-text">
          Vision Board<span className="nav-logo-sub">my space</span>
        </div>
      </div>
      <div className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab${activeSection === tab.id ? ' active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            <div className="nav-tab-icon">{tab.icon}</div>
            <span className="nav-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="nav-bottom"></div>
    </nav>
  );
}
