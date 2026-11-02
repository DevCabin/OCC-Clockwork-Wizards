import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/publicPosts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function baseUrl(): string {
  const explicit = process.env.SELF_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://app-liart-five-43.vercel.app";
}

async function callJob(path: string, body: Record<string, unknown>): Promise<{
  name: string;
  status: number | string;
  ok: boolean;
  body: string;
}> {
  const secret = process.env.CRON_SECRET;
  const name = path.split("/").pop() || path;
  if (!secret) return { name, status: "no-secret", ok: false, body: "" };
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
    const text = await res.text();
    return { name, status: res.status, ok: res.ok, body: text.slice(0, 400) };
  } catch (error) {
    return { name, status: "error", ok: false, body: String(error).slice(0, 200) };
  }
}

async function runOrchestrator(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const weekday = new Date().getUTCDay(); // 0=Sun ... 6=Sat
  const jobs: Array<{ path: string; body: Record<string, unknown> }> = [];

  // Always run first (quick): keep images ready for scheduled releases.
  jobs.push({ path: "/api/jobs/prepare-scheduled-post-images", body: {} });

  // Day-specific heavy job last (so the quick prep always completes first).
  let scheduled = "prepare-images-only";
  if (weekday === 5) {
    jobs.push({ path: "/api/jobs/dedupe-inventory", body: { dryRun: false } });
    scheduled = "dedupe";
  } else if (weekday === 6) {
    jobs.push({ path: "/api/jobs/weekly-discovery", body: {} });
    scheduled = "discovery";
  } else if (weekday === 1) {
    jobs.push({ path: "/api/jobs/generate-weekly-posts", body: { stagger: true, liveCount: 3, spacingDays: 1 } });
    scheduled = "generation";
  }

  const results = [];
  for (const job of jobs) {
    results.push(await callJob(job.path, job.body));
  }

  return NextResponse.json({
    success: true,
    utcWeekday: weekday,
    scheduled,
    results,
  });
}

// Vercel Cron invokes with GET (daily, once/day — Hobby-safe). POST allowed for manual runs.
export async function GET(req: NextRequest) {
  return runOrchestrator(req);
}

export async function POST(req: NextRequest) {
  return runOrchestrator(req);
}
