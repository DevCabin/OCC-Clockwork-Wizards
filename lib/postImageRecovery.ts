import { extractProductsFromUrl } from "@/lib/firecrawl";

export type ProductImageRecoveryInput = {
  title: string;
  productUrl: string;
  description?: string | null;
  price?: number | null;
};

export type RecoveredProductImage = {
  imageUrl: string;
  confidence: number;
};

function normalizedWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 2)
  );
}

function isUsableImageUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return (
      /^https?:$/.test(url.protocol) &&
      !/\/images\/I\/\d+[A-Z]+(-|\.|$)/.test(url.pathname) &&
      !/IMAGE-REMOVED/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function wordMatchScore(expectedText: string, candidateText: string): number {
  const expected = normalizedWords(expectedText);
  const candidate = normalizedWords(candidateText);
  if (expected.size === 0 || candidate.size === 0) return 0;

  let shared = 0;
  for (const word of expected) {
    if (candidate.has(word)) shared++;
  }
  return (2 * shared) / (expected.size + candidate.size);
}

function priceMatchScore(expected: number | null | undefined, candidate: number | null): number {
  if (!expected || !candidate || expected <= 0 || candidate <= 0) return 0;
  const difference = Math.abs(expected - candidate) / expected;
  return difference <= 0.03 ? 1 : difference <= 0.1 ? 0.5 : 0;
}

/**
 * Looks up the product page immediately before publication and returns the
 * best matching usable image. The confidence score uses title primarily, then
 * description and price when the source supplied them. It never falls back to
 * a generic placeholder.
 */
export async function recoverProductImage({
  title,
  productUrl,
  description,
  price,
}: ProductImageRecoveryInput): Promise<RecoveredProductImage | null> {
  const candidates = await extractProductsFromUrl(productUrl);
  const matches = candidates
    .filter((candidate) => isUsableImageUrl(candidate.image_url))
    .map((candidate) => ({
      imageUrl: candidate.image_url!,
      confidence:
        wordMatchScore(title, candidate.title) * 0.75 +
        wordMatchScore(description ?? "", `${candidate.title} ${candidate.description ?? ""}`) * 0.15 +
        priceMatchScore(price, candidate.price) * 0.1,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = matches[0];
  return best && best.confidence >= 0.55 ? best : null;
}
