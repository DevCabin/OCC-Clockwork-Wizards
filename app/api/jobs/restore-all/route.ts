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

  try {
    const supabase = getSupabaseClient();

    // Restore ALL posts to ready status
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, title, slug")
      .in("status", ["needs_image", "rejected"]);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (posts && posts.length > 0) {
      const ids = posts.map((p: any) => p.id);
      const { error: updateError } = await supabase
        .from("posts")
        .update({ status: "ready" })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      count: posts?.length || 0,
      message: `${posts?.length || 0} posts restored to "ready"`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
