/**
 * Single row in the compact Friends panel. Renders avatar + name + a
 * short status line + a small level chip.
 *
 * Status line precedence:
 *   1. Active streak (with flame) if streak > 0
 *   2. Last-seen days if recently quiet
 *   3. Handle as a fallback identifier
 *
 * Click-to-expand is wired by the parent — the row just emits onClick.
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

function statusLine(friend) {
  if (friend.streak > 0) return `🔥 ${friend.streak}d`;
  if (friend.lastSeenDays != null) return `${friend.lastSeenDays}d ago`;
  return `@${friend.handle}`;
}

export default function FriendListRow({ friend, selected, onClick }) {
  return (
    <button
      type="button"
      className={`fc-row${selected ? ' fc-row-selected' : ''}`}
      onClick={onClick}
    >
      <div className="fc-row-avatar-wrap">
        <div className="fc-row-avatar" style={{ background: avatarColor(friend.name) }}>
          {initials(friend.name)}
        </div>
        {/* Online dot is reserved for a future presence layer — see
            future_ideas/README. We render the slot but leave it hidden
            until Realtime is wired up. Keeps card geometry stable. */}
        {friend.online && <div className="fc-row-online-dot" />}
      </div>
      <div className="fc-row-info">
        <div className="fc-row-name">{friend.name}</div>
        <div className="fc-row-status">{statusLine(friend)}</div>
      </div>
      <div className="fc-row-level">{friend.level}</div>
    </button>
  );
}
