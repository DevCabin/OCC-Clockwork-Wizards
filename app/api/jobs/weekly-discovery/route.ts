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
  
  // Build queries from category + tags
  const terms = searchTerms.length > 0 ? searchTerms : tags;
  
  for (const term of terms) {
    const query = `${category} ${term} mug`.trim();
    const encoded = encodeURIComponent(query);
    urls.push(`https://www.amazon.com/s?k=${encoded}`);
  }
  
  // Also add a generic category search
  const genericQuery = encodeURIComponent(`${category} mug`);
  urls.push(`https://www.amazon.com/s?k=${genericQuery}`);
  
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

  // Process each rule
  for (const rule of rules as WeeklyDiscoveryRule[]) {
    try {
      // Calculate how many candidates to find for this rule
      // For now, use max_candidates directly (allocation_percent can be used for smarter distribution)
      const targetCount = rule.max_candidates;
      
      // Build search URLs
      const searchUrls = buildAmazonSearchUrls(rule.category, rule.tags, rule.search_terms);
      
      const ruleCandidates: WeeklyProductCandidate[] = [];
      
      for (const searchUrl of searchUrls) {
        if (ruleCandidates.length >= targetCount) break;
        
        try {
          const extractedProducts = await extractProductsFromUrl(searchUrl);
          
          for (const product of extractedProducts) {
            if (ruleCandidates.length >= targetCount) break;
            if (!domainAllowed(product.source_domain)) continue;
            
            const normalizedTitle = normalizeTitle(product.title);
            
            // Deduplicate against this week's existing candidates
            if (existingUrls.has(product.product_url)) {
              totalDuplicatesSkipped++;
              continue;
            }
            
            // Deduplicate against this run
            if (ruleCandidates.some(c => c.product_url === product.product_url)) {
              continue;
            }
            
            // Score the product
            try {
              const { score, isRelevant } = await scoreProductWithOpenAI(product);
              
              if (!isRelevant || score < rule.min_score) continue;
              
              // Validate and create candidate
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
              if (!validated.success) continue;
              
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
              
            } catch (err) {
              errors.push(`Scoring failed for ${product.product_url}: ${String(err)}`);
            }
          }
        } catch (err) {
          errors.push(`Extraction failed for ${searchUrl}: ${String(err)}`);
        }
      }
      
      // Insert candidates for this rule
      if (ruleCandidates.length > 0) {
        const { error: insertError } = await supabase
          .from("weekly_product_candidates")
          .upsert(ruleCandidates, { 
            onConflict: "week_start_date, product_url",
            ignoreDuplicates: true 
          });
        
        if (insertError) {
          errors.push(`Insert failed for rule ${rule.name}: ${insertError.message}`);
        } else {
          totalCandidatesInserted += ruleCandidates.length;
        }
      }
      
    } catch (err) {
      errors.push(`Rule processing failed for ${rule.name}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    success: true,
    weekStartDate,
    rulesProcessed: rules.length,
    candidatesFound: totalCandidatesFound,
    candidatesInserted: totalCandidatesInserted,
    duplicatesSkipped: totalDuplicatesSkipped,
    errors: errors.slice(0, 10), // Limit errors in response
  });
}
