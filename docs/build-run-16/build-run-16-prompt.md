# BUILD RUN #16 — The Great Realignment

**Adopt the GHL Studio design system across the entire platform. Port the four GHL-designed pages (homepage, calendar, guides index, guide detail) to live URLs wired to real data. Build the listing detail page using extrapolated GHL patterns. Deprecate the magazine-issue editorial layer that drifted from the locked design language. Reskin the ad placement system to match. Preserve all data, business logic, and admin infrastructure.**

═══════════════════════════════════════════════════════
## CRITICAL FRAMING — READ BEFORE TOUCHING ANY FILE
═══════════════════════════════════════════════════════

**This is a recovery build, not a feature build.** Build Runs #13-15 introduced an "Apartment Therapy magazine-issue" design language that drifted from the locked GHL Studio community portal design. This build corrects that drift by adopting the GHL design system completely and removing what doesn't fit.

**The data is intact. The architecture is intact. The visual presentation layer is what's being rebuilt.**

What we keep:
- 601 imported guide listings, 113 calendar events, 9 guide types
- All migrations 001-036 applied to Supabase
- ad_placements system with 8 seeded ads (DFC + RRP self-promo)
- Admin pages (/admin/articles/review, /admin/ads, /admin/newsletter, etc.)
- URL structure (each guide at top-level URL, /local-guides as index, /calendar)
- Partner backend pages from earlier builds
- 23 Points conversion formula reference docs
- mom_to_mom_quotes table data (24 seeded quotes — repurposed not displayed for now)
- Editorial content fields on guide_types (editorial_intro, insider_tips — repurposed not displayed)

What we delete:
- All Fraunces serif typography tokens
- All `--ed-*` CSS variables in globals.css
- The entire `/src/components/editorial/` directory
- GuideMagnificentIssue, WhereToStart, MomToMomSection, MonthlySpotlight, EditorsNote, MayHighlights, CalendarPeek, FeaturedListingsStrip components
- EditorialLayout, EditorialHeader, EditorialHero, EditorialSection, CategoryGrid, ListingCard (the editorial version), AdSlot (the editorial version), CrossLinkBlock, CategoryFilterStrip, GuideShowcase
- All page files that import from /components/editorial/

What we port from GHL Studio:
- Index.tsx (homepage) → /src/app/page.tsx
- EventCalendar.tsx → /src/app/calendar/page.tsx (replaces existing)
- Guides.tsx → /src/app/local-guides/page.tsx (replaces existing)
- GuideDetail.tsx → /src/app/[guideSlug]/page.tsx (replaces existing for all 9 guides)

What we build new in GHL design language:
- Listing detail page at /[guideSlug]/listings/[listingSlug] (extrapolated from patterns)
- Article detail page at /articles/[slug]
- Reskinned ad placement components matching GHL aesthetic

**STRICT TASK ORDER. STOP IF BLOCKED. NO PUSHING THROUGH.**

If a task fails after 3 attempts, document and STOP that task. Move to next. Truthful incomplete > confidently broken.

**TIME EXPECTATION: This is a major build. 90-120 minutes is appropriate. Anything under 45 minutes is a flag the depth wasn't there.**

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES — DESIGN LANGUAGE LOCKED
═══════════════════════════════════════════════════════

**The GHL Studio design system is now THE design system.** No interpretation. No "magazine quality" reframing. No drift toward editorial typography. The four GHL pages define the visual rules:

- **Sans-serif throughout.** No Fraunces. No serif headers anywhere unless explicitly in GHL code.
- **Heavy rounded corners.** `rounded-2xl` on cards. `rounded-3xl` on hero areas. `rounded-full` on buttons.
- **shadcn/ui as foundation.** Card, Badge, Button, Input. Already installed in the project.
- **Tailwind theme tokens.** `primary` (terracotta), `secondary` (teal-ish), `accent` (yellow/gold), `muted`, `background`, `foreground`. Use these. Don't introduce custom hex values.
- **Photography-forward.** Every card has a hero image. Real photos. Never icons-as-feature.
- **Lucide icons.** In `text-primary` color, used for visual rhythm. CalendarDays, MapPin, Clock, Users, BookOpen, Star, ArrowRight, etc.
- **Header bands.** Light primary or secondary tint backgrounds (`bg-primary/5`, `bg-secondary/10`) with centered title + lead paragraph.
- **Two-column layout pattern.** Main content (lg:col-span-8) + sidebar (lg:col-span-4) on guide-style pages.
- **Featured-vs-standard hierarchy.** Featured items get larger cards with horizontal layout (image left + content right + dual CTA buttons). Standard items get smaller cards in vertical stack with single CTA.
- **Inline ads with explicit eyebrow.** "AD" or "Sponsored" eyebrow + button CTA. Different background tint to distinguish from editorial content.
- **Buttons everywhere.** Every card has a clear CTA. No silent clickable cards (the whole-card-is-a-link pattern is fine but each card also needs a visible button affordance for accessibility and conversion).
- **Two-view modes where applicable.** Calendar has grid/list toggle. Same pattern can apply elsewhere if useful.

**Conversion principles still apply:**
- Tier 4 partners get the largest, most prominent featured placements
- Ad CTAs use action verbs ("Schedule Now," "Get Directions," "Enroll Today")
- Featured listings link to detail pages with full conversion stack
- Sidebar widgets create cross-platform engagement

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve: file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, content writing, file deletions in `/src/components/editorial/`.

STOP only on:
1. Unresolvable build/runtime errors after 3 attempts on a single task
2. Strategic decisions not specified in this prompt
3. Destructive operations on production data (dropping tables, deleting database rows)
4. Missing credentials in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md` (strategic context)
- `/docs/marketing-formula/23-point-proven-ad-formula.md` (conversion principles)
- `/docs/url-architecture.md` (URL structure decisions from BR13)
- The four GHL Studio source files (will be embedded in this prompt)
- `/src/components/Navigation.tsx` if it exists, or note that we need to build it
- `/src/components/ui/` (verify shadcn components exist: card, badge, button, input)
- `tailwind.config.ts` (verify theme tokens — primary, secondary, accent, muted)
- `/next.config.ts` (image hosts — should have wildcard from BR15)

Existing infrastructure to integrate with:
- Supabase: 601 guide_listings, 113 calendar_events, 9 guide_types, 8 ad_placements, 24 mom_to_mom_quotes, 9 monthly_spotlights
- Migration history: 001-036 applied
- Auth/admin patterns established in earlier builds

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

```sql
SELECT 
  (SELECT COUNT(*) FROM guide_types) as guide_types,
  (SELECT COUNT(*) FROM guide_listings) as guide_listings,
  (SELECT COUNT(*) FROM calendar_events) as calendar_events,
  (SELECT COUNT(*) FROM ad_placements WHERE is_active = true) as active_ads,
  (SELECT COUNT(*) FROM advertiser_accounts) as advertisers;
```

Expected: 9 / 601 / 113 / 8 / 100+ rows. If significantly different, document and pause.

```bash
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

Verify shadcn components exist:
```bash
dir src\components\ui
```

Expected files: button.tsx, card.tsx, badge.tsx, input.tsx (at minimum)

═══════════════════════════════════════════════════════
# PHASE 1 — FOUNDATION + DEPRECATION
═══════════════════════════════════════════════════════

## TASK 1 — VERIFY AND ESTABLISH SHADCN/UI BASELINE
═══════════════════════════════════════════════════════

The GHL pages all import from `@/components/ui/` for shadcn primitives. Verify these exist and install if missing.

### 1A — Required shadcn components

Check that these exist in `/src/components/ui/`:
- button.tsx
- card.tsx (Card, CardContent, CardHeader, CardTitle)
- badge.tsx
- input.tsx

If missing, install via shadcn CLI:
```bash
npx shadcn@latest add button card badge input
```

### 1B — Verify Tailwind theme tokens

Open `tailwind.config.ts` (or .js). Verify it has color tokens for:
- primary
- secondary  
- accent
- muted / muted-foreground
- background / foreground
- border
- destructive
- card / card-foreground

If using shadcn defaults from older project, the tokens map to CSS variables in `globals.css`. Check that section exists with proper HSL values.

If theme is missing or wrong, set up the GHL color palette:
- primary: warm terracotta (matches what's been used)
- secondary: deep teal
- accent: warm gold/yellow
- background: warm cream
- muted: light warm gray
- foreground: deep warm near-black

Example tailwind.config.ts colors section:
```typescript
colors: {
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  // ... etc using CSS variables
}
```

CSS variables in globals.css `:root`:
```css
--primary: 22 60% 47%;            /* warm terracotta */
--primary-foreground: 0 0% 100%;
--secondary: 195 50% 35%;         /* deep teal */
--secondary-foreground: 0 0% 100%;
--accent: 38 80% 55%;             /* warm gold */
--accent-foreground: 22 30% 15%;
--background: 36 38% 96%;         /* warm cream */
--foreground: 22 25% 15%;         /* warm near-black */
--muted: 36 25% 90%;
--muted-foreground: 22 12% 40%;
--border: 36 20% 85%;
--card: 0 0% 100%;
--card-foreground: 22 25% 15%;
--radius: 0.75rem;                /* rounded-lg base */
```

### 1C — Install lucide-react if needed

```bash
npm install lucide-react
```

### 1D — DONE WHEN

[ ] shadcn ui components verified or installed (button, card, badge, input)
[ ] Tailwind theme tokens defined (primary, secondary, accent, muted, etc.)
[ ] CSS variables in globals.css with warm color palette
[ ] lucide-react installed
[ ] `npm run dev` starts without theme errors

═══════════════════════════════════════════════════════
## TASK 2 — DEPRECATE THE EDITORIAL LAYER
═══════════════════════════════════════════════════════

Remove all the magazine-issue editorial code and tokens. This is destructive but necessary — that design layer doesn't fit the new direction.

### 2A — Delete editorial component directory

```bash
Remove-Item -Recurse -Force src\components\editorial
```

This removes:
- EditorialLayout.tsx
- EditorialHeader.tsx
- EditorialHero.tsx
- EditorialSection.tsx
- CategoryGrid.tsx
- ListingCard.tsx (editorial version)
- AdSlot.tsx (editorial version — but we have new ad components)
- CrossLinkBlock.tsx
- CategoryFilterStrip.tsx
- GuideShowcase.tsx
- GuideMagnificentIssue.tsx
- FeaturedListingsStrip.tsx
- WhereToStart.tsx
- MomToMomSection.tsx
- MonthlySpotlight.tsx
- EditorsNote.tsx
- MayHighlights.tsx
- CalendarPeek.tsx
- index.ts (barrel export)

### 2B — Delete the existing editorial calendar components

Calendar components from BR13 use the editorial design language. Delete and replace.

```bash
Remove-Item -Recurse -Force src\components\calendar
```

This removes CalendarListView.tsx and CalendarGalleryView.tsx — these will be rebuilt as part of the GHL calendar page port.

### 2C — Strip editorial CSS tokens from globals.css

Open `/src/app/globals.css`. Find the section that begins with the editorial design system header comment. Remove the entire section including:
- All `--ed-*` CSS custom properties
- `body.editorial` class and rules
- `.ed-*` utility classes (ed-display, ed-h1, ed-h2, ed-h3, ed-eyebrow, ed-body-lead, ed-body, ed-caption, ed-pullquote, ed-container, ed-card, ed-section-break, ed-section-break-icon)
- Any rules that reference these tokens

Keep:
- Tailwind base layer (`@tailwind base; @tailwind components; @tailwind utilities;`)
- Theme CSS variables (`:root { --primary: ... }`)
- Any animation keyframes or utility classes that don't reference editorial tokens
- Body base styles

If unsure whether to keep something, err on the side of deleting. The GHL pages use Tailwind utility classes only — they don't depend on custom CSS classes.

### 2D — Delete obsolete page files

These page files use the editorial layer and need to be deleted (will be rebuilt):

```
src/app/local-guides/page.tsx
src/app/family-resource-guide/page.tsx
src/app/private-school-guide/page.tsx
src/app/summer-camp-guide/page.tsx
src/app/childcare-guide/page.tsx
src/app/healthy-kids-guide/page.tsx
src/app/summer-fun-guide/page.tsx
src/app/birthday-party-guide/page.tsx
src/app/afterschool-guide/page.tsx
src/app/special-needs-guide/page.tsx
src/app/calendar/page.tsx
src/app/family-resource-guide/[slug]/page.tsx (if still exists)
```

For each guide directory, ALSO delete:
- The page.tsx (replaced by new dynamic route)
- The /listings/[listingSlug]/page.tsx (replaced by new dynamic route)

### 2E — Delete obsolete migrations from disk (don't drop database tables)

The data is fine. We're keeping all the database tables and data. Just remove disk references to migrations that exclusively support the editorial layer:

NONE actually need to be deleted. The migrations created data we still want. The CONTENT just gets repurposed or hidden.

Specifically:
- `mom_to_mom_quotes` table stays — content might be displayed in articles later
- `guide_monthly_spotlights` table stays — May 2026 content could feed into homepage trending ticker
- Editorial content columns on guide_types stay — `editorial_intro`, `insider_tips` — these can power article content elsewhere

### 2F — DONE WHEN

[ ] /src/components/editorial/ directory deleted
[ ] /src/components/calendar/ directory deleted
[ ] Editorial CSS tokens stripped from globals.css
[ ] Obsolete guide page files deleted
[ ] All database tables and data preserved (no DROP statements run)
[ ] `npm run dev` starts without import errors (some pages will 404 — that's expected, we're building them next)

═══════════════════════════════════════════════════════
## TASK 3 — BUILD NAVIGATION COMPONENT
═══════════════════════════════════════════════════════

The GHL pages all import `<Navigation />` from `@/components/Navigation`. This component doesn't exist yet — build it.

### 3A — Build /src/components/Navigation.tsx

Top navigation bar. Sticky on scroll. Mobile responsive with hamburger.

Pattern based on GHL homepage (visible in screenshots): logo on left + nav links on right + Subscribe button (terra accent).

```typescript
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Guides', href: '/local-guides' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Magazine', href: '/magazine' },
  { label: 'Interviews', href: '/interviews' },
];

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Home className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            River Region <span className="text-primary">Parents</span>
          </span>
        </Link>
        
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map(item => (
            <Link 
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Button className="rounded-full">Subscribe</Button>
        </div>
        
        {/* Mobile menu toggle */}
        <button 
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      
      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-4 flex flex-col gap-3">
            {NAV_ITEMS.map(item => (
              <Link 
                key={item.href}
                href={item.href}
                className="py-2 text-base font-medium hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button className="rounded-full mt-2">Subscribe</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
```

### 3B — DONE WHEN

[ ] /src/components/Navigation.tsx built
[ ] Imports work (Link from next/link, Button from shadcn, lucide icons)
[ ] Mobile menu toggles cleanly
[ ] Active link state shows current page
[ ] Sticky behavior works

═══════════════════════════════════════════════════════
# PHASE 2 — PORT GHL PAGES TO LIVE URLS
═══════════════════════════════════════════════════════

## TASK 4 — PORT HOMEPAGE
═══════════════════════════════════════════════════════

The GHL homepage code goes to `/src/app/page.tsx` and gets wired to real data.

### 4A — Build /src/app/page.tsx

Adapt the GHL Index.tsx homepage code. Key changes:

1. Replace `import { Navigation }` paths to match Next.js project structure
2. Replace mock data with Supabase queries:
   - Trending ticker items: pull from a new `trending_items` table OR hardcode for now (decide based on time)
   - Main feature (Mom to Mom): pull latest article tagged 'interview' from guide_articles
   - Side feature 1 (Summer Camp Guide): pull from guide_types where slug='summer-camp'
   - Community Spotlights: pull latest 3 community spotlights — for now hardcode 3 placeholders since we don't have a spotlights system
   - Upcoming Events: pull next 3 events from calendar_events ordered by start_date
   - In-feed ad spot: pull from ad_placements where placement_type='homepage_inline_ad'
   - Latest Articles: pull 4 latest from guide_articles
   - Sidebar Ad: pull from ad_placements where placement_type='homepage_sidebar_ad'
   - Mini Calendar Widget: pull next 3 events
   - Business Spotlight Widget: pull from ad_placements where placement_type='homepage_business_spotlight'
3. Replace mock images (vibe.filesafe.space URLs) with database hero_image_url fields
4. Keep all the layout, styling, classNames, animations, hover states EXACTLY as in the GHL code
5. Keep the Trending Ticker pattern even if we hardcode the items

### 4B — Migration 037: Trending ticker + community spotlights

```sql
-- Trending items table (homepage ticker)
CREATE TABLE IF NOT EXISTS trending_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji TEXT,
  label TEXT NOT NULL,
  link TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO trending_items (emoji, label, link, display_order) VALUES
('☀️', '2026 Summer Camp Guide', '/summer-camp-guide', 1),
('📖', 'May Digital Issue Released', '/magazine/may-2026', 2),
('🏆', 'Nominate Teacher of the Month', '/community-spotlights/nominate', 3),
('🎪', 'Mother''s Day Weekend Events', '/calendar?range=weekend', 4),
('🍎', 'School Year Wind-Down Tips', '/articles/school-year-end', 5);

-- Community spotlights table
CREATE TABLE IF NOT EXISTS community_spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotlight_type TEXT NOT NULL, -- 'teacher', 'student', 'grands', 'business', 'family'
  honoree_name TEXT NOT NULL,
  honoree_context TEXT, -- "3rd Grade, Riverside" or "State Science Fair Winner"
  hero_image_url TEXT,
  full_story_link TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  featured_month INT,
  featured_year INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO community_spotlights (spotlight_type, honoree_name, honoree_context, display_order, featured_month, featured_year) VALUES
('teacher', 'Mrs. Davis', '3rd Grade, Riverside Elementary', 1, 5, 2026),
('student', 'Marcus Johnson', 'State Science Fair Winner', 2, 5, 2026),
('grands', 'The Smiths', '50 Years in the Region', 3, 5, 2026);
```

### 4C — Wire homepage data fetching

```typescript
// /src/app/page.tsx
async function getHomepageData() {
  const supabase = createClient(...);
  
  // Trending ticker
  const { data: trending } = await supabase
    .from('trending_items')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  
  // Featured Mom-to-Mom interview
  const { data: featured_interview } = await supabase
    .from('guide_articles')
    .select('*')
    .eq('category', 'mom-to-mom')
    .eq('editorial_review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  // Side feature: featured guide (e.g., Summer Camp)
  const { data: featured_guide } = await supabase
    .from('guide_types')
    .select('*')
    .eq('slug', 'summer-camp')
    .single();
  
  // Community spotlights
  const { data: spotlights } = await supabase
    .from('community_spotlights')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
    .limit(3);
  
  // Upcoming events
  const today = new Date().toISOString().split('T')[0];
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('status', 'published')
    .gte('start_date', today)
    .order('start_date')
    .limit(3);
  
  // Latest articles (Parenting & Lifestyle)
  const { data: articles } = await supabase
    .from('guide_articles')
    .select('*')
    .eq('editorial_review_status', 'approved')
    .neq('category', 'mom-to-mom')
    .order('created_at', { ascending: false })
    .limit(4);
  
  // Homepage ads
  const { data: inline_ad } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(*)')
    .eq('placement_type', 'homepage_inline_ad')
    .eq('is_active', true)
    .order('display_priority', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const { data: sidebar_ad } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(*)')
    .eq('placement_type', 'homepage_sidebar_ad')
    .eq('is_active', true)
    .order('display_priority', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const { data: business_spotlight } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(*)')
    .eq('placement_type', 'homepage_business_spotlight')
    .eq('is_active', true)
    .order('display_priority', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return { trending, featured_interview, featured_guide, spotlights, events, articles, inline_ad, sidebar_ad, business_spotlight };
}
```

### 4D — Add homepage ad placement seeds

In migration 037 or a follow-on seed:

```sql
-- Add homepage placements to ad_placements
DO $$
DECLARE rrp_id UUID; dfc_id UUID;
BEGIN
  SELECT id INTO rrp_id FROM advertiser_accounts WHERE business_name = 'River Region Parents' LIMIT 1;
  SELECT id INTO dfc_id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1;
  
  IF dfc_id IS NOT NULL THEN
    INSERT INTO ad_placements (
      placement_type, context_type, context_slug, advertiser_account_id,
      ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
      display_priority
    ) VALUES
    ('homepage_inline_ad', 'homepage', NULL, dfc_id,
     'Sponsored', 'River Region Pediatric Dentistry',
     'Now accepting new patients! Book your child''s summer checkup today.',
     'Learn More', '/healthy-kids-guide/listings/dentistry-for-children',
     100);
  END IF;
  
  IF rrp_id IS NOT NULL THEN
    INSERT INTO ad_placements (
      placement_type, context_type, context_slug, advertiser_account_id,
      ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
      display_priority
    ) VALUES
    ('homepage_sidebar_ad', 'homepage', NULL, rrp_id,
     'Advertisement', 'River Region Tutors',
     'Summer learning programs enrolling now. Keep their minds sharp!',
     'Enroll Today', '/advertise',
     90),
    ('homepage_business_spotlight', 'homepage', NULL, rrp_id,
     'Business Spotlight', 'River City Play Cafe',
     'A safe haven for toddlers to explore and a relaxing spot for parents to grab a coffee.',
     'Read their story', '/articles/river-city-play-cafe',
     80);
  END IF;
END $$;
```

### 4E — Image strategy

Replace all `vibe.filesafe.space` URLs with proper sources:
- Hero images: use database hero_image_url where available, fall back to /images/heroes/* (the local files we downloaded in BR15)
- Article images: use guide_articles.hero_image_url
- Spotlight headshots: use community_spotlights.hero_image_url (or placeholder for now)
- Event images: use calendar_events.hero_image_url

For development/seed images that don't exist yet, use Unsplash fallbacks:
- Family photos: `https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1200&q=80&auto=format&fit=crop`
- Summer camp: `https://images.unsplash.com/photo-1496080174650-637e3f22fa03?w=1200&q=80&auto=format&fit=crop`
- Festival: `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80&auto=format&fit=crop`
- Article generic: `https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=1200&q=80&auto=format&fit=crop`

### 4F — DONE WHEN

[ ] Migration 037 applied
[ ] /src/app/page.tsx built with full GHL homepage layout
[ ] Trending ticker rendering with real data
[ ] Mom-to-Mom hero rendering (article OR placeholder)
[ ] Summer Camp Guide side feature linking to /summer-camp-guide
[ ] Community Spotlights rendering 3 honorees
[ ] Upcoming Events showing next 3 from database
[ ] In-feed ad rendering (DFC pediatric dentistry)
[ ] Sidebar ad rendering (RRP Tutors)
[ ] Mini Calendar Widget rendering
[ ] Business Spotlight rendering (RRP Play Cafe)
[ ] Newsletter widget rendering with form
[ ] Footer rendering with proper links
[ ] All buttons functional
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 5 — PORT CALENDAR PAGE
═══════════════════════════════════════════════════════

Port GHL EventCalendar.tsx to `/src/app/calendar/page.tsx`.

### 5A — Build /src/app/calendar/page.tsx

Adapt the GHL EventCalendar code. Key adaptations:

1. Replace mock MOCK_EVENTS with Supabase query for calendar_events
2. Add proper filter logic (All Events, Festivals, Education, Outdoors)
3. Maintain the grid/list view toggle
4. Maintain the inline ad spots (one in grid view, one in list view)
5. Maintain the Editor's Pick card pattern
6. Wire ad slots to ad_placements table

```typescript
// /src/app/calendar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';

// Inside component:
const [view, setView] = useState<'grid' | 'list'>('grid');
const [filter, setFilter] = useState<string>('all');
const [events, setEvents] = useState([]);
const [ads, setAds] = useState([]);

useEffect(() => {
  async function load() {
    const eventsRes = await fetch(`/api/calendar/events?filter=${filter}`);
    const eventsData = await eventsRes.json();
    setEvents(eventsData.events);
    
    const adsRes = await fetch('/api/ads/calendar');
    const adsData = await adsRes.json();
    setAds(adsData.ads);
  }
  load();
}, [filter]);
```

### 5B — Build /src/app/api/calendar/events/route.ts

API endpoint that returns filtered calendar events:

```typescript
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'all';
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('status', 'published')
    .gte('start_date', today)
    .order('start_date');
  
  // Filter by category
  if (filter !== 'all') {
    query = query.ilike('category', `%${filter}%`);
  }
  
  const { data: events, error } = await query.limit(30);
  
  return Response.json({ events: events || [], error });
}
```

### 5C — Build /src/app/api/ads/calendar/route.ts

```typescript
export async function GET() {
  const supabase = createClient(...);
  
  const { data: ads } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(*)')
    .in('placement_type', ['calendar_inline_ad', 'calendar_editor_pick'])
    .eq('is_active', true)
    .order('display_priority', { ascending: false });
  
  return Response.json({ ads: ads || [] });
}
```

### 5D — Build /src/app/calendar/events/[slug]/page.tsx

Single event detail page. Layout:

- Navigation
- Header band with hero image (if event has one) OR simple text header
- Two-column: main content (description, full details) + sidebar (date/time/location card, "Add to Calendar" button, share buttons, related events)
- Use shadcn Card components, GHL design language

### 5E — Image fallback for events without images

In the calendar grid view, events with no `hero_image_url` get a category-tinted gradient fallback:

```typescript
function EventImage({ event }: { event: CalendarEvent }) {
  if (event.hero_image_url) {
    return (
      <img 
        src={event.hero_image_url} 
        alt={event.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    );
  }
  
  // Category-tinted gradient with icon
  const gradients: Record<string, string> = {
    festival: 'from-yellow-200 to-orange-200',
    theater: 'from-purple-200 to-pink-200',
    music: 'from-blue-200 to-cyan-200',
    art: 'from-pink-200 to-rose-200',
    sports: 'from-green-200 to-emerald-200',
    education: 'from-indigo-200 to-purple-200',
    default: 'from-amber-200 to-orange-200',
  };
  
  const category = (event.category || 'default').toLowerCase();
  const gradient = gradients[category] || gradients.default;
  
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <CalendarDays className="h-16 w-16 text-foreground/30" />
    </div>
  );
}
```

### 5F — DONE WHEN

[ ] /src/app/calendar/page.tsx built (port of GHL EventCalendar)
[ ] Grid/list view toggle works
[ ] Filter pills work (All / Festivals / Education / Outdoors / etc.)
[ ] Events fetched from real data (113 events from May 2026)
[ ] Inline ad in grid view (Pediatric Dental Associates style — uses ad_placements)
[ ] Inline ad in list view (Sponsored card)
[ ] Editor's Pick card in grid view
[ ] /calendar/events/[slug] detail pages render
[ ] Image fallbacks for events without images
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 6 — PORT GUIDES INDEX PAGE
═══════════════════════════════════════════════════════

Port GHL Guides.tsx to `/src/app/local-guides/page.tsx`.

### 6A — Build /src/app/local-guides/page.tsx

Adapt the GHL Guides code. Key adaptations:

1. Replace mock GUIDES array with Supabase query for guide_types
2. Replace mock FEATURED_ADVERTISERS with query for top featured listings across all guides
3. Wire inline ad to ad_placements with placement_type='guides_index_ad'
4. Use guide_types.url_slug for proper routing

```typescript
async function getGuidesData() {
  const supabase = createClient(...);
  
  // All guides ordered
  const { data: guides } = await supabase
    .from('guide_types')
    .select('slug, url_slug, display_name, short_description, hero_image_url, pitch, display_order')
    .order('display_order');
  
  // Listing counts per guide
  const counts = await Promise.all(
    (guides || []).map(async (g) => {
      const { count } = await supabase
        .from('guide_listings')
        .select('id', { count: 'exact', head: true })
        .eq('guide_type_slug', g.slug)
        .eq('is_published', true);
      return { slug: g.slug, count: count || 0 };
    })
  );
  
  // Top featured advertisers (cross-guide)
  const { data: featured } = await supabase
    .from('guide_listings')
    .select(`
      *,
      advertiser:advertiser_accounts(*),
      guide:guide_types(*)
    `)
    .in('listing_tier', ['featured', 'tier-3-business-spotlight', 'tier-4-launch-engine'])
    .eq('is_published', true)
    .order('listing_tier', { ascending: false })
    .limit(2);
  
  // Inline guides ad
  const { data: ad } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(*)')
    .eq('placement_type', 'guides_index_ad')
    .eq('is_active', true)
    .order('display_priority', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return {
    guides: (guides || []).map(g => ({
      ...g,
      count: counts.find(c => c.slug === g.slug)?.count || 0,
    })),
    featured: featured || [],
    ad,
  };
}
```

### 6B — Maintain GHL design exactly

- Header band with secondary tint background and Local Resources badge
- Featured Partners strip (2 cards, horizontal layout)
- 9 guide cards in 3-column grid + 1 inline ad card = 10 grid items
- Each guide card: aspect-4/3 hero image + listing count + title + pitch
- Hover effects exactly as in GHL code

### 6C — DONE WHEN

[ ] /src/app/local-guides/page.tsx built (port of GHL Guides)
[ ] Header band rendering with badge
[ ] Featured Partners showing 2 top featured listings
[ ] All 9 guide cards rendering with counts
[ ] Inline ad card mixed into the grid
[ ] Each guide card links to /[url_slug]
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 7 — PORT GUIDE DETAIL PAGE FOR ALL 9 GUIDES
═══════════════════════════════════════════════════════

Port GHL GuideDetail.tsx to dynamic route handling all 9 guides.

### 7A — Architecture decision

Build Run #13 created 9 separate static directories (`/family-resource-guide/`, `/private-school-guide/`, etc.) because the dynamic `[neighborhood]` slot at `/src/app/` was already taken.

Either:
- **Option A**: Keep the 9 static directories. Each has a thin `page.tsx` that just imports and renders the shared GuideDetail component.
- **Option B**: Refactor to use a dynamic route. More complex due to the [neighborhood] conflict.

Use **Option A**. Update each of the 9 guide page.tsx files to:

```typescript
// /src/app/private-school-guide/page.tsx (and similar for all 9)
import { GuideDetailPage } from '@/components/guides/GuideDetailPage';

export default async function Page() {
  return <GuideDetailPage guideUrlSlug="private-school-guide" />;
}
```

### 7B — Build /src/components/guides/GuideDetailPage.tsx

Shared component that does the data fetching and rendering. Adapts GHL GuideDetail.tsx.

```typescript
import { createClient } from '@supabase/supabase-js';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Globe, Star, CheckCircle2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function GuideDetailPage({ guideUrlSlug }: { guideUrlSlug: string }) {
  const supabase = createClient(...);
  
  // Get guide
  const { data: guide } = await supabase
    .from('guide_types')
    .select('*')
    .eq('url_slug', guideUrlSlug)
    .single();
  
  if (!guide) notFound();
  
  // Get featured listings (max 2)
  const { data: featured } = await supabase
    .from('guide_listings')
    .select('*, advertiser:advertiser_accounts(*)')
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .in('listing_tier', ['featured', 'tier-3-business-spotlight', 'tier-4-launch-engine'])
    .order('listing_tier', { ascending: false })
    .limit(2);
  
  // Get standard listings (paginated)
  const { data: standard } = await supabase
    .from('guide_listings')
    .select('*, advertiser:advertiser_accounts(*)')
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .not('listing_tier', 'in', '(featured,tier-3-business-spotlight,tier-4-launch-engine)')
    .order('display_order')
    .limit(20);
  
  // Get inline directory ad
  const { data: directoryAd } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(*)')
    .eq('placement_type', 'guide_directory_inline_ad')
    .eq('context_slug', guideUrlSlug)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  
  // Get thematic article for sidebar
  const { data: thematicArticle } = await supabase
    .from('guide_articles')
    .select('*')
    .eq('category', guide.slug)
    .eq('editorial_review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header band */}
      <div className="bg-primary/5 border-b">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary text-primary-foreground">2026 Edition</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground leading-tight">
              {guide.display_name}
            </h1>
            <p className="text-xl text-muted-foreground">
              {guide.pitch || guide.hub_intro_paragraph}
            </p>
          </div>
        </div>
      </div>
      
      <main className="container py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Main column */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Featured Providers */}
            {featured && featured.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Star className="h-6 w-6 text-accent" fill="currentColor" />
                  <h2 className="text-2xl font-bold">Featured Providers</h2>
                </div>
                <div className="space-y-6">
                  {featured.map(listing => (
                    <FeaturedListingCard 
                      key={listing.id} 
                      listing={listing} 
                      guideUrlSlug={guideUrlSlug} 
                    />
                  ))}
                </div>
              </section>
            )}
            
            {/* Directory */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Directory A-Z</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Render listings, inject ad after 4th */}
                {(standard || []).map((listing, i) => (
                  <>
                    <DirectoryListingCard 
                      key={listing.id} 
                      listing={listing} 
                      guideUrlSlug={guideUrlSlug} 
                    />
                    {i === 3 && directoryAd && (
                      <DirectoryAdCard ad={directoryAd} />
                    )}
                  </>
                ))}
              </div>
              {standard && standard.length >= 20 && (
                <div className="mt-8 text-center">
                  <Button variant="outline" size="lg">Load More Listings</Button>
                </div>
              )}
            </section>
          </div>
          
          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            
            {/* Thematic Article */}
            {thematicArticle && <SidebarArticleCard article={thematicArticle} />}
            
            {/* Map placeholder */}
            <SidebarMapCard guide={guide} />
            
            {/* Filter widget */}
            <SidebarFilterWidget guide={guide} />
            
          </aside>
        </div>
      </main>
    </div>
  );
}
```

### 7C — Build sub-components

Build each as separate components within /src/components/guides/:

- `FeaturedListingCard.tsx` — large horizontal card with image left + content right + dual CTA buttons (View Profile + Contact)
- `DirectoryListingCard.tsx` — small vertical card with name + location + description + View Details
- `DirectoryAdCard.tsx` — same shape as DirectoryListingCard but tinted secondary background + "AD" eyebrow + button CTA
- `SidebarArticleCard.tsx` — Editor's Pick treatment with article excerpt
- `SidebarMapCard.tsx` — map placeholder with "Open Map View" button
- `SidebarFilterWidget.tsx` — Age Group + Location selects + Apply Filters button

### 7D — Update each guide's page.tsx

Update all 9 files to use the new pattern:

```typescript
// Each guide's /src/app/[guide-slug]/page.tsx
import { GuideDetailPage } from '@/components/guides/GuideDetailPage';

export default async function Page() {
  return <GuideDetailPage guideUrlSlug="GUIDE_URL_SLUG_HERE" />;
}
```

The 9 url_slugs are:
- family-resource-guide
- private-school-guide
- summer-camp-guide
- childcare-guide
- healthy-kids-guide
- summer-fun-guide
- birthday-party-guide
- afterschool-guide
- special-needs-guide

### 7E — DONE WHEN

[ ] GuideDetailPage component built
[ ] All 6 sub-components built
[ ] All 9 guide page.tsx files updated to use new pattern
[ ] Each guide URL renders proper detail page
[ ] Featured listings show with horizontal cards + dual buttons
[ ] Directory shows in 2-column grid with inline ad mixed in
[ ] Sidebar has article + map + filter widgets
[ ] Mobile responsive

═══════════════════════════════════════════════════════
# PHASE 3 — BUILD MISSING PAGES
═══════════════════════════════════════════════════════

## TASK 8 — BUILD LISTING DETAIL PAGE
═══════════════════════════════════════════════════════

The listing detail page wasn't in the GHL exports but we need to extrapolate from the design patterns. This is where individual businesses (DFC, Saint James, etc.) live.

### 8A — Build /src/components/listings/ListingDetailPage.tsx

```typescript
export async function ListingDetailPage({ guideUrlSlug, listingSlug }: { 
  guideUrlSlug: string; 
  listingSlug: string; 
}) {
  // Fetch listing with all related data
  const listing = await getListingBySlug(listingSlug, guideUrlSlug);
  if (!listing) notFound();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero band with business image */}
      <div className="relative bg-primary/5 border-b">
        {listing.hero_photo_url && (
          <div className="absolute inset-0 z-0">
            <img src={listing.hero_photo_url} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        <div className="container py-12 lg:py-16 relative z-10">
          <Link href={`/${guideUrlSlug}`} className="text-sm text-primary hover:text-primary/80 mb-4 inline-flex items-center gap-1">
            ← Back to {listing.guide.display_name}
          </Link>
          <div className="max-w-3xl">
            {listing.listing_tier !== 'free' && (
              <Badge className="mb-4 bg-accent text-accent-foreground">Featured Partner</Badge>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground leading-tight">
              {listing.business_name}
            </h1>
            {listing.card_hook && (
              <p className="text-xl text-muted-foreground">{listing.card_hook}</p>
            )}
          </div>
        </div>
      </div>
      
      <main className="container py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Main column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Hero photo */}
            {listing.hero_photo_url && (
              <Card className="overflow-hidden">
                <div className="aspect-video">
                  <img src={listing.hero_photo_url} alt={listing.business_name} className="w-full h-full object-cover" />
                </div>
              </Card>
            )}
            
            {/* About / Description */}
            {listing.detail_lead && (
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4">About {listing.business_name}</h2>
                  <p className="text-muted-foreground leading-relaxed">{listing.detail_lead}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Conditional sections from listing_sections table */}
            {listing.sections.map(section => (
              <ListingSection key={section.id} section={section} />
            ))}
            
            {/* Guide-specific data */}
            <Card>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4">Details</h3>
                <GuideSpecificFields 
                  guide_type_slug={listing.guide_type_slug} 
                  guide_data={listing.guide_data} 
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Contact card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Contact</h3>
                <div className="space-y-3 text-sm">
                  {listing.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{listing.address}</span>
                    </div>
                  )}
                  {listing.phone && (
                    <a href={`tel:${listing.phone}`} className="flex items-center gap-2 hover:text-primary">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      {listing.phone}
                    </a>
                  )}
                  {listing.website && (
                    <a href={listing.website} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-primary">
                      <Globe className="h-4 w-4 text-primary shrink-0" />
                      Visit Website
                    </a>
                  )}
                  {listing.email && (
                    <a href={`mailto:${listing.email}`} className="flex items-center gap-2 hover:text-primary">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      Email
                    </a>
                  )}
                </div>
                <div className="mt-6 space-y-2">
                  <Button className="w-full">Send Message</Button>
                  {listing.website && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={listing.website} target="_blank" rel="noopener">
                        Visit Website
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Map placeholder */}
            <SidebarMapCard listing={listing} />
            
            {/* Other listings in this guide */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">More in {listing.guide.display_name}</h3>
                <div className="space-y-3">
                  {listing.relatedListings.map(rl => (
                    <Link 
                      key={rl.id} 
                      href={`/${guideUrlSlug}/listings/${rl.slug}`}
                      className="block p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="font-medium text-sm">{rl.business_name}</p>
                      {rl.neighborhood && (
                        <p className="text-xs text-muted-foreground">{rl.neighborhood}</p>
                      )}
                    </Link>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/${guideUrlSlug}`}>View Full Guide</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
```

### 8B — Wire to all 9 guide listing routes

Each guide's `/listings/[listingSlug]/page.tsx` becomes:

```typescript
import { ListingDetailPage } from '@/components/listings/ListingDetailPage';

export default async function Page({ params }: { params: { listingSlug: string } }) {
  return <ListingDetailPage guideUrlSlug="GUIDE_URL_SLUG" listingSlug={params.listingSlug} />;
}
```

### 8C — DONE WHEN

[ ] ListingDetailPage component built
[ ] All 9 guide listing routes updated
[ ] Visit any listing (e.g., /healthy-kids-guide/listings/dentistry-for-children) renders detail page
[ ] Hero band with business name and card_hook
[ ] About section with detail_lead
[ ] Conditional sections render
[ ] Guide-specific fields render (Tuition, Grades, Hours, etc.)
[ ] Contact sidebar with phone/address/website/email
[ ] Send Message + Visit Website buttons
[ ] Related listings in sidebar
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 9 — BUILD ARTICLE DETAIL PAGE
═══════════════════════════════════════════════════════

For Mom-to-Mom interviews and other articles. The homepage Mom-to-Mom hero links to one of these.

### 9A — Build /src/app/articles/[slug]/page.tsx

Single article reading experience. GHL design language.

- Navigation
- Hero image (full-width, aspect 21:9)
- Header section: badge (category), title, byline + date, lead paragraph
- Two-column: article body (main) + sidebar (related articles, share buttons, advertiser placement)
- Use Tailwind prose typography for body
- Include image embeds, pull quotes, related listings cross-links

### 9B — DONE WHEN

[ ] /src/app/articles/[slug]/page.tsx built
[ ] Article hero with image + title + meta
[ ] Body rendering with proper typography
[ ] Sidebar with related articles + share + ad
[ ] Visit a sample article (use existing guide_articles data)
[ ] Mobile responsive

═══════════════════════════════════════════════════════
# PHASE 4 — RESKIN AD SYSTEM
═══════════════════════════════════════════════════════

## TASK 10 — RESKIN THE 12 AD PLACEMENT COMPONENTS
═══════════════════════════════════════════════════════

The ad system from BR15 used the editorial design language. Reskin to match GHL aesthetic.

### 10A — Update each ad component

Each component in `/src/components/ads/` needs:

1. Replace `--ed-*` CSS variables with Tailwind theme tokens
2. Replace serif typography with sans-serif (default)
3. Replace `.ad-eyebrow` custom class with inline Tailwind: `text-[10px] text-muted-foreground font-bold uppercase tracking-widest`
4. Replace `.ad-headline` with: `font-bold text-lg text-foreground`
5. Replace `.ad-description` with: `text-sm text-muted-foreground`
6. Use shadcn Button component for CTAs
7. Use shadcn Card structure for visual container
8. Maintain editorial tone (not banner-ish) but in GHL visual language

### 10B — Specific styling per placement type

**HomepageInlineAd** (matches GHL homepage in-feed ad):
```tsx
<div className="bg-muted/50 border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group cursor-pointer">
  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
  <div className="w-16 h-16 bg-background rounded-xl shadow-sm flex items-center justify-center shrink-0 z-10 border">
    {/* logo or icon */}
  </div>
  <div className="flex-1 text-center sm:text-left z-10">
    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
      {ad.ad_eyebrow || 'Sponsored'}
    </span>
    <h4 className="font-bold text-lg text-foreground">{ad.ad_headline}</h4>
    <p className="text-sm text-muted-foreground">{ad.ad_description}</p>
  </div>
  <Button variant="outline" className="shrink-0 z-10 bg-background">
    {ad.ad_cta_label || 'Learn More'}
  </Button>
</div>
```

**HomepageSidebarAd** (matches GHL sidebar ad with "Enroll Today" pattern):
```tsx
<div className="bg-muted aspect-square rounded-3xl border flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors">
  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4">
    Advertisement
  </span>
  <div className="w-20 h-20 bg-background rounded-2xl shadow-sm flex items-center justify-center mb-4 mt-4 group-hover:scale-105 transition-transform">
    {/* logo or icon */}
  </div>
  <h3 className="text-xl font-bold mb-2">{ad.ad_headline}</h3>
  <p className="text-sm text-muted-foreground mb-6">{ad.ad_description}</p>
  <Button className="w-full rounded-full">{ad.ad_cta_label}</Button>
</div>
```

**HomepageBusinessSpotlight** (dark themed sidebar widget):
```tsx
<Card className="bg-foreground text-background border-none overflow-hidden relative">
  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
  <CardHeader className="pb-2 relative z-10">
    <div className="flex items-center gap-2 mb-2">
      <Briefcase className="h-4 w-4 text-primary" />
      <span className="text-xs font-bold uppercase tracking-wider text-primary">
        Business Spotlight
      </span>
    </div>
    <CardTitle className="text-xl">{ad.ad_headline}</CardTitle>
  </CardHeader>
  <CardContent className="relative z-10">
    <p className="text-sm text-background/80 mb-4">{ad.ad_description}</p>
    <Link href={ad.ad_link} className="flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors">
      {ad.ad_cta_label || 'Read more'} <ArrowRight className="ml-1 h-4 w-4" />
    </Link>
  </CardContent>
</Card>
```

**CalendarInlineAd** (in calendar grid):
```tsx
<Card className="overflow-hidden border-secondary/30 bg-secondary/5 h-full flex flex-col relative">
  <span className="absolute top-4 right-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest z-10 bg-background/80 px-2 py-1 rounded backdrop-blur">
    Ad
  </span>
  <div className="p-8 text-center flex flex-col items-center justify-center h-full">
    <div className="w-16 h-16 bg-background rounded-2xl shadow-sm flex items-center justify-center mb-4">
      <Star className="h-8 w-8 text-secondary" />
    </div>
    <h3 className="text-xl font-bold text-foreground leading-tight mb-2">
      {ad.ad_headline}
    </h3>
    <p className="text-sm text-muted-foreground mb-6">{ad.ad_description}</p>
    <Button className="w-full">{ad.ad_cta_label}</Button>
  </div>
</Card>
```

**GuideDirectoryInlineAd** (in guide detail directory):
```tsx
<Card className="hover:border-secondary/50 transition-colors cursor-pointer flex flex-col bg-secondary/5 border-secondary/30 relative">
  <span className="absolute top-3 right-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest z-10 bg-background/80 px-2 py-1 rounded backdrop-blur">
    Ad
  </span>
  <CardContent className="p-5 flex-1 flex flex-col items-center text-center justify-center">
    <h4 className="font-bold text-lg mb-2">{ad.ad_headline}</h4>
    <p className="text-sm text-muted-foreground mb-4">{ad.ad_description}</p>
    <Button variant="outline" size="sm" className="w-full">{ad.ad_cta_label}</Button>
  </CardContent>
</Card>
```

### 10C — Update placement_type values to match new structure

Migration 038 — rename placement types to align with new layout:

```sql
-- Add new placement types matching GHL design
-- Old types from BR15 still work, but add these new ones:

UPDATE ad_placements SET placement_type = 'homepage_inline_ad' 
  WHERE placement_type = 'guide_inline_sponsored' 
    AND context_type = 'guide' 
    AND context_slug IS NULL;

UPDATE ad_placements SET placement_type = 'homepage_sidebar_ad'
  WHERE placement_type = 'guide_sidebar_sticky'
    AND context_slug = 'family-resource-guide';

-- Add new placements that map to GHL design:
-- homepage_inline_ad
-- homepage_sidebar_ad
-- homepage_business_spotlight  
-- calendar_inline_ad (grid)
-- calendar_inline_ad_list (list view)
-- calendar_editor_pick
-- guides_index_ad (in guides grid)
-- guide_directory_inline_ad (in guide detail directory)
-- guide_thematic_article (sidebar editor's pick)
-- listing_detail_sidebar_ad (in listing detail sidebar)
-- listing_detail_inline_ad (in listing detail body)
-- article_inline_ad
```

### 10D — DONE WHEN

[ ] All 12 ad placement components reskinned to GHL design language
[ ] Components use shadcn primitives (Card, Button, Badge)
[ ] Components use Tailwind theme tokens (no `--ed-*` references)
[ ] Migration 038 applied with placement type renames
[ ] Each ad type renders correctly when seeded data exists
[ ] CTA buttons prominent on every ad

═══════════════════════════════════════════════════════
## TASK 11 — UPDATE ADMIN ADS PAGE FOR NEW PLACEMENT TYPES
═══════════════════════════════════════════════════════

### 11A — Update /src/app/admin/ads/page.tsx

Update the placement_type dropdown to include all GHL placement types:

```typescript
const PLACEMENT_TYPES = [
  { value: 'homepage_inline_ad', label: 'Homepage — In-Feed Ad' },
  { value: 'homepage_sidebar_ad', label: 'Homepage — Sidebar Ad' },
  { value: 'homepage_business_spotlight', label: 'Homepage — Business Spotlight' },
  { value: 'calendar_inline_ad', label: 'Calendar — In-Grid Ad' },
  { value: 'calendar_inline_ad_list', label: 'Calendar — In-List Ad' },
  { value: 'calendar_editor_pick', label: 'Calendar — Editor Pick' },
  { value: 'guides_index_ad', label: 'Guides Index — Inline Ad' },
  { value: 'guide_directory_inline_ad', label: 'Guide Detail — Directory Ad' },
  { value: 'guide_thematic_article', label: 'Guide Detail — Thematic Article' },
  { value: 'listing_detail_sidebar_ad', label: 'Listing Detail — Sidebar Ad' },
  { value: 'listing_detail_inline_ad', label: 'Listing Detail — Inline Ad' },
  { value: 'article_inline_ad', label: 'Article — Inline Ad' },
];
```

### 11B — DONE WHEN

[ ] Admin ads dropdown updated with all 12 placement types
[ ] Form supports cta_label and ad_link (button CTA fields)
[ ] Existing 8 seeded ads still display correctly in admin

═══════════════════════════════════════════════════════
# PHASE 5 — POLISH + KNOWLEDGE BASE
═══════════════════════════════════════════════════════

## TASK 12 — DELETE OBSOLETE DOCS REFERENCES
═══════════════════════════════════════════════════════

### 12A — Update /docs/keepsharing-knowledge-base.md

Add Build Run #16 deployment section. Mark deprecated:
- Editorial design system (Apartment Therapy aesthetic)
- All `/components/editorial/` references
- The "magnificent issue" guide page architecture

Mark active:
- GHL Studio design system
- shadcn/ui components
- Tailwind theme tokens
- New page architecture (homepage / calendar / guides index / guide detail / listing detail / article)

### 12B — Delete /docs/editorial-design-system.md

This document captured the now-deprecated design language. Replace with /docs/ghl-design-system.md documenting:
- shadcn/ui foundation
- Tailwind theme tokens with HSL values
- Card pattern variations (featured / standard / ad / editor pick)
- Header band pattern
- Two-column layout pattern
- Sidebar widget patterns
- Button pattern hierarchy
- Image strategy

### 12C — DONE WHEN

[ ] Knowledge base updated with BR16 deployment + deprecations
[ ] /docs/ghl-design-system.md created
[ ] /docs/editorial-design-system.md deleted

═══════════════════════════════════════════════════════
## TASK 13 — VISUAL QUALITY CHECKPOINTS
═══════════════════════════════════════════════════════

Before declaring complete, verify each page renders correctly:

### 13A — Visit each URL and verify

1. **`/`** — homepage with trending ticker, Mom-to-Mom hero, summer camp side feature, community spotlights, upcoming events, in-feed DFC ad, parenting articles, sidebar with RRP Tutors ad + mini calendar + business spotlight + newsletter, footer
2. **`/calendar`** — calendar header band, filter pills, grid/list toggle, event cards with images, inline ads, editor pick card
3. **`/calendar/events/[slug]`** — single event detail
4. **`/local-guides`** — guides index with header band, featured partners strip, 9 guide cards in grid + 1 inline ad
5. **`/family-resource-guide`** through **`/special-needs-guide`** — guide detail pages (all 9) with header band, featured providers, A-Z directory with inline ad, sidebar with article + map + filter
6. **`/healthy-kids-guide/listings/dentistry-for-children`** — DFC listing detail with hero + about + sections + contact sidebar + related listings
7. **`/articles/[any-slug]`** — article reading experience
8. **`/admin/ads`** — admin ads management

### 13B — Mobile responsive test

Open Chrome DevTools mobile mode (390px). Verify each page renders without overflow or layout breaks.

### 13C — DONE WHEN

[ ] All 8 page types verified rendering correctly
[ ] No TypeScript errors in dev console
[ ] No broken imports
[ ] No 404s on data fetching
[ ] Mobile responsive verified

═══════════════════════════════════════════════════════
## TASK 14 — TRUTHFUL STATUS REPORT
═══════════════════════════════════════════════════════

### 14A — Required status report contents

For each task, document:
- Whether it shipped fully, partially, or didn't ship
- Migrations applied (037, 038)
- Components built
- Components deleted
- Pages live and verified
- Any partial work or deferred items

NO "all tasks completed" claims unless every checkbox in this prompt is verified.

### 14B — DONE WHEN

[ ] Truthful status report posted in chat with explicit per-task results

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Visit `/`** and see the GHL homepage with real River Region Parents data — trending ticker, Mom-to-Mom hero from a real article, summer camp side feature linking to summer-camp-guide, community spotlights with 3 honorees, upcoming events from the 113 May 2026 calendar events, DFC pediatric dentistry in-feed ad, real article cards in Parenting & Lifestyle, RRP Tutors sidebar ad, mini calendar widget, RRP Play Cafe business spotlight
2. **Visit `/calendar`** and see GHL calendar with grid/list toggle, working filters, all 113 events rendered with images or category fallbacks, inline DFC ads
3. **Visit `/local-guides`** and see the guides index with featured partners strip showing top featured listings cross-guide, all 9 guide cards with proper counts and pitches
4. **Visit any of the 9 guide URLs** and see the GHL guide detail with featured providers, A-Z directory with inline ad, sidebar with thematic article + map placeholder + filter widget
5. **Click any listing** and see the listing detail page with hero band, about section, contact sidebar, related listings
6. **Visit on mobile (390px)** and have a clean responsive experience throughout
7. **Open `/admin/ads`** and manage all 12 placement types with proper labels

═══════════════════════════════════════════════════════
## FINAL CHECKLIST
═══════════════════════════════════════════════════════

[ ] Phase 1 — Foundation
  [ ] shadcn/ui verified (button, card, badge, input)
  [ ] Tailwind theme tokens defined
  [ ] /src/components/editorial/ directory deleted
  [ ] /src/components/calendar/ directory deleted (BR13 version)
  [ ] Editorial CSS tokens stripped
  [ ] Obsolete pages deleted
  [ ] Navigation component built

[ ] Phase 2 — Port GHL Pages
  [ ] Migration 037 applied (trending_items, community_spotlights, homepage ad seeds)
  [ ] /src/app/page.tsx built (homepage)
  [ ] /src/app/calendar/page.tsx built (calendar)
  [ ] /src/app/calendar/events/[slug]/page.tsx built
  [ ] /src/app/local-guides/page.tsx built (guides index)
  [ ] GuideDetailPage component + 6 sub-components built
  [ ] All 9 guide page.tsx files updated

[ ] Phase 3 — New Pages
  [ ] ListingDetailPage component built
  [ ] All 9 guide /listings/[listingSlug] routes updated
  [ ] /src/app/articles/[slug]/page.tsx built

[ ] Phase 4 — Reskin Ads
  [ ] All 12 ad placement components reskinned
  [ ] Migration 038 applied (placement type renames)
  [ ] Admin ads dropdown updated

[ ] Phase 5 — Polish
  [ ] Knowledge base updated
  [ ] /docs/ghl-design-system.md created
  [ ] /docs/editorial-design-system.md deleted
  [ ] All 8 page types visually verified
  [ ] Mobile responsive verified
  [ ] Truthful status report posted

Then STOP.

═══════════════════════════════════════════════════════
## EMBEDDED REFERENCE — THE FOUR GHL STUDIO PAGES
═══════════════════════════════════════════════════════

Use these files as the EXACT visual reference. Match the className patterns, the layout structure, the spacing rhythm, the icon usage, the card treatments. Adapt the data sources to Supabase but preserve the visual presentation.

[INDEX.tsx — Homepage — full code embedded above in user's earlier message]

[EventCalendar.tsx — Calendar page — full code embedded above]

[Guides.tsx — Guides index — full code embedded above]

[GuideDetail.tsx — Guide detail page — full code embedded above]

When implementing, copy the className strings directly. Don't paraphrase styling. Don't substitute Tailwind classes for "equivalent" ones. Match exactly. The visual consistency depends on this.

GO.
