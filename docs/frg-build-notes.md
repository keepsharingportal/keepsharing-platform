# FRG Vertical Homepage — Build Notes (BR22)
_Audit completed: 2026-05-08_

## What /newcomer-guide currently renders
Full-page hero (background image + gradient overlay, eyebrow, italic H1, subtitle, issue label, 2 CTAs). Start Here section (3 guide_articles cards, fallback to hardcoded gradient cards). Dynamic listing group sections (Schools, Pediatric Care, etc.) pulled from guide_categories + guide_listings via category_id join. First 30 Days playbook (hardcoded, 3-column checklist). Articles grid. Full filterable directory via client-side GuideDirectory accordion. NewsletterSignup inline. Advertise CTA dark-navy band. Header/footer via newcomer-guide/layout.tsx (PublicHeader, compact footer newsletter, MobileNav).

## Reusable components as-is
- `NewsletterSignup` — already handles source tagging, form state, success state
- `FeaturedListing`, `EnhancedListing`, `FreeListing` — listing tier cards
- `SponsorBanner` — advertise CTA band
- `PublicHeader` — site header (used in newcomer-guide layout)
- CSS custom properties (--fg-navy, --fg-gold, --fg-cream, etc.) and font variables

## What's missing for vertical homepage pattern
- `guide_meta` table: no table exists for per-guide hero copy (eyebrow, title, subtitle, issue label, hero_image_url)
- `guide_start_cards` table: Start Here cards are hardcoded in newcomer-guide page, not database-driven
- `guide_playbook_sections` / `guide_playbook_items` tables: playbook is hardcoded in newcomer-guide page
- `<GuidePageLayout>` shared component: does not exist yet
- FRG-specific article tagging: no guide_articles rows with guide_slug = 'family-resource-guide'

## Guide metadata table
`guide_types` has: id, slug (internal, e.g. 'newcomer'), url_slug (e.g. 'family-resource-guide'), display_name, short_description, hub_intro_paragraph, hero_image_url, pitch, primary_filter_field, publishes_annually, display_order. FRG record: slug='newcomer', url_slug='family-resource-guide'. No hero_eyebrow, hero_subtitle, hero_issue_label columns — creating guide_meta table instead.

## Existing listing systems (dual-track)
- Migration 012 system: guide_categories (guide_slug='newcomer-guide') + guide_listings (category_id FK) — used by /newcomer-guide page
- Migration 028 system: guide_types (slug='newcomer') + guide_listings (guide_type_slug='newcomer') — used by GuideDetailPage
- FRG page will use EmptyDirectory placeholder until listings migrate to new vertical homepage pattern

## Newsletter API
Already accepts and persists source field (TEXT column in newsletter_subscribers from migration 026). Phase 5 requires no changes.

## Gotchas
- guide_articles has NO category column — use column_slug or guide_slug for display labels
- guide_articles.guide_slug is inconsistent: older rows use 'newcomer-guide', newer rows use 'newcomer' — query both for fallback
- family-resource-guide/layout.tsx currently passes children through (no fonts/header) — must update before FRG page renders correctly
- GuideDirectory client component is local to src/app/newcomer-guide/ — DO NOT import cross-app; use EmptyDirectory slot for FRG
