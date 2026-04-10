// NerdyMugs - Database Layer

import type { AppState, Product, Post, Category, LogEntry, SiteConfig, ScheduleConfig } from '@/types';
import { siteConfig, scheduleConfig as defaultScheduleConfig, categoriesConfig } from '@/config/nerdyMugs';

const DB_KEY = 'nerdy_mugs_v1';

// Generate unique IDs
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create default categories from config
function createDefaultCategories(): Category[] {
  return categoriesConfig.map((cat) => ({
    id: generateId('cat-'),
    name: cat.name,
    slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
    weight: cat.weight,
    searchTerms: cat.searchTerms,
    tags: cat.tags,
    triviaHooks: cat.triviaHooks,
    isActive: true,
  }));
}

const defaultState: AppState = {
  products: [],
  posts: [],
  categories: createDefaultCategories(),
  siteConfig: siteConfig,
  scheduleConfig: {
    postsPerDay: defaultScheduleConfig.postsPerDay,
    quietDays: defaultScheduleConfig.quietDays,
    lastRunAt: 0,
  },
  logs: [],
  recentCategories: [],
};

// Load state from localStorage
export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultState,
        ...parsed,
        siteConfig: { ...defaultState.siteConfig, ...parsed.siteConfig },
        scheduleConfig: { ...defaultState.scheduleConfig, ...parsed.scheduleConfig },
      };
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
  return { ...defaultState };
}

// Save state to localStorage
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

// Product operations
export function addProduct(state: AppState, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
  const newProduct: Product = {
    ...product,
    id: generateId('prod-'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.products.unshift(newProduct);
  saveState(state);
  return newProduct;
}

export function updateProduct(state: AppState, id: string, updates: Partial<Product>): Product | null {
  const index = state.products.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  state.products[index] = {
    ...state.products[index],
    ...updates,
    updatedAt: Date.now(),
  };
  saveState(state);
  return state.products[index];
}

export function deleteProduct(state: AppState, id: string): boolean {
  const index = state.products.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  state.products.splice(index, 1);
  state.posts = state.posts.filter(p => p.productId !== id);
  saveState(state);
  return true;
}

// Post operations
export function addPost(state: AppState, post: Omit<Post, 'id' | 'publishedAt' | 'clicks'>): Post {
  const newPost: Post = {
    ...post,
    id: generateId('post-'),
    publishedAt: Date.now(),
    clicks: 0,
  };
  state.posts.unshift(newPost);
  saveState(state);
  return newPost;
}

export function updatePost(state: AppState, id: string, updates: Partial<Post>): Post | null {
  const index = state.posts.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  state.posts[index] = { ...state.posts[index], ...updates };
  saveState(state);
  return state.posts[index];
}

export function incrementClicks(state: AppState, postId: string): void {
  const post = state.posts.find(p => p.id === postId);
  if (post) {
    post.clicks++;
    saveState(state);
  }
}

export function deletePost(state: AppState, id: string): boolean {
  const index = state.posts.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  state.posts.splice(index, 1);
  saveState(state);
  return true;
}

// Category operations
export function addCategory(state: AppState, category: Omit<Category, 'id'>): Category {
  const newCategory: Category = {
    ...category,
    id: generateId('cat-'),
  };
  state.categories.push(newCategory);
  saveState(state);
  return newCategory;
}

export function updateCategory(state: AppState, id: string, updates: Partial<Category>): Category | null {
  const index = state.categories.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  state.categories[index] = { ...state.categories[index], ...updates };
  saveState(state);
  return state.categories[index];
}

export function deleteCategory(state: AppState, id: string): boolean {
  const index = state.categories.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  state.categories.splice(index, 1);
  saveState(state);
  return true;
}

// Site config operations
export function updateSiteConfig(state: AppState, updates: Partial<SiteConfig>): SiteConfig {
  state.siteConfig = { ...state.siteConfig, ...updates };
  saveState(state);
  return state.siteConfig;
}

// Schedule config operations
export function updateScheduleConfig(state: AppState, updates: Partial<ScheduleConfig>): ScheduleConfig {
  state.scheduleConfig = { ...state.scheduleConfig, ...updates };
  saveState(state);
  return state.scheduleConfig;
}

// Track recent category for rotation
export function trackCategoryUsage(state: AppState, categoryName: string): void {
  state.recentCategories.unshift(categoryName);
  // Keep only last 14 days worth (rough estimate)
  if (state.recentCategories.length > 50) {
    state.recentCategories = state.recentCategories.slice(0, 50);
  }
  saveState(state);
}

// Log operations
export function addLog(state: AppState, action: string, details: string): LogEntry {
  const newLog: LogEntry = {
    id: generateId('log-'),
    action,
    details,
    timestamp: Date.now(),
  };
  state.logs.unshift(newLog);
  if (state.logs.length > 50) {
    state.logs = state.logs.slice(0, 50);
  }
  saveState(state);
  return newLog;
}

// Query helpers
export function getPublishedPosts(state: AppState): Post[] {
  return state.posts.filter(p => p.isPublished).sort((a, b) => b.publishedAt - a.publishedAt);
}

export function getPostWithProduct(state: AppState, postId: string): { post: Post; product: Product } | null {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return null;
  const product = state.products.find(p => p.id === post.productId);
  if (!product) return null;
  return { post, product };
}

export function getPostsByCategory(state: AppState, categorySlug: string): Post[] {
  return state.posts.filter(p => {
    if (!p.isPublished) return false;
    return p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug;
  }).sort((a, b) => b.publishedAt - a.publishedAt);
}

export function getPostsByTag(state: AppState, tag: string): Post[] {
  return state.posts.filter(p => {
    if (!p.isPublished) return false;
    return p.suggestedTags.includes(tag);
  }).sort((a, b) => b.publishedAt - a.publishedAt);
}

export function getAllTags(state: AppState): string[] {
  const tags = new Set<string>();
  state.categories.forEach(c => c.tags.forEach(t => tags.add(t)));
  return Array.from(tags).sort();
}

export function getActiveCategories(state: AppState): Category[] {
  return state.categories.filter(c => c.isActive);
}
