// Cloudflare Pages Function — ersätter td-receiver.php
// Lagrar senaste TD-data i KV-lagring (bindning: TD_DATA)
//
// POST /td-receiver  → tar emot JSON från Tournament Director, sparar i KV
// GET  /td-receiver  → returnerar senaste sparade data till index.html

const KV_KEY = 'latest';
const ALLOWED_ORIGINS = ['https://live.vastanforspoker.org', 'https://vastanforspoker.se'];

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
    const url    = new URL(request.url);
    const isRaw  = url.searchParams.get('raw')   === '1';
    const isDebug= url.searchParams.get('debug') === '1';

    const raw = await env.TD_DATA.get(KV_KEY);
    const data = raw ? JSON.parse(raw) : null;

    // ?raw=1 — pretty-printed JSON, samma som td-receiver.php?raw=1
    if (isRaw) {
      const body = data
        ? JSON.stringify(data, null, 4)
        : '{}  // Ingen data mottagen ännu';
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // ?debug=1 — HTML-sida med fältlista och metadata
    if (isDebug) {
      const receivedAt = data?._receivedAt
        ? new Date(data._receivedAt).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
        : '—';
      const fields = data
        ? Object.keys(data).filter(k => k !== '_receivedAt')
        : [];
      const rows = fields.map(k => {
        const v = data[k];
        const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `<tr><td>${k}</td><td>${val}</td></tr>`;
      }).join('');
      const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TD Debug</title>
<style>
  body { font-family: monospace; background: #0d1117; color: #e6edf3; padding: 24px; }
  h1   { color: #58a6ff; font-size: 1.2rem; margin-bottom: 4px; }
  .meta { color: #8b949e; font-size: 0.8rem; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; max-width: 700px; }
  th    { text-align: left; color: #58a6ff; font-size: 0.75rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 6px 12px; border-bottom: 1px solid #30363d; }
  td    { padding: 6px 12px; border-bottom: 1px solid #21262d;
          font-size: 0.85rem; }
  tr:hover td { background: #161b22; }
  td:first-child { color: #8b949e; width: 220px; }
  td:last-child  { color: #e6edf3; }
  .none { color: #8b949e; padding: 16px 0; }
  a    { color: #58a6ff; font-size: 0.8rem; }
</style>
</head>
<body>
<h1>♠ TD Debug</h1>
<div class="meta">
  Senaste uppdatering: <strong>${receivedAt}</strong> &nbsp;·&nbsp;
  ${fields.length} fält &nbsp;·&nbsp;
  <a href="?raw=1">Visa rå JSON</a> &nbsp;·&nbsp;
  <a href="/">← Live-sidan</a>
</div>
${fields.length
  ? `<table><tr><th>Fält</th><th>Värde</th></tr>${rows}</table>`
  : `<p class="none">Ingen data mottagen ännu. Väntar på Tournament Director…</p>`
}
</body></html>`;
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' },
      });
    }

    // Normal polling från index.html
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