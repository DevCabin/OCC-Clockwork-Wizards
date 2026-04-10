// NerdyMugs - Supabase Client
// Production database layer

import { createClient } from '@supabase/supabase-js';
import type { Product, Post, Category, SiteConfig, ScheduleConfig, LogEntry } from '@/types';

// These will be set as environment variables in Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// For demo/development, fall back to localStorage
const isDemoMode = !supabaseUrl || !supabaseKey;

export const supabase = isDemoMode ? null : createClient(supabaseUrl, supabaseKey);

// Generate unique ID
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== PRODUCTS ====================

export async function getProducts(): Promise<Product[]> {
  if (isDemoMode || !supabase) {
    const stored = localStorage.getItem('nerdy_mugs_products');
    return stored ? JSON.parse(stored) : [];
  }
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const newProduct: Product = {
    ...product,
    id: generateId('prod-'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  if (isDemoMode || !supabase) {
    const products = await getProducts();
    products.unshift(newProduct);
    localStorage.setItem('nerdy_mugs_products', JSON.stringify(products));
    return newProduct;
  }
  
  const { data, error } = await supabase
    .from('products')
    .insert({
      id: newProduct.id,
      name: newProduct.name,
      description: newProduct.description,
      image_url: newProduct.imageUrl,
      product_url: newProduct.productUrl,
      price: newProduct.price,
      category: newProduct.category,
      tags: newProduct.tags,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Product;
}

// ==================== POSTS ====================

export async function getPosts(): Promise<Post[]> {
  if (isDemoMode || !supabase) {
    const stored = localStorage.getItem('nerdy_mugs_posts');
    return stored ? JSON.parse(stored) : [];
  }
  
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function addPost(post: Omit<Post, 'id' | 'publishedAt' | 'clicks'>): Promise<Post> {
  const newPost: Post = {
    ...post,
    id: generateId('post-'),
    publishedAt: Date.now(),
    clicks: 0,
  };
  
  if (isDemoMode || !supabase) {
    const posts = await getPosts();
    posts.unshift(newPost);
    localStorage.setItem('nerdy_mugs_posts', JSON.stringify(posts));
    return newPost;
  }
  
  const { data, error } = await supabase
    .from('posts')
    .insert({
      id: newPost.id,
      product_id: newPost.productId,
      title: newPost.title,
      caption: newPost.caption,
      description: newPost.description,
      suggested_tags: newPost.suggestedTags,
      video_suggestion: newPost.videoSuggestion,
      is_published: newPost.isPublished,
      category: newPost.category,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Post;
}

export async function incrementPostClicks(postId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.clicks++;
      localStorage.setItem('nerdy_mugs_posts', JSON.stringify(posts));
    }
    return;
  }
  
  await supabase.rpc('increment_clicks', { post_id: postId });
}

// ==================== CATEGORIES ====================

export async function getCategories(): Promise<Category[]> {
  if (isDemoMode || !supabase) {
    const stored = localStorage.getItem('nerdy_mugs_categories');
    if (stored) return JSON.parse(stored);
    
    // Default categories
    const defaults: Category[] = [
      { id: generateId('cat-'), name: 'Star Trek', slug: 'star-trek', weight: 3, searchTerms: ['star trek mug'], tags: ['kirk', 'spock', 'picard'], triviaHooks: ['quotes'], isActive: true },
      { id: generateId('cat-'), name: 'Star Wars', slug: 'star-wars', weight: 3, searchTerms: ['star wars mug'], tags: ['jedi', 'sith', 'force'], triviaHooks: ['trivia'], isActive: true },
      { id: generateId('cat-'), name: 'Retro Gaming', slug: 'retro-gaming', weight: 2, searchTerms: ['retro gaming mug'], tags: ['mario', 'zelda', '8bit'], triviaHooks: ['easter eggs'], isActive: true },
      { id: generateId('cat-'), name: 'Marvel', slug: 'marvel', weight: 2, searchTerms: ['marvel mug'], tags: ['avengers', 'spidey'], triviaHooks: ['origins'], isActive: true },
    ];
    localStorage.setItem('nerdy_mugs_categories', JSON.stringify(defaults));
    return defaults;
  }
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  if (isDemoMode || !supabase) {
    const categories = await getCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      localStorage.setItem('nerdy_mugs_categories', JSON.stringify(categories));
    }
    return;
  }
  
  await supabase
    .from('categories')
    .update(updates)
    .eq('id', id);
}

// ==================== CONFIG ====================

export async function getSiteConfig(): Promise<SiteConfig> {
  if (isDemoMode || !supabase) {
    const stored = localStorage.getItem('nerdy_mugs_site_config');
    return stored ? JSON.parse(stored) : { name: 'NerdyMugs', tagline: 'Coffee Mugs for Nerds', affiliateId: 'georgwebsi-20' };
  }
  
  const { data, error } = await supabase
    .from('site_config')
    .select('*')
    .single();
  
  if (error) throw error;
  return data as SiteConfig;
}

export async function updateSiteConfig(updates: Partial<SiteConfig>): Promise<void> {
  if (isDemoMode || !supabase) {
    const config = await getSiteConfig();
    localStorage.setItem('nerdy_mugs_site_config', JSON.stringify({ ...config, ...updates }));
    return;
  }
  
  await supabase
    .from('site_config')
    .update(updates)
    .eq('id', 1);
}

// ==================== SCHEDULE ====================

export async function getScheduleConfig(): Promise<ScheduleConfig> {
  if (isDemoMode || !supabase) {
    const stored = localStorage.getItem('nerdy_mugs_schedule');
    return stored ? JSON.parse(stored) : { postsPerDay: 3, quietDays: ['Sunday'], lastRunAt: 0 };
  }
  
  const { data, error } = await supabase
    .from('schedule_config')
    .select('*')
    .single();
  
  if (error) throw error;
  return data as ScheduleConfig;
}

export async function updateScheduleConfig(updates: Partial<ScheduleConfig>): Promise<void> {
  if (isDemoMode || !supabase) {
    const config = await getScheduleConfig();
    localStorage.setItem('nerdy_mugs_schedule', JSON.stringify({ ...config, ...updates }));
    return;
  }
  
  await supabase
    .from('schedule_config')
    .update(updates)
    .eq('id', 1);
}

// ==================== LOGS ====================

export async function addLog(action: string, details: string): Promise<void> {
  const log: LogEntry = {
    id: generateId('log-'),
    action,
    details,
    timestamp: Date.now(),
  };
  
  if (isDemoMode || !supabase) {
    const logs = JSON.parse(localStorage.getItem('nerdy_mugs_logs') || '[]');
    logs.unshift(log);
    if (logs.length > 50) logs.pop();
    localStorage.setItem('nerdy_mugs_logs', JSON.stringify(logs));
    return;
  }
  
  await supabase.from('logs').insert({
    id: log.id,
    action,
    details,
  });
}

export async function getLogs(): Promise<LogEntry[]> {
  if (isDemoMode || !supabase) {
    return JSON.parse(localStorage.getItem('nerdy_mugs_logs') || '[]');
  }
  
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}
