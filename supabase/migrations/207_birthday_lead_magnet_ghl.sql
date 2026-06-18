-- 207_birthday_lead_magnet_ghl.sql
--
-- Extends birthday_lead_magnets so a new magnet can be added without a
-- code change AND so each magnet syncs to GHL with the right tags.
--
-- source           — the value /api/birthday/subscribe receives in the
--                    request body. When source matches an active magnet
--                    row, we send the email + sync to GHL using that
--                    row's settings.
-- ghl_tags         — tags pushed to the contact on GHL upsert. Drives
--                    list segmentation + workflow triggers in GHL.
-- ghl_workflow_id  — optional. After successful upsert, fires this GHL
--                    workflow against the new contact (drip, welcome
--                    series, etc.).

ALTER TABLE birthday_lead_magnets
  ADD COLUMN IF NOT EXISTS source           TEXT,
  ADD COLUMN IF NOT EXISTS ghl_tags         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ghl_workflow_id  TEXT;

-- Unique source per brand — we look up by (brand, source) at send time.
CREATE UNIQUE INDEX IF NOT EXISTS birthday_lead_magnets_brand_source_uq
  ON birthday_lead_magnets (brand_slug, source)
  WHERE source IS NOT NULL;

-- Wire the seeded planner row to its trigger source + sensible default
-- tag set. Editor can change either from the admin page.
UPDATE birthday_lead_magnets
SET    source   = 'timeline-checklist',
       ghl_tags = ARRAY['birthday-insider', 'planner-lead']
WHERE  slug = 'planner'
  AND  source IS NULL;
