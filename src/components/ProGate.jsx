import { useSubscriptionContext } from '../context/SubscriptionContext';

/**
 * Gates a premium feature.
 *
 * Props:
 *   teaser     — rendered when isFree && !proIsLive  (pre-launch teaser)
 *   upgradeCta — rendered when isFree && proIsLive   (upgrade prompt)
 *   children   — rendered when isPro || isLifetime
 */
export default function ProGate({ children, teaser, upgradeCta }) {
  const { isPro, isLifetime, isFree, proIsLive, loading } = useSubscriptionContext();

  if (loading) return null;
  if (isPro || isLifetime) return children;
  if (isFree && proIsLive) return upgradeCta ?? teaser ?? null;
  return teaser ?? null;
}
