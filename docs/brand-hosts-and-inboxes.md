# Brand hosts and inboxes

One Next.js deployment serves six brand domains. That single fact invalidates
the two patterns this codebase used everywhere:

```ts
process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
process.env.SUBMISSIONS_EDITOR_EMAIL ?? 'jason@riverregionparents.com'
```

An env var holds **one** value for all six brands, so there is no value you can
set that is right. The literal is River Region's. Together they sent Greater
Pensacola advertisers to River Region's checkout, Greater Pensacola school
submissions to River Region's editor, and Greater Pensacola QR codes — printed
in the magazine, uncorrectable — to River Region's site.

## What to use instead

| You need | Use | Notes |
|---|---|---|
| A Stripe `success_url` / `cancel_url` | `checkoutOrigin(req)` | `lib/checkout-origin.ts`. Also **validates** the host — see below |
| A link in an email to a reader/advertiser/partner | `publicOriginForBrand(slug)` | `lib/markets.ts`. Get the slug from the **row** (advertiser, placement, submission), not the env |
| A `From:` address | `brandSender(slug, envFallback)` | `lib/email/brand-sender.ts`. Display name is per-brand; the address stays on the Resend-verified domain until a brand's own is verified |
| The inbox a submission lands in | `inboxForBrand(slug, role, envFallback)` | `lib/email/brand-recipient.ts`. `role` is `'editorial'` or `'sales'` |
| A GHL sub-account token | `resolvePit(slug)` | `lib/ghl.ts`. Never `process.env.GHL_PIT_RRP` directly |
| A brand's display name | `marketDisplayName(slug)` | `lib/markets.ts` |

## The Origin header is not a host you can trust

Six checkout routes did this:

```ts
const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '…'
```

`Origin` is client-supplied. Sending `Origin: https://evil.example.com` put
that URL into Stripe's `success_url`, so a **real, completed payment** redirected
the payer wherever the attacker chose. `checkoutOrigin()` requires the host to
resolve to a known brand on its own before using it, and falls back to the
brand resolved from `Host`.

It also prefers the request's **own** host over the brand's canonical
`publicHost`: Greater Pensacola is served from `gpp.keepsharing.com` while
`greaterpensacolaparents.com` is not pointed yet, so redirecting to `publicHost`
would strand the advertiser on a dead domain right after they paid.

## Public surfaces omit; internal notifications fall back

These two rules look inconsistent and are not.

**Public** — a brand with no contact email configured renders **nothing**. No
footer contact block, no `mailto`, no field in the JSON-LD. An unmonitored
mailbox loses a reader's photo silently, and River Region's address under
Greater Pensacola's masthead is worse than no address. This holds even in the
no-brand-resolved fallback in `PublicFooter.tsx`.

**Internal** — a notification with nowhere to go loses a lead with no trace, so
`inboxForBrand` falls through to the platform inbox. The owner reads every
brand's mail today. What must not happen is a *silent* fallback, so every
subject line carries `subjectTag(slug)` → `"[GPP] New school bit nomination"`.

Precedence: the brand's role inbox → the brand's general inbox → the route's
existing env var → `PLATFORM_EDITOR_EMAIL` → the literal.

## Deliberately single-brand

Not everything is multi-brand, and pretending otherwise is its own bug.

- **The weekly prize draw** (`lib/games/draw.ts`) is River Region only: one set
  of sponsors, one set of prize rules. `MARKET = 'rrp'` is the decision, and the
  reader-facing strings derive from it so they cannot drift.
- **The advertising agreement's publisher block** names KeepSharing LLC — the
  legal counterparty for every brand. Only the *publications sold* vary, and
  those come from the line items.
- **The ICS UID namespace** in `app/go/[shortcode]/route.ts` must never change
  for any brand: a UID is an event's identity, and changing it duplicates every
  subscriber's calendar entries.

## The guardrails

Three tests, all structural, because the resolvers were already correct while
the call sites bypassed them:

| Test | Catches |
|---|---|
| `tests/no-hardcoded-brand-host.test.ts` | a brand domain written into any `src/**` file outside a documented `ALLOWED` entry — and a stale `ALLOWED` entry |
| `tests/checkout-routes-use-resolver.test.ts` | a checkout route reading the `Origin` header, hardcoding a host, or never calling `checkoutOrigin` |
| `tests/checkout-origin.test.ts` | the resolver's own behaviour, including the forged-Origin case |

Adding an `ALLOWED` entry is a decision; leaving one undocumented is the bug.

## Adding a brand

1. Add the row to `MARKETS` in `lib/markets.ts` (`publicHost` is the one that
   matters here).
2. Set its contact email and phone at `/admin/settings/brands` — until you do,
   public surfaces omit them and internal mail goes to the platform inbox,
   tagged with the brand.
3. Set `GHL_PIT_<SLUG>` and `GHL_LOCATION_ID_<SLUG>` if it uses GHL.
4. Optionally `EMAIL_FROM_<SLUG>="Name <hello@its-own-domain.com>"` once that
   domain is verified in Resend. Before verification this produces **no** email
   rather than a mislabelled one, which is why the address lags the name.
