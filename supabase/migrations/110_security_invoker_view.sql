-- Migration 110: switch advertiser_guide_appearances view to SECURITY INVOKER
--
-- Supabase Advisor flagged this view as a CRITICAL security issue: views
-- without an explicit SECURITY INVOKER clause run with the CREATOR's
-- permissions (effectively SECURITY DEFINER), which bypasses row-level
-- security policies. For a view that aggregates advertiser data across
-- guides, that's the wrong default — the view should respect the
-- querying user's permissions so RLS policies on advertiser_accounts
-- and guide_listings still apply.
--
-- The view's content is identical to what migration 028 created; only
-- the security model changes. CREATE OR REPLACE works in place — no
-- need to drop dependents.

CREATE OR REPLACE VIEW advertiser_guide_appearances
  WITH (security_invoker = true)
AS
SELECT
  a.id          AS advertiser_id,
  a.business_name,
  a.slug,
  COUNT(DISTINCT gl.guide_type_slug) AS guide_count,
  ARRAY_AGG(DISTINCT gl.guide_type_slug ORDER BY gl.guide_type_slug)
    FILTER (WHERE gl.id IS NOT NULL) AS guides_appearing_in,
  ARRAY_AGG(DISTINCT gl.listing_tier ORDER BY gl.listing_tier)
    FILTER (WHERE gl.id IS NOT NULL) AS tiers
FROM advertiser_accounts a
LEFT JOIN guide_listings gl
  ON gl.advertiser_account_id = a.id
  AND gl.is_published = true
GROUP BY a.id, a.business_name, a.slug;
