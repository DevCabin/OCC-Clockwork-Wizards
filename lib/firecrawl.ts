import { normalizeProduct } from "./products";
import { extractProductsFromMarkdown } from "./openai";
import type { Product } from "./types";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

export async function extractProductsFromUrl(url: string): Promise<Product[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("Missing FIRECRAWL_API_KEY");

  const response = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      // Request both so we can fall back to markdown if extract returns nothing
      formats: ["markdown", "extract"],
      extract: {
        prompt:
          "Extract all product listings from this page. For each product get: title (product name), product_url (full URL to the product page), price (numeric price or null), currency (e.g. USD or null), description (brief description or null), image_url (product image URL or null), source_domain (e.g. amazon.com or etsy.com).",
        schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: ["string", "null"] },
                  image_url: { type: ["string", "null"] },
                  price: { type: ["number", "null"] },
                  currency: { type: ["string", "null"] },
                  product_url: { type: "string" },
                  source_domain: { type: ["string", "null"] },
                },
                required: ["title", "product_url"],
              },
            },
          },
          required: ["products"],
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  // Primary path: use Firecrawl's built-in LLM extract if it returned products
  const extracted = json?.data?.extract?.products;
  if (Array.isArray(extracted) && extracted.length > 0) {
    const normalized: Product[] = [];
    for (const item of extracted) {
      const product = normalizeProduct(item);
      if (product) normalized.push(product);
    }
    return normalized;
  }

  // Fallback path: Firecrawl extract returned nothing — parse markdown with OpenAI instead
  const markdown = json?.data?.markdown;
  if (typeof markdown === "string" && markdown.length > 0) {
    return extractProductsFromMarkdown(markdown);
  }

  return [];
}