# OCC Clockwork Wizards - Changelog

## 2026-05-28 - v1.0.4: Public Release Controls + Junk Cleanup Jobs

### Added
- `POST /api/jobs/delete-bad-posts`
  - Authenticated cleanup job for deleting obviously broken junk posts such as the imported `Custom Styles` / `wp-global-styles-*` records.
- `POST /api/jobs/stagger-post-release`
  - Authenticated scheduling job that keeps a fixed number of posts live now and assigns future `scheduled_for` dates to the rest at a configurable interval.
- `lib/publicPosts.ts`
  - Shared public-visibility helpers for CORS, scheduled visibility, and junk-pattern detection.

### Changed
- `GET /api/posts/ready`
  - Now returns only publicly visible posts.
  - A post is public when:
    - `status` is `published`, or
    - `status` is `ready` and `scheduled_for <= now`, or
    - `status` is `ready` and `scheduled_for` is empty.
- `GET /api/posts/[slug]`
  - Now applies the same public-visibility rule as the ready feed so future scheduled posts do not leak early.

### Live Operations
- Deleted 3 junk posts:
  - `wp-global-styles-mesa-wpex`
  - `wp-global-styles-abisko`
  - `wp-global-styles-twentytwentythree`
- Applied staggered release policy:
  - `30` posts live now
  - `118` future posts scheduled
  - next release date: `2026-05-31T12:00:00.000Z`
  - cadence: one additional post every 3 days

### Verified
- `npm run build` passes.
- Live `/api/posts/ready?limit=250` returns `30` posts after scheduling.
- Live current slug returns `200`.
- Live future scheduled slug returns `404`.

### Version
- Bumped backend package version from `1.0.3` to `1.0.4`.

## 2026-05-28 - v1.0.3: Larger Ready Feed for SEO Builds

### Changed
- Increased `/api/posts/ready` maximum `limit` from 100 to 250 so the NerdyMugs static SEO build can fetch the full ready inventory.

### Version
- Bumped backend package version from `1.0.2` to `1.0.3`.

## 2026-05-28 - v1.0.2: Detail Endpoint CORS + Live Frontend Integration

### Fixed
- **Post Detail CORS**: `GET /api/posts/[slug]` now returns CORS headers on success and error responses.
- **Preflight Support**: Added `OPTIONS` handling for `/api/posts/[slug]`.
- **Frontend Flow Unblocked**: NerdyMugs can now fetch individual post details from the live backend after a grid card click.

### Verified
- `npm run build` passes.
- Live slug endpoint returns `Access-Control-Allow-Origin: *`.
- Live slug endpoint returns `{ post }` JSON for generated posts.
- Live `OPTIONS` request returns `204` with CORS headers.

### Version
- Bumped backend package version from `1.0.1` to `1.0.2`.

## 2026-05-28 - WP Cleanup: Hide Imageless Posts + Fallback Amazon Links

### Changes
- **New API Route**: `POST /api/jobs/hide-no-image-posts`
  - Finds all WordPress-imported posts where the linked product has no image
  - Marks them `status = 'needs_review'` so they stop appearing in feeds (not deleted)
  - Also sets their product URLs to Amazon search with affiliate tag `georgwebsi-20`
  - Goal: Stop showing placeholder-only posts to users
- **Enhanced API Route**: `POST /api/jobs/repair-affiliate-links`
  - Added fallback mechanism: if a post has no match in `amazon-url-mappings.json`,
    it now generates `https://www.amazon.com/s?k=ENCODED_TITLE&tag=georgwebsi-20`
  - Result: ZERO posts should link to `nerdymugs.com` after running this job
- **Type Update**: Added `needs_review` to valid `PostStatus` enum
- **Affiliate Tag Confirmed**: `georgwebsi-20` used for all Amazon search links

### Impact
- No more `nerdymugs.com` product links in the live app
- Posts without images are hidden from public view but preserved in DB
- All remaining visible posts have either:
  - Proper Amazon product URLs (from mappings file), OR
  - Amazon search URLs (fallback that still carries affiliate tag)

## 2026-05-27 - Evening Update: Image Placeholder Fix

### Fixed
- **SEO Preservation**: Posts without images now stay live with fun placeholder
  - Removed image filtering from WordPress import logic
  - All posts kept regardless of image availability (SEO > perfect images)
  - Added nerdy "Image Coming Soon" placeholder for missing images
  - Placeholder applied at API response time (clean database, easy to identify missing images)

### Added
- `lib/placeholders.ts` - Image placeholder utility functions
- Fun, on-brand placeholder: "🤓 Nerdy Mug Image Coming Soon!"
- Placeholder logic in all product API endpoints:
  - `/api/products/recent`
  - `/api/products/latest`
  - `/api/products/trending`

### Impact
- **More SEO value**: All content pages stay indexed by Google
- **Better UX**: No broken images, professional placeholder shown
- **Easy maintenance**: Database tracks `null` images for future manual fixes

---

## 2026-05-27 - WordPress Import & Affiliate Link Repair

### Added
- **WordPress Import Complete**: 149 legacy posts imported from original NerdyMugs site
  - All posts accessible via `/api/posts/recent` and `/api/posts/{slug}`
  - Legacy URL paths preserved for SEO/redirects
  - Original publish dates maintained
  - Content source marked as `wordpress-import`

- **Affiliate Link Repair System**
  - Created `/api/jobs/repair-affiliate-links` route
  - Added `lib/amazon-url-mappings.json` with correct Amazon affiliate URLs
  - Auto-repairs broken nerdymugs.com links → Amazon affiliate links
  - Updates both `posts` and `products` tables

### Fixed
- **74 broken affiliate links** - posts pointing to nerdymugs.com instead of Amazon
  - 56 posts auto-repaired with source Amazon URLs
  - ~18 posts flagged for manual URL entry

### Data Quality Issues Identified
- Corrupted content: Some posts contain JSON/code fragments
- Missing images: 47 posts without product images
- Stock photos: Generic/repeated images on multiple products
- See `LEGACY_POST_REPAIR_PLAN_2026-05-27.md` for detailed cleanup strategy

### Files Added
- `app/api/jobs/import-wordpress/route.ts` - WordPress import endpoint
- `app/api/jobs/repair-affiliate-links/route.ts` - Affiliate link repair endpoint
- `lib/wordpressImport.mjs` - Import utility functions
- `lib/amazon-url-mappings.json` - Source Amazon URL mappings
- `scripts/repair-affiliate-links.mjs` - CLI repair tool
- `LEGACY_POST_REPAIR_PLAN_2026-05-27.md` - Repair strategy documentation
- `WP_LIVE_IMPORT_EXECUTION_PLAN_2026-05-27.md` - Import execution plan

### Migration Changes
- `supabase/migrations/20260526203000_add_legacy_post_fields.sql`
  - Added `legacy_source_url` field
  - Added `legacy_source_path` field  
  - Added `content_source` field

## Next Steps
1. ✅ WordPress posts imported
2. 🔄 Affiliate links being repaired (in progress)
3. 📋 Build admin UI for content quality cleanup
4. 🎯 Progressive content improvement via admin dashboard

---

## Previous Entries

### 2026-05-26 - Initial OCC Setup
- Created OCC (Offline Content Creation) backend
- Implemented inventory lifecycle fields
- Set up automated posting workflows
- Configured Supabase database
