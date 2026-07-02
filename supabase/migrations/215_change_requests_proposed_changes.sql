-- Migration 215: proposed_changes JSONB on change_requests
--
-- Drivers can now submit STRUCTURED edits (not just flag + note) via
-- the "Edit Stop or Report Issue" flow. Categories:
--   - Location closed       → no fields, just the flag + note
--   - Address change        → { address, city, zip }
--   - Change mag totals     → { quantities: {rrp: N, boom: N} }
--   - New contact           → { contact_name, contact_phone, contact_email }
--   - Other                 → freeform note
--
-- The proposed_changes JSONB carries whichever fields the driver
-- filled in. Admin review pre-fills its form with these values so
-- approve becomes a single tap; admin can still edit before saving.
--
-- Keeping the existing old_value / new_value columns for backwards
-- compat with rows created before this migration.

ALTER TABLE circulation_change_requests
  ADD COLUMN IF NOT EXISTS proposed_changes JSONB NULL;

COMMENT ON COLUMN circulation_change_requests.proposed_changes IS
  'Structured edits proposed by the driver. When present, the admin review pre-fills its form with these values. NULL for legacy rows that only have flag + note.';
