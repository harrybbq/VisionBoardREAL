import ProGate from './ProGate';

// ── Insight generator ─────────────────────────────────────────────────────
function generateInsight(S) {
  const name = S.profile?.name?.split(' ')[0] || 'You';
  const coins = S.coins || 0;
  const completedAchs = (S.achievements || []).filter(a => a.completed).length;
  const totalAchs = (S.achievements || []).length;
  const habits = S.habits || [];
  const trackers = S.trackers || [];

  // Pick the most contextually relevant insight
  if (completedAchs > 0 && completedAchs === totalAchs && totalAchs > 0) {
    return `${name}, you've completed every achievement on your board — it's time to dream bigger and set new milestones that push you further.`;
  }
  if (coins >= 200) {
    return `${name}, your coin balance of ${coins} shows real consistency — each coin represents a habit kept or a goal hit. Keep the streak going.`;
  }
  if (habits.length > 0) {
    const h = habits[0];
    const daysSince = Math.floor((Date.now() - h.startTime) / 86400000);
    if (daysSince >= 7) {
      return `${name}, ${daysSince} days into your "${h.name}" habit — the hardest part is over. Consistency this week will cement it for good.`;
    }
    return `${name}, you've started tracking "${h.name}" — the first week defines the pattern. Show up every day this week.`;
  }
  if (completedAchs > 0) {
    return `${name}, ${completedAchs} of ${totalAchs} achievements complete. The next one won't complete itself — pick one and take a step today.`;
  }
  if (trackers.length > 0) {
    const t = trackers[0];
    return `${name}, you're tracking "${t.name}" — data without action is just numbers. What's one thing you can do today to move the needle?`;
  }
  return `${name}, your board is set — now the work begins. Small daily actions compound into the life you're building here.`;
}

// ── Teaser overlay (pre-launch) ───────────────────────────────────────────
function AiCoachTeaser({ insight, onJoinWaitlist }) {
  const words = insight.split(' ');
  const hook = words.slice(0, 5).join(' ');
  const rest = words.slice(5).join(' ');

  return (
    <div className="card ai-coach-card">
      <div className="ai-coach-header">
        <span className="ai-coach-icon">✦</span>
        <span className="ai-coach-title">AI Coach</span>
      </div>

      {/* Insight text — blurred except first 5 words */}
      <div className="ai-coach-insight-wrap">
        <p className="ai-coach-insight">
          <span className="ai-coach-hook">{hook}</span>
          {rest && <span className="ai-coach-blurred"> {rest}</span>}
        </p>
      </div>

      {/* Frosted glass overlay */}
      <div className="ai-coach-overlay">
        <span className="ai-coach-overlay-icon">✦</span>
        <div className="ai-coach-overlay-title">AI Coach — coming soon</div>
        <div className="ai-coach-overlay-sub">Join the waitlist to be first to know</div>
        <button className="btn btn-primary ai-coach-cta" onClick={onJoinWaitlist}>
          Join Waitlist
        </button>
      </div>
    </div>
  );
}

// ── Upgrade CTA (post-launch) ─────────────────────────────────────────────
function AiCoachUpgradeCta({ insight, onUpgrade }) {
  const words = insight.split(' ');
  const hook = words.slice(0, 5).join(' ');
  const rest = words.slice(5).join(' ');

  return (
    <div className="card ai-coach-card">
      <div className="ai-coach-header">
        <span className="ai-coach-icon">✦</span>
        <span className="ai-coach-title">AI Coach</span>
      </div>
      <div className="ai-coach-insight-wrap">
        <p className="ai-coach-insight">
          <span className="ai-coach-hook">{hook}</span>
          {rest && <span className="ai-coach-blurred"> {rest}</span>}
        </p>
      </div>
      <div className="ai-coach-overlay">
        <span className="ai-coach-overlay-icon">✦</span>
        <div className="ai-coach-overlay-title">Upgrade to Pro</div>
        <div className="ai-coach-overlay-sub">Unlock personalised AI coaching</div>
        <button className="btn btn-primary ai-coach-cta" onClick={onUpgrade}>
          Upgrade
        </button>
      </div>
    </div>
  );
}

// ── Full widget (Pro users) ───────────────────────────────────────────────
function AiCoachFull({ insight }) {
  return (
    <div className="card ai-coach-card ai-coach-full">
      <div className="ai-coach-header">
        <span className="ai-coach-icon">✦</span>
        <span className="ai-coach-title">AI Coach</span>
        <span className="ai-coach-pro-badge">Pro</span>
      </div>
      <p className="ai-coach-insight ai-coach-insight-full">{insight}</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function AiCoachWidget({ S, onOpenWaitlist }) {
  const insight = generateInsight(S);

  return (
    <ProGate
      teaser={<AiCoachTeaser insight={insight} onJoinWaitlist={onOpenWaitlist} />}
      upgradeCta={<AiCoachUpgradeCta insight={insight} onUpgrade={() => {}} />}
    >
      <AiCoachFull insight={insight} />
    </ProGate>
  );
}
