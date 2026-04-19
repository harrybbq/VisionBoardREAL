import { useSubscriptionContext } from '../context/SubscriptionContext';

/**
 * Free-tier caps. Pro and Lifetime have no caps.
 *
 * Each cap is { limit, label } where label is shown in the paywall
 * modal so the user understands exactly what they're hitting.
 */
export const FREE_CAPS = {
  links:        { limit: 3,  label: 'link widgets' },
  habits:       { limit: 5,  label: 'active habits' },
  achievements: { limit: 10, label: 'achievements' },
  holidays:     { limit: 1,  label: 'holiday' },
  shopItems:    { limit: 50, label: 'shopping items' },
  trackers:     { limit: 5,  label: 'trackers' },
};

/**
 * Returns helpers for checking free-tier limits.
 *
 *   const { canAdd, atLimit, capFor } = useTierLimits();
 *   if (!canAdd('habits', S.habits.length)) showPaywall();
 *
 * Pro/Lifetime users always pass `canAdd`.
 */
export function useTierLimits() {
  const { isPro, isLifetime, loading } = useSubscriptionContext();
  const isUnlimited = isPro || isLifetime;

  function capFor(key) {
    return FREE_CAPS[key] || null;
  }

  function atLimit(key, currentCount) {
    if (isUnlimited) return false;
    const cap = capFor(key);
    if (!cap) return false;
    return currentCount >= cap.limit;
  }

  function canAdd(key, currentCount) {
    return !atLimit(key, currentCount);
  }

  function remaining(key, currentCount) {
    if (isUnlimited) return Infinity;
    const cap = capFor(key);
    if (!cap) return Infinity;
    return Math.max(0, cap.limit - currentCount);
  }

  return {
    isUnlimited,
    loading,
    canAdd,
    atLimit,
    remaining,
    capFor,
  };
}
