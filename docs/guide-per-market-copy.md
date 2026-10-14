# Per-market guide copy — what you can edit, and where

Every editorial string on a guide hub is settable per brand as **data**. No
code change, no deploy. This is the reference for filling a new brand's guide
copy in (Greater Pensacola today, the others when they launch).

Two tables do the work, and they answer different questions:

| Table | Question it answers | Grain |
|---|---|---|
| `guide_types` | What guides exist on the platform? | one row per guide, shared by all brands |
| `guide_configs` | Does **this brand** run this guide, when, and in what order? | one row per (brand, guide) |
| `guide_type_copy` | What does **this brand** say about it? | one row per (brand, guide) |

`guide_types` is the catalog. It is deliberately **not** per-brand: childcare
is childcare everywhere. Anything that reads differently in Pensacola than in
Montgomery belongs in one of the other two.

---

## 1. Editorial copy — `guide_type_copy`

One row per `(market, guide_type_slug)`. `market` is a brand slug from
`src/lib/markets.ts`, **or the literal `'*'`** for the neutral default.

| Column | Type | Renders as | Omitted when empty? |
|---|---|---|---|
| `display_name` | text | The `<h1>` and the `<title>` tag | falls back to `guide_types.display_name` |
| `short_description` | text | Hub subtitle (3rd choice), guide-library card | yes |
| `hub_intro_paragraph` | text | Hub subtitle (2nd choice) | yes |
| `pitch` | text | Hub subtitle (1st choice) | yes |
| `editorial_intro` | text | "From the editor" block; first paragraph only (split on a blank line) | yes — block disappears |
| `insider_tips` | jsonb | Tips list, first 4 shown. A JSON array of strings | yes — block disappears |
| `hero_image_url` | text | Header background image | falls back to `guide_types.hero_image_url`, then a flat header |

### Resolution order

For every field, independently:

1. the brand's own row (`market = 'gpp'`)
2. the neutral row (`market = '*'`)
3. for River Region only, the legacy columns still on `guide_types`
4. nothing — the field is omitted

**A brand never sees another brand's text.** Step 3 exists only because River
Region's copy predates this table; `LEGACY_COPY_MARKET` in
`src/lib/guides/market-copy.ts` is `'rrp'` and nothing else reads it.

### The subtitle is market-first, not field-first

The hub subtitle wants "pitch, else hub intro, else short description". Done
naively that reads precedence backwards: a brand that writes a
`hub_intro_paragraph` but leaves `pitch` empty would get the **neutral**
pitch, because `pitch` is consulted first across all markets. So the subtitle
takes the first non-empty of those three **from the brand's own row**, and only
then falls back to the neutral row's three. See `subtitleOf()`.

Practical consequence: you can fill just one of the three and it wins.

### Example

```sql
INSERT INTO guide_type_copy (market, guide_type_slug, pitch, editorial_intro, insider_tips)
VALUES (
  'gpp', 'childcare',
  'Licensed childcare across Escambia and Santa Rosa counties, with hours, ages and costs.',
  E'Finding care in Pensacola means juggling waitlists...\n\nSecond paragraph is stored but not shown on the hub.',
  '["Ask about the waitlist in February, not August.", "Military families: ask about the fee assistance program."]'::jsonb
)
ON CONFLICT (market, guide_type_slug) DO UPDATE SET
  pitch           = EXCLUDED.pitch,
  editorial_intro = EXCLUDED.editorial_intro,
  insider_tips    = EXCLUDED.insider_tips,
  updated_at      = now();
```

Leave a column out of the `DO UPDATE SET` list and it keeps its current value.

---

## 2. Structure and scheduling — `guide_configs`

| Column | Type | Effect |
|---|---|---|
| `is_active` | boolean | Master switch. `false` → the hub 404s publicly; `?preview=1` still renders |
| `category_order` | jsonb | Print order of the category filters (below) |
| `live_from` | date | Hub 404s before this date. Overrides `guide_types.live_from` |
| `live_until` | date | Hub 404s after this date. Overrides `guide_types.live_until` |
| `featured_month` | — | Picks the homepage featured-guide tile |

`live_from` / `live_until` arrive with **migration 234**. Either can be set
alone: a brand can push its end date out without restating its start. This is
what lets Greater Pensacola's fall guide run to **Dec 1** while River Region's
closes earlier.

### Two independent gates, on purpose

`is_active` is the editor's deliberate "go". The date window automates the part
a human forgets — taking a seasonal guide **down** again in November. A hub
still advertising pumpkin patches in February is worse than no hub.

### Preview

`?preview=1` renders an inactive guide without making it public. It works on
every guide, including the three with their own route trees (Birthday Party,
Family Resource, Newcomer) — those are gated in a `layout.tsx`, and a layout
cannot read `searchParams`, so the flag is carried by an `x-guide-preview`
header the proxy sets from the real URL. The proxy deletes any inbound copy
first, so a client cannot supply it.

### No config row ≠ inactive row

A brand with `is_active = false` is *preparing* a guide; `?preview=1` renders
it, which is the whole point. A brand with **no row at all** does not have that
guide in its library, and preview does not resurrect it — otherwise
`?preview=1` would render an empty Grown-Up Time hub under River Region's
masthead.

### `category_order`

A JSON array of category names, in print order. Drives the filter chips, the
section order and the bucket cards — **no per-brand code branches.**

```json
["Cakes & Treats", "Entertainment to You", "Places to Party", "Rental Entertainment / Party Supplies"]
```

Groups use `"Group - Child"` entries, and the group heading is derived:

```json
["Specific Resources - ADD/ADHD", "Specific Resources - Autism", "Therapy - Speech"]
```

- A category **not** listed still appears, sorted alphabetically after the
  listed ones. Nothing is ever hidden by omission.
- A listed category with no listings is hidden, as is an empty group.
- Matching accepts both the bare child name and the group-prefixed form, so
  existing listing data does not need rewriting.

### Bucket blurbs, metaTitles and icons

Buckets are derived from `category_order` (`bucketsFromCategoryOrder()`), and
the derivation deliberately invents **no blurb, no metaTitle and no icon**. A
generated blurb is confident-sounding copy nobody wrote. An absent blurb is
omitted from the card rather than printed empty — so a bucket with no blurb
renders as a clean card, not a broken one.

Those three are the fields to fill by hand per brand when you want them.

### The Birthday Party Guide's own tree

This guide predates the generic `GuideDetailPage` and has eleven routes of its
own, with a hand-authored bucket table (`BIRTHDAY_CATEGORY_BUCKETS`) carrying
River Region's CSV category names, editorial blurbs, icons and sub-types.

A brand that sets `category_order` gets derived buckets instead — label, slug
and category all from its own data, no code branch. Both the hub cards, the
sidebar and the category landing pages resolve through the same function
(`birthdayBuckets()` / `bucketBySlugForBrand()`), so a card and the page it
links to cannot disagree. Derived buckets have no sub-types: sub-navigation is
editorial structure somebody designed, not something to generate from a name.

One asymmetry worth knowing: when rendering cards, a category with no listings
is hidden (an empty section is worse than no section); when resolving a URL,
every declared category resolves, so an empty category says "nothing here yet"
rather than 404ing.

---

## 3. What is *not* in these tables

| Thing | Where it lives |
|---|---|
| Brand name, region phrase, towns | `src/lib/markets.ts` (code — brands are a fixed set) |
| Contact email / phone, socials, colours | `/admin/settings/brands` → `brand_voice` |
| Listing data | `guide_listings`, scoped by `market` |
| Dated event windows | `guide_listings.guide_data.start_date` / `.end_date` |

A brand with no contact email set renders **no** contact block rather than
borrowing another brand's. That is intentional: an unmonitored mailbox loses a
reader's message silently, and showing River Region's address to a Pensacola
parent is worse than showing none. Internal notification mail is the exception
and routes differently — see `src/lib/email/brand-recipient.ts`.

---

## Checklist for launching a brand's guide

1. `guide_configs` row exists for `(market, guide_type_slug)`, `is_active = false`.
2. `category_order` set to the brand's print order.
3. `guide_type_copy` row with at least one of `pitch` / `hub_intro_paragraph` /
   `short_description`.
4. Listings imported with the right `market` and categories matching
   `category_order`.
5. Check it with `?preview=1` — the hub is still 404 to the public.
6. Seasonal guide? Set `live_from` / `live_until` on the **config** row.
7. Flip `is_active = true`.
