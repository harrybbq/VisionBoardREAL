/**
 * useCapacitor
 *
 * Initialises all Capacitor native plugins when running inside a native
 * Android / iOS shell. Safe to call in a web browser — every import is
 * guarded by Capacitor.isNativePlatform() so no-ops on the web.
 */
import { useEffect, useRef } from 'react';

// Lazy-load Capacitor so Vite can still bundle a pure-web build if needed.
let capCore = null;
async function getCap() {
  if (!capCore) capCore = await import('@capacitor/core');
  return capCore;
}

export function useCapacitor({ onPushToken, onPushMessage } = {}) {
  const listenersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { Capacitor } = await getCap();
      if (!Capacitor.isNativePlatform()) return;

      // ── Status Bar ───────────────────────────────────────────────────────
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch (e) {
        console.warn('StatusBar:', e.message);
      }

      // ── Splash Screen ────────────────────────────────────────────────────
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        // Give React 400 ms to paint, then hide
        setTimeout(() => SplashScreen.hide({ fadeOutDuration: 300 }), 400);
      } catch (e) {
        console.warn('SplashScreen:', e.message);
      }

      // ── Push Notifications ───────────────────────────────────────────────
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const { receive } = await PushNotifications.checkPermissions();
        const needsRequest = receive === 'prompt' || receive === 'prompt-with-rationale';

        if (needsRequest) {
          const { receive: granted } = await PushNotifications.requestPermissions();
          if (granted !== 'granted') {
            return;
          }
        }

        await PushNotifications.register();

        const t1 = await PushNotifications.addListener('registration', token => {
          onPushToken?.(token.value);
        });

        const t2 = await PushNotifications.addListener('registrationError', err => {
          console.error('Push registration error:', err.error);
        });

        const t3 = await PushNotifications.addListener('pushNotificationReceived', notification => {
          // App is in foreground
          onPushMessage?.({ ...notification, foreground: true });
        });

        const t4 = await PushNotifications.addListener('pushNotificationActionPerformed', action => {
          // User tapped a notification
          onPushMessage?.({ ...action.notification, tapped: true });
        });

        if (!cancelled) {
          listenersRef.current.push(t1, t2, t3, t4);
        }
      } catch (e) {
        console.warn('PushNotifications:', e.message);
      }

      // ── Android Back Button ──────────────────────────────────────────────
      try {
        const { App } = await import('@capacitor/app');

        const t5 = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            // Double-tap back to exit
            if (window._backPressedOnce) {
              App.exitApp();
            } else {
              window._backPressedOnce = true;
              setTimeout(() => { window._backPressedOnce = false; }, 2000);
              // Optionally show a toast here
            }
          }
        });

        if (!cancelled) listenersRef.current.push(t5);
      } catch (e) {
        console.warn('App (backButton):', e.message);
      }
    }

    init();

    return () => {
      cancelled = true;
      // Remove all native event listeners on unmount
      listenersRef.current.forEach(l => l.remove());
      listenersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Capacitor-aware haptic feedback.
 * Falls back to navigator.vibrate() on web/Android Chrome.
 */
export async function haptic(style = 'LIGHT') {
  try {
    const { Capacitor } = await getCap();
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle[style] ?? ImpactStyle.Light });
      return;
    }
  } catch { /* fall through */ }
  // Web fallback
  const durations = { LIGHT: 4, MEDIUM: 8, HEAVY: 12 };
  navigator.vibrate?.(durations[style] ?? 4);
}
