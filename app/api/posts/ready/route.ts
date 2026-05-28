import { NextRequest, NextResponse } from "next/server";
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
    .in("status", ["ready", "published"])
    .neq("products.image_url", null)
    .not("products.image_url", "eq", "")
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Additional filter: remove posts where image_url is from old WP site or invalid
  const validPosts = (data || []).filter((post: any) => {
    const imageUrl = post.products?.[0]?.image_url;
    if (!imageUrl) return false;
    // Filter out old WP site images (they won't load)
    if (imageUrl.includes('nerdymugs.com/wp-content')) return false;
    return true;
  });

  // Cache-busting headers
  return NextResponse.json(
    { posts: validPosts, _cache: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      }
    }
  );
}