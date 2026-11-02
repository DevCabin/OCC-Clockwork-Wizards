# WordPress Live Import Execution Plan

Date: 2026-05-27  
Owner: Cline + Dr FEATHERSTONE  
Status: Active implementation plan

---

## Goal

Import the usable legacy WordPress product-style posts into OCC through a **live authenticated backend path**, without depending on local-only execution.

This plan explicitly excludes editorial/navigation pages from OCC import.

---

## Confirmed decisions

1. **Live-first execution** — preferred over local-only import flow.
2. **Editorial/navigation pages stay out of OCC** for now.
3. **Duplicate/junk rows should be skipped** rather than forced into the backend.
4. OCC should import only the usable legacy post archive records that fit the product/post model.

---

## Current verified state

### Already completed

- additive legacy metadata fields exist on `posts`
- slug lookup route exists: `GET /api/posts/[slug]`
- WordPress importer script exists and has been hardened with:
  - dry-run support
  - explicit skip rules
  - editorial exclusion
  - slug-collision handling
  - reporting summary output

### Dry-run outcome

Current dry-run behavior indicates:

- total records: `169`
- usable product-style records: `149`
- skipped records: `20`
  - missing title: `15`
  - editorial excluded: `4`
  - missing content and media: `1`

---

## Problem to solve now

The current importer is only a local script.

Dr FEATHERSTONE prefers **live execution**, so we need an OCC route that:

1. is authenticated with the existing `CRON_SECRET` pattern
2. reuses the hardened import logic
3. can run in production against production Supabase
4. optionally support dry-run/report mode

---

## Implementation phases

### Phase 1 — Refactor importer logic into reusable backend module

Move the WordPress import logic out of the standalone script into a reusable library module, likely under `lib/`.

Target outcomes:

- script can call shared import function
- live API route can call the same shared import function
- one source of truth for skip rules and summary behavior

### Phase 2 — Add authenticated live import route

Add a route such as:

- `POST /api/jobs/import-wordpress`

Behavior:

- require `Authorization: Bearer <CRON_SECRET>`
- default to editorial excluded
- support dry-run/report mode via request body if useful
- return summary JSON

### Phase 3 — Validate live route behavior

Checks:

- unauthorized requests rejected
- dry-run works live
- actual import writes to Supabase correctly
- summary counts are returned clearly

### Phase 4 — Documentation and checkpoint

Update as needed:

- `README.md`
- `V1_ARCHITECTURE.md`
- `CHANGELOG.md`

Then:

- commit with a small clear message
- push so live verification is possible

---

## Success criteria

This task is successful when:

1. OCC exposes a live authenticated WordPress import path
2. the live path reuses the hardened import rules
3. editorial/navigation pages remain excluded
4. usable legacy posts import into production OCC correctly
5. imported records retain stable slug and legacy path metadata
6. the work is documented and safe to resume later if interrupted

---

## First implementation move

1. extract reusable import logic from `scripts/import-wordpress-posts.mjs`
2. add live route using existing OCC auth pattern
3. test dry-run/live route behavior
4. update docs/changelog
