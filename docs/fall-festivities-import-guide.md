# Fall Festivities & Halloween Fun Guide — import guide (2026)

For Connie, ahead of the ~92-row import.

- **Guide to pick in the importer:** "Fall Festivities & Halloween Fun Guide"
- **Internal slug:** `fall-festivities`
- **Public URL:** `/fall-festivities-halloween-fun-guide`
- **Importer:** `/admin/content/guide-listings-import`

---

## There is no category slug map

Categories are stored as the **human label, verbatim** — exactly what's in the
CSV cell. Nothing is slugified, lowercased or mapped. That's how every other
guide works (Summer Fun stores `Art/Music/Theater`, not `art-music-theater`),
and the category filter, the coloured blocks and the `?category=` URL all key
off that same literal string.

The one consequence: **spelling and case must be identical down the column.**
`Pumpkin Patches` and `Pumpkin patches` become two separate blocks with the
listings split between them. Sort the column in the spreadsheet and eyeball it
before importing.

### Suggested category set

Not enforced — any label works — but these get a hand-picked icon and autumn
colour instead of a generic fallback. Anything else still renders, just with a
neutral panel.

| Category label | Renders as |
|---|---|
| `Pumpkin Patches & Farms` | orange, leaf icon |
| `Corn Mazes & Hayrides` | amber, tractor icon |
| `Trunk-or-Treats` | purple, candy icon |
| `Trick-or-Treat Events` | purple, candy icon |
| `Fall Festivals` | amber/red, party icon |
| `Church & School Festivals` | blue, church icon |
| `Haunted Houses & Trails` | dark slate/purple, ghost icon |
| `Costume Shops` | fuchsia, sparkle icon |
| `Halloween Events` | violet, moon icon |
| `Harvest & Fall Fun` | orange/red, leaf icon |

Matching is on substrings, case-insensitive — `Pumpkin Patches (Autauga)` still
hits the pumpkin identity.

---

## Columns

The importer auto-maps common headers and shows every mapping for review before
it runs. These land in real columns:

| CSV header (any of) | Where it goes |
|---|---|
| Business name / Name / Venue name | `business_name` **(required)** |
| Category / Type | `category` |
| Card hook / Tagline / Short blurb | `card_hook` — the one-line teaser on cards |
| Description / About / Details | long-form text |
| Phone, Email, Website | contact fields |
| Address, City, Neighborhood | address fields |
| Tier / Listing tier | `listing_tier` |

**Anything else lands in `guide_data`**, keyed by the header lowercased with
spaces turned into underscores. Four of those keys are special — they render as
the icon chips at the top of a featured listing's page, so name the columns
exactly:

| Use this header | Chip label |
|---|---|
| `Dates` | Dates |
| `Cost` | Admission |
| `Ages` | Best For Ages |
| `Hours` | Hours |

(Location is not a chip — the city/address already shows above the blurb.)

---

## Tiers

| Value in the Tier column | What the business gets |
|---|---|
| `featured` | Big card on the guide home page, full detail page, logo + photo gallery, contact form |
| `free` (or blank) | Name, hook, category and city on the category list. No detail page. |

`community` and `enhanced` are accepted for backward compatibility and behave
as free. Leave the column blank for anyone who isn't paying.

---

## Before / after the import

1. Import in **dry run** first — the importer previews every row.
2. Run **Backfill advertiser links** afterwards if any row reports "matched" but
   the listing doesn't appear. Listings render from `advertiser_accounts`, so an
   unlinked row is invisible.
3. Delete the two placeholder rows that are in there now for preview purposes:
   ```sql
   DELETE FROM guide_listings
    WHERE guide_type_slug = 'fall-festivities'
      AND business_name LIKE 'SAMPLE —%';
   DELETE FROM advertiser_accounts WHERE slug LIKE 'sample-%';
   ```

---

## Going live

The guide is **dark** until someone turns it on. Two independent gates:

- `guide_configs.is_active` — currently `false`. The checkbox on
  `/admin/guides/fall-festivities/edit`.
- `guide_types.live_from` / `live_until` — `2026-10-01` to `2026-11-08`. Date
  fields on the same screen.

Outside that window the public page returns Not Found, it's dropped from Local
Guides and from the sitemap, and its listings 404 too. Add `?preview=1` to any
of those URLs to proof it early — the page renders with an amber banner and is
noindexed, so nothing leaks into search.

**Still to do before 1 Oct:** upload a hero photo on the edit screen. There
isn't one yet, so the page currently shows the plain cream header.
