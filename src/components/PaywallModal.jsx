/**
 * Paywall modal — shown when a free user crosses a cap (or taps an
 * upgrade affordance from anywhere). Three modes:
 *
 *   1. RC offerings load successfully on a native build →
 *      render three package cards (Lifetime / Yearly / Monthly) and
 *      run the platform purchase sheet on tap. This is the "real"
 *      mode that drives revenue.
 *
 *   2. RC unavailable (web, no plugin, no API key set, offerings
 *      empty) → fall back to the legacy waitlist CTA. The web build
 *      can't actually sell you a sub anyway — App Store / Play Store
 *      are the only payment surfaces — so pointing to a waitlist
 *      keeps the surface honest.
 *
 *   3. Pro isn't live yet (config.pro_live === false) → also fall
 *      back to the waitlist path, regardless of platform.
 *
 * The cap context (FREE_CAPS[capKey]) is preserved so the headline
 * still reads "You've reached your free limit of N habits".
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FREE_CAPS } from '../hooks/useTierLimits';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { getOfferings, purchasePackage, isAvailable as rcIsAvailable } from '../lib/billing/revenuecat';

// Display order for package cards. RC's `availablePackages` array
// arrives in dashboard order which is unreliable; sort by our own
// preference so Lifetime is always last (one-time, biggest commitment),
// Yearly first (best value, headline), Monthly between.
const PACKAGE_ORDER = ['$rc_annual', '$rc_monthly', '$rc_lifetime'];
const PACKAGE_META = {
  $rc_lifetime: { label: 'Lifetime',  sub: 'One payment. Yours forever.', accent: 'gold' },
  $rc_annual:   { label: 'Yearly',    sub: 'Best value — save vs monthly.', accent: 'em', badge: 'Best value' },
  $rc_monthly:  { label: 'Monthly',   sub: 'Billed monthly. Cancel anytime.', accent: 'mid' },
};

function packageWeight(p) {
  const idx = PACKAGE_ORDER.indexOf(p.identifier);
  return idx === -1 ? 99 : idx;
}

export default function PaywallModal({ openId, onClose, onUpgrade, onShowToast }) {
  const { proIsLive, hasPro } = useSubscriptionContext();
  const isOpen = typeof openId === 'string' && openId.startsWith('paywall:');
  const capKey = isOpen ? openId.split(':')[1] : null;
  const cap = capKey ? FREE_CAPS[capKey] : null;

  const [offerings, setOfferings] = useState(null);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [error, setError] = useState(null);

  // Load offerings when the modal opens. We do it on every open
  // (not on mount) so a user who connects to RC mid-session gets
  // packages on their next paywall view without a refresh.
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setPurchasingId(null);
      return;
    }
    let cancelled = false;
    setOfferingsLoading(true);
    (async () => {
      try {
        if (!(await rcIsAvailable())) {
          if (!cancelled) { setOfferings(null); setOfferingsLoading(false); }
          return;
        }
        const o = await getOfferings();
        if (!cancelled) { setOfferings(o); setOfferingsLoading(false); }
      } catch {
        if (!cancelled) { setOfferings(null); setOfferingsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  async function handlePurchase(pkg) {
    setPurchasingId(pkg.identifier);
    setError(null);
    const result = await purchasePackage(pkg);
    setPurchasingId(null);
    if (result.ok) {
      onShowToast?.('✦ Welcome to Pro — your tier is active.', true);
      onClose?.();
    } else if (result.reason === 'cancelled') {
      // Silent — user backed out of the platform sheet
    } else {
      setError(
        result.reason === 'unavailable'
          ? "Purchases need the iOS or Android build to fire — they don't work on the web."
          : "Couldn't complete the purchase. Try again, or restore from Settings → Subscription if you've bought before."
      );
    }
  }

  // Decide what to render in the actions area
  const packages = offerings?.availablePackages || [];
  const hasPackages = packages.length > 0;
  const useStorefront = isOpen && proIsLive && hasPackages && !hasPro;
  const sortedPackages = hasPackages ? [...packages].sort((a, b) => packageWeight(a) - packageWeight(b)) : [];

  return (
    <AnimatePresence>
      {isOpen && cap && (
        <motion.div
          className="modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{ display: 'flex' }}
        >
          <motion.div
            className="modal paywall-modal"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <div className="paywall-hero">
              <div className="paywall-hero-icon">✦</div>
              <div className="paywall-hero-eyebrow">VisionBoard Pro</div>
              <h3 className="paywall-hero-title">
                {hasPro
                  ? "You're already on Pro"
                  : `You've reached your free limit of ${cap.limit} ${cap.label}`}
              </h3>
              <p className="paywall-hero-sub">
                Pro removes every cap and unlocks the AI Coach, daily briefs, and more.
              </p>
            </div>

            <div className="paywall-features">
              <PaywallFeature icon="∞" title="Unlimited everything" sub="Habits, achievements, widgets, holidays — no caps." />
              <PaywallFeature icon="✦" title="AI Coach + Daily Brief" sub="Personal insights and weekly reviews tailored to your data." />
              <PaywallFeature icon="◉" title="Camera nutrition scanner" sub="Point your phone at food, get instant macros." />
              <PaywallFeature icon="◇" title="Custom themes & full history" sub="Pick any colour, see your full year of data." />
            </div>

            {/* Storefront — three package cards. Replaces the single
                CTA when RC offerings are available. */}
            {useStorefront ? (
              <div className="paywall-storefront">
                {sortedPackages.map(pkg => {
                  const meta = PACKAGE_META[pkg.identifier] || { label: pkg.product?.title || 'Plan', sub: pkg.product?.description || '' };
                  const busy = purchasingId === pkg.identifier;
                  return (
                    <button
                      key={pkg.identifier}
                      className={`paywall-pkg paywall-pkg-${meta.accent}`}
                      onClick={() => handlePurchase(pkg)}
                      disabled={!!purchasingId}
                    >
                      {meta.badge && <span className="paywall-pkg-badge">{meta.badge}</span>}
                      <div className="paywall-pkg-label">{meta.label}</div>
                      <div className="paywall-pkg-price">
                        {pkg.product?.priceString || ''}
                      </div>
                      <div className="paywall-pkg-sub">{meta.sub}</div>
                      {busy && <div className="paywall-pkg-busy">Opening…</div>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="paywall-actions">
                <button className="btn btn-ghost" onClick={onClose}>Maybe later</button>
                <button
                  className="btn btn-primary paywall-cta"
                  onClick={onUpgrade}
                  disabled={offeringsLoading}
                >
                  {hasPro
                    ? 'Manage in Settings'
                    : offeringsLoading
                      ? 'Loading…'
                      : proIsLive
                        ? 'Upgrade — £3.99/mo'
                        : 'Join the waitlist'}
                </button>
              </div>
            )}

            {error && (
              <div className="paywall-error" role="alert">{error}</div>
            )}

            <p className="paywall-fineprint">
              Cancel anytime. UK GDPR compliant. Your data stays yours.
              {useStorefront && ' Subscriptions auto-renew until cancelled in your platform settings.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PaywallFeature({ icon, title, sub }) {
  return (
    <div className="paywall-feature">
      <div className="paywall-feature-icon">{icon}</div>
      <div className="paywall-feature-body">
        <div className="paywall-feature-title">{title}</div>
        <div className="paywall-feature-sub">{sub}</div>
      </div>
    </div>
  );
}
