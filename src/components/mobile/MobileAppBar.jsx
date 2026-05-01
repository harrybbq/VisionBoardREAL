/**
 * Mobile-only top app bar. Replaces the desktop PageHeader at narrow
 * viewports — same data, different chrome.
 *
 * Layout (left → right):
 *   - Logo cap     ── small "V" mark, doubles as a settings shortcut
 *                     when activeSection isn't already settings
 *   - Section eyebrow ── current section name in mono caps
 *   - Coin chip    ── total coins + tap to open coin history
 *
 * Why no greeting / clock / background controls? Mobile chrome
 * needs to be ruthless about what fits in a 48px-tall bar. Greeting
 * and clock live on the Hub screen body itself in the new mobile
 * layout (see HubMobileHeader); background controls and search are
 * desktop-only luxuries.
 */
import { motion } from 'framer-motion';

const SECTION_LABELS = {
  hub: 'Hub',
  achievements: 'Achievements',
  track: 'Track',
  shop: 'Shopping',
  holiday: 'Holiday',
  habits: 'Habits',
  settings: 'Settings',
};

export default function MobileAppBar({
  activeSection,
  coins = 0,
  onOpenCoinHistory,
  onNavigateSettings,
}) {
  const label = SECTION_LABELS[activeSection] || '';
  return (
    <header className="m-appbar" role="banner">
      <button
        type="button"
        className="m-appbar-logo"
        onClick={onNavigateSettings}
        aria-label="Open settings"
        title="Settings"
      >V</button>
      <div className="m-appbar-eyebrow" aria-live="polite">{label}</div>
      <motion.button
        type="button"
        className="m-appbar-coins"
        onClick={onOpenCoinHistory}
        aria-label={`${coins} coins — view history`}
        whileTap={{ scale: 0.95 }}
      >
        <span className="m-appbar-coins-icon" aria-hidden="true">⬡</span>
        <span className="m-appbar-coins-val">{coins.toLocaleString()}</span>
      </motion.button>
    </header>
  );
}
