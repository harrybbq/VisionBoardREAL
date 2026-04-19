import { useMemo } from 'react';
import ProGate from './ProGate';
import { pickInsight, allInsights } from '../lib/coach/heuristics';

// ── Insight wrapper ───────────────────────────────────────────────────────
// Returns { title, body, verb? } so all UI variants render the same shape.
function useCurrentInsight(S) {
  return useMemo(() => {
    const seen = (S.coachSeen || []).slice(-30); // last 30 insight IDs
    return pickInsight(S, seen);
  }, [S]);
}

function flattenForLegacy(insight) {
  if (!insight) return 'Your board is set. Small daily actions compound.';
  return `${insight.title}. ${insight.body}`;
}

// ── Compact teaser banner (pre-launch) ───────────────────────────────────
function AiCoachBanner({ insight, onJoinWaitlist }) {
  const text = flattenForLegacy(insight);
  const words = text.split(' ');
  const hook = words.slice(0, 5).join(' ');
  const rest = words.slice(5).join(' ');

  return (
    <div className="ai-coach-banner">
      <span className="ai-coach-banner-icon">✦</span>
      <div className="ai-coach-banner-body">
        <span className="ai-coach-banner-label">AI Coach</span>
        <span className="ai-coach-banner-insight">
          {hook}
          {rest && <span className="ai-coach-banner-blurred"> {rest}</span>}
        </span>
      </div>
      <button className="btn btn-primary ai-coach-banner-btn" onClick={onJoinWaitlist}>
        Join Waitlist
      </button>
    </div>
  );
}

// ── Compact upgrade CTA (post-launch) ────────────────────────────────────
function AiCoachUpgradeBanner({ insight }) {
  const text = flattenForLegacy(insight);
  const words = text.split(' ');
  const hook = words.slice(0, 5).join(' ');
  const rest = words.slice(5).join(' ');

  return (
    <div className="ai-coach-banner">
      <span className="ai-coach-banner-icon">✦</span>
      <div className="ai-coach-banner-body">
        <span className="ai-coach-banner-label">AI Coach</span>
        <span className="ai-coach-banner-insight">
          {hook}
          {rest && <span className="ai-coach-banner-blurred"> {rest}</span>}
        </span>
      </div>
      <button className="btn btn-primary ai-coach-banner-btn">
        Upgrade to Pro
      </button>
    </div>
  );
}

// ── Full insight (Pro users) ──────────────────────────────────────────────
function AiCoachFull({ insight, onAct, onDismiss }) {
  if (!insight) return null;
  return (
    <div className="ai-coach-banner ai-coach-banner-pro">
      <span className="ai-coach-banner-icon">✦</span>
      <div className="ai-coach-banner-body">
        <span className="ai-coach-banner-label">
          AI Coach <span className="ai-coach-pro-badge">Pro</span>
        </span>
        <span className="ai-coach-banner-insight-full">
          <strong>{insight.title}.</strong> {insight.body}
        </span>
        {insight.verb && onAct && (
          <button
            className="btn btn-primary ai-coach-verb-btn"
            onClick={() => onAct(insight.verb, insight.id)}
          >
            {insight.verb.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          className="ai-coach-dismiss"
          onClick={() => onDismiss(insight.id)}
          title="Dismiss"
          aria-label="Dismiss insight"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function AiCoachWidget({ S, update, onOpenWaitlist, onCoachAct }) {
  const insight = useCurrentInsight(S);

  function recordSeen(id) {
    if (!update || !id) return;
    update(prev => ({
      ...prev,
      coachSeen: [...(prev.coachSeen || []).slice(-29), id],
    }));
  }

  function handleAct(verb, id) {
    recordSeen(id);
    if (onCoachAct) onCoachAct(verb);
  }

  return (
    <ProGate
      teaser={<AiCoachBanner insight={insight} onJoinWaitlist={onOpenWaitlist} />}
      upgradeCta={<AiCoachUpgradeBanner insight={insight} />}
    >
      <AiCoachFull insight={insight} onAct={handleAct} onDismiss={recordSeen} />
    </ProGate>
  );
}

// Re-export for the dedicated coach panel (step 2 daily-brief UI)
export { useCurrentInsight, allInsights };
