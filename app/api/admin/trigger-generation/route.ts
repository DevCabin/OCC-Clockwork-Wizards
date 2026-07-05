import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  if (!password || !(await verifyAdminPassword(password))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: "Server misconfiguration: missing CRON_SECRET" },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }

  const baseUrl = new URL(req.url).origin;
  const maxPosts = body?.maxPosts ?? 10;

  try {
    const response = await fetch(`${baseUrl}/api/jobs/generate-weekly-posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ maxPosts }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: result.error || `Job failed with ${response.status}` },
        { status: 502, headers: PUBLIC_CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, result },
      { headers: PUBLIC_CORS_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
