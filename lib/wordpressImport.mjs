import fs from "node:fs";
import path from "node:path";

const EDITORIAL_PATHS = new Set([
  "/about-nerdy-mugs/",
  "/random-mugs/",
  "/uncategorized/main-menu/",
  "/uncategorized/home/",
]);

const EDITORIAL_SLUGS = new Set(["about-nerdy-mugs", "random-mugs", "main-menu", "home"]);

export function loadWordPressArtifactsFromLocal(nerdyRoot) {
  const importedPostsPath = path.join(nerdyRoot, "app", "imported-posts.json");
  const redirectsPath = path.join(nerdyRoot, "app", "redirects.json");

  return {
    importedPosts: JSON.parse(fs.readFileSync(importedPostsPath, "utf8")),
    redirects: JSON.parse(fs.readFileSync(redirectsPath, "utf8")),
  };
}

export async function loadWordPressArtifactsFromUrls(importedPostsUrl, redirectsUrl) {
  const [postsRes, redirectsRes] = await Promise.all([fetch(importedPostsUrl), fetch(redirectsUrl)]);

  if (!postsRes.ok) {
    throw new Error(`Failed to fetch imported-posts.json: ${postsRes.status} ${postsRes.statusText}`);
  }

  if (!redirectsRes.ok) {
    throw new Error(`Failed to fetch redirects.json: ${redirectsRes.status} ${redirectsRes.statusText}`);
  }

  return {
    importedPosts: await postsRes.json(),
    redirects: await redirectsRes.json(),
  };
}

function buildRedirectByLegacyId(redirects) {
  return new Map(
    redirects
      .map((entry) => {
        const match = String(entry.destination || "").match(/\/post\/(.+)$/);
        return match ? [match[1], entry.source] : null;
      })
      .filter(Boolean)
  );
}

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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLegacyContent(value) {
  return String(value || "")
    .replace(/<\/?p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/-->/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveLegacyPath(record, redirectByLegacyId) {
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

function deriveExcerpt(record) {
  const text = stripHtml(record.content);
  return text.length > 280 ? `${text.slice(0, 277)}...` : text || normalizeText(record.title);
}

function deriveProductUrl(record, legacyPath) {
  return normalizeText(record.amazonUrl, `https://nerdymugs.com${legacyPath || "/"}`);
}

function deriveImageUrl(record) {
  const value = normalizeText(record.imageUrl);
  return value || null;
}

function deriveSourceDomain(productUrl) {
  if (!productUrl) return "legacy-import";
  if (productUrl.includes("amazon.com")) return "amazon.com";

  try {
    return new URL(productUrl).hostname.replace(/^www\./, "") || "legacy-import";
  } catch {
    return "legacy-import";
  }
}

function classifyRecord(record, redirectByLegacyId, includeEditorial) {
  const title = normalizeText(record.title);
  const content = cleanLegacyContent(record.content);
  const amazonUrl = normalizeText(record.amazonUrl);
  const imageUrl = normalizeText(record.imageUrl);
  const legacyPath = deriveLegacyPath(record, redirectByLegacyId);
  const baseSlug = deriveSlug(record, legacyPath);

  if (!title) {
    return { usable: false, reason: "missing_title", title, content, amazonUrl, imageUrl, legacyPath, baseSlug };
  }

  if (!content && !amazonUrl && !imageUrl) {
    return { usable: false, reason: "missing_content_and_media", title, content, amazonUrl, imageUrl, legacyPath, baseSlug };
  }

  const isEditorial = Boolean((legacyPath && EDITORIAL_PATHS.has(legacyPath)) || EDITORIAL_SLUGS.has(baseSlug));

  if (isEditorial && !includeEditorial) {
    return { usable: false, reason: "editorial_excluded", title, content, amazonUrl, imageUrl, legacyPath, baseSlug };
  }

  if (!content && !amazonUrl) {
    return { usable: false, reason: "missing_content_and_amazon_url", title, content, amazonUrl, imageUrl, legacyPath, baseSlug };
  }

  return {
    usable: true,
    reason: isEditorial ? "editorial_included" : "product_post",
    title,
    content,
    amazonUrl,
    imageUrl,
    legacyPath,
    baseSlug,
    isEditorial,
  };
}

function buildUniqueSlug(baseSlug, recordId, slugCounts) {
  const count = (slugCounts.get(baseSlug) || 0) + 1;
  slugCounts.set(baseSlug, count);
  if (count === 1) return baseSlug;
  return `${baseSlug}-${String(recordId).slice(-6)}`;
}

function makeSummary(totalRecords, dryRun, includeEditorial) {
  return {
    dryRun,
    includeEditorial,
    totalRecords,
    usableRecords: 0,
    importedProducts: 0,
    importedPosts: 0,
    skipped: 0,
    skipReasons: {},
    slugCollisionsResolved: 0,
    missingAmazonUrl: 0,
    missingImageUrl: 0,
    editorialIncluded: 0,
    examples: {
      skipped: [],
      imported: [],
    },
  };
}

export async function runWordPressImport(options) {
  const dryRun = options.dryRun ?? false;
  const includeEditorial = options.includeEditorial ?? false;
  const redirectByLegacyId = buildRedirectByLegacyId(options.redirects);
  const summary = makeSummary(options.importedPosts.length, dryRun, includeEditorial);
  const slugCounts = new Map();

  if (!dryRun && !options.supabase) {
    throw new Error("Supabase client is required for non-dry-run imports.");
  }

  for (const record of options.importedPosts) {
    const classified = classifyRecord(record, redirectByLegacyId, includeEditorial);

    if (!classified.usable) {
      summary.skipped += 1;
      summary.skipReasons[classified.reason] = (summary.skipReasons[classified.reason] || 0) + 1;
      if (summary.examples.skipped.length < 12) {
        summary.examples.skipped.push({
          id: record.id,
          title: classified.title,
          legacyPath: classified.legacyPath,
          reason: classified.reason,
        });
      }
      continue;
    }

    summary.usableRecords += 1;
    if (!classified.amazonUrl) summary.missingAmazonUrl += 1;
    if (!classified.imageUrl) summary.missingImageUrl += 1;
    if (classified.isEditorial) summary.editorialIncluded += 1;

    const slug = buildUniqueSlug(classified.baseSlug, record.id, slugCounts);
    if (slug !== classified.baseSlug) {
      summary.slugCollisionsResolved += 1;
    }

    const publishedAt = derivePublishedAt(record);
    const runDate = deriveRunDate(publishedAt);
    const productUrl = deriveProductUrl(record, classified.legacyPath);
    const title = classified.title;
    const description = classified.content;
    const normalizedTitle = slugify(title).replace(/-/g, " ");

    const productRow = {
      rule_name: "legacy-wordpress",
      title,
      description,
      image_url: deriveImageUrl(record),
      price: null,
      currency: null,
      product_url: productUrl,
      source_domain: deriveSourceDomain(productUrl),
      normalized_title: normalizedTitle || title.toLowerCase(),
      discovered_at: publishedAt,
      run_date: runDate,
    };

    let productId = `dry-run-product-${record.id}`;

    if (!dryRun) {
      const { data: productData, error: productError } = await options.supabase
        .from("products")
        .upsert(productRow, { onConflict: "product_url,run_date", ignoreDuplicates: false })
        .select("id")
        .limit(1);

      if (productError) {
        throw new Error(`Product import failed for '${title}': ${productError.message}`);
      }

      const returnedProductId = productData?.[0]?.id;
      if (!returnedProductId) {
        throw new Error(`No product id returned for '${title}'`);
      }
      productId = returnedProductId;
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
      legacy_source_url: classified.legacyPath ? `https://nerdymugs.com${classified.legacyPath}` : null,
      legacy_source_path: classified.legacyPath,
      content_source: "wordpress-import",
      run_date: runDate,
    };

    if (!dryRun) {
      const { data: existingBySlug, error: existingBySlugError } = await options.supabase
        .from("posts")
        .select("id, product_id, slug, legacy_source_path")
        .eq("slug", slug)
        .limit(1);

      if (existingBySlugError) {
        throw new Error(`Slug lookup failed for '${title}': ${existingBySlugError.message}`);
      }

      const existingPost = existingBySlug?.[0];
      const onConflict = existingPost ? "slug" : "product_id";

      const { error: postError } = await options.supabase
        .from("posts")
        .upsert(postRow, { onConflict, ignoreDuplicates: false })
        .select("id")
        .limit(1);

      if (postError) {
        throw new Error(`Post import failed for '${title}': ${postError.message}`);
      }
    }

    summary.importedPosts += 1;

    if (summary.examples.imported.length < 12) {
      summary.examples.imported.push({
        id: record.id,
        title,
        slug,
        legacyPath: classified.legacyPath,
        hasAmazonUrl: Boolean(classified.amazonUrl),
        hasImageUrl: Boolean(classified.imageUrl),
        isEditorial: Boolean(classified.isEditorial),
      });
    }
  }

  return summary;
}