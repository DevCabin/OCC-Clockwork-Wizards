import { NextRequest, NextResponse } from "next/server";
import { generatePostForProduct } from "@/lib/openai";
import { getSupabaseClient } from "@/lib/supabase";
import type { WeeklyProductCandidate, Product } from "@/lib/types";

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
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function generateSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
  const shortId = id.slice(0, 8);
  return `${base}-${shortId}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const weekStartDate = getWeekStartDate();
  const errors: string[] = [];
  
  const body = await req.json().catch(() => ({}));
  const maxPosts = body?.maxPosts ?? 10; // Default to 10 posts per run
  
  // Create a generation run record
  const { data: runRecord, error: runError } = await supabase
    .from("content_generation_runs")
    .insert({
      week_start_date: weekStartDate,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
   
  if (runError) {
    return NextResponse.json({ success: false, error: runError.message }, { status: 500 });
  }
  
  const runId = runRecord.id;

  try {
    // Load per-rule min_score thresholds so publishing is automatic by min_score.
    const { data: rulesData } = await supabase
      .from("weekly_discovery_rules")
      .select("id, min_score");
    const minScoreByRule = new Map<string, number>();
    for (const rule of rulesData ?? []) {
      const r = rule as { id?: string; min_score?: number | null };
      if (r.id) minScoreByRule.set(r.id, typeof r.min_score === "number" ? r.min_score : 80);
    }

    // Fetch candidates eligible for generation: approved OR discovered.
    const { data: rawCandidates, error: candidatesError } = await supabase
      .from("weekly_product_candidates")
      .select("*")
      .eq("week_start_date", weekStartDate)
      .in("status", ["approved", "discovered"])
      .is("post_id", null)
      .order("discovery_score", { ascending: false })
      .limit(maxPosts * 5);

    if (candidatesError) {
      throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
    }

    // Automatic publish: approved always qualifies; discovered qualifies when its
    // score meets the rule's min_score threshold. No human approval needed.
    const candidates = (rawCandidates ?? [])
      .filter((c) => {
        const cand = c as WeeklyProductCandidate;
        if (cand.status === "approved") return true;
        const threshold = cand.rule_id ? minScoreByRule.get(cand.rule_id) ?? 80 : 80;
        return typeof cand.discovery_score === "number" && cand.discovery_score >= threshold;
      })
      .slice(0, maxPosts);

    if (!candidates || candidates.length === 0) {
      // Update run record to completed with no work
      await supabase
        .from("content_generation_runs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          summary: { message: "No candidates ready for generation" },
        })
        .eq("id", runId);
      
      return NextResponse.json({
        success: true,
        weekStartDate,
        postsGenerated: 0,
        message: "No approved or high-confidence candidates found",
        errors: [],
      });
    }

    let postsGenerated = 0;
    let postsFailed = 0;
    let postsSkippedNoImage = 0;
    const generatedPostIds: string[] = [];

    // Generate posts for each candidate
    for (const candidate of candidates as WeeklyProductCandidate[]) {
      try {
        // Guard: never generate a post without a usable image. No-image posts
        // render as "No image" on the frontend, so skip and flag the candidate.
        const candidateImage = candidate.image_url?.trim();
        if (!candidateImage) {
          postsSkippedNoImage++;
          await supabase
            .from("weekly_product_candidates")
            .update({
              status: "needs_image",
              error_message: "Skipped: no image_url captured during discovery",
              updated_at: new Date().toISOString(),
            })
            .eq("id", candidate.id);
          continue;
        }

        // Convert candidate to Product format for the generator
        const product: Product = {
          title: candidate.product_title,
          description: candidate.description ?? "",
          image_url: candidate.image_url,
          price: candidate.price,
          currency: "USD",
          product_url: candidate.affiliate_url ?? candidate.product_url,
          source_domain: candidate.source,
        };

        // Generate the post content
        const generatedPost = await generatePostForProduct(product);
        
        // Create a unique slug
        const slug = generateSlug(generatedPost.slug, candidate.id);
        
        // Get run_date for posts table
        const runDate = new Date().toISOString().slice(0, 10);
        
        // First, insert the product into products table (needed for posts foreign key)
        const { data: productRecord, error: productError } = await supabase
          .from("products")
          .upsert({
            rule_name: candidate.category ?? "weekly-loop",
            title: candidate.product_title,
            description: candidate.description ?? "",
            image_url: candidate.image_url,
            price: candidate.price,
            currency: "USD",
            product_url: candidate.affiliate_url ?? candidate.product_url,
            source_domain: candidate.source,
            run_date: runDate,
          }, {
            onConflict: "product_url, run_date",
          })
          .select("id")
          .single();
        
        if (productError) {
          throw new Error(`Failed to insert product: ${productError.message}`);
        }

        // Insert the post
        const { data: postRecord, error: postError } = await supabase
          .from("posts")
          .insert({
            product_id: productRecord.id,
            rule_name: candidate.category ?? "weekly-loop",
            product_title: candidate.product_title,
            product_url: candidate.affiliate_url ?? candidate.product_url,
            title: generatedPost.title,
            slug: slug,
            excerpt: generatedPost.excerpt,
            body_md: generatedPost.body_md,
            run_date: runDate,
          })
          .select("id")
          .single();

        if (postError) {
          throw new Error(`Failed to insert post: ${postError.message}`);
        }

        // Update candidate status to drafted and link to post
        await supabase
          .from("weekly_product_candidates")
          .update({
            status: "drafted",
            post_id: postRecord.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", candidate.id);

        postsGenerated++;
        generatedPostIds.push(postRecord.id);
        
      } catch (err) {
        postsFailed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to generate post for candidate ${candidate.id}: ${errorMsg}`);
        
        // Mark candidate as error
        await supabase
          .from("weekly_product_candidates")
          .update({
            status: "error",
            error_message: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", candidate.id);
      }
    }

    // Stagger the freshly generated batch so they don't all go live at once.
    // Keep the top `liveCount` posts published now; schedule the rest one-per-`spacingDays`.
    let staggeredScheduled = 0;
    const staggerLiveCount = Number.isFinite(Number(body?.liveCount))
      ? Math.max(0, Number(body.liveCount))
      : 3;
    const staggerSpacingDays = Number.isFinite(Number(body?.spacingDays))
      ? Math.max(1, Number(body.spacingDays))
      : 1;

    if (body?.stagger !== false && generatedPostIds.length > 0) {
      const now = Date.now();
      const liveIds = generatedPostIds.slice(0, staggerLiveCount);
      const scheduleIds = generatedPostIds.slice(staggerLiveCount);

      if (liveIds.length > 0) {
        await supabase
          .from("posts")
          .update({
            status: "published",
            scheduled_for: null,
            published_at: new Date(now).toISOString(),
          })
          .in("id", liveIds);
      }

      for (let i = 0; i < scheduleIds.length; i += 1) {
        const when = new Date(now + (i + 1) * staggerSpacingDays * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("posts")
          .update({ status: "ready", scheduled_for: when, published_at: null })
          .eq("id", scheduleIds[i]);
        staggeredScheduled += 1;
      }
    }

    // Update run record
    const finalStatus = postsFailed > 0 && postsGenerated === 0 ? "failed" : 
                        postsFailed > 0 ? "partial" : "completed";
    
    await supabase
      .from("content_generation_runs")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        summary: {
          candidates_processed: candidates.length,
          posts_generated: postsGenerated,
          posts_failed: postsFailed,
          posts_skipped_no_image: postsSkippedNoImage,
          posts_live: Math.min(staggerLiveCount, generatedPostIds.length),
          posts_scheduled: staggeredScheduled,
          post_ids: generatedPostIds,
        },
        error_message: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
      })
      .eq("id", runId);

    return NextResponse.json({
      success: finalStatus !== "failed",
      weekStartDate,
      runId,
      candidatesProcessed: candidates.length,
      postsGenerated,
      postsFailed,
      postsSkippedNoImage,
      staggeredScheduled,
      postIds: generatedPostIds,
      errors: errors.slice(0, 5),
    });

  } catch (error) {
    // Update run record to failed
    await supabase
      .from("content_generation_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", runId);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


// Vercel Cron uses GET; reuse POST logic (still CRON_SECRET-guarded).
export async function GET(req: NextRequest) {
  return POST(req);
}
