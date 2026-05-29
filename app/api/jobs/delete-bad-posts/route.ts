import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthorizedCronRequest, matchesBadPostPattern } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;

  try {
    const supabase = getSupabaseClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, slug, title, excerpt, body_md");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const badPosts = (posts ?? []).filter((post) => matchesBadPostPattern(post));
    const badPostIds = badPosts.map((post) => post.id);

    if (!dryRun && badPostIds.length > 0) {
      const { error: deleteError } = await supabase.from("posts").delete().in("id", badPostIds);

      if (deleteError) {
        return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      count: badPosts.length,
      message: dryRun
        ? `${badPosts.length} bad posts found`
        : `${badPosts.length} bad posts deleted`,
      posts: badPosts.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
