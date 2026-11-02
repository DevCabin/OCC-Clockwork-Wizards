# Legacy Post Repair Plan

**Date:** 2026-05-27  
**Owner:** Dr FEATHERSTONE + Cline  
**Status:** Ready for Execution

---

## Problem Summary

After importing 149 legacy WordPress posts, we've identified quality issues:

### **Issue 1: Broken Affiliate Links** 🔴 **CRITICAL**
- **Problem:** 74 posts have `nerdymugs.com` URLs instead of Amazon affiliate links
- **Impact:** No affiliate revenue from these posts
- **Fixable:** 56 posts have source Amazon URLs available
- **Needs Manual:** ~18 posts have no source URL

### **Issue 2: Content Quality** 🟡
- **Corrupted Content:** Some posts contain JSON/code fragments
- **Missing Images:** 47 posts missing product images  
- **Stock Photos:** Generic/repeated stock images on multiple products
- **Good Posts:** Many posts are actually in good shape

---

## Data Analysis

### Affiliate Link Breakdown
```
Total imported posts: 149
✅ Already have Amazon URLs: 75
🔧 Broken (have source URL): 56
⚠️  Broken (no source URL): ~18
```

### Source Data Availability
- `imported-posts.json` contains 56 posts with valid Amazon URLs
- These can be automatically repaired by matching titles
- Posts without source URLs will need manual Amazon URL entry

---

## Solution 1: Affiliate Link Repair

### Created Tool
**File:** `OCC-Clockwork-Wizards/scripts/repair-affiliate-links.mjs`

### What It Does
1. Loads source `imported-posts.json` from GitHub
2. Queries all WordPress-imported posts from OCC database
3. Matches posts by title with source data
4. Identifies which posts need repair
5. Updates `product_url` in both `posts` and `products` tables

### Usage

**Dry Run (safe, shows what would happen):**
```bash
cd OCC-Clockwork-Wizards
node scripts/repair-affiliate-links.mjs
```

**Live Execution (makes actual changes):**
```bash
cd OCC-Clockwork-Wizards  
node scripts/repair-affiliate-links.mjs --live
```

### Prerequisites
Script requires these environment variables (present in production):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Expected Outcome
- ~56 posts get correct Amazon affiliate URLs
- ~18 posts flagged for manual URL entry
- Report shows which posts were fixed

---

## Solution 2: Content Quality Triage

### Recommended Approach

#### **Phase 1: Auto-Detection Script**
Create script to scan all posts and flag:
- Posts with JSON/code patterns in content
- Posts with missing `image_url`
- Posts with repeated stock photo hashes
- Posts with `nerdymugs.com` URLs (already done above)

#### **Phase 2: Database Quality Flags**
Extend OCC posts schema:
```sql
ALTER TABLE posts ADD COLUMN quality_flags TEXT[];
ALTER TABLE posts ADD COLUMN needs_manual_review BOOLEAN DEFAULT false;
```

Possible flags:
- `corrupted_content`
- `missing_image`
- `stock_image`
- `needs_amazon_url`
- `quality_verified`

#### **Phase 3: Admin UI for Cleanup**
Build admin dashboard with:
- **List View:** Show posts filtered by quality flag
- **Edit Mode:** Fix content, upload images, update URLs
- **Bulk Actions:** Delete, mark reviewed, batch operations
- **Progress Tracker:** "X of 149 posts verified"

---

## Recommended Execution Order

###  **Step 1: Fix Affiliate Links** (NOW)
Run the repair script to fix the 56 posts with source URLs:
```bash
node scripts/repair-affiliate-links.mjs --live
```

### **Step 2: Document Manual Fixes Needed**
Export list of posts that need manual Amazon URLs for later fixing

### **Step 3: Build Quality Detection** (Later)
Create scanner script to flag content/image quality issues

### **Step 4: Gradual Content Cleanup** (Ongoing)
Use admin UI to progressively improve flagged posts over time

---

## Manual Fix Strategy

For posts without source Amazon URLs (~18 posts):

### Option A: Search by Product Title
1. Take product title from post
2. Search Amazon manually
3. Get ASIN
4. Build URL: `https://www.amazon.com/dp/{ASIN}?tag=georgwebsi-20`
5. Update via admin UI

### Option B: Delete Low-Value Posts
If post has:
- No Amazon URL
- Corrupted content
- No image
- Generic/poor title

→ Consider deleting rather than spending time fixing

---

## Next Immediate Action

**TO FIX AFFILIATE LINKS NOW:**

The repair script is ready but needs to run in an environment with Supabase credentials.

**Options:**
1. **Run locally** if you have `.env` file with Supabase vars in OCC repo
2. **Create authenticated API route** version that can be triggered via curl
3. **Wait for env setup** then run the script

**Simplest:** If you can provide Supabase credentials, I can help you run the script now.

---

## Files Created

- `/OCC-Clockwork-Wizards/scripts/repair-affiliate-links.mjs` - Affiliate link repair tool
- `/NerdyMugs-The-Machine/WP_IMPORT_COMPLETE_2026-05-27.md` - Import completion report
- This file - Repair strategy documentation

---

## Success Metrics

### Phase 1 (Affiliate Links)
- [ ] 56+ posts have valid Amazon affiliate URLs
- [ ] List of posts needing manual URLs documented
- [ ] No posts with `nerdymugs.com` URLs remain (except those needing manual fix)

### Phase 2 (Quality)
- [ ] All posts scanned and flagged
- [ ] Admin UI built for review workflow
- [ ] Progress tracking system in place

### Phase 3 (Cleanup)
- [ ] 100% of posts reviewed
- [ ] All quality flags resolved or documented
- [ ] Content meets minimum quality bar

---

**STATUS:** Affiliate repair script ready. Awaiting execution decision.
