-- 219_drop_column_sponsorships.sql
--
-- Revert 218. That migration created a `column_sponsorships` table for
-- Education Matters annual sponsors — but the codebase already had a
-- canonical section-sponsor model in ad_placements (placement_type =
-- 'section_sponsor', context_slug = <column>), unified by migration 122.
--
-- Migration 218 duplicated an existing system. Education Matters now
-- uses the same ad_placements pipeline as every other column's section
-- sponsor. This migration cleans up the orphan table + its trigger
-- and function.
--
-- The btree_gist extension installed by 218 stays — it's a harmless
-- shared extension that other schema features may adopt.
--
-- Safe to run whether 218 was applied or not (all IF EXISTS guards).

DROP TRIGGER IF EXISTS column_sponsorships_touch ON column_sponsorships;
DROP FUNCTION IF EXISTS touch_column_sponsorships_updated_at();
DROP TABLE IF EXISTS column_sponsorships;
