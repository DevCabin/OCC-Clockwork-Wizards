import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const slug = context.params.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, product_id, rule_name, product_title, product_url, title, slug, excerpt, body_md, status, published_at, scheduled_for, legacy_source_url, legacy_source_path, content_source, run_date, created_at")
    .eq("slug", slug)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const post = data?.[0];

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ post });
}