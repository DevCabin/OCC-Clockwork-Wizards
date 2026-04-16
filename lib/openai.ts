import { RULE } from "./products";
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

function normalizeSlug(slug: string, fallbackTitle: string): string {
  const candidate = (slug || fallbackTitle)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return candidate.length > 0 ? candidate : "product-spotlight";
}
