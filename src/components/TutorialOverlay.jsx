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
    body: 'A quick 30-second tour. You can skip any time — it lives in Settings if you want to replay it later.',
    target: null, placement: 'center',
  },
  {
    id: 'hub', label: 'Hub',
    title: 'Your hub',
    body: 'Home base. VisionBoard is your personal life dashboard — goals, habits, nutrition, holidays, and rewards in one place. The Hub is the landing view: pin useful links, add widgets, jot quick notes, and see your daily log at a glance.',
    target: 'hub', placement: 'bottom', arrowDir: 'up',
    navTo: 'hub',
  },
  {
    id: 'achievements', label: 'Achievements',
    title: 'Pin-board goals',
    body: 'Drag and connect goals like a pin-board. Draw lines between milestones and outcomes, build a map of where you want to get to, and earn ⬡ coins for every node you complete.',
    target: 'nav-tab-achievements', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'track', label: 'Track',
    title: 'Track & log',
    body: 'Tick off custom daily tasks you set for yourself, and log what you eat. Consistency builds streaks — and every log earns ⬡ coins.',
    target: 'nav-tab-track', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'shop', label: 'Shop',
    title: 'Reward yourself',
    body: 'Add items you actually want — trainers, a meal out, a gadget. Spend the ⬡ coins you earn from tasks and achievements to unlock them. Your own personal reward layer, and the incentive to finish what you start.',
    target: 'nav-tab-shop', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'holiday', label: 'Holiday',
    title: 'Plan your trips',
    body: 'Create and track holidays you have booked or are still dreaming about. Countdowns, budgets, and booking status all in one place — so nothing slips.',
    target: 'nav-tab-holiday', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'habits', label: 'Habits',
    title: 'Break bad habits',
    body: 'Add a bad habit you want to quit. A timer starts the moment you add it. Relapse? Reset and go again. Edit or delete whenever you need — honest accountability, no judgement.',
    target: 'nav-tab-habits', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'settings', label: 'Settings',
    title: 'Make it yours',
    body: 'Change the colour scheme, manage your account, set macro goals for nutrition tracking, and replay this tour whenever you need it.',
    target: 'nav-tab-settings', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'done', label: 'Done', icon: '★',
    title: "You're all set",
    body: "Start by adding your first goal, a habit to break, or a trip you're planning. This tour lives in Settings if you ever need it again.",
    target: null, placement: 'center',
  },
];

// Dark OS — same 9-step structure, terser voice
const STEPS_DARK = [
  {
    id: 'welcome', label: 'init', icon: '◆',
    title: 'system init',
    body: 'Orientation tour. 30 seconds. Skippable at any time.',
    target: null, placement: 'center',
  },
  {
    id: 'hub', label: 'hub',
    title: 'the hub',
    body: 'Home base. VisionBoard is a personal life dashboard — goals, habits, nutrition, holidays, rewards. Hub is the landing view: widget canvas, linked resources, daily log.',
    target: 'hub', placement: 'bottom', arrowDir: 'up',
    navTo: 'hub',
  },
  {
    id: 'achievements', label: 'goals',
    title: 'achievements',
    body: 'Drag-and-connect pin-board. Nodes are milestones, lines are dependencies. Completing a node releases ⬡ coins into your wallet.',
    target: 'nav-tab-achievements', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'track', label: 'track',
    title: 'track and log',
    body: 'Tick off custom daily tasks and log nutrition. Streaks accumulate. Every log earns coins.',
    target: 'nav-tab-track', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'shop', label: 'shop',
    title: 'shop',
    body: 'Add items you want online. Spend the ⬡ coins earned from tasks and achievements to unlock them — a personal incentive layer.',
    target: 'nav-tab-shop', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'holiday', label: 'holiday',
    title: 'holiday',
    body: 'Trips you have booked or are still planning. Countdowns, budgets, booking status — tracked in one place.',
    target: 'nav-tab-holiday', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'habits', label: 'habits',
    title: 'habits',
    body: 'Add a bad habit to break. Timer starts on add. Relapse resets it. Edit or delete any time.',
    target: 'nav-tab-habits', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'settings', label: 'settings',
    title: 'settings',
    body: 'Colour scheme, account, macro goals, theme mode — all configurable here. Tour replayable from the Walkthrough card.',
    target: 'nav-tab-settings', placement: 'right', arrowDir: 'left',
  },
  {
    id: 'done', label: 'ready', icon: '◈',
    title: 'system ready',
    body: 'Orientation complete. Add your first node, tracker, or widget to begin. Tour accessible from settings.',
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
