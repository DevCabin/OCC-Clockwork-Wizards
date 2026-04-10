// NerdyMugs - WordPress Import System
// Imports existing WP posts and generates 301 redirects

import type { Product, Post } from '@/types';
import { generateId } from './supabase';

// WordPress XML export structure (simplified)
interface WPItem {
  title: string;
  link: string; // Original URL
  pubDate: string;
  category: string[];
  tag: string[];
  content: string; // HTML content
  excerpt: string;
  postmeta: Record<string, string>;
}

// Import result
interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  redirects: RedirectMap;
}

// 301 Redirect map: old URL -> new URL
interface RedirectMap {
  [oldUrl: string]: string;
}

// Parse WordPress XML export
export function parseWordPressXML(xmlString: string): WPItem[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');
  
  const items: WPItem[] = [];
  const itemNodes = xml.querySelectorAll('item');
  
  itemNodes.forEach((node) => {
    const title = node.querySelector('title')?.textContent || '';
    const link = node.querySelector('link')?.textContent || '';
    const pubDate = node.querySelector('pubDate')?.textContent || '';
    const content = node.querySelector('content\\:encoded')?.textContent || 
                   node.querySelector('encoded')?.textContent || '';
    const excerpt = node.querySelector('excerpt\\:encoded')?.textContent || 
                   node.querySelector('excerpt')?.textContent || '';
    
    const categories: string[] = [];
    node.querySelectorAll('category[domain="category"]').forEach((cat) => {
      if (cat.textContent) categories.push(cat.textContent);
    });
    
    const tags: string[] = [];
    node.querySelectorAll('category[domain="post_tag"]').forEach((tag) => {
      if (tag.textContent) tags.push(tag.textContent);
    });
    
    // Extract postmeta if available
    const postmeta: Record<string, string> = {};
    node.querySelectorAll('wp\\:postmeta, postmeta').forEach((meta) => {
      const key = meta.querySelector('wp\\:meta_key, meta_key')?.textContent;
      const value = meta.querySelector('wp\\:meta_value, meta_value')?.textContent;
      if (key && value) postmeta[key] = value;
    });
    
    items.push({ title, link, pubDate, category: categories, tag: tags, content, excerpt, postmeta });
  });
  
  return items;
}

// Extract Amazon product info from content
function extractAmazonInfo(content: string): {
  productUrl?: string;
  imageUrl?: string;
  price?: string;
} {
  // Look for Amazon links
  const amazonRegex = /https?:\/\/(?:www\.)?amazon\.com\/[\w\-\/]+(?:\?[^\s"<>]+)?/gi;
  const amazonLinks = content.match(amazonRegex) || [];
  
  // Look for images
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1]);
  }
  
  // Look for price patterns
  const priceRegex = /\$[\d,]+(?:\.\d{2})?/;
  const priceMatch = content.match(priceRegex);
  
  return {
    productUrl: amazonLinks[0],
    imageUrl: images[0],
    price: priceMatch ? priceMatch[0] : undefined,
  };
}

// Map WP category to NerdyMugs category
function mapCategory(wpCategories: string[]): string {
  const categoryMap: Record<string, string> = {
    'star-trek': 'Star Trek',
    'star trek': 'Star Trek',
    'startrek': 'Star Trek',
    'star-trek-mugs': 'Star Trek',
    'star-wars': 'Star Wars',
    'star wars': 'Star Wars',
    'starwars': 'Star Wars',
    'marvel': 'Marvel',
    'avengers': 'Marvel',
    'gaming': 'Retro Gaming',
    'retro-gaming': 'Retro Gaming',
    'video-games': 'Retro Gaming',
    'nintendo': 'Retro Gaming',
  };
  
  for (const wpCat of wpCategories) {
    const slug = wpCat.toLowerCase().replace(/\s+/g, '-');
    if (categoryMap[slug]) {
      return categoryMap[slug];
    }
  }
  
  return 'Star Trek'; // Default
}

// Import a single WP post
function importWPPost(
  state: { products: Product[]; posts: Post[] },
  wpItem: WPItem
): { success: boolean; newUrl?: string; error?: string } {
  try {
    // Skip if no title
    if (!wpItem.title.trim()) {
      return { success: false, error: 'Empty title' };
    }
    
    // Extract Amazon info
    const { productUrl, imageUrl, price } = extractAmazonInfo(wpItem.content);
    
    // Map category
    const category = mapCategory(wpItem.category);
    
    // Create product
    const product: Product = {
      id: generateId('prod-'),
      name: wpItem.title,
      description: wpItem.excerpt || wpItem.content.replace(/<[^>]+>/g, '').substring(0, 200),
      imageUrl: imageUrl || `https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=600&fit=crop`,
      productUrl: productUrl || '#',
      price: price || '$19.99',
      category,
      tags: wpItem.tag.length > 0 ? wpItem.tag : ['coffee', 'mug'],
      createdAt: new Date(wpItem.pubDate).getTime() || Date.now(),
      updatedAt: Date.now(),
    };
    
    state.products.push(product);
    
    // Create post from content
    const post: Post = {
      id: generateId('post-'),
      productId: product.id,
      title: wpItem.title,
      caption: wpItem.excerpt.replace(/<[^>]+>/g, '').substring(0, 160),
      description: wpItem.content.replace(/<[^>]+>/g, ''),
      suggestedTags: wpItem.tag.slice(0, 4),
      videoSuggestion: `Search YouTube for: ${category} best moments`,
      clicks: 0,
      publishedAt: new Date(wpItem.pubDate).getTime() || Date.now(),
      isPublished: true,
      category,
    };
    
    state.posts.push(post);
    
    // Generate new URL
    const newUrl = `/post/${post.id}`;
    
    return { success: true, newUrl };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Import failed' 
    };
  }
}

// Main import function
export function importWordPressPosts(
  state: { products: Product[]; posts: Post[] },
  xmlString: string
): ImportResult {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    redirects: {},
  };
  
  const wpItems = parseWordPressXML(xmlString);
  
  for (const item of wpItems) {
    const importResult = importWPPost(state, item);
    
    if (importResult.success && importResult.newUrl) {
      result.imported++;
      result.redirects[item.link] = importResult.newUrl;
    } else {
      result.skipped++;
      if (importResult.error) {
        result.errors.push(`${item.title}: ${importResult.error}`);
      }
    }
  }
  
  return result;
}

// Generate Vercel/Next.js redirect config
export function generateRedirectConfig(redirectMap: RedirectMap): string {
  const redirects = Object.entries(redirectMap).map(([source, destination]) => {
    // Convert full URL to path
    const sourcePath = new URL(source).pathname;
    return {
      source: sourcePath,
      destination,
      permanent: true, // 301 redirect
    };
  });
  
  return JSON.stringify(redirects, null, 2);
}

// Generate Next.js next.config.js redirects
export function generateNextJsRedirects(redirectMap: RedirectMap): string {
  const entries = Object.entries(redirectMap).map(([source, destination]) => {
    const sourcePath = new URL(source).pathname;
    return `    {
      source: '${sourcePath}',
      destination: '${destination}',
      permanent: true,
    }`;
  });
  
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
${entries.join(',\n')}
    ];
  },
};

module.exports = nextConfig;`;
}

// Generate Apache .htaccess redirects
export function generateApacheRedirects(redirectMap: RedirectMap): string {
  const lines = Object.entries(redirectMap).map(([source, destination]) => {
    const sourcePath = new URL(source).pathname;
    return `Redirect 301 ${sourcePath} ${destination}`;
  });
  
  return lines.join('\n');
}

// Generate Nginx redirect rules
export function generateNginxRedirects(redirectMap: RedirectMap): string {
  const lines = Object.entries(redirectMap).map(([source, destination]) => {
    const sourcePath = new URL(source).pathname;
    return `rewrite ^${sourcePath.replace(/\//g, '\\/')}$ ${destination} permanent;`;
  });
  
  return lines.join('\n');
}
