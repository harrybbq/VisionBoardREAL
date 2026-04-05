import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getTodayStr } from '../utils/helpers';

export function useNutrition(userId, selectedDate) {
  const date = selectedDate || getTodayStr();
  const [macros, setMacros] = useState([]);
  const [summary, setSummary] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [monthSummary, setMonthSummary] = useState({});
  const [loading, setLoading] = useState(true);
  // Guard against React StrictMode double-invocation causing duplicate seeds
  const seedingRef = useRef(false);

  // Seed default macros on first use
  const seedDefaults = useCallback(async () => {
    if (seedingRef.current) return;
    seedingRef.current = true;
    const { count } = await supabase
      .from('nutrition_macros')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (count === 0) {
      await supabase.rpc('seed_default_macros', { p_user_id: userId });
    }
  }, [userId]);

  const loadMacros = useCallback(async () => {
    const { data } = await supabase
      .from('nutrition_macros')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });
    setMacros(data || []);
  }, [userId]);

  const loadDay = useCallback(async (d) => {
    const [{ data: sum }, { data: entries }] = await Promise.all([
      supabase.from('nutrition_daily_summary').select('*').eq('user_id', userId).eq('log_date', d).maybeSingle(),
      supabase.from('nutrition_log').select('*').eq('user_id', userId).eq('log_date', d).order('created_at', { ascending: true }),
    ]);
    setSummary(sum || null);
    setLogEntries(entries || []);
  }, [userId]);

  const loadMonth = useCallback(async (year, month) => {
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data } = await supabase
      .from('nutrition_daily_summary')
      .select('log_date,calories')
      .eq('user_id', userId)
      .gte('log_date', from)
      .lte('log_date', to);
    const map = {};
    (data || []).forEach(r => { map[r.log_date] = r; });
    setMonthSummary(map);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([seedDefaults(), loadMacros()]).then(() => setLoading(false));
  }, [userId, seedDefaults, loadMacros]);

  useEffect(() => {
    if (!userId) return;
    loadDay(date);
  }, [userId, date, loadDay]);

  // Recalculate summary client-side from log entries
  const recalcSummary = useCallback(async (d) => {
    const { data: entries } = await supabase
      .from('nutrition_log')
      .select('calories,protein_g,carbs_g,fat_g,fibre_g,sugar_g,sodium_mg,additional_nutrients')
      .eq('user_id', userId)
      .eq('log_date', d);

    if (!entries || entries.length === 0) {
      await supabase.from('nutrition_daily_summary').delete().eq('user_id', userId).eq('log_date', d);
      setSummary(null);
      return null;
    }

    const sum = entries.reduce((acc, r) => ({
      calories:  acc.calories  + (r.calories  || 0),
      protein_g: acc.protein_g + (r.protein_g || 0),
      carbs_g:   acc.carbs_g   + (r.carbs_g   || 0),
      fat_g:     acc.fat_g     + (r.fat_g     || 0),
      fibre_g:   acc.fibre_g   + (r.fibre_g   || 0),
      sugar_g:   acc.sugar_g   + (r.sugar_g   || 0),
      sodium_mg: acc.sodium_mg + (r.sodium_mg || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sodium_mg: 0 });

    const { data: upserted } = await supabase.from('nutrition_daily_summary').upsert({
      user_id: userId, log_date: d, ...sum, entry_count: entries.length, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,log_date' }).select().single();

    setSummary(upserted);
    return upserted;
  }, [userId]);

  return {
    macros, summary, logEntries, monthSummary, loading,
    reload: () => { loadMacros(); loadDay(date); },
    reloadDay: (d) => loadDay(d),
    loadMonth,
    recalcSummary,
    setMacros,
    setLogEntries,
  };
}
