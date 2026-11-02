import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthorizedCronRequest, PUBLIC_CORS_HEADERS } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";

function getWeekStartDate(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

interface CandidateRow {
  category: string | null;
  product_title: string;
  price: number | null;
  image_url: string | null;
  product_url: string;
  affiliate_url: string | null;
  discovery_score: number | null;
  status: string;
}

async function buildCsv(week: string): Promise<{ csv: string; count: number }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_product_candidates")
    .select("category, product_title, price, image_url, product_url, affiliate_url, discovery_score, status")
    .eq("week_start_date", week)
    .order("discovery_score", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as CandidateRow[];
  const headers = [
    "Category",
    "Title",
    "Image URL",
    "Price",
    "Product URL",
    "Affiliate URL",
    "Discovery Score",
    "Status",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.category),
        csvEscape(row.product_title),
        csvEscape(row.image_url),
        csvEscape(row.price),
        csvEscape(row.product_url),
        csvEscape(row.affiliate_url),
        csvEscape(row.discovery_score),
        csvEscape(row.status),
      ].join(",")
    );
  }

  return { csv: lines.join("\r\n") + "\r\n", count: rows.length };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: PUBLIC_CORS_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week") || getWeekStartDate();

  try {
    const { csv, count } = await buildCsv(week);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        ...PUBLIC_CORS_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nerdymugs-candidates-${week}.csv"`,
        "X-Candidate-Count": String(count),
        "X-Week": week,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
