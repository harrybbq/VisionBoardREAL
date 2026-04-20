import { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * TutorialOverlay
 *
 * Spotlight-with-tooltip onboarding walkthrough. Two tone variants:
 *   - theme="cream" → friendly, serif-italic voice (default)
 *   - theme="dark"  → terser mono "system.init" voice (for Dark OS users)
 *
 * The overlay is controlled — the parent decides when it's visible and
 * what to do on close. This component does not persist anything; it
 * just calls onClose() when the user finishes or skips.
 *
 * Target IDs refer to elements that already exist in the real app
 * (nav buttons, the hub section, the coin wallet). If a target element
 * can't be found, the step degrades gracefully to a centred card so
 * the tour never gets stuck.
 */

// ── Step definitions ────────────────────────────────────────────────
//
// id       — internal key; also used to decide which section to navigate
//            to before spotlighting ('hub' step → activeSection='hub',
//            'achievements' step → 'achievements', etc.)
// label    — small uppercase chip at top of the tooltip
// title    — headline
// body     — description
// target   — element id to spotlight. null ⇒ centred card.
// placement / arrowDir — where the tooltip sits relative to the target.
// navTo    — which app section to switch to before showing this step.
//            Some steps target the nav tabs themselves (so no navigation
//            needed); others show the landing content and should switch.

const STEPS_CREAM = [
  {
    id: 'welcome', label: 'Welcome', icon: '✦',
    title: 'Welcome to VisionBoard',
    body: 'Your personal life dashboard — track goals, habits, nutrition, holidays, and rewards all in one place. Quick tour, 30 seconds. Skip any time.',
    target: null, placement: 'center',
  },
  {
    id: 'hub', label: 'Hub',
    title: 'Your hub',
    body: 'This is your home. Pin useful links, add widgets like GitHub or YouTube, jot quick notes, and see your daily log at a glance. Everything starts here.',
    target: 'hub', placement: 'bottom', arrowDir: 'up',
    navTo: 'hub',
  },
  {
    id: 'achievements', label: 'Achievements',
    title: 'Pin-board goals',
    body: 'A visual goal board. Drag nodes around, draw connections between milestones, and build a map of where you want to get to. Complete a goal, earn ⬡ coins.',
    target: 'nav-tab-achievements', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'track', label: 'Track',
    title: 'Track & log',
    body: 'Two things in one — tick off custom daily tasks you set yourself, and log your nutrition. Both build streaks and earn coins for staying consistent.',
    target: 'nav-tab-track', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'shop', label: 'Shop',
    title: 'Reward yourself',
    body: 'Add items you want — trainers, a meal out, anything. Completing tasks and achievements earns ⬡ coins. Spend them here to unlock your rewards.',
    target: 'nav-tab-shop', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'holiday', label: 'Holiday',
    title: 'Plan your trips',
    body: 'Add holidays you are booking or dreaming about. Track countdowns, budgets, and booking status — so nothing gets forgotten.',
    target: 'nav-tab-holiday', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'habits', label: 'Habits',
    title: 'Break bad habits',
    body: 'Add a habit you want to quit. A timer starts from the moment you add it. If you relapse, reset the timer and go again. Simple, honest accountability.',
    target: 'nav-tab-habits', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'settings', label: 'Settings',
    title: 'Make it yours',
    body: 'Change your colour scheme, manage your account, set macro goals for nutrition tracking, and reopen this tour whenever you need it.',
    target: 'nav-tab-settings', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'done', label: 'Done', icon: '★',
    title: "You're all set",
    body: "Everything is ready. Start by adding your first goal, a habit to break, or a trip you're planning. This tour lives in Settings if you ever need it again.",
    target: null, placement: 'center',
  },
];

// Dark OS — fewer steps, terser voice
const STEPS_DARK = [
  {
    id: 'welcome', label: 'init', icon: '◆',
    title: 'system.init',
    body: 'Running orientation. 30 seconds. Skippable at any time.',
    target: null, placement: 'center',
  },
  {
    id: 'nav', label: 'navigation',
    title: 'nav_tabs',
    body: 'Sidebar routes to all sections — Hub, Achievements, Track, Shop, Holiday, Habits, Settings. Click any icon.',
    target: 'mainNav', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'hub', label: 'hub',
    title: 'hub_section',
    body: 'Command centre. Drag-and-drop widget canvas, linked resources, and a daily log in one view.',
    target: 'hub', placement: 'bottom', arrowDir: 'up',
    navTo: 'hub',
  },
  {
    id: 'track', label: 'track',
    title: 'track_section',
    body: 'Log nutrition, body metrics, custom trackers. Each log entry increments your streak counter and earns coins.',
    target: 'nav-tab-track', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'achievements', label: 'goals',
    title: 'achievements',
    body: 'Visual goal board. Nodes connect milestones to outcomes. Completed nodes disperse coins to your wallet.',
    target: 'nav-tab-achievements', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'coins', label: 'coins',
    title: 'coin_wallet',
    body: 'Consistency = coins. Spend them in the Shop. You define the rewards — treat it as a personal incentive layer.',
    target: 'coinWallet', placement: 'bottom', arrowDir: 'up',
  },
  {
    id: 'done', label: 'ready', icon: '◈',
    title: 'system.ready',
    body: 'Orientation complete. Board is live. Add your first widget or tracker to begin. Tour accessible from Settings.',
    target: null, placement: 'center',
  },
];

// ── Positioning helpers ─────────────────────────────────────────────

const TOOLTIP_W = 280;
const GAP = 18;

function getTargetRect(targetId) {
  if (!targetId) return null;
  const el = document.getElementById(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Element is display:none or collapsed — treat as missing.
  if (r.width === 0 && r.height === 0) return null;
  return r;
}

function getTooltipPos(rect, placement) {
  if (!rect) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Keep tooltip on-screen with a 12px safety margin.
  const clampX = x => Math.max(12, Math.min(x, vw - TOOLTIP_W - 12));
  const clampY = y => Math.max(12, Math.min(y, vh - 260));

  if (placement === 'right') {
    return { left: clampX(rect.right + GAP), top: clampY(rect.top + rect.height / 2 - 100) };
  }
  if (placement === 'left') {
    return { left: clampX(rect.left - TOOLTIP_W - GAP), top: clampY(rect.top + rect.height / 2 - 100) };
  }
  if (placement === 'bottom') {
    return { left: clampX(rect.left + rect.width / 2 - TOOLTIP_W / 2), top: clampY(rect.bottom + GAP) };
  }
  if (placement === 'top') {
    return { left: clampX(rect.left + rect.width / 2 - TOOLTIP_W / 2), top: clampY(rect.top - GAP - 200) };
  }
  return null;
}

function getSpotlightRect(rect) {
  if (!rect) return null;
  return {
    left: rect.left - 6,
    top: rect.top - 6,
    width: rect.width + 12,
    height: rect.height + 12,
  };
}

// ── Component ───────────────────────────────────────────────────────

export default function TutorialOverlay({
  visible,
  theme = 'cream',          // 'cream' | 'dark'
  onClose,
  onNavigate,               // (sectionId) => void  — lets us sync app section before spotlighting
}) {
  const steps = useMemo(() => (theme === 'dark' ? STEPS_DARK : STEPS_CREAM), [theme]);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState(null);
  const [spot, setSpot] = useState(null);

  // Reset to step 0 whenever the overlay is (re-)opened. Gives the
  // Settings replay button a clean slate without us having to reach in.
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  const current = steps[step];

  // If the step wants to land the user on a specific section first,
  // fire navigation once per step change. This ensures e.g. the hub
  // step actually highlights the visible hub content rather than the
  // previous section's layout.
  useEffect(() => {
    if (!visible) return;
    if (current?.navTo && typeof onNavigate === 'function') {
      onNavigate(current.navTo);
    }
  }, [visible, current, onNavigate]);

  // Measure target after paint. We re-measure on every frame for the
  // first ~400 ms to let any navigation animation finish, then settle
  // on resize / scroll.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let frames = 0;

    function measure() {
      if (cancelled) return;
      const rect = getTargetRect(current?.target);
      setPos(getTooltipPos(rect, current?.placement));
      setSpot(getSpotlightRect(rect));
    }

    function tick() {
      measure();
      frames += 1;
      if (frames < 24 && !cancelled) requestAnimationFrame(tick);
    }

    tick();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [visible, current]);

  const go = useCallback(delta => {
    setStep(s => Math.max(0, Math.min(steps.length - 1, s + delta)));
  }, [steps.length]);

  // Escape closes the tour.
  useEffect(() => {
    if (!visible) return;
    const handler = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible || !current) return null;

  // A step is "centred" if it has no target OR the target can't be
  // found in the DOM right now. This keeps the tour flowing even if
  // e.g. nav buttons get hidden on small viewports.
  const targetResolved = !!spot;
  const isCentered = !current.target || current.placement === 'center' || !targetResolved;
  const isDone = current.id === 'done';
  const isWelcome = step === 0;
  const isLastStep = step === steps.length - 1;

  const themeClass = theme === 'dark' ? 'tut-theme-dark' : 'tut-theme-cream';

  const nextLabel = isDone
    ? (theme === 'dark' ? 'enter_app →' : 'Get started →')
    : isLastStep
      ? (theme === 'dark' ? 'finish →' : 'Finish →')
      : (theme === 'dark' ? 'next →' : 'Next →');
  const backLabel = theme === 'dark' ? '← back' : '← Back';
  const skipLabel = theme === 'dark' ? 'skip' : 'Skip';

  // Backdrop: radial gradient around target for spotlight steps,
  // flat dim for centred cards.
  const backdropStyle = (!isCentered && spot)
    ? {
        background: `radial-gradient(ellipse at ${spot.left + spot.width / 2}px ${spot.top + spot.height / 2}px, transparent ${Math.max(spot.width, spot.height) * 0.4}px, rgba(0,0,0,0.46) ${Math.max(spot.width, spot.height) * 0.85}px)`,
      }
    : undefined;

  return (
    <div className={`tut-root ${themeClass}`}>
      <div className="tut-backdrop" style={backdropStyle} onClick={onClose} />

      {/* Spotlight ring */}
      {!isCentered && spot && (
        <motion.div
          className="tut-ring"
          initial={false}
          animate={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      )}

      {/* Centred welcome / done card */}
      <AnimatePresence mode="wait">
        {isCentered && (
          <motion.div
            key={`center-${step}`}
            className="tut-center-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
          >
            <div className="tut-center-card">
              <div className="tut-center-hero">
                <span className="tut-center-hero-glyph">{current.icon || '✦'}</span>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <line key={`v${i}`} x1={`${i * 12.5}%`} y1="0" x2={`${i * 12.5}%`} y2="100%" stroke="currentColor" strokeWidth="0.5" />
                  ))}
                  {[1, 2, 3].map(i => (
                    <line key={`h${i}`} x1="0" y1={`${i * 25}%`} x2="100%" y2={`${i * 25}%`} stroke="currentColor" strokeWidth="0.5" />
                  ))}
                </svg>
              </div>
              <div className="tut-center-body">
                <div className="tut-center-title">{current.title}</div>
                <div className="tut-center-text">{current.body}</div>
              </div>
              <div className="tut-dots" style={{ paddingLeft: 28 }}>
                {steps.map((s, i) => (
                  <div key={s.id} className={`tut-dot${step === i ? ' active' : ''}`} />
                ))}
              </div>
              <div className="tut-center-footer">
                {!isWelcome && (
                  <button type="button" className="tut-btn tut-btn-back" onClick={() => go(-1)}>
                    {backLabel}
                  </button>
                )}
                <span className="tut-spacer" />
                {!isDone && (
                  <button type="button" className="tut-btn tut-btn-back" onClick={onClose}>
                    {skipLabel}
                  </button>
                )}
                <button
                  type="button"
                  className="tut-btn tut-btn-next"
                  onClick={isDone ? onClose : () => go(1)}
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating tooltip (non-centred steps) */}
      <AnimatePresence mode="wait">
        {!isCentered && pos && (
          <motion.div
            key={`tip-${step}`}
            className="tut-tooltip"
            style={{ left: pos.left, top: pos.top }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tut-tooltip-card">
              {current.arrowDir && <div className={`tut-arrow arrow-${current.arrowDir}`} />}

              <div className="tut-top">
                <span className="tut-step-label">{current.label}</span>
                <button type="button" className="tut-skip" onClick={onClose}>{skipLabel}</button>
              </div>

              <div className="tut-body">
                <div className="tut-title">{current.title}</div>
                <div className="tut-body-text">{current.body}</div>
              </div>

              <div className="tut-dots">
                {steps.map((s, i) => (
                  <div key={s.id} className={`tut-dot${step === i ? ' active' : ''}`} />
                ))}
              </div>

              <div className="tut-footer">
                <span className="tut-step-counter">{step + 1} / {steps.length}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {step > 0 && (
                    <button type="button" className="tut-btn tut-btn-back" onClick={() => go(-1)}>
                      {backLabel}
                    </button>
                  )}
                  <button type="button" className="tut-btn tut-btn-next" onClick={() => go(1)}>
                    {nextLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
