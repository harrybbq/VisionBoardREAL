import { useEffect } from 'react';

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(e) {
  const el = e.target;
  return INPUT_TAGS.has(el.tagName) || el.isContentEditable;
}

/**
 * Global keyboard shortcut handler.
 * Call once at app root — navigates sections and opens modals.
 *
 * @param {Object} opts
 * @param {function} opts.navigate        - navigate(sectionId)
 * @param {function} opts.openModal       - openModal(modalId)
 * @param {string}   opts.activeSection   - current active section
 * @param {function} opts.openPalette     - opens command palette
 * @param {function} opts.openShortcuts   - opens shortcut reference modal
 * @param {string|null} opts.openModal    - currently open modal id
 * @param {function} opts.closeModal      - close active modal
 */
export function useKeyboardShortcuts({
  navigate,
  openModal,
  activeSection,
  openPalette,
  openShortcuts,
  activeModalId,
  closeModal,
}) {
  useEffect(() => {
    function handler(e) {
      // Cmd+K / Ctrl+K → command palette (fires even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }

      // Escape → close active modal
      if (e.key === 'Escape' && activeModalId) {
        closeModal();
        return;
      }

      // Don't fire nav/action shortcuts when typing
      if (isTyping(e)) return;
      // Don't fire when a modal is open (except Escape handled above)
      if (activeModalId) return;

      // Navigation: number keys
      const navMap = { '1': 'hub', '2': 'achievements', '3': 'track', '4': 'shop', '5': 'holiday' };
      if (navMap[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        navigate(navMap[e.key]);
        return;
      }

      // ? → shortcuts reference
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        openShortcuts();
        return;
      }

      // N → primary add modal for active screen
      if (e.key === 'n' || e.key === 'N') {
        const addMap = {
          hub: 'addLinkModal',
          achievements: 'addAchievementModal',
          track: 'addTrackerModal',
          shop: 'addShopModal',
          holiday: 'addHolidayModal',
        };
        const id = addMap[activeSection];
        if (id) openModal(id);
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, openModal, activeSection, openPalette, openShortcuts, activeModalId, closeModal]);
}
