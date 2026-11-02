# OCC Clockwork Wizards — Weekly Loop Status

**Updated:** 2026-11-02
**Status:** ✅ Weekly autonomous loop validated end-to-end and hardened.

## What the loop does now (fully automatic)
1. **Friday 13:00 UTC** — `GET /api/jobs/dedupe-inventory`
   - Collapses duplicate products/posts keyed by **ASIN → real product URL**.
   - Guards: keeps one winner/group (prefers a published post), never deletes WordPress-imported legacy posts, never deletes posts referenced by candidates, ignores generic Amazon search URLs, and skips any group larger than 25.
   - Current live dry-run: **0 true duplicates** (294 products use search URLs and are not ASIN-dedupable; nothing deleted).
2. **Saturday 14:00 UTC** — `GET/POST /api/jobs/weekly-discovery`
   - Reads active rules → Firecrawl Amazon search → OpenAI score.
   - De-dupes **cross-week and cross-source** by ASIN/URL against ALL prior products + candidates.
   - Stores candidates (`discovered`).
   - CSV of the week's candidates: `GET /api/admin/candidates/export?week=YYYY-MM-DD` (Bearer `CRON_SECRET`).
3. **Monday 15:00 UTC** — `GET/POST /api/jobs/generate-weekly-posts`
   - Auto-publishes candidates with `discovery_score >= rule.min_score` (no manual approval).
   - Image guard: skips candidates without a usable image (`needs_image`).
   - **Auto-staggers** the batch: keeps top `liveCount` (default 3) live, schedules the rest one per `spacingDays` (default 1/day) via `scheduled_for`.

## Public surface (unchanged)
- `GET /api/posts/ready` / `GET /api/posts/[slug]` — date-gated, image-only public feed consumed by NerdyMugs.

## Verified this session
- `npx tsc --noEmit` + `npm run build` pass.
- Live: dedupe dry-run safe (0 deletions), CSV export returns 200 + 27 rows, discovery reports cross-source dupes skipped.
- Earlier full run produced 27 live posts with real Amazon images.

## Notes / optional follow-ups
- 294 products (older CSV imports) use Amazon **search URLs**, so they can't be ASIN-deduped. Optional: backfill real `/dp/ASIN` URLs, then they become dedupe-eligible.
- CSV export is on-demand (regenerable per week). Optional: persist a Saturday snapshot to Supabase Storage for a permanent file.
- `CRON_SECRET` should be rotated periodically (older value was documented in past notes).

## Commands
```bash
# Preview dedupe (no deletion)
curl -sS -X POST https://app-liart-five-43.vercel.app/api/jobs/dedupe-inventory \
  -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' -d '{"dryRun":true}'

# Download this week's candidate CSV
curl -sS "https://app-liart-five-43.vercel.app/api/admin/candidates/export" \
  -H "Authorization: Bearer $CRON_SECRET" -o candidates.csv
```
