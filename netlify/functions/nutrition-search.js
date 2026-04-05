/**
 * Netlify serverless function: nutrition-search
 *
 * Proxies Nutritionix API calls so API keys never reach the client.
 *
 * Required Netlify env vars:
 *   NUTRITIONIX_APP_ID   — from developer.nutritionix.com
 *   NUTRITIONIX_API_KEY  — from developer.nutritionix.com
 *
 * Query params:
 *   query  (string)  — food name or natural language string
 *   type   (string)  — "search" (default) | "natural"
 */

// In-memory rate limit: max 10 req/user/minute
// Key = x-forwarded-for IP (Netlify sets this)
const rateLimits = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  rateLimits.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = event.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(ip)) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Search limit reached — try again in a moment' }) };
  }

  const appId = process.env.NUTRITIONIX_APP_ID;
  const apiKey = process.env.NUTRITIONIX_API_KEY;
  if (!appId || !apiKey) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Nutrition search is not configured' }) };
  }

  const { query = '', type = 'search' } = event.queryStringParameters || {};
  if (!query.trim()) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'query is required' }) };
  }

  const nxHeaders = {
    'x-app-id': appId,
    'x-app-key': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    if (type === 'natural') {
      // Natural language: "2 eggs and toast"
      const res = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
        method: 'POST',
        headers: nxHeaders,
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`Nutritionix ${res.status}`);
      const data = await res.json();
      const foods = (data.foods || []).map(f => ({
        food_name: f.food_name,
        brand_name: null,
        serving_qty: f.serving_qty,
        serving_unit: f.serving_unit,
        serving_weight_grams: f.serving_weight_grams,
        calories: Math.round(f.nf_calories || 0),
        protein_g: +(f.nf_protein || 0).toFixed(1),
        carbs_g: +(f.nf_total_carbohydrate || 0).toFixed(1),
        fat_g: +(f.nf_total_fat || 0).toFixed(1),
        fibre_g: +(f.nf_dietary_fiber || 0).toFixed(1),
        sugar_g: +(f.nf_sugars || 0).toFixed(1),
        sodium_mg: +(f.nf_sodium || 0).toFixed(1),
        source: 'nutritionix',
      }));
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ foods }) };
    }

    // Default: instant search
    const url = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}&detailed=true`;
    const res = await fetch(url, { headers: nxHeaders });
    if (!res.ok) throw new Error(`Nutritionix ${res.status}`);
    const data = await res.json();

    function mapItem(f) {
      return {
        food_name: f.food_name,
        brand_name: f.brand_name || null,
        serving_qty: f.serving_qty || 1,
        serving_unit: f.serving_unit || 'serving',
        serving_weight_grams: f.serving_weight_grams || 100,
        calories: Math.round(f.nf_calories || 0),
        protein_g: +(f.nf_protein || 0).toFixed(1),
        carbs_g: +(f.nf_total_carbohydrate || 0).toFixed(1),
        fat_g: +(f.nf_total_fat || 0).toFixed(1),
        fibre_g: +(f.nf_dietary_fiber || 0).toFixed(1),
        sugar_g: +(f.nf_sugars || 0).toFixed(1),
        sodium_mg: +(f.nf_sodium || 0).toFixed(1),
        source: 'nutritionix',
      };
    }

    const branded = (data.branded || []).slice(0, 10).map(mapItem);
    const common = (data.common || []).slice(0, 10).map(mapItem);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ branded, common }) };

  } catch (err) {
    console.error('nutrition-search error:', err.message);
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Could not reach nutrition database — try again' }) };
  }
};
