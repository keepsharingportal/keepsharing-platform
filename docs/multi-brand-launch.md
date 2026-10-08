# Bringing a second brand online (GPP, ESP, MBP, AOP)

Status as of 2026-10-08. Written for Jason; Connie can run steps 1–3.

---

## What is done

Every brand now gets its own content, ads and guides off one codebase. Nothing
is GPP-specific — the same machinery brings Eastern Shore, Mobile Bay and
Auburn Opelika up whenever you want them.

| Layer | State |
|---|---|
| Brand resolution (domain → brand) | Worked already |
| Admin switcher + `allowed_markets` | Worked already |
| Articles — list | Scoped already |
| **Articles — create** | **Fixed** — now files to the brand in the switcher |
| Events | Scoped already (create + list) |
| **Ads — serving** | **Fixed** — a brand only serves its own + house ads |
| **Ads — create / list** | **Fixed** — stamped on create, scoped on list |
| **Guides** | **Fixed** — per-brand configs and listings |
| **Homepage** | **Fixed** — zero cross-brand leakage, verified |
| **Calendar page** | **Fixed** |
| **School Zone** | **Fixed** |

---

## Step 1 — run migration 232

`supabase/migrations/232_multi_brand_market_scoping.sql`, in the Supabase SQL
editor. It is safe to run while the site is live; the code already handles both
the before and after states.

It adds `market` to ad_placements, advertiser_accounts, guide_configs,
guide_listings and trending_items, backfills everything to `rrp`, activates
GPP/ESP/MBP, and seeds each new brand with River Region's full guide line-up
(every one switched **off**).

Verify at the bottom of the file.

## Step 2 — give the Gulf Coast publisher their brands

ESP, GPP and MBP share a publisher. One row, three markets:

```sql
UPDATE admin_users
   SET allowed_markets = ARRAY['esp','gpp','mbp'], role = 'publisher'
 WHERE email = '<their email>';
```

They will see only those three in the switcher, and only those three brands'
articles, events, ads and advertisers. You and Deanne are `super`, so you keep
"All brands" and can audit every market — that asymmetry is the point.

## Step 3 — point the domain at the deployment

Add `greaterpensacolaparents.com` to the Vercel project. The brand resolver
already maps that host to `gpp` (`src/lib/markets.ts`); nothing in code needs
to change.

Until the domain is live you can preview any brand from your own browser: set
a cookie `rrp_brand_override=gpp` on localhost or a vercel.app preview URL.

## Step 4 — fill GPP in

In the admin, switch the dropdown to Greater Pensacola, then:

- **Articles** — write as normal; they file to GPP automatically now.
- **Guides** — `/admin/guides/<slug>/edit` per guide: upload a Pensacola hero
  photo, adjust the copy, tick "Guide is active". Listings import through
  `/admin/content/guide-listings-import` as usual.
- **Events** — already market-aware.
- **Ads** — a new placement is stamped GPP automatically. Until GPP has sold
  anything its slots show the house "advertise with us" filler rather than
  Montgomery advertisers.

---

## Known gaps — not yet done

Honest list. None of these break River Region; they are places a second brand
would still see River Region's data or copy.

**Public pages still unscoped.** The high-traffic ones are done (homepage,
calendar, school zone, guides, articles, business spotlight). Not yet swept:
`/mom-knows-best`, `/best-of`, `/birthday-party-guide/*`, `/games`,
`/articles/issue/[month]`, the column landing pages, and the per-article
footers. Each is the same one-line fix — `.or(articleBrandFilter(brandSlug))`
or `scopeToMarket(q, scope)`.

**Brand copy is still River Region's in places.** School Zone's intro says
"across Montgomery, Autauga, Elmore, Pike Road". These should read from
`brandCtx.market.regionLabel` / `serviceArea`. `MARKETS` in `src/lib/markets.ts`
has empty `serviceArea` arrays for every brand but RRP — fill those in and the
footers start naming the right towns.

**Admin pages.** 29 of 465 admin files consult the active market. The ones that
matter for daily work are done; the long tail (reports, SEO tools, social
queue) still shows all-brands data to a publisher. Worth sweeping before you
hand a publisher the keys.

**ISR cache keys.** Pages that read brand context now render dynamically, which
is correct — a path-keyed cache shared across domains would serve one brand's
HTML to another. The cost is losing ISR on those routes. Restoring it properly
means moving the public site under a `[tenant]` segment with a proxy rewrite,
the way Vercel's own multi-tenant template does it. Worth doing before traffic
grows; not urgent at current volume.

**Slug drift.** `MARKETS` calls the fifty-plus brand `rr50plus`; the
`publications` table still has the old `rrb`. Harmless today because nothing
joins them, but it will bite whoever assumes they match.
