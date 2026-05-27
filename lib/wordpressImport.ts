import { createRequire } from "node:module";

export type LegacyImportRecord = {
  id: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  amazonUrl?: string;
  asin?: string;
  imageUrl?: string;
  price?: string;
  publishedAt?: number;
};

export type LegacyRedirectRecord = {
  source: string;
  destination: string;
  permanent?: boolean;
};

type SupabaseLike = {
  from: (table: string) => {
    upsert: (values: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
      select: (columns: string) => {
        limit: (count: number) => Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>;
      };
    };
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        limit: (count: number) => Promise<{
          data: Array<{ id: string; product_id: string; slug: string; legacy_source_path: string | null }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export type RunWordPressImportOptions = {
  importedPosts: LegacyImportRecord[];
  redirects: LegacyRedirectRecord[];
  supabase: SupabaseLike | null;
  dryRun?: boolean;
  includeEditorial?: boolean;
};

type ImportSummary = {
  dryRun: boolean;
  includeEditorial: boolean;
  totalRecords: number;
  usableRecords: number;
  importedProducts: number;
  importedPosts: number;
  skipped: number;
  skipReasons: Record<string, number>;
  slugCollisionsResolved: number;
  missingAmazonUrl: number;
  missingImageUrl: number;
  editorialIncluded: number;
  examples: {
    skipped: Array<{ id: string; title: string; legacyPath: string | null; reason: string }>;
    imported: Array<{
      id: string;
      title: string;
      slug: string;
      legacyPath: string | null;
      hasAmazonUrl: boolean;
      hasImageUrl: boolean;
      isEditorial: boolean;
    }>;
  };
};

const require = createRequire(import.meta.url);
const liveModule = require("./wordpressImport.mjs");

const wordpressImportModule = liveModule as {
  loadWordPressArtifactsFromLocal: (nerdyRoot: string) => {
    importedPosts: LegacyImportRecord[];
    redirects: LegacyRedirectRecord[];
  };
  loadWordPressArtifactsFromUrls: (
    importedPostsUrl: string,
    redirectsUrl: string
  ) => Promise<{
    importedPosts: LegacyImportRecord[];
    redirects: LegacyRedirectRecord[];
  }>;
  runWordPressImport: (options: RunWordPressImportOptions) => Promise<ImportSummary>;
};

export const loadWordPressArtifactsFromLocal = wordpressImportModule.loadWordPressArtifactsFromLocal;
export const loadWordPressArtifactsFromUrls = wordpressImportModule.loadWordPressArtifactsFromUrls;
export const runWordPressImport = wordpressImportModule.runWordPressImport;
