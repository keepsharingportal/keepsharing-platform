-- ── advertiser_accounts.kind — corrective reclassification ─────────────────
--
-- Migration 133's initial backfill included loyalty_tier IS NOT NULL in
-- the 'this is a real advertiser' criteria. In environments where the
-- guide-listings importer defaulted every imported row to
-- loyalty_tier='bronze' (or some other non-null value), this meant
-- EVERY directory entry got promoted to kind='advertiser' — exactly the
-- pollution we were trying to undo. The editor reports seeing 628
-- 'advertisers' and 0 'directory only' after applying 133, with the
-- same BRONZE badge on every row.
--
-- This migration RESETS kind based on REAL customer activity signals
-- only. loyalty_tier and lifecycle_stage are dropped from the
-- criteria — they're too easy to set by accident.
--
-- New criteria for kind='advertiser' (any one):
--   - has at least one ad_placements row
--   - has at least one print_ad_placements row
--   - has at least one proposals row (FK; pre-132 falls back to name
--     match)
--   - package_tier IS NOT NULL  (only set when an editor explicitly
--     picks a tier, never auto-defaulted)
--   - contract_start_date IS NOT NULL OR contract_end_date IS NOT NULL
--
-- Anything else → kind='directory_only'. The editor can manually
-- promote any false-positives by setting kind='advertiser' on the
-- specific row (or just running a placement-creating action like
-- adding a print ad).

-- Step 1: assume directory_only.
UPDATE advertiser_accounts
   SET kind = 'directory_only'
 WHERE kind = 'advertiser'                                       -- skip rows
                                                                  -- editors
                                                                  -- already
                                                                  -- demoted
   AND TRUE;                                                      -- noop; reads
                                                                  -- naturally

-- Step 2: promote based on REAL activity. Each clause is a separate
-- UPDATE so the WHERE conditions stay readable and migration-tolerant.

-- 2a: any digital ad placement
UPDATE advertiser_accounts a
   SET kind = 'advertiser'
 WHERE a.kind = 'directory_only'
   AND EXISTS (SELECT 1 FROM ad_placements ap WHERE ap.advertiser_account_id = a.id);

-- 2b: any print ad placement (migration 129; skip if table absent)
DO $$
BEGIN
  IF to_regclass('public.print_ad_placements') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE advertiser_accounts a
         SET kind = 'advertiser'
       WHERE a.kind = 'directory_only'
         AND EXISTS (SELECT 1 FROM print_ad_placements pp WHERE pp.advertiser_account_id = a.id)
    $sql$;
  END IF;
END $$;

-- 2c: any proposal — prefer FK (migration 132), fall back to name match
DO $$
BEGIN
  IF to_regclass('public.proposals') IS NOT NULL THEN
    BEGIN
      EXECUTE $sql$
        UPDATE advertiser_accounts a
           SET kind = 'advertiser'
         WHERE a.kind = 'directory_only'
           AND EXISTS (SELECT 1 FROM proposals pr WHERE pr.advertiser_account_id = a.id)
      $sql$;
    EXCEPTION WHEN undefined_column THEN
      EXECUTE $sql$
        UPDATE advertiser_accounts a
           SET kind = 'advertiser'
         WHERE a.kind = 'directory_only'
           AND EXISTS (
             SELECT 1 FROM proposals pr
             WHERE lower(pr.business_name) = lower(a.business_name)
           )
      $sql$;
    END;
  END IF;
END $$;

-- 2d: explicit package tier or contract dates (real customer signals)
UPDATE advertiser_accounts a
   SET kind = 'advertiser'
 WHERE a.kind = 'directory_only'
   AND (
        a.package_tier         IS NOT NULL
     OR a.contract_start_date  IS NOT NULL
     OR a.contract_end_date    IS NOT NULL
   );

-- NOTE: loyalty_tier and lifecycle_stage are INTENTIONALLY EXCLUDED.
-- Lifecycle_stage often gets default-set to 'active' on import; loyalty_tier
-- gets a default 'bronze' from at least one historic import path. Treating
-- those as real-customer signals is what produced the original false
-- positives that caused 100% of rows to land as 'advertiser'.
