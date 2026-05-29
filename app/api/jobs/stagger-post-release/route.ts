import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

const DEFAULT_LIVE_COUNT = 30;
const DEFAULT_SPACING_DAYS = 3;
const DEFAULT_START_DATE = "2026-05-31T12:00:00.000Z";

function addDays(baseDate: Date, days: number): Date {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const liveCount = Number.isFinite(Number(body?.liveCount))
    ? Math.max(1, Number(body.liveCount))
    : DEFAULT_LIVE_COUNT;
  const spacingDays = Number.isFinite(Number(body?.spacingDays))
    ? Math.max(1, Number(body.spacingDays))
    : DEFAULT_SPACING_DAYS;
  const startDate = new Date(body?.startDate || DEFAULT_START_DATE);

  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json(
      { success: false, error: "Invalid startDate" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, slug, title, status, published_at, run_date, created_at")
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

    const scheduledPayload = scheduledPosts.map((post, index) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      status: "ready" as const,
      scheduled_for: addDays(startDate, index * spacingDays).toISOString(),
      published_at: post.published_at,
    }));

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
      totalPosts: allPosts.length,
      liveCount: livePayload.length,
      scheduledCount: scheduledPayload.length,
      startDate: startDate.toISOString(),
      spacingDays,
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
