import { motion, AnimatePresence } from 'framer-motion';
import { FREE_CAPS } from '../hooks/useTierLimits';
import { useSubscriptionContext } from '../context/SubscriptionContext';

/**
 * Shown when a free user tries to add past a cap.
 *
 * Props:
 *   openId  — null | 'paywall:<capKey>' (capKey from FREE_CAPS)
 *   onClose
 *   onUpgrade  — fired when the upgrade CTA is clicked
 */
export default function PaywallModal({ openId, onClose, onUpgrade }) {
  const { proIsLive } = useSubscriptionContext();
  const isOpen = typeof openId === 'string' && openId.startsWith('paywall:');
  const capKey = isOpen ? openId.split(':')[1] : null;
  const cap = capKey ? FREE_CAPS[capKey] : null;

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
                You've reached your free limit of {cap.limit} {cap.label}
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

            <div className="paywall-actions">
              <button className="btn btn-ghost" onClick={onClose}>Maybe later</button>
              <button className="btn btn-primary paywall-cta" onClick={onUpgrade}>
                {proIsLive ? 'Upgrade — £3.99/mo' : 'Join the waitlist'}
              </button>
            </div>

            <p className="paywall-fineprint">
              Cancel anytime. UK GDPR compliant. Your data stays yours.
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
