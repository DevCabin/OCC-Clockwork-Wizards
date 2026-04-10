// NerdyMugs - Type Definitions

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  productUrl: string;
  price: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Post {
  id: string;
  productId: string;
  title: string;
  caption: string;
  description: string;
  suggestedTags: string[];
  videoSuggestion: string;
  clicks: number;
  publishedAt: number;
  isPublished: boolean;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  weight: number;
  searchTerms: string[];
  tags: string[];
  triviaHooks: string[];
  isActive: boolean;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  affiliateId: string;
}

export interface ScheduleConfig {
  postsPerDay: number;
  quietDays: string[];
  lastRunAt: number;
}

export interface AppState {
  products: Product[];
  posts: Post[];
  categories: Category[];
  siteConfig: SiteConfig;
  scheduleConfig: ScheduleConfig;
  logs: LogEntry[];
  recentCategories: string[]; // Track for rotation rules
}

export interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: number;
}

export type FilterType = 'all' | 'category' | 'tag';

export interface Filter {
  type: FilterType;
  value: string;
}

// Content generation output
export interface GeneratedContent {
  title: string;
  caption: string;
  description: string;
  suggestedTags: string[];
  videoSuggestion: string;
}
