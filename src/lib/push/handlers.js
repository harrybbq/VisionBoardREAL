/**
 * Push notification handler scaffolding.
 *
 * The plumbing in useCapacitor.js already does APNs/FCM registration,
 * subscribes to token events, and routes incoming + tapped messages
 * to two callbacks. This module is what those callbacks delegate to —
 * separating "react to a push" from "register for pushes" so the
 * feature stays testable without a native runtime.
 *
 * Status: SCAFFOLDED. Will not fire end-to-end until:
 *   1. APNs key uploaded to RevenueCat / your push provider
 *   2. FCM service-account JSON uploaded
 *   3. Server-side function created that calls the push provider when
 *      a vision unlocks / a friend request arrives / etc.
 *
 * Until then this just stores the token (so the server has something
 * to target) and logs incoming messages so we can verify the wiring.
 */

import { supabase } from '../supabase';

/**
 * Persist the device push token to a place the server can read it.
 *
 * For v1 we stash it in the user's `user_data.state.pushTokens` JSON
 * blob — works without a schema migration. When we hit ~100 users
 * we'll graduate this to a dedicated `push_tokens` table with
 * (user_id, token, platform, registered_at, last_seen_at).
 */
export async function registerPushToken(userId, token, platform = 'unknown') {
  if (!userId || !token) return;
  try {
    // Read current tokens from the user_data row
    const { data, error } = await supabase
      .from('user_data')
      .select('state')
      .eq('id', userId)
      .maybeSingle();
    if (error) return;
    const state = data?.state || {};
    const pushTokens = Array.isArray(state.pushTokens) ? state.pushTokens : [];
    // Deduplicate by token; bump registeredAt if already present
    const filtered = pushTokens.filter(t => t.token !== token);
    const next = [
      ...filtered,
      { token, platform, registeredAt: new Date().toISOString() },
    ].slice(-5); // cap at 5 devices per user
    await supabase
      .from('user_data')
      .update({ state: { ...state, pushTokens: next } })
      .eq('id', userId);
  } catch {
    // Silent fail — push token storage failing shouldn't crash the app
  }
}

/**
 * Route an incoming push message to the right in-app side-effect.
 *
 * Supported payloads (declared in the `data` field of the push):
 *   - kind: 'vision-unlock'    → toast + (eventually) confetti
 *   - kind: 'friend-request'   → toast + navigate to Friends rail
 *   - kind: 'streak-warning'   → toast urging the user to log
 *   - kind: 'coach-nudge'      → toast with the nudge body
 *
 * `msg` shape (from useCapacitor):
 *   { title, body, data: { kind, ... }, foreground?, tapped? }
 *
 * `actions` is the dependency-injection bag — caller passes in
 * navigate / showToast / etc so this module doesn't import the world.
 */
export function handleIncomingPush(msg, actions = {}) {
  const { navigate, showToast } = actions;
  const data = msg?.data || {};
  const kind = data.kind;

  // Default: just toast the title + body if it's foreground
  if (!kind) {
    if (msg?.foreground && showToast && msg.title) {
      showToast(msg.title, true);
    }
    return;
  }

  switch (kind) {
    case 'vision-unlock':
      if (showToast) showToast(`✦ ${msg.title || 'Vision unlocked'}`, true);
      break;
    case 'friend-request':
      if (showToast) showToast(`◌ ${msg.title || 'New friend request'}`, true);
      // If tapped, navigate to where the rail lives (hub for now;
      // dedicated friends route later).
      if (msg?.tapped && navigate) navigate('hub');
      break;
    case 'streak-warning':
      if (showToast) showToast(`⏰ ${msg.body || 'Streak at risk'}`);
      if (msg?.tapped && navigate) navigate('track');
      break;
    case 'coach-nudge':
      if (showToast) showToast(`✦ ${msg.body || 'Coach has a nudge'}`, true);
      if (msg?.tapped && navigate) navigate('hub');
      break;
    default:
      if (msg?.foreground && showToast && msg.title) {
        showToast(msg.title, true);
      }
  }
}
