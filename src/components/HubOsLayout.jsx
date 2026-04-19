/**
 * Dark OS Hub layout.
 *
 * Opt-in for Pro users (S.theme === 'dark-os'). Reuses the existing
 * HubSection's widget canvas, QuickLog, AiCoachWidget, and CoachBriefPanel,
 * but arranges them in a 3-zone OS grid with chrome-style panels.
 *
 * Each panel is a standalone component so future work can let users
 * toggle / re-arrange them — S.hubLayout will drive which render.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AiCoachWidget from './AiCoachWidget';
import CoachBriefPanel from './CoachBriefPanel';
import QuickLog from './QuickLog';

// ── Panel primitive ──────────────────────────────────────────────────────
function OsPanel({ label, right, children, bodyClass = '', innerPadding = true }) {
  return (
    <div className="os-panel">
      <div className="os-panel-label">
        <span className="os-panel-label-text">{label}</span>
        {right ? <span className="os-panel-label-right">{right}</span> : null}
      </div>
      <div className={`os-panel-body ${bodyClass}`} style={innerPadding ? undefined : { padding: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ── Clock hook ────────────────────────────────────────────────────────────
function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function greeting(name) {
  const h = new Date().getHours();
  const n = name || 'You';
  if (h < 5)  return { part: 'Still up,',    name: n };
  if (h < 12) return { part: 'Good morning,', name: n };
  if (h < 17) return { part: 'Good afternoon,', name: n };
  if (h < 21) return { part: 'Good evening,', name: n };
  return { part: 'Night,', name: n };
}

function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

// ── Panel: Profile ────────────────────────────────────────────────────────
export function OsProfilePanel({ profile, onSaveName, onSaveTagline, onUploadPhoto }) {
  const tier = 'Focus'; // TODO: wire to a real status/DND toggle later
  return (
    <OsPanel label="Operator" right="Online" innerPadding={false}>
      <div className="os-profile">
        <div className="os-profile-photo" onClick={() => document.getElementById('osPhotoInput').click()}>
          {profile.photo
            ? <img src={profile.photo} alt="Profile" />
            : <div className="os-profile-photo-placeholder">🖼</div>}
        </div>
        <input
          id="osPhotoInput"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onUploadPhoto}
        />
        <div className="os-profile-info">
          <input
            className="os-profile-name"
            type="text"
            placeholder="Your name"
            defaultValue={profile.name}
            onChange={e => onSaveName(e.target.value)}
          />
          <input
            className="os-profile-tagline"
            type="text"
            placeholder="tagline…"
            defaultValue={profile.tagline}
            onChange={e => onSaveTagline(e.target.value)}
          />
          <div className="os-profile-status">
            <span className="os-status-badge">{tier}</span>
          </div>
        </div>
      </div>
    </OsPanel>
  );
}

// ── Panel: Session (greeting + clock) ─────────────────────────────────────
export function OsSessionPanel({ name }) {
  const time = useClock();
  const h = pad2(time.getHours());
  const m = pad2(time.getMinutes());
  const s = pad2(time.getSeconds());
  const { part, name: who } = greeting(name);
  const dateStr = time.toLocaleDateString('en-GB', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase();

  return (
    <OsPanel label="Session" right={`Day ${dayOfYear(time)} of ${time.getFullYear()}`} innerPadding={false}>
      <div className="os-session">
        <div>
          <div className="os-session-greeting">
            {part} <em>{who}.</em>
          </div>
          <div className="os-session-date">{dateStr}</div>
        </div>
        <div className="os-session-clock">
          {h}<span className="os-session-clock-sep">:</span>{m}
          <span className="os-session-clock-secs">{s}</span>
        </div>
      </div>
    </OsPanel>
  );
}

// ── Panel: Vitals (coins + streak + level) ────────────────────────────────
export function OsVitalsPanel({ coins = 0, streak = 0, level = 1 }) {
  const coinTierCap = level * 500;
  const pct = Math.min(100, Math.round((coins % coinTierCap) / coinTierCap * 100));

  return (
    <OsPanel label="Vitals" right="Live" innerPadding={false}>
      <div className="os-vitals">
        <div>
          <div className="os-vitals-hero">
            <span className="os-vitals-val gold">{coins.toLocaleString()}</span>
            <span className="os-vitals-unit">coins</span>
          </div>
          <div className="os-vitals-label">Total balance</div>
        </div>
        <div className="os-vitals-track">
          <div className="os-vitals-fill gold" style={{ width: `${pct}%` }} />
        </div>
        <div className="os-vitals-divider" />
        <div className="os-vitals-mini-row">
          <div className="os-vitals-mini">
            <div className="os-vitals-hero">
              <span className="os-vitals-val green">{streak}</span>
              <span className="os-vitals-unit">d</span>
            </div>
            <div className="os-vitals-label">Streak</div>
          </div>
          <div className="os-vitals-mini">
            <div className="os-vitals-hero">
              <span className="os-vitals-val">{level}</span>
            </div>
            <div className="os-vitals-label">Level</div>
          </div>
        </div>
      </div>
    </OsPanel>
  );
}

// ── Panel: Quick Actions ──────────────────────────────────────────────────
export function OsActionsPanel({ onAddWidget, onSort, onNavigateSettings }) {
  return (
    <OsPanel label="Actions" innerPadding={false}>
      <div className="os-actions">
        <motion.button className="os-action-btn primary" onClick={onAddWidget}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          ＋ Add widget
        </motion.button>
        <motion.button className="os-action-btn" onClick={onSort}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          ⊞ Sort
        </motion.button>
        <motion.button className="os-action-btn" onClick={onNavigateSettings}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          ⚙ Settings
        </motion.button>
      </div>
    </OsPanel>
  );
}

// ── Panel: Trackers Mini ──────────────────────────────────────────────────
export function OsTrackersPanel({ trackers, logs }) {
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  })();

  const rows = (trackers || []).slice(0, 5).map(t => {
    const v = logs?.[today]?.[t.id];
    if (t.type === 'boolean') {
      return { t, hit: !!v, label: v ? '✓ Done' : '—' };
    }
    const n = Number(v) || 0;
    return { t, hit: t.goal && n >= t.goal, label: `${n}${t.unit || ''}` };
  });

  return (
    <OsPanel label="Trackers" right={rows.length ? 'Today' : ''}>
      <div className="os-trackers-mini">
        {rows.length === 0 ? (
          <div className="os-habits-empty">No trackers set up yet.</div>
        ) : rows.map(({ t, hit, label }) => (
          <div key={t.id} className="os-tracker-row">
            <span className="os-tracker-name">{t.name}</span>
            <span className={`os-tracker-pill ${hit ? 'hit' : ''}`}>{label}</span>
          </div>
        ))}
      </div>
    </OsPanel>
  );
}

// ── Panel: Widgets Canvas (reuses imperative canvas from HubSection) ──────
// The actual imperative rendering is mounted by the parent via a ref. We
// just provide the panel shell and let the parent stuff the canvas into it.
export const OsWidgetsPanel = ({ canvasRef }) => (
  <div className="os-panel os-widgets">
    <div className="os-panel-label">
      <span className="os-panel-label-text">Widgets</span>
      <span className="os-panel-label-right">Canvas</span>
    </div>
    <div id="widgetCanvas" className="os-widgets-body hub-links-col" ref={canvasRef}></div>
  </div>
);

// ── Panel: Habits Mini ────────────────────────────────────────────────────
export function OsHabitsPanel({ habits }) {
  const safe = habits || [];

  const DAY = 86_400_000;

  const summaries = safe.slice(0, 5).map(h => {
    const days = Math.floor((Date.now() - (h.startTime || Date.now())) / DAY);
    const relapses = h.relapseCount || 0;
    const avgBetween = relapses > 0 ? days / (relapses + 1) : Infinity;
    const danger = relapses > 0 && avgBetween < 7;
    return { h, days, danger };
  });

  return (
    <OsPanel label="Habits" right={safe.length ? `${safe.length} tracked` : ''}>
      <div className="os-habits-mini">
        {summaries.length === 0 ? (
          <div className="os-habits-empty">No habits yet.</div>
        ) : summaries.map(({ h, days, danger }) => (
          <div key={h.id} className="os-habit-row">
            <span className={`os-habit-dot ${danger ? 'danger' : ''}`} />
            <span className="os-habit-name">{h.name}</span>
            <span className="os-habit-streak">{days}d</span>
          </div>
        ))}
      </div>
    </OsPanel>
  );
}

// ── Panel: QuickLog wrapper ───────────────────────────────────────────────
export function OsQuickLogPanel({ S, update, onNavigateTrack, onShowCoinToast }) {
  return (
    <OsPanel label="Nutrition Log" innerPadding={false}>
      <div className="os-panel-body os-quicklog-body">
        <QuickLog S={S} update={update} onNavigateTrack={onNavigateTrack} onShowCoinToast={onShowCoinToast} />
      </div>
    </OsPanel>
  );
}

// ── Panel: AI Coach wrapper ───────────────────────────────────────────────
export function OsCoachPanel({ S, update, onOpenWaitlist, onCoachAct }) {
  return (
    <OsPanel label="AI Coach" right="Brief" innerPadding={false}>
      <div className="os-panel-body os-coach-body">
        <AiCoachWidget S={S} update={update} onOpenWaitlist={onOpenWaitlist} onCoachAct={onCoachAct} />
        <CoachBriefPanel S={S} update={update} onCoachAct={onCoachAct} />
      </div>
    </OsPanel>
  );
}

// ── Panel: Activity strip ─────────────────────────────────────────────────
export function OsActivityPanel({ S }) {
  const latestCoins = (S.coinHistory || []).slice(-3).reverse();
  const habitCount = (S.habits || []).length;
  const streak = S.currentStreak || 0;

  return (
    <OsPanel label="Activity" innerPadding={false}>
      <div className="os-activity">
        {streak > 0 && (
          <div className="os-activity-item">
            <div className="os-activity-dot live" />
            <div className="os-activity-text"><strong>Streak</strong> · {streak} days</div>
          </div>
        )}
        {(S.coins || 0) > 0 && (
          <div className="os-activity-item">
            <div className="os-activity-dot gold" />
            <div className="os-activity-text"><strong>{(S.coins || 0).toLocaleString()} coins</strong> · balance</div>
          </div>
        )}
        {habitCount > 0 && (
          <div className="os-activity-item">
            <div className="os-activity-dot" />
            <div className="os-activity-text"><strong>{habitCount}</strong> habits tracked</div>
          </div>
        )}
        {latestCoins.slice(0, 1).map((c, i) => (
          <div key={i} className="os-activity-item">
            <div className="os-activity-dot" />
            <div className="os-activity-text">
              Last reward · <strong>+{c.amount || c.coins || 0}</strong>
            </div>
          </div>
        ))}
        <div className="os-activity-meta">
          {new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }).toUpperCase()}
        </div>
      </div>
    </OsPanel>
  );
}

// ── Main OS layout ────────────────────────────────────────────────────────
export default function HubOsLayout({
  S, update, canvasRef,
  onAddWidget, onSort, onNavigateSettings, onNavigateTrack,
  onShowCoinToast, onOpenWaitlist, onCoachAct,
  onUploadPhoto,
}) {
  const profile = S.profile || {};
  const coins = S.coins || 0;
  const streak = S.currentStreak || 0;
  const level = Math.max(1, Math.floor(coins / 500) + 1);

  return (
    <div className="hub-os">
      {/* ── TOP ROW ── */}
      <div className="hub-os-top">
        <OsProfilePanel
          profile={profile}
          onSaveName={name => update(prev => ({ ...prev, profile: { ...prev.profile, name } }))}
          onSaveTagline={tagline => update(prev => ({ ...prev, profile: { ...prev.profile, tagline } }))}
          onUploadPhoto={onUploadPhoto}
        />
        <OsSessionPanel name={profile.name} />
        <OsVitalsPanel coins={coins} streak={streak} level={level} />
      </div>

      {/* ── MAIN ROW ── */}
      <div className="hub-os-main">
        {/* Left col: actions + trackers mini */}
        <div className="os-col">
          <OsActionsPanel
            onAddWidget={onAddWidget}
            onSort={onSort}
            onNavigateSettings={onNavigateSettings}
          />
          <OsTrackersPanel trackers={S.trackers} logs={S.logs} />
        </div>

        {/* Middle: imperative widgets canvas */}
        <OsWidgetsPanel canvasRef={canvasRef} />

        {/* Right col: habits mini, quicklog, ai coach */}
        <div className="os-col">
          <OsHabitsPanel habits={S.habits} />
          <OsQuickLogPanel S={S} update={update}
            onNavigateTrack={onNavigateTrack}
            onShowCoinToast={onShowCoinToast} />
          <OsCoachPanel S={S} update={update}
            onOpenWaitlist={onOpenWaitlist}
            onCoachAct={onCoachAct} />
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="hub-os-bottom">
        <OsActivityPanel S={S} />
      </div>
    </div>
  );
}
