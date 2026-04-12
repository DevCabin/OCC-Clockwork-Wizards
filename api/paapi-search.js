// Vercel Serverless Function - Amazon Product Advertising API (PA-API) Search Proxy
// POST /api/paapi-search
// Body: { keywords: string[] | string, searchIndex?: string, itemCount?: number }
// Env:
//   PAAPI_ACCESS_KEY
//   PAAPI_SECRET_KEY
//   PAAPI_PARTNER_TAG
//   PAAPI_HOST (default webservices.amazon.com)
//   PAAPI_REGION (default us-east-1)

const paapi = require('amazon-paapi');

function normalizeProducts(items = []) {
  const mapped = items.map((item) => {
    const asin = item?.ASIN || '';
    const title = item?.ItemInfo?.Title?.DisplayValue || '';
    const imageUrl = item?.Images?.Primary?.Large?.URL || '';
    const price = item?.Offers?.Listings?.[0]?.Price?.DisplayAmount || '';
    const features = item?.ItemInfo?.Features?.DisplayValues || [];
    const productUrl = item?.DetailPageURL || (asin ? `https://www.amazon.com/dp/${asin}` : '');

    return {
      asin,
      title,
      imageUrl,
      productUrl,
      price,
      features,
    };
  });

  // Reliability gate: keep only complete product cards.
  return mapped.filter((p) => p.asin && p.title && p.imageUrl && p.price && p.productUrl);
}

function buildKeywordAttempts(keywords) {
  const attempts = [keywords.trim()];
  if (!/\bmug\b/i.test(keywords)) attempts.push(`${keywords} mug`);
  if (!/\bcoffee mug\b/i.test(keywords)) attempts.push(`${keywords} coffee mug`);
  return [...new Set(attempts.map((k) => k.trim()).filter(Boolean))];
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Support both naming conventions:
    // - Preferred: PAAPI_ACCESS_KEY / PAAPI_SECRET_KEY / PAAPI_PARTNER_TAG
    // - Legacy/mobile-set: PAAPI_AMAZON_ACCESS_KEY / PAAPI_AMAZON_SECRET_KEY / PAAPI_AMAZON_ASSOCIATE_TAG
    const accessKey = process.env.PAAPI_ACCESS_KEY || process.env.PAAPI_AMAZON_ACCESS_KEY;
    const secretKey = process.env.PAAPI_SECRET_KEY || process.env.PAAPI_AMAZON_SECRET_KEY;
    const partnerTag = process.env.PAAPI_PARTNER_TAG || process.env.PAAPI_AMAZON_ASSOCIATE_TAG;
    const host = process.env.PAAPI_HOST || 'webservices.amazon.com';
    const region = process.env.PAAPI_REGION || 'us-east-1';

    if (!accessKey || !secretKey || !partnerTag) {
      return res.status(500).json({
        error: 'PA-API env vars not configured',
        missing: {
          PAAPI_ACCESS_KEY: !accessKey,
          PAAPI_SECRET_KEY: !secretKey,
          PAAPI_PARTNER_TAG: !partnerTag,
        },
      });
    }

    const body = req.body || {};
    const keywordsRaw = body.keywords;
    const keywords = Array.isArray(keywordsRaw)
      ? keywordsRaw.filter(Boolean).join(' ')
      : (typeof keywordsRaw === 'string' ? keywordsRaw : '');

    if (!keywords.trim()) {
      return res.status(400).json({ error: 'keywords is required (string or string[])' });
    }

    const searchIndex = body.searchIndex || 'All';
    const itemCount = Math.max(3, Math.min(10, Number(body.itemCount) || 8));

    const commonParameters = {
      AccessKey: accessKey,
      SecretKey: secretKey,
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
      Host: host,
      Region: region,
    };

    const keywordAttempts = buildKeywordAttempts(keywords);
    let rawCount = 0;
    let products = [];
    let attemptsUsed = [];

    for (const keywordAttempt of keywordAttempts) {
      const requestParameters = {
        Keywords: keywordAttempt,
        SearchIndex: searchIndex,
        ItemCount: itemCount,
        Resources: [
          'Images.Primary.Large',
          'ItemInfo.Title',
          'Offers.Listings.Price',
          'ItemInfo.Features',
        ],
      };

      const data = await paapi.SearchItems(commonParameters, requestParameters);
      const items = data?.SearchResult?.Items || [];
      rawCount += items.length;
      attemptsUsed.push(keywordAttempt);

      const normalized = normalizeProducts(items);
      products = [...products, ...normalized];

      if (products.length >= itemCount) break;
    }

    // De-dupe by ASIN and return requested count.
    const seen = new Set();
    const unique = products.filter((p) => {
      if (seen.has(p.asin)) return false;
      seen.add(p.asin);
      return true;
    }).slice(0, itemCount);

    return res.status(200).json({
      products: unique,
      diagnostics: {
        attempts: attemptsUsed,
        rawCount,
        keptCount: unique.length,
      },
    });
  } catch (err) {
    const accessKey = process.env.PAAPI_ACCESS_KEY || process.env.PAAPI_AMAZON_ACCESS_KEY;
    const secretKey = process.env.PAAPI_SECRET_KEY || process.env.PAAPI_AMAZON_SECRET_KEY;
    const partnerTag = process.env.PAAPI_PARTNER_TAG || process.env.PAAPI_AMAZON_ASSOCIATE_TAG;
    const host = process.env.PAAPI_HOST || 'webservices.amazon.com';
    const region = process.env.PAAPI_REGION || 'us-east-1';

    return res.status(500).json({
      error: 'PA-API request failed',
      message: err?.message || String(err),
      diagnostics: {
        envPresent: {
          accessKey: Boolean(accessKey),
          secretKey: Boolean(secretKey),
          partnerTag: Boolean(partnerTag),
        },
        envMeta: {
          accessKeyPrefix: accessKey ? accessKey.slice(0, 4) : null,
          partnerTagSuffix: partnerTag ? partnerTag.slice(-3) : null,
          host,
          region,
        },
        errorMeta: {
          name: err?.name || null,
          code: err?.code || null,
          statusCode: err?.statusCode || null,
        },
      },
    });
  }
};
