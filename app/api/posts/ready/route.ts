import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import {
  PUBLIC_CORS_HEADERS,
  isScheduledForPublicView,
  isVisiblePostStatus,
} from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "21");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 250) : 21;

  // Simple query - just get posts with product join, no image filtering
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, product_id, rule_name, product_title, product_url, title, slug, excerpt, body_md, status, published_at, scheduled_for, legacy_source_url, legacy_source_path, content_source, run_date, created_at,
      products(image_url)
    `)
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: PUBLIC_CORS_HEADERS });
  }

  const visiblePosts = (data ?? [])
    .filter((post) => isVisiblePostStatus(post.status) && isScheduledForPublicView(post.scheduled_for))
    .slice(0, limit);

  // Response with CORS headers
  return NextResponse.json(
    { posts: visiblePosts, _cache: Date.now() },
    {
      headers: {
        ...PUBLIC_CORS_HEADERS,
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      }
    }
  );
}
