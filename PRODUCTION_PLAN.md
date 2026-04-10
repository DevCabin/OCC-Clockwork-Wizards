# NerdyMugs Production Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NERDYMUGS.COM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐        ┌─────────────────────┐                     │
│  │   FRONTEND (Public) │        │   BACKEND (Admin)   │                     │
│  │   nerdymugs.com     │        │   admin.nerdymugs.com│                    │
│  │                     │        │   (or /admin route) │                     │
│  │  • Public feed      │        │                     │                     │
│  │  • Post pages       │        │  • Content config   │                     │
│  │  • Category filters │        │  • Manual posting   │                     │
│  │  • Affiliate links  │        │  • Analytics        │                     │
│  │  • 301 redirects    │        │  • WP import        │                     │
│  │                     │        │  • X/Twitter connect│                     │
│  └──────────┬──────────┘        └──────────┬──────────┘                     │
│             │                              │                                │
│             └──────────────┬───────────────┘                                │
│                            │                                                │
│                   ┌────────▼────────┐                                       │
│                   │   DATABASE      │                                       │
│                   │   (Supabase)    │                                       │
│                   │                 │                                       │
│                   │  • posts        │                                       │
│                   │  • products     │                                       │
│                   │  • categories   │                                       │
│                   │  • config       │                                       │
│                   │  • logs         │                                       │
│                   └────────┬────────┘                                       │
│                            │                                                │
│         ┌──────────────────┼──────────────────┐                            │
│         │                  │                  │                            │
│  ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐                      │
│  │ Amazon API  │  │  X/Twitter    │  │  Cron Job   │                      │
│  │ (Products)  │  │   API         │  │ (Scheduler) │                      │
│  └─────────────┘  └───────────────┘  └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current State → Production Checklist

### Phase 1: Foundation (Week 1)

- [ ] **Set up Supabase database**
  - Create project (free tier: 500MB)
  - Create tables: posts, products, categories, config, logs
  - Set up Row Level Security (RLS) policies
  
- [ ] **Migrate from localStorage to Supabase**
  - Replace `lib/db.ts` with Supabase client
  - Add server-side API routes for data operations
  
- [ ] **Set up Vercel project**
  - Connect GitHub repo
  - Environment variables for Supabase
  - Deploy initial version

### Phase 2: Amazon Integration (Week 1-2)

- [ ] **Apply for Amazon Product Advertising API**
  - Requires active Amazon Associates account
  - Approval usually takes 1-2 days
  
- [ ] **Build Amazon API client**
  - Search products by keywords
  - Fetch product images, prices, descriptions
  - Generate affiliate links with `georgwebsi-20`
  
- [ ] **Update discovery service**
  - Replace simulated products with real Amazon data
  - Cache product data to reduce API calls

### Phase 3: WordPress Import (Week 2)

- [ ] **Export from WordPress**
  - Tools → Export → All content
  - Save as `nerdymugs-export.xml`
  
- [ ] **Run import script**
  - Upload XML to admin panel
  - Parse and import posts
  - Generate redirect map
  
- [ ] **Set up 301 redirects**
  - Generate `next.config.js` redirects
  - Deploy to Vercel
  - Test old URLs redirect correctly

### Phase 4: Automation (Week 2-3)

- [ ] **Set up Vercel Cron**
  - `vercel.json` with cron schedule
  - Runs every 8 hours (3 posts/day)
  - Skips Sundays (quiet day)
  
- [ ] **X/Twitter integration**
  - Create X Developer app
  - Get API keys
  - Auto-post when new content goes live

### Phase 5: Launch (Week 3)

- [ ] **DNS cutover**
  - Point nerdymugs.com to Vercel
  - SSL certificate auto-provisioned
  
- [ ] **Monitor**
  - Vercel Analytics
  - Supabase dashboard
  - Amazon API usage

---

## File Structure (Production)

```
nerdymugs/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (public)/           # Public routes
│   │   │   ├── page.tsx        # Home feed
│   │   │   ├── post/[id]/      # Individual post pages
│   │   │   ├── category/[slug]/# Category pages
│   │   │   └── layout.tsx      # Public layout
│   │   ├── admin/              # Admin routes (protected)
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── config/         # Site config
│   │   │   ├── categories/     # Category management
│   │   │   ├── import/         # WordPress import
│   │   │   └── layout.tsx      # Admin layout
│   │   └── api/                # API routes
│   │       ├── posts/          # CRUD posts
│   │       ├── products/       # CRUD products
│   │       ├── cron/           # Scheduled tasks
│   │       └── auth/           # Authentication
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── feed/               # Feed components
│   │   ├── post/               # Post card, detail
│   │   └── admin/              # Admin components
│   ├── lib/
│   │   ├── db/                 # Database clients
│   │   │   ├── supabase.ts     # Supabase client
│   │   │   └── schema.sql      # Database schema
│   │   ├── amazon.ts           # Amazon API
│   │   ├── contentEngine.ts    # AI content generation
│   │   ├── discovery.ts        # Product discovery
│   │   ├── scheduler.ts        # Cron scheduling
│   │   ├── social.ts           # X/Twitter posting
│   │   └── wordpressImport.ts  # WP import
│   ├── config/
│   │   └── nerdyMugs.ts        # Site config
│   └── types/
│       └── index.ts            # TypeScript types
├── public/
│   └── images/                 # Static assets
├── next.config.js              # Redirects config
├── vercel.json                 # Cron jobs
├── package.json
└── README.md
```

---

## Database Schema (Supabase)

```sql
-- Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  product_url TEXT NOT NULL,
  price TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_tags TEXT[] DEFAULT '{}',
  video_suggestion TEXT,
  clicks INTEGER DEFAULT 0,
  published_at TIMESTAMP DEFAULT NOW(),
  is_published BOOLEAN DEFAULT true,
  category TEXT NOT NULL
);

-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  weight INTEGER DEFAULT 2,
  search_terms TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  trivia_hooks TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);

-- Site config table
CREATE TABLE site_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'NerdyMugs',
  tagline TEXT DEFAULT 'Coffee Mugs for Nerds',
  affiliate_id TEXT DEFAULT 'georgwebsi-20'
);

-- Schedule config table
CREATE TABLE schedule_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  posts_per_day INTEGER DEFAULT 3,
  quiet_days TEXT[] DEFAULT '{"Sunday"}',
  last_run_at TIMESTAMP
);

-- Logs table
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public can read posts/products
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
```

---

## Environment Variables

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Amazon
AMAZON_ACCESS_KEY=AKIA...
AMAZON_SECRET_KEY=...
AMAZON_ASSOCIATE_TAG=georgwebsi-20

# X/Twitter
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...

# Admin auth (simple password or OAuth)
ADMIN_PASSWORD=super-secret-password
# Or use NextAuth with GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

---

## Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/discover",
      "schedule": "0 */8 * * *"
    }
  ]
}
```

This runs every 8 hours = 3 posts per day.

---

## 301 Redirects (next.config.js)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // WordPress old URLs → new URLs
      {
        source: '/2020/01/15/star-trek-enterprise-mug/',
        destination: '/post/abc123',
        permanent: true,
      },
      // Category archives
      {
        source: '/category/star-trek/',
        destination: '/category/star-trek',
        permanent: true,
      },
      // Tag pages
      {
        source: '/tag/spock/',
        destination: '/tag/spock',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Hobby (free) | $0 |
| Supabase | Free (500MB) | $0 |
| Amazon API | Free tier | $0 |
| X API | Free (1,500 tweets/mo) | $0 |
| Domain | Already owned | $0 |
| **Total** | | **$0/month** |

Scales to ~$20/month at 10k+ posts.

---

## Minimum 3 Posts/Day Guarantee

The system enforces this via:

1. **Cron schedule**: Every 8 hours = 3x/day
2. **Quiet days**: Skips Sundays (configurable)
3. **Retry logic**: If Amazon API fails, retries in 1 hour
4. **Queue system**: Maintains 7-day buffer of scheduled posts
5. **Manual override**: Admin can always trigger extra posts

---

## What I Need From You

To proceed with production:

1. **WordPress export** (`nerdymugs-export.xml`)
2. **Amazon Associates confirmation** (is `georgwebsi-20` active?)
3. **X API keys** (if you want auto-posting)
4. **Go/no-go** on the architecture

Want me to start building the production version?
