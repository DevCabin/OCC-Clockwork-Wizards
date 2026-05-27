import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

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

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

  if (!id && !slug) {
    return NextResponse.json(
      { success: false, error: "Provide either 'id' or 'slug'." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();
  const publishedAt = new Date().toISOString();

  let query = supabase
    .from("posts")
    .update({ status: "published", published_at: publishedAt })
    .select("id, slug, status, published_at")
    .limit(1);

  query = id ? query.eq("id", id) : query.eq("slug", slug);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const post = data?.[0];

  if (!post) {
    return NextResponse.json({ success: false, error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, post });
}