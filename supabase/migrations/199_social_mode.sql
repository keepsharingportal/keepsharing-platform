-- 199_social_mode.sql
--
-- Adds an explicit "which field is the source of truth?" pin on every
-- article so the Social Sharing panel + dispatcher know what to honor:
--
--   'hook'         : social_hook is the source of truth. social_fb_caption
--                    and social_ig_caption MUST be NULL. Dispatcher always
--                    AI-generates per platform using the hook as the lead.
--   'per-platform' : social_fb_caption and social_ig_caption are the source
--                    of truth and post verbatim. social_hook MUST be NULL.
--
-- This kills the duplication we had before (editor saw the hook AND a FB
-- caption that started with the same sentence) by forcing one or the other,
-- never both. The auto-seeder + auto-generate-on-publish both default to
-- 'hook' mode so we never write three redundant fields again.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS social_mode TEXT NOT NULL DEFAULT 'hook'
    CHECK (social_mode IN ('hook', 'per-platform'));

COMMENT ON COLUMN guide_articles.social_mode IS
  'Which social field is the source of truth: ''hook'' (one-line hook + AI rewrites per platform) or ''per-platform'' (FB + IG captions verbatim). UI hides the other set; dispatcher honors this pin.';

-- Backfill rows where the editor already populated FB/IG overrides. Those
-- editors meant the per-platform text to be authoritative, so we flip them
-- to per-platform mode and clear the now-redundant hook on those rows.
UPDATE guide_articles
SET social_mode = 'per-platform',
    social_hook = NULL
WHERE (social_fb_caption IS NOT NULL OR social_ig_caption IS NOT NULL)
  AND social_mode = 'hook';

-- Rows where the bulk seeder filled all three fields (Sprint 8) — clear
-- the redundant FB/IG overrides and pin them to hook mode. Identified by
-- the seeder's stamp being set AND overrides being populated. After this
-- runs, dispatch will AI-regenerate FB/IG from the hook each time, which
-- is what we wanted Sprint 9 to enforce.
UPDATE guide_articles
SET social_mode = 'hook',
    social_fb_caption = NULL,
    social_ig_caption = NULL
WHERE social_ai_seeded_at IS NOT NULL
  AND social_hook IS NOT NULL
  AND (social_fb_caption IS NOT NULL OR social_ig_caption IS NOT NULL);
