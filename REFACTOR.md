/*
THE LOOP SHOULD BE:

Weekend:
OCC reads weekly rules → searches Amazon → extracts title/price/description/url/image → stores candidate products.

Early week:
OCC generates post drafts from candidates → assigns slugs/category/tags/schedule → marks posts ready/scheduled.

NerdyMugs:
Only reads OCC public endpoints and renders what OCC exposes.

*/

PROMPT ONE:

You are working across two related repositories:

1. OCC-Clockwork-Wizards
   Backend/content pipeline repo: https://github.com/DevCabin/OCC-Clockwork-Wizards
   Live: https://app-liart-five-43.vercel.app
   Stack: Next.js 14 App Router, TypeScript, Supabase/Postgres, Firecrawl, OpenAI, Vercel.

2. NerdyMugs-The-Machine
   Frontend publishing surface repo: https://github.com/DevCabin/NerdyMugs-The-Machine
   Live: https://nerdymugs-the-machine.vercel.app
   Stack: Vite, React, TypeScript, Tailwind, Vercel.

Current architecture principle:
OCC is the sole source of truth. NerdyMugs must only consume approved backend records. If content is not prepared and stored in OCC, it does not exist.

Current state:
OCC currently discovers coffee mug products from Amazon daily, scores them with OpenAI, generates markdown posts, stores them in Supabase, and exposes public GET endpoints consumed by NerdyMugs. NerdyMugs currently fetches /api/posts/ready?limit=100 and renders a public grid/detail pages. Legacy WordPress imports are already done. That phase is complete.

New goal:
Refactor the system into a weekly autonomous “loop” content engine.

Desired behavior:

1. User defines weekly discovery rules before the weekend.
2. On the weekend, OCC performs product searches based on those rules.
3. OCC stores discovered product candidates in a reviewable backend table.
4. The stored candidate data must include at minimum:

   * product_title
   * price
   * description
   * product_url
   * image_url if available
   * source
   * category
   * tags
   * search_query
   * discovery_score if available
   * status
   * discovered_at
5. At the start of the following week, OCC generates draft post content from the approved/usable candidates.
6. OCC schedules those posts according to publishing rules.
7. NerdyMugs frontend remains simple: it reads ready/scheduled public posts from OCC and renders them. Do not move generation, scraping, scoring, secrets, or cron logic into NerdyMugs.
8. After this is built, the system should continue running automatically on a weekly cadence via Vercel Cron or equivalent.

Important implementation preference:
Use Supabase/Postgres as the source of truth for the weekly product candidate queue. Do not build Google Sheets first. A Google Sheets export or admin CSV endpoint may be added later only as an optional visual review layer.

Weekly rule example:
Categories:

* 75% Star Trek
* 10% Star Wars
* 15% Marvel

Tags:

* Captain Pike
* Luke Skywalker
* Hulk

The rules system should support:

* category name
* percentage allocation
* tags/characters/topics
* max candidates per week
* min score threshold
* active/inactive flag
* optional notes

Build this in phases.

PHASE 1 — Audit and safety first:

1. Inspect the OCC repo structure.
2. Identify existing Supabase tables, migrations, product/post generation flow, cron config, and API routes.
3. Identify current security debts and address the most dangerous ones before adding new automation:

   * Ensure POST /api/jobs/update-product-image is protected by Authorization: Bearer CRON_SECRET.
   * Ensure import-wordpress cannot fetch arbitrary untrusted remote URLs unless still needed. If the WordPress import phase is complete, disable or protect it.
   * Ensure CRON_SECRET is never exposed to frontend code.
   * Consider whether /api/posts/recent should be public or restricted.
4. Do not break existing public post rendering.

PHASE 2 — Data model:
Add Supabase migrations/types for:

weekly_discovery_rules:

* id
* name
* category
* allocation_percent
* tags text[]
* search_terms text[]
* max_candidates
* min_score
* is_active
* notes
* created_at
* updated_at

weekly_product_candidates:

* id
* week_start_date
* rule_id
* category
* tags text[]
* search_query
* product_title
* price
* description
* product_url
* affiliate_url
* image_url
* source
* raw_payload jsonb
* extraction_model
* discovery_score
* status enum-like text: discovered | needs_review | approved | rejected | drafted | published | error
* error_message
* discovered_at
* updated_at

content_generation_runs:

* id
* week_start_date
* status
* started_at
* finished_at
* summary jsonb
* error_message

Do not over-engineer this. Keep it simple and easy to inspect in Supabase.

PHASE 3 — Weekly discovery job:
Create a protected backend endpoint:

POST /api/jobs/weekly-discovery

Behavior:

1. Requires Authorization: Bearer CRON_SECRET.
2. Loads active weekly_discovery_rules.
3. Calculates how many searches/candidates each category should receive based on allocation_percent.
4. Builds Amazon mug search queries from category + tags/search_terms.
5. Uses the existing Firecrawl/product scraping path where possible.
6. Extracts product_title, price, description, product_url, image_url.
7. Normalizes affiliate URLs using the existing Amazon affiliate tag georgwebsi-20.
8. Stores results in weekly_product_candidates.
9. Deduplicates by canonical product_url or affiliate_url.
10. Returns a JSON summary:

* rules_processed
* candidates_found
* candidates_inserted
* duplicates_skipped
* errors

Do not generate full blog posts in this job. This job only discovers and stores product candidates.

PHASE 4 — Candidate-to-post generation job:
Create a protected backend endpoint:

POST /api/jobs/generate-weekly-posts

Behavior:

1. Requires Authorization: Bearer CRON_SECRET.
2. Selects approved or high-confidence weekly_product_candidates that are not yet drafted.
3. Uses the smarter content model already configured in OCC to generate:

   * title/headline
   * slug
   * excerpt
   * markdown body
   * SEO title
   * SEO description
   * category
   * tags
   * product metadata
4. Stores generated posts in the existing posts table or equivalent existing content table.
5. Sets publish status/schedule according to existing publishing rules.
6. Updates weekly_product_candidates.status to drafted or error.
7. Returns a JSON summary.

Post content requirements:

* Keep the NerdyMugs voice fun, nerdy, and lightly witty.
* Do not claim official licensing unless product data proves it.
* Avoid trademark-risk phrasing like “official” unless sourced.
* Do not fabricate product details.
* Use only the title, price, description, image, and product URL available from the candidate record.
* Produce concise affiliate-style content.

PHASE 5 — Frontend simplification:
In NerdyMugs-The-Machine:

1. Confirm the active data path is still only OCC public endpoints.
2. Remove or isolate dead frontend discovery/generation code if safe:

   * app/src/lib/contentEngine.ts
   * app/src/lib/discovery.ts
   * app/src/hooks/useAppState.ts
   * app/src/components/AdminPanel.tsx
3. Do not introduce backend secrets into VITE_* env vars.
4. Do not make NerdyMugs scrape, generate, schedule, or call protected OCC job endpoints directly from browser code.
5. Keep build/static generation working.

PHASE 6 — Loop harness:
Add documentation files to OCC:

/docs/LOOP_ARCHITECTURE.md
/docs/AGENT_RULES.md
/docs/WEEKLY_CONTENT_LOOP.md
/docs/EVALS.md

These docs should explain:

* The weekly loop
* The data tables
* The job endpoints
* The cron cadence
* How to test manually
* How to recover from failure
* What the agent is allowed to change
* What the agent must never change without human approval

Create or update package scripts where useful:

* npm run typecheck
* npm run lint
* npm run build
* npm run test:jobs if practical

Loop success criteria:

* Existing public NerdyMugs pages still work.
* OCC builds successfully.
* Weekly rules can be stored.
* Weekly discovery job can run manually and populate candidates.
* Candidate generation job can turn candidates into scheduled posts.
* Protected endpoints reject requests without CRON_SECRET.
* No secrets are exposed in frontend code.
* Documentation explains how the weekly autonomous loop works.

Autonomous operation:
Add or update Vercel Cron configuration so:

* weekly-discovery runs on the weekend.
* generate-weekly-posts runs at the start of the next week.
* existing daily release/staggered publishing can continue if still needed.

Important:
Work iteratively.
Before modifying, inspect the current repo.
Make a short implementation plan.
After each phase, run build/typecheck/lint where available.
If tests/build fail, diagnose and fix before moving on.
Do not invent unavailable APIs.
Do not remove working production behavior unless you have replaced it safely.
Prefer small, understandable changes over a massive rewrite.
Commit logical changes if git is available.

===============

And here is the agent loop instruction I’d add after Cline starts working, especially if you want OpenClaw/Hermes to keep cycling without you micromanaging it.
===============
PROMPT TWO:

You are now operating in LOOP MODE for the NerdyMugs/OCC project.

Your job is not to ask for the next instruction after every small step. Your job is to repeatedly inspect, plan, act, verify, and continue until the weekly autonomous content loop is implemented and validated.

Loop cycle:

1. READ STATE

* Inspect the repo.
* Read relevant docs.
* Read package.json scripts.
* Read API routes.
* Read Supabase helpers.
* Read existing product/post generation logic.
* Read current errors if any.

2. SELECT NEXT TASK
   Choose the highest-value unfinished task from the current phase:

* security protection
* database migration/types
* weekly discovery job
* weekly post generation job
* cron wiring
* frontend simplification
* docs
* tests/build fixes

3. PLAN
   Write a concise plan for the selected task before editing.

4. ACT
   Make the smallest safe code change that advances the task.

5. VERIFY
   Run the strongest available checks:

* npm run typecheck if available
* npm run lint if available
* npm run build
* targeted manual endpoint reasoning if no test exists

6. HANDLE FAILURE
   If verification fails:

* read the error
* identify root cause
* fix it
* rerun verification
  Do not move forward while the project is broken unless the failure is unrelated and documented.

7. RECORD PROGRESS
   Update docs or a progress note with:

* what changed
* what remains
* how to test it
* known risks

8. CONTINUE
   Pick the next task and repeat.

Stop conditions:
Stop and ask for human approval only if:

* a required secret/API key is missing
* production database destructive migration is required
* auth/payment/email infrastructure would be changed
* deployment credentials are needed
* Amazon/API/legal terms create a blocking issue
* you are about to remove large existing functionality without a safe replacement
* three consecutive attempts fail on the same issue

Default behavior:
Keep OCC as the source of truth.
Keep NerdyMugs as the frontend consumer only.
Do not expose CRON_SECRET in frontend code.
Do not move scraping or AI generation into the frontend.
Do not make unsupported claims about products.
Do not fabricate product information.
Prefer Supabase tables over Google Sheets for the first version.
Build the simplest reliable weekly loop first.

=================
One more smaller prompt you can use after the first big Cline run, once it reports what it changed:
=================
PROMPT THREE :

Review the implementation you just created for the weekly OCC/NerdyMugs loop.

Check specifically for:

1. Does OCC remain the sole source of truth?
2. Are all protected job endpoints actually protected by CRON_SECRET?
3. Are any secrets exposed to NerdyMugs frontend code?
4. Can weekly rules create product candidates without generating posts immediately?
5. Can approved/high-confidence candidates become scheduled posts?
6. Does NerdyMugs still only consume public OCC endpoints?
7. Does the build pass?
8. Are the loop docs clear enough for another agent to continue from here?

If anything is incomplete, continue in LOOP MODE:
inspect → plan → patch → verify → document → repeat.

Do not ask me what to do next unless you hit a stop condition from AGENT_RULES.md.
