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

    // Find ALL posts (any status) where product has no image
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        id, title, slug, status,
        products(image_url)
      `)
      .in("status", ["ready", "published", "rejected"]);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Find posts with no/null/empty images
    const noImagePosts = (posts || []).filter((p: any) => {
      const imageUrl = p.products?.[0]?.image_url;
      return !imageUrl || imageUrl === "" || imageUrl === null;
    });

    if (!dryRun && noImagePosts.length > 0) {
      const ids = noImagePosts.map((p: any) => p.id);
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status: "needs_image" })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      count: noImagePosts.length,
      message: dryRun 
        ? `${noImagePosts.length} posts have no images` 
        : `${noImagePosts.length} posts marked as "needs_image"`,
      posts: noImagePosts.slice(0, 5).map((p: any) => ({
        title: p.title,
        slug: p.slug
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
