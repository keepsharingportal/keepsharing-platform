-- ─────────────────────────────────────────────────────────────────────────────
-- 063: increment_listing_click RPC fix
--
-- PRODUCTION INTEGRITY FIX.
-- The API route /api/listing-leads/route.ts has called this RPC on every
-- listing message submission since migration 016 added the click_count columns.
-- The function was never defined — every call has silently failed via .catch().
-- guide_listings.click_count_phone and click_count_website have been stuck at 0.
--
-- This migration closes that gap. No schema changes — columns already exist.
-- After this migration, click counts will accurately reflect message submissions.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_listing_click(p_slug TEXT, p_field TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_field = 'phone' THEN
    UPDATE guide_listings
      SET click_count_phone   = click_count_phone   + 1
      WHERE slug = p_slug;

  ELSIF p_field = 'website' THEN
    UPDATE guide_listings
      SET click_count_website = click_count_website + 1
      WHERE slug = p_slug;

  ELSIF p_field = 'message' THEN
    -- Message leads signal intent-to-contact; counted as phone engagement
    UPDATE guide_listings
      SET click_count_phone   = click_count_phone   + 1
      WHERE slug = p_slug;

  END IF;
  -- Unrecognized field values are silently ignored (no-op)
END;
$$;

COMMENT ON FUNCTION increment_listing_click(TEXT, TEXT) IS
  'Atomically increments click_count_phone or click_count_website on guide_listings. '
  'Called by /api/listing-leads when a visitor submits a message or clicks a contact link. '
  'p_field: ''phone'' | ''website'' | ''message'' (message counts as phone intent). '
  'Added in 063 — columns existed since 016, but the function was missing.';
