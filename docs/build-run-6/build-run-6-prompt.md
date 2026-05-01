# BUILD RUN #6 — EPIC: Sales Infrastructure + Family Resource Guide Polish + Advertiser Landing Page System

## Context

This is the most comprehensive build run yet. It ships the complete sales motion for River Region Parents' new Annual Advertising Partner program AND polishes the Family Resource Guide demo to production quality.

Previous builds (#1-#5) have established:
- Database with 260 verified Montgomery-area listings
- 8 Featured Listings (Saint James, Trinity, Alabama Christian, Just for Grins, Dentistry for Children, Kingry, Baptist Medical East/South)
- /newcomer-guide page with magazine-style design (navy/sky/sage/terra/gold/cream palette, Fraunces serif + DM Sans)
- App-style mobile experience with bottom nav
- 5 articles in DeAnne's voice
- /advertise page partially redesigned (still needs work)
- GHL integration with 6 sub-account PITs

This build wraps it all into a polished, production-ready sales tool that Jason can use Monday morning to start closing Annual Advertising Partner contracts.

## STRATEGIC POSITIONING (drives all copy in this build)

Read this carefully — the language matters:

**"River Region Parents is the biggest community influencer for parents in the River Region. Other advertisers run their own ads and hope. Our Partners get our influence. When River Region Parents promotes you to local moms, that's not advertising — that's recommendation. You're not just buying placements. You're buying our voice, our trust, our reach, our system. We make winners. We are winners."**

This positioning replaces all "buy an ad" language across /advertise. Use phrases like:
- "Our Local Family Marketing System"
- "We make winners"
- "Hire River Region Parents to bring you customers"
- "We are the biggest community influencer for parents in the River Region"
- "Stop running ads. Start being chosen."

NEVER use:
- "ROI"
- "CPM"
- "Impressions"
- "Click here"
- Generic SaaS marketing language

## OPERATING RULES

Auto-approve all file edits, terminal commands, npm installs, migrations. Stop only on (1) unresolvable failure, (2) strategic decision not specified below, (3) destructive operation. Otherwise build.

Before starting, verify these by reading them:
- /docs/keepsharing-knowledge-base.md (full strategic context)
- /docs/option-c-strategic-addendum.md (AI-era strategy — IF this file exists; if not, skip)
- /src/app/globals.css (existing design tokens)
- /src/components/family-guide/FeaturedListing.tsx (existing component pattern)

═══════════════════════════════════════════════
TASK 1 — DATABASE FOUNDATION
═══════════════════════════════════════════════

Create migration 016_advertising_partners.sql with the following tables.

### Table: advertiser_packages

Defines what's in each tier. Columns:
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- tier_name TEXT NOT NULL UNIQUE (e.g., 'tier-1-found', 'tier-2-featured', 'tier-3-chosen', 'tier-4-won')
- display_name TEXT NOT NULL (e.g., 'Featured Listing', 'Featured', 'Chosen', 'Won')
- monthly_price NUMERIC NOT NULL
- annual_price NUMERIC NOT NULL
- deliverables JSONB NOT NULL (structured list of what's included)
- display_order INT NOT NULL DEFAULT 0
- is_active BOOLEAN NOT NULL DEFAULT true
- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

Seed all 4 tiers in the same migration:
- tier-1-found: $125/mo, $1,500/yr, display_name "Featured Listing"
- tier-2-featured: $400/mo, $4,800/yr, display_name "Featured"
- tier-3-chosen: $750/mo, $9,000/yr, display_name "Chosen"
- tier-4-won: $1,500/mo, $18,000/yr, display_name "Won"

The deliverables JSONB should contain an array of strings matching the deliverables I specify in Task 2 below.

### Table: advertiser_accounts

Tracks who's bought what. Columns:
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- business_name TEXT NOT NULL
- slug TEXT NOT NULL UNIQUE (URL-safe identifier)
- package_tier TEXT REFERENCES advertiser_packages(tier_name)
- contact_name TEXT
- contact_email TEXT
- contact_phone TEXT
- ghl_contact_id TEXT (links to GHL contact)
- listing_id UUID REFERENCES guide_listings(id)
- landing_page_published BOOLEAN NOT NULL DEFAULT false
- contract_start_date DATE
- contract_end_date DATE
- notes TEXT
- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Table: lead_submissions

Every "Send a message" or "Get info" form fill. Columns:
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- submitter_name TEXT
- submitter_email TEXT
- submitter_phone TEXT
- message TEXT
- source_page TEXT (e.g., '/newcomer-guide/listings/dentistry-for-children')
- target_advertiser_id UUID REFERENCES advertiser_accounts(id)
- target_tier_interest TEXT (which tier prospect was looking at)
- form_step_completed INT NOT NULL DEFAULT 1 (1 or 2 — for the 2-step capture)
- business_name TEXT (collected in step 2)
- business_size TEXT (collected in step 2)
- current_marketing_spend TEXT (collected in step 2)
- biggest_challenge TEXT (collected in step 2)
- ghl_synced BOOLEAN NOT NULL DEFAULT false
- ghl_contact_id TEXT
- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Table: advertiser_listing_photos

Galleries for Featured Listings. Columns:
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- listing_id UUID NOT NULL REFERENCES guide_listings(id) ON DELETE CASCADE
- photo_url TEXT NOT NULL
- alt_text TEXT
- display_order INT NOT NULL DEFAULT 0
- is_cover BOOLEAN NOT NULL DEFAULT false
- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Indexes
- idx_advertiser_accounts_slug ON advertiser_accounts(slug)
- idx_advertiser_accounts_package_tier ON advertiser_accounts(package_tier)
- idx_lead_submissions_target_advertiser ON lead_submissions(target_advertiser_id)
- idx_lead_submissions_target_tier_interest ON lead_submissions(target_tier_interest)
- idx_lead_submissions_created_at ON lead_submissions(created_at DESC)
- idx_advertiser_listing_photos_listing ON advertiser_listing_photos(listing_id, display_order)

### Row-Level Security
- All tables: enable RLS
- Public read on advertiser_accounts WHERE landing_page_published = true
- Public read on advertiser_listing_photos
- Public read on advertiser_packages WHERE is_active = true
- Service role: full write
- Super admin (auth.jwt() ->> 'email' = 'jade31994@gmail.com'): full access

═══════════════════════════════════════════════
TASK 2 — /advertise PAGE COMPLETE REBUILD
═══════════════════════════════════════════════

Replace the current /advertise page with a comprehensive media kit page. This becomes the published online media kit that EVERY prospect sees.

### Page Structure (top to bottom):

**Section A — Hero (cream background)**

- Eyebrow: "ADVERTISE WITH RIVER REGION PARENTS" in --fg-terra small caps
- H1 (Fraunces serif, 56-72px desktop / 40-48px mobile): "We Help Local Family Businesses Win"
- Subhead (DM Sans 18-22px, --fg-mid): "Stop guessing about marketing. Stop trying to do TikTok and Facebook ads on your own. Let River Region Parents do what we've done for 30 years — connect you to the families in this community who become your customers."
- Body paragraph: "We don't sell ads. We build winning systems. We are the biggest community influencer for parents in the River Region — and we put that influence to work for our Partners."
- Two CTAs:
  - Primary: "See Partner Tiers →" (terra fill, scrolls to Section C)
  - Secondary: "Browse the Family Guide →" (navy outline, links to /newcomer-guide)
- Right side or below: warm hero photo. Use /public/images/family-guide/hero-grandfather-mom-daughter.jpg if available, else /public/images/family-guide/family-park-frisbee.jpg

**Section B — Why Partners Win (3-column on desktop, stacked on mobile)**

Three value props with icons:

1. **Trust That Converts** — "30 years of building real relationships with River Region families. When we recommend you, moms listen."
2. **Multi-Touch Reach** — "Print. Web. Email. Social. We meet moms where they are — drop-off, gym, lunch break, late night, early morning."
3. **Done For You** — "We handle the design, the placement, the social campaigns, the lead capture, the reporting. You handle being good at what you do."

**Section C — The 4 Partner Tiers (THE HEART OF THE PAGE)**

This is the most important section. Build it as a comparison table on desktop, stacked cards on mobile.

For desktop: 4-column comparison layout where each column is a tier and rows show what's included. Include a "Most Popular" badge on Tier 2 (gold).

For mobile: 4 large stacked cards.

**TIER 1 — FEATURED LISTING — $125/mo**

- Subtitle: "Get Found"
- For: "Small businesses, boutiques, pop-ups, single-service operators ready to be discovered by River Region families"
- Deliverables (with checkmarks):
  - Featured Listing in our digital Family Resource Guide
  - Listed across all relevant guides for your category, year-round
  - 1 photo + editorial blurb written by our team
  - "Send a Message" form on your listing — leads come straight to your inbox
  - Click-to-call & click-to-website tracking
  - Quarterly mention in our Family Resource Guide newsletter
  - "River Region Parents Trusted Partner" badge for your website
- "Best for: businesses paying $0-100/month for marketing today"
- CTA: "Talk to us about Tier 1 →"

**TIER 2 — FEATURED — $400/mo (GOLD "MOST POPULAR" BADGE)**

- Subtitle: "Get Featured"
- For: "Small-to-mid businesses without their own marketing tools — boutiques, childcare, family-focused services, single-location healthcare"
- Deliverables (with checkmarks):
  - Everything in Tier 1, PLUS:
  - Quarter page print ad in 12 issues
  - Premium placement in your section
  - 5-photo gallery on your listing
  - Enhanced 150-word editorial blurb
  - Local Family Marketing System Lite — lead capture form, basic email auto-response, monthly lead notifications
  - River Region Parents amplifies you to local moms — paid social distribution reaches 10,000+ targeted local moms monthly
  - Monthly newsletter mention
  - Quarterly performance report
- "Best for: established small businesses ready for real marketing without the headache"
- CTA: "Talk to us about Tier 2 →"

**TIER 3 — CHOSEN — $750/mo**

- Subtitle: "Get Chosen"
- For: "Established businesses ready to scale — mid-tier healthcare, smaller private schools, multi-location service businesses, growing professional practices"
- Deliverables (with checkmarks):
  - Everything in Tier 2, PLUS:
  - Half page print ad in 12 issues
  - 10-photo gallery + 1 video
  - Editorial profile twice per year (300 words)
  - Local Family Marketing System — custom landing page, lead capture with email + SMS auto-response, missed call text-back, basic GHL workflow setup
  - River Region Parents amplifies you significantly — paid social distribution reaches 25,000+ targeted local moms monthly
  - Monthly editorial mentions in newsletter
  - Direct contact line to Jason or DeAnne
  - Featured in 1-2 carousel posts per year
- "Best for: businesses with $5,000+ customer LTV ready to scale"
- CTA: "Talk to us about Tier 3 →"

**TIER 4 — WON — $1,500/mo**

- Subtitle: "Get the Win System"
- For: "Orthodontists, healthcare specialists, established schools, real estate firms, big home services — businesses where one new customer is worth thousands"
- Deliverables (with checkmarks):
  - Everything in Tier 3, PLUS:
  - Full page print ad in 12 issues with premium placement (rotating)
  - Unlimited photo gallery + multiple videos
  - Cover or feature consideration
  - Section sponsorship in 1 guide per year
  - The Full Local Family Marketing System — completely custom branded landing page, full GHL workflow with personalized email + SMS sequences, missed call text-back, Google Business Profile management (monthly posts, photo updates, hours, review responses), QR code program
  - River Region Parents is your dedicated influencer — paid social distribution reaches 50,000+ targeted local moms monthly across Facebook, Instagram, and Reels
  - Monthly newsletter feature with editorial copy
  - Monthly strategy call with Jason
  - Comprehensive monthly performance report
- "Best for: businesses ready to dominate their category in the River Region"
- CTA: "Talk to us about Tier 4 →"

Each "Talk to us" CTA opens the 2-step lead capture modal (Task 3).

**Section D — Visual Ad-Size Mockups**

Show realistic mockups of Quarter, Half, and Full page ads as they'd appear in the magazine. Include the rate next to each.

Layout: 3 columns on desktop, stacked on mobile. Each shows:
- Visual mockup of the ad size (with realistic placeholder content — pediatric practice, school, boutique)
- Size: "Quarter Page" / "Half Page" / "Full Page"
- Rate: "$240/mo single-issue" / "$390/mo single-issue" / "$540/mo single-issue"
- "Or included in: Tier 2 / Tier 3 / Tier 4"

Heading above: "What You're Buying — Visualized"
Subhead: "Your ad in print. Real size, real placement, real impact."

**Section E — Add-On Menu**

Heading: "À La Carte Add-Ons"
Subhead: "Already a Partner? Want a one-time boost? Here's what we offer."

Display these in a clean grid:

Print Premium Placements (best-position rates):
- Premium Back Cover — Premium rate (contact for current availability)
- Inside Front Cover — Premium rate
- Premium Spread (2-page) — Premium rate
- Senior Class Congratulations Ad (Schools, June + January issues) — $299

Editorial Features:
- Business Spotlight (250-word feature) — $400
- Editorial Profile (500-word feature with photo) — $750
- Advertorial (full-page editorial-style ad) — $750

Annual Guide Sponsorships:
- Annual Birthday Guide Sponsor — $1,500/year
- Annual Summer Fun Guide Sponsor — $2,500/year
- Annual After-School Guide Sponsor — $1,500/year
- Annual Special Needs Guide Sponsor — $1,500/year
- Annual Camp Guide Sponsor — $1,500/year
- Annual Newcomer Issue Sponsor — $3,000/year

Direct Distribution:
- Dedicated Email Blast to RRP Audience — $750
- Featured in "Best of River Region" Article — $250

DO NOT INCLUDE:
- Cover sponsorships (covers are RRP editorial space, not for sale)
- Cover Story / Cover Profile as buyable products
- Family Favorites Voting Sponsor (not running yet)
- Online Expo Sponsor (not running yet)

**Section F — How We Work (process)**

Heading: "How a Partnership Works"

4-step visual process:
1. **Conversation** — "We talk. You tell us about your business, what's working, what isn't."
2. **Customize** — "We design a Partner package that fits — print, digital, social, system."
3. **Launch** — "Within 30 days you're live. Print ad designed. Listing live. Marketing system running."
4. **Win** — "Quarterly we review what's working. Monthly we report what came in. We adjust together."

**Section G — Section Sponsorship Callout**

Heading: "Currently Available: Section Sponsorships in the 2026 Family Resource Guide"
Subhead: "One sponsor per section. Limited to one school, one pediatric practice, one healthcare provider."

Display two sponsor cards:

**Schools Section Sponsor** — "Be the first name families see when they're choosing a school for their kids. Includes Featured Listing across all guide categories, dedicated editorial integration, year-round visibility, custom landing page."

**Pediatric Care Section Sponsor** — "When a newcomer family chooses their child's first doctor, your practice is what they see first. Includes Featured Listing across all guide categories, dedicated editorial integration, year-round visibility, custom landing page."

This section needs an HTML id of "section-sponsors" so it can be linked to from /newcomer-guide section banners.

**Section H — Final CTA**

Cream background, centered.
H2 (Fraunces): "Ready to be the name local families trust?"
Body: "Reach out. We'll talk. We'll listen. We'll design a Partner package that wins for your business."
Two CTAs:
- "Get Started →" (terra fill, opens 2-step lead capture)
- "Schedule a Call" (navy outline, opens lead capture pre-filtered for "wants a call")

═══════════════════════════════════════════════
TASK 3 — 2-STEP LEAD CAPTURE FORM
═══════════════════════════════════════════════

Build a modal-based lead capture system used throughout the site.

### Step 1 (low friction):

Fields:
- Name (required)
- Email (required)
- Phone (optional)
- "Which interests you?" dropdown (pre-filled if they clicked from a tier card; otherwise dropdown with all 4 tiers + "Not sure yet")

CTA: "Continue →"

On submit:
- Save to lead_submissions with form_step_completed = 1
- Tag in GHL as tier-interested-{tier} and nurture-sequence
- Show Step 2

### Step 2 (qualifying — optional but encouraged):

Heading: "Almost there! Help us prepare for our conversation."

Fields:
- Business name (required)
- Business size: dropdown (Solo / 2-10 employees / 11-50 / 51+)
- Current monthly marketing spend: dropdown ($0 / Under $500 / $500-1,500 / $1,500-5,000 / Over $5,000)
- Biggest marketing challenge: textarea (optional)

CTA: "Submit →" (also "Skip for now" link that closes modal)

On Submit (Step 2):
- Update lead_submissions row with form_step_completed = 2
- Update GHL contact with full data, swap nurture-sequence tag for qualified-lead tag
- Show success state: "Thanks! Jason will be in touch within 24 hours."

On Skip (Step 2):
- Save current Step 2 data (even if partial)
- Keep nurture-sequence tag (they enter automated nurture)
- Show success state: "Thanks! Jason will be in touch within 24 hours."

### Implementation notes:
- Modal component reusable across the site
- Use React state to manage step transitions
- API route: POST /api/leads/capture with action: "step1" or "step2"
- GHL integration via existing /src/lib/ghl.ts (follow the sub-account PIT pattern)
- Use the RRP sub-account by default for any leads from /advertise (publication context determined by current page)

═══════════════════════════════════════════════
TASK 4 — FEATURED LISTING ENHANCEMENTS
═══════════════════════════════════════════════

Update the Featured Listing component on /newcomer-guide and detail pages with these new capabilities.

### Photo Gallery

- Tier 1 listings: 1 photo (existing or gradient-letter placeholder)
- Tier 2 listings: up to 5 photos in a small horizontal scroll gallery
- Tier 3 listings: up to 10 photos + optional video embed
- Tier 4 listings: unlimited photos + multiple videos

Photos pulled from advertiser_listing_photos table. If no photos exist, use the gradient initial-letter fallback (existing behavior).

### "Send a Message" Form

On every Featured Listing detail page (/newcomer-guide/listings/[slug]), add a sidebar form:

Heading: "Send {{business_name}} a Message"
Subhead: "Get answers fast — straight from the source."

Fields:
- Your name (required)
- Your email (required)
- Your message (required, textarea)

CTA: "Send Message →"

On submit:
- Save to lead_submissions with target_advertiser_id set
- Send email to advertiser's contact_email with the message
- ALSO: subscribe submitter to RRP's Mom Insider list in GHL (tag: mom-insider, source: family-resource-guide-listing-{slug})
- Show success: "Message sent! We've also subscribed you to our Family Resource Guide updates — unsubscribe anytime."

This is the dual-routing flow: lead to advertiser + email to RRP's audience.

### Click Tracking

On click of phone or website buttons:
- Fire analytics event (use console.log for now, we'll wire to real analytics later)
- Update a counter in the database (guide_listings.click_count if column exists, else add it)

═══════════════════════════════════════════════
TASK 5 — DENTISTRY FOR CHILDREN TIER 4 LANDING PAGE
═══════════════════════════════════════════════

Build the proof-of-concept Tier 4 custom landing page for Dentistry for Children. This becomes the live demo Jason can show prospects.

URL: /partners/dentistry-for-children

### Real business data to use:

- Business Name: Dentistry for Children PC
- Tagline: "First Visit, First Birthday — Schedule Your Child's Visit Today"
- Phone: 334-277-6830
- Website: www.chew-chewtrain.com
- Doctors: Dr. Julia Isherwood Schreiber, Dr. Lakeshia Thomas
- Locations:
  - 7047 Halcyon Summit Dr, Montgomery
  - 68 Village Loop, Wetumpka
  - 207 Ashton Plaza Street, Millbrook (Opening Soon — Wednesdays 7:30-4:30)
- New Patients: Welcome
- Brand Mascot: Chew-Chew Train
- Brand Colors: Sky blue, navy, white, yellow accents

### Page structure:

**Hero (sky blue gradient background — matches their brand):**
- Their logo/wordmark in Fraunces serif: "Dentistry for Children PC" (top left)
- "New Patients Welcome" pill in top right (terra background)
- H1: "First Visit, First Birthday — Schedule Your Child's Visit Today"
- Subhead: "Three trusted locations across the River Region. Specially trained pediatric dentists who make first visits actually fun."
- Phone CTA: "Call (334) 277-6830" (large, terra fill button)
- Form: Inline appointment request form (Name, child's age, preferred location, phone/email, "Request Appointment")

**Meet the Doctors:**
- Two doctor cards side-by-side
- Dr. Julia Isherwood Schreiber + Dr. Lakeshia Thomas
- Brief 1-paragraph bios (placeholder professional copy that sounds authentic)
- Photo placeholders (sage gradient with initials if no photo provided)

**Why Parents Choose Dentistry for Children (3 value props):**
1. "Specialized for kids — our team trains specifically in pediatric dentistry"
2. "Three convenient River Region locations"
3. "We make first visits feel like a celebration, not an appointment"

**Locations Section:**
- 3 location cards with addresses, hours, "Get Directions" links
- Address 1: 7047 Halcyon Summit Dr, Montgomery
- Address 2: 68 Village Loop, Wetumpka
- Address 3: 207 Ashton Plaza Street, Millbrook (label: "Opening Soon — Wednesdays 7:30-4:30")

**What Parents Are Saying:**
- 3-4 quote blocks with names and locations (placeholder content for now: "We've been bringing all three of our kids here for years..." — make them sound authentic)

**Final Appointment Form:**
- Repeat of hero form, larger
- Heading: "Ready for Your Child's First Visit?"
- Form fields: Name, Email, Phone, Child's Age, Preferred Location, Message
- Submit handler: Same lead capture API but tagged specifically for Dentistry for Children

**Footer:**
- "Powered by River Region Parents — your local family resource since 1995"
- Small RRP logo
- Phone: 334-277-6830 + visit-website button to www.chew-chewtrain.com

### Technical implementation:
- Page lives at /src/app/partners/[slug]/page.tsx as dynamic route
- Pulls data from advertiser_accounts table where slug = 'dentistry-for-children'
- Create the advertiser_accounts row in seed data (insert into migration 016 or a follow-up seed file)
- Use the practice's data (provided above) to populate
- Brand colors: sky blue gradient hero (use --fg-sky as base, customize with their actual brand if different)
- Form submissions tagged in GHL with partner-dentistry-for-children and pediatric-dental-lead
- Mobile responsive

### Important: this is a TEMPLATE.

Build it so creating a new Tier 4 partner landing page in the future is just:
1. Add row to advertiser_accounts table
2. Customize content fields
3. Page goes live at /partners/{their-slug}

Document the template structure in code comments.

═══════════════════════════════════════════════
TASK 6 — EMBEDDED SALES CTAs IN /newcomer-guide
═══════════════════════════════════════════════

Add sales CTAs throughout /newcomer-guide so prospects can buy what they see.

### Section sponsor banners → tier-specific CTAs

Currently the section sponsor banners say "Learn more →". Update them to:
- Schools section banner "Learn more →" links to /advertise#tier-4 (since Section Sponsorship is a Tier 4 add-on)
- Pediatric Care section banner "Learn more →" links to /advertise#tier-4
- Other section banners (when they exist) link to appropriate tier

### Sticky mobile bottom strip

On mobile only (≤768px), add a thin sticky bar above the bottom nav:
- Background: --fg-cream with subtle border
- Text: "Want to be Featured? Tap here →"
- Styling: small (32px height), unobtrusive
- Tap: opens lead capture modal

### Inline CTAs in articles

At the bottom of each article on /newcomer-guide/articles/[slug], add:
- "Are you a local business families need to know about? See how we partner with businesses →" (links to /advertise)

═══════════════════════════════════════════════
TASK 7 — FAMILY RESOURCE GUIDE POLISH
═══════════════════════════════════════════════

Final polish on /newcomer-guide to bring it to production quality.

### Replace remaining old design elements

Audit the page and components for any remaining brown/old-design elements. Replace with the new palette (--fg-cream, --fg-navy, --fg-sky, --fg-sage, --fg-terra, --fg-gold).

### Wire real article hero photos

The "Start Here" cards on /newcomer-guide currently show emoji fallbacks (📋 🏫 🤝). Fix this:

1. Verify articles in guide_articles table have hero_image_url set:
   - 'your-first-30-days-in-the-river-region' should use /images/family-guide/hero-grandfather-mom-daughter.jpg
   - 'choosing-the-right-school-district' should use /images/family-guide/family-park-frisbee.jpg
   - 'where-to-find-your-people' should use /images/family-guide/family-park-frisbee.jpg
2. If not set, write a small UPDATE migration 017_article_hero_images.sql to set them
3. Update the Start Here card component to render the Image from next/image
4. If hero_image_url is null OR fails to load, fall back to a cream-to-sage gradient (NOT the emoji)

### Article body typography refinement

Articles at /newcomer-guide/articles/[slug] should render with magazine-quality typography:
- Body: DM Sans, 18px, line-height 1.7, max-width 720px centered
- Inline H2/H3 within body: Fraunces serif
- First letter drop cap optional (Fraunces, large)
- Pull quotes (if any) styled as italic Fraunces, larger size, terra accent

### Article detail page polish

- Eyebrow: "FAMILY RESOURCE GUIDE · ARTICLE"
- Title in Fraunces, 48px, navy
- Author byline + estimated reading time
- Hero image full-width, 50vh
- Body in DM Sans 18px
- Bottom: "Featured in this article" — list of relevant Featured Listings (cross-link)
- Bottom: "More in [Section]" — 3 other articles from same guide
- Newsletter signup CTA at bottom: "Get the Family Resource Guide updates monthly" — connects to GHL Newcomer-Issue-2026 tag

### Section sponsor banners — refine copy

Update banner copy to reflect the new "biggest community influencer" positioning:

Schools section banner copy: "Be the school local families see first. When they're choosing where to send their kids, our Schools Section Sponsor is the trusted name they meet first. One school per year. Includes year-round Featured presence, custom landing page, dedicated editorial integration. Learn more →"

Pediatric Care section banner copy: "When a newcomer family chooses their child's first doctor, your practice is the one we put in front of them. One pediatric practice per year as Section Sponsor. Year-round presence, custom landing page, dedicated editorial integration. Learn more →"

═══════════════════════════════════════════════
TASK 8 — ADVERTISER PORTAL SHELL
═══════════════════════════════════════════════

Build a basic advertiser dashboard at /advertiser-portal.

### Authentication:
- Supabase magic-link email auth
- Login form at /advertiser-portal/login
- After login, route to /advertiser-portal dashboard

### Dashboard sections:

1. Welcome [Business Name] — pulled from advertiser_accounts table
2. Your Active Package — display the tier name + monthly price
3. Your Active Deployments — list of where they're deployed (placeholder: "Your account is being set up. Your account manager will populate this within 24 hours.")
4. Your Recent Leads — leads from lead_submissions where target_advertiser_id matches their account (real data, populated as leads come in)
5. Contact Your Account Manager — Jason's name, email, phone, "Schedule a call" button

### Implementation notes:
- Auth state managed via Supabase auth helpers
- Real account lookups against advertiser_accounts table
- For now, only Dentistry for Children is in the table — they can log in with the contact email Jason adds
- If user isn't in advertiser_accounts, show: "We don't see an active partnership for this email. Want to learn about becoming a Partner? [link to /advertise]"

═══════════════════════════════════════════════
TASK 9 — STATUS REPORT
═══════════════════════════════════════════════

After all tasks complete, post a STATUS REPORT including:
- Files modified
- Migrations applied (016, 017 if needed)
- Database tables created and seeded
- New components built
- New routes available:
  - /advertise (rebuilt)
  - /partners/dentistry-for-children (new)
  - /advertiser-portal (new)
  - /advertiser-portal/login (new)
- Manual test instructions:
  - Load /advertise on desktop AND mobile
  - Click each tier's "Talk to us" — verify modal opens with correct pre-fill
  - Submit Step 1 only — verify it saves and tags as nurture-sequence
  - Submit Step 1 and Step 2 — verify upgrade to qualified-lead
  - Visit /partners/dentistry-for-children — verify page loads with all content
  - Submit appointment form — verify lead saves and tags correctly
  - Visit /newcomer-guide — verify Start Here cards show real photos (not emoji)
  - Visit any Featured Listing — verify "Send a Message" form works and dual-routes
  - Visit /advertiser-portal/login — verify magic link flow works
- Anything intentionally placeholder or pending
- Any TypeScript errors or warnings

DONE WHEN

- /advertise page is rebuilt with all 4 tiers, visual ad mockups, add-on menu, "biggest community influencer" positioning
- 2-step lead capture modal works from any tier CTA
- Form submissions save to lead_submissions table AND sync to GHL with proper tagging
- Featured Listings on /newcomer-guide have photo galleries (1/5/10/unlimited per tier) — gradient fallback when missing
- "Send a Message" form on every Featured Listing detail page — dual-routes to advertiser AND Mom Insider list
- /partners/dentistry-for-children renders as a complete Tier 4 landing page
- /newcomer-guide Start Here cards show real article hero photos (not emoji)
- Section sponsor banners on /newcomer-guide link to /advertise#tier-4
- Mobile sticky bottom strip on /newcomer-guide: "Want to be Featured? Tap here →"
- /advertiser-portal shell exists with magic-link auth and basic dashboard
- Article detail pages styled to magazine quality (Fraunces headings, DM Sans body, max-width 720px)
- No TypeScript errors
- No console errors

Then STOP. Do not deploy. Do not start additional builds.
