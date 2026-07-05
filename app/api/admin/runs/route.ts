import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS_HEADERS });
}

export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_generation_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, runs: data ?? [] },
    { headers: PUBLIC_CORS_HEADERS }
  );
}
