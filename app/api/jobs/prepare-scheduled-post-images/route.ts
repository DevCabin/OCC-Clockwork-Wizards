import { NextRequest, NextResponse } from "next/server";
import { recoverProductImage } from "@/lib/postImageRecovery";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type JoinedProduct = {
  id: string;
  title: string;
  product_url: string;
  image_url: string | null;
};

function getProduct(value: unknown): JoinedProduct | null {
  if (Array.isArray(value)) return (value[0] as JoinedProduct | undefined) ?? null;
  return (value as JoinedProduct | null) ?? null;
}

/**
 * Daily release gate. Attempts image recovery for posts due in the next day.
 * A failed lookup is held for review instead of being published without an
 * image or deleted.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const windowHours = Number.isFinite(Number(body?.windowHours))
    ? Math.min(Math.max(Number(body.windowHours), 1), 72)
    : 30;
  const maxPosts = Number.isFinite(Number(body?.maxPosts))
    ? Math.min(Math.max(Number(body.maxPosts), 1), 20)
    : 5;
  const now = new Date();
  const deadline = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, scheduled_for, products(id, title, product_url, image_url)")
    .eq("status", "ready")
    .not("scheduled_for", "is", null)
    .gte("scheduled_for", now.toISOString())
    .lte("scheduled_for", deadline.toISOString())
    .order("scheduled_for", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const targets = (data ?? [])
    .map((post) => ({ ...post, product: getProduct(post.products) }))
    .filter((post) => !post.product?.image_url?.trim())
    .slice(0, maxPosts);
  const repaired: string[] = [];
  const heldForReview: string[] = [];
  const errors: string[] = [];

  for (const post of targets) {
    const product = post.product;
    if (!product) {
      errors.push(`${post.slug}: linked product not found`);
      continue;
    }

    try {
      const imageUrl = await recoverProductImage({
        title: product.title || post.title,
        productUrl: product.product_url,
      });

      if (imageUrl) {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ image_url: imageUrl })
            .eq("id", product.id);
          if (updateError) throw new Error(updateError.message);
        }
        repaired.push(post.slug);
      } else {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from("posts")
            .update({ status: "needs_review", scheduled_for: null })
            .eq("id", post.id);
          if (updateError) throw new Error(updateError.message);
        }
        heldForReview.push(post.slug);
      }
    } catch (recoveryError) {
      errors.push(`${post.slug}: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
    }
  }

  return NextResponse.json({
    success: true,
    dryRun,
    windowHours,
    targets: targets.length,
    repaired,
    heldForReview,
    errors,
  });
}
