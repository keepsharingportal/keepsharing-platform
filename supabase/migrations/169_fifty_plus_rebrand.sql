-- ── Fifty-Plus rebrand: BOOM → River Region 50+ (rr50plus) ────────────────
--
-- The fifty-plus brand "BOOM" is being rebranded to "River Region 50+"
-- (wordmark: "RIVER REGION 50+" with tagline "LIVE WHERE LIFE MATTERS").
-- This migration:
--   1. Adds the article_hero_slots join table so each 50+ brand can pick
--      up to 3 articles to feature in its homepage hero carousel.
--   2. Adds font/template fields to brand_voice so the chrome resolver can
--      load brand-specific typography (Inter + Montserrat + Playfair for
--      50+ brands, vs Geist + Fraunces for parents brands).
--   3. Renames the 'boom' brand_slug to 'rr50plus' everywhere it appears
--      in user-data tables. The brand_voice row is moved (PK can't be
--      ALTERed), data preserved.
--   4. Seeds/updates the rr50plus brand_voice row with the new chrome:
--      navy primary, amber secondary, the 50+ audience summary, the
--      "LIVE WHERE LIFE MATTERS" tagline, and Inter/Montserrat/Playfair.
--
-- Idempotent: re-running is a no-op if rr50plus already exists with the
-- right chrome. Migration-tolerant: tables that don't exist yet (or that
-- never held boom rows) just no-op their UPDATE.

-- ── 1. article_hero_slots ──────────────────────────────────────────────────
-- One row per (brand, slot). brand_slug + slot_number is the PK so a brand
-- can have at most one article per slot, and an article can appear in
-- multiple brands' heroes (useful for syndicated columns like Local Tails
-- that run across all 50+ brands).
--
-- Slot 1 in the public render is the dynamic greeting card (auto, no DB).
-- Editorial-controlled slots are 2-4. We cap at slot_number ≤ 4 in the
-- CHECK so an over-eager admin script can't add slot 99.
CREATE TABLE IF NOT EXISTS article_hero_slots (
  brand_slug    TEXT     NOT NULL,
  slot_number   INTEGER  NOT NULL CHECK (slot_number BETWEEN 2 AND 4),
  article_id    UUID     NOT NULL REFERENCES guide_articles(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by      UUID     NULL,           -- admin_users.id
  PRIMARY KEY (brand_slug, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_article_hero_slots_brand
  ON article_hero_slots (brand_slug, slot_number);
CREATE INDEX IF NOT EXISTS idx_article_hero_slots_article
  ON article_hero_slots (article_id);

ALTER TABLE article_hero_slots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE article_hero_slots IS
  '50+ brand homepage hero carousel — editor-picked articles for slots 2-4 (slot 1 is the dynamic greeting card, no DB row).';

-- ── 2. brand_voice chrome extensions for typography + template family ────
ALTER TABLE brand_voice
  -- The template family this brand renders. 'parents' uses the legacy
  -- RRP-style chrome (coral primary, Geist font, etc.). 'fifty-plus' uses
  -- the new RR50+ chrome (navy primary, amber secondary, Montserrat+Inter
  -- +Playfair). The frontend reads market.family from src/lib/markets.ts
  -- so this column is mostly a sanity check / future-proofing — leaving
  -- it NULL means "infer from MARKETS.family".
  ADD COLUMN IF NOT EXISTS template_family    TEXT NULL,
  -- The tertiary / highlight color (used for "Escape & Explore" badges,
  -- Local Tails accent, Neighbor of the Week badge on the 50+ template).
  -- Parents brands ignore this — coral + navy is enough for them.
  ADD COLUMN IF NOT EXISTS tertiary_color_hex TEXT NULL,
  -- Background color override (the 50+ template wants warm cream; parents
  -- brands keep their own background token from globals.css).
  ADD COLUMN IF NOT EXISTS background_color_hex TEXT NULL,
  -- Foreground (body text) color override.
  ADD COLUMN IF NOT EXISTS foreground_color_hex TEXT NULL,
  -- Wordmark display fields — for brands whose name renders as text
  -- (no logo upload), these split the brand into a small eyebrow + a
  -- big primary line + a small tagline below.
  -- Eyebrow ("RIVER REGION" in the RR50+ wordmark).
  ADD COLUMN IF NOT EXISTS wordmark_eyebrow   TEXT NULL,
  -- Big primary line ("50+" in the RR50+ wordmark, rendered in the
  -- secondary / amber color).
  ADD COLUMN IF NOT EXISTS wordmark_accent    TEXT NULL,
  -- Big primary line first part ("LOCAL" in some 50+ variants,
  -- rendered in primary navy). Optional — when null, just the
  -- wordmark_eyebrow + wordmark_accent render.
  ADD COLUMN IF NOT EXISTS wordmark_primary   TEXT NULL;

COMMENT ON COLUMN brand_voice.template_family IS
  'Override for MARKETS.family. Usually NULL — left to MARKETS as source of truth.';
COMMENT ON COLUMN brand_voice.tertiary_color_hex IS
  'Highlight color for 50+ template chips (Escape & Explore, Local Tails). NULL for parents brands.';

-- ── 3. Rename boom → rr50plus across user data ───────────────────────────
DO $$
DECLARE
  boom_voice brand_voice%ROWTYPE;
  has_rr50plus BOOLEAN;
BEGIN
  -- Move the brand_voice row (PK rename via copy + delete).
  SELECT EXISTS(SELECT 1 FROM brand_voice WHERE brand_slug = 'rr50plus') INTO has_rr50plus;
  SELECT * INTO boom_voice FROM brand_voice WHERE brand_slug = 'boom';

  IF FOUND AND NOT has_rr50plus THEN
    INSERT INTO brand_voice (
      brand_slug, audience_summary, voice_rules, avoid_list, format_default,
      site_url, ghl_tag, updated_at, updated_by,
      tagline, logo_url, primary_color_hex, accent_color_hex,
      contact_email, social_facebook, social_instagram, homepage_rotation_columns,
      ghl_newsletter_list_id, ghl_subscriber_tag, ghl_welcome_workflow_id
    ) VALUES (
      'rr50plus', boom_voice.audience_summary, boom_voice.voice_rules,
      boom_voice.avoid_list, boom_voice.format_default,
      boom_voice.site_url, boom_voice.ghl_tag, NOW(), boom_voice.updated_by,
      boom_voice.tagline, boom_voice.logo_url,
      boom_voice.primary_color_hex, boom_voice.accent_color_hex,
      boom_voice.contact_email, boom_voice.social_facebook, boom_voice.social_instagram,
      boom_voice.homepage_rotation_columns,
      boom_voice.ghl_newsletter_list_id, boom_voice.ghl_subscriber_tag,
      boom_voice.ghl_welcome_workflow_id
    );
    DELETE FROM brand_voice WHERE brand_slug = 'boom';
  END IF;
END $$;

-- Update brand_slug references everywhere they appear in user data.
-- Each statement is wrapped to no-op cleanly if the table doesn't exist
-- yet (older environments mid-migration).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'guide_articles', 'directory_listings', 'directory_categories',
    'reader_favorites', 'reader_engagement', 'newsletter_subscribers',
    'magazine_issues', 'ad_placements', 'advertiser_accounts',
    'calendar_events', 'admin_audit_log', 'ai_usage_log',
    'editorial_calendar_suggestions', 'editorial_calendar_runs',
    'google_business_integrations', 'gsc_sites', 'gsc_pages_daily',
    'fb_pages', 'fb_posts', 'meta_pages', 'meta_posts',
    'stripe_subscriptions', 'stripe_charges', 'stripe_sessions',
    'contributors', 'contributor_invites', 'contributor_responses',
    'article_distribution_log'
  ]) LOOP
    BEGIN
      -- Try common brand-column names; each EXECUTE skips silently if
      -- the table or column doesn't exist (caught in the inner block).
      BEGIN
        EXECUTE format('UPDATE %I SET brand_slug = ''rr50plus'' WHERE brand_slug = ''boom''', t);
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
      END;
      BEGIN
        EXECUTE format('UPDATE %I SET market = ''rr50plus'' WHERE market = ''boom''', t);
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
      END;
      BEGIN
        EXECUTE format('UPDATE %I SET publication_slug = ''rr50plus'' WHERE publication_slug = ''boom''', t);
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
      END;
    END;
  END LOOP;
END $$;

-- syndicated_to_brands is a TEXT[] — swap any 'boom' element to 'rr50plus'.
UPDATE guide_articles
   SET syndicated_to_brands = array_replace(syndicated_to_brands, 'boom', 'rr50plus')
 WHERE 'boom' = ANY(syndicated_to_brands);

-- Publication table from migration 024 (legacy)
DO $$ BEGIN
  UPDATE publications SET slug = 'rr50plus', name = 'River Region 50+'
   WHERE slug = 'boom';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Circulation phase C short_name table (migration 116, legacy).
DO $$ BEGIN
  UPDATE publication_brands SET short_name = 'rr50plus', display_name = 'River Region 50+'
   WHERE short_name = 'boom';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Loosen the brand_slug CHECK constraint added in migration 161 so it
-- accepts rr50plus alongside the original six. Drop + re-add with the
-- updated allow-list.
ALTER TABLE guide_articles DROP CONSTRAINT IF EXISTS guide_articles_brand_slug_check;
ALTER TABLE guide_articles
  ADD CONSTRAINT guide_articles_brand_slug_check
  CHECK (brand_slug IN ('rrp', 'rr50plus', 'aop', 'mbp', 'esp', 'gpp', 'boom'));
  -- 'boom' kept in the allow-list for one migration cycle to ease rollback;
  -- can be dropped in 175+ once all environments have migrated.

-- ── 4. Seed / update the rr50plus chrome ──────────────────────────────────
-- Upsert the chrome fields. The audience + voice copy is preserved from
-- the boom row above (or seeded fresh if there was no boom row).
INSERT INTO brand_voice (
  brand_slug, audience_summary, voice_rules, avoid_list, format_default
) VALUES (
  'rr50plus',
  'Adults 50 through 75+ in the River Region (Montgomery, Prattville, Wetumpka, Pike Road). The full age range matters — content must respect both active early-retirees AND older readers, including those on fixed incomes or with slower lifestyles. They are sophisticated and want to feel seen, not condescended to. They drive local-business loyalty and are a meaningful audience for advertisers.',
  'Knowing, observational, occasionally wry. The voice of someone who has lived enough to recognize the pattern. Specifics matter — the cost of prom, the Sunday-before-the-grandkids-visit calm, the strangeness of in-laws becoming closer than expected. Lifestyle range from active travel to quiet local pleasures.',
  'Patronizing tone. Anything that treats 50+ as a problem to be managed. Tech references that assume technical literacy. Empty-nester pity. "Active senior" cliches. Income assumptions either direction. Selling-something-to-old-people energy.',
  '700-1000 words. Lead with the texture of the moment, not the demographic. End with the small truth, not the moral.'
)
ON CONFLICT (brand_slug) DO UPDATE SET
  audience_summary = COALESCE(NULLIF(brand_voice.audience_summary, ''), EXCLUDED.audience_summary);

UPDATE brand_voice SET
  tagline              = COALESCE(NULLIF(tagline, ''), 'Live Where Life Matters'),
  primary_color_hex    = COALESCE(NULLIF(primary_color_hex, ''), '#0B1F37'),  -- navy
  accent_color_hex     = COALESCE(NULLIF(accent_color_hex, ''), '#D08826'),   -- amber (secondary)
  tertiary_color_hex   = COALESCE(NULLIF(tertiary_color_hex, ''), '#FAB320'), -- bright gold
  background_color_hex = COALESCE(NULLIF(background_color_hex, ''), '#FAF7F1'),
  foreground_color_hex = COALESCE(NULLIF(foreground_color_hex, ''), '#0B1F37'),
  wordmark_eyebrow     = COALESCE(NULLIF(wordmark_eyebrow, ''), 'RIVER REGION'),
  wordmark_accent      = COALESCE(NULLIF(wordmark_accent, ''), '50+'),
  template_family      = 'fifty-plus',
  homepage_rotation_columns = COALESCE(homepage_rotation_columns,
    ARRAY['escape-and-explore', 'wellness', 'local-tails', 'neighbor-of-the-week']),
  updated_at           = NOW()
WHERE brand_slug = 'rr50plus';
