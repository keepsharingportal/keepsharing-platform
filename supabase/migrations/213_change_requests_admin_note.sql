-- Migration 213: change_requests.admin_note column
--
-- The admin API + UI (Change History tab) read and write admin_note
-- but the column was never added after migration 113. Add it
-- idempotently. This resolves the Load error red banner on
-- /admin/circulation/changes.

ALTER TABLE circulation_change_requests
  ADD COLUMN IF NOT EXISTS admin_note TEXT NULL;

COMMENT ON COLUMN circulation_change_requests.admin_note IS
  'Optional admin note attached when reviewing (approve/reject). Surfaced to the driver via the notification email and on the History tab.';
