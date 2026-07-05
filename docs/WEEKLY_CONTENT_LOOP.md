# Weekly Content Loop - User Guide

## Quick Start

### 1. Set Up Weekly Rules

You have two options: use the NerdyMugs `/admin` page, or insert rules directly into Supabase.

#### Option A: Use the Admin Page (Recommended)

1. Go to `https://www.nerdymugs.com/admin`.
2. Enter the admin password (initial: `NERDYMUGS1234!`).
3. Open the **Rules** tab.
4. Click **Add Rule**, fill in category/tags/allocation/max candidates/min score, and save.
5. Toggle rules active/inactive as needed.

You can change the admin password anytime by editing the `password` value in the OCC `admin_settings` table row with id `00000000-0000-0000-0000-000000000000`.

#### Option B: Insert Rules Directly in Supabase

```sql
INSERT INTO weekly_discovery_rules (
  name, 
  category, 
  allocation_percent, 
  tags, 
  max_candidates, 
  min_score
) VALUES 
  ('Star Trek Week', 'Star Trek', 75, ARRAY['Captain Pike', 'Spock', 'Enterprise'], 15, 75),
  ('Star Wars Week', 'Star Wars', 15, ARRAY['Luke Skywalker', 'Mandalorian'], 5, 75),
  ('Marvel Week', 'Marvel', 10, ARRAY['Hulk', 'Spider-Man'], 5, 75);
```

### 2. Manual Discovery (Optional)

To run discovery immediately (bypasses cron):

```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/weekly-discovery" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "weekStartDate": "2026-06-27",
  "rulesProcessed": 3,
  "candidatesFound": 25,
  "candidatesInserted": 23,
  "duplicatesSkipped": 2,
  "errors": [],
  "debug": [
    {
      "rule": "Star Trek Week",
      "category": "Star Trek",
      "minScore": 75,
      "searchUrls": ["..."],
      "extractionCounts": [8, 5, 0],
      "domainFiltered": 0,
      "duplicateFiltered": 2,
      "scoreRejected": 1,
      "schemaRejected": 0,
      "accepted": 10,
      "errors": []
    }
  ]
}
```

If `candidatesFound` is lower than `max_candidates`, the `debug` array shows exactly where products were lost (extraction, filtering, scoring, or schema validation).

### 3. Review Candidates

You can review candidates in the NerdyMugs `/admin` page under the **Candidates** tab, or directly in Supabase.

#### Option A: Use the Admin Page

1. Go to `https://www.nerdymugs.com/admin` and log in.
2. Open the **Candidates** tab.
3. Select the week you want to review (defaults to the current week).
4. Click **Approve**, **Reject**, or **Review** for each candidate.

#### Option B: Query in Supabase

```sql
SELECT 
  product_title,
  price,
  category,
  discovery_score,
  status,
  product_url
FROM weekly_product_candidates
WHERE week_start_date = '2026-06-27'
ORDER BY discovery_score DESC;
```

**Review Actions:**
- `approved` → Include in post generation
- `rejected` → Skip this product
- `needs_review` → Flag for later

Update status:
```sql
UPDATE weekly_product_candidates
SET status = 'approved'
WHERE id = 'uuid-here';
```

### 4. Manual Generation (Optional)

To generate posts immediately:

```bash
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/generate-weekly-posts" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"maxPosts": 10}'
```

**Expected Response:**
```json
{
  "success": true,
  "weekStartDate": "2026-06-27",
  "runId": "uuid-here",
  "candidatesProcessed": 10,
  "postsGenerated": 10,
  "postsFailed": 0,
  "postIds": ["uuid-1", "uuid-2", ...]
}
```

### 5. Verify Posts

Check that posts were created:

```sql
SELECT 
  p.title,
  p.slug,
  p.excerpt,
  pr.image_url,
  pr.product_url
FROM posts p
JOIN products pr ON p.product_id = pr.id
WHERE p.created_at > now() - interval '1 hour'
ORDER BY p.created_at DESC;
```

Test the public API:
```bash
curl -sS "https://app-liart-five-43.vercel.app/api/posts/ready?limit=5"
```

---

## Troubleshooting

### Discovery Found 0 Candidates

**Check:**
1. Are there active rules? `SELECT * FROM weekly_discovery_rules WHERE is_active = true;`
2. Is the Firecrawl API key valid?
3. Is the OpenAI API key valid?
4. Check errors in response: `"errors": [...]`

### Generation Created 0 Posts

**Check:**
1. Are there approved/discovered candidates for this week?
2. Do candidates have `discovery_score >= 80` OR `status = 'approved'`?
3. Check `content_generation_runs` for error messages:
   ```sql
   SELECT * FROM content_generation_runs ORDER BY created_at DESC LIMIT 1;
   ```

### Posts Not Appearing in Frontend

**Check:**
1. Are posts status = `ready`?
2. Is `scheduled_for` null or in the past?
3. Test: `curl /api/posts/ready?limit=10`

### Duplicate Products

The system deduplicates by `product_url` per week. If you see duplicates:
1. Check they have different `week_start_date` values (expected)
2. Or check deduplication logic failed (report bug)

---

## Rule Configuration Examples

### Simple Category Rule
```sql
INSERT INTO weekly_discovery_rules (
  name, category, tags, max_candidates, min_score
) VALUES (
  'Programming Mugs',
  'Programming',
  ARRAY['developer', 'coder', 'software engineer'],
  10,
  70
);
```

### Niche Character Rule
```sql
INSERT INTO weekly_discovery_rules (
  name, category, tags, search_terms, max_candidates, min_score, notes
) VALUES (
  'Captain Pike Mugs',
  'Star Trek',
  ARRAY['Captain Pike', 'Strange New Worlds'],
  ARRAY['Captain Christopher Pike mug', 'Pike Star Trek coffee cup'],
  5,
  80,
  'Focus on SNW merchandise'
);
```

---

## Monitoring

### View This Week's Stats

```sql
-- Discovery stats
SELECT 
  COUNT(*) FILTER (WHERE status = 'discovered') as discovered,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  COUNT(*) FILTER (WHERE status = 'drafted') as drafted,
  COUNT(*) FILTER (WHERE status = 'error') as errors
FROM weekly_product_candidates
WHERE week_start_date = date_trunc('week', current_date)::date;

-- Generation run status
SELECT 
  week_start_date,
  status,
  started_at,
  finished_at,
  summary
FROM content_generation_runs
ORDER BY started_at DESC
LIMIT 5;
```

---

## Recovery Procedures

### Restart Discovery for Current Week

```sql
-- Delete current week candidates ( CAREFUL! )
DELETE FROM weekly_product_candidates 
WHERE week_start_date = '2026-06-27';

-- Re-run discovery manually
# Use curl command from section 2
```

### Fix Failed Generation

```sql
-- Reset errored candidates
UPDATE weekly_product_candidates
SET status = 'approved', error_message = NULL
WHERE week_start_date = '2026-06-27' AND status = 'error';

-- Delete failed run record
DELETE FROM content_generation_runs
WHERE week_start_date = '2026-06-27' AND status = 'failed';

-- Re-run generation manually
# Use curl command from section 4
```

### Emergency Stop (Disable All Rules)

```sql
UPDATE weekly_discovery_rules
SET is_active = false;
```
