# Changelog

## 2026-04-13 (session 3)

- Rewired Vite frontend to consume V1 API instead of broken Amazon PA-API. Frontend moved to its own standalone repo/Vercel project.
- `app/src/lib/amazon.ts` — replaced PA-API proxy calls with V1 `GET /api/products/latest` + `/recent`.
- `app/src/lib/discovery.ts` — replaced client-side search with V1 API fetch; added `triggerV1ProductJob()` / `triggerV1PostJob()`.
- `app/src/lib/contentEngine.ts` — added `fetchV1Posts()` for V1 API post fetch; local template generation retained as fallback.
- Deprecated old PA-API serverless stubs to HTTP 410.
- Removed `amazon-paapi` and `creatorsapi-nodejs-sdk` from frontend package.json.
- `whole-maching-in-progress/` folder removed from this repo — frontend now lives in its own repo.
- Added `V1_ARCHITECTURE.md` — full pipeline documentation, schema, API reference, integration guide, code examples.
- Updated `README.md` — this repo is now documented as the V1 API backend only, no frontend.

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