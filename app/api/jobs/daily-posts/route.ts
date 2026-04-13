import { NextRequest, NextResponse } from "next/server";
import { generatePostForProduct } from "@/lib/openai";
import { getRunDateISO, RULE } from "@/lib/products";
import { getSupabaseClient } from "@/lib/supabase";
import type { Product } from "@/lib/types";

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

  const supabase = getSupabaseClient();
  const runDate = getRunDateISO();
  const errors: string[] = [];

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, rule_name, title, description, image_url, price, currency, product_url, source_domain, run_date, created_at")
    .eq("rule_name", RULE.name)
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(25);

  if (productsError) {
    return NextResponse.json({ success: false, error: productsError.message }, { status: 500 });
  }

  const { data: existingPosts, error: existingPostsError } = await supabase
    .from("posts")
    .select("product_id");

  if (existingPostsError) {
    return NextResponse.json({ success: false, error: existingPostsError.message }, { status: 500 });
  }

  const existingProductIds = new Set((existingPosts ?? []).map((p) => p.product_id as string));
  const candidates = (products ?? []).filter((p) => !existingProductIds.has(p.id));

  const rows: Array<{
    product_id: string;
    rule_name: string;
    product_title: string;
    product_url: string;
    title: string;
    slug: string;
    excerpt: string;
    body_md: string;
    run_date: string;
  }> = [];

  for (const product of candidates) {
    const modelInput: Product = {
      title: product.title,
      description: product.description ?? "",
      image_url: product.image_url,
      price: product.price,
      currency: product.currency,
      product_url: product.product_url,
      source_domain: product.source_domain,
    };

    try {
      const post = await generatePostForProduct(modelInput);
      rows.push({
        product_id: product.id,
        rule_name: product.rule_name,
        product_title: product.title,
        product_url: product.product_url,
        title: post.title,
        slug: `${post.slug}-${String(product.id).slice(0, 8)}`,
        excerpt: post.excerpt,
        body_md: post.body_md,
        run_date: runDate,
      });
    } catch (err) {
      errors.push(`post generation failed for ${product.product_url}: ${String(err)}`);
    }
  }

  let postsStored = 0;

  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("posts")
      .upsert(rows, { onConflict: "product_id", ignoreDuplicates: false })
      .select("id");

    if (error) {
      errors.push(`db insert failed: ${error.message}`);
    } else {
      postsStored = data?.length ?? 0;
    }
  }

  return NextResponse.json({
    success: true,
    runDate,
    productsChecked: (products ?? []).length,
    postsAttempted: candidates.length,
    postsStored,
    errors,
  });
}