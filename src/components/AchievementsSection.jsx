import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fireAchievement } from '../utils/confetti';
import SectionHelp from './SectionHelp';

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
    if (parents.length === 0) return a;
    return { ...a, locked: !allParentsComplete(achievements, connections, a.id) };
  });
}

export default function AchievementsSection({ S, update, active, onOpenModal, onShowCoinToast }) {
  const innerRef = useRef(null);
  const svgRef = useRef(null);
  const connectingFromRef = useRef(S.connectingFrom);
  connectingFromRef.current = S.connectingFrom;

  function redrawSvg(achievements, connections) {
    const svg = svgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    let mW = 700, mH = 400;
    achievements.forEach(a => { mW = Math.max(mW, a.x + 285); mH = Math.max(mH, a.y + 105); });
    svg.setAttribute('viewBox', `0 0 ${mW} ${mH}`);
    svg.style.width = mW + 'px';
    svg.style.height = mH + 'px';
    connections.forEach(([fId, tId]) => {
      const f = achievements.find(a => a.id === fId), t = achievements.find(a => a.id === tId);
      if (!f || !t) return;
      const allDone = allParentsComplete(achievements, connections, tId);
      const color = allDone ? '#c8970a' : (f.completed ? '#6bbf90' : '#a8d4bc');
      const x1 = f.x + 127, y1 = f.y + 36, x2 = t.x + 127, y2 = t.y + 36, mx = (x1 + x2) / 2;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
      p.setAttribute('stroke', color); p.setAttribute('stroke-width', '2'); p.setAttribute('fill', 'none');
      p.setAttribute('stroke-dasharray', f.completed ? 'none' : '5,4');
      svg.appendChild(p);
      const ang = Math.atan2(y2 - y1, x2 - x1), ah = 8;
      const arr = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      arr.setAttribute('points', [[x2, y2], [x2 - ah * Math.cos(ang - .4), y2 - ah * Math.sin(ang - .4)], [x2 - ah * Math.cos(ang + .4), y2 - ah * Math.sin(ang + .4)]].map(p => p.join(',')).join(' '));
      arr.setAttribute('fill', color);
      svg.appendChild(arr);
    });
  }

  const renderAchievements = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const { achievements, connections } = S;
    inner.querySelectorAll('.achievement-node').forEach(n => n.remove());

    let mW = 700, mH = 400;
    achievements.forEach(a => { mW = Math.max(mW, a.x + 285); mH = Math.max(mH, a.y + 105); });
    inner.style.minWidth = mW + 'px';
    inner.style.minHeight = mH + 'px';

    const svg = svgRef.current;
    if (svg) {
      svg.setAttribute('viewBox', `0 0 ${mW} ${mH}`);
      svg.style.cssText = `position:absolute;inset:0;width:${mW}px;height:${mH}px;pointer-events:none;z-index:0;`;
    }
    redrawSvg(achievements, connections);

    achievements.forEach(ach => {
      const parents = connections.filter(([, t]) => t === ach.id).map(([f]) => f);
      const completedParents = parents.filter(pid => { const p = achievements.find(a => a.id === pid); return p && p.completed; });
      const st = ach.completed ? 'completed' : ach.locked ? 'locked' : 'active';
      const lbl = ach.completed ? '★ Completed' : ach.locked ? `🔒 ${completedParents.length}/${parents.length} required` : 'Achievement';

      const node = document.createElement('div');
      node.className = 'achievement-node';
      node.dataset.achId = ach.id;
      node.style.cssText = `left:${ach.x}px;top:${ach.y}px;`;
      node.innerHTML = `<div class="ach-card status-${st}"><div class="ach-icon-wrap">${ach.icon}</div><div class="ach-info"><div class="ach-label status-${st}">${lbl}</div><div class="ach-name">${ach.name}</div><div class="ach-desc">${ach.desc || ''}</div></div></div><div class="ach-actions"><button class="ach-btn ach-btn-complete" data-complete="${ach.id}">★</button><button class="ach-btn ach-btn-connect" data-connect="${ach.id}">✦</button><button class="ach-btn ach-btn-delete" data-delete="${ach.id}">✕</button></div>`;

      node.querySelector('[data-complete]')?.addEventListener('click', e => {
        e.stopPropagation();
        handleToggleComplete(ach.id);
      });
      node.querySelector('[data-connect]')?.addEventListener('click', e => {
        e.stopPropagation();
        handleStartConnect(ach.id);
      });
      node.querySelector('[data-delete]')?.addEventListener('click', e => {
        e.stopPropagation();
        update(prev => ({
          ...prev,
          achievements: prev.achievements.filter(a => a.id !== ach.id),
          connections: prev.connections.filter(([a, b]) => a !== ach.id && b !== ach.id),
        }));
      });

      node.addEventListener('click', () => {
        if (connectingFromRef.current && connectingFromRef.current !== ach.id) {
          handleFinishConnect(ach.id);
        }
      });

      // Drag within board canvas (mouse + touch)
      let dragging = false, moved = false, sx, sy, ox, oy;

      function startDrag(clientX, clientY) {
        dragging = true; moved = false;
        sx = clientX; sy = clientY; ox = ach.x; oy = ach.y;
      }
      function moveDrag(clientX, clientY) {
        if (!dragging) return;
        const dx = clientX - sx, dy = clientY - sy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true;
        ach.x = Math.max(0, ox + dx); ach.y = Math.max(0, oy + dy);
        node.style.left = ach.x + 'px'; node.style.top = ach.y + 'px';
        redrawSvg(S.achievements, S.connections);
      }
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        if (moved) {
          update(prev => ({
            ...prev,
            achievements: prev.achievements.map(a => a.id === ach.id ? { ...a, x: ach.x, y: ach.y } : a),
          }));
        }
        moved = false;
      }

      node.addEventListener('mousedown', e => {
        if (e.target.tagName === 'BUTTON') return;
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
      });
      document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
      document.addEventListener('mouseup', endDrag);

      // Touch events mirror mouse events — pinch-to-zoom not implemented (too risky)
      node.addEventListener('touchstart', e => {
        if (e.target.tagName === 'BUTTON') return;
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY);
      }, { passive: true });
      node.addEventListener('touchmove', e => {
        const t = e.touches[0];
        moveDrag(t.clientX, t.clientY);
        if (moved) e.preventDefault();
      }, { passive: false });
      node.addEventListener('touchend', endDrag);

      inner.appendChild(node);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.achievements, S.connections, S.connectingFrom]);

  function handleToggleComplete(id) {
    update(prev => {
      const ach = prev.achievements.find(x => x.id === id);
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
      const updatedAchs = prev.achievements.map(a => a.id === id ? { ...a, completed: newCompleted } : a);
      const recalced = recalcLocks(updatedAchs, prev.connections);
      return { ...prev, achievements: recalced, coins, coinHistory };
    });
  }

  function handleStartConnect(id) {
    update(prev => ({ ...prev, connectingFrom: id }));
    document.querySelectorAll('.achievement-node').forEach(n => {
      n.style.outline = n.dataset.achId === id ? '3px solid #4dc485' : '';
    });
    document.getElementById('connectToast').style.display = 'flex';
  }

  function handleFinishConnect(toId) {
    const fId = connectingFromRef.current;
    if (!fId || fId === toId) return;
    update(prev => {
      if (prev.connections.some(([a, b]) => a === fId && b === toId)) return prev;
      const newConns = [...prev.connections, [fId, toId]];
      const recalced = recalcLocks(prev.achievements, newConns);
      return { ...prev, connections: newConns, achievements: recalced };
    });
    // Cancel connecting mode
    setTimeout(() => {
      update(prev => ({ ...prev, connectingFrom: null }));
      document.getElementById('connectToast').style.display = 'none';
      document.querySelectorAll('.achievement-node').forEach(n => n.style.outline = '');
    }, 50);
  }

  useEffect(() => {
    if (active) renderAchievements();
  }, [active, renderAchievements]);

  return (
    <section id="achievements" className={`section${active ? ' active' : ''}`}>
      <div className="board-toolbar">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="eyebrow">Progress Map</div>
          <div className="sec-title">Achievement Board <SectionHelp text="Place goals on a canvas and draw connections between them to map your path. Complete a parent goal to unlock its children." /></div>
        </motion.div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)' }}>Drag · ✦ Connect · ★ Complete</span>
          <motion.button className="btn btn-primary" onClick={() => onOpenModal('addAchievementModal')}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}>+ New</motion.button>
        </div>
      </div>
      <div className="board-canvas" id="boardCanvas">
        <div className="board-canvas-inner" id="boardInner" ref={innerRef}>
          <svg className="connections-svg" id="connectionsSvg" ref={svgRef}></svg>
        </div>
      </div>
    </section>
  );
}
