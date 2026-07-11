import { NextRequest, NextResponse } from "next/server";
import {
  PUBLIC_CORS_HEADERS,
  isScheduledForPublicView,
  isVisiblePostStatus,
} from "@/lib/publicPosts";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "21");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 21;

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, product_id, rule_name, product_title, product_url, title, slug, excerpt, body_md, status, published_at, scheduled_for, legacy_source_url, legacy_source_path, content_source, run_date, created_at,
      products!inner(image_url)
    `)
    .not("products.image_url", "is", null)
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: PUBLIC_CORS_HEADERS });
  }

  const hasImage = (post: { products?: unknown }): boolean => {
    const product = post.products as
      | { image_url?: string | null }
      | Array<{ image_url?: string | null }>
      | null
      | undefined;
    const imageUrl = Array.isArray(product) ? product[0]?.image_url : product?.image_url;
    return Boolean(imageUrl?.trim());
  };

  const visiblePosts = (data ?? []).filter(
    (post) =>
      hasImage(post) &&
      isVisiblePostStatus(post.status) &&
      isScheduledForPublicView(post.scheduled_for)
  );

  return NextResponse.json({ posts: visiblePosts }, { headers: PUBLIC_CORS_HEADERS });
}
