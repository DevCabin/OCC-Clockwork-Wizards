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

    // Get credentials from environment variables - DEBUG logging
    const credentialId = process.env.AMAZON_CREDENTIAL_ID;
    const credentialSecret = process.env.AMAZON_CREDENTIAL_SECRET;
    const credentialVersion = process.env.AMAZON_CREDENTIAL_VERSION || '3.1';
    const partnerTag = process.env.AMAZON_PARTNER_TAG || 'georgwebsi-20';

    // Debug: Log what we found (without exposing full values)
    console.log('DEBUG - Credential check:');
    console.log('  AMAZON_CREDENTIAL_ID exists:', !!credentialId);
    console.log('  AMAZON_CREDENTIAL_ID length:', credentialId ? credentialId.length : 0);
    console.log('  AMAZON_CREDENTIAL_SECRET exists:', !!credentialSecret);
    console.log('  AMAZON_CREDENTIAL_SECRET length:', credentialSecret ? credentialSecret.length : 0);
    console.log('  AMAZON_CREDENTIAL_VERSION:', credentialVersion);
    console.log('  AMAZON_PARTNER_TAG:', partnerTag);

    if (!credentialId || !credentialSecret) {
      console.error('Amazon API credentials not configured');
      return res.status(500).json({ 
        error: 'API credentials not configured',
        debug: {
          hasCredentialId: !!credentialId,
          hasCredentialSecret: !!credentialSecret,
          envVars: Object.keys(process.env).filter(k => k.includes('AMAZON'))
        }
      });
    }

    console.log('Searching Amazon Creators API for:', keywords.join(' '));

    // Configure the Creators API client
    let client;
    try {
      client = new creatorsApi.ApiClient({
        credentialId: credentialId,
        credentialSecret: credentialSecret,
        credentialVersion: credentialVersion,
        partnerTag: partnerTag,
        marketplace: 'www.amazon.com',
        region: 'us-east-1'
      });
      console.log('ApiClient created successfully');
    } catch (clientError) {
      console.error('Failed to create ApiClient:', clientError.message);
      return res.status(500).json({
        error: 'Failed to initialize API client',
        message: clientError.message
      });
    }

    // Create search request
    let searchRequest;
    try {
      searchRequest = new creatorsApi.SearchItemsRequestContent({
        keywords: keywords.join(' '),
        searchIndex: category || 'All',
        itemPage: 1,
        resources: [
          creatorsApi.SearchItemsResource.IMAGES_PRIMARY_LARGE,
          creatorsApi.SearchItemsResource.ITEMINFO_TITLE,
          creatorsApi.SearchItemsResource.OFFERS_LISTINGS_PRICE,
          creatorsApi.SearchItemsResource.ITEMINFO_FEATURES
        ]
      });
      console.log('SearchItemsRequestContent created successfully');
    } catch (requestError) {
      console.error('Failed to create search request:', requestError.message);
      return res.status(500).json({
        error: 'Failed to create search request',
        message: requestError.message
      });
    }

    // Create API instance and call search
    let response;
    try {
      const defaultApi = new creatorsApi.DefaultApi(client);
      console.log('Calling searchItems...');
      response = await defaultApi.searchItems('www.amazon.com', {
        searchItemsRequestContent: searchRequest
      });
      console.log('searchItems returned:', response ? 'data' : 'null');
    } catch (apiError) {
      console.error('Amazon Creators API call failed:', apiError.message);
      console.error('Stack:', apiError.stack);
      return res.status(500).json({
        error: 'Amazon Creators API call failed',
        message: apiError.message,
        stack: apiError.stack
      });
    }

    if (!response || !response.searchResult || !response.searchResult.items) {
      console.log('No items found in response');
      return res.status(200).json({ products: [] });
    }

    console.log(`Found ${response.searchResult.items.length} items`);

    // Map response to our format
    const products = response.searchResult.items
      .filter((item) => item.asin)
      .map((item) => ({
        asin: item.asin,
        title: item.itemInfo?.title?.displayValue || 'Unknown Product',
        imageUrl: item.images?.primary?.large?.url || '',
        productUrl: `https://www.amazon.com/dp/${item.asin}?tag=${partnerTag}`,
        price: item.offers?.listings?.[0]?.price?.displayAmount || '$19.99',
        features: item.itemInfo?.features?.displayValues || [],
      }));

    console.log(`Returning ${products.length} products with images`);

    // Set CORS headers and return products
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ products });

  } catch (error) {
    console.error('Unexpected error in API:', error);
    console.error('Stack:', error.stack);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      error: 'API request failed',
      message: error.message,
      stack: error.stack
    });
  }
};