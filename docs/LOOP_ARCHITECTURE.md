# OCC Weekly Loop Architecture

**Version:** 2.0.0  
**Last Updated:** 2026-06-27

---

## Overview

The OCC Clockwork Wizards system now operates as a **weekly autonomous content loop**. Instead of daily product discovery and immediate post generation, the system separates discovery from creation, allowing for human review between phases.

### The Weekly Rhythm

```
Weekend (Saturday 14:00 UTC):
┌─────────────────────────────────────────────────────────┐
│  Weekly Discovery Job Runs                              │
│  ─────────────────────────────────────────────────────────│
│  • Reads active rules from weekly_discovery_rules        │
│  • Builds Amazon search queries from category/tags         │
│  • Discovers products via Firecrawl                        │
│  • Scores products with OpenAI                            │
│  • Stores candidates in weekly_product_candidates         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              Human Review (Optional)
           Review candidates in Supabase
      Approve, reject, or edit before generation
                           │
                           ▼
Monday 15:00 UTC:
┌─────────────────────────────────────────────────────────┐
│  Generate Weekly Posts Job Runs                         │
│  ─────────────────────────────────────────────────────────│
│  • Selects approved/high-score candidates                 │
│  • Generates post content with OpenAI                     │
│  • Creates products in products table                     │
│  • Creates posts in posts table                           │
│  • Updates candidate status to drafted                    │
│  • Tracks run in content_generation_runs                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              NerdyMugs Frontend
        Consumes /api/posts/ready endpoint
        Renders scheduled public content
```

---

## Data Flow

### 1. Discovery Phase (`POST /api/jobs/weekly-discovery`)

**When:** Saturday 14:00 UTC (configurable in `vercel.json`)

**Process:**
1. Load active rules from `weekly_discovery_rules` table
2. For each rule, calculate search queries from `category` + `tags`/`search_terms`
3. Scrape Amazon search pages via Firecrawl
4. Score each product with OpenAI (0-100 relevance score)
5. Filter by `min_score` threshold
6. Store in `weekly_product_candidates` with status `discovered`
7. Deduplicate by `product_url` per week

**Output:** JSON summary with counts of rules processed, candidates found/inserted

### 2. Review Phase (Manual)

**When:** Between Saturday discovery and Monday generation

**Process:**
1. Open Supabase dashboard
2. Query `weekly_product_candidates` for current week
3. Review and update `status`:
   - `approved` → will be included in generation
   - `rejected` → will be skipped
   - `needs_review` → flagged for attention
4. Edit product data if needed (title, price, image_url, etc.)

### 3. Generation Phase (`POST /api/jobs/generate-weekly-posts`)

**When:** Monday 15:00 UTC (configurable in `vercel.json`)

**Process:**
1. Create run record in `content_generation_runs` (status: `running`)
2. Select candidates with status `approved` OR (`discovered` with score ≥ 80)
3. For each candidate:
   - Generate post content via OpenAI (title, slug, excerpt, body_md)
   - Insert product into `products` table
   - Insert post into `posts` table with status `ready`
   - Update candidate status to `drafted` and link to post
4. Update run record (status: `completed`, `partial`, or `failed`)

**Output:** JSON summary with posts generated/failed

### 4. Publication Phase (Automatic)

**Existing behavior preserved:**
- Posts with status `ready` and `scheduled_for <= now` appear in `/api/posts/ready`
- NerdyMugs frontend fetches and renders public posts
- Staggered release via existing `stagger-post-release` job if needed

---

## Database Schema

### weekly_discovery_rules

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Rule identifier |
| category | text | Product category (e.g., "Star Trek") |
| allocation_percent | integer | 0-100, for future load balancing |
| tags | text[] | Search tags (e.g., ["Captain Pike"]) |
| search_terms | text[] | Override terms (uses tags if empty) |
| max_candidates | integer | Max products to find per rule |
| min_score | integer | Minimum OpenAI score (0-100) |
| is_active | boolean | Enable/disable rule |
| notes | text | Human-readable notes |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto-updated |

### weekly_product_candidates

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| week_start_date | date | Week identifier (Sunday) |
| rule_id | uuid | FK to weekly_discovery_rules |
| category | text | Copied from rule |
| tags | text[] | Copied from rule |
| search_query | text | Actual URL searched |
| product_title | text | Product name |
| price | numeric | Product price |
| description | text | Product description |
| product_url | text | Original Amazon URL |
| affiliate_url | text | URL with affiliate tag |
| image_url | text | Product image |
| source | text | Domain (e.g., "amazon.com") |
| raw_payload | jsonb | Full scraped data |
| extraction_model | text | Model used |
| discovery_score | integer | OpenAI relevance score |
| status | enum | discovered/needs_review/approved/rejected/drafted/published/error |
| error_message | text | Error details if failed |
| post_id | uuid | FK to posts (when drafted) |
| discovered_at | timestamptz | Auto |
| updated_at | timestamptz | Auto-updated |

### content_generation_runs

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| week_start_date | date | Week being processed |
| status | enum | pending/running/completed/failed/partial |
| started_at | timestamptz | Run start time |
| finished_at | timestamptz | Run end time |
| summary | jsonb | Flexible stats object |
| error_message | text | Error details |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto-updated |

---

## API Endpoints

### Protected Job Endpoints (require CRON_SECRET)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobs/weekly-discovery` | Run weekend discovery job |
| POST | `/api/jobs/generate-weekly-posts` | Run Monday post generation |

### Public Read Endpoints (unchanged)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/posts/ready?limit=N` | Public posts feed |
| GET | `/api/posts/[slug]` | Individual post detail |
| GET | `/api/products/latest` | Latest products |
| GET | `/api/products/recent` | Recent products |

---

## Cron Schedule

```json
{
  "crons": [
    {
      "path": "/api/jobs/weekly-discovery",
      "schedule": "0 14 * * 6"
    },
    {
      "path": "/api/jobs/generate-weekly-posts",
      "schedule": "0 15 * * 1"
    }
  ]
}
```

- **Saturday 14:00 UTC** (`0 14 * * 6`): Discovery runs
- **Monday 15:00 UTC** (`0 15 * * 1`): Generation runs

---

## Integration with NerdyMugs

The NerdyMugs frontend requires **no changes** to consume the weekly loop output:

- It continues to fetch from `/api/posts/ready`
- Posts generated by the weekly loop appear in this feed
- The frontend remains a simple consumer of OCC's public API

No scraping, generation, or scheduling logic lives in NerdyMugs.
