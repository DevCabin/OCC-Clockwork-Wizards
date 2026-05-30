# Next Steps — 2026-05-28

**Status:** ✅ Launch-ready with controlled publishing

---

## Current state

- 3 junk `Custom Styles` / `wp-global-styles-*` posts have been deleted from the live database.
- 30 posts are live on the public feed right now.
- 118 posts are scheduled to unlock automatically, one every 3 days, starting `2026-05-31T12:00:00.000Z`.
- Future scheduled posts are hidden from both:
  - `GET /api/posts/ready`
  - `GET /api/posts/[slug]`

---

## Live maintenance commands

```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d '=' -f2-)

# Preview bad-post cleanup
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/delete-bad-posts" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Delete bad posts
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/delete-bad-posts" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# Preview scheduling
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/stagger-post-release" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "liveCount": 30, "spacingDays": 3, "startDate": "2026-05-31T12:00:00.000Z"}'

# Apply scheduling
curl -sS -X POST "https://app-liart-five-43.vercel.app/api/jobs/stagger-post-release" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "liveCount": 30, "spacingDays": 3, "startDate": "2026-05-31T12:00:00.000Z"}'
```

---

## How to edit upcoming posts and images

Use Supabase directly.

### Posts table

Edit these fields in `posts`:

- `title`
- `excerpt`
- `body_md`
- `status`
- `scheduled_for`
- `legacy_source_path`

Recommended filters:

- `status = ready` to see the upcoming queue
- sort by `scheduled_for` ascending

### Products table

Use the `product_id` from the post row, then open the matching row in `products`.

Edit:

- `image_url`
- `product_url`
- `title`
- `description`

### Verification

- Public feed now: `https://app-liart-five-43.vercel.app/api/posts/ready?limit=250`
- Recent inventory sample: `https://app-liart-five-43.vercel.app/api/posts/recent?limit=100`

---

## Operational note

The frontend static build only regenerates static HTML and sitemap entries for currently public posts at deploy time.

That means:

- newly scheduled posts will still go live automatically through the SPA fallback when the backend date arrives
- but to refresh static HTML and `sitemap.xml` for those newly public posts, redeploy the frontend after a release batch
