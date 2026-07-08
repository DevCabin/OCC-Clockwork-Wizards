import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { normalizeTitle } from "@/lib/products";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CSV_IMPORT_RULE = "csv-import";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

interface CsvProductInput {
  title: string;
  description?: string;
  image_url?: string;
  price?: number | string | null;
  category?: string;
  product_url?: string;
}

function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function generateAmazonSearchUrl(title: string): string {
  const encoded = encodeURIComponent(title.slice(0, 100));
  return `https://www.amazon.com/s?k=${encoded}`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const products: CsvProductInput[] = Array.isArray(body?.products) ? body.products : [];

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: "No products provided. Send { products: [...] }" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const runDate = new Date().toISOString().slice(0, 10);

    // Check for existing normalized titles to avoid duplicates
    const { data: existingProducts, error: existingError } = await supabase
      .from("products")
      .select("normalized_title, product_url")
      .eq("rule_name", CSV_IMPORT_RULE)
      .not("normalized_title", "is", null);

    if (existingError) {
      return NextResponse.json(
        { success: false, error: existingError.message },
        { status: 500 }
      );
    }

    const existingTitles = new Set(
      (existingProducts ?? [])
        .map((row: { normalized_title: string | null }) => row.normalized_title)
        .filter((value: string | null): value is string => Boolean(value))
    );

    const existingUrls = new Set(
      (existingProducts ?? []).map((row: { product_url: string }) => row.product_url)
    );

    const rows: Array<{
      rule_name: string;
      title: string;
      description: string;
      image_url: string | null;
      price: number | null;
      currency: string;
      product_url: string;
      source_domain: string;
      normalized_title: string;
      run_date: string;
      discovered_at: string;
    }> = [];

    const skipped: string[] = [];
    const seenTitlesThisRun = new Set<string>();
    const seenUrlsThisRun = new Set<string>();

    for (const item of products) {
      if (!item.title || !item.title.trim()) {
        skipped.push("Missing title");
        continue;
      }

      const title = item.title.trim();
      const normalizedTitle = normalizeTitle(title);

      if (existingTitles.has(normalizedTitle) || seenTitlesThisRun.has(normalizedTitle)) {
        skipped.push(`Duplicate: ${title.slice(0, 50)}`);
        continue;
      }

      const productUrl = item.product_url?.trim() || generateAmazonSearchUrl(title);

      if (existingUrls.has(productUrl) || seenUrlsThisRun.has(productUrl)) {
        skipped.push(`Duplicate URL: ${title.slice(0, 50)}`);
        continue;
      }

      seenTitlesThisRun.add(normalizedTitle);
      seenUrlsThisRun.add(productUrl);

      rows.push({
        rule_name: CSV_IMPORT_RULE,
        title,
        description: (item.description || "").trim(),
        image_url: item.image_url?.trim() || null,
        price: parsePrice(item.price),
        currency: "USD",
        product_url: productUrl,
        source_domain: "amazon.com",
        normalized_title: normalizedTitle,
        run_date: runDate,
        discovered_at: new Date().toISOString(),
      });
    }

    let productsStored = 0;

    if (rows.length > 0) {
      const { data, error } = await supabase
        .from("products")
        .upsert(rows, { onConflict: "product_url,run_date", ignoreDuplicates: true })
        .select("id, title, normalized_title");

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      productsStored = data?.length ?? 0;
    }

    return NextResponse.json({
      success: true,
      totalReceived: products.length,
      productsStored,
      skippedDuplicates: skipped.length,
      skipDetails: skipped.slice(0, 20),
      ruleName: CSV_IMPORT_RULE,
      runDate,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}