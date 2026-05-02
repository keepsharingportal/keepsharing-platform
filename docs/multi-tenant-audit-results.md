# Multi-Tenant Audit Results
## Date: May 2026 · Build Run #10

---

## Summary

The codebase is architecturally multi-tenant-ready in its data layer and GHL integration, but several tables and API routes need `publication_id` filtering before a second publication can safely go live.

**GHL integration: READY.** `ghl.ts` routes all calls through `publicationSlug` → per-publication PITs and location IDs. No hardcoded publication in the lib.

**Database schema: NEEDS MIGRATION.** Core tables (`advertiser_accounts`, `partner_leads`, `lead_submissions`, `guide_listings`) are missing `publication_id` columns. All data currently belongs to RRP implicitly.

**API routes: NEEDS UPDATE.** Queries to the tables above don't filter by publication. On a single-publication deployment this is safe. Once a second publication is added, queries could return cross-publication data.

---

## Findings

### 1. Hardcoded Publication References

| File | Line | Finding | Severity |
|------|------|---------|----------|
| `src/app/get-media-kit/page.tsx` | 52 | `.eq('slug', 'river-region-parents-system')` — intentional, this is a seed slug | LOW — intentional brand |

**Verdict:** No problematic hardcoded references. The `river-region-parents-system` slug lookup is intentional for the RRP media kit lead magnet.

---

### 2. Tables Missing publication_id

| Table | Current State | Action Required |
|-------|--------------|-----------------|
| `advertiser_accounts` | No publication_id | Add column + backfill with 'rrp' publication ID |
| `partner_leads` | No publication_id | Add column + backfill |
| `lead_submissions` | No publication_id | Add column + backfill |
| `guide_listings` | No publication_id | Add column + backfill |
| `guide_articles` | No publication_id | Add column + backfill |
| `reader_submissions` | Has `publication_id` (nullable) | OK — add FK to publications table |
| `partner_auth_tokens` | References advertiser_id | OK once advertiser_accounts has publication_id |

**Required migration (pre-Boom launch):**
```sql
-- Add publication_id to core tables
ALTER TABLE advertiser_accounts ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE partner_leads ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE lead_submissions ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE guide_listings ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE guide_articles ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);

-- Backfill existing data to RRP
UPDATE advertiser_accounts SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE partner_leads SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE lead_submissions SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE guide_listings SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE guide_articles SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
```

---

### 3. API Routes Missing Publication Filter

| Route | Table Queried | Missing Filter | Priority |
|-------|--------------|----------------|----------|
| `/api/partner-leads/capture` | `advertiser_accounts`, `partner_leads` | No pub filter | HIGH — pre-Boom |
| `/api/onboarding/submit` | `advertiser_accounts` | No pub filter | MEDIUM |
| `/api/leads/capture` | `lead_submissions` | No pub filter | MEDIUM |
| `/api/listing-leads` | `lead_submissions` | No pub filter | MEDIUM |
| `/api/admin/run-reminders` | `partner_leads` | No pub filter | LOW — admin only |
| `/partners/[slug]/admin` | `advertiser_accounts`, `partner_leads` | Filtered by advertiser slug, OK | LOW |

**Fix approach:** After `publication_id` columns are added, all insert operations should include `publication_id`. Reads should filter by publication where appropriate.

---

### 4. GHL Integration

`ghl.ts` is fully multi-tenant ready:
- `resolveLocationId(publicationSlug)` maps slug → env var `GHL_LOCATION_ID_{SLUG}`
- `resolvePit(publicationSlug)` maps slug → env var `GHL_PIT_{SLUG}`
- All GHL API calls route through publication-specific tokens

**Required for Boom:** Set env vars `GHL_PIT_BOOM` and `GHL_LOCATION_ID_BOOM` once Boom's GHL sub-account is created.

---

## Verdict: Ready for Boom with 1 Week of Prep

The codebase doesn't have breaking multi-tenant bugs — it just has missing publication isolation that needs to be added before a second publication's data can safely share the same database without cross-contamination.

**Safe to do now:** Add Boom publication row, set GHL env vars, configure DNS.
**Required before Boom data entry:** Run the `publication_id` backfill migration above.
**Required before Boom goes live to users:** Update API insert routes to pass `publication_id`.
