import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";
import { weeklyDiscoveryRuleSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS_HEADERS });
}

export async function GET() {

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_discovery_rules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, rules: data ?? [] },
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

  const rule = body?.rule;
  const parsed = weeklyDiscoveryRuleSchema.safeParse(rule);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.message },
      { status: 400, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_discovery_rules")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, rule: data },
    { headers: PUBLIC_CORS_HEADERS }
  );
}
