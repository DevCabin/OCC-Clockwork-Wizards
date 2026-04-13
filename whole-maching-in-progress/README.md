# NerdyMugs ☕🖖

Coffee mugs for nerds — content discovery + publishing workflow with Amazon PA-API integration via Vercel serverless functions.

## Current Status

- Frontend: React + TypeScript + Vite (in `app/`)
- Backend endpoints: Vercel serverless functions (in `api/`)
- Product discovery: `/api/paapi-search` (server-side Amazon PA-API)
- Data persistence: localStorage today, Supabase migration planned

## Repo Layout

```
OCC-Clockwork-Wizards/
├── api/                    # Vercel serverless API routes
├── app/                    # Vite React frontend
├── scripts/                # utility/import scripts
├── PRE_PRODUCTION_ASSETS/  # source exports/assets
├── TODO.md                 # active roadmap
└── CHANGELOG.md            # release/change history
```

## Local Run (for testing)

From repo root:

```bash
npm install
cd /Users/georgefeatherstone/DEV/OCC-Clockwork-Wizards/app && npm install
cd /Users/georgefeatherstone/DEV/OCC-Clockwork-Wizards && npm run dev
```

Then open: `http://localhost:5173`

## Environment Variables

### Server-side (Vercel / API)

Use server-only env vars for Amazon PA-API:

```bash
PAAPI_ACCESS_KEY=...
PAAPI_SECRET_KEY=...
PAAPI_PARTNER_TAG=georgwebsi-20
PAAPI_HOST=webservices.amazon.com
PAAPI_REGION=us-east-1
```

Accepted legacy aliases in current API route:

- `PAAPI_AMAZON_ACCESS_KEY`
- `PAAPI_AMAZON_SECRET_KEY`
- `PAAPI_AMAZON_ASSOCIATE_TAG`

### Client-side

Only safe/public values should be exposed in `VITE_*` vars (example: associate tag).

## Deployment

Deploys are handled via GitHub → Vercel. Pushes to `main` trigger production deployment.

## Documentation Index

- `TODO.md` → active implementation plan and next actions
- `PRODUCTION_PLAN.md` → high-level architecture roadmap
- `PLAN_SEARCH_PROXY.md` → historical decision notes for search proxy experiments
- `NerdyMugs-Companion-Guide.md` → operator guide (updated)

## Changelog

See `CHANGELOG.md` for notable updates.