// Cloudflare Pages Function — ersätter td-receiver.php
// Lagrar senaste TD-data i KV-lagring (bindning: TD_DATA)
//
// POST /td-receiver  → tar emot JSON från Tournament Director, sparar i KV
// GET  /td-receiver  → returnerar senaste sparade data till index.html

const KV_KEY = 'latest';
const ALLOWED_ORIGINS = ['https://live.vastanforspoker.org'];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin === '';
  return {
    'Access-Control-Allow-Origin': allowed ? origin || '*' : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  // ── POST: Tournament Director skickar hit ─────────────────────────────
  if (method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      // TD skickar ibland application/x-www-form-urlencoded — försök parsa det
      try {
        const text = await request.text();
        // Kolla om det är JSON i en form-parameter
        const params = new URLSearchParams(text);
        const jsonParam = params.get('json') || params.get('data') || text;
        body = JSON.parse(jsonParam);
      } catch (e2) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
        });
      }
    }

    // Spara i KV med timestamp
    const payload = { ...body, _receivedAt: Date.now() };
    await env.TD_DATA.put(KV_KEY, JSON.stringify(payload));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }

  // ── GET: index.html pollar hit ────────────────────────────────────────
  if (method === 'GET') {
    const raw = await env.TD_DATA.get(KV_KEY);
    if (!raw) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }
    return new Response(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...corsHeaders(request),
      },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}