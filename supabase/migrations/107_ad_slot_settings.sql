-- Migration 107: ad_slot_settings — site-wide on/off toggle per ad slot
--
-- Editors need a way to turn off an entire ad slot (e.g. "Homepage —
-- Sidebar Ad", or "Article — Inline" for a specific column) without
-- having to delete or expire all the active bookings. With this table,
-- the Slot Map can flip a single switch and the public site stops
-- rendering that slot — the page layout collapses around it the same
-- way it does when no booking exists.
--
-- Granularity: a row identifies one slot by (placement_type, context_slug).
-- A NULL context_slug means "site-wide for that placement_type" — turning
-- it off disables the slot everywhere. A specific context_slug scopes the
-- disable to one page (e.g. disable "section_sponsor" only on
-- "school-zone").
--
-- The actual on/off check happens in src/lib/get-active-ads.ts: any slot
-- with disabled=true short-circuits to an empty result, regardless of
-- whether ad_placements has active bookings.

CREATE TABLE IF NOT EXISTS ad_slot_settings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_type TEXT        NOT NULL,
  -- NULL = applies to all contexts of this placement_type (site-wide).
  context_slug   TEXT        NULL,
  disabled       BOOLEAN     NOT NULL DEFAULT TRUE,
  disabled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_by    UUID        NULL,
  -- Optional reason ("advertiser canceled, hide until refilled").
  note           TEXT        NULL
);

-- One row per (placement_type, context_slug) pair. Two partial unique
-- indexes because Postgres treats NULL != NULL in a normal unique
-- index — without the NULL-specific index, you could have multiple
-- rows for the same placement_type with context_slug=NULL.
CREATE UNIQUE INDEX IF NOT EXISTS ad_slot_settings_pt_ctx_uniq
  ON ad_slot_settings (placement_type, context_slug)
  WHERE context_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ad_slot_settings_pt_null_uniq
  ON ad_slot_settings (placement_type)
  WHERE context_slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_ad_slot_settings_disabled
  ON ad_slot_settings (placement_type)
  WHERE disabled = TRUE;
