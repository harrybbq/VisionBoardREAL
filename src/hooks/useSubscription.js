import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSubscription(userId) {
  const [tier, setTier] = useState('free');
  const [proIsLive, setProIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function load() {
      // Fetch both in parallel
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

      // Upsert a free profile row if none exists
      if (!profileResult.data) {
        await supabase
          .from('profiles')
          .insert({ id: userId, tier: 'free' })
          .single();
        setTier('free');
      } else {
        setTier(profileResult.data.tier || 'free');
      }

      if (configResult.data) {
        setProIsLive(configResult.data.value === 'true');
      }

      setLoading(false);
    }

    load();
  }, [userId]);

  return {
    tier,
    isPro: tier === 'pro',
    isLifetime: tier === 'lifetime',
    isFree: tier === 'free',
    proIsLive,
    loading,
  };
}
