import { productSchema, type Product } from "./types";

export const RULE = {
  name: "retro-sci-fi-shirts",
  keywords: ["alien", "ufo", "spaceship", "galactic"],
  excludeKeywords: ["mug", "poster", "sticker", "download"],
  allowedDomains: ["amazon.com", "etsy.com"],
  priceMin: 15,
  priceMax: 35,
  dailyCount: 3,
};

export function getRunDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateCandidateUrls(): string[] {
  const phrases = RULE.keywords.map((keyword) => `retro sci fi shirt ${keyword}`);
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
