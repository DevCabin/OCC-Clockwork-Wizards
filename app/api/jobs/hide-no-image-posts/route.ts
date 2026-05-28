import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AFFILIATE_TAG = "georgwebsi-20";

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

    // Query all WP-imported posts with no image on linked product
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, product_id, title, slug, status, product_url, products(image_url)")
      .eq("content_source", "wordpress-import");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Identify posts that need hiding (no image on product)
    const needsHiding: Array<{
      id: string;
      productId: string | null;
      title: string;
      slug: string;
      currentStatus: string;
      reason: string;
    }> = [];
    const alreadyHiddenOrGood: Array<{ id: string; title: string; reason: string }> = [];

    for (const post of posts || []) {
      // @ts-ignore - products is a joined array
      const productImageUrl = post.products?.image_url;
      const hasImage = productImageUrl && productImageUrl.trim().length > 0;
      const isAlreadyHidden = post.status === "needs_review" || post.status === "rejected";

      // Build Amazon search fallback URL
      const titleEncoded = encodeURIComponent(post.title.trim());
      const fallbackUrl = `https://www.amazon.com/s?k=${titleEncoded}&tag=${AFFILIATE_TAG}`;

      if (!hasImage && !isAlreadyHidden) {
        needsHiding.push({
          id: post.id,
          productId: post.product_id,
          title: post.title,
          slug: post.slug,
          currentStatus: post.status,
          reason: "Product has no image",
        });
      } else {
        alreadyHiddenOrGood.push({
          id: post.id,
          title: post.title,
          reason: isAlreadyHidden ? `Already ${post.status}` : "Has image",
        });
      }
    }

    // Execute the hiding
    let successCount = 0;
    let failCount = 0;

    if (!dryRun && needsHiding.length > 0) {
      for (const hide of needsHiding) {
        // Update post status to needs_review
        const { error: postError } = await supabase
          .from("posts")
          .update({ status: "needs_review" })
          .eq("id", hide.id);

        if (postError) {
          console.error(`Failed to hide post ${hide.id}:`, postError.message);
          failCount++;
          continue;
        }

        // Also update the product URL to use Amazon search fallback
        // This ensures no nerdymugs.com links remain
        if (hide.productId) {
          const titleEncoded = encodeURIComponent(hide.title.trim());
          const fallbackUrl = `https://www.amazon.com/s?k=${titleEncoded}&tag=${AFFILIATE_TAG}`;

          const { error: productError } = await supabase
            .from("products")
            .update({ product_url: fallbackUrl })
            .eq("id", hide.productId);

          if (productError) {
            console.error(`Failed to update product ${hide.productId}:`, productError.message);
          }
        }

        successCount++;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalPosts: posts?.length || 0,
        wouldHide: needsHiding.length,
        actuallyHidden: dryRun ? 0 : successCount,
        failed: failCount,
        alreadyHiddenOrGood: alreadyHiddenOrGood.length,
      },
      examples: {
        wouldHide: needsHiding.slice(0, 5).map((h) => ({
          title: h.title,
          slug: h.slug,
          reason: h.reason,
        })),
        alreadyHiddenOrGood: alreadyHiddenOrGood.slice(0, 3).map((h) => ({
          title: h.title,
          reason: h.reason,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
