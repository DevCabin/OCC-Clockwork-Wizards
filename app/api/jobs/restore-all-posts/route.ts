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

    // Find ALL rejected WP posts
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, title, slug, status, legacy_source_path, rule_name")
      .eq("content_source", "wordpress-import")
      .eq("status", "rejected");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const wpPosts = posts || [];

    if (!dryRun && wpPosts.length > 0) {
      // Restore all to ready status
      const ids = wpPosts.map((p) => p.id);
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status: "ready" })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      count: wpPosts.length,
      message: dryRun 
        ? `${wpPosts.length} posts would be restored to "ready"` 
        : `${wpPosts.length} posts restored to "ready"`,
      posts: wpPosts.slice(0, 5).map(p => ({
        title: p.title,
        slug: p.slug,
        legacy_path: p.legacy_source_path
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
