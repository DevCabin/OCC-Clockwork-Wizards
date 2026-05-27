import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import {
  loadWordPressArtifactsFromUrls,
  runWordPressImport,
  type LegacyImportRecord,
  type LegacyRedirectRecord,
} from "@/lib/wordpressImport";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isLegacyImportRecordArray(value: unknown): value is LegacyImportRecord[] {
  return Array.isArray(value);
}

function isLegacyRedirectRecordArray(value: unknown): value is LegacyRedirectRecord[] {
  return Array.isArray(value);
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function getDefaultArtifactUrl(filename: string) {
  const base = process.env.WORDPRESS_IMPORT_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/$/, "")}/${filename}`;
  }

  return `https://raw.githubusercontent.com/DevCabin/NerdyMugs-The-Machine/main/app/${filename}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const includeEditorial = body?.includeEditorial === true;
  const bodyImportedPosts = isLegacyImportRecordArray(body?.importedPosts) ? body.importedPosts : null;
  const bodyRedirects = isLegacyRedirectRecordArray(body?.redirects) ? body.redirects : null;
  const importedPostsUrl = typeof body?.importedPostsUrl === "string" && body.importedPostsUrl.trim()
    ? body.importedPostsUrl.trim()
    : getDefaultArtifactUrl("imported-posts.json");
  const redirectsUrl = typeof body?.redirectsUrl === "string" && body.redirectsUrl.trim()
    ? body.redirectsUrl.trim()
    : getDefaultArtifactUrl("redirects.json");

  try {
    const artifactSource = bodyImportedPosts && bodyRedirects ? "request-body" : "remote-urls";
    const { importedPosts, redirects } =
      artifactSource === "request-body"
        ? {
            importedPosts: bodyImportedPosts,
            redirects: bodyRedirects,
          }
        : await loadWordPressArtifactsFromUrls(importedPostsUrl, redirectsUrl);

    const summary = await runWordPressImport({
      importedPosts,
      redirects,
      supabase: dryRun ? null : (getSupabaseClient() as never),
      dryRun,
      includeEditorial,
    });

    return NextResponse.json({
      success: true,
      source: {
        type: artifactSource,
        importedPostsUrl: artifactSource === "remote-urls" ? importedPostsUrl : null,
        redirectsUrl: artifactSource === "remote-urls" ? redirectsUrl : null,
        importedPostsCount: importedPosts.length,
        redirectsCount: redirects.length,
      },
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}