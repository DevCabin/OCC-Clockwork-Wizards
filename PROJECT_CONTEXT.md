# NerdyMugs Project Context

## Last Updated: 2026-05-28 5:45 PM CDT

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
- Version: `1.0.2`
- API endpoint `/api/posts/ready` returns posts with CORS headers
- API endpoint `/api/posts/[slug]` now returns individual post data with CORS headers
- 151 posts in "ready" status with product data
- Response includes: id, title, slug, excerpt, body_md, products.image_url
- CORS headers active: `access-control-allow-origin: *`

### Frontend (NerdyMugs-The-Machine) ✅
- Version: `2.3.3`
- Live frontend now serves NerdyMugs bundle with cache-busting query string
- Grid loads posts from `/api/posts/ready?limit=100`
- Cards open in-app detail view
- Detail view fetches `/api/posts/[slug]`
- Detail CTA links to Amazon through `post.product_url`
- Top posts display Amazon product images; lower missing images are acceptable for now

## Recently Fixed

- Vercel CDN stale bundle issue fixed with Vite build-time cache buster (`?v=2.2`)
- Frontend posts feed CORS preflight issue fixed by removing custom request headers
- Frontend image shape mismatch fixed (`products` can be object or array)
- Backend post detail CORS fixed on `/api/posts/[slug]`

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
1. User live-test full flow: grid → detail page → Amazon CTA
2. Spot-check several Amazon CTAs for correct affiliate destinations
3. Defer missing image cleanup unless it blocks launch quality
4. Later SEO upgrade: real slug URLs instead of SPA-only selected detail state

## Key Files to Modify
- `NerdyMugs-The-Machine/app/src/App.tsx` - Grid fetch + SPA detail state
- `NerdyMugs-The-Machine/app/src/components/ProductCard.tsx` - Card image rendering and click target
- `NerdyMugs-The-Machine/app/src/components/PostDetail.tsx` - Detail fetch + Amazon CTA
- `NerdyMugs-The-Machine/app/vite.config.ts` - Cache-busting transform
- `OCC-Clockwork-Wizards/app/api/posts/[slug]/route.ts` - Detail endpoint with CORS

## Important Notes
- Backend API is working correctly
- All 151 posts are ready in database
- Frontend and backend are live/Vercel-first; no local dev server workflow needed
- Missing images are not the current priority
- Current detail pages are SPA state, not directly routable SEO pages yet
