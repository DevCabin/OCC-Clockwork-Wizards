# OCC Clockwork Wizards — Weekly Loop Status

**Updated:** 2026-11-02
**Status:** ✅ Weekly autonomous loop validated end-to-end and hardened.

## What the loop does now (fully automatic)
A **single daily Vercel cron** (Hobby-safe: 1 job, once/day) calls `/api/cron/orchestrator` at **13:00 UTC** and dispatches by UTC weekday:

1. **Friday 13:00 UTC** — dedupe (via `/api/jobs/dedupe-inventory`)
2. **Saturday 13:00 UTC** — discovery (via `/api/jobs/weekly-discovery`)
3. **Monday 13:00 UTC** — generation (via `/api/jobs/generate-weekly-posts`)
4. **Every day** — `prepare-scheduled-post-images` (keeps upcoming post images ready)

Detail per job:
- **Dedupe** (`dedupe-inventory`) collapses duplicates keyed by **ASIN → real product URL**; guards: keeps one winner/group (prefers a published post), never deletes WordPress-imported legacy posts or candidate-referenced posts, ignores generic search URLs, skips groups >25. Current live dry-run: **0 true duplicates**.
- **Discovery** reads active rules → Firecrawl Amazon search → OpenAI score; de-dupes cross-week/cross-source by ASIN/URL; stores candidates; CSV via `GET /api/admin/candidates/export?week=YYYY-MM-DD`.
- **Generation** auto-publishes candidates with `discovery_score >= rule.min_score` (no approval); image guard; auto-staggers the batch (top `liveCount` live, rest one per `spacingDays`).

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
