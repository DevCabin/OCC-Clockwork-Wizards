// Vercel Serverless Function - Amazon Creators API Search Proxy
// POST /api/paapi-search
// Body: { keywords: string[] | string, searchIndex?: string, itemCount?: number }
// Env:
//   CREATORS_CREDENTIAL_ID   (from Amazon Associates → Creators API → credential)
//   CREATORS_CREDENTIAL_SECRET
//   PAAPI_PARTNER_TAG  (or PAAPI_AMAZON_ASSOCIATE_TAG)

const sdk = require('creatorsapi-nodejs-sdk');

function normalizeProducts(items = []) {
  const mapped = items.map((item) => {
    const asin = item.asin || '';
    const title = item.itemInfo?.title?.displayValue || '';
    const imageUrl =
      item.images?.primary?.large?.url ||
      item.images?.primary?.medium?.url ||
      '';
    const price =
      item.offersV2?.listings?.[0]?.price?.money?.displayAmount || '';
    const features = item.itemInfo?.features?.displayValues || [];
    const productUrl =
      item.detailPageURL ||
      (asin ? `https://www.amazon.com/dp/${asin}` : '');

    return { asin, title, imageUrl, productUrl, price, features };
  });

  // Reliability gate: keep only complete product cards.
  return mapped.filter(
    (p) => p.asin && p.title && p.imageUrl && p.price && p.productUrl
  );
}

function buildKeywordAttempts(keywords) {
  const attempts = [keywords.trim()];
  if (!/\bmug\b/i.test(keywords)) attempts.push(`${keywords} mug`);
  if (!/\bcoffee mug\b/i.test(keywords))
    attempts.push(`${keywords} coffee mug`);
  return [...new Set(attempts.map((k) => k.trim()).filter(Boolean))];
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const credentialId = (
      process.env.CREATORS_CREDENTIAL_ID || ''
    ).trim();
    const credentialSecret = (
      process.env.CREATORS_CREDENTIAL_SECRET || ''
    ).trim();
    const partnerTag = (
      process.env.PAAPI_PARTNER_TAG ||
      process.env.PAAPI_AMAZON_ASSOCIATE_TAG ||
      ''
    ).trim();

    if (!credentialId || !credentialSecret || !partnerTag) {
      return res.status(500).json({
        error: 'Creators API env vars not configured',
        missing: {
          CREATORS_CREDENTIAL_ID: !credentialId,
          CREATORS_CREDENTIAL_SECRET: !credentialSecret,
          PAAPI_PARTNER_TAG: !partnerTag,
        },
      });
    }

    const body = req.body || {};
    const keywordsRaw = body.keywords;
    const keywords = Array.isArray(keywordsRaw)
      ? keywordsRaw.filter(Boolean).join(' ')
      : typeof keywordsRaw === 'string'
        ? keywordsRaw
        : '';

    if (!keywords.trim()) {
      return res
        .status(400)
        .json({ error: 'keywords is required (string or string[])' });
    }

    const searchIndex = body.searchIndex || 'All';
    const itemCount = Math.max(3, Math.min(10, Number(body.itemCount) || 8));

    // Configure Creators API client
    const apiClient = new sdk.ApiClient();
    apiClient.setCredentialId(credentialId);
    apiClient.setCredentialSecret(credentialSecret);
    const version = (process.env.AMAZON_CREDENTIAL_VERSION || '3.1').trim();
    apiClient.setVersion(version);

    const api = new sdk.DefaultApi(apiClient);
    const marketplace = 'www.amazon.com';

    const keywordAttempts = buildKeywordAttempts(keywords);
    let rawCount = 0;
    let products = [];
    let attemptsUsed = [];

    for (const keywordAttempt of keywordAttempts) {
      const searchRequest = new sdk.SearchItemsRequestContent();
      searchRequest.keywords = keywordAttempt;
      searchRequest.searchIndex = searchIndex;
      searchRequest.itemCount = itemCount;
      searchRequest.partnerTag = partnerTag;
      searchRequest.resources = [
        'images.primary.large',
        'itemInfo.title',
        'itemInfo.features',
      ];

      const data = await api.searchItems(marketplace, {
        searchItemsRequestContent: searchRequest,
      });

      const items = data?.searchResult?.items || [];
      rawCount += items.length;
      attemptsUsed.push(keywordAttempt);

      const normalized = normalizeProducts(items);
      products = [...products, ...normalized];

      if (products.length >= itemCount) break;
    }

    // De-dupe by ASIN and return requested count.
    const seen = new Set();
    const unique = products
      .filter((p) => {
        if (seen.has(p.asin)) return false;
        seen.add(p.asin);
        return true;
      })
      .slice(0, itemCount);

    return res.status(200).json({
      products: unique,
      diagnostics: {
        attempts: attemptsUsed,
        rawCount,
        keptCount: unique.length,
      },
    });
  } catch (err) {
    const credentialId = (process.env.CREATORS_CREDENTIAL_ID || '').trim();
    const credentialSecret = (process.env.CREATORS_CREDENTIAL_SECRET || '').trim();
    const partnerTag = (
      process.env.PAAPI_PARTNER_TAG ||
      process.env.PAAPI_AMAZON_ASSOCIATE_TAG ||
      ''
    ).trim();

    // Extract real error message from SDK error objects
    let message = '';
    let responseBody = null;
    if (err && typeof err === 'object' && err.message) {
      message = err.message;
    } else if (err && typeof err === 'object') {
      try { message = JSON.stringify(err); } catch { message = String(err); }
    } else {
      message = String(err);
    }
    // SDK may attach response body
    if (err?.response?.body) {
      try { responseBody = typeof err.response.body === 'string' ? JSON.parse(err.response.body) : err.response.body; } catch { responseBody = err.response.body; }
    } else if (err?.body) {
      try { responseBody = typeof err.body === 'string' ? JSON.parse(err.body) : err.body; } catch { responseBody = err.body; }
    }

    return res.status(500).json({
      error: 'Creators API request failed',
      message,
      responseBody,
      diagnostics: {
        envPresent: {
          credentialId: Boolean(credentialId),
          credentialSecret: Boolean(credentialSecret),
          partnerTag: Boolean(partnerTag),
        },
        envMeta: {
          credentialIdPrefix: credentialId ? credentialId.slice(0, 20) : null,
          partnerTag: partnerTag || null,
        },
        errorMeta: {
          name: err?.name || null,
          code: err?.code || null,
          statusCode: err?.statusCode || err?.status || null,
        },
      },
    });
  }
};