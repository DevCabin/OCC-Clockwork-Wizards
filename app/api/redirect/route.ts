import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();

    // Find post by legacy_source_path
    const { data: post, error } = await supabase
      .from("posts")
      .select("slug, status")
      .eq("legacy_source_path", path)
      .limit(1)
      .single();

    if (error || !post) {
      // No match - return 404
      return NextResponse.json(
        { error: "Not found", path },
        { status: 404 }
      );
    }

    // Calculate category from path or default to "mugs"
    const category = path.startsWith("/comics/") ? "comics" : 
                    path.startsWith("/star-trek/") ? "star-trek" : "mugs";

    // New URL structure
    const newUrl = `/${category}/${post.slug}`;

    // Return 301 redirect
    return NextResponse.redirect(new URL(newUrl, req.url), 301);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
