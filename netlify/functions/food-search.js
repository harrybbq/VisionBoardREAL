/**
 * Netlify serverless function: food-search
 *
 * Proxies Open Food Facts requests server-side to avoid browser CORS /
 * connectivity issues from the Netlify edge.
 *
 * No API key required — Open Food Facts is free and open.
 *
 * Routes (via ?mode=):
 *   ?mode=name&q=chicken+breast   — text search
 *   ?mode=barcode&q=5000159407236 — barcode lookup
 */

const OFF = 'https://world.openfoodfacts.org';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Rate limit: 30 searches / IP / minute
const rateLimits = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = rateLimits.get(ip) || { count: 0, start: now };
  if (now - e.start > 60_000) { e.count = 0; e.start = now; }
  e.count++;
  rateLimits.set(ip, e);
  return e.count <= 30;
}

function mapProduct(p) {
  const n = p.nutriments || {};
  const per100 = k => parseFloat(n[k + '_100g'] ?? n[k] ?? 0) || 0;
  return {
    food_name: p.product_name || p.abbreviated_product_name || '',
    brand:     p.brands || '',
    barcode:   p.code || p._id || '',
    serving_g: parseFloat(p.serving_quantity) || 100,
    calories:  per100('energy-kcal'),
    protein_g: per100('proteins'),
    carbs_g:   per100('carbohydrates'),
    fat_g:     per100('fat'),
    fibre_g:   per100('fiber'),
    sugar_g:   per100('sugars'),
    sodium_mg: Math.round(per100('sodium') * 1000),
    source:    'openfoodfacts',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const ip = event.headers['x-forwarded-for'] || 'unknown';
  if (!checkRate(ip)) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Too many requests' }) };
  }

  const { mode = 'name', q = '' } = event.queryStringParameters || {};
  if (!q.trim()) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'q is required' }) };
  }

  try {
    let products = [];

    if (mode === 'barcode') {
      const res = await fetch(`${OFF}/api/v0/product/${encodeURIComponent(q.trim())}.json`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        products = [mapProduct({ ...json.product, code: q.trim() })];
      }
    } else {
      const params = new URLSearchParams({
        action: 'process', json: '1',
        search_terms: q.trim(),
        page_size: '12',
        fields: 'product_name,brands,code,nutriments,serving_quantity',
      });
      const res = await fetch(`${OFF}/cgi/search.pl?${params}`);
      const json = await res.json();
      products = (json.products || [])
        .filter(p => p.product_name)
        .map(p => mapProduct(p));
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ products }) };
  } catch (err) {
    console.error('food-search error:', err.message);
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Food search failed' }) };
  }
};
