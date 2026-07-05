import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";
import { weeklyDiscoveryRuleSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS_HEADERS });
}

type RouteContext = {

  params: {
    id: string;
  };
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const id = context.params.id;
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  if (!password || !(await verifyAdminPassword(password))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const rule = body?.rule;
  const parsed = weeklyDiscoveryRuleSchema.partial().safeParse(rule);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.message },
      { status: 400, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_discovery_rules")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
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
    { success: true, rule: data },
    { headers: PUBLIC_CORS_HEADERS }
  );
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const id = context.params.id;
  const { searchParams } = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const password = searchParams.get("password") || body?.password;

  if (!password || !(await verifyAdminPassword(password))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("weekly_discovery_rules")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, message: "Rule deleted" },
    { headers: PUBLIC_CORS_HEADERS }
  );
}

export async function POST(req: NextRequest, context: RouteContext) {
  const id = context.params.id;
  const body = await req.json().catch(() => ({}));
  const password = body?.password;
  const action = body?.action;

  if (!password || !(await verifyAdminPassword(password))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: PUBLIC_CORS_HEADERS }
    );
  }

  if (action !== "delete") {
    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("weekly_discovery_rules")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, message: "Rule deleted" },
    { headers: PUBLIC_CORS_HEADERS }
  );
}
