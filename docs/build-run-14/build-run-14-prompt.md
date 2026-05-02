# BUILD RUN #14 — Magnificent Issue Restoration

**This build restores the magnificent issue features that got dropped in Build Run #13. Each guide page becomes the full editorial destination it was supposed to be: featured listings strip, full listings grid, mid-page editorial ad slot, calendar peek, cross-link block, mom-to-mom quotes, newsletter signup. Family Resource Guide gets rebuilt as an editorial guide (not a listings directory). Calendar gallery view image host bug fixed.**

═══════════════════════════════════════════════════════
## CRITICAL FRAMING
═══════════════════════════════════════════════════════

Build Run #13 shipped the architecture (URLs, navigation, magazine TOC, calendar) but stripped down each guide page to: editorial intro + insider tips + 3 featured listings. The full magnificent issue experience specced in Build Run #13's Task 4 didn't fully ship. This build restores it.

What got lost that this build restores:
- Featured listings strip at top (paid Tier 1+ partners showcased before the listings grid)
- Full listings grid (currently truncated)
- Mid-page editorial ad slot
- Calendar peek per guide (events relevant to this guide topic)
- Cross-link block ("Also useful for [related guides]")
- Mom-to-Mom quotes section
- Newsletter signup at bottom of each guide page (with guide-specific tag)

Plus:
- Calendar gallery view crashes on event images hosted at Squarespace, Constant Contact, etc. — fix image host config
- Family Resource Guide currently shows "Listings coming soon" because it has no listings — but it shouldn't have listings, it's an editorial guide. Rebuild as editorial guide with articles + curated cross-guide highlights instead.

**STRICT TASK ORDER. STOP IF BLOCKED. NO PUSHING THROUGH.**

If a task fails after 3 attempts, document and STOP that task. Move to next. Truthful incomplete > confidently broken.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES
═══════════════════════════════════════════════════════

- **"We Help Your Future Customers Find You."** Tagline locked.
- **Each guide page IS a magnificent destination.** Editorial intro, featured partners showcased, listings to browse, ads in editorial-quality placement, calendar relevance, cross-links, mom-to-mom voice, newsletter capture. The full magazine experience.
- **Family Resource Guide is editorial, not a directory.** It curates the BEST of what's in the other guides for newcomers. Featured articles + cross-guide highlights + insider tips + calendar peek. NO "newcomer listings" — that's not what it is.
- **Featured listings earn premium placement.** Tier 1+ partners get the showcase strip at top. Tier "free" listings appear in the main grid. Visual hierarchy reinforces tier value.
- **Editorial ad slots are NOT banner ads.** They look like editorial cards. Sponsored eyebrow label, business hero image, headline, 1-line description, CTA. Same aesthetic as listings but with subtle sponsorship context.
- **Cross-weaving is the killer feature.** Every guide page links to relevant articles, related guides, upcoming events, mom-to-mom recommendations. The platform feels like a network.
- **Mobile-first.** Every section works on phone. Featured strip becomes horizontal scroll. Sidebar becomes stacked cards.
- **Fast. Helpful. Easy. Beautiful.** The four-word lens.

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve: file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, content writing.

STOP only on:
1. Unresolvable build/runtime errors after 3 attempts on a single task
2. Strategic decisions not specified in this prompt
3. Destructive operations (dropping production tables with real data)
4. Missing credentials in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md`
- `/docs/marketing-formula/23-point-proven-ad-formula.md`
- `/docs/editorial-design-system.md`
- `/src/components/editorial/GuideMagnificentIssue.tsx` (current state — TO BE EXTENDED)
- `/src/app/family-resource-guide/page.tsx` (current — TO BE REBUILT as editorial guide)
- `/src/components/editorial/AdSlot.tsx` (existing component from Build Run #12)
- `/src/components/editorial/CrossLinkBlock.tsx` (existing component from Build Run #12)
- `/src/components/calendar/CalendarGalleryView.tsx` (current state — image host bug)
- `next.config.ts` (image hosts config)

Existing data (do not re-import, just verify):
- 601 guide_listings rows
- 113 calendar_events rows
- 9 guide_types in database with editorial_intro, insider_tips, hero_image_url, pitch
- 0 newcomer guide_listings (correct — Family Resource Guide is editorial, not a directory)

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

```sql
SELECT 
  (SELECT COUNT(*) FROM guide_types) as guide_types,
  (SELECT COUNT(*) FROM guide_listings) as guide_listings,
  (SELECT COUNT(*) FROM calendar_events) as calendar_events,
  (SELECT COUNT(*) FROM guide_listings WHERE guide_type_slug = 'newcomer') as newcomer_listings;
```

Expected: 9 / 601 / 113 / 0. If different, document and pause.

```bash
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

═══════════════════════════════════════════════════════
## TASK 1 — FIX CALENDAR GALLERY VIEW IMAGE HOST CRASH
═══════════════════════════════════════════════════════

Calendar gallery view currently crashes when an event's hero_image_url comes from a domain not in next.config.ts allowed hosts. With ~50 events having OG-fetched images from various local websites (Squarespace, Constant Contact, custom domains), this happens frequently.

### 1A — Update next.config.ts image config

Open `next.config.ts`. Find the `images.remotePatterns` section.

Add a wildcard pattern that allows all hosts. This is appropriate for a community calendar where event organizers host images on hundreds of different domains. The trade-off is acceptable: images are pulled only from URLs explicitly stored in calendar_events, which were either submitted by event organizers or fetched from event websites we already trust enough to link to.

```typescript
images: {
  remotePatterns: [
    // Existing patterns — keep them all
    { protocol: 'https', hostname: 'images.unsplash.com' },
    // ... etc
    
    // ADD: wildcard for community calendar event images
    { protocol: 'https', hostname: '**' },
    { protocol: 'http', hostname: '**' },
  ],
},
```

### 1B — Defensive fallback in CalendarGalleryView

Even with the wildcard, individual images can fail (404s, timeouts, etc.). Update `/src/components/calendar/CalendarGalleryView.tsx` to handle image errors gracefully.

Pattern:

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';

function EventCardImage({ src, alt, category }: { src?: string; alt: string; category?: string }) {
  const [imageError, setImageError] = useState(false);
  
  if (!src || imageError) {
    // Fallback: category-themed gradient
    return (
      <div className="event-card-image-fallback" data-category={category || 'default'}>
        <div className="event-card-fallback-icon">{getCategoryIcon(category)}</div>
      </div>
    );
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      fill
      style={{ objectFit: 'cover' }}
      onError={() => setImageError(true)}
      unoptimized // bypass Next.js image optimization for community-uploaded images
    />
  );
}
```

The `unoptimized` prop is important — for community-uploaded images from random hosts, Next.js image optimization can fail or be slow. Bypassing it is appropriate here.

### 1C — Category fallback styling

In globals.css, add fallback styles:

```css
.event-card-image-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--ed-accent-soft), var(--ed-bg-subtle));
}

.event-card-image-fallback[data-category="festival"] { background: linear-gradient(135deg, #F4D9A8, #E8B889); }
.event-card-image-fallback[data-category="theater"] { background: linear-gradient(135deg, #C9A8D8, #B889C8); }
.event-card-image-fallback[data-category="music"] { background: linear-gradient(135deg, #A8C9D8, #89B8C8); }
.event-card-image-fallback[data-category="art"] { background: linear-gradient(135deg, #D8A8B8, #C889A0); }
.event-card-image-fallback[data-category="sports"] { background: linear-gradient(135deg, #A8D8B8, #89C898); }
.event-card-image-fallback[data-category="family"] { background: linear-gradient(135deg, #D8C9A8, #C8B889); }

.event-card-fallback-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}
```

### 1D — DONE WHEN

[ ] next.config.ts has wildcard image hostname
[ ] CalendarGalleryView handles image errors gracefully
[ ] Category fallback styling added
[ ] /calendar?view=gallery loads without crashing
[ ] Mix of real event images + category-fallback gradients renders correctly

═══════════════════════════════════════════════════════
## TASK 2 — FEATURED LISTINGS STRIP
═══════════════════════════════════════════════════════

The first thing every guide page should show after the editorial intro is a strip of featured listings — paid Tier 1+ partners getting premium showcase placement. This is one of the conversion mechanics: "Want this kind of placement? Become a partner."

### 2A — Build FeaturedListingsStrip component

Build `/src/components/editorial/FeaturedListingsStrip.tsx`:

- Accepts: `listings` (filtered to listing_tier IN ('featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight', 'tier-4-launch-engine'))
- Layout: horizontal strip of 3-4 cards on desktop, horizontal scrolling on mobile
- Each card: hero photo, business name (Fraunces serif), card_hook (italic, 1-2 sentences), neighborhood, "View Details →"
- Subtle "FEATURED" eyebrow on each card (terra accent)
- Section header: eyebrow "PARTNERS WORTH KNOWING", headline "Featured in This Guide"
- Whole card is a Link to the listing detail page

Component structure:

```typescript
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface FeaturedListing {
  id: string;
  guide_type_slug: string;
  advertiser: {
    business_name: string;
    slug: string;
    card_hook?: string;
    hero_photo_url?: string;
    neighborhood?: string;
    logo_url?: string;
  };
}

interface Props {
  guideUrlSlug: string; // e.g. "private-school-guide"
  listings: FeaturedListing[];
}

export function FeaturedListingsStrip({ guideUrlSlug, listings }: Props) {
  if (listings.length === 0) return null;
  
  return (
    <section className="featured-strip">
      <div className="ed-container">
        <div className="featured-strip-header">
          <p className="ed-eyebrow">Partners Worth Knowing</p>
          <h2 className="ed-h2">Featured in This Guide</h2>
        </div>
        <div className="featured-strip-cards">
          {listings.map(listing => (
            <Link 
              key={listing.id}
              href={`/${guideUrlSlug}/listings/${listing.advertiser.slug}`}
              className="featured-card"
            >
              {/* Card markup */}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Add to `/src/components/editorial/index.ts`:

```typescript
export { FeaturedListingsStrip } from './FeaturedListingsStrip';
```

### 2B — Editorial styling for featured strip

In globals.css, add:

```css
.featured-strip {
  background: var(--ed-bg-elevated);
  padding: var(--ed-space-2xl) 0;
  border-bottom: 1px solid var(--ed-border);
}

.featured-strip-header {
  margin-bottom: var(--ed-space-lg);
  text-align: center;
}

.featured-strip-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ed-space-md);
}

@media (max-width: 768px) {
  .featured-strip-cards {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: var(--ed-space-sm);
    padding-bottom: var(--ed-space-sm);
  }
  
  .featured-card {
    flex: 0 0 280px;
    scroll-snap-align: start;
  }
}

.featured-card {
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--ed-bg);
  border: 1px solid var(--ed-border);
  border-radius: var(--ed-radius-md);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.featured-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(31, 27, 22, 0.08);
}

.featured-card-eyebrow {
  font-size: var(--ed-text-eyebrow);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ed-accent);
  padding: var(--ed-space-sm) var(--ed-space-md) 0;
}

.featured-card-name {
  font-family: var(--ed-font-serif);
  font-size: var(--ed-text-h4);
  font-weight: 600;
  padding: var(--ed-space-sm) var(--ed-space-md) 0;
}

.featured-card-hook {
  font-family: var(--ed-font-serif);
  font-style: italic;
  font-size: var(--ed-text-small);
  color: var(--ed-text-muted);
  padding: 0 var(--ed-space-md) var(--ed-space-md);
  line-height: 1.5;
}
```

### 2C — Generate sample card_hooks for top 12 listings

Many imported listings don't have card_hooks (only DFC was seeded). Generate magazine-quality card_hooks for the top featured listings (those with `listing_tier = 'featured'` or paid tiers) so the strip looks substantial.

Create migration `032_seed_featured_card_hooks.sql`:

For each of the top featured listings across all guides, write a 1-sentence magazine-quality teaser that would make a mom click. Examples:

```sql
UPDATE advertiser_accounts 
SET card_hook = 'The pediatric dentist who designed her practice around making nervous kids actually want to come back.'
WHERE slug = 'dentistry-for-children';

UPDATE advertiser_accounts 
SET card_hook = 'A K-12 college-prep school where 100% of seniors get into college and 78% receive academic scholarships.'
WHERE slug = 'saint-james-school';

UPDATE advertiser_accounts 
SET card_hook = 'Where River Region kids have learned music for 50 years — group classes, private lessons, and the patient teachers who make it stick.'
WHERE slug = 'guitar-center';

-- Continue for top 10-15 featured listings across all guides
-- Use AI generation if needed for businesses with thin info
```

Pattern: 1 sentence, specific, intriguing, never salesy. Demonstrates expertise without bragging. Makes mom curious enough to click.

### 2D — DONE WHEN

[ ] FeaturedListingsStrip component built
[ ] Component exports from editorial barrel
[ ] Styling in globals.css
[ ] Migration 032 with 10+ card_hooks seeded
[ ] Component verified rendering on test guide page

═══════════════════════════════════════════════════════
## TASK 3 — REBUILD GUIDE MAGNIFICENT ISSUE COMPONENT
═══════════════════════════════════════════════════════

Restructure `/src/components/editorial/GuideMagnificentIssue.tsx` to render the FULL magnificent experience.

### 3A — New component structure

The component should render in this order (top to bottom):

1. **EditorialHero** — eyebrow ("PRIVATE SCHOOL GUIDE 2026"), headline (display_name), lead (hub_intro_paragraph), hero image
2. **Editorial intro paragraphs** — guide_types.editorial_intro (substantial 2-3 paragraphs of insider context)
3. **FeaturedListingsStrip** — paid partners showcased (NEW from Task 2)
4. **CategoryFilterStrip** — sticky, all categories with counts
5. **Two-column layout starting here:**
   - **Left column (main content, ~70%):**
     - Full listings grid using ListingCard component, paginated if 30+
     - **Mid-page editorial AdSlot** rendered after every 9 listings (or once mid-page if <18 listings)
     - Continue listings
   - **Right column (sidebar, ~30%):**
     - **Insider Tips** card (existing — guide_types.insider_tips)
     - **Calendar peek** card — upcoming events relevant to this guide topic (3-4 events)
     - **Cross-link block** — "Also useful for" with 2-3 related GuideShowcase compact cards
6. **Mom-to-Mom Recommendations section** — full-width section below 2-column area
   - Eyebrow "MOM-TO-MOM"
   - Headline "What Local Families Say"
   - 2-3 quote cards in editorial style (large quote marks, italic Fraunces, attribution)
   - For now: seeded placeholder quotes per guide (real ones come from reader_submissions later)
7. **Newsletter signup section** — full-width, guide-specific tag
8. **EditorialFooter**

### 3B — Component code structure

```typescript
'use client';

import { EditorialHero } from './EditorialHero';
import { FeaturedListingsStrip } from './FeaturedListingsStrip';
import { CategoryFilterStrip } from './CategoryFilterStrip';
import { ListingCard } from './ListingCard';
import { AdSlot } from './AdSlot';
import { CrossLinkBlock } from './CrossLinkBlock';
import { GuideShowcase } from './GuideShowcase';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
import { EditorialLayout } from './EditorialLayout';
import { EditorialHeader } from './EditorialHeader';

interface Props {
  guide: GuideType; // including editorial_intro, insider_tips, hero_image_url, pitch
  listings: GuideListing[]; // all published listings for this guide
  featuredListings: GuideListing[]; // subset filtered to paid tiers
  categories: Array<{ name: string; count: number }>; // distinct categories with counts
  upcomingEvents: CalendarEvent[]; // next 3-4 events relevant to this guide
  relatedGuides: GuideType[]; // 2-3 related guides for cross-link block
  momToMomQuotes: MomQuote[]; // seeded for now
  ads: AdSlotData[]; // active ads for this guide
}

export function GuideMagnificentIssue({
  guide,
  listings,
  featuredListings,
  categories,
  upcomingEvents,
  relatedGuides,
  momToMomQuotes,
  ads,
}: Props) {
  // Filter listings by selected category from URL state
  // Render the full magnificent issue
}
```

### 3C — Insert ad slots between listings

Logic: render listings in groups, insert AdSlot after every 9 listings (or once mid-page if total < 18).

```typescript
function ListingsWithAds({ listings, ads }: { listings: Listing[]; ads: AdSlotData[] }) {
  if (listings.length < 18) {
    // Single ad slot mid-grid
    const midpoint = Math.floor(listings.length / 2);
    return (
      <>
        {listings.slice(0, midpoint).map(l => <ListingCard key={l.id} listing={l} />)}
        {ads[0] && <AdSlot ad={ads[0]} />}
        {listings.slice(midpoint).map(l => <ListingCard key={l.id} listing={l} />)}
      </>
    );
  }
  
  // Multiple ad slots every 9 listings
  const result = [];
  for (let i = 0; i < listings.length; i++) {
    result.push(<ListingCard key={listings[i].id} listing={listings[i]} />);
    if ((i + 1) % 9 === 0 && ads[Math.floor(i / 9)]) {
      result.push(<AdSlot key={`ad-${i}`} ad={ads[Math.floor(i / 9)]} />);
    }
  }
  return <>{result}</>;
}
```

### 3D — Sidebar layout with sticky behavior

The right sidebar (insider tips + calendar peek + cross-links) should be sticky on desktop scroll. On mobile, it stacks below the listings.

```css
.guide-issue-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ed-space-xl);
}

@media (min-width: 1024px) {
  .guide-issue-layout {
    grid-template-columns: 2.3fr 1fr;
  }
}

.guide-issue-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--ed-space-lg);
}

@media (min-width: 1024px) {
  .guide-issue-sidebar {
    position: sticky;
    top: 100px;
    align-self: start;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }
}
```

### 3E — DONE WHEN

[ ] GuideMagnificentIssue rebuilt with full structure
[ ] Featured listings strip renders for guides with paid tier listings
[ ] Full listings grid shows ALL listings (not just 3)
[ ] Ad slots interleaved between listings
[ ] Two-column layout with sticky sidebar on desktop
[ ] Sidebar shows insider tips + calendar peek + cross-links
[ ] Mom-to-mom section renders below
[ ] Newsletter signup at bottom
[ ] Mobile responsive (sidebar stacks, featured becomes horizontal scroll)

═══════════════════════════════════════════════════════
## TASK 4 — CALENDAR PEEK PER GUIDE
═══════════════════════════════════════════════════════

Each guide page should show 3-4 upcoming events relevant to its topic.

### 4A — Event-to-guide categorization

Calendar events don't currently have guide associations. Two approaches:

**Approach A — Tag events with relevant_guide_slugs (cleanest)**

Add column:
```sql
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS relevant_guide_slugs TEXT[] DEFAULT '{}';
```

Populate based on event category and content. For example:
- Art workshops → tag with summer-fun, afterschool
- Open houses at schools → private-school
- Family festivals → family (newcomer / family-resource)
- Birthday party venues holding events → birthday-party
- Pediatric health screenings → healthy-kids

**Approach B — Smart query at runtime (simpler, less precise)**

Match events to guides by keyword search in title and description. Example: events containing "school" → private-school guide, events containing "art" or "music" → afterschool guide, etc.

For this build, use Approach B (simpler). Keyword matching at query time. Migration 033 can later refine with proper tags if needed.

### 4B — Build event filtering utility

Create `/src/lib/guide-event-relevance.ts`:

```typescript
const GUIDE_EVENT_KEYWORDS: Record<string, string[]> = {
  'newcomer': [], // shows ALL upcoming events (Family Resource Guide is general)
  'private-school': ['school', 'open house', 'campus', 'tour', 'admissions'],
  'summer-camp': ['camp', 'summer program', 'overnight'],
  'childcare': ['preschool', 'daycare', 'toddler', 'early learning'],
  'healthy-kids': ['health', 'doctor', 'pediatric', 'wellness', 'screening', 'vaccine', 'fitness'],
  'summer-fun': ['summer', 'outdoor', 'pool', 'splash', 'festival', 'park'],
  'birthday-party': ['birthday', 'party', 'celebration'],
  'afterschool': ['art', 'music', 'sports', 'dance', 'class', 'workshop', 'lessons'],
  'special-needs': ['inclusive', 'special needs', 'sensory', 'accessible', 'autism', 'adaptive'],
};

export function getEventsRelevantToGuide(
  events: CalendarEvent[], 
  guideSlug: string,
  limit: number = 4
): CalendarEvent[] {
  if (guideSlug === 'newcomer') {
    // Family Resource Guide shows the most upcoming events generally
    return events.slice(0, limit);
  }
  
  const keywords = GUIDE_EVENT_KEYWORDS[guideSlug] || [];
  if (keywords.length === 0) return events.slice(0, limit);
  
  const scored = events.map(event => {
    const text = `${event.title} ${event.description || ''} ${event.category || ''}`.toLowerCase();
    const score = keywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 1 : 0), 0);
    return { event, score };
  });
  
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ event }) => event);
}
```

### 4C — Build CalendarPeek component

`/src/components/editorial/CalendarPeek.tsx`:

```typescript
'use client';

import Link from 'next/link';

interface Props {
  events: CalendarEvent[];
  title?: string;
  guideSlug?: string;
}

export function CalendarPeek({ events, title = "Coming Up Soon", guideSlug }: Props) {
  if (events.length === 0) return null;
  
  return (
    <div className="ed-card calendar-peek">
      <p className="ed-eyebrow">{title}</p>
      <ul className="calendar-peek-list">
        {events.map(event => (
          <li key={event.id}>
            <Link href={`/calendar/events/${event.slug}`} className="calendar-peek-item">
              <div className="calendar-peek-date">
                <span className="calendar-peek-month">
                  {new Date(event.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="calendar-peek-day">
                  {new Date(event.start_date + 'T12:00:00').getDate()}
                </span>
              </div>
              <div className="calendar-peek-content">
                <p className="calendar-peek-title">{event.title}</p>
                {event.location_name && (
                  <p className="calendar-peek-location">{event.location_name}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/calendar" className="calendar-peek-cta">
        View full calendar →
      </Link>
    </div>
  );
}
```

### 4D — DONE WHEN

[ ] Event relevance utility built
[ ] CalendarPeek component built and styled
[ ] Component exports from editorial barrel
[ ] Each guide page shows 3-4 relevant upcoming events in sidebar
[ ] "View full calendar →" link works

═══════════════════════════════════════════════════════
## TASK 5 — MOM-TO-MOM QUOTES SEEDING
═══════════════════════════════════════════════════════

Each guide should have 2-3 mom-to-mom quote cards. For now, these are seeded placeholder quotes that demonstrate the platform's voice.

### 5A — Migration 033: mom_to_mom_quotes table

```sql
CREATE TABLE IF NOT EXISTS mom_to_mom_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_type_slug TEXT REFERENCES guide_types(slug),
  quote TEXT NOT NULL,
  attribution_name TEXT, -- "Sarah M., mom of 3"
  attribution_context TEXT, -- "Pike Road" or "newcomer 2024"
  related_advertiser_id UUID REFERENCES advertiser_accounts(id),
  is_published BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mom_quotes_guide ON mom_to_mom_quotes(guide_type_slug, is_published);
```

### 5B — Seed quotes per guide

Write 2-3 authentic-sounding placeholder quotes for each of the 9 guides. Voice: warm, specific, conversational. Like a real mom recommending something to a friend at school pickup.

Example for newcomer:

```sql
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('newcomer', 'I moved here from Denver and the moms at the playground absorbed me into their group within a month. There''s something different about Southern hospitality — it''s real here.', 'Hannah K., mom of 2', 'Pike Road, moved 2024', 1),
('newcomer', 'My biggest tip: visit the schools BEFORE you decide where to live. The school you want will determine your neighborhood, not the other way around.', 'Megan T., mom of 3', 'Montgomery, moved 2023', 2),
('newcomer', 'The Saturday morning Curb Market is the fastest way to feel like a local. Go three weeks in a row and the vendors will start remembering you.', 'Ashley B., mom of 2', 'Wetumpka, lived here 5 years', 3);
```

Continue for all 8 other guides — write 2-3 quotes each that feel authentic to that guide topic. Total ~20-25 quotes.

### 5C — Build MomToMomSection component

`/src/components/editorial/MomToMomSection.tsx`:

```typescript
'use client';

interface Quote {
  id: string;
  quote: string;
  attribution_name: string;
  attribution_context?: string;
}

interface Props {
  quotes: Quote[];
  title?: string;
}

export function MomToMomSection({ quotes, title = "What Local Families Say" }: Props) {
  if (quotes.length === 0) return null;
  
  return (
    <section className="mom-to-mom-section">
      <div className="ed-container">
        <div className="mom-to-mom-header">
          <p className="ed-eyebrow">Mom-to-Mom</p>
          <h2 className="ed-h2">{title}</h2>
        </div>
        <div className="mom-to-mom-grid">
          {quotes.map(quote => (
            <article key={quote.id} className="mom-to-mom-card">
              <p className="mom-to-mom-quote-mark">"</p>
              <blockquote className="mom-to-mom-quote">{quote.quote}</blockquote>
              <p className="mom-to-mom-attribution">
                <span className="attribution-name">— {quote.attribution_name}</span>
                {quote.attribution_context && (
                  <span className="attribution-context">{quote.attribution_context}</span>
                )}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Styling:

```css
.mom-to-mom-section {
  background: var(--ed-bg-subtle);
  padding: var(--ed-space-3xl) 0;
  border-top: 1px solid var(--ed-border);
  border-bottom: 1px solid var(--ed-border);
}

.mom-to-mom-header {
  text-align: center;
  margin-bottom: var(--ed-space-2xl);
}

.mom-to-mom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ed-space-lg);
  max-width: 1100px;
  margin: 0 auto;
}

.mom-to-mom-card {
  background: var(--ed-bg-elevated);
  padding: var(--ed-space-lg);
  border-radius: var(--ed-radius-md);
  position: relative;
  border: 1px solid var(--ed-border);
}

.mom-to-mom-quote-mark {
  font-family: var(--ed-font-serif);
  font-size: 4rem;
  line-height: 1;
  color: var(--ed-accent);
  margin: -8px 0 -16px;
  opacity: 0.4;
}

.mom-to-mom-quote {
  font-family: var(--ed-font-serif);
  font-style: italic;
  font-size: 1.125rem;
  line-height: 1.55;
  color: var(--ed-text);
  margin: 0 0 var(--ed-space-md);
}

.mom-to-mom-attribution {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attribution-name {
  font-weight: 600;
  font-size: var(--ed-text-small);
  color: var(--ed-text);
}

.attribution-context {
  font-size: var(--ed-text-caption);
  color: var(--ed-text-soft);
}
```

### 5D — DONE WHEN

[ ] Migration 033 applied
[ ] mom_to_mom_quotes table populated with 20-25 seeded quotes
[ ] MomToMomSection component built and styled
[ ] Component renders on each guide page above newsletter

═══════════════════════════════════════════════════════
## TASK 6 — REBUILD FAMILY RESOURCE GUIDE AS EDITORIAL GUIDE
═══════════════════════════════════════════════════════

Family Resource Guide currently shows "Listings coming soon" because it has no listings — and shouldn't. It's an editorial guide for newcomers, not a directory.

### 6A — Custom page composition

`/src/app/family-resource-guide/page.tsx` should NOT use GuideMagnificentIssue. Build a custom editorial page:

1. **EditorialHeader**
2. **EditorialHero** — hero image, eyebrow "FAMILY RESOURCE GUIDE 2026", headline "Family Resource Guide", lead (the hub_intro_paragraph)
3. **Editorial intro section** — full editorial_intro paragraphs in narrow column (max-width 720px), serif body text, generous line-height
4. **"Where to Start" section** — curated cross-guide highlights:
   - Section eyebrow "WHERE TO START"
   - Section headline "The First 5 Things to Figure Out"
   - 5 numbered cards, each pointing to a different guide:
     1. **Schools** → "Most newcomers focus on schools first — start with our Private School Guide" → links to /private-school-guide
     2. **Healthcare** → "Find pediatricians and specialists trusted by River Region families" → /healthy-kids-guide
     3. **Childcare** → "If your kids are pre-K, this matters fast" → /childcare-guide
     4. **Things to Do** → "Connect with the community through events and activities" → /summer-fun-guide
     5. **Special Needs** → "If you have a child with special needs, here are local resources" → /special-needs-guide
5. **Featured Articles section** — pull articles from guide_articles WHERE category = 'newcomer' OR category IS NULL (general interest articles)
6. **Insider Tips** — full-width version of the insider tips list
7. **Calendar Peek** — upcoming general events
8. **GuideShowcase** in compact mode showing all 9 guides
9. **Mom-to-Mom Recommendations** specific to newcomers
10. **Newsletter Signup** with source='guide-newcomer', tag='interest-newcomer'
11. **EditorialFooter**

### 6B — "Where to Start" component

Build `/src/components/editorial/WhereToStart.tsx`:

```typescript
'use client';

import Link from 'next/link';

interface Step {
  number: number;
  title: string;
  description: string;
  href: string;
  guideName: string;
}

interface Props {
  steps: Step[];
}

export function WhereToStart({ steps }: Props) {
  return (
    <section className="where-to-start">
      <div className="ed-container">
        <div className="where-to-start-header">
          <p className="ed-eyebrow">Where to Start</p>
          <h2 className="ed-h2">The First 5 Things to Figure Out</h2>
          <p className="ed-body-lead">If you're new here, work through these in order. Each one links to the relevant guide where we've done the research for you.</p>
        </div>
        <ol className="where-to-start-steps">
          {steps.map(step => (
            <li key={step.number}>
              <Link href={step.href} className="where-to-start-card">
                <div className="step-number">{step.number}</div>
                <div className="step-content">
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                  <p className="step-cta">{step.guideName} →</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

Styling:

```css
.where-to-start {
  padding: var(--ed-space-3xl) 0;
}

.where-to-start-header {
  text-align: center;
  margin-bottom: var(--ed-space-2xl);
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
}

.where-to-start-steps {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ed-space-md);
  max-width: 760px;
  margin: 0 auto;
}

.where-to-start-card {
  display: flex;
  gap: var(--ed-space-md);
  padding: var(--ed-space-lg);
  background: var(--ed-bg-elevated);
  border: 1px solid var(--ed-border);
  border-radius: var(--ed-radius-md);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.where-to-start-card:hover {
  transform: translateX(4px);
  border-color: var(--ed-accent);
  box-shadow: 0 4px 16px rgba(196, 98, 45, 0.08);
}

.step-number {
  flex: 0 0 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--ed-accent-soft);
  color: var(--ed-accent-deep);
  font-family: var(--ed-font-serif);
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-title {
  font-family: var(--ed-font-serif);
  font-weight: 600;
  font-size: var(--ed-text-h4);
  margin: 0 0 4px;
}

.step-description {
  font-size: var(--ed-text-body);
  color: var(--ed-text-muted);
  margin: 0 0 8px;
  line-height: 1.55;
}

.step-cta {
  font-size: var(--ed-text-small);
  font-weight: 600;
  color: var(--ed-accent);
  margin: 0;
}
```

### 6C — DONE WHEN

[ ] /family-resource-guide rebuilt as custom editorial page
[ ] Does NOT show "Listings coming soon"
[ ] WhereToStart component renders 5 numbered steps cross-linking to other guides
[ ] Insider tips full-width
[ ] Calendar peek with general events
[ ] All 9 guides as GuideShowcase compact strip
[ ] Mom-to-mom quotes specific to newcomer guide
[ ] Newsletter signup with newcomer tag

═══════════════════════════════════════════════════════
## TASK 7 — DATA FETCHING UPDATES IN GUIDE PAGES
═══════════════════════════════════════════════════════

Each individual guide page (`/private-school-guide`, etc.) needs to fetch all the new data the magnificent issue requires.

### 7A — Update getData function in guide pages

For each of the 9 guide page files (or the shared component), update the data fetching to include:

```typescript
async function getGuideData(guideSlug: string) {
  const supabase = createClient(...);
  
  // 1. Guide type with editorial content
  const { data: guide } = await supabase
    .from('guide_types')
    .select('*')
    .eq('url_slug', guideSlug)
    .single();
  
  // 2. All listings for this guide
  const { data: listings } = await supabase
    .from('guide_listings')
    .select(`
      *,
      advertiser:advertiser_accounts(*)
    `)
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .order('listing_tier', { ascending: false }) // featured first
    .order('display_order');
  
  // 3. Featured listings (subset)
  const featuredListings = (listings || []).filter(l => 
    ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 
     'tier-3-business-spotlight', 'tier-4-launch-engine'].includes(l.listing_tier)
  );
  
  // 4. Distinct categories with counts
  const categoryMap = new Map();
  (listings || []).forEach(l => {
    if (l.category) {
      categoryMap.set(l.category, (categoryMap.get(l.category) || 0) + 1);
    }
  });
  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  // 5. Upcoming events relevant to this guide
  const today = new Date().toISOString().split('T')[0];
  const { data: allEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('status', 'published')
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(40); // get many, filter in code
  
  const upcomingEvents = getEventsRelevantToGuide(allEvents || [], guide.slug, 4);
  
  // 6. Related guides (for cross-link block)
  const RELATED_GUIDES_MAP: Record<string, string[]> = {
    'private-school': ['afterschool', 'summer-camp'],
    'summer-camp': ['summer-fun', 'afterschool'],
    'childcare': ['private-school', 'newcomer'],
    'healthy-kids': ['special-needs', 'newcomer'],
    'summer-fun': ['summer-camp', 'birthday-party'],
    'birthday-party': ['summer-fun'],
    'afterschool': ['summer-camp', 'private-school'],
    'special-needs': ['healthy-kids'],
    'newcomer': ['private-school', 'healthy-kids', 'childcare'],
  };
  
  const relatedSlugs = RELATED_GUIDES_MAP[guide.slug] || [];
  const { data: relatedGuides } = await supabase
    .from('guide_types')
    .select('*')
    .in('slug', relatedSlugs);
  
  // 7. Mom-to-mom quotes for this guide
  const { data: momQuotes } = await supabase
    .from('mom_to_mom_quotes')
    .select('*')
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .order('display_order')
    .limit(3);
  
  // 8. Active ads for this guide
  const { data: ads } = await supabase
    .from('guide_ad_slots')
    .select('*')
    .eq('guide_type_slug', guide.slug)
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`);
  
  return {
    guide,
    listings: listings || [],
    featuredListings,
    categories,
    upcomingEvents,
    relatedGuides: relatedGuides || [],
    momToMomQuotes: momQuotes || [],
    ads: ads || [],
  };
}
```

### 7B — DONE WHEN

[ ] All 8 guide pages (excluding family-resource-guide which is custom) fetch full magnificent issue data
[ ] Featured listings appear at top of each guide page
[ ] Full listings grid renders all listings
[ ] Sidebar populated with insider tips, calendar peek, cross-links
[ ] Mom-to-mom quotes render
[ ] Newsletter signup at bottom

═══════════════════════════════════════════════════════
## TASK 8 — VERIFICATION + KNOWLEDGE BASE
═══════════════════════════════════════════════════════

### 8A — Visit each page and verify

After all tasks complete:

1. `/private-school-guide` — featured strip + 42 listings + sidebar + mom-to-mom + newsletter
2. `/healthy-kids-guide` — same structure with 76 listings, including DFC featured at top
3. `/family-resource-guide` — custom editorial page, NO "listings coming soon", has WhereToStart, GuideShowcase
4. `/calendar?view=gallery` — works without crashing, shows mix of real images and category fallbacks
5. `/local-guides` — magazine TOC still works, hero image loads

### 8B — Update knowledge base

Add to `/docs/keepsharing-knowledge-base.md`:

```markdown
## BUILD RUN #14 — DEPLOYED [DATE]

### What Shipped:
- FeaturedListingsStrip component (paid partners showcased prominently)
- GuideMagnificentIssue rebuilt with full structure (featured strip, listings grid with interleaved ads, sticky sidebar)
- CalendarPeek component (events relevant to each guide)
- MomToMomSection component (seeded quotes per guide)
- WhereToStart component (custom for Family Resource Guide)
- Family Resource Guide rebuilt as editorial guide (not directory)
- Calendar gallery view image host crash fixed (wildcard hostname)
- 20-25 mom-to-mom quotes seeded
- 10+ card_hooks seeded for top featured listings
- Event-to-guide relevance utility

### New Migrations:
- 032_seed_featured_card_hooks.sql
- 033_mom_to_mom_quotes.sql

### What's Next:
- Build Run #15: Newsletter redesign + Annual update + Upsell engine
- Build Run #16: Knowledge base + AI chat support layer
```

### 8C — Truthful status report

- Migrations 032 + 033 applied
- All 9 guide pages rendering full magnificent issue
- Calendar gallery view fixed
- Family Resource Guide as editorial guide
- Any tasks deferred or partial documented honestly

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Visit `/private-school-guide`** and see: editorial intro + Featured Listings strip with paid partners + category filter + full listings grid (38 schools) + mid-page editorial ad + sticky sidebar with insider tips + 4 upcoming relevant events + cross-link to afterschool guide + mom-to-mom quotes + newsletter signup
2. **Visit `/family-resource-guide`** and see: editorial hero + intro + WhereToStart 5-step cross-guide guide + featured articles + insider tips + calendar peek + GuideShowcase compact + mom-to-mom + newsletter
3. **Visit `/calendar?view=gallery`** without it crashing — sees mix of real OG-fetched images and category-themed gradient fallbacks
4. **Click any featured listing card** and land on the listing detail page

═══════════════════════════════════════════════════════
## FINAL CHECKLIST
═══════════════════════════════════════════════════════

[ ] next.config.ts wildcard image hostname added
[ ] CalendarGalleryView handles errors with category fallbacks
[ ] FeaturedListingsStrip component built
[ ] Migration 032 applied (card_hooks seeded)
[ ] GuideMagnificentIssue rebuilt with full structure
[ ] AdSlot interleaving in listings grid
[ ] Two-column layout with sticky sidebar
[ ] CalendarPeek component built
[ ] Migration 033 applied (mom_to_mom_quotes table)
[ ] 20-25 mom-to-mom quotes seeded
[ ] MomToMomSection component built
[ ] WhereToStart component built
[ ] Family Resource Guide page rebuilt as editorial
[ ] All 9 guide pages render full magnificent issue
[ ] Knowledge base updated
[ ] Truthful status report posted

Then STOP.

GO.
