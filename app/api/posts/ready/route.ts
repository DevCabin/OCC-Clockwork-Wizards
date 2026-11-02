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

  const limitParam = Number(searchParams.get("limit") ?? "60");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 250) : 60;
  const offsetParam = Number(searchParams.get("offset") ?? "0");
  const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;
  const q = (searchParams.get("q") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();
  const nowIso = new Date().toISOString();

  // Public feed: only posts whose linked product has an image, and that are
  // public by status + schedule. Filtering happens at the DB level so that
  // offset-based pagination returns correct, complete pages.
  let query = supabase
    .from("posts")
    .select(`
      id, product_id, rule_name, product_title, product_url, title, slug, excerpt, body_md, status, published_at, scheduled_for, legacy_source_url, legacy_source_path, content_source, run_date, created_at,
      products!inner(image_url)
    `)
    .not("products.image_url", "is", null)
    .in("status", ["published", "ready"])
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`);

  if (category) {
    query = query.eq("rule_name", category);
  }

  if (q) {
    // Strip characters that would break the PostgREST `or` filter syntax.
    const safe = q.replace(/[(),%*]/g, " ").replace(/\s+/g, " ").trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `title.ilike.${pattern},excerpt.ilike.${pattern},product_title.ilike.${pattern}`
      );
    }
  }

  const { data, error } = await query
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: PUBLIC_CORS_HEADERS });
  }

  const hasImage = (post: { products?: unknown }): boolean => {
    const p = post.products as
      | { image_url?: string | null }
      | Array<{ image_url?: string | null }>
      | null
      | undefined;
    if (!p) return false;
    const imageUrl = Array.isArray(p) ? p[0]?.image_url : p.image_url;
    return Boolean(imageUrl && imageUrl.trim().length > 0);
  };

  const visiblePosts = (data ?? []).filter(
    (post) =>
      hasImage(post) &&
      isVisiblePostStatus(post.status) &&
      isScheduledForPublicView(post.scheduled_for)
  );

  // Response with CORS headers
  return NextResponse.json(
    {
      posts: visiblePosts,
      limit,
      offset,
      hasMore: (data?.length ?? 0) === limit,
      _cache: Date.now(),
    },
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
