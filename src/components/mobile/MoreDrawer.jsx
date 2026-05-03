import { useEffect, useRef } from 'react';
import { haptic } from '../../hooks/useCapacitor';

/**
 * Bottom-sheet drawer surfaced from the More tab in BottomTabBar.
 *
 * Holds the secondary sections that don't make the cut for primary
 * bottom tabs:
 *   - Profile      (mobile-only — photo, name, email, password)
 *   - Achievements
 *   - Shopping
 *   - Friends   (mobile-only route → MobileFriendsSection wraps the
 *               FriendsRail orchestrator full-width)
 *   - Settings
 *
 * Interactions:
 *   - Tap row → close drawer + navigate
 *   - Tap backdrop → close
 *   - Drag handle (top of sheet) → close (basic touch handling)
 *   - Esc → close (keyboard accessibility)
 */
const MORE_ITEMS = [
  { id: 'profile',      icon: '◐', label: 'Profile',      desc: 'Photo, name, email, password' },
  { id: 'achievements', icon: '★', label: 'Achievements', desc: 'Your goal map' },
  { id: 'shop',         icon: '◈', label: 'Shopping',     desc: 'Things to buy with coins' },
  { id: 'friends',      icon: '◌', label: 'Friends',      desc: 'See your friends\' progress' },
  { id: 'settings',     icon: '⚙', label: 'Settings',     desc: 'Theme, privacy, tools' },
];

export default function MoreDrawer({ open, onClose, onNavigate, activeSection }) {
  // Esc closes
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock background scroll while open — prevents the page underneath
  // from rubber-banding while the user scrolls within the sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Touch drag-to-close on the handle. Lightweight — no momentum,
  // just a downward drag past 80px closes. Prevents the sheet from
  // feeling stuck on touch devices.
  const sheetRef = useRef(null);
  const handleRef = useRef(null);
  const dragStart = useRef(null);
  function onHandleStart(e) {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragStart.current = { y, transform: '' };
  }
  function onHandleMove(e) {
    if (!dragStart.current || !sheetRef.current) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = Math.max(0, y - dragStart.current.y);
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  }
  function onHandleEnd(e) {
    if (!dragStart.current || !sheetRef.current) return;
    const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dy = y - dragStart.current.y;
    sheetRef.current.style.transform = '';
    dragStart.current = null;
    if (dy > 80) onClose();
  }

  function handleSelect(item) {
    haptic('LIGHT');
    onClose();
    onNavigate(item.routeAs || item.id);
  }

  return (
    <>
      <div
        className={`m-drawer-backdrop${open ? ' m-drawer-backdrop-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        ref={sheetRef}
        className={`m-drawer${open ? ' m-drawer-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="More"
        aria-hidden={!open}
      >
        <div
          ref={handleRef}
          className="m-drawer-handle-wrap"
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
          onMouseDown={onHandleStart}
          onMouseMove={onHandleMove}
          onMouseUp={onHandleEnd}
          onClick={onClose}
        >
          <div className="m-drawer-handle" />
        </div>
        <div className="m-drawer-body">
          <div className="m-drawer-eyebrow">More</div>
          <ul className="m-drawer-list">
            {MORE_ITEMS.map(item => {
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`m-drawer-item${isActive ? ' m-drawer-item-active' : ''}`}
                    onClick={() => handleSelect(item)}
                  >
                    <span className="m-drawer-item-icon" aria-hidden="true">{item.icon}</span>
                    <span className="m-drawer-item-text">
                      <span className="m-drawer-item-label">{item.label}</span>
                      <span className="m-drawer-item-desc">{item.desc}</span>
                    </span>
                    <span className="m-drawer-item-chev" aria-hidden="true">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
