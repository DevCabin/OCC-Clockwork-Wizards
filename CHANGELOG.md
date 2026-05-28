# OCC Clockwork Wizards - Changelog

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
