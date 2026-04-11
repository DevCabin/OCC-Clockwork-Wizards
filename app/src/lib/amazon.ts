// NerdyMugs - Amazon Product Advertising API Client
// Uses serverless proxy to avoid CORS issues

import type { Category } from '@/types';

// Get partner tag for affiliate links (safe to expose)
const partnerTag = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG || 'georgwebsi-20';

// API endpoint - uses relative path for both dev and production
// NOTE: This project migrated away from Amazon APIs to a general web search proxy.
const API_ENDPOINT = '/api/search';

// Check if Amazon API is configured (always true now with server-side proxy)
export function isAmazonApiConfigured(): boolean {
  return true;
}

// Search for products via serverless proxy
export async function searchAmazonProducts(
  keywords: string[],
  category?: string
): Promise<Array<{
  asin: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  price: string;
  features: string[];
}>> {
  try {
    // Keep existing call sites working, but the backend is now a general web search.
    const query = [category, ...keywords].filter(Boolean).join(' ').trim();
    console.log('Searching via web-search proxy for:', query);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        count: 8,
        // Optional: constrain to Amazon. Remove/adjust if you want broader discovery.
        site: 'amazon.com'
      }),
    });

    if (!response.ok) {
      let error: any = null;
      try { error = await response.json(); } catch {}
      console.error('Search proxy error:', error || response.statusText);
      return [];
    }

    const data = await response.json();
    const results: Array<{ title: string; url: string; description?: string }> = data?.results || [];

    if (!results.length) {
      console.log('No results found');
      return [];
    }

    // Map generic results into the product shape the UI expects.
    return results.map((r, idx) => ({
      asin: `search:${idx}:${r.url}`,
      title: r.title || 'Unknown Product',
      imageUrl: '',
      productUrl: r.url,
      price: '',
      features: r.description ? [r.description] : [],
    }));

  } catch (error) {
    console.error('Search proxy error:', error);
    return [];
  }
}

// Get specific item by ASIN (uses search as workaround)
export async function getAmazonItem(asin: string): Promise<{
  asin: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  price: string;
  features: string[];
} | null> {
  // Return a basic structure - ASIN lookup would need another API endpoint
  return {
    asin: asin,
    title: 'Product Details',
    imageUrl: '',
    productUrl: `https://www.amazon.com/dp/${asin}?tag=${partnerTag}`,
    price: '$19.99',
    features: [],
  };
}

// Search by category using predefined search terms
export async function searchByCategory(
  category: Category,
  maxResults: number = 3
): Promise<Array<{
  asin: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  price: string;
  features: string[];
}>> {
  // Try each search term until we get results
  for (const searchTerm of category.searchTerms) {
    const results = await searchAmazonProducts([searchTerm]);
    if (results.length > 0) {
      return results.slice(0, maxResults);
    }
  }
  
  return [];
}

// Fallback to simulated products if Amazon API fails
export function getSimulatedProducts(categoryName: string): Array<{
  asin: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  price: string;
  features: string[];
}> {
  const simulated: Record<string, Array<{
    asin: string;
    title: string;
    imageUrl: string;
    productUrl: string;
    price: string;
    features: string[];
  }>> = {
    "Star Trek": [
      {
        asin: "B07EXAMPLE1",
        title: "Star Trek USS Enterprise Heat Change Mug",
        imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=600&fit=crop",
        productUrl: `https://www.amazon.com/dp/B07EXAMPLE1?tag=${partnerTag}`,
        price: "$19.99",
        features: ["Heat-sensitive", "14oz capacity", "Officially licensed"],
      },
      {
        asin: "B07EXAMPLE2",
        title: "Spock Live Long and Prosper Ceramic Mug",
        imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
        productUrl: `https://www.amazon.com/dp/B07EXAMPLE2?tag=${partnerTag}`,
        price: "$16.99",
        features: ["Dishwasher safe", "11oz capacity", "Vulcan salute design"],
      },
    ],
    "Star Wars": [
      {
        asin: "B08EXAMPLE1",
        title: "Darth Vader I Find Your Lack of Coffee Disturbing Mug",
        imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop",
        productUrl: `https://www.amazon.com/dp/B08EXAMPLE1?tag=${partnerTag}`,
        price: "$18.99",
        features: ["Ceramic", "15oz capacity", "Dark side approved"],
      },
      {
        asin: "B08EXAMPLE2",
        title: "Baby Yoda The Child Sipping Soup Mug",
        imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=600&fit=crop",
        productUrl: `https://www.amazon.com/dp/B08EXAMPLE2?tag=${partnerTag}`,
        price: "$22.99",
        features: ["Grogu design", "12oz capacity", "Mandalorian official"],
      },
    ],
    "Retro Gaming": [
      {
        asin: "B09EXAMPLE1",
        title: "Super Mario Question Block Mug",
        imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
        productUrl: `https://www.amazon.com/dp/B09EXAMPLE1?tag=${partnerTag}`,
        price: "$16.99",
        features: ["Power-up design", "10oz capacity", "Nintendo licensed"],
      },
    ],
    "Marvel": [
      {
        asin: "B10EXAMPLE1",
        title: "Iron Man Arc Reactor Glow Mug",
        imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop",
        productUrl: `https://www.amazon.com/dp/B10EXAMPLE1?tag=${partnerTag}`,
        price: "$24.99",
        features: ["LED light-up", "16oz capacity", "Stark Industries"],
      },
    ],
  };

  return simulated[categoryName] || simulated["Star Trek"];
}
