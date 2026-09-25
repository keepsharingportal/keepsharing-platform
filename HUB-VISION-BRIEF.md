# Keep Sharing Hub — Vision Brief (draft for JArvis)
Last updated: 2026-09-06
Owner: Jason Watson · Ops layer: JArvis · Feature build: Jason + Claude Code

## What we are building
A unified multi-market website hub so Keep Sharing can expand markets with AI agents instead of one-off WordPress sites.

Live now on the new stack: River Region Parents (riverregionparents.com).
Still on WordPress (migrate over time): Auburn-Opelika, Eastern Shore, Mobile Bay, Greater Pensacola Parents, River Region Boom / 50+.

## Stack
- Next.js app: keepsharing-platform (local: C:\Users\jim\projects\keepsharing-platform)
- GitHub: keepsharingportal/keepsharing-platform
- Hosting: Vercel team "Jason Watson's projects"
- Data: Supabase project keepsharing-platform
- Also planned/wired: Stripe, TipTap editor, HighLevel, SEO/social/circulation crons

## Audience / company goal
Be the #1 monthly local resource audiences depend on — parenting magazines (moms ~35–45) and Boom/50+.

## How work is split
- Jason + Claude Code: feature build in the repo / VS Code
- JArvis: ops + clarity — Supabase/Vercel health, punch lists, Claude briefs, scoped cloud agents, Ad Ops / Editorial / Prepress coordination
- JArvis does NOT need VS Code GUI access

---

# ⚠️ What is safe to share with an agent

**Never paste these into any agent, prompt, or chat — they grant full write access to production:**

- `.env.local` in whole, or any of: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `GHL_API_KEY`, any `GHL_PIT_*`,
  `GOOGLE_MAPS_API_KEY`
- Reader / customer PII: `game_scores` and `listing_messages` hold names, emails and
  phone numbers of real readers; `advertiser_accounts` holds advertiser contacts
- Supabase dashboard or Vercel session links

Env var **names** are safe to share (they're in this document). **Values are not.**

**Safe to share freely:** this brief, repo structure, table and column names, migration
files, the backlog, aggregate counts, and anything already public on the live site.

If JArvis needs live data, give it the **anon** key and let RLS apply — never the
service role. Note that most of our admin reads deliberately use the service role
*server-side* because RLS blocks the anon key; that is a server pattern, not something
to hand to an agent.

---

# Verified platform state (2026-09-06)

Everything below was checked against production today, not assumed.

## Market domains — only one is actually live

| Brand | Domain | Status |
|---|---|---|
| River Region Parents | riverregionparents.com | **live on the new stack** (apex 308s → `www`) |
| Auburn-Opelika | auburnopelikaparents.com | 200 — WordPress |
| Mobile Bay | mobilebayparents.com | 200 — WordPress |
| Eastern Shore | easternshoreparents.com | 200 — WordPress |
| Greater Pensacola | greaterpensacolaparents.com | 200 — WordPress |
| River Region 50+ | riverregion50plus.com | **does not resolve at all** (DNS/domain issue, not a redirect) |

RRP is the only brand where the apex redirects to `www`; the other four serve on the
apex. The app's canonical host list lives in `src/lib/markets.ts` and must match how
each domain is actually configured, or every canonical, `og:url` and share link points
at a redirect.

**Two brand lists exist and must be kept in step when adding a market:**
- `src/lib/markets.ts` — the website's list (`rrp`, `rr50plus`, `aop`, `mbp`, `esp`, `gpp`)
- `circulation_publications` table — print distribution's list (`rrp`, `boom`, `gpp`)

`boom` is the legacy slug for River Region 50+; `src/lib/circulation/regions.ts` keeps
it as an alias. Adding a market is **two** pieces of setup, not one.

## The two structural blockers before any second market converts

**1. The brand switcher is ignored by most of the admin — 23 of 242 admin pages honour
it, and 17 of those are `circulation/*`.** The switcher was built for Distribution and
never wired through the rest. Articles is now fixed. Guides, listings, ads, advertisers,
social, SEO and the rest still show RRP data whichever brand is selected. The risk when
a second brand goes live is not cosmetic: an editor in RR50+ would see and edit RRP
content believing it was theirs. Helpers already exist —
`articleBrandFilter(brandSlug)`, `marketsToQuery(ctx)`, `AdminContext.activeMarket`.

**2. Guide listings only render when linked to an `advertiser_accounts` row.**
`GuideDetailPage` and `ListingDetailPage` both do `if (!a) return null`. Migration 134
added inline identity columns to `guide_listings`, but neither template reads them.
Published listings that actually render today:

| Guide | Rendering / total |
|---|---|
| afterschool | **80/80** ✅ |
| birthday-party | **87/87** ✅ |
| special-needs | 2/139 |
| summer-camp | 4/122 |
| summer-fun | 5/125 |
| healthy-kids | 4/71 |
| private-school | 7/38 |
| childcare | 1/48 |
| newcomer | 5/10 |

Afterschool and birthday-party work because every row was given an account. The durable
fix is to teach the templates to fall back to the inline columns rather than minting
accounts guide by guide.

## Distribution is the one part already multi-market
In real use for months: 538 delivery stops, 3 publications, drivers/routes/deliveries,
monthly cycles. It was built market-aware from the start, which is why it's the only
section whose brand switcher works. Adding a market there is mostly data entry.

## Where the backlog lives
`admin_todos` table, surfaced at `/admin/today/master-backlog`. **Not a docs file.**
Currently 4 launch-blockers and 9 high-priority items open. The blockers are: the brand
switcher gap above, verifying `RESEND_API_KEY` in Vercel, confirming `GHL_PIT_RRP` +
`GHL_LOCATION_ID_RRP` in Vercel, and pausing the YMCA / Pediatric Dentistry seed ads.

## Conventions an agent should know before proposing changes
- **Next.js version here has breaking changes** vs common training data. `AGENTS.md`
  requires reading `node_modules/next/dist/docs/` before writing code.
- **Admin has two design dialects**: Tailwind + portal tokens (~380 files) and
  `.portal-app` CSS classes (~25 files: circulation, businesses, community,
  distribution, seo, social). Mixing them renders unstyled.
- **Distribution Portal is a verbatim port** of the publisher's legacy PHP screens —
  match them, don't redesign.
- **Migrations are numbered SQL** in `supabase/migrations/`, applied by hand in the
  Supabase SQL editor. DDL cannot be applied over the REST API. Currently at 229.
- **80% of RRP traffic is mobile.** Mobile parity is a requirement, not a follow-up.

## Near-term product priorities (edit freely)
1. Multi-market admin brand switcher actually honored across admin
2. Guide listings without requiring advertiser_account link
3. HighLevel / ad inquiry env + workflows for RRP
4. Roll other markets onto the hub
5. Keep print production (ads, listings, casting) moving via specialist agents

## Notes for Claude / agents
Paste Claude conversation takeaways below so JArvis can stay aligned:
