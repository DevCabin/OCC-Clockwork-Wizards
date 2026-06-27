import { z } from "zod";

export type Product = {
  title: string;
  description: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  product_url: string;
  source_domain: string | null;
  normalized_title?: string;
};

export const productSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  image_url: z.string().url().nullable(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().min(1).nullable(),
  product_url: z.string().url(),
  source_domain: z.string().min(1).nullable(),
  normalized_title: z.string().min(1).optional(),
});

export const openAiScoreSchema = z.object({
  score: z.number().min(0).max(100),
  isRelevant: z.boolean(),
});

export const openAiPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().min(1),
  body_md: z.string().min(1),
});

export type GeneratedPost = z.infer<typeof openAiPostSchema>;

export const postStatusSchema = z.enum(["ready", "published", "rejected", "needs_review"]);
export type PostStatus = z.infer<typeof postStatusSchema>;

// ===== Weekly Loop Types (Phase 2) =====

export type WeeklyDiscoveryRule = {
  id: string;
  name: string;
  category: string;
  allocation_percent: number;
  tags: string[];
  search_terms: string[];
  max_candidates: number;
  min_score: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateStatus = 
  | "discovered" 
  | "needs_review" 
  | "approved" 
  | "rejected" 
  | "drafted" 
  | "published" 
  | "error";

export type WeeklyProductCandidate = {
  id: string;
  week_start_date: string;
  rule_id: string | null;
  category: string | null;
  tags: string[];
  search_query: string | null;
  product_title: string;
  price: number | null;
  description: string | null;
  product_url: string;
  affiliate_url: string | null;
  image_url: string | null;
  source: string;
  raw_payload: Record<string, unknown> | null;
  extraction_model: string | null;
  discovery_score: number | null;
  status: CandidateStatus;
  error_message: string | null;
  post_id: string | null;
  discovered_at: string;
  updated_at: string;
};

export type GenerationRunStatus = 
  | "pending" 
  | "running" 
  | "completed" 
  | "failed" 
  | "partial";

export type ContentGenerationRun = {
  id: string;
  week_start_date: string;
  status: GenerationRunStatus;
  started_at: string | null;
  finished_at: string | null;
  summary: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

// Zod schemas for validation
export const weeklyDiscoveryRuleSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  allocation_percent: z.number().min(0).max(100),
  tags: z.array(z.string()).default([]),
  search_terms: z.array(z.string()).default([]),
  max_candidates: z.number().min(1).default(10),
  min_score: z.number().min(0).max(100).default(70),
  is_active: z.boolean().default(true),
  notes: z.string().nullable(),
});

export const candidateProductSchema = z.object({
  product_title: z.string().min(1),
  price: z.number().nonnegative().nullable(),
  description: z.string().default(""),
  product_url: z.string().url(),
  affiliate_url: z.string().url().nullable(),
  image_url: z.string().url().nullable(),
  source: z.string().default("amazon"),
  discovery_score: z.number().min(0).max(100).nullable(),
});

export type CandidateProduct = z.infer<typeof candidateProductSchema>;
