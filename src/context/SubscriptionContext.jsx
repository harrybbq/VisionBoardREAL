import { createContext, useContext } from 'react';
import { useSubscription } from '../hooks/useSubscription';

const SubscriptionContext = createContext({
  tier: 'free',
  isPro: false,
  isLifetime: false,
  isFree: true,
  hasPro: false,
  proPlan: null,
  isMonthly: false,
  isAnnual: false,
  proIsLive: false,
  loading: true,
});

export function SubscriptionProvider({ userId, children }) {
  const value = useSubscription(userId);
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}
