import FriendsHeatmap from './FriendsHeatmap';

/**
 * Expanded "cheerleader" view of a single friend.
 *
 * Sections (top-to-bottom):
 *   1. Header — avatar, name, @handle, Lvl badge
 *   2. Streak strip — big number + habit name OR a quiet "last active"
 *      line for friends without an active streak (no shaming language)
 *   3. 91-day activity heatmap (with hover tooltip)
 *   4. Recent wins — chips for the last few completed achievements
 *
 * The shape of the `friend` prop mirrors what we'll later receive from
 * Supabase (see future_ideas — Sprint 3 schema). Names match the
 * eventual `public_stats` row + a denormalised display blob, so this
 * component won't need restructuring when real data lands.
 */

const COLORS = ['#1a7a4a', '#2563eb', '#7c3aed', '#c2410c', '#0891b2', '#be185d', '#854d0e'];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return COLORS[h % COLORS.length];
}

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function FriendCard({ friend, loading = false, statsMissing = false }) {
  if (!friend) return null;
  const hasStreak = friend.streak > 0;
  const hasHeatmap = Array.isArray(friend.heatmap) && friend.heatmap.length > 0;

  return (
    <div className="fc-card">
      {/* Header */}
      <div className="fc-header">
        <div className="fc-avatar-wrap">
          <div className="fc-avatar" style={{ background: avatarColor(friend.name) }}>
            {initials(friend.name)}
          </div>
          {friend.online && <div className="fc-online-dot" />}
        </div>
        <div className="fc-identity">
          <div className="fc-name">{friend.name}</div>
          <div className="fc-meta-row">
            <span className="fc-handle">@{friend.handle}</span>
            <span className="fc-level">Lvl {friend.level}</span>
          </div>
        </div>
      </div>

      <div className="fc-divider" />

      {/* Streak strip */}
      {hasStreak ? (
        <div className="fc-streak-row">
          <span className="fc-streak-num">{friend.streak}</span>
          <div className="fc-streak-body">
            <span className="fc-streak-label">Day streak</span>
            <span className="fc-streak-habit">{friend.streakHabit}</span>
          </div>
        </div>
      ) : (
        <div className="fc-streak-quiet">
          {loading
            ? 'Loading activity…'
            : friend.lastSeenDays != null
              ? `Last active ${friend.lastSeenDays} days ago`
              : 'No active streak'}
        </div>
      )}

      <div className="fc-divider" />

      {/* Activity heatmap. When the friend hasn't published stats yet
          (e.g. just signed up, or is on an older client) we show a
          calm placeholder rather than an empty grid. */}
      {hasHeatmap ? (
        <FriendsHeatmap days={friend.heatmap} />
      ) : (
        <div className="fc-heatmap-wrap">
          <div className="fc-heatmap-title">
            <span>Activity · 3 months</span>
          </div>
          <div className="fc-heatmap-empty">
            {loading ? 'Loading…' : statsMissing ? 'No activity to share yet.' : ''}
          </div>
        </div>
      )}

      <div className="fc-divider" />

      {/* Recent wins */}
      <div className="fc-wins-wrap">
        <div className="fc-wins-label">Recent wins</div>
        {(friend.wins && friend.wins.length > 0) ? (
          <div className="fc-wins-chips">
            {friend.wins.map((w, i) => (
              <div key={i} className="fc-win-chip">
                <span className="fc-win-chip-icon">{w.icon}</span>
                {w.name}
              </div>
            ))}
          </div>
        ) : (
          <div className="fc-empty-wins">{loading ? 'Loading…' : 'None yet'}</div>
        )}
      </div>
    </div>
  );
}
