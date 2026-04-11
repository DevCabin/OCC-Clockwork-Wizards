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

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const accessKey = process.env.PAAPI_ACCESS_KEY;
    const secretKey = process.env.PAAPI_SECRET_KEY;
    const partnerTag = process.env.PAAPI_PARTNER_TAG;
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
    const itemCount = Math.max(1, Math.min(10, Number(body.itemCount) || 5));

    const commonParameters = {
      AccessKey: accessKey,
      SecretKey: secretKey,
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
      Host: host,
      Region: region,
    };

    const requestParameters = {
      Keywords: keywords,
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
    const products = items.map((item) => {
      const asin = item?.ASIN || '';
      const title = item?.ItemInfo?.Title?.DisplayValue || 'Unknown Product';
      const imageUrl = item?.Images?.Primary?.Large?.URL || '';
      const price = item?.Offers?.Listings?.[0]?.Price?.DisplayAmount || '';
      const features = item?.ItemInfo?.Features?.DisplayValues || [];
      const detailPageURL = item?.DetailPageURL || (asin ? `https://www.amazon.com/dp/${asin}` : '');
      return {
        asin,
        title,
        imageUrl,
        productUrl: detailPageURL,
        price,
        features,
      };
    }).filter(p => p.asin);

    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({
      error: 'PA-API request failed',
      message: err?.message || String(err),
    });
  }
};
