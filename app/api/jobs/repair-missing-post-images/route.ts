import { NextRequest, NextResponse } from "next/server";
import { imageNeedsRepair, recoverProductImage } from "@/lib/postImageRecovery";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type JoinedProduct = {
  id: string;
  title: string;
  product_url: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
};

function getProduct(value: unknown): JoinedProduct | null {
  if (Array.isArray(value)) return (value[0] as JoinedProduct | undefined) ?? null;
  return (value as JoinedProduct | null) ?? null;
}

/**
 * Controlled backlog repair. It repairs only high-confidence matches and
 * never deletes records or changes their publish state.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const maxPosts = Number.isFinite(Number(body?.maxPosts))
    ? Math.min(Math.max(Number(body.maxPosts), 1), 20)
    : 5;
  const slugs = Array.isArray(body?.slugs)
    ? body.slugs.filter((slug: unknown): slug is string => typeof slug === "string" && slug.trim().length > 0)
    : [];
  const supabase = getSupabaseClient();
  let query = supabase
    .from("posts")
    .select("id, slug, title, status, products(id, title, product_url, description, price, image_url)")
    .in("status", ["ready", "published"])
    .order("created_at", { ascending: true });
  if (slugs.length > 0) query = query.in("slug", slugs);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const candidates = (data ?? [])
    .map((post) => ({ ...post, product: getProduct(post.products) }))
    .filter((post) => Boolean(post.product));
  const targets: typeof candidates = [];
  for (const post of candidates) {
    if (targets.length >= maxPosts) break;
    if (await imageNeedsRepair(post.product?.image_url)) targets.push(post);
  }
  const repaired: Array<{ slug: string; confidence: number }> = [];
  const unresolved: string[] = [];
  const errors: string[] = [];

  for (const post of targets) {
    const product = post.product;
    if (!product) {
      errors.push(`${post.slug}: linked product not found`);
      continue;
    }
    try {
      const recovered = await recoverProductImage({
        title: product.title || post.title,
        productUrl: product.product_url,
        description: product.description,
        price: product.price,
      });
      if (!recovered) {
        unresolved.push(post.slug);
        continue;
      }
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ image_url: recovered.imageUrl })
          .eq("id", product.id);
        if (updateError) throw new Error(updateError.message);
      }
      repaired.push({ slug: post.slug, confidence: recovered.confidence });
    } catch (repairError) {
      errors.push(`${post.slug}: ${repairError instanceof Error ? repairError.message : String(repairError)}`);
    }
  }

  return NextResponse.json({
    success: true,
    dryRun,
    requestedSlugs: slugs,
    targets: targets.length,
    repaired,
    unresolved,
    errors,
    nextStep: targets.length === maxPosts ? "Run another batch to continue." : "Backlog complete.",
  });
}
