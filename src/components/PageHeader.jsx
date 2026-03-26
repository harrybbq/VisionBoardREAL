const SECTION_LABELS = {
  hub: 'Hub',
  achievements: 'Achievements',
  track: 'Track',
  shop: 'Shopping',
  holiday: 'Holiday',
  habits: 'Habits',
};

function getDynamicGreeting(name) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const n = name ? `, ${name}` : '';
  if (day === 1 && hour >= 5 && hour < 12) return `Monday grind${n} 💪`;
  if (day === 5) return `Happy Friday${n} ⚽`;
  if (day === 6) return `Happy Saturday${n} 🎉`;
  if (day === 0) return `Happy Sunday${n} ☕`;
  if (hour >= 5 && hour < 12) return `Good morning${n} 🌅`;
  if (hour >= 12 && hour < 17) return `Good afternoon${n} ☀️`;
  if (hour >= 17 && hour < 21) return `Good evening${n} 🌆`;
  return `Still up${n}? 🌙`;
}

export default function PageHeader({ activeSection, coins, onOpenCoinHistory, profileName, onChangeBg, onRemoveBg, onSignOut }) {
  const greeting = getDynamicGreeting(profileName);

  return (
    <div id="pageHeader">
      <span id="pageHeader-title">Vision Board</span>
      <span id="pageHeader-sub">// my space</span>
      {activeSection === 'hub'
        ? <span id="pageHeader-section" key="greeting" style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.9 }}>{greeting}</span>
        : <span id="pageHeader-section" key="section">{SECTION_LABELS[activeSection] || ''}</span>
      }

      {/* Background controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', marginRight: '12px' }}>
        <button
          onClick={onChangeBg}
          title="Change background image"
          style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
            fontSize: '14px', padding: '4px 9px', lineHeight: 1, transition: 'all .18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
        >
          🖼
        </button>
        {onRemoveBg && (
          <button
            onClick={onRemoveBg}
            title="Remove custom background"
            style={{
              background: 'rgba(180,40,40,0.2)', border: '1px solid rgba(180,40,40,0.35)',
              borderRadius: '8px', color: '#f87171', cursor: 'pointer',
              fontSize: '11px', padding: '4px 8px', lineHeight: 1, transition: 'all .18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,40,40,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(180,40,40,0.2)'; }}
          >
            ✕ bg
          </button>
        )}
      </div>

      {/* Sign out — mobile only */}
      <button
        className="mobile-signout-btn"
        onClick={onSignOut}
        title="Sign out"
      >→</button>

      <div id="coinWallet" onClick={onOpenCoinHistory} title="Your coins — click for history">
        <span className="cw-icon">⬡</span>
        <div>
          <div className="cw-amount" id="coinAmount">{coins}</div>
          <div className="cw-label">Coins</div>
        </div>
      </div>
    </div>
  );
}
