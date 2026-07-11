# OCC Clockwork Wizards - Changelog

## 2026-07-11 - Recover Images Before Publishing

### Fixed
- Image-less products stay in private inventory instead of being discarded. Invalid and synthetic image URLs remain rejected.
- Manual publishing now attempts to recover a matching product image first and refuses publication if none is found.

### Added
- `POST /api/jobs/prepare-scheduled-post-images` runs daily before scheduled releases. It recovers a real image for posts due in the next 30 hours, or moves an unresolved post to `needs_review` rather than publishing it image-less.
- `POST /api/jobs/repair-missing-post-images` repairs the existing backlog in small, opt-in batches. It detects both absent and HTTP-broken image URLs, supports targeting specific slugs, and saves only high-confidence matches scored from title, description, price, and product URL; uncertain records are preserved unchanged for review.
- Image recovery now falls back from an obsolete product URL to an Amazon search using the stored product title, while retaining the same high-confidence match requirement.
- Image-repair dry runs now return each proposed replacement URL alongside its confidence score for visual approval before a live update.

## 2026-07-06 - v2.0.4: No-Image Weekly Loop Cleanup

### Added
- `POST /api/jobs/delete-no-image-posts`
  - Protected by `CRON_SECRET`.
  - Dry-run by default (`{"dryRun": false}` to actually delete).
  - Finds posts whose linked product has no usable `image_url` and deletes both the post and the orphaned product row.

### Changed
- `POST /api/jobs/generate-weekly-posts`
  - Now skips candidates with no `image_url` instead of creating a "No image" post.
  - Skipped candidates are marked `status = 'needs_image'` with a clear error message.
  - Run summary now includes `posts_skipped_no_image`.

### Fixed
- `GET /api/posts/ready`
  - Switched to `products!inner(image_url)` join so posts without a linked product are excluded at the database level.
  - Added a code-level safety filter for null/empty `image_url` to prevent any remaining "No image" cards from leaking to NerdyMugs.

### Verified
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- New route `/api/jobs/delete-no-image-posts` is registered in the build output.

### Version
- Bumped backend package version from `2.0.3` to `2.0.4`.

## 2026-07-05 - v2.0.3: Admin API Hardening + Discovery Improvements


### Added
- `GET /api/admin/runs` — returns recent `content_generation_runs` for the admin dashboard.
- Discovery response now includes a `debug` array per rule showing search URLs, extraction counts, and filter/reject tallies.
- `POST /api/admin/rules/[id]` now supports `action: "delete"` as a reliable fallback for rule deletion.

### Changed
- `scoreProductWithOpenAI` now receives the actual weekly rule context instead of a hardcoded legacy rule.
- `buildAmazonSearchUrls` now generates more search URLs per rule:
  - Suffix variations: `mug`, `coffee mug`, `cup`, `travel mug`
  - Page 1 and page 2 for each query
  - Generic category queries included

### Fixed
- Rule deletion now works reliably from the NerdyMugs `/admin` UI.
- `DELETE /api/admin/rules/[id]` accepts password via query string as well as body.

### Verified
- `npm run build` passes.

### Version
- Bumped backend package version from `2.0.2` to `2.0.3`.

## 2026-07-05 - v2.0.2: Admin API for Weekly Loop

### Added
- `admin_settings` table to store the frontend admin gate password.
- Admin API endpoints under `/api/admin/*`:
  - `POST /api/admin/verify-password` — validates admin password.
  - `GET /api/admin/rules` — list `weekly_discovery_rules`.
  - `POST /api/admin/rules` — create a rule.
  - `PATCH /api/admin/rules/[id]` — update a rule.
  - `DELETE /api/admin/rules/[id]` — delete a rule.
  - `GET /api/admin/candidates` — list this week's `weekly_product_candidates`.
  - `POST /api/admin/candidates` — update candidate status.
  - `POST /api/admin/trigger-discovery` — run weekly discovery job.
  - `POST /api/admin/trigger-generation` — run weekly post generation job.
- `lib/adminAuth.ts` — shared admin password verification helper.

### Security
- Admin endpoints validate the password against Supabase; no `CRON_SECRET` is exposed to the frontend.
- Trigger endpoints call protected job endpoints server-side using `CRON_SECRET`.

### Verified
- `npm run build` passes.

### Version
- Bumped backend package version from `2.0.1` to `2.0.2`.

## 2026-07-05 - v2.0.1: Public Feed Excludes Imageless Posts

### Changed
- `GET /api/posts/ready`
  - Now filters out posts whose linked product has no `image_url`.
  - Goal: Remove "No image" placeholder cards from the NerdyMugs public grid while preserving the posts in the database for future image updates.

### Verified
- `npm run build` passes.

### Version
- Bumped backend package version from `2.0.0` to `2.0.1`.

## 2026-06-27 - v2.0.0: Weekly Autonomous Content Loop

### Added
- **Phase 1: Security Hardening**
  - Added CRON_SECRET protection to `/api/jobs/update-product-image`
  - Disabled WordPress import endpoint (returns 410, phase complete)
  
- **Phase 2: Data Model**
  - `weekly_discovery_rules` table - stores user-defined discovery rules
  - `weekly_product_candidates` table - stores discovered products awaiting review
  - `content_generation_runs` table - tracks generation job runs
  - New TypeScript types and Zod schemas in `lib/types.ts`
  - Auto-update triggers for `updated_at` columns
  
- **Phase 3: Weekly Discovery Job**
  - `POST /api/jobs/weekly-discovery` endpoint
  - Protected by CRON_SECRET
  - Loads active rules, builds Amazon search queries
  - Uses Firecrawl + OpenAI for extraction and scoring
  - Stores candidates with deduplication
  
- **Phase 4: Post Generation Job**
  - `POST /api/jobs/generate-weekly-posts` endpoint
  - Protected by CRON_SECRET
  - Selects approved/high-confidence candidates
  - Generates posts using OpenAI
  - Stores in existing posts/products tables
  - Updates candidate status and links to posts
  
- **Phase 6: Loop Harness**
  - Updated `vercel.json` with weekly cron schedules:
    - Saturday 14:00 UTC: weekly-discovery
    - Monday 15:00 UTC: generate-weekly-posts
  - Documentation in `/docs`:
    - `LOOP_ARCHITECTURE.md` - full system architecture
    - `AGENT_RULES.md` - what agents can/cannot change
    - `WEEKLY_CONTENT_LOOP.md` - user guide
    - `EVALS.md` - testing checklist

### Behavior
- Weekend: OCC discovers products based on weekly rules
- Early week: OCC generates posts from approved candidates
- NerdyMugs: Only reads public endpoints, renders content

### Loop Success Criteria Met
- ✅ Protected endpoints reject requests without CRON_SECRET
- ✅ Weekly rules can create product candidates
- ✅ Approved candidates become scheduled posts
- ✅ Existing public NerdyMugs pages still work
- ✅ OCC builds successfully
- ✅ Documentation explains autonomous loop

## 2026-06-26 - Weekly Loop Refactor Plan Added

### Added
- `REFACTOR.md` — comprehensive 6-phase plan to refactor the system into a weekly autonomous content engine:
  - Phase 1: Security hardening (protect endpoints, restrict WordPress import, audit `/api/posts/recent`)
  - Phase 2: New Supabase tables (`weekly_discovery_rules`, `weekly_product_candidates`, `content_generation_runs`)
  - Phase 3: `POST /api/jobs/weekly-discovery` endpoint
  - Phase 4: `POST /api/jobs/generate-weekly-posts` endpoint
  - Phase 5: Frontend simplification in NerdyMugs
  - Phase 6: Loop documentation and cron wiring
- `OCC-Clockwork-Wizards.code-workspace` — VS Code workspace config
- Updated `CLINE_INSTRUCTIONS.md` with pointer to `REFACTOR.md` for next session

### Notes
- Plan is in documentation-only state; implementation not yet started
- Goal: OCC discovers product candidates on weekends, generates posts early week, runs automatically via Vercel Cron
- NerdyMugs remains a simple frontend consumer

## 2026-05-30 - Documentation Security Review Handoff

### Changed
- Removed literal `CRON_SECRET` values from active repo docs and replaced them with local env lookup examples.
- Updated `README.md` and `PROJECT_CONTEXT.md` to document current security follow-up priorities.
- Clarified that `/api/posts/recent` currently exposes broader inventory than the intended public read surfaces.

### Added
- `END_SESSION_NOTES_2026-05-30.md` with the security review summary and next-session remediation order.

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
