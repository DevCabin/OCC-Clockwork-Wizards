import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // WordPress import phase is complete - endpoint disabled for security
  return NextResponse.json(
    { 
      success: false, 
      error: "WordPress import is disabled. The legacy import phase has been completed.",
      code: "IMPORT_PHASE_COMPLETE"
    }, 
    { status: 410 }
  );
}

/*
ORIGINAL IMPLEMENTATION - Preserved for reference:

import { getSupabaseClient } from "@/lib/supabase";
import {
  loadWordPressArtifactsFromUrls,
  runWordPressImport,
  type LegacyImportRecord,
  type LegacyRedirectRecord,
} from "@/lib/wordpressImport";

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
  // ... rest of original implementation
}
*/
