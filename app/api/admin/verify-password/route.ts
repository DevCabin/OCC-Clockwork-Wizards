import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { success: false, error: "Password required" },
      { status: 400, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const valid = await verifyAdminPassword(password);

  if (!valid) {
    return NextResponse.json(
      { success: false, error: "Invalid password" },
      { status: 401, headers: PUBLIC_CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, message: "Authenticated" },
    { headers: PUBLIC_CORS_HEADERS }
  );
}
