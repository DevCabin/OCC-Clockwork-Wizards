# Evaluation Checklist for Weekly Loop

Use this checklist to verify the weekly autonomous loop is working correctly.

---

## ✅ Phase 1: Security Hardening

- [ ] `POST /api/jobs/update-product-image` returns 401 without CRON_SECRET
- [ ] `POST /api/jobs/update-product-image` returns 200 with valid CRON_SECRET
- [ ] `POST /api/jobs/import-wordpress` returns 410 (disabled)
- [ ] `POST /api/jobs/weekly-discovery` returns 401 without CRON_SECRET
- [ ] `POST /api/jobs/generate-weekly-posts` returns 401 without CRON_SECRET
- [ ] No CRON_SECRET values in any committed code

**Test Commands:**
```bash
# Should fail (no auth)
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/weekly-discovery"

# Should work (with auth)
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/weekly-discovery" \
  -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)"
```

---

## ✅ Phase 2: Data Model

- [ ] `weekly_discovery_rules` table exists in Supabase
- [ ] `weekly_product_candidates` table exists with status enum
- [ ] `content_generation_runs` table exists with status enum
- [ ] Migrations apply cleanly without errors
- [ ] Indexes created for performance

**Verify in Supabase:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('weekly_discovery_rules', 'weekly_product_candidates', 'content_generation_runs');
```

---

## ✅ Phase 3: Weekly Discovery

- [ ] Discovery job runs without errors
- [ ] Active rules are loaded correctly
- [ ] Amazon search URLs are built from category + tags
- [ ] Products are extracted via Firecrawl
- [ ] Products are scored with OpenAI
- [ ] Candidates are stored in `weekly_product_candidates`
- [ ] Deduplication works (same product_url not inserted twice)
- [ ] Affiliate URLs include `georgwebsi-20` tag
- [ ] Response includes accurate summary counts

**Test:**
```bash
# Insert a test rule first
# Then run discovery
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/weekly-discovery" \
  -H "Authorization: Bearer *** 

# Verify in Supabase:
SELECT COUNT(*) FROM weekly_product_candidates WHERE week_start_date = CURRENT_DATE;
```

---

## ✅ Phase 4: Post Generation

- [ ] Generation job runs without errors
- [ ] Only approved/high-score candidates are selected
- [ ] Posts are generated with OpenAI
- [ ] Products are inserted into `products` table
- [ ] Posts are inserted into `posts` table
- [ ] Candidate status updated to `drafted`
- [ ] Candidate `post_id` is linked
- [ ] Run record created and updated correctly
- [ ] Failed candidates marked with `error` status

**Test:**
```bash
# Approve some candidates first
# Then run generation
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/generate-weekly-posts" \
  -H "Authorization: Bearer *** \
  -d '{"maxPosts": 3}'

# Verify:
SELECT status, COUNT(*) FROM weekly_product_candidates GROUP BY status;
SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## ✅ Phase 5: Frontend Integration

- [ ] `/api/posts/ready` returns newly generated posts
- [ ] NerdyMugs frontend renders posts correctly
- [ ] Post detail pages work (`/api/posts/[slug]`)
- [ ] Product images load
- [ ] Affiliate links include correct tag

**Test:**
```bash
curl -sS "https://app-liart-five-43.vercel.app/api/posts/ready?limit=5"
```

---

## ✅ Phase 6: Cron & Documentation

- [ ] `vercel.json` has weekly cron schedules
- [ ] `docs/LOOP_ARCHITECTURE.md` exists and is accurate
- [ ] `docs/AGENT_RULES.md` exists
- [ ] `docs/WEEKLY_CONTENT_LOOP.md` exists
- [ ] `docs/EVALS.md` exists (this file)

---

## 🔄 End-to-End Test

1. **Clear Test Data:**
   ```sql
   DELETE FROM weekly_product_candidates WHERE week_start_date = CURRENT_DATE;
   DELETE FROM content_generation_runs WHERE week_start_date = CURRENT_DATE;
   ```

2. **Insert Test Rule:**
   ```sql
   INSERT INTO weekly_discovery_rules (name, category, tags, max_candidates, min_score)
   VALUES ('Test Rule', 'Funny', ARRAY['test'], 3, 50);
   ```

3. **Run Discovery:**
   ```bash
   curl -sS -X POST .../api/jobs/weekly-discovery
   ```

4. **Verify Candidates Created**

5. **Approve Candidates:**
   ```sql
   UPDATE weekly_product_candidates SET status = 'approved' WHERE week_start_date = CURRENT_DATE;
   ```

6. **Run Generation:**
   ```bash
   curl -sS -X POST .../api/jobs/generate-weekly-posts -d '{"maxPosts": 3}'
   ```

7. **Verify Posts Created:**
   ```bash
   curl -sS .../api/posts/ready?limit=10
   ```

8. **Cleanup:**
   ```sql
   DELETE FROM weekly_discovery_rules WHERE name = 'Test Rule';
   ```

---

## 📊 Performance Benchmarks

| Metric | Target | Notes |
|--------|--------|-------|
| Discovery job runtime | < 5 minutes | Limited by maxDuration |
| Generation job runtime | < 5 minutes | Limited by maxDuration |
| Candidates per rule | 5-15 | Configurable via max_candidates |
| Posts per generation | 5-20 | Configurable via maxPosts param |
| OpenAI calls per discovery | ~30-50 | Depends on search results |
| OpenAI calls per generation | 1 per post | For content generation |

---

## 🚨 Known Limitations

1. **Amazon Rate Limits**: Heavy discovery may trigger Amazon throttling
2. **OpenAI Costs**: Each discovery and generation costs API credits
3. **Image Availability**: Not all products have images
4. **Duplicate Detection**: Only within same week, not across weeks
5. **No Email Alerts**: Failures only visible in logs/Supabase

---

## 📋 Sign-off

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
| | | ○ Pass / ○ Fail | |

**Required for production use:**
- [ ] All Phase 1-6 checks pass
- [ ] End-to-end test completed successfully
- [ ] Documentation reviewed and accurate
- [ ] Rollback plan documented
