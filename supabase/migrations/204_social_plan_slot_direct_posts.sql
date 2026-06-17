-- 204_social_plan_slot_direct_posts.sql
--
-- Lets non-strategist posts live alongside the weekly plan grid:
--   - Article auto-post-on-publish (no weekly plan, just push)
--   - Urgent inserts (already used plan_id but kept the row tethered)
--   - Future: ad-hoc "post this thing now" from anywhere in admin
--
-- Two changes:
--   1. plan_id becomes nullable. Direct posts have no parent plan.
--   2. urgency CHECK gains 'direct' for the new auto-post flow.
--
-- Calendar view at /admin/social/calendar reads from this table directly
-- so editors see every scheduled GHL post in one place — strategist
-- plans + article auto-posts + urgent inserts — without having to
-- open GHL.

ALTER TABLE social_plan_slot
  ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE social_plan_slot
  DROP CONSTRAINT IF EXISTS social_plan_slot_urgency_check;

ALTER TABLE social_plan_slot
  ADD CONSTRAINT social_plan_slot_urgency_check
  CHECK (urgency IN ('normal','urgent','direct'));

COMMENT ON COLUMN social_plan_slot.plan_id IS
  'Nullable. Set for slots that belong to a weekly strategist plan; NULL for direct auto-posts (article auto-post-on-publish, ad-hoc pushes).';
COMMENT ON COLUMN social_plan_slot.urgency IS
  'normal = strategist plan slot. urgent = editor inserted mid-week. direct = ad-hoc auto-post outside any plan (article-on-publish, Birthday Buzz spot, etc).';
