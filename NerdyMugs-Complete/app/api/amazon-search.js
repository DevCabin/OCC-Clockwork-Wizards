// Vercel Serverless Function - Amazon Creators API Proxy
// Uses official Creators API SDK with OAuth authentication

const creatorsApi = require('creatorsapi-nodejs-sdk');

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

    // Get credentials from environment variables
    const credentialId = process.env.AMAZON_CREDENTIAL_ID || process.env.VITE_AMAZON_ACCESS_KEY;
    const credentialSecret = process.env.AMAZON_CREDENTIAL_SECRET || process.env.VITE_AMAZON_SECRET_KEY;
    const partnerTag = process.env.AMAZON_PARTNER_TAG || process.env.VITE_AMAZON_ASSOCIATE_TAG || 'georgwebsi-20';

    if (!credentialId || !credentialSecret) {
      console.error('Amazon API credentials not configured');
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    console.log('Searching Amazon Creators API for:', keywords.join(' '));

    // Configure the Creators API client
    // The SDK handles OAuth token management automatically
    const client = new creatorsApi.ApiClient({
      credentialId: credentialId,
      credentialSecret: credentialSecret,
      partnerTag: partnerTag,
      marketplace: 'www.amazon.com',
      region: 'us-east-1'
    });

    // Create search request
    const searchRequest = new creatorsApi.SearchItemsRequest({
      keywords: keywords.join(' '),
      searchIndex: category || 'All',
      itemPage: 1,
      resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'ItemInfo.Features'
      ]
    });

    // Execute search
    const response = await client.searchItems(searchRequest);

    if (!response.searchResult || !response.searchResult.items) {
      console.log('No items found');
      return res.status(200).json({ products: [] });
    }

    // Map response to our format
    const products = response.searchResult.items
      .filter((item) => item.asin && item.images?.primary?.large?.url)
      .map((item) => ({
        asin: item.asin,
        title: item.itemInfo?.title?.displayValue || 'Unknown Product',
        imageUrl: item.images.primary.large.url,
        productUrl: `https://www.amazon.com/dp/${item.asin}?tag=${partnerTag}`,
        price: item.offers?.listings?.[0]?.price?.displayAmount || '$19.99',
        features: item.itemInfo?.features?.displayValues || [],
      }));

    console.log(`Found ${products.length} products`);

    // Set CORS headers and return products
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ products });

  } catch (error) {
    console.error('Amazon Creators API error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      error: 'API request failed',
      message: error.message,
      details: error.stack
    });
  }
};