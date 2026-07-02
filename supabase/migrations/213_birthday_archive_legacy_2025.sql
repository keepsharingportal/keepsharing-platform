-- 213_birthday_archive_legacy_2025.sql
--
-- Migration 211 archived 2025 birthday listings using
-- `listing_year IS DISTINCT FROM 2026`, but the earlier season's rows
-- already carried listing_year=2026 from a prior editorial pass, so
-- the filter missed them. Result: 7 legacy rows still counted in the
-- portal hub cards on top of the 2026 CSV's 97 bucket-hits (Treats +4,
-- Party +3 in the wild).
--
-- Fix: archive anything that isn't part of the 2026 v2 CSV import.
-- Rows created by that import stamped source_csv_filename with the
-- CSV name, so the filter is unambiguous.
--
-- Safe to re-run: the WHERE clause already restricts to still-published
-- non-2026 rows, and the update no-ops on rows it's already flipped.

BEGIN;

UPDATE guide_listings
   SET is_published = false,
       updated_at   = NOW()
 WHERE guide_type_slug IN ('birthday-party', 'birthday-party-guide')
   AND is_published = true
   AND (source_csv_filename IS DISTINCT FROM 'RRP Birthday Guide 2026 v2.csv');

COMMIT;

-- Sanity check after apply:
-- SELECT COUNT(*) FROM guide_listings
--  WHERE guide_type_slug='birthday-party'
--    AND is_published=true;
-- Expected: 92 (matches migration 211's import).
