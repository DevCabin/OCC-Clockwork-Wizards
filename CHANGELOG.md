# Changelog

## 2026-04-13

- Added minimal post-generation pipeline on top of working product ingestion.
- Added `posts` migration (`supabase/migrations/20260413120000_create_posts.sql`).
- Added `POST /api/jobs/daily-posts` and `GET /api/posts/recent`.
- Added OpenAI post generation function with strict JSON schema parsing.
- Updated `vercel.json` to schedule daily posts job after products job.
- Added `CLINE_INSTRUCTIONS.md` with workflow/lab protocol and commit/push rules.