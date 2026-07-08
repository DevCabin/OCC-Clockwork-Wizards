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

  try {
    const body = await req.json().catch(() => ({}));
    const { post_id, slug, delete_product } = body;

    if (!post_id && !slug) {
      return NextResponse.json(
        { success: false, error: "Missing required field: post_id or slug" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Find the post
    let query = supabase
      .from("posts")
      .select("id, title, slug, product_id");

    if (post_id) {
      query = query.eq("id", post_id);
    } else {
      query = query.eq("slug", slug);
    }

    const { data: post, error: postError } = await query.limit(1);

    if (postError) {
      return NextResponse.json({ success: false, error: postError.message }, { status: 500 });
    }

    if (!post || post.length === 0) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    const foundPost = post[0];
    const productId = foundPost.product_id;

    // Delete the post
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", foundPost.id);

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    // Optionally delete the product too
    let productDeleted = false;
    if (delete_product && productId) {
      const { error: productDeleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (productDeleteError) {
        // Post was already deleted, so report partial success
        return NextResponse.json({
          success: true,
          message: `Post "${foundPost.slug}" deleted, but product deletion failed: ${productDeleteError.message}`,
          postDeleted: true,
          productDeleted: false,
        });
      }
      productDeleted = true;
    }

    return NextResponse.json({
      success: true,
      message: `Post "${foundPost.slug}" deleted${productDeleted ? " (product also deleted)" : ""}`,
      postDeleted: true,
      productDeleted,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}