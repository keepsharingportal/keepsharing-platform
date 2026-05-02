# BUILD RUN #13 — URL Restructure + Magazine Table of Contents + Each Guide as Magnificent Issue + Calendar System

**This build refactors the guide architecture from "hub + sub-guides" to "Local Guides spread + 9 destination guides, each a magnificent editorial issue." Plus builds the Calendar System with list and gallery views, image strategy, and contextual filters. Plus builds the reusable Guide Showcase component that can appear in multiple density modes across the platform.**

═══════════════════════════════════════════════════════
## CRITICAL FRAMING
═══════════════════════════════════════════════════════

Build Run #12 shipped the guide architecture but with the wrong mental model. It built `/family-resource-guide` as a hub that lists all guides as sub-pages. That's wrong. Each guide should be its own destination — its own URL, its own magnificent editorial issue.

This build corrects the architecture WITHOUT losing the data or design system already built. Migration 028 stays. The 601 imported listings stay. The editorial design tokens stay. What changes: URL structure, page composition, navigation, and the Family Resource Guide gets renamed-and-promoted to top-level.

Plus this build delivers Calendar — its own destination at `/calendar` with list view, gallery view, smart filters, and image strategy.

**STRICT TASK ORDER. STOP IF BLOCKED. NO PUSHING THROUGH.**

If a task fails after 3 attempts, document and STOP that task. Move to next. Truthful incomplete > confidently broken.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES
═══════════════════════════════════════════════════════

- **"We Help Your Future Customers Find You."** Tagline locked.
- **Each guide is its own magnificent destination.** Not a sub-section. Each has editorial articles, insider tips, listings organized by category, calendar peek of related events, newsletter signup, and a magazine-quality experience.
- **Two entry paths matter equally.** (1) Direct link from a friend's text — mom lands on the specific guide and finds what she needs. (2) Main URL exploration — mom is shown what's available beautifully and discovers content she didn't know about.
- **The "Local Guides" page IS a magazine table of contents spread.** Editorial intro, 9 guide cards each with hero image and pitch, featured articles, calendar peek, newsletter signup. NOT a meta-hub.
- **The Guide Showcase component is reusable everywhere.** Same component renders 9 cards on /local-guides, 3 cards on homepage, 2 contextual cards inside an article, mini sidebar on individual guide pages. One component, infinite placements.
- **Calendar is a destination, not a feature.** /calendar deserves its own beautiful experience with list and gallery views. Moms come back weekly. It's the killer feature.
- **The 23 Points formula governs every conversion surface.** Niche, emotional, benefit-driven. Every guide pitch sells WHY to click.
- **Cross-weaving is the killer feature.** Every page links to relevant content. Articles link to guides. Guides link to calendar. Calendar links to listings. Listings link to related guides. The platform feels like a network.
- **Mobile-first.** Every page works beautifully on a phone. Sticky search. Smart filters. NO bottom nav within guide context.
- **Fast. Helpful. Easy. Beautiful.** The four-word lens.

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve: file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, content writing, image fetches.

STOP only on:
1. Unresolvable build/runtime errors after 3 attempts on a single task
2. Strategic decisions not specified in this prompt
3. Destructive operations (dropping production tables with real data)
4. Missing credentials in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md`
- `/docs/marketing-formula/23-point-proven-ad-formula.md`
- `/docs/editorial-design-system.md` (created in Build Run #12)
- `/src/app/family-resource-guide/page.tsx` (current hub — TO BE REPLACED with /local-guides)
- `/src/app/family-resource-guide/[slug]/page.tsx` (current dynamic guide page — keep logic, restructure URLs)
- `/src/components/editorial/` (existing editorial components from #12)

Existing data:
- 601 guide_listings rows across 7 guide types (private-school, childcare, healthy-kids, summer-fun, birthday-party, afterschool, special-needs) — newcomer guide listings will be seeded fresh
- 113 calendar_events rows for May 2026
- 9 guide_types in database (newcomer, private-school, summer-camp, childcare, healthy-kids, summer-fun, birthday-party, afterschool, special-needs)

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

```sql
SELECT 
  (SELECT COUNT(*) FROM guide_types) as guide_types,
  (SELECT COUNT(*) FROM guide_listings) as guide_listings,
  (SELECT COUNT(*) FROM calendar_events) as calendar_events;
```

Should return: 9 guide_types, 601 guide_listings, 113 calendar_events. If not, stop and document.

```bash
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

If errors, stop and fix.

═══════════════════════════════════════════════════════
## TASK 1 — URL RESTRUCTURE
═══════════════════════════════════════════════════════

Refactor the guide URLs from "/family-resource-guide/[slug]" pattern to flat top-level destination pattern.

### 1A — New URL structure

Each guide gets its own top-level URL:

| Guide | Old URL | New URL |
|-------|---------|---------|
| Family Resource Guide (renamed Newcomer) | /family-resource-guide/newcomer | /family-resource-guide |
| Private School Guide | /family-resource-guide/private-school | /private-school-guide |
| Summer Camp Guide | /family-resource-guide/summer-camp | /summer-camp-guide |
| Childcare Guide | /family-resource-guide/childcare | /childcare-guide |
| Healthy Kids Guide | /family-resource-guide/healthy-kids | /healthy-kids-guide |
| Summer Fun Guide | /family-resource-guide/summer-fun | /summer-fun-guide |
| Birthday Party Guide | /family-resource-guide/birthday-party | /birthday-party-guide |
| After-School Guide | /family-resource-guide/afterschool | /afterschool-guide |
| Special Needs Guide | /family-resource-guide/special-needs | /special-needs-guide |
| Local Guides (magazine TOC) | /family-resource-guide (hub) | /local-guides |

Listings move accordingly:
- `/family-resource-guide/healthy-kids/listings/dentistry-for-children` → `/healthy-kids-guide/listings/dentistry-for-children`

### 1B — Migration approach

Don't break links from the magazine, social shares, or external references. Build NEW pages at the new URLs. Keep OLD URLs working via redirects. Eventually deprecate old URLs.

### 1C — Database update for guide_types

Update guide_types to add the URL slug each guide should use:

```sql
ALTER TABLE guide_types 
ADD COLUMN IF NOT EXISTS url_slug TEXT;

UPDATE guide_types SET url_slug = 'family-resource-guide' WHERE slug = 'newcomer';
UPDATE guide_types SET url_slug = 'private-school-guide' WHERE slug = 'private-school';
UPDATE guide_types SET url_slug = 'summer-camp-guide' WHERE slug = 'summer-camp';
UPDATE guide_types SET url_slug = 'childcare-guide' WHERE slug = 'childcare';
UPDATE guide_types SET url_slug = 'healthy-kids-guide' WHERE slug = 'healthy-kids';
UPDATE guide_types SET url_slug = 'summer-fun-guide' WHERE slug = 'summer-fun';
UPDATE guide_types SET url_slug = 'birthday-party-guide' WHERE slug = 'birthday-party';
UPDATE guide_types SET url_slug = 'afterschool-guide' WHERE slug = 'afterschool';
UPDATE guide_types SET url_slug = 'special-needs-guide' WHERE slug = 'special-needs';

-- Update display name for the renamed guide
UPDATE guide_types SET 
  display_name = 'Family Resource Guide',
  short_description = 'For families new to the River Region — and anyone who wants to know it better',
  hub_intro_paragraph = 'Whether you''re fresh to the River Region or you''ve lived here forever, this is the guide for finding the local rhythms only insiders know. Schools, doctors, neighborhoods, where to take cousins visiting from out of town — start here.'
WHERE slug = 'newcomer';
```

Save as `supabase/migrations/030_url_slugs_and_rename.sql`.

### 1D — Build redirects

Add to `next.config.ts`:

```typescript
async redirects() {
  return [
    {
      source: '/family-resource-guide/newcomer',
      destination: '/family-resource-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/newcomer/:path*',
      destination: '/family-resource-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/private-school',
      destination: '/private-school-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/private-school/:path*',
      destination: '/private-school-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/summer-camp',
      destination: '/summer-camp-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/summer-camp/:path*',
      destination: '/summer-camp-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/childcare',
      destination: '/childcare-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/childcare/:path*',
      destination: '/childcare-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/healthy-kids',
      destination: '/healthy-kids-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/healthy-kids/:path*',
      destination: '/healthy-kids-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/summer-fun',
      destination: '/summer-fun-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/summer-fun/:path*',
      destination: '/summer-fun-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/birthday-party',
      destination: '/birthday-party-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/birthday-party/:path*',
      destination: '/birthday-party-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/afterschool',
      destination: '/afterschool-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/afterschool/:path*',
      destination: '/afterschool-guide/:path*',
      permanent: true,
    },
    {
      source: '/family-resource-guide/special-needs',
      destination: '/special-needs-guide',
      permanent: true,
    },
    {
      source: '/family-resource-guide/special-needs/:path*',
      destination: '/special-needs-guide/:path*',
      permanent: true,
    },
  ];
}
```

The OLD `/family-resource-guide` (was the hub) does NOT redirect — it becomes the new Family Resource Guide content (renamed Newcomer Guide).

### 1E — DONE WHEN

[ ] Migration 030 applied
[ ] guide_types has url_slug populated for all 9 rows
[ ] "Newcomer Guide" renamed to "Family Resource Guide"
[ ] next.config.ts has all redirects
[ ] Old URLs (/family-resource-guide/healthy-kids, etc.) redirect to new URLs

═══════════════════════════════════════════════════════
## TASK 2 — REUSABLE GUIDE SHOWCASE COMPONENT
═══════════════════════════════════════════════════════

Build a single component that renders guide promotional cards in multiple density modes. Used everywhere: /local-guides full grid, homepage strip, in-article embeds, sidebars.

### 2A — GuideShowcase component

Build `/src/components/editorial/GuideShowcase.tsx`:

```typescript
'use client';

import Image from 'next/image';
import Link from 'next/link';

interface GuideShowcaseProps {
  guides: Array<{
    slug: string;
    url_slug: string;
    display_name: string;
    short_description: string;
    hero_image_url?: string;
    listing_count?: number;
    pitch?: string; // longer marketing copy for full mode
  }>;
  density: 'compact' | 'standard' | 'full';
  layout: 'grid' | 'horizontal-strip';
  title?: string;
  eyebrow?: string;
  showCounts?: boolean;
}

export function GuideShowcase({ 
  guides, 
  density, 
  layout, 
  title, 
  eyebrow, 
  showCounts = true 
}: GuideShowcaseProps) {
  // Three rendering modes:
  // 'compact' — small card with just image, name, count
  // 'standard' — image, name, short description, count, "Browse →"
  // 'full' — magazine-quality card with hero image, eyebrow, name, full pitch, count, prominent CTA
  
  // Two layout modes:
  // 'grid' — responsive 1/2/3 column grid
  // 'horizontal-strip' — horizontal scrolling on mobile, fits 3-4 wide on desktop
  
  // ... full implementation with proper editorial styling
}
```

### 2B — Curated guide imagery

Each guide needs a hero image that captures its essence. Either:

**Option A — Curated Unsplash photos.** Picked carefully, warm, diverse, river-region-appropriate. Save to `/public/images/guides/`:
- newcomer-hero.jpg → family at neighborhood park, warm afternoon light
- private-school-hero.jpg → kids in school uniform with backpacks
- summer-camp-hero.jpg → kids around campfire or outdoor activity
- childcare-hero.jpg → toddler at preschool with caring teacher
- healthy-kids-hero.jpg → mom with child at pediatrician's office
- summer-fun-hero.jpg → family at outdoor festival or pool
- birthday-party-hero.jpg → birthday cake moment with kids
- afterschool-hero.jpg → kids doing homework or art project
- special-needs-hero.jpg → inclusive family activity, joy-focused

Source from Unsplash (`https://unsplash.com/`) using royalty-free family photos. Search terms like "family Alabama", "kids preschool", "birthday party". Download, save locally, attribute in `/docs/photo-credits.md`.

**Option B — Solid color cards with icons (fallback).**
If image sourcing fails, use the existing icon approach from Build Run #12 with each guide getting its own warm accent color background.

Apply images via guide_types.hero_image_url:

```sql
UPDATE guide_types SET hero_image_url = '/images/guides/newcomer-hero.jpg' WHERE slug = 'newcomer';
UPDATE guide_types SET hero_image_url = '/images/guides/private-school-hero.jpg' WHERE slug = 'private-school';
-- ... etc for all 9
```

### 2C — Marketing pitches per guide

Each guide needs a 1-2 sentence pitch (longer than short_description) that sells WHY this guide matters. Add to guide_types:

```sql
ALTER TABLE guide_types ADD COLUMN IF NOT EXISTS pitch TEXT;

UPDATE guide_types SET pitch = 
  'New here? This is your map. Schools, pediatricians, neighborhood vibes, the festivals worth driving to, the parks worth bookmarking — everything moms wish someone had told them in their first month.'
WHERE slug = 'newcomer';

UPDATE guide_types SET pitch = 
  'Choosing a school is one of the biggest decisions families make. Compare every private and parochial school in the River Region side by side — tuition, mission, leadership, what makes each one distinct.'
WHERE slug = 'private-school';

UPDATE guide_types SET pitch = 
  'Summer goes faster than you think. Day camps, overnight camps, themed weeks, sports specialties — start here in February so the best slots don''t fill before you choose.'
WHERE slug = 'summer-camp';

UPDATE guide_types SET pitch = 
  'Finding childcare you trust takes time and good information. Compare hours, ratios, philosophies, meals, and what each center actually does best — research we''ve done so you don''t have to.'
WHERE slug = 'childcare';

UPDATE guide_types SET pitch = 
  'From first dental visits to specialty referrals — pediatric care that fits your family. Providers across the River Region serving kids from birth through teens, with the details parents actually need.'
WHERE slug = 'healthy-kids';

UPDATE guide_types SET pitch = 
  'When school lets out, the boredom kicks in. Festivals, classes, splash pads, art camps, sports clinics, lazy afternoon ideas — everything to keep summer feeling like summer.'
WHERE slug = 'summer-fun';

UPDATE guide_types SET pitch = 
  'From toddler bashes to teen celebrations — venues, entertainers, cake artists, and party rentals that make hosting easier and the day unforgettable.'
WHERE slug = 'birthday-party';

UPDATE guide_types SET pitch = 
  'After the bell rings, the real learning starts. Programs and activities that fill the afternoons with art, sports, science, music, and friendship — for kids of every age and interest.'
WHERE slug = 'afterschool';

UPDATE guide_types SET pitch = 
  'A trusted directory of resources, providers, and organizations supporting families across the River Region. Real local connections, not just a list of phone numbers.'
WHERE slug = 'special-needs';
```

### 2D — DONE WHEN

[ ] GuideShowcase component built with 3 density modes and 2 layout modes
[ ] Hero images sourced and saved to /public/images/guides/ (or fallback colors documented)
[ ] guide_types.hero_image_url populated
[ ] guide_types.pitch populated for all 9 guides
[ ] Component verified rendering correctly in test

═══════════════════════════════════════════════════════
## TASK 3 — /local-guides MAGAZINE TABLE OF CONTENTS PAGE
═══════════════════════════════════════════════════════

The new "Local Guides" landing page that introduces the entire resource ecosystem.

### 3A — Build /src/app/local-guides/page.tsx

Page composition:

1. **EditorialHeader** with sticky nav
2. **EditorialHero** with strong photography:
   - Eyebrow: "RIVER REGION PARENTS LOCAL GUIDES"
   - Headline: "Local Resources. Real Recommendations. Made For Moms Like You."
   - Lead: "Nine guides covering the full arc of family life in the River Region. Built by the families who actually live here. Updated annually."
   - Hero image: warm photo of moms reading the magazine OR a beautiful River Region landmark photo
3. **Publisher's note** (subtle, italicized, attributed to Jason or DeAnne):
   - 2-3 sentences about why these guides exist and what makes them different from a Google search
4. **GuideShowcase component** in 'full' mode, 'grid' layout — all 9 guides with hero images, pitches, listing counts
5. **Section break ornament**
6. **Featured Articles section** — pulling top 4-6 articles from guide_articles across all guides, displayed as editorial cards with hero images
7. **Calendar peek section** — "What's happening this week" — pulls next 5 events from calendar_events, displayed compact
8. **Section break ornament**
9. **NewsletterSignup** with the 23 Points formula treatment — niche headline, emotional pitch, specific benefits, social proof
10. **EditorialFooter**

### 3B — DONE WHEN

[ ] /local-guides page renders all 9 guide cards in magazine quality
[ ] Hero with strong typography and photography
[ ] Publisher's note in editorial style
[ ] Featured articles section pulls real content
[ ] Calendar peek pulls upcoming events
[ ] Newsletter signup integrated
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 4 — INDIVIDUAL GUIDE PAGES AS MAGNIFICENT ISSUES
═══════════════════════════════════════════════════════

Each guide gets its own URL and its own magnificent destination experience. NOT just a listings list.

### 4A — Build dynamic guide page route

Build `/src/app/[guideSlug]/page.tsx` with route matching:
- /family-resource-guide
- /private-school-guide
- /summer-camp-guide
- /childcare-guide
- /healthy-kids-guide
- /summer-fun-guide
- /birthday-party-guide
- /afterschool-guide
- /special-needs-guide

Use generateStaticParams() to pre-render all 9 routes from guide_types where url_slug matches the route segment.

For non-matching slugs (e.g., /random-page), return notFound() so Next.js doesn't try to render unrelated pages.

### 4B — Page composition for each guide

Each guide page contains:

1. **EditorialHeader** with sticky search and "Back to Local Guides" link
2. **EditorialHero** with guide-specific photography:
   - Eyebrow: e.g., "PRIVATE SCHOOL GUIDE 2026"
   - Headline: guide.display_name
   - Lead: guide.hub_intro_paragraph
   - Hero image: guide.hero_image_url
3. **Editorial Intro paragraph** — 2-3 paragraphs of insider insight specific to this guide topic. NOT generic. (Seeded for now via seed file in Task 5; eventually editable in admin.)
4. **Featured Articles section** — pulls latest articles from guide_articles where category matches this guide. Editorial card layout.
5. **CategoryFilterStrip** — sticky filter bar showing categories within this guide (uses existing component from Build Run #12)
6. **Listings grid** — uses ListingCard component, sorted with featured listings first, paginated if 50+
7. **Mid-page AdSlot** — premium editorial ad placement for this guide
8. **"Insider Tips" section** — 3-5 bullet points of helpful local context. Magazine sidebar style. (Seeded; editable later.)
9. **Calendar peek** — "Coming up that's relevant to [Guide Topic]" — events from calendar_events filtered by relevance
10. **CrossLinkBlock** — "Also useful for [related guides]" with 2-3 contextual GuideShowcase compact cards
11. **Mom-to-Mom recommendations** — 2-3 quotes from reader_submissions related to this guide topic (when seeded)
12. **NewsletterSignup** — guide-specific signup with relevant tag (e.g., source='guide-private-school', tag='interest-private-school')
13. **EditorialFooter**

### 4C — Update GuideSpecificFields component

The existing component from Build Run #12 needs updating to handle the column rename and additional guide types properly. Verify it renders correctly for all 9 guide types based on guide_data JSONB content.

### 4D — DONE WHEN

[ ] Dynamic route handles all 9 guide slugs
[ ] Each guide page renders with full magnificent issue layout
[ ] Editorial intro, featured articles, listings, ad slots, insider tips, calendar peek, cross-links, mom-to-mom, newsletter all present
[ ] Mobile responsive
[ ] Featured listings appear first in listings grid
[ ] Old URLs redirect properly

═══════════════════════════════════════════════════════
## TASK 5 — SEED EDITORIAL CONTENT FOR EACH GUIDE
═══════════════════════════════════════════════════════

Each guide needs starter editorial content — the intro paragraphs and insider tips — so the pages don't feel empty when first visited.

### 5A — Migration 031: editorial content fields

```sql
ALTER TABLE guide_types
ADD COLUMN IF NOT EXISTS editorial_intro TEXT,
ADD COLUMN IF NOT EXISTS insider_tips JSONB DEFAULT '[]';
```

### 5B — Seed editorial intros

For each guide, write 2-3 paragraphs of editorial intro that sets context for someone landing on the page. NOT promotional copy — actual helpful insight. Apply via SQL UPDATE.

Example for newcomer/family-resource:

```sql
UPDATE guide_types SET 
  editorial_intro = 'The River Region is home to about 380,000 people across Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, and the surrounding communities. It''s a place where neighbors still wave from porches, where Sunday lunch runs past 2pm, and where every mom eventually figures out which gas station has the best biscuits.

This guide is for newcomers, but honestly — it''s for anyone who wants to know the River Region the way locals do. The schools that don''t advertise much but families love. The pediatricians who answer their own phones after hours. The Saturday-morning ritual at the farmers'' market that just makes life feel right.

We''ve organized this guide by what families actually need most: schools, doctors, childcare, things to do, neighborhoods to know. Everything is curated, updated annually, and reflects what real River Region moms recommend. Not Google. Not Yelp. Real recommendations from real families.'
WHERE slug = 'newcomer';
```

Write similar substantial intros for each of the other 8 guides. Each should be 2-3 paragraphs, conversational tone, demonstrating local expertise and warmth. Specific to the guide topic.

### 5C — Seed insider tips

For each guide, 4-6 insider tips. Magazine sidebar-style. Specific, actionable, demonstrably local.

Example for newcomer:

```sql
UPDATE guide_types SET insider_tips = '[
  {"tip": "The Montgomery Zoo has the best summer evenings — go after 5pm when temperatures drop and the animals get active again."},
  {"tip": "Pike Road has the strongest sense of community for newcomers — the moms here will absorb you into their group within a month."},
  {"tip": "If your kid is school-age, start school tours by January for the next school year. The good ones fill up."},
  {"tip": "Saturday morning at the Montgomery Curb Market is a River Region rite of passage. Go early, bring cash, talk to vendors."},
  {"tip": "Hospital choice matters more than people realize. Ask any local mom whose obstetrician she used and why — the answers will surprise you."},
  {"tip": "Saint James, Trinity, and Macon-East are the three private schools most often mentioned, but each has a very different culture. Tour all three before deciding."}
]'::jsonb
WHERE slug = 'newcomer';
```

Write similar tips for each of the 8 other guides. Each tip should be 1-2 sentences, specific, useful, and feel like it came from a local mom.

### 5D — Seed featured articles for guides

If guide_articles table has any approved articles, ensure each one has a category that matches a guide_type_slug so the "Featured Articles" sections on guide pages can populate.

For guides with no matching articles yet, the Featured Articles section either:
- Shows a graceful empty state ("More stories coming soon")
- OR doesn't render at all

### 5E — DONE WHEN

[ ] Migration 031 applied (editorial_intro, insider_tips columns)
[ ] All 9 guides have substantial editorial_intro paragraphs
[ ] All 9 guides have 4-6 insider_tips
[ ] guide_articles category matching verified

═══════════════════════════════════════════════════════
## TASK 6 — CALENDAR SYSTEM
═══════════════════════════════════════════════════════

Build the Calendar destination at /calendar with list view, gallery view, and smart filters.

### 6A — Build /src/app/calendar/page.tsx

Page composition:

1. **EditorialHeader** with sticky nav and search
2. **EditorialHero** for calendar:
   - Eyebrow: "RIVER REGION FAMILY CALENDAR"
   - Headline: "What's Happening This Week"
   - Lead: "From festivals to story times, sports games to art workshops — everything happening for River Region families. Updated daily by our editors and submitted by local organizations."
3. **Filter bar** (sticky):
   - Date range selector: "Today" / "This Weekend" / "This Month" / "Custom"
   - Free/Paid toggle
   - Age range filter
   - Indoor/Outdoor filter
   - Category multi-select
   - Search by event name or location
4. **View toggle**: List view | Gallery view (button group, persisted in URL state)
5. **Calendar content area** — switches based on toggle:
   - **List view**: events grouped by date, each event is a clean line with time, title, location, click-to-expand
   - **Gallery view**: card grid with hero images, event details, prominent visual hierarchy
6. **Mid-page AdSlot** — calendar-specific premium placement
7. **CrossLinkBlock** — "Looking for something specific? Browse [related guides]"
8. **NewsletterSignup** — "What's Happening This Week" newsletter, source='calendar', tag='interest-calendar'
9. **EditorialFooter**

### 6B — List view component

Build `/src/components/calendar/CalendarListView.tsx`:

- Events grouped by date with date headers in serif Fraunces ("Saturday, May 2, 2026")
- Each event renders as compact line:
  - Time pill on left (e.g., "10:00 AM" or "All day")
  - Event title (bold, click-to-expand)
  - Location (small, muted)
  - Cost badge (if paid) or "Free" tag (if free)
  - Click expands inline to show full description, address, phone, website link, "Add to Calendar" button
- Today's events highlighted with accent border
- Sticky date headers when scrolling

### 6C — Gallery view component

Build `/src/components/calendar/CalendarGalleryView.tsx`:

- Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- Each card:
  - Hero image (16:9 aspect, with date pill overlaid)
  - Event title (h3 serif)
  - Time + location (small)
  - Short description (truncated)
  - Cost badge
  - Click → opens full event detail page
- Featured events (paid sponsored placements) get larger cards or different styling
- Cards with no image fall back to category-themed gradient backgrounds with category icon

### 6D — Event image strategy

Three layers:

1. **Submitted images** when event organizers submit through the form (preferred)
2. **Auto-fetched OG images** when website URL is provided — fetch the og:image meta tag from the event's website
3. **Category fallback images** — curated stock images by category saved to `/public/images/calendar-categories/`

Add to migration 031:

```sql
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS og_image_fetched BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS og_image_fetch_attempted_at TIMESTAMPTZ;
```

Build `/src/lib/og-image-fetcher.ts`:

```typescript
export async function fetchOGImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'KeepSharing/1.0 (+https://keepsharing.com)' },
      signal: AbortSignal.timeout(5000)
    });
    const html = await response.text();
    const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}
```

Build `/scripts/fetch-event-images.ts`:

For events without hero_image_url but with a website, attempt to fetch the OG image. Run as background script:

```bash
npm run fetch-event-images
```

### 6E — Build event detail page

Build `/src/app/calendar/events/[slug]/page.tsx`:

- EditorialHeader
- Hero image (full-width)
- Date and time prominently displayed
- Event title (display size)
- Description (formatted)
- Details sidebar: location with map link, cost, website, contact
- "Add to Calendar" button (generates .ics download)
- "Share this event" buttons
- Related events from the same organizer or similar category
- EditorialFooter

### 6F — Build /src/app/api/calendar/events/route.ts

API endpoint for fetching calendar events with filter/pagination support. Used by both the list and gallery views.

### 6G — DONE WHEN

[ ] /calendar page renders with hero, filters, view toggle
[ ] List view groups events by date, expandable details
[ ] Gallery view renders cards with images
[ ] Filter bar works (date, free/paid, age, indoor, category, search)
[ ] View toggle persists in URL
[ ] /calendar/events/[slug] event detail pages render
[ ] OG image fetcher utility works
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 7 — NAVIGATION UPDATES
═══════════════════════════════════════════════════════

Update site navigation to include the new structure.

### 7A — EditorialHeader nav menu

Update `/src/components/editorial/EditorialHeader.tsx` to include:

- Logo (River Region Parents) on left
- Main nav (right side, desktop):
  - **Local Guides** (dropdown menu listing all 9 guides with their hero image thumbnails)
  - **Calendar**
  - **Articles**
  - **Partner With Us** (terra accent CTA)
- Mobile nav: hamburger menu opens slide-out with same structure
- Sticky search bar appears when on guide pages (not on /local-guides hub)

### 7B — Local Guides dropdown design

When user hovers/clicks "Local Guides" in nav:
- Mega-menu opens showing all 9 guides
- Each guide entry: thumbnail image (60×60), guide name, listing count
- 3-column grid on desktop, single column on mobile
- "View All Local Guides →" link at bottom going to /local-guides

### 7C — Update homepage strip

If a homepage exists, add a 3-card GuideShowcase compact strip at an appropriate location with most relevant featured guides (probably newcomer + healthy-kids + private-school).

### 7D — DONE WHEN

[ ] EditorialHeader has Local Guides dropdown
[ ] Dropdown shows all 9 guides with thumbnails
[ ] Calendar link in main nav
[ ] Articles link in main nav
[ ] Partner With Us CTA (terra accent) in main nav
[ ] Mobile menu has same structure
[ ] Sticky search appears on guide pages

═══════════════════════════════════════════════════════
## TASK 8 — CLEANUP AND POLISH
═══════════════════════════════════════════════════════

### 8A — Delete deprecated routes

The old `/src/app/family-resource-guide/[slug]/...` routes should either:
- Be deleted (cleanest)
- Or redirect to new URLs (safest)

Recommendation: Delete the dynamic route directory `/src/app/family-resource-guide/[slug]/` entirely. The redirects in next.config.ts handle URL forwarding. The new `/src/app/[guideSlug]/` route handles the new URLs.

The route `/src/app/family-resource-guide/page.tsx` becomes the renamed Newcomer Guide.

### 8B — Verify all 601 listings still accessible

After URL restructure, every imported listing should still be reachable at its new URL:
- Old: /family-resource-guide/private-school/listings/saint-james-school
- New: /private-school-guide/listings/saint-james-school

Spot-check 3-5 listings to verify they render correctly at new URLs.

### 8C — Verify mobile responsive everywhere

Resize browser to 375px width and verify:
- /local-guides — guides stack 1-column, hero adapts
- /family-resource-guide — guide page works on mobile
- /private-school-guide — same
- /calendar — list view stacks, gallery view goes 1-col
- Each listing detail page

### 8D — Verify cross-links work

Visit a school listing detail. Verify:
- "Also featured in: [other guides]" links work
- "Related guides" section links to actual guide URLs
- "Insider tips" render on each guide page
- Calendar peek pulls real events
- Featured articles section pulls real articles (or shows graceful empty state)

### 8E — DONE WHEN

[ ] Old /family-resource-guide/[slug] routes deleted or redirecting properly
[ ] Spot-checked listings render at new URLs
[ ] Mobile responsive verified on key pages
[ ] Cross-links work everywhere

═══════════════════════════════════════════════════════
## TASK 9 — KNOWLEDGE BASE + STATUS REPORT
═══════════════════════════════════════════════════════

### 9A — Update knowledge base

Add to `/docs/keepsharing-knowledge-base.md`:

```markdown
## BUILD RUN #13 — DEPLOYED [DATE]

### Architectural Changes:
- URL restructure: each guide is now top-level (/family-resource-guide, /private-school-guide, etc.)
- /local-guides is the magazine table of contents page
- Family Resource Guide is the renamed-and-promoted Newcomer Guide
- Each guide page is now a "magnificent issue" with editorial intro, featured articles, listings, insider tips, calendar peek, cross-links

### What Shipped:
- GuideShowcase reusable component (3 density modes, 2 layouts)
- Magazine table of contents at /local-guides
- 9 individual guide pages with editorial content
- Calendar destination at /calendar (list and gallery views, filters, image strategy)
- Event detail pages at /calendar/events/[slug]
- Updated navigation with Local Guides dropdown
- All old URLs redirect to new URLs

### New Migrations:
- 030_url_slugs_and_rename.sql
- 031_editorial_content_fields.sql

### What's Next:
- Build Run #14: Newsletter redesign + Annual update + Upsell engine
- Build Run #15: Knowledge base + AI chat support layer
```

### 9B — Document `/docs/url-architecture.md`

Reference doc documenting the URL structure decisions, redirect rules, and how to add new guides in the future.

### 9C — Truthful status report

- All migrations applied (030, 031)
- URL restructure verified
- All 9 guide pages rendering
- Calendar working with both views
- Navigation updated
- Cross-links verified
- Mobile responsive verified
- Any tasks deferred or partial documented honestly

### 9D — DONE WHEN

[ ] Knowledge base updated
[ ] /docs/url-architecture.md exists
[ ] Status report posted truthfully

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Visit `/local-guides`** and see the magazine table of contents — gorgeous editorial spread with 9 guide cards, publisher's note, featured articles, calendar peek
2. **Click any guide card** and land on a magnificent destination — editorial hero, intro paragraphs, featured articles, listings, insider tips, cross-links, newsletter
3. **Visit `/family-resource-guide`** and see the renamed-and-promoted Family Resource Guide as a top-level destination
4. **Visit `/calendar`** and see beautiful calendar with list view default, gallery view toggle, smart filters
5. **Click any event** and land on a polished event detail page
6. **Hover "Local Guides" in nav** and see dropdown with all 9 guides as thumbnails
7. **Use any old URL** like /family-resource-guide/private-school and get redirected to new URL /private-school-guide
8. **Browse on mobile** and have a clean experience without irrelevant navigation noise

═══════════════════════════════════════════════════════
## FINAL CHECKLIST
═══════════════════════════════════════════════════════

[ ] Migration 030 applied (URL slugs + Newcomer rename)
[ ] Migration 031 applied (editorial content fields)
[ ] Redirects in next.config.ts working
[ ] GuideShowcase component built and reusable
[ ] /local-guides magazine table of contents page
[ ] All 9 individual guide pages rendering as magnificent issues
[ ] /calendar with list and gallery views
[ ] /calendar/events/[slug] event detail pages
[ ] Navigation updated with Local Guides dropdown
[ ] Hero images for all 9 guides
[ ] Editorial intro and insider tips for all 9 guides
[ ] All cross-links working
[ ] Mobile responsive verified
[ ] Old URLs redirecting properly
[ ] Knowledge base updated
[ ] Truthful status report posted

Then STOP.

GO.
