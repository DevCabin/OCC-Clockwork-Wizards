# OCC Clockwork Wizards — V1 API Pipeline

**Version:** `1.0.4`
**Live base URL:** `https://app-liart-five-43.vercel.app`
**GitHub:** `https://github.com/DevCabin/OCC-Clockwork-Wizards`
**Stack:** Next.js 14 (App Router) · TypeScript · Supabase · Firecrawl · OpenAI · Vercel

---

## What This Repo Is

This is the **backend data pipeline only**. It:

1. Discovers products from Amazon via Firecrawl
2. Scores them for relevance using OpenAI
3. Stores prepared product inventory in Supabase
4. Generates AI-written markdown posts for each product with lifecycle status support
5. Exposes everything via open JSON API endpoints

**No frontend lives here.** The NerdyMugs Vite/React frontend is in a separate repo and consumes these endpoints.

---

## API Endpoints

All endpoints live at `https://app-liart-five-43.vercel.app`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products/latest` | None | Latest products (default 3) |
| `GET` | `/api/products/recent` | None | Recent products (default 21) |
| `GET` | `/api/posts/recent` | None | Recent inventory/audit feed (currently broader than the public ready feed) |
| `GET` | `/api/posts/ready` | None | Publicly visible posts only |
| `GET` | `/api/posts/[slug]` | None | Individual public post detail payload with CORS |
| `POST` | `/api/jobs/daily-products` | Bearer token | Trigger product discovery |
| `POST` | `/api/jobs/daily-posts` | Bearer token | Trigger post generation |
| `POST` | `/api/jobs/import-wordpress` | Bearer token | Import legacy WordPress archive records |
| `POST` | `/api/jobs/hide-no-image-posts` | Bearer token | Hide WP posts with no product image (mark needs_review) |
| `POST` | `/api/jobs/delete-bad-posts` | Bearer token | Delete broken junk posts from the live inventory |
| `POST` | `/api/jobs/stagger-post-release` | Bearer token | Keep N posts live and schedule the rest forward |
| `POST` | `/api/jobs/repair-affiliate-links` | Bearer token | Fix nerdymugs.com links → Amazon with fallback |
| `POST` | `/api/posts/mark-published` | Bearer token | Mark a post as published by `id` or `slug` |

Query param: `?limit=N` (max 250 on `/api/posts/ready`, max 100 on `/api/posts/recent`).

See [`V1_ARCHITECTURE.md`](./V1_ARCHITECTURE.md) for full documentation including response shapes, database schema, and integration code examples.

---

## Repo Layout

```
/
├── app/
│   ├── api/jobs/daily-products/    # Product discovery + scoring job
│   ├── api/jobs/daily-posts/       # Post generation job
│   ├── api/jobs/delete-bad-posts/  # Delete obviously broken junk posts
│   ├── api/jobs/import-wordpress/  # Legacy WordPress archive import job
│   ├── api/jobs/stagger-post-release/ # Schedule future post releases
│   ├── api/products/latest/        # GET latest products
│   ├── api/products/recent/        # GET recent products
│   ├── api/posts/recent/           # GET recent posts
│   ├── api/posts/ready/            # GET ready posts
│   ├── api/posts/mark-published/   # POST lifecycle publish mutation
│   ├── layout.tsx
│   └── page.tsx                    # Minimal API index page
├── lib/
│   ├── firecrawl.ts                # Firecrawl scrape + extract
│   ├── openai.ts                   # Scoring + post generation
│   ├── products.ts                 # RULE config + discovery logic
│   ├── supabase.ts                 # Supabase client
│   ├── wordpressImport.ts          # Typed wrapper for shared WP import module
│   ├── wordpressImport.mjs         # Shared WP import implementation
│   └── types.ts                    # Zod schemas + TypeScript types
├── supabase/migrations/            # DB schema SQL
├── V1_ARCHITECTURE.md              # Full architecture + integration guide
├── CHANGELOG.md
└── vercel.json                     # Cron schedule
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `FIRECRAWL_API_KEY` | Firecrawl API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `CRON_SECRET` | Bearer token for job endpoints |
| `WORDPRESS_IMPORT_BASE_URL` | Optional override base URL for `imported-posts.json` / `redirects.json` |

## Security Notes

- Treat `CRON_SECRET` as a server-only admin token. Never commit it to docs, scripts, or repo notes.
- Do not pass `CRON_SECRET` through frontend env vars or browser-triggered flows.
- `GET /api/posts/ready` and `GET /api/posts/[slug]` are the intended public content endpoints.
- `GET /api/posts/recent` currently returns broader inventory data and should be treated as an internal/audit surface until it is narrowed or protected.

---

## Cron Schedule

```json
{ "path": "/api/jobs/daily-products", "schedule": "0 13 * * *"  }
{ "path": "/api/jobs/daily-posts",    "schedule": "15 13 * * *" }
```

---

## Quick Test Links (browser-ready)

| Endpoint | Link |
|---|---|
| Latest products (3) | [/api/products/latest](https://app-liart-five-43.vercel.app/api/products/latest) |
| Recent products (21) | [/api/products/recent](https://app-liart-five-43.vercel.app/api/products/recent) |
| Recent posts (21) | [/api/posts/recent](https://app-liart-five-43.vercel.app/api/posts/recent) |
| Ready posts (21) | [/api/posts/ready](https://app-liart-five-43.vercel.app/api/posts/ready) |
| Example post detail | [/api/posts/programmers-while-coding-mug-5ba1e567](https://app-liart-five-43.vercel.app/api/posts/programmers-while-coding-mug-5ba1e567) |
| Latest products — 10 | [/api/products/latest?limit=10](https://app-liart-five-43.vercel.app/api/products/latest?limit=10) |
| Recent posts — 5 | [/api/posts/recent?limit=5](https://app-liart-five-43.vercel.app/api/posts/recent?limit=5) |
| API index | [/](https://app-liart-five-43.vercel.app) |

---

## Manual Test

```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

curl -sS --max-time 120 -X POST "https://app-liart-five-43.vercel.app/api/jobs/daily-products" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -sS --max-time 120 -X POST "https://app-liart-five-43.vercel.app/api/jobs/daily-posts" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -sS --max-time 300 -X POST "https://app-liart-five-43.vercel.app/api/jobs/import-wordpress" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'

curl -sS --max-time 300 -X POST "https://app-liart-five-43.vercel.app/api/jobs/import-wordpress" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":false}'

curl -sS "https://app-liart-five-43.vercel.app/api/products/latest?limit=3"
curl -sS "https://app-liart-five-43.vercel.app/api/posts/ready?limit=3"
curl -sS "https://app-liart-five-43.vercel.app/api/posts/recent?limit=3"
curl -sS -i "https://app-liart-five-43.vercel.app/api/posts/programmers-while-coding-mug-5ba1e567"
```

### Public frontend integration status

- NerdyMugs frontend: `https://nerdymugs-the-machine.vercel.app`
- Current flow: grid from `/api/posts/ready` → detail fetch from `/api/posts/[slug]` → Amazon CTA from `post.product_url`
- `ready` and slug detail endpoints both send permissive CORS headers for the frontend.
- Public inventory is now intentionally throttled:
  - `30` posts live now
  - future posts unlock automatically every 3 days via `scheduled_for`
- Missing lower-grid images are currently tolerated; content quality and release control are the active priorities.
- Security follow-up is now an active priority:
  - rotate `CRON_SECRET`
  - remove any browser-side use of admin tokens
  - tighten `/api/posts/recent` if it should not expose non-public inventory

### Public visibility rules

- A post is public when:
  - `status = 'published'`, or
  - `status = 'ready'` and `scheduled_for <= now`, or
  - `status = 'ready'` and `scheduled_for` is empty
- Future scheduled `ready` posts do not appear in `/api/posts/ready`.
- Future scheduled `ready` posts also return `404` from `/api/posts/[slug]` until their go-live date.

### Content operations guide

To review and update upcoming posts, go to Supabase and use the `posts` and `products` tables.

- `posts` table:
  - edit `title`, `excerpt`, `body_md`
  - change `status`
  - adjust `scheduled_for` to move a post earlier or later
  - use `legacy_source_path` if you need to preserve or repair a clean URL
- `products` table:
  - edit `image_url` to replace missing or broken product images
  - edit `product_url` if you need to swap or repair the Amazon destination
  - edit `title` / `description` if the source product data needs cleanup

Helpful workflow:

1. In `posts`, filter `status = ready`.
2. Sort by `scheduled_for` ascending to see the release queue.
3. Copy the `product_id` from a post row.
4. Open the matching row in `products` and update `image_url` or `product_url`.
5. Save changes and spot-check the live API:
   - `/api/posts/recent?limit=100` shows the full recent inventory sample
   - `/api/posts/ready?limit=250` shows only currently public posts

Important:

- The frontend static build only regenerates currently public post HTML and sitemap entries at deploy time.
- Future scheduled posts still go live automatically through the SPA fallback as soon as the backend exposes them.
- To refresh static HTML and sitemap for newly released posts, redeploy the frontend after a batch has gone live.

### WordPress import behavior notes

- Default source files are fetched live from the NerdyMugs GitHub repo:
  - `app/imported-posts.json`
  - `app/redirects.json`
- The import path is **authenticated** with the same `CRON_SECRET` pattern used by other OCC jobs.
- By default it:
  - runs in dry-run mode unless `{"dryRun":false}` is provided
  - excludes editorial/navigation pages
  - skips blank/junk rows
  - preserves legacy slug/path metadata on imported posts
- Current validated dry-run expectation is approximately:
  - `149` importable product-style legacy rows
  - `20` skipped rows

---

## Documentation

- [`V1_ARCHITECTURE.md`](./V1_ARCHITECTURE.md) — full pipeline, schema, API reference, integration guide
- [`CHANGELOG.md`](./CHANGELOG.md) — change history
- [`RESET_STRATEGY.md`](./RESET_STRATEGY.md) — recovery notes
