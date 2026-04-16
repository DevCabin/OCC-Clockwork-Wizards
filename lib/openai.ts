import { RULE, normalizeProduct } from "./products";
import { openAiPostSchema, openAiScoreSchema, type GeneratedPost, type Product } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/responses";

export async function scoreProductWithOpenAI(product: Product): Promise<{ score: number; isRelevant: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const prompt = [
    "You are scoring product relevance for this rule:",
    JSON.stringify(RULE),
    "Product:",
    JSON.stringify(product),
    "Return ONLY strict JSON with keys score (0-100 number) and isRelevant (boolean).",
    "Reject if excluded keywords present or product not likely a mug or coffee cup.",
    "Favor keyword match and price inside range.",
  ].join("\n");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "product_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number", minimum: 0, maximum: 100 },
              isRelevant: { type: "boolean" },
            },
            required: ["score", "isRelevant"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const outputText = extractOutputText(json);

  if (typeof outputText !== "string" || outputText.trim().length === 0) {
    throw new Error("OpenAI returned no parsable JSON text output");
  }

  const parsed = JSON.parse(outputText);
  return openAiScoreSchema.parse(parsed);
}

export async function generatePostForProduct(product: Product): Promise<GeneratedPost> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const prompt = [
    "You are writing a short affiliate-style product spotlight in markdown.",
    "Write for a fan of nerdy, geeky, or funny mugs and coffee cups.",
    "Product:",
    JSON.stringify(product),
    "Return ONLY strict JSON with keys:",
    "title (string), slug (string), excerpt (string), body_md (string markdown).",
    "Constraints:",
    "- Keep body_md concise (~120-220 words).",
    "- Mention practical details when available (price, source_domain).",
    "- No fabricated specs.",
    "- Slug must be lowercase kebab-case.",
  ].join("\n");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "generated_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 1 },
              slug: { type: "string", minLength: 1 },
              excerpt: { type: "string", minLength: 1 },
              body_md: { type: "string", minLength: 1 },
            },
            required: ["title", "slug", "excerpt", "body_md"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const outputText = extractOutputText(json);

  if (typeof outputText !== "string" || outputText.trim().length === 0) {
    throw new Error("OpenAI returned no parsable JSON text output");
  }

  const parsed = openAiPostSchema.parse(JSON.parse(outputText));
  return {
    ...parsed,
    slug: normalizeSlug(parsed.slug, product.title),
  };
}

function extractOutputText(json: unknown): string | undefined {
  const j = json as
    | {
        output_text?: string;
        output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
      }
    | undefined;

  return typeof j?.output_text === "string"
    ? j.output_text
    : j?.output?.[0]?.content?.find((c) => c?.type === "output_text")?.text;
}

// ─── Markdown extraction fallback ─────────────────────────────────────────────
// Called when Firecrawl's built-in LLM extract returns no products.
// Sends the raw page markdown to OpenAI and asks it to extract products.
export async function extractProductsFromMarkdown(markdown: string): Promise<Product[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  // Truncate to ~8000 chars to stay within a reasonable token budget
  const truncated = markdown.slice(0, 8000);

  const prompt = [
    "Extract all product listings from this e-commerce search results page (provided as markdown).",
    "For each product return: title (product name), product_url (full URL to the product page),",
    "price (numeric USD price or null), currency ('USD' or null), description (brief or null),",
    "image_url (product image URL or null), source_domain ('amazon.com' or 'etsy.com' or null).",
    "Only include items that have both a title and a product_url.",
    "Markdown content:",
    truncated,
  ].join("\n");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "extracted_products",
          strict: true,
          schema: {
            type: "object",
            properties: {
              products: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    product_url: { type: "string" },
                    price: { anyOf: [{ type: "number" }, { type: "null" }] },
                    currency: { anyOf: [{ type: "string" }, { type: "null" }] },
                    description: { anyOf: [{ type: "string" }, { type: "null" }] },
                    image_url: { anyOf: [{ type: "string" }, { type: "null" }] },
                    source_domain: { anyOf: [{ type: "string" }, { type: "null" }] },
                  },
                  required: ["title", "product_url", "price", "currency", "description", "image_url", "source_domain"],
                  additionalProperties: false,
                },
              },
            },
            required: ["products"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const outputText = extractOutputText(json);

  if (typeof outputText !== "string" || outputText.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(outputText);
    const items: unknown[] = parsed?.products ?? [];
    return items.map((p) => normalizeProduct(p)).filter((p): p is Product => p !== null);
  } catch {
    return [];
  }
}

function normalizeSlug(slug: string, fallbackTitle: string): string {
  const candidate = (slug || fallbackTitle)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return candidate.length > 0 ? candidate : "product-spotlight";
}
