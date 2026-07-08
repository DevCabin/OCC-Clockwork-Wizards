import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CSV_IMPORT_RULE = "csv-import";
const DEFAULT_LIVE_COUNT = 14;
const DEFAULT_WEEKLY_COUNT = 14;
const DEFAULT_SPACING_DAYS = 7;

function addDays(baseDate: Date, days: number): Date {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const liveCount = Number.isFinite(Number(body?.liveCount))
      ? Math.max(1, Number(body.liveCount))
      : DEFAULT_LIVE_COUNT;
    const weeklyCount = Number.isFinite(Number(body?.weeklyCount))
      ? Math.max(1, Number(body.weeklyCount))
      : DEFAULT_WEEKLY_COUNT;
    const spacingDays = Number.isFinite(Number(body?.spacingDays))
      ? Math.max(1, Number(body.spacingDays))
      : DEFAULT_SPACING_DAYS;
    const startDate = new Date(body?.startDate || new Date().toISOString());

    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid startDate" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch only CSV-import posts that have a post (status ready or published)
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, slug, title, status, published_at, scheduled_for, run_date, created_at, product_id")
      .eq("rule_name", CSV_IMPORT_RULE)
      .in("status", ["ready", "published"])
      .order("run_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const allPosts = posts ?? [];
    const livePosts = allPosts.slice(0, liveCount);
    const scheduledPosts = allPosts.slice(liveCount);

    const livePayload = livePosts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      status: "published" as const,
      scheduled_for: null,
      published_at: post.published_at || new Date().toISOString(),
    }));

    // Schedule in weekly batches of weeklyCount
    const scheduledPayload: Array<{
      id: string;
      slug: string;
      title: string;
      status: "ready";
      scheduled_for: string;
      published_at: string | null;
    }> = [];

    scheduledPosts.forEach((post, index) => {
      const weekNumber = Math.floor(index / weeklyCount);
      const dayOffset = (weekNumber + 1) * spacingDays;
      scheduledPayload.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        status: "ready",
        scheduled_for: addDays(startDate, dayOffset).toISOString(),
        published_at: post.published_at,
      });
    });

    if (!dryRun) {
      for (const post of livePayload) {
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            status: post.status,
            scheduled_for: post.scheduled_for,
            published_at: post.published_at,
          })
          .eq("id", post.id);

        if (updateError) {
          return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }
      }

      for (const post of scheduledPayload) {
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            status: post.status,
            scheduled_for: post.scheduled_for,
          })
          .eq("id", post.id);

        if (updateError) {
          return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      ruleName: CSV_IMPORT_RULE,
      totalPosts: allPosts.length,
      liveCount: livePayload.length,
      scheduledCount: scheduledPayload.length,
      weeklyCount,
      spacingDays,
      startDate: startDate.toISOString(),
      livePosts: livePayload.map(({ id, slug, title }) => ({ id, slug, title })),
      nextScheduledPosts: scheduledPayload.slice(0, 5).map(({ id, slug, title, scheduled_for }) => ({
        id,
        slug,
        title,
        scheduled_for,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}