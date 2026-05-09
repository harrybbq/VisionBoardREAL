/**
 * SavingsList — F4 Sprint 2.
 *
 * Renders the user's named monetary goals as cards inside the
 * Achievements section's "Savings" tab. Each card shows:
 *   - icon + name + (optional) linked achievement chip
 *   - £current / £target with progress bar
 *   - "+ Add" button → AddContributionModal
 *   - kebab → EditSavingsGoalModal (also handles delete)
 *   - recent contributions list (3 latest, "Show all" expander)
 *
 * Privacy hard rule: this component renders amounts. Nothing else
 * should — the AI Coach snapshot, public_stats, and friends UI all
 * see savings as count + names only, never £ figures.
 */
import { useState } from 'react';

function formatGBP(n) {
  if (typeof n !== 'number') return '£0';
  const sign = n < 0 ? '-' : '';
  return sign + '£' + Math.abs(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function GoalCard({ goal, achievement, onAddContribution, onEdit }) {
  const [showAll, setShowAll] = useState(false);
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const done = goal.current >= goal.target;
  const contribs = goal.contributions || [];
  const visible = showAll ? contribs : contribs.slice(0, 3);

  return (
    <div className={`savings-card${done ? ' is-done' : ''}`}>
      <div className="savings-card-head">
        <span className="savings-card-icon" aria-hidden="true">{goal.icon || '💰'}</span>
        <div className="savings-card-title-block">
          <div className="savings-card-name">{goal.name}</div>
          {achievement && (
            <span className="savings-card-link" title="Linked achievement — completes when this goal hits target">
              ✦ {achievement.name}
            </span>
          )}
        </div>
        <button
          type="button"
          className="savings-card-edit"
          onClick={() => onEdit(goal.id)}
          aria-label="Edit goal"
          title="Edit goal"
        >⋯</button>
      </div>

      <div className="savings-card-amounts">
        <span className="savings-card-current">{formatGBP(goal.current)}</span>
        <span className="savings-card-target"> / {formatGBP(goal.target)}</span>
        <span className="savings-card-pct">{pct}%</span>
      </div>

      <div className="savings-card-bar">
        <div
          className="savings-card-bar-fill"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>

      <div className="savings-card-actions">
        <button
          type="button"
          className="savings-card-contribute"
          onClick={() => onAddContribution(goal.id)}
        >+ Add</button>
        <span className="savings-card-count">
          {contribs.length} contribution{contribs.length === 1 ? '' : 's'}
        </span>
      </div>

      {contribs.length > 0 && (
        <ul className="savings-card-contribs">
          {visible.map(c => (
            <li key={c.id}>
              <span className={`savings-contrib-amount${c.amount < 0 ? ' is-neg' : ''}`}>
                {c.amount > 0 ? '+' : ''}{formatGBP(c.amount)}
              </span>
              {c.note && <span className="savings-contrib-note"> — {c.note}</span>}
              <span className="savings-contrib-date">{formatDate(c.ts)}</span>
            </li>
          ))}
          {contribs.length > 3 && (
            <li className="savings-contrib-toggle">
              <button type="button" onClick={() => setShowAll(s => !s)}>
                {showAll ? 'Show less' : `Show all ${contribs.length}`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function SavingsList({ S, onOpenModal }) {
  const goals = S.savings || [];
  const achievements = S.achievements || [];

  if (goals.length === 0) {
    return (
      <div className="savings-empty">
        <div className="savings-empty-icon">💰</div>
        <div className="savings-empty-title">No savings goals yet</div>
        <p className="savings-empty-body">
          Track named goals (First Home, Wedding, Emergency Fund). Link to
          an achievement to auto-complete it when you hit target.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenModal('addSavingsGoalModal')}
        >+ New Goal</button>
      </div>
    );
  }

  // Active first, then completed at the bottom
  const sorted = [...goals].sort((a, b) => {
    const aDone = a.current >= a.target ? 1 : 0;
    const bDone = b.current >= b.target ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return (
    <div className="savings-wrap">
      <div className="savings-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenModal('addSavingsGoalModal')}
        >+ New Goal</button>
      </div>
      <div className="savings-grid">
        {sorted.map(goal => {
          const achievement = goal.achievementId
            ? achievements.find(a => a.id === goal.achievementId)
            : null;
          return (
            <GoalCard
              key={goal.id}
              goal={goal}
              achievement={achievement}
              onAddContribution={id => onOpenModal('addContributionModal:' + id)}
              onEdit={id => onOpenModal('editSavingsGoalModal:' + id)}
            />
          );
        })}
      </div>
    </div>
  );
}
