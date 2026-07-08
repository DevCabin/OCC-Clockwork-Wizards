import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

const CSV_IMPORT_RULE = "csv-import";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") ?? "500");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 500;

    // Fetch CSV-import products with their post status via join
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        title,
        description,
        image_url,
        price,
        currency,
        product_url,
        source_domain,
        normalized_title,
        run_date,
        created_at,
        posts (
          id,
          title,
          slug,
          status,
          published_at,
          scheduled_for
        )
      `)
      .eq("rule_name", CSV_IMPORT_RULE)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: PUBLIC_CORS_HEADERS }
      );
    }

    const products = (data ?? []).map((row) => {
      const posts = Array.isArray(row.posts) ? row.posts : row.posts ? [row.posts] : [];
      const post = posts[0] || null;

      let status = "imported";
      if (post) {
        if (post.status === "published") {
          status = "published";
        } else if (post.status === "ready") {
          if (post.scheduled_for) {
            status = "scheduled";
          } else {
            status = "post_created";
          }
        } else if (post.status === "rejected") {
          status = "rejected";
        } else {
          status = post.status || "post_created";
        }
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        image_url: row.image_url,
        price: row.price,
        currency: row.currency,
        product_url: row.product_url,
        run_date: row.run_date,
        created_at: row.created_at,
        post: post
          ? {
              id: post.id,
              title: post.title,
              slug: post.slug,
              status: post.status,
              published_at: post.published_at,
              scheduled_for: post.scheduled_for,
            }
          : null,
        status,
      };
    });

    const summary = {
      total: products.length,
      imported: products.filter((p) => p.status === "imported").length,
      post_created: products.filter((p) => p.status === "post_created").length,
      scheduled: products.filter((p) => p.status === "scheduled").length,
      published: products.filter((p) => p.status === "published").length,
      rejected: products.filter((p) => p.status === "rejected").length,
    };

    return NextResponse.json(
      { success: true, products, summary },
      { headers: PUBLIC_CORS_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}