import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = Math.min(isNaN(limitParam) ? 10 : limitParam, 100);

  // Calculate the date 7 days ago for the trending window
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString().slice(0, 10); // YYYY-MM-DD

  const supabase = getSupabaseClient();

  // TODO: true trending should sort by a persisted relevance score once a
  // `score` column is added to the products table. Currently the score is
  // computed in-memory during the daily-products job and discarded before
  // upsert. For now, trending = most recent products from the last 7 days.
  const { data, error } = await supabase
    .from("products")
    .select("id, rule_name, title, description, image_url, price, currency, product_url, source_domain, normalized_title, discovered_at, run_date, created_at")
    .gte("run_date", sinceISO)
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: data ?? [] });
}