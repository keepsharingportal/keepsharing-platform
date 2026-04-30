# BUILD RUN #4 — Family Resource Guide design overhaul + real content + app-style mobile

## Context — what changed

Build Run #3 populated the database with real Montgomery business data. The /newcomer-guide page works structurally but feels emotionally dead. Brown is heavy. Cards are empty. There's no warmth, no real life, no sense of "this is curated by people who care."

This build run replaces the design language entirely with the one Jason already designed in his mobile mockup. Real photography. Real article content. Magazine energy. App-style mobile experience.

This is design + content polish. NOT a structural rebuild. The data, the routes, the GHL wiring, the Featured Listings — all stay. We're refreshing how it looks and feels.

## OPERATING RULES

Auto-approve all file edits, terminal commands, npm installs, migrations. Stop only on (1) unresolvable failure, (2) strategic decision not specified below, (3) destructive operation. Otherwise build.

Before writing any code, read these reference files:
- `/docs/keepsharing-knowledge-base.md`
- `/docs/family-guide-2026-content-map.md`
- `/docs/build-run-4/reference/rrp-mobile-feed-design-language.html` — **THIS IS THE DESIGN REFERENCE.** Match its palette, typography, card style, and overall energy. Adapt for desktop where needed.

═══════════════════════════════════════════════
TASK 0 — Stage assets
═══════════════════════════════════════════════

Jason has placed assets in `/docs/build-run-4/`:
- `images/hero-grandfather-mom-daughter.jpg` — multi-generational family in soft sunlight (use for /newcomer-guide hero AND article 1 "First 30 Days")
- `images/family-cafe-newcomer.jpg` — Indian-American family at a cafe (use for article 3 "Establishing Pediatric Care")
- `images/family-park-frisbee.jpg` — kids playing frisbee in park (use for article 2 "Choosing a School", article 4 "Find Your People", article 5 "Saturday Guide")
- `images/rrp-logo-correct.png` — the correct River Region Parents logo lockup
- `articles/family-guide-articles-draft.md` — five short articles in DeAnne's voice, ready to seed

Move these to `/public/images/family-guide/` so Next.js can serve them. Keep filenames the same.

Update the seed file or write a new migration `014_family_guide_articles.sql` to:
1. DELETE existing rows from `guide_articles` where `guide_slug = 'newcomer-guide'` (clean slate)
2. INSERT 5 articles from the draft file (all 5 from `articles/family-guide-articles-draft.md`)
3. Set `published = true` on all 5
4. Set `hero_image_url` to `/images/family-guide/[filename]` per the article notes
5. Set author names per article notes

═══════════════════════════════════════════════
TASK 1 — Replace the design system
═══════════════════════════════════════════════

The mobile mockup at `rrp-mobile-feed-design-language.html` is the canonical design language. Translate it to the Family Resource Guide pages.

Color palette (replace any brown / heavy colors):

```
--navy:        #1a2744   (primary headings, brand)
--sky:         #4a90d9   (secondary brand accent — "Parents" word, links)
--sky-light:   #e8f2fc   (subtle backgrounds)
--sage:        #5a8a6a   (success, schools, sage cards)
--sage-light:  #edf5f0
--terra:       #c4622d   (CTA accents, sponsor banners — but lighter than current brown)
--terra-light: #fdf0eb
--gold:        #d4a843   (Featured tier indicators, premium accents)
--gold-light:  #fdf6e3
--blush:       #e8a0a0   (rare highlight)
--cream:       #faf8f5   (page background)
--white:       #ffffff
--text:        #1a1a1a
--mid:         #666
--dim:         #999
--border:      rgba(0,0,0,0.07)
--shadow:      0 2px 16px rgba(0,0,0,0.08)
--shadow-hover:0 8px 32px rgba(0,0,0,0.12)
```

Typography:
- Display headings: `Fraunces` serif (already in the mobile mockup)
- Body: `DM Sans` sans-serif
- Import via Google Fonts: `Fraunces:ital,wght@0,300;0,500;0,700;0,900;1,300;1,500&family=DM+Sans:wght@300;400;500;600`

Component styling:
- Cards have rounded corners (12-16px)
- Subtle shadows (--shadow), lift on hover (--shadow-hover)
- White background on cards over cream page
- Section titles use Fraunces serif at 22-28px desktop, with optional emoji leading character (📚 Schools, 🩺 Pediatric Care, 🏫 Childcare — pick one per section, optional)

Replace the existing brown-heavy header with:
- White or cream background
- Navy logo type "River Region" + sky "Parents" (matching the correct logo image)
- Subtle bottom border
- Sticky on scroll

═══════════════════════════════════════════════
TASK 2 — Hero section overhaul
═══════════════════════════════════════════════

Current hero is brown rectangle with text. Replace with:

Desktop:
- Full-width hero image (hero-grandfather-mom-daughter.jpg) at 60vh max
- Soft cream gradient overlay (left side darker for text contrast, right side image clear)
- On left side: Eyebrow text "RIVER REGION PARENTS · FAMILY RESOURCE GUIDE" in small caps, navy
- H1 in Fraunces serif: "The Trusted Family Resource for the River Region" (check size — should feel magazine-y, ~48-64px)
- Subtitle (DM Sans): "Whether you're new to Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, or Eastchase — or you've raised your kids here for years — this is where local families turn for the trusted answers."
- Two CTAs: "Start Here →" (sky filled button) and "Browse the Directory" (navy outlined)

Mobile:
- Hero image at top (40vh)
- Below: same eyebrow, H1, subtitle stacked
- CTAs full width

Use Next.js Image component for performance.

═══════════════════════════════════════════════
TASK 3 — "If You're New Here, Start Here" section
═══════════════════════════════════════════════

Current empty cards become magazine-style cards:

Three cards horizontally on desktop, stacked on mobile:
1. "Your First 30 Days Here" — links to /newcomer-guide/articles/your-first-30-days-in-the-river-region
2. "Choosing a School" — links to /newcomer-guide/articles/choosing-the-right-school-district
3. "Finding Your People" — links to /newcomer-guide/articles/where-to-find-your-people

Each card:
- Hero image (use the article's hero_image_url, cropped to 16:9)
- Eyebrow: "ARTICLE" in small caps, sky color
- Title in Fraunces, 20-24px
- 2-3 line excerpt in DM Sans
- "Read more →" in sky

═══════════════════════════════════════════════
TASK 4 — Section sponsor banners — REDESIGN
═══════════════════════════════════════════════

Current: heavy brown rectangle with text "section sponsorship available"

New: lighter, magazine-quality banner that doesn't overwhelm.

When NO sponsor exists (current state):
- Background: --terra-light (very light terracotta tint)
- Border: 1px solid --terra
- Eyebrow: "SECTION SPONSORSHIP AVAILABLE" in --terra, small caps
- Headline (Fraunces, 18-22px, --navy): "Be the first name local families see when they're choosing a school for their kids"
- Subtext (DM Sans, --mid): "Become the official Schools sponsor for the River Region's Family Resource Guide. Year-round visibility across print, web, email, and social."
- CTA: "See partnership options →" (terra filled button)

When a sponsor IS sold (future state — pass `sponsorName` prop):
- Background: --cream (lighter)
- "Schools section sponsored by" eyebrow
- Sponsor logo (large)
- Sponsor's editorial paragraph (250-word block)
- Subtle "Visit website" / "Learn about [Sponsor]" CTA

═══════════════════════════════════════════════
TASK 5 — Featured Listing component — REDESIGN
═══════════════════════════════════════════════

Current Featured Listings have a gold border, but the photo area is missing because we have no photos yet.

New Featured Listing card (desktop):
- White card with subtle shadow
- Top: cover photo OR elegant placeholder
  - When photo missing: gradient placeholder using --sage-light → --sky-light, with the business's first 1-2 letters in Fraunces serif at 64px in the center, --sage color. Looks intentional, not broken.
- Gold ribbon corner badge: "FEATURED PARTNER" in tiny small caps
- Business name in Fraunces serif, 22px, --navy
- Address with location pin icon in --mid
- Editorial blurb in italic Fraunces, 16px (the "What families say" line — only show if present)
- Description in DM Sans, 14px, --text
- Action row: phone (call icon + number) | website (external icon + "Visit") | "Full profile →" link to listing detail page
- Optional: "Currently accepting new patients" green pill if `accepting_new_patients = true`
- Optional: "Offers military discount" gold pill if `offers_military_discount = 'YES'`

Free Listings (smaller, denser):
- Single line layout
- Business name in DM Sans semibold
- One-line description
- Phone + Website links

Enhanced Listings (middle tier):
- Two-line layout
- Business name in Fraunces, 16px
- Description, hours
- Phone + Website + small "Profile" link

═══════════════════════════════════════════════
TASK 6 — Section structure updates
═══════════════════════════════════════════════

Each major group section gets:
1. Group title (Fraunces, ~32px, --navy, with optional emoji)
2. "Full directory →" link in top right
3. Section sponsor banner if applicable (Schools and Pediatric Care for now)
4. Article preview card (if section has a featured article)
5. Featured Listings (3 max, expanded view)
6. Sub-sections (subcategories) — Free Listings shown more compactly
7. "View all X listings in [Section] →" link at bottom

Render groups in this order (skip groups with no listings yet):
1. Schools
2. Pediatric Care
3. Healthcare
4. Childcare & Preschool
5. Faith Communities (if seeded — currently empty placeholder)
6. Family Activities
7. Sports & Recreation
8. Food & Dining
9. Date Nights & Adult Time (if listings exist)
10. Day Trips & Family Getaways (if listings exist)
11. Family Shopping (if listings exist)
12. Mom Self-Care (if listings exist)
13. Family Services (if listings exist)
14. Community & Connection
15. Senior & Multi-Generational (if listings exist)

Sections that ONLY have research placeholders should NOT render publicly — they show as "Coming soon" only in admin views.

═══════════════════════════════════════════════
TASK 7 — Mobile experience: app-feel
═══════════════════════════════════════════════

Mobile (≤768px) should feel like the rrp-mobile-feed mockup, NOT a desktop site squished.

Specifically:
- Sticky top nav: white background, navy "River Region" + sky "Parents" logo, location pin "Montgomery, AL" in sky on right, search and bell icons
- Below nav: horizontal scrolling pill filter strip (For You / Schools / Healthcare / Activities / Food / etc.) — same as the mockup
- Below filters: featured article hero card (BIG — full width, image background, gradient overlay, white text)
- Then the scrollable content matching the desktop sections but in single-column card view
- Bottom navigation bar (sticky):
  - Home (current page)
  - Events (links to /events or future calendar)
  - Guides (links to all guides — for now, just /newcomer-guide)
  - Spotlights (links to /spotlights or shows a "coming soon" panel)
  - Search (opens a search overlay)

The bottom nav uses the same icon style and sky/dim color states as the mockup.

Spacing on mobile is generous — 16px page gutters, 12px between cards, breathing room.

═══════════════════════════════════════════════
TASK 8 — Logo update everywhere
═══════════════════════════════════════════════

Current site likely uses an old logo OR text. Replace with the correct logo at `/images/family-guide/rrp-logo-correct.png` everywhere it appears:
- Top navigation (both desktop and mobile)
- Footer
- Print stylesheet (if applicable)
- Email templates (we'll handle separately)

The logo is the lockup with navy "River Region" and bold dark "Parents" plus the small location pin and tagline. Use the full logo on desktop. On mobile (cramped nav), can use just "River Region [sky]Parents[/sky]" text in Fraunces serif as a fallback if the image is too wide.

═══════════════════════════════════════════════
TASK 9 — Listing detail page polish
═══════════════════════════════════════════════

Update `/newcomer-guide/listings/[slug]/page.tsx`:

For Featured Listings:
- Magazine-quality detail page
- Hero (cover photo or placeholder gradient with business initial)
- Business name in Fraunces, 36px, navy
- Eyebrow: category + subcategory ("Pediatric Care · Pediatric Dentists & Orthodontists")
- Editorial blurb (large Fraunces italic quote)
- Two-column layout: left = description, story, hours, services. Right = sticky contact card with click-to-call, click-to-website, click-to-email, address with mini-map link, and "Send a message" form (collects to advertiser_leads table)
- Below: "Other Featured Partners in this section" carousel (3 other Featured Listings from same group)
- LocalBusiness JSON-LD schema (already there per Run #2 — keep)

For Free / Enhanced Listings:
- Lighter detail page
- Same shape but less ornate

═══════════════════════════════════════════════
TASK 10 — Article detail page polish
═══════════════════════════════════════════════

Update `/newcomer-guide/articles/[slug]/page.tsx`:

- Eyebrow: "FAMILY RESOURCE GUIDE · ARTICLE"
- Title in Fraunces, 48px, navy
- Author byline + reading time estimate
- Hero image full-width, 50vh
- Article body in DM Sans 18px, line-height 1.7, max-width 720px (centered)
- Body uses Fraunces serif for inline `<h2>` and `<h3>` headings within the article
- Section sponsor banner at top if article has section_sponsor_advertiser_id (otherwise show "this section is sponsored by" placeholder)
- Bottom: "Featured in this article" — list of relevant Featured Listings
- Bottom: "More in [Section]" — 3 other articles from same guide
- Newsletter signup CTA at bottom: "Get the Family Resource Guide updates monthly" — connects to GHL Newcomer-Issue-2026 tag

═══════════════════════════════════════════════
TASK 11 — Status report
═══════════════════════════════════════════════

After tasks complete, post a STATUS REPORT including:
- Files modified (list)
- Migration 014 status (if needed)
- Image files placed in /public/images/family-guide/
- Article seed status (5 articles inserted into guide_articles)
- New CSS variables / design tokens defined
- Components updated: HeroSection, ArticleCard, FeaturedListing, EnhancedListing, FreeListing, SectionSponsorBanner
- Mobile-specific routes / layouts created
- Manual test instructions for Jason (load /newcomer-guide on desktop AND on phone — should feel completely different in tone from before)
- Anything intentionally placeholder or pending

DONE WHEN

[ ] /newcomer-guide loads with new palette (cream/navy/sky/sage/terra/gold) — NO heavy brown
[ ] Hero image (hero-grandfather-mom-daughter.jpg) renders at top of /newcomer-guide
[ ] All 5 articles are in the database, published, with correct hero images
[ ] All 5 articles render at /newcomer-guide/articles/[slug] with magazine-quality layout
[ ] "If You're New Here, Start Here" section shows three real article preview cards with images
[ ] Section sponsor banners use the new lighter design (cream/terra-light, not heavy brown)
[ ] Featured Listings show the gradient initial-letter placeholder when no photo exists
[ ] Featured Listing component uses Fraunces serif for business names, gold "FEATURED PARTNER" ribbon
[ ] Logo at top of nav is the correct one (or text fallback styled like the logo)
[ ] Mobile (≤768px) feels like an app — bottom nav, pill filter strip, big article cards
[ ] Bottom nav on mobile has 5 tabs: Home / Events / Guides / Spotlights / Search
[ ] Listing detail pages look like magazine profiles, not database records
[ ] Article detail pages have proper hierarchy, hero, byline, body styled with Fraunces headings + DM Sans body
[ ] No TypeScript errors
[ ] No console errors

Then STOP. Do not deploy.
