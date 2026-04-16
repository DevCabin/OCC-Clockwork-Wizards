import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, rule_name, run_date, created_at")
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    supabaseUrl: url,
    keyPrefix: key.slice(0, 20) + "...",
    keyLength: key.length,
    productsError: error?.message ?? null,
    products: data ?? [],
  });
}