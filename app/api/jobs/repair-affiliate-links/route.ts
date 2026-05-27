import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

    // Step 1: Load source data
    const sourceDataUrl = 'https://raw.githubusercontent.com/DevCabin/NerdyMugs-The-Machine/main/app/imported-posts.json';
    
    const response = await fetch(sourceDataUrl);
    const sourceData = await response.json();

    // Step 2: Query all legacy WordPress posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, slug, product_url, content_source, product_id')
      .eq('content_source', 'wordpress-import');

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
    const alreadyGood = [];
    const noSourceUrl = [];

    for (const post of posts) {
      const normalizedTitle = post.title.trim().toLowerCase();
      const sourceUrl = sourceMap.get(normalizedTitle);

      if (post.product_url && post.product_url.includes('nerdymugs.com')) {
        if (sourceUrl && sourceUrl.includes('amazon')) {
          needsRepair.push({
            id: post.id,
            title: post.title,
            slug: post.slug,
            currentUrl: post.product_url,
            newUrl: sourceUrl,
            product_id: post.product_id
          });
        } else {
          noSourceUrl.push({
            title: post.title,
            currentUrl: post.product_url
          });
        }
      } else if (post.product_url && post.product_url.includes('amazon')) {
        alreadyGood.push(post.title);
      }
    }

    // Step 5: Execute repairs
    let successCount = 0;
    let failCount = 0;

    if (!dryRun && needsRepair.length > 0) {
      for (const repair of needsRepair) {
        const { error: postError } = await supabase
          .from('posts')
          .update({ product_url: repair.newUrl })
          .eq('id', repair.id);

        if (postError) {
          failCount++;
          continue;
        }

        if (repair.product_id) {
          await supabase
            .from('products')
            .update({ product_url: repair.newUrl })
            .eq('id', repair.product_id);
        }

        successCount++;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalPosts: posts.length,
        alreadyGood: alreadyGood.length,
        wouldRepair: needsRepair.length,
        actuallyRepaired: dryRun ? 0 : successCount,
        failed: failCount,
        needsManual: noSourceUrl.length
      },
      examples: {
        repaired: needsRepair.slice(0, 5).map(r => ({
          title: r.title,
          from: r.currentUrl,
          to: r.newUrl
        })),
        needsManual: noSourceUrl.slice(0, 5)
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
