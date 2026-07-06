import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Deletes posts whose linked product has no usable image.
 *
 * These are typically produced by the weekly loop (weekly-discovery ->
 * generate-weekly-posts) when Firecrawl fails to capture a product image from
 * an Amazon search results page. Such posts render as "No image" on NerdyMugs.
 *
 * Defaults to a dry run. Pass {"dryRun": false} to actually delete.
 * The linked orphan product rows are removed too (posts cascade on product
 * delete, so we delete products which removes the posts).
 */
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
      .select("id, product_id, slug, title, status, products(image_url)");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Supabase may return the embedded product as an object or a single-item
    // array depending on relationship detection — handle both shapes.
    const getImageUrl = (post: { products?: unknown }): string | null => {
      const p = post.products as
        | { image_url?: string | null }
        | Array<{ image_url?: string | null }>
        | null
        | undefined;
      if (!p) return null;
      if (Array.isArray(p)) return p[0]?.image_url ?? null;
      return p.image_url ?? null;
    };

    const noImagePosts = (posts ?? []).filter((post) => {
      const imageUrl = getImageUrl(post);
      return !imageUrl || imageUrl.trim().length === 0;
    });

    const postIds = noImagePosts.map((p) => p.id);
    const productIds = noImagePosts
      .map((p) => p.product_id)
      .filter((id): id is string => Boolean(id));

    let deletedPosts = 0;
    let deletedProducts = 0;

    if (!dryRun && postIds.length > 0) {
      // Delete posts first (explicit), then their orphaned product rows.
      const { error: postDeleteError } = await supabase
        .from("posts")
        .delete()
        .in("id", postIds);

      if (postDeleteError) {
        return NextResponse.json(
          { success: false, error: postDeleteError.message },
          { status: 500 }
        );
      }
      deletedPosts = postIds.length;

      if (productIds.length > 0) {
        const { error: productDeleteError } = await supabase
          .from("products")
          .delete()
          .in("id", productIds);

        if (productDeleteError) {
          // Posts are already gone; report the product cleanup failure but
          // don't treat the whole run as failed.
          return NextResponse.json({
            success: true,
            dryRun,
            deletedPosts,
            deletedProducts,
            warning: `Posts deleted, but product cleanup failed: ${productDeleteError.message}`,
          });
        }
        deletedProducts = productIds.length;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      count: noImagePosts.length,
      deletedPosts,
      deletedProducts,
      message: dryRun
        ? `${noImagePosts.length} no-image posts found (dry run, nothing deleted)`
        : `${deletedPosts} no-image posts deleted`,
      posts: noImagePosts.slice(0, 20).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        status: p.status,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
