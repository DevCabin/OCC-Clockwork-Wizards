# OCC Clockwork Wizards — Minimal V1 Product + Post Pipeline

This is a scrappy, minimal V1 that runs daily product discovery and post generation pipelines, then exposes JSON endpoints.

## What it does

Once per day:
1. Generates simple product discovery candidates
2. Extracts product-like data with Firecrawl
3. Scores relevance with OpenAI
4. Stores top 3 products in Supabase
5. Generates short markdown product spotlight posts with OpenAI
6. Stores generated posts in Supabase
7. Serves latest/recent products and recent posts via API

## Stack

- Next.js (App Router)
- TypeScript
- Supabase (Postgres)
- Firecrawl API
- OpenAI API
- Vercel cron

## Environment variables

Copy `.env.example` to `.env.local` and fill all values:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIRECRAWL_API_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`

## Supabase setup

Run these migration SQL files in your Supabase SQL editor:

`supabase/migrations/20260413103100_create_products.sql`
`supabase/migrations/20260413120000_create_posts.sql`

It creates two tables:
- `products`
- `posts`

With:
- unique `(product_url, run_date)`
- index on `run_date desc`

`posts` includes:
- foreign key to `products.id`
- unique `product_id` (one post per product in this V1)
- unique `slug`
- indexes on `run_date desc` and `created_at desc`

## Local development

Install + run:

```bash
npm install
npm run dev
```

## API endpoints

### POST `/api/jobs/daily-products`

Runs the daily ingestion/scoring pipeline.

Requires header:

`Authorization: Bearer <CRON_SECRET>`

Example:

```bash
curl -X POST http://localhost:3000/api/jobs/daily-products \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response shape:

```json
{
  "success": true,
  "runDate": "YYYY-MM-DD",
  "candidatesTried": 8,
  "productsStored": 3,
  "errors": []
}
```

### GET `/api/products/latest`

Default limit is 3.

Examples:

```bash
curl "http://localhost:3000/api/products/latest"
curl "http://localhost:3000/api/products/latest?limit=3"
```

### GET `/api/products/recent`

Default limit is 21.

Examples:

```bash
curl "http://localhost:3000/api/products/recent"
curl "http://localhost:3000/api/products/recent?limit=21"
```

### POST `/api/jobs/daily-posts`

Runs post generation for products that do not already have posts.

Requires header:

`Authorization: Bearer <CRON_SECRET>`

Example:

```bash
curl -X POST http://localhost:3000/api/jobs/daily-posts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response shape:

```json
{
  "success": true,
  "runDate": "YYYY-MM-DD",
  "productsChecked": 25,
  "postsAttempted": 3,
  "postsStored": 3,
  "errors": []
}
```

### GET `/api/posts/recent`

Default limit is 21.

Examples:

```bash
curl "http://localhost:3000/api/posts/recent"
curl "http://localhost:3000/api/posts/recent?limit=21"
```

## Vercel deployment + cron

`vercel.json` includes daily crons for:
- `/api/jobs/daily-products` (13:00 UTC)
- `/api/jobs/daily-posts` (13:15 UTC)

Set all env vars in Vercel Project Settings. Include `CRON_SECRET`.

Vercel cron will call:
- `POST /api/jobs/daily-products`
- `POST /api/jobs/daily-posts`

Your route checks for:
- `Authorization: Bearer <CRON_SECRET>`

## Notes

- This is intentionally minimal (no UI, no admin, no multi-rule engine).
- Failed extraction/scoring items are skipped; the job returns a summary instead of crashing.
