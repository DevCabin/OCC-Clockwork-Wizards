import { productSchema, type Product } from "./types";

// ─── Rule Configuration ───────────────────────────────────────────────────────
// Edit this object to change what products the pipeline discovers and stores.
// One rule is active at a time. Fields marked "✏ editable" are intended for
// routine tuning without touching pipeline logic.
export interface RuleConfig {
  name: string;            // ✏ identifier stored on every product/post row
  keywords: string[];      // ✏ search terms used to build candidate URLs
  excludeKeywords: string[]; // ✏ products matching any of these are rejected
  allowedDomains: string[]; // ✏ only products from these domains are accepted
  priceMin: number;        // ✏ scoring guidance for OpenAI (lower bound)
  priceMax: number;        // ✏ scoring guidance for OpenAI (upper bound)
  dailyCount: number;      // ✏ how many top products to store per daily run
}

export const RULE: RuleConfig = {
  name: "nerdy-mugs",
  keywords: [
    "funny mug",
    "nerdy mug",
    "geek coffee mug",
    "sci fi mug",
    "programmer mug",
    "funny coffee cup",
  ],
  excludeKeywords: ["poster", "sticker", "download"],
  allowedDomains: ["amazon.com", "etsy.com"],
  priceMin: 10,
  priceMax: 30,
  dailyCount: 10,
};

export function getRunDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateCandidateUrls(): string[] {
  const phrases = RULE.keywords.map((keyword) => `${keyword}`);
  const urls = new Set<string>();

  for (const phrase of phrases) {
    const encoded = encodeURIComponent(phrase);
    urls.add(`https://www.amazon.com/s?k=${encoded}`);
    urls.add(`https://www.etsy.com/search?q=${encoded}`);
  }

  return Array.from(urls);
}

export function normalizeProduct(input: unknown): Product | null {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return null;

  const product = parsed.data;
  product.title = product.title.trim();
  product.description = (product.description ?? "").trim();
  product.source_domain = normalizeDomain(product.source_domain, product.product_url);
  return product;
}

export function domainAllowed(domain: string | null): boolean {
  if (!domain) return false;
  return RULE.allowedDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

function normalizeDomain(domain: string | null, productUrl: string): string | null {
  if (domain && domain.length > 0) return domain.replace(/^www\./, "").toLowerCase();
  try {
    const host = new URL(productUrl).hostname;
    return host.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
