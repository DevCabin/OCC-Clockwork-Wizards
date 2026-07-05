import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

function getWeekStartDate(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week") || getWeekStartDate();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_product_candidates")
    .select("*")
    .eq("week_start_date", week)
    .order("discovery_score", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, week, candidates: data ?? [] },
    { headers: PUBLIC_CORS_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  if (!password || !(await verifyAdminPassword(password))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const { id, status, error_message } = body;

  if (!id || typeof status !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing id or status" },
      { status: 400, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const validStatuses = ["discovered", "needs_review", "approved", "rejected", "drafted", "published", "error"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { success: false, error: "Invalid status" },
      { status: 400, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_product_candidates")
    .update({ status, error_message: error_message ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, candidate: data },
    { headers: PUBLIC_CORS_HEADERS }
  );
}
