# Changelog

All notable changes to the NerdyMugs project will be documented in this file.

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