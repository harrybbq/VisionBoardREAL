import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { user_id, log_date } = await req.json();
    if (!user_id || !log_date) return new Response(JSON.stringify({ error: 'Missing user_id or log_date' }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: rows } = await supabase
      .from('nutrition_log')
      .select('calories,protein_g,carbs_g,fat_g,fibre_g,sugar_g,sodium_mg,additional_nutrients')
      .eq('user_id', user_id)
      .eq('log_date', log_date);

    if (!rows || rows.length === 0) {
      await supabase.from('nutrition_daily_summary').delete()
        .eq('user_id', user_id).eq('log_date', log_date);
      return new Response(JSON.stringify({ deleted: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const summary = rows.reduce((acc, r) => {
      acc.calories  += r.calories  || 0;
      acc.protein_g += r.protein_g || 0;
      acc.carbs_g   += r.carbs_g   || 0;
      acc.fat_g     += r.fat_g     || 0;
      acc.fibre_g   += r.fibre_g   || 0;
      acc.sugar_g   += r.sugar_g   || 0;
      acc.sodium_mg += r.sodium_mg || 0;
      const extras = r.additional_nutrients || {};
      for (const [k, v] of Object.entries(extras)) {
        acc.additional_nutrients[k] = (acc.additional_nutrients[k] || 0) + Number(v);
      }
      return acc;
    }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sodium_mg: 0, additional_nutrients: {} as Record<string, number> });

    await supabase.from('nutrition_daily_summary').upsert({
      user_id, log_date,
      ...summary,
      entry_count: rows.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,log_date' });

    return new Response(JSON.stringify({ ok: true, summary }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
