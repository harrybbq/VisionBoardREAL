import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  initRevenueCat,
  getCustomerInfo,
  deriveTierFromEntitlements,
  isAvailable as rcIsAvailable,
} from '../lib/billing/revenuecat';

/**
 * Reads tier from `profiles.tier` (Supabase) as the canonical source
 * of truth. On native platforms with RevenueCat configured, ALSO reads
 * the platform's CustomerInfo and reconciles upward — if the user
 * paid on iOS / Android but the webhook hasn't yet synced into
 * profiles.tier, we still know they're Pro on this device.
 *
 * The reconciliation is one-way: RC can upgrade us in-memory, but we
 * never demote a user whose profiles.tier says they're Pro. That keeps
 * lifetime / promo grants safe even if RC entitlements briefly fail.
 */
export function useSubscription(userId) {
  const [tier, setTier] = useState('free');
  const [proIsLive, setProIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      // Fetch both Supabase reads in parallel
      const [profileResult, configResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('tier')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('config')
          .select('value')
          .eq('key', 'pro_live')
          .maybeSingle(),
      ]);
      if (cancelled) return;

      let dbTier = 'free';
      if (!profileResult.data) {
        await supabase
          .from('profiles')
          .insert({ id: userId, tier: 'free' })
          .single();
      } else {
        dbTier = profileResult.data.tier || 'free';
      }
      setTier(dbTier);

      if (configResult.data) {
        setProIsLive(configResult.data.value === 'true');
      }

      setLoading(false);

      // ── RevenueCat reconcile (native only, no-op on web) ──
      // Fire-and-forget. Init the SDK with our userId so RC can
      // attribute purchases on this device. If their CustomerInfo
      // shows a Pro entitlement we don't yet know about (e.g. they
      // bought on phone, signed in on web), upgrade in-memory.
      try {
        await initRevenueCat({ userId });
        if (!(await rcIsAvailable())) return;
        const info = await getCustomerInfo();
        if (cancelled || !info) return;
        const rcTier = deriveTierFromEntitlements(info.entitlements?.active);
        if (rcTier !== 'free' && dbTier === 'free') {
          // RC says Pro but DB says free — trust RC for this session.
          // The webhook → profiles.tier sync will catch up server-side
          // (or we surface a "Restore purchases" prompt if not).
          setTier(rcTier);
        }
      } catch {
        // Silent — RC is an enhancement, never a blocker
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const isPro = tier === 'pro';
  const isLifetime = tier === 'lifetime';

  return {
    tier,
    isPro,
    isLifetime,
    isFree: tier === 'free',
    // hasPro = "has Pro-level entitlements regardless of how they got
    // them (active sub OR lifetime purchase)". Prefer this for any new
    // gate so lifetime users never get silently locked out.
    hasPro: isPro || isLifetime,
    proIsLive,
    loading,
  };
}
