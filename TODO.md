# TODO.md - NerdyMugs Development Tasks

**Last Updated:** 2026-04-12

## Active Priorities

### 1) Validate PA-API in production
- [ ] Confirm `/api/paapi-search` returns real products on latest deployment
- [ ] Verify prices/images/title quality in UI discovery flow
- [ ] Remove any user-facing reliance on simulated fallback in production paths

### 2) Split public and admin experience
- [ ] Keep public `/` browse-only
- [ ] Move generation/config/import controls to `/admin`
- [ ] Add basic admin protection (env-password stopgap)

### 3) Move persistence from localStorage to Supabase
- [ ] Create initial schema: `categories`, `products`, `posts`, `logs` (optional)
- [ ] Replace `app/src/lib/db.ts` storage layer with Supabase adapter
- [ ] Add migration/seed path for existing categories/posts

### 4) Automation and operations
- [ ] Add scheduled discovery/publish job (Vercel Cron)
- [ ] Add run logging and basic failure alerts
- [ ] Define minimum daily publish target and retry behavior

## Environment Rules (current)

### Server-side only (Vercel)
- `PAAPI_ACCESS_KEY`
- `PAAPI_SECRET_KEY`
- `PAAPI_PARTNER_TAG`
- `PAAPI_HOST=webservices.amazon.com`
- `PAAPI_REGION=us-east-1`

### Legacy aliases accepted by API route
- `PAAPI_AMAZON_ACCESS_KEY`
- `PAAPI_AMAZON_SECRET_KEY`
- `PAAPI_AMAZON_ASSOCIATE_TAG`

### Do not use for secrets
- `VITE_AMAZON_ACCESS_KEY`
- `VITE_AMAZON_SECRET_KEY`

## Completed Milestones

- ✅ Initial Vercel deployment
- ✅ WordPress import pipeline + redirect generation
- ✅ Server-side PA-API endpoint (`/api/paapi-search`)
- ✅ Frontend discovery wired to PA-API proxy

---

Process rule: every significant change must be reflected in `CHANGELOG.md`.