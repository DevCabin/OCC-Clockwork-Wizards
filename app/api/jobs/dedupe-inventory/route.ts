import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface ProductRow {
  id: string;
  title: string;
  normalized_title: string | null;
  product_url: string;
  image_url: string | null;
  run_date: string;
  created_at: string;
  rule_name: string;
}

interface PostRow {
  id: string;
  product_id: string;
  status: string;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  content_source: string | null;
  slug: string;
}

const DEFAULT_PROTECT_SOURCES = ["wordpress-import"];

function extractAsin(url: string): string | null {
  const match = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${host}${pathname}`;
  } catch {
    return url.split("?")[0].split("#")[0].replace(/\/+$/, "");
  }
}

function productKey(product: ProductRow): string | null {
  const asin = extractAsin(product.product_url);
  if (asin) return `asin:${asin}`;
  // Only fall back to URL identity for real product paths (/dp/, /gp/...).
  // Generic Amazon search URLs (e.g. ".../s?k=...") must never be treated as
  // the same product — doing so collapses hundreds of distinct items into one
  // false-duplicate group.
  if (isRealProductUrl(product.product_url)) {
    return `url:${canonicalUrl(product.product_url)}`;
  }
  return null;
}

const MAX_GROUP_SIZE = 25; // Safety: a real duplicate set is never this large.

function usableImage(url: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return !/IMAGE-REMOVED/i.test(trimmed);
}

function isRealProductUrl(url: string): boolean {
  return /\/(dp|gp\/product|gp\/aw\/d)\//i.test(url);
}

function statusWeight(status: string | null | undefined): number {
  if (status === "published") return 5;
  if (status === "ready") return 4;
  return 1;
}

function rankProduct(
  product: ProductRow,
  post: PostRow | undefined,
  protectedPostIds: Set<string>
): number[] {
  const isProtected = post ? protectedPostIds.has(post.id) : false;
  const hasPost = post ? 1 : 0;
  const isPublished = post && post.status === "published" ? 1 : 0;
  const ts = Date.parse(product.created_at || "") || 0;
  return [
    isProtected ? 1 : 0,
    hasPost,
    post ? statusWeight(post.status) : 0,
    isPublished,
    usableImage(product.image_url) ? 1 : 0,
    isRealProductUrl(product.product_url) ? 1 : 0,
    -ts,
  ];
}

function compareRank(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}

async function runDedupe(options: { dryRun: boolean; protectSources: string[] }) {
  const supabase = getSupabaseClient();

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, title, normalized_title, product_url, image_url, run_date, created_at, rule_name");
  if (productsError) throw new Error(productsError.message);

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("id, product_id, status, published_at, scheduled_for, created_at, content_source, slug");
  if (postsError) throw new Error(postsError.message);

  const { data: candidateData } = await supabase
    .from("weekly_product_candidates")
    .select("post_id")
    .not("post_id", "is", null);

  const products = (productsData ?? []) as ProductRow[];
  const posts = (postsData ?? []) as PostRow[];

  const postByProduct = new Map<string, PostRow>();
  for (const post of posts) postByProduct.set(post.product_id, post);

  const protectedPostIds = new Set<string>();
  for (const post of posts) {
    if (post.content_source && options.protectSources.includes(post.content_source)) {
      protectedPostIds.add(post.id);
    }
  }
  for (const row of candidateData ?? []) {
    const pid = (row as { post_id?: string | null }).post_id;
    if (pid) protectedPostIds.add(pid);
  }

  const groups = new Map<string, ProductRow[]>();
  let nonDedupable = 0;
  for (const product of products) {
    const key = productKey(product);
    if (!key) {
      nonDedupable += 1;
      continue;
    }
    const bucket = groups.get(key);
    if (bucket) bucket.push(product);
    else groups.set(key, [product]);
  }

  let skippedLargeGroups = 0;

  const postIdsToDelete = new Set<string>();
  const productIdsToDelete = new Set<string>();
  const plan: Array<{
    key: string;
    keep: { productId: string; title: string; postId: string | null };
    remove: Array<{ productId: string; title: string; postId: string | null; reason: string }>;
  }> = [];

  for (const [key, bucket] of groups.entries()) {
    if (bucket.length <= 1) continue;
    if (bucket.length > MAX_GROUP_SIZE) {
      skippedLargeGroups += 1;
      continue;
    }

    const ranked = bucket
      .map((product) => ({
        product,
        post: postByProduct.get(product.id),
        rank: rankProduct(product, postByProduct.get(product.id), protectedPostIds),
      }))
      .sort((a, b) => compareRank(a.rank, b.rank));

    const winner = ranked[0];
    const remove: Array<{ productId: string; title: string; postId: string | null; reason: string }> = [];

    for (const loser of ranked.slice(1)) {
      const loserPost = loser.post;
      if (loserPost && protectedPostIds.has(loserPost.id)) {
        remove.push({
          productId: loser.product.id,
          title: loser.product.title,
          postId: loserPost.id,
          reason: "skipped-protected",
        });
        continue;
      }
      if (loserPost) postIdsToDelete.add(loserPost.id);
      productIdsToDelete.add(loser.product.id);
      remove.push({
        productId: loser.product.id,
        title: loser.product.title,
        postId: loserPost ? loserPost.id : null,
        reason: "duplicate",
      });
    }

    plan.push({
      key,
      keep: {
        productId: winner.product.id,
        title: winner.product.title,
        postId: winner.post ? winner.post.id : null,
      },
      remove,
    });
  }

  // Remove skipped-protected entries from deletion sets (defensive).
  for (const group of plan) {
    for (const item of group.remove) {
      if (item.reason === "skipped-protected") {
        productIdsToDelete.delete(item.productId);
        if (item.postId) postIdsToDelete.delete(item.postId);
      }
    }
  }

  const removableGroups = plan.filter((group) =>
    group.remove.some((item) => item.reason === "duplicate")
  );
  const skippedProtected = plan.filter(
    (group) =>
      group.remove.length > 0 &&
      group.remove.every((item) => item.reason === "skipped-protected")
  ).length;

  if (!options.dryRun) {
    if (postIdsToDelete.size > 0) {
      const { error } = await supabase
        .from("posts")
        .delete()
        .in("id", Array.from(postIdsToDelete));
      if (error) throw new Error(error.message);
    }
    if (productIdsToDelete.size > 0) {
      const { error } = await supabase
        .from("products")
        .delete()
        .in("id", Array.from(productIdsToDelete));
      if (error) throw new Error(error.message);
    }
  }

  return {
    dryRun: options.dryRun,
    groupsScanned: groups.size,
    duplicateGroups: removableGroups.length,
    postsToDelete: postIdsToDelete.size,
    productsToDelete: productIdsToDelete.size,
    postsDeleted: options.dryRun ? 0 : postIdsToDelete.size,
    productsDeleted: options.dryRun ? 0 : productIdsToDelete.size,
    skippedProtected,
    nonDedupable,
    skippedLargeGroups,
    groups: removableGroups.slice(0, 50),
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const protectSources =
    Array.isArray(body?.protectSources) && body.protectSources.length > 0
      ? (body.protectSources as string[])
      : DEFAULT_PROTECT_SOURCES;

  try {
    const result = await runDedupe({ dryRun, protectSources });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Vercel Cron invokes with GET and runs LIVE (automatic weekly dedupe).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDedupe({ dryRun: false, protectSources: DEFAULT_PROTECT_SOURCES });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

