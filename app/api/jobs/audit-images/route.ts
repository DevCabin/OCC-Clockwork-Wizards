import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Joined = { image_url?: string | null } | Array<{ image_url?: string | null }> | null | undefined;

function getImage(products: Joined): string | null {
  if (!products) return null;
  const p = Array.isArray(products) ? products[0] : products;
  const img = p?.image_url;
  return typeof img === "string" && img.trim() ? img.trim() : null;
}

function isUsableImageUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return false;
    if (/\/images\/I\/\d+[A-Z]+(-|\.|$)/.test(url.pathname)) return false; // synthetic
    if (/IMAGE-REMOVED/i.test(url.pathname)) return false; // placeholder
    return true;
  } catch {
    return false;
  }
}

async function runAudit(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const pageSize = 1000;
  let start = 0;
  const rows: Array<{ id: string; slug: string; status: string; products: Joined }> = [];

  // Page through every post (back to the beginning), not just the public feed.
  for (;;) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, status, products(image_url)")
      .order("created_at", { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as typeof rows));
    if (data.length < pageSize) break;
    start += pageSize;
  }

  const byStatus: Record<string, number> = {};
  const missingByStatus: Record<string, number> = {};
  let withImage = 0;
  let missing = 0;
  const missingSamples: Array<{ slug: string; status: string; reason: string }> = [];

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    const imageUrl = getImage(row.products);
    let reason = "";
    if (!imageUrl) reason = "absent";
    else if (!isUsableImageUrl(imageUrl)) reason = /IMAGE-REMOVED/i.test(imageUrl) ? "placeholder" : "invalid";

    if (reason) {
      missing += 1;
      missingByStatus[row.status] = (missingByStatus[row.status] ?? 0) + 1;
      if (missingSamples.length < 300) missingSamples.push({ slug: row.slug, status: row.status, reason });
    } else {
      withImage += 1;
    }
  }

  return NextResponse.json({
    success: true,
    totalPosts: rows.length,
    withImage,
    missing,
    byStatus,
    missingByStatus,
    missingSamples,
  });
}

export async function GET(req: NextRequest) {
  return runAudit(req);
}

export async function POST(req: NextRequest) {
  return runAudit(req);
}
