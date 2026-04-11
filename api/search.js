// Vercel Serverless Function - Web Search Proxy (Brave Search API)
// POST /api/search
// Body: { query: string, count?: number, site?: string }

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, count = 5, site } = req.body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'query (string) is required' });
    }

    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'BRAVE_SEARCH_API_KEY not configured'
      });
    }

    const q = `${site ? `site:${site} ` : ''}${query}`.trim();
    const n = Math.max(1, Math.min(20, Number(count) || 5));

    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', q);
    url.searchParams.set('count', String(n));

    const r = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({
        error: 'Search provider error',
        status: r.status,
        body: text.slice(0, 2000)
      });
    }

    const data = await r.json();
    const web = data?.web?.results || [];

    const results = web.map((it) => ({
      title: it?.title || '',
      url: it?.url || '',
      description: it?.description || '',
      source: 'brave'
    })).filter(x => x.url);

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({
      error: 'Search request failed',
      message: err?.message || String(err)
    });
  }
};
