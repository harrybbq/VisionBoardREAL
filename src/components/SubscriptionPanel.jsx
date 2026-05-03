/**
 * Subscription panel (Settings → Tools tab).
 *
 * Shows:
 *   - Current tier + plan label
 *   - Restore purchases (native only — re-syncs entitlements from
 *     App Store / Play Store after reinstall, device switch, restore
 *     from backup)
 *   - Manage subscription (deep-links to platform-native subscription
 *     management UI — required by Apple's review guidelines)
 *   - Web users see a contextual hint that purchases happen on mobile
 *
 * Status: SCAFFOLDED. The Restore / Manage flows are wired through
 * `src/lib/billing/revenuecat.js` which dynamic-imports the RC plugin.
 * If the plugin isn't installed yet (current state), Restore returns
 * 'unavailable' and we tell the user the native build is required.
 */
import { useState } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { restorePurchases, openManageSubscription } from '../lib/billing/revenuecat';

const TIER_LABEL = {
  free: 'Free',
  pro: 'Pro — Monthly',
  lifetime: 'Lifetime',
};

export default function SubscriptionPanel() {
  const { tier, hasPro, proIsLive, loading } = useSubscriptionContext();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [msgKind, setMsgKind] = useState('info'); // 'info' | 'ok' | 'err'

  function flash(kind, text) {
    setMsgKind(kind);
    setMsg(text);
    setTimeout(() => setMsg(null), 4500);
  }

  async function handleRestore() {
    setBusy(true);
    const r = await restorePurchases();
    setBusy(false);
    if (r.ok) {
      const upgraded = Object.values(r.entitlements || {}).some(e => e?.isActive);
      flash(upgraded ? 'ok' : 'info',
        upgraded
          ? 'Purchases restored. Your Pro entitlement is active.'
          : 'No prior purchases were found on this account.');
    } else if (r.reason === 'unavailable') {
      flash('info', "Restore needs the iOS or Android build — it's a no-op on the web.");
    } else if (r.reason === 'cancelled') {
      // Silent
    } else {
      flash('err', "Couldn't restore purchases. Check your network and try again.");
    }
  }

  async function handleManage() {
    const ok = await openManageSubscription();
    if (!ok) flash('info', 'Open the App Store or Play Store and find VisionBoard under Subscriptions.');
  }

  if (loading) return null;

  return (
    <div className="card" style={{ padding: '22px' }}>
      <h3 style={{ margin: '0 0 4px' }}>Subscription</h3>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.7' }}>
        Manage your plan, restore prior purchases, and open the platform's
        subscription settings.
      </p>

      {/* Current plan */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px',
        borderRadius: '10px',
        border: hasPro ? '2px solid var(--em)' : '1px solid var(--border)',
        background: hasPro ? 'rgba(var(--em-rgb),0.08)' : 'var(--card, rgba(255,255,255,0.04))',
        marginBottom: '14px',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Current plan
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
            {TIER_LABEL[tier] || 'Free'}
          </div>
        </div>
        {!hasPro && proIsLive && (
          <span style={{
            padding: '5px 10px', borderRadius: '6px',
            background: 'var(--em)', color: 'var(--em-on, #fff)',
            fontFamily: 'var(--mono)', fontSize: '10px',
            letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700,
          }}>£3.99 / mo</span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleRestore}
          disabled={busy}
          style={{
            padding: '9px 14px', borderRadius: '8px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'var(--mono)', fontSize: '11px',
            letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'Restoring…' : 'Restore purchases'}
        </button>
        {hasPro && (
          <button
            onClick={handleManage}
            style={{
              padding: '9px 14px', borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--mono)', fontSize: '11px',
              letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Manage subscription
          </button>
        )}
      </div>

      {msg && (
        <div style={{
          marginTop: '14px',
          padding: '10px 12px', borderRadius: '8px',
          background: msgKind === 'err' ? 'rgba(220, 60, 60, 0.08)'
                    : msgKind === 'ok'  ? 'rgba(var(--em-rgb), 0.10)'
                    : 'var(--card, rgba(255,255,255,0.04))',
          border: '1px solid ' + (msgKind === 'err' ? 'rgba(220, 60, 60, 0.25)' : 'var(--border)'),
          fontFamily: 'var(--mono)', fontSize: '11px',
          color: 'var(--text)',
          lineHeight: '1.6',
        }}>{msg}</div>
      )}
    </div>
  );
}
