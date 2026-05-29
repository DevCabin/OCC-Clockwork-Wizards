# NerdyMugs Project Context

## Last Updated: 2026-05-28 9:38 PM CDT

## Project Goal
Build a working coffee mug affiliate website with:
- **Frontend**: React grid displaying mug posts (NerdyMugs-The-Machine)
- **Backend**: Next.js API providing posts (OCC-Clockwork-Wizards)
- **Data**: Supabase with posts + products tables
- **Images**: Amazon product images
- **Flow**: Grid view → click card → detail page → Amazon CTA

## Current URLs
- **Frontend**: https://nerdymugs-the-machine.vercel.app
- **Backend API**: https://app-liart-five-43.vercel.app

## Current Status (Last Known)

### Backend (OCC-Clockwork-Wizards) ✅
- Version: `1.0.4`
- API endpoint `/api/posts/ready` returns only currently public posts with CORS headers
- API endpoint `/api/posts/ready` accepts build-friendly limits up to 250
- API endpoint `/api/posts/[slug]` now returns individual post data with CORS headers
- 3 junk `Custom Styles` / `wp-global-styles-*` posts deleted from the live database
- 30 posts are live now
- 118 additional posts are scheduled to release automatically every 3 days starting `2026-05-31`
- Response includes: id, title, slug, excerpt, body_md, products.image_url
- CORS headers active: `access-control-allow-origin: *`

### Frontend (NerdyMugs-The-Machine) ✅
- Version: `2.3.11`
- Live frontend now serves NerdyMugs bundle with cache-busting query string
- Grid loads posts from `/api/posts/ready?limit=100`
- Cards are real links and open clean detail URLs
- Legacy posts use preserved paths like `/comics/iron-man-ceramic-mug-no-handle-12-ounces`
- Generated posts use `/mugs/{slug}`
- Production builds generate static HTML for clean post URLs with per-post title, description, canonical, Open Graph, Twitter card, JSON-LD, and fallback article content
- Production builds emit `sitemap.xml` and `robots.txt`
- Post body copy is formatted into readable paragraphs, section headings, feature lists, and note-style `P.S.` blocks
- Legacy standalone pages now exist at their original URLs, including `/about-nerdy-mugs/` and `/random-mugs/`
- Header now includes a simple mobile-responsive site menu
- Footer now includes copyright plus a sitemap link
- Static generator supports `NERDYMUGS_SITE_URL` so canonicals, sitemap, and robots can switch cleanly during domain cutover
- Detail view fetches `/api/posts/[slug]`
- Header logo/brand links back to the homepage
- Browser back and `Back to all posts` return from detail view to grid
- Detail CTA links to Amazon through `post.product_url` with `tag=georgwebsi-20`
- Top posts display Amazon product images; lower missing images are acceptable for now

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
- `GET /api/posts/ready?limit=100` - Returns the public feed used by the frontend grid
- `GET /api/posts/ready?limit=250` - Returns the full currently public set for audits/builds
- `GET /api/posts/recent?limit=100` - Returns all posts regardless of status
- `GET /api/posts/{slug}` - Returns a single post for the detail page
- `POST /api/jobs/delete-bad-posts` - Deletes broken junk posts such as imported `Custom Styles`
- `POST /api/jobs/stagger-post-release` - Keeps a fixed number of posts live and schedules the rest forward
- `POST /api/jobs/mark-no-image-posts` - Marks posts without images as "needs_image"
- `POST /api/jobs/mark-broken-images` - Marks posts with WP images as "needs_image"
- `POST /api/jobs/restore-all` - Restores all posts to "ready" status
- `POST /api/jobs/restore-posts-with-images` - Restores only posts with valid images

## CRON_SECRET for API Jobs
```
I2S43p7yND7Sz7SKBpgrxLkKUWq4BbaNWIsvRIgCnLA=
```

## Working Commands
```bash
# Mark posts without images
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/mark-no-image-posts" \
  -H "Authorization: Bearer I2S43p7yND7Sz7SKBpgrxLkKUWq4BbaNWIsvRIgCnLA=" \
  -d '{"dryRun": false}'

# Restore all posts
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/restore-all" \
  -H "Authorization: Bearer I2S43p7yND7Sz7SKBpgrxLkKUWq4BbaNWIsvRIgCnLA="

# Check if API returns posts
curl -sS "https://app-liart-five-43.vercel.app/api/posts/ready?limit=3"
```

## Next Steps (To Complete)
1. Point `nerdymugs.com` and `www.nerdymugs.com` at this Vercel frontend
2. Set frontend env `NERDYMUGS_SITE_URL=https://nerdymugs.com` and redeploy after domain cutover
3. Use Supabase to improve scheduled posts before they go live, especially missing `image_url` values in `products`
4. Redeploy the frontend after future release batches if you want fresh static HTML and sitemap entries for newly public posts

## Key Files to Modify
- `NerdyMugs-The-Machine/app/src/App.tsx` - Grid fetch + SPA detail state
- `NerdyMugs-The-Machine/app/src/components/Navigation.tsx` - Responsive top menu
- `NerdyMugs-The-Machine/app/src/components/SiteFooter.tsx` - Footer links and copyright
- `NerdyMugs-The-Machine/app/src/components/ProductCard.tsx` - Card image rendering and click target
- `NerdyMugs-The-Machine/app/src/components/PostDetail.tsx` - Detail fetch + Amazon CTA
- `NerdyMugs-The-Machine/app/scripts/generate-static-pages.mjs` - Static post HTML, sitemap, and robots generation
- `NerdyMugs-The-Machine/app/vite.config.ts` - Cache-busting transform
- `NerdyMugs-The-Machine/app/vercel.json` - SPA rewrite for clean post paths
- `OCC-Clockwork-Wizards/app/api/jobs/delete-bad-posts/route.ts` - Junk post deletion job
- `OCC-Clockwork-Wizards/app/api/jobs/stagger-post-release/route.ts` - Release scheduling job
- `OCC-Clockwork-Wizards/app/api/posts/[slug]/route.ts` - Detail endpoint with CORS

## Important Notes
- Backend API is working correctly
- 148 posts remain after junk cleanup
- Only 30 are intentionally public right now
- Future posts are date-gated at the API level and unlock automatically every 3 days
- Frontend and backend are live/Vercel-first; no local dev server workflow needed
- Missing images are not the current priority
- Clean URLs now have generated static HTML for the currently public posts returned during build
- Vercel fallback still covers paths that do not have generated static HTML
- Future scheduled posts will become accessible automatically via SPA fallback when their `scheduled_for` date arrives

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
