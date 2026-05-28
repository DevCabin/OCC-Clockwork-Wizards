import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;

  try {
    const supabase = getSupabaseClient();

    // Find all needs_review posts from WP import
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, title, slug")
      .eq("content_source", "wordpress-import")
      .eq("status", "needs_review");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!dryRun && posts && posts.length > 0) {
      const ids = posts.map((p) => p.id);
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status: "rejected" })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      count: posts?.length || 0,
      message: dryRun
        ? `${posts?.length || 0} posts would be rejected`
        : `${posts?.length || 0} posts rejected`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
