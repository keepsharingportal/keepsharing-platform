# Launching River Region Boom — Step by Step

## Already Built (Ready Now)
- [x] `publications` table with all 6 markets seeded (migration 024)
- [x] GHL integration routes through publication-specific PITs (`ghl.ts`)
- [x] Partner Engine templates work for any publication
- [x] Marketer-in-a-Box onboarding works for any business category
- [x] Operations Dashboard supports multi-publication views
- [x] Proposal generator supports any publication
- [x] Partner Backend Dashboard auth works per-slug
- [x] Multi-tenant audit complete with clear remediation path

## Pre-Launch Migration (1 hour)

Run this SQL before entering any Boom data:

```sql
-- Add publication_id to core tables
ALTER TABLE advertiser_accounts ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE partner_leads ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE lead_submissions ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE guide_listings ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);
ALTER TABLE guide_articles ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES publications(id);

-- Backfill existing RRP data
UPDATE advertiser_accounts SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE partner_leads SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE lead_submissions SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE guide_listings SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;
UPDATE guide_articles SET publication_id = (SELECT id FROM publications WHERE slug = 'rrp') WHERE publication_id IS NULL;

-- Activate Boom
UPDATE publications SET is_active = true WHERE slug = 'boom';
```

## Step-by-Step Launch (estimated 1 week)

### Day 1: GHL Setup
- [ ] Create Boom GHL sub-account
- [ ] Get location ID and PIT token
- [ ] Add to `.env.local`: `GHL_PIT_BOOM=pit-...` and `GHL_LOCATION_ID_BOOM=...`
- [ ] Set `publications.boom.ghl_location_id` in DB

### Day 2: Domain Configuration
- [ ] Set up boom.riverregionparents.com subdomain (or use path routing `/boom/`)
- [ ] Configure DNS and SSL certificate
- [ ] Test that GHL email delivery works from Boom's sub-account

### Day 3: Content Migration
- [ ] Import existing Boom advertisers into `advertiser_accounts` with `publication_id = (SELECT id FROM publications WHERE slug = 'boom')`
- [ ] Import existing Boom content into `guide_articles`
- [ ] Set up Boom-specific email templates if voice differs from RRP

### Day 4: API Route Updates
- [ ] Add `publication_id` to all insert routes (partner-leads/capture, leads/capture, listing-leads)
- [ ] Test that Boom leads don't appear in RRP dashboard

### Day 5: Activation
- [ ] Verify all partner pages render with correct branding
- [ ] Test a full lead capture end-to-end (form submit → GHL → SMS → partner notification)
- [ ] Spot-check that admin/today shows Boom market pulse correctly

### Day 6: Sales Team
- [ ] Train Boom sales team on proposal generator
- [ ] Create first 5 prospect proposals
- [ ] Schedule first sales calls
- [ ] Send "Boom is live" announcement email

## Estimated Total Time: 1 week
## Estimated Cost: Dev time only (no new software costs)

---

*Last updated: May 2026 · See /docs/multi-tenant-audit-results.md for technical details*
