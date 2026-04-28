import { useEffect, useMemo, useState } from 'react';
import FriendsPanelList from './FriendsPanelList';
import FriendCard from './FriendCard';
import PendingRequestsList from './PendingRequestsList';
import HandleClaimModal from './HandleClaimModal';
import AddFriendModal from './AddFriendModal';
import { useFriends } from '../../lib/friends/useFriends';
import { getFriendPublicStats } from '../../lib/friends/queries';
import { useSubscriptionContext } from '../../context/SubscriptionContext';

/**
 * Friends rail — orchestrates everything social on the cream hub:
 *   - Loads the user's profile, friends, and pending requests.
 *   - Gates the rail behind the handle-claim modal (lazy claim).
 *   - Owns the "selected friend" state and fetches their
 *     public_stats on demand.
 *   - Wires the Add modal and pending request mutations.
 *
 * The rail is intentionally graceful when the migrations haven't
 * been applied yet — useFriends absorbs the load error and the rail
 * shows an offline message instead of crashing.
 */
export default function FriendsRail({ userId, onUpgrade }) {
  const { hasPro } = useSubscriptionContext();
  const friends = useFriends(userId, hasPro);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState(null);

  // ── derived sets (used by AddFriendModal to suppress duplicates) ──
  const friendIds = useMemo(() => new Set(friends.friends.map(f => f.id)), [friends.friends]);
  const pendingIds = useMemo(() => new Set(friends.pending.map(p => p.id)), [friends.pending]);

  // ── fetch the selected friend's public_stats on demand ──
  // We do NOT preload all friends' stats — that's an N+1 over the
  // friend list. Loading per-click matches the use case (you look at
  // one friend at a time) and keeps the initial render snappy.
  useEffect(() => {
    if (!selectedId) { setSelectedStats(null); return; }
    let cancelled = false;
    setStatsLoading(true);
    getFriendPublicStats(selectedId)
      .then(stats => { if (!cancelled) setSelectedStats(stats || null); })
      .catch(()    => { if (!cancelled) setSelectedStats(null); })
      .finally(()  => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  function handleSelect(id) {
    setSelectedId(prev => (prev === id ? null : id));
  }

  // The selected friend assembled from the list row + their public_stats.
  // FriendCard expects a single `friend` prop, so we merge here rather
  // than threading two props down.
  const selectedFriend = useMemo(() => {
    if (!selectedId) return null;
    const base = friends.friends.find(f => f.id === selectedId);
    if (!base) return null;
    return {
      id: base.id,
      name: base.display_name || `@${base.handle}`,
      handle: base.handle,
      level: base.level || 1,
      online: false, // presence layer not wired yet — slot reserved
      streak: selectedStats?.current_streak || 0,
      streakHabit: selectedStats?.streak_habit || null,
      heatmap: selectedStats?.heatmap_days || [],
      wins: selectedStats?.recent_wins || [],
      // For the quiet-state copy. last_active_at lives on profiles
      // (not public_stats) — Sprint 4+ can plumb it through; for now
      // we just hide the line if no streak.
      lastSeenDays: null,
    };
  }, [selectedId, friends.friends, selectedStats]);

  // ── friend list row shape (FriendListRow expects the mock shape) ──
  const rows = useMemo(() => friends.friends.map(f => ({
    id: f.id,
    name: f.display_name || `@${f.handle}`,
    handle: f.handle,
    level: f.level || 1,
    online: false,
    streak: 0,           // populated lazily via selectedStats; rows show handle as fallback
    streakHabit: null,
    lastSeenDays: null,
  })), [friends.friends]);

  // ── handle claim gating ──
  // If the user has no handle yet, the rail itself is locked behind a
  // friendly empty state with a "Claim handle" CTA.
  const needsHandle = friends.ownProfile && !friends.ownProfile.handle;

  if (friends.loading) {
    return <div className="fc-panel"><div className="fc-panel-empty">Loading friends…</div></div>;
  }

  if (friends.error && !friends.ownProfile) {
    // Most common cause: migrations not yet applied locally. Fail
    // open with a hint so the rest of the hub still works.
    return (
      <div className="fc-panel">
        <div className="fc-panel-empty">
          Friends features aren't ready on this server yet.
        </div>
      </div>
    );
  }

  if (needsHandle) {
    return (
      <>
        <div className="fc-panel">
          <div className="fc-panel-head">
            <span className="fc-panel-label">Friends</span>
          </div>
          <div className="fc-panel-empty">
            Pick a handle so friends can find you.
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowHandleModal(true)}
              >
                Claim handle
              </button>
            </div>
          </div>
        </div>
        <HandleClaimModal
          open={showHandleModal}
          userId={userId}
          suggested={(friends.ownProfile?.display_name || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)}
          onClaim={async (updated) => {
            friends.setOwnProfile(updated);
            await friends.refresh();
          }}
          onClose={() => setShowHandleModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <PendingRequestsList
        pending={friends.pending}
        busyId={busyRequestId}
        onAccept={async id => {
          setBusyRequestId(id);
          try { await friends.accept(id); }
          catch { /* useFriends.refresh would catch + reset state */ }
          finally { setBusyRequestId(null); }
        }}
        onDecline={async id => {
          setBusyRequestId(id);
          try { await friends.decline(id); }
          catch { /* same */ }
          finally { setBusyRequestId(null); }
        }}
      />

      <FriendsPanelList
        friends={rows}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      {/* Add-friend CTA — lives below the list so it doesn't compete
          with the list when there are friends to look at. */}
      <button
        type="button"
        className="btn btn-ghost fc-add-btn"
        onClick={() => setShowAddModal(true)}
      >
        + Add a friend
      </button>

      {selectedFriend && (
        <FriendCard
          friend={selectedFriend}
          loading={statsLoading}
          statsMissing={!selectedStats && !statsLoading}
        />
      )}

      <AddFriendModal
        open={showAddModal}
        atCap={friends.atCap}
        pendingIds={pendingIds}
        friendIds={friendIds}
        onSearch={friends.search}
        onSend={async (toUserId) => { await friends.send(toUserId); }}
        onClose={() => setShowAddModal(false)}
        onUpgrade={onUpgrade}
      />
    </>
  );
}
