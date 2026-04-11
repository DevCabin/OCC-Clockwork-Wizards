# TODO.md - NerdyMugs Development Tasks

## Active Task: Make discovery real + production-ready (PA-API + roadmap)

**Status**: In progress  
**Updated**: 2026-04-11

### What we changed today (facts)
We iterated through several approaches because the app was showing fake/simulated data and web-search results:

1) **Brave Search proxy (no scraping)**
- Added `api/search.js` (Brave Search API proxy)
- Added `api/og-image.js` (OpenGraph image fallback)
- Mapped search results into the app's `Product` shape
- Removed the silent fallback to simulated products
- Bumped the localStorage DB key to force-reset stale fake data

2) **Vercel deployment issues we fixed**
- Deployment protection (401) was blocking `/api/*`
- SSH push from `gravitron` required adding a new GitHub SSH key

3) **Decision: move back to a real product API**
Web search is not product data (wrong results, Amazon logo images, missing price). We decided to use **Amazon PA-API** server-side.

4) **PA-API implementation shipped (server-side, no client secrets)**
- Vercel env vars renamed away from `VITE_*` (client) to `PAAPI_*` (server)
- Added `api/paapi-search.js` using `amazon-paapi`
- Switched frontend discovery to call `/api/paapi-search`

### Current deployment URL
- https://occ-clockwork-wizards-git-main-devcabins-projects.vercel.app/

### Environment variables (Vercel)
#### MUST be server-side only (do NOT prefix with VITE_)
- `PAAPI_ACCESS_KEY`
- `PAAPI_SECRET_KEY`
- `PAAPI_PARTNER_TAG`
- `PAAPI_HOST=webservices.amazon.com`
- `PAAPI_REGION=us-east-1`

#### Remove (unsafe / wrong place)
- `VITE_AMAZON_ACCESS_KEY`
- `VITE_AMAZON_SECRET_KEY`
- `VITE_AMAZON_ASSOCIATE_TAG`

### Step-by-step action plan (finish line)

#### Phase 0: Verify PA-API is actually returning products (15 minutes)
1) Wait for Vercel redeploy.
2) Test endpoint directly:
   - `POST /api/paapi-search`
   - Body: `{ "keywords": "star trek mug", "itemCount": 3, "searchIndex": "All" }`
3) Expected: `200 { products: [ { asin, title, imageUrl, price, productUrl, features } ... ] }`
4) If error:
   - capture the JSON `{ error, message }`
   - fix env vars/region/partnerTag/signing issues accordingly

#### Phase 1: Make the site experience sane (public vs admin) (1–2 hours)
1) Separate routes:
   - Public: `/` (browse + filters only)
   - Admin: `/admin` (Run Now, config, import)
2) Gate `/admin`:
   - simplest: basic password gate via env var (stopgap)
   - best: Supabase Auth (when DB migration begins)
3) Remove any “generate posts” controls from the public UI.

#### Phase 2: Database migration (Supabase) (half day)
Goal: eliminate localStorage, make content shared across devices.
1) Create Supabase project.
2) Tables:
   - `categories`
   - `products` (asin unique)
   - `posts` (product_id FK)
   - optional: `logs`, `runs`
3) Update `db.ts` layer to read/write Supabase instead of localStorage.
4) Add a simple admin “seed categories” and “run discovery” that persists.

#### Phase 3: Automation (blog-like cadence) (1–2 hours)
1) Add Vercel Cron (or Supabase scheduled function) to run discovery daily.
2) Create N posts/day and publish.

### Notes / decisions
- Amazon APIs must be called server-side only.
- Web search is acceptable for prototypes, but it will always be noisy and image/price-poor.
- We will treat fake/simulated products as a dev-only tool, not production behavior.

---

## Completed Tasks

### v1.0.0 - Initial Production Deployment (2025-04-10)
- ✅ Deployed to Vercel
- ✅ WordPress import (169 posts)
- ✅ Generated 301 redirects
- ✅ Created CHANGELOG.md and README.md
- ✅ Initial git commit and push

---

## Future Tasks

### v1.1.0 - Automation & Social
- [ ] Set up Vercel cron jobs (3 posts/day)
- [ ] X/Twitter auto-posting integration
- [ ] Supabase migration (replace localStorage)

### v1.2.0 - Domain & Analytics
- [ ] Configure custom domain (nerdymugs.com)
- [ ] Add analytics dashboard
- [ ] A/B testing for content

---

**Note**: When completing a task, move it to CHANGELOG.md under the appropriate version, then update TODO.md to mark complete or remove.