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

    // Find ALL WP posts (ready, published, OR rejected) where product image is from old WP site
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        id, title, slug, status,
        products(image_url)
      `)
      .eq("content_source", "wordpress-import")
      .in("status", ["ready", "published", "rejected"]);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Find posts with broken WP images
    const brokenImagePosts = (posts || []).filter((p: any) => {
      const imageUrl = p.products?.[0]?.image_url;
      return imageUrl && imageUrl.includes('nerdymugs.com/wp-content');
    });

    if (!dryRun && brokenImagePosts.length > 0) {
      const ids = brokenImagePosts.map((p: any) => p.id);
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
      count: brokenImagePosts.length,
      message: dryRun 
        ? `${brokenImagePosts.length} posts have broken WP images` 
        : `${brokenImagePosts.length} posts marked as "needs_image"`,
      posts: brokenImagePosts.map((p: any) => ({
        title: p.title,
        slug: p.slug,
        image_url: p.products?.[0]?.image_url
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
