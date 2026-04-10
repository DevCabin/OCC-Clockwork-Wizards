// NerdyMugs - Amazon Product Advertising API Client
// Real product discovery using Amazon PA API

import amazonPaapi from 'amazon-paapi';
import type { Category } from '@/types';

// Amazon API credentials (from environment variables)
const accessKey = import.meta.env.VITE_AMAZON_ACCESS_KEY || '';
const secretKey = import.meta.env.VITE_AMAZON_SECRET_KEY || '';
const partnerTag = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG || 'georgwebsi-20';

// Amazon API configuration
const commonParameters = {
  AccessKey: accessKey,
  SecretKey: secretKey,
  PartnerTag: partnerTag,
  PartnerType: 'Associates',
  Marketplace: 'www.amazon.com',
};

// Check if Amazon API is configured
export function isAmazonApiConfigured(): boolean {
  return !!(accessKey && secretKey && partnerTag);
}

// Search for products on Amazon
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
  // If API not configured, return empty (fallback to simulated)
  if (!isAmazonApiConfigured()) {
    console.log('Amazon API not configured, skipping real search');
    return [];
  }

  try {
    // Build search query from keywords
    const keyword = keywords.join(' ');
    
    const requestParameters = {
      Keywords: keyword,
      SearchIndex: category || 'All',
      ItemPage: 1,
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'ItemInfo.Features',
      ],
    };

    console.log('Searching Amazon for:', keyword);
    
    const response = await amazonPaapi.SearchItems(
      commonParameters,
      requestParameters
    );

    if (!response.SearchResult?.Items) {
      console.log('No items found for:', keyword);
      return [];
    }

    // Map Amazon response to our format
    const products = response.SearchResult.Items
      .filter((item: any) => item.ASIN && item.Images?.Primary?.Large?.URL)
      .map((item: any) => ({
        asin: item.ASIN,
        title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
        imageUrl: item.Images.Primary.Large.URL,
        productUrl: `https://www.amazon.com/dp/${item.ASIN}?tag=${partnerTag}`,
        price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || '$19.99',
        features: item.ItemInfo?.Features?.DisplayValues || [],
      }));

    console.log(`Found ${products.length} products for:`, keyword);
    return products;

  } catch (error) {
    console.error('Amazon API error:', error);
    return [];
  }
}

// Get specific item by ASIN
export async function getAmazonItem(asin: string): Promise<{
  asin: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  price: string;
  features: string[];
} | null> {
  if (!isAmazonApiConfigured()) {
    return null;
  }

  try {
    const requestParameters = {
      ItemIds: [asin],
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'ItemInfo.Features',
      ],
    };

    const response = await amazonPaapi.GetItems(
      commonParameters,
      requestParameters
    );

    const item = response.ItemsResult?.Items?.[0] || (response as any).Items?.[0];
    if (!item) return null;

    return {
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
      imageUrl: item.Images?.Primary?.Large?.URL || '',
      productUrl: `https://www.amazon.com/dp/${item.ASIN}?tag=${partnerTag}`,
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || '$19.99',
      features: item.ItemInfo?.Features?.DisplayValues || [],
    };

  } catch (error) {
    console.error('Amazon GetItems error:', error);
    return null;
  }
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
