-- ── Advertiser contacts as a real table ────────────────────────────────────
--
-- Before this migration: each advertiser_accounts row stored ONE contact
-- inline (contact_name, contact_email, contact_phone). That's wrong for
-- real CRM use — most businesses have a sales rep, a billing contact, and
-- a listing owner all on the same account, plus the GHL workflows that
-- target each role differently.
--
-- After this migration: advertiser_contacts is the source of truth.
-- The inline columns on advertiser_accounts stay (no schema break for
-- existing code) but they now mirror whichever row on advertiser_contacts
-- has is_primary=true. A small trigger keeps them in sync so legacy
-- selects keep working while the new UI manages contacts properly.
--
-- Backfill: every advertiser_accounts row with any of the three inline
-- fields filled gets one advertiser_contacts row created (role='other',
-- is_primary=true). Untouched accounts get no contact row.

CREATE TABLE IF NOT EXISTS advertiser_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,

  name                  TEXT NOT NULL,
  email                 TEXT NULL,
  phone                 TEXT NULL,

  -- Role drives how the rest of the platform talks to this person:
  --   ad_rep         — the day-to-day sales contact for placements
  --   billing        — invoices, payment reminders
  --   listing_owner  — guide listing edits, photo uploads
  --   decision_maker — owner / GM / whoever approves spend
  --   other          — backfill default + uncategorized
  role TEXT NOT NULL DEFAULT 'other'
    CHECK (role IN ('ad_rep', 'billing', 'listing_owner', 'decision_maker', 'other')),

  -- Exactly one contact per advertiser should be is_primary=true at any
  -- time; the trigger below keeps the inline columns on advertiser_accounts
  -- mirroring whichever contact has the flag set. Enforced as a soft
  -- contract — the app picks the primary, the DB doesn't refuse a second
  -- one (which would be brittle during edits).
  is_primary            BOOLEAN NOT NULL DEFAULT FALSE,

  -- Free-text role context — 'Reception desk', 'After hours cell', etc.
  notes                 TEXT NULL,

  -- For future two-way GHL sync: each contact record can pair to one GHL
  -- contact. NULL until we run the sync. Distinct from
  -- advertiser_accounts.ghl_contact_id, which (historically) tracked the
  -- single inline contact.
  ghl_contact_id        TEXT NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertiser_contacts_account
  ON advertiser_contacts (advertiser_account_id);

-- Partial index — fast lookup of the primary contact for any account.
-- Used by the sync trigger + the profile page header.
CREATE INDEX IF NOT EXISTS idx_advertiser_contacts_primary
  ON advertiser_contacts (advertiser_account_id)
  WHERE is_primary = TRUE;

-- RLS — admin/service role get full access, no public access (these
-- are internal records, never client-facing).
ALTER TABLE advertiser_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advertiser_contacts_service ON advertiser_contacts;
CREATE POLICY advertiser_contacts_service
  ON advertiser_contacts FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS advertiser_contacts_admin ON advertiser_contacts;
CREATE POLICY advertiser_contacts_admin
  ON advertiser_contacts FOR ALL
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');


-- ── Backfill from inline contact fields ─────────────────────────────────────
-- Every existing account with any inline contact field set becomes one
-- advertiser_contacts row, marked is_primary=true so the trigger below
-- keeps the inline columns in sync. role='other' since we can't infer
-- which role the legacy single contact filled — the editor can recategorize
-- in the UI.
INSERT INTO advertiser_contacts (advertiser_account_id, name, email, phone, role, is_primary)
SELECT
  id,
  COALESCE(NULLIF(contact_name, ''), business_name)  AS name,
  NULLIF(contact_email, '')                          AS email,
  NULLIF(contact_phone, '')                          AS phone,
  'other'                                            AS role,
  TRUE                                               AS is_primary
FROM advertiser_accounts a
WHERE NOT EXISTS (
        SELECT 1 FROM advertiser_contacts c WHERE c.advertiser_account_id = a.id
      )
  AND (contact_name IS NOT NULL OR contact_email IS NOT NULL OR contact_phone IS NOT NULL);


-- ── Sync inline columns on advertiser_accounts from the primary contact ────
-- Old code paths still read contact_name / contact_email / contact_phone
-- off advertiser_accounts directly. Until those callsites move to
-- advertiser_contacts, keep the inline fields fresh whenever the primary
-- contact changes — a non-blocking convenience that prevents stale data
-- from leaking into reports.
CREATE OR REPLACE FUNCTION advertiser_contacts_sync_inline() RETURNS TRIGGER AS $$
BEGIN
  -- Only the primary contact matters for the mirror.
  IF (TG_OP = 'DELETE' AND OLD.is_primary) OR (TG_OP <> 'DELETE' AND NEW.is_primary) THEN
    -- Find the new primary for this account (may be NULL after a delete).
    UPDATE advertiser_accounts a
       SET contact_name  = c.name,
           contact_email = c.email,
           contact_phone = c.phone,
           updated_at    = NOW()
      FROM (
        SELECT name, email, phone
          FROM advertiser_contacts
         WHERE advertiser_account_id = COALESCE(NEW.advertiser_account_id, OLD.advertiser_account_id)
           AND is_primary
         ORDER BY updated_at DESC
         LIMIT 1
      ) c
     WHERE a.id = COALESCE(NEW.advertiser_account_id, OLD.advertiser_account_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS advertiser_contacts_sync_inline_trg ON advertiser_contacts;
CREATE TRIGGER advertiser_contacts_sync_inline_trg
AFTER INSERT OR UPDATE OR DELETE ON advertiser_contacts
FOR EACH ROW EXECUTE FUNCTION advertiser_contacts_sync_inline();


-- ── updated_at touch trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION advertiser_contacts_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS advertiser_contacts_touch_updated_at_trg ON advertiser_contacts;
CREATE TRIGGER advertiser_contacts_touch_updated_at_trg
BEFORE UPDATE ON advertiser_contacts
FOR EACH ROW EXECUTE FUNCTION advertiser_contacts_touch_updated_at();
