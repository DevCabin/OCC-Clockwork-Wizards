import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getImageWithPlaceholder } from "@/lib/placeholders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "21");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 21;

  const { data, error } = await supabase
    .from("products")
    .select("id, rule_name, title, description, image_url, price, currency, product_url, source_domain, normalized_title, discovered_at, run_date, created_at")
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add placeholder images for products without images (SEO-friendly!)
  const productsWithPlaceholders = (data ?? []).map(product => ({
    ...product,
    image_url: getImageWithPlaceholder(product.image_url),
  }));

  return NextResponse.json({ products: productsWithPlaceholders });
}
