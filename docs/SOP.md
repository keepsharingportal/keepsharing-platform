# KeepSharing Platform — Standard Operating Procedure

This is the operating manual for the platform: what it does, who does what, when each action happens, and what the AI handles automatically.

It's the document you hand a new editor or VA on day one. Update it when a workflow changes.

---

## 1. What this platform is

One Next.js application that powers six brands (RRP, MBP, AOP, ESP, GPP, BOOM) as separate public sites, with one admin at `/admin`. The publisher manages all six from a single workspace.

- **Brand families** drive design + cross-publish defaults:
  - **Parents** family — RRP, MBP, AOP, ESP, GPP. Same template, brand-aware data. Articles can syndicate within this family by default.
  - **Fifty-plus** family — BOOM (and any future 50+ brands). Separate template. Does not cross-publish with the parents family by default.
- **Per-brand site chrome** (wordmark, tagline, colors, social handles, contact, homepage rotation columns) is editable at [`/admin/settings/brands`](admin/settings/brands).
- **Per-brand voice + AI context** is set on the same page. Every AI call references it so each brand sounds like itself.

The platform is opinionated: AI handles the boring work, humans hold judgment on what publishes and who's featured.

---

## 2. Team roles

The platform supports four admin roles defined in `admin_users.role`:

| Role | Sees | Mutates |
|---|---|---|
| **super** | Everything across every brand | Everything including integrations, users, secrets |
| **admin** | Everything across every brand | Same as super except integration credentials |
| **publisher** | Their assigned markets only | Editorial + ads + advertisers in their markets |
| **editor** | Article queue (no cross-brand admin surfaces) | Articles only (cannot manage advertisers, integrations, settings) |

Map your team to roles like this:

- **Publisher / Founder** (you, Jason) → `super`
- **Operations Lead / VA** → `admin` (full operational surface; no integration credential edits)
- **Brand Publisher** (per-market lead, e.g. "AOP Publisher") → `publisher` with `allowed_markets=['aop']`
- **Staff Editor** → `editor` — manages the article queue + edit page only
- **Sales Rep** — does NOT need admin access; works from advertiser-detail pages via the Operations Lead, or gets `admin` if they own the relationship
- **Contributors** (external moms, experts) — never have admin access; they use magic-link Q&A invites
- **Print Designer** — does NOT need admin access; pulls from `/admin/distribution-log/print-queue` via the Operations Lead, or `editor` if they need direct access

All admin users **must** enable 2FA (per migration 140). Recovery codes are generated once on enrollment — make sure each team member saves them in 1Password or equivalent. Lost device + lost codes = ask a super-admin to reset 2FA at `/admin/users`.

---

## 3. What AI does automatically

The AI integration is configured at [`/admin/integrations/ai`](admin/integrations/ai) (OpenAI + Anthropic keys, monthly budget cap, per-task model picks). Every AI call is logged with cost attribution at [`/admin/integrations/ai/usage`](admin/integrations/ai/usage).

| When it fires | What it does | Where to see it |
|---|---|---|
| Contributor submits magic-link Q&A | Drafts a full article (headline + alternates + deck + body + pull quote + tag suggestions) using the brand voice and template's drafting brief | `/admin/contributors` — review queue |
| Admin "Generate" at editorial calendar | Pulls last 30 days of GSC opportunity queries + brand voice + previously-dismissed ideas → returns 8-12 specific story commissions with rationale + evidence | `/admin/editorial-calendar` |
| Admin clicks AI draft on a directory suggestion | Drafts name + summary + description + category guesses from the submitter's notes | `/admin/directory/suggestions` |
| Admin clicks AI draft in Meta Suite composer | Writes brand-voiced social caption from a topic hint | `/admin/integrations/meta-suite` |
| Article publishes with auto-post enabled | Writes brand-voiced Facebook + Instagram caption with article URL + hero image | Mirrored to `/admin/distribution-log` and `facebook_page_posts` |
| Article publishes with newsletter draft enabled | Writes subject line + preheader + 150-250 word body + CTA in brand voice | `/admin/distribution-log` |
| Reader submission auto-review | Scores submission 1-5 on specificity / quotability / authenticity, extracts quotable line, suggests tags | `/admin/editorial/approval` |
| Daily games refill cron | Generates new content for the 6 Brain Games games (Scramble, Trivia, Emoji, Math, Memory, Family Connect) | Game content queue |
| Help chat (when in use) | Answers reader/team questions in-app | n/a |

**Hard rules baked into the AI integration:**
- Monthly budget cap is **fail-closed**. If the AI usage log can't be read, the call refuses rather than risking overspend. Bump the cap at `/admin/integrations/ai`.
- All AI text routes through the same wrapper (`src/lib/ai/client.ts`). Every spend is attributable.
- Brand voice is **always** included in the prompt for content-generating calls.
- The AI **never** publishes anything. It drafts; humans approve.

---

## 4. Daily / weekly / monthly / quarterly cadence

### Daily — Operations Lead (15–30 min, twice a day)

| Time | Action | Where |
|---|---|---|
| Morning | Check `/admin/today` for urgent action items, new submissions, last 24h pulse | [`/admin/today`](admin/today) |
| Morning | Review `/admin/articles/review` for articles in `pending` status | [`/admin/articles/review`](admin/articles/review) |
| Morning | Process new Contributor Q&A drafts — read AI draft, edit, publish or reject | [`/admin/contributors`](admin/contributors) |
| Throughout | Triage [`/admin/integrations/meta-suite`](admin/integrations/meta-suite) comments inbox |
| Throughout | Approve new School Bits submissions | [`/admin/school-news?status=pending`](admin/school-news?status=pending) |
| Throughout | Approve new directory suggestions (run AI draft, polish, publish) | [`/admin/directory/suggestions`](admin/directory/suggestions) |
| Afternoon | Real-time analytics check for any spike — react if something's going viral (boost on social, queue a follow-up) | [`/admin/analytics/realtime`](admin/analytics/realtime) |

### Daily — Editor (variable)

| Action | Where |
|---|---|
| Work the article queue: draft → review → approve | [`/admin/articles/review`](admin/articles/review) |
| Set per-article distribution flags on publish: brand, syndicated brands, auto-post to FB/IG, queue newsletter draft, queue for print | Article editor (`/admin/articles/[id]/edit`) — Homepage panel |
| For every article: pick the correct origin brand, syndicate to same-family siblings where the content travels | Article editor |
| Tag articles by topic (for SEO + reader interest profiles) | Article editor — Topics field |

### Daily — Sales (variable)

| Action | Where |
|---|---|
| Follow up on `claimed_email` notifications in the VA queue (someone bought a spot via the public claim flow) | [`/admin/today`](admin/today) → ad_placement_claimed notifications |
| For subscription renewals: monitor [`/admin/advertisers/[id]/report`](admin/advertisers/[id]/report) for any advertiser whose subscription_status flipped to `past_due` — call them |

### Daily — Automated (cron jobs)

| Job | Time (UTC) | What it does | Visible at |
|---|---|---|---|
| Facebook Marketing sync | 08:00 | Pulls campaign spend / impressions / clicks for the last 7 days | `/admin/integrations/facebook` |
| Search Console sync | 08:30 | Pulls last 3 days of search queries + per-page metrics, sweeps rows older than 90 days | `/admin/integrations/search-console` |
| Google Business Profile sync | 09:00 | Pulls last 7 days of GBP performance metrics for all connected locations (publisher's + every advertiser's Phase 2 connection) | `/admin/integrations/google-business` |
| Games content refill | 09:00 | If days-of-supply for any game cell drops below target, AI generates new content (budget-aware) | Game content queue |
| School Bits reminders | 14:00 (1st of month) | Emails school contacts the monthly Bits reminder | Reminder log |
| Circulation emails | 13:00 | Distribution drivers get their daily route emails | Distribution portal |
| Ad renewal reminders | 14:00 | Emails advertisers + reps as contracts approach end dates | `/admin/ads/renewals` |
| GHL expired tags | (interval) | Removes time-bound tags from GHL contacts (e.g. event attendees) | GHL |

### Weekly — Operations Lead (1 hour, Monday morning)

| Action | Where | Time |
|---|---|---|
| Review the **editorial calendar suggestions** for each brand. Generate fresh suggestions, accept the strong ones (creates article drafts), commission contributors for ones requiring outside expertise, dismiss with reason for ones that don't fit. | [`/admin/editorial-calendar`](admin/editorial-calendar) | 15 min × 6 brands |
| Review **last week's distribution log**. Any failed newsletter drafts? Any auto-post errors? | [`/admin/distribution-log`](admin/distribution-log) | 10 min |
| Review **last week's AI spend** vs monthly cap. Bump cap if needed. | [`/admin/integrations/ai/usage`](admin/integrations/ai/usage) | 5 min |
| Review **acquisition** + **top organic queries** for each brand. Pass insights to editor. | [`/admin/analytics/acquisition`](admin/analytics/acquisition) | 5 min |
| **Send pending advertiser reports** for any monthly cycle hitting this week | Advertiser detail page → "Send via GHL" | 10 min per |

### Weekly — Sales (variable)

| Action | Where |
|---|---|
| Generate renewal links for placements approaching contract end | Placement editor → "Subscription & renewal" panel |
| Email renewal links to advertisers | (your inbox) |
| Identify Featured directory opportunities — businesses with high view counts on basic listings | [`/admin/directory`](admin/directory) sorted by views |

### Monthly — Publisher / Operations Lead (2 hours)

| Action | Where | Purpose |
|---|---|---|
| Audit each connected GBP — confirm sync is healthy + post a Featured Article update on each | `/admin/advertisers/[id]/gbp` per advertiser; `/admin/integrations/google-business` for publisher | Local search rank |
| **Run editorial calendar for the next month** — accept 8-12 ideas per brand, distribute by week | [`/admin/editorial-calendar`](admin/editorial-calendar) | Content plan |
| **Lock the print queue** — review `/admin/distribution-log/print-queue` for the issue, assign any unassigned articles, hand the print-friendly URLs to the designer | [`/admin/distribution-log/print-queue`](admin/distribution-log/print-queue) | Print issue closes |
| **Per-brand newsletter prep** — review drafts in distribution log, copy into GHL, schedule the send | [`/admin/distribution-log`](admin/distribution-log) → CopyDraftButton → GHL | Newsletter |
| Audit advertiser reports for the month → send via GHL | Per advertiser → "Send Report" | Renewal conversation |
| Audit ad placements expiring within 30 days → confirm renewal link / outreach in flight | [`/admin/ads/renewals`](admin/ads/renewals) | Revenue continuity |
| Review **Top Movers** in analytics — which content category gained, which dropped | [`/admin/analytics`](admin/analytics) | Editorial direction |

### Monthly — Editor (collaborative with publisher)

| Action |
|---|
| Pitch 3–5 themes per brand for the next month based on calendar suggestions + GSC trends |
| Commission contributors for monthly columns (Mom Knows Best, expert pieces, etc.) via [`/admin/contributors`](admin/contributors) → Send Invite |
| Set print issue month + queue articles for print as they publish |

### Quarterly — Publisher (3–4 hours)

| Action | Where | Notes |
|---|---|---|
| **Audit brand voice** for each brand — has it drifted? Update tagline / voice rules / avoid list | [`/admin/settings/brands`](admin/settings/brands) | The AI uses what's here for every draft |
| **Audit AI integration usage** — rotate API keys quarterly, review per-task model picks (have OpenAI/Anthropic released better models? Update defaults) | [`/admin/integrations/ai`](admin/integrations/ai) | Cost + quality |
| **Audit integration log heart-beats** — Facebook last sync, GSC last sync, GBP last sync, Stripe last webhook | [`/admin/integrations`](admin/integrations) | Catch silently-broken integrations |
| **Audit advertiser report tokens** — any past 90 days that should expire? Regenerate stale ones | Per advertiser → Report Token panel | Security hygiene |
| **Audit admin users + 2FA enrollment** — anyone enabled without 2FA? Anyone left the team without being deactivated? | [`/admin/users`](admin/users) | Security hygiene |
| **Rotate Stripe webhook signing secret** in Stripe Dashboard + update at `/admin/integrations/stripe` | Stripe + admin | Security hygiene |
| **Review the audit log** — `admin_audit_log` table — for any unusual activity | SQL via Supabase | Security hygiene |
| **Audit ad placement subscription health** — any past_due that hasn't recovered? | [`/admin/ads`](admin/ads) filtered by subscription_status | Revenue |

---

## 5. End-to-end workflows

### 5a. Article: idea → publish → distribute

```
┌─────────────────────────────────────────────────────────────────────┐
│  IDEA SOURCES                                                       │
│  - Editorial calendar (AI-suggested from GSC opportunity queries)   │
│  - Contributor Q&A response (mom-knows-best, expert columns)        │
│  - Editor commission (assigned to staff or freelancer)              │
│  - Community submission (Mom Insiders, School Bits)                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DRAFT CREATED                                                      │
│  - From calendar acceptance → empty article scaffold                │
│  - From contributor submission → AI-drafted full article            │
│  - From community submission → AI-reviewed + tag-suggested          │
│  - From editor → blank slate                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EDITOR POLISH (manual judgment)                                    │
│  Article editor (/admin/articles/[id]/edit):                        │
│  - Title, subtitle, body, pull quotes, hero image, author byline    │
│  - Brand (origin) + syndicated_to (same-family siblings by default) │
│  - Section / column                                                 │
│  - Distribution toggles:                                            │
│    □ Auto-post to FB + IG on publish                                │
│    □ Queue GHL newsletter draft on publish                          │
│    □ Queue for print on publish (with issue month)                  │
│  - Status: draft → pending → approved/published                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  (Publish button)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PUBLISH HOOK FIRES (background)                                    │
│  - Auto-post: AI writes caption → posts to FB Page + IG             │
│  - Newsletter draft: AI writes subject + body → logs to /admin/     │
│    distribution-log for editor review                               │
│  - Print queue: logs entry in /admin/distribution-log/print-queue   │
│  - Stamps fields so re-saving doesn't double-fire                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LIVE ACROSS CHANNELS                                               │
│  - /articles/[slug] on the origin brand's domain                    │
│  - Same URL on each syndicated brand's domain with rel=canonical    │
│  - FB Page + IG post live                                           │
│  - Newsletter draft sitting in /admin/distribution-log for Monday   │
│  - Print queue entry for the assigned issue                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TRACKING (automatic)                                               │
│  - page_views populates for the article                             │
│  - article_views populates separately (article-specific session)    │
│  - GSC starts surfacing queries within ~2 weeks                     │
│  - Reader engagement counter bumps for everyone who reads it        │
└─────────────────────────────────────────────────────────────────────┘
```

**Roles:**
- Calendar suggestions → AI
- Contributor draft → AI
- Editor polish → human Editor
- Publish decision → human Editor or Publisher
- Auto-post + newsletter draft + print queue → AI (triggered by publish hook)
- GHL newsletter send → human (copy from `/admin/distribution-log` → GHL → schedule)

### 5b. Contributor Q&A pipeline

```
Editor invites contributor at /admin/contributors → magic link URL
  ↓
Editor sends URL to contributor (email, text)
  ↓
Contributor visits /contribute/<token>, answers Q&A in their voice
  ↓
On submit: status='drafting', AI draft fires in background
  ↓ (after 30s–90s)
status='drafted'; draft visible to editor at /admin/contributors
  ↓
Editor reviews AI draft, edits inline, picks alternate headline
  ↓
Editor clicks "Publish to article queue" → creates pending guide_article row
  ↓
Editor opens the article in the editor, sets distribution flags, publishes
```

**Notes:**
- If status stays at `drafting` for >5 minutes, the Lambda likely died mid-generation. The admin queue surfaces a "Retry AI drafting" button.
- Contributor's email gets stamped on their contributor row; over time you build a roster you can re-invite.
- Templates (`mom-knows-best`, `expert-column`, ...) seed the question set. Add new templates via SQL when you want a new commission type.

### 5c. Advertiser onboarding → renewal

```
NEW ADVERTISER
  ↓
Path A: Sales-led       Path B: Self-serve "Claim this spot"
  ↓                          ↓
Sales creates              Public visits /claim/<placementId>
advertiser_account            ↓
in /admin/advertisers      Stripe Checkout (one-time or subscription)
  ↓                          ↓
Creates placement(s)        Webhook activates placement +
  ↓                        VA notification
Optionally connects
their GBP at /admin/
advertiser/[id]/gbp
  ↓
RUNNING
  ↓
Monthly: advertiser
report sent via GHL
  ↓
GBP: weekly post by
operations team
  ↓
RENEWAL APPROACH
  ↓
For subscription:        For one-time:
auto-charged monthly      sales generates renewal
via Stripe                token, emails advertiser
  ↓                         ↓
Webhook extends           Advertiser visits /renew/<token>
end date                  → Stripe Checkout (subscription)
  ↓                         ↓
                          Now in subscription path
```

**Roles:**
- Onboarding → Sales + Operations
- Monthly report → Operations (review + send via GHL)
- GBP weekly post → Operations
- Renewal outreach → Sales
- Subscription monitoring → Operations (watch for past_due in placement editor)

### 5d. Directory: suggestion → free listing → featured

```
Reader visits /directory/suggest, fills out form
  ↓
Lands in /admin/directory/suggestions as 'pending'
  ↓
Editor clicks "AI draft" → AI proposes name + summary + description + categories
  ↓
Editor edits inline, clicks "Accept → publish listing"
  ↓
New row in directory_listings, status='published', is_featured=FALSE
  ↓
Free listing live at /directory/<slug>
  ↓
SALES UPSELL PATH
  ↓
If reader engagement is strong (view_count rising), sales reaches out to the business
  ↓
Sales creates advertiser_account if not already there
  ↓
Sales links advertiser_account_id on the directory_listings row
  ↓
Sales toggles is_featured=TRUE
  ↓
Featured treatment: top of directory + category, AI-enhanced description,
gallery, lead routing
```

**Notes:**
- The directory is intentionally INDEPENDENT of paying advertisers. A free listing is a real product, not a teaser.
- Featured is a real upgrade: it gets the SEO boost (top-of-page), the visual treatment, and bypass-routing of inbound leads.
- Each brand has its own directory (brand-scoped). The Auburn-Opelika directory shows Auburn businesses, etc.

### 5e. Newsletter cycle (weekly)

```
ALL WEEK: articles publish with "Queue newsletter draft" toggled on
  ↓
DRAFTS ACCUMULATE in /admin/distribution-log
  ↓
MONDAY (Operations Lead, 30 min)
  ↓
Review every draft in the log from the past 7 days
  ↓
Pick 4-6 best for the brand's newsletter
  ↓
For each: click "Copy draft" → paste subject + body + CTA into the GHL email composer
  ↓
Send via GHL workflow scoped to the brand's subscriber tag
  ↓
GHL handles delivery
```

**Brand routing:** at `/admin/settings/brands` each brand has its own GHL list ID, subscriber tag, and welcome workflow ID. Setting these makes the newsletter signup at `/` brand-aware — an Auburn-Opelika reader joins the AOP list with the AOP tag, not RRP's.

### 5f. Print issue cycle (monthly)

```
THROUGHOUT MONTH: editor flips "Queue for print on publish" with the target
print_issue_month on articles that should appear
  ↓
END OF MONTH (Publisher / Operations Lead)
  ↓
Open /admin/distribution-log/print-queue
  ↓
Verify each article is assigned to the right issue
  ↓
For each article: open /articles/[slug]/print in a new tab
  → Print-friendly view: title, subtitle, byline, body, pull quotes, word count, URL
  ↓
Send the URLs to the designer (or they pull from the print-queue page directly)
  ↓
Designer copies the text into InDesign / their layout tool
  ↓
After print run: nothing to do in the platform; the queued status stays for the record
```

---

## 6. AI cost management

The AI integration enforces a monthly budget cap per provider. To stay healthy:

1. Set the cap at [`/admin/integrations/ai`](admin/integrations/ai) at a number you're comfortable spending. Default $100/month per provider is a reasonable starting point for a six-brand publication.
2. Check [`/admin/integrations/ai/usage`](admin/integrations/ai/usage) weekly. The page shows MTD spend per provider, projected month-end based on a 7-day rolling average, top callers, spend by task, recent errors.
3. **Watch the "Projected month-end" number.** If it crosses your cap, the calls will start failing closed mid-month. Either bump the cap or audit top callers.
4. **Top spenders to watch** (in typical operation):
   - `games.generate.family-connect` — Family Connect uses adaptive thinking + larger payloads. Caps at 5 per batch.
   - `contributor.qa.draft` — full-article drafts; ~$0.01–$0.03 each
   - `newsletter.draft` — short structured output; pennies each
   - `editorial-calendar.suggest` — runs through "coaching" task → higher-tier model; ~$0.05–$0.10 per generation
   - `directory.suggestion.draft` — pennies each
5. **Per-task model picks** can dial cost vs quality:
   - Use **Sonnet 4.6** for drafting + QA + caption (default)
   - Use **Haiku 4.5** for classification + games (high-volume, lower stakes)
   - Use **Opus 4.8** for coaching (advertiser reports, editorial strategy) — costs more but better insights
   - Reset these whenever providers release better models

---

## 7. Channel-specific operations

### 7a. Facebook + Instagram

- **Phase 1 (publisher's own Pages):** `/admin/integrations/meta-suite` shows connected Pages, post composer with AI caption assist, comments inbox.
- **Auto-post on article publish:** toggled per-article in the editor. Brand voice flows through to the caption.
- **Comments inbox:** sync manually via "Sync comments" button. Reply or dismiss directly from admin.
- **Cross-posts to Instagram:** require a hero image AND a linked IG business account. Set the IG link in Meta's Business Suite outside the platform; it auto-discovers via `pages_show_list` scope.

### 7b. Google Business Profile

- **Phase 1 (publisher's own GBP):** `/admin/integrations/google-business`. Post local updates from the post composer. Nightly metrics sync.
- **Phase 2 (per-advertiser GBP):** `/admin/advertisers/[id]/gbp`. The advertiser shares a refresh token with you; you manage their posts. Real upsell.
- **Posting cadence:** **weekly** is the sweet spot for GBP signal — not too thin, not spam. Pair with the advertiser's biggest content beat that week.

### 7c. GHL newsletter

- Each brand routes signups + tag-targets via the GHL fields in `brand_voice`.
- The platform produces drafts; **GHL is the source of truth for delivery**. Schedule the actual send in GHL.
- Welcome workflows fire on signup if you set the workflow ID in brand chrome.

### 7d. Print

- Issue-grouped queue at `/admin/distribution-log/print-queue`.
- Print-friendly view at `/articles/[slug]/print` for each article.
- No PDF auto-generation — designers pull text into their layout tool. This is intentional; designers want InDesign-ready content, not a finished PDF that doesn't fit the layout.

---

## 8. Tracking, intelligence, monitoring

### Analytics surfaces

| Surface | What it answers |
|---|---|
| [`/admin/analytics`](admin/analytics) — Overview | "How's this month vs last? Where are the gains and losses?" |
| `/admin/analytics/audience` | "Who are these readers (channels, devices, locales)?" |
| `/admin/analytics/acquisition` | "Where did this traffic come from? What's converting?" |
| `/admin/analytics/content` | "Which articles are pulling their weight?" |
| `/admin/analytics/landings` | "Which non-article pages are doing the work?" |
| `/admin/analytics/conversion` | "What's our session → action funnel?" |
| `/admin/analytics/realtime` | "What's happening right now vs the same time last week?" |

### Per-article search intelligence

`/admin/articles/[id]/insights` — for any published article, shows:
- 30-day clicks, impressions, CTR, avg position
- Daily clicks sparkline
- Top 30 queries readers used to find this article

**Editorial use:** high impressions + low clicks = headline/snippet rewrite. Brand-new queries you didn't expect = topics worth commissioning around.

### Distribution log

`/admin/distribution-log` shows every fan-out: newsletter drafts (with ready-to-copy text), social posts, print queue entries. Group by channel + brand. Errors surface inline.

### Advertiser reports

`/r/<token>` — public per-advertiser report. Period-over-period numbers, goal progress, per-listing breakdown, year-over-year, AI-narrated coaching insights. Send via GHL workflow from the advertiser detail page.

Token expires after 90 days (rotates on regeneration). Keep tokens fresh by sending monthly.

### Daily ops dashboard

`/admin/today` is the home base. It surfaces:
- Urgent action items (renewal calls, advertiser follow-ups)
- This month's market pulse (placement count, revenue, page count) — scoped to your assigned markets
- Incoming notifications (new spotlight submissions, nominations, birthday orders, ad placement claims)
- Ecosystem health bar

---

## 9. Health checks (what to monitor without being asked)

### Daily health glance (1 minute)

- [`/admin/today`](admin/today) urgent count > 0? Address.
- [`/admin/analytics/realtime`](admin/analytics/realtime) showing reasonable traffic for the time of day?
- Any newsletter drafts at `/admin/distribution-log` with status=failed in the last 24h?

### Weekly health glance (5 minutes)

- [`/admin/integrations`](admin/integrations) — every "Connected" tile actually showing recent sync timestamps? Look for stale sync_log entries.
- [`/admin/integrations/ai/usage`](admin/integrations/ai/usage) — projected month-end below cap?
- [`/admin/integrations/facebook`](admin/integrations/facebook) — last sync within 36 hours?
- [`/admin/integrations/search-console`](admin/integrations/search-console) — last sync within 36 hours?
- [`/admin/integrations/google-business`](admin/integrations/google-business) — last sync within 36 hours? Any Phase 2 advertiser GBPs erroring?

### Monthly health audit

- Audit admin users vs current team. Deactivate anyone gone.
- Audit GHL list/tag wiring per brand (signup goes to the right list?).
- Audit Stripe webhook health — last webhook timestamp.
- Audit advertiser report tokens — any past 90 days that should rotate?
- Audit the audit log for any unusual `ad_placement.deleted_forever` or `advertiser_report.token_regenerated` events.

---

## 10. Common troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Newsletter drafts not generating | AI budget cap hit OR ANTHROPIC/OPENAI key not set | Check `/admin/integrations/ai/usage` |
| FB auto-post failing | Meta token expired OR Page access revoked | Re-authorize at `/admin/integrations/meta-suite` |
| Reader can't subscribe to newsletter | GHL list ID misconfigured on brand_voice OR GHL sub-account PIT expired | Check `/admin/settings/brands` + env `GHL_PIT_<BRAND>` |
| Article visible on wrong brand | Set the wrong origin OR over-syndicated | Edit article, fix `brand_slug` + `syndicated_to_brands` |
| Stripe subscription not extending placement end date | Webhook not receiving events OR webhook signing secret stale | Check `/admin/integrations/stripe` last_webhook_at, verify signing secret in Stripe Dashboard |
| GBP post returns "Token expired" | Refresh token revoked at Google account level | Get a fresh refresh token from the advertiser/publisher and re-paste |
| Editor stuck at AAL1 (gate keeps bouncing them) | They have 2FA enrolled but their current session never cleared a TOTP challenge | Send them through `/admin/auth/mfa-challenge` (link is on the gate page) |
| Contributor draft stuck at "drafting" >5 min | Background AI generation died mid-flight | Click "Retry AI drafting" on the response card in `/admin/contributors` |
| Advertiser report shows "this link has expired" | Token past 90-day default expiry | Regenerate token at the advertiser detail page; email new link |

---

## 11. Onboarding checklist for a new team member

In order, on day one:

1. ☐ Create their account in Supabase Auth (super-admin task at `/admin/users`)
2. ☐ Set their `admin_users` role + `allowed_markets`
3. ☐ Have them sign in at `/admin/login`
4. ☐ Walk them through 2FA enrollment at `/admin/settings/security` — make sure they save the recovery codes
5. ☐ Tour: `/admin/today` (daily dashboard) → `/admin/articles` (queue) → `/admin/distribution-log` (fan-outs) → `/admin/contributors` (Q&A pipeline) → `/admin/editorial-calendar` (AI suggestions) → `/admin/directory` (listings) → `/admin/integrations` (status board)
6. ☐ Walk through this SOP
7. ☐ Give them a starter task in their role's section

---

## 12. Architecture inventory (for reference)

The platform's substantial pieces, in case you need to explain it or audit it:

| Area | Lives at | Migrations |
|---|---|---|
| Multi-brand site routing | `src/proxy.ts`, `src/lib/brand-context.ts`, `src/lib/brands.ts`, `src/lib/markets.ts` | 154, 161, 162 |
| AI integration | `src/lib/ai/`, `/admin/integrations/ai` | 148 |
| Google Search Console | `src/lib/integrations/search-console/`, `/admin/integrations/search-console` | 149, 160 |
| Google Business Profile | `src/lib/integrations/google-business/`, `/admin/integrations/google-business`, `/admin/advertisers/[id]/gbp` | 150, 166 |
| Stripe | `src/lib/integrations/stripe/`, `/admin/integrations/stripe`, `/claim/[id]`, `/renew/[token]` | 151, 156, 168 |
| Meta Business Suite | `src/lib/integrations/meta-suite/`, `/admin/integrations/meta-suite` | 152 |
| Contributor Q&A | `src/lib/contributors/`, `/admin/contributors`, `/contribute/[token]` | 153 |
| Editorial calendar | `src/lib/editorial-calendar/`, `/admin/editorial-calendar` | 155 |
| Reader loyalty | `src/lib/reader/`, `src/components/reader/`, `/favorites` | 164 |
| Multi-format distribution | `src/lib/distribution/`, `/admin/distribution-log`, `/articles/[slug]/print` | 165, 167 |
| Brand voice + chrome | `/admin/settings/brands` | 154, 162 |
| Article attribution + syndication | Article editor + `/articles/[slug]` rel=canonical | 161 |
| Local directory | `/directory`, `/admin/directory` | 163 |
| Auto-post on publish | `src/lib/integrations/meta-suite/auto-post.ts` | 157 |
| Site analytics | `/admin/analytics` (7 surfaces) | 118, 146 |
| Advertiser report | `/r/<token>`, `src/lib/advertiser-report/` | 144, 147, 158 |
| 2FA + recovery codes | `src/lib/admin/`, `/admin/auth/mfa-challenge`, `/admin/auth/recovery` | 140, 159 |
| Audit log | `src/lib/admin/audit.ts` | (earlier) |

---

*Last revised: when the 50+ template lands. Update Section 1's brand families paragraph + add Section 5g for the 50+ template workflow.*
