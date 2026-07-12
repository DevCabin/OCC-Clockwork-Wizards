# NerdyMugs Project Context

## Last Updated: 2026-07-05 3:46 PM CDT

## Project Goal
Build a working coffee mug affiliate website with:
- **Frontend**: React grid displaying mug posts (NerdyMugs-The-Machine)
- **Backend**: Next.js API providing posts (OCC-Clockwork-Wizards)
- **Data**: Supabase with posts + products tables, plus weekly loop tables
- **Images**: Amazon product images
- **Flow**: Grid view → click card → detail page → Amazon CTA
- **Autonomous weekly loop**: discovery → review → generation → publication

## Current URLs
- **Frontend**: https://nerdymugs-the-machine.vercel.app
- **Backend API**: https://app-liart-five-43.vercel.app

## Current Status (Last Known)

### Backend (OCC-Clockwork-Wizards) ✅
- Version: `2.0.2`
- API endpoint `/api/posts/ready` returns only currently public posts with CORS headers
- API endpoint `/api/posts/ready` now excludes posts whose linked product has no `image_url`
- API endpoint `/api/posts/ready` accepts build-friendly limits up to 250
- API endpoint `/api/posts/[slug]` now returns individual post data with CORS headers
- Weekly autonomous loop implemented:
  - `weekly_discovery_rules` table for rule configuration
  - `weekly_product_candidates` table for discovered products awaiting review
  - `content_generation_runs` table for generation job tracking
  - `POST /api/jobs/weekly-discovery` runs weekend discovery
  - `POST /api/jobs/generate-weekly-posts` turns candidates into ready posts
- Admin API endpoints added under `/api/admin/*` for the NerdyMugs `/admin` page:
  - rule CRUD, candidate status updates, job triggers, password verification
- `admin_settings` table stores the admin gate password (initial: `NERDYMUGS1234!`)
- Cron schedule: Saturday 14:00 UTC discovery, Monday 15:00 UTC generation
- Security review completed on 2026-05-30
- 3 junk `Custom Styles` / `wp-global-styles-*` posts deleted from the live database
- Response includes: id, title, slug, excerpt, body_md, products.image_url
- CORS headers active: `access-control-allow-origin: *`

### Frontend (NerdyMugs-The-Machine) ✅
- Version: `2.4.0`
- Live frontend now serves NerdyMugs bundle with cache-busting query string
- Grid loads posts from `/api/posts/ready?limit=100`
- Cards are real links and open clean detail URLs
- Legacy posts use preserved paths like `/comics/iron-man-ceramic-mug-no-handle-12-ounces`
- Generated posts use `/mugs/{slug}`
- Production builds generate static HTML for clean post URLs with per-post title, description, canonical, Open Graph, Twitter card, JSON-LD, and fallback article content
- Production builds emit `sitemap.xml` and `robots.txt`
- Production builds now emit `rss.xml`, `sitemap.xml`, and `robots.txt`
- Post body copy is formatted into readable paragraphs, section headings, feature lists, and note-style `P.S.` blocks
- Legacy standalone pages now exist at their original URLs, including `/about-nerdy-mugs/` and `/random-mugs/`
- Header now includes a simple mobile-responsive site menu
- Footer now includes copyright plus a sitemap link
- Static generator supports `NERDYMUGS_SITE_URL` so canonicals, sitemap, and robots can switch cleanly during domain cutover
- Detail view fetches `/api/posts/[slug]`
- Header logo/brand links back to the homepage
- Browser back and `Back to all posts` return from detail view to grid
- Detail CTA links to Amazon through `post.product_url` with `tag=georgwebsi-20`
- Public posts require usable product images; missing or broken images are handled by the repair workflow before release.

## Recently Fixed

- Vercel CDN stale bundle issue fixed with Vite build-time cache buster (`?v=2.2`)
- Frontend posts feed CORS preflight issue fixed by removing custom request headers
- Frontend image shape mismatch fixed (`products` can be object or array)
- Backend post detail CORS fixed on `/api/posts/[slug]`
- Frontend back navigation fixed with `?post={slug}` URL state
- Frontend Amazon links now force associate tag `georgwebsi-20`
- Frontend clean permalink routing added for `/{category}/{post-title}` paths
- Vercel rewrite fallback added so direct clean URL visits load the SPA
- Frontend static post HTML generation added for real per-post SEO metadata
- Backend ready feed limit increased so static SEO builds can cover the full ready inventory
- Frontend logo/brand home link added
- Frontend post body formatter added for better readability in live and static pages
- Frontend legacy standalone pages recreated in the new simple site style
- Frontend build can now target the final custom domain for generated SEO metadata
- Backend bad-post cleanup job added and executed live
- Backend staggered publishing job added and executed live
- Frontend responsive nav/footer added so standalone and static pages feel like one site
- Frontend static rebuild now matches the reduced 30-post public launch state

## Repositories
- **OCC-Clockwork-Wizards**: `/Users/george/GITHUB/OCC-Clockwork-Wizards`
- **NerdyMugs-The-Machine**: `/Users/george/GITHUB/NerdyMugs-The-Machine/app`

## API Endpoints Available

### Public Read Endpoints
- `GET /api/posts/ready?limit=100` - Returns the public feed used by the frontend grid
- `GET /api/posts/ready?limit=250` - Returns the full currently public set for audits/builds
- `GET /api/posts/{slug}` - Returns a single public post for the detail page

### Internal/Audit Endpoints
- `GET /api/posts/recent?limit=100` - Returns recent public, scheduled-visible posts with usable images

### Weekly Loop Job Endpoints (CRON_SECRET required)
- `POST /api/jobs/weekly-discovery` - Runs weekend discovery against active rules
- `POST /api/jobs/generate-weekly-posts` - Turns approved/high-score candidates into ready posts
- `POST /api/jobs/delete-bad-posts` - Deletes broken junk posts such as imported `Custom Styles`
- `POST /api/jobs/stagger-post-release` - Keeps a fixed number of posts live and schedules the rest forward
- `POST /api/jobs/mark-no-image-posts` - Marks posts without images as "needs_image"
- `POST /api/jobs/mark-broken-images` - Marks posts with WP images as "needs_image"
- `POST /api/jobs/restore-all` - Restores all posts to "ready" status
- `POST /api/jobs/restore-posts-with-images` - Restores only posts with valid images

### Admin Endpoints (for NerdyMugs `/admin` page)
- `POST /api/admin/verify-password` - Validates admin password
- `GET /api/admin/rules` - Lists weekly discovery rules
- `POST /api/admin/rules` - Creates a weekly discovery rule
- `PATCH /api/admin/rules/{id}` - Updates a weekly discovery rule
- `DELETE /api/admin/rules/{id}` - Deletes a weekly discovery rule
- `GET /api/admin/candidates` - Lists this week's product candidates
- `POST /api/admin/candidates` - Updates candidate status
- `POST /api/admin/trigger-discovery` - Runs discovery from the admin UI
- `POST /api/admin/trigger-generation` - Runs generation from the admin UI

## CRON_SECRET for API Jobs

Use a local env lookup at runtime. Do not paste literal secret values into repo docs.

## Working Commands
```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

# Mark posts without images
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/mark-no-image-posts" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"dryRun": false}'

# Restore all posts
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/restore-all" \
  -H "Authorization: Bearer $CRON_SECRET"

# Check if API returns posts
curl -sS "https://app-liart-five-43.vercel.app/api/posts/ready?limit=3"
```

## Next Steps (To Complete)
1. Apply the `admin_settings` migration to the live Supabase database.
2. Merge `DEV` → `main` in both repos and deploy to Vercel.
3. Verify `https://www.nerdymugs.com/admin` loads the password gate.
4. Rotate `CRON_SECRET` in Vercel and local env files because the old value was documented in repo notes.
5. Keep `/api/posts/recent` filtered to public-only content.
6. Point `nerdymugs.com` and `www.nerdymugs.com` at this Vercel frontend (if not already done).
7. Set frontend env `NERDYMUGS_SITE_URL=https://nerdymugs.com` and redeploy after domain cutover.
8. Use Supabase or the `/admin` page to improve scheduled posts before they go live, especially missing `image_url` values in `products`.
9. Redeploy the frontend after future release batches if you want fresh static HTML and sitemap entries for newly public posts.

## Key Files to Modify
- `NerdyMugs-The-Machine/app/src/App.tsx` - Grid fetch + SPA detail state + `/admin` route
- `NerdyMugs-The-Machine/app/src/components/AdminPage.tsx` - Admin dashboard UI
- `NerdyMugs-The-Machine/app/src/components/Navigation.tsx` - Responsive top menu
- `NerdyMugs-The-Machine/app/src/components/SiteFooter.tsx` - Footer links and copyright
- `NerdyMugs-The-Machine/app/src/components/ProductCard.tsx` - Card image rendering and click target
- `NerdyMugs-The-Machine/app/src/components/PostDetail.tsx` - Detail fetch + Amazon CTA
- `NerdyMugs-The-Machine/app/scripts/generate-static-pages.mjs` - Static post HTML, sitemap, and robots generation
- `NerdyMugs-The-Machine/app/vite.config.ts` - Cache-busting transform
- `NerdyMugs-The-Machine/app/vercel.json` - SPA rewrite for clean post paths
- `OCC-Clockwork-Wizards/app/api/admin/*` - Admin endpoints for rules/candidates/jobs
- `OCC-Clockwork-Wizards/lib/adminAuth.ts` - Admin password verification
- `OCC-Clockwork-Wizards/app/api/jobs/weekly-discovery/route.ts` - Weekly discovery job
- `OCC-Clockwork-Wizards/app/api/jobs/generate-weekly-posts/route.ts` - Weekly generation job
- `OCC-Clockwork-Wizards/app/api/posts/[slug]/route.ts` - Detail endpoint with CORS

## Important Notes
- Backend API public inventory and protected job boundaries have been hardened.
- 148 posts remain after junk cleanup
- Only 30 are intentionally public right now
- Future posts are date-gated at the API level and unlock automatically every 3 days
- Frontend and backend are live/Vercel-first; no local dev server workflow needed
- Missing images are not the current priority
- Clean URLs now have generated static HTML for the currently public posts returned during build
- Vercel fallback still covers paths that do not have generated static HTML
- Future scheduled posts will become accessible automatically via SPA fallback when their `scheduled_for` date arrives
- The old documented `CRON_SECRET` value should be treated as compromised until rotated
- `/api/posts/ready` and `/api/posts/[slug]` are the intended public read surfaces
- `/api/posts/recent` returns only public lifecycle data.

## How To Update Upcoming Posts

Use Supabase:

1. Open the `posts` table
2. Filter `status = ready`
3. Sort by `scheduled_for` ascending to see the release queue
4. Edit `title`, `excerpt`, `body_md`, `scheduled_for`, or `legacy_source_path` as needed
5. Copy `product_id`
6. Open the matching row in `products`
7. Update `image_url`, `product_url`, `title`, or `description`

Useful live checks:

- Public feed only: `https://app-liart-five-43.vercel.app/api/posts/ready?limit=250`
- Recent mixed inventory sample: `https://app-liart-five-43.vercel.app/api/posts/recent?limit=100`
