import { NextRequest, NextResponse } from "next/server";
import { imageNeedsRepair, recoverProductImage } from "@/lib/postImageRecovery";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Joined = {
  id: string;
  title: string;
  product_url: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
};
type Row = { id: string; slug: string; title: string; status: string; products: Joined | Joined[] | null };

function isUsable(v: string | null | undefined): boolean {
  if (!v) return false;
  const t = v.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (/\/images\/I\/\d+[A-Z]+(-|\.|$)/.test(u.pathname)) return false;
    if (/IMAGE-REMOVED/i.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function getProduct(p: Joined | Joined[] | null): Joined | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) || 0 }, async () => {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchRows(supabase: ReturnType<typeof getSupabaseClient>): Promise<Row[]> {
  const pageSize = 1000;
  let start = 0;
  const rows: Row[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, title, status, products(id, title, product_url, description, price, image_url)")
      .in("status", ["ready", "published"])
      .order("created_at", { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < pageSize) break;
    start += pageSize;
  }
  return rows;
}

function clamp(n: unknown, lo: number, hi: number, dflt: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return dflt;
  return Math.min(Math.max(v, lo), hi);
}

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const maxPosts = clamp(body?.maxPosts, 1, 24, 12);
  const concurrency = clamp(body?.concurrency, 1, 10, 6);
  const useHttp = body?.httpCheck === true;

  const supabase = getSupabaseClient();
  const rows = await fetchRows(supabase);

  const remaining = rows.filter((r) => !isUsable(getProduct(r.products)?.image_url ?? null)).length;

  const targets: Array<{ post: Row; product: Joined }> = [];
  for (const r of rows) {
    if (targets.length >= maxPosts) break;
    const prod = getProduct(r.products);
    if (!prod) continue;
    const needs = useHttp ? await imageNeedsRepair(prod.image_url) : !isUsable(prod.image_url);
    if (needs) targets.push({ post: r, product: prod });
  }

  const results = await pool(targets, concurrency, async (t) => {
    try {
      const rec = await recoverProductImage({
        title: t.product.title || t.post.title,
        productUrl: t.product.product_url,
        description: t.product.description,
        price: t.product.price,
      });
      if (!rec) return { slug: t.post.slug, status: "unresolved" as const };
      if (!dryRun) {
        const { error } = await supabase
          .from("products")
          .update({ image_url: rec.imageUrl })
          .eq("id", t.product.id);
        if (error) return { slug: t.post.slug, status: "error" as const, error: error.message };
      }
      return { slug: t.post.slug, status: "recovered" as const, confidence: rec.confidence };
    } catch (e) {
      return { slug: t.post.slug, status: "error" as const, error: String(e).slice(0, 150) };
    }
  });

  const recovered = results.filter((r) => r.status === "recovered");
  const unresolved = results.filter((r) => r.status === "unresolved").map((r) => r.slug);
  const errors = results.filter((r) => r.status === "error");

  return NextResponse.json({
    success: true,
    dryRun,
    totalScanned: rows.length,
    remainingMissingBefore: remaining,
    targetsPicked: targets.length,
    recovered: recovered.length,
    unresolved: unresolved.length,
    errors: errors.length,
    recoveredDetail: recovered.slice(0, 50),
    unresolvedSlugs: unresolved.slice(0, 50),
    errorDetail: errors.slice(0, 20),
  });
}

export async function POST(req: NextRequest) {
  return run(req);
}

export async function GET(req: NextRequest) {
  return run(req);
}
