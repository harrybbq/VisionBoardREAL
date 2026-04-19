/**
 * useIsOwner
 *
 * Owner-only gate for features reserved to the app owner's account
 * (e.g. Gmail / Outlook integrations that can't reasonably be rolled
 * out to all users without OAuth app-verification).
 *
 * The owner email(s) are read from the Vite env var VITE_OWNER_EMAIL
 * (comma-separated for multiple). If unset, nobody is the owner and
 * every owner-only feature is hidden.
 *
 * Usage:
 *   const { isOwner } = useIsOwner(userEmail);
 *   if (isOwner) <GmailPanel />
 *
 * The comparison is case-insensitive and trims whitespace. Do NOT
 * rely on this for server-side authorisation — it's UI-gating only.
 * Anything that actually touches private credentials should also be
 * checked against the authenticated session on the server.
 */

export function useIsOwner(userEmail) {
  const raw = import.meta.env.VITE_OWNER_EMAIL || '';
  const allow = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const current = (userEmail || '').trim().toLowerCase();
  const isOwner = !!current && allow.includes(current);
  return { isOwner };
}
