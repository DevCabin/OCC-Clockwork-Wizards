// Vercel Serverless Function - Amazon API Proxy
// Securely calls Amazon Product Advertising API from server-side

const amazonPaapi = require('amazon-paapi');

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keywords, category } = req.body;

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array required' });
    }

    // Get credentials from environment variables (server-side only)
    const accessKey = process.env.VITE_AMAZON_ACCESS_KEY;
    const secretKey = process.env.VITE_AMAZON_SECRET_KEY;
    const partnerTag = process.env.VITE_AMAZON_ASSOCIATE_TAG || 'georgwebsi-20';

    if (!accessKey || !secretKey) {
      console.error('Amazon API credentials not configured');
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    // Amazon API configuration
    const commonParameters = {
      AccessKey: accessKey,
      SecretKey: secretKey,
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
    };

    const requestParameters = {
      Keywords: keywords.join(' '),
      SearchIndex: category || 'All',
      ItemPage: 1,
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'ItemInfo.Features',
      ],
    };

    console.log('Searching Amazon for:', keywords.join(' '));

    const response = await amazonPaapi.SearchItems(
      commonParameters,
      requestParameters
    );

    if (!response.SearchResult?.Items) {
      console.log('No items found');
      return res.status(200).json({ products: [] });
    }

    // Map Amazon response to our format
    const products = response.SearchResult.Items
      .filter((item) => item.ASIN && item.Images?.Primary?.Large?.URL)
      .map((item) => ({
        asin: item.ASIN,
        title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
        imageUrl: item.Images.Primary.Large.URL,
        productUrl: `https://www.amazon.com/dp/${item.ASIN}?tag=${partnerTag}`,
        price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || '$19.99',
        features: item.ItemInfo?.Features?.DisplayValues || [],
      }));

    console.log(`Found ${products.length} products`);

    // Set CORS headers and return products
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ products });

  } catch (error) {
    console.error('Amazon API error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      error: 'API request failed',
      message: error.message 
    });
  }
};