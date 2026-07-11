import { NextRequest, NextResponse } from "next/server";
import { imageNeedsRepair, recoverProductImage } from "@/lib/postImageRecovery";
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
    const { post_id, slug } = body;

    if (!post_id && !slug) {
      return NextResponse.json(
        { success: false, error: "Missing required field: post_id or slug" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    let query = supabase
      .from("posts")
      .select("id, title, slug, status, published_at, scheduled_for, products(id, title, product_url, image_url)");

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
    const rawProduct = foundPost.products as {
      id?: string;
      title?: string;
      product_url?: string;
      image_url?: string | null;
    } | Array<{
      id?: string;
      title?: string;
      product_url?: string;
      image_url?: string | null;
    }> | null;
    const product = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct;

    if (await imageNeedsRepair(product?.image_url)) {
      if (!product?.id || !product.product_url) {
        return NextResponse.json({ success: false, error: "Post has no recoverable product image" }, { status: 409 });
      }
      const recovered = await recoverProductImage({
        title: product.title || foundPost.title,
        productUrl: product.product_url,
      });
      if (!recovered) {
        return NextResponse.json({ success: false, error: "No matching product image found; post was not published" }, { status: 409 });
      }
      const { error: imageError } = await supabase
        .from("products")
        .update({ image_url: recovered.imageUrl })
        .eq("id", product.id);
      if (imageError) {
        return NextResponse.json({ success: false, error: imageError.message }, { status: 500 });
      }
    }

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        status: "published",
        published_at: foundPost.published_at || new Date().toISOString(),
        scheduled_for: null,
      })
      .eq("id", foundPost.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Post "${foundPost.slug}" published`,
      post: {
        id: foundPost.id,
        title: foundPost.title,
        slug: foundPost.slug,
        status: "published",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
