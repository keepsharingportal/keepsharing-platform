-- ── Master Backlog seed — Integrations roadmap (2026-06-11) ─────────────────
--
-- Five Tier-1 integrations that earn their monthly maintenance for a
-- regional family publication, with full design notes per item so the
-- architectural plan is already there when we wire each one.
--
-- Run once in the Supabase SQL editor. ON CONFLICT DO NOTHING.

INSERT INTO admin_todos (title, category, priority, notes) VALUES

('Integration: AI keys (OpenAI + Anthropic) at /admin/integrations/ai', 'ghl', 'high',
 'Centralized LLM key management replacing scattered hardcoded keys. Foundation for everything intelligent we build next.

SCHEMA:
  ai_integrations (id, provider TEXT CHECK in [openai, anthropic], api_key TEXT encrypted, default_model TEXT, monthly_budget_cents INT, is_active BOOL, last_used_at TIMESTAMPTZ, total_tokens_in BIGINT, total_tokens_out BIGINT, last_error TEXT)
  ai_usage_log (id, provider, model, prompt_tokens, completion_tokens, cost_cents, endpoint TEXT, occurred_at TIMESTAMPTZ, called_by UUID admin_users.id NULL)

WHAT IT REPLACES:
  - Hardcoded keys in src/lib/games/ai-generator.ts
  - Direct OpenAI calls scattered across admin tasks
  - Future: coaching insight generation in advertiser report

PAGES:
  /admin/integrations/ai — connect both providers, set default models per task (drafting / coaching / games / extraction), set monthly budget cap, view usage chart
  /admin/integrations/ai/usage — per-day usage trend, per-task breakdown, top callers, cost projection

API:
  src/lib/ai/client.ts — typed wrapper that picks the right provider per task type, logs every call, enforces budget. All AI calls in the codebase route through this.

PRIORITY: HIGH because it eliminates a security risk (keys in code), enables coaching insights to be smarter, and unlocks the games content pipeline to be way better.'),

('Integration: Google Business Profile at /admin/integrations/google-business', 'ghl', 'high',
 'TWO products in one integration: RRP''s own GBP management AND advertiser-side "post to my GBP from KeepSharing" upsell.

PHASE 1 — RRP''s own GBP:
  - OAuth flow connecting RRP''s Google account
  - Post updates ("New article: Summer Camp Guide is here!") from admin with title + image + CTA
  - View incoming reviews + reply from admin
  - See local-search insights (which queries surface RRP in maps)
  - One row in google_business_integrations (account_id, location_id, refresh_token, last_sync_at)

PHASE 2 — advertiser-side multi-tenant:
  - Per-advertiser GBP connection (each advertiser does their own OAuth, stored in advertiser_gbp_integrations)
  - Admin UI: "Send today''s promo to all connected advertisers" (with editorial review)
  - Advertiser-facing: subscribe to "weekly auto-post" feature (recurring revenue)

PRIORITY: HIGH because Phase 1 immediately improves RRP''s local discovery (which feeds Google search referrals which we just rebuilt analytics around). Phase 2 is a real advertiser upsell.

REFERENCE: developers.google.com/my-business — OAuth scopes business.manage.'),

('Integration: Google Search Console at /admin/integrations/search-console', 'ghl', 'high',
 'Editorial intelligence Plausible can''t give. Surface what queries land readers on which articles, indexing health, sitemap status.

SCHEMA:
  search_console_integrations (id, property_url TEXT, refresh_token TEXT encrypted, last_sync_at TIMESTAMPTZ)
  search_console_queries (id, query TEXT, page TEXT, clicks INT, impressions INT, position NUMERIC, day DATE) — pulled daily for top 1000 queries per day, retention 90 days
  search_console_pages_daily (id, page TEXT, day DATE, clicks INT, impressions INT, position NUMERIC)

NIGHTLY SYNC:
  Pull yesterday''s query + page metrics via Search Console API (search-analytics endpoint), upsert into the daily tables.

SURFACES:
  /admin/integrations/search-console — connect property, sync now button, last sync stamp
  /admin/analytics/acquisition — add a "Top organic queries" subsection beside the referrer host table
  /admin/articles/[id]/edit — show per-article search queries on the edit page ("Readers find this via: how to choose summer camp, summer camp pricing AL, ...") — directly informs editorial commissioning

PRIORITY: HIGH because the queries column tells you what to commission MORE of based on actual search demand. Editorial decisions stop being guesses.'),

('Integration: Stripe at /admin/integrations/stripe', 'phase-2', 'high',
 'Self-serve advertiser checkout for "Claim This Spot" placeholders, Featured listing upgrades, sponsor renewals, donation flows. Phase 2 was already on the backlog; this is the architectural plan.

SCHEMA:
  stripe_integrations (id, account_id TEXT, secret_key TEXT encrypted, webhook_signing_secret TEXT, is_test_mode BOOL, last_webhook_at TIMESTAMPTZ)
  stripe_products (id, stripe_product_id TEXT, kind TEXT [ad_placement, featured_upgrade, sponsor_tier], advertiser_account_id UUID NULL, price_cents INT, is_active BOOL)
  stripe_subscriptions (id, stripe_subscription_id TEXT, advertiser_id UUID, product_id UUID, status TEXT, current_period_start DATE, current_period_end DATE, cancel_at DATE NULL)
  stripe_charges_log (id, stripe_charge_id TEXT, advertiser_id, amount_cents, currency, status, occurred_at)

FLOWS TO REPLACE:
  - Current "claim this spot" — fires inquiry email; should fire Stripe checkout instead
  - Manual invoicing for monthly renewals
  - One-off booking like Featured upgrades

WEBHOOK ENDPOINT:
  /api/webhooks/stripe — handles subscription.updated, charge.succeeded, charge.failed, invoice.payment_failed events. Validates signature using webhook_signing_secret.

UI:
  /admin/integrations/stripe — connect, switch test/live, list products, see recent charges
  Advertiser detail page — show current subscription status + per-month charges
  Public site — "Claim This Spot" becomes a Stripe Checkout link

PRIORITY: HIGH but build LAST of the Tier 1 set because it touches revenue. Want every other integration battle-tested first.'),

('Integration: Meta Business Suite (Pages + Comments) at /admin/integrations/meta-suite', 'ghl', 'medium',
 'Beyond just Marketing API ads — actual Page management. Reuses the existing system-user token (just needs more scopes added in the existing Meta app).

SCOPES TO ADD to facebook_integrations:
  pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, pages_messaging

WHAT IT UNLOCKS:
  - Post to Facebook Page + Instagram from admin (with auto-caption assist from the AI integration once that lands)
  - View incoming comments + replies in admin so the editorial team doesn''t have to bounce to Facebook
  - Track per-post engagement (likes/comments/shares) as data we can join in advertiser reports

SURFACES:
  /admin/integrations/meta-suite — same connection panel as Facebook Marketing but extends scope checklist
  /admin/social — already exists in the admin; extends it with "Post now" + "Comments inbox"
  Advertiser report — add Page-engagement column showing organic reach beside paid

PRIORITY: MEDIUM because it strongly compounds value with the AI integration (caption assist) and Google Search Console (drive organic readers from social posts), but provides less standalone value than the Tier 1 trio (AI / GBP / GSC) above.

DEPENDS ON: AI integration shipped first so caption assist is available at launch.')

ON CONFLICT DO NOTHING;
