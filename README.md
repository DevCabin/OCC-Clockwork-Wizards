# OCC Clockwork Wizards — V1 API Pipeline

**Version:** `1.0.2`
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
| `GET` | `/api/posts/recent` | None | AI-generated posts (default 21) |
| `GET` | `/api/posts/ready` | None | Ready-to-publish inventory posts |
| `GET` | `/api/posts/[slug]` | None | Individual post detail payload with CORS |
| `POST` | `/api/jobs/daily-products` | Bearer token | Trigger product discovery |
| `POST` | `/api/jobs/daily-posts` | Bearer token | Trigger post generation |
| `POST` | `/api/jobs/import-wordpress` | Bearer token | Import legacy WordPress archive records |
| `POST` | `/api/jobs/hide-no-image-posts` | Bearer token | Hide WP posts with no product image (mark needs_review) |
| `POST` | `/api/jobs/repair-affiliate-links` | Bearer token | Fix nerdymugs.com links → Amazon with fallback |
| `POST` | `/api/posts/mark-published` | Bearer token | Mark a post as published by `id` or `slug` |

Query param: `?limit=N` (max 100) on all GET endpoints.

See [`V1_ARCHITECTURE.md`](./V1_ARCHITECTURE.md) for full documentation including response shapes, database schema, and integration code examples.

---

## Repo Layout

```
/
├── app/
│   ├── api/jobs/daily-products/    # Product discovery + scoring job
│   ├── api/jobs/daily-posts/       # Post generation job
│   ├── api/jobs/import-wordpress/  # Legacy WordPress archive import job
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
- Missing lower-grid images are currently tolerated; link/detail correctness is the active priority.

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
