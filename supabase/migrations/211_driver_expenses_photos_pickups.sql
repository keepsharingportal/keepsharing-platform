-- Migration 211: driver expense fields + POD photos + pickup load counts
--
-- Adds columns for three features that were not in the v3 PHP portal:
--
--   1. Gas / expense submission per invoice
--      circulation_deliveries.gas_amount      NUMERIC — dollar amount
--      circulation_deliveries.gas_receipt_url TEXT    — Supabase Storage URL
--
--   2. Pickup load counts (bundles picked up at Publications Plus)
--      circulation_deliveries.pickup_load_json JSONB — { "rrp": 20, "boom": 12 }
--
--   3. Proof-of-delivery photos per stop
--      circulation_delivery_stops.photo_urls JSONB — array of Supabase Storage URLs
--
-- All additive, non-destructive, safe to re-run.

-- ── circulation_deliveries: gas + pickup load ────────────────────────
ALTER TABLE circulation_deliveries
  ADD COLUMN IF NOT EXISTS gas_amount       NUMERIC(10,2) NULL;

ALTER TABLE circulation_deliveries
  ADD COLUMN IF NOT EXISTS gas_receipt_url  TEXT NULL;

ALTER TABLE circulation_deliveries
  ADD COLUMN IF NOT EXISTS pickup_load_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN circulation_deliveries.gas_amount       IS 'Dollar amount of gas / fuel the driver spent on this run. Submitted with invoice, admin reimburses in addition to per-stop pay.';
COMMENT ON COLUMN circulation_deliveries.gas_receipt_url  IS 'Supabase Storage URL for the receipt photo (optional). Bucket: pod-photos, path: gas-receipts/<delivery_id>.jpg';
COMMENT ON COLUMN circulation_deliveries.pickup_load_json IS 'Per-publication bundle counts the driver picked up at Publications Plus. e.g. {"rrp": 20, "boom": 12}. Empty object when driver hasn''t logged it.';

-- ── circulation_delivery_stops: per-stop photo proof of delivery ─────
ALTER TABLE circulation_delivery_stops
  ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN circulation_delivery_stops.photo_urls IS 'Array of Supabase Storage URLs for proof-of-delivery photos the driver took at this stop. Bucket: pod-photos, path: stops/<delivery_stop_id>/<uuid>.jpg';

-- ── Storage bucket for POD photos + gas receipts ────────────────────
-- Public read (URLs are UUID-scoped so not guessable), admin-only writes
-- via the /api/circulation/driver/upload endpoint using service role.
-- If the bucket already exists this INSERT is a no-op.
INSERT INTO storage.buckets (id, name, public)
VALUES ('pod-photos', 'pod-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Anyone with the URL can READ (photos are keyed by uuid, not guessable);
-- WRITE is restricted to the service role only.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'pod-photos-public-read') THEN
    -- policy already exists
  ELSE
    EXECUTE $q$
      CREATE POLICY "pod-photos-public-read"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'pod-photos')
    $q$;
  END IF;
END $$;
