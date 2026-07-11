import { extractProductsFromUrl } from "@/lib/firecrawl";

export type ProductImageRecoveryInput = {
  title: string;
  productUrl: string;
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

function titleMatchScore(expectedTitle: string, candidateTitle: string): number {
  const expected = normalizedWords(expectedTitle);
  const candidate = normalizedWords(candidateTitle);
  if (expected.size === 0 || candidate.size === 0) return 0;

  let shared = 0;
  for (const word of expected) {
    if (candidate.has(word)) shared++;
  }
  return shared / expected.size;
}

/**
 * Looks up the product page immediately before publication and returns the
 * best matching usable image. It never falls back to a generic placeholder.
 */
export async function recoverProductImage({
  title,
  productUrl,
}: ProductImageRecoveryInput): Promise<string | null> {
  const candidates = await extractProductsFromUrl(productUrl);
  const matches = candidates
    .filter((candidate) => isUsableImageUrl(candidate.image_url))
    .map((candidate) => ({
      imageUrl: candidate.image_url,
      score: titleMatchScore(title, candidate.title),
    }))
    .sort((a, b) => b.score - a.score);

  const best = matches[0];
  return best && best.score >= 0.4 ? best.imageUrl : null;
}
