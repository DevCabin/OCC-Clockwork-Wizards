# DEVELOPERS.md — Onboarding Guide

> **Audience:** a junior developer joining the NerdyMugs project.
> **Author's note (senior dev):** Read this top to bottom once, then keep it as a reference — each section maps to real code. If this doc disagrees with the code, the code wins; open a PR to fix the doc.

---

## 1. What this project is

NerdyMugs is an **affiliate coffee-mug website**. It publishes short "spotlight" posts for nerd-themed mugs, each linking to an Amazon product via affiliate tag `georgwebsi-20`. If a visitor buys, we earn a commission.

It is built as **two apps (two Git repos) plus a shared database**:

| App | Repo | Role | Live |
|---|---|---|---|
| **App 1 — OCC Clockwork Wizards** | `DevCabin/OCC-Clockwork-Wizards` | Backend content engine: discover → score → generate → store → API | `https://app-liart-five-43.vercel.app` |
| **App 2 — NerdyMugs-The-Machine** | `DevCabin/NerdyMugs-The-Machine` | Public website (React/Vite) + `/admin` UI + static SEO build | `https://www.nerdymugs.com` |
| **Database** | Supabase (Postgres) | Single source of truth for products/posts/rules/candidates | — |

**The rule that explains everything:** *If content is not prepared and stored in OCC (and thus in Supabase), it does not exist on the site.* The frontend never invents content; it only renders what the backend exposes.

```
              ┌───────────────────────────────────────────────┐
              │            Supabase (Postgres)                 │
              │ products · posts · weekly_discovery_rules      │
              │ weekly_product_candidates · content_gen_runs   │
              └──────────────▲────────────────┬───────────────┘
       writes                    │                │  reads public,
   (discover/score/             │                │  image-having,
    generate/publish)           │                │  date-eligible posts
                 ┌──────────────┴───────┐        ▼
                 │  APP 1 — OCC (Next)   │   ┌─────────────────────────┐
                 │ Firecrawl + OpenAI   │   │ APP 2 — NerdyMugs (Vite) │
                 │ Vercel cron (daily)  │   │ grid + detail + admin    │
                 └──────────┬───────────┘   │ static SEO build         │
       public JSON API ─────┘───────────────▶└───────────┬─────────────┘
       /api/posts/ready, /api/posts/[slug]               │
                                                          ▼
                                                Visitors → Amazon (affiliate)
```

---

## 2. How the two apps talk to each other

- **App 2 only calls App 1's PUBLIC read endpoints** — never protected jobs, never Supabase directly for content:
  - `GET /api/posts/ready?limit=N` → grid of currently-public posts.
  - `GET /api/posts/[slug]` → one post's detail.
- **App 1 owns `CRON_SECRET`** and all operational jobs. That secret **never** ships to the browser.
- The `/admin` UI in App 2 talks to App 1's **admin endpoints** with a **password** (stored in OCC `admin_settings`). Job triggers run server-side/scripts, not in the browser bundle.

If you remember one thing: **App 2 is a dumb renderer + SEO builder. All intelligence lives in App 1.**

## 3. The data model (Supabase)

Learn these tables; they are the heart of the system.

### `products` — one row per discovered product
`id`, `title`, `normalized_title`, `description`, `image_url`, `price`, `currency`, `product_url`, `affiliate_url`, `source_domain`, `rule_name`, `run_date`, `discovered_at`, `created_at`.
- `normalized_title` = lowercase/whitespace-collapsed title, used for de-dup.
- Unique constraint `(product_url, run_date)` — the same product on a new day can create a new row (why we run a dedupe job; §4).

### `posts` — one row per generated article
`id`, `product_id` (FK → products, `ON DELETE CASCADE`), `rule_name`, `product_title`, `product_url`, `title`, `slug` (unique), `excerpt`, `body_md`, `status`, `published_at`, `scheduled_for`, `run_date`, `legacy_source_url`, `legacy_source_path`, `content_source`, `created_at`.
- **`status`:** `ready` | `published` | `needs_review` | `rejected`.
- **Public visibility rule** (enforced in the API, not the frontend):
  - `status = 'published'`, **or**
  - `status = 'ready'` **and** (`scheduled_for` null **or** `<= now()`),
  - **and** the linked product has a non-empty `image_url`.
- `scheduled_for` is how we **stagger** releases (a future timestamp hides the post until then).

### `weekly_discovery_rules` — what to look for (you configure this)
`id`, `name`, `category`, `allocation_percent`, `tags[]`, `search_terms[]`, `max_candidates`, `min_score`, `is_active`, `notes`, timestamps.
- `min_score` is your **quality bar**: candidates ≥ it auto-publish (no human approval needed).

### `weekly_product_candidates` — the weekend "haul" before it becomes posts
`id`, `week_start_date`, `rule_id`, `category`, `tags[]`, `search_query`, `product_title`, `price`, `description`, `product_url`, `affiliate_url`, `image_url`, `source`, `raw_payload`, `extraction_model`, `discovery_score`, `status`, `error_message`, `post_id`, timestamps.
- **`status`:** `discovered → needs_review → approved → rejected → drafted → published → error` (+ `needs_image`).
- Each candidate becomes at most one post (`post_id` links them).

### `content_generation_runs` — audit log per generation run
`id`, `week_start_date`, `status` (`pending/running/completed/failed/partial`), `started_at`, `finished_at`, `summary` (jsonb counts + post_ids), `error_message`.

### `admin_settings` — the `/admin` gate
Single row holding the admin password. Change it in Supabase, not in code.

## 4. The weekly autonomous loop (the main engine)

Everything below is triggered by **ONE** Vercel cron so we stay within free-tier limits:

```json
// OCC vercel.json
{ "crons": [ { "path": "/api/cron/orchestrator", "schedule": "0 13 * * *" } ] }
```

`/api/cron/orchestrator` runs **daily at 13:00 UTC**. It checks the UTC weekday and calls the right job(s) by POSTing to them with the `CRON_SECRET`:

| UTC day | What the orchestrator runs | Purpose |
|---|---|---|
| **Fri** | `POST /api/jobs/dedupe-inventory` `{dryRun:false}` | Collapse duplicates |
| **Sat** | `POST /api/jobs/weekly-discovery` | **Scraper + scorer** |
| **Mon** | `POST /api/jobs/generate-weekly-posts` `{stagger:true,liveCount:3,spacingDays:1}` | **The poster** |
| **every day** | `POST /api/jobs/prepare-scheduled-post-images` | Keep upcoming images ready |

> Note: Vercel Cron calls endpoints with **GET**, which is why every job route exports a `GET` handler (it reuses the POST logic, still `CRON_SECRET`-guarded). The orchestrator itself is `GET`+`POST`.

### Saturday — Discovery (scraper + scorer)
`app/api/jobs/weekly-discovery/route.ts`
1. Load `weekly_discovery_rules` where `is_active`.
2. Build Amazon search URLs from `category` + `search_terms`/`tags`.
3. `lib/firecrawl.ts` → scrape each search page (LLM extract, with a markdown→OpenAI fallback).
4. `lib/products.ts` → normalize + keep only allowed domains (amazon.com).
5. **Cross-week/cross-source de-dupe** by **ASIN → canonical URL** against *all* historical products + candidates (so we never re-add something already in inventory).
6. `lib/openai.ts → scoreProductWithOpenAI()` → `{score, isRelevant}` against the rule.
7. Store in `weekly_product_candidates` (`status: discovered`).

### Monday — Generation (the poster)
`app/api/jobs/generate-weekly-posts/route.ts`
1. Load candidates for the current week; **auto-publish if `status='approved'` OR `discovery_score >= rule.min_score`** (no manual approval).
2. Guard: skip candidates with no usable `image_url` → mark `needs_image`.
3. `lib/openai.ts → generatePostForProduct()` → title/slug/excerpt/body_md.
4. Insert a `products` row + a `posts` row (default `status='published'`).
5. Candidate → `drafted`, linked via `post_id`.
6. **Auto-stagger:** keep top `liveCount` (default 3) published now; set the rest to `status='ready'` with `scheduled_for = now + k*spacingDays` (default 1/day). Future-dated posts are hidden by the API until their time.
7. Write a `content_generation_runs` audit row.

### Friday — Dedupe (safety-critical, read §12 first)
`app/api/jobs/dedupe-inventory/route.ts` groups products by **ASIN → real product URL** and keeps one winner per group (prefers one with a published post), deleting the rest. Guards: never delete WordPress-import legacy posts, never delete candidate-referenced posts, never treat generic Amazon **search URLs** as duplicates, and skip any group >25. Manual `POST` = dry-run; the cron `GET` runs live.

---

## 5. The fallback: manual CSV pipeline

When you want total control over what gets published (or for a one-off batch), you can feed products via CSV instead of the auto loop. Same destination (`products`+`posts`), different entry point. Scripts live in **App 2** (`app/scripts/`) and call **App 1** job endpoints:

1. Drop a CSV in `app/public/post-import/` — columns like `Category,Title,Image URL,Price,Short description`.
2. `node scripts/import-csv-products.mjs` → `POST /api/jobs/import-csv-products` → products (`rule_name='csv-import'`), de-duped by `normalized_title` + `product_url`; rejects invalid/synthetic image URLs.
3. `node scripts/bulk-generate-posts.mjs` → `POST /api/jobs/generate-post` per product → OpenAI post (`status:'ready'`).
4. `node scripts/stagger-csv-posts.mjs` → `POST /api/jobs/stagger-csv-posts` → publish N live, schedule the rest weekly.
5. Fix a missing image: `POST /api/jobs/update-product-image` (or `scripts/update-product-images.mjs`).

> ⚠️ CSV products imported without a real `product_url` get an Amazon **search URL** as a stand-in; those can't be ASIN-deduped later. Prefer providing real `/dp/ASIN` URLs.

## 6. API reference (App 1 = OCC)

Base: `https://app-liart-five-43.vercel.app`. **Auth:** operational job endpoints require `Authorization: Bearer <CRON_SECRET>`; admin endpoints require the admin `password` in the request body.

### Public reads (no auth) — what App 2 uses
- `GET /api/posts/ready?limit=N` — currently-public posts (status + schedule + image rules applied). Max 250.
- `GET /api/posts/[slug]` — one post's detail (404 if not yet public/unpublished).
- `GET /api/products/latest` · `/api/products/recent` · `/api/products/trending` — product feeds.

### Protected jobs (Bearer `CRON_SECRET`)
- `POST/GET /api/jobs/weekly-discovery` — Saturday discovery.
- `POST/GET /api/jobs/generate-weekly-posts` — Monday generation (`{maxPosts, stagger, liveCount, spacingDays}`).
- `POST/GET /api/jobs/dedupe-inventory` — dedupe (`{dryRun}`; POST defaults dry-run, GET live).
- `POST/GET /api/jobs/prepare-scheduled-post-images` — daily image prep.
- `POST /api/jobs/import-csv-products` · `generate-post` · `publish-post` · `stagger-csv-posts` · `delete-post` · `update-product-image` — CSV/manual ops.
- `POST /api/posts/mark-published` — mark a post published.
- Legacy: `daily-products`, `daily-posts`, `delete-bad-posts`, `restore-*`, `repair-*` (kept for manual use).

### Admin (password) — powers App 2's `/admin`
- `POST /api/admin/verify-password`
- `GET /api/admin/rules` · `POST /api/admin/rules` · `PATCH/DELETE /api/admin/rules/[id]`
- `GET /api/admin/candidates` · `POST /api/admin/candidates` (approve/reject)
- `POST /api/admin/trigger-discovery` · `trigger-generation`
- `GET /api/admin/candidates/export?week=YYYY-MM-DD` — **CSV export** (Bearer `CRON_SECRET`).

### Orchestrator
- `GET/POST /api/cron/orchestrator` — single daily cron entrypoint (Bearer `CRON_SECRET`).

---

## 7. The frontend (App 2 = NerdyMugs)

Stack: Vite + React + TypeScript + Tailwind (+ shadcn/ui components). Entry `app/src/main.tsx` → `App.tsx`.

- **Routing** is path-based inside `App.tsx` (no router lib): `/admin` → admin; static pages; post detail by slug; otherwise the grid.
- **Grid** fetches `/api/posts/ready?limit=100`; cards link to clean permalinks.
- **Detail** (`components/PostDetail.tsx`) fetches `/api/posts/[slug]`, renders `body_md` (via `lib/formatTextBlob.mjs`), CTA → Amazon with affiliate tag (via `lib/affiliate.ts`).
- **Admin** (`components/AdminPage.tsx` + `ProductManager.tsx`): password gate; tabs Rules / Candidates / Actions (Run Discovery) / Product Manager.
- **Static SEO build:** `scripts/generate-static-pages.mjs` (runs after `vite build`) turns public posts into per-post HTML with meta/OG/Twitter/JSON-LD, plus `sitemap.xml`, `rss.xml`, `robots.txt`. **New posts appear instantly via SPA fallback; redeploy to refresh static HTML/sitemap.**
- **Env (App 2):** `VITE_API_BASE=https://app-liart-five-43.vercel.app`, `VITE_AMAZON_ASSOCIATE_TAG=georgwebsi-20`, `VITE_GA_MEASUREMENT_ID`. **Never** put `CRON_SECRET` here (browser-exposed).

---

## 8. Local development

### App 1 (OCC)
```bash
cd OCC-Clockwork-Wizards
npm install
# create .env.local with:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY, OPENAI_API_KEY, CRON_SECRET
npm run dev        # http://localhost:3000
npm run build      # verify before pushing
npx tsc --noEmit   # type check
```
> Tip: to exercise a job locally, curl your dev server: `curl -X POST http://localhost:3000/api/jobs/dedupe-inventory -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' -d '{"dryRun":true}'`.

### App 2 (NerdyMugs)
```bash
cd NerdyMugs-The-Machine/app
npm install
# .env.local: VITE_API_BASE=... , VITE_AMAZON_ASSOCIATE_TAG=...
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build + static page generation
```

## 9. Secrets & environment variables

**Never commit secrets.** `.env.local` is gitignored (`.env*.local`). Set these in the **Vercel project → Settings → Environment Variables** for production.

| Var (App 1) | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser-safe, but server uses service role) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access (bypasses RLS) — secret |
| `FIRECRAWL_API_KEY` | Scraper for Amazon pages |
| `OPENAI_API_KEY` | Scoring + post generation |
| `CRON_SECRET` | Bearer token that guards every job endpoint (and what Vercel Cron injects) |
| `SELF_BASE_URL` (optional) | Override the orchestrator's self-fetch base URL |

| Var (App 2) | Purpose |
|---|---|
| `VITE_API_BASE` | Points to App 1 (`https://app-liart-five-43.vercel.app`) |
| `VITE_AMAZON_ASSOCIATE_TAG` | `georgwebsi-20` |
| `VITE_GA_MEASUREMENT_ID` | GA4 id |

**Security notes:** App 1's `CRON_SECRET` is what makes Vercel attach `Authorization: Bearer <CRON_SECRET>` to cron calls. Rotate it periodically (old values have appeared in past notes). Never expose it via a `VITE_*` var.

---

## 10. Runbooks (common tasks)

Set once in your shell: `export CRON="Authorization: Bearer $CRON_SECRET"` and `export API=https://app-liart-five-43.vercel.app`.

**Add a discovery rule** — use `/admin` → Rules → Add, or insert into `weekly_discovery_rules` (name, category, tags, max_candidates, min_score, is_active).

**Run discovery now**
```bash
curl -sS -X POST $API/api/jobs/weekly-discovery -H "$CRON" | jq
```

**See this week's candidates / export CSV**
```bash
curl -sS $API/api/admin/candidates | jq '.candidates[].product_title'
curl -sS "$API/api/admin/candidates/export" -H "$CRON" -o candidates.csv
```

**Approve candidates (optional — auto-publish uses min_score)**
```bash
# via admin password
curl -sS -X POST $API/api/admin/candidates -H 'Content-Type: application/json' \
  -d '{"id":"<UUID>","status":"approved","password":"<ADMIN_PW>"}'
```

**Run generation (the poster)**
```bash
curl -sS -X POST $API/api/jobs/generate-weekly-posts -H "$CRON" -H 'Content-Type: application/json' \
  -d '{"stagger":true,"liveCount":3,"spacingDays":1}' | jq
```

**Publish a specific post / edit schedule** — set `posts.status='published'` (and `published_at`) or adjust `scheduled_for` in Supabase.

**Dedupe — ALWAYS dry-run first**
```bash
curl -sS -X POST $API/api/jobs/dedupe-inventory -H "$CRON" -H 'Content-Type: application/json' -d '{"dryRun":true}' | jq '{duplicateGroups,postsToDelete,productsToDelete,skippedProtected}'
```

**Fix a broken/missing image** — `POST /api/jobs/update-product-image {slug,image_url}` (or the App 2 script). Invalid/synthetic image URLs are rejected.

**End-to-end orchestrator (what the cron does, on demand)**
```bash
curl -sS -X POST $API/api/cron/orchestrator -H "$CRON" | jq
```

## 11. Deployment

Both apps deploy on **Vercel** from `main` (push to deploy).

- **App 1 (OCC):** `next build`; single cron in `vercel.json` (`/api/cron/orchestrator`, `0 13 * * *`). Functions have `maxDuration` up to 300s on the jobs. The team is on the **Hobby** plan — Vercel runs crons once/day at an approximate time within the hour, hence the single-orchestrator design.
- **App 2 (NerdyMugs):** `vite build` + static page generation → `app/dist`; `vercel.json` rewrites `/api/*` to App 1 and applies security headers + SPA fallback.
- **Domain:** `www.nerdymugs.com` → App 2. Set App 2's `NERDYMUGS_SITE_URL` during domain cutovers.
- **After a release batch:** redeploy App 2 to refresh static HTML/`sitemap.xml`/`rss.xml` (posts are live instantly via SPA regardless).

---

## 12. Troubleshooting & gotchas (learn these the easy way)

- **Images show `Star Wars R2 IMAGE-REMOVED.png`** → a product was imported with an empty `image_url` and got the placeholder. Fix with `POST /api/jobs/update-product-image {slug, image_url}` using a real `m.media-amazon.com` URL, then redeploy App 2.
- **A post won't show on the site** → check in order: (1) `posts.status` is `published` or (`ready` + `scheduled_for <= now`), (2) its product `image_url` is non-empty, (3) it's within the `/api/posts/ready` limit.
- **Dedupe deletes nothing / deletes too much** → it matches by **ASIN → real `/dp/` URL only**. Products with generic `.../s?k=` search URLs are skipped (not dedupable). Groups >25 are skipped as suspicious. **Always preview** with `{"dryRun":true}` before the live cron does it.
- **Cron "didn't run"** → Vercel Cron uses **GET**; every job exports GET. Confirm `CRON_SECRET` exists in the Vercel project (it injects the Bearer header). Check the deployment's registered cron via the dashboard (Project → Cron Jobs) and the function logs.
- **Discovery finds 0 new** → could be working correctly (everything already in inventory thanks to cross-week dedupe), or Firecrawl/OpenAI keys/quota, or `is_active` rules missing. Inspect the response's `errors` and `debug`.
- **Generation makes 0 posts** → no candidates for the current week with `discovery_score >= rule.min_score` (or all lack images). That's often success, not failure.
- **`/admin` won't log in** → password lives in `admin_settings`; verify via `POST /api/admin/verify-password`.
- **`sb_secret_`/`sb_publishable_` keys** are the newer Supabase key format; use them exactly as issued.

---

## 13. Code map (where to look)

**App 1 — OCC (`app/`, `lib/`)**
- `app/api/cron/orchestrator/route.ts` — single daily dispatcher.
- `app/api/jobs/weekly-discovery/route.ts` — discovery (scrape + score).
- `app/api/jobs/generate-weekly-posts/route.ts` — generation + auto-publish + stagger.
- `app/api/jobs/dedupe-inventory/route.ts` — ASIN/URL dedupe.
- `app/api/jobs/*` — import-csv, generate-post, publish-post, stagger-csv-posts, update-product-image, prepare-scheduled-post-images, legacy repair.
- `app/api/posts/ready/route.ts`, `app/api/posts/[slug]/route.ts` — public reads.
- `app/api/admin/**` — rules/candidates/trigger/verify/export.
- `lib/firecrawl.ts` — scraping. `lib/openai.ts` — scoring + generation. `lib/products.ts` — normalize/domain. `lib/publicPosts.ts` — visibility + CORS + auth helper. `lib/postImageRecovery.ts` — image recovery. `lib/supabase.ts` — client.
- `supabase/migrations/*` — schema history.

**App 2 — NerdyMugs (`app/src/`, `app/scripts/`)**
- `src/App.tsx` — routing + grid + detail + static-page selection.
- `src/components/` — `ProductCard`, `PostDetail`, `AdminPage`, `ProductManager`, `Navigation`, `SiteFooter`, `StaticPageView`.
- `src/lib/` — `affiliate.ts`, `formatTextBlob.mjs`, `postOverrides.mjs`, `analytics.ts`.
- `scripts/generate-static-pages.mjs` — static HTML/sitemap/rss.
- `scripts/import-csv-products.mjs`, `bulk-generate-posts.mjs`, `stagger-csv-posts.mjs`, `update-product-images.mjs` — fallback pipeline.

## 14. Conventions & workflow

- **Two repos, one system.** Make changes in the right repo: backend logic → OCC; UI/SEO → NerdyMugs. Don't move scraping/AI/secret logic into the frontend.
- **No local-only state.** After meaningful edits: `npx tsc --noEmit` + `npm run build`, then commit with a small clear message and push. Verify against the live deployment.
- **Always update `CHANGELOG.md`** for significant changes.
- **Commit style:** short imperative subject (e.g., `Fix dedupe: never merge search URLs`). One logical change per commit where practical.
- **Safety first for destructive jobs:** dry-run before live; never weaken auth; never commit `.env`.
- **Agent rules:** see `docs/AGENT_RULES.md` (what's safe to change vs needs approval vs forbidden).
- **Tone:** user-facing copy is witty/nerdy; engineering comms are direct.
- **Free-tier reality:** keep to one cron, once/day; heavy jobs run inside the orchestrator.

---

## 15. Glossary

- **ASIN** — Amazon's 10-char product id (in `/dp/ASIN` URLs). Our canonical product identity for dedupe.
- **Product** — a discovered item (row in `products`).
- **Post** — the generated article for a product (row in `posts`), with `status` and optional `scheduled_for`.
- **Candidate** — a discovered product awaiting generation (row in `weekly_product_candidates`).
- **Rule** — a discovery query spec (`weekly_discovery_rules`) with a `min_score` quality bar.
- **ready / published** — `ready` = eligible but gated by `scheduled_for`; `published` = live now.
- **scheduled_for** — future timestamp that hides a `ready` post until then (date-gating).
- **Stagger** — releasing a batch gradually (top N live, rest one/day) instead of all at once.
- **Orchestrator** — the single daily cron endpoint that dispatches the week's jobs.
- **CRON_SECRET** — bearer token guarding every job endpoint; injected by Vercel Cron.
- **Affiliate tag** — `georgwebsi-20`, appended to Amazon links for commission tracking.
- **Firecrawl** — the scraping service that fetches Amazon search pages.
- **Hobby plan** — Vercel free tier; one cron, once/day, approximate timing.

---

*End of onboarding. When you change behavior in code, update this file in the same PR — future you (and the next junior) will thank you.*






