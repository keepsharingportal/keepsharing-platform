-- Migration 095: Full QR code system (replaces external QR Code Studio).
--
-- Extends short_links into a complete QR code management tool:
--   - Multiple content types (URL, vCard, phone, email, SMS, text, event)
--   - Optional advertiser link so scan data rolls into client reports
--   - Per-QR design options (logo, color) for branded codes
--   - All types route through /go/[shortcode] for universal scan tracking
--
-- Content types and what they do on scan:
--   url    → 302 redirect (existing behavior)
--   vcard  → serves a .vcf download (contact card)
--   phone  → redirects to tel: URI
--   email  → redirects to mailto: URI
--   sms    → redirects to sms: URI
--   text   → renders a branded text page
--   event  → serves a .ics calendar download

ALTER TABLE short_links
  ADD COLUMN IF NOT EXISTS content_type          TEXT NOT NULL DEFAULT 'url',
  ADD COLUMN IF NOT EXISTS content_data          JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS advertiser_account_id UUID REFERENCES advertiser_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qr_logo_url           TEXT,
  ADD COLUMN IF NOT EXISTS qr_primary_color      TEXT DEFAULT '#ef6442',
  ADD COLUMN IF NOT EXISTS qr_bg_color           TEXT DEFAULT '#ffffff';

CREATE INDEX IF NOT EXISTS idx_short_links_advertiser
  ON short_links (advertiser_account_id)
  WHERE advertiser_account_id IS NOT NULL;

ALTER TABLE short_links
  ADD CONSTRAINT short_links_content_type_chk
  CHECK (content_type IN ('url', 'vcard', 'phone', 'email', 'sms', 'text', 'event'));
