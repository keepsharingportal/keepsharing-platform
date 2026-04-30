# BUILD RUN #5 — /advertise page redesign + Start Here card fix

## Context

Build Run #4 successfully redesigned `/newcomer-guide` with the new magazine-quality design language (navy/sky/sage/terra/gold/cream palette, Fraunces serif, DM Sans, app-style mobile, etc.). That work is committed at `036aaa8`.

Two specific issues remain that this build addresses:

1. **The /advertise page is still on the old brown design system.** It looks like a different brand from /newcomer-guide. When a prospect clicks "Learn more →" on a section sponsor banner, they jump from a polished magazine page to a dated-looking page. This breaks the sales narrative.

2. **The Start Here cards on /newcomer-guide are showing emoji fallbacks** (📋 🏫 🤝) instead of the real article hero photos. The photos exist at `/public/images/family-guide/` and the articles are in the database with hero_image_url set. The cards just aren't rendering the images.

This is a focused, scoped build run. Two tasks. No scope creep.

## OPERATING RULES

Auto-approve all file edits, terminal commands, npm installs. Stop only on (1) unresolvable failure, (2) strategic decision not specified below, (3) destructive operation. Otherwise build.

Before starting, verify these by reading them:
- `/docs/keepsharing-knowledge-base.md` for brand context
- `/src/app/globals.css` for the existing design tokens (--fg-navy, --fg-sky, --fg-terra, etc.)
- `/src/components/family-guide/FeaturedListing.tsx` for the existing component pattern to match
- `/docs/build-run-4/reference/rrp-mobile-feed-design-language.html` for the design language reference

═══════════════════════════════════════════════
TASK 1 — Fix Start Here cards on /newcomer-guide
═══════════════════════════════════════════════

The "If You're New Here, Start Here" section currently shows three article preview cards with emoji fallbacks. Make them display the actual article hero images.

What to do:

1. Read `/src/app/newcomer-guide/page.tsx` to find the Start Here section component
2. The Supabase query that pulls the 3 starter articles must include `hero_image_url` — verify the query selects this field
3. The card component must render `<Image src={article.hero_image_url} ...>` from `next/image` instead of the emoji icon
4. If `hero_image_url` is null OR the image fails to load, fall back to an elegant cream-to-sage gradient (NOT the emoji)

The three articles being surfaced should be:
- `your-first-30-days-in-the-river-region` (use `/images/family-guide/hero-grandfather-mom-daughter.jpg`)
- `choosing-the-right-school-district` (use `/images/family-guide/family-park-frisbee.jpg`)
- `where-to-find-your-people` (use `/images/family-guide/family-park-frisbee.jpg`)

If those articles don't have hero_image_url set in the database, write a small UPDATE migration `015_article_hero_images.sql` that sets them.

Card design (matching the new design system):
- White background, rounded 12-16px, subtle shadow
- Hero image at top, 16:9 ratio, object-cover
- Eyebrow: "ARTICLE" in small caps, --fg-sky color
- Title in Fraunces serif, 20-24px, --fg-navy
- 2-line excerpt in DM Sans, --fg-mid
- "Read more →" in --fg-sky at the bottom
- Hover: lift shadow, slight scale

═══════════════════════════════════════════════
TASK 2 — /advertise page redesign
═══════════════════════════════════════════════

Bring the entire `/advertise` page in line with the new design system.

What to do:

1. Read `/src/app/advertise/page.tsx` to understand the current structure
2. Replace any old brand colors (browns, peach gradients) with the new design tokens (--fg-navy, --fg-sky, --fg-sage, --fg-terra, --fg-gold, --fg-cream)
3. Replace any old fonts with Fraunces (display) + DM Sans (body)
4. Match the visual language from /newcomer-guide:
   - Same top nav (use the PublicHeader component)
   - Same mobile bottom nav (use the MobileNav component if applicable on this route)
   - Same card styling pattern
   - Same button styles (terra fill for primary CTAs, navy outline for secondary)
   - Same section sponsor banner pattern (cream/terra-light card with editorial pitch)

Page sections to redesign:

### Hero section
- Replace the brown rectangle hero with a magazine-style hero
- Background: cream (--fg-cream)
- Eyebrow text: "ADVERTISE WITH RIVER REGION PARENTS" in --fg-terra small caps
- H1 in Fraunces, 48-64px (mobile: 36-44px), --fg-navy: "Get More Local Families Choosing Your Business"
- Subhead in DM Sans 18-20px, --fg-mid: "River Region Parents helps you stay in front of the moms who make buying decisions — so when they're ready, they choose you."
- Body in DM Sans 16px: "Stop guessing with your marketing. Start showing up in the resources local families already trust."
- Primary CTA "Get Advertising Info →" in --fg-terra fill, white text
- Secondary CTA: outline button "See the Family Guide →" linking to /newcomer-guide
- Right side or below: warm hero photo placeholder. Use `/public/images/family-guide/family-park-frisbee.jpg` if no other image is available — same warm-family-energy as /newcomer-guide.

### Why it matters section
- 3-column layout (mobile: stacked) with three value props:
  1. **Trusted Channel** — Eyebrow icon, navy headline, body about how local families have read River Region Parents for 30 years
  2. **Multi-Channel Reach** — Print + Web + Email + Social — wherever local families look for trusted recommendations
  3. **Done For You** — We design, you approve. We schedule, you grow. We report, you decide.

### Three-tier offer section
This is the heart of the page. Show the three placement tiers with magazine-quality cards:

**Tier 1: Annual Founding Partner**
- Premium card design with gold accent border
- "$1,500/month · $18,000/year" pricing
- "ANNUAL · 12 months" eyebrow
- Bullet list of deliverables (full-page premium ad in every issue, year-round Featured Listing on relevant guides, dedicated editorial profile, monthly newsletter feature, quarterly traffic + lead reports, etc.)
- "Best for: established schools, healthcare systems, major real estate firms"
- CTA: "Talk to us about Founding Partner →"

**Tier 2: Annual Featured Partner**
- Standard card with sage accent
- "$750/month · $9,000/year"
- "ANNUAL · 12 months" eyebrow
- Bullet list (regular full-page placements, Featured Listing on relevant guides, monthly social mention, quarterly newsletter feature, quarterly reports)
- "Best for: established advertisers seeking year-round presence"
- CTA: "Talk to us about Featured Partner →"

**Tier 3: Issue Sponsor**
- Card with terra accent
- "$800/month · $9,600/year (per issue)"
- "ISSUE · single guide focus" eyebrow
- Bullet list (own a single issue or guide section: Family Resource Guide, Summer Camp Guide, Birthday Guide, etc., section sponsor banner, full editorial integration, dedicated photography of your business)
- "Best for: businesses that want to dominate one specific guide rather than spread across all"
- CTA: "Talk to us about Issue Sponsorship →"

### Section sponsor opportunity callout
- Cream/terra-light banner, similar to the ones on /newcomer-guide
- "Currently available section sponsorships:" headline
- Brief description of Schools and Pediatric Care section sponsorships in the 2026 Family Resource Guide
- "These are limited to one sponsor per section per year"

### Existing rate card section (preserved)
- Keep the existing rate card details (Full $937/$863/$797/$747/$697 by 1/3/6/12/18mo, Half $637-447, Quarter $453-297, Sixth $327-197) but visually treat it as the "à la carte" option
- Eyebrow: "FLEXIBLE PLACEMENTS"
- Headline: "Single-Issue Placements"
- Body: "Prefer to place a single ad without committing to a year? Here are our standard placement rates."
- Show the rate card as a clean table with --fg-cream background

### The promise section
- Eyebrow: "OUR PROMISE TO YOU"
- Headline in Fraunces: "We don't just sell ads. We deliver families."
- Body: brief paragraph in DM Sans about how RRP works as a partner — quarterly check-ins, real lead reporting, editorial integration that elevates advertisers above competitors

### Final CTA section
- Cream background
- Big Fraunces headline: "Ready to be the name local families trust?"
- Two CTAs: "Get Started →" (terra fill, primary) and "Schedule a Call" (navy outline, secondary)
- Both CTAs trigger the existing booking flow (`/advertise` already has a booking system from Build Run #1 — preserve it)

### Booking widget integration
- The existing SpotPicker component and booking form must continue to work
- Style the SpotPicker to match the new design language
- Form should appear after the CTAs are clicked OR as a section near the bottom
- Preserve all existing GHL integration (don't break the workflow)

═══════════════════════════════════════════════
TASK 3 — Header/footer consistency
═══════════════════════════════════════════════

Verify the PublicHeader component is used on `/advertise` and matches the one on `/newcomer-guide`. If `/advertise` is using a different header component (older Sidebar, etc.), swap it for PublicHeader.

Same for the bottom mobile nav: if applicable, use the MobileNav component for consistency.

═══════════════════════════════════════════════
TASK 4 — Anchor link for section sponsor banners
═══════════════════════════════════════════════

The "Learn more →" CTAs on the section sponsor banners on /newcomer-guide currently link to `/advertise#section-sponsors`. Make sure that anchor exists on the new /advertise page. Place it just above the "Currently available section sponsorships" callout.

═══════════════════════════════════════════════
TASK 5 — Status report
═══════════════════════════════════════════════

After tasks complete, post a STATUS REPORT including:
- Files modified
- Migration 015 status (if it was needed)
- Components that were updated
- Manual test instructions:
  - Load /advertise on desktop AND on phone
  - Load /newcomer-guide and verify Start Here cards now show real photos
  - Click "Learn more →" on a section sponsor banner and verify it scrolls to the right place on /advertise
- Anything intentionally placeholder or pending

DONE WHEN

[ ] /newcomer-guide Start Here cards show real article hero photos (not emoji)
[ ] /advertise page uses cream/navy/sky/sage/terra/gold palette — NO heavy brown
[ ] /advertise hero has magazine-quality typography (Fraunces serif H1)
[ ] /advertise shows three tier cards: Founding Partner, Featured Partner, Issue Sponsor with prices and deliverable bullets
[ ] /advertise still has the existing rate card preserved (as "Single-Issue Placements" section)
[ ] /advertise booking flow still works (SpotPicker + GHL integration intact)
[ ] PublicHeader is consistent across /newcomer-guide and /advertise
[ ] Section sponsor banner "Learn more" CTAs scroll to the right anchor on /advertise
[ ] Mobile responsive
[ ] No TypeScript errors
[ ] No console errors

Then STOP. Do not deploy. Do not start additional builds.
