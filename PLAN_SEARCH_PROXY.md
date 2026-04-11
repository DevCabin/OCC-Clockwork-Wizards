# Plan: Replace Amazon API with a Search Proxy (No Scraping)

This project currently calls `/api/amazon-search` (Vercel Serverless Function) which depends on Amazon credentials and frequently fails locally (Vite dev server does not serve Vercel functions).

This plan replaces the Amazon dependency with a simple, reliable search proxy endpoint using a 3rd-party search API (recommended: Brave Search API). It avoids scraping Amazon, reduces brittleness, and keeps local dev + Vercel deploy consistent.

## Goal (finish line)
- Frontend can search for mugs reliably.
- No Amazon credential setup required.
- Works locally and on Vercel.

## High-level design
- Add a new Vercel Serverless Function: `api/search.js`.
- Frontend calls `POST /api/search` with `{ query, count?, site? }`.
- Server function calls Brave Search API, normalizes results, and returns `{ results: [...] }`.
- Optional: constrain results to Amazon (`site:amazon.com`) or to broader web results.

## Prerequisites
1) Create a Brave Search API key.
   - Provider: Brave Search API
   - Variable name to use in Vercel: `BRAVE_SEARCH_API_KEY`

## Environment variables
### Vercel (required)
- `BRAVE_SEARCH_API_KEY` (Production and Preview as needed)

### Local dev (required)
Create a local env file used by `vercel dev`:
- File: `.env.local` at repo root (same level as `vercel.json`)
- Add:
  - `BRAVE_SEARCH_API_KEY=...your key...`

Note: Vite `.env` files are NOT used by serverless functions. Serverless functions use Vercel env.

## Local development (important)
Because the frontend calls `/api/*`, the easiest local dev is to run **Vercel dev** so both the SPA and serverless functions are served together.

### Run locally
From repo root:
```bash
npm install
cd app && npm install
cd ..

# Run Vercel dev (serves frontend + /api routes)
vercel dev
```
Open the URL Vercel prints.

If you prefer to run Vite directly (`cd app && npm run dev`), you must add a dev proxy in `vite.config.ts` to forward `/api` to wherever your functions run. The plan recommends `vercel dev` instead.

## API contract
### Request
`POST /api/search`

Body:
```json
{
  "query": "star trek coffee mug",
  "count": 5,
  "site": "amazon.com"
}
```

### Response
```json
{
  "results": [
    {
      "title": "...",
      "url": "https://...",
      "description": "...",
      "source": "brave"
    }
  ]
}
```

## Implementation steps
1) Add `api/search.js`
   - Validate `req.method === 'POST'`
   - Validate `query` string
   - Read `BRAVE_SEARCH_API_KEY` from env
   - Call Brave endpoint:
     - `GET https://api.search.brave.com/res/v1/web/search?q=...`
     - Headers: `Accept: application/json`, `X-Subscription-Token: <key>`
   - If `site` provided, prepend `site:<site>` to query.
   - Normalize results into a small shape.
   - Add CORS headers (same as current function).

2) Wire frontend to new endpoint
   - Update `app/src/lib/amazon.ts`:
     - Change endpoint constant to `/api/search`.
     - Adjust `searchAmazonProducts()` to call `/api/search` with `{ query }`.
     - Map results into the current product shape for UI compatibility.
       - `title` from result title
       - `productUrl` from result url
       - `imageUrl` may be empty initially
       - `price` empty/"" initially
       - `asin` can be a stable hash of URL or a slug (until real product IDs exist)
   - Keep the rest of the app unchanged initially (ship the fix first).

3) Update docs
   - Update README: remove Amazon credential steps.
   - Add new section: "Search proxy" and "BRAVE_SEARCH_API_KEY".

4) Optional improvements (after unblocked)
   - Add result-to-product enrichment (OpenGraph image fetch, or a separate image lookup).
   - Add basic caching in the serverless function (Vercel edge caching headers).
   - Add rate limiting.

## Definition of done
- Local: `vercel dev` -> searching in the UI returns non-empty results.
- Production: deployed Vercel app returns results with the same UI.
- No dependency on Amazon API credentials.

## Notes / tradeoffs
- This avoids scraping and reduces breakage.
- If you constrain to `site:amazon.com`, Amazon URLs still show up, but you are not scraping Amazon HTML.
- Prices/images are not guaranteed from general web search results. If you need those, we can add a separate enrichment step later.
