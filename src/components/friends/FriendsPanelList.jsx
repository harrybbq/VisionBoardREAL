import FriendListRow from './FriendListRow';

/**
 * Compact panel housing the friend list. Header carries the section
 * label ("// Friends") and an at-a-glance online counter; body is a
 * column of FriendListRow buttons.
 *
 * Selection is owned by the parent so the same state can drive both
 * "this row is highlighted" and "render this friend's expanded card
 * below the panel".
 */
export default function FriendsPanelList({ friends, selectedId, onSelect }) {
  const onlineCount = friends.filter(f => f.online).length;

  return (
    <div className="fc-panel">
      <div className="fc-panel-head">
        <span className="fc-panel-label">Friends</span>
        <span className="fc-panel-meta">{onlineCount} online</span>
      </div>
      {friends.length === 0 ? (
        <div className="fc-panel-empty">
          Add a friend by their @handle to compare progress.
        </div>
      ) : (
        <div className="fc-panel-body">
          {friends.map(f => (
            <FriendListRow
              key={f.id}
              friend={f}
              selected={f.id === selectedId}
              onClick={() => onSelect(f.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
