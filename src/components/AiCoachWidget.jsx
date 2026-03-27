import ProGate from './ProGate';

// ── Insight generator ─────────────────────────────────────────────────────
function generateInsight(S) {
  const name = S.profile?.name?.split(' ')[0] || 'You';
  const coins = S.coins || 0;
  const completedAchs = (S.achievements || []).filter(a => a.completed).length;
  const totalAchs = (S.achievements || []).length;
  const habits = S.habits || [];
  const trackers = S.trackers || [];

  if (completedAchs > 0 && completedAchs === totalAchs && totalAchs > 0) {
    return `${name}, you've completed every achievement — time to dream bigger and set new goals.`;
  }
  if (coins >= 200) {
    return `${name}, your coin balance of ${coins} shows real consistency. Keep the streak going.`;
  }
  if (habits.length > 0) {
    const daysSince = Math.floor((Date.now() - habits[0].startTime) / 86400000);
    if (daysSince >= 7) {
      return `${name}, ${daysSince} days into "${habits[0].name}" — the hardest part is behind you.`;
    }
    return `${name}, you've started "${habits[0].name}" — show up every day this week.`;
  }
  if (completedAchs > 0) {
    return `${name}, ${completedAchs} of ${totalAchs} achievements done. Pick one and take a step today.`;
  }
  if (trackers.length > 0) {
    return `${name}, you're tracking "${trackers[0].name}" — what's one action you can take today?`;
  }
  return `${name}, your board is set. Small daily actions compound into the life you're building here.`;
}

// ── Compact teaser banner (pre-launch) ───────────────────────────────────
function AiCoachBanner({ insight, onJoinWaitlist }) {
  const words = insight.split(' ');
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
  const words = insight.split(' ');
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
function AiCoachFull({ insight }) {
  return (
    <div className="ai-coach-banner ai-coach-banner-pro">
      <span className="ai-coach-banner-icon">✦</span>
      <div className="ai-coach-banner-body">
        <span className="ai-coach-banner-label">AI Coach <span className="ai-coach-pro-badge">Pro</span></span>
        <span className="ai-coach-banner-insight-full">{insight}</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function AiCoachWidget({ S, onOpenWaitlist }) {
  const insight = generateInsight(S);

  return (
    <ProGate
      teaser={<AiCoachBanner insight={insight} onJoinWaitlist={onOpenWaitlist} />}
      upgradeCta={<AiCoachUpgradeBanner insight={insight} />}
    >
      <AiCoachFull insight={insight} />
    </ProGate>
  );
}
