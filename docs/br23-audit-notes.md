# BR23 Audit Notes — May 8, 2026

## `/summer-fun-guide` Current State

**Component:** Uses `GuideDetailPage` (src/components/guides/GuideDetailPage.tsx) — the old generic guide template.

**What it renders:**
- `PageHeader` with listing count and category filter count
- `Navigation` + `PublicFooter` (full chrome)
- Section sponsor banner or "available" CTA
- Featured providers grid (from `guide_listings` where `listing_tier IN ('featured', 'tier-1-featured-listing', ...)`)
- Standard listings in a 2-col grid with inline ad after 4th item
- Sidebar: category filter badges, map card, editorial intro, insider tips, related article, advertise CTA

**Data sources:**
1. `guide_types` table — finds record with `url_slug = 'summer-fun-guide'` (slug = 'summer-fun')
2. `guide_listings` table — queries with `guide_type_slug = 'summer-fun'` — this is the NEW guide_listings from migration 028 architecture that links to `advertiser_accounts`
3. `guide_articles` — for related article sidebar

**NOT using** the dedicated `summer_fun_guide` table (from migrations 009/010).

---

## Summer Fun Listings: Two Tables

**Table 1: `summer_fun_guide`** (migrations 009, 010)
- Dedicated standalone table for summer activities
- Columns: `id`, `business_name`, `category`, `description`, `ages`, `photo_url`, `price_range`, `registration_status`, `indoor_outdoor`, `listing_tier` (community/enhanced/advertiser), `featured`, `slug`, `neighborhood_tag`, `publication`, plus v2 boolean fields
- Row-level security: public SELECT allowed
- This table has the richer summer-specific fields (ages, indoor_outdoor, price_range, etc.)

**Table 2: `guide_listings`** (migrations 012/013/028)
- Hybrid table: started in migration 012 with `category_id` FK (the old newcomer-guide architecture), then migration 028 tried to add a new version with `guide_type_slug` + `advertiser_account_id` FK. Since 012 ran first, the IF NOT EXISTS in 028 was a no-op.
- Current columns (from 012+013): `category_id`, `slug`, `business_name`, `address`, `listing_tier` (free/enhanced/featured), `tags`, `needs_research`, etc.
- `GuideDetailPage` queries this table with `guide_type_slug = 'summer-fun'` — but this column was attempted in 028 and likely does not exist on the actual 012-schema table in prod. In practice, this query returns 0 results (no summer fun entries here).

**Conclusion:** Summer Fun listings live in `summer_fun_guide`. The BR23 directory slot should query that table.

---

## FRG Listings: Where They Live

**Newcomer-guide listings** are stored in:
1. `guide_categories` — rows with `guide_slug = 'newcomer-guide'`
2. `guide_listings` (from migration 012) — rows linked to those categories via `category_id`

The `guide_listings` table (012 schema) has NO `guide_slug` column of its own. The guide association is indirect through `guide_categories`.

**Migration fix required:** The spec says `UPDATE family_guide_listings SET guide_slug = 'family-resource-guide' WHERE guide_slug = 'newcomer-guide'` but there is NO `family_guide_listings` table. The correct operation is:

```sql
UPDATE guide_categories
SET guide_slug = 'family-resource-guide'
WHERE guide_slug = 'newcomer-guide';
```

This migrates all categories (and their linked listings) to appear under family-resource-guide.

---

## FRG Hero Image Source

In `guide_meta` table, seeded by migration 043:
```
hero_image_url = 'https://images.unsplash.com/photo-1602030638412-bb8dcc0bc8b0?w=1600&q=80'
```
This is the burger Unsplash placeholder. It also appears as the hardcoded fallback in `family-resource-guide/page.tsx` line 156.

---

## GuidePageLayout — What Needs Changing

1. **`heroImageUrl` type**: Currently `string` (non-nullable) in both `GuidePageLayoutProps` and the `<Image>` render. Must become `string | null`.
2. **Hero section**: Currently always renders `<Image src={heroImageUrl} ...>`. Must conditionally render either `<Image>` (when URL is non-empty) or a gradient `<div>` (when null/empty).
3. **Gradient spec**: Navy (top-left) to gold (bottom-right). Use existing CSS variables: `--fg-navy` (#1a2744) and `--fg-gold` (#d4a847). Same height: `min-h-[55vh] md:min-h-[70vh]`.

---

## FRG Page (`family-resource-guide/page.tsx`) — What Needs Changing

1. **`heroImageUrl` fallback on line 156**: Currently falls back to the Unsplash burger URL if DB row is null. Must fall back to `null` so the gradient triggers.
2. **`directorySlot`**: Currently `<EmptyDirectory />`. After migration 044, categories will have `guide_slug = 'family-resource-guide'`. Need to query `guide_categories` + `guide_listings` and render a listings component.
3. **`articleHref` helper on line 44-49**: Has a comment referencing `newcomer-guide` routing — should route to `/family-resource-guide/articles/` for the renamed slug.

---

## Reusable As-Is

- All of `GuidePageLayout.tsx` except the hero section's `<Image>` assumption
- The data fetching pattern in `family-resource-guide/page.tsx` (guide_meta, start_cards, playbook, articles)
- `FeaturedListing`, `EnhancedListing`, `FreeListing` components from `@/components/family-guide/` — can be used in FRG directory slot
- `GuideDirectory` from `src/app/newcomer-guide/GuideDirectory.tsx` — full directory with filter tabs

---

## Summer Fun `guide_meta` — No Row Exists Yet

The `guide_meta` table (created in migration 043) has a row for `family-resource-guide` but NOT yet for `summer-fun-guide`. Migration 044 must INSERT the Summer Fun row.

---

## `guide_playbook_sections` Uniqueness

The `guide_playbook_sections` table has `UNIQUE (guide_slug, display_order)`. Summer Fun uses `display_order: 1` (per BR23 spec). FRG uses `display_order: 0`. No conflict.

---

## `next.config.ts` Redirect Gap

Current redirects: `/family-guide` → `/newcomer-guide`, but NO redirect from `/newcomer-guide` → `/family-resource-guide`. Phase 5 adds this.

The spec adds two redirect rules:
- `/newcomer-guide` → `/family-resource-guide` (permanent)
- `/newcomer-guide/:path*` → `/family-resource-guide/:path*` (permanent)

These must be inserted BEFORE the existing `/family-guide` → `/newcomer-guide` redirects to avoid order conflicts.
