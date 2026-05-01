# BUILD RUN #10 — EPIC: Fill Build Run #9 Gaps + Polish + Boom Launch Prep

**This build picks up exactly what Build Run #9 didn't ship.** Tasks 7, 8, 9, 10 were specced but didn't make it into the codebase. This build delivers them — focused, tight, no scope creep.

═══════════════════════════════════════════════════════
## CRITICAL FRAMING
═══════════════════════════════════════════════════════

This is a GAP-FILL build. Build Run #9 shipped Tasks 1-6 (23 Points foundation, /advertise port, /get-media-kit polish, DFC team, Mom Insiders, Marketer-in-a-Box) but stopped short of Tasks 7-10. This build delivers those.

**STRICT TASK ORDER. STOP IF BLOCKED. NO PUSHING THROUGH.**

If a task fails after 3 attempts, document it and STOP that task. Move to the next one. Do NOT push through partial completions hoping it works. Do NOT write thorough-sounding status reports for broken features.

If by the end you've completed only 3 of the 6 tasks, that's better than completing 6 broken tasks. Truthful incomplete > confidently-broken.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES
═══════════════════════════════════════════════════════

- **"We Help Your Future Customers Find You."** Tagline locked.
- **The 23 Points Proven Ad Formula** at `/docs/marketing-formula/23-point-proven-ad-formula.md` is the spine of every conversion surface.
- **The KeepSharing Partner Engine** is the product. Built by River Region Parents. Powered by KeepSharing.
- **The publication owns the trust layer.** RRP-branded everything.
- **The secretary test.** Every interaction passes: "Could a 55-year-old office secretary use this on her phone?"
- **No mock data ships.** Every dashboard shows real data or a graceful empty state.
- **Multi-tenant readiness.** Every query filters by publication_id. No hardcoded RRP references.

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve: file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, image fetches, content writing, GHL API calls.

STOP only on:
1. Unresolvable build/runtime errors after 3 attempts on a single task
2. Strategic decisions not specified in this prompt
3. Destructive operations (dropping tables, deleting production data)
4. Missing credentials in `.env.local`

Required reading before starting:
- `/docs/marketing-formula/23-point-proven-ad-formula.md` (the formula)
- `/docs/keepsharing-knowledge-base.md`
- `/src/app/admin/today/page.tsx` (to understand current state of Operations Dashboard)
- `/src/app/admin/partners/[slug]/review/page.tsx` (existing Jason review page — pattern reference)
- `/src/lib/ghl.ts` (GHL integration)
- Migration 020 (most recent applied migration)

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

Verify migration 020 is applied:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name IN ('reader_submissions', 'mom_insider_profiles', 'advertiser_team_members');
```
Should return 3 rows. If not, stop.

Verify dev server starts cleanly:
```bash
rm -rf .next && npm run dev
```

═══════════════════════════════════════════════════════
## TASK 1 — OPERATIONS DASHBOARD: REAL DATA
═══════════════════════════════════════════════════════

The /admin/today screen currently shows mock data. Wire it to live database queries.

### 1A — Migration `021_action_items_and_activity.sql`

```sql
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID,
  title TEXT NOT NULL,
  urgency TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_business_name TEXT,
  target_contact_name TEXT,
  target_phone TEXT,
  target_email TEXT,
  email_template_slug TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_items_urgency ON action_items(urgency, completed);
CREATE INDEX IF NOT EXISTS idx_action_items_publication ON action_items(publication_id);

CREATE TABLE IF NOT EXISTS print_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID REFERENCES advertiser_accounts(id),
  publication_id UUID,
  issue_month DATE,
  ad_size TEXT,
  page_size_fraction NUMERIC,
  position TEXT,
  monthly_revenue NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_placements_month ON print_placements(issue_month);

CREATE TABLE IF NOT EXISTS business_spotlight_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_description TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID,
  nomination_type TEXT,
  nominee_name TEXT,
  nominee_relationship TEXT,
  nominator_name TEXT,
  nominator_email TEXT,
  why_nominated TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS birthday_spotlight_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID,
  child_name TEXT NOT NULL,
  child_age INT,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  issue_month DATE,
  package_type TEXT,
  amount_paid NUMERIC,
  status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1B — Wire `/admin/today/page.tsx`

Replace ALL mock data with real queries. For each Market Pulse card per publication:
- Query active partners (advertiser_accounts where contract_end_date > NOW() filtered by publication)
- Query this month's print pages from print_placements
- Query this month's revenue
- If no data, show "No data yet" gracefully — don't crash, don't show $0

For Urgent Action Items:
- Query action_items where urgency='urgent' and completed=false, sorted by due_date
- Each card: title, business name, phone, email, "Draft email" button
- Draft email button: reads email_template_slug, opens mailto: with templated subject + body

For Incoming feed:
- Query business_spotlight_submissions, nominations, birthday_spotlight_orders (latest 3 each)
- If all empty, show "No new submissions yet — they'll appear here as they come in"

### 1C — Email templates

Create `/docs/email-templates/` with 4 starter templates:

`renew-contract-30day.md`:
```yaml
---
subject: "Your contract expires {{contract_expiry_date}} — let's lock in {{next_year}}"
slug: "renew-contract-30day"
variables: ["{{business_name}}", "{{contact_name}}", "{{contract_expiry_date}}", "{{next_year}}"]
---

Hi {{contact_name}},

Your {{business_name}} contract expires {{contract_expiry_date}}. Wanted to give you a heads up so we can lock in your spot for {{next_year}}.

Same rate as last year, same package. We can have the new agreement signed in 5 minutes if you're good to keep going.

Reply with a "yes" or call me at 334-XXX-XXXX.

Jason
```

Similar templates for:
- `check-dropbox-art.md` — "we're missing art for your upcoming ad"
- `send-agreement-new-advertiser.md` — "welcome aboard, here's your agreement"
- `verify-art-pre-print.md` — "we have your art, confirming this is final"

### 1D — Seed test data

Insert 3-5 sample action_items so the dashboard isn't empty:

```sql
INSERT INTO action_items (title, urgency, action_type, target_business_name, target_contact_name, target_phone, target_email, email_template_slug, due_date)
VALUES 
  ('Renew Saint James contract', 'urgent', 'renew_contract', 'Saint James School', 'admissions@saintjames.edu', '334-555-0001', 'admissions@saintjames.edu', 'renew-contract-30day', CURRENT_DATE + INTERVAL '5 days'),
  ('Check Dropbox for Trinity Christian art', 'this-week', 'check_dropbox', 'Trinity Christian Academy', 'design@trinity.org', '334-555-0002', 'design@trinity.org', 'check-dropbox-art', CURRENT_DATE + INTERVAL '7 days'),
  ('Send new partner agreement to Camp Cheaha', 'urgent', 'send_agreement', 'Camp Cheaha', 'director@campcheaha.com', '334-555-0188', 'director@campcheaha.com', 'send-agreement-new-advertiser', CURRENT_DATE + INTERVAL '2 days');
```

### 1E — DONE WHEN

[ ] Migration 021 applied
[ ] /admin/today shows real Market Pulse data per publication (or graceful empty)
[ ] Urgent Action Items pull from action_items table
[ ] Draft email button opens mailto: with templated content
[ ] /docs/email-templates/ contains 4 templates
[ ] Incoming feed pulls from real tables
[ ] Test action_items seeded so dashboard isn't empty
[ ] No mock data anywhere on /admin/today

═══════════════════════════════════════════════════════
## TASK 2 — PROPOSAL GENERATOR
═══════════════════════════════════════════════════════

Build the proposal generator at /admin/proposals so Jason can send custom proposals to prospects within 24 hours of a sales call.

### 2A — Migration `022_proposals.sql`

```sql
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_slug TEXT UNIQUE NOT NULL,
  publication_id UUID,
  business_name TEXT NOT NULL,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_category TEXT,
  estimated_ltv TEXT,
  recommended_tier TEXT,
  recommended_addons TEXT[] DEFAULT '{}',
  custom_monthly_price NUMERIC,
  contract_length_months INT,
  intro_paragraph TEXT,
  value_props JSONB DEFAULT '[]',
  roi_math TEXT,
  onboarding_timeline TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  viewed_count INT DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(token_slug);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
```

### 2B — Proposal templates by category × tier

Create `/docs/proposal-templates/` with 6 templates as starting points (Jason will edit these based on real sales conversations):

**`pediatric-care-tier-4.md`:**
```yaml
---
category: pediatric-care
tier: tier-4
title: The KeepSharing Partner Engine — Full Power
---

# Recommended Approach for {{business_name}}

After our conversation, here's what we'd build for {{business_name}} as a Tier 4 KeepSharing Partner.

## Why Tier 4 Is Right for Your Practice

Pediatric practices serving anxious parents and young patients need more than visibility. They need a system that takes a hesitant parent from "I'm not sure" to "I trusted my child with these people" without you ever picking up the phone first.

That's what The KeepSharing Partner Engine does. Your custom offer page lives at the heart of a multi-channel system that brings parents to you already pre-qualified, already warmed up, already trusting River Region Parents — which means trusting you.

## What We'd Build for {{business_name}}

- **Custom Offer Page** — A conversion-optimized landing page built around your specific offer (free first visit, anxiety-friendly consultation, etc.)
- **Magazine Presence** — Your full-page ad in River Region Parents every month, with QR codes routing parents directly to your offer page
- **Social Campaign** — Targeted Facebook and Instagram ads pointing to your offer
- **Email Mention** — Featured in our weekly newsletter to 8,000+ family inboxes
- **Speed-to-Lead Handoff** — When a parent submits your form, an SMS goes to them within 60 seconds. Email lands in your inbox immediately. The lead is hot when you call.
- **14-Day Nurture Sequence** — For parents who don't convert immediately, our RRP-branded email sequence keeps your offer in front of them until they're ready
- **Monthly Performance Reports** — Lead count, conversion rate, ROI estimate, what's working

## The ROI Math

A pediatric practice typically has a customer LTV of $1,200-$3,000 across all family members. Generating just 3 new patients per month from this system pays for the entire $1,500/mo investment. Every patient beyond that is pure profit.

If your practice converts at the typical 30% rate from initial contact to first appointment, this system needs to generate 10 leads per month to deliver 3 new patients. Most Tier 4 partners see 15-25 leads per month within 90 days.

## Onboarding Timeline

- **Week 1:** Onboarding form (60 minutes total of your team's time, completed by your office secretary on her phone between calls)
- **Week 2:** Page goes live
- **Week 3-4:** First leads start flowing
- **Day 1, Month 2:** Your first monthly performance report

## Investment

**$1,500/month with 12-month commitment.**

This includes everything above. No setup fees. No hidden costs. Cancel after 12 months with 30-day notice.

## Yes, Let's Proceed

Click below to accept this proposal. We'll send the agreement and start the onboarding process within 24 hours.
```

Create similar templates for:
- `school-tier-4.md`
- `pediatric-care-tier-3.md`
- `healthcare-tier-3.md`
- `childcare-tier-2.md`
- `boutique-tier-1.md`

Each follows the same structure: why this tier, what we'd build, ROI math, timeline, investment, accept CTA.

### 2C — Build admin pages

**`/src/app/admin/proposals/page.tsx`** — list view:
- Table showing all proposals with columns: Business Name, Status, Tier, Sent Date, Expires, Actions
- Filter by status (Draft / Sent / Viewed / Accepted / Declined / Expired)
- Search by business name or contact name
- "+ New Proposal" button → /admin/proposals/new

**`/src/app/admin/proposals/new/page.tsx`** — builder form:
- Section 1: Business Info (name, contact info, category dropdown, estimated LTV)
- Section 2: Recommendation (tier radio, addons multi-select, custom price, contract length)
- Section 3: Proposal Content (intro, value props textarea, ROI math, timeline)
- Live preview pane on the right showing the rendered proposal page
- "Save Draft" button → saves with status='draft'
- "Generate & Send" button → publishes at /proposal/[token], sends email to contact_email via GHL

When category and tier are both selected, auto-fill the proposal content from the matching template at /docs/proposal-templates/.

**`/src/app/admin/proposals/[id]/page.tsx`** — view/edit existing proposal:
- Same form as /new but pre-populated
- "Update" button to save changes
- View tracking display: how many views, when last viewed

### 2D — Build public proposal page

**`/src/app/proposal/[token]/page.tsx`**:
- Magazine-quality polished design matching /advertise visual language
- Hero: "A Custom Partnership Proposal for {{business_name}}" with date and Jason's photo
- Greeting paragraph
- Recommended tier hero card
- "What We'd Build" — value props as bullet list
- "The ROI Math" section
- "Onboarding Timeline" — visual 4-step process
- "Investment" — pricing summary
- Two CTAs at bottom:
  - "Yes, Let's Proceed" (terra fill) → POST to `/api/proposals/[id]/accept` → updates status, sends Jason notification
  - "I Have Questions" (navy outline) → opens reply form → emails Jason

When page loads, increment viewed_count and set viewed_at.

### 2E — DONE WHEN

[ ] Migration 022 applied
[ ] /admin/proposals lists proposals with filters
[ ] /admin/proposals/new builder works with live preview
[ ] Auto-fill from category × tier templates works
[ ] /proposal/[token] renders polished public page
[ ] Accept button updates status and notifies Jason
[ ] 6 proposal templates exist in /docs/proposal-templates/
[ ] Test: create draft, view it, accept it, verify status updates

═══════════════════════════════════════════════════════
## TASK 3 — PARTNER BACKEND DASHBOARD
═══════════════════════════════════════════════════════

Active partners need a portal where they can see their leads, get reminders, view stats. Build it with magic-link auth.

### 3A — Migration `023_partner_portal.sql`

```sql
CREATE TABLE IF NOT EXISTS partner_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID REFERENCES advertiser_accounts(id),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_token ON partner_auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_partner_auth_advertiser ON partner_auth_tokens(advertiser_id);

ALTER TABLE partner_leads
ADD COLUMN IF NOT EXISTS partner_reminder_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS partner_last_action_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS partner_next_reminder_at TIMESTAMPTZ;
```

### 3B — Magic-link auth

**`/src/app/partners/[slug]/login/page.tsx`** — login screen:
- Branded with publication's color scheme
- Email input
- "Send me a magic link" button
- Submit POST to `/api/partner-auth/send-magic-link`

**`/src/app/api/partner-auth/send-magic-link/route.ts`**:
- Validate email matches `advertiser_accounts.contact_email` for the slug
- Generate UUID token, save to partner_auth_tokens
- Send email via GHL with link: `/partners/[slug]/admin?token={token}`
- Return success message

**`/src/app/partners/[slug]/admin/page.tsx`** — auth check:
- Read `?token=` query param
- Validate against partner_auth_tokens table
- If valid and not expired, set session cookie with advertiser_id, redirect to clean /admin URL
- If invalid, show "Link expired — request a new one" with link back to login

### 3C — Dashboard with three tabs

**`/src/app/partners/[slug]/admin/page.tsx`** — main dashboard:

After auth, show three-tab interface:

**Tab 1: Lead Inbox (default)**
- List partner_leads for this advertiser, sorted by submitted_at DESC
- Each lead card:
  - Lead name, phone, email
  - Submitted date/time + offer they responded to
  - Status badges: "New" (no action), "Contacted" (partner_last_action_at set), "Converted" (partner_marked_converted true)
  - Action buttons:
    - "Mark as Contacted" → updates partner_last_action_at = NOW()
    - "Mark as Converted" → updates partner_marked_converted = true, partner_marked_converted_at = NOW()
- Filter buttons: All / Need Follow-Up / Contacted / Converted

**Tab 2: Reminders**
- List leads needing follow-up:
  - Submitted >24 hours ago AND no partner_last_action_at AND no partner_marked_converted
  - Sort by oldest first (most urgent)
- Each shows: lead info, time elapsed, action buttons
- Counter at top: "You have X leads needing follow-up"

**Tab 3: Stats**
- Top metrics row:
  - Total leads this month
  - Total leads this year
  - Conversion rate (% marked converted)
  - Average response time (time from submitted to first action)
- Charts using recharts:
  - Lead volume by week (line, last 12 weeks)
  - Lead source breakdown (pie, by offer or UTM source)
  - Conversion funnel (bar: submitted → contacted → converted)
- If no data yet, show "Stats will appear once leads start coming in" with sample placeholder visualization

### 3D — Reminder email automation

`/src/lib/partner-reminders.ts`:

```typescript
export async function sendPartnerReminders() {
  const overdueLeads = await supabase
    .from('partner_leads')
    .select('*, advertiser:advertiser_accounts(*), offer:partner_offers(*)')
    .lt('partner_next_reminder_at', new Date().toISOString())
    .eq('partner_marked_converted', false)
    .is('partner_last_action_at', null);
  
  for (const lead of overdueLeads.data || []) {
    const reminderType = ['day_1', 'day_3', 'day_7'][lead.partner_reminder_count] || 'final';
    await sendReminderEmail(lead, reminderType);
    
    await supabase
      .from('partner_leads')
      .update({
        partner_reminder_count: lead.partner_reminder_count + 1,
        partner_next_reminder_at: getNextReminderTime(lead.partner_reminder_count + 1),
      })
      .eq('id', lead.id);
  }
}
```

Expose as `/api/admin/run-reminders` for manual trigger. Future cron job will hit this endpoint.

### 3E — Reminder email templates

Create `/docs/email-templates/partner-reminders/`:

**`day-1.md`:**
```yaml
---
subject: "You have a new lead waiting — {{lead_first_name}} ({{offer_headline}})"
---

Hi {{partner_first_name}},

Just a heads up — {{lead_first_name}} {{lead_last_name}} submitted your form yesterday and hasn't heard back yet.

Speed wins with leads. The first 24 hours matter most.

Their info:
- Phone: {{lead_phone}}
- Email: {{lead_email}}

Give them a quick call. Even a "Hi, just wanted to make sure you got our text" works.

Your KeepSharing Partner Engine dashboard: {{partner_dashboard_url}}

— Jason at River Region Parents
```

Similar for day-3.md ("This lead is going cold"), day-7.md ("Last chance — they may have moved on"), final.md ("We'll stop reminding you about this lead").

### 3F — DONE WHEN

[ ] Migration 023 applied
[ ] /partners/[slug]/login renders branded login screen
[ ] Magic link email sends via GHL (or logs to console if pending)
[ ] /partners/[slug]/admin requires valid token, sets session
[ ] Three tabs render: Inbox, Reminders, Stats
[ ] Lead actions (Mark as Contacted / Converted) update DB
[ ] Stats shows real numbers from partner_leads
[ ] Reminder email templates exist
[ ] /api/admin/run-reminders endpoint works
[ ] Test: log in as DFC partner using contact_email, verify dashboard loads

═══════════════════════════════════════════════════════
## TASK 4 — MULTI-TENANT AUDIT FOR BOOM LAUNCH
═══════════════════════════════════════════════════════

Verify the codebase is ready to launch a second publication without major rework.

### 4A — Migration `024_publications.sql`

```sql
CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  ghl_location_id TEXT,
  brand_color_primary TEXT,
  brand_color_accent TEXT,
  is_active BOOLEAN DEFAULT true,
  launch_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO publications (slug, display_name, city, state, brand_color_primary, brand_color_accent, is_active)
VALUES 
  ('rrp', 'River Region Parents', 'Montgomery', 'AL', '#8c5035', '#4a90d9', true),
  ('boom', 'River Region Boom', 'Montgomery', 'AL', '#1a2744', '#c89933', false),
  ('aop', 'Auburn Opelika Parents', 'Auburn', 'AL', '#4a90d9', '#c4622d', false),
  ('mbp', 'Mobile Bay Parents', 'Mobile', 'AL', '#5a8a6a', '#f4a261', false),
  ('esp', 'Eastern Shore Parents', 'Daphne', 'AL', '#4a90d9', '#e89525', false),
  ('gpp', 'Greater Pensacola Parents', 'Pensacola', 'FL', '#5a8a6a', '#e89525', false)
ON CONFLICT (slug) DO NOTHING;
```

### 4B — Audit codebase for multi-tenant readiness

Run these searches and document findings in `/docs/multi-tenant-audit-results.md`:

```bash
# Hardcoded RRP references in code (excluding intentional brand voice)
grep -rn "river-region-parents" src/ --include="*.tsx" --include="*.ts" | grep -v "// brand:" 

# Database queries missing publication_id filter
grep -rn "from('advertiser_accounts')" src/
grep -rn "from('partner_offers')" src/
grep -rn "from('lead_submissions')" src/
grep -rn "from('partner_leads')" src/

# Hardcoded GHL location IDs
grep -rn "GHL_LOCATION_ID" src/
grep -rn "ghl_location_id" src/
```

For each finding:
- If it's brand voice in copy ("River Region Parents helps you..."), flag but don't change — that's intentional
- If it's a query missing publication_id filter, document the file/line and add the filter
- If it's a hardcoded GHL location, change to read from `publications.ghl_location_id` based on the current publication context

### 4C — Document Boom launch checklist

Create `/docs/launch-checklist-boom.md`:

```markdown
# Launching Boom Magazine — Step by Step

## Already Built (Ready)
- [x] All advertiser tables have publication_id columns
- [x] Partner Engine templates work for any publication
- [x] Marketer-in-a-Box onboarding works for any business category
- [x] Operations Dashboard supports multi-publication views
- [x] Proposal generator supports multi-publication

## Step-by-Step Launch (estimated 1 week)

1. **Day 1: GHL Setup**
   - Create boom GHL sub-account
   - Get location ID and PIT token
   - Update `publications.boom` row with ghl_location_id

2. **Day 2: Domain Configuration**
   - Set up boom.keepsharing.com subdomain (or boom subdomain on main)
   - Configure DNS, SSL
   - Update Next.js routing if needed for subdomain handling

3. **Day 3: Content Migration**
   - Import existing Boom advertisers into advertiser_accounts (publication_id = boom)
   - Import existing Boom content into guide_articles
   - Set up Boom-specific email templates if voice differs

4. **Day 4: Activation**
   - Set publications.boom.is_active = true
   - Update navigation to show Boom in admin tools
   - Test partner pages render with Boom branding

5. **Day 5: Sales Team**
   - Train Boom sales team on platform
   - Set up first 5 prospect proposals
   - Schedule first sales calls

## Estimated Total Time: 1 week
```

### 4D — DONE WHEN

[ ] Migration 024 applied
[ ] publications table contains 6 publication rows
[ ] /docs/multi-tenant-audit-results.md exists with findings
[ ] Critical issues (missing publication_id filters) fixed
[ ] /docs/launch-checklist-boom.md exists

═══════════════════════════════════════════════════════
## TASK 5 — POLISH PASS
═══════════════════════════════════════════════════════

Sweep the platform for bugs and inconsistencies. This is small-fix territory.

### 5A — Console error sweep

Open every major route and check browser console:
- `/`
- `/advertise`
- `/get-media-kit`
- `/newcomer-guide`
- `/newcomer-guide/listings/dentistry-for-children` (assuming exists)
- `/partners/dentistry-for-children`
- `/share/your-pick`
- `/admin/today`
- `/admin/submissions`
- `/admin/proposals`

Document any console errors in `/docs/known-issues.md` and fix the easy ones (missing imports, undefined vars, missing keys in lists).

### 5B — Form submission verification

Test every form on the platform actually saves data:
- /advertise lead form → lead_submissions
- /get-media-kit form → lead_submissions
- /partners/dentistry-for-children → partner_leads
- /share/your-pick → reader_submissions
- /onboard/[token] → onboarding progress saves
- /admin/proposals/new → proposals

For each, submit a test entry and verify the database row was created. Document any forms that don't work.

### 5C — Mobile responsiveness verification

Resize browser to 375px (iPhone SE width) and verify these pages render correctly:
- `/advertise`
- `/get-media-kit`
- `/partners/dentistry-for-children`
- `/share/your-pick`
- `/onboard/[token]` (if accessible without token, otherwise skip)

Fix any mobile-specific issues found.

### 5D — DONE WHEN

[ ] Console error sweep complete, easy fixes applied
[ ] All forms verified saving data correctly
[ ] Mobile responsive verified on 5 key pages
[ ] /docs/known-issues.md exists if any issues found

═══════════════════════════════════════════════════════
## TASK 6 — KNOWLEDGE BASE + STATUS REPORT
═══════════════════════════════════════════════════════

### 6A — Update knowledge base

Add to `/docs/keepsharing-knowledge-base.md`:

```markdown
## BUILD RUN #10 — DEPLOYED [DATE]

### What shipped:
- Operations Dashboard wired to live data (no more mock)
- Proposal Generator at /admin/proposals + public /proposal/[token]
- Partner Backend Dashboard at /partners/[slug]/admin with magic-link auth
- Multi-tenant audit complete + publications table seeded
- Polish pass with documented known issues

### New tables (migrations 021-024):
- action_items, print_placements, business_spotlight_submissions, nominations, birthday_spotlight_orders (021)
- proposals (022)
- partner_auth_tokens + partner_leads reminder columns (023)
- publications with 6 markets seeded (024)

### Pending GHL workflows (Jason to set up):
- GHL_WORKFLOW_PROPOSAL_VIEWED
- GHL_WORKFLOW_PROPOSAL_ACCEPTED  
- GHL_WORKFLOW_PARTNER_REMINDER_DAY_1
- GHL_WORKFLOW_PARTNER_REMINDER_DAY_3
- GHL_WORKFLOW_PARTNER_REMINDER_DAY_7

### Boom launch readiness: ✅
- See /docs/launch-checklist-boom.md
```

### 6B — Comprehensive status report

Post final status report. Be TRUTHFUL about what shipped vs what didn't:
- All migrations applied (021, 022, 023, 024)
- All tasks with verification status (worked / partial / failed)
- Manual test instructions for each major feature
- Known TODOs
- Build time

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Open `/admin/today`** and see real numbers, action items pulled from database, click "Draft email" to open mailto: with templated content
2. **Create a custom proposal at `/admin/proposals/new`** and send it to a prospect — they receive a personalized URL, view it, accept it
3. **Have DFC log in at `/partners/dentistry-for-children/login`** with magic link, see lead inbox + reminders + stats
4. **Plan to launch Boom** by following `/docs/launch-checklist-boom.md` — all multi-tenant infrastructure is ready

═══════════════════════════════════════════════════════
## FINAL CHECKLIST
═══════════════════════════════════════════════════════

[ ] Migration 021 applied (Operations Dashboard tables)
[ ] Migration 022 applied (Proposals table)
[ ] Migration 023 applied (Partner Portal auth + reminder columns)
[ ] Migration 024 applied (Publications table)
[ ] /admin/today shows real data, no mock
[ ] /admin/proposals/new works end-to-end
[ ] /proposal/[token] renders correctly
[ ] /partners/[slug]/login + /admin works with magic link
[ ] Multi-tenant audit complete
[ ] Knowledge base updated
[ ] Status report posted truthfully

Then STOP.

GO.
