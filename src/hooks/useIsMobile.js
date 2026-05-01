import { useEffect, useState } from 'react';

/**
 * Mobile breakpoint detection via matchMedia. Used to conditionally
 * render mobile-specific chrome (bottom tabs, app bar, more drawer)
 * vs the desktop sidenav + page header.
 *
 * Why matchMedia instead of just `window.innerWidth < 768`?
 *   - matchMedia subscribes to viewport changes, including orientation
 *     flips on real devices, without us setting up a resize listener.
 *   - SSR-safe: returns a sensible default before window is available.
 *
 * Threshold: 768px — same breakpoint we already use across index.css
 * for the existing mobile media queries. Keeping the JS and CSS in
 * lockstep means a layout that hides via CSS at <768 also gets the
 * mobile component swap at <768.
 */
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Default true if window not available (SSR), false otherwise — but
  // we're a Vite SPA so window is always defined; this is just defensive.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = e => setIsMobile(e.matches);
    // Modern browsers use addEventListener; Safari < 14 used addListener.
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  return isMobile;
}

export const MOBILE_BREAKPOINT_PX = MOBILE_BREAKPOINT;
