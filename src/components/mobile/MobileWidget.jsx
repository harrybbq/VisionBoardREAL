/**
 * MobileWidget — single widget card rendered below AI Coach on the
 * mobile hub. Type determines content. All widgets share the same
 * outer chrome (em-tinted border, mono eyebrow, optional × remove).
 *
 * Each type either works today (notepad / recent-wins / coin-history)
 * or surfaces a "Coming soon" CTA explaining what's needed to wire
 * the real data (HealthKit entitlement, Gmail OAuth, etc).
 *
 * Adding a new widget type:
 *   1. Add entry in WIDGET_META below
 *   2. Add a case in renderBody()
 *   3. Add an option in AddMobileWidgetModal's picker
 */
import { useState } from 'react';

const WIDGET_META = {
  'notepad': {
    label: 'Notepad',
    eyebrow: 'NOTES',
    icon: '✎',
  },
  'recent-wins': {
    label: 'Recent Wins',
    eyebrow: 'WINS',
    icon: '★',
  },
  'coin-history': {
    label: 'Coin Activity',
    eyebrow: 'COINS',
    icon: '⬡',
  },
  'vitals': {
    label: 'Vitals',
    eyebrow: 'HEALTH',
    icon: '◐',
    requires: 'HealthKit entitlement (Apple Dev account) — coming with F4 Sprint 1',
  },
  'calories': {
    label: 'Calories Burned',
    eyebrow: 'CALORIES',
    icon: '◔',
    requires: 'HealthKit + active-energy permission — coming with F4 Sprint 1',
  },
  'mail': {
    label: 'Recent Mail',
    eyebrow: 'INBOX',
    icon: '✉',
    requires: 'Gmail / Outlook OAuth — deferred (separate vertical)',
  },
};

export default function MobileWidget({ widget, S, update, onRemove }) {
  const meta = WIDGET_META[widget.type] || { label: widget.type, eyebrow: '?', icon: '·' };

  return (
    <div className="m-widget">
      <div className="m-widget-head">
        <span className="m-widget-icon">{meta.icon}</span>
        <span className="m-widget-eyebrow">// {meta.eyebrow}</span>
        <button
          type="button"
          className="m-widget-remove"
          onClick={() => onRemove(widget.id)}
          aria-label="Remove widget"
          title="Remove"
        >×</button>
      </div>
      <div className="m-widget-body">
        {renderBody(widget, meta, S, update)}
      </div>
    </div>
  );
}

function renderBody(widget, meta, S, update) {
  if (meta.requires) {
    return (
      <div className="m-widget-stub">
        <div className="m-widget-stub-label">Coming soon</div>
        <div className="m-widget-stub-detail">{meta.requires}</div>
      </div>
    );
  }
  switch (widget.type) {
    case 'notepad':     return <NotepadBody S={S} update={update} />;
    case 'recent-wins': return <RecentWinsBody S={S} />;
    case 'coin-history':return <CoinHistoryBody S={S} />;
    default:            return <div className="m-widget-stub-label">Unknown widget type.</div>;
  }
}

// ── Notepad ──
function NotepadBody({ S, update }) {
  const [draft, setDraft] = useState(S.notepadText || '');
  function handleChange(e) {
    const value = e.target.value;
    setDraft(value);
    update(prev => ({ ...prev, notepadText: value }));
  }
  return (
    <textarea
      className="m-widget-notepad"
      value={draft}
      onChange={handleChange}
      placeholder="Quick notes…"
      rows={5}
    />
  );
}

// ── Recent wins (last 3 completed achievements) ──
function RecentWinsBody({ S }) {
  const wins = (S.achievements || [])
    .filter(a => a.completed)
    .slice(-3)
    .reverse();
  if (!wins.length) {
    return <div className="m-widget-empty">No completed achievements yet — tap the ★ on any node to mark complete.</div>;
  }
  return (
    <ul className="m-widget-list">
      {wins.map(a => (
        <li key={a.id} className="m-widget-list-row">
          <span className="m-widget-list-icon">{a.icon || '✨'}</span>
          <span className="m-widget-list-name">{a.name}</span>
          {a.coins > 0 && <span className="m-widget-list-meta">+{a.coins} ⬡</span>}
        </li>
      ))}
    </ul>
  );
}

// ── Coin history (last 5 entries) ──
function CoinHistoryBody({ S }) {
  const history = (S.coinHistory || []).slice(0, 5);
  const balance = S.coins || 0;
  if (!history.length) {
    return (
      <div className="m-widget-coins">
        <div className="m-widget-coins-balance">{balance}</div>
        <div className="m-widget-coins-label">Total coins · no activity yet</div>
      </div>
    );
  }
  return (
    <div>
      <div className="m-widget-coins-balance" style={{ marginBottom: 8 }}>{balance}</div>
      <ul className="m-widget-list">
        {history.map((h, i) => (
          <li key={i} className="m-widget-list-row">
            <span className={`m-widget-list-amount ${h.amount > 0 ? 'pos' : 'neg'}`}>
              {h.amount > 0 ? '+' : ''}{h.amount}
            </span>
            <span className="m-widget-list-name">{h.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { WIDGET_META };
