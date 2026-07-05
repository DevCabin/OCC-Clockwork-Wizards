import { NextRequest, NextResponse } from "next/server";
import { extractProductsFromUrl } from "@/lib/firecrawl";
import { scoreProductWithOpenAI } from "@/lib/openai";
import { getSupabaseClient } from "@/lib/supabase";
import { normalizeTitle, domainAllowed } from "@/lib/products";
import { candidateProductSchema } from "@/lib/types";
import type { WeeklyDiscoveryRule, WeeklyProductCandidate } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function getWeekStartDate(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function buildAmazonSearchUrls(category: string, tags: string[], searchTerms: string[]): string[] {
  const urls: string[] = [];
  const terms = searchTerms.length > 0 ? searchTerms : tags;
  const suffixes = ["mug", "coffee mug", "cup", "travel mug"];

  for (const term of terms) {
    for (const suffix of suffixes) {
      const query = `${category} ${term} ${suffix}`.trim();
      const encoded = encodeURIComponent(query);
      urls.push(`https://www.amazon.com/s?k=${encoded}`);
      // Add page 2 for more results
      urls.push(`https://www.amazon.com/s?k=${encoded}&page=2`);
    }
  }

  // Generic category searches
  for (const suffix of suffixes) {
    const genericQuery = encodeURIComponent(`${category} ${suffix}`.trim());
    urls.push(`https://www.amazon.com/s?k=${genericQuery}`);
    urls.push(`https://www.amazon.com/s?k=${genericQuery}&page=2`);
  }

  return [...new Set(urls)]; // Deduplicate
}

function normalizeAffiliateUrl(productUrl: string, tag = "georgwebsi-20"): string {
  try {
    const url = new URL(productUrl);
    // Remove existing tag
    url.searchParams.delete("tag");
    // Add our affiliate tag
    url.searchParams.set("tag", tag);
    return url.toString();
  } catch {
    return productUrl;
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const weekStartDate = getWeekStartDate();
  const errors: string[] = [];
  
  // Load active rules
  const { data: rules, error: rulesError } = await supabase
    .from("weekly_discovery_rules")
    .select("*")
    .eq("is_active", true);

  if (rulesError) {
    return NextResponse.json({ success: false, error: rulesError.message }, { status: 500 });
  }

  if (!rules || rules.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: "No active discovery rules found",
      weekStartDate,
      rulesProcessed: 0,
      candidatesFound: 0,
      candidatesInserted: 0,
      duplicatesSkipped: 0,
      errors: []
    });
  }

  let totalCandidatesFound = 0;
  let totalCandidatesInserted = 0;
  let totalDuplicatesSkipped = 0;

  // Get existing candidates for this week (for deduplication)
  const { data: existingCandidates } = await supabase
    .from("weekly_product_candidates")
    .select("product_url")
    .eq("week_start_date", weekStartDate);

  const existingUrls = new Set(existingCandidates?.map(c => c.product_url) ?? []);

  const ruleDebug: Record<string, unknown>[] = [];

  // Process each rule
  for (const rule of rules as WeeklyDiscoveryRule[]) {
    const ruleLog: {
      rule: string;
      category: string;
      minScore: number;
      searchUrls: string[];
      extractionCounts: number[];
      domainFiltered: number;
      duplicateFiltered: number;
      scoreRejected: number;
      schemaRejected: number;
      accepted: number;
      errors: string[];
    } = {
      rule: rule.name,
      category: rule.category,
      minScore: rule.min_score,
      searchUrls: [],
      extractionCounts: [],
      domainFiltered: 0,
      duplicateFiltered: 0,
      scoreRejected: 0,
      schemaRejected: 0,
      accepted: 0,
      errors: [],
    };
    ruleDebug.push(ruleLog);

    try {
      const targetCount = rule.max_candidates;
      const searchUrls = buildAmazonSearchUrls(rule.category, rule.tags, rule.search_terms);
      ruleLog.searchUrls = searchUrls;

      const ruleCandidates: WeeklyProductCandidate[] = [];

      for (const searchUrl of searchUrls) {
        if (ruleCandidates.length >= targetCount) break;

        try {
          const extractedProducts = await extractProductsFromUrl(searchUrl);
          ruleLog.extractionCounts.push(extractedProducts.length);

          for (const product of extractedProducts) {
            if (ruleCandidates.length >= targetCount) break;

            if (!domainAllowed(product.source_domain)) {
              ruleLog.domainFiltered = (ruleLog.domainFiltered as number) + 1;
              continue;
            }

            if (existingUrls.has(product.product_url)) {
              totalDuplicatesSkipped++;
              ruleLog.duplicateFiltered = (ruleLog.duplicateFiltered as number) + 1;
              continue;
            }

            if (ruleCandidates.some(c => c.product_url === product.product_url)) {
              continue;
            }

            try {
              const { score, isRelevant } = await scoreProductWithOpenAI(product, rule);

              if (!isRelevant || score < rule.min_score) {
                ruleLog.scoreRejected = (ruleLog.scoreRejected as number) + 1;
                continue;
              }

              const candidateData = {
                product_title: product.title,
                price: product.price,
                description: product.description,
                product_url: product.product_url,
                affiliate_url: normalizeAffiliateUrl(product.product_url),
                image_url: product.image_url,
                source: product.source_domain ?? "amazon",
                discovery_score: score,
              };

              const validated = candidateProductSchema.safeParse(candidateData);
              if (!validated.success) {
                ruleLog.schemaRejected = (ruleLog.schemaRejected as number) + 1;
                continue;
              }

              const candidate: Partial<WeeklyProductCandidate> = {
                week_start_date: weekStartDate,
                rule_id: rule.id,
                category: rule.category,
                tags: rule.tags,
                search_query: searchUrl,
                ...validated.data,
                status: "discovered",
                raw_payload: product as Record<string, unknown>,
              };

              ruleCandidates.push(candidate as WeeklyProductCandidate);
              existingUrls.add(product.product_url);
              totalCandidatesFound++;
              ruleLog.accepted = (ruleLog.accepted as number) + 1;
            } catch (err) {
              const msg = `Scoring failed for ${product.product_url}: ${String(err)}`;
              (ruleLog.errors as string[]).push(msg);
              errors.push(msg);
            }
          }
        } catch (err) {
          const msg = `Extraction failed for ${searchUrl}: ${String(err)}`;
          (ruleLog.errors as string[]).push(msg);
          errors.push(msg);
        }
      }

      if (ruleCandidates.length > 0) {
        const { error: insertError } = await supabase
          .from("weekly_product_candidates")
          .upsert(ruleCandidates, {
            onConflict: "week_start_date, product_url",
            ignoreDuplicates: true,
          });

        if (insertError) {
          const msg = `Insert failed for rule ${rule.name}: ${insertError.message}`;
          (ruleLog.errors as string[]).push(msg);
          errors.push(msg);
        } else {
          totalCandidatesInserted += ruleCandidates.length;
        }
      }
    } catch (err) {
      const msg = `Rule processing failed for ${rule.name}: ${String(err)}`;
      (ruleLog.errors as string[]).push(msg);
      errors.push(msg);
    }
  }

  return NextResponse.json({
    success: true,
    weekStartDate,
    rulesProcessed: rules.length,
    candidatesFound: totalCandidatesFound,
    candidatesInserted: totalCandidatesInserted,
    duplicatesSkipped: totalDuplicatesSkipped,
    errors: errors.slice(0, 10),
    debug: ruleDebug,
  });
}
