import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const slug = context.params.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400, headers: corsHeaders });
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, product_id, rule_name, product_title, product_url, title, slug, excerpt, body_md, 
      status, published_at, scheduled_for, legacy_source_url, legacy_source_path, content_source, run_date, created_at,
      products(image_url, description)
    `)
    .eq("slug", slug)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  const post = data?.[0];

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json({ post }, { headers: corsHeaders });
}
