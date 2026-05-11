/**
 * RatingsPanel — F5 Sprint 3 surface.
 *
 * Displays the user's OVR (1-99) prominently with the four category
 * ratings below it. Tapping any category opens a breakdown modal
 * showing where the points came from (anti-confusion, anti-cheating
 * transparency).
 *
 * Reads from S.ratings (local, refreshed by useRatings hook on 1.5s
 * debounce). The friend-visible canonical truth lives on
 * profiles.ratings server-side (Netlify recompute fn) — friends'
 * cards read that, not S.ratings.
 */
import { useState } from 'react';
import { categoryBreakdown } from '../lib/ratings/derive';

const CATEGORY_META = {
  brain:   { label: 'Brain',    icon: '🧠', accent: '#7a5acc' },
  finance: { label: 'Finance',  icon: '💰', accent: '#c8970a' },
  fitness: { label: 'Fitness',  icon: '💪', accent: '#1a7a4a' },
  social:  { label: 'Social',   icon: '◌',  accent: '#4d9ec4' },
};

function tier(score) {
  if (score >= 85) return { label: 'Elite',     color: '#c8970a' };
  if (score >= 70) return { label: 'High',      color: '#2a9e62' };
  if (score >= 50) return { label: 'Mid',       color: '#4dc485' };
  if (score >= 25) return { label: 'Rising',    color: '#9a958c' };
  return                  { label: 'Starting',  color: '#5a5650' };
}

export default function RatingsPanel({ S, compact = false }) {
  const r = S.ratings || {};
  const [activeBreakdown, setActiveBreakdown] = useState(null);
  const ovr = r.ovr || 1;
  const ovrTier = tier(ovr);

  const cats = ['brain', 'finance', 'fitness', 'social']
    .map(id => ({ id, score: r[id] || 1, ...CATEGORY_META[id] }))
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <div className={`ratings-panel${compact ? ' ratings-panel-compact' : ''}`}>
        <div className="ratings-ovr">
          <div className="ratings-ovr-value" style={{ color: ovrTier.color }}>{ovr}</div>
          <div className="ratings-ovr-meta">
            <div className="ratings-ovr-label">OVR</div>
            <div className="ratings-ovr-tier" style={{ color: ovrTier.color }}>{ovrTier.label}</div>
          </div>
        </div>
        <div className="ratings-grid">
          {cats.map(c => {
            const t = tier(c.score);
            return (
              <button
                key={c.id}
                type="button"
                className="ratings-tile"
                onClick={() => setActiveBreakdown(c.id)}
                title={`${c.label} ${c.score} (${t.label}) — tap for breakdown`}
              >
                <span className="ratings-tile-icon">{c.icon}</span>
                <span className="ratings-tile-score" style={{ color: t.color }}>{c.score}</span>
                <span className="ratings-tile-label">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeBreakdown && (
        <BreakdownModal
          S={S}
          category={activeBreakdown}
          onClose={() => setActiveBreakdown(null)}
        />
      )}
    </>
  );
}

function BreakdownModal({ S, category, onClose }) {
  const meta = CATEGORY_META[category];
  const score = (S.ratings || {})[category] || 1;
  const t = tier(score);
  const rows = categoryBreakdown(S, category);
  const totalPoints = rows.reduce((sum, r) => sum + (r.points || 0), 0);

  return (
    <div
      className="modal-overlay open"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{meta.icon}</span>
          {meta.label}
          <span style={{
            marginLeft: 'auto',
            fontFamily: 'var(--mono)',
            fontSize: 26,
            color: t.color,
          }}>{score}</span>
        </h3>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)',
          margin: '0 0 14px', lineHeight: 1.65,
        }}>
          Tier: <span style={{ color: t.color }}>{t.label}</span>. Built from {totalPoints.toFixed(1)} rating points across these sources:
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, i) => {
            const pct = totalPoints > 0 ? (row.points / totalPoints) * 100 : 0;
            return (
              <li key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--card, rgba(255,255,255,0.04))',
                border: '1px solid var(--border)',
              }}>
                <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 12.5 }}>{row.label}</span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: row.points > 0 ? 'var(--em)' : 'var(--text-muted)',
                  fontWeight: 700,
                  minWidth: 50, textAlign: 'right',
                }}>
                  {row.points.toFixed(1)} pt
                </span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  color: 'var(--text-muted)',
                  minWidth: 36, textAlign: 'right',
                }}>{pct.toFixed(0)}%</span>
              </li>
            );
          })}
        </ul>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)',
          marginTop: 14, lineHeight: 1.65,
        }}>
          Friends see a server-recomputed copy of these ratings — editing your local data won't change what they see.
        </p>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
