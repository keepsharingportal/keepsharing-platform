-- Migration 143: Intentionally empty.
--
-- The original plan for this slot was to add advertiser_id to whichever
-- inquiries table needed it so the advertiser report could attribute
-- form-fill leads. On investigation, listing_messages.advertiser_account_id
-- already exists (from migration 121's listing_messages schema), so the
-- form-fill → advertiser join was solved at the source and no new column
-- was needed.
--
-- Keeping the file so the migration history stays continuous (no gap at
-- 143). The advertiser report's listing-message rollup is implemented in
-- src/lib/advertiser-report/data.ts via supabase.from('listing_messages')
-- .eq('advertiser_account_id', advertiserId).

SELECT 1;
