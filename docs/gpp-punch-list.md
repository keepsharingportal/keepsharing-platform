# GPP launch punch list

Generated 2026-10-08 from an actual scan of the codebase and database, not from
memory. Counts are real.

**Who does what:** anything under "Admin" you or Connie do through the UI — no
code, no deploy. Anything under "Code" is mine.

---

## Done (verified)

- Migration 232 applied: 12 River Region ad placements + 5 house ads, 232
  advertisers, 923 listings, 50 guide configs (10 per brand), publications
  esp/gpp/mbp switched on.
- Guide activation path proven end to end: flipping GPP's Childcare Guide on
  took it from 404 → 200 with Pensacola chrome and zero River Region listings;
  River Region unaffected. Flipped back off.
- Host routing verified across 14 cases including `gpp.keepsharing.com`.
- Zero cross-brand content leakage on 11 public pages.

---

## 1. Yours — unblocks testing

### Add the preview subdomain
`gpp.keepsharing.com` in Vercel → Domains. The resolver already maps it; no
code change. (The NXDOMAIN you saw is just that it doesn't exist yet.)

Same pattern for `esp.keepsharing.com` / `mbp.keepsharing.com` when you want
them.

### Publisher access
```sql
UPDATE admin_users
   SET allowed_markets = ARRAY['esp','gpp','mbp'], role = 'publisher'
 WHERE email = '<their email>';
```

---

## 2. Yours — brand setup, all in the admin

**`/admin/settings/brands`** → Greater Pensacola. Every field below is editable
there; GPP currently has no row at all, so it inherits River Region's chrome.

| Field | Currently | Needs |
|---|---|---|
| Tagline | falls back to "Live Local, Love Local, Parent Local" | GPP's own, or keep |
| Logo | none → text wordmark | upload |
| Primary / accent colour | inherits RRP coral | `publications` already has #5a8a6a / #e89525 for GPP — set them here |
| Contact email | none | e.g. hello@greaterpensacolaparents.com |
| Facebook / Instagram | none | GPP's handles |
| Homepage rotation columns | defaults | which columns lead GPP's homepage |

**`/admin/guides/<slug>/edit`** → per guide, with GPP selected in the switcher:
hero photo, title, copy, then tick **Guide is active**. All ten are seeded and
switched off. Leave a guide off until it has listings — an empty guide is worse
than no guide.

**Content.** With the switcher on Greater Pensacola: articles and events now
file to GPP automatically. Guide listings import at
`/admin/content/guide-listings-import`.

**Magazine issues** are per-market already — GPP shows nothing until you add
one.

---

## 3. Mine — code, in priority order

### a. Finish the public sweep — **blocks pointing the real domain**
22 public pages still read content without a brand filter. Reader-facing ones
first:

- `/school-zone/school-bits` (11 queries — the biggest), `/school-bits`,
  `/school-zone/school-bits/[slug]`
- `/mom-knows-best` and `/mom-knows-best/[slug]`
- `/newcomer-guide` and `/newcomer-guide/articles/[slug]`
- `/best-of`, `/search`, `/articles/issue/[month]`
- `/birthday-party-guide/` category, sub-category, business, finder
- `components/verticals/RelatedFromVertical.tsx`

Lower priority (token- or login-scoped, brand barely applies): `/claim`,
`/renew`, `/advertise/edit/[token]`, `/blogger-portal/*`,
`/partners/[slug]/performance`, `/advertise/[verticalSlug]`.

### b. Brand copy still says River Region
Hardcoded in page text, not data. School Zone's intro reads "across Montgomery,
Autauga, Elmore, Pike Road". These should read from `brandCtx`.

**I need from you:** the towns each brand covers, most-recognisable first.
`serviceArea` is empty for gpp, esp, mbp and aop — that array drives the
footer's "Serving A, B, C" line and is a real local-SEO signal.

- Greater Pensacola: ?
- Eastern Shore: ?
- Mobile Bay: ?

### c. Admin market scoping — **before the publisher gets keys**
**49 admin pages** query content without consulting the active market. The
daily-work surfaces (articles, events, ads, guides) are done. The rest —
content operations, analytics, advertiser proposals, sponsor inventory,
distribution, engagement, bloggers — would show a GPP publisher River Region's
data.

### d. Seed brand_voice rows
Only `rrp` and `rr50plus` have one. I can create gpp/esp/mbp rows pre-filled
with the colours already in `publications`, so section 2 starts from something
rather than blank. Editorial fields stay yours.

### e. ISR cache keys
Pages that read brand context now render dynamically. Correct, but it costs
caching. The proper fix is a `[tenant]` route segment with a proxy rewrite.
Worth doing before traffic grows; not urgent.

---

## 4. Still open from earlier

The calendar draft PR (promo denylist + family ranking) has never been opened —
branch `calendar/family-ranking-and-promo-denylist` is pushed and waiting.

---

## Suggested order

1. You: add `gpp.keepsharing.com` → we can both see it
2. Me: (a) public sweep + (d) brand_voice seed
3. You: brand settings + turn on one guide, we test on the subdomain
4. Me: (c) admin scoping
5. You: publisher access, then point the real domain
