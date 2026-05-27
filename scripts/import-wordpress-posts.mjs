import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const occRoot = path.resolve(__dirname, "..");
const nerdyRoot = path.resolve(occRoot, "..", "NerdyMugs-The-Machine");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const importedPostsPath = path.join(nerdyRoot, "app", "imported-posts.json");
const redirectsPath = path.join(nerdyRoot, "app", "redirects.json");

const importedPosts = JSON.parse(fs.readFileSync(importedPostsPath, "utf8"));
const redirects = JSON.parse(fs.readFileSync(redirectsPath, "utf8"));

const redirectByLegacyId = new Map(
  redirects
    .map((entry) => {
      const match = String(entry.destination || "").match(/\/post\/(.+)$/);
      return match ? [match[1], entry.source] : null;
    })
    .filter(Boolean)
);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9\s/-]/g, "")
    .trim()
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeText(value, fallback = "") {
  return String(value || fallback).trim();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveLegacyPath(record) {
  return redirectByLegacyId.get(record.id) || null;
}

function deriveSlug(record, legacyPath) {
  if (legacyPath) {
    const trimmed = legacyPath.replace(/^\/+|\/+$/g, "");
    const lastSegment = trimmed.split("/").filter(Boolean).pop();
    if (lastSegment) return slugify(lastSegment);
  }

  const titleSlug = slugify(record.title);
  if (titleSlug) return titleSlug;
  return `legacy-${record.id}`;
}

function derivePublishedAt(record) {
  const ts = Number(record.publishedAt);
  if (Number.isFinite(ts) && ts > 0) {
    return new Date(ts).toISOString();
  }
  return new Date().toISOString();
}

function deriveRunDate(iso) {
  return iso.slice(0, 10);
}

function deriveDescription(record) {
  return normalizeText(record.content);
}

function deriveExcerpt(record) {
  const text = stripHtml(record.content);
  return text.length > 280 ? `${text.slice(0, 277)}...` : text || normalizeText(record.title);
}

function deriveProductUrl(record) {
  return normalizeText(record.amazonUrl, `https://nerdymugs.com${deriveLegacyPath(record) || "/"}`);
}

function deriveImageUrl(record) {
  const value = normalizeText(record.imageUrl);
  return value || null;
}

const usableRecords = importedPosts.filter((record) => normalizeText(record.title) && normalizeText(record.content));

const summary = {
  usableRecords: usableRecords.length,
  importedProducts: 0,
  importedPosts: 0,
  skipped: importedPosts.length - usableRecords.length,
};

for (const record of usableRecords) {
  const legacyPath = deriveLegacyPath(record);
  const slug = deriveSlug(record, legacyPath);
  const publishedAt = derivePublishedAt(record);
  const runDate = deriveRunDate(publishedAt);
  const productUrl = deriveProductUrl(record);
  const title = normalizeText(record.title);
  const description = deriveDescription(record);
  const normalizedTitle = slugify(title).replace(/-/g, " ");

  const productRow = {
    rule_name: "legacy-wordpress",
    title,
    description,
    image_url: deriveImageUrl(record),
    price: null,
    currency: null,
    product_url: productUrl,
    source_domain: productUrl.includes("amazon.com") ? "amazon.com" : "legacy-import",
    normalized_title: normalizedTitle || title.toLowerCase(),
    discovered_at: publishedAt,
    run_date: runDate,
  };

  const { data: productData, error: productError } = await supabase
    .from("products")
    .upsert(productRow, { onConflict: "product_url,run_date", ignoreDuplicates: false })
    .select("id")
    .limit(1);

  if (productError) {
    throw new Error(`Product import failed for '${title}': ${productError.message}`);
  }

  const productId = productData?.[0]?.id;
  if (!productId) {
    throw new Error(`No product id returned for '${title}'`);
  }

  summary.importedProducts += 1;

  const postRow = {
    product_id: productId,
    rule_name: "legacy-wordpress",
    product_title: title,
    product_url: productUrl,
    title,
    slug,
    excerpt: deriveExcerpt(record),
    body_md: description || title,
    status: "published",
    published_at: publishedAt,
    scheduled_for: null,
    legacy_source_url: legacyPath ? `https://nerdymugs.com${legacyPath}` : null,
    legacy_source_path: legacyPath,
    content_source: "wordpress-import",
    run_date: runDate,
  };

  const { error: postError } = await supabase
    .from("posts")
    .upsert(postRow, { onConflict: "product_id", ignoreDuplicates: false });

  if (postError) {
    throw new Error(`Post import failed for '${title}': ${postError.message}`);
  }

  summary.importedPosts += 1;
}

console.log(JSON.stringify(summary, null, 2));