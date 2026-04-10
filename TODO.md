# TODO.md - NerdyMugs Development Tasks

## Active Task: Fix Amazon API CORS Issue

**Status**: Deployed - Needs Testing  
**Started**: 2025-04-10  
**Priority**: High

### Problem
Amazon Product Advertising API blocks direct browser calls due to CORS policy and security requirements. The app currently falls back to simulated Unsplash images and fake links.

### Solution Implemented
Created Vercel serverless function to proxy Amazon API calls securely server-side.

### Architecture
```
Browser → /api/amazon-search (Vercel Function) → Amazon PA API
           ↑                    ↓
         (JSON response)    (signed request with secure env vars)
```

### Implementation Complete
- [x] Create `/api/amazon-search.js` serverless function
- [x] Move API credentials server-side (already in Vercel env vars)
- [x] Update `src/lib/amazon.ts` to call proxy instead of direct API
- [x] Update `vercel.json` to add API routes
- [x] Deploy to Vercel
- [ ] Test API endpoint (needs auth disabled)
- [ ] Update CHANGELOG.md with fix details
- [ ] Commit and push

### New Deployment
- **URL**: https://occ-clockwork-wizards-ioia0nwlg-devcabins-projects.vercel.app
- **API Endpoint**: `/api/amazon-search`

### Next Steps
1. Disable Vercel authentication protection in dashboard
2. Test "Run Discovery Now" - should return real Amazon products
3. Verify images are from Amazon, not Unsplash

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