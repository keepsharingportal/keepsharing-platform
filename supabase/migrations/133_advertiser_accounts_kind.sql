-- ── advertiser_accounts.kind — separate real advertisers from directory-only listings ──
--
-- The original schema treated every business in the system as an
-- advertiser_account, including the hundreds of guide listings the
-- editor imported via CSV. That worked when the system was small,
-- but it polluted the CRM 'Businesses' view with directory entries
-- that have no real customer relationship — making the dedup tool
-- noisy and the day-to-day list unusable.
--
-- New model:
--   kind = 'advertiser'      → real customer (has placements, proposals,
--                              contract dates, package tier, OR was
--                              created manually via /admin/advertisers/new
--                              or the print-CSV importer)
--   kind = 'directory_only' → listed in one or more guides but never
--                              transacted as a paying customer
--
-- DEFAULT is 'directory_only': any new row that doesn't explicitly
-- set kind (e.g. guide imports) lands as directory-only. Manual
-- creates + paid-customer import paths set kind='advertiser'
-- explicitly. The Businesses page filters to kind='advertiser' by
-- default; toggle chips reveal directory entries on demand.
--
-- Backfill rules ('advertiser' iff ANY of):
--   - has ad_placements
--   - has print_ad_placements
--   - has proposals (FK or business_name fallback)
--   - has any package_tier / loyalty_tier / contract_*_date set
-- Everything else stays 'directory_only'.

ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'directory_only'
    CHECK (kind IN ('advertiser', 'directory_only'));

-- Backfill 1: rows with paid-customer signals on advertiser_accounts itself.
UPDATE advertiser_accounts a
   SET kind = 'advertiser'
 WHERE a.kind = 'directory_only'
   AND (
        a.package_tier         IS NOT NULL
     OR a.loyalty_tier         IS NOT NULL
     OR a.contract_start_date  IS NOT NULL
     OR a.contract_end_date    IS NOT NULL
   );

-- Backfill 2: any digital placement (always present from migration 002+).
UPDATE advertiser_accounts a
   SET kind = 'advertiser'
 WHERE a.kind = 'directory_only'
   AND EXISTS (SELECT 1 FROM ad_placements ap WHERE ap.advertiser_account_id = a.id);

-- Backfill 3: any print placement (migration 129; skip if table absent).
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

-- Backfill 4: any proposal — prefer the FK column (migration 132) when
-- available; fall back to case-insensitive business_name match.
DO $$
BEGIN
  IF to_regclass('public.proposals') IS NOT NULL THEN
    -- Try the FK path first.
    BEGIN
      EXECUTE $sql$
        UPDATE advertiser_accounts a
           SET kind = 'advertiser'
         WHERE a.kind = 'directory_only'
           AND EXISTS (SELECT 1 FROM proposals pr WHERE pr.advertiser_account_id = a.id)
      $sql$;
    EXCEPTION WHEN undefined_column THEN
      -- Migration 132 not applied — fall back to text match. Best
      -- effort; the editor can promote remaining rows manually.
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

CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_kind ON advertiser_accounts(kind);
