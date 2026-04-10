// NerdyMugs - Product Discovery Service
// Uses Amazon Product Advertising API for real product discovery

import type { AppState, Category, Product } from '@/types';
import { addProduct, addLog, trackCategoryUsage } from './db';
import { 
  isAmazonApiConfigured, 
  searchByCategory, 
  getSimulatedProducts 
} from './amazon';

// Generate affiliate link (ensures tag is included)
export function generateAffiliateLink(productUrl: string, affiliateId: string): string {
  if (productUrl.includes('amazon')) {
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}tag=${affiliateId}`;
  }
  return productUrl;
}

// Weighted random selection
function weightedRandomSelect(categories: Category[]): Category | null {
  const activeCategories = categories.filter(c => c.isActive);
  if (activeCategories.length === 0) return null;
  
  const totalWeight = activeCategories.reduce((sum, cat) => sum + cat.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const category of activeCategories) {
    random -= category.weight;
    if (random <= 0) {
      return category;
    }
  }
  
  return activeCategories[activeCategories.length - 1];
}

// Check if category was used today
function wasUsedToday(state: AppState, categoryName: string): boolean {
  const today = new Date().toDateString();
  const todayPosts = state.posts.filter(p => {
    const postDate = new Date(p.publishedAt).toDateString();
    return postDate === today && p.category === categoryName;
  });
  return todayPosts.length > 0;
}

// Check weekly usage
function getWeeklyUsage(state: AppState, categoryName: string): number {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  return state.posts.filter(p => 
    p.publishedAt > oneWeekAgo && p.category === categoryName
  ).length;
}

// Select category with rotation rules
function selectCategory(state: AppState): Category | null {
  const activeCategories = state.categories.filter(c => c.isActive);
  if (activeCategories.length === 0) return null;
  
  // Filter out categories used today (if rule enabled)
  let available = activeCategories.filter(cat => !wasUsedToday(state, cat.name));
  
  // If all categories used today, fall back to all active
  if (available.length === 0) {
    available = activeCategories;
  }
  
  // Filter out categories at weekly limit
  available = available.filter(cat => getWeeklyUsage(state, cat.name) < 5);
  
  // If no categories available, fall back to weighted random from all active
  if (available.length === 0) {
    available = activeCategories;
  }
  
  return weightedRandomSelect(available);
}

// Discover products for a category using Amazon API
export async function discoverProducts(
  state: AppState,
  category: Category,
  count: number = 1
): Promise<Product[]> {
  const products: Product[] = [];
  
  // Try Amazon API first
  let amazonProducts: Array<{
    asin: string;
    title: string;
    imageUrl: string;
    productUrl: string;
    price: string;
    features: string[];
  }> = [];
  
  if (isAmazonApiConfigured()) {
    try {
      amazonProducts = await searchByCategory(category, count);
      if (amazonProducts.length > 0) {
        addLog(state, 'AMAZON_API', `Found ${amazonProducts.length} products in ${category.name}`);
      }
    } catch (error) {
      addLog(state, 'AMAZON_ERROR', `API error for ${category.name}: ${error}`);
    }
  }
  
  // Fallback to simulated if Amazon returns nothing
  if (amazonProducts.length === 0) {
    amazonProducts = getSimulatedProducts(category.name);
    addLog(state, 'SIMULATED', `Using simulated products for ${category.name}`);
  }
  
  // Get products not already in database
  const existingAsins = new Set(state.products.map(p => {
    // Extract ASIN from product URL if present
    const match = p.productUrl.match(/\/dp\/([A-Z0-9]+)/);
    return match ? match[1] : p.name;
  }));
  
  const newProducts = amazonProducts.filter(p => !existingAsins.has(p.asin));
  
  // Take only what we need
  const selected = newProducts.slice(0, count);
  
  for (const item of selected) {
    const product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      name: item.title,
      description: item.features.join('. ') || `${item.title} - perfect for your morning coffee.`,
      imageUrl: item.imageUrl,
      productUrl: generateAffiliateLink(item.productUrl, state.siteConfig.affiliateId),
      price: item.price,
      category: category.name,
      tags: category.tags.slice(0, 2),
    };
    
    const newProduct = addProduct(state, product);
    products.push(newProduct);
  }
  
  trackCategoryUsage(state, category.name);
  addLog(state, 'DISCOVERY', `Discovered ${products.length} products in category: ${category.name}`);
  return products;
}

// Run full discovery cycle
export async function runDiscoveryCycle(state: AppState, targetCount: number = 3): Promise<Product[]> {
  const allProducts: Product[] = [];
  
  addLog(state, 'CYCLE_START', 'Starting discovery cycle');
  
  // Log which mode we're in
  if (isAmazonApiConfigured()) {
    addLog(state, 'MODE', 'Using Amazon Product Advertising API');
  } else {
    addLog(state, 'MODE', 'Using simulated products (Amazon API not configured)');
  }
  
  for (let i = 0; i < targetCount; i++) {
    const category = selectCategory(state);
    if (!category) break;
    
    try {
      const products = await discoverProducts(state, category, 1);
      allProducts.push(...products);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      addLog(state, 'DISCOVERY_ERROR', `Failed to discover in ${category.name}: ${error}`);
    }
  }
  
  updateScheduleConfig(state, { lastRunAt: Date.now() });
  addLog(state, 'CYCLE_COMPLETE', `Discovered ${allProducts.length} total products`);
  
  return allProducts;
}

import { updateScheduleConfig } from './db';
