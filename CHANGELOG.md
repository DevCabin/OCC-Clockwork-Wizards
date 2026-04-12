# Changelog

All notable changes to the NerdyMugs project will be documented in this file.

## [1.0.10] - 2026-04-12

### Changed
- Synced local `main` with `origin/main` (fast-forward, 8 commits).
- Pruned and refreshed root documentation to reflect current implementation:
  - Updated `README.md` for current repo structure and PA-API server-side env rules.
  - Reworked `TODO.md` into active priorities and current environment guardrails.
  - Updated `PRODUCTION_PLAN.md` status and `PAAPI_*` variable naming.
  - Marked `PLAN_SEARCH_PROXY.md` as archived/superseded context.
  - Updated `NerdyMugs-Companion-Guide.md` with current status note and env naming fixes.
- Removed obsolete `CLINE-ONE-SHOT-PROMPT.md`.

## [1.0.11] - 2026-04-12

### Changed
- Hardened `/api/paapi-search` result reliability:
  - Added completeness filtering (require ASIN, title, image, price, URL).
  - Added keyword retry strategy (`query` → `query mug` → `query coffee mug`).
  - Added response diagnostics (`attempts`, `rawCount`, `keptCount`).
  - Added ASIN de-duplication and bounded return count.

## [1.0.12] - 2026-04-12

### Changed
- Hardened frontend/discovery handling for PA-API reliability:
  - Increased PA-API request `itemCount` and tightened mug-focused query composition.
  - Added client-side completeness filtering and diagnostics logging in `app/src/lib/amazon.ts`.
  - Added discovery-level incomplete-product filtering + log signal in `app/src/lib/discovery.ts`.

## [1.0.0] - 2025-04-10

### Added
- **Production Deployment to Vercel**
  - Deployed to https://app-a5qkol043-devcabins-projects.vercel.app
  - Configured SPA routing for React Router (posts, admin, categories)
  - Set up asset caching headers for optimal performance

- **Amazon Product Advertising API Integration**
  - Configured AWS IAM credentials for PA API access
  - Environment variables: `VITE_AMAZON_ACCESS_KEY`, `VITE_AMAZON_SECRET_KEY`, `VITE_AMAZON_ASSOCIATE_TAG`
  - Integrated `amazon-paapi` npm package for real product search
  - Fallback to simulated products when API unavailable

- **WordPress Import System**
  - Created `scripts/import-wp.js` to parse WordPress XML export
  - Parsed 508 total posts, imported 169 published posts
  - Extracted metadata: titles, categories, tags, Amazon URLs, ASINs, images, prices
  - Generated 169 permanent 301 redirects from old WordPress URLs
  - Saved imported posts to `app/imported-posts.json`

- **Build Configuration**
  - Vite SPA build optimized for production
  - TypeScript compilation passes with no errors
  - Tailwind CSS + shadcn/ui component library
  - Output: 498KB JS bundle, 88KB CSS

- **Environment Setup**
  - `.env` configuration for local development
  - Vercel environment variables for production
  - Amazon Associates tracking ID: `georgwebsi-20`

### Generated Files
- `redirects.json` - 846 lines of 301 redirect mappings
- `imported-posts.json` - 169 imported WordPress posts
- `next.config.js` - Next.js-style redirects config
- `vercel.json` - Vercel deployment configuration

### Infrastructure
- **Cost**: $0/month (Vercel Hobby + Amazon API free tier)
- **Node.js**: Compatible with v18+ (current: v18.20.7)
- **Dependencies**: 529 npm packages installed

### Next Steps (Pending)
- Disable Vercel authentication protection for public access
- Import WordPress posts into app's localStorage database via Admin panel
- Configure custom domain (nerdymugs.com)
- Set up automated cron job for 3 posts/day
- X/Twitter integration for auto-posting