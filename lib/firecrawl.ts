import { normalizeProduct } from "./products";
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
      formats: ["extract"],
      extract: {
        schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
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
  const extracted = json?.data?.extract?.products;
  if (!Array.isArray(extracted)) return [];

  const normalized: Product[] = [];
  for (const item of extracted) {
    const product = normalizeProduct(item);
    if (product) normalized.push(product);
  }

  return normalized;
}
