# Next Steps — 2026-05-28

**Status:** ✅ COMPLETE — Code deployed, docs updated, ready for user to run jobs

**Session goal:** Clean up imported WordPress posts so the NerdyMugs site is ready to replace the WP site.

---

## ✅ Completed

- [x] Built `POST /api/jobs/hide-no-image-posts` route
- [x] Enhanced `POST /api/jobs/repair-affiliate-links` with fallback Amazon URLs
- [x] Added `needs_review` status to PostStatus enum
- [x] Committed to GitHub and deployed to Vercel
- [x] Updated CHANGELOG.md
- [x] Updated README.md with new routes
- [x] Added RUN_JOBS_COMMANDS.txt helper script

---

## 🔄 User Action Required
cd /Users/george/GITHUB/OCC-Clockwork-Wizards
git pull origin main
```

New files pulled in:
- `app/api/jobs/import-wordpress/route.ts`
- `app/api/jobs/repair-affiliate-links/route.ts`
- `lib/amazon-url-mappings.json`
- `lib/placeholders.ts`
- Several new MD docs

---

## Step 2 — Build: `POST /api/jobs/hide-no-image-posts`

**New route:** `app/api/jobs/hide-no-image-posts/route.ts`

**Logic:**
1. Authenticate with `CRON_SECRET` Bearer token
2. Query all posts WHERE `content_source = 'wordpress-import'` AND (`image_url IS NULL` OR `image_url = ''`)
3. Also check linked product `image_url` via join
4. Mark matching posts: `status = 'needs_review'`
5. Return summary count

**Why `needs_review` not deleted:** Posts stay in DB for potential future image backfill. They simply stop showing in the published/ready feeds.

---

## Step 3 — Enhance: `POST /api/jobs/repair-affiliate-links`

**Existing route already handles:** Posts with a title match in `lib/amazon-url-mappings.json` → updates to the stored Amazon URL.

**What needs to be added — the fallback:**
For posts that still point to `nerdymugs.com` AND have NO match in the mappings file:
- Generate: `https://www.amazon.com/s?k=TITLE_URL_ENCODED&tag=georgwebsi-20`
- Where `TITLE_URL_ENCODED` = `encodeURIComponent(post.title.trim())`
- Update `posts.product_url` + `products.product_url` with this fallback
- Log these as `repairedWithFallback` in the response summary

**Rule:** After this job, NO post should have a `nerdymugs.com` link. Zero exceptions.

---

## Step 4 — Commit & push both changes

Small commit message:
```
feat: hide no-image posts + fallback amazon search links for all wp imports
```

Update `CHANGELOG.md` with these changes.

---

## Step 5 — Trigger both jobs live on Vercel

```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

# Step 1: Hide no-image posts
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/hide-no-image-posts" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# Step 2: Fix all remaining links (with fallback)
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/repair-affiliate-links" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

---

## Step 6 — Verify

Check the live NerdyMugs app:
- No more "NERDY MUG | Image Coming Soon" placeholders visible (those posts hidden)
- All remaining product links go to `amazon.com` (never `nerdymugs.com`)
- Spot-check 3–5 links manually

---

## After this session: What's next

Once WP cleanup is done, the path forward is:
1. **CRITICAL - SEO**: Build individual product detail pages (slug-based URLs) with:
   - Full product description, image gallery
   - SEO meta tags (title, description, Open Graph)
   - CTA button to Amazon (not direct click-to-Amazon on cards)
   - Click on card → goes to detail page → CTA goes to Amazon
2. Set up domain/DNS to point nerdymugs.com at the new Vercel app
3. Shut down the WP site
4. Move on to Phase 3 of the Weekly Inventory Redesign Plan (batch inventory job)

### SEO Architecture Required
**Current:** Card click → directly to Amazon (loses SEO value, no indexed pages)
**Required:** Card click → `/product/{slug}` page → "Buy on Amazon" CTA button

**Each product page needs:**
- Unique URL: `/product/{slug}` (e.g., `/product/iron-man-ceramic-mug`)
- Title tag: Product name + site name
- Meta description: AI-generated excerpt
- Open Graph tags for social sharing
- H1 with product title
- Product image (primary)
- Full description/body content
- Price (if available)
- **CTA Button**: "View on Amazon" with affiliate link
- Related products section (optional)

**Implementation:**
- Create `ProductDetail.tsx` component
- Add route handling in App.tsx for `/product/:slug`
- Update `ProductCard.tsx` to link to detail page instead of Amazon
- Use existing `GET /api/posts/[slug]` endpoint to fetch product data

---

## Key facts for reconnection

| Thing | Value |
|---|---|
| Live API base | `https://app-liart-five-43.vercel.app` |
| Affiliate tag | `georgwebsi-20` |
| Fallback URL pattern | `https://www.amazon.com/s?k={encoded_title}&tag=georgwebsi-20` |
| Posts table field for hiding | `status = 'needs_review'` |
| WP import identifier | `content_source = 'wordpress-import'` |
| Posts with no image | query: `image_url IS NULL OR image_url = ''` on joined product |
| Existing repair route | `app/api/jobs/repair-affiliate-links/route.ts` |
| New route to build | `app/api/jobs/hide-no-image-posts/route.ts` |
