import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const supabase = getSupabaseClient();

  try {
    const body = await req.json().catch(() => ({}));
    const { slug, image_url } = body;

    if (!slug || !image_url) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: slug, image_url" },
        { status: 400 }
      );
    }

    // Find the post and its product_id
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, product_id, slug, title")
      .eq("slug", slug)
      .limit(1);

    if (postError) {
      return NextResponse.json({ success: false, error: postError.message }, { status: 500 });
    }

    if (!post || post.length === 0) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const foundPost = post[0];
    const updates: string[] = [];

    // Update the product's image_url if product_id exists
    if (foundPost.product_id) {
      const { error: productError } = await supabase
        .from("products")
        .update({ image_url })
        .eq("id", foundPost.product_id);

      if (productError) {
        return NextResponse.json({ success: false, error: productError.message }, { status: 500 });
      }
      updates.push(`products.image_url updated for product ${foundPost.product_id}`);
    }

    return NextResponse.json({
      success: true,
      message: `Image updated for post "${foundPost.slug}"`,
      updates,
      new_image_url: image_url,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}