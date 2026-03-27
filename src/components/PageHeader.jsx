import { useState, useEffect, useRef } from 'react';

const SECTION_LABELS = {
  hub: 'Hub',
  achievements: 'Achievements',
  track: 'Track',
  shop: 'Shopping',
  holiday: 'Holiday',
  habits: 'Habits',
  settings: 'Settings',
};

const SECTION_HELP = {
  hub: 'Your personal dashboard. Add widgets like links, GitHub profiles, and YouTube feeds. Your AI Coach lives here too.',
  achievements: 'Set goals on a visual canvas and draw connections between them to map your path forward. Complete them to earn coins.',
  track: 'Log daily habits and numbers. Set weekly targets and earn coins when you hit them.',
  shop: 'Build a wishlist of things you\'re saving up for. Assign coin costs and mark items as bought.',
  holiday: 'Plan upcoming trips — dates, flights, accommodation, and budget all in one place.',
  habits: 'Track long-term habits with a live streak timer. Hit milestones to earn coin rewards.',
  settings: 'Customise your colour scheme and manage your account.',
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
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef(null);

  // Close tooltip on outside click
  useEffect(() => {
    if (!helpOpen) return;
    function handler(e) {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [helpOpen]);

  // Close tooltip when section changes
  useEffect(() => { setHelpOpen(false); }, [activeSection]);

  const helpText = SECTION_HELP[activeSection] || '';

  return (
    <div id="pageHeader">
      <span id="pageHeader-title">
        <span className="header-title-full">Vision Board</span>
        <span className="header-title-short">V</span>
      </span>
      <span id="pageHeader-sub">// my space</span>

      <span id="pageHeader-section-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {activeSection === 'hub'
          ? <span id="pageHeader-section" key="greeting" style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.9 }}>{greeting}</span>
          : <span id="pageHeader-section" key="section">{SECTION_LABELS[activeSection] || ''}</span>
        }

        {/* Help button */}
        <span ref={helpRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <button
            onClick={() => setHelpOpen(v => !v)}
            title={`About ${SECTION_LABELS[activeSection] || 'this screen'}`}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              width: '18px', height: '18px',
              fontSize: '10px', fontFamily: 'var(--mono)',
              fontWeight: 700, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >?</button>

          {helpOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 13px',
              width: '220px',
              fontSize: '12px',
              fontFamily: 'var(--sans)',
              color: 'var(--text-mid)',
              lineHeight: 1.6,
              boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
              zIndex: 9999,
              pointerEvents: 'auto',
            }}>
              {helpText}
              {/* small arrow */}
              <div style={{
                position: 'absolute',
                top: '-5px', left: '50%',
                width: '10px', height: '10px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRight: 'none', borderBottom: 'none',
                transform: 'translateX(-50%) rotate(45deg)',
              }} />
            </div>
          )}
        </span>
      </span>

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
