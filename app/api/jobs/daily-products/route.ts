import { NextRequest, NextResponse } from "next/server";
import { extractProductsFromUrl } from "@/lib/firecrawl";
import { scoreProductWithOpenAI } from "@/lib/openai";
import {
  domainAllowed,
  generateCandidateUrls,
  getDuplicateLookbackSinceISO,
  getRunDateISO,
  normalizeTitle,
  RULE,
} from "@/lib/products";
import { getSupabaseClient } from "@/lib/supabase";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds — requires Vercel Pro or higher

type StoredProduct = Product & {
  score: number;
};

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const runDate = getRunDateISO();
  const supabase = getSupabaseClient();
  const errors: string[] = [];
  const candidates = generateCandidateUrls();
  const scored: StoredProduct[] = [];
  const seenTitlesThisRun = new Set<string>();

  const { data: existingProducts, error: existingProductsError } = await supabase
    .from("products")
    .select("normalized_title")
    .eq("rule_name", RULE.name)
    .gte("discovered_at", getDuplicateLookbackSinceISO())
    .not("normalized_title", "is", null);

  if (existingProductsError) {
    return NextResponse.json({ success: false, error: existingProductsError.message }, { status: 500 });
  }

  const existingNormalizedTitles = new Set(
    (existingProducts ?? [])
      .map((row: { normalized_title: string | null }) => row.normalized_title)
      .filter((value: string | null): value is string => Boolean(value))
  );

  for (const candidateUrl of candidates) {
    try {
      const extractedProducts = await extractProductsFromUrl(candidateUrl);

      for (const product of extractedProducts) {
        if (!domainAllowed(product.source_domain)) continue;
        if (!product.image_url?.trim()) continue;

        const normalizedTitle = normalizeTitle(product.title);
        if (existingNormalizedTitles.has(normalizedTitle) || seenTitlesThisRun.has(normalizedTitle)) {
          continue;
        }

        try {
          const { score, isRelevant } = await scoreProductWithOpenAI(product);
          if (!isRelevant) continue;
          seenTitlesThisRun.add(normalizedTitle);
          scored.push({ ...product, normalized_title: normalizedTitle, score });
        } catch (err) {
          errors.push(`score failed for ${product.product_url}: ${String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`extract failed for ${candidateUrl}: ${String(err)}`);
    }
  }

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, RULE.dailyCount)
    .map(({ score: _score, ...product }) => product);

  let productsStored = 0;

  if (top.length > 0) {
    const rows = top.map((p) => ({
      rule_name: RULE.name,
      title: p.title,
      description: p.description,
      image_url: p.image_url,
      price: p.price,
      currency: p.currency,
      product_url: p.product_url,
      source_domain: p.source_domain,
      normalized_title: p.normalized_title ?? normalizeTitle(p.title),
      discovered_at: new Date().toISOString(),
      run_date: runDate,
    }));

    const { error, data } = await supabase
      .from("products")
      .upsert(rows, { onConflict: "product_url,run_date", ignoreDuplicates: true })
      .select("id");

    if (error) {
      errors.push(`db insert failed: ${error.message}`);
    } else {
      productsStored = data?.length ?? 0;
    }
  }

  return NextResponse.json({
    success: true,
    runDate,
    candidatesTried: candidates.length,
    productsStored,
    errors,
  });
}
