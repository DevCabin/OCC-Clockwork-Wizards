# TODO.md - NerdyMugs Development Tasks

## Active Task: Fix Amazon API CORS Issue

**Status**: Deployed - Ready to Test  
**Started**: 2025-04-10  
**Completed**: 2025-04-10

### Problem
Amazon Product Advertising API blocks direct browser calls due to CORS policy. The `amazon-paapi` SDK was bundled in frontend and failing with header errors.

### Root Cause Found & Fixed
- `amazon-paapi` npm package was in frontend bundle
- SDK tried to set AWS auth headers directly in browser (fails CORS)
- Removed SDK from frontend, created server-side proxy

### Solution Implemented
- Created `/api/amazon-search.js` Vercel serverless function
- Moved `amazon-paapi` to `api/package.json` (server-side only)
- Updated `amazon.ts` to use `fetch()` to proxy endpoint
- Frontend now calls proxy → Server calls Amazon API → Returns products

### Implementation Complete
- [x] Create `/api/amazon-search.js` serverless function
- [x] Move API credentials server-side
- [x] Update `src/lib/amazon.ts` to use proxy via `fetch()`
- [x] Remove `amazon-paapi` from frontend `package.json`
- [x] Create `api/package.json` with SDK dependency
- [x] Deploy to Vercel
- [x] Commit and push changes

### New Deployment
- **URL**: https://occ-clockwork-wizards-eag6gdoos-devcabins-projects.vercel.app
- **API Endpoint**: `/api/amazon-search`
- **Commit**: `767e407` - "v1.0.3: Fix Vercel config for API routes"
- **Note**: SSL certificates being provisioned for nerdymugs.com

### Next Steps
1. Disable Vercel authentication protection in dashboard
2. Test "Run Discovery Now" - should return real Amazon products
3. Check browser console for "Searching Amazon via proxy" messages
4. Verify images are from Amazon (amazon.com/images/...) not Unsplash

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