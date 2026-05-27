import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadWordPressArtifactsFromLocal, runWordPressImport } from "../lib/wordpressImport.mjs";

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const includeEditorial = args.has("--include-editorial");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const occRoot = path.resolve(__dirname, "..");
const nerdyRoot = path.resolve(occRoot, "..", "NerdyMugs-The-Machine");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!isDryRun && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = isDryRun
  ? null
  : createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

const { importedPosts, redirects } = loadWordPressArtifactsFromLocal(nerdyRoot);
const summary = await runWordPressImport({
  importedPosts,
  redirects,
  supabase,
  dryRun: isDryRun,
  includeEditorial,
});

console.log(JSON.stringify(summary, null, 2));