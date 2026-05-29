# NerdyMugs Project Context

## Last Updated: 2026-05-28 8:30 PM CDT

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
- Version: `1.0.3`
- API endpoint `/api/posts/ready` returns posts with CORS headers
- API endpoint `/api/posts/ready` accepts build-friendly limits up to 250
- API endpoint `/api/posts/[slug]` now returns individual post data with CORS headers
- 151 posts in "ready" status with product data
- Response includes: id, title, slug, excerpt, body_md, products.image_url
- CORS headers active: `access-control-allow-origin: *`

### Frontend (NerdyMugs-The-Machine) ✅
- Version: `2.3.10`
- Live frontend now serves NerdyMugs bundle with cache-busting query string
- Grid loads posts from `/api/posts/ready?limit=100`
- Cards are real links and open clean detail URLs
- Legacy posts use preserved paths like `/comics/iron-man-ceramic-mug-no-handle-12-ounces`
- Generated posts use `/mugs/{slug}`
- Production builds generate static HTML for clean post URLs with per-post title, description, canonical, Open Graph, Twitter card, JSON-LD, and fallback article content
- Production builds emit `sitemap.xml` and `robots.txt`
- Post body copy is formatted into readable paragraphs, section headings, feature lists, and note-style `P.S.` blocks
- Legacy standalone pages now exist at their original URLs, including `/about-nerdy-mugs/` and `/random-mugs/`
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

## Repositories
- **OCC-Clockwork-Wizards**: `/Users/george/GITHUB/OCC-Clockwork-Wizards`
- **NerdyMugs-The-Machine**: `/Users/george/GITHUB/NerdyMugs-The-Machine/app`

## API Endpoints Available
- `GET /api/posts/ready?limit=100` - Returns ready/published posts
- `GET /api/posts/recent?limit=100` - Returns all posts regardless of status
- `GET /api/posts/{slug}` - Returns a single post for the detail page
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
1. User live-test full flow: grid → static clean detail URL → back to grid → Amazon CTA
2. Spot-check several Amazon CTAs for `tag=georgwebsi-20`
3. Inspect live post source for per-post metadata and fallback article content
4. Defer missing image cleanup unless it blocks launch quality

## Key Files to Modify
- `NerdyMugs-The-Machine/app/src/App.tsx` - Grid fetch + SPA detail state
- `NerdyMugs-The-Machine/app/src/components/ProductCard.tsx` - Card image rendering and click target
- `NerdyMugs-The-Machine/app/src/components/PostDetail.tsx` - Detail fetch + Amazon CTA
- `NerdyMugs-The-Machine/app/scripts/generate-static-pages.mjs` - Static post HTML, sitemap, and robots generation
- `NerdyMugs-The-Machine/app/vite.config.ts` - Cache-busting transform
- `NerdyMugs-The-Machine/app/vercel.json` - SPA rewrite for clean post paths
- `OCC-Clockwork-Wizards/app/api/posts/[slug]/route.ts` - Detail endpoint with CORS

## Important Notes
- Backend API is working correctly
- All 151 posts are ready in database
- Frontend and backend are live/Vercel-first; no local dev server workflow needed
- Missing images are not the current priority
- Clean URLs now have generated static HTML for the ready posts returned during build
- Vercel fallback still covers paths that do not have generated static HTML
