# Changelog

## 2026-05-26

- Added `OCC_WEEKLY_INVENTORY_REDESIGN_PLAN_2026-05-26.md` documenting the backend redesign toward batch-prepared inventory, explicit content lifecycle states, Amazon-only round 1 ingestion, strict title-match dedupe, and the proposed phases for weekly inventory preparation.
- Added `OCC_IMPLEMENTATION_EXECUTION_PLAN_PHASE1_2026-05-26.md` with the step-by-step execution plan for the first OCC implementation phase.
- Bumped OCC package version from `1.0.0` to `1.0.1` to checkpoint the reset-planning baseline before implementation.

## 2026-04-16

- Converted product discovery rule from `retro-sci-fi-shirts` to `nerdy-mugs` (mugs/coffee cups on Amazon + Etsy).
- Updated discovery keywords: `funny mug`, `nerdy mug`, `geek coffee mug`, `sci fi mug`, `programmer mug`, `funny coffee cup`.
- Removed shirt-specific assumptions from `lib/openai.ts` scoring and post generation prompts.
- Increased `dailyCount` from 3 to 10 — pipeline now stores top 10 products per daily run.
- Added `RuleConfig` TypeScript interface to `lib/products.ts` — rule config is now clearly typed and commented for easy editing.
- Added `GET /api/products/trending` endpoint — returns products from the last 7 days, sorted by recency. TODO: re-sort by persisted relevance score once `score` column is added to the `products` table.
- Fixed Firecrawl extraction: Firecrawl's built-in LLM `extract` was silently failing on Amazon search pages. Added dual-format request (`markdown` + `extract`) with OpenAI markdown parsing fallback in `lib/firecrawl.ts`. Added `extractProductsFromMarkdown()` to `lib/openai.ts`.
- Added `export const maxDuration = 300` to both job routes (`daily-products`, `daily-posts`) to explicitly declare 300s Vercel function timeout (requires Pro plan).
- Cleared old `retro-sci-fi-shirts` data from Supabase and ran a full end-to-end test: 2 mug products discovered and stored, 2 AI posts generated. Pipeline confirmed working for `nerdy-mugs` rule.
- Fixed Next.js fetch cache stale data bug: `lib/supabase.ts` now passes `cache: "no-store"` to the global fetch override in the Supabase client, preventing Next.js from serving cached Supabase query responses across requests. All endpoints (`/api/products/latest`, `/api/products/recent`, `/api/products/trending`, `/api/posts/recent`) now return live data on every request.

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