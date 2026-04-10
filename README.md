# NerdyMugs ☕🖖

> Coffee Mugs for Nerds - An automated content discovery and affiliate marketing platform

**Live Demo:** https://app-a5qkol043-devcabins-projects.vercel.app

## Overview

NerdyMugs is a content automation platform that discovers coffee mugs from Amazon, generates engaging posts, and drives affiliate revenue. Originally a WordPress blog, now rebuilt as a modern React SPA with automated product discovery.

## Features

- **Automated Product Discovery** - Uses Amazon Product Advertising API to find trending mugs
- **AI-Powered Content** - Generates titles, captions, and descriptions for posts
- **Category Management** - Organized by Star Trek, Star Wars, Marvel, Retro Gaming, and more
- **WordPress Import** - Migrated 169 historical posts with 301 redirects
- **Affiliate Integration** - Amazon Associates links with tracking ID
- **Admin Dashboard** - Manual posting, analytics, and configuration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS + shadcn/ui |
| State | localStorage (client-side) |
| API | Amazon Product Advertising API |
| Hosting | Vercel (Hobby tier) |

## Quick Start

### Prerequisites
- Node.js 18+
- Amazon Associates account
- AWS IAM credentials (for PA API)

### Local Development

```bash
cd NerdyMugs-Complete/app

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your Amazon credentials

# Start dev server
npm run dev
```

Open http://localhost:5173

### Environment Variables

```bash
VITE_AMAZON_ACCESS_KEY=AKIAXXXXXXXX
VITE_AMAZON_SECRET_KEY=xxxxxxxxxxxx
VITE_AMAZON_ASSOCIATE_TAG=georgwebsi-20
```

## WordPress Import

The WordPress export has been processed and saved to `NerdyMugs-Complete/app/imported-posts.json`. To import into the app:

1. Open Admin panel in the app
2. Navigate to WordPress Import section
3. Select categories to import
4. Click "Import Selected"

**Redirects:** Old WordPress URLs automatically redirect to new post URLs via `redirects.json`.

## Deployment

Deployed on Vercel with automatic builds on git push:

```bash
cd NerdyMugs-Complete/app
vercel --prod
```

## Project Structure

```
NerdyMugs-Complete/
├── app/                    # Main React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Core logic (Amazon API, discovery, etc.)
│   │   ├── config/        # Site configuration
│   │   └── types/         # TypeScript types
│   ├── imported-posts.json # WordPress import data
│   ├── redirects.json     # 301 redirect mappings
│   └── vercel.json        # Vercel config
├── scripts/
│   └── import-wp.js       # WordPress XML parser
└── PRE_PRODUCTION_ASSETS/  # Original WordPress export
```

## Roadmap

- [ ] Supabase migration (replace localStorage)
- [ ] Automated cron jobs (3 posts/day)
- [ ] X/Twitter integration
- [ ] Custom domain (nerdymugs.com)
- [ ] Analytics dashboard
- [ ] A/B testing for content

## License

MIT

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed history.