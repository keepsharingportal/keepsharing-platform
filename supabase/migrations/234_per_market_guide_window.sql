-- 234_per_market_guide_window.sql ────────────────────────────────────────────
--
-- A seasonal guide's live window has to be per market.
--
-- Migration 230 put live_from / live_until on guide_types, which is the
-- GLOBAL catalog of guide kinds. Fall Festivities is therefore 2026-10-01 to
-- 2026-11-08 for every brand at once. Greater Pensacola's fall season runs to
-- December 1, and there is no way to say that today without moving River
-- Region's window too — which would leave River Region advertising pumpkin
-- patches three weeks after Halloween.
--
-- guide_configs is already the per-brand table (migration 232), so the window
-- belongs beside is_active: both answer "is this guide open on this brand",
-- one by switch and one by date.
--
-- Resolution order in code (lib/guides/live.ts):
--   1. guide_configs.is_active = false  → closed, whatever the dates say
--   2. guide_configs.live_from/until    → this brand's window, when set
--   3. guide_types.live_from/until      → the catalog default
--   4. no window                        → evergreen
--
-- Leaving a brand's columns NULL keeps exactly today's behaviour, so River
-- Region is untouched by this migration.

BEGIN;

ALTER TABLE public.guide_configs
  ADD COLUMN IF NOT EXISTS live_from  DATE,
  ADD COLUMN IF NOT EXISTS live_until DATE;

COMMENT ON COLUMN public.guide_configs.live_from IS
  'Per-brand start of the seasonal window. Overrides guide_types.live_from. '
  'NULL means fall back to the catalog default.';

COMMENT ON COLUMN public.guide_configs.live_until IS
  'Per-brand end of the seasonal window. Overrides guide_types.live_until. '
  'NULL means fall back to the catalog default.';

-- Greater Pensacola's fall season runs later than River Region's.
-- is_active stays false: the window says WHEN it may be open, the switch
-- says whether the publisher has opened it.
UPDATE public.guide_configs
   SET live_from  = DATE '2026-10-01',
       live_until = DATE '2026-12-01'
 WHERE market = 'gpp'
   AND guide_type_slug = 'fall-festivities';

COMMIT;

-- ── Rollback ────────────────────────────────────────────────────────────────
-- BEGIN;
--   ALTER TABLE public.guide_configs
--     DROP COLUMN IF EXISTS live_from,
--     DROP COLUMN IF EXISTS live_until;
-- COMMIT;
