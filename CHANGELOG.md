# Changelog

## 2026-04-13 (session 2)

- Committed and pushed full V1 Next.js codebase to GitHub (was previously local-only).
- Vercel auto-deployed from `main` — live site confirmed working at `app-liart-five-43.vercel.app`.
- Verified live endpoints:
  - `GET /api/products/latest` — returns 3 real products from Supabase.
  - `GET /api/posts/recent` — returns 3 generated markdown posts from Supabase.
- V1 pipeline fully operational in production.

## 2026-04-13

- Added minimal post-generation pipeline on top of working product ingestion.
- Added `posts` migration (`supabase/migrations/20260413120000_create_posts.sql`).
- Added `POST /api/jobs/daily-posts` and `GET /api/posts/recent`.
- Added OpenAI post generation function with strict JSON schema parsing.
- Updated `vercel.json` to schedule daily posts job after products job.
- Added `CLINE_INSTRUCTIONS.md` with workflow/lab protocol and commit/push rules.