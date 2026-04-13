// Vercel Serverless Function - OpenGraph image fetcher
// GET /api/og-image?url=https://example.com
// Returns: { imageUrl: string }

const OG_RE = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']\s*\/?>/i;
const OG2_RE = /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']\s*\/?>/i;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const target = req.query?.url;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'url query param is required' });
    }

    const u = new URL(target);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return res.status(400).json({ error: 'invalid url protocol' });
    }

    // Keep this lightweight. No scripts, no scraping, just HTML head.
    const r = await fetch(u.toString(), {
      method: 'GET',
      headers: {
        // Some sites block default UA, this helps a bit.
        'User-Agent': 'Mozilla/5.0 (compatible; NerdyMugsBot/1.0; +https://vercel.com)'
      }
    });

    if (!r.ok) {
      return res.status(200).json({ imageUrl: '' });
    }

    const html = await r.text();
    const m = html.match(OG_RE) || html.match(OG2_RE);
    const imageUrl = m?.[1] || '';

    // Cache on the edge for a bit to reduce repeat fetches.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json({ imageUrl });
  } catch {
    return res.status(200).json({ imageUrl: '' });
  }
};
