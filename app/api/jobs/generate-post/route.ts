import { NextRequest, NextResponse } from "next/server";
import { generatePostForProduct } from "@/lib/openai";
import { getSupabaseClient } from "@/lib/supabase";
import type { PostStatus, Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: product_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch the product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, rule_name, title, description, image_url, price, currency, product_url, source_domain, normalized_title, run_date, created_at")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if a post already exists for this product
    const { data: existingPost } = await supabase
      .from("posts")
      .select("id, title, slug, status")
      .eq("product_id", product_id)
      .maybeSingle();

    if (existingPost) {
      return NextResponse.json({
        success: true,
        message: "Post already exists for this product",
        post: existingPost,
        alreadyExisted: true,
      });
    }

    // Generate the post via OpenAI
    const modelInput: Product = {
      title: product.title,
      description: product.description ?? "",
      image_url: product.image_url,
      price: product.price,
      currency: product.currency,
      product_url: product.product_url,
      source_domain: product.source_domain,
    };

    const generated = await generatePostForProduct(modelInput);

    const slug = `${generated.slug}-${String(product.id).slice(0, 8)}`;
    const runDate = product.run_date || new Date().toISOString().slice(0, 10);

    const postRow = {
      product_id: product.id,
      rule_name: product.rule_name,
      product_title: product.title,
      product_url: product.product_url,
      title: generated.title,
      slug,
      excerpt: generated.excerpt,
      body_md: generated.body_md,
      status: "ready" as PostStatus,
      published_at: null,
      scheduled_for: null,
      run_date: runDate,
    };

    const { data: insertedPost, error: insertError } = await supabase
      .from("posts")
      .upsert(postRow, { onConflict: "product_id", ignoreDuplicates: false })
      .select("id, title, slug, status")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Post generated successfully",
      post: insertedPost,
      alreadyExisted: false,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}