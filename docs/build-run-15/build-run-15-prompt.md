# BUILD RUN #15 — Make May 2026 Real

**Three-part build. Part 1: polish the existing platform (fix broken images, replace letter-avatar fallbacks with real photos, polish WhereToStart and Mom-to-Mom visual treatments, mobile responsive sweep). Part 2: build the full ad placement system end-to-end with 12 magazine-quality placement types wired to the existing guide_ad_slots infrastructure plus admin management interface. Part 3: make the platform feel like the May 2026 issue with editor's note, May Highlights section, May 2026 spotlight callouts, footer date stamp.**

═══════════════════════════════════════════════════════
## CRITICAL FRAMING
═══════════════════════════════════════════════════════

The platform has bones. Now it needs polish, monetization, and a sense of "this is THIS month's issue, not just a generic site."

This is a depth build, not a breadth build. Every component must ship at magazine quality matching the locked Apartment Therapy aesthetic — generous typography, real photography, sophisticated color usage, subtle whimsy, never kiddy. If a component is shipped without that quality bar, it's not done.

**TIME EXPECTATION: This build should take 60-90 minutes of Claude Code time.** If it reports complete in under 30 minutes, that's a red flag the depth wasn't there. The status report should reflect actual depth shipped, not just feature count.

**STRICT TASK ORDER. STOP IF BLOCKED. NO PUSHING THROUGH.**

If a task fails after 3 attempts, document and STOP that task. Move to next. Truthful incomplete > confidently broken.

═══════════════════════════════════════════════════════
## STRATEGIC PRINCIPLES
═══════════════════════════════════════════════════════

- **"We Help Your Future Customers Find You."** Tagline locked.
- **Apartment Therapy aesthetic locked.** Generous typography (Fraunces serif headers, DM Sans body). Real local photography over icons. Color used as accent, not personality. Subtle whimsy. NEVER kiddy.
- **Ads are editorial-quality, never banner-style.** Sponsored content blends into the design language. The trade is: subtle integration earns higher CPM than aggressive banners.
- **No display ad networks (no Google AdSense, no Amazon affiliate links).** All ads are direct premium placements.
- **No popups except the existing newsletter signup popup.** No sponsored popups. Ever.
- **No floating banner ads.** 2026 publishing standards reject these.
- **The May 2026 issue must feel current.** Editor's signature, May-specific content, this-week's events foregrounded. The platform should feel ALIVE, not generic.
- **Every page must work on mobile at 375px.** No exceptions. Verify in Chrome DevTools mobile mode.
- **Fast. Helpful. Easy. Beautiful.** The four-word lens.

═══════════════════════════════════════════════════════
## OPERATING RULES
═══════════════════════════════════════════════════════

Auto-approve: file edits, terminal commands, npm installs, package additions, migrations applied via SQL editor instructions, content writing, image downloads.

STOP only on:
1. Unresolvable build/runtime errors after 3 attempts on a single task
2. Strategic decisions not specified in this prompt
3. Destructive operations (dropping production tables with real data)
4. Missing credentials in `.env.local`

Required reading before starting:
- `/docs/keepsharing-knowledge-base.md`
- `/docs/marketing-formula/23-point-proven-ad-formula.md`
- `/docs/editorial-design-system.md`
- `/src/components/editorial/` (every existing component — understand current state before extending)
- `/src/components/calendar/` (existing calendar components)
- `next.config.ts` (current image hosts)
- `/src/app/local-guides/page.tsx`
- `/src/app/family-resource-guide/page.tsx`
- `/src/app/private-school-guide/page.tsx` (representative guide page using GuideMagnificentIssue)
- `/src/app/calendar/page.tsx`

═══════════════════════════════════════════════════════
## DEFENSIVE STARTUP CHECK
═══════════════════════════════════════════════════════

```sql
SELECT 
  (SELECT COUNT(*) FROM guide_types) as guide_types,
  (SELECT COUNT(*) FROM guide_listings) as guide_listings,
  (SELECT COUNT(*) FROM calendar_events) as calendar_events,
  (SELECT COUNT(*) FROM mom_to_mom_quotes) as mom_quotes,
  (SELECT COUNT(*) FROM guide_ad_slots) as ad_slots;
```

Expected: 9 / 601 / 113 / 24 / 0. If different, document.

```bash
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

═══════════════════════════════════════════════════════
# PART 1 — POLISH THE EXISTING PLATFORM
═══════════════════════════════════════════════════════

## TASK 1 — FIX BROKEN HERO IMAGES

The platform has multiple hero images that 404 from Unsplash because the URLs are stale or randomly generated. Replace systematically.

### 1A — Source verified working hero photography

Download these specific Unsplash photos (verified to exist as of build time) and save locally to `/public/images/heroes/`:

```
local-guides-hero.jpg → photo-1609220136736-443140cffec6 (warm family afternoon)
family-resource-hero.jpg → photo-1542037104857-ffbb0b9155fb (street/community)
private-school-hero.jpg → photo-1503676260728-1c00da094a0b (school books on desk)
summer-camp-hero.jpg → photo-1496080174650-637e3f22fa03 (kids outdoors)
childcare-hero.jpg → photo-1471286174890-9c112ffca5b4 (preschool environment)
healthy-kids-hero.jpg → photo-1559757175-5700dde675bc (pediatric care)
summer-fun-hero.jpg → photo-1551966775-a4ddc8df052b (family fun outside)
birthday-party-hero.jpg → photo-1530103862676-de8c9debad1d (birthday celebration)
afterschool-hero.jpg → photo-1544717297-fa95b6ee9643 (kids learning)
special-needs-hero.jpg → photo-1542810634-71277d95dcbb (inclusive joy)
calendar-hero.jpg → photo-1492684223066-81342ee5ff30 (community gathering)
```

If any specific Unsplash ID 404s during download, search Unsplash for the description in parentheses and pick a similar warm, family-appropriate photo. Document any substitutions in `/docs/photo-credits.md`.

Use this download approach in a script:

```typescript
// scripts/download-hero-images.ts
import fs from 'fs';
import path from 'path';

const HEROES = [
  { name: 'local-guides-hero.jpg', id: 'photo-1609220136736-443140cffec6' },
  { name: 'family-resource-hero.jpg', id: 'photo-1542037104857-ffbb0b9155fb' },
  // ... all 11
];

const DEST = 'public/images/heroes';
fs.mkdirSync(DEST, { recursive: true });

for (const hero of HEROES) {
  const url = `https://images.unsplash.com/${hero.id}?w=1600&q=80&auto=format&fit=crop`;
  const dest = path.join(DEST, hero.name);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`${hero.name}: ${response.status}`);
      continue;
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
    console.log(`✓ ${hero.name}`);
  } catch (err) {
    console.error(`✗ ${hero.name}: ${err.message}`);
  }
}
```

Add to package.json scripts: `"download-heroes": "npx tsx scripts/download-hero-images.ts"` and run.

### 1B — Update database to reference local hero paths

Migration `034_local_hero_images.sql`:

```sql
UPDATE guide_types SET hero_image_url = '/images/heroes/family-resource-hero.jpg' WHERE slug = 'newcomer';
UPDATE guide_types SET hero_image_url = '/images/heroes/private-school-hero.jpg' WHERE slug = 'private-school';
UPDATE guide_types SET hero_image_url = '/images/heroes/summer-camp-hero.jpg' WHERE slug = 'summer-camp';
UPDATE guide_types SET hero_image_url = '/images/heroes/childcare-hero.jpg' WHERE slug = 'childcare';
UPDATE guide_types SET hero_image_url = '/images/heroes/healthy-kids-hero.jpg' WHERE slug = 'healthy-kids';
UPDATE guide_types SET hero_image_url = '/images/heroes/summer-fun-hero.jpg' WHERE slug = 'summer-fun';
UPDATE guide_types SET hero_image_url = '/images/heroes/birthday-party-hero.jpg' WHERE slug = 'birthday-party';
UPDATE guide_types SET hero_image_url = '/images/heroes/afterschool-hero.jpg' WHERE slug = 'afterschool';
UPDATE guide_types SET hero_image_url = '/images/heroes/special-needs-hero.jpg' WHERE slug = 'special-needs';
```

### 1C — Update page-level hero references

In `/src/app/local-guides/page.tsx` line ~64, replace the broken Unsplash URL with `/images/heroes/local-guides-hero.jpg`.

In `/src/app/calendar/page.tsx`, replace mountain road photo with `/images/heroes/calendar-hero.jpg`.

In `/src/app/family-resource-guide/page.tsx`, ensure hero uses `/images/heroes/family-resource-hero.jpg` (whether through page-level prop or via guide_types.hero_image_url).

### 1D — DONE WHEN

[ ] download-hero-images.ts script created and run successfully
[ ] All 11 hero images saved to /public/images/heroes/
[ ] Migration 034 applied
[ ] Page-level hero references updated to local paths
[ ] /local-guides hero loads (no broken image)
[ ] /family-resource-guide hero loads
[ ] Each individual guide page hero loads
[ ] /calendar hero loads with appropriate image (not mountain road)

═══════════════════════════════════════════════════════
## TASK 2 — REPLACE LETTER AVATARS IN FEATURED LISTINGS
═══════════════════════════════════════════════════════

Featured Listings Strip currently shows letter avatars (R, T, M, A, etc.) when listings don't have hero photos. That looks generic, not magazine-quality.

### 2A — Better fallback strategy

When `advertiser.hero_photo_url` is missing, instead of letter avatar, render a branded color block with the business name in serif typography. Each guide gets its own accent color theme:

```typescript
const GUIDE_ACCENT_COLORS: Record<string, { bg: string, text: string }> = {
  'newcomer': { bg: '#E8C7A8', text: '#5C2D0F' },
  'private-school': { bg: '#B8D4E0', text: '#1A4A5C' },
  'summer-camp': { bg: '#C4D8B8', text: '#3F5C2D' },
  'childcare': { bg: '#F4D9A8', text: '#7A4F1C' },
  'healthy-kids': { bg: '#E0B8D4', text: '#5C1A4A' },
  'summer-fun': { bg: '#F4C7A8', text: '#7A2D0F' },
  'birthday-party': { bg: '#D4B8E0', text: '#4A1A5C' },
  'afterschool': { bg: '#A8D8C4', text: '#1C5C4A' },
  'special-needs': { bg: '#D4C4E0', text: '#3F2D5C' },
};

function FallbackHero({ businessName, guideSlug }: { businessName: string; guideSlug: string }) {
  const colors = GUIDE_ACCENT_COLORS[guideSlug] || GUIDE_ACCENT_COLORS['newcomer'];
  
  return (
    <div 
      className="featured-card-fallback"
      style={{ 
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      <p className="featured-card-fallback-name">{businessName}</p>
    </div>
  );
}
```

Styling:

```css
.featured-card-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ed-space-md);
  text-align: center;
}

.featured-card-fallback-name {
  font-family: var(--ed-font-serif);
  font-weight: 600;
  font-size: 1.125rem;
  line-height: 1.3;
  opacity: 0.95;
  text-wrap: balance;
}
```

This is significantly more magazine-quality than letter avatars — feels like print branding, uses guide accent colors, integrates with editorial typography.

### 2B — Apply to FeaturedListingsStrip

Update the featured listing card rendering in `/src/components/editorial/FeaturedListingsStrip.tsx`:

```typescript
<div className="featured-card-image">
  {listing.advertiser.hero_photo_url ? (
    <Image 
      src={listing.advertiser.hero_photo_url}
      alt={listing.advertiser.business_name}
      fill
      style={{ objectFit: 'cover' }}
      unoptimized
    />
  ) : (
    <FallbackHero 
      businessName={listing.advertiser.business_name}
      guideSlug={listing.guide_type_slug}
    />
  )}
</div>
```

### 2C — Apply same pattern to ListingCard

`/src/components/editorial/ListingCard.tsx` should use the same fallback approach when no hero photo exists. Currently it probably uses a logo or initial — replace with the branded color block.

### 2D — DONE WHEN

[ ] FallbackHero component built or inlined
[ ] FeaturedListingsStrip uses branded color fallback when no hero photo
[ ] ListingCard uses same fallback pattern
[ ] Visit /private-school-guide — featured strip shows branded color blocks with school names in serif typography (not letter avatars)
[ ] Visual quality matches magazine aesthetic

═══════════════════════════════════════════════════════
## TASK 3 — POLISH WHERETOSTART COMPONENT
═══════════════════════════════════════════════════════

The WhereToStart component on Family Resource Guide needs visual polish to match Apartment Therapy quality.

### 3A — Numbered step circles with editorial styling

Current implementation likely has plain circles. Upgrade to:
- Larger circle (72×72 on desktop, 56×56 on mobile)
- Cream background with terra accent number
- Number in Fraunces serif, large, with slight letter spacing
- Subtle shadow on hover
- Animation: number flips/rotates slightly on card hover

### 3B — Per-step photography

Each of the 5 step cards should have a small thumbnail image (96×96 square) representing that step's guide:
- Step 1 (Schools) → small private school photo
- Step 2 (Healthcare) → small pediatric photo  
- Step 3 (Childcare) → small preschool photo
- Step 4 (Things to Do) → small family activity photo
- Step 5 (Special Needs) → small inclusive activity photo

Use existing hero images from /public/images/heroes/ at smaller size.

### 3C — Hover state and interaction

Currently probably no hover state. Add:
- Card lifts 4px on hover
- Border accent color shifts to terra
- Right arrow on CTA shifts 4px right
- Number circle background deepens slightly
- Smooth 200ms transitions

### 3D — Layout refinement

- Each card: number circle (left), thumbnail image (next to circle), text content (right), CTA arrow (far right)
- Mobile: thumbnail moves below number, text wraps below
- Increase card padding for more breathing room
- Better typography hierarchy

### 3E — DONE WHEN

[ ] Step number circles redesigned with serif typography and proper sizing
[ ] Each step has thumbnail image of related guide
[ ] Hover states work smoothly
[ ] Mobile layout adapts cleanly
[ ] Visual quality matches magazine aesthetic

═══════════════════════════════════════════════════════
## TASK 4 — POLISH MOM-TO-MOM SECTION
═══════════════════════════════════════════════════════

Mom-to-Mom currently has structure but needs editorial polish.

### 4A — Quote mark treatment

Each quote card should have a large decorative quote mark in serif Fraunces, terra accent color, positioned creatively (top-left, large, semi-transparent — NYT style). Not the existing small quote mark.

```css
.mom-to-mom-card {
  position: relative;
  background: var(--ed-bg-elevated);
  padding: var(--ed-space-xl);
  border-radius: var(--ed-radius-lg);
  border: 1px solid var(--ed-border);
}

.mom-to-mom-quote-mark {
  position: absolute;
  top: 8px;
  left: 16px;
  font-family: var(--ed-font-serif);
  font-size: 6rem;
  line-height: 0.8;
  color: var(--ed-accent);
  opacity: 0.18;
  font-weight: 700;
  user-select: none;
  pointer-events: none;
}

.mom-to-mom-quote {
  font-family: var(--ed-font-serif);
  font-style: italic;
  font-size: 1.25rem;
  line-height: 1.5;
  color: var(--ed-text);
  position: relative;
  z-index: 1;
  margin: 0 0 var(--ed-space-md);
}
```

### 4B — Attribution with avatar circle

Each quote should have a small colored avatar circle next to attribution name. Use guide accent colors. If no real photo, use first letter initial in the colored circle (this IS appropriate for personal quotes — feels human, not corporate).

### 4C — Layout variation

Three quote cards on desktop should NOT all be identical heights. Add visual rhythm:
- Center card slightly taller or styled with subtle background variation
- Or alternating background colors (cream, slightly darker cream, cream)
- Or staggered vertical positioning

This creates visual interest without breaking grid structure.

### 4D — DONE WHEN

[ ] Decorative serif quote marks render with proper editorial styling
[ ] Attribution has avatar circle with guide accent color
[ ] Quote cards have visual rhythm (not all identical)
[ ] Visit any guide page, scroll to Mom-to-Mom section, looks magazine-quality

═══════════════════════════════════════════════════════
## TASK 5 — MOBILE RESPONSIVE SWEEP
═══════════════════════════════════════════════════════

Test every primary page in Chrome DevTools mobile mode (iPhone 12 Pro = 390px width). Document and fix what breaks.

### 5A — Test these pages at 390px

1. /local-guides
2. /family-resource-guide
3. /private-school-guide (representative magnificent issue)
4. /private-school-guide/listings/saint-james-school (or any listing detail)
5. /calendar (list view)
6. /calendar?view=gallery
7. /calendar/events/[any-slug]

### 5B — Common fixes likely needed

- Featured Listings Strip: should be horizontal scroll on mobile (already specced but verify)
- Sidebar: should stack BELOW listings on mobile, not show alongside
- WhereToStart cards: thumbnail + number + text need to stack cleanly
- Mom-to-Mom quote cards: single column on mobile
- Navigation: hamburger menu opens slide-out (verify)
- Hero text sizing: must remain readable at narrow widths
- Calendar gallery cards: single column on mobile
- Filter pills on calendar: horizontal scroll if too many
- All padding and spacing should reduce proportionally on mobile

### 5C — Document fixes

For each fix made, add a brief note to `/docs/mobile-responsive-fixes.md` so future builds know what's been verified.

### 5D — DONE WHEN

[ ] All 7 primary pages tested at 390px
[ ] Identified breakages fixed
[ ] /docs/mobile-responsive-fixes.md updated with what was verified

═══════════════════════════════════════════════════════
# PART 2 — FULL AD PLACEMENT SYSTEM
═══════════════════════════════════════════════════════

## TASK 6 — DATABASE FOUNDATION FOR AD PLACEMENT TYPES
═══════════════════════════════════════════════════════

The existing `guide_ad_slots` table only handles guide-page placements. We need a more flexible ad placement system that handles 12 placement types across guides, articles, calendar, newsletter, footer.

### 6A — Migration 035: ad placement system

```sql
-- Drop the limited guide_ad_slots table (we're going to replace its function with a more flexible system)
-- Actually keep it for backwards compat, but build the new system

CREATE TABLE IF NOT EXISTS ad_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Where this ad appears
  placement_type TEXT NOT NULL, -- 'guide_featured_strip', 'guide_sidebar_sticky', 'guide_inline', 'guide_inline_sponsored', 
                                -- 'article_header_sponsor', 'article_inline_recommendation', 'article_footer_listings',
                                -- 'calendar_featured_event', 'calendar_inline_promotion',
                                -- 'newsletter_sponsor', 'homepage_hero_rotator', 'site_footer_partners'
  context_type TEXT,            -- 'guide', 'article', 'calendar', 'newsletter', 'site_global'
  context_slug TEXT,            -- which guide/article/etc — e.g. 'private-school-guide'
  
  -- The advertiser
  advertiser_account_id UUID REFERENCES advertiser_accounts(id),
  
  -- Creative
  ad_image_url TEXT,
  ad_eyebrow TEXT,              -- optional eyebrow label e.g. "FEATURED PARTNER"
  ad_headline TEXT,
  ad_description TEXT,
  ad_cta_label TEXT,
  ad_link TEXT,
  
  -- Scheduling
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  display_priority INT DEFAULT 0,  -- higher shows first when multiple ads compete for same slot
  
  -- Performance
  impression_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_placements_lookup ON ad_placements(placement_type, context_type, context_slug, is_active);
CREATE INDEX idx_ad_placements_active_dates ON ad_placements(is_active, starts_at, ends_at);
CREATE INDEX idx_ad_placements_advertiser ON ad_placements(advertiser_account_id);

-- Helper function: get active ads for a placement
CREATE OR REPLACE FUNCTION get_active_ads(
  p_placement_type TEXT,
  p_context_type TEXT DEFAULT NULL,
  p_context_slug TEXT DEFAULT NULL,
  p_limit INT DEFAULT 1
) RETURNS TABLE (
  id UUID,
  ad_image_url TEXT,
  ad_eyebrow TEXT,
  ad_headline TEXT,
  ad_description TEXT,
  ad_cta_label TEXT,
  ad_link TEXT,
  advertiser_id UUID,
  advertiser_name TEXT,
  advertiser_slug TEXT
) LANGUAGE sql AS $$
  SELECT 
    ap.id,
    ap.ad_image_url,
    ap.ad_eyebrow,
    ap.ad_headline,
    ap.ad_description,
    ap.ad_cta_label,
    ap.ad_link,
    aa.id as advertiser_id,
    aa.business_name as advertiser_name,
    aa.slug as advertiser_slug
  FROM ad_placements ap
  LEFT JOIN advertiser_accounts aa ON aa.id = ap.advertiser_account_id
  WHERE ap.placement_type = p_placement_type
    AND ap.is_active = true
    AND (p_context_type IS NULL OR ap.context_type = p_context_type)
    AND (p_context_slug IS NULL OR ap.context_slug = p_context_slug OR ap.context_slug IS NULL)
    AND ap.starts_at <= NOW()
    AND (ap.ends_at IS NULL OR ap.ends_at >= NOW())
  ORDER BY ap.display_priority DESC, RANDOM()
  LIMIT p_limit;
$$;
```

### 6B — Seed real ad inventory

Create seeded ads representing real placements. RRP system advertiser self-promotes (publisher), DFC has 3 placements (paying Tier 4 partner), other featured listings have 1 placement each.

In migration 035 or a separate seed file:

```sql
-- Get RRP system advertiser ID
DO $$
DECLARE
  rrp_id UUID;
  dfc_id UUID;
BEGIN
  SELECT id INTO rrp_id FROM advertiser_accounts WHERE business_name = 'River Region Parents' LIMIT 1;
  SELECT id INTO dfc_id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1;

  -- DFC: 3 placements (premium Tier 4 partner)
  IF dfc_id IS NOT NULL THEN
    INSERT INTO ad_placements (
      placement_type, context_type, context_slug, advertiser_account_id,
      ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url,
      display_priority
    ) VALUES
    -- DFC: Healthy Kids guide sidebar sticky
    ('guide_sidebar_sticky', 'guide', 'healthy-kids-guide', dfc_id,
     'Featured Partner', 'First dental visits, made easier.',
     'Free Happy Visit for new patients. Just a tour, no procedures.',
     'Schedule a Happy Visit', '/healthy-kids-guide/listings/dentistry-for-children',
     '/images/heroes/healthy-kids-hero.jpg', 100),
    -- DFC: Inline mid-guide on healthy kids
    ('guide_inline_sponsored', 'guide', 'healthy-kids-guide', dfc_id,
     'Recommended By Local Moms', 'The pediatric dentist designed for nervous kids.',
     'Two board-certified pediatric dentists. Patient-led pace. Free Happy Visits.',
     'Learn More', '/healthy-kids-guide/listings/dentistry-for-children',
     NULL, 90),
    -- DFC: Calendar featured event spot
    ('calendar_featured_event', 'calendar', NULL, dfc_id,
     'Sponsor Spotlight', 'Bring the kids in for a Free Happy Visit',
     'Just a tour. No procedures. Make their first dental visit a positive memory.',
     'Schedule Now', '/healthy-kids-guide/listings/dentistry-for-children',
     NULL, 80);
  END IF;

  -- RRP: Self-promoting placements (publisher leveraging own inventory)
  IF rrp_id IS NOT NULL THEN
    INSERT INTO ad_placements (
      placement_type, context_type, context_slug, advertiser_account_id,
      ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
      display_priority
    ) VALUES
    -- RRP: Family Resource Guide sidebar — promote becoming a partner
    ('guide_sidebar_sticky', 'guide', 'family-resource-guide', rrp_id,
     'For Local Businesses', 'Want your business featured here?',
     'Reach 50,000+ River Region families monthly across our magazine, website, and newsletter.',
     'View Partnership Options', '/advertise', 50),
    -- RRP: Private School Guide inline — promote newsletter
    ('guide_inline', 'guide', 'private-school-guide', rrp_id,
     'From River Region Parents', 'School decisions made easier.',
     'Get our weekly email with the latest school news, tour reminders, and what local moms are saying.',
     'Subscribe Free', '/?signup=newsletter',
     50),
    -- RRP: Calendar inline — newsletter signup
    ('calendar_inline_promotion', 'calendar', NULL, rrp_id,
     'Never Miss an Event', 'Get the weekly events email',
     'Every Thursday — what is happening for River Region families this weekend.',
     'Subscribe Free', '/?signup=newsletter',
     40),
    -- RRP: Site footer perpetual
    ('site_footer_partners', 'site_global', NULL, rrp_id,
     NULL, 'River Region Parents',
     'Local family media since 2001.',
     'About Us', '/about',
     30),
    -- RRP: Newsletter sponsor self-promo (placeholder — real sponsors fill this slot when sold)
    ('newsletter_sponsor', 'newsletter', NULL, rrp_id,
     'This Week Brought to You By', 'Premium Local Partners',
     'This newsletter slot is available — partner with us to reach our weekly audience.',
     'Become a Partner', '/advertise',
     20);
  END IF;
END $$;
```

### 6C — DONE WHEN

[ ] Migration 035 applied
[ ] ad_placements table created with all columns
[ ] get_active_ads function created
[ ] DFC seeded with 3 placements
[ ] RRP self-promo seeded with 5 placements
[ ] Total: 8+ ad placements ready to render

═══════════════════════════════════════════════════════
## TASK 7 — BUILD 12 AD PLACEMENT COMPONENTS
═══════════════════════════════════════════════════════

Each placement type needs a distinct component with magazine-quality treatment. NEVER banner-style. Editorial integration.

Create directory `/src/components/ads/` and build each component:

### 7A — Component list (build all 12)

1. **GuideFeaturedStrip.tsx** — wrapper that pulls active ads + shows alongside FeaturedListingsStrip
2. **GuideSidebarSticky.tsx** — for guide page sidebars (sticky on desktop, follows scroll)
3. **GuideInlineAd.tsx** — between every 9 listings, looks like listing card
4. **GuideInlineSponsored.tsx** — within editorial intro / insider tips, "Recommended by local moms" inline card
5. **ArticleHeaderSponsor.tsx** — single line below article title: "This article presented by [Partner]"
6. **ArticleInlineRecommendation.tsx** — embedded between article paragraphs, looks like recommended local partner card
7. **ArticleFooterListings.tsx** — 2-3 listing cards at article footer ("Mentioned in this article")
8. **CalendarFeaturedEvent.tsx** — top of /calendar, single sponsored event spotlight
9. **CalendarInlinePromotion.tsx** — between event cards, looks like event card but marked PARTNER PROMOTION
10. **NewsletterSponsorSlot.tsx** — for top of newsletter emails: "This week brought to you by [Partner]"
11. **HomepageHeroRotator.tsx** — for future homepage strip, single sponsored card
12. **SiteFooterPartners.tsx** — site-wide footer with 4-6 partner logos

### 7B — Common patterns across all components

Every ad component must:

- Pull active ads from `ad_placements` via the `get_active_ads()` function or direct Supabase query filtered by `placement_type` and optional `context_slug`
- Have a subtle "Sponsored" or "Partner" eyebrow label (specific text varies by placement type) — NEVER hide that it's an ad
- Use editorial typography (Fraunces serif for headlines, DM Sans for body)
- Track impressions via `/api/ads/impression` POST
- Track clicks via `/api/ads/click` POST or similar
- Gracefully render nothing if no active ad exists (don't show empty placeholders)
- Be responsive and work on mobile

### 7C — Sample component: GuideSidebarSticky

```typescript
// /src/components/ads/GuideSidebarSticky.tsx
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

interface Props {
  guideUrlSlug: string;
}

export async function GuideSidebarSticky({ guideUrlSlug }: Props) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: ads } = await supabase.rpc('get_active_ads', {
    p_placement_type: 'guide_sidebar_sticky',
    p_context_type: 'guide',
    p_context_slug: guideUrlSlug,
    p_limit: 1,
  });
  
  if (!ads || ads.length === 0) return null;
  const ad = ads[0];
  
  return (
    <aside className="ad-sidebar-sticky">
      <p className="ad-eyebrow">{ad.ad_eyebrow || 'Sponsored'}</p>
      {ad.ad_image_url && (
        <div className="ad-sidebar-image">
          <Image src={ad.ad_image_url} alt={ad.ad_headline} fill style={{ objectFit: 'cover' }} unoptimized />
        </div>
      )}
      <h3 className="ad-headline">{ad.ad_headline}</h3>
      {ad.ad_description && <p className="ad-description">{ad.ad_description}</p>}
      {ad.ad_cta_label && ad.ad_link && (
        <Link href={ad.ad_link} className="ad-cta">
          {ad.ad_cta_label} →
        </Link>
      )}
    </aside>
  );
}
```

### 7D — Centralized ad styling

Add to globals.css:

```css
/* ═══════════════════════════════════════════════════════════
   AD PLACEMENT SHARED STYLES
   Editorial-quality, never banner-style
   ═══════════════════════════════════════════════════════════ */

.ad-eyebrow {
  font-family: var(--ed-font-sans);
  font-size: var(--ed-text-eyebrow);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ed-text-soft);
  margin: 0 0 var(--ed-space-xs);
}

.ad-headline {
  font-family: var(--ed-font-serif);
  font-weight: 600;
  font-size: 1.25rem;
  line-height: 1.3;
  color: var(--ed-text);
  margin: 0 0 var(--ed-space-xs);
}

.ad-description {
  font-family: var(--ed-font-sans);
  font-size: var(--ed-text-small);
  line-height: 1.5;
  color: var(--ed-text-muted);
  margin: 0 0 var(--ed-space-md);
}

.ad-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--ed-font-sans);
  font-size: var(--ed-text-small);
  font-weight: 600;
  color: var(--ed-accent);
  text-decoration: none;
}

.ad-cta:hover {
  color: var(--ed-accent-deep);
}

/* Sidebar sticky ad */
.ad-sidebar-sticky {
  background: var(--ed-bg-elevated);
  border: 1px solid var(--ed-border);
  border-radius: var(--ed-radius-md);
  padding: var(--ed-space-md);
}

.ad-sidebar-image {
  position: relative;
  aspect-ratio: 4/3;
  margin: -var(--ed-space-md) -var(--ed-space-md) var(--ed-space-md);
  overflow: hidden;
  border-radius: var(--ed-radius-md) var(--ed-radius-md) 0 0;
}

/* Article header sponsor */
.ad-article-header {
  display: flex;
  align-items: center;
  gap: var(--ed-space-sm);
  padding: var(--ed-space-sm) 0;
  border-top: 1px solid var(--ed-border);
  border-bottom: 1px solid var(--ed-border);
  margin: var(--ed-space-md) 0;
}

.ad-article-header .ad-eyebrow {
  margin: 0;
  flex-shrink: 0;
}

.ad-article-header .ad-headline {
  margin: 0;
  font-size: var(--ed-text-small);
}

/* Inline article recommendation */
.ad-inline-recommendation {
  background: var(--ed-bg-subtle);
  border-left: 3px solid var(--ed-accent);
  padding: var(--ed-space-lg);
  margin: var(--ed-space-xl) 0;
  border-radius: 0 var(--ed-radius-md) var(--ed-radius-md) 0;
}

/* Calendar featured event */
.ad-calendar-featured {
  background: var(--ed-bg-elevated);
  border: 1px solid var(--ed-accent-soft);
  border-radius: var(--ed-radius-lg);
  overflow: hidden;
  margin-bottom: var(--ed-space-xl);
  display: grid;
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 768px) {
  .ad-calendar-featured {
    grid-template-columns: 1fr;
  }
}

/* Site footer partners */
.ad-footer-partners {
  display: flex;
  align-items: center;
  gap: var(--ed-space-lg);
  flex-wrap: wrap;
  justify-content: center;
  padding: var(--ed-space-md) 0;
}

.ad-footer-partner-logo {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.ad-footer-partner-logo:hover {
  opacity: 1;
}
```

### 7E — Build all 12 components

Each follows the same pattern as GuideSidebarSticky example above. Variations in styling per the centralized CSS classes. Same data-fetching pattern (get_active_ads RPC call). Same impression tracking. Same graceful empty rendering.

Add barrel export at `/src/components/ads/index.ts`:

```typescript
export { GuideFeaturedStrip } from './GuideFeaturedStrip';
export { GuideSidebarSticky } from './GuideSidebarSticky';
export { GuideInlineAd } from './GuideInlineAd';
export { GuideInlineSponsored } from './GuideInlineSponsored';
export { ArticleHeaderSponsor } from './ArticleHeaderSponsor';
export { ArticleInlineRecommendation } from './ArticleInlineRecommendation';
export { ArticleFooterListings } from './ArticleFooterListings';
export { CalendarFeaturedEvent } from './CalendarFeaturedEvent';
export { CalendarInlinePromotion } from './CalendarInlinePromotion';
export { NewsletterSponsorSlot } from './NewsletterSponsorSlot';
export { HomepageHeroRotator } from './HomepageHeroRotator';
export { SiteFooterPartners } from './SiteFooterPartners';
```

### 7F — DONE WHEN

[ ] All 12 ad placement components built
[ ] Common ad styling added to globals.css
[ ] Components export from /src/components/ads/index.ts
[ ] Each component pulls from get_active_ads RPC
[ ] Each component renders gracefully with no ad (returns null)
[ ] Each component has proper "Sponsored" or "Partner" eyebrow

═══════════════════════════════════════════════════════
## TASK 8 — INTEGRATE AD PLACEMENTS INTO PAGES
═══════════════════════════════════════════════════════

Wire the 12 components into the actual pages where they belong.

### 8A — GuideMagnificentIssue updates

Update `/src/components/editorial/GuideMagnificentIssue.tsx`:

- Sidebar sticky: render `<GuideSidebarSticky guideUrlSlug={guide.url_slug} />` at the bottom of the sticky sidebar (after CrossLinkBlock)
- Inline mid-grid: replace existing AdSlot interleaving with `<GuideInlineAd guideUrlSlug={guide.url_slug} position={i} />` every 9 listings
- Inline sponsored: render `<GuideInlineSponsored guideUrlSlug={guide.url_slug} />` after editorial intro paragraphs, before featured listings strip

### 8B — Family Resource Guide updates

Update `/src/app/family-resource-guide/page.tsx`:

- After WhereToStart, before insider tips: render `<GuideSidebarSticky guideUrlSlug="family-resource-guide" />` as a centered card (use existing styling but center it)
- Or alternatively: render in sidebar layout if FRG has a sidebar

### 8C — Calendar page updates

Update `/src/app/calendar/page.tsx`:

- At top of page (above filter bar, below hero): render `<CalendarFeaturedEvent />`
- Between every 6-8 events in the list/gallery: render `<CalendarInlinePromotion />`

### 8D — Article pages updates (when articles exist)

Update article rendering pages to include:
- `<ArticleHeaderSponsor articleSlug={...} />` below article title
- `<ArticleInlineRecommendation articleSlug={...} />` after every 1000 words of content
- `<ArticleFooterListings articleSlug={...} />` at article footer

For articles that don't exist yet, this just means the article template includes the placeholder rendering — no ads show until placements are created.

### 8E — Site-wide footer

Update the footer (likely in EditorialLayout or similar shared component):
- At top of footer, before the legal/copyright text: render `<SiteFooterPartners />`
- Renders 4-6 partner logos in a horizontal strip

### 8F — DONE WHEN

[ ] GuideMagnificentIssue includes sidebar sticky + inline + inline sponsored ads
[ ] Family Resource Guide has sidebar sticky placement
[ ] Calendar has featured event + inline promotion placements
[ ] Article template includes header sponsor + inline + footer placements
[ ] Site footer includes partner strip
[ ] Visit /healthy-kids-guide — see DFC sidebar sticky ad
[ ] Visit /family-resource-guide — see RRP partnership ad in sidebar
[ ] Visit /calendar — see DFC featured event spotlight at top

═══════════════════════════════════════════════════════
## TASK 9 — ADMIN ADS MANAGEMENT INTERFACE
═══════════════════════════════════════════════════════

Build minimum-viable admin interface for managing ads.

### 9A — Build /src/app/admin/ads/page.tsx

Single page that lists all ad_placements with filtering and inline status toggle:

- Table view: Placement Type | Context | Advertiser | Headline | Active | Impressions | Clicks | Actions
- Filter dropdown: by placement_type
- Filter dropdown: by advertiser
- Toggle button: activate/deactivate
- Edit button: opens form to update creative

### 9B — Build /src/app/admin/ads/new/page.tsx

Form to create new ad placement:
- Placement type dropdown (the 12 types)
- Context type dropdown (guide / article / calendar / newsletter / site_global)
- Context slug autocomplete (loaded from guide_types or articles or events)
- Advertiser account autocomplete
- Creative fields (eyebrow, headline, description, CTA, link, image URL)
- Schedule (starts_at, ends_at)
- Display priority
- Save button

### 9C — Build /src/app/admin/ads/[id]/edit/page.tsx

Edit form for existing ad placement (same fields as new, pre-populated).

### 9D — Build API routes

- POST /api/admin/ads — create new
- PATCH /api/admin/ads/[id] — update
- DELETE /api/admin/ads/[id] — delete (soft via is_active=false)

### 9E — Build /api/ads/impression and /api/ads/click

Already exists or build:

```typescript
// POST /api/ads/impression
export async function POST(request: Request) {
  const { ad_id } = await request.json();
  await supabase.rpc('increment_ad_impression', { p_ad_id: ad_id });
  return Response.json({ ok: true });
}

// POST /api/ads/click  
export async function POST(request: Request) {
  const { ad_id } = await request.json();
  await supabase.rpc('increment_ad_click', { p_ad_id: ad_id });
  return Response.json({ ok: true });
}
```

Add SQL functions to migration 035:

```sql
CREATE OR REPLACE FUNCTION increment_ad_impression(p_ad_id UUID) 
RETURNS void LANGUAGE sql AS $$
  UPDATE ad_placements SET impression_count = impression_count + 1 WHERE id = p_ad_id;
$$;

CREATE OR REPLACE FUNCTION increment_ad_click(p_ad_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE ad_placements SET click_count = click_count + 1 WHERE id = p_ad_id;
$$;
```

### 9F — DONE WHEN

[ ] /admin/ads list view works with filtering
[ ] /admin/ads/new form creates ads
[ ] /admin/ads/[id]/edit form updates ads
[ ] API routes work
[ ] Impression and click tracking functions added
[ ] Verify creating a new ad shows up immediately on the public page

═══════════════════════════════════════════════════════
# PART 3 — MAY 2026 CONTEXTUAL CONTENT
═══════════════════════════════════════════════════════

## TASK 10 — EDITOR'S NOTE ON /local-guides
═══════════════════════════════════════════════════════

The /local-guides page (magazine table of contents) needs an Editor's Note that grounds the May 2026 issue.

### 10A — Editor's Note section

Insert between the publisher's note and the GuideShowcase. Build component `/src/components/editorial/EditorsNote.tsx`:

```typescript
'use client';

interface Props {
  month: string;
  year: number;
  body: string;
  signedBy: string;
  signedRole: string;
}

export function EditorsNote({ month, year, body, signedBy, signedRole }: Props) {
  return (
    <section className="editors-note">
      <div className="ed-container" style={{ maxWidth: 720 }}>
        <p className="ed-eyebrow">From the Editor — {month} {year}</p>
        <div className="editors-note-body">
          {body.split('\n\n').map((para, i) => (
            <p key={i} className="ed-body-lead" style={{ marginBottom: 'var(--ed-space-md)' }}>
              {para}
            </p>
          ))}
        </div>
        <div className="editors-note-signature">
          <p className="signed-name">{signedBy}</p>
          <p className="signed-role">{signedRole}</p>
        </div>
      </div>
    </section>
  );
}
```

Styling:

```css
.editors-note {
  padding: var(--ed-space-3xl) 0;
  background: var(--ed-bg);
}

.editors-note-body {
  margin-top: var(--ed-space-md);
}

.editors-note-signature {
  margin-top: var(--ed-space-lg);
  padding-top: var(--ed-space-md);
  border-top: 1px solid var(--ed-border);
}

.signed-name {
  font-family: var(--ed-font-serif);
  font-style: italic;
  font-size: 1.25rem;
  color: var(--ed-text);
  margin: 0;
}

.signed-role {
  font-size: var(--ed-text-caption);
  color: var(--ed-text-soft);
  margin: 4px 0 0;
}
```

### 10B — Real May 2026 Editor's Note content

In the /local-guides page, render with this content:

```typescript
<EditorsNote
  month="May"
  year={2026}
  body={`May in the River Region is when everything starts to bloom — schools wind down, summer plans take shape, and the calendar fills up faster than you can write it down. This is the issue we built for that.

This month, you'll find our complete Summer Camp Guide ready for last-minute decisions, new insider tips on Mother's Day local experiences, and a fresh batch of stories from local moms about how they're navigating the end-of-year school stretch.

If you're new to the River Region, start with our Family Resource Guide — it's the closest thing to a friend who's lived here for decades and remembers everything. And if you're looking for something specific this month, the calendar is updated daily by our editors and submitted by the local organizations who know what's coming.

Welcome to the May 2026 issue. Browse what's here, bookmark what helps, and let us know what we missed.`}
  signedBy="DeAnne Watson"
  signedRole="Editor, River Region Parents"
/>
```

### 10C — DONE WHEN

[ ] EditorsNote component built and styled
[ ] /local-guides renders Editor's Note with May 2026 content
[ ] Signed by DeAnne Watson
[ ] Visual quality matches editorial language

═══════════════════════════════════════════════════════
## TASK 11 — "MAY HIGHLIGHTS" SECTION ON /local-guides
═══════════════════════════════════════════════════════

After the GuideShowcase, before featured articles, add a "May Highlights" section that surfaces what's contextually relevant for May.

### 11A — Build MayHighlights component

`/src/components/editorial/MayHighlights.tsx`:

Renders 4 highlight cards:

1. **Mother's Day Weekend** (May 9-10) — links to relevant calendar events
2. **Memorial Day Weekend** (May 23-25) — links to Summer Fun Guide
3. **End of School Year** — links to After-school + Summer Camp Guides
4. **Summer Prep Starts Now** — links to Summer Camp Guide + Healthy Kids (camp physicals)

Each card: small thumbnail image, eyebrow ("MAY 9-10" / "WEEKEND OF" / etc.), headline, 1-2 sentence description, "Browse →" CTA.

### 11B — Layout

4-card horizontal grid on desktop, 2x2 on tablet, single column on mobile.

```css
.may-highlights {
  padding: var(--ed-space-2xl) 0;
  background: var(--ed-bg-subtle);
  border-top: 1px solid var(--ed-border);
  border-bottom: 1px solid var(--ed-border);
}

.may-highlights-header {
  text-align: center;
  margin-bottom: var(--ed-space-xl);
}

.may-highlights-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--ed-space-md);
}

@media (max-width: 1024px) {
  .may-highlights-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .may-highlights-grid {
    grid-template-columns: 1fr;
  }
}

.may-highlight-card {
  background: var(--ed-bg-elevated);
  padding: var(--ed-space-lg);
  border-radius: var(--ed-radius-md);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.may-highlight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(31, 27, 22, 0.06);
}
```

### 11C — DONE WHEN

[ ] MayHighlights component built
[ ] /local-guides includes May Highlights between GuideShowcase and articles
[ ] All 4 cards link to appropriate destinations
[ ] Mobile responsive

═══════════════════════════════════════════════════════
## TASK 12 — "MAY 2026 SPOTLIGHT" CALLOUT ON GUIDE PAGES
═══════════════════════════════════════════════════════

Each individual guide page sidebar gets a "May 2026 Spotlight" callout box that surfaces what's specifically relevant THIS MONTH for that guide.

### 12A — Migration 036: monthly_spotlights table

```sql
CREATE TABLE IF NOT EXISTS guide_monthly_spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_type_slug TEXT REFERENCES guide_types(slug),
  spotlight_month INT NOT NULL,
  spotlight_year INT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_monthly_spotlights ON guide_monthly_spotlights(guide_type_slug, spotlight_month, spotlight_year, is_active);
```

### 12B — Seed May 2026 spotlights for each guide

```sql
INSERT INTO guide_monthly_spotlights (guide_type_slug, spotlight_month, spotlight_year, headline, body, cta_label, cta_link) VALUES
('newcomer', 5, 2026, 'New to the River Region this spring?', 'May is one of the best months to get out and meet your community. Mother''s Day events, Memorial Day weekend gatherings, and farmers markets in full swing.', 'See This Week''s Calendar', '/calendar'),
('private-school', 5, 2026, 'May is application decision time.', 'Most private schools have made enrollment decisions by mid-May. If you''re still deciding, schedule a final tour now — slots fill quickly for fall.', 'Browse Schools', '/private-school-guide'),
('summer-camp', 5, 2026, 'Last chance for popular summer camps.', 'Premium camps and specialty programs are filling fast. Most have rolling registration — check availability now to avoid sold-out disappointment.', 'Browse Summer Camps', '/summer-camp-guide'),
('childcare', 5, 2026, 'Summer childcare gaps starting?', 'School lets out in late May. If you need full-day childcare for the summer, now is the time to confirm spots and waitlists.', 'Find Summer Childcare', '/childcare-guide'),
('healthy-kids', 5, 2026, 'Summer physicals and camp forms.', 'Most summer camps require physical exams within 12 months. Schedule your child''s appointment now — pediatrician offices fill up fast in May.', 'Find a Pediatrician', '/healthy-kids-guide'),
('summer-fun', 5, 2026, 'Mother''s Day weekend is here.', 'Local restaurants, gardens, museums, and cruises are hosting Mother''s Day brunches and events. See what''s happening this weekend.', 'See Mother''s Day Events', '/calendar'),
('birthday-party', 5, 2026, 'Spring and summer birthday season.', 'May through August is peak birthday party season in the River Region. Outdoor venues, splash parties, and pool clubs book up fast — start planning now.', 'Browse Party Venues', '/birthday-party-guide'),
('afterschool', 5, 2026, 'School year wind-down planning.', 'Most after-school programs end in late May. Summer transitions matter — find programs that bridge the gap between school and summer camp.', 'Browse Programs', '/afterschool-guide'),
('special-needs', 5, 2026, 'Summer transitions and IEP review.', 'School year-end is when IEP teams review progress. May is also when summer programs designed for special needs kids open registration.', 'Find Resources', '/special-needs-guide');
```

### 12C — Build MonthlySpotlight component

`/src/components/editorial/MonthlySpotlight.tsx`:

```typescript
interface Props {
  spotlight: {
    headline: string;
    body?: string;
    cta_label?: string;
    cta_link?: string;
  };
  monthName: string;
  year: number;
}

export function MonthlySpotlight({ spotlight, monthName, year }: Props) {
  return (
    <div className="monthly-spotlight">
      <p className="ed-eyebrow">{monthName} {year} Spotlight</p>
      <h3 className="monthly-spotlight-headline">{spotlight.headline}</h3>
      {spotlight.body && <p className="monthly-spotlight-body">{spotlight.body}</p>}
      {spotlight.cta_label && spotlight.cta_link && (
        <Link href={spotlight.cta_link} className="monthly-spotlight-cta">
          {spotlight.cta_label} →
        </Link>
      )}
    </div>
  );
}
```

Styling: subtle background variant of the sidebar card, slightly different visual treatment to feel "current" / "this month."

### 12D — Integrate into GuideMagnificentIssue sidebar

Update GuideMagnificentIssue to fetch the current month's spotlight for this guide and render it at the TOP of the sidebar (above Insider Tips).

### 12E — DONE WHEN

[ ] Migration 036 applied
[ ] All 9 guides have May 2026 spotlights seeded
[ ] MonthlySpotlight component built
[ ] Each guide page sidebar shows May 2026 Spotlight at top
[ ] Component pulls dynamically based on current month

═══════════════════════════════════════════════════════
## TASK 13 — FOOTER DATE STAMP
═══════════════════════════════════════════════════════

Add "May 2026 Issue · Updated [today's date]" to the site-wide footer.

### 13A — Update EditorialLayout footer

In the shared editorial footer rendering, add a small line:

```tsx
<p className="footer-issue-stamp">
  May 2026 Issue · Updated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
</p>
```

Styling: very small, subtle, near the copyright text.

### 13B — DONE WHEN

[ ] Footer shows "May 2026 Issue · Updated [date]"
[ ] Visible on every page

═══════════════════════════════════════════════════════
## TASK 14 — KNOWLEDGE BASE + STATUS REPORT
═══════════════════════════════════════════════════════

### 14A — Update knowledge base

Add to `/docs/keepsharing-knowledge-base.md`:

```markdown
## BUILD RUN #15 — DEPLOYED [DATE]

### Part 1 — Polish:
- All hero images downloaded locally to /public/images/heroes/
- Migration 034: guide hero image paths updated to local files
- Letter avatars replaced with branded color blocks using guide accent colors
- WhereToStart visually polished with thumbnails and hover states
- Mom-to-Mom quote treatment enhanced (large decorative quote marks)
- Mobile responsive verified across 7 primary pages

### Part 2 — Ad Placement System:
- Migration 035: ad_placements table + helper functions
- 12 ad placement components built across guides, articles, calendar, newsletter, footer
- Editorial-quality treatment (no banners, no popups, no display networks)
- DFC seeded with 3 active placements
- RRP self-promo seeded with 5 placements
- /admin/ads management interface
- Impression and click tracking via SQL functions

### Part 3 — May 2026 Contextual:
- Migration 036: guide_monthly_spotlights table
- Editor's Note from DeAnne on /local-guides
- May Highlights section (4 cards) on /local-guides
- May 2026 Spotlight callouts on each guide page sidebar
- Footer date stamp

### What's Next:
- Build Run #16: Newsletter redesign with 23 Points formula + annual update + upsell engine
```

### 14B — Truthful status report

Per task done/incomplete. Counts of placements rendering. Migrations applied vs pending. Any deferred work documented.

### 14C — DONE WHEN

[ ] Knowledge base updated
[ ] Status report posted truthfully

═══════════════════════════════════════════════════════
## SUCCESS CRITERIA
═══════════════════════════════════════════════════════

Jason can:

1. **Visit `/local-guides`** and see: hero photo loaded, Editor's Note from DeAnne, all 9 guide cards with photos, May Highlights section with 4 contextual cards, featured articles, calendar peek, newsletter signup
2. **Visit `/family-resource-guide`** and see: hero loaded, WhereToStart with polished visual treatment, RRP partnership ad in editorial style, insider tips, Mom-to-Mom with proper quote marks
3. **Visit `/private-school-guide`** and see: hero loaded, May 2026 Spotlight at top of sidebar, Featured Listings with branded color blocks (no letter avatars), DFC sidebar sticky ad if applicable, full listings, RRP newsletter ad inline mid-page
4. **Visit `/healthy-kids-guide`** and see: DFC's "First dental visits, made easier" sticky sidebar ad following scroll, mid-page DFC inline sponsored card, all listings
5. **Visit `/calendar`** and see: hero photo (not random mountain road), DFC featured event spotlight at top, RRP newsletter inline promotion between events
6. **Visit `/admin/ads`** and see: list of 8+ active ads, ability to toggle, edit, create new
7. **Open mobile DevTools view at 390px** and see all primary pages render correctly without overflow or broken layouts
8. **See "May 2026 Issue · Updated May 2, 2026"** in the footer of every page

═══════════════════════════════════════════════════════
## FINAL CHECKLIST
═══════════════════════════════════════════════════════

[ ] download-hero-images.ts ran, 11 hero images saved locally
[ ] Migration 034 applied (hero paths)
[ ] Migration 035 applied (ad_placements + functions)
[ ] Migration 036 applied (monthly_spotlights)
[ ] Letter avatars replaced with branded color blocks
[ ] WhereToStart polished
[ ] Mom-to-Mom polished
[ ] Mobile responsive verified on 7 pages
[ ] All 12 ad placement components built
[ ] DFC seeded with 3 placements
[ ] RRP self-promo seeded with 5 placements
[ ] Ad placements integrated into guide pages
[ ] Ad placements integrated into calendar
[ ] Ad placements integrated into article template
[ ] Site footer partner strip live
[ ] /admin/ads management interface working
[ ] Impression/click tracking functional
[ ] EditorsNote on /local-guides with May 2026 content
[ ] MayHighlights section on /local-guides
[ ] MonthlySpotlight callouts on each guide sidebar
[ ] Footer date stamp on every page
[ ] Knowledge base updated
[ ] Truthful status report

Then STOP.

GO.
