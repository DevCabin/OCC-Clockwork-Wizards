# V1 Architecture — OCC Clockwork Wizards Product + Post Pipeline

**Version:** `1.0.2`
**Live base URL:** `https://app-liart-five-43.vercel.app`
**GitHub:** `https://github.com/DevCabin/OCC-Clockwork-Wizards`
**Stack:** Next.js 14 (App Router) · TypeScript · Supabase (Postgres) · Firecrawl API · OpenAI API · Vercel

---

## 1. What V1 Does

Once per day, the pipeline:

1. **Discovers** product candidate URLs from Amazon search pages
2. **Extracts** structured product data from each page via Firecrawl
3. **Scores** each product for relevance using OpenAI
4. **Rejects** strict normalized-title duplicates against recent inventory
5. **Stores** prepared products in Supabase
6. **Generates** a short markdown affiliate-style post for each new product using OpenAI
7. **Stores** each new post in Supabase as `ready` inventory
8. **Allows** later publish marking via an authenticated endpoint
9. **Supports** authenticated live import of legacy WordPress archive content
10. **Exposes** all stored data via JSON API endpoints

No UI. No frontend. Pure data pipeline + API layer.

---

## 2. Pipeline Flow (Data Journey)

```
Vercel Cron (13:00 UTC)
        │
        ▼
POST /api/jobs/daily-products
        │
        ├─ generateCandidateUrls()        ← lib/products.ts
        │   └─ builds Amazon search URLs from RULE keywords
        │
        ├─ extractProductsFromUrl()       ← lib/firecrawl.ts
        │   └─ Firecrawl API scrapes + extracts structured JSON
        │
        ├─ normalizeProduct()             ← lib/products.ts
        │   └─ validates with Zod schema, cleans domain
        │
        ├─ domainAllowed()                ← lib/products.ts
        │   └─ filters to allowed domains only
        │
        ├─ scoreProductWithOpenAI()       ← lib/openai.ts
        │   └─ OpenAI returns { score: 0-100, isRelevant: boolean }
        │
        ├─ normalizeTitle()               ← lib/products.ts
        │   └─ skips recent duplicate titles before storage
        │
        └─ top products by score → upsert to Supabase `products` table

Vercel Cron (13:15 UTC)
        │
        ▼
POST /api/jobs/daily-posts
        │
        ├─ fetch products from Supabase (latest 25, by run_date/created_at)
        │
        ├─ filter out products that already have a post
        │
        ├─ generatePostForProduct()       ← lib/openai.ts
        │   └─ OpenAI returns { title, slug, excerpt, body_md }
        │
        └─ upsert to Supabase `posts` table with `status = ready`

GET /api/products/latest    ← served any time from Supabase
GET /api/products/recent    ← served any time from Supabase
GET /api/posts/recent       ← served any time from Supabase
GET /api/posts/ready        ← ready inventory only
GET /api/posts/[slug]       ← single post detail payload
POST /api/posts/mark-published ← mark a post as published
POST /api/jobs/import-wordpress ← import legacy WordPress archive rows
```

---

## 3. File-by-File Reference

### `lib/products.ts`

Core business logic and configuration.

- **`RULE`** — the single active discovery rule. Defines:
  - `name` — identifier stored on every product/post row
  - `keywords` — used to build candidate search URLs
  - `excludeKeywords` — products matching these are rejected
  - `allowedDomains` — only `amazon.com` accepted in round 1
  - `priceMin` / `priceMax` — scoring guidance for OpenAI
  - `dailyCount` — how many top products to store per run (currently `10`)

- **`generateCandidateUrls()`** — builds Amazon search URLs from rule keywords.

- **`normalizeProduct(input)`** — validates raw scraped data against the Zod `productSchema`. Returns `Product | null`.

- **`normalizeTitle(title)`** — lowercases, trims, and collapses whitespace for strict round-1 duplicate checks.

- **`domainAllowed(domain)`** — checks if extracted domain matches `RULE.allowedDomains`.

- **`getRunDateISO()`** — returns today's date as `YYYY-MM-DD`. Used as the `run_date` for every row written today.

---

### `lib/firecrawl.ts`

Wraps the Firecrawl API for structured product extraction.

- **`extractProductsFromUrl(url)`** — POSTs a scrape request to `https://api.firecrawl.dev/v1/scrape` with an extraction schema targeting:
  - `title`, `description`, `image_url`, `price`, `currency`, `product_url`, `source_domain`
  - Returns `Product[]` (normalized)

Firecrawl uses LLM-powered extraction — it reads the page and returns structured JSON matching the schema, not raw HTML parsing.

---

### `lib/openai.ts`

Wraps the OpenAI Responses API (`gpt-4.1-mini`) for two functions.

- **`scoreProductWithOpenAI(product)`** — prompts the model to score a product 0–100 and return `{ score, isRelevant }`. Uses strict JSON schema output format. Products marked `isRelevant: false` are discarded before storage.

- **`generatePostForProduct(product)`** — prompts the model to write a ~150-word affiliate-style markdown product spotlight. Returns `{ title, slug, excerpt, body_md }`. Slug is normalized to lowercase kebab-case with a product ID suffix for uniqueness.

Both functions use the OpenAI **Responses API** (`/v1/responses`) with `text.format.type = "json_schema"` for reliable structured output.

---

### `lib/supabase.ts`

- **`getSupabaseClient()`** — creates a Supabase client using the service role key (bypasses Row Level Security). Used only in server-side route handlers. Never exposed to the browser.

---

### `lib/wordpressImport.mjs` + `lib/wordpressImport.ts`

Shared WordPress archive import logic.

- **`wordpressImport.mjs`** — runtime implementation shared by:
  - the standalone import script
  - the live authenticated import route
- **`wordpressImport.ts`** — typed wrapper used by the Next.js app layer

Responsibilities:

- load WordPress archive artifacts (`imported-posts.json`, `redirects.json`)
- classify usable vs skipped legacy rows
- exclude editorial/navigation pages by default
- derive stable slugs and preserve legacy source paths
- upsert placeholder-backed `products` and `posts` rows for usable legacy entries
- support dry-run reporting

Validated current dry-run summary:

- total rows: `169`
- importable product-style rows: `149`
- skipped rows: `20`

---

### `lib/types.ts`

Zod schemas + TypeScript types used across the codebase:

- **`Product`** — the canonical product type: `{ title, description, image_url, price, currency, product_url, source_domain, normalized_title? }`
- **`productSchema`** — Zod validator for raw scraped data
- **`openAiScoreSchema`** — validates `{ score, isRelevant }` from OpenAI
- **`openAiPostSchema`** — validates `{ title, slug, excerpt, body_md }` from OpenAI
- **`GeneratedPost`** — TypeScript type inferred from `openAiPostSchema`
- **`PostStatus`** — lifecycle status union: `ready | published | rejected`

---

### `app/api/jobs/daily-products/route.ts`

The product ingestion job. **POST only, requires `Authorization: Bearer <CRON_SECRET>`**.

Flow:
1. Checks auth header
2. Calls `generateCandidateUrls()` → gets Amazon search URLs only
3. Loads recent `normalized_title` values from Supabase for duplicate prevention
4. For each URL: calls `extractProductsFromUrl()`, rejects duplicate titles, then scores each extracted product
5. Sorts all relevant products by score descending, takes top `RULE.dailyCount` (10)
6. Upserts to `products` with conflict key `(product_url, run_date)` while also storing `normalized_title` and `discovered_at`

---

### `app/api/jobs/daily-posts/route.ts`

The post generation job. **POST only, requires `Authorization: Bearer <CRON_SECRET>`**.

Flow:
1. Checks auth header
2. Fetches latest 25 products from Supabase
3. Fetches all existing post `product_id` values
4. Filters to products that don't yet have a post
5. Generates a post for each candidate via OpenAI
6. Upserts to `posts` with conflict key `product_id` and stores new rows with `status = ready`

---

### `app/api/products/latest/route.ts`

`GET /api/products/latest` — returns most recent products ordered by `run_date desc`, `created_at desc`. Default limit: `3`, max `100`.

---

### `app/api/products/recent/route.ts`

`GET /api/products/recent` — same query as `/latest` but default limit: `21`.

---

### `app/api/posts/recent/route.ts`

`GET /api/posts/recent` — returns most recent posts ordered by `run_date desc`, `created_at desc`. Includes lifecycle fields `status`, `published_at`, and `scheduled_for`. Default limit: `21`, max `100`.

---

### `app/api/posts/ready/route.ts`

`GET /api/posts/ready` — returns only posts whose lifecycle `status = 'ready'`. Default limit: `21`, max `100`.

---

### `app/api/posts/[slug]/route.ts`

`GET /api/posts/[slug]` — returns one post detail payload as `{ post }`, including product image and description through the joined `products` row.

This endpoint sends permissive CORS headers and supports `OPTIONS` so the NerdyMugs frontend can load detail pages from the separate Vercel app.

---

### `app/api/posts/mark-published/route.ts`

`POST /api/posts/mark-published` — authenticated lifecycle mutation that marks a post `published` and sets `published_at`. Accepts either `id` or `slug`.

---

### `app/api/jobs/import-wordpress/route.ts`

`POST /api/jobs/import-wordpress` — authenticated legacy archive import route.

Behavior:

- requires `Authorization: Bearer <CRON_SECRET>`
- fetches WordPress artifact JSON from the NerdyMugs repo by default via raw GitHub URLs
- supports request body overrides for:
  - `dryRun`
  - `includeEditorial`
  - `importedPostsUrl`
  - `redirectsUrl`
- defaults to `dryRun: true` for safer first execution
- excludes editorial/navigation pages unless explicitly included

Primary use:

- trigger live import/reporting against production OCC without relying on local filesystem access

---

### `vercel.json`

Defines Vercel cron schedule:

```json
{
  "crons": [
    { "path": "/api/jobs/daily-products", "schedule": "0 13 * * *" },
    { "path": "/api/jobs/daily-posts",    "schedule": "15 13 * * *" }
  ]
}
```

Vercel calls these as authenticated POST requests using the `CRON_SECRET` env var automatically.

---

## 4. Database Schema

### Table: `products`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key, auto-generated |
| `rule_name` | `text` | e.g. `nerdy-mugs` |
| `title` | `text` | product title from scrape |
| `description` | `text` | nullable |
| `image_url` | `text` | nullable |
| `price` | `numeric` | nullable |
| `currency` | `text` | nullable, e.g. `USD` |
| `product_url` | `text` | canonical product page URL |
| `source_domain` | `text` | e.g. `amazon.com` |
| `run_date` | `date` | date the job ran, `YYYY-MM-DD` |
| `created_at` | `timestamptz` | auto, defaults to `now()` |

**Unique constraint:** `(product_url, run_date)` — one record per product per day.  
**Index:** `run_date DESC`

---

### Table: `posts`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key, auto-generated |
| `product_id` | `uuid` | FK → `products.id` ON DELETE CASCADE |
| `rule_name` | `text` | mirrors product's rule_name |
| `product_title` | `text` | denormalized for query convenience |
| `product_url` | `text` | denormalized for query convenience |
| `title` | `text` | AI-generated post title |
| `slug` | `text` | unique, lowercase kebab-case + product ID suffix |
| `excerpt` | `text` | 1–2 sentence summary |
| `body_md` | `text` | full markdown post body (~150–220 words) |
| `run_date` | `date` | date the post was generated |
| `created_at` | `timestamptz` | auto, defaults to `now()` |

**Unique constraints:** `slug`, `product_id` (one post per product in V1).  
**Indexes:** `run_date DESC`, `created_at DESC`

---

## 5. API Reference

All endpoints are live at `https://app-liart-five-43.vercel.app`.

---

### `GET /api/products/latest`

Returns the most recently stored products.

**Auth:** None required.

**Query params:**

| Param | Default | Max | Description |
|---|---|---|---|
| `limit` | `3` | `100` | Number of products to return |

**Response:**

```json
{
  "products": [
    {
      "id": "uuid",
      "rule_name": "nerdy-mugs",
      "title": "Funny Programmer Coffee Mug",
      "description": "...",
      "image_url": "https://m.media-amazon.com/images/...",
      "price": 16.99,
      "currency": "USD",
      "product_url": "https://www.amazon.com/...",
      "source_domain": "amazon.com",
      "normalized_title": "funny programmer coffee mug",
      "discovered_at": "2026-05-26T18:30:00.000Z",
      "run_date": "2026-04-13",
      "created_at": "2026-04-13T19:37:14.495369+00:00"
    }
  ]
}
```

---

### `GET /api/products/recent`

Returns a larger window of recent products (for browsing/pagination).

**Auth:** None required.

**Query params:**

| Param | Default | Max |
|---|---|---|
| `limit` | `21` | `100` |

**Response:** same shape as `/api/products/latest`

---

### `GET /api/posts/recent`

Returns the most recent AI-generated posts with full markdown content.

**Auth:** None required.

**Query params:**

| Param | Default | Max |
|---|---|---|
| `limit` | `21` | `100` |

**Response:**

```json
{
  "posts": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "rule_name": "nerdy-mugs",
      "product_title": "Funny Programmer Coffee Mug",
      "product_url": "https://www.amazon.com/...",
      "title": "Funny Programmer Coffee Mug",
      "slug": "funny-programmer-coffee-mug-b217a3f7",
      "excerpt": "A compact mug pick for developers who like their coffee with a side of code.",
      "body_md": "If your ideal desk setup includes clean code and strong coffee, this mug fits right in...\n\n[Check it out here](...)",
      "status": "ready",
      "published_at": null,
      "scheduled_for": null,
      "run_date": "2026-04-13",
      "created_at": "2026-04-13T19:35:13.940293+00:00"
    }
  ]
}
```

---

### `POST /api/jobs/daily-products`

Triggers the product discovery + scoring + storage pipeline.

**Auth:** `Authorization: Bearer <CRON_SECRET>` — required.

**Response:**

```json
{
  "success": true,
  "runDate": "2026-04-13",
  "candidatesTried": 6,
  "productsStored": 10,
  "errors": []
}
```

---

### `POST /api/jobs/daily-posts`

Triggers post generation for any products that don't yet have a post.

**Auth:** `Authorization: Bearer <CRON_SECRET>` — required.

**Response:**

```json
{
  "success": true,
  "runDate": "2026-04-13",
  "productsChecked": 25,
  "postsAttempted": 10,
  "postsStored": 10,
  "errors": []
}
```

---

### `POST /api/jobs/import-wordpress`

Runs the legacy WordPress archive import against artifact JSON sources.

**Auth:** `Authorization: Bearer <CRON_SECRET>` — required.

**Request body:**

```json
{
  "dryRun": true,
  "includeEditorial": false
}
```

Optional body fields:

- `importedPostsUrl`
- `redirectsUrl`

**Response shape:**

```json
{
  "success": true,
  "source": {
    "importedPostsUrl": "https://raw.githubusercontent.com/DevCabin/NerdyMugs-The-Machine/main/app/imported-posts.json",
    "redirectsUrl": "https://raw.githubusercontent.com/DevCabin/NerdyMugs-The-Machine/main/app/redirects.json"
  },
  "summary": {
    "dryRun": true,
    "includeEditorial": false,
    "totalRecords": 169,
    "usableRecords": 149,
    "importedProducts": 149,
    "importedPosts": 149,
    "skipped": 20
  }
}
```

---

## 6. Integration Guide — How Downstream Apps Access This Data

The four `GET` endpoints are **open, unauthenticated, and CORS-permissive** (Next.js default). Any frontend, mobile app, or external service can read from them directly.

---

### From a React / Next.js frontend

```typescript
// Fetch latest 3 products
const res = await fetch('https://app-liart-five-43.vercel.app/api/products/latest?limit=3');
const { products } = await res.json();

// Fetch ready inventory posts
const res2 = await fetch('https://app-liart-five-43.vercel.app/api/posts/ready?limit=21');
const { posts } = await res2.json();
```

---

### From a React component (client-side)

```typescript
import { useEffect, useState } from 'react';

const BASE = 'https://app-liart-five-43.vercel.app';

export function useLatestProducts(limit = 3) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch(`${BASE}/api/products/latest?limit=${limit}`)
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []));
  }, [limit]);
  return products;
}

export function useRecentPosts(limit = 21) {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch(`${BASE}/api/posts/recent?limit=${limit}`)
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []));
  }, [limit]);
  return posts;
}

export function useReadyPosts(limit = 21) {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch(`${BASE}/api/posts/ready?limit=${limit}`)
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []));
  }, [limit]);
  return posts;
}
```

---

### From a Next.js Server Component (SSR)

```typescript
// app/products/page.tsx
const BASE = 'https://app-liart-five-43.vercel.app';

export default async function ProductsPage() {
  const res = await fetch(`${BASE}/api/products/latest?limit=3`, {
    next: { revalidate: 3600 } // cache 1 hour
  });
  const { products } = await res.json();

  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>
          <a href={p.product_url}>{p.title}</a> — ${p.price}
        </li>
      ))}
    </ul>
  );
}
```

---

### Post body_md rendering (markdown to HTML)

`body_md` is standard markdown. Render with any markdown library:

```typescript
import ReactMarkdown from 'react-markdown';

<ReactMarkdown>{post.body_md}</ReactMarkdown>
```

---

### Key integration contract

| Field | Always present | Notes |
|---|---|---|
| `products[].id` | ✅ | UUID, use as React key |
| `products[].title` | ✅ | display name |
| `products[].product_url` | ✅ | affiliate link destination |
| `products[].image_url` | ❌ | can be null |
| `products[].price` | ❌ | can be null |
| `products[].currency` | ❌ | can be null |
| `products[].normalized_title` | ❌ | stored duplicate key |
| `posts[].slug` | ✅ | unique, use as URL slug |
| `posts[].excerpt` | ✅ | short description, safe for meta tags |
| `posts[].body_md` | ✅ | full markdown content |
| `posts[].product_url` | ✅ | denormalized for convenience |
| `posts[].product_id` | ✅ | links back to `products.id` |
| `posts[].status` | ✅ | lifecycle state |

---

## 7. External Services

### Firecrawl

- **Purpose:** scrape e-commerce pages and extract structured product data using LLM extraction
- **Endpoint:** `POST https://api.firecrawl.dev/v1/scrape`
- **Format used:** `extract` with a typed JSON schema
- **Key env var:** `FIRECRAWL_API_KEY`
- **Rate concern:** currently called for every Amazon candidate URL generated from the active keyword set. Each is a separate API call.

### OpenAI

- **Model:** `gpt-4.1-mini`
- **Endpoint:** `POST https://api.openai.com/v1/responses`
- **Output format:** strict JSON schema (structured outputs)
- **Used for:** product relevance scoring + post content generation
- **Key env var:** `OPENAI_API_KEY`
- **Rate concern:** 2 calls per product for scoring + 1 call per new product for post generation

### Supabase

- **Type:** Postgres (hosted)
- **Access:** service role key only — full DB access, used server-side only
- **Key env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Client:** `@supabase/supabase-js` v2

---

## 8. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `FIRECRAWL_API_KEY` | ✅ | Firecrawl API key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `CRON_SECRET` | ✅ | Bearer token for job endpoints — set same value in Vercel |
| `WORDPRESS_IMPORT_BASE_URL` | ❌ | Optional base URL override for hosted WordPress artifact JSON files |

---

## 9. Cron Scheduling

Vercel runs the pipeline automatically every day:

| Time (UTC) | Endpoint | Action |
|---|---|---|
| 13:00 | `POST /api/jobs/daily-products` | discover + score + store products |
| 13:15 | `POST /api/jobs/daily-posts` | generate + store posts for new products |

Vercel passes the `CRON_SECRET` automatically as the `Authorization: Bearer` header for these scheduled calls.

To trigger manually (from repo root):

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
```

---

## 10. V1 Constraints / Known Limits

- **One rule only** (`nerdy-mugs`). To add more rules, extend `lib/products.ts`.
- **10 products per run max by default.** Change `RULE.dailyCount`.
- **One post per product** — enforced by unique constraint on `posts(product_id)`.
- **No pagination** beyond the `limit` param — always returns most recent first.
- **No auth on GET endpoints** — data is public by design.
- **Vercel function timeout**: default 10s. The `daily-products` job runs ~60–90s (Firecrawl + OpenAI latency). On Vercel Hobby, this may timeout. Upgrade to Pro for 300s max duration, or set `maxDuration` in route config.

---

## 11. Next Layer — What Comes Next

V1 exposes a clean, stable JSON API. The next application layer can:

- Build a **product listing page** consuming `GET /api/products/recent`
- Build a **post/article page** consuming `GET /api/posts/recent` with `body_md` rendered as markdown
- Build a **post detail page** by slug — add `GET /api/posts/[slug]` endpoint
- Add **more discovery rules** (different product categories) by extending `RULE` in `lib/products.ts`
- Add **affiliate link wrapping** in post generation prompts
- Add **social sharing** by pushing `posts` data to Twitter/Instagram APIs
- Connect the existing `whole-maching-in-progress/` frontend to these endpoints as the data layer it was originally intended to consume
