import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { fireAchievement } from '../utils/confetti';
import SectionHelp from './SectionHelp';

/**
 * Achievement Board — React-rendered canvas of goal nodes connected by
 * SVG bezier paths.
 *
 * Three node states:
 *   active     — unlocked + incomplete (green tint, dot glow)
 *   completed  — done (gold tint, full progress strip)
 *   locked     — has incomplete parents (desaturated grey, dashed
 *                inbound connection)
 *
 * Three connection states (matching above):
 *   parent done, child not   — green fill sweep animation, then a
 *                              one-shot arrival pulse on the child
 *   both done                — solid gold
 *   parent not done          — grey dashed
 *
 * The implementation is fully declarative (was imperative DOM in the
 * pre-redesign version). Drag handling still uses refs to avoid
 * triggering re-renders on every mouse-move; we commit to state on
 * mouse-up.
 */

const FILL_DUR = 3.5; // seconds — connection fill sweep duration
const NODE_W = 260;
const NODE_HEAD_OFFSET = 44; // y-offset to mid-icon for connection anchor

// ── helpers ───────────────────────────────────────────────────────────

function allParentsComplete(achievements, connections, targetId) {
  const parents = connections.filter(([, t]) => t === targetId).map(([f]) => f);
  if (!parents.length) return true;
  return parents.every(pid => {
    const p = achievements.find(a => a.id === pid);
    return p && p.completed;
  });
}

function recalcLocks(achievements, connections) {
  return achievements.map(a => {
    const parents = connections.filter(([, t]) => t === a.id).map(([f]) => f);
    if (parents.length === 0) return { ...a, locked: false };
    return { ...a, locked: !allParentsComplete(achievements, connections, a.id) };
  });
}

// ── SVG bezier connection ────────────────────────────────────────────

function ConnPath({ from, to, fromCompleted, toCompleted, locked, connKey }) {
  if (!from || !to) return null;
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_HEAD_OFFSET;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y + NODE_HEAD_OFFSET;
  const mx = (x1 + x2) / 2;
  const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;

  // approximate path length for the fill-sweep dasharray trick
  const dx = x2 - x1, dy = y2 - y1;
  const approxLen = Math.sqrt(dx * dx + dy * dy) * 1.2;

  const bothDone = fromCompleted && toCompleted;
  const parentDone = fromCompleted && !toCompleted;

  // Re-trigger fill animation when parent flips false → true. Don't
  // re-fire when un-completing, otherwise the animation re-runs on
  // every toggle pair.
  const prevFrom = useRef(fromCompleted);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (fromCompleted && !prevFrom.current) setAnimKey(k => k + 1);
    prevFrom.current = fromCompleted;
  }, [fromCompleted]);

  const arrowAt = (color, opacity = 0.9) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ah = 9;
    const pts = [
      [x2, y2],
      [x2 - ah * Math.cos(ang - 0.45), y2 - ah * Math.sin(ang - 0.45)],
      [x2 - ah * Math.cos(ang + 0.45), y2 - ah * Math.sin(ang + 0.45)],
    ].map(p => p.join(',')).join(' ');
    return <polygon points={pts} fill={color} opacity={opacity} />;
  };

  if (locked) {
    return (
      <g>
        <path d={d} stroke="var(--ach-conn-locked)" strokeWidth="1.5"
          fill="none" strokeDasharray="5,4" opacity=".3" />
        {arrowAt('var(--ach-conn-locked)', 0.35)}
      </g>
    );
  }

  if (bothDone) {
    return (
      <g>
        <path d={d} stroke="var(--ach-conn-done)" strokeWidth="2.5"
          fill="none" opacity=".85" />
        {arrowAt('var(--ach-conn-done)', 0.9)}
      </g>
    );
  }

  if (parentDone) {
    return (
      <g key={animKey}>
        {/* grey track */}
        <path d={d} stroke="var(--ach-conn-locked)" strokeWidth="2"
          fill="none" opacity=".18" />
        {/* animated green fill — dasharray full length, offset animates to 0 */}
        <path d={d}
          stroke="var(--em-light)" strokeWidth="2.5" fill="none"
          strokeLinecap="round"
          strokeDasharray={approxLen}
          strokeDashoffset={approxLen}
          style={{ animation: `achConnFill ${FILL_DUR}s cubic-bezier(.22,1,.36,1) forwards` }}
        />
        {arrowAt('var(--em-light)', 0.95)}
      </g>
    );
  }

  // active but parent not done — animated dashed
  return (
    <g>
      <path d={d} stroke="var(--ach-conn-active)" strokeWidth="2"
        fill="none" strokeDasharray="6,4" opacity=".45"
        className="ach-conn-anim" />
      {arrowAt('var(--ach-conn-active)', 0.7)}
    </g>
  );
}

// ── Single achievement node ──────────────────────────────────────────

function AchNode({
  ach, conns, allAchs,
  connectingFrom,
  onDragCommit,
  onComplete, onConnect, onDelete, onEdit,
}) {
  const parents = conns.filter(([, t]) => t === ach.id);
  const completedParents = parents.filter(([f]) => {
    const p = allAchs.find(a => a.id === f);
    return p && p.completed;
  });
  const status = ach.completed ? 'completed' : ach.locked ? 'locked' : 'active';
  const statusLabel =
    ach.completed
      ? '★ Completed'
      : ach.locked
        ? `🔒 ${completedParents.length}/${parents.length} required`
        : 'Achievement';
  const isTarget = connectingFrom && connectingFrom !== ach.id;

  // One-shot arrival pulse: when a parent transitions to completed,
  // the inbound connection animates for FILL_DUR; we kick the pulse
  // on this node ~150ms before that so the spark "arriving" feels
  // synchronous with the glow firing.
  const [arriving, setArriving] = useState(false);
  const prevParentDoneCount = useRef(completedParents.length);
  useEffect(() => {
    if (completedParents.length > prevParentDoneCount.current) {
      const t = setTimeout(() => {
        setArriving(true);
        setTimeout(() => setArriving(false), 1200);
      }, Math.max(0, (FILL_DUR - 0.15) * 1000));
      prevParentDoneCount.current = completedParents.length;
      return () => clearTimeout(t);
    }
    prevParentDoneCount.current = completedParents.length;
  }, [completedParents.length]);

  // Drag — refs so we never trigger React re-render mid-drag.
  const nodeRef = useRef(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startCoords = useRef({ sx: 0, sy: 0, ox: 0, oy: 0 });
  const posRef = useRef({ x: ach.x, y: ach.y });

  // Keep posRef in sync if x/y change externally (e.g. after restore)
  useEffect(() => {
    posRef.current = { x: ach.x, y: ach.y };
    if (nodeRef.current && !dragging.current) {
      nodeRef.current.style.left = ach.x + 'px';
      nodeRef.current.style.top = ach.y + 'px';
    }
  }, [ach.x, ach.y]);

  function startDrag(cx, cy) {
    dragging.current = true;
    moved.current = false;
    startCoords.current = { sx: cx, sy: cy, ox: ach.x, oy: ach.y };
    posRef.current = { x: ach.x, y: ach.y };
  }
  function moveDrag(cx, cy) {
    if (!dragging.current) return;
    const dx = cx - startCoords.current.sx;
    const dy = cy - startCoords.current.sy;
    if (!moved.current && Math.abs(dx) + Math.abs(dy) < 4) return;
    moved.current = true;
    const nx = Math.max(0, startCoords.current.ox + dx);
    const ny = Math.max(0, startCoords.current.oy + dy);
    posRef.current = { x: nx, y: ny };
    if (nodeRef.current) {
      nodeRef.current.style.left = nx + 'px';
      nodeRef.current.style.top = ny + 'px';
    }
    // Note: we update DOM directly mid-drag and only commit to React
    // state on mouseup. Connection lines re-render via the parent's
    // own draggingPos hint — see AchievementsSection.
  }
  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current) {
      onDragCommit(ach.id, posRef.current.x, posRef.current.y);
    }
    moved.current = false;
  }

  useEffect(() => {
    const onMouseMove = e => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = e => {
      if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => endDrag();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ach.x, ach.y]);

  // Progress strip percentage: completed achievements are 100%; child
  // nodes show fraction-of-parents-complete so progress is meaningful
  // before they themselves are unlocked.
  const parentIds = parents.map(([f]) => f);
  const progressPct = ach.completed
    ? 100
    : parentIds.length === 0
      ? 0
      : Math.round((completedParents.length / parentIds.length) * 100);

  return (
    <div
      ref={nodeRef}
      className={`ach-node${isTarget ? ' ach-node-target' : ''}`}
      style={{ left: ach.x, top: ach.y }}
      onMouseDown={e => {
        if (e.target.tagName === 'BUTTON') return;
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
      }}
      onTouchStart={e => {
        if (e.target.tagName === 'BUTTON') return;
        if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onClick={() => {
        if (!moved.current && connectingFrom && connectingFrom !== ach.id) {
          onConnect(ach.id);
        }
      }}
    >
      <div className={`ach-card status-${status}${arriving ? ' ach-card-arriving' : ''}`}>
        <div className="ach-card-top">
          <div className="ach-icon-wrap">{ach.icon}</div>
          <div className="ach-info">
            <div className={`ach-label status-${status}`}>
              <span className="ach-label-dot" />
              {statusLabel}
            </div>
            <div className="ach-name">{ach.name}</div>
            {ach.desc && <div className="ach-desc">{ach.desc}</div>}
            {ach.coins > 0 && (
              <div className="ach-coin-badge">⬡ {ach.coins}</div>
            )}
          </div>
        </div>

        {(parentIds.length > 0 || ach.completed) && (
          <div className="ach-progress-strip">
            <div className="ach-progress-fill" style={{ width: `${progressPct}%` }} />
            {parentIds.length > 0 && !ach.completed && (
              <div className="ach-progress-count">
                {completedParents.length}/{parentIds.length}
              </div>
            )}
          </div>
        )}

        <div className="ach-actions">
          <button
            type="button"
            className="ach-btn ach-btn-complete"
            title={ach.completed ? 'Mark as not completed' : 'Mark complete'}
            onClick={e => { e.stopPropagation(); onComplete(ach.id); }}
          >★</button>
          <button
            type="button"
            className="ach-btn ach-btn-connect"
            title="Connect to another achievement"
            onClick={e => { e.stopPropagation(); onConnect(ach.id); }}
          >✦</button>
          <button
            type="button"
            className="ach-btn ach-btn-edit"
            title="Edit"
            onClick={e => { e.stopPropagation(); onEdit(ach.id); }}
          >✎</button>
          <button
            type="button"
            className="ach-btn ach-btn-delete"
            title="Delete"
            onClick={e => { e.stopPropagation(); onDelete(ach.id); }}
          >✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────

export default function AchievementsSection({ S, update, active, onOpenModal, onShowCoinToast }) {
  const achievements = S.achievements || [];
  const connections = S.connections || [];
  const connectingFrom = S.connectingFrom || null;

  const [zoom, setZoom] = useState(1);
  // Tracks the live position of a node currently being dragged so the
  // SVG connections re-render without committing to global state on
  // every mousemove. AchNode commits position on mouseup; in between
  // we use this hint to keep connection endpoints visually attached.
  const [dragHint, setDragHint] = useState(null); // { id, x, y } | null

  // ── handlers ────────────────────────────────────────────────────

  function handleDragCommit(id, x, y) {
    setDragHint(null);
    update(prev => ({
      ...prev,
      achievements: prev.achievements.map(a => a.id === id ? { ...a, x, y } : a),
    }));
  }

  function handleToggleComplete(id) {
    update(prev => {
      const ach = prev.achievements.find(a => a.id === id);
      if (!ach || ach.locked) return prev;
      const wasCompleted = ach.completed;
      const newCompleted = !wasCompleted;
      const reward = ach.coins || 0;
      let coins = prev.coins || 0;
      let coinHistory = [...(prev.coinHistory || [])];

      if (newCompleted) fireAchievement();
      if (newCompleted && reward > 0) {
        coins += reward;
        coinHistory.unshift({ type: 'earn', label: ach.name, amount: reward, ts: Date.now() });
        onShowCoinToast(`+${reward} ⬡ earned!`, true);
      } else if (!newCompleted && wasCompleted && reward > 0) {
        coins = Math.max(0, coins - reward);
        coinHistory.unshift({ type: 'refund', label: ach.name, amount: -reward, ts: Date.now() });
      }

      const updated = prev.achievements.map(a =>
        a.id === id ? { ...a, completed: newCompleted, completedAt: newCompleted ? Date.now() : null } : a
      );
      const recalced = recalcLocks(updated, prev.connections);
      return { ...prev, achievements: recalced, coins, coinHistory };
    });
  }

  function handleConnect(targetId) {
    if (!connectingFrom) {
      // first click → mark as source
      update(prev => ({ ...prev, connectingFrom: targetId }));
      return;
    }
    if (connectingFrom === targetId) {
      // clicked same node → cancel
      update(prev => ({ ...prev, connectingFrom: null }));
      return;
    }
    update(prev => {
      if (prev.connections.some(([a, b]) => a === connectingFrom && b === targetId)) {
        return { ...prev, connectingFrom: null };
      }
      const newConns = [...prev.connections, [connectingFrom, targetId]];
      const recalced = recalcLocks(prev.achievements, newConns);
      return { ...prev, connections: newConns, achievements: recalced, connectingFrom: null };
    });
  }

  function handleDelete(id) {
    update(prev => {
      const newConns = prev.connections.filter(([a, b]) => a !== id && b !== id);
      const newAchs = prev.achievements.filter(a => a.id !== id);
      return {
        ...prev,
        achievements: recalcLocks(newAchs, newConns),
        connections: newConns,
        connectingFrom: prev.connectingFrom === id ? null : prev.connectingFrom,
      };
    });
  }

  function handleCancelConnect() {
    update(prev => ({ ...prev, connectingFrom: null }));
  }

  function handleEdit(id) {
    // Defer to the existing modal pattern so all edit/delete logic
    // lives in one place (Modals.jsx → EditAchievementModal). Same
    // shape as habit edit: 'editAchievementModal:<id>'.
    onOpenModal('editAchievementModal:' + id);
  }

  // ── derived ─────────────────────────────────────────────────────

  // Min canvas dimensions so dragging beyond doesn't clip
  const { canvasW, canvasH } = useMemo(() => {
    let w = 700, h = 400;
    achievements.forEach(a => {
      w = Math.max(w, a.x + NODE_W + 30);
      h = Math.max(h, a.y + 130);
    });
    return { canvasW: w, canvasH: h };
  }, [achievements]);

  const completedCount = achievements.filter(a => a.completed).length;
  const totalCount = achievements.length;
  const lockedCount = achievements.filter(a => a.locked).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Live-positioned achievements view: while a drag hint is active, override
  // that node's position in the array so the connection lines follow.
  const liveAchievements = useMemo(() => {
    if (!dragHint) return achievements;
    return achievements.map(a => a.id === dragHint.id ? { ...a, x: dragHint.x, y: dragHint.y } : a);
  }, [achievements, dragHint]);

  return (
    <section id="achievements" className={`section${active ? ' active' : ''}`}>
      {/* Toolbar — eyebrow / title / hints / + New */}
      <div className="ach-toolbar">
        <motion.div
          className="ach-toolbar-title-wrap"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="eyebrow">Progress Map</div>
          <div className="sec-title">
            Achievement Board
            <SectionHelp text="Place goals on a canvas and draw connections between them to map your path. Complete a parent goal to unlock its children." />
          </div>
        </motion.div>
        <div className="ach-toolbar-hints">
          <span className="ach-hint-pill"><span className="ach-hint-key">Drag</span> move</span>
          <span className="ach-hint-pill"><span className="ach-hint-key">✦</span> connect</span>
          <span className="ach-hint-pill"><span className="ach-hint-key">★</span> complete</span>
        </div>
        <motion.button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenModal('addAchievementModal')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          + New
        </motion.button>
      </div>

      {/* Canvas — dot grid background, draggable nodes, SVG connections */}
      <div className="ach-canvas-wrap">
        <div
          className="ach-canvas-inner"
          style={{
            minWidth: canvasW,
            minHeight: canvasH,
            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
            transformOrigin: '0 0',
          }}
        >
          <svg
            className="ach-connections"
            width={canvasW}
            height={canvasH}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {connections.map(([fId, tId], i) => {
              const f = liveAchievements.find(a => a.id === fId);
              const t = liveAchievements.find(a => a.id === tId);
              if (!f || !t) return null;
              const locked = !f.completed;
              return (
                <ConnPath
                  key={`${fId}-${tId}`}
                  connKey={`${fId}-${tId}-${i}`}
                  from={f}
                  to={t}
                  fromCompleted={f.completed}
                  toCompleted={t.completed}
                  locked={locked}
                />
              );
            })}
          </svg>

          {achievements.map(ach => (
            <AchNode
              key={ach.id}
              ach={ach}
              conns={connections}
              allAchs={achievements}
              connectingFrom={connectingFrom}
              onDragCommit={handleDragCommit}
              onComplete={handleToggleComplete}
              onConnect={handleConnect}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}

          {achievements.length === 0 && (
            <div className="ach-canvas-empty">
              <div className="ach-canvas-empty-icon">★</div>
              <div className="ach-canvas-empty-label">No achievements yet</div>
              <div className="ach-canvas-empty-sub">Click + New to add your first goal</div>
            </div>
          )}
        </div>

        {connectingFrom && (
          <div className="ach-connect-toast">
            ✦ Now click another card to connect
            <button
              type="button"
              className="ach-connect-toast-cancel"
              onClick={handleCancelConnect}
            >Cancel</button>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="ach-stats">
        <div className="ach-stats-item">
          <span className="ach-stats-val ach-stats-val-em">{completedCount}</span>
          <span className="ach-stats-lbl">Done</span>
        </div>
        <div className="ach-stats-item">
          <span className="ach-stats-val">{totalCount}</span>
          <span className="ach-stats-lbl">Total</span>
        </div>
        <div className="ach-stats-item">
          <span className="ach-stats-val ach-stats-val-gold">{progressPct}%</span>
          <span className="ach-stats-lbl">Progress</span>
        </div>
        <div className="ach-stats-item">
          <span className="ach-stats-val">{lockedCount}</span>
          <span className="ach-stats-lbl">Locked</span>
        </div>
        <div className="ach-stats-divider" />
        <div className="ach-stats-item">
          <div className="ach-zoom">
            <button
              type="button"
              className="ach-zoom-btn"
              onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              title="Zoom out"
            >−</button>
            <span className="ach-zoom-val">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="ach-zoom-btn"
              onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}
              title="Zoom in"
            >+</button>
            <button
              type="button"
              className="ach-zoom-btn ach-zoom-reset"
              onClick={() => setZoom(1)}
              title="Reset zoom"
            >⊙</button>
          </div>
        </div>
      </div>
    </section>
  );
}
