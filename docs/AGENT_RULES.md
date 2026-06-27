# Agent Rules for OCC Clockwork Wizards

**What agents are allowed to change without approval:**

## ✅ Safe Changes (No Approval Needed)

### Documentation
- Update any `*.md` file in `/docs`
- Add new documentation files
- Update comments in code

### Code Organization
- Rename internal functions/variables (if no API change)
- Extract helper functions
- Add type definitions
- Add utility modules

### API Endpoints
- Add new protected job endpoints (must require CRON_SECRET)
- Add new public GET endpoints
- Improve error messages
- Add input validation

### Database
- Add new tables via migrations
- Add new columns to existing tables
- Add indexes for performance
- Add triggers for auto-updates

### Configuration
- Update `vercel.json` cron schedules
- Add environment variable documentation
- Update package.json scripts

### Testing & Quality
- Add type checking commands
- Add linting rules
- Add build verification

---

## ⚠️ Changes Requiring Human Approval

### Security
- Remove or weaken authentication on endpoints
- Change CRON_SECRET validation logic
- Add new CORS origins
- Modify environment variable handling

### Database
- **Destructive migrations** (drop tables/columns)
- Change primary keys
- Remove unique constraints
- Modify enum values that would invalidate existing data

### API Behavior
- Change response shapes on existing endpoints
- Remove existing endpoints
- Change URL paths
- Modify pagination behavior

### External Services
- Add new API key dependencies
- Change AI models (OpenAI model versions)
- Change scraping service (Firecrawl alternatives)
- Add new third-party integrations

### Affiliate/Business Logic
- Change affiliate tag (`georgwebsi-20`)
- Modify product scoring thresholds
- Change Amazon URL generation
- Modify price filtering logic

---

## 🚫 Forbidden Changes

### Security Violations
- **NEVER** expose CRON_SECRET in frontend code
- **NEVER** log secrets or API keys
- **NEVER** allow unauthenticated access to job endpoints
- **NEVER** commit `.env` files with real values

### Architecture Violations
- **NEVER** move scraping logic to NerdyMugs frontend
- **NEVER** move AI generation to browser code
- **NEVER** make NerdyMugs call protected OCC endpoints directly
- **NEVER** bypass Supabase for content storage

### Legal/Compliance
- **NEVER** fabricate product information
- **NEVER** claim official licensing without proof
- **NEVER** use trademarked phrases like "official" without source
- **NEVER** scrape sites that prohibit it in robots.txt/TOS

---

## 📋 Stop Conditions

Stop and ask for approval if:

1. **Missing Secrets**: Required API key or secret is not available
2. **Destructive Migration**: Would delete or corrupt existing data
3. **Auth Changes**: Modifying authentication/authorization flow
4. **Payment Changes**: Affecting affiliate revenue or costs
5. **Legal Risk**: Unclear trademark/licensing situation
6. **3 Consecutive Failures**: Same issue fails 3 times in a row
7. **Production Down**: Deployment would break existing functionality

---

## 🔄 Loop Mode Protocol

When operating in LOOP MODE (autonomous):

1. **Read State** → Inspect repo, docs, errors
2. **Select Task** → Choose highest-value unfinished work
3. **Plan** → Write concise plan before editing
4. **Act** → Make smallest safe change
5. **Verify** → Run build/typecheck/lint
6. **Handle Failure** → Fix or stop if 3 attempts fail
7. **Record** → Document what changed and what's next
8. **Continue** → Pick next task

**Commit after every logical change.**

---

## 📞 Communication Style

- Speak in first person ("I")
- Be concise unless detail is requested
- Report failures directly without sugarcoating
- Ask for clarification on ambiguous instructions
- Confirm understanding before major changes
