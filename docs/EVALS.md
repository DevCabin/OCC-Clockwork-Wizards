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
- [ ] `admin_settings` table exists with initial password row
- [ ] Migrations apply cleanly without errors
- [ ] Indexes created for performance

**Verify tables exist and admin password is set:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('weekly_discovery_rules', 'weekly_product_candidates', 'content_generation_runs', 'admin_settings');

SELECT id, password FROM admin_settings;
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
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

# Insert a test rule first (or use /admin)
# Then run discovery
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/weekly-discovery" \
  -H "Authorization: Bearer $CRON_SECRET"

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
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

# Approve some candidates first (or use /admin)
# Then run generation
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/generate-weekly-posts" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
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

## ✅ Phase 6: Admin UI

- [ ] `POST /api/admin/verify-password` returns 401 for wrong password
- [ ] `POST /api/admin/verify-password` returns 200 for correct password
- [ ] `GET /api/admin/rules` returns active rules
- [ ] `POST /api/admin/rules` creates a rule with valid password
- [ ] `PATCH /api/admin/rules/[id]` updates a rule with valid password
- [ ] `DELETE /api/admin/rules/[id]` deletes a rule with valid password
- [ ] `GET /api/admin/candidates` returns this week's candidates
- [ ] `POST /api/admin/candidates` updates candidate status with valid password
- [ ] `POST /api/admin/trigger-discovery` runs with valid password
- [ ] `POST /api/admin/trigger-generation` runs with valid password
- [ ] NerdyMugs `/admin` renders the password gate
- [ ] No `CRON_SECRET` or Supabase service role is exposed in frontend code

**Test Commands:**
```bash
ADMIN_PASSWORD="NERDYMUGS1234!"

# Should fail (wrong password)
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/admin/verify-password" \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}'

# Should succeed (initial password)
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/admin/verify-password" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$ADMIN_PASSWORD\"}"

# List rules
curl -sS "https://app-liart-five-43.vercel.app/api/admin/rules"

# List this week's candidates
curl -sS "https://app-liart-five-43.vercel.app/api/admin/candidates"

# Create a rule
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/admin/rules" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$ADMIN_PASSWORD\",\"rule\":{\"name\":\"Test\",\"category\":\"Test\",\"allocation_percent\":100,\"tags\":[\"test\"],\"search_terms\":[\"test\"],\"max_candidates\":3,\"min_score\":50,\"is_active\":true,\"notes\":\"\"}}"
```

---

## ✅ Phase 7: Cron & Documentation

- [ ] `vercel.json` has weekly cron schedules
- [ ] `docs/LOOP_ARCHITECTURE.md` exists and is accurate
- [ ] `docs/AGENT_RULES.md` exists
- [ ] `docs/WEEKLY_CONTENT_LOOP.md` exists and documents the `/admin` page
- [ ] `docs/EVALS.md` exists (this file)

---

## 🔄 End-to-End Test

1. **Clear Test Data:**
   ```sql
   DELETE FROM weekly_product_candidates WHERE week_start_date = CURRENT_DATE;
   DELETE FROM content_generation_runs WHERE week_start_date = CURRENT_DATE;
   ```

2. **Insert Test Rule (or use `/admin`):**
   ```sql
   INSERT INTO weekly_discovery_rules (name, category, tags, max_candidates, min_score)
   VALUES ('Test Rule', 'Funny', ARRAY['test'], 3, 50);
   ```
   Alternatively, log in to `https://www.nerdymugs.com/admin` and create the rule in the **Rules** tab.

3. **Run Discovery (or use `/admin`):**
   ```bash
   CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)
   curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/weekly-discovery" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   Alternatively, log in to `https://www.nerdymugs.com/admin`, open the **Actions** tab, and click **Run Discovery**.

4. **Verify Candidates Created**

5. **Approve Candidates (or use `/admin`):**
   ```sql
   UPDATE weekly_product_candidates SET status = 'approved' WHERE week_start_date = CURRENT_DATE;
   ```
   Alternatively, log in to `https://www.nerdymugs.com/admin`, open the **Candidates** tab, and approve the candidates.

6. **Run Generation (or use `/admin`):**
   ```bash
   CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)
   curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/generate-weekly-posts" \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"maxPosts": 3}'
   ```
   Alternatively, log in to `https://www.nerdymugs.com/admin`, open the **Actions** tab, and click **Run Generation**.

7. **Verify Posts Created:**
   ```bash
   curl -sS "https://app-liart-five-43.vercel.app/api/posts/ready?limit=10"
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
- [ ] All Phase 1-7 checks pass
- [ ] End-to-end test completed successfully
- [ ] Documentation reviewed and accurate
- [ ] Rollback plan documented
