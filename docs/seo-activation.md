# SEO stack activation guide

The SEO command center at `/admin/seo` has a built-in activation wizard that
tells you exactly which step you're on. This doc is the runbook for executing
each step. **Run them in order — later steps depend on earlier ones.**

The wizard at `/admin/seo` will refresh as each step lands and disappear
entirely once all five are green.

---

## 1. Migration 187 — SEO data layer

**File:** `supabase/migrations/187_seo_data_layer.sql`

Adds:
- SEO override columns on `guide_articles` (seo_title, seo_description,
  seo_focus_keyword, seo_secondary_keywords, seo_canonical_override,
  seo_no_index, seo_score, seo_score_breakdown, seo_last_audited_at,
  seo_audited_by)
- `redirects` table (301/302/307/308 management)
- `not_found_log` table (404 monitor)
- `internal_link_suggestions` table (editor review queue)
- `search_console_data` table (GSC cache)
- `seo_audit_runs` table (Claude audit history)

**How to run:**

Open Supabase → SQL Editor → paste the contents of `187_seo_data_layer.sql`
→ Run.

The migration is idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` on
every statement) so re-running is safe.

---

## 2. Migration 188 — Brand SEO profiles

**File:** `supabase/migrations/188_brand_seo_profiles.sql`

Adds `brand_seo_profiles` — the strategic brief Claude reads for the weekly
audit, AI SEO assist, and internal-link engine.

Columns: pillars, sub_areas, personas, editorial_calendar, linkable_assets,
negative_space, unique_angles, voice_notes, plus audit timestamps.

**How to run:** same pattern as 187. Then visit
`/admin/seo/brand-profile?brand=<your-brand>` and click
**Generate first draft (Claude)** for each brand to seed.

---

## 3. Migration 189 — Author profiles

**File:** `supabase/migrations/189_seo_authors.sql`

Adds `seo_authors` — editor-controlled bio, headshot, credentials, social
URLs per author slug. The public `/authors/[slug]` page reads it first;
Person JSON-LD becomes E-E-A-T-rich.

**How to run:** same pattern. Then visit `/admin/seo/authors` to fill in
each author who already has articles published.

---

## 4. Search Console env vars

**Why:** the GSC sync is a no-op without both variables. Until they're set,
every GSC-driven feature (query briefs, CTR optimizer, daily movers,
per-brand dashboards, weekly audit's "almost ranking" section) shows the
activation card instead of data.

**Service account setup:**

1. Open Google Cloud Console → create a new project (or reuse one) →
   enable the **Search Console API**.
2. IAM & Admin → Service Accounts → Create service account → give it a
   descriptive name like `keepsharing-gsc-reader`.
3. On the new service account → Keys → Add Key → Create new key →
   JSON. Download the file.
4. **In each GSC property** (one per brand) → Settings → Users and
   permissions → Add the service account email as a **Restricted** user.
   *Restricted is sufficient — we only need to read.*

**Vercel env vars:**

Set both as **Production + Preview** scopes:

| Var | Value |
| --- | --- |
| `GSC_SERVICE_ACCOUNT_JSON` | The entire JSON from step 3 as a single line. **Important:** newlines inside `private_key` should remain as the literal `\n` escape — Vercel preserves them. The lib normalizes them at runtime. |
| `GSC_SITE_URLS` | Comma-separated GSC property URLs. URL properties: `https://riverregionparents.com`. Domain properties: `sc-domain:mobilebayparents.com`. |

After saving, redeploy (or push any commit) so the env vars are baked in.

The wizard step turns green automatically on the next request.

---

## 5. First GSC sync

After the env vars are live:

1. Go to `/admin/seo`.
2. Scroll to **Search Console sync** widget.
3. Set lookback to **28** days (this gives the dashboards and movers a
   meaningful baseline immediately).
4. Click **Run sync now**.

Expected outcome: `XX,XXX rows imported across N sites over the last 28
days.` If you see errors, the widget surfaces them per-site so you can
trace it back to a specific property.

The cron at `/api/cron/seo-gsc-sync` (Vercel: daily 05:00 UTC) takes over
once the env vars are set — you only run the manual sync to bootstrap.

---

## Verifying it all worked

After step 5, every wizard step shows green and the wizard collapses.
Verify these pages render real data:

| Page | What you should see |
| --- | --- |
| `/admin/seo` | Brand health scores ≥0/100, daily movers digest with names, no activation wizard. |
| `/admin/seo/brand/<brand>` | Totals strip with WoW deltas, sparkline chart, movers/losers/opportunities. |
| `/admin/seo/query-briefs` | Improve + Write briefs with real queries. |
| `/admin/seo/ctr-optimizer` | Under-performers ranked by leverage. |
| `/admin/articles/<id>/seo` | "What's working" panel above the editor with top queries. |
| `/admin/seo/audit-reports` | Latest weekly run per brand (only after the Sunday 02:00 UTC cron — or click Run Now). |

If any of those still show the empty state, check the wizard at `/admin/seo`
— it will tell you which step is actually blocking.

---

## Role-based access summary

| Role | Sees in the sidebar | Can drill into |
| --- | --- | --- |
| super, admin | All SEO entries | Every brand |
| publisher, editor | Brand Profile, Alt-text, Query Briefs, CTR Optimizer, Audit Reports | Only their `allowedMarkets` brands |

Publisher/editor never see: Author Profiles, Redirects, 404 Monitor,
Internal Link Queue, Bulk SEO Edit, Route Coverage Audit (these are
cross-brand or infrastructure controls, gated `settingsOnly` in the
sidebar **and** via `requireSettingsAccess()` on each page so direct URL
navigation 403s).
