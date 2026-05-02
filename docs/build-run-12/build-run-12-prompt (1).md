# BUILD RUN #12 — Editorial Design System + Family Resource Guide Architecture + 9 Category Pages + Listing Rebuild + CSV Imports

**This build establishes the editorial design language for the Family Resource Guide ecosystem and ports all 8 cleaned CSV files (714 listings + 113 calendar events) into the platform. It restructures the guide architecture so each guide category gets its own dedicated page rather than scrolling everything on one hub. It implements the magazine-quality "warm editorial" design language inspired by Apartment Therapy. It rebuilds listing detail pages with flexible conditional sections.**

═══════════════════════════════════════════════════════
## CRITICAL FRAMING
═══════════════════════════════════════════════════════

This is THE foundation build for the editorial side of the platform. Two distinct design languages must coexist on the platform:

**Mode 1: Utility** — homepage, /advertise, /get-media-kit, all admin pages, partner offer pages, business spotlight forms. Clean, fast, conversion-focused. No magazine treatment.

**Mode 2: Editorial** — Family Resource Guide hub, all 9 guide category pages, listing detail pages, articles, calendar, spotlights. Magazine-quality immersive experience. Generous typography. Real photography. Sophisticated whimsy. The "I'm here to discover" mode.

This build delivers Mode 2 to the entire Family Resource Guide ecosystem. Mode 1 is already in place for everything else and stays as is.

**STRICT TASK ORDER. STOP IF BLOCKED. NO PUSHING THROUGH.**

If a task fails after 3 attempts, document and STOP that task. Move to next. Truthful incomplete > confidently broken.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES
═══════════════════════════════════════════════════════

- **"We Help Your Future Customers Find You."** Tagline locked.
- **The Editorial Design Language is Apartment Therapy with River Region warmth.** Generous spacing. Sophisticated typography (Fraunces serif headers, DM Sans body). Real local photography. Color used as accent, not personality. Subtle whimsy. NEVER kiddy. NEVER over-designed.
- **The 23 Points formula is a way of thinking, not a checklist.** Each listing detail page should read like an editorial feature, not an info dump.
- **Each guide is its OWN destination.** Hub page is a beautiful overview. Each guide category gets its own page where she goes deep. NO trying to scroll through everything from one URL.
- **Same consistent visual across all 9 guides.** Same layout components, same typography scale, same spacing rhythm. What varies: photography, editorial intro, category-specific filters, ads. Sustainable design discipline.
- **Cross-weaving is the killer feature.** Every listing links to related listings. Every guide links to relevant articles. Every article links back to relevant guides and calendar events. The platform feels like a network, not sections.
- **Ad slots earn premium pricing because they're editorial-quality placements.** 2-3 per category page, integrated into the design, not banner-style. School advertisers pay more to be on Schools page. That's higher CPM.
- **Mobile-first responsive.** Every page must work on a phone. Sticky search + category bar. NO bottom nav bar within guide context (that's site-level navigation).
- **Fast. Helpful. Easy. Beautiful.** Four-word lens for every design decision.

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve: file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, content writing, CSV processing.

STOP only on:
1. Unresolvable build/runtime errors after 3 attempts on a single task
2. Strategic decisions not specified in this prompt
3. Destructive operations (dropping tables, deleting production data)
4. Missing credentials in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md`
- `/docs/marketing-formula/23-point-proven-ad-formula.md`
- `/src/components/partner-engine/templates/ConsultBookingFunnel.tsx` (the conditional section pattern reference — apply same logic to listings)
- `/src/app/newcomer-guide/listings/[slug]/page.tsx` (existing listing detail — TO BE REBUILT)
- `/src/app/newcomer-guide/page.tsx` (existing guide hub — TO BE RESTRUCTURED)
- `/src/app/globals.css` (existing CSS variables — extend with editorial design tokens)
- `/src/app/advertise/page.tsx` (utility mode reference — DO NOT change this)

Existing files in `imports/guides/`:
- afterschool-guide.csv (85 rows, 12 cols)
- birthday-party-guide.csv (93 rows, 11 cols)
- childcare-guide.csv (49 rows, 16 cols)
- healthy-kids-guide.csv (76 rows, 11 cols)
- private-school-guide.csv (42 rows, 15 cols)
- special-needs-guide.csv (143 rows, 11 cols)
- summer-fun-guide.csv (113 rows, 12 cols)

Existing file in `imports/calendar/`:
- may-2026-calendar.csv (113 events)

Verify both folders exist and contain those files before starting.

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('advertiser_accounts', 'guide_articles', 'newsletter_subscribers');
```
Should return 3 rows. If not, stop.

```bash
Remove-Item -Recurse -Force .next
npm run dev
```
Wait for "Ready". If errors, stop and fix.

═══════════════════════════════════════════════════════
## TASK 1 — EDITORIAL DESIGN SYSTEM FOUNDATION
═══════════════════════════════════════════════════════

Build the design tokens, typography scale, layout components, and CSS that establish the editorial language. This becomes the foundation for every Family Resource Guide page.

### 1A — Add editorial design tokens to globals.css

In `/src/app/globals.css`, ADD a new section (do not remove existing tokens — utility mode still uses them):

```css
/* ═══════════════════════════════════════════════════════════
   EDITORIAL DESIGN SYSTEM — for Family Resource Guide,
   articles, calendar, listing detail pages, spotlights
   ═══════════════════════════════════════════════════════════ */

:root {
  /* Editorial color palette — warm magazine */
  --ed-bg: #FAF8F4;             /* warm cream page background */
  --ed-bg-elevated: #FFFFFF;    /* cards, elevated surfaces */
  --ed-bg-subtle: #F4F0E8;      /* subtle bg variation */
  
  --ed-text: #1F1B16;           /* primary text — warm near-black */
  --ed-text-muted: #5C5247;     /* secondary text — warm gray */
  --ed-text-soft: #8A7F71;      /* tertiary text — soft warm */
  
  --ed-accent: #C4622D;         /* warm terracotta — sparingly used */
  --ed-accent-soft: #E8C7A8;    /* soft terra for backgrounds */
  --ed-accent-deep: #8C4A1F;    /* deep terra for emphasis */
  
  --ed-link: #1A4A5C;           /* deep teal for links */
  --ed-link-hover: #C4622D;     /* terra on hover */
  
  --ed-border: #E5DDD0;         /* subtle warm border */
  --ed-border-strong: #C9BEA8;  /* defined borders */
  
  /* Editorial typography scale */
  --ed-font-serif: 'Fraunces', Georgia, serif;
  --ed-font-sans: 'DM Sans', -apple-system, sans-serif;
  
  --ed-text-display: clamp(2.5rem, 5vw, 4.5rem);    /* hero headlines */
  --ed-text-h1: clamp(2rem, 3.5vw, 3.25rem);        /* page titles */
  --ed-text-h2: clamp(1.5rem, 2.5vw, 2.25rem);      /* section headers */
  --ed-text-h3: clamp(1.25rem, 1.75vw, 1.625rem);   /* subsections */
  --ed-text-h4: 1.125rem;                            /* small headers */
  --ed-text-body: 1.0625rem;                         /* body 17px */
  --ed-text-body-lg: 1.1875rem;                      /* lead paragraphs 19px */
  --ed-text-small: 0.9375rem;                        /* small text 15px */
  --ed-text-caption: 0.8125rem;                      /* captions 13px */
  --ed-text-eyebrow: 0.6875rem;                      /* eyebrow labels 11px */
  
  /* Editorial spacing scale — generous */
  --ed-space-xs: 0.5rem;        /* 8px */
  --ed-space-sm: 1rem;          /* 16px */
  --ed-space-md: 1.5rem;        /* 24px */
  --ed-space-lg: 2.5rem;        /* 40px */
  --ed-space-xl: 4rem;          /* 64px */
  --ed-space-2xl: 6rem;         /* 96px */
  --ed-space-3xl: 8rem;         /* 128px — section breaks */
  
  /* Editorial layout */
  --ed-container: 1200px;
  --ed-container-narrow: 720px;  /* article width */
  --ed-container-wide: 1400px;   /* gallery width */
  
  /* Editorial radius */
  --ed-radius-sm: 6px;
  --ed-radius-md: 12px;
  --ed-radius-lg: 20px;
  --ed-radius-xl: 32px;
}

/* ── Editorial body class (apply to <body> on editorial pages) ── */
body.editorial {
  background-color: var(--ed-bg);
  color: var(--ed-text);
  font-family: var(--ed-font-sans);
  font-size: var(--ed-text-body);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

/* ── Editorial typography classes ── */
.ed-display {
  font-family: var(--ed-font-serif);
  font-weight: 700;
  font-size: var(--ed-text-display);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--ed-text);
}

.ed-h1 {
  font-family: var(--ed-font-serif);
  font-weight: 700;
  font-size: var(--ed-text-h1);
  line-height: 1.1;
  letter-spacing: -0.015em;
  color: var(--ed-text);
}

.ed-h2 {
  font-family: var(--ed-font-serif);
  font-weight: 600;
  font-size: var(--ed-text-h2);
  line-height: 1.2;
  color: var(--ed-text);
}

.ed-h3 {
  font-family: var(--ed-font-serif);
  font-weight: 600;
  font-size: var(--ed-text-h3);
  line-height: 1.3;
  color: var(--ed-text);
}

.ed-eyebrow {
  font-family: var(--ed-font-sans);
  font-weight: 700;
  font-size: var(--ed-text-eyebrow);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ed-accent);
}

.ed-body-lead {
  font-family: var(--ed-font-sans);
  font-size: var(--ed-text-body-lg);
  line-height: 1.55;
  color: var(--ed-text);
  font-weight: 400;
}

.ed-body {
  font-family: var(--ed-font-sans);
  font-size: var(--ed-text-body);
  line-height: 1.65;
  color: var(--ed-text);
}

.ed-caption {
  font-family: var(--ed-font-sans);
  font-size: var(--ed-text-caption);
  line-height: 1.4;
  color: var(--ed-text-soft);
  font-style: italic;
}

/* ── Editorial pull quote ── */
.ed-pullquote {
  border-left: 3px solid var(--ed-accent);
  padding: var(--ed-space-md) var(--ed-space-lg);
  margin: var(--ed-space-xl) 0;
  font-family: var(--ed-font-serif);
  font-size: 1.5rem;
  font-style: italic;
  font-weight: 500;
  line-height: 1.4;
  color: var(--ed-text);
}

/* ── Editorial container ── */
.ed-container {
  max-width: var(--ed-container);
  margin: 0 auto;
  padding-left: var(--ed-space-md);
  padding-right: var(--ed-space-md);
}

@media (min-width: 768px) {
  .ed-container {
    padding-left: var(--ed-space-lg);
    padding-right: var(--ed-space-lg);
  }
}

/* ── Editorial card ── */
.ed-card {
  background-color: var(--ed-bg-elevated);
  border-radius: var(--ed-radius-md);
  border: 1px solid var(--ed-border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.ed-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(31, 27, 22, 0.06);
}

/* ── Editorial section break (subtle ornament) ── */
.ed-section-break {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--ed-space-2xl) 0;
}

.ed-section-break::before,
.ed-section-break::after {
  content: '';
  flex: 1;
  max-width: 80px;
  height: 1px;
  background: var(--ed-border-strong);
}

.ed-section-break-icon {
  margin: 0 var(--ed-space-md);
  color: var(--ed-accent);
  font-size: 1.25rem;
}
```

### 1B — Build editorial layout component

Build `/src/components/editorial/EditorialLayout.tsx`:

```typescript
'use client';

import { useEffect } from 'react';

export function EditorialLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add('editorial');
    return () => {
      document.body.classList.remove('editorial');
    };
  }, []);
  
  return <>{children}</>;
}
```

This wraps every editorial page so the body gets the `.editorial` class for proper styling.

### 1C — Build core editorial components

Create these reusable components in `/src/components/editorial/`:

**`EditorialHeader.tsx`** — minimal header for editorial pages:
- River Region Parents wordmark on the left
- Sticky search bar (when on guide pages)
- Subtle bottom border, no shadow
- DOES NOT include the bottom nav bar from main site
- On mobile: collapses cleanly, search becomes prominent

**`EditorialHero.tsx`** — page hero with background image option:
- Optional eyebrow (e.g., "FAMILY RESOURCE GUIDE")
- Display headline (Fraunces, large)
- Lead paragraph (DM Sans, body-lg)
- Optional hero photo (full-width, aspect 16:9 or 21:9)
- Optional caption under hero photo

**`EditorialSection.tsx`** — content section wrapper:
- Optional eyebrow label
- Optional headline (h2 size)
- Optional subhead
- Children content with proper spacing
- Optional section break ornament before/after

**`CategoryGrid.tsx`** — for the hub page, displays guide categories as cards:
- 3-column grid on desktop, 2-column on tablet, 1-column on mobile
- Each card: hero image (4:5 aspect), eyebrow label, category name (h3 serif), description (1-2 sentences), listing count, "Browse →" affordance
- Hover: subtle lift, image zooms slightly

**`ListingCard.tsx`** — for category pages, displays a single listing:
- Entire card is a single Next.js Link (no buttons inside)
- Logo (small, top-left, optional)
- Business name (h3 serif)
- Card hook (1-2 sentence teaser, italic Fraunces)
- Neighborhood + tier badge (small, top-right)
- Optional small photo on the right (1:1 aspect)
- Hover: lift, name color shifts to accent

**`AdSlot.tsx`** — editorial-quality ad placement:
- Subtle "Sponsored" eyebrow label (not aggressive)
- Same card aesthetic as listings
- Image + headline + 1-line description + CTA
- Looks editorial, not banner-style
- Tracks impressions and clicks via existing /api/ads/click endpoint

**`CrossLinkBlock.tsx`** — "You might also like" cross-weaving block:
- Small eyebrow ("RELATED RESOURCES" or "ALSO IN OUR GUIDES")
- 2-3 related items as compact cards
- Used on category pages to surface related guides, articles, calendar events

### 1D — DONE WHEN

[ ] Editorial design tokens added to globals.css (additive, not replacing)
[ ] EditorialLayout component built
[ ] EditorialHeader, EditorialHero, EditorialSection, CategoryGrid, ListingCard, AdSlot, CrossLinkBlock components built
[ ] Components export from /src/components/editorial/index.ts for clean imports

═══════════════════════════════════════════════════════
## TASK 2 — DATABASE FOUNDATION
═══════════════════════════════════════════════════════

### 2A — Migration `028_guide_architecture.sql`

```sql
-- ── Add fields to advertiser_accounts ──
ALTER TABLE advertiser_accounts
ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
ADD COLUMN IF NOT EXISTS office_phone TEXT,
ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS card_hook TEXT,
ADD COLUMN IF NOT EXISTS detail_lead TEXT,
ADD COLUMN IF NOT EXISTS hero_photo_url TEXT;

-- ── Guide types reference ──
CREATE TABLE IF NOT EXISTS guide_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  short_description TEXT,
  hub_intro_paragraph TEXT,
  hero_image_url TEXT,
  primary_filter_field TEXT,
  publishes_annually BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO guide_types (slug, display_name, short_description, hub_intro_paragraph, display_order, primary_filter_field) VALUES 
  ('newcomer', 'Newcomer Guide', 'For families new to the River Region', 'Everything a family new to the River Region needs to feel at home faster. Schools, doctors, neighborhoods, and the local rhythms only insiders know.', 1, NULL),
  ('private-school', 'Private School Guide', 'Private and parochial schools serving K-12', 'A complete picture of private school options across the River Region. Tuition, mission, leadership, and what makes each campus distinct.', 2, 'category'),
  ('summer-camp', 'Summer Camp Guide', 'Day camps, overnight camps, specialty camps', 'When school lets out, the River Region opens up. Day camps, overnight adventures, specialty programs — your complete summer planning resource.', 3, 'category'),
  ('childcare', 'Childcare Guide', 'Childcare centers, preschools, in-home care', 'Finding childcare you trust takes time. We have done the research so you can compare side by side — hours, ratios, philosophies, and what each center does best.', 4, NULL),
  ('healthy-kids', 'Healthy Kids Guide', 'Pediatricians, dentists, specialists, therapists', 'Pediatric care that fits your family. From first visits to specialty referrals — providers across the River Region serving children from birth through teens.', 5, 'category'),
  ('summer-fun', 'Summer Fun Guide', 'Activities and events for summer break', 'Beat the boredom. Summer activities across the River Region for every interest — arts, sports, science, outdoor adventures, and slow afternoons too.', 6, 'category'),
  ('birthday-party', 'Birthday Party Guide', 'Venues and services for birthday parties', 'From toddler bashes to teen celebrations — venues, entertainers, cake artists, and party rentals that make hosting easier and the day unforgettable.', 7, 'category'),
  ('afterschool', 'After-School Guide', 'After-school programs and activities', 'After the bell rings — programs and activities that fill the afternoons with learning, movement, art, and friendship.', 8, 'category'),
  ('special-needs', 'Special Needs Guide', 'Resources for special needs families', 'A trusted directory of resources, providers, and organizations supporting families navigating special needs across the River Region.', 9, 'category')
ON CONFLICT (slug) DO NOTHING;

-- ── Guide listings ──
CREATE TABLE IF NOT EXISTS guide_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  guide_type_slug TEXT REFERENCES guide_types(slug),
  publication_id UUID REFERENCES publications(id),
  listing_year INT,
  listing_tier TEXT DEFAULT 'free',
  category TEXT,
  guide_data JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  source_csv_filename TEXT,
  source_csv_row_number INT,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advertiser_account_id, guide_type_slug, listing_year)
);

CREATE INDEX IF NOT EXISTS idx_guide_listings_guide ON guide_listings(guide_type_slug, is_published);
CREATE INDEX IF NOT EXISTS idx_guide_listings_advertiser ON guide_listings(advertiser_account_id);
CREATE INDEX IF NOT EXISTS idx_guide_listings_category ON guide_listings(guide_type_slug, category);

-- ── Listing flexible sections ──
CREATE TABLE IF NOT EXISTS listing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  headline TEXT,
  subheadline TEXT,
  body_content TEXT,
  bullet_points JSONB DEFAULT '[]',
  items JSONB DEFAULT '[]',
  faqs JSONB DEFAULT '[]',
  offer_text TEXT,
  offer_expiration TIMESTAMPTZ,
  offer_cta_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_sections_advertiser ON listing_sections(advertiser_account_id, is_active);

-- ── Calendar events ──
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID REFERENCES publications(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  start_date DATE,
  end_date DATE,
  start_time TEXT,
  end_time TEXT,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  location_name TEXT,
  address TEXT,
  city TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  cost_text TEXT,
  is_free BOOLEAN DEFAULT false,
  description TEXT,
  hero_image_url TEXT,
  category TEXT,
  age_range TEXT,
  is_indoor BOOLEAN,
  related_advertiser_id UUID REFERENCES advertiser_accounts(id),
  source_csv_filename TEXT,
  status TEXT DEFAULT 'published',
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_status ON calendar_events(status);

-- ── Ad slots ──
CREATE TABLE IF NOT EXISTS guide_ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_type_slug TEXT REFERENCES guide_types(slug),
  slot_position TEXT NOT NULL, -- 'top' / 'mid' / 'bottom' / 'sidebar'
  advertiser_account_id UUID REFERENCES advertiser_accounts(id),
  ad_image_url TEXT,
  ad_headline TEXT,
  ad_description TEXT,
  ad_cta_label TEXT,
  ad_link TEXT,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  impression_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guide_ad_slots_active ON guide_ad_slots(guide_type_slug, slot_position, is_active);

-- ── Cross-guide intelligence view ──
CREATE OR REPLACE VIEW advertiser_guide_appearances AS
SELECT 
  a.id as advertiser_id,
  a.business_name,
  a.slug,
  COUNT(DISTINCT gl.guide_type_slug) as guide_count,
  ARRAY_AGG(DISTINCT gl.guide_type_slug ORDER BY gl.guide_type_slug) FILTER (WHERE gl.id IS NOT NULL) as guides_appearing_in,
  ARRAY_AGG(DISTINCT gl.listing_tier ORDER BY gl.listing_tier) FILTER (WHERE gl.id IS NOT NULL) as tiers
FROM advertiser_accounts a
LEFT JOIN guide_listings gl ON gl.advertiser_account_id = a.id AND gl.is_published = true
GROUP BY a.id, a.business_name, a.slug;
```

### 2B — DONE WHEN

[ ] Migration 028 applied successfully
[ ] guide_types has 9 rows
[ ] guide_listings, listing_sections, calendar_events, guide_ad_slots tables exist
[ ] advertiser_guide_appearances view returns rows when queried

═══════════════════════════════════════════════════════
## TASK 3 — CSV IMPORT PIPELINE
═══════════════════════════════════════════════════════

Build the import script that reads all 8 CSVs and populates the database.

### 3A — Install dependencies

```bash
npm install csv-parse --save
```

### 3B — Build `/scripts/import-guides.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GuideMapping {
  filename: string;
  guide_type_slug: string;
  listing_year: number;
}

const GUIDES: GuideMapping[] = [
  { filename: 'private-school-guide.csv', guide_type_slug: 'private-school', listing_year: 2026 },
  { filename: 'childcare-guide.csv', guide_type_slug: 'childcare', listing_year: 2026 },
  { filename: 'healthy-kids-guide.csv', guide_type_slug: 'healthy-kids', listing_year: 2026 },
  { filename: 'summer-fun-guide.csv', guide_type_slug: 'summer-fun', listing_year: 2026 },
  { filename: 'birthday-party-guide.csv', guide_type_slug: 'birthday-party', listing_year: 2026 },
  { filename: 'afterschool-guide.csv', guide_type_slug: 'afterschool', listing_year: 2025 },
  { filename: 'special-needs-guide.csv', guide_type_slug: 'special-needs', listing_year: 2025 },
];

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function findOrCreateAdvertiser(row: any): Promise<string | null> {
  const businessName = row.business || row.title || row.name;
  if (!businessName) return null;
  
  const slug = slugify(businessName);
  
  // Check if exists
  let { data: existing } = await supabase
    .from('advertiser_accounts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  
  if (existing) return existing.id;
  
  // Create new
  const { data: created, error } = await supabase
    .from('advertiser_accounts')
    .insert({
      business_name: businessName,
      slug: slug,
      contact_email: row.email || `${slug}@placeholder.com`,
      contact_person_name: row.contact || null,
      office_phone: row.phone || null,
      address: row.address || null,
      city_state_zip: [row.city, row.state, row.zip].filter(Boolean).join(', '),
      website_url: row.website || null,
      category: 'imported',
      package_tier: 'tier-1-featured-listing',
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`  Failed to create ${businessName}: ${error.message}`);
    return null;
  }
  
  return created?.id || null;
}

async function importGuide(mapping: GuideMapping) {
  const filepath = path.join('imports/guides', mapping.filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠ File not found: ${mapping.filename}`);
    return { imported: 0, errors: 1 };
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const rows: any[] = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  
  console.log(`\n📂 ${mapping.filename}: ${rows.length} rows → ${mapping.guide_type_slug}`);
  
  let imported = 0, errors = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const advertiserId = await findOrCreateAdvertiser(row);
      if (!advertiserId) { errors++; continue; }
      
      // Determine listing tier from advertiser flag
      const tier = (row.advertiser?.toLowerCase() === 'a') ? 'featured' : 'free';
      
      // Build guide_data JSONB with all fields preserved
      const guideData: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value && value !== '' && key !== 'business' && key !== 'advertiser') {
          guideData[key] = value;
        }
      }
      
      const { error } = await supabase
        .from('guide_listings')
        .upsert({
          advertiser_account_id: advertiserId,
          guide_type_slug: mapping.guide_type_slug,
          listing_year: mapping.listing_year,
          listing_tier: tier,
          category: row.category || null,
          guide_data: guideData,
          source_csv_filename: mapping.filename,
          source_csv_row_number: i + 2,
          imported_at: new Date().toISOString(),
          is_published: true,
        }, {
          onConflict: 'advertiser_account_id,guide_type_slug,listing_year',
        });
      
      if (error) {
        console.error(`  Row ${i + 2}: ${error.message}`);
        errors++;
      } else {
        imported++;
      }
    } catch (err: any) {
      console.error(`  Row ${i + 2}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`  ✓ ${imported} imported, ${errors} errors`);
  return { imported, errors };
}

async function importCalendar() {
  const filepath = 'imports/calendar/may-2026-calendar.csv';
  if (!fs.existsSync(filepath)) {
    console.warn(`\n⚠ Calendar file not found`);
    return;
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  const rows: any[] = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  
  console.log(`\n📅 Calendar: ${rows.length} events`);
  
  let imported = 0, errors = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.title) { errors++; continue; }
      
      // Try to parse start_date — handle various formats
      let startDate = null;
      if (row.start_date) {
        // "Saturday, May 2, 2026" → parse to date
        // "May 1, 2026 - May 3, 2026" → take first
        // "Now-May 10, 2026" → use today's date
        const dateText = row.start_date.split('-')[0].trim().replace(/^Now\s*$/i, '');
        const parsed = new Date(dateText.replace(/^[A-Za-z]+,\s*/, ''));
        if (!isNaN(parsed.getTime())) {
          startDate = parsed.toISOString().split('T')[0];
        }
      }
      
      const slug = slugify(row.title) + '-' + i;
      const isFree = (row.cost?.toLowerCase().includes('free')) || false;
      
      const { error } = await supabase
        .from('calendar_events')
        .upsert({
          title: row.title,
          slug: slug,
          start_date: startDate,
          start_time: row.start_time || null,
          end_time: row.end_time || null,
          location_name: row.location || null,
          address: row.address || null,
          email: row.email || null,
          phone: row.phone || null,
          website: row.website || null,
          cost_text: row.cost || null,
          is_free: isFree,
          description: row.description || null,
          source_csv_filename: 'may-2026-calendar.csv',
          status: 'published',
          imported_at: new Date().toISOString(),
        }, {
          onConflict: 'slug',
        });
      
      if (error) {
        console.error(`  Event ${i + 2}: ${error.message}`);
        errors++;
      } else {
        imported++;
      }
    } catch (err: any) {
      console.error(`  Event ${i + 2}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`  ✓ ${imported} imported, ${errors} errors`);
}

async function main() {
  console.log('🚀 Starting imports\n');
  let totals = { imported: 0, errors: 0 };
  
  for (const mapping of GUIDES) {
    const result = await importGuide(mapping);
    totals.imported += result.imported;
    totals.errors += result.errors;
  }
  
  await importCalendar();
  
  console.log(`\n✅ Total guides: ${totals.imported} imported, ${totals.errors} errors`);
}

main().catch(console.error);
```

### 3C — Add to package.json

```json
"scripts": {
  ...
  "import-guides": "tsx scripts/import-guides.ts"
}
```

### 3D — Run the import

```bash
npm run import-guides
```

Document the output in the status report. Expected: ~600 listings imported, ~110 calendar events imported.

### 3E — DONE WHEN

[ ] csv-parse package installed
[ ] /scripts/import-guides.ts built
[ ] npm run import-guides ran successfully
[ ] guide_listings populated (verify with `SELECT guide_type_slug, COUNT(*) FROM guide_listings GROUP BY guide_type_slug`)
[ ] calendar_events populated
[ ] /docs/guide-import-guide.md documents the import workflow

═══════════════════════════════════════════════════════
## TASK 4 — FAMILY RESOURCE GUIDE HUB PAGE REDESIGN
═══════════════════════════════════════════════════════

Restructure `/family-resource-guide` (or `/newcomer-guide` if that's the existing route) to be a beautiful magazine-quality hub page that showcases all 9 guide categories. NOT trying to show all listings on one page.

### 4A — Build hub page

Replace `/src/app/newcomer-guide/page.tsx` (or rename route if cleaner) with:

```typescript
import { EditorialLayout } from '@/components/editorial/EditorialLayout';
import { EditorialHeader } from '@/components/editorial/EditorialHeader';
import { EditorialHero } from '@/components/editorial/EditorialHero';
import { EditorialSection } from '@/components/editorial/EditorialSection';
import { CategoryGrid } from '@/components/editorial/CategoryGrid';
import { CrossLinkBlock } from '@/components/editorial/CrossLinkBlock';
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';
import { createClient } from '@/lib/supabase/server';

export default async function FamilyResourceGuideHub() {
  const supabase = createClient();
  
  const { data: guides } = await supabase
    .from('guide_types')
    .select('*')
    .order('display_order');
  
  // Get listing counts per guide
  const counts = await Promise.all(
    (guides || []).map(async (g) => {
      const { count } = await supabase
        .from('guide_listings')
        .select('*', { count: 'exact', head: true })
        .eq('guide_type_slug', g.slug)
        .eq('is_published', true);
      return { ...g, listing_count: count || 0 };
    })
  );
  
  return (
    <EditorialLayout>
      <EditorialHeader />
      
      <EditorialHero
        eyebrow="THE RIVER REGION'S COMPLETE LOCAL GUIDE"
        headline="Find what your family needs, fast."
        leadParagraph="Whether you're new in town or shopping for a school, comparing summer camps or finding the right pediatrician — every guide is built by the people who actually live here. Bookmark this page and come back often."
        heroImageUrl="/images/hub/hero-family.jpg"
      />
      
      <EditorialSection eyebrow="BROWSE BY GUIDE">
        <CategoryGrid guides={counts} />
      </EditorialSection>
      
      {/* Featured editorial content cross-pollination */}
      <EditorialSection eyebrow="WHAT'S WORTH READING" headline="Stories from Around the River Region">
        {/* Featured article cards from guide_articles */}
      </EditorialSection>
      
      {/* Newsletter signup */}
      <EditorialSection>
        <NewsletterSignup
          variant="inline"
          source="frg-hub"
          headline="Get the weekly email moms forward to their friends"
          subheadline="Local recommendations, this week's events, and what's worth knowing — every Friday."
          cta_label="Send Me This Friday's Email"
        />
      </EditorialSection>
    </EditorialLayout>
  );
}
```

### 4B — DONE WHEN

[ ] Hub page restructured at /family-resource-guide (or /newcomer-guide if kept)
[ ] EditorialHero with hero image, eyebrow, headline, lead
[ ] CategoryGrid showing all 9 guide cards with listing counts
[ ] Featured article section pulls from guide_articles
[ ] Newsletter signup integrated
[ ] No vertical scrolling-everything-on-one-page
[ ] Mobile responsive (categories stack 1-column, hero adapts)

═══════════════════════════════════════════════════════
## TASK 5 — INDIVIDUAL GUIDE CATEGORY PAGES
═══════════════════════════════════════════════════════

Build dynamic guide category page that handles all 9 guide types with consistent layout.

### 5A — Build `/src/app/family-resource-guide/[slug]/page.tsx`

Single dynamic route that handles all 9 guides. Layout:

1. **EditorialHeader** with sticky search bar
2. **EditorialHero** for this guide — hero image, eyebrow ("PRIVATE SCHOOL GUIDE 2026"), headline (the guide's display_name), lead (the hub_intro_paragraph)
3. **Category filter strip** — prominent under hero, sticky on scroll, shows all categories within this guide with counts (e.g., "Independent · Faith-Based · Charter · All")
4. **Listing grid** — uses ListingCard component, 2-col on mobile/tablet, 3-col on desktop
5. **AdSlot** — mid-page editorial ad placement, pulls from guide_ad_slots
6. **More listings continuing**
7. **CrossLinkBlock** — "Also useful for [related guides]"
8. **Newsletter signup** — guide-specific tag (e.g., source='guide-private-school')
9. **EditorialFooter** with calendar peek ("Coming up this week")

### 5B — Listing fetching with filters

```typescript
async function getListings(guideSlug: string, filterCategory?: string) {
  const supabase = createClient();
  let query = supabase
    .from('guide_listings')
    .select(`
      *,
      advertiser:advertiser_accounts(id, business_name, slug, card_hook, hero_photo_url, neighborhood, logo_url),
      guide_type:guide_types(*)
    `)
    .eq('guide_type_slug', guideSlug)
    .eq('is_published', true)
    .order('listing_tier', { ascending: false }) // featured first
    .order('display_order');
  
  if (filterCategory && filterCategory !== 'all') {
    query = query.eq('category', filterCategory);
  }
  
  const { data } = await query;
  return data || [];
}
```

### 5C — Category filter component

`/src/components/editorial/CategoryFilterStrip.tsx`:
- Reads distinct categories from listings within this guide
- Renders as horizontal scrollable pill row on mobile, wrapped pill row on desktop
- "All" option at the start with total count
- Each pill shows category name + count
- Active state: terra background, white text
- Sticky below header on scroll
- Uses URL query param for state (?category=independent)

### 5D — DONE WHEN

[ ] Dynamic route at /family-resource-guide/[slug] handles all 9 guides
[ ] All 9 guide pages render correctly with their imported listings
[ ] Category filter strip works (filters listings, persists in URL)
[ ] Filter strip is sticky on scroll
[ ] AdSlot renders (even if empty, shows graceful placeholder)
[ ] CrossLinkBlock shows related guides
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 6 — LISTING DETAIL PAGE REBUILD
═══════════════════════════════════════════════════════

### 6A — Build `/src/app/family-resource-guide/[slug]/listings/[listingSlug]/page.tsx`

Layout:

1. **EditorialHeader**
2. **EditorialHero** — listing photo (full-width), eyebrow showing guide ("PRIVATE SCHOOL GUIDE"), business name as headline, card_hook as lead
3. **At-a-glance fact box** — guide-specific fields rendered as labeled key-value pairs (Tuition, Grades, Mission, Accreditation for schools; Ages, Hours, Meals for childcare; etc.)
4. **detail_lead paragraph** if present
5. **Conditional flexible sections** — render listing_sections in display_order: Our Story / What's Different / Features / Team / Testimonials / FAQ / Special Offer
6. **Multi-guide notice** — "Also featured in: [other guides]" if business appears in multiple
7. **Action buttons** — Call / Visit Website / Send Message (sticky bottom on mobile, inline on desktop)
8. **Send Message form** — keep existing pattern, integrated into page
9. **CrossLinkBlock** — related listings within same guide, related articles, related calendar events
10. **EditorialFooter**

### 6B — GuideSpecificFields component

`/src/components/listings/GuideSpecificFields.tsx`:

```typescript
const GUIDE_FIELD_LABELS: Record<string, Array<{key: string, label: string}>> = {
  'private-school': [
    { key: 'leadership', label: 'Leadership' },
    { key: 'grade', label: 'Grades' },
    { key: 'mission', label: 'Mission' },
    { key: 'extracurricula', label: 'Extracurriculars' },
  ],
  'childcare': [
    { key: 'ages', label: 'Ages Served' },
    { key: 'hours', label: 'Hours' },
    { key: 'meals', label: 'Meals' },
    { key: 'staff_ratio', label: 'Staff Ratio' },
  ],
  'summer-camp': [
    { key: 'ages', label: 'Ages' },
    { key: 'cost', label: 'Cost' },
  ],
  'healthy-kids': [
    { key: 'category', label: 'Specialty' },
  ],
  'summer-fun': [
    { key: 'ages', label: 'Ages' },
    { key: 'category', label: 'Type' },
  ],
  'birthday-party': [
    { key: 'category', label: 'Category' },
  ],
  'afterschool': [
    { key: 'ages', label: 'Ages' },
    { key: 'category', label: 'Category' },
  ],
  'special-needs': [
    { key: 'category', label: 'Focus Area' },
  ],
};

export function GuideSpecificFields({ guide_type_slug, guide_data }: any) {
  const fields = GUIDE_FIELD_LABELS[guide_type_slug] || [];
  const populated = fields.filter(f => guide_data[f.key]);
  
  if (populated.length === 0) return null;
  
  return (
    <aside className="ed-card" style={{padding: 'var(--ed-space-lg)', background: 'var(--ed-bg-subtle)'}}>
      <p className="ed-eyebrow" style={{marginBottom: 'var(--ed-space-md)'}}>AT A GLANCE</p>
      <dl style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--ed-space-md)'}}>
        {populated.map(f => (
          <div key={f.key}>
            <dt className="ed-caption" style={{textTransform: 'uppercase', fontWeight: 700, marginBottom: 4}}>
              {f.label}
            </dt>
            <dd className="ed-body" style={{margin: 0}}>{guide_data[f.key]}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
```

### 6C — DONE WHEN

[ ] /family-resource-guide/[slug]/listings/[listingSlug] route built
[ ] Hero with listing photo, business name, card_hook
[ ] At-a-glance fact box renders guide-specific fields
[ ] Conditional sections render only if data exists
[ ] Multi-guide notice shows when applicable
[ ] Action buttons work (call, website, message)
[ ] Mobile responsive with sticky action bar at bottom
[ ] Old route /newcomer-guide/listings/[slug] either redirects to new path or deprecated cleanly

═══════════════════════════════════════════════════════
## TASK 7 — SEED LISTING SECTIONS + CARD HOOKS FOR DFC
═══════════════════════════════════════════════════════

### 7A — Seed DFC for verification

```sql
UPDATE advertiser_accounts SET 
  card_hook = 'The pediatric dentist who designed her practice around making nervous kids actually want to come back.',
  detail_lead = 'Dr. Schreiber built Dentistry for Children around one idea: the first dental visit shapes every dental experience that follows. From the Chew-Chew Train sound machine to the staff who learn each kids name before they sit down, every detail is designed for stress-free first visits.'
WHERE slug = 'dentistry-for-children';

INSERT INTO listing_sections (advertiser_account_id, section_type, display_order, headline, body_content)
VALUES (
  (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children'),
  'our_story', 1,
  'Why We Built Dentistry for Children',
  'Dr. Schreiber spent the first decade of her career watching nervous children get rushed through dental visits. The chair, the lights, the strangers — it overwhelmed kids who deserved better. So she built a practice designed entirely around stress-free first visits.'
)
ON CONFLICT DO NOTHING;

INSERT INTO listing_sections (advertiser_account_id, section_type, display_order, headline, bullet_points)
VALUES (
  (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children'),
  'whats_different', 2,
  'What Makes Dentistry for Children Different',
  '["Patient-led pace — we never rush a nervous child", "Specialized exclusively in pediatric dentistry — no adult patients, ever", "Two board-certified pediatric dentists on staff", "Free Happy Visits for first-timers — just a tour, no procedures", "Calming environment with TVs, toys, and dedicated comfort items"]'::jsonb
)
ON CONFLICT DO NOTHING;
```

### 7B — Seed sample card_hooks for top imported listings

For 10-15 of the most prominent imported businesses, generate magazine-quality card_hooks (1 sentence, hook-style). Use AI if helpful — call Claude API with prompt like "Write a 1-sentence magazine-quality teaser for this business that would make a mom click. Don't be salesy. Be specific. Make her curious."

For everything else, leave card_hook NULL — it'll show without one until edited later.

### 7C — DONE WHEN

[ ] DFC has card_hook, detail_lead, and 2 listing_sections
[ ] /family-resource-guide/healthy-kids/listings/dentistry-for-children renders with all sections
[ ] At least 10 other imported listings have AI-generated card_hooks

═══════════════════════════════════════════════════════
## TASK 8 — KNOWLEDGE BASE + STATUS REPORT
═══════════════════════════════════════════════════════

### 8A — Update knowledge base

Add to `/docs/keepsharing-knowledge-base.md`:

- Editorial Design System documentation
- Guide architecture (hub + 9 category pages pattern)
- CSV import workflow
- Listing detail page architecture
- Two-mode design language (Utility vs Editorial)

### 8B — Document `/docs/editorial-design-system.md`

Comprehensive design system reference:
- Color tokens
- Typography scale
- Spacing scale
- Component library
- When to use Editorial mode vs Utility mode

### 8C — Truthful status report

- Migration 028 applied
- All CSV imports completed with counts per guide
- Hub page redesigned
- 9 category pages working
- Listing detail page rebuilt
- Verification: visit /family-resource-guide and click each guide

### 8D — DONE WHEN

[ ] Knowledge base updated
[ ] /docs/editorial-design-system.md exists
[ ] Status report posted truthfully

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Visit `/family-resource-guide`** and see a magazine-quality hub page with 9 guide cards, each with hero image, count, "Browse →"
2. **Click any guide card** and land on a dedicated guide page with editorial hero, category filter strip, listing grid, ads, cross-links
3. **Click a category filter** and see filtered listings (URL updates, sticky filter remains visible)
4. **Click a listing card** and land on a detail page with hero, hook, at-a-glance facts, conditional sections, action buttons
5. **Visit on mobile** and have a clean app-like experience without irrelevant bottom nav bar
6. **Query `advertiser_guide_appearances`** and see businesses across multiple guides

═══════════════════════════════════════════════════════
## FINAL CHECKLIST
═══════════════════════════════════════════════════════

[ ] Migration 028 applied
[ ] Editorial design system tokens added to globals.css
[ ] All 7 editorial components built
[ ] CSV import script ran successfully
[ ] All 7 guide CSVs imported (~600 listings)
[ ] Calendar imported (~113 events)
[ ] Family Resource Guide hub page redesigned
[ ] Dynamic /family-resource-guide/[slug] route handles all 9 guides
[ ] Category filter strip works
[ ] Listing detail page rebuilt with conditional sections
[ ] DFC seeded with sections for verification
[ ] Knowledge base updated
[ ] Editorial design system documented
[ ] Truthful status report posted

Then STOP.

GO.
