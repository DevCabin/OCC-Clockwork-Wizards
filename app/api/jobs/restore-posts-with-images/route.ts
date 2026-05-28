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

    // Find posts marked needs_image that actually have valid Amazon images
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        id, title, slug, status,
        products(image_url)
      `)
      .eq("status", "needs_image")
      .not("products.image_url", "is", null);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Filter to only posts with actual Amazon images (not null, not empty, not WP)
    const postsWithImages = (posts || []).filter((p: any) => {
      const imageUrl = p.products?.[0]?.image_url;
      if (!imageUrl || imageUrl === "" || imageUrl === null) return false;
      if (imageUrl.includes('nerdymugs.com/wp-content')) return false;
      return true;
    });

    if (!dryRun && postsWithImages.length > 0) {
      const ids = postsWithImages.map((p: any) => p.id);
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
      count: postsWithImages.length,
      message: dryRun 
        ? `${postsWithImages.length} posts with images would be restored` 
        : `${postsWithImages.length} posts with images restored to "ready"`,
      posts: postsWithImages.slice(0, 5).map((p: any) => ({
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
