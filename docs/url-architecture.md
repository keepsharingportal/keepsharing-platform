# URL Architecture — River Region Parents Platform

## Guide URL Structure

Each guide lives at its own top-level URL. The "Local Guides" page is a magazine-style table of contents at `/local-guides`.

| Guide | URL | guide_types.slug | guide_types.url_slug |
|-------|-----|-----------------|---------------------|
| Family Resource Guide (newcomer) | /family-resource-guide | newcomer | family-resource-guide |
| Private School Guide | /private-school-guide | private-school | private-school-guide |
| Summer Camp Guide | /summer-camp-guide | summer-camp | summer-camp-guide |
| Childcare Guide | /childcare-guide | childcare | childcare-guide |
| Healthy Kids Guide | /healthy-kids-guide | healthy-kids | healthy-kids-guide |
| Summer Fun Guide | /summer-fun-guide | summer-fun | summer-fun-guide |
| Birthday Party Guide | /birthday-party-guide | birthday-party | birthday-party-guide |
| After-School Guide | /afterschool-guide | afterschool | afterschool-guide |
| Special Needs Guide | /special-needs-guide | special-needs | special-needs-guide |
| Local Guides (TOC) | /local-guides | — | — |

## Listing URLs

Listing detail pages are at `/{guide-url-slug}/listings/{advertiser-slug}`:

- `/private-school-guide/listings/saint-james-school`
- `/healthy-kids-guide/listings/dentistry-for-children`
- `/family-resource-guide/listings/some-business`

## Calendar URLs

- `/calendar` — main calendar page (list + gallery views)
- `/calendar/events/{slug}` — individual event detail pages

## Redirects

Old `/family-resource-guide/[guide-slug]` URLs redirect permanently to new top-level URLs. Defined in `next.config.ts`.

## Route Implementation

Because `[neighborhood]` already exists as a dynamic route at `src/app/`, a separate `[guideSlug]` dynamic route cannot be used. Instead, each guide has its own static directory:

```
src/app/
  family-resource-guide/    ← Family Resource Guide (newcomer)
    page.tsx                ← calls GuideMagnificentIssue('family-resource-guide')
    listings/[listingSlug]/page.tsx
  private-school-guide/     ← each guide gets its own directory
    page.tsx
    listings/[listingSlug]/page.tsx
  [...]
  local-guides/             ← magazine table of contents
    page.tsx
  calendar/
    page.tsx
    events/[slug]/page.tsx
```

All guide pages call the shared `GuideMagnificentIssue` server component. All listing pages call `GuideListingDetail`.

## Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| GuideMagnificentIssue | src/components/editorial/ | Full guide page template (queries DB internally) |
| GuideListingDetail | src/components/listings/ | Listing detail template |
| GuideShowcase | src/components/editorial/ | Reusable guide card grid (compact/standard/full density) |

## Adding a New Guide

1. Add a row to `guide_types` with `slug`, `url_slug`, `display_name`, etc.
2. Create `src/app/{url_slug}/page.tsx` calling `GuideMagnificentIssue('{url_slug}')`
3. Create `src/app/{url_slug}/listings/[listingSlug]/page.tsx` calling `GuideListingDetail('{url_slug}')`
4. Add to `GUIDE_NAV` array in `EditorialHeader.tsx`
5. Import CSV data with `npm run import-guides` (add to GUIDE_CSV_MAP in script)
