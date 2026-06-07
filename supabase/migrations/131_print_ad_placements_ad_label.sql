-- ── Print ad placements: ad_label ──────────────────────────────────────────
--
-- Editorial reality: one business often runs multiple distinct ads in
-- the same issue ('Macon East Academy' main brand ad PLUS 'Macon East
-- Academy Senior Ad' for a specific campaign). Both attach to the same
-- advertiser_account, but each placement needs to carry its own
-- display label so the editor can tell them apart on the layout sheet.
--
-- Historically rows were named after the ad in the editor's tracking
-- spreadsheet, which polluted advertiser_accounts with what should
-- have been ad-level variants. The CSV import + duplicates tool now
-- merge those back to one canonical advertiser; this column gives the
-- variant a proper home so renaming the advertiser doesn't lose the
-- ad's identity.
--
-- Nullable: a placement without an explicit label just falls back to
-- the business_name on display, which matches the common case of one
-- ad per business per issue.

ALTER TABLE print_ad_placements
  ADD COLUMN IF NOT EXISTS ad_label TEXT;
