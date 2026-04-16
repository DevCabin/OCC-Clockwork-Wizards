import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";
  return NextResponse.json({
    supabaseUrl: url,
    keyPrefix: key.slice(0, 20) + "...",
    keyLength: key.length,
  });
}
