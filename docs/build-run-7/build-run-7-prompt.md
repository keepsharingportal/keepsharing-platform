# BUILD RUN #7 — EPIC: The KeepSharing Partner Engine (Offer-Driven System)

**Real product. Real offers. Real speed-to-lead handoff. Real magazine content. Real app-style mobile experience.**

═══════════════════════════════════════════════════════
## CRITICAL FRAMING — READ TWICE BEFORE STARTING
═══════════════════════════════════════════════════════

The Dentistry for Children landing page that exists today (`/partners/dentistry-for-children`) is wrong. It's a glorified informational listing. It does not sell. It does not push toward action. It's a brochure pretending to be a marketing system.

This build replaces it with the correct model: **a Russell Brunson-style offer page**. Every page is built around ONE specific offer that the partner is currently running. Every section drives toward that offer. The page exists to convert, not inform.

The KeepSharing Partner Engine is NOT a landing page system. It is an **integrated offer machine** with five interlocking components:

1. **The Offer Page** — built around the partner's specific current offer, conversion-optimized
2. **The Speed-to-Lead Handoff** — RRP-branded SMS to the lead within 60 seconds, simultaneous email handoff to the partner with lead details
3. **The Nurture Sequence** — 5-email sequence over 14 days for non-converting leads, RRP-branded
4. **The Onboarding Form** — secretary-friendly multi-section form that doubles as a marketing strategy session
5. **The Marketer-in-a-Box** — every form section teaches better marketing while collecting data; partner walks away with a stronger offer than they came in with

Plus the surrounding context this build also delivers:
- A polished `/partners/dentistry-for-children` demo built around the offer "$0 First Visit Consultation — Reserve Your Child's Spot This Month"
- All five Family Resource Guide articles written at magazine quality in DeAnne's voice
- Heavy app-style mobile experience with native ad inventory (matching `/mnt/user-data/uploads/rrp-mobile-feed.html`)
- Updates to `/advertise` that reflect The KeepSharing Partner Engine product naming

This build does NOT include: cold-traffic lead funnel at `/get-media-kit`, Mom Insiders submission engine, proposal generator, Operations Dashboard live data wiring. Those become Build Run #8.

Realistic Claude Code session: 5-7 hours. OneDrive paused before starting.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES — DRIVE EVERY DECISION
═══════════════════════════════════════════════════════

- **"We make winners."** Every CTA, headline, email, and SMS reflects the winning frame. Never "buy an ad." Never "advertise with us."
- **"The biggest community influencer for parents in the River Region."** This phrase appears in copy.
- **"The KeepSharing Partner Engine"** is the formal product name for the Tier 3 + Tier 4 deliverable. Trademark-able cross-market product brand. Tier 4 = "The KeepSharing Partner Engine — full power." Tier 3 = "The KeepSharing Partner Engine — Essentials." Advertiser-facing tagline: "Built by River Region Parents. Powered by KeepSharing."
- **Offer-driven, not info-driven.** Every partner page exists around ONE specific offer that drives ONE specific action. Russell Brunson model. The page is an offer machine, not a brochure.
- **The publication owns the trust layer.** RRP-branded SMS to the lead, RRP-branded nurture sequence. Partner doesn't need their own SMS infrastructure. We hand them off warm leads with a phone number and email — they just have to follow up.
- **Marketer-in-a-box.** The onboarding form teaches marketing while collecting data. Every section recommends, suggests, and educates. Partner ends with a stronger offer than they started.
- **Pages must look custom.** Same component architecture, but each page feels like the partner's own — through their photos, their voice, their offer, their brand colors layered on top of the magazine design system.
- **The secretary test.** Every onboarding interaction passes: "Could a 55-year-old office secretary fill this out on her phone between calls without confusion?"
- **Mobile-first, heavy app-style.** The mobile experience IS a unique product. Bottom nav, swipeable feeds, tap-friendly cards, native-feeling transitions. Reference the mockup at `/mnt/user-data/uploads/rrp-mobile-feed.html`.
- **Native ad inventory in the feed.** Advertiser cards in the For-You feed are first-class content with the same visual treatment as articles. NOT banners.
- **Don't disturb existing advertisers' loyalty rates.** New products are additive layers, never replacements.

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve all file edits, terminal commands, npm installs, package additions, migrations applied via `supabase db push` if available locally, image fetches, content writing, and GHL API calls. Stop only on:
1. Unresolvable build/runtime errors after 3 attempts
2. Strategic decisions not specified in this prompt
3. Destructive operations (dropping tables, deleting production data)
4. Anything requiring credentials not in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md`
- `/docs/option-c-strategic-addendum.md` (if exists)
- `/docs/sales/annual-advertising-partner-sales-doc.md` (if exists)
- `/src/app/globals.css` (existing design tokens — fg-cream, fg-navy, fg-sky, fg-sage, fg-terra, fg-gold, fg-blush)
- `/src/app/advertise/page.tsx` (existing media kit — the brand DNA quality bar)
- `/src/app/partners/[slug]/page.tsx` (existing partner page — to be REPLACED, not enhanced)
- `/src/app/newcomer-guide/page.tsx` (existing FRG home)
- `/src/lib/ghl.ts` (existing GHL integration — sub-account PIT pattern, already wired and tested)
- `/mnt/user-data/uploads/rrp-mobile-feed.html` (the mobile experience quality target)

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

Verify migration 016 is applied and Dentistry for Children seed exists:

```sql
SELECT id, business_name, slug, package_tier FROM advertiser_accounts WHERE slug = 'dentistry-for-children';
```

If zero rows, INSERT before doing anything else:

```sql
INSERT INTO advertiser_accounts (business_name, slug, package_tier, contact_name, contact_email, contact_phone, landing_page_published)
VALUES ('Dentistry for Children PC', 'dentistry-for-children', 'tier-4-won', 'Dr. Julia Isherwood Schreiber', 'info@chew-chewtrain.com', '334-277-6830', true)
ON CONFLICT (slug) DO UPDATE SET landing_page_published = true;
```

Verify `/partners/dentistry-for-children` loads (even if ugly) before proceeding. Then continue.

═══════════════════════════════════════════════════════
## TASK 1 — DATABASE SCHEMA FOR THE PARTNER ENGINE
═══════════════════════════════════════════════════════

The Partner Engine is offer-driven, not info-driven. The schema reflects this.

### 1A — Migration `017_partner_engine_offer_schema.sql`

Add columns to `advertiser_accounts`:
- `category` TEXT NOT NULL DEFAULT 'family-service' (one of: 'healthcare', 'education', 'childcare', 'family-service', 'family-activities')
- `subcategory` TEXT (e.g., 'pediatric-dentistry', 'private-school', 'preschool', 'boutique', 'restaurant')
- `business_url` TEXT (their existing website — used for auto-prefill scraping)
- `gbp_place_id` TEXT (Google Business Profile place ID for photo + review fetching)
- `brand_color_primary` TEXT DEFAULT '#1a2744'
- `brand_color_accent` TEXT DEFAULT '#c4622d'
- `logo_url` TEXT
- `mascot_url` TEXT
- `mascot_alt` TEXT
- `current_offer_id` UUID (FK to partner_offers — set when an offer is currently active)
- `onboarding_token` TEXT UNIQUE
- `onboarding_status` TEXT DEFAULT 'not-started' ('not-started' / 'in-progress' / 'submitted' / 'reviewed' / 'live')
- `onboarding_started_at` TIMESTAMPTZ
- `onboarding_submitted_at` TIMESTAMPTZ
- `onboarding_progress` JSONB DEFAULT '{}'
- `published_at` TIMESTAMPTZ

Create `partner_offers` table (THE central object — every page is built around an offer):
- `id` UUID PK
- `advertiser_id` UUID FK → advertiser_accounts
- `offer_name` TEXT (internal, e.g., "Q2 New Patient $0 Visit")
- `offer_type` TEXT ('schedule_consult' / 'discount_code' / 'booking_link' / 'info_request' / 'limited_promo')
- `offer_headline` TEXT (the hero — "$0 First Visit Consultation")
- `offer_subheadline` TEXT ("Reserve Your Child's Spot This Month")
- `offer_value_statement` TEXT (the promise — "A no-pressure, fun first visit where your child meets the team and rides the Chew-Chew Train. Normally $150. Free this month for new patients.")
- `urgency_text` TEXT ("Only 12 spots remaining" / "Ends May 31" / "Limited to first 50 families")
- `urgency_expires_at` TIMESTAMPTZ NULLABLE (drives countdown timer)
- `urgency_count_remaining` INT NULLABLE (drives "X spots remaining" counter)
- `cta_button_text` TEXT ("Reserve My Child's Spot →")
- `discount_code` TEXT NULLABLE (if offer_type = 'discount_code')
- `booking_url` TEXT NULLABLE (if offer_type = 'booking_link')
- `proof_points` JSONB DEFAULT '[]' (array of {claim, source}: e.g., [{claim: "847 happy first visits in 2025", source: "internal"}, {claim: "4.9 star average from 312 Google reviews", source: "google"}])
- `objection_responses` JSONB DEFAULT '[]' (array of {objection, response} for the FAQ section)
- `target_keywords` TEXT[] (for SEO)
- `is_active` BOOLEAN DEFAULT true
- `start_date` DATE
- `end_date` DATE NULLABLE
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

Create `advertiser_locations`:
- `id` UUID PK
- `advertiser_id` UUID FK
- `location_name` TEXT (e.g., "Montgomery", "Wetumpka", "Millbrook")
- `address_line_1` TEXT
- `address_line_2` TEXT
- `city` TEXT
- `state` TEXT DEFAULT 'AL'
- `zip` TEXT
- `phone` TEXT
- `latitude` NUMERIC
- `longitude` NUMERIC
- `hours_json` JSONB
- `is_primary` BOOLEAN DEFAULT false
- `accepting_new` BOOLEAN DEFAULT true
- `display_order` INT DEFAULT 0

Create `advertiser_team_members`:
- `id` UUID PK
- `advertiser_id` UUID FK
- `display_name` TEXT
- `title` TEXT
- `credentials` TEXT
- `bio` TEXT
- `philosophy_quote` TEXT
- `photo_url` TEXT
- `years_with_practice` INT
- `display_order` INT DEFAULT 0

Create `advertiser_testimonials`:
- `id` UUID PK
- `advertiser_id` UUID FK
- `quote` TEXT
- `author_name` TEXT
- `author_context` TEXT
- `source` TEXT ('manual' / 'google_review' / 'mom_insider_submission' / 'facebook_review')
- `source_url` TEXT
- `rating` INT
- `display_order` INT DEFAULT 0

Create `advertiser_trust_signals`:
- `id` UUID PK
- `advertiser_id` UUID FK
- `signal_type` TEXT ('insurance' / 'accreditation' / 'certification' / 'award' / 'years_in_business')
- `label` TEXT
- `description` TEXT
- `logo_url` TEXT
- `display_order` INT DEFAULT 0

Create `advertiser_photos`:
- `id` UUID PK
- `advertiser_id` UUID FK
- `photo_url` TEXT NOT NULL
- `caption` TEXT
- `alt_text` TEXT
- `category` TEXT ('hero' / 'team' / 'space' / 'patients_kids' / 'product' / 'mascot' / 'logo')
- `source` TEXT ('uploaded' / 'gbp_fetched' / 'unsplash_curated' / 'ai_generated' / 'placeholder' / 'scraped_from_website')
- `source_metadata` JSONB
- `display_order` INT DEFAULT 0
- `is_primary_for_category` BOOLEAN DEFAULT false

Create `advertiser_services`:
- `id` UUID PK
- `advertiser_id` UUID FK
- `service_name` TEXT
- `description` TEXT
- `icon` TEXT
- `display_order` INT DEFAULT 0

Create `advertiser_faqs`:
- `id` UUID PK
- `advertiser_id` UUID FK
- `question` TEXT
- `answer` TEXT
- `display_order` INT DEFAULT 0
- `relates_to_offer` BOOLEAN DEFAULT false

Create `partner_leads` table (the lead capture from offer pages — separate from generic lead_submissions):
- `id` UUID PK
- `advertiser_id` UUID FK
- `offer_id` UUID FK → partner_offers
- `lead_first_name` TEXT
- `lead_last_name` TEXT
- `lead_email` TEXT
- `lead_phone` TEXT
- `lead_metadata` JSONB (offer-specific fields: child age, preferred times, insurance, etc.)
- `submitted_at` TIMESTAMPTZ DEFAULT NOW()
- `source_page` TEXT (URL where they submitted)
- `referrer_url` TEXT
- `utm_source` TEXT
- `utm_medium` TEXT
- `utm_campaign` TEXT
- `lead_to_sms_status` TEXT DEFAULT 'pending' ('pending' / 'sent' / 'failed')
- `lead_to_sms_sent_at` TIMESTAMPTZ
- `partner_notification_status` TEXT DEFAULT 'pending'
- `partner_notification_sent_at` TIMESTAMPTZ
- `nurture_sequence_status` TEXT DEFAULT 'pending' ('pending' / 'enrolled' / 'completed' / 'converted' / 'opted_out')
- `nurture_enrolled_at` TIMESTAMPTZ
- `partner_marked_converted` BOOLEAN DEFAULT false
- `partner_marked_converted_at` TIMESTAMPTZ
- `partner_notes` TEXT
- `ghl_contact_id` TEXT

### 1B — DONE WHEN

[ ] Migration 017 created and applied
[ ] All 8 new tables created (partner_offers, advertiser_locations, team, testimonials, trust_signals, photos, services, faqs, partner_leads)
[ ] advertiser_accounts has all new columns added
[ ] All FKs and indexes are correct
[ ] Verify /partners/dentistry-for-children still loads (graceful degradation if old template doesn't have these fields yet — Task 2 fixes that)

═══════════════════════════════════════════════════════
## TASK 2 — THE OFFER PAGE COMPONENT SYSTEM
═══════════════════════════════════════════════════════

Build the Russell Brunson-style offer page architecture. Every section drives toward the partner's current offer.

### 2A — Component library at `/src/components/partner-engine/`

Build these components. Each is offer-aware — reads the partner's `current_offer` and adapts content accordingly.

**OfferHero.tsx** — The conversion-driving hero.
Layouts: 'split-with-offer' / 'fullbleed-with-offer-card' / 'magazine-with-offer-callout'
- Headline: `offer.offer_headline` in Fraunces, large
- Subheadline: `offer.offer_subheadline` in DM Sans
- Value statement: `offer.offer_value_statement` in body text
- Primary CTA button (uses `offer.cta_button_text`, styled with `brand_color_accent`)
- Urgency element if `urgency_text` or `urgency_expires_at` set (countdown timer or remaining-spots counter)
- "Accepting new patients" or category-equivalent badge
- Mascot integration if `mascot_url` exists
- Hero photo from `advertiser_photos` (priority: hero → team → space)
- Mobile-optimized: CTA above fold even on small screens

**OfferProblemAgitate.tsx** — Problem/Agitation section (Russell Brunson model).
This is what makes it an OFFER PAGE not a brochure. Speaks to the pain that the offer solves.
For pediatric dentistry: "First dental visits can be terrifying. Most kids cry. Most parents feel guilty. Most practices treat children like small adults — quick exam, get out, hope they don't cry. Your child deserves better. So do you."
Auto-generated draft based on category + offer_type, edited via onboarding form.
Layout: text-heavy, 2-column on desktop, single column mobile, with a small thematic photo.

**OfferSolution.tsx** — The Solution section.
"Here's how we make this different." Specific to the partner. For Dentistry for Children: "We don't do quick exams for first visits. We do Happy Visits. Your child meets Dr. Schreiber, rides the Chew-Chew Train, takes home a goodie bag, and never sits in a chair if they don't want to. No cleaning. No exam. Just a friendly hello. The first real cleaning happens once they trust us."
Each "How it's different" point is a card with icon + title + description. Pulls from `value_props`.

**OfferProof.tsx** — Social proof concentrated.
- "X happy [first visits / families / customers] in [year]" big number
- 4-9 star average from N Google reviews (auto-fetched via gbp_place_id)
- Testimonials carousel (mobile) or grid (desktop)
- Trust badges (insurance, accreditations, awards) in a strip
- "Featured in River Region Parents since [year]" badge

**OfferTeam.tsx** — Editorial team section.
Same as before but tied to offer. For an offer like "$0 First Visit," the team section emphasizes the doctors' approach to anxious kids and first visits. Pull-quotes from each doctor reinforce the offer's promise.

**OfferLocations.tsx** — Multi-location display with offer availability.
Each location shows whether the offer is available there. "Available at all 3 locations" or "Available in Montgomery and Wetumpka."

**OfferFAQ.tsx** — Objection-handling FAQ.
Reads `partner_offers.objection_responses` first (offer-specific objections), then falls back to general `advertiser_faqs`. For "$0 First Visit": "What if my child has a cavity?" "Is the $0 visit really $0 with no catch?" "What ages do you see?" "Do you take my insurance?" Accordion with smooth open/close.

**OfferUrgencyBlock.tsx** — Urgency reinforcement.
Appears 2-3 times throughout the page (between sections). Countdown timer if `urgency_expires_at` set. Spots remaining counter if `urgency_count_remaining` set. Both if both. Subtle, not screaming.

**OfferCTABlock.tsx** — Repeat CTA blocks throughout the page.
Every 2-3 sections, a CTA block reinforces the offer. Multiple shapes:
- Sidebar CTA (sticky, desktop only)
- Inline strip CTA (between sections)
- Pre-form CTA (right before the conversion form)
- All buttons say `offer.cta_button_text`, all anchor to the same form

**OfferConversionForm.tsx** — The conversion form, offer-type aware.
Field set varies by `offer.offer_type`:
- `schedule_consult` (DFC's case): First name, last name, phone (required), email, child's name, child's age, preferred days, preferred times, insurance carrier (optional), notes (optional)
- `discount_code`: First name, email (only — code emailed/texted instantly)
- `booking_link`: First name, email, phone, "click to book" → goes to `booking_url`
- `info_request`: First name, email, phone, "what would you like to know?" textarea
- `limited_promo`: First name, email, phone, plus 2-3 promo-specific fields

Form validates inline. Required fields clearly marked. Mobile-keyboard-optimized (tel input for phone, email keyboard for email). Submit button uses `offer.cta_button_text`. After submit, shows offer-type-specific confirmation:
- `schedule_consult`: "We've sent you a text with [Practice]'s direct line. They'll reach out within 24 hours. Can't wait? Call [phone] now."
- `discount_code`: "Your code [CODE] has been texted to [phone]. Show it at the front desk or use it online at [URL]."
- `booking_link`: "Redirecting you to book your appointment..." → automatic redirect after 2 seconds
- `info_request`: "[Practice] will reach out within 24 hours. We've also sent you their direct line."
- `limited_promo`: "You're confirmed for [PROMO]. Check your phone for next steps."

POST to `/api/partner-leads/capture` (Task 3 builds this).

**OfferRiskReversal.tsx** — Optional risk-reversal block before the form.
"Not what you expected? No charge. No catch. Cancel anytime before your visit, no questions asked."
Drives down conversion friction. Auto-generated based on offer_type, editable in onboarding.

**OfferStickyMobileCTA.tsx** — Mobile sticky bottom bar.
Phone + offer CTA button. Always visible on mobile. Disappears on desktop.
Phone tap → tel: link
CTA tap → smooth scrolls to conversion form
On scroll: bar minimizes after 80% scroll, expands when scrolling back up.

**PartnerSEO.tsx** — Schema.org structured data.
- LocalBusiness schema with category-specific extensions (Dentist, School, ChildCare, Restaurant, etc.)
- FAQ schema from FAQs section
- Offer schema from current_offer
- Aggregate rating from testimonials average
- Open Graph + Twitter Card metadata

**PartnerSocialProof.tsx** — Small "RRP Featured Partner" attribution.
"A KeepSharing Partner • Featured in River Region Parents since [year]"
With small RRP logo + KeepSharing wordmark.
Tasteful, footer-area or post-hero.

### 2B — Page renderer at `/src/app/partners/[slug]/page.tsx`

Replace the existing template with a new offer-driven renderer.

Section ordering (consistent across categories — Russell Brunson model):

1. **OfferHero** (with embedded form on desktop split layout, or CTA button scroll-to-form on mobile)
2. **PartnerSocialProof** (small RRP badge)
3. **OfferProblemAgitate** (pain the offer solves)
4. **OfferSolution** (how the partner does it differently)
5. **OfferUrgencyBlock** (mid-page reinforcement)
6. **OfferProof** (testimonials, trust signals, big numbers)
7. **OfferTeam** (the people who deliver — trust transfer)
8. **OfferCTABlock** (inline strip CTA)
9. **OfferLocations** (where to redeem)
10. **OfferFAQ** (objection handling)
11. **OfferRiskReversal** (drop friction)
12. **OfferConversionForm** (the main conversion event)
13. **OfferUrgencyBlock** (final reminder)
14. **PartnerSEO** (head metadata, JSON-LD)
15. **OfferStickyMobileCTA** (mobile-only sticky bar)

Section emphasis varies by category — adjustments handled inside individual components, not by reordering.

If `current_offer_id` is NULL on the advertiser_account (no active offer), the page renders a fallback "currently scheduling new partnerships — call us at [phone]" state. Never broken.

### 2C — Brand color layering

Build `/src/lib/brand-colors.ts`:
- `getContrastTextColor(hex)` returns 'white' or 'dark'
- `lightenColor(hex, amount)` for backgrounds
- `validateBrandColor(hex)` accessibility check

Apply throughout components:
- All CTA buttons use `brand_color_accent`
- Section dividers use `brand_color_primary` at 10% opacity
- Pull-quote left-borders use `brand_color_accent`
- Hero badges use `brand_color_primary`
- All other UI stays magazine design system

### 2D — DONE WHEN

[ ] All 13 partner-engine components built in `/src/components/partner-engine/`
[ ] `/src/app/partners/[slug]/page.tsx` rebuilt with offer-driven section order
[ ] Brand color layering works across all components
[ ] Page renders gracefully when `current_offer_id` is NULL
[ ] Mobile sticky CTA shows on mobile only
[ ] All CTAs anchor-link to the conversion form
[ ] Form is offer-type-aware (different field sets per offer_type)

═══════════════════════════════════════════════════════
## TASK 3 — SPEED-TO-LEAD HANDOFF SYSTEM
═══════════════════════════════════════════════════════

The most important piece of the marketing system. When a lead submits the offer form, three things happen within 60 seconds:

1. RRP-branded SMS to the lead with the partner's contact info + immediate value
2. Email to the partner with full lead details + handoff instructions
3. Lead enters a 14-day RRP-branded nurture sequence

### 3A — `/api/partner-leads/capture` route

POST endpoint. Handles all offer page form submissions.

Process:
1. Insert into `partner_leads` table with all submitted fields + UTM params + referrer
2. Create/update GHL contact via existing `/src/lib/ghl.ts` (use the publication's GHL sub-account, e.g., RRP)
3. Tag the GHL contact: `partner-engine-lead`, `offer-{offer_id}`, `partner-{advertiser_slug}`, `category-{category}`, `offer-type-{type}`
4. Trigger immediate SMS to lead (Task 3B)
5. Trigger immediate email to partner (Task 3C)
6. Enroll lead in nurture sequence (Task 3D)
7. Update `partner_leads` row with all status fields
8. Return `{success: true, lead_id, confirmation_message}` based on offer_type

Failure handling:
- If SMS fails, save error in `lead_to_sms_status` and try email-only fallback to lead
- If partner email fails, retry 3 times then mark for manual handoff in admin
- Never block the user response on async work — return success to client immediately, do work in background

### 3B — RRP-branded lead SMS

Build `/src/lib/sms-handoff.ts`. Uses GHL sub-account API (already wired and tested).

SMS template by offer_type:

**schedule_consult:**
```
Hi {{lead_first_name}}, this is River Region Parents — we received your {{offer_headline}} request for {{partner_name}}. {{partner_first_name_or_office_name}} will call you within 24 hours. Their direct number is {{partner_phone}} if you'd like to reach out first. — Jason at RRP
```

**discount_code:**
```
Hi {{lead_first_name}}, your {{partner_name}} discount code is: {{discount_code}}. Show this at the front desk or use online at {{redeem_url}}. Code expires {{expires_date}}. — River Region Parents
```

**booking_link:**
```
Hi {{lead_first_name}}, here's your {{partner_name}} booking link to lock in {{offer_headline}}: {{booking_url}}. Need help? Call them at {{partner_phone}}. — River Region Parents
```

**info_request:**
```
Hi {{lead_first_name}}, thanks for reaching out about {{partner_name}} via River Region Parents. They'll be in touch within 24 hours. Direct line: {{partner_phone}}. — Jason at RRP
```

**limited_promo:**
```
Hi {{lead_first_name}}, you're confirmed for {{offer_headline}} from {{partner_name}}! Their direct line: {{partner_phone}}. They'll reach out with next steps. — River Region Parents
```

All SMS sent from the publication's GHL sub-account number. NOT from the partner's number.

Phone numbers normalized to E.164 before sending. Failures logged.

### 3C — Partner notification email

Build `/src/lib/partner-notification.ts`. Sends via GHL sub-account email or SMTP.

Template:

```
Subject: 🔔 New Partner Engine Lead: {{lead_first_name}} {{lead_last_name}} — {{offer_headline}}

Hi {{partner_contact_name}},

You have a new lead from your KeepSharing Partner Engine page on River Region Parents.

LEAD DETAILS:
- Name: {{lead_first_name}} {{lead_last_name}}
- Phone: {{lead_phone}}
- Email: {{lead_email}}
- Best time to reach: {{lead_metadata.preferred_times || 'Not specified'}}
{{#if offer_type == 'schedule_consult'}}
- Child's name: {{lead_metadata.child_name || 'Not provided'}}
- Child's age: {{lead_metadata.child_age || 'Not provided'}}
- Insurance: {{lead_metadata.insurance || 'Not provided'}}
- Notes: {{lead_metadata.notes || 'None'}}
{{/if}}

OFFER THEY RESPONDED TO:
{{offer_headline}}
{{offer_subheadline}}

WHAT WE'VE DONE:
✓ Texted {{lead_first_name}} your direct number
✓ Sent them a confirmation email
✓ Enrolled them in our 14-day follow-up sequence

WHAT YOU SHOULD DO:
Reach out within 24 hours. Speed wins. Lead source: {{utm_source || 'Direct'}}

You can manage this lead at: {{partner_dashboard_url}}

— The KeepSharing Partner Engine
Built by River Region Parents. Powered by KeepSharing.
```

### 3D — 14-day nurture sequence

Send via GHL workflow (specs only — Jason creates the workflow in GHL, this build provides the templates and triggers it via API).

Templates saved as `/docs/email-templates/partner-engine-nurture/`:

**Day 0 (immediate, within 60 sec of form submit):** `confirmation.md`
- Subject: "{{partner_name}} got your request — here's what's next"
- Reinforces the offer, sets expectations, includes partner phone, reduces buyer's remorse

**Day 2:** `gentle-followup.md`
- Subject: "Did {{partner_name}} reach out?"
- Casual check-in, offers help if they didn't connect, soft re-pitch of the offer

**Day 5:** `social-proof.md`
- Subject: "Why {{count}} families chose {{partner_name}} this year"
- Testimonial-heavy, addresses common doubts, links back to offer page

**Day 9:** `objection-handling.md`
- Subject: "The 3 things parents worry about — answered"
- Offer-type-specific objections, Q&A format, reassurance

**Day 14:** `final-call.md`
- Subject: "{{offer_headline}} — last chance this month"
- Urgency-driven, clear "yes or no" framing, easy to opt out

Each email RRP-branded ("From: River Region Parents"), with partner attribution naturally woven in. Each links back to the offer page.

Build `/src/lib/nurture-sequence.ts` to enroll leads in GHL workflow via API. Workflow ID stored in `process.env.GHL_NURTURE_WORKFLOW_ID` (Jason provides). If env var not set, log to console as "pending workflow ID" and proceed.

### 3E — DONE WHEN

[ ] `/api/partner-leads/capture` route built and tested
[ ] SMS handoff fires within 60 seconds of form submission for all 5 offer types
[ ] Partner notification email sends with full lead details
[ ] Nurture sequence enrollment via GHL works (or logs as pending)
[ ] All 5 nurture email templates written and saved
[ ] Failure modes handled gracefully (retries, manual fallbacks)
[ ] partner_leads row updated with all status fields after each step

═══════════════════════════════════════════════════════
## TASK 4 — POLISH DENTISTRY FOR CHILDREN AROUND THE OFFER
═══════════════════════════════════════════════════════

Make `/partners/dentistry-for-children` a magazine-quality offer page Jason can pitch tomorrow at $1,500/month with confidence.

### 4A — Scrape the Dentistry for Children website

Build `/src/lib/website-scraper.ts`. Given a URL, fetch:
- HTML title, meta description, OG image
- All `<img>` URLs (filter to large images, exclude icons)
- Headline text from `<h1>`, `<h2>`
- Body paragraphs
- Phone numbers (regex for tel: links and visible phone patterns)
- Email addresses (mailto: links)
- Address text (address regex or schema.org Address)

Run the scraper against `https://chew-chewtrain.com` (the practice's actual website). Extract everything that's publicly available. Save useful pieces to `dfc-content/scraped-content.json` for transparency.

### 4B — Seed Dentistry for Children with rich content built around THE OFFER

Insert a `partner_offers` row for DFC:
```
offer_name: "Q2 2026 New Patient Free First Visit"
offer_type: 'schedule_consult'
offer_headline: "$0 First Visit Consultation"
offer_subheadline: "Reserve Your Child's Spot This Month"
offer_value_statement: "A no-pressure, fun first visit where your child meets Dr. Schreiber, rides the Chew-Chew Train, and takes home a goodie bag. No cleaning. No exam. Just a friendly hello so your child knows what to expect when their real first cleaning happens. Normally $150 — free this month for new patients under age 6."
urgency_text: "Limited to first 50 families this month"
urgency_count_remaining: 50
cta_button_text: "Reserve My Child's Spot →"
proof_points: [
  {claim: "Specialty trained pediatric dentists", source: "internal"},
  {claim: "30 years serving River Region families", source: "internal"},
  {claim: "3 convenient locations", source: "internal"},
  {claim: "Most insurance accepted", source: "internal"}
]
objection_responses: [
  {objection: "What if my child has a cavity?", response: "The $0 visit is just the meet-and-greet. If your child needs a cleaning, exam, or treatment, that's scheduled as a separate visit and billed normally. No surprises."},
  {objection: "Is this really free with no catch?", response: "Yes. We don't bill insurance, we don't run X-rays, we don't do anything during this visit other than introduce your child to the team and the office. It's intentionally simple."},
  {objection: "What ages?", response: "This offer is for children ages 1-6 who are new patients. We see children of all ages, but the $0 First Visit is specifically for first introductions."},
  {objection: "Do I need to bring anything?", response: "Just yourself and your child. We'll handle everything else, including a goodie bag they get to take home."}
]
target_keywords: ['pediatric dentist Montgomery', 'pediatric dentist Wetumpka', 'free first dental visit', 'kids dentist River Region']
is_active: true
```

Then update advertiser_accounts row to set `current_offer_id` to the new offer's ID.

Update advertiser_accounts:
- category: 'healthcare'
- subcategory: 'pediatric-dentistry'
- business_url: 'https://chew-chewtrain.com'
- brand_color_primary: '#4a90d9' (sky blue)
- brand_color_accent: '#f4a261' (warm Chew-Chew orange)

Insert advertiser_locations (3 rows): Montgomery, Wetumpka, Millbrook. Use scraped addresses if found, otherwise placeholder addresses with note.

Insert advertiser_team_members (2 rows): Dr. Julia Isherwood Schreiber, Dr. LaKeisha Thomas. Bios drafted from scraped content where possible. Each with a philosophy quote that ties to the offer (e.g., "My favorite moments are first visits — when a nervous kid leaves smiling, that's why we do this.").

Insert advertiser_testimonials (4 rows). Mark all as DRAFT placeholder for Jason to replace with real ones from practice.

Insert advertiser_trust_signals: insurance accepted (BCBS, Aetna, Delta Dental, Cigna, MetLife), accreditations (American Academy of Pediatric Dentistry, Board Certified), years (30 Years).

Insert advertiser_services (8 rows): First Visit / Infant Oral Health, Preventive Care, Sealants & Fluoride, Emergency Care, Special Needs Dentistry, Orthodontic Eval, Sedation Dentistry, Sports Mouthguards.

Insert advertiser_faqs (general FAQs, not offer-specific): "When should my child first see a dentist?", "Do you accept my insurance?", "What if my child has dental anxiety?", "Can I stay during the appointment?", "Do you treat special needs?".

Insert advertiser_photos:
- First, try fetching from Google Places Photos API if `gbp_place_id` provided (none provided yet — skip)
- Then try scraped images from chew-chewtrain.com (use 5-8 best quality)
- Then fill remaining categories with curated Unsplash photos for healthcare
- All must have alt_text and category set
- Mark hero, team (2), space (2), patients_kids (3), mascot (1)

For mascot: generate a simple SVG of a stylized cartoon train as placeholder. Save to `/public/images/dfc/mascot-placeholder.svg`. Document that final Chew-Chew Train artwork needs to come from the practice.

### 4C — Curated Unsplash photo library

Build `/src/lib/curated-stock-photos.ts`. Maps `(category, photo_category) → [unsplash_photo_ids]`.

For initial seed, include 10+ photos per combination for these categories:

**healthcare**: hero (modern dental office), team (professional doctor portraits), space (waiting room interiors), patients_kids (happy kids at dentist, mom-and-child)

**education**: hero (school exteriors, students learning), team (teachers with students), space (classrooms, libraries), patients_kids (students engaged)

**childcare**: hero (preschool exterior, kids playing), team (warm teacher portraits), space (preschool rooms, art areas), patients_kids (kids learning together)

**family-service**: hero (warm family scenes), product (varies by subcategory), team (small business owners)

**family-activities**: hero (experience photos), space (venue interiors), patients_kids (kids enjoying activities)

Use Unsplash photo IDs (URLs like `https://images.unsplash.com/photo-{id}?w=1200&q=80`). Curate photos that look magazine-quality, NOT stock-cliche. Prioritize: real-feeling, warm, diverse, professionally shot, no over-saturated stock filters.

### 4D — Demo strip at top of `/partners/dentistry-for-children`

Above the hero, a thin terracotta strip:
> "✨ This is a sample of The KeepSharing Partner Engine for Dentistry for Children PC. Want YOUR practice to convert like this? [Talk to us →]"

Tasteful, not jarring. Disappears for actual onboarded partners (only shows when advertiser_accounts.published_at is NULL).

### 4E — DONE WHEN

[ ] Website scraper works against chew-chewtrain.com, saves output
[ ] `partner_offers` row created with full offer data
[ ] DFC `current_offer_id` linked to the offer
[ ] All 8 advertiser_* tables seeded with substantive content
[ ] At least 8 photos sourced (scraped + curated stock fallback)
[ ] Mascot placeholder SVG created
[ ] Demo strip shows at top
[ ] /partners/dentistry-for-children renders as a real, polished offer page
[ ] Form submission triggers full speed-to-lead handoff (SMS + partner email + nurture)
[ ] Mobile experience is polished — sticky CTA, responsive, fast

═══════════════════════════════════════════════════════
## TASK 5 — SECRETARY-FRIENDLY ONBOARDING (THE MARKETER-IN-A-BOX)
═══════════════════════════════════════════════════════

The form a 55-year-old office secretary fills out to populate her business's offer page. Approachable, savable, mobile-friendly, and genuinely helpful — it teaches marketing while collecting data.

### 5A — Onboarding token entry point

When Jason marks an advertiser_account as ready for onboarding (via admin or directly in DB), the system:
1. Generates a UUID `onboarding_token` if none exists
2. Sends an email via GHL to the contact_email with subject "Welcome to The KeepSharing Partner Engine — let's build your page"
3. Email contains the link `/onboard/{token}`
4. No login required — token IS the auth

Build `/src/app/api/admin/partners/[id]/start-onboarding/route.ts` to trigger this from admin.

### 5B — `/onboard/[token]` — the form itself

Single Next.js page with a multi-section guided experience. Magazine-quality cream-and-warm visual design. Progress indicator at top. Save-as-you-go. Mobile-first.

**Tone of every label:** Friendly editor walking her through it. Not "tagline" → "What's the one sentence that describes your practice?" with example.

**Section 1 — Confirm Basics (3 minutes)**
Pre-filled with whatever Jason captured during sales conversation.
- Business name (pre-filled, editable)
- Business URL (pre-filled, editable)
- Primary phone (pre-filled, editable)
- Primary contact email (pre-filled, editable)
- Primary contact name (pre-filled, editable)
- Logo upload OR "use what's on your website" button (auto-fetches via scraper)

**Section 2 — Auto-Prefill from Your Website (1 minute)**
Big button: "✨ Pull info from your website to save us both time"
On click: scraper runs against `business_url`, extracts everything available, populates Section 3 + 4 + 6 fields with the scraped content. She reviews and edits.
Alternative: "I'll fill it in manually" link (skips scraping).

**Section 3 — Your Offer (10-15 minutes — THE MOST IMPORTANT SECTION)**
This is where Marketer-in-a-Box shines.

Step 1: "What action do you want a parent to take after reading your page?"
- Schedule a consult/appointment
- Use a discount code
- Click a booking link
- Request information / be contacted
- Other (describe)

Based on her answer, the form configures the next steps.

Step 2: "What offer drives this action?"
- Show 5-7 proven offer templates for her category, each with:
  - Offer headline example
  - Why it works
  - "Best for..." note (e.g., "Best for new practices building patient base")
  - Real example from another partner (anonymized)
- Big text area for her offer headline + subheadline + value statement
- "I'm not sure" button → opens guided helper that asks 3 questions (current customer LTV, capacity issues, top 3 competitors) and recommends a tailored offer

Step 3: "What makes this offer credible?"
- Proof points fields (3-5)
- Testimonials option (text in OR pull from Google reviews)
- Social proof numbers ("X happy customers", "Y years in business")

Step 4: "How can we make this offer urgent?"
- Date-based urgency (end date picker)
- Quantity-based urgency (spots remaining)
- Both / neither
- Suggested urgency phrasings

Step 5: "What objections do parents have?"
- 4-6 common objections listed (category-specific suggestions)
- She edits/adds her own, fills in responses
- Marketer-in-a-Box suggests strong responses for each

**Section 4 — Your Story (10 min)**
- Mission statement (with example, char counter)
- "What makes you different?" — 3 value props (title + description + icon picker)
- Marketer-in-a-Box: each value prop has examples from her category and "what works in this space"

**Section 5 — Locations (5-10 min)**
Pre-filled from advertiser_accounts. She edits / adds / removes.
- Location name, address (with Google Places autocomplete if API key in env), phone, hours (visual time picker grid), accepting-new toggle

**Section 6 — Your Team (10-15 min per person)**
- Photo upload (or "use a placeholder")
- Display name, title, credentials
- Bio (with prompt: "Tell parents who you are. 2-3 sentences.")
- Philosophy quote (with prompt: "What's the one thing you want parents to know about why you do this work?")
- Marketer-in-a-Box: examples of strong vs. weak bios

**Section 7 — Photos & Proof (10-15 min)**
- Photo drag-drop zone with category tags (Hero / Team / Space / Happy Customers / Mascot / Other)
- "Use professional stock photos" alternative — system fills with curated Unsplash for her category
- Testimonials: 3-5 fields, with "type these in" or "pull from Google reviews" (uses gbp_place_id if provided)
- Insurance accepted (multi-select for healthcare, equivalent for other categories)
- Accreditations / certifications (text)

**Section 8 — Services / Offerings (5-10 min)**
Category-aware. Healthcare: services list. Education: grade levels + programs. Childcare: programs + age groups. Family-service: product/service categories. Family-activities: experience types.
4-8 entries, each with title + description + icon.

**Section 9 — FAQs (5-10 min)**
Pre-filled with category-specific common questions, draft answers from scraped content + her offer.
She edits answers, adds her own.

**Section 10 — Brand Colors & Mascot (3 min)**
- Brand color picker (primary + accent), or upload logo and system extracts dominant colors
- Mascot upload (or "Skip — we don't have one")

**Section 11 — Final Review & Submit**
- Live preview link of her page in current state
- "Anything else we should know?" textarea
- Submit button: "Submit for Review — your page goes live within 48 hours"

### 5C — Form mechanics

- Autosave every 30 seconds + on every field blur
- Save status visible: "Saving..." / "Saved 2 minutes ago" / "All changes saved"
- "Continue Later" on every section (saves state, emails her the resume link)
- Mobile-optimized throughout (large tap targets, photo upload from camera roll)
- Forgiving validation: only truly required fields block submission
- Help bubbles on every section
- Estimated time per section visible
- Section-by-section progress indicator at top

### 5D — `/admin/partners/[slug]/review` — Jason's review interface

After submission:
- onboarding_status = 'submitted'
- onboarding_submitted_at = NOW()
- Email to Jason: "Dentistry for Children completed onboarding — review at [URL]"
- She gets confirmation email: "Thanks! Your page goes live within 48 hours."

`/admin/partners/[slug]/review` shows:
- Side-by-side: form data on left (editable), live preview on right
- Jason can edit any field, add/remove items
- "Publish" button sets `onboarding_status = 'live'`, `published_at = NOW()`, removes the demo strip, sends her the live URL via email/SMS

### 5E — Forgiveness everywhere

Page renders beautifully even if she only fills out half:
- No team → component doesn't render
- No testimonials → graceful state OR pulls from Google reviews if gbp_place_id
- No services → doesn't render
- No FAQs → doesn't render
- No mascot → doesn't render
- No custom photos → curated stock fills seamlessly
- No brand colors → magazine palette default
- Never shows "[fill this in]" placeholders or empty sections

### 5F — DONE WHEN

[ ] Onboarding token system works (email link, no account)
[ ] /onboard/[token] form built with all 11 sections
[ ] Auto-prefill from website URL works (scraper + button trigger)
[ ] Marketer-in-a-Box hints/examples present in every relevant section
[ ] 5 offer templates per category included (25 total)
[ ] Autosave + status indicator works
[ ] Mobile-friendly throughout (form usable on phone)
[ ] Photo upload works (with curated-stock alternative)
[ ] Form is forgiving — page renders even with sparse data
[ ] /admin/partners/[slug]/review works for Jason to approve and publish
[ ] All notification emails fire correctly

═══════════════════════════════════════════════════════
## TASK 6 — FAMILY RESOURCE GUIDE: REAL CONTENT LAYER
═══════════════════════════════════════════════════════

Five real magazine articles in DeAnne's voice, hyperlocal to River Region, with photography, pull-quotes, in-article ad placement, and natural Featured Partner references.

### 6A — Migration `018_guide_articles.sql`

Create `guide_articles` table:
- id UUID PK
- slug TEXT UNIQUE
- title TEXT
- subtitle TEXT
- category TEXT ('newcomer' / 'schools' / 'pediatric' / 'weekends' / 'hidden-gems')
- featured BOOLEAN DEFAULT false
- cover_photo_url TEXT
- cover_photo_alt TEXT
- cover_photo_caption TEXT
- body_markdown TEXT (full 1000-1500 word article)
- pull_quotes JSONB (array of 2-3 strings extracted from body for layout emphasis)
- featured_partners_referenced UUID[] (advertiser_account IDs naturally referenced)
- read_time_minutes INT
- published_at TIMESTAMPTZ
- author_name TEXT DEFAULT 'DeAnne Watson'
- author_role TEXT DEFAULT 'Editor, River Region Parents'
- author_photo_url TEXT
- meta_description TEXT
- seo_keywords TEXT[]
- ad_rotator_zone TEXT DEFAULT 'sidebar' (where ads appear in this article)

Create `guide_article_ad_placements`:
- id UUID PK
- article_id UUID FK
- advertiser_id UUID FK
- placement_position INT (1, 2, 3 — first/second/third ad in the article)
- placement_zone TEXT ('sidebar' / 'inline-after-paragraph-3' / 'inline-after-paragraph-6' / 'end-of-article')

### 6B — The 5 articles, real content

Each article: 1000-1500 words. DeAnne's voice (warm, knowing, honest, magazine-style). Hyperlocal — names real places, real neighborhoods, real specifics. Practical, not fluffy. References Featured Partners naturally where appropriate.

**Article 1: `your-first-30-days-river-region`**
Title: "Your First 30 Days in the River Region: A Practical Family Welcome"
Subtitle: "What to know, where to go, and how to actually feel at home"
Category: newcomer
Hook: Open with a specific moment — moving truck unpacking, child asking "where will I go to school," that disorientation of being new
Content: Week-by-week practical guide. Where to register kids for school (specific districts and timelines). The grocery stores worth knowing about (Publix, Sprouts, Earth Fare). The five neighborhoods most newcomer families settle in (Vaughn Lakes, Wynlakes, Pike Road, Halcyon, downtown lofts) with honest pros/cons. The pediatricians and dentists worth getting on a waiting list for (natural reference to Dentistry for Children, Just for Grins, Kingry Pediatrics). The Saturday morning rituals that turn into family traditions (Riverwalk Park, Eastchase Farmers Market, Old Alabama Town).
Pull-quotes: "By week three, you'll know whether you're a Pike Road family or a Wynlakes family. Trust that signal." / "The fastest way to feel at home: pick one Saturday-morning spot and go three weeks in a row."
Featured Partner natural references: Dentistry for Children, Saint James (for school options), one boutique reference for kids clothes
SEO keywords: 'moving to River Region', 'newcomer Montgomery AL', 'family relocation Alabama', 'River Region neighborhoods'

**Article 2: `choosing-a-school-river-region`**
Title: "Choosing a School in the River Region: A Parent's Honest Guide"
Subtitle: "The five questions that matter more than the marketing"
Category: schools
Hook: Open with the moment a parent realizes they have to actually choose — the first MPS open house that didn't feel right, or the pamphlet from a private school that sounded too good
Content: The honest landscape of MPS (Montgomery Public Schools) options — magnet programs (LAMP, BTW, MAMS) and how the lottery actually works. Pike Road Schools as the public alternative. The major private schools (Saint James, Trinity, Alabama Christian, Montgomery Academy, Catholic) — each with honest character description. The five questions that actually matter more than tuition or test scores: What does drop-off feel like at 7:45? How do they handle discipline? Who teaches the bottom 25%? What's the parent culture? Will my kid still know themselves at 16? Practical advice: visit on a Tuesday, not an open house.
Pull-quotes: "Test scores tell you about the families. The teachers tell you about the school." / "If your child's name isn't said three times during a tour, the school doesn't know them yet — and they're trying to recruit you."
Featured Partner natural references: Saint James, Trinity, Alabama Christian (all in the comparison)
SEO keywords: 'private schools Montgomery AL', 'choosing a school River Region', 'Pike Road Schools', 'magnet schools Montgomery'

**Article 3: `finding-pediatric-care-river-region`**
Title: "Finding the Right Pediatric Care for Your Family"
Subtitle: "Pediatricians, dentists, and the specialists you'll meet eventually"
Category: pediatric
Hook: The 2am ear infection moment — when you realize you don't know who to call. Or the first dental visit that goes wrong because the practice wasn't right.
Content: How to choose a pediatrician (Baptist Medical Group, Jackson Hospital pediatrics, smaller independents). The pediatric dentists worth waiting for (Dentistry for Children, Just for Grins, Kingry — each with a brief honest description of who they serve best). The pediatric specialists you'll meet eventually (allergy, cardiology, ENT, derm) and how they all flow through the same hospital systems. Insurance navigation tips. What to ask in a new-patient interview. How to recognize when it's time to switch.
Pull-quotes: "The right pediatrician is the one who answers the phone at 2am — or has a partner who does." / "Don't choose a pediatric dentist for the first cleaning. Choose for the cavity that's coming."
Featured Partner natural references: Dentistry for Children (highlighted with Chew-Chew Train context), Just for Grins, Kingry, Baptist Pediatrics
SEO keywords: 'pediatrician Montgomery AL', 'pediatric dentist River Region', 'family doctor Alabama', 'choosing pediatric care'

**Article 4: `saturday-mornings-river-region`**
Title: "12 Saturday Mornings in the River Region You'll Actually Look Forward To"
Subtitle: "From the obvious to the hidden — the rituals that turn into family memory"
Category: weekends
Hook: A specific Saturday — the kids wanting "to do something" and the parent wanting "to not plan something" — that tension every weekend
Content: 12 specific Saturday-morning options, ranked by effort required. From the lowest-effort ("Riverwalk Park stroll, doughnuts at Sweet Creek Coffee") to the highest-effort ("Camp Cheaha day trip, leave by 7am"). Mix of free and paid, indoor and outdoor, kid-led and parent-led. Real names of places. Specific recommendations (the 9am yoga at Old Alabama Town, the storytime at the East Library, the Eastchase Farmers Market vendors who let kids taste). Each option has a "why this works" mini-paragraph and an "ages" tag.
Pull-quotes: "The best family Saturday is the one you didn't have to argue about by 8am." / "Three weeks at the same farmers market, you stop being a customer. You become a regular."
Featured Partner natural references: 1-2 family activities partners, 1 restaurant partner
SEO keywords: 'family Saturday morning Montgomery', 'weekend with kids River Region', 'family activities Alabama', 'kids Eastchase'

**Article 5: `hidden-gems-river-region-newcomers`**
Title: "The Hidden Gems Every Newcomer Should Know About"
Subtitle: "12 places locals won't tell you about — but should"
Category: hidden-gems
Hook: The realization that the "must-do" list everyone gives newcomers is actually the tourist list. The real gems are different.
Content: 12 hidden gems with honest descriptions. The bookstore tucked behind the church. The breakfast spot only locals go to. The park that's always empty even when it shouldn't be. The festival nobody from out-of-state has heard of. The barber/salon/coffee shop that doubles as a community hub. Specific names, specific addresses, specific reasons why each one matters. Honest about which are quirky vs. legitimately great.
Pull-quotes: "The best places in town aren't on TripAdvisor. They're on the bulletin board at the library." / "A 'hidden gem' isn't actually hidden. It's just not for everyone — which is exactly why it matters."
Featured Partner natural references: 1-2 small business partners
SEO keywords: 'hidden gems Montgomery AL', 'best of River Region', 'local favorites Montgomery', 'Alabama family travel'

### 6C — Article page polish

Update `/src/app/newcomer-guide/articles/[slug]/page.tsx`:
- Magazine typography (Fraunces headlines, DM Sans body)
- Cover photo with overlay caption
- Pull-quotes designed in editorial style (Fraunces italic, terra left-border, large)
- Author byline with photo + role
- Estimated read time
- Inline Featured Partner references render as small "Featured Partner" badges with link
- In-article ad placement (sidebar on desktop, inline on mobile) reading from `guide_article_ad_placements`
- Related articles at bottom (3 cards from same or related category)
- Inline submission widget at very bottom: "Have something to add? Tell us your take →" (placeholder link to /share/your-pick — Build Run #8)
- SEO: meta description, Open Graph, JSON-LD Article schema, reading time markup

### 6D — Article photography

Each article gets cover photo + 2-3 inline photos. Source via curated Unsplash by category.

Author photo for DeAnne (placeholder until real photo): use a professional warm-toned woman headshot from curated stock with note that real photo to be added.

### 6E — Ad placements

For each article, seed 1-2 ad placements with existing advertisers:
- Article 1 (newcomer): sidebar ad rotates among 3 partners
- Article 2 (schools): sidebar ad with school partners (Saint James, Trinity, ACA)
- Article 3 (pediatric): sidebar ad with Dentistry for Children, plus inline-after-paragraph-3 with Just for Grins
- Article 4 (weekends): sidebar with restaurant/activity partner
- Article 5 (hidden gems): sidebar with boutique partner

### 6F — DONE WHEN

[ ] Migration 018 applied
[ ] All 5 articles written with real, substantive 1000-1500 word content
[ ] Each article has cover photo + 2-3 inline photos from curated stock
[ ] Pull-quotes properly extracted and styled
[ ] Article page renders magazine-quality
[ ] Featured Partner references link to listings
[ ] In-article ads render in correct positions
[ ] SEO + structured data implemented
[ ] All articles accessible at /newcomer-guide/articles/[slug]

═══════════════════════════════════════════════════════
## TASK 7 — HEAVY APP-STYLE MOBILE EXPERIENCE
═══════════════════════════════════════════════════════

Reference: `/mnt/user-data/uploads/rrp-mobile-feed.html`. The mockup IS the quality bar. Match it exactly in implementation, then extend to full functionality.

### 7A — `/feed` route — the For-You feed

Auto-routed from `/` on mobile (viewport < 768px or mobile UA). Desktop continues to use existing home.

Match the mockup structure exactly:
- Sticky white top nav (logo, location, bell, search)
- Filter strip (horizontal scrollable pills, "✨ For You" active by default, "📅 This Weekend", "🏫 Schools", "☀️ Summer", etc.)
- Hero card (large featured story with sky-to-navy gradient overlay)
- "📅 This Weekend" section (horizontal scroll of event cards, snap behavior)
- "👑 Spotlights" section (horizontal scroll of avatar bubbles, last bubble = "+ Nominate Someone")
- "Today's Picks" main feed (vertical column of mixed content cards)
- Bottom nav (sticky 5-icon: Home/Events/Guides/Spotlights/Search)

Card types to support in the main feed:
- Feature card (large, prominent, hero image with gradient overlay)
- Horizontal card (image left, content right)
- Vertical card (image top, content bottom)
- Advertiser card (NATIVE, distinctively styled but first-class — "✨ FEATURED PARTNER" badge, business name, headline, single CTA)
- Birthday Spotlight card (sky background, gift emoji, child name + age)
- Newsletter CTA card (terra gradient block)

All transitions, tap states, scroll behaviors match the mockup exactly. Reference the CSS in the mockup file.

### 7B — Mobile detection & routing

- Server-side mobile detection via user-agent
- Client-side viewport-based fallback at < 768px
- On `/`, redirect mobile to `/feed`
- Cookie flag `force_desktop` for testing on mobile
- All other routes (listing details, articles, etc.) get the bottom nav added on mobile

### 7C — Native ad inventory

Build `feed_ad_placements` table:
- id UUID PK
- placement_type TEXT ('featured_card' / 'this_weekend_sponsor' / 'spotlight_bubble' / 'featured_story_sponsor')
- advertiser_id UUID FK
- start_date / end_date
- weight INT (priority)
- impression_count INT DEFAULT 0
- click_count INT DEFAULT 0

Inventory placements:
- **Featured Card** (rotates every 4-5 organic cards in feed, uses partner brand color tinted background, available to Tier 2-4 partners)
- **This Weekend sponsor** (Tier 4 only, "presented by [Partner]" in section header, gets one event card slot)
- **Spotlight bubble** (Tier 4 only, permanent bubble with "Featured Partner" subtitle, taps to /partners/[slug])
- **Featured Story sponsor** (Tier 3 only, "this story is brought to you by [Partner]" attribution at end of featured article)

Build `/api/feed/track-impression` and `/api/feed/track-click` for analytics.

### 7D — Mobile pages getting bottom nav

- /feed (Home active)
- /events (Events active)
- /newcomer-guide (Guides active)
- /spotlights (Spotlights active — placeholder page if doesn't exist)
- /search (Search active — placeholder if doesn't exist)
- Listing detail pages on mobile (no specific tab active, but bottom nav present)
- Article pages on mobile (Guides active)

NOT on:
- /partners/[slug] (own sticky CTA)
- /onboard/[token] (form, distraction-free)
- /advertise (sales page)
- /admin/* (desktop)

### 7E — App-style polish throughout

- Tap targets minimum 44x44px
- `:active` states with subtle scale-down (`transform: scale(0.97)`)
- No hover-only interactions
- Smooth scroll, momentum scrolling on touch
- Skeleton shimmer loading states (not spinners)
- All transitions ease-out, 200-300ms
- Pull-to-refresh on /feed (polite implementation)

### 7F — DONE WHEN

[ ] /feed route built matching mockup quality exactly
[ ] All sections implemented (top nav, filter strip, hero, This Weekend, Spotlights, Today's Picks, bottom nav)
[ ] All 6 card types render correctly
[ ] Native ad inventory works (featured cards rotate, sponsors visible)
[ ] feed_ad_placements table tracks impressions/clicks
[ ] Mobile detection auto-routes / to /feed
[ ] Bottom nav shows on appropriate pages
[ ] All polish details (tap states, transitions, skeleton loaders) implemented

═══════════════════════════════════════════════════════
## TASK 8 — UPDATE /advertise WITH PARTNER ENGINE NAMING
═══════════════════════════════════════════════════════

### 8A — Naming updates throughout /advertise

Update copy:
- Tier 4: "The KeepSharing Partner Engine — full power"
- Tier 3: "The KeepSharing Partner Engine — Essentials"
- Tier 2: "RRP Featured + Distribution"
- Tier 1: "RRP Featured Listing"

### 8B — New section near top: "What Is The KeepSharing Partner Engine?"

3 paragraphs:
1. The system overview — "It's not a landing page. It's not just an ad. It's the integrated marketing system that produces actual results for local family businesses..."
2. The five components — "Your custom offer page. Speed-to-lead handoff. Multi-channel amplification. The follow-up sequence. The monthly performance reports..."
3. The brand — "Built by River Region Parents. Powered by KeepSharing. The marketing system designed for businesses that serve families."

### 8C — Polish from Build Run #6 review

- "Already talked to us? Get the media kit →" link in top right (mailto:jason@keepsharing.com for now)
- Pull-quote strip below hero: "We don't sell ads. We make winners. River Region Parents is the biggest community influencer for parents in the River Region — and we put that influence to work for our Partners."
- Verify Section Sponsor CTA, all tier CTAs, mobile responsive

### 8D — DONE WHEN

[ ] All Partner Engine naming applied
[ ] New "What Is The Partner Engine?" section added
[ ] Pull-quote strip below hero
[ ] "Already talked to us?" link in header
[ ] Mobile responsive verified

═══════════════════════════════════════════════════════
## TASK 9 — KNOWLEDGE BASE UPDATE + STATUS REPORT
═══════════════════════════════════════════════════════

### 9A — Update `/docs/keepsharing-knowledge-base.md`

Add a comprehensive new section:

```markdown
## BUILD RUN #7 — DEPLOYED MAY 1, 2026

### Product: The KeepSharing Partner Engine
The integrated offer-driven marketing system delivered through publication brands.

Components:
1. The Offer Page (Russell Brunson model, conversion-optimized)
2. Speed-to-Lead Handoff (RRP-branded SMS to lead, partner email handoff, lead enters nurture)
3. 14-Day Nurture Sequence (5 emails, RRP-branded, addresses objections, reinforces offer)
4. Marketer-in-a-Box Onboarding (multi-section form, teaches marketing while collecting data)
5. Photo System (uploaded → GBP → curated → placeholder, magazine-quality always)

Tier mapping:
- Tier 4 ($1,500/mo): "The KeepSharing Partner Engine — full power"
- Tier 3 ($750/mo): "The KeepSharing Partner Engine — Essentials"
- Tier 2 ($400/mo): "RRP Featured + Distribution"
- Tier 1 ($125/mo): "RRP Featured Listing"

Tagline: "Built by River Region Parents. Powered by KeepSharing."

### New surfaces:
- /partners/[slug] — fully rebuilt as offer-driven page (REPLACES old listing template)
- /partners/dentistry-for-children — polished demo built around $0 First Visit offer
- /onboard/[token] — secretary-friendly multi-section onboarding (marketer-in-a-box)
- /admin/partners/[slug]/review — Jason's review/publish interface
- /feed — heavy app-style mobile feed (auto-routed from / on mobile)
- /newcomer-guide/articles/[slug] — 5 real magazine articles

### New infrastructure:
- 9 new tables: partner_offers, locations, team, testimonials, trust_signals, photos, services, faqs, partner_leads, guide_articles, guide_article_ad_placements, feed_ad_placements
- Speed-to-lead handoff system (SMS + email + nurture) via existing GHL integration
- Website scraper for onboarding auto-prefill
- Photo sourcing system with curated Unsplash library by category
- Brand color layering system
- Onboarding token system (no account needed)
- Native ad inventory in mobile feed

### Categories supported:
healthcare / education / childcare / family-service / family-activities

### Pending GHL workflow IDs (Jason to provide post-build):
- GHL_NURTURE_WORKFLOW_ID (the 14-day partner-engine nurture)
- GHL_ONBOARDING_WORKFLOW_ID (welcome sequence after sign-up)

### 5 Magazine Articles published:
- Your First 30 Days in the River Region
- Choosing a School in the River Region
- Finding the Right Pediatric Care for Your Family
- 12 Saturday Mornings in the River Region You'll Actually Look Forward To
- The Hidden Gems Every Newcomer Should Know About
```

### 9B — Comprehensive status report

Post a final status report including:
- All migrations applied (017, 018)
- All new tables created
- All new components built (count + key names)
- All new routes available
- New seed data (DFC full content, 5 articles, curated photo library)
- API endpoints created
- Manual test instructions for each major feature:
  - "Visit /partners/dentistry-for-children — should be polished offer page with Chew-Chew Train mascot, $0 First Visit hero offer"
  - "Submit the form on DFC page — should fire SMS to test number within 60 sec, partner email to Jason, and enrollment in nurture"
  - "Visit /onboard/{test-token} — should show full multi-section form with auto-prefill button"
  - "Visit on mobile — should redirect to /feed with full app-style experience"
  - "Click any FRG article — should render magazine-style with real content"
- Known TODOs (real Chew-Chew Train artwork, real DFC photos from practice, real testimonials, GHL workflow IDs to set up)
- Build time summary

### 9C — DONE WHEN

[ ] Knowledge base updated with full Build Run #7 section
[ ] Comprehensive status report posted with manual test instructions

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Open `/partners/dentistry-for-children` on his phone** and feel proud showing it to a $1,500/month prospect tomorrow morning. The page is built around a real offer ($0 First Visit Consultation), drives toward a single conversion action, and demonstrates The KeepSharing Partner Engine working as a system.

2. **Submit the form himself as a test lead** and within 60 seconds receive: an RRP-branded SMS with the practice's contact info, see an email arrive at his inbox with the lead handoff details. The system actually works end-to-end.

3. **Open the mobile site on a friend's phone** and have them say "this feels like an app, not a website." The bottom nav, the swipeable feeds, the spotlights, the native ad cards — it's a unique product, not a website.

4. **Read any of the 5 Family Resource Guide articles** and feel like real magazine content, not AI-generated filler. Hyperlocal, specific, helpful, in DeAnne's voice.

5. **Pick up the phone and call a pediatric practice owner** with confidence: "I've built you a sample page that converts. Take a look — this is what The KeepSharing Partner Engine produces. We help businesses serving families win. Are you ready for yours?"

6. **Send a signed prospect to `/onboard/[token]`** and have them complete onboarding without a phone call. The system pre-fills from their website, teaches them better marketing while they fill out, and produces a published page within 48 hours.

This build is the bridge from "we have a strategy" to "we have a product to sell."

═══════════════════════════════════════════════════════
## FINAL CHECKLIST BEFORE STOPPING
═══════════════════════════════════════════════════════

[ ] All 9 task blocks complete
[ ] All migrations (017, 018) applied successfully to production Supabase
[ ] /partners/dentistry-for-children loads as polished offer page
[ ] Speed-to-lead handoff fires correctly (SMS + email + nurture enrollment) — tested with actual submission
[ ] /onboard/[test-token] form works end-to-end with auto-prefill
[ ] /feed mobile experience matches mockup quality
[ ] All 5 FRG articles published with real content + photography
[ ] /advertise updated with Partner Engine naming
[ ] Knowledge base updated
[ ] Comprehensive status report posted

Then STOP. Do not deploy to production. Do not start additional builds.

The next build (Build Run #8) will tackle: cold-traffic lead funnel at /get-media-kit, Mom Insiders submission engine, proposal generator, Operations Dashboard live data wiring, partner backend dashboard.

GO.
