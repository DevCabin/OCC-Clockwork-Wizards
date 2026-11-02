# OCC Weekly Inventory Redesign Plan

Date: 2026-05-26  
Owner: Cline + Dr FEATHERSTONE  
Status: Planning before implementation

---

## 1) Goal

Refactor `OCC-Clockwork-Wizards` from a daily-feed-oriented ingestion pipeline into a **batch inventory preparation engine** for NerdyMugs.

The key rule is:

> If a product/post is not in the OCC database, it does not exist as far as the NerdyMugs app is concerned.

---

## 2) Confirmed product decisions

These decisions are now treated as planning assumptions unless explicitly revised.

1. **Batch generation in advance:** Yes.
2. **Published is a real backend state:** Yes.
3. **Categories remain first-class:** Yes.
4. **Round 1 source scope:** Amazon only.
5. **Round 1 dedupe rule:** strict title equality.
6. **Weighting/rule control remains in NerdyMugs:** Yes.
7. **Copy generation strategy:** start simple, allow richer publish-day generation later.
8. **Larger inventory buffers may come later:** yes, but start conservatively to avoid risk.

---

## 3) Current OCC behavior to replace or reshape

Current OCC behavior is optimized around:

- daily product runs
- daily post runs
- recent/latest feed endpoints
- uniqueness by `(product_url, run_date)`
- one post per product generated immediately after ingestion

This is not the right shape for a prepared weekly/monthly inventory model.

---

## 4) Target OCC role after redesign

OCC should become a **content inventory engine** with these core jobs:

1. receive or read the current targeting rules
2. discover candidate products from Amazon only
3. reject duplicates against existing recent inventory using strict title match
4. prepare content records in advance
5. store them with explicit lifecycle status
6. expose inventory endpoints suitable for NerdyMugs consumption and publishing
7. mark records published once they are live on the site

---

## 5) Recommended minimal data model changes

## Products table

Keep `products`, but shift thinking from “daily feed rows” to “inventory candidates/products.”

Recommended additions/changes:

1. `normalized_title` or equivalent derived field
   - used for strict title dedupe

2. `discovered_at`
   - more semantically clear than only relying on `run_date`

3. optional `source_query` / `source_rule_snapshot`
   - useful for debugging why a product was collected

4. consider moving away from uniqueness by `(product_url, run_date)`
   - that uniqueness rule encourages re-ingestion across runs

Round 1 recommendation:
- keep schema changes minimal
- add the fields needed for dedupe and inventory reasoning first

## Posts table

Posts need lifecycle support.

Recommended additions:

1. `status`
   - enum/text values such as:
     - `ready`
     - `published`
     - `rejected`

2. `published_at`
   - nullable until live

3. `scheduled_for`
   - nullable initially; used when a publish slot is assigned

4. `content_mode`
   - indicates whether the stored content is:
     - minimal summary
     - prompt seed
     - fuller generated copy

5. optional `category`, `subcategory`, `tags`
   - may be stored on posts for direct downstream use if not already modeled elsewhere

Round 1 recommendation:
- minimum viable additions:
  - `status`
  - `published_at`
  - optional `scheduled_for`

---

## 6) Proposed lifecycle model

Round 1 lifecycle:

1. product discovered
2. title checked against recent inventory
3. if duplicate title: reject/skip
4. if accepted: generate minimal content asset
5. insert post as `ready`
6. when NerdyMugs publishes it live: mark `published`

Possible later lifecycle:

- `candidate`
- `ready`
- `scheduled`
- `published`
- `rejected`

Round 1 recommendation:
- implement only what is required to simplify the system
- likely start with:
  - `ready`
  - `published`
  - `rejected`

---

## 7) Batch strategy recommendation

Although month-scale batching is appealing, it should not be the first operational step if scraping/extraction pressure is uncertain.

### Recommendation

Start with a safer staged inventory target:

1. **initial batch target:** one week of inventory plus modest safety buffer
2. **then measure:**
   - extraction success rate
   - duplicate rate
   - API latency
   - risk of source throttling
3. **then expand** toward longer inventory windows if stable

Practical v1 example:

- generate 10–20 `ready` records first
- later extend to larger monthly-style pool once behavior is verified

This keeps the design compatible with a month-scale future without taking unnecessary round-1 risk.

---

## 8) Dedupe strategy for round 1

Confirmed round-1 rule:

> Duplicate if normalized title matches exactly.

### Required implementation pieces

1. title normalization function
   - lowercase
   - trimmed whitespace
   - collapse repeated spaces
   - optionally strip punctuation if desired, but only if approved

2. recent inventory lookup window
   - compare candidate titles against recent products and/or posts

3. configurable lookback window
   - start with recent history, not full history, if needed for performance

### Recommendation

For round 1, compare against recent existing **products** and **posts** by normalized title, scoped to the active rule family or all active NerdyMugs inventory depending on data shape.

---

## 9) Amazon-only simplification

Round 1 should remove Etsy from active ingestion.

Reasoning:

- reduces source variability
- simplifies extraction/debugging
- reduces prompt/scoring edge cases
- lowers the moving parts during the reset

Implementation impact:

- `allowedDomains` becomes Amazon-only
- candidate URL generation becomes Amazon-only
- docs/changelog should reflect the narrowed scope

---

## 10) Content generation strategy

Confirmed direction:

- start simple
- richer final content can happen later, possibly in NerdyMugs on publish day with a stronger reasoning tier

### Recommended round-1 OCC output

OCC should generate one of these lightweight content forms:

1. **minimal summary**
   - title
   - short excerpt
   - compact body/summary

2. **prompt seed**
   - a structured prompt/context packet for downstream finalization

3. **hybrid**
   - summary + prompt seed metadata

### Recommendation

Round 1 should likely produce a **minimal summary plus metadata**.

That gives NerdyMugs something stable to work with while preserving the option to generate richer final copy later.

---

## 11) NerdyMugs ↔ OCC responsibility boundary

### OCC owns

- discovery
- ingestion
- duplicate prevention
- prepared inventory
- content status
- published marking

### NerdyMugs owns

- weighting/preferences UI
- category emphasis changes week-to-week
- publish-day experience
- public site rendering
- optional high-tier final copy generation on publish day

### Integration requirement

We need a clean way for NerdyMugs-defined rules to influence OCC batch preparation.

Possible options:

1. OCC reads config from a shared DB table
2. NerdyMugs writes config to OCC-owned DB config
3. NerdyMugs triggers OCC with a rule snapshot payload

Round 1 recommendation:

- prefer **DB-backed config** over ad hoc payload triggers if feasible
- but avoid overengineering before the minimum workflow is working

---

## 12) Required backend implementation phases

## Phase 1 — Schema and status groundwork

Deliverables:

- add post status field
- add published timestamp field
- add normalized title support for strict dedupe
- optionally add scheduling field

Success criteria:

- OCC can represent ready vs published content cleanly

## Phase 2 — Source and dedupe simplification

Deliverables:

- remove Etsy from active ingestion path
- implement strict normalized-title duplicate rejection
- add configurable recent lookback query

Success criteria:

- OCC no longer ingests from multiple marketplaces in round 1
- duplicate titles are rejected consistently

## Phase 3 — New batch inventory job

Deliverables:

- replace or supplement daily jobs with a weekly inventory-prep job
- store prepared records as `ready`
- return operational metrics from the job

Success criteria:

- one job run can produce a publishable inventory pool without frontend help

## Phase 4 — Inventory endpoints

Deliverables:

- endpoint(s) for `ready` items
- endpoint(s) for `published` items
- endpoint or mutation to mark content published

Success criteria:

- NerdyMugs can consume inventory based on content state rather than recent-feed heuristics

## Phase 5 — Documentation and cleanup

Deliverables:

- update README
- update V1 architecture docs
- update changelog
- mark obsolete daily-feed assumptions as superseded where appropriate

Success criteria:

- backend docs match the new model

---

## 13) Files likely to change in OCC

- `lib/products.ts`
- `app/api/jobs/daily-products/route.ts`
- `app/api/jobs/daily-posts/route.ts`
- `lib/openai.ts`
- `lib/types.ts`
- `supabase/migrations/*`
- `README.md`
- `V1_ARCHITECTURE.md`
- `CHANGELOG.md`
- `vercel.json`

Potentially new files/endpoints:

- `app/api/jobs/weekly-inventory/route.ts`
- `app/api/posts/ready/route.ts`
- `app/api/posts/published/route.ts`
- `app/api/posts/mark-published/route.ts`

---

## 14) Immediate next step before code

Before implementation begins, create and approve the exact execution plan for:

1. schema migration shape
2. batch-job API/route design
3. status enum values
4. publish-marking flow
5. how NerdyMugs sends/owns weighting preferences

That execution plan should be the next implementation document used to guide the first code changes.