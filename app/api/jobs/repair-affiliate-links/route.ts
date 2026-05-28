import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AFFILIATE_TAG = "georgwebsi-20";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;

  try {
    const supabase = getSupabaseClient();

    // Step 1: Load source data from local mapping file
    const sourceData = require("@/lib/amazon-url-mappings.json");

    // Step 2: Query all legacy WordPress posts
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, title, slug, product_url, content_source, product_id")
      .eq("content_source", "wordpress-import");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Step 3: Build lookup map
    const sourceMap = new Map();
    sourceData.forEach((item: any) => {
      if (item.title && item.amazonUrl) {
        const normalizedTitle = item.title.trim().toLowerCase();
        sourceMap.set(normalizedTitle, item.amazonUrl);
      }
    });

    // Step 4: Identify posts that need repair
    const needsRepair = [];
    const repairedWithFallback = [];
    const alreadyGood = [];
    const noSourceUrl = []; // Posts without nerdymugs.com link (shouldn't happen often)

    for (const post of posts) {
      const normalizedTitle = post.title.trim().toLowerCase();
      const sourceUrl = sourceMap.get(normalizedTitle);

      if (post.product_url && post.product_url.includes("nerdymugs.com")) {
        if (sourceUrl && sourceUrl.includes("amazon")) {
          // Found a proper Amazon URL in the mapping file
          needsRepair.push({
            id: post.id,
            title: post.title,
            slug: post.slug,
            currentUrl: post.product_url,
            newUrl: sourceUrl,
            product_id: post.product_id,
          });
        } else {
          // No proper Amazon URL found — use fallback search URL
          const titleEncoded = encodeURIComponent(post.title.trim());
          const fallbackUrl = `https://www.amazon.com/s?k=${titleEncoded}&tag=${AFFILIATE_TAG}`;

          repairedWithFallback.push({
            id: post.id,
            title: post.title,
            slug: post.slug,
            currentUrl: post.product_url,
            newUrl: fallbackUrl,
            product_id: post.product_id,
          });
        }
      } else if (post.product_url && post.product_url.includes("amazon")) {
        alreadyGood.push(post.title);
      } else {
        // Not nerdymugs.com and not amazon.com
        noSourceUrl.push({
          title: post.title,
          currentUrl: post.product_url,
        });
      }
    }

    // Step 5: Execute repairs
    let successCount = 0;
    let fallbackSuccessCount = 0;
    let failCount = 0;
    let fallbackFailCount = 0;

    if (!dryRun && (needsRepair.length > 0 || repairedWithFallback.length > 0)) {
      // Repair from mappings file
      for (const repair of needsRepair) {
        const { error: postError } = await supabase
          .from("posts")
          .update({ product_url: repair.newUrl })
          .eq("id", repair.id);

        if (postError) {
          failCount++;
          continue;
        }

        if (repair.product_id) {
          await supabase
            .from("products")
            .update({ product_url: repair.newUrl })
            .eq("id", repair.product_id);
        }

        successCount++;
      }

      // Repair with fallback Amazon search URLs
      for (const repair of repairedWithFallback) {
        const { error: postError } = await supabase
          .from("posts")
          .update({ product_url: repair.newUrl })
          .eq("id", repair.id);

        if (postError) {
          fallbackFailCount++;
          continue;
        }

        if (repair.product_id) {
          await supabase
            .from("products")
            .update({ product_url: repair.newUrl })
            .eq("id", repair.product_id);
        }

        fallbackSuccessCount++;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalPosts: posts.length,
        alreadyGood: alreadyGood.length,
        repairedFromMapping: dryRun ? needsRepair.length : successCount,
        repairedWithFallback: dryRun ? repairedWithFallback.length : fallbackSuccessCount,
        failed: failCount + fallbackFailCount,
        totalBadPosts: needsRepair.length + repairedWithFallback.length,
      },
      examples: {
        repairedFromMapping: needsRepair.slice(0, 5).map((r) => ({
          title: r.title,
          from: r.currentUrl,
          to: r.newUrl,
        })),
        repairedWithFallback: repairedWithFallback.slice(0, 5).map((r) => ({
          title: r.title,
          from: r.currentUrl,
          to: r.newUrl,
        })),
        other: noSourceUrl.slice(0, 3),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
