# OCC Clockwork Wizards — V1 API Pipeline

**Live base URL:** `https://app-liart-five-43.vercel.app`  
**GitHub:** `https://github.com/DevCabin/OCC-Clockwork-Wizards`  
**Stack:** Next.js 14 (App Router) · TypeScript · Supabase · Firecrawl · OpenAI · Vercel

---

## What This Repo Is

This is the **backend data pipeline only**. It:

1. Discovers products from Amazon/Etsy via Firecrawl
2. Scores them for relevance using OpenAI
3. Stores the top 3 per day in Supabase
4. Generates AI-written markdown posts for each product
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
| `POST` | `/api/jobs/daily-products` | Bearer token | Trigger product discovery |
| `POST` | `/api/jobs/daily-posts` | Bearer token | Trigger post generation |

Query param: `?limit=N` (max 100) on all GET endpoints.

See [`V1_ARCHITECTURE.md`](./V1_ARCHITECTURE.md) for full documentation including response shapes, database schema, and integration code examples.

---

## Repo Layout

```
/
├── app/
│   ├── api/jobs/daily-products/    # Product discovery + scoring job
│   ├── api/jobs/daily-posts/       # Post generation job
│   ├── api/products/latest/        # GET latest products
│   ├── api/products/recent/        # GET recent products
│   ├── api/posts/recent/           # GET recent posts
│   ├── layout.tsx
│   └── page.tsx                    # Minimal API index page
├── lib/
│   ├── firecrawl.ts                # Firecrawl scrape + extract
│   ├── openai.ts                   # Scoring + post generation
│   ├── products.ts                 # RULE config + discovery logic
│   ├── supabase.ts                 # Supabase client
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

---

## Cron Schedule

```json
{ "path": "/api/jobs/daily-products", "schedule": "0 13 * * *"  }
{ "path": "/api/jobs/daily-posts",    "schedule": "15 13 * * *" }
```

---

## Manual Test

```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

curl -sS --max-time 120 -X POST "https://app-liart-five-43.vercel.app/api/jobs/daily-products" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -sS --max-time 120 -X POST "https://app-liart-five-43.vercel.app/api/jobs/daily-posts" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -sS "https://app-liart-five-43.vercel.app/api/products/latest?limit=3"
curl -sS "https://app-liart-five-43.vercel.app/api/posts/recent?limit=3"
```

---

## Documentation

- [`V1_ARCHITECTURE.md`](./V1_ARCHITECTURE.md) — full pipeline, schema, API reference, integration guide
- [`CHANGELOG.md`](./CHANGELOG.md) — change history
- [`RESET_STRATEGY.md`](./RESET_STRATEGY.md) — recovery notes