const SECTION_LABELS = {
  hub: 'Hub',
  achievements: 'Achievements',
  track: 'Track',
  shop: 'Shopping',
  holiday: 'Holiday',
};

function getDynamicGreeting(name) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=Sun, 1=Mon, 5=Fri, 6=Sat

  const n = name ? `, ${name}` : '';

  // Day-specific greetings
  if (day === 1 && hour >= 5 && hour < 12) return `Monday grind${n} 💪`;
  if (day === 5) return `Happy Friday${n} ⚽`;
  if (day === 6) return `Happy Saturday${n} 🎉`;
  if (day === 0) return `Happy Sunday${n} ☕`;

  // Time-of-day greetings
  if (hour >= 5 && hour < 12) return `Good morning${n} 🌅`;
  if (hour >= 12 && hour < 17) return `Good afternoon${n} ☀️`;
  if (hour >= 17 && hour < 21) return `Good evening${n} 🌆`;
  return `Still up${n}? 🌙`;
}

export default function PageHeader({ activeSection, coins, onOpenCoinHistory, profileName }) {
  const greeting = getDynamicGreeting(profileName);

  return (
    <div id="pageHeader">
      <span id="pageHeader-title">Vision Board</span>
      <span id="pageHeader-sub">// my space</span>
      {activeSection === 'hub'
        ? <span id="pageHeader-section" key="greeting" style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.9 }}>{greeting}</span>
        : <span id="pageHeader-section" key="section">{SECTION_LABELS[activeSection] || ''}</span>
      }
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
